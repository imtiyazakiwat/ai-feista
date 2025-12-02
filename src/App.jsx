import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import useStore from './store/useStore'
import Sidebar from './components/Sidebar'
import ModelTabs from './components/ModelTabs'
import ChatArea from './components/ChatArea'
import InputArea from './components/InputArea'
import Toast from './components/Toast'

export default function App() {
  const { theme, setTheme } = useStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <ModelTabs />
        <ChatArea />
        <InputArea />
      </main>
      <Toast />
    </div>
  )
}
