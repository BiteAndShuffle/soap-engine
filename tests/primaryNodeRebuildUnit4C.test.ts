/**
 * primaryNodeRebuildUnit4C.test.ts — Rapid Mode v2 / Unit 4C-1 契約テスト
 *
 * lib/primaryNode.ts の rebuildPrimary() が
 *   1. secondary（deriveNodeBlockCore）と同一の 8 field を導出すること
 *   2. lifecycle field（id / block.id / localSiteInput / matchedBrandName /
 *      resolvedDrugName / resolution）を既存 node から保持すること
 *   3. buildPrimaryNodeSnapshot へ委譲しており、deriveNodeBlockCore を
 *      直接呼ぶ第 2 経路を作っていないこと
 *   4. Unit 4C-1 時点で production 未接続であること（behavior change = 0）
 * を固定する。
 *
 * RAPID-V2-20:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   tests/primaryNodeParityUnit4A.test.ts の作法（ALL_MODULES で全 35 module
 *   を回す・oracle は production 関数）を踏襲する。
 *
 * 実行:
 *   npx tsx --test tests/primaryNodeRebuildUnit4C.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, SoapKey, ComposeNode } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import type { RapidState } from '../lib/rapidState'
import type { SRelation, SCondition } from '../lib/rapidSentence'
import {
  rebuildPrimary,
  PRIMARY_NODE_ID,
  type RebuildPrimaryInput,
} from '../lib/primaryNode'

const SECTIONS: SoapKey[] = ['S', 'O', 'A', 'P']
const DRUG = '本剤'
const PERSONA_IDS = Object.keys(PERSONA_LABELS) as PersonaId[]

const RELATIONS: SRelation[] = [
  'new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do',
]
const CONDITIONS: SCondition[] = ['stable', 'improved', 'unchanged', 'not_improved']
const SAMPLE_RAPID_STATES: RapidState[] = RELATIONS.flatMap(r =>
  CONDITIONS.map(c => ({ previousEvent: r, currentOutcome: c })),
)

function addonKeysOf(scenario: Scenario): string[] {
  const ref = (scenario as unknown as { addonsRef?: unknown }).addonsRef
  if (Array.isArray(ref)) return ref.filter((x): x is string => typeof x === 'string')
  if (ref && typeof ref === 'object') {
    return (Object.values(ref).flat() as unknown[]).filter(
      (x): x is string => typeof x === 'string',
    )
  }
  return []
}

function allScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) out.push({ mod, sc })
  }
  return out
}

function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      if (isScenarioSReplacementCapable(sc)) out.push({ mod, sc })
    }
  }
  return out
}

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const sec of SECTIONS) {
    assert.equal(a[sec], b[sec], `${msg} [${sec}]`)
  }
}

/** 既存 primary Node（rebuildPrimary の `node` 引数）のダミー。lifecycle field を検証するために非自明な値を入れる。 */
function makeExistingNode(overrides: Partial<ComposeNode> = {}): ComposeNode {
  return {
    id: PRIMARY_NODE_ID,
    moduleId: 'irrelevant',
    scenarioId: 'irrelevant',
    block: {
      id: 'EXISTING_BLOCK_ID',
      templateLabel: '',
      fields: { S: '', O: '', A: '', P: '' },
      closingText: undefined,
    },
    drugLabel: 'old-label',
    selectedAddonIds: [],
    baseLabel: '',
    baseDomain: 'old-domain',
    matchedBrandName: 'ブランドX',
    resolvedDrugName: '一般名X',
    resolution: { denotation: 'brand', brandKey: 'X', subject: 'X' },
    localSiteInput: '右上腕',
    rapid: null,
    ...overrides,
  }
}

