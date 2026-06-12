/**
 * applyPlaceholder.ts
 *
 * S 本文中の {{applicationSite}} プレースホルダーを localSiteInput で置換する共通関数。
 *
 * 設計原則:
 *   - 単剤表示・Express合成・多剤マージすべてで共通利用する。
 *   - siteButtonType に応じた空扱いロジックも本関数が持つ。
 *   - モジュール固有の分岐は持たない。
 *
 * siteButtonType:
 *   "topical" — 外用薬。方向のみ（左/右/両）は空扱い。部位がある場合のみ代入。
 *   "eye"     — 点眼薬。方向のみでも有効な入力として代入（"右" → "右眼のかゆみ"）。
 *   undefined — ボタンなし自由入力。入力値をそのまま代入。
 *
 * 未入力・空扱い時:
 *   {{applicationSite}}の → 「の」ごと除去（外用薬パターン）
 *   {{applicationSite}}   → トークンのみ除去（点眼薬・その他）
 */

/** {{applicationSite}} プレースホルダートークン */
export const APPLICATION_SITE_TOKEN = '{{applicationSite}}'

/** 方向プレフィックス一覧 */
const DIRECTIONS = ['左', '右', '両'] as const

/**
 * S 本文中の {{applicationSite}} を siteInput で置換する。
 *
 * @param s          置換対象の S 文字列（{{applicationSite}} を含む可能性がある）
 * @param siteInput  ユーザーが入力した部位文字列（空文字 = 未入力）
 * @param siteButtonType  'topical' | 'eye' | undefined
 * @returns          プレースホルダーが解決された S 文字列
 */
export function applyPlaceholder(
  s: string,
  siteInput: string,
  siteButtonType: 'topical' | 'eye' | undefined,
): string {
  let site = siteInput.trim()

  // topical モード: 方向のみ（部位なし）は空扱い
  // 例: "右" だけでは "右の乾燥" が生成されるため、空として除去する
  if (siteButtonType === 'topical') {
    const isDirectionOnly = DIRECTIONS.some(d => site === d)
    if (isDirectionOnly) site = ''
  }

  if (site) {
    return s.replaceAll(APPLICATION_SITE_TOKEN, site)
  }

  // 未入力・空扱い: トークンを除去。
  // "{{applicationSite}}の" → 「の」ごと除去（外用: "〜の乾燥" → "乾燥"）
  // "{{applicationSite}}"   → トークンのみ除去（点眼: "眼のかゆみ" を残す）
  return s
    .replaceAll(`${APPLICATION_SITE_TOKEN}の`, '')
    .replaceAll(APPLICATION_SITE_TOKEN, '')
}

/**
 * S 文字列に {{applicationSite}} トークンが含まれるか判定する。
 */
export function hasApplicationSiteToken(s: string): boolean {
  return s.includes(APPLICATION_SITE_TOKEN)
}
