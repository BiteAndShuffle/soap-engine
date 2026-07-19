/**
 * audit-addon-bridge-chain.ts
 *
 * bridge → JSON → getVisibleAddonKeys（AddonPanel の表示ロジック）まで
 * 一貫して ADDON が表示されることを検証する。
 *
 * 従来の bridge⇔JSON diff監査（addonsRef の値一致）だけでは、
 * 「JSON は bridge と一致しているが、runtime のフィルタ条件で
 * AddonPanel から除外されてしまう」というケースを検出できない。
 * このスクリプトは実際に lib/addonFilter.ts の getVisibleAddonKeys()
 * を呼び出し、bridge P_ADDON の宣言がそのまま UI 表示に届くかを確認する。
 *
 * さらに、addon.text の内容そのもの（bridge ⇔ JSON の本文一致）も検証する
 * （E〜H。詳細はファイル末尾のコメント、および正規化ルールは
 * prompts/vNext/PN7-Cross-Reference-Audit.md check U / docs/JSON_STANDARD.md
 * addon.text 薬剤名ルールを参照）。
 *
 * 実行:
 *   npx tsx scripts/audit-addon-bridge-chain.ts
 *
 * 正式な監査ルールは prompts/vNext/PN7-Cross-Reference-Audit.md の check Y / U、
 * 原則は prompts/RULES.md §20 を参照。標準実行タイミングは
 * docs/IMPLEMENTATION_CHECKLIST.md を参照。
 *
 * 検出する不整合:
 *   A. bridge に P_ADDON があるのに JSON の scenario.addonsRef が
 *      存在しない、または内容が一致しない
 *   B. JSON の scenario.addonsRef が存在するのに bridge に
 *      P_ADDON の記載がない（bridge外追加）
 *   C. addonsRef.P が参照する key が addons.items に存在しない
 *      （参照切れ・AddonPanel からは無音で除外される）
 *   D. bridge/JSON が一致していても、getVisibleAddonKeys() の
 *      戻り値が空、または bridge の宣言件数と一致しない
 *      （brandHandlingTags 起因の除外を含む — 全ブランドで確認）
 *   E. addons.items[].text / sectionTexts[targetSection] が、当該モジュール
 *      自身の bridge の対応セクション本文と一致しない（正規化手順は下記参照）
 *   F. text と sectionTexts[targetSection] が相互に不一致
 *   G. text が title と同一（title の流用）
 *   H. targetSection に対応する本文セクションが当該モジュールの bridge から
 *      見つからない（bridge未定義・bridge側の対応セクション欠落）
 *
 * ── E の正規化アルゴリズム（許可されたトークン変換のみ） ──
 * bridge本文（正本・決め打ち表記）→ 許可されたトークン変換 → JSON比較、という
 * 順序で比較する。許可される変換は「JSON の text が {{drug_subject}} を含む場合、
 * その出現位置に対応する bridge 側の1行以内の任意文字列を許可する」の1種類のみ。
 * 実装は、JSON の text を {{drug_subject}} で分割した固定セグメント列を
 * エスケープして正規表現アンカーとし、セグメント間には改行を含まない
 * ワイルドカード（[^\n]+）のみを許可する形で構築する。
 * これにより「トークン位置以外は一切変更不可」という制約を機械的に保証する
 * （語尾変更・句読点変更・要約・語順変更・行の増減は一切正規化しない）。
 * JSON の text に {{drug_subject}} が含まれない場合は、正規化を一切行わず
 * 完全一致のみで判定する。
 *
 * 意図的に機械監査に含めないもの（AI判断＝PN7側の責務として残す）:
 *   - 固定薬剤名が本当に「選択薬剤自身」を指すかどうかの意味判定
 *     （{{drug_subject}} が JSON 側に存在しない場合、このスクリプトは
 *       正規化を行わず素の完全一致のみで判定する。「本来 {{drug_subject}}
 *       化すべきなのに固定表記のまま」というケースは意味判断を要するため
 *       検出しない）
 *   - 他モジュールから複製したという生成過程そのものの断定
 *     （このスクリプトが検出できるのは「bridge本文と一致しない」という
 *       事実のみ。原因が複製か単なる更新漏れかの切り分けは行わない）
 *   - ベースP（S/O/A/P本文）とAddonの責務重複の是非
 *   - 患者安全上必要な反復かどうかの是非
 *
 * 終了コード: 不整合が1件でもあれば 1、なければ 0
 */

