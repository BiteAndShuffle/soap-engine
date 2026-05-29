/**
 * menuDisplay.test.ts
 *
 * 左メニュー表示名短縮 / シナリオ色分け の回帰テスト
 *
 * 対象:
 *   - displayTitleForCol2()    — lib/menuGroups.ts
 *   - moduleMenuPrefixCandidates() — lib/menuGroups.ts
 *   - scenarioToColor()        — lib/buildSoap.ts
 *
 * 実行:
 *   npx tsx --test tests/menuDisplay.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import oralData      from '../data/modules/dm_glp1ra_semaglutide_oral.json' assert { type: 'json' }
import injData       from '../data/modules/dm_glp1ra_injection.json'        assert { type: 'json' }
import h1OralData    from '../data/modules/allergy_h1_antihistamine_second_gen_oral.json' assert { type: 'json' }
import h1EyeData     from '../data/modules/allergy_h1_antihistamine_eye_drops.json'      assert { type: 'json' }

import {
  displayTitleForCol2,
  moduleMenuPrefixCandidates,
} from '../lib/menuGroups'
import { scenarioToColor } from '../lib/buildSoap'
import type { ModuleData, Scenario } from '../lib/types'

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

function findScenario(module: ModuleData, id: string): Scenario {
  const sc = (module as unknown as { scenarios: Scenario[] }).scenarios.find(s => s.id === id)
  if (!sc) throw new Error(`scenario not found: ${id} in ${(module as unknown as { moduleId: string }).moduleId}`)
  return sc
}

// ─────────────────────────────────────────────────────────────
// 1. displayTitleForCol2 — プレフィックス除去
// ─────────────────────────────────────────────────────────────

describe('displayTitleForCol2 — prefix stripping', () => {

  describe('GLP-1内服 (dm_glp1ra_semaglutide_oral)', () => {
    const mod = oralData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('初回', () => {
      const sc = findScenario(mod, 'initial')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '初回')
    })
    test('再開', () => {
      const sc = findScenario(mod, 'restart')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開')
    })
    test('他所開始', () => {
      const sc = findScenario(mod, 'external_start')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '他所開始')
    })
  })

  describe('GLP-1注射 (dm_glp1ra_injection)', () => {
    const mod = injData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('初回', () => {
      const sc = findScenario(mod, 'initial')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '初回')
    })
    test('再開', () => {
      const sc = findScenario(mod, 'restart')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開')
    })
    test('他所開始', () => {
      const sc = findScenario(mod, 'external_start')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '他所開始')
    })
  })

  describe('H1内服 (allergy_h1_antihistamine_second_gen_oral)', () => {
    const mod = h1OralData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('初回（鼻水）', () => {
      const sc = findScenario(mod, 'initial_nasal')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '初回（鼻水）')
    })
    test('再開（鼻水）', () => {
      const sc = findScenario(mod, 'restart_nasal')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開（鼻水）')
    })
    test('他所開始（鼻水）', () => {
      const sc = findScenario(mod, 'external_start_nasal')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '他所開始（鼻水）')
    })
  })

  describe('H1点眼 (allergy_h1_antihistamine_eye_drops)', () => {
    const mod = h1EyeData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('初回', () => {
      const sc = findScenario(mod, 'initial')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '初回')
    })
    test('再開', () => {
      const sc = findScenario(mod, 'restart')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開')
    })
    test('終了（改善）', () => {
      const sc = findScenario(mod, 'end_improved')
      assert.equal(displayTitleForCol2(sc.title, '終了', candidates), '終了（改善）')
    })
  })

  describe('prefix なし（candidates 未渡し）', () => {
    test('prefixCandidates 省略時は title そのまま', () => {
      assert.equal(displayTitleForCol2('何かのタイトル', 'その他'), '何かのタイトル')
    })
    test('prefixCandidates 空配列時も title そのまま', () => {
      assert.equal(displayTitleForCol2('何かのタイトル', 'その他', []), '何かのタイトル')
    })
  })

  describe('副作用なし グループの suffix 除去', () => {
    test('suffix 除去は prefix 除去後に適用される', () => {
      // prefix を除去した後 "（症状なし）" も除去
      assert.equal(
        displayTitleForCol2('モジュール名 低血糖（症状なし）', '副作用なし', ['モジュール名']),
        '低血糖'
      )
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 1b. displayTitleForCol2 — 全角/半角括弧ゆれ・最長一致優先
// ─────────────────────────────────────────────────────────────

describe('displayTitleForCol2 — 全角/半角括弧ゆれ吸収', () => {

  test('全角title + 半角candidate でマッチする', () => {
    // title が全角括弧、candidate が半角括弧 → prefix 除去される
    assert.equal(
      displayTitleForCol2('GLP-1受容体作動薬（内服） 初回', '初回', ['GLP-1受容体作動薬(内服)']),
      '初回'
    )
  })

  test('半角title + 全角candidate でマッチする', () => {
    // title が半角括弧（実際の GLP-1 title 形式）、candidate が全角括弧（display フィールド形式）
    assert.equal(
      displayTitleForCol2('GLP-1受容体作動薬(内服) 初回', '初回', ['GLP-1受容体作動薬（内服）']),
      '初回'
    )
  })

  test('注射: 半角title + 全角candidate でマッチする', () => {
    assert.equal(
      displayTitleForCol2('GLP-1受容体作動薬(注射) 初回', '初回', ['GLP-1受容体作動薬（注射）']),
      '初回'
    )
  })

  test('除去後の先頭空白がtrimされている', () => {
    // prefix + スペース除去後の残りに先頭空白がないこと
    const result = displayTitleForCol2('GLP-1受容体作動薬(内服) 初回', '初回', ['GLP-1受容体作動薬（内服）'])
    assert.equal(result, result.trimStart())
  })
})

describe('displayTitleForCol2 — 最長一致優先', () => {

  test('短候補と長候補がある場合、長候補が優先される', () => {
    // 'GLP-1受容体作動薬' も先頭一致するが、より長い '...(内服)' が勝つ
    const candidates = ['GLP-1受容体作動薬', 'GLP-1受容体作動薬（内服）']
    assert.equal(
      displayTitleForCol2('GLP-1受容体作動薬（内服） 初回', '初回', candidates),
      '初回'
    )
  })

  test('長候補が一致しない場合は短候補にフォールバックする', () => {
    // '...(内服)' が title 先頭と一致しない → 短い 'GLP-1受容体作動薬' でマッチ
    const candidates = ['GLP-1受容体作動薬', 'GLP-1受容体作動薬（内服）']
    assert.equal(
      displayTitleForCol2('GLP-1受容体作動薬 初回', '初回', candidates),
      '初回'
    )
  })

  test('いずれの候補も title 先頭に一致しない場合は title をそのまま返す', () => {
    const candidates = ['別のモジュール名', 'または（その変形）']
    assert.equal(
      displayTitleForCol2('GLP-1受容体作動薬(内服) 初回', '初回', candidates),
      'GLP-1受容体作動薬(内服) 初回'
    )
  })
})

// ─────────────────────────────────────────────────────────────
// 1c. displayTitleForCol2 — 実データ追加シナリオ
// ─────────────────────────────────────────────────────────────

describe('displayTitleForCol2 — 実データ追加シナリオ', () => {

  describe('GLP-1内服: end_improved / restart', () => {
    const mod = oralData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('終了（改善）', () => {
      const sc = findScenario(mod, 'end_improved')
      assert.equal(displayTitleForCol2(sc.title, '終了', candidates), '終了（改善）')
    })
    test('再開', () => {
      const sc = findScenario(mod, 'restart')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開')
    })
  })

  describe('GLP-1注射: end_improved / restart', () => {
    const mod = injData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('終了（改善）', () => {
      const sc = findScenario(mod, 'end_improved')
      assert.equal(displayTitleForCol2(sc.title, '終了', candidates), '終了（改善）')
    })
    test('再開', () => {
      const sc = findScenario(mod, 'restart')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開')
    })
  })

  describe('H1内服: 掻痒感系シナリオ', () => {
    const mod = h1OralData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('初回（掻痒感）', () => {
      const sc = findScenario(mod, 'initial_pruritus')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '初回（掻痒感）')
    })
    test('再開（掻痒感）', () => {
      const sc = findScenario(mod, 'restart_pruritus')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開（掻痒感）')
    })
    test('他所開始（掻痒感）', () => {
      const sc = findScenario(mod, 'external_start_pruritus')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '他所開始（掻痒感）')
    })
    test('終了（改善）', () => {
      const sc = findScenario(mod, 'end_improved')
      assert.equal(displayTitleForCol2(sc.title, '終了', candidates), '終了（改善）')
    })
  })

  describe('H1点眼: 再開', () => {
    const mod = h1EyeData as unknown as ModuleData
    const candidates = moduleMenuPrefixCandidates(mod)

    test('再開', () => {
      const sc = findScenario(mod, 'restart')
      assert.equal(displayTitleForCol2(sc.title, '初回', candidates), '再開')
    })
    test('終了（改善）', () => {
      const sc = findScenario(mod, 'end_improved')
      assert.equal(displayTitleForCol2(sc.title, '終了', candidates), '終了（改善）')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 2. scenarioToColor — treatment_start 系の色分け
// ─────────────────────────────────────────────────────────────

describe('scenarioToColor — treatment_start 色分け', () => {

  function makeScenario(overrides: Partial<Scenario>): Scenario {
    return {
      id: 'test',
      globalId: 'mod.test',
      title: 'テスト',
      scenarioType: 'treatment_start',
      scenarioGroup: 'treatment_start',
      sideEffectPresence: 'not_applicable',
      S: '', O: '', A: '', P: '',
      ...overrides,
    } as Scenario
  }

  describe('GLP-1 modules (scenarioGroup=start_or_change, bare id)', () => {
    test('initial → blue', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'initial', scenarioGroup: 'start_or_change' })), 'blue')
    })
    test('restart → green', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'restart', scenarioGroup: 'start_or_change' })), 'green')
    })
    test('external_start → blue', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'external_start', scenarioGroup: 'start_or_change' })), 'blue')
    })
  })

  describe('H1内服 (scenarioGroup=treatment_start, id with suffix)', () => {
    test('initial_nasal → blue', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'initial_nasal', scenarioGroup: 'treatment_start' })), 'blue')
    })
    test('restart_nasal → green', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'restart_nasal', scenarioGroup: 'treatment_start' })), 'green')
    })
    test('restart_pruritus → green', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'restart_pruritus', scenarioGroup: 'treatment_start' })), 'green')
    })
    test('external_start_nasal → blue', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'external_start_nasal', scenarioGroup: 'treatment_start' })), 'blue')
    })
  })

  describe('H1点眼 (scenarioGroup=treatment_start, bare id)', () => {
    test('initial → blue', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'initial', scenarioGroup: 'treatment_start' })), 'blue')
    })
    test('restart → green', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'restart', scenarioGroup: 'treatment_start' })), 'green')
    })
    test('external_start → blue', () => {
      assert.equal(scenarioToColor(makeScenario({ id: 'external_start', scenarioGroup: 'treatment_start' })), 'blue')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 3. scenarioToColor — SE 系の交互色
// ─────────────────────────────────────────────────────────────

describe('scenarioToColor — SE 系 赤/オレンジ交互', () => {
  function makeSE(sep: Scenario['sideEffectPresence']): Scenario {
    return {
      id: 'se_test', globalId: 'mod.se_test', title: 'SE',
      scenarioType: 'side_effect', scenarioGroup: 'side_effect_monitoring',
      sideEffectPresence: sep,
      S: '', O: '', A: '', P: '',
    } as Scenario
  }

  test('present_mild(0) → red', ()    => assert.equal(scenarioToColor(makeSE('present_mild')),          'red'))
  test('present_moderate(1) → orange',() => assert.equal(scenarioToColor(makeSE('present_moderate')),   'orange'))
  test('present_dose_decrease(2) → red',()=> assert.equal(scenarioToColor(makeSE('present_dose_decrease')), 'red'))
  test('present_change(3) → orange',  ()=> assert.equal(scenarioToColor(makeSE('present_change')),      'orange'))
  test('present_stop(4) → red',       ()=> assert.equal(scenarioToColor(makeSE('present_stop')),        'red'))
})

// ─────────────────────────────────────────────────────────────
// 4. 全モジュール実データ検証
// ─────────────────────────────────────────────────────────────

describe('全モジュール実データ検証', () => {
  const modules: [string, ModuleData][] = [
    ['GLP-1内服', oralData as unknown as ModuleData],
    ['GLP-1注射', injData  as unknown as ModuleData],
    ['H1内服',   h1OralData as unknown as ModuleData],
    ['H1点眼',   h1EyeData  as unknown as ModuleData],
  ]

  for (const [label, mod] of modules) {
    const modId = (mod as unknown as { moduleId: string }).moduleId
    const candidates = moduleMenuPrefixCandidates(mod)
    const scenarios = (mod as unknown as { scenarios: Scenario[] }).scenarios

    describe(`${label} (${modId})`, () => {
      test('candidates は空でない', () => {
        assert.ok(candidates.length > 0, `${label}: prefix candidates is empty`)
      })

      test('treatment_start 系: prefix が除去される', () => {
        const startScenarios = scenarios.filter(
          sc => sc.scenarioGroup === 'treatment_start' || sc.scenarioGroup === 'start_or_change'
        )
        assert.ok(startScenarios.length > 0, `${label}: no treatment_start scenarios`)
        for (const sc of startScenarios) {
          const label_ = displayTitleForCol2(sc.title, '初回', candidates)
          // 除去後は薬剤クラス名が含まれないこと
          assert.ok(
            !candidates.some(c => label_.includes(c)),
            `${label}: prefix not stripped for "${sc.title}" → "${label_}"`
          )
        }
      })

      test('restart は green, それ以外の treatment_start は blue', () => {
        const startScenarios = scenarios.filter(
          sc => sc.scenarioGroup === 'treatment_start' || sc.scenarioGroup === 'start_or_change'
        )
        for (const sc of startScenarios) {
          const color = scenarioToColor(sc)
          const isRestart = sc.id === 'restart' || sc.id.startsWith('restart_')
          if (isRestart) {
            assert.equal(color, 'green', `${label}: ${sc.id} expected green, got ${color}`)
          } else {
            assert.equal(color, 'blue', `${label}: ${sc.id} expected blue, got ${color}`)
          }
        }
      })
    })
  }
})
