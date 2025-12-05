// Puter.js Authentication and Session Management
// Handles temp account rotation on rate limiting

const PUTER_SESSION_KEY = 'puter-temp-session'
const RATE_LIMIT_COUNT_KEY = 'puter-rate-limit-count'
const IP_BLOCKED_KEY = 'puter-ip-blocked'

// Puter supports OpenRouter models directly - just pass the model ID as-is
// Example: 'openrouter:openai/gpt-5-mini' works directly with puter.ai.chat()
export function getPuterModelId(openRouterId) {
    // Pass the model ID directly - Puter handles OpenRouter models
    return openRouterId
}

// Check if Puter SDK is available
export function isPuterAvailable() {
    return typeof window !== 'undefined' && window.puter && window.puter.ai
}

// Check if user is signed in
export function isSignedIn() {
    if (!isPuterAvailable()) return false
    return window.puter.auth.isSignedIn()
}

// Get current user info
export async function getUser() {
    if (!isPuterAvailable()) return null
    try {
        return await window.puter.auth.getUser()
    } catch {
        return null
    }
}

// Sign in with temp account (silent, no popup)
export async function signInWithTempAccount() {
    if (!isPuterAvailable()) {
        throw new Error('Puter SDK not available')
    }

    try {
        // Clear any existing session data
        clearSession()

        // Try to create a temp account
        const result = await window.puter.auth.signIn()

        if (result) {
            // Store session info
            localStorage.setItem(PUTER_SESSION_KEY, JSON.stringify({
                timestamp: Date.now(),
                type: 'temp'
            }))
            resetRateLimitCount()
            return { success: true, user: result }
        }

        return { success: false, error: 'Sign in failed' }
    } catch (error) {
        // Check if IP is blocked (too many temp accounts)
        if (error.message?.includes('rate') || error.message?.includes('limit') || error.message?.includes('blocked')) {
            markIpBlocked()
            return { success: false, error: 'ip_blocked', message: error.message }
        }
        return { success: false, error: error.message }
    }
}

// Sign out and clear session
export function signOut() {
    if (isPuterAvailable()) {
        try {
            window.puter.auth.signOut()
        } catch (e) {
            // Ignore errors during sign out
        }
    }
    clearSession()
}

// Clear all session data
export function clearSession() {
    localStorage.removeItem(PUTER_SESSION_KEY)
    // Clear Puter's own storage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
        if (key.startsWith('puter')) {
            localStorage.removeItem(key)
        }
    })
}

// Track rate limit occurrences
export function incrementRateLimitCount() {
    const count = getRateLimitCount() + 1
    localStorage.setItem(RATE_LIMIT_COUNT_KEY, count.toString())
    return count
}

export function getRateLimitCount() {
    return parseInt(localStorage.getItem(RATE_LIMIT_COUNT_KEY) || '0', 10)
}

export function resetRateLimitCount() {
    localStorage.setItem(RATE_LIMIT_COUNT_KEY, '0')
}

// IP blocked tracking
export function markIpBlocked() {
    localStorage.setItem(IP_BLOCKED_KEY, Date.now().toString())
}

export function isIpBlocked() {
    const blockedTime = localStorage.getItem(IP_BLOCKED_KEY)
    if (!blockedTime) return false
    // Consider blocked for 1 hour
    const oneHour = 60 * 60 * 1000
    return Date.now() - parseInt(blockedTime, 10) < oneHour
}

export function clearIpBlocked() {
    localStorage.removeItem(IP_BLOCKED_KEY)
}

// Handle rate limit error - rotate to new temp account
export async function handleRateLimitError() {
    const count = incrementRateLimitCount()
    console.log(`Rate limit hit. Count: ${count}`)

    // Sign out current session
    signOut()

    // Try to create new temp account
    const result = await signInWithTempAccount()

    if (result.success) {
        return { success: true, newSession: true }
    }

    if (result.error === 'ip_blocked') {
        return { success: false, ipBlocked: true }
    }

    return { success: false, error: result.error }
}

// Initialize Puter session on app load
export async function initializePuterSession() {
    if (!isPuterAvailable()) {
        console.warn('Puter SDK not loaded yet')
        return { success: false, error: 'SDK not available' }
    }

    // Check if IP was previously blocked
    if (isIpBlocked()) {
        return { success: false, ipBlocked: true }
    }

    // Check if already signed in
    if (isSignedIn()) {
        return { success: true, existing: true }
    }

    // Create new temp account
    return await signInWithTempAccount()
}

// Check if error is a rate limit error
export function isRateLimitError(error) {
    if (!error) return false
    const errorStr = typeof error === 'string' ? error : error.message || ''
    const lowerError = errorStr.toLowerCase()
    return (
        lowerError.includes('rate') ||
        lowerError.includes('limit') ||
        lowerError.includes('quota') ||
        lowerError.includes('exceeded') ||
        lowerError.includes('too many') ||
        lowerError.includes('429')
    )
}
