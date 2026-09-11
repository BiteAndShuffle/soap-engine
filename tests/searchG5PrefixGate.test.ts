/**
 * searchG5PrefixGate.test.ts — G5: 意味的ファミリーゲートの正規化長3文字拡張
 *
 * 対象実装: lib/search.ts の `gateFloor`（strongQueryBase / 曖昧性走査の共有スコア下限）。
 *
 *   const gateFloor = tokens.length === 1 && tokens[0].length >= 3 ? 4 : 5
 *
 * 背景（2026-09 Opus 独立レビューで判明した構造的盲点）:
 *   Owner が明示的に却下したリテラル述語
 *     tokens.length === 1 && tokens[0].length >= 3 && topScore >= 4
 *   （= 3文字未満のクエリでは長さに関わらず常にゲート不成立とする単純な
 *   ハードコンジャンクト）に差し替えても、当時の 3,597 件は全て PASS した。
 *   このリテラル述語は、既存の高精度2文字 prefixAliases（あぴ/おぜ/せま/とる/
 *   とれ/ばい/ひと/びく/ふぃ/らん/りき/るむ/りべ/れべ の14件）が持つ score=5
 *   の完全一致特権を、長さ要件だけで問答無用に奪う。しかし現行データでは
 *   その14件のいずれも意味的ファミリー挙動（D1 co-brand展開等）を可視化する
 *   候補を持たないため、出力ベースの回帰テストでは検出不能だった
 *   （コーパス全体で出力差分 0 件）。
 *
 *   本ファイルは、この盲点を構造的に塞ぐ。合成 ModuleData で「ゲートが
 *   開いているかどうかが出力に現れる」最小条件を作り、Owner Decision を
 *   実データの偶然の形に依存せず直接検証する。
 *
 * 正本:
 *   - 実装       : lib/search.ts（gateFloor / strongSingleIngredientQuery）
 *   - Owner 決定 : 2026-09 G5 実装ユニット（Unit 1 — 三文字プレフィックスゲート）
 *
 * 注意: 本ファイルは lib/search.ts を一切変更しない。テストのみを追加する。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, type SearchEntry } from '../lib/search'

const fullIndex: SearchEntry[] = ALL_MODULES.flatMap(m => buildSearchIndex(m))

// ─────────────────────────────────────────────────────────────
// A) 合成モジュール: ゲート状態を出力から直接観測可能にする
// ─────────────────────────────────────────────────────────────
//
// buildSearchIndex が実際に読む最小フィールドのみを持つ。SOAP 本文（S/O/A/P）は
// 空文字列でよい（検索コーパスに含まれないため — F-1 Stage 4-a）。
// Repository の実データとは完全に独立しており、他モジュールと衝突しない
// 語幹（えく / てすとやく系）のみを使用する。

/**
 * 2文字の高精度エイリアス（score=5 の完全一致）を持つ合成モジュール。
 * 実在の14件（あぴ/おぜ/せま 等）と同型の状況を最小構成で再現する:
 *   - 単一トークン・正規化長2文字
 *   - drug.nameAliases への完全一致で score=5
 *   - ブランド2件が同一有効成分・異なる genericKey（D1 co-brand 境界の対象）
 * ゲートが有効なら D1 の ingredientCoBrands 展開により2件目のブランド行が
 * 追加候補として出現する。ゲートが無効なら出現しない。
 */
