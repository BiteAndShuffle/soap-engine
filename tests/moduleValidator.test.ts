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

describe('reservedHandlingTags による requiredTag 到達可能性の条件付き WARNING/ERROR 化（自己テスト）', () => {
  const h1Module = ALL_MODULES.find(m => m.moduleId === 'allergy_h1_antihistamine_eye_drops')!

  function cloneH1(): any {
    return JSON.parse(JSON.stringify(h1Module))
  }

  test('1. 到達可能な requiredTag は PASS（前提の健全性確認）', () => {
    // suspension はリボスチン/レボカバスチンの handlingTags に実在するため到達可能
    const codes = validateModule(cloneH1()).errors
      .filter(e => e.code === 'SCENARIO_REQUIRED_TAG_UNREACHABLE' || e.code === 'ADDON_REQUIRED_TAG_UNREACHABLE')
      .map(e => e.detail)
    assert.ok(
      !codes.some(d => d.includes('"suspension"')),
      `到達可能な suspension タグは UNREACHABLE として検出されてはならない: ${JSON.stringify(codes)}`,
    )
  })

  test('2. 到達不能 + reservedHandlingTags 宣言あり → WARNING（実データの健全性確認）', () => {
    // 実データの concentration_variant / cold_storage / cold_storage_before_opening は
    // reservedHandlingTags に宣言済みのため、到達不能であっても isWarning: true でなければならない
    const result = validateModule(cloneH1())
    const reservedTagErrors = result.errors.filter(
      e => (e.code === 'SCENARIO_REQUIRED_TAG_UNREACHABLE' || e.code === 'ADDON_REQUIRED_TAG_UNREACHABLE')
        && (e.detail.includes('"concentration_variant"') || e.detail.includes('"cold_storage"') || e.detail.includes('"cold_storage_before_opening"')),
    )
    assert.equal(reservedTagErrors.length, 9, `予約タグ起因の到達不能は9件（scenario7+addon2）のはず: ${JSON.stringify(reservedTagErrors.map(e => e.code))}`)
    assert.ok(reservedTagErrors.every(e => e.isWarning), `予約タグ宣言済みのタグはすべて WARNING のはず: ${JSON.stringify(reservedTagErrors)}`)
    assert.equal(result.isValid, true, '予約タグのみが原因の場合 isValid は true のはず')
  })

  test('3. 到達不能 + reservedHandlingTags 宣言なし → ERROR', () => {
    const broken = cloneH1()
    broken.template.reservedHandlingTags = broken.template.reservedHandlingTags.filter(
      (t: string) => t !== 'concentration_variant',
    )
    const result = validateModule(broken)
    const err = result.errors.find(
      e => e.code === 'SCENARIO_REQUIRED_TAG_UNREACHABLE' && e.detail.includes('"concentration_variant"') && e.detail.includes('strength_increase_low_perceived_effect'),
    )
    assert.ok(err, 'concentration_variant の宣言を外すと ERROR が検出されるはず')
    assert.equal(err!.isWarning, false, '宣言を外したタグは isWarning: false（ERROR）のはず')
    assert.equal(result.isValid, false, '宣言を外した場合 isValid は false のはず')
  })

  test('4. reservedHandlingTags は宣言されているが requiredTag として一度も使われていない → RESERVED_TAG_UNUSED (WARNING)', () => {
    const broken = cloneH1()
    broken.template.reservedHandlingTags = [...broken.template.reservedHandlingTags, 'never_used_reserved_tag']
    const result = validateModule(broken)
    const err = result.errors.find(e => e.code === 'RESERVED_TAG_UNUSED' && e.detail.includes('never_used_reserved_tag'))
    assert.ok(err, 'RESERVED_TAG_UNUSED が検出されるはず')
    assert.equal(err!.isWarning, true, 'RESERVED_TAG_UNUSED は WARNING のはず')
  })

  test('5. reservedHandlingTags に現在到達可能なタグが含まれる → RESERVED_TAG_REACHABLE (WARNING)', () => {
    const broken = cloneH1()
    broken.template.reservedHandlingTags = [...broken.template.reservedHandlingTags, 'suspension']
    const result = validateModule(broken)
    const err = result.errors.find(e => e.code === 'RESERVED_TAG_REACHABLE' && e.detail.includes('"suspension"'))
    assert.ok(err, 'RESERVED_TAG_REACHABLE が検出されるはず（suspension は既にリボスチン等が保持）')
    assert.equal(err!.isWarning, true, 'RESERVED_TAG_REACHABLE は WARNING のはず')
  })

  test('6. reservedHandlingTags に宣言のない未知タグ（typo相当）は ERROR', () => {
    const broken = cloneH1()
    broken.scenarios[0].scenarioRequiredTags = ['totally_unknown_typo_tag']
    const result = validateModule(broken)
    const err = result.errors.find(
      e => e.code === 'SCENARIO_REQUIRED_TAG_UNREACHABLE' && e.detail.includes('totally_unknown_typo_tag'),
    )
    assert.ok(err, '未宣言の未知タグは SCENARIO_REQUIRED_TAG_UNREACHABLE として検出されるはず')
    assert.equal(err!.isWarning, false, '未宣言の未知タグは isWarning: false（ERROR）のはず')
    assert.equal(result.isValid, false, '未宣言の未知タグがある場合 isValid は false のはず')
  })
})

