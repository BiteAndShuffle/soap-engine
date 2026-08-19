/**
 * deriveNodeFields.ts — Drug Node の raw SOAP フィールドを deterministic に導出する（pure）
 *
 * Rapid Mode v2 / Unit 2A（deterministic derive foundation）。
 *
 * ## 本ファイルの位置づけ
 *
 * Unit 2A は **helper を追加するだけの準備 Unit** であり、本関数は現時点で
 * production runtime から呼ばれていない（behavior change = 0）。
 * 呼び出し経路の移行は Unit 2B（primary）／ Unit 3（secondary Node）で行う。
 *
 * ## なぜ必要か（Repository 実測に基づく）
 *
 * secondary ComposeNode は既に deterministic derive を使っている:
 *
 *     buildNodeFields(scenario, mod, addonIds, drugName)
 *       → derivePersonaGuard → applyPersonaToFieldsWithGuard
 *
 * 一方 primary だけが path-dependent な増分パッチで raw を更新している
 * （scenario 切替は addonIds に `[]` を渡し、ADDON は strip / re-add、
 *   Rapid は先頭文の差し替え / 復元）。この非対称が
 * 「RapidState と materialize 済み文字列の二重 SSOT」の原因になっている。
 *
 * 本関数は「scenario + ADDON + Rapid」を**入力から一意に決まる出力**へ写す。
 * 適用順は buildNodeFields（scenario 本文 → followup S → ADDON → followup P →
 * {{drug_subject}} 解決）の後に Rapid 先頭文を重ねる形であり、
 * これは Unit 1 で確定した scenario 再構築 effect の適用順と同一である。
 *
 * ## 責務境界
 *
 * - **persona は含めない。** 本関数は persona 未適用の raw fields までを担当し、
 *   persona は既存どおり後段（applyPersonaToFieldsWithGuard）で適用する。
 *   persona は global boundary を維持する（RAPID-V2-10）。
 * - **localInput は含めない。** localInput は materialize されず、
 *   表示直前（finalFields）で render 時に適用される既存契約を変更しない。
 * - **block メタデータ（closingText / groupKey / clinicalDomain / closingBehavior）は
 *   含めない。** primary はこれらを使用しない。必要な呼び出し側は
 *   `buildNodeFields` から直接取得する。
 * - `buildNodeFields` と Unit 1 の Rapid helper は**変更しない**。本関数は
 *   両者を組み合わせるだけの薄い wrapper であり、同一ロジックを複製しない。
 */

import type { ModuleData, Scenario, SoapFields } from './types'
import type { RapidState } from './rapidState'
import { buildNodeFields } from './buildSoap'
import { buildResolvedSFirstSentence, replaceSFirstSentence } from './rapidSentence'

/**
 * scenario + ADDON + Rapid から persona 未適用の raw SOAP フィールドを導出する。
 *
 * deterministic である: 同じ入力に対して常に byte-identical な出力を返し、
 * 直前の表示内容や操作履歴（path）に依存しない。
 *
 * @param scenario  対象シナリオ
 * @param mod       対象モジュール（followup / addon / adjustmentExpression の解決に使用）
 * @param addonIds  選択中の addon キー配列。**配列順がそのまま本文の並び順になる**
 * @param rapid     Rapid 選択状態。`null` は未選択を意味し、S 先頭文へ何も適用しない
 * @param drugName  {{drug_subject}} と Rapid 先頭文へ代入する薬剤名。
 *                  空文字 / undefined の場合、buildNodeFields はスロットをそのまま残し、
 *                  Rapid 先頭文は generic な「薬」表現のままになる
 * @returns         persona 未適用の SoapFields
 */
export function deriveRawFields(
  scenario: Scenario,
  mod: ModuleData,
  addonIds: string[],
  rapid: RapidState,
  drugName = '',
): SoapFields {
  // 1. scenario 本文 + followup + ADDON + {{drug_subject}} 解決
  //    （既存 production の derive をそのまま使う。ロジックを複製しない）
  const { fields } = buildNodeFields(scenario, mod, addonIds, drugName)

  // 2. Rapid 未選択（RAPID-V2-03 の null）— scenario 本来の S をそのまま使う
  if (rapid === null) return fields

  // 3. Rapid 選択中 — S の先頭文のみ差し替える。
  //    残余（シナリオ固有の観察文）と ADDON 本文は先頭文の後ろにあるため保持される。
  //    O / A / P は Rapid の対象外（Rapid は S 欄のみを変更する）。
  return {
    ...fields,
    S: replaceSFirstSentence(
      fields.S,
      buildResolvedSFirstSentence(
        rapid.previousEvent,
        rapid.currentOutcome,
        drugName,
        mod.display?.adjustmentExpression,
      ),
    ),
  }
}
