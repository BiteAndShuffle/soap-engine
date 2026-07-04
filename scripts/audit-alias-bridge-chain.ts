/**
 * audit-alias-bridge-chain.ts
 *
 * drug.brandCatalog[].aliases / normalizedAliases、drug.aliasToBrand、
 * drug.nameAliases、drug.search.nameAliases、drug.search.exactAliases が
 * bridge と JSON で一致しているかを検証する。
 *
 * addonsRef（RULES.md §20 / PN7 check Y）と同様に、alias 系フィールドも
 * bridge を正本として JSON と同期されているべきである（RULES.md §23
 * Alias Fields Synchronization Principle）。JSON 側だけの追加・削除は
 * 「同期漏れ」として検出する。
 *
 * 実行:
 *   npx tsx scripts/audit-alias-bridge-chain.ts
 *
 * 正式な監査ルールは prompts/vNext/PN7-Cross-Reference-Audit.md の check AA、
 * 原則は prompts/RULES.md §23 を参照。標準実行タイミングは
 * docs/IMPLEMENTATION_CHECKLIST.md を参照。
 *
 * 検出する不整合:
 *   A. brandCatalog[brand].aliases が bridge/JSON で不一致
 *   B. brandCatalog[brand].normalizedAliases が bridge/JSON で不一致
 *   C. aliasToBrand が bridge/JSON で不一致
 *   D. drug.nameAliases が bridge/JSON で不一致
 *   E. drug.search.nameAliases が bridge/JSON で不一致
 *   F. drug.search.exactAliases が bridge/JSON で不一致
 *   G. drug.nameAliases と drug.search.nameAliases が JSON 内で不一致
 *      （RULES.md §8: 両者は常に完全一致している必要がある）
 *
 * 終了コード: 不整合が1件でもあれば 1、なければ 0
 */

import fs from 'fs'
import path from 'path'
import type { ModuleData } from '../lib/types'
import { listModuleIds, printAuditReport, type AuditIssue } from './auditShared'

const MODULES_DIR = path.resolve('./data/modules')
const BRIDGES_DIR = path.resolve('./bridges')

// ─────────────────────────────────────────────────────────────
// bridge の YAML 的リスト・辞書ブロックをパースする
// ─────────────────────────────────────────────────────────────

/**
 * `key:\n  - "item"\n  - "item"\n` 形式のブロックから item 一覧を取り出す（インデント非依存）。
 * 空行・コメント行（`# ...`）が list item の間に挟まっていても継続してスキャンする
 * （bridge原稿では区切りコメントが入ることがあるため）。
 */
