/**
 * searchCoverage.test.ts
 *
 * Search Manifest の構造化検索データカバレッジと欠落検出。
 * 設計根拠: docs/reviews/f1/F1_STAGE4_PLAN_2026-07-30.md §7.2（T-4）
 *
 * ── 本ファイルの責務 ────────────────────────────────────────────
 *
 * commit 済み data/search-manifest.json が canonical JSON を過不足なく反映し、
 * 構造化検索に必要なデータが欠落していないことを検証する。
 *
 * ── 本ファイルが担わないもの ────────────────────────────────────
 *
 *   - Owner 指定 35 検索ケース → tests/searchManifestParity.test.ts が担当（重複させない）
 *   - SearchEntry の parity      → 同上
 *   - SOAP 本文の非混入          → tests/searchBodyExclusion.test.ts が担当
 *
 * ── 検証方針 ────────────────────────────────────────────────────
 *
 *   - 期待値は必ず canonical JSON から導出する（テスト内に値をハードコードしない）
 *   - 欠落を推測補完しない
 *   - module ごとに全項目必須とはしない
 *   - optional field は「canonical に存在する場合のみ一致」を検証する
 *
 * 実行:
 *   npx tsx --test tests/searchCoverage.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { ALL_MODULES } from '../data/modules/index'
import type { SearchManifest, ManifestModule, ManifestScenario } from '../lib/searchManifest'

const manifest = JSON.parse(
  fs.readFileSync(path.resolve('./data/search-manifest.json'), 'utf8'),
) as SearchManifest

const moduleById = new Map<string, ManifestModule>(manifest.modules.map(m => [m.moduleId, m]))
const canonicalById = new Map(ALL_MODULES.map(m => [m.moduleId, m as unknown as Record<string, any>]))

/** manifest の scenario を moduleId + globalId で引く */
const scenarioByKey = new Map<string, ManifestScenario>(
  manifest.scenarios.map(s => [`${s.moduleId}|${s.globalId}`, s]),
)

/** canonical の全シナリオを (moduleId, scenario) の組で列挙する */
function canonicalScenarios(): Array<{ moduleId: string; scenario: Record<string, any> }> {
  const out: Array<{ moduleId: string; scenario: Record<string, any> }> = []
  for (const m of ALL_MODULES) {
    for (const s of m.scenarios as unknown as Array<Record<string, any>>) {
      out.push({ moduleId: m.moduleId, scenario: s })
    }
  }
  return out
}

