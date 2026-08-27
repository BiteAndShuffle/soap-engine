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
import fs from 'node:fs'
import path from 'node:path'

import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'

import { ALL_MODULES } from '../data/modules/index'
import type { Scenario } from '../lib/types'

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

// ─────────────────────────────────────────────────────────────
// 薬剤固有 ADDON の canonical 契約
//
// 共通 adherence テンプレートから外れる「薬剤固有介入」は現在 3 module のみ
// （第2段階の全数調査で確定）。この 3 件は Amber accent と専用 uiGroup で
// 共通支援 ADDON と区別され、P_ADDON の先頭に置かれる。
//
// bridge が内容の正本であるため（DP-07）、canonical だけが変わって bridge と
// 乖離することがないよう、bridge の ADDON ヘッダーとも突き合わせる。
// なお id / 順序 / 本文の bridge⇔canonical 一致は
// scripts/audit-addon-bridge-chain.ts が担当し、本テストは
// 同 audit の検査対象外である title / uiGroup / uiVariant を固定する。
// ─────────────────────────────────────────────────────────────

/** 薬剤固有 ADDON の期待値（moduleId → 契約） */
const DRUG_SPECIFIC_ADDON: Record<string, { key: string; title: string }> = {
  dm_glinide_oral: {
    key: 'addon_glinide_before_meal_guidance',
    title: 'グリニド服用タイミング',
  },
  dm_alpha_glucosidase_inhibitor_oral: {
    key: 'addon_alpha_gi_before_meal_guidance',
    title: 'αグルコシダーゼ服用タイミング',
  },
  dm_glinide_alpha_glucosidase_inhibitor_combination_oral: {
    key: 'addon_glinide_alpha_gi_before_meal_guidance',
    title: 'グルベス服用タイミング',
  },
}

const SPECIFIC_UI_GROUP = '薬剤固有介入'
const SPECIFIC_UI_VARIANT = 'rightAccentAmber'

/** bridge の 【ADDON｜…｜id=<key>｜…】 ヘッダー属性を取り出す */
function bridgeAddonHeader(moduleId: string, key: string): Record<string, string> | null {
  const txt = fs.readFileSync(path.resolve('./bridges', `${moduleId}.md`), 'utf-8')
  for (const raw of txt.split('\n')) {
    const m = raw.trim().match(/^【ADDON｜(.+?)】$/)
    if (!m) continue
    const attrs: Record<string, string> = {}
    for (const kv of m[1].split('｜')) {
      const i = kv.indexOf('=')
      if (i > 0) attrs[kv.slice(0, i)] = kv.slice(i + 1)
    }
    if (attrs.id === key) return attrs
  }
  return null
}

describe('薬剤固有 ADDON の canonical 契約（Amber / 薬剤固有介入）', () => {
  for (const [moduleId, expected] of Object.entries(DRUG_SPECIFIC_ADDON)) {
    test(`${moduleId}: id / title / uiGroup / uiVariant / P_ADDON 先頭`, () => {
      const mod = ALL_MODULES.find(m => m.moduleId === moduleId)
      assert.ok(mod, `${moduleId} が registry に存在しない`)

      const item = mod!.addons?.items?.[expected.key]
      assert.ok(item, `${moduleId}: ${expected.key} が addons.items に存在しない`)
      assert.equal(item!.key, expected.key, 'key がマップキーと一致すること')
      assert.equal(item!.id, expected.key, 'id がマップキーと一致すること')
      assert.equal(item!.title, expected.title)
      assert.equal(item!.uiGroup, SPECIFIC_UI_GROUP)
      assert.equal(item!.uiVariant, SPECIFIC_UI_VARIANT)

      const sc = mod!.scenarios.find(s => s.id === 'cp_poor_missed_doses')
      assert.ok(sc, `${moduleId}: cp_poor_missed_doses が存在しない`)
      assert.equal(
        sc!.addonsRef?.P?.[0],
        expected.key,
        '薬剤固有 ADDON は P_ADDON の先頭に置く（共通 ADDON 群へ埋もれさせない）',
      )
    })

    test(`${moduleId}: bridge の ADDON ヘッダーと canonical が一致する`, () => {
      const h = bridgeAddonHeader(moduleId, expected.key)
      assert.ok(h, `${moduleId}: bridge に ${expected.key} の ADDON ヘッダーが無い`)
      assert.equal(h!.title, expected.title, 'title が bridge と一致すること')
      assert.equal(h!.uiGroup, SPECIFIC_UI_GROUP, 'uiGroup が bridge と一致すること')
      assert.equal(h!.uiVariant, SPECIFIC_UI_VARIANT, 'uiVariant が bridge と一致すること')
    })
  }

  test('Amber は薬剤固有 ADDON 契約の対象以外へ展開されていない', () => {
    const unexpected: string[] = []
    const allowed = new Set([
      ...Object.values(DRUG_SPECIFIC_ADDON).map(v => v.key),
      ...ADMIN_SPECIFIC_ENTRIES.map(e => e.addon.key),
    ])
    for (const mod of ALL_MODULES) {
      for (const [key, item] of Object.entries(mod.addons?.items ?? {})) {
        if (item.uiVariant === SPECIFIC_UI_VARIANT && !allowed.has(key)) {
          unexpected.push(`${mod.moduleId}.${key}`)
        }
      }
    }
    assert.deepEqual(unexpected, [], `Amber の適用対象は本契約に列挙した ${allowed.size} 件のみ:\n  ${unexpected.join('\n  ')}`)
  })
})

