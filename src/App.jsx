import { useEffect } from 'react'
import useStore from './store/useStore'
import Sidebar from './components/Sidebar'
import ModelTabs from './components/ModelTabs'
import ChatArea from './components/ChatArea'
import InputArea from './components/InputArea'
import Toast from './components/Toast'

export default function App() {
  const { theme, getCurrentChat, sidebarCollapsed, toggleSidebarCollapse } = useStore()
  const chat = getCurrentChat()
  const hasMessages = chat?.messages?.length > 0

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {/* Expand sidebar button - shown when sidebar is collapsed on desktop */}
        {sidebarCollapsed && (
          <button className="expand-sidebar-btn" onClick={toggleSidebarCollapse} title="Expand sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
            </svg>
          </button>
        )}
        
        <ModelTabs />
        <ChatArea />
        {/* Only show InputArea at bottom when there are messages */}
        {hasMessages && <InputArea />}
      </main>
      <Toast />
    </div>
  )
}
