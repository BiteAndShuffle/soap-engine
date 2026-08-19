/**
 * rapidSentence.ts — Rapid S先頭文の生成・置換・復元（pure）
 *
 * Rapid Mode v2 / Unit 1 で app/components/SoapEditor.tsx から移送した。
 *
 * 移送理由（RAPID-V2-20）:
 *   SoapEditor.tsx は CSS module（layout.module.css）を import するため、
 *   node:test 実行環境から直接 import できない。その制約により
 *   tests/personaState.test.ts は replaceSFirstSentence をローカル複製していた。
 *   production 関数を lib/ へ置くことで test が直接 import できるようになり、
 *   mirror implementation を持たずに検証できる。
 *
 * 本ファイルは React にも CSS にも依存しない純関数のみを持つ。
 * SoapEditor.tsx は後方互換のため本ファイルを re-export する。
 */

// ─────────────────────────────────────────────────────────────
// S欄先頭文: relation × condition の2軸
// ─────────────────────────────────────────────────────────────

/**
 * 前回との関係性（新規追加 / 薬変更 / 増量 / 減量 / Do継続）
 * UI上の「前回、新薬追加」「前回、薬変更」「前回、増量」「前回、減量」「前回、Do」に対応する。
 */
export type SRelation = 'new_addition' | 'med_changed' | 'dose_increased' | 'dose_decreased' | 'continued_do'

/**
 * 体調状態（落ち着いている / 改善 / 変わりない / 改善不十分）
 * UI上の4ボタンに対応する。
 */
export type SCondition = 'stable' | 'improved' | 'unchanged' | 'not_improved'

/** relation の表示ラベル */
export const S_RELATION_LABELS: Record<SRelation, string> = {
  new_addition:   '新規追加',
  med_changed:    '薬変更',
  dose_increased: '増量',
  dose_decreased: '減量',
  continued_do:   'Do',
}

/** condition の表示ラベル */
export const S_CONDITION_LABELS: Record<SCondition, string> = {
  stable:       '落ち着いている',
  improved:     '良くなってきた',
  unchanged:    '変わりない',
  not_improved: 'あまり良くなっていない',
}

/**
 * relation × condition から「S欄先頭文」を汎用生成する。
 *
 * 糖尿病・感染症・整形など診療科を問わず使用できる汎用関数。
 * シナリオ種別（副作用なし系/CP系など）による分岐は行わない。
 * シナリオ固有の観察文（「低血糖症状は認めない」等）は
 * replaceSFirstSentence により先頭文の後ろに連結される。
 */
export function buildSFirstSentence(relation: SRelation, condition: SCondition): string {
  const cond = S_CONDITION_LABELS[condition]
  switch (relation) {
    case 'new_addition':
      return `前回から新しく薬を使用して${cond}。`
    case 'med_changed':
      return condition === 'not_improved'
        ? `前回から薬が変更となったが、十分な改善はみられない。`
        : `前回から薬が変更となり、${cond}。`
    case 'dose_increased':
      return condition === 'not_improved'
        ? `前回から薬が増量となったが、十分な改善はみられない。`
        : `前回から薬が増量となり${cond}。`
    case 'dose_decreased':
      return condition === 'not_improved'
        ? `前回から薬が減量となったが、十分な改善はみられない。`
        : `前回から薬が減量となり${cond}。`
    case 'continued_do':
      return condition === 'not_improved'
        ? `引き続き使用しているが、十分な改善はみられない。`
        : `引き続き使用して${cond}。`
  }
}

/**
 * Sフィールドの先頭文（最初の「。」まで）を新しい文に差し替える。
 */
export function replaceSFirstSentence(current: string, newFirst: string): string {
  const dotIdx = current.indexOf('。')
  if (dotIdx === -1) {
    return newFirst
  }
  const rest = current.slice(dotIdx + 1)
  const restTrimmed = rest.replace(/^[\n\r\s]+/, '')
  return restTrimmed ? `${newFirst}\n${restTrimmed}` : newFirst
}

