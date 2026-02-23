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
// 大分類の型
// ─────────────────────────────────────────────────────────────

export type MenuGroup =
  | '初回'
  | '増量'
  | '減量'
  | '副作用なし'
  | '副作用あり'
  | 'コンプライアンス良好'
  | 'コンプライアンス不良'
  | '自己調整'
  | '終了'
  | 'その他'

/** 左メニューに表示する固定順序 */
export const MENU_GROUP_ORDER: MenuGroup[] = [
  '初回',
  '増量',
  '減量',
  '副作用なし',
  '副作用あり',
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
  // 副作用なし（軽症〜経過観察）
  se_hypoglycemia:     '副作用なし',   // 低血糖チェック（問題なし確認）
  se_gi:               '副作用なし',   // 消化器（問題なし確認）
  se_appetite:         '副作用なし',   // 食欲不振（問題なし確認）
  se_pancreatitis:     '副作用なし',   // 膵炎（問題なし確認）
  se_mild_continue:    '副作用なし',   // 軽症継続（継続可能）
  // 副作用あり（対応が必要）
  se_strong_consult:   '副作用あり',   // 強い副作用・医師相談
  se_change:           '副作用あり',   // 副作用により変更
  se_reduce:           '副作用あり',   // 副作用により減量
  se_stop:             '副作用あり',   // 副作用により中止
  // コンプライアンス良好
  cp_good:             'コンプライアンス良好',
  // コンプライアンス不良（服薬忘れ・受診遅延）
  cp_poor_forget:      'コンプライアンス不良',
  cp_poor_delay:       'コンプライアンス不良',
  // 自己調整
  cp_poor_selfadjust:  '自己調整',
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
 *
 * 区切りパターン: "薬効群名 " の後ろの部分を取り出す。
 * 末尾の括弧付きコメント（例: （Drに検討））は残す。
 */
export function shortLabel(label: string): string {
  // パターン: 漢字/英数/括弧/スラッシュ・受容体作動薬など + スペース が続いた後の本体
  // 具体的には「）または英数 + スペース」の後ろを取る
  const match = label.match(/^[^\s].*?[\)）]\s+(.+)$/)
  if (match) return match[1]
  // 括弧なし: 最後のスペース区切りで2トークン以上あれば後半を返す
  const parts = label.split(/\s+/)
  if (parts.length >= 3) return parts.slice(1).join(' ')
  return label
}
