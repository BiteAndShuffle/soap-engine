/**
 * drugSubject.ts
 *
 * {{drug_subject}} スロットの解決ユーティリティ。
 *
 * 設計原則:
 *   - S / O / A / P を置換対象とする。
 *   - O フィールドも drug_subject 解決の対象。
 *     （系統名固定ではなく対象薬剤名寄りの表示にする方針）
 *   - 置換はできるだけ早い段階（primary 確定時・node block 構築時）で行う。
 *   - drugName が空文字の場合はスロットをそのまま残す（サイレント失敗なし）。
 *
 * 薬剤名解決の優先順:
 *   1. matchedBrandName（サジェストでユーザーが選んだブランド名 = 商品名）
 *   2. drug?.brandNames?.[0] に対応する brandCatalog[...].displayGenericName
 *      （ブランド未確定時。表示用一般名のSSOT。genericName＝正式名称へはフォールバックしない）
 *   3. '' → 未解決のまま（{{drug_subject}} を残す）
 */

import type { SoapFields, Drug } from './types'
import type { BrandResolution } from './brandResolution'

export const DRUG_SUBJECT_SLOT = '{{drug_subject}}'

/**
 * フィールドセット内の {{drug_subject}} を drugName で置換する。
 *
 * - S / O / A / P すべてを置換対象とする。
 * - drugName が空文字の場合はフィールドをそのまま返す（スロットを残す）。
 * - replaceAll を使用するため、1フィールド内に複数あっても全件置換される。
 */
export function resolveDrugSubject(fields: SoapFields, drugName: string): SoapFields {
  if (!drugName) return fields
  const replace = (s: string): string => s.replaceAll(DRUG_SUBJECT_SLOT, drugName)
  return {
    S: replace(fields.S),
    O: replace(fields.O),
    A: replace(fields.A),
    P: replace(fields.P),
  }
}

/**
 * モジュールの drug 情報と matchedBrandName から薬剤名を解決する。
 *
 * 通常UI・SOAP生成における薬剤名解決のSSOT。呼び出し元固有のフォールバック
 * ロジックを個別に書かず、常にこの関数を経由すること。
 *
 * 優先順:
 *   1. matchedBrandName（サジェスト時のブランド選択 = 商品名）
 *   2. drug?.brandNames?.[0] に対応する brandCatalog[...].displayGenericName
 *      （ブランド未確定時。表示用一般名のSSOT）
 *   3. ''（解決不能: スロットを残す。genericName＝正式名称へは暗黙フォールバックしない）
 */
export function resolveDrugName(
  drug: Drug | undefined,
  matchedBrandName?: string,
): string {
  if (matchedBrandName) return matchedBrandName
  const fallbackBrand = drug?.brandNames?.[0]
  if (fallbackBrand) {
    const displayGeneric = drug?.brandCatalog?.[fallbackBrand]?.displayGenericName
    if (displayGeneric) return displayGeneric
  }
  return ''
}

/**
 * BrandResolution（`lib/brandResolution.ts`）から SOAP {{drug_subject}} を確定する。
 *
 * **移行状態（2026-08-09 時点）**: 本関数は Q-S2 の新しい正式契約として実装されたが、
 * production consumer の移行は未着手である（Unit U-4 の責務）。`app/components/DashboardClient.tsx`
 * は本関数を呼ばず、引き続き `resolveDrugName()`（legacy resolver）を経由している。
 * 本関数が production 上の唯一の SSOT となるのは、U-4 で consumer が移行した時点である。
 * 詳細は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 を参照。
 *
 * 実装原則:
 * - `resolution.subject` をそのまま返す（`brand` / `generic` → string、`module` → null）
 * - `genericKey` / `brandKeys` から subject を再導出しない
 * - canonical JSON を再探索しない
 * - `uiLabel` / `drugDisplayLabel` / `brandNames[0]` のいずれも参照しない
 * - throw しない。`null` は「未確定」という正常な domain state であり、例外ではない
 *   （`denotation: 'module'` の候補へ推測で subject を与えてはならない。DP-15）
 */
export function resolveSubjectFromResolution(resolution: BrandResolution): string | null {
  return resolution.subject
}
