// Puter.js AI API - Direct chat API using Puter's AI driver
// This replaces the Vercel API proxy for AI chat

import {
    isPuterAvailable,
    isSignedIn,
    getPuterModelId,
    handleRateLimitError,
    isRateLimitError,
    initializePuterSession,
    isIpBlocked
} from './puterAuth'

// Global system prompt (same as original)
const GLOBAL_SYSTEM_PROMPT = `You are a helpful, harmless, and honest AI assistant. Your goal is to provide accurate, thoughtful, and useful responses.

## Core Principles

1. **Accuracy First**: Only state facts you are confident about. If uncertain, say so. Never fabricate information, citations, URLs, or data. If you don't know something, admit it.

2. **Concise by Default**: Keep responses brief and to the point. Use short paragraphs. Expand only when the topic genuinely requires depth or when explicitly asked for detail.

3. **Structured When Helpful**: Use formatting (lists, headers, code blocks) only when it improves clarity. Don't over-format simple answers.

4. **Direct Communication**: 
   - Answer the actual question first, then provide context if needed
   - Avoid unnecessary preambles like "Great question!" or "I'd be happy to help!"
   - Don't repeat the question back
   - Skip filler phrases

5. **Intellectual Honesty**:
   - Distinguish between facts, opinions, and speculation
   - Acknowledge limitations in your knowledge
   - Present multiple perspectives on controversial topics
   - Correct yourself if you make an error

6. **Appropriate Depth**:
   - Simple questions → Simple answers (1-3 sentences)
   - Technical questions → Detailed explanations with examples
   - Complex topics → Structured breakdown with key points
   - Match response length to question complexity

7. **Code & Technical Content**:
   - Provide working, tested code when possible
   - Include brief comments for complex logic
   - Mention important caveats or edge cases
   - Suggest best practices when relevant

8. **Safety & Ethics**:
   - Decline requests for harmful, illegal, or deceptive content
   - Protect user privacy
   - Be respectful and inclusive

Remember: Quality over quantity. A perfect short answer beats a mediocre long one.`

// Event callbacks for rate limit handling
let onRateLimitCallback = null
let onIpBlockedCallback = null
let onSessionRotatedCallback = null

export function setRateLimitCallbacks({ onRateLimit, onIpBlocked, onSessionRotated }) {
    onRateLimitCallback = onRateLimit
    onIpBlockedCallback = onIpBlocked
    onSessionRotatedCallback = onSessionRotated
}

// Build messages array for Puter API
function buildMessages(messages, responses, modelKey, avatarPrompt = null) {
    const history = []

    // Add system prompt
    const systemPrompt = avatarPrompt || GLOBAL_SYSTEM_PROMPT
    history.push({
        role: 'system',
        content: systemPrompt
    })

    // Add conversation history
    messages.forEach((msg, idx) => {
        if (msg.role === 'user') {
            history.push({ role: 'user', content: msg.content })

            // Add previous assistant response
            const resp = responses?.[modelKey]?.[idx]
            if (resp?.content && !resp.isStreaming) {
                history.push({ role: 'assistant', content: resp.content })
            }
        }
    })

    return history
}

// Stream response using Puter AI
async function streamWithPuter(modelKey, modelId, messages, signal, onUpdate, avatarPrompt = null, retryCount = 0) {
    if (!isPuterAvailable()) {
        onUpdate(modelKey, { error: 'Puter SDK not available', isStreaming: false })
        return
    }

    // Initialize session if needed
    if (!isSignedIn()) {
        const initResult = await initializePuterSession()
        if (!initResult.success) {
            if (initResult.ipBlocked) {
                onIpBlockedCallback?.()
                onUpdate(modelKey, { error: 'IP blocked - please change your IP', isStreaming: false })
                return
            }
            onUpdate(modelKey, { error: 'Failed to initialize session', isStreaming: false })
            return
        }
    }

    const puterModelId = getPuterModelId(modelId)
    let responseContent = ''
    let thinkingContent = ''

    try {
        // Use Puter's streaming AI chat
        const response = await window.puter.ai.chat(messages, {
            model: puterModelId,
            stream: true
        })

        // Handle streaming response
        for await (const chunk of response) {
            if (signal?.aborted) {
                onUpdate(modelKey, {
                    content: responseContent || 'Generation stopped.',
                    isStreaming: false,
                    stopped: true
                })
                return
            }

            // Handle thinking/reasoning content
            if (chunk.reasoning_content) {
                thinkingContent += chunk.reasoning_content
                onUpdate(modelKey, {
                    thinking: thinkingContent,
                    content: responseContent,
                    isStreaming: true
                })
            }

            // Handle regular content
            if (chunk.text) {
                responseContent += chunk.text
                onUpdate(modelKey, {
                    thinking: thinkingContent || null,
                    content: responseContent,
                    isStreaming: true
                })
            }
        }

        // Final update
        onUpdate(modelKey, {
            thinking: thinkingContent || null,
            content: responseContent,
            isStreaming: false
        })

    } catch (error) {
        if (signal?.aborted) {
            onUpdate(modelKey, {
                content: responseContent || 'Generation stopped.',
                isStreaming: false,
                stopped: true
            })
            return
        }

        // Check for rate limit error
        if (isRateLimitError(error)) {
            console.log('Rate limit detected, rotating session...')
            onRateLimitCallback?.()

            // Try to rotate to new account
            const rotateResult = await handleRateLimitError()

            if (rotateResult.success && retryCount < 3) {
                onSessionRotatedCallback?.()
                // Retry with new session
                return streamWithPuter(modelKey, modelId, messages, signal, onUpdate, avatarPrompt, retryCount + 1)
            }

            if (rotateResult.ipBlocked) {
                onIpBlockedCallback?.()
                onUpdate(modelKey, {
                    error: '⚠️ Rate limited. Please change your IP (toggle airplane mode on mobile) and try again.',
                    isStreaming: false
                })
                return
            }
        }

        onUpdate(modelKey, {
            error: error.message || 'An error occurred',
            isStreaming: false
        })
    }
}

