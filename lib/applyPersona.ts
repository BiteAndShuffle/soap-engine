// ═════════════════════════════════════════════════════════════════════════════
// applyPersona.ts — SOAP テキストへのペルソナ変換（軸ベース設計）
//
// ──────────────────────────────────────────────────────────────────────────
// 【このファイルの責務】
//   buildSoap / composeNodes が生成した「医療的に正確なテキスト」を
//   「表示文体のみ」変換する。医療ロジック・内容には一切触れない。
//
// 【変換適用フィールド】
//   S, O, A, P の全フィールドに applyPersonaToFields() で一括適用する。
//   ただし P 欄内の closing / follow-up 定型行は isMedicalRecord() で除外する。
//
//   フィールド別の適用可否（現状）:
//     S  ─ 適用可（主訴・症状の文体変換）
//          ⚠ 将来注意: S は患者の訴えを「原文に近い形で保持する」運用方針に
//             なった場合、S のみ除外する変更が必要になる。
//             その際は applyPersonaToFields() の S 欄を素通しする形に修正する。
//     O  ─ 適用可（検査値・数値が主体なので実質ほぼ変換されない）
//     A  ─ 適用可（評価・アセスメント文の文体変換）
//          ⚠ 将来注意: A は医師の医療判断が集中するフィールド。
//             ルールを追加する場合は A 欄への影響を個別に確認すること。
//             診断名・重症度・治療根拠の記述は意味変化が起きやすい。
//     P  ─ 適用可（処置指示の文体変換）
//          ただし closing 行は除外（isMedicalRecord() で保護）
//   P_ADDON / P_CLOSING ─ buildSoap で P 欄に統合済みのため個別適用不要。
//          closing 定型行は isMedicalRecord() で行レベルで除外される。
//
//   【フィールド単位の切り替えが必要になった場合の対応】
//     applyPersonaToFields() 内で特定フィールドを条件分岐すれば対応可能。
//     例: S のみ除外 → `S: applyPersona(fields.S, persona)` を `S: fields.S` に変更。
//     PersonaId ごとに適用フィールドを変えたい場合は FieldMask 的な型の追加を検討する。
//
// ──────────────────────────────────────────────────────────────────────────
// 【禁止領域（絶対に変換しないもの）】
//
//   1. closing / follow-up 定型行
//      「次回、〜確認。」「〜ことを説明。」「〜について指導。」等
//      isMedicalRecord() が行レベルで検出してスキップする。
//
//   2. 固有名詞・数値
//      薬剤名（リベルサス、セマグルチド等）・数値（HbA1c 6.5%等）は
//      ルール正規表現が文末の助動詞のみを対象とするため、
//      構造上マッチしない。ルール追加時も同様に設計すること。
//
//   3. 医療判断に関わる記述
//      文の前半（主語・評価対象・薬剤名・数値）を変化させるルールは禁止。
//      「文末の助動詞」と「評価定型句（可能性あり等）」のみが対象。
//
// ──────────────────────────────────────────────────────────────────────────
// 【拡張時の鉄則】
//
//   1. ルールは追加より削除を優先する
//      既存ルールが問題を起こした場合は削除・縮小で対応する。
//      新ルールの追加は「削除で解決できない場合」のみ検討する。
//      ルールが増えるほど相互干渉・予期しないマッチのリスクが増大する。
//
//   2. 不確実な変換は絶対に実装しない
//      「おそらく安全」「大半のケースで問題ない」レベルのルールは追加禁止。
//      前半が可変な文（主語・薬剤名・数値が来うる箇所）への汎用置換は禁止。
//      変換後に情報欠損・意味変化が起きないことを具体的なSOAP文で確認してから追加する。
//
//   3. 原稿側で解決できる問題はロジックに持ち込まない
//      JSON テンプレートの文末を統一すれば不要になる変換は、
//      テンプレート修正で対応する。applyPersona にルールを追加しない。
//      「テンプレートが常体で書かれているから polite ルールが必要」は正当な理由だが、
//      「このテンプレートだけ特殊な文体なので例外ルールを追加」は禁止。
//
// ──────────────────────────────────────────────────────────────────────────
// 【変換軸（AxisWeights）】
//
//   formality  : 0.0（常体）→ 1.0（丁寧体）  文末を敬体に変換
//   softness   : 0.0（直接）→ 1.0（柔らか）  指示表現を和らげる
//   density    : 0.0（詳細）→ 1.0（簡潔）    文末圧縮・定型評価語の体言止め
//   directness : 0.0（やわ）→ 1.0（直接）    将来拡張用
//
//   density と formality は排他:
//     density >= THRESHOLD.density の場合は formality ルールを適用しない。
//     簡潔モードで敬体化すると「継続します。→ 継続。」が「継続します。→ 継続します。」
//     と相殺されるため。
//
// ──────────────────────────────────────────────────────────────────────────
// 【人格を追加する手順】
//   1. PersonaId に型を追加:  export type PersonaId = '既存' | '新名前'
//   2. PERSONA_LABELS にラベルを追加
//   3. PERSONA_PROFILES に軸重みを追加
//   以上のみ。applyPersona / AxisWeights / ルールセットは変更不要。
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 変換軸の型定義
// ─────────────────────────────────────────────────────────────

