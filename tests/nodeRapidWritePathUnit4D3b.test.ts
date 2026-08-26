/**
 * nodeRapidWritePathUnit4D3b.test.ts — Rapid Mode v2 / Unit 4D-3b 契約テスト
 *
 * Unit 4D-3b の責務は「secondary node に Rapid の write path を追加すること」だった。
 * Rapid UI の解禁は Unit 4D-4 の責務であり、Unit 4D-4 完了時点で解禁済みである。
 *
 *   Unit 4D-3b 完了時点の状態（Unit 4D-4 で更新済み）:
 *     - internal node Rapid write path = 実装済み
 *     - production UI から node Rapid  = Unit 4D-4 で到達可能になった
 *     - multi-Rapid production enablement = Unit 4D-4 で UI 上の制約を追加せず解禁した（D-4D4-3）
 *
 * ## 到達可能性への移行（Group U が固定する。Unit 4D-4 successor contract）
 * editingNodeId を non-null にする production 経路は 3 つ
 * （handleComposeDrugSelect / handleSelectNode / handleExpressAdd node 分岐）のみで、
 * いずれも同一 batch で composeNodes へ node を足す、または既存 node を要求する。
 * Unit 4D-3b 時点は editingNodeId !== null ⟹ composeNodes.length > 0 ⟹
 * isSingleDrug === false ⟹ ThirdPanel の showSButtons === false であったため
 * node Rapid ボタンは常に非表示だった。Unit 4D-4 で isSingleDrug gate を撤廃し、
 * ThirdPanel へ activeScenario（= addonTargetScenario）/
 * rapidState（= (activeNode ?? primaryNode).rapid）を渡すようにしたため、
 * editingNodeId !== null の node が capable scenario を持つ場合は
 * showSButtons === true になり、node branch は production UI から到達可能になった。
 *
 * ## discard contract（4D-3a からの再利用。新規 rule は作らない）
 * editedSOAP === null → 即時実行 / !== null → confirmDiscard dialog。
 * 破棄 authority は dialog confirm 側の 1 箇所（node callback に setEditedSOAP を置かない）。
 *
 * ## テスト手法について（4D-3a と同じ方針）
 * React renderer が無いため handler を直接実行できない。したがって:
 *   - **値（主）**: confirmDiscard・dialog 2 ボタン・node rebuild を逐語再現した
 *     state-transition harness で遷移を観測する。node 再構築は production の
 *     rebuildNode を直接 import し、derive を test 側へ複製しない。
 *   - **ソース契約（補助）**: production への実際の接続（wrapping / 到達不能性）は
 *     harness では証明できないため、source contract で拘束する
 *     （4D-3a で判明した教訓: behavioral harness は目標意味論の定義であり、
 *       production connection は source contract が担う）。
 *
 * 実行:
 *   npx tsx --test tests/nodeRapidWritePathUnit4D3b.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, ComposeNode, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { mergeBlocks } from '../lib/buildSoap'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { rebuildNode, rebuildPrimary, PRIMARY_NODE_ID } from '../lib/primaryNode'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { isSameRapid, type RapidState } from '../lib/rapidState'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'

const src = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)
const thirdPanelSrc = readFileSync(
  new URL('../app/components/ThirdPanel.tsx', import.meta.url),
  'utf-8',
)

const PERSONA_IDS = Object.keys(PERSONA_LABELS) as PersonaId[]

// ─────────────────────────────────────────────────────────────
// ソース領域の切り出し
// ─────────────────────────────────────────────────────────────

function sliceBetween(text: string, startMarker: string, endMarker: string): string {
  const s = text.indexOf(startMarker)
  assert.notEqual(s, -1, `開始アンカーが見つからない: ${startMarker}`)
  const e = text.indexOf(endMarker, s + startMarker.length)
  assert.ok(e > s, `終端アンカーが見つからない: ${endMarker}`)
  return text.slice(s, e)
}

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

const handleSToggleBody = () =>
  sliceBetween(src, 'const handleSToggle = useCallback', 'const handleSubcategorySelect = useCallback')
const primaryBranch = () => {
  const h = handleSToggleBody()
  return h.slice(h.indexOf('confirmDiscard(() => {'))
}
const nodeBranch = () => {
  const h = handleSToggleBody()
  const startMarker = 'if (nodeId !== null) {'
  const s = h.indexOf(startMarker)
  assert.notEqual(s, -1, 'node branch の開始アンカーが見つからない')
  // brace matching で `if (nodeId !== null) { ... }` の対応する閉じ括弧までを切り出す
  // （node branch 自体が confirmDiscard(() => { ... }) を含むため、次の confirmDiscard
  // 文字列を終端に使う単純な indexOf では primary 側と衝突する）。
  let depth = 0
  let i = s + startMarker.length - 1   // 開始の '{'
  const braceStart = i
  for (; i < h.length; i++) {
    if (h[i] === '{') depth++
    else if (h[i] === '}') { depth--; if (depth === 0) break }
  }
  assert.ok(i < h.length, 'node branch の対応する閉じ括弧が見つからない')
  return h.slice(s, i + 1)
}

// ─────────────────────────────────────────────────────────────
// production 逐語再現の harness（4D-3a と同一方式）
// ─────────────────────────────────────────────────────────────

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}
function resolveClosingText(sc: Scenario, defaults?: ModuleData['defaults']): string | undefined {
  if (sc.followupRef) {
    return (defaults?.followupProfiles?.[sc.followupRef] as Record<string, string> | undefined)?.P
  }
  const v = (sc.followup as Record<string, string> | undefined)?.P
  if (v === 'default') return (defaults?.followup as Record<string, string> | undefined)?.P
  return undefined
}
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
  editedSOAP: SoapFields | null
  editingNodeId: string | null
  dialogOpen: boolean
  pendingAction: (() => void) | null
}

/** VERBATIM: confirmDiscard */
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

