/**
 * genericIntegration.test.ts
 *
 * 不具合修正の回帰テスト:
 *   1. treatment_adjustment の MenuGroup 分類（id naming 非依存 generic 判定）
 *   2. isSReplacementEligible() の汎用 S置換UI eligibility 判定
 *   3. Express Mode グルーピング: expressGroup 一致で同一ポップアップに集約されること
 *
 * 対象不具合:
 *   - derm_heparinoid_moisturizer_ointment の treatment_adjustment が「その他」に入る
 *   - derm_heparinoid_moisturizer_ointment の cp_good / se_contact_dermatitis_none で
 *     S置換UI が表示されない
 *   - expressGroup="ヘパリン類似物質" が MEDICAL_AREAS subcategory "ヘパリン" と不一致で
 *     ポップアップが開かなかった（fix: expressGroup="ヘパリン" に統一）
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
import type { ModuleData, Scenario, ExpressModeEntry } from '../lib/types'

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

  // ─────────────────────────────────────────────────────────────
  // secondary / additional / composed / synthesis context テスト
  //
  // isSingleDrug は「primary drug / main-search / non-synthesis」の複合条件。
  // 以下のいずれかに該当する場合は isSingleDrug=false として渡す:
  //   - isAdditionalDrugSelection: 2剤目・3剤目の薬剤追加検索選択中
  //   - isSynthesisMode:           composeNodes.length > 0（多剤合成中）
  //   - isComposedSoapMode:        合成済み SOAP の再編集中
  //   - secondary scenario:        primary ではない追加薬剤のシナリオ
  // ─────────────────────────────────────────────────────────────

  describe('secondary / additional / composed context — すべて false', () => {
    // additionalDrugCtx: 追加薬剤選択中（composeNodes.length > 0 に相当）
    const additionalDrugCtx = { thirdPanelEnabled: true, isSingleDrug: false }
    // synthesisCtx: 多剤合成中（composeNodes.length > 0）
    const synthesisCtx = { thirdPanelEnabled: true, isSingleDrug: false }
    // composedSoapCtx: 合成済み SOAP 再編集中
    const composedSoapCtx = { thirdPanelEnabled: true, isSingleDrug: false }
    // noScenario: シナリオ未確定
    const noScenarioCtx = { thirdPanelEnabled: false, isSingleDrug: false }

    test('derm cp_good: additional drug context (isSingleDrug=false) → false', () => {
      const sc = findScenario(dermData as unknown as ModuleData, 'cp_good')
      assert.equal(isSReplacementEligible(sc, additionalDrugCtx), false)
    })

    test('derm se_contact_dermatitis_none: synthesis mode context → false', () => {
      const sc = findScenario(dermData as unknown as ModuleData, 'se_contact_dermatitis_none')
      assert.equal(isSReplacementEligible(sc, synthesisCtx), false)
    })

    test('derm cp_good: composed SOAP mode context → false', () => {
      const sc = findScenario(dermData as unknown as ModuleData, 'cp_good')
      assert.equal(isSReplacementEligible(sc, composedSoapCtx), false)
    })

    test('GLP-1 cp_good (explicit enabled:true): additional drug context → false', () => {
      const sc = findScenario(oralData as unknown as ModuleData, 'cp_good')
      assert.ok(sc.thirdPanelSPlacement?.enabled === true, 'precondition')
      // 明示 enabled:true でも context が additional なら false
      assert.equal(isSReplacementEligible(sc, additionalDrugCtx), false)
    })

    test('GLP-1 se_hypo_none (explicit enabled:true): synthesis mode → false', () => {
      const sc = findScenario(oralData as unknown as ModuleData, 'se_hypo_none')
      assert.ok(sc.thirdPanelSPlacement?.enabled === true, 'precondition')
      assert.equal(isSReplacementEligible(sc, synthesisCtx), false)
    })

    test('secondary scenario (derm initial_dryness — 非S置換対象): primary context でも false', () => {
      // 初回シナリオは sideEffectPresence=not_applicable かつ
      // scenarioType=treatment_start → generic fallback の条件をいずれも満たさない
      const sc = findScenario(dermData as unknown as ModuleData, 'initial_dryness')
      assert.equal(sc.sideEffectPresence, 'not_applicable', 'precondition: not a side_effect/adherence scenario')
      // primary context で渡しても eligibility は false（シナリオ自体が対象外）
      assert.equal(isSReplacementEligible(sc, primaryCtx), false)
    })

    test('synthetic secondary scenario (治療_start, not_applicable): context=additional → false', () => {
      // 追加薬剤の treatment_start シナリオを secondary として渡す想定
      const secondaryScenario: Scenario = {
        id: 'secondary_initial',
        globalId: 'test.secondary_initial',
        title: '2剤目初回',
        scenarioType: 'treatment_start',
        scenarioGroup: 'treatment_start',
        sideEffectPresence: 'not_applicable',
        scenarioTags: ['treatment_start', 'initial'],
        sComposition: { intent: 'new_addition', template: 'symptom_based', symptomCodes: [], symptoms: [] },
        clinicalTags: [],
        counselingTags: [],
        workflowTags: [],
        S: '{{drug_subject}}は、初めて使用する。',
        O: '{{drug_subject}}　処方',
        A: '{{drug_subject}}は、治療目的で使用する。',
        P: '次回確認。',
      }
      // additional drug context（isSingleDrug=false）
      assert.equal(isSReplacementEligible(secondaryScenario, additionalDrugCtx), false)
    })

    test('no-scenario context (thirdPanelEnabled=false, isSingleDrug=false) → false', () => {
      const sc = findScenario(dermData as unknown as ModuleData, 'cp_good')
      assert.equal(isSReplacementEligible(sc, noScenarioCtx), false)
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

// ─────────────────────────────────────────────────────────────
// 4. Express Mode グルーピング回帰
//
// ThirdPanel の expressByCat ロジック（pure function 部分）を inline で再現し、
// expressModes エントリが期待通りにグルーピングされることを検証する。
//
// 検証観点:
//   (a) 現在の油性クリームエントリが "皮膚科" > "ヘパリン" > "剤形" に分類されること
//   (b) 将来追加する剤形エントリ（ローション・ゲル・スプレー）が
//       同一 expressGroup="ヘパリン" を持てば同一ポップアップに集約されること
//   (c) expressSubGroup が異なれば別グループラベルで分割されること
//   (d) expressGroup が異なれば別ポップアップグループに分離されること
// ─────────────────────────────────────────────────────────────

// ThirdPanel.expressByCat のグルーピングロジックを純粋関数として inline 複製
type ExpressCandidateLike = {
  moduleId: string
  expressCategory: string
  expressGroup: string
  expressSubGroup: string
  label: string
}

function buildExpressByCat(candidates: ExpressCandidateLike[]) {
  const map: Record<string, {
    groupOrder: string[]
    groupMap: Record<string, { subGroupOrder: string[]; subGroupMap: Record<string, ExpressCandidateLike[]> }>
  }> = {}
  for (const c of candidates) {
    const cat = c.expressCategory
    const grp = c.expressGroup
    const sub = c.expressSubGroup
    if (!map[cat]) map[cat] = { groupOrder: [], groupMap: {} }
    const catEntry = map[cat]
    if (!catEntry.groupMap[grp]) {
      catEntry.groupOrder.push(grp)
      catEntry.groupMap[grp] = { subGroupOrder: [], subGroupMap: {} }
    }
    const grpEntry = catEntry.groupMap[grp]
    if (!grpEntry.subGroupMap[sub]) {
      grpEntry.subGroupOrder.push(sub)
      grpEntry.subGroupMap[sub] = []
    }
    grpEntry.subGroupMap[sub].push(c)
  }
  return map
}

describe('Express Mode グルーピング — expressGroup/SubGroup 一致による集約', () => {

  // ── 現在の油性クリームエントリ（実 JSON から） ──────────────
  const oilyCreamEntry: ExpressCandidateLike = {
    moduleId: 'derm_heparinoid_moisturizer_ointment',
    expressCategory: '皮膚科',
    expressGroup: 'ヘパリン',
    expressSubGroup: '剤形',
    label: 'ヒルドイドソフト軟膏',
  }

  // ── 将来追加想定の剤形エントリ（モック） ─────────────────────
  const lotionEntry: ExpressCandidateLike = {
    moduleId: 'derm_heparinoid_lotion',
    expressCategory: '皮膚科',
    expressGroup: 'ヘパリン',
    expressSubGroup: '剤形',
    label: 'ヒルドイドローション',
  }
  const gelEntry: ExpressCandidateLike = {
    moduleId: 'derm_heparinoid_gel',
    expressCategory: '皮膚科',
    expressGroup: 'ヘパリン',
    expressSubGroup: '剤形',
    label: 'ヒルドイドゲル',
  }
  const sprayEntry: ExpressCandidateLike = {
    moduleId: 'derm_heparinoid_spray',
    expressCategory: '皮膚科',
    expressGroup: 'ヘパリン',
    expressSubGroup: '剤形',
    label: 'ヒルドイドスプレー',
  }
  // 別 expressSubGroup に分類される剤形（区切りラベルが変わることを確認）
  const specialSubGroupEntry: ExpressCandidateLike = {
    moduleId: 'derm_heparinoid_patch',
    expressCategory: '皮膚科',
    expressGroup: 'ヘパリン',
    expressSubGroup: 'テープ・パッチ',
    label: 'テープ剤',
  }
  // 別 expressGroup（ポップアップが分離されることを確認）
  const steroidEntry: ExpressCandidateLike = {
    moduleId: 'derm_steroid_mild',
    expressCategory: '皮膚科',
    expressGroup: 'ステロイド',
    expressSubGroup: '剤形',
    label: 'ロコイド軟膏',
  }

  describe('(a) 現在の油性クリームエントリのカテゴリ分類', () => {
    const map = buildExpressByCat([oilyCreamEntry])

    test('expressCategory "皮膚科" が map に存在する', () => {
      assert.ok('皮膚科' in map)
    })

    test('expressGroup "ヘパリン" が groupOrder に含まれる', () => {
      assert.ok(map['皮膚科'].groupOrder.includes('ヘパリン'))
    })

    test('expressSubGroup "剤形" が subGroupOrder に含まれる', () => {
      assert.ok(map['皮膚科'].groupMap['ヘパリン'].subGroupOrder.includes('剤形'))
    })

    test('油性クリームエントリが "剤形" グループに1件存在する', () => {
      const entries = map['皮膚科'].groupMap['ヘパリン'].subGroupMap['剤形']
      assert.equal(entries.length, 1)
      assert.equal(entries[0].moduleId, 'derm_heparinoid_moisturizer_ointment')
    })

    test('expressSubcats に "ヘパリン" が含まれる（MEDICAL_AREAS ボタンと一致）', () => {
      const expressSubcats = new Set<string>()
      for (const catEntry of Object.values(map)) {
        for (const grp of catEntry.groupOrder) {
          expressSubcats.add(grp)
          for (const sub of catEntry.groupMap[grp].subGroupOrder) {
            expressSubcats.add(sub)
          }
        }
      }
      assert.ok(expressSubcats.has('ヘパリン'), '"ヘパリン" が expressSubcats に存在しない → ポップアップが開かない')
    })
  })

  describe('(b) 将来の剤形追加: 同一 expressGroup で同一ポップアップに集約', () => {
    const map = buildExpressByCat([oilyCreamEntry, lotionEntry, gelEntry, sprayEntry])

    test('"ヘパリン" グループが1つだけ存在する（複数グループに分裂しない）', () => {
      assert.equal(map['皮膚科'].groupOrder.filter(g => g === 'ヘパリン').length, 1)
    })

    test('"剤形" subGroup に4エントリすべてが集約される', () => {
      const entries = map['皮膚科'].groupMap['ヘパリン'].subGroupMap['剤形']
      assert.equal(entries.length, 4)
    })

    test('全エントリの moduleId が存在する', () => {
      const entries = map['皮膚科'].groupMap['ヘパリン'].subGroupMap['剤形']
      const ids = entries.map(e => e.moduleId)
      assert.ok(ids.includes('derm_heparinoid_moisturizer_ointment'))
      assert.ok(ids.includes('derm_heparinoid_lotion'))
      assert.ok(ids.includes('derm_heparinoid_gel'))
      assert.ok(ids.includes('derm_heparinoid_spray'))
    })
  })

  describe('(c) expressSubGroup が異なれば別グループラベルで分割される', () => {
    const map = buildExpressByCat([oilyCreamEntry, specialSubGroupEntry])

    test('"ヘパリン" の subGroupOrder に "剤形" と "テープ・パッチ" が両方含まれる', () => {
      const subGroups = map['皮膚科'].groupMap['ヘパリン'].subGroupOrder
      assert.ok(subGroups.includes('剤形'))
      assert.ok(subGroups.includes('テープ・パッチ'))
    })

    test('"剤形" に oil cream、"テープ・パッチ" に patch がそれぞれ1件', () => {
      assert.equal(map['皮膚科'].groupMap['ヘパリン'].subGroupMap['剤形'].length, 1)
      assert.equal(map['皮膚科'].groupMap['ヘパリン'].subGroupMap['テープ・パッチ'].length, 1)
    })
  })

  describe('(d) expressGroup が異なれば別ポップアップグループに分離される', () => {
    const map = buildExpressByCat([oilyCreamEntry, steroidEntry])

    test('"皮膚科" に "ヘパリン" と "ステロイド" の2グループが存在する', () => {
      assert.equal(map['皮膚科'].groupOrder.length, 2)
      assert.ok(map['皮膚科'].groupOrder.includes('ヘパリン'))
      assert.ok(map['皮膚科'].groupOrder.includes('ステロイド'))
    })

    test('"ヘパリン" ポップアップに oil cream のみ、"ステロイド" ポップアップに steroid のみ', () => {
      assert.equal(map['皮膚科'].groupMap['ヘパリン'].subGroupMap['剤形'].length, 1)
      assert.equal(map['皮膚科'].groupMap['ステロイド'].subGroupMap['剤形'].length, 1)
    })
  })

  describe('(e) 実 derm JSON の expressModes が正しく分類されること', () => {
    const dermModes = (dermData as unknown as ModuleData).expressModes ?? []

    test('derm expressModes に 1 エントリ存在する', () => {
      assert.equal(dermModes.length, 1)
    })

    test('唯一のエントリの expressGroup が "ヘパリン"', () => {
      assert.equal(dermModes[0].expressGroup, 'ヘパリン')
    })

    test('唯一のエントリの expressCategory が "皮膚科"', () => {
      assert.equal(dermModes[0].expressCategory, '皮膚科')
    })

    test('唯一のエントリの expressSubGroup が "剤形"', () => {
      assert.equal(dermModes[0].expressSubGroup, '剤形')
    })

    test('唯一のエントリに scenarioCandidates が 3 件存在する', () => {
      assert.equal(dermModes[0].scenarioCandidates?.length, 3)
    })

    test('scenarioCandidates の scenarioId が期待値と一致する', () => {
      const ids = dermModes[0].scenarioCandidates?.map(c => c.scenarioId)
      assert.deepEqual(ids, ['initial_dryness', 'initial_eczema', 'initial_skin_barrier_patch'])
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 5. Express Mode UI遷移: 油性クリーム押下 → scenarioCandidates 表示パス
//
// ThirdPanel の handleExpressBrandAdd() / DashboardClient の expressCandidates 生成を
// データレイヤーで検証する。
//
// 検証観点:
//   (f) DashboardClient 相当の expressCandidates 生成で
//       derm の oil cream エントリに scenarioCandidates が付与されること
//   (g) handleExpressBrandAdd() 相当の分岐で
//       scenarioCandidates があれば setExpressScenarioPicker が呼ばれ
//       onExpressAdd は呼ばれないこと
//   (h) scenarioCandidates が undefined / [] の場合は
//       onExpressAdd が即時呼ばれること（H1内服の既存動作）
//   (i) globalId 解決が成功しており resolved 後も3件であること
// ─────────────────────────────────────────────────────────────

describe('Express Mode UI遷移 — 油性クリーム押下 → scenarioCandidates 表示パス', () => {
  const derm = dermData as unknown as ModuleData
  const h1Oral = h1OralData as unknown as ModuleData

  // DashboardClient の expressCandidates 生成ロジックを inline 再現
  function buildExpressCandidates(m: ModuleData) {
    const entries: Array<{
      moduleId: string
      scenarioCandidates?: Array<{ scenarioId: string; globalId: string; label: string }>
      defaultScenarioId: string
      expressGroup: string
    }> = []
    if (m.expressModes && m.expressModes.length > 0) {
      for (const e of m.expressModes) {
        if (!e.enabled) continue
        const resolvedScenarioCandidates = e.scenarioCandidates
          ?.map(c => {
            const found = m.scenarios.find(s => s.id === c.scenarioId)
            if (!found) return null
            return { scenarioId: c.scenarioId, globalId: found.globalId, label: c.label }
          })
          .filter((c): c is NonNullable<typeof c> => c !== null)
        entries.push({
          moduleId: m.moduleId,
          defaultScenarioId: e.defaultScenarioId,
          expressGroup: e.expressGroup,
          scenarioCandidates: resolvedScenarioCandidates && resolvedScenarioCandidates.length > 0
            ? resolvedScenarioCandidates
            : undefined,
        })
      }
    }
    return entries
  }

  // handleExpressBrandAdd() 相当の分岐ロジックを inline 再現
  function simulateExpressBrandAdd(candidate: { scenarioCandidates?: unknown[] }) {
    const onExpressAddCalled = { value: false }
    const expressScenarioPickerSet = { value: false }
    if (candidate.scenarioCandidates && candidate.scenarioCandidates.length > 0) {
      expressScenarioPickerSet.value = true
      return { onExpressAddCalled, expressScenarioPickerSet }
    }
    onExpressAddCalled.value = true
    return { onExpressAddCalled, expressScenarioPickerSet }
  }

  describe('(f) expressCandidates 生成: derm oil cream に scenarioCandidates が付与される', () => {
    const candidates = buildExpressCandidates(derm)

    test('derm から 1 エントリ生成される', () => {
      assert.equal(candidates.length, 1)
    })

    test('生成エントリの expressGroup が "ヘパリン"', () => {
      assert.equal(candidates[0].expressGroup, 'ヘパリン')
    })

    test('生成エントリに scenarioCandidates が存在する（undefined でない）', () => {
      assert.notEqual(candidates[0].scenarioCandidates, undefined,
        'scenarioCandidates が undefined → handleExpressBrandAdd が即時追加分岐に入る → 2段階目が表示されない')
    })

    test('生成エントリの scenarioCandidates が 3 件', () => {
      assert.equal(candidates[0].scenarioCandidates?.length, 3)
    })
  })

  describe('(g) handleExpressBrandAdd 分岐: scenarioCandidates あり → picker セット・onExpressAdd 非呼出', () => {
    const candidates = buildExpressCandidates(derm)
    const result = simulateExpressBrandAdd(candidates[0])

    test('expressScenarioPicker がセットされる（2段階目への遷移）', () => {
      assert.equal(result.expressScenarioPickerSet.value, true)
    })

    test('onExpressAdd は呼ばれない（即時追加しない）', () => {
      assert.equal(result.onExpressAddCalled.value, false)
    })
  })

  describe('(h) handleExpressBrandAdd 分岐: scenarioCandidates なし → onExpressAdd 即時呼出（H1内服互換）', () => {
    // H1内服は expressModes を持つが scenarioCandidates は持たない → 1段階選択
    test('H1内服の expressModes エントリには scenarioCandidates が存在しない', () => {
      assert.ok(h1Oral.expressModes && h1Oral.expressModes.length > 0, 'H1内服に expressModes が存在しない')
      const hasAnySc = h1Oral.expressModes!.some(e => e.scenarioCandidates && e.scenarioCandidates.length > 0)
      assert.equal(hasAnySc, false, 'H1内服のいずれかのエントリに scenarioCandidates が存在する（想定外）')
    })

    test('scenarioCandidates が undefined のエントリ → onExpressAdd が呼ばれる', () => {
      const noScenarioCandidateEntry = { scenarioCandidates: undefined }
      const result = simulateExpressBrandAdd(noScenarioCandidateEntry)
      assert.equal(result.onExpressAddCalled.value, true)
      assert.equal(result.expressScenarioPickerSet.value, false)
    })

    test('scenarioCandidates が空配列のエントリ → onExpressAdd が呼ばれる', () => {
      const emptyScenarioCandidateEntry = { scenarioCandidates: [] }
      const result = simulateExpressBrandAdd(emptyScenarioCandidateEntry)
      assert.equal(result.onExpressAddCalled.value, true)
      assert.equal(result.expressScenarioPickerSet.value, false)
    })
  })

  describe('(i) globalId 解決: 全 scenarioCandidate の globalId が解決済みである', () => {
    const candidates = buildExpressCandidates(derm)
    const scs = candidates[0].scenarioCandidates!

    test('initial_dryness の globalId が解決されている', () => {
      const sc = scs.find(s => s.scenarioId === 'initial_dryness')
      assert.ok(sc, 'initial_dryness が candidates に存在しない')
      assert.ok(sc!.globalId && sc!.globalId.length > 0, 'globalId が空 → activeExpressKeys 照合が壊れる')
    })

    test('initial_eczema の globalId が解決されている', () => {
      const sc = scs.find(s => s.scenarioId === 'initial_eczema')
      assert.ok(sc, 'initial_eczema が candidates に存在しない')
      assert.ok(sc!.globalId && sc!.globalId.length > 0)
    })

    test('initial_skin_barrier_patch の globalId が解決されている', () => {
      const sc = scs.find(s => s.scenarioId === 'initial_skin_barrier_patch')
      assert.ok(sc, 'initial_skin_barrier_patch が candidates に存在しない')
      assert.ok(sc!.globalId && sc!.globalId.length > 0)
    })

    test('全 globalId が "moduleId.scenarioId" 形式である', () => {
      for (const sc of scs) {
        assert.ok(
          sc.globalId.startsWith('derm_heparinoid_moisturizer_ointment.'),
          `globalId "${sc.globalId}" が期待形式でない`
        )
      }
    })
  })
})
