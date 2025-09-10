// Pollinations.AI Provider Integration
// Free tier models for fallback when GPT4Free/Puter is unavailable

class PollinationsProvider {
  constructor() {
    this.baseUrl = 'https://text.pollinations.ai';
    this.openaiUrl = 'https://text.pollinations.ai/openai/v1/chat/completions';
    
    // Model mappings for Pollinations.AI (anonymous tier)
    this.modelMappings = {
      // ChatGPT models -> fallback to OpenAI models
      'chatgpt': 'openai',
      'gpt-4': 'openai',
      'gpt-4o': 'openai',
      'gpt-5': 'openai',
      'gpt-5-2025-08-07': 'openai-large',
      
      // Claude models -> not available on Pollinations, will be disabled
      'claude': null,
      'claude-3-haiku': null,
      'claude-3-sonnet': null,
      'claude-3-opus': null,
      'claude-3-5-sonnet-latest': null,
      'claude-opus-4-latest': null,
      
      // Gemini models -> fallback to Gemini
      'gemini': 'gemini',
      'gemini-pro': 'gemini',
      'gemini-1.5': 'gemini',
      'gemini-2.0-flash': 'gemini',
      
      // Grok models -> fallback to Mistral
      'grok': 'mistral',
      'grok-2': 'mistral',
      'grok-3-fast': 'mistral',
      
      // DeepSeek models -> fallback to deepseek-reasoning or qwen-coder
      'deepseek': 'deepseek-reasoning',
      'deepseek-chat': 'deepseek-reasoning',
      'deepseek-v3': 'deepseek-reasoning',
      'deepseek-ai/DeepSeek-R1': 'deepseek-reasoning',
      'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free': 'deepseek-reasoning',
      'openrouter:deepseek/deepseek-chat-v3-0324:free': 'deepseek-reasoning'
    };
    
    // Available models for anonymous tier (from the provided list)
    this.availableModels = [
      'deepseek-reasoning',
      'gemini',
      'mistral',
      'nova-fast',
      'openai',
      'openai-audio',
      'openai-fast',
      'openai-large',
      'openai-reasoning',
      'qwen-coder',
      'roblox-rp',
      'bidara',
      'evil',
      'midijourney',
      'mirexa',
      'rtist',
      'unity'
    ];
  }
  
  // Check if Pollinations.AI is accessible
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.log('Pollinations.AI not available:', error.message);
      return false;
    }
  }
  
  // Map model ID to Pollinations model
  mapModel(modelId) {
    const mapped = this.modelMappings[modelId.toLowerCase()];
    if (mapped === null) {
      return null; // Model not available
    }
    return mapped || modelId; // Return mapped or original if not in mappings
  }
  
  // Send message using Pollinations.AI
  async sendMessage(modelId, messages, onChunk, onComplete, onError, enableStreaming = true) {
    try {
      const pollinationsModel = this.mapModel(modelId);
      
      if (pollinationsModel === null) {
        throw new Error(`Model ${modelId} not available on Pollinations.AI`);
      }
      
      console.log(`[Pollinations] Using model ${pollinationsModel} for ${modelId}`);
      
      // Prepare the request
      const requestBody = {
        model: pollinationsModel,
        messages: messages,
        stream: enableStreaming,
        temperature: 0.7,
        max_tokens: 2000
      };
      
      if (enableStreaming) {
        // Streaming request
        const response = await fetch(this.openaiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.error || errorMsg;
          } catch {
            errorMsg = errorText || errorMsg;
          }
          throw new Error(errorMsg);
        }
        
        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  onChunk(content, fullResponse);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        
        onComplete({
          text: fullResponse,
          model: modelId,
          provider: 'pollinations'
        });
        
      } else {
        // Non-streaming request
        const response = await fetch(this.openaiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.error || errorMsg;
          } catch {
            errorMsg = errorText || errorMsg;
          }
          throw new Error(errorMsg);
        }
        
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || '';
        
        onChunk(content, content);
        onComplete({
          text: content,
          model: modelId,
          provider: 'pollinations'
        });
      }
      
    } catch (error) {
      console.error(`[Pollinations] Error with ${modelId}:`, error);
      onError(error);
    }
  }
  
  // Get available models
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      if (response.ok) {
        const models = await response.json();
        return models.filter(m => m.tier === 'anonymous');
      }
    } catch (error) {
      console.error('[Pollinations] Failed to fetch models:', error);
    }
    return [];
  }
}

// Export for use in other modules
window.PollinationsProvider = PollinationsProvider;
