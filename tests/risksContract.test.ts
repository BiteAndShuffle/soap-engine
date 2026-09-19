/**
 * risksContract.test.ts
 *
 * canonical JSON の `risks` が、PN5 が定める 2 分岐のいずれかに従っていることを検査する。
 *
 * ── 設計意図（新しい Repository 規則は追加していない）─────────────────────
 *
 * 「non-insulin module の `risks` は常に固定 empty」「insulin 注射系は標準テンプレート」という
 * 2 分岐は、`prompts/vNext/PN5-Non-Scenario.md` §risks セクションが既に定めている。
 * **本テストはその既存規則を機械的に担保する層を追加したにすぎず、新しい規則を導入するもの
 * ではない。** 規則の宣言元は引き続き PN5 である。
 *
 * ── なぜ機械層が必要か ───────────────────────────────────────────────
 *
 * `risks` を検査する validator / audit は存在しない〔実測: `lib` `app` `scripts` `tests`
 * `utils` 全体で `risk` の出現は `lib/types.ts` の型定義 3 箇所のみ〕。さらに
 * `data/modules/index.ts` は 35 件すべてを `as unknown as ModuleData` で二重キャストして
 * いるため、`risks` の構造差異は `tsc` でも検出できない。
 *
 * 実際に次の事故が起きている: 同一領域・同一剤形の 2 module（`allergy_h1_antihistamine_eye_drops`
 * と `allergy_chemical_mediator_release_inhibitor_eye_drops`）は `se_*` scenario id の集合が
 * 完全一致するため、前者の risk 値を後者へ複写しても外形上は「自 module から導出された値」と
 * 区別できない。2026-09 の chemical mediator 再構築時にこの複写が発生し、commit 前の Human
 * Review でのみ検出された。固定 empty 契約は値空間を単一点へ縮退させることで、この「出自の
 * 判定」自体を不要にする。本テストはその契約が成果物側で破られていないことを検査する。
 *
 * ── 本テストが保証しないこと ─────────────────────────────────────────
 *
 * - PN5 の prompt 本文が改変されていないこと（test は prompt を読まない。既存 test 群と同方針）
 * - PN5〜PN7 の中間ファイル（`/tmp/soap-build/`）の内容。本テストの発火点は PN8 である
 *   （PN5 時点の検出は PN5 §ハンドオフ報告の `0 / 0 / 0` 報告義務が担う）
 * - 収載済み baseline 22 module の risk 値の正当性（Owner Decision OD-3 により別 Unit）
 * - `INSULIN_RISKS_REVIEW_PENDING_MODULES` 収載 module の臨床 semantics
 *   （insulin テンプレート適用の可否は Human clinical review。T-R-4d〜T-R-4g を参照）
 *
 * 実行:
 *   npx tsx --test tests/risksContract.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { PRE_RULE_RISKS_BASELINE } from './fixtures/risksPreRuleBaseline'

const MODULES_DIR = path.resolve('./data/modules')

/**
 * insulin 分岐の判定。
 * 宣言元: `prompts/vNext/PN5-Non-Scenario.md` §risks「インスリン注射系モジュール
 * （drugClass に INSULIN_* を含む）」。
 *
 * `drug.drugClass` は `string[]`（`lib/types.ts` の `drugClass?: string[]`）であり、
 * 実測では全 module が 1 要素。いずれかの要素が本パターンに合致すれば insulin 分岐とする。
 */
const INSULIN_BRANCH_PATTERN = /^INSULIN_/

