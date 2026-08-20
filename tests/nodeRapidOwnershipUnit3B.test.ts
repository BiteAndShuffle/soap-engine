/**
 * nodeRapidOwnershipUnit3B.test.ts — Rapid Mode v2 / Unit 3B 契約テスト
 *
 * Unit 3B（ComposeNode Rapid ownership wiring）で、secondary Node が RapidState を
 * 正式に所有し、その値が deterministic derive の入力として実際に消費される
 * architecture を固定する:
 *
 *   ComposeNode.rapid（required）
 *     → buildUpdatedNode / handleAddonToggle node branch
 *     → deriveNodeBlockCore（Unit 3A で完成済み。本 Unit では変更しない）
 *     → rawFields
 *     → global persona（applyPersonaToFieldsWithGuard）
 *     → block.fields
 *     → mergeBlocks / SOAP
 *
 * production UI から secondary Node の Rapid を non-null にする経路は
 * Unit 3B 時点でも存在しない（Rapid UI は 1剤目限定のまま）。
 * これは意図的な dead value であり、dead field ではない —
 * 本ファイルは production helper への直接投入で consumer 経路が
 * 実際に機能することを検証する。
 *
 * RAPID-V2-20:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   scenario 遷移計算は buildUpdatedNode が実際に呼ぶ
 *   nextRapidStateOnScenarioChange / isScenarioSReplacementCapable を
 *   そのまま呼び出して検証する。
 *
 * 実行:
 *   npx tsx --test tests/nodeRapidOwnershipUnit3B.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, SoapKey, MergedBlock, ComposeNode } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { derivePersonaGuard } from '../lib/personaGuard'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { mergeBlocks } from '../lib/buildSoap'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { nextRapidStateOnScenarioChange, type RapidState } from '../lib/rapidState'
import {
  type SRelation,
  type SCondition,
  buildResolvedSFirstSentence,
  firstSentenceOf,
} from '../lib/rapidSentence'

const SECTIONS: SoapKey[] = ['S', 'O', 'A', 'P']
const DRUG = '本剤'
const PERSONA_IDS = Object.keys(PERSONA_LABELS) as PersonaId[]

const RELATIONS: SRelation[] = [
  'new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do',
]
const CONDITIONS: SCondition[] = ['stable', 'improved', 'unchanged', 'not_improved']
const SAMPLE_RAPID_STATES: RapidState[] = RELATIONS.flatMap(r =>
  CONDITIONS.map(c => ({ previousEvent: r, currentOutcome: c })),
)
const RAPID_A: RapidState = SAMPLE_RAPID_STATES[0]

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

function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      if (isScenarioSReplacementCapable(sc)) out.push({ mod, sc })
    }
  }
  return out
}

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const sec of SECTIONS) {
    assert.equal(a[sec], b[sec], `${msg} [${sec}]`)
  }
}

/**
 * buildUpdatedNode（DashboardClient.tsx 現行実装）の scenario 遷移部分を
 * production helper の組み合わせとして再現する oracle。
 * deriveNodeBlockCore / nextRapidStateOnScenarioChange / isScenarioSReplacementCapable を
 * そのまま呼ぶだけで、Rapid 遷移ロジック自体を複製しない。
 */
function transitionNode(
  node: ComposeNode,
  mod: ModuleData,
  newSc: Scenario,
  addonIds: string[],
  drugName: string,
  personaEnabled: boolean,
  persona: PersonaId,
): ComposeNode {
  const prevSc = mod.scenarios.find(s => s.globalId === node.scenarioId)
  const nextRapid = nextRapidStateOnScenarioChange(
    node.rapid,
    isScenarioSReplacementCapable(prevSc),
    isScenarioSReplacementCapable(newSc),
  )
  const core = deriveNodeBlockCore(newSc, mod, addonIds, nextRapid, drugName)
  const fields = personaEnabled
    ? applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard)
    : core.rawFields
  const domain = resolveDomain(mod)
  return {
    ...node,
    scenarioId: newSc.globalId,
    rapid: nextRapid,
    block: { id: node.block.id, ...core, fields, domain },
    selectedAddonIds: addonIds,
    baseLabel: newSc.title,
    baseDomain: domain,
  }
}

// ═══════════════════════════════════════════════════════════════
// A. ownership — ComposeNode.rapid は required RapidState
// ═══════════════════════════════════════════════════════════════

