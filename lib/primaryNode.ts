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
