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
import { buildSearchIndex, getDrugSuggestions, getSuggestions, normalizeText, splitGenericComponents } from '../lib/search'

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

  test('"めとほるみんえんさんえん"（塩形読み）は検索面から撤去済み → 0件（SH-1B / Owner D-2）', () => {
    // SH-1B の Owner Decision D-2: 塩/水和物の正式名読みは検索到達性を持たない。
    // 基本一般名読み「めとほるみん」は従来どおり到達する（別テストで担保）。
    const results = getDrugSuggestions('めとほるみんえんさんえん', fullIndex, 8)
    assert.equal(results.length, 0, `塩形読みは候補を返してはならない: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`)
    const base = getDrugSuggestions('めとほるみん', fullIndex, 8)
    assert.equal(base[0]?.drugDisplayLabel, 'メトホルミン', '基本一般名読みは従来どおりメトホルミンへ到達する')
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

  test('"ぴおぐりたぞんえんさんえん"（塩形読み）は検索面から撤去済み → 0件（SH-1B / Owner D-2）', () => {
    // SH-1B の Owner Decision D-2: 塩/水和物の正式名読みは検索到達性を持たない。
    // 基本一般名読み「ぴおぐりたぞん」は従来どおり到達する（別テストで担保）。
    const results = getDrugSuggestions('ぴおぐりたぞんえんさんえん', fullIndex, 8)
    assert.equal(results.length, 0, `塩形読みは候補を返してはならない: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`)
    const base = getDrugSuggestions('ぴおぐりたぞん', fullIndex, 8)
    assert.equal(base[0]?.drugDisplayLabel, 'ピオグリタゾン', '基本一般名読みは従来どおりピオグリタゾンへ到達する')
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

  test('"あくとす"（正式ブランド名検索）→ アクトス自身・同一module内の同一有効成分co-brand・有効成分ピオグリタゾンを含む配合剤へ対称的に到達する（Search Family Phase 1 + Phase 2-A D1）', () => {
    // Phase 1（配合剤成分展開）により、単剤ブランドの直接一致クエリからも
    // 同一有効成分を含む配合剤ブランドへ到達できるようになった
    // （一般名クエリ側は既存どおりこれらへ到達できていた＝候補集合の対称性）。
    // Phase 2-A（Owner Decision D1・2026-09）により、同一module内で genericKey が
    // 意図的に異なる同一有効成分ブランド（ピオグリタゾン＝GE代表名）にも直接クエリから
    // 到達できるようになった（genericKey は書き換えない。co-brand は
    // brandCatalogIngredientMap（genericName）の一致でのみ判定する）。
    // 表示順（Phase 2 の責務）は本テストの対象外とし、集合の中身のみを固定する。
    const results = getDrugSuggestions('あくとす', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.equal(results[0].matchedBrandName, 'アクトス', `1位は先発品ブランド自身であるべき: ${JSON.stringify(brands)}`)
    for (const combo of ['ピオグリタゾン', 'リオベル', 'メタクト', 'ソニアス']) {
      assert.ok(brands.includes(combo), `同一有効成分の co-brand / 配合剤 "${combo}" が候補に含まれるべき: ${JSON.stringify(brands)}`)
    }
    assert.equal(brands.length, 5, `無関係な候補が追加されていないはず: ${JSON.stringify(brands)}`)
  })

  test('"めとぐるこ" → メトグルコ自身・同一module内の同一有効成分co-brand・有効成分メトホルミンを含む配合剤へ対称的に到達する（Search Family Phase 1 + Phase 2-A D1）', () => {
    // Phase 2-A（Owner Decision D1）: メトグルコ/メトホルミン(GE)/グリコランは
    // 用量帯が異なるため genericKey は意図的に別々のまま（書き換えない）だが、
    // 同一有効成分（メトホルミン）の co-brand として直接クエリから互いに到達できる。
    const results = getDrugSuggestions('めとぐるこ', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.equal(results[0].matchedBrandName, 'メトグルコ', `1位は先発品ブランド自身であるべき: ${JSON.stringify(brands)}`)
    for (const combo of ['メトホルミン', 'グリコラン', 'メトアナ', 'エクメット', 'イニシンク', 'メホビル', 'メタクト']) {
      assert.ok(brands.includes(combo), `同一有効成分の co-brand / 配合剤 "${combo}" が候補に含まれるべき: ${JSON.stringify(brands)}`)
    }
    assert.equal(brands.length, 8, `無関係な候補が追加されていないはず: ${JSON.stringify(brands)}`)
  })

  test('"ぐりこらん" → グリコラン自身・同一module内の同一有効成分co-brand・有効成分メトホルミンを含む配合剤へ対称的に到達する（Search Family Phase 1 + Phase 2-A D1）', () => {
    const results = getDrugSuggestions('ぐりこらん', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.equal(results[0].matchedBrandName, 'グリコラン', `1位は先発品ブランド自身であるべき: ${JSON.stringify(brands)}`)
    for (const combo of ['メトグルコ', 'メトホルミン', 'メトアナ', 'エクメット', 'イニシンク', 'メホビル', 'メタクト']) {
      assert.ok(brands.includes(combo), `同一有効成分の co-brand / 配合剤 "${combo}" が候補に含まれるべき: ${JSON.stringify(brands)}`)
    }
    assert.equal(brands.length, 8, `無関係な候補が追加されていないはず: ${JSON.stringify(brands)}`)
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

  test('"もんてるかすと" → 先頭2件の候補順は変化しない。真の重複見出しはPhase 2-A（D2）で除去される', () => {
    // 旧実装は module opt-in フラグ未設定のため、ブランド「モンテルカスト」自身の行と
    // テキストが完全一致する generic header «モンテルカスト» が重複表示されていた
    // （4件）。Phase 2-A（Owner Decision D2）は見出しの要否を module opt-in ではなく
    // 実際の表示テキスト重複で判定するため、この真の重複見出しが除去される（3件）。
    const results = getDrugSuggestions('もんてるかすと', fullIndex, 8)
    assert.equal(results.length, 3, `真に重複する generic header は除去されるべき: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`)
    assert.equal(results[0].matchedBrandName, 'キプレス')
    assert.equal(results[1].matchedBrandName, 'シングレア')
    assert.equal(results[2].matchedBrandName, 'モンテルカスト')
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
  // combo が設定されている行は、Search Family Phase 1（配合剤成分展開）により
  // 5件目として当該配合剤ブランドが lowConfidence 経由で末尾に追加される
  // （既存4件の並び順・isGenericLabel には一切影響しない — ranking 凍結の確認を兼ねる）。
  const brandQueries: Array<{ q: string; brand: string; generic: string; renalOnly?: boolean; combo?: string }> = [
    { q: 'ふぉしー', brand: 'フォシーガ', generic: 'ダパグリフロジン' },
    { q: 'じゃでぃ', brand: 'ジャディアンス', generic: 'エンパグリフロジン', combo: 'トラディアンス（リナグリプチン/エンパグリフロジン）' },
    { q: 'かなぐる', brand: 'カナグル', generic: 'カナグリフロジン', renalOnly: true, combo: 'カナリア（テネリグリプチン/カナグリフロジン）' },
  ]
  for (const { q, brand, generic, renalOnly, combo } of brandQueries) {
    const expectedLength = combo !== undefined ? 5 : 4
    test(`ブランド名検索 "${q}" → ${brand}(糖尿病→心腎) → ${generic}(糖尿病→心腎) の${expectedLength}件`, () => {
      const results = getDrugSuggestions(q, fullIndex, 8)
      assert.equal(results.length, expectedLength, `候補は${expectedLength}件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
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
      if (combo !== undefined) {
        assert.equal(results[4].uiLabel, combo, `Search Family Phase 1: 5件目は配合剤 "${combo}" のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
        assert.ok(!results[4].isGenericLabel)
      }
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
    // すーぐら（イプラグリフロジン）のみ、Search Family Phase 1（配合剤成分展開）により
    // 配合剤スージャヌ（シタグリプチン/イプラグリフロジン）が3件目として末尾に追加される
    // （ルセフィ/デベルザの有効成分を含む配合剤はこのコーパスに存在しないため2件のまま）。
    for (const [q, expectedGeneric, combo] of [
      ['すーぐら', 'イプラグリフロジン', 'スージャヌ（シタグリプチン/イプラグリフロジン）'],
      ['るせふぃ', 'ルセオグリフロジン', undefined],
      ['でべるざ', 'トホグリフロジン', undefined],
    ] as const) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      const expectedLength = combo !== undefined ? 3 : 2
      assert.equal(results.length, expectedLength, `query "${q}": 候補は${expectedLength}件のはず: ${JSON.stringify(results.map(r => r.uiLabel))}`)
      const brandCandidate = results.find(r => !r.isGenericLabel && r.uiLabel !== combo)
      const genericCandidate = results.find(r => r.isGenericLabel)
      assert.ok(brandCandidate && genericCandidate, `query "${q}": ブランド・一般名候補が両方見つからない`)
      assert.equal(brandCandidate!.uiLabel, `${brandCandidate!.drugDisplayLabel}（${expectedGeneric}）`)
      assert.equal(genericCandidate!.uiLabel, expectedGeneric)
      assert.ok(
        !brandCandidate!.uiLabel?.includes('糖尿病') && !genericCandidate!.uiLabel?.includes('糖尿病'),
        `query "${q}": 心腎モジュールに存在しないブランドは適応ラベル化されてはならない`,
      )
      if (combo !== undefined) {
        assert.ok(
          results.some(r => r.uiLabel === combo),
          `query "${q}": Search Family Phase 1 の配合剤 "${combo}" が含まれるべき: ${JSON.stringify(results.map(r => r.uiLabel))}`,
        )
      }
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
// Search Family Phase 2-A（label fix）: ingredient-level co-brand の
// sibling 行 uiLabel は、クエリされたブランドの一般名ではなく sibling
// ブランド自身の displayGenericName を使う。
//
// 旧欠陥: 異なる genericKey を持つ co-brand（例: リザベン点眼液 ⇔
// トラメラス点眼液PF、ヒルドイドフォーム ⇔ ヘパリン類似物質外用スプレー）で、
// sibling 行の括弧内へクエリ側の一般名を流用し PF/非PF・剤形識別が反転していた。
// candidate 集合・順序・drugDisplayLabel・resolution.subject は不変で、
// sibling の uiLabel 括弧内テキストのみを是正する。
// ─────────────────────────────────────────────────────────────
describe('Search Family Phase 2-A（label fix）: co-brand sibling は自身の generic identity を表示する', () => {
  test('"トラメラス"（PF ブランド直接クエリ）→ sibling リザベン点眼液は自身の非PF一般名を表示する', () => {
    const results = getDrugSuggestions('トラメラス', fullIndex, 8)
    // 候補集合・順序・drugDisplayLabel は不変（direct → sibling → generic header）
    assert.deepEqual(
      results.map(r => r.drugDisplayLabel),
      ['トラメラス点眼液PF', 'リザベン点眼液', 'トラニラスト点眼液PF'],
    )
    // direct 行（クエリされたブランド自身）は PF 一般名のまま
    assert.equal(results[0].uiLabel, 'トラメラス点眼液PF（トラニラスト点眼液PF）')
    // sibling 行は sibling 自身の非PF一般名（クエリ側 "トラニラスト点眼液PF" を流用しない）
    assert.equal(results[1].uiLabel, 'リザベン点眼液（トラニラスト点眼液）')
    assert.ok(!results[1].uiLabel!.includes('PF'), 'sibling の括弧内へ PF 識別が混入してはならない')
    // SOAP identity（resolution.subject）は不変
    assert.equal(results[1].resolution.subject, 'リザベン点眼液')
    assert.equal(results[1].resolution.denotation, 'brand')
  })

  test('"リザベン"（非PF ブランド直接クエリ）→ sibling トラメラス点眼液PF は自身のPF一般名を表示する', () => {
    const results = getDrugSuggestions('リザベン', fullIndex, 8)
    assert.deepEqual(
      results.map(r => r.drugDisplayLabel),
      ['リザベン点眼液', 'トラメラス点眼液PF', 'トラニラスト点眼液'],
    )
    assert.equal(results[0].uiLabel, 'リザベン点眼液（トラニラスト点眼液）')
    // sibling 行は sibling 自身のPF一般名（クエリ側 "トラニラスト点眼液" を流用しない）
    assert.equal(results[1].uiLabel, 'トラメラス点眼液PF（トラニラスト点眼液PF）')
    assert.equal(results[1].resolution.subject, 'トラメラス点眼液PF')
  })

  test('PF / 非PF の一般名識別が sibling 行で反転しない（双方向）', () => {
    const fromPF = getDrugSuggestions('トラメラス', fullIndex, 8)
    const fromPlain = getDrugSuggestions('リザベン', fullIndex, 8)
    const sibFromPF = fromPF.find(r => r.matchedBrandName === 'リザベン点眼液')!
    const sibFromPlain = fromPlain.find(r => r.matchedBrandName === 'トラメラス点眼液PF')!
    assert.equal(sibFromPF.uiLabel, 'リザベン点眼液（トラニラスト点眼液）')
    assert.equal(sibFromPlain.uiLabel, 'トラメラス点眼液PF（トラニラスト点眼液PF）')
  })

  test('"ヒルドイドフォーム" ⇔ "ヘパリン類似物質外用スプレー": co-brand sibling は自身の剤形一般名を表示する', () => {
    const fromFoam = getDrugSuggestions('ヒルドイドフォーム', fullIndex, 8)
    const foamSib = fromFoam.find(r => r.matchedBrandName === 'ヘパリン類似物質外用スプレー')!
    assert.equal(foamSib.uiLabel, 'ヘパリン類似物質外用スプレー（ヘパリン類似物質外用スプレー）')
    assert.ok(!foamSib.uiLabel!.includes('フォーム'), 'sibling の括弧内へクエリ側の剤形「フォーム」が混入してはならない')
    assert.equal(foamSib.resolution.subject, 'ヘパリン類似物質外用スプレー')

    const fromSpray = getDrugSuggestions('ヘパリン類似物質外用スプレー', fullIndex, 8)
    const spraySib = fromSpray.find(r => r.matchedBrandName === 'ヒルドイドフォーム')!
    assert.equal(spraySib.uiLabel, 'ヒルドイドフォーム（ヘパリン類似物質フォーム）')
    assert.ok(!spraySib.uiLabel!.includes('スプレー'), 'sibling の括弧内へクエリ側の剤形「スプレー」が混入してはならない')
    assert.equal(spraySib.resolution.subject, 'ヒルドイドフォーム')
  })

  test('同一 genericKey の sibling（従来から安全な経路）は表示不変', () => {
    // "とらにらすと"（generic 読み）は genericMode 経路で genericKey 別グループを
    // それぞれ自身の一般名で表示する（label fix の対象外・凍結）。
    const results = getDrugSuggestions('とらにらすと', fullIndex, 8)
    assert.deepEqual(results.map(r => r.uiLabel), [
      'トラニラスト点眼液',
      'リザベン点眼液（トラニラスト点眼液）',
      'トラニラスト点眼液PF',
      'トラメラス点眼液PF（トラニラスト点眼液PF）',
    ])
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
    // H1点眼（allergy_h1_antihistamine_eye_drops）の preferOwnNameMatchOverGenericMatch
    // 有効化 + DP-18 alias重複排除（本ファイル ⑪ 参照）は、点眼モジュール内部の
    // ブランド/一般名順位（エピナスチン点眼液 vs アレジオン点眼液）を修正するための
    // ものであり、内服モジュール（allergy_h1_antihistamine_second_gen_oral）との
    // 剤形間（クロスダウセージフォーム）表示順には影響しない（Owner Decision）。
    // "エピナスチン" は剤形を一切指定しないクエリであり、既存の内服優先順位を
    // そのまま維持する。剤形intentを含むクエリ（"エピナスチン点眼" 等）が
    // 点眼モジュールを正しく優先することは ⑪ の別テストで検証する。
    const results = getDrugSuggestions('エピナスチン', fullIndex, 8)
    const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.ok(oralPos >= 0 && eyePos >= 0, '内服・点眼の両候補が存在するはず（削除されていない）')
    assert.ok(oralPos < eyePos, `内服(${oralPos})が点眼(${eyePos})より上位であるべき`)
  })

  test('"エピナスチン"（一般名・剤形指定なし）: 点眼モジュール内部ではエピナスチン点眼液がアレジオン点眼液より上位', () => {
    // 上記テストが検証する「剤形間（内服 vs 点眼）の順序」とは独立な軸として、
    // 点眼モジュール内部の「ブランド/一般名順位」を同一クエリで確認する。
    // preferOwnNameMatchOverGenericMatch + DP-18 alias重複排除により、
    // 点眼モジュール内部では常にエピナスチン点眼液（own name/own alias, tier1）が
    // アレジオン点眼液（ペア一般名経由, tier2）より上位になる。
    const results = getDrugSuggestions('エピナスチン', fullIndex, 8)
    const eyeResults = results.filter(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    const genericPos = eyeResults.findIndex(r => r.matchedBrandName === 'エピナスチン点眼液')
    const brandPos = eyeResults.findIndex(r => r.matchedBrandName === 'アレジオン点眼液')
    assert.ok(genericPos >= 0 && brandPos >= 0, '点眼モジュール内でエピナスチン点眼液・アレジオン点眼液の両方が候補に含まれるべき')
    assert.ok(genericPos < brandPos, `点眼モジュール内部ではエピナスチン点眼液(${genericPos})がアレジオン点眼液(${brandPos})より上位であるべき`)
  })

  test('"オロパタジン"（一般名）でも内服（アレロック）が点眼より上位（剤形間順序の別ペアでの再確認）', () => {
    // エピナスチンと同一の剤形間不変条件を、もう一組の H1 ペア（オロパタジン/パタノール）
    // でも確認する。promoteDirectOverGenericMode の抑制条件
    // （exactGenericIdentityModules）は特定ペアに限定されないため、
    // 一般名が複数モジュールにまたがる全てのケースで同様に機能するはず。
    const results = getDrugSuggestions('オロパタジン', fullIndex, 8)
    const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.ok(oralPos >= 0 && eyePos >= 0, '内服・点眼の両候補が存在するはず（削除されていない）')
    assert.ok(oralPos < eyePos, `内服(${oralPos})が点眼(${eyePos})より上位であるべき`)
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

// ─────────────────────────────────────────────────────────────
// 15. H1点眼: preferOwnNameMatchOverGenericMatch による先発/一般名順位修正
//
//   allergy_h1_antihistamine_eye_drops は brandCatalog に先発品4件・一般名品
//   4件を1:1ペアで持つ。一般名を狙ったクエリ（例: "エピナス　テン"）が
//   先発品（アレジオン点眼液）と一般名品（エピナスチン点眼液）で
//   countMatchedTokens が同点になり、宣言順で先発品が先に出ていた不具合の
//   回帰テスト。matchPolicy.preferOwnNameMatchOverGenericMatch を有効化し、
//   各先発品エントリの aliases からペアの一般名読みを除去（DP-18）することで
//   自身の名称一致（tier1）が一般名経由のみの一致（tier2）より優先される。
// ─────────────────────────────────────────────────────────────

describe('⑮ H1点眼: preferOwnNameMatchOverGenericMatch（先発/一般名順位）', () => {
  const H1_PAIRS: Array<{ brand: string; generic: string; brandQuery: string; genericQuery: string; fullReadingQuery: string }> = [
    { brand: 'アレジオン点眼液', generic: 'エピナスチン点眼液', brandQuery: 'アレジオン点眼', genericQuery: 'エピナスチン点眼', fullReadingQuery: 'えぴなすちんてんがん' },
    { brand: 'ザジテン点眼液', generic: 'ケトチフェン点眼液', brandQuery: 'ザジテン点眼', genericQuery: 'ケトチフェン点眼', fullReadingQuery: 'けとちふぇんてんがん' },
    { brand: 'パタノール点眼液', generic: 'オロパタジン点眼液', brandQuery: 'パタノール点眼', genericQuery: 'オロパタジン点眼', fullReadingQuery: 'おろぱたじんてんがん' },
    { brand: 'リボスチン点眼液', generic: 'レボカバスチン点眼液', brandQuery: 'リボスチン', genericQuery: 'レボカバスチン', fullReadingQuery: 'れぼかばすちんてんがん' },
  ]

  test('"エピナス　テン"（全角スペース区切り） → エピナスチン点眼液がアレジオン点眼液より上位', () => {
    const results = getDrugSuggestions('エピナス　テン', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    const genericIdx = labels.indexOf('エピナスチン点眼液')
    const brandIdx = labels.indexOf('アレジオン点眼液')
    assert.ok(genericIdx !== -1 && brandIdx !== -1, `両候補が含まれるべき: ${JSON.stringify(labels)}`)
    assert.ok(genericIdx < brandIdx, `エピナスチン点眼液がアレジオン点眼液より上位であるべき: ${JSON.stringify(labels)}`)
  })

  test('"エピナス テン"（半角スペース区切り） → 同様にエピナスチン点眼液が上位', () => {
    const results = getDrugSuggestions('エピナス テン', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    const genericIdx = labels.indexOf('エピナスチン点眼液')
    const brandIdx = labels.indexOf('アレジオン点眼液')
    assert.ok(genericIdx !== -1 && brandIdx !== -1, `両候補が含まれるべき: ${JSON.stringify(labels)}`)
    assert.ok(genericIdx < brandIdx, `エピナスチン点眼液がアレジオン点眼液より上位であるべき: ${JSON.stringify(labels)}`)
  })

  for (const { brand, generic, brandQuery, genericQuery, fullReadingQuery } of H1_PAIRS) {
    test(`一般名狙いクエリ "${genericQuery}" → ${generic} が ${brand} より上位`, () => {
      const results = getDrugSuggestions(genericQuery, fullIndex, 8)
      const labels = results.map(r => r.drugDisplayLabel)
      const genericIdx = labels.indexOf(generic)
      const brandIdx = labels.indexOf(brand)
      assert.ok(genericIdx !== -1 && brandIdx !== -1, `両候補が含まれるべき: ${JSON.stringify(labels)}`)
      assert.ok(genericIdx < brandIdx, `${generic} が ${brand} より上位であるべき: ${JSON.stringify(labels)}`)
    })

    test(`先発品狙いクエリ "${brandQuery}" → ${brand} が ${generic} より上位（brand対称性）`, () => {
      const results = getDrugSuggestions(brandQuery, fullIndex, 8)
      const labels = results.map(r => r.drugDisplayLabel)
      const brandIdx = labels.indexOf(brand)
      const genericIdx = labels.indexOf(generic)
      assert.ok(brandIdx !== -1 && genericIdx !== -1, `両候補が含まれるべき: ${JSON.stringify(labels)}`)
      assert.ok(brandIdx < genericIdx, `${brand} が ${generic} より上位であるべき: ${JSON.stringify(labels)}`)
    })

    test(`一般名かな全読みクエリ "${fullReadingQuery}" → ${generic} が ${brand} より上位、候補消失なし（本Unitの核心修正）`, () => {
      // ペアの一般名候補が保持する alias（"てんがん" 等の剤形かな読みを含む）を
      // tier2 の一致面として評価できるようにした resolveAllHighPrecisionBrands の
      // 完成（preferOwnNameMatchOverGenericMatch + 同一グルーピングキー限定）により、
      // このクエリ形式でも先発品候補が消失せず、tier1（一般名候補自身）→
      // tier2（ペア先発品）の順で両方到達できる。
      const results = getDrugSuggestions(fullReadingQuery, fullIndex, 8)
      const labels = results.map(r => r.drugDisplayLabel)
      const genericIdx = labels.indexOf(generic)
      const brandIdx = labels.indexOf(brand)
      assert.ok(genericIdx !== -1 && brandIdx !== -1, `"${fullReadingQuery}": 両候補が含まれるべき（候補消失は不可）: ${JSON.stringify(labels)}`)
      assert.ok(genericIdx < brandIdx, `"${fullReadingQuery}": ${generic} が ${brand} より上位であるべき: ${JSON.stringify(labels)}`)
    })
  }

  test('候補集合はクエリごとに変化しない（順序のみが変わる）', () => {
    // "えぴなすちん" は先発品のエイリアスとしては借用されなくなったが、
    // aliasToBrand 経由で一般名品へは到達でき、かつ先発品側は
    // displayGenericName（displayGenericMap）経由で tier2 一致を保つため、
    // 両候補は引き続き同時に返る。
    for (const q of ['えぴなすちん', 'けとちふぇん', 'おろぱたじん', 'れぼかばすちん']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      const h1Labels = results
        .filter(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
        .map(r => r.drugDisplayLabel)
      assert.equal(h1Labels.length, 2, `"${q}": H1候補は先発品・一般名品の2件が返るべき: ${JSON.stringify(h1Labels)}`)
    }
  })

  test('全8製品が自身の名称から到達可能（1位で解決される）', () => {
    for (const brand of Object.keys(
      ALL_MODULES.find(m => m.moduleId === 'allergy_h1_antihistamine_eye_drops')!.drug!.brandCatalog!,
    )) {
      const results = getDrugSuggestions(brand, fullIndex, 8)
      assert.equal(
        results[0]?.matchedBrandName, brand,
        `"${brand}" で検索した際、自身が1位であるべき: ${JSON.stringify(results.map(r => r.matchedBrandName))}`,
      )
    }
  })

  test('広範/曖昧クエリでもH1候補が消失・重複しない: 点眼 / てんがん / ヒスタミン', () => {
    for (const q of ['点眼', 'てんがん', 'ヒスタミン']) {
      const results = getDrugSuggestions(q, fullIndex, 50)
      const h1 = results.filter(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
      const seen = new Set(h1.map(r => r.matchedBrandName))
      assert.equal(seen.size, h1.length, `"${q}": H1候補に重複があってはならない: ${JSON.stringify(h1.map(r => r.matchedBrandName))}`)
    }
  })

  test('既存の一般名見出し挙動は影響を受けない（ダパグリフロジン / 経口オロパタジン）', () => {
    const dapa = getDrugSuggestions('ダパグリフロジン', fullIndex, 8)
    assert.equal(dapa[0]?.resolution?.denotation, 'generic', `ダパグリフロジンは generic 見出しが1位であるべき: ${JSON.stringify(dapa.map(r=>r.drugDisplayLabel))}`)

    const oralOlopa = getDrugSuggestions('オロパタジン', fullIndex, 8)
    const oralEntry = oralOlopa.find(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    assert.ok(oralEntry, '経口オロパタジンの候補が含まれるべき')
    assert.equal(oralEntry!.resolution?.denotation, 'generic', `経口オロパタジンの一般名候補は generic 見出しであるべき`)
  })
})

// ─────────────────────────────────────────────────────────────
// 16. H1点眼: 一般名かな読み「途中入力（前方一致）」での剤形間順序の関係スコープ化
//
//   88dc9d5 で preferOwnNameMatchOverGenericMatch を有効化した際、促進
//   （promoteDirectOverGenericMode）の抑制条件が「別モジュールがクエリと
//   完全に一致する一般名を持つ場合」のみを対象としていたため、一般名かな読みの
//   「完全な読み」以外の前方一致（例:「おろぱた」＝「オロパタジン」の前方一致）では
//   抑制が働かず、H1点眼モジュールが内服モジュールより先に促進されてしまう
//   回帰が生じていた。本ブロックはその回帰の修正を検証する。
//
//   修正方式は「別モジュールがクエリの前方一致条件を満たす一般名を持つ」だけでは
//   不十分とし、そのモジュールが「促進しようとしている自モジュールと同一の
//   有効成分（genericName、剤形非依存）を扱っている」ことを追加で要求する
//   （関係スコープ化）。これにより、無関係な薬効クラスのモジュールが偶然
//   短い読みの前方一致を満たすだけでは促進を抑制しない
//   （例:「め」に前方一致する「メキタジン」＝H1内服ゼスランは、メトホルミン系
//   モジュールとは有効成分を共有しないため、メトホルミンの促進を妨げない）。
// ─────────────────────────────────────────────────────────────

describe('⑯ H1点眼: 一般名前方一致の関係スコープ化（剤形間順序の回帰修正）', () => {
  test('"オロパタ"（前方一致・剤形指定なし） → 内服オロパタジン系が点眼系より上位', () => {
    const results = getDrugSuggestions('オロパタ', fullIndex, 8)
    const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.ok(oralPos >= 0 && eyePos >= 0, '内服・点眼の両候補が存在するはず（削除されていない）')
    assert.ok(oralPos < eyePos, `内服(${oralPos})が点眼(${eyePos})より上位であるべき: ${JSON.stringify(results.map(r => r.matchedBrandName))}`)
  })

  test('"エピナス"（前方一致・剤形指定なし） → 内服エピナスチン系が点眼系より上位', () => {
    const results = getDrugSuggestions('エピナス', fullIndex, 8)
    const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.ok(oralPos >= 0 && eyePos >= 0, '内服・点眼の両候補が存在するはず（削除されていない）')
    assert.ok(oralPos < eyePos, `内服(${oralPos})が点眼(${eyePos})より上位であるべき: ${JSON.stringify(results.map(r => r.matchedBrandName))}`)
  })

  test('代表的な中間かな読み前方一致（おろ／おろぱた／えぴ／えぴなす）でも同様に内服が上位', () => {
    for (const q of ['おろ', 'おろぱた', 'えぴ', 'えぴなす']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
      const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
      assert.ok(oralPos >= 0 && eyePos >= 0, `"${q}": 内服・点眼の両候補が存在するはず`)
      assert.ok(oralPos < eyePos, `"${q}": 内服(${oralPos})が点眼(${eyePos})より上位であるべき`)
    }
  })

  test('完全な一般名読み（オロパタジン／エピナスチン）でも既存どおり内服が上位', () => {
    for (const q of ['オロパタジン', 'エピナスチン']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      const oralPos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
      const eyePos = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
      assert.ok(oralPos >= 0 && eyePos >= 0, `"${q}": 内服・点眼の両候補が存在するはず`)
      assert.ok(oralPos < eyePos, `"${q}": 内服(${oralPos})が点眼(${eyePos})より上位であるべき`)
    }
  })

  test('明示的に点眼を意図したクエリでは、点眼系が正しく先発/一般名の内部順で上位のまま', () => {
    const cases: Array<{ q: string; generic: string; brand: string }> = [
      { q: 'えぴなすちんてんがん', generic: 'エピナスチン点眼液', brand: 'アレジオン点眼液' },
      { q: 'おろぱたじんてんがん', generic: 'オロパタジン点眼液', brand: 'パタノール点眼液' },
    ]
    for (const { q, generic, brand } of cases) {
      const labels = getDrugSuggestions(q, fullIndex, 8).map(r => r.drugDisplayLabel)
      assert.deepEqual(labels, [generic, brand], `"${q}": 点眼系のみ2件、一般名が先発品より上位であるべき: ${JSON.stringify(labels)}`)
    }
  })

  test('無関係な有効成分を持つ別モジュールの前方一致は促進を抑制しない（関係スコープ化の直接検証）', () => {
    // "め" は H1内服モジュールのゼスラン（有効成分: メキタジン）に前方一致するが、
    // メキタジンはメトホルミン系モジュールの有効成分と無関係である。
    // 関係スコープ化された促進抑制ロジックであれば、この無関係な前方一致は
    // メトホルミンモジュール自身の促進（単剤が配合剤より先に表示される既存契約）を
    // 妨げてはならない。
    const results = getDrugSuggestions('めとほる', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.equal(labels[0], 'メトホルミン', `1位はメトホルミンであるべき（関係のないゼスラン/メキタジンの前方一致に妨げられてはならない）: ${JSON.stringify(labels)}`)
    assert.equal(labels[1], 'メトグルコ', `2位はメトグルコであるべき: ${JSON.stringify(labels)}`)
  })

  test('メトホルミン/ピオグリタゾンの単剤優先契約は "め"/"ぴおぐり" 単体クエリでも既存どおり維持される', () => {
    // 塩酸塩読み等の既存クエリだけでなく、短い前方一致クエリ自体でも
    // 配合剤に妨げられてはならないことを確認する（回帰の直接的な反証）。
    const pio = getDrugSuggestions('ぴおぐり', fullIndex, 8).map(r => r.drugDisplayLabel)
    assert.equal(pio[0], 'ピオグリタゾン', `"ぴおぐり": 1位はピオグリタゾンであるべき: ${JSON.stringify(pio)}`)
    assert.equal(pio[1], 'アクトス', `"ぴおぐり": 2位はアクトスであるべき: ${JSON.stringify(pio)}`)

    // "め" は「ぴおぐり」「めとほる」等とは異なり、単剤ブランド（メトグルコ/メトホルミン）
    // 自身の前方一致に加えて配合剤側の宣言順が既存の並びを決めており、現行 HEAD でも
    // 単剤が先頭には来ない（メタクト等の配合剤が先頭）。この関係スコープ化された促進ガードは
    // 「め」に対して新たな単剤優先契約を課すものではなく、無関係モジュール（H1内服のゼスラン/
    // メキタジン等）の前方一致による偶発的な割り込みからのみ保護する。したがって既存の
    // HEAD 挙動をそのまま固定するにとどめる（新しい契約を作らない）。
    const me = getDrugSuggestions('め', fullIndex, 8).map(r => r.drugDisplayLabel)
    assert.deepEqual(
      me,
      ['メタクト', 'メトアナ', 'メトグルコ', 'メトホルミン', 'エクメット', 'イニシンク', 'ピオグリタゾン／メトホルミン', 'ビルダグリプチン/メトホルミン'],
      `"め": 既存 HEAD の並びから変化してはならない: ${JSON.stringify(me)}`,
    )
  })
})

// ─────────────────────────────────────────────────────────────
// 17. Search Family Phase 1: 配合剤成分展開による候補集合の対称性
//
//   単剤の一般名クエリ（例:「リナグリプチン」）は、当該成分を含む配合剤
//   （トラディアンス）へ既存の仕組み（配合剤モジュール自身の nameAliases 経由）で
//   到達できていたが、対になる先発品ブランドクエリ（例:「トラゼンタ」）からは
//   同じ配合剤へ到達できなかった（候補集合の非対称性）。
//
//   本ブロックは、単剤ブランド/一般名の直接一致候補が解決した有効成分
//   （brandCatalog[brand].displayGenericName、区切りなし＝単剤）を起点に、
//   同一成分を含む配合剤ブランド（displayGenericName が "A/B" 形式に分解できる
//   ブランド）を候補集合へ対称的に追加する Phase 1 の完成を検証する。
//
//   表示順（どちらを先に出すか、配合剤を候補全体のどこに挿入するか等）は
//   Phase 2 の責務であり、本ブロックでは一切固定しない（membership のみを検証）。
// ─────────────────────────────────────────────────────────────

describe('⑰ Search Family Phase 1: 配合剤成分展開による候補集合の対称性', () => {
  test('"トラゼンタ" → 配合剤トラディアンス（リナグリプチン/エンパグリフロジン）を含む', () => {
    const results = getDrugSuggestions('トラゼンタ', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.ok(brands.includes('トラゼンタ'), `先発品自身が候補に含まれるべき: ${JSON.stringify(brands)}`)
    assert.ok(brands.includes('トラディアンス'), `リナグリプチンを含む配合剤トラディアンスが候補に含まれるべき: ${JSON.stringify(brands)}`)
  })

  test('"リナグリプチン" と "トラゼンタ" は同じ配合剤集合へ到達する（対称性の直接検証）', () => {
    const generic = getDrugSuggestions('リナグリプチン', fullIndex, 8).map(r => r.matchedBrandName)
    const brand = getDrugSuggestions('トラゼンタ', fullIndex, 8).map(r => r.matchedBrandName)
    assert.ok(generic.includes('トラディアンス'), `一般名クエリ側にトラディアンスが含まれるべき: ${JSON.stringify(generic)}`)
    assert.ok(brand.includes('トラディアンス'), `先発品クエリ側にもトラディアンスが含まれるべき: ${JSON.stringify(brand)}`)
  })

  test('"ジャディアンス" → 配合剤トラディアンス（リナグリプチン/エンパグリフロジン）を含む', () => {
    const results = getDrugSuggestions('ジャディアンス', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.ok(brands.includes('ジャディアンス'), `先発品自身が候補に含まれるべき: ${JSON.stringify(brands)}`)
    assert.ok(brands.includes('トラディアンス'), `エンパグリフロジンを含む配合剤トラディアンスが候補に含まれるべき: ${JSON.stringify(brands)}`)
  })

  test('"エンパグリフロジン" と "ジャディアンス" は同じ配合剤集合へ到達する（対称性の直接検証）', () => {
    const generic = getDrugSuggestions('エンパグリフロジン', fullIndex, 8).map(r => r.matchedBrandName)
    const brand = getDrugSuggestions('ジャディアンス', fullIndex, 8).map(r => r.matchedBrandName)
    assert.ok(generic.includes('トラディアンス'), `一般名クエリ側にトラディアンスが含まれるべき: ${JSON.stringify(generic)}`)
    assert.ok(brand.includes('トラディアンス'), `先発品クエリ側にもトラディアンスが含まれるべき: ${JSON.stringify(brand)}`)
  })

  test('H1（アレジオン/エピナスチン/オロパタジン/アレロック系）の検索に Phase 1 が非H1・無関係モジュールの候補を混入させない（配合剤成分を持たないため展開対象外）', () => {
    // H1 の有効成分はいずれも配合剤の成分として存在しないため、Phase 1 の展開は
    // これらの検索へ allergy_ 以外のモジュールの候補を混入させてはならない。
    // 本テストが直接固定するのはこの「無関係モジュール非混入」性のみであり、
    // H1 候補集合全体（件数・順序を含む）が HEAD と完全一致することは
    // レビュー時の HEAD 比較で別途確認済み。
    for (const q of ['アレジオン', 'エピナスチン', 'オロパタジン', 'アレロック', 'アレジオン点眼', 'パタノール点眼']) {
      const results = getDrugSuggestions(q, fullIndex, 8)
      assert.ok(
        results.every(r => r.moduleId.startsWith('allergy_')),
        `"${q}": H1/アレルギー系以外の候補が紛れ込んではならない: ${JSON.stringify(results.map(r => r.moduleId))}`,
      )
    }
  })

  test('配合剤の displayGenericName はすべて既定の区切り文字（/／・）のみで単剤成分へ分解でき、各成分が既知の単剤有効成分と一致する', () => {
    // scripts/audit-generic-name-reachability.ts の OD-2（区切り文字確定・fail-closed）を
    // 前提として、Phase 1 の配合剤展開ロジックが依存する分解結果の健全性を
    // 実行時ヘルパー（splitGenericComponents）に対して直接検証する。
    // audit 自体の未知区切り検出ロジックを重複実装しない（npm run audit が別途保証する）。
    const singleAgentIngredients = new Set<string>()
    const multiIngredientEntries: Array<{ moduleId: string; brand: string; dgn: string }> = []
    for (const m of ALL_MODULES) {
      const brandCatalog = (m.drug as any)?.brandCatalog ?? {}
      for (const [brand, entry] of Object.entries(brandCatalog) as any) {
        const dgn = entry.displayGenericName
        if (!dgn) continue
        const components = splitGenericComponents(dgn)
        if (components.length >= 2) {
          multiIngredientEntries.push({ moduleId: m.moduleId, brand, dgn })
        } else {
          singleAgentIngredients.add(dgn)
        }
      }
    }
    assert.equal(multiIngredientEntries.length, 14, `配合剤エントリ件数が想定と異なる: ${multiIngredientEntries.length}`)
    for (const { moduleId, brand, dgn } of multiIngredientEntries) {
      const components = splitGenericComponents(dgn)
      assert.equal(components.length, 2, `${moduleId}/${brand} の "${dgn}" は2成分に分解できるべき: ${JSON.stringify(components)}`)
      for (const component of components) {
        assert.ok(
          singleAgentIngredients.has(component),
          `${moduleId}/${brand} の成分 "${component}"（"${dgn}" 由来）が既知の単剤有効成分と一致しない`,
        )
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────
// Search Family Phase 2-A（2026-09）: 意味的ファミリー順序 / co-brand membership /
// generic header true-duplicate 判定の回帰コーパス。
//
// gate: strongSingleIngredientQuery = tokens.length===1 && 最上位 score>=5。
// このゲートを満たさないクエリ（弱い prefix・複数トークン）は本 Phase の対象外であり、
// 挙動を一切変更しない（§ 凍結コーパス群で明示的に固定する）。
// ─────────────────────────────────────────────────────────────

describe('Search Family Phase 2-A: F1（direct 候補が複数モジュールに跨る場合のペア一般名昇格）', () => {
  test('"アレジオン" → クエリされた経口ファミリー＋そのペア一般名が、剤形違いの点眼ファミリーより先に並ぶ', () => {
    const results = getDrugSuggestions('アレジオン', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.deepEqual(
      labels,
      ['アレジオン', 'エピナスチン', 'アレジオン点眼液', 'エピナスチン点眼液'],
      `F1: 経口ファミリー＋ペア一般名が点眼ファミリーより先であるべき: ${JSON.stringify(labels)}`,
    )
    // 点眼ファミリーは削除されず、集合には残っている（順序のみの修正であること）
    assert.ok(results.some(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops'))
  })
})

describe('Search Family Phase 2-A: F2（genericMode 内は単剤ファミリーが配合剤ファミリーより先）', () => {
  test('"したぐりぷちん" → シタグリプチン単剤ファミリーが、配合剤（シタグリプチン/イプラグリフロジン）より先に並ぶ', () => {
    const results = getDrugSuggestions('したぐりぷちん', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.deepEqual(
      labels,
      ['シタグリプチン', 'ジャヌビア', 'グラクティブ', 'シタグリプチン/イプラグリフロジン', 'スージャヌ'],
      `F2: 単剤ファミリーが配合剤ファミリーより先であるべき: ${JSON.stringify(labels)}`,
    )
  })

  test('"めとほるみん" / "ぐりめぴりど" / "ぼぐりぼーす" → 既に単剤優先だったクエリは無変更（安定ソートの no-op 確認）', () => {
    const cases: Array<[string, string[]]> = [
      ['めとほるみん', ['メトホルミン', 'メトグルコ', 'グリコラン', 'メトアナ', 'エクメット', 'イニシンク', 'メホビル', 'メタクト']],
      ['ぐりめぴりど', ['グリメピリド', 'アマリール', 'ピオグリタゾン／グリメピリド', 'ソニアス']],
      ['ぼぐりぼーす', ['ボグリボース', 'ベイスン', 'ミチグリニド・ボグリボース', 'グルベス']],
    ]
    for (const [q, expected] of cases) {
      const labels = getDrugSuggestions(q, fullIndex, 8).map(r => r.drugDisplayLabel)
      assert.deepEqual(labels, expected, `"${q}" は Phase 2-A 前と完全に同一であるべき: ${JSON.stringify(labels)}`)
    }
  })
})

describe('Search Family Phase 2-A: D1（同一 module 内・同一有効成分の co-brand membership）', () => {
  test('"メトグルコ" → 同一 module 内の同一有効成分ブランド（メトホルミン(GE)・グリコラン）へ直接クエリから到達する', () => {
    const results = getDrugSuggestions('メトグルコ', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.equal(brands[0], 'メトグルコ')
    assert.ok(brands.includes('メトホルミン'), `co-brand "メトホルミン" が含まれるべき: ${JSON.stringify(brands)}`)
    assert.ok(brands.includes('グリコラン'), `co-brand "グリコラン" が含まれるべき: ${JSON.stringify(brands)}`)
    // genericKey は書き換えていないことの確認（3 ブランドは引き続き別 genericKey のまま）
    const entry = fullIndex.find(e => e.moduleId === 'dm_biguanide_metformin_oral')!
    assert.notEqual(entry.brandCatalogGenericKeyMap['メトグルコ'], entry.brandCatalogGenericKeyMap['メトホルミン'])
    assert.notEqual(entry.brandCatalogGenericKeyMap['メトグルコ'], entry.brandCatalogGenericKeyMap['グリコラン'])
  })

  test('"アクトス" → 同一 module 内の同一有効成分ブランド（ピオグリタゾン(GE)）へ直接クエリから到達する', () => {
    const results = getDrugSuggestions('アクトス', fullIndex, 8)
    const brands = results.map(r => r.matchedBrandName)
    assert.equal(brands[0], 'アクトス')
    assert.ok(brands.includes('ピオグリタゾン'), `co-brand "ピオグリタゾン" が含まれるべき: ${JSON.stringify(brands)}`)
  })

  test('co-brand 展開は同一 module 内に限定される（他 module へは拡張しない）', () => {
    // エピナスチン（内服・アレジオン）は点眼モジュールの「エピナスチン点眼液」と
    // 同一有効成分だが、別モジュール（別 search family）であるため co-brand として
    // sibling 展開されない（direct 候補としては別に到達可能）。
    const results = getDrugSuggestions('アレジオン', fullIndex, 8)
    const sibling = results.find(
      r => r.matchedBrandName === 'エピナスチン点眼液' && r.moduleId === 'allergy_h1_antihistamine_eye_drops',
    )
    // 点眼ファミリーは F1 により候補集合には残るが、経口モジュールの co-brand としては
    // 展開されない（モジュールが分かれたまま到達する）。
    assert.ok(sibling, '点眼ブランドは別ファミリーとして候補集合に残るべき')
    assert.equal(
      results.filter(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral').length,
      2,
      '経口モジュール側の候補は自ブランド＋自身のペア一般名の2件のみであるべき（点眼ブランドを co-brand として複製しない）',
    )
  })
})

describe('Search Family Phase 2-A: D2（generic header の true-duplicate 判定。module opt-in 非依存）', () => {
  test('"メトグルコ" / "アクトス" → 一般名テキストは（D1 co-brand 行として）確実に到達可能になる（旧: module opt-in フラグで一律非表示）', () => {
    // D1 が co-brand「メトホルミン」/「ピオグリタゾン」を brand 行として追加した結果、
    // 同テキストの単独 generic header はそれ自体が真の重複になるため D2 により正しく
    // 抑制される（isGenericLabel=false の brand 行として到達する）。
    // 「一般名テキストが到達不能になる」という旧来の module opt-in 一律抑制の問題が
    // 解消されていることを検証する（header/brand のどちらの形で表示されるかは問わない）。
    const metgluco = getDrugSuggestions('メトグルコ', fullIndex, 8)
    assert.ok(
      metgluco.some(r => r.drugDisplayLabel === 'メトホルミン'),
      `メトグルコ: 「メトホルミン」に到達可能であるべき: ${JSON.stringify(metgluco.map(r => r.drugDisplayLabel))}`,
    )
    assert.ok(
      !metgluco.some(r => r.isGenericLabel && r.drugDisplayLabel === 'メトホルミン'),
      'メトグルコ: co-brand 行が存在するため、同テキストの単独 header は真の重複として抑制されるべき',
    )
    const actos = getDrugSuggestions('アクトス', fullIndex, 8)
    assert.ok(
      actos.some(r => r.drugDisplayLabel === 'ピオグリタゾン'),
      `アクトス: 「ピオグリタゾン」に到達可能であるべき: ${JSON.stringify(actos.map(r => r.drugDisplayLabel))}`,
    )
  })

  test('"もんてるかすと" → ブランド名とテキストが完全一致する真の重複 header は抑制される', () => {
    const results = getDrugSuggestions('もんてるかすと', fullIndex, 8)
    const genericHeaders = results.filter(r => r.isGenericLabel)
    assert.equal(genericHeaders.length, 0, `真に重複する header は 0 件であるべき: ${JSON.stringify(results.map(r => r.drugDisplayLabel))}`)
    assert.ok(results.some(r => r.drugDisplayLabel === 'モンテルカスト' && !r.isGenericLabel), 'ブランド行「モンテルカスト」自体は残るべき')
  })

  test('H1点眼の direct クエリは、true-duplicate 判定後も視覚的に重複する行を新たに獲得しない', () => {
    const results = getDrugSuggestions('アレジオン点眼液', fullIndex, 8)
    const texts = results.map(r => r.drugDisplayLabel)
    assert.equal(new Set(texts).size, texts.length, `重複表示テキストが存在してはならない: ${JSON.stringify(texts)}`)
  })
})

describe('Search Family Phase 2-A: D3（単一成分インスリン family は premix family より先）', () => {
  test('"いんすりんあすぱると" → 単一成分（ノボラピッド系）が premix（ノボラピッド *ミックス系）より先', () => {
    const results = getDrugSuggestions('いんすりんあすぱると', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.deepEqual(
      labels,
      ['インスリンアスパルト', 'ノボラピッド', 'フィアスプ', 'ノボラピッド30ミックス', 'ノボラピッド50ミックス', 'ノボラピッド70ミックス', 'インスリンデグルデク/インスリンアスパルト', 'ライゾデグ'],
      `D3: 単一成分 → premix → 配合剤 の順であるべき: ${JSON.stringify(labels)}`,
    )
    // generic header は単一成分モジュール（dm_insulin_rapid_analog）由来で生き残る
    const header = results.find(r => r.isGenericLabel && r.drugDisplayLabel === 'インスリンアスパルト')
    assert.equal(header?.moduleId, 'dm_insulin_rapid_analog')
  })

  test('"いんすりんひと" → 単一成分（ノボリンR/ヒューマリンR）が premix（*30R / 3/7）より先', () => {
    const results = getDrugSuggestions('いんすりんひと', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.deepEqual(
      labels,
      ['インスリンヒト', 'ノボリンR', 'ヒューマリンR', 'ノボリン30R', 'イノレット30R', 'ヒューマリン3/7'],
      `D3: 単一成分 → premix の順であるべき: ${JSON.stringify(labels)}`,
    )
  })

  test('"いんすりんりすぷろ" → 単一成分（ヒューマログ/ルムジェブ）が premix（*ミックス）より先', () => {
    const results = getDrugSuggestions('いんすりんりすぷろ', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.deepEqual(
      labels,
      ['インスリンリスプロ', 'ヒューマログ', 'ルムジェブ', 'ヒューマログ25ミックス', 'ヒューマログ50ミックス'],
      `D3: 単一成分 → premix の順であるべき: ${JSON.stringify(labels)}`,
    )
  })

  test('premix 判定は categoryPath 由来であり、候補の SET（Phase 1 対称性）を変えない', () => {
    // 単一成分/premix の並び替えのみが Phase 2-A の責務であり、
    // どのブランドが候補になるか（membership）は変更しない。
    const before = new Set(['インスリンアスパルト', 'ノボラピッド', 'フィアスプ', 'ノボラピッド30ミックス', 'ノボラピッド50ミックス', 'ノボラピッド70ミックス', 'インスリンデグルデク/インスリンアスパルト', 'ライゾデグ'])
    const after = new Set(getDrugSuggestions('いんすりんあすぱると', fullIndex, 8).map(r => r.drugDisplayLabel))
    assert.deepEqual(after, before, 'candidate set は不変であるべき（順序のみの変更）')
  })
})

describe('Search Family Phase 2-A: D4（oral / injectable semaglutide は別ファミリーのまま。凍結）', () => {
  test('"せまぐるちど" → 経口・注射の両ファミリーが co-equal に見える（優先順位を発明しない）', () => {
    const results = getDrugSuggestions('せまぐるちど', fullIndex, 8)
    const labels = results.map(r => r.drugDisplayLabel)
    assert.deepEqual(labels, ['セマグルチド', 'リベルサス', 'オゼンピック'], `D4 は本ユニットで変更しない: ${JSON.stringify(labels)}`)
  })

  test('"リベルサス" / "オゼンピック" → 直接クエリはクエリされた製剤が先頭のまま', () => {
    const r1 = getDrugSuggestions('リベルサス', fullIndex, 8)
    assert.equal(r1[0]?.drugDisplayLabel, 'リベルサス')
    const r2 = getDrugSuggestions('オゼンピック', fullIndex, 8)
    assert.equal(r2[0]?.drugDisplayLabel, 'オゼンピック')
  })
})

describe('Search Family Phase 2-A: D5（oral / ophthalmic 同一有効成分は別ファミリーのまま可視）', () => {
  test('"えぴなすちん" / "おろぱたじん" → oral・ophthalmic 両ファミリーとも候補集合に残る（凍結）', () => {
    for (const [q, expected] of [
      ['えぴなすちん', ['エピナスチン', 'アレジオン', 'エピナスチン点眼液', 'アレジオン点眼液']],
      ['おろぱたじん', ['オロパタジン', 'アレロック', 'オロパタジン点眼液', 'パタノール点眼液']],
    ] as const) {
      const labels = getDrugSuggestions(q, fullIndex, 8).map(r => r.drugDisplayLabel)
      assert.deepEqual(labels, [...expected], `"${q}" は凍結対象: ${JSON.stringify(labels)}`)
    }
  })

  test('"エピナスチン点眼" / "おろぱたじん てんがん" → 明示的な点眼意図は従来どおり点眼のみへ絞り込む（凍結）', () => {
    const r1 = getDrugSuggestions('エピナスチン点眼', fullIndex, 8)
    assert.deepEqual(r1.map(r => r.drugDisplayLabel), ['エピナスチン点眼液', 'アレジオン点眼液'])
    const r2 = getDrugSuggestions('おろぱたじん てんがん', fullIndex, 8)
    assert.deepEqual(r2.map(r => r.drugDisplayLabel), ['オロパタジン点眼液'])
  })
})

describe('Search Family Phase 2-A: 強い単一成分クエリのゲート未満は完全凍結', () => {
  test('単一かな1文字クエリ（え/お/り/め/ほ/あ）は Phase 2-A 前と完全に同一のシーケンスを返す', () => {
    const expected: Record<string, string[]> = {
      'え': ['エキセナチド', 'バイエッタ', 'エパルレスタット', 'キネダック', 'エンパグリフロジン', 'エンパグリフロジン', 'リナグリプチン/エンパグリフロジン', 'トラディアンス'],
      'お': ['オロパタジン', 'アレロック', 'オイグルコン', 'オゼンピック', 'オノン', 'グリベンクラミド', 'セマグルチド', 'プランルカスト'],
      'り': ['リオベル', 'ビクトーザ', 'リキスミア', 'リザベン点眼液', 'リベルサス', 'アログリプチン／ピオグリタゾン', 'リキシセナチド', 'トラニラスト点眼液'],
      'め': ['メタクト', 'メトアナ', 'メトグルコ', 'メトホルミン', 'エクメット', 'イニシンク', 'ピオグリタゾン／メトホルミン', 'ビルダグリプチン/メトホルミン'],
      'ほ': ['フォシーガ', 'メタクト', 'メトアナ', 'メトグルコ', 'アマリール', 'ソニアス'],
      'あ': ['アウィクリ', 'アクトス', 'ノボラピッド', 'アピドラ', 'アマリール', 'インスリンイコデク', 'インスリングルリジン', 'グリメピリド'],
    }
    for (const [q, exp] of Object.entries(expected)) {
      const labels = getDrugSuggestions(q, fullIndex, 8).map(r => r.drugDisplayLabel)
      assert.deepEqual(labels, exp, `単一かな "${q}" は凍結対象（score<5）: ${JSON.stringify(labels)}`)
    }
  })

  test('スコア閾値未満の prefix クエリ（めと/ぴお/えぴ）は Phase 2-A 前と完全に同一のシーケンスを返す', () => {
    const expected: Record<string, string[]> = {
      'めと': ['メトアナ', 'エクメット', 'イニシンク', 'メホビル', 'メトグルコ', 'グリコラン', 'メトホルミン', 'ビルダグリプチン/メトホルミン'],
      'ぴお': ['ピオグリタゾン', 'アクトス', 'アログリプチン／ピオグリタゾン', 'リオベル', 'ピオグリタゾン／グリメピリド', 'ソニアス', 'ピオグリタゾン／メトホルミン', 'メタクト'],
      'えぴ': ['エピナスチン', 'アレジオン', 'エピナスチン点眼液', 'アレジオン点眼液'],
    }
    for (const [q, exp] of Object.entries(expected)) {
      const labels = getDrugSuggestions(q, fullIndex, 8).map(r => r.drugDisplayLabel)
      assert.deepEqual(labels, exp, `prefix クエリ "${q}" は凍結対象（score<5）: ${JSON.stringify(labels)}`)
    }
  })

  test('複数トークンクエリ（剤形/route intent）は Phase 2-A の対象外として凍結される', () => {
    const r1 = getDrugSuggestions('へぱ なんこう', fullIndex, 8)
    assert.deepEqual(r1.map(r => r.drugDisplayLabel), ['ヘパリン類似物質油性クリーム'])
    const r2 = getDrugSuggestions('とらにらすと pf', fullIndex, 8)
    assert.deepEqual(r2.map(r => r.drugDisplayLabel), ['トラニラスト点眼液PF'])
    assert.deepEqual(r2.map(r => r.matchedBrandName), ['トラメラス点眼液PF'])
  })
})

describe('Search Family Phase 2-A: crossModuleIndicationLabel の co-equal 契約は破壊しない（フォシーガ）', () => {
  test('"フォシーガ" → 糖尿病/心・腎の2モジュールが、F1 の昇格ロジックにより分断されない', () => {
    const results = getDrugSuggestions('フォシーガ', fullIndex, 8)
    const uiLabels = results.map(r => r.uiLabel)
    assert.deepEqual(
      uiLabels,
      ['フォシーガ（糖尿病）', 'フォシーガ（心・腎）', 'ダパグリフロジン（糖尿病）', 'ダパグリフロジン（心・腎）'],
      `crossModuleIndicationLabel の co-equal 表示契約が壊れていないこと: ${JSON.stringify(uiLabels)}`,
    )
  })
})

describe('Search Family Phase 2-A: 直接配合剤クエリは引き続き direct 優先のまま（F2 の対象外）', () => {
  test('"メタクト" → 配合剤自身への直接クエリは、単剤ファミリーの割り込みを受けない', () => {
    const results = getDrugSuggestions('メタクト', fullIndex, 8)
    assert.equal(results[0]?.matchedBrandName, 'メタクト', `配合剤への直接クエリは自身が1位であるべき: ${JSON.stringify(results.map(r => r.matchedBrandName))}`)
  })
})