// ─────────────────────────────────────────────────────────────
// 薬剤固有 ADDON の canonical 契約（Amber / administration_guidance 系）
//
// 第3段階の全数調査（2026-08-18, Opus read-only 調査 → Owner確定）で追加された
// 4 ADDON。上の「adherence_guidance 系」（グリニド3件・cp_poor_missed_doses 先頭）
// とは前提が異なるため、意図的に別契約として分離する:
//
//   - type は administration_guidance（adherence_guidance ではない）
//   - requiredTags による条件表示 ADDON であり、対象ブランド以外では非表示になる
//   - 参照 scenario は cp_poor_missed_doses ではなく initial 系のみ
//   - 「Amber = P_ADDON 先頭」という一般化はここでは要求しない
//     （Amber化と scenario 参照の変更は別判断であり、今回は参照位置を一切変えていない）
//
// 本契約が固定するのは、Owner確定の id/title/uiGroup/uiVariant/requiredTags と、
// 既存の scenario 参照位置が Amber化前後で変わっていないことのみである。
// ─────────────────────────────────────────────────────────────

type AdminSpecificAddon = {
  key: string
  title: string
  requiredTags: string[]
  /** 既存の参照 scenario と P_ADDON 内インデックス（Amber化で変更していないことの固定） */
  scenarioPositions: Array<{ scenarioId: string; index: number }>
}

const H1_SECOND_GEN_SCENARIOS = [
  'initial_nasal',
  'initial_pruritus',
  'dose_increase_low_perceived_effect',
  'dose_increase_due_to_other_med_adjustment',
  'restart_nasal',
  'restart_pruritus',
  'external_start_nasal',
  'external_start_pruritus',
]

const ADMIN_SPECIFIC_ENTRIES: Array<{ moduleId: string; addon: AdminSpecificAddon }> = [
  {
    moduleId: 'dm_dpp4_oral',
    addon: {
      key: 'addon_weekly_dpp4_admin',
      title: '週1回DPP-4阻害薬 服用方法',
      requiredTags: ['weekly_dpp4'],
      scenarioPositions: [
        { scenarioId: 'initial', index: 3 },
        { scenarioId: 'restart', index: 3 },
        { scenarioId: 'external_start', index: 3 },
      ],
    },
  },
  {
    moduleId: 'dm_glp1ra_semaglutide_oral',
    addon: {
      key: 'addon_ribelsus_admin',
      title: 'リベルサス服用方法',
      requiredTags: ['ribelsus'],
      scenarioPositions: [
        { scenarioId: 'initial', index: 0 },
        { scenarioId: 'restart', index: 0 },
        { scenarioId: 'external_start', index: 0 },
      ],
    },
  },
  {
    moduleId: 'allergy_h1_antihistamine_second_gen_oral',
    addon: {
      key: 'addon_bilastine_admin',
      title: 'ビラノア服用タイミング',
      requiredTags: ['bilastine'],
      scenarioPositions: H1_SECOND_GEN_SCENARIOS.map(scenarioId => ({ scenarioId, index: 1 })),
    },
  },
  {
    moduleId: 'allergy_h1_antihistamine_second_gen_oral',
    addon: {
      key: 'addon_fexofenadine_admin',
      title: 'アレグラ服用時の注意',
      requiredTags: ['fexofenadine'],
      scenarioPositions: H1_SECOND_GEN_SCENARIOS.map(scenarioId => ({ scenarioId, index: 2 })),
    },
  },
]

