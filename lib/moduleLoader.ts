/**
 * moduleLoader.ts
 *
 * モジュールデータの「取得方法」を抽象化する loader。
 * 設計根拠: docs/reviews/f1/F1_STAGE123_DESIGN_2026-07-30.md §3
 *
 * ── registry と loader の責務の違い（混同禁止）────────────────────
 *
 *   registry （data/modules/index.ts / F-6）: どのモジュールが登録されているか
 *   loader   （本ファイル / F-1）            : モジュールデータをどう取得するか
 *
 * 本ファイルは registry（ALL_MODULES）を入力として受け取り、取得方法を抽象化する。
 * ALL_MODULES の export は維持されており、本 loader はその上に加算された層である。
 *
 * ── Stage 3 の設計方針: 同期のみ・加算的導入 ──────────────────────
 *
 * Stage 3 の目的は「接続点を作ること」であり、挙動を変えることではない。したがって:
 *
 *   - 同期メソッドのみを定義する（Promise を導入しない）
 *   - getAllModules() は ALL_MODULES と同一のオブジェクト参照を返す（複製しない）
 *   - 順序を変えない
 *   - 検索インデックスは現行と同一の内容を返す
 *
 * 非同期化（SaaS 向けの遅延取得）は Stage 4 で本 interface へ**加算的に**追加する。
 * 既存メソッドのシグネチャは変更しない。
 *
 * ── getAllModules() が readonly でない理由（D-S3-4）──────────────
 *
 * lib/crossModuleValidator.ts の assertCrossModuleValid / validateCrossModule は
 * 引数に ModuleData[]（mutable）を要求する。戻り値を readonly ModuleData[] にすると
 * 呼び出し側で型エラーになるため、Stage 3 では既存 API の互換性を優先し ModuleData[] とする。
 * readonly を含む不変性の設計は Stage 4（SaaS loader 導入時）に改めて行う。
 *
 * ── Stage 4 Commit ⑤: getSearchIndex() の manifest 由来化 ────────
 *
 * getSearchIndex() の入力を canonical JSON 全件から
 * **commit 済みの data/search-manifest.json** へ切り替えた。
 * 差し替えたのは「検索インデックスの入力データ」のみであり、
 * ModuleLoader interface・他の 3 メソッド・同期性・memoize はすべて不変である。
 *
 * manifest を静的 import する理由（Owner Decision D-1 / 2026-07-31）:
 *
 *   - commit 済み manifest を実際の loader 入力として使用する
 *   - ModuleLoader の同期 interface を維持する（Promise を導入しない）
 *   - Static / Offline runtime との互換性を維持する
 *     （fs.readFileSync は browser / output:'export' で成立しない）
 *   - Git・fs・生成時刻・実行環境へ依存しない
 *
 * **production 検索経路へは接続していない。** app/components/DashboardClient.tsx は
 * 従来どおり allModules から自前で index を構築する（D-S4-1 (a)）。
 * したがって本変更による production の検索挙動の変化はない。
 */

import type { ModuleData } from './types'
import type { SearchEntry } from './search'
import { buildSearchIndex } from './search'
import type { SearchManifest } from './searchManifest'
import { buildIndexFromManifest } from './searchManifest'
import { ALL_MODULES } from '../data/modules/index'
import searchManifestJson from '../data/search-manifest.json'

/**
 * commit 済みの構造化 Search Manifest。
 *
 * `data/search-manifest.json` は scripts/generate-search-manifest.ts の出力であり
 * **手編集してはならない**（tests/searchManifestParity.test.ts の T-3 が stale を検出する）。
 *
 * JSON import の推論型は canonical な SearchManifest 型より狭く（リテラル型・
 * matchPolicy のキーが実データに固定される）なるため、構造検査を経由せず
 * SearchManifest として扱う。この cast の妥当性は T-3（manifest 等価）と
 * T-7（件数・ID 整合）が機械的に担保する。
 */
export const SEARCH_MANIFEST = searchManifestJson as unknown as SearchManifest

