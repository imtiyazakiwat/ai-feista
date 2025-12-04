import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Model variants for each provider (all free)
const MODEL_VARIANTS = {
  chatgpt: [
    { id: 'openrouter:openai/gpt-5-mini', name: 'GPT-5 mini', supportsThinking: false },
    { id: 'openrouter:openai/gpt-5-nano', name: 'GPT-5 nano', supportsThinking: false },
    { id: 'openrouter:openai/gpt-4.1-nano', name: 'GPT-4.1 nano', supportsThinking: false },
    { id: 'openrouter:openai/gpt-4o-mini', name: 'GPT-4o mini', supportsThinking: false },
    { id: 'openrouter:openai/gpt-5.1', name: 'GPT-5.1', supportsThinking: true },
    { id: 'openrouter:openai/gpt-5', name: 'GPT-5', supportsThinking: true },
  ],
  gemini: [
    { id: 'openrouter:google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', supportsThinking: false },
    { id: 'openrouter:google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Lite', supportsThinking: false },
    { id: 'openrouter:google/gemini-3-pro-preview', name: 'Gemini 3 Pro', supportsThinking: true },
    { id: 'openrouter:google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsThinking: true },
  ],
  deepseek: [
    { id: 'openrouter:deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat v3.2', supportsThinking: false },
    { id: 'openrouter:deepseek/deepseek-r1', name: 'DeepSeek Reasoner R1', supportsThinking: true },
  ],
  claude: [
    { id: 'openrouter:anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', supportsThinking: true },
    { id: 'openrouter:anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', supportsThinking: true },
    { id: 'openrouter:anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', supportsThinking: true },
  ],
  perplexity: [
    { id: 'openrouter:perplexity/sonar', name: 'Sonar', supportsThinking: false },
    { id: 'openrouter:perplexity/sonar-pro', name: 'Sonar Pro', supportsThinking: false },
    { id: 'openrouter:perplexity/sonar-pro-search', name: 'Sonar Pro Search', supportsThinking: false },
    { id: 'openrouter:perplexity/sonar-deep-research', name: 'Sonar Deep Research', supportsThinking: true },
    { id: 'openrouter:perplexity/sonar-reasoning', name: 'Sonar Reasoning', supportsThinking: true },
    { id: 'openrouter:perplexity/sonar-reasoning-pro', name: 'Sonar Reasoning Pro', supportsThinking: true },
  ],
  grok: [
    { id: 'openrouter:x-ai/grok-3-mini', name: 'Grok 3 Mini', supportsThinking: false },
    { id: 'openrouter:x-ai/grok-3', name: 'Grok 3', supportsThinking: false },
    { id: 'openrouter:x-ai/grok-4-fast', name: 'Grok 4 Fast', supportsThinking: false },
    { id: 'openrouter:x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', supportsThinking: false },
    { id: 'openrouter:x-ai/grok-4', name: 'Grok 4', supportsThinking: true },
  ],
  kimi: [
    { id: 'openrouter:moonshotai/kimi-k2', name: 'Kimi K2', supportsThinking: false },
    { id: 'openrouter:moonshotai/kimi-k2-0905', name: 'Kimi K2 0905', supportsThinking: false },
    { id: 'openrouter:moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking', supportsThinking: true },
  ]
}

// Base model configurations
const MODELS = {
  chatgpt: {
    name: 'GPT-5 mini',
    icon: '/img/ChatGPT-Logo.png',
    color: '#10a37f',
    darkLogo: true,
    supportsVision: true,
    defaultVariant: 'openrouter:openai/gpt-5-mini',
    variants: MODEL_VARIANTS.chatgpt
  },
  gemini: {
    name: 'Gemini 2.5 Lite',
    icon: '/img/gemini%20Background%20Removed.png',
    color: '#4285f4',
    darkLogo: false,
    supportsVision: true,
    defaultVariant: 'openrouter:google/gemini-2.5-flash-lite',
    variants: MODEL_VARIANTS.gemini
  },
  deepseek: {
    name: 'DeepSeek Chat',
    icon: '/img/deepseek%20logo%20Background%20Removed.png',
    color: '#4D6BFE',
    darkLogo: false,
    supportsVision: false,
    defaultVariant: 'openrouter:deepseek/deepseek-chat-v3-0324',
    variants: MODEL_VARIANTS.deepseek
  },
  claude: {
    name: 'Claude',
    icon: '/img/claude%20ai%20logo%20Background%20Removed.png',
    color: '#D97757',
    darkLogo: false,
    supportsVision: true,
    defaultVariant: 'openrouter:anthropic/claude-sonnet-4.5',
    variants: MODEL_VARIANTS.claude
  },
  perplexity: {
    name: 'Perplexity',
    icon: '/img/perplexity%20Background%20Removed.png',
    color: '#20B8CD',
    darkLogo: false,
    supportsVision: true,
    defaultVariant: 'openrouter:perplexity/sonar-pro-search',
    variants: MODEL_VARIANTS.perplexity
  },
  grok: {
    name: 'Grok',
    icon: '/img/grok%20logo%20Background%20Removed.png',
    color: '#ffffff',
    darkLogo: true,
    supportsVision: true,
    defaultVariant: 'openrouter:x-ai/grok-4-fast',
    variants: MODEL_VARIANTS.grok
  },
  kimi: {
    name: 'Kimi',
    icon: '/img/kimi%20Background%20Removed(white%20theme).png',
    iconDark: '/img/images%20Background%20Removed(black%20theme).png',
    color: '#6366f1',
    darkLogo: false,
    supportsVision: true,
    defaultVariant: 'openrouter:moonshotai/kimi-k2-0905',
    variants: MODEL_VARIANTS.kimi
  }
}

const generateId = () => Math.random().toString(36).substring(2, 15)

// Helper to get current model variant info
const getVariantInfo = (modelKey, variantId, variants) => {
  // variants is now a flat array
  return variants.find(v => v.id === variantId) || variants[0]
}

const useStore = create(
  persist(
    (set, get) => ({
      // State
      theme: 'light',
      activeModels: ['chatgpt', 'gemini', 'deepseek', 'claude', 'perplexity', 'grok', 'kimi'],
      selectedVariants: {}, // { chatgpt: 'openrouter:openai/gpt-5-mini', ... }
      sidebarOpen: false,
      sidebarCollapsed: false,
      chats: [],
      currentChatId: null,
      isGenerating: false,
      abortControllers: [],
      searchQuery: '',
      editingChatId: null,
      councilMode: false,
      imageGenMode: false,
      selectedImageModel: 'flux',
      thinkingMode: false,
      webSearchMode: false,

      // Getters
      models: MODELS,
      modelVariants: MODEL_VARIANTS,
      getCurrentChat: () => get().chats.find(c => c.id === get().currentChatId),
      
      // Get the actual model ID to use for API calls
      getModelId: (modelKey) => {
        const { selectedVariants, thinkingMode } = get()
        const model = MODELS[modelKey]
        if (!model) return null
        
        const selectedId = selectedVariants[modelKey] || model.defaultVariant
        
        // If thinking mode is enabled, check if selected variant supports thinking
        if (thinkingMode) {
          const selectedVariant = model.variants.find(v => v.id === selectedId)
          // If selected variant supports thinking, use it
          if (selectedVariant?.supportsThinking) {
            return selectedId
          }
          // Otherwise, find first thinking-capable variant as fallback
          const thinkingVariant = model.variants.find(v => v.supportsThinking)
          if (thinkingVariant) {
            return thinkingVariant.id
          }
        }
        
        return selectedId
      },
      
      // Get display name for current variant
      getVariantName: (modelKey) => {
        const { selectedVariants } = get()
        const model = MODELS[modelKey]
        if (!model) return ''
        
        const selectedId = selectedVariants[modelKey] || model.defaultVariant
        const variantInfo = getVariantInfo(modelKey, selectedId, model.variants)
        return variantInfo?.name || model.name
      },

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

      setSelectedVariant: (modelKey, variantId) => {
        set(state => ({
          selectedVariants: {
            ...state.selectedVariants,
            [modelKey]: variantId
          }
        }))
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

      toggleSidebarCollapse: () => {
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }))
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

      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setEditingChatId: (chatId) => set({ editingChatId: chatId }),

      getFilteredChats: () => {
        const { chats, searchQuery } = get()
        if (!searchQuery.trim()) return chats
        const query = searchQuery.toLowerCase()
        return chats.filter(chat => 
          chat.title?.toLowerCase().includes(query) ||
          chat.messages?.some(m => m.content?.toLowerCase().includes(query))
        )
      },

      setGenerating: (isGenerating) => set({ isGenerating }),
      
      setAbortControllers: (controllers) => set({ abortControllers: controllers }),
      
      stopGenerating: () => {
        get().abortControllers.forEach(c => c.abort())
        set({ isGenerating: false, abortControllers: [] })
      },

      clearResponse: (modelKey, msgIndex) => {
        set(state => {
          const chat = state.chats.find(c => c.id === state.currentChatId)
          if (!chat) return state
          
          const responses = { ...chat.responses }
          if (responses[modelKey]) {
            delete responses[modelKey][msgIndex]
          }
          
          const updatedChat = { ...chat, responses, updatedAt: Date.now() }
          
          return {
            chats: state.chats.map(c => c.id === chat.id ? updatedChat : c)
          }
        })
      },

      toggleCouncilMode: () => set(state => ({ councilMode: !state.councilMode, imageGenMode: false })),
      setCouncilMode: (enabled) => set({ councilMode: enabled, imageGenMode: false }),
      toggleImageGenMode: () => set(state => ({ imageGenMode: !state.imageGenMode, councilMode: false })),
      setImageGenMode: (enabled) => set({ imageGenMode: enabled, councilMode: false }),
      setSelectedImageModel: (model) => set({ selectedImageModel: model }),
      toggleThinkingMode: () => set(state => ({ thinkingMode: !state.thinkingMode })),
      setThinkingMode: (enabled) => set({ thinkingMode: enabled }),
      toggleWebSearchMode: () => set(state => ({ webSearchMode: !state.webSearchMode })),
      setWebSearchMode: (enabled) => set({ webSearchMode: enabled }),

      updateCouncilResponse: (msgIndex, councilData) => {
        set(state => {
          const chat = state.chats.find(c => c.id === state.currentChatId)
          if (!chat) return state
          
          const councilResponses = { ...(chat.councilResponses || {}) }
          councilResponses[msgIndex] = councilData
          
          const updatedChat = { ...chat, councilResponses, updatedAt: Date.now() }
          
          return {
            chats: state.chats.map(c => c.id === chat.id ? updatedChat : c)
          }
        })
      },

      updateImageResponse: (msgIndex, imageData) => {
        set(state => {
          const chat = state.chats.find(c => c.id === state.currentChatId)
          if (!chat) return state
          
          const imageResponses = { ...(chat.imageResponses || {}) }
          imageResponses[msgIndex] = imageData
          
          const updatedChat = { ...chat, imageResponses, updatedAt: Date.now() }
          
          return {
            chats: state.chats.map(c => c.id === chat.id ? updatedChat : c)
          }
        })
      },

      updateWebSearchResponse: (msgIndex, searchData) => {
        set(state => {
          const chat = state.chats.find(c => c.id === state.currentChatId)
          if (!chat) return state
          
          const webSearchResponses = { ...(chat.webSearchResponses || {}) }
          webSearchResponses[msgIndex] = searchData
          
          const updatedChat = { ...chat, webSearchResponses, updatedAt: Date.now() }
          
          return {
            chats: state.chats.map(c => c.id === chat.id ? updatedChat : c)
          }
        })
      }
    }),
    {
      name: 'ai-fiesta-storage',
      partialize: (state) => ({
        theme: state.theme,
        activeModels: state.activeModels,
        selectedVariants: state.selectedVariants,
        councilMode: state.councilMode,
        imageGenMode: state.imageGenMode,
        selectedImageModel: state.selectedImageModel,
        thinkingMode: state.thinkingMode,
        webSearchMode: state.webSearchMode,
        chats: state.chats.map(chat => ({
          ...chat,
          messages: chat.messages.map(msg => ({
            ...msg,
            files: msg.files?.map(f => ({
              type: f.type,
              name: f.name,
            }))
          }))
        })),
        currentChatId: state.currentChatId
      }),
      merge: (persistedState, currentState) => {
        const allModelKeys = Object.keys(MODELS)
        let activeModels = persistedState?.activeModels || currentState.activeModels
        allModelKeys.forEach(key => {
          if (!activeModels.includes(key)) {
            activeModels = [...activeModels, key]
          }
        })
        activeModels = activeModels.filter(key => allModelKeys.includes(key))
        
        return {
          ...currentState,
          ...persistedState,
          activeModels
        }
      }
    }
  )
)

export default useStore
