/**
 * ペルソナ状態遷移テスト（H-1 回帰）
 *
 * 監査記録: docs/reviews/CTO_DUE_DILIGENCE_PHASE1_2026-07-25.md §8
 *
 * H-1: ペルソナ ON/OFF トグルで、1剤目の ADDON 文・Rapid S先頭文変更が
 * 本文から無音で消失していたバグ（root cause: rawPrimaryFieldsRef が
 * ADDON/Rapid 反映前の素テキストのまま固定され、persona 再計算の基点になっていた）。
 *
 * Unit 2B（primary deterministic derive migration）により、primary の
 * ADDON strip/re-add と Rapid 先頭文の手動 mutation はいずれも
 * lib/deriveNodeFields.ts の deriveRawFields() へ一本化された。
 * 本ファイルはその production 関数を直接 import して検証する
 * （RAPID-V2-20: production ロジックの mirror 実装は作らない）。
 * Unit 2B 以前に存在した applyAddonTogglePrimaryRaw / applySToggleOnRaw の
 * mirror 実装は撤去済み。
 *
 * 検証項目（監査記録 §8.12 必須回帰 1〜5 + 推奨マトリクスの主要組み合わせ）:
 *   ① シナリオ確定 → ADDON ON → persona ON → OFF の全時点で ADDON 文が本文に残る
 *   ② addonIds（選択状態）と本文の整合
 *   ③ persona ON 時、ADDON 文が変換されて出力される（情報欠損なし・文体一貫）
 *   ④ Rapid S先頭文変更 → persona ON/OFF で S先頭文が維持される
 *   ⑤ personaGuard 保護行（closing）が全ペルソナで無変換
 *   ⑥ 多剤合成（node ブランチ）でも ADDON が persona トグルで保持される
 *
 * 注記（P2-F1・2026-07-25）: Rapidフラグ（副作用なし/コンプライアンス良好の単剤フラグ）は
 * UI未接続の dead code として整理・削除された（歴史的経緯は
 * docs/reviews/PHASE2_STAGE1_R1_REVIEW_2026-07-25.md を参照）。
 * 旧④のフラグ関連テストは削除済み。S先頭文Rapidの検証のみ残す。
 *
 * 実行:
 *   npx tsx --test tests/personaState.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import type { SoapFields, ModuleData, Scenario } from '../lib/types'
import { buildNodeFields } from '../lib/buildSoap'
import { deriveRawFields } from '../lib/deriveNodeFields'
import { buildResolvedSFirstSentence } from '../lib/rapidSentence'
import { applyPersonaToFieldsWithGuard, type PersonaId } from '../lib/applyPersona'
import { derivePersonaGuard, type PersonaGuard } from '../lib/personaGuard'
import oralData from '../data/modules/dm_glp1ra_semaglutide_oral.json' assert { type: 'json' }

const oral = oralData as unknown as ModuleData

function getScenario(mod: ModuleData, id: string): Scenario {
  const sc = mod.scenarios.find(s => s.id === id)
  assert.ok(sc, `scenario not found: ${id} in ${mod.moduleId}`)
  return sc as Scenario
}

/** derivePrimaryDisplayFields（DashboardClient.tsx と同一。React state を持たないため mirror のまま維持） */
function derivePrimaryDisplayFields(
  raw: SoapFields,
  personaEnabled: boolean,
  persona: PersonaId,
  guard: PersonaGuard | null,
): SoapFields {
  if (!personaEnabled || !guard) return raw
  return applyPersonaToFieldsWithGuard(raw, true, persona, guard)
}

// ─────────────────────────────────────────────────────────────
// 固定値
// ─────────────────────────────────────────────────────────────

const DRUG_NAME = 'リベルサス'
const ADDON_KEY = 'addon_se_hypoglycemia_guidance'
const ADDON_RAW_SNIPPET = '低血糖症状が出ることがあります。'
const ADDON_CONCISE_SNIPPET = '低血糖症状が出ることあり。'
const CLOSING_TEXT = '次回、引き続き使用できているか、副作用の有無を確認。'

// ─────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────

