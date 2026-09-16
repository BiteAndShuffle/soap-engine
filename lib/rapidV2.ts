/**
 * rapidV2.ts — Rapid v2（6 transition taxonomy）の profile 判定・realization・合成 state
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-H1-PILOT-1・
 * OD-RAPID-MULTI-PILOT-1・OD-RAPID-ROUTE-VERB-1・OD-RAPID-COMPOSITION-1・
 * OD-RAPID-READINESS-1・OD-RAPID-GLOBAL-1。
 *
 * ## 位置づけ（重要）
 *
 * H1点眼（`allergy_h1_antihistamine_eye_drops`）の Reference Implementation →
 * 3 module pilot → 6 module pilot（Human Review CLOSE）を経て、OD-RAPID-GLOBAL-1 により
 * **Rapid v2 は全 module の既定 profile** となった（global promotion）。
 * 明示的な一時除外（`RAPID_V1_TEMPORARY_EXCLUSIONS`）に登録された module だけが
 * legacy Rapid v1 を使う。
 *
 * **Rapid v1（`lib/rapidSentence.ts`）は削除しない。** 一時除外 module の realization と、
 * global promotion の rollback 経路（`RAPID_DEFAULT_PROFILE` を `'v1'` へ戻す）として残す。
 * v1 の5 relation × 4 condition の taxonomy・文言・test契約は本ファイルによって変更されない。
 * v1 の Lifecycle 分類は `docs/DEVELOPMENT_STANDARD.md` §10.5 Classification Pending。
 *
 * v1/v2 の分岐は本ファイルの `rapidProfileOf` の1点に閉じ込める。呼び出し側
 * （deriveNodeFields.ts / DashboardClient.tsx / ThirdPanel.tsx / moduleValidator.ts）は
 * `rapidProfileOf(mod)` を通じてのみ v1/v2 を判定し、module ID を直接分岐条件に使わない。
 *
 * ## 6 transition taxonomy（v2 のみ。v1 の5 relation を再利用 + 1件追加）
 *
 * v2 は v1 の `SRelation` 5値をそのまま意味的に再利用し（`new_addition` = 追加、
 * `med_changed` = 変更、`dose_increased` = 増量、`dose_decreased` = 減量、
 * `continued_do` = Do）、新たに `regimen_reduced`（前回、処方整理）を1件加える。
 * 型定義は `lib/rapidState.ts` の `RapidTransitionV2` を正本とする（本ファイルは
 * それを再利用するのみで、型を独自に複製しない）。
 *
 * `regimen_reduced` の意味論は DP-19 OD-RAPID-SCOPE-1 が確定済み:
 *   「現在表示中の薬剤をこれから中止する」ことではなく、
 *   「前回の処方整理後の、現在時点での評価」を表す。
 *   削除された薬剤名・削除薬リストは保持しない（推測・創作しない）。
 *
 * ## sentence realization（Human review 済み完成文のテーブル方式）
 *
 * DP-19 の設計方針（Rapid は処方差分の完全再現機能ではない）に従い、
 * prefix + suffix の汎用文法へ無理に押し込まず、Owner Decision で確定した
 * 完成文をそのままテーブルとして保持する（3 module / 6 module pilot の Human Review を経て
 * global promotion でも同じ方式を維持した明示的な選択）。
 *
 * 文型は現在の bridge authored 表現（「〜して症状は落ち着いている。」）を前提とする。
 * 「症状」以外の評価 subject を持つ Rapid-capable scenario が現れた場合の realization は
 * 未決定（OD-RAPID-READINESS-1 §1 PENDING）であり、`tests/rapidCapableSubjectTripwire.test.ts`
 * が review trigger として検出する。
 *
 * realization は scenario の評価単位で決定論的に分岐する
 * （DP-12 OD-COMPLIANCE-REALIZATION-1）:
 *   - `scenario.scenarioType === 'adherence'` → regimen-level（薬剤名を含めない）
 *   - それ以外（副作用確認 scenario）             → drug-specific（薬剤名を含む）
 * 新しい canonical field は追加しない。既存の `scenarioType` のみで判定する。
 *
 * `display.adjustmentExpression`（例: H1 の「点眼回数が増えた/減った」）は
 * v2 では参照しない（増量/減量まで抽象化する Owner Decision）。bridge / canonical /
 * v1 の挙動・audit は変更しない — v2 の realization 関数が単にこの field を
 * 引数に取らないことで「参照しない」を構造的に保証する。
 *
 * ## Do の動詞（OD-RAPID-ROUTE-VERB-1）
 *
 * Do（`continued_do`）の realization だけが動詞（使用/服用）を含む（他5 transition は
 * 動詞を含まない文型）。動詞は既存 canonical `drug.route` から `verbForRoute` で
 * 決定論的に解決する（`oral` → 服用、それ以外の現行 route → 使用）。drug-register /
 * regimen-register の双方で同じ動詞を用いる。route / administration metadata の
 * 新設・再設計ではない（`administrationVerb` 等の新 field は追加しない）。
 *
 * ## multi-node S 合成（OD-RAPID-COMPOSITION-1）
 *
 * `rapidV2CompositionOf` が合成時に node から semantic state を導出し、`lib/buildSoap.ts`
 * の S 合成がそれを使って Rapid v2 block を text-derived bucketing から除外する
 * （stable node order・regimen-level 第1文の限定的共有化）。
 */

