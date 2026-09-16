/**
 * rapidV2MultiModulePilot.test.ts — Rapid v2 限定 multi-module pilot 契約テスト
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-H1-PILOT-1。
 *
 * H1点眼（Reference Implementation。Human 評価通過）に続き、内服1 module
 * （`dm_dpp4_oral`。トラゼンタ = リナグリプチン）・注射1 module
 * （`dm_insulin_rapid_analog`。ノボラピッド = インスリンアスパルト）を追加した
 * 限定 multi-module pilot（3 module）の契約を固定する（その後 6 module pilot を経て
 * OD-RAPID-GLOBAL-1 で global promotion。profile 分布は `tests/rapidV2GlobalPromotion.test.ts`）。
 *
 * H1 の Reference Baseline 契約自体は `tests/rapidV2H1Pilot.test.ts` が引き続き
 * 固定する（本ファイルでは重複させない）。本ファイルが新規に固定するのは:
 *   - route verb 差分（使用/服用）— Do transition のみに影響
 *   - severity gate — severity 分岐のある side_effect scenario が
 *     Rapid-capable と判定されないことの実測固定（第1文置換による
 *     clinical information 欠落の構造的な回避）
 *   - pilot 検証済み module が global promotion 後も v2 であること
 *   - 3module間の multi-node 合成での state 独立性
 *
 * production 関数を直接 import する。mirror 実装は作らない（RAPID-V2-20 の踏襲）。
 *
 * 実行:
 *   npx tsx --test tests/rapidV2MultiModulePilot.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import type { ComposeNode, ModuleData, Scenario, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'
import { deriveRawFields, deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { rebuildNode } from '../lib/primaryNode'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { nextRapidStateOnScenarioChange, type RapidState, type RapidTransitionV2 } from '../lib/rapidState'
import type { SCondition } from '../lib/rapidSentence'
import {
  rapidProfileOf,
  registerOf,
  verbOf,
  buildV2FirstSentence,
} from '../lib/rapidV2'

const H1_MODULE_ID = 'allergy_h1_antihistamine_eye_drops'
const TRAZENTA_MODULE_ID = 'dm_dpp4_oral'
const NOVORAPID_MODULE_ID = 'dm_insulin_rapid_analog'

const H1_MOD = ALL_MODULES.find(m => m.moduleId === H1_MODULE_ID)!
const TRAZENTA_MOD = ALL_MODULES.find(m => m.moduleId === TRAZENTA_MODULE_ID)!
const NOVORAPID_MOD = ALL_MODULES.find(m => m.moduleId === NOVORAPID_MODULE_ID)!

const H1_DRUG = 'アレジオン点眼液'
const TRAZENTA_DRUG = 'トラゼンタ'
const NOVORAPID_DRUG = 'ノボラピッド'

// 実測（本ファイル 0 節）で確定した capable scenario 一覧。
const TRAZENTA_SIDE_EFFECT_NONE_IDS = [
  'se_constipation_none',
  'se_abdominal_distension_none',
  'se_hypo_none',
  'se_pancreatitis_none',
  'se_bullous_pemphigoid_none',
]
const NOVORAPID_SIDE_EFFECT_NONE_IDS = [
  'se_injection_site_induration_none',
  'se_hypo_none',
]

// 実測で確定した severity 分岐 scenario（capable ではない）一覧。
const TRAZENTA_SEVERITY_IDS = [
  'se_mild_continue',
  'se_moderate_consider_dr',
  'se_change_due_to_gi_symptoms',
  'se_dose_decrease_due_to_gi_symptoms',
  'se_stop_due_to_gi_symptoms',
]
const NOVORAPID_SEVERITY_IDS = [
  'se_mild_continue',
  'se_injection_site_reaction_mild_continue',
  'se_hypoglycemia_moderate_consider_dr',
  'se_injection_site_reaction_moderate_consider_dr',
  'se_change_due_to_hypoglycemia',
  'se_change_due_to_injection_site_reaction',
  'se_dose_decrease_due_to_hypoglycemia',
  'se_stop_due_to_hypoglycemia',
  'se_stop_due_to_injection_site_reaction',
]

function scenarioOf(mod: ModuleData, id: string): Scenario {
  const sc = mod.scenarios.find(s => s.id === id)
  assert.ok(sc, `${mod.moduleId} に scenario ${id} が見つからない`)
  return sc!
}

const TRANSITIONS: RapidTransitionV2[] = [
  'continued_do', 'new_addition', 'med_changed', 'regimen_reduced', 'dose_increased', 'dose_decreased',
]
const CONDITIONS: SCondition[] = ['stable', 'unchanged', 'improved', 'not_improved']

// ═══════════════════════════════════════════════════════════════
// 0. Repository fact — 対象2 module の capable / severity scenario 実測
// ═══════════════════════════════════════════════════════════════

describe('0. トラゼンタ（dm_dpp4_oral）・ノボラピッド（dm_insulin_rapid_analog）の実測', () => {
  test('トラゼンタ: 副作用なし5 + cp_good = 6 capable', () => {
    const capable = TRAZENTA_MOD.scenarios.filter(isScenarioSReplacementCapable).map(s => s.id).sort()
    assert.deepEqual(capable, [...TRAZENTA_SIDE_EFFECT_NONE_IDS, 'cp_good'].sort())
  })

  test('ノボラピッド: 副作用なし2 + cp_good = 3 capable（H1の5より少ない。moduleごとの scenario 設計差はpilotの前提として許容する）', () => {
    const capable = NOVORAPID_MOD.scenarios.filter(isScenarioSReplacementCapable).map(s => s.id).sort()
    assert.deepEqual(capable, [...NOVORAPID_SIDE_EFFECT_NONE_IDS, 'cp_good'].sort())
  })

  test('トラゼンタ・ノボラピッドとも Default S の verb は canonical bridge 側で既に固定されている（服用/使用）', () => {
    const trazentaS = buildNodeFields(scenarioOf(TRAZENTA_MOD, 'se_hypo_none'), TRAZENTA_MOD, [], TRAZENTA_DRUG).fields.S
    const novorapidS = buildNodeFields(scenarioOf(NOVORAPID_MOD, 'se_hypo_none'), NOVORAPID_MOD, [], NOVORAPID_DRUG).fields.S
    assert.ok(trazentaS.startsWith(`${TRAZENTA_DRUG}を服用して`), `トラゼンタの Default S が想定と異なる: ${trazentaS}`)
    assert.ok(novorapidS.startsWith(`${NOVORAPID_DRUG}を使用して`), `ノボラピッドの Default S が想定と異なる: ${novorapidS}`)
  })
})

// ═══════════════════════════════════════════════════════════════
// A. pilot 6 module は global promotion 後も v2（profile 分布の本体契約は GlobalPromotion test）
// ═══════════════════════════════════════════════════════════════

/**
 * 6-module pilot（Human Review CLOSE）で検証された module（exact set）。
 *   既存3 module: OD-RAPID-MULTI-PILOT-1 §B
 *   追加3 module: OD-RAPID-READINESS-1 §3（外用 / 心腎 / 配合剤）
 * global promotion（OD-RAPID-GLOBAL-1）後は allowlist ではなく、既定 v2 の中で
 * pilot 検証済みの Reference 群として扱う。profile 分布（一時除外の exact set・その他全 module が v2）の
 * 契約本体は `tests/rapidV2GlobalPromotion.test.ts` が持つ。
 */
