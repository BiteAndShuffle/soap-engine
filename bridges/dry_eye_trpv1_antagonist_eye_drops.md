# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dry_eye_trpv1_antagonist_eye_drops
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# 2026-09-24 に HEADER_ONLY として作成した Header へ、Human authored scenario draft の
# SCENARIOS_START〜SCENARIOS_END を収載した（2026-09-24。prompts/RULES.md §24 HEADER_ONLY → DRAFT）。
# 収載時の変更は構造上の正規化のみ: inline addon marker を正式 marker `P_ADDON_INLINE` へ正規化
# （marker 位置は不変。docs/DESIGN_PRINCIPLES.md DP-22）／ADDON header の inline requiredTags を削除
# （正本は Header の addonRequiredTags map）／仮 placement 設計コメントを削除。clinical wording・
# scenario / addon の id と順序・addon 本文・P_ADDON・P_CLOSING は変更していない。
# Owner 本文確認・凍結宣言により FROZEN_FOR_PN1 へ遷移した（2026-09-24。prompts/RULES.md §24）。
# 凍結時点で SCENARIOS 本文・header 値は変更していない（STATUS 行と状態コメントのみ更新）。
# 目的: アバレプト点眼液（モツギバトレプ）の brandCatalog / alias / handlingTags /
# reachability / composition / display 設計を、会話ログではなくリポジトリ上に固定する。
# Header 形状は既存点眼共通シャーシ（Family A: H1 点眼 / chemical mediator 点眼）に従う（Owner Decision ODN-2）。
#
# 値の出所ラベル:
#   [H] Human / Owner 確定
#   [P] Claude proposal / Owner approved on 2026-09-24（提案由来・Owner 承認済み）
#   [D] 確定事項・固定規則からの決定論的導出
#
# 次の作業: PN1（prompts/vNext/HANDOFF.md「bridge 作成から開始する」）。
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
# requiredTags の配置は P-addon placement（DP-22 で確定済み）とは別責務である。
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
# - P-addon placement contract: 解決済み（2026-09-24。DP-22 / `P_ADDON_INLINE` / scenarios[].addonInsertions。
#   commit 83ba91d）。SCENARIOS 本文収載時に Human authored draft の仮 marker を正式 marker へ正規化した。
# - PENDING QA（HEADER_ONLY の blocker ではない）: ゼペリン点眼液 ZEP-1 と同型に、アバレプト検索時に
#   一般名見出し候補「モツギバトレプ点眼液」が表示される可能性がある。canonical / runtime 接続後に実測する。
#
# SCENARIOS_START〜SCENARIOS_END: 下記に収載済み（STATUS: FROZEN_FOR_PN1。2026-09-24 Owner 凍結宣言）


=======SCENARIOS_START=======


【SCENARIO｜type=treatment_start｜id=initial｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 初回】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、{{applicationSite}}眼の乾燥症状に対して追加となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、ドライアイに伴う眼の症状の改善を目的として追加となった。
刺激受容に関与するTRPV1イオンチャネルの働きを阻害することで、ドライアイに伴う眼の不快症状の改善を目的として使用する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、ドライアイによる目の不快な症状を改善する薬です。
症状の改善のため、継続して使用することが大切です。
使用により目のかすみや温度の感じ方に変化が出ることがあります。
P_ADDON_INLINE
- addon_avarept_blurred_vision_driving_caution
- addon_avarept_temperature_sensation_burn_caution
気になる症状がある場合はご相談ください。
P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_interval_5min
- addon_eye_drop_interval_after_suspension_5min
- addon_eye_drop_interval_10min
- addon_eye_drop_interval_after_suspension_10min
- addon_eye_drop_suspension_shake
- addon_eye_drop_storage_upright_suspension
- addon_eye_drop_storage_light_protection
- addon_eye_drop_storage_cold
- addon_eye_drop_warm_container_after_cold_storage
- addon_eye_drop_storage_cold_before_opening
- addon_eye_drop_avoid_cold_storage
- addon_eye_drop_single_dose_mini
- addon_eye_drop_preservative_free_pf
- addon_eye_drop_contact_lens_remove_before_use
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=administration_guidance｜id=addon_avarept_blurred_vision_driving_caution｜title=霧視時の運転・機械操作｜uiGroup=薬剤固有介入｜uiVariant=rightAccentAmber】
P_APPEND
目がかすんでいる間は、自動車の運転や機械の操作に注意してください。




