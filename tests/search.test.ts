/**
 * search.test.ts
 *
 * lib/search.ts の回帰テスト。
 *
 * 対象不具合:
 *   - globalCorpus / per-scenario corpus が単一結合文字列だったため、
 *     トークン境界をまたいだ偶然の部分一致（ゴースト一致）が発生していた
 *     （例: "アレグラ"+"クラリチン" の境界に "ぐらく" が偶然出現し、
 *      "ぐらく" で検索すると無関係な dm_dpp4_oral の「グラクティブ」より
 *      allergy_h1_antihistamine_second_gen_oral の「アレグラ」が先に出る）
 *   - ブランド名を解決できず corpus 部分一致だけで残った弱い候補が
 *     genericMode バケツに混在し、正当な direct 一致より優先表示されていた
 *
 * 修正:
 *   - SearchEntry.corpus（string）→ corpusTokens（string[]）。
 *     各トークンを個別に normalizeText() してから配列として保持し、
 *     部分一致は corpusTokens.some(t => t.includes(q)) で単一トークン内のみ判定する。
 *   - getDrugSuggestions() に lowConfidence バケツを追加し、ブランド未解決の
 *     弱い候補は genericMode/direct/sibling/genericHeader をすべて処理した後、
 *     残り枠がある場合のみ末尾に追加する。
 *
 * 実行:
 *   npx tsx --test tests/search.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, normalizeText } from '../lib/search'

const fullIndex = ALL_MODULES.flatMap(m => buildSearchIndex(m))

// ─────────────────────────────────────────────────────────────
// 1. 今回の回帰テスト（"ぐらく"）
// ─────────────────────────────────────────────────────────────

describe('① 境界またぎゴースト一致の回帰（"ぐらく"）', () => {
  test('グラクティブが最上位、アレグラは候補に含まれない', () => {
    const results = getDrugSuggestions('ぐらく', fullIndex, 8)
    assert.ok(results.length > 0, '候補が1件も返らない')
    assert.equal(results[0].matchedBrandName, 'グラクティブ')
    assert.ok(
      !results.some(r => r.matchedBrandName === 'アレグラ' || r.drugDisplayLabel === 'アレグラ'),
      'アレグラが候補に含まれてはならない',
    )
  })

  test('corpusTokens にブランド境界をまたいだ結合文字列が存在しない', () => {
    const allergyIndex = buildSearchIndex(
      ALL_MODULES.find(m => m.moduleId === 'allergy_h1_antihistamine_second_gen_oral')!,
    )
    const q = normalizeText('ぐらく')
    for (const entry of allergyIndex) {
      assert.ok(
        !entry.corpusTokens.some(t => t.includes(q)),
        `${entry.moduleId} の corpusTokens に境界またぎ一致 "ぐらく" が残存している`,
      )
    }
  })
})

// ─────────────────────────────────────────────────────────────
// 2. 別の境界一致例（"せまり"）
// ─────────────────────────────────────────────────────────────

describe('② 別の境界またぎ実例（"せまり"）', () => {
  test('修正前に確認されたゴースト候補が消え、候補0件になる', () => {
    const results = getDrugSuggestions('せまり', fullIndex, 8)
    assert.equal(results.length, 0, '正当な一致が存在しないため候補は0件であるべき')
  })
})

// ─────────────────────────────────────────────────────────────
// 3. 正式ブランド検索
// ─────────────────────────────────────────────────────────────

describe('③ 正式ブランド検索（前方一致・完全一致）', () => {
  const cases: Array<{ query: string; expectedTopBrand: string }> = [
    { query: 'ぐらくてぃぶ', expectedTopBrand: 'グラクティブ' },
    { query: 'あれぐら', expectedTopBrand: 'アレグラ' },
    { query: 'くらりちん', expectedTopBrand: 'クラリチン' },
  ]

  for (const { query, expectedTopBrand } of cases) {
    test(`"${query}" → ${expectedTopBrand} が最上位`, () => {
      const results = getDrugSuggestions(query, fullIndex, 8)
      assert.ok(results.length > 0, `"${query}" で候補が1件も返らない`)
      assert.equal(results[0].matchedBrandName, expectedTopBrand)
    })
  }

  test('"じゃぬ"（ブランド名途中までの前方一致）で既存挙動が維持される', () => {
    const results = getDrugSuggestions('じゃぬ', fullIndex, 8)
    assert.ok(results.length > 0)
    assert.ok(
      results.some(r => r.matchedBrandName === 'ジャヌビア'),
      'ジャヌビアが候補に含まれるべき',
    )
  })
})

// ─────────────────────────────────────────────────────────────
// 4. 文字正規化（カタカナ／ひらがな）
// ─────────────────────────────────────────────────────────────

describe('④ カタカナ／ひらがな正規化', () => {
  test('"グラクティブ"（カタカナ）と "ぐらくてぃぶ"（ひらがな）の最上位結果が一致する', () => {
    const kata = getDrugSuggestions('グラクティブ', fullIndex, 8)
    const hira = getDrugSuggestions('ぐらくてぃぶ', fullIndex, 8)
    assert.ok(kata.length > 0 && hira.length > 0)
    assert.equal(kata[0].matchedBrandName, hira[0].matchedBrandName)
    assert.equal(kata[0].moduleId, hira[0].moduleId)
  })
})

// ─────────────────────────────────────────────────────────────
// 5. 一般名検索の回帰（genericMode 構造維持）
// ─────────────────────────────────────────────────────────────

describe('⑤ 一般名検索（genericMode）の既存構造維持', () => {
  test('"とらにらすと" → リザベン/トラメラスPF の genericKey 別グループが維持される', () => {
    const results = getDrugSuggestions('とらにらすと', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.ok(brands.includes('リザベン点眼液'), 'リザベン点眼液が候補に含まれるべき')
    assert.ok(brands.includes('トラメラス点眼液PF'), 'トラメラス点眼液PFが候補に含まれるべき')
    // 一般名検索であり、ブランド名検索（direct）ではないことを確認
    assert.ok(
      results.some(r => r.isGenericLabel),
      '一般名見出し候補（isGenericLabel）が含まれるべき',
    )
  })

  test('"いんすりんりすぷろ" → 同一 genericKey のヒューマログ/ルムジェブが両方候補に含まれる', () => {
    const results = getDrugSuggestions('いんすりんりすぷろ', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.ok(brands.includes('ヒューマログ'), 'ヒューマログが候補に含まれるべき')
    assert.ok(brands.includes('ルムジェブ'), 'ルムジェブが候補に含まれるべき')
  })
})

// ─────────────────────────────────────────────────────────────
// 6. 単一トークン内部の部分一致（keywords）
// ─────────────────────────────────────────────────────────────

describe('⑥ 単一トークン内部の正当な部分一致（keywords）', () => {
  test('keywords の部分文字列で該当モジュールが引き続きヒットする', () => {
    // allergy_h1_antihistamine_eye_drops の keywords に "目のかゆみ" が含まれる
    const results = getDrugSuggestions('目のかゆみ', fullIndex, 8)
    assert.ok(
      results.some(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops'),
      'keywords 部分一致による候補が消えてはならない',
    )
  })

  test('buildSearchIndex の出力: corpusTokens は配列であり、隣接トークンの結合文字列を含まない', () => {
    const mod = ALL_MODULES.find(m => m.moduleId === 'allergy_h1_antihistamine_second_gen_oral')!
    const entries = buildSearchIndex(mod)
    assert.ok(entries.length > 0)
    const entry = entries[0]
    assert.ok(Array.isArray(entry.corpusTokens), 'corpusTokens は配列であるべき')
    // "アレグラ" と "クラリチン" が隣接していても、結合した "あれぐらくらりちん" が
    // 単一トークンとして存在しないこと（各ブランド名は個別トークンのまま）
    assert.ok(
      !entry.corpusTokens.includes('あれぐらくらりちん'),
      '隣接トークンが結合された単一トークンが存在してはならない',
    )
  })
})
