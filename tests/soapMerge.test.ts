/**
 * soapMerge.test.ts
 *
 * S/O/A/P 合成ロジックの仕様固定テスト
 *
 * 確認済み仕様:
 *   - S は clinicalDomain ごとに分離する（diabetes と allergy は混ぜない）
 *   - 同一 clinicalDomain 内でも groupKey が異なる S は無理に統合しない
 *   - O/A は単純並列
 *   - P 本文は単純並列
 *   - P_CLOSING/followup は同一文が連続する場合のみ 1 つにまとめる
 *   - followup 文が異なる場合は別々に残す
 *
 * 実行:
 *   npx tsx --test tests/soapMerge.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { mergeBlocks, buildNodeFields } from '../lib/buildSoap'
import type { MergedBlock, SoapFields, ModuleData } from '../lib/types'

import oralData   from '../data/modules/dm_glp1ra_semaglutide_oral.json'   assert { type: 'json' }
import injData    from '../data/modules/dm_glp1ra_injection.json'           assert { type: 'json' }
import h1OralData from '../data/modules/allergy_h1_antihistamine_second_gen_oral.json' assert { type: 'json' }
import h1EyeData  from '../data/modules/allergy_h1_antihistamine_eye_drops.json'      assert { type: 'json' }

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

type AnyModule = { moduleId: string; scenarios: Array<{ id: string }> }

/**
 * 指定モジュールの指定シナリオから MergedBlock を生成する。
 * buildNodeFields を経由して clinicalDomain / groupKey / closingText が正しく
 * スナップショットされることも合わせて確認できる。
 */
function makeBlock(mod: ModuleData, scenarioId: string, drugName: string): MergedBlock {
  const scenarios = (mod as unknown as AnyModule).scenarios
  const sc = scenarios.find(s => s.id === scenarioId)
  if (!sc) throw new Error(`scenario not found: ${scenarioId} in ${(mod as unknown as AnyModule).moduleId}`)

  // buildNodeFields は実際の DashboardClient と同じ関数を使用
  const { fields, closingText, groupKey, clinicalDomain, closingBehavior } =
    buildNodeFields(sc as Parameters<typeof buildNodeFields>[0], mod, [], drugName)

  return {
    id: sc.id,
    templateLabel: (sc as { title?: string }).title ?? sc.id,
    fields,
    closingText,
    groupKey,
    clinicalDomain,
    closingBehavior,
  }
}

/**
 * 1剤目のブロックを「currentFields + currentMeta」として mergeBlocks を呼ぶ。
 * 2剤目以降は blocks[] として渡す。
 */
function runMerge(
  primaryBlock: MergedBlock,
  additionalBlocks: MergedBlock[],
): SoapFields {
  return mergeBlocks(
    additionalBlocks,
    primaryBlock.fields,
    primaryBlock.templateLabel ?? '',
    primaryBlock.closingText,
    primaryBlock.domain,
    primaryBlock.groupKey,
    primaryBlock.clinicalDomain,
  )
}

// ─────────────────────────────────────────────────────────────
// 1. GLP-1内服 + GLP-1注射
//    同じ clinicalDomain(diabetes) → S は 1 セクション内で統合
// ─────────────────────────────────────────────────────────────