/** production の handleSToggle node branch（Unit 4D-3b 後の想定形） */
function sToggleNode(h: Harness, relation: string, condition: string, mod: ModuleData,
                      personaEnabled: boolean, persona: PersonaId) {
  const nodeId = h.editingNodeId
  if (nodeId === null) return
  confirmDiscard(h, () => {
    h.composeNodes = (prev => {
      const node = prev.find(n => n.id === nodeId)
      if (!node) return prev
      const sc = mod.scenarios.find(s => s.globalId === node.scenarioId)
      if (!sc) return prev
      const nextRapid: RapidState = isSameRapid(node.rapid, relation as never, condition as never)
        ? null
        : { previousEvent: relation as never, currentOutcome: condition as never }
      const updated = rebuildNode({
        node, mod, scenario: sc, addonIds: node.selectedAddonIds, rapid: nextRapid,
        drugName: node.resolvedDrugName ?? '', drugLabel: node.drugLabel,
        baseDomain: resolveDomain(mod), personaEnabled, persona,
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
const N_SC  = (N_MOD.scenarios ?? []).find(s => isScenarioSReplacementCapable(s))!

function addonKeysOf(mod: ModuleData, sc: Scenario): string[] {
  const r = (sc as unknown as { addonsRef?: Record<string, string[]> }).addonsRef
  return r ? Object.values(r).flat().filter(k => mod.addons?.items?.[k]) : []
}
const N_ADDON = addonKeysOf(N_MOD, N_SC)[0]

const EDIT: SoapFields = { S: '【手入力】患者本人より聴取。', O: 'O手入力', A: 'A手入力', P: 'P手入力' }
const RAPID_A: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'stable' }
const RAPID_B: RapidState = { previousEvent: 'med_changed', currentOutcome: 'not_improved' }

function mkNode(id: string, mod: ModuleData, sc: Scenario, addonIds: string[], rapid: RapidState): ComposeNode {
  const core = deriveNodeBlockCore(sc, mod, addonIds, rapid, '本剤')
  return {
    id, moduleId: mod.moduleId, scenarioId: sc.globalId,
    block: { id: `block-${id}`, ...core, fields: core.rawFields, domain: resolveDomain(mod) },
    drugLabel: `label-${id}`, selectedAddonIds: addonIds, baseLabel: sc.title,
    baseDomain: resolveDomain(mod), matchedBrandName: `brand-${id}`,
    resolvedDrugName: '本剤', resolution: undefined, localSiteInput: `site-${id}`, rapid,
  }
}

function makeHarness(editedSOAP: SoapFields | null, targetAddonIds: string[] = [], targetRapid: RapidState = null): Harness {
  const p = mkNode(PRIMARY_NODE_ID, P_MOD, P_SC, [], null)
  return {
    primaryNode: { ...p, block: { ...p.block, id: 'primary-block' } },
    composeNodes: [mkNode('t', N_MOD, N_SC, targetAddonIds, targetRapid), mkNode('other', N_MOD, N_SC, [], RAPID_B)],
    editedSOAP: editedSOAP === null ? null : { ...editedSOAP },
    editingNodeId: 't',
    dialogOpen: false,
    pendingAction: null,
  }
}
function finalFields(h: Harness): SoapFields {
  if (h.editedSOAP !== null) return h.editedSOAP
  return computeDisplayFields(project(h.primaryNode, P_SC, P_MOD), h.composeNodes)
}

// ═══════════════════════════════════════════════════════════════
// Group P — Preservation
// ═══════════════════════════════════════════════════════════════

describe('P. primary Rapid / 既存 architecture の preservation', () => {
  test('primary Rapid ON/OFF は rebuildPrimary 経由で値が現行と一致する（4D-3b で primary branch は不変）', () => {
    const drug = '本剤'
    const node = mkNode(PRIMARY_NODE_ID, P_MOD, P_SC, [], null)
    const on = rebuildPrimary({
      node, mod: P_MOD, scenario: P_SC, addonIds: [], rapid: RAPID_A, drugName: drug,
      drugLabel: 'L', baseDomain: resolveDomain(P_MOD), personaEnabled: false, persona: 'plain',
    })
    assert.deepStrictEqual(on.rapid, RAPID_A)
    const off = rebuildPrimary({
      node: on, mod: P_MOD, scenario: P_SC, addonIds: [], rapid: null, drugName: drug,
      drugLabel: 'L', baseDomain: resolveDomain(P_MOD), personaEnabled: false, persona: 'plain',
    })
    assert.equal(off.rapid, null)
    assert.deepStrictEqual(off.block.rawFields, node.block.rawFields, 'toggle-off が scenario 本来の raw へ復元しない')
  })

  test('primary branch の setEditedSOAP(null) が 2 件のまま存在する', () => {
    const p = primaryBranch()
    assert.equal((p.match(/setEditedSOAP\(null\)/g) ?? []).length, 2)
  })

  test('primary branch に rebuildPrimary 呼び出しが 2 件残っている（toggle-off / toggle-on）', () => {
    const p = codeOnly(primaryBranch())
    assert.equal((p.match(/rebuildPrimary\(/g) ?? []).length, 2)
  })

  test('primary branch の isSameRapid 判定・NLP dead path・D-4C-7/D-4C-8 が変更されていない', () => {
    const p = primaryBranch()
    assert.ok(p.includes('if (isSameRapid(primaryNodeRef.current.rapid, relation, condition)) {'))
    assert.ok(p.includes('rapidBaseFieldsRef.current'))
    assert.ok(p.includes('【D-4C-7】'))
    assert.ok(p.includes('【D-4C-8】'))
  })

  test('isSingleDrug は Unit 4D-4 で production contract から除去されている', () => {
    // isSingleDrug は live code（変数宣言・ThirdPanel への prop 渡し）としては
    // 存在しないことを確認する。historical comment 内の言及は failure 条件にしない（D-4D4-5）。
    assert.equal(src.includes('const isSingleDrug ='), false, 'isSingleDrug が live variable として残っている')
    assert.equal(src.includes('isSingleDrug={'), false, 'isSingleDrug が ThirdPanel へ prop として渡されている')
    assert.ok(src.includes('activeScenario={addonTargetScenario}'), 'activeScenario={addonTargetScenario} が渡されていない')
    assert.ok(src.includes('rapidState={(activeNode ?? primaryNode).rapid}'), 'rapidState={(activeNode ?? primaryNode).rapid} が渡されていない')
  })

  test('ThirdPanel の showSButtons は Unit 4D-4 で active context scope（isSReplacementEligible(activeScenario, { thirdPanelEnabled })）へ移行している', () => {
    assert.ok(thirdPanelSrc.includes('const FEATURE_S_BUTTONS = true'))
    assert.ok(thirdPanelSrc.includes(
      'isSReplacementEligible(activeScenario, { thirdPanelEnabled })'))
    assert.ok(/activeScenario\?:\s*Scenario/.test(thirdPanelSrc))
    assert.ok(/rapidState:\s*RapidState/.test(thirdPanelSrc))
    // props type / destructure に isSingleDrug が live field として残っていないことを確認する。
    assert.equal(/isSingleDrug\??:\s*boolean/.test(thirdPanelSrc), false, 'ThirdPanelProps に isSingleDrug field が残っている')
    assert.equal(/\bisSingleDrug\b,/.test(thirdPanelSrc), false, 'ThirdPanel の destructure に isSingleDrug が残っている')
  })

  test('DashboardClient が ThirdPanel へ activeScenario / active node の rapid を渡している', () => {
    assert.ok(src.includes('activeScenario={addonTargetScenario}'))
    assert.ok(src.includes('rapidState={(activeNode ?? primaryNode).rapid}'))
  })

  test('isSReplacementEligible は維持され、SReplacementContext は { thirdPanelEnabled } の1フィールドへ縮小している（D-4D4-2）', () => {
    const fn = readFileSync(new URL('../lib/isSReplacementEligible.ts', import.meta.url), 'utf-8')
    assert.ok(fn.includes('export function isSReplacementEligible('))
    assert.ok(fn.includes('export interface SReplacementContext {'))
    assert.ok(fn.includes('thirdPanelEnabled: boolean'))
    // interface 本体（宣言に付随する JSDoc は含めない）を live-code region として
    // 抽出し、その region に isSingleDrug field が無いことを確認する（D-4D4-5）。
    // JSDoc 内の historical reference は failure 条件にしない。
    const ifaceStart = fn.indexOf('export interface SReplacementContext {')
    const ifaceRegion = fn.slice(ifaceStart, fn.indexOf('}', ifaceStart) + 1)
    assert.equal(ifaceRegion.includes('isSingleDrug'), false, 'SReplacementContext に isSingleDrug field が残っている')
    // isSReplacementEligible 関数本体でも context.isSingleDrug を参照していないことを確認する。
    const fnStart = fn.indexOf('export function isSReplacementEligible(')
    const fnRegion = fn.slice(fnStart, fn.indexOf('\n}', fnStart) + 2)
    assert.equal(fnRegion.includes('isSingleDrug'), false, 'isSReplacementEligible が context.isSingleDrug を参照している')
  })

  test('primaryNodeProjection が存続している', () => {
    assert.ok(src.includes('const primaryNodeProjection = useMemo<ComposeNode>('))
  })

  test('4D-1 purity: 全 updater に nested setter が無い', () => {
    const stripAll = src.split('\n')
      .filter(l => { const t = l.trim(); return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .map(l => l.replace(/\s+\/\/.*$/, '')).join('\n')
    const bodies = updaterBodies(stripAll, 'set[A-Z]\\w*')
    for (const b of bodies) {
      const nested = [...b.matchAll(/\bset[A-Z]\w*\(/g)].map(m => m[0])
      assert.ok(nested.length <= 1, `updater 内に複数 setter: ${nested.join(', ')}`)
    }
  })

  test('deriveNodeBlockCore の直接呼び出しが DashboardClient に無い', () => {
    assert.equal((src.match(/deriveNodeBlockCore\(/g) ?? []).length, 0)
  })

  test('node index addressing が 0 件のまま', () => {
    const codeOnlySrc = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    for (const bad of [/composeNodes\[/, /\bnodes\[\w+\]/, /\bfindIndex\b/]) {
      assert.equal(bad.test(codeOnlySrc), false, `index addressing がある: ${bad}`)
    }
  })

  test('setPrimaryNode( = 15 / rebuildPrimary( = 4 のまま', () => {
    const codeOnlySrc = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    assert.equal((codeOnlySrc.match(/setPrimaryNode\(/g) ?? []).length, 15)
    assert.equal((codeOnlySrc.match(/rebuildPrimary\(/g) ?? []).length, 4)
  })
})

// ═══════════════════════════════════════════════════════════════
// Group M — node Rapid write path
// ═══════════════════════════════════════════════════════════════

describe('M. node Rapid write path（値。production rebuildNode を直接使用）', () => {
  test('id addressing: target node のみ更新され non-target は Object.is 保存', () => {
    const h = makeHarness(null)
    const targetBefore = h.composeNodes[0]
    const otherBefore = h.composeNodes[1]
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.notEqual(h.composeNodes[0], targetBefore)
    assert.ok(Object.is(h.composeNodes[1], otherBefore), 'non-target が変化した')
  })

  test('target 不在なら prev identity を返す', () => {
    const h = makeHarness(null)
    h.editingNodeId = 'missing'
    const before = h.composeNodes
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.ok(Object.is(h.composeNodes, before))
  })

  test('scenario 不在（pending node）なら prev identity を返す', () => {
    const h = makeHarness(null)
    h.composeNodes[0] = { ...h.composeNodes[0], scenarioId: '' }
    const before = h.composeNodes
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.ok(Object.is(h.composeNodes, before))
  })

  test('node.selectedAddonIds が rebuild の ADDON authority になる（UI buffer は使わない）', () => {
    const h = makeHarness(null, [N_ADDON])
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    const expectedCore = deriveNodeBlockCore(N_SC, N_MOD, [N_ADDON], RAPID_A, '本剤')
    assert.deepStrictEqual(h.composeNodes[0].block.rawFields, expectedCore.rawFields)
    assert.deepStrictEqual(h.composeNodes[0].selectedAddonIds, [N_ADDON], 'selectedAddonIds が保存されない')
  })

  test('lifecycle field（id/moduleId/scenarioId/matchedBrandName/resolvedDrugName/resolution/localSiteInput/drugLabel/block.id）が保存される', () => {
    const h = makeHarness(null)
    const before = h.composeNodes[0]
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    const after = h.composeNodes[0]
    assert.equal(after.id, before.id)
    assert.equal(after.moduleId, before.moduleId)
    assert.equal(after.scenarioId, before.scenarioId)
    assert.equal(after.matchedBrandName, before.matchedBrandName)
    assert.equal(after.resolvedDrugName, before.resolvedDrugName)
    assert.equal(after.resolution, before.resolution)
    assert.equal(after.localSiteInput, before.localSiteInput)
    assert.equal(after.drugLabel, before.drugLabel)
    assert.equal(after.block.id, before.block.id)
  })

  test('Rapid ON で S 先頭文が変わる', () => {
    const h = makeHarness(null)
    const beforeS = h.composeNodes[0].block.fields.S
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.notEqual(h.composeNodes[0].block.fields.S, beforeS)
    assert.deepStrictEqual(h.composeNodes[0].rapid, RAPID_A)
  })

  test('同一 Rapid を再選択すると OFF（rapid: null）になる', () => {
    const h = makeHarness(null, [], RAPID_A)
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.equal(h.composeNodes[0].rapid, null)
  })

  test('OFF → scenario 本来の block へ byte 復元する（ON→OFF 往復）', () => {
    const pristine = mkNode('t', N_MOD, N_SC, [N_ADDON], null)
    const h = makeHarness(null, [N_ADDON])
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')   // ON
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')   // OFF（同一 Rapid 再選択）
    assert.deepStrictEqual(h.composeNodes[0].block, pristine.block, 'ON→OFF 往復で block が復元しない')
  })

  test('persona OFF / plain / concise / polite / gentle のいずれでも block が persona 適用結果と一致する', () => {
    for (const personaEnabled of [false, true]) {
      for (const persona of personaEnabled ? PERSONA_IDS : (['plain'] as PersonaId[])) {
        const h = makeHarness(null)
        sToggleNode(h, 'dose_increased', 'stable', N_MOD, personaEnabled, persona)
        const core = deriveNodeBlockCore(N_SC, N_MOD, [], RAPID_A, '本剤')
        const expected = personaEnabled
          ? applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard)
          : core.rawFields
        assert.deepStrictEqual(h.composeNodes[0].block.fields, expected, `persona=${persona} enabled=${personaEnabled}`)
      }
    }
  })

  test('ADDON なし / ADDON ありの両方で正しい block になる', () => {
    const h1 = makeHarness(null, [])
    sToggleNode(h1, 'dose_increased', 'stable', N_MOD, false, 'plain')
    const core1 = deriveNodeBlockCore(N_SC, N_MOD, [], RAPID_A, '本剤')
    assert.deepStrictEqual(h1.composeNodes[0].block.rawFields, core1.rawFields)

    const h2 = makeHarness(null, [N_ADDON])
    sToggleNode(h2, 'dose_increased', 'stable', N_MOD, false, 'plain')
    const core2 = deriveNodeBlockCore(N_SC, N_MOD, [N_ADDON], RAPID_A, '本剤')
    assert.deepStrictEqual(h2.composeNodes[0].block.rawFields, core2.rawFields)
  })

  test('selectedAddonIds（UI buffer 相当）を node Rapid 操作は一切変更しない', () => {
    // harness に selectedAddonIds UI buffer 相当を持たせて不変を確認する
    const uiBuffer = new Set(['sentinel'])
    const before = uiBuffer
    const h = makeHarness(null)
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.ok(Object.is(uiBuffer, before), 'UI buffer が変化した')
    assert.deepStrictEqual([...uiBuffer], ['sentinel'])
  })

  test('pendingNodeIds を node Rapid 操作は一切変更しない', () => {
    const pendingNodeIds = new Set(['t'])
    const before = pendingNodeIds
    const h = makeHarness(null)
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.ok(Object.is(pendingNodeIds, before))
  })

  test('primaryNode は node Rapid 操作で一切変化しない', () => {
    const h = makeHarness(null)
    const before = h.primaryNode
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.ok(Object.is(h.primaryNode, before))
  })

  // ── source contract: production が上記の値契約を満たす形になっている ──
  test('production: node branch が isSameRapid(node.rapid, …) で toggle 判定する', () => {
    const n = codeOnly(nodeBranch())
    assert.ok(/isSameRapid\(node\.rapid, relation, condition\)/.test(n))
  })
  test('production: node branch が addonIds: node.selectedAddonIds を rebuildNode に渡す', () => {
    const n = codeOnly(nodeBranch())
    assert.ok(/addonIds: node\.selectedAddonIds/.test(n))
  })
  test('production: node branch が rebuildNode({ …drugName: node.resolvedDrugName ?? \'\'… }) を呼ぶ', () => {
    const n = codeOnly(nodeBranch())
    assert.ok(n.includes('rebuildNode({'))
    assert.ok(n.includes("drugName: node.resolvedDrugName ?? ''"))
    assert.ok(n.includes('drugLabel: node.drugLabel'))
  })
  test('production: node branch が prev.find / prev.map で id addressing する', () => {
    const n = codeOnly(nodeBranch())
    assert.ok(/prev\.find\(n => n\.id === nodeId\)/.test(n))
    assert.ok(/prev\.map\(n => n\.id !== nodeId \? n : updated\)/.test(n))
  })
  test('production: node branch に index addressing が無い', () => {
    const n = codeOnly(nodeBranch())
    for (const bad of [/prev\[\d+\]/, /composeNodes\[/, /\bfindIndex\b/]) {
      assert.equal(bad.test(n), false, `index addressing: ${bad}`)
    }
  })

  test('production: DashboardClient.tsx の rebuildNode({ 呼び出しが 3 件になる（buildUpdatedNode / handleAddonToggle node branch / handleSToggle node branch）', () => {
    // lib/primaryNode.ts 内の rebuildNode 呼び出し（buildPrimaryNodeSnapshot 内 1 件）は
    // DashboardClient.tsx には現れない。DashboardClient.tsx 側の呼び出し数のみを数える。
    const codeOnlySrc = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    assert.equal((codeOnlySrc.match(/rebuildNode\(\{/g) ?? []).length, 3)
  })
})

// ═══════════════════════════════════════════════════════════════
// Group D — discard（4D-3a contract の再利用）
// ═══════════════════════════════════════════════════════════════

describe('D. node Rapid の discard contract', () => {
  test('editedSOAP === null → 即時適用・dialog なし', () => {
    const h = makeHarness(null)
    const otherBefore = h.composeNodes[1]
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.equal(h.dialogOpen, false)
    assert.deepStrictEqual(h.composeNodes[0].rapid, RAPID_A)
    assert.ok(Object.is(h.composeNodes[1], otherBefore))
    assert.equal(h.editedSOAP, null)
  })

  test('editedSOAP !== null → dialog open・content state 不変', () => {
    const h = makeHarness(EDIT)
    const nodesBefore = h.composeNodes
    const targetBefore = h.composeNodes[0]
    const editedBefore = h.editedSOAP
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    assert.equal(h.dialogOpen, true)
    assert.ok(h.pendingAction !== null)
    assert.ok(Object.is(h.composeNodes, nodesBefore))
    assert.ok(Object.is(h.composeNodes[0], targetBefore))
    assert.ok(Object.is(h.editedSOAP, editedBefore))
    assert.deepStrictEqual(finalFields(h), EDIT)
  })

  test('confirm → editedSOAP null 化 + node Rapid 適用 + final SOAP へ反映', () => {
    const h = makeHarness(EDIT)
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    clickConfirm(h)
    assert.equal(h.editedSOAP, null)
    assert.deepStrictEqual(h.composeNodes[0].rapid, RAPID_A)
    assert.notDeepStrictEqual(finalFields(h), EDIT)
  })

  test('cancel → target / non-target / editedSOAP を含む content state mutation 0', () => {
    const h = makeHarness(EDIT)
    const nodesBefore = h.composeNodes
    const targetBefore = h.composeNodes[0]
    const otherBefore = h.composeNodes[1]
    const editedBefore = h.editedSOAP
    sToggleNode(h, 'dose_increased', 'stable', N_MOD, false, 'plain')
    clickCancel(h)
    assert.equal(h.dialogOpen, false)
    assert.equal(h.pendingAction, null)
    assert.ok(Object.is(h.composeNodes, nodesBefore))
    assert.ok(Object.is(h.composeNodes[0], targetBefore))
    assert.ok(Object.is(h.composeNodes[1], otherBefore))
    assert.equal(h.composeNodes[0].rapid, null, 'rapid が変わってしまった')
    assert.ok(Object.is(h.editedSOAP, editedBefore))
    assert.deepStrictEqual(finalFields(h), EDIT)
  })

  test('production: node branch が confirmDiscard で包まれ、callback 内に setEditedSOAP が無い', () => {
    const n = codeOnly(nodeBranch())
    assert.ok(n.includes('confirmDiscard(() => {'))
    assert.equal(/setEditedSOAP\(/.test(n), false, '破棄 authority は dialog 側のみ（D-4D3-5 と同じ規則）')
  })

  test('production: node branch が setPrimaryNode / setSelectedAddonIds / setPendingNodeIds を呼ばない', () => {
    const n = codeOnly(nodeBranch())
    for (const forbidden of ['setPrimaryNode(', 'setSelectedAddonIds(', 'setPendingNodeIds(']) {
      assert.equal(n.includes(forbidden), false, `node branch に ${forbidden} が混入している`)
    }
  })

  test('production: node branch の setComposeNodes updater に nested setter / ref read が無い', () => {
    const n = codeOnly(nodeBranch())
    const bodies = updaterBodies(n, 'setComposeNodes')
    assert.ok(bodies.length > 0, 'updater が見つからない')
    for (const b of bodies) {
      const nested = [...b.matchAll(/\bset[A-Z]\w*\(/g)].map(m => m[0])
      const refs = [...b.matchAll(/\w+Ref\.current/g)].map(m => m[0])
      assert.deepEqual(nested, [], `nested setter: ${nested.join(', ')}`)
      assert.deepEqual(refs, [], `ref read: ${refs.join(', ')}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Group U — UI still locked
// ═══════════════════════════════════════════════════════════════

describe('U. Rapid UI はまだ解禁されていない', () => {
  test('node branch が production source に存在する', () => {
    const h = handleSToggleBody()
    assert.ok(/if \(nodeId !== null\) \{/.test(h), 'node branch が存在しない（4D-3b 未実装）')
  })

  test('editingNodeId を non-null にする production 経路は、同一 batch で composeNodes へ node を足すか既存 node を要求する', () => {
    // handleComposeDrugSelect: setComposeNodes(prev => [...prev, newNode]) の後に setEditingNodeId(nodeId)
    const hc = sliceBetween(src, 'const handleComposeDrugSelect = useCallback', 'const handleSelectNode = useCallback')
    assert.ok(hc.indexOf('setComposeNodes(prev => [...prev, newNode])') < hc.indexOf('setEditingNodeId(nodeId)'))

    // handleSelectNode: const node = nodes.find(...); if (!node) return してから setEditingNodeId(nodeId)
    const hn = sliceBetween(src, 'const handleSelectNode = useCallback', 'const handleRemoveComposeNode = useCallback')
    assert.ok(hn.includes('const node = nodes.find(n => n.id === nodeId)'))
    assert.ok(hn.indexOf('if (!node) return') < hn.lastIndexOf('setEditingNodeId(nodeId)'))

    // handleExpressAdd node 分岐: setComposeNodes(prev => { ... }) の後に setEditingNodeId(nodeId)
    const he = sliceBetween(src, 'const handleExpressAdd = useCallback', 'const handleSwitchToNlp = useCallback')
    const nodeBranchIdx = he.lastIndexOf('setEditingNodeId(nodeId)')
    const composeSetIdx = he.lastIndexOf('setComposeNodes(prev => {', nodeBranchIdx)
    assert.ok(composeSetIdx > 0 && composeSetIdx < nodeBranchIdx)
  })

  test('isSingleDrug は Unit 4D-4 で除去され、editingNodeId !== null でも showSButtons を false 固定しない', () => {
    // isSingleDrug は live code（変数宣言・ThirdPanel への prop 渡し）としては
    // 存在しないことを確認する。historical comment 内の言及は failure 条件にしない（D-4D4-5）。
    assert.equal(src.includes('const isSingleDrug ='), false, 'isSingleDrug が live variable として残っている')
    assert.equal(src.includes('isSingleDrug={'), false, 'isSingleDrug が ThirdPanel へ prop として渡されている')
  })

  test('ThirdPanel の showSButtons は activeScenario / thirdPanelEnabled 経由（editingNodeId を直接は見ない）', () => {
    const region = sliceBetween(thirdPanelSrc, 'const showSButtons =', 'const expressByCat')
    assert.ok(region.includes('isSReplacementEligible(activeScenario, { thirdPanelEnabled })'))
    assert.equal(/editingNodeId/.test(region), false, 'showSButtons が editingNodeId に依存している')
  })

  test('multi-node Rapid は同一 handleSToggle 経由で UI 上制限なく enablement されている（onNodeSAction 等の専用ハンドラは追加しない。D-4D4-3）', () => {
    // Rapid UI ボタン（onSAction）は handleSToggle 1 本のみに接続されている
    // （node ごとの分岐は handleSToggle 内部の editingNodeId 判定が担い、
    //   ThirdPanel 側に node 専用ハンドラを追加しない）
    const count = (src.match(/onSAction=\{handleSToggle\}/g) ?? []).length
    assert.equal(count, 1)
    // ThirdPanel には node 用の Rapid ボタンやハンドラは存在しない
    assert.equal(/onNodeSAction/.test(thirdPanelSrc), false)
  })
})