import fs from 'fs'
import path from 'path'
import { getVisibleAddonKeys } from '../lib/addonFilter'
import type { ModuleData, Scenario } from '../lib/types'
import { listModuleIds, printAuditReport, type AuditIssue } from './auditShared'

const MODULES_DIR = path.resolve('./data/modules')
const BRIDGES_DIR = path.resolve('./bridges')

const DRUG_SUBJECT_TOKEN = '{{drug_subject}}'

// ─────────────────────────────────────────────────────────────
// bridge から addon id ごとのセクション本文（S_APPEND/A_APPEND/P_APPEND）を抽出
// ─────────────────────────────────────────────────────────────

type SectionKey = 'S' | 'A' | 'P'
type SectionBodies = Partial<Record<SectionKey, string>>

function trimBlankEdges(lines: string[]): string[] {
  const out = [...lines]
  while (out.length && out[0].trim() === '') out.shift()
  while (out.length && out[out.length - 1].trim() === '') out.pop()
  return out
}

function parseBridgeAddonBodies(bridgeText: string): Map<string, SectionBodies> {
  const lines = bridgeText.split('\n')
  const result = new Map<string, SectionBodies>()

  let curId: string | null = null
  let curSection: SectionKey | null = null
  let buf: string[] = []
  let sections: SectionBodies = {}

  const flushSection = () => {
    if (curId && curSection) {
      sections[curSection] = trimBlankEdges(buf.map(l => l.trimEnd())).join('\n')
    }
    buf = []
  }
  const flushAddon = () => {
    flushSection()
    if (curId) result.set(curId, sections)
    sections = {}
    curSection = null
  }

  for (const line of lines) {
    const addonMatch = line.match(/^【ADDON｜.*?id=([a-zA-Z0-9_]+)｜/)
    const anyHeaderMatch = line.match(/^【/) || /^=+[A-Z_]+=+$/.test(line.trim())

    if (addonMatch) {
      flushAddon()
      curId = addonMatch[1]
      continue
    }
    if (anyHeaderMatch) {
      // SCENARIO 等の他ブロック開始、または =======SCENARIOS_END======= 等の
      // ファイル末尾フッターマーカー → 現在の addon コンテキストを終了
      flushAddon()
      curId = null
      continue
    }
    if (curId) {
      const trimmed = line.trim()
      if (trimmed === 'S_APPEND' || trimmed === 'A_APPEND' || trimmed === 'P_APPEND') {
        flushSection()
        curSection = trimmed[0] as SectionKey
        continue
      }
      if (curSection) {
        buf.push(line)
      }
    }
  }
  flushAddon()
  return result
}

// ─────────────────────────────────────────────────────────────
// {{drug_subject}} 許可トークン変換による正規化比較
// ─────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * JSON の text を {{drug_subject}} で分割した固定セグメントをアンカーとし、
 * セグメント間にのみ改行を含まない任意文字列（薬剤名相当）を許可する
 * 正規表現を構築する。トークン以外の位置は一切変更を許可しない。
 */
function buildDrugSubjectPattern(jsonText: string): RegExp {
  const segments = jsonText.split(DRUG_SUBJECT_TOKEN).map(escapeRegExp)
  return new RegExp('^' + segments.join('[^\\n]+') + '$')
}

type TextCompareResult = 'MATCH' | 'MISMATCH' | 'NOT_FOUND'

function compareAddonText(bridgeBody: string | undefined, jsonText: string | undefined): TextCompareResult {
  if (bridgeBody === undefined || jsonText === undefined) return 'NOT_FOUND'
  if (jsonText.includes(DRUG_SUBJECT_TOKEN)) {
    return buildDrugSubjectPattern(jsonText).test(bridgeBody) ? 'MATCH' : 'MISMATCH'
  }
  return bridgeBody === jsonText ? 'MATCH' : 'MISMATCH'
}

// ─────────────────────────────────────────────────────────────
// bridge から scenario id ごとの P_ADDON 一覧を抽出
// ─────────────────────────────────────────────────────────────

