'use client'

import { useRef, useState, useCallback, useId } from 'react'
import type { MenuGroup } from '../../lib/menuGroups'
import type { DrugSuggestionItem } from '../../lib/search'
import type { SRelation, SCondition } from './SoapEditor'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// Feature flags（開発用 UI の表示制御）
//   true  → 表示する（開発時）
//   false → 非表示（デフォルト）
// ─────────────────────────────────────────────────────────────

/** S先頭文ボタン群（体調状態ボタン）の表示制御 */
const FEATURE_S_BUTTONS = true

// ─────────────────────────────────────────────────────────────
// 仕様定数
// ─────────────────────────────────────────────────────────────

export const S_BUTTON_GROUPS = new Set<MenuGroup>([
  '副作用なし',
  'コンプライアンス良好',
])

// ─────────────────────────────────────────────────────────────
// 診療領域定義
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
// S状態ボタン定義
// ─────────────────────────────────────────────────────────────

interface SectionDef { label: string; relation: SRelation }
interface StatusDef  { label: string; condition: SCondition }

const SECTIONS: SectionDef[] = [
  { label: '前回、新薬追加', relation: 'new_addition'   },
  { label: '前回、薬変更',   relation: 'med_changed'    },
  { label: '前回、増量',     relation: 'dose_increased' },
  { label: '前回、減量',     relation: 'dose_decreased' },
  { label: '前回、Do',       relation: 'continued_do'   },
]

const STATUSES: StatusDef[] = [
  { label: '体調落ち着いている', condition: 'stable'      },
  { label: '体調改善',           condition: 'improved'    },
  { label: '体調変わりない',     condition: 'unchanged'   },
  { label: '体調良くなってない', condition: 'not_improved'},
]

// ─────────────────────────────────────────────────────────────
// 診療領域アコーディオン
// ─────────────────────────────────────────────────────────────