describe('T-4 件数・ID 整合', () => {
  test('全 35 モジュールが manifest に存在する', () => {
    const missing = ALL_MODULES.map(m => m.moduleId).filter(id => !moduleById.has(id))
    assert.deepEqual(missing, [], `manifest に存在しないモジュール: ${missing.join(', ')}`)
    assert.equal(manifest.modules.length, ALL_MODULES.length)
    assert.equal(manifest.moduleCount, ALL_MODULES.length)
  })

  test('全 1,060 シナリオが manifest に存在する', () => {
    const cs = canonicalScenarios()
    const missing = cs
      .filter(({ moduleId, scenario }) => !scenarioByKey.has(`${moduleId}|${scenario.globalId}`))
      .map(({ moduleId, scenario }) => `${moduleId}/${scenario.globalId}`)
    assert.deepEqual(missing, [], `manifest に存在しないシナリオ: ${missing.slice(0, 5).join(', ')}`)
    assert.equal(manifest.scenarios.length, cs.length)
    assert.equal(manifest.scenarioCount, cs.length)
  })

  test('moduleId に重複がない', () => {
    const ids = manifest.modules.map(m => m.moduleId)
    assert.equal(new Set(ids).size, ids.length, 'moduleId が重複している')
  })

  test('globalId に重複がない', () => {
    const ids = manifest.scenarios.map(s => s.globalId)
    const dup = ids.filter((v, i) => ids.indexOf(v) !== i)
    assert.deepEqual([...new Set(dup)], [], `globalId が重複している: ${[...new Set(dup)].join(', ')}`)
  })

  test('manifest の参照先 module が canonical に存在する（孤立参照なし）', () => {
    const orphan = manifest.modules.map(m => m.moduleId).filter(id => !canonicalById.has(id))
    assert.deepEqual(orphan, [], `canonical に存在しない module を参照している: ${orphan.join(', ')}`)
  })

  test('manifest の scenario が canonical の module / scenario を参照している', () => {
    const orphan: string[] = []
    for (const s of manifest.scenarios) {
      const cm = canonicalById.get(s.moduleId)
      if (!cm) { orphan.push(`${s.moduleId}（module 不在）`); continue }
      const found = (cm.scenarios as Array<Record<string, any>>).some(x => x.globalId === s.globalId)
      if (!found) orphan.push(`${s.moduleId}/${s.globalId}`)
    }
    assert.deepEqual(orphan, [], `canonical に存在しない参照: ${orphan.slice(0, 5).join(', ')}`)
  })

  test('scenario の id が canonical と一致する', () => {
    const mismatch: string[] = []
    for (const { moduleId, scenario } of canonicalScenarios()) {
      const ms = scenarioByKey.get(`${moduleId}|${scenario.globalId}`)
      if (ms && ms.id !== scenario.id) mismatch.push(`${moduleId}/${scenario.globalId}`)
    }
    assert.deepEqual(mismatch, [], `scenario id が不一致: ${mismatch.slice(0, 5).join(', ')}`)
  })
})

describe('T-4 構造化検索データの存在（全モジュール必須）', () => {
  // 実測により全 35 モジュールが保有することを確認済みの項目のみを必須とする。
  const REQUIRED: Array<[string, (m: ManifestModule) => boolean]> = [
    ['brand（brandNames）', m => (m.brandNames ?? []).length > 0],
    ['brand（brandCatalog キー）', m => Object.keys(m.brandCatalog ?? {}).length > 0],
    ['generic（primaryDisplayName）', m => !!m.search?.primaryDisplayName],
    ['alias（exactAliases）', m => (m.search?.exactAliases ?? []).length > 0],
    ['alias（nameAliases）', m => (m.nameAliases ?? []).length > 0],
    ['dosage form / therapeutic area（categoryPath）', m => (m.categoryPath ?? []).length > 0],
    ['classKey', m => !!m.classKey],
    ['nodeKey', m => !!m.nodeKey],
    ['clinicalDomain', m => !!m.clinicalDomain],
  ]

  for (const [label, predicate] of REQUIRED) {
    test(`${label} が全モジュールに存在する`, () => {
      const missing = manifest.modules.filter(m => !predicate(m)).map(m => m.moduleId)
      assert.deepEqual(missing, [], `${label} が欠落: ${missing.join(', ')}`)
    })
  }

  test('generic（displayGenericName）が全モジュールの少なくとも 1 brand に存在する', () => {
    const missing = manifest.modules
      .filter(m => !Object.values(m.brandCatalog ?? {}).some(b => b.displayGenericName))
      .map(m => m.moduleId)
    assert.deepEqual(missing, [], `displayGenericName が欠落: ${missing.join(', ')}`)
  })

  test('alias（brandCatalog.aliases）が全モジュールの少なくとも 1 brand に存在する', () => {
    const missing = manifest.modules
      .filter(m => !Object.values(m.brandCatalog ?? {}).some(b => (b.aliases ?? []).length > 0))
      .map(m => m.moduleId)
    assert.deepEqual(missing, [], `brandCatalog.aliases が欠落: ${missing.join(', ')}`)
  })
})

