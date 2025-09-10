// GPT4Free Integration for Multi-Model Chat
class GPT4FreeIntegration {
  constructor() {
    this.client = null;
    this.availableModels = [];
    this.modelHistories = {}; // Store independent chat history for each model
    this.providers = {};
    this.pollinationsProvider = null; // Fallback provider
    this.usingPollinations = false; // Track which provider is active
    this.localServerProvider = null; // Local server provider
    this.activeProvider = 'server'; // Default to 'server' (Local Server)
    this.init();
  }

  async init() {
    try {
      // Initialize Local Server provider if available
      if (window.LocalServerProvider) {
        this.localServerProvider = new window.LocalServerProvider();
        console.log('Local Server provider initialized');
      }
      
      // Initialize Pollinations provider first (always available as fallback)
      if (window.PollinationsProvider) {
        this.pollinationsProvider = new window.PollinationsProvider();
        console.log('Pollinations.AI provider initialized');
      }
      
      // Import the GPT4Free client with proper provider support
      let Client, PollinationsAI, DeepInfra, Together, Puter, HuggingFace;
      
      try {
        // Try to import from the CDN
        const module = await import('https://g4f.dev/dist/js/client.js');
        Client = module.Client;
        PollinationsAI = module.PollinationsAI;
        DeepInfra = module.DeepInfra;
        Together = module.Together;
        Puter = module.Puter;
        HuggingFace = module.HuggingFace;
        console.log('GPT4Free providers imported successfully');
      } catch (importError) {
        console.error('Import error:', importError);
        // Don't throw - we'll use Pollinations as fallback
        console.log('Will use Pollinations.AI as fallback provider');
        this.usingPollinations = true;
      }

      if (!this.usingPollinations) {
        // Initialize providers
        this.providers = {
          Client,
          PollinationsAI,
          DeepInfra,
          Together,
          Puter,
          HuggingFace
        };

        // Create client using proper GPT4Free providers
        const clientCreated = await this.createClient();
        
        if (!clientCreated) {
          // Failed to create GPT4Free client, use Pollinations
          console.log('GPT4Free client creation failed, switching to Pollinations.AI');
          this.usingPollinations = true;
        }
      }
      
      // Load available models
      await this.loadAvailableModels();
      
      console.log(`Integration initialized with ${this.usingPollinations ? 'Pollinations.AI' : 'GPT4Free'}`);
    } catch (error) {
      console.error('Failed to initialize integration:', error);
      // Use Pollinations as final fallback
      this.usingPollinations = true;
      await this.loadAvailableModels();
    }
  }

