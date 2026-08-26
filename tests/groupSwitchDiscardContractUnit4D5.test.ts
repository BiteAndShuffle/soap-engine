/**
 * groupSwitchDiscardContractUnit4D5.test.ts — Rapid Mode v2 / Unit 4D-5 契約テスト
 *
 * Owner Decision D-4D5-1 / OD-4D5-A に基づき、handleSelectGroup による
 * primary context の破棄を Unit 4D-3a / D-4D3-OD1 の discard contract へ統一する。
 *
 * ## 修正前の defect（D-NEW-1）
 * handleSelectGroup は confirmDiscard を経由せず primary context を破棄していた。
 * scenarioId が '' になると deps [primaryNode.scenarioId] の scenario rebuild effect が
 * 発火し、その `} else if (selectedScenarioId === null) {` 分岐が setEditedSOAP(null) を
 * 実行する。結果として **ユーザーの手動編集が確認ダイアログなしに無言で消去される**。
 * stale 表示ではなく silent data loss である。
 *
 * ## 統一される契約（D-4D5-1）
 *   editedSOAP === null → 従来どおり即時実行（state transition は修正前と同一）
 *   editedSOAP !== null → confirmDiscard dialog を開く。**UI / content state は一切変化しない**
 *     confirm → dialog 側が editedSOAP を破棄 → action 実行（結果は修正前と同一）
 *     cancel  → selectedGroup / primaryNode / selectedAddonIds / editedSOAP をすべて保持
 *
 * **selectedGroup も apply の内側へ移す。** 修正前は confirmDiscard の外で先に実行され
 * ていたため、cancel してもグループだけが切り替わっていた（D-4D5-1 が禁じる状態）。
 *
 * ## OD-4D5-A（D-4D5-1 の厳密化・例外ではない）
 *   const needsConfirm = clearsPrimary && primaryNodeRef.current.scenarioId !== ''
 *
 * primaryNode.scenarioId === '' のときは scenarioId が '' → '' のままで effect の deps が
 * 変化せず、editedSOAP は破棄されない。ここまで confirmDiscard を通すと dialog confirm 側の
 * setEditedSOAP(null) が **修正前は保持されていた手動編集を新たに失わせる**ため、
 * discard contract は「primary context を実際に破棄するとき」に限って適用する。
 * 判定式は「scenario rebuild effect の解除分岐が走るか」と同値である。
 *
 * ## editedSOAP の破棄 authority（D-4D3-5・本 Unit でも不変）
 * 破棄は dialog confirm 側の 1 箇所が担う。handleSelectGroup の callback へ
 * setEditedSOAP(null) を追加しない。callback は editedSOAP !== null の状態では
 * 実行されないため、callback 内 reset は値を変えない。
 *
 * ## テスト手法について（secondaryDiscardContractUnit4D3a.test.ts と同じ方針）
 * React renderer が無いため handler を直接実行できない。したがって:
 *   - **値（V 群）**: confirmDiscard・dialog 2 ボタン・scenario rebuild effect の解除分岐を
 *     逐語再現した state-transition harness で遷移を観測する。
 *   - **ソース契約（S 群）**: 逐語再現が production と同じ形であることを構造で固定する。
 *
 * **V 群は harness 自身を検査するため実装前から GREEN である。** production を束縛して
 * いるのは S 群であり、実装前に RED になるのは S-1 / S-2 / S-3 / S-4 の 4 件のみである。
 * 「V 群が GREEN だから実装済み」と読んではならない。
 *
 * Scope: 本 Unit は handleSelectGroup の discard contract のみを扱う。
 *   confirmDiscard 本体 / 破棄ダイアログ / Unit 4D-4 の Rapid UI node scope /
 *   lib/buildSoap.ts / Decision Grouping Fallback Safety には触れない。
 *
 * 実行:
 *   npx tsx --test tests/groupSwitchDiscardContractUnit4D5.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, ComposeNode, SoapFields } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { PRIMARY_NODE_ID } from '../lib/primaryNode'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import type { RapidState } from '../lib/rapidState'
import type { MenuGroup } from '../lib/menuGroups'

const src = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)

// ─────────────────────────────────────────────────────────────
// ソース領域の切り出し（secondaryDiscardContractUnit4D3a と同一実装）
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

/**
 * `marker`（末尾が `(` の呼び出しマーカー）から括弧が閉じるまでを丸ごと返す。
 * tests/primaryNodeWritableUnit4C.test.ts の extractBalancedCalls と同じ実装。
 *
 * 本 Unit の setPrimaryNode updater は `prev => ({ ... })`（object 式を返す簡潔形）で
 * あり `prev => {` ではないため、ブレース対応の抽出では本体を取り逃がす。
 * 括弧対応で call 全体を取ってから `=>` 以降を見る。
 */
