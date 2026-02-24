'use client'

import { useMemo, useState, useCallback } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock } from '../../lib/types'
import { buildSoap, buildAddonMap, mergeBlocks } from '../../lib/buildSoap'
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

  /**
   * manualFields: ユーザーが手動編集した内容。
   * 保持後の合成済みテキストもここに格納される。
   * テンプレ切替時にリセット（保持していない場合）。
   */
  const [manualFields, setManualFields] = useState<Partial<SoapFields>>({})

  /**
   * mergedBlocks: 「保持」済みのSOAPブロック一覧。
   * 保持ボタンを押すたびに現在のSOAPをここに追加する。
   * テンプレ切替でリセットしない（保持内容を維持する）。
   */
  const [mergedBlocks, setMergedBlocks] = useState<MergedBlock[]>([])

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

  // 大分類選択: テンプレ選択・アドオンをリセット（mergedBlocksは維持）
  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    setSelectedTemplateId(null)
    setActiveAddonIds(new Set())
    setManualFields({})
  }, [])

  // テンプレ選択（secondaryパネル or サジェスト）
  // mergedBlocks が空の場合 → SOAP欄をリセット（上書き）
  // mergedBlocks が1件以上ある場合 → 保持済みを維持しつつ新テンプレを表示
  const handleSelectTemplate = useCallback((id: string) => {
    const tpl = moduleData.templates.find(t => t.templateId === id)
    if (tpl) setSelectedGroup(getMenuGroup(tpl.type))
    setSelectedTemplateId(id)
    setActiveAddonIds(new Set())
    setManualFields({})
    // ※ mergedBlocks はリセットしない（保持内容を維持）
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

  // ── 保持（合成）機能 ─────────────────────────────────────
  /**
   * 「保持」ボタン押下:
   * 1. 現在のSOAP内容を mergedBlocks に追加
   * 2. 合成済みテキスト（全ブロック + 現在）を manualFields に書き込む
   * 3. これにより S/O/A/P テキストエリアに合成結果が反映される
   */
  const handleMerge = useCallback(() => {
    if (!selectedTemplate) return

    const currentLabel = selectedTemplate.label
    const currentFields = { ...fields }

    const newBlock: MergedBlock = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      templateLabel: currentLabel,
      fields: currentFields,
    }

    const updatedBlocks = [...mergedBlocks, newBlock]
    setMergedBlocks(updatedBlocks)

    // 合成済みフィールドを manualFields に書き込む
    // → テキストエリアに全ブロックの連結テキストが表示される
    const merged = mergeBlocks(
      updatedBlocks.slice(0, -1), // newBlock は currentFields として渡す
      currentFields,
      currentLabel,
    )
    setManualFields({ S: merged.S, O: merged.O, A: merged.A, P: merged.P })

    // テンプレ選択は解除して「合成済み編集状態」にする
    setSelectedTemplateId(null)
    setSelectedGroup(null)
    setActiveAddonIds(new Set())
  }, [selectedTemplate, fields, mergedBlocks])

  /**
   * 合成リセット: 全ブロックを破棄してSOAPをクリア
   */
  const handleResetMerge = useCallback(() => {
    setMergedBlocks([])
    setManualFields({})
    setSelectedTemplateId(null)
    setSelectedGroup(null)
    setActiveAddonIds(new Set())
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

        {/* Col 2: スペーサー（大画面のみ） */}
        <div className={s.center} aria-hidden="true" />

        {/* Col 3: テンプレ一覧 または アドオンパネル（SOAPの左隣） */}
        <div className={s.secondaryCol}>
          {selectedGroup === null ? (
            <div className={s.secondaryEmpty} aria-hidden="true" />
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

        {/* Col 4: SOAP エディター */}
        <SoapEditor
          fields={fields}
          onChange={handleFieldChange}
          templateLabel={selectedTemplate?.label ?? ''}
          mergedBlockCount={mergedBlocks.length}
          onMerge={handleMerge}
          onResetMerge={handleResetMerge}
          canMerge={!!selectedTemplate}
        />
      </div>
    </div>
  )
}
