'use client'

import type { MenuGroup } from '../../lib/menuGroups'
import { MENU_GROUP_ORDER } from '../../lib/menuGroups'
import s from '../styles/layout.module.css'

// 大分類ごとのアクセントカラー（アクティブ時の左ボーダー・文字色）
const GROUP_ACCENT: Record<MenuGroup, string> = {
  '初回':                 '#0a84ff',
  '増量':                 '#34aadc',
  '減量':                 '#30d158',
  '副作用なし':           '#8e8ea0',
  '副作用あり':           '#ff453a',
  'コンプライアンス良好': '#30d158',
  'コンプライアンス不良': '#ff9f0a',
  '自己調整':             '#bf5af2',
  '終了':                 '#6b6b8a',
  'その他':               '#4a4a6a',
}

interface SidebarProps {
  /** テンプレが存在するグループのみ（0件グループは非表示） */
  availableGroups: Set<MenuGroup>
  selectedGroup: MenuGroup | null
  onSelectGroup: (group: MenuGroup) => void
}

export default function Sidebar({
  availableGroups,
  selectedGroup,
  onSelectGroup,
}: SidebarProps) {
  return (
    <nav className={s.sidebar} aria-label="カテゴリ選択">
      {MENU_GROUP_ORDER.filter(g => availableGroups.has(g)).map(group => {
        const isActive = group === selectedGroup
        const accent = GROUP_ACCENT[group]
        return (
          <button
            key={group}
            className={[s.menuGroupBtn, isActive ? s.menuGroupBtnActive : ''].join(' ')}
            style={
              isActive
                ? { borderLeftColor: accent, color: accent, background: `${accent}18` }
                : undefined
            }
            onClick={() => onSelectGroup(group)}
            aria-pressed={isActive}
          >
            {group}
          </button>
        )
      })}
    </nav>
  )
}