/**
 * INSULIN_RISKS_REVIEW_PENDING_MODULES —
 * insulin 分岐に属するが、`risks` の臨床 semantics が **Human clinical review 待ち**であり、
 * PN5 insulin 標準テンプレートへの適合を**意図的に defer している** module の集合。
 *
 * ── これは一般的な exception ではない ────────────────────────────────
 *
 * 本集合は「insulin module の risks を固定 empty にしてよい」という新しい一般契約を
 * 導入するものではない。**列挙された module に限った temporary contract deferral** であり、
 * 収載中の module は「PN5 insulin テンプレート未適用の暫定状態」にあることを意味する。
 * 集合に属さない insulin module には従来どおり T-R-4c の「risks 非空」が適用される。
 *
 * ── 現在の収載（2026-09-20・Owner Decision OD-M1〜OD-M6）─────────────
 *
 * `dm_insulin_mixed_rapid_long` 1 件のみ。同 module では本 Unit で次を実施した:
 *
 *   - `drug.drugClass` / `dosageForms` / `drugSpecificTags` の transfer defect を
 *     bridge 逐語値どおり修復した（OD-M1）。この修復により同 module は insulin 分岐へ移った
 *   - 出自を Repository で裏付けられない risks semantics（`urgentFlag` / `urgentCriteria` /
 *     日本語 risk token / scenario ID namespace の `whenAny`）を除去し、固定 empty へ
 *     正規化した（OD-M3 / OD-M4）
 *   - insulin テンプレートの適用可否、および `意識消失・けいれんを伴う重症低血糖` を
 *     `template.urgentCriteria` へ移すか否かは **臨床判断**であるため実施していない
 *     （OD-M5 / OD-M6）
 *
 * ── 集合の更新規律 ───────────────────────────────────────────────────
 *
 * - **新規 module を本集合へ追加することは、通常の baseline 更新として扱わない。**
 *   追加には Owner Decision を要する（`tests/fixtures/risksPreRuleBaseline.ts` の
 *   pre-rule baseline は「契約制定以前の既存値の grandfather」であり、本集合は
 *   「契約適用を将来へ延期する」という別種の措置である。両者を混同しない）
 * - **dedicated Human Review Unit の完了時に、当該 module を本集合から削除する。**
 *   削除後はその module へ T-R-4c（risks 非空）が適用されるため、同 Unit 内で
 *   insulin テンプレート適用の可否を確定させる必要がある
 * - 集合が空になった場合、本定数と T-R-4d〜T-R-4f を削除してよい
 *
 * 継続事項: `prompts/vNext/HANDOFF.md` §6
 */
const INSULIN_RISKS_REVIEW_PENDING_MODULES = ['dm_insulin_mixed_rapid_long'] as const

/**
 * non-insulin の固定値。`prompts/vNext/PN5-Non-Scenario.md` §risks から転記した明示リテラル。
 * PN5 を改訂した場合は本リテラルと下記 baseline / 各 assertion を同一作業内で更新する。
 */
const FIXED_EMPTY_RISKS_KEYS = ['primary', 'secondary', 'conditional'] as const

const SYNC_NOTICE =
  '\n\n' +
  '`prompts/vNext/PN5-Non-Scenario.md` §risks セクションを改訂した場合は、\n' +
  'tests/risksContract.test.ts と tests/fixtures/risksPreRuleBaseline.ts を\n' +
  '同一作業内で更新すること（宣言元は PN5 であり、本テストはその mirror である）。'

interface RisksBlock {
  primary?: unknown
  secondary?: unknown
  conditional?: unknown
  [k: string]: unknown
}

interface ScannedModule {
  moduleId: string
  drugClass: string[]
  /** `risks` キー自体が存在しない場合は undefined */
  risks: RisksBlock | undefined
  /** `risks` 直下のキー集合（JSON 上の宣言順） */
  keys: string[]
  /** 配列でないキーは null */
  counts: { primary: number | null; secondary: number | null; conditional: number | null }
  isInsulinBranch: boolean
  total: number
}

function lenOf(v: unknown): number | null {
  return Array.isArray(v) ? v.length : null
}

