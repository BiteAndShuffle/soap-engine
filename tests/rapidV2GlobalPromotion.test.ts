/**
 * rapidV2GlobalPromotion.test.ts — Rapid v2 global promotion 契約テスト
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-GLOBAL-1。
 *
 * 6-module pilot（Human Review CLOSE）を経て、Rapid v2 を全 module の既定 profile とし、
 * 明示的な一時除外 module だけを legacy Rapid v1 とした global promotion の契約を固定する。
 * pilot 期間の exact-set allowlist 契約（`tests/rapidV2H1Pilot.test.ts` D ／
 * `tests/rapidV2MultiModulePilot.test.ts` A）は本ファイルの profile 分布契約へ役割を移した。
 *
 * 本ファイルが固定するもの:
 *   A. profile 分布: 一時除外は Owner 承認済み exact set、それ以外の全 module（新規 module を含む）は v2
 *   B. validator scope: `RAPID_CAPABLE_S_CONTRACT` の対象が runtime profile と全 module で一致する
 *   C. runtime realization: 全 module × Rapid-capable scenario × transition × outcome の第1文が
 *      profile に対応する realization と一致する（v2 は v2 テーブル、v1 は v1 関数）
 *   D. v2 の意味契約を corpus 全体で維持する
 *      （route 由来動詞・drug / regimen register・regimen_reduced・adjustmentExpression 非参照・composition register）
 *   E. v1 rollback 経路: v1 realization（adjustmentExpression を含む）が削除されず corpus 全体で機能する
 *
 * future-subject tripwire（v1 / v2 を問わない第1文 subject 監視）は `tests/rapidCapableSubjectTripwire.test.ts`
 * が引き続き持つ（本ファイルでは重複させない）。
 *
 * production 関数を直接 import する。mirror 実装は作らない（RAPID-V2-20 の踏襲）。
 *
 * 実行: npx tsx --test tests/rapidV2GlobalPromotion.test.ts
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import type { ModuleData, Scenario } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { deriveRawFields, deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { validateModule } from '../lib/moduleValidator'
import type { RapidTransitionV2 } from '../lib/rapidState'
import { buildResolvedSFirstSentence, type SCondition, type SRelation } from '../lib/rapidSentence'
import { buildV2FirstSentence, rapidProfileOf, registerOf, verbOf } from '../lib/rapidV2'

/**
 * Owner 承認済みの一時除外（exact set。OD-RAPID-GLOBAL-1）。
 * 登録・解除は Owner Decision を要する。件数だけでなく集合で固定する。
 */
const OWNER_APPROVED_V1_TEMPORARY_EXCLUSIONS = [
  'allergy_chemical_mediator_release_inhibitor_eye_drops',
] as const

const V1_RELATIONS: SRelation[] = ['new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do']
const TRANSITIONS: RapidTransitionV2[] = [...V1_RELATIONS, 'regimen_reduced']
const CONDITIONS: SCondition[] = ['stable', 'unchanged', 'improved', 'not_improved']
const DRUG = '検証薬A'

const capableOf = (mod: ModuleData): Scenario[] => (mod.scenarios ?? []).filter(isScenarioSReplacementCapable)
const firstLine = (s: string) => s.split('\n')[0]
const contractErrors = (m: ModuleData) => validateModule(m).errors.filter(e => e.code === 'RAPID_CAPABLE_S_CONTRACT')
const V2_MODULES = ALL_MODULES.filter(m => rapidProfileOf(m) === 'v2')
const V1_MODULES = ALL_MODULES.filter(m => rapidProfileOf(m) === 'v1')

// ═══════════════════════════════════════════════════════════════
// A. profile 分布
// ═══════════════════════════════════════════════════════════════

