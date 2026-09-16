/**
 * rapidCapableSubjectTripwire.test.ts — Rapid-capable scenario の authored S 第1文 future-subject tripwire
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-READINESS-1 §1・§2。
 *
 * ── 本テストが何であるか ────────────────────────────────────────────
 *
 * Rapid は v1 / v2 とも、Rapid-capable scenario の S 第1文（最初の「。」まで）を
 * 主語を参照せずに置換する。eligibility（`isScenarioSReplacementCapable`）も S 本文を参照しない。
 * したがって「症状」以外の評価 subject（眼圧・血圧・HbA1c 等）を持つ Rapid-capable scenario が
 * 追加されると、既存 Rapid が無言で適用されうる。
 *
 * 本テストは、**v1 / v2 に関係なく**全 module の Rapid-capable scenario について、
 * authored S 第1文が現在承認されている契約から外れたときに `npm test` を停止させ、
 * clinical-subject realization の設計レビュー（OD-RAPID-READINESS-1 §1。Human Review を含む
 * 別 Unit）へ必ず戻すための **review trigger** である。
 *
 * ── 本テストが何でないか ────────────────────────────────────────────
 *
 *   - 現在の文型を永久仕様として固定する test ではない（未知の semantic form の検出器）
 *   - runtime guard ではない（eligibility / runtime behavior は変更しない。B3 は不採用）
 *   - `RAPID_CAPABLE_S_CONTRACT` validator の global 化ではない
 *     （validator scope は pilot allowlist 内のまま。B2 は global promotion 時に判断）
 *
 * ── 現在承認されている契約 ───────────────────────────────────────────
 *
 *   authored S の1行目 = 「〈主語〉を〈動詞〉して症状は落ち着いている。」
 *     主語: `registerOf(scenario) === 'regimen'` → 「薬」／それ以外 → 「{{drug_subject}}」
 *           （DP-12 OD-COMPLIANCE-REALIZATION-1）
 *     動詞: `verbOf(mod)`（canonical `drug.route` から解決。OD-RAPID-ROUTE-VERB-1）
 *   `RAPID_CAPABLE_S_CONTRACT` の第1文条件と同一の形である（2行目以降の残余の有無は本テストの対象外）。
 *
 * ── 検証項目 ────────────────────────────────────────────────────────
 *
 *   T-ST-1  全 module の Rapid-capable scenario の authored S 第1文が承認済み契約に一致する
 *           （rapidProfileOf で走査対象を絞らない）
 *   T-ST-2  走査が空振りしていない（v1 / v2 の両 profile、drug / regimen の両 register を含む）
 *   T-ST-3  検出器自体が、症状以外の subject・承認済み文への前置き・v1 module 上の逸脱を検出し、
 *           Rapid-capable でない scenario は対象にしない
 *
 * 件数（module 数・scenario 数）は固定しない。新規 module が承認済み契約どおりに追加されることは正常である。
 *
 * 実行: npx tsx --test tests/rapidCapableSubjectTripwire.test.ts
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import type { ModuleData, Scenario } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { rapidProfileOf, registerOf, verbOf } from '../lib/rapidV2'

/** 現在承認されている Rapid-capable authored S 第1文（OD-RAPID-READINESS-1 §2） */
function approvedFirstLine(mod: ModuleData, sc: Scenario): string {
  const subject = registerOf(sc) === 'regimen' ? '薬' : '{{drug_subject}}'
  return `${subject}を${verbOf(mod)}して症状は落ち着いている。`
}

type Violation = {
  moduleId: string
  scenarioId: string
  profile: string
  expected: string
  actual: string
}

