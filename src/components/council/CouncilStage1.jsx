import { memo, useState, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MarkdownRenderer = lazy(() => import('../MarkdownRenderer'))

function CouncilStage1({ responses, isLoading }) {
  const [activeTab, setActiveTab] = useState(0)

  if (isLoading) {
    return (
      <div className="council-stage council-stage1">
        <div className="council-stage-header">
          <span className="council-stage-icon">1</span>
          <span className="council-stage-title">Stage 1: Collecting Responses</span>
          <div className="council-spinner" />
        </div>
        <div className="council-stage-loading">
          <div className="skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        </div>
      </div>
    )
  }

  if (!responses || responses.length === 0) return null

  const getModelShortName = (model) => {
    const parts = model.split('/')
    return parts[parts.length - 1] || model
  }

  return (
    <div className="council-stage council-stage1">
      <div className="council-stage-header">
        <span className="council-stage-icon">1</span>
        <span className="council-stage-title">Stage 1: Individual Responses</span>
        <span className="council-stage-badge">{responses.length} models</span>
      </div>

      <div className="council-tabs">
        {responses.map((resp, index) => (
          <button
            key={index}
            className={`council-tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {getModelShortName(resp.model)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="council-tab-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          <div className="council-model-label">{responses[activeTab].model}</div>
          <div className="council-response-text">
            <Suspense fallback={<div>{responses[activeTab].response}</div>}>
              <MarkdownRenderer content={responses[activeTab].response} />
            </Suspense>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default memo(CouncilStage1)
