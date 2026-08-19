/**
 * UI状態遷移テスト
 *
 * DashboardClient の状態管理ロジックを純粋関数としてシミュレーションし、
 * 各遷移が正しく動作することを検証する。
 *
 * 実行:
 *   npx tsx --test tests/stateTransitions.test.ts
 *
 * 検証項目:
 *   ① 単剤 → 2剤追加: isSingleDrug=false、primaryBaseFields 不変
 *   ② 2剤目確定: primaryBaseFields 不変、composeNodes のみ更新
 *   ③ ノード再選択: primaryBaseFields 不変、対象ノードのみ変更
 *   ④ ノード削除: isSingleDrug 復活
 *   ⑤ Addon分離: primary と node で addon が混ざらない
 *
 * 注記（P2-F1・2026-07-25）: 旧⑤「フラグ制御」（単剤フラグ: 副作用なし/コンプライアンス良好）は
 * UI未接続の dead code として削除された（歴史的経緯は
 * docs/reviews/PHASE2_STAGE1_R1_REVIEW_2026-07-25.md を参照）。関連テストも削除済み。
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import type { SoapFields, ComposeNode, MergedBlock, ModuleData, Scenario } from '../lib/types'
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'
import oralData from '../data/modules/dm_glp1ra_semaglutide_oral.json' assert { type: 'json' }
import injData  from '../data/modules/dm_glp1ra_injection.json'  assert { type: 'json' }

// ─────────────────────────────────────────────────────────────
// テスト用型キャスト
// ─────────────────────────────────────────────────────────────

const oral = oralData as unknown as ModuleData
const inj  = injData  as unknown as ModuleData

// ─────────────────────────────────────────────────────────────
// DashboardClient のロジックを純粋関数として抽出
//
// React hooks を使わず、state の遷移を plain object で追う。
// ─────────────────────────────────────────────────────────────

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

/** DashboardClient の状態スナップショット（テスト対象フィールドのみ） */
interface DashboardState {
  selectedScenarioId: string | null
  primaryBaseFields: SoapFields
  primaryAddonIds: Set<string>
  composeNodes: ComposeNode[]
  editingNodeId: string | null
}

/** 初期状態を生成 */
function makeInitialState(): DashboardState {
  return {
    selectedScenarioId: null,
    primaryBaseFields: { ...EMPTY_FIELDS },
    primaryAddonIds: new Set(),
    composeNodes: [],
    editingNodeId: null,
  }
}

// ── isSingleDrug の導出ロジック（DashboardClient と同一） ──────

function isSingleDrug(state: DashboardState): boolean {
  return state.selectedScenarioId !== null && state.composeNodes.length === 0
}

// ── computePrimaryFields（DashboardClient の同名関数と同一） ──────

function computePrimaryFields(scenario: Scenario, defaults: ModuleData['defaults']): SoapFields {
  const base: SoapFields = {
    S: scenario.S ?? '',
    O: scenario.O ?? '',
    A: scenario.A ?? '',
    P: scenario.P ?? '',
  }
  const result = { ...base }
  for (const key of ['S', 'P'] as const) {
    let appendText: string | null | undefined
    if (scenario.followupRef) {
      const profile = defaults?.followupProfiles?.[scenario.followupRef]
      if (profile) appendText = (profile as Record<string, string | null>)[key]
    } else {
      const val = (scenario.followup as Record<string, string> | undefined)?.[key]
      if (val === 'default') {
        appendText = (defaults?.followup as Record<string, string> | undefined)?.[key]
      }
    }
    if (appendText) result[key] = result[key] ? `${result[key]}\n${appendText}` : appendText
  }
  return result
}

// ── resolveClosingText（DashboardClient と同一） ──────────────────

function resolveClosingText(
  scenario: Scenario,
  defaults?: ModuleData['defaults'],
): string | undefined {
  if (scenario.followupRef) {
    return (defaults?.followupProfiles?.[scenario.followupRef] as Record<string, string> | undefined)?.P
  }
  const val = (scenario.followup as Record<string, string> | undefined)?.P
  if (val === 'default') {
    return (defaults?.followup as Record<string, string> | undefined)?.P
  }
  return undefined
}