export interface AxisWeights {
  /** 丁寧度: 0.0（常体）→ 1.0（丁寧体）*/
  formality: number
  /** 柔らかさ: 0.0（直接）→ 1.0（柔らか）*/
  softness: number
  /** 情報密度: 0.0（詳細）→ 1.0（簡潔）— 文末圧縮・定型評価語を体言止め */
  density: number
  /** 命令強度: 0.0（やわらかい）→ 1.0（直接）— 将来拡張用 */
  directness: number
}

// ─────────────────────────────────────────────────────────────
// ペルソナ種別
// ─────────────────────────────────────────────────────────────

/** ペルソナ種別 */
export type PersonaId = 'polite' | 'concise' | 'gentle' | 'plain'

/** ペルソナ表示ラベル */
export const PERSONA_LABELS: Record<PersonaId, string> = {
  plain:   'JSONそのまま',
  concise: '簡潔',
  polite:  '丁寧',
  gentle:  'やさしい',
}

// ─────────────────────────────────────────────────────────────
// ペルソナ定義（軸の重みマップ）
//
// 【人格追加時はここだけ変更する】
//   applyPersona / ルールセット / AxisWeights は変更不要。
//   PersonaId と PERSONA_LABELS にも追加が必要。
// ─────────────────────────────────────────────────────────────

const PERSONA_PROFILES: Record<PersonaId, AxisWeights> = {
  /**
   * JSONそのまま（開発・検証用）
   * 全軸=0 のため変換ルールが一切適用されない。
   * rawFields の内容をそのまま表示する。
   * personaEnabled=true にしたまま無変換状態を確認したい場合に使用する。
   */
  plain: {
    formality:  0.0,
    softness:   0.0,
    density:    0.0,
    directness: 0.0,
  },
  /**
   * 丁寧（baseline）
   * 常体を敬体に変換する。患者・家族への説明文書に近い文体。
   * softness=0 なので「お気軽に」等の付加語は入らない。
   */
  polite: {
    formality:  1.0,
    softness:   0.0,
    density:    0.0,
    directness: 0.5,
  },
  /**
   * 簡潔
   * 医療記録文（カルテ記載）寄りの文体。
   * 文末の助動詞と冗長な評価定型句を圧縮する。
   * density=1.0 のため formality は非適用（排他）。
   * 設計方針: 「記録文」であり「箇条書き」ではない。
   *   ─ 情報欠損は一切禁止
   *   ─ 主語・薬剤名・症状・数値は絶対保持
   *   ─ 不確実な場合は変換しない（DENSITY_RULES 参照）
   */
  concise: {
    formality:  0.0,
    softness:   0.0,
    density:    1.0,
    directness: 1.0,
  },
  /**
   * やさしい
   * 丁寧ベース（formality=1.0）に加え、softness=1.0 で指示表現を柔らかくする。
   * 患者への口頭説明や退院サマリー等を想定。
   */
  gentle: {
    formality:  1.0,
    softness:   1.0,
    density:    0.0,
    directness: 0.0,
  },
}

