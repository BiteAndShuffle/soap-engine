/**
 * composeNodeRebuildUnit4D2.test.ts — Rapid Mode v2 / Unit 4D-2 契約テスト
 *
 * Unit 4D-2 は behavior-preserving refactor である。
 * ComposeNode の rebuild semantics を **単一の canonical implementation**
 * （`lib/primaryNode.ts` の `rebuildNode`）へ集約した。
 *
 *   Unit 4D-2 以前（実装 3 箇所）:
 *     buildPrimaryNodeSnapshot           … primary
 *     buildUpdatedNode                   … secondary / scenario 確定
 *     handleAddonToggle node branch      … secondary / ADDON
 *
 *   Unit 4D-2 以後（実装 1 箇所）:
 *     rebuildNode                        … canonical rebuild core
 *       ← buildPrimaryNodeSnapshot（→ rebuildPrimary）
 *       ← buildUpdatedNode
 *       ← handleAddonToggle node branch
 *
 * ## 中心契約
 * 「ComposeNode の rebuild semantics は primary / secondary で別実装を持たない」
 *
 * primary / secondary の違いは **identity（node.id）だけ**であり、
 * rebuild semantics の違いではない。rebuildNode は node の配列位置を一切参照しない。
 *
 * ## 本 Unit で変更していないもの
 * derive（deriveNodeBlockCore）・persona 適用・ADDON carry-over semantics・
 * RapidState の遷移計算（呼び出し側の責務のまま）・Rapid UI gate・
 * editedSOAP semantics・buildS / mergeBlocks。
 *
 * 実行:
 *   npx tsx --test tests/composeNodeRebuildUnit4D2.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, ComposeNode, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { mergeBlocks } from '../lib/buildSoap'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { nextRapidStateOnScenarioChange, type RapidState } from '../lib/rapidState'
import { resolveDrugName } from '../lib/drugSubject'
import { rebuildNode, rebuildPrimary, buildPrimaryNodeSnapshot, PRIMARY_NODE_ID } from '../lib/primaryNode'

const dashSrc    = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
const primarySrc = readFileSync(new URL('../lib/primaryNode.ts', import.meta.url), 'utf-8')

const PERSONA_IDS = Object.keys(PERSONA_LABELS) as PersonaId[]
const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

const RAPIDS: RapidState[] = [
  null,
  { previousEvent: 'dose_increased', currentOutcome: 'stable' },
  { previousEvent: 'med_changed',    currentOutcome: 'not_improved' },
  { previousEvent: 'continued_do',   currentOutcome: 'improved' },
]

/** DashboardClient.tsx:160-165 と同一（呼び出し側の責務であり helper には入っていない） */
function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}

function addonKeysOf(sc: Scenario): string[] {
  const r = (sc as unknown as { addonsRef?: Record<string, string[]> }).addonsRef
  return r ? Object.values(r).flat() : []
}

/** lifecycle field を持つ既存 Node（rebuildNode の `node` 引数用） */
function seedNode(id: string, mod: ModuleData, sc: Scenario, rapid: RapidState): ComposeNode {
  const core = deriveNodeBlockCore(sc, mod, [], rapid, '本剤')
  return {
    id, moduleId: mod.moduleId, scenarioId: sc.globalId,
    block: { id: `block-${id}`, ...core, fields: core.rawFields, domain: resolveDomain(mod) },
    drugLabel: `label-${id}`,
    selectedAddonIds: [],
    baseLabel: sc.title,
    baseDomain: resolveDomain(mod),
    matchedBrandName: `brand-${id}`,
    resolvedDrugName: '本剤',
    resolution: undefined,
    localSiteInput: `site-${id}`,
    rapid,
  }
}

/** 全 module の代表 scenario（各 module の先頭と、ADDON を持つ先頭） */
function representativeCases(): { mod: ModuleData; sc: Scenario; keys: string[] }[] {
  const out: { mod: ModuleData; sc: Scenario; keys: string[] }[] = []
  for (const mod of ALL_MODULES) {
    const scenarios = mod.scenarios ?? []
    if (scenarios.length === 0) continue
    const picked = new Set<Scenario>()
    picked.add(scenarios[0])
    const withAddon = scenarios.find(s => addonKeysOf(s).some(k => mod.addons?.items?.[k]))
    if (withAddon) picked.add(withAddon)
    const capable = scenarios.find(s => isScenarioSReplacementCapable(s))
    if (capable) picked.add(capable)
    for (const sc of picked) {
      out.push({ mod, sc, keys: addonKeysOf(sc).filter(k => mod.addons?.items?.[k]) })
    }
  }
  return out
}

