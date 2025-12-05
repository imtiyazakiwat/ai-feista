import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
    isSignedIn,
    signOut,
    isIpBlocked,
    clearIpBlocked,
    clearSession,
    handleRateLimitError,
    isPuterAvailable,
    signInWithTempAccount
} from '../utils/puterAuth'
import { setRateLimitCallbacks } from '../utils/puterApi'

const PuterContext = createContext(null)

// Key for storing if user has signed in before
const SIGNED_IN_KEY = 'ai-fiesta-signed-in'

export function PuterProvider({ children }) {
    const [sessionStatus, setSessionStatus] = useState('checking') // 'checking' | 'not_signed_in' | 'active' | 'error' | 'ip_blocked'
    const [showIpModal, setShowIpModal] = useState(false)
    const [showRotatingToast, setShowRotatingToast] = useState(false)
    const [showWelcomeModal, setShowWelcomeModal] = useState(false)
    const [isSigningIn, setIsSigningIn] = useState(false)
    const [sessionCount, setSessionCount] = useState(0)

    // Check session on load - show welcome if not signed in before
    useEffect(() => {
        const checkSession = async () => {
            // Wait a bit for Puter SDK to load
            await new Promise(resolve => setTimeout(resolve, 1000))

            if (!isPuterAvailable()) {
                console.log('Puter SDK not available yet, waiting...')
                // Retry after a bit
                await new Promise(resolve => setTimeout(resolve, 2000))
                if (!isPuterAvailable()) {
                    console.error('Puter SDK failed to load')
                    setSessionStatus('error')
                    return
                }
            }

            if (isIpBlocked()) {
                setSessionStatus('ip_blocked')
                setShowIpModal(true)
                return
            }

            // Check if already signed in (from previous session)
            if (isSignedIn()) {
                console.log('Already signed in with Puter')
                setSessionStatus('active')
                localStorage.setItem(SIGNED_IN_KEY, 'true')
                setSessionCount(prev => prev + 1)
                return
            }

            // Check if user has signed in before
            const hasSignedInBefore = localStorage.getItem(SIGNED_IN_KEY)

            if (hasSignedInBefore) {
                // Auto sign-in for returning users
                console.log('Returning user - auto signing in...')
                await autoSignIn()
            } else {
                // New user - show welcome modal
                console.log('New user - showing welcome modal')
                setSessionStatus('not_signed_in')
                setShowWelcomeModal(true)
            }
        }

        checkSession()
    }, [])

    // Auto sign-in function
    const autoSignIn = async () => {
        try {
            const result = await signInWithTempAccount()

            if (result.success) {
                console.log('Puter sign-in successful')
                setSessionStatus('active')
                localStorage.setItem(SIGNED_IN_KEY, 'true')
                setSessionCount(prev => prev + 1)
            } else if (result.error === 'ip_blocked') {
                setSessionStatus('ip_blocked')
                setShowIpModal(true)
            } else {
                console.log('Puter sign-in failed:', result.error)
                setSessionStatus('not_signed_in')
                setShowWelcomeModal(true)
            }
        } catch (error) {
            console.error('Puter sign-in error:', error)
            setSessionStatus('not_signed_in')
            setShowWelcomeModal(true)
        }
    }

    // Set up callbacks for rate limit handling
    useEffect(() => {
        setRateLimitCallbacks({
            onRateLimit: () => {
                console.log('Rate limit callback triggered')
                setShowRotatingToast(true)
            },
            onIpBlocked: () => {
                console.log('IP blocked callback triggered')
                setSessionStatus('ip_blocked')
                setShowIpModal(true)
                setShowRotatingToast(false)
            },
            onSessionRotated: () => {
                console.log('Session rotated successfully')
                setSessionCount(prev => prev + 1)
                setShowRotatingToast(false)
                setSessionStatus('active')
            }
        })
    }, [])

    // Sign in as guest (from welcome modal)
    const signInAsGuest = useCallback(async () => {
        if (!isPuterAvailable()) {
            console.error('Puter SDK not available')
            return { success: false, error: 'Puter SDK not available' }
        }

        setIsSigningIn(true)

        try {
            const result = await signInWithTempAccount()

            if (result.success) {
                setSessionStatus('active')
                localStorage.setItem(SIGNED_IN_KEY, 'true')
                setSessionCount(prev => prev + 1)
                setShowWelcomeModal(false)
                setIsSigningIn(false)
                return { success: true }
            }

            if (result.error === 'ip_blocked') {
                setSessionStatus('ip_blocked')
                setShowIpModal(true)
                setShowWelcomeModal(false)
                setIsSigningIn(false)
                return { success: false, ipBlocked: true }
            }

            setSessionStatus('not_signed_in')
            setIsSigningIn(false)
            return { success: false, error: result.error }
        } catch (error) {
            setSessionStatus('not_signed_in')
            setIsSigningIn(false)
            return { success: false, error: error.message }
        }
    }, [])

    // Manual sign in with Puter (alias)
    const signInWithPuter = signInAsGuest

    // Retry after IP change
    const handleRetryAfterIpChange = useCallback(async () => {
        setShowIpModal(false)
        setSessionStatus('checking')
        clearIpBlocked()
        clearSession()

        // Wait a moment then try to create new session
        await new Promise(resolve => setTimeout(resolve, 1000))

        const result = await signInWithTempAccount()

        if (result.success) {
            setSessionStatus('active')
            localStorage.setItem(SIGNED_IN_KEY, 'true')
            setSessionCount(prev => prev + 1)
        } else if (result.error === 'ip_blocked') {
            setSessionStatus('ip_blocked')
            setShowIpModal(true)
        } else {
            setSessionStatus('not_signed_in')
            setShowWelcomeModal(true)
        }
    }, [])

    // Manual session reset
    const resetSession = useCallback(async () => {
        signOut()
        setSessionStatus('checking')

        const result = await handleRateLimitError()

        if (result.success) {
            setSessionStatus('active')
            setSessionCount(prev => prev + 1)
        } else if (result.ipBlocked) {
            setSessionStatus('ip_blocked')
            setShowIpModal(true)
        } else {
            setSessionStatus('not_signed_in')
        }
    }, [])

    const value = {
        sessionStatus,
        sessionCount,
        showIpModal,
        showRotatingToast,
        showWelcomeModal,
        isSigningIn,
        setShowIpModal,
        setShowWelcomeModal,
        handleRetryAfterIpChange,
        resetSession,
        signInWithPuter,
        signInAsGuest,
        isActive: sessionStatus === 'active',
        isBlocked: sessionStatus === 'ip_blocked'
    }

    return (
        <PuterContext.Provider value={value}>
            {children}
        </PuterContext.Provider>
    )
}

export function usePuter() {
    const context = useContext(PuterContext)
    if (!context) {
        throw new Error('usePuter must be used within a PuterProvider')
    }
    return context
}

export default PuterContext
