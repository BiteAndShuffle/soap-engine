# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_glp1ra_injection
# =========================================
moduleId: "dm_glp1ra_injection"

categoryPath:
  - "糖尿病"
  - "GLP-1受容体作動薬"
  - "注射"

drug:
  genericName: "GLP-1受容体作動薬"

  brandNames:
    - "ビクトーザ"
    - "バイエッタ"
    - "リキスミア"
    - "トルリシティ"
    - "オゼンピック"

  drugClass:
    - "GLP1_RA"

  route: "injection"

  dosageForms:
    - "injection"

  drugSpecificTags:
    - "glp1ra_injection"

  search:
    primaryDisplayName: "GLP-1受容体作動薬（注射）"

    exactAliases:
      - "ビクトーザ"
      - "バイエッタ"
      - "リキスミア"
      - "トルリシティ"
      - "オゼンピック"

    prefixAliases:
      - "びくとーざ"
      - "びく"
      - "びくと"
      - "ばいえった"
      - "ばい"
      - "ばいえ"
      - "りきすみあ"
      - "りき"
      - "りきす"
      - "とるりしてぃ"
      - "とる"
      - "とるり"
      - "おぜんぴっく"
      - "おぜ"
      - "おぜん"

    nameAliases:
      - "びくとーざ"
      - "びく"
      - "びくと"
      - "ばいえった"
      - "ばい"
      - "ばいえ"
      - "りきすみあ"
      - "りき"
      - "りきす"
      - "とるりしてぃ"
      - "とる"
      - "とるり"
      - "おぜんぴっく"
      - "おぜ"
      - "おぜん"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "びくとーざ"
    - "びく"
    - "びくと"
    - "ばいえった"
    - "ばい"
    - "ばいえ"
    - "りきすみあ"
    - "りき"
    - "りきす"
    - "とるりしてぃ"
    - "とる"
    - "とるり"
    - "おぜんぴっく"
    - "おぜ"
    - "おぜん"

  brandCatalog:
    ビクトーザ:
      displayName: "ビクトーザ"

      genericName: "リラグルチド"

      displayGenericName: "リラグルチド"

      aliases:
        - "びくとーざ"
        - "びく"
        - "びくと"

      normalizedAliases:
        - "びくとーざ"
        - "びく"
        - "びくと"

    バイエッタ:
      displayName: "バイエッタ"

      genericName: "エキセナチド"

      displayGenericName: "エキセナチド"

      aliases:
        - "ばいえった"
        - "ばい"
        - "ばいえ"

      normalizedAliases:
        - "ばいえった"
        - "ばい"
        - "ばいえ"

    リキスミア:
      displayName: "リキスミア"

      genericName: "リキシセナチド"

      displayGenericName: "リキシセナチド"

      aliases:
        - "りきすみあ"
        - "りき"
        - "りきす"

      normalizedAliases:
        - "りきすみあ"
        - "りき"
        - "りきす"

    トルリシティ:
      displayName: "トルリシティ"

      genericName: "デュラグルチド"

      displayGenericName: "デュラグルチド"

      aliases:
        - "とるりしてぃ"
        - "とる"
        - "とるり"

      normalizedAliases:
        - "とるりしてぃ"
        - "とる"
        - "とるり"

    オゼンピック:
      displayName: "オゼンピック"

      genericName: "セマグルチド"

      displayGenericName: "セマグルチド"

      aliases:
        - "おぜんぴっく"
        - "おぜ"
        - "おぜん"

      normalizedAliases:
        - "おぜんぴっく"
        - "おぜ"
        - "おぜん"

  aliasToBrand:
    "びくとーざ": "ビクトーザ"
    "びく": "ビクトーザ"
    "びくと": "ビクトーザ"
    "ばいえった": "バイエッタ"
    "ばい": "バイエッタ"
    "ばいえ": "バイエッタ"
    "りきすみあ": "リキスミア"
    "りき": "リキスミア"
    "りきす": "リキスミア"
    "とるりしてぃ": "トルリシティ"
    "とる": "トルリシティ"
    "とるり": "トルリシティ"
    "おぜんぴっく": "オゼンピック"
    "おぜ": "オゼンピック"
    "おぜん": "オゼンピック"