// ─────────────────────────────────────────────────────────────
// 軸適用閾値
//
// 各軸の weight がこの値以上のとき、対応ルールセットを適用する。
// 現在はバイナリ（ON/OFF）として機能している。
// 将来的に段階的適用（0.3 → 部分適用 / 0.7 → 完全適用 等）に
// 拡張する場合は applyAxes 内の閾値比較ロジックを修正する。
// ─────────────────────────────────────────────────────────────

const THRESHOLD = {
  formality: 0.5,
  softness:  0.5,
  density:   0.5,
} as const

// ─────────────────────────────────────────────────────────────
// closing / follow-up 定型行の識別
//
// 【役割】
//   P 欄末尾の closing 定型行・指導記録行を変換対象外にする。
//   これらは医療記録上の「事実の記載」であり、文体を変えてはならない。
//
// 【対象パターン（行全体がこれにマッチする場合のみ除外）】
//   - 「次回、〜確認。」（申し送り）
//   - 「〜ことを説明。」「〜ことについて説明。」「〜よう説明。」（指導記録）
//   - 「〜について指導。」「〜よう指導。」「〜よう助言。」（指導記録）
//
// 【注意】
//   行単位の判定。1行がまるごとこのパターンに該当する場合のみ除外。
//   同一行内に closing 以外のテキストが混在する場合は除外しない。
//
// 【ルール追加時の指針】
//   新しい定型行パターンが増えた場合はここに追加する。
//   誤マッチに注意: できるだけ末尾パターン（$）で固定すること。
// ─────────────────────────────────────────────────────────────

function isMedicalRecord(line: string): boolean {
  const t = line.trim()
  // 申し送り: 次回〜確認。 / 次回も〜確認。
  if (/^次回[、,，]/.test(t) && /確認[。.]$/.test(t)) return true
  // 指導記録: 〜ことを説明。 / 〜ことについて説明。 / 〜するよう説明。
  if (/(?:ことを|ことについて|よう)説明[。.]$/.test(t)) return true
  // 指導記録: 〜について指導。 / 〜よう指導。 / 〜よう助言。
  if (/(?:について|よう)(?:指導|助言)[。.]$/.test(t)) return true
  return false
}

// ─────────────────────────────────────────────────────────────
// 行単位で変換を適用するユーティリティ
//
// isMedicalRecord() に該当する行はスキップして元の行を返す。
// それ以外の行に transform を適用する。
// ─────────────────────────────────────────────────────────────

function transformLines(text: string, transform: (line: string) => string): string {
  return text
    .split('\n')
    .map(line => isMedicalRecord(line) ? line : transform(line))
    .join('\n')
}

// ─────────────────────────────────────────────────────────────
// ルールセットの型
// ─────────────────────────────────────────────────────────────

type ReplacePair = [RegExp | string, string]

// ─────────────────────────────────────────────────────────────
// FORMALITY_RULES: 常体 → 丁寧体
//
// 【対象】polite / gentle（density が低く formality が高いペルソナ）
//
// 【設計方針】
//   文末の終止形動詞・形容詞を敬体に変換する。
//   前半（主語・目的語・薬剤名・数値）は一切変更しない。
//
// 【lookbehind の使用】
//   /(?<!ま)した。/ の lookbehind は「ました。」の「した」を除外するため。
//   「体重減少を認めた。」→「を認めました。」は正しい変換だが、
//   「となりました。」はすでに敬体なので変換しない。
//   直前1文字が「ま」の場合は既に敬体の一部（〜ました）と判定する。
//
// 【ルールを追加する場合の注意】
//   - 対象は文末の助動詞のみ（行末 = 。で終わるパターン）
//   - 前半の語を消すパターンは禁止
//   - 「〜ました。」を再変換しないよう lookbehind を検討すること
// ─────────────────────────────────────────────────────────────

