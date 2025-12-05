import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import MarkdownRenderer from './MarkdownRenderer'
import ModelDropdown from './ModelDropdown'

// Model theme configurations based on real UIs - matching exact designs
const MODEL_THEMES = {
  chatgpt: {
    name: 'ChatGPT',
    bgMain: '#ffffff',
    bgMainDark: '#212121',
    bgCard: '#ffffff',
    bgCardDark: '#2f2f2f',
    userBubble: '#f4f4f4',
    userBubbleDark: '#2f2f2f',
    accent: '#000000',
    accentDark: '#ffffff',
    welcomeText: "What's on your mind today?",
    placeholder: 'Ask anything',
    showLogo: true
  },
  claude: {
    name: 'Claude',
    bgMain: '#FAF9F5',
    bgMainDark: '#2D2B28',
    bgCard: '#ffffff',
    bgCardDark: '#3D3B38',
    userBubble: 'transparent',
    userBubbleDark: 'transparent',
    accent: '#D97757',
    accentDark: '#D97757',
    welcomeText: 'How can I help you today?',
    placeholder: 'How can I help you today?',
    showLogo: true
  },
  gemini: {
    name: 'Gemini',
    bgMain: '#E3E8EF',
    bgMainDark: '#1E1F20',
    bgCard: '#ffffff',
    bgCardDark: '#282A2C',
    userBubble: '#E9EEF6',
    userBubbleDark: '#3C4043',
    accent: '#4285F4',
    accentDark: '#8AB4F8',
    welcomeText: 'Hi there',
    placeholder: 'Ask Gemini',
    showLogo: true
  },
  deepseek: {
    name: 'DeepSeek',
    bgMain: '#ffffff',
    bgMainDark: '#1a1a2e',
    bgCard: '#ffffff',
    bgCardDark: '#252542',
    userBubble: '#f0f4ff',
    userBubbleDark: '#2a2a4a',
    accent: '#4D6BFE',
    accentDark: '#6B7FFF',
    welcomeText: 'How can I help you?',
    placeholder: 'Message DeepSeek',
    showLogo: true
  },
  perplexity: {
    name: 'Perplexity',
    bgMain: '#F8F8F5',
    bgMainDark: '#191A1A',
    bgCard: '#ffffff',
    bgCardDark: '#202222',
    userBubble: '#F7F7F7',
    userBubbleDark: '#2D2E2E',
    accent: '#1BA8B8',
    accentDark: '#1BA8B8',
    welcomeText: '',
    placeholder: 'Ask anything. Type @ for mentions and / for shortcuts.',
    showLogo: true
  },
  grok: {
    name: 'Grok',
    bgMain: '#F7F9F9',
    bgMainDark: '#000000',
    bgCard: '#ffffff',
    bgCardDark: '#16181C',
    userBubble: '#EFF3F4',
    userBubbleDark: '#2F3336',
    accent: '#000000',
    accentDark: '#ffffff',
    welcomeText: '',
    placeholder: 'What do you want to know?',
    showLogo: true
  },
  kimi: {
    name: 'Kimi',
    bgMain: '#ffffff',
    bgMainDark: '#1a1a2e',
    bgCard: '#ffffff',
    bgCardDark: '#252542',
    userBubble: '#f0f4ff',
    userBubbleDark: '#2a2a4a',
    accent: '#6366f1',
    accentDark: '#818CF8',
    welcomeText: 'How can I help you today?',
    placeholder: 'Ask Kimi anything...',
    showLogo: true
  }
}

