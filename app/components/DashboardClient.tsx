'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock, ComposeNode } from '../../lib/types'
import { TAG_TO_GENERIC_NAME } from '../../lib/types'
import { buildNodeFields, mergeBlocks } from '../../lib/buildSoap'
import { resolveDrugSubject, resolveDrugName } from '../../lib/drugSubject'
import { buildSearchIndex, getDrugSuggestions, normalizeText } from '../../lib/search'
import type { DrugSuggestionItem } from '../../lib/search'
import {
  type MenuGroup,
  groupByMenuGroup,
  getMenuGroupFromScenario,
} from '../../lib/menuGroups'
import { getVisibleAddonKeys } from '../../lib/addonFilter'
import { S_BUTTON_GROUPS, type SingleDrugFlags } from './ThirdPanel'
import { createSoapFromInput } from '../../lib/createSoapFromInput'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../../lib/applyPersona'
import { derivePersonaGuard } from '../../lib/personaGuard'
import type { ValidationResult } from '../../lib/validationRunner'

import Topbar, { type RouteFilter } from './Topbar'
import Sidebar from './Sidebar'
import { TemplateListPanel } from './SecondaryPanel'
import AddonPanel from './AddonPanel'
import ThirdPanel from './ThirdPanel'
import NlpInputPanel from './NlpInputPanel'
import SoapEditor, {
  type SRelation,
  type SCondition,
  buildSFirstSentence,
  replaceSFirstSentence,
} from './SoapEditor'
import ComposeNodeBar from './ComposeNodeBar'

import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

// ─────────────────────────────────────────────────────────────
// ノードラベルマッピング
// ─────────────────────────────────────────────────────────────

const NODE_LABEL_MAP: Record<string, string> = {
  'GLP-1受容体作動薬': 'GLP1',
  '去痰薬': '去痰',
  '鎮咳薬': '鎮咳',
  '抗菌薬': '抗生剤',
}

function resolveNodeLabel(mod: ModuleData): string {
  if (mod.composition?.nodeLabelShort) return mod.composition.nodeLabelShort
  if (mod.composition?.nodeLabel) return mod.composition.nodeLabel
  const cat1 = mod.categoryPath?.[1]
  if (cat1 && NODE_LABEL_MAP[cat1]) return NODE_LABEL_MAP[cat1]
  return mod.drug?.brandNames?.[0] ?? mod.moduleId
}

// ─────────────────────────────────────────────────────────────
// UI モード
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
// ユーティリティ: 1剤目シナリオ + followup から primaryBaseFields を計算
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// ユーティリティ: followup closing テキストを解決
// ─────────────────────────────────────────────────────────────

function resolveClosingText(
  scenario: { followupRef?: string; followup?: Record<string, unknown> },
  defaults?: ModuleData['defaults'],
): string | undefined {
  if (scenario.followupRef) {
    return (defaults?.followupProfiles?.[scenario.followupRef] as Record<string, string> | undefined)?.P
  }
  const val = (scenario.followup as Record<string, string> | undefined)?.P
  if (val === 'default') {
    return (defaults?.followup as Record<string, string> | undefined)?.P
  }
  return undefined
}

// ─────────────────────────────────────────────────────────────
// displayFields を計算するピュア関数
//
// Source of truth:
//   primaryBaseFields  — 1剤目の確定 SOAP（addon 込み）
//   composeNodes       — 2剤目以降ノード（block.fields + scenarioId）
//
// 確定済みノード（scenarioId 非空）のみ mergeBlocks に渡す。
// pending ノード（scenarioId 空）は無視され、1剤目だけが表示される。
// ─────────────────────────────────────────────────────────────

function computeDisplayFields(
  primaryBaseFields: SoapFields,
  primaryScenario: ModuleData['scenarios'][number] | undefined,
  composeNodes: ComposeNode[],
  defaults: ModuleData['defaults'],
  primaryMod: ModuleData,
): SoapFields {
  const confirmedNodes = composeNodes.filter(n => n.scenarioId !== '' && n.scenarioId != null)
  if (confirmedNodes.length === 0) return { ...primaryBaseFields }
  // 1剤目の groupKey / clinicalDomain を渡して reason 統合の同一性判定を正しく行う
  const currentGroupKey     = primaryScenario?.mergePolicy?.S?.groupKey
  const currentClinicalDomain = primaryMod.composition?.clinicalDomain
  return mergeBlocks(
    confirmedNodes.map(n => n.block),
    primaryBaseFields,
    primaryScenario?.title ?? '',
    primaryScenario ? resolveClosingText(primaryScenario, defaults) : undefined,
    undefined,           // currentDomain（旧引数: 未使用のまま維持）
    currentGroupKey,
    currentClinicalDomain,
  )
}

// ─────────────────────────────────────────────────────────────
// ユーティリティ: domain 解決（ノードブロック用）
// ─────────────────────────────────────────────────────────────

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}

