'use client'

import { useState } from 'react'
import type { Template } from '../../lib/types'
import { templateTypeToColor } from '../../lib/buildSoap'
import { groupTemplates, GROUP_ORDER, type GroupKey } from '../../lib/search'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 色マッピング（buildSoap.ts が唯一の判定ロジック）
// ─────────────────────────────────────────────────────────────

function resolveColorClass(type: string): string {
  const colorKey = templateTypeToColor(type)
  switch (colorKey) {
    case 'blue':   return s.primaryNeutral
    case 'green':  return s.primaryPositive
    case 'red':    return s.primaryNegative
    case 'orange': return s.primaryOrange
    case 'purple': return s.primaryPurple
    case 'gray':   return s.primaryGray
    default:       return s.primaryGray
  }
}

// グループ見出しのアクセント色（左ボーダー）
const GROUP_ACCENT: Record<GroupKey, string> = {
  '導入・増量': '#0a84ff',
  '減量':       '#30d158',
  '副作用':     '#ff453a',
  'コンプライアンス': '#8e8ea0',
  '終了/中止':  '#bf5af2',
  '生活指導':   '#8e8ea0',
  'シックデイ': '#ff9f0a',
  'その他':     '#6b6b8a',
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface SidebarProps {
  templates: Template[]       // 検索フィルタ済みのテンプレ一覧
  selectedId: string | null
  onSelect: (id: string) => void
  /** 検索中（クエリあり）は全グループを強制展開する */
  isSearching: boolean
}

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────

export default function Sidebar({
  templates,
  selectedId,
  onSelect,
  isSearching,
}: SidebarProps) {
  // 初期状態: 選択中テンプレが属するグループのみ展開、あとは閉じる
  const [openGroups, setOpenGroups] = useState<Set<GroupKey>>(() => {
    const initial = new Set<GroupKey>()
    // デフォルトで最初のグループ（導入・増量）を開く
    initial.add(GROUP_ORDER[0])
    return initial
  })

  function toggleGroup(key: GroupKey) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const groups = groupTemplates(templates)

  return (
    <nav className={s.sidebar} aria-label="テンプレート選択">
      {groups.map(({ groupKey, templates: tpls }) => {
        // 検索中は強制展開
        const isOpen = isSearching || openGroups.has(groupKey)
        const accent = GROUP_ACCENT[groupKey]
        // グループ内に選択中テンプレがある場合、見出しにも active マーカー
        const hasActive = tpls.some(t => t.templateId === selectedId)

        return (
          <div key={groupKey} className={s.accordionGroup}>
            {/* ── グループ見出し ── */}
            <button
              className={[
                s.accordionHeader,
                hasActive && !isOpen ? s.accordionHeaderHasActive : '',
              ].join(' ')}
              style={{ borderLeftColor: accent }}
              onClick={() => toggleGroup(groupKey)}
              aria-expanded={isOpen}
            >
              <span className={s.accordionLabel}>{groupKey}</span>
              <span className={s.accordionMeta}>
                <span className={s.accordionCount}>{tpls.length}</span>
                <span
                  className={[
                    s.accordionChevron,
                    isOpen ? s.accordionChevronOpen : '',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  ›
                </span>
              </span>
            </button>

            {/* ── 子テンプレボタン一覧 ── */}
            {isOpen && (
              <div className={s.accordionBody}>
                {tpls.map(tpl => {
                  const colorClass = resolveColorClass(tpl.type)
                  const isActive = tpl.templateId === selectedId
                  return (
                    <button
                      key={tpl.templateId}
                      className={[
                        s.primaryBtn,
                        colorClass,
                        isActive ? s.primaryActive : '',
                      ].join(' ')}
                      onClick={() => onSelect(tpl.templateId)}
                      aria-pressed={isActive}
                      title={tpl.label}
                    >
                      {tpl.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
