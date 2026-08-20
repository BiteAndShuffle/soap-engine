/**
 * primaryNodeProjectionUnit4B.test.ts — Rapid Mode v2 / Unit 4B 契約テスト
 *
 * Unit 4B（primary read path の Node-shaped read-only projection への統一）で、
 *   1. projection.block.fields が **primaryBaseFields をそのまま使う**こと
 *      （= CHECK-4A-1 の transient re-derive を導入していないこと）
 *   2. computeDisplayFields の出力が Unit 4A HEAD と byte 一致すること
 *   3. read path（scenarioId / resolution / localSiteInput / matchedBrandName /
 *      moduleId / addonTargetScenario）が現行式と同値であること
 *   4. projection が read-only であり writable SSOT を増やしていないこと
 * を固定する。
 *
 * ## CHECK-4A-1 について（本ファイルの中心契約）
 *
 * scenario A → B の切替時、handleSelectScenario は selectedScenarioId / rapidState
 * のみを同一 batch で更新し、primaryAddonIds / primaryBaseFields の更新は
 * useEffect([selectedScenarioId]) が行う。したがって effect 前の render には
 *
 *     selectedScenarioId = B（新） / primaryAddonIds = 旧 / primaryBaseFields = 旧
 *
 * という transient state が存在する。ここで current state から fields を
 * 再 derive すると「新 scenario × 旧 addonIds」となり、現行表示（旧
 * primaryBaseFields）と 100% 乖離する（Unit 4B 事前監査で全 35 module 実測）。
 *
 * よって projection.block.fields は **必ず primaryBaseFields をそのまま使う**。
 * T-4B-1 は「一致する」ことではなく「**再 derive を採用していない**」ことを
 * 積極的に確認する（再 derive 版とは異なりうることまで検証する）。
 *
 * RAPID-V2-20:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   projection の組み立ては DashboardClient 内にあり export されないため、
 *   test 側では production と同一形状のオブジェクトを組み立て、
 *   mergeBlocks / deriveNodeBlockCore 等の production helper を oracle に使う。
 *
 * 実行:
 *   npx tsx --test tests/primaryNodeProjectionUnit4B.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, SoapKey, MergedBlock, ComposeNode } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { mergeBlocks, buildNodeFields } from '../lib/buildSoap'
import { deriveRawFields, deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { derivePersonaGuard } from '../lib/personaGuard'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { nextRapidStateOnScenarioChange, type RapidState } from '../lib/rapidState'
import { PRIMARY_NODE_ID } from '../lib/primaryNode'

const SECTIONS: SoapKey[] = ['S', 'O', 'A', 'P']
const DRUG = '本剤'
const PERSONA_IDS = Object.keys(PERSONA_LABELS) as PersonaId[]
const PRIMARY_BLOCK_ID = 'primary-block'

const RAPID_A: RapidState = { previousEvent: 'continued_do', currentOutcome: 'stable' }

const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

function codeOnly(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

function addonKeysOf(scenario: Scenario): string[] {
  const ref = (scenario as unknown as { addonsRef?: unknown }).addonsRef
  if (Array.isArray(ref)) return ref.filter((x): x is string => typeof x === 'string')
  if (ref && typeof ref === 'object') {
    return (Object.values(ref).flat() as unknown[]).filter(
      (x): x is string => typeof x === 'string',
    )
  }
  return []
}

function allScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) for (const sc of mod.scenarios ?? []) out.push({ mod, sc })
  return out
}

function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  return allScenarios().filter(({ sc }) => isScenarioSReplacementCapable(sc))
}

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

/** DashboardClient の local resolveClosingText と同一ロジックの production oracle。
 *  local 関数は export されていないため buildNodeFields の closingText を使う。 */
function closingTextOracle(sc: Scenario, mod: ModuleData): string | undefined {
  return buildNodeFields(sc, mod, [], DRUG).closingText
}

