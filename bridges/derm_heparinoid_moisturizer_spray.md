# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# derm_heparinoid_moisturizer_spray
# =========================================
moduleId: "derm_heparinoid_moisturizer_spray"
categoryPath:
  - "皮膚科"
  - "保湿剤"
  - "ヘパリン類似物質"
  - "外用"
  - "フォーム・スプレー"
drug:
  genericName: "ヘパリン類似物質系保湿剤フォーム・スプレー"
  brandNames:
    - "ヒルドイドフォーム"
    - "ヘパリン類似物質外用スプレー"
  drugClass:
    - "HEPARINOID_MOISTURIZER_SPRAY"
  route: "topical"
  dosageForms:
    - "foam"
    - "spray"
  drugSpecificTags:
    - "heparinoid"
    - "moisturizer"
    - "dermatology"
    - "topical"
    - "external_use"
    - "foam"
    - "spray"
    - "dry_skin"
    - "skin_barrier_care"
    - "application_instruction"
    - "formulation_instruction"
  search:
    primaryDisplayName: "ヘパリン類似物質系保湿剤フォーム・スプレー"
    exactAliases:
      - "ヒルドイドフォーム"
      - "ヘパリン類似物質外用スプレー"
      - "ヘパリン類似物質スプレー"
    prefixAliases:
      - "ひるどいどふぉーむ"
      - "ひるふぉーむ"
      - "へぱ"
      - "へぱふぉーむ"
      - "へぱすぷれー"
      - "へぱりん"
      - "へぱりんふぉーむ"
      - "へぱりんすぷれー"
      - "へぱりんるいじ"
      - "へぱりんるいじぶっしつ"
      - "へぱりんるいじぶっしつふぉーむ"
      - "へぱりんるいじぶっしつすぷれー"
    commonSearchTokens:
      - "へぱ"
      - "へぱり"
      - "へぱりん"
      - "へぱりんるいじ"
      - "へぱりんるいじぶっしつ"
    formulationSearchTokens:
      - "ふぉ"
      - "ふぉーむ"
      - "すぷ"
      - "すぷれー"
    nameAliases:
      - "ひるどいどふぉーむ"
      - "ひるふぉーむ"
      - "へぱふぉーむ"
      - "へぱすぷれー"
      - "へぱりんふぉーむ"
      - "へぱりんすぷれー"
      - "へぱりんるいじぶっしつふぉーむ"
      - "へぱりんるいじぶっしつすぷれー"
    keywords:
      - "保湿"
      - "乾燥"
      - "皮膚乾燥"
      - "外用"
      - "フォーム"
      - "スプレー"
      - "皮膚科"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true
      allowMultiTokenAndMatch: true
      allowFormulationTokenMatch: true
  nameAliases:
    - "ひるどいどふぉーむ"
    - "ひるふぉーむ"
    - "へぱふぉーむ"
    - "へぱすぷれー"
    - "へぱりんふぉーむ"
    - "へぱりんすぷれー"
    - "へぱりんるいじぶっしつふぉーむ"
    - "へぱりんるいじぶっしつすぷれー"
  brandCatalog:
    ヒルドイドフォーム:
      displayName: "ヒルドイドフォーム"
      genericName: "ヘパリン類似物質"
      displayGenericName: "ヘパリン類似物質フォーム"
      storageType: "room_temperature"
      formulationType: "foam"
      handlingTags:
        - "room_temperature_storage"
        - "foam"
        - "topical_application"
        - "external_use"
        - "avoid_mucosa"
        - "wash_hands_before_use"
        - "foam_application"
      aliases:
        - "ひるどいどふぉーむ"
        - "ひるふぉーむ"
      normalizedAliases:
        - "ひるどいどふぉーむ"
        - "ひるふぉーむ"
    ヘパリン類似物質外用スプレー:
      displayName: "ヘパリン類似物質外用スプレー"
      genericName: "ヘパリン類似物質"
      displayGenericName: "ヘパリン類似物質外用スプレー"
      storageType: "room_temperature"
      formulationType: "spray"
      handlingTags:
        - "room_temperature_storage"
        - "spray"
        - "topical_application"
        - "external_use"
        - "avoid_mucosa"
        - "wash_hands_before_use"
        - "spray_application"
      aliases:
        - "へぱりんるいじぶっしつすぷれー"
        - "へぱりんすぷれー"
        - "へぱすぷれー"
      normalizedAliases:
        - "へぱりんるいじぶっしつすぷれー"
        - "へぱりんすぷれー"
        - "へぱすぷれー"
  aliasToBrand:
    "ひるどいどふぉーむ": "ヒルドイドフォーム"
    "ひるふぉーむ": "ヒルドイドフォーム"
    "へぱりんるいじぶっしつすぷれー": "ヘパリン類似物質外用スプレー"
    "へぱりんすぷれー": "ヘパリン類似物質外用スプレー"
    "へぱすぷれー": "ヘパリン類似物質外用スプレー"
