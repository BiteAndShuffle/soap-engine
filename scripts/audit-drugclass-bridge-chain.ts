/**
 * audit-drugclass-bridge-chain.ts
 *
 * `drug.drugClass`（bridge Header 由来の薬効クラス identifier）が bridge と canonical JSON で
 * 逐語一致しているか、および bridge 側の宣言値が authoring 規約（UPPER_SNAKE）に合致しているかを
 * 検証する。
 *
 * 対象は `drug.drugClass` のみ。`composition.classKey` / `composition.nodeKey` /
 * `display.drugClassLabel` は別フィールド・別 consumer であり本監査の対象外で、
 * これらとの cross-field equality は一切課さない（`prompts/vNext/PN2-Drug-Header.md`
 * 「drug.drugClass の保持」参照）。
 *
 * ── Invariant（D-9 Owner Decision OD-D9-1 / OD-D9-2 / OD-D9-4。片方向）────────
 *
 *   registered moduleId ごとに:
 *
 *     bridge Header が drug.drugClass を宣言している場合（bridge PRESENT）
 *       → canonical に drug.drugClass が存在しなければならない
 *          （欠落 → DRUGCLASS_MISSING_IN_CANONICAL）
 *       → canonical 値は bridge 値と逐語一致しなければならない
 *          （要素数・順序・表記のいずれかが異なれば DRUGCLASS_VALUE_MISMATCH。
 *            大文字小文字の差も不一致として扱う）
 *       → bridge の各宣言値は UPPER_SNAKE authoring 規約に合致しなければならない
 *          （違反 → DRUGCLASS_AUTHORING_FORMAT_VIOLATION）
 *
 *     bridge が存在し、かつ drugClass について沈黙している場合
 *       → NOT_CHECKED（canonical の有無・値を一切判定しない）
 *
 * **reverse invariant は課さない。** 「bridge が沈黙しているなら canonical も持ってはならない」
 * という判定は本監査に存在しない。requiredness / absence semantics は D-9 の Owner Decision に
 * 含まれておらず（OD-D9-5）、別 Decision として未確定である。
 *
 * ── 配列要素数について ───────────────────────────────────────────────
 *
 * 現行 corpus は全 module が 1 要素だが、**要素数 1 を前提にした判定を行わない**（OD-D9-2）。
 * 比較は配列全体の逐語一致（順序込み）で行う。
 *
 * ── bridge missing / parse failure の区別（OD-D9-4 追加指示）──────────────
 *
 *   A. bridge ファイル自体が存在しない          → CHECK（BRIDGE_NOT_FOUND）
 *      bridge existence contract は D-9 で決めていないため FAIL にしない。
 *   B. bridge は存在し、drugClass key がない    → NOT_CHECKED（issue なし）
 *   C. bridge に drugClass: が存在するが、値ブロックを contract どおり parse できない
 *                                              → FAIL（DRUGCLASS_BRIDGE_PARSE_ERROR）
 *      requiredness の問題ではなく、宣言済み authoring field が機械可読 contract を
 *      満たしていない状態である。silent skip / CHECK 扱いにしない。
 *
 * ── bridge Header grammar（現行 corpus 35/35 で実測済み・均一）─────────────
 *
 *   drug:
 *     drugClass:
 *       - "UPPER_SNAKE_VALUE"
 *
 *   - トップレベル `drug:` は各 bridge に厳密に1回
 *   - `drugClass:` は drug block 内の 2-space indent、値は 4-space indent のダブルクオート文字列
 *   - inline 配列記法（`drugClass: ["X"]`）は corpus に存在せず、contract としても認めない
 *   - この grammar から外れた記述は heuristic で解釈せず FAIL する
 *     （黙って解釈するより、大きな声で失敗する方を優先する）
 *
 * 実行:
 *   npx tsx scripts/audit-drugclass-bridge-chain.ts
 *
 * 正式な監査ルールは prompts/vNext/PN7-Cross-Reference-Audit.md check AK、
 * 保持契約は prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS および
 * prompts/vNext/PN2-Drug-Header.md「drug.drugClass の保持」を参照。
 * 標準実行タイミングは docs/IMPLEMENTATION_CHECKLIST.md を参照。
 *
 * 終了コード: FAIL が1件でもあれば 1、なければ 0（CHECK のみの場合は 0）
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { listModuleIds, printAuditReport, type AuditIssue } from './auditShared'

const MODULES_DIR = path.resolve('./data/modules')
const BRIDGES_DIR = path.resolve('./bridges')

/**
 * bridge authoring 規約（OD-D9-2 / PN2「drug.drugClass の保持」）。
 * canonical 側に独立した normalize 規則は持たせない。canonical は bridge 値の逐語保持であり、
 * 規約違反を canonical 側で修正してはならない（PN2 は PENDING で停止する）。
 */
