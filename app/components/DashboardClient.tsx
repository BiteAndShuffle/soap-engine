'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock } from '../../lib/types'
import { TAG_TO_GENERIC_NAME } from '../../lib/types'
import { buildSoapFromScenario, buildSoapFull, mergeBlocks } from '../../lib/buildSoap'
import { buildSearchIndex, getSuggestions } from '../../lib/search'
import {
  type MenuGroup,
  groupByMenuGroup,
  getMenuGroupFromScenario,
} from '../../lib/menuGroups'
import { getVisibleAddonKeys } from '../../lib/addonFilter'
import { S_BUTTON_GROUPS } from './ThirdPanel'
import { createSoapFromInput } from '../../lib/createSoapFromInput'
import type { ValidationResult } from '../../lib/validationRunner'

import Topbar, { type RouteFilter } from './Topbar'
import Sidebar from './Sidebar'
import { TemplateListPanel } from './SecondaryPanel'
import AddonPanel from './AddonPanel'
import ThirdPanel from './ThirdPanel'
import NlpInputPanel from './NlpInputPanel'
import SoapEditor, {
  type SPrefix,
  type SStatus,
  buildSFirstSentence,
  replaceSFirstSentence,
} from './SoapEditor'

import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

// ─────────────────────────────────────────────────────────────
// UI モード
//   'manual' — 既存の手動選択フロー（Sidebar → SecondaryPanel）
//   'nlp'    — 自然言語生成モード（NlpInputPanel → createSoapFromInput）
// ─────────────────────────────────────────────────────────────
type UiMode = 'manual' | 'nlp'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface DashboardClientProps {
  moduleData: ModuleData
  allModules: ModuleData[]
}

