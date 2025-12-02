import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Simple toast component - can be enhanced with a toast store if needed
function Toast() {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {/* Toasts will be rendered here when implemented */}
      </AnimatePresence>
    </div>
  )
}

export default memo(Toast)
