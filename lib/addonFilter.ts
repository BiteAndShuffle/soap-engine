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
 * ブランドフィルタ:
 *   brandHandlingTags が指定されている場合、ADDON_TAG_REQUIREMENTS に
 *   必要タグが定義されているアドオンは、ブランドの handlingTags に
 *   必要タグが1つも含まれない場合は非表示にする。
 *   必要タグが未定義（空配列または定義なし）のアドオンは常に表示する。
 *   brandHandlingTags が undefined の場合はフィルタをスキップする（後方互換）。
 *
 * 廃止:
 *   GROUP_RULES（scenarioType/scenarioGroup ベースの自動選択）は廃止。
 *   addonsRef のないシナリオにアドオンを自動表示しない。
 */

import type { Scenario, AddonsData } from './types'

// ─────────────────────────────────────────────────────────────
// ADDON_TAG_REQUIREMENTS
//
// アドオンキー → 表示に必要な handlingTags（いずれか1つ一致で表示）。
// 空配列 = 条件なし（常に表示）。
// このマップにないアドオンキーも条件なしとして扱う。
// ─────────────────────────────────────────────────────────────

const ADDON_TAG_REQUIREMENTS: Record<string, string[]> = {
  addon_eye_drop_storage_light_protection: ['light_protection_storage'],
  addon_eye_drop_storage_upright:          ['suspension_eye_drop', 'shake_before_use'],
  addon_eye_drop_storage_cold:             ['cold_storage'],
  addon_eye_drop_suspension_shake:         ['suspension_eye_drop', 'shake_before_use'],
  // addon_eye_drop_tip_contamination は条件なし（常に表示）
}

// ─────────────────────────────────────────────────────────────
// getVisibleAddonKeys — 表示するアドオンキー配列を返す純関数
//
// @param addons            ModuleData.addons
// @param scenario          選択中の Scenario（未選択時は null/undefined）
// @param brandHandlingTags 選択中ブランドの handlingTags（未選択時は undefined）
// @returns                 addons.items のキー配列（表示順保証）
//                          空配列 → AddonPanel は何も表示しない
// ─────────────────────────────────────────────────────────────

export function getVisibleAddonKeys(
  addons: AddonsData | undefined,
  scenario: Scenario | null | undefined,
  brandHandlingTags?: string[],
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
  const deduped = [...new Set(allKeys)].filter(k => k in addons.items)

  // ブランドフィルタ: brandHandlingTags が渡されている場合のみ適用
  if (brandHandlingTags === undefined) return deduped

  return deduped.filter(key => {
    const required = ADDON_TAG_REQUIREMENTS[key]
    // required が未定義または空配列 → 条件なし（常に表示）
    if (!required || required.length === 0) return true
    // required のいずれか1つでもブランドが持っていれば表示
    return required.some(tag => brandHandlingTags.includes(tag))
  })
}
