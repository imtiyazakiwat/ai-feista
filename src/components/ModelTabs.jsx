import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import { IMAGE_MODELS } from '../utils/imageApi'

function ModelTabs() {
  const { models, activeModels, toggleModel, toggleSidebar, toggleTheme, theme, councilMode, imageGenMode, selectedImageModel, setSelectedImageModel } = useStore()

  // All models in order (active first, then inactive)
  const allModelKeys = Object.keys(models)
  const orderedModels = [...activeModels, ...allModelKeys.filter(key => !activeModels.includes(key))]

  const handleExternalOpen = useCallback((model) => {
    if (model.url) {
      window.open(model.url, '_blank')
    }
  }, [])

  // Only show header for council/image modes, not for regular chat (columns have their own headers)
  const showHeader = councilMode || imageGenMode

  return (
    <>
      {/* Mobile Top Header - Logo + Theme + Menu */}
      <div className="mobile-top-header">
        <div className="mobile-logo">
          <div className="logo-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
        </div>
        <div className="mobile-top-actions">
          <button className="mobile-theme-btn" onClick={toggleTheme}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Model Tabs Header */}
      <header className={`model-tabs-header ${showHeader ? 'show-header' : ''}`}>
      {councilMode ? (
        <div className="council-mode-header">
          <span className="council-mode-icon">🏛️</span>
          <span className="council-mode-text">LLM Council Mode</span>
          <span className="council-mode-badge">BETA</span>
        </div>
      ) : imageGenMode ? (
        <div className="model-tabs">
          <div className="image-gen-mode-indicator">
            <span className="image-gen-mode-icon">🎨</span>
            <span className="image-gen-mode-text">Image Generation</span>
          </div>
          {Object.entries(IMAGE_MODELS).map(([key, model]) => (
            <div
              key={key}
              className={`model-tab ${selectedImageModel === key ? 'active' : 'inactive'}`}
              onClick={() => setSelectedImageModel(key)}
            >
              <span className="model-tab-emoji">{model.icon}</span>
              <span className="model-tab-name">{model.name}</span>
              <motion.div
                className={`toggle-switch ${selectedImageModel === key ? 'active' : ''}`}
                whileTap={{ scale: 0.95 }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="model-tabs">
          {orderedModels.map(key => {
            const model = models[key]
            if (!model) return null
            const isActive = activeModels.includes(key)
            
            return (
              <div key={key} className={`model-tab ${isActive ? 'active' : 'inactive'}`}>
                <img
                  src={model.icon}
                  alt={model.name}
                  className={`model-tab-icon ${model.darkLogo ? 'dark-logo' : ''}`}
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <div className="model-tab-info">
                  <span className="model-tab-name">{model.name}</span>
                  <svg className="model-tab-dropdown" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <button 
                  className="model-tab-external" 
                  title="Open in new tab"
                  onClick={(e) => { e.stopPropagation(); handleExternalOpen(model) }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                </button>
                <motion.div
                  className={`toggle-switch ${isActive ? 'active' : ''}`}
                  onClick={() => toggleModel(key)}
                  whileTap={{ scale: 0.95 }}
                />
              </div>
            )
          })}
        </div>
      )}
      
      {/* Desktop: Settings button */}
      <button className="header-settings-btn" title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>
    </header>
    </>
  )
}

export default memo(ModelTabs)
