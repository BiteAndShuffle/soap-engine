// ─────────────────────────────────────────────────────────────
// 基本型
// ─────────────────────────────────────────────────────────────

export type SoapKey = 'S' | 'O' | 'A' | 'P'

export const SOAP_KEYS: SoapKey[] = ['S', 'O', 'A', 'P']

export type SoapFields = Record<SoapKey, string>

// ─────────────────────────────────────────────────────────────
// sideEffectPresence — グルーピングの唯一のソース（SSOT）
//
//   "absent_or_not_observed" → 副作用なし
//   "present_mild"           → 副作用あり（軽微・経過観察）
//   "present_moderate"       → 副作用あり（中等度・要対応）
//   "present_dose_decrease"  → 副作用あり → 減量で対応
//   "present_change"         → 副作用あり → 変更で対応
//   "present_stop"           → 副作用あり → 中止
//   "not_applicable"         → 副作用メニュー対象外（初回・増量・減量・CP・終了 等）
// ─────────────────────────────────────────────────────────────

export type SideEffectPresence =
  | 'absent_or_not_observed'
  | 'present_mild'
  | 'present_moderate'
  | 'present_dose_decrease'
  | 'present_change'
  | 'present_stop'
  | 'not_applicable'

// ─────────────────────────────────────────────────────────────
// SComposition（S欄合成メタデータ）
//
// 2剤目合成時に S フィールドを構成するためのメタデータ。
//   intent        — このシナリオの意図（new_addition / dose_increase / etc）
//   template      — S 合成テンプレート種別（symptom_based / status_based）
//   symptomCodes  — S 合成で使用する症状コード（英語 snake_case）。
//                   absent_or_not_observed は空配列 []
//   symptoms      — 表示用日本語症状名リスト（symptomCodes に対応）
// ─────────────────────────────────────────────────────────────

export interface SComposition {
  intent: string
  template: string
  symptomCodes: string[]
  symptoms: string[]
}

// ─────────────────────────────────────────────────────────────
// StructuredEntry（SStructured / OStructured / AStructured / PStructured の各要素）
//
// 全既存モジュールに SStructured / AStructured / PStructured が存在する。
// 一部モジュールは OStructured を空配列として持つ。
// runtime 未接続（moduleValidator check #16 で text 同期チェックのみ使用）。
// ─────────────────────────────────────────────────────────────

export interface StructuredEntry {
  id: string
  text: string
  role?: string
  transform?: string
  safety?: string
  lockTerms?: string[]
  notes?: string | null
}

// ─────────────────────────────────────────────────────────────
// Scenario（新スキーマ: scenarios[] で定義）
//
// 旧 Template の後継。SOAP フィールドを直接持ち、
// sideEffectPresence でグルーピングを管理する。
// ─────────────────────────────────────────────────────────────

export interface Scenario {
  /** module 内ローカル識別子（旧 templateId に相当） */
  id: string
  /** アプリ全体の一意識別子（形式: moduleId + "." + id） */
  globalId: string
  /** 表示タイトル（Col2 表示の元）*/
  title: string
  /** シナリオ種別（治療一般 / 副作用 / アドヒアランス 等） */
  scenarioType: string
  /** シナリオグループ（検索・フィルタ用） */
  scenarioGroup: string
  /**
   * 副作用存在フラグ — グルーピングの SSOT。
   *   "absent_or_not_observed" → 副作用なし グループ
   *   "present"                → 副作用あり グループ
   *   "not_applicable"         → 副作用軸以外のグループ
   */
  sideEffectPresence: SideEffectPresence
  /** SOAP フィールド（直接持つ） */
  S: string
  O: string
  A: string
  P: string
  /**
   * addons.items への参照（セクション別キー一覧）。
   * 存在する場合、SOAP生成時に対応セクションへ追記する。
   * scenario に定義がない場合は orderPresets.initial_default を使用。
   */
  addonsRef?: {
    S?: string[]
    O?: string[]
    A?: string[]
    P?: string[]
  }
  /**
   * followupRef — defaults.followupProfiles のキーを参照する（新スキーマ）。
   * 存在する場合、対応するプロファイルの値を末尾に追加。
   * followup より優先される。
   */
  followupRef?: string
  /**
   * followup 制御（旧スキーマ・後方互換）。
   *   "default" → defaults.followup の値を末尾に追加
   *   null      → followup を追加しない
   * 省略時は null 扱い（何も追加しない）。
   * followupRef が存在する場合はそちらが優先される。
   */
  followup?: {
    S?: 'default' | null
    P?: 'default' | null
  }
  /**
   * S欄合成メタデータ — 2剤目合成時の S フィールド構成に使用。
   * 省略時は undefined（合成対象外）。
   */
  sComposition?: SComposition
  /**
   * シナリオ表示フィルタ用タグ。
   * addons.items[*].requiredTags と同じ AND 条件で
   * selectedBrand の handlingTags と照合する。
   * 未定義または空配列 → 常時表示（ブランド非依存）。
   * 例: ["bilastine"] → bilastine handlingTag を持つブランド選択時のみ表示。
   */
  scenarioRequiredTags?: string[]
  /**
   * シナリオ意味タグ — MenuGroup 分類・S置換UI eligibility 判定に使用。
   * 増量: "increase" / 減量: "decrease" / 副作用なし: "absent" / CP良好: "good" 等。
   * 新規モジュールはこのフィールドを設定するだけで UI 分類・S置換UI が自動反映される。
   */
  scenarioTags?: string[]
  /** 意味タグ（intentTags）— 文章の意味的役割を表す */
  intentTags?: string[]
  /** 臨床タグ（将来拡張用） */
  clinicalTags?: string[]
  /** 服薬指導タグ（将来拡張用） */
  counselingTags?: string[]
  /** ワークフロータグ（将来拡張用） */
  workflowTags?: string[]

