// LLM Council API - 3-stage orchestration using the existing unified API
const DIRECT_API_URL = 'https://unifiedapi.vercel.app/v1/chat/completions'
const API_KEY = 'sk-0000d80ad3c542d29120527e66963a2e'

// Get Puter auth token if available
function getPuterToken() {
  if (typeof window !== 'undefined' && window.puter) {
    return window.puter.authToken || window.puter.auth?.getToken?.() || window.puter.token || null
  }
  return null
}

// Council models - using the same latest models as AI Fiesta
const COUNCIL_MODELS = [
  'openrouter:openai/gpt-5.1',           // ChatGPT (latest)
  'openrouter:google/gemini-2.5-pro',    // Gemini
  'openrouter:anthropic/claude-opus-4.5', // Claude (latest)
  'openrouter:x-ai/grok-4',              // Grok (latest)
  'openrouter:deepseek/deepseek-v3.2',   // DeepSeek (latest)
]

// Chairman model for final synthesis - using Gemini for speed and quality
const CHAIRMAN_MODEL = 'openrouter:google/gemini-2.5-pro'

async function queryModel(model, messages, timeout = 120000, externalSignal = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // If external signal is aborted, abort this request too
  if (externalSignal?.aborted) {
    clearTimeout(timeoutId)
    return null
  }

  // Listen for external abort
  const abortHandler = () => controller.abort()
  externalSignal?.addEventListener('abort', abortHandler)

  // Build headers with optional Puter token
  const puterToken = getPuterToken()
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
  if (puterToken) {
    headers['X-Puter-Token'] = puterToken
  }

  try {
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', abortHandler)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      content: data.choices?.[0]?.message?.content || '',
      reasoning_details: data.choices?.[0]?.message?.reasoning_details
    }
  } catch (error) {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', abortHandler)
    if (error.name === 'AbortError') {
      return null // Silently return null on abort
    }
    console.error(`Error querying model ${model}:`, error)
    return null
  }
}

async function queryModelsParallel(models, messages, signal = null) {
  // Check if already aborted
  if (signal?.aborted) return {}

  const promises = models.map(model => queryModel(model, messages, 120000, signal))
  const responses = await Promise.all(promises)

  const result = {}
  models.forEach((model, idx) => {
    result[model] = responses[idx]
  })
  return result
}

// Stage 1: Collect individual responses from all council models
async function stage1CollectResponses(userQuery, onProgress, signal = null) {
  if (signal?.aborted) return []

  onProgress?.({ stage: 1, status: 'start' })

  const messages = [{ role: 'user', content: userQuery }]
  const responses = await queryModelsParallel(COUNCIL_MODELS, messages, signal)

  if (signal?.aborted) return []

  const stage1Results = []
  for (const [model, response] of Object.entries(responses)) {
    if (response !== null) {
      stage1Results.push({
        model: model.replace('openrouter:', ''),
        response: response.content
      })
    }
  }

  onProgress?.({ stage: 1, status: 'complete', data: stage1Results })
  return stage1Results
}

// Stage 2: Each model ranks the anonymized responses
async function stage2CollectRankings(userQuery, stage1Results, onProgress, signal = null) {
  if (signal?.aborted) return { stage2Results: [], labelToModel: {} }

  onProgress?.({ stage: 2, status: 'start' })

  // Create anonymized labels (Response A, B, C, etc.)
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i))

  // Create mapping from label to model name
  const labelToModel = {}
  labels.forEach((label, idx) => {
    labelToModel[`Response ${label}`] = stage1Results[idx].model
  })

  // Build the ranking prompt
  const responsesText = stage1Results.map((result, idx) =>
    `Response ${labels[idx]}:\n${result.response}`
  ).join('\n\n')

  const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`

  const messages = [{ role: 'user', content: rankingPrompt }]
  const responses = await queryModelsParallel(COUNCIL_MODELS, messages, signal)

  if (signal?.aborted) return { stage2Results: [], labelToModel: {} }

  const stage2Results = []
  for (const [model, response] of Object.entries(responses)) {
    if (response !== null) {
      const fullText = response.content
      const parsed = parseRankingFromText(fullText)
      stage2Results.push({
        model: model.replace('openrouter:', ''),
        ranking: fullText,
        parsed_ranking: parsed
      })
    }
  }

  onProgress?.({
    stage: 2,
    status: 'complete',
    data: stage2Results,
    metadata: { label_to_model: labelToModel }
  })

  return { stage2Results, labelToModel }
}

// Stage 3: Chairman synthesizes final response
async function stage3Synthesize(userQuery, stage1Results, stage2Results, onProgress, signal = null) {
  if (signal?.aborted) return { model: '', response: 'Generation stopped.' }

  onProgress?.({ stage: 3, status: 'start' })

  const stage1Text = stage1Results.map(result =>
    `Model: ${result.model}\nResponse: ${result.response}`
  ).join('\n\n')

  const stage2Text = stage2Results.map(result =>
    `Model: ${result.model}\nRanking: ${result.ranking}`
  ).join('\n\n')

  const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: ${userQuery}

STAGE 1 - Individual Responses:
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`

  const messages = [{ role: 'user', content: chairmanPrompt }]
  const response = await queryModel(CHAIRMAN_MODEL, messages, 120000, signal)

  if (signal?.aborted) return { model: '', response: 'Generation stopped.' }

  const stage3Result = {
    model: CHAIRMAN_MODEL.replace('openrouter:', ''),
    response: response?.content || 'Error: Unable to generate final synthesis.'
  }

  onProgress?.({ stage: 3, status: 'complete', data: stage3Result })
  return stage3Result
}

