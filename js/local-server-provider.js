// Local Server Provider for AI Models - now uses Netlify Functions for CORS resolution
class LocalServerProvider {
  constructor() {
    this.baseUrl = 'http://13.61.23.21:8080/v1';
    this.pollinationsUrl = 'https://text.pollinations.ai/openai';
    this.netlifyProxyUrl = '/api/proxy';
    this.netlifyStreamUrl = '/api/stream';
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
        modelId: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
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
            // Restore the current token index if available
            this.currentTokenIndex = parsed.currentIndex || 0;
            this.authToken = this.validTokens[this.currentTokenIndex];
            console.log(`[LocalServer] Loaded ${this.validTokens.length} valid tokens from cache (using token ${this.currentTokenIndex + 1})`);
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
        console.log(`[LocalServer] Token list:`, tokens.map((t, i) => `${i + 1}: ${t.substring(0, 20)}...`));
        
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
    
    // Try to load cached valid tokens first
    try {
      const cached = localStorage.getItem('validApiTokens');
      if (cached) {
        const { tokens, timestamp } = JSON.parse(cached);
        // Use cached tokens if they're less than 1 hour old
        if (tokens && tokens.length > 0 && (Date.now() - timestamp) < 3600000) {
          console.log(`[LocalServer] Using ${tokens.length} cached valid tokens`);
          this.validTokens = tokens;
          this.authToken = tokens[0];
          return;
        }
      }
    } catch (error) {
      console.log('[LocalServer] Could not load cached tokens:', error.message);
    }
    
    const validationPromises = this.authTokens.map(async (token, index) => {
      try {
        console.log(`[LocalServer] Starting validation for token ${index + 1}/${this.authTokens.length}`);
        
        // Simple validation request with 10 second timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          console.log(`[LocalServer] Token ${index + 1} validation timeout after 10 seconds`);
          controller.abort();
        }, 10000);
        
        const requestBody = {
          path: `${this.baseUrl}/chat/completions`,
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
        };
        
        console.log(`[LocalServer] Sending validation request for token ${index + 1} to ${this.netlifyProxyUrl}`);
        
        const response = await fetch(this.netlifyProxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        console.log(`[LocalServer] Token ${index + 1} validation response: ${response.status} ${response.statusText}`);
        
        if (response.ok || response.status === 429 || response.status === 400) { 
          // 429 means rate limited but valid, 400 might be model-specific issues but token is valid
          console.log(`[LocalServer] Token ${index + 1} is valid (${response.status})`);
          return token;
        } else {
          const errorText = await response.text();
          console.log(`[LocalServer] Token ${index + 1} is invalid (${response.status}): ${errorText.substring(0, 200)}`);
          return null;
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`[LocalServer] Token ${index + 1} validation timed out`);
        } else {
          console.log(`[LocalServer] Token ${index + 1} validation failed:`, error.message, error.stack);
        }
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
      console.warn('[LocalServer] No valid tokens found during validation, will try all tokens during rotation');
      // Use all tokens as fallback for rotation
      this.validTokens = [...this.authTokens];
      this.authToken = this.authTokens[0];
    }
  }