template:
  templateId: "derm_heparinoid_moisturizer_spray_v1"
  templateVersion: "1.0.0"
  situationTags:
    - "general"
    - "dry_skin"
    - "dermatology"
  severityTags:
    - "mild"
    - "moderate"
    - "severe"
  storageTags:
    - "room_temperature_storage"
    - "storage_product_specific"
  formulationTags:
    - "foam"
    - "spray"
  handlingTags:
    - "topical_application"
    - "external_use"
    - "application_instruction"
    - "skin_barrier_care"
    - "avoid_mucosa"
    - "wash_hands_before_use"
    - "foam_application"
    - "spray_application"
display:
  title: "ヘパリン類似物質系保湿剤フォーム・スプレー"
  subtitle: "皮膚乾燥・保湿目的に使用する外用保湿剤"
  drugClassLabel: "ヘパリン類似物質系保湿剤フォーム・スプレー"
  drugGeneric: "ヘパリン類似物質系保湿剤フォーム・スプレー"
  nodeLabelShort: "ヘパF/S"
  nodeLabelLong: "ヘパリン類似物質系保湿剤フォーム・スプレー"
  nodeKey: "heparinoid_moisturizer_spray"
  menuGroupLabels:
    増量: "使用回数増"
    減量: "使用回数減"
  adjustmentExpression:
    increasePast: "使用回数が増えた"
    decreasePast: "使用回数が減った"
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
    - "S / S_APPEND では、初回・使用量増・使用量減・終了・副作用・使用状況確認など、薬剤ごとの状態や変更理由を表す場合、薬剤名・薬効分類名を {{drug_subject}} へ読み替える"
    - "Oフィールドでは、薬剤名・薬効分類名を表す部分を {{drug_subject}} へ読み替え、処方・使用量増・使用量減・使用中・処方終了・処方変更・処方中止などの状態語は保持する"
    - "A / P / A_APPEND / P_APPEND では、薬剤名・薬効分類名が使用薬・対象薬・治療薬として使われている場合のみ {{drug_subject}} へ読み替える。薬効説明・皮膚乾燥の説明・外用手技説明・保管方法説明・疾患説明などの一般説明文として使われている場合は置換しない"
    - "薬効説明・皮膚乾燥の説明・外用手技説明など、薬剤主語ではない一般説明文は {{drug_subject}} へ置換しない"
    - "{{drug_subject}} への読み替えは、薬剤名・薬効分類名が主語・使用薬・対象薬・治療薬として明示されている本文にのみ適用する"
    - "全体状態評価シナリオ（例：CP良好、CP不良など）では、Sフィールドの主語省略を許容する"
    - "主語省略を許容するシナリオでは、JSON化時に S フィールドへ {{drug_subject}} を補わない"
    - "本文監査では意味一致だけでなく、文型・接続・主語構造の維持を重視する"
    - "displayGenericName を使用する場合は、displayGenericName ?? genericName の優先順で扱う"
    - "expressModes は Model JSON管理項目として扱い、bridge原稿では定義しない"
    - "expressModes の defaultBrandName および defaultScenarioId は、bridge上の brandCatalog および scenario id が確定した後に Model JSON 側で参照整合を確認する"
    - "検索語は、薬剤共通語と剤形識別語を分けて管理する"
    - "ヘパリン類似物質系では、commonSearchTokens に共通検索語を、formulationSearchTokens に剤形識別語を格納する"
    - "へぱ なん、へぱり な、へ なんこう等の分割検索は、bridge本文側で大量alias化せず、search.commonSearchTokens / formulationSearchTokens と検索エンジン側のAND prefix matchで吸収する"
    - "剤形違いモジュールを追加する場合、commonSearchTokensは原則共通化し、formulationSearchTokensで軟膏・クリーム・ローション・スプレー等を切り分ける"
    - "JSON化時、drug.nameAliases は drug.search.nameAliases と完全一致で生成する"
    - "drug.nameAliases を drug.search.nameAliases と独立生成しない"
    - "JSON化時、addons.orderPresets は全moduleで object として生成する"
    - "未使用moduleでは addons.orderPresets: {} を許容する"
    - "addons.orderPresets の preset key は bridge に明示がある場合のみ生成する"
    - "bridge未明示の preset key を推測生成しない"
    - "ADDONは S_APPEND / A_APPEND / P_APPEND を使用できる"
    - "ADDONには S_APPEND / A_APPEND / P_APPEND のいずれか1つ以上を含める"
    - "S_APPEND付きADDONは、薬剤師が実際に該当内容を確認・説明した場合のみ選択する"
  outputRules:
    - "自然言語監査では、原稿の欠落・誤記・構造揺れ・参照不一致のみを扱う"
    - "JSON監査では、型・キー・参照・後方互換・canonical JSON一致のみを扱う"
    - "提案は現在要件と将来拡張を明確に分離して述べる"



