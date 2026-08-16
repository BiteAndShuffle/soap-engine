'use client'

import type { AddonsData, AddonItem } from '../../lib/types'
import { buildSubClusters } from '../../lib/addonSubGroups'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// グループ見出しラベル定義
//
// 表示順はコード側で固定・補正しない。scenario.addonsRef.P（JSON配列順）
// に最初に登場したグループの順序をそのまま使用する（groupMap の Map挿入順）。
// ─────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  counseling:  '服薬指導',
  oral:        '内服アドオン',
  sickday:     'シックデイ',
  sideEffects: '副作用',
}

// ─────────────────────────────────────────────────────────────
// サブグループ枠の CSS クラス割当
//
// クラスタ分割ロジック（uiGroup 優先 / getSubGroupLabel へ fallback）は
// lib/addonSubGroups.ts が持つ。本ファイルは描画のみを担当する。
//
// Record にすることで variant 追加時の分岐漏れを型で検出する。
// ─────────────────────────────────────────────────────────────

const VARIANT_CLASS: Record<
  NonNullable<AddonItem['uiVariant']>,
  { group: string; label: string }
> = {
  rightAccentBlue: { group: s.addonSubGroupBlue, label: s.addonSubGroupLabelBlue },
  rightAccentLavender: { group: s.addonSubGroupLavender, label: s.addonSubGroupLabelLavender },
  rightAccentAmber: { group: s.addonSubGroupAmber, label: s.addonSubGroupLabelAmber },
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

  // 表示順: JSON（addonsRef.P）内で最初に登場したグループ順（Map挿入順）
  const orderedGroups = [...groupMap.keys()]

  return (
    <div className={s.addonPanel}>
      <div className={s.addonPanelHeading}>アドオン</div>
      <div className={s.addonPanelNote}>ON/OFF すると該当欄を再構成します</div>
      {orderedGroups.map(group => {
        const entries = groupMap.get(group)!
        const label = GROUP_LABELS[group] ?? group
        const clusters = buildSubClusters(entries)

        return (
          <div key={group} className={s.addonCategory}>
            <div className={s.addonCategoryLabel}>{label}</div>
            {clusters.map((cluster, ci) => {
              if (cluster.uiVariant) {
                // uiVariant あり → 枠付きサブグループとして表示
                const variant = VARIANT_CLASS[cluster.uiVariant]
                const groupCls = [s.addonSubGroup, variant.group].join(' ')
                const labelCls = [s.addonSubGroupLabel, variant.label].join(' ')
                return (
                  <div key={ci} className={groupCls}>
                    {cluster.label && (
                      <div className={labelCls}>{cluster.label}</div>
                    )}
                    {cluster.entries.map(([fullKey, item]) => {
                      const isActive = selectedAddonIds.has(fullKey)
                      return (
                        <button
                          key={fullKey}
                          className={[s.addonBtn, isActive ? s.addonBtnActive : ''].filter(Boolean).join(' ')}
                          onClick={() => onToggle(fullKey, item.text)}
                          aria-pressed={isActive}
                          title={item.text}
                        >
                          <span className={s.addonBtnText}>{item.title ?? item.text}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              }

              // uiVariant なし → 通常ボタン（枠なし）
              return cluster.entries.map(([fullKey, item]) => {
                const isActive = selectedAddonIds.has(fullKey)
                return (
                  <button
                    key={fullKey}
                    className={[s.addonBtn, isActive ? s.addonBtnActive : ''].filter(Boolean).join(' ')}
                    onClick={() => onToggle(fullKey, item.text)}
                    aria-pressed={isActive}
                    title={item.text}
                  >
                    <span className={s.addonBtnText}>{item.title ?? item.text}</span>
                  </button>
                )
              })
            })}
          </div>
        )
      })}
    </div>
  )
}
