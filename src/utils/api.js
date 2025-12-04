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
  claude: '', // Uses thinking_budget parameter in thinking mode
  deepseek: '', // DeepSeek has native reasoning
  chatgpt: '',
  gemini: '',
  perplexity: '',
  grok: ''
}

// Image generation prompt addition
const IMAGE_GEN_PROMPT = `\n\nIMPORTANT: This is an image generation request. Provide a detailed, creative description that can be used to generate an image. Focus on visual details, composition, style, lighting, colors, and mood.`

async function callApi(model, messages, signal, extraParams = {}) {
  const payload = { model, messages, stream: true, ...extraParams }
  
  // Skip local API in dev mode since Vite doesn't have the serverless function
  if (useLocalApi && window.location.port !== '5173') {
    try {
      const response = await fetch(LOCAL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      })
      if (response.ok) return response
    } catch (e) {
      // Local API not available, fall through to direct API
    }
  }

  return fetch(DIRECT_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal
  })
}

function buildConversationHistory(messages, responses, modelKey, supportsVision = true, isThinkingMode = false, avatarPrompt = null) {
  const history = []
  
  // Check if last message has image gen mode enabled
  const lastMessage = messages[messages.length - 1]
  const imageGenAddition = lastMessage?.imageGenMode ? IMAGE_GEN_PROMPT : ''
  
  // Skip system prompt for GPT-5 and Claude in thinking mode (long system prompt disables reasoning_content)
  const skipSystemPrompt = isThinkingMode && (modelKey === 'chatgpt' || modelKey === 'claude')
  
  if (!skipSystemPrompt) {
    // Use avatar prompt if provided, otherwise use global system prompt
    const basePrompt = avatarPrompt || GLOBAL_SYSTEM_PROMPT
    const modelAddition = avatarPrompt ? '' : (MODEL_SPECIFIC_PROMPTS[modelKey] || '')
    
    history.push({
      role: 'system',
      content: basePrompt + modelAddition + imageGenAddition
    })
  }

  messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      const hasImages = msg.images && msg.images.length > 0
      const hasFiles = msg.files && msg.files.length > 0
      
      // Build content array if we have images or files
      if ((hasImages && supportsVision) || hasFiles) {
        const content = [
          { type: 'text', text: msg.content }
        ]
        
        // Add images
        if (hasImages && supportsVision) {
          msg.images.forEach(imgUrl => {
            content.push({
              type: 'image_url',
              image_url: { url: imgUrl }
            })
          })
        }
        
        // Add files
        if (hasFiles) {
          msg.files.forEach(file => {
            if (file.type === 'pdf') {
              // PDF as base64
              content.push({
                type: 'file',
                file: {
                  filename: file.name,
                  file_data: `data:application/pdf;base64,${file.data}`
                }
              })
            } else if (file.type === 'text' || file.type === 'csv') {
              // Text/CSV - append to text content
              content[0].text += `\n\n--- File: ${file.name} ---\n${file.content}`
            } else if (file.type === 'document') {
              // Try sending as file
              content.push({
                type: 'file',
                file: {
                  filename: file.name,
                  file_data: `data:${file.mimeType};base64,${file.data}`
                }
              })
            }
          })
        }
        
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

// Process file for upload - returns file data object
export async function processFile(file) {
  const fileName = file.name
  const fileType = file.type
  const fileExt = fileName.split('.').pop().toLowerCase()
  
  // For text files, read as text
  if (fileType === 'text/plain' || fileExt === 'txt') {
    const text = await file.text()
    return {
      type: 'text',
      name: fileName,
      content: text
    }
  }
  
  // For CSV files, read as text
  if (fileType === 'text/csv' || fileExt === 'csv') {
    const text = await file.text()
    return {
      type: 'csv',
      name: fileName,
      content: text
    }
  }
  
  // For PDF files, convert to base64
  if (fileType === 'application/pdf' || fileExt === 'pdf') {
    const base64 = await fileToBase64(file)
    return {
      type: 'pdf',
      name: fileName,
      data: base64
    }
  }
  
  // For DOC/DOCX - we'll need to extract text or send as-is
  // OpenRouter may not support these directly, so we'll try base64
  if (fileExt === 'doc' || fileExt === 'docx' || 
      fileType === 'application/msword' || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const base64 = await fileToBase64(file)
    return {
      type: 'document',
      name: fileName,
      data: base64,
      mimeType: fileType
    }
  }
  
  throw new Error(`Unsupported file type: ${fileType || fileExt}`)
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Get supported file types
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  '.pdf': 'PDF',
  '.txt': 'TXT', 
  '.csv': 'CSV'
}

export const FILE_ACCEPT = '.pdf,.txt,.csv'

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
        model: 'openrouter:anthropic/claude-sonnet-4',
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
    // Failed to enhance prompt
  }
  return null
}