=======SCENARIOS_START=======


【SCENARIO｜type=treatment_start｜id=initial_dryness｜title=ヘパリン類似物質系保湿剤スプレー 初回（乾燥）】
S
ヘパリン類似物質系保湿剤スプレーは、{{applicationSite}}の乾燥が気になるため追加となった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れの改善を目的として使用する。
皮膚状態を整え、症状の悪化予防につなげる。

P
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れを防ぎ、皮膚状態を整える薬です。
皮膚状態を保つため、継続して使用することが大切です。

P_ADDON
- addon_spray_application_method
- addon_topical_after_bath
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=lifestyle_guidance｜id=addon_spray_application_method｜title=使用方法説明】
P_APPEND
清潔な手で、指示された部位へ適量を使用してください。


【ADDON｜type=lifestyle_guidance｜id=addon_topical_after_bath｜title=入浴後使用説明】
P_APPEND
入浴後に使用すると、保湿効果が高まりやすくなります。


【ADDON｜type=lifestyle_guidance｜id=addon_topical_redness_warning｜title=副作用注意喚起（発赤）】
P_APPEND
使用した場所が赤くなることがあります。
赤みが続く場合や、気になる場合はご相談ください。




【SCENARIO｜type=treatment_start｜id=initial_eczema｜title=ヘパリン類似物質系保湿剤スプレー 初回（湿疹）】
S
ヘパリン類似物質系保湿剤スプレーは、{{applicationSite}}の湿疹が気になるため追加となった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、皮膚状態の改善を目的として使用する。
皮膚状態を整え、症状改善や状態維持につなげる。

P
ヘパリン類似物質系保湿剤スプレーは、皮膚状態を整える薬です。
皮膚状態を保つため、継続して使用することが大切です。

P_ADDON
- addon_spray_application_method
- addon_topical_after_bath
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=initial_skin_barrier_patch｜title=ヘパリン類似物質系保湿剤スプレー 初回（皮膚バリア機能低下）】
S
ヘパリン類似物質系保湿剤スプレーは、パッチによるかぶれ防止のため追加となった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、パッチ使用部位の皮膚状態を整える目的で追加となった。
貼付部位の乾燥や荒れを防ぎ、皮膚トラブル予防につなげる。

