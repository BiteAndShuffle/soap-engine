/**
 * rapidDoseApplicability.test.ts — Q-RAPID2「Rapid Transition Applicability」
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID2 / 本 Unit の Owner Decision（brand 単位を基本とし、
 * generic / module 未確定時は candidate brand 群を代表選定せず全件 `every()` 集約する。
 * legacy 経路は `matchedBrandName` のみを用い、`drug.brandNames?.[0]` へフォールバックしない）。
 *
 * 固定する契約:
 *   - dose_increased / dose_decreased の表示可否は、brand の `handlingTags` と
 *     scenario の `sComposition.intent` / `scenarioRequiredTags` のみから deterministic に導出する
 *     （新規 canonical field は存在しない）
 *   - generic / module 未確定時は tag intersection ではなく、brand ごとの判定結果を every() で集約する
 *     （brand A/B が異なる tag 経路で共に到達可能でも、共通 tag が無いケースで偽陰性にしない）
 *   - legacy（resolution === undefined）は matchedBrandName のみを見る。
 *     matchedBrandName 未確定時に drug.brandNames?.[0] 等の代表 brand へフォールバックしない
 *
 * 実行:
 *   npx tsx --test tests/rapidDoseApplicability.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import type { ModuleData } from '../lib/types'
import type { BrandResolution } from '../lib/brandResolution'
import type { BrandCatalog } from '../lib/brandTags'
import { ALL_MODULES } from '../data/modules/index'
import {
  doseTransitionApplicabilityForTags,
  doseTransitionApplicabilityOf,
} from '../lib/rapidV2'

const byId = (id: string): ModuleData => {
  const m = ALL_MODULES.find(x => x.moduleId === id)
  assert.ok(m, `module ${id} が見つからない`)
  return m!
}

/** 増量・減量いずれもブランド別に gated されている実例（DPP-4阻害薬） */
const DPP4 = byId('dm_dpp4_oral')
/** 増量・減量とも ungated（scenarioRequiredTags 無し）な実例 */
const INSULIN = byId('dm_insulin_rapid_analog')
/** dose_increase / dose_decrease scenario が module 全体に存在しない実例 */
const CARDIORENAL = byId('cardiorenal_sglt2_oral')

const dpp4Tags = (brand: string): string[] | undefined =>
  DPP4.drug?.brandCatalog?.[brand]?.handlingTags

const dpp4BrandCatalog = DPP4.drug?.brandCatalog as BrandCatalog
const insulinBrandCatalog = INSULIN.drug?.brandCatalog as BrandCatalog

describe('0. 実測前提（corpus事実の固定）', () => {
  test('dm_dpp4_oral: トラゼンタは handlingTags: []（増量・減量とも非対応）', () => {
    assert.deepEqual(dpp4Tags('トラゼンタ'), [])
  })
  test('dm_dpp4_oral: マリゼブは減量対応タグのみ保有', () => {
    const tags = dpp4Tags('マリゼブ') ?? []
    assert.ok(!tags.includes('dpp4_standard_titration'))
    assert.ok(tags.includes('dpp4_renal_dose_adjustment') || tags.includes('dpp4_dose_decrease_supported'))
  })
  test('cardiorenal_sglt2_oral: dose_increase/decrease scenario が0件', () => {
    const hasDoseScenario = CARDIORENAL.scenarios.some(
      sc => sc.sComposition?.intent === 'dose_increase' || sc.sComposition?.intent === 'dose_decrease',
    )
    assert.equal(hasDoseScenario, false)
  })
})

