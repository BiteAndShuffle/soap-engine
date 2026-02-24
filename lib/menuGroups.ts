/**
 * menuGroups.ts
 * 左メニューの「大分類（MenuGroup）」を一元管理する。
 *
 * ルール:
 *   - type → MenuGroup の変換は必ずここだけで行う（UI側に分散しない）
 *   - 大分類の表示名に薬効群名（GLP-1…）は含めない
 *   - 表示順は MENU_GROUP_ORDER で一意に保証する
 */

import type { Template } from './types'

// ─────────────────────────────────────────────────────────────
// 大分類の型（10カテゴリ固定）
// ─────────────────────────────────────────────────────────────

export type MenuGroup =
  | '初回'
  | '増量'
  | '減量'
  | '副作用あり'
  | '副作用なし'
  | 'コンプライアンス良好'
  | 'コンプライアンス不良'
  | '自己調整'
  | '終了'
  | 'その他'

/**
 * 左メニューに表示する固定順序（仕様通り10項目）
 * 1.初回 2.増量 3.減量 4.副作用あり 5.副作用なし
 * 6.CP良好 7.CP不良 8.自己調整 9.終了 10.その他
 */
export const MENU_GROUP_ORDER: MenuGroup[] = [
  '初回',
  '増量',
  '減量',
  '副作用あり',
  '副作用なし',
  'コンプライアンス良好',
  'コンプライアンス不良',
  '自己調整',
  '終了',
  'その他',
]

// ─────────────────────────────────────────────────────────────
// type → MenuGroup 変換テーブル（1箇所で完結）
// ─────────────────────────────────────────────────────────────

const TYPE_TO_MENU_GROUP: Record<string, MenuGroup> = {
  // 導入
  initial:             '初回',
  // 増量
  uptitrate:           '増量',
  // 減量
  down_improved:       '減量',
  down_lowbenefit:     '減量',
  down_adjust_other:   '減量',
  // 副作用あり（se_系はすべてここ）
  se_hypoglycemia:     '副作用あり',
  se_gi:               '副作用あり',
  se_appetite:         '副作用あり',
  se_pancreatitis:     '副作用あり',
  se_mild_continue:    '副作用あり',
  se_strong_consult:   '副作用あり',
  se_change:           '副作用あり',
  se_reduce:           '副作用あり',
  se_stop:             '副作用あり',
  // 副作用なし（se_none があればここ）
  se_none:             '副作用なし',
  // コンプライアンス良好
  cp_good:             'コンプライアンス良好',
  // コンプライアンス不良
  cp_poor_forget:      'コンプライアンス不良',
  cp_poor_delay:       'コンプライアンス不良',
  cp_poor_selfadjust:  'コンプライアンス不良',
  // 自己調整
  self_adjust:         '自己調整',
  // 終了
  stop_improved:       '終了',
  stop_ineffective:    '終了',
  stop_noeffect:       '終了',
  // その他（シックデイ・生活指導）
  sickday:             'その他',
  lifestyle:           'その他',
}

/** type 文字列 → MenuGroup（未知の type は「その他」へ） */
export function getMenuGroup(type: string): MenuGroup {
  return TYPE_TO_MENU_GROUP[type] ?? 'その他'
}

// ─────────────────────────────────────────────────────────────
// グルーピングユーティリティ
// ─────────────────────────────────────────────────────────────

export interface MenuGroupEntry {
  group: MenuGroup
  templates: Template[]
}

/**
 * テンプレ配列を MENU_GROUP_ORDER 順のグループ配列に変換。
 * テンプレが1件もないグループは出力に含まない。
 */
export function groupByMenuGroup(templates: Template[]): MenuGroupEntry[] {
  const map = new Map<MenuGroup, Template[]>()
  for (const tpl of templates) {
    const g = getMenuGroup(tpl.type)
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(tpl)
  }
  return MENU_GROUP_ORDER
    .filter(g => map.has(g))
    .map(g => ({ group: g, templates: map.get(g)! }))
}

// ─────────────────────────────────────────────────────────────
// ラベル短縮ユーティリティ
// ─────────────────────────────────────────────────────────────

/**
 * テンプレ label から冗長な薬効群名プレフィックスを除去して短縮表示名を返す。
 * 例: "GLP-1受容体作動薬(内服) 副作用 低血糖" → "副作用 低血糖"
 */
export function shortLabel(label: string): string {
  // 「）または英数 + スペース」の後ろを取る
  const match = label.match(/^[^\s].*?[\)）]\s+(.+)$/)
  if (match) return match[1]
  // 括弧なし: スペース区切りで2トークン以上あれば後半を返す
  const parts = label.split(/\s+/)
  if (parts.length >= 3) return parts.slice(1).join(' ')
  return label
}
