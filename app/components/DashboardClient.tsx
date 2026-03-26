'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock, ComposeNode } from '../../lib/types'
import { TAG_TO_GENERIC_NAME } from '../../lib/types'
import { buildSoapFromScenario, mergeBlocks } from '../../lib/buildSoap'
import { buildSearchIndex, getSuggestions, normalizeText } from '../../lib/search'
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
// DashboardClient — 状態管理・UIオーケストレーター
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ moduleData, allModules }: DashboardClientProps) {
  // ── 検索インデックス（全モジュールを結合して構築）────────
  const searchIndex = useMemo(
    () => allModules.flatMap(m => buildSearchIndex(m)),
    [allModules],
  )

  // ── アクティブモジュール（メイン検索選択で切り替わる） ──────
  const [activeModuleData, setActiveModuleData] = useState<ModuleData>(moduleData)

  // ── 選択中ブランド名（メイン検索クエリに最も近いブランド） ──
  const [activeBrandName, setActiveBrandName] = useState<string | undefined>(undefined)

  // ── 検索状態（責務分離） ──────────────────────────────────
  // mainSearch:    Topbar の検索窓 → currentModule 切替専用
  // composeSearch: ThirdPanel の検索窓 → composeNodes への追加専用
  const [mainSearch, setMainSearch] = useState('')
  const [composeSearch, setComposeSearch] = useState('')

  // ── その他状態 ────────────────────────────────────────────
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})
  const [sPrefix, setSPrefix] = useState<SPrefix>('none')
  const [sStatus, setSStatus] = useState<SStatus>('stable')
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  // ── 合成ノード（2剤目以降の合成対象リスト） ───────────────
  // composeNodes は追加順を保持し、mergeBlocks の入力として使われる
  const [composeNodes, setComposeNodes] = useState<ComposeNode[]>([])

  // ── 合成ノード選択中 ID ────────────────────────────────────
  // null = 1剤目（メインモジュール）を操作中
  // non-null = そのノードIDのシナリオを左メニューで操作中
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

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
  const computedFields = selectedScenario
    ? buildSoapFromScenario(selectedScenario)
    : EMPTY_FIELDS

  // computedFieldsWithFollowup: followup のみ適用したベース表示用
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

  const fields: SoapFields = {
    S: manualFields.S ?? computedFieldsWithFollowup.S,
    O: manualFields.O ?? computedFieldsWithFollowup.O,
    A: manualFields.A ?? computedFieldsWithFollowup.A,
    P: manualFields.P ?? computedFieldsWithFollowup.P,
  }

  // ── アドオン表示キー解決 ──────────────────────────────────
  const addonVisibleKeys = useMemo(
    () => getVisibleAddonKeys(activeModuleData.addons, selectedScenario),
    [activeModuleData.addons, selectedScenario],
  )

  // ── S操作: 副作用なし/CP良好への変更時に prev_do_stable へ強制初期化 ──
  useEffect(() => {
    if (selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)) {
      setSPrefix('none')
      setSStatus('stable')
    }
  }, [selectedGroup])

  // ── 選択中ノードのモジュール（操作対象モジュール） ────────
  // selectedNodeId が null → メインモジュール
  // non-null → そのノードが属するモジュール
  const targetModule = useMemo<ModuleData>(() => {
    if (selectedNodeId === null) {
      console.log('[targetModule] → activeModuleData', activeModuleData.moduleId)
      return activeModuleData
    }
    const node = composeNodes.find(n => n.id === selectedNodeId)
    if (!node) {
      console.log('[targetModule] node not found, → activeModuleData')
      return activeModuleData
    }
    const mod = allModules.find(m => m.moduleId === node.moduleId) ?? activeModuleData
    console.log('[targetModule] → nodeModule', mod.moduleId, '(node.moduleId=', node.moduleId, ')')
    return mod
  }, [selectedNodeId, composeNodes, activeModuleData, allModules])

  // ── グループ構造 ─────────────────────────────────────────
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
    const filtered = raw.filter(sc => getMenuGroupFromScenario(sc) === selectedGroup)
    console.log('[groupScenarios] selectedGroup=', selectedGroup, 'targetModule=', targetModule.moduleId, 'count=', filtered.length)
    return filtered
  }, [allGroups, selectedGroup, targetModule.moduleId])

  // ── サジェスト候補（検索窓別） ────────────────────────────
  // mainSuggestions: Topbar 用
  const mainSuggestions = useMemo(
    () => getSuggestions(mainSearch, searchIndex),
    [mainSearch, searchIndex],
  )
  // composeSuggestions: ThirdPanel 合成検索用
  const composeSuggestions = useMemo(
    () => getSuggestions(composeSearch, searchIndex),
    [composeSearch, searchIndex],
  )

  // ── 表示用メタデータ ─────────────────────────────────────
  const badge = activeModuleData.categoryPath?.[1]

  // ── 選択中薬剤ラベル: 「ブランド名（一般名）」形式 ───────
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

  // ── composeNodes から SOAP を再合成するユーティリティ ─────
  // 現在の fields（1剤目）を先頭、composeNodes を後続として mergeBlocks する
  const recomposeSoap = useCallback((
    baseFields: SoapFields,
    baseClosingText: string | undefined,
    baseLabel: string,
    nodes: ComposeNode[],
  ): SoapFields => {
    if (nodes.length === 0) return baseFields
    return mergeBlocks(
      nodes.map(n => n.block),
      baseFields,
      baseLabel,
      baseClosingText,
    )
  }, [])

  // ── イベントハンドラ ─────────────────────────────────────

  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    // ノード選択中でない場合のみシナリオをリセット
    if (selectedNodeId === null) {
      setSelectedScenarioId(null)
      setManualFields({})
      setSPrefix('none')
      setSStatus('stable')
      setSelectedAddonIds(new Set())
    }
  }, [selectedNodeId])

  // ── 合成ノードの block を再構築して更新するユーティリティ ─
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

    // followup 適用
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
      if (appendText) {
        result[key] = result[key] ? `${result[key]}\n${appendText}` : appendText
      }
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
      updatedNodes.map(n => n.block),
      baseFields,
      baseLabel,
      baseClosing,
    )
    return { updatedNodes, mergedFields }
  }, [allModules, moduleData])

  const handleSelectScenario = useCallback((id: string) => {
    console.log('[handleSelectScenario] id=', id, 'selectedNodeId=', selectedNodeId)
    // ノード選択中 → そのノードのシナリオを変更
    if (selectedNodeId !== null) {
      console.log('[handleSelectScenario] → node path, nodeId=', selectedNodeId)
      setComposeNodes(prev => {
        const currentClosing = selectedScenario
          ? resolveClosingText(selectedScenario, activeModuleData.defaults)
          : undefined
        const baseLabel = selectedScenario?.title ?? ''
        const { updatedNodes, mergedFields } = rebuildNodeBlock(
          selectedNodeId,
          id,
          prev,
          computedFieldsWithFollowup,
          baseLabel,
          currentClosing,
        )
        console.log('[handleSelectScenario] rebuildNodeBlock done, updatedNodes=', updatedNodes.length)
        setManualFields({ S: mergedFields.S, O: mergedFields.O, A: mergedFields.A, P: mergedFields.P })
        return updatedNodes
      })
      return
    }

    console.log('[handleSelectScenario] → main path')
    // 通常（1剤目）操作
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
  }, [selectedNodeId, activeModuleData, selectedScenario, computedFieldsWithFollowup, rebuildNodeBlock])

  // ── メイン検索選択: currentModule を切り替える ───────────
  const handleSelectSuggestion = useCallback((scenarioId: string) => {
    const entry = searchIndex.find(e => e.templateId === scenarioId)
    if (entry) {
      const targetModule = allModules.find(m => m.moduleId === entry.moduleId) ?? moduleData
      setActiveModuleData(targetModule)
    }
    const q = normalizeText(mainSearch)
    let matchedBrandName: string | undefined
    if (entry && q) {
      for (const brand of entry.brandNames) {
        if (normalizeText(brand) === q) { matchedBrandName = brand; break }
      }
      if (!matchedBrandName) {
        for (const brand of entry.brandNames) {
          if (normalizeText(brand).startsWith(q)) { matchedBrandName = brand; break }
        }
      }
      if (!matchedBrandName) {
        for (const brand of entry.brandNames) {
          if (normalizeText(brand).includes(q)) { matchedBrandName = brand; break }
        }
      }
    }
    setActiveBrandName(matchedBrandName)
    if (entry) {
      setSelectedScenarioId(entry.templateId)
      const targetModule = allModules.find(m => m.moduleId === entry.moduleId) ?? moduleData
      const sc = targetModule.scenarios.find(s => s.globalId === entry.templateId)
      if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
    } else {
      setSelectedScenarioId(null)
      setSelectedGroup(null)
    }
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
    setSelectedAddonIds(new Set())
    setMainSearch('')
    // メイン薬剤切替時は合成ノードをリセット
    setComposeNodes([])
  }, [searchIndex, allModules, moduleData, mainSearch])

  // ── 合成検索選択: composeNodes に追加する ────────────────
  // currentModule は変更しない
  const handleComposeSelectSuggestion = useCallback((scenarioId: string) => {
    const entry = searchIndex.find(e => e.templateId === scenarioId)
    if (!entry) {
      setComposeSearch('')
      return
    }
    const targetModule = allModules.find(m => m.moduleId === entry.moduleId) ?? moduleData
    const sc = targetModule.scenarios.find(s => s.globalId === entry.templateId)
    if (!sc) {
      setComposeSearch('')
      return
    }

    // ノード用の drugLabel を解決
    const q = normalizeText(composeSearch)
    let matchedBrand: string | undefined
    if (q) {
      for (const brand of entry.brandNames) {
        if (normalizeText(brand) === q) { matchedBrand = brand; break }
      }
      if (!matchedBrand) {
        for (const brand of entry.brandNames) {
          if (normalizeText(brand).startsWith(q)) { matchedBrand = brand; break }
        }
      }
    }
    const drugLabel = matchedBrand
      ?? targetModule.drug?.brandNames?.[0]
      ?? targetModule.drug?.search?.primaryDisplayName
      ?? targetModule.moduleId

    // MergedBlock を構築
    const base = buildSoapFromScenario(sc)
    // followup を適用
    const result = { ...base }
    for (const key of ['S', 'P'] as const) {
      const followupRef = sc.followupRef
      let appendText: string | null | undefined
      if (followupRef) {
        const profile = targetModule.defaults?.followupProfiles?.[followupRef]
        if (profile) appendText = (profile as Record<string, string | null>)[key]
      } else {
        const followupVal = (sc.followup as Record<string, string> | undefined)?.[key]
        if (followupVal === 'default') {
          appendText = (targetModule.defaults?.followup as Record<string, string> | undefined)?.[key]
        }
      }
      if (appendText) {
        result[key] = result[key] ? `${result[key]}\n${appendText}` : appendText
      }
    }
    const closingText = resolveClosingText(sc, targetModule.defaults)

    const block: MergedBlock = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      templateLabel: sc.title,
      fields: result,
      symptomCodes: sc.sComposition?.symptomCodes,
      closingText,
    }

    const newNode: ComposeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      moduleId: targetModule.moduleId,
      scenarioId: sc.globalId,
      block,
      drugLabel,
    }

    setComposeNodes(prev => {
      const updated = [...prev, newNode]
      // SOAP を再合成して manualFields に反映
      const currentClosing = selectedScenario
        ? resolveClosingText(selectedScenario, activeModuleData.defaults)
        : undefined
      const baseLabel = selectedScenario?.title ?? ''
      const merged = mergeBlocks(
        updated.map(n => n.block),
        fields,
        baseLabel,
        currentClosing,
      )
      setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
      return updated
    })

    setComposeSearch('')
  }, [searchIndex, allModules, moduleData, composeSearch, selectedScenario, activeModuleData.defaults, fields])

  // ── 合成ノード選択 ────────────────────────────────────────
  // ノードをクリック → selectedNodeId を切り替え、Sidebar グループをそのシナリオに合わせる
  const handleSelectNode = useCallback((nodeId: string) => {
    // updater 関数の中で副作用 (setSelectedGroup) を呼ばない
    if (selectedNodeId === nodeId) {
      // 同じノードをクリック → 解除して1剤目に戻る
      console.log('[handleSelectNode] deselect', nodeId)
      setSelectedNodeId(null)
      setSelectedGroup(selectedScenario ? getMenuGroupFromScenario(selectedScenario) : null)
      return
    }
    // 選択切替
    console.log('[handleSelectNode] select', nodeId)
    const node = composeNodes.find(n => n.id === nodeId)
    if (node) {
      const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
      const sc = mod.scenarios.find(s => s.globalId === node.scenarioId)
      console.log('[handleSelectNode] node.moduleId=', node.moduleId, 'scenarioId=', node.scenarioId, 'sc=', sc?.title, 'group=', sc ? getMenuGroupFromScenario(sc) : null)
      if (sc) {
        setSelectedGroup(getMenuGroupFromScenario(sc))
      } else {
        // シナリオが見つからない場合はモジュールの最初のグループにフォールバック
        const firstGroup = groupByMenuGroup(mod.scenarios)[0]?.group ?? null
        console.log('[handleSelectNode] sc not found, fallback to first group:', firstGroup)
        setSelectedGroup(firstGroup)
      }
    }
    setSelectedNodeId(nodeId)
  }, [selectedNodeId, composeNodes, allModules, moduleData, selectedScenario])

  // ── 合成ノード削除 ────────────────────────────────────────
  const handleRemoveComposeNode = useCallback((nodeId: string) => {
    // 削除ノードが選択中なら選択解除して1剤目に戻す
    setSelectedNodeId(prev => {
      if (prev === nodeId) {
        if (selectedScenario) setSelectedGroup(getMenuGroupFromScenario(selectedScenario))
        return null
      }
      return prev
    })
    setComposeNodes(prev => {
      const updated = prev.filter(n => n.id !== nodeId)
      if (updated.length === 0) {
        // ノードが全削除 → 1剤目の状態に戻す
        setManualFields({})
        return updated
      }
      // 残りのノードで再合成
      const currentClosing = selectedScenario
        ? resolveClosingText(selectedScenario, activeModuleData.defaults)
        : undefined
      const baseLabel = selectedScenario?.title ?? ''
      // 1剤目の computedFieldsWithFollowup をベースに再合成
      const merged = mergeBlocks(
        updated.map(n => n.block),
        computedFieldsWithFollowup,
        baseLabel,
        currentClosing,
      )
      setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })
      return updated
    })
  }, [selectedScenario, activeModuleData.defaults, computedFieldsWithFollowup])

  // ── 合成ノード全削除 ──────────────────────────────────────
  const handleResetCompose = useCallback(() => {
    setComposeNodes([])
    setManualFields({})
    setSelectedNodeId(null)
  }, [])

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    setManualFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubcategorySelect = useCallback((label: string) => {
    setComposeSearch(label)
  }, [])

  // アドオントグル
  const handleAddonToggle = useCallback((addonKey: string, _text: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev)
      if (next.has(addonKey)) {
        next.delete(addonKey)
      } else {
        next.add(addonKey)
      }

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
            ? ((activeModuleData.defaults?.followup as Record<string, string> | undefined)?.[sec] ?? '')
            : ''
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
              const hasAnyAddonForSec = [...next].some(
                k => activeModuleData.addons?.items[k]?.targetSection === sec,
              )
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

  // S欄トグル操作
  const handleSToggle = useCallback((prefix: SPrefix, status: SStatus) => {
    setSPrefix(prefix)
    setSStatus(status)
    const newFirst = buildSFirstSentence(prefix, status)
    const currentS = fields.S
    const updated = replaceSFirstSentence(currentS, newFirst)
    setManualFields(prev => ({ ...prev, S: updated }))
  }, [fields.S])

  // ── NLP モード: モード切替 ────────────────────────────────
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

  // ── NLP モード: SOAP 生成 ─────────────────────────────────
  const handleNlpGenerate = useCallback(
    (patientInput: string) => {
      setNlpIsGenerating(true)
      const result = createSoapFromInput(activeModuleData, patientInput)
      setNlpValidation(result.validation)
      setNlpSelectorReason(result.selectorReason)
      setNlpConfidence(result.confidence)
      if (result.soap) {
        setManualFields({
          S: result.soap.S,
          O: result.soap.O,
          A: result.soap.A,
          P: result.soap.P,
        })
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
    },
    [activeModuleData],
  )

  // recomposeSoap を deps に含めるため宣言済み（実際には composeNodes 変更時のみ使う）
  void recomposeSoap

  // ── レンダリング ─────────────────────────────────────────
  return (
    <div className={s.layout}>
      <Topbar
        title="SOAP Engine"
        badge={badge}
        activeDrugLabel={activeBrandName != null || selectedScenarioId !== null ? activeDrugLabel : undefined}
        searchValue={mainSearch}
        onSearchChange={setMainSearch}
        suggestions={mainSuggestions}
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
          selectedNodeId={selectedNodeId}
          onDeselectNode={() => {
            // ノード選択解除 → 1剤目の操作に戻る
            setSelectedNodeId(null)
            if (selectedScenario) setSelectedGroup(getMenuGroupFromScenario(selectedScenario))
          }}
        />

        {/* Col 2: テンプレ一覧 + アドオン */}
        <div className={s.secondaryCol}>
          {/* モード切替ボタン */}
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
              {/* ノード選択中でもシナリオ一覧を表示（groupScenarios が空でも TemplateListPanel を出す） */}
              {(groupScenarios.length > 0 || selectedNodeId !== null) && selectedGroup !== null ? (
                <>
                  <TemplateListPanel
                    key={`${selectedNodeId ?? 'main'}-${selectedGroup ?? 'all'}`}
                    group={selectedGroup}
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

          {uiMode === 'nlp' && (
            <div className={s.secondaryEmpty} aria-hidden="true" />
          )}
        </div>

        {/* Col 3:
            手動選択モード → ThirdPanel（Sボタン / 合成薬剤追加 / 診療領域）
            自然言語生成モード → NlpInputPanel
        */}
        {uiMode === 'manual' ? (
          <ThirdPanel
            selectedGroup={selectedGroup}
            thirdPanelEnabled={selectedScenarioId !== null}
            currentSPrefix={sPrefix}
            currentSStatus={sStatus}
            onSAction={handleSToggle}
            searchValue={composeSearch}
            onSearchChange={setComposeSearch}
            suggestions={composeSuggestions}
            onSelectSuggestion={handleComposeSelectSuggestion}
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
        <div className={s.editorCol}>
          {/* 合成ノードバー（2剤目以降のノード表示） */}
          <ComposeNodeBar
            nodes={composeNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onRemove={handleRemoveComposeNode}
            onReset={handleResetCompose}
            baseDrugLabel={activeDrugLabel}
            baseScenarioLabel={selectedScenario?.title}
          />

          <SoapEditor
            fields={fields}
            onChange={handleFieldChange}
            templateLabel={selectedScenario?.title ?? ''}
            mergedBlockCount={0}
            onMerge={() => { /* 合成ノードUIに移行したため保持ボタンは非使用 */ }}
            onResetMerge={handleResetCompose}
            canMerge={false}
          />
        </div>
      </div>
    </div>
  )
}
