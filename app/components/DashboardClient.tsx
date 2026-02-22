'use client'

import { useMemo, useState, useCallback } from 'react'

import type { ModuleData, SoapKey, SoapFields } from '../../lib/types'
import { buildSoap, buildAddonMap } from '../../lib/buildSoap'

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
// Props（Server Component から渡されるシリアライズ可能なデータ）
// ─────────────────────────────────────────────────────────────

interface DashboardClientProps {
  moduleData: ModuleData
}

// ─────────────────────────────────────────────────────────────
// クライアント側の状態管理・UIオーケストレーター
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ moduleData }: DashboardClientProps) {
  // ── アドオン Map（レンダリングをまたいで再生成しない）──────
  const addonMap = useMemo(
    () => buildAddonMap(moduleData.addons),
    [moduleData.addons],
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

  // 手動編集がある場合は優先（テンプレ/アドオン切替時にリセット）
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

  // ── 検索フィルタ ─────────────────────────────────────────
  const trimmedSearch = search.trim()
  const filteredTemplates = trimmedSearch
    ? moduleData.templates.filter(
        t => t.label.includes(trimmedSearch) || t.type.includes(trimmedSearch),
      )
    : moduleData.templates

  // ── 表示用メタデータ ─────────────────────────────────────
  const badge = moduleData.categoryPath?.[1]

  // ── SecondaryPanel に渡すアドオン一覧（テンプレ定義順）──
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
      />

      <div className={s.body}>
        {/* Col 1: Primary サイドバー */}
        <Sidebar
          templates={filteredTemplates}
          selectedId={selectedId}
          onSelect={handleSelectTemplate}
        />

        {/* Col 2: Secondary パネル
            key={selectedId} を SecondaryPanel 自体に渡す。
            親レンダー内で key が変わると React が完全再マウントし、
            CSS スライドイン アニメーションが確実に再生される。 */}
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