template:
  templateId: "dm_glp1ra_injection_v1"

  templateVersion: "1.0.0"

  situationTags:
    - "general"
    - "sickday"

  severityTags:
    - "mild"
    - "moderate"
    - "severe"

display:
  title: "GLP-1受容体作動薬（注射）"

  subtitle: "GLP-1受容体作動薬（注射）"

  drugClassLabel: "GLP-1受容体作動薬"

  drugGeneric: "GLP-1受容体作動薬"

  nodeLabelShort: "GLP1注射"

  nodeLabelLong: "GLP-1受容体作動薬（注射）"

  nodeKey: "glp1ra_injection"

  menuGroupLabels:
    増量: "増量"
    減量: "減量"

  adjustmentExpression:
    increasePast: "増量となった"
    decreasePast: "減量となった"

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

  currentPriority:
    - "現在の主目的は、実運用アプリを成立させること"
    - "自然言語指導文の構造安定化"
    - "自然言語からJSONへの安全な反映"
    - "既存メモ帳運用の移植"

  nearFuturePriority:
    - "人格切替・ペルソナモードは近未来の優先実装対象"

  futureExpansionPolicy:
    - "将来の拡張枠は保持してよい"
    - "ただし、現時点で未使用の枠を勝手に具体化しない"
    - "ユーザーが明示的に要求しない限り、将来機能の詳細設計を追加しない"
    - "スケールアップ前提の提案を現在要件へ混入させない"

  nonGoals:
    - "監査自動化ロジックの拡充"
    - "自動scenario選択エンジンの具体化"
    - "定義済みsemantic merge仕様を超える複数薬自動合成ロジックを、bridge原稿側で勝手に設計しない"
    - "個人情報前提の高度パーソナライズ設計"

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

    - "S / S_APPEND では、初回・増量・減量・終了・副作用・シックデイ・使用状況確認など、薬剤ごとの状態や変更理由を表す場合、薬剤名・薬効分類名を {{drug_subject}} へ読み替える"

    - "A / P / A_APPEND / P_APPEND では、薬剤名・薬効分類名が使用薬・対象薬・治療薬として使われている場合のみ {{drug_subject}} へ読み替える。薬効説明・作用機序・症状説明・使用方法説明・疾患説明などの一般説明文として使われている場合は置換しない"

    - "薬効説明・作用機序・症状説明・使用方法説明など、薬剤主語ではない一般説明文は {{drug_subject}} へ置換しない"

    - "{{drug_subject}} への読み替えは、薬剤名・薬効分類名が主語・使用薬・対象薬・治療薬として明示されている本文にのみ適用する"

    - "Oフィールドでは、薬剤名・薬効分類名を表す部分を {{drug_subject}} へ読み替え、処方・導入・使用開始・継続・増量・減量・使用中・処方終了・処方変更・処方中止などの状態語は保持する"

    - "全体状態評価シナリオ（例：CP良好、CP不良など）では、Sフィールドの主語省略を許容する"

    - "主語省略を許容するシナリオでは、JSON化時に S フィールドへ {{drug_subject}} を補わない"

    - "本文監査では意味一致だけでなく、文型・接続・主語構造の維持を重視する"

    - "多剤合成時のS統合では、groupKeyは削除キーではなく統合候補キーとして扱う"

    - "S統合は groupKey 単独ではなく semantic merge を前提とする"

    - "同一clinicalDomain・同一groupKey・同一理由・同一述語で、drug_subjectのみが異なる場合は、S主語統合の対象とする"

    - "clinicalDomainまたは理由・述語が異なるSは統合せず別行維持する"

    - "runtime時のS統合・semantic merge挙動は buildSoap.ts / canonical JSON を正本とする"

    - "bridge原稿では runtime merge の詳細実装を再定義せず、canonical JSON と実装側の仕様に従う"

    - "lifestyle_guidance系scenario idは用途ごとに一意化する（例：lifestyle_guidance_hyperglycemia、lifestyle_guidance_hyperkalemia）"

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

    - "生活指導ADDONは、初回系では既存S/Aと重複しやすいためP_APPENDのみのinitial用ADDONを使用する"

    - "副作用なし・CP良好などの継続確認系では、必要に応じてA_APPENDを含むfollowup用ADDONを使用する"

    - "S_APPEND付きADDONは、薬剤師が実際に該当内容を確認・説明した場合のみ選択する"

    - "注射手技・デバイス操作・注射部位管理など、注射製剤固有の注意事項は injection固有ADDONまたは本文で定義する"

  outputRules:
    - "自然言語監査では、原稿の欠落・誤記・構造揺れ・参照不一致のみを扱う"

    - "JSON監査では、型・キー・参照・後方互換・canonical JSON一致のみを扱う"

    - "提案は現在要件と将来拡張を明確に分離して述べる"