function scan(modules: ReadonlyArray<ModuleData>) {
  const violations: Violation[] = []
  const profiles = new Set<string>()
  const registers = new Set<string>()
  let capable = 0
  for (const mod of modules) {
    for (const sc of mod.scenarios ?? []) {
      if (!isScenarioSReplacementCapable(sc)) continue
      capable++
      profiles.add(rapidProfileOf(mod))
      registers.add(registerOf(sc))
      const expected = approvedFirstLine(mod, sc)
      const actual = String(sc.S ?? '').split('\n')[0]
      if (actual !== expected) {
        violations.push({ moduleId: mod.moduleId, scenarioId: sc.id, profile: rapidProfileOf(mod), expected, actual })
      }
    }
  }
  return { violations, profiles, registers, capable }
}

const REVIEW_NOTICE =
  '\n\n── 対応（review trigger）──\n' +
  '  ・Rapid-capable scenario の authored S 第1文に、承認済み契約にない semantic form\n' +
  '    （例: 「症状」以外の評価 subject）が現れた。Rapid はこの第1文を主語を見ずに置換する\n' +
  '  ・test の期待値・bridge・canonical を合わせて通過させない\n' +
  '  ・docs/OPEN_DESIGN_QUESTIONS.md Q-RAPID1 OD-RAPID-READINESS-1 §1 に従い、Human Review を含む\n' +
  '    clinical-subject realization の設計レビュー（別 Unit）へ戻す\n' +
  '  ・PN 工程での転記誤りの可能性がある場合は、bridge を正本として canonical を確認する（bridge は書き換えない）\n' +
  '  ・設計レビューを経て Owner が契約を改訂した場合に限り、本テストの承認済み契約を同一作業内で更新する'

function formatViolations(violations: Violation[], limit = 10): string {
  const shown = violations.slice(0, limit).map(v =>
    `    ${v.moduleId} / scenario=${v.scenarioId} / profile=${v.profile}\n` +
    `      expected: ${v.expected}\n` +
    `      actual:   ${v.actual}`,
  )
  if (violations.length > limit) shown.push(`    … 他 ${violations.length - limit} 件`)
  return shown.join('\n')
}

const byId = (id: string): ModuleData => {
  const m = ALL_MODULES.find(x => x.moduleId === id)
  assert.ok(m, `module ${id} が見つからない`)
  return m!
}

/** module を複製し、指定 scenario の S だけを差し替える（canonical data は変更しない） */
function withScenarioS(mod: ModuleData, scenarioId: string, S: string): ModuleData {
  const clone = structuredClone(mod)
  const sc = clone.scenarios.find(s => s.id === scenarioId)
  assert.ok(sc, `${mod.moduleId} に scenario ${scenarioId} が見つからない`)
  sc!.S = S
  return clone
}

const corpus = scan(ALL_MODULES)

// ═══════════════════════════════════════════════════════════════
// T-ST-1 全 module・v1 / v2 共通
// ═══════════════════════════════════════════════════════════════

