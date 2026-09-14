/**
 * rapidV2CompositionUnit.test.ts — Rapid v2 composition + realization hardening
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-COMPOSITION-1・
 * OD-RAPID-ROUTE-VERB-1。
 *
 * 固定する契約:
 *   - Rapid v2 block は text-derived S bucketing に参加せず stable node order で合成される
 *   - 非 Rapid block・legacy Rapid v1 block の既存 bucketing は変わらない
 *   - regimen-level 第1文は same clinicalDomain × same groupKey × same transition × same outcome
 *     でのみ1回に realize され、各 Node の remainder / addon S lines は Node 位置に残る
 *   - drug-specific 文は統合しない
 *   - Do の動詞は canonical drug.route から決定論的に解決する
 *   - capable-S authoring contract validator（WARNING。Rapid v2 pilot allowlist 内の Rapid-capable scenario に限定）
 *   - rapidV2Register は Rapid v2 pilot module かつ Rapid-capable scenario の block にだけ付与される
 *
 * production 関数を直接 import する（RAPID-V2-20）。compose() は DashboardClient の
 * computeDisplayFields と同一の引数構成で mergeBlocks を呼ぶ（source contract で固定）。
 *
 * 実行:
 *   npx tsx --test tests/rapidV2CompositionUnit.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ComposeNode, ModuleData, Scenario, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { mergeBlocks } from '../lib/buildSoap'
import { rebuildNode } from '../lib/primaryNode'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import type { RapidState, RapidTransitionV2 } from '../lib/rapidState'
import type { SCondition } from '../lib/rapidSentence'
import { validateModule } from '../lib/moduleValidator'
import {
  rapidProfileOf,
  rapidV2CompositionOf,
  verbForRoute,
  verbOf,
} from '../lib/rapidV2'

const byId = (id: string): ModuleData => {
  const m = ALL_MODULES.find(x => x.moduleId === id)
  assert.ok(m, `module ${id} が見つからない`)
  return m!
}
const H1 = byId('allergy_h1_antihistamine_eye_drops')
const TZ = byId('dm_dpp4_oral')
const NR = byId('dm_insulin_rapid_analog')
const GLP = byId('dm_glp1ra_semaglutide_oral')

function scenarioOf(mod: ModuleData, id: string): Scenario {
  const sc = mod.scenarios.find(s => s.id === id)
  assert.ok(sc, `${mod.moduleId} に scenario ${id} が見つからない`)
  return sc!
}

const R = (t: RapidTransitionV2, c: SCondition): RapidState => ({ previousEvent: t, currentOutcome: c })

function node(id: string, mod: ModuleData, sc: Scenario, rapid: RapidState, drug: string, prev?: ComposeNode): ComposeNode {
  const base: ComposeNode = prev ?? {
    id, moduleId: mod.moduleId, scenarioId: '',
    block: { id: `${id}-block`, templateLabel: '', fields: { S: '', O: '', A: '', P: '' } },
    drugLabel: mod.moduleId, selectedAddonIds: [], baseLabel: '', baseDomain: mod.moduleId, rapid: null,
  }
  return rebuildNode({
    node: base, mod, scenario: sc, addonIds: [], rapid, drugName: drug,
    drugLabel: mod.moduleId, baseDomain: mod.moduleId, personaEnabled: false, persona: 'plain',
  })
}

/** DashboardClient.computeDisplayFields と同一の引数構成（source contract で固定） */
function compose(primary: ComposeNode, secondaries: ComposeNode[]): SoapFields {
  return mergeBlocks(
    secondaries.map(n => ({ ...n.block, rapidV2: rapidV2CompositionOf(n) })),
    primary.block.fields, primary.block.templateLabel, primary.block.closingText, undefined,
    primary.block.groupKey, primary.block.clinicalDomain, rapidV2CompositionOf(primary),
  )
}

