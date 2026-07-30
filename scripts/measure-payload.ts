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

const BASELINE_PATH = path.resolve('./docs/reviews/f1/payload-baseline-2026-07-30.json')

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

// ─────────────────────────────────────────────────────────────
// 計測
// ─────────────────────────────────────────────────────────────

export interface PayloadMeasurement {
  measuredAt: string
  commit: string
  moduleCount: number
  allModulesMinifiedBytes: number
  allModulesGzipBytes: number
  searchIndexBytes: number
  manifestReferenceBytes: number
  manifestReferenceGzipBytes: number
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
 * 2 層 manifest 相当の参考値。
 * Stage 4 の目標値を把握するための参考測定であり、実際の manifest 生成ではない。
 * フィールド構成は docs/reviews/f1/F1_SEARCH_MANIFEST_DESIGN_2026-07-30.md §1.2 に準拠。
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

function measure(): PayloadMeasurement {
  const allModulesSer = JSON.stringify(ALL_MODULES)
  const searchIndexSer = JSON.stringify(ALL_MODULES.flatMap(m => buildSearchIndex(m)))
  const manifestSer = buildManifestReference()

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
    searchIndexBytes: Buffer.byteLength(searchIndexSer),
    manifestReferenceBytes: Buffer.byteLength(manifestSer),
    manifestReferenceGzipBytes: zlib.gzipSync(manifestSer).length,
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
