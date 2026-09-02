/**
 * audit-menu-group-labels-bridge-chain.ts
 *
 * `display.menuGroupLabels`（bridge Header 由来の左メニュー MenuGroup 表示ラベル
 * override フィールド。lib/types.ts:800 台参照）が bridge と canonical JSON で
 * 一致しているかを検証する。
 *
 * 対象は `display.menuGroupLabels` のみ。`display.adjustmentExpression` は別フィールド・
 * 別 consumer であり本監査の対象外（`scripts/audit-adjustment-expression-bridge-chain.ts` が担当）。
 * 両者に同一の文言を要求する cross-field equality は課さない
 * （prompts/vNext/PN2-Drug-Header.md「display.menuGroupLabels の保持」参照）。
 *
 * Invariant（P-R5 Unit 1〜2b で確定・Unit 3 で machine-enforce）:
 *
 *   registered moduleId ごとに:
 *
 *     bridge Header が display.menuGroupLabels を宣言している場合（bridge PRESENT）
 *       → canonical は display.menuGroupLabels を持たなければならない
 *       → bridge の宣言した key set と canonical の key set は完全一致しなければならない
 *       → 各 key の値は bridge と canonical で完全一致しなければならない
 *       （bridge 宣言が identity/default 値であっても exact preservation は必須。
 *         「値が自明だから省略してよい」という例外は存在しない）
 *
 *     bridge Header が正しく parse でき、かつ menuGroupLabels について沈黙している場合
 *     （bridge ABSENT）
 *       → canonical が menuGroupLabels を持たない場合 → PASS
 *       → canonical が menuGroupLabels を持つ場合、宣言された全エントリが
 *         `value === key`（identity/default。部分的な identity mapping も含む）
 *         であれば → PASS（省略時の runtime fallback と描画結果が完全に一致するため）
 *       → 1件でも `value !== key` のエントリが存在すれば → FAIL
 *         （現時点でこれを承認する生成規則は存在しない。推測で承認・削除・正規化しない）
 *
 * 「完全一致」は生の parsed string 同士の `===` のみ。trim / normalize / 大文字小文字変換 /
 * 日本語正規化 / 言い換え / route・剤形・sibling module からの推測は一切行わない
 * （prompts/vNext/PN2-Drug-Header.md「display.menuGroupLabels の保持」参照）。
 *
 * 設計判断（audit-adjustment-expression-bridge-chain.ts と共通の precedent）:
 *
 *   bridge missing ≠ bridge silent
 *   parse failure   ≠ bridge silent
 *
 *   を必ず区別する。bridge が見つからない場合、parse に失敗した場合は、
 *   「沈黙」として扱わず必ず FAIL にする。`.bak` 等は対象外。
 *   `bridges/{moduleId}.md` の exact path のみが有効な bridge として扱われる。
 *
 * 本監査が AE 監査と異なる点（意図的な差異）:
 *
 *   AE（adjustmentExpression）は bridge 沈黙 → canonical も沈黙必須という
 *   単純な二値の invariant である。
 *
 *   menuGroupLabels は bridge 沈黙時に「省略」と「identity/default override」の
 *   両方が許容される（両者は runtime fallback 上、描画結果が完全に一致するため）。
 *   このため bridge ABSENT の分岐は「canonical も absent であること」ではなく、
 *   「canonical が absent か、あるいは全エントリが identity であること」を検証する。
 *   bridge 沈黙下で canonical が non-identity 値を持つ場合のみ FAIL とする
 *   （UNSOURCED_NON_IDENTITY_MGL — authority 未確認の semantic override）。
 *
 * bridge Header grammar（現行 corpus で実測済み。均一）:
 *
 *   display:
 *     menuGroupLabels:
 *       増量: "..."
 *       減量: "..."
 *
 *   - トップレベル `display:` は各 bridge に厳密に1回
 *   - `menuGroupLabels:` は 2-space indent、子要素は 4-space indent
 *   - 子要素の key は MenuGroup 標準値（増量/減量 等。固定 2 key と限定しない —
 *     lib/types.ts の型は `Record<string, string>` であり将来 key が増える可能性を排除しない）
 *   - 値はダブルクオート文字列のみ
 *   - この grammar に現行 corpus でゆらぎは存在しない。将来 bridge の記法が変化した場合、
 *     本監査は heuristic で解釈せず FAIL する（黙って解釈するより、大きな声で失敗する方を優先する）
 *
 * 実行:
 *   npx tsx scripts/audit-menu-group-labels-bridge-chain.ts
 *
 * 正式な監査ルールは prompts/vNext/PN7-Cross-Reference-Audit.md check AJ、
 * 保持契約は prompts/vNext/PN2-Drug-Header.md「display.menuGroupLabels の保持」を参照。
 * 標準実行タイミングは docs/IMPLEMENTATION_CHECKLIST.md を参照。
 *
 * 終了コード: 不整合が1件でもあれば 1、なければ 0
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { listModuleIds, printAuditReport, type AuditIssue } from './auditShared'

const MODULES_DIR = path.resolve('./data/modules')
const BRIDGES_DIR = path.resolve('./bridges')

// ─────────────────────────────────────────────────────────────
// bridge parser
// ─────────────────────────────────────────────────────────────

export type BridgeMenuGroupLabelsResult =
  | { kind: 'ABSENT' }
  | { kind: 'PRESENT'; mapping: Record<string, string> }
  | { kind: 'PARSE_ERROR'; reason: string }

/**
 * bridge 原文から display.menuGroupLabels を line-oriented に抽出する。
 * `parseBridgeAdjustmentExpression()`（audit-adjustment-expression-bridge-chain.ts）と
 * 同じ状態遷移アルゴリズムを採用する。増量/減量に限らず任意の key を許容する点のみ異なる。
 */
