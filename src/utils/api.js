const LOCAL_API_URL = '/api/chat'
const DIRECT_API_URL = 'https://unifiedapi.vercel.app/v1/chat/completions'
const API_KEY = 'sk-0000d80ad3c542d29120527e66963a2e'
const IMGBB_API_KEY = '2de73ee0c32047bad5393bf7db1cea9e'

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

function buildConversationHistory(messages, responses, modelKey, supportsVision = true) {
  const history = []
  
  // Add global system prompt with model-specific additions
  const modelAddition = MODEL_SPECIFIC_PROMPTS[modelKey] || ''
  history.push({
    role: 'system',
    content: GLOBAL_SYSTEM_PROMPT + modelAddition
  })

  messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      // Handle messages with images
      if (msg.images && msg.images.length > 0 && supportsVision) {
        const content = [
          { type: 'text', text: msg.content }
        ]
        msg.images.forEach(imgUrl => {
          content.push({
            type: 'image_url',
            image_url: { url: imgUrl }
          })
        })
        history.push({ role: 'user', content })
      } else {
        history.push({ role: 'user', content: msg.content })
      }
      // Add previous assistant response if exists (not for the current message being processed)
      const resp = responses?.[modelKey]?.[idx]
      if (resp?.content && !resp.isStreaming) {
        history.push({ role: 'assistant', content: resp.content })
      }
    }
  })

  return history
}

// Upload image to ImgBB and get URL
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  })
  
  const data = await response.json()
  if (data.success) {
    return data.data.url
  }
  throw new Error(data.error?.message || 'Image upload failed')
}

// Enhance/improve a prompt using AI
export async function enhancePrompt(prompt) {
  try {
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [{
          role: 'user',
          content: `Improve this prompt to get better AI responses. Make it clearer, more specific, and well-structured. Keep the same intent but enhance the quality. Return ONLY the improved prompt, nothing else - no explanations, no quotes, no prefixes.

Original prompt: "${prompt}"`
        }],
        stream: false
      })
    })

    if (response.ok) {
      const data = await response.json()
      const enhanced = data.choices?.[0]?.message?.content?.trim()
      if (enhanced && enhanced.length > 0) {
        return enhanced
      }
    }
  } catch (e) {
    console.error('Failed to enhance prompt:', e)
  }
  return null
}

const FALLBACK_TIMEOUT_MS = 10000 // 10 seconds timeout before retry/fallback

