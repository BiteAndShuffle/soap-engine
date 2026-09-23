/**
 * addonInsertions.test.ts
 *
 * P 本文内部への inline addon 挿入（DP-22 / scenarios[].addonInsertions）の仕様固定テスト
 *
 * 確認する仕様:
 *   - inline addon は original scenario.P の行境界（afterLine）へ、keys 順（click 順ではない）で挿入される
 *   - inline で出力した addon は tail（通常 addon 出力）へ二重出力されない
 *   - inline addon 未選択時は何も挿入されず、P 本文がそのまま連続する
 *   - 複数 block は original 行列上の位置で挿入される（先行 block の挿入行数に影響されない）
 *   - tail addon は従来どおり click 順で P 本文の後・followup（P_CLOSING）の前に出る
 *   - addonInsertions を持たない既存 scenario は従来経路と同一出力（全 module non-regression）
 *   - moduleValidator の ADDON_INSERTION_REF_BROKEN / ADDON_INSERTION_INVALID
 *   - bridge parser（scripts/bridgeAddonGrammar.ts）の P_ADDON_INLINE 文法
 *
 * 実行:
 *   npx tsx --test tests/addonInsertions.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { buildNodeFields } from '../lib/buildSoap'
import { resolveDrugSubject } from '../lib/drugSubject'
import { validateModule } from '../lib/moduleValidator'
import type { ModuleData, Scenario, SoapFields, SoapKey } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { parseBridgeAddonRefs } from '../scripts/bridgeAddonGrammar'

import h1EyeData from '../data/modules/allergy_h1_antihistamine_eye_drops.json' assert { type: 'json' }

// ─────────────────────────────────────────────────────────────
// fixture: H1 点眼 initial を複製し、P を 4 行・inline block を持つ scenario にする
// （addon 本文は canonical の既存 addon をそのまま使う。本文の創作はしない）
// ─────────────────────────────────────────────────────────────

const TIP = 'addon_eye_drop_tip_contamination'
const EXPIRY = 'addon_eye_drop_after_opening_expiry'
const INTERVAL = 'addon_eye_drop_interval_5min'
const SHAKE = 'addon_eye_drop_suspension_shake'

function makeFixture(): { mod: ModuleData; sc: Scenario } {
  const mod = structuredClone(h1EyeData) as unknown as ModuleData
  const sc = mod.scenarios.find(s => s.id === 'initial')!
  sc.P = ['P1', 'P2', 'P3', 'P4'].join('\n')
  sc.addonInsertions = [
    { afterLine: 1, keys: [TIP, EXPIRY] },
    { afterLine: 3, keys: [INTERVAL] },
  ]
  return { mod, sc }
}

function pText(mod: ModuleData, key: string): string {
  const item = mod.addons!.items[key]
  return item.sectionTexts?.P ?? item.text
}

function closingOf(mod: ModuleData, sc: Scenario): string {
  return (mod.defaults!.followupProfiles![sc.followupRef!] as { P: string }).P
}

describe('buildNodeFields — inline addon insertion', () => {
  test('inline 未選択時は P 本文がそのまま連続する（followup のみ末尾）', () => {
    const { mod, sc } = makeFixture()
    const { fields } = buildNodeFields(sc, mod, [])
    assert.equal(fields.P, `P1\nP2\nP3\nP4\n${closingOf(mod, sc)}`)
  })

  test('inline addon は afterLine の位置へ keys 順で挿入される（click 順に依存しない）', () => {
    const { mod, sc } = makeFixture()
    const clickA = buildNodeFields(sc, mod, [EXPIRY, INTERVAL, TIP]).fields.P
    const clickB = buildNodeFields(sc, mod, [TIP, INTERVAL, EXPIRY]).fields.P
    const expected = [
      'P1', pText(mod, TIP), pText(mod, EXPIRY),
      'P2', 'P3', pText(mod, INTERVAL),
      'P4', closingOf(mod, sc),
    ].join('\n')
    assert.equal(clickA, expected)
    assert.equal(clickB, expected)
  })

  test('選択された inline key のみ挿入され、未選択 key の位置には何も入らない', () => {
    const { mod, sc } = makeFixture()
    const { fields } = buildNodeFields(sc, mod, [EXPIRY])
    assert.equal(fields.P, ['P1', pText(mod, EXPIRY), 'P2', 'P3', 'P4', closingOf(mod, sc)].join('\n'))
  })

  test('inline 出力した key は tail へ二重出力されない', () => {
    const { mod, sc } = makeFixture()
    const { fields } = buildNodeFields(sc, mod, [TIP, EXPIRY, INTERVAL])
    for (const key of [TIP, EXPIRY, INTERVAL]) {
      const text = pText(mod, key)
      assert.equal(fields.P.split(text).length - 1, 1, `${key} は 1 回だけ出力される`)
    }
  })

  test('tail addon は click 順で P 本文の後・followup の前に出る（従来挙動）', () => {
    const { mod, sc } = makeFixture()
    const { fields } = buildNodeFields(sc, mod, [SHAKE, TIP])
    assert.equal(
      fields.P,
      ['P1', pText(mod, TIP), 'P2', 'P3', 'P4', pText(mod, SHAKE), closingOf(mod, sc)].join('\n'),
    )
  })
})

// ─────────────────────────────────────────────────────────────
// 既存 module non-regression: addonInsertions を持たない scenario は従来経路と同一出力
// （oracle = DP-22 導入前の buildNodeFields の fields 組み立て）
// ─────────────────────────────────────────────────────────────

function legacyNodeFields(scenario: Scenario, mod: ModuleData, addonIds: string[], drugName: string): SoapFields {
  const r: SoapFields = { S: scenario.S ?? '', O: scenario.O ?? '', A: scenario.A ?? '', P: scenario.P ?? '' }
  const followup = (key: 'S' | 'P'): string | null | undefined => {
    if (scenario.followupRef) {
      const profile = mod.defaults?.followupProfiles?.[scenario.followupRef] as Record<string, string | null> | undefined
      return profile?.[key]
    }
    return scenario.followup?.[key] === 'default'
      ? (mod.defaults?.followup as Record<string, string> | undefined)?.[key]
      : undefined
  }
  const append = (k: SoapKey, t: string | null | undefined) => {
    if (t) r[k] = r[k] ? `${r[k]}\n${t}` : t
  }
  append('S', followup('S'))
  if (mod.addons && addonIds.length > 0) {
    const sectionMap = new Map<SoapKey, string[]>()
    for (const key of addonIds) {
      const item = mod.addons.items[key]
      if (!item) continue
      const pairs: Array<[SoapKey, string | undefined]> = item.sectionTexts
        ? (['S', 'A', 'P'] as const).map(sec => [sec, item.sectionTexts![sec]])
        : [[item.targetSection, item.text]]
      for (const [sec, t] of pairs) {
        if (!t && item.sectionTexts) continue
        if (!sectionMap.has(sec)) sectionMap.set(sec, [])
        sectionMap.get(sec)!.push(t as string)
      }
    }
    for (const [sec, texts] of sectionMap) append(sec, texts.join('\n'))
  }
  append('P', followup('P'))
  return resolveDrugSubject(r, drugName)
}

describe('既存 module non-regression（addonInsertions absent は従来経路）', () => {
  test('現行 canonical の全 scenario は addonInsertions を持たない（bridge に P_ADDON_INLINE がない）', () => {
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios) {
        assert.equal(sc.addonInsertions, undefined, `${mod.moduleId}/${sc.id}`)
      }
    }
  })

  test('全 module × 全 scenario × {未選択 / addonsRef.P 順 / 逆順} で従来出力と一致', () => {
    let cases = 0
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios) {
        const ref = sc.addonsRef?.P ?? []
        for (const ids of [[], ref, [...ref].reverse()]) {
          const actual = buildNodeFields(sc, mod, ids, 'DRUG').fields
          assert.deepEqual(actual, legacyNodeFields(sc, mod, ids, 'DRUG'), `${mod.moduleId}/${sc.id}`)
          cases++
        }
      }
    }
    assert.ok(cases > 0)
  })
})

// ─────────────────────────────────────────────────────────────
// moduleValidator
// ─────────────────────────────────────────────────────────────

function insertionCodes(mod: ModuleData): string[] {
  return validateModule(mod).errors
    .filter(e => e.code.startsWith('ADDON_INSERTION_'))
    .map(e => e.code)
}

describe('moduleValidator — addonInsertions', () => {
  test('現行 35 module は ADDON_INSERTION_* を出さない', () => {
    for (const mod of ALL_MODULES) assert.deepEqual(insertionCodes(mod), [], mod.moduleId)
  })

  test('正しい fixture は ADDON_INSERTION_* を出さない', () => {
    assert.deepEqual(insertionCodes(makeFixture().mod), [])
  })

  test('key が addonsRef.P / addons.items に存在しない → ADDON_INSERTION_REF_BROKEN', () => {
    const { mod, sc } = makeFixture()
    sc.addonsRef = { P: sc.addonsRef!.P!.filter(k => k !== TIP) }
    sc.addonInsertions![1].keys.push('addon_does_not_exist')
    assert.deepEqual(insertionCodes(mod), ['ADDON_INSERTION_REF_BROKEN', 'ADDON_INSERTION_REF_BROKEN', 'ADDON_INSERTION_REF_BROKEN'])
  })

  const invalidCases: Array<[string, (sc: Scenario) => void]> = [
    ['P 先頭（afterLine=0）', sc => { sc.addonInsertions![0].afterLine = 0 }],
    ['P 末尾（afterLine=P 行数）', sc => { sc.addonInsertions![1].afterLine = 4 }],
    ['非整数', sc => { sc.addonInsertions![0].afterLine = 1.5 }],
    ['strictly increasing 違反', sc => { sc.addonInsertions![1].afterLine = 1 }],
    ['空 keys', sc => { sc.addonInsertions![1].keys = [] }],
    ['空配列', sc => { sc.addonInsertions = [] }],
    ['block 内重複', sc => { sc.addonInsertions![0].keys.push(TIP) }],
    ['block 間重複', sc => { sc.addonInsertions![1].keys.push(TIP) }],
  ]
  for (const [name, mutate] of invalidCases) {
    test(`${name} → ADDON_INSERTION_INVALID`, () => {
      const { mod, sc } = makeFixture()
      mutate(sc)
      assert.ok(insertionCodes(mod).includes('ADDON_INSERTION_INVALID'), name)
    })
  }

  test('S / A テキストを持つ addon の inline 挿入 → ADDON_INSERTION_INVALID', () => {
    const { mod } = makeFixture()
    mod.addons!.items[TIP] = { ...mod.addons!.items[TIP], sectionTexts: { S: 'S', P: pText(mod, TIP) } }
    assert.ok(insertionCodes(mod).includes('ADDON_INSERTION_INVALID'))
  })
})

// ─────────────────────────────────────────────────────────────
// bridge parser（P_ADDON_INLINE 文法）
// ─────────────────────────────────────────────────────────────

function bridgeScenario(pBody: string[], tail: string[] = []): string {
  return [
    '【SCENARIO｜type=treatment_start｜id=t1｜title=テスト】',
    'S', 's', 'O', 'o', 'A', 'a',
    'P', ...pBody,
    ...(tail.length > 0 ? ['P_ADDON', ...tail.map(k => `- ${k}`)] : []),
    'P_CLOSING', 'c', '', '',
  ].join('\n')
}

describe('bridge parser — P_ADDON_INLINE', () => {
  test('marker 位置を afterLine に、list を keys に変換し、refs は出現順', () => {
    const parsed = parseBridgeAddonRefs(bridgeScenario(
      ['p1', 'p2', 'P_ADDON_INLINE', '- addon_a', '- addon_b', 'p3', 'P_ADDON_INLINE', '- addon_c', 'p4'],
      ['addon_d'],
    )).get('t1')!
    assert.deepEqual(parsed.insertions, [
      { afterLine: 2, keys: ['addon_a', 'addon_b'] },
      { afterLine: 3, keys: ['addon_c'] },
    ])
    assert.deepEqual(parsed.refs, ['addon_a', 'addon_b', 'addon_c', 'addon_d'])
    assert.deepEqual(parsed.errors, [])
  })

  test('P 本文中の空行は本文行として数える（global には禁止しない）', () => {
    const parsed = parseBridgeAddonRefs(bridgeScenario(['p1', '', 'p2', 'P_ADDON_INLINE', '- addon_a', 'p3'])).get('t1')!
    assert.deepEqual(parsed.insertions, [{ afterLine: 3, keys: ['addon_a'] }])
    assert.deepEqual(parsed.errors, [])
  })

  const errorCases: Array<[string, string[], string[]]> = [
    ['list 行と P 本文の曖昧さ', ['p1', 'P_ADDON_INLINE', '- addon_a は説明文', 'p2'], []],
    ['P 先頭', ['P_ADDON_INLINE', '- addon_a', 'p1'], []],
    ['P 末尾', ['p1', 'P_ADDON_INLINE', '- addon_a'], []],
    ['連続 block', ['p1', 'P_ADDON_INLINE', '- addon_a', 'P_ADDON_INLINE', '- addon_b', 'p2'], []],
    ['空 list', ['p1', 'P_ADDON_INLINE', 'p2'], []],
    ['inline 内重複', ['p1', 'P_ADDON_INLINE', '- addon_a', '- addon_a', 'p2'], []],
    ['P_ADDON との二重記載', ['p1', 'P_ADDON_INLINE', '- addon_a', 'p2'], ['addon_a']],
  ]
  for (const [name, pBody, tail] of errorCases) {
    test(`${name} → 局所的文法エラー`, () => {
      const parsed = parseBridgeAddonRefs(bridgeScenario(pBody, tail)).get('t1')!
      assert.ok(parsed.errors.length > 0, name)
    })
  }

  test('P セクション外の P_ADDON_INLINE → 局所的文法エラー', () => {
    const text = bridgeScenario(['p1', 'p2'], ['addon_d']).replace('P_CLOSING', 'P_ADDON_INLINE\n- addon_x\nP_CLOSING')
    assert.ok(parseBridgeAddonRefs(text).get('t1')!.errors.length > 0)
  })

  test('既存 bridge はすべて inline block・文法エラーなし（addonsRef.P との一致は audit A / B が担う）', () => {
    const dir = path.resolve(__dirname, '..', 'bridges')
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      for (const [id, s] of parseBridgeAddonRefs(fs.readFileSync(path.join(dir, file), 'utf-8'))) {
        assert.deepEqual(s.insertions, [], `${file}/${id}`)
        assert.deepEqual(s.errors, [], `${file}/${id}`)
      }
    }
  })
})
