'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock, ComposeNode } from '../../lib/types'
import { TAG_TO_GENERIC_NAME } from '../../lib/types'
import { buildSoapFromScenario, buildNodeFields, mergeBlocks } from '../../lib/buildSoap'
import { buildSearchIndex, getDrugSuggestions, normalizeText } from '../../lib/search'
import type { DrugSuggestionItem } from '../../lib/search'
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
// followup closing テキストを解決するユーティリティ
// ─────────────────────────────────────────────────────────────

function resolveClosingText(
  scenario: { followupRef?: string; followup?: Record<string, unknown> },
  defaults?: ModuleData['defaults'],
): string | undefined {
  if (scenario.followupRef) {
    return (defaults?.followupProfiles?.[scenario.followupRef] as Record<string, string> | undefined)?.P ?? undefined
  }
  const followupVal = (scenario.followup as Record<string, string> | undefined)?.P
  if (followupVal === 'default') {
    return (defaults?.followup as Record<string, string> | undefined)?.P ?? undefined
  }
  return undefined
}

// ─────────────────────────────────────────────────────────────
// DashboardClient
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ moduleData, allModules }: DashboardClientProps) {
  const searchIndex = useMemo(
    () => allModules.flatMap(m => buildSearchIndex(m)),
    [allModules],
  )

  const [activeModuleData, setActiveModuleData] = useState<ModuleData>(moduleData)
  const [activeBrandName, setActiveBrandName] = useState<string | undefined>(undefined)

  // 薬剤選択済みフラグ。初期は false: 何も選択していない状態からスタート。
  const [drugSelected, setDrugSelected] = useState(false)

  const [mainSearch, setMainSearch] = useState('')
  const [composeSearch, setComposeSearch] = useState('')

  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)

  // ── 1剤目専用 state ─────────────────────────────────────────
  // selectedScenarioId: 1剤目のシナリオID。ノード操作では絶対に書き換えない。
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  // primaryBaseFields: 1剤目の確定SOAP。ノード操作では絶対に書き換えない。
  const [primaryBaseFields, setPrimaryBaseFields] = useState<SoapFields>(EMPTY_FIELDS)
  // primarySelectedAddonIds: 1剤目のaddon選択状態。ノード操作では書き換えない。
  const [primarySelectedAddonIds, setPrimarySelectedAddonIds] = useState<Set<string>>(new Set())
  // ────────────────────────────────────────────────────────────

  // manualFields: 最終表示結果のみ。1剤目/ノード問わず「表示すべき完成SOAP」を入れる。
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})
  const [sPrefix, setSPrefix] = useState<SPrefix>('none')
  const [sStatus, setSStatus] = useState<SStatus>('stable')
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  const [composeNodes, setComposeNodes] = useState<ComposeNode[]>([])
  // editingNodeId: 現在編集/選択中のノードID。null = 1剤目操作中。
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // nodeId → true: 薬剤だけ追加されてシナリオが未確定のノード
  const [pendingNodeIds, setPendingNodeIds] = useState<Set<string>>(new Set())

  // ── Refs（stale closure 防止） ────────────────────────────
  const primaryBaseFieldsRef = useRef<SoapFields>(EMPTY_FIELDS)
  const primarySelectedAddonIdsRef = useRef<Set<string>>(new Set())
  const editingNodeIdRef = useRef<string | null>(null)
  const composeNodesRef = useRef<ComposeNode[]>([])
  // 1剤目シナリオの ref（mergeBlocks の currentLabel/currentClosing 用のみ）
  const primaryScenarioRef = useRef<ReturnType<typeof activeModuleData.scenarios.find>>(undefined)
  // selectedAddonIds の最新値を常時保持
  const selectedAddonIdsRef = useRef<Set<string>>(new Set())
  // レンダリング時の実表示値を常時保持（ノード追加時のスナップショット用）
  const fieldsRef = useRef<SoapFields>({ S: '', O: '', A: '', P: '' })

  const [uiMode, setUiMode] = useState<UiMode>('manual')
  const [nlpValidation, setNlpValidation] = useState<ValidationResult | null>(null)
  const [nlpSelectorReason, setNlpSelectorReason] = useState('')
  const [nlpConfidence, setNlpConfidence] = useState(0)
  const [nlpIsGenerating, setNlpIsGenerating] = useState(false)

  // 1剤目シナリオ（activeModuleData × selectedScenarioId で解決）
  // selectedScenarioId は 1剤目専用なので、これは常に1剤目のシナリオを指す
  const primaryScenario = activeModuleData.scenarios.find(
    sc => sc.globalId === selectedScenarioId,
  )

  // 1剤目の computedFields（followup込み）。1剤目操作時のベース計算に使う。
  // ノード編集中は直接使わず、primaryBaseFields を参照すること。
  const primaryComputedFields: SoapFields = useMemo(() => {
    if (!primaryScenario) return EMPTY_FIELDS
    const base = buildSoapFromScenario(primaryScenario)
    const result = { ...base }
    for (const key of ['S', 'P'] as const) {
      let appendText: string | null | undefined = undefined
      const followupRef = primaryScenario.followupRef
      if (followupRef) {
        const profile = activeModuleData.defaults?.followupProfiles?.[followupRef]
        if (profile) appendText = (profile as Record<string, string | null>)[key]
      } else {
        const followupVal = (primaryScenario.followup as Record<string, string> | undefined)?.[key]
        if (followupVal === 'default') {
          appendText = (activeModuleData.defaults?.followup as Record<string, string> | undefined)?.[key]
        }
      }
      if (appendText) {
        result[key] = result[key] ? `${result[key]}\n${appendText}` : appendText
      }
    }
    return result
  }, [primaryScenario, activeModuleData.defaults])

  // Refs を同期（render ごと）
  editingNodeIdRef.current = editingNodeId
  composeNodesRef.current = composeNodes
  primaryScenarioRef.current = primaryScenario
  primaryBaseFieldsRef.current = primaryBaseFields
  primarySelectedAddonIdsRef.current = primarySelectedAddonIds
  selectedAddonIdsRef.current = selectedAddonIds

  // ── 表示フィールド ──────────────────────────────────────────
  // manualFields が優先。未設定の場合は 1剤目の computedFields にフォールバック。
  // ただしノード編集中・合成中は manualFields に完成SOAPが入っているはずなので
  // computedFields のフォールバックに依存しない（依存すると1剤目Sが汚染される）。
  const fields: SoapFields = {
    S: manualFields.S ?? primaryComputedFields.S,
    O: manualFields.O ?? primaryComputedFields.O,
    A: manualFields.A ?? primaryComputedFields.A,
    P: manualFields.P ?? primaryComputedFields.P,
  }
  fieldsRef.current = fields

  // ── S prefix/status リセット（グループ変更時） ──────────────
  useEffect(() => {
    if (selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)) {
      setSPrefix('none')
      setSStatus('stable')
    }
  }, [selectedGroup])

  // ── 1剤目 primaryBaseFields の同期 ──────────────────────────
  // selectedScenarioId（1剤目専用）が変わったとき、かつ 1剤目操作中のみ更新する。
  // ノード操作中（editingNodeId !== null）は絶対に触らない。
  useEffect(() => {
    if (editingNodeId !== null) return  // ノード操作中: 完全スキップ
    if (selectedScenarioId !== null) {
      setPrimaryBaseFields(primaryComputedFields)
    } else {
      setPrimaryBaseFields(EMPTY_FIELDS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenarioId, editingNodeId])
  // ↑ primaryComputedFields は依存に入れない。
  //   selectedScenarioId が変わったタイミングでのみ同期すれば十分。
  //   deps に入れると addon/followup 変更のたびに primaryBaseFields が再計算されて
  //   ノード操作に割り込むリスクがある。
  //   addon 変更後の primaryBaseFields 更新は handleAddonToggle の1剤目ブランチで行う。

  // ── targetModule: ノード編集中はノードのモジュール、1剤目操作中は activeModuleData ──
  const targetModule = useMemo<ModuleData>(() => {
    if (editingNodeId === null) return activeModuleData
    const node = composeNodes.find(n => n.id === editingNodeId)
    if (!node) return activeModuleData
    return allModules.find(m => m.moduleId === node.moduleId) ?? activeModuleData
  }, [editingNodeId, composeNodes, activeModuleData, allModules])

  // ノード編集中はノード固有のシナリオを参照する（1剤目シナリオを使わない）
  const addonTargetScenario = useMemo(() => {
    if (editingNodeId === null) return primaryScenario
    const node = composeNodes.find(n => n.id === editingNodeId)
    if (!node?.scenarioId) return undefined
    return targetModule.scenarios.find(sc => sc.globalId === node.scenarioId)
  }, [editingNodeId, composeNodes, targetModule, primaryScenario])

  const addonVisibleKeys = useMemo(
    () => getVisibleAddonKeys(targetModule.addons, addonTargetScenario),
    [targetModule.addons, addonTargetScenario],
  )

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

  // 薬剤専用サジェスト（シナリオを除く）
  const mainDrugSuggestions = useMemo<DrugSuggestionItem[]>(
    () => getDrugSuggestions(mainSearch, searchIndex),
    [mainSearch, searchIndex],
  )
  const composeDrugSuggestions = useMemo<DrugSuggestionItem[]>(
    () => getDrugSuggestions(composeSearch, searchIndex),
    [composeSearch, searchIndex],
  )

  const badge = activeModuleData.categoryPath?.[1]

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

  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // rebuildNodeBlock
  // 対象ノードだけを再構築する。他ノード・1剤目 state は一切触らない。
  // ─────────────────────────────────────────────────────────────
  const rebuildNodeBlock = useCallback((
    nodeId: string,
    newScenarioId: string,
    nodes: ComposeNode[],
    /** 1剤目の確定SOAP（mergeBlocks のベース）。primaryBaseFieldsRef.current を渡す。 */
    primaryFields: SoapFields,
    /** 1剤目のシナリオタイトル（mergeBlocks の currentLabel 用）。1剤目専用。 */
    primaryLabel: string,
    /** 1剤目の closing テキスト（mergeBlocks の currentClosingText 用）。1剤目専用。 */
    primaryClosing: string | undefined,
    addonIds: string[] = [],
  ): { updatedNodes: ComposeNode[]; mergedFields: SoapFields } => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return { updatedNodes: nodes, mergedFields: primaryFields }
    const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
    const sc = mod.scenarios.find(s => s.globalId === newScenarioId)
    if (!sc) return { updatedNodes: nodes, mergedFields: primaryFields }

    // buildNodeFields: シナリオ + followup + addon を一括解決
    const { fields: result, closingText } = buildNodeFields(sc, mod, addonIds)

    // domain: composition.domain → categoryPath[1] → categoryPath[0] → moduleId の優先順
    const domain = mod.composition?.domain
      ?? mod.categoryPath?.[1]
      ?? mod.categoryPath?.[0]
      ?? mod.moduleId

    const newBlock: MergedBlock = {
      id: node.block.id,
      templateLabel: sc.title,
      fields: result,
      symptomCodes: sc.sComposition?.symptomCodes,
      closingText,
      domain,
    }
    // 対象ノードだけ更新。他ノードは一切変更しない。
    const updatedNodes = nodes.map(n =>
      n.id === nodeId
        ? {
            ...n,
            scenarioId: newScenarioId,
            block: newBlock,
            selectedAddonIds: addonIds,
            baseLabel: sc.title,
            baseDomain: domain,
          }
        : n,
    )
    const mergedFields = mergeBlocks(
      updatedNodes.map(n => n.block), primaryFields, primaryLabel, primaryClosing,
    )
    return { updatedNodes, mergedFields }
  }, [allModules, moduleData])

  // ─────────────────────────────────────────────────────────────
  // handleSelectScenario
  // ─────────────────────────────────────────────────────────────
  const handleSelectScenario = useCallback((id: string) => {
    const nodeId = editingNodeIdRef.current

    if (nodeId !== null) {
      // ── ノード（2剤目以降）シナリオ確定 / 再編集 ────────
      // 1剤目の state（selectedScenarioId / primaryBaseFields）は絶対に触らない。
      const primarySc = primaryScenarioRef.current   // 1剤目シナリオ（currentLabel 用のみ）
      const primaryFields = primaryBaseFieldsRef.current
      const primaryClosing = primarySc ? resolveClosingText(primarySc, activeModuleData.defaults) : undefined
      const primaryLabel = primarySc?.title ?? ''
      // 確定時点の addon スナップショット
      const currentAddonIds = [...selectedAddonIdsRef.current]

      // シナリオ確定 → pending から外す
      setPendingNodeIds(prev => {
        const next = new Set(prev)
        next.delete(nodeId)
        return next
      })

      setComposeNodes(prev => {
        const { updatedNodes, mergedFields } = rebuildNodeBlock(
          nodeId, id, prev, primaryFields, primaryLabel, primaryClosing, currentAddonIds,
        )
        setManualFields({ S: mergedFields.S, O: mergedFields.O, A: mergedFields.A, P: mergedFields.P })
        return updatedNodes
      })

      // selectedScenarioId は 1剤目専用: ノードのシナリオ確定では変更しない
      return
    }

    // ── 1剤目シナリオ確定 ─────────────────────────────────
    setSelectedScenarioId(prev => {
      if (prev === id) {
        // 同じシナリオを再タップ → 解除
        setManualFields({})
        setSPrefix('none')
        setSStatus('stable')
        setSelectedAddonIds(new Set())
        setPrimarySelectedAddonIds(new Set())
        setPrimaryBaseFields(EMPTY_FIELDS)
        return null
      }
      const sc = activeModuleData.scenarios.find(s => s.globalId === id)
      if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
      setManualFields({})
      setSPrefix('none')
      setSStatus('stable')
      setSelectedAddonIds(new Set())
      setPrimarySelectedAddonIds(new Set())
      return id
    })
  }, [activeModuleData, rebuildNodeBlock])

  // ── メイン検索: 薬剤選択のみ ──────────────────────────────
  void normalizeText
  const handleSelectDrugSuggestion = useCallback((item: DrugSuggestionItem) => {
    const targetMod = allModules.find(m => m.moduleId === item.moduleId) ?? moduleData
    setActiveModuleData(targetMod)
    setActiveBrandName(item.matchedBrandName)
    setDrugSelected(true)
    setSelectedScenarioId(null)
    setSelectedGroup(null)
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
    setSelectedAddonIds(new Set())
    setPrimarySelectedAddonIds(new Set())
    setPrimaryBaseFields(EMPTY_FIELDS)
    setMainSearch('')
    setComposeNodes([])
    setEditingNodeId(null)
    setPendingNodeIds(new Set())
  }, [allModules, moduleData])

  // ── 合成検索: 薬剤選択のみ → ノード追加（シナリオ未確定） ──
  const handleComposeDrugSelect = useCallback((item: DrugSuggestionItem) => {
    const targetMod = allModules.find(m => m.moduleId === item.moduleId) ?? moduleData

    const dummyBlock: MergedBlock = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      templateLabel: '',
      fields: EMPTY_FIELDS,
      closingText: undefined,
    }
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const drugLabel = resolveNodeLabel(targetMod)

    const newNode: ComposeNode = {
      id: nodeId,
      moduleId: targetMod.moduleId,
      scenarioId: '',
      block: dummyBlock,
      drugLabel,
      selectedAddonIds: [],
      baseLabel: '',
      baseDomain: targetMod.composition?.domain
        ?? targetMod.categoryPath?.[1]
        ?? targetMod.categoryPath?.[0]
        ?? targetMod.moduleId,
    }

    // 現在の実表示値を丸コピー固定（ノード追加後にSOAPが消えないように）
    const snapshot = fieldsRef.current
    setManualFields({
      S: snapshot.S,
      O: snapshot.O,
      A: snapshot.A,
      P: snapshot.P,
    })

    setComposeNodes(prev => [...prev, newNode])
    setPendingNodeIds(prev => new Set([...prev, nodeId]))
    setEditingNodeId(nodeId)
    // group は未選択のまま（左メニューを押すまで何も出さない）
    setSelectedGroup(null)
    // selectedScenarioId は 1剤目専用: ノード追加では変更しない
    // 新ノードの addon 状態は空からスタート
    setSelectedAddonIds(new Set())

    setComposeSearch('')
  }, [allModules, moduleData])

  // ─────────────────────────────────────────────────────────────
  // handleSelectNode
  // ─────────────────────────────────────────────────────────────
  const handleSelectNode = useCallback((nodeId: string) => {
    const currentNodeId = editingNodeIdRef.current
    const currentNodes = composeNodesRef.current

    if (currentNodeId === nodeId) {
      // 同じノードを再クリック → 選択解除（1剤目操作モードに戻る）
      setEditingNodeId(null)
      setSelectedGroup(null)
      // 1剤目の addon 選択状態を復元
      setSelectedAddonIds(primarySelectedAddonIdsRef.current)
      // SOAPを全ノード再合成で復元（1剤目 + 全確定ノード）
      const primaryFields = primaryBaseFieldsRef.current
      const primarySc = primaryScenarioRef.current
      const primaryLabel = primarySc?.title ?? ''
      const primaryClosing = primarySc ? resolveClosingText(primarySc, activeModuleData.defaults) : undefined
      const confirmedNodes = currentNodes.filter(n => n.scenarioId)
      if (confirmedNodes.length > 0) {
        const merged = mergeBlocks(
          confirmedNodes.map(n => n.block), primaryFields, primaryLabel, primaryClosing,
        )
        setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
      } else {
        setManualFields({ S: primaryFields.S, O: primaryFields.O, A: primaryFields.A, P: primaryFields.P })
      }
      // selectedScenarioId は 1剤目専用: 変更しない
      return
    }

    const node = currentNodes.find(n => n.id === nodeId)
    if (!node) return

    // ノード選択 → 編集モードへ
    setEditingNodeId(nodeId)
    setSelectedGroup(null)

    if (node.scenarioId) {
      // 確定済みノード: SOAPを再合成で復元
      const primaryFields = primaryBaseFieldsRef.current
      const primarySc = primaryScenarioRef.current
      const primaryLabel = primarySc?.title ?? ''
      const primaryClosing = primarySc ? resolveClosingText(primarySc, activeModuleData.defaults) : undefined
      const confirmedNodes = currentNodes.filter(n => n.scenarioId)
      if (confirmedNodes.length > 0) {
        const merged = mergeBlocks(
          confirmedNodes.map(n => n.block), primaryFields, primaryLabel, primaryClosing,
        )
        setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
      }
      // selectedScenarioId は 1剤目専用: 変更しない
      setSelectedAddonIds(new Set(node.selectedAddonIds ?? []))
    } else {
      // pending ノード: シナリオ未確定
      // selectedScenarioId は 1剤目専用: 変更しない
      setSelectedAddonIds(new Set())
    }
  }, [activeModuleData.defaults])

  const handleRemoveComposeNode = useCallback((nodeId: string) => {
    const currentNodeId = editingNodeIdRef.current
    const primarySc = primaryScenarioRef.current
    const primaryFields = primaryBaseFieldsRef.current

    if (currentNodeId === nodeId) {
      setEditingNodeId(null)
      setSelectedAddonIds(primarySelectedAddonIdsRef.current)
      if (primarySc) setSelectedGroup(getMenuGroupFromScenario(primarySc))
    }
    setPendingNodeIds(prev => {
      const next = new Set(prev)
      next.delete(nodeId)
      return next
    })
    setComposeNodes(prev => {
      const updated = prev.filter(n => n.id !== nodeId)
      if (updated.length === 0) {
        // 全ノード削除 → 1剤目のSOAPに戻す
        setManualFields({ S: primaryFields.S, O: primaryFields.O, A: primaryFields.A, P: primaryFields.P })
        return updated
      }
      const primaryClosing = primarySc
        ? resolveClosingText(primarySc, activeModuleData.defaults) : undefined
      const merged = mergeBlocks(
        updated.map(n => n.block), primaryFields, primarySc?.title ?? '', primaryClosing,
      )
      setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
      return updated
    })
  }, [activeModuleData.defaults])

  const handleResetCompose = useCallback(() => {
    setComposeNodes([])
    setEditingNodeId(null)
    setPendingNodeIds(new Set())
    // リセット後は 1剤目のSOAPに戻す
    const primaryFields = primaryBaseFieldsRef.current
    setManualFields({ S: primaryFields.S, O: primaryFields.O, A: primaryFields.A, P: primaryFields.P })
  }, [])

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    setManualFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubcategorySelect = useCallback((label: string) => {
    setComposeSearch(label)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleAddonToggle
  // ─────────────────────────────────────────────────────────────
  const handleAddonToggle = useCallback((addonKey: string, _text: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev)
      if (next.has(addonKey)) { next.delete(addonKey) } else { next.add(addonKey) }
      const newAddonIds = [...next]

      const nodeId = editingNodeIdRef.current

      if (nodeId !== null) {
        // ── ノード編集中: ノードの block を再構成して全体 merge ──────────
        // 1剤目 state（selectedScenarioRef / computedFieldsWithFollowup 等）は一切使わない。
        // ノードのシナリオ・モジュールから直接解決する。
        const currentNodes = composeNodesRef.current
        const node = currentNodes.find(n => n.id === nodeId)
        if (node) {
          const nodeMod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
          const nodeSc = nodeMod.scenarios.find(s => s.globalId === node.scenarioId)
          if (nodeSc) {
            const { fields: newFields, closingText } = buildNodeFields(nodeSc, nodeMod, newAddonIds)
            const domain = nodeMod.composition?.domain
              ?? nodeMod.categoryPath?.[1]
              ?? nodeMod.categoryPath?.[0]
              ?? nodeMod.moduleId
            const newBlock: MergedBlock = {
              ...node.block,
              fields: newFields,
              closingText,
              domain,
            }
            const updatedNodes = currentNodes.map(n =>
              n.id === nodeId
                ? { ...n, block: newBlock, selectedAddonIds: newAddonIds, baseLabel: nodeSc.title, baseDomain: domain }
                : n,
            )
            // 1剤目文脈は primaryBaseFieldsRef / primaryScenarioRef から取得
            const primaryFields = primaryBaseFieldsRef.current
            const primarySc = primaryScenarioRef.current
            const primaryLabel = primarySc?.title ?? ''
            const primaryClosing = primarySc ? resolveClosingText(primarySc, activeModuleData.defaults) : undefined
            const confirmedNodes = updatedNodes.filter(n => n.scenarioId)
            const merged = mergeBlocks(
              confirmedNodes.map(n => n.block), primaryFields, primaryLabel, primaryClosing,
            )
            setComposeNodes(updatedNodes)
            setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
          }
        }
      } else {
        // ── 1剤目操作中 ──────────────────────────────────────────────────
        // addon 変更を primarySelectedAddonIds にも反映（ノード解除時の復元用）
        setPrimarySelectedAddonIds(next)
        const sc = primaryScenarioRef.current
        if (activeModuleData.addons && sc) {
          const sectionAddonMap = new Map<string, string[]>()
          for (const key of next) {
            const item = activeModuleData.addons.items[key]
            if (!item) continue
            const sec = item.targetSection
            if (!sectionAddonMap.has(sec)) sectionAddonMap.set(sec, [])
            sectionAddonMap.get(sec)!.push(item.text)
          }
          const resolveFollowupTextLocal = (sec: 'S' | 'P'): string => {
            const followupRef = sc.followupRef
            if (followupRef) {
              return (activeModuleData.defaults?.followupProfiles?.[followupRef] as Record<string, string> | undefined)?.[sec] ?? ''
            }
            const followupVal = (sc.followup as Record<string, string> | undefined)?.[sec]
            return followupVal === 'default'
              ? ((activeModuleData.defaults?.followup as Record<string, string> | undefined)?.[sec] ?? '') : ''
          }
          // addon を反映した完成フィールドを計算して primaryBaseFields も同時更新
          const baseScenario = buildSoapFromScenario(sc)
          const newPrimaryFields: SoapFields = { S: '', O: '', A: '', P: '' }
          for (const sec of ['S', 'O', 'A', 'P'] as const) {
            const addonTexts = sectionAddonMap.get(sec) ?? []
            const followupText = (sec === 'S' || sec === 'P') ? resolveFollowupTextLocal(sec) : ''
            const parts = [baseScenario[sec], ...addonTexts].filter(Boolean)
            if (followupText) parts.push(followupText)
            newPrimaryFields[sec] = parts.join('\n')
          }
          // primaryBaseFields を addon 込みで更新（ノード合成時のベースが常に最新になるように）
          setPrimaryBaseFields(newPrimaryFields)
          setManualFields({ ...newPrimaryFields })
        }
      }
      return next
    })
  }, [activeModuleData.addons, activeModuleData.defaults, allModules, moduleData])

  const handleSToggle = useCallback((prefix: SPrefix, status: SStatus) => {
    // ノード編集中はSトグル操作を無効化（1剤目S専用のUI）
    if (editingNodeIdRef.current !== null) return
    setSPrefix(prefix)
    setSStatus(status)
    const newFirst = buildSFirstSentence(prefix, status)
    const updated = replaceSFirstSentence(fields.S, newFirst)
    setManualFields(prev => ({ ...prev, S: updated }))
  }, [fields.S])

  const handleSwitchToNlp = useCallback(() => {
    setUiMode('nlp')
    setSelectedScenarioId(null)
    setSelectedGroup(null)
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
    setSelectedAddonIds(new Set())
    setPrimarySelectedAddonIds(new Set())
    setPrimaryBaseFields(EMPTY_FIELDS)
    setComposeNodes([])
    setNlpValidation(null)
    setNlpSelectorReason('')
    setNlpConfidence(0)
  }, [])

  const handleSwitchToManual = useCallback(() => {
    setUiMode('manual')
    setManualFields({})
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
      setManualFields({ S: result.soap.S, O: result.soap.O, A: result.soap.A, P: result.soap.P })
      if (result.scenarioId) {
        setSelectedScenarioId(result.scenarioId)
        const sc = activeModuleData.scenarios.find(s => s.globalId === result.scenarioId)
        if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
      }
    } else {
      setManualFields({})
      setSelectedScenarioId(null)
    }
    setNlpIsGenerating(false)
  }, [activeModuleData])

  // ── 表示条件 ─────────────────────────────────────────────────

  // ── currentScenarioId ────────────────────────────────────────
  // 「今編集対象のシナリオID」を表す唯一の窓口。
  // editingNodeId で操作対象を100%決め、selectedScenarioId を分岐条件に使わない。
  //   ノード編集中  → 編集中ノードの scenarioId（空文字 = pending）
  //   1剤目操作中  → selectedScenarioId（1剤目専用 state）
  const currentScenarioId: string | null =
    editingNodeId !== null
      ? (composeNodes.find(n => n.id === editingNodeId)?.scenarioId || null)
      : selectedScenarioId

  // セカンダリ: 左メニューでグループを選んだときだけ表示
  const showSecondary = selectedGroup !== null

  // ThirdPanel: currentScenarioId が確定済み（非null・非空）なら表示
  const thirdPanelEnabled = currentScenarioId !== null && currentScenarioId !== ''

  // SOAPエディター表示条件:
  //   1剤目が確定済み、またはシナリオが確定済みのノードが1件以上ある
  //   pending のみ（薬剤追加直後・シナリオ未選択）は引き続きガイドを表示
  const hasValidComposeNodes = composeNodes.some(n => n.scenarioId !== '' && n.scenarioId != null)
  const showSoapEditor = selectedScenarioId !== null || hasValidComposeNodes

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
      />

      <div className={s.body}>
        <Sidebar
          availableGroups={drugSelected ? availableGroups : new Set()}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
          selectedNodeId={editingNodeId}
          onDeselectNode={() => {
            setEditingNodeId(null)
            setSelectedAddonIds(primarySelectedAddonIds)
            if (primaryScenario) setSelectedGroup(getMenuGroupFromScenario(primaryScenario))
          }}
        />

        <div className={s.secondaryCol}>
          <div className={s.modeToggleBar}>
            <button
              className={[s.modeToggleBtn, uiMode === 'manual' ? s.modeToggleBtnActive : ''].join(' ')}
              onClick={() => uiMode !== 'manual' && handleSwitchToManual()}
              aria-pressed={uiMode === 'manual'}
            >
              手動選択
            </button>
            <button
              className={[s.modeToggleBtn, uiMode === 'nlp' ? s.modeToggleBtnActive : ''].join(' ')}
              onClick={() => uiMode !== 'nlp' && handleSwitchToNlp()}
              aria-pressed={uiMode === 'nlp'}
            >
              🤖 自然言語
            </button>
          </div>

          {uiMode === 'manual' && (
            <>
              {showSecondary && groupScenarios.length > 0 ? (
                <>
                  <TemplateListPanel
                    key={`${editingNodeId ?? 'main'}-${selectedGroup ?? 'all'}`}
                    group={selectedGroup!}
                    scenarios={groupScenarios}
                    selectedScenarioId={currentScenarioId}
                    onSelectScenario={handleSelectScenario}
                  />
                  {currentScenarioId !== null && targetModule.addons && (
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
            currentSPrefix={sPrefix}
            currentSStatus={sStatus}
            onSAction={handleSToggle}
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
              fields={fields}
              onChange={handleFieldChange}
              nodeBarSlot={
                <ComposeNodeBar
                  nodes={composeNodes}
                  selectedNodeId={editingNodeId}
                  onSelectNode={handleSelectNode}
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
    </div>
  )
}
