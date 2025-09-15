// Comparison Logic and Model Response Management
class ComparisonManager {
  constructor() {
    this.activeComparisons = new Map()
    this.responseData = new Map()
    this.pendingRequests = new Set() // Track pending requests to prevent duplicates
    this.init()
  }

  init() {
    this.setupEventListeners()
  }

  setupEventListeners() {
    window.Utils.eventEmitter.on("sendMessage", (data) => {
      this.handleSendMessage(data)
    })

    window.Utils.eventEmitter.on("loadChatMessages", (chat) => {
      this.loadChatMessages(chat)
    })

    // Listen for card actions
    document.addEventListener("click", (e) => {
      if (e.target.closest(".card-action-btn")) {
        this.handleCardAction(e.target.closest(".card-action-btn"))
      }
    })
  }

  async handleSendMessage({ message, models, promptBoost, streaming = true }) {
    const messageId = window.Utils.generateId()

    // Check if we already have a pending request for this message
    if (this.pendingRequests.has(messageId)) {
      console.log(`Duplicate request detected for messageId: ${messageId}, skipping`);
      return;
    }

    // Add to pending requests
    this.pendingRequests.add(messageId);

    // Enhance prompt if boost is enabled
    const enhancedMessage = promptBoost ? this.enhancePrompt(message) : message

    // Add user message to global chat for UI display
    window.storageManager.addMessage({
      role: "user",
      content: message,
      messageId,
    })

    // Add user message to each selected model's independent chat history
    models.forEach(modelId => {
      window.storageManager.addMessageToModel(modelId, {
        role: "user",
        content: message
      });
    });

    // Create comparison cards for each model
    this.createComparisonCards(models, messageId)

    // Don't pass global chat history - let each model maintain its own independent history
    // The LocalServerProvider will handle model-specific conversation history

    // Create a mapping between LocalServerProvider model IDs and our UI model IDs
    const modelIdMapping = new Map();
    const modelIds = models.map(modelId => {
      const model = window.modelManager ? window.modelManager.getModel(modelId) : null;
      const localServerModelId = model ? (model.modelId || modelId) : modelId;
      modelIdMapping.set(localServerModelId, modelId); // Map LocalServerProvider ID back to UI ID
      console.log(`Mapping UI model ${modelId} to LocalServerProvider model:`, localServerModelId);
      return localServerModelId;
    });

    try {
      // Use ModelManager directly since gpt4FreeIntegration is not available
      const promises = models.map((modelId) => this.sendToModel(modelId, [message], messageId));
      await Promise.allSettled(promises);
    } catch (error) {
      console.error("Error in comparison:", error);
    }
  }

