/**
 * generate-search-manifest.ts
 *
 * canonical JSON（data/modules/*.json）から構造化 Search Manifest を生成し、
 * data/search-manifest.json へ書き出す。
 * 設計根拠: docs/reviews/f1/F1_STAGE4_PLAN_2026-07-30.md §6
 *
 * ── 生成物は手編集禁止 ────────────────────────────────────────
 *
 * data/search-manifest.json は本スクリプトの出力であり、手で編集してはならない。
 * 手編集は tests/searchManifestParity.test.ts の T-3（stale 検出）が
 * 「canonical JSON から再生成した内容とバイト一致するか」で検出する。
 *
 * ── 決定論性 ──────────────────────────────────────────────────
 *
 * 同一の canonical JSON から常にバイト単位で同一の manifest が生成される。
 *   - module 配列は ALL_MODULES の登録順を保持（D-S4-10）
 *   - scenario 配列は各モジュール内の出現順を保持
 *   - object のキー順は lib/searchManifest.ts の構築順で固定
 *   - sourceHash は manifest 本体（自身を除く）の SHA-256
 *   - Git HEAD・生成日時・絶対パスなど環境依存値を一切含まない
 *
 * 実行:
 *   npm run generate:search-manifest
 *   npx tsx scripts/generate-search-manifest.ts
 */

import fs from 'fs'
import path from 'path'

import { ALL_MODULES } from '../data/modules/index'
import { generateSearchManifest, serializeSearchManifest } from '../lib/searchManifest'

const OUTPUT_PATH = path.resolve('./data/search-manifest.json')

function main(): void {
  const manifest = generateSearchManifest(ALL_MODULES)
  const serialized = serializeSearchManifest(manifest)

  const previous = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null
  fs.writeFileSync(OUTPUT_PATH, serialized, 'utf8')

  const bytes = Buffer.byteLength(serialized)
  console.log('')
  console.log('■ Search Manifest 生成')
  console.log(`  出力先        : ${path.relative(process.cwd(), OUTPUT_PATH)}`)
  console.log(`  manifestVersion: ${manifest.manifestVersion}`)
  console.log(`  sourceHash    : ${manifest.sourceHash}`)
  console.log(`  modules       : ${manifest.moduleCount} 件`)
  console.log(`  scenarios     : ${manifest.scenarioCount} 件`)
  console.log(`  サイズ        : ${bytes.toLocaleString()} B (${Math.round(bytes / 1024)} KB)`)

  if (previous === null) {
    console.log('  状態          : 新規作成')
  } else if (previous === serialized) {
    console.log('  状態          : 変更なし（canonical JSON から再生成した内容と一致）')
  } else {
    console.log('  状態          : 更新（canonical JSON の変更を反映）')
  }
  console.log('')
}

main()