=======SCENARIOS_START=======

【SCENARIO｜type=treatment_start｜id=initial｜title=GLP-1受容体作動薬(注射) 初回】
S
GLP-1受容体作動薬(注射)は、血糖値が高いため追加となった。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)は、血糖コントロール不十分のため追加となった。
血糖依存的にインスリン分泌を促進し、食欲抑制作用も併せ持つ。
血糖改善および体重管理の補助を目的として使用する。

P
GLP-1受容体作動薬(注射)は、血糖値を改善する薬です。
悪心や食欲不振などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
注射の具体的な手技については、指導せんを用いて説明しています。
注射方法や使用手順に不安がある場合はご相談ください。

P_ADDON
- addon_glycemic_guidance
- addon_se_hypoglycemia_guidance
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance｜title=生活指導（血糖指導）】
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になる症状があればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_hyperkalemia_guidance｜title=生活指導（カリウム）】
S_APPEND
カリウムの値が高いと言われた。

A_APPEND
カリウムコントロールが不十分であり、食事内容の見直しが必要である。

P_APPEND
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。


【ADDON｜type=side_effect_guidance｜id=addon_se_hypoglycemia_guidance｜title=副作用注意喚起（低血糖）】
P_APPEND
他の糖尿病薬と併用している場合は、ふらつき・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。


【ADDON｜type=sickday_guidance｜id=addon_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
血糖測定が可能であれば行ってください。
水分は少量ずつこまめに摂取してください。
治療継続の可否は体調や摂取状況によって異なります。
自己判断せず、処方医に相談してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。



【SCENARIO｜type=treatment_start｜id=restart｜title=GLP-1受容体作動薬(注射) 再開】
S
GLP-1受容体作動薬(注射)は、血糖値が高いため再開となった。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)は、血糖コントロール不十分のため再開となった。
血糖依存的にインスリン分泌を促進し、食欲抑制作用も併せ持つ。
血糖改善および体重管理の補助を目的として使用する。

P
GLP-1受容体作動薬(注射)は、血糖値を改善する薬です。
悪心や食欲不振などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
注射の具体的な手技については、指導せんを用いて説明しています。
注射方法や使用手順に不安がある場合はご相談ください。

P_ADDON
- addon_glycemic_guidance
- addon_se_hypoglycemia_guidance
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=external_start｜title=GLP-1受容体作動薬(注射) 他所開始】
S
GLP-1受容体作動薬(注射)は、他院で開始され継続使用中であった。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)は、血糖コントロール改善を目的として継続使用中であった。
血糖依存的にインスリン分泌を促進し、食欲抑制作用も併せ持つ。
血糖改善および体重管理の補助を目的として使用する。

P
GLP-1受容体作動薬(注射)は、血糖値を改善する薬です。
悪心や食欲不振などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
注射の具体的な手技については、指導せんを用いて説明しています。
注射方法や使用手順に不安がある場合はご相談ください。

P_ADDON
- addon_glycemic_guidance
- addon_se_hypoglycemia_guidance
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=GLP-1受容体作動薬(注射) 増量（効果実感乏しい）】
S
GLP-1受容体作動薬(注射)は、効果の実感が乏しいため増量となった。

O
GLP-1受容体作動薬(注射)　増量

A
GLP-1受容体作動薬(注射)は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。