describe('brandCatalog[key].displayName が key と一致すること（Drug Subject Resolution 退行防止・自己テスト）', () => {
  // 検索alias → canonical薬剤名（brandCatalogキー）→ SOAP主語 の解決経路のうち、
  // Express Mode 等一部のコードパスは brandCatalog[key].displayName を直接参照する。
  // displayName がキーと乖離すると、検索・aliasToBrand は正しいままキーとは異なる
  // 表示名がSOAP主語に混入する「サイレントな退行」が起こりうる（BRAND_DISPLAY_NAME_MISMATCH）。

  test('正常データ: 全35モジュールで BRAND_DISPLAY_NAME_MISMATCH が出ない（前提の健全性確認）', () => {
    for (const m of ALL_MODULES) {
      const codes = errorCodesOf(m)
      assert.ok(
        !codes.includes('BRAND_DISPLAY_NAME_MISMATCH'),
        `${m.moduleId}: 正常データで BRAND_DISPLAY_NAME_MISMATCH が出てはならない`,
      )
    }
  })

  test('brandCatalog[key].displayName をキーと異なる値へ書き換える → BRAND_DISPLAY_NAME_MISMATCH', () => {
    const broken = cloneModule()
    broken.drug.brandCatalog[BRAND].displayName = 'ツイミーグ錠'
    const codes = errorCodesOf(broken)
    assert.ok(
      codes.includes('BRAND_DISPLAY_NAME_MISMATCH'),
      `BRAND_DISPLAY_NAME_MISMATCH が検出されるべき: ${JSON.stringify(codes)}`,
    )
  })

  test('H1点眼の実データ（"アレジオン点眼液"）: displayName とキーが一致し ERROR が出ない', () => {
    const h1Eye = ALL_MODULES.find(m => m.moduleId === 'allergy_h1_antihistamine_eye_drops')!
    const codes = errorCodesOf(h1Eye)
    assert.ok(!codes.includes('BRAND_DISPLAY_NAME_MISMATCH'))
  })

  test('H1点眼で displayName だけ bare名（"アレジオン"）へ退行させる → BRAND_DISPLAY_NAME_MISMATCH で検出される', () => {
    const h1Eye = ALL_MODULES.find(m => m.moduleId === 'allergy_h1_antihistamine_eye_drops')!
    const broken = JSON.parse(JSON.stringify(h1Eye))
    broken.drug.brandCatalog['アレジオン点眼液'].displayName = 'アレジオン'
    const result = validateModule(broken)
    const err = result.errors.find(e => e.code === 'BRAND_DISPLAY_NAME_MISMATCH' && e.detail.includes('アレジオン点眼液'))
    assert.ok(err, 'displayName の退行が BRAND_DISPLAY_NAME_MISMATCH として検出されるべき')
    assert.equal(err!.isWarning, false, 'BRAND_DISPLAY_NAME_MISMATCH は isWarning:false（ERROR）のはず')
  })
})