const FALLBACK_TIMEOUT_MS = 15000 // 15 seconds timeout before retry/fallback
const FILE_TIMEOUT_MS = 60000 // 60 seconds for file uploads
const WEB_SEARCH_TIMEOUT_MS = 45000 // 45 seconds for web search mode (longer context)

// retryState: 0 = first try, 1 = retry same model, 2 = use fallback
// showGrokWarning: boolean to show warning for Grok (doesn't expose reasoning)
async function streamResponse(modelKey, model, selectedModelId, messages, responses, signal, onUpdate, retryState = 0, showGrokWarning = false, avatarPrompt = null) {
  // Check if message has files or web search - use longer timeout
  const lastMsg = messages[messages.length - 1]
  const hasFiles = lastMsg?.files && lastMsg.files.length > 0
  const hasWebSearch = lastMsg?.hasWebSearch || lastMsg?.webSearch
  const timeoutMs = hasFiles ? FILE_TIMEOUT_MS : hasWebSearch ? WEB_SEARCH_TIMEOUT_MS : FALLBACK_TIMEOUT_MS
  
  // Check if thinking mode is enabled
  const isThinkingMode = lastMsg?.thinkingMode
  
  // Build conversation history with thinking mode flag and avatar prompt
  const history = buildConversationHistory(messages, responses, modelKey, model.supportsVision, isThinkingMode, avatarPrompt)
  
  // Ensure we have at least one user message
  if (!history.some(m => m.role === 'user')) {
    onUpdate(modelKey, { error: 'No message to send', isStreaming: false })
    return
  }
  
  // Use the selected model ID (already determined by store based on variant and thinking mode)
  const modelId = selectedModelId
  
  // Add reasoning parameters based on model type
  // Native reasoning models (no extra params needed): ChatGPT o-series, Gemini, DeepSeek R1, Kimi K2 Thinking
  // - Grok: Uses reasoning.enabled parameter
  // - Claude, Perplexity: Use thinking_budget parameter
  const extraParams = {}
  if (isThinkingMode) {
    if (modelKey === 'grok') {
      extraParams.reasoning = { enabled: true }
    } else if (modelKey === 'claude' || modelKey === 'perplexity') {
      extraParams.thinking_budget = 10000
    }
  }
  
  let thinkingContent = ''
  let responseContent = ''
  let rawContent = ''
  let isThinking = true
  let thinkingStartTime = null
  let thinkingEndTime = null
  let receivedContent = false
  let timeoutTriggered = false
  let timeoutId = null
  
  // Show warning for Grok if thinking mode is enabled (doesn't expose reasoning)
  const grokWarning = showGrokWarning ? `⚠️ Note: ${model.name} doesn't expose thinking/reasoning content in the API. While reasoning is enabled internally to improve response quality, you won't see the thinking process.` : ''
  if (showGrokWarning) {
    thinkingContent = grokWarning
    onUpdate(modelKey, {
      thinking: thinkingContent,
      content: '',
      isStreaming: true
    })
  }

  // Set up timeout (only on first try or retry, not on fallback) - skip for files
  if (retryState < 2 && !hasFiles) {
    timeoutId = setTimeout(() => {
      if (!receivedContent) {
        timeoutTriggered = true
      }
    }, timeoutMs)
  }

  try {
    const response = await callApi(modelId, history, signal, extraParams)
    
    // Check if timeout was triggered during the fetch
    if (timeoutTriggered) {
      if (timeoutId) clearTimeout(timeoutId)
      // Don't retry if aborted
      if (signal.aborted) return
      if (retryState === 0) {
        return streamResponse(modelKey, model, selectedModelId, messages, responses, signal, onUpdate, 1)
      } else if (retryState === 1) {
        return streamResponse(modelKey, model, selectedModelId, messages, responses, signal, onUpdate, 2)
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
              
              // For Claude WITHOUT thinking_budget (legacy <think> tag handling)
              // Only parse <think> tags if we haven't received reasoning_content
              if (modelKey === 'claude' && !thinkingContent && !isThinkingMode) {
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
              }

              // For other models - record end time when first content arrives
              if (isThinking && thinkingContent) {
                isThinking = false
                if (!thinkingEndTime && thinkingStartTime) {
                  thinkingEndTime = Date.now()
                }
              }

              responseContent += delta.content
              
              const thinkingTime = thinkingContent && thinkingStartTime && thinkingEndTime
                ? `${Math.round((thinkingEndTime - thinkingStartTime) / 1000)}s` 
                : null

              onUpdate(modelKey, {
                thinking: thinkingContent || grokWarning || null,
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
    
    // Final update
    const thinkingTime = thinkingContent && thinkingStartTime
      ? `${Math.round(((thinkingEndTime || Date.now()) - thinkingStartTime) / 1000)}s` 
      : null

    // If no content received, try retry then fallback (but not if aborted)
    if (!receivedContent && !signal.aborted) {
      if (retryState === 0) {
        return streamResponse(modelKey, model, selectedModelId, messages, responses, signal, onUpdate, 1)
      } else if (retryState === 1) {
        return streamResponse(modelKey, model, selectedModelId, messages, responses, signal, onUpdate, 2)
      }
    }

    onUpdate(modelKey, {
      thinking: thinkingContent || grokWarning || null,
      thinkingTime,
      content: responseContent,
      isStreaming: false
    })

  } catch (error) {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    
    if (error.name === 'AbortError') {
      onUpdate(modelKey, {
        thinking: thinkingContent || null,
        content: responseContent || 'Generation stopped.',
        isStreaming: false,
        stopped: true
      })
    } else {
      // Don't retry if aborted
      if (!signal.aborted) {
        if (retryState === 0) {
          return streamResponse(modelKey, model, selectedModelId, messages, responses, signal, onUpdate, 1)
        } else if (retryState === 1) {
          return streamResponse(modelKey, model, selectedModelId, messages, responses, signal, onUpdate, 2)
        }
      }
      
      onUpdate(modelKey, {
        error: signal.aborted ? 'Generation stopped.' : error.message,
        isStreaming: false,
        stopped: signal.aborted
      })
    }
  }
}

export async function sendToAllModels({ activeModels, models, messages, responses, controllers, onUpdate, getModelId, avatarPrompt = null }) {
  const lastMessage = messages[messages.length - 1]
  const hasImages = lastMessage?.images && lastMessage.images.length > 0
  const isThinkingMode = lastMessage?.thinkingMode

  const promises = activeModels.map((modelKey, idx) => {
    const model = models[modelKey]
    if (!model) return Promise.resolve()
    
    if (hasImages && !model.supportsVision) {
      onUpdate(modelKey, {
        content: `⚠️ ${model.name} doesn't support image/vision input. This model can only process text.`,
        isStreaming: false,
        unsupported: true
      })
      return Promise.resolve()
    }
    
    const modelId = getModelId ? getModelId(modelKey) : model.defaultVariant
    
    return streamResponse(modelKey, model, modelId, messages, responses, controllers[idx].signal, onUpdate, 0, isThinkingMode && modelKey === 'grok', avatarPrompt)
  })

  await Promise.allSettled(promises)
}

// Web search enhanced version - searches first, then passes context to all models
export async function sendToAllModelsWithSearch({ 
  activeModels, 
  models, 
  messages, 
  responses, 
  controllers, 
  onUpdate, 
  onSearchProgress,
  onSearchComplete,
  getModelId,
  avatarPrompt = null
}) {
  const lastMessage = messages[messages.length - 1]
  const hasImages = lastMessage?.images && lastMessage.images.length > 0
  const isThinkingMode = lastMessage?.thinkingMode
  const userQuery = lastMessage?.content || ''

  // Step 1: Perform web search using Perplexity Sonar Pro Search
  onSearchProgress?.({ status: 'searching', round: 1, message: 'Searching the web...' })
  
  let searchContext = ''
  let allSearchResults = []
  
  try {
    // Initial search
    const searchResult = await performWebSearchInternal(userQuery, controllers[0]?.signal)
    
    if (searchResult.success) {
      allSearchResults.push(searchResult)
      
      // Check if AI wants follow-up searches (step-by-step research)
      onSearchProgress?.({ status: 'analyzing', round: 1, message: 'Analyzing results...' })
      
      const followUpQueries = await checkForFollowUpSearchInternal(searchResult.content, userQuery)
      
      if (followUpQueries && followUpQueries.length > 0) {
        onSearchProgress?.({ status: 'searching', round: 2, message: `Performing ${followUpQueries.length} follow-up searches...` })
        
        // Perform follow-up searches
        const followUpPromises = followUpQueries.map(q => 
          performWebSearchInternal(q, controllers[0]?.signal)
        )
        const followUpResults = await Promise.all(followUpPromises)
        allSearchResults.push(...followUpResults.filter(r => r.success))
      }
      
      // Build search context for AI models
      searchContext = buildSearchContextInternal(allSearchResults)
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Web search failed:', error)
    }
  }
  
  onSearchComplete?.({
    totalSearches: allSearchResults.length,
    searchResults: allSearchResults,
    context: searchContext
  })

  // Step 2: Create modified messages with search context
  const messagesWithSearch = [...messages]
  if (searchContext && messagesWithSearch.length > 0) {
    const lastIdx = messagesWithSearch.length - 1
    messagesWithSearch[lastIdx] = {
      ...messagesWithSearch[lastIdx],
      content: messagesWithSearch[lastIdx].content + searchContext,
      hasWebSearch: true,
      searchResults: allSearchResults
    }
  }

  // Step 3: Send to all models with search context
  const promises = activeModels.map((modelKey, idx) => {
    const model = models[modelKey]
    if (!model) return Promise.resolve()
    
    if (hasImages && !model.supportsVision) {
      onUpdate(modelKey, {
        content: `⚠️ ${model.name} doesn't support image/vision input. This model can only process text.`,
        isStreaming: false,
        unsupported: true
      })
      return Promise.resolve()
    }
    
    const modelId = getModelId ? getModelId(modelKey) : model.defaultVariant
    
    return streamResponse(modelKey, model, modelId, messagesWithSearch, responses, controllers[idx].signal, onUpdate, 0, isThinkingMode && modelKey === 'grok', avatarPrompt)
  })

  await Promise.allSettled(promises)
}

// Internal web search function using Perplexity Sonar Pro Search
async function performWebSearchInternal(query, signal) {
  try {
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openrouter:perplexity/sonar-pro-search',
        messages: [{
          role: 'system',
          content: `You are a web search assistant. Search the internet for the most relevant and up-to-date information. Provide a comprehensive summary with key facts and cite your sources with URLs.`
        }, {
          role: 'user',
          content: query
        }],
        stream: false
      }),
      signal
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const data = await response.json()
    const searchResult = data.choices?.[0]?.message?.content || ''
    
    return {
      success: true,
      content: searchResult,
      query: query
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Search cancelled' }
    }
    return { success: false, error: error.message }
  }
}

// Check if AI wants follow-up searches
async function checkForFollowUpSearchInternal(aiResponse, originalQuery) {
  try {
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openrouter:google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: `Analyze this search result and determine if additional searches would help answer the original question better.

Original question: "${originalQuery}"

Search result:
${aiResponse.substring(0, 3000)}

If more specific searches would help, respond with a JSON array of 1-2 search queries. If the information is sufficient, respond with [].

ONLY respond with a valid JSON array, nothing else. Example: ["specific query 1", "specific query 2"]`
        }],
        stream: false
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || '[]'
    
    try {
      // Extract JSON array from response
      const match = content.match(/\[.*\]/s)
      if (match) {
        const queries = JSON.parse(match[0])
        if (Array.isArray(queries) && queries.length > 0) {
          return queries.slice(0, 2)
        }
      }
    } catch {
      return null
    }
    
    return null
  } catch {
    return null
  }
}

// Build context from search results - keep it concise and clear
function buildSearchContextInternal(searchResults) {
  if (!searchResults || searchResults.length === 0) return ''
  
  // Keep context concise to avoid overwhelming models (especially Kimi)
  let context = '\n\n---\nWEB SEARCH RESULTS (live data):\n\n'
  
  searchResults.forEach((result, idx) => {
    if (result.success) {
      // Truncate to avoid context length issues
      const content = result.content.length > 2000 
        ? result.content.substring(0, 2000) + '...' 
        : result.content
      context += `${content}\n\n`
    }
  })
  
  context += '---\nUse the search results above to answer. This is current information.'
  
  return context
}

export async function regenerateSingleModel({ modelKey, model, modelId, messages, responses, onUpdate }) {
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
  await streamResponse(modelKey, model, modelId, messages, responses, controller.signal, onUpdate)
  return controller
}

export async function generateChatTitle(messages, currentTitle = null) {
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
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openrouter:anthropic/claude-sonnet-4',
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
    // Failed to generate title
  }

  return messageForTitle.substring(0, 40) + (messageForTitle.length > 40 ? '...' : '')
}