// ── resolveDomain（DashboardClient と同一） ───────────────────────

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}

// ── computeDisplayFields（DashboardClient の同名関数と同一） ─────

function computeDisplayFields(
  primaryBaseFields: SoapFields,
  primaryScenario: Scenario | undefined,
  composeNodes: ComposeNode[],
  defaults: ModuleData['defaults'],
): SoapFields {
  const confirmedNodes = composeNodes.filter(n => n.scenarioId !== '' && n.scenarioId != null)
  if (confirmedNodes.length === 0) return { ...primaryBaseFields }
  return mergeBlocks(
    confirmedNodes.map(n => n.block),
    primaryBaseFields,
    primaryScenario?.title ?? '',
    primaryScenario ? resolveClosingText(primaryScenario, defaults) : undefined,
  )
}

// ── handleSelectScenario（primary ブランチのみ、DashboardClient と同等） ──

function applySelectPrimaryScenario(
  state: DashboardState,
  scenarioGlobalId: string,
  mod: ModuleData,
): DashboardState {
  const sc = mod.scenarios.find(s => s.globalId === scenarioGlobalId)
  if (!sc) throw new Error(`scenario not found: ${scenarioGlobalId}`)
  const primaryBaseFields = computePrimaryFields(sc, mod.defaults)
  return {
    ...state,
    selectedScenarioId: scenarioGlobalId,
    primaryBaseFields,
    primaryAddonIds: new Set(),
    editingNodeId: null,
  }
}

// ── handleComposeDrugSelect（DashboardClient と同等） ─────────────

let nodeCounter = 0

function applyAddComposeNode(
  state: DashboardState,
  mod: ModuleData,
): DashboardState {
  nodeCounter++
  const nodeId = `test-node-${nodeCounter}`
  const newNode: ComposeNode = {
    id: nodeId,
    moduleId: mod.moduleId,
    scenarioId: '',
    block: {
      id: `test-block-${nodeCounter}`,
      templateLabel: '',
      fields: { ...EMPTY_FIELDS },
      closingText: undefined,
    },
    drugLabel: mod.drug?.brandNames?.[0] ?? mod.moduleId,
    selectedAddonIds: [],
    baseLabel: '',
    baseDomain: resolveDomain(mod),
    rapid: null,
  }
  return {
    ...state,
    composeNodes: [...state.composeNodes, newNode],
    editingNodeId: nodeId,
  }
}

// ── handleSelectScenario（node ブランチ、DashboardClient と同等） ──

function applyConfirmNodeScenario(
  state: DashboardState,
  nodeId: string,
  scenarioGlobalId: string,
  addonIds: string[],
  allMods: ModuleData[],
): DashboardState {
  const node = state.composeNodes.find(n => n.id === nodeId)
  if (!node) throw new Error(`node not found: ${nodeId}`)
  const mod = allMods.find(m => m.moduleId === node.moduleId) ?? oral
  const sc = mod.scenarios.find(s => s.globalId === scenarioGlobalId)
  if (!sc) throw new Error(`scenario not found: ${scenarioGlobalId}`)
  const { fields, closingText } = buildNodeFields(sc, mod, addonIds)
  const domain = resolveDomain(mod)
  const updatedNode: ComposeNode = {
    ...node,
    scenarioId: scenarioGlobalId,
    block: {
      id: node.block.id,
      templateLabel: sc.title,
      fields,
      closingText,
      domain,
    } as MergedBlock,
    selectedAddonIds: addonIds,
    baseLabel: sc.title,
    baseDomain: domain,
  }
  return {
    ...state,
    composeNodes: state.composeNodes.map(n => n.id === nodeId ? updatedNode : n),
  }
}

// ── handleRemoveComposeNode（DashboardClient と同等） ───────────────

function applyRemoveNode(
  state: DashboardState,
  nodeId: string,
): DashboardState {
  const nextNodes = state.composeNodes.filter(n => n.id !== nodeId)
  const nextEditingNodeId = state.editingNodeId === nodeId ? null : state.editingNodeId
  return {
    ...state,
    composeNodes: nextNodes,
    editingNodeId: nextEditingNodeId,
  }
}