import type { ComposeNode, ModuleData, Scenario } from './types'
import type { SCondition } from './rapidSentence'
import type { RapidTransitionV2 } from './rapidState'

export type RapidProfile = 'v1' | 'v2'

/**
 * Rapid の既定 profile（OD-RAPID-GLOBAL-1）。
 *
 * 一時除外に登録されていない全 module（新規 module を含む）はこの profile を使う。
 * global promotion を rollback する場合はこの値を `'v1'` へ戻す（v1 realization は削除していない）。
 */
const RAPID_DEFAULT_PROFILE: RapidProfile = 'v2'

/**
 * Rapid v2 global promotion からの**一時除外**（v1 を使う module。OD-RAPID-GLOBAL-1）。
 *
 * moduleId の完全一致のみで判定する（prefix・categoryPath・route・clinicalDomain からの推測はしない）。
 * **永久除外ではない。** 登録・解除は Owner Decision を要し、理由と解除条件を併記する。
 *
 * - `allergy_chemical_mediator_release_inhibitor_eye_drops`: Owner が module の全面再構築を予定しているため。
 *   再構築後の bridge / canonical を基準に Rapid v2 の適用を再判断する（OD-RAPID-READINESS-1 §6 から継続）
 */
const RAPID_V1_TEMPORARY_EXCLUSIONS: ReadonlySet<string> = new Set([
  'allergy_chemical_mediator_release_inhibitor_eye_drops',
])

/**
 * module が Rapid v1 / v2 のどちらの realization を使うかを返す（唯一の判定点）。
 *
 * runtime（deriveNodeFields / DashboardClient / ThirdPanel）と `RAPID_CAPABLE_S_CONTRACT` validator の
 * scope はいずれも本関数を SSOT とし、自動的に同期する。
 */
export function rapidProfileOf(mod: ModuleData): RapidProfile {
  return RAPID_V1_TEMPORARY_EXCLUSIONS.has(mod.moduleId) ? 'v1' : RAPID_DEFAULT_PROFILE
}

/** Do transition の realization に使う動詞（2値）。 */
export type Verb = '使用' | '服用'

/**
 * canonical `drug.route` から Do の動詞を決定論的に解決する（OD-RAPID-ROUTE-VERB-1）。
 * `oral` → 服用、それ以外の現行 route（injection / ophthalmic / topical）→ 使用。
 */
export function verbForRoute(route: string | undefined): Verb {
  return route === 'oral' ? '服用' : '使用'
}

/** module の Do 用動詞を返す（唯一の判定点）。 */
export function verbOf(mod: ModuleData): Verb {
  return verbForRoute(mod.drug?.route)
}

/**
 * v2 の transition 表示定義（UI表示順・ラベル）。
 *
 * internal semantic と UI 表示ラベルを分離する。「処方整理」というラベルは
 * 「現在の薬を削除する」と誤認されないよう選定された表示専用の文言であり、
 * internal な `regimen_reduced` の意味論（DP-19 OD-RAPID-SCOPE-1）を変えない。
 */
export const RAPID_V2_TRANSITIONS: ReadonlyArray<{ value: RapidTransitionV2; label: string }> = [
  { value: 'continued_do',    label: '前回、Do' },
  { value: 'new_addition',    label: '前回、追加' },
  { value: 'med_changed',     label: '前回、変更' },
  { value: 'regimen_reduced', label: '前回、処方整理' },
  { value: 'dose_increased',  label: '前回、増量' },
  { value: 'dose_decreased',  label: '前回、減量' },
]

/**
 * v2 の outcome 表示定義。v1 の `STATUSES`（stable/improved/unchanged/not_improved 順）
 * とは並び順が異なる（1行目: 現状維持系、2行目: 変化の方向を示す系）。
 * semantic な `SCondition` 4値は v1 と共通であり、新しい値は追加しない。
 */
