# Pollinations.AI Integration & Fixes Documentation

## Overview
This document describes the integration of Pollinations.AI as a fallback provider when Puter/GPT4Free is unavailable or doesn't support certain models.

## Key Changes Made

### 1. Pollinations.AI Provider (`js/pollinations-provider.js`)
- Created a dedicated provider for Pollinations.AI
- Implements OpenAI-compatible API endpoints
- Handles both streaming and non-streaming responses
- Model mappings for fallback:
  - **ChatGPT** → `openai` (free tier)
  - **Gemini** → `gemini` (free tier)
  - **Grok** → `mistral` (fallback, since Grok isn't on Pollinations)
  - **DeepSeek** → `qwen-coder` (fallback)
  - **Claude** → `null` (not available on Pollinations)

### 2. GPT4Free Integration Updates (`js/gpt4free-integration.js`)
- Added automatic fallback to Pollinations.AI when:
  - Puter provider is unavailable
  - Puter rejects model names as invalid
  - Network timeout occurs
- Detects Puter model validation errors and automatically switches to Pollinations
- Maintains separate model histories for each provider

### 3. Model Configuration Updates (`index.html`)
- Dynamic model configuration based on active provider:
  - **When using Puter**: Uses Puter's model IDs (gpt-4o, claude-3-5-sonnet-latest, etc.)
  - **When using Pollinations**: Uses Pollinations model IDs (openai, gemini, mistral, etc.)
- Claude is automatically disabled when using Pollinations
- Visual indicators show when models are unavailable

### 4. Mobile Fixes (`css/mobile-fixes.css`)
- Fixed Android input visibility issues:
  - Uses dynamic viewport height (`100dvh`)
  - Proper flex layout with `min-height: 0`
  - Sticky positioning for input area
  - Font size 16px to prevent zoom on focus
  - Safe area padding for devices with notches

## How It Works

### Provider Selection Flow
1. **Initial Load**: System tries to load GPT4Free/Puter
2. **Puter Available**: Uses Puter with its model IDs
3. **Puter Fails**: Automatically switches to Pollinations.AI
4. **Model Error**: If Puter rejects a model, switches to Pollinations for that request

### Model Availability
| Model | Puter | Pollinations | Fallback |
|-------|-------|--------------|----------|
| ChatGPT | gpt-4o, gpt-5 | openai | ✅ Works |
| Claude | claude-3-5-sonnet | ❌ Not available | Disabled |
| Gemini | gemini-pro | gemini | ✅ Works |
| Grok | grok-2 | mistral | ✅ Uses Mistral |
| DeepSeek | deepseek-v3 | qwen-coder | ✅ Uses Qwen |

### Error Handling
- **Puter Model Invalid**: Automatically retries with Pollinations
- **Network Timeout**: Falls back to Pollinations after 3 seconds
- **Claude Selected**: Shows user-friendly message about unavailability

## Testing

### Test Pages
- `test-pollinations.html` - Test Pollinations.AI integration
- `test-models.html` - Test model configurations

### Testing Steps
1. Open http://localhost:8081
2. Send a message - system will auto-detect best provider
3. Check console for provider selection logs
4. Claude will be disabled if using Pollinations

## API Endpoints Used

### Pollinations.AI
- **Models List**: `https://text.pollinations.ai/models`
- **Chat Completions**: `https://text.pollinations.ai/openai/v1/chat/completions`
- **Authentication**: None required (free tier)

### Rate Limits
- Text API: 1 concurrent request / 3 sec interval per IP
- No authentication required
- Best effort service

## Troubleshooting

### Common Issues
1. **Claude not working**: Expected - Claude is not available on Pollinations
2. **Grok shows as Mistral**: Expected - Grok isn't on Pollinations, uses Mistral as fallback
3. **DeepSeek shows as Qwen**: Expected - DeepSeek isn't on Pollinations, uses Qwen Coder as fallback

### Debug Information
- Check browser console for provider selection logs
- Look for "Using Pollinations.AI" or "Using GPT4Free" messages
- Model mapping logs show which models are being used

## Benefits
1. **Automatic Fallback**: No manual intervention needed
2. **Free Tier**: Pollinations doesn't require API keys
3. **Seamless Experience**: Users don't notice provider switches
4. **Model Compatibility**: Best effort to match requested models

## Future Improvements
1. Add more Pollinations models as they become available
2. Implement tier detection for advanced models
3. Add user preference for provider selection
4. Cache provider availability status

## Citations
- Pollinations.AI Documentation: https://pollinations.ai/APIDOCS.md
- GPT4Free: https://github.com/xtekky/gpt4free
- Puter AI Models: https://puter.com/puterai/chat/models