const FORMALITY_RULES: ReplacePair[] = [
  // 〜した。→ 〜しました。（直前が「ま」= 既に敬体ならスキップ）
  [/(?<!ま)した。/g, 'しました。'],
  // 〜である。→ 〜です。
  [/である。/g, 'です。'],
  // 〜と考える。→ 〜と考えます。
  [/と考える。/g, 'と考えます。'],
  // 〜を/は認める。→ 〜を/は認めます。
  [/を認める。/g, 'を認めます。'],
  [/は認める。/g, 'は認めます。'],
  // 〜を/は認めない。→ 〜を/は認めません。
  [/を認めない。/g, 'を認めません。'],
  [/は認めない。/g, 'は認めません。'],
  // 〜が/は必要。→ 〜が/は必要です。
  [/が必要。/g, 'が必要です。'],
  [/は必要。/g, 'は必要です。'],
  // 〜継続する。→ 〜継続します。
  [/継続する。/g, '継続します。'],
  // 〜確認する。→ 〜確認いたします。
  [/確認する。/g, '確認いたします。'],
  // 〜注意する。→ 〜注意します。
  [/注意する。/g, '注意します。'],
  // 〜できない。→ 〜できません。
  [/できない。/g, 'できません。'],
  // 〜可能性がある。→ 〜可能性があります。
  [/可能性がある。/g, '可能性があります。'],
  // 〜ことがある。/ 〜場合がある。→ 〜ことがあります。/ 〜場合があります。
  [/ことがある。/g, 'ことがあります。'],
  [/場合がある。/g, '場合があります。'],
  // 〜となる。→ 〜となります。
  [/となる。/g, 'となります。'],
  // 〜が重要。→ 〜が重要です。
  [/が重要。/g, 'が重要です。'],
]

// ─────────────────────────────────────────────────────────────
// DENSITY_RULES: 文末圧縮・定型評価語の圧縮（concise 専用）
//
// 【対象】concise（density が高いペルソナ）
//
// 【設計方針: 「記録文」寄りの簡潔体】
//   医療記録（カルテ）に近い文体を目標とする。
//   「箇条書き」「短縮語」ではなく「医療記録文」。
//
// 【3つの許可パターン】
//
//   ① 評価語 + 「がある/があります」→「あり」
//      「低血糖の可能性があります。」→「低血糖の可能性あり。」
//      前半の評価対象（低血糖・必要性・訴え等）は保持される。
//
//   ② 文末の「〜です。」→「。」（体言止め）
//      「血糖コントロール良好です。」→「血糖コントロール良好。」
//      主語・内容はそのまま。「です」のみ除去。
//
//   ③ 動詞の固定列挙（主語が落ちないパターンのみ）
//      「継続します。」→「継続。」は前半（薬剤名）が保持される。
//      「を認めます。」→「を認める。」は「を」が保持され前半欠損なし。
//      「を認めません。」→「を認めず。」はカルテ文体で自然。
//
// 【禁止パターン（過去に実装し削除した理由）】
//
//   × となりました。→ となった。
//     「リベルサス3mg継続投与となりました。」→「となった。」
//     前半の薬剤名・内容がすべて脱落する。削除。
//
//   × になりました。→ になった。（同上理由）
//
//   × しました。→ した。（汎用）
//     「継続投与としました。」→「した。」で内容欠損。
//     「しました」を含む文を網羅的にマッチしてしまうため削除。
//     個別動詞（継続/確認/注意）のみ列挙で対応。
//
//   × ます。→ る。（汎用フォールバック）
//     任意の述語を無差別に変換してしまう。
//     「〜できます。」→「〜できる。」は問題ないが、
//     「〜で受診できます。→ 〜で受診できる。」等の口語化が起きる。
//     個別ルールで賄える範囲に限定し汎用置換は禁止。
//
//   × 認めません。→ 認めず。（「は/を」なし）
//     「は認めません。」→「認めず。」は「は」が落ちる。主語欠損。
//     「を認めません。」→「を認めず。」の形（は/を 保持）のみ許可。
//
//   × できません。→ 不可。
//     「不可」は医療文書では強い意味を持ちすぎる（禁忌・実施不可 等）。
//     文体変換の範囲を超えるため削除。
//
//   × となる。→ 体言止め
//     「セマグルチド皮下注に変更となります。→ となる。」で前半欠損。
//     「となる。」は前半が可変（任意の内容が来る）ため体言止め不可。
//     ただし「となります。→ となる。」（常体化のみ）は残す（前半保持）。
//
// 【ルール追加時の指針】
//   - 変換後に前半（主語・薬剤名・評価対象）が保持されることを確認する
//   - 汎用置換（ます。→ る。 等）は追加禁止
//   - 追加前に具体的なSOAP文で変換結果を手動確認すること
// ─────────────────────────────────────────────────────────────