const PILOT_VALIDATED_RAPID_V2_MODULE_IDS = [
  H1_MODULE_ID,
  TRAZENTA_MODULE_ID,
  NOVORAPID_MODULE_ID,
  'derm_heparinoid_moisturizer_ointment',
  'cardiorenal_sglt2_oral',
  'dm_dpp4_biguanide_combination_oral',
] as const

/** Rapid v2 global promotion からの一時除外 module（OD-RAPID-GLOBAL-1。v1 profile の実例） */
const V1_EXCLUDED_MODULE_ID = 'allergy_chemical_mediator_release_inhibitor_eye_drops'

describe('A. pilot 検証済み 6 module は global promotion 後も v2 である', () => {
  test('pilot 検証済み 6 module はすべて corpus に存在し v2 である', () => {
    for (const moduleId of PILOT_VALIDATED_RAPID_V2_MODULE_IDS) {
      const mod = ALL_MODULES.find(m => m.moduleId === moduleId)
      assert.ok(mod, `pilot 検証済み module ${moduleId} が corpus に存在しない`)
      assert.equal(rapidProfileOf(mod!), 'v2', `${moduleId} が v2 になっていない`)
    }
  })

  test('pilot 検証済み 6 module はいずれも一時除外に含まれない', () => {
    assert.equal(PILOT_VALIDATED_RAPID_V2_MODULE_IDS.includes(V1_EXCLUDED_MODULE_ID as never), false)
  })
})

// ═══════════════════════════════════════════════════════════════
// B. route verb 差分（使用/服用）— Do transition のみに影響
// ═══════════════════════════════════════════════════════════════

