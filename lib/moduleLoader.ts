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
 */

import type { ModuleData } from './types'
import type { SearchEntry } from './search'
import { buildSearchIndex } from './search'
import { ALL_MODULES } from '../data/modules/index'

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
   * Stage 3: 全モジュールから buildSearchIndex で構築（現行と同一）。
   * Stage 4: 2 層 manifest から構築へ差し替える（← 差し替え接続点）
   */
  getSearchIndex(): SearchEntry[]
}

/**
 * 全モジュール同梱・同期解決の loader を生成する。
 *
 * @param modules 登録済みモジュール配列。**この配列をそのまま保持し、複製しない**
 *                （getAllModules() が同一参照を返すことを保証するため）
 */
export function createBundledModuleLoader(modules: ModuleData[]): ModuleLoader {
  // moduleId -> ModuleData の索引を 1 度だけ構築する。
  // 現行の find より高速だが、返す値は find と同一のオブジェクトである。
  const byId = new Map<string, ModuleData>()
  for (const m of modules) {
    if (!byId.has(m.moduleId)) byId.set(m.moduleId, m)
  }

  // 検索インデックスは初回アクセス時に構築して保持する。
  // memoize は結果を変えない（同一入力から同一の SearchEntry[] を生成する）。
  let searchIndexCache: SearchEntry[] | null = null

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
        searchIndexCache = modules.flatMap(m => buildSearchIndex(m))
      }
      return searchIndexCache
    },
  }
}

/**
 * 既定の loader インスタンス。
 * data/modules/index.ts の ALL_MODULES を包む（同ファイルは無変更のまま）。
 */
export const moduleLoader: ModuleLoader = createBundledModuleLoader(ALL_MODULES)