describe('T-4 canonical との値一致（必須項目）', () => {
  test('brandNames が canonical と一致する（値・順序）', () => {
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const c = canonicalById.get(mm.moduleId)!
      if (JSON.stringify(mm.brandNames) !== JSON.stringify(c.drug?.brandNames ?? [])) {
        mismatch.push(mm.moduleId)
      }
    }
    assert.deepEqual(mismatch, [], `brandNames 不一致: ${mismatch.join(', ')}`)
  })

  test('categoryPath / classKey / nodeKey / clinicalDomain が canonical と一致する', () => {
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const c = canonicalById.get(mm.moduleId)!
      const comp = c.composition ?? {}
      if (JSON.stringify(mm.categoryPath) !== JSON.stringify(c.categoryPath ?? [])) mismatch.push(`${mm.moduleId}/categoryPath`)
      if (mm.classKey !== comp.classKey) mismatch.push(`${mm.moduleId}/classKey`)
      if (mm.nodeKey !== comp.nodeKey) mismatch.push(`${mm.moduleId}/nodeKey`)
      if (mm.clinicalDomain !== comp.clinicalDomain) mismatch.push(`${mm.moduleId}/clinicalDomain`)
    }
    assert.deepEqual(mismatch, [], `不一致: ${mismatch.slice(0, 5).join(', ')}`)
  })

  test('search の alias 系フィールドが canonical と一致する（値・順序）', () => {
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const ds = canonicalById.get(mm.moduleId)!.drug?.search ?? {}
      if (JSON.stringify(mm.search.exactAliases) !== JSON.stringify(ds.exactAliases ?? [])) mismatch.push(`${mm.moduleId}/exactAliases`)
      if (JSON.stringify(mm.search.nameAliases) !== JSON.stringify(ds.nameAliases ?? [])) mismatch.push(`${mm.moduleId}/search.nameAliases`)
      if (mm.search.primaryDisplayName !== ds.primaryDisplayName) mismatch.push(`${mm.moduleId}/primaryDisplayName`)
    }
    assert.deepEqual(mismatch, [], `不一致: ${mismatch.slice(0, 5).join(', ')}`)
  })
})

describe('T-4 optional field（canonical に存在する場合のみ一致を検証）', () => {
  test('formulationSearchTokens は canonical に存在する場合のみ一致する', () => {
    let checked = 0
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const canonicalTokens = canonicalById.get(mm.moduleId)!.drug?.search?.formulationSearchTokens
      if (canonicalTokens === undefined) {
        // canonical に無い場合は manifest 側も空であること（推測補完していないこと）
        if ((mm.search.formulationSearchTokens ?? []).length > 0) mismatch.push(`${mm.moduleId}（canonical 不在なのに値がある）`)
        continue
      }
      checked++
      if (JSON.stringify(mm.search.formulationSearchTokens) !== JSON.stringify(canonicalTokens)) {
        mismatch.push(`${mm.moduleId}（値・順序不一致）`)
      }
    }
    assert.deepEqual(mismatch, [], `formulationSearchTokens: ${mismatch.join(', ')}`)
    assert.ok(checked > 0, 'formulationSearchTokens を持つモジュールが 1 件も無い（前提が崩れている）')
  })

  test('dosage variant（reservedHandlingTags）は canonical に構造化値がある場合のみ一致する', () => {
    let checked = 0
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const canonicalTags = canonicalById.get(mm.moduleId)!.template?.reservedHandlingTags
      if (!Array.isArray(canonicalTags)) {
        if (mm.reservedHandlingTags !== undefined) mismatch.push(`${mm.moduleId}（canonical 不在なのに値がある）`)
        continue
      }
      checked++
      if (JSON.stringify(mm.reservedHandlingTags) !== JSON.stringify(canonicalTags)) {
        mismatch.push(`${mm.moduleId}（値・順序不一致）`)
      }
    }
    assert.deepEqual(mismatch, [], `reservedHandlingTags: ${mismatch.join(', ')}`)
    assert.ok(checked > 0, 'reservedHandlingTags を持つモジュールが 1 件も無い（前提が崩れている）')
  })

  test('manufacturer は source data 不在のため manifest に存在しない', () => {
    // D-S4-2: canonical JSON に manufacturer が存在しないため、
    // manifest へ創作・推測追加しない。必須条件にもしない。
    const hasManufacturer = JSON.stringify(manifest).includes('manufacturer')
    assert.equal(hasManufacturer, false, 'manufacturer が manifest へ混入している（創作・推測補完の疑い）')
  })
})

