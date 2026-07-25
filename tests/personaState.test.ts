/**
 * ペルソナ状態遷移テスト（H-1 回帰）
 *
 * 監査記録: docs/reviews/CTO_DUE_DILIGENCE_PHASE1_2026-07-25.md §8
 *
 * H-1: ペルソナ ON/OFF トグルで、1剤目の ADDON 文・Rapid S先頭文変更が
 * 本文から無音で消失していたバグ（root cause: rawPrimaryFieldsRef が
 * ADDON/Rapid 反映前の素テキストのまま固定され、persona 再計算の基点になっていた）。
 *
 * 本ファイルは DashboardClient.tsx の以下のロジックを純粋関数としてミラーし検証する
 * （tests/stateTransitions.test.ts / tests/mergeBlocks.test.ts と同じ方針:
 *  React hooks を使わず state 遷移を plain object で追う。SoapEditor.tsx 等の
 *  'use client' コンポーネントは CSS module import を含むため直接 import しない）:
 *   - derivePrimaryDisplayFields（H-1 対応で追加したヘルパー）
 *   - handleAddonToggle（primary ブランチの raw/表示 分離ロジック）
 *   - handleSToggle（トグル ON / OFF 両分岐）
 *   - handleFlagChange
 *   - handleAddonToggle（node ブランチ。修正不要だが多剤合成の回帰確認として含める）
 *
 * 検証項目（監査記録 §8.12 必須回帰 1〜5 + 推奨マトリクスの主要組み合わせ）:
 *   ① シナリオ確定 → ADDON ON → persona ON → OFF の全時点で ADDON 文が本文に残る
 *   ② addonIds（選択状態）と本文の整合
 *   ③ persona ON 時、ADDON 文が変換されて出力される（情報欠損なし・文体一貫）
 *   ④ Rapid S先頭文変更 → persona ON/OFF で S先頭文が維持される
 *   ⑤ personaGuard 保護行（closing）が全ペルソナで無変換
 *   ⑥ 多剤合成（node ブランチ）でも ADDON が persona トグルで保持される
 *
 * 実行:
 *   npx tsx --test tests/personaState.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import type { SoapFields, ModuleData, Scenario, SoapKey } from '../lib/types'
import { buildNodeFields } from '../lib/buildSoap'
import { applyPersonaToFieldsWithGuard, type PersonaId } from '../lib/applyPersona'
import { derivePersonaGuard, type PersonaGuard } from '../lib/personaGuard'
import oralData from '../data/modules/dm_glp1ra_semaglutide_oral.json' assert { type: 'json' }

const oral = oralData as unknown as ModuleData

function getScenario(mod: ModuleData, id: string): Scenario {
  const sc = mod.scenarios.find(s => s.id === id)
  assert.ok(sc, `scenario not found: ${id} in ${mod.moduleId}`)
  return sc as Scenario
}

// ─────────────────────────────────────────────────────────────
// DashboardClient.tsx のロジックを純粋関数としてミラー
// ─────────────────────────────────────────────────────────────

const FLAG_LINES = ['副作用は認めない。', 'コンプライアンス良好。'] as const

interface SingleDrugFlags {
  noSideEffect: boolean
  goodCompliance: boolean
}

/** derivePrimaryDisplayFields（DashboardClient.tsx と同一） */
function derivePrimaryDisplayFields(
  raw: SoapFields,
  personaEnabled: boolean,
  persona: PersonaId,
  guard: PersonaGuard | null,
): SoapFields {
  if (!personaEnabled || !guard) return raw
  return applyPersonaToFieldsWithGuard(raw, true, persona, guard)
}

