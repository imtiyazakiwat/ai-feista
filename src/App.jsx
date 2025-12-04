import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import useStore from './store/useStore'
import Sidebar from './components/Sidebar'
import ModelTabs from './components/ModelTabs'
import ChatArea from './components/ChatArea'
import InputArea from './components/InputArea'
import Toast from './components/Toast'
import AvatarChat, { AvatarSelection } from './components/AvatarChat'
import SingleModelChat from './components/SingleModelChat'

// Main chat interface
function MainChat() {
  const { getCurrentChat, sidebarCollapsed, toggleSidebarCollapse } = useStore()
  const chat = getCurrentChat()
  const hasMessages = chat?.messages?.length > 0

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {sidebarCollapsed && (
          <button className="expand-sidebar-btn" onClick={toggleSidebarCollapse} title="Expand sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
            </svg>
          </button>
        )}
        
        <ModelTabs />
        <ChatArea />
        {hasMessages && <InputArea />}
      </main>
      <Toast />
    </div>
  )
}

export default function App() {
  const { theme } = useStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainChat />} />
        <Route path="/avatars" element={<AvatarSelection />} />
        <Route path="/avatar/:chatId" element={<AvatarChat />} />
        <Route path="/chat/:modelKey" element={<SingleModelChat />} />
        <Route path="/chat/:modelKey/:chatId" element={<SingleModelChat />} />
      </Routes>
    </BrowserRouter>
  )
}
