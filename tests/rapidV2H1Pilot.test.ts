/**
 * rapidV2H1Pilot.test.ts — Rapid v2（H1 Reference Implementation）契約テスト
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-H1-PILOT-1。
 *
 * 対象は H1点眼（`allergy_h1_antihistamine_eye_drops`）の Reference Implementation
 * （Reference Baseline）。H1 pilot の Human 評価通過後に当時の pilot allowlist へ追加された
 * 内服（`dm_dpp4_oral`）・注射（`dm_insulin_rapid_analog`）の pilot固有契約
 * （route verb 差分・severity gate 等）は `tests/rapidV2MultiModulePilot.test.ts`
 * が別途固定する（本ファイルの H1 契約を弱めない・重複させない）。
 * global promotion（OD-RAPID-GLOBAL-1）後の profile 分布契約は `tests/rapidV2GlobalPromotion.test.ts`
 * が持つ。v1 profile の実例が必要な箇所では一時除外 module を使う。
 * v1（`lib/rapidSentence.ts` / `SRelation` 5値）は本ファイルの対象外であり、
 * v1 の既存契約は `tests/rapidStateUnit1.test.ts` 等が引き続き固定する。
 *
 * production 関数を直接 import する。mirror 実装は作らない（RAPID-V2-20 の踏襲）。
 *
 * 実行:
 *   npx tsx --test tests/rapidV2H1Pilot.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ComposeNode, ModuleData, Scenario, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'
import { deriveRawFields, deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { rebuildNode } from '../lib/primaryNode'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { isSameRapid, nextRapidStateOnScenarioChange, type RapidState, type RapidTransitionV2 } from '../lib/rapidState'
import type { SCondition } from '../lib/rapidSentence'
import { resolveDrugName, resolveSubjectFromResolution } from '../lib/drugSubject'
import { isSubjectUnresolved } from '../lib/brandTags'
import type { BrandResolution } from '../lib/brandResolution'
import {
  rapidProfileOf,
  registerOf,
  verbOf,
  buildV2FirstSentence,
  RAPID_V2_TRANSITIONS,
  RAPID_V2_OUTCOMES,
} from '../lib/rapidV2'

const H1_MODULE_ID = 'allergy_h1_antihistamine_eye_drops'
const H1_ORAL_MODULE_ID = 'allergy_h1_antihistamine_second_gen_oral'
const DRUG = 'アレジオン点眼液'

const H1_MOD = ALL_MODULES.find(m => m.moduleId === H1_MODULE_ID)!
const H1_ORAL_MOD = ALL_MODULES.find(m => m.moduleId === H1_ORAL_MODULE_ID)!

/**
 * Rapid v2 global promotion からの一時除外 module（OD-RAPID-GLOBAL-1。v1 profile）。
 * profile 分布の契約本体（exact set・既定 v2）は `tests/rapidV2GlobalPromotion.test.ts` が持つ。
 * 本ファイルでは H1 契約の中で「v1 profile の module」の実例として使う。
 */
const V1_EXCLUDED_MODULE_ID = 'allergy_chemical_mediator_release_inhibitor_eye_drops'
const V1_EXCLUDED_MOD = ALL_MODULES.find(m => m.moduleId === V1_EXCLUDED_MODULE_ID)!
const V1_EXCLUDED_DRUG = 'ゼペリン点眼液'

const H1_SIDE_EFFECT_SCENARIO_IDS = [
  'se_irritation_none',
  'se_foreign_body_sensation_none',
  'se_pruritus_none',
  'se_eye_redness_none',
  'se_eye_discharge_none',
]

function h1Scenario(id: string): Scenario {
  const sc = H1_MOD.scenarios.find(s => s.id === id)
  assert.ok(sc, `H1点眼に scenario ${id} が見つからない`)
  return sc!
}

const TRANSITIONS: RapidTransitionV2[] = [
  'continued_do', 'new_addition', 'med_changed', 'regimen_reduced', 'dose_increased', 'dose_decreased',
]
const CONDITIONS: SCondition[] = ['stable', 'unchanged', 'improved', 'not_improved']

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
const thirdPanelSrc = readFileSync(new URL('../app/components/ThirdPanel.tsx', import.meta.url), 'utf-8')

// ═══════════════════════════════════════════════════════════════
// 0. Repository fact — H1 の Rapid-capable scenario 一覧を実測する
// ═══════════════════════════════════════════════════════════════

describe('0. H1点眼の Rapid-capable scenario は実測どおり6件である', () => {
  test('副作用なし5 scenario + cp_good の計6件', () => {
    const capable = H1_MOD.scenarios.filter(isScenarioSReplacementCapable).map(s => s.id).sort()
    assert.deepEqual(capable, [...H1_SIDE_EFFECT_SCENARIO_IDS, 'cp_good'].sort())
  })
})

// ═══════════════════════════════════════════════════════════════
// A. v2 sentence table — drug-specific 24 + regimen-level 24 = 48文 exact match
// ═══════════════════════════════════════════════════════════════

