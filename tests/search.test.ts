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
import { buildSearchIndex, getDrugSuggestions, getSuggestions, normalizeText } from '../lib/search'

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

// ─────────────────────────────────────────────────────────────
// 7. matchPolicy opt-in: 塩名header抑制 + tier優先順位（メトホルミン/ピオグリタゾン）
// ─────────────────────────────────────────────────────────────

describe('⑦ メトホルミン系: preferOwnNameMatchOverGenericMatch / suppressRedundantGenericHeaderOnDirectMatch', () => {
  test('"めとほる" → メトホルミン/メトグルコ/グリコランの順、メトアナ/メタクトが後続、メトホルミン塩酸塩は非表示', () => {
    const results = getDrugSuggestions('めとほる', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.equal(labels[0], 'メトホルミン', `1位はメトホルミンであるべき: ${JSON.stringify(labels)}`)
    assert.equal(labels[1], 'メトグルコ', `2位はメトグルコであるべき: ${JSON.stringify(labels)}`)
    assert.equal(labels[2], 'グリコラン', `3位はグリコランであるべき: ${JSON.stringify(labels)}`)
    assert.ok(
      results.some(r => r.moduleId === 'dm_dpp4_biguanide_combination_oral'),
      'メトアナ（配合剤）が候補に含まれるべき',
    )
    assert.ok(
      results.some(r => r.moduleId === 'dm_thiazolidinedione_biguanide_combination_oral'),
      'メタクト（配合剤）が候補に含まれるべき',
    )
    assert.ok(
      !labels.includes('メトホルミン塩酸塩'),
      'メトホルミン塩酸塩が独立候補として表示されてはならない',
    )
  })

  test('"めとほるみんえんさんえん" → メトホルミン系候補へ到達し、メトホルミン塩酸塩の独立候補は出ない', () => {
    const results = getDrugSuggestions('めとほるみんえんさんえん', fullIndex, 8)
    assert.ok(results.length > 0, '候補が1件も返らない')
    assert.equal(results[0].drugDisplayLabel, 'メトホルミン', `1位はメトホルミンであるべき: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`)
    assert.equal(results[0].matchedBrandName, 'メトホルミン')
    assert.ok(
      !results.some(r => r.drugDisplayLabel === 'メトホルミン塩酸塩'),
      'メトホルミン塩酸塩が独立候補として表示されてはならない',
    )
  })

  test('主語解決条件（drugDisplayLabel === matchedBrandName）: メトホルミン/メトグルコ/グリコラン', () => {
    const results = getDrugSuggestions('めとほる', fullIndex, 8)
    for (const brand of ['メトホルミン', 'メトグルコ', 'グリコラン']) {
      const item = results.find(r => r.matchedBrandName === brand)
      assert.ok(item, `${brand} の候補が見つからない`)
      assert.equal(
        item!.drugDisplayLabel, brand,
        `${brand} 選択時の drugDisplayLabel は matchedBrandName と一致し、{{drug_subject}} が ${brand} に解決される必要がある`,
      )
    }
  })
})

describe('⑧ ピオグリタゾン系: preferOwnNameMatchOverGenericMatch / suppressRedundantGenericHeaderOnDirectMatch', () => {
  test('"ぴおぐり" → ピオグリタゾン/アクトスの順、配合剤はその後、ピオグリタゾン塩酸塩は非表示', () => {
    const results = getDrugSuggestions('ぴおぐり', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.equal(labels[0], 'ピオグリタゾン', `1位はピオグリタゾンであるべき: ${JSON.stringify(labels)}`)
    assert.equal(labels[1], 'アクトス', `2位はアクトスであるべき: ${JSON.stringify(labels)}`)
    const monoIndices = [0, 1]
    const comboIndex = results.findIndex(r => r.moduleId !== 'dm_thiazolidinedione_pioglitazone_oral')
    assert.ok(comboIndex === -1 || comboIndex > Math.max(...monoIndices), '配合剤は単剤候補より後ろに表示されるべき')
    assert.ok(
      !labels.includes('ピオグリタゾン塩酸塩'),
      'ピオグリタゾン塩酸塩が独立候補として表示されてはならない',
    )
  })

  test('"ぴおぐりたぞんえんさんえん" → ピオグリタゾン系候補へ到達し、ピオグリタゾン塩酸塩の独立候補は出ない', () => {
    const results = getDrugSuggestions('ぴおぐりたぞんえんさんえん', fullIndex, 8)
    assert.ok(results.length > 0, '候補が1件も返らない')
    assert.equal(results[0].drugDisplayLabel, 'ピオグリタゾン', `1位はピオグリタゾンであるべき: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`)
    assert.equal(results[0].matchedBrandName, 'ピオグリタゾン')
    assert.ok(
      !results.some(r => r.drugDisplayLabel === 'ピオグリタゾン塩酸塩'),
      'ピオグリタゾン塩酸塩が独立候補として表示されてはならない',
    )
  })

  test('主語解決条件（drugDisplayLabel === matchedBrandName）: ピオグリタゾン/アクトス/メタクト（配合剤）', () => {
    const results = getDrugSuggestions('ぴおぐり', fullIndex, 8)
    for (const brand of ['ピオグリタゾン', 'アクトス', 'メタクト']) {
      // 配合剤（メタクト等）は genericMode ヘッダー候補（isGenericLabel=true）と
      // ブランド本体候補の2件を持ちうるため、ブランド本体（drugDisplayLabel === brand）側を見る。
      const item = results.find(r => r.matchedBrandName === brand && r.drugDisplayLabel === brand)
      assert.ok(item, `${brand} の候補（ブランド本体）が見つからない`)
      assert.equal(
        item!.drugDisplayLabel, brand,
        `${brand} 選択時の drugDisplayLabel は matchedBrandName と一致し、{{drug_subject}} が ${brand} に解決される必要がある`,
      )
    }
  })
})

describe('⑨ opt-in未設定モジュールの回帰確認（候補順・件数が変化しないこと）', () => {
  test('"とらにらすと" → 既存のgenericMode構造を維持', () => {
    const results = getDrugSuggestions('とらにらすと', fullIndex, 8)
    assert.equal(results.length, 4)
    assert.equal(results[0].drugDisplayLabel, 'トラニラスト点眼液')
    assert.equal(results[0].isGenericLabel, true)
  })

  test('"いんすりんりすぷろ" → 既存のgenericMode構造を維持', () => {
    const results = getDrugSuggestions('いんすりんりすぷろ', fullIndex, 8)
    assert.equal(results.length, 5)
    assert.equal(results[0].drugDisplayLabel, 'インスリンリスプロ')
    assert.equal(results[0].isGenericLabel, true)
  })

  test('"あくとす"（正式ブランド名検索）→ アクトス1件のみ、順位不変', () => {
    const results = getDrugSuggestions('あくとす', fullIndex, 8)
    assert.equal(results.length, 1, `候補は1件のみのはず: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`)
    assert.equal(results[0].matchedBrandName, 'アクトス')
  })

  test('"めとぐるこ" → メトグルコ1件のみ', () => {
    const results = getDrugSuggestions('めとぐるこ', fullIndex, 8)
    assert.equal(results.length, 1)
    assert.equal(results[0].matchedBrandName, 'メトグルコ')
  })

  test('"ぐりこらん" → グリコラン1件のみ', () => {
    const results = getDrugSuggestions('ぐりこらん', fullIndex, 8)
    assert.equal(results.length, 1)
    assert.equal(results[0].matchedBrandName, 'グリコラン')
  })

  test('"ぐらく" → グラクティブが上位、アレグラは含まれない（既存回帰）', () => {
    const results = getDrugSuggestions('ぐらく', fullIndex, 8)
    assert.ok(results.length > 0)
    assert.equal(results[0].matchedBrandName, 'グラクティブ')
    assert.ok(!results.some(r => r.matchedBrandName === 'アレグラ'))
  })

  test('"ひるどいど" → 件数は変化せず、score同点の3剤形は表示名の自然な順で並ぶ', () => {
    // ヒルドイドソフト軟膏はnameAliases完全一致(score5)で単独首位。
    // クリーム/フォーム/ローションはscore4で同点のため、originalIndex（登録順）ではなく
    // 解決済み表示名の日本語順（クリーム→フォーム→ローション）で並ぶ。
    const results = getDrugSuggestions('ひるどいど', fullIndex, 8)
    assert.equal(results.length, 8)
    assert.equal(results[0].matchedBrandName, 'ヒルドイドソフト軟膏')
    assert.equal(results[1].matchedBrandName, 'ヒルドイドクリーム')
    assert.equal(results[2].matchedBrandName, 'ヒルドイドフォーム')
    assert.equal(results[3].matchedBrandName, 'ヒルドイドローション')
  })

  test('"もんてるかすと" → 候補順・件数が変化しない', () => {
    const results = getDrugSuggestions('もんてるかすと', fullIndex, 8)
    assert.equal(results.length, 4)
    assert.equal(results[0].matchedBrandName, 'キプレス')
    assert.equal(results[1].matchedBrandName, 'シングレア')
  })
})

// ─────────────────────────────────────────────────────────────
// 10. 一般名見出し候補は displayGenericName のみから生成される（塩類名フォールバック廃止）
// ─────────────────────────────────────────────────────────────

describe('⑩ 一般名見出し候補の displayGenericName 一本化', () => {
  test('"いめぐりみん" → 一般名見出し候補の表示値が displayGenericName（塩類名なし）', () => {
    const results = getDrugSuggestions('いめぐりみん', fullIndex, 8)
    const genericHeader = results.find(r => r.isGenericLabel)
    assert.ok(genericHeader, '一般名見出し候補が見つからない')
    assert.equal(genericHeader!.drugDisplayLabel, 'イメグリミン')
    assert.equal(genericHeader!.uiLabel, 'イメグリミン')
    assert.ok(
      !genericHeader!.drugDisplayLabel?.includes('塩酸塩'),
      '一般名見出し候補の表示値に塩類名が混入してはならない',
    )
  })

  test('ブランド候補側（"ツイミーグ（イメグリミン）"）にも塩類名が混入しない', () => {
    const results = getDrugSuggestions('いめぐりみん', fullIndex, 8)
    const brandCandidate = results.find(r => r.matchedBrandName === 'ツイミーグ' && !r.isGenericLabel)
    assert.ok(brandCandidate, 'ブランド候補（ツイミーグ）が見つからない')
    assert.ok(
      !brandCandidate!.uiLabel?.includes('塩酸塩'),
      `ブランド候補の uiLabel に塩類名が混入している: "${brandCandidate!.uiLabel}"`,
    )
    // 商品名選択時の {{drug_subject}} 解決値そのものは商品名（ブランド名）
    assert.equal(brandCandidate!.drugDisplayLabel, 'ツイミーグ')
  })
})

// ─────────────────────────────────────────────────────────────
// 11. crossModuleIndicationLabel: SGLT2 糖尿病/心腎モジュール横断の適応ラベル表示
// ─────────────────────────────────────────────────────────────

describe('⑪ crossModuleIndicationLabel（SGLT2: dm_sglt2_oral / cardiorenal_sglt2_oral）', () => {
  // ブランド名検索: 直接一致（ブランド×2）→ 対応する一般名（×2）の順で4件
  const brandQueries: Array<{ q: string; brand: string; generic: string; renalOnly?: boolean }> = [
    { q: 'ふぉしー', brand: 'フォシーガ', generic: 'ダパグリフロジン' },
    { q: 'じゃでぃ', brand: 'ジャディアンス', generic: 'エンパグリフロジン' },
    { q: 'かなぐる', brand: 'カナグル', generic: 'カナグリフロジン', renalOnly: true },
  ]
  for (const { q, brand, generic, renalOnly } of brandQueries) {
    test(`ブランド名検索 "${q}" → ${brand}(糖尿病→心腎) → ${generic}(糖尿病→心腎) の4件`, () => {
      const results = getDrugSuggestions(q, fullIndex, 8)
      assert.equal(results.length, 4, `候補は4件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
      const cardio = renalOnly ? '腎' : '心・腎'
      assert.equal(results[0].uiLabel, `${brand}（糖尿病）`)
      assert.equal(results[0].moduleId, 'dm_sglt2_oral')
      assert.ok(!results[0].isGenericLabel)
      assert.equal(results[1].uiLabel, `${brand}（${cardio}）`)
      assert.equal(results[1].moduleId, 'cardiorenal_sglt2_oral')
      assert.ok(!results[1].isGenericLabel)
      assert.equal(results[2].uiLabel, `${generic}（糖尿病）`)
      assert.equal(results[2].moduleId, 'dm_sglt2_oral')
      assert.ok(results[2].isGenericLabel)
      assert.equal(results[3].uiLabel, `${generic}（${cardio}）`)
      assert.equal(results[3].moduleId, 'cardiorenal_sglt2_oral')
      assert.ok(results[3].isGenericLabel)
    })
  }

  // 一般名検索: 直接一致（一般名×2）→ 対応するブランド（×2）の順で4件
  const genericQueries: Array<{ q: string; brand: string; generic: string; renalOnly?: boolean }> = [
    { q: 'だぱ', brand: 'フォシーガ', generic: 'ダパグリフロジン' },
    { q: 'えんぱ', brand: 'ジャディアンス', generic: 'エンパグリフロジン' },
    { q: 'かなぐり', brand: 'カナグル', generic: 'カナグリフロジン', renalOnly: true },
  ]
  for (const { q, brand, generic, renalOnly } of genericQueries) {
    test(`一般名検索 "${q}" → ${generic}(糖尿病→心腎) → ${brand}(糖尿病→心腎) の4件`, () => {
      const results = getDrugSuggestions(q, fullIndex, 8)
        .filter(r => r.moduleId === 'dm_sglt2_oral' || r.moduleId === 'cardiorenal_sglt2_oral')
      assert.equal(results.length, 4, `候補は4件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
      const cardio = renalOnly ? '腎' : '心・腎'
      assert.equal(results[0].uiLabel, `${generic}（糖尿病）`)
      assert.equal(results[0].moduleId, 'dm_sglt2_oral')
      assert.ok(results[0].isGenericLabel)
      assert.equal(results[1].uiLabel, `${generic}（${cardio}）`)
      assert.equal(results[1].moduleId, 'cardiorenal_sglt2_oral')
      assert.ok(results[1].isGenericLabel)
      assert.equal(results[2].uiLabel, `${brand}（糖尿病）`)
      assert.equal(results[2].moduleId, 'dm_sglt2_oral')
      assert.ok(!results[2].isGenericLabel)
      assert.equal(results[3].uiLabel, `${brand}（${cardio}）`)
      assert.equal(results[3].moduleId, 'cardiorenal_sglt2_oral')
      assert.ok(!results[3].isGenericLabel)
    })
  }

  test('カナグル系は心不全適応がないため「心」を含む表記が一切出現しない', () => {
    for (const q of ['かなぐる', 'かなぐり']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      for (const r of results) {
        assert.ok(!r.uiLabel?.includes('心'), `query "${q}": "${r.uiLabel}" に「心」が含まれてはならない`)
      }
    }
  })

  test('検索順位: ブランド名・一般名検索とも「直接一致ペア」「別名ペア」それぞれ内で糖尿病モジュールが心腎モジュールより先に表示される', () => {
    for (const q of ['ふぉしー', 'じゃでぃ', 'かなぐる', 'だぱ', 'えんぱ', 'かなぐり']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
        .filter(r => r.moduleId === 'dm_sglt2_oral' || r.moduleId === 'cardiorenal_sglt2_oral')
      assert.equal(results.length, 4, `query "${q}": 候補は4件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
      // 直接一致ペア（先頭2件）: 糖尿病→心腎
      assert.equal(results[0].moduleId, 'dm_sglt2_oral', `query "${q}": 1件目は糖尿病モジュールのはず`)
      assert.equal(results[1].moduleId, 'cardiorenal_sglt2_oral', `query "${q}": 2件目は心腎モジュールのはず`)
      // 別名ペア（末尾2件）: 糖尿病→心腎
      assert.equal(results[2].moduleId, 'dm_sglt2_oral', `query "${q}": 3件目は糖尿病モジュールのはず`)
      assert.equal(results[3].moduleId, 'cardiorenal_sglt2_oral', `query "${q}": 4件目は心腎モジュールのはず`)
    }
  })

  test('心腎モジュールを持たないSGLT2ブランド（スーグラ/ルセフィ/デベルザ）は従来どおり2件（ブランド・一般名）のみで適応ラベル化されない', () => {
    for (const [q, expectedGeneric] of [
      ['すーぐら', 'イプラグリフロジン'],
      ['るせふぃ', 'ルセオグリフロジン'],
      ['でべるざ', 'トホグリフロジン'],
    ] as const) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      assert.equal(results.length, 2, `query "${q}": 候補は2件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
      const brandCandidate = results.find(r => !r.isGenericLabel)
      const genericCandidate = results.find(r => r.isGenericLabel)
      assert.ok(brandCandidate && genericCandidate, `query "${q}": ブランド・一般名候補が両方見つからない`)
      assert.equal(brandCandidate!.uiLabel, `${brandCandidate!.drugDisplayLabel}（${expectedGeneric}）`)
      assert.equal(genericCandidate!.uiLabel, expectedGeneric)
      assert.ok(
        !brandCandidate!.uiLabel?.includes('糖尿病') && !genericCandidate!.uiLabel?.includes('糖尿病'),
        `query "${q}": 心腎モジュールに存在しないブランドは適応ラベル化されてはならない`,
      )
    }
  })

  test('既存の同一genericKeyモジュール横断集約（インスリンリスプロ）は影響を受けない', () => {
    const results = getDrugSuggestions('いんすりんりすぷろ', fullIndex, 8)
    const header = results.find(r => r.isGenericLabel)
    assert.ok(header, '一般名見出し候補が見つからない')
    assert.equal(header!.uiLabel, 'インスリンリスプロ', '適応ラベルが付与されず従来どおりの表示であるべき')
    // 従来どおりモジュール横断で1件のみに集約されている（重複していない）
    const headerCount = results.filter(r => r.isGenericLabel && r.drugDisplayLabel === 'インスリンリスプロ').length
    assert.equal(headerCount, 1)
  })

  test('crossModuleIndicationLabel 未設定モジュール（トラニラスト点眼液系）の候補構成は従来どおり', () => {
    const results = getDrugSuggestions('とらにらすと', fullIndex, 8)
    assert.equal(results.length, 4)
    assert.equal(results[0].uiLabel, 'トラニラスト点眼液')
    assert.equal(results[1].uiLabel, 'リザベン点眼液（トラニラスト点眼液）')
    assert.equal(results[2].uiLabel, 'トラニラスト点眼液PF')
    assert.equal(results[3].uiLabel, 'トラメラス点眼液PF（トラニラスト点眼液PF）')
  })
})

// ─────────────────────────────────────────────────────────────
// ⑫ 最終 tie-break: score/priority 同点時は originalIndex ではなく
//    解決済み表示名の自然な日本語順で並べる
// ─────────────────────────────────────────────────────────────

describe('⑫ 最終tie-break: 解決済み表示名の自然順（H1: アレジオン/エピナスチン）', () => {
  test('"アレジオン" → 内服が点眼より上位（brandNames配列順に依存しない）', () => {
    const results = getDrugSuggestions('アレジオン', fullIndex, 8)
    const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.ok(oralPos >= 0 && eyePos >= 0, '内服・点眼の両候補が存在するはず（削除されていない）')
    assert.ok(oralPos < eyePos, `内服(${oralPos})が点眼(${eyePos})より上位であるべき`)
  })

  test('"あれじお"（部分入力）でも内服が点眼より上位', () => {
    const results = getDrugSuggestions('あれじお', fullIndex, 8)
    const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.ok(oralPos >= 0 && eyePos >= 0)
    assert.ok(oralPos < eyePos)
  })

  test('"エピナスチン"（一般名）でも内服が点眼より上位', () => {
    const results = getDrugSuggestions('エピナスチン', fullIndex, 8)
    const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.ok(oralPos >= 0 && eyePos >= 0)
    assert.ok(oralPos < eyePos)
  })

  test('"アレジオン 点眼" → 点眼液のみに絞られる（tie-break変更の影響を受けない）', () => {
    const results = getDrugSuggestions('アレジオン 点眼', fullIndex, 8)
    assert.ok(results.every(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops'))
    assert.ok(results.some(r => r.matchedBrandName === 'アレジオン点眼液'))
  })

  test('"アレジオン てんがん" → 点眼液のみに絞られる', () => {
    const results = getDrugSuggestions('アレジオン てんがん', fullIndex, 8)
    assert.ok(results.every(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops'))
  })

  test('getSuggestions() と getDrugSuggestions() で "アレジオン" のmodule順序が一致する', () => {
    const sug = getSuggestions('アレジオン', fullIndex, 10)
    const dr = getDrugSuggestions('アレジオン', fullIndex, 10)
    const sugOrder = [...new Set(sug.map(s => s.moduleId))]
    const drOrder = [...new Set(dr.map(s => s.moduleId))]
    assert.deepEqual(sugOrder, drOrder, '本番経路(getDrugSuggestions)と非本番経路(getSuggestions)で順序が食い違ってはならない')
  })
})

describe('⑬ 最終tie-break: score同点だった35module横断ケースへの影響（許容された仕様変更）', () => {
  test('"せまぐるちど"（GLP-1 内服/注射）: 候補数は変化せず3件のまま（generic header dedupは今回の対象外）', () => {
    const results = getDrugSuggestions('せまぐるちど', fullIndex, 8)
    assert.equal(results.length, 3, 'generic header統合仕様（別問題）により3件のまま変化しないはず')
    assert.ok(results.some(r => r.moduleId === 'dm_glp1ra_semaglutide_oral'))
    assert.ok(results.some(r => r.moduleId === 'dm_glp1ra_injection'))
    const header = results.find(r => r.isGenericLabel)
    assert.equal(header?.drugDisplayLabel, 'セマグルチド', 'generic headerのdedup key構造は変化しない')
  })

  test('インスリン系の一般名見出し集約（インスリンリスプロ）は影響を受けない（既存回帰の再確認）', () => {
    const results = getDrugSuggestions('いんすりんりすぷろ', fullIndex, 8)
    const headerCount = results.filter(r => r.isGenericLabel && r.drugDisplayLabel === 'インスリンリスプロ').length
    assert.equal(headerCount, 1, 'dedup key構造は変化しないため従来どおり1件のはず')
  })

  test('候補が丸ごと消失していない（35module全体の代表クエリでの件数サニティチェック）', () => {
    for (const q of ['ひるどいど', 'せまぐるちど', 'アレジオン', 'とらにらすと', 'いんすりんりすぷろ']) {
      const before = getDrugSuggestions(q, fullIndex, 20)
      assert.ok(before.length > 0, `"${q}": 候補が0件になってはならない`)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// 14. genericMode の表示枠制御（枠逼迫時のみ brand 行を見出しより優先）
// ─────────────────────────────────────────────────────────────
//
// 成分名を共有する配合剤が複数 group へ展開されるクエリでは、一般名見出しと
// brand 行がそれぞれ 1 枠ずつ消費するため、見出しが枠の半分を占めて brand 行が
// 表示枠外へ押し出されることがある。ユーザーが候補として選択できるのは brand 行
// のみ（見出し選択では brand が確定しない）ため、枠が不足する場面に限り brand 行
// を優先する。枠に余裕がある場合は従来の宣言順（見出し→brand 行）を維持する。

describe('⑭ genericMode 表示枠制御', () => {
  test('N-1: 枠に余裕がある場合は従来どおり一般名見出しが先頭に来る', () => {
    for (const q of ['とらにらすと', 'いんすりんりすぷろ']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      assert.ok(results.length > 0, `"${q}": 候補が0件になってはならない`)
      assert.equal(
        results[0].isGenericLabel, true,
        `"${q}": 枠に余裕がある場合は一般名見出しが先頭のまま維持されるべき: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`,
      )
    }
  })

  test('N-3: 表示枠制御が働いても limit 契約を超えない', () => {
    for (const q of ['い', 'いんすりん', 'り', 'で', 'ぐり', 'あす']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      assert.ok(results.length <= 8, `"${q}": limit を超えてはならない（${results.length}件）`)
    }
  })

  test('N-4: 適応ラベル付き一般名見出しは後回し対象に含めない', () => {
    // crossModuleIndicationLabel が有効な genericKey（SGLT2）では、
    // 見出しが適応ラベル付き（「エンパグリフロジン（糖尿病）」等）で表示される。
    for (const q of ['えんぱぐりふろじん', 'かなぐりふろじん', 'だぱぐりふろじん']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      const indicationHeaders = results.filter(
        r => r.isGenericLabel && r.uiLabel !== undefined && r.uiLabel !== r.drugDisplayLabel,
      )
      assert.ok(
        indicationHeaders.length > 0,
        `"${q}": 適応ラベル付き見出しが表示されるべき: ${JSON.stringify(results.map(r => r.uiLabel ?? r.drugDisplayLabel))}`,
      )
    }
  })

  test('N-2: 枠逼迫時は brand 行が見出しより優先される（見出しは候補集合から失われない）', () => {
    // "い" は候補が多く genericMode が残り枠を超えるため、後回し制御が働く。
    const limited = getDrugSuggestions('い', fullIndex, 8)
    assert.ok(limited.length <= 8)
    const brandRows = limited.filter(r => !r.isGenericLabel)
    assert.ok(
      brandRows.length > 0,
      `枠逼迫時は brand 行が表示されるべき: ${JSON.stringify(limited.map(r => r.drugDisplayLabel))}`,
    )
    // limit を広げれば見出しも従来どおり得られる（候補生成側では失われていない）
    const unlimited = getDrugSuggestions('い', fullIndex, 1000)
    assert.ok(
      unlimited.some(r => r.isGenericLabel),
      '候補生成レベルでは一般名見出しが保持されているべき',
    )
  })
})
