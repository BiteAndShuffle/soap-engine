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

import type { Scenario, SideEffectPresence, ModuleData } from './types'

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
 * 増量 / 減量を semantic fields から汎用判定する。
 *
 * 優先順位（JSON naming に依存せず generic に判定）:
 *   1. scenarioTags に "increase" / "decrease"
 *   2. sComposition.intent === "dose_increase" / "dose_decrease"
 *   3. intentTags に "dose_increase_explanation" / "dose_decrease_explanation"
 *   4. id prefix（後方互換 fallback）
 *
 * 新規モジュールは scenarioTags に "increase" / "decrease" を入れれば
 * id naming に関係なく正しく分類される。
 */
function classifyDoseDirection(scenario: Scenario): '増量' | '減量' | null {
  const tags = scenario.scenarioTags ?? []
  if (tags.includes('increase')) return '増量'
  if (tags.includes('decrease')) return '減量'

  const intent = scenario.sComposition?.intent ?? ''
  if (intent === 'dose_increase') return '増量'
  if (intent === 'dose_decrease') return '減量'

  const intentTags = scenario.intentTags ?? []
  if (intentTags.includes('dose_increase_explanation')) return '増量'
  if (intentTags.includes('dose_decrease_explanation')) return '減量'

  // 後方互換 fallback: id prefix
  const sid = scenario.id
  if (sid.startsWith('dose_increase') || sid.startsWith('frequency_increase')) return '増量'
  if (sid.startsWith('dose_decrease') || sid.startsWith('frequency_decrease')) return '減量'

  return null
}

/**
 * 【SSOT】Scenario オブジェクトから MenuGroup を決定する。
 *
 * 副作用軸:
 *   sideEffectPresence === "absent_or_not_observed" → "副作用なし"
 *   sideEffectPresence === "present_*"              → "副作用あり"
 *
 * not_applicable の場合は scenarioGroup / semantic fields で分類:
 *   start_or_change / treatment_start → "初回"
 *   dose_change / treatment_adjustment → classifyDoseDirection() で増量/減量判定
 *   adherence_good                    → "コンプライアンス良好"
 *   adherence_poor                    → "コンプライアンス不良"
 *   adherence                         → scenarioTags に "good"/"poor" で判定
 *   end_* / treatment_end             → "終了"
 *   lifestyle_guidance / sickday      → "その他"
 *
 * 増量/減量判定は classifyDoseDirection() で行う（id naming に非依存・汎用）。
 */
