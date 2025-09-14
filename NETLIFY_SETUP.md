# Netlify Functions Setup for AI Fiesta

This document explains how to set up and deploy AI Fiesta with Netlify Functions to resolve CORS issues.

## Overview

The application has been updated to use Netlify Functions instead of direct API calls to resolve CORS (Cross-Origin Resource Sharing) issues. This allows the frontend to make API calls through Netlify's serverless functions, which act as a proxy.

## Key Changes Made

### 1. PuterJS Analysis
- **PuterJS is frontend-only**: Research confirmed that PuterJS is designed for client-side operations and cannot be used for server-side API calls
- **Solution**: Replaced PuterJS integration with NetlifyProvider that uses Netlify Functions as a proxy

### 2. Netlify Functions Created
- `netlify/functions/api-proxy.js`: Handles regular API calls with CORS headers
- `netlify/functions/stream-proxy.js`: Handles streaming API responses

### 3. LocalServerProvider with Netlify Functions
- `js/local-server-provider.js`: Modified to use Netlify Functions as proxy for CORS resolution
- Keeps the same model configurations and token management
- Routes all API calls through Netlify Functions instead of direct calls
- Includes token validation and rotation logic

### 4. Configuration Updates
- `netlify.toml`: Updated with proper redirects and CORS headers
- `package.json`: Added dependencies for Netlify functions
- `index.html`: Updated script includes to use LocalServerProvider

## Deployment Instructions

### Option 1: Deploy to Netlify (Recommended)

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Deploy the site**:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Manual Deploy via Netlify Dashboard

1. Go to [netlify.com](https://netlify.com)
2. Create a new site
3. Connect your GitHub repository or drag and drop the project folder
4. Netlify will automatically detect the `netlify.toml` configuration

### Option 3: Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run locally with Netlify Functions**:
   ```bash
   netlify dev
   ```

3. **Test the functions**:
   - Open `http://localhost:8888/test-netlify-functions.html`
   - Run the test cases to verify everything works

## API Endpoints

The following endpoints are now available through Netlify Functions:

### `/api/proxy`
- **Method**: POST
- **Purpose**: Proxy regular API calls
- **Body**: 
  ```json
  {
    "path": "https://api.example.com/endpoint",
    "method": "POST",
    "headers": {"Authorization": "Bearer token"},
    "body": {"key": "value"}
  }
  ```

### `/api/stream`
- **Method**: POST
- **Purpose**: Proxy streaming API calls
- **Body**: Same as `/api/proxy` but returns streaming response

## Supported AI Models

The application supports the following AI models through the LocalServerProvider with Netlify Functions:

1. **ChatGPT (GPT-5)** - via PuterJS provider
2. **Claude 3.7 Sonnet** - via PuterJS provider  
3. **Gemini 2.5 Flash** - via Pollinations
4. **Grok 3 Fast** - via PuterJS provider
5. **DeepSeek V3** - via DeepInfra

## Token Management

- Tokens are loaded from `api.txt` file
- Tokens are validated on startup
- Valid tokens are cached in localStorage for 24 hours
- Automatic token rotation on auth errors
- Fallback token provided for testing

## Security Features

- CORS headers properly configured
- Allowed hosts whitelist in functions
- Request validation and sanitization
- Security headers in netlify.toml
- Input validation for API calls

## Testing

Use the included test file `test-netlify-functions.html` to verify:

1. Basic proxy functionality
2. Token validation
3. Streaming responses
4. NetlifyProvider integration

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure you're accessing the site through Netlify's domain, not localhost
2. **Function Timeout**: Some AI models may take longer to respond; adjust timeout in provider
3. **Token Issues**: Verify tokens in `api.txt` are valid and not expired

### Debug Mode

Enable debug logging by opening browser console and looking for:
- `[LocalServer]` logs for provider operations
- `[NetlifyProvider]` logs for Netlify function calls
- Network requests to `/api/proxy` and `/api/stream`

## Migration Notes

- Old providers (`gpt4free-integration.js`, `pollinations-provider.js`) are no longer used
- LocalServerProvider now routes all API calls through Netlify Functions
- Token management is handled by LocalServerProvider
- Streaming responses work through the stream proxy function

## Performance Considerations

- Netlify Functions have a 10-second timeout for free tier
- Consider upgrading for longer timeouts if needed
- Functions are cached for better performance
- Static assets are cached aggressively

## Next Steps

1. Deploy to Netlify
2. Test all AI models
3. Monitor function logs for any issues
4. Consider adding rate limiting if needed
5. Set up monitoring and alerts for function errors
