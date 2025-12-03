import { memo, Suspense, lazy } from 'react'

const MarkdownRenderer = lazy(() => import('../MarkdownRenderer'))

function CouncilStage3({ finalResponse, isLoading }) {
  if (isLoading) {
    return (
      <div className="council-stage council-stage3">
        <div className="council-stage-header">
          <span className="council-stage-icon">3</span>
          <span className="council-stage-title">Stage 3: Final Synthesis</span>
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

  if (!finalResponse) return null

  const getModelShortName = (model) => {
    const parts = model.split('/')
    return parts[parts.length - 1] || model
  }

  return (
    <div className="council-stage council-stage3">
      <div className="council-stage-header">
        <span className="council-stage-icon">3</span>
        <span className="council-stage-title">Stage 3: Council's Final Answer</span>
      </div>

      <div className="council-final-response">
        <div className="council-chairman-label">
          👑 Chairman: {getModelShortName(finalResponse.model)}
        </div>
        <div className="council-final-text">
          <Suspense fallback={<div>{finalResponse.response}</div>}>
            <MarkdownRenderer content={finalResponse.response} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default memo(CouncilStage3)
