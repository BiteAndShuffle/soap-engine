/**
 * risksPreRuleBaseline.ts — pre-rule risks occurrence の regression baseline
 *
 * ── 本 fixture が表すもの ────────────────────────────────────────────
 *
 * `prompts/vNext/PN5-Non-Scenario.md` §risks セクションの non-insulin 固定 empty 契約
 * （2026-09-20 確定）より前に生成された canonical JSON のうち、**insulin 分岐に該当せず、
 * かつ `risks` が空でない** module を、2026-09-20 時点の実測値として固定したもの。
 *
 * 現在値: 22 module（35 module 中）。
 * （初回凍結時は 23 module。2026-09-20 の Unit「insulin mixed rapid/long 構造修復」で
 *   `dm_insulin_mixed_rapid_long` を remediation し、本表から除去した。）
 *
 * ── 本 fixture が表さないもの（重要）────────────────────────────────
 *
 * 本表への収載は、当該 module の risk 値を
 *
 *   - 正当な値として承認すること     ではない
 *   - legacy defect と認定すること   でもない
 *
 * 収載 22 module の risk 値（`primary` + `secondary` 計 142 token）は bridge に機械的
 * traceability を持たない〔実測: risk token 33 種のうち bridge に文字列として出現するのは
 * 4 種のみで、いずれも scenario ID としての出現であり risk 宣言ではない〕。この historical
 * corpus の remediation は Owner Decision OD-3（2026-09-20）により別 Unit へ送られており、
 * 継続事項は `prompts/vNext/HANDOFF.md` §6「`risks` contract remediation の別 Unit 送り
 * 事項」D-5 が保持する。本表が記録するのは「固定 empty 契約の制定以前に作成された module に、
 * この分布で非空の `risks` が存在する」という**事実のみ**である。
 *
 * ── なぜ baseline が必要か ───────────────────────────────────────────
 *
 * 「non-insulin は全件 empty」を要求すると既存 23 module の遡及修正を強制してしまい（OD-3 に
 * 反する）、「非空 module 数 ≤ 23」を要求すると「1 module を空にし、別 module へ非空を追加する」
 * 相殺を検出できない。module ごとの期待件数を固定することで、**新規 module での非空混入**と
 * **既存 module の件数増減**をそれぞれ独立に検出する。
 *
 * ── identity の設計 ─────────────────────────────────────────────────
 *
 * identity は `moduleId` であり、**risk identifier 文字列を含めない**。
 *
 * risk identifier を収載すると本表が事実上の risk vocabulary registry として機能してしまう。
 * vocabulary SSOT は Owner Decision OD-5（2026-09-20）により作成しないと決定されているため、
 * 保持するのは件数（`primary` / `secondary` / `conditional`）と `risks` 直下のキー集合のみとする。
 * この粒度でも「token の追加・削除」は件数変化として検出される。
 *
 * ── 更新契機 ─────────────────────────────────────────────────────────
 *
 * 本表を更新してよいのは次の場合のみである。いずれも Owner 承認済みの Unit 内で行う。
 *
 *   1. 収載済み module の risk 値を remediation した（件数を更新する／空になった行を削除する）
 *   2. 収載済み module が corpus から除去された（行を削除する）
 *
 * **新規 module が非空の `risks` を持ったことを理由に本表へ行を追加してはならない。**
 * その場合は canonical JSON 側を固定 empty へ修正する。
 *
 * 宣言元: `prompts/vNext/PN5-Non-Scenario.md` §risks セクション
 * 検証: `tests/risksContract.test.ts`
 */

export interface PreRuleRisksBaselineRow {
  moduleId: string
  /** `risks.primary` の要素数。キー自体が存在しない場合は null */
  primary: number | null
  /** `risks.secondary` の要素数。キー自体が存在しない場合は null */
  secondary: number | null
  /** `risks.conditional` の要素数。キー自体が存在しない場合は null */
  conditional: number | null
  /** `risks` 直下のキー集合（JSON 上の宣言順）。標準は primary / secondary / conditional */
  keys: string[]
}

/**
 * 2026-09-20 実測。insulin 分岐（`drug.drugClass` のいずれかの要素が `INSULIN_*`）に該当する
 * 8 module は固定 empty 契約の対象外であるため本表には収載しない。
 *
 * `dm_insulin_mixed_rapid_long` は 2026-09-20 の Unit「insulin mixed rapid/long 構造修復」で
 * 本表から除去した。同 module は `drug.drugClass` / `dosageForms` / `drugSpecificTags` の
 * transfer defect（bridge 宣言値が canonical へ転記されていなかった）を修復した結果 insulin
 * 分岐へ移った。同日の Unit「insulin risks template clinical & semantic review」で insulin
 * 標準テンプレートが適用され、以後は他の insulin module と同じく T-R-4c が検査する。
 *
 * 2026-09-20 の Unit「D-11 / D-12 cross-corpus risk attribution remediation」で、収載 15 module の
 * `conditional` 件数を 1 → 0 へ更新した（`ketoacidosis_risk_sglt2 ← concomitant_sglt2` の除去。
 * Owner Decision OD-N1）。**`primary` / `secondary` の件数は OD-3 により非遡及のまま変更していない。**
 */
export const PRE_RULE_RISKS_BASELINE: PreRuleRisksBaselineRow[] = [
  { moduleId: 'allergy_h1_antihistamine_eye_drops', primary: 1, secondary: 4, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'allergy_h1_antihistamine_second_gen_oral', primary: 2, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'allergy_leukotriene_receptor_antagonist_oral', primary: 2, secondary: 1, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'cardiorenal_sglt2_oral', primary: 3, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_alpha_glucosidase_inhibitor_oral', primary: 1, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_biguanide_metformin_oral', primary: 2, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_dpp4_biguanide_combination_oral', primary: 4, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_dpp4_oral', primary: 3, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_dpp4_sglt2_combination_oral', primary: 5, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_dpp4_thiazolidinedione_combination_oral', primary: 4, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_epalrestat_oral', primary: 1, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_gip_glp1ra_tirzepatide_injection', primary: 4, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_glinide_alpha_glucosidase_inhibitor_combination_oral', primary: 2, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_glinide_oral', primary: 1, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_glp1ra_injection', primary: 4, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_glp1ra_semaglutide_oral', primary: 4, secondary: 1, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_imeglimin_oral', primary: 1, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_sglt2_oral', primary: 3, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_sulfonylurea_oral', primary: 1, secondary: 3, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_thiazolidinedione_biguanide_combination_oral', primary: 4, secondary: 4, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_thiazolidinedione_pioglitazone_oral', primary: 3, secondary: 2, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
  { moduleId: 'dm_thiazolidinedione_sulfonylurea_combination_oral', primary: 3, secondary: 4, conditional: 0, keys: ['primary', 'secondary', 'conditional'] },
]
