# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dry_eye_trpv1_antagonist_eye_drops
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案のみ。SCENARIOS_START〜SCENARIOS_END（Human authored scenario draft は別途存在する）は
# 本 HEADER_ONLY ファイルには未収載であり、Repository へは未反映。
# 目的: アバレプト点眼液（モツギバトレプ）の brandCatalog / alias / handlingTags /
# reachability / composition / display 設計を、会話ログではなくリポジトリ上に固定する。
# Header 形状は既存点眼共通シャーシ（Family A: H1 点眼 / chemical mediator 点眼）に従う（Owner Decision ODN-2）。
#
# 値の出所ラベル:
#   [H] Human / Owner 確定
#   [P] Claude proposal / Owner approved on 2026-09-24（提案由来・Owner 承認済み）
#   [D] 確定事項・固定規則からの決定論的導出
#
# 次の作業: P-addon placement contract の確定（別 Unit）→ SCENARIOS 本文追加（DRAFT）→
# Owner 凍結宣言（FROZEN_FOR_PN1）→ PN1（prompts/vNext/HANDOFF.md「bridge 作成から開始する」）。
#
# 参照:
#   - bridges/allergy_h1_antihistamine_eye_drops.md（点眼共通シャーシ・golden reference）
#   - bridges/allergy_chemical_mediator_release_inhibitor_eye_drops.md（ゼペリン点眼液:
#     先発単独収載・一般名系エントリなしの直接前例。ZEP-1 alias 配置）
#   - prompts/vNext/PN2-Drug-Header.md / prompts/RULES.md §8 §10 §18 §21 §23 §27
#   - docs/JSON_STANDARD.md（categoryPath 最大 4 階層・JS-A）/ docs/DESIGN_PRINCIPLES.md DP-09 DP-18 DP-21
#
# =========================================

# [P] snake_case・categoryPath 末端（点眼）を反映
moduleId: "dry_eye_trpv1_antagonist_eye_drops"

# [H] ODN-1a/1c（4 階層・「外用」は挟まない）
categoryPath:
  - "ドライアイ"
  - "ドライアイ治療点眼薬"
  - "TRPV1拮抗薬"
  - "点眼"

composition:
  # [P]
  classKey: "trpv1_antagonist"
  # [P] {classKey}_{route}（display.nodeKey と一致）
  nodeKey: "trpv1_antagonist_ophthalmic"
  # domain: PN2 の root mapping に「ドライアイ」は存在しないため、推測させず明示する（ODN-1b）。
  # [H]
  domain: "dry_eye"
  # [H] S-section merge grouping に使用される
  clinicalDomain: "dry_eye"
  # [H]
  sMergeDomain: "dry_eye"
  # priority 根拠（Human clinical judgment・ODN-6）: アバレプトは必要時使用ではなく、継続使用を前提とする
  # 慢性期維持治療薬として扱う（RULES §18「chronic = 慢性期維持管理薬」）。
  #   - "prn" 不採用: 必要時使用・頓用運用を前提としない（ODN-10）
  #   - "acute" 不採用: 急性期治療薬として扱う根拠がない
  # 既存 corpus が "chronic" であることは根拠としていない。
  # [H]
  priority: "chronic"
  # sMergePolicy は PN2 固定値（bridge では定義しない）。JS-B 4 key は新規 module では生成しない。