  // ── 将来の競合制御用メタデータ（現在 buildSoap では未使用） ──
  /**
   * シナリオ優先順位。将来の自動選定ロジックで使用予定。
   * 現時点では buildSoap に影響しない。
   */
  priority?: number | null
  /**
   * 排他グループ名。同一グループ内では1件のみ採用する制御を将来実装予定。
   * 現時点では buildSoap に影響しない。
   */
  exclusiveGroup?: string | null
  /**
   * 他 scenario と同時採用可能か。将来の combinable 制御で使用予定。
   * 現時点では buildSoap に影響しない。
   */
  combinable?: boolean | null
  /**
   * サードパネルS配置制御。
   * enabled: true の scenario を単剤選択中のときのみ、S先頭文置換UIを表示する。
   * trigger: "single_drug_only" — composeNodes.length === 0 の単剤時のみ有効。
   * mode: "replace" — 先頭文を置換する（現状唯一のモード）。
   * persistAsCompositionBase: true — 置換後Sを primaryBaseFields.S に保持し、
   *   2剤目追加時の mergeBlocks ベースとして使用する。
   * 省略時は表示しない。
   */
  thirdPanelSPlacement?: {
    enabled: boolean
    trigger: 'single_drug_only'
    mode: 'replace'
    persistAsCompositionBase: boolean
  }
  /**
   * 合成ポリシー（S/O/A/P ごとの挙動を宣言）。
   * buildSoap.ts の mergeBlocks で参照される。
   * 省略時は旧来の固定ロジック（append / buildS / buildP）にフォールバック。
   */
  mergePolicy?: ScenarioMergePolicy
  /**
   * Structured テキスト分解（runtime 未接続・moduleValidator check #16 で text 同期チェックに使用）。
   * 全既存モジュールに SStructured / AStructured / PStructured が存在する。
   * OStructured は一部モジュールに空配列として存在する。
   */
  SStructured?: StructuredEntry[]
  OStructured?: StructuredEntry[]
  AStructured?: StructuredEntry[]
  PStructured?: StructuredEntry[]
}

// ─────────────────────────────────────────────────────────────
// ScenarioMergePolicy（scenarios[].mergePolicy 型）
// ─────────────────────────────────────────────────────────────

export interface ScenarioMergePolicyS {
  domain?: string
  behavior?: string
  /**
   * S欄グルーピングキー。同一 groupKey + 同一 clinicalDomain のブロック間でのみ
   * reason 結合を許可する。異なる groupKey は分離される。
   */
  groupKey?: string
  mergeLevel?: string
  sectionRole?: string
}