function MedicalAreaAccordion({ onSubcategorySelect }: { onSubcategorySelect: (label: string) => void }) {
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
                  <button key={sub} className={s.medSubcatBtn} onClick={() => onSubcategorySelect(sub)}>
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
// 薬剤追加インライン検索（DrugSuggestionItem専用）
// ─────────────────────────────────────────────────────────────

interface DrugInlineSearchProps {
  searchValue: string
  onSearchChange: (v: string) => void
  suggestions: DrugSuggestionItem[]
  onSelectDrug: (item: DrugSuggestionItem) => void
}

function DrugInlineSearch({
  searchValue,
  onSearchChange,
  suggestions,
  onSelectDrug,
}: DrugInlineSearchProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)

  const showDropdown = isOpen && suggestions.length > 0

  const commit = useCallback((item: DrugSuggestionItem) => {
    onSelectDrug(item)
    onSearchChange('')
    setIsOpen(false)
    setFocusedIdx(-1)
    inputRef.current?.blur()
  }, [onSelectDrug, onSearchChange])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length === 0) return
      const target = focusedIdx >= 0 ? suggestions[focusedIdx] : suggestions[0]
      if (target) commit(target)
      return
    }
    if (!showDropdown) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)) }
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
        placeholder="薬剤を検索…"
        value={searchValue}
        onChange={e => { onSearchChange(e.target.value); setIsOpen(true); setFocusedIdx(-1) }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        aria-label="薬剤追加検索"
        autoComplete="off"
      />
      {showDropdown && (
        <ul id={listId} role="listbox" className={s.thirdSuggestionList} aria-label="薬剤候補">
          {suggestions.map((item, idx) => (
            <li
              key={item.moduleId}
              id={`${listId}-item-${idx}`}
              role="option"
              aria-selected={idx === focusedIdx}
              className={[s.thirdSuggestionItem, idx === focusedIdx ? s.thirdSuggestionItemFocused : ''].join(' ')}
              onMouseDown={() => commit(item)}
            >
              {/* 薬剤名のみ表示 */}
              <span className={s.suggestionMain}>{item.drugDisplayLabel}</span>
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

/** 単剤フラグ */
export interface SingleDrugFlags {
  noSideEffect: boolean
  goodCompliance: boolean
}

interface ThirdPanelProps {
  selectedGroup: MenuGroup | null
  thirdPanelEnabled: boolean
  /** 単剤モードかどうか（false の場合フラグ・S先頭文ボタンを非表示） */
  isSingleDrug: boolean
  currentSRelation: SRelation
  currentSCondition: SCondition
  onSAction: (relation: SRelation, condition: SCondition) => void
  /** 単剤フラグ（副作用なし / コンプライアンス良好） */
  singleDrugFlags: SingleDrugFlags
  onFlagChange: (flags: SingleDrugFlags) => void
  /** 合成薬剤追加検索クエリ */
  composeSearchValue?: string
  onComposeSearchChange?: (v: string) => void
  /** 薬剤専用サジェスト候補 */
  composeDrugSuggestions?: DrugSuggestionItem[]
  /** 薬剤選択ハンドラ */
  onSelectComposeDrug?: (item: DrugSuggestionItem) => void
  onSubcategorySelect?: (label: string) => void
}

// ─────────────────────────────────────────────────────────────
// ThirdPanel 本体
// ─────────────────────────────────────────────────────────────

export default function ThirdPanel({
  selectedGroup,
  thirdPanelEnabled,
  isSingleDrug,
  currentSRelation,
  currentSCondition,
  onSAction,
  singleDrugFlags,
  onFlagChange,
  composeSearchValue = '',
  onComposeSearchChange,
  composeDrugSuggestions = [],
  onSelectComposeDrug,
  onSubcategorySelect,
}: ThirdPanelProps) {
  // 単剤 + 対象グループの基底条件
  const inSGroup     = thirdPanelEnabled && isSingleDrug && selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)
  // S先頭文ボタン群: FEATURE_S_BUTTONS で制御
  const showSButtons = FEATURE_S_BUTTONS && inSGroup

  const handleSubcategorySelect = useCallback((label: string) => {
    if (onSubcategorySelect) {
      onSubcategorySelect(label)
    } else {
      onComposeSearchChange?.(label)
    }
  }, [onSubcategorySelect, onComposeSearchChange])

  // 合成窓: 1剤目シナリオ確定後（thirdPanelEnabled）のみ表示
  // 初期状態・薬剤未選択・シナリオ未選択では非表示
  // 診療領域・Sボタンも同様にシナリオ確定後のみ
  return (
    <div className={[s.thirdPanel, thirdPanelEnabled ? s.expandedPanel : s.collapsedPanel].join(' ')}>
      <div className={s.thirdPanelInner}>
        <div className={s.thirdPanelScrollArea}>
          {/* 合成窓: thirdPanelEnabled（シナリオ確定後）のみ表示 */}
          {thirdPanelEnabled && onComposeSearchChange && onSelectComposeDrug && (
            <div className={s.thirdSection}>
              <div className={s.sActionHeading}>薬剤追加</div>
              <DrugInlineSearch
                searchValue={composeSearchValue}
                onSearchChange={onComposeSearchChange}
                suggestions={composeDrugSuggestions}
                onSelectDrug={onSelectComposeDrug}
              />
            </div>
          )}

          {/* 診療領域: シナリオ確定後のみ */}
          {thirdPanelEnabled && (
            <div className={s.thirdSection}>
              <div className={s.sActionHeading}>診療領域</div>
              <MedicalAreaAccordion onSubcategorySelect={handleSubcategorySelect} />
            </div>
          )}
        </div>

        {/* S先頭文ボタン: 単剤 + 対象グループのみ */}
        {showSButtons && (
          <div className={s.thirdPanelStickyBottom}>
            <div className={s.sActionHeading}>S 先頭文</div>
            {SECTIONS.map(sec => (
              <div key={sec.relation} className={s.sActionSection}>
                <div className={s.sActionSectionLabel}>{sec.label}</div>
                <div className={s.sActionBtnGrid}>
                  {STATUSES.map(st => {
                    const isActive = currentSRelation === sec.relation && currentSCondition === st.condition
                    return (
                      <button
                        key={st.condition}
                        className={[s.sActionBtn, isActive ? s.sActionBtnActive : ''].join(' ')}
                        onClick={() => onSAction(sec.relation, st.condition)}
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