describe('A. ComposeNode.rapid は required RapidState である', () => {
  const typesSrc = readFileSync(new URL('../lib/types.ts', import.meta.url), 'utf-8')
  const ifaceStart = typesSrc.indexOf('export interface ComposeNode')
  const ifaceEnd = typesSrc.indexOf('\n}', ifaceStart)
  assert.ok(ifaceStart !== -1 && ifaceEnd !== -1, 'ComposeNode interface の抽出に失敗した')
  const block = typesSrc.slice(ifaceStart, ifaceEnd)

  test('T-3B-1: rapid フィールドが required（rapid?: ではなく rapid:）で存在する（補助的保証）', () => {
    assert.ok(/\n\s*rapid:\s*RapidState\s*$/.test(block), 'rapid が required で宣言されていない')
    assert.ok(!/\n\s*rapid\?:\s*RapidState/.test(block), 'rapid が optional のまま（三状態を作ってはならない）')
  })

  test('rapid の型は RapidState を再利用している（新しい型を作っていない）', () => {
    assert.ok(/import type \{ RapidState \} from '\.\/rapidState'/.test(typesSrc))
  })
})

// ═══════════════════════════════════════════════════════════════
// B. Node 生成時の初期化
// ═══════════════════════════════════════════════════════════════

describe('B. Node 生成時は rapid: null で初期化される', () => {
  const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

  test('T-3B-2: production の Node 生成 2 経路（handleComposeDrugSelect / handleExpressAdd）が rapid: null を持つ（補助的保証。型が required なので tsc が実質保証する）', () => {
    const handleComposeDrugSelectBlock = src.slice(
      src.indexOf('const handleComposeDrugSelect = useCallback'),
      src.indexOf('const handleSelectNode = useCallback'),
    )
    const handleExpressAddBlock = src.slice(
      src.indexOf('const handleExpressAdd = useCallback'),
      src.indexOf('// NLP生成モード（現在未使用・将来機能）'),
    )
    assert.ok(/rapid:\s*null/.test(handleComposeDrugSelectBlock), 'handleComposeDrugSelect が rapid: null を明示していない')
    assert.ok(/rapid:\s*null/.test(handleExpressAddBlock), 'handleExpressAdd が rapid: null を明示していない')
  })

  test('新規 Node object は primary の global rapidState を参照しない', () => {
    const rawBlock = src.slice(
      src.indexOf('const handleComposeDrugSelect = useCallback'),
      src.indexOf('const handleSelectNode = useCallback'),
    )
    // コメントを除いた実装本体だけを見る（説明コメント中の語をヒットさせない）
    const codeOnly = rawBlock
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '')
    // rapidStateRef / rapidState という識別子（global state）が
    // 生成ロジック内で読まれていないことを確認する
    assert.ok(!/\brapidStateRef\b|\brapidState\b(?!OnScenarioChange)/.test(codeOnly))
  })
})

// ═══════════════════════════════════════════════════════════════
// C. scenario transition（中心契約・behavior）
// ═══════════════════════════════════════════════════════════════