export interface ScenarioMergePolicyP {
  behavior?: string
  mergeLevel?: string
  /**
   * closing の扱い。
   *
   *   "dedupe_or_last"（唯一の実運用値）:
   *     同一 closing が連続している間は body だけ積み上げ、
   *     closing が変わるタイミングで1回だけ出力する。
   *     後処理の dedupeClosingLines() により「次回」始まりの重複行も除去される。
   *     省略時もこの挙動が適用される。
   *
   *   "append_all"（将来拡張予約値 — 現在は未サポート・未使用）:
   *     buildP 内に分岐は存在するが、後処理 dedupeClosingLines() との
   *     組み合わせで意図どおりに動作しないことが確認されている。
   *     現行 JSON では使用不可。正式サポート前に dedupeClosingLines の
   *     挙動との整合を取る必要がある。
   *
   * ⚠️ JSON に "append_all" を設定しないこと。
   */
  closingBehavior?: 'dedupe_or_last' | 'append_all'
  sectionRole?: string
}

export interface ScenarioMergePolicyOA {
  behavior?: string
  mergeLevel?: string
  sectionRole?: string
}

export interface ScenarioMergePolicy {
  S?: ScenarioMergePolicyS
  O?: ScenarioMergePolicyOA
  A?: ScenarioMergePolicyOA
  P?: ScenarioMergePolicyP
}

// ─────────────────────────────────────────────────────────────
// Addon（新スキーマ: addons.items 内の各アイテム）
// ─────────────────────────────────────────────────────────────

export interface AddonItem {
  /** addons.items のマップキーと一致するキー（例: "counseling:counseling_1"） */
  key?: string
  id: string
  /** UI表示用タイトル。省略時は text をフォールバック表示する */
  title?: string
  group: string
  targetSection: 'S' | 'O' | 'A' | 'P'
  text: string
  /**
   * 複数セクションへの追記テキスト（optional）。
   * 存在する場合、targetSection + text の代わりに各セクションへ追記する。
   * 未定義の場合は既存の targetSection + text で動作する（後方互換）。
   * text は P_APPEND 相当として維持し、sectionTexts.P と同値にすること。
   */
  sectionTexts?: {
    S?: string
    A?: string
    P?: string
  }
  /** 意味タグ（intentTags）— 文章の意味的役割を表す */
  intentTags?: string[]
  /** 臨床タグ（将来拡張用） */
  clinicalTags?: string[]
  /** 服薬指導タグ（将来拡張用） */
  counselingTags?: string[]
  /** ワークフロータグ（将来拡張用） */
  workflowTags?: string[]
  /**
   * 表示に必要な handlingTags（AND条件）。
   * brandCatalog[brand].handlingTags がこの配列の全要素を含む場合に表示する。
   * 未定義または空配列の場合は常時表示。
   */
  requiredTags?: string[]
  /**
   * ボタンの視覚的バリアント。右アクセントライン色で分類を表現。
   * "rightAccentBlue":     青ライン（通知系・準備系 — 行動変容施策）。
   * "rightAccentLavender": ラベンダーライン（見える化系・支援系 — 補助的施策）。
   * 未定義: 通常スタイル。選択中は uiVariant によらず常に active スタイルが適用される。
   */
  uiVariant?: 'rightAccentBlue' | 'rightAccentLavender'
}

/**
 * addons.items の形式: "group:id" をキーとする Record。
 * 例: { "counseling:counseling_1": { id, group, targetSection, text }, ... }
 */
export type AddonsItems = Record<string, AddonItem>

export interface AddonsData {
  items: AddonsItems
  orderPresets: Record<string, string[]>
}

// ─────────────────────────────────────────────────────────────
// TagCatalog（モジュールレベルのタグ語彙レジストリ）
// ─────────────────────────────────────────────────────────────

export interface TagCatalog {
  intentTags?: string[]
  clinicalTags?: string[]
  counselingTags?: string[]
  workflowTags?: string[]
}

// ─────────────────────────────────────────────────────────────
// Persona（スタイルプロファイル）
// ─────────────────────────────────────────────────────────────

export interface PersonaStyleProfile {
  sentenceTone?: string | null
  warningTone?: string | null
  proposalTone?: string | null
  closingTone?: string | null
}

export interface PersonaConfig {
  defaultStyle?: string
  availableStyles?: string[]
  styleProfiles?: Record<string, PersonaStyleProfile>
}

// ─────────────────────────────────────────────────────────────
// DrugSearch（drug.search ブロック）
// ─────────────────────────────────────────────────────────────

export interface DrugSearchMatchPolicy {
  preferExactAlias: boolean
  allowPrefixMatch: boolean
  suppressCrossModuleSuggestionsOnExactHit: boolean
}

