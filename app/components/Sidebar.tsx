'use client'

import type { MenuGroup } from '../../lib/menuGroups'
import { MENU_GROUP_ORDER } from '../../lib/menuGroups'
import s from '../styles/layout.module.css'

// 大分類ごとのアクセントカラー（アクティブ時の左ボーダー・文字色）
const GROUP_ACCENT: Record<MenuGroup, string> = {
  '初回':                 '#0a84ff',
  '増量':                 '#34aadc',
  '減量':                 '#30d158',
  '副作用あり':           '#ff453a',
  '副作用なし':           '#8e8ea0',
  'コンプライアンス良好': '#30d158',
  'コンプライアンス不良': '#ff9f0a',
  '自己調整':             '#bf5af2',
  '終了':                 '#6b6b8a',
  'その他':               '#4a4a6a',
}

interface SidebarProps {
  /** テンプレが存在するグループ（0件グループは非活性表示） */
  availableGroups: Set<MenuGroup>
  selectedGroup: MenuGroup | null
  onSelectGroup: (group: MenuGroup) => void
  /**
   * 合成ノード選択中かどうか。
   * non-null の場合、Sidebar 上部に「ノード操作中」バナーを表示する。
   */
  selectedNodeId?: string | null
  /** ノード選択を解除するコールバック（バナーのタップ/クリック） */
  onDeselectNode?: () => void
}

export default function Sidebar({
  availableGroups,
  selectedGroup,
  onSelectGroup,
  selectedNodeId,
  onDeselectNode,
}: SidebarProps) {
  const isNodeMode = selectedNodeId !== null && selectedNodeId !== undefined

  return (
    <nav className={s.sidebar} aria-label="カテゴリ選択">
      {/* ── ノード操作中バナー（横1行・最小高） ── */}
      {isNodeMode && (
        <div className={s.sidebarNodeModeBanner}>
          <span className={s.sidebarNodeModeBannerText}>合成薬を編集中</span>
          <button
            className={s.sidebarNodeModeExitBtn}
            onClick={onDeselectNode}
            title="1剤目の操作に戻る"
          >
            ← 戻る
          </button>
        </div>
      )}

      {/* メニューボタン群: flex:1 コンテナで space-evenly */}
      <div className={s.sidebarMenuList}>
        {MENU_GROUP_ORDER.map(group => {
          const isActive = group === selectedGroup
          const hasTemplates = availableGroups.has(group)
          const accent = GROUP_ACCENT[group]
          return (
            <button
              key={group}
              className={[
                s.menuGroupBtn,
                isActive ? s.menuGroupBtnActive : '',
                !hasTemplates ? s.menuGroupBtnEmpty : '',
              ].join(' ')}
              style={
                isActive
                  ? { borderLeftColor: accent, color: accent, background: `${accent}18` }
                  : undefined
              }
              onClick={() => hasTemplates && onSelectGroup(group)}
              aria-pressed={isActive}
              aria-disabled={!hasTemplates}
              title={!hasTemplates ? `${group}（データなし）` : group}
            >
              {group}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
