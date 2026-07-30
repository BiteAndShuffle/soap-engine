/**
 * searchManifest.ts
 *
 * 構造化 Search Manifest の型定義と、manifest → SearchEntry[] の構築関数。
 * 設計根拠: docs/reviews/f1/F1_STAGE4_PLAN_2026-07-30.md §3
 *
 * ── manifest の目的 ──────────────────────────────────────────────
 *
 * 現行の SearchEntry[] は 1,060 件・3,363 KB あり、その内訳は
 *   corpusTokens（SOAP 本文を含む）        31%
 *   モジュール単位フィールドの重複（30.3回） 48%
 *   シナリオ単位フィールド                    7%
 * である。manifest は 2 層構造（module / scenario）にすることで重複を排除し、
 * SOAP 本文を持たない構造化データのみで SearchEntry[] を再構築できるようにする。
 *
 * ── SOAP 本文非混入の原則（F-1 のアーキテクチャ境界）────────────
 *
 * manifest には scenario の S / O / A / P および xStructured / addonsRef /
 * mergePolicy を**一切含めない**。tests/searchBodyExclusion.test.ts が
 * 独立したテストとしてこれを保証する。
 *
 * ── 分類メタデータ 4 項目について（D-S4-8）──────────────────────
 *
 * ManifestScenario の scenarioTags / sideEffectPresence / intentTags /
 * sCompositionIntent は、SearchEntry.groupLabel を決定論的に再構築するためだけに
 * 保持する分類メタデータである。**検索 UI 以外の用途には使用しない。**
 * いずれも SOAP 本文ではなく、lib/menuGroups.ts の getMenuGroupFromScenario が
 * 参照する分類用の構造化フィールドである。
 */

import { createHash } from 'crypto'

import type { ModuleData, Scenario } from './types'
import type { SearchEntry } from './search'
import { buildSearchIndex } from './search'

/** manifest 生成器のバージョン。schema を変更したら上げる */
export const SEARCH_MANIFEST_VERSION = '1'

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

/** brandCatalog から検索に必要な 5 フィールドのみを抽出したもの */
export interface ManifestBrandEntry {
  /**
   * 正規表記のブランド名。**存在する場合のみ設定する**（D-S4-3）。
   * generator による補完・創作は禁止。欠落している brand は
   * brandCatalog のキー自体が検索対象の実体となる。
   */
  displayName?: string
  /** 表示用一般名（後発品名 / 一般名の SSOT） */
  displayGenericName?: string
  /** 同一成分グルーピング用キー。未設定時は displayGenericName へフォールバック */
  genericKey?: string
  /** 読み仮名・表記揺れ */
  aliases: string[]
  /** 適応横断ラベル（DP-11） */
  indicationLabel?: string
  /**
   * 製品取り扱いタグ（D-S4-11）。
   *
   * lib/search.ts L219-229 が SearchEntry.brandCatalogIndicationLabelMap を導出する際に
   * 参照するため、SearchEntry を決定論的に再現するには保持が必要である。
   *
   * 保持条件:
   *   - canonical の値をそのまま保持する（推測・補完・名称変換を行わない）
   *   - 現在参照されている 2 値（heart_failure_supported / ckd_supported）へ縮約せず
   *     配列全体を保持する
   *   - 配列の原順序を維持する
   *   - **SearchEntry 再構築専用**とし、SOAP 生成やブランド制御の新たな入力には使用しない
   *   - SOAP 本文ではないため T-6（本文非混入）に抵触しない
   */
  handlingTags?: string[]
}

/** モジュール単位ブロック（重複排除の対象） */
export interface ManifestModule {
  moduleId: string
  /** 薬効領域 + 剤形（末端要素） */
  categoryPath: string[]
  /** 薬効分類（構造化キー） */
  classKey?: string
  /** 剤形（{classKey}_{route}） */
  nodeKey?: string
  /** 薬効領域（構造化キー） */
  clinicalDomain?: string
  displayTitle?: string
  displaySubtitle?: string
  /** 先発品名 */
  brandNames: string[]
  nameAliases: string[]
  drugClass: string[]
  drugSpecificTags: string[]
  /** dosage variant。canonical に構造化値が存在する場合のみ収録（D-S4-4） */
  reservedHandlingTags?: string[]
  search: {
    /** 一般名 */
    primaryDisplayName?: string
    /** 読み仮名（完全一致） */
    exactAliases: string[]
    nameAliases: string[]
    keywords: string[]
    /** 剤形トークン */
    formulationSearchTokens: string[]
    priority: number
    matchPolicy: Record<string, unknown>
  }
  brandCatalog: Record<string, ManifestBrandEntry>
}

