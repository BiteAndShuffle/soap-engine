/**
 * audit-drug-specific-tags-bridge-chain.ts
 *
 * `drug.drugSpecificTags`（bridge Header 由来の薬剤固有タグ。検索コーパスへ投影される）が
 * bridge と canonical JSON で逐語一致しているかを検証する。
 *
 * 対象は `drug.drugSpecificTags` のみ。`drug.drugClass` / `drug.search.*` / `tagCatalog` の
 * 各 `*Tags` は別フィールド・別 consumer であり本監査の対象外で、これらとの cross-field
 * equality は一切課さない。
 *
 * ── Invariant（D-15c Owner Decision OD-D15c-1 / OD-D15c-2 / OD-D15c-5。片方向）────
 *
 *   registered moduleId ごとに:
 *
 *     bridge Header が drug.drugSpecificTags を宣言している場合（bridge PRESENT）
 *       → canonical に drug.drugSpecificTags が存在しなければならない
 *          （欠落 → DRUG_SPECIFIC_TAGS_MISSING_IN_CANONICAL）
 *       → canonical 配列は bridge 配列と逐語一致しなければならない
 *          （件数・順序・表記のいずれかが異なれば DRUG_SPECIFIC_TAGS_VALUE_MISMATCH。
 *            大文字小文字の差も不一致として扱う）
 *
 *     bridge が存在し、かつ drugSpecificTags について沈黙している場合
 *       → NOT_CHECKED（canonical の有無・値を一切判定しない）
 *
 * **reverse invariant は課さない。** 「bridge が沈黙しているなら canonical も持ってはならない」
 * という判定は本監査に存在しない。requiredness / absence semantics は D-15c の Owner Decision に
 * 含まれておらず（OD-D15c-7）、別 Decision として未確定である。
 *
 * ── 本監査が「判定しないこと」（OD-D15c-3 / OD-D15c-4 / OD-D15c-6）──────────
 *
 *   - **token 語彙の妥当性**: 語彙の SSOT は存在せず、本監査も作らない。corpus 内で他 module に
 *     出現しない孤立 token であっても、bridge が宣言していれば正常とする
 *   - **token の表記形式**: 現行 corpus は 61/61 が lowercase snake_case だが、これは観測値であって
 *     contract ではない。表記形式違反の issue code を持たない
 *   - **重複 token / 空配列**: FAIL にも CHECK にも分類しない。bridge が宣言した値をそのまま
 *     比較対象とする（canonical 側で dedupe・補完してはならない）
 *   - **要素数**: 規定しない（現行 corpus は 1〜11 要素）
 *
 *   すなわち本監査は「bridge が書いたものが canonical にそのまま在るか」だけを見る。
 *   値の良し悪しは判定しない。
 *
 * ── bridge missing / parse failure の区別 ──────────────────────────────
 *
 *   A. bridge ファイル自体が存在しない          → CHECK（BRIDGE_NOT_FOUND）
 *      bridge existence contract は D-15c で決めていないため FAIL にしない。
 *   B. bridge は存在し、drugSpecificTags key がない → NOT_CHECKED（issue なし）
 *   C. bridge に drugSpecificTags: が存在するが、値ブロックを contract 形式で parse できない
 *                                              → FAIL（DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR）
 *      宣言済み authoring field が機械可読 contract を満たしていない状態であり、
 *      silent skip / CHECK 扱いにしない。
 *
 *   `JSON_NOT_FOUND` / `JSON_PARSE_ERROR`（いずれも FAIL）は、既存 bridge-chain audit と共通の
 *   infra behavior であり、D-15c 固有の preservation semantics ではない（OD-D15c §11-A）。
 *
 * ── 空配列の扱い（OD-D15c §11-B。field-specific contract の差）──────────────
 *
 *   `drugSpecificTags:` が宣言され、その直後に list item が 0 件の場合は
 *   **PRESENT + 空配列 `[]`** として扱う（PARSE_ERROR にしない）。
 *     bridge `[]` / canonical `[]`      → PASS
 *     bridge `[]` / canonical non-empty → DRUG_SPECIFIC_TAGS_VALUE_MISMATCH
 *   **`scripts/audit-drugclass-bridge-chain.ts`（値 0 件を PARSE_ERROR とする）とは意図的に
 *   挙動が異なる。** field ごとの contract 差であり、`tests/drugSpecificTagsBridgeParity.test.ts`
 *   が両者の差を固定する。
 *
 * ── bridge Header grammar（現行 corpus 35/35 で実測済み・均一）─────────────
 *
 *   drug:
 *     drugSpecificTags:
 *       - "token"
 *       - "token"
 *
 *   - トップレベル `drug:` は各 bridge に厳密に1回
 *   - `drugSpecificTags:` は drug block 内の 2-space indent、値は 4-space indent の
 *     ダブルクオート文字列
 *   - inline 配列記法（`drugSpecificTags: ["a"]`）は corpus に存在せず、contract としても認めない
 *   - この grammar から外れた記述は heuristic で解釈せず FAIL する
 *
 * 実行:
 *   npx tsx scripts/audit-drug-specific-tags-bridge-chain.ts
 *
 * 正式な監査ルールは prompts/vNext/PN7-Cross-Reference-Audit.md check AL、
 * 保持契約は prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS および
 * prompts/vNext/PN2-Drug-Header.md「drug.drugSpecificTags の保持」を参照。
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

// ─────────────────────────────────────────────────────────────
// bridge parser
// ─────────────────────────────────────────────────────────────

export type BridgeDrugSpecificTagsResult =
  | { kind: 'ABSENT' }
  | { kind: 'PRESENT'; values: string[] }
  | { kind: 'PARSE_ERROR'; reason: string }

/**
 * bridge 原文から drug.drugSpecificTags を line-oriented に抽出する。
 *
 * 状態遷移:
 *   1. コメント行を除く `drugSpecificTags:` 宣言行を全件収集する
 *      - 0件 → ABSENT（沈黙。NOT_CHECKED 相当）
 *      - 2件以上 → PARSE_ERROR（どちらが正本か機械判定できない）
 *   2. 宣言行が drug block 内の 2-space indent ブロック形式であることを検証する
 *      - inline 配列記法・indent 違反・drug block 外の宣言 → PARSE_ERROR
 *   3. 続く 4-space `- "value"` 行を走査する（空行・コメント行は skip、dedent で終端）
 *      - item として認識できないインデント行 → PARSE_ERROR
 *      - item が 0 件 → **空配列として PRESENT を返す**（OD-D15c §11-B）
 *   4. 取得した値配列を PRESENT として返す（語彙・表記・重複の検査は行わない）
 */