describe('薬剤固有 ADDON の canonical 契約（Amber / administration_guidance 系）', () => {
  for (const { moduleId, addon } of ADMIN_SPECIFIC_ENTRIES) {
    test(`${moduleId}.${addon.key}: id / title / uiGroup / uiVariant / requiredTags`, () => {
      const mod = ALL_MODULES.find(m => m.moduleId === moduleId)
      assert.ok(mod, `${moduleId} が registry に存在しない`)

      const item = mod!.addons?.items?.[addon.key]
      assert.ok(item, `${moduleId}: ${addon.key} が addons.items に存在しない`)
      assert.equal(item!.key, addon.key, 'key がマップキーと一致すること')
      assert.equal(item!.id, addon.key, 'id がマップキーと一致すること')
      assert.equal(item!.title, addon.title)
      assert.equal(item!.uiGroup, SPECIFIC_UI_GROUP)
      assert.equal(item!.uiVariant, SPECIFIC_UI_VARIANT)
      assert.deepEqual(item!.requiredTags, addon.requiredTags, 'requiredTags が維持されていること')
    })

    test(`${moduleId}.${addon.key}: 既存 scenario 参照位置が変更されていない`, () => {
      const mod = ALL_MODULES.find(m => m.moduleId === moduleId)
      assert.ok(mod, `${moduleId} が registry に存在しない`)
      for (const { scenarioId, index } of addon.scenarioPositions) {
        const sc: Scenario | undefined = mod!.scenarios.find(s => s.id === scenarioId)
        assert.ok(sc, `${moduleId}: scenario ${scenarioId} が存在しない`)
        assert.equal(
          sc!.addonsRef?.P?.[index],
          addon.key,
          `${moduleId}/${scenarioId}: ${addon.key} の P_ADDON 位置(${index}) が Amber化前から変更されている`,
        )
      }
    })

    test(`${moduleId}.${addon.key}: bridge の ADDON ヘッダーと canonical が一致する`, () => {
      const h = bridgeAddonHeader(moduleId, addon.key)
      assert.ok(h, `${moduleId}: bridge に ${addon.key} の ADDON ヘッダーが無い`)
      assert.equal(h!.title, addon.title, 'title が bridge と一致すること')
      assert.equal(h!.uiGroup, SPECIFIC_UI_GROUP, 'uiGroup が bridge と一致すること')
      assert.equal(h!.uiVariant, SPECIFIC_UI_VARIANT, 'uiVariant が bridge と一致すること')
      assert.equal(
        h!.requiredTags,
        `[${addon.requiredTags.join(', ')}]`,
        'requiredTags が bridge と一致すること',
      )
    })
  }
})

// ─────────────────────────────────────────────────────────────
// route別 adherence 標準ADDON の canonical 契約
//
// 対象は「薬剤固有例外を除いた 30 module」（内服16・注射10・外用4）。
// この 30 module は cp_poor_missed_doses の adherence ADDON 構成を
// route内で完全に共通化する標準化作業（一括 bridge 修正 → canonical 反映）を
// 経ており、その結果を機械的に固定する。新しい仕様の宣言ではない。
//
// 除外 5 module（グリニド系3・H1点眼・旧chemical mediator点眼）はこの契約に含めない:
//   - グリニド系3 module は薬剤固有 ADDON を持つ別契約として本ファイル冒頭の
//     「薬剤固有 ADDON の canonical 契約」で既に保護されている
//   - H1点眼は比較基準として使用したのみで bridge/canonical とも今回変更していない
//   - 旧chemical mediator点眼は将来 H1 bridge ベースで再構築予定のため対象外
//
// ── 何を固定しないか ────────────────────────────────────────────
//
// P_APPEND全文・S/O/A/P/P_CLOSING全文の bridge⇔canonical 一致は
// scripts/audit-addon-bridge-chain.ts が既に担保しており、本テストでは重複固定しない。
// 本テストが埋める空白は「30 module が route別標準構造を維持していること」の
// 回帰保護であり、addonsRef.P の件数・ID・順序と、各ADDONの id/title/uiGroup/uiVariant
// のみを対象とする。
//
// orderPresets（例: cp_poor_missed_doses_default）の参照整合性は
// lib/moduleValidator.ts check 7c（ORDERPRESETS の addons.items 参照切れ検査、ERROR）と
// tests/moduleValidator.test.ts の全module baselineで既に機械的に保護されているため、
// 本テストでは扱わない。
// ─────────────────────────────────────────────────────────────

