/**
 * brandResolutionSubjectMigration.test.ts — U-4b: SOAP subject を BrandResolution から解決する
 *
 * 検証対象:
 *   T-U4b-1  brand candidate は subject 変化 0
 *   T-U4b-2  generic candidate は expected 6 パターンだけ subject が変化する
 *   T-U4b-3  module candidate は U-5 gate により subject consumer へ到達しない
 *   T-U4b-4  primary は BrandResolution から subject を write する
 *   T-U4b-5  compose は ComposeNode 生成時に BrandResolution から subject を write する
 *   T-U4b-6  Rapid / 通常 SOAP / S先頭文 / ADDON 再生成が同じ write-site subject を読む
 *   T-U4b-7  検索由来 production path に drugDisplayLabel !== matchedBrandName 推論が残っていない
 *   T-U4b-8  検索由来の subject 解決に resolveDrugName() が使われていない（残る呼出しは legacy 分岐のみ）
 *   T-U4b-9  resolution.subject から legacy fallback するコードが存在しない
 *   T-U4b-10 Express path が完全に不変
 *   T-U4b-11 search golden projection が無変更（lib/search.ts 無変更）
 *   T-U4b-12 expected semantic delta fixture と完全一致
 *
 * 正本:
 *   - 型契約     : lib/brandResolution.ts
 *   - subject    : lib/drugSubject.ts resolveSubjectFromResolution()
 *   - 論点・工程 : docs/OPEN_DESIGN_QUESTIONS.md Q-S2
 *   - fixture 生成: scripts/generate-subject-migration-fixture.ts
 *
 * 注意:
 *   本 Repository には React を実行するテスト基盤が存在しないため、write-site の検証
 *   （T-U4b-4〜10）は production ソースに対する静的検証で行う（tests/moduleRegistry.test.ts
 *   と同じ方式）。subject 値そのものの検証（T-U4b-1/2/3/12）は純関数と実データで行う。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, type SearchEntry, type DrugSuggestionItem } from '../lib/search'
import { resolveDrugName, resolveSubjectFromResolution } from '../lib/drugSubject'
import { isSubjectUnresolved } from '../lib/brandTags'
import type { ModuleData } from '../lib/types'

const index: SearchEntry[] = ALL_MODULES.flatMap(m => buildSearchIndex(m))
const modOf = (id: string) => ALL_MODULES.find(m => m.moduleId === id) as unknown as ModuleData

const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

interface Fixture {
  summary: {
    rows: number
    byDenotation: Record<string, number>
    reachableChangedRows: number
    reachableChangedPatterns: number
    reachableChangedModules: string[]
    gatedChangedRows: number
    gatedChangedModules: string[]
  }
  expectedReachableDelta: Array<{
    moduleId: string; denotation: string; legacySubject: string; resolutionSubject: string | null; exampleQuery: string
  }>
  rows: Array<{
    query: string; moduleId: string; denotation: 'brand' | 'generic' | 'module'
    legacySubject: string; resolutionSubject: string | null; changed: boolean
  }>
}

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/subjectMigration.expected.json', import.meta.url), 'utf-8'),
) as Fixture

/** コメント行を除いたコード行（設計意図の記述を実装の使用と誤検出しないため） */
function codeLines(text: string): string[] {
  return text.split('\n').filter(l => {
    const t = l.trim()
    return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
  }).map(s => s.trim().replace(/\s+/g, ' '))
}

function sliceBetween(startMarker: string, endMarker: string, from = 0): string {
  const start = src.indexOf(startMarker, from)
  assert.ok(start >= 0, `マーカーが見つからない: ${startMarker}`)
  const end = src.indexOf(endMarker, start + startMarker.length)
  assert.ok(end > start, `終端マーカーが見つからない: ${endMarker}`)
  return src.slice(start, end)
}

