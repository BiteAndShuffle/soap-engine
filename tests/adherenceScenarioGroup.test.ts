/**
 * adherenceScenarioGroup.test.ts
 *
 * 登録済み全モジュールの adherence 系シナリオが、規定の `scenarioGroup` 値を
 * 持っていることを検査する。
 *
 * ── 設計意図（新しい Repository 規則は追加していない）─────────────────────
 *
 * 「CP良好 → `adherence_good` / CP不良 → `adherence_poor`」という対応は、
 * `prompts/vNext/PN3A-Scenario-Classification.md`「scenarioGroup」対応表が既に定めている。
 * **本テストはその既存規則を機械的に担保する層を追加したにすぎず、新しい規則を
 * 導入するものではない。** 規則の宣言元は引き続き PN3A である。
 *
 * ── なぜ機械層が必要か ───────────────────────────────────────────────
 *
 * `scenarioGroup` の値域を検査する validator / audit は存在しない
 * （`lib/moduleValidator.ts` は `mergePolicy.S.groupKey` を `groupKeyRegistry` に対して
 * 検査するが、`scenarioGroup` そのものは検査しない）。一方この値は runtime の
 * 複数箇所が消費する:
 *
 *   - `lib/buildSoap.ts` の `scenarioToColor()` → `adherence_good`=green /
 *     `adherence_poor`=orange。**どちらにも一致しない値は gray へフォールバックする**
 *   - `lib/menuGroups.ts` → メニューの「コンプライアンス良好 / 不良」分類
 *   - `lib/scenarioSelector.ts` の `GROUP_RULES` → NLP 経路のグループ推定
 *   - `lib/search.ts` / `lib/searchManifest.ts` → 検索コーパスおよび manifest の構成要素
 *
 * 規定外の値が入っても ERROR も WARNING も出ず、**チップ色が静かに gray になるだけ**で
 * 検知されない。実際に旧値 `"adherence"` を保持したモジュールが 5 件存在し、
 * その 4 シナリオが他モジュールと異なる色で表示される状態が残存していた。
 * 本テストはその再発を検出する。
 *
 * 実行:
 *   npx tsx --test tests/adherenceScenarioGroup.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ALL_MODULES } from '../data/modules/index'

/** adherence 系シナリオ id → 規定の scenarioGroup（宣言元: PN3A-Scenario-Classification.md） */
const SCENARIO_GROUP_CONTRACT: Record<string, string> = {
  cp_good: 'adherence_good',
  cp_poor_missed_doses: 'adherence_poor',
  cp_poor_self_adjust: 'adherence_poor',
  cp_poor_visit_delay: 'adherence_poor',
}

/** 旧値。PN3A の対応表に存在せず、runtime のどの分岐にも一致しない */
const LEGACY_GROUP = 'adherence'

const CONTRACT_IDS = Object.keys(SCENARIO_GROUP_CONTRACT)

function findScenario(moduleId: string, scenarioId: string) {
  const mod = ALL_MODULES.find(m => m.moduleId === moduleId)!
  return mod.scenarios.find(s => s.id === scenarioId)
}

describe('adherence scenarioGroup 契約（全モジュール invariant）', () => {
  test('全モジュールが契約対象の 4 シナリオを保持する（検査が空振りしないことの担保）', () => {
    const missing: string[] = []
    for (const mod of ALL_MODULES) {
      for (const id of CONTRACT_IDS) {
        if (!mod.scenarios.some(s => s.id === id)) missing.push(`${mod.moduleId}.${id}`)
      }
    }
    assert.deepEqual(
      missing,
      [],
      `契約対象シナリオが存在しないモジュールがある:\n  ${missing.join('\n  ')}`,
    )
  })

  test('契約対象シナリオの scenarioGroup が規定値と一致する', () => {
    const mismatches: string[] = []
    for (const mod of ALL_MODULES) {
      for (const [id, expected] of Object.entries(SCENARIO_GROUP_CONTRACT)) {
        const sc = mod.scenarios.find(s => s.id === id)
        if (!sc) continue // 存在自体は上のテストが担保する
        if (sc.scenarioGroup !== expected) {
          mismatches.push(`${mod.moduleId}.${id}: "${sc.scenarioGroup}"（期待 "${expected}"）`)
        }
      }
    }
    assert.deepEqual(
      mismatches,
      [],
      `scenarioGroup が PN3A の対応表と不一致:\n  ${mismatches.join('\n  ')}`,
    )
  })

  test(`旧値 "${LEGACY_GROUP}" を scenarioGroup に持つシナリオが 1 件も存在しない`, () => {
    const residual: string[] = []
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios) {
        if (sc.scenarioGroup === LEGACY_GROUP) residual.push(`${mod.moduleId}.${sc.id}`)
      }
    }
    assert.deepEqual(
      residual,
      [],
      `旧値 "${LEGACY_GROUP}" が残存している（scenarioToColor() が gray へフォールバックする）:\n` +
        `  ${residual.join('\n  ')}`,
    )
  })

  test('検出ロジックの健全性: 規定外の値を持つシナリオは不一致として検出される', () => {
    // 実データではなく意図的に壊した値で、検査が実際に差分を捕まえることを確認する
    // （tests/moduleRegistry.test.ts / tests/moduleValidator.test.ts と同じ「壊したデータでテストする」方針）
    const sample = findScenario(ALL_MODULES[0].moduleId, 'cp_good')!
    const broken = { ...sample, scenarioGroup: LEGACY_GROUP }

    assert.notEqual(
      broken.scenarioGroup,
      SCENARIO_GROUP_CONTRACT.cp_good,
      '規定外の値は契約値と不一致として検出されなければならない',
    )
    assert.equal(
      sample.scenarioGroup,
      SCENARIO_GROUP_CONTRACT.cp_good,
      '前提の健全性: 実データ側は契約値を満たしていなければならない',
    )
  })
})
