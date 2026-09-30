/**
 * ophthalmicVariantCandidate.test.ts — H1 generic-noun O + ophthalmic family-level variant candidate
 *
 * Owner Decision（2026-09-30。H1 generic-noun O + ophthalmic family-level variant candidate Unit）の契約テスト。
 * 正本: `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` §4.2〜§4.6（Level 1 / Level 2 / Level 3）。
 *
 * 固定するもの:
 *   A. H1 generic-noun O: `lifestyle_guidance_*` 8 scenario の canonical O が Bridge 正本 `点眼薬　使用中` と逐語一致する
 *   B. PG: brand 単位の Addon reachability matrix（Owner 確定 exact matrix）
 *   C. chemical mediator: PF Addon が トラメラス点眼液 / クロモグリク酸点眼液 のみに到達する
 *   D. tag semantics: family-level variant tag は Addon gate 専用。property tag と混同しない
 *   E. scenario reachability / Q-RAPID2: family-level variant tag の導入で変化しない
 *
 * production 関数（`getVisibleAddonKeys` / `resolveBrandHandlingTags` / `intersectHandlingTags` /
 * `doseTransitionApplicabilityForTags`）を直接 import する。scenario 表示可否だけは
 * `DashboardClient.tsx` 内の inline 判定（export なし）であるため、同一ロジックを局所 helper として
 * 持ち、source contract でその inline 判定の存在を固定する（mirror drift の検知）。
 *
 * 実行: npx tsx --test tests/ophthalmicVariantCandidate.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { getVisibleAddonKeys } from '../lib/addonFilter'
import { resolveBrandHandlingTags, intersectHandlingTags } from '../lib/brandTags'
import { doseTransitionApplicabilityForTags } from '../lib/rapidV2'

const byId = (id: string): ModuleData => {
  const m = ALL_MODULES.find(x => x.moduleId === id)
  assert.ok(m, `module ${id} が見つからない`)
  return m as ModuleData
}

const H1 = byId('allergy_h1_antihistamine_eye_drops')
const CHEM = byId('allergy_chemical_mediator_release_inhibitor_eye_drops')
const AVAREPT = byId('dry_eye_trpv1_antagonist_eye_drops')
const PG = byId('glaucoma_pg_analog_eye_drops')
const AZULENE = byId('ocular_inflammation_azulene_eye_drops')

const FAMILY_TAGS = [
  'preservative_free_variant_in_family',
  'single_use_variant_in_family',
  'light_protection_variant_in_family',
] as const

const catalogOf = (mod: ModuleData) => mod.drug!.brandCatalog!
const brandNamesOf = (mod: ModuleData) => Object.keys(catalogOf(mod))
const tagsOf = (mod: ModuleData, brand: string): string[] => catalogOf(mod)[brand].handlingTags ?? []
const holders = (mod: ModuleData, tag: string): string[] =>
  brandNamesOf(mod).filter(b => tagsOf(mod, b).includes(tag)).sort()

/** brand denotation の resolution から production 経路で handlingTags を解決する */
const resolvedBrandTags = (mod: ModuleData, brand: string): string[] => {
  const tags = resolveBrandHandlingTags(
    { denotation: 'brand', brandKey: brand, subject: brand },
    catalogOf(mod),
    undefined,
  )
  assert.ok(tags, `${brand} の handlingTags が解決できない`)
  return tags!
}

// ═══════════════════════════════════════════════════════════════
// A. H1 generic-noun O
// ═══════════════════════════════════════════════════════════════

const H1_GENERIC_NOUN_O_IDS = [
  'lifestyle_guidance_tip_contamination',
  'lifestyle_guidance_interval',
  'lifestyle_guidance_after_opening_expiry',
  'lifestyle_guidance_suspension_shake',
  'lifestyle_guidance_storage_upright_suspension',
  'lifestyle_guidance_storage_light_protection',
  'lifestyle_guidance_storage_cold',
  'lifestyle_guidance_storage_cold_before_opening',
] as const
const GENERIC_NOUN_O = '点眼薬　使用中'

