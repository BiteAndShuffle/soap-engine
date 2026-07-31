/**
 * measure-payload.ts
 *
 * F-1（全モジュール配信・ロード構造）の配信量を継続的に観測するための計測スクリプト。
 * 設計根拠: docs/reviews/f1/F1_STAGE123_DESIGN_2026-07-30.md §1
 *
 * ── なぜこのスクリプトが必要か ─────────────────────────────────────
 *
 * `npm run build` の出力は `First Load JS` を表示するが、これは JS バンドルのみの数字で
 * **RSC ペイロード（モジュールデータ）を含まない**。全モジュール JSON は
 * `app/page.tsx` から `DashboardClient`（Client Component）へ prop で渡されるため
 * RSC ペイロードとして初期 HTML に埋め込まれるが、標準の検証工程ではその成長を検知できない。
 *
 * ── 計測方針: サーバ起動を必須にしない ────────────────────────────
 *
 * 初期 HTML の実測にはサーバ起動が必要だが、成長の主因は ALL_MODULES のシリアライズ量であり
 * サーバなしで決定論的に計測できる。2026-07-29 の実測では次の関係が確認されている。
 *
 *   JSON.stringify(ALL_MODULES) minified : 3,584,368 B
 *   実測 初期 HTML                       : 3,949,946 B
 *   差分（アプリシェル＋エスケープ）      :   365,578 B ← モジュール数に依存しない固定分
 *
 * したがって minified / gzip バイト数を主指標とする。
 *
 * ── しきい値の性格（重要）────────────────────────────────────────
 *
 * 本スクリプトのしきい値は **性能限界ではない**。ロード方式（F-1）の再評価を
 * Owner へ促す警告トリガーである。超過しても障害を意味しない。
 * WARN は Release 判定を止めない（PN8 の観測項目であり必須ゲートではない）。
 *
 * ── Stage 4 Commit ⑥: 測定対象の分離（D-S4-5）──────────────────────
 *
 * 現行 runtime search index と structured Search Manifest は**測定対象が異なる**。
 * 同一指標として混ぜず、分離して報告する。
 *
 *   current runtime search index : buildSearchIndex を全モジュールへ適用した
 *                                  SearchEntry[] の直列化サイズ（Stage 1 と同一定義）
 *   structured search manifest   : commit 済み data/search-manifest.json の実ファイルサイズ
 *
 * **baseline（payload-baseline-2026-07-30.json）は更新しない。** Stage 4 は
 * allModulesGzipBytes（全モジュール JSON の配信量）を変えておらず、manifest は
 * 追加された測定対象である。baseline の更新は Owner の明示 reset 指示時のみ行う。
 *
 * ── 設計時試算と現在の実測を混同しないこと ────────────────────────
 *
 * 設計時（2026-07-29）の 2 層 manifest 試算は raw 357,402 B / gzip 24,969 B だったが、
 * 実 manifest はこれを上回る。差の要因は試算後に確定した以下の Owner Decision である。
 *
 *   D-S4-8  : SearchEntry.groupLabel を決定論的に再構築するために必要な
 *             scenario 分類メタデータ（scenarioTags / sideEffectPresence /
 *             intentTags / sCompositionIntent）を ManifestScenario へ追加した。
 *             1,060 シナリオ全件に付与されるため raw への寄与が大きい。
 *   D-S4-11 : SearchEntry.brandCatalogIndicationLabelMap を再構築するために必要な
 *             brandCatalog[].handlingTags を ManifestBrandEntry へ追加した
 *             （2 値へ縮約せず配列全体・原順序を保持する）。
 *
 * いずれも SOAP 本文ではなく、SearchEntry を canonical と一致させるための
 * 構造化メタデータである。**試算値は設計時点の記録として保持し、書き換えない。**
 *
 * 実行:
 *   npm run measure:payload
 *   npx tsx scripts/measure-payload.ts
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { execSync } from 'child_process'

import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex } from '../lib/search'

// ─────────────────────────────────────────────────────────────
// しきい値（警告トリガー・性能限界ではない）
// ─────────────────────────────────────────────────────────────

/** 初期転送量（gzip）の警告トリガー。2026-07-30 実測 326 KB に対し余裕を持たせた値 */
const THRESHOLD_TOTAL_GZIP_KB = 500

