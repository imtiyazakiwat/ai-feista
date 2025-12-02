import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MODELS = {
  chatgpt: {
    id: 'openrouter:openai/gpt-5.1',
    name: 'ChatGPT',
    icon: '/img/ChatGPT-Logo.png',
    color: '#10a37f',
    darkLogo: true,
    fallbackId: 'openrouter:openai/gpt-4.1'
  },
  claude: {
    id: 'openrouter:anthropic/claude-opus-4.5',
    name: 'Claude',
    icon: '/img/claude%20ai%20logo%20Background%20Removed.png',
    color: '#D97757',
    darkLogo: false,
    fallbackId: 'openrouter:anthropic/claude-sonnet-4'
  },
  gemini: {
    id: 'openrouter:google/gemini-3-pro-preview',
    name: 'Gemini',
    icon: '/img/gemini%20Background%20Removed.png',
    color: '#4285f4',
    darkLogo: false,
    fallbackId: 'openrouter:google/gemini-2.5-pro'
  },
  perplexity: {
    id: 'openrouter:perplexity/sonar-pro-search',
    name: 'Perplexity',
    icon: '/img/perplexity%20Background%20Removed.png',
    color: '#20B8CD',
    darkLogo: false,
    fallbackId: 'openrouter:perplexity/sonar-pro'
  },
  grok: {
    id: 'x-ai/grok-4.1-fast:free',
    name: 'Grok',
    icon: '/img/grok%20logo%20Background%20Removed.png',
    color: '#ffffff',
    darkLogo: true,
    fallbackId: 'openrouter:x-ai/grok-3-fast'
  },
  deepseek: {
    id: 'openrouter:deepseek/deepseek-v3.2',
    name: 'DeepSeek',
    icon: '/img/deepseek%20logo%20Background%20Removed.png',
    color: '#4D6BFE',
    darkLogo: false,
    fallbackId: 'openrouter:deepseek/deepseek-r1'
  }
}

const generateId = () => Math.random().toString(36).substring(2, 15)

const useStore = create(
  persist(
    (set, get) => ({
      // State
      theme: 'dark',
      activeModels: ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'deepseek'],
      sidebarOpen: false,
      chats: [],
      currentChatId: null,
      isGenerating: false,
      abortControllers: [],

      // Getters
      models: MODELS,
      getCurrentChat: () => get().chats.find(c => c.id === get().currentChatId),

      // Actions
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', newTheme)
        set({ theme: newTheme })
      },

      toggleModel: (modelKey) => {
        const { activeModels } = get()
        if (activeModels.includes(modelKey)) {
          if (activeModels.length <= 1) return false
          set({ activeModels: activeModels.filter(m => m !== modelKey) })
        } else {
          set({ activeModels: [...activeModels, modelKey] })
        }
        return true
      },

      reorderModels: (newOrder) => {
        set({ activeModels: newOrder })
      },

      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }))
      },

      closeSidebar: () => {
        set({ sidebarOpen: false })
      },

      createChat: () => {
        const chat = {
          id: generateId(),
          title: null,
          messages: [],
          responses: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        set(state => ({
          chats: [chat, ...state.chats],
          currentChatId: chat.id
        }))
        return chat
      },

      loadChat: (chatId) => set({ currentChatId: chatId }),

      deleteChat: (chatId) => {
        const { chats, currentChatId } = get()
        const newChats = chats.filter(c => c.id !== chatId)
        let newCurrentId = currentChatId
        
        if (currentChatId === chatId) {
          newCurrentId = newChats.length > 0 ? newChats[0].id : null
        }
        
        set({ chats: newChats, currentChatId: newCurrentId })
      },

      addMessage: (message) => {
        set(state => {
          const chat = state.chats.find(c => c.id === state.currentChatId)
          if (!chat) return state
          
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, message],
            updatedAt: Date.now()
          }
          
          return {
            chats: state.chats.map(c => c.id === chat.id ? updatedChat : c)
          }
        })
      },

      updateResponse: (modelKey, msgIndex, response) => {
        set(state => {
          const chat = state.chats.find(c => c.id === state.currentChatId)
          if (!chat) return state
          
          const responses = { ...chat.responses }
          if (!responses[modelKey]) responses[modelKey] = {}
          responses[modelKey][msgIndex] = response
          
          const updatedChat = { ...chat, responses, updatedAt: Date.now() }
          
          return {
            chats: state.chats.map(c => c.id === chat.id ? updatedChat : c)
          }
        })
      },

      updateChatTitle: (chatId, title) => {
        set(state => ({
          chats: state.chats.map(c => c.id === chatId ? { ...c, title } : c)
        }))
      },

      setGenerating: (isGenerating) => set({ isGenerating }),
      
      setAbortControllers: (controllers) => set({ abortControllers: controllers }),
      
      stopGenerating: () => {
        get().abortControllers.forEach(c => c.abort())
        set({ isGenerating: false, abortControllers: [] })
      }
    }),
    {
      name: 'ai-fiesta-storage',
      partialize: (state) => ({
        theme: state.theme,
        activeModels: state.activeModels,
        chats: state.chats,
        currentChatId: state.currentChatId
      })
    }
  )
)

export default useStore