/**
 * モジュールデータへのアクセスを抽象化する loader。
 *
 * Stage 3 の実装（createBundledModuleLoader）は全モジュールを同梱前提で同期解決する。
 * Static / Offline 配布ではこれが正式な実装となる（全同梱は要件そのもの）。
 */
export interface ModuleLoader {
  /** 登録済み moduleId の一覧（登録順） */
  listModuleIds(): readonly string[]

  /** moduleId から 1 件取得。未登録は undefined */
  getModule(moduleId: string): ModuleData | undefined

  /**
   * 全モジュールを取得（登録順）。
   * Stage 3 では ALL_MODULES と同一の参照・同一の順序を返す。
   * Stage 4 以降、SaaS 実装ではこのメソッドを提供しない可能性があるため、
   * 新規コードは可能な限り getModule / listModuleIds を使う。
   */
  getAllModules(): ModuleData[]

  /**
   * 検索インデックスを取得。
   * Stage 3: 全モジュールから buildSearchIndex で構築。
   * Stage 4（現行）: 2 層 manifest から構築する（← 差し替え済みの接続点）。
   *
   * 返す SearchEntry[] は canonical JSON 由来のものと全 21 フィールドで一致する
   * （tests/searchManifestParity.test.ts T-1 / T-3 が担保）。
   */
  getSearchIndex(): SearchEntry[]
}

/**
 * 全モジュール同梱・同期解決の loader を生成する。
 *
 * @param modules 登録済みモジュール配列。**この配列をそのまま保持し、複製しない**
 *                （getAllModules() が同一参照を返すことを保証するため）
 * @param manifest 構造化 Search Manifest。指定時は getSearchIndex() がこの manifest から
 *                 SearchEntry[] を構築する。**省略時は modules から直接構築する**
 *                 （部分集合 loader が自身の modules と整合した index を返せるようにするため。
 *                 引数の追加は加算的であり、既存の 1 引数呼び出しの挙動を変えない）
 */
export function createBundledModuleLoader(
  modules: ModuleData[],
  manifest?: SearchManifest,
): ModuleLoader {
  // moduleId -> ModuleData の索引を 1 度だけ構築する。
  // 現行の find より高速だが、返す値は find と同一のオブジェクトである。
  const byId = new Map<string, ModuleData>()
  for (const m of modules) {
    if (!byId.has(m.moduleId)) byId.set(m.moduleId, m)
  }

  // 検索インデックスは初回アクセス時に構築して保持する。
  // memoize は結果を変えない（同一入力から同一の SearchEntry[] を生成する）。
  let searchIndexCache: SearchEntry[] | null = null

  // manifest 由来と canonical 由来のどちらで構築するかを 1 度だけ決める。
  // 正規化・トークン分割・スコア関数は両経路とも lib/search.ts の buildSearchIndex を
  // 再利用するため、生成される SearchEntry[] は同一である。
  const buildIndex = (): SearchEntry[] =>
    manifest !== undefined
      ? buildIndexFromManifest(manifest)
      : modules.flatMap(m => buildSearchIndex(m))

  return {
    listModuleIds(): readonly string[] {
      return modules.map(m => m.moduleId)
    },

    getModule(moduleId: string): ModuleData | undefined {
      return byId.get(moduleId)
    },

    getAllModules(): ModuleData[] {
      // 複製せず同一参照を返す（M-2: 参照同一性の維持）
      return modules
    },

    getSearchIndex(): SearchEntry[] {
      if (searchIndexCache === null) {
        searchIndexCache = buildIndex()
      }
      return searchIndexCache
    },
  }
}

/**
 * 既定の loader インスタンス。
 * data/modules/index.ts の ALL_MODULES を包む（同ファイルは無変更のまま）。
 *
 * Stage 4 Commit ⑤ 以降、検索インデックスは commit 済み manifest 由来で構築される。
 * モジュールデータ本体（getModule / getAllModules / listModuleIds）は
 * 従来どおり ALL_MODULES から同期解決する（全同梱は Static / Offline の要件そのもの）。
 */
export const moduleLoader: ModuleLoader = createBundledModuleLoader(ALL_MODULES, SEARCH_MANIFEST)
