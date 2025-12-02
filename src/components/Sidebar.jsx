import { memo, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'

const ChatItem = memo(({ chat, isActive, onLoad, onDelete }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className={`chat-item ${isActive ? 'active' : ''}`}
    onClick={() => onLoad(chat.id)}
  >
    <span className="chat-item-title">{chat.title || 'New Chat'}</span>
    <button
      className="chat-item-delete"
      onClick={(e) => { e.stopPropagation(); onDelete(chat.id) }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>
  </motion.div>
))

function Sidebar() {
  const { chats, currentChatId, theme, createChat, loadChat, deleteChat, toggleTheme } = useStore()

  const groupedChats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0)
    const yesterday = today - 86400000
    
    return chats.reduce((acc, chat) => {
      const chatDate = new Date(chat.createdAt).setHours(0, 0, 0, 0)
      if (chatDate === today) acc.today.push(chat)
      else if (chatDate === yesterday) acc.yesterday.push(chat)
      else acc.older.push(chat)
      return acc
    }, { today: [], yesterday: [], older: [] })
  }, [chats])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🎉</span>
          <span className="logo-text">AI Fiesta</span>
        </div>
      </div>

      <motion.button
        className="new-chat-btn"
        onClick={createChat}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>New Chat</span>
      </motion.button>

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
                  onLoad={loadChat}
                  onDelete={deleteChat}
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
                  onLoad={loadChat}
                  onDelete={deleteChat}
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
                  onLoad={loadChat}
                  onDelete={deleteChat}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
        
        {chats.length === 0 && (
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
  )
}

export default memo(Sidebar)
