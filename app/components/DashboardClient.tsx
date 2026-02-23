'use client'

import { useMemo, useState, useCallback } from 'react'

import type { ModuleData, SoapKey, SoapFields, PinnedSoap } from '../../lib/types'
import { buildSoap, buildAddonMap } from '../../lib/buildSoap'
import { buildSearchIndex, getSuggestions } from '../../lib/search'
import { type MenuGroup, groupByMenuGroup, getMenuGroup } from '../../lib/menuGroups'

import Topbar, { type RouteFilter } from './Topbar'
import Sidebar from './Sidebar'
import { TemplateListPanel, AddonPanel } from './SecondaryPanel'
import SoapEditor from './SoapEditor'

import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }
const PIN_LIMIT = 5

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
  // ── アドオン Map ─────────────────────────────────────────
  const addonMap = useMemo(
    () => buildAddonMap(moduleData.addons),
    [moduleData.addons],
  )

  // ── 検索インデックス（マウント時に1回だけ構築）──────────
  const searchIndex = useMemo(
    () => buildSearchIndex(moduleData),
    [moduleData],
  )

  // ── 状態 ──────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [activeAddonIds, setActiveAddonIds] = useState<Set<string>>(new Set())
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})
  const [pinnedSoaps, setPinnedSoaps] = useState<PinnedSoap[]>([])

  // ── 選択中テンプレート ───────────────────────────────────
  const selectedTemplate = moduleData.templates.find(
    t => t.templateId === selectedTemplateId,
  )

  // ── SOAP フィールド ──────────────────────────────────────
  const computedFields = selectedTemplate
    ? buildSoap(selectedTemplate, activeAddonIds, addonMap)
    : EMPTY_FIELDS

  const fields: SoapFields = {
    S: manualFields.S ?? computedFields.S,
    O: manualFields.O ?? computedFields.O,
    A: manualFields.A ?? computedFields.A,
    P: manualFields.P ?? computedFields.P,
  }

  // ── グループ構造 ─────────────────────────────────────────
  const allGroups = useMemo(
    () => groupByMenuGroup(moduleData.templates),
    [moduleData.templates],
  )
  const availableGroups = useMemo<Set<MenuGroup>>(
    () => new Set(allGroups.map(g => g.group)),
    [allGroups],
  )
  // 選択中グループのテンプレ一覧
  const groupTemplates = useMemo(
    () => allGroups.find(g => g.group === selectedGroup)?.templates ?? [],
    [allGroups, selectedGroup],
  )

  // ── サジェスト候補 ───────────────────────────────────────
  const suggestions = useMemo(
    () => getSuggestions(search, searchIndex),
    [search, searchIndex],
  )

  // ── 表示用メタデータ ─────────────────────────────────────
  const badge = moduleData.categoryPath?.[1]

  // ── アドオン一覧 ─────────────────────────────────────────
  const templateAddons = selectedTemplate
    ? selectedTemplate.addonIds
        .map(id => addonMap.get(id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined)
    : []

  // ── イベントハンドラ ─────────────────────────────────────

  // 大分類選択: テンプレ選択・アドオンをリセット
  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    setSelectedTemplateId(null)
    setActiveAddonIds(new Set())
    setManualFields({})
  }, [])

  // テンプレ選択（中央パネル or サジェスト）
  // サジェスト経由の場合はグループも自動で合わせる
  const handleSelectTemplate = useCallback((id: string) => {
    const tpl = moduleData.templates.find(t => t.templateId === id)
    if (tpl) setSelectedGroup(getMenuGroup(tpl.type))
    setSelectedTemplateId(id)
    setActiveAddonIds(new Set())
    setManualFields({})
  }, [moduleData.templates])

  // サジェスト確定
  const handleSelectSuggestion = useCallback((templateId: string) => {
    handleSelectTemplate(templateId)
    setSearch('')
  }, [handleSelectTemplate])

  const handleToggleAddon = useCallback((addonId: string) => {
    setActiveAddonIds(prev => {
      const next = new Set(prev)
      next.has(addonId) ? next.delete(addonId) : next.add(addonId)
      return next
    })
    setManualFields({})
  }, [])

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    setManualFields(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── ピン機能 ─────────────────────────────────────────────
  const handlePin = useCallback(() => {
    if (!selectedTemplate) return
    const snapshot: PinnedSoap = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      templateLabel: selectedTemplate.label,
      fields: { ...fields },
    }
    setPinnedSoaps(prev => [...prev, snapshot].slice(-PIN_LIMIT))
  }, [selectedTemplate, fields])

  const handleUnpin = useCallback((id: string) => {
    setPinnedSoaps(prev => prev.filter(p => p.id !== id))
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
            <div className={s.secondaryEmpty} aria-hidden="true">←</div>
          ) : selectedTemplate ? (
            <AddonPanel
              key={selectedTemplateId}
              template={selectedTemplate}
              addons={templateAddons}
              activeAddonIds={activeAddonIds}
              onToggleAddon={handleToggleAddon}
            />
          ) : (
            <TemplateListPanel
              key={selectedGroup}
              group={selectedGroup}
              templates={groupTemplates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleSelectTemplate}
            />
          )}
        </div>

        {/* Col 3: スペーサー（大画面のみ） */}
        <div className={s.center} aria-hidden="true" />

        {/* Col 4: SOAP エディター（幅5/3倍） */}
        <SoapEditor
          fields={fields}
          onChange={handleFieldChange}
          templateLabel={selectedTemplate?.label ?? ''}
          pinnedSoaps={pinnedSoaps}
          onPin={handlePin}
          onUnpin={handleUnpin}
        />
      </div>
    </div>
  )
}