【ADDON｜type=administration_guidance｜id=addon_avarept_temperature_sensation_burn_caution｜title=温度感覚変化・低温やけど｜uiGroup=薬剤固有介入｜uiVariant=rightAccentAmber】
P_APPEND
カイロやこたつなどを使用する際は、低温やけどに注意してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_tip_contamination｜title=点眼方法（容器先端の接触防止）】
P_APPEND
点眼薬の先端が、目や瞼などに触れると汚染されることがあります。
先端部分に触れないように使用してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_after_opening_expiry｜title=使用期限（開封後1ヶ月）】
P_APPEND
開封後の点眼薬は、衛生面を考慮し、1ヶ月を目安に処分してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_5min｜title=点眼間隔（5分以上）】
P_APPEND
複数の点眼薬を使用する場合は、5分以上あけて使用してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_after_suspension_5min｜title=点眼間隔（懸濁・5分以上）】
P_APPEND
複数の点眼薬を使用する場合は、懸濁性点眼薬を後に使用し、点眼の間隔を5分以上あけてください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_10min｜title=点眼間隔（10分以上）】
P_APPEND
複数の点眼薬を使用する場合は、10分以上あけて使用してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_after_suspension_10min｜title=点眼間隔（懸濁・10分以上）】
P_APPEND
複数の点眼薬を使用する場合は、懸濁性点眼薬を後に使用し、点眼の間隔を10分以上あけてください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_suspension_shake｜title=点眼方法（懸濁性・振り混ぜ）】
P_APPEND
点眼薬の成分が沈殿して、効果が十分に出ない可能性があります。
使用する前に、よく振り混ぜてから使用してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_upright_suspension｜title=保管方法（懸濁性・先端上向き）】
P_APPEND
保管するときは、目詰まりを防ぐために、先端部分を上にして保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_light_protection｜title=保管方法（遮光）】
P_APPEND
光の影響により、効果が十分に出ない可能性があります。
使用していない間は、遮光袋に入れて保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_cold｜title=保管方法（冷所保存）】
P_APPEND
温度の影響により、効果が十分に出ない可能性があります。
使用していない間は、冷所で保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_warm_container_after_cold_storage｜title=点眼方法（冷所保存後・手で温める）】
P_APPEND
冷所から取り出した後すぐに点眼すると、薬液が連続して落ちる可能性があります。
キャップを閉めたまま容器を手で温めてから点眼してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_cold_before_opening｜title=保管方法（未開封時のみ冷所）】
P_APPEND
温度の影響により、効果が十分に出ない可能性があります。
開封するまでは冷所で保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_avoid_cold_storage｜title=保管方法（低温保存を避ける）】
P_APPEND
低温で保管すると、薬液の状態が変化することがあります。
冷蔵庫には入れず、指示された保管方法に従って保管してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_single_dose_mini｜title=点眼方法（ミニ・1回使い切り）】
P_APPEND
1回使い切りの点眼薬です。
開封後は速やかに使用し、薬液が残っていても処分してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_preservative_free_pf｜title=点眼方法（PF・防腐剤フリー）】
P_APPEND
防腐剤を使用していないため、特殊な構造の容器が使用されています。
通常の点眼薬と容器の扱い方が異なるため、使用方法を確認して使用してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_contact_lens_remove_before_use｜title=コンタクトレンズ（外して点眼）】
P_APPEND
コンタクトレンズを装用している場合は、点眼前に外してください。