/** シナリオ単位ブロック */
export interface ManifestScenario {
  /** 結合キー */
  moduleId: string
  /** SearchEntry.templateId */
  globalId: string
  /** Express 候補の解決 / groupLabel 導出 */
  id: string
  /** label / shortLabel・検索対象 */
  title: string
  /** groupLabel 導出・検索対象 */
  scenarioGroup: string

  // ── 分類メタデータ（D-S4-8）─────────────────────────────
  // SearchEntry.groupLabel を決定論的に再構築するためだけに保持する。
  // 検索 UI 以外の用途には使用しない。SOAP 本文ではない。
  scenarioTags: string[]
  sideEffectPresence: string
  intentTags: string[]
  /** sComposition.intent のみ。sComposition 全体は保持しない */
  sCompositionIntent?: string
}

/** `sourceHash` を除いた manifest 本体（ハッシュ計算の対象） */
export interface SearchManifestBody {
  /** 生成器バージョン（互換性判定用） */
  manifestVersion: string
  /** 整合検証用 */
  moduleCount: number
  /** 整合検証用 */
  scenarioCount: number
  /**
   * モジュール単位ブロック。
   * **ALL_MODULES の登録順を保持する**（D-S4-10。moduleId で並べ替えない）。
   * 検索結果の順序も manifest の意味の一部であり、buildIndexFromManifest() が返す
   * SearchEntry[] の並びが buildSearchIndex() を ALL_MODULES へ適用した結果と
   * 一致することが T-3 の deepEqual の前提となる。
   */
  modules: ManifestModule[]
  /** シナリオ単位ブロック。各モジュール内の出現順を保持する */
  scenarios: ManifestScenario[]
}

export interface SearchManifest extends SearchManifestBody {
  /**
   * 生成元 canonical 構造化データの内容ハッシュ（D-S4-9 / D-S4-10）。
   *
   * SHA-256 / 小文字 hex / UTF-8。Git HEAD・生成日時・絶対パス・環境依存値を含めない。
   * ハッシュ対象は **manifest 本体（本フィールド自身を除く SearchManifestBody 全体）** の
   * 決定論的直列化であり、module 配列の順序も対象に含める。
   * ハッシュ対象が manifest そのものであるため、「manifest が変化した時だけ
   * sourceHash も変化する」という性質が定義上保証される。
   */
  sourceHash: string
}

// ─────────────────────────────────────────────────────────────
// canonical JSON → manifest（純関数）
// ─────────────────────────────────────────────────────────────

/**
 * 1 モジュール分の ManifestModule を生成する。
 * フィールドの allowlist のみを抽出し、順序はこの関数の記述順で固定する
 * （JSON.stringify の出力を決定論的にするため）。
 */
