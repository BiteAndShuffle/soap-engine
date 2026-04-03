'use client'

import { useRef, useState, useCallback, useId } from 'react'
import type { DrugSuggestionItem } from '../../lib/search'
import s from '../styles/layout.module.css'

export type RouteFilter = 'all' | 'internal' | 'topical'

interface TopbarProps {
  title: string
  badge?: string
  activeDrugLabel?: string
  searchValue: string
  onSearchChange: (value: string) => void
  /** 薬剤専用サジェスト候補（シナリオなし） */
  drugSuggestions: DrugSuggestionItem[]
  /** 薬剤選択ハンドラ */
  onSelectDrugSuggestion: (item: DrugSuggestionItem) => void
  routeFilter: RouteFilter
  onRouteFilterChange: (f: RouteFilter) => void
  /** ペルソナトグル */
  personaEnabled: boolean
  onPersonaToggle: () => void
  /** ペルソナ設定モーダルを開く */
  onPersonaSettingsOpen: () => void
}

const ROUTE_LABELS: Record<RouteFilter, string> = {
  all:      'すべて',
  internal: '内服',
  topical:  '外用',
}

export default function Topbar({
  title,
  badge,
  activeDrugLabel,
  searchValue,
  onSearchChange,
  drugSuggestions,
  onSelectDrugSuggestion,
  routeFilter,
  onRouteFilterChange,
  personaEnabled,
  onPersonaToggle,
  onPersonaSettingsOpen,
}: TopbarProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)

  const suggestionsRef = useRef<DrugSuggestionItem[]>(drugSuggestions)
  suggestionsRef.current = drugSuggestions

  const showDropdown = isOpen && drugSuggestions.length > 0

  const commitSuggestion = useCallback(
    (item: DrugSuggestionItem) => {
      onSelectDrugSuggestion(item)
      onSearchChange('')
      setIsOpen(false)
      setFocusedIdx(-1)
      inputRef.current?.blur()
    },
    [onSelectDrugSuggestion, onSearchChange],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown && e.key !== 'Enter') return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIdx(i => Math.min(i + 1, drugSuggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter': {
        e.preventDefault()
        const current = suggestionsRef.current
        if (current.length === 0) break
        const target = focusedIdx >= 0 ? current[focusedIdx] : current[0]
        if (target) commitSuggestion(target)
        break
      }
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
      <button className={s.dictBtn} disabled aria-label="辞書（準備中）" title="辞書（準備中）">
        📘
      </button>

      <span className={s.topbarTitle}>
        {title}
        {badge && <span className={s.topbarBadge}>{badge}</span>}
      </span>

      {activeDrugLabel && (
        <span className={s.topbarDrugLabel}>{activeDrugLabel}</span>
      )}

      {/* ① ペルソナトグル（Topbar中央）: アイコンのみ表示 */}
      <button
        className={[s.personaToggleBtn, personaEnabled ? s.personaToggleBtnActive : ''].join(' ')}
        onClick={onPersonaToggle}
        aria-pressed={personaEnabled}
        aria-label="ペルソナ"
        title="ペルソナ（文体切替）"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/persona-icon.webp" alt="ペルソナ" className={s.personaIcon} />
      </button>

      <div className={s.searchArea}>
        {/* ② 設定ボタン（searchArea左端） */}
        <button
          className={s.personaSettingsBtn}
          onClick={onPersonaSettingsOpen}
          aria-label="ペルソナ設定"
          title="ペルソナ設定"
        >
          ⚙️
        </button>
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
            placeholder="薬剤を検索…"
            value={searchValue}
            onChange={handleChange}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            onKeyDown={handleKeyDown}
            aria-label="薬剤検索"
            autoComplete="off"
          />

          {showDropdown && (
            <ul
              id={listId}
              role="listbox"
              className={s.suggestionList}
              aria-label="薬剤候補"
            >
              {drugSuggestions.map((item, idx) => (
                <li
                  key={item.moduleId}
                  id={`${listId}-item-${idx}`}
                  role="option"
                  aria-selected={idx === focusedIdx}
                  className={[
                    s.suggestionItem,
                    idx === focusedIdx ? s.suggestionItemFocused : '',
                  ].join(' ')}
                  onMouseDown={() => commitSuggestion(item)}
                >
                  {/* 薬剤名のみ表示（シナリオ名なし） */}
                  <span className={s.suggestionMain}>{item.drugDisplayLabel}</span>
                  {item.matchedBrandName && item.matchedBrandName !== item.drugDisplayLabel && (
                    <span className={s.suggestionSubGroup}>
                      <span className={s.suggestionDrug}>{item.matchedBrandName}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  )
}
