/**
 * rapidUiNodeScopeUnit4D4.test.ts — Rapid Mode v2 / Unit 4D-4 契約テスト
 *
 * Unit 4D-4 の責務は「Rapid UI を active ComposeNode scope へ移し、
 * 2剤目・3剤目など任意 node でも Rapid を操作可能にすること」である。
 *
 *   Unit 4D-4 完了時点の状態:
 *     - isSingleDrug は production contract（live code）から除去された
 *     - SReplacementContext は { thirdPanelEnabled } の1フィールドへ縮小した（D-4D4-2）
 *     - ThirdPanel は activeScenario（= addonTargetScenario）/
 *       rapidState（= (activeNode ?? primaryNode).rapid）を受け取る
 *     - onSAction={handleSToggle} は変更していない（node branch は既に 4D-3b で実装済み）
 *     - multi-Rapid は UI 上制限しない（D-4D4-3。Decision Grouping Fallback Safety
 *       により merge 層は安全であることが前提）
 *
 * 本テストは production export（isSReplacementEligible / isScenarioSReplacementCapable /
 * deriveNodeBlockCore / mergeBlocks）のみを使い、buildS の mirror 実装は作らない。
 * component render harness が無いため、primary/active context の等価性は
 * production の derive 式（source anchor で存在を固定）を ALL_MODULES 全件へ
 * 適用した構造的等価性として検証する（既存 4D-3b 系 test の手法を踏襲）。
 *
 * Scope: 本 Unit は Rapid UI の node scope 化のみを扱う。
 *   lib/buildSoap.ts / tests/decisionFallbackSafety.test.ts には触れない。
 *   dose_decreased classification・continued_do 意味論・clinicalDomain 不整合・
 *   same-name collision・primaryNodeProjection・metadata ownership・
 *   localSiteInput/persona/handleSelectGroup discard hole・docs cleanup には触れない。
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isSReplacementEligible, isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { mergeBlocks } from '../lib/buildSoap'
import { resolveDrugName } from '../lib/drugSubject'
import { ALL_MODULES } from '../data/modules/index'
import type { ModuleData, Scenario, MergedBlock, SoapFields } from '../lib/types'
import type { RapidState } from '../lib/rapidState'

const RELATIONS = ['new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do'] as const
const CONDITIONS = ['stable', 'improved', 'unchanged', 'not_improved'] as const
const SPLICE = /。・/

const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')
const thirdPanelSrc = readFileSync(new URL('../app/components/ThirdPanel.tsx', import.meta.url), 'utf-8')
const eligibleSrc = readFileSync(new URL('../lib/isSReplacementEligible.ts', import.meta.url), 'utf-8')
const typesSrc = readFileSync(new URL('../lib/types.ts', import.meta.url), 'utf-8')

// ─────────────────────────────────────────────────────────────
// corpus ヘルパー（production helper grounded）
// ─────────────────────────────────────────────────────────────

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

function blockOf(mod: ModuleData, sc: Scenario, rapid: RapidState): MergedBlock {
  const core = deriveNodeBlockCore(sc, mod, [], rapid, resolveDrugName(mod.drug, undefined) ?? '')
  return { id: 'b', fields: core.rawFields, domain: resolveDomain(mod), ...core }
}

function mergeNodes(primary: MergedBlock, rest: MergedBlock[]): SoapFields {
  return mergeBlocks(rest, primary.fields, primary.templateLabel, primary.closingText, undefined, primary.groupKey, primary.clinicalDomain)
}

type Case = { mod: ModuleData; sc: Scenario }
function clinicalDomainOf(c: Case): string {
  return c.mod.composition?.clinicalDomain ?? '__none__'
}

// 1 module あたり 1 代表 scenario（capable / any）。module 追加で自動拡張される。
const anyRepresentative = new Map<string, Case>()
const capableRepresentative = new Map<string, Case>()
for (const mod of ALL_MODULES) {
  for (const sc of mod.scenarios) {
    if (!anyRepresentative.has(mod.moduleId)) anyRepresentative.set(mod.moduleId, { mod, sc })
    if (isScenarioSReplacementCapable(sc) && !capableRepresentative.has(mod.moduleId)) {
      capableRepresentative.set(mod.moduleId, { mod, sc })
    }
  }
}
const anyList = [...anyRepresentative.values()]
const capableList = [...capableRepresentative.values()]

// ═══════════════════════════════════════════════════════════════
// 1. primary byte-parity（activeNode === null のとき addonTargetScenario ≡ primaryScenario）
// ═══════════════════════════════════════════════════════════════

describe('1. primary byte-parity: activeNode === null のとき active context 解決は primaryScenario と等価', () => {
  test('targetModule / addonTargetScenario / primaryScenario の derive 式が production source に存在する', () => {
    assert.ok(src.includes('const activeModuleData = useMemo('), 'activeModuleData の宣言が見つからない')
    assert.ok(src.includes('allModules.find(m => m.moduleId === primaryNode.moduleId) ?? moduleData'), 'activeModuleData の derive 式が見つからない')
    assert.ok(src.includes('const targetModule = useMemo<ModuleData>(() => {'), 'targetModule の宣言が見つからない')
    assert.ok(src.includes('const ctx = activeNode ?? primaryNode'), 'targetModule / addonTargetScenario が activeNode ?? primaryNode を使っていない')
    assert.ok(src.includes('allModules.find(m => m.moduleId === ctx.moduleId) ?? activeModuleData'), 'targetModule の derive 式が見つからない')
    assert.ok(src.includes('const addonTargetScenario = useMemo(() => {'), 'addonTargetScenario の宣言が見つからない')
    assert.ok(src.includes("if (!ctx.scenarioId) return undefined"), 'addonTargetScenario の pending 分岐が見つからない')
    assert.ok(src.includes('return targetModule.scenarios.find(sc => sc.globalId === ctx.scenarioId)'), 'addonTargetScenario の derive 式が見つからない')
    assert.ok(src.includes('const primaryScenario = useMemo('), 'primaryScenario の宣言が見つからない（削除禁止）')
    assert.ok(src.includes('activeModuleData.scenarios.find(sc => sc.globalId === selectedScenarioId)'), 'primaryScenario の derive 式が見つからない')
    assert.ok(
      src.includes("const selectedScenarioId = primaryNode.scenarioId === '' ? null : primaryNode.scenarioId"),
      'selectedScenarioId の derive 式が見つからない',
    )
  })

  test('activeNode === null のとき、targetModule ≡ activeModuleData（同一 lookup key・同一 fallback）である', () => {
    // production の derive 式（上記 test で存在を固定済み）をそのまま再現し、
    // 全 module について両者が同一オブジェクトを指すことを ALL_MODULES 全件で確認する。
    // これは business logic の mirror ではなく、単純な参照等価の構造検証である。
    let checked = 0
    for (const primaryNode of ALL_MODULES) {
      checked++
      const activeModuleData = ALL_MODULES.find(m => m.moduleId === primaryNode.moduleId) ?? ALL_MODULES[0]
      const ctx = primaryNode // activeNode === null のとき ctx = primaryNode（同一 moduleId を持つ）
      const targetModule = ALL_MODULES.find(m => m.moduleId === ctx.moduleId) ?? activeModuleData
      assert.equal(targetModule, activeModuleData, `${primaryNode.moduleId}: targetModule と activeModuleData が同一参照でない`)
    }
    assert.ok(checked > 0, 'no modules were checked (test is vacuous)')
  })

  test('activeNode === null のとき、addonTargetScenario ≡ primaryScenario（同一 scenario 配列・同一 key）である', () => {
    let checked = 0
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios) {
        checked++
        // primaryScenario 側: selectedScenarioId = scenarioId ('' なら null)
        const selectedScenarioId = sc.globalId === '' ? null : sc.globalId
        const primaryScenario = mod.scenarios.find(s => s.globalId === selectedScenarioId)
        // addonTargetScenario 側: ctx.scenarioId が falsy なら undefined、それ以外は同一 find
        const addonTargetScenario = !sc.globalId ? undefined : mod.scenarios.find(s => s.globalId === sc.globalId)
        assert.equal(primaryScenario, addonTargetScenario, `${mod.moduleId}/${sc.id}: primaryScenario と addonTargetScenario が異なる`)
      }
    }
    assert.ok(checked > 0, 'no scenarios were checked (test is vacuous)')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. SReplacementContext は { thirdPanelEnabled } の1フィールド（D-4D4-2）
// ═══════════════════════════════════════════════════════════════

describe('2. SReplacementContext 1-field contract', () => {
  test('SReplacementContext は thirdPanelEnabled のみを持つ（isSingleDrug は存在しない）', () => {
    const ifaceStart = eligibleSrc.indexOf('export interface SReplacementContext {')
    const ifaceRegion = eligibleSrc.slice(ifaceStart, eligibleSrc.indexOf('}', ifaceStart) + 1)
    assert.ok(ifaceRegion.includes('thirdPanelEnabled: boolean'), 'thirdPanelEnabled field が見つからない')
    assert.equal(ifaceRegion.includes('isSingleDrug'), false, 'isSingleDrug field が残っている')
  })

  test('capable scenario は thirdPanelEnabled のみで true/false が決まる', () => {
    assert.ok(capableList.length > 0, 'no capable scenarios found (test is vacuous)')
    for (const { sc } of capableList) {
      assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true }), true)
      assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: false }), false)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. capable node の eligibility（node scope 解禁。primary/secondary を区別しない）
// ═══════════════════════════════════════════════════════════════

describe('3. capable node は primary / secondary を問わず eligible になる（D-4D4-3）', () => {
  test('複数モジュール由来の capable scenario がいずれも thirdPanelEnabled=true で true になる', () => {
    // isSReplacementEligible は「どの node か」を一切引数に取らない。
    // したがって同一 scenario を primary 相当・secondary 相当のどちらの文脈で
    // 渡しても結果は変わらない — これが node scope 化の核心である。
    let checked = 0
    for (const { sc } of capableList) {
      checked++
      assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true }), true, `${sc.id} は primary 文脈でも secondary 文脈でも同一の true を返すべき`)
    }
    assert.ok(checked > 0, 'no capable scenarios were checked (test is vacuous)')
  })

  test('DashboardClient は ThirdPanel へ active context の scenario / rapid を渡している', () => {
    assert.ok(src.includes('activeScenario={addonTargetScenario}'), 'activeScenario={addonTargetScenario} が渡されていない')
    assert.ok(src.includes('rapidState={(activeNode ?? primaryNode).rapid}'), 'rapidState={(activeNode ?? primaryNode).rapid} が渡されていない')
    assert.ok(src.includes('onSAction={handleSToggle}'), 'onSAction={handleSToggle} が渡されていない')
  })

  test('ThirdPanel の showSButtons は activeScenario / thirdPanelEnabled のみで決まる', () => {
    assert.ok(thirdPanelSrc.includes('isSReplacementEligible(activeScenario, { thirdPanelEnabled })'))
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. pending node / scenario 未確定では S button 非表示
// ═══════════════════════════════════════════════════════════════

describe('4. pending node / scenario 未確定では eligibility は常に false', () => {
  test('addonTargetScenario の pending 分岐（scenarioId === \'\' → undefined）が存在する', () => {
    assert.ok(src.includes("if (!ctx.scenarioId) return undefined"))
  })

  test('scenario=undefined は thirdPanelEnabled の値によらず false', () => {
    assert.equal(isSReplacementEligible(undefined, { thirdPanelEnabled: true }), false)
    assert.equal(isSReplacementEligible(undefined, { thirdPanelEnabled: false }), false)
  })

  test('scenario=null は thirdPanelEnabled の値によらず false', () => {
    assert.equal(isSReplacementEligible(null, { thirdPanelEnabled: true }), false)
    assert.equal(isSReplacementEligible(null, { thirdPanelEnabled: false }), false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. node 切替時の Rapid active-state 追従
// ═══════════════════════════════════════════════════════════════

describe('5. node ごとの Rapid active-state 追従（rapid: null 初期化 + UI buffer 不在）', () => {
  test('ThirdPanel には Rapid 用の独立 UI buffer state が存在しない（rapidState を直接読む）', () => {
    // production の Rapid state は primary/node いずれも useState を持たず、
    // ThirdPanel は rapidState prop（= (activeNode ?? primaryNode).rapid）を直読する。
    // node 切替時の同期コードが不要であることの根拠。
    assert.equal(/useState[^\n]*[Rr]apid/.test(src), false, 'Rapid 用の独立 useState が production に存在する')
  })

  test('全 node 生成経路（handleComposeDrugSelect / handleSelectScenario 解除 / Express add）で rapid: null が明示初期化される', () => {
    const rapidNullCount = (src.match(/rapid: null,?/g) ?? []).length
    assert.ok(rapidNullCount >= 5, `rapid: null の明示初期化が想定より少ない（実測: ${rapidNullCount}）`)
  })

  test('ThirdPanel の点灯判定は rapidState（RAPID-V2-03: null は未選択）に基づく', () => {
    assert.ok(
      thirdPanelSrc.includes('rapidState !== null &&') &&
      thirdPanelSrc.includes('rapidState.previousEvent === sec.relation &&') &&
      thirdPanelSrc.includes('rapidState.currentOutcome === st.condition'),
      '点灯判定の3条件（rapidState !== null / previousEvent 一致 / currentOutcome 一致）が見つからない',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. multi-Rapid merge invariant（UI 制約なしで到達可能になる構成の安全性）
// ═══════════════════════════════════════════════════════════════

describe('6. multi-Rapid（同一 clinicalDomain 含む）が UI 制約なしで到達可能になっても merge は安全', () => {
  test('same-clinicalDomain 2-node で両方 Rapid でも「。・」spliceが0件', () => {
    let checked = 0
    for (const p of capableList) {
      for (const q of capableList) {
        if (p.mod.moduleId === q.mod.moduleId) continue
        if (clinicalDomainOf(p) !== clinicalDomainOf(q)) continue
        for (const r1 of RELATIONS) {
          for (const r2 of RELATIONS) {
            checked++
            const out = mergeNodes(
              blockOf(p.mod, p.sc, { previousEvent: r1, currentOutcome: 'stable' }),
              [blockOf(q.mod, q.sc, { previousEvent: r2, currentOutcome: 'stable' })],
            )
            assert.equal(SPLICE.test(out.S), false, `splice: ${p.mod.moduleId}/${p.sc.id}[${r1}] + ${q.mod.moduleId}/${q.sc.id}[${r2}]\nS=${out.S}`)
          }
        }
      }
    }
    assert.ok(checked > 0, 'no same-domain capable pairs were checked (test is vacuous)')
  })

  test('cross-domain 2-node で両方 Rapid でも「。・」spliceが0件', () => {
    let checked = 0
    for (const p of capableList) {
      for (const q of capableList) {
        if (clinicalDomainOf(p) === clinicalDomainOf(q)) continue
        for (const r1 of RELATIONS) {
          for (const c1 of CONDITIONS) {
            checked++
            const out = mergeNodes(
              blockOf(p.mod, p.sc, { previousEvent: r1, currentOutcome: c1 }),
              [blockOf(q.mod, q.sc, { previousEvent: r1, currentOutcome: c1 })],
            )
            assert.equal(SPLICE.test(out.S), false, `splice: ${p.mod.moduleId}/${p.sc.id} + ${q.mod.moduleId}/${q.sc.id}\nS=${out.S}`)
          }
        }
      }
    }
    assert.ok(checked > 0, 'no cross-domain capable pairs were checked (test is vacuous)')
  })

  test('genuine multi-subject decision merge（predicate !== \'\'）は multi-Rapid 環境でも保存される', () => {
    // Decision Grouping Fallback Safety（08e851c/3ace4cd）が固定した契約が、
    // Unit 4D-4 到達可能域（同一 domain 2-node Rapid）でも保存されていることの再確認。
    // lib/buildSoap.ts / tests/decisionFallbackSafety.test.ts のいずれにも触れない。
    let found = 0
    for (const p of anyList) {
      for (const q of anyList) {
        if (p.mod.moduleId === q.mod.moduleId) continue
        if (clinicalDomainOf(p) !== clinicalDomainOf(q)) continue
        const out = mergeNodes(blockOf(p.mod, p.sc, null), [blockOf(q.mod, q.sc, null)])
        const hasIntendedMerge = out.S.split('\n').some(line => line.includes('・') && !SPLICE.test(line) && /(?:は[、,]|が)/.test(line))
        if (hasIntendedMerge) { found++; break }
      }
      if (found > 0) break
    }
    assert.ok(found > 0, 'no genuine multi-subject decision merge found in corpus (test may be vacuous)')
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. negative guard: isSingleDrug が production live contract から消えている
// ═══════════════════════════════════════════════════════════════

describe('7. isSingleDrug は production の live code / live type / live prop から消えている', () => {
  test('DashboardClient.tsx に isSingleDrug の live 宣言・prop 渡しが無い', () => {
    assert.equal(src.includes('const isSingleDrug ='), false)
    assert.equal(src.includes('isSingleDrug={'), false)
  })

  test('ThirdPanel.tsx の props type / destructure に isSingleDrug が無い', () => {
    assert.equal(/isSingleDrug\??:\s*boolean/.test(thirdPanelSrc), false)
    assert.equal(/\bisSingleDrug\b,/.test(thirdPanelSrc), false)
  })

  test('lib/isSReplacementEligible.ts の SReplacementContext / isSReplacementEligible 本体に isSingleDrug が無い', () => {
    const ifaceStart = eligibleSrc.indexOf('export interface SReplacementContext {')
    const ifaceRegion = eligibleSrc.slice(ifaceStart, eligibleSrc.indexOf('}', ifaceStart) + 1)
    assert.equal(ifaceRegion.includes('isSingleDrug'), false)
    const fnStart = eligibleSrc.indexOf('export function isSReplacementEligible(')
    const fnRegion = eligibleSrc.slice(fnStart, eligibleSrc.indexOf('\n}', fnStart) + 2)
    assert.equal(fnRegion.includes('isSingleDrug'), false)
  })

  test('lib/types.ts の rapid field 説明が Unit 4D-4 の状態を反映している（旧 Unit 6 予定は撤回）', () => {
    assert.equal(typesSrc.includes('multi-node Rapid の解禁は Unit 6 の責務である'), false, '撤廃済みの旧記述が残っている')
  })
})
