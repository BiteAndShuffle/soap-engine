/**
 * rapidV2AdditionalPilot.test.ts — Rapid v2 追加 pilot（外用 / 心腎 / 配合剤）契約テスト
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-READINESS-1 §3。
 *
 * OD-RAPID-MULTI-PILOT-1 §B の3 module（H1点眼・トラゼンタ・ノボラピッド）に対し、
 * OD-RAPID-READINESS-1 §3 で承認された追加 pilot 3 module を加えた 6 module 限定 pilot の、
 * **追加 3 module 側の契約**を固定する（global promotion ではない）。
 *
 *   - `derm_heparinoid_moisturizer_ointment`（topical / dermatology）
 *   - `cardiorenal_sglt2_oral`（oral / cardiorenal）
 *   - `dm_dpp4_biguanide_combination_oral`（oral / diabetes・配合剤）
 *
 * allowlist の exact set 契約は `tests/rapidV2MultiModulePilot.test.ts` A が持つ（本ファイルでは重複させない）。
 * H1 の Reference Baseline 契約は `tests/rapidV2H1Pilot.test.ts` が持つ。
 *
 * 本ファイルが固定するもの:
 *   0. 追加 3 module の capable / severity scenario の実測
 *   A. drug-specific 6×4 の第1文（Owner Human Review 対象の文面を exact に固定）
 *   B. regimen-level（cp_good）6×4 の第1文
 *   C. topical: `display.adjustmentExpression`（使用回数）が v2 realization に出現しないこと
 *      （OD-RAPID-READINESS-1 §3・Owner 追加条件 4。canonical 値は不変であることも固定）
 *   D. 第1文のみ変更・残余 byte 保持・O/A/P/closing 不変・OFF byte 復元
 *   E. severity gate（severity 分岐 scenario は Rapid-capable ではない）
 *   F. multi-node 合成（cross-domain は regimen 文を共有しない／同一 domain は共有する）
 *   G. `RAPID_CAPABLE_S_CONTRACT` validator が追加 3 module でも 0 件
 *   H. 非 pilot module の Rapid 出力が v1 realization と一致し続けること（allowlist 拡張の非侵襲性）
 *
 * production 関数を直接 import する。mirror 実装は作らない（RAPID-V2-20 の踏襲）。
 *
 * 実行: npx tsx --test tests/rapidV2AdditionalPilot.test.ts
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import type { ComposeNode, ModuleData, Scenario, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { mergeBlocks } from '../lib/buildSoap'
import { rebuildNode } from '../lib/primaryNode'
import { deriveRawFields } from '../lib/deriveNodeFields'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { validateModule } from '../lib/moduleValidator'
import { nextRapidStateOnScenarioChange, type RapidState, type RapidTransitionV2 } from '../lib/rapidState'
import { buildResolvedSFirstSentence, type SCondition, type SRelation } from '../lib/rapidSentence'
import { rapidProfileOf, rapidV2CompositionOf, registerOf, verbOf } from '../lib/rapidV2'

const DERM_ID = 'derm_heparinoid_moisturizer_ointment'
const CARDIORENAL_ID = 'cardiorenal_sglt2_oral'
const COMBINATION_ID = 'dm_dpp4_biguanide_combination_oral'
const TRAZENTA_ID = 'dm_dpp4_oral'

const byId = (id: string): ModuleData => {
  const m = ALL_MODULES.find(x => x.moduleId === id)
  assert.ok(m, `module ${id} が見つからない`)
  return m!
}
const DERM = byId(DERM_ID)
const CARDIORENAL = byId(CARDIORENAL_ID)
const COMBINATION = byId(COMBINATION_ID)
const TRAZENTA = byId(TRAZENTA_ID)

const DERM_DRUG = 'ヒルドイドソフト軟膏'
const CARDIORENAL_DRUG = 'フォシーガ'
const COMBINATION_DRUG = 'メトアナ'
const TRAZENTA_DRUG = 'トラゼンタ'

/** 実測（0 節）で確定した capable scenario */
const DERM_CAPABLE_DRUG_IDS = ['se_contact_dermatitis_none', 'se_redness_none', 'se_pruritus_none', 'se_dermatitis_none']
const CARDIORENAL_CAPABLE_DRUG_IDS = ['se_urinary_frequency_none', 'se_dehydration_none', 'se_genitourinary_infection_none']
const COMBINATION_CAPABLE_DRUG_IDS = [
  'se_diarrhea_abdominal_pain_none',
  'se_appetite_loss_none',
  'se_lactic_acidosis_none',
  'se_abdominal_distension_none',
  'se_hypo_none',
  'se_pancreatitis_none',
  'se_bullous_pemphigoid_none',
]

