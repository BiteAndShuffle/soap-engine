/**
 * audit-addon-bridge-chain.ts
 *
 * bridge → JSON → getVisibleAddonKeys（AddonPanel の表示ロジック）まで
 * 一貫して ADDON が表示されることを検証する。
 *
 * 従来の bridge⇔JSON diff監査（addonsRef の値一致）だけでは、
 * 「JSON は bridge と一致しているが、runtime のフィルタ条件で
 * AddonPanel から除外されてしまう」というケースを検出できない。
 * このスクリプトは実際に lib/addonFilter.ts の getVisibleAddonKeys()
 * を呼び出し、bridge P_ADDON の宣言がそのまま UI 表示に届くかを確認する。
 *
 * 実行:
 *   npx tsx scripts/audit-addon-bridge-chain.ts
 *
 * 正式な監査ルールは prompts/vNext/PN7-Cross-Reference-Audit.md の check Y、
 * 原則は prompts/RULES.md §20 を参照。標準実行タイミングは
 * docs/IMPLEMENTATION_CHECKLIST.md を参照。
 *
 * 検出する不整合:
 *   A. bridge に P_ADDON があるのに JSON の scenario.addonsRef が
 *      存在しない、または内容が一致しない
 *   B. JSON の scenario.addonsRef が存在するのに bridge に
 *      P_ADDON の記載がない（bridge外追加）
 *   C. addonsRef.P が参照する key が addons.items に存在しない
 *      （参照切れ・AddonPanel からは無音で除外される）
 *   D. bridge/JSON が一致していても、getVisibleAddonKeys() の
 *      戻り値が空、または bridge の宣言件数と一致しない
 *      （brandHandlingTags 起因の除外を含む — 全ブランドで確認）
 *
 * 終了コード: 不整合が1件でもあれば 1、なければ 0
 */

import fs from 'fs'
import path from 'path'
import { getVisibleAddonKeys } from '../lib/addonFilter'
import type { ModuleData, Scenario } from '../lib/types'

const MODULES_DIR = path.resolve('./data/modules')
const BRIDGES_DIR = path.resolve('./bridges')

// ─────────────────────────────────────────────────────────────
// index.ts からモジュール一覧を抽出（自動選定・ハードコード禁止）
// ─────────────────────────────────────────────────────────────

function listModuleIds(): string[] {
  const indexSrc = fs.readFileSync(path.join(MODULES_DIR, 'index.ts'), 'utf-8')
  const matches = [...indexSrc.matchAll(/from '\.\/([a-zA-Z0-9_]+)\.json'/g)]
  return matches.map(m => m[1])
}

// ─────────────────────────────────────────────────────────────
// bridge から scenario id ごとの P_ADDON 一覧を抽出
// ─────────────────────────────────────────────────────────────

function parseBridgeAddonRefs(bridgeText: string): Map<string, string[]> {
  const lines = bridgeText.split('\n')
  const result = new Map<string, string[]>()
  let curId: string | null = null
  let inPAddon = false
  let addons: string[] = []

  const flush = () => {
    if (curId) result.set(curId, addons)
  }

  for (const line of lines) {
    const scenarioMatch = line.match(/【SCENARIO｜.*?id=([a-zA-Z0-9_]+)｜/)
    const addonMatch = line.match(/【ADDON｜.*?id=([a-zA-Z0-9_]+)｜/)

    if (scenarioMatch) {
      flush()
      curId = scenarioMatch[1]
      addons = []
      inPAddon = false
      continue
    }
    if (addonMatch) {
      flush()
      curId = null
      inPAddon = false
      continue
    }
    if (curId) {
      const trimmed = line.trim()
      if (trimmed === 'P_ADDON') {
        inPAddon = true
        continue
      }
      if (/^[A-Z_]+$/.test(trimmed) && trimmed !== 'P_ADDON') {
        inPAddon = false
      }
      if (inPAddon) {
        const m = trimmed.match(/^- ?(addon_[a-zA-Z0-9_]+)/)
        if (m) addons.push(m[1])
      }
    }
  }
  flush()
  return result
}

// ─────────────────────────────────────────────────────────────
// 監査本体
// ─────────────────────────────────────────────────────────────

interface Issue {
  moduleId: string
  scenarioId: string
  code: string
  detail: string
}

const issues: Issue[] = []
const moduleIds = listModuleIds()