export const DRUGCLASS_AUTHORING_PATTERN = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/

// ─────────────────────────────────────────────────────────────
// bridge parser
// ─────────────────────────────────────────────────────────────

export type BridgeDrugClassResult =
  | { kind: 'ABSENT' }
  | { kind: 'PRESENT'; values: string[] }
  | { kind: 'PARSE_ERROR'; reason: string }

/**
 * bridge 原文から drug.drugClass を line-oriented に抽出する。
 *
 * 状態遷移:
 *   1. コメント行を除く `drugClass:` 宣言行を全件収集する
 *      - 0件 → ABSENT（B: 沈黙。NOT_CHECKED 相当）
 *      - 2件以上 → PARSE_ERROR（どちらが正本か機械判定できない）
 *   2. 宣言行が drug block 内の 2-space indent ブロック形式であることを検証する
 *      - inline 配列記法・indent 違反・drug block 外の宣言 → PARSE_ERROR
 *   3. 続く 4-space `- "value"` 行を走査する（空行・コメント行は skip、dedent で終端）
 *      - item として認識できないインデント行 → PARSE_ERROR
 *      - item が 0 件 → PARSE_ERROR（宣言だけで値がない）
 *   4. 取得した値配列を PRESENT として返す（値の形式検査は呼び出し側が行う）
 */
export function parseBridgeDrugClass(text: string): BridgeDrugClassResult {
  const lines = text.split('\n')

  const declIdxs: number[] = []
  lines.forEach((l, i) => {
    if (/^\s*#/.test(l)) return // コメント行は宣言として数えない
    if (/^\s*drugClass:/.test(l)) declIdxs.push(i)
  })

  if (declIdxs.length === 0) return { kind: 'ABSENT' }
  if (declIdxs.length > 1) {
    return {
      kind: 'PARSE_ERROR',
      reason: `drugClass 宣言が ${declIdxs.length} 回出現している（行: ${declIdxs.map(i => i + 1).join(', ')}）`,
    }
  }

  const declIdx = declIdxs[0]
  const declLine = lines[declIdx]

  if (!/^ {2}drugClass:[ \t]*$/.test(declLine)) {
    return {
      kind: 'PARSE_ERROR',
      reason:
        `drugClass の宣言行が contract 形式（2-space indent のブロック宣言）ではない: ` +
        `${JSON.stringify(declLine)}（行 ${declIdx + 1}）`,
    }
  }

  // トップレベル `drug:` ブロック内にあることを確認する
  const drugLineIdxs: number[] = []
  lines.forEach((l, i) => {
    if (/^drug:[ \t]*$/.test(l)) drugLineIdxs.push(i)
  })
  if (drugLineIdxs.length !== 1) {
    return {
      kind: 'PARSE_ERROR',
      reason: `トップレベルの \`drug:\` ブロックが ${drugLineIdxs.length} 回出現している（drugClass の所属を機械判定できない）`,
    }
  }
  const drugStart = drugLineIdxs[0]
  let drugEnd = lines.length
  for (let i = drugStart + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.trim() === '') continue
    if (!/^\s/.test(l)) {
      drugEnd = i
      break
    }
  }
  if (declIdx < drugStart || declIdx >= drugEnd) {
    return {
      kind: 'PARSE_ERROR',
      reason: `drugClass 宣言（行 ${declIdx + 1}）がトップレベル \`drug:\` ブロックの外側にある`,
    }
  }

  const values: string[] = []
  for (let i = declIdx + 1; i < drugEnd; i++) {
    const l = lines[i]
    if (l.trim() === '' || /^\s*#/.test(l)) continue // 空行・コメント行は跨ぐ

    const item = l.match(/^ {4}- "([^"]*)"[ \t]*$/)
    if (item) {
      values.push(item[1])
      continue
    }

    const indent = l.match(/^ */)![0].length
    if (indent <= 2) break // sibling key へ dedent = ブロック終端

    return {
      kind: 'PARSE_ERROR',
      reason: `drugClass の値ブロック内に contract 形式（4-space の \`- "値"\`）でない行がある: ${JSON.stringify(l)}（行 ${i + 1}）`,
    }
  }

  if (values.length === 0) {
    return { kind: 'PARSE_ERROR', reason: 'drugClass が宣言されているが、値が1件も存在しない' }
  }

  return { kind: 'PRESENT', values }
}

// ─────────────────────────────────────────────────────────────
// 監査本体
// ─────────────────────────────────────────────────────────────