export function toManifestModule(m: ModuleData): ManifestModule {
  const drug = m.drug as Record<string, any> | undefined
  const ds = drug?.search as Record<string, any> | undefined
  const comp = m.composition as Record<string, any> | undefined
  const template = m.template as Record<string, any> | undefined

  const brandCatalog: Record<string, ManifestBrandEntry> = {}
  for (const [brand, raw] of Object.entries((drug?.brandCatalog ?? {}) as Record<string, any>)) {
    const entry: ManifestBrandEntry = { aliases: raw.aliases ?? [] }
    // displayName は存在する場合のみ設定する（D-S4-3。補完・創作は禁止）
    if (raw.displayName !== undefined) entry.displayName = raw.displayName
    if (raw.displayGenericName !== undefined) entry.displayGenericName = raw.displayGenericName
    if (raw.genericKey !== undefined) entry.genericKey = raw.genericKey
    if (raw.indicationLabel !== undefined) entry.indicationLabel = raw.indicationLabel
    // handlingTags は配列全体を原順序のまま保持する（D-S4-11。縮約・並べ替えを行わない）
    if (raw.handlingTags !== undefined) entry.handlingTags = raw.handlingTags
    brandCatalog[brand] = entry
  }

  const out: ManifestModule = {
    moduleId: m.moduleId,
    categoryPath: m.categoryPath ?? [],
    brandNames: drug?.brandNames ?? [],
    nameAliases: drug?.nameAliases ?? [],
    drugClass: drug?.drugClass ?? [],
    drugSpecificTags: drug?.drugSpecificTags ?? [],
    search: {
      exactAliases: ds?.exactAliases ?? [],
      nameAliases: ds?.nameAliases ?? [],
      keywords: ds?.keywords ?? [],
      formulationSearchTokens: ds?.formulationSearchTokens ?? [],
      priority: ds?.priority ?? 0,
      matchPolicy: ds?.matchPolicy ?? {},
    },
    brandCatalog,
  }

  // optional フィールドは値が存在する場合のみ設定する（undefined を出力しない）
  if (comp?.classKey !== undefined) out.classKey = comp.classKey
  if (comp?.nodeKey !== undefined) out.nodeKey = comp.nodeKey
  if (comp?.clinicalDomain !== undefined) out.clinicalDomain = comp.clinicalDomain
  if (m.display?.title !== undefined) out.displayTitle = m.display.title
  if (m.display?.subtitle !== undefined) out.displaySubtitle = m.display.subtitle
  // dosage variant: canonical に構造化値が存在する場合のみ（D-S4-4）
  if (Array.isArray(template?.reservedHandlingTags)) {
    out.reservedHandlingTags = template.reservedHandlingTags
  }
  if (ds?.primaryDisplayName !== undefined) out.search.primaryDisplayName = ds.primaryDisplayName

  return out
}

/**
 * 1 シナリオ分の ManifestScenario を生成する。
 * S / O / A / P および xStructured / addonsRef / mergePolicy は含めない。
 */
export function toManifestScenario(moduleId: string, s: Scenario): ManifestScenario {
  const sc = s as unknown as Record<string, any>
  const out: ManifestScenario = {
    moduleId,
    globalId: sc.globalId,
    id: sc.id,
    title: sc.title,
    scenarioGroup: sc.scenarioGroup,
    scenarioTags: sc.scenarioTags ?? [],
    sideEffectPresence: sc.sideEffectPresence ?? '',
    intentTags: sc.intentTags ?? [],
  }
  // sComposition 全体は保持せず intent のみ（D-S4-8）
  if (sc.sComposition?.intent !== undefined) out.sCompositionIntent = sc.sComposition.intent
  return out
}

/**
 * canonical JSON 全件から manifest 本体（sourceHash を除く）を構築する（純関数）。
 *
 * 決定論性:
 *   - modules の順序は入力配列の順序（= ALL_MODULES の登録順）を保持する（D-S4-10）
 *   - scenarios の順序は各モジュール内の出現順を保持する
 *   - object のキー順は toManifestModule / toManifestScenario の記述順で固定
 *   - undefined のフィールドは出力しない（環境依存表現を含めない）
 *   → 同一入力から常にバイト単位で同一の出力が得られる
 */
export function buildManifestBody(modules: readonly ModuleData[]): SearchManifestBody {
  const manifestModules = modules.map(toManifestModule)
  const manifestScenarios = modules.flatMap(m =>
    m.scenarios.map(s => toManifestScenario(m.moduleId, s)),
  )

  return {
    manifestVersion: SEARCH_MANIFEST_VERSION,
    moduleCount: manifestModules.length,
    scenarioCount: manifestScenarios.length,
    modules: manifestModules,
    scenarios: manifestScenarios,
  }
}

