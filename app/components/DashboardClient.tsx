'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock, ComposeNode } from '../../lib/types'
import { TAG_TO_GENERIC_NAME } from '../../lib/types'
import { buildSoapFromScenario, mergeBlocks } from '../../lib/buildSoap'
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // nodeId → true: 薬剤だけ追加されてシナリオが未確定のノード
  const [pendingNodeIds, setPendingNodeIds] = useState<Set<string>>(new Set())

  const selectedNodeIdRef = useRef<string | null>(null)
  const composeNodesRef = useRef<ComposeNode[]>([])
  const computedFieldsWithFollowupRef = useRef<SoapFields>({ S: '', O: '', A: '', P: '' })
  const selectedScenarioRef = useRef<typeof selectedScenario>(undefined)
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

  selectedNodeIdRef.current = selectedNodeId
  composeNodesRef.current = composeNodes
  computedFieldsWithFollowupRef.current = computedFieldsWithFollowup
  selectedScenarioRef.current = selectedScenario

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

  const targetModule = useMemo<ModuleData>(() => {
    if (selectedNodeId === null) return activeModuleData
    const node = composeNodes.find(n => n.id === selectedNodeId)
    if (!node) return activeModuleData
    return allModules.find(m => m.moduleId === node.moduleId) ?? activeModuleData
  }, [selectedNodeId, composeNodes, activeModuleData, allModules])

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

  const recomposeSoap = useCallback((
    baseFields: SoapFields,
    baseClosingText: string | undefined,
    baseLabel: string,
    nodes: ComposeNode[],
  ): SoapFields => {
    if (nodes.length === 0) return baseFields
    return mergeBlocks(nodes.map(n => n.block), baseFields, baseLabel, baseClosingText)
  }, [])

  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    // 1剤目操作中: シナリオ選択は維持しつつグループだけ変える
    // manualFields はクリアしない（SOAPを消さないため）
    // ノード操作中(selectedNodeId !== null)の場合も同様に何もしない
  }, [])

  const rebuildNodeBlock = useCallback((
    nodeId: string,
    newScenarioId: string,
    nodes: ComposeNode[],
    baseFields: SoapFields,
    baseLabel: string,
    baseClosing: string | undefined,
  ): { updatedNodes: ComposeNode[]; mergedFields: SoapFields } => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return { updatedNodes: nodes, mergedFields: baseFields }
    const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
    const sc = mod.scenarios.find(s => s.globalId === newScenarioId)
    if (!sc) return { updatedNodes: nodes, mergedFields: baseFields }

    const base = buildSoapFromScenario(sc)
    const result = { ...base }
    for (const key of ['S', 'P'] as const) {
      let appendText: string | null | undefined
      const followupRef = sc.followupRef
      if (followupRef) {
        const profile = mod.defaults?.followupProfiles?.[followupRef]
        if (profile) appendText = (profile as Record<string, string | null>)[key]
      } else {
        const followupVal = (sc.followup as Record<string, string> | undefined)?.[key]
        if (followupVal === 'default') {
          appendText = (mod.defaults?.followup as Record<string, string> | undefined)?.[key]
        }
      }
      if (appendText) result[key] = result[key] ? `${result[key]}\n${appendText}` : appendText
    }
    const closingText = resolveClosingText(sc, mod.defaults)
    const newBlock: MergedBlock = {
      id: node.block.id,
      templateLabel: sc.title,
      fields: result,
      symptomCodes: sc.sComposition?.symptomCodes,
      closingText,
    }
    const updatedNodes = nodes.map(n =>
      n.id === nodeId ? { ...n, scenarioId: newScenarioId, block: newBlock } : n,
    )
    const mergedFields = mergeBlocks(
      updatedNodes.map(n => n.block), baseFields, baseLabel, baseClosing,
    )
    return { updatedNodes, mergedFields }
  }, [allModules, moduleData])

  const handleSelectScenario = useCallback((id: string) => {
    const nodeId = selectedNodeIdRef.current

    if (nodeId !== null) {
      const sc = selectedScenarioRef.current
      // ノード合成時のベースは「現在画面に表示されている1剤目SOAP」
      const baseFields = fieldsRef.current
      const currentClosing = sc ? resolveClosingText(sc, activeModuleData.defaults) : undefined
      const baseLabel = sc?.title ?? ''

      // シナリオが確定 → pending から外す
      setPendingNodeIds(prev => {
        const next = new Set(prev)
        next.delete(nodeId)
        return next
      })

      setComposeNodes(prev => {
        const { updatedNodes, mergedFields } = rebuildNodeBlock(
          nodeId, id, prev, baseFields, baseLabel, currentClosing,
        )
        setManualFields({ S: mergedFields.S, O: mergedFields.O, A: mergedFields.A, P: mergedFields.P })
        return updatedNodes
      })

      // ノードのシナリオ確定 → selectedScenarioId に反映してサードパネルを開く
      setSelectedScenarioId(id)
      return
    }

    setSelectedScenarioId(prev => {
      if (prev === id) {
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
    setSelectedNodeId(null)
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
    setSelectedNodeId(nodeId)
    // group / scenario は未選択のまま（左メニューを押すまで何も出さない）
    setSelectedGroup(null)
    setSelectedScenarioId(null)

    setComposeSearch('')
  }, [allModules, moduleData])

  const handleSelectNode = useCallback((nodeId: string) => {
    const currentNodeId = selectedNodeIdRef.current
    const currentNodes = composeNodesRef.current

    if (currentNodeId === nodeId) {
      // 同じノードを再クリック → 選択解除
      setSelectedNodeId(null)
      setSelectedGroup(null)
      return
    }
    const node = currentNodes.find(n => n.id === nodeId)
    if (node) {
      // group は常に null（左メニューをユーザーが押すまで出さない）
      setSelectedGroup(null)
      // 確定済みノード: scenarioId を復元してサードパネルが再び開けるようにする
      if (node.scenarioId) {
        setSelectedScenarioId(node.scenarioId)
        // block.fields をそのまま manualFields に反映してSOAPを復元
        const f = node.block.fields
        setManualFields({ S: f.S, O: f.O, A: f.A, P: f.P })
      } else {
        // pending ノード: scenarioId なし・SOAPはそのまま維持
        setSelectedScenarioId(null)
      }
    }
    setSelectedNodeId(nodeId)
  }, [])

  const handleRemoveComposeNode = useCallback((nodeId: string) => {
    const currentNodeId = selectedNodeIdRef.current
    const currentScenario = selectedScenarioRef.current
    const baseFields = computedFieldsWithFollowupRef.current

    if (currentNodeId === nodeId) {
      setSelectedNodeId(null)
      if (currentScenario) setSelectedGroup(getMenuGroupFromScenario(currentScenario))
    }
    setPendingNodeIds(prev => {
      const next = new Set(prev)
      next.delete(nodeId)
      return next
    })
    setComposeNodes(prev => {
      const updated = prev.filter(n => n.id !== nodeId)
      if (updated.length === 0) { setManualFields({}); return updated }
      const currentClosing = currentScenario
        ? resolveClosingText(currentScenario, activeModuleData.defaults) : undefined
      const merged = mergeBlocks(
        updated.map(n => n.block), baseFields, currentScenario?.title ?? '', currentClosing,
      )
      setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
      return updated
    })
  }, [activeModuleData.defaults])

  const handleResetCompose = useCallback(() => {
    setComposeNodes([])
    setManualFields({})
    setSelectedNodeId(null)
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

      if (activeModuleData.addons && selectedScenario) {
        const sectionAddonMap = new Map<string, string[]>()
        for (const key of next) {
          const item = activeModuleData.addons.items[key]
          if (!item) continue
          const sec = item.targetSection
          if (!sectionAddonMap.has(sec)) sectionAddonMap.set(sec, [])
          sectionAddonMap.get(sec)!.push(item.text)
        }
        const resolveFollowupTextLocal = (sec: 'S' | 'P'): string => {
          const followupRef = selectedScenario.followupRef
          if (followupRef) {
            return (activeModuleData.defaults?.followupProfiles?.[followupRef] as Record<string, string> | undefined)?.[sec] ?? ''
          }
          const followupVal = (selectedScenario.followup as Record<string, string> | undefined)?.[sec]
          return followupVal === 'default'
            ? ((activeModuleData.defaults?.followup as Record<string, string> | undefined)?.[sec] ?? '') : ''
        }
        setManualFields(prevFields => {
          const updated = { ...prevFields }
          for (const [sec, addonTexts] of sectionAddonMap) {
            const base = computedFields[sec as keyof typeof computedFields] ?? ''
            const followupText = (sec === 'S' || sec === 'P') ? resolveFollowupTextLocal(sec as 'S' | 'P') : ''
            const parts = [base, ...addonTexts].filter(Boolean)
            if (followupText) parts.push(followupText)
            updated[sec as keyof typeof updated] = parts.join('\n')
          }
          for (const sec of ['S', 'O', 'A', 'P'] as const) {
            if (!sectionAddonMap.has(sec)) {
              const hasAnyAddonForSec = [...next].some(k => activeModuleData.addons?.items[k]?.targetSection === sec)
              if (!hasAnyAddonForSec) {
                const base = computedFields[sec] ?? ''
                const followupText = (sec === 'S' || sec === 'P') ? resolveFollowupTextLocal(sec) : ''
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
  }, [activeModuleData.addons, activeModuleData.defaults, selectedScenario, computedFields])

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

  void recomposeSoap

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
          selectedNodeId={selectedNodeId}
          onDeselectNode={() => {
            setSelectedNodeId(null)
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
                    key={`${selectedNodeId ?? 'main'}-${selectedGroup ?? 'all'}`}
                    group={selectedGroup!}
                    scenarios={groupScenarios}
                    selectedScenarioId={
                      selectedNodeId !== null
                        ? (composeNodes.find(n => n.id === selectedNodeId)?.scenarioId ?? null)
                        : selectedScenarioId
                    }
                    onSelectScenario={handleSelectScenario}
                  />
                  {selectedScenarioId !== null && activeModuleData.addons && selectedNodeId === null && (
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
                selectedNodeId={selectedNodeId}
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
