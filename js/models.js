// AI Models Integration and API Management using GPT4Free
class ModelManager {
  constructor() {
    this.models = {}
    this.activeRequests = new Map()
    this.storageManager = {} // Declare storageManager
    this.Utils = {} // Declare Utils
    this.gpt4FreeLoaded = false
  }

  getModel(modelId) {
    return this.models[modelId]
  }

  getAllModels() {
    return this.models
  }

  getModelColor(modelId) {
    return this.models[modelId]?.color || "#6366F1"
  }

  getModelIcon(modelId) {
    return this.models[modelId]?.icon || "🤖"
  }

  async init() {
    // Always use the hardcoded models only to avoid dynamic loading issues
    console.log("Using hardcoded models only");
    this.loadModelsFromGPT4Free();
    this.gpt4FreeLoaded = true; // Set to true so sendMessage works
    
    // Ensure modelManager is available globally
    if (window.modelManager) {
      window.modelManager.models = this.models;
    }
  }

  async loadModelsFromGPT4Free() {
    try {
      // Wait for GPT4Free to be ready
      let attempts = 0;
      while (!window.gpt4FreeIntegration || !window.gpt4FreeIntegration.getAvailableModels) {
        if (attempts > 50) { // 5 seconds timeout
          throw new Error("GPT4Free integration not available");
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      const availableModels = window.gpt4FreeIntegration.getAvailableModels();
      console.log("Available models from GPT4Free:", availableModels);

      // Convert GPT4Free models to our format
      this.models = {};

      // Default colors for models
      const modelColors = [
        "#00A67E", "#D97706", "#4285F4", "#1DA1F2",
        "#8B5CF6", "#EF4444", "#10B981", "#F59E0B"
      ];

      // Default icons for models
      const modelIcons = ["🤖", "🧠", "💎", "⚡", "🔍", "🎯", "🚀", "🌟"];

      // Map known model patterns to our standard models
      const modelMappings = {
        'gpt-4o': 'chatgpt',
        'gpt-4': 'chatgpt',
        'gpt-3.5-turbo': 'chatgpt',
        'claude-3-haiku': 'claude',
        'claude-3-sonnet': 'claude',
        'claude-3-opus': 'claude',
        'gemini-pro': 'gemini',
        'gemini-1.5': 'gemini',
        'grok': 'grok',
        'grok-2': 'grok',
        'deepseek': 'deepseek',
        'deepseek-chat': 'deepseek'
      };

      availableModels.forEach((model, index) => {
        const modelId = typeof model === 'string' ? model : (model.id || model.model);
        const modelName = typeof model === 'string' ? model : (model.name || model.id || model.model);

        // Try to map to our standard model names
        let mappedId = null;
        for (const [pattern, standardId] of Object.entries(modelMappings)) {
          if (modelId.toLowerCase().includes(pattern.toLowerCase())) {
            mappedId = standardId;
            break;
          }
        }

        // If we found a mapping, use it; otherwise create a generic ID
        const niceId = mappedId || modelName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        // Only add if we don't already have this model
        if (!this.models[niceId]) {
          this.models[niceId] = {
            name: modelName,
            modelId: modelId,
            color: modelColors[Object.keys(this.models).length % modelColors.length],
            icon: modelIcons[Object.keys(this.models).length % modelIcons.length],
            provider: "gpt4free"
          };
        }
      });

      // Ensure we have our core models, even if they're not in the available list
      const coreModels = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'];
      coreModels.forEach(coreModel => {
        if (!this.models[coreModel]) {
          console.log(`Adding fallback for core model: ${coreModel}`);
          this.models[coreModel] = this.getFallbackModel(coreModel);
        }
      });

      console.log("Loaded models:", this.models);
    } catch (error) {
      console.error("Error loading models from GPT4Free:", error);
      this.loadFallbackModels();
    }
  }

  getFallbackModel(modelName) {
    const fallbackModels = {
      "chatgpt": {
        name: "ChatGPT",
        modelId: "gpt-4",
        color: "#00A67E",
        icon: "🤖",
        provider: "gpt4free"
      },
      "claude": {
        name: "Claude",
        modelId: "claude-3-haiku",
        color: "#D97706",
        icon: "🧠",
        provider: "gpt4free"
      },
      "gemini": {
        name: "Gemini",
        modelId: "gemini-pro",
        color: "#4285F4",
        icon: "💎",
        provider: "gpt4free"
      },
      "grok": {
        name: "Grok",
        modelId: "grok-2",
        color: "#1DA1F2",
        icon: "⚡",
        provider: "gpt4free"
      },
      "deepseek": {
        name: "DeepSeek",
        modelId: "deepseek-chat",
        color: "#8B5CF6",
        icon: "🔍",
        provider: "gpt4free"
      }
    };

    return fallbackModels[modelName] || fallbackModels["chatgpt"];
  }

  loadFallbackModels() {
    // Use working model IDs - these should match what's actually available in GPT4Free
    this.models = {
      "chatgpt": {
        name: "ChatGPT",
        modelId: "gpt-4", // Use basic GPT-4 which should be more reliable
        color: "#00A67E",
        icon: "🤖",
        provider: "gpt4free"
      },
      "claude": {
        name: "Claude",
        modelId: "claude-3-haiku", // This seems to work
        color: "#D97706",
        icon: "🧠",
        provider: "gpt4free"
      },
      "gemini": {
        name: "Gemini",
        modelId: "gemini-pro", // Use basic gemini-pro
        color: "#4285F4",
        icon: "💎",
        provider: "gpt4free"
      },
      "grok": {
        name: "Grok",
        modelId: "grok-2", // Use basic grok model
        color: "#1DA1F2",
        icon: "⚡",
        provider: "gpt4free"
      },
      "deepseek": {
        name: "DeepSeek",
        modelId: "deepseek-chat", // This seems to work
        color: "#8B5CF6",
        icon: "🔍",
        provider: "gpt4free"
      }
    };
  }

  async sendMessage(modelId, messages, onChunk, onComplete, onError) {
    if (!this.gpt4FreeLoaded) {
      onError(new Error("Models not loaded yet"));
      return;
    }

    const model = this.models[modelId];
    if (!model) {
      onError(new Error(`Model ${modelId} not found`));
      return;
    }

    const requestId = this.Utils.generateId();
    const startTime = Date.now();

    try {
      // Use GPT4Free integration to send message
      if (window.gpt4FreeIntegration) {
        // Get the last user message
        const lastUserMessage = messages[messages.length - 1];
        const userMessageContent = lastUserMessage.role === 'user' ? lastUserMessage.content : '';
        
        // Send to GPT4Free
        await window.gpt4FreeIntegration.sendMessageToModel(
          model.modelId,
          userMessageContent,
          // onChunk
          (chunk, fullText) => {
            onChunk(chunk, fullText);
          },
          // onComplete
          (result) => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            onComplete({
              text: result.text,
              responseTime,
              wordCount: result.text.split(/\s+/).length,
              model: modelId,
            });
          },
          // onError
          (error) => {
            onError(error);
          }
        );
      } else {
        throw new Error("GPT4Free integration not available");
      }
    } catch (error) {
      console.error(`Error with ${modelId}:`, error);
      onError(error);
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  parseStreamChunk(line, modelId) {
    const model = this.models[modelId]

    try {
      // Handle different streaming formats
      if (modelId === "gemini") {
        // Gemini uses a different streaming format
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6))
          return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
        }
      } else if (modelId === "claude") {
        // Claude uses event-stream format
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6))
          if (data.type === "content_block_delta") {
            return data.delta?.text || ""
          }
        }
      } else {
        // OpenAI-compatible format (ChatGPT, Grok, DeepSeek)
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6)
          if (dataStr === "[DONE]") return null

          const data = JSON.parse(dataStr)
          return data.choices?.[0]?.delta?.content || ""
        }
      }
    } catch (error) {
      console.warn("Error parsing stream chunk:", error)
    }

    return null
  }

  cancelRequest(requestId) {
    const request = this.activeRequests.get(requestId)
    if (request && request.response) {
      try {
        request.response.body.cancel()
      } catch (error) {
        console.warn("Error cancelling request:", error)
      }
      this.activeRequests.delete(requestId)
    }
  }

  cancelAllRequests() {
    for (const [requestId] of this.activeRequests) {
      this.cancelRequest(requestId)
    }
  }

  // Test API key validity
  async testApiKey(provider, apiKey) {
    const testModel = Object.values(this.models).find((m) => m.provider === provider)
    if (!testModel) return false

    try {
      const testMessages = [{ role: "user", content: "Hello" }]

      let endpoint = testModel.endpoint
      const requestBody = testModel.formatRequest(testMessages)

      if (testModel.getEndpoint) {
        endpoint = testModel.getEndpoint(apiKey)
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: testModel.headers(apiKey),
        body: JSON.stringify({ ...requestBody, stream: false, max_tokens: 1 }),
      })

      return response.ok
    } catch (error) {
      console.error("API key test failed:", error)
      return false
    }
  }

  // Get model capabilities
  getModelCapabilities(modelId) {
    const capabilities = {
      chatgpt: ["text", "code", "analysis", "creative"],
      claude: ["text", "analysis", "creative", "safety"],
      gemini: ["text", "multimodal", "code", "analysis"],
      grok: ["text", "humor", "realtime", "creative"],
      deepseek: ["code", "math", "reasoning", "analysis"],
    }

    return capabilities[modelId] || ["text"]
  }

  // Get recommended models for specific tasks
  getRecommendedModels(task) {
    const recommendations = {
      coding: ["deepseek", "chatgpt", "claude"],
      creative: ["claude", "chatgpt", "grok"],
      analysis: ["claude", "chatgpt", "deepseek"],
      general: ["chatgpt", "claude", "gemini"],
      humor: ["grok", "chatgpt"],
      math: ["deepseek", "chatgpt", "claude"],
    }

    return recommendations[task] || ["chatgpt", "claude"]
  }
}

// Initialize model manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.modelManager = new ModelManager();
  // Initialize after a short delay to ensure GPT4Free is loaded
  setTimeout(() => {
    window.modelManager.init();
  }, 1000);
});
