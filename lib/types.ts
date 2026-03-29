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
  /** 意味タグ（intentTags）— 文章の意味的役割を表す */
  intentTags?: string[]
  /** 臨床タグ（将来拡張用） */
  clinicalTags?: string[]
  /** 服薬指導タグ（将来拡張用） */
  counselingTags?: string[]
  /** ワークフロータグ（将来拡張用） */
  workflowTags?: string[]
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
  aliases: string[]
  normalizedAliases: string[]
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
   * S欄ドメイン別まとめ用。
   * composition.domain → categoryPath[1] → categoryPath[0] → moduleId の優先順で決定。
   */
  domain?: string
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
  }
  drug?: Drug
  drugResolution?: DrugResolution
  display?: { title: string; subtitle: string; drugClassLabel?: string }
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
