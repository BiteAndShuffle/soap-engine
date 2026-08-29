/**
 * audit-adjustment-expression-bridge-chain.ts
 *
 * `display.adjustmentExpression`（bridge Header 由来の preservation field。
 * lib/types.ts:820 参照）が bridge と canonical JSON で一致しているかを検証する。
 *
 * 対象は `display.adjustmentExpression` のみ。`display.menuGroupLabels` は別フィールド・
 * 別 consumer であり本監査の対象外（CF-10 として別 Unit の scope）。
 *
 * Invariant F（P-R3D Design Review で確定）:
 *
 *   registered moduleId ごとに:
 *     bridge Header が display.adjustmentExpression を宣言している場合
 *       → canonical は display.adjustmentExpression を持たなければならない
 *       → increasePast は bridge と完全一致しなければならない
 *       → decreasePast は bridge と完全一致しなければならない
 *     bridge Header が正しく parse でき、かつ adjustmentExpression について沈黙している場合
 *       → canonical は display.adjustmentExpression を持ってはならない
 *
 * 「完全一致」は生の parsed string 同士の `===` のみ。trim / normalize / 大文字小文字変換 /
 * 日本語正規化 / 言い換え / route からの推測は一切行わない
 * （prompts/vNext/PN2-Drug-Header.md「display.adjustmentExpression の保持」参照）。
 *
 * 重要な設計判断（既存 audit precedent との意図的な差異）:
 *
 *   scripts/audit-alias-bridge-chain.ts の extractListBlock() は「見つからない」場合に
 *   null を返し、呼び出し側がチェックを skip する。scripts/audit-addon-bridge-chain.ts は
 *   bridge が存在しないモジュールを「bridge 非管理」として監査対象外に skip する。
 *
 *   この2つの precedent は本監査には適用できない。alias 監査は「値が存在すれば一致確認、
 *   存在しなければ何も主張しない」という set-equality 監査だが、本監査における
 *   bridge の沈黙それ自体が「canonical は adjustmentExpression を持ってはならない」という
 *   positive assertion である。したがって:
 *
 *     bridge missing ≠ bridge silent
 *     parse failure   ≠ bridge silent
 *
 *   を必ず区別する。bridge が見つからない場合、parse に失敗した場合は、
 *   「沈黙」として扱わず必ず FAIL にする。これにより
 *   「parse failure → AE absent 扱い → canonical absent → PASS」という
 *   silent false-negative を構造的に防ぐ。
 *
 * bridge Header grammar（現行 corpus 35/35 で実測済み。均一）:
 *
 *   display:
 *     adjustmentExpression:
 *       increasePast: "..."
 *       decreasePast: "..."
 *
 *   - トップレベル `display:` は各 bridge に厳密に1回
 *   - `adjustmentExpression:` は 2-space indent、子要素は 4-space indent
 *   - 子要素は increasePast → decreasePast の順、ダブルクオート文字列のみ
 *   - この grammar に現行 corpus でゆらぎは存在しない（P-R3D Design Review §D実測）。
 *     将来 bridge の記法が変化した場合、本監査は heuristic で解釈せず FAIL する
 *     （黙って解釈するより、大きな声で失敗する方を優先する）。
 *
 * 実行:
 *   npx tsx scripts/audit-adjustment-expression-bridge-chain.ts
 *
 * 正式な監査ルールは prompts/vNext/PN7-Cross-Reference-Audit.md check AI、
 * 保持契約は prompts/vNext/PN2-Drug-Header.md「display.adjustmentExpression の保持」を参照。
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

export type BridgeAdjustmentExpressionResult =
  | { kind: 'ABSENT' }
  | { kind: 'PRESENT'; increasePast: string; decreasePast: string }
  | { kind: 'PARSE_ERROR'; reason: string }

/**
 * bridge 原文から display.adjustmentExpression を line-oriented に抽出する。
 *
 * 状態遷移（P-R3D Design Review 確定アルゴリズム）:
 *   1. トップレベル `display:` 行を検出（厳密に1回であること）
 *   2. display block（次の非インデント非空行まで）を切り出す
 *   3. block 内で `  adjustmentExpression:`（2-space）を検出
 *      - 0回かつ block 内に adjustmentExpression の言及がなければ ABSENT
 *      - 0回だが言及があれば（well-formed でないキー宣言）PARSE_ERROR
 *      - 2回以上なら PARSE_ERROR
 *   4. 子行を走査（4-space indent の `key: "value"` のみ許可、空行・コメント行は skip、
 *      dedent で block 終端）。不明なキー・重複キー・不正な行は PARSE_ERROR
 *   5. increasePast / decreasePast の両方が揃っていなければ PARSE_ERROR（partial object）
 *   6. 両方揃っていれば PRESENT
 */