describe('T-4 brandCatalog の保持（D-S4-3 / D-S4-11）', () => {
  test('brandCatalog のキーが canonical と一致する（displayName 有無に依らず保持される）', () => {
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const c = canonicalById.get(mm.moduleId)!
      const canonicalKeys = Object.keys(c.drug?.brandCatalog ?? {})
      if (JSON.stringify(Object.keys(mm.brandCatalog)) !== JSON.stringify(canonicalKeys)) {
        mismatch.push(mm.moduleId)
      }
    }
    assert.deepEqual(mismatch, [], `brandCatalog キー不一致: ${mismatch.join(', ')}`)
  })

  test('displayName が無い brand でも brandCatalog キーが保持される（D-S4-3）', () => {
    // canonical で displayName を持たない brand を抽出し、
    // manifest 側でもキーが残り、かつ displayName が補完されていないことを確認する。
    const targets: Array<{ moduleId: string; brand: string }> = []
    for (const m of ALL_MODULES) {
      const bc = (m as unknown as Record<string, any>).drug?.brandCatalog ?? {}
      for (const [brand, entry] of Object.entries(bc as Record<string, any>)) {
        if (entry.displayName === undefined) targets.push({ moduleId: m.moduleId, brand })
      }
    }
    assert.ok(targets.length > 0, 'displayName 欠落 brand が 1 件も無い（前提が崩れている）')

    const problems: string[] = []
    for (const { moduleId, brand } of targets) {
      const entry = moduleById.get(moduleId)?.brandCatalog?.[brand]
      if (!entry) problems.push(`${moduleId}/${brand}（キーが失われている）`)
      else if (entry.displayName !== undefined) problems.push(`${moduleId}/${brand}（displayName が補完されている）`)
    }
    assert.deepEqual(problems, [], problems.join(', '))
  })

  test('handlingTags が canonical の値・順序と一致する（D-S4-11）', () => {
    let checked = 0
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const bc = canonicalById.get(mm.moduleId)!.drug?.brandCatalog ?? {}
      for (const [brand, entry] of Object.entries(bc as Record<string, any>)) {
        const canonicalTags = entry.handlingTags
        const manifestTags = mm.brandCatalog[brand]?.handlingTags
        if (canonicalTags === undefined) {
          if (manifestTags !== undefined) mismatch.push(`${mm.moduleId}/${brand}（canonical 不在なのに値がある）`)
          continue
        }
        checked++
        // 縮約せず配列全体、かつ原順序が維持されていること
        if (JSON.stringify(manifestTags) !== JSON.stringify(canonicalTags)) {
          mismatch.push(`${mm.moduleId}/${brand}（値・順序不一致）`)
        }
      }
    }
    assert.deepEqual(mismatch, [], `handlingTags: ${mismatch.slice(0, 5).join(', ')}`)
    assert.ok(checked > 0, 'handlingTags を持つ brand が 1 件も無い（前提が崩れている）')
  })

  test('displayGenericName / genericKey が canonical に存在する場合のみ一致する', () => {
    const mismatch: string[] = []
    for (const mm of manifest.modules) {
      const bc = canonicalById.get(mm.moduleId)!.drug?.brandCatalog ?? {}
      for (const [brand, entry] of Object.entries(bc as Record<string, any>)) {
        const me = mm.brandCatalog[brand]
        if (entry.displayGenericName !== undefined && me?.displayGenericName !== entry.displayGenericName) {
          mismatch.push(`${mm.moduleId}/${brand}/displayGenericName`)
        }
        if (entry.genericKey !== undefined && me?.genericKey !== entry.genericKey) {
          mismatch.push(`${mm.moduleId}/${brand}/genericKey`)
        }
        if (entry.genericKey === undefined && me?.genericKey !== undefined) {
          mismatch.push(`${mm.moduleId}/${brand}/genericKey（canonical 不在なのに値がある）`)
        }
      }
    }
    assert.deepEqual(mismatch, [], `不一致: ${mismatch.slice(0, 5).join(', ')}`)
  })
})