/** U-4b 適用前の legacy subject（生成スクリプトと同じ再現） */
function legacySubjectOf(item: DrugSuggestionItem): string {
  const drug = modOf(item.moduleId).drug
  if (item.displayName !== undefined && item.displayName !== item.matchedBrandName) return item.displayName
  if (item.drugDisplayLabel !== undefined && item.drugDisplayLabel !== item.matchedBrandName) return item.drugDisplayLabel
  return resolveDrugName(drug, item.matchedBrandName)
}

/**
 * U-CR2: historical fixture 検証専用スコープ。
 *
 * `tests/fixtures/subjectMigration.expected.json` は U-4b / Q-S2 migration 時点
 * （fixture の `generatedAgainst` 参照）の historical regression artifact であり、
 * ongoing corpus snapshot ではない。fixture の各行が記録している query/module の
 * 組は生成時点の corpus に対する evidence であって、その後 registry に追加された
 * module の参加を意図していない。
 *
 * `index`（ALL_MODULES 全体）をそのまま historical fixture 照合に使うと、
 * 新規 module が同じクエリの検索結果へ割り込み、件数増加や 8-result cap 内での
 * 玉突き（既存 module の押し出し）を引き起こす。これは fixture が検出すべき
 * semantic regression ではなく、fixture の検証スコープが誤って corpus 全体へ
 * 広がっていることによる false RED である（U-CR2 Design Review 実測）。
 *
 * historicalModuleIds は fixture.rows から導出する（moduleId のハードコード禁止）。
 * これにより fixture が参照した module 集合だけを再構築し、その集合だけで
 * 検索 index を組み直して照合する。新規 module は historicalIndex に一切
 * 混入しないため、corpus 成長に対して構造的に免疫を持つ。
 *
 * 一方、T-U4b-1.2 / T-U4b-3.2 は「現在の runtime が持つべき性質」を検証する
 * live 契約であり、意図的に `index`（全体）を使い続ける。歴史的 fixture の
 * 照合とは責務が異なるため、置き換えない。
 */
const historicalModuleIds = new Set<string>(fixture.rows.map(r => r.moduleId))
const historicalModules = ALL_MODULES.filter(m => historicalModuleIds.has(m.moduleId))
const historicalIndex: SearchEntry[] = historicalModules.flatMap(m => buildSearchIndex(m))
const historicalModOf = (id: string) => historicalModules.find(m => m.moduleId === id) as unknown as ModuleData

/** 上記 historicalModOf を使う legacySubjectOf（下の legacySubjectOf と同一ロジック） */
function legacySubjectOfHistorical(item: DrugSuggestionItem): string {
  const drug = historicalModOf(item.moduleId).drug
  if (item.displayName !== undefined && item.displayName !== item.matchedBrandName) return item.displayName
  if (item.drugDisplayLabel !== undefined && item.drugDisplayLabel !== item.matchedBrandName) return item.drugDisplayLabel
  return resolveDrugName(drug, item.matchedBrandName)
}

// ─────────────────────────────────────────────────────────────

describe('T-U4b-1 brand candidate は subject 変化 0', () => {
  test('fixture 上の brand 行に変化がない', () => {
    const changed = fixture.rows.filter(r => r.denotation === 'brand' && r.changed)
    assert.deepEqual(changed, [], `brand で subject が変化している: ${changed.length} 件`)
  })

  test('実データ再計算でも brand は legacy == resolution.subject', () => {
    let checked = 0
    for (const q of ['りべるさす', 'じゃぬびあ', 'ふぉしーが', 'ひゅーまろぐ', 'めたくと', 'つい']) {
      for (const r of getDrugSuggestions(q, index, 8)) {
        if (r.resolution.denotation !== 'brand') continue
        checked++
        assert.equal(resolveSubjectFromResolution(r.resolution), legacySubjectOf(r), `${r.moduleId} (q=${q})`)
      }
    }
    assert.ok(checked > 0, 'brand 候補が 1 件も検証されていない')
  })
})