export interface DrugSearch {
  primaryDisplayName: string
  priority: number
  exactAliases: string[]
  /** @deprecated JSON への記載不要。nameAliases / brandNames から前方一致を自動生成。 */
  prefixAliases?: string[]
  nameAliases?: string[]
  keywords: string[]
  matchPolicy: DrugSearchMatchPolicy
  /**
   * 薬剤クラス・薬剤名を識別するひらがな共通トークン群。
   * alias ではない。aliases / normalizedAliases 系フィールドへ展開禁止（P0-A SSOT）。
   * 例（ヘパリン類似物質）: ["へぱ", "へぱり", "へぱりん", "へぱりんるいじ"]
   */
  commonSearchTokens?: string[]
  /**
   * 剤形を識別するひらがな前方一致トークン群。
   * AND 検索の第2トークン以降を剤形語として評価する際に使用。
   * 例（クリーム）: ["くり", "くりーむ"]
   * 例（軟膏）:     ["なん", "なんこう", "ゆせい", "ゆせいくりーむ", "そふと"]
   * 例（ローション）: ["ろー", "ろーしょん"]
   */
  formulationSearchTokens?: string[]
}

// ─────────────────────────────────────────────────────────────
// BrandCatalog（drug.brandCatalog ブロック）
// ─────────────────────────────────────────────────────────────

/**
 * ブランド名ごとのエントリ。
 * displayName  — 表示用ブランド名（brandCatalog キーと一致）
 * genericName  — 化合物レベルの一般名（drug.genericName はクラス名のため別管理）
 * aliases      — カナ・略称など検索用の別名
 * normalizedAliases — aliases をひらがな正規化したもの（検索インデックス用）
 */
export interface BrandEntry {
  displayName: string
  genericName: string
  /**
   * Topbar や検索候補で優先表示する一般名。
   * genericName より細粒度の表示用名称が必要な場合に設定する。
   * 省略時は genericName を使用する。
   */
  displayGenericName?: string
  aliases: string[]
  normalizedAliases: string[]
  /** ブランド固有の取り扱いタグ（遮光保存・懸濁など）。addonFilter で使用 */
  handlingTags?: string[]
  /** 製剤タイプ: solution / suspension など */
  formulationType?: string
  /** 保管タイプ: room_temperature / light_protection / cold_storage など */
  storageType?: string
}

export interface Drug {
  genericName?: string
  brandNames?: string[]
  drugClass?: string[]
  route?: string
  dosageForms?: string[]
  drugSpecificTags?: string[]
  nameAliases?: string[]
  search?: DrugSearch
  /**
   * ブランド名 → BrandEntry の正本辞書。
   * brandNames はこの辞書の表示順リストとして機能する（集合一致が必須）。
   * brandCatalog が存在する場合、表示順は brandNames の並びに従う。
   */
  brandCatalog?: Record<string, BrandEntry>
  /**
   * ひらがなエイリアス → ブランド名 のフラット逆引きマップ。
   * brandCatalog.aliases をひらがな正規化した値がキー。
   * UI 検索での高速ルックアップ用。
   */
  aliasToBrand?: Record<string, string>
}

// ─────────────────────────────────────────────────────────────
// DrugResolution（ブランド名 → 成分タグ のマッピング）
// ─────────────────────────────────────────────────────────────

export interface DrugResolution {
  /**
   * ブランド名 → タグ配列。
   * タグは成分識別子（"semaglutide", "liraglutide" 等）を含む。
   * TAG_TO_GENERIC_NAME と組み合わせてブランドごとの一般名を解決する。
   */
  brandToTags: Record<string, string[]>
}

/**
 * 成分タグ → 日本語一般名 の変換テーブル。
 * DrugResolution.brandToTags のタグから一般名を導出する際に使用。
 */
export const TAG_TO_GENERIC_NAME: Record<string, string> = {
  semaglutide:  'セマグルチド',
  liraglutide:  'リラグルチド',
  dulaglutide:  'デュラグルチド',
  exenatide:    'エキセナチド',
  lixisenatide: 'リキシセナチド',
  tirzepatide:  'チルゼパチド',
  insulin:      'インスリン',
}

// ─────────────────────────────────────────────────────────────
// ComposeNode（合成ノード: 2剤目以降の合成対象）
//
// composeNodes: ComposeNode[] で複数薬剤を管理する。
//   moduleId   — どのモジュールから選んだか
//   scenarioId — scenario.globalId
//   block      — buildSoap済みの MergedBlock スナップショット
//   drugLabel  — ノードに表示する薬剤名ラベル（drug.brandNames[0] など）
// ─────────────────────────────────────────────────────────────