function scanModules(): ScannedModule[] {
  return fs
    .readdirSync(MODULES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => {
      // 生 JSON を読む（data/modules/index.ts の `as unknown as ModuleData` 二重キャストを
      // 経由しないため、lib/types.ts の ModuleRisks が宣言していない `secondary` も観測できる）
      const raw = fs.readFileSync(path.join(MODULES_DIR, f), 'utf-8')
      const json = JSON.parse(raw) as {
        moduleId?: string
        drug?: { drugClass?: string[] }
        risks?: RisksBlock
      }
      const risks = json.risks
      const counts = {
        primary: lenOf(risks?.primary),
        secondary: lenOf(risks?.secondary),
        conditional: lenOf(risks?.conditional),
      }
      const drugClass = json.drug?.drugClass ?? []
      return {
        moduleId: json.moduleId ?? f.replace(/\.json$/, ''),
        drugClass,
        risks,
        keys: risks ? Object.keys(risks) : [],
        counts,
        isInsulinBranch: drugClass.some(c => INSULIN_BRANCH_PATTERN.test(c)),
        total: (counts.primary ?? 0) + (counts.secondary ?? 0) + (counts.conditional ?? 0),
      }
    })
}

const MODULES = scanModules()
const BASELINE_IDS = new Set(PRE_RULE_RISKS_BASELINE.map(r => r.moduleId))

const PENDING_IDS = new Set<string>(INSULIN_RISKS_REVIEW_PENDING_MODULES)

/** 固定 empty 契約の検査対象: non-insulin かつ baseline 未収載 */
const FIXED_EMPTY_TARGETS = MODULES.filter(m => !m.isInsulinBranch && !BASELINE_IDS.has(m.moduleId))
const INSULIN_BRANCH_MODULES = MODULES.filter(m => m.isInsulinBranch)
/** insulin 分岐のうち、risks semantics が Human review 待ちでない module（T-R-4c の検査対象） */
const INSULIN_ACTIVE_MODULES = INSULIN_BRANCH_MODULES.filter(m => !PENDING_IDS.has(m.moduleId))

const PENDING_NOTICE =
  '\n\n' +
  'INSULIN_RISKS_REVIEW_PENDING_MODULES は insulin risks の一般契約を緩めるものではなく、\n' +
  '列挙された module に限った temporary contract deferral である。\n' +
  '集合への追加は通常の baseline 更新として扱わず、Owner Decision を要する。\n' +
  'dedicated Human Review Unit の完了時には当該 module を集合から削除すること\n' +
  '（継続事項: prompts/vNext/HANDOFF.md §6）。'

// ─────────────────────────────────────────────────────────────
// T-R-1: non-insulin 固定 empty 契約
// ─────────────────────────────────────────────────────────────

describe('risks 契約: non-insulin は固定 empty（PN5 §risks）', () => {
  test('検査対象が存在する（空振りしないことの担保）', () => {
    assert.ok(
      FIXED_EMPTY_TARGETS.length > 0,
      'non-insulin かつ baseline 未収載の module が 0 件。T-R-1 が空振りしている。\n' +
        'baseline が全 non-insulin module を覆っていないか確認すること。' +
        SYNC_NOTICE,
    )
  })

  test('T-R-1 risks が固定 empty（キー集合・件数とも一致）', () => {
    const problems: string[] = []

    for (const m of FIXED_EMPTY_TARGETS) {
      if (!m.risks) {
        problems.push(`  ${m.moduleId}: risks キー自体が存在しない（JSON_STANDARD JS-A 必須）`)
        continue
      }
      if (m.keys.join(',') !== FIXED_EMPTY_RISKS_KEYS.join(',')) {
        problems.push(
          `  ${m.moduleId}: risks 直下のキー集合が不正\n` +
            `      expected: [${FIXED_EMPTY_RISKS_KEYS.join(', ')}]\n` +
            `      actual  : [${m.keys.join(', ')}]`,
        )
      }
      for (const k of FIXED_EMPTY_RISKS_KEYS) {
        const n = m.counts[k]
        if (n === null) {
          problems.push(`  ${m.moduleId}: risks.${k} が配列でない`)
        } else if (n !== 0) {
          problems.push(`  ${m.moduleId}: risks.${k} に ${n} 件の値がある（期待: 0 件）`)
        }
      }
    }

    assert.equal(
      problems.length,
      0,
      `non-insulin module の risks が固定 empty になっていない。\n\n` +
        `PN5 §risks: non-insulin module の risks は常に固定 empty\n` +
        `  {"primary": [], "secondary": [], "conditional": []}\n\n` +
        `structured Bridge risk contract も non-insulin 向け model_managed contract も存在せず、\n` +
        `有効な override 経路は存在しない。bridge 自由文 / scenario ID / intentTags /\n` +
        `他 module / Reference・Golden module / 既存 canonical からの推測・導出・転記は禁止。\n\n` +
        `既存 module の値であれば tests/fixtures/risksPreRuleBaseline.ts を確認すること\n` +
        `（新規 module を理由に baseline へ行を追加してはならない）。\n\n` +
        problems.join('\n') +
        SYNC_NOTICE,
    )
  })
})