describe('T-U4b-2 generic は expected パターンだけ subject が変化する', () => {
  test('production 到達可能な変化は generic のみ', () => {
    const nonGeneric = fixture.expectedReachableDelta.filter(d => d.denotation !== 'generic')
    assert.deepEqual(nonGeneric, [], `generic 以外へ delta が広がっている: ${JSON.stringify(nonGeneric)}`)
  })

  test('expected delta が 6 パターン / 6 module である', () => {
    assert.equal(fixture.summary.reachableChangedPatterns, 6)
    assert.equal(fixture.summary.reachableChangedModules.length, 6)
  })

  test('対象 module が実測どおりである', () => {
    assert.deepEqual(fixture.summary.reachableChangedModules, [
      'derm_heparinoid_moisturizer_cream',
      'derm_heparinoid_moisturizer_lotion',
      'derm_heparinoid_moisturizer_ointment',
      'dm_insulin_intermediate',
      'dm_insulin_mixed_regular_intermediate',
      'dm_insulin_regular',
    ])
  })

  test('各 delta の新 subject が実データの resolution.subject と一致する', () => {
    // U-CR2: historical fixture の delta lookup。`index`（全体）で検索すると、
    // 新規 module が同じクエリの 8-result cap 内で historical module を押し出し得る
    // （実測: derm 系 module を +6 した overlay で発生）。historicalIndex に限定して
    // corpus 成長の影響を構造的に排除する。
    for (const d of fixture.expectedReachableDelta) {
      const hit = getDrugSuggestions(d.exampleQuery, historicalIndex, 8).find(r => r.moduleId === d.moduleId)
      assert.ok(hit, `${d.moduleId} の候補が見つからない (q=${d.exampleQuery})`)
      assert.equal(resolveSubjectFromResolution(hit!.resolution), d.resolutionSubject)
      assert.equal(legacySubjectOfHistorical(hit!), d.legacySubject)
    }
  })
})

describe('T-U4b-3 module candidate は subject consumer へ到達しない', () => {
  test('module 行の resolution.subject はすべて null', () => {
    const nonNull = fixture.rows.filter(r => r.denotation === 'module' && r.resolutionSubject !== null)
    assert.deepEqual(nonNull, [], `module で subject が生成されている: ${nonNull.length} 件`)
  })

  test('module 行はすべて U-5 gate の対象である', () => {
    for (const q of ['SGLT2阻害薬', '花粉症', 'ろいことりえん', 'DPP-4阻害薬']) {
      for (const r of getDrugSuggestions(q, index, 8)) {
        if (r.resolution.denotation !== 'module') continue
        assert.equal(isSubjectUnresolved(r.resolution), true, `${r.moduleId} が gate されていない`)
      }
    }
  })

  test('gate が SOAP 生成入口（availableGroups / groupScenarios）を遮断している', () => {
    const code = codeLines(src)
    assert.ok(
      code.some(l => l.includes('availableGroups={drugSelected && !subjectUnresolved ? availableGroups : new Set()}')),
      'availableGroups の gate が失われている',
    )
    assert.ok(code.some(l => l === 'if (subjectUnresolved) return []'), 'groupScenarios の gate が失われている')
  })
})

describe('T-U4b-4 primary は BrandResolution から subject を write する', () => {
  const region = sliceBetween('const handleSelectDrugSuggestion', 'const handleComposeDrugSelect')

  test('resolveSubjectFromResolution(item.resolution) を使用している', () => {
    assert.ok(
      region.includes('const subject = resolveSubjectFromResolution(item.resolution)'),
      'primary が BrandResolution から subject を解決していない',
    )
    // Unit 4C-2: setActiveDrugDisplayName(subject ?? undefined) は
    // setPrimaryNode(...) の resolvedDrugName: subject ?? undefined, field へ移った
    // （保持の契約自体は不変）。
    assert.ok(region.includes('resolvedDrugName: subject ?? undefined,'), 'subject の保持形が想定と異なる')
  })

  test('primary write に resolveDrugName / 文字列推論が存在しない', () => {
    const code = codeLines(region)
    assert.deepEqual(code.filter(l => l.includes('resolveDrugName(')), [], 'primary write が legacy resolver を使っている')
    assert.deepEqual(code.filter(l => l.includes('!== item.matchedBrandName')), [], 'primary write に文字列推論が残っている')
  })
})

