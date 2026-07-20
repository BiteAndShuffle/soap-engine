/**
 * moduleValidator.test.ts
 *
 * displayGenericName 必須化ルールの自己テスト（Phase 4）。
 *
 * 実データ（dm_imeglimin_oral）を deep clone し、意図的に破壊した状態で
 * ModuleValidator が実際に ERROR を検出することを確認する。
 * 「データが正しく構造化されていない場合、ビルドが通らない」ことの保証そのものが目的のため、
 * 正常データではなく壊したデータを使ってテストする。
 *
 * 実行:
 *   npx tsx --test tests/moduleValidator.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ALL_MODULES } from '../data/modules/index'
import { validateModule } from '../lib/moduleValidator'

const baseModule = ALL_MODULES.find(m => m.moduleId === 'dm_imeglimin_oral')!
const BRAND = 'ツイミーグ'

function cloneModule(): any {
  return JSON.parse(JSON.stringify(baseModule))
}

function errorCodesOf(mod: unknown): string[] {
  return validateModule(mod).errors.filter(e => !e.isWarning).map(e => e.code)
}

describe('displayGenericName 必須化（自己テスト）', () => {
  test('正常データ: DISPLAY_GENERIC_NAME_* エラーが出ない（前提の健全性確認）', () => {
    const codes = errorCodesOf(cloneModule())
    assert.ok(
      !codes.some(c => c.startsWith('DISPLAY_GENERIC_NAME')),
      `正常データで DISPLAY_GENERIC_NAME_* エラーが出てはならない: ${JSON.stringify(codes)}`,
    )
  })

  test('displayGenericName を削除 → DISPLAY_GENERIC_NAME_MISSING', () => {
    const broken = cloneModule()
    delete broken.drug.brandCatalog[BRAND].displayGenericName
    const codes = errorCodesOf(broken)
    assert.ok(
      codes.includes('DISPLAY_GENERIC_NAME_MISSING'),
      `DISPLAY_GENERIC_NAME_MISSING が検出されるべき: ${JSON.stringify(codes)}`,
    )
  })

  test('displayGenericName を空文字に → DISPLAY_GENERIC_NAME_EMPTY', () => {
    const broken = cloneModule()
    broken.drug.brandCatalog[BRAND].displayGenericName = ''
    const codes = errorCodesOf(broken)
    assert.ok(
      codes.includes('DISPLAY_GENERIC_NAME_EMPTY'),
      `DISPLAY_GENERIC_NAME_EMPTY が検出されるべき: ${JSON.stringify(codes)}`,
    )
  })

  test('displayGenericName を空白のみに → DISPLAY_GENERIC_NAME_EMPTY（trim判定）', () => {
    const broken = cloneModule()
    broken.drug.brandCatalog[BRAND].displayGenericName = '   '
    const codes = errorCodesOf(broken)
    assert.ok(
      codes.includes('DISPLAY_GENERIC_NAME_EMPTY'),
      `空白のみの場合も DISPLAY_GENERIC_NAME_EMPTY が検出されるべき: ${JSON.stringify(codes)}`,
    )
  })

  test('genericName（塩類名含む）をそのまま displayGenericName にコピー → DISPLAY_GENERIC_NAME_SALT_COPY', () => {
    const broken = cloneModule()
    const genericName = broken.drug.brandCatalog[BRAND].genericName
    assert.ok(genericName.includes('塩酸塩'), '前提: イメグリミンの genericName は塩酸塩を含む')
    broken.drug.brandCatalog[BRAND].displayGenericName = genericName // 旧コピーパターンを再現
    const codes = errorCodesOf(broken)
    assert.ok(
      codes.includes('DISPLAY_GENERIC_NAME_SALT_COPY'),
      `DISPLAY_GENERIC_NAME_SALT_COPY が検出されるべき: ${JSON.stringify(codes)}`,
    )
  })

  test('塩類名を含まない genericName と displayGenericName の一致は許容される（誤検出なし）', () => {
    // 塩類名を含まない薬剤（例: 一般名がそのまま販売名のケース相当）を模擬する。
    // genericName に塩類名パターンが含まれない場合、displayGenericName との完全一致は
    // 正当なケース（そもそも省略すべき語がない）であり SALT_COPY を誤検出してはならない。
    const broken = cloneModule()
    broken.drug.brandCatalog[BRAND].genericName = 'イメグリミン'
    broken.drug.brandCatalog[BRAND].displayGenericName = 'イメグリミン'
    const codes = errorCodesOf(broken)
    assert.ok(
      !codes.includes('DISPLAY_GENERIC_NAME_SALT_COPY'),
      `塩類名を含まない一致は SALT_COPY として検出されてはならない: ${JSON.stringify(codes)}`,
    )
  })

  test('複数ブランドのうち1件だけ破壊した場合、破壊した brand のみがエラーになる', () => {
    // dm_dpp4_biguanide_combination_oral は4ブランド構成。うち1件のみ壊す。
    const combo = ALL_MODULES.find(m => m.moduleId === 'dm_dpp4_biguanide_combination_oral')!
    const broken = JSON.parse(JSON.stringify(combo))
    delete broken.drug.brandCatalog['メトアナ'].displayGenericName
    const result = validateModule(broken)
    const dgnErrors = result.errors.filter(e => !e.isWarning && e.code === 'DISPLAY_GENERIC_NAME_MISSING')
    assert.equal(dgnErrors.length, 1, `破壊した1件のみが検出されるべき: ${JSON.stringify(dgnErrors)}`)
    assert.ok(dgnErrors[0].detail.includes('メトアナ'), `エラー詳細にブランド名が含まれるべき: ${dgnErrors[0].detail}`)
  })
})
