import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Welcome Modal - Shows when user first visits to sign in as guest
function WelcomeModal({ isOpen, onSignIn, isLoading }) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                className="welcome-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="welcome-modal"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Logo */}
                    <div className="welcome-modal-logo">
                        <div className="welcome-logo-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <h1>AI Fiesta</h1>
                    </div>

                    {/* Description */}
                    <div className="welcome-modal-content">
                        <h2>Welcome to Multi-Model AI Chat</h2>
                        <p>Chat with multiple AI models simultaneously - ChatGPT, Claude, Gemini, DeepSeek, Grok, and more!</p>

                        <div className="welcome-features">
                            <div className="welcome-feature">
                                <span className="feature-icon">🤖</span>
                                <span>7+ AI Models</span>
                            </div>
                            <div className="welcome-feature">
                                <span className="feature-icon">⚡</span>
                                <span>Real-time Streaming</span>
                            </div>
                            <div className="welcome-feature">
                                <span className="feature-icon">🧠</span>
                                <span>Thinking Mode</span>
                            </div>
                            <div className="welcome-feature">
                                <span className="feature-icon">🌐</span>
                                <span>Web Search</span>
                            </div>
                        </div>
                    </div>

                    {/* Sign In Button */}
                    <button
                        className="welcome-signin-btn"
                        onClick={onSignIn}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                                Signing in...
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                                </svg>
                                Continue as Guest
                            </>
                        )}
                    </button>

                    <p className="welcome-disclaimer">
                        Free to use • No account required • Powered by Puter
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default memo(WelcomeModal)