describe('A. doseTransitionApplicabilityForTags（brand単位 core）', () => {
  test('トラゼンタ（tags: []）→ 増量・減量とも false', () => {
    assert.deepEqual(doseTransitionApplicabilityForTags(DPP4, dpp4Tags('トラゼンタ')), {
      dose_increased: false, dose_decreased: false,
    })
  })
  test('マリゼブ（減量対応タグのみ）→ 増量 false・減量 true', () => {
    assert.deepEqual(doseTransitionApplicabilityForTags(DPP4, dpp4Tags('マリゼブ')), {
      dose_increased: false, dose_decreased: true,
    })
  })
  test('スイニー（標準滴定タグ保有）→ 増量・減量とも true', () => {
    assert.deepEqual(doseTransitionApplicabilityForTags(DPP4, dpp4Tags('スイニー')), {
      dose_increased: true, dose_decreased: true,
    })
  })
  test('tags未確定（undefined）→ gated moduleでは増量・減量とも false', () => {
    assert.deepEqual(doseTransitionApplicabilityForTags(DPP4, undefined), {
      dose_increased: false, dose_decreased: false,
    })
  })
  test('ungated module（insulin）は tags未確定でも増量・減量とも true', () => {
    assert.deepEqual(doseTransitionApplicabilityForTags(INSULIN, undefined), {
      dose_increased: true, dose_decreased: true,
    })
  })
  test('dose scenarioが0件のmodule（cardiorenal）は tagsに関わらず false', () => {
    assert.deepEqual(doseTransitionApplicabilityForTags(CARDIORENAL, ['heart_failure_supported', 'ckd_supported']), {
      dose_increased: false, dose_decreased: false,
    })
  })
})

describe('B. doseTransitionApplicabilityOf — denotation: brand', () => {
  test('brand確定（トラゼンタ）→ core判定と一致', () => {
    const resolution: BrandResolution = { denotation: 'brand', brandKey: 'トラゼンタ', subject: 'トラゼンタ' }
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, resolution, dpp4BrandCatalog, undefined),
      { dose_increased: false, dose_decreased: false },
    )
  })
})

describe('C. doseTransitionApplicabilityOf — denotation: generic（every集約・intersection方式ではない）', () => {
  test('candidateにトラゼンタを含む → 少なくとも1brandが不一致のため false', () => {
    const resolution: BrandResolution = {
      denotation: 'generic', genericKey: 'linagliptin_group_test',
      brandKeys: ['トラゼンタ', 'スイニー'], subject: 'リナグリプチン',
    }
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, resolution, dpp4BrandCatalog, undefined),
      { dose_increased: false, dose_decreased: false },
    )
  })
  test('candidate全員が増量・減量とも true → true', () => {
    const resolution: BrandResolution = {
      denotation: 'generic', genericKey: 'standard_titration_group_test',
      brandKeys: ['スイニー', 'ネシーナ', 'エクア'], subject: 'test',
    }
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, resolution, dpp4BrandCatalog, undefined),
      { dose_increased: true, dose_decreased: true },
    )
  })
  test('candidate全員が減量のみtrue（増量は全員false）→ 増量false・減量true', () => {
    const resolution: BrandResolution = {
      denotation: 'generic', genericKey: 'weekly_dpp4_group_test',
      brandKeys: ['マリゼブ', 'ザファテック'], subject: 'test',
    }
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, resolution, dpp4BrandCatalog, undefined),
      { dose_increased: false, dose_decreased: true },
    )
  })
  test('candidate 0件 → 代表brandが無いため false（DP-15）', () => {
    const resolution: BrandResolution = {
      denotation: 'generic', genericKey: 'empty_group_test', brandKeys: [], subject: 'test',
    }
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, resolution, dpp4BrandCatalog, undefined),
      { dose_increased: false, dose_decreased: false },
    )
  })

  test('【回帰】tag intersectionが空でも、全candidateが別経路で増量可能なら true になる（intersection方式の偽陰性を修正した証明）', () => {
    // BrandA / BrandB は共通 handlingTag を持たないが、それぞれ別の
    // dose_increase scenario（別 tag でgate）に到達できる合成 fixture。
    // 旧設計（tag intersection → reachability）では intersection が [] になり
    // false を返してしまうケース。
    const synthMod = {
      scenarios: [
        { id: 'inc_via_a', sComposition: { intent: 'dose_increase', template: 't', symptomCodes: [], symptoms: [] }, scenarioRequiredTags: ['tag_a'] },
        { id: 'inc_via_b', sComposition: { intent: 'dose_increase', template: 't', symptomCodes: [], symptoms: [] }, scenarioRequiredTags: ['tag_b'] },
      ],
    } as unknown as ModuleData
    const synthCatalog = {
      BrandA: { handlingTags: ['tag_a'] },
      BrandB: { handlingTags: ['tag_b'] },
    } as unknown as BrandCatalog
    const resolution: BrandResolution = {
      denotation: 'generic', genericKey: 'synthetic_disjoint_test',
      brandKeys: ['BrandA', 'BrandB'], subject: 'test',
    }
    assert.deepEqual(
      doseTransitionApplicabilityOf(synthMod, resolution, synthCatalog, undefined),
      { dose_increased: true, dose_decreased: false },
    )
  })
})

