import { memo, useRef, useEffect, forwardRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import Message from './Message'

const WelcomeScreen = memo(() => (
  <motion.div
    className="welcome-screen"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <div className="welcome-content">
      <motion.div
        className="welcome-icon"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        🎉
      </motion.div>
      <h1>Welcome to AI Fiesta</h1>
      <p>Compare responses from multiple AI models side by side</p>
    </div>
  </motion.div>
))

const ChatColumn = memo(forwardRef(({ modelKey, model, messages, responses, width, onResizeStart }, ref) => {
  const contentRef = useRef(null)
  const isUserScrolledUp = useRef(false)
  const lastScrollTop = useRef(0)

  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    
    if (el.scrollTop < lastScrollTop.current && !isAtBottom) {
      isUserScrolledUp.current = true
    }
    
    if (isAtBottom) {
      isUserScrolledUp.current = false
    }
    
    lastScrollTop.current = el.scrollTop
  }, [])

  useEffect(() => {
    if (contentRef.current && !isUserScrolledUp.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [messages, responses])

  useEffect(() => {
    isUserScrolledUp.current = false
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [messages.length])

  return (
    <motion.div
      ref={ref}
      className="chat-column"
      style={{ width: width ? `${width}px` : undefined, flex: width ? 'none' : 1 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="column-header">
        <img
          src={model.icon}
          alt={model.name}
          className={`column-icon ${model.darkLogo ? 'dark-logo' : ''}`}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <span className="column-name">{model.name}</span>
      </div>
      <div className="column-content" ref={contentRef} onScroll={handleScroll}>
        {messages.map((msg, idx) => (
          msg.role === 'user' && (
            <Message
              key={`${modelKey}-${idx}`}
              message={msg}
              response={responses?.[modelKey]?.[idx]}
              model={model}
              index={idx}
            />
          )
        ))}
      </div>
      <div 
        className="column-resize-handle"
        onMouseDown={(e) => onResizeStart(e, modelKey)}
      />
    </motion.div>
  )
}))

function ChatArea() {
  const { models, activeModels, getCurrentChat } = useStore()
  const chat = getCurrentChat()
  const hasMessages = chat?.messages?.length > 0
  
  const [columnWidths, setColumnWidths] = useState({})
  const containerRef = useRef(null)
  const resizingRef = useRef(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const nextColumnStartWidthRef = useRef(0)
  const nextColumnKeyRef = useRef(null)

  useEffect(() => {
    setColumnWidths({})
  }, [activeModels.length])

  const handleResizeStart = useCallback((e, modelKey) => {
    e.preventDefault()
    resizingRef.current = modelKey
    startXRef.current = e.clientX
    
    const columnIndex = activeModels.indexOf(modelKey)
    const columns = containerRef.current?.querySelectorAll('.chat-column')
    
    if (columns && columns[columnIndex]) {
      startWidthRef.current = columns[columnIndex].offsetWidth
      
      if (columnIndex < activeModels.length - 1) {
        nextColumnKeyRef.current = activeModels[columnIndex + 1]
        nextColumnStartWidthRef.current = columns[columnIndex + 1].offsetWidth
      } else {
        nextColumnKeyRef.current = null
        nextColumnStartWidthRef.current = 0
      }
    }
    
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [activeModels])

  const handleResizeMove = useCallback((e) => {
    if (!resizingRef.current) return
    
    const delta = e.clientX - startXRef.current
    const minWidth = 300
    
    const newWidth = Math.max(minWidth, startWidthRef.current + delta)
    
    if (nextColumnKeyRef.current && nextColumnStartWidthRef.current) {
      const nextNewWidth = Math.max(minWidth, nextColumnStartWidthRef.current - delta)
      
      if (newWidth >= minWidth && nextNewWidth >= minWidth) {
        setColumnWidths(prev => ({
          ...prev,
          [resizingRef.current]: newWidth,
          [nextColumnKeyRef.current]: nextNewWidth
        }))
      }
    } else {
      setColumnWidths(prev => ({
        ...prev,
        [resizingRef.current]: newWidth
      }))
    }
  }, [])

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = null
    nextColumnKeyRef.current = null
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleResizeMove])

  return (
    <div className="chat-columns-container">
      <AnimatePresence mode="wait">
        {!hasMessages ? (
          <WelcomeScreen key="welcome" />
        ) : (
          <motion.div
            key="chat"
            className="chat-columns"
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {activeModels.map((modelKey) => {
              const model = models[modelKey]
              if (!model) return null
              return (
                <ChatColumn
                  key={modelKey}
                  modelKey={modelKey}
                  model={model}
                  messages={chat.messages}
                  responses={chat.responses}
                  width={columnWidths[modelKey]}
                  onResizeStart={handleResizeStart}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(ChatArea)