/**
 * manifest 本体の内容ハッシュを計算する（D-S4-9 / D-S4-10）。
 *
 * SHA-256 / 小文字 hex / UTF-8。
 * ハッシュ対象は **sourceHash 自身を除く manifest 本体全体**であり、
 * module 配列の順序も対象に含める。
 * Git HEAD・生成日時・絶対パス・環境依存値は一切含まない。
 */
export function computeSourceHash(body: SearchManifestBody): string {
  return createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex')
}

/**
 * canonical JSON 全件から SearchManifest を生成する（純関数）。
 *
 * `sourceHash` は同一の本体から導出されるため、
 * 「manifest が変化した時だけ sourceHash も変化する」が定義上保証される。
 *
 * @param modules canonical JSON（ALL_MODULES）
 */
export function generateSearchManifest(modules: readonly ModuleData[]): SearchManifest {
  const body = buildManifestBody(modules)
  return {
    manifestVersion: body.manifestVersion,
    sourceHash: computeSourceHash(body),
    moduleCount: body.moduleCount,
    scenarioCount: body.scenarioCount,
    modules: body.modules,
    scenarios: body.scenarios,
  }
}

/** manifest を決定論的に直列化する（生成物の書き出しと stale 検出で共用） */
export function serializeSearchManifest(manifest: SearchManifest): string {
  return JSON.stringify(manifest, null, 2) + '\n'
}

// ─────────────────────────────────────────────────────────────
// manifest → SearchEntry[]
// ─────────────────────────────────────────────────────────────

/**
 * manifest から SearchEntry[] を再構築する。
 *
 * **正規化・トークン分割ロジックは lib/search.ts の buildSearchIndex を再利用する。**
 * manifest の 2 層構造を ModuleData 形状へ復元してから buildSearchIndex へ渡すことで、
 * normalizeText / SEPARATOR_PATTERN / トークン分割順序を二重実装しない。
 * これにより「manifest 経由」と「canonical JSON 経由」で同一の SearchEntry[] が得られる。
 */
export function buildIndexFromManifest(manifest: SearchManifest): SearchEntry[] {
  const scenariosByModule = new Map<string, ManifestScenario[]>()
  for (const s of manifest.scenarios) {
    const list = scenariosByModule.get(s.moduleId)
    if (list) list.push(s)
    else scenariosByModule.set(s.moduleId, [s])
  }

  return manifest.modules.flatMap(mm => {
    const scenarios = scenariosByModule.get(mm.moduleId) ?? []
    return buildSearchIndex(toModuleShape(mm, scenarios))
  })
}

/**
 * ManifestModule + ManifestScenario[] を buildSearchIndex が要求する ModuleData 形状へ復元する。
 *
 * buildSearchIndex が参照するフィールドのみを埋める（実測に基づく）:
 *   moduleId / categoryPath / display.title / display.subtitle
 *   drug.brandNames / nameAliases / drugClass / drugSpecificTags / brandCatalog
 *   drug.search.*
 *   scenarios[].globalId / title / scenarioGroup / id
 *   scenarios[].scenarioTags / sideEffectPresence / intentTags / sComposition.intent
 *
 * **S / O / A / P は復元しない**（manifest に存在しないため、本文由来トークンは生成されない）。
 */
function toModuleShape(mm: ManifestModule, scenarios: ManifestScenario[]): ModuleData {
  return {
    moduleId: mm.moduleId,
    categoryPath: mm.categoryPath,
    display: { title: mm.displayTitle, subtitle: mm.displaySubtitle },
    drug: {
      brandNames: mm.brandNames,
      nameAliases: mm.nameAliases,
      drugClass: mm.drugClass,
      drugSpecificTags: mm.drugSpecificTags,
      brandCatalog: mm.brandCatalog,
      search: mm.search,
    },
    scenarios: scenarios.map(s => ({
      globalId: s.globalId,
      id: s.id,
      title: s.title,
      scenarioGroup: s.scenarioGroup,
      scenarioTags: s.scenarioTags,
      sideEffectPresence: s.sideEffectPresence,
      intentTags: s.intentTags,
      ...(s.sCompositionIntent !== undefined
        ? { sComposition: { intent: s.sCompositionIntent } }
        : {}),
    })),
  } as unknown as ModuleData
}
