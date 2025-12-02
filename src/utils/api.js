const LOCAL_API_URL = '/api/chat'
const DIRECT_API_URL = 'https://unifiedapi.vercel.app/v1/chat/completions'
const API_KEY = 'sk-0000d80ad3c542d29120527e66963a2e'

const useLocalApi = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.protocol === 'http:')

// Global system prompt based on best practices from ChatGPT, Claude, and other major AI assistants
// Designed to produce consistent, helpful, accurate, and appropriately-sized responses
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

// Model-specific additions to the global prompt
const MODEL_SPECIFIC_PROMPTS = {
  claude: `\n\nThink step by step inside <think></think> tags before providing your final answer. Keep your thinking concise and focused.`,
  deepseek: '', // DeepSeek has native reasoning
  chatgpt: '',
  gemini: '',
  perplexity: '', // Perplexity has native search/reasoning
  grok: ''
}

async function callApi(model, messages, signal) {
  // Skip local API in dev mode since Vite doesn't have the serverless function
  if (useLocalApi && window.location.port !== '5173') {
    try {
      const response = await fetch(LOCAL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal
      })
      if (response.ok) return response
    } catch (e) {
      console.log('Local API not available, using direct API')
    }
  }

  return fetch(DIRECT_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal
  })
}

function buildConversationHistory(messages, responses, modelKey) {
  const history = []
  
  // Add global system prompt with model-specific additions
  const modelAddition = MODEL_SPECIFIC_PROMPTS[modelKey] || ''
  history.push({
    role: 'system',
    content: GLOBAL_SYSTEM_PROMPT + modelAddition
  })

  messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      history.push({ role: 'user', content: msg.content })
      // Add previous assistant response if exists (not for the current message being processed)
      const resp = responses?.[modelKey]?.[idx]
      if (resp?.content && !resp.isStreaming) {
        history.push({ role: 'assistant', content: resp.content })
      }
    }
  })

  return history
}

