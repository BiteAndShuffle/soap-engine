/**
 * auditShared.ts
 *
 * 複数の audit-*.ts スクリプトで共通して使う薄いユーティリティ。
 * 大きな監査フレームワーク化はまだ行わない（将来、独立スクリプトが
 * 3〜4本に増えた時点で scripts/audit/ への再編を検討する）。
 * ここに置くのは「モジュール一覧の取得」「PASS/FAIL/CHECK 出力の書式」
 * という、既に複数スクリプトで重複していた薄い処理のみ。
 */

import fs from 'fs'
import path from 'path'

const MODULES_DIR = path.resolve('./data/modules')

/** index.ts からモジュール一覧を抽出する（自動選定・ハードコード禁止） */
export function listModuleIds(): string[] {
  const indexSrc = fs.readFileSync(path.join(MODULES_DIR, 'index.ts'), 'utf-8')
  const matches = [...indexSrc.matchAll(/from '\.\/([a-zA-Z0-9_]+)\.json'/g)]
  return matches.map(m => m[1])
}

export interface AuditIssue {
  moduleId: string
  /** シナリオID・ブランド名など、issue の対象を識別する文字列（該当なしは '-'） */
  target: string
  code: string
  detail: string
}

/**
 * PASS/FAIL/CHECK の集計結果をコンソールへ出力する。
 * issues が空なら PASS 表示のみで終了コード 0、
 * 1件でもあれば code 別に一覧表示して終了コード hasFailure ? 1 : 0 を返す。
 *
 * @param label     レポートの見出し（例: "ADDON bridge→JSON→UI chain"）
 * @param issues    検出した不整合一覧
 * @param severity  code -> 'FAIL' | 'CHECK' の判定関数。省略時は全件 FAIL 扱い
 */
export function printAuditReport(
  label: string,
  moduleCount: number,
  issues: AuditIssue[],
  severity?: (code: string) => 'FAIL' | 'CHECK',
): number {
  console.log(`\n監査対象モジュール: ${moduleCount}件\n`)

  if (issues.length === 0) {
    console.log(`\x1b[32m\x1b[1m✅ ${label}: 全モジュール PASS\x1b[0m\n`)
    return 0
  }

  const byCode = new Map<string, AuditIssue[]>()
  for (const issue of issues) {
    if (!byCode.has(issue.code)) byCode.set(issue.code, [])
    byCode.get(issue.code)!.push(issue)
  }

  let failCount = 0
  let checkCount = 0
  for (const [code, list] of byCode) {
    const sev = severity ? severity(code) : 'FAIL'
    if (sev === 'FAIL') failCount += list.length
    else checkCount += list.length
    const icon = sev === 'FAIL' ? '❌' : '⚠️ '
    const color = sev === 'FAIL' ? '\x1b[31m' : '\x1b[33m'
    console.log(`${color}\x1b[1m${icon} ${code}（${sev}・${list.length}件）\x1b[0m`)
    for (const issue of list) {
      console.log(`   ${issue.moduleId} / ${issue.target}: ${issue.detail}`)
    }
    console.log('')
  }

  console.log(`\x1b[1m合計 FAIL: ${failCount}件 / CHECK: ${checkCount}件\x1b[0m\n`)
  return failCount > 0 ? 1 : 0
}
