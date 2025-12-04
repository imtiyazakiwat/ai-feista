import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { sendToAllModels, generateChatTitle, uploadImage, enhancePrompt, processFile, FILE_ACCEPT, sendToAllModelsWithSearch } from '../utils/api'
import { runCouncil } from '../utils/councilApi'
import { generateImage, parseGenerateCommand, IMAGE_MODELS } from '../utils/imageApi'

function InputArea() {
  const [message, setMessage] = useState('')
  const [images, setImages] = useState([])
  const [files, setFiles] = useState([])
  const [enhancing, setEnhancing] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const plusMenuRef = useRef(null)
  const isSendingRef = useRef(false) // Prevent double sends
  
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
    imageGenMode,
    toggleImageGenMode,
    selectedImageModel,
    updateCouncilResponse,
    updateImageResponse,
    thinkingMode,
    toggleThinkingMode,
    webSearchMode,
    toggleWebSearchMode,
    updateWebSearchResponse,
    getModelId
  } = useStore()

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
        setShowPlusMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    try {
      const uploadPromises = Array.from(fileList).slice(0, 4).map(file => uploadImage(file))
      const urls = await Promise.all(uploadPromises)
      setImages(prev => [...prev, ...urls].slice(0, 4))
    } catch (error) {
      console.error('Image upload failed:', error)
      alert('Failed to upload image. Please try again.')
    }
  }, [])

  const handleFileUpload = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return
    try {
      const processPromises = Array.from(fileList).slice(0, 3).map(file => processFile(file))
      const processed = await Promise.all(processPromises)
      setFiles(prev => [...prev, ...processed].slice(0, 3))
    } catch (error) {
      console.error('File processing failed:', error)
      alert(error.message || 'Failed to process file. Please try again.')
    }
  }, [])

  // Combined handler for attach files (images + documents)
  const handleAttachFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return
    
    const imageFiles = []
    const docFiles = []
    
    Array.from(fileList).forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file)
      } else {
        docFiles.push(file)
      }
    })
    
    // Upload images
    if (imageFiles.length > 0) {
      await handleImageUpload(imageFiles)
    }
    
    // Process documents
    if (docFiles.length > 0) {
      await handleFileUpload(docFiles)
    }
  }, [handleImageUpload, handleFileUpload])

  const handleImageChange = useCallback((e) => {
    handleImageUpload(e.target.files)
    e.target.value = ''
    setShowPlusMenu(false)
  }, [handleImageUpload])

  const handleFileChange = useCallback((e) => {
    handleFileUpload(e.target.files)
    e.target.value = ''
    setShowPlusMenu(false)
  }, [handleFileUpload])

  const handleAttachChange = useCallback((e) => {
    handleAttachFiles(e.target.files)
    e.target.value = ''
    setShowPlusMenu(false)
  }, [handleAttachFiles])

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
    
    // Prevent double sends
    if (isSendingRef.current) return
    isSendingRef.current = true

    const text = message.trim() || (images.length > 0 ? 'What is in this image?' : 'Analyze this file')
    const generateCmd = parseGenerateCommand(text)
    const shouldGenerateImage = generateCmd || imageGenMode
    
    const currentImages = [...images]
    const currentFiles = [...files]
    const currentImageGenMode = imageGenMode
    const currentCouncilMode = councilMode
    const currentThinkingMode = thinkingMode
    const currentWebSearchMode = webSearchMode
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
      imageGenMode: currentImageGenMode,
      councilMode: currentCouncilMode,
      thinkingMode: currentThinkingMode,
      isImageGeneration: shouldGenerateImage,
      webSearch: currentWebSearchMode
    })

    const updatedChat = useStore.getState().chats.find(c => c.id === chat.id)

    if (shouldGenerateImage) {
      let imagePrompt = text
      let imageModel = selectedImageModel
      
      if (generateCmd) {
        if (generateCmd.error) {
          updateImageResponse(msgIndex, {
            error: generateCmd.error,
            isGenerating: false
          })
          setGenerating(false)
          return
        }
        imagePrompt = generateCmd.prompt
        imageModel = generateCmd.model
      }

      updateImageResponse(msgIndex, {
        isGenerating: true,
        model: IMAGE_MODELS[imageModel]?.name || 'Unknown'
      })

      try {
        const result = await generateImage(imagePrompt, imageModel)
        updateImageResponse(msgIndex, {
          imageData: result.base64 ? `data:${result.mimeType};base64,${result.base64}` : null,
          imageUrl: result.imageUrl,
          revisedPrompt: result.revisedPrompt,
          model: result.model,
          isGenerating: false
        })
      } catch (error) {
        updateImageResponse(msgIndex, {
          error: error.message || 'Image generation failed',
          isGenerating: false
        })
      }

      setGenerating(false)
      
      const finalChat = useStore.getState().chats.find(c => c.id === chat.id)
      if (finalChat && !finalChat.title) {
        const title = await generateChatTitle(finalChat.messages, finalChat.title)
        if (title) {
          updateChatTitle(finalChat.id, title)
        }
      }
      return
    }

    if (currentCouncilMode) {
      const councilController = new AbortController()
      setAbortControllers([councilController])
      
      updateCouncilResponse(msgIndex, {
        loading: { stage1: true, stage2: false, stage3: false },
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null
      })

      await runCouncil(text, (progress) => {
        // Check if aborted before updating
        if (councilController.signal.aborted) return
        
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
      }, councilController.signal)

      setGenerating(false)
      setAbortControllers([])
    } else {
      const controllers = activeModels.map(() => new AbortController())
      setAbortControllers(controllers)

      if (currentWebSearchMode) {
        // Web search mode: search first, then pass results to all models
        updateWebSearchResponse(msgIndex, {
          isSearching: true,
          searchRound: 1,
          searches: []
        })

        await sendToAllModelsWithSearch({
          activeModels,
          models,
          messages: updatedChat.messages,
          responses: updatedChat.responses || {},
          controllers,
          onUpdate: (modelKey, response) => {
            updateResponse(modelKey, msgIndex, response)
          },
          onSearchProgress: (progress) => {
            updateWebSearchResponse(msgIndex, {
              isSearching: progress.status === 'searching',
              searchRound: progress.round,
              currentQuery: progress.query,
              status: progress.message || progress.status
            })
          },
          onSearchComplete: (searchData) => {
            updateWebSearchResponse(msgIndex, {
              isSearching: false,
              totalSearches: searchData.totalSearches,
              searchResults: searchData.searchResults,
              complete: true
            })
          },
          getModelId
        })
      } else {
        await sendToAllModels({
          activeModels,
          models,
          messages: updatedChat.messages,
          responses: updatedChat.responses || {},
          controllers,
          onUpdate: (modelKey, response) => {
            updateResponse(modelKey, msgIndex, response)
          },
          getModelId
        })
      }

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
    
    // Reset send lock
    isSendingRef.current = false
  }, [message, images, files, imageGenMode, selectedImageModel, councilMode, webSearchMode, activeModels, models, getCurrentChat, createChat, addMessage, updateResponse, updateChatTitle, setGenerating, setAbortControllers, updateCouncilResponse])

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
      case 'pdf': return '📄'
      case 'csv': return '📊'
      case 'text': return '📝'
      default: return '📎'
    }
  }

  const chat = getCurrentChat()
  const hasMessages = chat?.messages?.length > 0

  return (
    <div className={`input-area ${!hasMessages ? 'centered' : ''}`}>
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
        <input
          type="file"
          id="attachInput"
          onChange={handleAttachChange}
          accept={`image/*,${FILE_ACCEPT}`}
          multiple
          style={{ display: 'none' }}
        />
        
        {/* Plus Menu Button */}
        <div className="plus-menu-container" ref={plusMenuRef}>
          <motion.button
            className="plus-btn"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </motion.button>
          
          <AnimatePresence>
            {showPlusMenu && (
              <motion.div
                className="plus-menu"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <button className="plus-menu-item" onClick={() => { document.getElementById('attachInput')?.click() }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span>Attach Files</span>
                </button>
                <button className={`plus-menu-item ${thinkingMode ? 'active' : ''}`} onClick={() => { toggleThinkingMode(); setShowPlusMenu(false) }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span>Think Mode {thinkingMode ? '✓' : ''}</span>
                </button>
                <div className="plus-menu-divider">
                  <span>Generate</span>
                </div>
                <button className="plus-menu-item" onClick={() => { toggleImageGenMode(); setShowPlusMenu(false) }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Image</span>
                </button>
                <button className="plus-menu-item" onClick={() => setShowPlusMenu(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <span>Document</span>
                </button>
                <button className={`plus-menu-item ${webSearchMode ? 'active' : ''}`} onClick={() => { toggleWebSearchMode(); setShowPlusMenu(false) }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                  </svg>
                  <span>Web Search {webSearchMode ? '✓' : ''}</span>
                </button>
                <button className="plus-menu-item has-arrow" onClick={() => setShowPlusMenu(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
                  </svg>
                  <span>Deep Research</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10"/>
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Search Toggle Button - like real AI Fiesta */}
        <motion.button
          className={`search-toggle-btn ${webSearchMode ? 'active' : ''}`}
          onClick={toggleWebSearchMode}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={webSearchMode ? 'Disable web search' : 'Enable web search'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
          <span>Search</span>
        </motion.button>
        
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder={imageGenMode ? "Describe the image you want to generate..." : webSearchMode ? "Search the web and get AI-powered answers..." : thinkingMode ? "Ask a complex question (thinking enabled)..." : "Ask me anything..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          autoComplete="off"
        />
        
        {/* Microphone button */}
        <motion.button
          className="mic-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Voice input"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </motion.button>
      </div>
      
      {/* Quick Action Buttons - shown on welcome screen */}
      {!hasMessages && (
        <div className="quick-actions">
          <button 
            className={`quick-action-btn ${thinkingMode ? 'active' : ''}`}
            onClick={toggleThinkingMode}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Think</span>
          </button>
          <button 
            className={`quick-action-btn ${webSearchMode ? 'active' : ''}`}
            onClick={toggleWebSearchMode}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            <span>Web Search</span>
          </button>
          <button 
            className={`quick-action-btn ${imageGenMode ? 'active' : ''}`}
            onClick={toggleImageGenMode}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Generate Image</span>
          </button>
        </div>
      )}
      
      {hasMessages && (
        <div className="keyboard-hints">
          <span>Enter send</span>
          <span>Esc stop</span>
          <span>Ctrl+E enhance</span>
          <span>Ctrl+N new</span>
        </div>
      )}
    </div>
  )
}

export default memo(InputArea)