describe('A. profile 分布: 既定 v2 + Owner 承認済み一時除外のみ v1', () => {
  test('v1 profile の module 集合は一時除外 exact set と一致する', () => {
    assert.deepEqual(V1_MODULES.map(m => m.moduleId).sort(), [...OWNER_APPROVED_V1_TEMPORARY_EXCLUSIONS].sort())
  })

  test('一時除外 module はすべて corpus に実在する（推測 ID を登録していない）', () => {
    for (const id of OWNER_APPROVED_V1_TEMPORARY_EXCLUSIONS) {
      assert.ok(ALL_MODULES.some(m => m.moduleId === id), `一時除外 ${id} が corpus に存在しない`)
    }
  })

  test('一時除外以外の全 module は v2', () => {
    const others = ALL_MODULES.filter(m => !OWNER_APPROVED_V1_TEMPORARY_EXCLUSIONS.includes(m.moduleId as never))
    assert.ok(others.length > 0)
    for (const m of others) assert.equal(rapidProfileOf(m), 'v2', m.moduleId)
    assert.equal(V2_MODULES.length, ALL_MODULES.length - OWNER_APPROVED_V1_TEMPORARY_EXCLUSIONS.length)
  })

  test('corpus に未登録の新規 moduleId は既定で v2（allowlist への追加を要しない）', () => {
    const base = V2_MODULES[0]
    assert.equal(rapidProfileOf({ ...base, moduleId: 'zz_future_module_not_in_corpus' }), 'v2')
  })

  test('一時除外は moduleId の完全一致のみ（prefix / suffix の類似 ID は除外されない）', () => {
    const [excluded] = OWNER_APPROVED_V1_TEMPORARY_EXCLUSIONS
    const mod = ALL_MODULES.find(m => m.moduleId === excluded)!
    assert.equal(rapidProfileOf({ ...mod, moduleId: `${excluded}_rebuilt` }), 'v2')
    assert.equal(rapidProfileOf({ ...mod, moduleId: excluded.replace(/^allergy_/, '') }), 'v2')
  })

  test('v2 / v1 の両 profile に Rapid-capable scenario が存在する（走査の空振り防止）', () => {
    assert.ok(V2_MODULES.some(m => capableOf(m).length > 0))
    assert.ok(V1_MODULES.some(m => capableOf(m).length > 0))
  })
})

// ═══════════════════════════════════════════════════════════════
// B. validator scope = runtime profile
// ═══════════════════════════════════════════════════════════════

