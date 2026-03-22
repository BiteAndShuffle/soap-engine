'use client'

import { useRef, useState, useCallback, useId } from 'react'
import type { SuggestionItem } from '../../lib/search'
import s from '../styles/layout.module.css'

export type RouteFilter = 'all' | 'internal' | 'topical'

interface TopbarProps {
  title: string
  badge?: string
  /** 現在選択中の薬剤名（activeModuleData の primaryDisplayName）*/
  activeDrugLabel?: string
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
  activeDrugLabel,
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

  // suggestionsRef: Enter 押下時に render サイクルに依存せず
  // 最新の suggestions を参照するための ref。
  // props の suggestions が更新されるたびに同期する。
  const suggestionsRef = useRef<SuggestionItem[]>(suggestions)
  suggestionsRef.current = suggestions

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
    if (!showDropdown && e.key !== 'Enter') return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter': {
        e.preventDefault()
        // ref 経由で Enter 時点の最新 suggestions を取得（stale closure 対策）
        const currentSuggestions = suggestionsRef.current
        // [DEBUG] props版とref版の両方をログ出力して差異を確認
        console.log('[Topbar Enter]', {
          showDropdown,
          isOpen,
          suggestionsCount_props: suggestions.length,
          suggestionsCount_ref: currentSuggestions.length,
          suggestions0_props: suggestions[0]?.templateId,
          suggestions0_ref: currentSuggestions[0]?.templateId,
          focusedIdx,
          mismatch: suggestions[0]?.templateId !== currentSuggestions[0]?.templateId,
        })
        if (suggestions.length === 0 && currentSuggestions.length === 0) {
          console.warn('[Topbar Enter] ⚠️ suggestions が空 → commitSuggestion スキップ')
          break
        }
        // ref版を優先して使用
        const target = focusedIdx >= 0 ? currentSuggestions[focusedIdx] : currentSuggestions[0]
        if (target) {
          commitSuggestion(target)
        } else {
          console.warn('[Topbar Enter] ⚠️ target が undefined → commitSuggestion スキップ')
        }
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
      {/* ── 辞書ボタン枠（タイトルの左）── */}
      <button className={s.dictBtn} disabled aria-label="辞書（準備中）" title="辞書（準備中）">
        📘
      </button>

      <span className={s.topbarTitle}>
        {title}
        {badge && <span className={s.topbarBadge}>{badge}</span>}
      </span>

      {/* ── 選択中薬剤名ラベル（タイトル右・中央寄り） ── */}
      {activeDrugLabel && (
        <span className={s.topbarDrugLabel}>{activeDrugLabel}</span>
      )}

      {/* ── 右エリア: フィルタトグル + 検索窓 を横並び ── */}
      <div className={s.searchArea}>
        {/* 内服 / 外用 / すべて トグル（検索窓の直左） */}
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

        {/* ── サジェスト検索（一番右） ── */}
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
                  <span className={s.suggestionMain}>{item.shortLabel ?? item.label}</span>
                  <span className={s.suggestionSubGroup}>
                    {item.drugDisplayLabel && (
                      <span className={s.suggestionDrug}>{item.drugDisplayLabel}</span>
                    )}
                    {item.groupLabel && (
                      <span className={s.suggestionSub}>{item.groupLabel}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  )
}