// ─────────────────────────────────────────────────────────────
// Unit 1 追加: 薬剤名解決込みの先頭文生成 / 先頭文の復元
// ─────────────────────────────────────────────────────────────

/** display.adjustmentExpression（増量/減量の剤形固有表現） */
export interface AdjustmentExpression {
  increasePast: string
  decreasePast: string
}

/**
 * S先頭文を生成し、generic な「薬」を解決済み薬剤名へ置換したものを返す。
 *
 * Unit 1 以前は handleSToggle 内のインライン処理だったが、
 * scenario 変更時の Rapid 再適用（RAPID-V2-07 / 解釈①）でも同一の文が必要になるため
 * pure function として切り出した。**両経路が必ず同じ文を生成する**ことを保証する。
 *
 * relation ごとに薬剤名置換パターンを分ける:
 *   new_addition: 「薬を」→「{drug}を」
 *   med_changed:  「薬が変更と」→「{drug}に変更と」
 *   dose_increased / dose_decreased:
 *     adjustmentExpression があれば剤形固有表現を使う（点眼回数が増えた 等）。
 *     なければ従来の増量/減量テンプレートへフォールバックする。
 *   continued_do: 薬剤名なし（「引き続き使用して〜」は主語省略が自然）
 *
 * @param drugName 解決済み薬剤名。空 / undefined の場合は generic 文をそのまま返す
 */
export function buildResolvedSFirstSentence(
  relation: SRelation,
  condition: SCondition,
  drugName: string | undefined,
  adjustmentExpression?: AdjustmentExpression,
): string {
  const newFirst = buildSFirstSentence(relation, condition)
  if (!drugName) return newFirst

  // condition に応じた後続句（adjustmentExpression あり時に使用）
  const condSuffix = (() => {
    switch (condition) {
      case 'stable':       return '症状は落ち着いている。'
      case 'improved':     return '症状は良くなってきた。'
      case 'unchanged':    return '症状は変わりない。'
      case 'not_improved': return '十分な改善はみられない。'
    }
  })()

  if (relation === 'new_addition') return newFirst.replace('薬を', `${drugName}を`)
  if (relation === 'med_changed')  return newFirst.replace('薬が変更と', `${drugName}に変更と`)
  if (relation === 'dose_increased') {
    if (adjustmentExpression) {
      return `前回から${drugName}の${adjustmentExpression.increasePast}が、${condSuffix}`
    }
    return newFirst
      .replace('薬が増量となり', `${drugName}が増量となり`)
      .replace('薬が増量となったが', `${drugName}が増量となったが`)
  }
  if (relation === 'dose_decreased') {
    if (adjustmentExpression) {
      return `前回から${drugName}の${adjustmentExpression.decreasePast}が、${condSuffix}`
    }
    return newFirst
      .replace('薬が減量となり', `${drugName}が減量となり`)
      .replace('薬が減量となったが', `${drugName}が減量となったが`)
  }
  return newFirst  // continued_do: 薬剤名なしが自然
}

/** 文字列の先頭文（最初の「。」まで）を返す。「。」がなければ全体を返す。 */
export function firstSentenceOf(s: string): string {
  const dotIdx = s.indexOf('。')
  return dotIdx === -1 ? s : s.slice(0, dotIdx + 1)
}

/**
 * Rapid 適用済み S から、scenario 本来の先頭文へ差し戻す（RAPID-V2-05）。
 *
 * 先頭文のみを対象とするため、残余（シナリオ固有の観察文・ADDON テキスト）は保持される。
 * Rapid 適用前の S を別途スナップショットする方式と異なり、
 * Rapid ON 後に ADDON をトグルしても stale 化しない。
 *
 * @param currentS          現在の S（Rapid 先頭文 + 残余 + ADDON）
 * @param pristineScenarioS そのシナリオを addon なしで組み立てた素の S
 */
export function restoreScenarioFirstSentence(
  currentS: string,
  pristineScenarioS: string,
): string {
  return replaceSFirstSentence(currentS, firstSentenceOf(pristineScenarioS))
}