// ─────────────────────────────────────────────────────────────
// T-R-2 / T-R-3: pre-rule baseline
// ─────────────────────────────────────────────────────────────

describe('risks 契約: pre-rule baseline の regression', () => {
  test('T-R-2 baseline 収載 module の件数・キー集合が実測と完全一致する', () => {
    const problems: string[] = []
    const byId = new Map(MODULES.map(m => [m.moduleId, m]))

    for (const row of PRE_RULE_RISKS_BASELINE) {
      const actual = byId.get(row.moduleId)
      if (!actual) {
        problems.push(`  [実体なし] ${row.moduleId}: baseline にあるが canonical JSON が存在しない`)
        continue
      }
      if (actual.keys.join(',') !== row.keys.join(',')) {
        problems.push(
          `  [キー不一致] ${row.moduleId}\n` +
            `      expected: [${row.keys.join(', ')}]\n` +
            `      actual  : [${actual.keys.join(', ')}]`,
        )
      }
      for (const k of FIXED_EMPTY_RISKS_KEYS) {
        if (actual.counts[k] !== row[k]) {
          problems.push(
            `  [件数不一致] ${row.moduleId}.risks.${k}: expected ${String(row[k])} / actual ${String(actual.counts[k])}`,
          )
        }
      }
    }

    assert.equal(
      problems.length,
      0,
      `pre-rule risks baseline から変化している。\n` +
        `  baseline: ${PRE_RULE_RISKS_BASELINE.length} module\n` +
        `（module 単位で照合するため、総数が一致していても個別不一致は FAIL する — 相殺は検出される）\n\n` +
        `remediation を行った場合は tests/fixtures/risksPreRuleBaseline.ts を同一作業内で更新すること。\n` +
        `remediation でない値の増加は PN5 §risks 違反である。\n\n` +
        problems.join('\n') +
        SYNC_NOTICE,
    )
  })

  test('T-R-3 baseline に陳腐化した行が残っていない', () => {
    const byId = new Map(MODULES.map(m => [m.moduleId, m]))
    const stale = PRE_RULE_RISKS_BASELINE.filter(row => {
      const actual = byId.get(row.moduleId)
      return actual !== undefined && actual.total === 0
    }).map(row => `  ${row.moduleId}（risks は現在すべて空）`)

    assert.deepEqual(
      stale,
      [],
      `pre-rule baseline に、risks が既に空になった module が残っている。\n` +
        `remediation 済みであれば tests/fixtures/risksPreRuleBaseline.ts から該当行を削除すること\n` +
        `（記録を放置しない）。削除すると当該 module は T-R-1 の検査対象へ移り、以後 empty が固定される。\n\n` +
        stale.join('\n') +
        SYNC_NOTICE,
    )
  })

  test('T-R-3b baseline に insulin 分岐 module が混入していない', () => {
    const byId = new Map(MODULES.map(m => [m.moduleId, m]))
    const misplaced = PRE_RULE_RISKS_BASELINE.filter(row => byId.get(row.moduleId)?.isInsulinBranch)
      .map(row => `  ${row.moduleId}（drugClass: ${byId.get(row.moduleId)?.drugClass}）`)

    assert.deepEqual(
      misplaced,
      [],
      `insulin 分岐に該当する module が baseline に収載されている。\n` +
        `insulin 分岐は固定 empty 契約の対象外であり、baseline による grandfather を必要としない。\n\n` +
        misplaced.join('\n') +
        SYNC_NOTICE,
    )
  })
})

