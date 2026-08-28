/**
 * rapidSentenceAdjustmentConjunction.test.ts — P-R3B condition-aware conjunction 契約テスト
 *
 * `lib/rapidSentence.ts` の `buildResolvedSFirstSentence()` は、
 * `display.adjustmentExpression`（bridge からの past-clause free-text preservation
 * field）が存在する scenario の Rapid 先頭文で、`dose_increased` / `dose_decreased`
 * を condSuffix に接続する。P-R3B 以前は condition に関わらず接続助詞が「が、」に
 * 固定されており、`stable` / `improved` / `unchanged` で不成立の逆接
 * （「増量となった**が**、症状は良くなってきた」）が生成されていた（CF-12）。
 *
 * P-R3B（OD-PR3-5 / OD-PR3-7）が固定する契約:
 *   stable / improved / unchanged → 「ところ、」（中立的観察。因果・逆接を主張しない）
 *   not_improved                  → 「が、」（逆接を維持）
 *
 * ── tautological coverage を避ける ─────────────────────────────────────
 *
 * 既存の Rapid 関連 test（rapidStateUnit1 等）の多くは、期待値の計算にも
 * production の `buildResolvedSFirstSentence()` を呼んでおり、production の
 * バグがそのまま期待値にも複製される構造になっている。本ファイルはその pattern
 * を採らない: production helper は「検証対象」としてのみ呼び、期待値は
 * literal な日本語文字列として本ファイル内に固定する。期待値側で
 * `buildResolvedSFirstSentence` を再利用しない。test-local な production
 * sentence builder の mirror implementation も持たない。
 *
 * 実行:
 *   npx tsx --test tests/rapidSentenceAdjustmentConjunction.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildResolvedSFirstSentence,
  type AdjustmentExpression,
} from '../lib/rapidSentence'

const DRUG = 'メトホルミン'

const AE_ZOURYOU: AdjustmentExpression = { increasePast: '増量となった', decreasePast: '減量となった' }
const AE_TENGAN: AdjustmentExpression = { increasePast: '点眼回数が増えた', decreasePast: '点眼回数が減った' }
const AE_SHIYOUKAISUU: AdjustmentExpression = { increasePast: '使用回数が増えた', decreasePast: '使用回数が減った' }
const AE_SHIYOURYOU: AdjustmentExpression = { increasePast: '使用量が増えた', decreasePast: '使用量が減った' }

// ═══════════════════════════════════════════════════════════════
// A. AE present / dose_increased（増量となった）— 4 condition 全固定
// ═══════════════════════════════════════════════════════════════

describe('A. AE present / dose_increased（増量となった）', () => {
  test('stable → 「ところ、」', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'stable', DRUG, AE_ZOURYOU)
    assert.equal(actual, '前回からメトホルミンの増量となったところ、症状は落ち着いている。')
  })

  test('improved → 「ところ、」', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'improved', DRUG, AE_ZOURYOU)
    assert.equal(actual, '前回からメトホルミンの増量となったところ、症状は良くなってきた。')
  })

  test('unchanged → 「ところ、」', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'unchanged', DRUG, AE_ZOURYOU)
    assert.equal(actual, '前回からメトホルミンの増量となったところ、症状は変わりない。')
  })

  test('not_improved → 「が、」（逆接維持）', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'not_improved', DRUG, AE_ZOURYOU)
    assert.equal(actual, '前回からメトホルミンの増量となったが、十分な改善はみられない。')
  })
})

// ═══════════════════════════════════════════════════════════════
// B. AE present / dose_decreased（減量となった）
// ═══════════════════════════════════════════════════════════════

describe('B. AE present / dose_decreased（減量となった）', () => {
  test('stable → 「ところ、」', () => {
    const actual = buildResolvedSFirstSentence('dose_decreased', 'stable', DRUG, AE_ZOURYOU)
    assert.equal(actual, '前回からメトホルミンの減量となったところ、症状は落ち着いている。')
  })

  test('improved → 「ところ、」', () => {
    const actual = buildResolvedSFirstSentence('dose_decreased', 'improved', DRUG, AE_ZOURYOU)
    assert.equal(actual, '前回からメトホルミンの減量となったところ、症状は良くなってきた。')
  })

  test('not_improved → 「が、」（逆接維持）', () => {
    const actual = buildResolvedSFirstSentence('dose_decreased', 'not_improved', DRUG, AE_ZOURYOU)
    assert.equal(actual, '前回からメトホルミンの減量となったが、十分な改善はみられない。')
  })
})

// ═══════════════════════════════════════════════════════════════
// C. expression family coverage — corpus 上の他 family でも
//    past expression が runtime で改変されず、接続助詞のみが condition
//    に応じて切り替わることを固定する
// ═══════════════════════════════════════════════════════════════

describe('C. expression family coverage（点眼回数 / 使用回数 / 使用量）', () => {
  test('点眼回数が増えた × improved → 「ところ、」・expression 無改変', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'improved', DRUG, AE_TENGAN)
    assert.equal(actual, '前回からメトホルミンの点眼回数が増えたところ、症状は良くなってきた。')
  })

  test('点眼回数が減った × not_improved → 「が、」・expression 無改変', () => {
    const actual = buildResolvedSFirstSentence('dose_decreased', 'not_improved', DRUG, AE_TENGAN)
    assert.equal(actual, '前回からメトホルミンの点眼回数が減ったが、十分な改善はみられない。')
  })

  test('使用回数が増えた × unchanged → 「ところ、」・expression 無改変', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'unchanged', DRUG, AE_SHIYOUKAISUU)
    assert.equal(actual, '前回からメトホルミンの使用回数が増えたところ、症状は変わりない。')
  })

  test('使用量が増えた × stable → 「ところ、」・expression 無改変（正規化されない）', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'stable', DRUG, AE_SHIYOURYOU)
    assert.equal(actual, '前回からメトホルミンの使用量が増えたところ、症状は落ち着いている。')
    // 「使用量」が「使用回数」へ runtime 正規化されていないことを明示確認する
    // （P-R3A preservation contract が禁じる route-based wording mapping の再発防止）
    assert.ok(actual.includes('使用量'), 'expression が改変されている（使用量 が失われた）')
    assert.ok(!actual.includes('使用回数'), 'expression が使用回数へ誤って正規化されている')
  })

  test('使用量が減った × not_improved → 「が、」・expression 無改変', () => {
    const actual = buildResolvedSFirstSentence('dose_decreased', 'not_improved', DRUG, AE_SHIYOURYOU)
    assert.equal(actual, '前回からメトホルミンの使用量が減ったが、十分な改善はみられない。')
  })
})

// ═══════════════════════════════════════════════════════════════
// D. AE absent fallback — P-R3B で変更されていないことの回帰保護
// ═══════════════════════════════════════════════════════════════

describe('D. AE absent fallback（P-R3B で wording 不変であること）', () => {
  test('dose_increased / stable（AE なし）', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'stable', DRUG, undefined)
    assert.equal(actual, '前回からメトホルミンが増量となり落ち着いている。')
  })

  test('dose_increased / not_improved（AE なし）', () => {
    const actual = buildResolvedSFirstSentence('dose_increased', 'not_improved', DRUG, undefined)
    assert.equal(actual, '前回からメトホルミンが増量となったが、十分な改善はみられない。')
  })

  test('dose_decreased / improved（AE なし）', () => {
    const actual = buildResolvedSFirstSentence('dose_decreased', 'improved', DRUG, undefined)
    assert.equal(actual, '前回からメトホルミンが減量となり良くなってきた。')
  })

  test('dose_decreased / not_improved（AE なし）', () => {
    const actual = buildResolvedSFirstSentence('dose_decreased', 'not_improved', DRUG, undefined)
    assert.equal(actual, '前回からメトホルミンが減量となったが、十分な改善はみられない。')
  })
})

// ═══════════════════════════════════════════════════════════════
// E. non-adjustment relation — AE の有無で出力が変化しないことの固定
// ═══════════════════════════════════════════════════════════════

describe('E. non-adjustment relation（AE 有無で出力が同一）', () => {
  test('new_addition: AE 有無で出力同一', () => {
    const withAE = buildResolvedSFirstSentence('new_addition', 'stable', DRUG, AE_ZOURYOU)
    const withoutAE = buildResolvedSFirstSentence('new_addition', 'stable', DRUG, undefined)
    assert.equal(withAE, withoutAE)
    assert.equal(withAE, '前回から新しくメトホルミンを使用して落ち着いている。')
  })

  test('med_changed: AE 有無で出力同一', () => {
    const withAE = buildResolvedSFirstSentence('med_changed', 'not_improved', DRUG, AE_ZOURYOU)
    const withoutAE = buildResolvedSFirstSentence('med_changed', 'not_improved', DRUG, undefined)
    assert.equal(withAE, withoutAE)
    assert.equal(withAE, '前回からメトホルミンに変更となったが、十分な改善はみられない。')
  })

  test('continued_do: AE 有無で出力同一（薬剤名なしが自然）', () => {
    const withAE = buildResolvedSFirstSentence('continued_do', 'improved', DRUG, AE_ZOURYOU)
    const withoutAE = buildResolvedSFirstSentence('continued_do', 'improved', DRUG, undefined)
    assert.equal(withAE, withoutAE)
    assert.equal(withAE, '引き続き使用して良くなってきた。')
  })
})

// ═══════════════════════════════════════════════════════════════
// F. one-sentence invariant — RAPID-V2-05 の先頭文 1 文契約を破壊していないこと
// ═══════════════════════════════════════════════════════════════

describe('F. one-sentence invariant（sentence terminator「。」が1個のみ）', () => {
  const cases: Array<[import('../lib/rapidSentence').SRelation, import('../lib/rapidSentence').SCondition, AdjustmentExpression]> = [
    ['dose_increased', 'stable', AE_ZOURYOU],
    ['dose_increased', 'improved', AE_TENGAN],
    ['dose_increased', 'unchanged', AE_SHIYOUKAISUU],
    ['dose_increased', 'not_improved', AE_SHIYOURYOU],
    ['dose_decreased', 'stable', AE_ZOURYOU],
    ['dose_decreased', 'not_improved', AE_TENGAN],
  ]

  for (const [relation, condition, ae] of cases) {
    test(`${relation} / ${condition} / ${ae.increasePast}: 「。」は1個のみ`, () => {
      const actual = buildResolvedSFirstSentence(relation, condition, DRUG, ae)
      const dotCount = (actual.match(/。/g) ?? []).length
      assert.equal(dotCount, 1, `期待は1個、実際は${dotCount}個: "${actual}"`)
      assert.ok(actual.endsWith('。'), `文末が「。」で終わっていない: "${actual}"`)
    })
  }
})