P
GLP-1受容体作動薬(注射)は、増量により吐き気・下痢・便秘などの消化器症状や食欲低下が出やすくなることがあります。
消化器症状が強い場合はご相談ください。

P_ADDON
- addon_se_hypoglycemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=GLP-1受容体作動薬(注射) 増量（検査値改善なし）】
S
GLP-1受容体作動薬(注射)は、検査値が改善しないため増量となった。

O
GLP-1受容体作動薬(注射)　増量

A
GLP-1受容体作動薬(注射)は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。

P
GLP-1受容体作動薬(注射)は、増量により吐き気・下痢・便秘などの消化器症状や食欲低下が出やすくなることがあります。
消化器症状が強い場合はご相談ください。

P_ADDON
- addon_se_hypoglycemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=GLP-1受容体作動薬(注射) 増量（他剤との調整）】
S
GLP-1受容体作動薬(注射)は、他剤変更に伴う調整により増量となった。

O
GLP-1受容体作動薬(注射)　増量

A
GLP-1受容体作動薬(注射)は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。

P
GLP-1受容体作動薬(注射)は、増量により吐き気・下痢・便秘などの消化器症状や食欲低下が出やすくなることがあります。
消化器症状が強い場合はご相談ください。

P_ADDON
- addon_se_hypoglycemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=GLP-1受容体作動薬(注射) 減量（症状改善）】
S
GLP-1受容体作動薬(注射)は、検査値が改善したため減量となった。

O
GLP-1受容体作動薬(注射)　減量

A
GLP-1受容体作動薬(注射)は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。

P
GLP-1受容体作動薬(注射)は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=GLP-1受容体作動薬(注射) 減量（効果実感乏しい）】
S
GLP-1受容体作動薬(注射)は、効果の実感が乏しいため減量を希望された。

O
GLP-1受容体作動薬(注射)　減量

A
GLP-1受容体作動薬(注射)は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。

P
GLP-1受容体作動薬(注射)は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=GLP-1受容体作動薬(注射) 減量（他剤との調整）】
S
GLP-1受容体作動薬(注射)は、他剤変更に伴う調整のため減量となった。

O
GLP-1受容体作動薬(注射)　減量

A
GLP-1受容体作動薬(注射)は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。

P
GLP-1受容体作動薬(注射)は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_injection_site_induration_none｜title=GLP-1受容体作動薬(注射) 副作用なし（注射部硬結）】
S
GLP-1受容体作動薬(注射)を使用して症状は落ち着いている。
注射部位が硬くなるような変化は認めない。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による注射部位反応は現時点で認められず、治療継続が可能である。

P
GLP-1受容体作動薬(注射)の継続中に、注射部位が硬くなることがあります。
毎回注射部位を変えることで予防できます。
気になる症状があればご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=GLP-1受容体作動薬(注射) 副作用なし（低血糖）】
S
GLP-1受容体作動薬(注射)を使用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による低血糖は現時点で認められず、治療継続が可能である。

P
GLP-1受容体作動薬(注射)の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
単剤では低血糖は起こりにくい薬ですが、他の糖尿病薬と併用中は低血糖が起こることがあります。
症状が出た場合は糖分を摂取してください。
改善しない場合はご相談ください。

P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_nausea_diarrhea_none｜title=GLP-1受容体作動薬(注射) 副作用なし（悪心・下痢）】
S
GLP-1受容体作動薬(注射)を使用して症状は落ち着いている。
悪心・下痢などの消化器症状は認めない。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による消化器症状は現時点で認められず、治療継続が可能である。

P
GLP-1受容体作動薬(注射)の継続中に吐き気・下痢などが出ることがあります。
症状が続く場合はご相談ください。

P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_followup｜title=生活指導（血糖指導）】
A_APPEND
血糖コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。

P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_hypertension_guidance｜title=生活指導（血圧）】
S_APPEND
血圧が高いと言われた。

A_APPEND
血圧コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。


P_APPEND
血圧が高い状態が続くと、心臓や血管へ負担がかかることがあります。
食事療法や運動療法は、血圧のコントロールにおいて重要です。
塩分の摂りすぎに注意しましょう。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_dyslipidemia_guidance｜title=生活指導（脂質）】
S_APPEND
脂質が高いと言われた。