P
ヘパリン類似物質系保湿剤スプレーは、パッチ使用部位の皮膚状態を整える薬です。
貼付部位の皮膚状態を保つため、継続して使用することが大切です。

P_ADDON
- addon_topical_patch_timing
- addon_spray_application_method
- addon_topical_after_bath
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=lifestyle_guidance｜id=addon_topical_patch_timing｜title=パッチ貼付部位の使用タイミング】
P_APPEND
パッチを貼る前に使用すると、はがれやすくなることがあります。
パッチを剥がした後など、貼付していないタイミングで使用してください。




【SCENARIO｜type=treatment_start｜id=restart_dryness｜title=ヘパリン類似物質系保湿剤スプレー 再開（乾燥）】
S
ヘパリン類似物質系保湿剤スプレーは、{{applicationSite}}の乾燥や荒れの改善を目的として再開となった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れの改善を目的として使用する。
皮膚状態を整え、症状の悪化予防につなげる。

P
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れを防ぎ、皮膚状態を整える薬です。
皮膚状態を保つため、継続して使用することが大切です。

P_ADDON
- addon_spray_application_method
- addon_topical_after_bath
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=restart_eczema｜title=ヘパリン類似物質系保湿剤スプレー 再開（湿疹）】
S
ヘパリン類似物質系保湿剤スプレーは、{{applicationSite}}の湿疹の改善を目的として再開となった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、皮膚状態の改善を目的として再開する。
皮膚状態を整え、症状の悪化予防につなげる。

P
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れを防ぎ、皮膚状態を整える薬です。
皮膚状態を保つため、継続して使用することが大切です。

P_ADDON
- addon_spray_application_method
- addon_topical_after_bath
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=external_start_dryness｜title=ヘパリン類似物質系保湿剤スプレー 他所開始（乾燥）】
S
ヘパリン類似物質系保湿剤スプレーは、{{applicationSite}}の乾燥や荒れに対して他院で開始され継続使用中であった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れの改善を目的として継続使用中であった。
皮膚状態を整え、症状の悪化予防につなげる。

P
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れを防ぎ、皮膚状態を整える薬です。
皮膚状態を保つため、継続して使用することが大切です。

P_ADDON
- addon_spray_application_method
- addon_topical_after_bath
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=external_start_eczema｜title=ヘパリン類似物質系保湿剤スプレー 他所開始（湿疹）】
S
ヘパリン類似物質系保湿剤スプレーは、{{applicationSite}}の湿疹改善を目的として他院で開始され継続使用中であった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、皮膚状態の改善を目的として継続使用中であった。
皮膚状態を整え、症状改善や状態維持につなげる。

P
ヘパリン類似物質系保湿剤スプレーは、皮膚の乾燥や荒れを防ぎ、皮膚状態を整える薬です。
皮膚状態を保つため、継続して使用することが大切です。

P_ADDON
- addon_spray_application_method
- addon_topical_after_bath
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_low_perceived_effect｜title=ヘパリン類似物質系保湿剤スプレー 回数増（効果実感乏しい）】
S
ヘパリン類似物質系保湿剤スプレーは、効果の実感が乏しいため使用回数が増えた。

O
ヘパリン類似物質系保湿剤スプレー　使用回数増

A
ヘパリン類似物質系保湿剤スプレーは、効果実感が乏しいため使用回数が増えた。
使用回数変更後も、使用状況と皮膚症状の変化を確認する。

P
ヘパリン類似物質系保湿剤スプレーは、指示された回数で継続して使用してください。
使用した場所に気になる変化がある場合はご相談ください。

P_ADDON
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_due_to_other_med_adjustment｜title=ヘパリン類似物質系保湿剤スプレー 回数増（他剤との調整）】
S
ヘパリン類似物質系保湿剤スプレーは、他剤との調整により使用回数が増えた。

