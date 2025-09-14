// Main Application Controller
class AIFiestaApp {
  constructor() {
    this.isInitialized = false
  }

  async init() {
    try {
      if (!this.checkDependencies()) {
        console.error("Dependencies not loaded yet")
        return
      }

      // Show loading overlay
      window.componentManager.showLoading(true)

      // Initialize app components
      await this.initializeApp()

      // Setup global event listeners
      this.setupGlobalEventListeners()

      // Load initial data
      await this.loadInitialData()

      // Hide loading overlay
      window.componentManager.showLoading(false)

      this.isInitialized = true
      console.log("🎉 AI Fiesta initialized successfully!")
    } catch (error) {
      console.error("Failed to initialize AI Fiesta:", error)
      window.Utils.showToast("Failed to initialize application", "error")
      if (window.componentManager) {
        window.componentManager.showLoading(false)
      }
    }
  }

  checkDependencies() {
    const required = [
      "Utils",
      "themeManager",
      "storageManager",
    ]

    // ModelManager and ComponentManager will be initialized separately
    const optional = [
      "componentManager",
      "comparisonManager",
      "modelManager",
    ]

    for (const dep of required) {
      if (!window[dep]) {
        console.warn(`Missing dependency: ${dep}`)
        return false
      }
    }
    
    // Check optional dependencies but don't fail if they're not ready yet
    for (const dep of optional) {
      if (!window[dep]) {
        console.warn(`Optional dependency not ready yet: ${dep}`)
      }
    }
    return true
  }

  async initializeApp() {
    // Initialize theme
    window.themeManager.init()

    // Initialize storage
    window.storageManager.init()

    // Initialize model manager (which depends on LocalServerProvider with Netlify Functions)
    if (window.modelManager) {
      await window.modelManager.init()
      console.log("Model manager initialized successfully")
    } else {
      console.warn("Model manager not available")
    }

    // Initialize components
    window.componentManager.init()

    // Initialize comparison manager
    window.comparisonManager.init()

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts()

    // Setup responsive behavior
    this.setupResponsiveBehavior()

    // Setup performance monitoring
    this.setupPerformanceMonitoring()
  }

  // GPT4Free integration removed - using LocalServerProvider with Netlify Functions instead