/** Rapid v2 composition state を渡さない合成（変更前の合成経路と同一の入力） */
function composeWithoutRapidV2(primary: ComposeNode, secondaries: ComposeNode[]): SoapFields {
  return mergeBlocks(
    secondaries.map(n => n.block),
    primary.block.fields, primary.block.templateLabel, primary.block.closingText, undefined,
    primary.block.groupKey, primary.block.clinicalDomain,
  )
}

const lines = (s: string) => s.split('\n')

const SHARED_STABLE = '前回の処方整理後も症状は落ち着いている。'
const CONSTIPATION = '便秘は認めない。'
const INDURATION = '注射部位が硬くなるような変化は認めない。'
const HYPO = 'ふらつき・冷汗・動悸などの低血糖症状は認めない。'

const T5: RapidTransitionV2[] = ['continued_do', 'new_addition', 'med_changed', 'dose_increased', 'dose_decreased']
const C4: SCondition[] = ['stable', 'unchanged', 'improved', 'not_improved']

// ═══════════════════════════════════════════════════════════════
// 0. source contract — production 合成経路と compose() の同一性
// ═══════════════════════════════════════════════════════════════

describe('0. computeDisplayFields は Rapid v2 composition state を node から導出して mergeBlocks へ渡す', () => {
  test('secondary は rapidV2CompositionOf(n)、primary は rapidV2CompositionOf(primaryNode) を渡す', () => {
    const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
    const start = src.indexOf('function computeDisplayFields')
    const body = src.slice(start, src.indexOf('\n}', start))
    assert.ok(body.includes('confirmedNodes.map(n => ({ ...n.block, rapidV2: rapidV2CompositionOf(n) }))'))
    assert.ok(body.includes('rapidV2CompositionOf(primaryNode)'))
  })
})

// ═══════════════════════════════════════════════════════════════
// A. Human 観察ケース（トラゼンタ + ノボラピッド）
// ═══════════════════════════════════════════════════════════════

