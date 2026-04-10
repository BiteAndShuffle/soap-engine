/**
 * drugSubject.ts
 *
 * {{drug_subject}} スロットの解決ユーティリティ。
 *
 * 設計原則:
 *   - S / A / P のみ置換対象。O は置換しない（処方ラベルは薬剤クラス名固定）。
 *   - 置換はできるだけ早い段階（primary 確定時・node block 構築時）で行う。
 *   - drugName が空文字の場合はスロットをそのまま残す（サイレント失敗なし）。
 *
 * 薬剤名解決の優先順:
 *   1. matchedBrandName（サジェストでユーザーが選んだブランド名）
 *   2. drug?.brandNames?.[0]（モジュールのデフォルトブランド名）
 *   3. drug?.genericName（一般名フォールバック）
 *   4. '' → 未解決のまま（{{drug_subject}} を残す）
 */

import type { SoapFields, Drug } from './types'

export const DRUG_SUBJECT_SLOT = '{{drug_subject}}'

/**
 * フィールドセット内の {{drug_subject}} を drugName で置換する。
 *
 * - S / A / P のみ置換。O は変更しない。
 * - drugName が空文字の場合はフィールドをそのまま返す（スロットを残す）。
 * - replaceAll を使用するため、1フィールド内に複数あっても全件置換される。
 */
export function resolveDrugSubject(fields: SoapFields, drugName: string): SoapFields {
  if (!drugName) return fields
  const replace = (s: string): string => s.replaceAll(DRUG_SUBJECT_SLOT, drugName)
  return {
    S: replace(fields.S),
    O: fields.O,          // O は置換しない（処方ラベルは薬剤クラス名固定）
    A: replace(fields.A),
    P: replace(fields.P),
  }
}

/**
 * モジュールの drug 情報と matchedBrandName から薬剤名を解決する。
 *
 * 優先順:
 *   1. matchedBrandName（サジェスト時のブランド選択）
 *   2. drug?.brandNames?.[0]（モジュールデフォルト）
 *   3. drug?.genericName（一般名フォールバック）
 *   4. ''（解決不能: スロットを残す）
 */
export function resolveDrugName(
  drug: Drug | undefined,
  matchedBrandName?: string,
): string {
  if (matchedBrandName) return matchedBrandName
  if (drug?.brandNames?.[0]) return drug.brandNames[0]
  if (drug?.genericName) return drug.genericName
  return ''
}