function parseRankingFromText(rankingText) {
  if (rankingText.includes('FINAL RANKING:')) {
    const parts = rankingText.split('FINAL RANKING:')
    if (parts.length >= 2) {
      const rankingSection = parts[1]
      const numberedMatches = rankingSection.match(/\d+\.\s*Response [A-Z]/g)
      if (numberedMatches) {
        return numberedMatches.map(m => m.match(/Response [A-Z]/)[0])
      }
      const matches = rankingSection.match(/Response [A-Z]/g)
      return matches || []
    }
  }
  const matches = rankingText.match(/Response [A-Z]/g)
  return matches || []
}

function calculateAggregateRankings(stage2Results, labelToModel) {
  const modelPositions = {}

  for (const ranking of stage2Results) {
    const parsedRanking = ranking.parsed_ranking || parseRankingFromText(ranking.ranking)

    parsedRanking.forEach((label, position) => {
      if (labelToModel[label]) {
        const modelName = labelToModel[label]
        if (!modelPositions[modelName]) {
          modelPositions[modelName] = []
        }
        modelPositions[modelName].push(position + 1)
      }
    })
  }

  const aggregate = []
  for (const [model, positions] of Object.entries(modelPositions)) {
    if (positions.length > 0) {
      const avgRank = positions.reduce((a, b) => a + b, 0) / positions.length
      aggregate.push({
        model,
        average_rank: Math.round(avgRank * 100) / 100,
        rankings_count: positions.length
      })
    }
  }

  aggregate.sort((a, b) => a.average_rank - b.average_rank)
  return aggregate
}

// Run the full council process
export async function runCouncil(userQuery, onProgress, signal = null) {
  try {
    // Check if already aborted
    if (signal?.aborted) {
      return { error: 'Generation stopped.', stage1: [], stage2: [], stage3: null, metadata: {}, stopped: true }
    }

    // Stage 1
    const stage1Results = await stage1CollectResponses(userQuery, onProgress, signal)

    if (signal?.aborted) {
      return { error: 'Generation stopped.', stage1: stage1Results, stage2: [], stage3: null, metadata: {}, stopped: true }
    }

    if (stage1Results.length === 0) {
      return {
        error: 'All models failed to respond. Please try again.',
        stage1: [],
        stage2: [],
        stage3: null,
        metadata: {}
      }
    }

    // Stage 2
    const { stage2Results, labelToModel } = await stage2CollectRankings(
      userQuery,
      stage1Results,
      onProgress,
      signal
    )

    if (signal?.aborted) {
      return { error: 'Generation stopped.', stage1: stage1Results, stage2: stage2Results, stage3: null, metadata: { label_to_model: labelToModel }, stopped: true }
    }

    // Calculate aggregate rankings
    const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel)

    // Stage 3
    const stage3Result = await stage3Synthesize(
      userQuery,
      stage1Results,
      stage2Results,
      onProgress,
      signal
    )

    return {
      stage1: stage1Results,
      stage2: stage2Results,
      stage3: stage3Result,
      metadata: {
        label_to_model: labelToModel,
        aggregate_rankings: aggregateRankings
      },
      stopped: signal?.aborted
    }
  } catch (error) {
    console.error('Council error:', error)
    return {
      error: signal?.aborted ? 'Generation stopped.' : error.message,
      stage1: [],
      stage2: [],
      stage3: null,
      metadata: {},
      stopped: signal?.aborted
    }
  }
}

export { COUNCIL_MODELS, CHAIRMAN_MODEL }