A_APPEND
脂質コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。

P_APPEND
脂質が高い状態が続くと、動脈硬化のリスクが高まることがあります。
食事療法や運動療法は、脂質のコントロールにおいて重要です。
食生活の見直しを継続していきましょう。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_hyperuricemia_guidance｜title=生活指導（尿酸）】
S_APPEND
尿酸が高いと言われた。

A_APPEND
尿酸コントロールが不十分であり、食事療法および生活習慣の見直しが必要である。


P_APPEND
尿酸が高い状態が続くと、痛風発作などにつながることがあります。
食事療法は、尿酸のコントロールにおいて重要です。
食生活の見直しを継続していきましょう。
気になることがあればご相談ください。




【SCENARIO｜type=side_effect｜id=se_appetite_loss_none｜title=GLP-1受容体作動薬(注射) 副作用なし（食欲不振）】
S
GLP-1受容体作動薬(注射)を使用して症状は落ち着いている。
食欲低下は認めない。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による食欲低下は現時点で認められず、治療継続が可能である。

P
GLP-1受容体作動薬(注射)の継続中に食欲低下が出ることがあります。
食事量が落ちる・体重が急に減るなどの変化があればご相談ください。

P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pancreatitis_none｜title=GLP-1受容体作動薬(注射) 副作用なし（膵炎）】
S
GLP-1受容体作動薬(注射)を使用して症状は落ち着いている。
強い腹痛や背部痛などの症状は認めない。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による膵炎は現時点で認められず、治療継続が可能である。

P
GLP-1受容体作動薬(注射)の継続中に、強い腹痛や背中に響く痛みが出ることがあります。
こうした症状が続く場合は膵炎の可能性があります。
痛みが強い・発熱を伴う・我慢できないほどの場合は、救急受診も検討してください。

P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_good｜title=GLP-1受容体作動薬(注射) CP良好】
S
薬を使用して症状は落ち着いている。
継続して使用できている。

O
GLP-1受容体作動薬(注射)　使用中

A
コンプライアンスは良好である。治療継続に問題はない。

P
引き続き用法を守って使用することで、血糖コントロールの維持および合併症予防が期待できます。
今後も継続して使用できるようにすることが大切です。

P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=GLP-1受容体作動薬(注射) CP不良（使用忘れ）】
S
使用忘れがみられる。
継続して使用できていない。

O
GLP-1受容体作動薬(注射)　使用中

A
コンプライアンスは不良で、使用忘れがみられる。

P
継続して使用することで血糖コントロールの維持が期待されます。
使用忘れが続くと血糖値が不安定となる可能性があります。

P_ADDON
- addon_adherence_reminder_alarm
- addon_adherence_reminder_app
- addon_adherence_visual_calendar_checklist
- addon_adherence_visual_note
- addon_adherence_schedule_confirmation
- addon_adherence_support_family_reminder

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_alarm｜title=使用忘れ対策（通知：アラーム）｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、アラームを使用時間に合わせて設定しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_app｜title=使用忘れ対策（通知：記録アプリ）｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用記録のできるアプリを活用する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_calendar_checklist｜title=使用忘れ対策（見える化：カレンダー・チェックリスト）｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、カレンダーや使用チェックリストで確認する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=使用忘れ対策（見える化：貼り紙）｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用するタイミングを目立つ場所に書いておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_schedule_confirmation｜title=使用忘れ対策（予定確認）｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用するタイミングを事前に確認しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_support_family_reminder｜title=使用忘れ対策（支援：家族などの声掛け）｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、家族や身近な方に使用したか声をかけてもらう方法があります。




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=GLP-1受容体作動薬(注射) CP不良（自己判断）】
S
自己判断での使用調整がみられる。
用法どおりの継続使用ができていない。

O
GLP-1受容体作動薬(注射)　使用中

A
コンプライアンスは不良で、自己判断による調整がみられる。

P
継続して使用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=GLP-1受容体作動薬(注射) CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した使用に不安がある。

