/**
 * genericIntegration.test.ts
 *
 * 不具合修正の回帰テスト:
 *   1. treatment_adjustment の MenuGroup 分類（id naming 非依存 generic 判定）
 *   2. isSReplacementEligible() の汎用 S置換UI eligibility 判定
 *
 * 対象不具合:
 *   - derm_heparinoid_moisturizer_ointment の treatment_adjustment が「その他」に入る
 *   - derm_heparinoid_moisturizer_ointment の cp_good / se_contact_dermatitis_none で
 *     S置換UI が表示されない
 *
 * 実行:
 *   npx tsx --test tests/genericIntegration.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import dermData from '../data/modules/derm_heparinoid_moisturizer_ointment.json' assert { type: 'json' }
import oralData from '../data/modules/dm_glp1ra_semaglutide_oral.json'           assert { type: 'json' }
import h1OralData from '../data/modules/allergy_h1_antihistamine_second_gen_oral.json' assert { type: 'json' }
import h1EyeData  from '../data/modules/allergy_h1_antihistamine_eye_drops.json'       assert { type: 'json' }

import { getMenuGroupFromScenario } from '../lib/menuGroups'
import { isSReplacementEligible }   from '../lib/isSReplacementEligible'
import type { ModuleData, Scenario } from '../lib/types'

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

function findScenario(module: ModuleData, id: string): Scenario {
  const sc = module.scenarios.find(s => s.id === id)
  if (!sc) throw new Error(`scenario not found: ${id} in ${module.moduleId}`)
  return sc
}

// ─────────────────────────────────────────────────────────────
// 1. MenuGroup 分類: treatment_adjustment (derm)
// ─────────────────────────────────────────────────────────────

describe('getMenuGroupFromScenario — treatment_adjustment generic classification', () => {
  const derm = dermData as unknown as ModuleData

  describe('derm_heparinoid_moisturizer_ointment: 増量シナリオ', () => {
    test('frequency_increase_low_perceived_effect → 増量', () => {
      const sc = findScenario(derm, 'frequency_increase_low_perceived_effect')
      assert.equal(getMenuGroupFromScenario(sc), '増量')
    })

    test('frequency_increase_due_to_other_med_adjustment → 増量', () => {
      const sc = findScenario(derm, 'frequency_increase_due_to_other_med_adjustment')
      assert.equal(getMenuGroupFromScenario(sc), '増量')
    })
  })

  describe('derm_heparinoid_moisturizer_ointment: 減量シナリオ', () => {
    test('frequency_decrease_improved → 減量', () => {
      const sc = findScenario(derm, 'frequency_decrease_improved')
      assert.equal(getMenuGroupFromScenario(sc), '減量')
    })

    test('frequency_decrease_low_perceived_effect → 減量', () => {
      const sc = findScenario(derm, 'frequency_decrease_low_perceived_effect')
      assert.equal(getMenuGroupFromScenario(sc), '減量')
    })

    test('frequency_decrease_due_to_other_med_adjustment → 減量', () => {
      const sc = findScenario(derm, 'frequency_decrease_due_to_other_med_adjustment')
      assert.equal(getMenuGroupFromScenario(sc), '減量')
    })
  })

  describe('その他 treatment_adjustment シナリオが「その他」に落ちないこと（既存 H1 点眼）', () => {
    const h1Eye = h1EyeData as unknown as ModuleData

    test('dose_increase_low_perceived_effect → 増量（H1点眼）', () => {
      const sc = findScenario(h1Eye, 'dose_increase_low_perceived_effect')
      assert.equal(getMenuGroupFromScenario(sc), '増量')
    })

    test('dose_decrease_improved → 減量（H1点眼）', () => {
      const sc = findScenario(h1Eye, 'dose_decrease_improved')
      assert.equal(getMenuGroupFromScenario(sc), '減量')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 2. isSReplacementEligible — generic S置換UI eligibility
// ─────────────────────────────────────────────────────────────

describe('isSReplacementEligible — generic fallback', () => {
  const derm = dermData as unknown as ModuleData
  const oral = oralData as unknown as ModuleData
  const h1Oral = h1OralData as unknown as ModuleData

  // 単剤 primary context（true が返るべき基本条件）
  const primaryCtx = { thirdPanelEnabled: true, isSingleDrug: true }
  // 多剤合成中（isSingleDrug: false）
  const multiDrugCtx = { thirdPanelEnabled: true, isSingleDrug: false }
  // シナリオ未確定（thirdPanelEnabled: false）
  const noScenarioCtx = { thirdPanelEnabled: false, isSingleDrug: true }

  describe('derm: cp_good — 単剤 primary 時 true', () => {
    test('cp_good: isSingleDrug=true → true', () => {
      const sc = findScenario(derm, 'cp_good')
      assert.equal(isSReplacementEligible(sc, primaryCtx), true)
    })

    test('cp_good: isSingleDrug=false（多剤合成）→ false', () => {
      const sc = findScenario(derm, 'cp_good')
      assert.equal(isSReplacementEligible(sc, multiDrugCtx), false)
    })

    test('cp_good: thirdPanelEnabled=false → false', () => {
      const sc = findScenario(derm, 'cp_good')
      assert.equal(isSReplacementEligible(sc, noScenarioCtx), false)
    })
  })

  describe('derm: se_contact_dermatitis_none — 単剤 primary 時 true', () => {
    test('se_contact_dermatitis_none: isSingleDrug=true → true', () => {
      const sc = findScenario(derm, 'se_contact_dermatitis_none')
      assert.equal(isSReplacementEligible(sc, primaryCtx), true)
    })

    test('se_contact_dermatitis_none: isSingleDrug=false（多剤合成）→ false', () => {
      const sc = findScenario(derm, 'se_contact_dermatitis_none')
      assert.equal(isSReplacementEligible(sc, multiDrugCtx), false)
    })
  })

  describe('GLP-1内服: 明示設定（thirdPanelSPlacement）— 後方互換', () => {
    test('cp_good: 明示 enabled:true → true', () => {
      const sc = findScenario(oral, 'cp_good')
      assert.ok(sc.thirdPanelSPlacement?.enabled === true, 'precondition: GLP-1 cp_good has explicit thirdPanelSPlacement.enabled=true')
      assert.equal(isSReplacementEligible(sc, primaryCtx), true)
    })

    test('se_hypo_none: 明示 enabled:true → true', () => {
      const sc = findScenario(oral, 'se_hypo_none')
      assert.ok(sc.thirdPanelSPlacement?.enabled === true, 'precondition: GLP-1 se_hypo_none has explicit thirdPanelSPlacement.enabled=true')
      assert.equal(isSReplacementEligible(sc, primaryCtx), true)
    })

    test('GLP-1 cp_good: isSingleDrug=false → false（明示設定あっても context 条件で弾く）', () => {
      const sc = findScenario(oral, 'cp_good')
      assert.equal(isSReplacementEligible(sc, multiDrugCtx), false)
    })
  })

  describe('明示 enabled:false → fallback で true にならない', () => {
    // thirdPanelSPlacement.enabled === false を持つシナリオを手動で作成してテスト
    test('enabled:false 明示 → false（sideEffectPresence: absent_or_not_observed でも）', () => {
      const syntheticScenario: Scenario = {
        id: 'test_explicit_disabled',
        globalId: 'test.test_explicit_disabled',
        title: 'テスト',
        scenarioType: 'side_effect',
        scenarioGroup: 'side_effect',
        sideEffectPresence: 'absent_or_not_observed',
        scenarioTags: ['absent'],
        sComposition: { intent: 'monitoring', template: 'symptom_based', symptomCodes: [], symptoms: [] },
        clinicalTags: [],
        counselingTags: [],
        workflowTags: [],
        S: 'テスト',
        O: 'テスト',
        A: 'テスト',
        P: 'テスト',
        thirdPanelSPlacement: { enabled: false, trigger: 'single_drug_only', mode: 'replace', persistAsCompositionBase: false },
      }
      assert.equal(isSReplacementEligible(syntheticScenario, primaryCtx), false)
    })
  })

  describe('null/undefined scenario → false', () => {
    test('scenario=null → false', () => {
      assert.equal(isSReplacementEligible(null, primaryCtx), false)
    })

    test('scenario=undefined → false', () => {
      assert.equal(isSReplacementEligible(undefined, primaryCtx), false)
    })
  })

  describe('GLP-1内服: 既存挙動が壊れないこと', () => {
    test('se_nausea_diarrhea_none: 単剤 primary → true', () => {
      const sc = findScenario(oral, 'se_nausea_diarrhea_none')
      assert.equal(isSReplacementEligible(sc, primaryCtx), true)
    })

    test('initial: 初回シナリオ → false', () => {
      const sc = findScenario(oral, 'initial')
      assert.equal(isSReplacementEligible(sc, primaryCtx), false)
    })
  })

  describe('H1内服: cp_good — generic fallback で動作', () => {
    test('h1_oral cp_good: isSingleDrug=true → true', () => {
      const sc = findScenario(h1Oral, 'cp_good')
      // H1 oral の cp_good は thirdPanelSPlacement を持たないので generic fallback
      assert.equal(sc.thirdPanelSPlacement, undefined, 'precondition: H1 oral cp_good has no explicit thirdPanelSPlacement')
      assert.equal(isSReplacementEligible(sc, primaryCtx), true)
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 3. 回帰: 既存 MenuGroup 分類が悪化しないこと
// ─────────────────────────────────────────────────────────────

describe('getMenuGroupFromScenario — 既存モジュール回帰', () => {
  const oral = oralData as unknown as ModuleData
  const h1Oral = h1OralData as unknown as ModuleData

  describe('GLP-1内服: 主要シナリオ分類', () => {
    test('cp_good → コンプライアンス良好', () => {
      const sc = findScenario(oral, 'cp_good')
      assert.equal(getMenuGroupFromScenario(sc), 'コンプライアンス良好')
    })

    test('se_hypo_none → 副作用なし', () => {
      const sc = findScenario(oral, 'se_hypo_none')
      assert.equal(getMenuGroupFromScenario(sc), '副作用なし')
    })

    test('initial → 初回', () => {
      const sc = findScenario(oral, 'initial')
      assert.equal(getMenuGroupFromScenario(sc), '初回')
    })
  })

  describe('H1内服: 主要シナリオ分類', () => {
    test('cp_good → コンプライアンス良好', () => {
      const sc = findScenario(h1Oral, 'cp_good')
      assert.equal(getMenuGroupFromScenario(sc), 'コンプライアンス良好')
    })
  })

  describe('H1点眼: treatment_adjustment が その他 に落ちないこと', () => {
    const h1Eye = h1EyeData as unknown as ModuleData

    test('dose_decrease_low_perceived_effect → 減量', () => {
      const sc = findScenario(h1Eye, 'dose_decrease_low_perceived_effect')
      assert.equal(getMenuGroupFromScenario(sc), '減量')
    })

    test('dose_increase_due_to_other_med_adjustment → 増量', () => {
      const sc = findScenario(h1Eye, 'dose_increase_due_to_other_med_adjustment')
      assert.equal(getMenuGroupFromScenario(sc), '増量')
    })
  })
})
