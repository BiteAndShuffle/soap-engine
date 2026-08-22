/**
 * primaryNode.ts — primary（1剤目）の state から ComposeNode snapshot を導出する（pure）
 *
 * Rapid Mode v2 / Unit 4A。
 *
 * ## 本ファイルの位置づけ
 *
 * Unit 4A は **helper を追加するだけの準備 Unit** であり、本関数は現時点で
 * production runtime から呼ばれていない（behavior change = 0）。
 * read 経路の接続は Unit 4B、writable primaryNode state 化は Unit 4C で行う。
 *
 * ## なぜ必要か
 *
 * 現在 primary は selectedScenarioId / primaryAddonIds / rapidState / localSiteInput /
 * activeBrandName / activeDrugDisplayName / activeResolution / primaryBaseFields /
 * rawPrimaryFieldsRef / primaryGuardRef 等、global state / ref へ分散して保持されている。
 * 一方 secondary（ComposeNode）は Unit 3A/3B により単一の Node へ集約済みである。
 *
 * 本関数は「primary の state を明示列挙で受け取り、secondary と同一形状の
 * ComposeNode を deterministic に導出する」変換層である。secondary の
 * buildUpdatedNode（DashboardClient.tsx）と同様に、block の中身は
 * deriveNodeBlockCore（Unit 3A）へ委譲し、ロジックを複製しない。
 *
 * ## 責務境界
 *
 * - **persona は適用する。** 本関数は secondary の buildUpdatedNode と同じ
 *   「Node 組み立て層」であり、global persona 設定（引数で受け取る）を
 *   deriveNodeBlockCore の raw 結果へ適用して block.fields を作る。
 *   deriveNodeBlockCore 自体（derive 層）は persona 未適用のままであり、
 *   Persona Scope Boundary（raw → persona の一方向）は変更しない。
 *   返す ComposeNode に persona identity（personaEnabled / selectedPersona 相当）は
 *   一切含めない。
 * - **localInput は含めない。** localSiteInput は ComposeNode の field として
 *   そのまま保持するのみで、derive には使わない。render 時に解決される
 *   既存契約（{{applicationSite}} は finalFields で適用）を変更しない。
 * - **drugLabel / baseDomain は呼び出し側から受け取る。** resolveNodeLabel /
 *   resolveDomain は現在 DashboardClient.tsx の local 関数であり、
 *   resolveNodeLabel はさらに local な NODE_LABEL_MAP に依存する。
 *   Unit 4A はこれらを lib へ移設せず（production 無変更の制約）、
 *   caller-supplied とする。
 */

import type { ModuleData, Scenario, SoapFields, ComposeNode } from './types'
import type { RapidState } from './rapidState'
import type { BrandResolution } from './brandResolution'
import type { PersonaId } from './applyPersona'
import { deriveNodeBlockCore } from './deriveNodeFields'
import { applyPersonaToFieldsWithGuard } from './applyPersona'

/**
 * primary（1剤目）Node の stable identity。
 *
 * primary は「薬剤そのもの」ではなく **「1剤目 slot」** の identity であるため、
 * drug switch / reset / Express のいずれでも別 ID を再生成しない。
 *
 * secondary node の id は `node-${Date.now()}-${random}` 形式であり、
 * 本 constant と衝突しない。composeNodes 配列へ primary を追加することはない
 * （primary は配列外の別 state として扱う。Unit 4 Owner Decision D-2）。
 *
 * 本 ID は React key として使われない: ComposeNodeBar は primary チップを
 * `nodes.map()` の外側で描画し、`onSelectPrimary` / `editingPrimary` を使う。
 * `onSelectNode(node.id)` に primary が渡る経路は存在しないため、
 * `editingNodeId === null` の primary sentinel は影響を受けない。
 */
export const PRIMARY_NODE_ID = 'primary'

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

/**
 * primary Node snapshot の入力。
 * DashboardClient に散在する primary state を明示列挙したもの。
 */
export type PrimaryNodeInput = {
  /** primary の module（現 activeModuleData） */
  mod: ModuleData
  /** 確定済み scenario。未確定（selectedScenarioId === null）なら undefined */
  scenario: Scenario | undefined
  /** 確定 ADDON（現 primaryAddonIds を配列化したもの。順序が本文順序になる） */
  addonIds: string[]
  /** Rapid 選択状態（現 rapidState） */
  rapid: RapidState
  /** {{drug_subject}} 解決値（現 activeDrugDisplayNameRef ?? resolveDrugName(...)） */
  drugName: string
  /** 部位入力（現 localSiteInput） */
  localSiteInput: string
  /** brandCatalog 解決キー（現 activeBrandName） */
  matchedBrandName: string | undefined
  /** 表示用薬剤名（現 activeDrugDisplayName） */
  resolvedDrugName: string | undefined
  /** BrandResolution（現 activeResolution） */
  resolution: BrandResolution | undefined
  /** ノードチップ表示ラベル。呼び出し側が resolveNodeLabel(mod) で解決して渡す */
  drugLabel: string
  /** S欄ドメイン。呼び出し側が resolveDomain(mod) で解決して渡す */
  baseDomain: string
  /** block の id。既存 block を引き継ぐ場合はその id を渡す */
  blockId: string
  /** persona 適用可否（global。現 personaEnabled） */
  personaEnabled: boolean
  /** 適用する persona（global。現 selectedPersona） */
  persona: PersonaId
}

