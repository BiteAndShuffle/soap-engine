/**
 * primaryNodeParityUnit4A.test.ts — Rapid Mode v2 / Unit 4A 契約テスト
 *
 * Unit 4A（primary Node projection helper の新設）で、
 * lib/primaryNode.ts の buildPrimaryNodeSnapshot() が
 *   1. secondary（deriveNodeBlockCore）と同一の block を導出すること
 *   2. 現行 primary production 経路（deriveRawFields / derivePersonaGuard /
 *      buildNodeFields の closingText / mergePolicy.S.groupKey /
 *      composition.clinicalDomain / applyPersonaToFieldsWithGuard）と
 *      parity を持つこと
 * を固定する。
 *
 * これは Unit 4B（read 経路の切り替え）が behavior change 0 で成立する
 * ための構造的根拠になる。
 *
 * RAPID-V2-20:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   closingText の oracle には DashboardClient.tsx の local 関数
 *   （resolveClosingText, export されていない）を複製せず、
 *   buildNodeFields(...).closingText を使う（同一ロジックであることは
 *   Unit 4 事前監査で確認済み）。
 *
 * 実行:
 *   npx tsx --test tests/primaryNodeParityUnit4A.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, SoapKey } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields } from '../lib/buildSoap'
import { deriveRawFields, deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { derivePersonaGuard } from '../lib/personaGuard'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import type { RapidState } from '../lib/rapidState'
import {
  type SRelation,
  type SCondition,
} from '../lib/rapidSentence'
import { buildPrimaryNodeSnapshot, PRIMARY_NODE_ID, type PrimaryNodeInput } from '../lib/primaryNode'

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

function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      if (isScenarioSReplacementCapable(sc)) out.push({ mod, sc })
    }
  }
  return out
}

function allScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) out.push({ mod, sc })
  }
  return out
}

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

function baseInput(mod: ModuleData, sc: Scenario | undefined, overrides: Partial<PrimaryNodeInput> = {}): PrimaryNodeInput {
  return {
    mod,
    scenario: sc,
    addonIds: [],
    rapid: null,
    drugName: DRUG,
    localSiteInput: '',
    matchedBrandName: undefined,
    resolvedDrugName: undefined,
    resolution: undefined,
    drugLabel: 'ラベル',
    baseDomain: resolveDomain(mod),
    blockId: 'BLOCK_ID',
    personaEnabled: false,
    persona: 'plain',
    ...overrides,
  }
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const sec of SECTIONS) {
    assert.equal(a[sec], b[sec], `${msg} [${sec}]`)
  }
}

// ═══════════════════════════════════════════════════════════════
// A. secondary（deriveNodeBlockCore）との block parity（T-4A-1, 4, 6-9, 16）
// ═══════════════════════════════════════════════════════════════

describe('A. buildPrimaryNodeSnapshot の block は deriveNodeBlockCore と一致する', () => {
  test('T-4A-1/4/16: 全モジュール × 全 scenario × addon なし（rapid=null）で block metadata が一致', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { drugName: DRUG }))
      const core = deriveNodeBlockCore(sc, mod, [], null, DRUG)
      assert.equal(node.id, PRIMARY_NODE_ID)
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

  test('T-4A-6/7: rapid null / 非 null の両方で deriveNodeBlockCore と rawFields が一致', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 40)) {
      for (const rapid of [null, ...SAMPLE_RAPID_STATES.slice(0, 3)]) {
        const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { rapid, drugName: DRUG }))
        const core = deriveNodeBlockCore(sc, mod, [], rapid, DRUG)
        assertFieldsEqual(node.block.rawFields as SoapFields, core.rawFields, `mismatch: ${mod.moduleId}/${sc.id} rapid=${JSON.stringify(rapid)}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('T-4A-8/9: ADDON あり（単数・複数）でも deriveNodeBlockCore と一致', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const keys = addonKeysOf(sc)
      if (keys.length === 0) continue
      for (const addonIds of [keys.slice(0, 1), keys.slice(0, 2)]) {
        if (addonIds.length === 0) continue
        const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { addonIds, drugName: DRUG }))
        const core = deriveNodeBlockCore(sc, mod, addonIds, null, DRUG)
        assertFieldsEqual(node.block.rawFields as SoapFields, core.rawFields, `mismatch: ${mod.moduleId}/${sc.id} addons=${addonIds.join(',')}`)
        assert.equal(node.selectedAddonIds.length, addonIds.length)
        checked++
      }
    }
    assert.ok(checked > 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// B. 現行 primary production 経路との parity（最重要。T-4A-3, 5）
// ═══════════════════════════════════════════════════════════════

describe('B. 現行 primary production 経路との parity', () => {
  test('T-4A-3: deriveRawFields（現行 primary 経路）と block.rawFields が byte 一致', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      for (const rapid of [null, SAMPLE_RAPID_STATES[0]]) {
        const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { rapid, drugName: DRUG }))
        const primaryRaw = deriveRawFields(sc, mod, [], rapid, DRUG)
        assertFieldsEqual(node.block.rawFields as SoapFields, primaryRaw, `mismatch: ${mod.moduleId}/${sc.id}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('T-4A-3: derivePersonaGuard（現行 primary 経路）と block.guard が一致', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const node = buildPrimaryNodeSnapshot(baseInput(mod, sc))
      const primaryGuard = derivePersonaGuard(sc, mod.template?.urgentFlag)
      assert.deepEqual(node.block.guard, primaryGuard, `mismatch: ${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(checked > 0)
  })

  test('T-4A-5: closingText が現行 primary 経路（buildNodeFields oracle）と一致', () => {
    // resolveClosingText（DashboardClient local, 非 export）を複製せず、
    // 同一ロジックである buildNodeFields(...).closingText を oracle にする。
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { drugName: DRUG }))
      const { closingText, closingBehavior } = buildNodeFields(sc, mod, [], DRUG)
      assert.equal(node.block.closingText, closingText, `mismatch: ${mod.moduleId}/${sc.id}`)
      assert.equal(node.block.closingBehavior, closingBehavior)
      checked++
    }
    assert.ok(checked > 0)
  })

  test('T-4A-3: merge metadata（groupKey / clinicalDomain）が現行 primary 計算式と一致', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const node = buildPrimaryNodeSnapshot(baseInput(mod, sc))
      const currentGroupKey = sc.mergePolicy?.S?.groupKey
      const currentClinicalDomain = mod.composition?.clinicalDomain
      assert.equal(node.block.groupKey, currentGroupKey, `groupKey mismatch: ${mod.moduleId}/${sc.id}`)
      assert.equal(node.block.clinicalDomain, currentClinicalDomain, `clinicalDomain mismatch: ${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(checked > 0)
  })

  test('T-4A-11: persona 適用後 block.fields が既存 secondary Node 組み立て経路と一致', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 20)) {
      for (const p of PERSONA_IDS) {
        const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { personaEnabled: true, persona: p, drugName: DRUG }))
        const core = deriveNodeBlockCore(sc, mod, [], null, DRUG)
        const expected = applyPersonaToFieldsWithGuard(core.rawFields, true, p, core.guard)
        assertFieldsEqual(node.block.fields as SoapFields, expected, `mismatch: ${mod.moduleId}/${sc.id} persona=${p}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('personaEnabled=false のとき block.fields は block.rawFields と同値', () => {
    const { mod, sc } = capableScenarios()[0]
    const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { personaEnabled: false }))
    assertFieldsEqual(node.block.fields as SoapFields, node.block.rawFields as SoapFields, 'personaEnabled=false')
  })
})

// ═══════════════════════════════════════════════════════════════
// C. ownership / mapping contract
// ═══════════════════════════════════════════════════════════════

describe('C. primary state → ComposeNode の mapping', () => {
  test('T-4A-2/3: scenarioId / addonIds / rapid / localSiteInput / brand metadata / resolution が入力と一致', () => {
    const { mod, sc } = capableScenarios()[0]
    const resolution = { denotation: 'brand' as const, brandKey: 'X', subject: 'X' }
    const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, {
      addonIds: addonKeysOf(sc).slice(0, 1),
      rapid: SAMPLE_RAPID_STATES[0],
      localSiteInput: '右上腕',
      matchedBrandName: 'ブランドA',
      resolvedDrugName: '一般名A',
      resolution,
    }))
    assert.equal(node.id, PRIMARY_NODE_ID)
    assert.equal(node.scenarioId, sc.globalId)
    assert.deepEqual(node.selectedAddonIds, addonKeysOf(sc).slice(0, 1))
    assert.deepEqual(node.rapid, SAMPLE_RAPID_STATES[0])
    assert.equal(node.localSiteInput, '右上腕')
    assert.equal(node.matchedBrandName, 'ブランドA')
    assert.equal(node.resolvedDrugName, '一般名A')
    assert.deepEqual(node.resolution, resolution)
    assert.equal(node.baseLabel, sc.title)
  })

  test('T-4A-8: pending node（scenario 未確定）は secondary の pending semantics と一致する', () => {
    const mod = ALL_MODULES[0]
    const node = buildPrimaryNodeSnapshot(baseInput(mod, undefined))
    assert.equal(node.id, PRIMARY_NODE_ID)
    assert.equal(node.scenarioId, '')
    assert.equal(node.rapid, null)
    assert.deepEqual(node.selectedAddonIds, [])
    assert.equal(node.baseLabel, '')
    assertFieldsEqual(node.block.fields as SoapFields, { S: '', O: '', A: '', P: '' }, 'pending block')
  })
})

// ═══════════════════════════════════════════════════════════════
// D. Persona Scope Boundary（T-4A-10）
// ═══════════════════════════════════════════════════════════════

describe('D. persona identity が ComposeNode へ混入しない', () => {
  test('T-4A-10: 返る ComposeNode に personaEnabled / selectedPersona / persona 相当の field が存在しない', () => {
    const { mod, sc } = capableScenarios()[0]
    const node = buildPrimaryNodeSnapshot(baseInput(mod, sc, { personaEnabled: true, persona: 'gentle' }))
    const keys = Object.keys(node)
    assert.ok(!keys.includes('personaEnabled'))
    assert.ok(!keys.includes('selectedPersona'))
    assert.ok(!keys.includes('persona'))
  })

  test('lib/primaryNode.ts は deriveNodeBlockCore の persona 未適用契約を変更しない（applyPersonaToFieldsWithGuard は Node 組み立て層でのみ呼ぶ）', () => {
    const src = readFileSync(new URL('../lib/primaryNode.ts', import.meta.url), 'utf-8')
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    // applyPersonaToFieldsWithGuard の呼び出しは buildPrimaryNodeSnapshot 内の 1 箇所のみ
    const matches = codeOnly.match(/applyPersonaToFieldsWithGuard\(/g) ?? []
    assert.equal(matches.length, 1)
  })
})

// ═══════════════════════════════════════════════════════════════
// E. localInput boundary（T-4A-12）
// ═══════════════════════════════════════════════════════════════

describe('E. localSiteInput は Node field として保持されるが derive へ materialize されない', () => {
  test('T-4A-12: localSiteInput を変えても rawFields / fields が変化しない', () => {
    const { mod, sc } = capableScenarios()[0]
    const a = buildPrimaryNodeSnapshot(baseInput(mod, sc, { localSiteInput: '' }))
    const b = buildPrimaryNodeSnapshot(baseInput(mod, sc, { localSiteInput: '左足首' }))
    assert.notEqual(a.localSiteInput, b.localSiteInput)
    assertFieldsEqual(a.block.rawFields as SoapFields, b.block.rawFields as SoapFields, 'rawFields must not depend on localSiteInput')
    assertFieldsEqual(a.block.fields as SoapFields, b.block.fields as SoapFields, 'fields must not depend on localSiteInput')
  })
})

// ═══════════════════════════════════════════════════════════════
// F. determinism / 引数非破壊（T-4A-13, 14）
// ═══════════════════════════════════════════════════════════════

describe('F. buildPrimaryNodeSnapshot は deterministic かつ引数を破壊しない', () => {
  test('T-4A-13: 同一入力に対し常に deepStrictEqual な出力を返す', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 10)) {
      const input = baseInput(mod, sc, { addonIds: addonKeysOf(sc).slice(0, 1), rapid: SAMPLE_RAPID_STATES[0] })
      const a = buildPrimaryNodeSnapshot(input)
      const b = buildPrimaryNodeSnapshot(input)
      assert.deepEqual(a, b)
    }
  })

  test('T-4A-14: addonIds 配列を破壊しない', () => {
    const { mod, sc } = capableScenarios()[0]
    const addonIds = addonKeysOf(sc).slice(0, 2)
    if (addonIds.length === 0) return
    const before = [...addonIds]
    buildPrimaryNodeSnapshot(baseInput(mod, sc, { addonIds }))
    assert.deepEqual(addonIds, before, '引数の addonIds を破壊してはならない')
  })
})

// ═══════════════════════════════════════════════════════════════
// G. PRIMARY_NODE_ID（T-4A-15）
// ═══════════════════════════════════════════════════════════════

describe('G. PRIMARY_NODE_ID は secondary node id と衝突しない', () => {
  test('T-4A-15: PRIMARY_NODE_ID === "primary" であり secondary の node-* prefix と異なる', () => {
    assert.equal(PRIMARY_NODE_ID, 'primary')
    assert.equal(PRIMARY_NODE_ID.startsWith('node-'), false)
  })

  test('buildPrimaryNodeSnapshot は常に PRIMARY_NODE_ID を id に持つ（scenario 有無を問わず）', () => {
    const { mod, sc } = capableScenarios()[0]
    assert.equal(buildPrimaryNodeSnapshot(baseInput(mod, sc)).id, PRIMARY_NODE_ID)
    assert.equal(buildPrimaryNodeSnapshot(baseInput(mod, undefined)).id, PRIMARY_NODE_ID)
  })
})

// ═══════════════════════════════════════════════════════════════
// H. production runtime 未接続（T-4A-13 補助。behavior change 0 の構造的根拠）
// ═══════════════════════════════════════════════════════════════

describe('H. production runtime から未接続である（補助的保証）', () => {
  test('app/components/DashboardClient.tsx は buildPrimaryNodeSnapshot / PRIMARY_NODE_ID を import していない', () => {
    const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
    assert.ok(!/from ['"]\.\.\/\.\.\/lib\/primaryNode['"]/.test(src))
    assert.ok(!/buildPrimaryNodeSnapshot/.test(src))
    assert.ok(!/PRIMARY_NODE_ID/.test(src))
  })

  test('lib/primaryNode.ts は deriveNodeBlockCore を re-implement せず import している（ロジック複製の禁止）', () => {
    const src = readFileSync(new URL('../lib/primaryNode.ts', import.meta.url), 'utf-8')
    assert.ok(/import \{ deriveNodeBlockCore \} from '\.\/deriveNodeFields'/.test(src))
  })
})