// ── handleAddonToggle（primary ブランチのみ）───────────────────────

function applyAddonToggle(
  state: DashboardState,
  addonKey: string,
  mod: ModuleData,
  primaryScenario: Scenario,
): DashboardState {
  const next = new Set(state.primaryAddonIds)
  next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)

  if (!mod.addons) {
    return { ...state, primaryAddonIds: next }
  }

  const sectionMap = new Map<string, string[]>()
  for (const key of next) {
    const item = mod.addons.items[key]
    if (!item) continue
    const sec = item.targetSection
    if (!sectionMap.has(sec)) sectionMap.set(sec, [])
    sectionMap.get(sec)!.push(item.text)
  }

  const resolveFollowup = (sec: 'S' | 'P'): string => {
    if (primaryScenario.followupRef) {
      return (mod.defaults?.followupProfiles?.[primaryScenario.followupRef] as Record<string, string> | undefined)?.[sec] ?? ''
    }
    const val = (primaryScenario.followup as Record<string, string> | undefined)?.[sec]
    return val === 'default'
      ? ((mod.defaults?.followup as Record<string, string> | undefined)?.[sec] ?? '')
      : ''
  }

  const base: SoapFields = {
    S: primaryScenario.S ?? '',
    O: primaryScenario.O ?? '',
    A: primaryScenario.A ?? '',
    P: primaryScenario.P ?? '',
  }
  const newFields: SoapFields = { S: '', O: '', A: '', P: '' }
  for (const sec of ['S', 'O', 'A', 'P'] as const) {
    const addonTexts = sectionMap.get(sec) ?? []
    const parts = [base[sec], ...addonTexts].filter(Boolean)
    if (sec === 'S' || sec === 'P') {
      const followup = resolveFollowup(sec)
      if (followup) parts.push(followup)
    }
    newFields[sec] = parts.join('\n')
  }

  return { ...state, primaryAddonIds: next, primaryBaseFields: newFields }
}

// ─────────────────────────────────────────────────────────────
// テスト用シナリオヘルパー
// ─────────────────────────────────────────────────────────────

function getScenario(mod: ModuleData, id: string): Scenario {
  const sc = mod.scenarios.find(s => s.id === id)
  assert.ok(sc, `scenario not found: ${id} in ${mod.moduleId}`)
  return sc
}

const ALL_MODS = [oral, inj]

// ─────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────

describe('① 単剤 → 2剤追加', () => {
  test('2剤追加後 isSingleDrug=false になる', () => {
    let state = makeInitialState()
    const sc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, sc.globalId, oral)
    assert.equal(isSingleDrug(state), true, '1剤確定後は isSingleDrug=true')

    state = applyAddComposeNode(state, inj)
    assert.equal(isSingleDrug(state), false, '2剤追加後は isSingleDrug=false')
    assert.equal(state.composeNodes.length, 1, 'composeNodes に1件追加')
  })

  test('2剤追加後 primaryBaseFields は変化しない', () => {
    let state = makeInitialState()
    const sc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, sc.globalId, oral)
    const primaryBefore = { ...state.primaryBaseFields }

    state = applyAddComposeNode(state, inj)
    assert.deepEqual(state.primaryBaseFields, primaryBefore, 'primaryBaseFields は変化しない')
  })
})

