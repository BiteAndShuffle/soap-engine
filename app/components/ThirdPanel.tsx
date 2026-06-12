'use client'

import { useRef, useState, useCallback, useEffect, useId } from 'react'
import type { MenuGroup } from '../../lib/menuGroups'
import type { DrugSuggestionItem } from '../../lib/search'
import type { Scenario } from '../../lib/types'
import type { SRelation, SCondition } from './SoapEditor'
import { isSReplacementEligible } from '../../lib/isSReplacementEligible'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// Feature flags（開発用 UI の表示制御）
//   true  → 表示する（開発時）
//   false → 非表示（デフォルト）
// ─────────────────────────────────────────────────────────────

/** S先頭文ボタン群（体調状態ボタン）の表示制御 */
const FEATURE_S_BUTTONS = true

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
    subcategories: ['抗生剤', '抗ウイルス', '去痰', '鎮咳', '解熱鎮痛', 'トローチ', '喉の痛み', '整腸', '制吐', '抗アレルギー'],
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
    subcategories: ['ヘパリン', '白色ワセリン', 'ステロイド', 'モイゼルト', 'ニキビ', '抗アレルギー'],
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

/**
 * SRelation → MenuGroup の対応表。
 * menuGroupLabels オーバーライド時に relation 経由でラベルを解決する。
 */
const RELATION_TO_MENU_GROUP_KEY: Partial<Record<SRelation, string>> = {
  dose_increased: '増量',
  dose_decreased: '減量',
}

/** SECTIONS のラベルに menuGroupLabels を適用したものを返す */
function applyMenuGroupLabels(
  sections: SectionDef[],
  overrides?: Record<string, string>,
): SectionDef[] {
  if (!overrides) return sections
  return sections.map(sec => {
    // relation → MenuGroup キー → overrides でラベルを解決する
    // 例: dose_increased → '増量' → overrides['増量'] = '回数増' → '前回、回数増'
    const menuGroupKey = RELATION_TO_MENU_GROUP_KEY[sec.relation as SRelation]
    const overrideLabel = menuGroupKey ? overrides[menuGroupKey] : undefined
    if (!overrideLabel) return sec
    return { ...sec, label: `前回、${overrideLabel}` }
  })
}

const STATUSES: StatusDef[] = [
  { label: '体調落ち着いている', condition: 'stable'      },
  { label: '体調改善',           condition: 'improved'    },
  { label: '体調変わりない',     condition: 'unchanged'   },
  { label: '体調良くなってない', condition: 'not_improved'},
]

// ─────────────────────────────────────────────────────────────
// 診療領域アコーディオン
// ─────────────────────────────────────────────────────────────

interface MedicalAreaAccordionProps {
  /** サブカテゴリボタン押下時コールバック。エリアラベルも同時に渡す */
  onSubcategorySelect: (label: string, areaLabel: string) => void
  /** Express候補を持つサブカテゴリラベルのセット（バッジ表示用） */
  expressSubcats?: Set<string>
  /** 現在ポップアップ表示中のサブカテゴリ（アクティブ状態表示用） */
  activeSubcat?: string | null
}

