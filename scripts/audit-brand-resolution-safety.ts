/**
 * audit-brand-resolution-safety.ts
 *
 * BrandResolution（`lib/brandResolution.ts`）の domain contract が、canonical JSON の
 * 静的構造から安全に成立することを検証する（Q-S2）。
 *
 * 実行:
 *   npx tsx scripts/audit-brand-resolution-safety.ts
 *
 * 原則・経緯:
 *   - 型契約           : `lib/brandResolution.ts`
 *   - 論点・Owner Decision: `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2
 *   - 設計根拠・INV 定義 : `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md`（§10.1 / §13.8）
 *   - alias 複製境界     : `docs/DESIGN_PRINCIPLES.md` DP-18
 *   - 不確定性を推測で埋めない: 同 DP-15
 *
 * ── 責務境界（他の検証器と混同しない）────────────────────────
 *
 *   Q-S1 = module への到達性            → `scripts/audit-generic-name-reachability.ts`
 *   Q-S2 = brand resolution semantics / safety → **本スクリプト**
 *   Q-UX1 = ranking / presentation / limit     → 本スクリプトの責務外
 *   moduleValidator = canonical module の schema / content 整合 → `lib/moduleValidator.ts`
 *
 *   **cross-module ranking simulation は行わない。** denotation は module の静的構造
 *   （brand 件数・generic group 件数・displayGenericName・handlingTags）から決定論的に
 *   導出できるため、全検査は module-local static で完結する。
 *
 * ── 検査しないもの（意図的）──────────────────────────────
 *
 *   - `denotation: 'module'` ⇒ `brandKey === null && subject === null`
 *     → TypeScript の discriminated union がリテラル型で完全保証するため重複実装しない
 *   - `subject === null` から SOAP 主語を生成しないこと
 *     → U-5 gate の実装であり canonical JSON の静的性質ではない。
 *       `tests/brandResolutionGate.test.ts` / `tests/brandResolutionSubjectMigration.test.ts` が担当
 *   - **module-level alias が brand-level alias に存在しないこと**
 *     → DP-18 が定める意図的な非複製であり、これを FAIL にしてはならない（INV-5）
 *   - generic group 内 handlingTags の不均質そのもの
 *     → U-5 の交差集合設計により安全化済み。不均質は欠陥ではない
 *   - cross-module ranking / bucket 結合順 / limit / candidate 集合 → Q-UX1
 *
 * ── 既知の重複（意図的）──────────────────────────────────
 *
 *   `BRAND_CATALOG_BRANDNAMES_MISMATCH` は `lib/moduleValidator.ts` の
 *   `BRAND_CATALOG_MISMATCH` と同じ集合一致を検査する。重複させる理由は、
 *   moduleValidator の起動時実行が `app/page.tsx` で try/catch されており
 *   **エラーでも起動を止めない（fail-open）**ため、実質的な enforcement が存在しないことによる。
 *   本 audit は `npm run audit` の exit code へ反映させることで、新規 module 追加時に
 *   BrandResolution の前提が機械的に守られる状態を作る。
 */

import fs from 'fs'
import path from 'path'
import type { ModuleData } from '../lib/types'
import { listModuleIds, printAuditReport, type AuditIssue } from './auditShared'

const MODULES_DIR = path.resolve('./data/modules')

// ─────────────────────────────────────────────────────────────
// 静的導出ヘルパー（canonical JSON のみを入力とする。module-local）
// ─────────────────────────────────────────────────────────────

interface BrandEntryLike {
  displayName?: string
  genericName?: string
  displayGenericName?: string
  genericKey?: string
  handlingTags?: string[]
}

/**
 * generic grouping key を解決する。
 * `genericKey ?? displayGenericName ?? genericName`（`prompts/RULES.md` §21）。
 * `lib/search.ts` の `brandCatalogGenericKeyMap` と同一の意味論。
 */
function resolveGroupingKey(entry: BrandEntryLike): string | undefined {
  return entry.genericKey ?? entry.displayGenericName ?? entry.genericName
}

/** brandCatalog を grouping key ごとに束ねる。 */
function groupByGenericKey(
  brandCatalog: Record<string, BrandEntryLike>,
): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const [brand, entry] of Object.entries(brandCatalog)) {
    const key = resolveGroupingKey(entry)
    if (key === undefined) continue // 解決不能は GENERIC_GROUPING_KEY_UNRESOLVABLE 側で報告
    const list = groups.get(key)
    if (list) list.push(brand)
    else groups.set(key, [brand])
  }
  return groups
}

