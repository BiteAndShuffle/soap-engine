/**
 * searchResolution.test.ts — U-2: brand resolution state の検証
 *
 * 検証対象:
 *   T-U2-1  既存 field projection が golden fixture と完全一致する
 *           （semantic metadata の追加が candidate 集合・ranking・既存 field を変えていない）
 *   T-U2-2  single-brand の unresolved 候補 → denotation='brand'
 *   T-U2-3  multi-brand / generic group 1 件 → denotation='generic'
 *   T-U2-4  multi-brand / generic group 複数 → denotation='module' かつ subject=null
 *   T-U2-5  exactAlias(score 7) が lowConfidence へ落ちても matchStrength='strong'
 *   T-U2-6  corpus 部分一致のみの候補 → matchStrength='weak'
 *   T-U2-7  generic resolution は authoritative な単一 brandKey を持たない
 *
 * 正本:
 *   - 型契約     : lib/brandResolution.ts
 *   - 設計根拠   : docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md
 *   - 未解決論点 : docs/OPEN_DESIGN_QUESTIONS.md Q-S2
 *
 * 注意: 本ファイルは既存テストの期待値を一切変更しない。新フィールドの検証のみを追加する。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, type SearchEntry } from '../lib/search'

const index: SearchEntry[] = ALL_MODULES.flatMap(m => buildSearchIndex(m))

/** module の brand 構成（テスト側で独立に算出し、実装の導出と突き合わせる） */
function shapeOf(moduleId: string) {
  const m = ALL_MODULES.find(x => x.moduleId === moduleId)!
  const bc = (m.drug?.brandCatalog ?? {}) as Record<string, { genericKey?: string; displayGenericName?: string; genericName?: string }>
  const groups = new Map<string, string[]>()
  for (const [b, e] of Object.entries(bc)) {
    const key = e.genericKey ?? e.displayGenericName ?? e.genericName
    if (key === undefined) continue
    const list = groups.get(key)
    if (list) list.push(b)
    else groups.set(key, [b])
  }
  return { brandCount: Object.keys(bc).length, groupCount: groups.size }
}

describe('T-U2-1 既存 field projection が golden fixture と一致する（ranking / candidate 集合の不変）', () => {
  const golden = JSON.parse(
    readFileSync(new URL('./fixtures/searchProjection.golden.json', import.meta.url), 'utf-8'),
  ) as Record<string, Array<Record<string, unknown>>>

  test('golden fixture が空でない', () => {
    assert.ok(Object.keys(golden).length > 0, 'golden fixture が空')
  })

  test('全クエリで U-2 以前から存在する field の投影が完全一致する', () => {
    const diffs: string[] = []
    for (const [query, expected] of Object.entries(golden)) {
      const actual = getDrugSuggestions(query, index, 8).map(r => ({
        moduleId: r.moduleId,
        matchedBrandName: r.matchedBrandName ?? null,
        drugDisplayLabel: r.drugDisplayLabel,
        uiLabel: r.uiLabel ?? null,
        representativeTemplateId: r.representativeTemplateId,
        isGenericLabel: r.isGenericLabel ?? null,
      }))
      if (JSON.stringify(actual) !== JSON.stringify(expected)) diffs.push(query)
    }
    assert.deepEqual(diffs, [], `既存 field の投影が変化したクエリ: ${diffs.join(', ')}`)
  })

  test('golden fixture は resolution / matchStrength を含まない（既存 field のみを固定する）', () => {
    const raw = readFileSync(new URL('./fixtures/searchProjection.golden.json', import.meta.url), 'utf-8')
    assert.ok(!raw.includes('"resolution"'), 'golden へ resolution が混入している')
    assert.ok(!raw.includes('"matchStrength"'), 'golden へ matchStrength が混入している')
  })
})

describe('T-U2-2 single-brand module の unresolved 候補は denotation=brand へ構造的に導出される', () => {
  // module 到達は module 単位 alias 経由で、brand 単位では未解決のままのケース（D-2 / D-3 / D-4）
  const cases: Array<[string, string, string]> = [
    ['D-2 リオベル', 'dm_dpp4_thiazolidinedione_combination_oral', 'ぴおぐりたぞんえんさんえん'],
    ['D-3 メタクト', 'dm_thiazolidinedione_biguanide_combination_oral', 'めとほるみんえんさんえん'],
    ['D-4 ツイミーグ', 'dm_imeglimin_oral', 'いめぐりみんえんさんえん'],
  ]
  for (const [label, moduleId, query] of cases) {
    test(`${label}: matchedBrandName が未確定でも resolution.denotation='brand'`, () => {
      const shape = shapeOf(moduleId)
      assert.equal(shape.brandCount, 1, `${moduleId} は single-brand である前提`)

      const hit = getDrugSuggestions(query, index, 8).find(r => r.moduleId === moduleId)
      assert.ok(hit, `${moduleId} の候補が見つからない`)

      // 既存 field は変更しない（未確定のまま）
      assert.equal(hit!.matchedBrandName, undefined, 'matchedBrandName は U-2 で書き換えない')

      // 新契約では brand が構造的に導出される
      assert.equal(hit!.resolution.denotation, 'brand')
      if (hit!.resolution.denotation === 'brand') {
        const brandNames = ALL_MODULES.find(m => m.moduleId === moduleId)!.drug!.brandNames!
        assert.equal(hit!.resolution.brandKey, brandNames[0])
        assert.equal(hit!.resolution.subject, brandNames[0])
      }
    })
  }
})