  enhancePrompt(prompt) {
    // Simple prompt enhancement - in a real app, this could use AI
    const enhancements = [
      "Please provide a comprehensive and detailed response.",
      "Consider multiple perspectives and provide examples where relevant.",
      "Structure your response clearly with key points highlighted.",
    ]

    const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)]
    return `${prompt}\n\n${randomEnhancement}`
  }

  createComparisonCards(models, messageId) {
    const comparisonGrid = document.getElementById("comparisonGrid")
    if (!comparisonGrid) return

    console.log("Creating comparison cards for models:", models, "messageId:", messageId);

    models.forEach((modelId) => {
      // Get model with fallback
      let model = window.modelManager ? window.modelManager.getModel(modelId) : null
      
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
      
      const cardId = `card-${modelId}-${messageId}`
      console.log(`Creating card for ${modelId} with cardId: ${cardId}`);

      const cardHTML = `
        <div class="model-card" id="${cardId}" data-model="${modelId}" data-message-id="${messageId}">
          <div class="model-card-header">
            <div class="model-info">
              <div class="model-badge ${modelId}">
                <span class="model-icon">${model.icon}</span>
                ${model.name}
              </div>
            </div>
            <div class="model-status">
              <div class="status-indicator streaming" id="status-${cardId}"></div>
              <span class="response-time" id="time-${cardId}">--</span>
            </div>
          </div>
          <div class="model-card-content">
            <div class="typing-indicator" id="typing-${cardId}">
              <span>Thinking</span>
              <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
              </div>
            </div>
            <div class="response-text" id="response-${cardId}" style="display: none;"></div>
          </div>
          <div class="model-card-footer">
            <div class="response-metrics" id="metrics-${cardId}">
              <div class="metric">
                <div class="metric-value" id="words-${cardId}">0</div>
                <div class="metric-label">words</div>
              </div>
              <div class="metric">
                <div class="metric-value" id="chars-${cardId}">0</div>
                <div class="metric-label">chars</div>
              </div>
            </div>
            <div class="card-actions">
              <button class="card-action-btn" data-action="copy" data-card-id="${cardId}">
                📋 Copy
              </button>
              <button class="card-action-btn" data-action="regenerate" data-card-id="${cardId}">
                🔄 Retry
              </button>
              <button class="card-action-btn" data-action="continue" data-card-id="${cardId}">
                ➡️ Continue
              </button>
            </div>
          </div>
        </div>
      `

      comparisonGrid.insertAdjacentHTML("beforeend", cardHTML)
    })

    // Scroll to new cards
    if (window.storageManager && window.storageManager.getSetting("preferences.autoScroll", true)) {
      setTimeout(() => {
        const lastCard = comparisonGrid.lastElementChild
        if (lastCard) {
          window.Utils && window.Utils.scrollToElement && window.Utils.scrollToElement(lastCard, 100)
        }
      }, 100)
    }
  }

  formatMessagesForAPI(messages) {
    // Convert chat messages to API format
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
  }

  async sendToModel(modelId, messages, messageId) {
    const cardId = `card-${modelId}-${messageId}`
    const responseElement = document.getElementById(`response-${cardId}`)
    const typingElement = document.getElementById(`typing-${cardId}`)
    const statusElement = document.getElementById(`status-${cardId}`)
    const timeElement = document.getElementById(`time-${cardId}`)

    if (!responseElement) return

    const startTime = Date.now()
    let fullResponse = ""

    try {
      // Get the user message from the current chat for this specific messageId
      const currentChat = window.storageManager.getCurrentChat()
      const userMessage = currentChat.messages.find(msg => msg.messageId === messageId && msg.role === "user")
      
      if (!userMessage) {
        console.error(`User message not found for messageId: ${messageId}`)
        return
      }

      // Use ModelManager which handles model-specific history through LocalServerProvider
      await window.modelManager.sendMessage(
        modelId,
        [userMessage], // Pass the user message
        // onChunk
        (chunk, fullText) => {
          fullResponse = fullText

          // Hide typing indicator and show response
          if (typingElement) typingElement.style.display = "none"
          responseElement.style.display = "block"
          responseElement.textContent = fullText
          responseElement.classList.add("streaming")

          // Update metrics
          this.updateCardMetrics(cardId, fullText)

          // Update response time
          const elapsed = Date.now() - startTime
          if (timeElement) {
            timeElement.textContent = window.Utils.formatDuration(elapsed)
          }
        },
        // onComplete
        (result) => {
          // Update final state
          responseElement.classList.remove("streaming")
          if (statusElement) {
            statusElement.classList.remove("streaming")
            statusElement.classList.add("complete")
          }

          if (timeElement) {
            timeElement.textContent = window.Utils.formatDuration(result.responseTime)
          }

          // Store response data
          this.responseData.set(cardId, {
            text: result.text,
            responseTime: result.responseTime,
            wordCount: result.wordCount,
            model: modelId,
            messageId,
          })

          // Add assistant message to global chat for UI display
          window.storageManager.addMessage({
            role: "assistant",
            content: result.text,
            model: modelId,
            messageId,
            responseTime: result.responseTime,
            wordCount: result.wordCount,
          })

          // Update token counter (approximate)
          this.updateTokenCounter()
        },
        // onError
        (error) => {
          console.error(`Error with ${modelId}:`, error)

          // Show error state
          if (typingElement) typingElement.style.display = "none"
          responseElement.style.display = "block"
          responseElement.innerHTML = `
            <div style="color: var(--error); font-style: italic;">
              ❌ Error: ${error.message}
            </div>
          `

          if (statusElement) {
            statusElement.classList.remove("streaming")
            statusElement.classList.add("error")
          }

          if (timeElement) {
            timeElement.textContent = "Error"
          }
        }
      )
    } catch (error) {
      console.error(`Failed to send to ${modelId}:`, error)
    }
  }

  updateCardMetrics(cardId, text) {
    const wordsElement = document.getElementById(`words-${cardId}`)
    const charsElement = document.getElementById(`chars-${cardId}`)

    if (wordsElement) {
      const wordCount = text.trim().split(/\s+/).length
      wordsElement.textContent = window.Utils.formatNumber(wordCount)
    }

    if (charsElement) {
      charsElement.textContent = window.Utils.formatNumber(text.length)
    }
  }

  updateTokenCounter() {
    const currentChat = window.storageManager.getCurrentChat()
    let totalTokens = 0

    // Rough token estimation (1 token ≈ 4 characters)
    currentChat.messages.forEach((msg) => {
      totalTokens += Math.ceil(msg.content.length / 4)
    })

    window.componentManager.updateTokenCounter(totalTokens)
  }

  handleCardAction(button) {
    const action = button.dataset.action
    const cardId = button.dataset.cardId
    const responseData = this.responseData.get(cardId)

    if (!responseData) return

    switch (action) {
      case "copy":
        this.copyResponse(cardId, responseData.text)
        break
      case "regenerate":
        this.regenerateResponse(cardId, responseData)
        break
      case "continue":
        this.continueWithModel(cardId, responseData)
        break
    }
  }

  async copyResponse(cardId, text) {
    const success = await window.Utils.copyToClipboard(text)
    if (success) {
      window.Utils.showToast("Response copied to clipboard", "success")

      // Visual feedback
      const button = document.querySelector(`[data-card-id="${cardId}"][data-action="copy"]`)
      if (button) {
        const originalText = button.textContent
        button.textContent = "✅ Copied"
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } else {
      window.Utils.showToast("Failed to copy response", "error")
    }
  }

  async regenerateResponse(cardId, responseData) {
    const { model, messageId } = responseData

    // Reset card state
    const responseElement = document.getElementById(`response-${cardId}`)
    const typingElement = document.getElementById(`typing-${cardId}`)
    const statusElement = document.getElementById(`status-${cardId}`)

    if (responseElement) responseElement.style.display = "none"
    if (typingElement) typingElement.style.display = "block"
    if (statusElement) {
      statusElement.classList.remove("complete", "error")
      statusElement.classList.add("streaming")
    }

    // Don't pass global chat history - let the model maintain its own independent history
    // The LocalServerProvider will handle model-specific conversation history
    await this.sendToModel(model, [], messageId)
  }

  continueWithModel(cardId, responseData) {
    const { model, text } = responseData

    // Set the input to continue the conversation with this model
    const messageInput = document.getElementById("messageInput")
    if (messageInput) {
      messageInput.value = `Continue from: "${text.substring(0, 100)}..."`
      window.componentManager.updateInputState()
      window.componentManager.autoResizeInput()
    }

    // Select only this model
    document.querySelectorAll(".model-pill").forEach((pill) => {
      pill.classList.toggle("active", pill.dataset.model === model)
    })
    window.componentManager.updateSelectedModels()

    // Get model name with fallback
    let modelName = model;
    if (window.modelManager && window.modelManager.getModel(model)) {
      modelName = window.modelManager.getModel(model).name;
    } else {
      const fallbackModels = {
        "chatgpt": "ChatGPT",
        "claude": "Claude",
        "gemini": "Gemini",
        "grok": "Grok",
        "deepseek": "DeepSeek"
      };
      modelName = fallbackModels[model] || model;
    }
    
    window.Utils.showToast(`Continuing with ${modelName}`, "info")
  }

  loadChatMessages(chat) {
    const comparisonGrid = document.getElementById("comparisonGrid")
    if (!comparisonGrid) return

    comparisonGrid.innerHTML = ""

    // Group messages by messageId
    const messageGroups = new Map()
    chat.messages.forEach((msg) => {
      if (!messageGroups.has(msg.messageId)) {
        messageGroups.set(msg.messageId, [])
      }
      messageGroups.get(msg.messageId).push(msg)
    })

    // Recreate comparison cards for each message group
    messageGroups.forEach((messages, messageId) => {
      const userMessage = messages.find((m) => m.role === "user")
      const assistantMessages = messages.filter((m) => m.role === "assistant")

      if (userMessage && assistantMessages.length > 0) {
        const models = assistantMessages.map((m) => m.model)
        this.createComparisonCards(models, messageId)

        // Populate with existing responses
        assistantMessages.forEach((msg) => {
          const cardId = `card-${msg.model}-${messageId}`
          const responseElement = document.getElementById(`response-${cardId}`)
          const typingElement = document.getElementById(`typing-${cardId}`)
          const statusElement = document.getElementById(`status-${cardId}`)
          const timeElement = document.getElementById(`time-${cardId}`)

          if (responseElement) {
            responseElement.textContent = msg.content
            responseElement.style.display = "block"
          }

          if (typingElement) {
            typingElement.style.display = "none"
          }

          if (statusElement) {
            statusElement.classList.remove("streaming")
            statusElement.classList.add("complete")
          }

          if (timeElement && msg.responseTime) {
            timeElement.textContent = window.Utils.formatDuration(msg.responseTime)
          }

          // Update metrics
          this.updateCardMetrics(cardId, msg.content)

          // Store response data
          this.responseData.set(cardId, {
            text: msg.content,
            responseTime: msg.responseTime,
            wordCount: msg.wordCount,
            model: msg.model,
            messageId,
          })
        })
      }
    })

    this.updateTokenCounter()
  }

  checkMessageCompletion(messageId) {
    // Find all cards for this message
    const messageCards = document.querySelectorAll(`[data-message-id="${messageId}"]`);
    const totalCards = messageCards.length;
    let completedCards = 0;

    messageCards.forEach(card => {
      const statusElement = card.querySelector('.status-indicator');
      if (statusElement && (statusElement.classList.contains('complete') || statusElement.classList.contains('error'))) {
        completedCards++;
      }
    });

    // If all cards are completed, remove from pending requests
    if (completedCards >= totalCards && totalCards > 0) {
      console.log(`All ${totalCards} models completed for message ${messageId}`);
      this.pendingRequests.delete(messageId);
    }
  }
}

// Initialize comparison manager
window.comparisonManager = new ComparisonManager()
