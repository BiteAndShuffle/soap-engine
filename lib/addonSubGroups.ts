/**
 * addonSubGroups.ts — AddonPanel のサブグループ（枠付き小分類）決定ロジック
 *
 * AddonPanel.tsx は CSS module を import するため、node の test runner から
 * 直接読み込めない。表示に依存しない純ロジックのみを本ファイルへ置き、
 * AddonPanel は描画（CSS クラス割当）だけを担当する。
 *
 * ── サブグループの決定 ────────────────────────────────────────────
 *
 * 枠の「色」は `uiVariant`、枠の「意味と見出し文言」は `uiGroup` が決める。
 * 両者は独立であり、同じ色でも意味が異なれば別サブグループになる。
 *
 * `uiGroup` は canonical へ段階的に導入される optional field である。
 * 未定義の module では addon id から導出する `getSubGroupLabel()` へ
 * fallback するため、**全 module へ一斉付与しなくても表示は変わらない**。
 */

import type { AddonItem } from './types'

export type SubCluster = {
  uiVariant: AddonItem['uiVariant']
  label: string | null
  entries: [string, AddonItem][]
}

/**
 * addon id からサブグループ見出しを導出する（JSON 非依存）。
 *
 * `uiGroup` を持たない module 向けの後方互換 fallback であり、削除しない。
 */
export function getSubGroupLabel(id: string): string | null {
  if (/_reminder_|_notification_/.test(id)) return '通知'
  if (/_prep_|_routine_|_fixed_|_schedule_/.test(id)) return '準備'
  if (/_visual_/.test(id)) return '見える化'
  if (/_support_/.test(id)) return '支援'
  return null
}

/**
 * サブグループの実効ラベル。
 * canonical に `uiGroup` があればそれを使い、無ければ id 由来の fallback を使う。
 */
export function resolveSubGroup(key: string, item: AddonItem): string | null {
  return item.uiGroup ?? getSubGroupLabel(item.id ?? key)
}

/**
 * 連続する「同 uiVariant かつ 同サブグループ」をひとつのクラスタにまとめる。
 *
 * uiVariant だけを境界にすると、同色で意味の異なるグループ
 * （例: 事前準備 と 習慣化 はいずれも rightAccentBlue）が 1 クラスタへ統合され、
 * 2 つ目の見出しが失われる。このため実効ラベルも境界条件に含める。
 *
 * `uiVariant` を持たない addon は枠なしの通常ボタンとして描画されるため、
 * クラスタが分割されても描画結果（ボタンの並び）は変わらない。
 */
export function buildSubClusters(entries: [string, AddonItem][]): SubCluster[] {
  const clusters: SubCluster[] = []
  for (const [key, item] of entries) {
    const label = resolveSubGroup(key, item)
    const last = clusters[clusters.length - 1]
    if (last && last.uiVariant === item.uiVariant && last.label === label) {
      last.entries.push([key, item])
    } else {
      clusters.push({ uiVariant: item.uiVariant, label, entries: [[key, item]] })
    }
  }
  return clusters
}