type RouteAddonDef = { title: string; uiGroup: string; uiVariant: string }

/** route別 adherence ADDON 標準（30 module の canonical 実測値をそのまま転記） */
const ROUTE_STANDARD: Record<string, { order: string[]; defs: Record<string, RouteAddonDef> }> = {
  oral: {
    order: [
      'addon_adherence_notification_alarm',
      'addon_adherence_notification_app',
      'addon_adherence_visual_calendar_checklist',
      'addon_adherence_visual_note',
      'addon_adherence_prep_previous_night',
      'addon_adherence_prep_before_meal',
      'addon_adherence_family_support_reminder',
    ],
    defs: {
      addon_adherence_notification_alarm: { title: 'アラーム', uiGroup: '通知', uiVariant: 'rightAccentBlue' },
      addon_adherence_notification_app: { title: '服薬アプリ', uiGroup: '通知', uiVariant: 'rightAccentBlue' },
      addon_adherence_visual_calendar_checklist: { title: 'お薬カレンダー・チェックリスト', uiGroup: '視覚化', uiVariant: 'rightAccentLavender' },
      addon_adherence_visual_note: { title: '貼り紙', uiGroup: '視覚化', uiVariant: 'rightAccentLavender' },
      addon_adherence_prep_previous_night: { title: '前夜に準備', uiGroup: '事前準備', uiVariant: 'rightAccentBlue' },
      addon_adherence_prep_before_meal: { title: '食前に準備', uiGroup: '事前準備', uiVariant: 'rightAccentBlue' },
      addon_adherence_family_support_reminder: { title: '家族などの声掛け', uiGroup: '家族の支援', uiVariant: 'rightAccentLavender' },
    },
  },
  injection: {
    order: [
      'addon_adherence_notification_alarm',
      'addon_adherence_notification_app',
      'addon_adherence_visual_calendar_checklist',
      'addon_adherence_visual_note',
      'addon_adherence_schedule_confirmation',
      'addon_adherence_family_support_reminder',
    ],
    defs: {
      addon_adherence_notification_alarm: { title: 'アラーム', uiGroup: '通知', uiVariant: 'rightAccentBlue' },
      addon_adherence_notification_app: { title: '記録アプリ', uiGroup: '通知', uiVariant: 'rightAccentBlue' },
      addon_adherence_visual_calendar_checklist: { title: 'カレンダー・チェックリスト', uiGroup: '視覚化', uiVariant: 'rightAccentLavender' },
      addon_adherence_visual_note: { title: '貼り紙', uiGroup: '視覚化', uiVariant: 'rightAccentLavender' },
      addon_adherence_schedule_confirmation: { title: '使用予定を確認', uiGroup: '事前準備', uiVariant: 'rightAccentBlue' },
      addon_adherence_family_support_reminder: { title: '家族などの声掛け', uiGroup: '家族の支援', uiVariant: 'rightAccentLavender' },
    },
  },
  topical: {
    order: [
      'addon_adherence_notification_alarm',
      'addon_adherence_notification_app',
      'addon_adherence_visual_checklist',
      'addon_adherence_visual_note',
      'addon_adherence_schedule_confirmation',
      'addon_adherence_routine_link',
      'addon_adherence_family_support_reminder',
    ],
    defs: {
      addon_adherence_notification_alarm: { title: 'アラーム', uiGroup: '通知', uiVariant: 'rightAccentBlue' },
      addon_adherence_notification_app: { title: '記録アプリ', uiGroup: '通知', uiVariant: 'rightAccentBlue' },
      addon_adherence_visual_checklist: { title: 'チェックリスト', uiGroup: '視覚化', uiVariant: 'rightAccentLavender' },
      addon_adherence_visual_note: { title: '貼り紙', uiGroup: '視覚化', uiVariant: 'rightAccentLavender' },
      addon_adherence_schedule_confirmation: { title: '使用予定を確認', uiGroup: '事前準備', uiVariant: 'rightAccentBlue' },
      addon_adherence_routine_link: { title: '生活習慣と結びつける', uiGroup: '習慣化', uiVariant: 'rightAccentBlue' },
      addon_adherence_family_support_reminder: { title: '家族などの声掛け', uiGroup: '家族の支援', uiVariant: 'rightAccentLavender' },
    },
  },
}

