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

  test('"ひるどいど" → 候補順・件数が変化しない（先発品優先モジュールの代表検索）', () => {
    const results = getDrugSuggestions('ひるどいど', fullIndex, 8)
    assert.equal(results.length, 8)
    assert.equal(results[0].matchedBrandName, 'ヒルドイドソフト軟膏')
    assert.equal(results[1].matchedBrandName, 'ヒルドイドクリーム')
    assert.equal(results[2].matchedBrandName, 'ヒルドイドローション')
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
  test('ブランド名検索 "ふぉしーが" → 糖尿病・心腎の2件が適応ラベル付きで表示される', () => {
    const results = getDrugSuggestions('ふぉしーが', fullIndex, 8)
    assert.equal(results.length, 2, `候補は2件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
    assert.equal(results[0].moduleId, 'dm_sglt2_oral')
    assert.equal(results[0].uiLabel, 'フォシーガ（糖尿病）')
    assert.equal(results[1].moduleId, 'cardiorenal_sglt2_oral')
    assert.equal(results[1].uiLabel, 'フォシーガ（心・腎）')
  })

  test('ブランド名検索 "じゃでぃあんす" → 糖尿病・心腎の2件が適応ラベル付きで表示される', () => {
    const results = getDrugSuggestions('じゃでぃあんす', fullIndex, 8)
    assert.equal(results.length, 2)
    assert.equal(results[0].uiLabel, 'ジャディアンス（糖尿病）')
    assert.equal(results[1].uiLabel, 'ジャディアンス（心・腎）')
  })

  test('ブランド名検索 "かなぐる" → 心不全適応なしのため「腎」単独ラベルになる', () => {
    const results = getDrugSuggestions('かなぐる', fullIndex, 8)
    assert.equal(results.length, 2)
    assert.equal(results[0].uiLabel, 'カナグル（糖尿病）')
    assert.equal(results[1].uiLabel, 'カナグル（腎）')
    assert.ok(!results[1].uiLabel?.includes('心'), 'カナグルは心不全適応がないため「心」を含んではならない')
  })

  test('一般名検索 "だぱぐりふろじん" → 糖尿病・心腎の2件が適応ラベル付きで表示される', () => {
    const results = getDrugSuggestions('だぱぐりふろじん', fullIndex, 8)
    assert.equal(results.length, 2, `候補は2件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
    assert.equal(results[0].moduleId, 'dm_sglt2_oral')
    assert.equal(results[0].uiLabel, 'ダパグリフロジン（糖尿病）')
    assert.ok(results[0].isGenericLabel)
    assert.equal(results[1].moduleId, 'cardiorenal_sglt2_oral')
    assert.equal(results[1].uiLabel, 'ダパグリフロジン（心・腎）')
    assert.ok(results[1].isGenericLabel)
  })

  test('一般名検索 "えんぱぐりふろじん" → 糖尿病・心腎の2件が適応ラベル付きで表示される', () => {
    const results = getDrugSuggestions('えんぱぐりふろじん', fullIndex, 8)
    const sglt2Results = results.filter(r => r.moduleId === 'dm_sglt2_oral' || r.moduleId === 'cardiorenal_sglt2_oral')
    assert.equal(sglt2Results.length, 2)
    assert.equal(sglt2Results[0].uiLabel, 'エンパグリフロジン（糖尿病）')
    assert.equal(sglt2Results[1].uiLabel, 'エンパグリフロジン（心・腎）')
  })

  test('一般名検索 "かなぐりふろじん" → 糖尿病は「糖尿病」、心腎は「腎」単独ラベル', () => {
    const results = getDrugSuggestions('かなぐりふろじん', fullIndex, 8)
    const sglt2Results = results.filter(r => r.moduleId === 'dm_sglt2_oral' || r.moduleId === 'cardiorenal_sglt2_oral')
    assert.equal(sglt2Results.length, 2)
    assert.equal(sglt2Results[0].uiLabel, 'カナグリフロジン（糖尿病）')
    assert.equal(sglt2Results[1].uiLabel, 'カナグリフロジン（腎）')
  })

  test('検索順位: ブランド名・一般名検索とも糖尿病モジュールが心腎モジュールより先に表示される', () => {
    for (const q of ['ふぉしーが', 'じゃでぃあんす', 'かなぐる', 'だぱぐりふろじん', 'えんぱぐりふろじん', 'かなぐりふろじん']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
        .filter(r => r.moduleId === 'dm_sglt2_oral' || r.moduleId === 'cardiorenal_sglt2_oral')
      const diabetesIdx = results.findIndex(r => r.moduleId === 'dm_sglt2_oral')
      const cardiorenalIdx = results.findIndex(r => r.moduleId === 'cardiorenal_sglt2_oral')
      assert.ok(diabetesIdx >= 0 && cardiorenalIdx >= 0, `query "${q}": 両モジュールの候補が揃っていない`)
      assert.ok(diabetesIdx < cardiorenalIdx, `query "${q}": 糖尿病モジュールが心腎モジュールより先に表示されるべき`)
    }
  })

  test('心腎モジュールを持たないSGLT2ブランド（スーグラ/ルセフィ/デベルザ）は従来どおり一般名表示のまま', () => {
    for (const [q, expectedGeneric] of [
      ['すーぐら', 'イプラグリフロジン'],
      ['るせふぃ', 'ルセオグリフロジン'],
      ['でべるざ', 'トホグリフロジン'],
    ] as const) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      const brandCandidate = results.find(r => !r.isGenericLabel)
      assert.ok(brandCandidate, `query "${q}": ブランド候補が見つからない`)
      assert.equal(brandCandidate!.uiLabel, `${brandCandidate!.drugDisplayLabel}（${expectedGeneric}）`)
      assert.ok(
        !brandCandidate!.uiLabel?.includes('糖尿病'),
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
})