// ─────────────────────────────────────────────────────────────
// DashboardClient
//
// State design — source of truth は2つだけ:
//   primaryBaseFields  : 1剤目の確定 SOAP（addon 込み）
//   composeNodes       : 2剤目以降ノードのリスト
//
// activeContext で「今どちらを操作しているか」を決める:
//   editingNodeId !== null  → そのノードを操作
//   null                    → 1剤目を操作
//
// displayFields は上記 2 つから毎回 pure に計算（derived）。
// manualFields は存在しない。
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ moduleData, allModules }: DashboardClientProps) {
  // ── 検索インデックス ────────────────────────────────────────
  const searchIndex = useMemo(
    () => allModules.flatMap(m => buildSearchIndex(m)),
    [allModules],
  )

  // ── 薬剤モジュール ─────────────────────────────────────────
  const [activeModuleData, setActiveModuleData] = useState<ModuleData>(moduleData)
  const [activeBrandName, setActiveBrandName] = useState<string | undefined>(undefined)
  const [drugSelected, setDrugSelected] = useState(false)

  // ── 検索テキスト ─────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [composeSearch, setComposeSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')

  // ── UI モード ──────────────────────────────────────────────
  const [uiMode, setUiMode] = useState<UiMode>('manual')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)

  // ── NLP 状態 ────────────────────────────────────────────────
  const [nlpValidation, setNlpValidation] = useState<ValidationResult | null>(null)
  const [nlpSelectorReason, setNlpSelectorReason] = useState('')
  const [nlpConfidence, setNlpConfidence] = useState(0)
  const [nlpIsGenerating, setNlpIsGenerating] = useState(false)

  // ── S relation/condition ─────────────────────────────────────
  const [sRelation, setSRelation] = useState<SRelation>('continued_do')
  const [sCondition, setSCondition] = useState<SCondition>('stable')

  // ── 単剤フラグ（副作用なし / CP良好）: 単剤時のみ有効 ──────
  const [singleDrugFlags, setSingleDrugFlags] = useState<SingleDrugFlags>({
    noSideEffect: false,
    goodCompliance: false,
  })

  // ── ペルソナ（文体切替）: 表示変換のみ、医療ロジック不変 ──
  // デフォルトは concise（簡潔）で表示。plain を選ぶと rawFields 相当の無変換になる。
  const [personaEnabled, setPersonaEnabled] = useState(true)
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('concise')
  const [personaModalOpen, setPersonaModalOpen] = useState(false)

  // ══════════════════════════════════════════════════════════════
  // SOURCE OF TRUTH
  // ══════════════════════════════════════════════════════════════

  // 1剤目シナリオ ID（1剤目専用。ノード操作では絶対に書き換えない）
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  // 1剤目の確定 SOAP（addon 込み。ノード操作では絶対に書き換えない）
  const [primaryBaseFields, setPrimaryBaseFields] = useState<SoapFields>(EMPTY_FIELDS)

  // 1剤目の addon 選択状態（ノード操作では書き換えない）
  const [primaryAddonIds, setPrimaryAddonIds] = useState<Set<string>>(new Set())

  // 2剤目以降ノードのリスト（scenarioId / block / selectedAddonIds を持つ）
  const [composeNodes, setComposeNodes] = useState<ComposeNode[]>([])

  // 1剤目再編集モード（true のとき 1剤目のグループ・シナリオを再選択中）
  const [editingPrimary, setEditingPrimary] = useState(false)

  // 現在編集中ノードID（null = 1剤目操作中）
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // pending ノード（薬剤追加済み・シナリオ未確定）の ID セット
  const [pendingNodeIds, setPendingNodeIds] = useState<Set<string>>(new Set())

  // UI 側の addon 選択表示（activeContext が切り替わると差し替える）
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  // ══════════════════════════════════════════════════════════════
  // REFS（stale closure 防止。callbacks 内で最新値を参照する）
  // ══════════════════════════════════════════════════════════════

  const primaryBaseFieldsRef  = useRef<SoapFields>(EMPTY_FIELDS)
  const primaryAddonIdsRef    = useRef<Set<string>>(new Set())
  const selectedAddonIdsRef   = useRef<Set<string>>(new Set())
  const editingNodeIdRef      = useRef<string | null>(null)
  const editingPrimaryRef     = useRef(false)
  const composeNodesRef       = useRef<ComposeNode[]>([])
  const primaryScenarioRef    = useRef<ModuleData['scenarios'][number] | undefined>(undefined)
  // persona 再計算用: 1剤目の rawFields / guard を保持
  const rawPrimaryFieldsRef   = useRef<SoapFields>(EMPTY_FIELDS)
  const primaryGuardRef       = useRef<ReturnType<typeof derivePersonaGuard> | null>(null)
  // useEffect / useCallback 内で stale closure を踏まずに persona 状態を参照するための ref
  const personaEnabledRef     = useRef(false)
  const selectedPersonaRef    = useRef<PersonaId>('polite')
  // NLP モード中は selectedScenarioId 変化による useEffect の上書きをスキップするための ref
  const uiModeRef             = useRef<UiMode>('manual')

  // ── 1剤目シナリオ（render ごとに解決） ──────────────────────
  const primaryScenario = useMemo(
    () => activeModuleData.scenarios.find(sc => sc.globalId === selectedScenarioId),
    [activeModuleData.scenarios, selectedScenarioId],
  )

  // ══════════════════════════════════════════════════════════════
  // ACTIVE CONTEXT（derived）
  //
  // editingNodeId が non-null → そのノードが activeContext
  // null                     → 1剤目が activeContext
  // ══════════════════════════════════════════════════════════════

  const activeNode = useMemo(
    () => editingNodeId !== null
      ? (composeNodes.find(n => n.id === editingNodeId) ?? null)
      : null,
    [editingNodeId, composeNodes],
  )

  // TemplateListPanel ハイライト・ThirdPanel 有効化用
  const currentScenarioId: string | null = activeNode !== null
    ? (activeNode.scenarioId || null)
    : selectedScenarioId

  // ══════════════════════════════════════════════════════════════
  // DISPLAY FIELDS（derived: pure function、state は変えない）
  // ══════════════════════════════════════════════════════════════

  const displayFields = useMemo(
    () => computeDisplayFields(primaryBaseFields, primaryScenario, composeNodes, activeModuleData.defaults, activeModuleData),
    [primaryBaseFields, primaryScenario, composeNodes, activeModuleData],
  )

  // ── finalFields: block 単位で persona 変換済みの fields を merge した結果 ──
  // persona 変換は primaryBaseFields / block.fields に焼き込み済みのため後がけ不要。
  // displayFields = computeDisplayFields(persona変換済み fields) がそのまま最終表示値。
  const finalFields = displayFields

  // ── Refs を render ごとに同期 ──────────────────────────────
  primaryBaseFieldsRef.current = primaryBaseFields
  primaryAddonIdsRef.current   = primaryAddonIds
  selectedAddonIdsRef.current  = selectedAddonIds
  editingNodeIdRef.current     = editingNodeId
  editingPrimaryRef.current    = editingPrimary
  composeNodesRef.current      = composeNodes
  primaryScenarioRef.current   = primaryScenario
  personaEnabledRef.current    = personaEnabled
  selectedPersonaRef.current   = selectedPersona
  uiModeRef.current            = uiMode

  // ── targetModule: activeContext のモジュール ─────────────────
  const targetModule = useMemo<ModuleData>(() => {
    if (activeNode === null) return activeModuleData
    return allModules.find(m => m.moduleId === activeNode.moduleId) ?? activeModuleData
  }, [activeNode, activeModuleData, allModules])

  // ── addonTargetScenario: activeContext のシナリオ（AddonPanel 用） ─
  const addonTargetScenario = useMemo(() => {
    if (activeNode === null) return primaryScenario
    if (!activeNode.scenarioId) return undefined
    return targetModule.scenarios.find(sc => sc.globalId === activeNode.scenarioId)
  }, [activeNode, targetModule, primaryScenario])

  const addonVisibleKeys = useMemo(
    () => getVisibleAddonKeys(targetModule.addons, addonTargetScenario),
    [targetModule.addons, addonTargetScenario],
  )

  // ── allGroups / availableGroups / groupScenarios ────────────
  const allGroups = useMemo(
    () => groupByMenuGroup(targetModule.scenarios),
    [targetModule.scenarios],
  )
  const availableGroups = useMemo<Set<MenuGroup>>(
    () => new Set(allGroups.map(g => g.group)),
    [allGroups],
  )
  const groupScenarios = useMemo(() => {
    if (!selectedGroup) return []
    const raw = allGroups.find(g => g.group === selectedGroup)?.scenarios ?? []
    return raw.filter(sc => getMenuGroupFromScenario(sc) === selectedGroup)
  }, [allGroups, selectedGroup])

  // ── 薬剤サジェスト ───────────────────────────────────────────
  void normalizeText  // tree-shaking 抑止
  const mainDrugSuggestions = useMemo<DrugSuggestionItem[]>(
    () => getDrugSuggestions(mainSearch, searchIndex),
    [mainSearch, searchIndex],
  )
  const composeDrugSuggestions = useMemo<DrugSuggestionItem[]>(
    () => getDrugSuggestions(composeSearch, searchIndex),
    [composeSearch, searchIndex],
  )

  // ── トップバー表示用ラベル ───────────────────────────────────
  const badge = activeModuleData.categoryPath?.[1]
  const resolvedBrand = activeBrandName ?? activeModuleData.drug?.brandNames?.[0]
  const drugResolution = activeModuleData.drugResolution
  const resolvedGenericName = (() => {
    if (resolvedBrand && drugResolution) {
      for (const tag of drugResolution.brandToTags[resolvedBrand] ?? []) {
        if (TAG_TO_GENERIC_NAME[tag]) return TAG_TO_GENERIC_NAME[tag]
      }
    }
    return activeModuleData.drug?.genericName
  })()
  const activeDrugLabel = resolvedBrand && resolvedGenericName
    ? `${resolvedBrand}（${resolvedGenericName}）`
    : resolvedBrand ?? resolvedGenericName ?? activeModuleData.drug?.search?.primaryDisplayName

  // ══════════════════════════════════════════════════════════════
  // EFFECTS
  // ══════════════════════════════════════════════════════════════

  // S prefix/status・フラグリセット（グループ変更時）
  useEffect(() => {
    if (selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)) {
      setSRelation('continued_do')
      setSCondition('stable')
    }
    // グループが変わったらフラグもリセット（S欄の内容はシナリオ切替で上書きされるため）
    setSingleDrugFlags({ noSideEffect: false, goodCompliance: false })
  }, [selectedGroup])

  // 1剤目シナリオ切替時に primaryBaseFields を初期化（addon なし素の状態）
  // - selectedScenarioId 変化時のみ走る
  // - ノード操作中（editingNodeId !== null）はスキップ: primary は触らない
  // - addon 込みの更新は handleAddonToggle の primary ブランチで行う
  useEffect(() => {
    if (editingNodeId !== null) return
    // NLP モード中は handleNlpGenerate が rawFields/guard/primaryBaseFields を直接管理するため
    // selectedScenarioId 変化による上書きをスキップする
    if (uiModeRef.current === 'nlp') return
    if (selectedScenarioId !== null && primaryScenario) {
      // activeBrandName が primary の matchedBrandName に相当する
      // resolveDrugName は DashboardClient スコープ外のため、ここでは直接フォールバック順を適用
      const primaryDrugName = activeBrandName
        ?? activeModuleData.drug?.brandNames?.[0]
        ?? activeModuleData.drug?.genericName
        ?? ''
      const { fields: rawFields } = buildNodeFields(primaryScenario, activeModuleData, [], primaryDrugName)
      const guard = derivePersonaGuard(primaryScenario, activeModuleData.template?.urgentFlag)
      rawPrimaryFieldsRef.current = rawFields
      primaryGuardRef.current = guard
      // persona が ON の場合は初期表示から変換済みフィールドを使用する
      // personaEnabled / selectedPersona は ref 経由で参照（effect の deps に加えない）
      const displayableFields = personaEnabledRef.current
        ? applyPersonaToFieldsWithGuard(rawFields, true, selectedPersonaRef.current, guard)
        : rawFields
      setPrimaryBaseFields(displayableFields)
      setPrimaryAddonIds(new Set())
      setSelectedAddonIds(new Set())
    } else if (selectedScenarioId === null) {
      rawPrimaryFieldsRef.current = EMPTY_FIELDS
      primaryGuardRef.current = null
      setPrimaryBaseFields(EMPTY_FIELDS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenarioId, editingNodeId])
  // ↑ primaryScenario / activeModuleData.defaults は deps に入れない。
  //   シナリオ切替タイミングだけで同期すれば十分。
  //   deps に入れると別モジュール選択時など意図しない再実行が起きる。

  // ══════════════════════════════════════════════════════════════
  // CALLBACKS
  // ══════════════════════════════════════════════════════════════

  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    // グループ切り替え時に前シナリオの addon 残留を防ぐ。
    // editingNodeId !== null（node 編集中）や editingPrimary（1剤目の別グループ切替）は
    // selectedScenarioId をリセットしない。
    if (editingNodeIdRef.current === null && !editingPrimaryRef.current) {
      setSelectedScenarioId(null)
      setPrimaryBaseFields(EMPTY_FIELDS)
      setPrimaryAddonIds(new Set())
      setSelectedAddonIds(new Set())
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // ノードブロック再構築ヘルパー（pure: state を直接変えない）
  // ─────────────────────────────────────────────────────────────

  const buildUpdatedNode = useCallback((
    node: ComposeNode,
    newScenarioId: string,
    addonIds: string[],
    matchedBrandName?: string,
  ): ComposeNode | null => {
    const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
    const sc = mod.scenarios.find(s => s.globalId === newScenarioId)
    if (!sc) return null
    // ノード固有の薬剤名を解決（matchedBrandName → brandNames[0] → genericName の順）
    const drugName = resolveDrugName(mod.drug, matchedBrandName)
    const { fields: rawFields, closingText, groupKey, clinicalDomain, closingBehavior } = buildNodeFields(sc, mod, addonIds, drugName)
    const guard = derivePersonaGuard(sc, mod.template?.urgentFlag)
    const fields = personaEnabled
      ? applyPersonaToFieldsWithGuard(rawFields, true, selectedPersona, guard)
      : rawFields
    const domain = resolveDomain(mod)
    return {
      ...node,
      scenarioId: newScenarioId,
      block: {
        id: node.block.id,
        templateLabel: sc.title,
        fields,
        rawFields,
        guard,
        symptomCodes: sc.sComposition?.symptomCodes,
        closingText,
        domain,
        groupKey,
        clinicalDomain,
        closingBehavior,
      },
      selectedAddonIds: addonIds,
      baseLabel: sc.title,
      baseDomain: domain,
    }
  }, [allModules, moduleData, personaEnabled, selectedPersona])

  // ─────────────────────────────────────────────────────────────
  // handleSelectPrimaryNode（1剤目チップクリック: primary 編集モードのトグル）
  //
  // editingPrimary === true  → 解除（通常状態へ）
  // editingPrimary === false → primary 編集モードへ（editingNodeId をクリア）
  // ─────────────────────────────────────────────────────────────

  const handleSelectPrimaryNode = useCallback(() => {
    if (editingPrimaryRef.current) {
      // 解除: primary 編集モードを終了
      setEditingPrimary(false)
      // グループは primaryScenario のものに戻す（既に primary 操作中と同じ状態）
      const primarySc = primaryScenarioRef.current
      if (primarySc) setSelectedGroup(getMenuGroupFromScenario(primarySc))
      setSelectedAddonIds(primaryAddonIdsRef.current)
    } else {
      // primary 編集モードへ
      setEditingPrimary(true)
      setEditingNodeId(null)
      // グループを 1剤目シナリオのものに復元
      const primarySc = primaryScenarioRef.current
      if (primarySc) setSelectedGroup(getMenuGroupFromScenario(primarySc))
      setSelectedAddonIds(primaryAddonIdsRef.current)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleSelectScenario
  //   primary   → selectedScenarioId を更新（useEffect が primaryBaseFields を追従）
  //   node      → そのノードの block を再構築して composeNodes を更新
  // ─────────────────────────────────────────────────────────────

  const handleSelectScenario = useCallback((id: string) => {
    const nodeId = editingNodeIdRef.current

    if (nodeId !== null) {
      // ── node ブランチ ────────────────────────────────────────
      const addonIds = [...selectedAddonIdsRef.current]
      setPendingNodeIds(prev => { const n = new Set(prev); n.delete(nodeId); return n })
      setComposeNodes(prev => {
        const node = prev.find(n => n.id === nodeId)
        if (!node) return prev
        // node.matchedBrandName を渡して {{drug_subject}} を即時解決
        const updated = buildUpdatedNode(node, id, addonIds, node.matchedBrandName)
        if (!updated) return prev
        return prev.map(n => n.id === nodeId ? updated : n)
      })
      return
    }

    // ── primary ブランチ ─────────────────────────────────────
    // editingPrimary 中にシナリオを選んだら編集モードを終了
    if (editingPrimaryRef.current) setEditingPrimary(false)
    setSelectedScenarioId(prev => {
      if (prev === id) {
        // 同じシナリオを再タップ → 解除
        setPrimaryBaseFields(EMPTY_FIELDS)
        setPrimaryAddonIds(new Set())
        setSelectedAddonIds(new Set())
        setSRelation('continued_do')
        setSCondition('stable')
        return null
      }
      const sc = activeModuleData.scenarios.find(s => s.globalId === id)
      if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
      setSRelation('continued_do')
      setSCondition('stable')
      // primaryBaseFields は useEffect(selectedScenarioId) で同期される
      return id
    })
  }, [activeModuleData.scenarios, buildUpdatedNode])

  // ─────────────────────────────────────────────────────────────
  // handleSelectDrugSuggestion（メイン検索: 薬剤切替）
  // ─────────────────────────────────────────────────────────────

  const handleSelectDrugSuggestion = useCallback((item: DrugSuggestionItem) => {
    const mod = allModules.find(m => m.moduleId === item.moduleId) ?? moduleData
    setActiveModuleData(mod)
    setActiveBrandName(item.matchedBrandName)
    setDrugSelected(true)
    setSelectedScenarioId(null)
    setPrimaryBaseFields(EMPTY_FIELDS)
    setPrimaryAddonIds(new Set())
    setSelectedAddonIds(new Set())
    setSelectedGroup(null)
    setSRelation('continued_do')
    setSCondition('stable')
    setMainSearch('')
    setComposeNodes([])
    setEditingNodeId(null)
    setEditingPrimary(false)
    setPendingNodeIds(new Set())
  }, [allModules, moduleData])

  // ─────────────────────────────────────────────────────────────
  // handleComposeDrugSelect（合成検索: ノード追加）
  // ─────────────────────────────────────────────────────────────

  const handleComposeDrugSelect = useCallback((item: DrugSuggestionItem) => {
    const mod = allModules.find(m => m.moduleId === item.moduleId) ?? moduleData
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2)}`
    // matchedBrandName をノードに保持（シナリオ確定時の {{drug_subject}} 解決に使用）
    const nodeDrugName = resolveDrugName(mod.drug, item.matchedBrandName)
    const newNode: ComposeNode = {
      id: nodeId,
      moduleId: mod.moduleId,
      scenarioId: '',
      block: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        templateLabel: '',
        fields: EMPTY_FIELDS,
        closingText: undefined,
      },
      drugLabel: resolveNodeLabel(mod),
      matchedBrandName: item.matchedBrandName,
      resolvedDrugName: nodeDrugName,
      selectedAddonIds: [],
      baseLabel: '',
      baseDomain: resolveDomain(mod),
    }
    // pending ノードは block が EMPTY_FIELDS のため computeDisplayFields に影響しない
    // (scenarioId が空なので confirmedNodes に含まれない)
    setComposeNodes(prev => [...prev, newNode])
    setPendingNodeIds(prev => new Set([...prev, nodeId]))
    setEditingNodeId(nodeId)
    setEditingPrimary(false)
    setSelectedGroup(null)
    setSelectedAddonIds(new Set())
    setComposeSearch('')
  }, [allModules, moduleData])

  // ─────────────────────────────────────────────────────────────
  // handleSelectNode
  // ─────────────────────────────────────────────────────────────

  const handleSelectNode = useCallback((nodeId: string) => {
    const currentId = editingNodeIdRef.current
    const nodes = composeNodesRef.current

    if (currentId === nodeId) {
      // 同じノード再クリック → 1剤目操作モードへ
      setEditingNodeId(null)
      const primarySc = primaryScenarioRef.current
      setSelectedGroup(primarySc ? getMenuGroupFromScenario(primarySc) : null)
      setSelectedAddonIds(primaryAddonIdsRef.current)
      return
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    setEditingNodeId(nodeId)
    setEditingPrimary(false)  // ノード選択時は primary 編集モードを解除

    if (node.scenarioId) {
      // 確定済みノード: シナリオのグループを自動復元
      const nodeMod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
      const nodeSc = nodeMod.scenarios.find(sc => sc.globalId === node.scenarioId)
      setSelectedGroup(nodeSc ? getMenuGroupFromScenario(nodeSc) : null)
      setSelectedAddonIds(new Set(node.selectedAddonIds ?? []))
    } else {
      // pending ノード: 左メニューで選ぶまで待機
      setSelectedGroup(null)
      setSelectedAddonIds(new Set())
    }
  }, [allModules, moduleData])

  // ─────────────────────────────────────────────────────────────
  // handleRemoveComposeNode
  // ─────────────────────────────────────────────────────────────

  const handleRemoveComposeNode = useCallback((nodeId: string) => {
    const currentId = editingNodeIdRef.current
    const primarySc = primaryScenarioRef.current

    if (currentId === nodeId) {
      setEditingNodeId(null)
      setSelectedAddonIds(primaryAddonIdsRef.current)
      setSelectedGroup(primarySc ? getMenuGroupFromScenario(primarySc) : null)
    }
    setPendingNodeIds(prev => { const n = new Set(prev); n.delete(nodeId); return n })
    setComposeNodes(prev => prev.filter(n => n.id !== nodeId))
    // displayFields は computeDisplayFields が自動再計算
  }, [])  // editingPrimary は remove 操作に影響しない

  // ─────────────────────────────────────────────────────────────
  // handleResetCompose（全ノードリセット）
  // ─────────────────────────────────────────────────────────────

  const handleResetCompose = useCallback(() => {
    setComposeNodes([])
    setEditingNodeId(null)
    setEditingPrimary(false)
    setPendingNodeIds(new Set())
    const primarySc = primaryScenarioRef.current
    setSelectedGroup(primarySc ? getMenuGroupFromScenario(primarySc) : null)
    setSelectedAddonIds(primaryAddonIdsRef.current)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleFieldChange（テキスト直接編集）
  //
  //   node    → そのノードの block.fields を更新（composeNodes を書き換え）
  //   primary → primaryBaseFields を更新
  // ─────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    const nodeId = editingNodeIdRef.current
    if (nodeId !== null) {
      // ── node ブランチ ────────────────────────────────────────
      // rawFields を先に更新し、guard + persona を通して fields を再計算する。
      // rawFields を更新しないと persona 切替時に reapplyPersonaToAllBlocks が
      // 古い rawFields から再計算して手動編集内容を上書きしてしまう。
      //
      // block.guard が未設定（pending ノード）の場合はフォールバック:
      //   fields のみ更新し rawFields は変更しない（persona 適用前のシナリオ未確定状態）。
      setComposeNodes(prev => prev.map(n => {
        if (n.id !== nodeId) return n
        const updatedRaw = { ...(n.block.rawFields ?? n.block.fields), [key]: value }
        const updatedFields = (n.block.guard && personaEnabledRef.current)
          ? applyPersonaToFieldsWithGuard(updatedRaw, true, selectedPersonaRef.current, n.block.guard)
          : updatedRaw
        return {
          ...n,
          block: {
            ...n.block,
            rawFields: updatedRaw,
            fields: updatedFields,
          },
        }
      }))
    } else {
      // ── primary ブランチ ─────────────────────────────────────
      // rawPrimaryFieldsRef も同時に更新する。
      // persona 切替時に reapplyPersonaToAllBlocks が rawPrimaryFieldsRef から再計算するため、
      // ここで更新しないと手動編集内容が persona 切替後に上書きされて消える。
      const updatedRaw = { ...rawPrimaryFieldsRef.current, [key]: value }
      rawPrimaryFieldsRef.current = updatedRaw
      setPrimaryBaseFields({ ...updatedRaw })
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleAddonToggle
  //
  //   node    → ノードの block を addon 込みで再構築（composeNodes を書き換え）
  //   primary → primaryBaseFields を addon 込みで再計算
  // ─────────────────────────────────────────────────────────────

  const handleAddonToggle = useCallback((addonKey: string, _text: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev)
      next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)
      const newAddonIds = [...next]
      const nodeId = editingNodeIdRef.current

      if (nodeId !== null) {
        // ── node ブランチ ────────────────────────────────────
        const nodes = composeNodesRef.current
        const node = nodes.find(n => n.id === nodeId)
        if (node) {
          const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
          const sc = mod.scenarios.find(s => s.globalId === node.scenarioId)
          if (sc) {
            // node.resolvedDrugName を渡して {{drug_subject}} を再解決
            const { fields: rawFields, closingText, groupKey, clinicalDomain, closingBehavior } = buildNodeFields(sc, mod, newAddonIds, node.resolvedDrugName ?? '')
            const guard = derivePersonaGuard(sc, mod.template?.urgentFlag)
            const fields = personaEnabled
              ? applyPersonaToFieldsWithGuard(rawFields, true, selectedPersona, guard)
              : rawFields
            const domain = resolveDomain(mod)
            setComposeNodes(nodes.map(n =>
              n.id !== nodeId ? n : {
                ...n,
                block: { ...n.block, fields, rawFields, guard, closingText, domain, groupKey, clinicalDomain, closingBehavior },
                selectedAddonIds: newAddonIds,
                baseLabel: sc.title,
                baseDomain: domain,
              },
            ))
          }
        }
      } else {
        // ── primary ブランチ ─────────────────────────────────
        // buildNodeFields に一元化（addon + followup + {{drug_subject}} 解決を同一コードパスで処理）
        setPrimaryAddonIds(next)
        const sc = primaryScenarioRef.current
        if (sc) {
          const primaryDrugName = activeBrandName
            ?? activeModuleData.drug?.brandNames?.[0]
            ?? activeModuleData.drug?.genericName
            ?? ''
          const { fields: rawFields } = buildNodeFields(sc, activeModuleData, newAddonIds, primaryDrugName)
          const guard = derivePersonaGuard(sc, activeModuleData.template?.urgentFlag)
          rawPrimaryFieldsRef.current = rawFields
          primaryGuardRef.current = guard
          const fields = personaEnabled
            ? applyPersonaToFieldsWithGuard(rawFields, true, selectedPersona, guard)
            : rawFields
          setPrimaryBaseFields(fields)
        }
      }
      return next
    })
  }, [activeModuleData, activeBrandName, allModules, moduleData, personaEnabled, selectedPersona])

  // ─────────────────────────────────────────────────────────────
  // handleSToggle（S先頭文トグル）
  //
  // ノード編集中は1剤目の S を変更しない（ノード側に S トグルは現時点では非対応）
  // ─────────────────────────────────────────────────────────────

  const handleSToggle = useCallback((relation: SRelation, condition: SCondition) => {
    if (editingNodeIdRef.current !== null) return
    setSRelation(relation)
    setSCondition(condition)
    const newFirst = buildSFirstSentence(relation, condition)
    const updated = replaceSFirstSentence(displayFields.S, newFirst)
    setPrimaryBaseFields(prev => ({ ...prev, S: updated }))
  }, [displayFields.S])

  // ─────────────────────────────────────────────────────────────
  // handleFlagChange（単剤フラグ: 副作用なし / CP良好）
  //
  // フラグ行を S 末尾に追加/除去する。
  // 単剤時のみ呼ばれるため多剤チェックは不要。
  // フラグ行は buildS が observation として処理し、
  // OBS_PREFIX 付きの observation バケットには入らないため
  // 「副作用は認めない。」「コンプライアンス良好。」は other に分類される。
  // ─────────────────────────────────────────────────────────────

  const handleFlagChange = useCallback((flags: SingleDrugFlags) => {
    setSingleDrugFlags(flags)
    setPrimaryBaseFields(prev => {
      // 現在のフラグ行を除去してから再挿入する
      const FLAG_LINES = ['副作用は認めない。', 'コンプライアンス良好。']
      const baseLines = prev.S
        .split('\n')
        .filter(l => !FLAG_LINES.includes(l.trim()))
      if (flags.noSideEffect)    baseLines.push('副作用は認めない。')
      if (flags.goodCompliance)  baseLines.push('コンプライアンス良好。')
      return { ...prev, S: baseLines.join('\n') }
    })
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleSubcategorySelect
  // ─────────────────────────────────────────────────────────────

  const handleSubcategorySelect = useCallback((label: string) => {
    setComposeSearch(label)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // NLP モード
  // ─────────────────────────────────────────────────────────────

  const handleSwitchToNlp = useCallback(() => {
    setUiMode('nlp')
    setSelectedScenarioId(null)
    setPrimaryBaseFields(EMPTY_FIELDS)
    setPrimaryAddonIds(new Set())
    setSelectedAddonIds(new Set())
    setSelectedGroup(null)
    setSRelation('continued_do')
    setSCondition('stable')
    setComposeNodes([])
    setEditingNodeId(null)
    setEditingPrimary(false)
    setNlpValidation(null)
    setNlpSelectorReason('')
    setNlpConfidence(0)
  }, [])

  const handleSwitchToManual = useCallback(() => {
    setUiMode('manual')
    setNlpValidation(null)
    setNlpSelectorReason('')
    setNlpConfidence(0)
  }, [])

  const handleNlpGenerate = useCallback((patientInput: string) => {
    setNlpIsGenerating(true)
    const result = createSoapFromInput(activeModuleData, patientInput)
    setNlpValidation(result.validation)
    setNlpSelectorReason(result.selectorReason)
    setNlpConfidence(result.confidence)
    if (result.soap) {
      // NLP 結果を primaryBaseFields に直接セット。
      // uiModeRef.current === 'nlp' のため、後続の selectedScenarioId 変化による
      // useEffect は rawFields/primaryBaseFields を上書きしない（uiModeRef ガード済み）。
      const nlpFields: SoapFields = {
        S: result.soap.S, O: result.soap.O, A: result.soap.A, P: result.soap.P,
      }
      // guard 生成: result.scenarioId から scenario を特定できるときはその guard を使う。
      // NLP の SOAP テキストは soapComposer 由来（buildNodeFields とは別経路）なので、
      // rawFields = nlpFields（NLP生成テキストそのもの）とし、
      // guard はシナリオの importance / intentTags から安全側に派生させる。
      // scenario が特定できない場合は guard を null にして reapplyPersonaToAllBlocks を抑制する。
      const sc = result.scenarioId
        ? activeModuleData.scenarios.find(s => s.globalId === result.scenarioId)
        : undefined
      const guard = sc
        ? derivePersonaGuard(sc, activeModuleData.template?.urgentFlag)
        : null
      rawPrimaryFieldsRef.current = nlpFields
      primaryGuardRef.current = guard
      // persona が ON かつ guard がある場合は変換済みフィールドを表示する
      const displayableFields = (personaEnabledRef.current && guard)
        ? applyPersonaToFieldsWithGuard(nlpFields, true, selectedPersonaRef.current, guard)
        : nlpFields
      setPrimaryBaseFields(displayableFields)
      if (result.scenarioId) {
        setSelectedScenarioId(result.scenarioId)
        if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
      }
    } else {
      rawPrimaryFieldsRef.current = EMPTY_FIELDS
      primaryGuardRef.current = null
      setPrimaryBaseFields(EMPTY_FIELDS)
      setSelectedScenarioId(null)
    }
    setNlpIsGenerating(false)
  }, [activeModuleData])

  // ─────────────────────────────────────────────────────────────
  // reapplyPersonaToAllBlocks
  //
  // persona ON/OFF 切替・persona 変更時に全ブロックを再変換する。
  // 1剤目: rawPrimaryFieldsRef + primaryGuardRef から再計算して setPrimaryBaseFields
  // 2剤目以降: node.block.rawFields + node.block.guard から再計算して setComposeNodes
  //
  // nextEnabled / nextPersona: 変更後の値（setState の前に呼ぶため引数で受け取る）
  // ─────────────────────────────────────────────────────────────

  const reapplyPersonaToAllBlocks = useCallback((nextEnabled: boolean, nextPersona: PersonaId) => {
    // 1剤目の再計算
    const rawPrimary = rawPrimaryFieldsRef.current
    const primaryGuard = primaryGuardRef.current
    if (primaryGuard) {
      const fields = nextEnabled
        ? applyPersonaToFieldsWithGuard(rawPrimary, true, nextPersona, primaryGuard)
        : rawPrimary
      setPrimaryBaseFields(fields)
    }
    // 2剤目以降: rawFields / guard がある block のみ再計算
    setComposeNodes(prev => prev.map(node => {
      if (!node.block.rawFields || !node.block.guard) return node
      return {
        ...node,
        block: {
          ...node.block,
          fields: nextEnabled
            ? applyPersonaToFieldsWithGuard(node.block.rawFields, true, nextPersona, node.block.guard)
            : node.block.rawFields,
        },
      }
    }))
  }, [])

  // ── 自然言語ボタン表示フラグ（false = 非表示。将来の復活用定数） ──
  const showNlpButton = false

  // ══════════════════════════════════════════════════════════════
  // 表示条件（derived）
  // ══════════════════════════════════════════════════════════════

  // ThirdPanel（合成窓・Sボタン）: シナリオ確定後のみ有効
  const thirdPanelEnabled = currentScenarioId !== null && currentScenarioId !== ''

  // 単剤モード: 1剤目が確定済みかつ composeNodes が空
  // composeNodes は pending 含む全ての2剤目以降ノードを保持するため、
  // length === 0 で「薬剤が1剤のみ」を判定する
  const isSingleDrug = selectedScenarioId !== null && composeNodes.length === 0

  // SOAPエディター: 1剤目確定 or 確定済みノードあり（pending のみは不可）
  const hasValidComposeNodes = composeNodes.some(n => n.scenarioId !== '' && n.scenarioId != null)
  const showSoapEditor = selectedScenarioId !== null || hasValidComposeNodes

  // ══════════════════════════════════════════════════════════════
  // JSX
  // ══════════════════════════════════════════════════════════════

  return (
    <div className={s.layout}>
      <Topbar
        title="SOAP Engine"
        badge={badge}
        activeDrugLabel={drugSelected ? activeDrugLabel : undefined}
        searchValue={mainSearch}
        onSearchChange={setMainSearch}
        drugSuggestions={mainDrugSuggestions}
        onSelectDrugSuggestion={handleSelectDrugSuggestion}
        routeFilter={routeFilter}
        onRouteFilterChange={setRouteFilter}
        personaEnabled={personaEnabled}
        onPersonaToggle={() => {
          const nextEnabled = !personaEnabled
          setPersonaEnabled(nextEnabled)
          reapplyPersonaToAllBlocks(nextEnabled, selectedPersona)
        }}
        onPersonaSettingsOpen={() => setPersonaModalOpen(true)}
      />

      <div className={s.body}>
        <Sidebar
          availableGroups={drugSelected ? availableGroups : new Set()}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
          selectedNodeId={editingNodeId}
          onDeselectNode={() => {
            setEditingNodeId(null)
            setEditingPrimary(false)
            setSelectedAddonIds(primaryAddonIds)
            if (primaryScenario) setSelectedGroup(getMenuGroupFromScenario(primaryScenario))
          }}
        />

        <div className={s.secondaryCol}>
          {uiMode === 'manual' && (
            <>
              {selectedGroup !== null && groupScenarios.length > 0 ? (
                <>
                  <TemplateListPanel
                    key={`${editingNodeId ?? 'main'}-${selectedGroup}`}
                    group={selectedGroup}
                    scenarios={groupScenarios}
                    selectedScenarioId={currentScenarioId}
                    onSelectScenario={handleSelectScenario}
                  />
                  {currentScenarioId !== null && targetModule.addons && addonVisibleKeys.length > 0 && (
                    <AddonPanel
                      addons={targetModule.addons}
                      selectedAddonIds={selectedAddonIds}
                      onToggle={handleAddonToggle}
                      visibleKeys={addonVisibleKeys}
                    />
                  )}
                </>
              ) : (
                <div className={s.secondaryEmpty} aria-hidden="true" />
              )}
            </>
          )}

          {uiMode === 'nlp' && <div className={s.secondaryEmpty} aria-hidden="true" />}
        </div>

        {uiMode === 'manual' ? (
          <ThirdPanel
            selectedGroup={selectedGroup}
            thirdPanelEnabled={thirdPanelEnabled}
            isSingleDrug={isSingleDrug}
            currentSRelation={sRelation}
            currentSCondition={sCondition}
            onSAction={handleSToggle}
            singleDrugFlags={singleDrugFlags}
            onFlagChange={handleFlagChange}
            composeSearchValue={composeSearch}
            onComposeSearchChange={setComposeSearch}
            composeDrugSuggestions={composeDrugSuggestions}
            onSelectComposeDrug={handleComposeDrugSelect}
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

        <div className={s.editorCol}>
          {showSoapEditor ? (
            <SoapEditor
              fields={finalFields}
              onChange={handleFieldChange}
              nodeBarSlot={
                <ComposeNodeBar
                  nodes={composeNodes}
                  selectedNodeId={editingNodeId}
                  editingPrimary={editingPrimary}
                  onSelectNode={handleSelectNode}
                  onSelectPrimary={handleSelectPrimaryNode}
                  onRemove={handleRemoveComposeNode}
                  onReset={handleResetCompose}
                  baseDrugLabel={resolveNodeLabel(activeModuleData)}
                  pendingNodeIds={pendingNodeIds}
                />
              }
            />
          ) : (
            <div className={s.editorGuide}>
              <div className={s.editorGuideInner}>
                <p className={s.editorGuideTitle}>SOAPノートの作成</p>
                <ol className={s.editorGuideSteps}>
                  <li>トップバーの検索窓で薬剤を選択</li>
                  <li>左のカテゴリメニューでグループを選択</li>
                  <li>中央のテンプレート一覧からシナリオを選択</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ペルソナ設定モーダル ── */}
      {personaModalOpen && (
        <div
          className={s.personaModalOverlay}
          onClick={() => setPersonaModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ペルソナ設定"
        >
          <div className={s.personaModal} onClick={e => e.stopPropagation()}>
            <h2 className={s.personaModalTitle}>ペルソナ設定</h2>
            {(Object.keys(PERSONA_LABELS) as PersonaId[]).map(p => (
              <label key={p} className={s.personaModalOption}>
                <input
                  type="radio"
                  name="persona"
                  value={p}
                  checked={selectedPersona === p}
                  onChange={() => {
                    setSelectedPersona(p)
                    reapplyPersonaToAllBlocks(personaEnabled, p)
                  }}
                />
                {PERSONA_LABELS[p]}
              </label>
            ))}
            <button
              className={s.personaModalClose}
              onClick={() => setPersonaModalOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