function extractBalancedCalls(region: string, marker: string): string[] {
  const out: string[] = []
  let i = 0
  while ((i = region.indexOf(marker, i)) >= 0) {
    let depth = 0
    let k = i + marker.length - 1
    for (; k < region.length; k++) {
      const c = region[k]
      if (c === '(') depth++
      else if (c === ')') { depth--; if (depth === 0) { k++; break } }
    }
    out.push(region.slice(i, k))
    i = k
  }
  return out
}

/** setter 呼び出しの updater 本体（`=>` の右側）をすべて返す */
function updaterBodies(region: string, setter: string): string[] {
  return extractBalancedCalls(region, `${setter}(`)
    .map(call => {
      const arrow = call.indexOf('=>')
      return arrow < 0 ? '' : call.slice(arrow + 2)
    })
    .filter(b => b !== '')
}

const groupHandler = () =>
  sliceBetween('const handleSelectGroup = useCallback', 'const buildUpdatedNode = useCallback')

/** scenario rebuild effect（deps [primaryNode.scenarioId]）の本体 */
const rebuildEffect = () =>
  sliceBetween('// 1剤目シナリオ切替時に primaryBaseFields を初期化', '\n  }, [primaryNode.scenarioId])')

// ─────────────────────────────────────────────────────────────
// production 逐語再現の harness
// ─────────────────────────────────────────────────────────────

/** VERBATIM: DashboardClient.tsx EMPTY_FIELDS */
const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

/** VERBATIM: DashboardClient.tsx resolveDomain */
function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}