describe('S合成: GLP-1内服 + GLP-1注射 (同一domain=diabetes)', () => {
  const oral = oralData as unknown as ModuleData
  const inj  = injData  as unknown as ModuleData

  // 同ブランド（薬剤名が同じ）→ body が重複し dedup されて 1 行
  test('同一薬剤名の場合: S は重複排除されて 1 行になる', () => {
    const b1 = makeBlock(oral, 'initial', 'テスト薬')
    const b2 = makeBlock(inj,  'initial', 'テスト薬')
    const result = runMerge(b1, [b2])
    const lines = result.S.split('\n').filter(Boolean)
    assert.equal(lines.length, 1, `S should be 1 line, got: ${JSON.stringify(lines)}`)
    assert.ok(lines[0].includes('血糖値'), `S should mention 血糖値: ${lines[0]}`)
  })

  // 別ブランド → subject joining
  test('異なる薬剤名の場合: S は subject を「と」で結合した 1 行になる', () => {
    const b1 = makeBlock(oral, 'initial', 'リベルサス')
    const b2 = makeBlock(inj,  'initial', 'オゼンピック')
    const result = runMerge(b1, [b2])
    const lines = result.S.split('\n').filter(Boolean)
    assert.equal(lines.length, 1, `S should be 1 line, got: ${JSON.stringify(lines)}`)
    assert.ok(
      lines[0].includes('リベルサス') && lines[0].includes('オゼンピック'),
      `S should contain both drug names: ${lines[0]}`
    )
    assert.ok(lines[0].includes('と'), `S should join subjects with と: ${lines[0]}`)
  })

  // clinicalDomain が両方 diabetes → domainGroups は 1 エントリのみ
  test('両ブロックの clinicalDomain が diabetes であること', () => {
    const b1 = makeBlock(oral, 'initial', 'A')
    const b2 = makeBlock(inj,  'initial', 'B')
    assert.equal(b1.clinicalDomain, 'diabetes')
    assert.equal(b2.clinicalDomain, 'diabetes')
  })

  // groupKey が両方同じ → reason 結合が許可される
  test('両ブロックの groupKey が同一 (hyperglycemia_management) であること', () => {
    const b1 = makeBlock(oral, 'initial', 'A')
    const b2 = makeBlock(inj,  'initial', 'B')
    assert.equal(b1.groupKey, 'hyperglycemia_management')
    assert.equal(b2.groupKey, 'hyperglycemia_management')
  })
})

// ─────────────────────────────────────────────────────────────
// 2. GLP-1内服 + H1内服
//    異なる clinicalDomain (diabetes vs allergy) → S は 2 セクション分離
// ─────────────────────────────────────────────────────────────

describe('S合成: GLP-1内服 + H1内服 (異なるdomain: diabetes / allergy)', () => {
  const oral  = oralData   as unknown as ModuleData
  const h1    = h1OralData as unknown as ModuleData

  test('S は改行で区切られた 2 行（2 ドメイン分離）になる', () => {
    const b1 = makeBlock(oral, 'initial',      'リベルサス')
    const b2 = makeBlock(h1,   'initial_nasal','ビラノア')
    const result = runMerge(b1, [b2])
    const lines = result.S.split('\n').filter(Boolean)
    assert.equal(lines.length, 2, `S should be 2 lines (domain separated), got: ${JSON.stringify(lines)}`)
    assert.ok(lines.some(l => l.includes('血糖値')), 'S should contain 血糖値 (diabetes line)')
    assert.ok(lines.some(l => l.includes('鼻水')),   'S should contain 鼻水 (allergy line)')
  })

  test('clinicalDomain が diabetes / allergy で異なること', () => {
    const b1 = makeBlock(oral, 'initial',      'A')
    const b2 = makeBlock(h1,   'initial_nasal','B')
    assert.equal(b1.clinicalDomain, 'diabetes')
    assert.equal(b2.clinicalDomain, 'allergy')
    assert.notEqual(b1.clinicalDomain, b2.clinicalDomain)
  })

  test('diabetes 行と allergy 行は混入しない（各行は単独ドメインのみ含む）', () => {
    const b1 = makeBlock(oral, 'initial',      'リベルサス')
    const b2 = makeBlock(h1,   'initial_nasal','ビラノア')
    const result = runMerge(b1, [b2])
    const lines = result.S.split('\n').filter(Boolean)
    // 血糖値の行に「鼻水」は含まれない
    const diabetesLine = lines.find(l => l.includes('血糖値'))!
    assert.ok(!diabetesLine.includes('鼻水'), `diabetes line should not contain 鼻水: ${diabetesLine}`)
    // 鼻水の行に「血糖値」は含まれない
    const allergyLine = lines.find(l => l.includes('鼻水'))!
    assert.ok(!allergyLine.includes('血糖値'), `allergy line should not contain 血糖値: ${allergyLine}`)
  })
})

// ─────────────────────────────────────────────────────────────
// 3. H1内服 + H1点眼
//    同じ clinicalDomain(allergy) だが groupKey が異なる → S は無理に統合しない
// ─────────────────────────────────────────────────────────────

