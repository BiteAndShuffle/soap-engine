/**
 * scenarioSelector.ts — 自然言語入力 → 最適シナリオ選択
 *
 * 二段階マッチング:
 *   Phase 1: GROUP_RULES のキーワードテーブルで scenarioGroup を推定
 *   Phase 2: title(+3点) / S(+1点) のスライディングウィンドウテキストスコアで
 *            最終候補を絞り込む
 *
 * 依存: ModuleData, Scenario（lib/types.ts の実在フィールドのみ使用）
 * any 禁止 / 純粋関数
 */

import type { ModuleData, Scenario } from './types'

// ─────────────────────────────────────────────────────────────
// 公開型
// ─────────────────────────────────────────────────────────────

export interface ScenarioSelectorInput {
  module: ModuleData
  patientInput: string
}

export interface ScenarioSelectorOutput {
  scenarioId: string | null
  confidence: number
  reason: string
}

// ─────────────────────────────────────────────────────────────
// Phase 1: 症状キーワード → scenarioGroup マッピング
// ─────────────────────────────────────────────────────────────

/**
 * scenarioGroup 名と、そのグループに属すると判定するためのキーワード一覧。
 * 上から優先順位が高い（先にマッチした全グループを採用する）。
 */
const GROUP_RULES: ReadonlyArray<{ group: string; keywords: string[] }> = [
  {
    group: 'digestive',
    keywords: [
      '吐き気', '嘔吐', '吐いた', '気持ち悪い', '胃もたれ', '胃が痛い',
      '胃痛', '下痢', '軟便', '腹痛', '腹が痛い', '食欲がない', '食欲不振',
      '食べられない', '食べると気持ち悪い',
    ],
  },
  {
    group: 'hypoglycemia',
    keywords: [
      '低血糖', '血糖が下がった', '血糖が低い', 'ふらふら', 'めまい',
      '冷や汗', '手が震える', '震え', '動悸', '意識が遠くなった',
    ],
  },
  {
    group: 'pancreatitis',
    keywords: [
      '膵炎', 'すい炎', '膵臓', 'すい臓', '上腹部の痛み', '背中が痛い',
      '背部痛', 'アミラーゼ',
    ],
  },
  {
    group: 'sickday',
    keywords: [
      '風邪', '発熱', '熱', '体調不良', '食事が取れない', '脱水',
      'シックデイ', '嘔吐が続く', '下痢が続く', '水分が取れない',
    ],
  },
  {
    group: 'adherence_poor',
    keywords: [
      '飲み忘れ', '飲めていない', '服用できていない', '飲んでいない',
      'コンプライアンス不良', 'アドヒアランス不良',
      '自己中断', '勝手にやめた', '副作用が怖くてやめた',
    ],
  },
  {
    group: 'adherence_good',
    keywords: [
      '問題なく飲めている', 'きちんと飲めている', '毎日飲めている',
      'コンプライアンス良好', 'アドヒアランス良好', '規則正しく服用',
    ],
  },
  {
    group: 'start_or_change',
    keywords: [
      '初回', '初めて', '新たに開始', '新規処方', '追加になった',
      '変更になった', '薬が変わった', 'スタート', '導入',
    ],
  },
  {
    group: 'dose_change',
    keywords: [
      '増量', '用量を増やした', '量が増えた',
      '減量', '用量を減らした', '量が減った',
    ],
  },
  {
    group: 'end_improved',
    keywords: [
      '良くなって終了', '改善して終了', '治って終了', '寛解', '終了になった',
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// Phase 1 ヘルパー
// ─────────────────────────────────────────────────────────────

/**
 * patientInput に含まれる GROUP_RULES のキーワードを全件照合し、
 * マッチした scenarioGroup を重複なく返す。
 * 複数グループが同時にマッチする場合はすべて収集する。
 */
function matchGroups(input: string): string[] {
  const matched: string[] = []
  for (const rule of GROUP_RULES) {
    const hit = rule.keywords.some(kw => input.includes(kw))
    if (hit) matched.push(rule.group)
  }
  return matched
}

// ─────────────────────────────────────────────────────────────
// Phase 2 ヘルパー
// ─────────────────────────────────────────────────────────────

/**
 * テキストからマッチ対象フレーズを抽出する。
 * - 半角英数スペース区切りトークン（英語キーワード対応）
 * - 3〜6文字の日本語スライディングウィンドウ（分かち書き不要の日本語対応）
 */
function extractPhrases(text: string): string[] {
  const phrases = new Set<string>()

  // 半角スペース区切りトークン（英語・ID 等）
  for (const token of text.split(/\s+/).filter(t => t.length > 0)) {
    phrases.add(token)
  }

  // 3〜6文字のスライディングウィンドウ（日本語フレーズ）
  for (let len = 3; len <= 6; len++) {
    for (let i = 0; i <= text.length - len; i++) {
      phrases.add(text.slice(i, i + len))
    }
  }

  return Array.from(phrases)
}

const GROUP_MATCH_BONUS = 10

/**
 * シナリオ1件のスコアを計算する。
 *   title にマッチ: +3点/フレーズ
 *   S にマッチ    : +1点/フレーズ
 *
 * Phase 1 でマッチした scenarioGroup に属するシナリオにはボーナスを付与する。
 * fallback（全件）時は matchedGroupSet が空のため、結果的にボーナスは 0 になる。
 */
function calcTextScore(
  scenario: Scenario,
  phrases: string[],
  matchedGroupSet: ReadonlySet<string>,
): number {
  let score = 0
  for (const phrase of phrases) {
    if (scenario.title.includes(phrase)) score += 3
    if (scenario.S.includes(phrase)) score += 1
  }

  // Phase 1 でマッチした scenarioGroup に属するシナリオにはボーナスを付与する
  // fallback（全件）時は matchedGroupSet が空のため、結果的にボーナスは 0 になる
  const bonus = matchedGroupSet.has(scenario.scenarioGroup) ? GROUP_MATCH_BONUS : 0

  return score + bonus
}

// ─────────────────────────────────────────────────────────────
// エントリーポイント
// ─────────────────────────────────────────────────────────────

export function scenarioSelector(
  input: ScenarioSelectorInput,
): ScenarioSelectorOutput {
  const { module, patientInput } = input
  const trimmed = patientInput.trim()

  if (!trimmed) {
    return { scenarioId: null, confidence: 0, reason: 'patientInput が空です' }
  }

  // Phase 1: グループ推定
  const matchedGroups = matchGroups(trimmed)
  const matchedGroupSet: ReadonlySet<string> = new Set(matchedGroups)

  // 候補シナリオ: Phase 1 でマッチしたグループのシナリオ優先、なければ全件
  const candidates: Scenario[] =
    matchedGroups.length > 0
      ? module.scenarios.filter(sc => matchedGroupSet.has(sc.scenarioGroup))
      : module.scenarios

  // fallback: グループマッチなしの場合は全件を対象にする
  const searchPool = candidates.length > 0 ? candidates : module.scenarios

  // Phase 2: テキストスコアリング
  const phrases = extractPhrases(trimmed)

  let bestScore = -1
  let bestScenario: Scenario | null = null

  for (const sc of searchPool) {
    const score = calcTextScore(sc, phrases, matchedGroupSet)
    if (score > bestScore) {
      bestScore = score
      bestScenario = sc
    }
  }

  if (!bestScenario || bestScore <= 0) {
    return {
      scenarioId: null,
      confidence: 0,
      reason: 'スコアが 0 以下のためシナリオを特定できませんでした',
    }
  }

  const confidence = Math.min(bestScore / 15, 1.0)
  const reason =
    matchedGroups.length > 0
      ? `グループ [${matchedGroups.join(', ')}] にマッチ → 「${bestScenario.title}」(score=${bestScore})`
      : `全件スキャン → 「${bestScenario.title}」(score=${bestScore})`

  return {
    scenarioId: bestScenario.globalId,
    confidence,
    reason,
  }
}
