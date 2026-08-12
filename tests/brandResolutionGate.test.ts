/**
 * brandResolutionGate.test.ts — U-5: BrandResolution による安全 gate
 *
 * 検証対象:
 *   T-U5-1  denotation='module' の候補で gate 判定が true になる（SOAP 生成不可）
 *   T-U5-2  denotation='generic' / 'brand' で gate 判定が false（SOAP 生成可）
 *   T-U5-3  resolution === undefined（Express / 初期ロード）で gate は発火しない
 *   T-U5-4  getVisibleAddonKeys(undefined) と (…, []) の意味差が固定されている
 *   T-U5-5  generic 交差集合が brandKeys の順序に依存しない
 *   T-U5-6  交差集合は brandKeys 全件が持つタグのみを返す（heparinoid で剤形タグが脱落）
 *   T-U5-7  denotation='brand' の導出が brandCatalog[brandKey].handlingTags と一致する
 *   T-U5-8  代表 brand 選択（brandKeys への添字アクセス）が実装に存在しない
 *   T-U5-9  primary context を切り替える全遷移が activeResolution の lifecycle を含む
 *   T-U5-10 Express primary 分岐が直前の検索由来 resolution を破棄する
 *   T-U5-11 resolution と brandCatalog の module 一致は呼び出し側の責務である（純関数の性質）
 *
 * 正本:
 *   - 型契約     : lib/brandResolution.ts
 *   - 導出規則   : lib/brandTags.ts
 *   - 設計根拠   : docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md §13
 *   - 未解決論点 : docs/OPEN_DESIGN_QUESTIONS.md Q-S2
 *
 * 注意: 本ファイルは既存テストの期待値を一切変更しない。
 *       gate は resolution.denotation のみを読み、subject は読まない（U-4b の責務）。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, type SearchEntry } from '../lib/search'
import { getVisibleAddonKeys } from '../lib/addonFilter'
import {
  intersectHandlingTags,
  resolveBrandHandlingTags,
  resolveDataAccessBrandKey,
  isSubjectUnresolved,
  type BrandCatalog,
} from '../lib/brandTags'
import type { BrandResolution } from '../lib/brandResolution'
import type { ModuleData } from '../lib/types'

const index: SearchEntry[] = ALL_MODULES.flatMap(m => buildSearchIndex(m))
const modOf = (id: string) => ALL_MODULES.find(m => m.moduleId === id) as unknown as ModuleData
const catalogOf = (id: string): BrandCatalog => (modOf(id).drug?.brandCatalog ?? {}) as BrandCatalog

// ─────────────────────────────────────────────────────────────

describe('T-U5-1 denotation=module は gate される（SOAP 生成不可）', () => {
  // Repository 実測（2026-08-12）で denotation='module' へ到達するクエリ。
  const cases: Array<[string, string]> = [
    ['SGLT2阻害薬', 'dm_sglt2_oral'],
    ['DPP-4阻害薬', 'dm_dpp4_oral'],
    ['花粉症', 'allergy_leukotriene_receptor_antagonist_oral'],
    ['ろいことりえん', 'allergy_leukotriene_receptor_antagonist_oral'],
    ['持効型インスリン製剤', 'dm_insulin_long_acting'],
    ['ビグアナイド系糖尿病薬', 'dm_biguanide_metformin_oral'],
  ]
  for (const [query, moduleId] of cases) {
    test(`"${query}" → ${moduleId} は gate される`, () => {
      const hit = getDrugSuggestions(query, index, 8).find(r => r.moduleId === moduleId)
      assert.ok(hit, `${moduleId} の候補が見つからない`)
      assert.equal(hit!.resolution.denotation, 'module')
      assert.equal(isSubjectUnresolved(hit!.resolution), true, 'gate が発火しなければならない')
    })
  }

  test('module では brand 固有解決も遮断される（handlingTags=[] / brandKey=null）', () => {
    const r: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.deepEqual(resolveBrandHandlingTags(r, catalogOf('dm_sglt2_oral'), 'フォシーガ'), [])
    assert.equal(resolveDataAccessBrandKey(r, 'フォシーガ'), null)
  })

  test('gate は subject を読まない（subject を書き換えても判定が変わらない）', () => {
    // 型契約上 module の subject は null 固定だが、gate が denotation のみに依存することを
    // 明示的に固定する（U-4b の subject 移行と gate を独立に保つため）。
    const r = { denotation: 'module', brandKey: null, subject: null } as BrandResolution
    const forged = { ...r, subject: 'ダミー主語' } as unknown as BrandResolution
    assert.equal(isSubjectUnresolved(forged), true, 'subject の値は gate 判定に影響してはならない')
  })
})

describe('T-U5-2 denotation=generic / brand は gate されない（SOAP 生成可）', () => {
  test('generic: subject が確定しているため生成を止めない', () => {
    const hit = getDrugSuggestions('ヒトインスリン', index, 8).find(r => r.moduleId === 'dm_insulin_regular')
    assert.ok(hit)
    assert.equal(hit!.resolution.denotation, 'generic')
    assert.equal(isSubjectUnresolved(hit!.resolution), false, 'generic を過剰に禁止してはならない')
  })

  test('generic: authoritative な brandKey は持たない（データアクセスキーは null）', () => {
    const hit = getDrugSuggestions('ヒトインスリン', index, 8).find(r => r.moduleId === 'dm_insulin_regular')
    assert.ok(hit)
    assert.equal(resolveDataAccessBrandKey(hit!.resolution, 'ノボリンR'), null)
  })

  test('brand: 従来どおり生成可・brandKey は authoritative', () => {
    const hit = getDrugSuggestions('りべるさす', index, 8).find(r => r.moduleId === 'dm_glp1ra_semaglutide_oral')
    assert.ok(hit)
    assert.equal(hit!.resolution.denotation, 'brand')
    assert.equal(isSubjectUnresolved(hit!.resolution), false)
    if (hit!.resolution.denotation === 'brand') {
      assert.equal(resolveDataAccessBrandKey(hit!.resolution, undefined), hit!.resolution.brandKey)
    }
  })
})

describe('T-U5-3 resolution === undefined（Express / 初期ロード）は従来どおり', () => {
  test('gate は発火しない', () => {
    assert.equal(isSubjectUnresolved(undefined), false)
  })

  test('handlingTags は legacy キーから従来どおり解決される', () => {
    const bc = catalogOf('dm_glp1ra_semaglutide_oral')
    assert.deepEqual(
      resolveBrandHandlingTags(undefined, bc, 'リベルサス'),
      bc['リベルサス']?.handlingTags,
    )
  })

  test('legacy キーも無い場合は undefined（フィルタ非適用の既存後方互換）', () => {
    assert.equal(resolveBrandHandlingTags(undefined, catalogOf('dm_sglt2_oral'), undefined), undefined)
  })

  test('データアクセスキーも legacy キーをそのまま返す', () => {
    assert.equal(resolveDataAccessBrandKey(undefined, 'フォシーガ'), 'フォシーガ')
  })
})

describe('T-U5-4 getVisibleAddonKeys の undefined と [] の意味差', () => {
  // requiredTags を持つ ADDON が実在する module を使う（実測: dm_dpp4_oral / addon_weekly_dpp4_admin）
  const mod = modOf('dm_dpp4_oral')
  const scenarioWithGatedAddon = mod.scenarios.find(sc => {
    const ref = sc.addonsRef
    if (!ref) return false
    const keys = (['S', 'O', 'A', 'P'] as const).flatMap(k => ref[k] ?? [])
    return keys.some(k => ((mod.addons?.items?.[k] as { requiredTags?: string[] } | undefined)?.requiredTags?.length ?? 0) > 0)
  })

  test('前提: requiredTags 付き ADDON を参照するシナリオが存在する', () => {
    assert.ok(scenarioWithGatedAddon, 'requiredTags 付き ADDON を持つシナリオが見つからない')
  })

  test('undefined はフィルタを適用しない（requiredTags 付きも表示される）', () => {
    const keys = getVisibleAddonKeys(mod.addons, scenarioWithGatedAddon, undefined)
    const gated = keys.filter(k => ((mod.addons?.items?.[k] as { requiredTags?: string[] } | undefined)?.requiredTags?.length ?? 0) > 0)
    assert.ok(gated.length > 0, 'undefined では requiredTags 付き ADDON が残らなければならない（既存後方互換）')
  })

  test('[] は requiredTags 付きのみ非表示にし、requiredTags なしは残す', () => {
    const keys = getVisibleAddonKeys(mod.addons, scenarioWithGatedAddon, [])
    const gated = keys.filter(k => ((mod.addons?.items?.[k] as { requiredTags?: string[] } | undefined)?.requiredTags?.length ?? 0) > 0)
    assert.equal(gated.length, 0, '[] では requiredTags 付き ADDON は満たせない')
    assert.ok(keys.length > 0, 'requiredTags を持たない ADDON は残らなければならない')
  })

  test('undefined と [] の結果は同一であってはならない（意味差の固定）', () => {
    const a = getVisibleAddonKeys(mod.addons, scenarioWithGatedAddon, undefined)
    const b = getVisibleAddonKeys(mod.addons, scenarioWithGatedAddon, [])
    assert.notDeepEqual(a, b, 'undefined を未確定表現に流用する退行の検出')
  })
})

describe('T-U5-5 交差集合は brandKeys の順序に依存しない', () => {
  test('全 module の複数 brand generic group で順列・逆順・ソート順が同値', () => {
    let checked = 0
    for (const m of ALL_MODULES) {
      const bc = catalogOf(m.moduleId)
      const groups = new Map<string, string[]>()
      for (const [b, e] of Object.entries(bc)) {
        const key = e.genericKey ?? e.displayGenericName ?? e.genericName
        if (key === undefined) continue
        const list = groups.get(key)
        if (list) list.push(b)
        else groups.set(key, [b])
      }
      for (const [, brands] of groups) {
        if (brands.length < 2) continue
        checked++
        const base = intersectHandlingTags(brands, bc)
        assert.deepEqual(intersectHandlingTags([...brands].reverse(), bc), base, `${m.moduleId}: 逆順で不一致`)
        assert.deepEqual(intersectHandlingTags([...brands].sort(), bc), base, `${m.moduleId}: ソート順で不一致`)
      }
    }
    assert.ok(checked > 0, '複数 brand の generic group が 1 件も検証されていない')
  })

  test('空の brandKeys は [] を返す', () => {
    assert.deepEqual(intersectHandlingTags([], catalogOf('dm_sglt2_oral')), [])
  })
})

describe('T-U5-6 交差集合は brandKeys 全件が持つタグのみを返す', () => {
  test('heparinoid ointment: group 内で異なる剤形タグが脱落する', () => {
    const moduleId = 'derm_heparinoid_moisturizer_ointment'
    const bc = catalogOf(moduleId)
    const brands = Object.keys(bc)
    assert.ok(brands.length >= 2, 'multi-brand である前提')

    const inter = intersectHandlingTags(brands, bc)
    // 実測: ヒルドイドソフト軟膏は ointment/ointment_application、
    //       ヘパリン類似物質油性クリームは oily_cream/cream_application を持つ
    for (const tag of ['ointment', 'ointment_application', 'oily_cream', 'cream_application']) {
      assert.ok(!inter.includes(tag), `group 内で不均質な "${tag}" が交差集合に残っている`)
    }
    // 全 brand が共通して持つタグは残る
    assert.ok(inter.includes('external_use'), '全 brand 共通のタグは残らなければならない')
  })

  test('交差集合の全要素は brandKeys 全件が保持している', () => {
    for (const m of ALL_MODULES) {
      const bc = catalogOf(m.moduleId)
      const brands = Object.keys(bc)
      if (brands.length < 2) continue
      for (const tag of intersectHandlingTags(brands, bc)) {
        for (const b of brands) {
          assert.ok(
            (bc[b]?.handlingTags ?? []).includes(tag),
            `${m.moduleId}: "${tag}" を ${b} が持っていない`,
          )
        }
      }
    }
  })

  test('1 件でも handlingTags 未定義の brand があれば [] になる', () => {
    const bc: BrandCatalog = {
      A: { displayName: 'A', genericName: 'g', displayGenericName: 'g', aliases: [], normalizedAliases: [], handlingTags: ['x', 'y'] },
      B: { displayName: 'B', genericName: 'g', displayGenericName: 'g', aliases: [], normalizedAliases: [] },
    }
    assert.deepEqual(intersectHandlingTags(['A', 'B'], bc), [])
  })
})

describe('T-U5-7 denotation=brand の導出は brandCatalog[brandKey].handlingTags と一致する', () => {
  test('実データ全 brand 候補で一致する（代表 brand fallback と差が出ない）', () => {
    const queries = ['りべるさす', 'ふぉしーが', 'じゃぬびあ', 'ひゅーまろぐ', 'つい', 'めたくと']
    let checked = 0
    for (const q of queries) {
      for (const r of getDrugSuggestions(q, index, 8)) {
        if (r.resolution.denotation !== 'brand') continue
        checked++
        const bc = catalogOf(r.moduleId)
        assert.deepEqual(
          resolveBrandHandlingTags(r.resolution, bc, r.matchedBrandName),
          bc[r.resolution.brandKey]?.handlingTags,
        )
      }
    }
    assert.ok(checked > 0, 'brand 候補が 1 件も検証されていない')
  })
})

describe('T-U5-8 代表 brand 選択が実装に存在しない', () => {
  const brandTagsSrc = readFileSync(new URL('../lib/brandTags.ts', import.meta.url), 'utf-8')
  const dashboardSrc = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

  const codeLines = (text: string): string[] =>
    text.split('\n').filter(l => {
      const t = l.trim()
      return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    })

  test('lib/brandTags.ts に brandKeys への添字アクセスが存在しない', () => {
    const hits = codeLines(brandTagsSrc).filter(l => /brandKeys\s*\[/.test(l))
    assert.deepEqual(hits, [], `brandKeys への添字アクセス: ${hits.join(' / ')}`)
  })

  test('DashboardClient に brandKeys への参照が存在しない', () => {
    const hits = codeLines(dashboardSrc).filter(l => /brandKeys/.test(l))
    assert.deepEqual(hits, [], `brandKeys を参照している: ${hits.join(' / ')}`)
  })

  test('resolveBrandHandlingTags が generic で単一 brand の値を返さない', () => {
    // 不均質 group では、どの単一 brand の handlingTags とも一致しないことを確認する。
    const bc = catalogOf('derm_heparinoid_moisturizer_ointment')
    const brands = Object.keys(bc)
    const resolution: BrandResolution = {
      denotation: 'generic',
      genericKey: 'ヘパリン類似物質油性クリーム',
      brandKeys: brands,
      subject: 'ヘパリン類似物質油性クリーム',
    }
    const derived = resolveBrandHandlingTags(resolution, bc, brands[0])
    for (const b of brands) {
      assert.notDeepEqual(
        [...(derived ?? [])].sort(),
        [...(bc[b]?.handlingTags ?? [])].sort(),
        `generic の導出結果が単一 brand "${b}" の handlingTags と一致している`,
      )
    }
  })
})

// ─────────────────────────────────────────────────────────────
// activeResolution の lifecycle
//
// U-4a では activeResolution は write-only であり、stale でも無害だった。
// U-5 で production の判断入力になったため、**primary context を切り替える全遷移が
// activeResolution を必ず更新する**ことが安全性の前提条件になった。
// 更新が漏れると、前の context の denotation で gate が誤発火する。
//
// production をテストのために refactor しないため、transition ごとの
// ソース領域スライスによる静的検証で固定する。
// ─────────────────────────────────────────────────────────────

const dashboardSrc = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

/** コメント行を除いたコードのみを返す（設計意図の記述を実装の使用と誤検出しないため）。 */
function codeOnly(text: string): string {
  return text
    .split('\n')
    .filter(l => {
      const t = l.trim()
      return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
    })
    .join('\n')
}

