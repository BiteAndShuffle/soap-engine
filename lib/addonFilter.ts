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
 *   brandHandlingTags が指定されている場合、addon.requiredTags に
 *   条件が定義されているアドオンは、ブランドの handlingTags が
 *   requiredTags の全要素を含まない場合は非表示にする（AND条件）。
 *   requiredTags が未定義または空配列のアドオンは常に表示する。
 *   brandHandlingTags が undefined の場合はフィルタをスキップする（後方互換）。
 *
 * ── undefined と [] の意味差（重要）──────────────────────────
 *
 *   undefined : ブランドフィルタを適用しない既存の後方互換状態。
 *               requiredTags を持つアドオンも含めて全件が表示される。
 *   []        : authoritative な brand 固有 handlingTags が存在しない状態
 *               （BrandResolution の denotation='generic' / 'module'）。
 *               requiredTags を持つアドオンは条件を満たせず非表示になるが、
 *               requiredTags を持たないアドオンはそのまま残る。
 *
 *   **未確定（brand が確定していない状態）を undefined で表現してはならない。**
 *   undefined はフィルタ自体を無効化するため、意味が正反対になる（brand 依存
 *   アドオンがかえって全表示される）。未確定は必ず [] で表現すること。
 *   導出は `lib/brandTags.ts` の resolveBrandHandlingTags() を正本とする
 *   （`docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 / U-5）。
 *
 * 廃止:
 *   GROUP_RULES（scenarioType/scenarioGroup ベースの自動選択）は廃止。
 *   addonsRef のないシナリオにアドオンを自動表示しない。
 *   ADDON_TAG_REQUIREMENTS（コード側ハードコード）は廃止。
 *   addon.requiredTags（JSON側）に移行済み。
 */

import type { Scenario, AddonsData } from './types'

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
    const required = addons.items[key]?.requiredTags
    // requiredTags が未定義または空配列 → 条件なし（常に表示）
    if (!required || required.length === 0) return true
    // requiredTags の全要素をブランドが持っていれば表示（AND条件）
    return required.every(tag => brandHandlingTags.includes(tag))
  })
}