describe('① ADDON 文が persona トグルで消失しない（H-1 直接回帰）', () => {
  test('シナリオ確定 → ADDON ON → persona ON → OFF の全時点で ADDON 文が P に存在する', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)

    // 1) シナリオ確定（addonIds=[] で raw を初期化。deriveRawFields(rapid=null) 相当）
    const scenarioRaw = deriveRawFields(scenario, oral, [], null, DRUG_NAME)
    assert.ok(!scenarioRaw.P.includes(ADDON_RAW_SNIPPET), '前提: ADDON未選択時点でADDON文を含まない')

    // 2) ADDON ON（handleAddonToggle primary ブランチ = deriveRawFields(addonIds, rapid)）
    const raw = deriveRawFields(scenario, oral, [ADDON_KEY], null, DRUG_NAME)
    assert.ok(raw.P.includes(ADDON_RAW_SNIPPET), 'ADDON ON直後: raw P に ADDON文が含まれる')

    let display = derivePrimaryDisplayFields(raw, false, 'concise', guard)
    assert.ok(display.P.includes(ADDON_RAW_SNIPPET), 'ADDON ON直後（persona OFF）: 表示 P に ADDON文が含まれる')

    // 3) persona ON（監査記録の再現手順の核心。修正前はここで ADDON 文が消失していた）
    display = derivePrimaryDisplayFields(raw, true, 'concise', guard)
    assert.ok(display.P.includes(ADDON_CONCISE_SNIPPET), 'persona ON後: 表示 P に ADDON文（変換後）が残っている')

    // 4) persona OFF（修正前は無変換に戻るだけで ADDON 文は戻らなかった）
    display = derivePrimaryDisplayFields(raw, false, 'concise', guard)
    assert.ok(display.P.includes(ADDON_RAW_SNIPPET), 'persona OFF後: 表示 P に ADDON文（無変換）が戻る')

    // raw 自体は persona トグルの影響を受けず ADDON 文を保持し続ける
    assert.ok(raw.P.includes(ADDON_RAW_SNIPPET), 'raw ベースは persona トグルで変化しない')
  })

  test('persona ON/OFF を複数回繰り返しても ADDON 文が欠落しない', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const raw = deriveRawFields(scenario, oral, [ADDON_KEY], null, DRUG_NAME)

    for (let i = 0; i < 5; i++) {
      const onDisplay = derivePrimaryDisplayFields(raw, true, 'concise', guard)
      assert.ok(onDisplay.P.includes(ADDON_CONCISE_SNIPPET), `${i}回目 persona ON で ADDON 文が残る`)
      const offDisplay = derivePrimaryDisplayFields(raw, false, 'concise', guard)
      assert.ok(offDisplay.P.includes(ADDON_RAW_SNIPPET), `${i}回目 persona OFF で ADDON 文が残る`)
    }
  })
})

describe('② addonIds（選択状態）と本文の整合', () => {
  test('ADDON OFF に戻すと本文からも ADDON 文が消える', () => {
    const scenario = getScenario(oral, 'initial')

    // ON: addonIds = [ADDON_KEY]
    const onRaw = deriveRawFields(scenario, oral, [ADDON_KEY], null, DRUG_NAME)
    assert.ok(onRaw.P.includes(ADDON_RAW_SNIPPET))

    // OFF: addonIds = []（handleAddonToggle が Set から key を削除した後の状態）
    const offRaw = deriveRawFields(scenario, oral, [], null, DRUG_NAME)
    assert.ok(!offRaw.P.includes(ADDON_RAW_SNIPPET), 'OFF後: raw P から ADDON 文が消える')
    // closing 行は ADDON OFF 後も保持される
    assert.ok(offRaw.P.includes(CLOSING_TEXT), 'OFF後も closing 行は保持される')
  })
})

describe('③ persona ON 時に ADDON 文が変換され、文体が一貫する', () => {
  test('ADDON ON 中に persona を ON にすると、シナリオ本文と ADDON 文の両方が同じペルソナで変換される', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const raw = deriveRawFields(scenario, oral, [ADDON_KEY], null, DRUG_NAME)

    const display = derivePrimaryDisplayFields(raw, true, 'concise', guard)
    // シナリオ本文側の DENSITY 変換
    assert.ok(display.P.includes('副作用が出ることあり。'), 'シナリオ本文の DENSITY 変換が適用される')
    // ADDON 側の DENSITY 変換（修正前は raw に ADDON が無く、この行自体が存在しなかった）
    assert.ok(display.P.includes(ADDON_CONCISE_SNIPPET), 'ADDON 文にも同じ DENSITY 変換が適用される（文体一貫）')
    // 変換後も未変換の ADDON 原文はどこにも残っていない（新旧混在なし）
    assert.ok(!display.P.includes(ADDON_RAW_SNIPPET), '無変換の ADDON 原文が変換後の本文に混在しない')
  })

  test('ADDON ON 直後（persona ON 状態のまま）表示が即座に変換済みになる', () => {
    // ユーザー要件: 「persona ON中にADDON/Rapidが変更された場合も、
    // 現在のペルソナを適用した結果が常に表示される」の直接検証
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)

    const rawAfterAddon = deriveRawFields(scenario, oral, [ADDON_KEY], null, DRUG_NAME)
    // ADDON トグルの直後、persona が既に ON なら display は変換済みで返るべき
    const displayImmediatelyAfterToggle = derivePrimaryDisplayFields(rawAfterAddon, true, 'concise', guard)
    assert.ok(displayImmediatelyAfterToggle.P.includes(ADDON_CONCISE_SNIPPET))
  })
})