/** 単一モジュール（raw / minified）の警告トリガー。2026-07-30 実測 平均 100 KB */
const THRESHOLD_MODULE_RAW_KB = 150

/**
 * structured Search Manifest の gzip 上限（Owner Decision D-2 / 2026-07-31）。
 * **tests/searchManifestParity.test.ts の T-5 と同一の値を用いる**（乖離させない）。
 */
const THRESHOLD_MANIFEST_GZIP_TOTAL_BYTES = 500 * 1024 // 500 KB
const THRESHOLD_MANIFEST_GZIP_PER_MODULE_BYTES = 1500 // 1,500 B/module

/** 300 モジュールへの外挿に用いる目標モジュール数（実測値ではない） */
const PROJECTION_MODULE_COUNT = 300

const BASELINE_PATH = path.resolve('./docs/reviews/f1/payload-baseline-2026-07-30.json')

/** commit 済み manifest。**読み取り専用。再生成しない** */
const MANIFEST_PATH = path.resolve('./data/search-manifest.json')

/**
 * 設計時（2026-07-29）の 2 層 manifest 試算値。**歴史的記録であり書き換えない。**
 * 出典: docs/reviews/f1/F1_SEARCH_MANIFEST_DESIGN_2026-07-30.md §0
 * baseline ファイルにも同値が manifestReference* として凍結保存されている。
 */
const DESIGN_ESTIMATE_MANIFEST_RAW_BYTES = 357402
const DESIGN_ESTIMATE_MANIFEST_GZIP_BYTES = 24969

// ─────────────────────────────────────────────────────────────
// 表示ユーティリティ
// ─────────────────────────────────────────────────────────────

const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`
const BOLD = (s: string) => `\x1b[1m${s}\x1b[0m`
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`
const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024).toLocaleString()} KB`
}

function bytes(n: number): string {
  return `${n.toLocaleString()} B`
}

function row(label: string, value: string, note = ''): void {
  console.log(`  ${label.padEnd(30)} ${value.padStart(16)}${note ? '  ' + DIM(note) : ''}`)
}

/**
 * 百分率を整形する。**分母は呼び出し側が明示し、表示にも含める。**
 * 分母が 0 の場合は算出不能として '—' を返す。
 */
function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)} %`
}

/**
 * 300 モジュール換算値。
 * 算出式は **current measured value / current module count * 300** で固定し、
 * 丸めは最終結果に対する Math.round のみとする（途中で丸めない）。
 * 実測値ではなく外挿値であるため、表示側で projection と明示する。
 */
function project(currentBytes: number, currentModuleCount: number): number {
  if (currentModuleCount === 0) return 0
  return Math.round((currentBytes / currentModuleCount) * PROJECTION_MODULE_COUNT)
}

// ─────────────────────────────────────────────────────────────
// 計測
// ─────────────────────────────────────────────────────────────

export interface PayloadMeasurement {
  measuredAt: string
  commit: string
  moduleCount: number
  allModulesMinifiedBytes: number
  allModulesGzipBytes: number
  /** 現行 runtime search index の raw（Stage 1 と同一定義） */
  searchIndexBytes: number
  /** 同 index の gzip。Stage 4 Commit ⑥ で追加（測定対象は searchIndexBytes と同一バイト列） */
  searchIndexGzipBytes: number
  /** 設計時試算の 2 層 manifest 相当（実 manifest ではない。歴史的参考値） */
  manifestReferenceBytes: number
  manifestReferenceGzipBytes: number
  /** commit 済み data/search-manifest.json の実測。存在しない場合は null */
  manifestRawBytes: number | null
  manifestGzipBytes: number | null
  /** manifest が保持する module 件数（manifest 側の自己申告値） */
  manifestModuleCount: number | null
  largestModule: { moduleId: string; minifiedBytes: number }
}

function resolveCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 2 層 manifest 相当の**設計時参考値**。
 *
 * Stage 4 の目標値を把握するための参考測定であり、**実際の manifest ではない**。
 * フィールド構成は docs/reviews/f1/F1_SEARCH_MANIFEST_DESIGN_2026-07-30.md §1.2 に準拠し、
 * D-S4-8（scenario 分類メタデータ）・D-S4-11（handlingTags）を**含まない**。
 * 実 manifest との差は §Historical comparison で分離して報告する。
 */
function buildManifestReference(): string {
  const modules = ALL_MODULES.map(m => {
    const d = m.drug as Record<string, any> | undefined
    const ds = d?.search as Record<string, any> | undefined
    const comp = m.composition as Record<string, any> | undefined
    return {
      moduleId: m.moduleId,
      categoryPath: m.categoryPath,
      classKey: comp?.classKey,
      nodeKey: comp?.nodeKey,
      clinicalDomain: comp?.clinicalDomain,
      displayTitle: m.display?.title,
      displaySubtitle: m.display?.subtitle,
      brandNames: d?.brandNames ?? [],
      nameAliases: d?.nameAliases ?? [],
      drugClass: d?.drugClass ?? [],
      drugSpecificTags: d?.drugSpecificTags ?? [],
      search: {
        primaryDisplayName: ds?.primaryDisplayName,
        exactAliases: ds?.exactAliases ?? [],
        nameAliases: ds?.nameAliases ?? [],
        keywords: ds?.keywords ?? [],
        formulationSearchTokens: ds?.formulationSearchTokens ?? [],
        priority: ds?.priority ?? 0,
        matchPolicy: ds?.matchPolicy ?? {},
      },
      brandCatalog: Object.fromEntries(
        Object.entries((d?.brandCatalog ?? {}) as Record<string, any>).map(([k, v]) => [
          k,
          {
            displayName: v.displayName,
            displayGenericName: v.displayGenericName,
            genericKey: v.genericKey,
            aliases: v.aliases ?? [],
            indicationLabel: v.indicationLabel,
          },
        ]),
      ),
    }
  })
  const scenarios = ALL_MODULES.flatMap(m =>
    m.scenarios.map(s => ({
      moduleId: m.moduleId,
      globalId: s.globalId,
      id: s.id,
      title: s.title,
      scenarioGroup: s.scenarioGroup,
    })),
  )
  return JSON.stringify({ modules, scenarios })
}

/**
 * commit 済み manifest を読む。**再生成しない・書き込まない。**
 * 存在しない場合は null を返し、manifest 関連セクションをスキップする。
 */
function readCommittedManifest(): { raw: string; moduleCount: number | null } | null {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8')
    let moduleCount: number | null = null
    try {
      const parsed = JSON.parse(raw) as { modules?: unknown[] }
      moduleCount = Array.isArray(parsed.modules) ? parsed.modules.length : null
    } catch {
      moduleCount = null
    }
    return { raw, moduleCount }
  } catch {
    return null
  }
}

function measure(): PayloadMeasurement {
  const allModulesSer = JSON.stringify(ALL_MODULES)
  const searchIndexSer = JSON.stringify(ALL_MODULES.flatMap(m => buildSearchIndex(m)))
  const manifestSer = buildManifestReference()
  const committed = readCommittedManifest()

  let largest = { moduleId: '(none)', minifiedBytes: 0 }
  for (const m of ALL_MODULES) {
    const size = Buffer.byteLength(JSON.stringify(m))
    if (size > largest.minifiedBytes) largest = { moduleId: m.moduleId, minifiedBytes: size }
  }

  return {
    measuredAt: new Date().toISOString().slice(0, 10),
    commit: resolveCommit(),
    moduleCount: ALL_MODULES.length,
    allModulesMinifiedBytes: Buffer.byteLength(allModulesSer),
    allModulesGzipBytes: zlib.gzipSync(allModulesSer).length,
    // raw と gzip は同一バイト列に対する測定であり、Stage 1 の定義を変更していない
    searchIndexBytes: Buffer.byteLength(searchIndexSer),
    searchIndexGzipBytes: zlib.gzipSync(searchIndexSer).length,
    manifestReferenceBytes: Buffer.byteLength(manifestSer),
    manifestReferenceGzipBytes: zlib.gzipSync(manifestSer).length,
    manifestRawBytes: committed ? Buffer.byteLength(committed.raw) : null,
    manifestGzipBytes: committed ? zlib.gzipSync(Buffer.from(committed.raw, 'utf8')).length : null,
    manifestModuleCount: committed ? committed.moduleCount : null,
    largestModule: largest,
  }
}

