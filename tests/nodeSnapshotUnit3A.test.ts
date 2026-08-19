/**
 * nodeSnapshotUnit3A.test.ts — Rapid Mode v2 / Unit 3A 契約テスト
 *
 * Unit 3A（Node deterministic snapshot derive boundary）で、secondary Node の
 * 既存 2 経路（buildUpdatedNode / handleAddonToggle の node ブランチ）を
 * lib/deriveNodeFields.ts の deriveNodeBlockCore() へ収束させた。
 *
 * 本ファイルは Unit 3A が守る契約を検証する:
 *   1. parity — 旧経路（buildNodeFields + derivePersonaGuard + scenario から直接組み立てた
 *      block メタデータ）と新 helper（deriveNodeBlockCore）が、NodeBlockCore の 8 フィールド
 *      全体で deepStrictEqual に一致する（behavior change = 0）
 *   2. deriveRawFields との同値 — body factoring（withRapidFirstSentence）が
 *      deriveRawFields を壊していないこと
 *   3. D-2 invariant — non-null RapidState を production helper（deriveNodeBlockCore）へ
 *      直接投入し、rawFields → persona → SOAP（mergeBlocks）まで Rapid の情報が
 *      失われず到達することを実際の値で確認する（source regex を主要保証にしない）
 *   4. Persona Scope Boundary — persona identity が Node 側の型に混入していないこと、
 *      deriveNodeBlockCore が persona を materialize しないこと（source contract）
 *
 * RAPID-V2-20:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   deriveNodeBlockCore の non-null RapidState 挙動テスト（D. 節）は、
 *   test 側で Rapid 先頭文生成ロジックを複製せず、buildResolvedSFirstSentence /
 *   firstSentenceOf を production からそのまま import して検証する。
 *
 * 実行:
 *   npx tsx --test tests/nodeSnapshotUnit3A.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, SoapKey, MergedBlock } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'
import { deriveRawFields, deriveNodeBlockCore, type NodeBlockCore } from '../lib/deriveNodeFields'
import { derivePersonaGuard } from '../lib/personaGuard'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import type { RapidState } from '../lib/rapidState'
import {
  type SRelation,
  type SCondition,
  buildResolvedSFirstSentence,
  firstSentenceOf,
} from '../lib/rapidSentence'

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

/** scenario.addonsRef を配列へ正規化する（array 形式 / object 形式の両方に対応） */
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

/** 旧 secondary Node 生成経路（buildUpdatedNode / handleAddonToggle node ブランチが
 *  Unit 3A 以前に行っていた組み立て）を独立に再現する oracle。
 *  deriveNodeBlockCore の実装をコピーしたものではなく、buildNodeFields /
 *  derivePersonaGuard という既存 production helper の戻り値をそのまま並べるだけ。 */
function oldPathNodeBlockCore(sc: Scenario, mod: ModuleData, addonIds: string[], drugName: string): NodeBlockCore {
  const { fields: rawFields, closingText, groupKey, clinicalDomain, closingBehavior } =
    buildNodeFields(sc, mod, addonIds, drugName)
  const guard = derivePersonaGuard(sc, mod.template?.urgentFlag)
  return {
    templateLabel: sc.title,
    rawFields,
    guard,
    symptomCodes: sc.sComposition?.symptomCodes,
    closingText,
    closingBehavior,
    groupKey,
    clinicalDomain,
  }
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const sec of SECTIONS) {
    assert.equal(a[sec], b[sec], `${msg} [${sec}]`)
  }
}

// ═══════════════════════════════════════════════════════════════
// A. parity — 旧経路と deriveNodeBlockCore の Node snapshot 全体比較
// ═══════════════════════════════════════════════════════════════

describe('A. deriveNodeBlockCore は旧 secondary Node 経路と 8 フィールド全体で一致する', () => {
  test('T-3A-1: 全モジュール × 全 scenario × addon なし（rapid=null）', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const actual = deriveNodeBlockCore(sc, mod, [], null, DRUG)
      const expected = oldPathNodeBlockCore(sc, mod, [], DRUG)
      assert.deepEqual(
        actual, expected,
        `mismatch: module=${mod.moduleId} scenario=${sc.id}`,
      )
      checked++
    }
    assert.ok(checked > 0, 'scenario が 1 件も見つからなかった')
  })

  test('T-3A-2: addon あり（各 scenario の addon キーを最大 2 件選択）でも一致する', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const addonIds = addonKeysOf(sc).slice(0, 2)
      if (addonIds.length === 0) continue
      const actual = deriveNodeBlockCore(sc, mod, addonIds, null, DRUG)
      const expected = oldPathNodeBlockCore(sc, mod, addonIds, DRUG)
      assert.deepEqual(
        actual, expected,
        `mismatch: module=${mod.moduleId} scenario=${sc.id} addonIds=${addonIds.join(',')}`,
      )
      checked++
    }
    assert.ok(checked > 0, 'addon を持つ scenario が 1 件も見つからなかった')
  })
})

// ═══════════════════════════════════════════════════════════════
// B. deriveRawFields との同値（body factoring の回帰固定）
// ═══════════════════════════════════════════════════════════════