/** 指定した 2 つのマーカーの間のソースを切り出す。 */
function sliceBetween(src: string, startMarker: string, endMarker: string, from = 0): string {
  const start = src.indexOf(startMarker, from)
  assert.ok(start >= 0, `マーカーが見つからない: ${startMarker}`)
  const end = src.indexOf(endMarker, start + startMarker.length)
  assert.ok(end > start, `終端マーカーが見つからない: ${endMarker}`)
  return src.slice(start, end)
}

/** 検索経路（handleSelectDrugSuggestion）の本文 */
const searchTransition = sliceBetween(dashboardSrc, 'const handleSelectDrugSuggestion', 'const handleComposeDrugSelect')
/** Express の primary 分岐（isPrimaryEmpty === true）の本文 */
const expressPrimaryBranch = sliceBetween(dashboardSrc, 'if (isPrimaryEmpty) {', '} else {')
/** Express の compose 分岐（node 追加）の本文 */
const expressComposeBranch = sliceBetween(dashboardSrc, '} else {', 'const handleSwitchToNlp', dashboardSrc.indexOf('if (isPrimaryEmpty) {'))

describe('T-U5-9 primary context を切り替える全遷移が activeResolution を更新する', () => {
  /**
   * 「呼び出し回数の完全一致」ではなく **transition 単位**で検証する。
   * state ごとに用途が異なるため単純な件数比較は将来の false positive になりうるが、
   * 「primary context を切り替える遷移」は必ずこの 4 つを揃える必要がある、という
   * 不変条件はコンテキストに依存せず成立する。
   */
  const PRIMARY_CONTEXT_SETTERS = [
    'setActiveModuleData(',
    'setActiveBrandName(',
    'setActiveDrugDisplayName(',
    'setActiveResolution(',
  ]

  test('検索経路（handleSelectDrugSuggestion）が 4 つの primary context state をすべて更新する', () => {
    const missing = PRIMARY_CONTEXT_SETTERS.filter(s => !searchTransition.includes(s))
    assert.deepEqual(missing, [], `検索経路で更新されていない state: ${missing.join(' / ')}`)
  })

  test('Express primary 分岐が 4 つの primary context state をすべて更新する', () => {
    const missing = PRIMARY_CONTEXT_SETTERS.filter(s => !expressPrimaryBranch.includes(s))
    assert.deepEqual(
      missing,
      [],
      `Express primary 分岐で更新されていない state: ${missing.join(' / ')}（stale resolution により U-5 gate が誤発火する）`,
    )
  })

  test('Express compose 分岐は primary context state を更新しない（primary の resolution を壊さない）', () => {
    const touched = PRIMARY_CONTEXT_SETTERS.filter(s => expressComposeBranch.includes(s))
    assert.deepEqual(touched, [], `Express compose 分岐が primary context を書き換えている: ${touched.join(' / ')}`)
  })

  test('activeResolution を更新するのは primary context 遷移の 2 経路のみ', () => {
    // state 宣言行を除いた呼び出し箇所を数える。
    const calls = dashboardSrc
      .split('\n')
      .filter(l => l.includes('setActiveResolution(') && !l.includes('useState'))
    assert.equal(calls.length, 2, `setActiveResolution の呼び出しが 2 経路ではない: ${calls.length} 件`)
  })
})