// ─────────────────────────────────────────────────────────────
// baseline
// ─────────────────────────────────────────────────────────────

/**
 * baseline は「良い状態だった時点」を固定する目的で保持する。
 * Owner が「ここを新しい基準線とする」と判断した時のみ更新する（毎回更新しない）。
 */
function loadBaseline(): PayloadMeasurement | null {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as PayloadMeasurement
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// build 成果物（存在する場合のみ）
// ─────────────────────────────────────────────────────────────

function statOrNull(p: string): number | null {
  try {
    return fs.statSync(path.resolve(p)).size
  } catch {
    return null
  }
}

function dirSizeOrNull(dir: string): number | null {
  const root = path.resolve(dir)
  if (!fs.existsSync(root)) return null
  let total = 0
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else total += fs.statSync(p).size
    }
  }
  walk(root)
  return total
}

// ─────────────────────────────────────────────────────────────
// 出力
// ─────────────────────────────────────────────────────────────

/**
 * Stage 4 の分離計測を報告する（D-S4-5）。
 *
 * current runtime search index と structured search manifest は測定対象が異なるため、
 * 単一の指標へ合算せず、区切って表示する。baseline は参照するのみで更新しない。
 */
function reportManifestMetrics(m: PayloadMeasurement): void {
  console.log(BOLD('■ Stage 4 — Search Manifest 分離計測') + DIM('   (D-S4-5: 測定対象が異なるため合算しない)'))
  console.log('')

  // ── 1. current runtime search index ──────────────────────────
  console.log(DIM('  ── current runtime search index ──') + DIM('  buildSearchIndex(ALL_MODULES) / Stage 1 と同一定義'))
  row('raw', bytes(m.searchIndexBytes), kb(m.searchIndexBytes))
  row('gzip', bytes(m.searchIndexGzipBytes), kb(m.searchIndexGzipBytes))
  console.log('')

  if (m.manifestRawBytes === null || m.manifestGzipBytes === null) {
    console.log(DIM('  ── structured search manifest ──'))
    console.log(DIM('     data/search-manifest.json が存在しないためスキップ'))
    console.log(DIM('     生成: npm run generate:search-manifest（本スクリプトは再生成しない）'))
    console.log('')
    return
  }

  const manifestRaw = m.manifestRawBytes
  const manifestGzip = m.manifestGzipBytes

  // ── 2. structured search manifest ────────────────────────────
  console.log(DIM('  ── structured search manifest ──') + DIM('  data/search-manifest.json（commit 済み・再生成なし）'))
  row('raw', bytes(manifestRaw), kb(manifestRaw))
  row('gzip', bytes(manifestGzip), kb(manifestGzip))
  if (m.manifestModuleCount !== null && m.manifestModuleCount !== m.moduleCount) {
    console.log(
      '  ' +
        YELLOW('WARN') +
        ` manifest の module 件数（${m.manifestModuleCount}）が ALL_MODULES（${m.moduleCount}）と不一致。` +
        ' npm run generate:search-manifest で再生成が必要な可能性があります',
    )
  }
  console.log('')

  // ── 3. reduction（分母は runtime search index）────────────────
  const rawReduction = m.searchIndexBytes - manifestRaw
  const gzipReduction = m.searchIndexGzipBytes - manifestGzip
  console.log(DIM('  ── reduction ──') + DIM('  分母 = current runtime search index'))
  row('raw reduction', bytes(rawReduction), `${pct(rawReduction, m.searchIndexBytes)} 削減`)
  row('gzip reduction', bytes(gzipReduction), `${pct(gzipReduction, m.searchIndexGzipBytes)} 削減`)
  console.log('')

  // ── 4. per-module metrics ────────────────────────────────────
  const indexGzipPerModule = m.searchIndexGzipBytes / m.moduleCount
  const manifestGzipPerModule = manifestGzip / m.moduleCount
  console.log(DIM('  ── per-module metrics ──'))
  row('module count', String(m.moduleCount))
  row('runtime index gzip / module', bytes(Math.round(indexGzipPerModule)), `${indexGzipPerModule.toFixed(1)} B`)
  row('manifest gzip / module', bytes(Math.round(manifestGzipPerModule)), `${manifestGzipPerModule.toFixed(1)} B`)
  console.log('')

  // ── 5. 300-module projection ─────────────────────────────────
  console.log(
    DIM(`  ── ${PROJECTION_MODULE_COUNT}-module projection ──`) +
      DIM(`  current / ${m.moduleCount} * ${PROJECTION_MODULE_COUNT}・最終結果のみ Math.round（実測値ではない）`),
  )
  row('runtime index raw', bytes(project(m.searchIndexBytes, m.moduleCount)), kb(project(m.searchIndexBytes, m.moduleCount)))
  row('runtime index gzip', bytes(project(m.searchIndexGzipBytes, m.moduleCount)), kb(project(m.searchIndexGzipBytes, m.moduleCount)))
  row('manifest raw', bytes(project(manifestRaw, m.moduleCount)), kb(project(manifestRaw, m.moduleCount)))
  row('manifest gzip', bytes(project(manifestGzip, m.moduleCount)), kb(project(manifestGzip, m.moduleCount)))
  console.log('')

  // ── 6. threshold status（T-5 と同一の値で判定する）────────────
  const totalOk = manifestGzip <= THRESHOLD_MANIFEST_GZIP_TOTAL_BYTES
  const perModuleOk = manifestGzipPerModule <= THRESHOLD_MANIFEST_GZIP_PER_MODULE_BYTES
  console.log(DIM('  ── threshold status ──') + DIM('  tests/searchManifestParity.test.ts T-5 と同一の上限'))
  console.log(
    `  ${totalOk ? GREEN('OK  ') : YELLOW('WARN')} manifest gzip total      ` +
      `${manifestGzip.toLocaleString().padStart(9)} B / 上限 ${THRESHOLD_MANIFEST_GZIP_TOTAL_BYTES.toLocaleString()} B` +
      DIM(`  (${pct(manifestGzip, THRESHOLD_MANIFEST_GZIP_TOTAL_BYTES)} of limit)`),
  )
  console.log(
    `  ${perModuleOk ? GREEN('OK  ') : YELLOW('WARN')} manifest gzip per module ` +
      `${manifestGzipPerModule.toFixed(1).padStart(9)} B / 上限 ${THRESHOLD_MANIFEST_GZIP_PER_MODULE_BYTES.toLocaleString()} B` +
      DIM(`  (${pct(manifestGzipPerModule, THRESHOLD_MANIFEST_GZIP_PER_MODULE_BYTES)} of limit)`),
  )
  console.log('')

  // ── 7. historical comparison（設計時試算 vs 現在の実測）───────
  const rawDelta = manifestRaw - DESIGN_ESTIMATE_MANIFEST_RAW_BYTES
  const gzipDelta = manifestGzip - DESIGN_ESTIMATE_MANIFEST_GZIP_BYTES
  console.log(DIM('  ── historical comparison ──') + DIM('  設計時試算と実測は別物として扱う（試算は書き換えない）'))
  row('design estimate raw', bytes(DESIGN_ESTIMATE_MANIFEST_RAW_BYTES), kb(DESIGN_ESTIMATE_MANIFEST_RAW_BYTES) + ' / 2026-07-29 試算')
  row('design estimate gzip', bytes(DESIGN_ESTIMATE_MANIFEST_GZIP_BYTES), kb(DESIGN_ESTIMATE_MANIFEST_GZIP_BYTES) + ' / 同上')
  row('current measured raw', bytes(manifestRaw), kb(manifestRaw))
  row('current measured gzip', bytes(manifestGzip), kb(manifestGzip))
  row(
    'raw diff vs estimate',
    `${rawDelta >= 0 ? '+' : ''}${bytes(rawDelta)}`,
    `${rawDelta >= 0 ? '+' : ''}${pct(rawDelta, DESIGN_ESTIMATE_MANIFEST_RAW_BYTES)}（分母 = 試算 raw）`,
  )
  row(
    'gzip diff vs estimate',
    `${gzipDelta >= 0 ? '+' : ''}${bytes(gzipDelta)}`,
    `${gzipDelta >= 0 ? '+' : ''}${pct(gzipDelta, DESIGN_ESTIMATE_MANIFEST_GZIP_BYTES)}（分母 = 試算 gzip）`,
  )
  console.log('')
  console.log(DIM('    差が生じた理由（試算後に確定した Owner Decision）:'))
  console.log(DIM('      D-S4-8  scenario 分類メタデータの追加'))
  console.log(DIM('              scenarioTags / sideEffectPresence / intentTags / sCompositionIntent'))
  console.log(DIM('              SearchEntry.groupLabel の決定論的な再構築に必要。全 scenario に付与'))
  console.log(DIM('      D-S4-11 brandCatalog[].handlingTags の追加'))
  console.log(DIM('              SearchEntry.brandCatalogIndicationLabelMap の再構築に必要。'))
  console.log(DIM('              2 値へ縮約せず配列全体・原順序を保持する'))
  console.log(DIM('    いずれも SOAP 本文ではない（tests/searchBodyExclusion.test.ts T-6 が非混入を保証）'))
  console.log('')
  console.log(DIM('    baseline（payload-baseline-2026-07-30.json）は更新しない。'))
  console.log(DIM('    Stage 4 は allModulesGzipBytes を変えておらず、manifest は追加された測定対象である。'))
  console.log('')
}