describe('B. deriveRawFields と deriveNodeBlockCore.rawFields は常に同値である', () => {
  test('T-3A-3: capable scenario × rapid ∈ {null, 非 null 数種} で byte 一致', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const rapids: RapidState[] = [null, ...SAMPLE_RAPID_STATES.slice(0, 3)]
      for (const rapid of rapids) {
        const fromRawFields = deriveRawFields(sc, mod, [], rapid, DRUG)
        const fromBlockCore = deriveNodeBlockCore(sc, mod, [], rapid, DRUG).rawFields
        assertFieldsEqual(
          fromRawFields, fromBlockCore,
          `mismatch: module=${mod.moduleId} scenario=${sc.id} rapid=${JSON.stringify(rapid)}`,
        )
        checked++
      }
    }
    assert.ok(checked > 0, 'capable scenario が 1 件も見つからなかった')
  })
})

// ═══════════════════════════════════════════════════════════════
// C. 差分リスクの固定
// ═══════════════════════════════════════════════════════════════

describe('C. 差分リスクの固定', () => {
  const src = readFileSync(new URL('../lib/deriveNodeFields.ts', import.meta.url), 'utf-8')

  test('T-3A-4: deriveNodeBlockCore の body は buildNodeFields を 1 回だけ呼ぶ（A-2 の条件。補助的保証）', () => {
    const start = src.indexOf('export function deriveNodeBlockCore')
    assert.notEqual(start, -1, 'deriveNodeBlockCore の定義が見つからない')
    const body = src.slice(start)
    const matches = body.match(/buildNodeFields\(/g) ?? []
    assert.equal(matches.length, 1, `buildNodeFields の呼び出しは 1 回のみであるべき（実測: ${matches.length} 回）`)
  })

  test('T-3A-5: ADDON トグルで templateLabel / symptomCodes が変化しないことを実測する', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const addonKeys = addonKeysOf(sc)
      if (addonKeys.length === 0) continue
      const before = deriveNodeBlockCore(sc, mod, [], null, DRUG)
      const after = deriveNodeBlockCore(sc, mod, [addonKeys[0]], null, DRUG)
      assert.equal(
        before.templateLabel, after.templateLabel,
        `templateLabel mismatch: module=${mod.moduleId} scenario=${sc.id}`,
      )
      assert.deepEqual(
        before.symptomCodes, after.symptomCodes,
        `symptomCodes mismatch: module=${mod.moduleId} scenario=${sc.id}`,
      )
      checked++
    }
    assert.ok(checked > 0, 'addon を持つ scenario が 1 件も見つからなかった')
  })
})

// ═══════════════════════════════════════════════════════════════
// D. D-2 invariant — non-null RapidState の実挙動固定
//    production helper（deriveNodeBlockCore）へ直接投入する。mirror 実装は作らない。
// ═══════════════════════════════════════════════════════════════

describe('D. non-null RapidState が deriveNodeBlockCore → SOAP まで反映される', () => {
  test('T-3A-6: derive 到達 — rawFields.S の先頭文が Rapid 解決文と一致する', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 40)) {
      for (const rapid of SAMPLE_RAPID_STATES.slice(0, 4)) {
        const core = deriveNodeBlockCore(sc, mod, [], rapid, DRUG)
        const expectedFirst = buildResolvedSFirstSentence(
          rapid!.previousEvent, rapid!.currentOutcome, DRUG, mod.display?.adjustmentExpression,
        )
        assert.equal(
          firstSentenceOf(core.rawFields.S), firstSentenceOf(expectedFirst),
          `S 先頭文が Rapid 解決文と一致しない: module=${mod.moduleId} scenario=${sc.id}`,
        )
        checked++
      }
    }
    assert.ok(checked > 0, 'capable scenario が 1 件も見つからなかった')
  })

  test('T-3A-7: ADDON 共存 — Rapid 適用後も ADDON 由来の残余本文が保持される', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const addonKeys = addonKeysOf(sc).slice(0, 1)
      if (addonKeys.length === 0) continue
      const rapid = SAMPLE_RAPID_STATES[0]
      const nullCore  = deriveNodeBlockCore(sc, mod, addonKeys, null,  DRUG)
      const rapidCore = deriveNodeBlockCore(sc, mod, addonKeys, rapid, DRUG)
      const nullRest  = nullCore.rawFields.S.slice(firstSentenceOf(nullCore.rawFields.S).length)
      const rapidRest = rapidCore.rawFields.S.slice(firstSentenceOf(rapidCore.rawFields.S).length)
      assert.equal(
        nullRest, rapidRest,
        `ADDON 由来の残余本文が Rapid 適用で変化した: module=${mod.moduleId} scenario=${sc.id}`,
      )
      checked++
    }
    assert.ok(checked > 0, 'addon を持つ capable scenario が 1 件も見つからなかった')
  })

  test('T-3A-9: SOAP 到達 — mergeBlocks を通しても Rapid の有無で S が異なる', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 20)) {
      const rapid = SAMPLE_RAPID_STATES[0]
      const coreNull  = deriveNodeBlockCore(sc, mod, [], null,  DRUG)
      const coreRapid = deriveNodeBlockCore(sc, mod, [], rapid, DRUG)

      const blockNull:  MergedBlock = { id: 'n', ...coreNull,  fields: coreNull.rawFields,  domain: 'x' }
      const blockRapid: MergedBlock = { id: 'r', ...coreRapid, fields: coreRapid.rawFields, domain: 'x' }

      const soapNull  = mergeBlocks([blockNull],  { S: '', O: '', A: '', P: '' }, '', undefined)
      const soapRapid = mergeBlocks([blockRapid], { S: '', O: '', A: '', P: '' }, '', undefined)

      assert.notEqual(
        soapNull.S, soapRapid.S,
        `mergeBlocks 後も S が異なるべき: module=${mod.moduleId} scenario=${sc.id}`,
      )
      checked++
    }
    assert.ok(checked > 0, 'capable scenario が 1 件も見つからなかった')
  })
})

