import { useState, useCallback } from 'react'
import ActionPanel from './components/ActionPanel.jsx'
import SOAPEditor from './components/SOAPEditor.jsx'
import SearchBar from './components/SearchBar.jsx'

const EMPTY_SOAP = { S: '', O: '', A: '', P: '' }

export default function App() {
  const [soap, setSoap] = useState(EMPTY_SOAP)
  const [searchQuery, setSearchQuery] = useState('')
  const [appendMode, setAppendMode] = useState(false)

  const handleTemplateSelect = useCallback(
    (template, append) => {
      if (append) {
        setSoap((prev) => ({
          S: prev.S ? `${prev.S}\n\n${template.S}` : template.S,
          O: prev.O ? `${prev.O}\n\n${template.O}` : template.O,
          A: prev.A ? `${prev.A}\n\n${template.A}` : template.A,
          P: prev.P ? `${prev.P}\n\n${template.P}` : template.P,
        }))
      } else {
        setSoap({
          S: template.S,
          O: template.O,
          A: template.A,
          P: template.P,
        })
      }
    },
    [],
  )

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-brand">
          <span className="app-logo">GLP-1</span>
          <span className="app-title">SOAP Engine</span>
        </div>
        <div className="app-header-right">
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            appendMode={appendMode}
            onAppendToggle={setAppendMode}
          />
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="app-main">
        <ActionPanel
          searchQuery={searchQuery}
          appendMode={appendMode}
          onTemplateSelect={handleTemplateSelect}
        />
        <SOAPEditor soap={soap} onChange={setSoap} />
      </main>
    </div>
  )
}