describe('S合成: H1内服 + H1点眼 (同一domain=allergy, groupKey異なる)', () => {
  const h1  = h1OralData as unknown as ModuleData
  const eye = h1EyeData  as unknown as ModuleData

  test('S は 2 行になる（groupKey 違いで統合しない）', () => {
    const b1 = makeBlock(h1,  'initial_nasal', 'ビラノア')
    const b2 = makeBlock(eye, 'initial',       'アレジオン点眼')
    const result = runMerge(b1, [b2])
    const lines = result.S.split('\n').filter(Boolean)
    assert.equal(lines.length, 2, `S should be 2 lines (different groupKey), got: ${JSON.stringify(lines)}`)
  })

  test('両ブロックの clinicalDomain が allergy であること', () => {
    const b1 = makeBlock(h1,  'initial_nasal', 'A')
    const b2 = makeBlock(eye, 'initial',       'B')
    assert.equal(b1.clinicalDomain, 'allergy')
    assert.equal(b2.clinicalDomain, 'allergy')
  })

  test('groupKey が異なること (allergy_symptom_management vs treatment_start)', () => {
    const b1 = makeBlock(h1,  'initial_nasal', 'A')
    const b2 = makeBlock(eye, 'initial',       'B')
    assert.notEqual(b1.groupKey, b2.groupKey,
      `groupKey should differ: h1=${b1.groupKey}, eye=${b2.groupKey}`)
    assert.equal(b1.groupKey, 'allergy_symptom_management')
    assert.equal(b2.groupKey, 'treatment_start')
  })

  test('S 各行は鼻水と目のかゆみをそれぞれ含む', () => {
    const b1 = makeBlock(h1,  'initial_nasal', 'ビラノア')
    const b2 = makeBlock(eye, 'initial',       'アレジオン点眼')
    const result = runMerge(b1, [b2])
    const lines = result.S.split('\n').filter(Boolean)
    assert.ok(lines.some(l => l.includes('鼻水')),         'S should contain 鼻水')
    assert.ok(lines.some(l => l.includes('目のかゆみ')),   'S should contain 目のかゆみ')
  })

  test('「と」による subject 結合は行われない', () => {
    const b1 = makeBlock(h1,  'initial_nasal', 'ビラノア')
    const b2 = makeBlock(eye, 'initial',       'アレジオン点眼')
    const result = runMerge(b1, [b2])
    // 2行に分かれているので、1行に両名前が入ることはない
    const lines = result.S.split('\n').filter(Boolean)
    const hasBothOnOneLine = lines.some(l => l.includes('ビラノア') && l.includes('アレジオン点眼'))
    assert.ok(!hasBothOnOneLine, 'S should not join both drugs on one line')
  })
})

// ─────────────────────────────────────────────────────────────
// 4. GLP-1内服 + GLP-1注射
//    同一 followup → P_CLOSING は 1 つにまとまる
// ─────────────────────────────────────────────────────────────

describe('P合成: GLP-1内服 + GLP-1注射 (同一followup → closing は 1 つ)', () => {
  const oral = oralData as unknown as ModuleData
  const inj  = injData  as unknown as ModuleData

  const CLOSING = '次回、引き続き使用できているか、副作用の有無を確認。'

  test('GLP-1内服と注射の followup 文が同一であること', () => {
    const b1 = makeBlock(oral, 'initial', 'A')
    const b2 = makeBlock(inj,  'initial', 'B')
    assert.equal(b1.closingText, b2.closingText,
      `closingText should match: oral=${b1.closingText}, inj=${b2.closingText}`)
    assert.equal(b1.closingText, CLOSING)
  })

  test('P には closing 文が 1 回だけ現れる（dedup）', () => {
    const b1 = makeBlock(oral, 'initial', 'リベルサス')
    const b2 = makeBlock(inj,  'initial', 'オゼンピック')
    const result = runMerge(b1, [b2])
    const occurrences = result.P.split(CLOSING).length - 1
    assert.equal(occurrences, 1,
      `closing should appear exactly once, got ${occurrences}. P:\n${result.P}`)
  })

  test('P には両薬剤の本文が含まれる', () => {
    const b1 = makeBlock(oral, 'initial', 'リベルサス')
    const b2 = makeBlock(inj,  'initial', 'オゼンピック')
    const result = runMerge(b1, [b2])
    assert.ok(result.P.includes('リベルサス'), `P should contain リベルサス`)
    assert.ok(result.P.includes('オゼンピック'), `P should contain オゼンピック`)
  })
})