drug:
  # [P] Human 確定の薬効表記をそのまま採用（薬効クラス名）
  genericName: "ドライアイ治療点眼薬（TRPV1拮抗薬）"
  brandNames:
    # [H] 正式販売名はアバレプト懸濁性点眼液0.3%（exactAliases 側で保持）
    - "アバレプト点眼液"
  drugClass:
    # [P] UPPER_SNAKE（点眼シャーシの {CLASS}_EYE_DROPS 形式）
    - "TRPV1_ANTAGONIST_EYE_DROPS"
  # [P]
  route: "ophthalmic"
  dosageForms:
    # [P] 懸濁製剤も eye_drop（シャーシ実績）。懸濁は handlingTags で表現
    - "eye_drop"
  # [P] 検索 token にもなる
  drugSpecificTags:
    - "trpv1_antagonist"
    - "dry_eye"
    - "eye_drops"
    - "ophthalmic"
    - "external_use"
    - "storage_instruction"
    - "formulation_instruction"
    - "contact_lens_caution"
  search:
    # [P] = drug.genericName
    primaryDisplayName: "ドライアイ治療点眼薬（TRPV1拮抗薬）"
    exactAliases:
      # [H] 表示名
      - "アバレプト点眼液"
      # [P] bare 名（点眼シャーシ実績）
      - "アバレプト"
      # [H] 正式販売名（Owner Decision: search field で保持）
      - "アバレプト懸濁性点眼液0.3%"
      # [P] クラス名（シャーシ実績）
      - "ドライアイ治療点眼薬（TRPV1拮抗薬）"
      # 一般名到達性（DP-09）: ゼペリン点眼液（ZEP-1）と同型に module 単位 alias で保持する。
      # brandCatalog.aliases / aliasToBrand へは複製しない（PN2 alias 責務境界 B）。
      # [P]
      - "モツギバトレプ"
      # [P] = displayGenericName
      - "モツギバトレプ点眼液"
    nameAliases:
      # [P] ブランド読み＋「てんがん」（シャーシ記法）
      - "あばれぷとてんがん"
      # [P]
      - "あばれぷと"
      # [P] 一般名読み（module 単位のみ）
      - "もつぎばとれぷ"
    # [P] SCENARIOS 本文・categoryPath に現れる語のみ
    keywords:
      - "ドライアイ"
      - "眼の乾燥"
      - "点眼"
    # [P] 点眼シャーシ実績
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      # JS-A: 全 module true
      suppressCrossModuleSuggestionsOnExactHit: true
      # preferOwnNameMatchOverGenericMatch / suppressRedundantGenericHeaderOnDirectMatch は
      # 先発・一般名ペアを前提とする flag のため設定しない（単一 brand）。[P]
  # drug.nameAliases は drug.search.nameAliases と要素・順序まで完全一致（RULES §8）。[D]
  nameAliases:
    - "あばれぷとてんがん"
    - "あばれぷと"
    - "もつぎばとれぷ"
  # brandCatalog: 現行製品はアバレプト点眼液 1 件のみ。「モツギバトレプ点眼液」GE は未発売のため
  # エントリを作成しない（将来 GE 追加時は Human review のうえ追加。avarept tag 適用可否も同時に確認）。[H]
  brandCatalog:
    アバレプト点眼液:
      # [H]
      displayName: "アバレプト点眼液"
      # [H] 成分 plain base name（DP-21）
      genericName: "モツギバトレプ"
      # [H] 表示用一般名（GE 製品の存在を意味しない）
      displayGenericName: "モツギバトレプ点眼液"
      # [H] 懸濁製剤・室温保管・濃度 variant / 持続型 / 遮光 / PF / 単回容器なし
      handlingTags:
        - "suspension"
        # アバレプト固有 2 addon の gate 専用 module-specific tag（一般化は横断監査へ defer）
        - "avarept"
      # [P] brand 自身の読みのみ（一般名読みは含めない）
      aliases:
        - "あばれぷとてんがん"
        - "あばれぷと"
      # [D] = aliases
      normalizedAliases:
        - "あばれぷとてんがん"
        - "あばれぷと"
  # [D] brandCatalog.aliases の逆写像（RULES §10）
  aliasToBrand:
    "あばれぷとてんがん": "アバレプト点眼液"
    "あばれぷと": "アバレプト点眼液"

# [H] drugResolution.brandToTags: Bridge で明示する（Owner Decision）。アバレプト pilot 限定の明示値であり、
# ODN-5 の一般 contract を確定するものではない（点眼 2 module の brandToTags == handlingTags 実績は参考のみ）。
drugResolution:
  brandToTags:
    アバレプト点眼液:
      - "suspension"
      - "avarept"