// ─────────────────────────────────────────────────────────────
// T-R-4: insulin 分岐（弱形）
//
// template との byte equality は要求しない（Owner Decision Q-1 / 2026-09-20）。
// PN5 §risks は「bridge の臨床記述に照らして追加・修正が必要な場合のみ変更する」と
// 逸脱を明示的に許可しており、byte equality の要求はその許可を無効化する新制約になる。
// ─────────────────────────────────────────────────────────────

describe('risks 契約: insulin 分岐（弱形）', () => {
  test('T-R-4a insulin 分岐に該当する module が実在する', () => {
    assert.ok(
      INSULIN_BRANCH_MODULES.length > 0,
      `insulin 分岐（drug.drugClass が ${INSULIN_BRANCH_PATTERN}）に該当する module が 0 件。\n` +
        `PN5 §risks の insulin テンプレート規定が空振りしている。` +
        SYNC_NOTICE,
    )
  })

  test('T-R-4b insulin 分岐 module は固定 empty 契約の対象外である', () => {
    const leaked = INSULIN_BRANCH_MODULES.filter(m =>
      FIXED_EMPTY_TARGETS.some(t => t.moduleId === m.moduleId),
    ).map(m => `  ${m.moduleId}（drugClass: ${m.drugClass}）`)

    assert.deepEqual(
      leaked,
      [],
      `insulin 分岐 module が固定 empty 契約の検査対象に含まれている。\n` +
        `insulin 分岐は PN5 §risks の標準テンプレート側であり、empty を要求してはならない。\n\n` +
        leaked.join('\n') +
        SYNC_NOTICE,
    )
  })

  test('T-R-4c insulin 分岐 module の risks が空振りしていない（review pending を除く）', () => {
    const problems: string[] = []

    for (const m of INSULIN_ACTIVE_MODULES) {
      if (!m.risks) {
        problems.push(`  ${m.moduleId}: risks キー自体が存在しない（JSON_STANDARD JS-A 必須）`)
        continue
      }
      if (m.keys.join(',') !== FIXED_EMPTY_RISKS_KEYS.join(',')) {
        problems.push(
          `  ${m.moduleId}: risks 直下のキー集合が標準形でない\n` +
            `      expected: [${FIXED_EMPTY_RISKS_KEYS.join(', ')}]\n` +
            `      actual  : [${m.keys.join(', ')}]`,
        )
      }
      if (m.total === 0) {
        problems.push(
          `  ${m.moduleId}: risks が全キー空。insulin 分岐は標準テンプレートを使用する\n` +
            `      （Human clinical review へ defer するのであれば Owner Decision を得たうえで\n` +
            `        INSULIN_RISKS_REVIEW_PENDING_MODULES へ追加すること）`,
        )
      }
    }

    assert.equal(
      problems.length,
      0,
      `insulin 分岐 module の risks が PN5 §risks の標準テンプレート側の形をしていない。\n` +
        `（本検査は値の byte equality を要求しない。「空でないこと」と「標準 3 キーであること」のみ）\n` +
        `（review pending ${INSULIN_RISKS_REVIEW_PENDING_MODULES.length} 件は本検査の対象外）\n\n` +
        problems.join('\n') +
        SYNC_NOTICE,
    )
  })
})

// ─────────────────────────────────────────────────────────────
// T-R-4d〜T-R-4f: insulin risks の temporary contract deferral
//
// Owner Decision（2026-09-20・OD-M1〜OD-M6）により、`dm_insulin_mixed_rapid_long` は
// 構造 / provenance defect を修復したうえで、insulin テンプレート適合の判断のみを
// Human clinical review へ defer している。その暫定状態を機械的に固定する。
// ─────────────────────────────────────────────────────────────