export interface ComposeNode {
  /** ユニークID（Date.now() + random） */
  id: string
  /** モジュールID */
  moduleId: string
  /** scenario.globalId */
  scenarioId: string
  /** SOAP スナップショット（addon 込み確定済み。P closing dedup 用メタデータ含む） */
  block: MergedBlock
  /** ノード表示用薬剤ラベル */
  drugLabel: string
  /**
   * このノードで確定した addon キーの一覧。
   * ノードクリック時に UI（selectedAddonIds）へ復元する。
   * addon なしで確定した場合は空配列。
   */
  selectedAddonIds: string[]
  /**
   * このノードの確定シナリオタイトル（mergeBlocks の currentLabel に使用）。
   * selectedScenario（1剤目）を参照せずにノード固有の主語を保持するため。
   */
  baseLabel: string
  /**
   * このノードの S欄ドメイン（mergeBlocks の currentDomain に使用）。
   * composition.domain → categoryPath[1] → categoryPath[0] → moduleId の優先順。
   */
  baseDomain: string
  /**
   * サジェスト時にユーザーが選択したブランド名。
   * {{drug_subject}} スロット解決の最優先値として使用。
   * 未確定ノード（pending）では undefined の場合がある。
   */
  matchedBrandName?: string
  /**
   * 解決済み薬剤名（{{drug_subject}} の代入値）。
   * matchedBrandName → drug.brandNames[0] → drug.genericName の順で解決済み。
   * buildNodeFields / handleAddonToggle から参照される。
   */
  resolvedDrugName?: string
  /**
   * このノードに紐づく localSiteInput（部位入力値）。
   * display.localInput.insertMode === 'placeholder' のモジュールで使用する。
   * 空文字 = 未入力。{{applicationSite}} は未入力時に自動除去される。
   * 薬剤ごとに異なる部位を指定できるよう、グローバル state とは分離して保持する。
   */
  localSiteInput?: string
}

// ─────────────────────────────────────────────────────────────
// MergedBlock（保持＝合成機能）
// ─────────────────────────────────────────────────────────────

export interface MergedBlock {
  /** ユニークID */
  id: string
  /** 合成時のシナリオタイトル（区切りヘッダ表示用） */
  templateLabel: string
  /** 合成時の SOAP フィールド（スナップショット） */
  fields: SoapFields
  /**
   * S欄合成用の症状コード（sComposition.symptomCodes スナップショット）。
   * 2剤目合成時に S フィールドを構成するために使用。
   * 省略時は undefined。
   */
  symptomCodes?: string[]
  /**
   * P末尾 closing テキスト（deduplication 用）。
   * mergeBlocks で同一の closing が複数ある場合、最後の1件のみ出力。
   */
  closingText?: string
  /**
   * P closing の重複排除挙動（scenario.mergePolicy.P.closingBehavior スナップショット）。
   *
   *   "dedupe_or_last"（実運用値）:
   *     同一 closing を最後の1件のみ出力する。省略時もこの挙動。
   *
   *   "append_all"（将来拡張予約値 — 現在は未サポート・未使用）:
   *     ScenarioMergePolicyP.closingBehavior の注記を参照。
   *     現行 JSON では使用不可。
   *
   * ⚠️ JSON に "append_all" を設定しないこと。
   */
  closingBehavior?: 'dedupe_or_last' | 'append_all'
  /**
   * S欄ドメイン別まとめ用。
   * composition.domain → categoryPath[1] → categoryPath[0] → moduleId の優先順で決定。
   */
  domain?: string
  /**
   * S欄のグルーピングキー（scenario.mergePolicy.S.groupKey スナップショット）。
   * 異なる groupKey 間では reason 結合を行わない。
   */
  groupKey?: string
  /**
   * 臨床ドメイン（composition.clinicalDomain スナップショット）。
   * 異なる clinicalDomain 間では S を統合しない。
   */
  clinicalDomain?: string
  /**
   * persona 変換前の原文フィールド（再計算ソース）。
   * persona ON/OFF 切替や persona 変更時に rawFields から再変換する。
   * persona 未適用時は fields と同値（参照一致でなくてもよい）。
   */
  rawFields?: SoapFields
  /**
   * このブロックのシナリオから派生した PersonaGuard。
   * block 単位の persona 変換制御に使用する。
   * rawFields と常にセットで保存すること。
   */
  guard?: import('./personaGuard').PersonaGuard
}

// ─────────────────────────────────────────────────────────────
// ModuleData（新スキーマ JSON ルート）
// ─────────────────────────────────────────────────────────────