export function parseBridgeDrugSpecificTags(text: string): BridgeDrugSpecificTagsResult {
  const lines = text.split('\n')

  const declIdxs: number[] = []
  lines.forEach((l, i) => {
    if (/^\s*#/.test(l)) return // コメント行は宣言として数えない
    if (/^\s*drugSpecificTags:/.test(l)) declIdxs.push(i)
  })

  if (declIdxs.length === 0) return { kind: 'ABSENT' }
  if (declIdxs.length > 1) {
    return {
      kind: 'PARSE_ERROR',
      reason: `drugSpecificTags 宣言が ${declIdxs.length} 回出現している（行: ${declIdxs.map(i => i + 1).join(', ')}）`,
    }
  }

  const declIdx = declIdxs[0]
  const declLine = lines[declIdx]

  if (!/^ {2}drugSpecificTags:[ \t]*$/.test(declLine)) {
    return {
      kind: 'PARSE_ERROR',
      reason:
        `drugSpecificTags の宣言行が contract 形式（2-space indent のブロック宣言）ではない: ` +
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
      reason: `トップレベルの \`drug:\` ブロックが ${drugLineIdxs.length} 回出現している（drugSpecificTags の所属を機械判定できない）`,
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
      reason: `drugSpecificTags 宣言（行 ${declIdx + 1}）がトップレベル \`drug:\` ブロックの外側にある`,
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
      reason: `drugSpecificTags の値ブロック内に contract 形式（4-space の \`- "値"\`）でない行がある: ${JSON.stringify(l)}（行 ${i + 1}）`,
    }
  }

  // item 0 件は空配列として PRESENT を返す（OD-D15c §11-B）。
  // 空配列そのものを FAIL / CHECK にはしない。
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
  const target = 'drug.drugSpecificTags'

  // JSON_NOT_FOUND / JSON_PARSE_ERROR は既存 bridge-chain audit と共通の infra behavior。
  if (!fs.existsSync(jsonPath)) {
    return [{ moduleId, target: '-', code: 'JSON_NOT_FOUND', detail: `canonical JSON が見つからない: ${jsonPath}` }]
  }
  // `.bak` 等は対象外。`bridges/{moduleId}.md` の exact path のみを bridge として扱う。
  // bridge ファイル自体の不在は CHECK（bridge existence contract は D-15c で未決定）。
  if (!fs.existsSync(bridgePath)) {
    return [{ moduleId, target: '-', code: 'BRIDGE_NOT_FOUND', detail: `bridge が見つからない: ${bridgePath}` }]
  }

  let mod: unknown
  try {
    mod = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  } catch (e) {
    return [{ moduleId, target: '-', code: 'JSON_PARSE_ERROR', detail: `canonical JSON の parse に失敗: ${String(e)}` }]
  }

  const bridgeResult = parseBridgeDrugSpecificTags(fs.readFileSync(bridgePath, 'utf-8'))

  if (bridgeResult.kind === 'PARSE_ERROR') {
    // 宣言済み authoring field が機械可読 contract を満たしていない（C）。
    return [{ moduleId, target, code: 'DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR', detail: bridgeResult.reason }]
  }

  if (bridgeResult.kind === 'ABSENT') {
    // bridge が沈黙している（B）。canonical の有無・値は判定しない。
    // reverse invariant は課さない（OD-D15c-7: requiredness は別 Decision）。
    return []
  }

  const canonicalTags = (mod as { drug?: { drugSpecificTags?: unknown } })?.drug?.drugSpecificTags

  if (canonicalTags === undefined) {
    return [{
      moduleId,
      target,
      code: 'DRUG_SPECIFIC_TAGS_MISSING_IN_CANONICAL',
      detail: `bridge は ${JSON.stringify(bridgeResult.values)} を宣言しているが、canonical に drug.drugSpecificTags が存在しない`,
    }]
  }

  // 逐語一致（件数・順序・表記）。配列でない・要素が string でない場合も不一致として扱う。
  // 並べ替え・重複除去・大文字小文字の吸収はいずれも行わない（OD-D15c-2 / OD-D15c-4）。
  const canonicalOk =
    Array.isArray(canonicalTags) &&
    canonicalTags.length === bridgeResult.values.length &&
    canonicalTags.every((v, i) => typeof v === 'string' && v === bridgeResult.values[i])

  if (!canonicalOk) {
    return [{
      moduleId,
      target,
      code: 'DRUG_SPECIFIC_TAGS_VALUE_MISMATCH',
      detail: `bridge=${JSON.stringify(bridgeResult.values)} canonical=${JSON.stringify(canonicalTags)}`,
    }]
  }

  return []
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

/** BRIDGE_NOT_FOUND のみ CHECK。それ以外は FAIL。 */
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
    'drug.drugSpecificTags bridge⇔canonical preservation',
    moduleIds.length,
    issues,
    severityOf,
  )
  process.exit(exitCode)
}
