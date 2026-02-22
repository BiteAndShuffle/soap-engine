'use client'

import type { Template } from '../../lib/types'
import { templateTypeToColor } from '../../lib/buildSoap'
import s from '../styles/layout.module.css'

// テンプレートタイプ → primaryBtn のカラークラスのマッピング
const TYPE_TO_PRIMARY: Record<string, string> = {
  base:      s.primaryNeutral,
  followup:  s.primaryPositive,
  situation: s.primaryNegative,
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
        const colorClass = TYPE_TO_PRIMARY[tpl.type] ?? s.primaryNeutral
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