// ─────────────────────────────────────────────────────────────
// 5. GLP-1内服 + H1内服
//    bridge修正後: default followup が同一文字列 → 1 つに dedup
// ─────────────────────────────────────────────────────────────

describe('P合成: GLP-1内服 + H1内服 (bridge修正後: 同一followup → closing は 1 つ)', () => {
  const oral = oralData   as unknown as ModuleData
  const h1   = h1OralData as unknown as ModuleData

  const DEFAULT_CLOSING = '次回、引き続き使用できているか、副作用の有無を確認。'

  test('修正後: GLP-1内服と H1内服の default_followup.P が同一であること', () => {
    const b1 = makeBlock(oral, 'initial',       'A')
    const b2 = makeBlock(h1,   'initial_nasal', 'B')
    assert.equal(b1.closingText, DEFAULT_CLOSING, `GLP-1 closingText`)
    assert.equal(b2.closingText, DEFAULT_CLOSING, `H1 closingText`)
    assert.equal(b1.closingText, b2.closingText, 'Both modules should share the same closing')
  })

  test('修正後: P には closing 文が 1 回だけ現れる（dedup）', () => {
    const b1 = makeBlock(oral, 'initial',       'リベルサス')
    const b2 = makeBlock(h1,   'initial_nasal', 'ビラノア')
    const result = runMerge(b1, [b2])
    const occurrences = result.P.split(DEFAULT_CLOSING).length - 1
    assert.equal(occurrences, 1,
      `closing should appear exactly once, got ${occurrences}. P:\n${result.P}`)
  })

  test('修正後: P には両薬剤の本文が含まれる', () => {
    const b1 = makeBlock(oral, 'initial',       'リベルサス')
    const b2 = makeBlock(h1,   'initial_nasal', 'ビラノア')
    const result = runMerge(b1, [b2])
    assert.ok(result.P.includes('リベルサス'), `P should contain リベルサス`)
    assert.ok(result.P.includes('ビラノア'),   `P should contain ビラノア`)
  })
})

// ─────────────────────────────────────────────────────────────
// 6. O / A — 単純並列（仕様の明示的固定）
// ─────────────────────────────────────────────────────────────

describe('O/A合成: 単純並列（clinicalDomain 分離なし）', () => {
  const oral = oralData   as unknown as ModuleData
  const h1   = h1OralData as unknown as ModuleData

  test('O は 2 モジュール分が改行区切りで結合される', () => {
    const b1 = makeBlock(oral, 'initial',       'リベルサス')
    const b2 = makeBlock(h1,   'initial_nasal', 'ビラノア')
    const result = runMerge(b1, [b2])
    // O は単純連結 — clinicalDomain 分離は行われない
    const oLines = result.O.split('\n').filter(Boolean)
    // 少なくとも 1 行は出力される（空のモジュールもあり得るため >= 0 ではなく >= 0 で OK）
    // ここでは「domain が混在しても分離しない」ことを確認するため両方の内容を探す
    const b1O = b1.fields.O.trim()
    const b2O = b2.fields.O.trim()
    if (b1O) assert.ok(result.O.includes(b1O), `O should include primary block's O`)
    if (b2O) assert.ok(result.O.includes(b2O), `O should include secondary block's O`)
    // O 内に S の domain 分離的な改行増加はない（单纯結合）
    if (b1O && b2O) {
      assert.ok(oLines.length >= 1, 'O should have at least 1 line')
    }
  })

  test('A は 2 モジュール分が改行区切りで結合される', () => {
    const b1 = makeBlock(oral, 'initial',       'リベルサス')
    const b2 = makeBlock(h1,   'initial_nasal', 'ビラノア')
    const result = runMerge(b1, [b2])
    const b1A = b1.fields.A.trim()
    const b2A = b2.fields.A.trim()
    if (b1A) assert.ok(result.A.includes(b1A), `A should include primary block's A`)
    if (b2A) assert.ok(result.A.includes(b2A), `A should include secondary block's A`)
  })
})

