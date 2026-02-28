'use client'

import { useRef, useState, useCallback, useId } from 'react'
import type { MenuGroup } from '../../lib/menuGroups'
import type { SuggestionItem } from '../../lib/search'
import type { SPrefix, SStatus } from './SoapEditor'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 仕様定数
// ─────────────────────────────────────────────────────────────

/**
 * S操作ボタンを表示するグループ。
 * 【仕様】副作用なし と コンプライアンス良好 のみ。コンプライアンス不良は含まない。
 */
export const S_BUTTON_GROUPS = new Set<MenuGroup>([
  '副作用なし',
  'コンプライアンス良好',
])

// ─────────────────────────────────────────────────────────────
// 診療領域定義（サブカテゴリ → 検索窓に投入）
// ─────────────────────────────────────────────────────────────

interface MedicalArea {
  label: string
  subcategories: string[]
}

const MEDICAL_AREAS: MedicalArea[] = [
  {
    label: '感染症',
    subcategories: ['抗生剤', '抗ウイルス', '去痰', '鎮咳', '解熱鎮痛', 'トローチ', '喉の痛み', '整腸', '制吐'],
  },
  {
    label: '整形',
    subcategories: ['痛み止め', '神経痛', '湿布', 'ビタミン', '痺れ', '筋弛緩'],
  },
  {
    label: '眼科',
    subcategories: ['抗菌', 'ドライアイ', '抗炎症', '抗アレルギー', '白内障', '緑内障'],
  },
  {
    label: '皮膚科',
    subcategories: ['ヘパリン', '白色ワセリン', 'ステロイド', 'モイゼルト', 'ニキビ'],
  },
]

// ─────────────────────────────────────────────────────────────
// S状態ボタン定義（3セクション × 4ボタン）
// ─────────────────────────────────────────────────────────────

interface SectionDef { label: string; prefix: SPrefix }
interface StatusDef  { label: string; status: SStatus }

const SECTIONS: SectionDef[] = [
  { label: '前回、新薬追加', prefix: 'new_drug'      },
  { label: '前回、薬変更',   prefix: 'changed_drug'  },
  { label: '前回、Do',       prefix: 'none'           },
]

const STATUSES: StatusDef[] = [
  { label: '体調落ち着いている', status: 'stable'    },
  { label: '体調改善',           status: 'better'    },
  { label: '体調変わりない',     status: 'unchanged' },
  { label: '体調良くなってない', status: 'not_better'},
]

// ─────────────────────────────────────────────────────────────
// 診療領域アコーディオン（全カテゴリ常設）
// ─────────────────────────────────────────────────────────────

interface MedicalAreaAccordionProps {
  onSubcategorySelect: (label: string) => void
}

