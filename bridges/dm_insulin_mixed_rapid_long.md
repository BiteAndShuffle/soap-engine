# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_insulin_mixed_rapid_long
# =========================================
moduleId: "dm_insulin_mixed_rapid_long"

categoryPath:
  - "糖尿病"
  - "インスリン製剤"
  - "混合型"
  - "超速効型＋持効型"

drug:
  genericName: "混合型インスリン製剤（超速効型＋持効型）"

  brandNames:
    - "ライゾデグ"

  drugClass:
    - "INSULIN_MIXED_RAPID_LONG"

  route: "injection"

  dosageForms:
    - "injection"

  drugSpecificTags:
    - "insulin_mixed_rapid_long"
    - "insulin_injection"

  search:
    primaryDisplayName: "混合型インスリン製剤（超速効型＋持効型）"

    exactAliases:
      - "ライゾデグ"

    prefixAliases:
      - "らいぞでぐ"
      - "らいぞ"
      - "いんすりんでぐるでく"
      - "でぐるでく"
      - "いんすりんあすぱると"
      - "あすぱると"

    nameAliases:
      - "らいぞでぐ"
      - "らいぞ"
      - "ライゾデグ"
      - "いんすりんでぐるでく"
      - "でぐるでく"
      - "いんすりんあすぱると"
      - "あすぱると"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "らいぞでぐ"
    - "らいぞ"
    - "ライゾデグ"
    - "いんすりんでぐるでく"
    - "でぐるでく"
    - "いんすりんあすぱると"
    - "あすぱると"

  brandCatalog:
    ライゾデグ:
      displayName: "ライゾデグ"

      genericName: "インスリンデグルデク/インスリンアスパルト"

      displayGenericName: "インスリンデグルデク/インスリンアスパルト"

      aliases:
        - "らいぞでぐ"
        - "らいぞ"
        - "ライゾデグ"
        - "いんすりんでぐるでく"
        - "でぐるでく"
        - "いんすりんあすぱると"
        - "あすぱると"

      normalizedAliases:
        - "らいぞでぐ"
        - "らいぞ"
        - "ライゾデグ"
        - "いんすりんでぐるでく"
        - "でぐるでく"
        - "いんすりんあすぱると"
        - "あすぱると"

  aliasToBrand:
    "らいぞでぐ": "ライゾデグ"
    "らいぞ": "ライゾデグ"
    "ライゾデグ": "ライゾデグ"
    "いんすりんでぐるでく": "ライゾデグ"
    "でぐるでく": "ライゾデグ"
    "いんすりんあすぱると": "ライゾデグ"
    "あすぱると": "ライゾデグ"

template:
  templateId: "dm_insulin_mixed_rapid_long_v1"

  templateVersion: "1.0.0"

  situationTags:
    - "general"
    - "sickday"

  severityTags:
    - "mild"
    - "moderate"
    - "severe"