/** 実測で確定した severity 分岐 scenario（capable ではない） */
const DERM_SEVERITY_IDS = ['se_mild_continue', 'se_change_due_to_pruritus', 'se_frequency_decrease_due_to_pruritus', 'se_stop_due_to_pruritus']
const CARDIORENAL_SEVERITY_IDS = ['se_mild_continue', 'se_change_due_to_urinary_frequency', 'se_stop_due_to_urinary_frequency']
const COMBINATION_SEVERITY_IDS = [
  'se_mild_continue',
  'se_moderate_consider_dr',
  'se_change_due_to_gi_symptoms',
  'se_dose_decrease_due_to_gi_symptoms',
  'se_stop_due_to_gi_symptoms',
]

const TRANSITIONS: RapidTransitionV2[] = ['continued_do', 'new_addition', 'med_changed', 'regimen_reduced', 'dose_increased', 'dose_decreased']
const CONDITIONS: SCondition[] = ['stable', 'unchanged', 'improved', 'not_improved']
const V1_RELATIONS: SRelation[] = ['continued_do', 'new_addition', 'med_changed', 'dose_increased', 'dose_decreased']

const R = (t: RapidTransitionV2, c: SCondition): RapidState => ({ previousEvent: t, currentOutcome: c })

function scenarioOf(mod: ModuleData, id: string): Scenario {
  const sc = mod.scenarios.find(s => s.id === id)
  assert.ok(sc, `${mod.moduleId} に scenario ${id} が見つからない`)
  return sc!
}
const firstLine = (f: SoapFields) => f.S.split('\n')[0]
const remainder = (f: SoapFields) => f.S.split('\n').slice(1).join('\n')
const derive = (mod: ModuleData, sc: Scenario, rapid: RapidState, drug: string) => deriveRawFields(sc, mod, [], rapid, drug)

// ═══════════════════════════════════════════════════════════════
// 0. Repository fact — 追加 3 module の実測
// ═══════════════════════════════════════════════════════════════

describe('0. 追加 pilot 3 module の profile / capable / severity 実測', () => {
  test('3 module とも v2（allowlist 追加済み）', () => {
    assert.equal(rapidProfileOf(DERM), 'v2')
    assert.equal(rapidProfileOf(CARDIORENAL), 'v2')
    assert.equal(rapidProfileOf(COMBINATION), 'v2')
  })

  test('route 由来動詞: 外用は使用、心腎・配合剤は服用', () => {
    assert.equal(DERM.drug?.route, 'topical')
    assert.equal(verbOf(DERM), '使用')
    assert.equal(CARDIORENAL.drug?.route, 'oral')
    assert.equal(verbOf(CARDIORENAL), '服用')
    assert.equal(COMBINATION.drug?.route, 'oral')
    assert.equal(verbOf(COMBINATION), '服用')
  })

  test('capable scenario は drug register の副作用なし + cp_good（外用5 / 心腎4 / 配合剤8）', () => {
    for (const [mod, drugIds] of [[DERM, DERM_CAPABLE_DRUG_IDS], [CARDIORENAL, CARDIORENAL_CAPABLE_DRUG_IDS], [COMBINATION, COMBINATION_CAPABLE_DRUG_IDS]] as const) {
      const capable = mod.scenarios.filter(isScenarioSReplacementCapable)
      assert.deepEqual(capable.map(s => s.id), [...drugIds, 'cp_good'], mod.moduleId)
      for (const id of drugIds) assert.equal(registerOf(scenarioOf(mod, id)), 'drug', `${mod.moduleId}/${id}`)
      assert.equal(registerOf(scenarioOf(mod, 'cp_good')), 'regimen', mod.moduleId)
    }
  })

  test('clinicalDomain: dermatology / cardiorenal / diabetes', () => {
    assert.equal(DERM.composition?.clinicalDomain, 'dermatology')
    assert.equal(CARDIORENAL.composition?.clinicalDomain, 'cardiorenal')
    assert.equal(COMBINATION.composition?.clinicalDomain, 'diabetes')
  })
})