export function parseBridgeMenuGroupLabels(text: string): BridgeMenuGroupLabelsResult {
  const lines = text.split('\n')

  const displayLineIdxs: number[] = []
  lines.forEach((l, i) => {
    if (/^display:[ \t]*$/.test(l)) displayLineIdxs.push(i)
  })
  if (displayLineIdxs.length === 0) {
    return { kind: 'PARSE_ERROR', reason: 'トップレベルの `display:` ブロックが見つからない' }
  }
  if (displayLineIdxs.length > 1) {
    return { kind: 'PARSE_ERROR', reason: `トップレベルの \`display:\` が ${displayLineIdxs.length} 回出現している` }
  }
  const displayStart = displayLineIdxs[0]

  let displayEnd = lines.length
  for (let i = displayStart + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.trim() === '') continue
    if (!/^\s/.test(l)) {
      displayEnd = i
      break
    }
  }
  const block = lines.slice(displayStart + 1, displayEnd)

  const headerIdxs: number[] = []
  block.forEach((l, i) => {
    if (/^ {2}menuGroupLabels:[ \t]*$/.test(l)) headerIdxs.push(i)
  })

  if (headerIdxs.length > 1) {
    return { kind: 'PARSE_ERROR', reason: `menuGroupLabels が display block 内に ${headerIdxs.length} 回出現している` }
  }

  if (headerIdxs.length === 0) {
    const strayMention = block.find(l => /menuGroupLabels/.test(l) && !/^\s*#/.test(l))
    if (strayMention !== undefined) {
      return {
        kind: 'PARSE_ERROR',
        reason: `menuGroupLabels への言及があるが、正規の2-spaceキー宣言として認識できない: ${JSON.stringify(strayMention)}`,
      }
    }
    return { kind: 'ABSENT' }
  }

  const headerIdx = headerIdxs[0]
  const mapping: Record<string, string> = {}
  const order: string[] = []

  for (let i = headerIdx + 1; i < block.length; i++) {
    const l = block[i]
    if (l.trim() === '') continue
    if (/^\s*#/.test(l)) continue
    if (!/^ {4}/.test(l)) break // dedent → menuGroupLabels block 終端

    const m = l.match(/^ {4}([^\s:]+):[ \t]*"([^"]*)"[ \t]*$/)
    if (!m) {
      return { kind: 'PARSE_ERROR', reason: `menuGroupLabels 配下の子行を解釈できない: ${JSON.stringify(l)}` }
    }
    const [, key, value] = m
    if (mapping[key] !== undefined) {
      return { kind: 'PARSE_ERROR', reason: `子キー ${key} が重複している` }
    }
    mapping[key] = value
    order.push(key)
  }

  if (order.length === 0) {
    return { kind: 'PARSE_ERROR', reason: 'menuGroupLabels が宣言されているが、有効な子キーが1件も見つからない' }
  }

  return { kind: 'PRESENT', mapping }
}