describe('A. Human 観察ケース: stable node order と regimen-level 第1文の共有化', () => {
  const tz = node('p', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
  const nrSc = scenarioOf(NR, 'se_injection_site_induration_none')

  test('NR Do×stable: トラゼンタ → ノボラピッドの順', () => {
    const nr = node('n', NR, nrSc, R('continued_do', 'stable'), 'ノボラピッド')
    assert.deepEqual(lines(compose(tz, [nr]).S), [SHARED_STABLE, CONSTIPATION, 'ノボラピッドを使用して症状は落ち着いている。', INDURATION])
  })

  test('NR 変更×stable: 「変更となり」でも前へ移動しない（stable node order）', () => {
    const nr = node('n', NR, nrSc, R('med_changed', 'stable'), 'ノボラピッド')
    assert.deepEqual(lines(compose(tz, [nr]).S), [SHARED_STABLE, CONSTIPATION, '前回からノボラピッドに変更となり症状は落ち着いている。', INDURATION])
  })

  test('NR 処方整理×stable: 共有文は1回、両 remainder は Node 順で残る', () => {
    const nr = node('n', NR, nrSc, R('regimen_reduced', 'stable'), 'ノボラピッド')
    assert.deepEqual(lines(compose(tz, [nr]).S), [SHARED_STABLE, CONSTIPATION, INDURATION])
  })
})

// ═══════════════════════════════════════════════════════════════
// B. determinism / stable node order
// ═══════════════════════════════════════════════════════════════

describe('B. determinism と stable node order', () => {
  test('同一 final semantic state・異なる操作順 → S は byte 一致', () => {
    const tzSc = scenarioOf(TZ, 'se_constipation_none'), nrSc = scenarioOf(NR, 'se_injection_site_induration_none')
    let a1 = node('p', TZ, tzSc, null, 'トラゼンタ'); let b1 = node('n', NR, nrSc, null, 'ノボラピッド')
    a1 = node('p', TZ, tzSc, R('dose_increased', 'unchanged'), 'トラゼンタ', a1)
    b1 = node('n', NR, nrSc, R('regimen_reduced', 'stable'), 'ノボラピッド', b1)
    let a2 = node('p', TZ, tzSc, null, 'トラゼンタ'); let b2 = node('n', NR, nrSc, null, 'ノボラピッド')
    b2 = node('n', NR, nrSc, R('med_changed', 'not_improved'), 'ノボラピッド', b2)
    b2 = node('n', NR, nrSc, R('regimen_reduced', 'stable'), 'ノボラピッド', b2)
    a2 = node('p', TZ, tzSc, R('regimen_reduced', 'stable'), 'トラゼンタ', a2)
    a2 = node('p', TZ, tzSc, R('dose_increased', 'unchanged'), 'トラゼンタ', a2)
    assert.equal(compose(a2, [b2]).S, compose(a1, [b1]).S)
  })

  test('drug-register の全 transition×outcome 組合せで primary block が常に先頭（文言 bucketing で入れ替わらない）', () => {
    const tzSc = scenarioOf(TZ, 'se_constipation_none'), nrSc = scenarioOf(NR, 'se_injection_site_induration_none')
    let checked = 0
    for (const t1 of T5) for (const c1 of C4) for (const t2 of T5) for (const c2 of C4) {
      const p = node('p', TZ, tzSc, R(t1, c1), 'トラゼンタ')
      const s = node('n', NR, nrSc, R(t2, c2), 'ノボラピッド')
      const out = lines(compose(p, [s]).S)
      assert.deepEqual(out, [...lines(p.block.fields.S), ...lines(s.block.fields.S)], `${t1}/${c1} + ${t2}/${c2}`)
      checked++
    }
    assert.equal(checked, 400)
  })
})

// ═══════════════════════════════════════════════════════════════
// C. 共有化の境界（統合しないケース）
// ═══════════════════════════════════════════════════════════════

describe('C. 統合しない境界', () => {
  test('drug-specific 文は同一 outcome・同一 remainder・同一薬剤名でも Node 単位で残る', () => {
    const sc = scenarioOf(TZ, 'se_hypo_none')
    const a = node('a', TZ, sc, R('med_changed', 'stable'), 'トラゼンタ')
    const b = node('b', TZ, sc, R('med_changed', 'stable'), 'トラゼンタ')
    const first = '前回からトラゼンタに変更となり症状は落ち着いている。'
    assert.deepEqual(lines(compose(a, [b]).S), [first, HYPO, first, HYPO])
  })

  test('outcome が異なる regimen-level 文は統合しない', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    const b = node('b', NR, scenarioOf(NR, 'se_injection_site_induration_none'), R('regimen_reduced', 'unchanged'), 'ノボラピッド')
    assert.deepEqual(lines(compose(a, [b]).S), [SHARED_STABLE, CONSTIPATION, '前回の処方整理後も症状は変わりない。', INDURATION])
  })

  test('transition が異なる regimen-level 文は統合しない', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'cp_good'), R('new_addition', 'improved'), 'トラゼンタ')
    const b = node('b', NR, scenarioOf(NR, 'cp_good'), R('med_changed', 'improved'), 'ノボラピッド')
    assert.equal(lines(compose(a, [b]).S).length, 4)
  })

  test('clinicalDomain が異なる場合は統合しない（H1点眼 + トラゼンタ）', () => {
    const a = node('a', H1, scenarioOf(H1, 'se_irritation_none'), R('regimen_reduced', 'stable'), 'アレジオン点眼液')
    const b = node('b', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    assert.deepEqual(lines(compose(a, [b]).S), [SHARED_STABLE, '刺激感は認めない。', SHARED_STABLE, CONSTIPATION])
  })

  test('groupKey が異なる場合は統合しない（副作用確認の処方整理 + cp_good の処方整理）', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    const b = node('b', NR, scenarioOf(NR, 'cp_good'), R('regimen_reduced', 'stable'), 'ノボラピッド')
    assert.deepEqual(lines(compose(a, [b]).S), [SHARED_STABLE, CONSTIPATION, SHARED_STABLE, '使用忘れなく継続できている。'])
  })

  test('第1文の文面が異なる場合は統合しない（cp_good Do: 服用 と 使用）', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'cp_good'), R('continued_do', 'stable'), 'トラゼンタ')
    const b = node('b', NR, scenarioOf(NR, 'cp_good'), R('continued_do', 'stable'), 'ノボラピッド')
    assert.deepEqual(lines(compose(a, [b]).S), ['薬を服用して症状は落ち着いている。', '飲み忘れなく服用している。', '薬を使用して症状は落ち着いている。', '使用忘れなく継続できている。'])
  })
})

