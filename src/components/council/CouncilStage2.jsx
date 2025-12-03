import { memo, useState, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MarkdownRenderer = lazy(() => import('../MarkdownRenderer'))

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text
  let result = text
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/').pop() || model
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`)
  })
  return result
}

function CouncilStage2({ rankings, labelToModel, aggregateRankings, isLoading }) {
  const [activeTab, setActiveTab] = useState(0)

  if (isLoading) {
    return (
      <div className="council-stage council-stage2">
        <div className="council-stage-header">
          <span className="council-stage-icon">2</span>
          <span className="council-stage-title">Stage 2: Peer Rankings</span>
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

  if (!rankings || rankings.length === 0) return null

  const getModelShortName = (model) => {
    const parts = model.split('/')
    return parts[parts.length - 1] || model
  }

  return (
    <div className="council-stage council-stage2">
      <div className="council-stage-header">
        <span className="council-stage-icon">2</span>
        <span className="council-stage-title">Stage 2: Peer Rankings</span>
      </div>

      <p className="council-stage-desc">
        Each model evaluated all responses (anonymized) and provided rankings.
      </p>

      <div className="council-tabs">
        {rankings.map((rank, index) => (
          <button
            key={index}
            className={`council-tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {getModelShortName(rank.model)}
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
          <div className="council-model-label">{rankings[activeTab].model}</div>
          <div className="council-response-text">
            <Suspense fallback={<div>{rankings[activeTab].ranking}</div>}>
              <MarkdownRenderer 
                content={deAnonymizeText(rankings[activeTab].ranking, labelToModel)} 
              />
            </Suspense>
          </div>

          {rankings[activeTab].parsed_ranking?.length > 0 && (
            <div className="council-parsed-ranking">
              <strong>Extracted Ranking:</strong>
              <ol>
                {rankings[activeTab].parsed_ranking.map((label, i) => (
                  <li key={i}>
                    {labelToModel?.[label] 
                      ? getModelShortName(labelToModel[label])
                      : label}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {aggregateRankings?.length > 0 && (
        <div className="council-aggregate">
          <h4>🏆 Aggregate Rankings</h4>
          <p className="council-stage-desc">
            Combined results across all peer evaluations (lower is better):
          </p>
          <div className="council-aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="council-aggregate-item">
                <span className="council-rank-position">#{index + 1}</span>
                <span className="council-rank-model">
                  {getModelShortName(agg.model)}
                </span>
                <span className="council-rank-score">
                  Avg: {agg.average_rank.toFixed(2)}
                </span>
                <span className="council-rank-votes">
                  ({agg.rankings_count} votes)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(CouncilStage2)
