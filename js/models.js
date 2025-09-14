// AI Models Integration and API Management using LocalServerProvider with Netlify Functions
class ModelManager {
  constructor() {
    this.models = {}
    this.activeRequests = new Map()
    this.localServerProvider = null
    this.providerLoaded = false
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
    // Initialize LocalServerProvider for CORS-free API calls via Netlify Functions
    console.log("Initializing LocalServerProvider with Netlify Functions for CORS-free API calls");
    this.localServerProvider = new LocalServerProvider();
    await this.localServerProvider.initializeTokens();
    this.loadModelsFromLocalServerProvider();
    this.providerLoaded = true;
    
    // Ensure modelManager is available globally
    if (window.modelManager) {
      window.modelManager.models = this.models;
    }
  }

  loadModelsFromLocalServerProvider() {
    try {
      console.log("Loading models from LocalServerProvider");
      
      const availableModels = this.localServerProvider.getAvailableModels();
      console.log("Available models from LocalServerProvider:", availableModels);

      // Convert LocalServerProvider models to our format
      this.models = {};

      // Default colors for models
      const modelColors = [
        "#00A67E", "#D97706", "#4285F4", "#1DA1F2",
        "#8B5CF6", "#EF4444", "#10B981", "#F59E0B"
      ];

      // Default icons for models
      const modelIcons = ["🤖", "🧠", "💎", "⚡", "🔍", "🎯", "🚀", "🌟"];

      availableModels.forEach((model, index) => {
        const modelId = model.id;
        const modelName = model.name;

        this.models[modelId] = {
          name: modelName,
          modelId: model.modelId,
          color: modelColors[index % modelColors.length],
          icon: modelIcons[index % modelIcons.length],
          provider: "localserver"
        };
      });

      console.log("Loaded models from LocalServerProvider:", this.models);
    } catch (error) {
      console.error("Error loading models from LocalServerProvider:", error);
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
        provider: "localserver"
      },
      "claude": {
        name: "Claude",
        modelId: "claude-3-haiku",
        color: "#D97706",
        icon: "🧠",
        provider: "localserver"
      },
      "gemini": {
        name: "Gemini",
        modelId: "gemini-pro",
        color: "#4285F4",
        icon: "💎",
        provider: "localserver"
      },
      "grok": {
        name: "Grok",
        modelId: "grok-2",
        color: "#1DA1F2",
        icon: "⚡",
        provider: "localserver"
      },
      "deepseek": {
        name: "DeepSeek",
        modelId: "deepseek-chat",
        color: "#8B5CF6",
        icon: "🔍",
        provider: "localserver"
      },
      // Pollinations fallback models
      "deepseek-reasoning": {
        name: "DeepSeek Reasoning",
        modelId: "deepseek-reasoning",
        color: "#8B5CF6",
        icon: "🔍",
        provider: "pollinations"
      },
      "gemini-2.5-flash-lite": {
        name: "Gemini 2.5 Flash Lite",
        modelId: "gemini",
        color: "#4285F4",
        icon: "💎",
        provider: "pollinations"
      },
      "mistral-small-3.1-24b": {
        name: "Mistral Small 3.1",
        modelId: "mistral",
        color: "#10B981",
        icon: "🌿",
        provider: "pollinations"
      },
      "nova-micro-v1": {
        name: "Amazon Nova Micro",
        modelId: "nova-fast",
        color: "#F59E0B",
        icon: "🚀",
        provider: "pollinations"
      },
      "gpt-5-nano": {
        name: "OpenAI GPT-5 Nano",
        modelId: "openai-fast",
        color: "#00A67E",
        icon: "🤖",
        provider: "pollinations"
      },
      "gpt-4.1": {
        name: "OpenAI GPT-4.1",
        modelId: "openai-large",
        color: "#00A67E",
        icon: "🤖",
        provider: "pollinations"
      },
      "o4-mini": {
        name: "OpenAI o4-mini",
        modelId: "openai-reasoning",
        color: "#00A67E",
        icon: "🤖",
        provider: "pollinations"
      },
      "qwen2.5-coder-32b": {
        name: "Qwen 2.5 Coder",
        modelId: "qwen-coder",
        color: "#8B5CF6",
        icon: "💻",
        provider: "pollinations"
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
        provider: "localserver"
      },
      "claude": {
        name: "Claude",
        modelId: "claude-3-haiku", // This seems to work
        color: "#D97706",
        icon: "🧠",
        provider: "localserver"
      },
      "gemini": {
        name: "Gemini",
        modelId: "gemini-pro", // Use basic gemini-pro
        color: "#4285F4",
        icon: "💎",
        provider: "localserver"
      },
      "grok": {
        name: "Grok",
        modelId: "grok-2", // Use basic grok model
        color: "#1DA1F2",
        icon: "⚡",
        provider: "localserver"
      },
      "deepseek": {
        name: "DeepSeek",
        modelId: "deepseek-chat", // This seems to work
        color: "#8B5CF6",
        icon: "🔍",
        provider: "localserver"
      }
    };
  }

  async sendMessage(modelId, messages, onChunk, onComplete, onError) {
    if (!this.providerLoaded || !this.localServerProvider) {
      onError(new Error("LocalServerProvider not loaded yet"));
      return;
    }

    const model = this.models[modelId];
    if (!model) {
      onError(new Error(`Model ${modelId} not found`));
      return;
    }

    const requestId = window.Utils.generateId();
    const startTime = Date.now();

    try {
      // Pass the entire conversation history to LocalServerProvider
      await this.localServerProvider.sendMessage(
        modelId,
        messages, // Pass the full conversation history
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
