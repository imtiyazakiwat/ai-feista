import { memo, useMemo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'

// Chat item with 3-dot menu like AI Fiesta
const ChatItem = memo(({ chat, isActive, onLoad, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`chat-item ${isActive ? 'active' : ''}`} onClick={() => onLoad(chat.id)}>
      <span className="chat-item-title">{chat.title || 'New Chat'}</span>
      <div className="chat-item-menu" ref={menuRef}>
        <button 
          className="chat-item-menu-btn"
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
        {showMenu && (
          <div className="chat-item-dropdown">
            <button onClick={(e) => { e.stopPropagation(); onDelete(chat.id); setShowMenu(false) }}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
})


// Navigation Section with proper SVG icons
const NavSection = memo(({ icon, label, hasAdd, expanded, onToggle }) => (
  <div className="nav-section">
    <div className="nav-section-header" onClick={onToggle}>
      <span className="nav-section-icon">{icon}</span>
      <span className="nav-section-label">{label}</span>
      {hasAdd && (
        <button className="nav-section-add" onClick={(e) => e.stopPropagation()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      )}
      <svg 
        className={`nav-section-chevron ${expanded ? 'expanded' : ''}`} 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  </div>
))

function Sidebar() {
  const { 
    chats, currentChatId, theme, sidebarOpen, sidebarCollapsed, searchQuery,
    createChat, loadChat, deleteChat, toggleTheme, closeSidebar, toggleSidebarCollapse,
    setSearchQuery, getFilteredChats
  } = useStore()
  
  const searchInputRef = useRef(null)
  const [expandedSections, setExpandedSections] = useState({
    avatars: false,
    projects: false,
    games: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const filteredChats = getFilteredChats()

  const groupedChats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0)
    const yesterday = today - 86400000
    const weekAgo = today - 7 * 86400000
    
    return filteredChats.reduce((acc, chat) => {
      const chatDate = new Date(chat.createdAt).setHours(0, 0, 0, 0)
      if (chatDate === today) acc.today.push(chat)
      else if (chatDate === yesterday) acc.yesterday.push(chat)
      else if (chatDate > weekAgo) acc.week.push(chat)
      else acc.older.push(chat)
      return acc
    }, { today: [], yesterday: [], week: [], older: [] })
  }, [filteredChats])

  const handleNewChat = () => {
    createChat()
    if (window.innerWidth < 768) closeSidebar()
  }

  const handleLoadChat = (chatId) => {
    loadChat(chatId)
    if (window.innerWidth < 768) closeSidebar()
  }

  // Format date for older chats
  const formatOlderDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
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

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <span className="logo-text">AI Fiesta</span>
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="search-container">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* New Chat */}
        <button className="new-chat-btn" onClick={handleNewChat}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>New chat</span>
        </button>


        {/* Navigation Sections with SVG icons */}
        <div className="nav-sections">
          <NavSection 
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            }
            label="Avatars" 
            hasAdd 
            expanded={expandedSections.avatars}
            onToggle={() => toggleSection('avatars')}
          />
          
          <NavSection 
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>
              </svg>
            }
            label="Projects" 
            hasAdd 
            expanded={expandedSections.projects}
            onToggle={() => toggleSection('projects')}
          />
          
          <NavSection 
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M6 12h.01M12 12h.01M18 12h.01"/>
              </svg>
            }
            label="Games" 
            expanded={expandedSections.games}
            onToggle={() => toggleSection('games')}
          />
        </div>

        {/* Chat History */}
        <div className="chat-history">
          {groupedChats.today.length > 0 && (
            <div className="history-section">
              <div className="history-title">Today</div>
              {groupedChats.today.map(chat => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === currentChatId}
                  onLoad={handleLoadChat}
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
                  onLoad={handleLoadChat}
                  onDelete={deleteChat}
                />
              ))}
            </div>
          )}

          {groupedChats.week.length > 0 && (
            <div className="history-section">
              <div className="history-title">This Week</div>
              {groupedChats.week.map(chat => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === currentChatId}
                  onLoad={handleLoadChat}
                  onDelete={deleteChat}
                />
              ))}
            </div>
          )}
          
          {groupedChats.older.length > 0 && (
            <div className="history-section">
              <div className="history-title">{formatOlderDate(groupedChats.older[0]?.createdAt)}</div>
              {groupedChats.older.map(chat => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === currentChatId}
                  onLoad={handleLoadChat}
                  onDelete={deleteChat}
                />
              ))}
            </div>
          )}
          
          {filteredChats.length === 0 && (
            <div className="history-empty">No chats yet</div>
          )}
        </div>


        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar-sidebar">I</div>
            <span className="user-name">Imtiyaz Akiwat</span>
            <button className="collapse-sidebar-btn" onClick={toggleSidebarCollapse}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default memo(Sidebar)