describe('C. scenario 遷移で node.rapid が正しく計算される（production helper 直接使用）', () => {
  test('T-3B-3 / T-3B-4 / T-3B-5: capable⇄capable / capable→non-capable / non-capable→capable の 4 パターン', () => {
    let capCap = 0, capNon = 0, nonCap = 0, pending = 0
    for (const mod of ALL_MODULES) {
      const scs = mod.scenarios ?? []
      const cap = scs.filter(isScenarioSReplacementCapable)
      const non = scs.filter(s => !isScenarioSReplacementCapable(s))

      if (cap.length >= 2) {
        const node: ComposeNode = {
          id: 'n', moduleId: mod.moduleId, scenarioId: cap[0].globalId,
          block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
          drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: RAPID_A,
        }
        const r = transitionNode(node, mod, cap[1], [], DRUG, false, 'plain')
        assert.deepEqual(r.rapid, RAPID_A, `capable→capable は保持されるべき: ${mod.moduleId}`)
        capCap++
      }
      if (cap.length >= 1 && non.length >= 1) {
        const n1: ComposeNode = {
          id: 'n', moduleId: mod.moduleId, scenarioId: cap[0].globalId,
          block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
          drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: RAPID_A,
        }
        const r1 = transitionNode(n1, mod, non[0], [], DRUG, false, 'plain')
        assert.equal(r1.rapid, null, `capable→non-capable は null になるべき: ${mod.moduleId}`)
        capNon++

        const n2: ComposeNode = {
          id: 'n', moduleId: mod.moduleId, scenarioId: non[0].globalId,
          block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
          drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: RAPID_A,
        }
        const r2 = transitionNode(n2, mod, cap[0], [], DRUG, false, 'plain')
        assert.equal(r2.rapid, null, `non-capable→capable は null のまま（自動付与しない）: ${mod.moduleId}`)
        nonCap++
      }
      if (cap.length >= 1) {
        const pendingNode: ComposeNode = {
          id: 'n', moduleId: mod.moduleId, scenarioId: '',
          block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
          drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: null,
        }
        const r = transitionNode(pendingNode, mod, cap[0], [], DRUG, false, 'plain')
        assert.equal(r.rapid, null, `pending → 初回確定は null: ${mod.moduleId}`)
        pending++
      }
    }
    assert.ok(capCap > 0 && capNon > 0 && nonCap > 0 && pending > 0, '各パターンの対象 scenario が見つからなかった')
  })

  test('T-3B-3a: 遷移後の node.rapid と、derive に使われた RapidState が一致する（...node の旧値保持による不整合がないことを値で検証）', () => {
    let checked = 0
    for (const { mod, sc: capA } of capableScenarios()) {
      const nonCap = (mod.scenarios ?? []).find(s => !isScenarioSReplacementCapable(s))
      if (!nonCap) continue
      const node: ComposeNode = {
        id: 'n', moduleId: mod.moduleId, scenarioId: capA.globalId,
        block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
        drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: RAPID_A,
      }
      // production の buildUpdatedNode と同じ組み立て: nextRapid を明示的に計算し、
      // それを core の入力にも block.rapid にも同一の値として使う
      const nextRapid = nextRapidStateOnScenarioChange(
        node.rapid,
        isScenarioSReplacementCapable(capA),
        isScenarioSReplacementCapable(nonCap),
      )
      const core = deriveNodeBlockCore(nonCap, mod, [], nextRapid, DRUG)
      const updated: ComposeNode = { ...node, scenarioId: nonCap.globalId, rapid: nextRapid, block: { id: 'b', ...core, fields: core.rawFields, domain: 'x' } }

      // node.rapid（state）と block.rawFields（derive 結果）が同じ nextRapid から
      // 生成されていることを確認する。ここでは nextRapid が capable→non-capable の
      // ケースなので null になり、rawFields の S が Rapid 適用前の scenario 本来の
      // 文（先頭文に Rapid 解決文が含まれない）であることまで検証する。
      assert.equal(updated.rapid, null)
      const wouldBeRapidFirst = firstSentenceOf(
        buildResolvedSFirstSentence(RAPID_A!.previousEvent, RAPID_A!.currentOutcome, DRUG, mod.display?.adjustmentExpression),
      )
      assert.notEqual(
        firstSentenceOf(updated.block.rawFields!.S), wouldBeRapidFirst,
        `旧 rapid が block へ紛れ込んでいる（state/block 不整合）: ${mod.moduleId}`,
      )
      checked++
    }
    assert.ok(checked > 0, 'capable→non-capable の組が見つからなかった')
  })

  test('T-3B-3b: pending Node（scenarioId=""）の初回 scenario 確定は rapid=null になる', () => {
    const { mod, sc } = capableScenarios()[0]
    const pendingNode: ComposeNode = {
      id: 'n', moduleId: mod.moduleId, scenarioId: '',
      block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
      drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: null,
    }
    const r = transitionNode(pendingNode, mod, sc, [], DRUG, false, 'plain')
    assert.equal(r.rapid, null)
  })
})

// ═══════════════════════════════════════════════════════════════
// D. ADDON トグルは scenario 遷移ではない — node.rapid をそのまま維持する
// ═══════════════════════════════════════════════════════════════

describe('D. ADDON 変更で node.rapid が不変である', () => {
  test('T-3B-6: 同一 scenario への ADDON トグルは transition function を通さず rapid を保持する', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const addonKeys = addonKeysOf(sc)
      if (addonKeys.length === 0) continue
      // handleAddonToggle node branch と同じ入力: node.rapid をそのまま deriveNodeBlockCore へ渡す
      const before = deriveNodeBlockCore(sc, mod, [], RAPID_A, DRUG)
      const after = deriveNodeBlockCore(sc, mod, [addonKeys[0]], RAPID_A, DRUG)
      assert.equal(
        firstSentenceOf(before.rawFields.S), firstSentenceOf(after.rawFields.S),
        `ADDON トグルで Rapid 先頭文が変化した: ${mod.moduleId}/${sc.id}`,
      )
      checked++
    }
    assert.ok(checked > 0)
  })

  test('production の handleAddonToggle node branch が node.rapid を渡している（null リテラルではない）', () => {
    const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
    const addonBlock = src.slice(
      src.indexOf('const handleAddonToggle = useCallback'),
      src.indexOf('const handleSToggle = useCallback'),
    )
    assert.ok(/deriveNodeBlockCore\(sc, mod, newAddonIds, node\.rapid,/.test(addonBlock))
    assert.ok(!/deriveNodeBlockCore\(sc, mod, newAddonIds, null,/.test(addonBlock))
  })
})