const DENSITY_RULES: ReplacePair[] = [
  // ── ① 評価語 + 「がある/があります」→「あり」─────────────────────
  // ルール適用順: 具体語（可能性・必要・訴え等）を先に処理し、
  // 残存する汎用「があります。」を後段で捕捉する。
  [/可能性があります。/g, '可能性あり。'],   // 敬体
  [/可能性がある。/g,    '可能性あり。'],   // 常体
  [/必要があります。/g,  '必要あり。'],     // 敬体
  [/必要がある。/g,      '必要あり。'],     // 常体
  [/ことがあります。/g,  'ことあり。'],     // 敬体
  [/ことがある。/g,      'ことあり。'],     // 常体
  [/場合があります。/g,  '場合あり。'],     // 敬体
  [/場合がある。/g,      '場合あり。'],     // 常体
  [/の訴えがあります。/g,'の訴えあり。'],   // 「嘔気の訴えがあります。」→「嘔気の訴えあり。」
  [/の訴えがある。/g,    'の訴えあり。'],   // 常体
  // 上記で捕捉されなかった残存パターンの汎用フォールバック
  // 「〜があります。」の形で前半に意味語があるケースを対象とする
  [/があります。/g, 'あり。'],

  // ── ② 文末「〜です。」→ 体言止め（「。」のみ残す）─────────────────
  // 前半の主語・形容語は保持される。「です」のみ除去。
  // 例: 「血糖コントロール良好です。」→「血糖コントロール良好。」
  //
  // lookbehind で「薬」直前のみガード:
  //   「〜する薬です。」「〜のための薬です。」など、定義文の「薬です。」は変換しない。
  //   「大切です。」「可能です。」等は通常どおり変換する。
  [/(?<!薬)です。/g, '。'],

  // ── ③ 動詞固定列挙（主語・内容が欠損しないパターンのみ）──────────
  // 各動詞を個別に列挙する。汎用置換（ます。→ る。等）は禁止。

  // 「期待できます。」→「期待できる。」
  // 「〜が期待できます。」→「〜が期待できる。」（前半保持）
  // 患者説明文の敬体「できます。」を常体化し、同一P内での文体混在を防ぐ。
  // ※「送れています。」など状態描写の「〜ています。」は対象外（汎用置換禁止）
  [/できます。/g, 'できる。'],

  // 「継続します/する。」→「継続。」
  // 「セマグルチドを継続します。」→「セマグルチドを継続。」前半保持。
  [/継続します。/g, '継続。'],
  [/継続する。/g,   '継続。'],

  // 「確認します/いたします/する。」→「確認。」
  // 「次回来院時に確認します。」→「次回来院時に確認。」前半保持。
  [/確認します。/g,   '確認。'],
  [/確認いたします。/g,'確認。'],
  [/確認する。/g,     '確認。'],

  // 「注意します/する。」→「注意。」
  [/注意します。/g, '注意。'],
  [/注意する。/g,   '注意。'],

  // 「を/は認めます。」→「を/は認める。」（常体化。は/を が保持 = 主語欠損なし）
  [/を認めます。/g, 'を認める。'],
  [/は認めます。/g, 'は認める。'],

  // 「を/は認めません。」→「を/は認めず。」（カルテ文体。は/を 保持 = 主語欠損なし）
  // 「を認めない。」も同様に認めず。に統一する
  [/を認めません。/g, 'を認めず。'],
  [/は認めません。/g, 'は認めず。'],
  [/を認めない。/g,   'を認めず。'],
  [/は認めない。/g,   'は認めず。'],

  // 「と考えます。」→「と考える。」（前半の主語・論拠は保持される）
  [/と考えます。/g, 'と考える。'],

  // 「となります。」→「となる。」
  // 「セマグルチド皮下注に変更となります。」→「変更となる。」
  // 前半（薬剤名）は保持される。「となる。」→ 体言止めは前半欠損リスクがあるため禁止。
  [/となります。/g, 'となる。'],

  // 「〜ご相談ください。」→「〜ご相談を。」
  // 「気になる症状があればご相談ください。」→「気になる症状があればご相談を。」
  // 「〜があればご相談を。」等、前半の条件節は保持される。
  [/ご相談ください。/g, 'ご相談を。'],
]