  setupGlobalEventListeners() {
    // Handle app-wide events
    window.Utils.eventEmitter.on("themeChanged", (theme) => {
      console.log(`Theme changed to: ${theme}`)
    })

    window.Utils.eventEmitter.on("chatCreated", (chat) => {
      console.log("New chat created:", chat.id)
    })

    window.Utils.eventEmitter.on("settingsUpdated", (settings) => {
      console.log("Settings updated")
      this.handleSettingsUpdate(settings)
    })

    // Handle window events
    window.addEventListener("beforeunload", (e) => {
      // Save any pending data
      this.handleBeforeUnload(e)
    })

    window.addEventListener("online", () => {
      window.Utils.showToast("Connection restored", "success")
    })

    window.addEventListener("offline", () => {
      window.Utils.showToast("Connection lost - working offline", "warning")
    })

    // Handle visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.handleAppHidden()
      } else {
        this.handleAppVisible()
      }
    })
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + Enter: Send message
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        window.componentManager.sendMessage()
      }

      // Ctrl/Cmd + N: New chat
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault()
        window.componentManager.createNewChat()
      }

      // Ctrl/Cmd + ,: Open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault()
        window.componentManager.openSettingsModal()
      }

      // Ctrl/Cmd + D: Toggle theme
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault()
        window.themeManager.toggleTheme()
      }

      // Escape: Close modals
      if (e.key === "Escape") {
        const activeModal = document.querySelector(".modal-overlay.active")
        if (activeModal) {
          activeModal.classList.remove("active")
        }
      }

      // Ctrl/Cmd + K: Focus search/input
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        const messageInput = document.getElementById("messageInput")
        if (messageInput) {
          messageInput.focus()
        }
      }
    })
  }

  setupResponsiveBehavior() {
    // Handle mobile sidebar toggle
    const createMobileToggle = () => {
      if (window.innerWidth <= 767 && !document.querySelector(".mobile-toggle")) {
        const toggle = document.createElement("button")
        toggle.className = "mobile-toggle"
        toggle.innerHTML = "☰"
        toggle.style.cssText = `
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1000;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 18px;
          cursor: pointer;
        `

        toggle.addEventListener("click", () => {
          const sidebar = document.getElementById("sidebar")
          if (sidebar) {
            sidebar.classList.toggle("open")
          }
        })

        document.body.appendChild(toggle)
      } else if (window.innerWidth > 767) {
        const toggle = document.querySelector(".mobile-toggle")
        if (toggle) {
          toggle.remove()
        }
      }
    }

    // Initial check
    createMobileToggle()

    // Handle resize
    window.addEventListener(
      "resize",
      window.Utils.debounce(() => {
        createMobileToggle()
        this.handleResize()
      }, 250),
    )
  }

  setupPerformanceMonitoring() {
    // Monitor performance metrics
    if ("performance" in window) {
      // Log initial load time
      window.addEventListener("load", () => {
        const loadTime = window.performance.now()
        console.log(`App loaded in ${loadTime.toFixed(2)}ms`)
      })

      // Monitor memory usage (if available)
      if ("memory" in window.performance) {
        setInterval(() => {
          const memory = window.performance.memory
          if (memory.usedJSHeapSize > 50 * 1024 * 1024) {
            // 50MB
            console.warn("High memory usage detected:", {
              used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + "MB",
              total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + "MB",
            })
          }
        }, 30000) // Check every 30 seconds
      }
    }
  }

  async loadInitialData() {
    // Load current chat but don't auto-populate messages
    const currentChat = window.storageManager.getCurrentChat()

    // Only load model selection if chat has selected models, but don't load messages
    if (currentChat.selectedModels && currentChat.selectedModels.length > 0) {
      document.querySelectorAll(".model-pill").forEach((pill) => {
        pill.classList.toggle("active", currentChat.selectedModels.includes(pill.dataset.model))
      })
      window.componentManager.updateSelectedModels()
    } else {
      // Set default model selection for new session
      document.querySelector('.model-pill[data-model="chatgpt"]')?.classList.add("active")
      window.componentManager.updateSelectedModels()
    }

    // Load chat history (just the list, not the messages)
    window.componentManager.loadChatHistory()

    // Clear any existing comparison area content to start fresh
    if (window.componentManager) {
      window.componentManager.clearComparisonArea()
    }

    // Update token counter
    if (window.comparisonManager) {
      window.comparisonManager.updateTokenCounter()
    } else {
      console.warn("Comparison manager not available for token counter")
    }

    // Check for API keys and show setup if needed
    this.checkApiKeysSetup()
  }

  checkApiKeysSetup() {
    const settings = window.storageManager.getSettings()
    const hasAnyApiKey = Object.values(settings.apiKeys).some((key) => key && key.trim())

    if (!hasAnyApiKey) {
      setTimeout(() => {
        window.Utils.showToast("Configure API keys in Settings to start chatting", "info", 5000)
      }, 2000)
    }
  }

  handleSettingsUpdate(settings) {
    // Apply settings changes
    if (settings.preferences) {
      // Update UI based on preferences
      document.body.classList.toggle("show-metrics", settings.preferences.showMetrics)
    }
  }

  handleBeforeUnload(e) {
    // Save any pending data
    const messageInput = document.getElementById("messageInput")
    if (messageInput && messageInput.value.trim()) {
      // Save draft
      window.Utils.storage.set("messageDraft", messageInput.value)
    }

    // Cancel any active requests
    if (window.modelManager) {
      window.modelManager.cancelAllRequests()
    } else {
      console.warn("Model manager not available for request cancellation")
    }
  }

  handleAppHidden() {
    // App is hidden (tab switched, minimized, etc.)
    // Pause any non-essential operations
    console.log("App hidden - pausing operations")
  }

  handleAppVisible() {
    // App is visible again
    // Resume operations
    console.log("App visible - resuming operations")

    // Restore draft if exists
    const draft = window.Utils.storage.get("messageDraft")
    if (draft) {
      const messageInput = document.getElementById("messageInput")
      if (messageInput && !messageInput.value.trim()) {
        messageInput.value = draft
        window.componentManager.updateInputState()
        window.componentManager.autoResizeInput()
      }
      window.Utils.storage.remove("messageDraft")
    }
  }

  handleResize() {
    // Handle responsive layout changes
    const comparisonGrid = document.getElementById("comparisonGrid")
    if (comparisonGrid) {
      // Trigger reflow for grid layout
      comparisonGrid.style.display = "none"
      comparisonGrid.offsetHeight // Force reflow
      comparisonGrid.style.display = ""
    }
  }

  // Public API methods
  getAppState() {
    return {
      initialized: this.isInitialized,
      currentChat: window.storageManager.getCurrentChat(),
      settings: window.storageManager.getSettings(),
      theme: window.themeManager.getCurrentTheme(),
      activeModels: Array.from(document.querySelectorAll(".model-pill.active")).map((pill) => pill.dataset.model),
    }
  }

  exportData() {
    const data = window.storageManager.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `ai-fiesta-export-${new Date().toISOString().split("T")[0]}.json`
    a.click()

    window.URL.revokeObjectURL(url)
    window.Utils.showToast("Data exported successfully", "success")
  }

  async importData(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const success = window.storageManager.importData(data)
      if (success) {
        window.Utils.showToast("Data imported successfully", "success")
        // Reload the app
        window.location.reload()
      } else {
        window.Utils.showToast("Failed to import data", "error")
      }
    } catch (error) {
      console.error("Import error:", error)
      window.Utils.showToast("Invalid import file", "error")
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize managers in the correct order
  window.Utils = Utils;
  window.themeManager = new ThemeManager();
  window.storageManager = new StorageManager();
  // LocalServerProvider is initialized in models.js
  window.modelManager = new ModelManager();
  window.componentManager = new ComponentManager();
  window.comparisonManager = new ComparisonManager();

  // Initialize the main app after a short delay to ensure everything is ready
  setTimeout(() => {
    window.aiFiestaApp = new AIFiestaApp();
    window.aiFiestaApp.init();
  }, 500);
});

// Global error handler
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error)
  window.Utils.showToast("An unexpected error occurred", "error")
})

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason)
  window.Utils.showToast("An unexpected error occurred", "error")
})
