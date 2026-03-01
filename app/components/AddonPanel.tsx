'use client'

import type { AddonsMap, AddonItem } from '../../lib/types'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// アドオンカテゴリ定義（表示順・ラベル）
// ─────────────────────────────────────────────────────────────

interface AddonCategory {
  key: keyof AddonsMap
  label: string
}

const ADDON_CATEGORIES: AddonCategory[] = [
  { key: 'counseling', label: '服薬指導' },
  { key: 'oral',       label: '内服アドオン' },
  { key: 'sickday',    label: 'シックデイ' },
  { key: 'sideEffects', label: '副作用' },
]

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface AddonPanelProps {
  addons: AddonsMap
  selectedAddonIds: Set<string>
  onToggle: (addonId: string, text: string) => void
}

// ─────────────────────────────────────────────────────────────
// AddonPanel — テンプレ選択時にセカンドパネル直下に表示
// ─────────────────────────────────────────────────────────────

export default function AddonPanel({
  addons,
  selectedAddonIds,
  onToggle,
}: AddonPanelProps) {
  // 表示するカテゴリ（アイテムが1件以上あるもの）
  const visibleCategories = ADDON_CATEGORIES.filter(
    cat => (addons[cat.key]?.length ?? 0) > 0,
  )

  if (visibleCategories.length === 0) return null

  return (
    <div className={s.addonPanel}>
      <div className={s.addonPanelHeading}>アドオン</div>
      {visibleCategories.map(cat => {
        const items = addons[cat.key] as AddonItem[]
        return (
          <div key={cat.key} className={s.addonCategory}>
            <div className={s.addonCategoryLabel}>{cat.label}</div>
            {items.map(item => {
              const isActive = selectedAddonIds.has(item.id)
              return (
                <button
                  key={item.id}
                  className={[s.addonBtn, isActive ? s.addonBtnActive : ''].join(' ')}
                  onClick={() => onToggle(item.id, item.text)}
                  aria-pressed={isActive}
                  title={item.text}
                >
                  {/* テキストを省略表示（ツールチップで全文確認） */}
                  <span className={s.addonBtnText}>{item.text}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