describe('T-4 scenario 分類メタデータの一致（D-S4-8）', () => {
  test('scenarioTags / sideEffectPresence / intentTags が canonical と一致する', () => {
    const mismatch: string[] = []
    for (const { moduleId, scenario } of canonicalScenarios()) {
      const ms = scenarioByKey.get(`${moduleId}|${scenario.globalId}`)
      if (!ms) continue
      if (JSON.stringify(ms.scenarioTags) !== JSON.stringify(scenario.scenarioTags ?? [])) {
        mismatch.push(`${moduleId}/${scenario.globalId}/scenarioTags`)
      }
      if (ms.sideEffectPresence !== (scenario.sideEffectPresence ?? '')) {
        mismatch.push(`${moduleId}/${scenario.globalId}/sideEffectPresence`)
      }
      if (JSON.stringify(ms.intentTags) !== JSON.stringify(scenario.intentTags ?? [])) {
        mismatch.push(`${moduleId}/${scenario.globalId}/intentTags`)
      }
    }
    assert.deepEqual(mismatch, [], `不一致: ${mismatch.slice(0, 5).join(', ')}`)
  })

  test('sCompositionIntent は canonical に存在する場合のみ一致する（sComposition 全体は保持しない）', () => {
    let checked = 0
    const mismatch: string[] = []
    for (const { moduleId, scenario } of canonicalScenarios()) {
      const ms = scenarioByKey.get(`${moduleId}|${scenario.globalId}`)
      if (!ms) continue
      const canonicalIntent = scenario.sComposition?.intent
      if (canonicalIntent === undefined) {
        if (ms.sCompositionIntent !== undefined) mismatch.push(`${moduleId}/${scenario.globalId}（canonical 不在なのに値がある）`)
        continue
      }
      checked++
      if (ms.sCompositionIntent !== canonicalIntent) mismatch.push(`${moduleId}/${scenario.globalId}`)
    }
    assert.deepEqual(mismatch, [], `sCompositionIntent: ${mismatch.slice(0, 5).join(', ')}`)
    assert.ok(checked > 0, 'sComposition.intent を持つシナリオが 1 件も無い（前提が崩れている）')
  })

  test('sComposition の intent 以外のサブフィールドが manifest へ持ち込まれていない', () => {
    // D-S4-8: sComposition 全体は保持せず intent のみを平坦化する。
    const keys = new Set<string>()
    for (const s of manifest.scenarios) for (const k of Object.keys(s)) keys.add(k)
    assert.ok(!keys.has('sComposition'), 'manifest に sComposition 全体が含まれている')
    assert.deepEqual(
      [...keys].sort(),
      ['globalId', 'id', 'intentTags', 'moduleId', 'sCompositionIntent', 'scenarioGroup', 'scenarioTags', 'sideEffectPresence', 'title'],
      'ManifestScenario のフィールド構成が想定と異なる',
    )
  })

  test('title / scenarioGroup が canonical と一致する', () => {
    const mismatch: string[] = []
    for (const { moduleId, scenario } of canonicalScenarios()) {
      const ms = scenarioByKey.get(`${moduleId}|${scenario.globalId}`)
      if (!ms) continue
      if (ms.title !== scenario.title) mismatch.push(`${moduleId}/${scenario.globalId}/title`)
      if (ms.scenarioGroup !== scenario.scenarioGroup) mismatch.push(`${moduleId}/${scenario.globalId}/scenarioGroup`)
    }
    assert.deepEqual(mismatch, [], `不一致: ${mismatch.slice(0, 5).join(', ')}`)
  })
})