// ═══════════════════════════════════════════════════════════════
// A. drug-specific 6×4（Human Review 対象の文面を exact 固定）
// ═══════════════════════════════════════════════════════════════

/** v2 drug-specific 第1文の期待表（OD-RAPID-READINESS-1 §3 で Human Review する文面） */
function expectedDrugLines(drug: string, verb: string): Record<RapidTransitionV2, string[]> {
  return {
    continued_do: [
      `${drug}を${verb}して症状は落ち着いている。`,
      `${drug}を${verb}して症状は変わりない。`,
      `${drug}を${verb}して症状は良くなってきた。`,
      `${drug}を${verb}しているが症状の改善は乏しい。`,
    ],
    new_addition: [
      `前回から${drug}が追加となり症状は落ち着いている。`,
      `前回から${drug}が追加となり症状は変わりない。`,
      `前回から${drug}が追加となり症状は良くなってきた。`,
      `前回から${drug}が追加となったが症状の改善は乏しい。`,
    ],
    med_changed: [
      `前回から${drug}に変更となり症状は落ち着いている。`,
      `前回から${drug}に変更となり症状は変わりない。`,
      `前回から${drug}に変更となり症状は良くなってきた。`,
      `前回から${drug}に変更となったが症状の改善は乏しい。`,
    ],
    regimen_reduced: [
      '前回の処方整理後も症状は落ち着いている。',
      '前回の処方整理後も症状は変わりない。',
      '前回の処方整理後、症状は良くなってきた。',
      '前回の処方整理後も症状の改善は乏しい。',
    ],
    dose_increased: [
      `前回から${drug}が増量となり症状は落ち着いている。`,
      `前回から${drug}が増量となり症状は変わりない。`,
      `前回から${drug}が増量となり症状は良くなってきた。`,
      `前回から${drug}が増量となったが症状の改善は乏しい。`,
    ],
    dose_decreased: [
      `前回から${drug}が減量となり症状は落ち着いている。`,
      `前回から${drug}が減量となり症状は変わりない。`,
      `前回から${drug}が減量となり症状は良くなってきた。`,
      `前回から${drug}が減量となったが症状の改善は乏しい。`,
    ],
  }
}