function MedicalAreaAccordion({ onSubcategorySelect }: MedicalAreaAccordionProps) {
  const [openArea, setOpenArea] = useState<string | null>(null)

  return (
    <div className={s.medAreaWrap}>
      {MEDICAL_AREAS.map(area => {
        const isOpen = openArea === area.label
        return (
          <div key={area.label} className={s.medAreaGroup}>
            <button
              className={[s.medAreaBtn, isOpen ? s.medAreaBtnOpen : ''].join(' ')}
              onClick={() => setOpenArea(prev => prev === area.label ? null : area.label)}
              aria-expanded={isOpen}
            >
              <span className={s.medAreaLabel}>{area.label}</span>
              <span className={[s.medAreaChevron, isOpen ? s.medAreaChevronOpen : ''].join(' ')}>›</span>
            </button>
            {isOpen && (
              <div className={s.medSubcatWrap}>
                {area.subcategories.map(sub => (
                  <button
                    key={sub}
                    className={s.medSubcatBtn}
                    onClick={() => onSubcategorySelect(sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// インライン検索ドロップダウン（全カテゴリ常設）
// ─────────────────────────────────────────────────────────────

interface InlineSearchProps {
  searchValue: string
  onSearchChange: (v: string) => void
  suggestions: SuggestionItem[]
  onSelectSuggestion: (templateId: string) => void
}

function InlineSearch({
  searchValue,
  onSearchChange,
  suggestions,
  onSelectSuggestion,
}: InlineSearchProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)

  const showDropdown = isOpen && suggestions.length > 0

  const commit = useCallback((item: SuggestionItem) => {
    onSelectSuggestion(item.templateId)
    onSearchChange('')
    setIsOpen(false)
    setFocusedIdx(-1)
    inputRef.current?.blur()
  }, [onSelectSuggestion, onSearchChange])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (focusedIdx >= 0 && suggestions[focusedIdx]) commit(suggestions[focusedIdx]) }
    else if (e.key === 'Escape') { setIsOpen(false); setFocusedIdx(-1) }
  }

  return (
    <div className={s.thirdSearchWrap}>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={focusedIdx >= 0 ? `${listId}-item-${focusedIdx}` : undefined}
        className={s.thirdSearchInput}
        placeholder="薬剤・テンプレを検索…"
        value={searchValue}
        onChange={e => { onSearchChange(e.target.value); setIsOpen(true); setFocusedIdx(-1) }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        aria-label="薬剤追加・テンプレート検索"
        autoComplete="off"
      />
      {showDropdown && (
        <ul id={listId} role="listbox" className={s.thirdSuggestionList} aria-label="検索候補">
          {suggestions.map((item, idx) => (
            <li
              key={item.templateId}
              id={`${listId}-item-${idx}`}
              role="option"
              aria-selected={idx === focusedIdx}
              className={[s.thirdSuggestionItem, idx === focusedIdx ? s.thirdSuggestionItemFocused : ''].join(' ')}
              onMouseDown={() => commit(item)}
            >
              <span className={s.suggestionMain}>{item.shortLabel ?? item.label}</span>
              {item.groupLabel && <span className={s.suggestionSub}>{item.groupLabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface ThirdPanelProps {
  /** 現在選択中の大分類（null = 未選択） */
  selectedGroup: MenuGroup | null
  /** S欄トグル: 現在の接頭句 */
  currentSPrefix: SPrefix
  /** S欄トグル: 現在の状態 */
  currentSStatus: SStatus
  /** Sボタン押下時コールバック */
  onSAction: (prefix: SPrefix, status: SStatus) => void
  /** 検索クエリ（常設検索窓用） */
  searchValue?: string
  /** 検索クエリ変更ハンドラ */
  onSearchChange?: (v: string) => void
  /** サジェスト候補 */
  suggestions?: SuggestionItem[]
  /** サジェスト選択ハンドラ */
  onSelectSuggestion?: (templateId: string) => void
  /** 診療領域サブカテゴリ選択ハンドラ */
  onSubcategorySelect?: (label: string) => void
}

// ─────────────────────────────────────────────────────────────
// ThirdPanel 本体
//
// レイアウト構造（上→下）:
//   [常設上部スクロール領域]
//     - 薬剤追加検索窓
//     - 診療領域ボタン（アコーディオン）
//   [Sボタン: 副作用なし/CP良好のみ・最下部固定]
// ─────────────────────────────────────────────────────────────

export default function ThirdPanel({
  selectedGroup,
  currentSPrefix,
  currentSStatus,
  onSAction,
  searchValue = '',
  onSearchChange,
  suggestions = [],
  onSelectSuggestion,
  onSubcategorySelect,
}: ThirdPanelProps) {
  // 【仕様】S操作: 副作用なし・CP良好のみ。CP不良は含まない。
  const showSButtons = selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)

  // 診療領域サブカテゴリ押下 → 検索窓に語を投入
  const handleSubcategorySelect = useCallback((label: string) => {
    if (onSubcategorySelect) {
      onSubcategorySelect(label)
    } else {
      onSearchChange?.(label)
    }
  }, [onSubcategorySelect, onSearchChange])

  return (
    <div className={s.thirdPanel}>
      <div className={s.thirdPanelInner}>

        {/* ══ 上部エリア（スクロール可・常設） ══ */}
        <div className={s.thirdPanelScrollArea}>

          {/* 薬剤追加検索窓（全カテゴリ常設） */}
          {onSearchChange && onSelectSuggestion && (
            <div className={s.thirdSection}>
              <div className={s.sActionHeading}>薬剤追加</div>
              <InlineSearch
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                suggestions={suggestions}
                onSelectSuggestion={onSelectSuggestion}
              />
            </div>
          )}

          {/* 診療領域ボタン（全カテゴリ常設） */}
          <div className={s.thirdSection}>
            <div className={s.sActionHeading}>診療領域</div>
            <MedicalAreaAccordion onSubcategorySelect={handleSubcategorySelect} />
          </div>

        </div>

        {/* ══ 下部固定エリア: S操作ボタン（副作用なし/CP良好のみ） ══ */}
        {showSButtons && (
          <div className={s.thirdPanelStickyBottom}>
            <div className={s.sActionHeading}>S 先頭文</div>
            {SECTIONS.map(sec => (
              <div key={sec.prefix} className={s.sActionSection}>
                <div className={s.sActionSectionLabel}>{sec.label}</div>
                <div className={s.sActionBtnGrid}>
                  {STATUSES.map(st => {
                    const isActive =
                      currentSPrefix === sec.prefix && currentSStatus === st.status
                    return (
                      <button
                        key={st.status}
                        className={[
                          s.sActionBtn,
                          isActive ? s.sActionBtnActive : '',
                        ].join(' ')}
                        onClick={() => onSAction(sec.prefix, st.status)}
                        aria-pressed={isActive}
                      >
                        {st.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