// retryState: 0 = first try, 1 = retry same model, 2 = use fallback
async function streamResponse(modelKey, model, messages, responses, signal, onUpdate, retryState = 0) {
  const history = buildConversationHistory(messages, responses, modelKey, model.supportsVision)
  
  // Ensure we have at least one user message
  if (!history.some(m => m.role === 'user')) {
    onUpdate(modelKey, { error: 'No message to send', isStreaming: false })
    return
  }
  
  // Use fallback model only on retryState 2
  const modelId = retryState === 2 && model.fallbackId ? model.fallbackId : model.id
  const modelLabel = retryState === 2 ? 'fallback' : (retryState === 1 ? 'retry' : 'primary')
  
  let thinkingContent = ''
  let responseContent = ''
  let rawContent = ''
  let isThinking = true
  let thinkingStartTime = null
  let thinkingEndTime = null
  let receivedContent = false
  let timeoutTriggered = false
  let timeoutId = null

  // Set up timeout (only on first try or retry, not on fallback)
  if (retryState < 2) {
    timeoutId = setTimeout(() => {
      if (!receivedContent) {
        timeoutTriggered = true
        console.log(`[${modelKey}] ${modelLabel} timeout after ${FALLBACK_TIMEOUT_MS}ms`)
      }
    }, FALLBACK_TIMEOUT_MS)
  }

  try {
    const response = await callApi(modelId, history, signal)
    
    // Check if timeout was triggered during the fetch
    if (timeoutTriggered) {
      if (timeoutId) clearTimeout(timeoutId)
      if (retryState === 0) {
        console.log(`[${modelKey}] Retrying same model...`)
        return streamResponse(modelKey, model, messages, responses, signal, onUpdate, 1)
      } else if (retryState === 1 && model.fallbackId) {
        console.log(`[${modelKey}] Switching to fallback: ${model.fallbackId}`)
        return streamResponse(modelKey, model, messages, responses, signal, onUpdate, 2)
      }
    }

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
              if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
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
              if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
              // Parse Claude's <think> tags
              if (modelKey === 'claude') {
                rawContent += delta.content

                // Case 1: Inside <think> tags (thinking in progress)
                if (rawContent.includes('<think>') && !rawContent.includes('</think>')) {
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
                } 
                // Case 2: After </think> tags (thinking complete)
                else if (rawContent.includes('</think>')) {
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
                // Case 3: No <think> tags at all - treat as regular content
                else {
                  responseContent = rawContent
                  onUpdate(modelKey, {
                    thinking: null,
                    thinkingTime: null,
                    content: responseContent,
                    isStreaming: true
                  })
                  continue
                }
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

    // Clear timeout
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    
    // Final update - use recorded end time if available
    const thinkingTime = thinkingContent && thinkingStartTime
      ? `${Math.round(((thinkingEndTime || Date.now()) - thinkingStartTime) / 1000)}s` 
      : null

    // If no content received, try retry then fallback
    if (!receivedContent) {
      if (retryState === 0) {
        console.log(`[${modelKey}] No content received, retrying same model...`)
        return streamResponse(modelKey, model, messages, responses, signal, onUpdate, 1)
      } else if (retryState === 1 && model.fallbackId) {
        console.log(`[${modelKey}] Retry failed, trying fallback: ${model.fallbackId}`)
        return streamResponse(modelKey, model, messages, responses, signal, onUpdate, 2)
      }
    }

    onUpdate(modelKey, {
      thinking: thinkingContent || null,
      thinkingTime,
      content: responseContent,
      isStreaming: false
    })

  } catch (error) {
    // Clear timeout on error
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    
    if (error.name === 'AbortError') {
      onUpdate(modelKey, {
        thinking: thinkingContent || null,
        content: responseContent || 'Generation stopped.',
        isStreaming: false,
        stopped: true
      })
    } else {
      // On error: retry same model first, then try fallback
      if (retryState === 0) {
        console.log(`[${modelKey}] Error occurred, retrying same model...`)
        return streamResponse(modelKey, model, messages, responses, signal, onUpdate, 1)
      } else if (retryState === 1 && model.fallbackId) {
        console.log(`[${modelKey}] Retry failed, trying fallback: ${model.fallbackId}`)
        return streamResponse(modelKey, model, messages, responses, signal, onUpdate, 2)
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
  // Check if current message has images
  const lastMessage = messages[messages.length - 1]
  const hasImages = lastMessage?.images && lastMessage.images.length > 0

  const promises = activeModels.map((modelKey, idx) => {
    const model = models[modelKey]
    if (!model) return Promise.resolve()
    
    // If message has images and model doesn't support vision, show error
    if (hasImages && !model.supportsVision) {
      onUpdate(modelKey, {
        content: `⚠️ ${model.name} doesn't support image/vision input. This model can only process text.`,
        isStreaming: false,
        unsupported: true
      })
      return Promise.resolve()
    }
    
    return streamResponse(modelKey, model, messages, responses, controllers[idx].signal, onUpdate)
  })

  await Promise.allSettled(promises)
}

// Regenerate response for a single model
export async function regenerateSingleModel({ modelKey, model, messages, responses, onUpdate }) {
  // Check if message has images and model doesn't support vision
  const lastMessage = messages[messages.length - 1]
  const hasImages = lastMessage?.images && lastMessage.images.length > 0
  
  if (hasImages && !model.supportsVision) {
    onUpdate(modelKey, {
      content: `⚠️ ${model.name} doesn't support image/vision input. This model can only process text.`,
      isStreaming: false,
      unsupported: true
    })
    return
  }

  const controller = new AbortController()
  await streamResponse(modelKey, model, messages, responses, controller.signal, onUpdate)
  return controller
}

export async function generateChatTitle(messages, currentTitle = null) {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) return null

  const greetings = ['hi', 'hello', 'hey', 'hola', 'howdy', 'greetings', 'hii', 'hiii', 'yo', 'sup']
  const firstMsg = userMessages[0].content.toLowerCase().trim().replace(/[!.,?]/g, '')
  const isFirstGreeting = greetings.some(g => firstMsg === g || firstMsg.startsWith(g + ' '))

  // If first message is greeting and only one message, return temporary title
  if (isFirstGreeting && userMessages.length === 1) {
    return 'New Conversation'
  }

  // If current title is "New Conversation" and we now have 2+ messages, regenerate
  const shouldRegenerate = currentTitle === 'New Conversation' && userMessages.length >= 2

  // Skip if we already have a proper title and don't need to regenerate
  if (currentTitle && currentTitle !== 'New Conversation' && !shouldRegenerate) {
    return currentTitle
  }

  // Use second message if first was greeting, otherwise use first
  const messageForTitle = isFirstGreeting && userMessages.length >= 2 
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