describe('② 2剤目確定: primary 不変、composeNodes のみ更新', () => {
  test('2剤目シナリオ確定後も selectedScenarioId が変化しない', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    const primaryScenarioIdBefore = state.selectedScenarioId

    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)

    assert.equal(state.selectedScenarioId, primaryScenarioIdBefore, 'selectedScenarioId 不変')
  })

  test('2剤目シナリオ確定後も primaryBaseFields が変化しない', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    const primaryBefore = { ...state.primaryBaseFields }

    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)

    assert.deepEqual(state.primaryBaseFields, primaryBefore, 'primaryBaseFields 不変')
  })

  test('2剤目確定後に composeNodes[0] の scenarioId が正しく設定される', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)

    assert.equal(state.composeNodes.length, 1)
    assert.equal(state.composeNodes[0].scenarioId, injSc.globalId, 'node.scenarioId が確定された')
    assert.ok(state.composeNodes[0].block.fields.S.length > 0, 'node.block.fields.S が空でない')
  })

  test('2剤目確定後の displayFields は primary と node の合成結果になる', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)

    const primaryScenario = oral.scenarios.find(s => s.globalId === state.selectedScenarioId)
    const display = computeDisplayFields(
      state.primaryBaseFields,
      primaryScenario,
      state.composeNodes,
      oral.defaults,
    )

    // 2剤合成後の S は両シナリオの内容を含む
    assert.ok(display.S.length > 0, 'display.S が空でない')
    assert.ok(display.P.length > 0, 'display.P が空でない')
    // 1剤だけの primaryBaseFields より S が長いか、同じ（1剤目の S が短い場合）
    assert.ok(display.S.length >= state.primaryBaseFields.S.length, '合成後 S は 1剤目以上の長さ')
  })
})

describe('③ ノード再選択: primaryBaseFields 不変、対象ノードのみ変更', () => {
  test('確定済みノードのシナリオを変更しても primaryBaseFields は変化しない', () => {
    let state = makeInitialState()
    const oralSc1 = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc1.globalId, oral)
    const primaryBefore = { ...state.primaryBaseFields }

    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc1 = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc1.globalId, [], ALL_MODS)

    // ノードのシナリオを変更
    const injSc2 = getScenario(inj, 'se_hypo_none')
    state = applyConfirmNodeScenario(state, nodeId, injSc2.globalId, [], ALL_MODS)

    assert.deepEqual(state.primaryBaseFields, primaryBefore, 'ノード再選択後も primaryBaseFields 不変')
  })

  test('2つのノードがある場合、対象ノードのみ変更される', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)

    // ノード1追加・確定
    state = applyAddComposeNode(state, inj)
    const node1Id = state.editingNodeId!
    const injSc1 = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, node1Id, injSc1.globalId, [], ALL_MODS)
    const node1FieldsBefore = { ...state.composeNodes[0].block.fields }

    // ノード2追加・確定
    state = applyAddComposeNode(state, inj)
    const node2Id = state.editingNodeId!
    const injSc2 = getScenario(inj, 'se_hypo_none')
    state = applyConfirmNodeScenario(state, node2Id, injSc2.globalId, [], ALL_MODS)

    assert.equal(state.composeNodes.length, 2, '2ノード存在')
    // ノード1は変化していない
    assert.deepEqual(
      state.composeNodes.find(n => n.id === node1Id)?.block.fields,
      node1FieldsBefore,
      'ノード1の fields は変化しない',
    )
    // ノード2のシナリオが正しく設定されている
    assert.equal(
      state.composeNodes.find(n => n.id === node2Id)?.scenarioId,
      injSc2.globalId,
      'ノード2のシナリオは更新された',
    )
  })

  test('ノード再選択後の displayFields が正しく再計算される', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc1 = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc1.globalId, [], ALL_MODS)

    const primarySc = oral.scenarios.find(s => s.globalId === state.selectedScenarioId)
    const display1 = computeDisplayFields(state.primaryBaseFields, primarySc, state.composeNodes, oral.defaults)

    // シナリオ変更
    const injSc2 = getScenario(inj, 'dose_increase_low_perceived_effect')
    state = applyConfirmNodeScenario(state, nodeId, injSc2.globalId, [], ALL_MODS)
    const display2 = computeDisplayFields(state.primaryBaseFields, primarySc, state.composeNodes, oral.defaults)

    // 異なるシナリオなので display が変化するはず（少なくとも全フィールドが空にはならない）
    assert.ok(display1.S.length > 0)
    assert.ok(display2.S.length > 0)
    // シナリオが変わったので合成後 S が変わる可能性がある（変わらない場合も許容するが空にはならない）
    assert.notDeepEqual(display1, display2, '異なるシナリオでは displayFields が変化する')
  })
})