describe('T-U5-10 Express primary 分岐は直前の検索由来 resolution を破棄する', () => {
  test('Express primary 分岐に setActiveResolution(undefined) が存在する', () => {
    assert.ok(
      /setActiveResolution\(\s*undefined\s*\)/.test(expressPrimaryBranch),
      'Express primary 分岐が前の context の resolution を破棄していない',
    )
  })

  test('Express は resolution を新規構築しない（legacy path のまま）', () => {
    // denotation を組み立てる処理・defaultBrandName からの resolution 生成が無いこと。
    // コメント（設計意図の記述）は除外して実装のみを判定する。
    assert.ok(!codeOnly(expressPrimaryBranch).includes('denotation'), 'Express が resolution を構築している')
    assert.ok(!codeOnly(expressComposeBranch).includes('denotation'), 'Express compose 分岐が resolution を構築している')
    assert.ok(!codeOnly(expressComposeBranch).includes('resolution:'), 'Express node が resolution を持っている')
  })

  test('検索経路は item.resolution を保持する（破棄しない）', () => {
    assert.ok(
      searchTransition.includes('setActiveResolution(item.resolution)'),
      '検索経路が item.resolution を保持していない',
    )
    assert.ok(
      !/setActiveResolution\(\s*undefined\s*\)/.test(searchTransition),
      '検索経路が resolution を破棄している',
    )
  })

  test('破棄後の状態は gate を発火させない（undefined = legacy path）', () => {
    // Express 遷移後の activeResolution は undefined になる。
    assert.equal(isSubjectUnresolved(undefined), false)
  })
})

