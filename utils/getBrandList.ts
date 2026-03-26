import type { Drug } from '../lib/types'

/**
 * ブランド名リストを返す唯一のアクセサ。
 *
 * ## 優先順位
 * 1. `drug.brandCatalog` が存在する場合: `brandNames` の順序を表示順として使用する。
 *    brandNames は brandCatalog の表示順リストとして機能し、
 *    validator（BRAND_CATALOG_MISMATCH）により集合一致が保証されている。
 * 2. `drug.brandCatalog` が存在しない場合: `drug.brandNames` をそのまま返す。
 * 3. どちらも存在しない場合: 空配列を返す。
 *
 * ## なぜ Object.keys(brandCatalog) ではなく brandNames を使うか
 * JSON オブジェクトのキー順序は仕様上保証されない。
 * 表示順の正本は brandNames であるため、brandCatalog 存在下でも brandNames を返す。
 */
export function getBrandList(drug: Drug): string[] {
  if (drug.brandCatalog) {
    return drug.brandNames ?? []
  }
  return drug.brandNames ?? []
}
