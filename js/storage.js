// Storage Management for Chat History and Settings
class StorageManager {
  constructor() {
    this.chatHistory = []
    this.settings = {}
    this.currentChatId = null
    this.init()
  }

  init() {
    this.loadChatHistory()
    this.loadSettings()
  }

  // Chat History Management
  loadChatHistory() {
    this.chatHistory = window.Utils.storage.get("chatHistory", [])
    this.currentChatId = window.Utils.storage.get("currentChatId", null)
  }

  saveChatHistory() {
    window.Utils.storage.set("chatHistory", this.chatHistory)
    window.Utils.storage.set("currentChatId", this.currentChatId)
  }

  createNewChat() {
    const chatId = window.Utils.generateId()
    const newChat = {
      id: chatId,
      title: "New Chat",
      messages: [],
      modelChats: {}, // Store independent chat history for each model
      createdAt: new Date(),
      updatedAt: new Date(),
      selectedModels: ["chatgpt"],
    }

    this.chatHistory.unshift(newChat)
    this.currentChatId = chatId
    this.saveChatHistory()

    window.Utils.eventEmitter.emit("chatCreated", newChat)
    return newChat
  }

  getCurrentChat() {
    if (!this.currentChatId) {
      return this.createNewChat()
    }

    return this.chatHistory.find((chat) => chat.id === this.currentChatId) || this.createNewChat()
  }

  updateCurrentChat(updates) {
    const currentChat = this.getCurrentChat()
    Object.assign(currentChat, updates, { updatedAt: new Date() })

    // Update title based on first message if not set
    if (currentChat.title === "New Chat" && currentChat.messages.length > 0) {
      const firstMessage = currentChat.messages.find((msg) => msg.role === "user")
      if (firstMessage) {
        // Try to generate a better title using Gemini API
        this.generateChatTitle(firstMessage.content, currentChat.id)
          .then(title => {
            if (title && title !== "New Chat") {
              const chat = this.chatHistory.find(c => c.id === currentChat.id)
              if (chat) {
                chat.title = title
                this.saveChatHistory()
                window.Utils.eventEmitter.emit("chatUpdated", chat)
                // Update UI
                this.updateChatTitleInUI(chat.id, title)
              }
            }
          })
          .catch(error => {
            console.log("Failed to generate chat title:", error)
            // Fallback to simple truncation
            currentChat.title = firstMessage.content.substring(0, 50) + (firstMessage.content.length > 50 ? "..." : "")
            this.saveChatHistory()
            window.Utils.eventEmitter.emit("chatUpdated", currentChat)
          })
      }
    }

    this.saveChatHistory()
    window.Utils.eventEmitter.emit("chatUpdated", currentChat)
  }

