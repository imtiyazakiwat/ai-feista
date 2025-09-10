// Local Server Provider for AI Models
class LocalServerProvider {
  constructor() {
    this.baseUrl = 'http://13.61.23.21:8080/v1';
    this.pollinationsUrl = 'https://text.pollinations.ai/openai';
    this.authTokens = []; // Array of available tokens
    this.currentTokenIndex = 0;
    this.validTokens = []; // Working tokens after validation
    this.authToken = null; // Current active token
    this.initializeTokens();
    
    // Model configurations
    this.modelConfigs = {
      'chatgpt': {
        modelId: 'gpt-5-2025-08-07',
        name: 'ChatGPT (GPT-5)',
        requiresAuth: true,
        provider: 'PuterJS'
      },
      'claude': {
        modelId: 'claude-3.7-sonnet-thinking',
        name: 'Claude 3.7 Sonnet',
        requiresAuth: true,
        provider: 'PuterJS'
      },
      'gemini': {
        modelId: 'gemini',
        name: 'Gemini 2.5 Flash',
        requiresAuth: false,
        usePollinations: true,
        provider: 'Pollinations'
      },
      'grok': {
        modelId: 'grok-3-fast',
        name: 'Grok 3 Fast',
        requiresAuth: true,  // This model requires auth
        provider: 'PuterJS'  // Use PuterJS provider like ChatGPT and Claude
      },
      'deepseek': {
        modelId: 'deepseek-v3-0324',
        name: 'DeepSeek V3',
        requiresAuth: false,
        provider: 'DeepInfra'
      }
    };
  }