// ─────────────────────────────────────────────────────────────
// 7. GLP-1内服 + GLP-1注射 + H1内服
//    全て同一 default followup → closing は 1 つに dedup
// ─────────────────────────────────────────────────────────────

describe('P合成: GLP-1内服 + GLP-1注射 + H1内服 (3剤全て同一followup → closing は 1 つ)', () => {
  const oral = oralData   as unknown as ModuleData
  const inj  = injData    as unknown as ModuleData
  const h1   = h1OralData as unknown as ModuleData

  const DEFAULT_CLOSING = '次回、引き続き使用できているか、副作用の有無を確認。'

  test('3 剤全ての closingText が同一であること', () => {
    const b1 = makeBlock(oral, 'initial',       'A')
    const b2 = makeBlock(inj,  'initial',       'B')
    const b3 = makeBlock(h1,   'initial_nasal', 'C')
    assert.equal(b1.closingText, DEFAULT_CLOSING)
    assert.equal(b2.closingText, DEFAULT_CLOSING)
    assert.equal(b3.closingText, DEFAULT_CLOSING)
  })

  test('P には closing 文が 1 回だけ現れる（3 剤 dedup）', () => {
    const b1 = makeBlock(oral, 'initial',       'リベルサス')
    const b2 = makeBlock(inj,  'initial',       'オゼンピック')
    const b3 = makeBlock(h1,   'initial_nasal', 'ビラノア')
    const result = runMerge(b1, [b2, b3])
    const occurrences = result.P.split(DEFAULT_CLOSING).length - 1
    assert.equal(occurrences, 1,
      `closing should appear exactly once, got ${occurrences}. P:\n${result.P}`)
  })

  test('P には 3 剤の本文が含まれる', () => {
    const b1 = makeBlock(oral, 'initial',       'リベルサス')
    const b2 = makeBlock(inj,  'initial',       'オゼンピック')
    const b3 = makeBlock(h1,   'initial_nasal', 'ビラノア')
    const result = runMerge(b1, [b2, b3])
    assert.ok(result.P.includes('リベルサス'),   `P should contain リベルサス`)
    assert.ok(result.P.includes('オゼンピック'), `P should contain オゼンピック`)
    assert.ok(result.P.includes('ビラノア'),     `P should contain ビラノア`)
  })
})

// ─────────────────────────────────────────────────────────────
// 8. H1内服(end) + H1点眼(end)
//    bridge修正後: end_followup が同一文字列 → 1 つに dedup
// ─────────────────────────────────────────────────────────────

describe('P合成: H1内服(end) + H1点眼(end) (bridge修正後: end_followup が 1 つ)', () => {
  const h1  = h1OralData as unknown as ModuleData
  const eye = h1EyeData  as unknown as ModuleData

  const END_CLOSING = '次回、治療経過および体調変化の有無を確認。'

  test('修正後: H1内服と H1点眼の end_followup.P が同一であること', () => {
    const b1 = makeBlock(h1,  'end_improved', 'ビラノア')
    const b2 = makeBlock(eye, 'end_improved', 'アレジオン点眼')
    assert.equal(b1.closingText, END_CLOSING, `H1内服 end closingText`)
    assert.equal(b2.closingText, END_CLOSING, `H1点眼 end closingText`)
    assert.equal(b1.closingText, b2.closingText, 'Both modules should share the same end closing')
  })

  test('修正後: P には end closing が 1 回だけ現れる（dedup）', () => {
    const b1 = makeBlock(h1,  'end_improved', 'ビラノア')
    const b2 = makeBlock(eye, 'end_improved', 'アレジオン点眼')
    const result = runMerge(b1, [b2])
    const occurrences = result.P.split(END_CLOSING).length - 1
    assert.equal(occurrences, 1,
      `end closing should appear exactly once, got ${occurrences}. P:\n${result.P}`)
  })
})

