import './SearchBar.css'

export default function SearchBar({ query, onQueryChange, appendMode, onAppendToggle }) {
  return (
    <div className="search-bar">
      <label className="append-toggle" title="オンにすると既存のSOAPに追記します">
        <input
          type="checkbox"
          checked={appendMode}
          onChange={(e) => onAppendToggle(e.target.checked)}
        />
        <span className={`toggle-track ${appendMode ? 'on' : ''}`}>
          <span className="toggle-thumb" />
        </span>
        <span className="toggle-label">追記モード</span>
      </label>

      <div className="search-input-wrap">
        <svg className="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          className="search-input"
          type="search"
          placeholder="薬剤 / 疾患 / キーワードで検索"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button className="search-clear" onClick={() => onQueryChange('')} aria-label="クリア">
            ×
          </button>
        )}
      </div>
    </div>
  )
}