O
GLP-1受容体作動薬(注射)　使用中

A
コンプライアンスは不良で、受診遅延がみられる。

P
継続的な使用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_improved｜title=GLP-1受容体作動薬(注射) 終了（改善）】
S
GLP-1受容体作動薬(注射)は、血糖コントロールが改善したため中止となった。

O
GLP-1受容体作動薬(注射)　処方終了

A
GLP-1受容体作動薬(注射)は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。

P
GLP-1受容体作動薬(注射)終了後、血糖上昇や体調変化がある場合はご相談ください。

P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=GLP-1受容体作動薬(注射) 終了（効果不十分）】
S
GLP-1受容体作動薬(注射)は、効果不十分のため中止となった。

O
GLP-1受容体作動薬(注射)　処方終了

A
GLP-1受容体作動薬(注射)は、効果不十分のため終了となった。血糖管理の再評価が必要である。

P
GLP-1受容体作動薬(注射)終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。

P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=GLP-1受容体作動薬(注射) 終了（無効）】
S
GLP-1受容体作動薬(注射)は、効果が認められなかったため中止となった。

O
GLP-1受容体作動薬(注射)　処方終了

A
GLP-1受容体作動薬(注射)は、効果が認められなかったため終了となった。治療方針の変更が必要である。

P
GLP-1受容体作動薬(注射)終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。

P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=GLP-1受容体作動薬(注射) SE継続（軽症）】
S
GLP-1受容体作動薬(注射)の使用により吐き気・下痢・便秘などがあるが、日常生活は送れている。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による消化器症状を軽度認めるが、治療継続が可能である。

P
GLP-1受容体作動薬(注射)による症状が軽い場合は、食事量を無理なく調整し、脂っこいものを控えることで改善することがあります。
便秘や下痢などの症状が強く続く場合は調整が必要なことがあります。
ご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_injection_site_reaction_mild_continue｜title=GLP-1受容体作動薬(注射) SE継続（注射部位・軽症）】
S
GLP-1受容体作動薬(注射)の使用により注射部位に軽い痛みやしこりがあるが、日常生活は送れている。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による注射部位反応を軽度認めるが、治療継続が可能である。

P
GLP-1受容体作動薬(注射)により注射部位に軽い痛みやしこりが出ることがあります。
毎回注射部位を変えることで予防や軽減につながります。
症状が強くなる、長引く場合はご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_moderate_consider_dr｜title=GLP-1受容体作動薬(注射) SE継続（中等度）】
S
GLP-1受容体作動薬(注射)の使用により吐き気・下痢・便秘が強く、辛いことがあるが、日常生活は送れている。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による消化器症状が強く、継続困難の可能性があるため対応を要する。

P
GLP-1受容体作動薬(注射)による症状が強い場合は、減量や薬の変更、便秘薬などの追加が必要になることがあります。
処方医へご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_injection_site_reaction_moderate_consider_dr｜title=GLP-1受容体作動薬(注射) SE継続（注射部位・中等度）】
S
GLP-1受容体作動薬(注射)の使用により注射部位の痛みや腫れが強く、気になることがある。

O
GLP-1受容体作動薬(注射)　処方

A
GLP-1受容体作動薬(注射)による注射部位反応が強く、継続困難の可能性があるため対応を要する。

P
GLP-1受容体作動薬(注射)により注射部位の痛みや腫れが強い場合は、使用方法の見直しや薬の変更が必要になることがあります。
症状が続く場合は処方医へご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_gi_symptoms｜title=GLP-1受容体作動薬(注射) SE変更（消化器症状）】
S
GLP-1受容体作動薬(注射)の使用により吐き気・下痢・便秘が出現したため、他剤へ変更となった。

O
GLP-1受容体作動薬(注射)　処方変更

A
GLP-1受容体作動薬(注射)の使用による消化器症状を認め、他剤変更後の経過確認を要する。

P
GLP-1受容体作動薬(注射)の変更後、血糖上昇や体調変化があればご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_injection_site_reaction｜title=GLP-1受容体作動薬(注射) SE変更（注射部位）】
S
GLP-1受容体作動薬(注射)の使用により注射部位の痛みや腫れが出現したため、他剤へ変更となった。

