#!/usr/bin/env node
/**
 * build-static.js
 *
 * 状態: Future Expansion（docs/DEVELOPMENT_STANDARD.md §10.3 F1〜F5 準拠）
 * - F1 目的・用途: 静的 export による配布（SaaS 以外の配布形態向け）
 * - F2 現在: Current Standard（`npm run build` = `next build`）には含まれない。
 *   `npm run build:static` として独立実行するオプション経路
 * - F3 再判断条件（次のいずれかの発生時。docs/reviews/P1_S2B_FIX_PLAN.md §2.1 D-3）:
 *     ① 静的ビルドを配布方式として正式採用する
 *     ② 個人利用向け静的ビルドの公開・配布工程を実装する
 *     ③ SaaS 以外の配布形態を正式な運用対象にする
 *     ④ Next.js またはデプロイ構成の変更により EXPORT_STATIC 経路の再評価が必要になる
 * - F4 現行 Runtime 非必須: `npm run build`（`next build`）はこのスクリプトを経由しない。
 *   prompts/vNext/PN8-Build-Runtime-Release.md も `npm run build` のみを実行する
 * - F5 Validator / 監査工程の FAIL 条件ではない: docs/IMPLEMENTATION_CHECKLIST.md の
 *   標準チェックリストに build:static / EXPORT_STATIC への記載はない
 *
 * EXPORT_STATIC=1 ビルド用ヘルパー。
 *
 * Next.js 15 はルートセグメント設定（dynamic / revalidate）を
 * AST で静的解析するため、条件式を含む値を認識できない。
 * そのため output:'export' と dynamic:'force-dynamic' の共存が不可能。
 *
 * このスクリプトは:
 *   1. app/page.tsx の dynamic / revalidate を静的export互換値に書き換え
 *   2. EXPORT_STATIC=1 next build を実行
 *   3. 元の値に戻す（成功・失敗どちらでも）
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PAGE_PATH = path.resolve(__dirname, '../app/page.tsx')

// 書き換え前後の定義
const ORIGINAL_DYNAMIC    = "export const dynamic = 'force-dynamic'"
const ORIGINAL_REVALIDATE = 'export const revalidate = 0'
const STATIC_DYNAMIC      = "export const dynamic = 'auto'"
const STATIC_REVALIDATE   = 'export const revalidate = false'

function patch(content) {
  return content
    .replace(ORIGINAL_DYNAMIC, STATIC_DYNAMIC)
    .replace(ORIGINAL_REVALIDATE, STATIC_REVALIDATE)
}

function unpatch(content) {
  return content
    .replace(STATIC_DYNAMIC, ORIGINAL_DYNAMIC)
    .replace(STATIC_REVALIDATE, ORIGINAL_REVALIDATE)
}

const original = fs.readFileSync(PAGE_PATH, 'utf8')

// パッチ適用
const patched = patch(original)
if (patched === original) {
  console.error('[build-static] ⚠️  page.tsx のパターンが見つかりませんでした。中断します。')
  process.exit(1)
}

fs.writeFileSync(PAGE_PATH, patched, 'utf8')
console.log('[build-static] ✅ page.tsx を静的export用に書き換えました')

let exitCode = 0
try {
  execSync('next build', {
    stdio: 'inherit',
    env: { ...process.env, EXPORT_STATIC: '1' },
  })
  console.log('[build-static] ✅ 静的ビルド完了 → out/ を確認してください')
} catch (err) {
  console.error('[build-static] ⚠️  ビルドが失敗しました')
  exitCode = 1
} finally {
  // 必ず元に戻す
  fs.writeFileSync(PAGE_PATH, unpatch(fs.readFileSync(PAGE_PATH, 'utf8')), 'utf8')
  console.log('[build-static] ✅ page.tsx を元の内容に復元しました')
}

process.exit(exitCode)