// ═══════════════════════════════════════════════════════════════
// E. localInput 独立性
// ═══════════════════════════════════════════════════════════════

describe('E. localInput 変更で node.rapid が失われない', () => {
  test('T-3B-7: { ...n, localSiteInput } 形式（production の handleLocalSiteInputChange と同型）が rapid を保持する', () => {
    const node: ComposeNode = {
      id: 'n', moduleId: 'm', scenarioId: 's',
      block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
      drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: RAPID_A,
    }
    const updated = { ...node, localSiteInput: '右手首' }
    assert.deepEqual(updated.rapid, RAPID_A)
  })
})

// ═══════════════════════════════════════════════════════════════
// F. Node revisit invariant（Unit 0 契約の維持）
// ═══════════════════════════════════════════════════════════════

describe('F. Node revisit で rapid が変化しない', () => {
  const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

  test('T-3B-8: handleSelectNode は setComposeNodes を呼ばない（block/rapid を re-materialize しない）', () => {
    const block = src.slice(
      src.indexOf('const handleSelectNode = useCallback'),
      src.indexOf('const handleRemoveComposeNode = useCallback'),
    )
    assert.ok(!/setComposeNodes/.test(block), 'handleSelectNode が composeNodes を書き換えている（再訪で state が変わってはならない）')
  })
})

// ═══════════════════════════════════════════════════════════════
// G. Node 削除 invariant
// ═══════════════════════════════════════════════════════════════

describe('G. Node 削除で他 Node の rapid が不変である', () => {
  test('T-3B-9: id 基準 filter は他 Node の rapid を変化させない（index 詰めによる state 移動がない）', () => {
    const nodeA: ComposeNode = {
      id: 'a', moduleId: 'm', scenarioId: 's',
      block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
      drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: RAPID_A,
    }
    const nodeB: ComposeNode = {
      id: 'b', moduleId: 'm', scenarioId: 's',
      block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
      drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: SAMPLE_RAPID_STATES[1],
    }
    const removed = [nodeA, nodeB].filter(n => n.id !== 'b')
    assert.equal(removed.length, 1)
    assert.deepEqual(removed[0].rapid, RAPID_A, 'Node B 削除後も Node A の rapid が変化してはならない')
  })
})

// ═══════════════════════════════════════════════════════════════
// H. non-null node.rapid → SOAP reachability（中心 invariant）
// ═══════════════════════════════════════════════════════════════

