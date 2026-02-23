'use client'

import type { Template } from '../../lib/types'
import { templateTypeToColor } from '../../lib/buildSoap'
import s from '../styles/layout.module.css'

// templateTypeToColor() の戻り値 → primaryBtn カラークラス
// buildSoap.ts を唯一の色判定ロジックとして使用する。
// TYPE_TO_PRIMARY は廃止済み（旧スキーマの type 値に依存していたため）。
function resolveColorClass(type: string): string {
  const colorKey = templateTypeToColor(type)
  switch (colorKey) {
    case 'blue':   return s.primaryNeutral
    case 'green':  return s.primaryPositive
    case 'red':    return s.primaryNegative
    case 'orange': return s.primaryOrange
    case 'purple': return s.primaryPurple
    case 'gray':   return s.primaryGray
    default:       return s.primaryGray   // 未知 type は gray にフォールバック
  }
}

interface SidebarProps {
  templates: Template[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function Sidebar({ templates, selectedId, onSelect }: SidebarProps) {
  return (
    <nav className={s.sidebar} aria-label="テンプレート選択">
      {templates.map(tpl => {
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
    </nav>
  )
}
