/**
 * secondaryDiscardContractUnit4D3a.test.ts — Rapid Mode v2 / Unit 4D-3a 契約テスト
 *
 * Owner Decision D-4D3-OD1（OD1_SECONDARY_WRITE_CONTRACT_NEEDS_UNIFICATION）に基づき、
 * secondary node の content write 2 経路を primary と同一の discard contract へ統一した:
 *
 *   1. handleSelectScenario の node branch（scenario 確定）
 *   2. handleAddonToggle    の node branch（ADDON トグル）
 *
 * ## 統一される契約
 *   editedSOAP === null → 従来どおり即時実行
 *   editedSOAP !== null → confirmDiscard dialog を開く。**content state は一切変化しない**
 *     confirm → dialog 側が editedSOAP を破棄 → action 実行
 *     cancel  → node / pendingNodeIds / selectedAddonIds / editedSOAP をすべて保持
 *
 * ## 意図的な behavior change（D-4D3-3 で承認済み）
 * 従来は editedSOAP !== null でも確認なしに node state だけが変化し、表示 SOAP は
 * editedSOAP のままだった（不可視更新）。本 Unit でこれを discard confirmation へ統一する。
 * これは regression ではなく、global editedSOAP authority と secondary content write を
 * 整合させる behavior correction である。
 *
 * ## editedSOAP の破棄 authority（D-4D3-5 / Owner 承認）
 * 破棄は **dialog confirm 側の 1 箇所**（DashboardClient.tsx の
 * `setEditedSOAP(null)` → `action()`）が担う。新規 secondary callback 内には
 * setEditedSOAP(null) を置かない。confirmDiscard の callback は
 * editedSOAP !== null の状態では決して実行されないため、callback 内 reset は
 * 値を変えない（source からの証明。J 群が構造で固定する）。
 *
 * ## テスト手法について（rapidNodeStateSafety.test.ts と同じ方針）
 * React renderer が無いため handler を直接実行できない。したがって:
 *   - **値（主）**: confirmDiscard と dialog 2 ボタンを逐語再現した state-transition
 *     harness で遷移を観測する。node の再構築は production の rebuildNode /
 *     buildUpdatedNode 相当を使い、derive を test 側へ複製しない。
 *   - **ソース契約（補助・J 群）**: 逐語再現が production と同じ形であることと、
 *     wrapping が実際に成立していることを構造で固定する。
 *
 * 実行:
 *   npx tsx --test tests/secondaryDiscardContractUnit4D3a.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, ComposeNode, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { mergeBlocks } from '../lib/buildSoap'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { rebuildNode, PRIMARY_NODE_ID } from '../lib/primaryNode'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { nextRapidStateOnScenarioChange, type RapidState } from '../lib/rapidState'
import type { PersonaId } from '../lib/applyPersona'

const src = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)

// ─────────────────────────────────────────────────────────────
// ソース領域の切り出し
// ─────────────────────────────────────────────────────────────

function sliceBetween(startMarker: string, endMarker: string): string {
  const s = src.indexOf(startMarker)
  assert.notEqual(s, -1, `開始アンカーが見つからない: ${startMarker}`)
  const e = src.indexOf(endMarker, s + startMarker.length)
  assert.ok(e > s, `終端アンカーが見つからない: ${endMarker}`)
  return src.slice(s, e)
}

/** 行コメントと行頭 * のブロックコメント行を除いたコード行だけを返す */
function codeOnly(region: string): string {
  return region
    .split('\n')
    .filter(l => {
      const t = l.trim()
      return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    })
    .map(l => l.replace(/\s+\/\/.*$/, ''))
    .join('\n')
}

/** `setter(arg => {` の updater 本体をすべて返す（値形式・引数なし callback は対象外） */
function updaterBodies(region: string, setter: string): string[] {
  const out: string[] = []
  const re = new RegExp(`${setter}\\(\\s*(\\w+)\\s*=>\\s*\\{`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(region)) !== null) {
    let depth = 0
    let i = m.index + m[0].length - 1
    const start = i
    for (; i < region.length; i++) {
      if (region[i] === '{') depth++
      else if (region[i] === '}') { depth--; if (depth === 0) break }
    }
    out.push(region.slice(start, i + 1))
  }
  return out
}