type Harness = {
  selectedGroup: MenuGroup | null
  primaryNode: ComposeNode
  composeNodes: ComposeNode[]
  selectedAddonIds: Set<string>
  editedSOAP: SoapFields | null
  editingNodeId: string | null
  editingPrimary: boolean
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

/**
 * VERBATIM: scenario rebuild effect（deps [primaryNode.scenarioId]）の
 * `} else if (selectedScenarioId === null) {` 分岐。
 *
 * 本 harness が到達しうるのはこの解除分岐だけである（グループ切替は scenarioId を
 * '' にする操作しか行わない）。effect は deps が変化したときにのみ走るため、
 * scenarioId が '' → '' のままなら何も起きない ── これが OD-4D5-A の根拠である。
 * 早期 return（editingNodeId !== null）も逐語再現する。
 */
function runRebuildEffect(h: Harness, prevScenarioId: string) {
  if (h.primaryNode.scenarioId === prevScenarioId) return   // deps 不変 → effect は走らない
  if (h.editingNodeId !== null) return                      // effect 冒頭の early return
  const selectedScenarioId = h.primaryNode.scenarioId === '' ? null : h.primaryNode.scenarioId
  if (selectedScenarioId === null) {
    h.primaryNode = {
      ...h.primaryNode,
      block: { ...h.primaryNode.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
    }
    h.editedSOAP = null                                     // silent discard の実体
  }
}

/** handleSelectGroup（Unit 4D-5 後の形） */
function selectGroup(h: Harness, group: MenuGroup) {
  const clearsPrimary = h.editingNodeId === null && !h.editingPrimary
  const needsConfirm = clearsPrimary && h.primaryNode.scenarioId !== ''
  const apply = () => {
    const prevScenarioId = h.primaryNode.scenarioId
    h.selectedGroup = group
    if (!clearsPrimary) return
    h.primaryNode = (prev => ({
      ...prev, scenarioId: '', selectedAddonIds: [], rapid: null,
      block: { ...prev.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
    }))(h.primaryNode)
    h.selectedAddonIds = new Set()
    runRebuildEffect(h, prevScenarioId)
  }
  if (!needsConfirm) { apply(); return }
  confirmDiscard(h, apply)
}

/** handleSelectGroup（Unit 4D-5 **前**の形。修正前後の同値性比較にのみ使う） */
function selectGroupLegacy(h: Harness, group: MenuGroup) {
  const prevScenarioId = h.primaryNode.scenarioId
  h.selectedGroup = group
  if (h.editingNodeId === null && !h.editingPrimary) {
    h.primaryNode = (prev => ({
      ...prev, scenarioId: '', selectedAddonIds: [], rapid: null,
      block: { ...prev.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
    }))(h.primaryNode)
    h.selectedAddonIds = new Set()
  }
  runRebuildEffect(h, prevScenarioId)
}

// ─────────────────────────────────────────────────────────────
// fixture
// ─────────────────────────────────────────────────────────────

const P_MOD = ALL_MODULES.find(m => m.moduleId === 'dm_glp1ra_semaglutide_oral')!
const N_MOD = ALL_MODULES.find(m => m.moduleId === 'dm_dpp4_oral')!
const P_SC  = (P_MOD.scenarios ?? []).find(s => isScenarioSReplacementCapable(s))!
const N_SC  = (N_MOD.scenarios ?? [])[0]!

const EDIT: SoapFields = { S: '【手入力】患者本人より聴取。', O: 'O手入力', A: 'A手入力', P: 'P手入力' }
const FROM_GROUP: MenuGroup = '初回'
const TO_GROUP:   MenuGroup = '副作用なし'

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

type Opts = {
  editedSOAP?: SoapFields | null
  primaryScenario?: boolean          // false = primary 未確定（scenarioId === ''）
  editingNodeId?: string | null
  editingPrimary?: boolean
  withNodes?: boolean
  primaryRapid?: RapidState
  primaryAddonIds?: string[]
  localSiteInput?: string
}

function makeHarness(o: Opts = {}): Harness {
  const rapid = o.primaryRapid ?? null
  const base = mkNode(PRIMARY_NODE_ID, P_MOD, P_SC, rapid)
  const primaryNode: ComposeNode = {
    ...base,
    block: { ...base.block, id: 'primary-block' },
    scenarioId: (o.primaryScenario ?? true) ? P_SC.globalId : '',
    selectedAddonIds: o.primaryAddonIds ?? [],
    localSiteInput: o.localSiteInput ?? '',
  }
  return {
    selectedGroup: FROM_GROUP,
    primaryNode,
    composeNodes: (o.withNodes ?? false) ? [mkNode('n1', N_MOD, N_SC, null)] : [],
    selectedAddonIds: new Set(o.primaryAddonIds ?? []),
    editedSOAP: o.editedSOAP === undefined ? null : (o.editedSOAP === null ? null : { ...o.editedSOAP }),
    editingNodeId: o.editingNodeId ?? null,
    editingPrimary: o.editingPrimary ?? false,
    dialogOpen: false,
    pendingAction: null,
  }
}

/** 観測可能な UI / content state のスナップショット（dialog flag を除く） */
function snapshot(h: Harness): string {
  return JSON.stringify({
    selectedGroup: h.selectedGroup,
    scenarioId: h.primaryNode.scenarioId,
    primarySelectedAddonIds: h.primaryNode.selectedAddonIds,
    rapid: h.primaryNode.rapid,
    fields: h.primaryNode.block.fields,
    rawFields: h.primaryNode.block.rawFields,
    guard: h.primaryNode.block.guard ?? null,
    localSiteInput: h.primaryNode.localSiteInput ?? '',
    selectedAddonIds: [...h.selectedAddonIds],
    editedSOAP: h.editedSOAP,
    composeNodes: h.composeNodes.map(n => ({ id: n.id, scenarioId: n.scenarioId, fields: n.block.fields, rapid: n.rapid })),
    editingNodeId: h.editingNodeId,
    editingPrimary: h.editingPrimary,
  })
}

// ═══════════════════════════════════════════════════════════════
// V 群（値 / harness）— 実装前から GREEN。regression 検出器ではない
// ═══════════════════════════════════════════════════════════════

describe('V-1: editedSOAP === null × primary scenario 確定済 → dialog なし・即時切替', () => {
  test('dialog は開かず、group が切替わり primary context が clear される', () => {
    const h = makeHarness({ editedSOAP: null })
    selectGroup(h, TO_GROUP)
    assert.equal(h.dialogOpen, false, 'dialog が開いた')
    assert.equal(h.pendingAction, null)
    assert.equal(h.selectedGroup, TO_GROUP)
    assert.equal(h.primaryNode.scenarioId, '')
    assert.deepEqual(h.primaryNode.selectedAddonIds, [])
    assert.equal(h.primaryNode.rapid, null)
    assert.deepEqual(h.primaryNode.block.fields, EMPTY_FIELDS)
    assert.deepEqual(h.primaryNode.block.rawFields, EMPTY_FIELDS)
    assert.equal(h.primaryNode.block.guard, undefined)
    assert.equal(h.selectedAddonIds.size, 0)
    assert.equal(h.editedSOAP, null)
  })

  test('修正前 handler と state transition が完全に同一である（byte preservation）', () => {
    const a = makeHarness({ editedSOAP: null, primaryRapid: { previousEvent: 'new_addition', currentOutcome: 'stable' }, primaryAddonIds: [], localSiteInput: '' })
    const b = makeHarness({ editedSOAP: null, primaryRapid: { previousEvent: 'new_addition', currentOutcome: 'stable' }, primaryAddonIds: [], localSiteInput: '' })
    selectGroupLegacy(a, TO_GROUP)
    selectGroup(b, TO_GROUP)
    assert.equal(snapshot(b), snapshot(a), 'editedSOAP === null 経路で修正前後の状態が一致しない')
  })
})

describe('V-2: editedSOAP !== null × primary scenario 確定済 → dialog open・state mutation 0', () => {
  test('dialog が開き、UI / content state が 1 つも変化しない', () => {
    const h = makeHarness({ editedSOAP: EDIT, primaryRapid: { previousEvent: 'dose_increased', currentOutcome: 'improved' } })
    const before = snapshot(h)
    const editedBefore = h.editedSOAP
    selectGroup(h, TO_GROUP)
    assert.equal(h.dialogOpen, true, 'dialog が開いていない（discard contract を通していない）')
    assert.notEqual(h.pendingAction, null, 'pendingAction が保存されていない')
    assert.equal(snapshot(h), before, 'dialog 表示時点で state が変化した')
    assert.equal(h.selectedGroup, FROM_GROUP, 'selectedGroup が dialog より先に切り替わった（D-4D5-1 違反）')
    assert.ok(Object.is(h.editedSOAP, editedBefore), 'editedSOAP の参照が変化した')
  })
})

describe('V-3: V-2 → confirm', () => {
  test('editedSOAP が破棄され、group 切替と primary context clear が適用される', () => {
    const h = makeHarness({ editedSOAP: EDIT })
    selectGroup(h, TO_GROUP)
    clickConfirm(h)
    assert.equal(h.dialogOpen, false)
    assert.equal(h.pendingAction, null)
    assert.equal(h.editedSOAP, null, 'editedSOAP が破棄されていない')
    assert.equal(h.selectedGroup, TO_GROUP, 'group が target へ切り替わっていない')
    assert.equal(h.primaryNode.scenarioId, '')
    assert.deepEqual(h.primaryNode.block.fields, EMPTY_FIELDS)
    assert.equal(h.primaryNode.rapid, null)
    assert.equal(h.selectedAddonIds.size, 0)
  })

  test('confirm 後の状態が修正前 handler の結果と一致する（semantics 保存）', () => {
    const legacy = makeHarness({ editedSOAP: EDIT })
    selectGroupLegacy(legacy, TO_GROUP)
    const fixed = makeHarness({ editedSOAP: EDIT })
    selectGroup(fixed, TO_GROUP)
    clickConfirm(fixed)
    assert.equal(snapshot(fixed), snapshot(legacy), 'confirm の結果が修正前と異なる')
  })
})

describe('V-4: V-2 → cancel', () => {
  test('selectedGroup を含め content / UI state の mutation が 0 件', () => {
    const h = makeHarness({ editedSOAP: EDIT, primaryRapid: { previousEvent: 'med_changed', currentOutcome: 'unchanged' }, withNodes: true })
    const before = snapshot(h)
    const editedBefore = h.editedSOAP
    selectGroup(h, TO_GROUP)
    clickCancel(h)
    assert.equal(h.dialogOpen, false)
    assert.equal(h.pendingAction, null)
    assert.equal(snapshot(h), before, 'cancel 後に state が変化している')
    assert.equal(h.selectedGroup, FROM_GROUP, 'cancel したのに selectedGroup が変化した（D-4D5-1 違反）')
    assert.ok(Object.is(h.editedSOAP, editedBefore), 'cancel で editedSOAP が失われた')
  })
})

describe('V-5: OD-4D5-A — primaryNode.scenarioId === \'\' では confirmDiscard を通さない', () => {
  test('editedSOAP !== null でも dialog は開かず、editedSOAP は保持される', () => {
    const h = makeHarness({ editedSOAP: EDIT, primaryScenario: false, withNodes: true })
    const editedBefore = h.editedSOAP
    selectGroup(h, TO_GROUP)
    assert.equal(h.dialogOpen, false, 'primary 未確定なのに dialog が開いた（OD-4D5-A 違反・新たな損失経路）')
    assert.equal(h.selectedGroup, TO_GROUP, 'group が切り替わっていない')
    assert.ok(Object.is(h.editedSOAP, editedBefore), 'editedSOAP が失われた（修正前は保持されていた）')
  })

  test('修正前 handler と state transition が完全に同一である', () => {
    const a = makeHarness({ editedSOAP: EDIT, primaryScenario: false, withNodes: true })
    const b = makeHarness({ editedSOAP: EDIT, primaryScenario: false, withNodes: true })
    selectGroupLegacy(a, TO_GROUP)
    selectGroup(b, TO_GROUP)
    assert.equal(snapshot(b), snapshot(a), 'primary 未確定経路で修正前後の状態が一致しない')
  })

  test('scenarioId が \'\' → \'\' のとき scenario rebuild effect は走らない（判定式の根拠）', () => {
    const h = makeHarness({ editedSOAP: EDIT, primaryScenario: false, withNodes: true })
    selectGroup(h, TO_GROUP)
    assert.notEqual(h.editedSOAP, null, 'effect が走って editedSOAP が破棄された')
  })
})

describe('V-6: editingNodeId !== null → dialog なし・selectedGroup のみ変化', () => {
  test('editedSOAP があっても dialog は開かず、primary / node は不変', () => {
    const h = makeHarness({ editedSOAP: EDIT, editingNodeId: 'n1', withNodes: true })
    const beforeNodes = JSON.stringify(h.composeNodes)
    const beforePrimary = JSON.stringify(h.primaryNode)
    const editedBefore = h.editedSOAP
    selectGroup(h, TO_GROUP)
    assert.equal(h.dialogOpen, false, 'node 編集中なのに dialog が開いた')
    assert.equal(h.selectedGroup, TO_GROUP, 'node 編集中でも selectedGroup は切り替わるべき')
    assert.equal(JSON.stringify(h.primaryNode), beforePrimary, 'node 編集中に primary が変化した')
    assert.equal(JSON.stringify(h.composeNodes), beforeNodes, 'composeNodes が変化した')
    assert.ok(Object.is(h.editedSOAP, editedBefore), 'editedSOAP が失われた')
  })

  test('修正前 handler と state transition が完全に同一である', () => {
    const a = makeHarness({ editedSOAP: EDIT, editingNodeId: 'n1', withNodes: true })
    const b = makeHarness({ editedSOAP: EDIT, editingNodeId: 'n1', withNodes: true })
    selectGroupLegacy(a, TO_GROUP)
    selectGroup(b, TO_GROUP)
    assert.equal(snapshot(b), snapshot(a))
  })
})

describe('V-7: editingPrimary === true → dialog なし・selectedGroup のみ変化', () => {
  test('editedSOAP があっても dialog は開かず、primary context は保持される', () => {
    const h = makeHarness({ editedSOAP: EDIT, editingPrimary: true })
    const beforePrimary = JSON.stringify(h.primaryNode)
    const editedBefore = h.editedSOAP
    selectGroup(h, TO_GROUP)
    assert.equal(h.dialogOpen, false, 'editingPrimary 中なのに dialog が開いた')
    assert.equal(h.selectedGroup, TO_GROUP)
    assert.equal(JSON.stringify(h.primaryNode), beforePrimary, 'editingPrimary 中に primary が変化した')
    assert.ok(Object.is(h.editedSOAP, editedBefore))
  })

  test('修正前 handler と state transition が完全に同一である', () => {
    const a = makeHarness({ editedSOAP: EDIT, editingPrimary: true })
    const b = makeHarness({ editedSOAP: EDIT, editingPrimary: true })
    selectGroupLegacy(a, TO_GROUP)
    selectGroup(b, TO_GROUP)
    assert.equal(snapshot(b), snapshot(a))
  })
})

describe('V-8: secondary node が存在しても node / non-target が壊れない', () => {
  test('confirm 後も composeNodes は byte 保存される（primary context clear のみ）', () => {
    const h = makeHarness({ editedSOAP: EDIT, withNodes: true })
    const beforeNodes = JSON.stringify(h.composeNodes)
    selectGroup(h, TO_GROUP)
    clickConfirm(h)
    assert.equal(JSON.stringify(h.composeNodes), beforeNodes, 'group 切替が composeNodes を壊した')
    assert.equal(h.primaryNode.scenarioId, '')
  })

  test('pending node（scenarioId === \'\'）を編集中でも V-6 と同じ挙動', () => {
    const h = makeHarness({ editedSOAP: EDIT, editingNodeId: 'pending', withNodes: true })
    const before = snapshot(h)
    selectGroup(h, TO_GROUP)
    assert.equal(h.dialogOpen, false)
    assert.equal(h.selectedGroup, TO_GROUP)
    assert.equal(snapshot({ ...h, selectedGroup: FROM_GROUP }), before, 'selectedGroup 以外が変化した')
  })
})

describe('V-9: primary Rapid / ADDON / localSiteInput の clear semantics が現行のまま', () => {
  test('confirm 後 rapid は null・selectedAddonIds は空・localSiteInput は保持される', () => {
    const addonIds = Object.keys(P_MOD.addons?.items ?? {}).slice(0, 1)
    const h = makeHarness({
      editedSOAP: EDIT,
      primaryRapid: { previousEvent: 'continued_do', currentOutcome: 'stable' },
      primaryAddonIds: addonIds,
      localSiteInput: '右上腕',
    })
    assert.ok(addonIds.length > 0, 'fixture: primary module に addon が 1 件も無い')
    selectGroup(h, TO_GROUP)
    clickConfirm(h)
    assert.equal(h.primaryNode.rapid, null, 'rapid が null になっていない')
    assert.deepEqual(h.primaryNode.selectedAddonIds, [], 'primaryNode.selectedAddonIds が空でない')
    assert.equal(h.selectedAddonIds.size, 0, 'UI buffer が空でない')
    assert.equal(h.primaryNode.localSiteInput, '右上腕', 'localSiteInput は clear されない現行 semantics が変わった')
  })
})

// ═══════════════════════════════════════════════════════════════
// S 群（source contract）— production への束縛
// S-1 / S-2 / S-3 / S-4 が実装前 RED になる実効ガードである
// ═══════════════════════════════════════════════════════════════

describe('S 群: handleSelectGroup が discard contract を通している（production source）', () => {
  test('S-1: handleSelectGroup が confirmDiscard を呼ぶ', () => {
    assert.ok(
      /confirmDiscard\(/.test(codeOnly(groupHandler())),
      'handleSelectGroup が confirmDiscard を経由していない（D-4D5-1）',
    )
  })

  test('S-2: dependency 配列が [confirmDiscard]', () => {
    assert.ok(
      /\}, \[confirmDiscard\]\)/.test(groupHandler()),
      'handleSelectGroup の deps が [confirmDiscard] でない',
    )
  })

  test('S-3: setSelectedGroup(group) が apply の内側にある（cancel 時に不変）', () => {
    const region = codeOnly(groupHandler())
    const applyIdx = region.indexOf('const apply = () => {')
    assert.ok(applyIdx >= 0, 'apply の宣言が見つからない')
    const setIdx = region.indexOf('setSelectedGroup(group)', applyIdx)
    assert.ok(setIdx > applyIdx, 'setSelectedGroup(group) が apply の外で実行されている（D-4D5-1 違反）')
    assert.equal(
      (region.match(/setSelectedGroup\(/g) ?? []).length, 1,
      'setSelectedGroup の呼び出しが 1 箇所でない（apply 外の残存を疑う）',
    )
  })

  test('S-4: OD-4D5-A — needsConfirm が primaryNodeRef.current.scenarioId を判定する', () => {
    assert.ok(
      /primaryNodeRef\.current\.scenarioId !== ''/.test(codeOnly(groupHandler())),
      "OD-4D5-A の判定式（primaryNodeRef.current.scenarioId !== ''）が存在しない",
    )
  })

  test('S-5: callback 内に setEditedSOAP が無い（D-4D3-5）', () => {
    assert.ok(
      !/setEditedSOAP\(/.test(codeOnly(groupHandler())),
      'handleSelectGroup に setEditedSOAP が追加されている（破棄 authority は dialog 側）',
    )
  })

  test('S-6: clearsPrimary の判定が editingNodeIdRef / editingPrimaryRef のままである', () => {
    assert.ok(
      /editingNodeIdRef\.current === null && !editingPrimaryRef\.current/.test(codeOnly(groupHandler())),
      'primary context 破棄の分岐条件が変化した',
    )
  })

  test('S-7: 解除 reducer が明示 literal（selectedAddonIds: [] / rapid: null）のまま', () => {
    assert.ok(
      /selectedAddonIds: \[\], rapid: null,/.test(groupHandler()),
      '解除 reducer の明示 literal が失われた',
    )
    assert.ok(
      /block: \{ \.\.\.prev\.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined \},/.test(groupHandler()),
      '解除 reducer の block literal が失われた',
    )
  })

  test('S-8: setPrimaryNode の呼び出しが 1 箇所のみ（分岐で複製していない）', () => {
    assert.equal(
      (groupHandler().match(/setPrimaryNode\(/g) ?? []).length, 1,
      'handleSelectGroup 内の setPrimaryNode 呼び出しが 1 箇所でない',
    )
  })

  test('S-9: rebuildPrimary / buildPrimaryNodeSnapshot を経由しない（T-4C4-4 の維持）', () => {
    const region = groupHandler()
    assert.ok(!/rebuildPrimary\(/.test(region) && !/buildPrimaryNodeSnapshot\(/.test(region))
  })

  test('S-10: scenario rebuild effect の解除分岐が setEditedSOAP(null) を持つ（確認が必要な機構の根拠）', () => {
    const effect = rebuildEffect()
    const idx = effect.indexOf('} else if (selectedScenarioId === null) {')
    assert.ok(idx >= 0, 'effect の解除分岐アンカーが見つからない')
    assert.ok(
      effect.slice(idx).includes('setEditedSOAP(null)'),
      'effect の解除分岐から setEditedSOAP(null) が消えた。' +
      '本 Unit の discard contract はこの無言破棄を confirmDiscard へ繋ぐことを目的としている',
    )
  })

  test('S-11: effect の dependency が [primaryNode.scenarioId] 単独（OD-4D5-A の前提）', () => {
    const depsMatch = src.slice(src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化'))
      .match(/\n\s*\}, \[([^\]]*)\]\)/)
    assert.ok(depsMatch, 'effect の deps が見つからない')
    const deps = depsMatch![1].split(',').map(s => s.trim()).filter(Boolean)
    assert.deepEqual(deps, ['primaryNode.scenarioId'], `effect deps が変化している: [${deps.join(', ')}]`)
  })

  test('S-12: confirmDiscard 本体を変更していない', () => {
    assert.ok(src.includes('const confirmDiscard = useCallback((action: () => void) => {'))
    assert.ok(src.includes('if (editedSOAP === null) {'))
    assert.ok(src.includes('pendingActionRef.current = action'))
    assert.ok(src.includes('}, [editedSOAP])'))
  })

  test('S-13: 破棄ダイアログの setEditedSOAP(null) → action 順序を変更していない', () => {
    const dlg = src.slice(src.indexOf('className={s.discardDialogConfirm}'))
    const resetIdx = dlg.indexOf('setEditedSOAP(null)')
    const actionIdx = dlg.indexOf('action?.()')
    assert.ok(resetIdx > 0 && actionIdx > resetIdx, 'dialog の reset → action 順序が壊れている')
  })
})

// ═══════════════════════════════════════════════════════════════
// P 群（purity）— 4D-1 契約を confirmDiscard 導入後も維持
// ═══════════════════════════════════════════════════════════════

describe('P 群: handleSelectGroup の updater purity', () => {
  test('P-1: setPrimaryNode の updater 本体に nested setter が 0 件', () => {
    const bodies = updaterBodies(codeOnly(groupHandler()), 'setPrimaryNode')
    assert.ok(bodies.length > 0, 'setPrimaryNode の updater が見つからない（アンカー破損）')
    for (const b of bodies) {
      const nested = [...b.matchAll(/\bset[A-Z]\w*\(/g)].map(m => m[0])
      assert.deepEqual(nested, [], `updater 内に別 setter がある: ${nested.join(', ')}`)
    }
  })

  test('P-2: setPrimaryNode の updater 本体に *.current（ref read）が 0 件', () => {
    for (const b of updaterBodies(codeOnly(groupHandler()), 'setPrimaryNode')) {
      const refs = [...b.matchAll(/\w+Ref\.current/g)].map(m => m[0])
      assert.deepEqual(refs, [], `updater 内で ref を読んでいる: ${refs.join(', ')}`)
    }
  })

  test('P-3: confirmDiscard の引数は引数なし callback であり setter updater ではない', () => {
    const region = codeOnly(groupHandler())
    const calls = extractBalancedCalls(region, 'confirmDiscard(')
    assert.equal(calls.length, 1, `confirmDiscard の呼び出しが 1 箇所でない: ${calls.length}`)
    assert.ok(
      /^confirmDiscard\((apply|\(\) => \{)/.test(calls[0]),
      `confirmDiscard の引数が引数なし callback でない: ${calls[0].slice(0, 60)}`,
    )
    // `set[A-Z]…(arg => {` 形（P-1 / P-2 が走査する updater 形）に一致しないこと
    assert.ok(
      !/^confirmDiscard\(\s*\w+\s*=>/.test(calls[0]),
      'confirmDiscard の引数が 1 引数 updater 形になっている',
    )
  })
})
