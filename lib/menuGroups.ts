/**
 * menuGroups.ts
 * 左メニューの「大分類（MenuGroup）」を一元管理する。
 *
 * ルール:
 *   - Scenario → MenuGroup の変換は必ずここだけで行う（UI側に分散しない）
 *   - 新スキーマ: sideEffectPresence が SSOT（副作用あり/なし の分類）
 *   - 旧スキーマ互換: type 文字列からの変換も保持（後方互換）
 *   - 表示順は MENU_GROUP_ORDER で一意に保証する
 */

import type { Scenario, SideEffectPresence } from './types'

// ─────────────────────────────────────────────────────────────
// 大分類の型（10カテゴリ固定）
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

/**
 * 左メニューの表示順（固定10項目・仕様通り）
 */
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
// 新スキーマ: Scenario → MenuGroup
// sideEffectPresence + scenarioGroup の組み合わせで決定
// ─────────────────────────────────────────────────────────────

/**
 * 【SSOT】Scenario オブジェクトから MenuGroup を決定する。
 *
 * 副作用軸:
 *   sideEffectPresence === "absent_or_not_observed" → "副作用なし"
 *   sideEffectPresence === "present"                → "副作用あり"
 *
 * not_applicable の場合は scenarioGroup / scenarioType で分類:
 *   start_or_change    → "初回"  ※ dose_change も scenarioGroup で区別
 *   dose_change (dose_increase) → "増量"
 *   dose_change (reduce系)      → "減量"
 *   adherence_good              → "コンプライアンス良好"
 *   adherence_poor              → "コンプライアンス不良"
 *   end_*                       → "終了"
 *   lifestyle_guidance          → "その他"
 *   sickday                     → "その他"
 */
export function getMenuGroupFromScenario(scenario: Scenario): MenuGroup {
  // 副作用軸は sideEffectPresence が SSOT
  if (scenario.sideEffectPresence === 'absent_or_not_observed') return '副作用なし'
  if (scenario.sideEffectPresence === 'present') return '副作用あり'

  // not_applicable: scenarioGroup / id で分類
  const sg = scenario.scenarioGroup
  const sid = scenario.id

  if (sg === 'start_or_change') return '初回'
  if (sg === 'dose_change') {
    // 増量 vs 減量は id で区別
    if (sid === 'dose_increase') return '増量'
    return '減量'  // dose_reduce_* は全て減量
  }
  if (sg === 'adherence_good') return 'コンプライアンス良好'
  if (sg === 'adherence_poor') return 'コンプライアンス不良'
  if (sg.startsWith('end_')) return '終了'
  if (sg === 'lifestyle_guidance') return 'その他'
  if (sg === 'sickday') return 'その他'

  return 'その他'
}

// ─────────────────────────────────────────────────────────────
// 旧スキーマ互換: type 文字列 → MenuGroup
// （旧 Template.type を使う箇所の後方互換として残す）
// ─────────────────────────────────────────────────────────────

const TYPE_TO_MENU_GROUP: Record<string, MenuGroup> = {
  initial:             '初回',
  uptitrate:           '増量',
  down_improved:       '減量',
  down_lowbenefit:     '減量',
  down_adjust_other:   '減量',
  se_none:             '副作用なし',
  se_hypoglycemia:     '副作用あり',
  se_gi:               '副作用あり',
  se_appetite:         '副作用あり',
  se_pancreatitis:     '副作用あり',
  se_mild_continue:    '副作用あり',
  se_strong_consult:   '副作用あり',
  se_change:           '副作用あり',
  se_reduce:           '副作用あり',
  se_stop:             '副作用あり',
  cp_good:             'コンプライアンス良好',
  cp_poor_forget:      'コンプライアンス不良',
  cp_poor_delay:       'コンプライアンス不良',
  cp_poor_selfadjust:  'コンプライアンス不良',
  self_adjust:         '自己調整',
  stop_improved:       '終了',
  stop_ineffective:    '終了',
  stop_noeffect:       '終了',
  sickday:             'その他',
  lifestyle:           'その他',
}

/** 旧スキーマ互換: type 文字列 → MenuGroup */
export function getMenuGroup(type: string): MenuGroup {
  if (type in TYPE_TO_MENU_GROUP) return TYPE_TO_MENU_GROUP[type]
  if (type.startsWith('se_')) return '副作用あり'
  if (type.startsWith('cp_')) return 'コンプライアンス不良'
  if (type.startsWith('down_')) return '減量'
  if (type.startsWith('stop_')) return '終了'
  return 'その他'
}

// ─────────────────────────────────────────────────────────────
// グルーピングユーティリティ（新スキーマ: Scenario[]）
// ─────────────────────────────────────────────────────────────

export interface MenuGroupEntry {
  group: MenuGroup
  scenarios: Scenario[]
}

/**
 * Scenario 配列を MENU_GROUP_ORDER 順のグループ配列に変換。
 * グルーピングは getMenuGroupFromScenario() のみで行う（SSOT強制）。
 * テンプレが1件もないグループは出力に含まない。
 */
export function groupByMenuGroup(scenarios: Scenario[]): MenuGroupEntry[] {
  const map = new Map<MenuGroup, Scenario[]>()
  for (const sc of scenarios) {
    const g = getMenuGroupFromScenario(sc)
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(sc)
  }
  return MENU_GROUP_ORDER
    .filter(g => map.has(g))
    .map(g => ({ group: g, scenarios: map.get(g)! }))
}

// ─────────────────────────────────────────────────────────────
// Col2 表示ラベル生成
// ─────────────────────────────────────────────────────────────

/**
 * セカンドパネル（Col2）に表示するラベルを生成する。
 *
 * 【副作用なし】選択中:
 *   "低血糖（症状なし）" → "低血糖"  （サフィックス除去）
 *   "副作用（低血糖）"   → "低血糖"  （旧形式の剥ぎ取り）
 *
 * 【副作用あり】選択中:
 *   "消化器症状（軽症継続）" → そのまま
 *   "副作用（低血糖）"        → "低血糖"  （旧形式の剥ぎ取り）
 *
 * 【その他】:
 *   title をそのまま返す
 */
export function displayTitleForCol2(title: string, group: MenuGroup): string {
  // 旧形式 "副作用（◯◯）" → "◯◯" に正規化（後方互換）
  const oldFormatMatch = title.match(/^副作用[（(](.+)[）)]$/)
  if (oldFormatMatch) return oldFormatMatch[1]

  if (group === '副作用なし') {
    // "◯◯（症状なし）" → "◯◯"
    return title.replace(/[（(]症状なし[）)]\s*$/, '').trim()
  }

  return title
}

// ─────────────────────────────────────────────────────────────
// ラベル短縮ユーティリティ（後方互換）
// ─────────────────────────────────────────────────────────────

/**
 * テンプレ label から冗長な薬効群名プレフィックスを除去して短縮表示名を返す。
 * 例: "GLP-1受容体作動薬(内服) 副作用 低血糖" → "副作用 低血糖"
 */
export function shortLabel(label: string): string {
  const match = label.match(/^[^\s].*?[\)）]\s+(.+)$/)
  if (match) return match[1]
  const parts = label.split(/\s+/)
  if (parts.length >= 3) return parts.slice(1).join(' ')
  return label
}