function baseRebuildInput(
  mod: ModuleData,
  sc: Scenario,
  overrides: Partial<RebuildPrimaryInput> = {},
): RebuildPrimaryInput {
  return {
    node: makeExistingNode(),
    mod,
    scenario: sc,
    addonIds: [],
    rapid: null,
    drugName: DRUG,
    drugLabel: 'ラベル',
    baseDomain: resolveDomain(mod),
    personaEnabled: false,
    persona: 'plain',
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// T-4C1-1: block の 8 field が deriveNodeBlockCore と一致
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-1: rebuildPrimary().block は deriveNodeBlockCore と一致する', () => {
  test('全 module × 全 scenario で 8 field が一致', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const node = rebuildPrimary(baseRebuildInput(mod, sc))
      const core = deriveNodeBlockCore(sc, mod, [], null, DRUG)
      assert.equal(node.block.templateLabel, core.templateLabel)
      assertFieldsEqual(node.block.rawFields as SoapFields, core.rawFields, `mismatch: ${mod.moduleId}/${sc.id}`)
      assert.deepEqual(node.block.guard, core.guard)
      assert.deepEqual(node.block.symptomCodes, core.symptomCodes)
      assert.equal(node.block.closingText, core.closingText)
      assert.equal(node.block.closingBehavior, core.closingBehavior)
      assert.equal(node.block.groupKey, core.groupKey)
      assert.equal(node.block.clinicalDomain, core.clinicalDomain)
      checked++
    }
    assert.ok(checked > 0)
  })

  test('addon あり・rapid あり でも一致する', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 20)) {
      const keys = addonKeysOf(sc)
      const addonIds = keys.slice(0, 1)
      const rapid = SAMPLE_RAPID_STATES[0]
      const node = rebuildPrimary(baseRebuildInput(mod, sc, { addonIds, rapid }))
      const core = deriveNodeBlockCore(sc, mod, addonIds, rapid, DRUG)
      assertFieldsEqual(node.block.rawFields as SoapFields, core.rawFields, `mismatch: ${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(checked > 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-2: lifecycle field が node から保持される
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-2: lifecycle field は既存 node から保持される', () => {
  test('id / block.id / localSiteInput / matchedBrandName / resolvedDrugName / resolution', () => {
    const { mod, sc } = capableScenarios()[0]
    const resolution = { denotation: 'generic' as const, genericKey: 'Y', brandKeys: ['Y'], subject: 'Y' }
    const existing = makeExistingNode({
      block: { id: 'BLOCK_LIFECYCLE', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
      localSiteInput: '左足首',
      matchedBrandName: 'ブランドY',
      resolvedDrugName: '一般名Y',
      resolution,
    })
    const node = rebuildPrimary(baseRebuildInput(mod, sc, { node: existing }))
    assert.equal(node.id, PRIMARY_NODE_ID)
    assert.equal(node.block.id, 'BLOCK_LIFECYCLE')
    assert.equal(node.localSiteInput, '左足首')
    assert.equal(node.matchedBrandName, 'ブランドY')
    assert.equal(node.resolvedDrugName, '一般名Y')
    assert.deepEqual(node.resolution, resolution)
  })

  test('resolution が undefined の既存 node からは undefined が保持される', () => {
    const { mod, sc } = capableScenarios()[0]
    const existing = makeExistingNode({ resolution: undefined, matchedBrandName: undefined, resolvedDrugName: undefined })
    const node = rebuildPrimary(baseRebuildInput(mod, sc, { node: existing }))
    assert.equal(node.resolution, undefined)
    assert.equal(node.matchedBrandName, undefined)
    assert.equal(node.resolvedDrugName, undefined)
  })
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-3: 常に PRIMARY_NODE_ID
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-3: rebuildPrimary は常に PRIMARY_NODE_ID を id に持つ', () => {
  test('複数 module / scenario で確認', () => {
    for (const { mod, sc } of allScenarios().slice(0, 10)) {
      const node = rebuildPrimary(baseRebuildInput(mod, sc))
      assert.equal(node.id, PRIMARY_NODE_ID)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-4: determinism / 非破壊
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-4: rebuildPrimary は deterministic かつ addonIds を破壊しない', () => {
  test('同一入力に対し常に deepStrictEqual', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 10)) {
      const input = baseRebuildInput(mod, sc, { addonIds: addonKeysOf(sc).slice(0, 1), rapid: SAMPLE_RAPID_STATES[0] })
      const a = rebuildPrimary(input)
      const b = rebuildPrimary(input)
      assert.deepEqual(a, b)
    }
  })

  test('addonIds 配列を破壊しない', () => {
    const { mod, sc } = capableScenarios()[0]
    const addonIds = addonKeysOf(sc).slice(0, 2)
    if (addonIds.length === 0) return
    const before = [...addonIds]
    rebuildPrimary(baseRebuildInput(mod, sc, { addonIds }))
    assert.deepEqual(addonIds, before, '引数の addonIds を破壊してはならない')
  })
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-5: persona 適用 / 非適用
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-5: persona ON/OFF で block.fields が正しく分岐する', () => {
  test('persona ON: block.fields === applyPersonaToFieldsWithGuard(block.rawFields, true, persona, block.guard)', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 15)) {
      for (const p of PERSONA_IDS) {
        const node = rebuildPrimary(baseRebuildInput(mod, sc, { personaEnabled: true, persona: p }))
        // block.guard は MergedBlock 上は optional 型だが、deriveNodeBlockCore は
        // 常に derivePersonaGuard(...) の結果（非 undefined）を設定する
        // （primaryNodeParityUnit4A.test.ts T-4A-11 と同じ実測前提）。
        const core = deriveNodeBlockCore(sc, mod, [], null, DRUG)
        const expected = applyPersonaToFieldsWithGuard(node.block.rawFields as SoapFields, true, p, core.guard)
        assertFieldsEqual(node.block.fields as SoapFields, expected, `mismatch: ${mod.moduleId}/${sc.id} persona=${p}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('persona OFF: block.fields === block.rawFields', () => {
    const { mod, sc } = capableScenarios()[0]
    const node = rebuildPrimary(baseRebuildInput(mod, sc, { personaEnabled: false }))
    assertFieldsEqual(node.block.fields as SoapFields, node.block.rawFields as SoapFields, 'personaEnabled=false')
  })

  test('block.rawFields は常に persona 未適用（persona ON でも rawFields は raw のまま）', () => {
    const { mod, sc } = capableScenarios()[0]
    const rawNode = rebuildPrimary(baseRebuildInput(mod, sc, { personaEnabled: false }))
    const personaNode = rebuildPrimary(baseRebuildInput(mod, sc, { personaEnabled: true, persona: 'gentle' }))
    assertFieldsEqual(rawNode.block.rawFields as SoapFields, personaNode.block.rawFields as SoapFields, 'rawFields must not depend on persona')
  })
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-6: persona identity が混入しない
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-6: 返る ComposeNode に persona identity が存在しない', () => {
  test('personaEnabled / selectedPersona / persona 相当の key が無い', () => {
    const { mod, sc } = capableScenarios()[0]
    const node = rebuildPrimary(baseRebuildInput(mod, sc, { personaEnabled: true, persona: 'gentle' }))
    const keys = Object.keys(node)
    assert.ok(!keys.includes('personaEnabled'))
    assert.ok(!keys.includes('selectedPersona'))
    assert.ok(!keys.includes('persona'))
  })
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-7: localSiteInput は derive に影響しない
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-7: localSiteInput だけを変えても block.rawFields / block.fields は不変', () => {
  test('既存 node の localSiteInput が異なっても derive 結果は同一', () => {
    const { mod, sc } = capableScenarios()[0]
    const nodeA = makeExistingNode({ localSiteInput: '' })
    const nodeB = makeExistingNode({ localSiteInput: '左足首' })
    const a = rebuildPrimary(baseRebuildInput(mod, sc, { node: nodeA }))
    const b = rebuildPrimary(baseRebuildInput(mod, sc, { node: nodeB }))
    assert.notEqual(a.localSiteInput, b.localSiteInput)
    assertFieldsEqual(a.block.rawFields as SoapFields, b.block.rawFields as SoapFields, 'rawFields must not depend on localSiteInput')
    assertFieldsEqual(a.block.fields as SoapFields, b.block.fields as SoapFields, 'fields must not depend on localSiteInput')
  })
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-8: scope guard — DashboardClient.tsx が rebuildPrimary を使っていない
// ═══════════════════════════════════════════════════════════════

// Unit 4C-4 での意図的退役:
//   T-4C1-8 は「rebuildPrimary が production runtime から未接続である」ことを
//   固定する scope guard だった（Unit 4C-1 は helper 追加のみの準備 Unit であり、
//   接続は明示的に Unit 4C-4 の責務として計画されていた）。
//
//   Unit 4C-4 は rebuildPrimary を app/components/DashboardClient.tsx の
//   4 箇所（scenario rebuild effect 確定分岐 / handleAddonToggle primary 分岐 /
//   handleSToggle toggle-off・toggle-on 分岐）へ接続する Unit であり、
//   「rebuildPrimary が production から呼ばれていないこと」を要求する本テストは
//   予定どおりの変更と矛盾するため退役する（production のバグではない）。
//
//   接続の正方向の契約（4 箇所のみで純関数として呼ばれる等）は
//   tests/primaryNodeWritableUnit4C.test.ts の Group C（T-4C4-F1-1 等）が
//   value level で固定する。
describe('T-4C1-8: 退役（rebuildPrimary は Unit 4C-4 で意図的に production 接続された）', () => {
  test.skip('後継 = primaryNodeWritableUnit4C.test.ts Group C（T-4C4-F1-1 等）', () => {})
})

// ═══════════════════════════════════════════════════════════════
// T-4C1-9: buildPrimaryNodeSnapshot への委譲。第 2 経路を作らない
// ═══════════════════════════════════════════════════════════════

describe('T-4C1-9: rebuildPrimary は buildPrimaryNodeSnapshot へ委譲する', () => {
  test('lib/primaryNode.ts は deriveNodeBlockCore を呼ぶ箇所が buildPrimaryNodeSnapshot 内の 1 箇所のみ', () => {
    const src = readFileSync(new URL('../lib/primaryNode.ts', import.meta.url), 'utf-8')
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    const matches = codeOnly.match(/deriveNodeBlockCore\(/g) ?? []
    assert.equal(matches.length, 1, 'deriveNodeBlockCore の直接呼び出しは buildPrimaryNodeSnapshot の 1 箇所のみであるべき')
  })

  test('rebuildPrimary は buildPrimaryNodeSnapshot を呼んでいる', () => {
    const src = readFileSync(new URL('../lib/primaryNode.ts', import.meta.url), 'utf-8')
    const rebuildPrimaryBody = src.slice(src.indexOf('export function rebuildPrimary'))
    assert.ok(/buildPrimaryNodeSnapshot\(/.test(rebuildPrimaryBody))
  })
})