export function parseBridgeAdjustmentExpression(text: string): BridgeAdjustmentExpressionResult {
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

  const aeHeaderIdxs: number[] = []
  block.forEach((l, i) => {
    if (/^ {2}adjustmentExpression:[ \t]*$/.test(l)) aeHeaderIdxs.push(i)
  })

  if (aeHeaderIdxs.length > 1) {
    return { kind: 'PARSE_ERROR', reason: `adjustmentExpression が display block 内に ${aeHeaderIdxs.length} 回出現している` }
  }

  if (aeHeaderIdxs.length === 0) {
    const strayMention = block.find(l => /adjustmentExpression/.test(l) && !/^\s*#/.test(l))
    if (strayMention !== undefined) {
      return {
        kind: 'PARSE_ERROR',
        reason: `adjustmentExpression への言及があるが、正規の2-spaceキー宣言として認識できない: ${JSON.stringify(strayMention)}`,
      }
    }
    return { kind: 'ABSENT' }
  }

  const headerIdx = aeHeaderIdxs[0]
  const fields: Record<string, string> = {}
  const order: string[] = []

  for (let i = headerIdx + 1; i < block.length; i++) {
    const l = block[i]
    if (l.trim() === '') continue
    if (/^\s*#/.test(l)) continue
    if (!/^ {4}/.test(l)) break // dedent → AE block 終端

    const m = l.match(/^ {4}([A-Za-z0-9_]+):[ \t]*"([^"]*)"[ \t]*$/)
    if (!m) {
      return { kind: 'PARSE_ERROR', reason: `adjustmentExpression 配下の子行を解釈できない: ${JSON.stringify(l)}` }
    }
    const [, key, value] = m
    if (fields[key] !== undefined) {
      return { kind: 'PARSE_ERROR', reason: `子キー ${key} が重複している` }
    }
    fields[key] = value
    order.push(key)
  }

  const unknownKeys = order.filter(k => k !== 'increasePast' && k !== 'decreasePast')
  if (unknownKeys.length > 0) {
    return { kind: 'PARSE_ERROR', reason: `未知の子キー: ${unknownKeys.join(', ')}` }
  }

  if (fields.increasePast === undefined || fields.decreasePast === undefined) {
    return {
      kind: 'PARSE_ERROR',
      reason: `partial object（不完全な adjustmentExpression）: 宣言済みキー=[${order.join(', ') || '(なし)'}]。increasePast と decreasePast の両方が必須`,
    }
  }

  return { kind: 'PRESENT', increasePast: fields.increasePast, decreasePast: fields.decreasePast }
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
  const target = 'display.adjustmentExpression'

  if (!fs.existsSync(jsonPath)) {
    return [{ moduleId, target: '-', code: 'JSON_NOT_FOUND', detail: `canonical JSON が見つからない: ${jsonPath}` }]
  }
  // `.bak` 等は対象外。`bridges/{moduleId}.md` の exact path のみが有効なbridgeとして扱われる。
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

  const bridgeResult = parseBridgeAdjustmentExpression(fs.readFileSync(bridgePath, 'utf-8'))
  const canonicalAE = (mod as { display?: { adjustmentExpression?: unknown } })?.display?.adjustmentExpression

  if (bridgeResult.kind === 'PARSE_ERROR') {
    // bridge parse failure は AE absent とは異なる。silent false-negative を防ぐため必ず FAIL。
    return [{ moduleId, target, code: 'BRIDGE_PARSE_ERROR', detail: bridgeResult.reason }]
  }

  if (bridgeResult.kind === 'ABSENT') {
    // bridge が正しく parse でき、かつ沈黙している = 「canonical も持ってはならない」という
    // positive assertion。null / {} / 不正形も含め、あらゆる materialize は unexpected とする。
    if (canonicalAE !== undefined) {
      return [{
        moduleId, target, code: 'CANONICAL_AE_UNEXPECTED',
        detail: `bridge は adjustmentExpression について沈黙しているが、canonical に値が存在する: ${JSON.stringify(canonicalAE)}`,
      }]
    }
    return []
  }

  // bridgeResult.kind === 'PRESENT'
  if (canonicalAE === undefined) {
    return [{
      moduleId, target, code: 'CANONICAL_AE_MISSING',
      detail: `bridge は increasePast="${bridgeResult.increasePast}" decreasePast="${bridgeResult.decreasePast}" を宣言しているが、canonical に存在しない`,
    }]
  }

  if (typeof canonicalAE !== 'object' || canonicalAE === null || Array.isArray(canonicalAE)) {
    return [{
      moduleId, target, code: 'CANONICAL_AE_SHAPE',
      detail: `canonical の adjustmentExpression が object でない: ${JSON.stringify(canonicalAE)}`,
    }]
  }

  const issues: AuditIssue[] = []
  const canonicalRecord = canonicalAE as Record<string, unknown>
  const extraKeys = Object.keys(canonicalRecord).filter(k => k !== 'increasePast' && k !== 'decreasePast')
  if (extraKeys.length > 0) {
    issues.push({
      moduleId, target, code: 'CANONICAL_AE_SHAPE',
      detail: `canonical の adjustmentExpression に未知のキーが存在する: ${extraKeys.join(', ')}`,
    })
  }
  if (typeof canonicalRecord.increasePast !== 'string' || typeof canonicalRecord.decreasePast !== 'string') {
    issues.push({
      moduleId, target, code: 'CANONICAL_AE_SHAPE',
      detail: `increasePast / decreasePast のいずれかが string でない: ${JSON.stringify(canonicalRecord)}`,
    })
  } else {
    if (canonicalRecord.increasePast !== bridgeResult.increasePast) {
      issues.push({
        moduleId, target: `${target}.increasePast`, code: 'INCREASE_PAST_MISMATCH',
        detail: `bridge="${bridgeResult.increasePast}" canonical="${canonicalRecord.increasePast}"`,
      })
    }
    if (canonicalRecord.decreasePast !== bridgeResult.decreasePast) {
      issues.push({
        moduleId, target: `${target}.decreasePast`, code: 'DECREASE_PAST_MISMATCH',
        detail: `bridge="${bridgeResult.decreasePast}" canonical="${canonicalRecord.decreasePast}"`,
      })
    }
  }

  return issues
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
  const exitCode = printAuditReport('display.adjustmentExpression bridge⇔canonical preservation', moduleIds.length, issues)
  process.exit(exitCode)
}
