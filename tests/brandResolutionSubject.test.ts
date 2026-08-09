/**
 * brandResolutionSubject.test.ts — U-3: resolveSubjectFromResolution() の回帰テスト
 *
 * 対象: BrandResolution → SOAP subject の新しい正式契約（`lib/drugSubject.ts`）。
 *
 * **移行状態**: 本関数はまだ production consumer を持たない（U-4 で移行予定）。
 * 既存の legacy resolver（`resolveDrugName(drug, matchedBrandName)`）の契約テストは
 * `tests/drugSubject.test.ts` に分離されており、本ファイルでは変更しない。
 *
 * 正本:
 *   - 型契約     : lib/brandResolution.ts
 *   - 未解決論点 : docs/OPEN_DESIGN_QUESTIONS.md Q-S2
 *   - 設計根拠   : docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md
 *
 * 検証対象:
 *   T-U3-1  denotation='brand'  → subject と同一の文字列を返す
 *   T-U3-2  denotation='generic' → group の一般名（subject）を返す
 *   T-U3-3  denotation='module' → null（未確定を推測しない）
 *   T-U3-4  brandNames[0] 相当の fallback が存在しないこと
 *   T-U3-5  uiLabel / drugDisplayLabel を入力にしないこと（signature レベルで保証）
 *   T-U3-6  genericKey / brandKeys から subject を再導出せず、
 *           resolution.subject のみを唯一の入力として使うこと
 *
 * 実行:
 *   npx tsx --test tests/brandResolutionSubject.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import type { BrandResolution } from '../lib/brandResolution'
import { resolveSubjectFromResolution } from '../lib/drugSubject'

describe('T-U3-1 denotation=brand は subject をそのまま返す', () => {
  test('D-2 相当（リオベル）: brandKey と subject が一致するケース', () => {
    const resolution: BrandResolution = { denotation: 'brand', brandKey: 'リオベル', subject: 'リオベル' }
    assert.equal(resolveSubjectFromResolution(resolution), 'リオベル')
  })

  test('D-3 相当（メタクト）', () => {
    const resolution: BrandResolution = { denotation: 'brand', brandKey: 'メタクト', subject: 'メタクト' }
    assert.equal(resolveSubjectFromResolution(resolution), 'メタクト')
  })

  test('D-4 相当（ツイミーグ）', () => {
    const resolution: BrandResolution = { denotation: 'brand', brandKey: 'ツイミーグ', subject: 'ツイミーグ' }
    assert.equal(resolveSubjectFromResolution(resolution), 'ツイミーグ')
  })
})

describe('T-U3-2 denotation=generic は group の一般名（subject）を返す', () => {
  test('heparinoid cream 相当: 複数 brand を束ねる generic group', () => {
    const resolution: BrandResolution = {
      denotation: 'generic',
      genericKey: 'heparinoid',
      brandKeys: ['ヒルドイドソフト軟膏', 'ヘパリン類似物質クリーム'],
      subject: 'ヘパリン類似物質クリーム',
    }
    assert.equal(resolveSubjectFromResolution(resolution), 'ヘパリン類似物質クリーム')
  })

  test('subject は brandKeys の並び順に依存しない（配列順を入れ替えても同一 subject）', () => {
    const a: BrandResolution = {
      denotation: 'generic', genericKey: 'k', brandKeys: ['甲', '乙'], subject: '一般名X',
    }
    const b: BrandResolution = {
      denotation: 'generic', genericKey: 'k', brandKeys: ['乙', '甲'], subject: '一般名X',
    }
    assert.equal(resolveSubjectFromResolution(a), resolveSubjectFromResolution(b))
  })
})

describe('T-U3-3 denotation=module は null を返す（未確定を推測しない）', () => {
  test('D-1 相当（メトアナ系4値曖昧）', () => {
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.equal(resolveSubjectFromResolution(resolution), null)
  })

  test('leukotriene 相当（class-level query）', () => {
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.equal(resolveSubjectFromResolution(resolution), null)
  })

  test('throw しない（null は正常な domain state であり例外ではない）', () => {
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.doesNotThrow(() => resolveSubjectFromResolution(resolution))
  })
})

describe('T-U3-4 brandNames[0] 相当の fallback が存在しないこと', () => {
  test('module 未確定時、いかなる非 null 値も返さない', () => {
    // 「唯一のbrandへ静かに確定する」という legacy resolver の fallback パターンを
    // 新関数が再現していないことを確認する。入力に brandNames[0] 相当の情報が
    // 一切存在しない（BrandResolution の module member は brandKey: null を型で強制する）。
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    const result = resolveSubjectFromResolution(resolution)
    assert.notEqual(typeof result, 'string', 'module 未確定時に文字列を返してはならない')
    assert.equal(result, null)
  })
})

describe('T-U3-5 uiLabel / drugDisplayLabel を入力にしないこと', () => {
  test('関数は BrandResolution のみを引数に取る（型シグネチャで保証）', () => {
    // resolveSubjectFromResolution は BrandResolution のみを受け取り、
    // uiLabel / drugDisplayLabel といった表示専用フィールドを持つ
    // DrugSuggestionItem 型を一切参照しない。関数の arity（引数の個数）が
    // 1 であることが、それらを参照する余地がないことの直接的な証拠である。
    assert.equal(resolveSubjectFromResolution.length, 1)
  })
})

describe('T-U3-6 resolution.subject のみを唯一の入力として使うこと', () => {
  test('genericKey / brandKeys の値を変えても subject が同じなら結果は同じ', () => {
    const withManyBrands: BrandResolution = {
      denotation: 'generic', genericKey: 'k1', brandKeys: ['A', 'B', 'C', 'D'], subject: '一般名Y',
    }
    const withFewerBrands: BrandResolution = {
      denotation: 'generic', genericKey: 'k2', brandKeys: ['A'], subject: '一般名Y',
    }
    assert.equal(
      resolveSubjectFromResolution(withManyBrands),
      resolveSubjectFromResolution(withFewerBrands),
      'genericKey / brandKeys の内容差は subject の解決結果へ影響してはならない',
    )
  })

  test('brandKey の値を変えても、brand denotation では subject のみが結果を決める', () => {
    const resolution: BrandResolution = { denotation: 'brand', brandKey: '任意のキー', subject: '確定した主語' }
    assert.equal(resolveSubjectFromResolution(resolution), '確定した主語')
  })
})
