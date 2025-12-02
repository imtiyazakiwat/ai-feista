import { memo } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'

function ModelTabs() {
  const { models, activeModels, toggleModel } = useStore()

  return (
    <header className="model-tabs-header">
      <div className="model-tabs">
        {Object.entries(models).map(([key, model]) => (
          <motion.div
            key={key}
            className={`model-tab ${activeModels.includes(key) ? 'active' : ''}`}
            whileHover={{ backgroundColor: 'var(--bg-tab-active)' }}
          >
            <img
              src={model.icon}
              alt={model.name}
              className={`model-tab-icon ${model.darkLogo ? 'dark-logo' : ''}`}
              onError={(e) => e.target.style.display = 'none'}
            />
            <span className="model-tab-name">{model.name}</span>
            <motion.div
              className={`toggle-switch ${activeModels.includes(key) ? 'active' : ''}`}
              onClick={() => toggleModel(key)}
              whileTap={{ scale: 0.95 }}
            />
          </motion.div>
        ))}
      </div>
    </header>
  )
}

export default memo(ModelTabs)
