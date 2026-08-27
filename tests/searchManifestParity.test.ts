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
 *   T-3  manifest 等価 / stale 検出
 *        ① commit 済み data/search-manifest.json が canonical JSON から
 *           再生成したものと**バイト一致**すること（手編集・再生成漏れの検出）。
 *           **sourceHash を比較対象から除外する例外は設けない**（D-S4-9）。
 *        ② commit 済み manifest から構築した SearchEntry[] が
 *           canonical JSON 由来（本文除去版）と一致すること。
 *
 *   T-5  サイズ回帰
 *        commit 済み manifest を gzip した実測値が上限内であること。
 *        総量と 1 モジュールあたり増分を**独立して**検証する。
 *
 *   T-7  件数・ID 整合
 *        moduleCount / scenarioCount / moduleId / globalId の整合。
 *
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
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions } from '../lib/search'
import type { SearchManifest } from '../lib/searchManifest'
import {
  generateSearchManifest,
  serializeSearchManifest,
  buildIndexFromManifest,
} from '../lib/searchManifest'

// ─────────────────────────────────────────────────────────────
// 共有フィクスチャ（searchBodyExclusion.test.ts と同一の構築手順）
// ─────────────────────────────────────────────────────────────

const canonicalIndex = ALL_MODULES.flatMap(m => buildSearchIndex(m))
const manifest = generateSearchManifest(ALL_MODULES)
const manifestIndex = buildIndexFromManifest(manifest)

/** commit 済みの生成物。**再生成せず、ファイルの内容をそのまま読む** */
const MANIFEST_PATH = path.resolve('./data/search-manifest.json')
const committedRaw = fs.readFileSync(MANIFEST_PATH, 'utf8')
const committedManifest = JSON.parse(committedRaw) as SearchManifest
const committedIndex = buildIndexFromManifest(committedManifest)

/** 配列を集合として比較する（corpusTokens は順序非依存で等価判定する） */
function setEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b)
  if (a.length !== b.length) return false
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size !== sb.size) return false
  for (const v of sa) if (!sb.has(v)) return false
  return true
}

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
    // U-CR1: exact count（旧 1060）は仕様値として使用しない。manifest 由来と canonical 由来の
    // 件数一致（parity 本体）と非空虚性のみを守る。
    assert.equal(manifestIndex.length, canonicalIndex.length)
    assert.ok(manifestIndex.length > 0, 'SearchEntry が corpus に 1 件も無い（test が空振り）')
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

describe('T-3 manifest 等価 / stale 検出', () => {
  test('commit 済み manifest が canonical JSON からの再生成結果とバイト一致する', () => {
    // 手編集・再生成漏れ（stale）を検出する。
    // sourceHash を比較対象から除外する例外は設けない（D-S4-9）。
    const regenerated = serializeSearchManifest(generateSearchManifest(ALL_MODULES))
    assert.equal(
      committedRaw.length,
      regenerated.length,
      `data/search-manifest.json のバイト数が再生成結果と不一致` +
        `（commit 済み ${committedRaw.length} B / 再生成 ${regenerated.length} B）。` +
        ` npm run generate:search-manifest を実行して再生成すること`,
    )
    assert.ok(
      committedRaw === regenerated,
      'data/search-manifest.json が stale か手編集されている。' +
        ' npm run generate:search-manifest を実行して再生成すること',
    )
  })

  test('sourceHash が再生成結果と一致する（除外例外を設けない）', () => {
    assert.equal(
      committedManifest.sourceHash,
      generateSearchManifest(ALL_MODULES).sourceHash,
      'sourceHash が canonical 由来の値と不一致',
    )
    assert.match(
      committedManifest.sourceHash,
      /^[0-9a-f]{64}$/,
      'sourceHash が SHA-256 の小文字 hex ではない',
    )
  })

  test('sourceHash が決定論的である（同一入力から同一値）', () => {
    const a = generateSearchManifest(ALL_MODULES).sourceHash
    const b = generateSearchManifest(ALL_MODULES).sourceHash
    assert.equal(a, b, 'sourceHash が非決定的')
  })

  test('commit 済み manifest 由来の SearchEntry[] が canonical 由来と一致する', () => {
    assert.equal(
      committedIndex.length,
      canonicalIndex.length,
      `SearchEntry 件数が不一致（manifest ${committedIndex.length} / canonical ${canonicalIndex.length}）`,
    )

    const keys = Object.keys(canonicalIndex[0]) as Array<keyof (typeof canonicalIndex)[0]>
    const mismatches: string[] = []
    for (let i = 0; i < canonicalIndex.length; i++) {
      for (const k of keys) {
        const a = committedIndex[i][k]
        const b = canonicalIndex[i][k]
        // corpusTokens は順序非依存の集合として比較する（設計 §5.3）
        const equal =
          k === 'corpusTokens'
            ? setEqual(a as unknown as string[], b as unknown as string[])
            : JSON.stringify(a) === JSON.stringify(b)
        if (!equal) {
          mismatches.push(`${String(k)} @ ${canonicalIndex[i].templateId}`)
          break
        }
      }
    }
    assert.deepEqual(
      mismatches.slice(0, 10),
      [],
      `commit 済み manifest 由来と canonical 由来で不一致（${mismatches.length} 件）`,
    )
  })

  test('commit 済み manifest 由来と in-memory manifest 由来が一致する', () => {
    // ファイル経由（JSON.parse）と生成直後のオブジェクトで差が出ないことを確認する。
    // 差が出る場合は直列化で情報が落ちている（undefined の混入等）。
    assert.equal(committedIndex.length, manifestIndex.length)
    assert.deepEqual(
      committedIndex.map(e => e.templateId),
      manifestIndex.map(e => e.templateId),
    )
  })
})

