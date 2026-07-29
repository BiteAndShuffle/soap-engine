/**
 * verify_addon_panel.ts
 *
 * 状態: Experimental（docs/DEVELOPMENT_STANDARD.md §10.1 準拠）
 * 判定根拠: `package.json` 未登録・コード/データからの被参照 0 件。git 履歴上、
 * AddonPanel 残留バグ修正（commit d197bfa）の検証用として作成された単発ツールであり、
 * Future Expansion（将来接続の明示的計画）・Legacy（過去の正式経路）のいずれの根拠も
 * Repository 内に見つからない（docs/reviews/P1_S2B_FIX_PLAN.md Q-5 準拠）。
 *
 * AddonPanel 表示対象が scenario.addonsRef のみに基づくことを検証する。
 *
 * 期待値 (oral JSON):
 *  initial                    → 4件
 *  dose_increase_*            → 1件 (addon_se_hypoglycemia_guidance)
 *  cp_poor_missed_doses       → 3件 (adherence 系)
 *  sickday                    → 1件 (addon_sickday_hold_sglt2_metformin)
 *  cp_good                    → 0件
 *  cp_poor_self_adjust        → 0件
 *  cp_poor_visit_delay        → 0件
 *  end_*                      → 0件
 *  se_*                       → 0件
 *  lifestyle_guidance         → 0件
 */

import { getVisibleAddonKeys } from '../lib/addonFilter'
import type { ModuleData } from '../lib/types'
import fs from 'fs'
import path from 'path'

// ── JSON 読み込み ─────────────────────────────────────────────
const jsonPath = path.resolve('./data/modules/dm_glp1ra_semaglutide_oral.json')
const raw = fs.readFileSync(jsonPath, 'utf-8')
const mod = JSON.parse(raw) as ModuleData

// ── 期待値マップ ──────────────────────────────────────────────
const EXPECTED: Record<string, number> = {
  // addonsRef あり
  'dm_glp1ra_semaglutide_oral.initial':                             4,
  'dm_glp1ra_semaglutide_oral.dose_increase_low_perceived_effect':  1,
  'dm_glp1ra_semaglutide_oral.dose_increase_no_lab_improvement':    1,
  'dm_glp1ra_semaglutide_oral.dose_increase_due_to_other_med_adjustment': 1,
  'dm_glp1ra_semaglutide_oral.cp_poor_missed_doses':                3,
  'dm_glp1ra_semaglutide_oral.sickday':                             1,
  // addonsRef なし → 0件
  'dm_glp1ra_semaglutide_oral.dose_decrease_improved':              0,
  'dm_glp1ra_semaglutide_oral.dose_decrease_low_perceived_effect':  0,
  'dm_glp1ra_semaglutide_oral.dose_decrease_due_to_other_med_adjustment': 0,
  'dm_glp1ra_semaglutide_oral.se_hypo_none':                        0,
  'dm_glp1ra_semaglutide_oral.se_nausea_diarrhea_none':             0,
  'dm_glp1ra_semaglutide_oral.se_appetite_loss_none':               0,
  'dm_glp1ra_semaglutide_oral.se_pancreatitis_none':                0,
  'dm_glp1ra_semaglutide_oral.cp_good':                             0,
  'dm_glp1ra_semaglutide_oral.cp_poor_self_adjust':                 0,
  'dm_glp1ra_semaglutide_oral.cp_poor_visit_delay':                 0,
  'dm_glp1ra_semaglutide_oral.end_improved':                        0,
  'dm_glp1ra_semaglutide_oral.end_insufficient_effect':             0,
  'dm_glp1ra_semaglutide_oral.end_ineffective':                     0,
  'dm_glp1ra_semaglutide_oral.se_mild_continue':                    0,
  'dm_glp1ra_semaglutide_oral.se_moderate_consider_dr':             0,
  'dm_glp1ra_semaglutide_oral.se_change_due_to_gi_symptoms':        0,
  'dm_glp1ra_semaglutide_oral.se_dose_decrease_due_to_gi_symptoms': 0,
  'dm_glp1ra_semaglutide_oral.se_stop_due_to_gi_symptoms':          0,
  'dm_glp1ra_semaglutide_oral.lifestyle_guidance':                  0,
}

// ── 追加: シナリオ null/undefined → 必ず 0件 ─────────────────
const EXTRA_CASES: { label: string; scenario: null | undefined }[] = [
  { label: 'scenario=null',      scenario: null },
  { label: 'scenario=undefined', scenario: undefined },
]

// ── 実行 ─────────────────────────────────────────────────────
let pass = 0
let fail = 0

console.log('\n\x1b[1m\x1b[34m── getVisibleAddonKeys 検証 ──\x1b[0m')

for (const sc of mod.scenarios) {
  const gid = sc.globalId
  const expected = EXPECTED[gid]
  if (expected === undefined) {
    console.log(`\x1b[33m⚠  ${gid}: 期待値未定義（スキップ）\x1b[0m`)
    continue
  }
  const keys = getVisibleAddonKeys(mod.addons, sc)
  const actual = keys.length
  const ok = actual === expected
  if (ok) {
    console.log(`\x1b[32m✅ ${gid}: ${actual}件\x1b[0m`)
    pass++
  } else {
    console.log(`\x1b[31m❌ ${gid}: expected=${expected} actual=${actual} keys=[${keys.join(', ')}]\x1b[0m`)
    fail++
  }
}

// null/undefined ケース
for (const { label, scenario } of EXTRA_CASES) {
  const keys = getVisibleAddonKeys(mod.addons, scenario)
  const ok = keys.length === 0
  if (ok) {
    console.log(`\x1b[32m✅ ${label}: 0件\x1b[0m`)
    pass++
  } else {
    console.log(`\x1b[31m❌ ${label}: expected=0 actual=${keys.length}\x1b[0m`)
    fail++
  }
}

// ── サマリ ─────────────────────────────────────────────────────
console.log(`\n\x1b[1m結果: ${pass} PASS / ${fail} FAIL\x1b[0m`)
if (fail === 0) {
  console.log('\x1b[32m\x1b[1mAddonPanel 表示対象ロジック: OK\x1b[0m\n')
  process.exit(0)
} else {
  console.log('\x1b[31m\x1b[1mFAIL あり\x1b[0m\n')
  process.exit(1)
}
