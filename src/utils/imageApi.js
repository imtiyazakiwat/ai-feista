// Image Generation API using Pollinations.ai (free, no API key required)

// Available image generation models
export const IMAGE_MODELS = {
  'flux': {
    id: 'flux',
    name: 'FLUX',
    icon: '⚡',
    color: '#8B5CF6'
  },
  'flux-realism': {
    id: 'flux-realism',
    name: 'FLUX Realism',
    icon: '📷',
    color: '#10a37f'
  },
  'flux-anime': {
    id: 'flux-anime',
    name: 'FLUX Anime',
    icon: '🎨',
    color: '#FF6B6B'
  },
  'flux-3d': {
    id: 'flux-3d',
    name: 'FLUX 3D',
    icon: '🎮',
    color: '#4285f4'
  },
  'turbo': {
    id: 'turbo',
    name: 'Turbo',
    icon: '🚀',
    color: '#f59e0b'
  }
}

export async function generateImage(prompt, modelKey = 'flux', options = {}) {
  const model = IMAGE_MODELS[modelKey]
  if (!model) {
    throw new Error(`Unknown image model: ${modelKey}`)
  }

  const width = options.width || 1024
  const height = options.height || 1024
  const seed = options.seed || Math.floor(Math.random() * 1000000)
  
  // Build Pollinations URL
  const encodedPrompt = encodeURIComponent(prompt)
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model.id}&width=${width}&height=${height}&seed=${seed}&nologo=true`
  
  try {
    // Fetch the image and convert to base64
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error('Image generation failed')
    }
    
    const blob = await response.blob()
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]
        resolve({
          base64,
          mimeType: blob.type || 'image/jpeg',
          imageUrl, // Also return direct URL
          model: model.name
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    throw new Error(error.message || 'Image generation failed')
  }
}

// Parse /generate command from message
export function parseGenerateCommand(message) {
  const trimmed = message.trim()
  if (!trimmed.toLowerCase().startsWith('/generate')) {
    return null
  }

  // Extract prompt after /generate
  const prompt = trimmed.slice(9).trim()
  if (!prompt) {
    return { error: 'Please provide a prompt after /generate' }
  }

  // Check for model flag: /generate --model=gpt-image prompt
  let modelKey = 'flux-schnell' // default
  let finalPrompt = prompt

  const modelMatch = prompt.match(/^--model=(\S+)\s+(.+)$/i)
  if (modelMatch) {
    const requestedModel = modelMatch[1].toLowerCase()
    if (IMAGE_MODELS[requestedModel]) {
      modelKey = requestedModel
    }
    finalPrompt = modelMatch[2]
  }

  return {
    prompt: finalPrompt,
    model: modelKey
  }
}
