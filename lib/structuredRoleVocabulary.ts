/**
 * structuredRoleVocabulary.ts — Structured metadata role の確立語彙（machine-readable mirror）
 *
 * ── 本ファイルの責務 ─────────────────────────────────────────────────
 *
 * `prompts/RULES.md` §17「Structured.role 確立済み語彙」が定める **current established
 * vocabulary** を、機械可読な定数として保持する。**本ファイルは新しい Repository 規則を
 * 追加していない。** 語彙の宣言元は引き続き `prompts/RULES.md` §17 であり、本ファイルは
 * その mirror にすぎない（`tests/moduleRegistry.test.ts` が PN8 の既存規則に対して
 * 取っているのと同じ立場）。
 *
 * ── 本ファイルが持たないもの ─────────────────────────────────────────
 *
 * - 禁止語彙（blocklist）— `lib/moduleValidator.ts` の `FORBIDDEN_*_STRUCTURED_ROLES` が持つ
 * - **historical baseline / legacy occurrence inventory** — production 側 utility に過去の
 *   regression state を混在させない。`tests/fixtures/structuredRolePreRuleBaseline.ts` が持つ
 * - 行の文脈（scenarioType / sideEffectPresence）と role の対応 — `prompts/RULES.md` §17 の
 *   表が正本であり、機械側では判定しない（設計解釈を要するため。
 *   `docs/VALIDATOR_STANDARD.md` §1「保証しないこと」）
 *
 * ── 変更契機 ─────────────────────────────────────────────────────────
 *
 * `prompts/RULES.md` §17 の確立語彙を追加・削除・名称変更したとき、本ファイルを同一作業内で
 * 更新する（同 §17 の変更契機を参照）。あわせて `prompts/vNext/PN4A-Structured-GroupA.md` /
 * `PN4B-Structured-GroupB.md`（生成側）と `prompts/vNext/PN7-Cross-Reference-Audit.md`
 * check T（監査側）の語彙が一致しているかを確認する。
 *
 * 検証: `tests/structuredRoleVocabulary.test.ts`
 */

/** Structured metadata のフィールド種別（S / A / P）。O は role 規定の対象外。 */
export type StructuredFieldType = 'S' | 'A' | 'P'

/** `prompts/RULES.md` §17「SStructured.role 確立済み語彙」（6 値） */
export const ESTABLISHED_S_STRUCTURED_ROLES = [
  'treatment_start_reason',
  'dose_adjustment_reason',
  'side_effect_status',
  'side_effect_presence',
  'adherence_status',
  'treatment_end_reason',
] as const

/** `prompts/RULES.md` §17「AStructured.role」確立語彙（4 値） */
export const ESTABLISHED_A_STRUCTURED_ROLES = [
  'treatment_assessment',
  'side_effect_assessment',
  'adherence_assessment',
  'treatment_end_assessment',
] as const

/** `prompts/RULES.md` §17「PStructured.role 確立済み語彙（正規）」（11 値） */
export const ESTABLISHED_P_STRUCTURED_ROLES = [
  'drug_effect_explanation',
  'side_effect_attention',
  'side_effect_guidance',
  'dose_adjustment_guidance',
  'treatment_end_guidance',
  'adherence_guidance',
  'followup_guidance',
  'lifestyle_guidance',
  'administration_guidance',
  'sickday_guidance',
  'urgent_consult_guidance',
] as const

/** フィールド種別 → 確立語彙。参照専用（実行時に変更しない）。 */
export const ESTABLISHED_STRUCTURED_ROLES: Readonly<Record<StructuredFieldType, readonly string[]>> = {
  S: ESTABLISHED_S_STRUCTURED_ROLES,
  A: ESTABLISHED_A_STRUCTURED_ROLES,
  P: ESTABLISHED_P_STRUCTURED_ROLES,
}

const ESTABLISHED_SETS: Readonly<Record<StructuredFieldType, ReadonlySet<string>>> = {
  S: new Set<string>(ESTABLISHED_S_STRUCTURED_ROLES),
  A: new Set<string>(ESTABLISHED_A_STRUCTURED_ROLES),
  P: new Set<string>(ESTABLISHED_P_STRUCTURED_ROLES),
}

/** `role` が当該フィールド種別の確立語彙に属するか。 */
export function isEstablishedStructuredRole(type: StructuredFieldType, role: string): boolean {
  return ESTABLISHED_SETS[type].has(role)
}

/** Structured フィールド種別 → canonical JSON 上のフィールド名。 */
export const STRUCTURED_FIELD_NAMES: Readonly<Record<StructuredFieldType, 'SStructured' | 'AStructured' | 'PStructured'>> = {
  S: 'SStructured',
  A: 'AStructured',
  P: 'PStructured',
}

/** 走査順を固定するためのフィールド種別一覧。 */
export const STRUCTURED_FIELD_TYPES: readonly StructuredFieldType[] = ['S', 'A', 'P']