const twoCharGateProbeModule = {
  moduleId: 'synthetic_g5_two_char_probe',
  categoryPath: ['テスト'],
  display: { title: 'テスト薬効群', subtitle: 'テスト用' },
  drug: {
    brandNames: ['エクサブランド', 'セイブンジェネリック'],
    nameAliases: ['えく'],
    brandCatalog: {
      'エクサブランド':      { genericName: '成分エー', displayGenericName: '成分エー', genericKey: 'k1_brand', aliases: ['えくさぶらんど'] },
      'セイブンジェネリック': { genericName: '成分エー', displayGenericName: '成分エー', genericKey: 'k1_generic', aliases: ['せいぶんじぇねりっく'] },
    },
    search: { primaryDisplayName: 'テスト薬効群', exactAliases: [], nameAliases: ['えく'], keywords: [], matchPolicy: {} },
  },
  scenarios: [{
    id: 'initial', globalId: 'synthetic_g5_two_char_probe.initial', title: '初回',
    scenarioType: 'treatment', scenarioGroup: 'start_or_change',
    sideEffectPresence: 'absent_or_not_observed', S: '', O: '', A: '', P: '',
  }],
} as unknown as Parameters<typeof buildSearchIndex>[0]

/**
 * 3文字境界を検証する合成モジュール。alias 前方一致（score=4）のみで、
 * exactAlias／primaryDisplayName 完全一致（score>=5）を一切持たない
 * — gateFloor が 4 まで緩んで初めてゲートが開く状況を単独で作るため。
 * 「てす」（2文字）と「てすと」（3文字）はどちらも同一 alias への
 * 前方一致で score=4 になるが、正規化長だけが異なる。
 */
const boundaryProbeModule = {
  moduleId: 'synthetic_g5_boundary_probe',
  categoryPath: ['テスト'],
  display: { title: 'テスト境界群', subtitle: 'テスト用' },
  drug: {
    brandNames: ['テストヤクブランド', 'コウハツテストヤク'],
    nameAliases: [],
    brandCatalog: {
      'テストヤクブランド': { genericName: '成分ビー', displayGenericName: '成分ビー', genericKey: 'k2_brand', aliases: ['てすとやくぶらんど'] },
      'コウハツテストヤク': { genericName: '成分ビー', displayGenericName: '成分ビー', genericKey: 'k2_generic', aliases: ['こうはつてすとやく'] },
    },
    search: { primaryDisplayName: 'テスト境界群', exactAliases: [], nameAliases: [], keywords: [], matchPolicy: {} },
  },
  scenarios: [{
    id: 'initial', globalId: 'synthetic_g5_boundary_probe.initial', title: '初回',
    scenarioType: 'treatment', scenarioGroup: 'start_or_change',
    sideEffectPresence: 'absent_or_not_observed', S: '', O: '', A: '', P: '',
  }],
} as unknown as Parameters<typeof buildSearchIndex>[0]

describe('G5-A: 登録済み高精度2文字エイリアスは意味的ファミリーゲートを維持する（Owner-rejected literal 述語の検出）', () => {
  test('score=5 の2文字完全一致エイリアスは、正規化長に関わらずゲートが開き、D1 co-brand 展開が出現する', () => {
    const idx = buildSearchIndex(twoCharGateProbeModule)
    const results = getDrugSuggestions('えく', idx, 8)

    // ゲートが有効な場合のみ、genericKey の異なる同一成分の co-brand
    // 「セイブンジェネリック」が非ヘッダー行として追加される（D1）。
    // Owner が却下したリテラル述語（`tokens.length===1 && length>=3 && score>=4`）
    // では、このクエリは正規化長2文字のため無条件にゲート不成立となり、
    // この行は決して出現しない — 本テストはその差分を直接検出する。
    const coBrandRow = results.find(r => r.matchedBrandName === 'セイブンジェネリック' && !r.isGenericLabel)
    assert.ok(
      coBrandRow,
      `2文字高精度エイリアス "えく" でゲートが開いていない（D1 co-brand 行が欠落）: ${JSON.stringify(results.map(r => ({ b: r.matchedBrandName, hdr: r.isGenericLabel })))}`,
    )
    assert.equal(results.length, 3, `候補数はブランド2件+一般名見出し1件のはず: ${JSON.stringify(results.map(r => r.matchedBrandName))}`)
  })
})

