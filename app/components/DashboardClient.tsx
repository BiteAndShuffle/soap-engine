'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock, ComposeNode } from '../../lib/types'
import { TAG_TO_GENERIC_NAME } from '../../lib/types'
import type { BrandResolution } from '../../lib/brandResolution'
import { mergeBlocks } from '../../lib/buildSoap'
import { resolveDrugSubject, resolveDrugName, resolveSubjectFromResolution } from '../../lib/drugSubject'
import { buildSearchIndex, getDrugSuggestions, normalizeText } from '../../lib/search'
import type { DrugSuggestionItem } from '../../lib/search'
import {
  type MenuGroup,
  groupByMenuGroup,
  getMenuGroupFromScenario,
  sortSideEffectScenarios,
  moduleMenuPrefixCandidates,
} from '../../lib/menuGroups'
import { getVisibleAddonKeys } from '../../lib/addonFilter'
import {
  resolveBrandHandlingTags,
  resolveDataAccessBrandKey,
  isSubjectUnresolved as isSubjectUnresolvedFor,
} from '../../lib/brandTags'
import { createSoapFromInput } from '../../lib/createSoapFromInput'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../../lib/applyPersona'
import { applyPlaceholder as applyPlaceholderFn } from '../../lib/applyPlaceholder'
import { derivePersonaGuard } from '../../lib/personaGuard'
import type { ValidationResult } from '../../lib/validationRunner'

import Topbar, { type RouteFilter } from './Topbar'
import Sidebar from './Sidebar'
import { TemplateListPanel } from './SecondaryPanel'
import AddonPanel from './AddonPanel'
import ThirdPanel from './ThirdPanel'
import NlpInputPanel from './NlpInputPanel'
import SoapEditor from './SoapEditor'
import {
  type SRelation,
  type SCondition,
  buildResolvedSFirstSentence,
  replaceSFirstSentence,
} from '../../lib/rapidSentence'
import {
  type RapidState,
  isSameRapid,
  nextRapidStateOnScenarioChange,
} from '../../lib/rapidState'
import { isScenarioSReplacementCapable } from '../../lib/isSReplacementEligible'
import { deriveRawFields, deriveNodeBlockCore } from '../../lib/deriveNodeFields'
import { PRIMARY_NODE_ID, rebuildPrimary } from '../../lib/primaryNode'
import ComposeNodeBar from './ComposeNodeBar'

import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

/**
 * primary projection の block id（Unit 4B）。
 *
 * mergeBlocks は block.id を一切読まない（実測確認済み）。production での
 * block.id の用途は `id: node.block.id` による carry-forward のみであり、
 * React key にも editing にも使われない。したがって固定値で足りる。
 * secondary の block id は `${Date.now()}-${random}` 形式であり衝突しない。
 */
const PRIMARY_BLOCK_ID = 'primary-block'

// ─────────────────────────────────────────────────────────────
// ノードラベルマッピング
// ─────────────────────────────────────────────────────────────

const NODE_LABEL_MAP: Record<string, string> = {
  'GLP-1受容体作動薬': 'GLP1',
  '去痰薬': '去痰',
  '鎮咳薬': '鎮咳',
  '抗菌薬': '抗生剤',
}

function resolveNodeLabel(mod: ModuleData): string {
  if (mod.composition?.nodeLabelShort) return mod.composition.nodeLabelShort
  if (mod.composition?.nodeLabel) return mod.composition.nodeLabel
  const cat1 = mod.categoryPath?.[1]
  if (cat1 && NODE_LABEL_MAP[cat1]) return NODE_LABEL_MAP[cat1]
  return mod.drug?.brandNames?.[0] ?? mod.moduleId
}

// ─────────────────────────────────────────────────────────────
// UI モード
// ─────────────────────────────────────────────────────────────

type UiMode = 'manual' | 'nlp'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface DashboardClientProps {
  moduleData: ModuleData
  allModules: ModuleData[]
}

// ─────────────────────────────────────────────────────────────
// ユーティリティ: 1剤目シナリオ + followup から primaryBaseFields を計算
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// ユーティリティ: followup closing テキストを解決
// ─────────────────────────────────────────────────────────────

function resolveClosingText(
  scenario: { followupRef?: string; followup?: Record<string, unknown> },
  defaults?: ModuleData['defaults'],
): string | undefined {
  if (scenario.followupRef) {
    return (defaults?.followupProfiles?.[scenario.followupRef] as Record<string, string> | undefined)?.P
  }
  const val = (scenario.followup as Record<string, string> | undefined)?.P
  if (val === 'default') {
    return (defaults?.followup as Record<string, string> | undefined)?.P
  }
  return undefined
}

// ─────────────────────────────────────────────────────────────
// displayFields を計算するピュア関数
//
// Source of truth:
//   primaryBaseFields  — 1剤目の確定 SOAP（addon 込み）
//   composeNodes       — 2剤目以降ノード（block.fields + scenarioId）
//
// 確定済みノード（scenarioId 非空）のみ mergeBlocks に渡す。
// pending ノード（scenarioId 空）は無視され、1剤目だけが表示される。
// ─────────────────────────────────────────────────────────────

function computeDisplayFields(
  primaryNode: ComposeNode,
  composeNodes: ComposeNode[],
): SoapFields {
  const confirmedNodes = composeNodes.filter(n => n.scenarioId !== '' && n.scenarioId != null)
  if (confirmedNodes.length === 0) return { ...primaryNode.block.fields }
  return mergeBlocks(
    confirmedNodes.map(n => n.block),
    primaryNode.block.fields,
    primaryNode.block.templateLabel,
    primaryNode.block.closingText,
    undefined,           // currentDomain（旧引数: 未使用のまま維持）
    primaryNode.block.groupKey,
    primaryNode.block.clinicalDomain,
  )
}

// ─────────────────────────────────────────────────────────────
// ユーティリティ: domain 解決（ノードブロック用）
// ─────────────────────────────────────────────────────────────

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}

/**
 * primary Node の初期値（Unit 4C-2）。
 *
 * 起点 HEAD の primaryNodeProjection が「薬剤未選択・シナリオ未確定」の
 * 状態で返していた値と等価であること（T-4C2-4 が実測固定）。
 * clinicalDomain / domain は scenario ではなく module 由来のため、
 * scenario 未確定でも設定される（projection と同一。
 * lib/primaryNode.ts の pending 分岐用 helper とは非等価な点に注意）。
 */
function makeInitialPrimaryNode(mod: ModuleData): ComposeNode {
  return {
    id: PRIMARY_NODE_ID,
    moduleId: mod.moduleId,
    scenarioId: '',
    block: {
      id: PRIMARY_BLOCK_ID,
      templateLabel: '',
      fields: EMPTY_FIELDS,
      closingText: undefined,
      closingBehavior: undefined,
      groupKey: undefined,
      clinicalDomain: mod.composition?.clinicalDomain,
      symptomCodes: undefined,
      domain: resolveDomain(mod),
      rawFields: EMPTY_FIELDS,
      guard: undefined,          // Owner Decision D-4C-5: 未設定は undefined（null を使わない）
    },
    drugLabel: resolveNodeLabel(mod),
    selectedAddonIds: [],
    baseLabel: '',
    baseDomain: resolveDomain(mod),
    matchedBrandName: undefined,
    resolvedDrugName: undefined,
    resolution: undefined,
    localSiteInput: '',
    rapid: null,
  }
}