// ─────────────────────────────────────────────────────────────
// SOFTNESS_RULES: 柔らかい表現（gentle 専用の追加変換）
//
// 【対象】gentle（formality 適用後の文字列にさらに適用する）
//
// 【設計方針】
//   患者・家族への口頭説明や説明文書に近い文体。
//   指示表現を和らげ、寄り添う表現に変換する。
//   formality 後に適用するため、常体→敬体変換済みの文字列が入力になる。
//
// 【ルール追加時の注意】
//   formality 後の敬体文字列を入力として想定すること。
//   常体形（〜する。等）は FORMALITY_RULES で変換済みのため、
//   このルールセットには現れない。
// ─────────────────────────────────────────────────────────────

const SOFTNESS_RULES: ReplacePair[] = [
  // 「ご相談ください。」→「お気軽にご相談ください。」
  // lookbehind で「お気軽に」が既についている場合はスキップ（二重付加防止）
  [/(?<!お気軽に)ご相談ください。/g, 'お気軽にご相談ください。'],
  // 「確認いたします。」→「確認していきます。」（formality 適用後の文字列が入力）
  [/確認いたします。/g, '確認していきます。'],
  // 「注意します。」→「お気をつけください。」
  [/注意します。/g, 'お気をつけください。'],
  // 「受診してください。」→「受診いただくことをおすすめします。」
  [/受診してください。/g, '受診いただくことをおすすめします。'],
]

// ─────────────────────────────────────────────────────────────
// ルールセットを1行に適用するユーティリティ
// ─────────────────────────────────────────────────────────────

function applyRules(line: string, rules: ReplacePair[]): string {
  let result = line
  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern as RegExp, replacement)
  }
  return result
}

// ─────────────────────────────────────────────────────────────
// applyAxes: 軸重みに基づいてルールセットを選択・適用する（コア）
//
// 【処理フロー】
//   density >= THRESHOLD.density
//     → DENSITY_RULES のみ適用（formality / softness は非適用）
//       簡潔モードで敬体化すると「継続。」が「継続します。」→「継続。」と
//       変換が相殺されるため density と formality は排他とする。
//
//   density < THRESHOLD.density
//     → formality / softness ルールを適用
//       formality >= THRESHOLD.formality → FORMALITY_RULES
//       softness  >= THRESHOLD.softness  → SOFTNESS_RULES（formality 後に適用）
//
// 【ルール適用順序の重要性】
//   SOFTNESS_RULES は FORMALITY_RULES の出力（敬体化済み文字列）を
//   入力として想定している。適用順序を変えてはならない。
//
// 【将来の拡張に関するメモ】
//   現在は閾値比較による ON/OFF のみ。
//   段階的適用（weight 値に比例して変換強度を変える）に拡張する場合は
//   この関数内の条件分岐を修正する。
// ─────────────────────────────────────────────────────────────

