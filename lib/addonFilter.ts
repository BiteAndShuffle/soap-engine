/**
 * addonFilter.ts
 *
 * シナリオに応じて表示するアドオンキーを決定する純関数。
 * SSOT: selectedScenario の scenarioType / scenarioGroup を参照する。
 *
 * ルール（仕様通り）:
 *   sickday   group    → sickday  アドオンを表示
 *   oral      group    → oral     アドオンを表示
 *   lifestyle type     → counseling アドオンを表示
 *   その他           → counseling / oral / sickday は非表示
 *   sideEffects は常に非表示（addonsRef で個別付与する場合のみ表示）
 *
 * 優先順位（高→低）:
 *   1. scenario.addonsRef が存在する → addonsRef をそのまま返す（シナリオ個別指定優先）
 *   2. scenarioType / scenarioGroup のルールで自動選択
 */

import type { Scenario, AddonsData } from './types'

// ─────────────────────────────────────────────────────────────
// グループ → 表示条件マップ
//   key: addons.items 内の group 名
//   predicate: scenario を受け取り「このグループを表示すべきか」を返す関数
// ─────────────────────────────────────────────────────────────

type GroupPredicate = (sc: Scenario) => boolean

const GROUP_RULES: Array<{ group: string; match: GroupPredicate }> = [
  {
    // sickday アドオン: scenarioType === "sickday" のシナリオのみ
    group: 'sickday',
    match: sc => sc.scenarioType === 'sickday',
  },
  {
    // oral アドオン: scenarioGroup === "start_or_change" のシナリオのみ
    group: 'oral',
    match: sc => sc.scenarioGroup === 'start_or_change',
  },
  {
    // counseling アドオン: scenarioType === "lifestyle" のシナリオのみ
    group: 'counseling',
    match: sc => sc.scenarioType === 'lifestyle',
  },
  // sideEffects は addonsRef 個別指定でのみ表示（ここでは常に除外）
]

// ─────────────────────────────────────────────────────────────
// getVisibleAddonKeys — 表示するアドオンキー配列を返す純関数
//
// @param addons       ModuleData.addons
// @param scenario     選択中の Scenario（未選択時は null/undefined）
// @returns            addons.items のキー配列（表示順保証）
//                     空配列 → AddonPanel は何も表示しない
// ─────────────────────────────────────────────────────────────

export function getVisibleAddonKeys(
  addons: AddonsData | undefined,
  scenario: Scenario | null | undefined,
): string[] {
  if (!addons || !scenario) return []

  // 1. scenario.addonsRef が存在する → そのキー一覧を返す（個別指定優先）
  const ref = scenario.addonsRef
  if (ref) {
    const allKeys: string[] = []
    const soapSections = ['S', 'O', 'A', 'P'] as const
    for (const k of soapSections) {
      if (ref[k]) allKeys.push(...ref[k]!)
    }
    // 重複除去（順序保持）・items に存在するキーのみ
    return [...new Set(allKeys)].filter(k => k in addons.items)
  }

  // 2. GROUP_RULES に従いグループを選択し、そのグループのアイテムキーを返す
  const allowedGroups = new Set(
    GROUP_RULES.filter(rule => rule.match(scenario)).map(rule => rule.group),
  )

  if (allowedGroups.size === 0) return []

  // addons.items から allowedGroups に属するキーを抽出（items の定義順を維持）
  return Object.entries(addons.items)
    .filter(([, item]) => allowedGroups.has(item.group))
    .map(([key]) => key)
}
