'use client'

import type { AddonsData, AddonItem } from '../../lib/types'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// グループ表示順・ラベル定義
// ─────────────────────────────────────────────────────────────

const GROUP_ORDER: string[] = ['counseling', 'oral', 'sickday', 'sideEffects']

const GROUP_LABELS: Record<string, string> = {
  counseling:  '服薬指導',
  oral:        '内服アドオン',
  sickday:     'シックデイ',
  sideEffects: '副作用',
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface AddonPanelProps {
  addons: AddonsData
  /**
   * 選択中のアドオンキー集合。
   * キーは addons.items の "group:id" 形式（例: "counseling:counseling_1"）。
   */
  selectedAddonIds: Set<string>
  /** キーとテキストを渡すトグルコールバック */
  onToggle: (addonKey: string, text: string) => void
  /**
   * シナリオに対応するアドオンキー（addonsRef から解決済み）。
   * 指定された場合はそのキーのみ表示する。未指定時は全件表示。
   */
  visibleKeys?: string[]
}

// ─────────────────────────────────────────────────────────────
// AddonPanel — テンプレ選択時にセカンドパネル直下に表示
// panel_2 固定レンダリング。ReactキーはaddonsのフルキーID。
// ─────────────────────────────────────────────────────────────

export default function AddonPanel({
  addons,
  selectedAddonIds,
  onToggle,
  visibleKeys,
}: AddonPanelProps) {
  // 表示するアイテムを決定
  const itemEntries: [string, AddonItem][] = visibleKeys
    ? visibleKeys
        .map(k => [k, addons.items[k]] as [string, AddonItem])
        .filter(([, item]) => Boolean(item))
    : Object.entries(addons.items)

  if (itemEntries.length === 0) return null

  // グループ別に分類
  const groupMap = new Map<string, [string, AddonItem][]>()
  for (const entry of itemEntries) {
    const [, item] = entry
    const group = item.group
    if (!groupMap.has(group)) groupMap.set(group, [])
    groupMap.get(group)!.push(entry)
  }

  // 表示順: GROUP_ORDER に従い、未定義グループは末尾に追加
  const knownGroups = GROUP_ORDER.filter(g => groupMap.has(g))
  const unknownGroups = [...groupMap.keys()].filter(g => !GROUP_ORDER.includes(g))
  const orderedGroups = [...knownGroups, ...unknownGroups]

  return (
    <div className={s.addonPanel}>
      <div className={s.addonPanelHeading}>アドオン</div>
      {orderedGroups.map(group => {
        const entries = groupMap.get(group)!
        const label = GROUP_LABELS[group] ?? group
        return (
          <div key={group} className={s.addonCategory}>
            <div className={s.addonCategoryLabel}>{label}</div>
            {entries.map(([fullKey, item]) => {
              const isActive = selectedAddonIds.has(fullKey)
              return (
                <button
                  key={fullKey}
                  className={[s.addonBtn, isActive ? s.addonBtnActive : ''].join(' ')}
                  onClick={() => onToggle(fullKey, item.text)}
                  aria-pressed={isActive}
                  title={item.text}
                >
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
