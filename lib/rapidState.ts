/**
 * rapidState.ts — Rapid Mode v2 の状態モデル（pure）
 *
 * Rapid Mode v2 / Unit 1。
 *
 * ## RAPID-V2-03
 * RapidState は `{ previousEvent, currentOutcome } | null` である。
 * null は「Rapid 未選択」を意味し、`{ continued_do, stable }` とは**別状態**でなければならない。
 * Unit 1 以前は sRelation / sCondition の 2 state で表現しており、初期値が
 * continued_do / stable であったため両者を区別できなかった（UI 上、未選択でも
 * 「前回、Do × 体調落ち着いている」が点灯していた）。
 *
 * ## RAPID-V2-07（Owner Decision により確定した「保持」の意味）
 * RapidState が non-null である場合、その Rapid の意味は生成される SOAP へ
 * 反映されていなければならない。「state だけ保持して本文には反映しない」状態は禁止する。
 *
 * ## 所有者について（Unit 1 時点）
 * Unit 1 では RapidState は DashboardClient の global state が保持する。
 * Unit 2 で Drug Node 所有（RAPID-V2-01）へ移す予定であるため、本ファイルの型・関数は
 * global / node のどちらであるかを一切前提にしない（node 単位でもそのまま再利用できる）。
 */

import type { SRelation, SCondition } from './rapidSentence'

/**
 * Rapid v1 の previousEvent 軸（5種）に、Rapid v2（H1 Reference Implementation。
 * `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 / Owner Decision OD-RAPID-H1-PILOT-1）が
 * 追加する6件目の semantic を加えた型。
 *
 * `regimen_reduced`（前回、処方整理）: 前回処方から薬剤が外れた後の、現在時点での
 * 継続薬の評価を表す。現在表示中の薬剤を中止する意味ではない
 * （`docs/DESIGN_PRINCIPLES.md` DP-19 OD-RAPID-SCOPE-1 が意味境界を確定済み）。
 * 削除された薬剤名・削除薬リストは保持しない。
 *
 * この6件目の値は `lib/rapidV2.ts` の allowlist（H1点眼 1 module 限定）でのみ
 * 選択可能である。v1 の5 relation・文言・taxonomy（本ファイル・rapidSentence.ts）は
 * 一切変更していない。
 */
export type RapidTransitionV2 = SRelation | 'regimen_reduced'

/**
 * Rapid の選択状態。
 *   null      — Rapid 未選択（scenario 本来の S をそのまま使う）
 *   non-null  — previousEvent × currentOutcome が選択済み。SOAP へ反映されていること
 *
 * v1 の軸は previousEvent 5種 × currentOutcome 4種を維持する（RAPID-V2-02）。
 * v1 の5値・4値そのものへの追加・削除は禁止。
 *
 * previousEvent の型は `RapidTransitionV2`（v1の5値 + H1 pilot 限定の
 * `regimen_reduced`）である。H1点眼以外の module では `regimen_reduced` は
 * 到達不能（`lib/rapidV2.ts` の allowlist と、書き込み経路のガードにより保証）。
 */
export type RapidState = {
  previousEvent:  RapidTransitionV2
  currentOutcome: SCondition
} | null

/** 同一の Rapid 選択かどうか（toggle-off 判定に使う） */
export function isSameRapid(
  a: RapidState,
  previousEvent: RapidTransitionV2,
  currentOutcome: SCondition,
): boolean {
  return a !== null &&
    a.previousEvent === previousEvent &&
    a.currentOutcome === currentOutcome
}

/**
 * scenario 変更時の RapidState 遷移（RAPID-V2-07）。
 *
 * | current  | old capable | new capable | 戻り値 |
 * |----------|-------------|-------------|--------|
 * | non-null | ✓           | ✓           | 保持   |
 * | non-null | ✓           | ✗           | null   |
 * | non-null | ✗           | ✓           | null（自動付与しない） |
 * | null     | *           | *           | null   |
 *
 * 本関数は「scenario が別の scenario へ切り替わる」遷移のみを担当する。
 * シナリオ解除・薬剤切替・Express 確定・NLP 遷移は「コンテキスト破棄」であり
 * 意味論が異なるため、呼び出し側が明示的に null を設定する。
 */
export function nextRapidStateOnScenarioChange(
  current: RapidState,
  oldCapable: boolean,
  newCapable: boolean,
): RapidState {
  if (current === null) return null            // 元々未選択 → 常に未選択
  if (oldCapable && newCapable) return current // capable 間 → 保持（新 S へ再適用する）
  return null                                  // capable を外れる / 外から入る → 未選択
}
