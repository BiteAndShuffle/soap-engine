/**
 * rapidStateUnit1.test.ts — Rapid Mode v2 / Unit 1 契約テスト
 *
 * 守る契約:
 *   RAPID-V2-03  RapidState は `{previousEvent,currentOutcome} | null`。
 *                null と `{continued_do, stable}` は別状態である
 *   RAPID-V2-05  アクティブな Rapid の再クリックで null になり、
 *                scenario 本来の S へ完全に戻る
 *   RAPID-V2-07  scenario 変更時の遷移（Owner Decision 解釈①）:
 *                  capable → capable      : 保持し、新 scenario の S へ**再適用**する
 *                  capable → non-capable  : null
 *                  non-capable → capable  : null（自動付与しない）
 *   RAPID-V2-08  capability は scenario intrinsic predicate で判定し、
 *                UI context（isSingleDrug / editingNodeId 等）に依存しない
 *   RAPID-V2-17  Unit 1 終了時点でも Rapid は 1剤目限定を維持する
 *   RAPID-V2-20  production 関数を直接 import する。mirror 実装は行わない
 *
 * Unit 3B 更新: 「ComposeNode に rapid フィールドを追加していない（Unit 2 の責務）」
 * という migration scope guard は、Unit 3B が正式にその責務を実施したため退役した
 * （Owner Decision D-1）。ComposeNode.rapid の正方向の契約は
 * tests/nodeRapidOwnershipUnit3B.test.ts が固定する。
 *
 * 方針:
 *   本ファイルは mirror 実装を一切持たない。すべて production を直接 import する
 *   （lib/rapidState.ts / lib/rapidSentence.ts / lib/isSReplacementEligible.ts /
 *     lib/buildSoap.ts）。React renderer は導入しない。
 *   純粋関数として切り出せない項目（state 初期値・localInput の非 materialize 性）
 *   のみ、既存 tests/rapidNodeStateSafety.test.ts と同じ source contract 方式で固定する。
 *
 * 実行:
 *   npx tsx --test tests/rapidStateUnit1.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields } from '../lib/buildSoap'
import {
  isScenarioSReplacementCapable,
  isSReplacementEligible,
} from '../lib/isSReplacementEligible'
import {
  type RapidState,
  isSameRapid,
  nextRapidStateOnScenarioChange,
} from '../lib/rapidState'
import {
  type SRelation,
  type SCondition,
  buildResolvedSFirstSentence,
  replaceSFirstSentence,
  restoreScenarioFirstSentence,
} from '../lib/rapidSentence'

const src = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)

const RELATIONS: SRelation[] = [
  'new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do',
]
const CONDITIONS: SCondition[] = ['stable', 'improved', 'unchanged', 'not_improved']

const DRUG = '本剤'

/** capable な scenario を module 込みで列挙する */
function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      if (isScenarioSReplacementCapable(sc)) out.push({ mod, sc })
    }
  }
  return out
}

/** production と同じ順で Rapid を S へ適用する（handleSToggle / useEffect と同一手順） */
function applyRapid(s: string, mod: ModuleData, rapid: NonNullable<RapidState>): string {
  return replaceSFirstSentence(
    s,
    buildResolvedSFirstSentence(
      rapid.previousEvent,
      rapid.currentOutcome,
      DRUG,
      mod.display?.adjustmentExpression,
    ),
  )
}

// ═══════════════════════════════════════════════════════════════
// 1. RapidState null 初期状態（RAPID-V2-03）
// ═══════════════════════════════════════════════════════════════