describe('B. route verb 差分（Do transition の drug-specific realization にのみ影響）', () => {
  test('verbOf: トラゼンタ = 服用、H1・ノボラピッド = 使用', () => {
    assert.equal(verbOf(TRAZENTA_MOD), '服用')
    assert.equal(verbOf(H1_MOD), '使用')
    assert.equal(verbOf(NOVORAPID_MOD), '使用')
  })

  test('トラゼンタ Do（continued_do）drug-specific 4文が「服用」で exact 一致する', () => {
    const expected: Record<SCondition, string> = {
      stable:       `${TRAZENTA_DRUG}を服用して症状は落ち着いている。`,
      unchanged:    `${TRAZENTA_DRUG}を服用して症状は変わりない。`,
      improved:     `${TRAZENTA_DRUG}を服用して症状は良くなってきた。`,
      not_improved: `${TRAZENTA_DRUG}を服用しているが症状の改善は乏しい。`,
    }
    for (const c of CONDITIONS) {
      const actual = buildV2FirstSentence('continued_do', c, 'drug', TRAZENTA_DRUG, verbOf(TRAZENTA_MOD))
      assert.equal(actual, expected[c], c)
    }
  })

  test('ノボラピッド Do（continued_do）drug-specific 4文が「使用」で exact 一致する', () => {
    const expected: Record<SCondition, string> = {
      stable:       `${NOVORAPID_DRUG}を使用して症状は落ち着いている。`,
      unchanged:    `${NOVORAPID_DRUG}を使用して症状は変わりない。`,
      improved:     `${NOVORAPID_DRUG}を使用して症状は良くなってきた。`,
      not_improved: `${NOVORAPID_DRUG}を使用しているが症状の改善は乏しい。`,
    }
    for (const c of CONDITIONS) {
      const actual = buildV2FirstSentence('continued_do', c, 'drug', NOVORAPID_DRUG, verbOf(NOVORAPID_MOD))
      assert.equal(actual, expected[c], c)
    }
  })

  test('他5 transition（追加/変更/処方整理/増量/減量）は verb 差分の影響を受けない（トラゼンタ/ノボラピッドで同一文）', () => {
    for (const t of TRANSITIONS.filter(t => t !== 'continued_do')) {
      for (const c of CONDITIONS) {
        const trazenta = buildV2FirstSentence(t, c, 'drug', '薬名A', verbOf(TRAZENTA_MOD))
        const novorapid = buildV2FirstSentence(t, c, 'drug', '薬名A', verbOf(NOVORAPID_MOD))
        assert.equal(trazenta, novorapid, `${t}/${c}: verb 差分が Do 以外の transition に漏れている`)
      }
    }
  })

  test('production 経路（deriveRawFields）でも Do の第1文に verb 差分が反映される', () => {
    const trazentaDerived = deriveRawFields(
      scenarioOf(TRAZENTA_MOD, 'se_hypo_none'), TRAZENTA_MOD, [],
      { previousEvent: 'continued_do', currentOutcome: 'improved' }, TRAZENTA_DRUG,
    )
    assert.equal(trazentaDerived.S.split('\n')[0], `${TRAZENTA_DRUG}を服用して症状は良くなってきた。`)

    const novorapidDerived = deriveRawFields(
      scenarioOf(NOVORAPID_MOD, 'se_hypo_none'), NOVORAPID_MOD, [],
      { previousEvent: 'continued_do', currentOutcome: 'improved' }, NOVORAPID_DRUG,
    )
    assert.equal(novorapidDerived.S.split('\n')[0], `${NOVORAPID_DRUG}を使用して症状は良くなってきた。`)
  })
})

// ═══════════════════════════════════════════════════════════════
// C. drug-specific 6×4 exact match（対象2 module の代表薬剤名）
// ═══════════════════════════════════════════════════════════════

