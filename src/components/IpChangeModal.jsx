import { memo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clearIpBlocked, clearSession } from '../utils/puterAuth'

const IpChangeModal = memo(({ isOpen, onClose, onRetry }) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleRetry = () => {
        clearIpBlocked()
        clearSession()
        onRetry?.()
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ip-change-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="ip-change-modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="ip-modal-header">
                            <span className="ip-modal-icon">📱</span>
                            <h2>Change Your IP Address</h2>
                            <p>Too many requests from your current IP. Follow these steps to continue:</p>
                        </div>

                        <div className="ip-modal-steps">
                            <div className="ip-step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h4>Turn on Airplane Mode</h4>
                                    <p>Swipe down to access quick settings and tap ✈️ airplane mode</p>
                                </div>
                            </div>

                            <div className="ip-step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h4>Wait 5 Seconds</h4>
                                    <p>Give your device a moment to disconnect from the network</p>
                                </div>
                            </div>

                            <div className="ip-step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h4>Turn off Airplane Mode</h4>
                                    <p>Your device will reconnect with a new IP address</p>
                                </div>
                            </div>

                            <div className="ip-step">
                                <div className="step-number">4</div>
                                <div className="step-content">
                                    <h4>Click Retry Below</h4>
                                    <p>We'll create a new session with your fresh IP</p>
                                </div>
                            </div>
                        </div>

                        <div className="ip-modal-note">
                            <span className="note-icon">💡</span>
                            <p>
                                <strong>Pro Tip:</strong> This works best on mobile data. If you're on WiFi,
                                try switching to mobile data, or restart your router for a new IP.
                            </p>
                        </div>

                        <div className="ip-modal-alternative">
                            <h4>Alternative Methods:</h4>
                            <ul>
                                <li>📶 Switch between WiFi and Mobile Data</li>
                                <li>🔄 Restart your router (may get new IP)</li>
                                <li>🌐 Use a VPN to change your IP</li>
                            </ul>
                        </div>

                        <div className="ip-modal-actions">
                            <button className="ip-btn-secondary" onClick={onClose}>
                                Close
                            </button>
                            <button className="ip-btn-primary" onClick={handleRetry}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 4v6h6M23 20v-6h-6" />
                                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                                </svg>
                                I've Changed My IP - Retry
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})

IpChangeModal.displayName = 'IpChangeModal'

export default IpChangeModal
