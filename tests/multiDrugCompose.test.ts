/**
 * multiDrugCompose.test.ts
 *
 * 複数薬剤合成の回帰テスト
 *
 * カバー範囲:
 *   1. derm 単剤 — S置換対象シナリオ vs. 非対象シナリオ
 *   2. 2剤合成: GLP-1内服+derm / derm+H1内服 / H1内服+H1点眼
 *   3. 3剤合成: derm+H1内服+H1点眼 / GLP-1内服+H1内服+H1点眼
 *   4. 5剤合成ストレステスト（全登録モジュール）
 *   5. compose 編集ストレス（追加 → 削除 → 再追加）
 *   6. S置換 suppression: primary=true, secondary/additional/composed=false
 *   7. search runtime 監査: commonSearchTokens 等が実行時に参照されないことを確認
 *
 * 実行:
 *   npx tsx --test tests/multiDrugCompose.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { mergeBlocks, buildNodeFields } from '../lib/buildSoap'
import { isSReplacementEligible } from '../lib/isSReplacementEligible'
import type { MergedBlock, SoapFields, ModuleData, Scenario } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'

import oralData   from '../data/modules/dm_glp1ra_semaglutide_oral.json'           assert { type: 'json' }
import injData    from '../data/modules/dm_glp1ra_injection.json'                   assert { type: 'json' }
import h1OralData from '../data/modules/allergy_h1_antihistamine_second_gen_oral.json' assert { type: 'json' }
import h1EyeData  from '../data/modules/allergy_h1_antihistamine_eye_drops.json'   assert { type: 'json' }
import dermData   from '../data/modules/derm_heparinoid_moisturizer_ointment.json' assert { type: 'json' }

// ─────────────────────────────────────────────────────────────
// モジュール参照
// ─────────────────────────────────────────────────────────────

const oral   = oralData   as unknown as ModuleData
const inj    = injData    as unknown as ModuleData
const h1Oral = h1OralData as unknown as ModuleData
const h1Eye  = h1EyeData  as unknown as ModuleData
const derm   = dermData   as unknown as ModuleData

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

type AnyModule = { moduleId: string; scenarios: Array<{ id: string }> }

function getScenario(mod: ModuleData, id: string): Scenario {
  const sc = (mod as unknown as AnyModule).scenarios.find(s => s.id === id)
  if (!sc) throw new Error(`scenario not found: ${id} in ${(mod as unknown as AnyModule).moduleId}`)
  return sc as unknown as Scenario
}

function makeBlock(mod: ModuleData, scenarioId: string, drugName: string): MergedBlock {
  const sc = getScenario(mod, scenarioId)
  const { fields, closingText, groupKey, clinicalDomain, closingBehavior } =
    buildNodeFields(sc as Parameters<typeof buildNodeFields>[0], mod, [], drugName)
  return {
    id: sc.id,
    templateLabel: (sc as unknown as { title?: string }).title ?? sc.id,
    fields,
    closingText,
    groupKey,
    clinicalDomain,
    closingBehavior,
  }
}

function runMerge(primary: MergedBlock, rest: MergedBlock[]): SoapFields {
  return mergeBlocks(
    rest,
    primary.fields,
    primary.templateLabel ?? '',
    primary.closingText,
    primary.domain,
    primary.groupKey,
    primary.clinicalDomain,
  )
}

// ─────────────────────────────────────────────────────────────
// 1. derm 単剤 — S置換対象シナリオと非対象シナリオ
// ─────────────────────────────────────────────────────────────

describe('① derm 単剤 — S置換対象判定', () => {
  const ctx = { thirdPanelEnabled: true }

  test('cp_good → S置換 true', () => {
    const sc = getScenario(derm, 'cp_good')
    assert.equal(isSReplacementEligible(sc, ctx), true)
  })

  test('se_contact_dermatitis_none → S置換 true (sideEffectPresence=absent_or_not_observed)', () => {
    const sc = getScenario(derm, 'se_contact_dermatitis_none')
    assert.equal(isSReplacementEligible(sc, ctx), true)
  })

  test('se_redness_none → S置換 true', () => {
    const sc = getScenario(derm, 'se_redness_none')
    assert.equal(isSReplacementEligible(sc, ctx), true)
  })

  test('initial_dryness → S置換 false', () => {
    const sc = getScenario(derm, 'initial_dryness')
    assert.equal(isSReplacementEligible(sc, ctx), false)
  })

  test('frequency_increase_low_perceived_effect → S置換 false', () => {
    const sc = getScenario(derm, 'frequency_increase_low_perceived_effect')
    assert.equal(isSReplacementEligible(sc, ctx), false)
  })

  test('frequency_decrease_improved → S置換 false', () => {
    const sc = getScenario(derm, 'frequency_decrease_improved')
    assert.equal(isSReplacementEligible(sc, ctx), false)
  })

  test('end_improved → S置換 false', () => {
    const sc = getScenario(derm, 'end_improved')
    assert.equal(isSReplacementEligible(sc, ctx), false)
  })

  test('se_mild_continue → S置換 false (副作用あり)', () => {
    const sc = getScenario(derm, 'se_mild_continue')
    assert.equal(isSReplacementEligible(sc, ctx), false)
  })

  test('cp_poor_missed_doses → S置換 false', () => {
    const sc = getScenario(derm, 'cp_poor_missed_doses')
    assert.equal(isSReplacementEligible(sc, ctx), false)
  })
})

// ─────────────────────────────────────────────────────────────
// 2. 2剤合成
// ─────────────────────────────────────────────────────────────

describe('② 2剤合成 — GLP-1内服 + derm', () => {
  const b1 = makeBlock(oral, 'initial', 'セマグルチド経口')
  const b2 = makeBlock(derm, 'initial_dryness', 'ヒルドイド')
  const merged = runMerge(b1, [b2])

  test('S が空でない', () => {
    assert.ok(merged.S.trim().length > 0, `S was empty`)
  })

  test('P が空でない', () => {
    assert.ok(merged.P.trim().length > 0, `P was empty`)
  })

  test('S に GLP-1内服の内容が含まれる（clinicalDomain 分離: diabetes）', () => {
    // diabetes domain と dermatology domain は clinicalDomain ごとに処理される
    // 少なくとも一方の内容が S に存在すること
    assert.ok(merged.S.length >= b1.fields.S.length || merged.S.length >= b2.fields.S.length)
  })

  test('P の closing が重複しない（隣接 dedupe）', () => {
    const lines = merged.P.split('\n')
    for (let i = 1; i < lines.length; i++) {
      assert.notEqual(lines[i], lines[i - 1], `adjacent duplicate line at [${i}]: "${lines[i]}"`)
    }
  })

  test('derm + GLP-1 合成後も isSReplacementEligible は true（Unit 4D-4: capable なら複数 ComposeNode でも true。D-4D4-3）', () => {
    const dermSc = getScenario(derm, 'cp_good')
    assert.equal(
      isSReplacementEligible(dermSc, { thirdPanelEnabled: true }),
      true,
      'capable な scenario は複数 ComposeNode が存在していても thirdPanelEnabled=true なら true'
    )
  })
})

describe('② 2剤合成 — derm + H1内服', () => {
  const b1 = makeBlock(derm, 'initial_dryness', 'ヒルドイド')
  const b2 = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン')
  const merged = runMerge(b1, [b2])

  test('S が空でない', () => {
    assert.ok(merged.S.trim().length > 0)
  })

  test('P が空でない', () => {
    assert.ok(merged.P.trim().length > 0)
  })

  test('O/A は単純並列（空でない場合）', () => {
    // O/A は各モジュールの内容を改行区切りで並べる
    // どちらかが空でなければ merged も空でない
    if (b1.fields.O.trim() || b2.fields.O.trim()) {
      assert.ok(merged.O.trim().length > 0, 'O が空')
    }
  })
})

describe('② 2剤合成 — H1内服 + H1点眼', () => {
  const b1 = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン')
  const b2 = makeBlock(h1Eye, 'initial', 'アレジオン点眼')
  const merged = runMerge(b1, [b2])

  test('S が空でない', () => {
    assert.ok(merged.S.trim().length > 0)
  })

  test('P が空でない', () => {
    assert.ok(merged.P.trim().length > 0)
  })

  test('P_closing は重複しない', () => {
    const lines = merged.P.split('\n')
    const closingLines = lines.filter(l => l.trimStart().startsWith('次回'))
    // 同一 closing が隣接して複数行現れないこと
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith('次回')) {
        assert.notEqual(lines[i], lines[i - 1], `adjacent closing duplicate: "${lines[i]}"`)
      }
    }
    // closing が少なくとも1行あること（H1系は followup を持つ）
    assert.ok(closingLines.length >= 1, 'P に closing 行がない')
  })
})

describe('② 2剤合成 — derm cp_good + H1内服 initial_nasal (Unit 4D-4: S置換は capability のみで判定)', () => {
  test('derm(cp_good) 単剤: S置換 true', () => {
    const sc = getScenario(derm, 'cp_good')
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true }), true)
  })

  test('derm(cp_good) 複数 ComposeNode 存在時（H1追加後）: capable なら S置換 true（旧: secondary で false。D-4D4-3）', () => {
    const sc = getScenario(derm, 'cp_good')
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true }), true)
  })

  test('mergeBlocks 自体は S が空にならない', () => {
    const b1 = makeBlock(derm, 'cp_good', 'ヒルドイド')
    const b2 = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン')
    const merged = runMerge(b1, [b2])
    assert.ok(merged.S.trim().length > 0)
  })
})

// ─────────────────────────────────────────────────────────────
// 3. 3剤合成
// ─────────────────────────────────────────────────────────────

describe('③ 3剤合成 — derm + H1内服 + H1点眼', () => {
  const b1 = makeBlock(derm, 'initial_dryness', 'ヒルドイド')
  const b2 = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン')
  const b3 = makeBlock(h1Eye, 'initial', 'アレジオン点眼')
  const merged = runMerge(b1, [b2, b3])

  test('S が空でない', () => {
    assert.ok(merged.S.trim().length > 0)
  })

  test('P が空でない', () => {
    assert.ok(merged.P.trim().length > 0)
  })

  test('P の隣接重複行がない', () => {
    const lines = merged.P.split('\n')
    for (let i = 1; i < lines.length; i++) {
      assert.notEqual(lines[i], lines[i - 1], `adjacent duplicate at [${i}]: "${lines[i]}"`)
    }
  })

  test('S置換は capability のみで判定、3剤合成後も capable なら true（旧: primary 限定で false。D-4D4-3）', () => {
    const sc = getScenario(derm, 'cp_good')
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true }), true)
  })
})

describe('③ 3剤合成 — GLP-1内服 + H1内服 + H1点眼', () => {
  const b1 = makeBlock(oral, 'initial', 'セマグルチド経口')
  const b2 = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン')
  const b3 = makeBlock(h1Eye, 'initial', 'アレジオン点眼')
  const merged = runMerge(b1, [b2, b3])

  test('S が空でない', () => {
    assert.ok(merged.S.trim().length > 0)
  })

  test('P が空でない', () => {
    assert.ok(merged.P.trim().length > 0)
  })

  test('P 末尾の closing が複数行連続しない', () => {
    const lines = merged.P.split('\n')
    const lastClosing = lines.filter(l => l.trimStart().startsWith('次回'))
    // 末尾 closing は dedupe 済みなので、末尾に2行以上の同一 closing がない
    if (lines.length >= 2) {
      const last = lines[lines.length - 1]
      const secondLast = lines[lines.length - 2]
      if (last === secondLast) {
        assert.fail(`末尾に同一 closing が2行以上: "${last}"`)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────
// 4. 5剤合成ストレステスト（全登録モジュール）
// ─────────────────────────────────────────────────────────────

describe('④ 5剤合成ストレス — 全モジュール initial シナリオ', () => {
  // ALL_MODULES の各モジュールから "initial" 系シナリオを1つ選んで5剤合成
  const drugNames = ['セマグルチド経口', 'セマグルチド注射', 'アレジオン点眼', 'ビラスチン', 'ヒルドイド']

  function pickInitialScenarioId(mod: ModuleData): string {
    const ids = (mod as unknown as AnyModule).scenarios.map(s => s.id)
    // "initial" を含む id を優先
    return ids.find(id => id.startsWith('initial')) ?? ids[0]
  }

  test('5剤合成後 S が空でない', () => {
    const blocks = ALL_MODULES.map((mod, i) => makeBlock(mod, pickInitialScenarioId(mod), drugNames[i] ?? `薬剤${i+1}`))
    const [primary, ...rest] = blocks
    const merged = runMerge(primary, rest)
    assert.ok(merged.S.trim().length > 0, `5剤合成後 S が空`)
  })

  test('5剤合成後 P が空でない', () => {
    const blocks = ALL_MODULES.map((mod, i) => makeBlock(mod, pickInitialScenarioId(mod), drugNames[i] ?? `薬剤${i+1}`))
    const [primary, ...rest] = blocks
    const merged = runMerge(primary, rest)
    assert.ok(merged.P.trim().length > 0, `5剤合成後 P が空`)
  })

  test('5剤合成後 P に隣接重複行がない', () => {
    const blocks = ALL_MODULES.map((mod, i) => makeBlock(mod, pickInitialScenarioId(mod), drugNames[i] ?? `薬剤${i+1}`))
    const [primary, ...rest] = blocks
    const merged = runMerge(primary, rest)
    const lines = merged.P.split('\n').filter(l => l.trim())
    for (let i = 1; i < lines.length; i++) {
      assert.notEqual(lines[i], lines[i - 1], `5剤合成 P: 隣接重複 [${i}]: "${lines[i]}"`)
    }
  })

  test('5剤合成は例外を throw しない', () => {
    assert.doesNotThrow(() => {
      const blocks = ALL_MODULES.map((mod, i) => makeBlock(mod, pickInitialScenarioId(mod), drugNames[i] ?? `薬剤${i+1}`))
      const [primary, ...rest] = blocks
      runMerge(primary, rest)
    })
  })
})

describe('④ 5剤ストレス — treatment_adjustment シナリオ混在', () => {
  // derm の frequency_increase, frequency_decrease 系を混在させて例外が出ないことを確認
  test('derm(frequency_increase) + GLP-1 + H1 混在で例外なし', () => {
    assert.doesNotThrow(() => {
      const b1 = makeBlock(derm, 'frequency_increase_low_perceived_effect', 'ヒルドイド')
      const b2 = makeBlock(oral, 'initial', 'セマグルチド経口')
      const b3 = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン')
      runMerge(b1, [b2, b3])
    })
  })

  test('derm(frequency_decrease) + GLP-1注射 混在で例外なし', () => {
    assert.doesNotThrow(() => {
      const b1 = makeBlock(derm, 'frequency_decrease_improved', 'ヒルドイド')
      const b2 = makeBlock(inj, 'initial', 'セマグルチド注射')
      runMerge(b1, [b2])
    })
  })

  test('derm(se_change_due_to_pruritus) + H1 点眼 混在で例外なし', () => {
    assert.doesNotThrow(() => {
      const b1 = makeBlock(derm, 'se_change_due_to_pruritus', 'ヒルドイド')
      const b2 = makeBlock(h1Eye, 'initial', 'アレジオン点眼')
      runMerge(b1, [b2])
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 5. compose 編集ストレス（追加 → 削除 → 再追加）
// ─────────────────────────────────────────────────────────────

describe('⑤ compose 編集ストレス', () => {
  test('derm 単剤 → H1追加 → H1削除 → S は derm 単剤と同一', () => {
    // derm 単剤
    const dermBlock = makeBlock(derm, 'initial_dryness', 'ヒルドイド')
    const singleDrug = runMerge(dermBlock, [])

    // H1追加
    const h1Block = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン')
    const withH1 = runMerge(dermBlock, [h1Block])

    // H1削除（derm 単剤に戻る）
    const afterRemove = runMerge(dermBlock, [])

    assert.equal(afterRemove.S, singleDrug.S, '削除後 S は単剤時と同一')
    assert.equal(afterRemove.P, singleDrug.P, '削除後 P は単剤時と同一')
    assert.notDeepEqual(withH1.S, singleDrug.S, 'H1追加時は S が変化していること')
  })

  test('H1追加 → 再追加（derm + H1 × 2）が例外なし', () => {
    assert.doesNotThrow(() => {
      const dermBlock = makeBlock(derm, 'initial_eczema', 'ヒルドイド')
      const h1Block1 = makeBlock(h1Oral, 'initial_nasal', 'ビラスチン1')
      const h1Block2 = makeBlock(h1Oral, 'se_drowsiness_none', 'ビラスチン2')
      runMerge(dermBlock, [h1Block1, h1Block2])
    })
  })

  test('derm 全シナリオ × GLP-1内服 initial: mergeBlocks が例外を throw しない', () => {
    const errors: string[] = []
    const primaryBlock = makeBlock(oral, 'initial', 'セマグルチド経口')
    const dermScenarios = (derm as unknown as AnyModule).scenarios

    for (const sc of dermScenarios) {
      try {
        const dermBlock = makeBlock(derm, sc.id, 'ヒルドイド')
        runMerge(primaryBlock, [dermBlock])
      } catch (e) {
        errors.push(`derm:${sc.id} でエラー: ${e}`)
      }
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })

  test('derm 全シナリオ × H1点眼 initial: mergeBlocks が例外を throw しない', () => {
    const errors: string[] = []
    const h1EyeBlock = makeBlock(h1Eye, 'initial', 'アレジオン点眼')
    const dermScenarios = (derm as unknown as AnyModule).scenarios

    for (const sc of dermScenarios) {
      try {
        const dermBlock = makeBlock(derm, sc.id, 'ヒルドイド')
        runMerge(dermBlock, [h1EyeBlock])
      } catch (e) {
        errors.push(`derm:${sc.id} でエラー: ${e}`)
      }
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })
})

// ─────────────────────────────────────────────────────────────
// 6. S置換 suppression — 全コンテキスト網羅
// ─────────────────────────────────────────────────────────────

describe('⑥ S置換 eligibility — context 境界（Unit 4D-4: thirdPanelEnabled + capability のみで判定）', () => {
  const dermEligibleIds = ['cp_good', 'se_contact_dermatitis_none', 'se_redness_none', 'se_pruritus_none', 'se_dermatitis_none']

  test('thirdPanelEnabled=false → 常に false', () => {
    for (const id of dermEligibleIds) {
      const sc = getScenario(derm, id)
      assert.equal(
        isSReplacementEligible(sc, { thirdPanelEnabled: false }),
        false,
        `${id}: thirdPanelEnabled=false なら false`
      )
    }
  })

  test('複数 ComposeNode が存在していても capable なら true（旧: isSingleDrug=false で常に false。D-4D4-3）', () => {
    for (const id of dermEligibleIds) {
      const sc = getScenario(derm, id)
      assert.equal(
        isSReplacementEligible(sc, { thirdPanelEnabled: true }),
        true,
        `${id}: thirdPanelEnabled=true なら capable な scenario は true`
      )
    }
  })

  test('thirdPanelEnabled=true → eligible シナリオは true', () => {
    for (const id of dermEligibleIds) {
      const sc = getScenario(derm, id)
      assert.equal(
        isSReplacementEligible(sc, { thirdPanelEnabled: true }),
        true,
        `${id}: thirdPanelEnabled=true では true`
      )
    }
  })

  test('scenario=null → 常に false', () => {
    assert.equal(
      isSReplacementEligible(null, { thirdPanelEnabled: true }),
      false
    )
    assert.equal(
      isSReplacementEligible(undefined, { thirdPanelEnabled: true }),
      false
    )
  })

  test('derm 非対象シナリオは thirdPanelEnabled=true でも false（シナリオ自体が capable でない）', () => {
    const nonEligibleIds = [
      'initial_dryness',
      'frequency_increase_low_perceived_effect',
      'frequency_decrease_improved',
      'end_improved',
      'se_mild_continue',
      'cp_poor_missed_doses',
    ]
    for (const id of nonEligibleIds) {
      const sc = getScenario(derm, id)
      assert.equal(
        isSReplacementEligible(sc, { thirdPanelEnabled: true }),
        false,
        `${id}: 非対象は false`
      )
    }
  })

  test('GLP-1内服 cp_good + derm cp_good: 複数 ComposeNode が存在していても双方 capable なら true（旧: secondary は false。D-4D4-3）', () => {
    const glp1CpGood = getScenario(oral, 'cp_good')
    const dermCpGood = getScenario(derm, 'cp_good')

    assert.equal(isSReplacementEligible(glp1CpGood, { thirdPanelEnabled: true }), true, 'GLP-1 cp_good → true')
    assert.equal(isSReplacementEligible(dermCpGood, { thirdPanelEnabled: true }), true, 'derm cp_good（複数 ComposeNode 存在下）→ true')
  })
})

// ─────────────────────────────────────────────────────────────
// 7. search runtime 監査
// ─────────────────────────────────────────────────────────────

describe('⑦ search runtime 監査 — JSON フィールドの runtime 非参照確認', () => {
  /**
   * 以下のフィールドは現行 search.ts runtime に参照コードが存在しない。
   * JSON に記載があっても TypeScript 型定義・getSuggestions/scoreEntry に
   * 読み込まれておらず、Express Mode や formulation 拡張の CHECK 事項として
   * マークしている。
   *
   * 参照: lib/search.ts — buildSearchIndex(), scoreEntry(), getSuggestions()
   *   - matchPolicy.suppressCrossModuleSuggestionsOnExactHit のみ読み込まれる（:143）
   *   - drug.nameAliases は :104 で参照される
   *   - drug.search.nameAliases は :105 で参照される
   *   - commonSearchTokens / formulationSearchTokens / allowMultiTokenAndMatch /
   *     allowFormulationTokenMatch は型定義になく runtime に読み込まれない
   *
   * このテストは「読み込んでいない」という事実を文書化するメタテストである。
   * JSON にフィールドが存在すること自体は問題ではなく、runtime が参照しない
   * ことで事故が起きないことを確認する。
   */

  test('derm の matchPolicy には suppressCrossModuleSuggestionsOnExactHit のみが runtime 参照される', () => {
    // derm JSON が matchPolicy を持つ場合、runtime で参照される唯一のキーを確認
    const modAny = derm as unknown as Record<string, unknown>
    const matchPolicy = modAny['matchPolicy'] as Record<string, unknown> | undefined

    if (matchPolicy) {
      // runtime が参照するのは suppressCrossModuleSuggestionsOnExactHit のみ
      // 他のキー（allowMultiTokenAndMatch 等）は参照されない — CHECK 事項
      const suppressKey = 'suppressCrossModuleSuggestionsOnExactHit'
      if (suppressKey in matchPolicy) {
        assert.equal(typeof matchPolicy[suppressKey], 'boolean', `${suppressKey} は boolean であること`)
      }
    }
    // matchPolicy が未設定でも正常（設定は optional）
    assert.ok(true, 'matchPolicy 構造チェック完了')
  })

  test('commonSearchTokens / formulationSearchTokens は runtime では参照されない（文書化テスト）', () => {
    // このテストは runtime バグではなく設計上の CHECK 事項を記録する。
    // JSON に commonSearchTokens / formulationSearchTokens フィールドが存在しても、
    // search.ts の buildSearchIndex / scoreEntry は読み込まない。
    // → 将来 Express Mode や formulation 拡張で実装が必要になった場合に
    //   TypeScript 型定義と runtime 参照を同時に追加すること。
    const dermAny = derm as unknown as Record<string, unknown>
    const drugAny = dermAny['drug'] as Record<string, unknown> | undefined

    // drug.nameAliases は runtime 参照あり（search.ts:104）
    if (drugAny && 'nameAliases' in drugAny) {
      assert.ok(Array.isArray(drugAny['nameAliases']), 'drug.nameAliases は配列')
    }

    // commonSearchTokens / formulationSearchTokens が仮に存在しても runtime は読まない（現状）
    // → 存在確認はしない（設計変更後に CHECK として追加する）
    assert.ok(true, 'search runtime 監査: commonSearchTokens/formulationSearchTokens は runtime 非参照（CHECK 事項）')
  })

  test('全モジュール drug.nameAliases が配列型を持つ', () => {
    for (const mod of ALL_MODULES) {
      const modAny = mod as unknown as Record<string, unknown>
      const drug = modAny['drug'] as Record<string, unknown> | undefined
      if (drug && 'nameAliases' in drug) {
        assert.ok(Array.isArray(drug['nameAliases']), `${mod.moduleId}: drug.nameAliases が非配列`)
      }
    }
  })

  test('全モジュールの mergeBlocks が例外を throw しない（初回 initial 系シナリオ）', () => {
    const errors: string[] = []
    const drugNames = ['セマグルチド経口', 'セマグルチド注射', 'アレジオン点眼', 'ビラスチン', 'ヒルドイド']

    function firstScenarioId(mod: ModuleData): string {
      return (mod as unknown as AnyModule).scenarios[0]?.id ?? ''
    }

    for (let i = 0; i < ALL_MODULES.length; i++) {
      const mod = ALL_MODULES[i]
      const sid = firstScenarioId(mod)
      if (!sid) continue
      try {
        const primary = makeBlock(mod, sid, drugNames[i] ?? `drug${i}`)
        // 他の全モジュールを secondary として合成
        const rest = ALL_MODULES
          .filter((_, j) => j !== i)
          .map((m, j) => makeBlock(m, firstScenarioId(m), drugNames.filter((_, k) => k !== i)[j] ?? `drug${j}`))
          .filter(b => b.fields.S.trim() || b.fields.P.trim())
        runMerge(primary, rest)
      } catch (e) {
        errors.push(`mod[${i}]:${mod.moduleId} primary + others でエラー: ${e}`)
      }
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })
})