// ─────────────────────────────────────────────────────────────
// 9. se_followup / end_followup — 意味が異なるので別行に残る
// ─────────────────────────────────────────────────────────────

describe('P合成: 意味が異なる followup は別行に残る', () => {
  const h1  = h1OralData as unknown as ModuleData
  const eye = h1EyeData  as unknown as ModuleData

  const DEFAULT_CLOSING = '次回、引き続き使用できているか、副作用の有無を確認。'
  const END_CLOSING     = '次回、治療経過および体調変化の有無を確認。'
  const SE_CLOSING      = '次回、治療経過および副作用の有無を確認。'

  test('default と se_followup は異なる文字列であること', () => {
    assert.notEqual(DEFAULT_CLOSING, SE_CLOSING)
  })

  test('default と end_followup は異なる文字列であること', () => {
    assert.notEqual(DEFAULT_CLOSING, END_CLOSING)
  })

  test('se_followup と end_followup は異なる文字列であること', () => {
    assert.notEqual(SE_CLOSING, END_CLOSING)
  })

  test('H1内服(default) + H1点眼(se_followup): closing は 2 行に残る', () => {
    // initial_nasal → default_followup / se_mild_continue → se_followup
    const b1 = makeBlock(h1,  'initial_nasal',    'ビラノア')
    const b2 = makeBlock(eye, 'se_mild_continue', 'アレジオン点眼')
    const result = runMerge(b1, [b2])
    assert.ok(result.P.includes(DEFAULT_CLOSING), `P should contain default closing`)
    assert.ok(result.P.includes(SE_CLOSING),       `P should contain se closing`)
    const occurrencesDefault = result.P.split(DEFAULT_CLOSING).length - 1
    const occurrencesSE      = result.P.split(SE_CLOSING).length - 1
    assert.equal(occurrencesDefault, 1, `default closing should appear once`)
    assert.equal(occurrencesSE, 1,      `se closing should appear once`)
  })
})

// ─────────────────────────────────────────────────────────────
// 10. H1内服4剤合成: default / default / end / default
//     連続する同一 closing のみ統合 → P_CLOSING は 3 行
//     構成:
//       1剤目 initial_nasal        → default_followup
//       2剤目 initial_pruritus     → default_followup  （1剤目と連続同一 → 統合）
//       3剤目 end_improved         → end_followup      （異なる → 別行）
//       4剤目 cp_poor_missed_doses → default_followup  （end の後 → 非連続 → 別行）
//     期待: P_CLOSING = default(1回) → end(1回) → default(1回)  計3出現
// ─────────────────────────────────────────────────────────────

