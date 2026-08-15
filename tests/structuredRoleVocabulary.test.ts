/**
 * structuredRoleVocabulary.test.ts — Structured role 語彙の機械保証
 *
 * ── 設計意図（新しい Repository 規則は追加していない）─────────────────────
 *
 * 「`SStructured` / `AStructured` / `PStructured` の `role` は確立語彙のみを使用する」
 * という規則は既に存在する:
 *   - `prompts/RULES.md` §17（語彙の宣言元・正本）
 *   - `prompts/vNext/PN4A-Structured-GroupA.md` / `PN4B-Structured-GroupB.md`
 *     （生成時。未定義 role は MUST_STOP）
 *   - `prompts/vNext/PN7-Cross-Reference-Audit.md` check T（監査時。未定義 role は FAIL）
 *
 * **本テストはその既存規則を機械的に担保する層を追加したにすぎない。**
 * 上記のうち PN4A / PN4B / PN7 はいずれも AI 実行の統制であり、見落としが silent に
 * 通過しうる。本テストは全 module に対する事後検出をこの Repository で唯一の
 * 機械実行層として与える（`docs/VALIDATOR_STANDARD.md` §2-B「ModuleValidator 単独を
 * enforcement とみなしてはならない。…検証するのは tests と audit である」）。
 *
 * ── 既存 occurrence の扱い ───────────────────────────────────────────
 *
 * `prompts/RULES.md` §17 確立（2026-06-27）以前に作られた module には確立語彙外の
 * role occurrence が存在する（27 key / 104 件）。**本テストはそれらの修正を要求しない。**
 * `tests/fixtures/structuredRolePreRuleBaseline.ts` に凍結し、そこからの逸脱のみを検出する。
 * 既存 occurrence の classification / migration は `prompts/vNext/HANDOFF.md` §6 の
 * Deferred 事項である。
 *
 * ── 検証項目 ────────────────────────────────────────────────────────
 *
 *   T-SR-1  確立語彙外 role の (moduleId, type, role) → count が baseline と完全一致
 *           （新規 key / key 消失 / count 増減 のいずれも FAIL。総数一致による相殺も FAIL）
 *   T-SR-2  baseline の全 key が canonical data に実在する（baseline の陳腐化検出）
 *   T-SR-3  baseline の role が確立語彙に含まれていない（正式昇格後の残置検出）
 *   T-SR-4  確立語彙が RULES.md §17 と一致する（S6 / A4 / P11・値の drift も検出）
 *   T-SR-5  全 Structured entry に role が存在する（欠落 0 件を baseline とする）
 *
 * RULES.md の散文を自動 parse する仕組みは持たない（T-SR-4 は明示リテラルとの照合）。
 *
 * 実行: npx tsx --test tests/structuredRoleVocabulary.test.ts
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_MODULES } from '../data/modules/index'
import {
  ESTABLISHED_S_STRUCTURED_ROLES,
  ESTABLISHED_A_STRUCTURED_ROLES,
  ESTABLISHED_P_STRUCTURED_ROLES,
  ESTABLISHED_STRUCTURED_ROLES,
  STRUCTURED_FIELD_NAMES,
  STRUCTURED_FIELD_TYPES,
  isEstablishedStructuredRole,
  type StructuredFieldType,
} from '../lib/structuredRoleVocabulary'
import {
  PRE_RULE_STRUCTURED_ROLE_BASELINE,
  baselineKeyOf,
} from './fixtures/structuredRolePreRuleBaseline'

// ─────────────────────────────────────────────────────────────
// canonical data の走査（1 回だけ行い全テストで共有する）
// ─────────────────────────────────────────────────────────────

interface Occurrence {
  moduleId: string
  scenarioId: string
  entryId: string
  type: StructuredFieldType
  role: string
}

interface ScanResult {
  /** (moduleId, type, role) → 出現件数（確立語彙外のみ） */
  counts: Map<string, number>
  /** (moduleId, type, role) → 出現位置（診断表示用・確立語彙外のみ） */
  locations: Map<string, Occurrence[]>
  /** role フィールドが欠落している entry */
  missingRole: Omit<Occurrence, 'role'>[]
  /** 走査した Structured entry の総数 */
  totalEntries: number
}