// Single Model Chat - Dedicated chat interface for one model
function SingleModelChat() {
  const { modelKey, chatId } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const [thinkingContent, setThinkingContent] = useState('')
  const [thinkingTime, setThinkingTime] = useState(null)
  const [thinkingMode, setThinkingMode] = useState(false)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const thinkingStartRef = useRef(null)
  const isSendingRef = useRef(false) // Prevent double sends

  const {
    models,
    theme,
    getModelId,
    selectedVariants,
    getVariantName,
    getSingleModelChat,
    createSingleModelChat,
    addSingleModelMessage,
    updateSingleModelResponse
  } = useStore()

  const model = models[modelKey]
  const modelTheme = MODEL_THEMES[modelKey] || MODEL_THEMES.chatgpt
  const iconSrc = theme === 'dark' && model?.iconDark ? model.iconDark : model?.icon

  // Get current variant name for dynamic display
  const variantName = getVariantName(modelKey)

  // Get or create chat
  const chat = chatId ? getSingleModelChat(chatId) : null
  const messages = chat?.messages || []

  // Check if current variant supports thinking
  const currentVariantId = selectedVariants[modelKey] || model?.defaultVariant
  const currentVariant = model?.variants?.find(v => v.id === currentVariantId)
  const supportsThinking = currentVariant?.supportsThinking || false

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse, thinkingContent])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [modelKey, chatId])

  // Redirect if invalid model
  if (!model) {
    return (
      <div className="single-model-page">
        <div className="single-model-error">
          <h2>Model not found</h2>
          <Link to="/" className="back-link">Go back to home</Link>
        </div>
      </div>
    )
  }

  // Stream response with thinking support - using ref to avoid stale closures
  const streamResponseRef = useRef(null)

  streamResponseRef.current = async (userMessage, currentChatId) => {
    setIsLoading(true)
    setIsStreaming(false)
    setCurrentResponse('')
    setThinkingContent('')
    setThinkingTime(null)
    thinkingStartRef.current = null
    abortControllerRef.current = new AbortController()

    const API_URL = 'https://unifiedapi.vercel.app/v1/chat/completions'
    const API_KEY = 'sk-0000d80ad3c542d29120527e66963a2e'

    // Get Puter auth token if available
    const getPuterToken = () => {
      if (typeof window !== 'undefined' && window.puter) {
        return window.puter.authToken || window.puter.auth?.getToken?.() || window.puter.token || null
      }
      return null
    }
    const puterToken = getPuterToken()

    // Get model ID - use thinking variant if thinking mode enabled
    let modelId = getModelId(modelKey)
    if (thinkingMode && supportsThinking) {
      const thinkingVariant = model.variants.find(v => v.supportsThinking)
      if (thinkingVariant) {
        modelId = thinkingVariant.id
      }
    }

    // Get current messages from store
    const currentChat = useStore.getState().getSingleModelChat(currentChatId)
    const currentMessages = currentChat?.messages || []

    // Build conversation history - exclude the message we just added
    const apiMessages = currentMessages
      .filter(m => !m.isStreaming)
      .map(m => ({
        role: m.role,
        content: m.content
      }))

    // Add thinking parameters for supported models
    const extraParams = {}
    if (thinkingMode && supportsThinking) {
      if (modelKey === 'grok') {
        extraParams.reasoning = { enabled: true }
      } else if (modelKey === 'claude' || modelKey === 'perplexity') {
        extraParams.thinking_budget = 10000
      }
    }

    // Build headers with optional Puter token
    const headers = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
    if (puterToken) {
      headers['X-Puter-Token'] = puterToken
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: apiMessages,
          stream: true,
          ...extraParams
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      setIsLoading(false)
      setIsStreaming(true)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let fullThinking = ''
      let thinkingEndTime = null
      let finalThinkingTime = null

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

              // Handle reasoning_content (thinking)
              if (delta?.reasoning_content) {
                if (!thinkingStartRef.current) {
                  thinkingStartRef.current = Date.now()
                }
                fullThinking += delta.reasoning_content
                setThinkingContent(fullThinking)
              }

              // Handle regular content
              if (delta?.content) {
                // Record thinking end time when content starts
                if (fullThinking && !thinkingEndTime && thinkingStartRef.current) {
                  thinkingEndTime = Date.now()
                  const duration = Math.round((thinkingEndTime - thinkingStartRef.current) / 1000)
                  finalThinkingTime = `${duration}s`
                  setThinkingTime(finalThinkingTime)
                }

                fullContent += delta.content
                setCurrentResponse(fullContent)
              }
            } catch (e) {
              // JSON parse error, skip
            }
          }
        }
      }

      // Calculate final thinking time if not already set
      if (fullThinking && !thinkingEndTime && thinkingStartRef.current) {
        const duration = Math.round((Date.now() - thinkingStartRef.current) / 1000)
        finalThinkingTime = `${duration}s`
        setThinkingTime(finalThinkingTime)
      }

      // Update store with final response
      updateSingleModelResponse(currentChatId, fullContent, fullThinking, false, {
        thinkingTime: finalThinkingTime
      })

      setCurrentResponse('')
      setThinkingContent('')
    } catch (error) {
      if (error.name !== 'AbortError') {
        updateSingleModelResponse(currentChatId, `Error: ${error.message}`, null, false, { error: true })
      }
      setCurrentResponse('')
      setThinkingContent('')
    } finally {
      setIsStreaming(false)
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // Send message
  const handleSend = useCallback(async () => {
    // Early return checks
    if (!message.trim()) return
    if (isStreaming || isLoading) return
    if (isSendingRef.current) return

    // Set lock immediately
    isSendingRef.current = true

    try {
      const userMessage = message.trim()
      setMessage('')

      let currentChatId = chatId

      // Create new chat if needed
      if (!currentChatId) {
        const newChat = createSingleModelChat(modelKey)
        currentChatId = newChat.id
        navigate(`/chat/${modelKey}/${newChat.id}`, { replace: true })
      }

      // Add user message to store
      addSingleModelMessage(currentChatId, { role: 'user', content: userMessage })

      // Stream response using ref to get latest function
      await streamResponseRef.current(userMessage, currentChatId)
    } finally {
      // Always reset send lock
      isSendingRef.current = false
    }
  }, [message, isStreaming, isLoading, chatId, modelKey, navigate, createSingleModelChat, addSingleModelMessage])

  // Stop generation
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    if (currentResponse && chatId) {
      updateSingleModelResponse(chatId, currentResponse, thinkingContent, false, { stopped: true })
    }
    setCurrentResponse('')
    setThinkingContent('')
    setIsStreaming(false)
    setIsLoading(false)
  }, [currentResponse, thinkingContent, chatId, updateSingleModelResponse])

  // Handle key press
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      if (isStreaming || isLoading) {
        handleStop()
      } else if (!isSendingRef.current) {
        handleSend()
      }
    }
  }, [isStreaming, isLoading, handleSend, handleStop])

  // Toggle thinking mode
  const toggleThinking = () => {
    setThinkingMode(prev => !prev)
  }

  const isGenerating = isStreaming || isLoading

  // Generate CSS variables for theming
  const themeStyles = {
    '--model-bg-main': theme === 'dark' ? modelTheme.bgMainDark : modelTheme.bgMain,
    '--model-bg-card': theme === 'dark' ? modelTheme.bgCardDark : modelTheme.bgCard,
    '--model-user-bubble': theme === 'dark' ? modelTheme.userBubbleDark : modelTheme.userBubble,
    '--model-accent': theme === 'dark' ? modelTheme.accentDark : modelTheme.accent,
  }

  return (
    <div className={`single-model-page theme-${modelKey}`} style={themeStyles}>
      {/* Header */}
      <header className="single-model-header-bar">
        <Link to="/" className="single-model-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="single-model-title">
          <img
            src={iconSrc}
            alt={model.name}
            className={`single-model-icon ${model.darkLogo ? 'dark-logo' : ''}`}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <ModelDropdown modelKey={modelKey} model={model} />
        </div>

        {/* Thinking toggle */}
        {supportsThinking && (
          <button
            className={`single-model-thinking-btn ${thinkingMode ? 'active' : ''}`}
            onClick={toggleThinking}
            title={thinkingMode ? 'Disable thinking' : 'Enable thinking'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>Think</span>
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="single-model-messages">
        {messages.length === 0 && !currentResponse && !isLoading ? (
          <div className="single-model-welcome">
            {/* Logo with model name for Grok/Perplexity style */}
            <div className="single-model-welcome-logo">
              <img
                src={iconSrc}
                alt={variantName}
                className={`single-model-welcome-icon ${model.darkLogo ? 'dark-logo' : ''}`}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              {(modelKey === 'grok' || modelKey === 'perplexity') && (
                <span className="single-model-welcome-name">{model.name}</span>
              )}
            </div>
            {modelTheme.welcomeText && <h2>{modelTheme.welcomeText}</h2>}
          </div>
        ) : (
          <div className="single-model-messages-list">
            {messages.filter(m => !m.isStreaming).map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                model={model}
                iconSrc={iconSrc}
              />
            ))}
            {/* Loading skeleton */}
            {isLoading && !currentResponse && !thinkingContent && (
              <LoadingSkeleton model={model} iconSrc={iconSrc} />
            )}
            {/* Current streaming response */}
            {(currentResponse || thinkingContent) && (
              <MessageBubble
                message={{
                  role: 'assistant',
                  content: currentResponse,
                  thinking: thinkingContent
                }}
                model={model}
                iconSrc={iconSrc}
                isStreaming={true}
                thinkingTime={thinkingTime}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="single-model-input-area">
        <div className="single-model-input-container">
          {/* Attach button - Grok style */}
          {modelKey === 'grok' && (
            <button className="single-model-attach-btn" title="Attach">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
          )}

          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={thinkingMode ? `Ask ${variantName} to think deeply...` : modelTheme.placeholder}
            rows={1}
            disabled={isGenerating}
          />

          {/* Model selector for Grok */}
          {modelKey === 'grok' && (
            <div className="single-model-selector">
              <ModelDropdown modelKey={modelKey} model={model} />
            </div>
          )}

          <button
            className={`single-model-send-btn ${isGenerating ? 'stop' : ''}`}
            onClick={isGenerating ? handleStop : handleSend}
            disabled={!message.trim() && !isGenerating}
          >
            {isGenerating ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H7l5-6v4h4l-5 6z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton component
const LoadingSkeleton = memo(({ model, iconSrc }) => (
  <motion.div
    className="single-model-message assistant"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="single-model-message-icon">
      <img
        src={iconSrc}
        alt={model.name}
        className={model.darkLogo ? 'dark-logo' : ''}
        onError={(e) => { e.target.style.display = 'none' }}
      />
    </div>
    <div className="single-model-message-content">
      <div className="skeleton">
        <div className="skeleton-line" style={{ width: '90%' }} />
        <div className="skeleton-line" style={{ width: '75%' }} />
        <div className="skeleton-line" style={{ width: '60%' }} />
      </div>
    </div>
  </motion.div>
))

// Thinking section component
const ThinkingSection = memo(({ thinking, isActive, thinkingTime }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!thinking) return null

  return (
    <div className={`thinking-section ${isActive ? 'active' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button className="thinking-toggle" onClick={() => setIsExpanded(!isExpanded)}>
        <svg className="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span>
          {isActive ? (
            <>
              <svg className="thinking-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Thinking...
            </>
          ) : (
            <>Thought for {thinkingTime || 'a moment'}</>
          )}
        </span>
      </button>
      {isExpanded && (
        <div className="thinking-content">
          <MarkdownRenderer content={thinking} />
        </div>
      )}
    </div>
  )
})

// Message bubble component
const MessageBubble = memo(({ message, model, iconSrc, isStreaming, thinkingTime }) => {
  const isUser = message.role === 'user'

  return (
    <motion.div
      className={`single-model-message ${isUser ? 'user' : 'assistant'} ${message.error ? 'error' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {!isUser && (
        <div className="single-model-message-icon">
          <img
            src={iconSrc}
            alt={model.name}
            className={model.darkLogo ? 'dark-logo' : ''}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      )}

      <div className="single-model-message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <>
            {/* Thinking section */}
            {message.thinking && (
              <ThinkingSection
                thinking={message.thinking}
                isActive={isStreaming && !message.content}
                thinkingTime={message.thinkingTime || thinkingTime}
              />
            )}

            {/* Main content */}
            {message.content ? (
              <>
                <MarkdownRenderer content={message.content} />
                {isStreaming && (
                  <span className="typing-cursor">▊</span>
                )}
              </>
            ) : isStreaming && !message.thinking ? (
              <div className="generating-status">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            ) : null}

            {/* Stopped indicator */}
            {message.stopped && (
              <div className="stopped-indicator">Generation stopped</div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
})

export default memo(SingleModelChat)