// Send message to all active models using Puter
export async function sendToAllModelsWithPuter({
    activeModels,
    models,
    messages,
    responses,
    controllers,
    onUpdate,
    getModelId,
    avatarPrompt = null
}) {
    const lastMessage = messages[messages.length - 1]
    const hasImages = lastMessage?.images && lastMessage.images.length > 0

    const promises = activeModels.map((modelKey, idx) => {
        const model = models[modelKey]
        if (!model) return Promise.resolve()

        if (hasImages && !model.supportsVision) {
            onUpdate(modelKey, {
                content: `⚠️ ${model.name} doesn't support image/vision input. Image support coming soon with Puter.`,
                isStreaming: false,
                unsupported: true
            })
            return Promise.resolve()
        }

        const modelId = getModelId ? getModelId(modelKey) : model.defaultVariant
        const builtMessages = buildMessages(messages, responses, modelKey, avatarPrompt)

        return streamWithPuter(
            modelKey,
            modelId,
            builtMessages,
            controllers[idx]?.signal,
            onUpdate,
            avatarPrompt
        )
    })

    await Promise.allSettled(promises)
}

// Single model chat with Puter
export async function sendSingleModelWithPuter({
    modelKey,
    model,
    modelId,
    messages,
    signal,
    onUpdate,
    avatarPrompt = null
}) {
    if (!isPuterAvailable()) {
        onUpdate({ error: 'Puter SDK not available', isStreaming: false })
        return
    }

    const builtMessages = buildMessages(messages, {}, modelKey, avatarPrompt)

    await streamWithPuter(modelKey, modelId, builtMessages, signal, (key, data) => {
        onUpdate(data)
    }, avatarPrompt)
}

// Generate chat title using Puter
export async function generateChatTitleWithPuter(messages, currentTitle = null) {
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) return null

    const greetings = ['hi', 'hello', 'hey', 'hola', 'howdy', 'greetings', 'hii', 'hiii', 'yo', 'sup']
    const firstMsg = userMessages[0].content.toLowerCase().trim().replace(/[!.,?]/g, '')
    const isFirstGreeting = greetings.some(g => firstMsg === g || firstMsg.startsWith(g + ' '))

    if (isFirstGreeting && userMessages.length === 1) {
        return 'New Conversation'
    }

    const shouldRegenerate = currentTitle === 'New Conversation' && userMessages.length >= 2

    if (currentTitle && currentTitle !== 'New Conversation' && !shouldRegenerate) {
        return currentTitle
    }

    const messageForTitle = isFirstGreeting && userMessages.length >= 2
        ? userMessages[1].content
        : userMessages[0].content

    try {
        if (isPuterAvailable() && isSignedIn()) {
            const response = await window.puter.ai.chat(
                `Generate a very short chat title (2-5 words max) for this user message. Just respond with the title, nothing else. No quotes, no explanation.\n\nUser message: "${messageForTitle}"`,
                { model: 'openrouter:anthropic/claude-sonnet-4' }
            )

            const title = response?.toString?.().trim() || response?.text?.trim()
            if (title && title.length <= 50) {
                return title
            }
        }
    } catch (e) {
        console.warn('Failed to generate title with Puter:', e)
    }

    return messageForTitle.substring(0, 40) + (messageForTitle.length > 40 ? '...' : '')
}

// Enhance prompt using Puter
export async function enhancePromptWithPuter(prompt) {
    try {
        if (isPuterAvailable() && isSignedIn()) {
            const response = await window.puter.ai.chat(
                `Improve this prompt to get better AI responses. Make it clearer, more specific, and well-structured. Keep the same intent but enhance the quality. Return ONLY the improved prompt, nothing else - no explanations, no quotes, no prefixes.\n\nOriginal prompt: "${prompt}"`,
                { model: 'openrouter:anthropic/claude-sonnet-4' }
            )

            const enhanced = response?.toString?.().trim() || response?.text?.trim()
            if (enhanced && enhanced.length > 0) {
                return enhanced
            }
        }
    } catch (e) {
        console.warn('Failed to enhance prompt with Puter:', e)
    }
    return null
}