// ─────────────────────────────────────────────────────────────
// DashboardClient — 状態管理・UIオーケストレーター
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ moduleData, allModules }: DashboardClientProps) {
  // ── 検索インデックス（全モジュールを結合して構築）────────
  const searchIndex = useMemo(
    () => allModules.flatMap(m => buildSearchIndex(m)),
    [allModules],
  )

  // ── アクティブモジュール（検索候補選択で切り替わる） ──────
  // 手動選択（Sidebar→SecondaryPanel）は常に moduleData（デフォルト=oral）。
  // 検索候補選択時に候補の moduleId に一致するモジュールへ切り替える。
  const [activeModuleData, setActiveModuleData] = useState<ModuleData>(moduleData)

  // ── 選択中ブランド名（検索クエリに最も近いブランド） ───────
  // 将来: 検索語からブランドを特定して優先表示する拡張ポイント。
  // undefined のときは activeModuleData.drug.brandNames[0] にフォールバック。
  const [activeBrandName, setActiveBrandName] = useState<string | undefined>(undefined)

  // ── 状態 ──────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})
  const [mergedBlocks, setMergedBlocks] = useState<MergedBlock[]>([])
  const [sPrefix, setSPrefix] = useState<SPrefix>('none')
  const [sStatus, setSStatus] = useState<SStatus>('stable')
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  // ── NLP モード専用状態 ─────────────────────────────────────
  const [uiMode, setUiMode] = useState<UiMode>('manual')
  const [nlpValidation, setNlpValidation] = useState<ValidationResult | null>(null)
  const [nlpSelectorReason, setNlpSelectorReason] = useState('')
  const [nlpConfidence, setNlpConfidence] = useState(0)
  const [nlpIsGenerating, setNlpIsGenerating] = useState(false)

  // ── 選択中シナリオ ────────────────────────────────────────
  const selectedScenario = activeModuleData.scenarios.find(
    sc => sc.globalId === selectedScenarioId,
  )

  // ── SOAP フィールド ──────────────────────────────────────
  // computedFields: S/O/A/P のみ（followup未適用）
  //   → handleAddonToggle でアドオンテキストを合成するときの「起点」として使う
  const computedFields = selectedScenario
    ? buildSoapFromScenario(selectedScenario)
    : EMPTY_FIELDS

  // computedFieldsWithFollowup: followup のみ適用したベース表示用
  //   addonsRef は展開しない（UIトグルで個別制御するため）
  //   シナリオ選択直後（manualFields 未設定時）の初期表示に使う
  const computedFieldsWithFollowup: SoapFields = useMemo(() => {
    if (!selectedScenario) return EMPTY_FIELDS
    const base = buildSoapFromScenario(selectedScenario)
    const followupDefaults = activeModuleData.defaults?.followup ?? {}
    const result = { ...base }
    for (const key of ['S', 'P'] as const) {
      const followupVal = selectedScenario.followup?.[key]
      if (followupVal === 'default') {
        const defaultText = followupDefaults[key]
        if (defaultText) {
          result[key] = result[key] ? `${result[key]}\n${defaultText}` : defaultText
        }
      }
    }
    return result
  }, [selectedScenario, activeModuleData.defaults?.followup])

  const fields: SoapFields = {
    S: manualFields.S ?? computedFieldsWithFollowup.S,
    O: manualFields.O ?? computedFieldsWithFollowup.O,
    A: manualFields.A ?? computedFieldsWithFollowup.A,
    P: manualFields.P ?? computedFieldsWithFollowup.P,
  }

  // ── アドオン表示キー解決 ──────────────────────────────────
  // getVisibleAddonKeys: scenario の scenarioType / scenarioGroup を SSOT として
  // 表示すべきアドオンキーを決定する（addonsRef があれば個別指定優先）。
  const addonVisibleKeys = useMemo(
    () => getVisibleAddonKeys(activeModuleData.addons, selectedScenario),
    [activeModuleData.addons, selectedScenario],
  )

  // ── S操作: 副作用なし/CP良好への変更時に prev_do_stable へ強制初期化 ──
  // prev_do_stable = prefix:'none'(前回、Do) + status:'stable'(体調落ち着いている)
  useEffect(() => {
    if (selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)) {
      setSPrefix('none')
      setSStatus('stable')
    }
  }, [selectedGroup])

  // ── グループ構造 ─────────────────────────────────────────
  // groupByMenuGroup は getMenuGroupFromScenario (sideEffectPresence SSOT) で分類
  const allGroups = useMemo(
    () => groupByMenuGroup(activeModuleData.scenarios),
    [activeModuleData.scenarios],
  )
  const availableGroups = useMemo<Set<MenuGroup>>(
    () => new Set(allGroups.map(g => g.group)),
    [allGroups],
  )

  // 選択中グループのシナリオ一覧
  // 【SSOT二重保証】groupByMenuGroup の結果に加え、
  // getMenuGroupFromScenario(sc) === selectedGroup で再フィルタ。
  // sideEffectPresence の完全一致のみ。部分一致・includes 禁止。
  const groupScenarios = useMemo(() => {
    // group 未選択（検索直後・初期状態など）: セカンドパネルは空
    if (!selectedGroup) return []
    const raw = allGroups.find(g => g.group === selectedGroup)?.scenarios ?? []
    return raw.filter(sc => getMenuGroupFromScenario(sc) === selectedGroup)
  }, [allGroups, selectedGroup])

  // ── サジェスト候補 ───────────────────────────────────────
  // selectedGroup が設定されている場合は groupLabel 完全一致のみ返す
  const suggestions = useMemo(() => {
    const raw = getSuggestions(search, searchIndex)
    if (!selectedGroup) return raw
    return raw.filter(item => item.groupLabel === selectedGroup)
  }, [search, searchIndex, selectedGroup])

  // ── 表示用メタデータ ─────────────────────────────────────
  const badge = activeModuleData.categoryPath?.[1]

  // ── 選択中薬剤ラベル: 「ブランド名（一般名）」形式 ───────
  // 優先順:
  //   1. activeBrandName（検索ヒットしたブランド）+ drugResolution で解決した一般名
  //   2. activeBrandName + drug.genericName
  //   3. brandNames[0] + drugResolution で解決した一般名
  //   4. brandNames[0] + drug.genericName
  //   5. primaryDisplayName フォールバック
  const resolvedBrand = activeBrandName ?? activeModuleData.drug?.brandNames?.[0]
  const drugResolution = activeModuleData.drugResolution
  const resolvedGenericName = (() => {
    if (resolvedBrand && drugResolution) {
      const tags = drugResolution.brandToTags[resolvedBrand] ?? []
      for (const tag of tags) {
        if (TAG_TO_GENERIC_NAME[tag]) return TAG_TO_GENERIC_NAME[tag]
      }
    }
    return activeModuleData.drug?.genericName
  })()
  const activeDrugLabel = resolvedBrand && resolvedGenericName
    ? `${resolvedBrand}（${resolvedGenericName}）`
    : resolvedBrand ?? resolvedGenericName ?? activeModuleData.drug?.search?.primaryDisplayName

  // ── イベントハンドラ ─────────────────────────────────────

  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    setSelectedScenarioId(null)
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
    setSelectedAddonIds(new Set())
  }, [])

  const handleSelectScenario = useCallback((id: string) => {
    setSelectedScenarioId(prev => {
      if (prev === id) {
        // 同じ項目を再押下 → 選択解除
        setManualFields({})
        setSPrefix('none')
        setSStatus('stable')
        setSelectedAddonIds(new Set())
        return null
      }
      const sc = activeModuleData.scenarios.find(s => s.globalId === id)
      if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
      setManualFields({})
      setSPrefix('none')
      setSStatus('stable')
      setSelectedAddonIds(new Set())
      return id
    })
  }, [activeModuleData.scenarios])

  const handleSelectSuggestion = useCallback((scenarioId: string) => {
    // searchIndex から候補エントリを逆引きして moduleId を取得し、activeModuleData を切替
    const entry = searchIndex.find(e => e.templateId === scenarioId)
    if (entry) {
      const targetModule = allModules.find(m => m.moduleId === entry.moduleId) ?? moduleData
      setActiveModuleData(targetModule)
    }
    // suggestions（getSuggestions 結果）から matchedBrandName を取得
    const suggestion = suggestions.find(s => s.templateId === scenarioId)
    setActiveBrandName(suggestion?.matchedBrandName)
    // シナリオは自動選択しない: selectedScenarioId は null のまま
    // 検索 = 薬剤（モジュール）切替のみ。シナリオ確定は中央パネルのクリックで行う。
    setSelectedScenarioId(null)
    setSelectedGroup(null)
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
    setSelectedAddonIds(new Set())
    setSearch('')
  }, [searchIndex, allModules, moduleData, suggestions])

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    setManualFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubcategorySelect = useCallback((label: string) => {
    setSearch(label)
  }, [])

  // アドオントグル
  // addonKey: addons.items の "group:id" 形式キー
  //
  // 【仕様】アドオン ON/OFF はそのセクションを「再構成」する操作。
  //   合成順: base(scenario.S/O/A/P) → addonTexts → followup
  //   アドオン操作前にユーザーが手修正していた場合、その内容は失われる。
  //   運用上は「アドオン操作を先に確定 → その後で手修正」を前提とする。
  //   手修正保持（ユーザー追記領域の分離）は今回スコープ外。
  const handleAddonToggle = useCallback((addonKey: string, _text: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev)
      if (next.has(addonKey)) {
        next.delete(addonKey)
      } else {
        next.add(addonKey)
      }

      // next が確定した addon ids をもとに、各 targetSection を再合成する
      if (activeModuleData.addons && selectedScenario) {
        // targetSection → activeAddonKeys のマップを作る
        const sectionAddonMap = new Map<string, string[]>()
        for (const key of next) {
          const item = activeModuleData.addons.items[key]
          if (!item) continue
          const sec = item.targetSection
          if (!sectionAddonMap.has(sec)) sectionAddonMap.set(sec, [])
          sectionAddonMap.get(sec)!.push(item.text)
        }

        // 各セクションを再合成して manualFields に反映
        const followupDefaults = activeModuleData.defaults?.followup ?? {}
        setManualFields(prevFields => {
          const updated = { ...prevFields }
          for (const [sec, addonTexts] of sectionAddonMap) {
            const base = computedFields[sec as keyof typeof computedFields] ?? ''
            // followup があるセクション (P, S) は末尾に追加
            const followupVal = selectedScenario.followup?.[sec as 'S' | 'P']
            const followupText =
              followupVal === 'default'
                ? (followupDefaults[sec as 'S' | 'P'] ?? '')
                : ''
            const parts = [base, ...addonTexts].filter(Boolean)
            if (followupText) parts.push(followupText)
            updated[sec as keyof typeof updated] = parts.join('\n')
          }
          // sectionAddonMap に含まれないセクションで、以前 addon が付いていた場合も
          // 再合成が必要なセクション（addon が全解除になった場合）を処理する
          for (const sec of ['S', 'O', 'A', 'P'] as const) {
            if (!sectionAddonMap.has(sec)) {
              // このセクションへの addon が全解除 → base + followup のみに戻す
              const hasAnyAddonForSec = [...next].some(
                k => activeModuleData.addons?.items[k]?.targetSection === sec,
              )
              if (!hasAnyAddonForSec) {
                const base = computedFields[sec] ?? ''
                const followupVal = selectedScenario.followup?.[sec as 'S' | 'P']
                const followupText =
                  followupVal === 'default'
                    ? (followupDefaults[sec as 'S' | 'P'] ?? '')
                    : ''
                const parts = [base].filter(Boolean)
                if (followupText) parts.push(followupText)
                updated[sec] = parts.join('\n')
              }
            }
          }
          return updated
        })
      }

      return next
    })
  }, [activeModuleData.addons, activeModuleData.defaults?.followup, selectedScenario, computedFields])

  // S欄トグル操作
  const handleSToggle = useCallback((prefix: SPrefix, status: SStatus) => {
    setSPrefix(prefix)
    setSStatus(status)
    const newFirst = buildSFirstSentence(prefix, status)
    const currentS = fields.S
    const updated = replaceSFirstSentence(currentS, newFirst)
    setManualFields(prev => ({ ...prev, S: updated }))
  }, [fields.S])

  // 保持（合成）機能
  const handleMerge = useCallback(() => {
    if (!selectedScenario) return

    const currentLabel = selectedScenario.title
    const currentFields = { ...fields }

    const newBlock: MergedBlock = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      templateLabel: currentLabel,
      fields: currentFields,
    }

    const updatedBlocks = [...mergedBlocks, newBlock]
    setMergedBlocks(updatedBlocks)

    const merged = mergeBlocks(
      updatedBlocks.slice(0, -1),
      currentFields,
      currentLabel,
    )
    setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })

    setSelectedScenarioId(null)
    setSelectedGroup(null)
    setSPrefix('none')
    setSStatus('stable')
  }, [selectedScenario, fields, mergedBlocks])

  const handleResetMerge = useCallback(() => {
    setMergedBlocks([])
    setManualFields({})
    setSelectedScenarioId(null)
    setSelectedGroup(null)
    setSPrefix('none')
    setSStatus('stable')
  }, [])

  // ── NLP モード: モード切替 ────────────────────────────────
  /**
   * 手動選択モード → 自然言語生成モードへ切替。
   * 既存の選択・手動入力はリセットする。
   */
  const handleSwitchToNlp = useCallback(() => {
    setUiMode('nlp')
    setSelectedScenarioId(null)
    setSelectedGroup(null)
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
    setSelectedAddonIds(new Set())
    setMergedBlocks([])
    setNlpValidation(null)
    setNlpSelectorReason('')
    setNlpConfidence(0)
  }, [])

  /**
   * 自然言語生成モード → 手動選択モードへ切替。
   * NLP 結果はリセットする。
   */
  const handleSwitchToManual = useCallback(() => {
    setUiMode('manual')
    setManualFields({})
    setNlpValidation(null)
    setNlpSelectorReason('')
    setNlpConfidence(0)
  }, [])

  // ── NLP モード: SOAP 生成 ─────────────────────────────────
  /**
   * createSoapFromInput() を呼び、結果を状態に反映する。
   *
   * 呼び出し元: NlpInputPanel.onGenerate
   * 生成結果:
   *   - validation.valid=false → manualFields をクリア（エラー表示のみ）
   *   - scenarioId=null        → manualFields をクリア（シナリオ未特定）
   *   - soap が存在する場合    → manualFields に反映して SoapEditor に表示
   *
   * DashboardClient → createSoapFromInput（lib/createSoapFromInput.ts）
   *                     ├─ scenarioSelector（lib/scenarioSelector.ts）
   *                     ├─ validationRunner（lib/validationRunner.ts）
   *                     │    ├─ validateModule（lib/moduleValidator.ts）
   *                     │    └─ validateAllScenarios（lib/scenarioValidator.ts）
   *                     ├─ jsonScenarioBuilder（lib/jsonScenarioBuilder.ts）
   *                     └─ soapComposer（lib/soapComposer.ts）
   */
  const handleNlpGenerate = useCallback(
    (patientInput: string) => {
      setNlpIsGenerating(true)

      // createSoapFromInput は同期関数（現時点では非同期APIなし）
      const result = createSoapFromInput(moduleData, patientInput)

      setNlpValidation(result.validation)
      setNlpSelectorReason(result.selectorReason)
      setNlpConfidence(result.confidence)

      if (result.soap) {
        // SOAP 生成成功: SoapEditor に表示
        setManualFields({
          S: result.soap.S,
          O: result.soap.O,
          A: result.soap.A,
          P: result.soap.P,
        })
        // 選択シナリオIDも反映（templateLabel 表示に使う）
        if (result.scenarioId) {
          setSelectedScenarioId(result.scenarioId)
          const sc = activeModuleData.scenarios.find(s => s.globalId === result.scenarioId)
          if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
        }
      } else {
        // 生成失敗: フィールドをクリア
        setManualFields({})
        setSelectedScenarioId(null)
      }

      setNlpIsGenerating(false)
    },
    [moduleData],
  )

  // ── レンダリング ─────────────────────────────────────────
  return (
    <div className={s.layout}>
      <Topbar
        title="SOAP Engine"
        badge={badge}
        activeDrugLabel={activeBrandName != null || selectedScenarioId !== null ? activeDrugLabel : undefined}
        searchValue={search}
        onSearchChange={setSearch}
        suggestions={suggestions}
        onSelectSuggestion={handleSelectSuggestion}
        routeFilter={routeFilter}
        onRouteFilterChange={setRouteFilter}
      />

      <div className={s.body}>
        {/* Col 1: 大分類リスト */}
        <Sidebar
          availableGroups={availableGroups}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
        />

        {/* Col 2: テンプレ一覧（常時表示・選択中のみハイライト）＋アドオン */}
        {/*        自然言語生成モード時は NLP モード切替ボタンのみ表示 */}
        <div className={s.secondaryCol}>
          {/* モード切替ボタン（常時表示） */}
          <div className={s.modeToggleBar}>
            <button
              className={[
                s.modeToggleBtn,
                uiMode === 'manual' ? s.modeToggleBtnActive : '',
              ].join(' ')}
              onClick={() => uiMode !== 'manual' && handleSwitchToManual()}
              aria-pressed={uiMode === 'manual'}
            >
              手動選択
            </button>
            <button
              className={[
                s.modeToggleBtn,
                uiMode === 'nlp' ? s.modeToggleBtnActive : '',
              ].join(' ')}
              onClick={() => uiMode !== 'nlp' && handleSwitchToNlp()}
              aria-pressed={uiMode === 'nlp'}
            >
              🤖 自然言語
            </button>
          </div>

          {uiMode === 'manual' && (
            <>
              {groupScenarios.length === 0 ? (
                <div className={s.secondaryEmpty} aria-hidden="true" />
              ) : (
                <>
                  <TemplateListPanel
                    key={selectedGroup ?? 'all'}
                    group={selectedGroup}
                    scenarios={groupScenarios}
                    selectedScenarioId={selectedScenarioId}
                    onSelectScenario={handleSelectScenario}
                  />
                  {selectedScenarioId !== null && activeModuleData.addons && (
                    <AddonPanel
                      addons={activeModuleData.addons}
                      selectedAddonIds={selectedAddonIds}
                      onToggle={handleAddonToggle}
                      visibleKeys={addonVisibleKeys}
                    />
                  )}
                </>
              )}
            </>
          )}

          {uiMode === 'nlp' && (
            <div className={s.secondaryEmpty} aria-hidden="true" />
          )}
        </div>

        {/* Col 3:
            手動選択モード → ThirdPanel（Sボタン / 薬剤追加 / 診療領域）
            自然言語生成モード → NlpInputPanel
        */}
        {uiMode === 'manual' ? (
          <ThirdPanel
            selectedGroup={selectedGroup}
            thirdPanelEnabled={selectedScenarioId !== null}
            currentSPrefix={sPrefix}
            currentSStatus={sStatus}
            onSAction={handleSToggle}
            searchValue={search}
            onSearchChange={setSearch}
            suggestions={suggestions}
            onSelectSuggestion={handleSelectSuggestion}
            onSubcategorySelect={handleSubcategorySelect}
          />
        ) : (
          <div className={s.thirdPanel}>
            <NlpInputPanel
              scenarioId={selectedScenarioId}
              validation={nlpValidation}
              selectorReason={nlpSelectorReason}
              confidence={nlpConfidence}
              isGenerating={nlpIsGenerating}
              onGenerate={handleNlpGenerate}
              onSwitchToManual={handleSwitchToManual}
            />
          </div>
        )}

        {/* Col 4: SOAPエディター */}
        <SoapEditor
          fields={fields}
          onChange={handleFieldChange}
          templateLabel={selectedScenario?.title ?? ''}
          mergedBlockCount={mergedBlocks.length}
          onMerge={handleMerge}
          onResetMerge={handleResetMerge}
          canMerge={!!selectedScenario}
        />
      </div>
    </div>
  )
}