async function streamResponse(modelKey, model, messages, responses, signal, onUpdate, useFallback = false) {
  const history = buildConversationHistory(messages, responses, modelKey)
  
  // Ensure we have at least one user message
  if (!history.some(m => m.role === 'user')) {
    onUpdate(modelKey, { error: 'No message to send', isStreaming: false })
    return
  }
  
  // Use fallback model if specified
  const modelId = useFallback && model.fallbackId ? model.fallbackId : model.id
  
  let thinkingContent = ''
  let responseContent = ''
  let rawContent = ''
  let isThinking = true
  let thinkingStartTime = null // Will be set when first thinking token arrives
  let thinkingEndTime = null // Will be set when thinking ends (first content token)
  let receivedContent = false // Track if we received any content

  try {
    const response = await callApi(modelId, history, signal)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
          try {
            const data = JSON.parse(trimmedLine.slice(6))
            const delta = data.choices?.[0]?.delta

            // Handle reasoning_content field
            if (delta?.reasoning_content) {
              receivedContent = true
              // Start timer on first thinking token
              if (!thinkingStartTime) {
                thinkingStartTime = Date.now()
              }
              thinkingContent += delta.reasoning_content
              onUpdate(modelKey, {
                thinking: thinkingContent,
                content: responseContent,
                isStreaming: true
              })
            }

            // Handle content
            if (delta?.content) {
              receivedContent = true
              // Parse Claude's <think> tags
              if (modelKey === 'claude') {
                rawContent += delta.content

                if (rawContent.includes('<think>') && !rawContent.includes('</think>')) {
                  // Start timer on first thinking token for Claude
                  if (!thinkingStartTime) {
                    thinkingStartTime = Date.now()
                  }
                  const thinkStart = rawContent.indexOf('<think>') + 7
                  thinkingContent = rawContent.substring(thinkStart)
                  onUpdate(modelKey, {
                    thinking: thinkingContent,
                    content: '',
                    isStreaming: true
                  })
                  continue
                } else if (rawContent.includes('</think>')) {
                  const thinkStart = rawContent.indexOf('<think>') + 7
                  const thinkEnd = rawContent.indexOf('</think>')
                  thinkingContent = rawContent.substring(thinkStart, thinkEnd).trim()
                  responseContent = rawContent.substring(thinkEnd + 8).trim()
                  
                  // Record thinking end time when </think> is found
                  if (!thinkingEndTime && thinkingStartTime) {
                    thinkingEndTime = Date.now()
                  }
                  
                  const thinkingTime = thinkingStartTime && thinkingEndTime
                    ? Math.round((thinkingEndTime - thinkingStartTime) / 1000) 
                    : 0
                  onUpdate(modelKey, {
                    thinking: thinkingContent,
                    thinkingTime: `${thinkingTime}s`,
                    content: responseContent,
                    isStreaming: true
                  })
                  continue
                }
                continue
              }

              // For other models - record end time when first content arrives
              if (isThinking && thinkingContent) {
                isThinking = false
                if (!thinkingEndTime && thinkingStartTime) {
                  thinkingEndTime = Date.now()
                }
              }

              responseContent += delta.content
              
              // Use recorded end time, not current time
              const thinkingTime = thinkingContent && thinkingStartTime && thinkingEndTime
                ? `${Math.round((thinkingEndTime - thinkingStartTime) / 1000)}s` 
                : null

              onUpdate(modelKey, {
                thinking: thinkingContent || null,
                thinkingTime,
                content: responseContent,
                isStreaming: true
              })
            }
          } catch (e) {
            // JSON parse error, skip
          }
        }
      }
    }

    // Final update - use recorded end time if available
    const thinkingTime = thinkingContent && thinkingStartTime
      ? `${Math.round(((thinkingEndTime || Date.now()) - thinkingStartTime) / 1000)}s` 
      : null

    // If no content received and fallback available, try fallback
    if (!receivedContent && !useFallback && model.fallbackId) {
      console.log(`[${modelKey}] No content received, trying fallback: ${model.fallbackId}`)
      return streamResponse(modelKey, model, messages, responses, signal, onUpdate, true)
    }

    onUpdate(modelKey, {
      thinking: thinkingContent || null,
      thinkingTime,
      content: responseContent,
      isStreaming: false
    })

  } catch (error) {
    if (error.name === 'AbortError') {
      onUpdate(modelKey, {
        thinking: thinkingContent || null,
        content: responseContent || 'Generation stopped.',
        isStreaming: false,
        stopped: true
      })
    } else {
      // If error and fallback available, try fallback
      if (!useFallback && model.fallbackId) {
        console.log(`[${modelKey}] Error occurred, trying fallback: ${model.fallbackId}`)
        return streamResponse(modelKey, model, messages, responses, signal, onUpdate, true)
      }
      
      console.error(`[${modelKey}] Error:`, error)
      onUpdate(modelKey, {
        error: error.message,
        isStreaming: false
      })
    }
  }
}

export async function sendToAllModels({ activeModels, models, messages, responses, controllers, onUpdate }) {
  const promises = activeModels.map((modelKey, idx) => {
    const model = models[modelKey]
    if (!model) return Promise.resolve()
    return streamResponse(modelKey, model, messages, responses, controllers[idx].signal, onUpdate)
  })

  await Promise.allSettled(promises)
}

export async function generateChatTitle(messages) {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) return null

  const greetings = ['hi', 'hello', 'hey', 'hola', 'howdy', 'greetings']
  const firstMsg = userMessages[0].content.toLowerCase().trim().replace(/[!.,?]/g, '')
  const isGreeting = greetings.some(g => firstMsg === g || firstMsg.startsWith(g + ' '))

  if (isGreeting && userMessages.length === 1) {
    return 'New Conversation'
  }

  const messageForTitle = isGreeting && userMessages.length >= 2 
    ? userMessages[1].content 
    : userMessages[0].content

  try {
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [{
          role: 'user',
          content: `Generate a very short chat title (2-5 words max) for this user message. Just respond with the title, nothing else. No quotes, no explanation.\n\nUser message: "${messageForTitle}"`
        }],
        stream: false
      })
    })

    if (response.ok) {
      const data = await response.json()
      const title = data.choices?.[0]?.message?.content?.trim()
      if (title && title.length <= 50) {
        return title
      }
    }
  } catch (e) {
    console.error('Failed to generate title:', e)
  }

  return messageForTitle.substring(0, 40) + (messageForTitle.length > 40 ? '...' : '')
}
