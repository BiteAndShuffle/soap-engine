/**
 * deriveNodeFields.ts — Drug Node の raw SOAP フィールドを deterministic に導出する（pure）
 *
 * Rapid Mode v2 / Unit 2A（deterministic derive foundation）。
 * Unit 3A で secondary Node 用の deriveNodeBlockCore を追加した。
 *
 * ## 本ファイルの位置づけ
 *
 * Unit 2A は **helper を追加するだけの準備 Unit** であり、本関数は現時点で
 * production runtime から呼ばれていない（behavior change = 0）。
 * 呼び出し経路の移行は Unit 2B（primary）／ Unit 3A（secondary Node）で行った。
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
 *   deriveRawFields には含めない。** primary はこれらを使用しない。
 *   secondary Node 用の block メタデータは deriveNodeBlockCore が担当する
 *   （下記）。責務を分離し、deriveRawFields の signature・戻り値は変更しない。
 * - `buildNodeFields` と Unit 1 の Rapid helper は**変更しない**。本関数は
 *   両者を組み合わせるだけの薄い wrapper であり、同一ロジックを複製しない。
 */

import type { ModuleData, MergedBlock, Scenario, SoapFields } from './types'
import type { RapidState } from './rapidState'
import type { PersonaGuard } from './personaGuard'
import { buildNodeFields } from './buildSoap'
import { derivePersonaGuard } from './personaGuard'
import {
  buildResolvedSFirstSentence,
  replaceSFirstSentence,
  type AdjustmentExpression,
} from './rapidSentence'

/**
 * buildNodeFields の結果へ Rapid 先頭文を重ねる（rapid === null なら素通し）。
 *
 * deriveRawFields と deriveNodeBlockCore の共通部分。
 * 両者が必ず同一の S を生成することを構造的に保証するために切り出した
 * （同一ロジックを 2 箇所へ複製しない — Unit 2A の設計方針を踏襲。Unit 3A で追加）。
 *
 * buildNodeFields は本関数 1 回の derive あたり deriveRawFields / deriveNodeBlockCore
 * それぞれで 1 回だけ呼ばれる（呼び出し側の責務）。本関数自体は buildNodeFields を呼ばない。
 */
function withRapidFirstSentence(
  fields: SoapFields,
  rapid: RapidState,
  adjustmentExpression: AdjustmentExpression | undefined,
  drugName: string,
): SoapFields {
  // Rapid 未選択（RAPID-V2-03 の null）— scenario 本来の S をそのまま使う
  if (rapid === null) return fields
  // Rapid 選択中 — S の先頭文のみ差し替える。
  // 残余（シナリオ固有の観察文）と ADDON 本文は先頭文の後ろにあるため保持される。
  // O / A / P は Rapid の対象外（Rapid は S 欄のみを変更する）。
  return {
    ...fields,
    S: replaceSFirstSentence(
      fields.S,
      buildResolvedSFirstSentence(
        rapid.previousEvent,
        rapid.currentOutcome,
        drugName,
        adjustmentExpression,
      ),
    ),
  }
}

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

  // 2〜3. Rapid 先頭文を重ねる（rapid === null なら素通し）
  return withRapidFirstSentence(fields, rapid, mod.display?.adjustmentExpression, drugName)
}

/**
 * secondary Node の block を構成するために必要な、
 * scenario + ADDON + Rapid から deterministic に導出できる部分。
 *
 * Rapid Mode v2 / Unit 3A。
 *
 * MergedBlock から以下を除いたもの:
 *   id     — node のライフサイクルに属し derive 対象ではない
 *   fields — persona 適用後の値。persona は global boundary（RAPID-V2-10）であり
 *            本 helper の責務外。呼び出し側が rawFields + guard から適用する
 *   domain — module 単位の値であり scenario / ADDON / Rapid から導出されない
 *
 * rawFields / guard は MergedBlock 上では optional だが、本 helper は常に生成するため
 * required で宣言する（MergedBlock.guard の「rawFields と常にセットで保存すること」に対応）。
 */
export type NodeBlockCore = {
  templateLabel:   string
  rawFields:       SoapFields
  guard:           PersonaGuard
  symptomCodes:    string[] | undefined
  closingText:     string | undefined
  closingBehavior: 'dedupe_or_last' | 'append_all' | undefined
  groupKey:        string | undefined
  clinicalDomain:  string | undefined
}

// MergedBlock 側のフィールドが増減した場合に tsc で検出するための drift guard。
// 実行時の値を持たない型レベルのアサーションである。
type _NodeBlockCoreFitsMergedBlock =
  NodeBlockCore extends Omit<MergedBlock, 'id' | 'fields' | 'domain'> ? true : never
const _nodeBlockCoreFits: _NodeBlockCoreFitsMergedBlock = true
void _nodeBlockCoreFits

/**
 * secondary Node の block core を deterministic に導出する。
 *
 * Rapid Mode v2 / Unit 3A。
 *
 * ## deriveRawFields との関係
 * 本関数の rawFields は `deriveRawFields(scenario, mod, addonIds, rapid, drugName)` と
 * **常に同値**である（両者とも withRapidFirstSentence を通る）。
 * 差分は block メタデータ（templateLabel / symptomCodes / closingText /
 * closingBehavior / groupKey / clinicalDomain）と guard を併せて返す点のみ。
 * primary はこれらを使用しないため deriveRawFields 側には追加しない（責務分離）。
 *
 * ## persona について
 * 本関数は persona を**適用しない**。返す guard は scenario 由来の PersonaGuard であり、
 * persona identity（personaEnabled / selectedPersona）ではない。
 * persona 適用は従来どおり呼び出し側の applyPersonaToFieldsWithGuard が行う
 * （Persona Scope Boundary を維持する。本関数は applyPersonaToFieldsWithGuard を
 * 呼ばない — raw → persona の一方向境界を守り、二重 materialization を起こさない）。
 *
 * ## localInput について
 * 含めない。localInput は materialize されず render 時に適用される既存契約を変更しない。
 *
 * ## Unit 3A 時点での rapid について
 * production call site（DashboardClient.tsx）は rapid に常に null を渡す
 * （ComposeNode はまだ rapid を所有しない）。本関数自体が rapid を受け取れることは
 * Unit 3B での node.rapid 接続を可能にするための deterministic derive boundary であり、
 * Unit 3A の時点で secondary Node の Rapid UI を解禁するものではない。
 */
export function deriveNodeBlockCore(
  scenario: Scenario,
  mod: ModuleData,
  addonIds: string[],
  rapid: RapidState,
  drugName = '',
): NodeBlockCore {
  const { fields, closingText, groupKey, clinicalDomain, closingBehavior } =
    buildNodeFields(scenario, mod, addonIds, drugName)   // ← 1 操作あたり 1 回のみ
  return {
    templateLabel:   scenario.title,
    rawFields:       withRapidFirstSentence(fields, rapid, mod.display?.adjustmentExpression, drugName),
    guard:           derivePersonaGuard(scenario, mod.template?.urgentFlag),
    symptomCodes:    scenario.sComposition?.symptomCodes,
    closingText,
    closingBehavior,
    groupKey,
    clinicalDomain,
  }
}