  async createClient() {
    try {
      // Try different providers in order of preference
      if (this.providers.Puter) {
        try {
          this.client = new this.providers.Puter();
          console.log('Client created with Puter provider');
          // Test if Puter is actually working
          await Promise.race([
            this.client.models.list(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Puter timeout')), 3000))
          ]);
          return true;
        } catch (e) {
          console.log('Puter provider failed:', e.message);
        }
      }
      
      if (this.providers.PollinationsAI) {
        try {
          this.client = new this.providers.PollinationsAI({ apiKey: 'optional' });
          console.log('Client created with PollinationsAI provider');
          return true;
        } catch (e) {
          console.log('PollinationsAI provider failed:', e.message);
        }
      }
      
      if (this.providers.DeepInfra) {
        try {
          this.client = new this.providers.DeepInfra({ apiKey: 'optional' });
          console.log('Client created with DeepInfra provider');
          return true;
        } catch (e) {
          console.log('DeepInfra provider failed:', e.message);
        }
      }
      
      if (this.providers.Client) {
        try {
          // Fallback to generic client with local GPT4Free instance
          this.client = new this.providers.Client({ 
            baseUrl: 'https://g4f.dev/v1', 
            apiKey: 'free' 
          });
          console.log('Client created with generic Client provider');
          return true;
        } catch (e) {
          console.log('Generic Client provider failed:', e.message);
        }
      }
      
      console.log('No GPT4Free providers available');
      return false;
    } catch (error) {
      console.error('Failed to create client with any provider:', error);
      return false;
    }
  }

  createFallbackClient() {
    console.log('Creating fallback mock client...');
    this.client = {
      chat: {
        completions: {
          create: async (params) => {
            // Mock response for testing
            return {
              choices: [{
                message: {
                  content: `Mock response for model: ${params.model}\n\nYour message: "${params.messages[params.messages.length - 1].content}"\n\nThis is a fallback response since the GPT4Free client failed to initialize. Please check your internet connection and try refreshing the page.`
                }
              }]
            };
          }
        }
      },
      models: {
        list: async () => {
          // Return default models for fallback mode
          return [
            { id: 'gpt-4', name: 'GPT-4' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
          ];
        }
      }
    };
  }

  async loadAvailableModels() {
    try {
      if (this.usingPollinations && this.pollinationsProvider) {
        console.log('Loading available models from Pollinations.AI...');
        
        // Use Pollinations models
        this.availableModels = [
          { id: 'openai', name: 'ChatGPT (OpenAI)' },
          { id: 'gemini', name: 'Gemini' },
          { id: 'mistral', name: 'Mistral (Grok fallback)' },
          { id: 'qwen-coder', name: 'Qwen Coder (DeepSeek fallback)' }
          // Claude is not available on Pollinations
        ];
        
        console.log('Using Pollinations.AI models:', this.availableModels);
        return;
      }
      
      console.log('Loading available models from GPT4Free...');
      
      // Use the proper GPT4Free client method
      let models = [];
      
      if (this.client) {
        try {
          // Use the documented models.list() method
          models = await this.client.models.list();
          console.log('Models from client.models.list():', models);
        } catch (e) {
          console.log('client.models.list() failed:', e);
          
          // Fallback: try other possible methods
          if (this.client.models && typeof this.client.models === 'function') {
            try {
              models = await this.client.models();
              console.log('Models from client.models():', models);
            } catch (e2) {
              console.log('client.models() also failed:', e2);
            }
          }
        }
      }

      // If we got models, update the available models
      if (models && models.length > 0) {
        this.availableModels = models;
        console.log('Successfully loaded', models.length, 'models');
      } else {
        // Fallback to default models
        console.log('No models found, using default models');
        this.availableModels = [
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
          { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
          { id: 'deepseek-v3', name: 'DeepSeek V3' }
        ];
      }
    } catch (error) {
      console.error('Error loading models:', error);
      // Fallback to default models
      this.availableModels = [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
      ];
    }
  }

  getAvailableModels() {
    // Return models based on active provider
    if (this.activeProvider === 'server' && this.localServerProvider) {
      return this.localServerProvider.getAvailableModels();
    }
    return this.availableModels;
  }
  
  setActiveProvider(provider) {
    if (provider === 'server' && this.localServerProvider) {
      this.activeProvider = 'server';
      console.log('Switched to Local Server provider');
      // Clear model histories when switching providers
      this.clearAllHistories();
      return true;
    } else if (provider === 'gpt4free') {
      this.activeProvider = 'gpt4free';
      console.log('Switched to GPT4Free provider');
      // Clear model histories when switching providers
      this.clearAllHistories();
      return true;
    }
    return false;
  }
  
  getActiveProvider() {
    return this.activeProvider;
  }

  getModelHistory(modelId) {
    if (!this.modelHistories[modelId]) {
      this.modelHistories[modelId] = [];
    }
    return this.modelHistories[modelId];
  }

  addMessageToModelHistory(modelId, message) {
    if (!this.modelHistories[modelId]) {
      this.modelHistories[modelId] = [];
    }
    this.modelHistories[modelId].push(message);
  }

  clearModelHistory(modelId) {
    if (this.modelHistories[modelId]) {
      this.modelHistories[modelId] = [];
    }
  }

  clearAllHistories() {
    this.modelHistories = {};
  }

  async sendMessageToModel(modelId, message, onChunk, onComplete, onError, enableStreaming = true) {
    try {
      // Check if we should use local server provider
      if (this.activeProvider === 'server' && this.localServerProvider) {
        console.log(`Using Local Server for ${modelId}`);
        const modelHistory = this.getModelHistory(modelId);
        const userMessage = { role: 'user', content: message };
        this.addMessageToModelHistory(modelId, userMessage);
        
        // Delegate to Local Server provider
        return await this.localServerProvider.sendMessage(
          modelId,
          [...modelHistory, userMessage],
          onChunk,
          (result) => {
            // Add assistant message to history
            const assistantMessage = { role: 'assistant', content: result.text };
            this.addMessageToModelHistory(modelId, assistantMessage);
            onComplete(result);
          },
          onError,
          enableStreaming
        );
      }
      // Check if this model should be forced to use Pollinations
      const forcePollinationsModels = this.forcePollinationsModels || [];
      const shouldForceePollinations = forcePollinationsModels.some(m => 
        modelId.toLowerCase().includes(m.toLowerCase())
      );
      
      // Check if we should use Pollinations
      if ((this.usingPollinations || shouldForceePollinations) && this.pollinationsProvider) {
        // Check if model is available on Pollinations
        const pollinationsModel = this.pollinationsProvider.mapModel(modelId);
        if (pollinationsModel === null) {
          // Model not available on Pollinations (e.g., Claude)
          onError(new Error(`Model ${modelId} is not available on Pollinations.AI (fallback mode).
Please use ChatGPT, Gemini, or DeepSeek instead.`));
          return;
        }
        
        console.log(`Using Pollinations.AI for ${modelId} (forced: ${shouldForceePollinations})`);
        const modelHistory = this.getModelHistory(modelId);
        const userMessage = { role: 'user', content: message };
        this.addMessageToModelHistory(modelId, userMessage);
        
        // Delegate to Pollinations provider
        return await this.pollinationsProvider.sendMessage(
          modelId,
          [...modelHistory],
          onChunk,
          (result) => {
            // Add assistant message to history
            const assistantMessage = { role: 'assistant', content: result.text };
            this.addMessageToModelHistory(modelId, assistantMessage);
            onComplete(result);
          },
          onError,
          enableStreaming
        );
      }
      
      // Original GPT4Free logic
      // Get model-specific history
      const modelHistory = this.getModelHistory(modelId);

      // Add user message to history
      const userMessage = { role: 'user', content: message };
      this.addMessageToModelHistory(modelId, userMessage);

      // Prepare request parameters
      // Special handling for GPT-5 which only supports temperature: 1
      const temperature = modelId === 'gpt-5-2025-08-07' ? 1 : 0.7;
      
      const requestParams = {
        model: modelId,
        messages: [...modelHistory],
        max_tokens: 2000,
        temperature: temperature,
        stream: enableStreaming // Use streaming based on parameter
      };

      console.log(`Sending streaming message to ${modelId}:`, requestParams);

      // Try with retry mechanism and longer timeout
      let lastError;
      const maxRetries = 4; // Increased to 4 retries
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt} for ${modelId}`);

          const requestPromise = this.client.chat?.completions?.create
            ? this.client.chat.completions.create(requestParams)
            : this.client.chat?.completions
              ? this.client.chat.completions(requestParams)
              : this.client.chat?.create
                ? this.client.chat.create(requestParams)
                : Promise.reject(new Error('Streaming not supported by current provider'));

          const stream = await Promise.race([
            requestPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Request timeout after 30 seconds (attempt ${attempt})`)), 30000)
            )
          ]);

          // If successful, process the streaming result
          console.log(`Request successful for ${modelId} on attempt ${attempt}`);
          return await this.processStreamingResponse(stream, modelId, onChunk, onComplete);

        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt} failed for ${modelId}:`, error?.message || error);
          
          // Check if it's a Puter error or 400 error - if so, switch to Pollinations immediately
          const isPuterError = error?.message?.includes('PUTER_ERROR') ||
                              error?.message?.includes('PUTER_MODEL_INVALID');
          const is400Error = error?.message?.includes('Error 400') ||
                            error?.message?.includes('400') ||
                            error?.message?.includes('Permission denied') ||
                            error?.message?.includes('usage-limited-chat');
          
          if (isPuterError || is400Error) {
            console.log(`Puter/API error for ${modelId}, using Pollinations fallback`);
            if (this.pollinationsProvider) {
              // Use Pollinations as fallback
              const modelHistory = this.getModelHistory(modelId);
              return await this.pollinationsProvider.sendMessage(
                modelId,
                [...modelHistory],
                onChunk,
                (result) => {
                  // Add assistant message to history
                  const assistantMessage = { role: 'assistant', content: result.text };
                  this.addMessageToModelHistory(modelId, assistantMessage);
                  onComplete(result);
                },
                onError,
                enableStreaming
              );
            }
          }

          // Check if error is retryable
          const errorMessage = error?.message?.toLowerCase() || '';
          const isRetryable = 
            errorMessage.includes('timeout') ||
            errorMessage.includes('busy') ||
            errorMessage.includes('503') ||
            errorMessage.includes('504') ||
            errorMessage.includes('network') ||
            errorMessage.includes('temporarily');
          
          if (attempt < maxRetries && isRetryable && !error?.message?.includes('PUTER_ERROR') && !error?.message?.includes('PUTER_MODEL_INVALID')) {
            // Wait before retrying (exponential backoff)
            console.log(`Will retry ${modelId} in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          }
        }
      }

      // All attempts failed
      throw lastError;

    } catch (error) {
      console.error(`Error with ${modelId}:`, error);

      // Provide more detailed error information
      let errorMessage = error.message || 'Unknown error occurred';
      let isServerError = false;

      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
          isServerError = error.message.includes('500') ||
                         error.message.includes('502') ||
                         error.message.includes('503') ||
                         error.message.includes('504');
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.success === false && error.error) {
          errorMessage = error.error.message || 'API request failed';
        } else {
          errorMessage = 'Unknown error occurred';
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'An unexpected error occurred';
      }

      // Create enhanced error object
      const enhancedError = new Error(errorMessage);
      enhancedError.modelId = modelId;
      enhancedError.isServerError = isServerError;
      enhancedError.originalError = error;

      onError(enhancedError);
    }
  }

  processResponse(result, modelId, onComplete) {
    try {
      // Handle different response formats
      let aiResponse = '';
      console.log('Raw API response:', result);

      if (result.choices && result.choices[0] && result.choices[0].message) {
        const content = result.choices[0].message.content;

        if (Array.isArray(content)) {
          // Extract text from content array (Claude format)
          aiResponse = content
            .filter(item => item.type === 'text' || item.text)
            .map(item => item.text || item.content || item)
            .join('\n');
        } else {
          aiResponse = content;
        }
      } else if (result.message && result.message.content) {
        // Handle Claude-style responses with nested content
        if (Array.isArray(result.message.content)) {
          // Extract text from content array
          const textItems = result.message.content
            .filter(item => item.type === 'text' || item.text || typeof item === 'string')
            .map(item => {
              if (typeof item === 'string') return item;
              return item.text || item.content || item;
            });

          aiResponse = textItems.join('\n');
        } else {
          aiResponse = result.message.content;
        }
      } else if (result.content) {
        aiResponse = result.content;
      } else if (result.message) {
        aiResponse = result.message;
      } else if (result.text) {
        aiResponse = result.text;
      } else if (result.response) {
        aiResponse = result.response;
      } else if (result.answer) {
        aiResponse = result.answer;
      } else if (typeof result === 'string') {
        aiResponse = result;
      } else if (typeof result === 'object') {
        // Try to extract text from object response
        if (result.data && result.data.content) {
          aiResponse = result.data.content;
        } else if (result.data && result.data.text) {
          aiResponse = result.data.text;
        } else if (result.data && result.data.message) {
          aiResponse = result.data.message;
        } else {
          // Last resort: stringify the object for debugging
          aiResponse = `Received object response: ${JSON.stringify(result, null, 2)}`;
        }
      } else {
        aiResponse = 'Received response but could not extract content';
      }

      console.log(`Extracted response from ${modelId}:`, aiResponse);

      // Add assistant message to history
      const assistantMessage = { role: 'assistant', content: aiResponse };
      this.addMessageToModelHistory(modelId, assistantMessage);

      console.log(`Sending complete response to ${modelId}:`, { text: aiResponse, model: modelId });
      onComplete({
        text: aiResponse,
        model: modelId
      });

    } catch (error) {
      console.error(`Error processing response for ${modelId}:`, error);
      throw error;
    }
  }

  async processStreamingResponse(stream, modelId, onChunk, onComplete) {
    let fullResponse = '';
    let responseBuffer = '';
    let hasError = false;

    try {
      // Check if it's an error response object
      if (stream && typeof stream === 'object' && stream.success === false) {
        console.log(`API returned error for ${modelId}:`, stream.error);
        hasError = true;
        const errorMessage = stream.error?.message || 'API request failed';
        
        // Check if it's a Puter model validation error or permission denied
        if ((errorMessage.includes('Field `model` is invalid') && errorMessage.includes('puter.com')) ||
            (errorMessage.includes('Permission denied') && errorMessage.includes('usage-limited-chat')) ||
            errorMessage.includes('Error 400') ||
            errorMessage.includes('400 Bad Request') ||
            errorMessage.includes('usage-limited-chat')) {
          console.log(`Puter/API error for ${modelId}: ${errorMessage}`);
          console.log(`Switching to Pollinations fallback for ${modelId}`);
          // Throw error to trigger Pollinations fallback
          throw new Error(`PUTER_ERROR: ${modelId}`);
        }
        
        fullResponse = `Error: ${errorMessage}`;
        onChunk(fullResponse, fullResponse);
      }
      // Check if it's an async iterable (streaming response)
      else if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        console.log(`Processing streaming response for ${modelId}`);

        for await (const chunk of stream) {
          try {
            console.log(`Received chunk for ${modelId}:`, chunk);
            
            // Special debug for GPT-5
            if (modelId === 'gpt-5-2025-08-07') {
              console.log('[GPT-5 DEBUG] Raw chunk:', JSON.stringify(chunk));
              console.log('[GPT-5 DEBUG] Chunk structure:', {
                hasChoices: chunk && chunk.choices !== undefined,
                choicesLength: chunk && chunk.choices ? chunk.choices.length : 0,
                hasDelta: chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta !== undefined,
                deltaContent: chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta ? chunk.choices[0].delta.content : undefined,
                hasContent: chunk && chunk.content !== undefined,
                hasText: chunk && chunk.text !== undefined,
                hasType: chunk && chunk.type !== undefined,
                chunkKeys: chunk ? Object.keys(chunk) : [],
                chunkType: typeof chunk
              });
            }

            // Check if chunk is an error response
            if (chunk && chunk.success === false) {
              hasError = true;
              const errorMessage = chunk.error?.message || 'Stream error';
              fullResponse = `Error: ${errorMessage}`;
              onChunk(fullResponse, fullResponse);
              break;
            }

            let chunkText = '';

            // Handle different streaming formats
            if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
              chunkText = chunk.choices[0].delta.content || '';
              if (modelId === 'gpt-5-2025-08-07' && chunkText) {
                console.log('[GPT-5 DEBUG] Extracted from choices[0].delta.content:', chunkText);
              }
            } else if (chunk.delta && chunk.delta.content) {
              chunkText = chunk.delta.content;
              if (modelId === 'gpt-5-2025-08-07' && chunkText) {
                console.log('[GPT-5 DEBUG] Extracted from delta.content:', chunkText);
              }
            } else if (chunk.content) {
              chunkText = chunk.content;
              if (modelId === 'gpt-5-2025-08-07' && chunkText) {
                console.log('[GPT-5 DEBUG] Extracted from content:', chunkText);
              }
            } else if (chunk.text) {
              chunkText = chunk.text;
              if (modelId === 'gpt-5-2025-08-07' && chunkText) {
                console.log('[GPT-5 DEBUG] Extracted from text:', chunkText);
              }
            } else if (chunk.type === 'text' && typeof chunk.text === 'string') {
              chunkText = chunk.text;
              if (modelId === 'gpt-5-2025-08-07' && chunkText) {
                console.log('[GPT-5 DEBUG] Extracted from type=text, text field:', chunkText);
              }
            } else if (typeof chunk === 'string') {
              chunkText = chunk;
              if (modelId === 'gpt-5-2025-08-07' && chunkText) {
                console.log('[GPT-5 DEBUG] Chunk was string:', chunkText);
              }
            }

            if (chunkText) {
              // Check if this chunk is not a duplicate of what we just added
              // This can happen if the streaming API sends duplicate chunks
              if (!fullResponse.endsWith(chunkText)) {
                responseBuffer += chunkText;
                fullResponse += chunkText;

                // Send chunk update with full accumulated text
                // The frontend will handle displaying the full text properly
                onChunk(chunkText, fullResponse);
                
                // Debug for GPT-5 accumulation
                if (modelId === 'gpt-5-2025-08-07') {
                  console.log('[GPT-5 DEBUG] Chunk added:', chunkText);
                  console.log('[GPT-5 DEBUG] Full response length:', fullResponse.length);
                }
              } else {
                if (modelId === 'gpt-5-2025-08-07') {
                  console.log('[GPT-5 DEBUG] Skipping duplicate chunk:', chunkText);
                }
              }
            }
          } catch (chunkError) {
            console.warn(`Error processing chunk for ${modelId}:`, chunkError);
            // Continue processing other chunks
          }
        }

        console.log(`Streaming complete for ${modelId}, full response:`, fullResponse);
      } else {
        // Fallback: treat as regular response
        console.log(`Fallback: treating response as non-streaming for ${modelId}`);
        try {
          const result = await stream;
          return this.processResponse(result, modelId, (response) => {
            onChunk(response.text, response.text);
            onComplete(response);
          });
        } catch (fallbackError) {
          console.warn(`Fallback failed for ${modelId}:`, fallbackError);
          hasError = true;
          // Return empty response instead of throwing
          fullResponse = "Sorry, I couldn't generate a response at this time.";
        }
      }

    } catch (error) {
      console.error(`Error processing streaming response for ${modelId}:`, error);
      hasError = true;

      // Check if error object has details
      if (error && error.success === false && error.error) {
        fullResponse = `Error: ${error.error.message || 'API request failed'}`;
      } else {
        fullResponse = "Sorry, I encountered an error while processing your request.";
      }

      // Send error as chunk to show user something is happening
      onChunk(fullResponse, fullResponse);
    }

    // Add assistant message to history
    if (fullResponse.trim()) {
      const assistantMessage = { role: 'assistant', content: fullResponse };
      this.addMessageToModelHistory(modelId, assistantMessage);
    }

    // Send final complete response
    onComplete({
      text: fullResponse,
      model: modelId,
      streaming: true
    });
  }

  async sendMessageToAllModels(message, modelIds, onChunk, onComplete, onError, enableStreaming = true) {
    if (!modelIds || modelIds.length === 0) {
      onError(new Error('No models specified'));
      return;
    }

    console.log(`Sending message to all models: ${modelIds.join(', ')} (streaming: ${enableStreaming})`);

    // Create promises for all models
    const promises = modelIds.map(modelId =>
      new Promise((resolve) => {
        this.sendMessageToModel(
          modelId,
          message,
          // onChunk
          (chunk, fullText) => {
            console.log(`Sending chunk to ${modelId}:`, chunk, "Full text:", fullText);
            onChunk(modelId, chunk, fullText);
          },
          // onComplete
          (result) => {
            onComplete(modelId, result);
            resolve(result);
          },
          // onError
          (error) => {
            console.error(`Error from ${modelId}:`, error);
            onError(modelId, error);
            resolve({ error, modelId });
          },
          enableStreaming
        );
      })
    );

    // Wait for all promises to settle
    return Promise.allSettled(promises);
  }
}

// Initialize GPT4Free integration only if it doesn't exist
if (!window.gpt4FreeIntegration) {
  window.gpt4FreeIntegration = new GPT4FreeIntegration();
}