template:
  # [D] moduleId + _v1
  templateId: "dry_eye_trpv1_antagonist_eye_drops_v1"
  # [P]
  templateVersion: "1.0.0"
  # [P]
  situationTags:
    - "general"
    - "dry_eye"
  # [H] current chassis vocabulary を維持（35/35 module・点眼シャーシと同一）。severe scenario の存在を
  # 意味しない。severityTags を「実在 scenario の severity 一覧」とする contract / consumer は存在しない。
  severityTags:
    - "mild"
    - "moderate"
    - "severe"
  # storageTags / formulationTags は記載しない（runtime consumer 0・chemical mediator 前例）。[P]
  handlingTags:
    # 点眼共通シャーシの capability 語彙（9 種）。avarept は brand-level tag のため含めない（Owner Decision）。[D]
    - "suspension"
    - "light_protection"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "reduced_frequency_option"
    - "concentration_variant"
    - "single_use_container"
    - "preservative_free"
    - "avoid_cold_storage"
  reservedHandlingTags:
    # 現行製品では到達不能だが共通シャーシとして保持するタグ（product fact により非付与）。[D]
    # suspension は現行製品が保持し到達可能なため含めない。
    # avoid_cold_storage は「冷蔵禁止」という product fact ではなく、単に到達させないための予約である。
    - "cold_storage"
    - "cold_storage_before_opening"
    - "concentration_variant"
    - "reduced_frequency_option"
    - "light_protection"
    - "preservative_free"
    - "single_use_container"
    - "avoid_cold_storage"
  # urgentFlag / urgentCriteria（Owner Decision）:
  # 本 module の scenario draft に module-level の緊急受診・緊急連絡条件を定義する臨床的根拠がないため設定しない。
  # routine な相談文言・注意喚起 addon は module-level urgent とは別概念として扱う。
  # 既存 corpus の多数派であることは根拠としていない。
  # [H]
  urgentFlag: false
  # [H]
  urgentCriteria: null

display:
  # [P]
  title: "ドライアイ治療点眼薬（TRPV1拮抗薬）"
  # [P] subtitle は明示する（PN2 fallback「…（TRPV1拮抗薬）（点眼）」は不採用・Owner Decision）。
  # H1 点眼の表示粒度（「{対象疾患}・{症状}に対する点眼治療」）に倣い、語句は SCENARIOS draft の
  # A 文「ドライアイに伴う眼の不快症状の改善を目的として使用する」から採る。検索 token にもなる。
  subtitle: "ドライアイに伴う眼の不快症状に対する点眼治療"
  # [P]
  drugClassLabel: "ドライアイ治療点眼薬（TRPV1拮抗薬）"
  # [D] PN2 規則（= drug.genericName）
  drugGeneric: "ドライアイ治療点眼薬（TRPV1拮抗薬）"
  # [P] 「H1点眼」「ケミ点眼」と並べて識別できる短縮名
  nodeLabelShort: "TRPV1点眼"
  # [P]
  nodeLabelLong: "ドライアイ治療点眼薬（TRPV1拮抗薬）"
  # [P] = composition.nodeKey
  nodeKey: "trpv1_antagonist_ophthalmic"
  # [P] SCENARIOS draft の title 表記（回数増／回数減）
  menuGroupLabels:
    増量: "回数増"
    減量: "回数減"
  # [P] SCENARIOS draft の S 文言（exact）
  adjustmentExpression:
    increasePast: "点眼回数が増えた"
    decreasePast: "点眼回数が減った"
  # localInput: SCENARIOS draft の initial / restart / external_start の S に {{applicationSite}} が含まれるため、
  # 点眼部位入力UIを有効化する（構造・値は点眼共通シャーシと同一）。[P]
  localInput:
    enabled: true
    label: "点眼部位（任意）"
    placeholder: "左・右・両 など"
    targetField: "S"
    insertMode: "placeholder"
    siteButtonType: "eye"
    applyScenarioIds:
      - "initial"
      - "restart"
      - "external_start"
    emptyBehavior: "keep_original"

# [D] 点眼共通シャーシ（H1 / chemical mediator で同一）
scenarioEngine:
  mode: "bridge"
  sourceType: "natural_language_scenarios"
  scenarioSection:
    start: "=======SCENARIOS_START======="
    end: "=======SCENARIOS_END======="
    sectionStrictMode: true
  addonSupported: true
  closingSupported: true
  headerFormat:
    delimiter: "｜"
    scenarioHeader:
      prefix: "SCENARIO"
      requiredFields:
        - "type"
        - "id"
        - "title"
    addonHeader:
      prefix: "ADDON"
      requiredFields:
        - "type"
        - "id"
        - "title"
  expectedScenarioFormat:
    - "header"
    - "S"
    - "O"
    - "A"
    - "P"
    - "P_ADDON(optional)"
    - "P_CLOSING(optional)"
  expectedAddonFormat:
    - "header"
    - "S_APPEND(optional)"
    - "A_APPEND(optional)"
    - "P_APPEND(optional)"
