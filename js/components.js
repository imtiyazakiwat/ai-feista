// UI Components and Interactions
class ComponentManager {
  constructor() {
    this.components = new Map()
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.initializeComponents()
  }

  setupEventListeners() {
    // Model pill selection
    document.addEventListener("click", (e) => {
      if (e.target.closest(".model-pill")) {
        this.handleModelPillClick(e.target.closest(".model-pill"))
      }
    })

    // Settings modal
    const settingsBtn = document.getElementById("settingsBtn")
    const settingsModal = document.getElementById("settingsModal")
    const closeSettings = document.getElementById("closeSettings")
    const saveSettings = document.getElementById("saveSettings")

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => this.openSettingsModal())
    }

    if (closeSettings) {
      closeSettings.addEventListener("click", () => this.closeSettingsModal())
    }

    if (saveSettings) {
      saveSettings.addEventListener("click", () => this.saveSettingsModal())
    }

    // Click outside modal to close
    if (settingsModal) {
      settingsModal.addEventListener("click", (e) => {
        if (e.target === settingsModal) {
          this.closeSettingsModal()
        }
      })
    }

    // New chat button
    const newChatBtn = document.querySelector(".new-chat-btn")
    if (newChatBtn) {
      newChatBtn.addEventListener("click", () => this.createNewChat())
    }

    // Input handling
    const messageInput = document.getElementById("messageInput")
    if (messageInput) {
      messageInput.addEventListener("input", () => this.handleInputChange())
      messageInput.addEventListener("keydown", (e) => this.handleInputKeydown(e))
    }

    // Send button
    const sendBtn = document.getElementById("sendBtn")
    if (sendBtn) {
      sendBtn.addEventListener("click", () => this.sendMessage())
    }

    // Voice and file buttons
    const voiceBtn = document.getElementById("voiceBtn")
    const fileBtn = document.getElementById("fileBtn")

    if (voiceBtn) {
      voiceBtn.addEventListener("click", () => this.handleVoiceInput())
    }

    if (fileBtn) {
      fileBtn.addEventListener("click", () => this.handleFileUpload())
    }

    // Prompt boost toggle
    const promptBoost = document.getElementById("promptBoost")
    if (promptBoost) {
      promptBoost.addEventListener("change", () => this.handlePromptBoostToggle())
    }

    // Streaming toggle
    const enableStreaming = document.getElementById("enableStreaming")
    if (enableStreaming) {
      enableStreaming.addEventListener("change", () => this.handleStreamingToggle())
    }

    // Scroll navigation buttons
    const scrollLeft = document.getElementById("scrollLeft")
    const scrollRight = document.getElementById("scrollRight")

    if (scrollLeft) {
      scrollLeft.addEventListener("click", () => this.scrollComparisonGrid(-500))
    }

    if (scrollRight) {
      scrollRight.addEventListener("click", () => this.scrollComparisonGrid(500))
    }

    // Rename modal Enter key handling
    const renameInput = document.getElementById("renameChatInput")
    if (renameInput) {
      renameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.confirmRename()
        }
      })
    }

    // Escape key handling for modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeRenameModal()
        this.closeDeleteModal()
      }
    })
  }

  initializeComponents() {
    // Disable dynamic model loading - use only the 5 hardcoded models
    this.updateSelectedModels()
    this.loadChatHistory()
    this.updateInputState()
  }

  handleModelPillClick(pill) {
    const modelId = pill.dataset.model
    const isActive = pill.classList.contains("active")

    if (isActive) {
      // Don't allow deselecting if it's the only active model
      const activeModels = document.querySelectorAll(".model-pill.active")
      if (activeModels.length <= 1) {
        window.Utils.showToast("At least one model must be selected", "warning")
        return
      }
      pill.classList.remove("active")
    } else {
      // Don't allow more than 5 models
      const activeModels = document.querySelectorAll(".model-pill.active")
      if (activeModels.length >= 5) {
        window.Utils.showToast("Maximum 5 models can be selected", "warning")
        return
      }
      pill.classList.add("active")
    }

    this.updateSelectedModels()

    // Add visual feedback
    pill.style.transform = "scale(0.95)"
    setTimeout(() => {
      pill.style.transform = ""
    }, 150)
  }

  updateSelectedModels() {
    const activeModels = Array.from(document.querySelectorAll(".model-pill.active")).map((pill) => pill.dataset.model)

    const modelBadges = document.getElementById("modelBadges")
    if (modelBadges) {
      modelBadges.innerHTML = activeModels
        .map((modelId) => {
          // Get model info with fallback
          let model;
          if (window.modelManager && window.modelManager.getModel) {
            model = window.modelManager.getModel(modelId)
          }
          
          // Fallback model info if modelManager is not ready
          if (!model) {
            const fallbackModels = {
              "chatgpt": { name: "ChatGPT", color: "#00A67E", icon: "🤖" },
              "claude": { name: "Claude", color: "#D97706", icon: "🧠" },
              "gemini": { name: "Gemini", color: "#4285F4", icon: "💎" },
              "grok": { name: "Grok", color: "#1DA1F2", icon: "⚡" },
              "deepseek": { name: "DeepSeek", color: "#8B5CF6", icon: "🔍" }
            };
            model = fallbackModels[modelId] || { name: modelId, color: "#6366F1", icon: "🤖" };
          }
          
          return `
          <span class="model-badge ${modelId}" style="background: ${model.color}">
            ${model.icon} ${model.name}
          </span>
        `
        })
        .join("")
    }

    // Update current chat's selected models
    if (window.storageManager) {
      const currentChat = window.storageManager.getCurrentChat()
      currentChat.selectedModels = activeModels
      window.storageManager.updateCurrentChat(currentChat)
    }
  }

  openSettingsModal() {
    const modal = document.getElementById("settingsModal")
    if (modal) {
      modal.classList.add("active")
      this.loadSettingsIntoModal()
    }
  }

  closeSettingsModal() {
    const modal = document.getElementById("settingsModal")
    if (modal) {
      modal.classList.remove("active")
    }
  }

  loadSettingsIntoModal() {
    const settings = window.storageManager.getSettings()

    // Load API keys
    const apiKeyInputs = {
      openaiKey: settings.apiKeys.openai,
      anthropicKey: settings.apiKeys.anthropic,
      googleKey: settings.apiKeys.google,
      xaiKey: settings.apiKeys.xai,
      openrouterKey: settings.apiKeys.openrouter,
    }

    Object.entries(apiKeyInputs).forEach(([inputId, value]) => {
      const input = document.getElementById(inputId)
      if (input) input.value = value || ""
    })

    // Load preferences
    const showMetrics = document.getElementById("showMetrics")
    const autoScroll = document.getElementById("autoScroll")

    if (showMetrics) showMetrics.checked = settings.preferences.showMetrics
    if (autoScroll) autoScroll.checked = settings.preferences.autoScroll
  }

  saveSettingsModal() {
    const settings = window.storageManager.getSettings()

    // Save API keys
    const apiKeyInputs = {
      openaiKey: "openai",
      anthropicKey: "anthropic",
      googleKey: "google",
      xaiKey: "xai",
      openrouterKey: "openrouter",
    }

    Object.entries(apiKeyInputs).forEach(([inputId, provider]) => {
      const input = document.getElementById(inputId)
      if (input) {
        settings.apiKeys[provider] = input.value.trim()
      }
    })

    // Save preferences
    const showMetrics = document.getElementById("showMetrics")
    const autoScroll = document.getElementById("autoScroll")

    if (showMetrics) settings.preferences.showMetrics = showMetrics.checked
    if (autoScroll) settings.preferences.autoScroll = autoScroll.checked

    window.storageManager.updateSettings(settings)
    this.closeSettingsModal()
    window.Utils.showToast("Settings saved successfully", "success")
  }

  createNewChat() {
    const newChat = window.storageManager.createNewChat()
    this.loadChatHistory()
    this.clearComparisonArea()
    this.clearInputArea()

    // Reset to default model selection
    document.querySelectorAll(".model-pill").forEach((pill) => {
      pill.classList.remove("active")
    })
    document.querySelector('.model-pill[data-model="chatgpt"]')?.classList.add("active")
    this.updateSelectedModels()

    // Clear the input field
    const messageInput = document.getElementById("messageInput")
    if (messageInput) {
      messageInput.value = ""
      messageInput.style.height = "50px"
      this.updateInputState()
    }

    window.Utils.showToast("New chat created", "success")
  }

  clearInputArea() {
    const messageInput = document.getElementById("messageInput")
    if (messageInput) {
      messageInput.value = ""
      messageInput.style.height = "50px"
      this.updateInputState()
    }
  }

  scrollComparisonGrid(distance) {
    const comparisonGrid = document.getElementById("comparisonGrid")
    if (comparisonGrid) {
      const currentScroll = comparisonGrid.scrollLeft
      const targetScroll = currentScroll + distance

      comparisonGrid.scrollTo({
        left: targetScroll,
        behavior: "smooth"
      })
    }
  }

  handleStreamingToggle() {
    const enableStreaming = document.getElementById("enableStreaming")
    if (enableStreaming) {
      const isEnabled = enableStreaming.checked
      window.Utils.showToast(`Streaming ${isEnabled ? 'enabled' : 'disabled'}`, "info")
    }
  }

  isStreamingEnabled() {
    const enableStreaming = document.getElementById("enableStreaming")
    return enableStreaming ? enableStreaming.checked : true // Default to true
  }

  loadChatHistory() {
    const chatList = document.getElementById("chatList")
    const chatHistory = window.storageManager.getChatHistory()
    const currentChatId = window.storageManager.currentChatId

    if (chatList) {
      chatList.innerHTML = chatHistory
        .map(
          (chat) => `
        <div class="chat-item ${chat.id === currentChatId ? "active" : ""}" data-chat-id="${chat.id}">
          <div class="chat-content" onclick="window.componentManager.switchToChat('${chat.id}')">
            <div class="chat-title">${window.Utils.sanitizeHtml(chat.title)}</div>
            <div class="chat-preview">${window.Utils.formatDate(new Date(chat.updatedAt))}</div>
          </div>
          <div class="chat-actions">
            <button class="chat-action-btn" onclick="event.stopPropagation(); window.componentManager.openRenameModal('${chat.id}', '${chat.title.replace(/'/g, "\\'")}')" title="Rename chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="chat-action-btn danger" onclick="event.stopPropagation(); window.componentManager.openDeleteModal('${chat.id}')" title="Delete chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
      `,
        )
        .join("")

      // Add click listeners to chat items
      chatList.addEventListener("click", (e) => {
        const chatItem = e.target.closest(".chat-item")
        if (chatItem && !e.target.closest(".chat-actions")) {
          this.switchToChat(chatItem.dataset.chatId)
        }
      })
    }
  }

  switchToChat(chatId) {
    const chat = window.storageManager.switchToChat(chatId)
    if (chat) {
      this.loadChatHistory()
      this.loadChatMessages(chat)

      // Update model selection
      document.querySelectorAll(".model-pill").forEach((pill) => {
        pill.classList.toggle("active", chat.selectedModels.includes(pill.dataset.model))
      })
      this.updateSelectedModels()
    }
  }

  loadChatMessages(chat) {
    // This will be implemented by the comparison manager
    window.Utils.eventEmitter.emit("loadChatMessages", chat)
  }

  clearComparisonArea() {
    const comparisonGrid = document.getElementById("comparisonGrid")
    if (comparisonGrid) {
      comparisonGrid.innerHTML = ""
    }
  }

  handleInputChange() {
    this.updateInputState()
    this.autoResizeInput()
  }

  handleInputKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      this.sendMessage()
    }
  }

  autoResizeInput() {
    const input = document.getElementById("messageInput")
    if (input) {
      input.style.height = "auto"
      input.style.height = Math.min(input.scrollHeight, 120) + "px"
    }
  }

  updateInputState() {
    const input = document.getElementById("messageInput")
    const sendBtn = document.getElementById("sendBtn")

    if (input && sendBtn) {
      const hasText = input.value.trim().length > 0
      sendBtn.disabled = !hasText

      if (hasText) {
        sendBtn.classList.add("active")
      } else {
        sendBtn.classList.remove("active")
      }
    }
  }

  sendMessage() {
    const input = document.getElementById("messageInput")
    const message = input?.value.trim()

    if (!message) return

    const activeModels = Array.from(document.querySelectorAll(".model-pill.active")).map((pill) => pill.dataset.model)

    if (activeModels.length === 0) {
      window.Utils.showToast("Please select at least one model", "warning")
      return
    }

    // Clear input
    input.value = ""
    this.updateInputState()
    this.autoResizeInput()

    // Send to comparison manager
    window.Utils.eventEmitter.emit("sendMessage", {
      message,
      models: activeModels,
      promptBoost: document.getElementById("promptBoost")?.checked || false,
      streaming: this.isStreamingEnabled(),
    })
  }

  handleVoiceInput() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      const voiceBtn = document.getElementById("voiceBtn")
      voiceBtn.style.background = "var(--primary)"
      voiceBtn.style.color = "white"

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        const input = document.getElementById("messageInput")
        if (input) {
          input.value = transcript
          this.updateInputState()
          this.autoResizeInput()
        }
      }

      recognition.onerror = (event) => {
        window.Utils.showToast("Voice recognition error: " + event.error, "error")
      }

      recognition.onend = () => {
        voiceBtn.style.background = ""
        voiceBtn.style.color = ""
      }

      recognition.start()
    } else {
      window.Utils.showToast("Voice recognition not supported in this browser", "warning")
    }
  }

  handleFileUpload() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".txt,.md,.json,.csv"

    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target.result
          const messageInput = document.getElementById("messageInput")
          if (messageInput) {
            messageInput.value = `File: ${file.name}\n\n${content}`
            this.updateInputState()
            this.autoResizeInput()
          }
        }
        reader.readAsText(file)
      }
    }

    input.click()
  }

  handlePromptBoostToggle() {
    const promptBoost = document.getElementById("promptBoost")
    const isEnabled = promptBoost?.checked || false

    window.storageManager.setSetting("preferences.promptBoost", isEnabled)

    if (isEnabled) {
      window.Utils.showToast("Prompt boost enabled ✨", "info")
    }
  }

  // Chat rename and delete functionality
  openRenameModal(chatId, currentTitle) {
    this.currentEditingChatId = chatId
    const modal = document.getElementById("renameChatModal")
    const input = document.getElementById("renameChatInput")
    
    if (modal && input) {
      input.value = currentTitle
      modal.classList.add("active")
      
      // Focus input
      setTimeout(() => {
        input.focus()
        input.select()
      }, 100)
    }
  }

  closeRenameModal() {
    const modal = document.getElementById("renameChatModal")
    if (modal) {
      modal.classList.remove("active")
    }
    this.currentEditingChatId = null
  }

  confirmRename() {
    if (!this.currentEditingChatId) return
    
    const input = document.getElementById("renameChatInput")
    const newTitle = input?.value.trim()
    
    if (newTitle && window.storageManager.renameChat(this.currentEditingChatId, newTitle)) {
      window.Utils.showToast("Chat renamed successfully", "success")
      this.loadChatHistory()
    } else {
      window.Utils.showToast("Failed to rename chat", "error")
    }
    
    this.closeRenameModal()
  }

  openDeleteModal(chatId) {
    this.currentDeletingChatId = chatId
    const modal = document.getElementById("deleteChatModal")
    if (modal) {
      modal.classList.add("active")
    }
  }

  closeDeleteModal() {
    const modal = document.getElementById("deleteChatModal")
    if (modal) {
      modal.classList.remove("active")
    }
    this.currentDeletingChatId = null
  }

  confirmDelete() {
    if (!this.currentDeletingChatId) return
    
    const chatId = this.currentDeletingChatId
    const currentChatId = window.storageManager.currentChatId
    
    // Delete the chat
    window.storageManager.deleteChat(chatId)
    
    // If deleting current chat, create new one
    if (chatId === currentChatId) {
      this.createNewChat()
    }
    
    this.loadChatHistory()
    this.closeDeleteModal()
    window.Utils.showToast("Chat deleted successfully", "success")
  }

  // Utility methods for other components
  showLoading(show = true) {
    const loadingOverlay = document.getElementById("loadingOverlay")
    if (loadingOverlay) {
      loadingOverlay.classList.toggle("active", show)
    }
  }

  updateTokenCounter(count) {
    const tokenCount = document.querySelector(".token-count")
    if (tokenCount) {
      tokenCount.textContent = window.Utils.formatNumber(count)

      // Add warning color if high usage
      const tokenCounter = document.querySelector(".token-counter")
      if (tokenCounter) {
        tokenCounter.classList.toggle("warning", count > 50000)
      }
    }
  }
}

// Initialize component manager
window.componentManager = new ComponentManager()