/**
 * primary の state から ComposeNode snapshot を組み立てる（pure）。
 *
 * Rapid Mode v2 / Unit 4A。
 *
 * ## secondary との parity
 * 本関数の block は secondary（buildUpdatedNode / handleAddonToggle node branch）と
 * **同一の deriveNodeBlockCore** を使って導出する。したがって
 * 「同じ (scenario, mod, addonIds, rapid, drugName) なら primary と secondary が
 *   同一の block を得る」ことが構造的に保証される。
 * この parity は tests/primaryNodeParityUnit4A.test.ts が実測で固定する。
 *
 * ## determinism
 * 同一入力に対して常に deepStrictEqual な出力を返し、引数を破壊しない。
 *
 * @returns scenario 未確定（undefined）の場合は pending node 相当
 *          （scenarioId: ''、block は EMPTY 相当、rapid: null）を返す。
 */
export function buildPrimaryNodeSnapshot(input: PrimaryNodeInput): ComposeNode {
  const {
    mod, scenario, addonIds, rapid, drugName, localSiteInput,
    matchedBrandName, resolvedDrugName, resolution,
    drugLabel, baseDomain, blockId, personaEnabled, persona,
  } = input

  // scenario 未確定 = pending node 相当。secondary の handleComposeDrugSelect が
  // 作る pending node（scenarioId: '', block: EMPTY_FIELDS）と同形にする。
  if (!scenario) {
    return {
      id: PRIMARY_NODE_ID,
      moduleId: mod.moduleId,
      scenarioId: '',
      block: { id: blockId, templateLabel: '', fields: EMPTY_FIELDS, closingText: undefined },
      drugLabel,
      selectedAddonIds: [],
      baseLabel: '',
      baseDomain,
      matchedBrandName,
      resolvedDrugName,
      resolution,
      localSiteInput,
      rapid: null,
    }
  }

  // secondary（buildUpdatedNode）と同一の derive を使う。ロジックを複製しない。
  const core = deriveNodeBlockCore(scenario, mod, addonIds, rapid, drugName)
  const fields = personaEnabled
    ? applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard)
    : core.rawFields

  return {
    id: PRIMARY_NODE_ID,
    moduleId: mod.moduleId,
    scenarioId: scenario.globalId,
    block: { id: blockId, ...core, fields, domain: baseDomain },
    drugLabel,
    selectedAddonIds: addonIds,
    baseLabel: scenario.title,
    baseDomain,
    matchedBrandName,
    resolvedDrugName,
    resolution,
    localSiteInput,
    rapid,
  }
}

/**
 * 既存の primary Node へ「scenario / ADDON / Rapid の変化」を適用し、
 * 新しい ComposeNode を返す（pure）。
 *
 * Rapid Mode v2 / Unit 4C。
 *
 * ## buildPrimaryNodeSnapshot との責務分離（Owner Decision D-4C-11）
 *   buildPrimaryNodeSnapshot — creation / projection（state を明示列挙して Node を組み立てる）
 *   rebuildPrimary          — transition / rebuild（既存 Node + delta から次の Node を導く）
 * 両者を 1 関数へ統合しない。本関数は前者へ委譲し、derive を複製しない（RAPID-V2-20）。
 *
 * ## 保持されるもの（lifecycle field。delta では変化しない）
 *   id / block.id / localSiteInput / matchedBrandName / resolvedDrugName / resolution
 *
 * ## 本関数を使ってはならない経路（Unit 4C 事前監査 実測4）
 * scenario 解除（primary の scenarioId → ''）には使わない。
 * buildPrimaryNodeSnapshot の `!scenario` 分岐は **secondary の pending node** を模した
 * 意味論であり、primary の「シナリオ解除」とは
 *   block.clinicalDomain / block.domain / selectedAddonIds / rapid
 * の 4 点で非等価である。解除経路は呼び出し側が明示 reducer で扱うこと。
 * 本関数の scenario 引数を optional にしてはならない（誤用を型で防ぐ）。
 *
 * ## Unit 4C-1 時点では production 未接続である（behavior change = 0）。
 * 接続は Unit 4C-4 の責務であり、Owner 承認を要する。
 */
export type RebuildPrimaryInput = {
  /** 直前の primary Node（lifecycle field の供給元） */
  node: ComposeNode
  /** primary の module */
  mod: ModuleData
  /** 確定済み scenario。undefined を渡してはならない */
  scenario: Scenario
  /** 確定 ADDON。配列順がそのまま本文順序になる */
  addonIds: string[]
  /** Rapid 選択状態 */
  rapid: RapidState
  /** {{drug_subject}} 解決値 */
  drugName: string
  /** ノードチップ表示ラベル。呼び出し側が resolveNodeLabel(mod) で解決して渡す */
  drugLabel: string
  /** S欄ドメイン。呼び出し側が resolveDomain(mod) で解決して渡す */
  baseDomain: string
  /** persona 適用可否（global） */
  personaEnabled: boolean
  /** 適用する persona（global） */
  persona: PersonaId
}

export function rebuildPrimary(input: RebuildPrimaryInput): ComposeNode {
  const {
    node, mod, scenario, addonIds, rapid, drugName,
    drugLabel, baseDomain, personaEnabled, persona,
  } = input
  return buildPrimaryNodeSnapshot({
    mod, scenario, addonIds, rapid, drugName,
    localSiteInput:   node.localSiteInput ?? '',
    matchedBrandName: node.matchedBrandName,
    resolvedDrugName: node.resolvedDrugName,
    resolution:       node.resolution,
    drugLabel, baseDomain,
    blockId:          node.block.id,
    personaEnabled, persona,
  })
}