describe('B. RAPID_CAPABLE_S_CONTRACT の scope は runtime profile と全 module で一致する', () => {
  test('現行 corpus の全 module で検出 0 件（WARNING / Design Rule）', () => {
    for (const m of ALL_MODULES) assert.deepEqual(contractErrors(m), [], m.moduleId)
  })

  test('全 module: Rapid-capable scenario の S を契約外にすると、v2 profile なら WARNING・v1 profile なら対象外', () => {
    let checkedV2 = 0, checkedV1 = 0
    for (const mod of ALL_MODULES) {
      const sc = capableOf(mod)[0]
      if (!sc) continue
      const clone = structuredClone(mod)
      clone.scenarios.find(s => s.id === sc.id)!.S = '任意の文。'
      const errs = contractErrors(clone)
      if (rapidProfileOf(mod) === 'v2') {
        assert.equal(errs.length, 1, mod.moduleId)
        assert.equal(errs[0].isWarning, true, `${mod.moduleId}: WARNING のまま（ERROR へ昇格していない）`)
        checkedV2++
      } else {
        assert.equal(errs.length, 0, mod.moduleId)
        checkedV1++
      }
    }
    assert.equal(checkedV2, V2_MODULES.filter(m => capableOf(m).length > 0).length)
    assert.ok(checkedV1 > 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// C. runtime realization = profile
// ═══════════════════════════════════════════════════════════════

describe('C. 全 module の Rapid 第1文が profile に対応する realization と一致する', () => {
  test('v2 profile: 6 transition × 4 outcome が v2 テーブル（register / route 由来動詞）と一致', () => {
    let checked = 0
    for (const mod of V2_MODULES) for (const sc of capableOf(mod)) {
      for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        const actual = firstLine(deriveRawFields(sc, mod, [], { previousEvent: t, currentOutcome: c }, DRUG).S)
        assert.equal(actual, buildV2FirstSentence(t, c, registerOf(sc), DRUG, verbOf(mod), sc.rapidEvaluationSubject), `${mod.moduleId} / ${sc.id} / ${t} / ${c}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('v1 profile（一時除外）: 5 relation × 4 outcome が v1 関数（adjustmentExpression 込み）と一致', () => {
    let checked = 0
    for (const mod of V1_MODULES) for (const sc of capableOf(mod)) {
      for (const t of V1_RELATIONS) for (const c of CONDITIONS) {
        const actual = firstLine(deriveRawFields(sc, mod, [], { previousEvent: t, currentOutcome: c }, DRUG).S)
        assert.equal(actual, buildResolvedSFirstSentence(t, c, DRUG, mod.display?.adjustmentExpression), `${mod.moduleId} / ${sc.id} / ${t} / ${c}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('Rapid OFF（null）では全 module で authored S がそのまま使われる（非 Rapid 経路は profile に依らない）', () => {
    for (const mod of ALL_MODULES) for (const sc of capableOf(mod)) {
      const raw = deriveRawFields(sc, mod, [], null, DRUG)
      assert.equal(firstLine(raw.S), firstLine(String(sc.S)).replace('{{drug_subject}}', DRUG), `${mod.moduleId} / ${sc.id}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// D. v2 の意味契約（corpus 全体）
// ═══════════════════════════════════════════════════════════════

describe('D. v2 の意味契約を global promotion 後の corpus 全体で維持する', () => {
  test('Do の動詞は drug.route 由来（oral = 服用 / それ以外 = 使用）で、全 route を走査している', () => {
    const routes = new Set<string>()
    for (const mod of V2_MODULES) {
      const route = String(mod.drug?.route)
      routes.add(route)
      const verb = route === 'oral' ? '服用' : '使用'
      assert.equal(verbOf(mod), verb, mod.moduleId)
      for (const sc of capableOf(mod)) {
        const isDrugRegister = registerOf(sc) === 'drug'
        const subject = isDrugRegister ? DRUG : '薬'
        const evalSubject = isDrugRegister ? (sc.rapidEvaluationSubject ?? '症状') : '症状'
        const actual = firstLine(deriveRawFields(sc, mod, [], { previousEvent: 'continued_do', currentOutcome: 'stable' }, DRUG).S)
        assert.equal(actual, `${subject}を${verb}して${evalSubject}は落ち着いている。`, `${mod.moduleId} / ${sc.id}`)
      }
    }
    assert.deepEqual([...routes].sort(), ['injection', 'ophthalmic', 'oral', 'topical'])
  })

  test('register: adherence scenario は regimen-level（薬剤名なし）、副作用確認 scenario は drug-specific（薬剤名あり）', () => {
    let regimen = 0, drug = 0
    for (const mod of V2_MODULES) for (const sc of capableOf(mod)) {
      const reg = registerOf(sc)
      assert.equal(reg, sc.scenarioType === 'adherence' ? 'regimen' : 'drug', `${mod.moduleId} / ${sc.id}`)
      for (const t of V1_RELATIONS.filter(x => x !== 'continued_do')) for (const c of CONDITIONS) {
        const s = firstLine(deriveRawFields(sc, mod, [], { previousEvent: t, currentOutcome: c }, DRUG).S)
        assert.equal(s.includes(DRUG), reg === 'drug', `${mod.moduleId} / ${sc.id} / ${t} / ${c}`)
      }
      if (reg === 'regimen') regimen++; else drug++
    }
    assert.ok(regimen > 0 && drug > 0)
  })

  test('regimen_reduced は register に依らず薬剤名を含まない承認済み4文（評価対象名詞は scenario.rapidEvaluationSubject に従う）', () => {
    const expectedFor = (subj: string): Record<SCondition, string> => ({
      stable: `前回の処方整理後も${subj}は落ち着いている。`,
      unchanged: `前回の処方整理後も${subj}は変わりない。`,
      improved: `前回の処方整理後、${subj}は良くなってきた。`,
      not_improved: `前回の処方整理後も${subj}の改善は乏しい。`,
    })
    for (const mod of V2_MODULES) for (const sc of capableOf(mod)) {
      // 2026-09-26 pilot（OD-RAPID-READINESS-1 §1）: register === 'drug' の scenario は
      // rapidEvaluationSubject（未指定なら既定「症状」）を参照する。regimen register は常に「症状」。
      const subj = registerOf(sc) === 'drug' ? (sc.rapidEvaluationSubject ?? '症状') : '症状'
      const expected = expectedFor(subj)
      for (const c of CONDITIONS) {
        const s = firstLine(deriveRawFields(sc, mod, [], { previousEvent: 'regimen_reduced', currentOutcome: c }, DRUG).S)
        assert.equal(s, expected[c], `${mod.moduleId} / ${sc.id} / ${c}`)
        assert.ok(!s.includes(DRUG), `${mod.moduleId} / ${sc.id} / ${c}: regimen_reduced は薬剤名を含まないはず`)
      }
    }
  })

  test('adjustmentExpression を持つ v2 module でも v2 realization は AE を参照しない（canonical 値は保持）', () => {
    // v1 の AE realization は「前回から{薬剤}の{AE}〜」形。AE 値が「増量となった」のように v2 の文言と
    // 部分一致する module があるため、AE 値単体ではなく v1 の AE 構文の出現で判定する。
    const withAe = V2_MODULES.filter(m => m.display?.adjustmentExpression)
    assert.ok(withAe.length > 0)
    for (const mod of withAe) {
      const ae = mod.display!.adjustmentExpression!
      for (const sc of capableOf(mod)) for (const t of TRANSITIONS) for (const c of CONDITIONS) {
        const s = firstLine(deriveRawFields(sc, mod, [], { previousEvent: t, currentOutcome: c }, DRUG).S)
        assert.equal(
          s.includes(`${DRUG}の${ae.increasePast}`) || s.includes(`${DRUG}の${ae.decreasePast}`),
          false,
          `${mod.moduleId} / ${sc.id} / ${t} / ${c}`,
        )
      }
    }
  })

  test('composition register: v2 の Rapid-capable block だけが rapidV2Register を持つ（v1・非 capable は持たない）', () => {
    for (const mod of ALL_MODULES) for (const sc of mod.scenarios ?? []) {
      const core = deriveNodeBlockCore(sc, mod, [], null, DRUG)
      const expectRegister = rapidProfileOf(mod) === 'v2' && isScenarioSReplacementCapable(sc)
      assert.equal('rapidV2Register' in core, expectRegister, `${mod.moduleId} / ${sc.id}`)
      if (expectRegister) assert.equal(core.rapidV2Register, registerOf(sc))
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// E. v1 rollback 経路
// ═══════════════════════════════════════════════════════════════

describe('E. v1 rollback 経路（v1 realization は削除されていない）', () => {
  test('v1 関数は全 module の adjustmentExpression を引き続き realization に使える', () => {
    const withAe = ALL_MODULES.filter(m => m.display?.adjustmentExpression)
    assert.ok(withAe.length > 0)
    for (const mod of withAe) {
      const ae = mod.display!.adjustmentExpression!
      assert.ok(buildResolvedSFirstSentence('dose_increased', 'stable', DRUG, ae).includes(ae.increasePast), mod.moduleId)
      assert.ok(buildResolvedSFirstSentence('dose_decreased', 'stable', DRUG, ae).includes(ae.decreasePast), mod.moduleId)
    }
  })

  test('v1 関数は v1 の5 relation × 4 condition すべてで非空の文を返す（regimen_reduced は v1 に存在しない）', () => {
    for (const t of V1_RELATIONS) for (const c of CONDITIONS) {
      assert.ok(buildResolvedSFirstSentence(t, c, DRUG).length > 0, `${t} / ${c}`)
    }
  })
})