describe('H. non-null node.rapid が SOAP まで反映される（production helper 直接使用）', () => {
  test('T-3B-10: node.rapid → deriveNodeBlockCore → rawFields → persona → mergeBlocks で差分が保存される', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 30)) {
      const nodeRapid: ComposeNode = {
        id: 'r', moduleId: mod.moduleId, scenarioId: sc.globalId,
        block: { id: 'b', templateLabel: '', fields: { S: '', O: '', A: '', P: '' }, closingText: undefined },
        drugLabel: '', selectedAddonIds: [], baseLabel: '', baseDomain: '', rapid: RAPID_A,
      }
      const nodeNull: ComposeNode = { ...nodeRapid, id: 'n', rapid: null }

      const coreRapid = deriveNodeBlockCore(sc, mod, [], nodeRapid.rapid, DRUG)
      const coreNull  = deriveNodeBlockCore(sc, mod, [], nodeNull.rapid,  DRUG)

      for (const p of PERSONA_IDS) {
        const fieldsRapid = applyPersonaToFieldsWithGuard(coreRapid.rawFields, true, p, coreRapid.guard)
        const fieldsNull  = applyPersonaToFieldsWithGuard(coreNull.rawFields,  true, p, coreNull.guard)

        const blockRapid: MergedBlock = { id: nodeRapid.id, ...coreRapid, fields: fieldsRapid, domain: 'x' }
        const blockNull:  MergedBlock = { id: nodeNull.id,  ...coreNull,  fields: fieldsNull,  domain: 'x' }

        const soapRapid = mergeBlocks([blockRapid], { S: '', O: '', A: '', P: '' }, '', undefined)
        const soapNull  = mergeBlocks([blockNull],  { S: '', O: '', A: '', P: '' }, '', undefined)

        assert.notEqual(
          soapRapid.S, soapNull.S,
          `persona=${p} 適用後も node.rapid の差分が SOAP へ保存されるべき: ${mod.moduleId}/${sc.id}`,
        )
      }
      checked++
    }
    assert.ok(checked > 0)
  })

  test('T-3B-11: Rapid + ADDON 共存時も ADDON 本文が保持される', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const addonKeys = addonKeysOf(sc).slice(0, 1)
      if (addonKeys.length === 0) continue
      const nullCore  = deriveNodeBlockCore(sc, mod, addonKeys, null,     DRUG)
      const rapidCore = deriveNodeBlockCore(sc, mod, addonKeys, RAPID_A, DRUG)
      const nullRest  = nullCore.rawFields.S.slice(firstSentenceOf(nullCore.rawFields.S).length)
      const rapidRest = rapidCore.rawFields.S.slice(firstSentenceOf(rapidCore.rawFields.S).length)
      assert.equal(nullRest, rapidRest, `ADDON 由来の残余本文が Rapid 適用で変化した: ${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(checked > 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// I. operation-order determinism
// ═══════════════════════════════════════════════════════════════

describe('I. 同一最終 state から同一 block が得られる（operation-order 非依存）', () => {
  test('T-3B-12: deriveNodeBlockCore は node.rapid を含む入力に対して deterministic である', () => {
    const { mod, sc } = capableScenarios()[0]
    const a = deriveNodeBlockCore(sc, mod, [], RAPID_A, DRUG)
    const b = deriveNodeBlockCore(sc, mod, [], RAPID_A, DRUG)
    assert.deepEqual(a, b)
  })
})

// ═══════════════════════════════════════════════════════════════
// J. primary / secondary 独立性（SSOT 評価）
// ═══════════════════════════════════════════════════════════════

describe('J. primary global rapidState と node.rapid は独立している', () => {
  const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

  test('T-3B-13: computeDisplayFields は primaryNode と composeNodes を別引数で受け取る（primary は composeNodes に含まれない。Unit 4B 更新）', () => {
    const block = src.slice(
      src.indexOf('function computeDisplayFields'),
      src.indexOf('function computeDisplayFields') + 1200,
    )
    assert.ok(/primaryNode: ComposeNode/.test(block))
    assert.ok(/composeNodes: ComposeNode\[\]/.test(block))
  })

  test('primary の handleSToggle / handleAddonToggle primary branch は setComposeNodes を呼ばない', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('const handleSubcategorySelect = useCallback'),
    )
    assert.ok(!/setComposeNodes/.test(toggleBlock))
  })
})

// ═══════════════════════════════════════════════════════════════
// K. UI gate boundary（不可侵の確認）
// ═══════════════════════════════════════════════════════════════

describe('K. Rapid UI gate は 1剤目限定のまま変更されていない', () => {
  const dashboardSrc = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
  const thirdPanelSrc = readFileSync(new URL('../app/components/ThirdPanel.tsx', import.meta.url), 'utf-8')

  test('T-3B-14a: isSingleDrug は composeNodes.length === 0 を要求する', () => {
    assert.ok(/isSingleDrug = selectedScenarioId !== null && composeNodes\.length === 0/.test(dashboardSrc))
  })

  test('T-3B-14b: ThirdPanel の showSButtons は isSReplacementEligible(..., { thirdPanelEnabled, isSingleDrug }) を経由する', () => {
    assert.ok(/isSReplacementEligible\(primaryScenario, \{ thirdPanelEnabled, isSingleDrug \}\)/.test(thirdPanelSrc))
  })

  test('T-3B-14c: handleSToggle はノード編集中に early return する（multi-node Rapid は未解禁）', () => {
    const toggleBlock = dashboardSrc.slice(
      dashboardSrc.indexOf('const handleSToggle = useCallback'),
      dashboardSrc.indexOf('const handleSubcategorySelect = useCallback'),
    )
    assert.ok(/if \(editingNodeIdRef\.current !== null\) return/.test(toggleBlock))
  })

  test('T-3B-14d: lib/deriveNodeFields.ts は Unit 3A から変更されていない（deriveNodeBlockCore / NodeBlockCore / deriveRawFields が存在する）', () => {
    const deriveSrc = readFileSync(new URL('../lib/deriveNodeFields.ts', import.meta.url), 'utf-8')
    assert.ok(/export function deriveRawFields/.test(deriveSrc))
    assert.ok(/export type NodeBlockCore/.test(deriveSrc))
    assert.ok(/export function deriveNodeBlockCore/.test(deriveSrc))
  })
})