describe('④ Rapid S先頭文変更 → persona ON/OFF で S先頭文が維持される', () => {
  test('S先頭文を変更した状態で persona を ON/OFF しても新しい先頭文が保持される', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)

    // production の derive をそのまま使う（RAPID-V2-20）。
    // handleSToggle の Rapid ON 分岐と同一の deriveRawFields 呼び出し。
    const raw = deriveRawFields(
      scenario, oral, [], { previousEvent: 'new_addition', currentOutcome: 'stable' }, DRUG_NAME,
    )
    const NEW_FIRST = buildResolvedSFirstSentence('new_addition', 'stable', DRUG_NAME)
    assert.ok(raw.S.startsWith(NEW_FIRST), '前提: raw の S 先頭文が更新されている')

    const onDisplay = derivePrimaryDisplayFields(raw, true, 'concise', guard)
    assert.ok(onDisplay.S.includes(DRUG_NAME), 'persona ON でも薬剤名（固有名詞）は保持される')
    assert.ok(
      onDisplay.S.startsWith('前回から新しく') || onDisplay.S.includes('使用して'),
      'persona ON でも S 先頭文の変更（新規追加パターン）が保持される',
    )

    const offDisplay = derivePrimaryDisplayFields(raw, false, 'concise', guard)
    assert.equal(offDisplay.S, NEW_FIRST, 'persona OFF では S 先頭文が無変換のまま完全一致する')
  })
})

describe('⑤ personaGuard 保護行（closing）が全ペルソナで無変換', () => {
  test('ADDON 込みの P でも closing 行は 3 ペルソナすべてで無変換', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const raw = deriveRawFields(scenario, oral, [ADDON_KEY], null, DRUG_NAME)

    for (const persona of ['polite', 'concise', 'gentle'] as const) {
      const display = derivePrimaryDisplayFields(raw, true, persona, guard)
      assert.ok(display.P.includes(CLOSING_TEXT), `${persona}: closing 行が無変換のまま含まれる`)
    }
  })
})

describe('⑥ 多剤合成（node ブランチ）でも ADDON が persona トグルで保持される', () => {
  test('node の ADDON 込み rawFields は persona ON/OFF 双方で ADDON 文を保持する', () => {
    // DashboardClient.tsx handleAddonToggle の node ブランチは buildNodeFields の
    // 結果を block.rawFields に ADDON 込みで保存しており、primary ブランチと
    // 同じ deterministic derive をすでに使っている（監査記録 §8.6・Unit 2A/2B 監査で再確認済み）。
    const scenario = getScenario(oral, 'initial')
    const { fields: nodeRaw } = buildNodeFields(scenario, oral, [ADDON_KEY], DRUG_NAME)
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)

    assert.ok(nodeRaw.P.includes(ADDON_RAW_SNIPPET), '前提: node の rawFields に ADDON 文が含まれる')

    const onDisplay = derivePrimaryDisplayFields(nodeRaw, true, 'concise', guard)
    assert.ok(onDisplay.P.includes(ADDON_CONCISE_SNIPPET), 'persona ON: node の ADDON 文が保持される（変換後）')

    const offDisplay = derivePrimaryDisplayFields(nodeRaw, false, 'concise', guard)
    assert.ok(offDisplay.P.includes(ADDON_RAW_SNIPPET), 'persona OFF: node の ADDON 文が保持される（無変換）')
  })
})

describe('⑦ persona 適用の最小プロパティ（H-2 一部: 情報欠損なし・保護行無変換・plain恒等）', () => {
  test('enabled=false のとき applyPersonaToFieldsWithGuard は入力と同一参照を返す', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const raw = deriveRawFields(scenario, oral, [], null, DRUG_NAME)
    const result = applyPersonaToFieldsWithGuard(raw, false, 'concise', guard)
    assert.equal(result, raw, 'enabled=false は raw と同一参照を返す（無変換の保証）')
  })

  test('plain（JSONそのまま）は 3 フィールドとも内容が変化しない', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const raw = deriveRawFields(scenario, oral, [ADDON_KEY], null, DRUG_NAME)
    const result = applyPersonaToFieldsWithGuard(raw, true, 'plain', guard)
    assert.equal(result.S, raw.S, 'plain: S は無変換')
    assert.equal(result.O, raw.O, 'plain: O は無変換')
    assert.equal(result.A, raw.A, 'plain: A は無変換')
    // P は DEBUG_PERSONA_TAGS 用のタグ付与のみ許容し、本文自体は無変換であることを確認する
    assert.ok(result.P.startsWith(raw.P), 'plain: P 本文は無変換（末尾のデバッグタグ以外は raw と同一）')
  })

  test('固有名詞・数値は 3 ペルソナすべてで保持される（情報欠損なし）', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const raw = deriveRawFields(scenario, oral, [], null, DRUG_NAME)
    for (const persona of ['polite', 'concise', 'gentle'] as const) {
      const result = applyPersonaToFieldsWithGuard(raw, true, persona, guard)
      assert.ok(result.S.includes(DRUG_NAME), `${persona}: S に薬剤名が保持される`)
      assert.ok(result.P.includes(DRUG_NAME), `${persona}: P に薬剤名が保持される`)
    }
  })

  test('closing 行は 3 ペルソナすべてで isMedicalRecord により無変換（ADDON なし単剤でも成立）', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const raw = deriveRawFields(scenario, oral, [], null, DRUG_NAME)
    for (const persona of ['polite', 'concise', 'gentle'] as const) {
      const result = applyPersonaToFieldsWithGuard(raw, true, persona, guard)
      assert.ok(result.P.includes(CLOSING_TEXT), `${persona}: closing 行が無変換のまま含まれる`)
    }
  })
})