describe('T-U4b-5 compose は BrandResolution から subject を write する', () => {
  const region = sliceBetween('const handleComposeDrugSelect', 'const handleSelectNode')

  test('resolveSubjectFromResolution(item.resolution) を使用している', () => {
    assert.ok(
      region.includes("const nodeDrugName = resolveSubjectFromResolution(item.resolution) ?? ''"),
      'compose が BrandResolution から subject を解決していない',
    )
  })

  test('ComposeNode.resolution も引き続き保持される', () => {
    assert.ok(region.includes('resolution: item.resolution'), 'node が resolution を保持していない')
    assert.ok(region.includes('resolvedDrugName: nodeDrugName'), 'node が resolvedDrugName を保持していない')
  })

  test('compose write に resolveDrugName / 文字列推論が存在しない', () => {
    const code = codeLines(region)
    assert.deepEqual(code.filter(l => l.includes('resolveDrugName(')), [], 'compose write が legacy resolver を使っている')
    assert.deepEqual(code.filter(l => l.includes('!== item.matchedBrandName')), [], 'compose write に文字列推論が残っている')
  })
})

describe('T-U4b-6 Rapid / 通常 SOAP / S先頭文 / ADDON 再生成が同一 subject source を読む', () => {
  /**
   * write-site 移行（D1）により、subject の唯一の source は
   *   primary : activeDrugDisplayName（= activeDrugDisplayNameRef）
   *   node    : ComposeNode.resolvedDrugName
   * である。各 consumer がこの source を読んでいることを固定する。
   */
  test('primary SOAP 再構築が activeDrugDisplayNameRef を読む', () => {
    assert.ok(src.includes('const primaryDrugName = activeDrugDisplayNameRef.current'), 'primary consumer の source が変わっている')
  })

  test('Rapid ADDON 再生成が同じ activeDrugDisplayNameRef を読む', () => {
    // Unit 2B: primary ADDON 分岐が deriveRawFields へ一本化されたのに伴い、
    // 変数名が rapidDrugName → drugName へ変わった（scenario 本文側の変数名と統一）。
    // source（activeDrugDisplayNameRef.current ?? resolveDrugName(...)）自体は不変。
    const addonToggleRegion = src.slice(
      src.indexOf('const handleAddonToggle = useCallback'),
      src.indexOf('const handleSToggle = useCallback'),
    )
    assert.ok(
      addonToggleRegion.includes('const drugName = activeDrugDisplayNameRef.current'),
      'Rapid consumer の source が変わっている',
    )
  })

  test('S先頭文が同じ activeDrugDisplayName を読む', () => {
    assert.ok(src.includes('const drugName = activeDrugDisplayName'), 'S先頭文 consumer の source が変わっている')
  })

  test('node ADDON 再生成が ComposeNode.resolvedDrugName を読む', () => {
    assert.ok(src.includes("node.resolvedDrugName ?? ''"), 'node ADDON consumer の source が変わっている')
  })

  test('subject を書き込む箇所は primary / compose の 2 経路のみ', () => {
    const writes = codeLines(src).filter(l => /resolveSubjectFromResolution\(/.test(l) && !l.startsWith('import '))
    assert.equal(writes.length, 2, `subject の write site が 2 経路ではない: ${writes.length} 件`)
  })
})

describe('T-U4b-7 検索由来 path に文字列推論が残っていない', () => {
  test('drugDisplayLabel !== matchedBrandName による subject 推論が 0 件', () => {
    const hits = codeLines(src).filter(l => /drugDisplayLabel\s*!==|!==\s*item\.matchedBrandName/.test(l))
    assert.deepEqual(hits, [], `文字列推論が残っている: ${hits.join(' / ')}`)
  })

  test('displayNameForSubject / nodeDrugName の推論ブロックが消えている', () => {
    assert.ok(!src.includes('displayNameForSubject'), 'displayNameForSubject が残っている')
  })
})

describe('T-U4b-8 検索由来の subject 解決に resolveDrugName() を使っていない（Owner Decision S-1-A）', () => {
  test('残る resolveDrugName 呼出しはすべて ?? の右辺（legacy / Express 分岐）である', () => {
    const calls = codeLines(src).filter(l => l.includes('resolveDrugName('))
    // 4件目（primary ADDON 分岐）は {{drug_subject}} resolution contract fix で追加された。
    // 呼び出し元固有の fallback（?? activeBrandName ?? ''）を、scenario本文/Rapid側と同じ
    // resolveDrugName() 経由へ揃えたもの。?? の右辺であり、検索由来 write site
    // （handleSelectDrugSuggestion / handleComposeDrugSelect）には無い（次の test で検証）。
    assert.equal(calls.length, 4, `resolveDrugName の呼出し数が想定（4件）と異なる: ${calls.length}`)
    const primarySource = calls.filter(l => !l.includes('?? resolveDrugName('))
    assert.deepEqual(primarySource, [], `resolveDrugName が主 source として使われている: ${primarySource.join(' / ')}`)
  })

  test('検索由来の 2 つの write site には resolveDrugName が無い', () => {
    for (const [label, region] of [
      ['primary', sliceBetween('const handleSelectDrugSuggestion', 'const handleComposeDrugSelect')],
      ['compose', sliceBetween('const handleComposeDrugSelect', 'const handleSelectNode')],
    ] as const) {
      assert.ok(!codeLines(region).some(l => l.includes('resolveDrugName(')), `${label} write に resolveDrugName が残っている`)
    }
  })
})

describe('T-U4b-9 resolution.subject から legacy fallback するコードが存在しない', () => {
  test('subject を legacy 値で埋める形が無い', () => {
    const forbidden = [
      /subject\s*\?\?\s*resolveDrugName/,
      /subject\s*\?\?\s*activeBrandName/,
      /subject\s*\?\?\s*item\.drugDisplayLabel/,
      /subject\s*\?\?\s*item\.uiLabel/,
      /subject\s*\?\?\s*.*brandNames/,
      /resolveSubjectFromResolution\([^)]*\)\s*\?\?\s*resolveDrugName/,
      /resolveSubjectFromResolution\([^)]*\)\s*\?\?\s*activeBrandName/,
    ]
    const code = codeLines(src)
    for (const re of forbidden) {
      const hits = code.filter(l => re.test(l))
      assert.deepEqual(hits, [], `subject への fallback が存在する（${re}）: ${hits.join(' / ')}`)
    }
  })

  test('許可される形は「未確定の記録」のみ（undefined / 空文字）', () => {
    // ?? undefined は「主語の上書きなし」、?? '' は「主語なし」の記録であり、
    // 別の値で主語を捏造していない（Owner Decision S-2-A）。
    // Unit 4C-2: setActiveDrugDisplayName(subject ?? undefined) は
    // setPrimaryNode(...) の resolvedDrugName: subject ?? undefined, field へ移った。
    assert.ok(src.includes('resolvedDrugName: subject ?? undefined,'))
    assert.ok(src.includes("resolveSubjectFromResolution(item.resolution) ?? ''"))
  })
})