  async initializeTokens() {
    // Try to load tokens from localStorage first
    const storedTokens = localStorage.getItem('validApiTokens');
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        if (parsed.tokens && parsed.timestamp) {
          // Check if tokens are less than 24 hours old
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            this.validTokens = parsed.tokens;
            this.authToken = this.validTokens[0];
            console.log(`[LocalServer] Loaded ${this.validTokens.length} valid tokens from cache`);
            return;
          }
        }
      } catch (e) {
        console.log('[LocalServer] Failed to parse stored tokens');
      }
    }

    // Load tokens from api.txt file
    try {
      const response = await fetch('api.txt');
      if (response.ok) {
        const text = await response.text();
        const tokens = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('eyJ')); // JWT tokens start with eyJ
        
        this.authTokens = tokens;
        console.log(`[LocalServer] Loaded ${tokens.length} tokens from api.txt`);
        
        // Validate all tokens in parallel
        await this.validateTokens();
      }
    } catch (error) {
      console.log('[LocalServer] Could not load api.txt, using default token');
      // Fallback to a default token
      this.authTokens = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6IlYyaG1GM3U4VEpHNXFiNURieUlLM0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6ImhyWWJtT29TZFBIOGJQbU4wc2owNGc9PSIsImlhdCI6MTc1NzUwMzE5MH0.yGGnALj9j5aQsZeS59xT5glNfwezMxC3w2oxqiCUpo0'];
      this.validTokens = this.authTokens;
      this.authToken = this.authTokens[0];
    }
  }

  async validateTokens() {
    console.log('[LocalServer] Validating API tokens...');
    const validationPromises = this.authTokens.map(async (token, index) => {
      try {
        // Simple validation request with 5 second timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
            stream: false
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok || response.status === 429) { // 429 means rate limited but valid
          console.log(`[LocalServer] Token ${index + 1} is valid`);
          return token;
        } else {
          console.log(`[LocalServer] Token ${index + 1} is invalid (${response.status})`);
          return null;
        }
      } catch (error) {
        console.log(`[LocalServer] Token ${index + 1} validation failed:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(validationPromises);
    this.validTokens = results.filter(token => token !== null);
    
    if (this.validTokens.length > 0) {
      this.authToken = this.validTokens[0];
      console.log(`[LocalServer] ${this.validTokens.length} valid tokens available`);
      
      // Store valid tokens in localStorage
      localStorage.setItem('validApiTokens', JSON.stringify({
        tokens: this.validTokens,
        timestamp: Date.now()
      }));
    } else {
      console.warn('[LocalServer] No valid tokens found, using fallback');
      this.authToken = this.authTokens[0]; // Use first token as fallback
    }
  }

  rotateToken() {
    if (this.validTokens.length <= 1) {
      console.log('[LocalServer] No other tokens to rotate to');
      return false;
    }
    
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.validTokens.length;
    this.authToken = this.validTokens[this.currentTokenIndex];
    console.log(`[LocalServer] Rotated to token ${this.currentTokenIndex + 1}/${this.validTokens.length}`);
    return true;
  }

  getAvailableModels() {
    return Object.entries(this.modelConfigs).map(([key, config]) => ({
      id: key,
      name: config.name,
      modelId: config.modelId,
      provider: config.provider
    }));
  }

  async sendMessage(modelKey, messages, onChunk, onComplete, onError, enableStreaming = true) {
    const config = this.modelConfigs[modelKey];
    if (!config) {
      onError(new Error(`Model ${modelKey} not configured`));
      return;
    }

    // If primary config fails and alternatives exist, try them
    const configsToTry = [config];
    if (config.alternativeConfigs) {
      configsToTry.push(...config.alternativeConfigs.map(alt => ({...config, ...alt})));
    }

    let configAttempt = 0;
    
    for (const currentConfig of configsToTry) {
      configAttempt++;
      console.log(`[LocalServer] Trying config ${configAttempt}/${configsToTry.length} for ${modelKey}: ${currentConfig.modelId} via ${currentConfig.provider}`);
      
      const maxRetries = 4;
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let response;
        const lastMessage = messages[messages.length - 1];
        const userMessage = lastMessage.role === 'user' ? lastMessage.content : '';

        console.log(`[LocalServer] Attempt ${attempt}/${maxRetries} - Sending to ${modelKey} with provider: ${currentConfig.provider}`);

        // Add timeout wrapper
        const timeoutMs = 90000; // 90 seconds timeout for GPT-5
        const fetchWithTimeout = async (url, options) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), timeoutMs);
          
          try {
            const response = await fetch(url, {
              ...options,
              signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
          } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
              throw new Error('Request timeout after ' + timeoutMs + 'ms');
            }
            throw error;
          }
        };

        // Choose endpoint based on model
        if (currentConfig.usePollinations) {
          // Use Pollinations for Gemini
          response = await this.sendToPollinationsAPI(currentConfig, messages, enableStreaming);
        } else {
          const headers = {
            'Content-Type': 'application/json'
          };

          if (currentConfig.requiresAuth) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
          }

          const body = {
            model: currentConfig.modelId,
            messages: messages,
            stream: enableStreaming
          };

          if (currentConfig.provider) {
            body.provider = currentConfig.provider;
          }

          response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
          });
        }

        // Check if response is ok
        if (!response.ok) {
          const errorText = await response.text();
          
          // Check if it's an auth error that needs token rotation
          if ((response.status === 401 || response.status === 403 || 
               (response.status === 400 && errorText.includes('usage-limited'))) && 
              currentConfig.requiresAuth) {
            console.log(`[LocalServer] Auth error for ${modelKey}, attempting token rotation...`);
            
            if (this.rotateToken()) {
              // Token rotated successfully, retry immediately
              console.log(`[LocalServer] Retrying with new token...`);
              continue;
            } else {
              console.error(`[LocalServer] No more tokens available for rotation`);
            }
          }
          
          // Check if it's a retryable error
          const isRetryable = 
            response.status === 503 || // Service unavailable
            response.status === 429 || // Too many requests
            response.status === 504 || // Gateway timeout
            errorText.toLowerCase().includes('busy') ||
            errorText.toLowerCase().includes('timeout') ||
            errorText.toLowerCase().includes('temporarily');
          
          if (isRetryable && attempt < maxRetries) {
            console.log(`[LocalServer] Retryable error for ${modelKey}, will retry in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          console.error(`[LocalServer] Error response for ${modelKey}:`, errorText);
          onError(new Error(`API error: ${response.status} - ${errorText}`));
          return;
        }

        // If we got here, request was successful
        if (enableStreaming && response.body) {
          await this.processStreamingResponse(response, modelKey, onChunk, onComplete, onError);
        } else {
          const data = await response.json();
          const text = this.extractTextFromResponse(data);
          onComplete({ text, model: modelKey });
        }
        
        // Success - exit retry loop
        return;
        
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const errorMessage = error.message?.toLowerCase() || '';
        const isRetryable = 
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('abort');
        
        if (isRetryable && attempt < maxRetries) {
          console.log(`[LocalServer] Attempt ${attempt} failed for ${modelKey}: ${error.message}`);
          console.log(`[LocalServer] Will retry in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        console.error(`[LocalServer] Final error with ${modelKey} after ${attempt} attempts:`, error);
        onError(error);
        return;
      }
      }
      
      // If we got here, all retries for this config failed
      // Try next config if available (break out of retry loop, continue with next config)
      break;
    }
    
    // If we got here, all configs failed
    console.error(`[LocalServer] All configurations failed for ${modelKey}`);
    onError(lastError || new Error(`Failed after trying all configurations`));
  }

  // This method is now integrated into sendMessage for retry logic
  async sendToLocalServer(config, messages, stream = true) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (config.requiresAuth) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const body = {
      model: config.modelId,
      messages: messages,
      stream: stream
    };

    if (config.provider) {
      body.provider = config.provider;
    }

    return fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
  }

  async sendToPollinationsAPI(config, messages, stream = true) {
    const body = {
      model: config.modelId,
      messages: messages,
      stream: stream
    };

    return fetch(this.pollinationsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  async processStreamingResponse(response, modelKey, onChunk, onComplete, onError) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    let hasReceivedData = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') {
            hasReceivedData = true;
            break;
          }

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Check for error in response
              if (data.error) {
                console.error(`[LocalServer] Error in stream for ${modelKey}:`, data.error);
                onError(new Error(data.error.message || 'Stream error'));
                return;
              }
              
              // Check if response indicates completion with empty content
              if (data.choices && data.choices[0] && data.choices[0].finish_reason === 'stop') {
                // Check if content is explicitly empty string or null
                const content = data.choices[0].delta?.content;
                if (content === '' || content === null || content === undefined) {
                  // This is normal - just the end of streaming signal
                  if (!fullResponse) {
                    // Only log if we truly got no response at all
                    console.log(`[LocalServer] ${modelKey} completed with no response`);
                  }
                  hasReceivedData = true;
                  continue;
                }
              }
              
              const chunk = this.extractChunkText(data);
              
              if (chunk) {
                fullResponse += chunk;
                hasReceivedData = true;
                onChunk(chunk, fullResponse);
              }
            } catch (e) {
              console.warn('[LocalServer] Error parsing chunk:', e, 'Line:', line);
            }
          }
        }
      }

      // If we got no response, try reading the full response as JSON
      if (!fullResponse && buffer) {
        try {
          const data = JSON.parse(buffer);
          fullResponse = this.extractTextFromResponse(data);
        } catch (e) {
          console.warn('Could not parse buffer as JSON');
        }
      }

      // Ensure we always return something
      if (!fullResponse) {
        const config = this.modelConfigs[modelKey];
        fullResponse = config?.fallbackMessage || 'No response received from the model.';
      }

      onComplete({ text: fullResponse, model: modelKey });
    } catch (error) {
      console.error('Streaming error:', error);
      onError(error);
    }
  }

  extractChunkText(data) {
    // Handle different response formats
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.delta && choice.delta.content) {
        return choice.delta.content;
      }
      if (choice.delta && choice.delta.reasoning) {
        // Handle Claude thinking model - don't show reasoning to user
        return '';
      }
      // Handle non-streaming response in streaming format
      if (choice.message && choice.message.content) {
        return choice.message.content;
      }
    }
    // Handle direct content field
    if (data.content) {
      return data.content;
    }
    return '';
  }

  extractTextFromResponse(data) {
    if (data.choices && data.choices[0]) {
      if (data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content;
      }
    }
    return 'No response received';
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.LocalServerProvider = LocalServerProvider;
}
