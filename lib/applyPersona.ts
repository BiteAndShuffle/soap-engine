// ─────────────────────────────────────────────────────────────
// applyPersona — SOAP テキストへのペルソナ変換
//
// 【重要】この関数は「表示テキストの変換のみ」を担当する。
//   - buildSoap / composeNodes / primaryBaseFields には一切触れない
//   - displayFields の最終表示直前（DashboardClient の finalFields）でのみ使用する
//   - 医療ロジック・S/P構造・主語分解には影響しない
//
// P欄の申し送り・closing 系定型文（次回〜確認。／〜ことを説明。）は
// 変換対象外とする。isMedicalRecord() で識別して除外する。
// ─────────────────────────────────────────────────────────────

/** ペルソナ種別。ON時は必ずどちらかが適用される。 */
export type PersonaId = 'polite' | 'gentle'

/** ペルソナ表示ラベル */
export const PERSONA_LABELS: Record<PersonaId, string> = {
  polite: '丁寧',
  gentle: 'やさしい',
}

// ─────────────────────────────────────────────────────────────
// 申し送り・closing 定型文の識別
//
// 以下の行はペルソナ変換対象外:
//   - 「次回、〜確認。」系（記録・申し送り定型文）
//   - 「〜ことを説明。」「〜必要があることを説明。」系（指導記録）
//
// 行単位で判定する（1行がまるごと定型文の場合のみ除外）。
// ─────────────────────────────────────────────────────────────

function isMedicalRecord(line: string): boolean {
  const t = line.trim()
  // 次回〜確認。 / 次回も〜確認。
  if (/^次回[、,，]/.test(t) && /確認[。.]$/.test(t)) return true
  // 〜ことを説明。 / 〜必要があることを説明。 / 〜するよう説明。
  if (/(?:ことを|ことについて|よう)説明[。.]$/.test(t)) return true
  // 〜について指導。 / 〜よう指導。 / 〜よう助言。
  if (/(?:について|よう)(?:指導|助言)[。.]$/.test(t)) return true
  return false
}

// ─────────────────────────────────────────────────────────────
// 行単位で変換を適用するユーティリティ
// ─────────────────────────────────────────────────────────────

function transformLines(text: string, transform: (line: string) => string): string {
  return text
    .split('\n')
    .map(line => isMedicalRecord(line) ? line : transform(line))
    .join('\n')
}

// ─────────────────────────────────────────────────────────────
// 丁寧変換ルール（polite）
//
// 方針: 体言止め・常体を丁寧体に。医療現場として不自然にならない範囲。
// ─────────────────────────────────────────────────────────────

function politeTransform(line: string): string {
  return line
    // ── 文末動詞 ───────────────────────────────────────────
    // 〜した → 〜しました
    .replace(/した。/g, 'しました。')
    // 〜である → 〜です
    .replace(/である。/g, 'です。')
    // 〜と考える → 〜と考えます
    .replace(/と考える。/g, 'と考えます。')
    // 〜認める → 〜認めます
    .replace(/を認める。/g, 'を認めます。')
    .replace(/は認める。/g, 'は認めます。')
    // 〜認めない → 〜認めません
    .replace(/を認めない。/g, 'を認めません。')
    .replace(/は認めない。/g, 'は認めません。')
    // 〜必要 → 〜必要です
    .replace(/が必要。/g, 'が必要です。')
    .replace(/は必要。/g, 'は必要です。')
    // 〜継続する → 〜継続します
    .replace(/継続する。/g, '継続します。')
    // 〜確認する → 〜確認いたします
    .replace(/確認する。/g, '確認いたします。')
    // 〜注意する → 〜注意します
    .replace(/注意する。/g, '注意します。')
    // 〜できない → 〜できません
    .replace(/できない。/g, 'できません。')
    // 〜なる → 〜なります（変動・上昇などに続く）
    .replace(/可能性がある。/g, '可能性があります。')
    // 〜ある → 〜あります（「〜の可能性がある」以外の用法）
    .replace(/ことがある。/g, 'ことがあります。')
    .replace(/場合がある。/g, '場合があります。')
    // 〜となる → 〜となります
    .replace(/となる。/g, 'となります。')
    // 〜重要 → 〜重要です
    .replace(/が重要。/g, 'が重要です。')
}

// ─────────────────────────────────────────────────────────────
// やさしい変換ルール（gentle）
//
// 方針: 丁寧ベース + 柔らかい表現。医療記録として浮かない範囲。
// ─────────────────────────────────────────────────────────────

function gentleTransform(line: string): string {
  // まず丁寧変換を適用
  let t = politeTransform(line)
  // 〜ご相談ください → お気軽にご相談ください
  t = t.replace(/(?<!お気軽に)ご相談ください。/g, 'お気軽にご相談ください。')
  // 〜確認いたします → 〜確認していきます
  t = t.replace(/確認いたします。/g, '確認していきます。')
  // 〜注意します → 〜お気をつけください
  t = t.replace(/注意します。/g, 'お気をつけください。')
  // 〜受診してください → 〜受診いただくことをおすすめします
  t = t.replace(/受診してください。/g, '受診いただくことをおすすめします。')
  return t
}

// ─────────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────────

/**
 * 単一テキストにペルソナ変換を適用する。
 * - 行単位で変換。isMedicalRecord() に該当する行はスキップ。
 * - ON時は必ずどちらかのペルソナが適用される（OFF は呼び出し元で制御）。
 */
export function applyPersona(text: string, persona: PersonaId): string {
  if (!text) return text
  switch (persona) {
    case 'polite': return transformLines(text, politeTransform)
    case 'gentle': return transformLines(text, gentleTransform)
  }
}

/**
 * SoapFields 全体にペルソナ変換を適用する。
 *
 * - enabled=false の場合は fields をそのまま返す（参照同一）
 * - enabled=true の場合は必ずペルソナ変換済み新オブジェクトを返す
 */
export function applyPersonaToFields(
  fields: { S: string; O: string; A: string; P: string },
  enabled: boolean,
  persona: PersonaId,
): { S: string; O: string; A: string; P: string } {
  if (!enabled) return fields
  return {
    S: applyPersona(fields.S, persona),
    O: applyPersona(fields.O, persona),
    A: applyPersona(fields.A, persona),
    P: applyPersona(fields.P, persona),
  }
}