/** route別標準の対象外（薬剤固有例外・比較基準・再構築予定） */
const ROUTE_STANDARD_EXCLUDED = new Set([
  'dm_glinide_oral',
  'dm_alpha_glucosidase_inhibitor_oral',
  'dm_glinide_alpha_glucosidase_inhibitor_combination_oral',
  'allergy_h1_antihistamine_eye_drops',
  'allergy_chemical_mediator_release_inhibitor_eye_drops',
])

/** 廃止済みの旧ID。route別標準対象 module に残っていてはならない */
const LEGACY_ADHERENCE_IDS = [
  'addon_adherence_reminder_alarm',
  'addon_adherence_reminder_app',
  'addon_adherence_support_family_reminder',
]

function routeStandardTargets(route: string): typeof ALL_MODULES[number][] {
  return ALL_MODULES.filter(m => m.drug?.route === route && !ROUTE_STANDARD_EXCLUDED.has(m.moduleId))
}

describe('route別 adherence 標準ADDON の canonical 契約（corpus-derived invariant・U-CR1）', () => {
  test('対象module数が想定どおりである（テストの空振り防止）', () => {
    const counts = {
      oral: routeStandardTargets('oral').length,
      injection: routeStandardTargets('injection').length,
      topical: routeStandardTargets('topical').length,
    }
    // U-CR1: exact count（旧 oral 16 / injection 10 / topical 4）は仕様値として使用しない。
    // 各 route が 1 件以上（空振り防止）であることと、3 route の合計が
    // 「対象 route かつ除外リスト外」という述語から corpus 上導出できる件数と
    // 一致すること（loop-completeness / 二重計上や取りこぼしがないこと）を守る。
    for (const [route, n] of Object.entries(counts)) {
      assert.ok(n > 0, `route=${route} の対象 module が 0 件（test が空振り）`)
    }
    const derivedTotal = ALL_MODULES.filter(m =>
      ['oral', 'injection', 'topical'].includes(m.drug?.route ?? '') &&
      !ROUTE_STANDARD_EXCLUDED.has(m.moduleId),
    ).length
    const countedTotal = counts.oral + counts.injection + counts.topical
    assert.equal(
      countedTotal, derivedTotal,
      `route別集計の合計が corpus 導出値と一致しない: ${JSON.stringify(counts)}（合計 ${countedTotal}） vs ${derivedTotal}`,
    )
  })

  test('除外5 moduleがこの契約の対象に含まれていない', () => {
    const allTargets = [...routeStandardTargets('oral'), ...routeStandardTargets('injection'), ...routeStandardTargets('topical')].map(m => m.moduleId)
    const leaked = [...ROUTE_STANDARD_EXCLUDED].filter(id => allTargets.includes(id))
    assert.deepEqual(leaked, [], `除外対象が誤って含まれている: ${leaked.join(', ')}`)
  })

  for (const route of ['oral', 'injection', 'topical'] as const) {
    const standard = ROUTE_STANDARD[route]

    describe(`route=${route}`, () => {
      for (const mod of routeStandardTargets(route)) {
        test(`${mod.moduleId}: cp_poor_missed_doses.addonsRef.P が route標準と完全一致（件数・ID・順序）`, () => {
          const sc = mod.scenarios.find(s => s.id === 'cp_poor_missed_doses')
          assert.ok(sc, `${mod.moduleId}: cp_poor_missed_doses が存在しない`)
          assert.deepEqual(
            sc!.addonsRef?.P,
            standard.order,
            `${mod.moduleId}: addonsRef.P が route標準と不一致`,
          )
        })

        test(`${mod.moduleId}: 標準ADDON全件が実在し id/title/uiGroup/uiVariant が route標準と一致`, () => {
          const items = mod.addons?.items ?? {}
          const mismatches: string[] = []
          for (const [id, expected] of Object.entries(standard.defs)) {
            const item = items[id]
            if (!item) { mismatches.push(`${id}: addons.items に不在`); continue }
            if (item.id !== id) mismatches.push(`${id}: item.id 不一致 (${item.id})`)
            if (item.title !== expected.title) mismatches.push(`${id}: title 不一致 (${item.title})`)
            if (item.uiGroup !== expected.uiGroup) mismatches.push(`${id}: uiGroup 不一致 (${item.uiGroup})`)
            if (item.uiVariant !== expected.uiVariant) mismatches.push(`${id}: uiVariant 不一致 (${item.uiVariant})`)
          }
          assert.deepEqual(mismatches, [], `${mod.moduleId}:\n  ${mismatches.join('\n  ')}`)
        })

        test(`${mod.moduleId}: 旧ID（reminder_alarm / reminder_app / support_family_reminder）が残存しない`, () => {
          const items = mod.addons?.items ?? {}
          const residual = LEGACY_ADHERENCE_IDS.filter(id => id in items)
          assert.deepEqual(residual, [], `${mod.moduleId}: 旧IDが残存: ${residual.join(', ')}`)
        })
      }
    })
  }

  test('検出ロジックの健全性: 規定外の addonsRef.P は不一致として検出される', () => {
    // 実データではなく意図的に壊した値で、検査が実際に差分を捕まえることを確認する
    const sample = routeStandardTargets('oral')[0]
    const sc = sample.scenarios.find(s => s.id === 'cp_poor_missed_doses')!
    const broken = [...sc.addonsRef!.P!].reverse()
    assert.notDeepEqual(broken, ROUTE_STANDARD.oral.order, '順序を破壊した配列は標準と不一致として検出されなければならない')
  })
})

