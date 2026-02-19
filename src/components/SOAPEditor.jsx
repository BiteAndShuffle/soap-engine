import { useState, useCallback } from 'react'
import './SOAPEditor.css'

const SECTIONS = ['S', 'O', 'A', 'P']

const SECTION_LABELS = {
  S: '主観的情報 (Subjective)',
  O: '客観的情報 (Objective)',
  A: '評価 (Assessment)',
  P: '計画 (Plan)',
}

const EMPTY_SOAP = { S: '', O: '', A: '', P: '' }

export default function SOAPEditor({ soap, onChange }) {
  const [copied, setCopied] = useState(false)

  const handleChange = useCallback(
    (section, value) => {
      onChange({ ...soap, [section]: value })
    },
    [soap, onChange],
  )

  async function handleCopy() {
    const text = SECTIONS.map((s) => `【${s}】\n${soap[s] || '（未入力）'}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleClear() {
    onChange(EMPTY_SOAP)
  }

  const hasContent = SECTIONS.some((s) => soap[s]?.trim())

  return (
    <section className="soap-editor">
      <div className="soap-editor-header">
        <h2 className="soap-editor-title">SOAP ノート</h2>
        <div className="soap-editor-actions">
          {hasContent && (
            <button className="btn-clear" onClick={handleClear} title="SOAPをクリア">
              クリア
            </button>
          )}
          <button
            className={`btn-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="SOAPをコピー"
          >
            {copied ? '✓ コピー済み' : 'SOAPをコピー'}
          </button>
        </div>
      </div>

      <div className="soap-sections">
        {SECTIONS.map((section) => (
          <div key={section} className="soap-section">
            <label className="soap-section-label" htmlFor={`soap-${section}`}>
              <span className="soap-section-badge">{section}</span>
              <span className="soap-section-name">{SECTION_LABELS[section]}</span>
            </label>
            <textarea
              id={`soap-${section}`}
              className="soap-textarea"
              value={soap[section]}
              onChange={(e) => handleChange(section, e.target.value)}
              placeholder={`${SECTION_LABELS[section]}を入力...`}
              rows={5}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