describe('C. drug-specific 6×4 = 24文 exact match（トラゼンタ・ノボラピッド）', () => {
  function drugExpected(drug: string, verb: '使用' | '服用'): Record<RapidTransitionV2, Record<SCondition, string>> {
    return {
      continued_do: {
        stable:       `${drug}を${verb}して症状は落ち着いている。`,
        unchanged:    `${drug}を${verb}して症状は変わりない。`,
        improved:     `${drug}を${verb}して症状は良くなってきた。`,
        not_improved: `${drug}を${verb}しているが症状の改善は乏しい。`,
      },
      new_addition: {
        stable:       `前回から${drug}が追加となり症状は落ち着いている。`,
        unchanged:    `前回から${drug}が追加となり症状は変わりない。`,
        improved:     `前回から${drug}が追加となり症状は良くなってきた。`,
        not_improved: `前回から${drug}が追加となったが症状の改善は乏しい。`,
      },
      med_changed: {
        stable:       `前回から${drug}に変更となり症状は落ち着いている。`,
        unchanged:    `前回から${drug}に変更となり症状は変わりない。`,
        improved:     `前回から${drug}に変更となり症状は良くなってきた。`,
        not_improved: `前回から${drug}に変更となったが症状の改善は乏しい。`,
      },
      // 処方整理は drug-specific でも薬剤名を入れない（§6・DP-19 OD-RAPID-SCOPE-1）。
      regimen_reduced: {
        stable:       '前回の処方整理後も症状は落ち着いている。',
        unchanged:    '前回の処方整理後も症状は変わりない。',
        improved:     '前回の処方整理後、症状は良くなってきた。',
        not_improved: '前回の処方整理後も症状の改善は乏しい。',
      },
      dose_increased: {
        stable:       `前回から${drug}が増量となり症状は落ち着いている。`,
        unchanged:    `前回から${drug}が増量となり症状は変わりない。`,
        improved:     `前回から${drug}が増量となり症状は良くなってきた。`,
        not_improved: `前回から${drug}が増量となったが症状の改善は乏しい。`,
      },
      dose_decreased: {
        stable:       `前回から${drug}が減量となり症状は落ち着いている。`,
        unchanged:    `前回から${drug}が減量となり症状は変わりない。`,
        improved:     `前回から${drug}が減量となり症状は良くなってきた。`,
        not_improved: `前回から${drug}が減量となったが症状の改善は乏しい。`,
      },
    }
  }

  test('トラゼンタ（服用）24文 exact', () => {
    const expected = drugExpected(TRAZENTA_DRUG, '服用')
    let checked = 0
    for (const t of TRANSITIONS) for (const c of CONDITIONS) {
      assert.equal(buildV2FirstSentence(t, c, 'drug', TRAZENTA_DRUG, verbOf(TRAZENTA_MOD)), expected[t][c], `${t}/${c}`)
      checked++
    }
    assert.equal(checked, 24)
  })

  test('ノボラピッド（使用）24文 exact', () => {
    const expected = drugExpected(NOVORAPID_DRUG, '使用')
    let checked = 0
    for (const t of TRANSITIONS) for (const c of CONDITIONS) {
      assert.equal(buildV2FirstSentence(t, c, 'drug', NOVORAPID_DRUG, verbOf(NOVORAPID_MOD)), expected[t][c], `${t}/${c}`)
      checked++
    }
    assert.equal(checked, 24)
  })

  test('処方整理4文にはトラゼンタ・ノボラピッドいずれの薬剤名も含まれない', () => {
    for (const c of CONDITIONS) {
      const trazenta = buildV2FirstSentence('regimen_reduced', c, 'drug', TRAZENTA_DRUG, verbOf(TRAZENTA_MOD))
      const novorapid = buildV2FirstSentence('regimen_reduced', c, 'drug', NOVORAPID_DRUG, verbOf(NOVORAPID_MOD))
      assert.ok(!trazenta.includes(TRAZENTA_DRUG), `トラゼンタ名が処方整理文に混入: ${trazenta}`)
      assert.ok(!novorapid.includes(NOVORAPID_DRUG), `ノボラピッド名が処方整理文に混入: ${novorapid}`)
      assert.equal(trazenta, novorapid, '処方整理は module 間で同一文であるべき')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// D. adherence（cp_good）regimen-level 6×4
// ═══════════════════════════════════════════════════════════════

describe('D. adherence（cp_good）regimen-level realization', () => {
  // Do の regimen-level 文は drug.route 由来の動詞で realize する（OD-RAPID-ROUTE-VERB-1）。
  const regimenDoExpected = (verb: '使用' | '服用'): Record<SCondition, string> => ({
    stable:       `薬を${verb}して症状は落ち着いている。`,
    unchanged:    `薬を${verb}して症状は変わりない。`,
    improved:     `薬を${verb}して症状は良くなってきた。`,
    not_improved: `薬を${verb}しているが症状の改善は乏しい。`,
  })
  const REGIMEN_EXPECTED: Record<Exclude<RapidTransitionV2, 'continued_do'>, Record<SCondition, string>> = {
    new_addition: {
      stable:       '前回の薬剤追加後も症状は落ち着いている。',
      unchanged:    '前回の薬剤追加後も症状は変わりない。',
      improved:     '前回の薬剤追加後、症状は良くなってきた。',
      not_improved: '前回の薬剤追加後も症状の改善は乏しい。',
    },
    med_changed: {
      stable:       '前回の薬剤変更後も症状は落ち着いている。',
      unchanged:    '前回の薬剤変更後も症状は変わりない。',
      improved:     '前回の薬剤変更後、症状は良くなってきた。',
      not_improved: '前回の薬剤変更後も症状の改善は乏しい。',
    },
    regimen_reduced: {
      stable:       '前回の処方整理後も症状は落ち着いている。',
      unchanged:    '前回の処方整理後も症状は変わりない。',
      improved:     '前回の処方整理後、症状は良くなってきた。',
      not_improved: '前回の処方整理後も症状の改善は乏しい。',
    },
    dose_increased: {
      stable:       '前回の増量後も症状は落ち着いている。',
      unchanged:    '前回の増量後も症状は変わりない。',
      improved:     '前回の増量後、症状は良くなってきた。',
      not_improved: '前回の増量後も症状の改善は乏しい。',
    },
    dose_decreased: {
      stable:       '前回の減量後も症状は落ち着いている。',
      unchanged:    '前回の減量後も症状は変わりない。',
      improved:     '前回の減量後、症状は良くなってきた。',
      not_improved: '前回の減量後も症状の改善は乏しい。',
    },
  }

  test('トラゼンタ（服用）・ノボラピッド（使用）とも cp_good は regimen-level 24文。Do のみ drug.route 由来の動詞（OD-RAPID-ROUTE-VERB-1）', () => {
    for (const [mod, drug, verb] of [[TRAZENTA_MOD, TRAZENTA_DRUG, '服用'], [NOVORAPID_MOD, NOVORAPID_DRUG, '使用']] as const) {
      assert.equal(registerOf(scenarioOf(mod, 'cp_good')), 'regimen')
      for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        const actual = buildV2FirstSentence(t, c, 'regimen', drug, verbOf(mod))
        const expected = t === 'continued_do' ? regimenDoExpected(verb)[c] : REGIMEN_EXPECTED[t][c]
        assert.equal(actual, expected, `${mod.moduleId} ${t}/${c}`)
        assert.ok(!actual.includes(drug), `${mod.moduleId}: regimen 文に薬剤名が混入: ${actual}`)
      }
    }
  })

  test('production 経路（deriveRawFields）で cp_good の第1文が regimen realization になる', () => {
    const derived = deriveRawFields(
      scenarioOf(TRAZENTA_MOD, 'cp_good'), TRAZENTA_MOD, [],
      { previousEvent: 'continued_do', currentOutcome: 'unchanged' }, TRAZENTA_DRUG,
    )
    assert.equal(derived.S.split('\n')[0], '薬を服用して症状は変わりない。')
    assert.ok(!derived.S.split('\n')[0].includes(TRAZENTA_DRUG))
  })
})

// ═══════════════════════════════════════════════════════════════
// E. scenario preservation — 第1文のみ変更・残余 byte 保持・O/A/P/closing 不変
// ═══════════════════════════════════════════════════════════════

describe('E. capable scenario で第1文のみ変更・残余は byte 保持される（トラゼンタ・ノボラピッド）', () => {
  function assertPreservation(mod: ModuleData, ids: string[], drug: string) {
    for (const id of ids) {
      const sc = scenarioOf(mod, id)
      const pristine = buildNodeFields(sc, mod, [], drug).fields
      const secondLine = pristine.S.split('\n').slice(1).join('\n')
      const base = deriveNodeBlockCore(sc, mod, [], null, drug)
      for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        const rapid: RapidState = { previousEvent: t, currentOutcome: c }
        const derived = deriveRawFields(sc, mod, [], rapid, drug)
        assert.equal(
          derived.S.split('\n').slice(1).join('\n'), secondLine,
          `${mod.moduleId}/${id} ${t}/${c}: 第2文以降が変化した`,
        )
        const register = registerOf(sc)
        assert.equal(
          derived.S.split('\n')[0],
          buildV2FirstSentence(t, c, register, drug, verbOf(mod)),
          `${mod.moduleId}/${id} ${t}/${c}: 第1文不一致`,
        )
        const core = deriveNodeBlockCore(sc, mod, [], rapid, drug)
        assert.equal(core.rawFields.O, base.rawFields.O, `${mod.moduleId}/${id} ${t}/${c}: O`)
        assert.equal(core.rawFields.A, base.rawFields.A, `${mod.moduleId}/${id} ${t}/${c}: A`)
        assert.equal(core.rawFields.P, base.rawFields.P, `${mod.moduleId}/${id} ${t}/${c}: P`)
        assert.equal(core.closingText, base.closingText, `${mod.moduleId}/${id} ${t}/${c}: closingText`)
        assert.equal(core.closingBehavior, base.closingBehavior, `${mod.moduleId}/${id} ${t}/${c}: closingBehavior`)
      }
    }
  }

  test('トラゼンタ: 副作用なし5 scenario で第2文以降 byte 保持・O/A/P/closing 不変', () => {
    assertPreservation(TRAZENTA_MOD, TRAZENTA_SIDE_EFFECT_NONE_IDS, TRAZENTA_DRUG)
  })

  test('ノボラピッド: 副作用なし2 scenario で第2文以降 byte 保持・O/A/P/closing 不変', () => {
    assertPreservation(NOVORAPID_MOD, NOVORAPID_SIDE_EFFECT_NONE_IDS, NOVORAPID_DRUG)
  })

  test('トラゼンタ・ノボラピッドとも cp_good で第2文以降 byte 保持・O/A/P/closing 不変', () => {
    assertPreservation(TRAZENTA_MOD, ['cp_good'], TRAZENTA_DRUG)
    assertPreservation(NOVORAPID_MOD, ['cp_good'], NOVORAPID_DRUG)
  })
})

// ═══════════════════════════════════════════════════════════════
// F. severity gate — severity 分岐 scenario は Rapid-capable ではない
//    （第1文置換による clinical information 欠落を構造的に回避する）
// ═══════════════════════════════════════════════════════════════

describe('F. severity gate: severity 分岐のある side_effect scenario は Rapid-capable ではない', () => {
  test('トラゼンタ: severity 分岐5 scenario（mild_continue/moderate_consider_dr/change/dose_decrease/stop）はいずれも non-capable', () => {
    for (const id of TRAZENTA_SEVERITY_IDS) {
      const sc = scenarioOf(TRAZENTA_MOD, id)
      assert.equal(
        isScenarioSReplacementCapable(sc), false,
        `${id} が capable と判定されている。severity 情報が Rapid の第1文置換で失われるリスクがある`,
      )
    }
  })

  test('ノボラピッド: severity 分岐9 scenario（hypoglycemia系5 + injection_site系4）はいずれも non-capable', () => {
    for (const id of NOVORAPID_SEVERITY_IDS) {
      const sc = scenarioOf(NOVORAPID_MOD, id)
      assert.equal(
        isScenarioSReplacementCapable(sc), false,
        `${id} が capable と判定されている。severity 情報が Rapid の第1文置換で失われるリスクがある`,
      )
    }
  })

  test('severity scenario には明示的な thirdPanelSPlacement override も存在しない（fallback 判定を上書きしていない）', () => {
    for (const id of [...TRAZENTA_SEVERITY_IDS]) {
      const sc = scenarioOf(TRAZENTA_MOD, id)
      assert.equal(sc.thirdPanelSPlacement, undefined, `${id} に想定外の override がある`)
    }
    for (const id of [...NOVORAPID_SEVERITY_IDS]) {
      const sc = scenarioOf(NOVORAPID_MOD, id)
      assert.equal(sc.thirdPanelSPlacement, undefined, `${id} に想定外の override がある`)
    }
  })

  test('severity scenario の clinical information は「1文目」（Rapid が置換する箇所）に埋め込まれている scenario が存在する（capability gate が実効すべき理由の実測）', () => {
    // isScenarioSReplacementCapable が上記2 testで false と確認済みであるため、
    // production の UI からこれら severity scenario へ Rapid state が渡ることはない
    // （Group A/I 同様、gate の条件式自体は他 test が固定する。ここでは
    // 「なぜ gate が必要か」を実測で裏付ける: severity scenario は H1 の副作用系
    // scenario（1文目=定型文、2文目以降=scenario固有情報）という構造を前提にできない。
    // 実測: dm_dpp4_oral の se_mild_continue は単一文で severity 情報を保持しており
    // （2文目以降は存在しない）、first-sentence replace 方式の Rapid をもし適用すると
    // clinical information 全体が失われる。これが「severity 情報は第1文の後ろに
    // 必ず退避されている」という H1 の前提が severity scenario には成立しない
    // 具体例であり、severity scenario を capability から除外する判断の実測根拠である。
    const sc = scenarioOf(TRAZENTA_MOD, 'se_mild_continue')
    const pristine = buildNodeFields(sc, TRAZENTA_MOD, [], TRAZENTA_DRUG).fields
    assert.equal(
      pristine.S.split('\n').length, 1,
      'se_mild_continue の想定（単一文に severity 情報が埋め込まれている）が実測と異なる。severity gate の前提を再確認すること',
    )
    assert.ok(pristine.S.includes('便秘'), 'severity 情報（便秘の言及）が第1文中に存在するはず')
  })

  test('severity scenario で万一 capability gate を迂回して Rapid を適用した場合、単一文 scenario では clinical information が完全に失われる（gate の必要性を示す否定的実測）', () => {
    const sc = scenarioOf(TRAZENTA_MOD, 'se_mild_continue')
    const pristine = buildNodeFields(sc, TRAZENTA_MOD, [], TRAZENTA_DRUG).fields
    const derived = deriveRawFields(
      sc, TRAZENTA_MOD, [], { previousEvent: 'continued_do', currentOutcome: 'stable' }, TRAZENTA_DRUG,
    )
    // deriveRawFields 自体は capability を検査せず、rapid が non-null なら常に
    // 第1文（＝ se_mild_continue では S 全体）を置換する（責務分離。UI 側の
    // isSReplacementEligible が到達を防ぐ）。ここでは「防がれなかった場合に
    // 何が起きるか」を明示し、severity gate が UI 側の任意選択ではなく必須である
    // ことを示す。
    assert.notEqual(derived.S, pristine.S)
    assert.equal(derived.S.includes('便秘'), false, 'severity 情報が Rapid 適用で失われることの実測（=gate が必須である根拠）')
  })
})

// ═══════════════════════════════════════════════════════════════
// G. module switching / state — H1 ⇄ トラゼンタ ⇄ ノボラピッド、v2→v1、reset契約
// ═══════════════════════════════════════════════════════════════

describe('G. module / scenario 切替時の Rapid state 契約（H1・トラゼンタ・ノボラピッドと v1 profile module）', () => {
  test('H1 v2 → トラゼンタ v2: capable→capable で state を保持する（scenario 切替関数は module を見ない）', () => {
    const rapid: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'unchanged' }
    const next = nextRapidStateOnScenarioChange(
      rapid,
      isScenarioSReplacementCapable(scenarioOf(H1_MOD, 'se_irritation_none')),
      isScenarioSReplacementCapable(scenarioOf(TRAZENTA_MOD, 'se_hypo_none')),
    )
    assert.deepEqual(next, rapid)
  })

  test('H1 v2 → ノボラピッド v2: capable→capable で state を保持する', () => {
    const rapid: RapidState = { previousEvent: 'regimen_reduced', currentOutcome: 'improved' }
    const next = nextRapidStateOnScenarioChange(
      rapid,
      isScenarioSReplacementCapable(scenarioOf(H1_MOD, 'cp_good')),
      isScenarioSReplacementCapable(scenarioOf(NOVORAPID_MOD, 'se_hypo_none')),
    )
    assert.deepEqual(next, rapid)
  })

  test('v2 module（トラゼンタ）→ v1 module（一時除外）: capable→capable でも register/verb は production の rapidProfileOf 判定で切り替わる', () => {
    const V1_MOD = ALL_MODULES.find(m => m.moduleId === V1_EXCLUDED_MODULE_ID)!
    const V1_SC = V1_MOD.scenarios.find(isScenarioSReplacementCapable)!
    assert.equal(rapidProfileOf(V1_MOD), 'v1')

    const trazentaDerived = deriveRawFields(
      scenarioOf(TRAZENTA_MOD, 'se_hypo_none'), TRAZENTA_MOD, [],
      { previousEvent: 'continued_do', currentOutcome: 'stable' }, TRAZENTA_DRUG,
    )
    assert.equal(trazentaDerived.S.split('\n')[0], `${TRAZENTA_DRUG}を服用して症状は落ち着いている。`)

    const v1Derived = deriveRawFields(
      V1_SC, V1_MOD, [],
      { previousEvent: 'continued_do', currentOutcome: 'stable' }, 'ゼペリン点眼液',
    )
    assert.ok(v1Derived.S.split('\n')[0].includes('引き続き使用して'), 'v1 module の realization が v2 化していない（回帰）')
  })

  test('capable → non-capable: state は null になる（module に依らない既存契約）', () => {
    const rapid: RapidState = { previousEvent: 'new_addition', currentOutcome: 'stable' }
    const next = nextRapidStateOnScenarioChange(
      rapid,
      isScenarioSReplacementCapable(scenarioOf(TRAZENTA_MOD, 'se_hypo_none')),
      isScenarioSReplacementCapable(scenarioOf(NOVORAPID_MOD, 'se_mild_continue')),
    )
    assert.equal(next, null)
  })

  test('OFF（rapid: null）で Default へ byte 単位で戻る（トラゼンタ・ノボラピッドとも）', () => {
    for (const [mod, drug, id] of [
      [TRAZENTA_MOD, TRAZENTA_DRUG, 'se_hypo_none'],
      [NOVORAPID_MOD, NOVORAPID_DRUG, 'se_hypo_none'],
    ] as const) {
      const sc = scenarioOf(mod, id)
      const pristine = deriveRawFields(sc, mod, [], null, drug)
      const on = deriveRawFields(sc, mod, [], { previousEvent: 'dose_decreased', currentOutcome: 'not_improved' }, drug)
      assert.notEqual(on.S, pristine.S, `${mod.moduleId}: ON で S が変化していない`)
      const off = deriveRawFields(sc, mod, [], null, drug)
      assert.deepEqual(off, pristine, `${mod.moduleId}: OFF が Default と一致しない`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// H. multi-node — H1 + トラゼンタ / H1 + ノボラピッド / トラゼンタ + ノボラピッド
// ═══════════════════════════════════════════════════════════════

function makeNode(id: string, mod: ModuleData, sc: Scenario, rapid: RapidState, drugName: string): ComposeNode {
  const base: ComposeNode = {
    id, moduleId: mod.moduleId, scenarioId: '', block: { id: `${id}-block`, templateLabel: '', fields: { S: '', O: '', A: '', P: '' } },
    drugLabel: mod.moduleId, selectedAddonIds: [], baseLabel: '', baseDomain: mod.moduleId, rapid: null,
  }
  return rebuildNode({
    node: base, mod, scenario: sc, addonIds: [], rapid, drugName,
    drugLabel: mod.moduleId, baseDomain: mod.moduleId, personaEnabled: false, persona: 'plain',
  })
}

function mergeTwoNodes(primary: ComposeNode, secondary: ComposeNode): SoapFields {
  return mergeBlocks(
    [secondary.block], primary.block.fields, primary.block.templateLabel,
    primary.block.closingText, undefined, primary.block.groupKey, primary.block.clinicalDomain,
  )
}

describe('H. multi-node（H1 + トラゼンタ / H1 + ノボラピッド / トラゼンタ + ノボラピッド）', () => {
  test('H1 + トラゼンタ: state が独立している', () => {
    const a = makeNode('a', H1_MOD, scenarioOf(H1_MOD, 'se_irritation_none'), { previousEvent: 'new_addition', currentOutcome: 'stable' }, H1_DRUG)
    const b = makeNode('b', TRAZENTA_MOD, scenarioOf(TRAZENTA_MOD, 'se_hypo_none'), { previousEvent: 'regimen_reduced', currentOutcome: 'not_improved' }, TRAZENTA_DRUG)
    assert.deepEqual(a.rapid, { previousEvent: 'new_addition', currentOutcome: 'stable' })
    assert.deepEqual(b.rapid, { previousEvent: 'regimen_reduced', currentOutcome: 'not_improved' })
    assert.ok(a.block.fields.S.includes(H1_DRUG))
    assert.ok(!b.block.fields.S.includes(TRAZENTA_DRUG), '処方整理は薬剤名を含まないはず')
  })

  test('H1 + ノボラピッド: state が独立している', () => {
    const a = makeNode('a', H1_MOD, scenarioOf(H1_MOD, 'cp_good'), { previousEvent: 'dose_increased', currentOutcome: 'improved' }, H1_DRUG)
    const b = makeNode('b', NOVORAPID_MOD, scenarioOf(NOVORAPID_MOD, 'se_injection_site_induration_none'), { previousEvent: 'continued_do', currentOutcome: 'unchanged' }, NOVORAPID_DRUG)
    assert.deepEqual(a.rapid, { previousEvent: 'dose_increased', currentOutcome: 'improved' })
    assert.deepEqual(b.rapid, { previousEvent: 'continued_do', currentOutcome: 'unchanged' })
    assert.ok(b.block.fields.S.startsWith(`${NOVORAPID_DRUG}を使用して`))
  })

  test('トラゼンタ + ノボラピッド: state が独立している', () => {
    const a = makeNode('a', TRAZENTA_MOD, scenarioOf(TRAZENTA_MOD, 'se_constipation_none'), { previousEvent: 'continued_do', currentOutcome: 'stable' }, TRAZENTA_DRUG)
    const b = makeNode('b', NOVORAPID_MOD, scenarioOf(NOVORAPID_MOD, 'se_hypo_none'), { previousEvent: 'continued_do', currentOutcome: 'stable' }, NOVORAPID_DRUG)
    assert.ok(a.block.fields.S.startsWith(`${TRAZENTA_DRUG}を服用して`), 'route verb 差分が multi-node でも保たれるはず')
    assert.ok(b.block.fields.S.startsWith(`${NOVORAPID_DRUG}を使用して`), 'route verb 差分が multi-node でも保たれるはず')
  })

  test('scenario 変更が他 node へ波及しない（H1 + トラゼンタ）', () => {
    const a0 = makeNode('a', H1_MOD, scenarioOf(H1_MOD, 'se_irritation_none'), { previousEvent: 'dose_increased', currentOutcome: 'stable' }, H1_DRUG)
    const bBefore = makeNode('b', TRAZENTA_MOD, scenarioOf(TRAZENTA_MOD, 'cp_good'), { previousEvent: 'med_changed', currentOutcome: 'improved' }, TRAZENTA_DRUG)
    const newSc = scenarioOf(H1_MOD, 'se_pruritus_none')
    const nextRapid = nextRapidStateOnScenarioChange(
      a0.rapid, isScenarioSReplacementCapable(scenarioOf(H1_MOD, 'se_irritation_none')), isScenarioSReplacementCapable(newSc),
    )
    const aAfter = rebuildNode({
      node: a0, mod: H1_MOD, scenario: newSc, addonIds: [], rapid: nextRapid, drugName: H1_DRUG,
      drugLabel: a0.drugLabel, baseDomain: a0.baseDomain, personaEnabled: false, persona: 'plain',
    })
    assert.deepEqual(aAfter.rapid, { previousEvent: 'dose_increased', currentOutcome: 'stable' })
    assert.deepEqual(bBefore.rapid, { previousEvent: 'med_changed', currentOutcome: 'improved' }, 'b の state が波及で変化した')
  })

  test('OFF が他 node へ波及しない（トラゼンタ + ノボラピッド）', () => {
    const a0 = makeNode('a', TRAZENTA_MOD, scenarioOf(TRAZENTA_MOD, 'se_hypo_none'), { previousEvent: 'new_addition', currentOutcome: 'stable' }, TRAZENTA_DRUG)
    const b = makeNode('b', NOVORAPID_MOD, scenarioOf(NOVORAPID_MOD, 'cp_good'), { previousEvent: 'regimen_reduced', currentOutcome: 'unchanged' }, NOVORAPID_DRUG)
    const aOff = rebuildNode({
      node: a0, mod: TRAZENTA_MOD, scenario: scenarioOf(TRAZENTA_MOD, 'se_hypo_none'), addonIds: [], rapid: null, drugName: TRAZENTA_DRUG,
      drugLabel: a0.drugLabel, baseDomain: a0.baseDomain, personaEnabled: false, persona: 'plain',
    })
    assert.equal(aOff.rapid, null)
    assert.deepEqual(b.rapid, { previousEvent: 'regimen_reduced', currentOutcome: 'unchanged' }, 'b の state が a の OFF で変化した')
  })

  test('合成方向によらず同じ行集合が保存される（内容欠落・重複なし。H1 + ノボラピッド）', () => {
    const a = makeNode('a', H1_MOD, scenarioOf(H1_MOD, 'se_irritation_none'), { previousEvent: 'dose_increased', currentOutcome: 'stable' }, H1_DRUG)
    const b = makeNode('b', NOVORAPID_MOD, scenarioOf(NOVORAPID_MOD, 'cp_good'), { previousEvent: 'regimen_reduced', currentOutcome: 'stable' }, NOVORAPID_DRUG)
    const ab = mergeTwoNodes(a, b)
    const ba = mergeTwoNodes(b, a)
    assert.deepEqual(ab.S.split('\n').sort(), ba.S.split('\n').sort())
  })

  test('「。・」等の不自然な句読点の結合を生まない（トラゼンタ + ノボラピッド 全組合せ）', () => {
    const cases: Array<[RapidTransitionV2, SCondition]> = [
      ['new_addition', 'stable'], ['med_changed', 'not_improved'],
      ['regimen_reduced', 'improved'], ['dose_increased', 'unchanged'], ['dose_decreased', 'not_improved'],
    ]
    for (const [t1, c1] of cases) for (const [t2, c2] of cases) {
      const a = makeNode('a', TRAZENTA_MOD, scenarioOf(TRAZENTA_MOD, 'se_constipation_none'), { previousEvent: t1, currentOutcome: c1 }, TRAZENTA_DRUG)
      const b = makeNode('b', NOVORAPID_MOD, scenarioOf(NOVORAPID_MOD, 'se_hypo_none'), { previousEvent: t2, currentOutcome: c2 }, NOVORAPID_DRUG)
      const merged = mergeTwoNodes(a, b)
      assert.equal(/。・/.test(merged.S), false, `splice: ${t1}/${c1} + ${t2}/${c2}\nS=${merged.S}`)
    }
  })

  test('意味の欠落なし: cross-module 2-node合成でも各 node の Rapid 第1文が両方とも残余に含まれる', () => {
    const a = makeNode('a', H1_MOD, scenarioOf(H1_MOD, 'se_irritation_none'), { previousEvent: 'continued_do', currentOutcome: 'improved' }, H1_DRUG)
    const b = makeNode('b', TRAZENTA_MOD, scenarioOf(TRAZENTA_MOD, 'se_hypo_none'), { previousEvent: 'continued_do', currentOutcome: 'improved' }, TRAZENTA_DRUG)
    const merged = mergeTwoNodes(a, b)
    assert.ok(merged.S.includes(`${H1_DRUG}を使用して症状は良くなってきた。`), 'H1 node の Rapid 第1文が合成後に失われている')
    assert.ok(merged.S.includes(`${TRAZENTA_DRUG}を服用して症状は良くなってきた。`), 'トラゼンタ node の Rapid 第1文が合成後に失われている')
  })
})
