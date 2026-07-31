/**
 * searchManifestParity.test.ts
 *
 * F-1 Stage 4 の検索 parity を検証する。
 * 設計根拠: docs/reviews/f1/F1_STAGE4_PLAN_2026-07-30.md §7.1
 *
 * ── 本ファイルが担うテスト ──────────────────────────────────────
 *
 *   T-1  structured search parity
 *        canonical 由来の SearchEntry と manifest 由来の SearchEntry が
 *        全 21 フィールドで一致すること。および構造化検索語で同一の
 *        サジェスト結果が得られること。
 *
 * T-3（manifest 等価 / stale 検出）・T-5（サイズ回帰）・T-7（件数・ID 整合）は
 * Commit ⑤ で本ファイルへ追加する。
 * T-2 / T-6（intentional loss / 本文非混入）は tests/searchBodyExclusion.test.ts が
 * 独立して担う（D-S4-6）。
 *
 * ── クエリはデータから自動生成する ──────────────────────────────
 *
 * クエリ集合をハードコードせず canonical JSON から生成するため、
 * モジュールが 35 → 300 件へ増えても網羅性が自動的に維持される。
 *
 * 実行:
 *   npx tsx --test tests/searchManifestParity.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions } from '../lib/search'
import { generateSearchManifest, buildIndexFromManifest } from '../lib/searchManifest'

// ─────────────────────────────────────────────────────────────
// 共有フィクスチャ（searchBodyExclusion.test.ts と同一の構築手順）
// ─────────────────────────────────────────────────────────────

const canonicalIndex = ALL_MODULES.flatMap(m => buildSearchIndex(m))
const manifest = generateSearchManifest(ALL_MODULES)
const manifestIndex = buildIndexFromManifest(manifest)

/** サジェスト結果を比較可能な文字列へ落とす（moduleId / ブランド / 表示ラベル / 順序） */
function fingerprint(query: string, index: typeof canonicalIndex): string[] {
  return getDrugSuggestions(query, index, 8).map(
    x => `${x.moduleId}|${x.matchedBrandName ?? ''}|${x.uiLabel ?? x.drugDisplayLabel ?? ''}`,
  )
}

/**
 * 構造化検索クエリをデータから自動生成する。
 * Owner が指定した検索対象（先発品名 / 後発品名 / 一般名 / 読み仮名・alias /
 * 剤形 / 薬効領域 / 薬効分類）を網羅する。
 */
function collectStructuredQueries(): string[] {
  const set = new Set<string>()
  for (const m of ALL_MODULES) {
    const drug = m.drug as Record<string, any> | undefined
    const ds = drug?.search as Record<string, any> | undefined

    for (const v of drug?.brandNames ?? []) set.add(v)
    for (const v of drug?.nameAliases ?? []) set.add(v)
    for (const v of drug?.drugClass ?? []) set.add(v)
    for (const v of drug?.drugSpecificTags ?? []) set.add(v)
    for (const v of m.categoryPath ?? []) set.add(v)
    for (const v of ds?.exactAliases ?? []) set.add(v)
    for (const v of ds?.nameAliases ?? []) set.add(v)
    for (const v of ds?.formulationSearchTokens ?? []) set.add(v)
    if (ds?.primaryDisplayName) set.add(ds.primaryDisplayName)

    for (const [brand, entry] of Object.entries((drug?.brandCatalog ?? {}) as Record<string, any>)) {
      set.add(brand)
      if (entry.displayGenericName) set.add(entry.displayGenericName)
      for (const a of entry.aliases ?? []) set.add(a)
    }
  }
  return [...set].filter(q => typeof q === 'string' && q.trim() !== '')
}

/** 同一モジュール内の 2 語 AND クエリを生成する */
function collectAndQueries(): string[] {
  const out: string[] = []
  for (const m of ALL_MODULES) {
    const brand = (m.drug as Record<string, any> | undefined)?.brandNames?.[0]
    const form = m.categoryPath?.[m.categoryPath.length - 1]
    if (brand && form) out.push(`${brand} ${form}`)
  }
  return out
}