describe('risks 契約: insulin risks review deferral', () => {
  test('T-R-4d pending 集合の membership が Owner 承認済みの 1 件から変化していない', () => {
    assert.deepEqual(
      [...INSULIN_RISKS_REVIEW_PENDING_MODULES],
      ['dm_insulin_mixed_rapid_long'],
      `INSULIN_RISKS_REVIEW_PENDING_MODULES の membership が変化している。\n` +
        `現在 Owner が承認している deferral は dm_insulin_mixed_rapid_long の 1 件のみである。` +
        PENDING_NOTICE,
    )
  })

  test('T-R-4e pending module が実在し、insulin 分岐に属する', () => {
    const problems: string[] = []
    const byId = new Map(MODULES.map(m => [m.moduleId, m]))

    for (const id of INSULIN_RISKS_REVIEW_PENDING_MODULES) {
      const m = byId.get(id)
      if (!m) {
        problems.push(`  ${id}: canonical JSON が存在しない`)
        continue
      }
      if (!m.isInsulinBranch) {
        problems.push(
          `  ${id}: insulin 分岐に属していない（drug.drugClass: ${JSON.stringify(m.drugClass)}）\n` +
            `      本集合は insulin 分岐 module の deferral のためにのみ存在する。\n` +
            `      non-insulin module は固定 empty 契約（T-R-1）または pre-rule baseline が扱う`,
        )
      }
    }

    assert.deepEqual(problems, [], `pending module が前提を満たしていない。\n\n${problems.join('\n')}${PENDING_NOTICE}`)
  })

  test('T-R-4f pending 中の risks が固定 empty に保たれている', () => {
    const problems: string[] = []
    const byId = new Map(MODULES.map(m => [m.moduleId, m]))

    for (const id of INSULIN_RISKS_REVIEW_PENDING_MODULES) {
      const m = byId.get(id)
      if (!m) continue
      if (!m.risks) {
        problems.push(`  ${id}: risks キー自体が存在しない（JSON_STANDARD JS-A 必須）`)
        continue
      }
      if (m.keys.join(',') !== FIXED_EMPTY_RISKS_KEYS.join(',')) {
        problems.push(
          `  ${id}: risks 直下のキー集合が不正\n` +
            `      expected: [${FIXED_EMPTY_RISKS_KEYS.join(', ')}]\n` +
            `      actual  : [${m.keys.join(', ')}]`,
        )
      }
      for (const k of FIXED_EMPTY_RISKS_KEYS) {
        const n = m.counts[k]
        if (n === null) problems.push(`  ${id}: risks.${k} が配列でない`)
        else if (n !== 0) problems.push(`  ${id}: risks.${k} に ${n} 件の値がある（期待: 0 件）`)
      }
    }

    assert.equal(
      problems.length,
      0,
      `review pending 中の insulin module の risks が固定 empty から変化している。\n` +
        `pending 中は臨床 semantics を canonical へ入れない（出自を Repository で裏付けられないため）。\n` +
        `値を確定するのであれば Human Review Unit 内で行い、同時に pending 集合から削除すること。\n\n` +
        problems.join('\n') +
        PENDING_NOTICE,
    )
  })

  test('T-R-4g pending module が pre-rule baseline に収載されていない', () => {
    const both = INSULIN_RISKS_REVIEW_PENDING_MODULES.filter(id => BASELINE_IDS.has(id))
      .map(id => `  ${id}`)

    assert.deepEqual(
      both,
      [],
      `pending 集合と pre-rule baseline の両方に収載されている module がある。\n` +
        `両者は別種の措置であり（baseline = 契約制定以前の既存値の grandfather /\n` +
        `pending = 契約適用の将来への延期）、同一 module が双方に属することはない。\n\n` +
        both.join('\n') +
        PENDING_NOTICE,
    )
  })
})

// ─────────────────────────────────────────────────────────────
// T-R-5: mirror リテラル自体の drift 検出
// ─────────────────────────────────────────────────────────────

describe('risks 契約: PN5 mirror リテラルの健全性', () => {
  test('T-R-5 固定 empty のキー集合が PN5 の 3 キーから変化していない', () => {
    assert.deepEqual(
      [...FIXED_EMPTY_RISKS_KEYS],
      ['primary', 'secondary', 'conditional'],
      `FIXED_EMPTY_RISKS_KEYS が PN5 §risks の固定値のキー集合と一致しない。\n` +
        `本リテラルを緩めることで T-R-1 を通す変更は、契約そのものの改変である。` +
        SYNC_NOTICE,
    )
  })
})