O
GLP-1受容体作動薬(注射)　処方変更

A
GLP-1受容体作動薬(注射)の使用による注射部位反応を認め、他剤変更後の経過確認を要する。

P
GLP-1受容体作動薬(注射)の変更後、注射部位の症状や体調変化があればご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_gi_symptoms｜title=GLP-1受容体作動薬(注射) SE減量（消化器症状）】
S
GLP-1受容体作動薬(注射)の使用により吐き気・下痢・便秘がひどいため、減量となった。

O
GLP-1受容体作動薬(注射)　減量

A
GLP-1受容体作動薬(注射)の使用による消化器症状を認め、減量後の経過確認を要する。

P
GLP-1受容体作動薬(注射)の減量後も消化器症状が続く場合はご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。





【SCENARIO｜type=side_effect｜id=se_stop_due_to_gi_symptoms｜title=GLP-1受容体作動薬(注射) SE中止（消化器症状）】
S
GLP-1受容体作動薬(注射)の使用により吐き気・下痢・便秘がひどいため、中止となった。

O
GLP-1受容体作動薬(注射)　処方中止

A
GLP-1受容体作動薬(注射)の使用による消化器症状を認め、中止後の経過確認を要する。

P
GLP-1受容体作動薬(注射)の中止後、血糖上昇や体調変化があればご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_injection_site_reaction｜title=GLP-1受容体作動薬(注射) SE中止（注射部位）】
S
GLP-1受容体作動薬(注射)の使用により注射部位の痛みや腫れが強いため、中止となった。

O
GLP-1受容体作動薬(注射)　処方中止

A
GLP-1受容体作動薬(注射)の使用による注射部位反応を認め、中止後の経過確認を要する。

P
GLP-1受容体作動薬(注射)中止後も、注射部位の症状が続く場合や悪化する場合は、医療機関へご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=GLP-1受容体作動薬(注射) 生活指導（血糖）】
S
血糖値がなかなか改善しない。

O
GLP-1受容体作動薬(注射)　処方

A
血糖コントロールが不十分であり、生活習慣の改善が重要である。食事・運動療法の継続が必要である。

P
高血糖が続くと、眼・腎・神経障害などのリスクが高まります。
薬物療法に加え、食事・運動療法も血糖コントロールにおいて重要です。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖コントロールの改善に伴い、低血糖症状が出ることがあります。
気になる症状があればご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=GLP-1受容体作動薬(注射) 生活指導（カリウム）】
S
カリウムの値が高いと言われた。

O
GLP-1受容体作動薬(注射)　処方

A
カリウムコントロールが不十分であり、食事療法の継続が重要である。

P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になる症状があればご相談ください。

P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=sickday｜id=sickday｜title=GLP-1受容体作動薬(注射) シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。

O
GLP-1受容体作動薬(注射)　使用中

A
食事摂取低下および消化器症状により脱水リスクが上昇している。併用薬によっては低血糖リスクもあり、シックデイ時の対応に注意が必要である。

P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
血糖測定が可能であれば行ってください。
水分は少量ずつこまめに摂取してください。
治療継続の可否は体調や摂取状況によって異なります。
自己判断せず、処方医に相談してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。

P_ADDON
- addon_sickday_hold_sglt2_metformin

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=sickday_guidance｜id=addon_sickday_hold_sglt2_metformin｜title=シックデイ時併用薬注意】
P_APPEND
併用中のSGLT2阻害薬やメトホルミンは、脱水時は休薬が必要な場合があります。
自己判断で中止せず、処方医へご相談ください。




【SCENARIO｜type=followup｜id=injection_technique_check｜title=注射手技の確認】
S
注射手技に不安がみられる。

O
GLP-1受容体作動薬(注射)　使用中

A
GLP-1受容体作動薬(注射)の注射手技の確認が必要である。

P
注射の具体的な手技については、指導せんを用いて改めて説明しています。
同じ部位に繰り返し注射すると、皮膚が硬くなることがあります。
注射部位は毎回適切に変えながら使用してください。
不安が残る場合はご相談ください。

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======
