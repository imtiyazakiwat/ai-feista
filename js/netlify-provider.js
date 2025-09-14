// Netlify Provider for AI Models - resolves CORS issues using LocalServerProvider config
class NetlifyProvider {
  constructor() {
    this.baseUrl = '/api/proxy';
    this.streamUrl = '/api/stream';
    this.localServerUrl = 'http://13.61.23.21:8080/v1';
    this.pollinationsUrl = 'https://text.pollinations.ai/openai';
    this.authTokens = [];
    this.currentTokenIndex = 0;
    this.validTokens = [];
    this.authToken = null;
    this.initializeTokens();
    
    // Model configurations (same as LocalServerProvider)
    this.modelConfigs = {
      'chatgpt': {
        modelId: 'gpt-5-2025-08-07',
        name: 'ChatGPT (GPT-5)',
        requiresAuth: true,
        provider: 'PuterJS',
        endpoint: `${this.localServerUrl}/chat/completions`
      },
      'claude': {
        modelId: 'claude-3.7-sonnet-thinking',
        name: 'Claude 3.7 Sonnet',
        requiresAuth: true,
        provider: 'PuterJS',
        endpoint: `${this.localServerUrl}/chat/completions`
      },
      'gemini': {
        modelId: 'gemini',
        name: 'Gemini 2.5 Flash',
        requiresAuth: false,
        usePollinations: true,
        provider: 'Pollinations',
        endpoint: this.pollinationsUrl
      },
      'grok': {
        modelId: 'grok-3-fast',
        name: 'Grok 3 Fast',
        requiresAuth: true,
        provider: 'PuterJS',
        endpoint: `${this.localServerUrl}/chat/completions`
      },
      'deepseek': {
        modelId: 'deepseek-v3-0324',
        name: 'DeepSeek V3',
        requiresAuth: false,
        provider: 'DeepInfra',
        endpoint: `${this.localServerUrl}/chat/completions`
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
            console.log(`[NetlifyProvider] Loaded ${this.validTokens.length} valid tokens from cache`);
            return;
          }
        }
      } catch (e) {
        console.log('[NetlifyProvider] Failed to parse stored tokens');
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
        console.log(`[NetlifyProvider] Loaded ${tokens.length} tokens from api.txt`);
        
        // Validate all tokens in parallel
        await this.validateTokens();
      }
    } catch (error) {
      console.log('[NetlifyProvider] Could not load api.txt, using default token');
      // Fallback to a default token
      this.authTokens = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6IlYyaG1GM3U4VEpHNXFiNURieUlLM0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6ImhyWWJtT29TZFBIOGJQbU4wc2owNGc9PSIsImlhdCI6MTc1NzUwMzE5MH0.yGGnALj9j5aQsZeS59xT5glNfwezMxC3w2oxqiCUpo0'];
      this.validTokens = this.authTokens;
      this.authToken = this.authTokens[0];
    }
  }

  async validateTokens() {
    console.log('[NetlifyProvider] Validating API tokens...');
    const validationPromises = this.authTokens.map(async (token, index) => {
      try {
        // Simple validation request with 5 second timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: 'http://13.61.23.21:8080/v1/chat/completions',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: {
              model: 'gpt-5-2025-08-07',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1,
              stream: false
            }
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok || response.status === 429) { // 429 means rate limited but valid
          console.log(`[NetlifyProvider] Token ${index + 1} is valid`);
          return token;
        } else {
          console.log(`[NetlifyProvider] Token ${index + 1} is invalid (${response.status})`);
          return null;
        }
      } catch (error) {
        console.log(`[NetlifyProvider] Token ${index + 1} validation failed:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(validationPromises);
    this.validTokens = results.filter(token => token !== null);
    
    if (this.validTokens.length > 0) {
      this.authToken = this.validTokens[0];
      console.log(`[NetlifyProvider] ${this.validTokens.length} valid tokens available`);
      
      // Store valid tokens in localStorage
      localStorage.setItem('validApiTokens', JSON.stringify({
        tokens: this.validTokens,
        timestamp: Date.now()
      }));
    } else {
      console.warn('[NetlifyProvider] No valid tokens found, using fallback');
      this.authToken = this.authTokens[0]; // Use first token as fallback
    }
  }

  rotateToken() {
    if (this.validTokens.length <= 1) {
      console.log('[NetlifyProvider] No other tokens to rotate to');
      return false;
    }
    
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.validTokens.length;
    this.authToken = this.validTokens[this.currentTokenIndex];
    console.log(`[NetlifyProvider] Rotated to token ${this.currentTokenIndex + 1}/${this.validTokens.length}`);
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

    const maxRetries = 4;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[NetlifyProvider] Attempt ${attempt}/${maxRetries} - Sending to ${modelKey} with provider: ${config.provider}`);

        // Add timeout wrapper - increase timeout for GPT-5 and Claude models
        const timeoutMs = (config.modelId.includes('gpt-5') || config.modelId.includes('claude')) ? 150000 : 90000; // 2.5 minutes for GPT-5/Claude, 1.5 minutes for others
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

        // Prepare request body
        const requestBody = {
          model: config.modelId,
          messages: messages,
          stream: enableStreaming
        };

        if (config.provider) {
          requestBody.provider = config.provider;
        }

        // Prepare headers
        const requestHeaders = {};
        if (config.requiresAuth) {
          requestHeaders.Authorization = `Bearer ${this.authToken}`;
        }

        // Use streaming proxy for streaming requests
        const proxyUrl = enableStreaming ? this.streamUrl : this.baseUrl;
        
        const response = await fetchWithTimeout(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: config.endpoint,
            method: 'POST',
            headers: requestHeaders,
            body: requestBody
          })
        });

        // Check if response is ok
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          // Check if it's an auth error that needs token rotation
          if ((response.status === 401 || response.status === 403 || 
               (response.status === 400 && errorText.includes('usage-limited'))) && 
              config.requiresAuth) {
            console.log(`[NetlifyProvider] Auth error for ${modelKey}, attempting token rotation...`);
            
            if (this.rotateToken()) {
              // Token rotated successfully, retry immediately
              console.log(`[NetlifyProvider] Retrying with new token...`);
              continue;
            } else {
              console.error(`[NetlifyProvider] No more tokens available for rotation`);
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
            console.log(`[NetlifyProvider] Retryable error for ${modelKey}, will retry in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          console.error(`[NetlifyProvider] Error response for ${modelKey}:`, errorText);
          onError(new Error(`API error: ${response.status} - ${errorData.message || errorText}`));
          return;
        }

        // Process response
        if (enableStreaming && response.headers.get('content-type')?.includes('text/event-stream')) {
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
          console.log(`[NetlifyProvider] Attempt ${attempt} failed for ${modelKey}: ${error.message}`);
          console.log(`[NetlifyProvider] Will retry in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        console.error(`[NetlifyProvider] Final error with ${modelKey} after ${attempt} attempts:`, error);
        onError(error);
        return;
      }
    }
    
    // If we got here, all retries failed
    console.error(`[NetlifyProvider] All retries failed for ${modelKey}`);
    onError(lastError || new Error(`Failed after ${maxRetries} attempts`));
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
                console.error(`[NetlifyProvider] Error in stream for ${modelKey}:`, data.error);
                onError(new Error(data.error.message || 'Stream error'));
                return;
              }
              
              // Check if response indicates completion with empty content
              if (data.choices && data.choices[0] && data.choices[0].finish_reason === 'stop') {
                const content = data.choices[0].delta?.content;
                if (content === '' || content === null || content === undefined) {
                  if (!fullResponse) {
                    console.log(`[NetlifyProvider] ${modelKey} completed with no response`);
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
              console.warn('[NetlifyProvider] Error parsing chunk:', e, 'Line:', line);
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
          console.warn('[NetlifyProvider] Could not parse buffer as JSON');
        }
      }

      // Ensure we always return something
      if (!fullResponse) {
        const config = this.modelConfigs[modelKey];
        fullResponse = config?.fallbackMessage || 'No response received from the model.';
      }

      onComplete({ text: fullResponse, model: modelKey });
    } catch (error) {
      console.error('[NetlifyProvider] Streaming error:', error);
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
  window.NetlifyProvider = NetlifyProvider;
}