function extractListBlock(text: string, key: string): string[] | null {
  const keyRe = new RegExp(`(?:^|\\n)\\s*${key}:\\s*\\n`)
  const startMatch = text.match(keyRe)
  if (!startMatch || startMatch.index === undefined) return null
  const rest = text.slice(startMatch.index + startMatch[0].length)
  const items: string[] = []
  for (const line of rest.split('\n')) {
    const itemMatch = line.match(/^\s*- "([^"]*)"\s*$/)
    if (itemMatch) {
      items.push(itemMatch[1])
      continue
    }
    if (/^\s*(#.*)?$/.test(line)) continue // 空行・コメント行はスキップして継続
    break // list item でも空行/コメントでもない行が来たらブロック終端
  }
  return items
}

/** brandCatalog セクションから brand -> {aliases, normalizedAliases} を取り出す */
function extractBrandCatalog(text: string): Map<string, { aliases: string[]; normalizedAliases: string[] }> {
  const result = new Map<string, { aliases: string[]; normalizedAliases: string[] }>()
  const bcMatch = text.match(/\n {2}brandCatalog:\s*\n([\s\S]*?)(?:\n {2}aliasToBrand:|\n {2}\S)/)
  if (!bcMatch) return result
  const section = bcMatch[1]
  const blocks = section.split(/\n(?= {4}[^\s"][^\n:]*:\s*\n)/)
  for (const block of blocks) {
    const headerMatch = block.match(/^\s*([^\s"][^\n:]*):\s*\n/)
    if (!headerMatch) continue
    const brand = headerMatch[1]
    const aliases = extractListBlock(block, 'aliases') ?? []
    const normalizedAliases = extractListBlock(block, 'normalizedAliases') ?? []
    result.set(brand, { aliases, normalizedAliases })
  }
  return result
}

/** aliasToBrand セクションから { alias: brand } を取り出す */
function extractAliasToBrand(text: string): Record<string, string> {
  const m = text.match(/\n {2}aliasToBrand:\s*\n([\s\S]*?)(?:\ntemplate:|\n\S)/)
  if (!m) return {}
  const pairs = [...m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)]
  const out: Record<string, string> = {}
  for (const [, k, v] of pairs) out[k] = v
  return out
}

// ─────────────────────────────────────────────────────────────
// 監査本体
// ─────────────────────────────────────────────────────────────

function sortedEq(a: string[], b: string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
}

const issues: AuditIssue[] = []
const moduleIds = listModuleIds()

for (const moduleId of moduleIds) {
  const jsonPath = path.join(MODULES_DIR, `${moduleId}.json`)
  const bridgePath = path.join(BRIDGES_DIR, `${moduleId}.md`)

  if (!fs.existsSync(jsonPath) || !fs.existsSync(bridgePath)) continue

  const mod = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ModuleData
  const bridgeText = fs.readFileSync(bridgePath, 'utf-8')
  const drug = mod.drug as unknown as {
    nameAliases?: string[]
    aliasToBrand?: Record<string, string>
    brandCatalog?: Record<string, { aliases?: string[]; normalizedAliases?: string[] }>
    search?: { nameAliases?: string[]; exactAliases?: string[] }
  }
  if (!drug?.brandCatalog) continue // brandCatalog を持たないモジュールは対象外

  // A + B: brandCatalog[brand].aliases / normalizedAliases
  const bridgeCatalog = extractBrandCatalog(bridgeText)
  for (const [brand, jsonEntry] of Object.entries(drug.brandCatalog)) {
    const bridgeEntry = bridgeCatalog.get(brand)
    if (!bridgeEntry) {
      issues.push({ moduleId, target: brand, code: 'BRAND_NOT_FOUND_IN_BRIDGE', detail: `bridge に brandCatalog.${brand} が見つからない` })
      continue
    }
    if (!sortedEq(jsonEntry.aliases ?? [], bridgeEntry.aliases)) {
      issues.push({
        moduleId, target: brand, code: 'ALIASES_MISMATCH',
        detail: `bridge=${JSON.stringify(bridgeEntry.aliases)} json=${JSON.stringify(jsonEntry.aliases)}`,
      })
    }
    if (!sortedEq(jsonEntry.normalizedAliases ?? [], bridgeEntry.normalizedAliases)) {
      issues.push({
        moduleId, target: brand, code: 'NORMALIZED_ALIASES_MISMATCH',
        detail: `bridge=${JSON.stringify(bridgeEntry.normalizedAliases)} json=${JSON.stringify(jsonEntry.normalizedAliases)}`,
      })
    }
  }

  // C: aliasToBrand
  const bridgeAliasToBrand = extractAliasToBrand(bridgeText)
  const jsonAliasToBrand = drug.aliasToBrand ?? {}
  if (JSON.stringify(bridgeAliasToBrand) !== JSON.stringify(jsonAliasToBrand)) {
    const keys = new Set([...Object.keys(bridgeAliasToBrand), ...Object.keys(jsonAliasToBrand)])
    for (const k of keys) {
      if (bridgeAliasToBrand[k] !== jsonAliasToBrand[k]) {
        issues.push({
          moduleId, target: k, code: 'ALIAS_TO_BRAND_MISMATCH',
          detail: `bridge=${bridgeAliasToBrand[k] ?? '(なし)'} json=${jsonAliasToBrand[k] ?? '(なし)'}`,
        })
      }
    }
  }

  // D: drug.nameAliases（トップレベル、2スペースインデント）
  const bridgeNameAliases = extractListBlock(bridgeText, 'nameAliases')
  const jsonNameAliases = drug.nameAliases ?? []
  if (bridgeNameAliases && !sortedEq(bridgeNameAliases, jsonNameAliases)) {
    issues.push({
      moduleId, target: 'drug.nameAliases', code: 'NAME_ALIASES_MISMATCH',
      detail: `bridge件数=${bridgeNameAliases.length} json件数=${jsonNameAliases.length}`,
    })
  }

  // E: drug.search.nameAliases（search: ブロック内、4スペースインデント側）
  const searchSectionMatch = bridgeText.match(/\n {2}search:\s*\n([\s\S]*?)(?:\n {2}\S)/)
  const searchSection = searchSectionMatch ? searchSectionMatch[1] : ''
  const bridgeSearchNameAliases = extractListBlock(searchSection, 'nameAliases')
  const jsonSearchNameAliases = drug.search?.nameAliases ?? []
  if (bridgeSearchNameAliases && !sortedEq(bridgeSearchNameAliases, jsonSearchNameAliases)) {
    issues.push({
      moduleId, target: 'drug.search.nameAliases', code: 'SEARCH_NAME_ALIASES_MISMATCH',
      detail: `bridge件数=${bridgeSearchNameAliases.length} json件数=${jsonSearchNameAliases.length}`,
    })
  }

  // F: drug.search.exactAliases
  const bridgeExactAliases = extractListBlock(searchSection, 'exactAliases')
  const jsonExactAliases = drug.search?.exactAliases ?? []
  if (bridgeExactAliases && !sortedEq(bridgeExactAliases, jsonExactAliases)) {
    issues.push({
      moduleId, target: 'drug.search.exactAliases', code: 'EXACT_ALIASES_MISMATCH',
      detail: `bridge=${JSON.stringify(bridgeExactAliases)} json=${JSON.stringify(jsonExactAliases)}`,
    })
  }

  // G: JSON内部で drug.nameAliases と drug.search.nameAliases が完全一致しているか（RULES.md §8）
  if (!sortedEq(jsonNameAliases, jsonSearchNameAliases)) {
    issues.push({
      moduleId, target: 'nameAliases vs search.nameAliases', code: 'JSON_INTERNAL_NAME_ALIASES_MISMATCH',
      detail: 'JSON内で drug.nameAliases と drug.search.nameAliases が一致しない（RULES.md §8違反）',
    })
  }
}

// ─────────────────────────────────────────────────────────────
// レポート出力
// ─────────────────────────────────────────────────────────────

const exitCode = printAuditReport('Alias fields bridge⇔JSON synchronization', moduleIds.length, issues)
process.exit(exitCode)