describe('1. RapidState の初期状態は null である（RAPID-V2-03）', () => {
  test('DashboardClient の rapidState 初期値が null である', () => {
    assert.ok(
      /useState<RapidState>\(null\)/.test(src),
      'rapidState は useState<RapidState>(null) で初期化されなければならない',
    )
  })

  test('旧 sRelation / sCondition state が残っていない', () => {
    assert.ok(
      !/useState<SRelation>|useState<SCondition>|setSRelation\(|setSCondition\(/.test(src),
      'sRelation / sCondition の 2 state 表現は Unit 1 で廃止された。' +
      '残っていると null と continued_do×stable を区別できない',
    )
  })

  test('null は continued_do × stable と別状態である', () => {
    const notSelected: RapidState = null
    const doStable: RapidState = { previousEvent: 'continued_do', currentOutcome: 'stable' }
    assert.notDeepEqual(notSelected, doStable)
    // 未選択ではどのボタンもアクティブにならない
    assert.equal(isSameRapid(notSelected, 'continued_do', 'stable'), false)
    assert.equal(isSameRapid(doStable, 'continued_do', 'stable'), true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2〜4. toggle ON / 再クリック / A→B（RAPID-V2-05）
// ═══════════════════════════════════════════════════════════════

describe('2. Rapid A を ON にすると S 先頭文が置換される', () => {
  test('全 capable scenario × 全 20 組合せで先頭文が Rapid 文になる', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const pristine = buildNodeFields(sc, mod, [], DRUG).fields
      for (const previousEvent of RELATIONS) {
        for (const currentOutcome of CONDITIONS) {
          const rapid = { previousEvent, currentOutcome }
          const applied = applyRapid(pristine.S, mod, rapid)
          const expectedFirst = buildResolvedSFirstSentence(
            previousEvent, currentOutcome, DRUG, mod.display?.adjustmentExpression,
          )
          assert.ok(
            applied.startsWith(expectedFirst),
            `${mod.moduleId}/${sc.id}: Rapid 適用後の先頭文が一致しない`,
          )
          assert.notEqual(applied, pristine.S, `${mod.moduleId}/${sc.id}: S が変化していない`)
          checked++
        }
      }
    }
    assert.equal(checked, 170 * 20, `capable 170 × 20 組合せを検証すること（実際: ${checked}）`)
  })
})

describe('3. Rapid A 再クリック → null + S 完全復元（RAPID-V2-05）', () => {
  test('全 capable scenario × 全 20 組合せで scenario 本来の S へ byte 単位復元する', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const pristine = buildNodeFields(sc, mod, [], DRUG).fields
      for (const previousEvent of RELATIONS) {
        for (const currentOutcome of CONDITIONS) {
          const applied = applyRapid(pristine.S, mod, { previousEvent, currentOutcome })
          const restored = restoreScenarioFirstSentence(applied, pristine.S)
          assert.equal(
            restored, pristine.S,
            `${mod.moduleId}/${sc.id} (${previousEvent}/${currentOutcome}): ` +
            'toggle-off で scenario 本来の S へ復元されなければならない',
          )
          checked++
        }
      }
    }
    assert.equal(checked, 170 * 20)
  })

  test('再クリック判定は isSameRapid が担う', () => {
    const rapid: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'improved' }
    assert.equal(isSameRapid(rapid, 'dose_increased', 'improved'), true)
    assert.equal(isSameRapid(rapid, 'dose_increased', 'stable'), false)
    assert.equal(isSameRapid(rapid, 'med_changed', 'improved'), false)
    assert.equal(isSameRapid(null, 'dose_increased', 'improved'), false)
  })
})

describe('4. Rapid A → Rapid B は置換される（残骸を残さない）', () => {
  test('A → B → OFF で scenario 本来の S へ戻る', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const pristine = buildNodeFields(sc, mod, [], DRUG).fields
      for (const previousEvent of RELATIONS) {
        for (const currentOutcome of CONDITIONS) {
          const a = applyRapid(pristine.S, mod, { previousEvent, currentOutcome })
          const b = applyRapid(a, mod, { previousEvent: 'med_changed', currentOutcome: 'improved' })
          const expectedB = buildResolvedSFirstSentence(
            'med_changed', 'improved', DRUG, mod.display?.adjustmentExpression,
          )
          assert.ok(b.startsWith(expectedB), `${mod.moduleId}/${sc.id}: A→B 置換に失敗`)
          assert.equal(
            restoreScenarioFirstSentence(b, pristine.S), pristine.S,
            `${mod.moduleId}/${sc.id}: A→B→OFF で復元されない（Rapid 文の残骸）`,
          )
          checked++
        }
      }
    }
    assert.equal(checked, 170 * 20)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5〜7. scenario 遷移（RAPID-V2-07 / Owner Decision 解釈①）
// ═══════════════════════════════════════════════════════════════

describe('5-7. scenario 変更時の RapidState 遷移（RAPID-V2-07）', () => {
  const rapid: RapidState = { previousEvent: 'new_addition', currentOutcome: 'improved' }

  test('5. capable → capable: 保持する', () => {
    assert.deepEqual(nextRapidStateOnScenarioChange(rapid, true, true), rapid)
  })

  test('6. capable → non-capable: null', () => {
    assert.equal(nextRapidStateOnScenarioChange(rapid, true, false), null)
  })

  test('7. non-capable → capable: null（自動付与しない）', () => {
    assert.equal(nextRapidStateOnScenarioChange(rapid, false, true), null)
  })

  test('元々 null なら常に null（自動付与しない）', () => {
    for (const oldCap of [true, false]) {
      for (const newCap of [true, false]) {
        assert.equal(nextRapidStateOnScenarioChange(null, oldCap, newCap), null)
      }
    }
  })

  test('non-capable → non-capable: null', () => {
    assert.equal(nextRapidStateOnScenarioChange(rapid, false, false), null)
  })
})

describe('5b. capable → capable では新 scenario の S へ再適用される（解釈①）', () => {
  test('保持された Rapid が新 scenario の pristine S を基点に反映される', () => {
    // 同一モジュール内で capable が 2 件以上あるものを対象にする
    let pairsChecked = 0
    for (const mod of ALL_MODULES) {
      const caps = (mod.scenarios ?? []).filter(isScenarioSReplacementCapable)
      if (caps.length < 2) continue
      const [from, to] = caps
      const rapid: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'unchanged' }

      // capable → capable なので保持される
      const carried = nextRapidStateOnScenarioChange(
        rapid,
        isScenarioSReplacementCapable(from),
        isScenarioSReplacementCapable(to),
      )
      assert.notEqual(carried, null, `${mod.moduleId}: capable 間で保持されるはず`)

      // 新 scenario の pristine S を基点に再適用する（useEffect と同一手順）
      const pristineTo = buildNodeFields(to, mod, [], DRUG).fields
      const reapplied = applyRapid(pristineTo.S, mod, carried!)
      const expectedFirst = buildResolvedSFirstSentence(
        'dose_increased', 'unchanged', DRUG, mod.display?.adjustmentExpression,
      )

      assert.ok(
        reapplied.startsWith(expectedFirst),
        `${mod.moduleId}: 保持された Rapid が新 scenario の S へ再適用されていない。` +
        '「state だけ保持して本文に反映しない」状態は禁止（RAPID-V2-07）',
      )
      // 新 scenario 固有の残余（観察文）は保持される
      assert.notEqual(reapplied, pristineTo.S)
      assert.equal(
        restoreScenarioFirstSentence(reapplied, pristineTo.S), pristineTo.S,
        `${mod.moduleId}: 再適用後も toggle-off で新 scenario の S へ戻れること`,
      )
      pairsChecked++
    }
    assert.ok(pairsChecked >= 30, `capable 2件以上のモジュールで検証すること（実際: ${pairsChecked}）`)
  })

  test('再適用の文生成は toggle 時と同一関数を使う（文の乖離を防ぐ）', () => {
    // Unit 2B: useEffect（再適用）と handleSToggle（ON/OFF）はいずれも
    // deriveRawFields（lib/deriveNodeFields.ts）を呼ぶ。deriveRawFields 内部で
    // buildResolvedSFirstSentence を一度だけ呼ぶため、Unit 1 時点の「同じ関数を
    // 直接呼ぶ」制約よりも強い形（唯一の呼び出し経路）で乖離が防がれている。
    const deriveSrc = readFileSync(
      new URL('../lib/deriveNodeFields.ts', import.meta.url), 'utf-8',
    )
    assert.ok(
      /buildResolvedSFirstSentence\(/.test(deriveSrc),
      'deriveRawFields は buildResolvedSFirstSentence で Rapid 先頭文を生成すること',
    )

    const effectBlock = src.slice(
      src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化'),
      src.indexOf('// ══', src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')),
    )
    assert.ok(
      /deriveRawFields\(/.test(effectBlock),
      'scenario 再構築 effect は deriveRawFields で Rapid を再適用すること',
    )
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    assert.ok(
      /deriveRawFields\(/.test(toggleBlock),
      'handleSToggle も deriveRawFields で文を生成すること',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Rapid ON + ADDON → OFF（ADDON 保持 / S 復元）
// ═══════════════════════════════════════════════════════════════

describe('8. Rapid OFF で ADDON テキストは保持される（RAPID-V2-09）', () => {
  test('S 欄へ書き込む ADDON を持つ capable scenario で ADDON が残る', () => {
    let tested = 0
    for (const mod of ALL_MODULES) {
      const items = mod.addons?.items ?? {}
      const sKeys = Object.keys(items).filter(
        k => items[k].sectionTexts?.S || (items[k].targetSection === 'S' && items[k].text),
      )
      if (sKeys.length === 0) continue
      for (const sc of mod.scenarios ?? []) {
        if (!isScenarioSReplacementCapable(sc)) continue
        const pristine = buildNodeFields(sc, mod, [], DRUG).fields
        const withAddon = buildNodeFields(sc, mod, [sKeys[0]], DRUG).fields
        if (withAddon.S === pristine.S) continue  // この scenario には S へ落ちない

        // Rapid ON（raw は ADDON 込み）→ OFF
        const applied = applyRapid(withAddon.S, mod, {
          previousEvent: 'new_addition', currentOutcome: 'stable',
        })
        const restored = restoreScenarioFirstSentence(applied, pristine.S)

        assert.equal(
          restored, withAddon.S,
          `${mod.moduleId}/${sc.id}: Rapid OFF で ADDON 込みの S へ戻ること`,
        )
        assert.notEqual(restored, pristine.S, 'ADDON が落ちてはならない')
        tested++
      }
    }
    assert.ok(tested >= 100, `S 欄 ADDON ケースを検証すること（実際: ${tested}）`)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. persona 相互作用
// ═══════════════════════════════════════════════════════════════

describe('9. Rapid OFF は persona 設定を変更しない（RAPID-V2-09）', () => {
  test('handleSToggle は persona state を書き換えない', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    assert.ok(
      !/setPersonaEnabled\(|setSelectedPersona\(/.test(toggleBlock),
      'Rapid 操作が persona 設定を変更してはならない',
    )
  })

  test('toggle-off は raw を復元し、表示は persona 再適用で導出する', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    // Unit 2B: toggle-off は deriveRawFields(sc, mod, addonIds, null, drugName) の
    // 単一呼び出しで raw を再導出する（restoreScenarioFirstSentence による手動
    // S mutation は撤去済み）。raw を戻さないと persona トグルで Rapid 文が復活してしまう。
    const offBranch = toggleBlock.slice(
      toggleBlock.indexOf('if (isSameRapid('),
      toggleBlock.indexOf('setRapidState({ previousEvent: relation, currentOutcome: condition })'),
    )
    assert.ok(
      /deriveRawFields\(sc, activeModuleData, currentAddonIds, null, drugName\)/.test(offBranch),
      'toggle-off は deriveRawFields(rapid=null) で raw を再導出しなければならない',
    )
    assert.ok(
      /rawPrimaryFieldsRef\.current = rawFields/.test(offBranch),
      'toggle-off は rawPrimaryFieldsRef を復元しなければならない' +
      '（raw は persona 再計算の基点であり、戻さないと persona トグルで Rapid 文が復活する）',
    )
    assert.ok(
      /derivePrimaryDisplayFields\(rawFields\)/.test(offBranch),
      'toggle-off の表示は復元した raw から persona 再適用で導出すること',
    )
  })

  test('toggle-off は restoreScenarioFirstSentence を使わない（deriveRawFields に一本化）', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    assert.ok(
      !/restoreScenarioFirstSentence/.test(toggleBlock),
      'toggle-off が手動の restoreScenarioFirstSentence mutation を使ってはならない' +
      '（Unit 2B で deriveRawFields(rapid=null) へ統一済み）',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. localInput 相互作用
// ═══════════════════════════════════════════════════════════════

describe('10. Rapid 操作は localInput を巻き戻さない（RAPID-V2-09）', () => {
  test('handleSToggle は localSiteInput を書き換えない', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    assert.ok(
      !/setLocalSiteInput\(/.test(toggleBlock),
      'Rapid 操作が localInput を変更してはならない',
    )
  })

  test('localInput は materialize されず finalFields で render 時に適用される', () => {
    // localSiteInput が rawPrimaryFieldsRef / primaryBaseFields へ焼き込まれていたら
    // Rapid の復元操作で巻き戻る可能性がある。render 時適用であることを固定する。
    assert.ok(
      /const finalFields = \(\(\) => \{/.test(src),
      'finalFields（render 時 localInput 適用）が存在すること',
    )
    assert.ok(
      !/rawPrimaryFieldsRef\.current = .*localSiteInput/.test(src),
      'localSiteInput を raw へ materialize してはならない',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. capability predicate（RAPID-V2-08 / 現行 behavior 同一性）
// ═══════════════════════════════════════════════════════════════

describe('12. capability は scenario intrinsic predicate である（RAPID-V2-08）', () => {
  test('capable 総数は 170 / 明示 46 / fallback 124（現行 behavior 維持）', () => {
    let total = 0, capable = 0, explicit = 0, fallback = 0
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios ?? []) {
        total++
        if (!isScenarioSReplacementCapable(sc)) continue
        capable++
        if (sc.thirdPanelSPlacement !== undefined) explicit++
        else fallback++
      }
    }
    assert.equal(total, 1060, `全 scenario 数（実際: ${total}）`)
    assert.equal(capable, 170, `capable 総数（実際: ${capable}）`)
    assert.equal(explicit, 46, `明示 thirdPanelSPlacement 由来（実際: ${explicit}）`)
    assert.equal(fallback, 124, `generic fallback 由来（実際: ${fallback}）`)
  })

  test('分離した predicate は context=true の isSReplacementEligible と完全一致する', () => {
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios ?? []) {
        assert.equal(
          isScenarioSReplacementCapable(sc),
          isSReplacementEligible(sc, { thirdPanelEnabled: true, isSingleDrug: true }),
          `${mod.moduleId}/${sc.id}: 分離前後で判定が変わってはならない`,
        )
      }
    }
  })

  test('CHECK-3: fallback ②(side_effect+absent/none) / ④(cp_good) は削除しない', () => {
    const fn = readFileSync(new URL('../lib/isSReplacementEligible.ts', import.meta.url), 'utf-8')
    assert.ok(
      /scenarioType === 'side_effect'/.test(fn) &&
      /tags\.includes\('absent'\) \|\| tags\.includes\('none'\)/.test(fn),
      'fallback ② を削除してはならない（Owner Decision CHECK-3: 現行 behavior 維持）',
    )
    assert.ok(
      /scenario\.id\.startsWith\('cp_good'\)/.test(fn),
      'fallback ④ を削除してはならない（Owner Decision CHECK-3）',
    )
  })

  test('CHECK-4: thirdPanelSPlacement の明示は override 禁止（enabled:false を fallback で覆さない）', () => {
    const explicitDisabled = {
      id: 'se_none', globalId: 'x__se_none', title: 't', S: 'a。b',
      // fallback ① に該当するが、明示 false が優先されなければならない
      sideEffectPresence: 'absent_or_not_observed',
      thirdPanelSPlacement: { enabled: false, trigger: 'single_drug_only' },
    } as unknown as Scenario
    assert.equal(
      isScenarioSReplacementCapable(explicitDisabled), false,
      'enabled:false の明示を generic fallback で true にしてはならない',
    )
  })

  test('predicate は UI context に依存しない（RAPID-V2-08）', () => {
    const fn = readFileSync(new URL('../lib/isSReplacementEligible.ts', import.meta.url), 'utf-8')
    const body = fn.slice(
      fn.indexOf('export function isScenarioSReplacementCapable'),
      fn.indexOf('export function isSReplacementEligible'),
    )
    for (const forbidden of ['isSingleDrug', 'editingNodeId', 'thirdPanelEnabled', 'composeNodes']) {
      assert.ok(
        !new RegExp(`\\b${forbidden}\\b`).test(body),
        `intrinsic predicate が ${forbidden} に依存してはならない`,
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 13. 1剤目限定の維持（RAPID-V2-17）
// ═══════════════════════════════════════════════════════════════

describe('13. Unit 1 終了時点でも Rapid は 1剤目限定である（RAPID-V2-17）', () => {
  test('UI gate は capability AND context の 2 段である', () => {
    const caps = capableScenarios()
    assert.ok(caps.length > 0)
    const { sc } = caps[0]
    // capable でも context が満たされなければ表示しない
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true, isSingleDrug: false }), false)
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: false, isSingleDrug: true }), false)
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true, isSingleDrug: true }), true)
  })

  test('handleSToggle はノード編集中に 1剤目の S を変更しない', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    assert.ok(
      /if \(editingNodeIdRef\.current !== null\) return/.test(toggleBlock),
      'ノード編集中は early return しなければならない（multi-node Rapid は未解禁）',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 14. reset 経路の一本化
// ═══════════════════════════════════════════════════════════════

describe('14. scenario 遷移判定は transition function へ一本化されている', () => {
  test('nextRapidStateOnScenarioChange が handleSelectScenario で使われている', () => {
    assert.ok(
      /nextRapidStateOnScenarioChange\(/.test(src),
      'scenario 遷移は transition function を通すこと',
    )
  })

  test('旧「明示 thirdPanelSPlacement のみリセット」effect が残っていない', () => {
    assert.ok(
      !/if \(primaryScenario\?\.thirdPanelSPlacement\?\.enabled === true\) \{/.test(src),
      '明示 46 件にしか発火しない旧リセット effect は Unit 1 で撤去された。' +
      '残っていると capable 間の保持（RAPID-V2-07）を上書きしてしまう',
    )
  })

  test('コンテキスト破棄経路は setRapidState(null) を明示する', () => {
    const count = src.split('setRapidState(null)').length - 1
    assert.ok(
      count >= 5,
      'シナリオ解除 / 薬剤切替 / グループ切替 / Express 確定 / NLP 遷移は ' +
      `コンテキスト破棄として明示的に null にすること（実際: ${count} 箇所）`,
    )
  })
})