// ─────────────────────────────────────────────────────────────
// DashboardClient
//
// State design — source of truth は2つだけ:
//   primaryBaseFields  : 1剤目の確定 SOAP（addon 込み）
//   composeNodes       : 2剤目以降ノードのリスト
//
// activeContext で「今どちらを操作しているか」を決める:
//   editingNodeId !== null  → そのノードを操作
//   null                    → 1剤目を操作
//
// displayFields は上記 2 つから毎回 pure に計算（derived）。
// manualFields は存在しない。
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ moduleData, allModules }: DashboardClientProps) {
  // ── 検索インデックス ────────────────────────────────────────
  const searchIndex = useMemo(
    () => allModules.flatMap(m => buildSearchIndex(m)),
    [allModules],
  )

  // ══════════════════════════════════════════════════════════════
  // SOURCE OF TRUTH — primary（1剤目）
  //
  // Unit 4C: primary の semantic state は本 state が単独で所有する。
  // 旧 global state は write authority を持たない。pure direct alias
  // （activeBrandName 等）は Unit 4C-6 で削除済み（primaryNode.<field> の直参照へ移管）。
  // ══════════════════════════════════════════════════════════════
  const [primaryNode, setPrimaryNode] = useState<ComposeNode>(() => makeInitialPrimaryNode(moduleData))

  // ── semantic derived value（write authority を持たない）──
  // 単純な読み替えではなく module 解決 / 正規化 / memo identity を伴うため、
  // Unit 4C-6 では削除せず恒久的に残す（Owner Decision D-4C6-1）。
  const activeModuleData = useMemo(
    () => allModules.find(m => m.moduleId === primaryNode.moduleId) ?? moduleData,
    [allModules, moduleData, primaryNode.moduleId],
  )
  const localSiteInput        = primaryNode.localSiteInput ?? ''
  // Unit 4C-3: selection slice（scenarioId / selectedAddonIds / rapid）の derived alias。
  const selectedScenarioId = primaryNode.scenarioId === '' ? null : primaryNode.scenarioId
  const primaryAddonIds    = useMemo(
    () => new Set(primaryNode.selectedAddonIds),
    [primaryNode.selectedAddonIds],
  )

  // ── 薬剤モジュール ─────────────────────────────────────────
  const [drugSelected, setDrugSelected] = useState(false)

  // ── 検索テキスト ─────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [composeSearch, setComposeSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')

  // ── UI モード ──────────────────────────────────────────────
  const [uiMode, setUiMode] = useState<UiMode>('manual')
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null)

  // ── NLP 状態 ────────────────────────────────────────────────
  const [nlpValidation, setNlpValidation] = useState<ValidationResult | null>(null)
  const [nlpSelectorReason, setNlpSelectorReason] = useState('')
  const [nlpConfidence, setNlpConfidence] = useState(0)
  const [nlpIsGenerating, setNlpIsGenerating] = useState(false)

  // ── Rapid state（RAPID-V2-03）──────────────────────────────
  // null = Rapid 未選択。`{ continued_do, stable }` とは別状態である。
  // Unit 1 以前は sRelation / sCondition の 2 state で表現していたが、
  // 初期値が continued_do / stable だったため未選択と区別できなかった。
  // Unit 4C-3: state 実体は primaryNode.rapid へ移管。
  // Unit 4C-6: consumer は primaryNode.rapid を直参照する（旧 rapidState alias は削除済み）。

  // ── localSiteInput: display.localInput 対応モジュール用・部位入力 ──
  // 1剤目（primaryBaseFields）に紐づく部位入力値。
  // 2剤目以降（ComposeNode）は node.localSiteInput に個別保持する。
  // 現在の編集コンテキストに応じて activeLocalSiteInput を使う（下記参照）。
  // Unit 4C-2: state 実体は primaryNode.localSiteInput へ移管。localSiteInput は
  // derived const alias（後述）。

  // ── ペルソナ（文体切替）: 表示変換のみ、医療ロジック不変 ──
  // デフォルトは無変換（JSONそのまま）。ペルソナ切替ボタンで有効化できる。
  const [personaEnabled, setPersonaEnabled] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('concise')
  const [personaModalOpen, setPersonaModalOpen] = useState(false)

  // ══════════════════════════════════════════════════════════════
  // SOURCE OF TRUTH
  // ══════════════════════════════════════════════════════════════

  // 1剤目シナリオ ID（1剤目専用。ノード操作では絶対に書き換えない）
  // Unit 4C-3: state 実体は primaryNode.scenarioId へ移管。selectedScenarioId は
  // derived const alias（後述）。

  // 1剤目の確定 SOAP（addon 込み。ノード操作では絶対に書き換えない）
  // Unit 4C-4: state 実体は primaryNode.block.fields へ移管。
  // Unit 4C-6: consumer は primaryNode.block.fields を直参照する（旧 primaryBaseFields alias は削除済み）。

  // 1剤目の addon 選択状態（ノード操作では書き換えない）
  // Unit 4C-3: state 実体は primaryNode.selectedAddonIds へ移管。primaryAddonIds は
  // derived const alias（後述）。

  // 2剤目以降ノードのリスト（scenarioId / block / selectedAddonIds を持つ）
  const [composeNodes, setComposeNodes] = useState<ComposeNode[]>([])

  // 1剤目再編集モード（true のとき 1剤目のグループ・シナリオを再選択中）
  const [editingPrimary, setEditingPrimary] = useState(false)

  // 現在編集中ノードID（null = 1剤目操作中）
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // pending ノード（薬剤追加済み・シナリオ未確定）の ID セット
  const [pendingNodeIds, setPendingNodeIds] = useState<Set<string>>(new Set())

  // UI 側の addon 選択表示（activeContext が切り替わると差し替える）
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  // ユーザー手入力状態（null = 未編集。シナリオ変更でリセットされる）
  // 生成ロジック（primaryBaseFields / composeNodes）とは完全に分離する。
  // editedSOAP が非null = 編集中（finalFields = editedSOAP を使用）。
  // editedSOAP が null   = 未編集（finalFields = displayFields を使用）。
  const [editedSOAP, setEditedSOAP] = useState<SoapFields | null>(null)

  // 手動編集中に再合成系操作を行うときの確認ダイアログ用。
  // pendingActionRef: 実行予定の操作を ref で保持（stale closure / バッチ更新の影響を受けない）。
  // discardDialogOpen: ダイアログの表示制御のみに使う state（ref と必ず対にして操作する）。
  const pendingActionRef = useRef<(() => void) | null>(null)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

  // ══════════════════════════════════════════════════════════════
  // REFS（stale closure 防止。callbacks 内で最新値を参照する）
  // ══════════════════════════════════════════════════════════════

  // Unit 4C: primary Node の read-only mirror。
  // handler が updater の外で primary の現在値を読むために使う
  // （updater 内から別 setter を呼ばないため。§Q1/Q2）。
  // 本 ref へ handler から代入してはならない（render 同期のみ）。
  const primaryNodeRef        = useRef<ComposeNode>(makeInitialPrimaryNode(moduleData))
  const primaryAddonIdsRef    = useRef<Set<string>>(new Set())
  const selectedAddonIdsRef   = useRef<Set<string>>(new Set())
  const editingNodeIdRef      = useRef<string | null>(null)
  const editingPrimaryRef     = useRef(false)
  const composeNodesRef       = useRef<ComposeNode[]>([])
  const primaryScenarioRef    = useRef<ModuleData['scenarios'][number] | undefined>(undefined)
  // Unit 4C-4: rawPrimaryFieldsRef / primaryGuardRef は廃止。
  // persona 再計算用の rawFields / guard は primaryNode.block.rawFields / .guard が単独で持つ。
  // useEffect / useCallback 内で stale closure を踏まずに persona 状態を参照するための ref
  const personaEnabledRef     = useRef(false)
  const selectedPersonaRef    = useRef<PersonaId>('polite')
  // NLP モード中は selectedScenarioId 変化による useEffect の上書きをスキップするための ref
  const uiModeRef             = useRef<UiMode>('manual')
  // NLP生成モード専用 ref（将来機能・現在 UI 未接続）。
  // NLP生成が SOAP を出力したとき、その最終テキストを immutable な原本として保持する。
  // 通常の Rapid（右パネル S先頭文/フラグ/ADDON ボタン）では一切使用せず、常に null のまま。
  // ※ 「Rapid」と名前がついているが、Rapid 操作とは無関係。NLP生成フロー専用。
  // null = NLP原本なし（通常運用では常にこの状態）
  // 非 null = NLP出力が原本（handleNlpGenerate が設定。UI未接続のため現在は到達しない）
  // ユーザーが手動で別シナリオを明示選択した時点で null にリセットする。
  // → docs/feature-glossary.md「NLP生成」「Rapid」の定義を参照
  const rapidBaseFieldsRef    = useRef<SoapFields | null>(null)
  // handleNlpGenerate が setSelectedScenarioId を呼ぶ際に useEffect([selectedScenarioId]) で
  // 通常シナリオ再構築・rapidBaseFieldsRef リセットが走るのを防ぐためのフラグ。
  // handleNlpGenerate 内で true にし、useEffect が一度スキップしたら false に戻す。
  const scenarioIdFromNlpRef  = useRef(false)
  // handleSwitchToManual がスナップショットを復元した際に setSelectedScenarioId を呼ぶが、
  // その useEffect([selectedScenarioId]) でスナップショット復元済みの状態を上書きしないよう
  // 一度だけ useEffect 全体をスキップするためのフラグ。
  const restoringFromSnapshotRef = useRef(false)
  // 1剤目 SOAP 再構築時に {{drug_subject}} で使う表示名（GE名 / 先発名）。
  // useEffect([selectedScenarioId]) の deps に含めず ref で参照することで stale closure を防ぐ。
  const activeDrugDisplayNameRef = useRef<string | undefined>(undefined)
  // Unit 4C-3: rapidStateRef は廃止。読み出しはすべて primaryNodeRef.current.rapid へ置換した。
  // NLP生成モード専用 ref（将来機能・現在 UI 未接続）。
  // NLP生成モード（handleSwitchToNlp）に入る直前の manual 状態スナップショット。
  // handleSwitchToManual でこれをそのまま復元する（buildNodeFields は呼ばない）。
  // 通常の Rapid（右パネル S先頭文/ADDON ボタン）では一切使用しない。
  // handleSwitchToNlp は現在どの UI ボタンにも接続されていないため、常に null のまま。
  // null = スナップショットなし（現在 UI 未接続のため常にこの状態）。
  // → docs/feature-glossary.md「NLP生成」の定義を参照
  type ManualSnapshot = {
    primaryBlock:       Pick<MergedBlock, 'fields' | 'rawFields' | 'guard'>   // Unit 4C-4 で統合
    primarySelection:   Pick<ComposeNode, 'scenarioId' | 'selectedAddonIds' | 'rapid'>  // Unit 4C-3 で統合
    selectedGroup:      MenuGroup | null
    selectedAddonIds:   Set<string>
  }
  const manualSnapshotRef = useRef<ManualSnapshot | null>(null)
  // ユーザーが明示的に手動でシナリオを選択したときのみ true になるフラグ。
  // useEffect([selectedScenarioId]) 内で rapidBaseFieldsRef.current を null にするのは
  // このフラグが true のときだけに限定し、NLP 生成後の誤クリアを防ぐ。
  const manualScenarioSelectRef = useRef(false)
  // Unit 4C-3: selectedScenarioIdRef は廃止。読み出しは primaryNodeRef.current.scenarioId へ置換した。
  // handleFieldChange で editedSOAP の一致判定に使う（stale closure 防止）
  const displayFieldsRef      = useRef<SoapFields>(EMPTY_FIELDS)
  // 編集開始時点の finalFields スナップショット（一度確定したら次の編集開始まで変化しない）
  // handleFieldChange の primary ブランチで prev===null のときここから初期値を取る。
  // ref なので「updater 実行タイミングのずれ」による displayFields の値変化の影響を受けない。
  const editSnapshotRef       = useRef<SoapFields>(EMPTY_FIELDS)

  // ── 1剤目シナリオ（render ごとに解決） ──────────────────────
  const primaryScenario = useMemo(
    () => activeModuleData.scenarios.find(sc => sc.globalId === selectedScenarioId),
    [activeModuleData.scenarios, selectedScenarioId],
  )

  // ── primaryNode projection（Unit 4B / read-only）────────────────
  //
  // primary の read path を secondary（ComposeNode）と同じ shape へ寄せるための
  // **read-only derived value**。writable SSOT は依然 global primary state であり、
  // 本 projection へ書き込む経路は存在しない（Unit 4C で SSOT を反転する）。
  //
  // block.fields は **primaryBaseFields をそのまま使う**。
  // render 時に (scenario, addonIds, rapid) から再 derive してはならない:
  // scenario 切替時、handleSelectScenario は selectedScenarioId / rapidState のみを
  // 同一 batch で更新し、primaryAddonIds / primaryBaseFields の更新は
  // useEffect([selectedScenarioId]) が行う。したがって effect 前の render では
  // 「新 scenario × 旧 addonIds」という状態が存在し、そこで再 derive すると
  // 現行表示（旧 primaryBaseFields）と乖離する（CHECK-4A-1。全 35 module の
  // scenario ペアで 100% 乖離することを実測済み）。
  //
  // block.rawFields / block.guard は含めない。read path から参照されず
  // （consumer は reapplyPersonaToAllBlocks のみで、これは handler 経路）、
  // 含めると render 中に ref を読む必要が生じるため。
  //
  // Unit 4C-2/4C-3: identity / brand / localInput slice と selection slice
  // （scenarioId / selectedAddonIds / rapid）の authority は primaryNode へ
  // 移管済み。block（templateLabel 以下）/ baseLabel はまだ旧 state
  // （primaryScenario / primaryBaseFields 等）が authority を持つため、
  // hybrid（read-only 合成 view）のまま維持する（単純 alias にしてはならない）。
  // block.rawFields / block.guard は `...primaryNode.block` から入るが、
  // まだ authority を持たない（makeInitialPrimaryNode の EMPTY_FIELDS / undefined のまま）。
  //
  // Unit 4C-5: consumer は computeDisplayFields / finalFields の 2 系統に限定した
  // （旧 8 系統のうち 6 系統は primaryNode と同値の slice しか読んでおらず、
  // primaryNode 直参照へ移管した。値 parity は T-4C5-P1 が固定）。
  // declaration shape（object の key 集合）は Unit 4C-5 では変更しない
  // （responsibility の最小化は read consumer 側の話であり、shape の話ではない）。
  const primaryNodeProjection = useMemo<ComposeNode>(() => ({
    ...primaryNode,                                    // 移管済み slice（scenarioId / selectedAddonIds / rapid 含む）
    baseLabel:        primaryScenario?.title ?? '',    // 未移管（4C-4）
    block: {                                           // 未移管（4C-4）
      ...primaryNode.block,
      templateLabel:   primaryScenario?.title ?? '',
      fields:          primaryNode.block.fields,
      closingText:     primaryScenario ? resolveClosingText(primaryScenario, activeModuleData.defaults) : undefined,
      closingBehavior: primaryScenario?.mergePolicy?.P?.closingBehavior,
      groupKey:        primaryScenario?.mergePolicy?.S?.groupKey,
      clinicalDomain:  activeModuleData.composition?.clinicalDomain,
      symptomCodes:    primaryScenario?.sComposition?.symptomCodes,
      domain:          resolveDomain(activeModuleData),
    },
  }), [primaryNode, primaryScenario, primaryNode.block.fields, activeModuleData])

  // ══════════════════════════════════════════════════════════════
  // ACTIVE CONTEXT（derived）
  //
  // editingNodeId が non-null → そのノードが activeContext
  // null                     → 1剤目が activeContext
  // ══════════════════════════════════════════════════════════════

  const activeNode = useMemo(
    () => editingNodeId !== null
      ? (composeNodes.find(n => n.id === editingNodeId) ?? null)
      : null,
    [editingNodeId, composeNodes],
  )

  // TemplateListPanel ハイライト・ThirdPanel 有効化用
  const currentScenarioId: string | null =
    (activeNode ?? primaryNode).scenarioId || null

  // ══════════════════════════════════════════════════════════════
  // DISPLAY FIELDS（derived: pure function、state は変えない）
  // ══════════════════════════════════════════════════════════════

  const displayFields = useMemo(
    () => computeDisplayFields(primaryNodeProjection, composeNodes),
    [primaryNodeProjection, composeNodes],
  )

  // ── targetModule: activeContext のモジュール ─────────────────
  const targetModule = useMemo<ModuleData>(() => {
    const ctx = activeNode ?? primaryNode
    return allModules.find(m => m.moduleId === ctx.moduleId) ?? activeModuleData
  }, [activeNode, primaryNode, activeModuleData, allModules])

  // ── activeContextResolution: activeContext の BrandResolution ─
  // targetModule と同じ activeContext パターン（ノード編集中はそのノード、
  // それ以外は1剤目）。undefined = 検索サジェスト以外の経路（初期ロード・Express）。
  const activeContextResolution = useMemo<BrandResolution | undefined>(
    () => (activeNode ?? primaryNode).resolution,
    [activeNode, primaryNode],
  )

  // ── U-5 安全 gate: 指示対象が未確定（denotation='module'）か ──
  // denotation のみを見る。subject は読まない（subject の算出方法は U-4b の責務であり、
  // 「生成させてよいか」の判定とは独立した関心事である）。
  // undefined（Express / 初期ロード）・'brand'・'generic' はいずれも false であり、
  // 従来どおり SOAP 生成へ進める。
  const subjectUnresolved = isSubjectUnresolvedFor(activeContextResolution)

  // ── finalFields: ユーザー手入力中は editedSOAP、未編集時は displayFields ──
  // editedSOAP が null のとき = 未編集（scenario生成値をそのまま表示）。
  // editedSOAP が非null のとき = ユーザーが手入力中（編集値を表示）。
  // displayFields（生成ロジック）には一切触れない。
  const baseFields = editedSOAP ?? displayFields

  // ── activeLocalSiteInput: 現在編集中のコンテキストに紐づく部位入力値 ──
  // activeNode !== null → そのノードの localSiteInput（per-node 保持）
  // activeNode === null → グローバルの localSiteInput（1剤目用。Unit 4C-5: primaryNode 直参照）
  const activeLocalSiteInput = (activeNode ?? primaryNode).localSiteInput ?? ''

  // ── finalFields: {{applicationSite}} placeholder 解決 + prefix 適用 ──
  //
  // 設計:
  //   薬剤ごとに異なる部位を指定できるよう、applicationSite は per-node で保持する。
  //   - 1剤目 → localSiteInput（グローバル state）
  //   - 2剤目以降 → composeNode.localSiteInput（ノード固有）
  //
  //   多剤合成時は全ノードに対してそれぞれのモジュール設定・siteInput で解決する。
  //   これにより「軟膏: 右肩 / クリーム: 腹 / ローション: 左肩」が別々に反映される。
  //
  //   共通関数 applyPlaceholderFn（lib/applyPlaceholder.ts）で単剤・多剤を統一処理。
  //
  // applyScenarioIds チェック:
  //   各ノード/プライマリのシナリオIDが applyScenarioIds に含まれない場合はスキップ。
  //
  // applyPrefix（prefix モード）:
  //   現行の insertMode: 'prefix' 互換。activeLocalSiteInput のみ参照。
  //   多剤合成には適用しない（prefix モードは単剤想定）。
  const finalFields = (() => {
    if (editedSOAP !== null) return baseFields

    // ────────────────────────────────────────────────────────
    // ユーティリティ: モジュールの localInput 設定を用いて
    // 指定の siteInput で S テキストを解決する。
    // applyScenarioIds のチェックも行い、対象外なら null を返す。
    // ────────────────────────────────────────────────────────
    const resolveS = (
      s: string,
      siteInput: string,
      mod: ModuleData,
      scenarioLocalId: string | undefined,
    ): string | null => {
      const cfg = mod.display?.localInput
      if (!cfg?.enabled) return null  // localInput 非対応モジュールはスキップ

      const applyIds = cfg.applyScenarioIds
      if (applyIds && applyIds.length > 0) {
        if (!scenarioLocalId || !applyIds.includes(scenarioLocalId)) return null
      }

      const insertMode = cfg.insertMode ?? 'prefix'
      if (insertMode === 'placeholder') {
        return applyPlaceholderFn(s, siteInput, cfg.siteButtonType)
      }

      // prefix モード（旧方式）: siteInput が空なら適用しない
      if (!siteInput.trim()) return null
      const subjectMatch = s.match(/^(.+?)(は[、,])(.+)$/)
      if (subjectMatch) {
        const prefix = subjectMatch[1] + subjectMatch[2]
        const rest   = subjectMatch[3]
        const particleMatch = rest.match(/^(.+?)(の|が|は|で|を|へ|と|も)/)
        if (!particleMatch) return null
        return prefix + siteInput.trim() + particleMatch[2] + rest.slice(particleMatch[0].length)
      }
      const particleMatch = s.match(/^(.+?)(の|が|は|で|を|へ|と|も)/)
      if (!particleMatch) return null
      return siteInput.trim() + particleMatch[2] + s.slice(particleMatch[0].length)
    }

    // ────────────────────────────────────────────────────────
    // 1剤目の S を activeLocalSiteInput で解決する
    // ────────────────────────────────────────────────────────
    const primarySLocalId = primaryScenario
      ? activeModuleData.scenarios.find(sc => sc.globalId === primaryScenario.globalId)?.id
      : undefined
    const primaryS = primaryNode.block.fields.S
    const patchedPrimaryS = primaryS
      ? (resolveS(primaryS, localSiteInput, activeModuleData, primarySLocalId) ?? primaryS)
      : primaryS
    const patchedPrimaryFields = { ...primaryNode.block.fields, S: patchedPrimaryS }

    // ────────────────────────────────────────────────────────
    // 全ノードをそれぞれの siteInput で解決する
    // （localSiteInput を持たないモジュールはそのまま通過）
    // ────────────────────────────────────────────────────────
    const hasComposeNodes = composeNodes.some(n => n.scenarioId !== '' && n.scenarioId != null)
    if (!hasComposeNodes) {
      // 単剤
      if (patchedPrimaryS === primaryS) return baseFields  // 変更なしなら baseFields を返す
      return { ...baseFields, S: patchedPrimaryS }
    }

    // 多剤: 全ノードをパッチして computeDisplayFields で再マージ
    const patchedNodes = composeNodes.map(n => {
      const originalS = n.block.fields.S
      if (!originalS) return n
      const nodeMod = allModules.find(m => m.moduleId === n.moduleId) ?? activeModuleData
      const nodeSc = nodeMod.scenarios.find(sc => sc.globalId === n.scenarioId)
      const nodeLocalId = nodeSc?.id
      const nodeSiteInput = n.localSiteInput ?? ''
      const patched = resolveS(originalS, nodeSiteInput, nodeMod, nodeLocalId)
      if (patched === null) return n  // 対象外 or 変更なし
      return { ...n, block: { ...n.block, fields: { ...n.block.fields, S: patched } } }
    })
    return computeDisplayFields(
      { ...primaryNodeProjection, block: { ...primaryNodeProjection.block, fields: patchedPrimaryFields } },
      patchedNodes,
    )
  })()

  // ── Refs を render ごとに同期 ──────────────────────────────
  primaryNodeRef.current       = primaryNode
  primaryAddonIdsRef.current   = primaryAddonIds
  selectedAddonIdsRef.current  = selectedAddonIds
  editingNodeIdRef.current     = editingNodeId
  editingPrimaryRef.current    = editingPrimary
  composeNodesRef.current      = composeNodes
  primaryScenarioRef.current   = primaryScenario
  personaEnabledRef.current    = personaEnabled
  selectedPersonaRef.current   = selectedPersona
  uiModeRef.current                = uiMode
  activeDrugDisplayNameRef.current = primaryNode.resolvedDrugName
  displayFieldsRef.current     = displayFields
  // 未編集状態のときだけスナップショットを追従させる。
  // editedSOAP が非null（編集中）のときは固定したまま更新しない。
  // これにより、mergeBlocks/addon の再計算が editSnapshotRef を汚染しない。
  if (editedSOAP === null) editSnapshotRef.current = displayFields

  // ── addonTargetScenario: activeContext のシナリオ（AddonPanel 用） ─
  const addonTargetScenario = useMemo(() => {
    const ctx = activeNode ?? primaryNode
    if (!ctx.scenarioId) return undefined
    return targetModule.scenarios.find(sc => sc.globalId === ctx.scenarioId)
  }, [activeNode, primaryNode, targetModule])

  // 選択中ブランドの handlingTags を取得してaddonフィルタに渡す。
  // brandCatalog を持たないモジュールは undefined → フィルタスキップ（後方互換）。
  //
  // U-5: 導出は resolution 由来へ移した（lib/brandTags.ts が正本）。
  //   'brand'   → authoritative な brandKey の handlingTags
  //   'generic' → brandKeys 全件の交差集合（代表 brand を選ばない）
  //   'module'  → [] （brand 固有値を解決しない）
  //   undefined → legacy キー（Express / 初期ロード。従来の挙動を維持）
  // 未確定を undefined で表現しないこと。getVisibleAddonKeys は undefined を
  // 「フィルタ非適用」として扱うため、意味が逆転する（lib/addonFilter.ts 参照）。
  const addonBrandHandlingTags = useMemo<string[] | undefined>(() => {
    const brandCatalog = targetModule.drug?.brandCatalog
    if (!brandCatalog) return undefined
    // legacy キー（resolution を持たない経路でのみ使用する）
    // ノード編集中: そのノードの matchedBrandName / 1剤目操作中: primaryNode.matchedBrandName（Unit 4C-5）
    const ctx = activeNode ?? primaryNode
    const legacyBrandKey = ctx.matchedBrandName ?? targetModule.drug?.brandNames?.[0]
    return resolveBrandHandlingTags(activeContextResolution, brandCatalog, legacyBrandKey)
  }, [targetModule, activeNode, primaryNode, activeContextResolution])

  const addonVisibleKeys = useMemo(
    () => getVisibleAddonKeys(targetModule.addons, addonTargetScenario, addonBrandHandlingTags),
    [targetModule.addons, addonTargetScenario, addonBrandHandlingTags],
  )

  // ── 左メニュー表示名プレフィックス候補 ───────────────────────
  // 2剤目以降を編集中（activeNode !== null）は targetModule が切り替わるため、
  // activeModuleData（1剤目固定）ではなく targetModule から生成する。
  const menuPrefixCandidates = useMemo(
    () => moduleMenuPrefixCandidates(targetModule),
    [targetModule],
  )

  // ── allGroups / availableGroups / groupScenarios ────────────
  const allGroups = useMemo(
    () => groupByMenuGroup(targetModule.scenarios),
    [targetModule.scenarios],
  )
  const availableGroups = useMemo<Set<MenuGroup>>(() => {
    return new Set(
      allGroups
        .filter(g => g.scenarios.some(sc => {
          const req = sc.scenarioRequiredTags
          if (!req || req.length === 0) return true
          if (!addonBrandHandlingTags) return false
          return req.every(tag => addonBrandHandlingTags.includes(tag))
        }))
        .map(g => g.group)
    )
  }, [allGroups, addonBrandHandlingTags])
  const groupScenarios = useMemo(() => {
    if (!selectedGroup) return []
    // U-5 安全 gate（二重防御）: 指示対象が未確定のときは scenario を提示しない。
    // availableGroups 側でもグループを出さないため通常ここへは到達しないが、
    // selectedGroup が先に確定していた状態から薬剤を切り替えた場合に備える。
    if (subjectUnresolved) return []
    const raw = allGroups.find(g => g.group === selectedGroup)?.scenarios ?? []
    const byGroup = raw.filter(sc => getMenuGroupFromScenario(sc) === selectedGroup)
    // scenarioRequiredTags フィルタ: addonBrandHandlingTags と同じ AND 条件
    const brandFiltered = byGroup.filter(sc => {
      const req = sc.scenarioRequiredTags
      if (!req || req.length === 0) return true
      if (!addonBrandHandlingTags) return false
      return req.every(tag => addonBrandHandlingTags.includes(tag))
    })
    return selectedGroup === '副作用あり' ? sortSideEffectScenarios(brandFiltered) : brandFiltered
  }, [allGroups, selectedGroup, addonBrandHandlingTags, subjectUnresolved])

  // ── アクティブExpressキーセット ─────────────────────────────
  // 追加済みノードの "moduleId__brandName__scenarioId" をキーとして保持。
  // ThirdPanel でボタンのアクティブ状態を表示するために使用する。
  const activeExpressKeys = useMemo<Set<string>>(
    () => new Set(composeNodes.map(n => `${n.moduleId}__${n.matchedBrandName ?? ''}__${n.scenarioId}`)),
    [composeNodes],
  )

  // ── 薬剤サジェスト ───────────────────────────────────────────
  void normalizeText  // tree-shaking 抑止
  const mainDrugSuggestions = useMemo<DrugSuggestionItem[]>(
    () => getDrugSuggestions(mainSearch, searchIndex),
    [mainSearch, searchIndex],
  )
  const composeDrugSuggestions = useMemo<DrugSuggestionItem[]>(
    () => getDrugSuggestions(composeSearch, searchIndex),
    [composeSearch, searchIndex],
  )

  // ── エクスプレス候補 ──
  // expressModes（配列）が存在するモジュールはそちらを優先して展開する。
  // expressModes がないモジュールは従来の expressMode 単数構造にフォールバック。
  // 候補キーは moduleId + defaultBrandName で生成し、モジュール単位での衝突を避ける。
  const expressCandidates = useMemo(
    () => {
      const entries: import('../../app/components/ThirdPanel').ExpressCandidate[] = []
      for (const m of allModules) {
        if (m.expressModes && m.expressModes.length > 0) {
          // expressModes 配列優先
          for (const e of m.expressModes) {
            if (!e.enabled) continue
            // disabled placeholder: 表示情報のみ渡し、シナリオ/ブランド解決はスキップ
            if (e.disabled) {
              entries.push({
                moduleId: m.moduleId,
                category: e.expressCategory,
                subCategory: e.expressGroup,
                expressCategory: e.expressCategory,
                expressGroup: e.expressGroup,
                expressSubGroup: e.expressSubGroup,
                label: e.label,
                genericLabel: e.genericDisplayName,
                defaultScenarioId: '',
                defaultScenarioGlobalId: '',
                defaultBrandName: undefined,
                genericBrandName: undefined,
                sortOrder: e.sortOrder ?? 99,
                disabled: true,
                disabledReason: e.disabledReason,
                scenarioCandidates: undefined,
              })
              continue
            }
            const sc = m.scenarios.find(s => s.id === e.defaultScenarioId)
            // scenarioCandidates: scenario.id → globalId を解決して ExpressCandidate 用配列に変換
            const resolvedScenarioCandidates = e.scenarioCandidates
              ?.map(c => {
                const found = m.scenarios.find(s => s.id === c.scenarioId)
                if (!found) return null
                return { scenarioId: c.scenarioId, globalId: found.globalId, label: c.label }
              })
              .filter((c): c is NonNullable<typeof c> => c !== null)
            // SOAP {{drug_subject}} 用の表示名を brandCatalog から解決する。
            // UI表示名（label / genericDisplayName）は SOAP本文には使用しない。
            const brandCatalog = m.drug?.brandCatalog
            // 先発モード: brandCatalog[defaultBrandName].displayName → defaultBrandName
            const resolvedSoapDisplayName = e.defaultBrandName
              ? (brandCatalog?.[e.defaultBrandName]?.displayName ?? e.defaultBrandName)
              : undefined
            // GEモード: brandCatalog[genericBrandName ?? defaultBrandName].displayGenericName
            //           → brandCatalog[...].displayName → genericBrandName ?? defaultBrandName
            const geKey = e.genericBrandName ?? e.defaultBrandName
            const resolvedGenericSoapDisplayName = geKey
              ? (brandCatalog?.[geKey]?.displayGenericName ?? brandCatalog?.[geKey]?.displayName ?? geKey)
              : undefined
            entries.push({
              moduleId: m.moduleId,
              category: e.expressCategory,
              subCategory: e.expressGroup,
              expressCategory: e.expressCategory,
              expressGroup: e.expressGroup,
              expressSubGroup: e.expressSubGroup,
              label: e.label,
              genericLabel: e.genericDisplayName,
              resolvedSoapDisplayName,
              resolvedGenericSoapDisplayName,
              defaultScenarioId: e.defaultScenarioId ?? '',
              defaultScenarioGlobalId: sc?.globalId ?? '',
              defaultBrandName: e.defaultBrandName,
              genericBrandName: e.genericBrandName,
              sortOrder: e.sortOrder ?? 99,
              scenarioCandidates: resolvedScenarioCandidates && resolvedScenarioCandidates.length > 0
                ? resolvedScenarioCandidates
                : undefined,
            })
          }
        } else if (m.expressMode?.enabled === true) {
          // フォールバック: 旧 expressMode 単数構造
          // brandCatalog から SOAP表示名を解決（旧構造でも同じ原則を適用）
          const brandCatalog = m.drug?.brandCatalog
          const ebn = m.expressMode.defaultBrandName
          const resolvedSoapDisplayName = ebn
            ? (brandCatalog?.[ebn]?.displayName ?? ebn)
            : undefined
          const sc = m.scenarios.find(s => s.id === m.expressMode!.defaultScenarioId)
          entries.push({
            moduleId: m.moduleId,
            category: m.expressMode.category,
            subCategory: m.expressMode.subCategory,
            expressCategory: m.expressMode.category,
            expressGroup: m.expressMode.subCategory ?? m.expressMode.category,
            expressSubGroup: m.expressMode.subCategory ?? '',
            label: m.expressMode.label,
            resolvedSoapDisplayName,
            defaultScenarioId: m.expressMode.defaultScenarioId,
            defaultScenarioGlobalId: sc?.globalId ?? '',
            defaultBrandName: m.expressMode.defaultBrandName,
            sortOrder: m.expressMode.sortOrder ?? 99,
          })
        }
      }
      // ── 重複排除 ──────────────────────────────────────────────
      // 同一カテゴリ/グループ/サブグループ内で表示ラベル（genericLabel ?? label）が
      // 同一のエントリは1件だけ残す。
      //
      // 優先ルール: active（disabled でない）エントリが disabled エントリより優先される。
      // これにより、モジュールのロード順に依らず、
      // 「active なエントリが存在する剤形は選択可能」が保証される。
      //
      // 例: ointment の "クリーム" (disabled) と cream の "クリーム" (active) が混在する場合、
      //     cream の active エントリが残り、ointment の disabled は捨てられる。
      //
      // 実装: key ごとに候補を Map で集め、active エントリがあれば active を優先する。
      const dedupMap = new Map<string, typeof entries[number]>()
      for (const e of entries) {
        const displayLabel = e.genericLabel ?? e.label
        const key = `${e.expressCategory}__${e.expressGroup}__${e.expressSubGroup ?? ''}__${displayLabel}`
        const existing = dedupMap.get(key)
        if (!existing) {
          dedupMap.set(key, e)
        } else if (existing.disabled && !e.disabled) {
          // 既存が disabled で新規が active → active で上書き
          dedupMap.set(key, e)
        }
        // 既存が active / 新規が disabled → 上書きしない（既存維持）
        // 両方 active / 両方 disabled → 先勝ち（上書きしない）
      }
      return [...dedupMap.values()].sort((a, b) => a.sortOrder - b.sortOrder)
    },
    [allModules],
  )

  // ── トップバー表示用ラベル ───────────────────────────────────
  const badge = activeModuleData.categoryPath?.[1]
  // resolvedBrand: 表示ラベル（activeDrugLabel）専用。U-5 では変更しない。
  // 表示は uiLabel 責務であり、brand 固有データアクセスとは別軸で扱う
  // （docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md §6.1）。
  const resolvedBrand = primaryNode.matchedBrandName ?? activeModuleData.drug?.brandNames?.[0]
  // tagBrandKey: brand 固有データアクセス（brandToTags）専用の安全なキー。
  // authoritative な brandKey が無い場合（generic / module）は null になり、
  // brandNames[0] へフォールバックしない（U-5）。表示には使用しない。
  const tagBrandKey = resolveDataAccessBrandKey(primaryNode.resolution, primaryNode.matchedBrandName ?? activeModuleData.drug?.brandNames?.[0])
  const drugResolution = activeModuleData.drugResolution
  const resolvedGenericName = (() => {
    if (tagBrandKey && drugResolution) {
      for (const tag of drugResolution.brandToTags[tagBrandKey] ?? []) {
        if (TAG_TO_GENERIC_NAME[tag]) return TAG_TO_GENERIC_NAME[tag]
      }
    }
    return activeModuleData.drug?.genericName
  })()
  // nodeLabelShort: display.nodeLabelShort → composition.nodeLabelShort の優先順
  const nodeLabelShort =
    activeModuleData.display?.nodeLabelShort ??
    activeModuleData.composition?.nodeLabelShort
  // brandCatalog から表示用一般名を取得
  // displayGenericName が表示用一般名のSSOT（genericName＝正式名称へはフォールバックしない）
  const brandCatalogGenericName = resolvedBrand
    ? activeModuleData.drug?.brandCatalog?.[resolvedBrand]?.displayGenericName
    : undefined
  const activeDrugLabel = (() => {
    const shortLabel = nodeLabelShort
    // 先発名｜一般名｜系統 形式: brandName と displayGenericName が揃っている場合
    if (resolvedBrand) {
      // 一般名: brandCatalog.displayGenericName → activeDrugDisplayName の優先順
      const genericPart = brandCatalogGenericName ?? primaryNode.resolvedDrugName
      if (genericPart && genericPart !== resolvedBrand) {
        return shortLabel
          ? `${resolvedBrand}｜${genericPart}｜${shortLabel}`
          : `${resolvedBrand}｜${genericPart}`
      }
      // 一般名なし（例: GLP-1 等、brandCatalog.displayGenericName が未設定）
      return shortLabel
        ? `${resolvedBrand}（${shortLabel}）`
        : resolvedBrand
    }
    // 薬剤未選択 or brandNames なし: フォールバック
    return resolvedGenericName ?? activeModuleData.drug?.search?.primaryDisplayName
  })()

  // ══════════════════════════════════════════════════════════════
  // EFFECTS
  // ══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  // Rapid state のリセットについて（Unit 1 / RAPID-V2-07）
  //
  // Unit 1 以前はここに「thirdPanelSPlacement.enabled === true のシナリオへ
  // 切り替わった場合のみ sRelation/sCondition を初期化する」effect があった。
  // これは明示指定のある 46 シナリオにしか発火せず、fallback で capable と
  // 判定される 124 シナリオでは state が据え置かれていた（state/text desync の原因）。
  //
  // Unit 1 では scenario 遷移の判定を nextRapidStateOnScenarioChange へ一本化し、
  // 呼び出し側（handleSelectScenario）が明示的に次の状態を決める。
  // シナリオ解除・薬剤切替・Express 確定・NLP 遷移は「コンテキスト破棄」であり
  // 遷移ではないため、各 handler が setRapidState(null) を明示する。
  // ─────────────────────────────────────────────────────────────

  // 1剤目シナリオ切替時に primaryBaseFields を初期化（addon なし素の状態）
  // - selectedScenarioId 変化時のみ走る
  // - ノード操作中（editingNodeId !== null）はスキップ: primary は触らない
  // - addon 込みの更新は handleAddonToggle の primary ブランチで行う
  // - addonsRef は AddonPanel の表示候補のみに使用（初期選択ONには使わない）
  useEffect(() => {
    if (editingNodeId !== null) return
    // handleNlpGenerate が setSelectedScenarioId を呼んだ場合は通常シナリオ再構築をスキップする。
    // このフラグは uiModeRef チェックより前に消費する。uiMode === 'nlp' のままで early return
    // すると false に戻す機会を失い、後続の手動シナリオ選択時にも誤ってスキップしてしまうため。
    // ADDON 候補表示（addonVisibleKeys）のために selectedScenarioId だけ更新し、
    // rawPrimaryFieldsRef / primaryBaseFields / rapidBaseFieldsRef は NLP 出力を保持する。
    if (scenarioIdFromNlpRef.current) {
      scenarioIdFromNlpRef.current = false  // 次回以降は通常動作に戻す（一度だけスキップ）
      return
    }
    // NLP モード中は handleNlpGenerate が rawFields/guard/primaryBaseFields を直接管理するため
    // selectedScenarioId 変化による上書きをスキップする
    if (uiModeRef.current === 'nlp') return
    // handleSwitchToManual がスナップショットを復元した直後のフラグ。
    // true の場合は buildNodeFields による再構築・state 上書きをスキップする。
    // フラグ自体は消費してリセットする（次回以降は通常動作）。
    if (restoringFromSnapshotRef.current) {
      restoringFromSnapshotRef.current = false
      return
    }
    // manualScenarioSelectRef が true の場合のみ rapidBaseFieldsRef をクリアする。
    // false の場合（handleSelectGroup や薬剤切替などの内部呼び出し）はクリアしない。
    const isManualSelect = manualScenarioSelectRef.current
    manualScenarioSelectRef.current = false  // 消費してリセット
    if (selectedScenarioId !== null && primaryScenario) {
      // activeDrugDisplayNameRef: Express GEモード時の GE名（ref 経由で stale closure 防止）
      // resolveDrugName: 薬剤名解決のSSOT（ブランド未確定時は brandNames[0] の displayGenericName に解決）
      const primaryDrugName = activeDrugDisplayNameRef.current
        ?? resolveDrugName(activeModuleData.drug, primaryNode.matchedBrandName)
      if (isManualSelect) {
        rapidBaseFieldsRef.current = null  // ユーザーの手動シナリオ選択で NLP 原本をクリア
      }
      // ── rebuildPrimary へ一本化（Unit 4C-4）─────────────────────
      // ここへ到達した時点で prev.rapid（= primaryNodeRef.current.rapid）は遷移判定済みの値になっている
      //   （handleSelectScenario が単一の setPrimaryNode で scenarioId / rapid を同一
      //     バッチで更新し、ref は render 時に同期されてから effect が走るため）。
      // non-null ＝ capable → capable の遷移で保持された状態であり、
      // 「state だけ保持して本文へ反映しない」ことは禁止されている（RAPID-V2-07）。
      // addon なしで再構築するため addonIds は [] を渡す（下の setSelectedAddonIds(new Set()) と対応）。
      const pEnabled = personaEnabledRef.current    // ← hoist（updater 外）
      const pId      = selectedPersonaRef.current   // ← hoist（updater 外）
      const mod      = activeModuleData
      const label    = resolveNodeLabel(mod)
      const bDomain  = resolveDomain(mod)
      setPrimaryNode(prev => rebuildPrimary({
        node: prev, mod, scenario: primaryScenario,
        addonIds: [],                 // 現行 effect の [] を保存
        rapid: prev.rapid,            // 旧 primaryNodeRef.current.rapid と同値
        drugName: primaryDrugName,
        drugLabel: label, baseDomain: bDomain,
        personaEnabled: pEnabled, persona: pId,
      }))
      setSelectedAddonIds(new Set())
      setEditedSOAP(null)
    } else if (selectedScenarioId === null) {
      if (isManualSelect) {
        rapidBaseFieldsRef.current = null  // シナリオ解除で NLP 原本をクリア
      }
      setPrimaryNode(prev => ({
        ...prev,
        block: { ...prev.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
      }))
      setEditedSOAP(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryNode.scenarioId])
  // ↑ primaryScenario / activeModuleData.defaults は deps に入れない。
  //   シナリオ切替タイミングだけで同期すれば十分。
  //   deps に入れると別モジュール選択時など意図しない再実行が起きる。
  //
  //   editingNodeId も deps に入れない（Unit 0 / RAPID-V2-06）。
  //   入れると editingNodeId が non-null → null へ戻るだけで再発火し、
  //   primary を素のシナリオから作り直して Rapid 適用文と ADDON を破棄する
  //   （node 追加後に node bar の1剤目をクリックしただけで内容が消える）。
  //   editingNodeId は「どのノードの UI を表示するか」という UI-only state であり、
  //   1剤目の内容を再構築する理由にはならない。上の early return は
  //   「シナリオ切替時にノード編集中なら primary を触らない」ガードとして残す。
  //   なお handleSelectPrimaryNode / handleSelectNode（解除）/ handleRemoveComposeNode /
  //   handleResetCompose / handleExpressAdd（ノードトグルオフ）は、いずれも
  //   setSelectedAddonIds(primaryAddonIdsRef.current) で1剤目の ADDON 選択を
  //   復元しており、この effect の再発火はその意図とも矛盾していた。

  // ══════════════════════════════════════════════════════════════
  // CALLBACKS
  // ══════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────
  // confirmDiscard — 手動編集破棄確認ヘルパー
  //
  // editedSOAP が存在する場合: ダイアログを表示し、ユーザーが「破棄して続行」を
  //   選んだ後に action() を実行する（キャンセル時は何もしない）。
  // editedSOAP が null の場合: 確認なしに action() を即実行する。
  //
  // 使い方: 再合成系ハンドラの先頭で confirmDiscard(() => { 本来の処理 }) を呼ぶ。
  // ─────────────────────────────────────────────────────────────

  const confirmDiscard = useCallback((action: () => void) => {
    if (editedSOAP === null) {
      action()
    } else {
      pendingActionRef.current = action
      setDiscardDialogOpen(true)
    }
  }, [editedSOAP])

  const handleSelectGroup = useCallback((group: MenuGroup) => {
    setSelectedGroup(group)
    // グループ切り替え時に前シナリオの addon 残留を防ぐ。
    // editingNodeId !== null（node 編集中）や editingPrimary（1剤目の別グループ切替）は
    // selectedScenarioId をリセットしない。
    if (editingNodeIdRef.current === null && !editingPrimaryRef.current) {
      // シナリオ解除はコンテキスト破棄。Rapid を残すと「non-null なのに
      // SOAP へ反映されていない」状態になるため明示的に null にする。
      setPrimaryNode(prev => ({
        ...prev, scenarioId: '', selectedAddonIds: [], rapid: null,
        block: { ...prev.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
      }))
      setSelectedAddonIds(new Set())
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // ノードブロック再構築ヘルパー（pure: state を直接変えない）
  // ─────────────────────────────────────────────────────────────

  const buildUpdatedNode = useCallback((
    node: ComposeNode,
    newScenarioId: string,
    addonIds: string[],
    matchedBrandName?: string,
    displayName?: string,    // {{drug_subject}} に使う表示名。省略時は matchedBrandName から解決
  ): ComposeNode | null => {
    const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
    const sc = mod.scenarios.find(s => s.globalId === newScenarioId)
    if (!sc) return null
    // brandCatalog 解決キー（先発名）から薬剤名を解決。これはアドオンフィルタリング用。
    // {{drug_subject}} の置換は displayName を優先し、省略時のみ matchedBrandName から解決する。
    const drugName = displayName ?? resolveDrugName(mod.drug, matchedBrandName)
    // ── Unit 3B: scenario 遷移（RAPID-V2-07）を node 単位で適用する ──────────
    // primary（handleSelectScenario）と同一の transition function を使う。
    // 旧 scenario は node.scenarioId から解決する。pending node（scenarioId === ''）は
    // 解決できず undefined になるが、isScenarioSReplacementCapable(undefined) は
    // false を返すため、新規 Node の初回確定は自動的に null になる（特別扱い不要）。
    const prevSc = mod.scenarios.find(s => s.globalId === node.scenarioId)
    const nextRapid = nextRapidStateOnScenarioChange(
      node.rapid,
      isScenarioSReplacementCapable(prevSc),
      isScenarioSReplacementCapable(sc),
    )
    // Unit 3B: node が所有する Rapid を derive の入力として使う。
    // production UI から non-null になる経路は存在しない（Rapid UI は 1剤目限定）が、
    // dead field にはしない — non-null なら必ずこの Node の SOAP へ反映される。
    const core = deriveNodeBlockCore(sc, mod, addonIds, nextRapid, drugName)
    const fields = personaEnabled
      ? applyPersonaToFieldsWithGuard(core.rawFields, true, selectedPersona, core.guard)
      : core.rawFields
    const domain = resolveDomain(mod)
    return {
      ...node,
      scenarioId: newScenarioId,
      rapid: nextRapid,          // ← 明示必須。省略すると `...node` が旧 rapid を保持し遷移しない
      block: { id: node.block.id, ...core, fields, domain },
      selectedAddonIds: addonIds,
      baseLabel: sc.title,
      baseDomain: domain,
    }
  }, [allModules, moduleData, personaEnabled, selectedPersona])

  // ─────────────────────────────────────────────────────────────
  // handleSelectPrimaryNode（1剤目チップクリック: primary 編集モードのトグル）
  //
  // editingPrimary === true  → 解除（通常状態へ）
  // editingPrimary === false → primary 編集モードへ（editingNodeId をクリア）
  // ─────────────────────────────────────────────────────────────

  const handleSelectPrimaryNode = useCallback(() => {
    if (editingPrimaryRef.current) {
      // 解除: primary 編集モードを終了（SOAPは変わらないので確認不要）
      setEditingPrimary(false)
      const primarySc = primaryScenarioRef.current
      if (primarySc) setSelectedGroup(getMenuGroupFromScenario(primarySc))
      setSelectedAddonIds(primaryAddonIdsRef.current)
    } else {
      // primary 編集モードへ: editingNodeId が変わるだけで SOAP は再生成しない。
      // ただしユーザーは「別コンテキストに移った」と感じるので確認する。
      confirmDiscard(() => {
        setEditingPrimary(true)
        setEditingNodeId(null)
        const primarySc = primaryScenarioRef.current
        if (primarySc) setSelectedGroup(getMenuGroupFromScenario(primarySc))
        setSelectedAddonIds(primaryAddonIdsRef.current)
        setEditedSOAP(null)
      })
    }
  }, [confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleSelectScenario
  //   primary   → selectedScenarioId を更新（useEffect が primaryBaseFields を追従）
  //   node      → そのノードの block を再構築して composeNodes を更新
  // ─────────────────────────────────────────────────────────────

  const handleSelectScenario = useCallback((id: string) => {
    const nodeId = editingNodeIdRef.current

    if (nodeId !== null) {
      // ── node ブランチ ────────────────────────────────────────
      const addonIds = [...selectedAddonIdsRef.current]
      setPendingNodeIds(prev => { const n = new Set(prev); n.delete(nodeId); return n })
      setComposeNodes(prev => {
        const node = prev.find(n => n.id === nodeId)
        if (!node) return prev
        // matchedBrandName: brandCatalog 解決キー（先発名）
        // resolvedDrugName: {{drug_subject}} 用の表示名（GEモードなら GE名）
        const updated = buildUpdatedNode(node, id, addonIds, node.matchedBrandName, node.resolvedDrugName)
        if (!updated) return prev
        return prev.map(n => n.id === nodeId ? updated : n)
      })
      return
    }

    // ── primary ブランチ ─────────────────────────────────────
    confirmDiscard(() => {
      // editingPrimary 中にシナリオを選んだら編集モードを終了
      if (editingPrimaryRef.current) setEditingPrimary(false)
      // ユーザーが明示的に手動でシナリオを選択した印を付ける。
      // useEffect([primaryNode.scenarioId]) で rapidBaseFieldsRef を null にする条件として使う。
      manualScenarioSelectRef.current = true
      // 手動でシナリオを選択したら Rapid 前スナップショットは不要になるのでクリアする。
      manualSnapshotRef.current = null

      // updater の外で現在値を読む（primaryNodeRef は render 同期の read-only mirror）。
      // 1 batch につき setPrimaryNode を 1 回しか呼ばないため、ここでの値は
      // updater の prev と一致する。
      const snap = primaryNodeRef.current
      const isDeselect = snap.scenarioId === id
      const sc = activeModuleData.scenarios.find(s => s.globalId === id)

      if (!isDeselect && sc) setSelectedGroup(getMenuGroupFromScenario(sc))
      if (isDeselect) {
        // 同じシナリオを再タップ → 解除（コンテキスト破棄。遷移ではない）
        setSelectedAddonIds(new Set())
      }

      // ── scenario 遷移（RAPID-V2-07）────────────────────────
      // capability は scenario intrinsic predicate で判定する（RAPID-V2-08）。
      // UI の表示可否（isSingleDrug / thirdPanelEnabled）には依存させない。
      // 保持された場合、useEffect(primaryNode.scenarioId) が新シナリオの
      // pristine S を基点に Rapid 先頭文を再適用する（解釈①）。
      // primaryBaseFields（= primaryNode.block.fields）は useEffect(primaryNode.scenarioId) で同期される。
      // 切替側（else）は block を絶対に触らない（transient 保存の要。§3）。
      // updater 内で ref を read しない（A-9）ため、旧 scenario の capable 判定は外で確定する。
      const oldCapable = isScenarioSReplacementCapable(primaryScenarioRef.current)
      setPrimaryNode(p => isDeselect
        ? { ...p, scenarioId: '', selectedAddonIds: [], rapid: null,
            block: { ...p.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined } }
        : { ...p, scenarioId: id, rapid: nextRapidStateOnScenarioChange(
            p.rapid,
            oldCapable,
            isScenarioSReplacementCapable(sc),
          ) })
    })
  }, [activeModuleData.scenarios, buildUpdatedNode, confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleSelectDrugSuggestion（メイン検索: 薬剤切替）
  // ─────────────────────────────────────────────────────────────

  const handleSelectDrugSuggestion = useCallback((item: DrugSuggestionItem) => {
    confirmDiscard(() => {
      // 薬剤切替でコンテキストが完全に変わるため Rapid 前スナップショットをクリアする
      manualSnapshotRef.current = null
      rapidBaseFieldsRef.current = null
      const mod = allModules.find(m => m.moduleId === item.moduleId) ?? moduleData
      // U-4b: SOAP {{drug_subject}} は BrandResolution から解決する。
      // 旧実装は drugDisplayLabel と matchedBrandName の文字列比較から意味論を逆算していたが、
      // これは brandNames[0]（JSON の配列宣言順）を主語へ流す経路になっていた（F-3）。
      //
      // subject === null は denotation='module'（指示対象が未確定）のみ。この状態は U-5 gate に
      // より SOAP 生成へ到達しないため、代替値を生成しない。undefined は「主語の上書きなし」を
      // 意味する既存の state 表現であり、activeBrandName / drugDisplayLabel / brandNames[0] 等で
      // 埋めてはならない（DP-15）。
      const subject = resolveSubjectFromResolution(item.resolution)
      setPrimaryNode(prev => ({
        ...prev,
        moduleId:         mod.moduleId,
        matchedBrandName: item.matchedBrandName,
        resolvedDrugName: subject ?? undefined,
        resolution:       item.resolution,
        localSiteInput:   '',
        drugLabel:        resolveNodeLabel(mod),
        baseDomain:       resolveDomain(mod),
        block: {
          ...prev.block,
          domain: resolveDomain(mod), clinicalDomain: mod.composition?.clinicalDomain,
          fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined,
        },
        scenarioId: '', selectedAddonIds: [], rapid: null,      // ← 4C-3 で追加
      }))
      setDrugSelected(true)
      setSelectedAddonIds(new Set())
      setSelectedGroup(null)
      setMainSearch('')
      setComposeNodes([])
      setEditingNodeId(null)
      setEditingPrimary(false)
      setPendingNodeIds(new Set())
      setEditedSOAP(null)
    })
  }, [allModules, moduleData, confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleComposeDrugSelect（合成検索: ノード追加）
  // ─────────────────────────────────────────────────────────────

  const handleComposeDrugSelect = useCallback((item: DrugSuggestionItem) => {
    confirmDiscard(() => {
      const mod = allModules.find(m => m.moduleId === item.moduleId) ?? moduleData
      const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2)}`
      // U-4b: {{drug_subject}} は BrandResolution から解決する（primary と同一の契約）。
      // subject === null は denotation='module' のみで、U-5 gate により scenario 確定へ
      // 到達しないため node は pending のまま残る。代替値を生成しない（DP-15）。
      // resolvedDrugName は Express node（BrandResolution を持たない）でも使われる既存 field
      // であるため型は string を維持し、未確定は空文字（＝主語なし）として記録する。
      const nodeDrugName = resolveSubjectFromResolution(item.resolution) ?? ''
      const newNode: ComposeNode = {
        id: nodeId,
        moduleId: mod.moduleId,
        scenarioId: '',
        block: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          templateLabel: '',
          fields: EMPTY_FIELDS,
          closingText: undefined,
        },
        drugLabel: resolveNodeLabel(mod),
        matchedBrandName: item.matchedBrandName,
        resolvedDrugName: nodeDrugName,
        // U-4a: BrandResolution を node へ保持する（plumbing のみ）。
        // 上の nodeDrugName / matchedBrandName の算出には一切影響させない。
        resolution: item.resolution,
        selectedAddonIds: [],
        baseLabel: '',
        baseDomain: resolveDomain(mod),
        // Unit 3B: Rapid 未選択で初期化する。primary の global rapidState を
        // 引き継がない（別 Drug / 別 Node の独立 state である）。
        rapid: null,
      }
      // pending ノードは block が EMPTY_FIELDS のため computeDisplayFields に影響しない
      // (scenarioId が空なので confirmedNodes に含まれない)
      setComposeNodes(prev => [...prev, newNode])
      setPendingNodeIds(prev => new Set([...prev, nodeId]))
      setEditingNodeId(nodeId)
      setEditingPrimary(false)
      setSelectedGroup(null)
      setSelectedAddonIds(new Set())
      setComposeSearch('')
      setEditedSOAP(null)
    })
  }, [allModules, moduleData, confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleSelectNode
  // ─────────────────────────────────────────────────────────────

  const handleSelectNode = useCallback((nodeId: string) => {
    const currentId = editingNodeIdRef.current
    const nodes = composeNodesRef.current

    if (currentId === nodeId) {
      // 同じノード再クリック → 1剤目操作モードへ（コンテキスト移動なので確認する）
      confirmDiscard(() => {
        setEditingNodeId(null)
        const primarySc = primaryScenarioRef.current
        setSelectedGroup(primarySc ? getMenuGroupFromScenario(primarySc) : null)
        setSelectedAddonIds(primaryAddonIdsRef.current)
        setEditedSOAP(null)
      })
      return
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    // 別ノードへの切替（コンテキスト移動なので確認する）
    confirmDiscard(() => {
      setEditingNodeId(nodeId)
      setEditingPrimary(false)

      if (node.scenarioId) {
        const nodeMod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
        const nodeSc = nodeMod.scenarios.find(sc => sc.globalId === node.scenarioId)
        setSelectedGroup(nodeSc ? getMenuGroupFromScenario(nodeSc) : null)
        setSelectedAddonIds(new Set(node.selectedAddonIds ?? []))
      } else {
        setSelectedGroup(null)
        setSelectedAddonIds(new Set())
      }
      setEditedSOAP(null)
    })
  }, [allModules, moduleData, confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleRemoveComposeNode
  // ─────────────────────────────────────────────────────────────

  const handleRemoveComposeNode = useCallback((nodeId: string) => {
    const currentId = editingNodeIdRef.current
    const primarySc = primaryScenarioRef.current

    confirmDiscard(() => {
      if (currentId === nodeId) {
        setEditingNodeId(null)
        setSelectedAddonIds(primaryAddonIdsRef.current)
        setSelectedGroup(primarySc ? getMenuGroupFromScenario(primarySc) : null)
      }
      setPendingNodeIds(prev => { const n = new Set(prev); n.delete(nodeId); return n })
      setComposeNodes(prev => prev.filter(n => n.id !== nodeId))
      setEditedSOAP(null)
      // displayFields は computeDisplayFields が自動再計算
    })
  }, [confirmDiscard])  // editingPrimary は remove 操作に影響しない

  // ─────────────────────────────────────────────────────────────
  // handleResetCompose（全ノードリセット）
  // ─────────────────────────────────────────────────────────────

  const handleResetCompose = useCallback(() => {
    confirmDiscard(() => {
      setComposeNodes([])
      setEditingNodeId(null)
      setEditingPrimary(false)
      setPendingNodeIds(new Set())
      const primarySc = primaryScenarioRef.current
      setSelectedGroup(primarySc ? getMenuGroupFromScenario(primarySc) : null)
      setSelectedAddonIds(primaryAddonIdsRef.current)
      setEditedSOAP(null)
    })
  }, [confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleLocalSiteInputChange
  //
  // ThirdPanel の onLocalSiteInputChange コールバック。
  // activeNode があれば対応する composeNode.localSiteInput に書き込む（per-node）。
  // activeNode が null（1剤目操作）のときは グローバル localSiteInput を更新する。
  // ─────────────────────────────────────────────────────────────

  const handleLocalSiteInputChange = useCallback((value: string) => {
    const nodeId = editingNodeIdRef.current
    if (nodeId !== null) {
      setComposeNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, localSiteInput: value } : n
      ))
    } else {
      setPrimaryNode(prev => ({ ...prev, localSiteInput: value }))
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleFieldChange（テキスト直接編集）
  //
  // editingNodeId の有無にかかわらず、常に editedSOAP に書き込む。
  //
  // 理由:
  //   ユーザーが見ているのは finalFields（合成後の表示全体）であり、
  //   editingNodeId は「左パネルでどのノードのシナリオを選択中か」を示すUIフラグ。
  //   手動編集は「今画面に表示されているSOAP全体を直接編集する」操作であり、
  //   editingNodeId の状態（node操作中 / primary操作中）と直交する。
  //
  //   旧実装の node ブランチ（setComposeNodes への書き込み）は、
  //   composeNodes → displayFields → finalFields の再計算を誘発し、
  //   2剤目合成後の手動編集で表示が崩れる原因となっていた。
  //
  // スナップショット戦略:
  //   editSnapshotRef は「editedSOAP === null の間だけ」追従し、
  //   編集開始後は固定される。これにより displayFields の再計算が
  //   編集中のテキストに混入しない。
  //
  // 一致判定は editSnapshotRef（編集開始時の固定スナップショット）と比較する。
  // displayFieldsRef（再計算値）と比較すると、編集中に displayFields が変化した場合に
  // ユーザーが元の文字列に戻しても null に戻れない問題が発生するため使わない。
  // ─────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback((key: SoapKey, value: string) => {
    setEditedSOAP(prev => {
      const base = prev ?? editSnapshotRef.current
      const next = { ...base, [key]: value }
      const snap = editSnapshotRef.current
      const isIdentical =
        next.S === snap.S && next.O === snap.O &&
        next.A === snap.A && next.P === snap.P
      return isIdentical ? null : next
    })
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleAddonToggle【Rapid 操作】
  //
  // Rapid の一部（右パネル ADDON ボタン）。Express / NLP生成とは無関係。
  //
  //   node    → ノードの block を addon 込みで再構築（composeNodes を書き換え。
  //             既に buildNodeFields による deterministic derive）
  //   primary → deriveRawFields(scenario, mod, newAddonIds, rapidState, drugName) で
  //             raw を再導出する（Unit 2B）。ADDON の strip/re-add ではなく
  //             常に scenario + 選択中 ADDON + Rapid から作り直すため、
  //             S先頭文（Rapid）・{{drug_subject}}・closing 順はすべて
  //             deriveRawFields 内の buildNodeFields が一貫して保証する。
  // ─────────────────────────────────────────────────────────────

  const handleAddonToggle = useCallback((addonKey: string, _text: string) => {
    const nodeId = editingNodeIdRef.current

    if (nodeId !== null) {
      // ── node ブランチ（確認不要: editedSOAP は primary のみ対象）─
      setSelectedAddonIds(prev => {
        const next = new Set(prev)
        next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)
        const newAddonIds = [...next]
        const nodes = composeNodesRef.current
        const node = nodes.find(n => n.id === nodeId)
        if (node) {
          const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
          const sc = mod.scenarios.find(s => s.globalId === node.scenarioId)
          if (sc) {
            // Unit 3B: node が所有する Rapid を derive の入力として使う。
            // ADDON トグルは scenario 遷移ではないため transition function は通さない
            // （node.rapid をそのまま維持する）。
            // node.resolvedDrugName を渡して {{drug_subject}} を再解決
            const core = deriveNodeBlockCore(sc, mod, newAddonIds, node.rapid, node.resolvedDrugName ?? '')
            const fields = personaEnabled
              ? applyPersonaToFieldsWithGuard(core.rawFields, true, selectedPersona, core.guard)
              : core.rawFields
            const domain = resolveDomain(mod)
            setComposeNodes(nodes.map(n =>
              n.id !== nodeId ? n : {
                ...n,
                block: { ...n.block, ...core, fields, domain },
                selectedAddonIds: newAddonIds,
                baseLabel: sc.title,
                baseDomain: domain,
              },
            ))
          }
        }
        return next
      })
    } else {
      // ── primary ブランチ（editedSOAP があれば確認する）────────
      confirmDiscard(() => {
        const sc = primaryScenarioRef.current
        // resolveDrugName: 薬剤名解決のSSOT（lib/drugSubject.ts）。
        // scenario 本文側 [869行目付近] / Rapid 側 [1543行目付近] と同一経路。
        const drugName = activeDrugDisplayNameRef.current
          ?? resolveDrugName(activeModuleData.drug, primaryNode.matchedBrandName)

        const next = new Set(selectedAddonIdsRef.current)      // updater の外で読む
        next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)
        const newAddonIds = [...next]
        const rapidNow = primaryNodeRef.current.rapid
        const pEnabled = personaEnabledRef.current, pId = selectedPersonaRef.current   // ← hoist
        const mod = activeModuleData, label = resolveNodeLabel(mod), bDomain = resolveDomain(mod)

        setSelectedAddonIds(next)                                          // UI buffer
        // ── rebuildPrimary へ一本化（Unit 4C-4）─────────────────
        // scenario + newAddonIds + 現在の Rapid state から raw を deterministic に
        // 再導出する（strip/re-add の増分 patch は行わない）。rebuildPrimary は
        // newAddonIds のみを入力に取る純関数のため、StrictMode の updater 二重実行でも
        // 出力は自然に冪等（同じ newAddonIds → 常に同じ raw）。
        setPrimaryNode(p => sc
          ? rebuildPrimary({ node: p, mod, scenario: sc, addonIds: newAddonIds, rapid: rapidNow,
              drugName, drugLabel: label, baseDomain: bDomain, personaEnabled: pEnabled, persona: pId })
          : { ...p, selectedAddonIds: newAddonIds })      // sc 無しなら本文を触らない（現行挙動）
        setEditedSOAP(null)
      })
    }
  }, [activeModuleData, primaryNode.matchedBrandName, allModules, moduleData, personaEnabled, selectedPersona, confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleSToggle【Rapid 操作】（S先頭文トグル）
  //
  // Rapid の一部（右パネル S先頭文ボタン）。Express / NLP生成とは無関係。
  // S欄の先頭文のみ変更。A・P は保持。buildNodeFields は呼ばない。
  // ノード編集中は1剤目の S を変更しない（ノード側に S トグルは現時点では非対応）
  // ─────────────────────────────────────────────────────────────

  const handleSToggle = useCallback((relation: SRelation, condition: SCondition) => {
    if (editingNodeIdRef.current !== null) return
    confirmDiscard(() => {
      // resolveDrugName: 薬剤名解決のSSOT（ブランド未確定時は brandNames[0] の displayGenericName に解決）
      const drugName = primaryNode.resolvedDrugName
        ?? resolveDrugName(activeModuleData.drug, primaryNode.matchedBrandName)
      const sc = primaryScenarioRef.current
      const currentAddonIds = [...primaryAddonIdsRef.current]
      const rapidBase = rapidBaseFieldsRef.current                 // NLP dead path
      const pEnabled = personaEnabledRef.current, pId = selectedPersonaRef.current   // ← hoist
      const mod = activeModuleData, label = resolveNodeLabel(mod), bDomain = resolveDomain(mod)

      // ── toggle-off（RAPID-V2-05）────────────────────────────
      // 現在アクティブな Rapid を再クリック → RapidState = null にし、
      // S 本文を scenario 本来の先頭文へ差し戻す。
      //
      // Unit 2B: deriveRawFields(rapid=null)（rebuildPrimary 経由）が単一の deterministic
      // 経路として scenario本文・ADDON・raw復元をすべて再導出する（手動 S mutation は行わない）。
      //   - 残余（シナリオ固有の観察文）と ADDON テキストは deriveRawFields が保持する
      //   - raw を persona 再計算の基点として保ち続ける（H-1 / 37a9262 の invariant）
      //   - localInput は finalFields で render 時に適用されるため巻き戻らない
      if (isSameRapid(primaryNodeRef.current.rapid, relation, condition)) {
        setPrimaryNode(p => {
          if (sc) return rebuildPrimary({ node: p, mod, scenario: sc, addonIds: currentAddonIds,
            rapid: null, drugName, drugLabel: label, baseDomain: bDomain,
            personaEnabled: pEnabled, persona: pId })
          // 【D-4C-7】production 到達不能。現行
          //   setPrimaryBaseFields(derivePrimaryDisplayFields(rawPrimaryFieldsRef.current))
          // の意味論を prev.block.rawFields から逐語 preservation する。削除しない。
          const raw = p.block.rawFields ?? EMPTY_FIELDS
          const fields = (pEnabled && p.block.guard)
            ? applyPersonaToFieldsWithGuard(raw, true, pId, p.block.guard) : raw
          return { ...p, rapid: null, block: { ...p.block, fields } }
        })
        setEditedSOAP(null)
        return
      }

      // この関数が呼ばれる時点で、表示条件（1剤目 + capable シナリオ）は
      // ThirdPanel 側で既に保証されている。
      // Rapid 原本（NLP専用・現在UI未接続のため通常は null）がある場合は
      // rapidBaseFieldsRef をベースに S だけ差し替える（既存の NLP 経路の分岐を変更しない。
      // NLP は showNlpButton=false / handleSwitchToNlp 未配線のため到達不能）。
      // 通常経路（rapidBaseFieldsRef が null）は rebuildPrimary で raw を再導出する。
      const nextRapid: RapidState = { previousEvent: relation, currentOutcome: condition }
      setPrimaryNode(p => {
        if (rapidBase !== null) {
          // 【D-4C-8】NLP dead path。fields のみ差し替え rawFields を更新しない現行契約を維持する
          //   （dead-path migration debt として許容）。
          const updated = replaceSFirstSentence(rapidBase.S,
            buildResolvedSFirstSentence(relation, condition, drugName, mod.display?.adjustmentExpression))
          return { ...p, rapid: nextRapid, block: { ...p.block, fields: { ...rapidBase, S: updated } } }
        }
        if (sc) return rebuildPrimary({ node: p, mod, scenario: sc, addonIds: currentAddonIds,
          rapid: nextRapid, drugName, drugLabel: label, baseDomain: bDomain,
          personaEnabled: pEnabled, persona: pId })
        return { ...p, rapid: nextRapid }               // 現行: sc も rapidBase も無ければ本文を触らない
      })
      setEditedSOAP(null)
    })
  }, [primaryNode.matchedBrandName, primaryNode.resolvedDrugName, activeModuleData, confirmDiscard])

  // ─────────────────────────────────────────────────────────────
  // handleSubcategorySelect【Express 操作】
  //
  // Express の一部（中央パネル サブカテゴリ選択）。Rapid / NLP生成とは無関係。
  // ─────────────────────────────────────────────────────────────

  const handleSubcategorySelect = useCallback((label: string) => {
    setComposeSearch(label)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleExpressAdd【Express 操作】
  //
  // Express の一部（中央パネル 剤形/候補選択 → SOAP即時確定）。Rapid / NLP生成とは無関係。
  // シナリオ確定時に buildNodeFields を呼ぶ（Express の責務）。
  //
  // エクスプレスモードから呼ばれる。通常フローと同じ状態を組み立てるショートカット。
  //
  // 1剤目未確定 → handleSelectDrugSuggestion と同じ状態遷移 + シナリオ即時確定
  //               （通常: 検索→薬剤選択→テンプレート選択 の一括実行）
  // 1剤目確定済み → handleComposeDrugSelect と同じ状態遷移 + シナリオ即時確定
  //               （通常: compose検索→薬剤選択→テンプレート選択 の一括実行）
  //
  // brandName (先発名/brandCatalogキー) と displayName (表示名/GE名) は分離して管理する。
  // → 詳細は handleSelectDrugSuggestion / handleComposeDrugSelect のコメント参照
  // ─────────────────────────────────────────────────────────────

  const handleExpressAdd = useCallback((
    targetModuleId: string,
    defaultScenarioId: string,
    brandName?: string,     // brandCatalog 解決キー（先発名）。handlingTags / アドオンフィルタリングに使用
    displayName?: string,   // SOAP {{drug_subject}} / ノード表示名。brandCatalog から解決済みの正式表示名。省略時は brandName と同値
  ) => {
    const mod = allModules.find(m => m.moduleId === targetModuleId) ?? moduleData
    // defaultScenarioId は scenario.id（非 globalId）なので globalId に変換する
    const sc = mod.scenarios.find(s => s.id === defaultScenarioId)
    if (!sc) return
    const globalId = sc.globalId

    // brandCatalog 解決キー: 先発名。handlingTags / storageType / formulationType 等の取得に使用
    const resolvedBrandKey = brandName ?? mod.drug?.brandNames?.[0]
    // 表示名 / {{drug_subject}}: GEモードなら GE名、先発モードまたは省略時は先発名
    const resolvedDisplayName = displayName ?? resolvedBrandKey ?? ''

    confirmDiscard(() => {
      // ref 経由で stale closure を防ぐ
      const isPrimaryEmpty = primaryScenarioRef.current === undefined && composeNodesRef.current.length === 0

      if (isPrimaryEmpty) {
        // ── 1剤目として追加（handleSelectDrugSuggestion と同じ状態遷移 + シナリオ即時確定）──
        // handleSelectDrugSuggestion との差分:
        //   - selectedScenarioId を null にリセットせず globalId に確定
        //   - selectedGroup を sc から解決してセット
        //   - composeSearch をクリア（サブカテゴリ選択で設定された値をリセット）
        // displayName が指定されていて brandKey と異なる場合のみ resolvedDrugName に設定
        // （handleSelectDrugSuggestion と同じロジック）
        //
        // Express は DrugSuggestionItem を経由しないため BrandResolution を持たない。
        // primary context が Express へ切り替わる時点で、直前の検索由来 resolution を
        // 必ず破棄する（残すと U-5 gate が前の context の denotation で誤発火する）。
        // undefined は「legacy / 非検索経路」を表す既存契約であり、新しい resolution を
        // 生成する処理ではない（lib/brandTags.ts）。resolution: undefined を明示する
        // ことで U-5 lifecycle reset を保存する。
        setPrimaryNode(prev => ({
          ...prev,
          moduleId:         mod.moduleId,
          matchedBrandName: resolvedBrandKey,
          resolvedDrugName: resolvedDisplayName !== resolvedBrandKey ? resolvedDisplayName : undefined,
          resolution:       undefined,
          drugLabel:        resolveNodeLabel(mod),
          baseDomain:       resolveDomain(mod),
          block: { ...prev.block, domain: resolveDomain(mod), clinicalDomain: mod.composition?.clinicalDomain },
          // シナリオを即時確定（通常フローでは handleSelectScenario が行う処理を一括実行）。
          // Express 確定はコンテキスト破棄。Rapid を自動付与しない（RAPID-V2-07）
          scenarioId: globalId, selectedAddonIds: [], rapid: null,
        }))
        setDrugSelected(true)
        setComposeNodes([])
        setEditingNodeId(null)
        setEditingPrimary(false)
        setPendingNodeIds(new Set())
        setMainSearch('')
        setComposeSearch('')  // サブカテゴリ選択でセットされた値をリセット
        setSelectedGroup(getMenuGroupFromScenario(sc))
        setSelectedAddonIds(new Set())
        setEditedSOAP(null)
      } else {
        // トグル: moduleId + matchedBrandName（先発名キー）+ scenarioId が一致するノードが既にあれば削除
        const existingNode = composeNodesRef.current.find(
          n => n.moduleId === targetModuleId &&
               n.matchedBrandName === resolvedBrandKey &&
               n.scenarioId === globalId,
        )
        if (existingNode) {
          // 同じExpress候補を再押し → ノード削除（トグルオフ）
          const currentId = editingNodeIdRef.current
          const primarySc = primaryScenarioRef.current
          if (currentId === existingNode.id) {
            setEditingNodeId(null)
            setSelectedAddonIds(primaryAddonIdsRef.current)
            setSelectedGroup(primarySc ? getMenuGroupFromScenario(primarySc) : null)
          }
          setPendingNodeIds(prev => { const n = new Set(prev); n.delete(existingNode.id); return n })
          setComposeNodes(prev => prev.filter(n => n.id !== existingNode.id))
          setEditedSOAP(null)
          return
        }

        // ── ノードとして追加（handleComposeDrugSelect と同じ状態遷移 + シナリオ即時確定）──
        // handleComposeDrugSelect との差分:
        //   - シナリオを即時確定（buildUpdatedNode で pending を解消）
        //   - resolvedDrugName に displayName（GE名）を使用
        //   - selectedGroup を sc から解決してセット
        //   - composeSearch をクリア（サブカテゴリ選択でセットされた値をリセット）
        const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const newNode: import('../../lib/types').ComposeNode = {
          id: nodeId,
          moduleId: mod.moduleId,
          scenarioId: '',
          block: {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            templateLabel: '',
            fields: EMPTY_FIELDS,
            closingText: undefined,
          },
          drugLabel: resolveNodeLabel(mod),
          // matchedBrandName: brandCatalog 解決キー（先発名）を保持
          // → handlingTags / storageType 等のアドオンフィルタリングが正しく動く
          matchedBrandName: resolvedBrandKey,
          // resolvedDrugName: {{drug_subject}} と表示に使う名前（GEモードなら GE名）
          resolvedDrugName: resolvedDisplayName,
          selectedAddonIds: [],
          baseLabel: '',
          baseDomain: resolveDomain(mod),
          // Unit 3B: Rapid 未選択で初期化する（handleComposeDrugSelect と同一契約）
          rapid: null,
        }
        // ノードを追加して即時確定。
        // buildUpdatedNode に displayName（GE名 / 先発名）を渡し、{{drug_subject}} を正しく解決する。
        // matchedBrandName（先発名）は brandCatalog 解決キーとして node に保持し続ける。
        // addonsRef は AddonPanel の表示候補のみ（初期選択ONには使わない）。
        setComposeNodes(prev => {
          const updated = buildUpdatedNode(newNode, globalId, [], resolvedBrandKey, resolvedDisplayName)
          if (!updated) return [...prev, newNode]
          // resolvedDrugName は node に保持（handleAddonToggle が {{drug_subject}} 再解決に使う）
          return [...prev, { ...updated, resolvedDrugName: resolvedDisplayName }]
        })
        // 追加したノードをアクティブ選択状態にする → サードパネルがそのシナリオで開く
        setEditingNodeId(nodeId)
        setEditingPrimary(false)
        setSelectedGroup(getMenuGroupFromScenario(sc))
        setSelectedAddonIds(new Set())
        setComposeSearch('')  // サブカテゴリ選択でセットされた値をリセット
        setEditedSOAP(null)
      }
    })
  }, [
    allModules,
    moduleData,
    buildUpdatedNode,
    confirmDiscard,
  ])

  // ─────────────────────────────────────────────────────────────
  // NLP生成モード（現在未使用・将来機能）
  //
  // 注意: これは「Rapid」（S先頭文/フラグ/ADDON 右パネル操作）とは別概念。
  //   Rapid  = ThirdPanel の S先頭文ボタン・フラグボタン・ADDONボタン
  //   NLP生成 = 患者テキストから SOAP を AI 生成する将来機能
  //
  // handleSwitchToNlp は現在どの UI ボタンにも接続されていない。
  // showNlpButton = false で完全に非表示。uiMode が 'nlp' になることはない。
  // ─────────────────────────────────────────────────────────────

  const handleSwitchToNlp = useCallback(() => {
    confirmDiscard(() => {
      // Rapid に入る瞬間の manual 状態をスナップショットとして保存する。
      // 以降の state リセット前に取得することで正確な復元元を確保する。
      // 毎回必ず上書きする（直前の manual 状態が常に復元対象）。
      manualSnapshotRef.current = {
        primaryBlock: {
          fields:    primaryNodeRef.current.block.fields,
          rawFields: primaryNodeRef.current.block.rawFields,
          guard:     primaryNodeRef.current.block.guard,
        },
        primarySelection: {
          scenarioId:       primaryNodeRef.current.scenarioId,
          selectedAddonIds: primaryNodeRef.current.selectedAddonIds,
          rapid:            primaryNodeRef.current.rapid,
        },
        selectedGroup:      selectedGroup,
        selectedAddonIds:   new Set(selectedAddonIdsRef.current),
      }
      setUiMode('nlp')
      // NLP 遷移はコンテキスト破棄
      setPrimaryNode(p => ({
        ...p, scenarioId: '', selectedAddonIds: [], rapid: null,
        block: { ...p.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
      }))
      setSelectedAddonIds(new Set())
      setSelectedGroup(null)
      setComposeNodes([])
      setEditingNodeId(null)
      setEditingPrimary(false)
      setNlpValidation(null)
      setNlpSelectorReason('')
      setNlpConfidence(0)
      setEditedSOAP(null)
    })
  }, [confirmDiscard, selectedGroup])

  const handleSwitchToManual = useCallback(() => {
    const snap = manualSnapshotRef.current
    setUiMode('manual')
    setNlpValidation(null)
    setNlpSelectorReason('')
    setNlpConfidence(0)
    if (snap !== null) {
      manualSnapshotRef.current = null
      rapidBaseFieldsRef.current = null
      setSelectedAddonIds(snap.selectedAddonIds)
      setSelectedGroup(snap.selectedGroup)
      setEditedSOAP(null)
      restoringFromSnapshotRef.current = true
      setPrimaryNode(p => ({ ...p, ...snap.primarySelection, block: { ...p.block, ...snap.primaryBlock } }))
    }
  }, [])

  const handleNlpGenerate = useCallback((patientInput: string) => {
    setNlpIsGenerating(true)
    const result = createSoapFromInput(activeModuleData, patientInput)
    setNlpValidation(result.validation)
    setNlpSelectorReason(result.selectorReason)
    setNlpConfidence(result.confidence)
    if (result.soap) {
      // NLP 結果を primaryBaseFields に直接セット。
      // uiModeRef.current === 'nlp' のため、後続の selectedScenarioId 変化による
      // useEffect は rawFields/primaryBaseFields を上書きしない（uiModeRef ガード済み）。
      const nlpFields: SoapFields = {
        S: result.soap.S, O: result.soap.O, A: result.soap.A, P: result.soap.P,
      }
      // guard 生成: result.scenarioId から scenario を特定できるときはその guard を使う。
      // NLP の SOAP テキストは soapComposer 由来（buildNodeFields とは別経路）なので、
      // rawFields = nlpFields（NLP生成テキストそのもの）とし、
      // guard はシナリオの importance / intentTags から安全側に派生させる。
      // scenario が特定できない場合は guard を null にして reapplyPersonaToAllBlocks を抑制する。
      const sc = result.scenarioId
        ? activeModuleData.scenarios.find(s => s.globalId === result.scenarioId)
        : undefined
      const guard = sc
        ? derivePersonaGuard(sc, activeModuleData.template?.urgentFlag)
        : null
      // persona が ON かつ guard がある場合は変換済みフィールドを表示する
      const displayableFields = (personaEnabledRef.current && guard)
        ? applyPersonaToFieldsWithGuard(nlpFields, true, selectedPersonaRef.current, guard)
        : nlpFields
      // rapidBaseFieldsRef には画面表示と完全一致する最終本文を保存する。
      // S先頭文・ADDON 操作はこれをベースに差分だけ重ねる。
      // persona 変換済み・addonsRef 展開済みの displayableFields を原本とする。
      rapidBaseFieldsRef.current = displayableFields
      // scenarioIdFromNlpRef を true にしてから setPrimaryNode を呼ぶ。
      // useEffect([primaryNode.scenarioId]) はこの ref が true のときはスキップし、
      // rapidBaseFieldsRef / block.rawFields / block.fields を上書きしない。
      if (result.scenarioId) scenarioIdFromNlpRef.current = true
      setPrimaryNode(p => ({
        ...p, scenarioId: result.scenarioId ?? p.scenarioId,
        block: { ...p.block, fields: displayableFields, rawFields: nlpFields, guard: guard ?? undefined },
      }))
      if (result.scenarioId && sc) setSelectedGroup(getMenuGroupFromScenario(sc))
    } else {
      rapidBaseFieldsRef.current = null  // NLP 生成失敗: 原本をクリア
      setPrimaryNode(p => ({
        ...p, scenarioId: '',
        block: { ...p.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
      }))
    }
    setNlpIsGenerating(false)
  }, [activeModuleData])

  // ─────────────────────────────────────────────────────────────
  // reapplyPersonaToAllBlocks
  //
  // persona ON/OFF 切替・persona 変更時に全ブロックを再変換する。
  // 1剤目: rawPrimaryFieldsRef + primaryGuardRef から再計算して setPrimaryBaseFields
  // 2剤目以降: node.block.rawFields + node.block.guard から再計算して setComposeNodes
  //
  // nextEnabled / nextPersona: 変更後の値（setState の前に呼ぶため引数で受け取る）
  // ─────────────────────────────────────────────────────────────

  const reapplyPersonaToAllBlocks = useCallback((nextEnabled: boolean, nextPersona: PersonaId) => {
    // 1剤目の再計算
    setPrimaryNode(prev => {
      if (!prev.block.guard) return prev                 // 現行 `if (primaryGuard)` の逐語移植
      const raw = prev.block.rawFields ?? EMPTY_FIELDS
      return { ...prev, block: { ...prev.block,
        fields: nextEnabled
          ? applyPersonaToFieldsWithGuard(raw, true, nextPersona, prev.block.guard) : raw } }
    })
    // 2剤目以降: rawFields / guard がある block のみ再計算
    setComposeNodes(prev => prev.map(node => {
      if (!node.block.rawFields || !node.block.guard) return node
      return {
        ...node,
        block: {
          ...node.block,
          fields: nextEnabled
            ? applyPersonaToFieldsWithGuard(node.block.rawFields, true, nextPersona, node.block.guard)
            : node.block.rawFields,
        },
      }
    }))
  }, [])

  // ── 自然言語ボタン表示フラグ（false = 非表示。将来の復活用定数） ──
  const showNlpButton = false

  // ══════════════════════════════════════════════════════════════
  // 表示条件（derived）
  // ══════════════════════════════════════════════════════════════

  // ThirdPanel（合成窓・Sボタン）: シナリオ確定後のみ有効
  const thirdPanelEnabled = currentScenarioId !== null && currentScenarioId !== ''

  // 単剤モード: 1剤目が確定済みかつ composeNodes が空
  // composeNodes は pending 含む全ての2剤目以降ノードを保持するため、
  // length === 0 で「薬剤が1剤のみ」を判定する
  const isSingleDrug = selectedScenarioId !== null && composeNodes.length === 0

  // SOAPエディター: 1剤目確定 or 確定済みノードあり（pending のみは不可）
  const hasValidComposeNodes = composeNodes.some(n => n.scenarioId !== '' && n.scenarioId != null)
  const showSoapEditor = selectedScenarioId !== null || hasValidComposeNodes

  // ══════════════════════════════════════════════════════════════
  // JSX
  // ══════════════════════════════════════════════════════════════

  return (
    <div className={s.layout}>
      <Topbar
        title="SOAP Engine"
        badge={badge}
        activeDrugLabel={drugSelected ? activeDrugLabel : undefined}
        searchValue={mainSearch}
        onSearchChange={setMainSearch}
        drugSuggestions={mainDrugSuggestions}
        onSelectDrugSuggestion={handleSelectDrugSuggestion}
        routeFilter={routeFilter}
        onRouteFilterChange={setRouteFilter}
        personaEnabled={personaEnabled}
        onPersonaToggle={() => {
          const nextEnabled = !personaEnabled
          setPersonaEnabled(nextEnabled)
          reapplyPersonaToAllBlocks(nextEnabled, selectedPersona)
        }}
        onPersonaSettingsOpen={() => setPersonaModalOpen(true)}
      />

      <div className={s.body}>
        <Sidebar
          availableGroups={drugSelected && !subjectUnresolved ? availableGroups : new Set()}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
          selectedNodeId={editingNodeId}
          onDeselectNode={() => confirmDiscard(() => {
            setEditingNodeId(null)
            setEditingPrimary(false)
            setSelectedAddonIds(primaryAddonIds)
            if (primaryScenario) setSelectedGroup(getMenuGroupFromScenario(primaryScenario))
            setEditedSOAP(null)
          })}
          menuGroupLabelOverrides={activeModuleData.display?.menuGroupLabels}
        />

        <div className={s.secondaryCol}>
          {uiMode === 'manual' && (
            <>
              {selectedGroup !== null && groupScenarios.length > 0 ? (
                <>
                  <TemplateListPanel
                    key={`${editingNodeId ?? 'main'}-${selectedGroup}`}
                    group={selectedGroup}
                    scenarios={groupScenarios}
                    selectedScenarioId={currentScenarioId}
                    onSelectScenario={handleSelectScenario}
                    modulePrefix={menuPrefixCandidates}
                  />
                  {currentScenarioId !== null && targetModule.addons && addonVisibleKeys.length > 0 && (
                    <AddonPanel
                      addons={targetModule.addons}
                      selectedAddonIds={selectedAddonIds}
                      onToggle={handleAddonToggle}
                      visibleKeys={addonVisibleKeys}
                    />
                  )}
                </>
              ) : (
                <div className={s.secondaryEmpty} aria-hidden="true" />
              )}
            </>
          )}

          {uiMode === 'nlp' && <div className={s.secondaryEmpty} aria-hidden="true" />}
        </div>

        {uiMode === 'manual' ? (
          <ThirdPanel
            selectedGroup={selectedGroup}
            thirdPanelEnabled={thirdPanelEnabled}
            isSingleDrug={isSingleDrug}
            primaryScenario={primaryScenario}
            rapidState={primaryNode.rapid}
            onSAction={handleSToggle}
            composeSearchValue={composeSearch}
            onComposeSearchChange={setComposeSearch}
            composeDrugSuggestions={composeDrugSuggestions}
            onSelectComposeDrug={handleComposeDrugSelect}
            onSubcategorySelect={handleSubcategorySelect}
            expressCandidates={expressCandidates}
            activeExpressKeys={activeExpressKeys}
            onExpressAdd={handleExpressAdd}
            menuGroupLabelOverrides={activeModuleData.display?.menuGroupLabels}
            localInputConfig={targetModule.display?.localInput ?? undefined}
            localSiteInput={activeLocalSiteInput}
            onLocalSiteInputChange={handleLocalSiteInputChange}
          />
        ) : (
          <div className={s.thirdPanel}>
            <NlpInputPanel
              scenarioId={selectedScenarioId}
              validation={nlpValidation}
              selectorReason={nlpSelectorReason}
              confidence={nlpConfidence}
              isGenerating={nlpIsGenerating}
              onGenerate={handleNlpGenerate}
              onSwitchToManual={handleSwitchToManual}
            />
          </div>
        )}

        <div className={s.editorCol}>
          {showSoapEditor ? (
            <SoapEditor
              fields={finalFields}
              onChange={handleFieldChange}
              nodeBarSlot={
                <ComposeNodeBar
                  nodes={composeNodes}
                  selectedNodeId={editingNodeId}
                  editingPrimary={editingPrimary}
                  onSelectNode={handleSelectNode}
                  onSelectPrimary={handleSelectPrimaryNode}
                  onRemove={handleRemoveComposeNode}
                  onReset={handleResetCompose}
                  baseDrugLabel={resolveNodeLabel(activeModuleData)}
                  pendingNodeIds={pendingNodeIds}
                />
              }
            />
          ) : (
            <div className={s.editorGuide}>
              <div className={s.editorGuideInner}>
                {/* U-5: 指示対象が未確定のとき、グループが出ない理由を既存ガイド枠内で案内する（U-6 までの最小案内。新規UIは作らない） */}
                {drugSelected && subjectUnresolved ? (
                  <>
                    <p className={s.editorGuideTitle}>成分が特定できていません</p>
                    <ol className={s.editorGuideSteps}>
                      <li>この検索語では成分を1つに絞り込めませんでした</li>
                      <li>トップバーの検索窓で商品名または成分名を入力してください</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className={s.editorGuideTitle}>SOAPノートの作成</p>
                    <ol className={s.editorGuideSteps}>
                      <li>トップバーの検索窓で薬剤を選択</li>
                      <li>左のカテゴリメニューでグループを選択</li>
                      <li>中央のテンプレート一覧からシナリオを選択</li>
                    </ol>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ペルソナ設定モーダル ── */}
      {personaModalOpen && (
        <div
          className={s.personaModalOverlay}
          onClick={() => setPersonaModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ペルソナ設定"
        >
          <div className={s.personaModal} onClick={e => e.stopPropagation()}>
            <h2 className={s.personaModalTitle}>ペルソナ設定</h2>
            {(Object.keys(PERSONA_LABELS) as PersonaId[]).map(p => (
              <label key={p} className={s.personaModalOption}>
                <input
                  type="radio"
                  name="persona"
                  value={p}
                  checked={selectedPersona === p}
                  onChange={() => {
                    setSelectedPersona(p)
                    reapplyPersonaToAllBlocks(personaEnabled, p)
                  }}
                />
                {PERSONA_LABELS[p]}
              </label>
            ))}
            <button
              className={s.personaModalClose}
              onClick={() => setPersonaModalOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ── 手動編集破棄確認ダイアログ ── */}
      {discardDialogOpen && (
        <div
          className={s.discardDialogOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="編集内容の破棄確認"
        >
          <div className={s.discardDialog}>
            <p className={s.discardDialogMessage}>
              現在SOAPを手動編集しています。このまま再合成すると手動編集内容は破棄されます。続行しますか？
            </p>
            <div className={s.discardDialogActions}>
              <button
                className={s.discardDialogCancel}
                onClick={() => {
                  pendingActionRef.current = null
                  setDiscardDialogOpen(false)
                }}
              >
                キャンセル
              </button>
              <button
                className={s.discardDialogConfirm}
                onClick={() => {
                  // 処理順を安全に保つ:
                  // 1. action を ref から退避（setDiscardDialogOpen 後も参照できるよう）
                  // 2. ref をクリア
                  // 3. ダイアログを閉じる
                  // 4. editedSOAP をクリア
                  // 5. action 実行
                  const action = pendingActionRef.current
                  pendingActionRef.current = null
                  setDiscardDialogOpen(false)
                  setEditedSOAP(null)
                  action?.()
                }}
              >
                破棄して続行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
