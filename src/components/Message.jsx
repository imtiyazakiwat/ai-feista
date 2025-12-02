import { memo, useState, useEffect, Suspense, lazy, forwardRef } from 'react'
import { motion } from 'framer-motion'

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

const ThinkingSection = memo(({ thinking, thinkingTime, isStreaming, hasContent }) => {
  const [manualExpanded, setManualExpanded] = useState(null)
  
  if (!thinking) return null

  // Auto-expand while streaming thinking, collapse when done (unless manually toggled)
  const isThinkingPhase = isStreaming && !hasContent
  // Default to expanded if manually not set and we have thinking content
  const isExpanded = manualExpanded !== null ? manualExpanded : isThinkingPhase
  
  // Format thinking time - show "<1s" for very quick thinking
  const displayTime = thinkingTime || (thinking ? '<1s' : 'a moment')

  return (
    <div className={`thinking-section ${isExpanded ? 'expanded' : 'collapsed'} ${isThinkingPhase ? 'active' : ''}`}>
      {isThinkingPhase ? (
        // While actively thinking - show header with spinner
        <div className="thinking-header">
          <svg className="thinking-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>Thinking...</span>
        </div>
      ) : (
        // After thinking is done - show collapsible toggle
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

const Message = memo(forwardRef(({ message, response, model, index }, ref) => {
  const isLoading = !response
  const hasError = response?.error
  const isStreaming = response?.isStreaming
  const hasContent = response?.content && response.content.length > 0

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
        <div className="user-message-content">{message.content}</div>
      </div>

      <div className="message-assistant">
        <div className="assistant-response">
          <img
            src={model.icon}
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
            ) : (
              <>
                <ThinkingSection
                  thinking={response.thinking}
                  thinkingTime={response.thinkingTime}
                  isStreaming={isStreaming}
                  hasContent={hasContent}
                />
                {/* Show content area only when we have content or finished streaming */}
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
                {/* Show generating status while streaming content */}
                {isStreaming && hasContent && (
                  <GeneratingStatus />
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