// ═══════════════════════════════════════════════════════════════
// D. 共有化の realize 形
// ═══════════════════════════════════════════════════════════════

describe('D. 共有化の realize 形', () => {
  test('非連続（A=処方整理, B=drug-specific, C=処方整理）: Node を移動せず、C は remainder のみ C の位置に残る', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    const b = node('b', NR, scenarioOf(NR, 'se_hypo_none'), R('med_changed', 'stable'), 'ノボラピッド')
    const c = node('c', NR, scenarioOf(NR, 'se_injection_site_induration_none'), R('regimen_reduced', 'stable'), 'ノボラピッド')
    assert.deepEqual(lines(compose(a, [b, c]).S), [
      SHARED_STABLE, CONSTIPATION,
      '前回からノボラピッドに変更となり症状は落ち着いている。', HYPO,
      INDURATION,
    ])
  })

  test('共有化対象で remainder まで完全一致する場合は1回にまとめる', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'se_hypo_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    const b = node('b', NR, scenarioOf(NR, 'se_hypo_none'), R('regimen_reduced', 'stable'), 'ノボラピッド')
    assert.deepEqual(lines(compose(a, [b]).S), [SHARED_STABLE, HYPO])
  })

  test('cp_good の regimen-level 文（同一 module・同一動詞）も共有化される', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'cp_good'), R('new_addition', 'improved'), 'トラゼンタ')
    const b = node('b', TZ, scenarioOf(TZ, 'cp_good'), R('new_addition', 'improved'), 'テネリア')
    assert.deepEqual(lines(compose(a, [b]).S), ['前回の薬剤追加後、症状は良くなってきた。', '飲み忘れなく服用している。'])
  })

  test('後続 Node の addon S lines は第1文を抑制しても Node 位置に残る', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    const b0 = node('b', NR, scenarioOf(NR, 'se_injection_site_induration_none'), R('regimen_reduced', 'stable'), 'ノボラピッド')
    const addonLine = '（ADDON S 行）'
    const b: ComposeNode = { ...b0, block: { ...b0.block, fields: { ...b0.block.fields, S: `${b0.block.fields.S}\n${addonLine}` } } }
    assert.deepEqual(lines(compose(a, [b]).S), [SHARED_STABLE, CONSTIPATION, INDURATION, addonLine])
  })
})

// ═══════════════════════════════════════════════════════════════
// E. 非 Rapid / legacy Rapid v1 との関係
// ═══════════════════════════════════════════════════════════════

