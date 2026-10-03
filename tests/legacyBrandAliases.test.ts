/**
 * legacyBrandAliases.test.ts — drug.search.legacyBrandAliases（旧名称 alias → 現行 brand key の opt-in 解決表）の検証
 *
 * 経緯: 旧販売名「カリーユニ点眼液」（Owner 提供の Fact。cataract bridge [H-F6]）は、現行 brand「ピレノキシン懸濁性点眼液」の旧名称である。
 * 従来は module-level alias で到達するだけで、候補表示が brandNames[0]（カタリン点眼用）へ縮退していた（docs/OPEN_DESIGN_QUESTIONS.md Q-S1）。
 * 本項目は「既存 alias の解決先を示す表」であり、検索到達性・scoring・ranking を変えない。
 * brand identity（resolution.brandKey）と human-facing 表現（候補表示・SOAP 主語 = displayGenericName）を分離する。
 *
 * 検証対象:
 *   L-1  キー ⊆ exactAliases ∪ nameAliases / 値 ∈ brandCatalog（新しい alias source ではない）
 *   L-2  宣言 alias 4 query → 候補 1 件・brand resolution（懸濁性）・表示と主語は ピレノキシン点眼液・カタリンを含まない
 *   L-3  handlingTags は brand identity 由来（suspension を保持）で、振り混ぜ / 先端上向き保管 Addon が表示される
 *   L-4  SOAP 本文に formal 名（ピレノキシン懸濁性点眼液）が出ない
 *   L-5  宣言対象外の cataract 既存 query は出力不変 / 宣言を取り除くと旧挙動に戻る
 *   L-6  未宣言 module・他 query の出力不変 / brandCatalog・aliasToBrand へ旧名称を複製していない
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, normalizeText } from '../lib/search'
import { resolveSubjectFromResolution } from '../lib/drugSubject'
import { resolveBrandHandlingTags } from '../lib/brandTags'
import { getVisibleAddonKeys } from '../lib/addonFilter'
import { buildNodeFields } from '../lib/buildSoap'
import { readFileSync } from 'node:fs'
import type { ModuleData } from '../lib/types'

const CATARACT_ID = 'cataract_pirenoxine_eye_drops'
const cataract = ALL_MODULES.find(m => m.moduleId === CATARACT_ID) as ModuleData
const index = ALL_MODULES.flatMap(m => buildSearchIndex(m))

const LEGACY = ['カリーユニ点眼液', 'カリーユニ', 'かりーゆにてんがん', 'かりーゆに']
const TARGET_BRAND = 'ピレノキシン懸濁性点眼液'
const OTHER_BRAND = 'カタリン点眼用'
const GENERIC_DISPLAY = 'ピレノキシン点眼液'

describe('L-1 legacyBrandAliases は既存 alias の解決表である', () => {
  test('cataract の宣言は想定 4 件で、全て ピレノキシン懸濁性点眼液 へ解決する', () => {
    const s = cataract.drug!.search!
    assert.deepEqual(Object.keys(s.legacyBrandAliases!), LEGACY)
    for (const v of Object.values(s.legacyBrandAliases!)) assert.equal(v, TARGET_BRAND)
  })

  test('全 module: キー ⊆ exactAliases ∪ nameAliases、値 ∈ brandCatalog。宣言する module は cataract のみ', () => {
    const declaring: string[] = []
    for (const m of ALL_MODULES) {
      const s = m.drug?.search
      const map = s?.legacyBrandAliases
      if (!map || Object.keys(map).length === 0) continue
      declaring.push(m.moduleId)
      const pool = new Set([...(s?.exactAliases ?? []), ...(s?.nameAliases ?? [])].map(normalizeText))
      for (const [alias, brand] of Object.entries(map)) {
        assert.ok(pool.has(normalizeText(alias)), `${m.moduleId}: 新規 alias source になっている: ${alias}`)
        assert.ok(brand in (m.drug?.brandCatalog ?? {}), `${m.moduleId}: 解決先が brandCatalog に存在しない: ${brand}`)
      }
    }
    assert.deepEqual(declaring, [CATARACT_ID])
  })
})

describe('L-2 宣言 alias の query は brand identity へ解決され、human-facing 表現は displayGenericName になる', () => {
  for (const q of ['カリーユニ', 'カリーユニ点眼液', 'かりーゆに', 'かりーゆにてんがん']) {
    test(`「${q}」`, () => {
      const r = getDrugSuggestions(q, index, 8)
      assert.equal(r.length, 1, `候補が 1 件ではない: ${JSON.stringify(r.map(x => x.uiLabel ?? x.drugDisplayLabel))}`)
      const c = r[0]
      assert.equal(c.moduleId, CATARACT_ID)
      assert.equal(c.uiLabel, GENERIC_DISPLAY)
      assert.equal(c.drugDisplayLabel, GENERIC_DISPLAY)
      assert.equal(c.matchedBrandName, TARGET_BRAND)
      assert.equal(c.resolution.denotation, 'brand')
      if (c.resolution.denotation === 'brand') {
        assert.equal(c.resolution.brandKey, TARGET_BRAND)
        assert.equal(c.resolution.subject, GENERIC_DISPLAY)
      }
      assert.equal(resolveSubjectFromResolution(c.resolution), GENERIC_DISPLAY)
      assert.ok(!r.some(x => x.matchedBrandName === OTHER_BRAND || x.drugDisplayLabel === OTHER_BRAND || x.uiLabel === OTHER_BRAND), 'カタリン候補が存在する')
    })
  }
})

describe('L-2b Topbar のセカンドライン抑制は presentation 専用フラグで行う', () => {
  test('4 query の候補は suppressMatchedBrandLabel = true で、isGenericLabel は立てない（generic 見出しの意味を持たせない）', () => {
    for (const q of ['カリーユニ', 'カリーユニ点眼液', 'かりーゆに', 'かりーゆにてんがん']) {
      const c = getDrugSuggestions(q, index, 8)[0]
      assert.equal(c.suppressMatchedBrandLabel, true, q)
      assert.equal(c.isGenericLabel, undefined, q)
      assert.equal(c.resolution.denotation, 'brand', q)
      assert.equal(c.matchedBrandName, TARGET_BRAND, q)
    }
  })

  test('フラグは legacyBrandAliases 由来の候補にだけ付き、他の全 alias query の候補ではキー自体が存在しない', () => {
    const legacy = LEGACY.map(normalizeText)
    const qs = new Set<string>()
    for (const x of ALL_MODULES) for (const a of [...(x.drug?.search?.exactAliases ?? []), ...(x.drug?.search?.nameAliases ?? []), ...(x.drug?.brandNames ?? [])]) qs.add(a)
    for (const q of qs) {
      if (legacy.includes(normalizeText(q))) continue
      for (const r of getDrugSuggestions(q, index, 8)) assert.ok(!('suppressMatchedBrandLabel' in r), `query: ${q}`)
    }
  })

  test('Topbar の secondary label 条件はフラグで抑制され、既存の条件（isGenericLabel / matchedBrandName 差分）は維持される', () => {
    const src = readFileSync(new URL('../app/components/Topbar.tsx', import.meta.url), 'utf-8')
    assert.ok(
      src.includes('!item.isGenericLabel && !item.suppressMatchedBrandLabel && item.matchedBrandName && item.matchedBrandName !== item.drugDisplayLabel'),
      'Topbar の secondary label 条件が想定と異なる',
    )
  })
})

describe('L-3 handlingTags と Addon は brand identity 由来である', () => {
  test('suspension を保持し、振り混ぜ / 先端上向き保管 Addon が表示される（カタリン専用 Addon は表示されない）', () => {
    const c = getDrugSuggestions('カリーユニ', index, 8)[0]
    const tags = resolveBrandHandlingTags(c.resolution, cataract.drug!.brandCatalog!, c.matchedBrandName)
    assert.ok(tags?.includes('suspension'))
    assert.deepEqual(tags, cataract.drug!.brandCatalog![TARGET_BRAND].handlingTags)
    const sc = cataract.scenarios.find(s => s.id === 'initial')!
    const visible = getVisibleAddonKeys(cataract.addons, sc, tags)
    assert.ok(visible.includes('addon_eye_drop_suspension_shake'))
    assert.ok(visible.includes('addon_eye_drop_storage_upright_suspension'))
    assert.ok(!visible.includes('addon_eye_drop_storage_cold'))
    assert.ok(!visible.includes('addon_eye_drop_after_reconstitution_expiry_3weeks'))
  })
})

describe('L-4 SOAP 本文に formal 名を出さない', () => {
  test('initial / restart / external_start の S/O/A/P は主語が ピレノキシン点眼液 で、ピレノキシン懸濁性点眼液 を含まない', () => {
    const c = getDrugSuggestions('カリーユニ', index, 8)[0]
    const subject = resolveSubjectFromResolution(c.resolution)!
    for (const id of ['initial', 'restart', 'external_start']) {
      const sc = cataract.scenarios.find(s => s.id === id)!
      const f = buildNodeFields(sc, cataract, [], subject).fields as unknown as Record<string, string>
      assert.ok(f.P.startsWith('ピレノキシン点眼液は、白内障の進行を抑える薬です。\n進行抑制のため、継続して使用することが大切です。'), `${id}: ${f.P}`)
      for (const k of ['S', 'O', 'A', 'P']) assert.ok(!f[k].includes(TARGET_BRAND), `${id}.${k} に formal 名が含まれる`)
    }
  })
})

describe('L-5 宣言対象外の cataract 既存 query は変化しない', () => {
  const stripped = () => {
    const m = structuredClone(cataract) as ModuleData
    delete m.drug!.search!.legacyBrandAliases
    const idx = ALL_MODULES.flatMap(x => buildSearchIndex(x.moduleId === CATARACT_ID ? m : x))
    return (q: string) => JSON.stringify(getDrugSuggestions(q, idx, 8))
  }

  test('ピレノキシン / カタリン / 白内障 / てんがん / ピレノキシン点眼液 / カタリン点眼液 ほかは宣言の有無で不変', () => {
    const legacy = stripped()
    for (const q of ['ピレノキシン', 'カタリン', '白内障', 'てんがん', 'ピレノキシン点眼液', 'カタリン点眼液', 'ぴれのきしん', 'かたりん', 'かりー', 'かりーゆ']) {
      assert.equal(JSON.stringify(getDrugSuggestions(q, index, 8)), legacy(q), `query: ${q}`)
    }
  })

  test('宣言を取り除くと、4 query は従来の縮退表示（カタリン点眼用）に戻る = 差は宣言だけに由来する', () => {
    const legacy = stripped()
    for (const q of ['カリーユニ', 'カリーユニ点眼液', 'かりーゆに', 'かりーゆにてんがん']) {
      const r = JSON.parse(legacy(q)) as Array<{ drugDisplayLabel: string }>
      assert.equal(r.length, 1)
      assert.equal(r[0].drugDisplayLabel, OTHER_BRAND)
    }
  })
})

describe('L-6 他 module・brand 構造への波及がない', () => {
  test('宣言対象外の全 alias query の出力は、宣言の有無で一致する（algorithm 境界の不変）', () => {
    const m = structuredClone(cataract) as ModuleData
    delete m.drug!.search!.legacyBrandAliases
    const idx = ALL_MODULES.flatMap(x => buildSearchIndex(x.moduleId === CATARACT_ID ? m : x))
    const legacy = LEGACY.map(normalizeText)
    const qs = new Set<string>()
    for (const x of ALL_MODULES) for (const a of [...(x.drug?.search?.exactAliases ?? []), ...(x.drug?.search?.nameAliases ?? [])]) qs.add(a)
    const diffs: string[] = []
    for (const q of qs) {
      if (legacy.includes(normalizeText(q))) continue
      if (JSON.stringify(getDrugSuggestions(q, index, 8)) !== JSON.stringify(getDrugSuggestions(q, idx, 8))) diffs.push(q)
    }
    assert.deepEqual(diffs, [], `宣言対象外 query の出力が変化: ${diffs.join(', ')}`)
  })

  test('旧名称は brandCatalog の aliases / normalizedAliases / aliasToBrand に存在しない', () => {
    const d = cataract.drug!
    const hist = LEGACY.map(normalizeText)
    for (const [b, e] of Object.entries(d.brandCatalog!)) {
      for (const a of [...e.aliases, ...e.normalizedAliases]) assert.ok(!hist.includes(normalizeText(a)), `${b}: ${a}`)
    }
    for (const k of Object.keys(d.aliasToBrand!)) assert.ok(!hist.includes(normalizeText(k)), `aliasToBrand: ${k}`)
    assert.deepEqual(Object.keys(d.brandCatalog!), [OTHER_BRAND, TARGET_BRAND])
  })
})