#
# ─────────────────────────────────────────
# scenarioRequiredTags / addonRequiredTags（Header map 方式・正式な構造データ）。[D]
# 「カット」は削除ではない。共通シャーシ上に保持し、product fact に基づく requiredTags で到達不能にする。
# 記載のない scenario / addon は常時表示候補。
# [H] アバレプト固有 2 addon の avarept gate も本 map に置く（Option C）。SCENARIOS 本文の ADDON ヘッダー行には
# inline requiredTags を記載しない（reachability metadata の配置であり clinical wording の変更ではない）。
# requiredTags の配置は P-addon placement（DESIGN_PENDING・別 Unit）とは別責務である。
# ─────────────────────────────────────────
scenarioRequiredTags:
  lifestyle_guidance_suspension_shake: ["suspension"]
  lifestyle_guidance_storage_upright_suspension: ["suspension"]
  lifestyle_guidance_storage_light_protection: ["light_protection"]
  lifestyle_guidance_storage_cold: ["cold_storage"]
  lifestyle_guidance_storage_cold_before_opening: ["cold_storage_before_opening"]
  switch_to_sustained_formulation_reduced_frequency: ["reduced_frequency_option"]
  strength_increase_low_perceived_effect: ["concentration_variant"]
  strength_increase_due_to_other_med_adjustment: ["concentration_variant"]
  strength_decrease_improved: ["concentration_variant"]
  strength_decrease_low_perceived_effect: ["concentration_variant"]
  strength_decrease_due_to_other_med_adjustment: ["concentration_variant"]
  se_strength_decreased_due_to_irritation: ["concentration_variant"]
  # アバレプト固有の新規 scenario。既存の濃度減 scenario と同じく concentration_variant で gate（ODN-7）。
  se_strength_decreased_due_to_blurred_vision: ["concentration_variant"]
addonRequiredTags:
  addon_eye_drop_suspension_shake: ["suspension"]
  addon_eye_drop_storage_upright_suspension: ["suspension"]
  addon_eye_drop_storage_light_protection: ["light_protection"]
  addon_eye_drop_storage_cold: ["cold_storage"]
  addon_eye_drop_warm_container_after_cold_storage: ["cold_storage"]
  addon_eye_drop_storage_cold_before_opening: ["cold_storage_before_opening"]
  addon_eye_drop_avoid_cold_storage: ["avoid_cold_storage"]
  addon_eye_drop_single_dose_mini: ["single_use_container"]
  addon_eye_drop_preservative_free_pf: ["preservative_free"]
  # アバレプト固有 2 addon（avarept は brand-level module-specific tag。一般化は横断監査へ defer）
  addon_avarept_blurred_vision_driving_caution: ["avarept"]
  addon_avarept_temperature_sensation_burn_caution: ["avarept"]