const scenarioNodeBranch = () =>
  sliceBetween('const handleSelectScenario = useCallback', '// ── primary ブランチ')
const addonHandler = () =>
  sliceBetween('const handleAddonToggle = useCallback', 'const handleSToggle = useCallback')
const addonNodeBranch = () => {
  const h = addonHandler()
  return h.slice(h.indexOf('if (nodeId !== null) {'), h.indexOf('} else {'))
}

// ─────────────────────────────────────────────────────────────
// production 逐語再現の harness
// ─────────────────────────────────────────────────────────────

/** VERBATIM: DashboardClient.tsx resolveDomain */
function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}
/** VERBATIM: DashboardClient.tsx resolveClosingText */
function resolveClosingText(sc: Scenario, defaults?: ModuleData['defaults']): string | undefined {
  if (sc.followupRef) {
    return (defaults?.followupProfiles?.[sc.followupRef] as Record<string, string> | undefined)?.P
  }
  const v = (sc.followup as Record<string, string> | undefined)?.P
  if (v === 'default') return (defaults?.followup as Record<string, string> | undefined)?.P
  return undefined
}
/** VERBATIM: DashboardClient.tsx computeDisplayFields */
function computeDisplayFields(primaryNode: ComposeNode, composeNodes: ComposeNode[]): SoapFields {
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
/** VERBATIM: DashboardClient.tsx primaryNodeProjection */
function project(p: ComposeNode, sc: Scenario | undefined, mod: ModuleData): ComposeNode {
  return {
    ...p,
    baseLabel: sc?.title ?? '',
    block: {
      ...p.block,
      templateLabel:   sc?.title ?? '',
      fields:          p.block.fields,
      closingText:     sc ? resolveClosingText(sc, mod.defaults) : undefined,
      closingBehavior: sc?.mergePolicy?.P?.closingBehavior,
      groupKey:        sc?.mergePolicy?.S?.groupKey,
      clinicalDomain:  mod.composition?.clinicalDomain,
      symptomCodes:    sc?.sComposition?.symptomCodes,
      domain:          resolveDomain(mod),
    },
  }
}

type Harness = {
  primaryNode: ComposeNode
  composeNodes: ComposeNode[]
  pendingNodeIds: Set<string>
  selectedAddonIds: Set<string>
  editedSOAP: SoapFields | null
  editingNodeId: string | null
  dialogOpen: boolean
  pendingAction: (() => void) | null
}

/** VERBATIM: confirmDiscard（DashboardClient.tsx） */
function confirmDiscard(h: Harness, action: () => void) {
  if (h.editedSOAP === null) { action() }
  else { h.pendingAction = action; h.dialogOpen = true }
}
/** VERBATIM: 破棄ダイアログ「破棄して続行」 */
function clickConfirm(h: Harness) {
  const action = h.pendingAction
  h.pendingAction = null
  h.dialogOpen = false
  h.editedSOAP = null
  action?.()
}
/** VERBATIM: 破棄ダイアログ「キャンセル」 */
function clickCancel(h: Harness) {
  h.pendingAction = null
  h.dialogOpen = false
}

// ── production の 2 経路（Unit 4D-3a 後の形）──

/** handleSelectScenario node branch */
function selectScenarioNode(h: Harness, id: string, mod: ModuleData) {
  const nodeId = h.editingNodeId
  if (nodeId === null) return
  confirmDiscard(h, () => {
    const addonIds = [...h.selectedAddonIds]
    h.pendingNodeIds = (prev => { const n = new Set(prev); n.delete(nodeId); return n })(h.pendingNodeIds)
    h.composeNodes = (prev => {
      const node = prev.find(n => n.id === nodeId)
      if (!node) return prev
      const sc = mod.scenarios.find(s => s.globalId === id)
      if (!sc) return prev
      const prevSc = mod.scenarios.find(s => s.globalId === node.scenarioId)
      const nextRapid = nextRapidStateOnScenarioChange(
        node.rapid,
        isScenarioSReplacementCapable(prevSc),
        isScenarioSReplacementCapable(sc),
      )
      const updated = rebuildNode({
        node, mod, scenario: sc, addonIds, rapid: nextRapid,
        drugName: node.resolvedDrugName ?? '', drugLabel: node.drugLabel,
        baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain',
      })
      return prev.map(n => n.id === nodeId ? updated : n)
    })(h.composeNodes)
  })
}

/** handleAddonToggle node branch */
function addonToggleNode(h: Harness, addonKey: string, mod: ModuleData) {
  const nodeId = h.editingNodeId
  if (nodeId === null) return
  confirmDiscard(h, () => {
    const next = new Set(h.selectedAddonIds)
    next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)
    const newAddonIds = [...next]
    h.selectedAddonIds = next
    h.composeNodes = (prev => {
      const node = prev.find(n => n.id === nodeId)
      if (!node) return prev
      const sc = mod.scenarios.find(s => s.globalId === node.scenarioId)
      if (!sc) return prev
      const updated = rebuildNode({
        node, mod, scenario: sc, addonIds: newAddonIds, rapid: node.rapid,
        drugName: node.resolvedDrugName ?? '', drugLabel: node.drugLabel,
        baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain',
      })
      return prev.map(n => n.id !== nodeId ? n : updated)
    })(h.composeNodes)
  })
}

