'use client'

import { useMemo, useState, useCallback } from 'react'

import type { ModuleData, SoapKey, SoapFields } from '../../lib/types'
import { buildSoap, buildAddonMap } from '../../lib/buildSoap'
import {
  buildSearchIndex,
  filterTemplates,
  getSuggestions,
} from '../../lib/search'

import Topbar from './Topbar'
import Sidebar from './Sidebar'
import SecondaryPanel from './SecondaryPanel'
import SoapEditor from './SoapEditor'

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
// クライアント側の状態管理・UIオーケストレーター
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeAddonIds, setActiveAddonIds] = useState<Set<string>>(new Set())
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})

  // ── 選択中テンプレート ───────────────────────────────────
  const selectedTemplate = moduleData.templates.find(
    t => t.templateId === selectedId,
  )

  // ── SOAP フィールドの計算 ────────────────────────────────
  const computedFields = selectedTemplate
    ? buildSoap(selectedTemplate, activeAddonIds, addonMap)
    : EMPTY_FIELDS

  const fields: SoapFields = {
    S: manualFields.S ?? computedFields.S,
    O: manualFields.O ?? computedFields.O,
    A: manualFields.A ?? computedFields.A,
    P: manualFields.P ?? computedFields.P,
  }

  // ── イベントハンドラ ─────────────────────────────────────

  const handleSelectTemplate = useCallback((id: string) => {
    setSelectedId(id)
    setActiveAddonIds(new Set())
    setManualFields({})
  }, [])

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

  // サジェストから選択: テンプレを選択状態にしてクエリをリセット
  const handleSelectSuggestion = useCallback((templateId: string) => {
    handleSelectTemplate(templateId)
    setSearch('')
  }, [handleSelectTemplate])

  // ── 検索フィルタ（正規化済み） ──────────────────────────
  const filteredTemplates = useMemo(
    () => filterTemplates(moduleData.templates, search, searchIndex),
    [moduleData.templates, search, searchIndex],
  )

  // ── サジェスト候補 ───────────────────────────────────────
  const suggestions = useMemo(
    () => getSuggestions(search, searchIndex),
    [search, searchIndex],
  )

  // ── 表示用メタデータ ─────────────────────────────────────
  const badge = moduleData.categoryPath?.[1]

  // ── SecondaryPanel に渡すアドオン一覧 ───────────────────
  const templateAddons = selectedTemplate
    ? selectedTemplate.addonIds
        .map(id => addonMap.get(id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined)
    : []

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
      />

      <div className={s.body}>
        {/* Col 1: Primary サイドバー（Accordion） */}
        <Sidebar
          templates={filteredTemplates}
          selectedId={selectedId}
          onSelect={handleSelectTemplate}
          isSearching={search.trim().length > 0}
        />

        {/* Col 2: Secondary パネル */}
        <div className={s.secondaryCol}>
          {selectedTemplate ? (
            <SecondaryPanel
              key={selectedId}
              template={selectedTemplate}
              addons={templateAddons}
              activeAddonIds={activeAddonIds}
              onToggleAddon={handleToggleAddon}
            />
          ) : (
            <div className={s.secondaryEmpty} aria-hidden="true">←</div>
          )}
        </div>

        {/* Col 3: スペーサー（大画面のみ） */}
        <div className={s.center} aria-hidden="true" />

        {/* Col 4: SOAP エディター */}
        <SoapEditor fields={fields} onChange={handleFieldChange} />
      </div>
    </div>
  )
}