# 意図的に gate しない addon（シャーシ既定）:
# - addon_eye_drop_interval_after_suspension_5min / _10min: 条件は自剤ではなく併用薬の性質。
# - addon_eye_drop_contact_lens_remove_before_use: 薬剤師の Human judgment に委ねる。
#
# [D] 点眼共通シャーシ（H1 / chemical mediator 点眼）の constitution と逐語一致。module 固有 rule は置かない。
constitution:
  purpose: "このテンプレートは自然言語シナリオ原稿をJSONへ橋渡しするための軽量構造定義である。"
  canonicalSource: "bridge原稿を single source of truth（内容の正本）として扱う。文言・構造の調整は bridge原稿を起点とし、確認後に canonical JSON へ反映する。canonical JSON は bridge原稿を実装へ反映したアウトプットとする。"
  editingRules:
    - "既存本文は勝手に書き換えない"
    - "構造監査と整合性確認を優先する"
    - "不足しているブロック、欠落、参照不一致のみを指摘する"
    - "未依頼の新フィールド、新機能、新分類を追加しない"
    - "将来拡張のための枠やコメントを削除・変更しない"
    - "type、id、P_ADDON参照、P_CLOSING の整合性を最優先で確認する"
    - "bridge原稿では薬剤名・薬効分類名を固定文言で記載してよい"
    - "文言修正はまず bridge原稿で確認し、その後 JSON へ反映する"
    - "JSON化時に、S / O / A / P / S_APPEND / A_APPEND / P_APPEND の薬剤名・薬効分類名は、主語・使用薬・対象薬・治療薬として使われている場合 {{drug_subject}} へ読み替える"
    - "S / S_APPEND では、初回・回数増・回数減・終了・副作用・使用状況確認など、薬剤ごとの状態や変更理由を表す場合、薬剤名・薬効分類名を {{drug_subject}} へ読み替える"
    - "Oフィールドでは、薬剤名・薬効分類名を表す部分を {{drug_subject}} へ読み替え、処方・回数増・回数減・使用中・処方終了・処方変更・処方中止などの状態語は保持する"
    - "A / P / A_APPEND / P_APPEND では、薬剤名・薬効分類名が使用薬・対象薬・治療薬として使われている場合のみ {{drug_subject}} へ読み替える。薬効説明・作用機序・症状説明・点眼手技説明・保管方法説明・疾患説明などの一般説明文として使われている場合は置換しない"
    - "薬効説明・作用機序・症状説明・点眼手技説明など、薬剤主語ではない一般説明文は {{drug_subject}} へ置換しない"
    - "{{drug_subject}} への読み替えは、薬剤名・薬効分類名が主語・使用薬・対象薬・治療薬として明示されている本文にのみ適用する"
    - "全体状態評価シナリオ（例：CP良好、CP不良など）では、Sフィールドの主語省略を許容する"
    - "主語省略を許容するシナリオでは、JSON化時に S フィールドへ {{drug_subject}} を補わない"
    - "本文監査では意味一致だけでなく、文型・接続・主語構造の維持を重視する"
    - "displayGenericName を使用する場合は、displayGenericName ?? genericName の優先順で扱う"
    - "expressModes は Model JSON管理項目として扱い、bridge原稿では定義しない"
    - "expressModes の defaultBrandName および defaultScenarioId は、bridge上の brandCatalog および scenario id が確定した後に Model JSON 側で参照整合を確認する"
    - "JSON化時、drug.nameAliases は drug.search.nameAliases と完全一致で生成する"
    - "drug.nameAliases を drug.search.nameAliases と独立生成しない"
    - "JSON化時、addons.orderPresets は全moduleで object として生成する"
    - "未使用moduleでは addons.orderPresets: {} を許容する"
    - "addons.orderPresets の preset key は bridge に明示がある場合のみ生成する"
    - "bridge未明示の preset key を推測生成しない"
    - "ADDONは S_APPEND / A_APPEND / P_APPEND を使用できる"
    - "ADDONには S_APPEND / A_APPEND / P_APPEND のいずれか1つ以上を含める"
    - "S_APPEND付きADDONは、薬剤師が実際に該当内容を確認・説明した場合のみ選択する"
    - "本モジュールの scenarioRequiredTags / addonRequiredTags は、Header内の同名ブロックを正本としてJSON生成時に適用する。bridge本文（SCENARIOS本文）には直接埋め込まない"
  outputRules:
    - "自然言語監査では、原稿の欠落・誤記・構造揺れ・参照不一致のみを扱う"
    - "JSON監査では、型・キー・参照・後方互換・canonical JSON一致のみを扱う"
    - "提案は現在要件と将来拡張を明確に分離して述べる"

# =========================================
# 残る未確定事項（PENDING）— header 外
# =========================================
# - P-addon placement contract（P_ADDON_INLINE_BEFORE_FOLLOWUP / DESIGN_PENDING_PLACEMENT）:
#   header の blocker ではないが、SCENARIOS 本文の FROZEN_FOR_PN1 / PN1 開始の blocker。別 Unit（Opus 伴走）。
# - PENDING QA（HEADER_ONLY の blocker ではない）: ゼペリン点眼液 ZEP-1 と同型に、アバレプト検索時に
#   一般名見出し候補「モツギバトレプ点眼液」が表示される可能性がある。canonical / runtime 接続後に実測する。
#
# SCENARIOS_START〜SCENARIOS_END: 本 HEADER_ONLY ファイルには未収載・Repository 未反映
# （Human authored scenario draft は別途存在する。STATUS: HEADER_ONLY）