function MedicalAreaAccordion({
  onSubcategorySelect,
  expressSubcats,
  activeSubcat,
}: MedicalAreaAccordionProps) {
  const [openArea, setOpenArea] = useState<string | null>(null)

  return (
    <div className={s.medAreaWrap}>
      {MEDICAL_AREAS.map(area => {
        const isOpen = openArea === area.label
        return (
          <div key={area.label} className={s.medAreaGroup}>
            <button
              className={[s.medAreaBtn, isOpen ? s.medAreaBtnOpen : ''].join(' ')}
              onClick={() => {
                setOpenArea(prev => prev === area.label ? null : area.label)
              }}
              aria-expanded={isOpen}
            >
              <span className={s.medAreaLabel}>{area.label}</span>
              <span className={[s.medAreaChevron, isOpen ? s.medAreaChevronOpen : ''].join(' ')}>›</span>
            </button>
            {isOpen && (
              <div className={s.medSubcatWrap}>
                {area.subcategories.map(sub => {
                  const hasExpress = expressSubcats?.has(sub) ?? false
                  const isActive = activeSubcat === sub
                  return (
                    <button
                      key={sub}
                      className={[s.medSubcatBtn, isActive ? s.medSubcatBtnActive : ''].join(' ')}
                      onClick={() => onSubcategorySelect(sub, area.label)}
                      aria-pressed={isActive}
                    >
                      {sub}
                      {hasExpress && <span className={s.medSubcatExpressBadge}>›</span>}
                    </button>
                  )
                })}
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

/** エクスプレス候補アイテム */
export interface ExpressCandidate {
  moduleId: string
  /** 旧 expressMode 互換フィールド（category / subCategory） */
  category: string
  subCategory?: string
  /** 3階層分類（expressModes 配列構造）。将来のアコーディオンUI用に保持 */
  expressCategory: string
  expressGroup: string
  expressSubGroup: string
  /**
   * UI表示専用の先発ブランド短縮名（例: "ヒルドイドソフト軟膏 / ソフト軟膏"）。
   * SOAP本文には使用しない。SOAP主語は resolvedSoapDisplayName を使うこと。
   */
  label: string
  /**
   * UI表示専用の GEモード短縮名（例: "油性クリーム", "フェキソフェナジン（内服）"）。
   * SOAP本文には使用しない。SOAP主語は resolvedGenericSoapDisplayName を使うこと。
   * 省略時は label をそのまま使用する。
   */
  genericLabel?: string
  /**
   * SOAP {{drug_subject}} 用の先発モード解決済み表示名。
   * brandCatalog[defaultBrandName].displayName から解決される。
   * 省略時（旧 expressMode 単数構造）は defaultBrandName にフォールバック。
   */
  resolvedSoapDisplayName?: string
  /**
   * SOAP {{drug_subject}} 用の GEモード解決済み表示名。
   * brandCatalog[genericBrandName ?? defaultBrandName].displayGenericName ?? displayName から解決される。
   * 省略時は resolvedSoapDisplayName → defaultBrandName にフォールバック。
   */
  resolvedGenericSoapDisplayName?: string
  defaultScenarioId: string
  /** scenario.globalId（activeExpressKeys のキーと照合するために使用） */
  defaultScenarioGlobalId: string
  /**
   * Express 追加時に使用する既定ブランド名（先発モード時）。
   * drug.brandCatalog のキーと完全一致させること。
   * expressModes 側では必須。expressMode 単数フォールバック時のみ省略可。
   */
  defaultBrandName?: string
  /**
   * GEモード時に使用する brandCatalog 解決キー（省略可）。
   * 設定時は GEモードでの brandName 解決にこちらを使用する。
   * 省略時は GEモードでも defaultBrandName にフォールバック（既存モジュール後方互換）。
   */
  genericBrandName?: string
  sortOrder: number
  /**
   * UI上でグレーアウト表示する未実装 placeholder か。
   * true の場合: ボタンは disabled 表示、クリックしても何も追加されない。
   */
  disabled?: boolean
  /** disabled エントリ用の補足テキスト（ツールチップ等に使用） */
  disabledReason?: string
  /**
   * シナリオ候補リスト（省略可）。
   * 設定時は剤形ボタン押下後にシナリオ一覧を表示する（2段階選択）。
   * 省略時は defaultScenarioId で即時追加する（従来の1段階選択）。
   */
  scenarioCandidates?: Array<{
    scenarioId: string
    globalId: string
    label: string
  }>
}

interface ThirdPanelProps {
  selectedGroup: MenuGroup | null
  thirdPanelEnabled: boolean
  /** 単剤モードかどうか（false の場合フラグ・S先頭文ボタンを非表示） */
  isSingleDrug: boolean
  /**
   * 現在選択中の1剤目シナリオ。
   * thirdPanelSPlacement.enabled の判定に使用する。
   */
  primaryScenario?: Scenario
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
  /** エクスプレス候補リスト（expressMode.enabled===true のモジュール） */
  expressCandidates?: ExpressCandidate[]
  /**
   * 追加済みノードのキーセット（"moduleId__brandName__scenarioGlobalId" 形式）。
   * Express ボタンのアクティブ状態表示に使用する。
   */
  activeExpressKeys?: Set<string>
  /**
   * エクスプレス追加ハンドラ。
   * @param moduleId         対象モジュールID
   * @param defaultScenarioId scenario.id（非 globalId）
   * @param brandName        brandCatalog 解決キー（先発名）。handlingTags / アドオンフィルタリングに使用
   * @param displayName      SOAP {{drug_subject}} / ノード表示名。brandCatalog から解決済みの正式表示名（UI label を流用しない）
   */
  onExpressAdd?: (moduleId: string, defaultScenarioId: string, brandName?: string, displayName?: string) => void
  /**
   * MenuGroup 表示ラベルのオーバーライド（モジュール単位）。
   * display.menuGroupLabels から渡される。
   * S先頭文ボタンの「前回、増量」「前回、減量」ラベルに反映する。
   */
  menuGroupLabelOverrides?: Record<string, string>
  /**
   * 部位入力欄の設定。display.localInput から渡される。
   * enabled === true のモジュールのみ入力欄を表示する。
   */
  localInputConfig?: {
    enabled: boolean
    label: string
    placeholder?: string
    applyScenarioIds?: string[]
    emptyBehavior?: 'keep_original'
    /** 'placeholder' モードのとき方向+部位ボタンを表示する。'prefix' または未定義は従来動作。 */
    insertMode?: 'prefix' | 'placeholder'
    /** 点眼薬モード: 部位ボタンを眼科用（左・右・両のみ）にする */
    siteButtonType?: 'topical' | 'eye'
  }
  /** 部位入力の現在値 */
  localSiteInput?: string
  /** 部位入力変更ハンドラ */
  onLocalSiteInputChange?: (value: string) => void
}

// ─────────────────────────────────────────────────────────────
// ThirdPanel 本体
// ─────────────────────────────────────────────────────────────

export default function ThirdPanel({
  selectedGroup,
  thirdPanelEnabled,
  isSingleDrug,
  primaryScenario,
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
  expressCandidates = [],
  activeExpressKeys,
  onExpressAdd,
  menuGroupLabelOverrides,
  localInputConfig,
  localSiteInput = '',
  onLocalSiteInputChange,
}: ThirdPanelProps) {
  const resolvedSections = applyMenuGroupLabels(SECTIONS, menuGroupLabelOverrides)
  // S先頭文ボタン群: isSReplacementEligible で汎用判定（単剤 primary 時のみ）
  const showSButtons =
    FEATURE_S_BUTTONS &&
    isSReplacementEligible(primaryScenario, { thirdPanelEnabled, isSingleDrug })

  // ── Express候補ポップアップ管理 ──────────────────────────────
  // expressCategory/Group/SubGroup でグルーピングしたマップ（メモ化）
  const expressByCat = useCallback(() => {
    const map: Record<string, {
      groupOrder: string[]
      groupMap: Record<string, { subGroupOrder: string[]; subGroupMap: Record<string, ExpressCandidate[]> }>
    }> = {}
    for (const c of expressCandidates) {
      const cat = c.expressCategory || c.category
      const grp = c.expressGroup || c.subCategory || cat
      const sub = c.expressSubGroup || grp
      if (!map[cat]) map[cat] = { groupOrder: [], groupMap: {} }
      const catEntry = map[cat]
      if (!catEntry.groupMap[grp]) {
        catEntry.groupOrder.push(grp)
        catEntry.groupMap[grp] = { subGroupOrder: [], subGroupMap: {} }
      }
      const grpEntry = catEntry.groupMap[grp]
      if (!grpEntry.subGroupMap[sub]) {
        grpEntry.subGroupOrder.push(sub)
        grpEntry.subGroupMap[sub] = []
      }
      grpEntry.subGroupMap[sub].push(c)
    }
    return map
  }, [expressCandidates])()

  // expressGroup/expressSubGroup → サブカテゴリ名のセット（バッジ表示用）
  const expressSubcats = new Set<string>()
  for (const catEntry of Object.values(expressByCat)) {
    for (const grp of catEntry.groupOrder) {
      expressSubcats.add(grp)
      for (const sub of catEntry.groupMap[grp].subGroupOrder) {
        expressSubcats.add(sub)
      }
    }
  }

  // 現在ポップアップ表示中のサブカテゴリ（null = 非表示）
  const [expressPopupSubcat, setExpressPopupSubcat] = useState<string | null>(null)
  // 現在開いているアコーディオンエリア（Express候補をcategoryで絞り込むために使用）
  const [expressPopupArea, setExpressPopupArea] = useState<string | null>(null)
  const expressPopupRef = useRef<HTMLDivElement>(null)
  // GE / 先発 切替（true = GEモード）
  const [expressUseGE, setExpressUseGE] = useState(true)
  // 2段階選択: 剤形ボタン押下後にシナリオ候補を表示する対象候補（null = 剤形一覧表示中）
  const [expressScenarioPicker, setExpressScenarioPicker] = useState<ExpressCandidate | null>(null)

  // ポップアップ外クリックで閉じる（ピッカーも同時リセット）
  useEffect(() => {
    if (!expressPopupSubcat) return
    function handleMouseDown(e: MouseEvent) {
      if (expressPopupRef.current && !expressPopupRef.current.contains(e.target as Node)) {
        setExpressPopupSubcat(null)
        setExpressScenarioPicker(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [expressPopupSubcat])

  // サブカテゴリボタン押下: area と subcat を同時にセットする（アトミック）
  // Express候補があればポップアップ表示。なければ通常検索送出
  const handleSubcategorySelect = useCallback((label: string, areaLabel: string) => {
    if (expressSubcats.has(label)) {
      // 同じボタン再押しでポップアップを閉じる、別ボタン（または別エリア）で切り替え
      setExpressPopupSubcat(prev => (prev === label && expressPopupArea === areaLabel) ? null : label)
      setExpressPopupArea(areaLabel)
      setExpressScenarioPicker(null)  // 別カテゴリ選択時はピッカーをリセット
    } else {
      setExpressPopupSubcat(null)
      setExpressPopupArea(areaLabel)
      setExpressScenarioPicker(null)
    }
    if (onSubcategorySelect) {
      onSubcategorySelect(label)
    } else {
      onComposeSearchChange?.(label)
    }
  }, [expressSubcats, expressPopupArea, onSubcategorySelect, onComposeSearchChange])

  // ポップアップに表示する候補を計算
  // expressPopupArea が設定されている場合、同一 expressCategory のみを対象とする
  const popupCandidates: Array<{ grp: string; sub: string; candidates: ExpressCandidate[] }> = []
  if (expressPopupSubcat) {
    for (const [cat, catEntry] of Object.entries(expressByCat)) {
      // expressPopupArea が設定されていれば category 絞り込みを行う
      if (expressPopupArea && cat !== expressPopupArea) continue
      for (const grp of catEntry.groupOrder) {
        if (grp === expressPopupSubcat) {
          for (const sub of catEntry.groupMap[grp].subGroupOrder) {
            popupCandidates.push({ grp, sub, candidates: catEntry.groupMap[grp].subGroupMap[sub] })
          }
        } else {
          for (const sub of catEntry.groupMap[grp].subGroupOrder) {
            if (sub === expressPopupSubcat) {
              popupCandidates.push({ grp, sub, candidates: catEntry.groupMap[grp].subGroupMap[sub] })
            }
          }
        }
      }
    }
  }

  // GE/先発モードに応じた brandName / displayName を解決するヘルパー。
  //
  // brandName  (brandCatalog 解決キー — handlingTags / addonFilter に使用):
  //   GEモード  → c.genericBrandName ?? c.defaultBrandName
  //   先発モード → c.defaultBrandName
  //
  // displayName (SOAP {{drug_subject}} 主語 — UI ラベルを流用しない):
  //   GEモード  → c.resolvedGenericSoapDisplayName（brandCatalog.displayGenericName 解決済み）
  //               フォールバック: c.resolvedSoapDisplayName → c.defaultBrandName
  //   先発モード → c.resolvedSoapDisplayName（brandCatalog.displayName 解決済み）
  //               フォールバック: c.defaultBrandName
  //
  // UI表示（label / genericLabel）は SOAP本文には渡さない。
  function resolveExpressBrandAndDisplay(c: ExpressCandidate): { brandName: string | undefined; displayName: string | undefined } {
    if (expressUseGE) {
      return {
        brandName:   c.genericBrandName ?? c.defaultBrandName,
        displayName: c.resolvedGenericSoapDisplayName ?? c.resolvedSoapDisplayName ?? c.defaultBrandName,
      }
    }
    return {
      brandName:   c.defaultBrandName,
      displayName: c.resolvedSoapDisplayName ?? c.defaultBrandName,
    }
  }

  // ブランドボタン押下: ポップアップは閉じない
  // scenarioCandidates がある場合は2段階選択（シナリオピッカーを表示）。
  // ない場合は従来通り defaultScenarioId で即時追加。
  function handleExpressBrandAdd(c: ExpressCandidate) {
    if (c.scenarioCandidates && c.scenarioCandidates.length > 0) {
      // 2段階: 同じ候補を再押しでピッカーをトグル（閉じる）
      setExpressScenarioPicker(prev => (prev?.moduleId === c.moduleId && prev?.defaultBrandName === c.defaultBrandName) ? null : c)
      return
    }
    // 1段階: 即時追加
    const { brandName, displayName } = resolveExpressBrandAndDisplay(c)
    onExpressAdd?.(c.moduleId, c.defaultScenarioId, brandName, displayName)
  }

  // シナリオ候補ボタン押下: 選択したシナリオで追加。ピッカーは開いたまま（複数追加可）
  function handleExpressScenarioAdd(c: ExpressCandidate, sc: { scenarioId: string; globalId: string; label: string }) {
    const { brandName, displayName } = resolveExpressBrandAndDisplay(c)
    onExpressAdd?.(c.moduleId, sc.scenarioId, brandName, displayName)
  }

  // 合成窓: 1剤目シナリオ確定後（thirdPanelEnabled）のみ表示
  // 初期状態・薬剤未選択・シナリオ未選択では非表示
  // 診療領域・Sボタンも同様にシナリオ確定後のみ
  return (
    <div className={[s.thirdPanel, thirdPanelEnabled ? s.expandedPanel : s.collapsedPanel].join(' ')}>
      <div className={s.thirdPanelInner}>
        {/* Express候補ポップアップ: 診療領域サブカテゴリ押下時に上部オーバーレイ表示 */}
        {expressPopupSubcat && (popupCandidates.length > 0 || expressScenarioPicker !== null) && (
          <div ref={expressPopupRef} className={s.expressPopup} role="dialog" aria-label="Express候補">
            <div className={s.expressPopupHeader}>
              <span className={s.expressPopupTitle}>{expressPopupSubcat}</span>
              <div className={s.expressPopupControls}>
                {/* GE / 先発 切替 */}
                <div className={s.expressGEToggle}>
                  <button
                    className={[s.expressGEBtn, expressUseGE ? s.expressGEBtnActive : ''].join(' ')}
                    onClick={() => setExpressUseGE(true)}
                    aria-pressed={expressUseGE}
                  >GE</button>
                  <button
                    className={[s.expressGEBtn, !expressUseGE ? s.expressGEBtnActive : ''].join(' ')}
                    onClick={() => setExpressUseGE(false)}
                    aria-pressed={!expressUseGE}
                  >先発</button>
                </div>
                {expressScenarioPicker && (
                  <button
                    className={s.expressGEBtn}
                    onClick={() => setExpressScenarioPicker(null)}
                    aria-label="剤形一覧に戻る"
                  >‹ 戻る</button>
                )}
                <button
                  className={s.expressPopupClose}
                  onClick={() => { setExpressPopupSubcat(null); setExpressScenarioPicker(null) }}
                  aria-label="閉じる"
                >×</button>
              </div>
            </div>
            {expressScenarioPicker ? (
              // 2段階目: シナリオ選択ビュー
              <div className={s.expressSubGroup}>
                <div className={s.expressSubGroupLabel}>
                  {expressUseGE
                    ? (expressScenarioPicker.genericLabel ?? expressScenarioPicker.label)
                    : expressScenarioPicker.label}
                </div>
                <div className={s.expressGrid}>
                  {(expressScenarioPicker.scenarioCandidates ?? []).map(sc => {
                    // アクティブキー: GE / 先発どちらで追加されていてもアクティブ表示する。
                    // GE/先発切替後も追加済み状態が消えないよう両方の brandKey でチェックする。
                    const pickerGEKey  = expressScenarioPicker.genericBrandName ?? expressScenarioPicker.defaultBrandName ?? ''
                    const pickerSenKey = expressScenarioPicker.defaultBrandName ?? ''
                    const isActive =
                      (activeExpressKeys?.has(`${expressScenarioPicker.moduleId}__${pickerGEKey}__${sc.globalId}`) ?? false) ||
                      (activeExpressKeys?.has(`${expressScenarioPicker.moduleId}__${pickerSenKey}__${sc.globalId}`) ?? false)
                    return (
                      <button
                        key={sc.scenarioId}
                        className={[s.expressBtn, isActive ? s.expressBtnActive : ''].join(' ')}
                        onClick={() => handleExpressScenarioAdd(expressScenarioPicker, sc)}
                        aria-pressed={isActive}
                      >
                        {sc.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              // 1段階目: 剤形ボタン一覧
              popupCandidates.map(({ grp, sub, candidates }) => {
                // GEモード時はGE名でソート、先発モード時はlabel（先発名）でソート
                const jaCollator = new Intl.Collator('ja')
                const sorted = [...candidates].sort((a, b) => {
                  const nameA = expressUseGE ? (a.genericLabel ?? a.label) : a.label
                  const nameB = expressUseGE ? (b.genericLabel ?? b.label) : b.label
                  return jaCollator.compare(nameA, nameB)
                })
                return (
                  <div key={`${grp}__${sub}`} className={s.expressSubGroup}>
                    <div className={s.expressSubGroupLabel}>{sub}</div>
                    <div className={s.expressGrid}>
                      {sorted.map(c => {
                        const displayName = expressUseGE ? (c.genericLabel ?? c.label) : c.label
                        // disabled placeholder: グレー表示・クリック無効
                        if (c.disabled) {
                          return (
                            <button
                              key={`${c.moduleId}__disabled__${c.label}`}
                              className={[s.expressBtn, s.expressBtnDisabled].join(' ')}
                              disabled
                              title={c.disabledReason ?? '準備中'}
                              aria-disabled={true}
                            >
                              {displayName}
                            </button>
                          )
                        }
                        // アクティブキー: GEモード / 先発モードのどちらで追加されていてもアクティブ扱いにする。
                        // GE/先発切替後も「追加済み」状態を正しく表示するため、
                        // 両方の brandKey でチェックする。
                        const geBrandKey  = (c.genericBrandName ?? c.defaultBrandName) ?? ''
                        const senBrandKey = c.defaultBrandName ?? ''
                        function _isKeyActive(bk: string): boolean {
                          if (!bk) return false
                          if (c.scenarioCandidates) {
                            return c.scenarioCandidates.some(sc =>
                              activeExpressKeys?.has(`${c.moduleId}__${bk}__${sc.globalId}`) ?? false
                            )
                          }
                          return activeExpressKeys?.has(`${c.moduleId}__${bk}__${c.defaultScenarioGlobalId}`) ?? false
                        }
                        const isActive = _isKeyActive(geBrandKey) || _isKeyActive(senBrandKey)
                        return (
                          <button
                            key={`${c.moduleId}__${c.defaultBrandName ?? c.label}`}
                            className={[s.expressBtn, isActive ? s.expressBtnActive : ''].join(' ')}
                            onClick={() => handleExpressBrandAdd(c)}
                            title={expressUseGE && c.genericLabel ? `${c.genericLabel}（${c.label}）` : c.label}
                            aria-pressed={isActive}
                          >
                            {displayName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        <div className={s.thirdPanelScrollArea}>
          {/* 薬剤追加セクション: インライン検索のみ */}
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

          {/* 診療領域: シナリオ確定後のみ。Express候補はポップアップで上部表示 */}
          {thirdPanelEnabled && (
            <div className={s.thirdSection}>
              <div className={s.sActionHeading}>診療領域</div>
              <MedicalAreaAccordion
                onSubcategorySelect={handleSubcategorySelect}
                expressSubcats={expressSubcats}
                activeSubcat={expressPopupSubcat}
              />
            </div>
          )}

          {/* 部位入力欄: display.localInput.enabled === true かつ「初回」グループのみ */}
          {localInputConfig?.enabled && thirdPanelEnabled && selectedGroup === '初回' && (() => {
            const isPlaceholderMode = localInputConfig.insertMode === 'placeholder'
            const isEye = localInputConfig.siteButtonType === 'eye'
            const DIRECTIONS = ['左', '右', '両']
            const TOPICAL_SITES = ['手', '足', '腕', '膝', '肘', '肩', '顔', '首', '背中', '腹']
            return (
              <div className={s.localInputHighlight}>
                <div className={s.localInputLabel}>{localInputConfig.label}</div>
                {isPlaceholderMode && (
                  <div className={s.siteButtonArea}>
                    <div className={s.siteDirectionRow}>
                      {DIRECTIONS.map(dir => (
                        <button
                          key={dir}
                          type="button"
                          className={[
                            s.siteDirectionBtn,
                            localSiteInput.startsWith(dir) ? s.siteDirectionBtnActive : '',
                          ].join(' ')}
                          onClick={() => {
                            // 現在の方向プレフィックスを外して dir に付け替え
                            const current = localSiteInput
                            const stripped = DIRECTIONS.reduce((v, d) => v.startsWith(d) ? v.slice(d.length) : v, current)
                            onLocalSiteInputChange?.(dir + stripped)
                          }}
                        >
                          {dir}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={s.siteDirectionClearBtn}
                        onClick={() => {
                          const current = localSiteInput
                          const stripped = DIRECTIONS.reduce((v, d) => v.startsWith(d) ? v.slice(d.length) : v, current)
                          onLocalSiteInputChange?.(stripped)
                        }}
                      >
                        方向解除
                      </button>
                    </div>
                    {!isEye && (
                      <div className={s.siteBtnGrid}>
                        {TOPICAL_SITES.map(site => (
                          <button
                            key={site}
                            type="button"
                            className={[
                              s.siteBtn,
                              localSiteInput.endsWith(site) ? s.siteBtnActive : '',
                            ].join(' ')}
                            onClick={() => {
                              const current = localSiteInput
                              // 方向プレフィックスを保持して部位だけ差し替え
                              const dir = DIRECTIONS.find(d => current.startsWith(d)) ?? ''
                              onLocalSiteInputChange?.(dir + site)
                            }}
                          >
                            {site}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <input
                  type="text"
                  className={s.localSiteInput}
                  placeholder={localInputConfig.placeholder ?? ''}
                  value={localSiteInput}
                  onChange={e => onLocalSiteInputChange?.(e.target.value)}
                />
                <div className={s.localInputHint}>入力するとSOAPの部位表現に反映されます</div>
              </div>
            )
          })()}
        </div>

        {/* S先頭文ボタン: 単剤 + 対象グループのみ */}
        {showSButtons && (
          <div className={s.thirdPanelStickyBottom}>
            <div className={s.sActionHeading}>S 先頭文</div>
            {resolvedSections.map(sec => (
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