export const RAPID_V2_OUTCOMES: ReadonlyArray<{ value: SCondition; label: string }> = [
  { value: 'stable',       label: '落ち着いている' },
  { value: 'unchanged',    label: '変わりない' },
  { value: 'improved',     label: '良くなってきた' },
  { value: 'not_improved', label: '改善乏しい' },
]

type Register = 'drug' | 'regimen'

/**
 * scenario の評価単位から realization の register を決定論的に導出する
 * （DP-12 OD-COMPLIANCE-REALIZATION-1）。新しい canonical field は追加しない。
 */
export function registerOf(scenario: Scenario): Register {
  return scenario.scenarioType === 'adherence' ? 'regimen' : 'drug'
}

/** continued_do（Do）は動詞（使用/服用）で表が分かれるため、他5 transitionとは別の型・別テーブルで持つ。 */
type NonDoTransition = Exclude<RapidTransitionV2, 'continued_do'>
type DrugSentenceTable = Record<NonDoTransition, Record<SCondition, (drug: string) => string>>
type RegimenSentenceTable = Record<NonDoTransition, Record<SCondition, string>>

/**
 * Do（continued_do）の realization。動詞（使用/服用）で表が分かれる唯一の transition。
 * drug register では drugName、regimen register では「薬」を主語にして同じ表を使う。
 */
const DO_SENTENCES_BY_VERB: Record<Verb, Record<SCondition, (subject: string) => string>> = {
  使用: {
    stable:       d => `${d}を使用して症状は落ち着いている。`,
    unchanged:    d => `${d}を使用して症状は変わりない。`,
    improved:     d => `${d}を使用して症状は良くなってきた。`,
    not_improved: d => `${d}を使用しているが症状の改善は乏しい。`,
  },
  服用: {
    stable:       d => `${d}を服用して症状は落ち着いている。`,
    unchanged:    d => `${d}を服用して症状は変わりない。`,
    improved:     d => `${d}を服用して症状は良くなってきた。`,
    not_improved: d => `${d}を服用しているが症状の改善は乏しい。`,
  },
}

/**
 * drug-specific realization（副作用確認 scenario 等。continued_do 以外の5 transition）。
 * Owner Decision で確定した完成文をそのまま保持する（prefix+suffix合成をしない）。
 */
const DRUG_SENTENCES: DrugSentenceTable = {
  new_addition: {
    stable:       d => `前回から${d}が追加となり症状は落ち着いている。`,
    unchanged:    d => `前回から${d}が追加となり症状は変わりない。`,
    improved:     d => `前回から${d}が追加となり症状は良くなってきた。`,
    not_improved: d => `前回から${d}が追加となったが症状の改善は乏しい。`,
  },
  med_changed: {
    stable:       d => `前回から${d}に変更となり症状は落ち着いている。`,
    unchanged:    d => `前回から${d}に変更となり症状は変わりない。`,
    improved:     d => `前回から${d}に変更となり症状は良くなってきた。`,
    not_improved: d => `前回から${d}に変更となったが症状の改善は乏しい。`,
  },
  // 処方整理は drug-specific realization でも薬剤名を入れない（限定 multi-module
  // pilot で確定し global promotion でも維持。§6・DP-19 OD-RAPID-SCOPE-1）。「前回、処方整理」は現在表示中の
  // 薬剤が削除されたという意味ではなく前回処方全体の整理後の評価であるため、
  // 特定の1剤名を主語に立てると「その薬が整理された」と誤読され得る。
  // register（drug/regimen）に関わらず同一文になる（REGIMEN_SENTENCES.regimen_reduced
  // と文面が一致するのは意図的な結果であり、値の重複ではない）。
  regimen_reduced: {
    stable:       () => `前回の処方整理後も症状は落ち着いている。`,
    unchanged:    () => `前回の処方整理後も症状は変わりない。`,
    improved:     () => `前回の処方整理後、症状は良くなってきた。`,
    not_improved: () => `前回の処方整理後も症状の改善は乏しい。`,
  },
  dose_increased: {
    stable:       d => `前回から${d}が増量となり症状は落ち着いている。`,
    unchanged:    d => `前回から${d}が増量となり症状は変わりない。`,
    improved:     d => `前回から${d}が増量となり症状は良くなってきた。`,
    not_improved: d => `前回から${d}が増量となったが症状の改善は乏しい。`,
  },
  dose_decreased: {
    stable:       d => `前回から${d}が減量となり症状は落ち着いている。`,
    unchanged:    d => `前回から${d}が減量となり症状は変わりない。`,
    improved:     d => `前回から${d}が減量となり症状は良くなってきた。`,
    not_improved: d => `前回から${d}が減量となったが症状の改善は乏しい。`,
  },
}