export interface EmergencyCriteria {
  seekUrgentCareIf?: string[]
  contactPrescriberIf?: string[]
}

/** risks.conditional の1件 */
export interface ConditionalRisk {
  risk: string
  rule: {
    whenAny?: string[]
    whenAll?: string[]
  }
}

/** risks ブロック */
export interface ModuleRisks {
  primary?: string[]
  conditional?: ConditionalRisk[]
}

/** searchConfig.normalize */
export interface SearchNormalizeConfig {
  toHiragana?: boolean
  lowerLatin?: boolean
  stripSymbols?: boolean
  zenkakuToHankaku?: boolean
  trimSpaces?: boolean
}

/** searchConfig.multiTerm */
export interface MultiTermConfig {
  enabled?: boolean
  operator?: 'AND' | 'OR'
  match?: 'prefix' | 'contains'
}

/** searchConfig ブロック */
export interface ModuleSearchConfig {
  minPrefixLen?: number
  normalize?: SearchNormalizeConfig
  multiTerm?: MultiTermConfig
}

/** index ブロック */
export interface ModuleIndex {
  searchableText?: string[]
  normalizedTokens?: string[]
  facets?: Record<string, string[]>
}

export interface ModuleTemplate {
  templateId?: string
  templateVersion?: string
  situationTags?: string[]
  severityTags?: string[]
  /** 旧スキーマ互換 */
  emergencyFlag?: boolean
  emergencyCriteria?: EmergencyCriteria
  /** 新スキーマ */
  urgentFlag?: boolean
  urgentCriteria?: EmergencyCriteria
}