describe('G5-B: gateFloor の正規化長3文字境界そのものを検証する', () => {
  test('score=4（alias前方一致のみ）の2文字クエリはゲート不成立のまま（3文字未満は従来どおり floor=5）', () => {
    const idx = buildSearchIndex(boundaryProbeModule)
    const results = getDrugSuggestions('てす', idx, 8)
    const coBrandRow = results.find(r => r.matchedBrandName === 'コウハツテストヤク' && !r.isGenericLabel)
    assert.ok(!coBrandRow, `2文字 score=4 クエリでゲートが誤って開いている: ${JSON.stringify(results.map(r => r.matchedBrandName))}`)
    assert.equal(results.length, 2, `候補数はブランド1件+一般名見出し1件のはず: ${JSON.stringify(results.map(r => r.matchedBrandName))}`)
  })

  test('score=4（alias前方一致のみ）の3文字クエリはゲートが開く（G5: floor=4 に緩和）', () => {
    const idx = buildSearchIndex(boundaryProbeModule)
    const results = getDrugSuggestions('てすと', idx, 8)
    const coBrandRow = results.find(r => r.matchedBrandName === 'コウハツテストヤク' && !r.isGenericLabel)
    assert.ok(
      coBrandRow,
      `3文字 score=4 クエリでゲートが開いていない（G5 gateFloor=4 が機能していない）: ${JSON.stringify(results.map(r => r.matchedBrandName))}`,
    )
    assert.equal(results.length, 3, `候補数はブランド2件+一般名見出し1件のはず: ${JSON.stringify(results.map(r => r.matchedBrandName))}`)
  })
})

describe('G5-C: 実デバイス観測クエリ（あれじ/したぐ/リナグリ）の原則保持', () => {
  test('"あれじ" → クエリされたブランドファミリーが最上位、内服一般名見出しが直後、点眼ファミリーは温存される', () => {
    const results = getDrugSuggestions('あれじ', fullIndex, 8)
    const oralIdx = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_second_gen_oral')
    const eyeIdx = results.findIndex(r => r.moduleId === 'allergy_h1_antihistamine_eye_drops')
    assert.equal(oralIdx, 0, `内服ファミリー（クエリされたブランド）が最上位であるべき: ${JSON.stringify(results.map(r => r.moduleId))}`)
    assert.ok(eyeIdx >= 0, '点眼ファミリーの候補・モジュールが失われていないこと')
    assert.ok(oralIdx < eyeIdx, '内服が点眼より上位であるべき')
    // 内服ブランド直後に、そのブランド自身の一般名見出し（paired generic）が続く
    assert.equal(results[1]?.moduleId, 'allergy_h1_antihistamine_second_gen_oral')
    assert.equal(results[1]?.isGenericLabel, true, '内服ブランドの直後に一般名見出しが続くべき')
  })

  test('"したぐ" → 単剤シタグリプチンファミリーが配合剤ファミリーより先行し、配合剤候補は温存される', () => {
    const results = getDrugSuggestions('したぐ', fullIndex, 8)
    const singleIdx = results.findIndex(r => r.moduleId === 'dm_dpp4_oral')
    const comboIdx = results.findIndex(r => r.moduleId === 'dm_dpp4_sglt2_combination_oral')
    assert.ok(singleIdx >= 0, '単剤ファミリー（ジャヌビア/グラクティブ）の候補が失われていないこと')
    assert.ok(comboIdx >= 0, '配合剤ファミリー（スージャヌ）の候補が失われていないこと')
    assert.ok(singleIdx < comboIdx, `単剤ファミリーが配合剤ファミリーより先行するべき: ${JSON.stringify(results.map(r => r.moduleId))}`)
  })

  test('"リナグリ" → 単剤リナグリプチンファミリーが配合剤ファミリーより先行し、配合剤候補は温存される', () => {
    const results = getDrugSuggestions('リナグリ', fullIndex, 8)
    const singleIdx = results.findIndex(r => r.moduleId === 'dm_dpp4_oral')
    const comboIdx = results.findIndex(r => r.moduleId === 'dm_dpp4_sglt2_combination_oral')
    assert.ok(singleIdx >= 0, '単剤ファミリー（トラゼンタ）の候補が失われていないこと')
    assert.ok(comboIdx >= 0, '配合剤ファミリー（トラディアンス）の候補が失われていないこと')
    assert.ok(singleIdx < comboIdx, `単剤ファミリーが配合剤ファミリーより先行するべき: ${JSON.stringify(results.map(r => r.moduleId))}`)
  })
})