describe('E. 非 Rapid block・legacy Rapid v1 block の既存 bucketing は変わらない', () => {
  const glpSc = GLP.scenarios.find(isScenarioSReplacementCapable)!

  test('Rapid v2 と非 Rapid が同一 domain に混在: 非 Rapid を従来どおり realize した後に Rapid v2 を置く', () => {
    const v2 = node('a', NR, scenarioOf(NR, 'se_injection_site_induration_none'), R('med_changed', 'stable'), 'ノボラピッド')
    const plain = node('b', GLP, glpSc, null, 'リベルサス')
    assert.deepEqual(lines(compose(v2, [plain]).S), [...lines(plain.block.fields.S), ...lines(v2.block.fields.S)])
  })

  test('legacy Rapid v1 block は既存の text-derived bucketing に従う（変更対象外）', () => {
    const plain = node('a', TZ, scenarioOf(TZ, 'se_hypo_none'), null, 'トラゼンタ')
    const v1 = node('b', GLP, glpSc, R('med_changed', 'stable'), 'リベルサス')
    assert.equal(rapidV2CompositionOf(v1), undefined)
    assert.equal(compose(plain, [v1]).S, composeWithoutRapidV2(plain, [v1]).S)
    assert.ok(compose(plain, [v1]).S.startsWith(lines(v1.block.fields.S)[0]), 'legacy decision bucketing が失われている')
  })

  test('非 pilot module 同士の合成は Rapid v2 state を渡さない合成と byte 一致（v1 Rapid 全組合せ + Rapid OFF）', () => {
    const others = ALL_MODULES.filter(m => rapidProfileOf(m) === 'v1' && m.composition?.clinicalDomain === 'diabetes').slice(0, 4)
    let checked = 0
    for (const pm of others) for (const qm of others) {
      if (pm === qm) continue
      const ps = pm.scenarios.find(isScenarioSReplacementCapable)!, qs = qm.scenarios.find(isScenarioSReplacementCapable)!
      for (const rapid of [null, ...T5.map(t => R(t, 'stable'))]) {
        const p = node('p', pm, ps, rapid, 'A薬'), q = node('q', qm, qs, rapid, 'B薬')
        assert.deepEqual(compose(p, [q]), composeWithoutRapidV2(p, [q]), `${pm.moduleId} + ${qm.moduleId} ${JSON.stringify(rapid)}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('O / A / P は Rapid v2 state の有無で変化しない（pilot 組合せ）', () => {
    for (const [t, c] of [['regimen_reduced', 'stable'], ['med_changed', 'improved'], ['continued_do', 'not_improved']] as const) {
      const a = node('a', TZ, scenarioOf(TZ, 'se_constipation_none'), R(t, c), 'トラゼンタ')
      const b = node('b', NR, scenarioOf(NR, 'se_injection_site_induration_none'), R('regimen_reduced', 'stable'), 'ノボラピッド')
      const withV2 = compose(a, [b]), without = composeWithoutRapidV2(a, [b])
      assert.equal(withV2.O, without.O); assert.equal(withV2.A, without.A); assert.equal(withV2.P, without.P)
    }
  })

  test('単一 node（secondary なし）の合成は primary S をそのまま返す', () => {
    const a = node('a', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    assert.equal(compose(a, []).S, a.block.fields.S)
  })
})

// ═══════════════════════════════════════════════════════════════
// F. rapidV2CompositionOf
// ═══════════════════════════════════════════════════════════════

describe('F. rapidV2CompositionOf は node.rapid と block.rapidV2Register が揃うときだけ state を返す', () => {
  test('v2 module・rapid あり: regimenLevel は regimen register または regimen_reduced', () => {
    const se = scenarioOf(TZ, 'se_constipation_none'), cp = scenarioOf(TZ, 'cp_good')
    assert.deepEqual(rapidV2CompositionOf(node('a', TZ, se, R('med_changed', 'stable'), 'トラゼンタ')), { transition: 'med_changed', outcome: 'stable', regimenLevel: false })
    assert.deepEqual(rapidV2CompositionOf(node('a', TZ, se, R('regimen_reduced', 'stable'), 'トラゼンタ')), { transition: 'regimen_reduced', outcome: 'stable', regimenLevel: true })
    assert.deepEqual(rapidV2CompositionOf(node('a', TZ, cp, R('dose_increased', 'improved'), 'トラゼンタ')), { transition: 'dose_increased', outcome: 'improved', regimenLevel: true })
  })

  test('rapid が null なら undefined（block を spread したまま rapid だけ null にしても stale にならない）', () => {
    const on = node('a', TZ, scenarioOf(TZ, 'se_constipation_none'), R('regimen_reduced', 'stable'), 'トラゼンタ')
    assert.equal(rapidV2CompositionOf({ ...on, rapid: null }), undefined)
  })

  test('非 v2 module の block は rapidV2Register を持たず、rapid があっても undefined', () => {
    const v1 = node('a', GLP, GLP.scenarios.find(isScenarioSReplacementCapable)!, R('med_changed', 'stable'), 'リベルサス')
    assert.equal('rapidV2Register' in v1.block, false)
    assert.equal(rapidV2CompositionOf(v1), undefined)
  })

  test('v2 module でも Rapid-capable でない scenario の block は rapidV2Register を持たない', () => {
    const sc = scenarioOf(TZ, 'se_mild_continue')
    assert.equal(isScenarioSReplacementCapable(sc), false)
    assert.equal('rapidV2Register' in node('a', TZ, sc, null, 'トラゼンタ').block, false)
  })
})

// ═══════════════════════════════════════════════════════════════
// G. Do の動詞は canonical drug.route 由来（OD-RAPID-ROUTE-VERB-1）
// ═══════════════════════════════════════════════════════════════

describe('G. Do の動詞は canonical drug.route から決定論的に解決する', () => {
  test('verbForRoute: oral → 服用、それ以外の現行 route → 使用', () => {
    assert.equal(verbForRoute('oral'), '服用')
    for (const r of ['injection', 'ophthalmic', 'topical']) assert.equal(verbForRoute(r), '使用')
  })

  test('全 module で verbOf(mod) === verbForRoute(mod.drug.route)（moduleId に依存しない）', () => {
    for (const m of ALL_MODULES) assert.equal(verbOf(m), verbForRoute(m.drug?.route), m.moduleId)
    const decoy: ModuleData = { ...GLP, moduleId: 'decoy_not_in_any_map', drug: { ...GLP.drug!, route: 'oral' } }
    assert.equal(verbOf(decoy), '服用')
  })

  test('内服 cp_good の Do×stable は authored Default S と一致する（regimen register も route 由来動詞）', () => {
    const sc = scenarioOf(TZ, 'cp_good')
    const off = node('a', TZ, sc, null, 'トラゼンタ')
    const on = node('a', TZ, sc, R('continued_do', 'stable'), 'トラゼンタ')
    assert.equal(on.block.fields.S, off.block.fields.S)
  })
})

// ═══════════════════════════════════════════════════════════════
// H. capable-S authoring contract validator（RAPID_CAPABLE_S_CONTRACT / WARNING）
// ═══════════════════════════════════════════════════════════════

describe('H. RAPID_CAPABLE_S_CONTRACT', () => {
  const contractErrors = (m: ModuleData) => validateModule(m).errors.filter(e => e.code === 'RAPID_CAPABLE_S_CONTRACT')
  const withScenarioS = (id: string, S: string): ModuleData => {
    const clone = structuredClone(TZ)
    const sc = clone.scenarios.find(s => s.id === id)!
    sc.S = S
    return clone
  }

  test('現行 corpus の全 module で検出 0 件', () => {
    for (const m of ALL_MODULES) assert.deepEqual(contractErrors(m), [], m.moduleId)
  })

  test('route と一致しない動詞 → WARNING', () => {
    const errs = contractErrors(withScenarioS('se_hypo_none', `{{drug_subject}}を使用して症状は落ち着いている。\n${HYPO}`))
    assert.equal(errs.length, 1)
    assert.equal(errs[0].isWarning, true)
  })

  test('remainder が無い → WARNING', () => {
    assert.equal(contractErrors(withScenarioS('se_hypo_none', '{{drug_subject}}を服用して症状は落ち着いている。')).length, 1)
  })

  test('register と一致しない主語（cp_good に {{drug_subject}}）→ WARNING', () => {
    assert.equal(contractErrors(withScenarioS('cp_good', '{{drug_subject}}を服用して症状は落ち着いている。\n飲み忘れなく服用している。')).length, 1)
  })

  test('Rapid v2 pilot 外 module は対象外（validator scope は pilot allowlist 内に限定）', () => {
    const clone = structuredClone(GLP)
    const sc = clone.scenarios.find(isScenarioSReplacementCapable)!
    sc.S = '任意の文。'
    assert.equal(rapidProfileOf(clone), 'v1')
    assert.equal(contractErrors(clone).length, 0)
  })

  test('Rapid-capable でない scenario は対象外', () => {
    assert.equal(isScenarioSReplacementCapable(scenarioOf(TZ, 'se_mild_continue')), false)
    assert.equal(contractErrors(withScenarioS('se_mild_continue', '任意の文。')).length, 0)
  })
})
