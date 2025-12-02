import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { sendToAllModels, generateChatTitle, uploadImage, enhancePrompt } from '../utils/api'

function InputArea() {
  const [message, setMessage] = useState('')
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const {
    activeModels,
    models,
    isGenerating,
    getCurrentChat,
    createChat,
    addMessage,
    updateResponse,
    updateChatTitle,
    setGenerating,
    setAbortControllers,
    stopGenerating
  } = useStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K = Focus search (handled in Sidebar)
      // Ctrl/Cmd + N = New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createChat()
      }
      // Ctrl/Cmd + / = Focus input
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      // Escape = Stop generating
      if (e.key === 'Escape' && isGenerating) {
        stopGenerating()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createChat, isGenerating, stopGenerating])

  const handleImageUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    try {
      const uploadPromises = Array.from(files).slice(0, 4).map(file => uploadImage(file))
      const urls = await Promise.all(uploadPromises)
      setImages(prev => [...prev, ...urls].slice(0, 4))
    } catch (error) {
      console.error('Image upload failed:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFileChange = useCallback((e) => {
    handleImageUpload(e.target.files)
    e.target.value = ''
  }, [handleImageUpload])

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    const imageFiles = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      handleImageUpload(imageFiles)
    }
  }, [handleImageUpload])

  const removeImage = useCallback((index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSend = useCallback(async () => {
    if ((!message.trim() && images.length === 0) || activeModels.length === 0) return

    const text = message.trim() || 'What is in this image?'
    const currentImages = [...images]
    setMessage('')
    setImages([])
    setGenerating(true)

    let chat = getCurrentChat()
    if (!chat) {
      chat = createChat()
    }

    const msgIndex = chat.messages.length
    addMessage({ role: 'user', content: text, images: currentImages.length > 0 ? currentImages : undefined })

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

    const finalChat = useStore.getState().chats.find(c => c.id === chat.id)
    if (finalChat && finalChat.messages.length >= 1) {
      const needsTitle = !finalChat.title || 
        (finalChat.title === 'New Conversation' && finalChat.messages.length >= 2)
      
      if (needsTitle) {
        const title = await generateChatTitle(finalChat.messages, finalChat.title)
        if (title && title !== finalChat.title) {
          updateChatTitle(finalChat.id, title)
        }
      }
    }
  }, [message, images, activeModels, models, getCurrentChat, createChat, addMessage, updateResponse, updateChatTitle, setGenerating, setAbortControllers])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isGenerating) {
        stopGenerating()
      } else {
        handleSend()
      }
    }
    // Ctrl+E = Enhance prompt
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault()
      handleEnhance()
    }
  }, [isGenerating, handleSend, stopGenerating])

  const handleEnhance = useCallback(async () => {
    if (!message.trim() || enhancing) return
    
    setEnhancing(true)
    try {
      const enhanced = await enhancePrompt(message.trim())
      if (enhanced) {
        setMessage(enhanced)
      }
    } catch (error) {
      console.error('Failed to enhance prompt:', error)
    } finally {
      setEnhancing(false)
    }
  }, [message, enhancing])

  return (
    <div className="input-area">
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div 
            className="image-preview-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {images.map((url, idx) => (
              <div key={idx} className="image-preview">
                <img src={url} alt={`Upload ${idx + 1}`} />
                <button className="remove-image" onClick={() => removeImage(idx)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="input-container">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          style={{ display: 'none' }}
        />
        
        <motion.button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={uploading}
          title="Attach image (Ctrl+V to paste)"
        >
          {uploading ? (
            <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </motion.button>
        
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder="Ask me anything... (Ctrl+/ to focus)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          autoComplete="off"
        />
        <div className="input-actions">
          <motion.button
            className={`enhance-btn ${enhancing ? 'enhancing' : ''}`}
            onClick={handleEnhance}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!message.trim() || enhancing}
            title="Enhance prompt (Ctrl+E)"
          >
            {enhancing ? (
              <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            )}
          </motion.button>
          <motion.button
            className={`send-btn ${isGenerating ? 'generating' : ''}`}
            onClick={isGenerating ? stopGenerating : handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isGenerating ? 'Stop (Esc)' : 'Send (Enter)'}
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
      
      <div className="keyboard-hints">
        <span>Enter send</span>
        <span>Esc stop</span>
        <span>Ctrl+E enhance</span>
        <span>Ctrl+N new</span>
      </div>
    </div>
  )
}

export default memo(InputArea)
