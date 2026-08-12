/**
 * brandTags.ts
 *
 * 状態: Current Standard（docs/DEVELOPMENT_STANDARD.md §10.1 準拠）
 *
 * `BrandResolution`（`lib/brandResolution.ts`）から brand 固有 `handlingTags` を
 * 安全に導出する純関数。UI に依存しない。
 *
 * 本ファイルは Q-S2（`docs/OPEN_DESIGN_QUESTIONS.md`）の実装 Unit U-5 の成果物であり、
 * 「authoritative な単一 brandKey が存在しない状態で brand 固有値を取得しない」という
 * 契約を実装するためにある。
 *
 * ── なぜ `undefined` を「未確定」の表現に使わないか ──────────────
 *
 * `lib/addonFilter.ts` の `getVisibleAddonKeys()` は `brandHandlingTags === undefined` の
 * とき **brand フィルタを丸ごとスキップする**（後方互換仕様）。したがって未確定を
 * `undefined` で表現すると、brand 依存 ADDON が逆に全表示され、契約と正反対の結果になる。
 *
 * 未確定は **空配列 `[]`** で表現する。`requiredTags` を持つ ADDON / scenario は
 * `[].includes(tag)` が常に false となるため満たされず、`requiredTags` を持たないものは
 * そのまま残る。これが「authoritative な brand 固有タグが存在しない」の正しい意味論である。
 *
 * ── 関連 ──────────────────────────────────────────────────────
 *
 * - 型契約                       : `lib/brandResolution.ts`
 * - 論点・Owner Decision         : `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2
 * - 設計根拠（交差集合の採用理由）: `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §13
 * - 不確定性を推測で埋めない原則 : `docs/DESIGN_PRINCIPLES.md` DP-15
 */

import type { BrandResolution } from './brandResolution'
import type { BrandEntry } from './types'

/** `drug.brandCatalog` と同じ形。 */
export type BrandCatalog = Record<string, BrandEntry>

/**
 * generic group を構成する全 brand の `handlingTags` の**交差集合**を返す。
 *
 * **代表 brand を選ばない。** group 内の全 brand が持つタグだけを残すため、
 * 患者が実際に受け取った brand が group 内のどれであっても、返されたタグは必ず真である。
 *
 * - `brandKeys` の並び順に依存しない（集合演算のみで構成する）
 * - `handlingTags` 未定義の brand は空集合として扱う。1 件でも未定義があれば結果は `[]` になる
 * - **`brandKeys` への添字アクセスを行わない。** 特定の 1 件を基準に選ぶ実装は、
 *   たとえ順序付けのためだけであっても採らない（`brandNames[0]` fallback と同型の
 *   コードパターンを再導入しないため）
 * - 返す配列は辞書順にソートする。順序は意味を持たず（消費側はいずれも
 *   `Array.prototype.includes` による所属判定のみを行う）、`brandKeys` の順序から
 *   独立した決定論的な出力にするためである
 */
export function intersectHandlingTags(
  brandKeys: readonly string[],
  brandCatalog: BrandCatalog,
): string[] {
  if (brandKeys.length === 0) return []
  const sets = brandKeys.map(b => new Set<string>(brandCatalog[b]?.handlingTags ?? []))
  const union = new Set<string>()
  for (const s of sets) for (const tag of s) union.add(tag)
  return [...union].filter(tag => sets.every(s => s.has(tag))).sort()
}

/**
 * `BrandResolution` から、ADDON フィルタ等へ渡す `handlingTags` を導出する。
 *
 * | 入力 | 返り値 | 意味 |
 * |---|---|---|
 * | `resolution === undefined` | `brandCatalog[legacyBrandKey]?.handlingTags` | legacy / 非検索経路（Express・初期ロード）。**従来の挙動をそのまま維持する** |
 * | `denotation: 'brand'` | `brandCatalog[brandKey]?.handlingTags` | authoritative な brandKey が存在する |
 * | `denotation: 'generic'` | `intersectHandlingTags(brandKeys, …)` | 単一 brandKey は存在しない。group 全体で真のタグのみ |
 * | `denotation: 'module'` | `[]` | brand も一般名も未確定。brand 固有値を解決してはならない |
 *
 * `'brand'` / legacy 経路で `undefined` を返しうるのは、`brandCatalog` エントリが
 * `handlingTags` を宣言していない場合である（実測: 119 エントリ中 36 件）。これは
 * 「未確定」ではなく「このブランドにタグ宣言がない」という既存状態であり、
 * 従来どおり brand フィルタをスキップさせる。**新たに未確定を `undefined` で
 * 表現してはならない。**
 */
export function resolveBrandHandlingTags(
  resolution: BrandResolution | undefined,
  brandCatalog: BrandCatalog,
  legacyBrandKey: string | undefined,
): string[] | undefined {
  if (resolution === undefined) {
    if (!legacyBrandKey) return undefined
    return brandCatalog[legacyBrandKey]?.handlingTags
  }
  switch (resolution.denotation) {
    case 'brand':
      return brandCatalog[resolution.brandKey]?.handlingTags
    case 'generic':
      return intersectHandlingTags(resolution.brandKeys, brandCatalog)
    case 'module':
      return []
  }
}

/**
 * brand 固有データ（`drugResolution.brandToTags` 等）の参照キーを導出する。
 *
 * `null` は「authoritative な brandKey が存在しないため brand 固有データを参照しては
 * ならない」を意味する。**表示ラベルの解決には使用しない**（表示は `uiLabel` 責務であり、
 * 本関数の対象外。`docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §6.1）。
 *
 * | 入力 | 返り値 |
 * |---|---|
 * | `resolution === undefined` | `legacyBrandKey ?? null`（legacy / 非検索経路。従来どおり） |
 * | `denotation: 'brand'` | `brandKey` |
 * | `denotation: 'generic'` | `null`（代表 brand を選んではならない） |
 * | `denotation: 'module'` | `null` |
 */
export function resolveDataAccessBrandKey(
  resolution: BrandResolution | undefined,
  legacyBrandKey: string | undefined,
): string | null {
  if (resolution === undefined) return legacyBrandKey ?? null
  return resolution.denotation === 'brand' ? resolution.brandKey : null
}

/**
 * SOAP 生成・scenario 選択へ進んでよいかを判定する。
 *
 * **`resolution.denotation` のみを読む。`resolution.subject` は読まない**
 * （subject の算出方法は U-4b の責務であり、gate とは独立した関心事である）。
 *
 * `true` を返すのは `denotation: 'module'` のときだけである。
 * `undefined`（Express・初期ロード）・`'brand'`・`'generic'` はいずれも `false`
 * であり、従来どおり SOAP 生成へ進める。
 */
export function isSubjectUnresolved(resolution: BrandResolution | undefined): boolean {
  return resolution?.denotation === 'module'
}
