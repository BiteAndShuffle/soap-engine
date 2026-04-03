// ─────────────────────────────────────────────────────────────
// applyPersona — SOAP テキストへのペルソナ変換
//
// 【重要】この関数は「表示テキストの変換のみ」を担当する。
//   - buildSoap / composeNodes / primaryBaseFields には一切触れない
//   - displayFields の最終表示直前（DashboardClient の finalFields）でのみ使用する
//   - 医療ロジック・S/P構造・主語分解には影響しない
// ─────────────────────────────────────────────────────────────

/** ペルソナ種別。'default' は廃止し、両方とも文体が変化する人格。 */
export type PersonaId = 'polite' | 'gentle'

/** ペルソナ表示ラベル */
export const PERSONA_LABELS: Record<PersonaId, string> = {
  polite: '丁寧',
  gentle: 'やさしい',
}

// ─────────────────────────────────────────────────────────────
// 丁寧変換ルール
//
// 「〜した。」→「〜しました。」
// 「〜である。」→「〜です。」
// ─────────────────────────────────────────────────────────────

function applyPolite(text: string): string {
  return text
    // 〜した。→ 〜しました。（連用形 + した）
    .replace(/した。/g, 'しました。')
    // 〜である。→ 〜です。
    .replace(/である。/g, 'です。')
    // 〜だ。→ 〜です。（単体の「だ。」）
    .replace(/(?<![しまいでなかっ])だ。/g, 'です。')
    // 〜ない。→ 〜ありません。
    .replace(/認めない。/g, '認めません。')
    .replace(/できない。/g, 'できません。')
    // 〜する。→ 〜します。
    .replace(/継続する。/g, '継続します。')
    .replace(/確認する。/g, '確認します。')
    .replace(/注意する。/g, '注意します。')
}

// ─────────────────────────────────────────────────────────────
// やさしい変換ルール
//
// 丁寧ベース + 柔らかい表現への置換
// ─────────────────────────────────────────────────────────────

function applyGentle(text: string): string {
  // まず丁寧変換を適用
  let t = applyPolite(text)
  // 「〜してください。」→「〜していただけると安心です。」
  t = t.replace(/してください。/g, 'していただけると安心です。')
  // 「〜注意してください。」は上のルールで変換済み → 再調整
  t = t.replace(/注意していただけると安心です。/g, 'お気をつけいただけると安心です。')
  // 「〜ご相談ください。」→「〜ご相談いただけます。」
  t = t.replace(/ご相談ください。/g, 'お気軽にご相談いただけます。')
  // 「次回、〜」→「次回のご来院時に〜」
  t = t.replace(/次回、/g, '次回のご来院時に、')
  return t
}

// ─────────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────────

/**
 * 単一テキストにペルソナ変換を適用する。
 * ON時は必ずどちらかのペルソナが適用される（OFF は呼び出し元で制御）。
 */
export function applyPersona(text: string, persona: PersonaId): string {
  if (!text) return text
  switch (persona) {
    case 'polite': return applyPolite(text)
    case 'gentle': return applyGentle(text)
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
