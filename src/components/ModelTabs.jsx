import { memo, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'

function ModelTabs() {
  const { models, activeModels, toggleModel, reorderModels, toggleSidebar, councilMode } = useStore()
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const draggedRef = useRef(null)

  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index)
    draggedRef.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    
    // Add dragging class after a small delay
    setTimeout(() => {
      e.target.classList.add('dragging')
    }, 0)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback((e, index) => {
    e.preventDefault()
    if (draggedRef.current !== null && draggedRef.current !== index) {
      setDropIndex(index)
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    // Only clear if leaving the tab entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropIndex(null)
    }
  }, [])

  const handleDrop = useCallback((e, targetIndex) => {
    e.preventDefault()
    const sourceIndex = draggedRef.current
    
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      const newOrder = [...activeModels]
      const [movedItem] = newOrder.splice(sourceIndex, 1)
      newOrder.splice(targetIndex, 0, movedItem)
      reorderModels(newOrder)
    }
    
    setDraggedIndex(null)
    setDropIndex(null)
    draggedRef.current = null
  }, [activeModels, reorderModels])

  const handleDragEnd = useCallback((e) => {
    e.target.classList.remove('dragging')
    setDraggedIndex(null)
    setDropIndex(null)
    draggedRef.current = null
  }, [])

  // Get inactive models
  const allModelKeys = Object.keys(models)
  const inactiveModels = allModelKeys.filter(key => !activeModels.includes(key))

  return (
    <header className="model-tabs-header">
      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      {councilMode ? (
        <div className="council-mode-header">
          <span className="council-mode-icon">🏛️</span>
          <span className="council-mode-text">LLM Council Mode</span>
          <span className="council-mode-badge">BETA</span>
        </div>
      ) : (
      <div className="model-tabs">
        {activeModels.map((key, index) => {
          const model = models[key]
          if (!model) return null
          
          const isDragging = draggedIndex === index
          const isDropTarget = dropIndex === index
          
          return (
            <div
              key={key}
              className={`model-tab active ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="drag-handle">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="8" cy="5" r="2"/><circle cx="16" cy="5" r="2"/>
                  <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
                  <circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/>
                </svg>
              </div>
              <img
                src={model.icon}
                alt={model.name}
                className={`model-tab-icon ${model.darkLogo ? 'dark-logo' : ''}`}
                onError={(e) => { e.target.style.display = 'none' }}
                draggable={false}
              />
              <span className="model-tab-name">{model.name}</span>
              <motion.div
                className="toggle-switch active"
                onClick={(e) => { e.stopPropagation(); toggleModel(key) }}
                whileTap={{ scale: 0.95 }}
              />
            </div>
          )
        })}

        {inactiveModels.map(key => {
          const model = models[key]
          if (!model) return null
          
          return (
            <div key={key} className="model-tab inactive">
              <img
                src={model.icon}
                alt={model.name}
                className={`model-tab-icon ${model.darkLogo ? 'dark-logo' : ''}`}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <span className="model-tab-name">{model.name}</span>
              <motion.div
                className="toggle-switch"
                onClick={() => toggleModel(key)}
                whileTap={{ scale: 0.95 }}
              />
            </div>
          )
        })}
      </div>
      )}
    </header>
  )
}

export default memo(ModelTabs)