export interface ModuleData {
  moduleId: string
  moduleVersion?: string
  categoryPath?: string[]
  /** 合成ノード表示設定 */
  composition?: {
    domain?: string
    priority?: number
    /** ノードバーに表示する短縮ラベル（未指定時は NODE_LABEL_MAP / categoryPath[1] / brandNames[0] で決定） */
    nodeLabel?: string
    /** ノードバーに表示する短縮ラベル（canonical source: composition.nodeLabelShort） */
    nodeLabelShort?: string
    /** ノードバーに表示する長ラベル（canonical source: composition.nodeLabelLong） */
    nodeLabelLong?: string
    /**
     * 剤形単位のノード識別子。合成ロジック・persona・UI grouping で使用。
     * 例: "glp1ra_oral", "glp1ra_injection"（旧互換値: "glp1"）
     * 未定義のモジュールは旧設計扱いとしてフォールバック処理する。
     */
    nodeKey?: string
    /**
     * 薬効クラス識別子。nodeKey より上位の概念で、剤形をまたいだクラス統合に使用。
     * 例: "glp1ra"。未定義モジュールは旧互換として無視される。
     */
    classKey?: string
    /**
     * 臨床ドメイン識別子。S欄合成時に異なるドメイン間の統合を防ぐために使用。
     * 例: "diabetes", "respiratory"
     */
    clinicalDomain?: string
    /**
     * S統合ドメイン識別子。将来の S 統合分離ロジックで使用予定。
     * 現時点では MergedBlock への伝播のみ行い、合成判定には未使用。
     */
    sMergeDomain?: string
  }
  drug?: Drug
  drugResolution?: DrugResolution
  display?: {
    title: string
    subtitle: string
    drugClassLabel?: string
    drugGeneric?: string
    /** composition.nodeLabelShort の表示側 projection（canonical source は composition） */
    nodeLabelShort?: string
    /** composition.nodeLabelLong の表示側 projection */
    nodeLabelLong?: string
    /** composition.nodeKey の表示側 projection */
    nodeKey?: string
    /**
     * 左メニューの MenuGroup 表示ラベルをモジュール単位でオーバーライドする。
     * キーは MenuGroup の標準値、値は表示したいラベル文字列。
     * 省略されたキーはデフォルト値をそのまま使用する。
     * 例: { "増量": "回数増", "減量": "回数減" }
     */
    menuGroupLabels?: Record<string, string>
    /**
     * dose_increased / dose_decreased の S先頭文生成に使う動詞句。
     * menuGroupLabels はメニュー表示用、adjustmentExpression は文生成専用として役割を分離する。
     *
     * increasePast — dose_increased 時に使う過去形表現（例: "点眼回数が増えた"）
     * decreasePast — dose_decreased 時に使う過去形表現（例: "点眼回数が減った"）
     *
     * 省略時は従来の「増量」「減量」テンプレートを使用する。
     * 例: { "increasePast": "点眼回数が増えた", "decreasePast": "点眼回数が減った" }
     */
    adjustmentExpression?: {
      increasePast: string
      decreasePast: string
    }
    /**
     * サードパネルに表示する任意入力欄。点眼薬・軟膏・湿布など
     * 部位や症状部位をユーザーが入力してS欄に反映するために使用する。
     *
     * enabled          — true のモジュールのみ入力欄を表示する
     * label            — 入力欄のラベル（例: "部位"）
     * placeholder      — プレースホルダーテキスト
     * targetField      — 反映先フィールド（現時点では "S" のみ対応）
     * insertMode       — 挿入モード。
     *                    "prefix"      = Sの先頭語を置換/補完（旧方式）
     *                    "placeholder" = S本文中の {{applicationSite}} を localSiteInput で置換。
     *                                    未入力時は {{applicationSite}} トークンを除去して返す。
     * applyScenarioIds — 入力欄を表示・適用するシナリオIDのホワイトリスト。
     *                    未定義または空配列の場合はすべてのシナリオで適用する。
     * emptyBehavior    — 入力欄が空のときの挙動。
     *                    "keep_original": 元のSをそのまま維持（プレフィックス不適用）。
     *                    未定義時は既定動作（空なら baseFields をそのまま返す）と同じ。
     */
    localInput?: {
      enabled: boolean
      label: string
      placeholder?: string
      targetField: 'S'
      insertMode: 'prefix' | 'placeholder'
      /**
       * ボタン UI の種別。insertMode === 'placeholder' のときのみ参照する。
       *   "topical" — 外用薬: 方向（左/右/両）+ 部位グリッドを表示。
       *   "eye"     — 点眼薬: 方向（左/右/両）のみ表示。クリックで 左眼/右眼/両眼 を生成。
       *   未定義    — ボタン UI なし（自由入力欄のみ）。
       *
       * JSON 側から明示指定することで、route/dosageForm に依らず
       * 将来のモジュール追加時も自然に整合する。
       */
      siteButtonType?: 'topical' | 'eye'
      applyScenarioIds?: string[]
      emptyBehavior?: 'keep_original'
    }
  }
  template?: ModuleTemplate
  risks?: ModuleRisks
  searchConfig?: ModuleSearchConfig
  index?: ModuleIndex
  /** defaults: followup などのデフォルト値 */
  defaults?: {
    /** 旧スキーマ互換: scenario.followup === "default" 参照先 */
    followup?: {
      S?: string | null
      P?: string | null
    }
    /** 新スキーマ: followupRef キー → フォールバックテキストのマップ */
    followupProfiles?: Record<string, {
      S?: string | null
      P?: string | null
    }>
  }
  /** ペルソナ設定（スタイルプロファイル） */
  persona?: PersonaConfig
  /** タグ語彙レジストリ（intentTags/clinicalTags 等の有効値一覧） */
  tagCatalog?: TagCatalog
  ui?: {
    panels?: Array<{ id: string; title?: string; sections?: string[] }>
    panelOrder?: string[]
    defaultPanelId?: string
  }
  /** 新スキーマ: scenarios[] がメインデータ */
  scenarios: Scenario[]
  /** 新スキーマ: addons は items + orderPresets（旧フォーマットでもクラッシュしないよう optional） */
  addons?: AddonsData
  /** エクスプレスモード参照枠。enabled:true のモジュールのみ候補に表示される */
  expressMode?: {
    /** エクスプレス候補に表示するか */
    enabled: boolean
    /** 疾患カテゴリ: common_cold / pollinosis / orthopedics / ophthalmology / dermatology / dm など */
    category: string
    /** サブカテゴリ（省略可）: antitussive / expectorant / antihistamine / nsaid / eyedrop / nasal など */
    subCategory?: string
    /** エクスプレス候補ボタンに表示するラベル */
    label: string
    /** デフォルトで追加する scenario.id（通常 "initial"） */
    defaultScenarioId: string
    /**
     * Express 追加時に使用する既定ブランド名。
     * 値は必ず drug.brandCatalog のキーと完全一致させること。
     * 省略時は drug.brandNames[0] にフォールバックする（後方互換）。
     * addonFilter の handlingTags 解決にも使用されるため、
     * 複数ブランドを持つモジュールでは必ず明示すること。
     */
    defaultBrandName?: string
    /** 同カテゴリ内での表示順 */
    sortOrder?: number
  }
  /**
   * エクスプレス候補リスト（配列版）。
   * expressModes が存在する場合は expressMode 単数より優先して使用する。
   * ブランド単位のエントリを持ち、1モジュールから複数候補を出せる。
   */
  expressModes?: ExpressModeEntry[]
}