// ─────────────────────────────────────────────────────────────
// canonical shape 検証
// ─────────────────────────────────────────────────────────────

type CanonicalShapeResult =
  | { valid: true; mapping: Record<string, string> }
  | { valid: false; reason: string }

function classifyCanonicalMenuGroupLabels(raw: unknown): CanonicalShapeResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, reason: `canonical の menuGroupLabels が object でない: ${JSON.stringify(raw)}` }
  }
  const rec = raw as Record<string, unknown>
  const nonStringEntries = Object.entries(rec).filter(([, v]) => typeof v !== 'string')
  if (nonStringEntries.length > 0) {
    return {
      valid: false,
      reason: `menuGroupLabels に string でない値が存在する: ${nonStringEntries.map(([k]) => k).join(', ')}`,
    }
  }
  return { valid: true, mapping: rec as Record<string, string> }
}

// ─────────────────────────────────────────────────────────────
// 監査本体
// ─────────────────────────────────────────────────────────────

/**
 * 1 モジュールを監査する。bridgePath / jsonPath を直接受け取ることで
 * テスト側から任意の fixture パスを注入できるようにする（本番 registry を書き換えずに
 * synthetic module を検証するため）。
 */
export function auditModule(moduleId: string, bridgePath: string, jsonPath: string): AuditIssue[] {
  const target = 'display.menuGroupLabels'

  if (!fs.existsSync(jsonPath)) {
    return [{ moduleId, target: '-', code: 'JSON_NOT_FOUND', detail: `canonical JSON が見つからない: ${jsonPath}` }]
  }
  // `.bak` 等は対象外。`bridges/{moduleId}.md` の exact path のみが有効な bridge として扱われる。
  // bridges/ を directory-scan することはしない（.bak を誤って bridge と認識しないため）。
  if (!fs.existsSync(bridgePath)) {
    return [{ moduleId, target: '-', code: 'BRIDGE_NOT_FOUND', detail: `bridge が見つからない: ${bridgePath}` }]
  }

  let mod: unknown
  try {
    mod = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  } catch (e) {
    return [{ moduleId, target: '-', code: 'JSON_PARSE_ERROR', detail: `canonical JSON の parse に失敗: ${String(e)}` }]
  }

  const bridgeResult = parseBridgeMenuGroupLabels(fs.readFileSync(bridgePath, 'utf-8'))

  if (bridgeResult.kind === 'PARSE_ERROR') {
    // bridge parse failure は menuGroupLabels absent とは異なる。silent false-negative を防ぐため必ず FAIL。
    return [{ moduleId, target, code: 'BRIDGE_PARSE_ERROR', detail: bridgeResult.reason }]
  }

  const canonicalRaw = (mod as { display?: { menuGroupLabels?: unknown } })?.display?.menuGroupLabels

  // canonical が存在する場合、まず shape を検証する（bridge の状態に関わらず共通）。
  // shape が不正な場合、それ以上の key-set / value 比較は意味を持たないためここで確定させる。
  // 検証を通過した canonical mapping は canonicalMapping に確定させ、以降はこれのみを参照する
  // （TypeScript の型narrowingが関数途中の分岐をまたいで保持されないための明示的な変数分離）。
  let canonicalMapping: Record<string, string> | undefined
  if (canonicalRaw !== undefined) {
    const shape = classifyCanonicalMenuGroupLabels(canonicalRaw)
    if (!shape.valid) {
      return [{ moduleId, target, code: 'CANONICAL_MGL_SHAPE', detail: shape.reason }]
    }
    canonicalMapping = shape.mapping
  }

  if (bridgeResult.kind === 'PRESENT') {
    if (canonicalMapping === undefined) {
      return [{
        moduleId, target, code: 'CANONICAL_MGL_MISSING',
        detail: `bridge は menuGroupLabels を宣言しているが（${JSON.stringify(bridgeResult.mapping)}）、canonical に存在しない`,
      }]
    }

    const bridgeKeys = Object.keys(bridgeResult.mapping).sort()
    const canonicalKeys = Object.keys(canonicalMapping).sort()

    if (JSON.stringify(bridgeKeys) !== JSON.stringify(canonicalKeys)) {
      const missing = bridgeKeys.filter(k => !canonicalKeys.includes(k))
      const extra = canonicalKeys.filter(k => !bridgeKeys.includes(k))
      return [{
        moduleId, target, code: 'MGL_KEYSET_MISMATCH',
        detail: `key set が bridge と一致しない（欠落: [${missing.join(', ')}] / 余剰: [${extra.join(', ')}]）`,
      }]
    }

    const issues: AuditIssue[] = []
    for (const key of bridgeKeys) {
      if (bridgeResult.mapping[key] !== canonicalMapping[key]) {
        issues.push({
          moduleId, target: `${target}.${key}`, code: 'MGL_VALUE_MISMATCH',
          detail: `bridge="${bridgeResult.mapping[key]}" canonical="${canonicalMapping[key]}"`,
        })
      }
    }
    return issues
  }

  // bridgeResult.kind === 'ABSENT'
  if (canonicalMapping === undefined) {
    return [] // MGL-4: bridge ABSENT + canonical ABSENT → PASS
  }

  const isIdentity = Object.entries(canonicalMapping).every(([k, v]) => k === v)
  if (isIdentity) {
    return [] // MGL-5: bridge ABSENT + canonical identity/default（部分的含む）→ PASS
  }

  return [{
    moduleId, target, code: 'UNSOURCED_NON_IDENTITY_MGL',
    detail: `bridge は menuGroupLabels について沈黙しているが、canonical に identity ではない値が存在する: ${JSON.stringify(canonicalMapping)}`,
  }]
}

/**
 * registered module 全件を監査する。moduleIds を省略すると listModuleIds()（= data/modules/index.ts
 * の登録内容。ハードコードされたモジュール一覧やcorpus件数には依存しない）を使用する。
 */
export function runAudit(moduleIds: string[] = listModuleIds()): AuditIssue[] {
  const issues: AuditIssue[] = []
  for (const moduleId of moduleIds) {
    const bridgePath = path.join(BRIDGES_DIR, `${moduleId}.md`)
    const jsonPath = path.join(MODULES_DIR, `${moduleId}.json`)
    issues.push(...auditModule(moduleId, bridgePath, jsonPath))
  }
  return issues
}

// ─────────────────────────────────────────────────────────────
// エントリポイント（テストからの import 時には自動実行しない）
// ─────────────────────────────────────────────────────────────

const isMainModule =
  !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  const moduleIds = listModuleIds()
  const issues = runAudit(moduleIds)
  const exitCode = printAuditReport('display.menuGroupLabels bridge⇔canonical preservation', moduleIds.length, issues)
  process.exit(exitCode)
}
