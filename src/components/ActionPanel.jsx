import { useState } from 'react'
import { ACTION_TREE } from '../engine/actionTree.js'
import { getTemplate } from '../engine/templates.js'
import './ActionPanel.css'

export default function ActionPanel({ searchQuery, appendMode, onTemplateSelect }) {
  const [activePrimary, setActivePrimary] = useState(null)

  const filteredTree = searchQuery
    ? ACTION_TREE.filter((action) => {
        const q = searchQuery.toLowerCase()
        return (
          action.label.toLowerCase().includes(q) ||
          action.secondaryOptions.some((opt) => opt.label.toLowerCase().includes(q))
        )
      })
    : ACTION_TREE

  function handlePrimaryClick(action) {
    if (activePrimary?.id === action.id) {
      setActivePrimary(null)
    } else {
      setActivePrimary(action)
    }
  }

  function handleSecondaryClick(option) {
    const [primary, secondary] = option.templateKey
    const template = getTemplate(primary, secondary)
    if (template) {
      onTemplateSelect(template, appendMode)
    }
  }

  return (
    <aside className="action-panel">
      <div className="action-panel-inner">
        {filteredTree.map((action) => {
          const isActive = activePrimary?.id === action.id
          return (
            <div key={action.id} className="action-group">
              <button
                className={`btn-primary ${isActive ? 'active' : ''}`}
                onClick={() => handlePrimaryClick(action)}
                aria-expanded={isActive}
              >
                <span className="btn-label">{action.label}</span>
                <span className={`btn-chevron ${isActive ? 'open' : ''}`}>›</span>
              </button>

              {isActive && (
                <div className="secondary-list" role="list">
                  {action.secondaryOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className="btn-secondary"
                      role="listitem"
                      onClick={() => handleSecondaryClick(opt)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {filteredTree.length === 0 && (
          <p className="no-results">「{searchQuery}」に一致する項目がありません</p>
        )}
      </div>
    </aside>
  )
}
