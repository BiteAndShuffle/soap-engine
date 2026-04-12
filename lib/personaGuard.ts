// ═════════════════════════════════════════════════════════════════════════════
// personaGuard.ts — シナリオの臨床的重要度判定と persona 適用可否制御
//
// ──────────────────────────────────────────────────────────────────────────
// 【責務】
//   canonical JSON に新規フィールドを追加せず、既存フィールドから
//   importance（臨床重要度）と PersonaGuard（適用可否フラグ群）を派生させる。
//
// 【入力】
//   Scenario（scenarios[].* ）と ModuleTemplate（template.*）
//
// 【出力】
//   PersonaGuard — applyPersonaToFields の前段で必ず参照する。
//
// 【判定の SSOT 順序】
//   1. sideEffectPresence（最優先: 明示的な副作用分類）
//   2. scenarioType（大分類）
//   3. intentTags（意味タグ）
//   4. urgentFlag（テンプレートレベルの緊急フラグ）
//   ※ テキスト内容スキャン（P / A）は今後の拡張予定。現実装では未使用。
//
// 【制約（絶対禁止）】
//   - 情報欠損は禁止（preservePhrases による保護が主要な防衛線）
//   - medical record 行の変換は applyPersona 側の isMedicalRecord() が担う
//     （PersonaGuard はフィールドレベル制御のみ）
// ═════════════════════════════════════════════════════════════════════════════

import type { Scenario } from './types'

// ─────────────────────────────────────────────────────────────
// ImportanceLevel
// ─────────────────────────────────────────────────────────────

/**
 * シナリオの臨床的重要度。
 *
 * critical : 受診指示・中止変更・急性リスクが含まれるシナリオ
 * important: 副作用管理・用量調整・手技指導など注意が必要なシナリオ
 * standard : コンプライアンス・生活指導など自由度の高いシナリオ
 */
export type ImportanceLevel = 'critical' | 'important' | 'standard'

// ─────────────────────────────────────────────────────────────
// PersonaGuard
// ─────────────────────────────────────────────────────────────

/**
 * persona 適用可否・強度を制御するガードオブジェクト。
 *
 * applyPersonaToFields の前段で derivePersonaGuard() を呼び出し、
 * 返値を applyPersonaToFieldsWithGuard() に渡すことで
 * フィールド単位の適用制御が有効になる。
 *
 * 【フラグの優先順位】
 *   1. personaSensitive — true なら critical モード（保護強化）
 *   2. conciseAllowed   — false なら density 変換を実施しない
 *   3. softnessAllowed  — false なら softness 変換を実施しない
 *   4. preservePhrases  — 指定語句を変換後文字列に強制復元する
 */
export interface PersonaGuard {
  /** シナリオの臨床的重要度 */
  importance: ImportanceLevel
  /**
   * persona 変換を慎重に行う必要があるか。
   * true のとき:
   *   - A 欄は formality 語尾調整のみ（density 適用禁止）
   *   - P 欄は preservePhrases を強制保護
   */
  personaSensitive: boolean
  /**
   * concise（density）の適用を許可するか。
   * false のとき: density 変換を一切行わない。
   */
  conciseAllowed: boolean
  /**
   * softness（SOFTNESS_RULES）の適用を許可するか。
   * false のとき: SOFTNESS_RULES を適用しない。
   * ※ critical でも語尾調整レベルは許可するため、
   *    criticalだけで false にはしない。softnessAllowed の判定を参照すること。
   */
  softnessAllowed: boolean
  /**
   * 変換後に復元を保証する語句一覧。
   * persona 変換がこれらを部分的に書き換えた場合でも、
   * 変換前文字列に当該語句が存在すれば変換結果を変換前に差し戻す（行単位）。
   *
   * 【設計方針】
   *   正規表現マッチではなく部分文字列マッチを使用する。
   *   過剰な保護（false positive）より保護漏れ（false negative）を重視する設計は禁止。
   *   行全体を差し戻す（語句の一部だけ保護するより安全）。
   */
  preservePhrases: string[]
}

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

/**
 * critical 判定: sideEffectPresence の値セット
 *
 * present_moderate は「副作用あり・対応検討」であり、
 * 受診・変更・中止を促す記述が P/A に含まれることが多いため critical 扱いとする。
 */
const CRITICAL_SIDE_EFFECT_PRESENCE = new Set([
  'present_stop',
  'present_change',
  'present_dose_decrease',
  'present_moderate',
])

/**
 * critical 判定: intentTags に含まれる場合に critical に引き上げるタグ
 */
const CRITICAL_INTENT_TAGS = new Set([
  'urgent_consult_advice',
  'pancreatitis_attention',
])

/**
 * important 判定: scenarioType の値セット
 *
 * sickday は critical 判定に先に引っかかるため、ここでの網羅は不要だが
 * 後方互換として残す（将来のフォールスルー防止）。
 */
const IMPORTANT_SCENARIO_TYPES = new Set([
  'side_effect',
  'treatment_adjustment',
  'treatment_end',
])