describe('A. drug-specific 6×4 = 24文（外用 / 心腎 / 配合剤）', () => {
  for (const [mod, drug, scId] of [
    [DERM, DERM_DRUG, DERM_CAPABLE_DRUG_IDS[0]],
    [CARDIORENAL, CARDIORENAL_DRUG, CARDIORENAL_CAPABLE_DRUG_IDS[0]],
    [COMBINATION, COMBINATION_DRUG, COMBINATION_CAPABLE_DRUG_IDS[0]],
  ] as const) {
    test(`${mod.moduleId}: 24文が exact に一致する`, () => {
      const expected = expectedDrugLines(drug, verbOf(mod))
      const sc = scenarioOf(mod, scId)
      for (const t of TRANSITIONS) {
        const got = CONDITIONS.map(c => firstLine(derive(mod, sc, R(t, c), drug)))
        assert.deepEqual(got, expected[t], `${mod.moduleId} / ${t}`)
      }
    })
  }

  test('外用: 使用回数の軸ではなく「増量／減量」へ抽象化された文になる（Owner 評価対象・§3）', () => {
    const sc = scenarioOf(DERM, 'se_contact_dermatitis_none')
    assert.equal(
      derive(DERM, sc, R('dose_increased', 'stable'), DERM_DRUG).S,
      `前回から${DERM_DRUG}が増量となり症状は落ち着いている。\nかぶれは認めない。`,
    )
    assert.equal(
      derive(DERM, sc, R('dose_decreased', 'not_improved'), DERM_DRUG).S,
      `前回から${DERM_DRUG}が減量となったが症状の改善は乏しい。\nかぶれは認めない。`,
    )
  })

  test('心腎: 現行 bridge の「症状」表現のまま realize される（§1 の PENDING 対象。subject 切替はしない）', () => {
    const sc = scenarioOf(CARDIORENAL, 'se_urinary_frequency_none')
    assert.equal(
      derive(CARDIORENAL, sc, R('continued_do', 'improved'), CARDIORENAL_DRUG).S,
      `${CARDIORENAL_DRUG}を服用して症状は良くなってきた。\n排尿回数の増加は気にならない。`,
    )
  })

  test('配合剤: 配合剤名が drug-specific 主語になり、成分別の残余が保持される', () => {
    assert.equal(
      derive(COMBINATION, scenarioOf(COMBINATION, 'se_lactic_acidosis_none'), R('dose_increased', 'stable'), COMBINATION_DRUG).S,
      `前回から${COMBINATION_DRUG}が増量となり症状は落ち着いている。\n強いだるさ、吐き気、腹痛、息苦しさなどの症状は認めない。`,
    )
    assert.equal(
      derive(COMBINATION, scenarioOf(COMBINATION, 'se_hypo_none'), R('med_changed', 'stable'), COMBINATION_DRUG).S,
      `前回から${COMBINATION_DRUG}に変更となり症状は落ち着いている。\nふらつき・冷汗・動悸などの低血糖症状は認めない。`,
    )
  })

  test('処方整理4文には追加 pilot いずれの薬剤名も含まれない（DP-19 OD-RAPID-SCOPE-1）', () => {
    for (const [mod, drug] of [[DERM, DERM_DRUG], [CARDIORENAL, CARDIORENAL_DRUG], [COMBINATION, COMBINATION_DRUG]] as const) {
      const sc = mod.scenarios.filter(isScenarioSReplacementCapable)[0]
      for (const c of CONDITIONS) {
        const line = firstLine(derive(mod, sc, R('regimen_reduced', c), drug))
        assert.equal(line.includes(drug), false, `${mod.moduleId} / ${c}: ${line}`)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// B. regimen-level（cp_good）6×4
// ═══════════════════════════════════════════════════════════════

function expectedRegimenLines(verb: string): Record<RapidTransitionV2, string[]> {
  return {
    continued_do: [
      `薬を${verb}して症状は落ち着いている。`,
      `薬を${verb}して症状は変わりない。`,
      `薬を${verb}して症状は良くなってきた。`,
      `薬を${verb}しているが症状の改善は乏しい。`,
    ],
    new_addition: ['前回の薬剤追加後も症状は落ち着いている。', '前回の薬剤追加後も症状は変わりない。', '前回の薬剤追加後、症状は良くなってきた。', '前回の薬剤追加後も症状の改善は乏しい。'],
    med_changed: ['前回の薬剤変更後も症状は落ち着いている。', '前回の薬剤変更後も症状は変わりない。', '前回の薬剤変更後、症状は良くなってきた。', '前回の薬剤変更後も症状の改善は乏しい。'],
    regimen_reduced: ['前回の処方整理後も症状は落ち着いている。', '前回の処方整理後も症状は変わりない。', '前回の処方整理後、症状は良くなってきた。', '前回の処方整理後も症状の改善は乏しい。'],
    dose_increased: ['前回の増量後も症状は落ち着いている。', '前回の増量後も症状は変わりない。', '前回の増量後、症状は良くなってきた。', '前回の増量後も症状の改善は乏しい。'],
    dose_decreased: ['前回の減量後も症状は落ち着いている。', '前回の減量後も症状は変わりない。', '前回の減量後、症状は良くなってきた。', '前回の減量後も症状の改善は乏しい。'],
  }
}

describe('B. cp_good は regimen-level realization（薬剤名を含まない。Do のみ route 由来動詞）', () => {
  for (const [mod, drug] of [[DERM, DERM_DRUG], [CARDIORENAL, CARDIORENAL_DRUG], [COMBINATION, COMBINATION_DRUG]] as const) {
    test(`${mod.moduleId}: cp_good 24文が exact に一致し、薬剤名を含まない`, () => {
      const expected = expectedRegimenLines(verbOf(mod))
      const sc = scenarioOf(mod, 'cp_good')
      for (const t of TRANSITIONS) {
        const got = CONDITIONS.map(c => firstLine(derive(mod, sc, R(t, c), drug)))
        assert.deepEqual(got, expected[t], `${mod.moduleId} / ${t}`)
        for (const line of got) assert.equal(line.includes(drug), false, `${mod.moduleId}: cp_good に薬剤名が混入 (${line})`)
      }
    })
  }

  test('scenario 切替（capable → capable）で state を保持し、register が切り替わる（外用）', () => {
    const se = scenarioOf(DERM, 'se_contact_dermatitis_none')
    const cp = scenarioOf(DERM, 'cp_good')
    const state = R('dose_increased', 'improved')
    const next = nextRapidStateOnScenarioChange(state, isScenarioSReplacementCapable(se), isScenarioSReplacementCapable(cp))
    assert.deepEqual(next, state)
    assert.equal(firstLine(derive(DERM, se, next, DERM_DRUG)), `前回から${DERM_DRUG}が増量となり症状は良くなってきた。`)
    assert.equal(firstLine(derive(DERM, cp, next, DERM_DRUG)), '前回の増量後、症状は良くなってきた。')
  })
})

// ═══════════════════════════════════════════════════════════════
// C. adjustmentExpression（topical）
// ═══════════════════════════════════════════════════════════════

describe('C. 外用の adjustmentExpression は v2 realization で参照されない（canonical 値は不変）', () => {
  test('canonical の adjustmentExpression は「使用回数が増えた／減った」のまま', () => {
    assert.deepEqual(DERM.display?.adjustmentExpression, { increasePast: '使用回数が増えた', decreasePast: '使用回数が減った' })
  })

  test('v2 の全 24 組合せに使用回数表現が出現しない', () => {
    const ae = DERM.display!.adjustmentExpression!
    for (const sc of DERM.scenarios.filter(isScenarioSReplacementCapable)) {
      for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        const s = derive(DERM, sc, R(t, c), DERM_DRUG).S
        assert.equal(s.includes(ae.increasePast), false, `${sc.id} / ${t} / ${c}`)
        assert.equal(s.includes(ae.decreasePast), false, `${sc.id} / ${t} / ${c}`)
      }
    }
  })

  test('AE を持つ v1 module（点眼以外の外用ではない既存 module）は引き続き AE を使う（回帰確認）', () => {
    const v1 = byId('dm_glp1ra_semaglutide_oral')
    assert.equal(rapidProfileOf(v1), 'v1')
    const ae = v1.display?.adjustmentExpression
    assert.ok(ae)
    const sc = v1.scenarios.find(isScenarioSReplacementCapable)!
    assert.ok(derive(v1, sc, R('dose_increased', 'stable'), 'リベルサス').S.includes(ae!.increasePast))
  })
})

// ═══════════════════════════════════════════════════════════════
// D. 第1文のみ変更 / OFF byte 復元
// ═══════════════════════════════════════════════════════════════

describe('D. 第1文のみ変更され、残余・O/A/P/closing は不変', () => {
  for (const [mod, drug] of [[DERM, DERM_DRUG], [CARDIORENAL, CARDIORENAL_DRUG], [COMBINATION, COMBINATION_DRUG]] as const) {
    test(`${mod.moduleId}: 全 capable × 24 組合せで残余 byte 保持・O/A/P/closing 不変`, () => {
      for (const sc of mod.scenarios.filter(isScenarioSReplacementCapable)) {
        const off = derive(mod, sc, null, drug)
        for (const t of TRANSITIONS) for (const c of CONDITIONS) {
          const on = derive(mod, sc, R(t, c), drug)
          assert.equal(remainder(on), remainder(off), `${sc.id} / ${t} / ${c}`)
          // closing（closingText / closingBehavior）は SoapFields ではなく block core 側が持つため
          // 本テストの対象外。Rapid は S 欄のみを変更する（O / A / P の不変を本テストで固定する）。
          assert.equal(on.O, off.O)
          assert.equal(on.A, off.A)
          assert.equal(on.P, off.P)
        }
      }
    })

    test(`${mod.moduleId}: OFF（rapid = null）で Default へ byte 単位で戻る`, () => {
      for (const sc of mod.scenarios.filter(isScenarioSReplacementCapable)) {
        const off = derive(mod, sc, null, drug)
        for (const t of TRANSITIONS) for (const c of CONDITIONS) {
          derive(mod, sc, R(t, c), drug)
          assert.equal(derive(mod, sc, null, drug).S, off.S, `${sc.id} / ${t} / ${c}`)
        }
      }
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// E. severity gate
// ═══════════════════════════════════════════════════════════════

describe('E. severity 分岐 scenario は Rapid-capable ではない（gate は変更していない）', () => {
  for (const [mod, ids] of [[DERM, DERM_SEVERITY_IDS], [CARDIORENAL, CARDIORENAL_SEVERITY_IDS], [COMBINATION, COMBINATION_SEVERITY_IDS]] as const) {
    test(`${mod.moduleId}: severity ${ids.length} scenario はいずれも non-capable`, () => {
      for (const id of ids) {
        const sc = scenarioOf(mod, id)
        assert.equal(isScenarioSReplacementCapable(sc), false, `${mod.moduleId}/${id}`)
        assert.equal(sc.thirdPanelSPlacement, undefined, `${mod.moduleId}/${id} に明示 override が付いている`)
      }
    })
  }

  test('capable な side_effect scenario は sideEffectPresence が absent_or_not_observed のみ', () => {
    for (const mod of [DERM, CARDIORENAL, COMBINATION]) {
      for (const sc of mod.scenarios.filter(isScenarioSReplacementCapable)) {
        if (sc.scenarioType !== 'side_effect') continue
        assert.equal(sc.sideEffectPresence, 'absent_or_not_observed', `${mod.moduleId}/${sc.id}`)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// F. multi-node 合成（OD-RAPID-COMPOSITION-1）
// ═══════════════════════════════════════════════════════════════

function node(id: string, mod: ModuleData, sc: Scenario, rapid: RapidState, drug: string): ComposeNode {
  const base: ComposeNode = {
    id, moduleId: mod.moduleId, scenarioId: '',
    block: { id: `${id}-block`, templateLabel: '', fields: { S: '', O: '', A: '', P: '' } },
    drugLabel: mod.moduleId, selectedAddonIds: [], baseLabel: '', baseDomain: mod.moduleId, rapid: null,
  }
  return rebuildNode({
    node: base, mod, scenario: sc, addonIds: [], rapid, drugName: drug,
    drugLabel: mod.moduleId, baseDomain: mod.moduleId, personaEnabled: false, persona: 'plain',
  })
}

/** DashboardClient.computeDisplayFields と同一の引数構成 */
function compose(primary: ComposeNode, secondaries: ComposeNode[]): SoapFields {
  return mergeBlocks(
    secondaries.map(n => ({ ...n.block, rapidV2: rapidV2CompositionOf(n) })),
    primary.block.fields, primary.block.templateLabel, primary.block.closingText, undefined,
    primary.block.groupKey, primary.block.clinicalDomain, rapidV2CompositionOf(primary),
  )
}
const lines = (s: string) => s.split('\n')

describe('F. multi-node 合成: cross-domain は共有せず、同一 domain は共有する', () => {
  test('心腎 cp_good + トラゼンタ cp_good（cardiorenal ≠ diabetes）: Do×stable で regimen 文を共有しない', () => {
    const a = node('a', CARDIORENAL, scenarioOf(CARDIORENAL, 'cp_good'), R('continued_do', 'stable'), CARDIORENAL_DRUG)
    const b = node('b', TRAZENTA, scenarioOf(TRAZENTA, 'cp_good'), R('continued_do', 'stable'), TRAZENTA_DRUG)
    assert.deepEqual(lines(compose(a, [b]).S), [
      '薬を服用して症状は落ち着いている。',
      '飲み忘れなく服用している。',
      '薬を服用して症状は落ち着いている。',
      '飲み忘れなく服用している。',
    ])
  })

  test('外用 cp_good + トラゼンタ cp_good（dermatology ≠ diabetes）: 追加×stable でも共有しない', () => {
    const a = node('a', DERM, scenarioOf(DERM, 'cp_good'), R('new_addition', 'stable'), DERM_DRUG)
    const b = node('b', TRAZENTA, scenarioOf(TRAZENTA, 'cp_good'), R('new_addition', 'stable'), TRAZENTA_DRUG)
    assert.deepEqual(lines(compose(a, [b]).S), [
      '前回の薬剤追加後も症状は落ち着いている。',
      '使用忘れなく継続できている。',
      '前回の薬剤追加後も症状は落ち着いている。',
      '飲み忘れなく服用している。',
    ])
  })

  test('配合剤 cp_good + トラゼンタ cp_good（同一 diabetes・同一 groupKey・同一文・同一 remainder）: 1回に集約', () => {
    const a = node('a', COMBINATION, scenarioOf(COMBINATION, 'cp_good'), R('continued_do', 'stable'), COMBINATION_DRUG)
    const b = node('b', TRAZENTA, scenarioOf(TRAZENTA, 'cp_good'), R('continued_do', 'stable'), TRAZENTA_DRUG)
    assert.deepEqual(lines(compose(a, [b]).S), ['薬を服用して症状は落ち着いている。', '飲み忘れなく服用している。'])
  })

  test('drug-specific 文は stable node order で残る（配合剤 処方整理 + トラゼンタ Do）', () => {
    const a = node('a', COMBINATION, scenarioOf(COMBINATION, 'se_diarrhea_abdominal_pain_none'), R('regimen_reduced', 'stable'), COMBINATION_DRUG)
    const b = node('b', TRAZENTA, scenarioOf(TRAZENTA, 'se_constipation_none'), R('continued_do', 'stable'), TRAZENTA_DRUG)
    assert.deepEqual(lines(compose(a, [b]).S), [
      '前回の処方整理後も症状は落ち着いている。',
      '下痢や腹痛は認めない。',
      `${TRAZENTA_DRUG}を服用して症状は落ち着いている。`,
      '便秘は認めない。',
    ])
  })

  test('追加 pilot module 同士・既存 pilot との合成で state が独立している', () => {
    const a = node('a', DERM, scenarioOf(DERM, 'cp_good'), R('continued_do', 'improved'), DERM_DRUG)
    const b = node('b', CARDIORENAL, scenarioOf(CARDIORENAL, 'cp_good'), null, CARDIORENAL_DRUG)
    assert.deepEqual(rapidV2CompositionOf(a), { transition: 'continued_do', outcome: 'improved', regimenLevel: true })
    assert.equal(rapidV2CompositionOf(b), undefined)
  })
})

// ═══════════════════════════════════════════════════════════════
// G. validator scope は allowlist へ追従するだけ
// ═══════════════════════════════════════════════════════════════

describe('G. RAPID_CAPABLE_S_CONTRACT', () => {
  const contractErrors = (m: ModuleData) => validateModule(m).errors.filter(e => e.code === 'RAPID_CAPABLE_S_CONTRACT')

  test('追加 3 module でも検出 0 件', () => {
    for (const mod of [DERM, CARDIORENAL, COMBINATION]) assert.deepEqual(contractErrors(mod), [], mod.moduleId)
  })

  test('現行 corpus の全 module で検出 0 件（allowlist 追従のみ。global 化していない）', () => {
    for (const m of ALL_MODULES) assert.deepEqual(contractErrors(m), [], m.moduleId)
  })

  test('非 pilot module は引き続き validator 対象外', () => {
    const v1 = ALL_MODULES.find(m => rapidProfileOf(m) === 'v1')!
    const clone = structuredClone(v1)
    const sc = clone.scenarios.find(isScenarioSReplacementCapable)!
    sc.S = '任意の文。'
    assert.equal(contractErrors(clone).length, 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// H. 非 pilot module への非侵襲性
// ═══════════════════════════════════════════════════════════════

describe('H. 非 pilot module の Rapid 出力は v1 realization と一致し続ける', () => {
  test('全 v1 module × capable scenario × 5 relation × 4 outcome の第1文が v1 関数の出力と一致', () => {
    let checked = 0
    for (const mod of ALL_MODULES) {
      if (rapidProfileOf(mod) === 'v2') continue
      const drug = mod.drug?.brandNames?.[0] ?? '薬'
      for (const sc of mod.scenarios.filter(isScenarioSReplacementCapable)) {
        for (const t of V1_RELATIONS) for (const c of CONDITIONS) {
          checked++
          assert.equal(
            firstLine(derive(mod, sc, R(t, c), drug)),
            buildResolvedSFirstSentence(t, c, drug, mod.display?.adjustmentExpression),
            `${mod.moduleId} / ${sc.id} / ${t} / ${c}`,
          )
        }
      }
    }
    assert.ok(checked > 0, '非 pilot module の組合せを1件も検証していない')
  })
})
