import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { DEFAULT_AVATARS } from '../data/avatars'
import MarkdownRenderer from './MarkdownRenderer'

// Avatar Chat - ChatGPT-like dedicated chat interface
function AvatarChat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  
  const {
    theme,
    customAvatars,
    avatarChats,
    createAvatarChat,
    addAvatarMessage,
    updateAvatarResponse,
    getAvatarChat
  } = useStore()

  // Get current chat and avatar
  const chat = getAvatarChat(chatId)
  const allAvatars = [...DEFAULT_AVATARS, ...customAvatars]
  const avatar = chat ? allAvatars.find(a => a.id === chat.avatarId) : null

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [chatId])

  // Stream response from Claude Sonnet 4.5
  const streamResponse = useCallback(async (userMessage, chatData) => {
    if (!avatar) return
    
    setIsStreaming(true)
    abortControllerRef.current = new AbortController()
    
    const API_URL = 'https://unifiedapi.vercel.app/v1/chat/completions'
    const API_KEY = 'sk-0000d80ad3c542d29120527e66963a2e'
    
    // Build conversation history
    const messages = [
      { role: 'system', content: avatar.systemPrompt },
      ...chatData.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ]

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openrouter:anthropic/claude-sonnet-4.5',
          messages,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

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
              const delta = data.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                updateAvatarResponse(chatData.id, fullContent, true)
              }
            } catch (e) {
              // JSON parse error, skip
            }
          }
        }
      }

      updateAvatarResponse(chatData.id, fullContent, false)
    } catch (error) {
      if (error.name !== 'AbortError') {
        updateAvatarResponse(chatData.id, `Error: ${error.message}`, false)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [avatar, updateAvatarResponse])

  // Send message
  const handleSend = useCallback(async () => {
    if (!message.trim() || isStreaming || !avatar) return
    
    const userMessage = message.trim()
    setMessage('')
    
    let currentChat = chat
    if (!currentChat) {
      // Create new chat if doesn't exist
      currentChat = createAvatarChat(avatar.id)
      navigate(`/avatar/${currentChat.id}`, { replace: true })
    }
    
    // Add user message
    addAvatarMessage(currentChat.id, { role: 'user', content: userMessage })
    
    // Stream response
    const updatedChat = useStore.getState().getAvatarChat(currentChat.id)
    await streamResponse(userMessage, updatedChat)
  }, [message, isStreaming, avatar, chat, createAvatarChat, addAvatarMessage, navigate, streamResponse])

  // Stop generation
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }, [])

  // Handle key press
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isStreaming) {
        handleStop()
      } else {
        handleSend()
      }
    }
  }, [isStreaming, handleSend, handleStop])

  // If no avatar found, show selection
  if (!avatar && !chatId) {
    return <AvatarSelection />
  }

  // If chat not found with chatId, redirect to avatar selection
  if (chatId && !chat) {
    return <AvatarSelection />
  }

  return (
    <div className="avatar-chat-page">
      {/* Header */}
      <header className="avatar-chat-header">
        <Link to="/" className="avatar-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        
        <div className="avatar-chat-title">
          <div className="avatar-chat-icon">
            {avatar?.image ? (
              <img src={avatar.image} alt={avatar.name} />
            ) : (
              <span>{avatar?.emoji || '🤖'}</span>
            )}
          </div>
          <div className="avatar-chat-info">
            <h1>{avatar?.name}</h1>
          </div>
        </div>

        <button className="avatar-menu-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
            <circle cx="5" cy="12" r="1"/>
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div className="avatar-chat-messages">
        {(!chat?.messages || chat.messages.length === 0) ? (
          <div className="avatar-welcome">
            <div className="avatar-welcome-icon">
              {avatar?.image ? (
                <img src={avatar.image} alt={avatar.name} />
              ) : (
                <span>{avatar?.emoji || '🤖'}</span>
              )}
            </div>
            <h2>Chat with {avatar?.name}</h2>
            <p>{avatar?.description}</p>
            
            <div className="avatar-suggestions">
              <SuggestionChip 
                text={getSuggestion(avatar, 0)} 
                onClick={() => setMessage(getSuggestion(avatar, 0))}
              />
              <SuggestionChip 
                text={getSuggestion(avatar, 1)} 
                onClick={() => setMessage(getSuggestion(avatar, 1))}
              />
              <SuggestionChip 
                text={getSuggestion(avatar, 2)} 
                onClick={() => setMessage(getSuggestion(avatar, 2))}
              />
            </div>
          </div>
        ) : (
          <div className="avatar-messages-list">
            {chat.messages.map((msg, idx) => (
              <MessageBubble 
                key={idx} 
                message={msg} 
                avatar={avatar}
                isLast={idx === chat.messages.length - 1}
                isStreaming={isStreaming && idx === chat.messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="avatar-chat-input-area">
        <div className="avatar-input-container">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${avatar?.name}...`}
            rows={1}
            disabled={isStreaming}
          />
          
          <button 
            className={`avatar-send-btn ${isStreaming ? 'stop' : ''}`}
            onClick={isStreaming ? handleStop : handleSend}
            disabled={!message.trim() && !isStreaming}
          >
            {isStreaming ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>
        <p className="avatar-disclaimer">
          {avatar?.name} is powered by Claude Sonnet 4.5. Responses may not always be accurate.
        </p>
      </div>
    </div>
  )
}

// Message bubble component
const MessageBubble = memo(({ message, avatar, isLast, isStreaming }) => {
  const isUser = message.role === 'user'
  
  return (
    <motion.div 
      className={`avatar-message ${isUser ? 'user' : 'assistant'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {!isUser && (
        <div className="avatar-message-icon">
          {avatar?.image ? (
            <img src={avatar.image} alt={avatar.name} />
          ) : (
            <span>{avatar?.emoji || '🤖'}</span>
          )}
        </div>
      )}
      
      <div className="avatar-message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer content={message.content || ''} />
            {isStreaming && (
              <span className="typing-cursor">▊</span>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
})

// Suggestion chip
const SuggestionChip = memo(({ text, onClick }) => (
  <button className="avatar-suggestion-chip" onClick={onClick}>
    {text}
  </button>
))

// Get contextual suggestions based on avatar
function getSuggestion(avatar, index) {
  const suggestions = {
    einstein: [
      "Explain relativity in simple terms",
      "What inspired your greatest discoveries?",
      "How do you approach problem-solving?"
    ],
    socrates: [
      "What is the meaning of a good life?",
      "How can I become wiser?",
      "What questions should I ask myself?"
    ],
    cleopatra: [
      "How did you maintain power in Egypt?",
      "What was your relationship with Rome?",
      "Share your wisdom on leadership"
    ],
    'career-coach': [
      "How do I negotiate a higher salary?",
      "Help me prepare for an interview",
      "What skills should I develop?"
    ],
    'fitness-trainer': [
      "Create a beginner workout plan",
      "How do I build muscle effectively?",
      "What should I eat before workouts?"
    ],
    'financial-advisor': [
      "How should I start investing?",
      "Help me create a budget",
      "What's the best way to save money?"
    ],
    'creative-writer': [
      "Help me overcome writer's block",
      "How do I create compelling characters?",
      "Give me a story prompt"
    ],
    'art-director': [
      "What makes a good logo design?",
      "How do I choose a color palette?",
      "Critique my design approach"
    ],
    'code-mentor': [
      "Explain async/await in JavaScript",
      "What are best practices for clean code?",
      "Help me debug this problem"
    ],
    'data-scientist': [
      "How do I start with machine learning?",
      "Explain regression vs classification",
      "What tools should I learn?"
    ],
    therapist: [
      "I'm feeling overwhelmed lately",
      "How can I manage stress better?",
      "Help me process my thoughts"
    ],
    'life-coach': [
      "How do I set achievable goals?",
      "I want to build better habits",
      "Help me find my purpose"
    ],
    storyteller: [
      "Tell me an epic fantasy adventure",
      "Create a mystery story for me",
      "Start an interactive sci-fi tale"
    ],
    chef: [
      "What should I cook for dinner tonight?",
      "Teach me a classic Italian recipe",
      "How do I improve my knife skills?"
    ],
    philosopher: [
      "What is the meaning of happiness?",
      "Is free will an illusion?",
      "How should I live a good life?"
    ],
    'language-tutor': [
      "Help me practice Spanish conversation",
      "Teach me useful Japanese phrases",
      "How can I learn a language faster?"
    ],
    'startup-advisor': [
      "How do I validate my business idea?",
      "What should my MVP include?",
      "How do I find my first customers?"
    ]
  }
  
  const avatarSuggestions = suggestions[avatar?.id] || [
    "Tell me about yourself",
    "What can you help me with?",
    "Share some wisdom"
  ]
  
  return avatarSuggestions[index] || avatarSuggestions[0]
}

// Avatar Selection Page
export const AvatarSelection = memo(() => {
  const navigate = useNavigate()
  const { customAvatars, createAvatarChat, theme } = useStore()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const allAvatars = [...DEFAULT_AVATARS, ...customAvatars]
  
  const categories = [
    { id: 'all', name: 'All', emoji: '✨' },
    { id: 'historical', name: 'Historical', emoji: '🏛️' },
    { id: 'advisor', name: 'Advisors', emoji: '💼' },
    { id: 'creative', name: 'Creative', emoji: '🎨' },
    { id: 'technical', name: 'Technical', emoji: '💻' },
    { id: 'wellness', name: 'Wellness', emoji: '🌿' },
    { id: 'custom', name: 'My Avatars', emoji: '⭐' }
  ]
  
  const filteredAvatars = allAvatars.filter(avatar => {
    const matchesCategory = selectedCategory === 'all' || avatar.category === selectedCategory
    const matchesSearch = !searchQuery || 
      avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleSelectAvatar = (avatar) => {
    const chat = createAvatarChat(avatar.id)
    navigate(`/avatar/${chat.id}`)
  }

  return (
    <div className="avatar-selection-page">
      <header className="avatar-selection-header">
        <Link to="/" className="avatar-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1>Choose an Avatar</h1>
        <div className="avatar-header-spacer" />
      </header>

      {/* Search */}
      <div className="avatar-search-container">
        <div className="avatar-search-input">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search avatars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="avatar-categories-scroll">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`avatar-category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Avatar Grid */}
      <div className="avatar-grid">
        {filteredAvatars.map(avatar => (
          <motion.div
            key={avatar.id}
            className="avatar-card"
            onClick={() => handleSelectAvatar(avatar)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="avatar-card-image">
              {avatar.image ? (
                <img src={avatar.image} alt={avatar.name} />
              ) : (
                <span className="avatar-card-emoji">{avatar.emoji}</span>
              )}
            </div>
            <div className="avatar-card-content">
              <h3>{avatar.name}</h3>
              <p>{avatar.description}</p>
            </div>
            <div className="avatar-card-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredAvatars.length === 0 && (
        <div className="avatar-empty-state">
          <span>🔍</span>
          <p>No avatars found</p>
        </div>
      )}
    </div>
  )
})

export default memo(AvatarChat)