describe('T-U4b-10 Express path が完全に不変', () => {
  const expressPrimary = sliceBetween('if (isPrimaryEmpty) {', '} else {')
  const expressCompose = sliceBetween('} else {', 'const handleSwitchToNlp', src.indexOf('if (isPrimaryEmpty) {'))

  test('Express primary が resolveSubjectFromResolution を使わない（legacy path のまま）', () => {
    assert.ok(!codeLines(expressPrimary).some(l => l.includes('resolveSubjectFromResolution')))
    assert.ok(!codeLines(expressCompose).some(l => l.includes('resolveSubjectFromResolution')))
  })

  test('Express primary の lifecycle reset（U-5）が維持されている', () => {
    // Unit 4C-2: setActiveResolution(undefined) は setPrimaryNode(...) の
    // resolution: undefined, field へ移った（reset の契約自体は不変）。
    assert.ok(/resolution:\s*undefined/.test(expressPrimary), 'U-5 の lifecycle reset が失われている')
  })

  test('Express の subject 書き込みが従来どおり', () => {
    // Unit 4C-2: setActiveDrugDisplayName(...) は setPrimaryNode(...) の
    // resolvedDrugName: ... field へ移った（書き込みの契約自体は不変）。
    assert.ok(expressPrimary.includes('resolvedDrugName:'), 'Express の subject 書き込みが失われている')
    assert.ok(expressPrimary.includes('resolvedDisplayName !== resolvedBrandKey ? resolvedDisplayName : undefined'),
      'Express の subject 書き込み条件が変わっている')
  })

  test('Express node は resolution を持たない', () => {
    assert.ok(!codeLines(expressCompose).some(l => l.includes('resolution:')), 'Express node が resolution を持っている')
  })
})