/**
 * runtime で ADDON / scenario の表示可否を決めている tag を、canonical JSON から
 * **機械的に**導出する。手書きの固定リストは持たない。
 *
 * 導出元（Repository 実測で確認した runtime gate の全数）:
 *   - `addons.items[].requiredTags`      → `lib/addonFilter.ts` の `getVisibleAddonKeys()`
 *   - `scenarios[].scenarioRequiredTags` → `DashboardClient.tsx` の availableGroups / groupScenarios
 *
 * `lib/search.ts` が適応ラベル導出に使う `heart_failure_supported` / `ckd_supported` は
 * **表示ラベルの分岐であって可視性の gate ではなく**、かつコード側の固定値であるため
 * 本導出には含めない（含めると手書きリストになる）。
 * `template.reservedHandlingTags` は validator 向けの「意図的に未到達」の宣言であり、
 * runtime gate ではないため含めない。
 */
function deriveGateTags(json: ModuleData): Set<string> {
  const tags = new Set<string>()
  const items = (json.addons?.items ?? {}) as Record<string, { requiredTags?: string[] }>
  for (const item of Object.values(items)) {
    for (const t of (item?.requiredTags ?? [])) tags.add(t)
  }
  for (const sc of (json.scenarios ?? [])) {
    for (const t of ((sc as { scenarioRequiredTags?: string[] }).scenarioRequiredTags ?? [])) tags.add(t)
  }
  return tags
}

/**
 * generic group を構成する全 brand の handlingTags の交差集合。
 * `lib/brandTags.ts` の `intersectHandlingTags()` と同一の意味論を、
 * canonical JSON 側から独立に再計算する（実装と audit を相互検証するため
 * 意図的に import せず再実装している）。
 */
function intersectTags(brands: string[], brandCatalog: Record<string, BrandEntryLike>): Set<string> {
  if (brands.length === 0) return new Set()
  const sets = brands.map(b => new Set(brandCatalog[b]?.handlingTags ?? []))
  const union = new Set<string>()
  for (const s of sets) for (const t of s) union.add(t)
  return new Set([...union].filter(t => sets.every(s => s.has(t))))
}

/** group 内の全 brand が持つ handlingTags の和集合。 */
function unionTags(brands: string[], brandCatalog: Record<string, BrandEntryLike>): Set<string> {
  const union = new Set<string>()
  for (const b of brands) for (const t of (brandCatalog[b]?.handlingTags ?? [])) union.add(t)
  return union
}

// ─────────────────────────────────────────────────────────────
// 監査本体
// ─────────────────────────────────────────────────────────────

const issues: AuditIssue[] = []
const moduleIds = listModuleIds()