function parseBridgeAddonRefs(bridgeText: string): Map<string, string[]> {
  const lines = bridgeText.split('\n')
  const result = new Map<string, string[]>()
  let curId: string | null = null
  let inPAddon = false
  let addons: string[] = []

  const flush = () => {
    if (curId) result.set(curId, addons)
  }

  for (const line of lines) {
    const scenarioMatch = line.match(/【SCENARIO｜.*?id=([a-zA-Z0-9_]+)｜/)
    const addonMatch = line.match(/【ADDON｜.*?id=([a-zA-Z0-9_]+)｜/)

    if (scenarioMatch) {
      flush()
      curId = scenarioMatch[1]
      addons = []
      inPAddon = false
      continue
    }
    if (addonMatch) {
      flush()
      curId = null
      inPAddon = false
      continue
    }
    if (curId) {
      const trimmed = line.trim()
      if (trimmed === 'P_ADDON') {
        inPAddon = true
        continue
      }
      if (/^[A-Z_]+$/.test(trimmed) && trimmed !== 'P_ADDON') {
        inPAddon = false
      }
      if (inPAddon) {
        const m = trimmed.match(/^- ?(addon_[a-zA-Z0-9_]+)/)
        if (m) addons.push(m[1])
      }
    }
  }
  flush()
  return result
}

// ─────────────────────────────────────────────────────────────
// 監査本体
// ─────────────────────────────────────────────────────────────

const issues: AuditIssue[] = []
const moduleIds = listModuleIds()