function applyAxes(line: string, weights: AxisWeights): string {
  let result = line
  if (weights.density >= THRESHOLD.density) {
    // 簡潔モード: 文末圧縮・定型評価語圧縮（formality・softness は非適用）
    result = applyRules(result, DENSITY_RULES)
  } else {
    // 丁寧 / やさしいモード
    if (weights.formality >= THRESHOLD.formality) {
      result = applyRules(result, FORMALITY_RULES)
    }
    if (weights.softness >= THRESHOLD.softness) {
      // SOFTNESS_RULES は formality 適用後の文字列に追加適用する
      result = applyRules(result, SOFTNESS_RULES)
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────
// preservePhrases 保護ユーティリティ
//
// guard.preservePhrases に含まれる語句が変換前の行に存在し、
// 変換後の行で消失または変化した場合、行全体を変換前に差し戻す。
//
// 【設計方針】
//   語句の一部だけを保護するより「行全体を差し戻す」のが安全。
//   false negative（保護漏れ）を排除するため、部分文字列マッチを使用する。
// ─────────────────────────────────────────────────────────────

function applyPreservePhrases(
  original: string,
  transformed: string,
  preservePhrases: string[],
): string {
  const origLines = original.split('\n')
  const transLines = transformed.split('\n')
  return origLines
    .map((origLine, i) => {
      const transLine = transLines[i] ?? origLine
      // 変換前行にpreservePhraseが含まれるなら変換後に同語句が存在するか確認
      for (const phrase of preservePhrases) {
        if (origLine.includes(phrase) && !transLine.includes(phrase)) {
          // 保護語句が変換によって失われた → 元の行に差し戻し
          return origLine
        }
      }
      return transLine
    })
    .join('\n')
}

// ─────────────────────────────────────────────────────────────
// デバッグ: P フィールドへのペルソナタグ付与
//
// enabled=false → [JSON]
// enabled=true, persona=plain    → [JSON]
// enabled=true, persona=concise  → [簡潔]
// enabled=true, persona=polite   → [丁寧]
// enabled=true, persona=gentle   → [やさしい]
// ─────────────────────────────────────────────────────────────

const DEBUG_PERSONA_TAGS = false

const PERSONA_DEBUG_TAG: Record<PersonaId, string> = {
  plain:   '[JSON]',
  concise: '[簡潔]',
  polite:  '[丁寧]',
  gentle:  '[やさしい]',
}

function addDebugPersonaTag(p: string, enabled: boolean, persona: PersonaId): string {
  if (!DEBUG_PERSONA_TAGS) return p
  const tag = enabled ? PERSONA_DEBUG_TAG[persona] : '[JSON]'
  return p ? `${tag}\n${p}` : tag
}

// ─────────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────────

/**
 * 単一テキストにペルソナ変換を適用する。
 *
 * - 行単位で変換する（\n 区切り）
 * - isMedicalRecord() に該当する行はスキップ（closing / 指導記録等）
 * - PERSONA_PROFILES から軸重みを取得して applyAxes() に渡す
 * - 人格ごとの if 分岐なし（軸重みで制御）
 *
 * @param text    変換対象テキスト（S / O / A / P フィールド）
 * @param persona 適用するペルソナ ID
 * @returns       変換済みテキスト（空文字は即返却）
 */
export function applyPersona(text: string, persona: PersonaId): string {
  if (!text) return text
  const weights = PERSONA_PROFILES[persona]
  return transformLines(text, line => applyAxes(line, weights))
}

/**
 * SoapFields 全体にペルソナ変換を適用する。
 *
 * 【適用フィールド】
 *   S / O / A / P すべてに適用する。
 *   P 欄の closing 行は applyPersona 内の isMedicalRecord() で行レベルで除外される。
 *
 * 【呼び出し元の責務】
 *   enabled=false の場合は fields をそのまま返す（参照同一）ため、
 *   呼び出し元で enabled を正しく制御すること。
 *   enabled=true の場合は常に新オブジェクトを返す（参照が変わる）。
 *
 * 【テスト観点】
 *   この関数・applyPersona を変更した場合は以下を必ず確認すること:
 *
 *   (1) 情報欠損がないこと
 *       変換前後で「主語・薬剤名・症状名・数値・評価対象」が保持されること。
 *       例: 「リベルサス3mg継続投与となりました。」は3ペルソナとも変換なし。
 *
 *   (2) 固有名詞が保持されること
 *       薬剤名（リベルサス・セマグルチド等）・数値（HbA1c 6.5% 等）が
 *       変換前後で一致すること。
 *
 *   (3) closing / follow-up 行が変換されないこと
 *       「次回、〜確認。」「〜ことを説明。」「〜について指導。」等が
 *       3ペルソナすべてで変換なし（isMedicalRecord() による除外）。
 *
 * @param fields  変換対象の SOAP フィールド
 * @param enabled ペルソナ ON/OFF
 * @param persona 適用するペルソナ ID
 * @returns       変換済みフィールド（enabled=false なら入力と同一参照）
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

/**
 * PersonaGuard を参照してフィールド単位・行単位の変換制御を行う。
 *
 * applyPersonaToFields の guard 対応版。
 * guard.conciseAllowed / softnessAllowed に基づき AxisWeights を調整し、
 * guard.preservePhrases で保護語句の変換を差し戻す。
 *
 * 【guard フラグの効果】
 *   conciseAllowed = false → density を 0 に強制（density ルール不適用）
 *   softnessAllowed = false → softness を 0 に強制（SOFTNESS_RULES 不適用）
 *   personaSensitive = true かつ density モード → A 欄は density を適用しない
 *     （critical シナリオの A 欄を体言止め変換から保護）
 *   preservePhrases → 変換後に含まれなければ行全体を変換前に差し戻し
 *
 * 【呼び出し元の責務】
 *   enabled=false の場合は fields をそのまま返す（参照同一）。
 *   guard は derivePersonaGuard(scenario, urgentFlag) で生成すること。
 *
 * @param fields   変換対象の SOAP フィールド
 * @param enabled  ペルソナ ON/OFF
 * @param persona  適用するペルソナ ID
 * @param guard    PersonaGuard（derivePersonaGuard で生成）
 */
export function applyPersonaToFieldsWithGuard(
  fields: { S: string; O: string; A: string; P: string },
  enabled: boolean,
  persona: PersonaId,
  guard: import('./personaGuard').PersonaGuard,
): { S: string; O: string; A: string; P: string } {
  if (!enabled) {
    if (!DEBUG_PERSONA_TAGS) return fields
    return { ...fields, P: addDebugPersonaTag(fields.P, false, persona) }
  }

  const baseWeights = PERSONA_PROFILES[persona]

  // guard に基づき軸重みを調整する
  const weights: AxisWeights = {
    ...baseWeights,
    density:  guard.conciseAllowed  ? baseWeights.density  : 0,
    softness: guard.softnessAllowed ? baseWeights.softness : 0,
  }

  // A 欄保護: personaSensitive かつ density モードの場合は A 欄に density を適用しない
  const aWeights: AxisWeights =
    guard.personaSensitive && weights.density >= THRESHOLD.density
      ? { ...weights, density: 0 }
      : weights

  const applyWithGuard = (text: string, w: AxisWeights): string => {
    if (!text) return text
    const transformed = transformLines(text, line => applyAxes(line, w))
    return guard.preservePhrases.length > 0
      ? applyPreservePhrases(text, transformed, guard.preservePhrases)
      : transformed
  }

  const pResult = applyWithGuard(fields.P, weights)
  return {
    S: applyWithGuard(fields.S, weights),
    O: applyWithGuard(fields.O, weights),
    A: applyWithGuard(fields.A, aWeights),
    P: addDebugPersonaTag(pResult, enabled, persona),
  }
}
