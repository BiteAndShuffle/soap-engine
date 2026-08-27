/**
 * deriveNodeFields.test.ts — Rapid Mode v2 / Unit 2A 契約テスト
 *
 * 守る契約:
 *   - deriveRawFields は scenario + ADDON + Rapid から deterministic に raw fields を導出する
 *   - rapid === null のとき buildNodeFields の出力と完全一致する（既存 derive の保存）
 *   - rapid 非 null のとき **S のみ**変化し、O / A / P は不変
 *   - Rapid 適用が ADDON 本文を破壊しない
 *   - persona / localInput を含まない（責務境界）
 *
 * RAPID-V2-20:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   本ファイルは lib/deriveNodeFields.ts / lib/buildSoap.ts / lib/rapidSentence.ts /
 *   lib/isSReplacementEligible.ts と data/modules/index.ts のみを oracle に使う。
 *
 * 実行:
 *   npx tsx --test tests/deriveNodeFields.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, SoapKey } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields } from '../lib/buildSoap'
import { deriveRawFields } from '../lib/deriveNodeFields'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import type { RapidState } from '../lib/rapidState'
import {
  type SRelation,
  type SCondition,
  buildResolvedSFirstSentence,
  S_RELATION_LABELS,
  S_CONDITION_LABELS,
} from '../lib/rapidSentence'

const SECTIONS: SoapKey[] = ['S', 'O', 'A', 'P']
const DRUG = '本剤'

const RELATIONS: SRelation[] = [
  'new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do',
]
const CONDITIONS: SCondition[] = ['stable', 'improved', 'unchanged', 'not_improved']

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

/** Rapid 適用対象となる capable scenario を module 付きで列挙する */
function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      if (isScenarioSReplacementCapable(sc)) out.push({ mod, sc })
    }
  }
  return out
}

/**
 * U-CR1: corpus を 1 度だけ materialize する。loop-completeness は
 * checked === CAPABLE_SCENARIOS.length（× 組合せ数）で検証し、
 * exact な corpus snapshot（旧 170）は仕様値として使用しない。
 */
const CAPABLE_SCENARIOS = capableScenarios()
const RAPID_COMBOS = RELATIONS.length * CONDITIONS.length

/**
 * U-CR1: test 側 RELATIONS / CONDITIONS が runtime authority
 * （S_RELATION_LABELS / S_CONDITION_LABELS）の全値を網羅していることを保証する。
 */
function assertRapidAxesCoverProduction(): void {
  assert.deepEqual(
    [...RELATIONS].sort(), Object.keys(S_RELATION_LABELS).sort(),
    'RELATIONS が production の SRelation 全値（S_RELATION_LABELS）を網羅していない',
  )
  assert.deepEqual(
    [...CONDITIONS].sort(), Object.keys(S_CONDITION_LABELS).sort(),
    'CONDITIONS が production の SCondition 全値（S_CONDITION_LABELS）を網羅していない',
  )
}

/**
 * capable scenario × ADDON 逐次追加（prefix）の全組合せを列挙する。
 * 現行 primary の増分 ADDON 経路が辿る状態列と同じ粒度をカバーする。
 */
function addonPrefixCases(maxAddons = 3): Array<{
  mod: ModuleData; sc: Scenario; addonIds: string[]
}> {
  const out: Array<{ mod: ModuleData; sc: Scenario; addonIds: string[] }> = []
  for (const { mod, sc } of capableScenarios()) {
    const keys = addonKeysOf(sc).slice(0, maxAddons)
    const active: string[] = []
    for (const k of keys) {
      active.push(k)
      out.push({ mod, sc, addonIds: [...active] })
    }
  }
  return out
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const sec of SECTIONS) {
    assert.equal(a[sec], b[sec], `${msg} [${sec}]`)
  }
}

// ═══════════════════════════════════════════════════════════════
// A. rapid = null → buildNodeFields と完全一致
// ═══════════════════════════════════════════════════════════════