/**
 * production の primaryNodeProjection と同一形状の projection を組み立てる。
 *
 * ⚠️ block.fields は **引数の primaryBaseFields をそのまま使う**。
 *    ここで再 derive しないことが Unit 4B の中心契約である。
 */
function buildProjection(input: {
  mod: ModuleData
  scenario: Scenario | undefined
  primaryBaseFields: SoapFields
  addonIds: string[]
  rapid: RapidState
  localSiteInput?: string
  matchedBrandName?: string
  resolvedDrugName?: string
}): ComposeNode {
  const { mod, scenario, primaryBaseFields, addonIds, rapid } = input
  return {
    id: PRIMARY_NODE_ID,
    moduleId: mod.moduleId,
    scenarioId: scenario?.globalId ?? '',
    block: {
      id: PRIMARY_BLOCK_ID,
      templateLabel: scenario?.title ?? '',
      fields: primaryBaseFields,
      closingText: scenario ? closingTextOracle(scenario, mod) : undefined,
      closingBehavior: scenario?.mergePolicy?.P?.closingBehavior,
      groupKey: scenario?.mergePolicy?.S?.groupKey,
      clinicalDomain: mod.composition?.clinicalDomain,
      symptomCodes: scenario?.sComposition?.symptomCodes,
      domain: resolveDomain(mod),
    },
    drugLabel: 'L',
    selectedAddonIds: [...addonIds],
    baseLabel: scenario?.title ?? '',
    baseDomain: resolveDomain(mod),
    matchedBrandName: input.matchedBrandName,
    resolvedDrugName: input.resolvedDrugName,
    resolution: undefined,
    localSiteInput: input.localSiteInput ?? '',
    rapid,
  }
}

/** Unit 4B の computeDisplayFields（production と同一実装） */
function computeDisplayFieldsNew(primaryNode: ComposeNode, composeNodes: ComposeNode[]): SoapFields {
  const confirmed = composeNodes.filter(n => n.scenarioId !== '' && n.scenarioId != null)
  if (confirmed.length === 0) return { ...primaryNode.block.fields }
  return mergeBlocks(
    confirmed.map(n => n.block),
    primaryNode.block.fields,
    primaryNode.block.templateLabel,
    primaryNode.block.closingText,
    undefined,
    primaryNode.block.groupKey,
    primaryNode.block.clinicalDomain,
  )
}

/** Unit 4A HEAD（変更前）の computeDisplayFields を逐語再現した oracle */
function computeDisplayFieldsHead(
  primaryBaseFields: SoapFields,
  primaryScenario: Scenario | undefined,
  composeNodes: ComposeNode[],
  mod: ModuleData,
): SoapFields {
  const confirmed = composeNodes.filter(n => n.scenarioId !== '' && n.scenarioId != null)
  if (confirmed.length === 0) return { ...primaryBaseFields }
  return mergeBlocks(
    confirmed.map(n => n.block),
    primaryBaseFields,
    primaryScenario?.title ?? '',
    primaryScenario ? closingTextOracle(primaryScenario, mod) : undefined,
    undefined,
    primaryScenario?.mergePolicy?.S?.groupKey,
    mod.composition?.clinicalDomain,
  )
}

/** secondary node block を production 経路で作る */
function makeNodeBlock(sc: Scenario, mod: ModuleData, id: string): MergedBlock {
  const core = deriveNodeBlockCore(sc, mod, [], null, '他剤')
  return { id, ...core, fields: core.rawFields, domain: resolveDomain(mod) }
}

function makeNode(sc: Scenario, mod: ModuleData, id: string): ComposeNode {
  return {
    id, moduleId: mod.moduleId, scenarioId: sc.globalId,
    block: makeNodeBlock(sc, mod, `b-${id}`),
    drugLabel: 'N', selectedAddonIds: [], baseLabel: sc.title,
    baseDomain: resolveDomain(mod), rapid: null,
  }
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const k of SECTIONS) assert.equal(a[k], b[k], `${msg} [${k}]`)
}

