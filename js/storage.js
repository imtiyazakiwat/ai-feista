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
        currentChat.title = firstMessage.content.substring(0, 50) + (firstMessage.content.length > 50 ? "..." : "")
      }
    }

    this.saveChatHistory()
    window.Utils.eventEmitter.emit("chatUpdated", currentChat)
  }

  addMessage(message) {
    const currentChat = this.getCurrentChat()
    currentChat.messages.push({
      ...message,
      id: window.Utils.generateId(),
      timestamp: new Date(),
    })

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
