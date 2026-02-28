'use client'

import { useMemo, useState, useCallback } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock } from '../../lib/types'
import { buildSoapFromScenario, mergeBlocks } from '../../lib/buildSoap'
import { buildSearchIndex, getSuggestions } from '../../lib/search'
import {
  type MenuGroup,
  groupByMenuGroup,
  getMenuGroupFromScenario,
} from '../../lib/menuGroups'

import Topbar, { type RouteFilter } from './Topbar'
import Sidebar from './Sidebar'
import { TemplateListPanel, AddonPanel } from './SecondaryPanel'
import ThirdPanel from './ThirdPanel'
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
// Props
// ─────────────────────────────────────────────────────────────

interface DashboardClientProps {
  moduleData: ModuleData
}

// ─────────────────────────────────────────────────────────────
// DashboardClient — 状態管理・UIオーケストレーター
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ moduleData }: DashboardClientProps) {
  // ── 検索インデックス（マウント時に1回だけ構築）──────────
  const searchIndex = useMemo(
    () => buildSearchIndex(moduleData),
    [moduleData],
  )

  // ── 状態 ──────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})
  const [mergedBlocks, setMergedBlocks] = useState<MergedBlock[]>([])
  const [sPrefix, setSPrefix] = useState<SPrefix>('none')
  const [sStatus, setSStatus] = useState<SStatus>('stable')

  // ── 選択中シナリオ ────────────────────────────────────────
  const selectedScenario = moduleData.scenarios.find(
    sc => sc.id === selectedScenarioId,
  )

  // ── SOAP フィールド ──────────────────────────────────────
  const computedFields = selectedScenario
    ? buildSoapFromScenario(selectedScenario)
    : EMPTY_FIELDS

  const fields: SoapFields = {
    S: manualFields.S ?? computedFields.S,
    O: manualFields.O ?? computedFields.O,
    A: manualFields.A ?? computedFields.A,
    P: manualFields.P ?? computedFields.P,
  }

  // ── グループ構造 ─────────────────────────────────────────
  // groupByMenuGroup は getMenuGroupFromScenario (sideEffectPresence SSOT) で分類
  const allGroups = useMemo(
    () => groupByMenuGroup(moduleData.scenarios),
    [moduleData.scenarios],
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
  const badge = moduleData.categoryPath?.[1]

  // ── イベントハンドラ ─────────────────────────────────────

  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    setSelectedScenarioId(null)
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
  }, [])

  const handleSelectScenario = useCallback((id: string) => {
    const sc = moduleData.scenarios.find(s => s.id === id)
    if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
    setSelectedScenarioId(id)
    setManualFields({})
    setSPrefix('none')
    setSStatus('stable')
  }, [moduleData.scenarios])

  const handleSelectSuggestion = useCallback((scenarioId: string) => {
    handleSelectScenario(scenarioId)
    setSearch('')
  }, [handleSelectScenario])

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    setManualFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubcategorySelect = useCallback((label: string) => {
    setSearch(label)
  }, [])

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

  // ── レンダリング ─────────────────────────────────────────
  return (
    <div className={s.layout}>
      <Topbar
        title="SOAP Engine"
        badge={badge}
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

        {/* Col 2: テンプレ一覧 または アドオンパネル */}
        <div className={s.secondaryCol}>
          {selectedGroup === null ? (
            <div className={s.secondaryEmpty} aria-hidden="true" />
          ) : selectedScenario ? (
            <AddonPanel
              key={selectedScenarioId}
              scenario={selectedScenario}
              group={selectedGroup}
            />
          ) : (
            <TemplateListPanel
              key={selectedGroup}
              group={selectedGroup}
              scenarios={groupScenarios}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={handleSelectScenario}
            />
          )}
        </div>

        {/* Col 3: ThirdPanel */}
        <ThirdPanel
          selectedGroup={selectedGroup}
          currentSPrefix={sPrefix}
          currentSStatus={sStatus}
          onSAction={handleSToggle}
          searchValue={search}
          onSearchChange={setSearch}
          suggestions={suggestions}
          onSelectSuggestion={handleSelectSuggestion}
          onSubcategorySelect={handleSubcategorySelect}
        />

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