// ─────────────────────────────────────────────────────────────
// ExpressModeEntry（expressModes 配列の各エントリ）
// ─────────────────────────────────────────────────────────────

export interface ExpressModeEntry {
  /** エクスプレス候補に表示するか */
  enabled: boolean
  /**
   * UI上でグレーアウト表示する未実装 placeholder エントリか（省略時 false）。
   * true の場合: ボタンは disabled 表示され、クリックしても何も追加されない。
   *             defaultScenarioId / defaultBrandName / scenarioCandidates は省略可。
   *             activeExpressKeys 判定・search・addon・compose への影響なし。
   * false / 省略: 通常の有効エントリ。defaultScenarioId / defaultBrandName は必須。
   */
  disabled?: boolean
  /** disabled エントリ用の補足テキスト（例: "準備中"）。省略可 */
  disabledReason?: string
  /** 診療領域（ThirdPanel 第1階層、将来アコーディオン用）: "眼科" / "感染症" / "整形" など */
  expressCategory: string
  /** 薬効大分類（第2階層）: "抗アレルギー" / "抗菌" など */
  expressGroup: string
  /** 剤形・薬効サブ分類（第3階層・ボタングループ境界）: "抗H1点眼液" / "抗H1眼軟膏" など */
  expressSubGroup: string
  /** ボタン表示名（原則 brandCatalog の displayName と一致させる） */
  label: string
  /**
   * GEモード時のボタン表示名（例: "エピナスチン点眼薬"）。
   * 省略時は label（先発名）をそのまま使用する。
   */
  genericDisplayName?: string
  /**
   * デフォルトで追加する scenario.id（通常 "initial"）。scenarioCandidates が存在する場合はフォールバックとして機能。
   * disabled: true のエントリでは省略可。
   */
  defaultScenarioId?: string
  /**
   * Express 追加時に使用する既定ブランド名。先発モード時の brandCatalog 解決キー。
   * 値は必ず drug.brandCatalog のキーと完全一致させること。
   * Express追加時の {{drug_subject}} 解決および addonFilter の handlingTags 解決に使用。
   * disabled: true のエントリでは省略可。有効エントリでは必須。
   */
  defaultBrandName?: string
  /**
   * GEモード時に使用する brandCatalog 解決キー（省略可）。
   * 設定時は GEモードでの brandName 解決にこちらを使用する。
   * 省略時は GEモードでも defaultBrandName にフォールバックする（既存モジュールとの後方互換）。
   * 例: defaultBrandName="ヒルドイドソフト軟膏" / genericBrandName="ヘパリン類似物質油性クリーム"
   */
  genericBrandName?: string
  /** 同サブグループ内での表示順 */
  sortOrder?: number
  /**
   * シナリオ候補リスト（省略可）。
   * 設定時は剤形ボタン押下後にシナリオ一覧を表示し、ユーザーが選択してから追加する（2段階選択）。
   * 省略時は defaultScenarioId で即時追加する（従来の1段階選択）。
   * 既存モジュール（H1内服/H1点眼）は省略のため動作変更なし。
   */
  scenarioCandidates?: Array<{
    /** scenario.id（JSON scenarios 配列の id フィールドと一致させること） */
    scenarioId: string
    /** ボタンに表示するラベル（日本語短縮形推奨） */
    label: string
  }>
}

// ─────────────────────────────────────────────────────────────
// 後方互換: 旧スキーマ用 Template / Addon 型 / AddonsMap
// （旧 JSON が残っている場合のフォールバック用。新規開発では使わない）
// ─────────────────────────────────────────────────────────────

export interface AddonsMap {
  counseling?: { id: string; text: string }[]
  sickday?: { id: string; text: string }[]
  oral?: { id: string; text: string }[]
  sideEffects?: { id: string; text: string }[]
  [key: string]: { id: string; text: string }[] | undefined
}

export type PatchMode = 'append' | 'prepend' | 'replace'

export interface Patch {
  target: SoapKey
  mode: PatchMode
  value: string
}

export interface Addon {
  addonId: string
  label: string
  patches: Patch[]
}

export interface Template {
  templateId: string
  label: string
  type: string
  soap: Record<SoapKey, string>
  addonIds: string[]
}
