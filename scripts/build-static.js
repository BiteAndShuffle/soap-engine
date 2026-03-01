#!/usr/bin/env node
/**
 * build-static.js
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
