import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { DEFAULT_AVATARS, AVATAR_CATEGORIES } from '../data/avatars'

// Emoji picker options
const EMOJI_OPTIONS = ['🧠', '💼', '✍️', '👨‍💻', '🎨', '💪', '💰', '🌟', '🤗', '📊', '🎯', '🚀', '💡', '🔬', '📚', '🎭', '🎵', '🌍', '⚡', '🔮']

function AvatarModal({ isOpen, onClose, editAvatar = null }) {
  const { addCustomAvatar, updateCustomAvatar } = useStore()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🧠')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    if (editAvatar) {
      setName(editAvatar.name || '')
      setDescription(editAvatar.description || '')
      setEmoji(editAvatar.emoji || '🧠')
      setSystemPrompt(editAvatar.systemPrompt || '')
    } else {
      setName('')
      setDescription('')
      setEmoji('🧠')
      setSystemPrompt('')
    }
  }, [editAvatar, isOpen])

  const handleSave = () => {
    if (!name.trim() || !systemPrompt.trim()) return
    
    const avatarData = {
      name: name.trim(),
      description: description.trim(),
      emoji,
      systemPrompt: systemPrompt.trim()
    }
    
    if (editAvatar) {
      updateCustomAvatar(editAvatar.id, avatarData)
    } else {
      addCustomAvatar(avatarData)
    }
    
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="avatar-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="avatar-modal-header">
            <h2>{editAvatar ? 'Edit Avatar' : 'Create Avatar'}</h2>
            <button className="modal-close-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div className="avatar-modal-content">
            <div className="avatar-form-row">
              <div className="avatar-emoji-picker">
                <button 
                  className="emoji-trigger"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <span className="selected-emoji">{emoji}</span>
                </button>
                {showEmojiPicker && (
                  <div className="emoji-dropdown">
                    {EMOJI_OPTIONS.map(e => (
                      <button 
                        key={e} 
                        className={`emoji-option ${emoji === e ? 'active' : ''}`}
                        onClick={() => { setEmoji(e); setShowEmojiPicker(false) }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                className="avatar-input"
                placeholder="Avatar name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
            </div>
            
            <input
              type="text"
              className="avatar-input"
              placeholder="Short description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={100}
            />
            
            <div className="avatar-prompt-section">
              <label>System Prompt</label>
              <p className="prompt-hint">Define how this avatar should behave and respond</p>
              <textarea
                className="avatar-textarea"
                placeholder="You are a helpful assistant that..."
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          
          <div className="avatar-modal-footer">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={!name.trim() || !systemPrompt.trim()}
            >
              {editAvatar ? 'Save Changes' : 'Create Avatar'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Avatar selection panel (shown in sidebar)
export const AvatarPanel = memo(({ isExpanded, onToggle }) => {
  const { customAvatars, activeAvatarId, setActiveAvatar, clearActiveAvatar, deleteCustomAvatar } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editingAvatar, setEditingAvatar] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  const allAvatars = [...DEFAULT_AVATARS, ...customAvatars]
  const filteredAvatars = selectedCategory === 'all' 
    ? allAvatars 
    : allAvatars.filter(a => a.category === selectedCategory)
  
  const activeAvatar = allAvatars.find(a => a.id === activeAvatarId)

  const handleSelectAvatar = (avatar) => {
    if (activeAvatarId === avatar.id) {
      clearActiveAvatar()
    } else {
      setActiveAvatar(avatar.id)
    }
  }

  const handleEdit = (avatar, e) => {
    e.stopPropagation()
    setEditingAvatar(avatar)
    setShowModal(true)
  }

  const handleDelete = (avatarId, e) => {
    e.stopPropagation()
    if (confirm('Delete this avatar?')) {
      deleteCustomAvatar(avatarId)
    }
  }

  const handleCreate = () => {
    setEditingAvatar(null)
    setShowModal(true)
  }

  return (
    <>
      <div className="avatar-panel">
        {/* Active Avatar Indicator */}
        {activeAvatar && (
          <div className="active-avatar-badge" onClick={clearActiveAvatar}>
            <span className="avatar-emoji">{activeAvatar.emoji || '🤖'}</span>
            <span className="avatar-name">{activeAvatar.name}</span>
            <button className="clear-avatar-btn" title="Clear avatar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        
        {isExpanded && (
          <div className="avatar-list-container">
            {/* Category Filter */}
            <div className="avatar-categories">
              {AVATAR_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
            
            {/* Avatar List */}
            <div className="avatar-list">
              {filteredAvatars.map(avatar => (
                <div 
                  key={avatar.id}
                  className={`avatar-item ${activeAvatarId === avatar.id ? 'active' : ''}`}
                  onClick={() => handleSelectAvatar(avatar)}
                >
                  <div className="avatar-item-icon">
                    {avatar.image ? (
                      <img src={avatar.image} alt={avatar.name} />
                    ) : (
                      <span>{avatar.emoji}</span>
                    )}
                  </div>
                  <div className="avatar-item-info">
                    <span className="avatar-item-name">{avatar.name}</span>
                    <span className="avatar-item-desc">{avatar.description}</span>
                  </div>
                  {avatar.category === 'custom' && (
                    <div className="avatar-item-actions">
                      <button onClick={(e) => handleEdit(avatar, e)} title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={(e) => handleDelete(avatar.id, e)} title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Create Button */}
            <button className="create-avatar-btn" onClick={handleCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Create Custom Avatar
            </button>
          </div>
        )}
      </div>
      
      <AvatarModal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setEditingAvatar(null) }}
        editAvatar={editingAvatar}
      />
    </>
  )
})

export default memo(AvatarModal)