describe('T-U2-3 multi-brand / generic group 1 件の module は denotation=generic', () => {
  test('heparinoid cream（brand 2 / group 1）の unresolved 候補が generic になる', () => {
    const moduleId = 'derm_heparinoid_moisturizer_cream'
    const shape = shapeOf(moduleId)
    assert.ok(shape.brandCount > 1, 'multi-brand である前提')
    assert.equal(shape.groupCount, 1, 'generic group が 1 件である前提')

    // 構造から導出される期待値（実装と独立に算出）
    const m = ALL_MODULES.find(x => x.moduleId === moduleId)!
    const bc = m.drug!.brandCatalog as Record<string, { displayGenericName?: string }>
    const expectedSubject = bc[m.drug!.brandNames![0]].displayGenericName

    // module 全体が 1 group であるため、brand 未解決時は generic 主語が確定できる
    const results = getDrugSuggestions('へぱりんるいじぶっしつ', index, 8)
    const hit = results.find(r => r.moduleId === moduleId)
    assert.ok(hit, `${moduleId} の候補が見つからない`)
    if (hit!.resolution.denotation === 'generic') {
      assert.equal(hit!.resolution.subject, expectedSubject)
      assert.ok(hit!.resolution.brandKeys.length > 1, 'group を構成する brand が列挙されている')
    }
  })
})

describe('T-U2-4 multi-brand / generic group 複数の module は denotation=module / subject=null', () => {
  const cases: Array<[string, string, string]> = [
    ['D-1 メトアナ系（brand 4 / group 4）', 'dm_dpp4_biguanide_combination_oral', 'めとほるみんえんさんえん'],
    ['leukotriene（brand 5 / group 2）', 'allergy_leukotriene_receptor_antagonist_oral', 'ろいことりえん'],
  ]
  for (const [label, moduleId, query] of cases) {
    test(`${label}: 静かに 1 brand へ確定せず module 未確定として表明される`, () => {
      const shape = shapeOf(moduleId)
      assert.ok(shape.brandCount > 1 && shape.groupCount > 1, '真に曖昧な構造である前提')

      const hit = getDrugSuggestions(query, index, 8).find(r => r.moduleId === moduleId)
      assert.ok(hit, `${moduleId} の候補が見つからない`)
      assert.equal(hit!.resolution.denotation, 'module')
      if (hit!.resolution.denotation === 'module') {
        assert.equal(hit!.resolution.subject, null, 'SOAP 主語を生成してはならない')
        assert.equal(hit!.resolution.brandKey, null, 'brand へ確定してはならない')
      }
    })
  }
})

describe('T-U2-5 exactAlias(score 7) は lowConfidence 経路でも matchStrength=strong', () => {
  test('薬効クラス名での検索（brand 未解決）でも strong と判定される', () => {
    // "ロイコトリエン受容体拮抗薬" は drug.search.exactAliases に登録されており score 7 に達する。
    // brand は解決できないため lowConfidence 経路へ落ちるが、一致自体は最も強い。
    const hit = getDrugSuggestions('ろいことりえん受容体拮抗薬', index, 8)
      .find(r => r.moduleId === 'allergy_leukotriene_receptor_antagonist_oral')
    assert.ok(hit, '候補が見つからない')
    assert.equal(hit!.matchedBrandName, undefined, 'brand は未解決である前提')
    assert.equal(hit!.matchStrength, 'strong', 'exactAlias 一致は strong でなければならない')
  })

  test('module 単位 alias 完全一致（score 5）も strong', () => {
    const hit = getDrugSuggestions('ろいことりえん', index, 8)
      .find(r => r.moduleId === 'allergy_leukotriene_receptor_antagonist_oral')
    assert.ok(hit)
    assert.equal(hit!.matchStrength, 'strong')
  })
})

describe('T-U2-6 corpus 部分一致のみの候補は matchStrength=weak', () => {
  test('categoryPath 由来の語（"アレルギー"）での一致は weak', () => {
    const results = getDrugSuggestions('あれるぎー', index, 8)
    assert.ok(results.length > 0, '候補が返らない')
    for (const r of results) {
      assert.equal(r.matchStrength, 'weak', `${r.moduleId} は weak であるべき`)
    }
  })
})

describe('T-U2-7 generic resolution は authoritative な単一 brandKey を持たない', () => {
  test('denotation=generic の候補に brandKey フィールドが存在しない', () => {
    const queries = ['ぴおぐりたぞんえんさんえん', 'いんすりんあすぱると', 'へぱりんるいじぶっしつ', 'いんすりんひと']
    let checked = 0
    for (const q of queries) {
      for (const r of getDrugSuggestions(q, index, 8)) {
        if (r.resolution.denotation !== 'generic') continue
        checked++
        assert.ok(
          !('brandKey' in r.resolution),
          `generic resolution が単一 brandKey を持っている: ${q} / ${r.moduleId}`,
        )
        assert.ok(r.resolution.brandKeys.length > 0, 'brandKeys が空')
        assert.ok(r.resolution.genericKey.length > 0, 'genericKey が空')
      }
    }
    assert.ok(checked > 0, 'generic resolution の候補が 1 件も検証されていない')
  })

  test('generic header 候補は matchedBrandName を持っていても generic として扱われる', () => {
    // 既存の generic header は group 先頭 brand を matchedBrandName に持つ。
    // これは authoritative な brand ではないため、resolution 側で generic と表明される必要がある。
    const hit = getDrugSuggestions('いんすりんあすぱると', index, 8)
      .find(r => r.isGenericLabel === true && r.moduleId === 'dm_insulin_mixed_rapid_intermediate')
    assert.ok(hit, 'generic header 候補が見つからない')
    assert.notEqual(hit!.matchedBrandName, undefined, '既存 field は代表 brand を持つ（U-2 で変更しない）')
    assert.equal(hit!.resolution.denotation, 'generic', '代表 brand を authoritative とみなしてはならない')
  })
})