function scanModules(): ScanResult {
  const counts = new Map<string, number>()
  const locations = new Map<string, Occurrence[]>()
  const missingRole: Omit<Occurrence, 'role'>[] = []
  let totalEntries = 0

  for (const mod of ALL_MODULES) {
    const moduleId = mod.moduleId
    for (const sc of mod.scenarios ?? []) {
      for (const type of STRUCTURED_FIELD_TYPES) {
        const entries = sc[STRUCTURED_FIELD_NAMES[type]] ?? []
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          totalEntries++
          const entryId = typeof entry.id === 'string' && entry.id !== '' ? entry.id : `(index ${i})`
          const role = entry.role
          if (typeof role !== 'string' || role === '') {
            missingRole.push({ moduleId, scenarioId: sc.id, entryId, type })
            continue
          }
          if (isEstablishedStructuredRole(type, role)) continue
          const key = baselineKeyOf({ moduleId, type, role })
          counts.set(key, (counts.get(key) ?? 0) + 1)
          const list = locations.get(key) ?? []
          list.push({ moduleId, scenarioId: sc.id, entryId, type, role })
          locations.set(key, list)
        }
      }
    }
  }
  return { counts, locations, missingRole, totalEntries }
}

const scan = scanModules()

const baselineCounts = new Map<string, number>(
  PRE_RULE_STRUCTURED_ROLE_BASELINE.map(row => [baselineKeyOf(row), row.count]),
)

/** 失敗時に「baseline の同期が必要」であることを必ず伝える共通末尾。 */
const SYNC_NOTICE =
  '\n\n── 対応 ──\n' +
  '  ・確立語彙外の role を新たに追加した場合 → canonical JSON 側を prompts/RULES.md §17 の\n' +
  '    確立語彙へ修正する（baseline へ行を追加して回避しない）\n' +
  '  ・既存 occurrence を migration した場合 → tests/fixtures/structuredRolePreRuleBaseline.ts の\n' +
  '    該当行（count / 行の有無）を同一作業内で同期する\n' +
  '  ・語彙そのものを §17 で改訂した場合 → lib/structuredRoleVocabulary.ts と\n' +
  '    PN4A / PN4B / PN7 check T の語彙を同一作業内で同期する'

function formatLocations(key: string, limit = 5): string {
  const list = scan.locations.get(key) ?? []
  const shown = list.slice(0, limit).map(o =>
    `      ${o.moduleId} / scenario=${o.scenarioId} / entry=${o.entryId} / ${o.type}Structured.role="${o.role}"`,
  )
  if (list.length > limit) shown.push(`      … 他 ${list.length - limit} 件`)
  return shown.join('\n')
}

// ─────────────────────────────────────────────────────────────
// T-SR-1: baseline との完全一致
// ─────────────────────────────────────────────────────────────

describe('Structured role: 確立語彙外 occurrence の regression baseline', () => {
  test('T-SR-1 (moduleId, type, role) → count が pre-rule baseline と完全一致する', () => {
    const problems: string[] = []

    // ① baseline に無い key（＝新規混入した確立語彙外 role）
    for (const [key, actual] of [...scan.counts.entries()].sort()) {
      if (!baselineCounts.has(key)) {
        problems.push(
          `  [新規] baseline に存在しない確立語彙外 role が ${actual} 件検出された\n` +
          `      key: ${key}\n${formatLocations(key)}`,
        )
      }
    }

    // ② baseline にあるが件数が変化した / 消滅した key
    for (const [key, expected] of [...baselineCounts.entries()].sort()) {
      const actual = scan.counts.get(key) ?? 0
      if (actual !== expected) {
        problems.push(
          `  [件数不一致] key: ${key}\n` +
          `      expected: ${expected} 件 / actual: ${actual} 件\n` +
          (actual > 0 ? formatLocations(key) : '      （現在この key の occurrence は存在しない）'),
        )
      }
    }

    const actualTotal = [...scan.counts.values()].reduce((a, b) => a + b, 0)
    const expectedTotal = [...baselineCounts.values()].reduce((a, b) => a + b, 0)

    assert.equal(
      problems.length,
      0,
      `確立語彙外 Structured role が pre-rule baseline から変化している。\n` +
      `  baseline: ${baselineCounts.size} key / ${expectedTotal} 件\n` +
      `  actual  : ${scan.counts.size} key / ${actualTotal} 件\n` +
      `（総数が一致していても key 単位で不一致なら FAIL する — 相殺は検出される）\n\n` +
      problems.join('\n') +
      SYNC_NOTICE,
    )
  })

  // ───────────────────────────────────────────────────────────
  // T-SR-2: baseline の陳腐化検出
  // ───────────────────────────────────────────────────────────

  test('T-SR-2 baseline の全 key が canonical data に実在する', () => {
    const stale = PRE_RULE_STRUCTURED_ROLE_BASELINE
      .filter(row => !scan.counts.has(baselineKeyOf(row)))
      .map(row => `  ${baselineKeyOf(row)}（expected ${row.count} 件 / actual 0 件）`)

    assert.deepEqual(
      stale,
      [],
      `pre-rule baseline に、canonical data 上もはや存在しない key が残っている。\n` +
      `migration 済みであれば tests/fixtures/structuredRolePreRuleBaseline.ts から\n` +
      `該当行を削除すること（記録を放置しない）。\n\n` +
      stale.join('\n') +
      SYNC_NOTICE,
    )
  })

  // ───────────────────────────────────────────────────────────
  // T-SR-3: 正式昇格後の残置検出
  // ───────────────────────────────────────────────────────────

  test('T-SR-3 baseline の role が確立語彙に含まれていない', () => {
    const promoted = PRE_RULE_STRUCTURED_ROLE_BASELINE
      .filter(row => isEstablishedStructuredRole(row.type, row.role))
      .map(row => `  ${row.type}Structured.role="${row.role}"（${row.moduleId}）`)

    assert.deepEqual(
      promoted,
      [],
      `pre-rule baseline の role が lib/structuredRoleVocabulary.ts の確立語彙にも存在する。\n` +
      `prompts/RULES.md §17 で正式昇格した場合、baseline 側の行は不要になるため削除すること。\n\n` +
      promoted.join('\n') +
      SYNC_NOTICE,
    )
  })
})