O
ヘパリン類似物質系保湿剤スプレー　使用回数増

A
ヘパリン類似物質系保湿剤スプレーは、併用薬との調整により使用回数が増えた。
使用回数変更後も、使用状況と皮膚症状の変化を確認する。

P
ヘパリン類似物質系保湿剤スプレーは、指示された回数で継続して使用してください。
使用した場所に気になる変化がある場合はご相談ください。

P_ADDON
- addon_topical_redness_warning

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_improved｜title=ヘパリン類似物質系保湿剤スプレー 回数減（症状改善）】
S
ヘパリン類似物質系保湿剤スプレーは、症状が改善したため使用回数が減った。

O
ヘパリン類似物質系保湿剤スプレー　使用回数減

A
ヘパリン類似物質系保湿剤スプレーは、症状改善により使用回数が減った。
使用回数変更後も、皮膚症状の変化を確認する。

P
ヘパリン類似物質系保湿剤スプレーは、指示された回数で継続して使用してください。
皮膚症状に変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_low_perceived_effect｜title=ヘパリン類似物質系保湿剤スプレー 回数減（効果実感乏しい）】
S
ヘパリン類似物質系保湿剤スプレーは、効果の実感が乏しく、使用継続に不安があるため使用回数が減った。

O
ヘパリン類似物質系保湿剤スプレー　使用回数減

A
ヘパリン類似物質系保湿剤スプレーは、効果実感の乏しさと使用継続への不安により使用回数が減った。
使用回数変更後も、使用状況と皮膚症状の変化を確認する。

P
ヘパリン類似物質系保湿剤スプレーは、指示された回数で継続して使用してください。
皮膚症状に変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_due_to_other_med_adjustment｜title=ヘパリン類似物質系保湿剤スプレー 回数減（他剤との調整）】
S
ヘパリン類似物質系保湿剤スプレーは、他剤との調整により使用回数が減った。

O
ヘパリン類似物質系保湿剤スプレー　使用回数減

A
ヘパリン類似物質系保湿剤スプレーは、併用薬との調整により使用回数が減った。
使用回数変更後も、皮膚症状の変化を確認する。

P
ヘパリン類似物質系保湿剤スプレーは、指示された回数で継続して使用してください。
皮膚症状に変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_contact_dermatitis_none｜title=ヘパリン類似物質系保湿剤スプレー 副作用なし（接触皮膚炎）】
S
ヘパリン類似物質系保湿剤スプレーを使用して症状は落ち着いている。
かぶれは認めない。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーの使用によるかぶれは現時点で認められず、継続使用に問題はない。

P
ヘパリン類似物質系保湿剤スプレーの使用中に、使用した場所がかぶれることがあります。
皮膚症状に変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_redness_none｜title=ヘパリン類似物質系保湿剤スプレー 副作用なし（発赤）】
S
ヘパリン類似物質系保湿剤スプレーを使用して症状は落ち着いている。
肌の赤みは認めない。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーの使用による赤みは現時点で認められず、継続使用に問題はない。

P
ヘパリン類似物質系保湿剤スプレーの使用中に、使用した場所が赤くなることがあります。
皮膚症状に変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pruritus_none｜title=ヘパリン類似物質系保湿剤スプレー 副作用なし（掻痒感）】
S
ヘパリン類似物質系保湿剤スプレーを使用して症状は落ち着いている。
掻痒感は認めない。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーの使用によるかゆみは現時点で認められず、継続使用に問題はない。

P
ヘパリン類似物質系保湿剤スプレーの使用中に、かゆみが出ることがあります。
皮膚症状に変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_dermatitis_none｜title=ヘパリン類似物質系保湿剤スプレー 副作用なし（皮膚炎）】
S
ヘパリン類似物質系保湿剤スプレーを使用して症状は落ち着いている。
皮膚炎は認めない。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーの使用による皮膚炎は現時点で認められず、継続使用に問題はない。