// ─────────────────────────────────────────────────────────────
// fixture
// ─────────────────────────────────────────────────────────────

const P_MOD = ALL_MODULES.find(m => m.moduleId === 'dm_glp1ra_semaglutide_oral')!
const N_MOD = ALL_MODULES.find(m => m.moduleId === 'dm_dpp4_oral')!
const P_SC  = (P_MOD.scenarios ?? []).find(s => isScenarioSReplacementCapable(s))!

function addonKeysOf(mod: ModuleData, sc: Scenario): string[] {
  const r = (sc as unknown as { addonsRef?: Record<string, string[]> }).addonsRef
  return r ? Object.values(r).flat().filter(k => mod.addons?.items?.[k]) : []
}
/** ADDON を 1 件以上持つ node 用 scenario と、切替先の別 scenario */
const N_SC  = (N_MOD.scenarios ?? []).find(s => addonKeysOf(N_MOD, s).length > 0)!
const N_SC2 = (N_MOD.scenarios ?? []).find(s => s.globalId !== N_SC.globalId)!
const ADDON = addonKeysOf(N_MOD, N_SC)[0]

const EDIT: SoapFields = { S: '【手入力】患者本人より聴取。', O: 'O手入力', A: 'A手入力', P: 'P手入力' }

function mkNode(id: string, mod: ModuleData, sc: Scenario, rapid: RapidState): ComposeNode {
  const core = deriveNodeBlockCore(sc, mod, [], rapid, '本剤')
  return {
    id, moduleId: mod.moduleId, scenarioId: sc.globalId,
    block: { id: `block-${id}`, ...core, fields: core.rawFields, domain: resolveDomain(mod) },
    drugLabel: `label-${id}`, selectedAddonIds: [], baseLabel: sc.title,
    baseDomain: resolveDomain(mod), matchedBrandName: `brand-${id}`,
    resolvedDrugName: '本剤', resolution: undefined, localSiteInput: '', rapid,
  }
}

function makeHarness(editedSOAP: SoapFields | null): Harness {
  const p = mkNode(PRIMARY_NODE_ID, P_MOD, P_SC, null)
  return {
    primaryNode: { ...p, block: { ...p.block, id: 'primary-block' } },
    composeNodes: [mkNode('t', N_MOD, N_SC, null), mkNode('other', N_MOD, N_SC, null)],
    pendingNodeIds: new Set(['t']),
    selectedAddonIds: new Set<string>(),
    editedSOAP: editedSOAP === null ? null : { ...editedSOAP },
    editingNodeId: 't',
    dialogOpen: false,
    pendingAction: null,
  }
}
function finalFields(h: Harness): SoapFields {
  // localInput 非対応 module のみ使うため finalFields = editedSOAP ?? displayFields
  if (h.editedSOAP !== null) return h.editedSOAP
  return computeDisplayFields(project(h.primaryNode, P_SC, P_MOD), h.composeNodes)
}