describe('④ ノード削除: isSingleDrug 復活', () => {
  test('唯一のノードを削除すると isSingleDrug=true に戻る', () => {
    let state = makeInitialState()
    const sc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, sc.globalId, oral)
    state = applyAddComposeNode(state, inj)
    assert.equal(isSingleDrug(state), false, '追加直後は isSingleDrug=false')

    const nodeId = state.composeNodes[0].id
    state = applyRemoveNode(state, nodeId)
    assert.equal(isSingleDrug(state), true, 'ノード削除後は isSingleDrug=true')
    assert.equal(state.composeNodes.length, 0, 'composeNodes が空になる')
  })

  test('2ノードから1つ削除後も残りのノードが確定済みなら isSingleDrug=false のまま', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)

    state = applyAddComposeNode(state, inj)
    const node1Id = state.editingNodeId!
    const injSc1 = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, node1Id, injSc1.globalId, [], ALL_MODS)

    state = applyAddComposeNode(state, inj)
    const node2Id = state.editingNodeId!
    const injSc2 = getScenario(inj, 'se_hypo_none')
    state = applyConfirmNodeScenario(state, node2Id, injSc2.globalId, [], ALL_MODS)

    assert.equal(state.composeNodes.length, 2)

    // node1 を削除
    state = applyRemoveNode(state, node1Id)
    assert.equal(state.composeNodes.length, 1, '1ノード残る')
    assert.equal(isSingleDrug(state), false, '1ノード残存中は isSingleDrug=false')
  })

  test('ノード削除後の displayFields が primaryBaseFields に戻る', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    const primaryBefore = { ...state.primaryBaseFields }

    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)

    state = applyRemoveNode(state, nodeId)

    const primarySc = oral.scenarios.find(s => s.globalId === state.selectedScenarioId)
    const display = computeDisplayFields(state.primaryBaseFields, primarySc, state.composeNodes, oral.defaults)
    assert.deepEqual(display, primaryBefore, 'ノード削除後は primaryBaseFields と同一')
  })

  test('ノード削除後も primaryBaseFields は変化しない', () => {
    let state = makeInitialState()
    const sc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, sc.globalId, oral)
    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)
    const primarySnapshot = { ...state.primaryBaseFields }

    state = applyRemoveNode(state, nodeId)
    assert.deepEqual(state.primaryBaseFields, primarySnapshot, 'ノード削除で primaryBaseFields 変化しない')
  })
})