for (const moduleId of moduleIds) {
  const json: ModuleData = JSON.parse(
    fs.readFileSync(path.join(MODULES_DIR, `${moduleId}.json`), 'utf-8'),
  )
  const drug = json.drug
  const brandCatalog = (drug?.brandCatalog ?? {}) as Record<string, BrandEntryLike>
  const brandNames = (drug?.brandNames ?? []) as string[]
  const catalogKeys = Object.keys(brandCatalog)

  // brandCatalog を持たない module は BrandResolution の brand/generic 判定対象外。
  // （後方互換。実測では全 35 module が brandCatalog を持つ）
  if (catalogKeys.length === 0) continue

  // ── INV-1 前提: brandCatalog キー集合 = brandNames 集合 ──────
  // 破れると resolution.brandKey ∈ drug.brandNames が成立しなくなり、
  // handlingTags / brandToTags の参照キーが壊れる。
  const missingInCatalog = brandNames.filter(b => !catalogKeys.includes(b))
  const missingInBrandNames = catalogKeys.filter(b => !brandNames.includes(b))
  if (missingInCatalog.length > 0 || missingInBrandNames.length > 0) {
    const parts: string[] = []
    if (missingInCatalog.length > 0) parts.push(`brandNames のみ: ${missingInCatalog.join(', ')}`)
    if (missingInBrandNames.length > 0) parts.push(`brandCatalog のみ: ${missingInBrandNames.join(', ')}`)
    issues.push({
      moduleId,
      target: '-',
      code: 'BRAND_CATALOG_BRANDNAMES_MISMATCH',
      detail: `drug.brandNames と drug.brandCatalog のキー集合が一致しません（${parts.join(' / ')}）。resolution.brandKey が drug.brandNames の要素であるという契約（INV-1）が成立しません`,
    })
  }

  // ── INV-4b: grouping key が全 brand で解決可能 ───────────────
  for (const [brand, entry] of Object.entries(brandCatalog)) {
    if (resolveGroupingKey(entry) === undefined) {
      issues.push({
        moduleId,
        target: brand,
        code: 'GENERIC_GROUPING_KEY_UNRESOLVABLE',
        detail: 'genericKey / displayGenericName / genericName がいずれも未定義のため generic grouping key を解決できません。generic group の形成そのものが成立しません（INV-4b）',
      })
    }
  }

  const groups = groupByGenericKey(brandCatalog)

  // ── INV-4a: generic group 内で displayGenericName が一意 ─────
  // 破れると generic の subject が brand の配列順に依存し、
  // 排除したはずの「意味論を持たない代表 brand 選択」が subject 側へ再導入される。
  for (const [key, brands] of groups) {
    const names = [...new Set(brands.map(b => brandCatalog[b]?.displayGenericName))]
    if (names.length > 1) {
      issues.push({
        moduleId,
        target: `group="${key}"`,
        code: 'GENERIC_SUBJECT_AMBIGUOUS',
        detail: `同一 generic group 内で displayGenericName が一致しません（${names.map(n => `"${String(n)}"`).join(' / ')}）。generic の subject が brand の宣言順に依存します（INV-4a）`,
      })
    }
  }

  // ── INV-6: single-brand module が未確定 module state を生まない ──
  // deriveUnresolvedResolution は brandNames.length === 1 のとき brand を返す。
  // brandCatalog が 1 件でも brandNames 側が食い違うと、その分岐へ入らず
  // denotation='module'（未確定）へ落ちうる。
  // generic 候補（generic header）が生成されること自体は正当であり FAIL ではない。
  if (catalogKeys.length === 1) {
    const onlyBrand = catalogKeys[0]
    const problems: string[] = []
    if (brandNames.length !== 1) {
      problems.push(`drug.brandNames の件数が ${brandNames.length} 件（1 件であるべき）`)
    } else if (brandNames[0] !== onlyBrand) {
      problems.push(`drug.brandNames[0]="${brandNames[0]}" が brandCatalog の唯一のキー "${onlyBrand}" と一致しない`)
    }
    if (groups.size !== 1) {
      problems.push(`generic group が ${groups.size} 件（grouping key を解決できない brand があります）`)
    }
    if (problems.length > 0) {
      issues.push({
        moduleId,
        target: onlyBrand,
        code: 'SINGLE_BRAND_RESOLUTION_UNSAFE',
        detail: `brand が 1 件の module ですが構造的に未確定状態（denotation='module'）を生みうります: ${problems.join(' / ')}（INV-6）`,
      })
    }
  }

  // ── INV-4c: 交差集合が現に gate へ使われている tag を落とす ────
  // CHECK。generic 選択時に利用できる ADDON / scenario が減るため人間レビューを要する。
  // 不均質そのものは欠陥ではない（交差集合により安全化済み）ため FAIL にしない。
  const gateTags = deriveGateTags(json)
  if (gateTags.size > 0) {
    for (const [key, brands] of groups) {
      if (brands.length < 2) continue
      const union = unionTags(brands, brandCatalog)
      const inter = intersectTags(brands, brandCatalog)
      const droppedGated = [...union].filter(t => !inter.has(t) && gateTags.has(t))
      if (droppedGated.length > 0) {
        const holders = droppedGated.map(t => {
          const has = brands.filter(b => (brandCatalog[b]?.handlingTags ?? []).includes(t))
          return `${t}（保有: ${has.join(', ')}）`
        })
        issues.push({
          moduleId,
          target: `group="${key}"`,
          code: 'GENERIC_GATE_TAG_DROPPED',
          detail: `generic 選択時、handlingTags の交差集合により gate 対象タグが脱落します: ${holders.join(' / ')}。当該 ADDON / scenario は generic 候補では表示されません（INV-4c・人間レビュー要）`,
        })
      }
    }
  }
}

function severity(code: string): 'FAIL' | 'CHECK' {
  // INV-4c のみ CHECK。generic handlingTags は交差集合により安全化済みであり、
  // gate 対象タグの脱落は「欠陥」ではなく「人間の判断が要る事象」として扱う。
  if (code === 'GENERIC_GATE_TAG_DROPPED') return 'CHECK'
  return 'FAIL'
}

const exitCode = printAuditReport('Brand resolution safety', moduleIds.length, issues, severity)
process.exit(exitCode)