// ═══════════════════════════════════════════════════════════════
// A. CHECK-4A-1 transient regression guard（最重要）
// ═══════════════════════════════════════════════════════════════

describe('A. transient（scenario A→B の effect 前）で再 derive していない', () => {
  test('T-4B-1: projection.block.fields は旧 primaryBaseFields と byte 一致し、再 derive 版とは異なりうる', () => {
    let checked = 0
    let divergedFromRederive = 0
    for (const mod of ALL_MODULES) {
      const scs = mod.scenarios ?? []
      if (scs.length < 2) continue
      for (let i = 0; i < Math.min(scs.length, 3); i++) {
        for (let j = 0; j < Math.min(scs.length, 3); j++) {
          if (i === j) continue
          const A = scs[i], B = scs[j]
          const oldAddons = addonKeysOf(A).slice(0, 2)
          const oldRapid: RapidState = isScenarioSReplacementCapable(A) ? RAPID_A : null

          // effect 前の primaryBaseFields（= A の内容）
          const oldRaw = deriveRawFields(A, mod, oldAddons, oldRapid, DRUG)
          const oldGuard = derivePersonaGuard(A, mod.template?.urgentFlag)
          const oldPrimaryBaseFields = oldRaw   // persona OFF

          // handleSelectScenario は同一 batch で rapid を遷移させる
          const newRapid = nextRapidStateOnScenarioChange(
            oldRapid,
            isScenarioSReplacementCapable(A),
            isScenarioSReplacementCapable(B),
          )

          // transient render: scenario=B（新）/ addonIds=旧 / primaryBaseFields=旧
          const proj = buildProjection({
            mod, scenario: B, primaryBaseFields: oldPrimaryBaseFields,
            addonIds: oldAddons, rapid: newRapid,
          })

          // ① 旧 primaryBaseFields をそのまま保持している
          assertFieldsEqual(
            proj.block.fields as SoapFields, oldPrimaryBaseFields,
            `transient で primaryBaseFields が保持されていない: ${mod.moduleId} ${A.id}→${B.id}`,
          )

          // ② 「新 scenario × 旧 addonIds」で再 derive した値とは別物でありうる
          //    （= 再 derive を採用していないことの積極的確認）
          const rederived = deriveRawFields(B, mod, oldAddons, newRapid, DRUG)
          if (JSON.stringify(proj.block.fields) !== JSON.stringify(rederived)) divergedFromRederive++

          void oldGuard
          checked++
        }
      }
    }
    assert.ok(checked > 0, 'transient ケースが生成されなかった')
    assert.ok(
      divergedFromRederive > 0,
      '再 derive 版と一度も差が出ていない。projection が再 derive を採用している疑いがある',
    )
  })

  test('T-4B-1b: production の projection が block.fields に primaryBaseFields を使っている（補助的保証）', () => {
    const code = codeOnly(src)
    const start = code.indexOf('const primaryNodeProjection = useMemo')
    assert.notEqual(start, -1, 'primaryNodeProjection が見つからない')
    const end = code.indexOf('}), [', start)
    const body = code.slice(start, end)
    assert.ok(/fields:\s*primaryBaseFields/.test(body), 'block.fields に primaryBaseFields を使っていない')
    // 再 derive の混入を禁止
    assert.ok(!/deriveRawFields\(/.test(body), 'projection 内で deriveRawFields を呼んではならない')
    assert.ok(!/deriveNodeBlockCore\(/.test(body), 'projection 内で deriveNodeBlockCore を呼んではならない')
    assert.ok(!/buildPrimaryNodeSnapshot\(/.test(body), 'projection 内で buildPrimaryNodeSnapshot を呼んではならない')
  })

  test('T-4B-2: steady-state（effect 後）でも projection.block.fields === primaryBaseFields', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      // effect 後: addonIds は空、primaryBaseFields は新 scenario の内容
      const newRaw = deriveRawFields(sc, mod, [], null, DRUG)
      const proj = buildProjection({
        mod, scenario: sc, primaryBaseFields: newRaw, addonIds: [], rapid: null,
      })
      assertFieldsEqual(proj.block.fields as SoapFields, newRaw, `${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(checked > 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// B. computeDisplayFields byte parity（Unit 4A HEAD との一致）
// ═══════════════════════════════════════════════════════════════

describe('B. computeDisplayFields は Unit 4A HEAD と byte 一致する', () => {
  test('T-4B-3: single / 2drug / 3drug × persona × ADDON × Rapid で parity', () => {
    let cases = 0, mismatch = 0
    const examples: string[] = []
    for (const mod of ALL_MODULES) {
      const scs = mod.scenarios ?? []
      if (scs.length === 0) continue
      const other = ALL_MODULES.find(m => m.moduleId !== mod.moduleId) ?? mod
      const otherSc = (other.scenarios ?? [])[0]
      if (!otherSc) continue

      for (const sc of scs.slice(0, 3)) {
        const addonSets = [[], addonKeysOf(sc).slice(0, 2)]
        for (const addonIds of addonSets) {
          for (const rapid of [null, isScenarioSReplacementCapable(sc) ? RAPID_A : null]) {
            for (const pe of [false, true]) {
              for (const persona of (pe ? PERSONA_IDS : ['plain' as PersonaId])) {
                const raw = deriveRawFields(sc, mod, addonIds, rapid, DRUG)
                const guard = derivePersonaGuard(sc, mod.template?.urgentFlag)
                const primaryBaseFields = pe
                  ? applyPersonaToFieldsWithGuard(raw, true, persona, guard)
                  : raw

                const nodeSets: ComposeNode[][] = [
                  [],
                  [makeNode(otherSc, other, 'n1')],
                  [makeNode(otherSc, other, 'n1'), makeNode(scs[0], mod, 'n2')],
                ]
                for (const nodes of nodeSets) {
                  const proj = buildProjection({
                    mod, scenario: sc, primaryBaseFields, addonIds, rapid,
                  })
                  const now = computeDisplayFieldsNew(proj, nodes)
                  const head = computeDisplayFieldsHead(primaryBaseFields, sc, nodes, mod)
                  if (JSON.stringify(now) !== JSON.stringify(head)) {
                    mismatch++
                    if (examples.length < 3) {
                      examples.push(`${mod.moduleId}/${sc.id} nodes=${nodes.length} pe=${pe}/${persona}`)
                    }
                  }
                  cases++
                }
              }
            }
          }
        }
      }
    }
    assert.ok(cases > 0, 'parity ケースが生成されなかった')
    assert.equal(mismatch, 0, `computeDisplayFields parity mismatch: ${examples.join(' / ')}`)
  })

  test('T-4B-3b: pending（scenario 未確定）でも parity', () => {
    for (const mod of ALL_MODULES.slice(0, 10)) {
      const proj = buildProjection({
        mod, scenario: undefined, primaryBaseFields: { S: '', O: '', A: '', P: '' },
        addonIds: [], rapid: null,
      })
      const now = computeDisplayFieldsNew(proj, [])
      const head = computeDisplayFieldsHead({ S: '', O: '', A: '', P: '' }, undefined, [], mod)
      assertFieldsEqual(now, head, `pending parity: ${mod.moduleId}`)
    }
  })

  test('T-4B-6: computeDisplayFields が mergeBlocks へ渡す引数が現行と同一である（補助的保証）', () => {
    const code = codeOnly(src)
    const start = code.indexOf('function computeDisplayFields')
    const end = code.indexOf('\n}', start)
    const body = code.slice(start, end)
    // closingBehavior / symptomCodes / domain を新たに渡していないこと
    assert.ok(!/closingBehavior/.test(body), 'computeDisplayFields が closingBehavior を渡してはならない')
    assert.ok(!/symptomCodes/.test(body), 'computeDisplayFields が symptomCodes を渡してはならない')
    assert.ok(!/block\.domain/.test(body), 'computeDisplayFields が block.domain を渡してはならない')
    // currentDomain 位置は undefined のまま
    assert.ok(/undefined,/.test(body), 'currentDomain 引数の undefined が失われている')
  })
})

// ═══════════════════════════════════════════════════════════════
// C. read path parity
// ═══════════════════════════════════════════════════════════════

describe('C. read path が現行式と同値である', () => {
  test('T-4B-4: scenarioId / resolution / localSiteInput / matchedBrandName が現行式と同値', () => {
    for (const { mod, sc } of allScenarios().slice(0, 60)) {
      const proj = buildProjection({
        mod, scenario: sc, primaryBaseFields: { S: '', O: '', A: '', P: '' },
        addonIds: [], rapid: null, localSiteInput: '右腕', matchedBrandName: 'BN',
      })
      // currentScenarioId: (activeNode ?? proj).scenarioId || null
      assert.equal(proj.scenarioId || null, sc.globalId)
      // activeLocalSiteInput
      assert.equal(proj.localSiteInput ?? '', '右腕')
      // legacyBrandKey
      assert.equal(proj.matchedBrandName ?? mod.drug?.brandNames?.[0], 'BN')
      // moduleId → targetModule
      assert.equal(proj.moduleId, mod.moduleId)
    }
  })

  test('T-4B-4b: scenario 未確定なら currentScenarioId は null になる', () => {
    const mod = ALL_MODULES[0]
    const proj = buildProjection({
      mod, scenario: undefined, primaryBaseFields: { S: '', O: '', A: '', P: '' },
      addonIds: [], rapid: null,
    })
    assert.equal(proj.scenarioId || null, null)
  })

  test('T-4B-5: targetModule 経由の scenario 解決が activeModuleData 直参照と同一オブジェクトになる', () => {
    // targetModule = allModules.find(m => m.moduleId === proj.moduleId) ?? activeModuleData
    // これが activeModuleData と参照同一であることが addonTargetScenario の同値性根拠。
    let checked = 0
    for (const mod of ALL_MODULES) {
      const found: ModuleData | undefined = ALL_MODULES.find(m => m.moduleId === mod.moduleId)
      assert.equal(found, mod, `targetModule が参照同一でない: ${mod.moduleId}`)
      const targetModule: ModuleData = found ?? mod
      for (const sc of (mod.scenarios ?? []).slice(0, 3)) {
        const viaTarget: Scenario | undefined = targetModule.scenarios.find(s => s.globalId === sc.globalId)
        const viaActive: Scenario | undefined = mod.scenarios.find(s => s.globalId === sc.globalId)
        assert.equal(viaTarget, viaActive, `scenario 参照が一致しない: ${mod.moduleId}/${sc.id}`)
        checked++
      }
    }
    assert.ok(checked > 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// D. read-only / SSOT boundary
// ═══════════════════════════════════════════════════════════════

describe('D. projection は read-only であり writable SSOT を増やしていない', () => {
  const code = codeOnly(src)

  test('T-4B-7: primaryNodeProjection への代入 / setter が存在しない', () => {
    assert.ok(!/setPrimaryNode/.test(code), 'setPrimaryNode を作ってはならない')
    assert.ok(!/primaryNodeProjection\s*=/.test(code.replace(/const primaryNodeProjection = useMemo/g, '')),
      'primaryNodeProjection へ再代入してはならない')
  })

  test('T-4B-8: primaryNode の React state / ref が追加されていない', () => {
    assert.ok(!/useState<ComposeNode\s*\|\s*null>/.test(code), 'writable primaryNode state を作ってはならない')
    assert.ok(!/primaryNodeRef/.test(code), 'Unit 4B では primaryNodeRef を作らない')
  })

  test('T-4B-13: buildPrimaryNodeSnapshot は未接続のまま（PRIMARY_NODE_ID の利用は許可）', () => {
    assert.ok(!/buildPrimaryNodeSnapshot/.test(src), 'Unit 4B では buildPrimaryNodeSnapshot を接続しない')
    assert.ok(/PRIMARY_NODE_ID/.test(src), 'projection identity に PRIMARY_NODE_ID を使う')
  })

  test('T-4B-9: scenario rebuild effect の dependency が変わっていない（Unit 0 invariant）', () => {
    const start = src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')
    assert.notEqual(start, -1, 'effect のアンカーコメントが見つからない')
    const depsMatch = src.slice(start).match(/\n\s*\}, \[([^\]]*)\]\)/)
    assert.ok(depsMatch, 'effect の dependency 配列が見つからない')
    const deps = depsMatch![1].split(',').map(s => s.trim()).filter(Boolean)
    assert.deepEqual(deps, ['selectedScenarioId'], `effect deps が変化している: [${deps.join(', ')}]`)
  })

  test('T-4B-9b: primary write path（handler / effect）に projection が混入していない', () => {
    // projection は read 専用。write handler が projection を読んで書き戻す経路を作らない。
    const handlerNames = [
      'const handleSelectScenario = useCallback',
      'const handleAddonToggle = useCallback',
      'const handleSToggle = useCallback',
    ]
    for (const anchor of handlerNames) {
      const start = code.indexOf(anchor)
      assert.notEqual(start, -1, `${anchor} が見つからない`)
      const body = code.slice(start, start + 4000)
      assert.ok(
        !/primaryNodeProjection/.test(body),
        `${anchor} が primaryNodeProjection を参照している（write path は現行のまま維持する）`,
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// E. Persona / localInput boundary
// ═══════════════════════════════════════════════════════════════

describe('E. Persona / localInput boundary', () => {
  test('T-4B-10: projection に persona identity が含まれない', () => {
    const mod = ALL_MODULES[0]
    const sc = (mod.scenarios ?? [])[0]
    const proj = buildProjection({
      mod, scenario: sc, primaryBaseFields: { S: '', O: '', A: '', P: '' },
      addonIds: [], rapid: null,
    })
    const keys = Object.keys(proj)
    assert.ok(!keys.includes('personaEnabled'))
    assert.ok(!keys.includes('selectedPersona'))
    assert.ok(!keys.includes('persona'))
  })

  test('T-4B-10b: persona 変更で displayFields が HEAD と一致し続ける（byte parity のみ）', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios().slice(0, 20)) {
      const raw = deriveRawFields(sc, mod, [], null, DRUG)
      const guard = derivePersonaGuard(sc, mod.template?.urgentFlag)
      const other = ALL_MODULES.find(m => m.moduleId !== mod.moduleId) ?? mod
      const otherSc = (other.scenarios ?? [])[0]
      if (!otherSc) continue
      const nodes = [makeNode(otherSc, other, 'n1')]
      for (const persona of PERSONA_IDS) {
        const pbf = applyPersonaToFieldsWithGuard(raw, true, persona, guard)
        const proj = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null })
        assertFieldsEqual(
          computeDisplayFieldsNew(proj, nodes),
          computeDisplayFieldsHead(pbf, sc, nodes, mod),
          `persona=${persona} ${mod.moduleId}/${sc.id}`,
        )
        checked++
      }
    }
    assert.ok(checked > 0)
  })

  test('T-4B-11: localSiteInput は projection の field としてのみ保持され block.fields に影響しない', () => {
    const mod = ALL_MODULES[0]
    const sc = (mod.scenarios ?? [])[0]
    const pbf = deriveRawFields(sc, mod, [], null, DRUG)
    const a = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null, localSiteInput: '' })
    const b = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null, localSiteInput: '左足首' })
    assert.notEqual(a.localSiteInput, b.localSiteInput)
    assertFieldsEqual(a.block.fields as SoapFields, b.block.fields as SoapFields, 'localInput が block.fields へ漏れている')
  })

  test('T-4B-12: projection.block に rawFields / guard が含まれない', () => {
    const mod = ALL_MODULES[0]
    const sc = (mod.scenarios ?? [])[0]
    const proj = buildProjection({
      mod, scenario: sc, primaryBaseFields: deriveRawFields(sc, mod, [], null, DRUG),
      addonIds: [], rapid: null,
    })
    assert.equal(proj.block.rawFields, undefined, 'read path で rawFields を正本にしない')
    assert.equal(proj.block.guard, undefined, 'read path で guard を正本にしない')
    // production 側も同様
    const code = codeOnly(src)
    const start = code.indexOf('const primaryNodeProjection = useMemo')
    const body = code.slice(start, code.indexOf('}), [', start))
    assert.ok(!/rawFields:/.test(body), 'projection に rawFields を入れてはならない')
    assert.ok(!/guard:/.test(body), 'projection に guard を入れてはならない')
  })
})

// ═══════════════════════════════════════════════════════════════
// F. Rapid / ADDON / determinism
// ═══════════════════════════════════════════════════════════════

describe('F. Rapid / ADDON / determinism', () => {
  test('T-4B-14a: Rapid null / non-null がそのまま projection へ載る', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 20)) {
      const pbf = deriveRawFields(sc, mod, [], RAPID_A, DRUG)
      const proj = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: RAPID_A })
      assert.deepEqual(proj.rapid, RAPID_A)
      const projNull = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null })
      assert.equal(projNull.rapid, null)
    }
  })

  test('T-4B-14b: ADDON 選択が selectedAddonIds へ載り、block.fields は primaryBaseFields のまま', () => {
    let checked = 0
    for (const { mod, sc } of allScenarios()) {
      const keys = addonKeysOf(sc).slice(0, 2)
      if (keys.length === 0) continue
      const pbf = deriveRawFields(sc, mod, keys, null, DRUG)
      const proj = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: keys, rapid: null })
      assert.deepEqual(proj.selectedAddonIds, keys)
      assertFieldsEqual(proj.block.fields as SoapFields, pbf, `${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(checked > 0)
  })

  test('T-4B-15: 同一 state から同一 projection（determinism）', () => {
    for (const { mod, sc } of allScenarios().slice(0, 20)) {
      const pbf = deriveRawFields(sc, mod, [], null, DRUG)
      const a = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null })
      const b = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null })
      assert.deepEqual(a, b)
    }
  })

  test('T-4B-16: editingNodeId のみの変化では projection が変わらない（Unit 0 invariant の behavior 版）', () => {
    // projection は editingNodeId に依存しない（deps に含まれない）ことを構造で確認し、
    // 同一 primary state から同一 projection が得られることを値で確認する。
    const code = codeOnly(src)
    const start = code.indexOf('const primaryNodeProjection = useMemo')
    const depsStart = code.indexOf('}), [', start)
    const depsEnd = code.indexOf('])', depsStart)
    const deps = code.slice(depsStart + 5, depsEnd)
    assert.ok(!/editingNodeId/.test(deps), 'projection の deps に editingNodeId を含めてはならない')
    assert.ok(!/activeNode/.test(deps), 'projection の deps に activeNode を含めてはならない')

    const mod = ALL_MODULES[0]
    const sc = (mod.scenarios ?? [])[0]
    const pbf = deriveRawFields(sc, mod, [], null, DRUG)
    const before = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null })
    const after = buildProjection({ mod, scenario: sc, primaryBaseFields: pbf, addonIds: [], rapid: null })
    assert.deepEqual(before, after)
  })
})