describe('⑤ Addon 分離: primary と node で addon が混ざらない', () => {
  test('primary に addon をトグルしても composeNodes は変化しない', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)
    const nodeBlockBefore = JSON.stringify(state.composeNodes[0].block)

    // oral の addon が存在するか確認
    const addonKeys = oral.addons ? Object.keys(oral.addons.items) : []
    if (addonKeys.length > 0) {
      const addonKey = addonKeys[0]
      state = applyAddonToggle(state, addonKey, oral, oralSc)
      const nodeBlockAfter = JSON.stringify(state.composeNodes[0].block)
      assert.equal(nodeBlockAfter, nodeBlockBefore, 'primary addon toggle でノードの block は変化しない')
    } else {
      // addon が存在しない場合はスキップ
      assert.ok(true, 'addon なしのモジュールのためスキップ')
    }
  })

  test('node に addon を渡して確定しても primaryAddonIds は変化しない', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)
    const primaryAddonIdsBefore = new Set(state.primaryAddonIds)

    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')

    // inj の addon keys を取得
    const injAddonKeys = inj.addons ? Object.keys(inj.addons.items) : []
    const addonIds = injAddonKeys.slice(0, 1)  // 最大1件

    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, addonIds, ALL_MODS)

    assert.deepEqual(state.primaryAddonIds, primaryAddonIdsBefore, 'primaryAddonIds は変化しない')
  })

  test('node の selectedAddonIds と primary の primaryAddonIds が独立して管理される', () => {
    // 「独立」とは: それぞれが別の Set を持ち、一方の変更が他方に影響しないこと。
    // primary と node が同一の addon キーを保持すること自体は設計上正常。
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)

    // primary に addon をセット（oral に addon があれば）
    const oralAddonKeys = oral.addons ? Object.keys(oral.addons.items) : []
    let primaryHasAddon = false
    if (oralAddonKeys.length > 0) {
      state = applyAddonToggle(state, oralAddonKeys[0], oral, oralSc)
      primaryHasAddon = true
    }

    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')

    // node には addon なしで確定
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)

    const node = state.composeNodes.find(n => n.id === nodeId)!

    // node に addon がない場合: selectedAddonIds は空
    assert.equal(node.selectedAddonIds.length, 0, 'addon なしで確定したノードの selectedAddonIds は空')

    // primary の addon はノードの確定操作で変化しない
    if (primaryHasAddon) {
      assert.ok(state.primaryAddonIds.size > 0, 'primary の addon はノード確定後も保持')
    }

    // primary と node の addon ID は別の参照（Set）で独立して保持される
    // → primaryAddonIds を変更しても selectedAddonIds に影響しないことを確認
    const nodeAddonsBefore = [...node.selectedAddonIds]
    if (oralAddonKeys.length > 1) {
      // 別の addon を primary にトグル
      state = applyAddonToggle(state, oralAddonKeys[1], oral, oralSc)
    } else if (oralAddonKeys.length > 0) {
      // 同じ addon を off にする
      state = applyAddonToggle(state, oralAddonKeys[0], oral, oralSc)
    }
    const nodeAfter = state.composeNodes.find(n => n.id === nodeId)!
    assert.deepEqual(
      nodeAfter.selectedAddonIds,
      nodeAddonsBefore,
      'primary addon の変更がノードの selectedAddonIds に影響しない',
    )
  })

  test('ノード削除後も primaryAddonIds は変化しない', () => {
    let state = makeInitialState()
    const oralSc = getScenario(oral, 'initial')
    state = applySelectPrimaryScenario(state, oralSc.globalId, oral)

    const oralAddonKeys = oral.addons ? Object.keys(oral.addons.items) : []
    if (oralAddonKeys.length > 0) {
      state = applyAddonToggle(state, oralAddonKeys[0], oral, oralSc)
    }

    const primaryAddonSnapshot = new Set(state.primaryAddonIds)

    state = applyAddComposeNode(state, inj)
    const nodeId = state.editingNodeId!
    const injSc = getScenario(inj, 'initial')
    state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)
    state = applyRemoveNode(state, nodeId)

    assert.deepEqual(state.primaryAddonIds, primaryAddonSnapshot, 'ノード削除後も primaryAddonIds 不変')
  })
})

describe('全シナリオ × 2剤遷移の isSingleDrug 判定', () => {
  test('任意の oral シナリオ確定後 + inj ノード追加 → isSingleDrug=false', () => {
    const errors: string[] = []
    for (const sc of oral.scenarios) {
      let state = makeInitialState()
      state = applySelectPrimaryScenario(state, sc.globalId, oral)
      assert.equal(isSingleDrug(state), true, `oral:${sc.id} 確定後 isSingleDrug=true`)
      state = applyAddComposeNode(state, inj)
      if (isSingleDrug(state)) {
        errors.push(`oral:${sc.id} + inj追加後 isSingleDrug が true のまま`)
      }
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })

  test('ノード確定後の composeNodes[0].block.fields.S が空でない（inj 全シナリオ）', () => {
    const errors: string[] = []
    const primarySc = getScenario(oral, 'initial')
    for (const injSc of inj.scenarios) {
      let state = makeInitialState()
      state = applySelectPrimaryScenario(state, primarySc.globalId, oral)
      state = applyAddComposeNode(state, inj)
      const nodeId = state.editingNodeId!
      state = applyConfirmNodeScenario(state, nodeId, injSc.globalId, [], ALL_MODS)
      const node = state.composeNodes[0]
      if (injSc.S && !node.block.fields.S.trim()) {
        errors.push(`inj:${injSc.id} の node.block.fields.S が空`)
      }
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })
})
