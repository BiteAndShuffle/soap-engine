'use client'

import { useRef, useState, useCallback, useId } from 'react'
import type { SuggestionItem } from '../../lib/search'
import s from '../styles/layout.module.css'

interface TopbarProps {
  title: string
  badge?: string
  searchValue: string
  onSearchChange: (value: string) => void
  suggestions: SuggestionItem[]
  onSelectSuggestion: (templateId: string) => void
}

export default function Topbar({
  title,
  badge,
  searchValue,
  onSearchChange,
  suggestions,
  onSelectSuggestion,
}: TopbarProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)

  const showDropdown = isOpen && suggestions.length > 0

  // 候補を選択して入力欄をクリア
  const commitSuggestion = useCallback(
    (item: SuggestionItem) => {
      onSelectSuggestion(item.templateId)
      onSearchChange('')
      setIsOpen(false)
      setFocusedIdx(-1)
      inputRef.current?.blur()
    },
    [onSelectSuggestion, onSearchChange],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIdx >= 0 && suggestions[focusedIdx]) {
          commitSuggestion(suggestions[focusedIdx])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setFocusedIdx(-1)
        break
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSearchChange(e.target.value)
    setIsOpen(true)
    setFocusedIdx(-1)
  }

  return (
    <header className={s.topbar}>
      <span className={s.topbarTitle}>
        {title}
        {badge && <span className={s.topbarBadge}>{badge}</span>}
      </span>

      {/* ── サジェスト検索コンテナ ── */}
      <div className={s.searchWrap}>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={
            focusedIdx >= 0 ? `${listId}-item-${focusedIdx}` : undefined
          }
          className={s.searchInput}
          placeholder="テンプレ検索（1文字から）…"
          value={searchValue}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // クリック処理が先に発火するよう少し遅延
            setTimeout(() => setIsOpen(false), 150)
          }}
          onKeyDown={handleKeyDown}
          aria-label="テンプレート検索"
          autoComplete="off"
        />

        {/* ── 候補ドロップダウン ── */}
        {showDropdown && (
          <ul
            id={listId}
            role="listbox"
            className={s.suggestionList}
            aria-label="検索候補"
          >
            {suggestions.map((item, idx) => (
              <li
                key={item.templateId}
                id={`${listId}-item-${idx}`}
                role="option"
                aria-selected={idx === focusedIdx}
                className={[
                  s.suggestionItem,
                  idx === focusedIdx ? s.suggestionItemFocused : '',
                ].join(' ')}
                onMouseDown={() => commitSuggestion(item)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}