describe('A. v2 sentence table（48文 exact string match）', () => {
  const DRUG_EXPECTED: Record<RapidTransitionV2, Record<SCondition, string>> = {
    continued_do: {
      stable:       `${DRUG}を使用して症状は落ち着いている。`,
      unchanged:    `${DRUG}を使用して症状は変わりない。`,
      improved:     `${DRUG}を使用して症状は良くなってきた。`,
      not_improved: `${DRUG}を使用しているが症状の改善は乏しい。`,
    },
    new_addition: {
      stable:       `前回から${DRUG}が追加となり症状は落ち着いている。`,
      unchanged:    `前回から${DRUG}が追加となり症状は変わりない。`,
      improved:     `前回から${DRUG}が追加となり症状は良くなってきた。`,
      not_improved: `前回から${DRUG}が追加となったが症状の改善は乏しい。`,
    },
    med_changed: {
      stable:       `前回から${DRUG}に変更となり症状は落ち着いている。`,
      unchanged:    `前回から${DRUG}に変更となり症状は変わりない。`,
      improved:     `前回から${DRUG}に変更となり症状は良くなってきた。`,
      not_improved: `前回から${DRUG}に変更となったが症状の改善は乏しい。`,
    },
    // 限定 multi-module pilotで、drug-specific realization でも薬剤名を入れない
    // よう確定（§6）。regimen register と文面が一致する（DRUG を含まない）。
    regimen_reduced: {
      stable:       `前回の処方整理後も症状は落ち着いている。`,
      unchanged:    `前回の処方整理後も症状は変わりない。`,
      improved:     `前回の処方整理後、症状は良くなってきた。`,
      not_improved: `前回の処方整理後も症状の改善は乏しい。`,
    },
    dose_increased: {
      stable:       `前回から${DRUG}が増量となり症状は落ち着いている。`,
      unchanged:    `前回から${DRUG}が増量となり症状は変わりない。`,
      improved:     `前回から${DRUG}が増量となり症状は良くなってきた。`,
      not_improved: `前回から${DRUG}が増量となったが症状の改善は乏しい。`,
    },
    dose_decreased: {
      stable:       `前回から${DRUG}が減量となり症状は落ち着いている。`,
      unchanged:    `前回から${DRUG}が減量となり症状は変わりない。`,
      improved:     `前回から${DRUG}が減量となり症状は良くなってきた。`,
      not_improved: `前回から${DRUG}が減量となったが症状の改善は乏しい。`,
    },
  }

  const REGIMEN_EXPECTED: Record<RapidTransitionV2, Record<SCondition, string>> = {
    continued_do: {
      stable:       '薬を使用して症状は落ち着いている。',
      unchanged:    '薬を使用して症状は変わりない。',
      improved:     '薬を使用して症状は良くなってきた。',
      not_improved: '薬を使用しているが症状の改善は乏しい。',
    },
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

  test('drug-specific 6×4 = 24文が exact に一致する', () => {
    let checked = 0
    for (const t of TRANSITIONS) for (const c of CONDITIONS) {
      assert.equal(buildV2FirstSentence(t, c, 'drug', DRUG, verbOf(H1_MOD)), DRUG_EXPECTED[t][c], `${t}/${c}`)
      checked++
    }
    assert.equal(checked, 24)
  })

  test('regimen-level 6×4 = 24文が exact に一致する（薬剤名を含まない）', () => {
    let checked = 0
    for (const t of TRANSITIONS) for (const c of CONDITIONS) {
      const actual = buildV2FirstSentence(t, c, 'regimen', DRUG, verbOf(H1_MOD))
      assert.equal(actual, REGIMEN_EXPECTED[t][c], `${t}/${c}`)
      assert.ok(!actual.includes(DRUG), `regimen realization に薬剤名が混入している: ${t}/${c}`)
      checked++
    }
    assert.equal(checked, 24)
  })

  test('全48文がちょうど1個の「。」で終わる（one-sentence invariant）', () => {
    for (const t of TRANSITIONS) for (const c of CONDITIONS) {
      for (const register of ['drug', 'regimen'] as const) {
        const s = buildV2FirstSentence(t, c, register, DRUG, verbOf(H1_MOD))
        assert.equal((s.match(/。/g) ?? []).length, 1, `${register}/${t}/${c}: 「。」が1個ではない: ${s}`)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// B. H1 Rapid-capable 6 scenario — 第1文のみ変更・残余保持・O/A/P/closing不変
// ═══════════════════════════════════════════════════════════════

describe('B. H1 の6 scenario で第1文のみ変更・残余は byte 保持される', () => {
  test('side_effect 5 scenario: 第2文以降が byte-identical で保持される', () => {
    for (const id of H1_SIDE_EFFECT_SCENARIO_IDS) {
      const sc = h1Scenario(id)
      const pristine = buildNodeFields(sc, H1_MOD, [], DRUG).fields
      const secondLine = pristine.S.split('\n').slice(1).join('\n')
      for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        const derived = deriveRawFields(sc, H1_MOD, [], { previousEvent: t, currentOutcome: c }, DRUG)
        const derivedSecondLine = derived.S.split('\n').slice(1).join('\n')
        assert.equal(derivedSecondLine, secondLine, `${id} ${t}/${c}: 第2文以降が変化した`)
        assert.equal(derived.S.split('\n')[0], buildV2FirstSentence(t, c, 'drug', DRUG, verbOf(H1_MOD)), `${id} ${t}/${c}: 第1文不一致`)
      }
    }
  })

  test('cp_good: 第2文（使用忘れなく継続できている）が byte 保持される', () => {
    const sc = h1Scenario('cp_good')
    const pristine = buildNodeFields(sc, H1_MOD, [], DRUG).fields
    const secondLine = pristine.S.split('\n').slice(1).join('\n')
    for (const t of TRANSITIONS) for (const c of CONDITIONS) {
      const derived = deriveRawFields(sc, H1_MOD, [], { previousEvent: t, currentOutcome: c }, DRUG)
      assert.equal(derived.S.split('\n').slice(1).join('\n'), secondLine, `cp_good ${t}/${c}`)
      assert.equal(derived.S.split('\n')[0], buildV2FirstSentence(t, c, 'regimen', DRUG, verbOf(H1_MOD)), `cp_good ${t}/${c}: 第1文不一致`)
    }
  })

  test('O/A/P/closingText/closingBehavior が全6 scenario × 24組合せで不変', () => {
    let checked = 0
    for (const id of [...H1_SIDE_EFFECT_SCENARIO_IDS, 'cp_good']) {
      const sc = h1Scenario(id)
      const base = deriveNodeBlockCore(sc, H1_MOD, [], null, DRUG)
      for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        const core = deriveNodeBlockCore(sc, H1_MOD, [], { previousEvent: t, currentOutcome: c }, DRUG)
        assert.equal(core.rawFields.O, base.rawFields.O, `${id} ${t}/${c}: O`)
        assert.equal(core.rawFields.A, base.rawFields.A, `${id} ${t}/${c}: A`)
        assert.equal(core.rawFields.P, base.rawFields.P, `${id} ${t}/${c}: P`)
        assert.equal(core.closingText, base.closingText, `${id} ${t}/${c}: closingText`)
        assert.equal(core.closingBehavior, base.closingBehavior, `${id} ${t}/${c}: closingBehavior`)
        checked++
      }
    }
    assert.equal(checked, 6 * 24)
  })

  test('同一 state を再選択すると isSameRapid が toggle-off（null）を判定し、Default へ byte 単位で戻る（全6 scenario × 24組合せ）', () => {
    // production の toggle-off 判定（isSameRapid。handleSToggle が使う関数そのもの）を
    // 経由して次の state を決め、その state で再 derive する。「ON の結果を捨てて
    // 独立に OFF を derive する」だけの検証（deriveRawFields(rapid=null) の
    // 呼び出し毎の純粋性を示すのみで ON との関係を検証しない）にならないよう、
    // ON の結果を明示的に使ってから同一クリックで OFF へ遷移させる。
    for (const id of [...H1_SIDE_EFFECT_SCENARIO_IDS, 'cp_good']) {
      const sc = h1Scenario(id)
      const pristine = deriveRawFields(sc, H1_MOD, [], null, DRUG)
      for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        let rapid: RapidState = { previousEvent: t, currentOutcome: c }
        const on = deriveRawFields(sc, H1_MOD, [], rapid, DRUG)
        const isDoStableCollision = t === 'continued_do' && c === 'stable'
        if (!isDoStableCollision) {
          assert.notEqual(on.S, pristine.S, `${id} ${t}/${c}: ON で S が変化していない`)
        }
        // 同一ボタンの再クリック（isSameRapid が true）→ production は null にする
        rapid = isSameRapid(rapid, t, c) ? null : rapid
        assert.equal(rapid, null, `${id} ${t}/${c}: isSameRapid が再クリックを検出できていない`)
        const off = deriveRawFields(sc, H1_MOD, [], rapid, DRUG)
        assert.deepEqual(off, pristine, `${id} ${t}/${c}: OFF が Default と一致しない`)
      }
    }
  })

  test('A → B → OFF で残骸が残らない（state を明示的に遷移させ、各段階の値を検証する）', () => {
    const sc = h1Scenario('se_irritation_none')
    const pristine = deriveRawFields(sc, H1_MOD, [], null, DRUG)

    let rapid: RapidState = { previousEvent: 'new_addition', currentOutcome: 'stable' }       // A
    const a = deriveRawFields(sc, H1_MOD, [], rapid, DRUG)
    assert.notEqual(a.S, pristine.S, 'A で S が変化していない')

    rapid = { previousEvent: 'regimen_reduced', currentOutcome: 'not_improved' }              // A → B（置換）
    const b = deriveRawFields(sc, H1_MOD, [], rapid, DRUG)
    assert.notEqual(b.S, a.S, 'B で S が A から変化していない（A の残骸が残っている）')

    // B の再クリック（isSameRapid）→ production は null にする
    rapid = isSameRapid(rapid, 'regimen_reduced', 'not_improved') ? null : rapid
    assert.equal(rapid, null, 'isSameRapid が B の再クリックを検出できていない')
    const off = deriveRawFields(sc, H1_MOD, [], rapid, DRUG)
    assert.deepEqual(off, pristine, 'OFF が Default と一致しない（A または B の残骸が残っている）')
  })

  test('ADDON との共存（実測事実）: H1 の addon はすべて P 欄向けであり、S 欄向け addon は存在しない', () => {
    // 2026-09 実測: H1 の 23 addon はすべて targetSection === 'P'（sectionTexts.S を
    // 持つものも 0 件）。したがって「Rapid（S 先頭文）と ADDON（S 欄）の共存」を
    // 直接検証できる組合せは H1 に現在存在しない。将来 H1 に S 欄向け addon が
    // 追加された場合、この assertion が変化を検出し、S-ADDON 共存 test の追加を促す。
    const items = H1_MOD.addons?.items ?? {}
    const addonKeys = Object.keys(items)
    assert.ok(addonKeys.length > 0, 'H1 に addon が1件も無い（前提が崩れている）')
    const sTargeting = addonKeys.filter(k => items[k].targetSection === 'S' || items[k].sectionTexts?.S)
    assert.deepEqual(sTargeting, [], 'H1 に S 欄向け addon が追加された。ADDON 共存 test の対象範囲を見直すこと')
  })

  test('ADDON との共存: Rapid 適用（S 欄）後も P 欄の ADDON 本文が production derive 経路で保持される', () => {
    const sc = h1Scenario('se_irritation_none')
    const addonKeys = Object.keys(H1_MOD.addons?.items ?? {})
    const pWithAddon = deriveRawFields(sc, H1_MOD, [addonKeys[0]], null, DRUG).P
    assert.notEqual(pWithAddon, '', '前提: addonKeys[0] が P 欄へ書き込んでいない')
    for (const t of TRANSITIONS) for (const c of CONDITIONS) {
      const derived = deriveRawFields(sc, H1_MOD, [addonKeys[0]], { previousEvent: t, currentOutcome: c }, DRUG)
      assert.equal(derived.P, pWithAddon, `${t}/${c}: Rapid 適用（S 欄）で P 欄の ADDON 本文が変化した`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// C. scenario switch — state 保持 + drug/regimen realization 切替
// ═══════════════════════════════════════════════════════════════

describe('C. scenario 切替時の Rapid state 保持と realization 切替', () => {
  test('side_effect → side_effect: capable→capable で state 保持・register は drug のまま', () => {
    const from = h1Scenario('se_irritation_none')
    const to = h1Scenario('se_pruritus_none')
    const rapid: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'unchanged' }
    const next = nextRapidStateOnScenarioChange(
      rapid, isScenarioSReplacementCapable(from), isScenarioSReplacementCapable(to),
    )
    assert.deepEqual(next, rapid)
    assert.equal(registerOf(to), 'drug')
    const reapplied = deriveRawFields(to, H1_MOD, [], next, DRUG)
    assert.equal(reapplied.S.split('\n')[0], buildV2FirstSentence('dose_increased', 'unchanged', 'drug', DRUG, verbOf(H1_MOD)))
  })

  test('side_effect → cp_good: state 保持・register が drug から regimen へ切り替わる', () => {
    const from = h1Scenario('se_irritation_none')
    const to = h1Scenario('cp_good')
    const rapid: RapidState = { previousEvent: 'regimen_reduced', currentOutcome: 'improved' }
    const next = nextRapidStateOnScenarioChange(
      rapid, isScenarioSReplacementCapable(from), isScenarioSReplacementCapable(to),
    )
    assert.deepEqual(next, rapid)
    assert.equal(registerOf(to), 'regimen')
    const reapplied = deriveRawFields(to, H1_MOD, [], next, DRUG)
    const expected = buildV2FirstSentence('regimen_reduced', 'improved', 'regimen', DRUG, verbOf(H1_MOD))
    assert.equal(reapplied.S.split('\n')[0], expected)
    assert.ok(!expected.includes(DRUG))
  })

  test('cp_good → side_effect: state 保持・register が regimen から drug へ切り替わる', () => {
    const from = h1Scenario('cp_good')
    const to = h1Scenario('se_eye_redness_none')
    const rapid: RapidState = { previousEvent: 'med_changed', currentOutcome: 'stable' }
    const next = nextRapidStateOnScenarioChange(
      rapid, isScenarioSReplacementCapable(from), isScenarioSReplacementCapable(to),
    )
    assert.deepEqual(next, rapid)
    const reapplied = deriveRawFields(to, H1_MOD, [], next, DRUG)
    assert.equal(reapplied.S.split('\n')[0], buildV2FirstSentence('med_changed', 'stable', 'drug', DRUG, verbOf(H1_MOD)))
  })

  test('capable → non-capable: state は null になる', () => {
    const from = h1Scenario('se_irritation_none')
    const to = H1_MOD.scenarios.find(s => s.id === 'initial')!
    const rapid: RapidState = { previousEvent: 'continued_do', currentOutcome: 'stable' }
    const next = nextRapidStateOnScenarioChange(
      rapid, isScenarioSReplacementCapable(from), isScenarioSReplacementCapable(to),
    )
    assert.equal(next, null)
  })
})

// ═══════════════════════════════════════════════════════════════
// D. profile 判定 — 既定 v2・一時除外のみ v1。散在 if の不在。
// ═══════════════════════════════════════════════════════════════

describe('D. profile 判定は中央判定点に閉じ込められている（既定 v2 + 一時除外。OD-RAPID-GLOBAL-1）', () => {
  // H1 Reference Implementation → 3 / 6 module pilot を経て global promotion された。
  // profile 分布（一時除外の exact set・その他全 module が v2）の契約本体は
  // tests/rapidV2GlobalPromotion.test.ts が持つ。ここでは H1 Reference Model が
  // global promotion 後も v2 であり、同一成分系の別 module も既定 v2 になることを確認する。
  test('H1点眼（点眼）は v2、H1内服（oral）も既定で v2、一時除外 module は v1', () => {
    assert.equal(rapidProfileOf(H1_MOD), 'v2')
    assert.equal(rapidProfileOf(H1_ORAL_MOD), 'v2')
    assert.equal(rapidProfileOf(V1_EXCLUDED_MOD), 'v1')
  })

  test('DashboardClient.tsx / ThirdPanel.tsx に H1 moduleId の直書きが無い（profile 判定は lib/rapidV2.ts の rapidProfileOf に閉じている）', () => {
    assert.equal(src.includes(H1_MODULE_ID), false, 'DashboardClient.tsx に H1 moduleId が直書きされている')
    assert.equal(thirdPanelSrc.includes(H1_MODULE_ID), false, 'ThirdPanel.tsx に H1 moduleId が直書きされている')
  })

  test('rapidProfileOf は module.moduleId の完全一致で判定する（prefix一致ではない）', () => {
    // 一時除外 moduleId で始まる架空 moduleId は除外されず既定 v2 になること
    const decoy: ModuleData = { ...V1_EXCLUDED_MOD, moduleId: `${V1_EXCLUDED_MODULE_ID}_decoy` }
    assert.equal(rapidProfileOf(decoy), 'v2')
    // H1 の中身を持っていても moduleId が一時除外と完全一致すれば v1 になること（判定は moduleId のみ）
    const excludedId: ModuleData = { ...H1_MOD, moduleId: V1_EXCLUDED_MODULE_ID }
    assert.equal(rapidProfileOf(excludedId), 'v1')
  })
})

// ═══════════════════════════════════════════════════════════════
// D2. v2 UI 表示順の exact 固定（§13）
// ═══════════════════════════════════════════════════════════════

describe('D2. RAPID_V2_TRANSITIONS / RAPID_V2_OUTCOMES の表示順・ラベルが exact に固定される', () => {
  test('transition 順: Do → 追加 → 変更 → 処方整理 → 増量 → 減量', () => {
    assert.deepEqual(
      RAPID_V2_TRANSITIONS.map(t => t.value),
      ['continued_do', 'new_addition', 'med_changed', 'regimen_reduced', 'dose_increased', 'dose_decreased'],
    )
    assert.deepEqual(
      RAPID_V2_TRANSITIONS.map(t => t.label),
      ['前回、Do', '前回、追加', '前回、変更', '前回、処方整理', '前回、増量', '前回、減量'],
    )
  })

  test('outcome 順（1行目: 現状維持系 / 2行目: 変化の方向を示す系）: 落ち着いている → 変わりない → 良くなってきた → 改善乏しい', () => {
    assert.deepEqual(
      RAPID_V2_OUTCOMES.map(o => o.value),
      ['stable', 'unchanged', 'improved', 'not_improved'],
    )
    assert.deepEqual(
      RAPID_V2_OUTCOMES.map(o => o.label),
      ['落ち着いている', '変わりない', '良くなってきた', '改善乏しい'],
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// E. Remove（regimen_reduced）— v2 限定・削除薬名を要求/推測しない
// ═══════════════════════════════════════════════════════════════

describe('E. Remove（前回、処方整理 / regimen_reduced）', () => {
  test('H1 v2 では選択可能（deriveRawFields が正しく反映する）', () => {
    const sc = h1Scenario('se_irritation_none')
    const derived = deriveRawFields(sc, H1_MOD, [], { previousEvent: 'regimen_reduced', currentOutcome: 'stable' }, DRUG)
    assert.equal(derived.S.split('\n')[0], `前回の処方整理後も症状は落ち着いている。`)
  })

  // 「v1 module では regimen_reduced が選択不能」という契約は、本ファイル内の他2箇所が
  // 分担して固定している（ここで同じ条件式を test 側にも再記述すると、production の
  // 条件式が変わった場合に test 側だけ古いまま両方 green になり得る重複を生む）。
  //   - Group D「H1点眼（点眼）は v2、…一時除外 module は v1」: rapidProfileOf の module 判定そのもの
  //   - Group I「handleSToggle 冒頭に regimen_reduced × rapidProfileOf(targetModule)!=='v2' の
  //     early return が存在する」: production の write guard 式自体の source contract
  // 両者を組み合わせれば「v1 profile の module（一時除外）で regimen_reduced が拒否される」ことが導かれる。

  test('regimen_reduced の realization は削除薬名も現在薬の薬剤名も一切参照しない（drugName / register いずれの引数にも薬剤名情報を持たない）', () => {
    // buildV2FirstSentence のシグネチャ自体が「削除された薬剤」を表す引数を持たない
    // ことを型レベルで保証している。限定 multi-module pilotで、drug register でも
    // 薬剤名を入れないことを確定した（§6）ため、drug/regimen いずれの結果にも
    // DRUG が含まれないことを確認する。
    const drug = buildV2FirstSentence('regimen_reduced', 'stable', 'drug', DRUG, verbOf(H1_MOD))
    const regimen = buildV2FirstSentence('regimen_reduced', 'stable', 'regimen', DRUG, verbOf(H1_MOD))
    assert.equal(drug, '前回の処方整理後も症状は落ち着いている。')
    assert.equal(regimen, '前回の処方整理後も症状は落ち着いている。')
    assert.ok(!drug.includes(DRUG), 'drug register の処方整理に薬剤名が混入している')
  })

  test('UI ラベルは「処方整理」であり「削除」「中止」を含まない（現在薬の中止と誤認させない）', () => {
    const label = RAPID_V2_TRANSITIONS.find(t => t.value === 'regimen_reduced')!.label
    assert.equal(label, '前回、処方整理')
    assert.ok(!label.includes('削除'))
    assert.ok(!label.includes('中止'))
  })
})

// ═══════════════════════════════════════════════════════════════
// F. adjustmentExpression — v2 は使用しない・v1 は既存挙動維持
// ═══════════════════════════════════════════════════════════════

describe('F. adjustmentExpression は v2 で参照されない', () => {
  test('H1 の adjustmentExpression（点眼回数増/減）が v2 の増量/減量文へ出現しない', () => {
    const ae = H1_MOD.display?.adjustmentExpression
    assert.ok(ae, 'H1 に adjustmentExpression が存在する前提が崩れている')
    const sc = h1Scenario('se_irritation_none')
    const increased = deriveRawFields(sc, H1_MOD, [], { previousEvent: 'dose_increased', currentOutcome: 'stable' }, DRUG)
    const decreased = deriveRawFields(sc, H1_MOD, [], { previousEvent: 'dose_decreased', currentOutcome: 'stable' }, DRUG)
    assert.ok(!increased.S.includes(ae!.increasePast), 'v2 の増量文に AE（点眼回数が増えた）が混入している')
    assert.ok(!decreased.S.includes(ae!.decreasePast), 'v2 の減量文に AE（点眼回数が減った）が混入している')
    assert.equal(increased.S.split('\n')[0], `前回から${DRUG}が増量となり症状は落ち着いている。`)
  })

  test('canonical JSON の adjustmentExpression 自体は変更されていない（bridge/audit の対象外であることの確認）', () => {
    assert.deepEqual(H1_MOD.display?.adjustmentExpression, {
      increasePast: '点眼回数が増えた',
      decreasePast: '点眼回数が減った',
    })
  })

  test('v1 profile の module（一時除外）は既存どおり adjustmentExpression を使用する（回帰確認）', () => {
    const mod = V1_EXCLUDED_MOD
    const sc = mod.scenarios.find(isScenarioSReplacementCapable)!
    const ae = mod.display?.adjustmentExpression
    assert.ok(ae, `${V1_EXCLUDED_MODULE_ID} に adjustmentExpression が存在する前提が崩れている`)
    const derived = deriveRawFields(sc, mod, [], { previousEvent: 'dose_increased', currentOutcome: 'stable' }, V1_EXCLUDED_DRUG)
    assert.ok(derived.S.includes(ae!.increasePast), 'v1 module で AE が使われなくなっている（回帰）')
  })
})

// ═══════════════════════════════════════════════════════════════
// G. Do × stable = Default（Owner Decision OD-RAPID-H1-PILOT-1 #3）
// ═══════════════════════════════════════════════════════════════

describe('G. Do×stable が Default と同一文でも正常（semantic state は non-null のまま）', () => {
  test('H1 side_effect: Do×stable の文は Default と byte 一致する', () => {
    const sc = h1Scenario('se_irritation_none')
    const pristine = deriveRawFields(sc, H1_MOD, [], null, DRUG)
    const doStable = deriveRawFields(sc, H1_MOD, [], { previousEvent: 'continued_do', currentOutcome: 'stable' }, DRUG)
    assert.equal(doStable.S, pristine.S)
  })

  test('H1 cp_good: Do×stable の文は Default と byte 一致する（薬剤名なし）', () => {
    const sc = h1Scenario('cp_good')
    const pristine = deriveRawFields(sc, H1_MOD, [], null, DRUG)
    const doStable = deriveRawFields(sc, H1_MOD, [], { previousEvent: 'continued_do', currentOutcome: 'stable' }, DRUG)
    assert.equal(doStable.S, pristine.S)
    assert.equal(pristine.S.split('\n')[0], '薬を使用して症状は落ち着いている。')
  })

  test('isSameRapid は null と Do×stable を区別する（生成文が Default と同一でも state 判定は文字列に依存しない）', () => {
    const doStable: RapidState = { previousEvent: 'continued_do', currentOutcome: 'stable' }
    assert.equal(isSameRapid(null, 'continued_do', 'stable'), false)
    assert.equal(isSameRapid(doStable, 'continued_do', 'stable'), true)
  })

  test('ThirdPanel v2 のボタン点灯判定は本文比較ではなく state 比較で行われる（source contract）', () => {
    // v1 と同じ判定式（rapidState.previousEvent === sec.value && rapidState.currentOutcome === st.value）
    // を v2 セクションでも使っていることをソースで確認する。文字列比較（S の内容）を
    // isActive 判定に使っていないことが重要（Do×stable でも正しく点灯するため）。
    assert.ok(
      thirdPanelSrc.includes("rapidState.previousEvent === sec.value &&") &&
      thirdPanelSrc.includes('rapidState.currentOutcome === st.value'),
      'v2 セクションの isActive 判定が見つからない',
    )
  })

  test('Do×stable の再クリック（isSameRapid）で state が null になり、文は Default のまま', () => {
    const sc = h1Scenario('se_irritation_none')
    const pristine = deriveRawFields(sc, H1_MOD, [], null, DRUG)
    let rapid: RapidState = { previousEvent: 'continued_do', currentOutcome: 'stable' }
    const on = deriveRawFields(sc, H1_MOD, [], rapid, DRUG)
    assert.equal(on.S, pristine.S, '前提: Do×stable の文は Default と一致する（OD-RAPID-H1-PILOT-1）')
    rapid = isSameRapid(rapid, 'continued_do', 'stable') ? null : rapid
    assert.equal(rapid, null, 'isSameRapid が Do×stable の再クリックを検出できていない')
    const off = deriveRawFields(sc, H1_MOD, [], rapid, DRUG)
    assert.equal(off.S, pristine.S)
  })
})

// ═══════════════════════════════════════════════════════════════
// H. multi-node — 独立性・波及なし・決定論・句読点破綻なし
// ═══════════════════════════════════════════════════════════════

function makeNode(id: string, mod: ModuleData, sc: Scenario, rapid: RapidState, drugName: string): ComposeNode {
  const base: ComposeNode = {
    id, moduleId: mod.moduleId, scenarioId: '', block: { id: `${id}-block`, templateLabel: '', fields: EMPTY_FIELDS },
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

describe('H. multi-node（H1 v2 と v1 の混在を含む）', () => {
  const V1_SC = V1_EXCLUDED_MOD.scenarios.find(isScenarioSReplacementCapable)!

  test('H1 v2 + H1 v2: state が独立している', () => {
    const a = makeNode('a', H1_MOD, h1Scenario('se_irritation_none'), { previousEvent: 'new_addition', currentOutcome: 'stable' }, 'パタノール点眼液')
    const b = makeNode('b', H1_MOD, h1Scenario('se_pruritus_none'), { previousEvent: 'regimen_reduced', currentOutcome: 'not_improved' }, DRUG)
    assert.notDeepEqual(a.rapid, b.rapid)
    assert.deepEqual(a.rapid, { previousEvent: 'new_addition', currentOutcome: 'stable' })
    assert.deepEqual(b.rapid, { previousEvent: 'regimen_reduced', currentOutcome: 'not_improved' })
  })

  test('H1 v2 + v1 module（一時除外）: state が独立している', () => {
    const a = makeNode('a', H1_MOD, h1Scenario('cp_good'), { previousEvent: 'regimen_reduced', currentOutcome: 'stable' }, DRUG)
    const b = makeNode('b', V1_EXCLUDED_MOD, V1_SC, { previousEvent: 'dose_increased', currentOutcome: 'stable' }, V1_EXCLUDED_DRUG)
    assert.deepEqual(a.rapid, { previousEvent: 'regimen_reduced', currentOutcome: 'stable' })
    assert.deepEqual(b.rapid, { previousEvent: 'dose_increased', currentOutcome: 'stable' })
    assert.ok(b.block.fields.S.includes(V1_EXCLUDED_DRUG), 'v1 module の realization が v2 化していない（回帰）')
    assert.ok(!b.block.fields.S.includes(`前回から${V1_EXCLUDED_DRUG}が増量となり症状は`), 'v1 module に v2 の文言が混入している')
  })

  test('scenario 変更が他 node へ波及しない', () => {
    const a0 = makeNode('a', H1_MOD, h1Scenario('se_irritation_none'), { previousEvent: 'dose_increased', currentOutcome: 'stable' }, DRUG)
    const bBefore = makeNode('b', H1_MOD, h1Scenario('cp_good'), { previousEvent: 'med_changed', currentOutcome: 'improved' }, DRUG)
    // a のみ scenario を切り替える（b には一切触れない）
    const newSc = h1Scenario('se_pruritus_none')
    const nextRapid = nextRapidStateOnScenarioChange(
      a0.rapid, isScenarioSReplacementCapable(h1Scenario('se_irritation_none')), isScenarioSReplacementCapable(newSc),
    )
    const aAfter = rebuildNode({
      node: a0, mod: H1_MOD, scenario: newSc, addonIds: [], rapid: nextRapid, drugName: DRUG,
      drugLabel: a0.drugLabel, baseDomain: a0.baseDomain, personaEnabled: false, persona: 'plain',
    })
    assert.deepEqual(aAfter.rapid, { previousEvent: 'dose_increased', currentOutcome: 'stable' })
    assert.deepEqual(bBefore.rapid, { previousEvent: 'med_changed', currentOutcome: 'improved' }, 'b の state が波及で変化した')
  })

  test('OFF が他 node へ波及しない', () => {
    const a0 = makeNode('a', H1_MOD, h1Scenario('se_irritation_none'), { previousEvent: 'new_addition', currentOutcome: 'stable' }, DRUG)
    const b = makeNode('b', H1_MOD, h1Scenario('cp_good'), { previousEvent: 'regimen_reduced', currentOutcome: 'unchanged' }, DRUG)
    const aOff = rebuildNode({
      node: a0, mod: H1_MOD, scenario: h1Scenario('se_irritation_none'), addonIds: [], rapid: null, drugName: DRUG,
      drugLabel: a0.drugLabel, baseDomain: a0.baseDomain, personaEnabled: false, persona: 'plain',
    })
    assert.equal(aOff.rapid, null)
    assert.deepEqual(b.rapid, { previousEvent: 'regimen_reduced', currentOutcome: 'unchanged' }, 'b の state が a の OFF で変化した')
  })

  test('合成方向（どちらを primary として渡すか）によらず、同じ行集合が保存される（内容欠落・重複なし。行の並び順自体の非依存は主張しない）', () => {
    // production の mergeBlocks は意図的に非対称である（primary/secondary で
    // 主語の付き方・並び順が変わり得る。DP-05 等）。ここで固定するのは
    // 「どちらを primary にしても、両ノードの内容が一方向にだけ欠落・重複しない」
    // という弱い契約であり、文字列や行順そのものの順序非依存を新たに主張しない。
    const a = makeNode('a', H1_MOD, h1Scenario('se_irritation_none'), { previousEvent: 'dose_increased', currentOutcome: 'stable' }, 'パタノール点眼液')
    const b = makeNode('b', H1_MOD, h1Scenario('cp_good'), { previousEvent: 'regimen_reduced', currentOutcome: 'stable' }, DRUG)
    const ab = mergeTwoNodes(a, b)
    const ba = mergeTwoNodes(b, a)
    assert.deepEqual(ab.S.split('\n').sort(), ba.S.split('\n').sort())
  })

  test('「。・」等の不自然な句読点の結合を生まない（same-domain 2-node）', () => {
    const cases: Array<[RapidTransitionV2, SCondition]> = [
      ['new_addition', 'stable'], ['med_changed', 'not_improved'],
      ['regimen_reduced', 'improved'], ['dose_increased', 'unchanged'], ['dose_decreased', 'not_improved'],
    ]
    for (const [t1, c1] of cases) for (const [t2, c2] of cases) {
      const a = makeNode('a', H1_MOD, h1Scenario('se_irritation_none'), { previousEvent: t1, currentOutcome: c1 }, 'パタノール点眼液')
      const b = makeNode('b', H1_MOD, h1Scenario('se_pruritus_none'), { previousEvent: t2, currentOutcome: c2 }, DRUG)
      const merged = mergeTwoNodes(a, b)
      assert.equal(/。・/.test(merged.S), false, `splice: ${t1}/${c1} + ${t2}/${c2}\nS=${merged.S}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// I. write guard — production source contract
// ═══════════════════════════════════════════════════════════════

describe('I. handleSToggle の Rapid v2 write guard（production source contract）', () => {
  test('handleSToggle 冒頭に regimen_reduced × rapidProfileOf(targetModule)!==\'v2\' の early return が存在する', () => {
    const body = src.slice(src.indexOf('const handleSToggle = useCallback'), src.indexOf('const handleSubcategorySelect = useCallback'))
    assert.ok(body.includes("if (relation === 'regimen_reduced' && rapidProfileOf(targetModule) !== 'v2') return"))
  })

  test('ThirdPanel には rapidProfile prop が渡され、DashboardClient は rapidProfileOf(targetModule) から計算する', () => {
    assert.ok(src.includes('rapidProfile={rapidProfileOf(targetModule)}'))
  })
})

// ═══════════════════════════════════════════════════════════════
// P-1. drugName は H1 v2 の drug-specific scenario 確定時に空にならない
//      （production gate の実測固定。2026-09 調査で「到達不能」と判定）
// ═══════════════════════════════════════════════════════════════
//
// 経路別の結論:
//
// 1. primary 分岐（handleSToggle）:
//    drugName = primaryNode.resolvedDrugName ?? resolveDrugName(activeModuleData.drug, matchedBrandName)
//    resolveDrugName は matchedBrandName → drug.brandNames[0] →
//    brandCatalog[...].displayGenericName の順で解決し、いずれも無ければ '' を返す。
//    H1 は 8 brand すべてに displayGenericName が設定されているため
//    resolveDrugName(H1.drug, 何を渡しても) は '' を返さない（下記 test で固定）。
//    → primary は resolution の状態に関わらず安全。
//
// 2. secondary/compose node 分岐（handleSToggle node branch）:
//    drugName = node.resolvedDrugName ?? ''（resolveDrugName への fallback が無い）。
//    node.resolvedDrugName は node 生成時（handleComposeDrugSelect）に
//    `resolveSubjectFromResolution(item.resolution) ?? ''` で決まり、
//    resolution.denotation === 'module'（brand も一般名も未確定）のときのみ '' になる。
//    H1 は 8 brand・4 一般名グループを持つため、検索の lowConfidence 経路
//    （deriveUnresolvedResolution）で理論上 'module' denotation が返り得る。
//    しかし U-5 安全 gate（isSubjectUnresolved → groupScenarios が [] になる）が、
//    resolution が未確定な間はそのノードに scenario を一切提示しない
//    （TemplateListPanel に候補が出ない）。scenario 確定の唯一の経路は
//    この gate 済みリストからの選択であるため、node.resolvedDrugName === '' の
//    まま drug-specific scenario が確定することはない。
//
// 3. Express（BrandResolution / U-5 gate を経由しない別経路）:
//    H1 の expressModes は 8 件すべて enabled: false（canonical JSON 実測）。
//    → H1 では Express 自体が到達不能であり、この bypass も関係しない。
//
// 4. NLP: showNlpButton=false で UI 未接続（Repository 既存事実。本調査対象外）。
//
// 5. resolution / resolvedDrugName は node 生成時に同一 object で atomically に
//    設定され、生成後に resolution だけを独立して書き換える production コードは
//    存在しない（grep 実測）。したがって「scenario 確定後に resolution だけが
//    unresolved に戻る」という desync も起こらない。
//
// 結論: 到達不能。fallback 文言（drugName || '薬'）は変更しない。

describe('P-1. drugName が H1 v2 の drug-specific scenario で空にならないことの production gate 実測固定', () => {
  test('resolveDrugName(H1.drug, 何を渡しても) は空文字を返さない（H1 の全8 brand が displayGenericName を持つ）', () => {
    // primary 分岐の安全性の根拠。H1 の brandCatalog が今後変更され、
    // displayGenericName を欠く brand が生まれた場合にこの test が検出する。
    assert.equal(resolveDrugName(H1_MOD.drug, undefined) === '', false, 'brandNames[0] fallback が空文字になっている')
    for (const b of H1_MOD.drug?.brandNames ?? []) {
      assert.notEqual(resolveDrugName(H1_MOD.drug, b), '', `matchedBrandName=${b} で resolveDrugName が空文字を返した`)
    }
  })

  test('resolution.denotation === "module"（brand/一般名とも未確定）のときのみ、secondary node の resolvedDrugName が空になり得る', () => {
    const moduleResolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    const brandResolution: BrandResolution = { denotation: 'brand', brandKey: 'アレジオン点眼液', subject: 'アレジオン点眼液' }
    const genericResolution: BrandResolution = {
      denotation: 'generic', genericKey: 'エピナスチン点眼液', brandKeys: ['アレジオン点眼液', 'エピナスチン点眼液'], subject: 'エピナスチン点眼液',
    }
    assert.equal(resolveSubjectFromResolution(moduleResolution) ?? '', '')
    assert.notEqual(resolveSubjectFromResolution(brandResolution) ?? '', '')
    assert.notEqual(resolveSubjectFromResolution(genericResolution) ?? '', '')
  })

  test('U-5 安全 gate（isSubjectUnresolved）は denotation==="module" のときのみ true を返す（scenario 提示をブロックする条件と一致）', () => {
    const moduleResolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    const brandResolution: BrandResolution = { denotation: 'brand', brandKey: 'アレジオン点眼液', subject: 'アレジオン点眼液' }
    assert.equal(isSubjectUnresolved(moduleResolution), true)
    assert.equal(isSubjectUnresolved(brandResolution), false)
    assert.equal(isSubjectUnresolved(undefined), false, 'undefined（Express・初期ロード）は gate されない')
  })

  test('H1 の expressModes は8件すべて enabled: false であり、Express（U-5 gate を経由しない別経路）は到達不能', () => {
    const modes = (H1_MOD as unknown as { expressModes?: Array<{ enabled: boolean }> }).expressModes ?? []
    assert.ok(modes.length > 0, '前提: H1 に expressModes が定義されている')
    assert.ok(modes.every(m => m.enabled === false), 'H1 に enabled な expressMode が追加された。P-1 の Express 経路判定を再調査すること')
  })

  test('DashboardClient.tsx で node.resolution を生成後に独立して書き換える箇所が無い（resolvedDrugName との desync が起きない）', () => {
    // resolution: の代入箇所はコードとして4件のみである:
    //   1. makeInitialPrimaryNode（初期 pending 状態）      → resolution: undefined
    //   2. handleSelectDrugSuggestion（primary 検索選択）   → resolution: item.resolution
    //   3. handleComposeDrugSelect（secondary 検索選択）    → resolution: item.resolution
    //   4. handleExpressAdd（Express node 生成）            → resolution: undefined
    // いずれも node 生成 / 初期化時の object literal であり、resolvedDrugName と
    // 同時に設定される。生成後に resolution だけを別途更新する代入があれば、
    // コード行数が変化しこの assertion が検知する（コメント中の言及は除外する）。
    const codeLines = src.split('\n').filter(l => !l.trim().startsWith('//'))
    const assignments = codeLines.filter(l => /resolution:\s*(item\.resolution|undefined)/.test(l))
    assert.equal(assignments.length, 4, `resolution への代入箇所数が想定と異なる（実際: ${assignments.length}）。P-1 の前提が変化した可能性がある`)
  })
})