function main(): void {
  const m = measure()
  const baseline = loadBaseline()

  console.log('')
  console.log(BOLD('■ F-1 Payload Measurement') + DIM(`   commit ${m.commit}`))
  console.log('')

  row('モジュール数', String(m.moduleCount))
  row('ALL_MODULES minified', bytes(m.allModulesMinifiedBytes), kb(m.allModulesMinifiedBytes))
  row('ALL_MODULES gzip', bytes(m.allModulesGzipBytes), kb(m.allModulesGzipBytes) + ' ← 初期転送量の主指標')
  row('検索インデックス', bytes(m.searchIndexBytes), kb(m.searchIndexBytes))
  row('2層manifest 相当（参考）', bytes(m.manifestReferenceBytes), kb(m.manifestReferenceBytes) + ' / gzip ' + kb(m.manifestReferenceGzipBytes))
  console.log('')

  const pageJs = statOrNull('.next/server/app/page.js')
  const staticDir = dirSizeOrNull('.next/static')
  if (pageJs !== null || staticDir !== null) {
    console.log(DIM('  build 成果物'))
    if (pageJs !== null) row('.next/server/app/page.js', bytes(pageJs), kb(pageJs))
    if (staticDir !== null) row('.next/static 合計', bytes(staticDir), kb(staticDir))
    console.log('')
  } else {
    console.log(DIM('  build 成果物: .next が存在しないためスキップ'))
    console.log('')
  }

  const avg = Math.round(m.allModulesMinifiedBytes / m.moduleCount)
  row('1モジュールあたり平均', bytes(avg), kb(avg))
  row('300モジュール換算 raw', bytes(avg * 300), kb(avg * 300))
  const gzipPer = m.allModulesGzipBytes / m.moduleCount
  row('300モジュール換算 gzip', bytes(Math.round(gzipPer * 300)), kb(Math.round(gzipPer * 300)))
  console.log('')

  // ── しきい値判定 ────────────────────────────────────────────
  const totalGzipKb = m.allModulesGzipBytes / 1024
  const largestKb = m.largestModule.minifiedBytes / 1024
  const warnings: Array<{ label: string; current: number; threshold: number; unit: string }> = []

  if (totalGzipKb > THRESHOLD_TOTAL_GZIP_KB) {
    warnings.push({ label: 'gzip 推定総容量', current: totalGzipKb, threshold: THRESHOLD_TOTAL_GZIP_KB, unit: 'KB (gzip)' })
  }
  if (largestKb > THRESHOLD_MODULE_RAW_KB) {
    warnings.push({ label: '単一モジュール raw 容量', current: largestKb, threshold: THRESHOLD_MODULE_RAW_KB, unit: 'KB (raw)' })
  }

  console.log(DIM('  しきい値判定（警告トリガー・性能限界ではない）'))
  console.log(
    `  ${(totalGzipKb > THRESHOLD_TOTAL_GZIP_KB ? YELLOW('WARN') : GREEN('OK  '))} gzip 推定総容量        ${Math.round(totalGzipKb).toLocaleString().padStart(6)} KB / 基準 ${THRESHOLD_TOTAL_GZIP_KB} KB`,
  )
  console.log(
    `  ${(largestKb > THRESHOLD_MODULE_RAW_KB ? YELLOW('WARN') : GREEN('OK  '))} 単一モジュール raw 容量  ${Math.round(largestKb).toLocaleString().padStart(6)} KB / 基準 ${THRESHOLD_MODULE_RAW_KB} KB`,
  )
  console.log('')

  // ── baseline との比較 ──────────────────────────────────────
  if (baseline) {
    const diff = m.allModulesGzipBytes - baseline.allModulesGzipBytes
    const rate = baseline.allModulesGzipBytes > 0 ? (diff / baseline.allModulesGzipBytes) * 100 : 0
    const modDiff = m.moduleCount - baseline.moduleCount
    console.log(DIM(`  baseline 比較（${baseline.measuredAt} / commit ${baseline.commit}）`))
    row('baseline gzip', bytes(baseline.allModulesGzipBytes), kb(baseline.allModulesGzipBytes))
    row('増加量', `${diff >= 0 ? '+' : ''}${bytes(diff)}`, `${diff >= 0 ? '+' : ''}${kb(Math.abs(diff))}`)
    row('増加率', `${rate >= 0 ? '+' : ''}${rate.toFixed(1)} %`)
    row('モジュール数の増減', `${modDiff >= 0 ? '+' : ''}${modDiff}`, `${baseline.moduleCount} → ${m.moduleCount}`)
    console.log('')
  } else {
    console.log(DIM('  baseline 未登録（docs/reviews/f1/payload-baseline-2026-07-30.json）'))
    console.log('')
  }

  row('最大モジュール', m.largestModule.moduleId, kb(m.largestModule.minifiedBytes))
  console.log('')

  reportManifestMetrics(m)

  // ── WARN 詳細 ──────────────────────────────────────────────
  if (warnings.length > 0) {
    console.log(YELLOW(BOLD('⚠️  WARN: 警告トリガーを超過しています')))
    console.log('')
    for (const w of warnings) {
      console.log(`    ${BOLD(w.label)}`)
      console.log(`      現在値        : ${Math.round(w.current).toLocaleString()} ${w.unit}`)
      console.log(`      基準値        : ${w.threshold.toLocaleString()} ${w.unit}  ${DIM('← 警告トリガー')}`)
      if (baseline) {
        const bGzip = baseline.allModulesGzipBytes / 1024
        const bLargest = baseline.largestModule.minifiedBytes / 1024
        const base = w.label.startsWith('gzip') ? bGzip : bLargest
        const d = w.current - base
        const r = base > 0 ? (d / base) * 100 : 0
        console.log(`      増加量        : ${d >= 0 ? '+' : ''}${Math.round(d).toLocaleString()} ${w.unit}  ${DIM(`(baseline ${Math.round(base).toLocaleString()} → ${Math.round(w.current).toLocaleString()})`)}`)
        console.log(`      増加率        : ${r >= 0 ? '+' : ''}${r.toFixed(1)} %`)
      } else {
        console.log(`      増加量 / 増加率: ${DIM('baseline 未登録のため算出不能')}`)
      }
      console.log(`      最大モジュール : ${m.largestModule.moduleId}  ${kb(m.largestModule.minifiedBytes)}`)
      console.log('')
    }
    console.log('    これは性能限界ではありません。ロード方式の再評価を促す警告です。')
    console.log('    Release 判定を止めるゲートではありません（PN8 の観測項目）。')
    console.log('    詳細: docs/reviews/f1/F1_ARCHITECTURE_REVIEW_2026-07-30.md')
    console.log('')
  }

  // WARN でも exit 0（モジュール追加を停止させない）
  process.exit(0)
}

main()
