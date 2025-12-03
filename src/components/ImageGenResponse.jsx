import { memo, useState } from 'react'
import { motion } from 'framer-motion'

const ImageGenResponse = memo(({ imageData, message }) => {
  const [downloading, setDownloading] = useState(false)

  if (!imageData) return null

  const handleDownload = async () => {
    if ((!imageData.imageData && !imageData.imageUrl) || downloading) return
    
    setDownloading(true)
    try {
      const link = document.createElement('a')
      link.href = imageData.imageData || imageData.imageUrl
      link.download = `generated-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setDownloading(false)
    }
  }

  const imageSrc = imageData.imageData || imageData.imageUrl

  return (
    <motion.div
      className="image-gen-response"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="image-gen-user-message">
        <div className="user-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div className="user-message-content">{message.content}</div>
      </div>

      <div className="image-gen-result">
        <div className="image-gen-header">
          <span className="image-gen-icon">🎨</span>
          <span className="image-gen-title">Image Generation</span>
          {imageData.model && (
            <span className="image-gen-model">{imageData.model}</span>
          )}
        </div>

        {imageData.isGenerating ? (
          <div className="image-gen-loading">
            <div className="image-gen-spinner">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/>
              </svg>
            </div>
            <span>Generating image...</span>
          </div>
        ) : imageData.error ? (
          <div className="image-gen-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{imageData.error}</span>
          </div>
        ) : imageSrc ? (
          <div className="image-gen-content">
            <div className="generated-image-container">
              <img 
                src={imageSrc} 
                alt="Generated" 
                className="generated-image"
              />
              <div className="image-actions">
                <button 
                  className="image-action-btn"
                  onClick={handleDownload}
                  disabled={downloading}
                  title="Download image"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <a 
                  href={imageSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="image-action-btn"
                  title="Open in new tab"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            </div>
            {imageData.revisedPrompt && (
              <div className="revised-prompt">
                <span className="revised-label">Revised prompt:</span>
                <span className="revised-text">{imageData.revisedPrompt}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
})

export default ImageGenResponse