【SCENARIO｜type=treatment_start｜id=restart｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 再開】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、{{applicationSite}}眼の乾燥症状に対して再開となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、ドライアイに伴う眼の症状の改善を目的として再開となった。
刺激受容に関与するTRPV1イオンチャネルの働きを阻害することで、ドライアイに伴う眼の不快症状の改善を目的として使用する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、ドライアイによる目の不快な症状を改善する薬です。
症状の改善のため、継続して使用することが大切です。
使用により目のかすみや温度の感じ方に変化が出ることがあります。
P_ADDON_INLINE
- addon_avarept_blurred_vision_driving_caution
- addon_avarept_temperature_sensation_burn_caution
気になる症状がある場合はご相談ください。
P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_interval_5min
- addon_eye_drop_interval_after_suspension_5min
- addon_eye_drop_interval_10min
- addon_eye_drop_interval_after_suspension_10min
- addon_eye_drop_suspension_shake
- addon_eye_drop_storage_upright_suspension
- addon_eye_drop_storage_light_protection
- addon_eye_drop_storage_cold
- addon_eye_drop_warm_container_after_cold_storage
- addon_eye_drop_storage_cold_before_opening
- addon_eye_drop_avoid_cold_storage
- addon_eye_drop_single_dose_mini
- addon_eye_drop_preservative_free_pf
- addon_eye_drop_contact_lens_remove_before_use
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=external_start｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 他所開始】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、{{applicationSite}}眼の乾燥症状に対して他院で開始され継続使用中であった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、ドライアイに伴う眼の症状の改善を目的として継続使用中であった。
刺激受容に関与するTRPV1イオンチャネルの働きを阻害することで、ドライアイに伴う眼の不快症状の改善を目的として使用する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、ドライアイによる目の不快な症状を改善する薬です。
症状の改善のため、継続して使用することが大切です。
使用により目のかすみや温度の感じ方に変化が出ることがあります。
P_ADDON_INLINE
- addon_avarept_blurred_vision_driving_caution
- addon_avarept_temperature_sensation_burn_caution
気になる症状がある場合はご相談ください。
P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_interval_5min
- addon_eye_drop_interval_after_suspension_5min
- addon_eye_drop_interval_10min
- addon_eye_drop_interval_after_suspension_10min
- addon_eye_drop_suspension_shake
- addon_eye_drop_storage_upright_suspension
- addon_eye_drop_storage_light_protection
- addon_eye_drop_storage_cold
- addon_eye_drop_warm_container_after_cold_storage
- addon_eye_drop_storage_cold_before_opening
- addon_eye_drop_avoid_cold_storage
- addon_eye_drop_single_dose_mini
- addon_eye_drop_preservative_free_pf
- addon_eye_drop_contact_lens_remove_before_use
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_low_perceived_effect｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 回数増（効果実感乏しい）｜scenarioColor=blue】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果の実感が乏しいため点眼回数が増えた。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　点眼回数増
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果不十分のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_low_perceived_effect｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 濃度増（効果実感乏しい）｜scenarioColor=green】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果の実感が乏しいため、より効果が高いものへ変更となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　高濃度製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果不十分のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_due_to_other_med_adjustment｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 回数増（他剤との調整）｜scenarioColor=blue】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、他剤との調整により点眼回数が増えた。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　点眼回数増
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、併用薬との調整のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_due_to_other_med_adjustment｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 濃度増（他剤との調整）｜scenarioColor=green】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、他剤との調整により、より効果が高いものへ変更となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　高濃度製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、併用薬との調整のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_improved｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 回数減（症状改善）｜scenarioColor=blue】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、症状が改善したため点眼回数が減った。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　点眼回数減
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、症状改善を踏まえ点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_improved｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 濃度減（症状改善）｜scenarioColor=green】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、症状が改善したため、より効果が穏やかなものへ変更となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　低濃度製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、症状改善を踏まえ、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_low_perceived_effect｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 回数減（効果実感乏しい）｜scenarioColor=blue】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果の実感が乏しく使用継続に不安があるため、点眼回数を減らして継続することとなった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　点眼回数減
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果実感の乏しさと使用継続への不安を踏まえ、点眼回数を減らして治療継続となった。
点眼回数変更後は、症状や使用状況について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、変更された点眼回数で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_low_perceived_effect｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 濃度減（効果実感乏しい）｜scenarioColor=green】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果の実感が乏しく使用継続に不安があるため、より効果が穏やかなものへ変更して継続することとなった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　低濃度製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果実感の乏しさと使用継続への不安を踏まえ、低濃度製剤へ変更して治療継続となった。
製剤変更後は、症状や使用状況について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、変更された製剤で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_due_to_other_med_adjustment｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 回数減（他剤との調整）｜scenarioColor=blue】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、他剤との調整により点眼回数が減った。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　点眼回数減
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、併用薬との調整のため点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_due_to_other_med_adjustment｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 濃度減（他剤との調整）｜scenarioColor=green】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、他剤との調整により、より効果が穏やかなものへ変更となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　低濃度製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、併用薬との調整のため、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=switch_to_sustained_formulation_reduced_frequency｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 持続型製剤へ変更（点眼回数減）｜scenarioColor=orange】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、点眼回数を減らすために変更となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　持続型製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、点眼回数を減らすため、持続型製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_blurred_vision_none｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 副作用なし（霧視）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）を使用して症状は落ち着いている。
目のかすみは認めない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による霧視は現時点で認められず、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の継続中に目のかすみが出ることがあります。
P_ADDON_INLINE
- addon_avarept_blurred_vision_driving_caution
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_temperature_sensation_change_none｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 副作用なし（温度感覚変化）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）を使用して症状は落ち着いている。
温度の感じ方に変化はない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による温度感覚の変化は現時点で認められず、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の継続中に温度の感じ方が変化することがあります。
P_ADDON_INLINE
- addon_avarept_temperature_sensation_burn_caution
気になる変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_irritation_none｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 副作用なし（刺激感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）を使用して症状は落ち着いている。
刺激感は認めない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による刺激感は現時点で認められず、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の継続中に刺激感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_foreign_body_sensation_none｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 副作用なし（異物感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）を使用して症状は落ち着いている。
異物感は認めない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による異物感は現時点で認められず、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の継続中に異物感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pruritus_none｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 副作用なし（掻痒感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）を使用して症状は落ち着いている。
掻痒感は認めない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による掻痒感は現時点で認められず、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の継続中に掻痒感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_redness_none｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 副作用なし（充血）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）を使用して症状は落ち着いている。
充血は認めない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による充血は現時点で認められず、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の継続中に充血が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_discharge_none｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 副作用なし（目やに）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）を使用して症状は落ち着いている。
目やには認めない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による目やには現時点で認められず、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の継続中に目やにが出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_good｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） CP良好】
S
薬を使用して症状は落ち着いている。
使用忘れなく継続できている。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　使用中
A
コンプライアンスは良好で、治療継続に問題はない。
P
引き続き用法を守って使用することで、治療効果の維持が期待されます。
今後も継続して使用できるようにすることが大切です。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） CP不良（使用忘れ）】
S
使用を忘れることがある。
症状は大きく変わっていない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　使用中
A
コンプライアンスは不良で、使用忘れがみられる。
P
継続して使用することで、十分な治療効果が期待されます。
使用忘れが続くと、期待される治療効果が十分に得られない可能性があります。
P_ADDON
- addon_eye_drop_after_opening_expiry
- addon_adherence_notification_alarm
- addon_adherence_notification_app
- addon_adherence_visual_calendar_checklist
- addon_adherence_visual_note
- addon_adherence_prep_previous_night
- addon_adherence_habit_routine_link
- addon_adherence_family_support_reminder
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=adherence_guidance｜id=addon_adherence_notification_alarm｜title=アラーム｜uiGroup=通知｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、アラームを使用時間に合わせて設定しておく方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_notification_app｜title=記録アプリ｜uiGroup=通知｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用記録のできるアプリを活用する方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_calendar_checklist｜title=カレンダー・チェックリスト｜uiGroup=視覚化｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、カレンダーや使用チェックリストで確認する方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=貼り紙｜uiGroup=視覚化｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用するタイミングを目立つ場所に書いておく方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_previous_night｜title=前夜に準備｜uiGroup=事前準備｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、前夜のうちに翌日の薬を目につく場所へ準備しておく方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_habit_routine_link｜title=生活習慣と結びつける｜uiGroup=習慣化｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、毎日の生活習慣と使用を結びつける方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_family_support_reminder｜title=家族などの声掛け｜uiGroup=家族の支援｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、家族や身近な方に使用したか声をかけてもらう方法があります。




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） CP不良（自己判断）】
S
自己判断で使用を調整することがある。
症状は大きく変わっていない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　使用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して使用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） CP不良（受診遅延）】
S
受診が遅れ、使用を調整することがある。
症状は大きく変わっていない。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　使用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な使用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_improved｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 終了（改善）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、症状が改善したため中止となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方終了
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、症状改善により終了となった。
終了後に症状が悪化する可能性があるため、注意が必要である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 終了（効果不十分）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果不十分のため中止となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方終了
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果不十分のため終了となった。
終了後は、目の症状の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） 終了（無効）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果が認められなかったため中止となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方終了
A
ドライアイ治療点眼薬（TRPV1拮抗薬）は、効果が認められなかったため終了となった。
終了後は、目の症状の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_mild_continue｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE継続（軽症 刺激感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により刺激感があるが、日常生活は送れている。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による刺激感を軽度認めるが、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）による刺激感が軽い場合は、そのまま経過をみてください。
刺激感が続く場合や強くなる場合は、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_blurred_vision_mild_continue｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE継続（軽症 霧視）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により目のかすみがあるが、日常生活は送れている。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による霧視を軽度認めるが、治療継続が可能である。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）による目のかすみが軽い場合は、そのまま経過をみてください。
P_ADDON_INLINE
- addon_avarept_blurred_vision_driving_caution
目のかすみが続く場合や強くなる場合は、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_moderate_consider_dr｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE継続（中等度 刺激感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により刺激感が強く、辛いことがあるが、日常生活は送れている。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方
A
ドライアイ治療点眼薬（TRPV1拮抗薬）による刺激感が強く、継続困難の可能性があるため対応を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）による刺激感が続く場合や強くなる場合は、使用回数の調整や薬剤の変更が必要になることがあります。
症状が続く場合は、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_irritation｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE変更（刺激感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により刺激感が出現したため、他剤へ変更となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による刺激感を認め、他剤変更後の経過確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の変更後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_blurred_vision｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE変更（霧視）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により目のかすみが出現したため、他剤へ変更となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による霧視を認め、他剤変更後の経過確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の変更後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_irritation｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE回数減（刺激感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により刺激感が強いため、点眼回数が減った。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　点眼回数減
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による刺激感を認め、点眼回数変更後の経過確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の点眼回数が減った後も刺激感が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_blurred_vision｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE回数減（霧視）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により目のかすみが強いため、点眼回数が減った。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　点眼回数減
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による霧視を認め、点眼回数変更後の経過確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の点眼回数が減った後も目のかすみが続く場合があります。
P_ADDON_INLINE
- addon_avarept_blurred_vision_driving_caution
目のかすみが続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_irritation｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE濃度減（刺激感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により刺激感が強かったため、効果が穏やかなものになった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　低濃度製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による刺激感を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）を低濃度製剤へ変更後も、刺激感が続く場合や、気になる症状、使用感の変化がありましたらご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_blurred_vision｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE濃度減（霧視）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により目のかすみが強かったため、効果が穏やかなものになった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　低濃度製剤へ変更
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による霧視を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
低濃度製剤へ変更後も、目のかすみが続く場合があります。
P_ADDON_INLINE
- addon_avarept_blurred_vision_driving_caution
目のかすみが続く場合や、気になる症状、使用感の変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_irritation｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE中止（刺激感）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により刺激感が強いため、中止となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方中止
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による刺激感を認め、中止後の経過確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の中止後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_blurred_vision｜title=ドライアイ治療点眼薬（TRPV1拮抗薬） SE中止（霧視）】
S
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用により目のかすみが強いため、中止となった。
O
ドライアイ治療点眼薬（TRPV1拮抗薬）　処方中止
A
ドライアイ治療点眼薬（TRPV1拮抗薬）の使用による霧視を認め、中止後の経過確認を要する。
P
ドライアイ治療点眼薬（TRPV1拮抗薬）の中止後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_tip_contamination｜title=点眼方法説明（容器先端の接触）】
S
点眼薬の先端を、目や瞼などに触れて使用している。
O
点眼薬　使用中
A
点眼薬の使い方の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬の先端が、目や瞼などに触れると汚染されることがあります。
先端部分に触れないように使用してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_interval｜title=点眼方法説明（間隔不十分）】
S
複数の点眼薬を、十分な間隔をあけずに使用している。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬は、目に十分行き渡るまでに時間がかかります。
複数の点眼薬を使用する場合は、薬剤ごとに指示された間隔をあけて使用してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_after_opening_expiry｜title=点眼方法説明（開封後1ヶ月以上使用）】
S
点眼薬は、開封後1ヶ月以上経過しても使用を続けている。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬は、衛生面を考慮し、開封後1ヶ月を目安に使用を終了し、残っていても処分してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_suspension_shake｜title=点眼方法説明（懸濁不十分）】
S
点眼薬は、振らないまま使用を続けている。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬の成分が沈殿して、効果が十分に出ない可能性があります。
使用する前に、よく振り混ぜてから使用してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_upright_suspension｜title=保管方法説明（懸濁性・先端上向き）】
S
点眼薬は、向きを気にせず保管していた。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、先端部分を上にして保管することで、目詰まりを防ぐことができます。
保管するときは向きに注意してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_light_protection｜title=保管方法説明（遮光不十分）】
S
点眼薬は、遮光せずに保管している。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、光の影響により、効果が十分に出ない可能性があります。
使用していない間は、遮光袋に入れて保管してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_cold｜title=保管方法説明（冷所保存不十分）】
S
点眼薬は、冷所に保管せず、常温で保管している。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、温度の影響により、効果が十分に出ない可能性があります。
使用していない間は、冷所で保管してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_cold_before_opening｜title=保管方法説明（未開封時のみ冷所保存不十分）】
S
点眼薬は、未開封時に冷所へ保管せず、常温で保管していた。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、温度の影響により、効果が十分に出ない可能性があります。
開封するまでは冷所で保管してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======