  addMessage(message) {
    const currentChat = this.getCurrentChat()
    
    // Add to global messages for UI display
    currentChat.messages.push({
      ...message,
      id: window.Utils.generateId(),
      timestamp: new Date(),
    })

    // Add to model-specific chat history if model is specified
    if (message.model) {
      if (!currentChat.modelChats[message.model]) {
        currentChat.modelChats[message.model] = {
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
      
      currentChat.modelChats[message.model].messages.push({
        role: message.role,
        content: message.content,
        timestamp: new Date(),
      })
      currentChat.modelChats[message.model].updatedAt = new Date()
    }

    this.updateCurrentChat(currentChat)
  }

  // Get conversation history for a specific model
  getModelChatHistory(modelId) {
    const currentChat = this.getCurrentChat()
    if (!currentChat.modelChats[modelId]) {
      currentChat.modelChats[modelId] = {
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
    return currentChat.modelChats[modelId].messages
  }

  // Add message to specific model's chat history
  addMessageToModel(modelId, message) {
    const currentChat = this.getCurrentChat()
    
    if (!currentChat.modelChats[modelId]) {
      currentChat.modelChats[modelId] = {
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
    
    currentChat.modelChats[modelId].messages.push({
      role: message.role,
      content: message.content,
      timestamp: new Date(),
    })
    currentChat.modelChats[modelId].updatedAt = new Date()
    
    this.updateCurrentChat(currentChat)
  }

  switchToChat(chatId) {
    const chat = this.chatHistory.find((c) => c.id === chatId)
    if (chat) {
      this.currentChatId = chatId
      this.saveChatHistory()
      window.Utils.eventEmitter.emit("chatSwitched", chat)
      return chat
    }
    return null
  }

  deleteChat(chatId) {
    this.chatHistory = this.chatHistory.filter((chat) => chat.id !== chatId)

    if (this.currentChatId === chatId) {
      this.currentChatId = this.chatHistory.length > 0 ? this.chatHistory[0].id : null
    }

    this.saveChatHistory()
    window.Utils.eventEmitter.emit("chatDeleted", chatId)
  }

  getChatHistory() {
    return this.chatHistory
  }

  searchChats(query) {
    const searchTerm = query.toLowerCase()
    return this.chatHistory.filter(
      (chat) =>
        chat.title.toLowerCase().includes(searchTerm) ||
        chat.messages.some((msg) => msg.content.toLowerCase().includes(searchTerm)),
    )
  }

  // Settings Management
  loadSettings() {
    this.settings = window.Utils.storage.get("settings", {
      apiKeys: {
        openai: "",
        anthropic: "",
        google: "",
        xai: "",
        openrouter: "",
      },
      preferences: {
        showMetrics: true,
        autoScroll: true,
        promptBoost: false,
        defaultModels: ["chatgpt"],
        theme: "light",
      },
      comparison: {
        layout: "grid",
        maxModels: 5,
        showTimings: true,
        showWordCount: true,
      },
    })
  }

  saveSettings() {
    window.Utils.storage.set("settings", this.settings)
    window.Utils.eventEmitter.emit("settingsUpdated", this.settings)
  }

  updateSettings(updates) {
    this.settings = { ...this.settings, ...updates }
    this.saveSettings()
  }

  updateApiKey(provider, key) {
    this.settings.apiKeys[provider] = key
    this.saveSettings()
  }

  getApiKey(provider) {
    return this.settings.apiKeys[provider] || ""
  }

  getSettings() {
    return this.settings
  }

  getSetting(key, defaultValue = null) {
    const keys = key.split(".")
    let value = this.settings

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) return defaultValue
    }

    return value
  }

  setSetting(key, value) {
    const keys = key.split(".")
    let current = this.settings

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    this.saveSettings()
  }

  // Export/Import functionality
  exportData() {
    return {
      chatHistory: this.chatHistory,
      settings: this.settings,
      exportDate: new Date(),
      version: "1.0",
    }
  }

  importData(data) {
    try {
      if (data.chatHistory) {
        this.chatHistory = data.chatHistory
      }
      if (data.settings) {
        this.settings = { ...this.settings, ...data.settings }
      }

      this.saveChatHistory()
      this.saveSettings()

      window.Utils.eventEmitter.emit("dataImported", data)
      return true
    } catch (error) {
      console.error("Error importing data:", error)
      return false
    }
  }

  // Generate chat title using Gemini API
  async generateChatTitle(firstMessage, chatId) {
    try {
      // Use Gemini model to generate a concise title
      const prompt = `Generate a concise, descriptive title (max 6 words) for a chat that starts with this message: "${firstMessage}"`
      
      // Use the local server provider to call Gemini
      if (window.modelManager && window.modelManager.localServerProvider) {
        return new Promise((resolve, reject) => {
          window.modelManager.localServerProvider.sendMessage(
            'gemini',
            [{ role: 'user', content: prompt }],
            () => {}, // onChunk
            (result) => {
              resolve(result.text.trim())
            },
            (error) => {
              reject(error)
            }
          )
        })
      }
      
      // Fallback: simple truncation
      return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "")
    } catch (error) {
      console.log("Error generating chat title:", error)
      // Fallback: simple truncation
      return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "")
    }
  }

  // Update chat title in UI
  updateChatTitleInUI(chatId, newTitle) {
    const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`)
    if (chatItem) {
      const titleElement = chatItem.querySelector('.chat-title')
      if (titleElement) {
        titleElement.textContent = newTitle
      }
    }
  }

  // Rename chat
  renameChat(chatId, newTitle) {
    const chat = this.chatHistory.find(c => c.id === chatId)
    if (chat && newTitle.trim()) {
      chat.title = newTitle.trim()
      chat.updatedAt = new Date()
      this.saveChatHistory()
      this.updateChatTitleInUI(chatId, newTitle.trim())
      window.Utils.eventEmitter.emit("chatUpdated", chat)
      return true
    }
    return false
  }

  // Clear all data
  clearAllData() {
    this.chatHistory = []
    this.currentChatId = null
    this.settings = {}

    window.Utils.storage.remove("chatHistory")
    window.Utils.storage.remove("currentChatId")
    window.Utils.storage.remove("settings")

    this.init()
    window.Utils.eventEmitter.emit("dataCleared")
  }
}

// Initialize storage manager
window.storageManager = new StorageManager()