for (const moduleId of moduleIds) {
  const jsonPath = path.join(MODULES_DIR, `${moduleId}.json`)
  const bridgePath = path.join(BRIDGES_DIR, `${moduleId}.md`)

  if (!fs.existsSync(jsonPath)) {
    issues.push({ moduleId, target: '-', code: 'JSON_NOT_FOUND', detail: jsonPath })
    continue
  }
  if (!fs.existsSync(bridgePath)) {
    // bridge 非管理モジュール（bridge 工程を経ていない）は監査対象外としてスキップ
    continue
  }

  const mod = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ModuleData
  const bridgeText = fs.readFileSync(bridgePath, 'utf-8')
  const bridgeRefs = parseBridgeAddonRefs(bridgeText)

  for (const scenario of mod.scenarios) {
    const bridgeAddons = bridgeRefs.get(scenario.id) ?? []
    const jsonAddons = scenario.addonsRef?.P ?? []

    // A + B: bridge ⇔ JSON 順序一致監査（表示順もデータの一部として扱う）
    if (JSON.stringify(bridgeAddons) !== JSON.stringify(jsonAddons)) {
      issues.push({
        moduleId,
        target: scenario.id,
        code: 'BRIDGE_JSON_ADDONSREF_MISMATCH',
        detail: `bridge=${JSON.stringify(bridgeAddons)} json=${JSON.stringify(jsonAddons)}`,
      })
    }

    // C: addons.items 参照切れ
    for (const key of jsonAddons) {
      if (!(key in (mod.addons?.items ?? {}))) {
        issues.push({
          moduleId,
          target: scenario.id,
          code: 'ADDON_ITEM_NOT_FOUND',
          detail: `key=${key} not in addons.items`,
        })
      }
    }

    // D: bridge に P_ADDON がある場合、実際に getVisibleAddonKeys() で
    //    同じ順序で表示されるか確認する（brandHandlingTags なし = フィルタ未適用の基本ケース）
    //    順序もデータの一部として扱うため、集合一致ではなく配列の直接比較で検証する。
    if (bridgeAddons.length > 0) {
      const visible = getVisibleAddonKeys(mod.addons, scenario as Scenario, undefined)
      if (JSON.stringify(visible) !== JSON.stringify(bridgeAddons)) {
        issues.push({
          moduleId,
          target: scenario.id,
          code: 'ADDON_NOT_VISIBLE_IN_PANEL',
          detail: `bridge宣言=${JSON.stringify(bridgeAddons)} だが getVisibleAddonKeys=${JSON.stringify(visible)}（AddonPanel に届かない、または順序不一致）`,
        })
      }

      // 全ブランドの handlingTags で見た場合にゼロ件になっていないか確認
      // （requiredTags 条件で全ブランドから除外されている addon の検出）
      const brandCatalog = mod.drug?.brandCatalog
      if (brandCatalog) {
        for (const [brandName, brand] of Object.entries(brandCatalog)) {
          const withBrand = getVisibleAddonKeys(mod.addons, scenario as Scenario, brand.handlingTags ?? [])
          if (withBrand.length === 0 && bridgeAddons.length > 0) {
            issues.push({
              moduleId,
              target: scenario.id,
              code: 'ADDON_HIDDEN_FOR_BRAND',
              detail: `brand=${brandName}: handlingTags=${JSON.stringify(brand.handlingTags ?? [])} により全 addon が非表示（bridge宣言=${JSON.stringify(bridgeAddons)}）`,
            })
          }
        }
      }
    }
  }

  // E〜H: addon.text 内容監査（当該モジュール自身の bridge を正本とする）
  const bridgeBodies = parseBridgeAddonBodies(bridgeText)

  for (const [addonKey, item] of Object.entries(mod.addons?.items ?? {})) {
    const targetSection = item.targetSection

    if (targetSection !== 'S' && targetSection !== 'A' && targetSection !== 'P') {
      // 'O' は bridge 側に O_APPEND という文法が存在しないため、
      // 機械的な比較対象を安全に決定できない → 推測せず CHECK
      issues.push({
        moduleId,
        target: addonKey,
        code: 'ADDON_TARGET_SECTION_UNSUPPORTED',
        detail: `targetSection=${targetSection} は bridge の *_APPEND 文法に対応が無く、機械比較の対象を決定できない`,
      })
      continue
    }

    const sections = bridgeBodies.get(item.id)
    // targetSection=P の場合のみ、PN6 の既定フォールバック順（P > A > S）を適用する。
    // これは「どの本文を使うか」という既存の明文化されたルールの機械的反映であり、
    // 内容の推測ではない。S/A を直接ターゲットとする場合はフォールバックしない。
    const bridgeBody =
      targetSection === 'P'
        ? (sections?.P ?? sections?.A ?? sections?.S)
        : sections?.[targetSection]

    if (bridgeBody === undefined) {
      issues.push({
        moduleId,
        target: addonKey,
        code: 'ADDON_NOT_FOUND_IN_BRIDGE',
        detail: `id=${item.id}: 当該モジュールの bridge に対応する本文セクション（targetSection=${targetSection}）が見つからない`,
      })
      continue
    }

    // E: text と bridge本文の一致（{{drug_subject}} のみ許可トークン変換）
    const textResult = compareAddonText(bridgeBody, item.text)
    if (textResult === 'MISMATCH') {
      issues.push({
        moduleId,
        target: addonKey,
        code: 'ADDON_TEXT_BRIDGE_MISMATCH',
        detail: `id=${item.id}: text が bridge本文と一致しない（{{drug_subject}}使用時は許可トークン変換後の比較）`,
      })
    }

    // E': sectionTexts[targetSection] と bridge本文の一致（存在する場合のみ）
    const sectionText = item.sectionTexts?.[targetSection]
    if (sectionText !== undefined) {
      const sectionResult = compareAddonText(bridgeBody, sectionText)
      if (sectionResult === 'MISMATCH') {
        issues.push({
          moduleId,
          target: addonKey,
          code: 'ADDON_TEXT_SECTIONTEXTS_MISMATCH',
          detail: `id=${item.id}: sectionTexts.${targetSection} が bridge本文と一致しない`,
        })
      }

      // F: text と sectionTexts[targetSection] の相互一致
      if (item.text !== sectionText) {
        issues.push({
          moduleId,
          target: addonKey,
          code: 'ADDON_TEXT_SECTIONTEXTS_SELF_MISMATCH',
          detail: `id=${item.id}: text と sectionTexts.${targetSection} が不一致`,
        })
      }
    }

    // G: title の text への流用
    if (item.title !== undefined && item.title === item.text) {
      issues.push({
        moduleId,
        target: addonKey,
        code: 'ADDON_TITLE_TEXT_DUPLICATE',
        detail: `id=${item.id}: text が title と同一（title の流用の疑い）`,
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────
// レポート出力
// ─────────────────────────────────────────────────────────────

function severity(code: string): 'FAIL' | 'CHECK' {
  if (code === 'ADDON_TARGET_SECTION_UNSUPPORTED') return 'CHECK'
  return 'FAIL'
}

const exitCode = printAuditReport('ADDON bridge→JSON→UI chain', moduleIds.length, issues, severity)
process.exit(exitCode)