describe('P合成: H1内服4剤混在 (default/default/end/default → closing は 3 行)', () => {
  const h1 = h1OralData as unknown as ModuleData

  const DEFAULT_CLOSING = '次回、引き続き使用できているか、副作用の有無を確認。'
  const END_CLOSING     = '次回、治療経過および体調変化の有無を確認。'

  // 前提確認: 各シナリオの closingText が想定通りであること
  test('initial_nasal の closingText が default_followup であること', () => {
    const b = makeBlock(h1, 'initial_nasal', 'A')
    assert.equal(b.closingText, DEFAULT_CLOSING)
  })

  test('initial_pruritus の closingText が default_followup であること', () => {
    const b = makeBlock(h1, 'initial_pruritus', 'A')
    assert.equal(b.closingText, DEFAULT_CLOSING)
  })

  test('end_improved の closingText が end_followup であること', () => {
    const b = makeBlock(h1, 'end_improved', 'A')
    assert.equal(b.closingText, END_CLOSING)
  })

  test('cp_poor_missed_doses の closingText が default_followup であること', () => {
    const b = makeBlock(h1, 'cp_poor_missed_doses', 'A')
    assert.equal(b.closingText, DEFAULT_CLOSING)
  })

  // P_CLOSING 出現回数の検証
  test('P に default_followup が 2 回出現する（1+2剤目統合 + 4剤目）', () => {
    const b1 = makeBlock(h1, 'initial_nasal',       'ビラノア')
    const b2 = makeBlock(h1, 'initial_pruritus',    'アレグラ')
    const b3 = makeBlock(h1, 'end_improved',        'ザイザル')
    const b4 = makeBlock(h1, 'cp_poor_missed_doses','クラリチン')
    const result = runMerge(b1, [b2, b3, b4])
    const count = result.P.split(DEFAULT_CLOSING).length - 1
    assert.equal(count, 2,
      `default closing should appear 2 times (1+2 merged, 4th separate), got ${count}. P:\n${result.P}`)
  })

  test('P に end_followup が 1 回だけ出現する', () => {
    const b1 = makeBlock(h1, 'initial_nasal',       'ビラノア')
    const b2 = makeBlock(h1, 'initial_pruritus',    'アレグラ')
    const b3 = makeBlock(h1, 'end_improved',        'ザイザル')
    const b4 = makeBlock(h1, 'cp_poor_missed_doses','クラリチン')
    const result = runMerge(b1, [b2, b3, b4])
    const count = result.P.split(END_CLOSING).length - 1
    assert.equal(count, 1,
      `end closing should appear exactly once, got ${count}. P:\n${result.P}`)
  })

  // P_CLOSING の出現順序の検証
  test('P_CLOSING の出現順序が default → end → default であること', () => {
    const b1 = makeBlock(h1, 'initial_nasal',       'ビラノア')
    const b2 = makeBlock(h1, 'initial_pruritus',    'アレグラ')
    const b3 = makeBlock(h1, 'end_improved',        'ザイザル')
    const b4 = makeBlock(h1, 'cp_poor_missed_doses','クラリチン')
    const result = runMerge(b1, [b2, b3, b4])
    const firstDefault = result.P.indexOf(DEFAULT_CLOSING)
    const firstEnd     = result.P.indexOf(END_CLOSING)
    const lastDefault  = result.P.lastIndexOf(DEFAULT_CLOSING)
    assert.ok(firstDefault >= 0, `P should contain default closing`)
    assert.ok(firstEnd     >= 0, `P should contain end closing`)
    assert.ok(firstDefault < firstEnd,
      `first default closing should appear before end closing`)
    assert.ok(firstEnd < lastDefault,
      `end closing should appear before second default closing`)
  })

  // P 本文に薬剤名が含まれること
  // cp_poor_missed_doses の P テンプレートには {{drug_subject}} がないため薬剤名は展開されない。
  // 代わりに同シナリオ固有のテキストで確認する。
  test('P に 3 剤の薬剤名が含まれ、cp シナリオ固有テキストが含まれる', () => {
    const b1 = makeBlock(h1, 'initial_nasal',       'ビラノア')
    const b2 = makeBlock(h1, 'initial_pruritus',    'アレグラ')
    const b3 = makeBlock(h1, 'end_improved',        'ザイザル')
    const b4 = makeBlock(h1, 'cp_poor_missed_doses','クラリチン')
    const result = runMerge(b1, [b2, b3, b4])
    assert.ok(result.P.includes('ビラノア'), `P should contain ビラノア`)
    assert.ok(result.P.includes('アレグラ'), `P should contain アレグラ`)
    assert.ok(result.P.includes('ザイザル'), `P should contain ザイザル`)
    // cp_poor_missed_doses は {{drug_subject}} なし — シナリオ固有テキストで確認
    assert.ok(result.P.includes('服薬忘れ'), `P should contain cp scenario text (服薬忘れ)`)
  })

  // 非連続 default_followup が全体 dedup されないことの確認
  test('連続していない default_followup は全体 dedup されない（2 回出現を維持）', () => {
    const b1 = makeBlock(h1, 'initial_nasal',       'ビラノア')
    const b2 = makeBlock(h1, 'initial_pruritus',    'アレグラ')
    const b3 = makeBlock(h1, 'end_improved',        'ザイザル')
    const b4 = makeBlock(h1, 'cp_poor_missed_doses','クラリチン')
    const result = runMerge(b1, [b2, b3, b4])
    const count = result.P.split(DEFAULT_CLOSING).length - 1
    // 全体 dedup されていれば 1 回になってしまう → 2 回であることを確認
    assert.ok(count >= 2,
      `Non-consecutive default closings must NOT be globally deduped: got ${count} (expected ≥2). P:\n${result.P}`)
  })
})
