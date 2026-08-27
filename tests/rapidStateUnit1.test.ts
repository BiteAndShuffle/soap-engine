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
  S_RELATION_LABELS,
  S_CONDITION_LABELS,
} from '../lib/rapidSentence'
import { deriveRawFields } from '../lib/deriveNodeFields'
import { rebuildPrimary, PRIMARY_NODE_ID } from '../lib/primaryNode'
import { applyPersonaToFieldsWithGuard } from '../lib/applyPersona'
import type { ComposeNode } from '../lib/types'

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

/**
 * U-CR1: corpus を 1 度だけ materialize する。module 追加で件数が変わっても
 * 各テストは自身が「実際に列挙した corpus」を検査対象とし、loop の取りこぼしを
 * checked === CAPABLE.length（× 組合せ数）で検出する。exact な corpus snapshot
 * （旧 170 / 1060 / 46 / 124）は仕様値として使用しない。
 */
const CAPABLE_SCENARIOS = capableScenarios()
const RAPID_COMBOS = RELATIONS.length * CONDITIONS.length

/**
 * U-CR1: test 側 RELATIONS / CONDITIONS が runtime authority
 * （production export の S_RELATION_LABELS / S_CONDITION_LABELS）の全値を
 * 網羅していることを key-set で保証する。20 という組合せ数自体は
 * relation 5 × condition 4 の派生値であり、独立した golden count にしない。
 */