describe('T-5 サイズ回帰', () => {
  // Owner Decision（2026-07-31）で確定した上限。
  // baseline ファイルは参照せず、commit 済み manifest の gzip 実測値に対して判定する。
  const GZIP_TOTAL_LIMIT_BYTES = 500 * 1024 // 500 KB
  const GZIP_PER_MODULE_LIMIT_BYTES = 1500 // 1,500 B/module

  const gzipBytes = zlib.gzipSync(Buffer.from(committedRaw, 'utf8')).length

  test('manifest gzip 総量が 500 KB 以下である', () => {
    assert.ok(
      gzipBytes <= GZIP_TOTAL_LIMIT_BYTES,
      `manifest gzip 総量が上限超過: ${gzipBytes} B > ${GZIP_TOTAL_LIMIT_BYTES} B`,
    )
  })

  test('manifest gzip の 1 モジュールあたり増分が 1,500 B 以下である', () => {
    const moduleCount = committedManifest.modules.length
    assert.ok(moduleCount > 0, 'modules が空')
    const perModule = gzipBytes / moduleCount
    assert.ok(
      perModule <= GZIP_PER_MODULE_LIMIT_BYTES,
      `1 モジュールあたり gzip が上限超過: ${perModule.toFixed(1)} B/module` +
        ` > ${GZIP_PER_MODULE_LIMIT_BYTES} B/module（total ${gzipBytes} B / ${moduleCount} modules）`,
    )
  })
})

describe('T-7 件数・ID 整合', () => {
  test('moduleCount が ALL_MODULES.length と一致する', () => {
    assert.equal(committedManifest.moduleCount, ALL_MODULES.length)
    assert.equal(committedManifest.modules.length, committedManifest.moduleCount)
  })

  test('scenarioCount が全モジュールのシナリオ総数と一致する', () => {
    const total = ALL_MODULES.reduce((a, m) => a + (m.scenarios?.length ?? 0), 0)
    assert.equal(committedManifest.scenarioCount, total)
    assert.equal(committedManifest.scenarios.length, committedManifest.scenarioCount)
  })

  test('modules[].moduleId に重複がなく、ALL_MODULES と過不足なく一致する（順序を含む）', () => {
    const manifestIds = committedManifest.modules.map(m => m.moduleId)
    assert.equal(new Set(manifestIds).size, manifestIds.length, 'moduleId が重複している')
    // D-S4-10: ALL_MODULES 登録順を保持する（moduleId で並べ替えない）
    assert.deepEqual(
      manifestIds,
      ALL_MODULES.map(m => m.moduleId),
      'manifest の module 順が ALL_MODULES 登録順と一致しない',
    )
  })

  test('scenarios[].moduleId がすべて modules[] に存在する', () => {
    const known = new Set(committedManifest.modules.map(m => m.moduleId))
    const orphans = [...new Set(
      committedManifest.scenarios.filter(s => !known.has(s.moduleId)).map(s => s.moduleId),
    )]
    assert.deepEqual(orphans, [], `親モジュールが存在しない scenario: ${orphans.join(', ')}`)
  })

  test('scenarios[].globalId に重複がない', () => {
    const ids = committedManifest.scenarios.map(s => s.globalId)
    const seen = new Set<string>()
    const dups = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) dups.add(id)
      seen.add(id)
    }
    assert.deepEqual([...dups], [], `globalId が重複している: ${[...dups].join(', ')}`)
  })

  test('scenario の globalId 集合が canonical と一致する（欠落・余剰なし）', () => {
    const canonical = ALL_MODULES.flatMap(m =>
      (m.scenarios as unknown as Array<Record<string, any>>).map(s => `${m.moduleId}::${s.globalId}`),
    )
    const inManifest = committedManifest.scenarios.map(s => `${s.moduleId}::${s.globalId}`)
    assert.deepEqual(inManifest, canonical, 'scenario の集合または順序が canonical と一致しない')
  })

  test('manifestVersion が設定されている', () => {
    assert.ok(
      typeof committedManifest.manifestVersion === 'string' &&
        committedManifest.manifestVersion.length > 0,
      'manifestVersion が未設定',
    )
  })
})