describe('T-1 structured search parity（canonical ⇔ manifest）', () => {
  test('SearchEntry の件数が一致する', () => {
    assert.equal(manifestIndex.length, canonicalIndex.length)
    assert.equal(manifestIndex.length, 1060)
  })

  test('templateId の並びが一致する（検索結果の順序も manifest の意味の一部）', () => {
    assert.deepEqual(
      manifestIndex.map(e => e.templateId),
      canonicalIndex.map(e => e.templateId),
    )
  })

  test('SearchEntry の全 21 フィールドが 1 件残らず一致する', () => {
    const keys = Object.keys(canonicalIndex[0]) as Array<keyof (typeof canonicalIndex)[0]>
    assert.equal(keys.length, 21, `SearchEntry のフィールド数が 21 から変化している: ${keys.length}`)

    const mismatches: string[] = []
    for (const k of keys) {
      for (let i = 0; i < canonicalIndex.length; i++) {
        if (JSON.stringify(manifestIndex[i][k]) !== JSON.stringify(canonicalIndex[i][k])) {
          mismatches.push(`${String(k)} @ ${canonicalIndex[i].templateId}`)
          break
        }
      }
    }
    assert.deepEqual(mismatches, [], `manifest 由来と canonical 由来で不一致:\n  ${mismatches.join('\n  ')}`)
  })

  test('構造化検索クエリ全件でサジェスト結果が一致する', () => {
    const queries = collectStructuredQueries()
    assert.ok(queries.length > 200, `クエリ生成数が想定より少ない: ${queries.length}`)

    const diffs: string[] = []
    for (const q of queries) {
      const a = fingerprint(q, canonicalIndex)
      const b = fingerprint(q, manifestIndex)
      if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(q)
    }
    assert.deepEqual(diffs, [], `サジェスト結果が不一致のクエリ: ${diffs.slice(0, 10).join(', ')}`)
  })

  test('2 語 AND 検索でもサジェスト結果が一致する', () => {
    const diffs: string[] = []
    for (const q of collectAndQueries()) {
      if (JSON.stringify(fingerprint(q, canonicalIndex)) !== JSON.stringify(fingerprint(q, manifestIndex))) {
        diffs.push(q)
      }
    }
    assert.deepEqual(diffs, [], `AND 検索が不一致: ${diffs.join(', ')}`)
  })
})

describe('T-1 Owner 指定検索ケース（35 件）', () => {
  // Owner が指定した検索対象を代表する固定ケース。
  // データ由来の自動生成クエリとは別に、意図した検索が通ることを明示的に固定する。
  const OWNER_CASES: Array<[string, string]> = [
    ['先発品名', 'リベルサス'],
    ['先発品名', 'ヒルドイド'],
    ['先発品名', 'アレジオン'],
    ['先発品名', 'ツイミーグ'],
    ['先発品名', 'ジャヌビア'],
    ['先発品名', 'インタール'],
    ['読み仮名', 'りべるさす'],
    ['読み仮名', 'ひるどいど'],
    ['読み仮名', 'いんたーる'],
    ['一般名', 'セマグルチド'],
    ['一般名', 'ヘパリン類似物質'],
    ['一般名', 'クロモグリク酸'],
    ['一般名', 'メトホルミン'],
    ['一般名', 'ピオグリタゾン'],
    ['剤形', 'クリーム'],
    ['剤形', 'ローション'],
    ['剤形', '軟膏'],
    ['剤形', 'スプレー'],
    ['剤形', '点眼'],
    ['剤形', '注射'],
    ['剤形', '内服'],
    ['薬効領域', '糖尿病'],
    ['薬効領域', 'アレルギー'],
    ['薬効領域', '皮膚科'],
    ['薬効領域', '眼科'],
    ['薬効分類', 'GLP-1'],
    ['薬効分類', 'DPP-4'],
    ['薬効分類', 'SGLT2'],
    ['薬効分類', 'インスリン'],
    ['薬効分類', '抗ヒスタミン'],
    ['AND検索', 'ヒルドイド クリーム'],
    ['AND検索', 'リベルサス 内服'],
    ['AND検索', 'アレジオン 点眼'],
    ['表記揺れ', 'ﾘﾍﾞﾙｻｽ'],
    ['表記揺れ', 'リベルサス'],
  ]

  test('35 件を網羅している', () => {
    assert.equal(OWNER_CASES.length, 35)
  })

  test('canonical 由来と manifest 由来で結果が一致する', () => {
    const diffs: string[] = []
    for (const [category, q] of OWNER_CASES) {
      if (JSON.stringify(fingerprint(q, canonicalIndex)) !== JSON.stringify(fingerprint(q, manifestIndex))) {
        diffs.push(`${category}: ${q}`)
      }
    }
    assert.deepEqual(diffs, [], `不一致: ${diffs.join(', ')}`)
  })

  test('薬剤名系のケースは 1 件以上ヒットする（検索到達性の確認）', () => {
    // 剤形・薬効領域・薬効分類は該当モジュールが無い場合もあるため、
    // 到達性を必須とするのは brand / generic / alias 系に限定する。
    const reachable = OWNER_CASES.filter(([c]) => ['先発品名', '読み仮名', '一般名'].includes(c))
    const empty = reachable.filter(([, q]) => getDrugSuggestions(q, manifestIndex, 8).length === 0)
    assert.deepEqual(empty.map(([, q]) => q), [], `到達不能な検索語: ${empty.map(([, q]) => q).join(', ')}`)
  })
})