function assertRapidAxesCoverProduction(): void {
  assert.deepEqual(
    [...RELATIONS].sort(), Object.keys(S_RELATION_LABELS).sort(),
    'RELATIONS が production の SRelation 全値（S_RELATION_LABELS）を網羅していない',
  )
  assert.deepEqual(
    [...CONDITIONS].sort(), Object.keys(S_CONDITION_LABELS).sort(),
    'CONDITIONS が production の SCondition 全値（S_CONDITION_LABELS）を網羅していない',
  )
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

/**
 * rebuildPrimary の `node` 引数用ダミー（Unit 4C-4）。
 * tests/primaryNodeRebuildUnit4C.test.ts の makeExistingNode と同じパターン。
 * lifecycle field（id / block.id / localSiteInput 等）は rebuildPrimary の
 * 出力に影響しないため、値検証（S 先頭文の byte 一致）にとって非本質的な値でよい。
 */
function makeExistingNode(): ComposeNode {
  return {
    id: PRIMARY_NODE_ID,
    moduleId: 'irrelevant',
    scenarioId: 'irrelevant',
    block: {
      id: 'EXISTING_BLOCK_ID',
      templateLabel: '',
      fields: { S: '', O: '', A: '', P: '' },
      closingText: undefined,
    },
    drugLabel: 'old-label',
    selectedAddonIds: [],
    baseLabel: '',
    baseDomain: 'old-domain',
    matchedBrandName: undefined,
    resolvedDrugName: undefined,
    resolution: undefined,
    localSiteInput: '',
    rapid: null,
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. RapidState null 初期状態（RAPID-V2-03）
// ═══════════════════════════════════════════════════════════════

describe('1. RapidState の初期状態は null である（RAPID-V2-03）', () => {
  test('DashboardClient の rapidState 初期値が null である', () => {
    // Unit 4C-3: rapidState の実体は useState<RapidState>(null) から
    // primaryNode.rapid（makeInitialPrimaryNode の `rapid: null` で初期化）へ移った。
    // 「rapidState は初期状態で null」という契約自体は不変。
    assert.ok(
      /rapid: null,/.test(src),
      'primaryNode の初期値（makeInitialPrimaryNode）で rapid: null が設定されていなければならない',
    )
    assert.ok(
      !/useState<RapidState>\(null\)/.test(src),
      'rapidState はもはや専用の useState を持たない（primaryNode.rapid の derived alias である）',
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
    assertRapidAxesCoverProduction()
    assert.ok(CAPABLE_SCENARIOS.length > 0, 'capable scenario が corpus に 1 件も無い（test が空振り）')
    assert.equal(
      checked, CAPABLE_SCENARIOS.length * RAPID_COMBOS,
      `検証件数が capable scenario × Rapid 組合せの corpus 期待値と一致しない（実際: ${checked}）`,
    )
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
    assertRapidAxesCoverProduction()
    assert.ok(CAPABLE_SCENARIOS.length > 0, 'capable scenario が corpus に 1 件も無い（test が空振り）')
    assert.equal(checked, CAPABLE_SCENARIOS.length * RAPID_COMBOS)
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
    assertRapidAxesCoverProduction()
    assert.ok(CAPABLE_SCENARIOS.length > 0, 'capable scenario が corpus に 1 件も無い（test が空振り）')
    assert.equal(checked, CAPABLE_SCENARIOS.length * RAPID_COMBOS)
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
    // Unit 4C-4: useEffect（再適用）と handleSToggle（ON/OFF）はいずれも
    // rebuildPrimary（lib/primaryNode.ts）を呼ぶ。rebuildPrimary は内部で
    // deriveNodeBlockCore → buildResolvedSFirstSentence を一度だけ呼ぶ（Unit 2B の
    // 「唯一の呼び出し経路」という保証は、経路が deriveRawFields から rebuildPrimary へ
    // 変わっただけで維持されている）。
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
      /rebuildPrimary\(/.test(effectBlock),
      'scenario 再構築 effect は rebuildPrimary で Rapid を再適用すること',
    )
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    assert.ok(
      /rebuildPrimary\(/.test(toggleBlock),
      'handleSToggle も rebuildPrimary で文を生成すること',
    )

    // 値レベル: rebuildPrimary の出力（S 先頭文含む raw）が deriveRawFields と
    // byte 一致することを capable→capable 遷移で確認する（production helper を
    // 直接比較。mirror 実装は作らない。RAPID-V2-20）。
    let checked = 0
    for (const mod of ALL_MODULES) {
      const caps = (mod.scenarios ?? []).filter(isScenarioSReplacementCapable)
      if (caps.length < 2) continue
      const [from, to] = caps
      const rapid: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'unchanged' }
      const carried = nextRapidStateOnScenarioChange(
        rapid,
        isScenarioSReplacementCapable(from),
        isScenarioSReplacementCapable(to),
      )
      if (carried === null) continue

      const rebuilt = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: to, addonIds: [], rapid: carried,
        drugName: DRUG, drugLabel: 'ラベル', baseDomain: 'ドメイン',
        personaEnabled: false, persona: 'plain',
      })
      const direct = deriveRawFields(to, mod, [], carried, DRUG)
      assert.equal(
        rebuilt.block.rawFields?.S, direct.S,
        `${mod.moduleId}: rebuildPrimary の S 先頭文が deriveRawFields と乖離している`,
      )
      checked++
    }
    assert.ok(checked >= 30, `capable 2件以上のモジュールで検証すること（実際: ${checked}）`)
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
    // Unit 4C-4: toggle-off は rebuildPrimary(rapid: null) の単一呼び出しで
    // block.rawFields / block.fields を再導出する（deriveRawFields 直呼びから
    // rebuildPrimary 経由へ一本化された。restoreScenarioFirstSentence による手動
    // S mutation を使わない契約自体は不変）。raw を戻さないと persona トグルで
    // Rapid 文が復活してしまう。
    const offBranch = toggleBlock.slice(
      toggleBlock.indexOf('if (isSameRapid('),
      toggleBlock.indexOf('const nextRapid: RapidState = { previousEvent: relation, currentOutcome: condition }'),
    )
    assert.ok(
      /rebuildPrimary\(\{ node: p, mod, scenario: sc, addonIds: currentAddonIds,\s*rapid: null,/.test(offBranch),
      'toggle-off は rebuildPrimary(rapid: null) で raw を再導出しなければならない',
    )

    // 値レベル: rebuildPrimary(rapid: null) の block.rawFields が
    // deriveRawFields(sc, mod, addonIds, null, drugName) と byte 一致すること
    // （raw が persona 再計算の基点として正しく復元されていることの証明。production
    // helper を直接比較。mirror 実装は作らない。RAPID-V2-20）。
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 50)) {
      const addonIds: string[] = []
      const rebuilt = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: sc, addonIds, rapid: null,
        drugName: DRUG, drugLabel: 'ラベル', baseDomain: 'ドメイン',
        personaEnabled: false, persona: 'plain',
      })
      const direct = deriveRawFields(sc, mod, addonIds, null, DRUG)
      assert.deepEqual(rebuilt.block.rawFields, direct, `${mod.moduleId}/${sc.id}: raw が deriveRawFields と乖離`)
      checked++
    }
    assert.ok(checked > 0, '検証対象の capable scenario が 0 件')

    // 表示（block.fields）は persona 再適用で導出される: personaEnabled かつ guard がある
    // 場合、applyPersonaToFieldsWithGuard(rawFields, true, persona, guard) と一致する。
    const { mod, sc } = capableScenarios()[0]
    const withPersona = rebuildPrimary({
      node: makeExistingNode(), mod, scenario: sc, addonIds: [], rapid: null,
      drugName: DRUG, drugLabel: 'ラベル', baseDomain: 'ドメイン',
      personaEnabled: true, persona: 'gentle',
    })
    assert.ok(withPersona.block.guard, 'guard が設定されていない（前提が崩れている）')
    const expectedFields = applyPersonaToFieldsWithGuard(
      withPersona.block.rawFields!, true, 'gentle', withPersona.block.guard!,
    )
    assert.deepEqual(withPersona.block.fields, expectedFields, 'toggle-off 後の表示が persona 再適用と一致しない')
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
  test('capable は corpus 由来の明示 + fallback に分割され、両経路とも corpus 上 live である（U-CR1: exact snapshot は仕様値ではない）', () => {
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
    const derivedTotal = ALL_MODULES.reduce((n, mod) => n + (mod.scenarios?.length ?? 0), 0)
    assert.ok(derivedTotal > 0, 'corpus に scenario が 1 件も無い（test が空振り）')
    assert.equal(total, derivedTotal, `全 scenario 走査に取りこぼしがある（実際: ${total} / corpus 由来: ${derivedTotal}）`)
    assert.equal(
      capable, CAPABLE_SCENARIOS.length,
      `capable 総数が isScenarioSReplacementCapable の corpus 導出値と一致しない（実際: ${capable} / 導出: ${CAPABLE_SCENARIOS.length}）`,
    )
    assert.ok(capable > 0 && capable <= total, `capable が正しい範囲にない（capable=${capable} / total=${total}）`)
    // OD-CR1-1: explicit/fallback は分割不変条件のみを固定する。exact count（旧 46 / 124）は
    // 仕様値として使用しない。両分岐が corpus 上 live であることは、fallback 経路が silent に
    // 死んでいない・明示経路が silent に消えていないことの regression guard として維持する。
    assert.equal(
      explicit + fallback, capable,
      `明示 thirdPanelSPlacement 由来 + fallback 由来の合計が capable と一致しない（${explicit} + ${fallback} != ${capable}）`,
    )
    assert.ok(explicit > 0, '明示 thirdPanelSPlacement 経路が corpus 上 1 件も live でない')
    assert.ok(fallback > 0, 'generic fallback 経路が corpus 上 1 件も live でない')
    // U-CR1 6-E: 全 module が Rapid-capable scenario を 1 件以上持つという corpus invariant を
    // permanent guard として追加する。診断性のため欠落 moduleId を特定する。
    const moduleWithoutCapable = ALL_MODULES
      .filter(mod => !(mod.scenarios ?? []).some(isScenarioSReplacementCapable))
      .map(mod => mod.moduleId)
    assert.deepEqual(
      moduleWithoutCapable, [],
      `Rapid-capable scenario を 1 件も持たない module がある: ${moduleWithoutCapable.join(', ')}`,
    )
  })

  test('分離した predicate は context=true の isSReplacementEligible と完全一致する', () => {
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios ?? []) {
        assert.equal(
          isScenarioSReplacementCapable(sc),
          isSReplacementEligible(sc, { thirdPanelEnabled: true }),
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

describe('13. Unit 1 時点の 1剤目限定（RAPID-V2-17）は Unit 4D-4 で撤廃されている（D-4D4-3）', () => {
  test('UI gate は capability AND thirdPanelEnabled の 2 段である（isSingleDrug という第3軸は Unit 4D-4 で撤廃）', () => {
    const caps = capableScenarios()
    assert.ok(caps.length > 0)
    const { sc } = caps[0]
    // thirdPanelEnabled が満たされなければ capable でも表示しない
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: false }), false)
    // capable かつ thirdPanelEnabled=true なら true（複数 ComposeNode が存在していても制限しない）
    assert.equal(isSReplacementEligible(sc, { thirdPanelEnabled: true }), true)
  })

  test('handleSToggle は node Rapid write path を持ち、Unit 4D-4 で production UI から到達可能になった（Unit 4D-3b successor contract）', () => {
    // 4D-3b 以前は「何もしない early return」で node 編集中の 1剤目 S 変更を防いでいた。
    // 4D-3b で node Rapid write path（node branch）が追加され、
    // Unit 4D-4 で isSingleDrug gate が撤廃されて到達可能になった（D-4D4-3）。
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    assert.ok(
      /if \(nodeId !== null\) \{/.test(toggleBlock),
      'node Rapid write path（node branch）が存在しない',
    )
    // isSingleDrug は live code（変数宣言・ThirdPanel への prop 渡し）としては
    // 存在しないことを確認する。historical comment 内の言及は failure 条件にしない（D-4D4-5）。
    assert.equal(
      src.includes('const isSingleDrug ='), false,
      'isSingleDrug が live variable として production contract に残っている（Unit 4D-4 で除去されているはず）',
    )
    assert.equal(
      src.includes('isSingleDrug={'), false,
      'isSingleDrug が ThirdPanel へ prop として渡されている',
    )
    assert.ok(src.includes('activeScenario={addonTargetScenario}'), 'activeScenario={addonTargetScenario} が渡されていない')
    assert.ok(src.includes('rapidState={(activeNode ?? primaryNode).rapid}'), 'rapidState={(activeNode ?? primaryNode).rapid} が渡されていない')
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

  test('コンテキスト破棄経路は rapid: null を明示する（Unit 4C-3: setPrimaryNode 経由）', () => {
    // Unit 4C-3: setRapidState(null) は setPrimaryNode(...) の rapid: null field へ
    // 移った。シナリオ解除 / 薬剤切替 / グループ切替 / Express 確定 / NLP 遷移の
    // 各コンテキスト破棄経路が、引き続き rapid を明示的に null へリセットしている
    // ことを個別に固定する（handleComposeDrugSelect / handleExpressAdd の compose
    // 分岐が持つ「新規 node 初期値としての rapid: null」は対象外）。
    const regions: Array<[string, string, string]> = [
      ['グループ切替', 'const handleSelectGroup = useCallback', 'const buildUpdatedNode = useCallback'],
      ['シナリオ解除（再タップ）', 'const handleSelectScenario = useCallback', 'const handleSelectDrugSuggestion = useCallback'],
      ['薬剤切替', 'const handleSelectDrugSuggestion = useCallback', 'const handleComposeDrugSelect = useCallback'],
      ['S先頭文トグルオフ', 'const handleSToggle = useCallback', 'const handleSubcategorySelect = useCallback'],
      ['Express 確定', 'if (isPrimaryEmpty) {', '} else {'],
      ['NLP 遷移', 'const handleSwitchToNlp = useCallback', 'const handleSwitchToManual = useCallback'],
    ]
    for (const [label, startMarker, endMarker] of regions) {
      const start = src.indexOf(startMarker)
      assert.ok(start >= 0, `${label}: anchor が見つからない (${startMarker})`)
      const end = src.indexOf(endMarker, start)
      assert.ok(end > start, `${label}: 終端 anchor が見つからない (${endMarker})`)
      const region = src.slice(start, end)
      assert.ok(/rapid:\s*null/.test(region), `${label}: rapid: null が見つからない`)
    }
  })
})
