'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

import type { ModuleData, SoapKey, SoapFields, MergedBlock, ComposeNode } from '../../lib/types'
import { TAG_TO_GENERIC_NAME } from '../../lib/types'
import type { BrandResolution } from '../../lib/brandResolution'
import { buildNodeFields, mergeBlocks } from '../../lib/buildSoap'
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
import SoapEditor, {
  type SRelation,
  type SCondition,
  buildSFirstSentence,
  replaceSFirstSentence,
} from './SoapEditor'
import ComposeNodeBar from './ComposeNodeBar'

import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

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
  primaryBaseFields: SoapFields,
  primaryScenario: ModuleData['scenarios'][number] | undefined,
  composeNodes: ComposeNode[],
  defaults: ModuleData['defaults'],
  primaryMod: ModuleData,
): SoapFields {
  const confirmedNodes = composeNodes.filter(n => n.scenarioId !== '' && n.scenarioId != null)
  if (confirmedNodes.length === 0) return { ...primaryBaseFields }
  // 1剤目の groupKey / clinicalDomain を渡して reason 統合の同一性判定を正しく行う
  const currentGroupKey     = primaryScenario?.mergePolicy?.S?.groupKey
  const currentClinicalDomain = primaryMod.composition?.clinicalDomain
  return mergeBlocks(
    confirmedNodes.map(n => n.block),
    primaryBaseFields,
    primaryScenario?.title ?? '',
    primaryScenario ? resolveClosingText(primaryScenario, defaults) : undefined,
    undefined,           // currentDomain（旧引数: 未使用のまま維持）
    currentGroupKey,
    currentClinicalDomain,
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

  // ── 薬剤モジュール ─────────────────────────────────────────
  const [activeModuleData, setActiveModuleData] = useState<ModuleData>(moduleData)
  const [activeBrandName, setActiveBrandName] = useState<string | undefined>(undefined)
  /**
   * 1剤目の {{drug_subject}} / 表示名として使う名前。
   * 通常フローでは activeBrandName と同値。
   * Express GEモード選択時のみ GE名が入る（activeBrandName は先発名のまま）。
   */
  const [activeDrugDisplayName, setActiveDrugDisplayName] = useState<string | undefined>(undefined)
  /**
   * 1剤目が指す薬剤の domain state（`lib/brandResolution.ts`）。
   *
   * **U-4a では保持のみを行い、production の判断入力には使用しない。**
   * 薬剤名解決・handlingTags・scenario 表示・SOAP 生成のいずれも、引き続き
   * activeBrandName / activeDrugDisplayName（legacy 経路）が駆動する。
   * consumer 移行は U-4b、`denotation: 'module'` の安全 gate は U-5 の責務である
   * （`docs/OPEN_DESIGN_QUESTIONS.md` Q-S2）。
   *
   * undefined = 検索サジェスト以外の経路（初期ロード・Express）で薬剤が確定した状態。
   */
  const [activeResolution, setActiveResolution] = useState<BrandResolution | undefined>(undefined)
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

  // ── S relation/condition ─────────────────────────────────────
  const [sRelation, setSRelation] = useState<SRelation>('continued_do')
  const [sCondition, setSCondition] = useState<SCondition>('stable')

  // ── localSiteInput: display.localInput 対応モジュール用・部位入力 ──
  // 1剤目（primaryBaseFields）に紐づく部位入力値。
  // 2剤目以降（ComposeNode）は node.localSiteInput に個別保持する。
  // 現在の編集コンテキストに応じて activeLocalSiteInput を使う（下記参照）。
  const [localSiteInput, setLocalSiteInput] = useState('')

  // ── ペルソナ（文体切替）: 表示変換のみ、医療ロジック不変 ──
  // デフォルトは無変換（JSONそのまま）。ペルソナ切替ボタンで有効化できる。
  const [personaEnabled, setPersonaEnabled] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('concise')
  const [personaModalOpen, setPersonaModalOpen] = useState(false)

  // ══════════════════════════════════════════════════════════════
  // SOURCE OF TRUTH
  // ══════════════════════════════════════════════════════════════

  // 1剤目シナリオ ID（1剤目専用。ノード操作では絶対に書き換えない）
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  // 1剤目の確定 SOAP（addon 込み。ノード操作では絶対に書き換えない）
  const [primaryBaseFields, setPrimaryBaseFields] = useState<SoapFields>(EMPTY_FIELDS)

  // 1剤目の addon 選択状態（ノード操作では書き換えない）
  const [primaryAddonIds, setPrimaryAddonIds] = useState<Set<string>>(new Set())

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

  const primaryBaseFieldsRef  = useRef<SoapFields>(EMPTY_FIELDS)
  const primaryAddonIdsRef    = useRef<Set<string>>(new Set())
  const selectedAddonIdsRef   = useRef<Set<string>>(new Set())
  const editingNodeIdRef      = useRef<string | null>(null)
  const editingPrimaryRef     = useRef(false)
  const composeNodesRef       = useRef<ComposeNode[]>([])
  const primaryScenarioRef    = useRef<ModuleData['scenarios'][number] | undefined>(undefined)
  // persona 再計算用: 1剤目の rawFields / guard を保持
  const rawPrimaryFieldsRef   = useRef<SoapFields>(EMPTY_FIELDS)
  const primaryGuardRef       = useRef<ReturnType<typeof derivePersonaGuard> | null>(null)
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
  // 1剤目の BrandResolution を callback / useEffect から stale closure なしに読むための ref。
  // U-4a では保持のみ（読み出し側は U-4b / U-5 で追加する）。
  const activeResolutionRef = useRef<BrandResolution | undefined>(undefined)
  // handleSToggle 内で現在の sRelation/sCondition を stale closure なしに読むための ref。
  const sRelationRef  = useRef<SRelation>('continued_do')
  const sConditionRef = useRef<SCondition>('stable')
  // NLP生成モード専用 ref（将来機能・現在 UI 未接続）。
  // NLP生成モード（handleSwitchToNlp）に入る直前の manual 状態スナップショット。
  // handleSwitchToManual でこれをそのまま復元する（buildNodeFields は呼ばない）。
  // 通常の Rapid（右パネル S先頭文/ADDON ボタン）では一切使用しない。
  // handleSwitchToNlp は現在どの UI ボタンにも接続されていないため、常に null のまま。
  // null = スナップショットなし（現在 UI 未接続のため常にこの状態）。
  // → docs/feature-glossary.md「NLP生成」の定義を参照
  type ManualSnapshot = {
    primaryBaseFields:  SoapFields
    rawPrimaryFields:   SoapFields
    primaryGuard:       ReturnType<typeof derivePersonaGuard> | null
    selectedScenarioId: string | null
    selectedGroup:      MenuGroup | null
    primaryAddonIds:    Set<string>
    selectedAddonIds:   Set<string>
    sRelation:          SRelation
    sCondition:         SCondition
  }
  const manualSnapshotRef = useRef<ManualSnapshot | null>(null)
  // ユーザーが明示的に手動でシナリオを選択したときのみ true になるフラグ。
  // useEffect([selectedScenarioId]) 内で rapidBaseFieldsRef.current を null にするのは
  // このフラグが true のときだけに限定し、NLP 生成後の誤クリアを防ぐ。
  const manualScenarioSelectRef = useRef(false)
  // handleNlpGenerate / handleSwitchToManual 内で stale closure なしに参照するための ref
  const selectedScenarioIdRef = useRef<string | null>(null)
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
  const currentScenarioId: string | null = activeNode !== null
    ? (activeNode.scenarioId || null)
    : selectedScenarioId

  // ══════════════════════════════════════════════════════════════
  // DISPLAY FIELDS（derived: pure function、state は変えない）
  // ══════════════════════════════════════════════════════════════

  const displayFields = useMemo(
    () => computeDisplayFields(primaryBaseFields, primaryScenario, composeNodes, activeModuleData.defaults, activeModuleData),
    [primaryBaseFields, primaryScenario, composeNodes, activeModuleData],
  )

  // ── targetModule: activeContext のモジュール ─────────────────
  const targetModule = useMemo<ModuleData>(() => {
    if (activeNode === null) return activeModuleData
    return allModules.find(m => m.moduleId === activeNode.moduleId) ?? activeModuleData
  }, [activeNode, activeModuleData, allModules])

  // ── activeContextResolution: activeContext の BrandResolution ─
  // targetModule と同じ activeContext パターン（ノード編集中はそのノード、
  // それ以外は1剤目）。undefined = 検索サジェスト以外の経路（初期ロード・Express）。
  const activeContextResolution = useMemo<BrandResolution | undefined>(
    () => (activeNode !== null ? activeNode.resolution : activeResolution),
    [activeNode, activeResolution],
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
  // activeNode === null → グローバルの localSiteInput（1剤目用）
  const activeLocalSiteInput = activeNode !== null
    ? (activeNode.localSiteInput ?? '')
    : localSiteInput

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
    const primaryS = primaryBaseFields.S
    const patchedPrimaryS = primaryS
      ? (resolveS(primaryS, localSiteInput, activeModuleData, primarySLocalId) ?? primaryS)
      : primaryS
    const patchedPrimaryFields = { ...primaryBaseFields, S: patchedPrimaryS }

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
    return computeDisplayFields(patchedPrimaryFields, primaryScenario, patchedNodes, activeModuleData.defaults, activeModuleData)
  })()

  // ── Refs を render ごとに同期 ──────────────────────────────
  primaryBaseFieldsRef.current = primaryBaseFields
  primaryAddonIdsRef.current   = primaryAddonIds
  selectedAddonIdsRef.current  = selectedAddonIds
  editingNodeIdRef.current     = editingNodeId
  editingPrimaryRef.current    = editingPrimary
  composeNodesRef.current      = composeNodes
  primaryScenarioRef.current   = primaryScenario
  personaEnabledRef.current    = personaEnabled
  selectedPersonaRef.current   = selectedPersona
  uiModeRef.current                = uiMode
  activeDrugDisplayNameRef.current = activeDrugDisplayName
  activeResolutionRef.current      = activeResolution
  displayFieldsRef.current     = displayFields
  sRelationRef.current         = sRelation
  sConditionRef.current        = sCondition
  selectedScenarioIdRef.current = selectedScenarioId
  // 未編集状態のときだけスナップショットを追従させる。
  // editedSOAP が非null（編集中）のときは固定したまま更新しない。
  // これにより、mergeBlocks/addon の再計算が editSnapshotRef を汚染しない。
  if (editedSOAP === null) editSnapshotRef.current = displayFields

  // ── addonTargetScenario: activeContext のシナリオ（AddonPanel 用） ─
  const addonTargetScenario = useMemo(() => {
    if (activeNode === null) return primaryScenario
    if (!activeNode.scenarioId) return undefined
    return targetModule.scenarios.find(sc => sc.globalId === activeNode.scenarioId)
  }, [activeNode, targetModule, primaryScenario])

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
    // ノード編集中: そのノードの matchedBrandName / 1剤目操作中: activeBrandName
    const legacyBrandKey = activeNode !== null
      ? (activeNode.matchedBrandName ?? targetModule.drug?.brandNames?.[0])
      : (activeBrandName ?? activeModuleData.drug?.brandNames?.[0])
    return resolveBrandHandlingTags(activeContextResolution, brandCatalog, legacyBrandKey)
  }, [targetModule, activeNode, activeBrandName, activeModuleData, activeContextResolution])

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
  const resolvedBrand = activeBrandName ?? activeModuleData.drug?.brandNames?.[0]
  // tagBrandKey: brand 固有データアクセス（brandToTags）専用の安全なキー。
  // authoritative な brandKey が無い場合（generic / module）は null になり、
  // brandNames[0] へフォールバックしない（U-5）。表示には使用しない。
  const tagBrandKey = resolveDataAccessBrandKey(activeResolution, activeBrandName ?? activeModuleData.drug?.brandNames?.[0])
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
      const genericPart = brandCatalogGenericName ?? activeDrugDisplayName
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

  // S prefix/status リセット（シナリオ変更時）
  // thirdPanelSPlacement.enabled === true のシナリオに切り替わった場合のみ
  // sRelation / sCondition を初期値にリセットする。
  useEffect(() => {
    if (primaryScenario?.thirdPanelSPlacement?.enabled === true) {
      setSRelation('continued_do')
      setSCondition('stable')
    }
  }, [primaryScenario])

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
        ?? resolveDrugName(activeModuleData.drug, activeBrandName)
      const { fields: rawFields } = buildNodeFields(primaryScenario, activeModuleData, [], primaryDrugName)
      const guard = derivePersonaGuard(primaryScenario, activeModuleData.template?.urgentFlag)
      rawPrimaryFieldsRef.current = rawFields
      primaryGuardRef.current = guard
      if (isManualSelect) {
        rapidBaseFieldsRef.current = null  // ユーザーの手動シナリオ選択で NLP 原本をクリア
      }
      // persona が ON の場合は初期表示から変換済みフィールドを使用する
      // personaEnabled / selectedPersona は ref 経由で参照（effect の deps に加えない）
      const displayableFields = personaEnabledRef.current
        ? applyPersonaToFieldsWithGuard(rawFields, true, selectedPersonaRef.current, guard)
        : rawFields
      setPrimaryBaseFields(displayableFields)
      setPrimaryAddonIds(new Set())
      setSelectedAddonIds(new Set())
      setEditedSOAP(null)
    } else if (selectedScenarioId === null) {
      rawPrimaryFieldsRef.current = EMPTY_FIELDS
      primaryGuardRef.current = null
      if (isManualSelect) {
        rapidBaseFieldsRef.current = null  // シナリオ解除で NLP 原本をクリア
      }
      setPrimaryBaseFields(EMPTY_FIELDS)
      setEditedSOAP(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenarioId])
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
      setSelectedScenarioId(null)
      setPrimaryBaseFields(EMPTY_FIELDS)
      setPrimaryAddonIds(new Set())
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
    const { fields: rawFields, closingText, groupKey, clinicalDomain, closingBehavior } = buildNodeFields(sc, mod, addonIds, drugName)
    const guard = derivePersonaGuard(sc, mod.template?.urgentFlag)
    const fields = personaEnabled
      ? applyPersonaToFieldsWithGuard(rawFields, true, selectedPersona, guard)
      : rawFields
    const domain = resolveDomain(mod)
    return {
      ...node,
      scenarioId: newScenarioId,
      block: {
        id: node.block.id,
        templateLabel: sc.title,
        fields,
        rawFields,
        guard,
        symptomCodes: sc.sComposition?.symptomCodes,
        closingText,
        domain,
        groupKey,
        clinicalDomain,
        closingBehavior,
      },
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
      // useEffect([selectedScenarioId]) で rapidBaseFieldsRef を null にする条件として使う。
      manualScenarioSelectRef.current = true
      // 手動でシナリオを選択したら Rapid 前スナップショットは不要になるのでクリアする。
      manualSnapshotRef.current = null
      setSelectedScenarioId(prev => {
        if (prev === id) {
          // 同じシナリオを再タップ → 解除
          setPrimaryBaseFields(EMPTY_FIELDS)
          setPrimaryAddonIds(new Set())
          setSelectedAddonIds(new Set())
          setSRelation('continued_do')
          setSCondition('stable')
          return null
        }
        const sc = activeModuleData.scenarios.find(s => s.globalId === id)
        if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
        setSRelation('continued_do')
        setSCondition('stable')
        // primaryBaseFields は useEffect(selectedScenarioId) で同期される
        return id
      })
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
      setActiveModuleData(mod)
      setActiveBrandName(item.matchedBrandName)
      // U-4b: SOAP {{drug_subject}} は BrandResolution から解決する。
      // 旧実装は drugDisplayLabel と matchedBrandName の文字列比較から意味論を逆算していたが、
      // これは brandNames[0]（JSON の配列宣言順）を主語へ流す経路になっていた（F-3）。
      //
      // subject === null は denotation='module'（指示対象が未確定）のみ。この状態は U-5 gate に
      // より SOAP 生成へ到達しないため、代替値を生成しない。undefined は「主語の上書きなし」を
      // 意味する既存の state 表現であり、activeBrandName / drugDisplayLabel / brandNames[0] 等で
      // 埋めてはならない（DP-15）。
      const subject = resolveSubjectFromResolution(item.resolution)
      setActiveDrugDisplayName(subject ?? undefined)
      setActiveResolution(item.resolution)
      setDrugSelected(true)
      setSelectedScenarioId(null)
      setPrimaryBaseFields(EMPTY_FIELDS)
      setPrimaryAddonIds(new Set())
      setSelectedAddonIds(new Set())
      setSelectedGroup(null)
      setSRelation('continued_do')
      setSCondition('stable')
      setMainSearch('')
      setComposeNodes([])
      setEditingNodeId(null)
      setEditingPrimary(false)
      setPendingNodeIds(new Set())
      setEditedSOAP(null)
      setLocalSiteInput('')
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
      setLocalSiteInput(value)
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
  // derivePrimaryDisplayFields【H-1 対応】
  //
  // rawPrimaryFieldsRef（persona 未適用・ADDON/Rapid 反映済みベース）から
  // 表示用フィールドを導出する。personaEnabled が false、または guard が
  // 存在しない（シナリオ未確定）場合は raw をそのまま返す。
  //
  // handleAddonToggle（primary）/ handleSToggle が
  // raw ベースを更新した直後、この関数で表示を再導出することで、
  // 「persona 再計算の基点（raw）」と「表示中の本文」を常に同期させる。
  // reapplyPersonaToAllBlocks はこの関数を使わず現状のまま
  // （呼び出し時点で ref が未更新のため、明示的な nextEnabled/nextPersona 引数が必要）。
  // ─────────────────────────────────────────────────────────────

  const derivePrimaryDisplayFields = useCallback((raw: SoapFields): SoapFields => {
    const guard = primaryGuardRef.current
    if (!personaEnabledRef.current || !guard) return raw
    return applyPersonaToFieldsWithGuard(raw, true, selectedPersonaRef.current, guard)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // handleAddonToggle【Rapid 操作】
  //
  // Rapid の一部（右パネル ADDON ボタン）。Express / NLP生成とは無関係。
  //
  //   node    → ノードの block を addon 込みで再構築（composeNodes を書き換え）
  //   primary → rawPrimaryFieldsRef.current（persona 未適用ベース）から
  //             全 ADDON を剥がし選択分だけ再付加し、表示は persona を再適用して導出する
  //             （H-1 対応: raw が更新されないと persona トグルで ADDON が消失するため）
  //             ※ buildNodeFields は呼ばない（S先頭文・フラグ変更を保持するため）
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
            // node.resolvedDrugName を渡して {{drug_subject}} を再解決
            const { fields: rawFields, closingText, groupKey, clinicalDomain, closingBehavior } = buildNodeFields(sc, mod, newAddonIds, node.resolvedDrugName ?? '')
            const guard = derivePersonaGuard(sc, mod.template?.urgentFlag)
            const fields = personaEnabled
              ? applyPersonaToFieldsWithGuard(rawFields, true, selectedPersona, guard)
              : rawFields
            const domain = resolveDomain(mod)
            setComposeNodes(nodes.map(n =>
              n.id !== nodeId ? n : {
                ...n,
                block: { ...n.block, fields, rawFields, guard, closingText, domain, groupKey, clinicalDomain, closingBehavior },
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
        // raw ベースは setSelectedAddonIds の外でスナップショットする。
        // setSelectedAddonIds(prev => {...}) の内側で rawPrimaryFieldsRef を
        // 読み書きすると、React（StrictMode 下の開発時二重実行）が updater を
        // 2回呼んだ際に ref への書き込みが1回目の呼び出し間で可視化されてしまい、
        // 2回目の呼び出しが「1回目の結果を含む raw」から再度 ADDON を付加して
        // ADDON 文が二重に挿入される。呼び出し前に一度だけ読むことで、
        // updater が複数回呼ばれても結果が同じになる（冪等）ようにする。
        const rawBeforeToggle = rawPrimaryFieldsRef.current
        setSelectedAddonIds(prev => {
          const next = new Set(prev)
          next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)
          const newAddonIds = [...next]
          setPrimaryAddonIds(next)

          // ── Rapid ADDON 操作: primaryBaseFieldsRef.current をベースに
          // 全 ADDON テキストを一旦剥がし、選択中の ADDON だけ再付加する。
          // buildNodeFields は呼ばない（S先頭文/フラグ変更が消えるのを防ぐ）。
          {
            const addonItems = activeModuleData.addons?.items ?? {}

            // {{drug_subject}} を実薬剤名に解決するヘルパー
            // strip/add 両フェーズで同じ解決済みテキストを使うことで整合性を保つ
            const rapidDrugName = activeDrugDisplayNameRef.current ?? activeBrandName ?? ''
            const resolveAddonText = (t: string) =>
              rapidDrugName ? t.replaceAll('{{drug_subject}}', rapidDrugName) : t

            // 現在アクティブな ADDON テキストのみをセクション別に整理（剥がし対象）
            // 全アドオンではなく prev（トグル前のアクティブ set）のみを対象にすることで
            // 非アクティブなアドオンのテキストがシナリオ本文と一致しても誤 strip しない
            const allAddonTextsBySec = new Map<SoapKey, string[]>()
            for (const key of prev) {
              const item = addonItems[key]
              if (!item) continue
              if (item.sectionTexts) {
                for (const sec of ['S', 'A', 'P'] as const) {
                  const t = item.sectionTexts[sec]
                  if (!t) continue
                  const list = allAddonTextsBySec.get(sec) ?? []
                  list.push(resolveAddonText(t))
                  allAddonTextsBySec.set(sec, list)
                }
              } else {
                const sec = item.targetSection as SoapKey
                const list = allAddonTextsBySec.get(sec) ?? []
                list.push(resolveAddonText(item.text))
                allAddonTextsBySec.set(sec, list)
              }
            }

            // rawPrimaryFieldsRef（persona 未適用ベース）から全 ADDON テキストを除去してベースを得る
            // 行単位比較ではなく substring 除去を使う（複数行テキスト対応）
            // ※ H-1 対応: primaryBaseFieldsRef（表示ベース）ではなく raw を使うことで
            //   persona 再計算の基点に ADDON 分が確実に含まれるようにする
            // ※ ref を再読みせず rawBeforeToggle（呼び出し前スナップショット）を使う
            //   （updater 二重実行時の冪等性のため。上のコメント参照）
            const currentFields = rawBeforeToggle
            const stripped: SoapFields = { S: '', O: '', A: '', P: '' }
            for (const sec of ['S', 'O', 'A', 'P'] as const) {
              let val = currentFields[sec] ?? ''
              for (const addonText of (allAddonTextsBySec.get(sec) ?? [])) {
                const withSep = '\n' + addonText
                if (val.includes(withSep)) {
                  val = val.replace(withSep, '')
                } else {
                  val = val.replace(addonText, '')
                }
              }
              stripped[sec] = val
            }

            // 選択中 ADDON テキストをセクション別にまとめる
            const sectionMap = new Map<SoapKey, string[]>()
            for (const key of newAddonIds) {
              const item = addonItems[key]
              if (!item) continue
              if (item.sectionTexts) {
                for (const sec of ['S', 'A', 'P'] as const) {
                  const t = item.sectionTexts[sec]
                  if (!t) continue
                  if (!sectionMap.has(sec)) sectionMap.set(sec, [])
                  sectionMap.get(sec)!.push(resolveAddonText(t))
                }
              } else {
                const sec = item.targetSection
                if (!sectionMap.has(sec)) sectionMap.set(sec, [])
                sectionMap.get(sec)!.push(resolveAddonText(item.text))
              }
            }

            // ベースに選択 ADDON を付加して新しい primaryBaseFields を作る
            // P セクションのみ: closing 行（followup P）の前に ADDON テキストを挿入する
            const closingText = primaryScenarioRef.current
              ? resolveClosingText(primaryScenarioRef.current, activeModuleData.defaults)
              : undefined
            const overlaid: SoapFields = { ...stripped }
            for (const [sec, texts] of sectionMap) {
              const block = texts.join('\n')
              if (sec === 'P' && closingText) {
                // closing を一旦除去し ADDON テキストを挟んで再付加
                const withSep = '\n' + closingText
                const withoutClosing = overlaid.P.includes(withSep)
                  ? overlaid.P.replace(withSep, '')
                  : overlaid.P === closingText
                    ? ''
                    : overlaid.P
                overlaid.P = withoutClosing
                  ? `${withoutClosing}\n${block}\n${closingText}`
                  : `${block}\n${closingText}`
              } else {
                overlaid[sec] = overlaid[sec] ? `${overlaid[sec]}\n${block}` : block
              }
            }
            // raw ベースを更新し、表示は persona を再適用して導出する（H-1 対応）
            rawPrimaryFieldsRef.current = overlaid
            setPrimaryBaseFields(derivePrimaryDisplayFields(overlaid))
          }
          setEditedSOAP(null)
          return next
        })
      })
    }
  }, [activeModuleData, activeBrandName, activeDrugDisplayName, allModules, moduleData, personaEnabled, selectedPersona, confirmDiscard, derivePrimaryDisplayFields])

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
      // 同じボタンを再クリックした場合: S先頭文を解除してベースの S に戻す
      const isAlreadyActive =
        sRelationRef.current === relation && sConditionRef.current === condition
      if (isAlreadyActive) {
        // S先頭文の選択状態を解除し、表示を raw から再導出する。
        // raw 自体は変更しない（H-1 対応: raw ベースが persona 再計算の基点であり、
        // ここで書き換えると persona トグルで ADDON 分が消失する）。
        setSRelation('continued_do')
        setSCondition('stable')
        setPrimaryBaseFields(derivePrimaryDisplayFields(rawPrimaryFieldsRef.current))
        setEditedSOAP(null)
        return
      }
      setSRelation(relation)
      setSCondition(condition)
      // 汎用先頭文を生成（「前回から新しく薬を使用して〜」など）
      const newFirst = buildSFirstSentence(relation, condition)
      // この関数が呼ばれる時点で、表示条件（1剤目 + 副作用なし/CP良好）は
      // ThirdPanel 側で既に保証されている。
      // その安全な場面に限り、generic な「薬」を解決済み薬剤名に置換する。
      // relation ごとに薬剤名置換パターンを分ける。
      //   new_addition: 「薬を」→「{drug}を」
      //   med_changed:  「薬が変更と」→「{drug}に変更と」（stable/improved/unchanged/not_improved 共通）
      //   continued_do: 薬剤名なし（「引き続き使用して〜」は主語省略が自然）
      // resolveDrugName: 薬剤名解決のSSOT（ブランド未確定時は brandNames[0] の displayGenericName に解決）
      const drugName = activeDrugDisplayName
        ?? resolveDrugName(activeModuleData.drug, activeBrandName)
      // adjustmentExpression: S先頭文生成用（menuGroupLabels はメニュー表示専用・役割分離）
      // display.adjustmentExpression が最優先。省略時は従来の増量/減量テンプレートにフォールバック。
      const adjustmentExpression = activeModuleData.display?.adjustmentExpression
      // condition に応じた後続句（adjustmentExpression あり時に使用）
      const condSuffix = (() => {
        switch (condition) {
          case 'stable':       return '症状は落ち着いている。'
          case 'improved':     return '症状は良くなってきた。'
          case 'unchanged':    return '症状は変わりない。'
          case 'not_improved': return '十分な改善はみられない。'
        }
      })()
      const resolvedFirst = (() => {
        if (!drugName) return newFirst
        if (relation === 'new_addition')   return newFirst.replace('薬を', `${drugName}を`)
        if (relation === 'med_changed')    return newFirst.replace('薬が変更と', `${drugName}に変更と`)
        if (relation === 'dose_increased') {
          if (adjustmentExpression) {
            // adjustmentExpression あり: 「前回から{drug}の{increasePast}が、{condSuffix}」
            return `前回から${drugName}の${adjustmentExpression.increasePast}が、${condSuffix}`
          }
          return newFirst
            .replace('薬が増量となり', `${drugName}が増量となり`)
            .replace('薬が増量となったが', `${drugName}が増量となったが`)
        }
        if (relation === 'dose_decreased') {
          if (adjustmentExpression) {
            // adjustmentExpression あり: 「前回から{drug}の{decreasePast}が、{condSuffix}」
            return `前回から${drugName}の${adjustmentExpression.decreasePast}が、${condSuffix}`
          }
          return newFirst
            .replace('薬が減量となり', `${drugName}が減量となり`)
            .replace('薬が減量となったが', `${drugName}が減量となったが`)
        }
        return newFirst  // continued_do: 薬剤名なしが自然
      })()
      // Rapid 原本（NLP専用・現在UI未接続のため通常は null）がある場合は
      // rapidBaseFieldsRef をベースに S だけ差し替える（既存のNLP経路の分岐を変更しない）。
      // 通常経路（rapidBaseFieldsRef が null）は raw ベースを更新し、
      // 表示は persona を再適用して導出する（H-1 対応）。
      const rapidBase = rapidBaseFieldsRef.current
      if (rapidBase !== null) {
        const updated = replaceSFirstSentence(rapidBase.S, resolvedFirst)
        setPrimaryBaseFields({ ...rapidBase, S: updated })
      } else {
        const rawBase = rawPrimaryFieldsRef.current
        const updatedRaw = { ...rawBase, S: replaceSFirstSentence(rawBase.S, resolvedFirst) }
        rawPrimaryFieldsRef.current = updatedRaw
        setPrimaryBaseFields(derivePrimaryDisplayFields(updatedRaw))
      }
      setEditedSOAP(null)
    })
  }, [activeBrandName, activeDrugDisplayName, activeModuleData, confirmDiscard, derivePrimaryDisplayFields])

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
        setActiveModuleData(mod)
        setActiveBrandName(resolvedBrandKey)
        // displayName が指定されていて brandKey と異なる場合のみ activeDrugDisplayName に設定
        // （handleSelectDrugSuggestion と同じロジック）
        setActiveDrugDisplayName(
          resolvedDisplayName !== resolvedBrandKey ? resolvedDisplayName : undefined,
        )
        // Express は DrugSuggestionItem を経由しないため BrandResolution を持たない。
        // primary context が Express へ切り替わる時点で、直前の検索由来 resolution を
        // 必ず破棄する（残すと U-5 gate が前の context の denotation で誤発火する）。
        // undefined は「legacy / 非検索経路」を表す既存契約であり、新しい resolution を
        // 生成する処理ではない（lib/brandTags.ts）。
        setActiveResolution(undefined)
        setDrugSelected(true)
        setComposeNodes([])
        setEditingNodeId(null)
        setEditingPrimary(false)
        setPendingNodeIds(new Set())
        setMainSearch('')
        setComposeSearch('')  // サブカテゴリ選択でセットされた値をリセット
        // シナリオを即時確定（通常フローでは handleSelectScenario が行う処理を一括実行）
        setSelectedScenarioId(globalId)
        setSelectedGroup(getMenuGroupFromScenario(sc))
        setSRelation('continued_do')
        setSCondition('stable')
        setPrimaryAddonIds(new Set())
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
        primaryBaseFields:  { ...primaryBaseFieldsRef.current },
        rawPrimaryFields:   { ...rawPrimaryFieldsRef.current },
        primaryGuard:       primaryGuardRef.current,
        selectedScenarioId: selectedScenarioIdRef.current,
        selectedGroup:      selectedGroup,
        primaryAddonIds:    new Set(primaryAddonIdsRef.current),
        selectedAddonIds:   new Set(selectedAddonIdsRef.current),
        sRelation:          sRelationRef.current,
        sCondition:         sConditionRef.current,
      }
      setUiMode('nlp')
      setSelectedScenarioId(null)
      setPrimaryBaseFields(EMPTY_FIELDS)
      setPrimaryAddonIds(new Set())
      setSelectedAddonIds(new Set())
      setSelectedGroup(null)
      setSRelation('continued_do')
      setSCondition('stable')
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
      rawPrimaryFieldsRef.current = snap.rawPrimaryFields
      primaryGuardRef.current     = snap.primaryGuard
      setPrimaryBaseFields(snap.primaryBaseFields)
      setPrimaryAddonIds(snap.primaryAddonIds)
      setSelectedAddonIds(snap.selectedAddonIds)
      setSRelation(snap.sRelation)
      setSCondition(snap.sCondition)
      setSelectedGroup(snap.selectedGroup)
      setEditedSOAP(null)
      restoringFromSnapshotRef.current = true
      setSelectedScenarioId(snap.selectedScenarioId)
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
      rawPrimaryFieldsRef.current = nlpFields
      primaryGuardRef.current = guard
      // persona が ON かつ guard がある場合は変換済みフィールドを表示する
      const displayableFields = (personaEnabledRef.current && guard)
        ? applyPersonaToFieldsWithGuard(nlpFields, true, selectedPersonaRef.current, guard)
        : nlpFields
      // rapidBaseFieldsRef には画面表示と完全一致する最終本文を保存する。
      // S先頭文・ADDON 操作はこれをベースに差分だけ重ねる。
      // persona 変換済み・addonsRef 展開済みの displayableFields を原本とする。
      rapidBaseFieldsRef.current = displayableFields
      setPrimaryBaseFields(displayableFields)
      if (result.scenarioId) {
        // scenarioIdFromNlpRef を true にしてから setSelectedScenarioId を呼ぶ。
        // useEffect([selectedScenarioId]) はこの ref が true のときはスキップし、
        // rapidBaseFieldsRef / rawPrimaryFieldsRef / primaryBaseFields を上書きしない。
        scenarioIdFromNlpRef.current = true
        setSelectedScenarioId(result.scenarioId)
        if (sc) setSelectedGroup(getMenuGroupFromScenario(sc))
      }
    } else {
      rawPrimaryFieldsRef.current = EMPTY_FIELDS
      primaryGuardRef.current = null
      rapidBaseFieldsRef.current = null  // NLP 生成失敗: 原本をクリア
      setPrimaryBaseFields(EMPTY_FIELDS)
      setSelectedScenarioId(null)
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
    const rawPrimary = rawPrimaryFieldsRef.current
    const primaryGuard = primaryGuardRef.current
    if (primaryGuard) {
      const fields = nextEnabled
        ? applyPersonaToFieldsWithGuard(rawPrimary, true, nextPersona, primaryGuard)
        : rawPrimary
      setPrimaryBaseFields(fields)
    }
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
            currentSRelation={sRelation}
            currentSCondition={sCondition}
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
