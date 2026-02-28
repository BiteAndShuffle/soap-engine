'use client'

import { useMemo, useState, useCallback } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock } from '../../lib/types'
import { buildSoap, buildAddonMap, mergeBlocks } from '../../lib/buildSoap'
import { buildSearchIndex, getSuggestions } from '../../lib/search'
import { type MenuGroup, groupByMenuGroup, getMenuGroup } from '../../lib/menuGroups'

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

  /**
   * S欄トグル状態（接頭句 / 症状ステータス）。
   * テンプレ切替時にデフォルト値（none / stable）にリセット。
   */
  const [sPrefix, setSPrefix] = useState<SPrefix>('none')
  const [sStatus, setSStatus] = useState<SStatus>('stable')

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
  // 【SSOT二重保証】groupByMenuGroup() の結果をそのまま使うのに加え、
  // getMenuGroup(tpl.type) === selectedGroup の完全一致で再フィルタする。
  // これにより groupByMenuGroup() 側のバグや型の不一致があっても混入を防ぐ。
  const groupTemplates = useMemo(() => {
    if (!selectedGroup) return []
    const raw = allGroups.find(g => g.group === selectedGroup)?.templates ?? []
    // SSOT完全一致フィルタ（includes/部分一致禁止）
    const filtered = raw.filter(t => getMenuGroup(t.type) === selectedGroup)
    // DEV: 混入検出ログ
    if (process.env.NODE_ENV !== 'production') {
      const seA = allGroups.find(g => g.group === '副作用あり')?.templates ?? []
      const seN = allGroups.find(g => g.group === '副作用なし')?.templates ?? []
      console.debug(
        '[SOAP] groupTemplates debug\n',
        '副作用あり raw:',
        seA.slice(0, 30).map(t => ({
          id: t.templateId,
          title: t.label,
          type: t.type,
          getMenuGroup: getMenuGroup(t.type),
        })),
        '\n副作用なし raw:',
        seN.slice(0, 30).map(t => ({
          id: t.templateId,
          title: t.label,
          type: t.type,
          getMenuGroup: getMenuGroup(t.type),
        })),
      )
      // 混入検出: 副作用あり配列内に getMenuGroup==='副作用なし' があれば警告
      const contamA = seA.filter(t => getMenuGroup(t.type) === '副作用なし')
      const contamN = seN.filter(t => getMenuGroup(t.type) === '副作用あり')
      if (contamA.length > 0)
        console.warn('[SOAP] ⚠️ 副作用ありに副作用なしが混入:', contamA.map(t => ({ id: t.templateId, type: t.type })))
      if (contamN.length > 0)
        console.warn('[SOAP] ⚠️ 副作用なしに副作用ありが混入:', contamN.map(t => ({ id: t.templateId, type: t.type })))
      // SSOT後フィルタとの差分を表示
      if (selectedGroup === '副作用あり' || selectedGroup === '副作用なし') {
        const removed = raw.filter(t => getMenuGroup(t.type) !== selectedGroup)
        if (removed.length > 0)
          console.warn('[SOAP] ⚠️ SSOTフィルタで除外されたテンプレ:', removed.map(t => ({ id: t.templateId, type: t.type, getMenuGroup: getMenuGroup(t.type) })))
      }
    }
    return filtered
  }, [allGroups, selectedGroup])

  // ── サジェスト候補 ───────────────────────────────────────
  // 【仕様】選択中グループが設定されている場合は、
  //         groupLabel が selectedGroup と完全一致するもののみ返す。
  //         （副作用あり ↔ 副作用なし の混入を含む全グループ間の混在を防ぐ）
  //         グループ未選択時は全候補を返す。
  const suggestions = useMemo(() => {
    const raw = getSuggestions(search, searchIndex)
    if (!selectedGroup) return raw
    return raw.filter(item => item.groupLabel === selectedGroup)
  }, [search, searchIndex, selectedGroup])

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
    setSPrefix('none')
    setSStatus('stable')
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
    setSPrefix('none')
    setSStatus('stable')
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

  // ── 診療領域サブカテゴリ選択: 検索窓に語を投入 ─────────
  const handleSubcategorySelect = useCallback((label: string) => {
    setSearch(label)
  }, [])

  // ── S欄トグル操作 ────────────────────────────────────────
  /**
   * prefix または status が変更された時:
   * 1. 新しいS先頭文を生成
   * 2. 現在のS欄の先頭文を差し替え（2文目以降は保持）
   * 3. manualFields.S に書き込む（即時反映）
   */
  const handleSToggle = useCallback((prefix: SPrefix, status: SStatus) => {
    setSPrefix(prefix)
    setSStatus(status)
    const newFirst = buildSFirstSentence(prefix, status)
    const currentS = fields.S
    const updated = replaceSFirstSentence(currentS, newFirst)
    setManualFields(prev => ({ ...prev, S: updated }))
  }, [fields.S])

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
    setSPrefix('none')
    setSStatus('stable')
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

        {/* Col 3: ThirdPanel（常設・中身は条件に応じて出し分け） */}
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

        {/* Col 4: SOAPエディター（右端・約1/2幅） */}
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