// ─────────────────────────────────────────────────────────────
// T-SR-4: 確立語彙そのものの drift 検出
// ─────────────────────────────────────────────────────────────

describe('Structured role: 確立語彙の machine-readable mirror', () => {
  // prompts/RULES.md §17 から転記した明示リテラル。
  // lib/structuredRoleVocabulary.ts と独立に宣言し、両者の一致を照合する
  // （lib/types.ts の SideEffectPresence と lib/scenarioValidator.ts の
  //   VALID_SIDE_EFFECT_PRESENCE が取っているのと同じ二重宣言方式）。
  const RULES_S = [
    'treatment_start_reason',
    'dose_adjustment_reason',
    'side_effect_status',
    'side_effect_presence',
    'adherence_status',
    'treatment_end_reason',
  ]
  const RULES_A = [
    'treatment_assessment',
    'side_effect_assessment',
    'adherence_assessment',
    'treatment_end_assessment',
  ]
  const RULES_P = [
    'drug_effect_explanation',
    'side_effect_attention',
    'side_effect_guidance',
    'dose_adjustment_guidance',
    'treatment_end_guidance',
    'adherence_guidance',
    'followup_guidance',
    'lifestyle_guidance',
    'administration_guidance',
    'sickday_guidance',
    'urgent_consult_guidance',
  ]

  test('T-SR-4 確立語彙が RULES.md §17 の S6 / A4 / P11 と値レベルで一致する', () => {
    const drift = '\n\nprompts/RULES.md §17 を改訂した場合は lib/structuredRoleVocabulary.ts と ' +
      'PN4A / PN4B / PN7 check T を同一作業内で同期すること。'

    assert.deepEqual([...ESTABLISHED_S_STRUCTURED_ROLES], RULES_S, `SStructured.role 語彙が §17 と不一致${drift}`)
    assert.deepEqual([...ESTABLISHED_A_STRUCTURED_ROLES], RULES_A, `AStructured.role 語彙が §17 と不一致${drift}`)
    assert.deepEqual([...ESTABLISHED_P_STRUCTURED_ROLES], RULES_P, `PStructured.role 語彙が §17 と不一致${drift}`)

    assert.equal(ESTABLISHED_STRUCTURED_ROLES.S.length, 6, 'SStructured 確立語彙は 6 値')
    assert.equal(ESTABLISHED_STRUCTURED_ROLES.A.length, 4, 'AStructured 確立語彙は 4 値')
    assert.equal(ESTABLISHED_STRUCTURED_ROLES.P.length, 11, 'PStructured 確立語彙は 11 値')

    const all = [...RULES_S, ...RULES_A, ...RULES_P]
    assert.equal(all.length, 21, '確立語彙は合計 21 値')
  })
})

// ─────────────────────────────────────────────────────────────
// T-SR-5: role 欠落の検出
// ─────────────────────────────────────────────────────────────

describe('Structured role: entry の role 存在', () => {
  test('T-SR-5 全 Structured entry に role が存在する（欠落 0 件）', () => {
    const missing = scan.missingRole.map(o =>
      `  ${o.moduleId} / scenario=${o.scenarioId} / entry=${o.entryId} / ${o.type}Structured`,
    )

    assert.deepEqual(
      missing,
      [],
      `role フィールドが存在しない Structured entry が ${missing.length} 件ある` +
      `（走査した entry 総数: ${scan.totalEntries}）。\n` +
      `role 欠落は確立語彙検査を素通りするため、baseline 検出の抜け穴になる。\n\n` +
      missing.join('\n') +
      SYNC_NOTICE,
    )
  })
})