/** resolveClosingText（DashboardClient.tsx と同一） */
function resolveClosingText(
  scenario: Pick<Scenario, 'followupRef' | 'followup'>,
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

/**
 * replaceSFirstSentence（app/components/SoapEditor.tsx と同一）。
 * SoapEditor.tsx は CSS module（layout.module.css）を import するため
 * node:test 実行環境では直接 import せず、純粋関数部分のみローカル複製する。
 */
function replaceSFirstSentence(current: string, newFirst: string): string {
  const dotIdx = current.indexOf('。')
  if (dotIdx === -1) return newFirst
  const rest = current.slice(dotIdx + 1)
  const restTrimmed = rest.replace(/^[\n\r\s]+/, '')
  return restTrimmed ? `${newFirst}\n${restTrimmed}` : newFirst
}

/**
 * handleAddonToggle（primary ブランチ）の raw 更新ロジック。
 * DashboardClient.tsx L1305〜1414（修正後）と同一。
 * {{drug_subject}} は buildNodeFields 呼び出し時点で解決済みの drugName を用いる。
 */
function applyAddonTogglePrimaryRaw(
  rawFields: SoapFields,
  prevAddonIds: Set<string>,
  addonKey: string,
  mod: ModuleData,
  primaryScenario: Scenario,
  drugName: string,
): { rawFields: SoapFields; addonIds: Set<string> } {
  const next = new Set(prevAddonIds)
  next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)
  const newAddonIds = [...next]

  const addonItems = mod.addons?.items ?? {}
  const resolveAddonText = (t: string) => (drugName ? t.replaceAll('{{drug_subject}}', drugName) : t)

  const allAddonTextsBySec = new Map<SoapKey, string[]>()
  for (const key of prevAddonIds) {
    const item = addonItems[key]
    if (!item) continue
    if (item.sectionTexts) {
      for (const sec of ['S', 'A', 'P'] as const) {
        const t = item.sectionTexts[sec]
        if (!t) continue
        const list = allAddonTextsBySec.get(sec) ?? []
        list.push(resolveAddonText(t))
        allAddonTextsBySec.set(sec, list)
      }
    } else {
      const sec = item.targetSection as SoapKey
      const list = allAddonTextsBySec.get(sec) ?? []
      list.push(resolveAddonText(item.text))
      allAddonTextsBySec.set(sec, list)
    }
  }

  const stripped: SoapFields = { S: '', O: '', A: '', P: '' }
  for (const sec of ['S', 'O', 'A', 'P'] as const) {
    let val = rawFields[sec] ?? ''
    for (const addonText of (allAddonTextsBySec.get(sec) ?? [])) {
      const withSep = '\n' + addonText
      val = val.includes(withSep) ? val.replace(withSep, '') : val.replace(addonText, '')
    }
    stripped[sec] = val
  }

  const sectionMap = new Map<SoapKey, string[]>()
  for (const key of newAddonIds) {
    const item = addonItems[key]
    if (!item) continue
    if (item.sectionTexts) {
      for (const sec of ['S', 'A', 'P'] as const) {
        const t = item.sectionTexts[sec]
        if (!t) continue
        if (!sectionMap.has(sec)) sectionMap.set(sec, [])
        sectionMap.get(sec)!.push(resolveAddonText(t))
      }
    } else {
      const sec = item.targetSection as SoapKey
      if (!sectionMap.has(sec)) sectionMap.set(sec, [])
      sectionMap.get(sec)!.push(resolveAddonText(item.text))
    }
  }

  const closingText = resolveClosingText(primaryScenario, mod.defaults)
  const overlaid: SoapFields = { ...stripped }
  for (const [sec, texts] of sectionMap) {
    const block = texts.join('\n')
    if (sec === 'P' && closingText) {
      const withSep = '\n' + closingText
      const withoutClosing = overlaid.P.includes(withSep)
        ? overlaid.P.replace(withSep, '')
        : overlaid.P === closingText
          ? ''
          : overlaid.P
      overlaid.P = withoutClosing
        ? `${withoutClosing}\n${block}\n${closingText}`
        : `${block}\n${closingText}`
    } else {
      overlaid[sec] = overlaid[sec] ? `${overlaid[sec]}\n${block}` : block
    }
  }

  return { rawFields: overlaid, addonIds: next }
}

/** handleSToggle（トグル ON）の raw 更新ロジック。DashboardClient.tsx と同一。 */
function applySToggleOnRaw(rawFields: SoapFields, resolvedFirst: string): SoapFields {
  return { ...rawFields, S: replaceSFirstSentence(rawFields.S, resolvedFirst) }
}