// ─────────────────────────────────────────────────────────────
// adherence_good → Rapid metadata contract（P-R2）
//
// ── 背景（新しい規則は追加していない）─────────────────────────────────
//
// 「CP良好 → adherence_good」という classification は本ファイル冒頭の契約が既に
// 機械的に担保している。本節が追加で担保するのは、その classification 結果が
// scenarioTags の literal "good" として決定的に写像されていることである。
// 宣言元は prompts/vNext/PN3B-Scenario-Metadata-Apply.md「scenarioTags の自動生成
// ルール」MUST 節（P-R2 で追加）。本テストはその MUST を機械的に担保する層に
// すぎず、新しい clinical rule を導入しない。
//
// ── なぜ機械層が必要か ───────────────────────────────────────────────
//
// lib/isSReplacementEligible.ts の isScenarioSReplacementCapable() は、
// thirdPanelSPlacement が明示されない scenario に対して generic fallback で
// eligibility を判定する。fallback ③ は
//   scenarioType === "adherence" && scenarioTags.includes("good")
// を要求する。scenarioTags に "good" が欠落しても ERROR も WARNING も出ず、
// 当該 scenario の Rapid（S置換UI）が無検出のまま失われる。この欠落を検出する
// validator / audit / 既存 test は存在しない（P-R2 Repository 実測）。
//
// ── 既知の限界（P-R2 scope外）─────────────────────────────────────────
//
// 本テストは corpus / production helper の契約を検証するものであり、
// prompts/vNext/PN3B-Scenario-Metadata-Apply.md の MUST 節本文そのものを
// source-anchor 化しない（PN3B の prompt text を正規表現等で固定しない）。
// したがって PN3B の MUST 節が将来削除・改変されても本テストは直接には
// 検出できない。P-R2 はこれを意図的な責務分離とする（prompt contract の
// 自己保護は本 Unit の scope 外）。
// ─────────────────────────────────────────────────────────────

