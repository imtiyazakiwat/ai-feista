import { memo, useMemo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'

const ChatItem = memo(({ chat, isActive, isEditing, onLoad, onDelete, onStartEdit, onSaveEdit }) => {
  const [editTitle, setEditTitle] = useState(chat.title || 'New Chat')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      setEditTitle(chat.title || 'New Chat')
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing, chat.title])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSaveEdit(chat.id, editTitle)
    } else if (e.key === 'Escape') {
      onSaveEdit(null)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`chat-item ${isActive ? 'active' : ''}`}
      onClick={() => !isEditing && onLoad(chat.id)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="chat-item-edit"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onSaveEdit(chat.id, editTitle)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="chat-item-title">{chat.title || 'New Chat'}</span>
          <div className="chat-item-actions">
            <button
              className="chat-item-edit-btn"
              onClick={(e) => { e.stopPropagation(); onStartEdit(chat.id) }}
              title="Rename"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              className="chat-item-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(chat.id) }}
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
})

function Sidebar() {
  const { 
    chats, currentChatId, theme, sidebarOpen, searchQuery, editingChatId,
    createChat, loadChat, deleteChat, toggleTheme, closeSidebar,
    setSearchQuery, setEditingChatId, updateChatTitle, getFilteredChats
  } = useStore()
  
  const searchInputRef = useRef(null)

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredChats = getFilteredChats()

  const groupedChats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0)
    const yesterday = today - 86400000
    
    return filteredChats.reduce((acc, chat) => {
      const chatDate = new Date(chat.createdAt).setHours(0, 0, 0, 0)
      if (chatDate === today) acc.today.push(chat)
      else if (chatDate === yesterday) acc.yesterday.push(chat)
      else acc.older.push(chat)
      return acc
    }, { today: [], yesterday: [], older: [] })
  }, [filteredChats])

  const handleNewChat = () => {
    createChat()
    closeSidebar()
  }

  const handleLoadChat = (chatId) => {
    loadChat(chatId)
    closeSidebar()
  }

  const handleStartEdit = (chatId) => {
    setEditingChatId(chatId)
  }

  const handleSaveEdit = (chatId, newTitle) => {
    if (chatId && newTitle?.trim()) {
      updateChatTitle(chatId, newTitle.trim())
    }
    setEditingChatId(null)
  }

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🎉</span>
            <span className="logo-text">AI Fiesta</span>
          </div>
          <button className="sidebar-close-btn" onClick={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <motion.button
          className="new-chat-btn"
          onClick={handleNewChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>New Chat</span>
          <span className="shortcut">⌘N</span>
        </motion.button>

        <div className="search-container">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search chats... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        <div className="chat-history">
          <AnimatePresence mode="popLayout">
            {groupedChats.today.length > 0 && (
              <div className="history-section">
                <div className="history-title">Today</div>
                {groupedChats.today.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    isEditing={chat.id === editingChatId}
                    onLoad={handleLoadChat}
                    onDelete={deleteChat}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                  />
                ))}
              </div>
            )}
            
            {groupedChats.yesterday.length > 0 && (
              <div className="history-section">
                <div className="history-title">Yesterday</div>
                {groupedChats.yesterday.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    isEditing={chat.id === editingChatId}
                    onLoad={handleLoadChat}
                    onDelete={deleteChat}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                  />
                ))}
              </div>
            )}
            
            {groupedChats.older.length > 0 && (
              <div className="history-section">
                <div className="history-title">Previous</div>
                {groupedChats.older.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    isEditing={chat.id === editingChatId}
                    onLoad={handleLoadChat}
                    onDelete={deleteChat}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
          
          {filteredChats.length === 0 && searchQuery && (
            <div className="history-empty">No chats found</div>
          )}
          
          {chats.length === 0 && !searchQuery && (
            <div className="history-empty">No recent chats</div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default memo(Sidebar)
