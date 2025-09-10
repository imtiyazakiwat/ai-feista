// GPT4Free Integration for Multi-Model Chat
class GPT4FreeIntegration {
  constructor() {
    this.client = null;
    this.availableModels = [];
    this.modelHistories = {}; // Store independent chat history for each model
    this.providers = {};
    this.init();
  }

  async init() {
    try {
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
        throw new Error('Failed to import GPT4Free client');
      }

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
      await this.createClient();
      
      // Load available models
      await this.loadAvailableModels();
      
      console.log('GPT4Free integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GPT4Free integration:', error);
      // Create a fallback mock client for testing
      this.createFallbackClient();
    }
  }

  async createClient() {
    try {
      // Try different providers in order of preference
      if (this.providers.Puter) {
        this.client = new this.providers.Puter();
        console.log('Client created with Puter provider');
      } else if (this.providers.PollinationsAI) {
        this.client = new this.providers.PollinationsAI({ apiKey: 'optional' });
        console.log('Client created with PollinationsAI provider');
      } else if (this.providers.DeepInfra) {
        this.client = new this.providers.DeepInfra({ apiKey: 'optional' });
        console.log('Client created with DeepInfra provider');
      } else if (this.providers.Client) {
        // Fallback to generic client with local GPT4Free instance
        this.client = new this.providers.Client({ 
          baseUrl: 'https://g4f.dev/v1', 
          apiKey: 'free' 
        });
        console.log('Client created with generic Client provider');
      } else {
        throw new Error('No valid providers available');
      }
    } catch (error) {
      console.error('Failed to create client with any provider:', error);
      throw error;
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
      console.log('Loading available models from GPT4Free...');
      
      // Use the proper GPT4Free client method
      let models = [];
      
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
    return this.availableModels;
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
      for (let attempt = 1; attempt <= 3; attempt++) {
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
              setTimeout(() => reject(new Error(`Request timeout after 60 seconds (attempt ${attempt})`)), 60000)
            )
          ]);

          // If successful, process the streaming result
          console.log(`Request successful for ${modelId} on attempt ${attempt}`);
          return this.processStreamingResponse(stream, modelId, onChunk, onComplete);

        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt} failed for ${modelId}:`, error?.message || error);

          if (attempt < 3) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
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
              console.log('[GPT-5 DEBUG] Raw chunk structure:', {
                hasChoices: chunk && chunk.choices !== undefined,
                hasDelta: chunk && chunk.delta !== undefined,
                hasContent: chunk && chunk.content !== undefined,
                hasText: chunk && chunk.text !== undefined,
                hasType: chunk && chunk.type !== undefined,
                chunkKeys: chunk ? Object.keys(chunk) : []
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
            } else if (chunk.delta && chunk.delta.content) {
              chunkText = chunk.delta.content;
            } else if (chunk.content) {
              chunkText = chunk.content;
            } else if (chunk.text) {
              chunkText = chunk.text;
            } else if (chunk.type === 'text' && typeof chunk.text === 'string') {
              chunkText = chunk.text;
            } else if (typeof chunk === 'string') {
              chunkText = chunk;
            }

            if (chunkText) {
              responseBuffer += chunkText;
              fullResponse += chunkText;

              // Send chunk update
              onChunk(chunkText, fullResponse);
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