for (const moduleId of moduleIds) {
  const jsonPath = path.join(MODULES_DIR, `${moduleId}.json`)
  const bridgePath = path.join(BRIDGES_DIR, `${moduleId}.md`)

  if (!fs.existsSync(jsonPath)) {
    issues.push({ moduleId, scenarioId: '-', code: 'JSON_NOT_FOUND', detail: jsonPath })
    continue
  }
  if (!fs.existsSync(bridgePath)) {
    // bridge 非管理モジュール（bridge 工程を経ていない）は監査対象外としてスキップ
    continue
  }

  const mod = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ModuleData
  const bridgeText = fs.readFileSync(bridgePath, 'utf-8')
  const bridgeRefs = parseBridgeAddonRefs(bridgeText)

  for (const scenario of mod.scenarios) {
    const bridgeAddons = bridgeRefs.get(scenario.id) ?? []
    const jsonAddons = scenario.addonsRef?.P ?? []

    const bridgeSorted = [...bridgeAddons].sort()
    const jsonSorted = [...jsonAddons].sort()

    // A + B: bridge ⇔ JSON 値一致監査
    if (JSON.stringify(bridgeSorted) !== JSON.stringify(jsonSorted)) {
      issues.push({
        moduleId,
        scenarioId: scenario.id,
        code: 'BRIDGE_JSON_ADDONSREF_MISMATCH',
        detail: `bridge=${JSON.stringify(bridgeAddons)} json=${JSON.stringify(jsonAddons)}`,
      })
    }

    // C: addons.items 参照切れ
    for (const key of jsonAddons) {
      if (!(key in (mod.addons?.items ?? {}))) {
        issues.push({
          moduleId,
          scenarioId: scenario.id,
          code: 'ADDON_ITEM_NOT_FOUND',
          detail: `key=${key} not in addons.items`,
        })
      }
    }

    // D: bridge に P_ADDON がある場合、実際に getVisibleAddonKeys() で
    //    表示されるか確認する（brandHandlingTags なし = フィルタ未適用の基本ケース）
    if (bridgeAddons.length > 0) {
      const visible = getVisibleAddonKeys(mod.addons, scenario as Scenario, undefined)
      const visibleSorted = [...visible].sort()
      if (JSON.stringify(visibleSorted) !== JSON.stringify(bridgeSorted)) {
        issues.push({
          moduleId,
          scenarioId: scenario.id,
          code: 'ADDON_NOT_VISIBLE_IN_PANEL',
          detail: `bridge宣言=${JSON.stringify(bridgeAddons)} だが getVisibleAddonKeys=${JSON.stringify(visible)}（AddonPanel に届かない）`,
        })
      }

      // 全ブランドの handlingTags で見た場合にゼロ件になっていないか確認
      // （requiredTags 条件で全ブランドから除外されている addon の検出）
      const brandCatalog = mod.drug?.brandCatalog
      if (brandCatalog) {
        for (const [brandName, brand] of Object.entries(brandCatalog)) {
          const withBrand = getVisibleAddonKeys(mod.addons, scenario as Scenario, brand.handlingTags ?? [])
          if (withBrand.length === 0 && bridgeAddons.length > 0) {
            issues.push({
              moduleId,
              scenarioId: scenario.id,
              code: 'ADDON_HIDDEN_FOR_BRAND',
              detail: `brand=${brandName}: handlingTags=${JSON.stringify(brand.handlingTags ?? [])} により全 addon が非表示（bridge宣言=${JSON.stringify(bridgeAddons)}）`,
            })
          }
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// レポート出力
// ─────────────────────────────────────────────────────────────

console.log(`\n監査対象モジュール: ${moduleIds.length}件\n`)

if (issues.length === 0) {
  console.log('\x1b[32m\x1b[1m✅ ADDON bridge→JSON→UI chain: 全モジュール PASS\x1b[0m\n')
  process.exit(0)
}

const byCode = new Map<string, Issue[]>()
for (const issue of issues) {
  if (!byCode.has(issue.code)) byCode.set(issue.code, [])
  byCode.get(issue.code)!.push(issue)
}

for (const [code, list] of byCode) {
  console.log(`\x1b[31m\x1b[1m❌ ${code} (${list.length}件)\x1b[0m`)
  for (const issue of list) {
    console.log(`   ${issue.moduleId} / ${issue.scenarioId}: ${issue.detail}`)
  }
  console.log('')
}

console.log(`\x1b[31m\x1b[1m合計 ${issues.length} 件の不整合\x1b[0m\n`)
process.exit(1)