  rotateToken() {
    // If we have multiple valid tokens, rotate among them
    if (this.validTokens.length > 1) {
      this.currentTokenIndex = (this.currentTokenIndex + 1) % this.validTokens.length;
      this.authToken = this.validTokens[this.currentTokenIndex];
      console.log(`[LocalServer] Rotated to valid token ${this.currentTokenIndex + 1}/${this.validTokens.length} (${this.authToken.substring(0, 20)}...)`);
      
      // Update localStorage with new current token
      localStorage.setItem('validApiTokens', JSON.stringify({
        tokens: this.validTokens,
        timestamp: Date.now(),
        currentIndex: this.currentTokenIndex
      }));
      
      return true;
    }
    
    // If we only have 1 valid token, try rotating through all available tokens
    if (this.authTokens.length > 1) {
      this.currentTokenIndex = (this.currentTokenIndex + 1) % this.authTokens.length;
      this.authToken = this.authTokens[this.currentTokenIndex];
      console.log(`[LocalServer] Rotated to untested token ${this.currentTokenIndex + 1}/${this.authTokens.length} (${this.authToken.substring(0, 20)}...)`);
      
      // Update localStorage with new current token
      localStorage.setItem('validApiTokens', JSON.stringify({
        tokens: this.validTokens,
        timestamp: Date.now(),
        currentIndex: this.currentTokenIndex
      }));
      
      return true;
    }
    
    // If we've tried all tokens and none work, clear cache and re-validate
    if (this.authTokens.length > 0) {
      console.log('[LocalServer] All tokens exhausted, clearing cache and re-validating...');
      localStorage.removeItem('validApiTokens');
      this.validTokens = [];
      this.currentTokenIndex = 0;
      this.authToken = this.authTokens[0];
      
      // Re-validate tokens in background
      this.validateTokens().catch(console.error);
      
      return true;
    }
    
    console.log('[LocalServer] No other tokens to rotate to');
    return false;
  }

