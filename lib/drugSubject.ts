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
 * **適用範囲（Q-S2 U-4b・2026-08-12 で明確化）**: `BrandResolution` を持たない経路
 * ——Express（`handleExpressAdd`）・legacy 非検索経路・test harness——における
 * 薬剤名解決の正本。呼び出し元固有のフォールバックロジックを個別に書かず、
 * 常にこの関数を経由すること。
 *
 * **検索由来の候補（`DrugSuggestionItem`）には使用しない。** そちらは
 * `resolveSubjectFromResolution()` が正本である（本ファイル下部）。
 * 本関数は削除も deprecated 化もされていない。両者は入力の異なる別経路である。
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
 * **検索由来候補の SOAP 主語はこの関数が正本である（Q-S2 U-4b・2026-08-12）。**
 * `app/components/DashboardClient.tsx` の primary / compose の write site が本関数を経由し、
 * 表示文字列や brand 名の比較から主語を逆算する経路は production から除去された。
 *
 * `BrandResolution` を持たない経路（Express・legacy 非検索経路・test harness）は
 * 引き続き `resolveDrugName()` を使用する。両者は入力が異なる別経路であり、
 * `resolveDrugName()` は削除も deprecated 化もされていない。
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