display:
  title: "混合型インスリン製剤（超速効型＋持効型）"

  subtitle: "混合型インスリン製剤（超速効型＋持効型）"

  drugClassLabel: "混合型インスリン製剤（超速効型＋持効型）"

  drugGeneric: "混合型インスリン製剤（超速効型＋持効型）"

  nodeLabelShort: "混合型INS（超速効/持効）"

  nodeLabelLong: "混合型インスリン製剤（超速効型＋持効型）"

  nodeKey: "insulin_mixed_rapid_long_injection"

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
【SCENARIO｜type=treatment_start｜id=initial｜title=混合型インスリン製剤（超速効型＋持効型） 初回】
S
混合型インスリン製剤（超速効型＋持効型）は、血糖値が高いため追加となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）は、血糖コントロール不十分のため追加となった。
食事に伴う血糖上昇を抑え、基礎インスリンを補いながら血糖推移を整える目的で使用する。
食事量や活動量の変化、食事時間のずれにより低血糖が起こる可能性があるため、注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）は、食事に伴う血糖上昇を抑え、基礎インスリンを補いながら血糖推移を整える薬です。
食事に合わせて、決められたタイミングで使用することが重要です。
血糖値が下がりすぎることで、低血糖が起こることがあります。
ふらつき・冷汗・動悸などの症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
注射の具体的な手技については、指導せんを用いて説明しています。
注射方法や使用手順に不安がある場合はご相談ください。
P_ADDON
- addon_glycemic_guidance
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
ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
【ADDON｜type=sickday_guidance｜id=addon_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
血糖測定が可能であれば行ってください。
水分は少量ずつこまめに摂取してください。
インスリンは自己判断で中止しないでください。
治療継続の可否は体調や摂取状況によって異なるため、処方医に相談してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。
【SCENARIO｜type=treatment_start｜id=restart｜title=混合型インスリン製剤（超速効型＋持効型） 再開】
S
混合型インスリン製剤（超速効型＋持効型）は、血糖値が高いため再開となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）は、血糖コントロール不十分のため再開となった。
食事に伴う血糖上昇を抑え、基礎インスリンを補いながら血糖推移を整える目的で使用する。
再開後は低血糖や注射手技に注意しながら継続する必要がある。
P
混合型インスリン製剤（超速効型＋持効型）は、食事に伴う血糖上昇を抑え、基礎インスリンを補いながら血糖推移を整える薬です。
食事に合わせて、決められたタイミングで使用することが重要です。
血糖値が下がりすぎることで、低血糖が起こることがあります。
ふらつき・冷汗・動悸などの症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
注射の具体的な手技については、指導せんを用いて説明しています。
注射方法や使用手順に不安がある場合はご相談ください。
P_ADDON
- addon_glycemic_guidance
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_start｜id=external_start｜title=混合型インスリン製剤（超速効型＋持効型） 他所開始】
S
混合型インスリン製剤（超速効型＋持効型）は、他院で開始され継続使用中であった。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）は、血糖コントロールの改善を目的として継続使用中であった。
食事に伴う血糖上昇を抑え、基礎インスリンを補いながら血糖推移を整え、低血糖や注射手技に注意しながら継続する必要がある。
P
混合型インスリン製剤（超速効型＋持効型）は、食事に伴う血糖上昇を抑え、基礎インスリンを補いながら血糖推移を整える薬です。
食事に合わせて、決められたタイミングで使用することが重要です。
血糖値が下がりすぎることで、低血糖が起こることがあります。
ふらつき・冷汗・動悸などの症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
注射の具体的な手技については、指導せんを用いて説明しています。
注射方法や使用手順に不安がある場合はご相談ください。
P_ADDON
- addon_glycemic_guidance
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=混合型インスリン製剤（超速効型＋持効型） 増量（効果実感乏しい）】
S
混合型インスリン製剤（超速効型＋持効型）は、効果の実感が乏しいため増量となった。
O
混合型インスリン製剤（超速効型＋持効型）　増量
A
混合型インスリン製剤（超速効型＋持効型）は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）は、増量により血糖値が下がりやすくなることがあります。
ふらつき・冷汗・動悸などの低血糖症状に注意してください。
低血糖症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
症状が続く場合はご相談ください。
P_ADDON
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=混合型インスリン製剤（超速効型＋持効型） 増量（検査値改善なし）】
S
混合型インスリン製剤（超速効型＋持効型）は、検査値が改善しないため増量となった。
O
混合型インスリン製剤（超速効型＋持効型）　増量
A
混合型インスリン製剤（超速効型＋持効型）は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）は、増量により血糖値が下がりやすくなることがあります。
ふらつき・冷汗・動悸などの低血糖症状に注意してください。
低血糖症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
症状が続く場合はご相談ください。
P_ADDON
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=混合型インスリン製剤（超速効型＋持効型） 増量（他剤との調整）】
S
混合型インスリン製剤（超速効型＋持効型）は、他剤変更に伴う調整により増量となった。
O
混合型インスリン製剤（超速効型＋持効型）　増量
A
混合型インスリン製剤（超速効型＋持効型）は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）は、増量により血糖値が下がりやすくなることがあります。
ふらつき・冷汗・動悸などの低血糖症状に注意してください。
低血糖症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
症状が続く場合はご相談ください。
P_ADDON
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=混合型インスリン製剤（超速効型＋持効型） 減量（検査値改善）】
S
混合型インスリン製剤（超速効型＋持効型）は、検査値が改善したため減量となった。
O
混合型インスリン製剤（超速効型＋持効型）　減量
A
混合型インスリン製剤（超速効型＋持効型）は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=混合型インスリン製剤（超速効型＋持効型） 減量（効果実感乏しい）】
S
混合型インスリン製剤（超速効型＋持効型）は、効果の実感が乏しいため減量を希望された。
O
混合型インスリン製剤（超速効型＋持効型）　減量
A
混合型インスリン製剤（超速効型＋持効型）は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=混合型インスリン製剤（超速効型＋持効型） 減量（他剤との調整）】
S
混合型インスリン製剤（超速効型＋持効型）は、他剤変更に伴う調整のため減量となった。
O
混合型インスリン製剤（超速効型＋持効型）　減量
A
混合型インスリン製剤（超速効型＋持効型）は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_injection_site_induration_none｜title=混合型インスリン製剤（超速効型＋持効型） 副作用なし（注射部硬結）】
S
混合型インスリン製剤（超速効型＋持効型）を使用して症状は落ち着いている。
注射部位が硬くなるような変化は認めない。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）による注射部位反応は現時点で認められず、治療継続が可能である。
P
混合型インスリン製剤（超速効型＋持効型）の継続中に、注射部位が硬くなることがあります。
毎回注射部位を変えることで予防できます。
気になる症状があればご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance

P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=混合型インスリン製剤（超速効型＋持効型） 副作用なし（低血糖）】
S
混合型インスリン製剤（超速効型＋持効型）を使用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）による低血糖は現時点で認められず、治療継続が可能である。
P
混合型インスリン製剤（超速効型＋持効型）の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
症状が出た場合は、速やかにブドウ糖や糖分を摂取してください。
改善しない場合はご相談ください。
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
【SCENARIO｜type=adherence｜id=cp_good｜title=混合型インスリン製剤（超速効型＋持効型） CP良好】
S
薬を使用して症状は落ち着いている。
継続して使用できている。
O
混合型インスリン製剤（超速効型＋持効型）　使用中
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
【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=混合型インスリン製剤（超速効型＋持効型） CP不良（使用忘れ）】
S
使用忘れがみられる。
継続して使用できていない。
O
混合型インスリン製剤（超速効型＋持効型）　使用中
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
【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=混合型インスリン製剤（超速効型＋持効型） CP不良（自己判断）】
S
自己判断での使用調整がみられる。
用法どおりの継続使用ができていない。
O
混合型インスリン製剤（超速効型＋持効型）　使用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して使用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=混合型インスリン製剤（超速効型＋持効型） CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した使用に不安がある。
O
混合型インスリン製剤（超速効型＋持効型）　使用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な使用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_end｜id=end_improved｜title=混合型インスリン製剤（超速効型＋持効型） 終了（改善）】
S
混合型インスリン製剤（超速効型＋持効型）は、血糖コントロールが改善したため中止となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方終了
A
混合型インスリン製剤（超速効型＋持効型）は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
混合型インスリン製剤（超速効型＋持効型）終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。
【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=混合型インスリン製剤（超速効型＋持効型） 終了（効果不十分）】
S
混合型インスリン製剤（超速効型＋持効型）は、効果不十分のため中止となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方終了
A
混合型インスリン製剤（超速効型＋持効型）は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
混合型インスリン製剤（超速効型＋持効型）終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。
【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=混合型インスリン製剤（超速効型＋持効型） 終了（無効）】
S
混合型インスリン製剤（超速効型＋持効型）は、効果が認められなかったため中止となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方終了
A
混合型インスリン製剤（超速効型＋持効型）は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
混合型インスリン製剤（超速効型＋持効型）終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。
【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=混合型インスリン製剤（超速効型＋持効型） SE継続（軽症・低血糖）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により軽いふらつきや冷汗などがあるが、日常生活は送れている。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）による低血糖症状を軽度認めるが、治療継続が可能である。
P
混合型インスリン製剤（超速効型＋持効型）による低血糖症状が軽い場合は、ブドウ糖や糖分を摂取して対処してください。
食事量が少ない時や食事時間が遅れる時は、低血糖が起こりやすくなることがあります。
症状が強く続く場合は、用量調整が必要になることがあります。
症状が強くなる、長引く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_injection_site_reaction_mild_continue｜title=混合型インスリン製剤（超速効型＋持効型） SE継続（注射部位・軽症）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により注射部位に軽い痛みやしこりがあるが、治療は継続できている。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）による注射部位反応を軽度認めるが、治療継続が可能である。
P
混合型インスリン製剤（超速効型＋持効型）により注射部位に軽い痛みやしこりが出ることがあります。
毎回注射部位を変えることで予防や軽減につながります。
症状が強くなる、長引く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_hypoglycemia_moderate_consider_dr｜title=混合型インスリン製剤（超速効型＋持効型） SE継続（中等度・低血糖）】
S
混合型インスリン製剤（超速効型＋持効型）の使用によりふらつき・冷汗などが強く、辛いことがあるが、日常生活は送れている。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）による低血糖症状が強く、継続困難の可能性があるため対応を要する。
P
混合型インスリン製剤（超速効型＋持効型）による低血糖症状がある場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
食事量が少ない時や食事時間が遅れる時は、低血糖が起こりやすくなることがあります。
低血糖症状が強く続く場合は、減量や薬の変更が必要になることがあります。
自己判断で対応せず、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_injection_site_reaction_moderate_consider_dr｜title=混合型インスリン製剤（超速効型＋持効型） SE継続（注射部位・中等度）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により注射部位の痛みや腫れが強く、気になることがある。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
混合型インスリン製剤（超速効型＋持効型）による注射部位反応が強く、継続困難の可能性があるため対応を要する。
P
混合型インスリン製剤（超速効型＋持効型）の使用では、毎回注射部位を少しずつ変えて注射することで、痛みや腫れの予防・軽減につながります。
症状が強く続く場合は、注射方法の見直しや薬の変更が必要になることがあります。
処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_change_due_to_hypoglycemia｜title=混合型インスリン製剤（超速効型＋持効型） SE変更（低血糖）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により低血糖症状が出現したため、他剤へ変更となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方変更
A
混合型インスリン製剤（超速効型＋持効型）の使用による低血糖症状を認め、他剤変更後の経過確認を要する。
P
混合型インスリン製剤（超速効型＋持効型）の変更後、ふらつき・冷汗・動悸などの低血糖症状や、血糖上昇による体調変化に注意してください。
気になる症状があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_change_due_to_injection_site_reaction｜title=混合型インスリン製剤（超速効型＋持効型） SE変更（注射部位）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により注射部位の痛みや腫れが出現したため、他剤へ変更となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方変更
A
混合型インスリン製剤（超速効型＋持効型）の使用による注射部位反応を認め、他剤変更後の経過確認を要する。
P
混合型インスリン製剤（超速効型＋持効型）の変更後、注射部位の症状や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_hypoglycemia｜title=混合型インスリン製剤（超速効型＋持効型） SE減量（低血糖）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により低血糖症状が強いため、減量となった。
O
混合型インスリン製剤（超速効型＋持効型）　減量
A
混合型インスリン製剤（超速効型＋持効型）の使用による低血糖症状を認め、減量後の経過確認を要する。
P
混合型インスリン製剤（超速効型＋持効型）の減量後は低血糖症状が改善することが期待されますが、血糖値が上昇する可能性もあります。
ふらつき・冷汗・動悸などの症状や、体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_stop_due_to_hypoglycemia｜title=混合型インスリン製剤（超速効型＋持効型） SE中止（低血糖）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により低血糖症状が強いため、中止となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方中止
A
混合型インスリン製剤（超速効型＋持効型）の使用による低血糖症状を認め、中止後の経過確認を要する。
P
混合型インスリン製剤（超速効型＋持効型）の中止後、低血糖症状が改善することが期待されますが、血糖値が上昇する可能性があります。
血糖上昇による口渇・倦怠感などの体調変化にも注意してください。
気になる症状があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_stop_due_to_injection_site_reaction｜title=混合型インスリン製剤（超速効型＋持効型） SE中止（注射部位）】
S
混合型インスリン製剤（超速効型＋持効型）の使用により注射部位の痛みや腫れが強いため、中止となった。
O
混合型インスリン製剤（超速効型＋持効型）　処方中止
A
混合型インスリン製剤（超速効型＋持効型）の使用による注射部位反応を認め、中止後の経過確認を要する。
P
混合型インスリン製剤（超速効型＋持効型）中止後も、注射部位の症状が続く場合や悪化する場合は、医療機関へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=混合型インスリン製剤（超速効型＋持効型） 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
混合型インスリン製剤（超速効型＋持効型）　処方
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
【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=混合型インスリン製剤（超速効型＋持効型） 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
混合型インスリン製剤（超速効型＋持効型）　処方
A
カリウムコントロールが不十分であり、食事療法の継続が重要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になる症状があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=sickday｜id=sickday｜title=混合型インスリン製剤（超速効型＋持効型） シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
混合型インスリン製剤（超速効型＋持効型）　使用中
A
食事摂取低下および消化器症状により脱水リスクと低血糖リスクが上昇しており、シックデイ時の対応に注意が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
血糖測定が可能であれば行ってください。
水分は少量ずつこまめに摂取してください。
インスリンは自己判断で中止しないでください。
治療継続の可否は体調や摂取状況によって異なるため、処方医に相談してください。
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
混合型インスリン製剤（超速効型＋持効型）　使用中
A
混合型インスリン製剤（超速効型＋持効型）の注射手技の確認が必要である。
P
注射の具体的な手技については、指導せんを用いて改めて説明しています。
同じ部位に繰り返し注射すると、皮膚が硬くなることがあります。
注射部位は毎回適切に変えながら使用してください。
不安が残る場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
=======SCENARIOS_END=======