describe('T-U4b-12 expected semantic delta fixture と完全一致する', () => {
  test('fixture が参照する historical module がすべて registry に現存する（U-CR2 SCOPE）', () => {
    // historical fixture の前提条件そのものの健全性チェック。ここが崩れている場合、
    // 以下の projection 一致テストは意味を持たない（存在しない module を除外して
    // 「一致」と誤判定することを防ぐ）。
    const missing = [...historicalModuleIds].filter(id => !ALL_MODULES.some(m => m.moduleId === id))
    assert.deepEqual(missing, [], `historical fixture が参照する module が registry から消えている: ${missing.join(', ')}`)
  })

  test('全 1572 行の projection が fixture と一致する', () => {
    // U-CR2: `index`（全体）ではなく `historicalIndex`（fixture が参照する module のみ）で
    // 再計算する。fixture は U-4b / Q-S2 migration 時点の historical regression artifact
    // であり、その後追加された module の結果混入は corpus 成長であって semantic regression
    // ではない（U-CR2 Design Review 実測: +1 module で 1540→1587 行、8-cap 内の玉突きで
    // T-U4b-2.4 相当の delta lookup が false RED になることを確認済み）。
    const recomputed: Fixture['rows'] = []
    for (const query of [...new Set(fixture.rows.map(r => r.query))].sort()) {
      for (const r of getDrugSuggestions(query, historicalIndex, 8)) {
        const legacySubject = legacySubjectOfHistorical(r)
        const resolutionSubject = resolveSubjectFromResolution(r.resolution)
        recomputed.push({
          query, moduleId: r.moduleId, denotation: r.resolution.denotation,
          legacySubject, resolutionSubject, changed: legacySubject !== (resolutionSubject ?? ''),
        })
      }
    }
    assert.equal(recomputed.length, fixture.rows.length, '候補行数が fixture と異なる')
    const diffs = recomputed
      .map((r, i) => JSON.stringify(r) !== JSON.stringify(fixture.rows[i]) ? `${r.query}/${r.moduleId}` : null)
      .filter((x): x is string => x !== null)
    assert.deepEqual(diffs, [], `fixture と一致しない行: ${diffs.slice(0, 10).join(', ')}`)
  })

  test('サマリが一致する（brand 0 / generic 6 パターン / module は gate 済み）', () => {
    assert.equal(fixture.summary.rows, 1540)
    assert.deepEqual(fixture.summary.byDenotation, { brand: 893, generic: 589, module: 58 })
    assert.equal(fixture.summary.reachableChangedRows, 25)
    assert.equal(fixture.summary.reachableChangedPatterns, 6)
    assert.equal(fixture.summary.gatedChangedRows, 58)
    assert.equal(fixture.summary.gatedChangedModules.length, 20)
  })
})
