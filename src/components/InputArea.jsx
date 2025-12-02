import { memo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import { sendToAllModels, generateChatTitle } from '../utils/api'

function InputArea() {
  const [message, setMessage] = useState('')
  const {
    activeModels,
    models,
    isGenerating,
    chats,
    currentChatId,
    getCurrentChat,
    createChat,
    addMessage,
    updateResponse,
    updateChatTitle,
    setGenerating,
    setAbortControllers,
    stopGenerating
  } = useStore()

  const handleSend = useCallback(async () => {
    if (!message.trim() || activeModels.length === 0) return

    const text = message.trim()
    setMessage('')
    setGenerating(true)

    let chat = getCurrentChat()
    if (!chat) {
      chat = createChat()
    }

    const msgIndex = chat.messages.length
    addMessage({ role: 'user', content: text })

    // Get updated chat after adding message
    const updatedChat = useStore.getState().chats.find(c => c.id === chat.id)
    
    const controllers = activeModels.map(() => new AbortController())
    setAbortControllers(controllers)

    await sendToAllModels({
      activeModels,
      models,
      messages: updatedChat.messages,
      responses: updatedChat.responses || {},
      controllers,
      onUpdate: (modelKey, response) => {
        updateResponse(modelKey, msgIndex, response)
      }
    })

    setGenerating(false)
    setAbortControllers([])

    // Generate title if needed
    const finalChat = useStore.getState().chats.find(c => c.id === chat.id)
    if (finalChat && !finalChat.title && finalChat.messages.length >= 1) {
      const title = await generateChatTitle(finalChat.messages)
      if (title) {
        updateChatTitle(finalChat.id, title)
      }
    }
  }, [message, activeModels, models, getCurrentChat, createChat, addMessage, updateResponse, updateChatTitle, setGenerating, setAbortControllers])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isGenerating) {
        stopGenerating()
      } else {
        handleSend()
      }
    }
  }, [isGenerating, handleSend, stopGenerating])

  return (
    <div className="input-area">
      <div className="input-container">
        <input
          type="text"
          className="message-input"
          placeholder="Ask me anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="input-actions">
          <motion.button
            className={`send-btn ${isGenerating ? 'generating' : ''}`}
            onClick={isGenerating ? stopGenerating : handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isGenerating ? 'Stop generating' : 'Send message'}
          >
            {isGenerating ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default memo(InputArea)