/**
 * important 判定: intentTags に含まれる場合に important に引き上げるタグ
 */
const IMPORTANT_INTENT_TAGS = new Set([
  'side_effect_attention',
  'gi_symptom_attention',
  'hypoglycemia_attention',
  'dose_increase_explanation',
  'dose_decrease_explanation',
  'treatment_end_explanation',
  'administration_instruction',
  'sickday_guidance',
  'concomitant_drug_attention',
])

/**
 * persona 変換で変更禁止の語句一覧。
 *
 * これらを含む行は変換前の行に差し戻す。
 * 追加は保守的に行うこと（過剰保護より安全側を優先）。
 */
export const PRESERVE_PHRASES: string[] = [
  '受診してください',
  '受診をお願いします',
  '救急受診も検討',
  '自己判断せず',
  '処方医に相談',
  '中止が妥当',
  '減量が妥当',
  '変更が必要',
]

// ─────────────────────────────────────────────────────────────
// importance 判定
// ─────────────────────────────────────────────────────────────

/**
 * シナリオの臨床的重要度を判定する。
 *
 * 判定は以下の順で行う（上位条件が優先）:
 *   1. scenarioType === 'sickday'
 *   2. sideEffectPresence が critical セット内
 *   3. intentTags が critical セット内のタグを含む
 *   ─── critical ここまで ───
 *   4. IMPORTANT_SCENARIO_TYPES に一致
 *   5. intentTags が important セット内のタグを含む
 *   ─── important ここまで ───
 *   6. それ以外 → standard
 *
 * @param scenario  判定対象シナリオ
 * @param urgentFlag テンプレートの urgentFlag（module.template.urgentFlag）
 */
export function deriveImportance(
  scenario: Pick<Scenario, 'scenarioType' | 'sideEffectPresence' | 'intentTags'>,
  urgentFlag?: boolean,
): ImportanceLevel {
  const { scenarioType, sideEffectPresence, intentTags = [] } = scenario

  // ── critical 判定 ──────────────────────────────────────────
  if (scenarioType === 'sickday') return 'critical'
  if (CRITICAL_SIDE_EFFECT_PRESENCE.has(sideEffectPresence)) return 'critical'
  if (intentTags.some(tag => CRITICAL_INTENT_TAGS.has(tag))) return 'critical'
  // urgentFlag は単独では critical にしない。
  // sickday / critical sideEffect / critical intentTags と組み合わせる形を想定。
  // urgentFlag === true のみでは important 相当として扱う。
  if (urgentFlag) return 'important'

  // ── important 判定 ─────────────────────────────────────────
  if (IMPORTANT_SCENARIO_TYPES.has(scenarioType)) return 'important'
  if (intentTags.some(tag => IMPORTANT_INTENT_TAGS.has(tag))) return 'important'

  // ── standard ───────────────────────────────────────────────
  return 'standard'
}

// ─────────────────────────────────────────────────────────────
// PersonaGuard 派生
// ─────────────────────────────────────────────────────────────

/**
 * シナリオとテンプレート情報から PersonaGuard を生成する。
 *
 * 【呼び出しタイミング】
 *   applyPersonaToFieldsWithGuard() の前段。
 *   persona enabled チェックの後、フィールド変換の前に実行すること。
 *
 * @param scenario   対象シナリオ
 * @param urgentFlag module.template.urgentFlag（存在する場合）
 */
export function derivePersonaGuard(
  scenario: Pick<Scenario, 'scenarioType' | 'sideEffectPresence' | 'intentTags'>,
  urgentFlag?: boolean,
): PersonaGuard {
  const importance = deriveImportance(scenario, urgentFlag)
  const intentTags = scenario.intentTags ?? []

  // personaSensitive: critical OR urgent_consult_advice タグ OR sickday
  const personaSensitive =
    importance === 'critical' ||
    intentTags.includes('urgent_consult_advice') ||
    scenario.scenarioType === 'sickday'

  // conciseAllowed:
  //   critical では density 変換（圧縮・体言止め）を禁止する。
  //   important では許可する（P欄の語尾圧縮程度は許容範囲）。
  //   standard では自由に許可する。
  const conciseAllowed = importance !== 'critical'

  // softnessAllowed:
  //   critical でも語尾調整レベルは許可するため完全禁止にはしない。
  //   personaSensitive が true のとき、softness の適用は呼び出し側で
  //   「軽微変換のみ（SOFTNESS_RULES の適用を縮退）」として扱うことを推奨する。
  //   現実装では true/false のバイナリ制御のみ。
  //   criticalかつ urgent_consult_advice が含まれる場合のみ false にする。
  const softnessAllowed = !(
    importance === 'critical' && intentTags.includes('urgent_consult_advice')
  )

  return {
    importance,
    personaSensitive,
    conciseAllowed,
    softnessAllowed,
    preservePhrases: PRESERVE_PHRASES,
  }
}
