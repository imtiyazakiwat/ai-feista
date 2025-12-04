
import { memo, useState, Suspense, lazy, forwardRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import { regenerateSingleModel } from '../utils/api'

// Lazy load heavy markdown dependencies
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))

const Skeleton = () => (
  <div className="skeleton">
    <div className="skeleton-line" />
    <div className="skeleton-line" />
    <div className="skeleton-line" />
  </div>
)

const GeneratingStatus = () => (
  <div className="generating-status">
    <span className="dot" />
    <span className="dot" />
    <span className="dot" />
    <span>Generating response...</span>
  </div>
)

const CopyButton = memo(({ content }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content])

  return (
    <button 
      className={`copy-btn ${copied ? 'copied' : ''}`} 
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy response'}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      )}
    </button>
  )
})

const RegenerateButton = memo(({ modelKey, model, index, disabled }) => {
  const [regenerating, setRegenerating] = useState(false)
  const { getCurrentChat, updateResponse, clearResponse, models, getModelId } = useStore()

  const handleRegenerate = useCallback(async () => {
    if (regenerating || disabled) return
    
    const chat = getCurrentChat()
    if (!chat) return
    
    setRegenerating(true)
    clearResponse(modelKey, index)
    
    try {
      await regenerateSingleModel({
        modelKey,
        model: models[modelKey],
        modelId: getModelId(modelKey),
        messages: chat.messages,
        responses: chat.responses || {},
        onUpdate: (key, response) => {
          updateResponse(key, index, response)
        }
      })
    } finally {
      setRegenerating(false)
    }
  }, [modelKey, model, index, regenerating, disabled, getCurrentChat, updateResponse, clearResponse, models, getModelId])

  return (
    <button 
      className={`regenerate-btn ${regenerating ? 'regenerating' : ''}`}
      onClick={handleRegenerate}
      disabled={regenerating || disabled}
      title="Regenerate response"
    >
      {regenerating ? (
        <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
      )}
    </button>
  )
})

const FeedbackButtons = memo(() => {
  const [feedback, setFeedback] = useState(null)

  return (
    <>
      <button 
        className={`feedback-btn ${feedback === 'like' ? 'liked' : ''}`}
        onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
        title="Good response"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      </button>
      <button 
        className={`feedback-btn ${feedback === 'dislike' ? 'disliked' : ''}`}
        onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
        title="Bad response"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
      </button>
    </>
  )
})

const ThinkingSection = memo(({ thinking, thinkingTime, isStreaming, hasContent }) => {
  const [manualExpanded, setManualExpanded] = useState(null)
  
  if (!thinking) return null

  const isThinkingPhase = isStreaming && !hasContent
  const isExpanded = manualExpanded !== null ? manualExpanded : isThinkingPhase
  const displayTime = thinkingTime || (thinking ? '<1s' : 'a moment')

  return (
    <div className={`thinking-section ${isExpanded ? 'expanded' : 'collapsed'} ${isThinkingPhase ? 'active' : ''}`}>
      {isThinkingPhase ? (
        <div className="thinking-header">
          <svg className="thinking-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>Thinking...</span>
        </div>
      ) : (
        <button className="thinking-toggle" onClick={() => setManualExpanded(!isExpanded)}>
          <svg className="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <span>Thought for {displayTime}</span>
        </button>
      )}
      <div className="thinking-content">
        <Suspense fallback={<div style={{ whiteSpace: 'pre-wrap' }}>{thinking}</div>}>
          <MarkdownRenderer content={thinking} />
        </Suspense>
      </div>
    </div>
  )
})

const ImagePreview = memo(({ images }) => {
  if (!images || images.length === 0) return null
  
  return (
    <div className="message-images">
      {images.map((url, idx) => (
        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="message-image">
          <img src={url} alt={`Attached ${idx + 1}`} />
        </a>
      ))}
    </div>
  )
})

const FilePreview = memo(({ files }) => {
  if (!files || files.length === 0) return null
  
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'csv': return '📊'
      case 'text': return '📝'
      default: return '📎'
    }
  }
  
  return (
    <div className="message-files">
      {files.map((file, idx) => (
        <div key={idx} className="message-file">
          <span className="file-icon">{getFileIcon(file.type)}</span>
          <span className="file-name">{file.name}</span>
        </div>
      ))}
    </div>
  )
})

const Message = memo(forwardRef(({ message, response, model, index, modelKey, isLatestMessage }, ref) => {
  const { isGenerating, theme } = useStore()
  // Only show loading if currently generating AND this is the latest message AND no response yet
  const isLoading = !response && isGenerating && isLatestMessage
  // Show "no response" for past messages that have no response (model was off)
  const noResponse = !response && (!isGenerating || !isLatestMessage)
  const hasError = response?.error
  const isStreaming = response?.isStreaming
  const hasContent = response?.content && response.content.length > 0
  const isUnsupported = response?.unsupported
  const isThinkingModeEnabled = message?.thinkingMode
  
  // Get theme-aware icon
  const iconSrc = theme === 'dark' && model.iconDark ? model.iconDark : model.icon
  
  // Early return for no response case to prevent accessing undefined response
  if (noResponse) {
    return (
      <motion.div
        ref={ref}
        className="message"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.3) }}
      >
        <div className="message-user">
          <div className="user-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div className="user-message-content">
            {message.content}
            <ImagePreview images={message.images} />
            <FilePreview files={message.files} />
          </div>
        </div>
        <div className="message-assistant">
          <div className="assistant-response">
            <img
              src={iconSrc}
              alt={model.name}
              className={`assistant-icon ${model.darkLogo ? 'dark-logo' : ''}`}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="assistant-content-wrapper">
              <div className="assistant-content unsupported">
                Model was not active for this message.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className="message"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.3) }}
    >
      <div className="message-user">
        <div className="user-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div className="user-message-content">
          {message.content}
          <ImagePreview images={message.images} />
          <FilePreview files={message.files} />
        </div>
      </div>

      <div className="message-assistant">
        <div className="assistant-response">
          <img
            src={iconSrc}
            alt={model.name}
            className={`assistant-icon ${model.darkLogo ? 'dark-logo' : ''}`}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="assistant-content-wrapper">
            {isLoading ? (
              <>
                <Skeleton />
                <GeneratingStatus />
              </>
            ) : hasError ? (
              <div className="assistant-content error">{response.error}</div>
            ) : isUnsupported ? (
              <div className="assistant-content unsupported">{response.content}</div>
            ) : (
              <>
                {(isThinkingModeEnabled || response.thinking) && (
                  <ThinkingSection
                    thinking={response.thinking}
                    thinkingTime={response.thinkingTime}
                    isStreaming={isStreaming}
                    hasContent={hasContent}
                  />
                )}
                {(hasContent || !isStreaming) && (
                  <motion.div
                    className="assistant-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Suspense fallback={<div>{response.content}</div>}>
                      <MarkdownRenderer content={response.content || ''} />
                    </Suspense>
                  </motion.div>
                )}
                {isStreaming && hasContent && (
                  <GeneratingStatus />
                )}
                {!isStreaming && hasContent && (
                  <div className="message-actions">
                    <CopyButton content={response.content} />
                    <FeedbackButtons />
                    <RegenerateButton 
                      modelKey={modelKey} 
                      model={model} 
                      index={index}
                      disabled={isGenerating}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}))

export default Message