/** フラグ行の付け替え（handleSToggle トグルOFF分岐 / handleFlagChange 共通ロジック） */
function applyFlagLinesToRaw(rawFields: SoapFields, flags: SingleDrugFlags): SoapFields {
  const rawLines = rawFields.S.split('\n').filter(l => !(FLAG_LINES as readonly string[]).includes(l.trim()))
  if (flags.noSideEffect)   rawLines.push('副作用は認めない。')
  if (flags.goodCompliance) rawLines.push('コンプライアンス良好。')
  return { ...rawFields, S: rawLines.join('\n') }
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

    // 1) シナリオ確定（addonIds=[] で raw を初期化。DashboardClient.tsx L818 相当）
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)
    assert.ok(!scenarioRaw.P.includes(ADDON_RAW_SNIPPET), '前提: ADDON未選択時点でADDON文を含まない')

    // 2) ADDON ON
    const afterAddon = applyAddonTogglePrimaryRaw(scenarioRaw, new Set(), ADDON_KEY, oral, scenario, DRUG_NAME)
    const raw = afterAddon.rawFields
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
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)
    const { rawFields: raw } = applyAddonTogglePrimaryRaw(scenarioRaw, new Set(), ADDON_KEY, oral, scenario, DRUG_NAME)

    for (let i = 0; i < 5; i++) {
      const onDisplay = derivePrimaryDisplayFields(raw, true, 'concise', guard)
      assert.ok(onDisplay.P.includes(ADDON_CONCISE_SNIPPET), `${i}回目 persona ON で ADDON 文が残る`)
      const offDisplay = derivePrimaryDisplayFields(raw, false, 'concise', guard)
      assert.ok(offDisplay.P.includes(ADDON_RAW_SNIPPET), `${i}回目 persona OFF で ADDON 文が残る`)
    }
  })
})

describe('② addonIds（選択状態）と本文の整合', () => {
  test('ADDON OFF に戻すと addonIds から key が消え、本文からも ADDON 文が消える', () => {
    const scenario = getScenario(oral, 'initial')
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)

    const on = applyAddonTogglePrimaryRaw(scenarioRaw, new Set(), ADDON_KEY, oral, scenario, DRUG_NAME)
    assert.ok(on.addonIds.has(ADDON_KEY))
    assert.ok(on.rawFields.P.includes(ADDON_RAW_SNIPPET))

    const off = applyAddonTogglePrimaryRaw(on.rawFields, on.addonIds, ADDON_KEY, oral, scenario, DRUG_NAME)
    assert.ok(!off.addonIds.has(ADDON_KEY), 'OFF後: addonIds から key が消える')
    assert.ok(!off.rawFields.P.includes(ADDON_RAW_SNIPPET), 'OFF後: raw P から ADDON 文が消える')
    // closing 行は ADDON OFF 後も保持される
    assert.ok(off.rawFields.P.includes(CLOSING_TEXT), 'OFF後も closing 行は保持される')
  })
})

describe('③ persona ON 時に ADDON 文が変換され、文体が一貫する', () => {
  test('ADDON ON 中に persona を ON にすると、シナリオ本文と ADDON 文の両方が同じペルソナで変換される', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)
    const { rawFields: raw } = applyAddonTogglePrimaryRaw(scenarioRaw, new Set(), ADDON_KEY, oral, scenario, DRUG_NAME)

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
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)

    const { rawFields: rawAfterAddon } = applyAddonTogglePrimaryRaw(scenarioRaw, new Set(), ADDON_KEY, oral, scenario, DRUG_NAME)
    // ADDON トグルの直後、persona が既に ON なら display は変換済みで返るべき
    const displayImmediatelyAfterToggle = derivePrimaryDisplayFields(rawAfterAddon, true, 'concise', guard)
    assert.ok(displayImmediatelyAfterToggle.P.includes(ADDON_CONCISE_SNIPPET))
  })
})

