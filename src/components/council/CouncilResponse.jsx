import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CouncilStage1 from './CouncilStage1'
import CouncilStage2 from './CouncilStage2'
import CouncilStage3 from './CouncilStage3'

function CouncilResponse({ councilData }) {
  const [expandedStages, setExpandedStages] = useState({ 1: true, 2: true, 3: true })

  if (!councilData) return null

  const { stage1, stage2, stage3, metadata, loading } = councilData

  const toggleStage = (stage) => {
    setExpandedStages(prev => ({ ...prev, [stage]: !prev[stage] }))
  }

  return (
    <div className="council-response">
      <div className="council-header">
        <span className="council-icon">🏛️</span>
        <span className="council-title">LLM Council</span>
        <span className="council-beta-badge">BETA</span>
      </div>

      <div className="council-stages">
        {/* Stage 1 */}
        <div className={`council-stage-wrapper ${expandedStages[1] ? 'expanded' : 'collapsed'}`}>
          <button 
            className="council-stage-toggle"
            onClick={() => toggleStage(1)}
          >
            <svg 
              className="council-toggle-icon" 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6"/>
            </svg>
            Stage 1: Individual Responses
            {loading?.stage1 && <div className="council-spinner-small" />}
            {stage1 && <span className="council-check">✓</span>}
          </button>
          <AnimatePresence>
            {expandedStages[1] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CouncilStage1 responses={stage1} isLoading={loading?.stage1} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stage 2 */}
        {(stage2 || loading?.stage2) && (
          <div className={`council-stage-wrapper ${expandedStages[2] ? 'expanded' : 'collapsed'}`}>
            <button 
              className="council-stage-toggle"
              onClick={() => toggleStage(2)}
            >
              <svg 
                className="council-toggle-icon" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
              Stage 2: Peer Rankings
              {loading?.stage2 && <div className="council-spinner-small" />}
              {stage2 && <span className="council-check">✓</span>}
            </button>
            <AnimatePresence>
              {expandedStages[2] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CouncilStage2 
                    rankings={stage2} 
                    labelToModel={metadata?.label_to_model}
                    aggregateRankings={metadata?.aggregate_rankings}
                    isLoading={loading?.stage2} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Stage 3 */}
        {(stage3 || loading?.stage3) && (
          <div className={`council-stage-wrapper ${expandedStages[3] ? 'expanded' : 'collapsed'}`}>
            <button 
              className="council-stage-toggle"
              onClick={() => toggleStage(3)}
            >
              <svg 
                className="council-toggle-icon" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
              Stage 3: Final Answer
              {loading?.stage3 && <div className="council-spinner-small" />}
              {stage3 && <span className="council-check">✓</span>}
            </button>
            <AnimatePresence>
              {expandedStages[3] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CouncilStage3 finalResponse={stage3} isLoading={loading?.stage3} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(CouncilResponse)
