/**
 * rapidV2.ts — Rapid v2（H1 Reference Implementation）専用ロジック
 *
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-H1-PILOT-1。
 *
 * ## 位置づけ（重要）
 *
 * 本ファイルは H1点眼（`allergy_h1_antihistamine_eye_drops`）1 module 限定の
 * pilot 実装である。**Rapid v1（`lib/rapidSentence.ts`）は一切変更しない。**
 * v1 の5 relation（`new_addition` / `med_changed` / `dose_increased` /
 * `dose_decreased` / `continued_do`）× 4 condition の taxonomy・文言・test契約は
 * 本ファイルの追加によって一切影響を受けない。
 *
 * H1専用の分岐は本ファイルの `RAPID_V2_MODULE_IDS` allowlist の1点に閉じ込める。
 * 呼び出し側（deriveNodeFields.ts / DashboardClient.tsx / ThirdPanel.tsx）は
 * `rapidProfileOf(mod)` を通じてのみ v1/v2 を判定し、module ID を直接分岐条件に
 * 使わない。
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
 * 完成文をそのままテーブルとして保持する（H1 pilot 限定の明示的な選択。
 * 将来の全 module 一般化時にどう再設計するかは Q-RAPID1 の検証結果を待つ）。
 *
 * realization は scenario の評価単位で決定論的に分岐する
 * （DP-12 OD-COMPLIANCE-REALIZATION-1）:
 *   - `scenario.scenarioType === 'adherence'` → regimen-level（薬剤名を含めない）
 *   - それ以外（H1 では副作用確認 scenario）      → drug-specific（薬剤名を含む）
 * 新しい canonical field は追加しない。既存の `scenarioType` のみで判定する。
 *
 * `display.adjustmentExpression`（H1 の「点眼回数が増えた/減った」）は
 * v2 では参照しない（増量/減量まで抽象化する Owner Decision）。bridge / canonical /
 * v1 の挙動・audit は変更しない — v2 の realization 関数が単にこの field を
 * 引数に取らないことで「参照しない」を構造的に保証する。
 */

import type { ModuleData, Scenario } from './types'
import type { SCondition } from './rapidSentence'
import type { RapidTransitionV2 } from './rapidState'

export type RapidProfile = 'v1' | 'v2'

/**
 * Rapid v2 pilot の対象 module allowlist。
 *
 * OD-RAPID-H1-PILOT-1 の条件: 検証期間中は H1点眼 1件のみ。
 * moduleId の prefix 一致・categoryPath からの推測は行わない
 * （oral H1 等の巻き込みを防ぐため、Set による完全一致のみを判定に使う）。
 * 他 module を追加する場合は Q-RAPID1 の再判断を要する。
 */
const RAPID_V2_MODULE_IDS: ReadonlySet<string> = new Set([
  'allergy_h1_antihistamine_eye_drops',
])

/** module が Rapid v1 / v2 のどちらの realization を使うかを返す（唯一の判定点）。 */
export function rapidProfileOf(mod: ModuleData): RapidProfile {
  return RAPID_V2_MODULE_IDS.has(mod.moduleId) ? 'v2' : 'v1'
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

type SentenceTable = Record<RapidTransitionV2, Record<SCondition, string>>
type DrugSentenceTable = Record<RapidTransitionV2, Record<SCondition, (drug: string) => string>>

/**
 * drug-specific realization（副作用確認 scenario 等）。
 * Owner Decision で確定した完成文をそのまま保持する（prefix+suffix合成をしない）。
 */
const DRUG_SENTENCES: DrugSentenceTable = {
  continued_do: {
    stable:       d => `${d}を使用して症状は落ち着いている。`,
    unchanged:    d => `${d}を使用して症状は変わりない。`,
    improved:     d => `${d}を使用して症状は良くなってきた。`,
    not_improved: d => `${d}を使用しているが症状の改善は乏しい。`,
  },
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
  regimen_reduced: {
    stable:       d => `前回の処方整理後も${d}で症状は落ち着いている。`,
    unchanged:    d => `前回の処方整理後も${d}で症状は変わりない。`,
    improved:     d => `前回の処方整理後も${d}で症状は良くなってきた。`,
    not_improved: d => `前回の処方整理後も${d}で症状の改善は乏しい。`,
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
 * regimen-level realization（`cp_good` 等の adherence scenario）。
 * 薬剤名を含めない（コンプライアンスは処方全体・服薬行動全体を評価するため）。
 */
const REGIMEN_SENTENCES: SentenceTable = {
  continued_do: {
    stable:       '薬を使用して症状は落ち着いている。',
    unchanged:    '薬を使用して症状は変わりない。',
    improved:     '薬を使用して症状は良くなってきた。',
    not_improved: '薬を使用しているが症状の改善は乏しい。',
  },
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
 * `register === 'regimen'` のとき drugName は使用しない（薬剤名を Rapid 文へ
 * 入れない）。`register === 'drug'` で drugName が空の場合は v1 の generic
 * fallback（「薬」）と同じ考え方で暗黙の主語を補う（新しい fallback 設計は
 * 行わない）。
 */
export function buildV2FirstSentence(
  transition: RapidTransitionV2,
  outcome: SCondition,
  register: Register,
  drugName: string | undefined,
): string {
  if (register === 'regimen') return REGIMEN_SENTENCES[transition][outcome]
  return DRUG_SENTENCES[transition][outcome](drugName || '薬')
}
