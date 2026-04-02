// ─────────────────────────────────────────────────────────────
// applyPersona — SOAP テキストへのペルソナ変換
//
// 【重要】この関数は「表示テキストの変換のみ」を担当する。
//   - buildSoap / composeNodes / primaryBaseFields には一切触れない
//   - displayFields の最終表示直前（DashboardClient の finalFields）でのみ使用する
//   - 医療ロジック・S/P構造・主語分解には影響しない
// ─────────────────────────────────────────────────────────────

export type PersonaId = 'default' | 'polite'

/** ペルソナ表示ラベル */
export const PERSONA_LABELS: Record<PersonaId, string> = {
  default: '標準',
  polite:  '丁寧',
}

/**
 * 単一テキストにペルソナ変換を適用する。
 *
 * - 'default': 変換なし（そのまま返す）
 * - 'polite':  拡張用プレースホルダ。現時点では変換なし。
 *              後で辞書/ルールを追加して文末変換等を実装予定。
 */
export function applyPersona(text: string, persona: PersonaId): string {
  if (persona === 'default' || !text) return text
  // 将来の実装例:
  //   .replace(/します。/g, 'いたします。')
  //   .replace(/ください。/g, 'くださいませ。')
  // 現時点では変換なし（拡張用構造のみ確立）
  return text
}

/**
 * SoapFields 全体にペルソナ変換を適用する。
 *
 * - enabled=false または persona='default' の場合は fields をそのまま返す（参照同一）
 * - enabled=true かつ persona≠'default' の場合は変換済み新オブジェクトを返す
 */
export function applyPersonaToFields(
  fields: { S: string; O: string; A: string; P: string },
  enabled: boolean,
  persona: PersonaId,
): { S: string; O: string; A: string; P: string } {
  if (!enabled || persona === 'default') return fields
  return {
    S: applyPersona(fields.S, persona),
    O: applyPersona(fields.O, persona),
    A: applyPersona(fields.A, persona),
    P: applyPersona(fields.P, persona),
  }
}
