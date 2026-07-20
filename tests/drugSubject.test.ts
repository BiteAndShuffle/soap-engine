/**
 * drugSubject.test.ts
 *
 * resolveDrugName() / resolveDrugSubject() の回帰テスト。
 *
 * 対象: displayGenericName を表示用一般名の SSOT として一本化した変更
 *   - 商品名選択時（matchedBrandName あり）→ 商品名そのもの
 *   - ブランド未確定時（matchedBrandName なし）→ brandNames[0] の displayGenericName
 *   - genericName（正式名称）への暗黙フォールバックが行われないこと
 *
 * 実行:
 *   npx tsx --test tests/drugSubject.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ALL_MODULES } from '../data/modules/index'
import { resolveDrugName, resolveDrugSubject, DRUG_SUBJECT_SLOT } from '../lib/drugSubject'

const imeglimin = ALL_MODULES.find(m => m.moduleId === 'dm_imeglimin_oral')!
const dpp4Biguanide = ALL_MODULES.find(m => m.moduleId === 'dm_dpp4_biguanide_combination_oral')!

describe('resolveDrugName: 商品名選択時', () => {
  test('matchedBrandName が与えられた場合はそのまま商品名を返す', () => {
    assert.equal(resolveDrugName(imeglimin.drug, 'ツイミーグ'), 'ツイミーグ')
  })

  test('genericName（塩類名を含む正式名称）が商品名選択時の結果に混入しない', () => {
    const result = resolveDrugName(imeglimin.drug, 'ツイミーグ')
    assert.ok(!result.includes('塩酸塩'), `商品名選択時に塩類名が混入している: "${result}"`)
  })
})

describe('resolveDrugName: ブランド未確定時', () => {
  test('matchedBrandName 省略時は brandNames[0] の displayGenericName を返す（イメグリミン）', () => {
    assert.equal(resolveDrugName(imeglimin.drug, undefined), 'イメグリミン')
  })

  test('drug.genericName（正式名称・塩類名含む）へフォールバックしない', () => {
    const result = resolveDrugName(imeglimin.drug, undefined)
    assert.notEqual(result, imeglimin.drug?.brandCatalog?.['ツイミーグ']?.genericName)
    assert.ok(!result.includes('塩酸塩'), `ブランド未確定時の結果に塩類名が混入している: "${result}"`)
  })
})

describe('resolveDrugName: 配合剤（ブランドごとに異なる displayGenericName）', () => {
  test('メトアナ選択時は商品名がそのまま返る（displayGenericName は混入しない）', () => {
    assert.equal(resolveDrugName(dpp4Biguanide.drug, 'メトアナ'), 'メトアナ')
  })

  test('ブランド未確定時は brandNames[0]（メトアナ）の displayGenericName に解決される', () => {
    assert.equal(resolveDrugName(dpp4Biguanide.drug, undefined), 'アナグリプチン/メトホルミン')
  })

  test('各ブランドの displayGenericName は成分構成に応じて個別の値を持つ', () => {
    const cat = dpp4Biguanide.drug!.brandCatalog!
    assert.equal(cat['メトアナ'].displayGenericName, 'アナグリプチン/メトホルミン')
    assert.equal(cat['エクメット'].displayGenericName, 'ビルダグリプチン/メトホルミン')
    assert.equal(cat['イニシンク'].displayGenericName, 'アログリプチン/メトホルミン')
    // エクメットとメホビルは同一成分（GE関係）のため同値
    assert.equal(cat['メホビル'].displayGenericName, cat['エクメット'].displayGenericName)
  })
})

describe('resolveDrugName: 解決不能時', () => {
  test('brandNames も brandCatalog も持たない drug では空文字を返す（genericName へは逃げない）', () => {
    const bareDrug = { genericName: 'クラス名のみ' }
    assert.equal(resolveDrugName(bareDrug, undefined), '')
  })
})

describe('{{drug_subject}} 解決の end-to-end（resolveDrugName → resolveDrugSubject）', () => {
  test('商品名選択時: {{drug_subject}} に商品名が入る', () => {
    const drugName = resolveDrugName(imeglimin.drug, 'ツイミーグ')
    const resolved = resolveDrugSubject(
      { S: `${DRUG_SUBJECT_SLOT}を開始した。`, O: '', A: '', P: '' },
      drugName,
    )
    assert.equal(resolved.S, 'ツイミーグを開始した。')
  })

  test('ブランド未確定時: {{drug_subject}} に displayGenericName（塩類名なし）が入る', () => {
    const drugName = resolveDrugName(imeglimin.drug, undefined)
    const resolved = resolveDrugSubject(
      { S: `${DRUG_SUBJECT_SLOT}を開始した。`, O: '', A: '', P: '' },
      drugName,
    )
    assert.equal(resolved.S, 'イメグリミンを開始した。')
    assert.ok(!resolved.S.includes('塩酸塩'))
  })
})