P
ヘパリン類似物質系保湿剤スプレーの使用中に、使用した場所の状態が変化することがあります。
気になる変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_good｜title=ヘパリン類似物質系保湿剤スプレー CP良好】
S
薬を使用して症状は落ち着いている。
使用忘れなく継続できている。

O
ヘパリン類似物質系保湿剤スプレー　使用中

A
コンプライアンスは良好である。治療継続に問題はない。

P
引き続き用法を守って使用することで、治療効果の維持が期待されます。
今後も継続して使用できるようにすることが大切です。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=ヘパリン類似物質系保湿剤スプレー CP不良（使用忘れ）】
S
使用を忘れることがある。
症状は大きく変わっていない。

O
ヘパリン類似物質系保湿剤スプレー　使用中

A
コンプライアンスは不良で、使用忘れがみられる。

P
継続して使用することで、十分な治療効果が期待されます。
使用忘れが続くと、期待される治療効果が十分に得られない可能性があります。

P_ADDON
- addon_adherence_reminder_alarm
- addon_adherence_reminder_app
- addon_adherence_visual_checklist
- addon_adherence_visual_note
- addon_adherence_schedule_confirmation
- addon_adherence_routine_link
- addon_adherence_support_family_reminder

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_alarm｜title=使用忘れ対策（通知：アラーム）｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、アラームを使用タイミングに合わせて設定しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_app｜title=使用忘れ対策（通知：記録アプリ）｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用記録のできるアプリを活用する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_checklist｜title=使用忘れ対策（見える化：チェックリスト）｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、チェックリストなどで確認する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=使用忘れ対策（見える化：貼り紙）｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用するタイミングを目立つ場所に書いておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_schedule_confirmation｜title=使用忘れ対策（予定確認）｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用するタイミングを事前に確認しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_routine_link｜title=使用忘れ対策（習慣化：生活習慣と結びつける）｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、毎日の習慣と使用を結びつけて覚える方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_support_family_reminder｜title=使用忘れ対策（支援：家族などの声掛け）｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、家族や身近な方に使用したか声をかけてもらう方法があります。




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=ヘパリン類似物質系保湿剤スプレー CP不良（自己判断）】
S
自己判断で使用を調整することがある。
症状は大きく変わっていない。

O
ヘパリン類似物質系保湿剤スプレー　使用中

A
コンプライアンスは不良で、自己判断による調整がみられる。

P
継続して使用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=ヘパリン類似物質系保湿剤スプレー CP不良（受診遅延）】
S
受診が遅れ、使用を調整することがある。
症状は大きく変わっていない。

O
ヘパリン類似物質系保湿剤スプレー　使用中

A
コンプライアンスは不良で、受診遅延がみられる。

P
継続的な使用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=usage｜id=as_needed_refill_needed｜title=ヘパリン類似物質系保湿剤スプレー 頓用使用（処方あり）】
S
ヘパリン類似物質系保湿剤スプレーは、症状が出た時に使用している。
使用により残薬が少なくなったため、継続処方となった。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレーは、必要時に使用されており、残薬状況を踏まえ継続処方となった。

P
ヘパリン類似物質系保湿剤スプレーは、必要に応じて指示された方法で使用してください。
使用した場所に気になる変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=usage｜id=as_needed_refill_not_needed｜title=ヘパリン類似物質系保湿剤スプレー 頓用使用（処方なし）】
S
ヘパリン類似物質系保湿剤スプレーは、症状が出た時に使用している。
残薬があるため、今回は処方なしとなった。

O
ヘパリン類似物質系保湿剤スプレー　使用中

A
ヘパリン類似物質系保湿剤スプレーは、必要時に使用されており、残薬があるため今回は処方なしとなった。

P
ヘパリン類似物質系保湿剤スプレーは、必要に応じて指示された方法で使用してください。
使用した場所に気になる変化がある場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_improved｜title=ヘパリン類似物質系保湿剤スプレー 終了（改善）】
S
ヘパリン類似物質系保湿剤スプレーは、症状が改善したため中止となった。

