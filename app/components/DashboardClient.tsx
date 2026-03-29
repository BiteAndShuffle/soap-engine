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

  // 薬剤選択済みフラグ（初期モジュールは選択済みとみなす）
  const [drugSelected, setDrugSelected] = useState(true)

  const [mainSearch, setMainSearch] = useState('')
  const [composeSearch, setComposeSearch] = useState('')

  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})
  const [sPrefix, setSPrefix] = useState<SPrefix>('none')
  const [sStatus, setSStatus] = useState<SStatus>('stable')
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  const [composeNodes, setComposeNodes] = useState<ComposeNode[]>([])
  // editingNodeId: 現在編集/選択中のノードID。null = 1剤目操作中。
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // nodeId → true: 薬剤だけ追加されてシナリオが未確定のノード
  const [pendingNodeIds, setPendingNodeIds] = useState<Set<string>>(new Set())

  // 1剤目（メイン薬）の確定SOAP。2剤目以降の合成では常にこれをベースにする。
  // 2剤目以降のノード確定・再編集では絶対に更新しない。
  const [primaryBaseFields, setPrimaryBaseFields] = useState<SoapFields>(EMPTY_FIELDS)
  const primaryBaseFieldsRef = useRef<SoapFields>(EMPTY_FIELDS)

  const editingNodeIdRef = useRef<string | null>(null)
  const composeNodesRef = useRef<ComposeNode[]>([])
  const computedFieldsWithFollowupRef = useRef<SoapFields>({ S: '', O: '', A: '', P: '' })
  const selectedScenarioRef = useRef<typeof selectedScenario>(undefined)
  // selectedAddonIds の最新値を常時保持（stale closure 防止）
  const selectedAddonIdsRef = useRef<Set<string>>(new Set())
  // レンダリング時の実表示値（manualFields優先）を常時保持
  const fieldsRef = useRef<SoapFields>({ S: '', O: '', A: '', P: '' })

  const [uiMode, setUiMode] = useState<UiMode>('manual')
  const [nlpValidation, setNlpValidation] = useState<ValidationResult | null>(null)
  const [nlpSelectorReason, setNlpSelectorReason] = useState('')
  const [nlpConfidence, setNlpConfidence] = useState(0)
  const [nlpIsGenerating, setNlpIsGenerating] = useState(false)

  const selectedScenario = activeModuleData.scenarios.find(
    sc => sc.globalId === selectedScenarioId,
  )

  const computedFields = selectedScenario
    ? buildSoapFromScenario(selectedScenario)
    : EMPTY_FIELDS

  const computedFieldsWithFollowup: SoapFields = useMemo(() => {
    if (!selectedScenario) return EMPTY_FIELDS
    const base = buildSoapFromScenario(selectedScenario)
    const result = { ...base }
    for (const key of ['S', 'P'] as const) {
      let appendText: string | null | undefined = undefined
      const followupRef = selectedScenario.followupRef
      if (followupRef) {
        const profile = activeModuleData.defaults?.followupProfiles?.[followupRef]
        if (profile) appendText = (profile as Record<string, string | null>)[key]
      } else {
        const followupVal = (selectedScenario.followup as Record<string, string> | undefined)?.[key]
        if (followupVal === 'default') {
          appendText = (activeModuleData.defaults?.followup as Record<string, string> | undefined)?.[key]
        }
      }
      if (appendText) {
        result[key] = result[key] ? `${result[key]}\n${appendText}` : appendText
      }
    }
    return result
  }, [selectedScenario, activeModuleData.defaults])

  editingNodeIdRef.current = editingNodeId
  composeNodesRef.current = composeNodes
  computedFieldsWithFollowupRef.current = computedFieldsWithFollowup
  selectedScenarioRef.current = selectedScenario
  primaryBaseFieldsRef.current = primaryBaseFields
  selectedAddonIdsRef.current = selectedAddonIds

  const fields: SoapFields = {
    S: manualFields.S ?? computedFieldsWithFollowup.S,
    O: manualFields.O ?? computedFieldsWithFollowup.O,
    A: manualFields.A ?? computedFieldsWithFollowup.A,
    P: manualFields.P ?? computedFieldsWithFollowup.P,
  }
  // 実表示値を常時保持（ノード追加・合成時のベースとして使う）
  fieldsRef.current = fields

  const addonVisibleKeys = useMemo(
    () => getVisibleAddonKeys(activeModuleData.addons, selectedScenario),
    [activeModuleData.addons, selectedScenario],
  )

  useEffect(() => {
    if (selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)) {
      setSPrefix('none')
      setSStatus('stable')
    }
  }, [selectedGroup])

  // 1剤目シナリオが確定/変更されたときに primaryBaseFields を同期する
  // editingNodeId === null のとき（1剤目操作中）のみ更新。ノード操作中は絶対に触らない。
  useEffect(() => {
    if (editingNodeId !== null) return   // ノード操作中: 無視
    if (selectedScenarioId !== null) {
      setPrimaryBaseFields(computedFieldsWithFollowup)
    } else {
      setPrimaryBaseFields(EMPTY_FIELDS)
    }
  }, [selectedScenarioId, editingNodeId, computedFieldsWithFollowup])

  const targetModule = useMemo<ModuleData>(() => {
    if (editingNodeId === null) return activeModuleData
    const node = composeNodes.find(n => n.id === editingNodeId)
    if (!node) return activeModuleData
    return allModules.find(m => m.moduleId === node.moduleId) ?? activeModuleData
  }, [editingNodeId, composeNodes, activeModuleData, allModules])

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
    // 1剤目操作中: シナリオ選択は維持しつつグループだけ変える
    // manualFields はクリアしない（SOAPを消さないため）
    // ノード操作中(editingNodeId !== null)の場合も同様に何もしない
  }, [])

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
    const updatedNodes = nodes.map(n =>
      n.id === nodeId
        ? {
            ...n,
            scenarioId: newScenarioId,
            block: newBlock,
            selectedAddonIds: addonIds,
            // ノード固有の主語情報を保存。他ノード/1剤目の state に依存しない。
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

  const handleSelectScenario = useCallback((id: string) => {
    const nodeId = editingNodeIdRef.current

    if (nodeId !== null) {
      // ── ノード（2剤目以降）シナリオ確定 / 再編集 ────────
      // primaryFields/primaryLabel/primaryClosing は「1剤目専用」のSOAP文脈。
      // ノード固有の baseLabel は rebuildNodeBlock 内でシナリオから解決して node に保存する。
      const primarySc = selectedScenarioRef.current  // 1剤目シナリオ（mergeBlocks currentLabel 用のみ）
      const primaryFields = primaryBaseFieldsRef.current
      const primaryClosing = primarySc ? resolveClosingText(primarySc, activeModuleData.defaults) : undefined
      const primaryLabel = primarySc?.title ?? ''
      // 確定時点の addon スナップショット（UI state から取得）
      const currentAddonIds = [...selectedAddonIdsRef.current]

      // シナリオ確定 → pending から外す（既確定ノードの再編集でも無害）
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

      // ノードのシナリオ確定 → selectedScenarioId に反映してサードパネルを開く
      setSelectedScenarioId(id)
      return
    }

    // ── 1剤目シナリオ確定 ─────────────────────────────────
    // primaryBaseFields の更新は useEffect（selectedScenarioId / computedFieldsWithFollowup 依存）が担う
    setSelectedScenarioId(prev => {
      if (prev === id) {
        // 同じシナリオを再タップ → 解除
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
  }, [activeModuleData, rebuildNodeBlock])

  // ── メイン検索: 薬剤選択のみ ──────────────────────────────
  // normalizeText は import 済みだが現時点では未使用のため lint 警告回避
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
      // シナリオ確定前は空。rebuildNodeBlock 呼び出し時に上書きされる。
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
    // group / scenario は未選択のまま（左メニューを押すまで何も出さない）
    setSelectedGroup(null)
    setSelectedScenarioId(null)
    // 新ノードの addon 状態は空からスタート
    setSelectedAddonIds(new Set())

    setComposeSearch('')
  }, [allModules, moduleData])

  const handleSelectNode = useCallback((nodeId: string) => {
    const currentNodeId = editingNodeIdRef.current
    const currentNodes = composeNodesRef.current

    if (currentNodeId === nodeId) {
      // 同じノードを再クリック → 選択解除（1剤目操作モードに戻る）
      setEditingNodeId(null)
      setSelectedGroup(null)
      // SOAPを全ノード再合成で復元（1剤目 + 全確定ノード）
      // mergeBlocks の currentLabel/currentClosing は 1剤目専用
      const primaryFields = primaryBaseFieldsRef.current
      const primarySc = selectedScenarioRef.current   // 1剤目シナリオ
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
      // 1剤目のシナリオIDに戻す（selectedScenarioId は 1剤目専用なので変えない）
      return
    }

    const node = currentNodes.find(n => n.id === nodeId)
    if (!node) return

    // ノード選択 → 編集モードへ
    setEditingNodeId(nodeId)
    setSelectedGroup(null)   // 左メニューはユーザーが押すまで出さない

    if (node.scenarioId) {
      // 確定済みノード: SOAPを再合成で復元してセカンダリ開放
      // mergeBlocks の currentLabel/currentClosing は 1剤目専用
      const primaryFields = primaryBaseFieldsRef.current
      const primarySc = selectedScenarioRef.current   // 1剤目シナリオ
      const primaryLabel = primarySc?.title ?? ''
      const primaryClosing = primarySc ? resolveClosingText(primarySc, activeModuleData.defaults) : undefined
      const confirmedNodes = currentNodes.filter(n => n.scenarioId)
      if (confirmedNodes.length > 0) {
        const merged = mergeBlocks(
          confirmedNodes.map(n => n.block), primaryFields, primaryLabel, primaryClosing,
        )
        setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
      }
      // selectedScenarioId にノードの確定シナリオIDをセット → セカンダリ（ThirdPanel）が開く
      setSelectedScenarioId(node.scenarioId)
      // ノードの addon スナップショットを UI に復元
      setSelectedAddonIds(new Set(node.selectedAddonIds ?? []))
    } else {
      // pending ノード: シナリオ未確定・SOAPはそのまま維持・ThirdPanel閉
      setSelectedScenarioId(null)
      setSelectedAddonIds(new Set())
    }
  }, [activeModuleData.defaults])

  const handleRemoveComposeNode = useCallback((nodeId: string) => {
    const currentNodeId = editingNodeIdRef.current
    // primarySc は 1剤目シナリオ。mergeBlocks の currentLabel/currentClosing 用のみ。
    const primarySc = selectedScenarioRef.current
    // ノード削除後の再合成も primaryBaseFields をベースにする
    const primaryFields = primaryBaseFieldsRef.current

    if (currentNodeId === nodeId) {
      setEditingNodeId(null)
      if (primarySc) setSelectedGroup(getMenuGroupFromScenario(primarySc))
    }
    setPendingNodeIds(prev => {
      const next = new Set(prev)
      next.delete(nodeId)
      return next
    })
    setComposeNodes(prev => {
      const updated = prev.filter(n => n.id !== nodeId)
      if (updated.length === 0) { setManualFields({}); return updated }
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
    setManualFields({})
    setEditingNodeId(null)
    setPendingNodeIds(new Set())
  }, [])

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    setManualFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubcategorySelect = useCallback((label: string) => {
    setComposeSearch(label)
  }, [])

  const handleAddonToggle = useCallback((addonKey: string, _text: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev)
      if (next.has(addonKey)) { next.delete(addonKey) } else { next.add(addonKey) }
      const newAddonIds = [...next]

      const nodeId = editingNodeIdRef.current

      if (nodeId !== null) {
        // ── ノード編集中: ノードの block を再構成して全体 merge ──────────
        // selectedScenarioRef（1剤目）はノード固有の文脈には使わない。
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
                ? {
                    ...n,
                    block: newBlock,
                    selectedAddonIds: newAddonIds,
                    // addon 変更後もノード固有の主語情報を最新化
                    baseLabel: nodeSc.title,
                    baseDomain: domain,
                  }
                : n,
            )
            // 1剤目の文脈（mergeBlocks の currentLabel/currentClosing 用）
            const primaryFields = primaryBaseFieldsRef.current
            const primarySc = selectedScenarioRef.current  // 1剤目専用
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
        // ── 1剤目操作中: 既存ロジック（computedFields ベース） ──────────
        if (activeModuleData.addons && selectedScenarioRef.current) {
          const sc = selectedScenarioRef.current
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
          setManualFields(prevFields => {
            const updated = { ...prevFields }
            for (const [sec, addonTexts] of sectionAddonMap) {
              const base = computedFieldsWithFollowupRef.current[sec as keyof SoapFields] ?? ''
              // computedFieldsWithFollowup は既に followup 込みなので follow テキストは重複しない
              // ただし addon の targetSection ごとに追記する
              const baseScenario = buildSoapFromScenario(sc)
              const followupText = (sec === 'S' || sec === 'P') ? resolveFollowupTextLocal(sec as 'S' | 'P') : ''
              const parts = [baseScenario[sec as keyof typeof baseScenario], ...addonTexts].filter(Boolean)
              if (followupText) parts.push(followupText)
              updated[sec as keyof typeof updated] = parts.join('\n')
            }
            for (const sec of ['S', 'O', 'A', 'P'] as const) {
              if (!sectionAddonMap.has(sec)) {
                const hasAnyAddonForSec = [...next].some(k => activeModuleData.addons?.items[k]?.targetSection === sec)
                if (!hasAnyAddonForSec) {
                  const baseScenario = buildSoapFromScenario(sc)
                  const followupText = (sec === 'S' || sec === 'P') ? resolveFollowupTextLocal(sec) : ''
                  const parts = [baseScenario[sec]].filter(Boolean)
                  if (followupText) parts.push(followupText)
                  updated[sec] = parts.join('\n')
                }
              }
            }
            return updated
          })
        }
      }
      return next
    })
  }, [activeModuleData.addons, activeModuleData.defaults, allModules, moduleData])

  const handleSToggle = useCallback((prefix: SPrefix, status: SStatus) => {
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

  // ── 表示条件 ─────────────────────────────────────────────
  // セカンダリ: 左メニューでグループを選んだときだけ表示
  const showSecondary = selectedGroup !== null

  // ThirdPanel: 1剤目のシナリオ選択後のみ（薬剤選択・左メニュー選択・ノード追加だけでは出さない）
  const thirdPanelEnabled = selectedScenarioId !== null

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
            if (selectedScenario) setSelectedGroup(getMenuGroupFromScenario(selectedScenario))
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
                    selectedScenarioId={
                      editingNodeId !== null
                        ? (composeNodes.find(n => n.id === editingNodeId)?.scenarioId ?? null)
                        : selectedScenarioId
                    }
                    onSelectScenario={handleSelectScenario}
                  />
                  {selectedScenarioId !== null && activeModuleData.addons && editingNodeId === null && (
                    <AddonPanel
                      addons={activeModuleData.addons}
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
        </div>
      </div>
    </div>
  )
}