// ═══════════════════════════════════════════════════════════════
// 1 / 5. editedSOAP === null → 即時適用（従来どおり）
// ═══════════════════════════════════════════════════════════════

describe('1. editedSOAP === null / secondary scenario → 即時適用', () => {
  test('dialog を開かず target node を更新し、final SOAP へ反映される', () => {
    const h = makeHarness(null)
    const before = h.composeNodes[0]
    const otherBefore = h.composeNodes[1]

    selectScenarioNode(h, N_SC2.globalId, N_MOD)

    assert.equal(h.dialogOpen, false, 'dialog が開いた')
    assert.equal(h.pendingAction, null)
    assert.notEqual(h.composeNodes[0], before, 'target node が更新されていない')
    assert.equal(h.composeNodes[0].scenarioId, N_SC2.globalId, 'scenario が切り替わっていない')
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target node の参照が変わった')
    assert.equal(h.pendingNodeIds.has('t'), false, 'pending が解除されていない')
    assert.equal(h.editedSOAP, null)
    assert.ok(
      finalFields(h).S.includes(h.composeNodes[0].block.fields.S.split('\n')[0]),
      '新 scenario が final SOAP へ反映されていない',
    )
  })
})

describe('5. editedSOAP === null / secondary ADDON → 即時適用', () => {
  test('dialog を開かず target node と selectedAddonIds が更新される', () => {
    const h = makeHarness(null)
    const before = h.composeNodes[0]
    const otherBefore = h.composeNodes[1]

    addonToggleNode(h, ADDON, N_MOD)

    assert.equal(h.dialogOpen, false, 'dialog が開いた')
    assert.notEqual(h.composeNodes[0], before, 'target node が更新されていない')
    assert.deepStrictEqual(h.composeNodes[0].selectedAddonIds, [ADDON])
    assert.deepStrictEqual([...h.selectedAddonIds], [ADDON], 'UI buffer が更新されていない')
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target node の参照が変わった')
    assert.equal(h.editedSOAP, null)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2 / 6. editedSOAP !== null → dialog open・content state 不変
// ═══════════════════════════════════════════════════════════════

describe('2. editedSOAP !== null / secondary scenario → action 未実行・content 不変', () => {
  test('dialog が開き、composeNodes / pendingNodeIds / editedSOAP が一切変化しない', () => {
    const h = makeHarness(EDIT)
    const nodesBefore = h.composeNodes
    const targetBefore = h.composeNodes[0]
    const otherBefore = h.composeNodes[1]
    const pendingBefore = h.pendingNodeIds
    const editedBefore = h.editedSOAP

    selectScenarioNode(h, N_SC2.globalId, N_MOD)

    assert.equal(h.dialogOpen, true, 'dialog が開いていない')
    assert.ok(h.pendingAction !== null, 'action が退避されていない')
    assert.ok(Object.is(h.composeNodes, nodesBefore), 'composeNodes 配列が置き換わった')
    assert.ok(Object.is(h.composeNodes[0], targetBefore), 'target node が変化した')
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target node が変化した')
    assert.ok(Object.is(h.pendingNodeIds, pendingBefore), 'pendingNodeIds が変化した')
    assert.ok(h.pendingNodeIds.has('t'), 'pending が解除されてしまった')
    assert.ok(Object.is(h.editedSOAP, editedBefore), 'editedSOAP が変化した')
    assert.deepStrictEqual(finalFields(h), EDIT, '表示が編集値から変わった')
  })
})

describe('6. editedSOAP !== null / secondary ADDON → dialog open・node / UI buffer 不変', () => {
  test('confirm 前は composeNodes も selectedAddonIds も変化しない', () => {
    const h = makeHarness(EDIT)
    const nodesBefore = h.composeNodes
    const targetBefore = h.composeNodes[0]
    const addonBefore = h.selectedAddonIds

    addonToggleNode(h, ADDON, N_MOD)

    assert.equal(h.dialogOpen, true, 'dialog が開いていない')
    assert.ok(Object.is(h.composeNodes, nodesBefore), 'composeNodes が変化した')
    assert.ok(Object.is(h.composeNodes[0], targetBefore), 'target node が変化した')
    assert.ok(Object.is(h.selectedAddonIds, addonBefore), 'UI buffer が変化した')
    assert.equal(h.selectedAddonIds.size, 0, 'ADDON 選択が先行適用された')
    assert.deepStrictEqual(finalFields(h), EDIT)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3 / 7. confirm
// ═══════════════════════════════════════════════════════════════

describe('3. secondary scenario / confirm', () => {
  test('editedSOAP が null 化し、target node のみ更新され final SOAP に新 scenario が出る', () => {
    const h = makeHarness(EDIT)
    const otherBefore = h.composeNodes[1]

    selectScenarioNode(h, N_SC2.globalId, N_MOD)
    clickConfirm(h)

    assert.equal(h.dialogOpen, false)
    assert.equal(h.pendingAction, null)
    assert.equal(h.editedSOAP, null, 'editedSOAP が破棄されていない')
    assert.equal(h.composeNodes[0].scenarioId, N_SC2.globalId, 'target node が更新されていない')
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target node の参照が変わった')
    assert.equal(h.pendingNodeIds.has('t'), false, 'pending が解除されていない')
    const f = finalFields(h)
    assert.notDeepStrictEqual(f, EDIT, '表示が編集値のまま')
    assert.ok(
      f.S.includes(h.composeNodes[0].block.fields.S.split('\n')[0]),
      '新 scenario が final SOAP へ反映されていない',
    )
  })
})

describe('7. secondary ADDON / confirm', () => {
  test('target node と selectedAddonIds が同期更新され、editedSOAP null・final SOAP へ反映', () => {
    const h = makeHarness(EDIT)
    const otherBefore = h.composeNodes[1]

    addonToggleNode(h, ADDON, N_MOD)
    clickConfirm(h)

    assert.equal(h.editedSOAP, null, 'editedSOAP が破棄されていない')
    assert.deepStrictEqual(h.composeNodes[0].selectedAddonIds, [ADDON], 'node 側の ADDON が未反映')
    assert.deepStrictEqual([...h.selectedAddonIds], [ADDON], 'UI buffer が未反映')
    assert.deepStrictEqual(
      h.composeNodes[0].selectedAddonIds, [...h.selectedAddonIds],
      'node と UI buffer が同期していない',
    )
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target node の参照が変わった')

    // ADDON 適用が final SOAP に現れる（適用前の block と異なる）
    const withoutAddon = deriveNodeBlockCore(N_SC, N_MOD, [], null, '本剤')
    assert.notDeepStrictEqual(
      h.composeNodes[0].block.fields, withoutAddon.rawFields,
      'ADDON が block へ反映されていない',
    )
    assert.notDeepStrictEqual(finalFields(h), EDIT, '表示が編集値のまま')
  })
})

// ═══════════════════════════════════════════════════════════════
// 4 / 8. cancel — content state mutation 0
// ═══════════════════════════════════════════════════════════════

describe('4. secondary scenario / cancel', () => {
  test('target / non-target / pendingNodeIds / selectedAddonIds / editedSOAP を全保持', () => {
    const h = makeHarness(EDIT)
    const nodesBefore = h.composeNodes
    const targetBefore = h.composeNodes[0]
    const otherBefore = h.composeNodes[1]
    const pendingBefore = h.pendingNodeIds
    const addonBefore = h.selectedAddonIds
    const editedBefore = h.editedSOAP

    selectScenarioNode(h, N_SC2.globalId, N_MOD)
    clickCancel(h)

    assert.equal(h.dialogOpen, false)
    assert.equal(h.pendingAction, null, 'pendingAction が残っている')
    assert.ok(Object.is(h.composeNodes, nodesBefore), 'composeNodes 配列が変化した')
    assert.ok(Object.is(h.composeNodes[0], targetBefore), 'target node が変化した')
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target node が変化した')
    assert.equal(h.composeNodes[0].scenarioId, N_SC.globalId, 'scenario が変わってしまった')
    assert.ok(Object.is(h.pendingNodeIds, pendingBefore), 'pendingNodeIds が変化した')
    assert.ok(h.pendingNodeIds.has('t'), 'pending が解除されてしまった')
    assert.ok(Object.is(h.selectedAddonIds, addonBefore), 'selectedAddonIds が変化した')
    assert.ok(Object.is(h.editedSOAP, editedBefore), 'editedSOAP が変化した')
    assert.deepStrictEqual(finalFields(h), EDIT, '表示が編集値から変わった')
  })
})

describe('8. secondary ADDON / cancel', () => {
  test('node / selectedAddonIds / editedSOAP を全保持', () => {
    const h = makeHarness(EDIT)
    const nodesBefore = h.composeNodes
    const targetBefore = h.composeNodes[0]
    const otherBefore = h.composeNodes[1]
    const addonBefore = h.selectedAddonIds
    const editedBefore = h.editedSOAP

    addonToggleNode(h, ADDON, N_MOD)
    clickCancel(h)

    assert.equal(h.dialogOpen, false)
    assert.equal(h.pendingAction, null)
    assert.ok(Object.is(h.composeNodes, nodesBefore), 'composeNodes が変化した')
    assert.ok(Object.is(h.composeNodes[0], targetBefore), 'target node が変化した')
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target node が変化した')
    assert.ok(Object.is(h.selectedAddonIds, addonBefore), 'UI buffer が変化した')
    assert.equal(h.selectedAddonIds.size, 0, 'ADDON が適用されてしまった')
    assert.deepStrictEqual(h.composeNodes[0].selectedAddonIds, [], 'node 側 ADDON が適用された')
    assert.ok(Object.is(h.editedSOAP, editedBefore), 'editedSOAP が変化した')
    assert.deepStrictEqual(finalFields(h), EDIT)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. purity — 4D-1 契約を confirmDiscard 導入後も維持
// ═══════════════════════════════════════════════════════════════

describe('9. confirmDiscard 導入後も updater purity が維持されている', () => {
  test('両 node branch の setter updater 本体に nested setter が 0 件', () => {
    for (const [label, region] of [
      ['handleSelectScenario node', codeOnly(scenarioNodeBranch())],
      ['handleAddonToggle node', codeOnly(addonNodeBranch())],
    ] as const) {
      const bodies = [
        ...updaterBodies(region, 'setComposeNodes'),
        ...updaterBodies(region, 'setPendingNodeIds'),
        ...updaterBodies(region, 'setSelectedAddonIds'),
      ]
      assert.ok(bodies.length > 0, `${label}: updater が 1 つも無い（アンカー破損）`)
      for (const b of bodies) {
        const nested = [...b.matchAll(/\bset[A-Z]\w*\(/g)].map(m => m[0])
        assert.deepEqual(nested, [], `${label}: updater 内に別 setter がある: ${nested.join(', ')}`)
      }
    }
  })

  test('両 node branch の setter updater 本体に *.current（ref read）が 0 件', () => {
    for (const [label, region] of [
      ['handleSelectScenario node', codeOnly(scenarioNodeBranch())],
      ['handleAddonToggle node', codeOnly(addonNodeBranch())],
    ] as const) {
      const bodies = [
        ...updaterBodies(region, 'setComposeNodes'),
        ...updaterBodies(region, 'setPendingNodeIds'),
        ...updaterBodies(region, 'setSelectedAddonIds'),
      ]
      for (const b of bodies) {
        const refs = [...b.matchAll(/\w+Ref\.current/g)].map(m => m[0])
        assert.deepEqual(refs, [], `${label}: updater 内で ref を読んでいる: ${refs.join(', ')}`)
      }
    }
  })

  test('confirmDiscard の callback は setter updater として扱われない（引数なし arrow）', () => {
    // `confirmDiscard(() => {` は `set[A-Z]…(arg => {` にマッチしないため、
    // 9 の 2 テストが confirmDiscard 本体を誤って updater と見なすことはない。
    for (const region of [codeOnly(scenarioNodeBranch()), codeOnly(addonNodeBranch())]) {
      assert.ok(/confirmDiscard\(\(\) => \{/.test(region), 'confirmDiscard の callback 形が想定と違う')
      assert.equal(updaterBodies(region, 'confirmDiscard').length, 0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. primary branch semantics が変わっていない
// ═══════════════════════════════════════════════════════════════

describe('10. primary branch semantics 不変', () => {
  test('handleSToggle の 1剤目限定 early return が維持されている', () => {
    assert.ok(src.includes('if (editingNodeIdRef.current !== null) return'))
  })

  test('primary の rebuildPrimary 呼び出しが 4 件のまま', () => {
    const c = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    assert.equal((c.match(/rebuildPrimary\(/g) ?? []).length, 4)
  })

  test('primary branch の setEditedSOAP(null) は今回変更していない（handleAddonToggle / handleSToggle）', () => {
    const h = addonHandler()
    const primaryBranch = h.slice(h.indexOf('} else {'))
    assert.ok(primaryBranch.includes('setEditedSOAP(null)'), 'primary ADDON の既存 reset が消えている')
    const st = sliceBetween('const handleSToggle = useCallback', 'const handleSubcategorySelect = useCallback')
    assert.equal((st.match(/setEditedSOAP\(null\)/g) ?? []).length, 2, 'handleSToggle の reset 数が変化した')
  })

  test('両 handler の deps 配列が変わっていない', () => {
    assert.ok(src.includes(
      '}, [activeModuleData.scenarios, buildUpdatedNode, confirmDiscard])'),
      'handleSelectScenario の deps が変化した')
    assert.ok(src.includes(
      '}, [activeModuleData, primaryNode.matchedBrandName, allModules, moduleData, personaEnabled, selectedPersona, confirmDiscard])'),
      'handleAddonToggle の deps が変化した')
  })

  test('confirmDiscard 自体の実装が変わっていない', () => {
    assert.ok(src.includes('const confirmDiscard = useCallback((action: () => void) => {'))
    assert.ok(src.includes('if (editedSOAP === null) {'))
    assert.ok(src.includes('pendingActionRef.current = action'))
    assert.ok(src.includes('}, [editedSOAP])'))
  })

  test('破棄ダイアログの reset → action 順序が変わっていない', () => {
    const dlg = src.slice(src.indexOf('className={s.discardDialogConfirm}'))
    const resetIdx = dlg.indexOf('setEditedSOAP(null)')
    const actionIdx = dlg.indexOf('action?.()')
    assert.ok(resetIdx > 0 && actionIdx > resetIdx, 'dialog の reset → action 順序が壊れている')
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. 4D-1 / 4D-2 契約の維持
// ═══════════════════════════════════════════════════════════════

describe('11. 4D-1 / 4D-2 contract の維持', () => {
  test('secondary ADDON branch が composeNodesRef を参照しない', () => {
    assert.equal(/composeNodesRef/.test(codeOnly(addonNodeBranch())), false)
  })

  test('両 node branch が pure functional updater と id addressing を使う', () => {
    const a = codeOnly(addonNodeBranch())
    assert.ok(/setComposeNodes\(prev => \{/.test(a))
    assert.ok(/prev\.find\(n => n\.id === nodeId\)/.test(a))
    assert.ok(/prev\.map\(n => n\.id !== nodeId \? n : updated\)/.test(a))
    assert.ok(/setSelectedAddonIds\(next\)/.test(a), '値形式の setSelectedAddonIds でない')

    const s = codeOnly(scenarioNodeBranch())
    assert.ok(/setComposeNodes\(prev => \{/.test(s))
    assert.ok(/prev\.find\(n => n\.id === nodeId\)/.test(s))
    assert.ok(/prev\.map\(n => n\.id === nodeId \? updated : n\)/.test(s))
  })

  test('DashboardClient に block derive の inline 実装が無く rebuildNode へ委譲している', () => {
    assert.equal((src.match(/deriveNodeBlockCore\(/g) ?? []).length, 0)
    assert.equal((src.match(/rebuildNode\(\{/g) ?? []).length, 2)
  })

  test('node index addressing が 0 件', () => {
    const c = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    for (const bad of [/composeNodes\[/, /\bnodes\[\w+\]/, /\bfindIndex\b/]) {
      assert.equal(bad.test(c), false, `index addressing がある: ${bad}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// J. source contract — wrapping の成立と harness の同型性
// ═══════════════════════════════════════════════════════════════

describe('J. 両 node branch が confirmDiscard で包まれている', () => {
  test('handleSelectScenario node branch: confirmDiscard(() => { … }) の内側に write が入る', () => {
    const r = codeOnly(scenarioNodeBranch())
    const cdIdx = r.indexOf('confirmDiscard(() => {')
    assert.ok(cdIdx >= 0, 'node branch が confirmDiscard で包まれていない')
    assert.ok(r.indexOf('setPendingNodeIds(') > cdIdx, 'setPendingNodeIds が callback の外にある')
    assert.ok(r.indexOf('setComposeNodes(') > cdIdx, 'setComposeNodes が callback の外にある')
    assert.ok(r.indexOf('const addonIds = [...selectedAddonIdsRef.current]') > cdIdx,
      'ADDON 読み出しが callback の外にある（cancel 時に読まれてしまう）')
  })

  test('handleAddonToggle node branch: toggle 計算も callback の内側にある', () => {
    const r = codeOnly(addonNodeBranch())
    const cdIdx = r.indexOf('confirmDiscard(() => {')
    assert.ok(cdIdx >= 0, 'node branch が confirmDiscard で包まれていない')
    assert.ok(r.indexOf('const next = new Set(selectedAddonIdsRef.current)') > cdIdx,
      'toggle 計算が callback の外にある（cancel 時に UI buffer が動く）')
    assert.ok(r.indexOf('setSelectedAddonIds(next)') > cdIdx, 'setSelectedAddonIds が callback の外にある')
    assert.ok(r.indexOf('setComposeNodes(') > cdIdx, 'setComposeNodes が callback の外にある')
  })

  test('新規 secondary callback 内に setEditedSOAP が無い（破棄 authority は dialog 側。D-4D3-5）', () => {
    assert.equal(/setEditedSOAP\(/.test(codeOnly(scenarioNodeBranch())), false,
      'scenario node branch に setEditedSOAP が入っている')
    assert.equal(/setEditedSOAP\(/.test(codeOnly(addonNodeBranch())), false,
      'ADDON node branch に setEditedSOAP が入っている')
  })

  test('node branch に setPrimaryNode が無い（primary 非汚染。4D-1 契約の継続）', () => {
    assert.equal(/setPrimaryNode\(/.test(codeOnly(scenarioNodeBranch())), false)
    assert.equal(/setPrimaryNode\(/.test(codeOnly(addonNodeBranch())), false)
  })

  test('harness が production と同じ式を使っている（mirror drift 防止）', () => {
    const s = codeOnly(scenarioNodeBranch())
    const a = codeOnly(addonNodeBranch())
    for (const expr of [
      'const addonIds = [...selectedAddonIdsRef.current]',
      'setPendingNodeIds(prev => { const n = new Set(prev); n.delete(nodeId); return n })',
    ]) {
      assert.ok(s.includes(expr), `scenario node branch に式が無い: ${expr}`)
    }
    for (const expr of [
      'const next = new Set(selectedAddonIdsRef.current)',
      'next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)',
      'const newAddonIds = [...next]',
      'setSelectedAddonIds(next)',
    ]) {
      assert.ok(a.includes(expr), `ADDON node branch に式が無い: ${expr}`)
    }
  })
})