// ═══════════════════════════════════════════════════════════════
// E. Persona Scope Boundary（architecture のみ。文体品質・変換内容は評価対象外）
// ═══════════════════════════════════════════════════════════════

describe('E. Persona Scope Boundary', () => {
  const src = readFileSync(new URL('../lib/deriveNodeFields.ts', import.meta.url), 'utf-8')

  /**
   * コメントを除いた実装本体だけを取り出す。
   * 「applyPersonaToFieldsWithGuard を呼ばない」という契約を説明する JSDoc 自身が
   * その語を含むため、コードとして本当に呼び出しているかは非コメント領域で見る。
   */
  const codeOnly = src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // ブロックコメント
    .replace(/^[ \t]*\/\/.*$/gm, '')    // 行コメント

  test('T-3A-8a: NodeBlockCore に persona identity（personaEnabled / selectedPersona）が混入していない', () => {
    const start = codeOnly.indexOf('export type NodeBlockCore')
    const end = codeOnly.indexOf('_NodeBlockCoreFitsMergedBlock')
    assert.ok(start !== -1 && end !== -1 && end > start, 'NodeBlockCore 型定義の抽出に失敗した')
    const typeRegion = codeOnly.slice(start, end)
    assert.ok(
      !/personaEnabled|selectedPersona/.test(typeRegion),
      'NodeBlockCore は persona identity（personaEnabled / selectedPersona）を持ってはならない',
    )
  })

  test('T-3A-8b: deriveNodeBlockCore は persona を二重 materialize しない（applyPersonaToFieldsWithGuard を呼ばない）', () => {
    assert.ok(
      !/applyPersonaToFieldsWithGuard/.test(codeOnly),
      'lib/deriveNodeFields.ts は persona 適用済みの値を返してはならない。' +
      'raw → persona の一方向境界は呼び出し側（DashboardClient）が保持する',
    )
  })

  test('T-3A-8c: persona 通過 — Rapid の差分は persona 適用後も保存される（差分保存のみ。文面の golden 化はしない）', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 10)) {
      const rapid = SAMPLE_RAPID_STATES[0]
      const coreRapid = deriveNodeBlockCore(sc, mod, [], rapid, DRUG)
      const coreNull  = deriveNodeBlockCore(sc, mod, [], null,  DRUG)
      for (const p of PERSONA_IDS) {
        const sRapid = applyPersonaToFieldsWithGuard(coreRapid.rawFields, true, p, coreRapid.guard).S
        const sNull  = applyPersonaToFieldsWithGuard(coreNull.rawFields,  true, p, coreNull.guard).S
        assert.notEqual(
          sRapid, sNull,
          `persona=${p} 適用後も Rapid の差分が保存されるべき: module=${mod.moduleId} scenario=${sc.id}`,
        )
      }
      checked++
    }
    assert.ok(checked > 0, 'capable scenario が 1 件も見つからなかった')
  })
})

// ═══════════════════════════════════════════════════════════════
// F. determinism / 引数破壊なし
// ═══════════════════════════════════════════════════════════════

describe('F. deriveNodeBlockCore は deterministic かつ引数を破壊しない', () => {
  test('同じ入力に対し常に deepStrictEqual な出力を返す', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 10)) {
      const addonIds = addonKeysOf(sc).slice(0, 2)
      const rapid = SAMPLE_RAPID_STATES[0]
      const a = deriveNodeBlockCore(sc, mod, addonIds, rapid, DRUG)
      const b = deriveNodeBlockCore(sc, mod, addonIds, rapid, DRUG)
      assert.deepEqual(a, b)
    }
  })

  test('addonIds 配列を破壊しない', () => {
    const { mod, sc } = capableScenarios()[0]
    const addonIds = addonKeysOf(sc).slice(0, 2)
    if (addonIds.length === 0) return
    const before = [...addonIds]
    deriveNodeBlockCore(sc, mod, addonIds, SAMPLE_RAPID_STATES[0], DRUG)
    assert.deepEqual(addonIds, before, '引数の addonIds を破壊してはならない')
  })
})