export function getMenuGroupFromScenario(scenario: Scenario): MenuGroup {
  // 副作用軸は sideEffectPresence が SSOT
  if (scenario.sideEffectPresence === 'absent_or_not_observed') return '副作用なし'
  if (
    scenario.sideEffectPresence === 'present_mild' ||
    scenario.sideEffectPresence === 'present_moderate' ||
    scenario.sideEffectPresence === 'present_dose_decrease' ||
    scenario.sideEffectPresence === 'present_change' ||
    scenario.sideEffectPresence === 'present_stop'
  ) return '副作用あり'

  // not_applicable: scenarioGroup / semantic fields で分類
  const sg = scenario.scenarioGroup ?? ''
  const sid = scenario.id

  if (sg === 'start_or_change') return '初回'
  if (sg === 'treatment_start') return '初回'
  if (sg === 'dose_change' || sg === 'treatment_adjustment') {
    // 増量/減量は semantic fields 優先（id naming に非依存）
    const dir = classifyDoseDirection(scenario)
    if (dir) return dir
    return 'その他'
  }
  if (sg === 'adherence_good') return 'コンプライアンス良好'
  if (sg === 'adherence_poor') return 'コンプライアンス不良'
  if (sg === 'adherence') {
    const tags = scenario.scenarioTags ?? []
    if (tags.includes('good') || sid.startsWith('cp_good')) return 'コンプライアンス良好'
    if (tags.includes('poor') || sid.startsWith('cp_poor')) return 'コンプライアンス不良'
    return 'その他'
  }
  // as_needed: 頓用使用は patient-driven usage → 自己調整
  if (sg === 'as_needed') return '自己調整'
  if (sg.startsWith('end_')) return '終了'
  if (sg === 'treatment_end') return '終了'
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

// ─────────────────────────────────────────────────────────────
// モジュールプレフィックス候補の正規化
// ─────────────────────────────────────────────────────────────

/**
 * 全角括弧 （）→ 半角括弧 () に正規化する。
 * scenario.title が ASCII括弧を使い display フィールドが全角括弧を使う場合に
 * prefix マッチを成立させるため。
 */
function normalizeParen(s: string): string {
  return s.replace(/（/g, '(').replace(/）/g, ')')
}

/**
 * title から除去すべきモジュールプレフィックスを決定する。
 * candidates の中から「正規化後に title 先頭と一致し後に空白が続く」最長のものを選ぶ。
 */
function longestMatchingPrefix(title: string, candidates: string[]): string | null {
  const normTitle = normalizeParen(title)
  let best: string | null = null
  for (const c of candidates) {
    if (!c) continue
    const normC = normalizeParen(c)
    if (normTitle.startsWith(normC + ' ') && (best === null || normC.length > normalizeParen(best).length)) {
      best = c
    }
  }
  return best
}

/**
 * scenarios[].title 群から共通の先頭プレフィックス（クラス名相当）を推定する。
 *
 * bridge で自然文として書かれる title の薬効群名は、display.drugClassLabel 等の
 * 構造化フィールドと区切り文字（／ vs ・）や語の選び方（略称等）が食い違うことがある
 * （例: display.drugClassLabel="DPP-4阻害薬／ビグアナイド配合剤" だが
 *       title="DPP-4阻害薬・メトホルミン配合剤 副作用なし（低血糖）"）。
 * この場合、構造化フィールドとの完全一致だけではプレフィックスを検出できない。
 *
 * title 自身の中で最初の空白より前の部分を集計し、最頻出のものを候補として追加する。
 * 同一モジュール内の title は同じプレフィックスを共有する設計のため、
 * この値は常にそのモジュール自身の title 表記と完全一致する（推測ではなくデータ由来）。
 */
function deriveTitlePrefixFromScenarios(scenarios: Pick<Scenario, 'title'>[] | undefined): string | null {
  if (!scenarios) return null
  const counts = new Map<string, number>()
  for (const sc of scenarios) {
    const t = sc.title
    if (!t) continue
    const spaceIdx = t.search(/[ 　]/)
    if (spaceIdx <= 0) continue
    const prefix = t.slice(0, spaceIdx)
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [prefix, count] of counts) {
    if (count > bestCount) {
      best = prefix
      bestCount = count
    }
  }
  return best
}

/**
 * ModuleData からプレフィックス候補一覧を生成する。
 * 表示系フィールド（drugClassLabel / nodeLabelLong / display.title / drug.genericName）に加え、
 * scenarios[].title 自身から推定した共通プレフィックス（deriveTitlePrefixFromScenarios）を
 * 重複排除して返す。UI側で1回だけ呼び、結果を displayTitleForCol2 に渡す。
 *
 * brandNames / drugGeneric（個別一般名）は prefix 候補に含めない。
 */
export function moduleMenuPrefixCandidates(
  module: Pick<ModuleData, 'drug' | 'display' | 'composition' | 'scenarios'>,
): string[] {
  const seen = new Set<string>()
  const add = (s: string | undefined | null) => { if (s) seen.add(s) }
  add(module.display?.drugClassLabel)
  add(module.display?.nodeLabelLong)
  add(module.display?.title)
  add(module.drug?.genericName)
  add(module.composition?.nodeLabelLong)
  add(deriveTitlePrefixFromScenarios(module.scenarios))
  return [...seen]
}

/**
 * セカンドパネル（Col2）に表示するラベルを生成する。
 *
 * 【モジュールプレフィックス除去】:
 *   prefixCandidates が渡された場合、最長一致した候補を先頭から除去する。
 *   括弧の全角/半角を正規化してマッチするため、display フィールドと
 *   scenario.title の括弧種が異なっても正しく機能する。
 *
 *   例: "GLP-1受容体作動薬(内服) 初回"     + candidates=["GLP-1受容体作動薬（内服）"] → "初回"
 *   例: "第二世代ヒスタミンH1受容体拮抗薬 初回（鼻水）"                              → "初回（鼻水）"
 *   例: "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 終了（改善）"                   → "終了（改善）"
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
export function displayTitleForCol2(title: string, group: MenuGroup, prefixCandidates?: string[]): string {
  // モジュールプレフィックス除去（最長一致・括弧正規化付き）
  // 全角括弧（）と半角括弧()は Unicode コードポイント数が同じ(各1文字)なので
  // 正規化後の文字数 = 元の文字数。normalizeParen(title) でスライス位置を計算し
  // 元 title の同インデックスで切り出す。
  let t = title
  if (prefixCandidates && prefixCandidates.length > 0) {
    const match = longestMatchingPrefix(title, prefixCandidates)
    if (match) {
      const skipLen = normalizeParen(match).length + 1  // +1 for the space separator
      t = title.slice(skipLen)
    }
  }

  // 旧形式 "副作用（◯◯）" → "◯◯" に正規化（後方互換）
  const oldFormatMatch = t.match(/^副作用[（(](.+)[）)]$/)
  if (oldFormatMatch) return oldFormatMatch[1]

  if (group === '副作用なし') {
    // "◯◯（症状なし）" → "◯◯"
    return t.replace(/[（(]症状なし[）)]\s*$/, '').trim()
  }

  return t
}

// ─────────────────────────────────────────────────────────────
// 副作用ありシナリオのソート
//
// 表示順:
//   アクション軸（継続 < 減量 < 変更 < 中止）× 部位軸（消化器 < 注射部位）
//
// sideEffectPresence でアクション順を決める。
// 同一アクション内では id に "_injection_site_" を含む場合を後方（注射部位）に回す。
// ─────────────────────────────────────────────────────────────

const SEP_ACTION_ORDER: Record<string, number> = {
  present_mild:           0,  // 継続（軽症）
  present_moderate:       1,  // 継続（中等度）
  present_dose_decrease:  2,  // 減量
  present_change:         3,  // 変更
  present_stop:           4,  // 中止
}

/** 副作用ありグループ内のシナリオを「アクション × 部位」順にソートする */
export function sortSideEffectScenarios(scenarios: Scenario[]): Scenario[] {
  return [...scenarios].sort((a, b) => {
    const aAction = SEP_ACTION_ORDER[a.sideEffectPresence ?? ''] ?? 99
    const bAction = SEP_ACTION_ORDER[b.sideEffectPresence ?? ''] ?? 99
    if (aAction !== bAction) return aAction - bAction
    // 同一アクション内: 注射部位（id に "_injection_site_" 含む）を後方に
    const aIsInjSite = a.id.includes('_injection_site_') ? 1 : 0
    const bIsInjSite = b.id.includes('_injection_site_') ? 1 : 0
    return aIsInjSite - bIsInjSite
  })
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
