/**
 * structuredRolePreRuleBaseline.ts — pre-rule Structured role occurrence の regression baseline
 *
 * ── 本 fixture が表すもの ────────────────────────────────────────────
 *
 * `prompts/RULES.md` §17 の確立語彙（`lib/structuredRoleVocabulary.ts`）に属さない
 * `SStructured` / `AStructured` / `PStructured` の role occurrence を、
 * **2026-08-16 時点の canonical JSON から実測した観測値**として固定したもの。
 *
 * 現在値: 27 key / 104 occurrence（35 module 中 6 module）。
 *
 * ── 本 fixture が表さないもの（重要）────────────────────────────────
 *
 * 本表への収載は、当該 role を
 *
 *   - 正当な語彙として承認すること     ではない
 *   - legacy defect と認定すること     でもない
 *
 * これらの classification は未実施であり、`prompts/vNext/HANDOFF.md` §6
 * 「STRUCTURED_ROLE_FORBIDDEN validator の coverage gap」の Deferred 事項として
 * 継続保持されている。本表が記録するのは「§17 制定（2026-06-27）以前に作成された
 * module に、確立語彙外の role occurrence がこの分布で存在する」という**事実のみ**である。
 *
 * ── なぜ baseline が必要か ───────────────────────────────────────────
 *
 * 「確立語彙外は 0 件」を要求すると既存 104 件の修正を強制してしまい、
 * 「確立語彙外の総数 ≤ 104」を要求すると
 * 「既存 1 件を解消し、別の未知 role を 1 件追加する」相殺を検出できない。
 * key ごとの期待件数を固定することで、**新規 key の出現**と**既知 key の件数増減**を
 * それぞれ独立に検出する。
 *
 * ── identity の設計 ─────────────────────────────────────────────────
 *
 * identity は `(moduleId, Structured type, role)` であり、scenarioId / entry index /
 * 本文 hash を**含めない**。目的は「新規混入の確実な発見」であって「既存を壊れやすく
 * 固定すること」ではないため、scenario の並び替え・entry id の付け替え・本文修正では
 * 破綻しない粒度を採る。
 *
 * ── 更新契機 ─────────────────────────────────────────────────────────
 *
 * 本表を更新してよいのは次の場合のみである。いずれも Owner 承認済みの Unit 内で行う。
 *
 *   1. 収載済み occurrence を migration した（該当行の count を減らす／行を削除する）
 *   2. `prompts/RULES.md` §17 が当該 role を確立語彙へ正式昇格させた（行を削除する）
 *
 * **新規 module で確立語彙外の role を使ったことを理由に本表へ行を追加してはならない。**
 * その場合は canonical JSON 側を §17 の確立語彙へ修正する。
 *
 * 正本: `prompts/RULES.md` §17 ／ 検証: `tests/structuredRoleVocabulary.test.ts`
 */
import type { StructuredFieldType } from '../../lib/structuredRoleVocabulary'

export interface PreRuleRoleBaselineRow {
  moduleId: string
  type: StructuredFieldType
  role: string
  count: number
}

/** `(moduleId, type, role)` → 期待 occurrence 数。moduleId → type → role の昇順で固定する。 */
export const PRE_RULE_STRUCTURED_ROLE_BASELINE: readonly PreRuleRoleBaselineRow[] = [
  { moduleId: 'allergy_h1_antihistamine_second_gen_oral', type: 'S', role: 'as_needed_status', count: 4 },
  { moduleId: 'allergy_h1_antihistamine_second_gen_oral', type: 'S', role: 'lifestyle_issue', count: 2 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'A', role: 'administration_assessment', count: 1 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'A', role: 'sickday_assessment', count: 1 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'S', role: 'adherence_problem', count: 4 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'S', role: 'administration_problem', count: 1 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'S', role: 'lifestyle_problem', count: 2 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'S', role: 'symptom_absence_check', count: 10 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'S', role: 'symptom_presence_check', count: 9 },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', type: 'S', role: 'visit_status', count: 2 },
  { moduleId: 'dm_glp1ra_injection', type: 'A', role: 'administration_assessment', count: 1 },
  { moduleId: 'dm_glp1ra_injection', type: 'A', role: 'sickday_assessment', count: 1 },
  { moduleId: 'dm_glp1ra_injection', type: 'S', role: 'adherence_problem', count: 4 },
  { moduleId: 'dm_glp1ra_injection', type: 'S', role: 'administration_problem', count: 1 },
  { moduleId: 'dm_glp1ra_injection', type: 'S', role: 'lifestyle_problem', count: 2 },
  { moduleId: 'dm_glp1ra_injection', type: 'S', role: 'symptom_absence_check', count: 11 },
  { moduleId: 'dm_glp1ra_injection', type: 'S', role: 'symptom_presence_check', count: 9 },
  { moduleId: 'dm_glp1ra_injection', type: 'S', role: 'visit_status', count: 2 },
  { moduleId: 'dm_glp1ra_semaglutide_oral', type: 'S', role: 'adherence_problem', count: 4 },
  { moduleId: 'dm_glp1ra_semaglutide_oral', type: 'S', role: 'lifestyle_problem', count: 2 },
  { moduleId: 'dm_glp1ra_semaglutide_oral', type: 'S', role: 'symptom_absence_check', count: 9 },
  { moduleId: 'dm_glp1ra_semaglutide_oral', type: 'S', role: 'symptom_presence_check', count: 5 },
  { moduleId: 'dm_glp1ra_semaglutide_oral', type: 'S', role: 'visit_status', count: 2 },
  { moduleId: 'dm_insulin_intermediate', type: 'A', role: 'dose_adjustment_assessment', count: 6 },
  { moduleId: 'dm_insulin_rapid_analog', type: 'P', role: 'urgent_consult_advice', count: 3 },
  { moduleId: 'dm_insulin_rapid_analog', type: 'S', role: 'patient_report', count: 3 },
  { moduleId: 'dm_insulin_rapid_analog', type: 'S', role: 'treatment_continuation_status', count: 3 },
]

/** baseline row の比較キー。 */
export function baselineKeyOf(row: { moduleId: string; type: StructuredFieldType; role: string }): string {
  return `${row.moduleId} | ${row.type}Structured | ${row.role}`
}