describe('④ Rapid S先頭文変更 → persona ON/OFF で S先頭文が維持される', () => {
  test('S先頭文を変更した状態で persona を ON/OFF しても新しい先頭文が保持される', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)

    const NEW_FIRST = `前回から新しく${DRUG_NAME}を使用して症状は落ち着いている。`
    const raw = applySToggleOnRaw(scenarioRaw, NEW_FIRST)
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

  test('フラグ ON → persona ON/OFF でもフラグ行の情報が S に残る（persona OFF は完全一致）', () => {
    // 注意: 「副作用は認めない。」は concise ペルソナの DENSITY_RULES により
    // 「副作用は認めず。」へ文体変換される（applyPersona.ts の既存仕様。H-1 の対象外）。
    // ここで検証すべきは「情報欠損なく残ること」であり「無変換のまま残ること」ではない
    // （closing 行のような isMedicalRecord 保護対象ではないため）。
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)

    const raw = applyFlagLinesToRaw(scenarioRaw, { noSideEffect: true, goodCompliance: false })
    assert.ok(raw.S.includes('副作用は認めない。'), '前提: raw にフラグ行が含まれる')

    const onDisplay = derivePrimaryDisplayFields(raw, true, 'concise', guard)
    assert.ok(onDisplay.S.includes('副作用は認め'), 'persona ON でもフラグ行の情報（欠損なし）が残る')

    const offDisplay = derivePrimaryDisplayFields(raw, false, 'concise', guard)
    assert.ok(offDisplay.S.includes('副作用は認めない。'), 'persona OFF ではフラグ行が無変換のまま完全一致で残る')
  })
})

describe('⑤ personaGuard 保護行（closing）が全ペルソナで無変換', () => {
  test('ADDON 込みの P でも closing 行は 3 ペルソナすべてで無変換', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const { fields: scenarioRaw } = buildNodeFields(scenario, oral, [], DRUG_NAME)
    const { rawFields: raw } = applyAddonTogglePrimaryRaw(scenarioRaw, new Set(), ADDON_KEY, oral, scenario, DRUG_NAME)

    for (const persona of ['polite', 'concise', 'gentle'] as const) {
      const display = derivePrimaryDisplayFields(raw, true, persona, guard)
      assert.ok(display.P.includes(CLOSING_TEXT), `${persona}: closing 行が無変換のまま含まれる`)
    }
  })
})

describe('⑥ 多剤合成（node ブランチ）でも ADDON が persona トグルで保持される', () => {
  test('node の ADDON 込み rawFields は persona ON/OFF 双方で ADDON 文を保持する', () => {
    // DashboardClient.tsx handleAddonToggle の node ブランチ（L1284〜1298）は
    // buildNodeFields の結果を block.rawFields に ADDON 込みで保存しており、
    // primary ブランチと異なり修正不要（監査記録 §8.6）。回帰確認として残す。
    const scenario = getScenario(oral, 'initial')
    const { fields: nodeRaw, guard: _unused } = (() => {
      const fields = buildNodeFields(scenario, oral, [ADDON_KEY], DRUG_NAME)
      const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
      return { fields: fields.fields, guard }
    })()
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
    const { fields: raw } = buildNodeFields(scenario, oral, [], DRUG_NAME)
    const result = applyPersonaToFieldsWithGuard(raw, false, 'concise', guard)
    assert.equal(result, raw, 'enabled=false は raw と同一参照を返す（無変換の保証）')
  })

  test('plain（JSONそのまま）は 3 フィールドとも内容が変化しない', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const { fields: raw } = buildNodeFields(scenario, oral, [ADDON_KEY], DRUG_NAME)
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
    const { fields: raw } = buildNodeFields(scenario, oral, [], DRUG_NAME)
    for (const persona of ['polite', 'concise', 'gentle'] as const) {
      const result = applyPersonaToFieldsWithGuard(raw, true, persona, guard)
      assert.ok(result.S.includes(DRUG_NAME), `${persona}: S に薬剤名が保持される`)
      assert.ok(result.P.includes(DRUG_NAME), `${persona}: P に薬剤名が保持される`)
    }
  })

  test('closing 行は 3 ペルソナすべてで isMedicalRecord により無変換（ADDON なし単剤でも成立）', () => {
    const scenario = getScenario(oral, 'initial')
    const guard = derivePersonaGuard(scenario, oral.template?.urgentFlag)
    const { fields: raw } = buildNodeFields(scenario, oral, [], DRUG_NAME)
    for (const persona of ['polite', 'concise', 'gentle'] as const) {
      const result = applyPersonaToFieldsWithGuard(raw, true, persona, guard)
      assert.ok(result.P.includes(CLOSING_TEXT), `${persona}: closing 行が無変換のまま含まれる`)
    }
  })
})