const CASES = representativeCases()

// ═══════════════════════════════════════════════════════════════
// A. canonical contract — rebuildNode == deriveNodeBlockCore + persona
// ═══════════════════════════════════════════════════════════════

describe('A. rebuildNode の block は deriveNodeBlockCore + persona と値一致する', () => {
  test('全 module × 代表 scenario × addon{0,1,2} × rapid{4} × persona{OFF + 4} で一致', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES) {
      const addonSets = [[], keys.slice(0, 1), keys.slice(0, 2)].filter((a, i) => i === 0 || a.length > 0)
      for (const addonIds of addonSets) {
        for (const rapid of RAPIDS) {
          for (const personaEnabled of [false, true]) {
            for (const persona of personaEnabled ? PERSONA_IDS : (['plain'] as PersonaId[])) {
              const node = seedNode('n', mod, sc, null)
              const out = rebuildNode({
                node, mod, scenario: sc, addonIds, rapid, drugName: '本剤',
                drugLabel: node.drugLabel, baseDomain: resolveDomain(mod), personaEnabled, persona,
              })
              const core = deriveNodeBlockCore(sc, mod, addonIds, rapid, '本剤')
              const expectedFields = personaEnabled
                ? applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard)
                : core.rawFields
              assert.deepStrictEqual(out.block.rawFields, core.rawFields, `rawFields: ${mod.moduleId}/${sc.id}`)
              assert.deepStrictEqual(out.block.guard, core.guard, `guard: ${mod.moduleId}/${sc.id}`)
              assert.deepStrictEqual(out.block.fields, expectedFields, `fields: ${mod.moduleId}/${sc.id}`)
              assert.equal(out.block.templateLabel, core.templateLabel)
              assert.deepStrictEqual(out.block.symptomCodes, core.symptomCodes)
              assert.equal(out.block.closingText, core.closingText)
              assert.equal(out.block.closingBehavior, core.closingBehavior)
              assert.equal(out.block.groupKey, core.groupKey)
              assert.equal(out.block.clinicalDomain, core.clinicalDomain)
              assert.equal(out.block.domain, resolveDomain(mod))
              assert.equal(out.baseLabel, sc.title)
              assert.equal(out.baseDomain, resolveDomain(mod))
              assert.deepStrictEqual(out.selectedAddonIds, addonIds)
              checked++
            }
          }
        }
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('rebuildNode は deterministic かつ引数を破壊しない', () => {
    for (const { mod, sc, keys } of CASES.slice(0, 40)) {
      const addonIds = keys.slice(0, 2)
      const frozenAddon = [...addonIds]
      const node = seedNode('n', mod, sc, RAPIDS[1])
      const snapshot = JSON.parse(JSON.stringify(node)) as ComposeNode
      const args = { node, mod, scenario: sc, addonIds, rapid: RAPIDS[1], drugName: '本剤',
        drugLabel: node.drugLabel, baseDomain: resolveDomain(mod), personaEnabled: true, persona: 'gentle' as PersonaId }
      const a = rebuildNode(args)
      const b = rebuildNode(args)
      assert.deepStrictEqual(a, b, `非決定的: ${mod.moduleId}/${sc.id}`)
      assert.deepStrictEqual(addonIds, frozenAddon, 'addonIds を破壊した')
      assert.deepStrictEqual(JSON.parse(JSON.stringify(node)), snapshot, 'node を破壊した')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// B. primary / secondary が同一 semantics を共有する（中心契約）
// ═══════════════════════════════════════════════════════════════

describe('B. primary と secondary は同一入力から同一 block を得る', () => {
  test('id と lifecycle 以外、primary（rebuildPrimary）と secondary（rebuildNode）の出力が一致する', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES) {
      const addonIds = keys.slice(0, 1)
      for (const rapid of RAPIDS) {
        for (const personaEnabled of [false, true]) {
          const persona: PersonaId = personaEnabled ? 'polite' : 'plain'
          const common = {
            mod, scenario: sc, addonIds, rapid, drugName: '本剤',
            drugLabel: 'SHARED', baseDomain: resolveDomain(mod), personaEnabled, persona,
          }
          // primary: id = PRIMARY_NODE_ID
          const pSeed = { ...seedNode(PRIMARY_NODE_ID, mod, sc, null), block: { ...seedNode(PRIMARY_NODE_ID, mod, sc, null).block, id: 'shared-block' } }
          const p = rebuildPrimary({ node: pSeed, ...common })
          // secondary: id = 任意の node id
          const sSeed = { ...seedNode('node-xyz', mod, sc, null), block: { ...seedNode('node-xyz', mod, sc, null).block, id: 'shared-block' } }
          const s = rebuildNode({ node: sSeed, ...common })

          assert.deepStrictEqual(s.block, p.block, `block が primary/secondary で異なる: ${mod.moduleId}/${sc.id}`)
          assert.equal(s.scenarioId, p.scenarioId)
          assert.equal(s.baseLabel, p.baseLabel)
          assert.equal(s.baseDomain, p.baseDomain)
          assert.equal(s.moduleId, p.moduleId)
          assert.deepStrictEqual(s.selectedAddonIds, p.selectedAddonIds)
          assert.deepStrictEqual(s.rapid, p.rapid)
          assert.equal(s.drugLabel, p.drugLabel)
          // 違うのは identity だけ
          assert.notEqual(s.id, p.id)
          assert.equal(p.id, PRIMARY_NODE_ID)
          assert.equal(s.id, 'node-xyz')
          checked++
        }
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })
})

// ═══════════════════════════════════════════════════════════════
// C. secondary の 2 経路が canonical core と一致する
// ═══════════════════════════════════════════════════════════════

describe('C. secondary scenario rebuild / ADDON rebuild が canonical core と一致する', () => {
  test('scenario 確定経路（buildUpdatedNode 相当）の出力が rebuildNode と一致する', () => {
    let checked = 0
    for (const { mod } of CASES) {
      const scenarios = mod.scenarios ?? []
      if (scenarios.length < 2) continue
      const from = scenarios[0], to = scenarios[1]
      for (const rapid of RAPIDS) {
        const node = seedNode('n1', mod, from, rapid)
        const addonIds = addonKeysOf(to).filter(k => mod.addons?.items?.[k]).slice(0, 1)
        // buildUpdatedNode が呼び出し側で確定させる rapid 遷移（helper は遷移を計算しない）
        const nextRapid = nextRapidStateOnScenarioChange(
          node.rapid,
          isScenarioSReplacementCapable(from),
          isScenarioSReplacementCapable(to),
        )
        const out = rebuildNode({
          node, mod, scenario: to, addonIds, rapid: nextRapid,
          drugName: node.resolvedDrugName ?? '', drugLabel: node.drugLabel,
          baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain',
        })
        assert.equal(out.scenarioId, to.globalId, 'scenarioId が新 scenario になっていない')
        assert.deepStrictEqual(out.rapid, nextRapid, 'rapid が遷移結果と一致しない')
        const core = deriveNodeBlockCore(to, mod, addonIds, nextRapid, node.resolvedDrugName ?? '')
        assert.deepStrictEqual(out.block.rawFields, core.rawFields)
        checked++
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('ADDON 経路は rapid / scenarioId を変えず block だけ組み直す', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES) {
      if (keys.length === 0) continue
      for (const rapid of RAPIDS) {
        const node = seedNode('t', mod, sc, rapid)
        const out = rebuildNode({
          node, mod, scenario: sc, addonIds: keys.slice(0, 1), rapid: node.rapid,
          drugName: node.resolvedDrugName ?? '', drugLabel: node.drugLabel,
          baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain',
        })
        assert.equal(out.scenarioId, node.scenarioId, 'ADDON トグルで scenarioId が変化した')
        assert.deepStrictEqual(out.rapid, node.rapid, 'ADDON トグルで rapid が変化した')
        assert.deepStrictEqual(out.selectedAddonIds, keys.slice(0, 1))
        checked++
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })
})

// ═══════════════════════════════════════════════════════════════
// D. persona parity
// ═══════════════════════════════════════════════════════════════

describe('D. persona OFF / plain / concise / polite / gentle で一致する', () => {
  test('personaEnabled=false は rawFields、true は applyPersonaToFieldsWithGuard の出力', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES) {
      const addonIds = keys.slice(0, 1)
      const node = seedNode('n', mod, sc, RAPIDS[1])
      const base = { node, mod, scenario: sc, addonIds, rapid: RAPIDS[1], drugName: '本剤',
        drugLabel: node.drugLabel, baseDomain: resolveDomain(mod) }
      const core = deriveNodeBlockCore(sc, mod, addonIds, RAPIDS[1], '本剤')

      const off = rebuildNode({ ...base, personaEnabled: false, persona: 'plain' })
      assert.deepStrictEqual(off.block.fields, core.rawFields, `persona OFF: ${mod.moduleId}/${sc.id}`)

      for (const persona of PERSONA_IDS) {
        const on = rebuildNode({ ...base, personaEnabled: true, persona })
        assert.deepStrictEqual(
          on.block.fields,
          applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard),
          `persona ${persona}: ${mod.moduleId}/${sc.id}`,
        )
        // rawFields は persona ON でも常に raw のまま
        assert.deepStrictEqual(on.block.rawFields, core.rawFields, 'rawFields に persona が混入した')
        checked++
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('返る ComposeNode に persona identity が混入しない', () => {
    const { mod, sc } = CASES[0]
    const out = rebuildNode({
      node: seedNode('n', mod, sc, null), mod, scenario: sc, addonIds: [], rapid: null,
      drugName: '本剤', drugLabel: 'L', baseDomain: 'd', personaEnabled: true, persona: 'gentle',
    })
    for (const k of ['personaEnabled', 'selectedPersona', 'persona']) {
      assert.equal(k in (out as unknown as Record<string, unknown>), false, `${k} が ComposeNode に混入している`)
      assert.equal(k in (out.block as unknown as Record<string, unknown>), false, `${k} が block に混入している`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// E. Rapid preservation
// ═══════════════════════════════════════════════════════════════

describe('E. rapid=null / non-null の双方で現行 semantics が保たれる', () => {
  test('渡した rapid がそのまま出力 rapid になる（helper は遷移を計算しない）', () => {
    let checked = 0
    for (const { mod, sc } of CASES) {
      for (const nodeRapid of RAPIDS) {
        for (const passed of RAPIDS) {
          const out = rebuildNode({
            node: seedNode('n', mod, sc, nodeRapid), mod, scenario: sc, addonIds: [],
            rapid: passed, drugName: '本剤', drugLabel: 'L',
            baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain',
          })
          assert.deepStrictEqual(out.rapid, passed, `渡した rapid が反映されない: ${mod.moduleId}/${sc.id}`)
          checked++
        }
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('non-null rapid は生成 block（S 先頭文）へ反映される', () => {
    let checked = 0
    for (const { mod, sc } of CASES) {
      if (!isScenarioSReplacementCapable(sc)) continue
      const base = { node: seedNode('n', mod, sc, null), mod, scenario: sc, addonIds: [],
        drugName: '本剤', drugLabel: 'L', baseDomain: resolveDomain(mod),
        personaEnabled: false, persona: 'plain' as PersonaId }
      const withNull = rebuildNode({ ...base, rapid: null })
      const withRapid = rebuildNode({ ...base, rapid: RAPIDS[1] })
      assert.notEqual(
        withRapid.block.rawFields?.S, withNull.block.rawFields?.S,
        `non-null rapid が S へ反映されない: ${mod.moduleId}/${sc.id}`,
      )
      checked++
    }
    assert.ok(checked > 0, 'capable scenario が 0 件')
  })

  test('rebuildNode は nextRapidStateOnScenarioChange を呼ばない（遷移は呼び出し側の責務）', () => {
    const body = primarySrc.slice(
      primarySrc.indexOf('export function rebuildNode'),
      primarySrc.indexOf('export function buildPrimaryNodeSnapshot'),
    )
    assert.ok(body.length > 0, 'rebuildNode の本体が切り出せない')
    assert.equal(/nextRapidStateOnScenarioChange/.test(body), false, 'helper が遷移計算を取り込んでいる')
    assert.equal(/isScenarioSReplacementCapable/.test(body), false, 'helper が capability 判定を取り込んでいる')
  })
})

// ═══════════════════════════════════════════════════════════════
// F. identity contract
// ═══════════════════════════════════════════════════════════════

describe('F. node.id は位置ではなく明示 identity から決まる', () => {
  test('出力 id は常に input.node.id と一致する（任意の id 文字列）', () => {
    const { mod, sc } = CASES[0]
    for (const id of [PRIMARY_NODE_ID, 'node-1', 'node-abc-999', 'zzz', '0']) {
      const out = rebuildNode({
        node: seedNode(id, mod, sc, null), mod, scenario: sc, addonIds: [], rapid: null,
        drugName: '本剤', drugLabel: 'L', baseDomain: 'd', personaEnabled: false, persona: 'plain',
      })
      assert.equal(out.id, id, `id が input.node.id から保存されていない: ${id}`)
    }
  })

  test('block.id も input.node.block.id から保存される', () => {
    const { mod, sc } = CASES[0]
    const node = { ...seedNode('n', mod, sc, null) }
    node.block = { ...node.block, id: 'custom-block-id' }
    const out = rebuildNode({
      node, mod, scenario: sc, addonIds: [], rapid: null, drugName: '本剤',
      drugLabel: 'L', baseDomain: 'd', personaEnabled: false, persona: 'plain',
    })
    assert.equal(out.block.id, 'custom-block-id')
  })

  test('rebuildNode は PRIMARY_NODE_ID を注入しない / 位置に依存しない（source contract）', () => {
    const body = primarySrc.slice(
      primarySrc.indexOf('export function rebuildNode'),
      primarySrc.indexOf('export function buildPrimaryNodeSnapshot'),
    )
    assert.equal(/PRIMARY_NODE_ID/.test(body), false, 'rebuildNode が primary 固定 id を注入している')
    assert.equal(/isPrimary/.test(body), false, 'rebuildNode に primary 分岐がある')
    for (const bad of [/\[0\]/, /\bindex\b/, /composeNodes/, /\bfindIndex\b/]) {
      assert.equal(bad.test(body), false, `rebuildNode に位置依存が混入している: ${bad}`)
    }
  })

  test('buildPrimaryNodeSnapshot は従来どおり PRIMARY_NODE_ID を identity に使う（primary caller の責務）', () => {
    const { mod, sc } = CASES[0]
    const out = buildPrimaryNodeSnapshot({
      mod, scenario: sc, addonIds: [], rapid: null, drugName: '本剤', localSiteInput: '',
      matchedBrandName: undefined, resolvedDrugName: undefined, resolution: undefined,
      drugLabel: 'L', baseDomain: 'd', blockId: 'bid', personaEnabled: false, persona: 'plain',
    })
    assert.equal(out.id, PRIMARY_NODE_ID)
  })
})

// ═══════════════════════════════════════════════════════════════
// G. lifecycle metadata preservation
// ═══════════════════════════════════════════════════════════════

describe('G. lifecycle metadata が rebuild で失われない', () => {
  test('matchedBrandName / resolvedDrugName / resolution / localSiteInput / moduleId が保存される', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES) {
      for (const site of ['部位A', '', undefined] as (string | undefined)[]) {
        const node: ComposeNode = { ...seedNode('n', mod, sc, RAPIDS[1]), localSiteInput: site }
        const out = rebuildNode({
          node, mod, scenario: sc, addonIds: keys.slice(0, 1), rapid: node.rapid,
          drugName: '本剤', drugLabel: node.drugLabel, baseDomain: resolveDomain(mod),
          personaEnabled: false, persona: 'plain',
        })
        assert.equal(out.matchedBrandName, node.matchedBrandName)
        assert.equal(out.resolvedDrugName, node.resolvedDrugName)
        assert.equal(out.resolution, node.resolution)
        assert.equal(out.localSiteInput, site, 'localSiteInput が書き換えられた（?? "" の混入など）')
        assert.equal(out.moduleId, mod.moduleId)
        checked++
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('localSiteInput は derive に materialize されない', () => {
    for (const { mod, sc } of CASES.slice(0, 30)) {
      const a = rebuildNode({ node: { ...seedNode('n', mod, sc, null), localSiteInput: 'X' },
        mod, scenario: sc, addonIds: [], rapid: null, drugName: '本剤', drugLabel: 'L',
        baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain' })
      const b = rebuildNode({ node: { ...seedNode('n', mod, sc, null), localSiteInput: 'YYYY' },
        mod, scenario: sc, addonIds: [], rapid: null, drugName: '本剤', drugLabel: 'L',
        baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain' })
      assert.deepStrictEqual(a.block, b.block, `localSiteInput が block へ漏れている: ${mod.moduleId}/${sc.id}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// H. non-target node preservation
// ═══════════════════════════════════════════════════════════════

describe('H. secondary 更新時に他 node が変わらない', () => {
  test('production と同形の prev.map 畳み込みで非対象 node が参照一致のまま', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES) {
      if (keys.length === 0) continue
      const other1 = seedNode('o1', mod, sc, null)
      const target = seedNode('t', mod, sc, RAPIDS[1])
      const other2 = seedNode('o2', mod, sc, RAPIDS[2])
      const prev: ComposeNode[] = [other1, target, other2]

      const updated = rebuildNode({
        node: target, mod, scenario: sc, addonIds: keys.slice(0, 1), rapid: target.rapid,
        drugName: '本剤', drugLabel: target.drugLabel, baseDomain: resolveDomain(mod),
        personaEnabled: false, persona: 'plain',
      })
      const next = prev.map(n => n.id !== 't' ? n : updated)

      assert.ok(Object.is(next[0], other1), `非対象 node の参照が変わった: ${mod.moduleId}/${sc.id}`)
      assert.ok(Object.is(next[2], other2), `非対象 node の参照が変わった: ${mod.moduleId}/${sc.id}`)
      assert.deepStrictEqual(next[2].rapid, RAPIDS[2], '非対象 node の rapid が変わった')
      assert.equal(Object.is(next[1], target), false, '対象 node が更新されていない')
      checked++
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })
})

// ═══════════════════════════════════════════════════════════════
// I. final SOAP parity
// ═══════════════════════════════════════════════════════════════

describe('I. mergeBlocks の最終出力が canonical core 経由で変わらない', () => {
  test('primary + 2 node の SOAP が deriveNodeBlockCore 直接組み立てと byte 一致', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES) {
      const addonIds = keys.slice(0, 1)
      for (const rapid of RAPIDS) {
        for (const personaEnabled of [false, true]) {
          const persona: PersonaId = personaEnabled ? 'concise' : 'plain'
          const mk = (id: string) => rebuildNode({
            node: seedNode(id, mod, sc, rapid), mod, scenario: sc, addonIds, rapid,
            drugName: '本剤', drugLabel: 'L', baseDomain: resolveDomain(mod), personaEnabled, persona,
          })
          const p = rebuildPrimary({
            node: seedNode(PRIMARY_NODE_ID, mod, sc, rapid), mod, scenario: sc, addonIds, rapid,
            drugName: '本剤', drugLabel: 'L', baseDomain: resolveDomain(mod), personaEnabled, persona,
          })
          const n1 = mk('n1'), n2 = mk('n2')
          const actual = mergeBlocks([n1.block, n2.block], p.block.fields, p.block.templateLabel,
            p.block.closingText, undefined, p.block.groupKey, p.block.clinicalDomain)

          // 期待値: helper を通さず deriveNodeBlockCore + persona から直接組み立てた block
          const core = deriveNodeBlockCore(sc, mod, addonIds, rapid, '本剤')
          const fields = personaEnabled
            ? applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard) : core.rawFields
          const raw = (id: string) => ({ id: `block-${id}`, ...core, fields, domain: resolveDomain(mod) })
          const expected = mergeBlocks([raw('n1'), raw('n2')], fields, core.templateLabel,
            core.closingText, undefined, core.groupKey, core.clinicalDomain)

          assert.deepStrictEqual(actual, expected, `SOAP 不一致: ${mod.moduleId}/${sc.id}`)
          checked++
        }
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })
})

// ═══════════════════════════════════════════════════════════════
// J. purity / 実装の集約
// ═══════════════════════════════════════════════════════════════

describe('J. rebuildNode は pure function であり実装は 1 箇所に集約されている', () => {
  test('lib/primaryNode.ts が React / setter / ref を参照しない', () => {
    assert.equal(/from 'react'/.test(primarySrc), false, 'react を import している')
    assert.equal(/\buseState\b|\buseRef\b|\buseCallback\b|\buseMemo\b/.test(primarySrc), false, 'React hook を使っている')
    assert.equal(/\bset[A-Z]\w*\(/.test(primarySrc), false, 'setter を呼んでいる')
    assert.equal(/\.current\b/.test(primarySrc), false, 'ref を読んでいる')
  })

  test('rebuildNode 本体に代入文・副作用が無い（分割代入と return のみ）', () => {
    const body = primarySrc.slice(
      primarySrc.indexOf('export function rebuildNode'),
      primarySrc.indexOf('export function buildPrimaryNodeSnapshot'),
    )
    const code = body.split('\n')
      .filter(l => { const t = l.trim(); return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')
    assert.equal(/\bglobalThis\b|\bwindow\b|\bdocument\b/.test(code), false, 'global へアクセスしている')
    assert.equal(/\bpush\(|\bsplice\(|\bsort\(\)/.test(code), false, '引数を破壊する可能性のある操作がある')
  })

  test('ComposeNode block の rebuild 実装は production に 1 つだけ（deriveNodeBlockCore の呼び出し元）', () => {
    // lib/primaryNode.ts: rebuildNode 内の 1 箇所のみ
    const libCount = (primarySrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
      .match(/deriveNodeBlockCore\(/g) ?? []).length
    assert.equal(libCount, 1, `lib/primaryNode.ts の deriveNodeBlockCore 呼び出しは 1 箇所のみ（実際: ${libCount}）`)
    // DashboardClient.tsx: 0 箇所（すべて rebuildNode へ委譲済み）
    const dashCount = (dashSrc.match(/deriveNodeBlockCore\(/g) ?? []).length
    assert.equal(dashCount, 0, `DashboardClient に block derive の inline 実装が残っている（実際: ${dashCount}）`)
  })

  test('secondary の 3 経路が rebuildNode を呼んでいる（Unit 4D-3b successor: handleSToggle node branch を追加）', () => {
    // Unit 4D-2 時点は buildUpdatedNode / handleAddonToggle node branch の 2 経路だった。
    // Unit 4D-3b で node Rapid write path（handleSToggle node branch）が
    // 承認済みの第3 caller として加わったため、canonical rebuild authority の契約
    // 「secondary の rebuild は rebuildNode に集約されている」は維持したまま
    // caller 数のみ 2 → 3 へ更新する。
    const count = (dashSrc.match(/rebuildNode\(\{/g) ?? []).length
    assert.equal(count, 3, `secondary の rebuildNode 呼び出しは 3 経路のはず（実際: ${count}）`)
    const buildUpdated = dashSrc.slice(
      dashSrc.indexOf('const buildUpdatedNode = useCallback'),
      dashSrc.indexOf('const handleSelectPrimaryNode = useCallback'),
    )
    assert.ok(/rebuildNode\(\{/.test(buildUpdated), 'buildUpdatedNode が rebuildNode へ委譲していない')
    const addonBranch = dashSrc.slice(
      dashSrc.indexOf('const handleAddonToggle = useCallback'),
      dashSrc.indexOf('const handleSToggle = useCallback'),
    )
    assert.ok(/rebuildNode\(\{/.test(addonBranch), 'handleAddonToggle node branch が rebuildNode へ委譲していない')
    const sToggleBlock = dashSrc.slice(
      dashSrc.indexOf('const handleSToggle = useCallback'),
      dashSrc.indexOf('const handleSubcategorySelect = useCallback'),
    )
    assert.ok(/rebuildNode\(\{/.test(sToggleBlock), 'handleSToggle node branch が rebuildNode へ委譲していない')
  })

  test('primary 経路は rebuildPrimary → buildPrimaryNodeSnapshot → rebuildNode の委譲鎖である', () => {
    const rp = primarySrc.slice(primarySrc.indexOf('export function rebuildPrimary'))
    assert.ok(/buildPrimaryNodeSnapshot\(/.test(rp), 'rebuildPrimary が buildPrimaryNodeSnapshot を呼んでいない')
    const bps = primarySrc.slice(primarySrc.indexOf('export function buildPrimaryNodeSnapshot'))
    assert.ok(/rebuildNode\(\{/.test(bps), 'buildPrimaryNodeSnapshot が rebuildNode へ委譲していない')
    // DashboardClient は buildPrimaryNodeSnapshot を直接呼ばない（Unit 4A 以来の契約）
    assert.equal(/buildPrimaryNodeSnapshot/.test(dashSrc), false)
  })
})

// ═══════════════════════════════════════════════════════════════
// K. Unit 4D-2 のスコープ外が変わっていない
// ═══════════════════════════════════════════════════════════════

describe('K. スコープ外の不変', () => {
  test('handleSToggle は node Rapid write path を持ち、Unit 4D-4 で production UI から到達可能になった（Unit 4D-3b successor contract）', () => {
    // 4D-2 時点は「何もしない early return」だった。4D-3b で node Rapid write path
    // （node branch）が追加され、4D-4 で isSingleDrug gate が撤廃されて到達可能になった。
    assert.ok(/if \(nodeId !== null\) \{/.test(dashSrc), 'node Rapid write path（node branch）が存在しない')
    // isSingleDrug は live code（変数宣言・ThirdPanel への prop 渡し）としては
    // 存在しないことを確認する。historical comment 内の言及は failure 条件にしない（D-4D4-5）。
    assert.equal(
      dashSrc.includes('const isSingleDrug ='), false,
      'isSingleDrug が live variable として production contract に残っている（Unit 4D-4 で除去されているはず）',
    )
    assert.equal(
      dashSrc.includes('isSingleDrug={'), false,
      'isSingleDrug が ThirdPanel へ prop として渡されている',
    )
    assert.ok(dashSrc.includes('activeScenario={addonTargetScenario}'), 'activeScenario={addonTargetScenario} が渡されていない')
    assert.ok(dashSrc.includes('rapidState={(activeNode ?? primaryNode).rapid}'), 'rapidState={(activeNode ?? primaryNode).rapid} が渡されていない')
  })

  test('Rapid UI gate は Unit 4D-4 で active context scope（isSingleDrug 除去）へ移行している', () => {
    assert.ok(dashSrc.includes('activeScenario={addonTargetScenario}'))
    assert.ok(dashSrc.includes('rapidState={(activeNode ?? primaryNode).rapid}'))
  })

  test('4D-1 の purity contract が維持されている（node ADDON 経路）', () => {
    const addonBranch = dashSrc.slice(
      dashSrc.indexOf('const handleAddonToggle = useCallback'),
      dashSrc.indexOf('const handleSToggle = useCallback'),
    )
    const rawNodeBranch = addonBranch.slice(
      addonBranch.indexOf('if (nodeId !== null) {'),
      addonBranch.indexOf('} else {'),
    )
    // コメント行を除いたコードのみで判定する（4D-1 の設計意図を説明するコメントに
    // composeNodesRef の語が残っているため。tests/secondaryAddonWritePathUnit4D1.test.ts と同方式）
    const nodeBranch = rawNodeBranch.split('\n')
      .filter(l => { const t = l.trim(); return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .map(l => l.replace(/\s+\/\/.*$/, ''))
      .join('\n')
    assert.equal(/composeNodesRef/.test(nodeBranch), false, 'composeNodesRef が復活している')
    assert.ok(/setComposeNodes\(prev => \{/.test(nodeBranch), 'pure functional updater でなくなっている')
    assert.ok(/setSelectedAddonIds\(next\)/.test(nodeBranch), '値形式の setSelectedAddonIds でなくなっている')
    assert.ok(/prev\.map\(n => n\.id !== nodeId \? n : updated\)/.test(nodeBranch), 'id addressing でなくなっている')
  })

  test('buildUpdatedNode が rapid 遷移計算を保持している（helper へ移していない）', () => {
    const buildUpdated = dashSrc.slice(
      dashSrc.indexOf('const buildUpdatedNode = useCallback'),
      dashSrc.indexOf('const handleSelectPrimaryNode = useCallback'),
    )
    assert.ok(/nextRapidStateOnScenarioChange\(/.test(buildUpdated), 'rapid 遷移計算が消えている')
  })

  test('primary の rebuildPrimary 呼び出しが 4 件のまま', () => {
    const codeOnly = dashSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    assert.equal((codeOnly.match(/rebuildPrimary\(/g) ?? []).length, 4)
  })
})