/**
 * 1 モジュールを監査する。bridgePath / jsonPath を直接受け取ることで、テスト側から任意の
 * fixture パスを注入できるようにする（本番 registry・bridges・canonical を書き換えずに
 * synthetic module を検証するため）。
 */
export function auditModule(moduleId: string, bridgePath: string, jsonPath: string): AuditIssue[] {
  const target = 'drug.drugClass'

  if (!fs.existsSync(jsonPath)) {
    return [{ moduleId, target: '-', code: 'JSON_NOT_FOUND', detail: `canonical JSON が見つからない: ${jsonPath}` }]
  }
  // `.bak` 等は対象外。`bridges/{moduleId}.md` の exact path のみを bridge として扱う。
  // bridge ファイル自体の不在は CHECK（bridge existence contract は D-9 で未決定・OD-D9-4）。
  if (!fs.existsSync(bridgePath)) {
    return [{ moduleId, target: '-', code: 'BRIDGE_NOT_FOUND', detail: `bridge が見つからない: ${bridgePath}` }]
  }

  let mod: unknown
  try {
    mod = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  } catch (e) {
    return [{ moduleId, target: '-', code: 'JSON_PARSE_ERROR', detail: `canonical JSON の parse に失敗: ${String(e)}` }]
  }

  const bridgeResult = parseBridgeDrugClass(fs.readFileSync(bridgePath, 'utf-8'))

  if (bridgeResult.kind === 'PARSE_ERROR') {
    // 宣言済み authoring field が機械可読 contract を満たしていない（C）。
    // silent skip / CHECK 扱いにしない（OD-D9-4）。
    return [{ moduleId, target, code: 'DRUGCLASS_BRIDGE_PARSE_ERROR', detail: bridgeResult.reason }]
  }

  if (bridgeResult.kind === 'ABSENT') {
    // bridge が沈黙している（B）。canonical の有無・値は判定しない。
    // reverse invariant は課さない（OD-D9-5: requiredness は別 Decision）。
    return []
  }

  const issues: AuditIssue[] = []

  // authoring 規約（bridge 側）。parity が成立していても独立に検査する。
  for (const value of bridgeResult.values) {
    if (!DRUGCLASS_AUTHORING_PATTERN.test(value)) {
      issues.push({
        moduleId,
        target,
        code: 'DRUGCLASS_AUTHORING_FORMAT_VIOLATION',
        detail:
          `bridge 宣言値が UPPER_SNAKE authoring 規約 ${DRUGCLASS_AUTHORING_PATTERN} に合致しない: ` +
          `${JSON.stringify(value)}。canonical 側で正規化して解消してはならない（PN2 は PENDING で停止する）`,
      })
    }
  }

  const canonicalDrugClass = (mod as { drug?: { drugClass?: unknown } })?.drug?.drugClass

  if (canonicalDrugClass === undefined) {
    issues.push({
      moduleId,
      target,
      code: 'DRUGCLASS_MISSING_IN_CANONICAL',
      detail: `bridge は ${JSON.stringify(bridgeResult.values)} を宣言しているが、canonical に drug.drugClass が存在しない`,
    })
    return issues
  }

  // 逐語一致（要素数・順序・表記）。配列でない・要素が string でない場合も不一致として扱う。
  const canonicalOk =
    Array.isArray(canonicalDrugClass) &&
    canonicalDrugClass.length === bridgeResult.values.length &&
    canonicalDrugClass.every((v, i) => typeof v === 'string' && v === bridgeResult.values[i])

  if (!canonicalOk) {
    issues.push({
      moduleId,
      target,
      code: 'DRUGCLASS_VALUE_MISMATCH',
      detail: `bridge=${JSON.stringify(bridgeResult.values)} canonical=${JSON.stringify(canonicalDrugClass)}`,
    })
  }

  return issues
}

/**
 * registered module 全件を監査する。moduleIds を省略すると listModuleIds()（= data/modules/index.ts
 * の登録内容。ハードコードされたモジュール一覧や corpus 件数には依存しない）を使用する。
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

/** BRIDGE_NOT_FOUND のみ CHECK。それ以外は FAIL（OD-D9-4）。 */
export function severityOf(code: string): 'FAIL' | 'CHECK' {
  return code === 'BRIDGE_NOT_FOUND' ? 'CHECK' : 'FAIL'
}

// ─────────────────────────────────────────────────────────────
// エントリポイント（テストからの import 時には自動実行しない）
// ─────────────────────────────────────────────────────────────

const isMainModule =
  !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  const moduleIds = listModuleIds()
  const issues = runAudit(moduleIds)
  const exitCode = printAuditReport(
    'drug.drugClass bridge⇔canonical preservation',
    moduleIds.length,
    issues,
    severityOf,
  )
  process.exit(exitCode)
}
