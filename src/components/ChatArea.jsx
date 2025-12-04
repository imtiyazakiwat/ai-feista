import { memo, useRef, useEffect, forwardRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import Message from './Message'
import { CouncilResponse } from './council'
import ImageGenResponse from './ImageGenResponse'
import InputArea from './InputArea'
import ModelDropdown from './ModelDropdown'

// Explore Avatars Data
const EXPLORE_AVATARS = [
  {
    id: 'einstein',
    name: 'Albert Einstein',
    description: 'Revolutionized science, imagination beyond known limits.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg/220px-Einstein_1921_by_F_Schmutzer_-_restoration.jpg'
  },
  {
    id: 'career-coach',
    name: 'Career Coach',
    description: 'Assists in achieving career goals with guidance and planning.',
    image: null,
    emoji: '💼'
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Helps craft compelling stories and creative content.',
    image: null,
    emoji: '✍️'
  },
  {
    id: 'code-mentor',
    name: 'Code Mentor',
    description: 'Expert programming guidance and code review.',
    image: null,
    emoji: '👨‍💻'
  }
]

const WelcomeScreen = memo(({ councilMode, toggleCouncilMode }) => {
  return (
    <div className="welcome-screen">
      <div className="dotted-grid-bg"></div>
      
      <div className="welcome-content">
        {/* Mode Toggle Pills */}
        <div className="mode-toggle-pills">
          <button 
            className={`mode-pill ${!councilMode ? 'active' : ''}`}
            onClick={() => councilMode && toggleCouncilMode()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>Multi-Chat</span>
          </button>
          <button 
            className={`mode-pill super-fiesta ${councilMode ? 'active' : ''}`}
            onClick={() => !councilMode && toggleCouncilMode()}
          >
            <span className="mode-pill-icon">🏛️</span>
            <span>LLM Council</span>
          </button>
        </div>
        
        {/* Input Area - centered below mode toggle */}
        <InputArea />
      </div>
      
      {/* Explore Section - positioned at bottom */}
      <div className="explore-section">
        <div className="explore-header">
          <h3>Explore</h3>
          <button className="see-more-btn">
            See more
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        <div className="explore-cards">
          {EXPLORE_AVATARS.map(avatar => (
            <div key={avatar.id} className="explore-card">
              <div className="explore-avatar">
                {avatar.image ? (
                  <img src={avatar.image} alt={avatar.name} />
                ) : (
                  <span className="explore-avatar-emoji">{avatar.emoji}</span>
                )}
              </div>
              <div className="explore-info">
                <h4>{avatar.name}</h4>
                <p>{avatar.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

const ChatColumn = memo(forwardRef(({ modelKey, model, messages, responses, width, onResizeStart, isActive, onToggle }, ref) => {
  const contentRef = useRef(null)
  const isUserScrolledUp = useRef(false)
  const lastScrollTop = useRef(0)
  const { theme } = useStore()

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

  const handleExternalOpen = () => {
    if (model.url) {
      window.open(model.url, '_blank')
    }
  }

  // Get theme-aware icon
  const iconSrc = theme === 'dark' && model.iconDark ? model.iconDark : model.icon

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
      {/* Column Header - AI Fiesta Style */}
      <div className="column-header">
        <img
          src={iconSrc}
          alt={model.name}
          className={`column-icon ${model.darkLogo ? 'dark-logo' : ''}`}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <ModelDropdown modelKey={modelKey} model={model} />
        <button className="column-external" onClick={handleExternalOpen} title="Open in new tab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </button>
        <div 
          className={`column-toggle ${isActive ? 'active' : ''}`}
          onClick={onToggle}
        />
      </div>
      <div className="column-content" ref={contentRef} onScroll={handleScroll}>
        {/* Dotted grid background */}
        <div className="column-grid-bg"></div>
        {messages.map((msg, idx) => (
          msg.role === 'user' && (
            <Message
              key={`${modelKey}-${idx}`}
              message={msg}
              response={responses?.[modelKey]?.[idx]}
              model={model}
              modelKey={modelKey}
              index={idx}
              isLatestMessage={idx === messages.length - 1}
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

const CouncilChatView = memo(({ messages, councilResponses }) => {
  const contentRef = useRef(null)
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [messages, councilResponses])

  return (
    <div className="council-chat-view">
      <div className="council-chat-header">
        <span className="council-chat-icon">🏛️</span>
        <span className="council-chat-title">LLM Council</span>
        <span className="council-beta-tag">BETA</span>
      </div>
      <div className="council-chat-content" ref={contentRef}>
        {messages.map((msg, idx) => (
          msg.role === 'user' && (
            <div key={idx} className="council-message-group">
              <div className="council-user-message">
                <div className="user-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="user-message-content">{msg.content}</div>
              </div>
              {(msg.councilMode && councilResponses?.[idx]) && (
                <CouncilResponse councilData={councilResponses[idx]} />
              )}
            </div>
          )
        ))}
      </div>
    </div>
  )
})

const ImageGenChatView = memo(({ messages, imageResponses }) => {
  const contentRef = useRef(null)
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [messages, imageResponses])

  return (
    <div className="image-gen-chat-view">
      <div className="image-gen-chat-header">
        <span className="image-gen-chat-icon">🎨</span>
        <span className="image-gen-chat-title">Image Generation</span>
      </div>
      <div className="image-gen-chat-content" ref={contentRef}>
        {messages.map((msg, idx) => (
          msg.role === 'user' && msg.isImageGeneration && (
            <ImageGenResponse 
              key={idx}
              message={msg}
              imageData={imageResponses?.[idx]}
            />
          )
        ))}
      </div>
    </div>
  )
})

function ChatArea() {
  const { models, activeModels, toggleModel, getCurrentChat, councilMode, toggleCouncilMode } = useStore()
  const chat = getCurrentChat()
  const hasMessages = chat?.messages?.length > 0
  const hasCouncilMessages = chat?.messages?.some(m => m.councilMode)
  const hasImageGenMessages = chat?.messages?.some(m => m.isImageGeneration)
  
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

  const showCouncilView = hasCouncilMessages || councilMode
  const showImageGenView = hasImageGenMessages && !showCouncilView

  return (
    <div className="chat-columns-container">
      <AnimatePresence mode="wait">
        {!hasMessages ? (
          <WelcomeScreen 
            key="welcome" 
            councilMode={councilMode}
            toggleCouncilMode={toggleCouncilMode}
          />
        ) : showImageGenView ? (
          <motion.div
            key="imagegen"
            className="chat-columns image-gen-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ImageGenChatView 
              messages={chat.messages} 
              imageResponses={chat.imageResponses}
            />
          </motion.div>
        ) : showCouncilView ? (
          <motion.div
            key="council"
            className="chat-columns council-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CouncilChatView 
              messages={chat.messages} 
              councilResponses={chat.councilResponses}
            />
          </motion.div>
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
                  isActive={true}
                  onToggle={() => toggleModel(modelKey)}
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