describe('G5-D: "のぼり" は Owner 承認済みの唯一の意味的ゲート非活性化である', () => {
  // "のぼり" は正規化長3文字・スコア5でゲート閾値そのものはクリアするが、
  // G5 で曖昧性走査の下限も同じ gateFloor(=4) へ緩和された結果、従来は
  // score>=5 の走査から漏れていたインスリンヒト（ノボリン30R 等）が新たに
  // 走査対象へ入り、イソフェンインスリン（ノボリンN）との間で有効成分が
  // 一意に定まらなくなる。これは偶然のスナップショットではなく、意図された
  // 曖昧性ガードの発火である — G5 実装コミットで Owner が明示的に承認した
  //唯一の意味的ファミリー非活性化。
  test('候補の行集合・モジュール集合・SOAP主語集合は完全に保持される（並び順のみが変化する）', () => {
    const results = getDrugSuggestions('のぼり', fullIndex, 8)
    assert.equal(results.length, 8, `候補行数が変化してはならない: ${results.length}`)

    const modules = new Set(results.map(r => r.moduleId))
    assert.deepEqual(
      [...modules].sort(),
      ['dm_insulin_intermediate', 'dm_insulin_mixed_regular_intermediate', 'dm_insulin_regular'].sort(),
      'モジュール集合が保持されているべき',
    )

    const subjects = new Set(results.map(r => r.resolution?.subject).filter((s): s is string => s !== undefined))
    assert.deepEqual(
      [...subjects].sort(),
      ['イソフェンインスリン', 'イノレット30R', 'インスリンヒト', 'ノボリン30R', 'ノボリンN', 'ノボリンR', 'ヒューマリン3/7', 'ヒューマリンN'].sort(),
      'SOAP 主語集合が保持されているべき（消失した subject があってはならない）',
    )
  })

  test('意味的ファミリーゲートは非活性のまま（曖昧性ガードが誤って回避されていないこと）', () => {
    // ゲートが活性化していた場合の観測可能な指紋: 意味的ファミリー順序が
    // 適用されると、一般名見出し（isGenericLabel）はブランド候補ブロックの
    // 前方（同一成分内・単剤優先の並び）へ引き上げられる。ゲートが非活性の
    // ままなら、一般名見出しは（D2 の module opt-in フラグ既定 false により）
    // 元の配列順のまま末尾寄りに残る。
    const results = getDrugSuggestions('のぼり', fullIndex, 8)
    const headerIdxs = results.map((r, i) => (r.isGenericLabel ? i : -1)).filter(i => i >= 0)
    assert.equal(headerIdxs.length, 2, `一般名見出しは2件のはず（イソフェンインスリン/インスリンヒト）: ${headerIdxs.length}`)
    // ゲートが誤って ON になる回帰（曖昧性走査の閾値だけが score>=5 に
    // 巻き戻る等）では、見出しが各成分ブロックの先頭近くへ移動し、
    // 少なくとも一方が末尾2件（インデックス6/7）の外に出る。
    assert.ok(
      headerIdxs.every(i => i >= 6),
      `一般名見出しが末尾寄りのままであるべき（ゲート非活性の指紋）: headerIdxs=${JSON.stringify(headerIdxs)}`,
    )
  })
})