describe('adherence_good → Rapid metadata 契約（scenarioTags "good"・P-R2）', () => {
  /** corpus 上の adherence_good scenario を module 込みで列挙する */
  function adherenceGoodScenarios(): Array<{ moduleId: string; sc: Scenario }> {
    const out: Array<{ moduleId: string; sc: Scenario }> = []
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios ?? []) {
        if (sc.scenarioGroup === 'adherence_good') out.push({ moduleId: mod.moduleId, sc })
      }
    }
    return out
  }

  test('T-1: scenarioGroup="adherence_good" の scenario が corpus に1件以上存在し、走査に取りこぼしがない', () => {
    const found = adherenceGoodScenarios()
    assert.ok(found.length > 0, 'adherence_good scenario が corpus に1件も無い（test が空振り）')

    // loop completeness: 直接フィルタした結果と再走査した結果が一致すること
    let recount = 0
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios ?? []) {
        if (sc.scenarioGroup === 'adherence_good') recount++
      }
    }
    assert.equal(recount, found.length, '走査結果が再走査と一致しない（loop の取りこぼし）')
  })

  test('T-2: 全 adherence_good scenario が isScenarioSReplacementCapable() で true になる', () => {
    const violations: string[] = []
    for (const { moduleId, sc } of adherenceGoodScenarios()) {
      if (!isScenarioSReplacementCapable(sc)) violations.push(`${moduleId}.${sc.id}`)
    }
    assert.deepEqual(
      violations, [],
      `adherence_good だが Rapid capable ではない scenario がある:\n  ${violations.join('\n  ')}`,
    )
  })

  test('T-3: explicit thirdPanelSPlacement を持たない adherence_good scenario は scenarioTags に "good" を含む', () => {
    // explicit scenario（thirdPanelSPlacement 明示済み）は対象外とする。
    // canonical は今回変更しない（Owner Decision OD-PR2-1: 見送り）ため、
    // 既存 explicit scenario のタグ形状の統一はこのテストの対象にしない。
    const violations: string[] = []
    for (const { moduleId, sc } of adherenceGoodScenarios()) {
      if (sc.thirdPanelSPlacement !== undefined) continue
      const tags = sc.scenarioTags ?? []
      if (!tags.includes('good')) violations.push(`${moduleId}.${sc.id}`)
    }
    assert.deepEqual(
      violations, [],
      `explicit thirdPanelSPlacement を持たない adherence_good scenario で "good" タグが欠落:\n  ${violations.join('\n  ')}`,
    )
  })

  test('T-4: scenarioTags に "good" を持つ scenario は scenarioGroup==="adherence_good" に限られる（過剰付与の防止）', () => {
    const violations: string[] = []
    for (const mod of ALL_MODULES) {
      for (const sc of mod.scenarios ?? []) {
        const tags = sc.scenarioTags ?? []
        if (tags.includes('good') && sc.scenarioGroup !== 'adherence_good') {
          violations.push(`${mod.moduleId}.${sc.id} (scenarioGroup="${sc.scenarioGroup}")`)
        }
      }
    }
    assert.deepEqual(
      violations, [],
      `scenarioGroup が adherence_good でないのに "good" タグを持つ scenario がある:\n  ${violations.join('\n  ')}`,
    )
  })

  test('T-5: 検出ロジックの健全性 — "good" タグ欠落 + 非 cp_good id の scenario は capable ではないと検出される', () => {
    // 実データではなく意図的に壊した in-memory clone で、検査ロジック自体が
    // 実際に差分を捕まえることを確認する（本ファイル既存の他テストと同じ方針）。
    const sample = adherenceGoodScenarios().find(({ sc }) => sc.thirdPanelSPlacement === undefined)
    assert.ok(sample, '前提の健全性: explicit ではない adherence_good scenario が corpus に必要')

    const tags = (sample!.sc.scenarioTags ?? []).filter(t => t !== 'good')
    const broken: Scenario = { ...sample!.sc, id: 'adherence_stable', scenarioTags: tags }

    assert.equal(
      isScenarioSReplacementCapable(broken), false,
      '"good" タグ欠落 + 非 cp_good id の scenario は capable ではないと検出されなければならない',
    )
    assert.equal(
      isScenarioSReplacementCapable(sample!.sc), true,
      '前提の健全性: 実データ側は capable でなければならない',
    )
  })
})
