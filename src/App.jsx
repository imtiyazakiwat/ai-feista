import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import useStore from './store/useStore'
import Sidebar from './components/Sidebar'
import ModelTabs from './components/ModelTabs'
import ChatArea from './components/ChatArea'
import InputArea from './components/InputArea'
import Toast from './components/Toast'
import IpChangeModal from './components/IpChangeModal'
import WelcomeModal from './components/WelcomeModal'
import AvatarChat, { AvatarSelection } from './components/AvatarChat'
import SingleModelChat from './components/SingleModelChat'
import { PuterProvider, usePuter } from './context/PuterContext'

// Session rotating toast component
function SessionRotatingToast() {
  const { showRotatingToast } = usePuter()

  if (!showRotatingToast) return null

  return (
    <div className="session-rotating-toast">
      <div className="spinner" />
      <span>Rotating session...</span>
    </div>
  )
}

// Welcome modal wrapper
function WelcomeModalWrapper() {
  const { showWelcomeModal, signInAsGuest, isSigningIn } = usePuter()

  return (
    <WelcomeModal
      isOpen={showWelcomeModal}
      onSignIn={signInAsGuest}
      isLoading={isSigningIn}
    />
  )
}

// Main chat interface
function MainChat() {
  const { getCurrentChat, sidebarCollapsed, toggleSidebarCollapse } = useStore()
  const { showIpModal, setShowIpModal, handleRetryAfterIpChange, sessionStatus } = usePuter()
  const chat = getCurrentChat()
  const hasMessages = chat?.messages?.length > 0

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {sidebarCollapsed && (
          <button className="expand-sidebar-btn" onClick={toggleSidebarCollapse} title="Expand sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
            </svg>
          </button>
        )}

        <ModelTabs />
        <ChatArea />
        {hasMessages && <InputArea />}
      </main>
      <Toast />
      <SessionRotatingToast />
      <WelcomeModalWrapper />
      <IpChangeModal
        isOpen={showIpModal}
        onClose={() => setShowIpModal(false)}
        onRetry={handleRetryAfterIpChange}
      />
    </div>
  )
}

// App content with Puter context
function AppContent() {
  const { theme } = useStore()
  const { showIpModal, setShowIpModal, handleRetryAfterIpChange, showWelcomeModal, signInAsGuest, isSigningIn } = usePuter()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainChat />} />
        <Route path="/avatars" element={
          <>
            <AvatarSelection />
            <WelcomeModal isOpen={showWelcomeModal} onSignIn={signInAsGuest} isLoading={isSigningIn} />
            <IpChangeModal
              isOpen={showIpModal}
              onClose={() => setShowIpModal(false)}
              onRetry={handleRetryAfterIpChange}
            />
          </>
        } />
        <Route path="/avatar/:chatId" element={
          <>
            <AvatarChat />
            <WelcomeModal isOpen={showWelcomeModal} onSignIn={signInAsGuest} isLoading={isSigningIn} />
            <IpChangeModal
              isOpen={showIpModal}
              onClose={() => setShowIpModal(false)}
              onRetry={handleRetryAfterIpChange}
            />
          </>
        } />
        <Route path="/chat/:modelKey" element={
          <>
            <SingleModelChat />
            <WelcomeModal isOpen={showWelcomeModal} onSignIn={signInAsGuest} isLoading={isSigningIn} />
            <IpChangeModal
              isOpen={showIpModal}
              onClose={() => setShowIpModal(false)}
              onRetry={handleRetryAfterIpChange}
            />
          </>
        } />
        <Route path="/chat/:modelKey/:chatId" element={
          <>
            <SingleModelChat />
            <WelcomeModal isOpen={showWelcomeModal} onSignIn={signInAsGuest} isLoading={isSigningIn} />
            <IpChangeModal
              isOpen={showIpModal}
              onClose={() => setShowIpModal(false)}
              onRetry={handleRetryAfterIpChange}
            />
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <PuterProvider>
      <AppContent />
    </PuterProvider>
  )
}