describe('T-U5-11 resolution と brandCatalog の module 一致は呼び出し側の責務である', () => {
  /**
   * 本テストは**欠陥挙動を正仕様として固定するものではない**。
   * 「別 module の brand resolution を現在 module の brandCatalog へ渡しても
   * authoritative なタグは得られない」という純関数の性質を記録し、
   * 呼び出し側（DashboardClient）が context 遷移ごとに resolution を更新する
   * 責務を負うことの根拠を残すためのものである。
   *
   * 実際に stale resolution が渡らないことは T-U5-9 / T-U5-10 が保証する。
   */
  test('別 module の brand resolution からは現在 module の authoritative なタグが得られない', () => {
    const currentModule = 'dm_dpp4_oral'
    const bc = catalogOf(currentModule)
    const currentBrand = 'ジャヌビア'
    const authoritative = bc[currentBrand]?.handlingTags
    assert.ok(authoritative && authoritative.length > 0, '前提: 現在 module の brand がタグを持つ')

    // 別 module（dm_sglt2_oral）由来の brand resolution
    const foreign: BrandResolution = { denotation: 'brand', brandKey: 'フォシーガ', subject: 'フォシーガ' }
    assert.ok(!(foreign.brandKey in bc), '前提: 別 module の brand は現在 module の brandCatalog に存在しない')

    const derived = resolveBrandHandlingTags(foreign, bc, currentBrand)
    assert.notDeepEqual(
      derived,
      authoritative,
      'module 不一致の resolution から authoritative なタグが得られてはならない',
    )
  })

  test('別 module の brandKey はデータアクセスキーとして現在 module では解決できない', () => {
    const bc = catalogOf('dm_dpp4_oral')
    const foreign: BrandResolution = { denotation: 'brand', brandKey: 'フォシーガ', subject: 'フォシーガ' }
    const key = resolveDataAccessBrandKey(foreign, 'ジャヌビア')
    assert.equal(key, 'フォシーガ', '関数は resolution の brandKey をそのまま返す（module 照合は行わない）')
    assert.equal(bc[key!], undefined, '現在 module の brandCatalog では解決できない')
  })
})