/** Bridge の SCENARIOS 区間から scenario id → O 本文（複数行は改行連結）を取り出す */
function bridgeScenarioO(bridgeFile: string): Record<string, string> {
  const text = readFileSync(new URL(`../bridges/${bridgeFile}`, import.meta.url), 'utf-8')
  const lines = text.split('\n')
  const start = lines.findIndex(l => l.trimEnd() === '=======SCENARIOS_START=======')
  const end = lines.findIndex(l => l.trimEnd() === '=======SCENARIOS_END=======')
  assert.ok(start >= 0 && end > start, `${bridgeFile}: SCENARIOS marker が見つからない`)
  const result: Record<string, string[]> = {}
  let current: string | null = null
  let section: string | null = null
  for (const raw of lines.slice(start + 1, end)) {
    const t = raw.trim()
    if (t.startsWith('【')) {
      const m = t.match(/id=([A-Za-z0-9_]+)/)
      current = t.includes('SCENARIO') && m ? m[1] : null
      section = null
      continue
    }
    if (current === null) continue
    if (/^[A-Z][A-Z_]*$/.test(t)) { section = t; continue }
    if (section === 'O' && t) (result[current] ??= []).push(t)
  }
  return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.join('\n')]))
}

describe('A. H1 generic-noun O（既知不整合の解消）', () => {
  const bridgeO = bridgeScenarioO('allergy_h1_antihistamine_eye_drops.md')
  const canonicalO = Object.fromEntries(H1.scenarios.map(s => [s.id, s.O ?? '']))

  test('対象8 scenario: Bridge O が generic noun「点眼薬　使用中」である', () => {
    for (const id of H1_GENERIC_NOUN_O_IDS) assert.equal(bridgeO[id], GENERIC_NOUN_O, id)
  })

  test('対象8 scenario: canonical O が Bridge O と逐語一致し {{drug_subject}} を含まない', () => {
    for (const id of H1_GENERIC_NOUN_O_IDS) {
      assert.equal(canonicalO[id], bridgeO[id], `${id}: canonical O ≠ Bridge O`)
      assert.equal(canonicalO[id], GENERIC_NOUN_O, id)
      assert.ok(!canonicalO[id].includes('{{drug_subject}}'), id)
    }
  })

  test('retrofit は対象8件のみ: 他の全 scenario の canonical O は {{drug_subject}} を保持している', () => {
    const withoutSubject = H1.scenarios.filter(s => !(s.O ?? '').includes('{{drug_subject}}')).map(s => s.id).sort()
    assert.deepEqual(withoutSubject, [...H1_GENERIC_NOUN_O_IDS].sort())
  })

  test('H1 Bridge の STATUS は JSON_COMPLETE（RULES §24 の既存 state machine 形式）', () => {
    const text = readFileSync(new URL('../bridges/allergy_h1_antihistamine_eye_drops.md', import.meta.url), 'utf-8')
    assert.match(text, /^# ⚠️ STATUS: JSON_COMPLETE ⚠️$/m)
  })
})

// ═══════════════════════════════════════════════════════════════
// B. PG: brand 単位の Addon reachability matrix
// ═══════════════════════════════════════════════════════════════

const ADDON_KEYS = {
  light: 'addon_eye_drop_storage_light_protection',
  cold: 'addon_eye_drop_storage_cold',
  warm_after_cold: 'addon_eye_drop_warm_container_after_cold_storage',
  cold_before_opening: 'addon_eye_drop_storage_cold_before_opening',
  pf: 'addon_eye_drop_preservative_free_pf',
  mini: 'addon_eye_drop_single_dose_mini',
} as const
type AddonShort = keyof typeof ADDON_KEYS

/** module 内のいずれかの scenario で候補になる対象 Addon（短縮名・ソート済み） */
function visibleTargetAddons(mod: ModuleData, tags: string[]): AddonShort[] {
  const visible = new Set<string>()
  for (const sc of mod.scenarios) {
    for (const key of getVisibleAddonKeys(mod.addons, sc, tags)) visible.add(key)
  }
  return (Object.keys(ADDON_KEYS) as AddonShort[]).filter(k => visible.has(ADDON_KEYS[k])).sort()
}

describe('B. PG: brand 単位の Addon reachability matrix（Owner 確定 exact matrix）', () => {
  const EXPECTED: Record<string, AddonShort[]> = {
    // 1. キサラタン: 遮光 + 未開封冷所。PF / Mini なし
    'キサラタン点眼液': ['cold_before_opening', 'light'],
    // 2. ラタノプロスト（manufacturer-unspecified generic）: 遮光・PF は family candidate。Mini / 冷所は非表示
    'ラタノプロスト点眼液': ['light', 'pf'],
    // 3. トラバタンズ / トラボプロスト: すべて非表示
    'トラバタンズ点眼液': [],
    'トラボプロスト点眼液': [],
    // 4. ルミガン / ビマトプロスト: すべて非表示
    'ルミガン点眼液': [],
    'ビマトプロスト点眼液': [],
    // 5. タプロス / タフルプロスト: Mini のみ（PF・遮光・冷所は非表示。タプロスミニ storage は未実装）
    'タプロス点眼液': ['mini'],
    'タフルプロスト点眼液': ['mini'],
    // 6. レスキュラ / イソプロピルウノプロストン: 遮光のみ
    'レスキュラ点眼液': ['light'],
    'イソプロピルウノプロストン点眼液': ['light'],
  }

  test('matrix が現行 brandCatalog の全 brand を過不足なく網羅している', () => {
    assert.deepEqual(Object.keys(EXPECTED).sort(), brandNamesOf(PG).sort())
  })

  for (const [brand, expected] of Object.entries(EXPECTED)) {
    test(`${brand}: 対象 Addon の到達 = [${expected.join(', ')}]`, () => {
      assert.deepEqual(visibleTargetAddons(PG, resolvedBrandTags(PG, brand)), expected)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// C. chemical mediator: PF Addon matrix
// ═══════════════════════════════════════════════════════════════

describe('C. chemical mediator: PF Addon は トラメラス点眼液 / クロモグリク酸点眼液 のみ', () => {
  const PF_VISIBLE = ['トラメラス点眼液', 'クロモグリク酸点眼液']

  test('PF Addon の到達 brand が exact に一致する', () => {
    const reachable = brandNamesOf(CHEM)
      .filter(b => visibleTargetAddons(CHEM, resolvedBrandTags(CHEM, b)).includes('pf'))
      .sort()
    assert.deepEqual(reachable, [...PF_VISIBLE].sort())
  })

  test('一般名 entry「トラニラスト点眼液」には PF family tag を付与していない（トラメラスPFを一般名へ横滑りさせない）', () => {
    assert.ok(!tagsOf(CHEM, 'トラニラスト点眼液').includes('preservative_free_variant_in_family'))
    assert.ok(!visibleTargetAddons(CHEM, resolvedBrandTags(CHEM, 'トラニラスト点眼液')).includes('pf'))
  })

  test('一般名候補（denotation=generic）でも、group 内に PF family tag を持たない brand がある間は PF Addon は出ない', () => {
    const groupKeyOf = (b: string) => catalogOf(CHEM)[b].genericKey ?? catalogOf(CHEM)[b].displayGenericName
    const group = brandNamesOf(CHEM).filter(b => groupKeyOf(b) === groupKeyOf('トラメラス点眼液'))
    assert.ok(group.includes('トラニラスト点眼液') && group.includes('トラメラス点眼液'), '前提: 同一 generic group')
    const tags = resolveBrandHandlingTags(
      { denotation: 'generic', genericKey: groupKeyOf('トラメラス点眼液')!, brandKeys: group, subject: 'トラニラスト点眼液' },
      catalogOf(CHEM),
      undefined,
    )!
    assert.deepEqual(tags, intersectHandlingTags(group, catalogOf(CHEM)))
    assert.ok(!visibleTargetAddons(CHEM, tags).includes('pf'))
  })

  test('Mini Addon は全 brand で非到達のまま（reserved: single_use_container。変更していない）', () => {
    for (const b of brandNamesOf(CHEM)) {
      assert.ok(!visibleTargetAddons(CHEM, resolvedBrandTags(CHEM, b)).includes('mini'), b)
    }
  })

  test('遮光 Addon は property tag light_protection を持つ brand のみ（変更していない）', () => {
    for (const b of brandNamesOf(CHEM)) {
      const has = tagsOf(CHEM, b).includes('light_protection')
      assert.equal(visibleTargetAddons(CHEM, resolvedBrandTags(CHEM, b)).includes('light'), has, b)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// D. tag semantics
// ═══════════════════════════════════════════════════════════════

describe('D. property tag と family-level variant tag の分離', () => {
  test('family tag の保持 brand が exact に一致する（PG）', () => {
    assert.deepEqual(holders(PG, 'light_protection_variant_in_family'),
      ['イソプロピルウノプロストン点眼液', 'キサラタン点眼液', 'ラタノプロスト点眼液', 'レスキュラ点眼液'].sort())
    assert.deepEqual(holders(PG, 'preservative_free_variant_in_family'), ['ラタノプロスト点眼液'])
    assert.deepEqual(holders(PG, 'single_use_variant_in_family'), ['タフルプロスト点眼液', 'タプロス点眼液'].sort())
  })

  test('family tag の保持 brand が exact に一致する（chemical mediator）', () => {
    assert.deepEqual(holders(CHEM, 'preservative_free_variant_in_family'), ['クロモグリク酸点眼液', 'トラメラス点眼液'].sort())
    assert.deepEqual(holders(CHEM, 'light_protection_variant_in_family'), [])
    assert.deepEqual(holders(CHEM, 'single_use_variant_in_family'), [])
  })

  test('property tag を family existence のために誤付与していない（PG）', () => {
    assert.deepEqual(holders(PG, 'preservative_free'), [])
    assert.deepEqual(holders(PG, 'single_use_container'), [])
    assert.deepEqual(holders(PG, 'cold_storage'), [])
    // 実 property を確定できる brand のみ（ラタノプロスト generic には付与しない）
    assert.deepEqual(holders(PG, 'light_protection'),
      ['イソプロピルウノプロストン点眼液', 'キサラタン点眼液', 'レスキュラ点眼液'].sort())
    assert.deepEqual(holders(PG, 'cold_storage_before_opening'), ['キサラタン点眼液'])
  })

  test('property tag を family existence のために誤付与していない（chemical mediator）', () => {
    assert.deepEqual(holders(CHEM, 'preservative_free'), [])
    assert.deepEqual(holders(CHEM, 'single_use_container'), [])
  })

  test('family tag を Addon の requiredTags で使う Addon は想定どおり（PG: 3件 / chemical mediator: 1件）', () => {
    const usersOf = (mod: ModuleData) =>
      Object.values(mod.addons!.items)
        .filter(a => (a.requiredTags ?? []).some(t => (FAMILY_TAGS as readonly string[]).includes(t)))
        .map(a => [a.id, [...(a.requiredTags ?? [])]] as const)
        .sort((a, b) => a[0].localeCompare(b[0]))
    assert.deepEqual(usersOf(PG), [
      [ADDON_KEYS.mini, ['single_use_variant_in_family']],
      [ADDON_KEYS.pf, ['preservative_free_variant_in_family']],
      [ADDON_KEYS.light, ['light_protection_variant_in_family']],
    ].sort((a, b) => (a[0] as string).localeCompare(b[0] as string)))
    assert.deepEqual(usersOf(CHEM), [[ADDON_KEYS.pf, ['preservative_free_variant_in_family']]])
  })

  test('family tag は全 module の scenarioRequiredTags に一切使われていない（Addon gate 専用）', () => {
    for (const m of ALL_MODULES) {
      for (const sc of m.scenarios) {
        for (const tag of sc.scenarioRequiredTags ?? []) {
          assert.ok(!tag.endsWith('_variant_in_family'), `${m.moduleId}/${sc.id}: scenarioRequiredTags に family tag ${tag}`)
        }
      }
    }
  })

  test('family tag は template.reservedHandlingTags に置かない（現行 brandCatalog が保持しているため到達可能）', () => {
    for (const m of [PG, CHEM]) {
      for (const tag of m.template?.reservedHandlingTags ?? []) {
        assert.ok(!tag.endsWith('_variant_in_family'), `${m.moduleId}: reservedHandlingTags に ${tag}`)
      }
    }
  })

  // 2026-10-01 Owner 承認（OD-5）: アズレン点眼 module の両 entry が light_protection_variant_in_family を持つ。
  // 許可対象を PG / chemical mediator / アズレン点眼の 3 module とする（H1 / Avarept は引き続き含まない）。
  test('横展開しない: family tag を持つ module は PG / chemical mediator / アズレン点眼のみ（H1 / Avarept を含まない）', () => {
    const modulesWithFamilyTag = ALL_MODULES
      .filter(m => Object.values(m.drug?.brandCatalog ?? {}).some(e => (e.handlingTags ?? []).some(t => t.endsWith('_variant_in_family'))))
      .map(m => m.moduleId)
      .sort()
    assert.deepEqual(modulesWithFamilyTag, [CHEM.moduleId, PG.moduleId, AZULENE.moduleId].sort())
    for (const m of [H1, AVAREPT]) {
      assert.deepEqual(Object.values(m.drug!.brandCatalog!).flatMap(e => e.handlingTags ?? []).filter(t => t.endsWith('_variant_in_family')), [])
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// E. scenario reachability / Q-RAPID2 は変化しない
// ═══════════════════════════════════════════════════════════════

/** DashboardClient.tsx `groupScenarios` と同一の AND 判定（inline のため局所 helper。source contract で固定） */
const scenarioReachable = (sc: Scenario, tags: string[]): boolean => {
  const req = sc.scenarioRequiredTags
  if (!req || req.length === 0) return true
  return req.every(tag => tags.includes(tag))
}
const stripFamilyTags = (tags: string[]) => tags.filter(t => !t.endsWith('_variant_in_family'))
const reachableIds = (mod: ModuleData, tags: string[]) => mod.scenarios.filter(s => scenarioReachable(s, tags)).map(s => s.id).sort()

describe('E. scenario reachability / Q-RAPID2 は family-level variant tag で変化しない', () => {
  test('source contract: DashboardClient の scenarioRequiredTags 判定が AND 判定のまま存在する', () => {
    const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
    assert.ok(src.includes('req.every(tag => addonBrandHandlingTags.includes(tag))'))
  })

  for (const mod of [PG, CHEM]) {
    test(`${mod.moduleId}: 全 brand で、family tag を取り除いても scenario reachability は同一（scenario gate に family tag が関与しない）`, () => {
      for (const b of brandNamesOf(mod)) {
        const tags = resolvedBrandTags(mod, b)
        assert.deepEqual(reachableIds(mod, tags), reachableIds(mod, stripFamilyTags(tags)), b)
      }
    })
  }

  test('PG: 濃度増減 scenario（concentration_variant）は全 brand で到達不能のまま', () => {
    const gated = PG.scenarios.filter(s => (s.scenarioRequiredTags ?? []).includes('concentration_variant'))
    assert.equal(gated.length, 7)
    for (const b of brandNamesOf(PG)) {
      for (const sc of gated) assert.equal(scenarioReachable(sc, resolvedBrandTags(PG, b)), false, `${b}/${sc.id}`)
    }
  })

  test('PG: 回数増減 scenario（frequency_titration_available）は レスキュラ / イソプロピルウノプロストン のみ到達可能のまま', () => {
    const gated = PG.scenarios.filter(s => (s.scenarioRequiredTags ?? []).includes('frequency_titration_available'))
    assert.equal(gated.length, 7)
    const FREQ_BRANDS = ['レスキュラ点眼液', 'イソプロピルウノプロストン点眼液']
    for (const b of brandNamesOf(PG)) {
      const expected = FREQ_BRANDS.includes(b)
      for (const sc of gated) assert.equal(scenarioReachable(sc, resolvedBrandTags(PG, b)), expected, `${b}/${sc.id}`)
    }
  })

  test('PG: lifestyle_guidance_storage_light_protection scenario は property tag 保持 brand のみ到達可能（Addon は family 単位だが scenario は property 単位のまま）', () => {
    const sc = PG.scenarios.find(s => s.id === 'lifestyle_guidance_storage_light_protection')!
    assert.deepEqual(sc.scenarioRequiredTags, ['light_protection'])
    const reachable = brandNamesOf(PG).filter(b => scenarioReachable(sc, resolvedBrandTags(PG, b))).sort()
    assert.deepEqual(reachable, holders(PG, 'light_protection'))
    assert.ok(!reachable.includes('ラタノプロスト点眼液'))
  })

  test('Q-RAPID2 dose transition applicability（PG）: レスキュラ / イソプロピルウノプロストン のみ {増量,減量} とも true', () => {
    for (const b of brandNamesOf(PG)) {
      const expected = ['レスキュラ点眼液', 'イソプロピルウノプロストン点眼液'].includes(b)
      assert.deepEqual(
        doseTransitionApplicabilityForTags(PG, resolvedBrandTags(PG, b)),
        { dose_increased: expected, dose_decreased: expected },
        b,
      )
    }
  })

  test('Q-RAPID2 dose transition applicability（chemical mediator）: 全 brand で {増量,減量} とも true のまま', () => {
    for (const b of brandNamesOf(CHEM)) {
      assert.deepEqual(
        doseTransitionApplicabilityForTags(CHEM, resolvedBrandTags(CHEM, b)),
        { dose_increased: true, dose_decreased: true },
        b,
      )
    }
  })

  test('chemical mediator: concentration_variant scenario は全 brand で到達不能のまま', () => {
    const gated = CHEM.scenarios.filter(s => (s.scenarioRequiredTags ?? []).includes('concentration_variant'))
    assert.ok(gated.length > 0)
    for (const b of brandNamesOf(CHEM)) {
      for (const sc of gated) assert.equal(scenarioReachable(sc, resolvedBrandTags(CHEM, b)), false, `${b}/${sc.id}`)
    }
  })
})