/**
 * regimen-level realization（`cp_good` 等の adherence scenario。continued_do 以外の5 transition）。
 * 薬剤名を含めない（コンプライアンスは処方全体・服薬行動全体を評価するため）。
 * Do は DO_SENTENCES_BY_VERB を主語「薬」で使う。
 */
const REGIMEN_SENTENCES: RegimenSentenceTable = {
  new_addition: {
    stable:       '前回の薬剤追加後も症状は落ち着いている。',
    unchanged:    '前回の薬剤追加後も症状は変わりない。',
    improved:     '前回の薬剤追加後、症状は良くなってきた。',
    not_improved: '前回の薬剤追加後も症状の改善は乏しい。',
  },
  med_changed: {
    stable:       '前回の薬剤変更後も症状は落ち着いている。',
    unchanged:    '前回の薬剤変更後も症状は変わりない。',
    improved:     '前回の薬剤変更後、症状は良くなってきた。',
    not_improved: '前回の薬剤変更後も症状の改善は乏しい。',
  },
  regimen_reduced: {
    stable:       '前回の処方整理後も症状は落ち着いている。',
    unchanged:    '前回の処方整理後も症状は変わりない。',
    improved:     '前回の処方整理後、症状は良くなってきた。',
    not_improved: '前回の処方整理後も症状の改善は乏しい。',
  },
  dose_increased: {
    stable:       '前回の増量後も症状は落ち着いている。',
    unchanged:    '前回の増量後も症状は変わりない。',
    improved:     '前回の増量後、症状は良くなってきた。',
    not_improved: '前回の増量後も症状の改善は乏しい。',
  },
  dose_decreased: {
    stable:       '前回の減量後も症状は落ち着いている。',
    unchanged:    '前回の減量後も症状は変わりない。',
    improved:     '前回の減量後、症状は良くなってきた。',
    not_improved: '前回の減量後も症状の改善は乏しい。',
  },
}

/**
 * v2 の S先頭文を生成する（テーブル参照のみ。prefix+suffix合成をしない）。
 *
 * - Do は `verb`（`verbOf(mod)` が canonical `drug.route` から解決）で realize する。
 *   regimen register では主語を「薬」、drug register では drugName を主語にする。
 * - Do 以外の `register === 'regimen'` は薬剤名を含まない regimen-level 文を返す。
 * - `register === 'drug'` で drugName が空の場合は v1 の generic fallback（「薬」）と
 *   同じ考え方で暗黙の主語を補う（新しい fallback 設計は行わない）。
 */
export function buildV2FirstSentence(
  transition: RapidTransitionV2,
  outcome: SCondition,
  register: Register,
  drugName: string | undefined,
  verb: Verb,
): string {
  if (transition === 'continued_do') {
    return DO_SENTENCES_BY_VERB[verb][outcome](register === 'regimen' ? '薬' : (drugName || '薬'))
  }
  if (register === 'regimen') return REGIMEN_SENTENCES[transition][outcome]
  return DRUG_SENTENCES[transition][outcome](drugName || '薬')
}

/**
 * multi-node S 合成用の Rapid v2 semantic state（OD-RAPID-COMPOSITION-1）。
 * 合成時に `rapidV2CompositionOf` が node から導出する。永続化しない。
 */
export type RapidV2Composition = {
  transition: RapidTransitionV2
  outcome: SCondition
  /** regimen-level realization（regimen register、または regimen_reduced）か */
  regimenLevel: boolean
}

/**
 * node を S 合成へ渡す時点で Rapid v2 composition state を導出する。
 *
 * `block.rapidV2Register`（rebuild 時に v2 module の Rapid-capable scenario でのみ書かれる scenario 由来の値）と
 * `node.rapid`（live state）が揃うときだけ返す。rapid は block ではなく node から読むため、
 * block を spread したまま rapid だけを null にする経路でも stale にならない。
 */
export function rapidV2CompositionOf(node: ComposeNode): RapidV2Composition | undefined {
  const register = node.block.rapidV2Register
  if (register === undefined || node.rapid === null) return undefined
  const { previousEvent: transition, currentOutcome: outcome } = node.rapid
  return { transition, outcome, regimenLevel: register === 'regimen' || transition === 'regimen_reduced' }
}