  // Force re-validation of all tokens
  async forceRevalidation() {
    console.log('[LocalServer] Force re-validating all tokens...');
    localStorage.removeItem('validApiTokens');
    this.validTokens = [];
    this.currentTokenIndex = 0;
    this.authToken = this.authTokens[0];
    await this.validateTokens();
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

    // Use the messages passed directly from ModelManager (which contains the full conversation history)
    let conversationMessages = messages;
    
    console.log(`[LocalServer] Using ${conversationMessages.length} messages for ${modelKey}:`, conversationMessages);

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
        const lastMessage = conversationMessages[conversationMessages.length - 1];
        const userMessage = lastMessage.role === 'user' ? lastMessage.content : '';

        console.log(`[LocalServer] Attempt ${attempt}/${maxRetries} - Sending to ${modelKey} with provider: ${currentConfig.provider} (token: ${this.authToken.substring(0, 20)}...)`);

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

        // Choose endpoint based on model - now using Netlify Functions
        if (currentConfig.usePollinations) {
          // Use Pollinations for Gemini via Netlify proxy
          response = await this.sendToPollinationsViaNetlify(currentConfig, conversationMessages, enableStreaming);
        } else {
          // Use local server via Netlify proxy
          response = await this.sendToLocalServerViaNetlify(currentConfig, conversationMessages, enableStreaming);
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
        console.log(`[LocalServer] Response received for ${modelKey}:`, {
          status: response.status,
          contentType: response.headers.get('content-type'),
          streaming: enableStreaming,
          ok: response.ok,
          hasBody: !!response.body
        });
        
        if (enableStreaming && response.body) {
          // Create a wrapper for onError to handle auth errors from streaming
          const wrappedOnError = (error) => {
            if (error.needsTokenRotation && currentConfig.requiresAuth) {
              console.log(`[LocalServer] Auth error from streaming for ${modelKey}, attempting token rotation...`);
              
              if (this.rotateToken()) {
                // Token rotated successfully, retry immediately
                console.log(`[LocalServer] Retrying with new token after streaming auth error...`);
                // Break out of streaming processing and retry the entire request
                throw new Error('AUTH_RETRY_NEEDED');
              } else {
                console.error(`[LocalServer] No more tokens available for rotation`);
                onError(error);
              }
            } else {
              onError(error);
            }
          };
          
          try {
            await this.processStreamingResponse(response, modelKey, onChunk, onComplete, wrappedOnError);
            // If we get here, the request was successful
            return;
          } catch (retryError) {
            if (retryError.message === 'AUTH_RETRY_NEEDED') {
              // Continue to retry with new token
              console.log(`[LocalServer] Retrying request with new token for ${modelKey}...`);
              continue;
            } else {
              throw retryError;
            }
          }
        } else {
          const data = await response.json();
          
          // Check for auth errors in non-streaming response
          if (data.error) {
            const errorMessage = data.error.message || data.error.type || '';
            const isAuthError = errorMessage.includes('usage-limited') || 
                              errorMessage.includes('401') || 
                              errorMessage.includes('403') ||
                              errorMessage.includes('unauthorized') ||
                              errorMessage.includes('invalid') ||
                              errorMessage.includes('expired') ||
                              errorMessage.includes('subscription') ||
                              errorMessage.includes('billing') ||
                              (errorMessage.toLowerCase().includes('success') && errorMessage.toLowerCase().includes('false'));
            
            if (isAuthError && currentConfig.requiresAuth) {
              console.log(`[LocalServer] Auth error in non-streaming response for ${modelKey}, attempting token rotation...`);
              
              if (this.rotateToken()) {
                console.log(`[LocalServer] Retrying non-streaming request with new token for ${modelKey}...`);
                continue;
              } else {
                console.error(`[LocalServer] No more tokens available for rotation`);
                onError(new Error(`Auth error: ${errorMessage}`));
                return;
              }
            }
          }
          
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

  // Send to local server via Netlify Functions proxy
  async sendToLocalServerViaNetlify(config, messages, stream = true) {
    const headers = {};

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

    const proxyUrl = stream ? this.netlifyStreamUrl : this.netlifyProxyUrl;

    return fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: `${this.baseUrl}/chat/completions`,
        method: 'POST',
        headers: headers,
        body: body
      })
    });
  }

  // Send to Pollinations via Netlify Functions proxy
  async sendToPollinationsViaNetlify(config, messages, stream = true) {
    const body = {
      model: config.modelId,
      messages: messages,
      stream: stream
    };

    const proxyUrl = stream ? this.netlifyStreamUrl : this.netlifyProxyUrl;

    return fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: this.pollinationsUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body
      })
    });
  }

  // Legacy methods for backwards compatibility
  async sendToLocalServer(config, messages, stream = true) {
    return this.sendToLocalServerViaNetlify(config, messages, stream);
  }

  async sendToPollinationsAPI(config, messages, stream = true) {
    return this.sendToPollinationsViaNetlify(config, messages, stream);
  }

  async processStreamingResponse(response, modelKey, onChunk, onComplete, onError) {
    try {
      // Check if response is actually streaming or if it's a complete response
      const contentType = response.headers.get('content-type') || '';
      
      console.log(`[LocalServer] Processing response for ${modelKey}, content-type: ${contentType}`);
      
      if (!contentType.includes('text/event-stream')) {
        // Handle non-streaming response (from Netlify Functions)
        await this.processNonStreamingResponse(response, modelKey, onChunk, onComplete, onError);
        return;
      }

      // Handle real streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';
      let hasReceivedData = false;
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
              
              // Debug logging for troubleshooting
              if (data.error) {
                console.error(`[LocalServer] Error in stream for ${modelKey}:`, {
                  error: data.error,
                  fullData: data,
                  line: line
                });
                
                // Check if this is an auth error that needs token rotation
                const errorMessage = data.error.message || data.error.type || '';
                const isAuthError = errorMessage.includes('usage-limited') || 
                                  errorMessage.includes('401') || 
                                  errorMessage.includes('403') ||
                                  errorMessage.includes('unauthorized') ||
                                  errorMessage.includes('forbidden') ||
                                  errorMessage.includes('invalid token') ||
                                  errorMessage.includes('token expired') ||
                                  errorMessage.includes('quota exceeded') ||
                                  errorMessage.includes('rate limit') ||
                                  errorMessage.includes('subscription') ||
                                  errorMessage.includes('billing') ||
                                  errorMessage.toLowerCase().includes('success') && errorMessage.toLowerCase().includes('false');
                
                if (isAuthError) {
                  console.log(`[LocalServer] Auth error detected in stream for ${modelKey}, triggering token rotation...`);
                  // Create a special error that will trigger retry with token rotation
                  const authError = new Error(`AUTH_ERROR: ${errorMessage}`);
                  authError.needsTokenRotation = true;
                  authError.originalError = data.error;
                  onError(authError);
                  return;
                }
                
                onError(new Error(data.error.message || data.error.type || 'Stream error'));
                return;
              }
              
              // Debug logging for successful chunks
              if (data.choices && data.choices[0]) {
                console.log(`[LocalServer] Stream chunk for ${modelKey}:`, {
                  delta: data.choices[0].delta,
                  finish_reason: data.choices[0].finish_reason
                });
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
              console.warn(`[LocalServer] Error parsing chunk for ${modelKey}:`, {
                error: e.message,
                line: line,
                lineLength: line.length,
                startsWithData: line.startsWith('data: ')
              });
              
              // If it's not a JSON parsing error, it might be a different issue
              if (!e.message.includes('JSON')) {
                console.error(`[LocalServer] Non-JSON error for ${modelKey}:`, e);
              }
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

  async processNonStreamingResponse(response, modelKey, onChunk, onComplete, onError) {
    try {
      const responseText = await response.text();
      
      if (!responseText) {
        onError(new Error('Empty response received'));
        return;
      }

      console.log(`[LocalServer] Processing non-streaming response for ${modelKey}, length: ${responseText.length}`);

      // Check if this is an event stream format that was collected by Netlify
      if (responseText.includes('data: ')) {
        console.log(`[LocalServer] Detected event stream format, simulating streaming from collected chunks`);
        await this.simulateStreamingFromEventStream(responseText, modelKey, onChunk, onComplete, onError);
      } else {
        // Try to parse as JSON response
        try {
          const data = JSON.parse(responseText);
          const fullResponse = this.extractTextFromResponse(data);
          
          if (fullResponse && fullResponse !== 'No response received') {
            console.log(`[LocalServer] Parsed JSON response, simulating streaming from text`);
            // Simulate streaming by breaking the response into chunks
            await this.simulateStreamingFromText(fullResponse, modelKey, onChunk, onComplete);
          } else {
            onError(new Error('No valid response received'));
          }
        } catch (e) {
          // If not JSON, treat as plain text
          if (responseText.trim()) {
            console.log(`[LocalServer] Treating as plain text, simulating streaming`);
            await this.simulateStreamingFromText(responseText, modelKey, onChunk, onComplete);
          } else {
            onError(new Error('Invalid response format'));
          }
        }
      }
    } catch (error) {
      console.error('[LocalServer] Non-streaming response error:', error);
      onError(error);
    }
  }

  async simulateStreamingFromEventStream(responseText, modelKey, onChunk, onComplete, onError) {
    const lines = responseText.split('\n');
    let fullResponse = '';
    
    console.log(`[LocalServer] Simulating streaming from event stream for ${modelKey}, lines: ${lines.length}`);
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      if (line.trim() === 'data: [DONE]') break;
      
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          // Check for errors in the stream
          if (data.error) {
            console.error(`[LocalServer] Error in collected event stream for ${modelKey}:`, data.error);
            
            // Check if this is an auth error that needs token rotation
            const errorMessage = data.error.message || data.error.type || '';
            const isAuthError = errorMessage.includes('usage-limited') || 
                              errorMessage.includes('401') || 
                              errorMessage.includes('403') ||
                              errorMessage.includes('unauthorized') ||
                              errorMessage.includes('forbidden') ||
                              errorMessage.includes('invalid token') ||
                              errorMessage.includes('token expired') ||
                              errorMessage.includes('quota exceeded') ||
                              errorMessage.includes('rate limit') ||
                              errorMessage.includes('subscription') ||
                              errorMessage.includes('billing') ||
                              errorMessage.toLowerCase().includes('success') && errorMessage.toLowerCase().includes('false');
            
            if (isAuthError) {
              console.log(`[LocalServer] Auth error detected in collected event stream for ${modelKey}, triggering token rotation...`);
              // Create a special error that will trigger retry with token rotation
              const authError = new Error(`AUTH_ERROR: ${errorMessage}`);
              authError.needsTokenRotation = true;
              authError.originalError = data.error;
              onError(authError);
              return;
            }
            
            onError(new Error(data.error.message || data.error.type || 'Stream error'));
            return;
          }
          
          const chunk = this.extractChunkText(data);
          
          if (chunk) {
            fullResponse += chunk;
            onChunk(chunk, fullResponse);
            // Add small delay to simulate streaming (faster for better UX)
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        } catch (e) {
          console.warn('[LocalServer] Error parsing event stream line:', e);
        }
      }
    }
    
    if (fullResponse) {
      onComplete({ text: fullResponse, model: modelKey });
    } else {
      onError(new Error('No valid content in event stream'));
    }
  }

  async simulateStreamingFromText(fullText, modelKey, onChunk, onComplete) {
    console.log(`[LocalServer] Simulating streaming from text for ${modelKey}, length: ${fullText.length}`);
    
    // Break text into smaller chunks for more realistic streaming
    const chunkSize = 3; // Characters per chunk for smoother streaming
    let currentText = '';
    
    for (let i = 0; i < fullText.length; i += chunkSize) {
      const chunk = fullText.slice(i, i + chunkSize);
      currentText += chunk;
      onChunk(chunk, currentText);
      
      // Add small delay between chunks for streaming effect
      await new Promise(resolve => setTimeout(resolve, 15));
    }
    
    onComplete({ text: fullText, model: modelKey });
  }

  extractChunkText(data) {
    // Handle different response formats
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.delta && choice.delta.content) {
        console.log(`[LocalServer] Extracted chunk content: "${choice.delta.content}"`);
        return choice.delta.content;
      }
      if (choice.delta && choice.delta.reasoning) {
        // Handle Claude thinking model - don't show reasoning to user
        console.log(`[LocalServer] Claude reasoning chunk (hidden): "${choice.delta.reasoning}"`);
        return '';
      }
      // Handle non-streaming response in streaming format
      if (choice.message && choice.message.content) {
        console.log(`[LocalServer] Extracted message content: "${choice.message.content}"`);
        return choice.message.content;
      }
      // Debug: log what we got if no content found
      console.log(`[LocalServer] No content found in choice:`, {
        delta: choice.delta,
        message: choice.message,
        finish_reason: choice.finish_reason
      });
    }
    // Handle direct content field
    if (data.content) {
      console.log(`[LocalServer] Extracted direct content: "${data.content}"`);
      return data.content;
    }
    
    // Debug: log what we got if no content found at all
    console.log(`[LocalServer] No content found in data:`, data);
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
  
  // Expose global methods for debugging
  window.forceTokenRevalidation = async () => {
    if (window.localServerProvider) {
      await window.localServerProvider.forceRevalidation();
      console.log('[Global] Token revalidation completed');
    } else {
      console.error('[Global] LocalServerProvider not available');
    }
  };
  
  window.rotateToken = () => {
    if (window.localServerProvider) {
      const rotated = window.localServerProvider.rotateToken();
      console.log('[Global] Token rotation:', rotated ? 'successful' : 'failed');
      return rotated;
    } else {
      console.error('[Global] LocalServerProvider not available');
      return false;
    }
  };
  
  window.getTokenStatus = () => {
    if (window.localServerProvider) {
      return {
        totalTokens: window.localServerProvider.authTokens.length,
        validTokens: window.localServerProvider.validTokens.length,
        currentToken: window.localServerProvider.authToken ? window.localServerProvider.authToken.substring(0, 20) + '...' : 'none',
        currentIndex: window.localServerProvider.currentTokenIndex
      };
    } else {
      console.error('[Global] LocalServerProvider not available');
      return null;
    }
  };
}
