import { memo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'

function ModelDropdown({ modelKey, model }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { selectedVariants, setSelectedVariant, thinkingMode, getVariantName } = useStore()
  
  const currentVariantId = selectedVariants[modelKey] || model.defaultVariant
  const currentVariantName = getVariantName(modelKey)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectVariant = (variantId) => {
    setSelectedVariant(modelKey, variantId)
    setIsOpen(false)
  }

  // Get variants - filter by thinking mode if enabled
  const allVariants = model.variants || []
  const filteredVariants = thinkingMode 
    ? allVariants.filter(v => v.supportsThinking)
    : allVariants

  return (
    <div className="model-dropdown-container" ref={dropdownRef}>
      <button 
        className="model-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="model-dropdown-name">{currentVariantName}</span>
        <svg 
          className={`model-dropdown-chevron ${isOpen ? 'open' : ''}`} 
          width="10" 
          height="10" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="model-dropdown-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {filteredVariants.length > 0 ? (
              filteredVariants.map(variant => (
                <button
                  key={variant.id}
                  className={`model-dropdown-item ${currentVariantId === variant.id ? 'active' : ''}`}
                  onClick={() => handleSelectVariant(variant.id)}
                >
                  <span className="model-dropdown-item-name">{variant.name}</span>
                  {variant.supportsThinking && (
                    <span className="thinking-badge">🧠</span>
                  )}
                  {currentVariantId === variant.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="model-dropdown-empty">
                No thinking-capable models available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(ModelDropdown)
