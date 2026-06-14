/**
 * soapComposer.ts — ScenarioOutput → 最終 SOAP テキスト合成
 *
 * 処理順:
 *   1. S/O/A/P の基本テキストを ScenarioOutput から取得
 *   2. addonsRef が存在し skipAddonsRef が false の場合:
 *      module.addons.items から各セクションにテキストを追記（"\n\n" 区切り）
 *      参照先が存在しないキーは無視
 *   3. followup が存在する場合:
 *      - 値が "default" → module.defaults.followup[key] の値を末尾に追記
 *      - 値が null / undefined → 何もしない
 *
 * skipAddonsRef: true の場合は addonsRef の自動展開をスキップする。
 * Rapid（NLP）生成経路ではこのオプションを true にすることで、
 * addonsRef 由来テキストを本文に混入させない。
 * ADDON の本文反映は UI 側の handleAddonToggle が selectedAddonIds を使って行う。
 *
 * any 禁止 / 純粋関数
 */

import type { ModuleData, SoapKey } from './types'
import type { ScenarioOutput } from './jsonScenarioBuilder'

// ─────────────────────────────────────────────────────────────
// 公開型
// ─────────────────────────────────────────────────────────────

export interface ComposedSoap {
  S: string
  O: string
  A: string
  P: string
}

// ─────────────────────────────────────────────────────────────
// 内部定数
// ─────────────────────────────────────────────────────────────

const SOAP_KEYS: SoapKey[] = ['S', 'O', 'A', 'P']

// ─────────────────────────────────────────────────────────────
// エントリーポイント
// ─────────────────────────────────────────────────────────────

export function soapComposer(
  scenarioOutput: ScenarioOutput,
  module: ModuleData,
  { skipAddonsRef = false }: { skipAddonsRef?: boolean } = {},
): ComposedSoap {
  const result: ComposedSoap = {
    S: scenarioOutput.S,
    O: scenarioOutput.O,
    A: scenarioOutput.A,
    P: scenarioOutput.P,
  }

  // 2. addonsRef の解決（skipAddonsRef が true の場合はスキップ）
  if (!skipAddonsRef && scenarioOutput.addonsRef && module.addons) {
    for (const key of SOAP_KEYS) {
      const refs = scenarioOutput.addonsRef[key]
      if (!refs || refs.length === 0) continue

      const texts = refs
        .map(ref => module.addons?.items[ref]?.text ?? '')
        .filter(text => text.length > 0)

      if (texts.length > 0) {
        const joined = texts.join('\n\n')
        result[key] = result[key] ? `${result[key]}\n\n${joined}` : joined
      }
    }
  }

  // 3. followup の適用
  if (scenarioOutput.followup) {
    for (const key of ['S', 'P'] as const) {
      const followupVal = scenarioOutput.followup[key]
      if (followupVal !== 'default') continue

      const defaultText = module.defaults?.followup?.[key]
      if (!defaultText) continue

      result[key] = result[key]
        ? `${result[key]}\n${defaultText}`
        : defaultText
    }
  }

  return result
}