describe('D. doseTransitionApplicabilityOf — denotation: module（brandCatalog全件をevery集約）', () => {
  test('brandCatalog全brandにトラゼンタを含む → false', () => {
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, resolution, dpp4BrandCatalog, undefined),
      { dose_increased: false, dose_decreased: false },
    )
  })
  test('全brandが増量・減量ともtrueなmodule（insulin）→ true', () => {
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.deepEqual(
      doseTransitionApplicabilityOf(INSULIN, resolution, insulinBrandCatalog, undefined),
      { dose_increased: true, dose_decreased: true },
    )
  })
})

describe('E. doseTransitionApplicabilityOf — legacy（resolution === undefined）', () => {
  test('matchedBrandName確定（トラゼンタ）→ 単一brand core判定', () => {
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, undefined, dpp4BrandCatalog, 'トラゼンタ'),
      { dose_increased: false, dose_decreased: false },
    )
  })
  test('matchedBrandName未確定 → brandNames[0]へフォールバックせず全brand every集約する', () => {
    // drug.brandNames[0] は 'トラゼンタ'（{false,false}）だが、代表brand選定を
    // 禁止しているため、matchedBrandName未指定時は brandCatalog 全件を評価する。
    // dm_dpp4_oral は全体として不一致（トラゼンタが不一致）なので結果は変わらず false のままだが、
    // 「brandNames[0]だけを見ていない」ことは下の合成 fixture で証明する。
    assert.deepEqual(
      doseTransitionApplicabilityOf(DPP4, undefined, dpp4BrandCatalog, undefined),
      { dose_increased: false, dose_decreased: false },
    )
  })

  test('【回帰】brandNames[0]フォールバックを使うと誤ってtrueになるはずの合成fixtureでfalseを返す', () => {
    // brandNames[0]相当の候補（BrandFirst）は増量可能だが、
    // 他のcandidate（BrandOther）は増量不可。
    // brandNames[0]へフォールバックする実装なら誤って true を返す。
    // 正しい実装は brandCatalog 全件を every() 集約し false を返す。
    const synthMod = {
      scenarios: [
        { id: 'inc', sComposition: { intent: 'dose_increase', template: 't', symptomCodes: [], symptoms: [] }, scenarioRequiredTags: ['titratable'] },
      ],
      drug: { brandNames: ['BrandFirst', 'BrandOther'] },
    } as unknown as ModuleData
    const synthCatalog = {
      BrandFirst: { handlingTags: ['titratable'] },
      BrandOther: { handlingTags: [] },
    } as unknown as BrandCatalog
    assert.deepEqual(
      doseTransitionApplicabilityOf(synthMod, undefined, synthCatalog, undefined),
      { dose_increased: false, dose_decreased: false },
    )
  })

  test('brandCatalog自体が無いmoduleはbrand非依存core判定にフォールバックする', () => {
    const synthMod = { scenarios: [] } as unknown as ModuleData
    assert.deepEqual(
      doseTransitionApplicabilityOf(synthMod, undefined, undefined, 'anything'),
      { dose_increased: false, dose_decreased: false },
    )
  })
})
