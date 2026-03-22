/**
 * addonFilter.ts
 *
 * シナリオに応じて表示するアドオンキーを決定する純関数。
 * SSOT: scenario.addonsRef のみを参照する。
 *
 * ルール:
 *   addonsRef あり → S/O/A/P 全セクションのキーを union して返す
 *                    （group による UI_HIDDEN フィルタは行わない）
 *   addonsRef なし → 空配列（アドオンパネル非表示）
 *
 * 廃止:
 *   GROUP_RULES（scenarioType/scenarioGroup ベースの自動選択）は廃止。
 *   addonsRef のないシナリオにアドオンを自動表示しない。
 */

import type { Scenario, AddonsData } from './types'

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

  // addonsRef が SSOT（source of truth）。
  // 存在する場合: そのキー一覧をそのまま返す。
  //   - UI_HIDDEN_GROUPS フィルタを適用しない。
  //     addonsRef で明示指定されたキーはグループに関わらず表示する。
  //   - items に存在しないキーのみ除外（参照切れ防止）。
  // 存在しない場合: アドオンなし（空配列）。
  //   GROUP_RULES フォールバックは廃止。addonsRef のない
  //   シナリオにはアドオンパネルを表示しない。
  const ref = scenario.addonsRef
  if (!ref) return []

  const allKeys: string[] = []
  const soapSections = ['S', 'O', 'A', 'P'] as const
  for (const k of soapSections) {
    if (ref[k]) allKeys.push(...ref[k]!)
  }
  // 重複除去（順序保持）・items に存在するキーのみ
  return [...new Set(allKeys)].filter(k => k in addons.items)
}