describe('A. rapid === null は buildNodeFields の出力を変更しない', () => {
  test('全 capable scenario（ADDON なし）で buildNodeFields と byte 一致', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const expected = buildNodeFields(sc, mod, [], DRUG).fields
      const actual = deriveRawFields(sc, mod, [], null, DRUG)
      assertFieldsEqual(actual, expected, `${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(CAPABLE_SCENARIOS.length > 0, 'capable scenario が corpus に 1 件も無い（test が空振り）')
    const moduleWithoutCapable = ALL_MODULES
      .filter(mod => !(mod.scenarios ?? []).some(isScenarioSReplacementCapable))
      .map(mod => mod.moduleId)
    assert.deepEqual(
      moduleWithoutCapable, [],
      `Rapid-capable scenario を 1 件も持たない module がある: ${moduleWithoutCapable.join(', ')}`,
    )
    assert.equal(
      checked, CAPABLE_SCENARIOS.length,
      `検証件数が capable scenario の corpus 導出値と一致しない（実際: ${checked}）`,
    )
  })

  test('drugName 省略時も buildNodeFields の既定挙動と一致する', () => {
    for (const { mod, sc } of capableScenarios()) {
      const expected = buildNodeFields(sc, mod, []).fields
      const actual = deriveRawFields(sc, mod, [], null)
      assertFieldsEqual(actual, expected, `${mod.moduleId}/${sc.id}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// C. ADDON 組合せ coverage（≥389 comparison）
// ═══════════════════════════════════════════════════════════════

describe('C. ADDON 逐次追加の全組合せで buildNodeFields と一致する', () => {
  test('389 件以上の (scenario × ADDON prefix) 比較が byte 一致', () => {
    const cases = addonPrefixCases()
    assert.ok(
      cases.length >= 389,
      `比較件数は 389 以上であること（実際: ${cases.length}）`,
    )
    for (const { mod, sc, addonIds } of cases) {
      const expected = buildNodeFields(sc, mod, addonIds, DRUG).fields
      const actual = deriveRawFields(sc, mod, addonIds, null, DRUG)
      assertFieldsEqual(
        actual, expected,
        `${mod.moduleId}/${sc.id} addons=[${addonIds.join(',')}]`,
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// B. rapid 非 null → S のみ変化・O/A/P 不変
// ═══════════════════════════════════════════════════════════════

describe('B. rapid 非 null では S 先頭文のみが変化する', () => {
  test('全 capable scenario × 20 組合せで O / A / P が不変', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const base = buildNodeFields(sc, mod, [], DRUG).fields
      for (const previousEvent of RELATIONS) {
        for (const currentOutcome of CONDITIONS) {
          const rapid: RapidState = { previousEvent, currentOutcome }
          const derived = deriveRawFields(sc, mod, [], rapid, DRUG)

          for (const sec of ['O', 'A', 'P'] as const) {
            assert.equal(
              derived[sec], base[sec],
              `${mod.moduleId}/${sc.id}: Rapid は ${sec} を変更してはならない`,
            )
          }
          assert.notEqual(
            derived.S, base.S,
            `${mod.moduleId}/${sc.id}: Rapid 適用で S が変化するはず`,
          )
          checked++
        }
      }
    }
    assertRapidAxesCoverProduction()
    assert.equal(
      checked, CAPABLE_SCENARIOS.length * RAPID_COMBOS,
      `検証した組合せ数が corpus 期待値と一致しない（実際: ${checked}）`,
    )
  })

  test('S の先頭文は buildResolvedSFirstSentence の出力と一致する', () => {
    for (const { mod, sc } of capableScenarios()) {
      for (const previousEvent of RELATIONS) {
        for (const currentOutcome of CONDITIONS) {
          const derived = deriveRawFields(
            sc, mod, [], { previousEvent, currentOutcome }, DRUG,
          )
          const expectedFirst = buildResolvedSFirstSentence(
            previousEvent, currentOutcome, DRUG, mod.display?.adjustmentExpression,
          )
          assert.ok(
            derived.S.startsWith(expectedFirst),
            `${mod.moduleId}/${sc.id} (${previousEvent}/${currentOutcome}): ` +
            '先頭文が production の生成結果と一致しない',
          )
        }
      }
    }
  })

  test('シナリオ固有の観察文（先頭文の残余）が保持される', () => {
    for (const { mod, sc } of capableScenarios()) {
      const base = buildNodeFields(sc, mod, [], DRUG).fields
      const dot = base.S.indexOf('。')
      assert.notEqual(dot, -1, `${mod.moduleId}/${sc.id}: 前提として S に「。」がある`)
      const rest = base.S.slice(dot + 1).replace(/^[\n\r\s]+/, '')
      assert.notEqual(rest, '', `${mod.moduleId}/${sc.id}: 前提として残余がある`)

      const derived = deriveRawFields(
        sc, mod, [], { previousEvent: 'new_addition', currentOutcome: 'stable' }, DRUG,
      )
      assert.ok(
        derived.S.endsWith(rest),
        `${mod.moduleId}/${sc.id}: Rapid 適用後も観察文が保持されること`,
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// D. 複数 ADDON の順序・本文
// ═══════════════════════════════════════════════════════════════

describe('D. 複数 ADDON でも順序・本文が buildNodeFields と一致する', () => {
  test('ADDON を 2 件以上持つ capable scenario で全 prefix が一致', () => {
    let multi = 0
    for (const { mod, sc, addonIds } of addonPrefixCases()) {
      if (addonIds.length < 2) continue
      const expected = buildNodeFields(sc, mod, addonIds, DRUG).fields
      const actual = deriveRawFields(sc, mod, addonIds, null, DRUG)
      assertFieldsEqual(
        actual, expected,
        `${mod.moduleId}/${sc.id} addons=[${addonIds.join(',')}]`,
      )
      multi++
    }
    assert.ok(multi > 0, `複数 ADDON ケースが存在すること（実際: ${multi}）`)
  })

  test('addonIds の配列順が本文の並び順に反映される', () => {
    // 2 件以上の ADDON が同一セクションへ落ちる scenario を探して順序を比較する
    let verified = 0
    for (const { mod, sc } of capableScenarios()) {
      const keys = addonKeysOf(sc)
      if (keys.length < 2) continue
      const [a, b] = keys
      const ab = deriveRawFields(sc, mod, [a, b], null, DRUG)
      const ba = deriveRawFields(sc, mod, [b, a], null, DRUG)
      // 同一セクションへ落ちる場合のみ順序差が観測できる
      if (SECTIONS.some(s => ab[s] !== ba[s])) verified++
    }
    assert.ok(
      verified > 0,
      'addonIds の順序が本文順へ反映されるケースが少なくとも 1 件存在すること',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// E. Rapid + ADDON の共存
// ═══════════════════════════════════════════════════════════════

describe('E. Rapid 適用は ADDON 本文を破壊しない', () => {
  test('S 欄へ書き込む ADDON を持つ場合、Rapid 適用後も ADDON 本文が残る', () => {
    let tested = 0
    for (const mod of ALL_MODULES) {
      const items = mod.addons?.items ?? {}
      const sKeys = Object.keys(items).filter(
        k => items[k].sectionTexts?.S || (items[k].targetSection === 'S' && items[k].text),
      )
      if (sKeys.length === 0) continue

      for (const sc of mod.scenarios ?? []) {
        if (!isScenarioSReplacementCapable(sc)) continue
        const withAddon = deriveRawFields(sc, mod, [sKeys[0]], null, DRUG)
        const pristine = deriveRawFields(sc, mod, [], null, DRUG)
        if (withAddon.S === pristine.S) continue  // この scenario では S へ落ちない

        // ADDON が S へ付加した差分（先頭文より後ろ）
        const addonTail = withAddon.S.slice(pristine.S.length)
        assert.notEqual(addonTail, '', '前提: ADDON が S 末尾へ付加されている')

        const withRapid = deriveRawFields(
          sc, mod, [sKeys[0]], { previousEvent: 'new_addition', currentOutcome: 'stable' }, DRUG,
        )
        assert.ok(
          withRapid.S.endsWith(addonTail),
          `${mod.moduleId}/${sc.id}: Rapid 適用後も ADDON 本文が保持されること`,
        )
        // ADDON は S 以外にも書き込むため、Rapid で O/A/P が変わらないことも確認する
        for (const sec of ['O', 'A', 'P'] as const) {
          assert.equal(
            withRapid[sec], withAddon[sec],
            `${mod.moduleId}/${sc.id}: Rapid は ${sec} を変更してはならない`,
          )
        }
        tested++
      }
    }
    assert.ok(tested >= 100, `S 欄 ADDON ケースを検証すること（実際: ${tested}）`)
  })
})

// ═══════════════════════════════════════════════════════════════
// F. determinism
// ═══════════════════════════════════════════════════════════════

describe('F. deterministic — 同じ入力は常に byte-identical な出力になる', () => {
  test('rapid = null / 非 null の双方で反復呼び出しが一致する', () => {
    let checked = 0
    for (const { mod, sc, addonIds } of addonPrefixCases()) {
      for (const rapid of [
        null,
        { previousEvent: 'dose_increased', currentOutcome: 'improved' },
      ] as RapidState[]) {
        const first  = deriveRawFields(sc, mod, addonIds, rapid, DRUG)
        const second = deriveRawFields(sc, mod, addonIds, rapid, DRUG)
        assertFieldsEqual(first, second, `${mod.moduleId}/${sc.id} 反復呼び出し`)
        checked++
      }
    }
    assert.ok(checked >= 778, `反復検証件数（実際: ${checked}）`)
  })

  test('入力配列を共有しても出力が汚染されない（呼び出し順非依存）', () => {
    const cases = addonPrefixCases().slice(0, 50)
    const forward = cases.map(c => deriveRawFields(c.sc, c.mod, c.addonIds, null, DRUG))
    const backward = [...cases].reverse()
      .map(c => deriveRawFields(c.sc, c.mod, c.addonIds, null, DRUG))
      .reverse()
    for (let i = 0; i < cases.length; i++) {
      assertFieldsEqual(forward[i], backward[i], `case ${i} 呼び出し順非依存`)
    }
  })

  test('入力 addonIds 配列を変更しない（引数の非破壊）', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 30)) {
      const keys = addonKeysOf(sc).slice(0, 2)
      if (keys.length === 0) continue
      const input = [...keys]
      deriveRawFields(sc, mod, input, { previousEvent: 'continued_do', currentOutcome: 'stable' }, DRUG)
      assert.deepEqual(input, keys, '引数の addonIds を破壊してはならない')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 責務境界（persona / localInput / runtime 未接続）
// ═══════════════════════════════════════════════════════════════

describe('責務境界: Unit 2A の scope が守られている', () => {
  const src = readFileSync(new URL('../lib/deriveNodeFields.ts', import.meta.url), 'utf-8')

  /**
   * コメントを除いた実装本体だけを取り出す。
   * 責務境界は「実装が何に依存しているか」を見るものであり、
   * 境界そのものを説明する JSDoc の語をヒットさせてはならない。
   */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // ブロックコメント
    .replace(/^[ \t]*\/\/.*$/gm, '')    // 行コメント

  test('persona を derive helper へ入れていない（RAPID-V2-10）', () => {
    // Unit 3A: 同一ファイルへ secondary Node 用 deriveNodeBlockCore を追加した。
    // deriveNodeBlockCore は block.guard（PersonaGuard 記述子）を返す責務を持つため
    // derivePersonaGuard を参照する（persona を適用するのではなく、後段の
    // applyPersonaToFieldsWithGuard が使う記述子を返すだけ。呼び出し側の責務は
    // Unit 3A 以前の buildUpdatedNode / handleAddonToggle と同一で、単に本ファイルへ
    // 移設しただけである）。
    //
    // RAPID-V2-10 が守る invariant は「deriveRawFields（primary 経路）が
    // persona 未適用の raw fields までを担当する」ことであり、ファイル全体が
    // persona を一切参照しないことではない。deriveRawFields 自身とその依存
    // （withRapidFirstSentence）の region に限定して検証する。
    const start = code.indexOf('function withRapidFirstSentence')
    const end = code.indexOf('export type NodeBlockCore')
    assert.ok(start !== -1 && end !== -1 && end > start, 'deriveRawFields region の抽出に失敗した')
    const deriveRawFieldsRegion = code.slice(start, end)
    assert.ok(
      !/applyPersona|personaGuard|PersonaId|derivePersonaGuard/.test(deriveRawFieldsRegion),
      'deriveRawFields は persona 未適用の raw fields までを担当する。' +
      'persona は既存どおり後段で適用し、global boundary を維持すること',
    )
  })

  test('localInput を derive helper へ入れていない', () => {
    assert.ok(
      !/localSiteInput|localInput|applyPlaceholder/.test(code),
      'localInput は materialize せず render 時に適用する既存契約を変更しない',
    )
  })

  test('production ロジックを複製せず既存 helper を再利用している', () => {
    assert.ok(
      /from '\.\/buildSoap'/.test(code) && /from '\.\/rapidSentence'/.test(code),
      'buildNodeFields と Unit 1 の Rapid helper を再利用すること',
    )
    assert.ok(
      !/function buildSFirstSentence|function replaceSFirstSentence|indexOf\('。'\)/.test(code),
      '文生成 / 先頭文置換のロジックを複製してはならない',
    )
  })

  // Unit 2A 時点では「runtime から呼ばれていないこと」を固定していたが、
  // Unit 2B で primary runtime への配線が完了したためこの assertion は
  // 恒久的に false になる（配線されることが Unit 2B の目的そのものであるため）。
  // 配線後の contract（単一 derive 経路であること等）は
  // tests/deriveNodeFieldsUnit2B.test.ts が担う。
})
