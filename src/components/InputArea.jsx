import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { sendToAllModels, generateChatTitle, uploadImage, enhancePrompt, processFile, FILE_ACCEPT } from '../utils/api'
import { runCouncil } from '../utils/councilApi'

function InputArea() {
  const [message, setMessage] = useState('')
  const [images, setImages] = useState([])
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [thinkingMode, setThinkingMode] = useState(false)
  const [imageGenMode, setImageGenMode] = useState(false)
  const imageInputRef = useRef(null)
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
    stopGenerating,
    councilMode,
    toggleCouncilMode,
    updateCouncilResponse
  } = useStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createChat()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && isGenerating) {
        stopGenerating()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createChat, isGenerating, stopGenerating])

  const handleImageUpload = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return
    
    setUploading(true)
    try {
      const uploadPromises = Array.from(fileList).slice(0, 4).map(file => uploadImage(file))
      const urls = await Promise.all(uploadPromises)
      setImages(prev => [...prev, ...urls].slice(0, 4))
    } catch (error) {
      console.error('Image upload failed:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFileUpload = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return
    
    setUploading(true)
    try {
      const processPromises = Array.from(fileList).slice(0, 3).map(file => processFile(file))
      const processed = await Promise.all(processPromises)
      setFiles(prev => [...prev, ...processed].slice(0, 3))
    } catch (error) {
      console.error('File processing failed:', error)
      alert(error.message || 'Failed to process file. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleImageChange = useCallback((e) => {
    handleImageUpload(e.target.files)
    e.target.value = ''
  }, [handleImageUpload])

  const handleFileChange = useCallback((e) => {
    handleFileUpload(e.target.files)
    e.target.value = ''
  }, [handleFileUpload])

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

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSend = useCallback(async () => {
    if ((!message.trim() && images.length === 0 && files.length === 0) || activeModels.length === 0) return

    const text = message.trim() || (images.length > 0 ? 'What is in this image?' : 'Analyze this file')
    const currentImages = [...images]
    const currentFiles = [...files]
    const currentThinkingMode = thinkingMode
    const currentImageGenMode = imageGenMode
    const currentCouncilMode = councilMode
    setMessage('')
    setImages([])
    setFiles([])
    setGenerating(true)

    let chat = getCurrentChat()
    if (!chat) {
      chat = createChat()
    }

    const msgIndex = chat.messages.length
    addMessage({ 
      role: 'user', 
      content: text, 
      images: currentImages.length > 0 ? currentImages : undefined,
      files: currentFiles.length > 0 ? currentFiles : undefined,
      thinkingMode: currentThinkingMode,
      imageGenMode: currentImageGenMode,
      councilMode: currentCouncilMode
    })

    const updatedChat = useStore.getState().chats.find(c => c.id === chat.id)

    // Council mode - run the 3-stage council process
    if (currentCouncilMode) {
      // Initialize council response with loading state
      updateCouncilResponse(msgIndex, {
        loading: { stage1: true, stage2: false, stage3: false },
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null
      })

      await runCouncil(text, (progress) => {
        const currentData = useStore.getState().chats.find(c => c.id === chat.id)?.councilResponses?.[msgIndex] || {}
        
        if (progress.status === 'start') {
          updateCouncilResponse(msgIndex, {
            ...currentData,
            loading: {
              ...currentData.loading,
              [`stage${progress.stage}`]: true
            }
          })
        } else if (progress.status === 'complete') {
          const newData = {
            ...currentData,
            loading: {
              ...currentData.loading,
              [`stage${progress.stage}`]: false,
              [`stage${progress.stage + 1}`]: progress.stage < 3
            },
            [`stage${progress.stage}`]: progress.data
          }
          if (progress.metadata) {
            newData.metadata = { ...currentData.metadata, ...progress.metadata }
          }
          updateCouncilResponse(msgIndex, newData)
        }
      })

      setGenerating(false)
    } else {
      // Normal mode - send to all models
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
    }

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
  }, [message, images, files, thinkingMode, imageGenMode, councilMode, activeModels, models, getCurrentChat, createChat, addMessage, updateResponse, updateChatTitle, setGenerating, setAbortControllers, updateCouncilResponse])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isGenerating) {
        stopGenerating()
      } else {
        handleSend()
      }
    }
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

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf':
        return '📄'
      case 'csv':
        return '📊'
      case 'text':
        return '📝'
      default:
        return '📎'
    }
  }

  return (
    <div className="input-area">
      <AnimatePresence>
        {(images.length > 0 || files.length > 0) && (
          <motion.div 
            className="attachments-preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {images.map((url, idx) => (
              <div key={`img-${idx}`} className="image-preview">
                <img src={url} alt={`Upload ${idx + 1}`} />
                <button className="remove-attachment" onClick={() => removeImage(idx)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
            {files.map((file, idx) => (
              <div key={`file-${idx}`} className="file-preview">
                <span className="file-icon">{getFileIcon(file.type)}</span>
                <span className="file-name">{file.name}</span>
                <button className="remove-attachment" onClick={() => removeFile(idx)}>
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
          ref={imageInputRef}
          onChange={handleImageChange}
          accept="image/*"
          multiple
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={FILE_ACCEPT}
          multiple
          style={{ display: 'none' }}
        />
        
        <motion.button
          className="attach-btn"
          onClick={() => imageInputRef.current?.click()}
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

        <motion.button
          className="attach-btn file-btn"
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={uploading}
          title="Attach file (PDF, TXT, CSV)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </motion.button>
        
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder={imageGenMode ? "Describe the image you want to generate..." : "Ask me anything... (Ctrl+/ to focus)"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          autoComplete="off"
        />
        <div className="input-actions">
          <motion.button
            className={`mode-btn council-btn ${councilMode ? 'active' : ''}`}
            onClick={toggleCouncilMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Council mode (BETA) - Get consensus from multiple LLMs"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {councilMode && <span className="beta-dot" />}
          </motion.button>
          <motion.button
            className={`mode-btn ${thinkingMode ? 'active' : ''}`}
            onClick={() => setThinkingMode(!thinkingMode)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Thinking mode - Enable deep reasoning"
            disabled={councilMode}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </motion.button>
          <motion.button
            className={`mode-btn ${imageGenMode ? 'active' : ''}`}
            onClick={() => setImageGenMode(!imageGenMode)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Image generation mode"
            disabled={councilMode}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
              <path d="M12 12l3-3"/>
            </svg>
          </motion.button>
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