O
ヘパリン類似物質系保湿剤スプレー　処方終了

A
ヘパリン類似物質系保湿剤スプレーは、症状改善により終了となった。

P
ヘパリン類似物質系保湿剤スプレーの終了後、皮膚状態の変化がある場合はご相談ください。

P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=ヘパリン類似物質系保湿剤スプレー 終了（効果不十分）】
S
ヘパリン類似物質系保湿剤スプレーは、効果不十分のため中止となった。

O
ヘパリン類似物質系保湿剤スプレー　処方終了

A
ヘパリン類似物質系保湿剤スプレーは、効果不十分のため終了となった。

P
ヘパリン類似物質系保湿剤スプレーの終了後、皮膚状態の変化がある場合はご相談ください。

P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=ヘパリン類似物質系保湿剤スプレー 終了（無効）】
S
ヘパリン類似物質系保湿剤スプレーは、効果が認められなかったため中止となった。

O
ヘパリン類似物質系保湿剤スプレー　処方終了

A
ヘパリン類似物質系保湿剤スプレーは、効果が認められなかったため終了となった。

P
ヘパリン類似物質系保湿剤スプレーの終了後、皮膚状態の変化がある場合はご相談ください。

P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=ヘパリン類似物質系保湿剤スプレー SE継続（軽症）】
S
ヘパリン類似物質系保湿剤スプレーの使用により、少し違和感があるが、使用は継続できている。

O
ヘパリン類似物質系保湿剤スプレー　処方

A
ヘパリン類似物質系保湿剤スプレー使用後に軽い皮膚症状がみられるが、継続使用に問題はない。

P
使用した場所の違和感が軽い場合は経過をみてください。
気になる変化が強くなる場合はご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_pruritus｜title=ヘパリン類似物質系保湿剤スプレー SE変更（かゆみ）】
S
ヘパリン類似物質系保湿剤スプレーの使用によりかゆみが出現したため、他剤へ変更となった。

O
ヘパリン類似物質系保湿剤スプレー　処方変更

A
ヘパリン類似物質系保湿剤スプレーの使用による皮膚症状を認め、他剤変更後の経過確認を要する。

P
ヘパリン類似物質系保湿剤スプレーの変更後も、かゆみや皮膚状態の変化がある場合はご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_decrease_due_to_pruritus｜title=ヘパリン類似物質系保湿剤スプレー SE回数減（かゆみ）】
S
ヘパリン類似物質系保湿剤スプレーの使用によりかゆみが強いため、使用回数が減った。

O
ヘパリン類似物質系保湿剤スプレー　使用回数減

A
ヘパリン類似物質系保湿剤スプレーの使用による皮膚症状を認め、使用回数変更後の経過確認を要する。

P
ヘパリン類似物質系保湿剤スプレーの使用回数が減った後もかゆみが続く場合はご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_pruritus｜title=ヘパリン類似物質系保湿剤スプレー SE中止（かゆみ）】
S
ヘパリン類似物質系保湿剤スプレーの使用によりかゆみが強いため、中止となった。

O
ヘパリン類似物質系保湿剤スプレー　処方中止

A
ヘパリン類似物質系保湿剤スプレーの使用による皮膚症状を認め、中止後の経過確認を要する。

P
ヘパリン類似物質系保湿剤スプレーの中止後も、皮膚状態の変化がある場合はご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_moisturizing｜title=生活指導（保湿）】
S
乾燥しているが、なかなか良くならない。

O
ヘパリン類似物質系保湿剤スプレー　使用中

A
乾燥症状の改善に向け、保湿に関する生活指導が必要である。

P
入浴後は皮膚が乾燥しやすくなります。
入浴後に保湿剤を使用すると、皮膚状態を保ちやすくなります。

P_CLOSING
次回、治療経過および皮膚状態の変化を確認。

=======SCENARIOS_END=======
