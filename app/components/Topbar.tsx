'use client'

import { useRef, useState, useCallback, useId } from 'react'
import type { SuggestionItem } from '../../lib/search'
import s from '../styles/layout.module.css'

export type RouteFilter = 'all' | 'internal' | 'topical'

interface TopbarProps {
  title: string
  badge?: string
  searchValue: string
  onSearchChange: (value: string) => void
  suggestions: SuggestionItem[]
  onSelectSuggestion: (templateId: string) => void
  routeFilter: RouteFilter
  onRouteFilterChange: (f: RouteFilter) => void
}

const ROUTE_LABELS: Record<RouteFilter, string> = {
  all:      'すべて',
  internal: '内服',
  topical:  '外用',
}

export default function Topbar({
  title,
  badge,
  searchValue,
  onSearchChange,
  suggestions,
  onSelectSuggestion,
  routeFilter,
  onRouteFilterChange,
}: TopbarProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)

  const showDropdown = isOpen && suggestions.length > 0

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

      {/* ── 内服 / 外用 / すべて トグル ── */}
      <div className={s.routeToggle} role="group" aria-label="剤形フィルタ">
        {(['all', 'internal', 'topical'] as RouteFilter[]).map(f => (
          <button
            key={f}
            className={[s.routeBtn, routeFilter === f ? s.routeBtnActive : ''].join(' ')}
            onClick={() => onRouteFilterChange(f)}
            aria-pressed={routeFilter === f}
          >
            {ROUTE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* ── サジェスト検索 ── */}
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
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          aria-label="テンプレート検索"
          autoComplete="off"
        />

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
                {/* メイン: 短縮ラベル */}
                <span className={s.suggestionMain}>{item.shortLabel ?? item.label}</span>
                {/* サブ: グループ名（副作用あり 等） */}
                {item.groupLabel && (
                  <span className={s.suggestionSub}>{item.groupLabel}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}