describe('T-ST-1 Rapid-capable scenario の authored S 第1文は承認済み契約に一致する（v1 / v2 共通）', () => {
  test('承認済み契約から外れた Rapid-capable scenario が 0 件', () => {
    assert.equal(
      corpus.violations.length,
      0,
      `承認済み契約から外れた Rapid-capable scenario が ${corpus.violations.length} 件ある:\n` +
        formatViolations(corpus.violations) + REVIEW_NOTICE,
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// T-ST-2 空振り防止
// ═══════════════════════════════════════════════════════════════

describe('T-ST-2 走査が空振りしていない', () => {
  test('Rapid-capable scenario が存在し、drug / regimen の両 register を含む', () => {
    assert.ok(corpus.capable > 0, 'Rapid-capable scenario を1件も走査していない')
    assert.deepEqual([...corpus.registers].sort(), ['drug', 'regimen'])
  })

  test('走査対象の profile は rapidProfileOf で絞られていない（corpus に存在する profile をすべて含む）', () => {
    const corpusProfiles = new Set(
      ALL_MODULES.filter(m => (m.scenarios ?? []).some(isScenarioSReplacementCapable)).map(m => rapidProfileOf(m)),
    )
    assert.deepEqual([...corpus.profiles].sort(), [...corpusProfiles].sort())
  })
})

// ═══════════════════════════════════════════════════════════════
// T-ST-3 検出器自体の確認（合成データ。canonical は変更しない）
//
// 合成に使う module は profile ごとに corpus から動的に選ぶ（profile 判定〔既定 v2・一時除外〕の
// 変更で本テストが壊れないようにするため。OD-RAPID-GLOBAL-1）。その profile の module が corpus に存在しない場合、
// 当該ケースは検証対象が無いため何もしない。
// ═══════════════════════════════════════════════════════════════

/** 指定 profile の module のうち、指定 register の Rapid-capable scenario を持つ最初の組 */
function sampleOf(profile: 'v1' | 'v2', register: 'drug' | 'regimen'): { mod: ModuleData; sc: Scenario } | undefined {
  for (const mod of ALL_MODULES) {
    if (rapidProfileOf(mod) !== profile) continue
    const sc = mod.scenarios.find(s => isScenarioSReplacementCapable(s) && registerOf(s) === register)
    if (sc) return { mod, sc }
  }
  return undefined
}

describe('T-ST-3 検出器は未知の semantic form を検出する', () => {
  test('少なくとも一方の profile で合成サンプルを取得できる', () => {
    assert.ok(sampleOf('v1', 'drug') || sampleOf('v2', 'drug'), 'Rapid-capable な drug register scenario が corpus に無い')
  })

  for (const profile of ['v1', 'v2'] as const) {
    test(`${profile} module の drug register scenario で「症状」以外の subject → 検出`, () => {
      const sample = sampleOf(profile, 'drug')
      if (!sample) return
      const remainder = String(sample.sc.S).split('\n').slice(1).join('\n')
      const mod = withScenarioS(sample.mod, sample.sc.id, `{{drug_subject}}を${verbOf(sample.mod)}して眼圧は安定している。\n${remainder}`)
      const { violations } = scan([mod])
      assert.equal(violations.length, 1)
      assert.equal(violations[0].profile, profile)
    })

    test(`${profile} module の regimen register scenario で「症状」以外の subject → 検出`, () => {
      const sample = sampleOf(profile, 'regimen')
      if (!sample) return
      const remainder = String(sample.sc.S).split('\n').slice(1).join('\n')
      const mod = withScenarioS(sample.mod, sample.sc.id, `薬を${verbOf(sample.mod)}して血糖値は安定している。\n${remainder}`)
      const { violations } = scan([mod])
      assert.equal(violations.length, 1)
      assert.equal(violations[0].profile, profile)
    })
  }

  test('承認済み文の前に別の評価 subject を置いた第1文 → 検出', () => {
    const sample = sampleOf('v1', 'drug') ?? sampleOf('v2', 'drug')!
    const approved = approvedFirstLine(sample.mod, sample.sc)
    const mod = withScenarioS(sample.mod, sample.sc.id, `HbA1cは横ばいで、${approved}\n${String(sample.sc.S).split('\n').slice(1).join('\n')}`)
    assert.equal(scan([mod]).violations.length, 1)
  })

  test('承認済み契約どおりの第1文は検出しない（合成データ上の対照）', () => {
    const sample = sampleOf('v1', 'drug') ?? sampleOf('v2', 'drug')!
    const mod = withScenarioS(sample.mod, sample.sc.id, `${approvedFirstLine(sample.mod, sample.sc)}\n残余。`)
    assert.equal(scan([mod]).violations.length, 0)
  })

  test('Rapid-capable でない scenario の S は対象にしない', () => {
    for (const mod of ALL_MODULES) {
      const nonCapable = mod.scenarios.find(s => !isScenarioSReplacementCapable(s))
      if (!nonCapable) continue
      const clone = withScenarioS(mod, nonCapable.id, '眼圧は安定している。')
      assert.equal(isScenarioSReplacementCapable(clone.scenarios.find(s => s.id === nonCapable.id)), false)
      assert.equal(scan([clone]).violations.length, 0)
      return
    }
    assert.fail('Rapid-capable でない scenario が corpus に無い')
  })
})
