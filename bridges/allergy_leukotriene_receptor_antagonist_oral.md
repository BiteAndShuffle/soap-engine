# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# allergy_leukotriene_receptor_antagonist_oral
# =========================================
moduleId: "allergy_leukotriene_receptor_antagonist_oral"
categoryPath:
  - "アレルギー"
  - "ロイコトリエン受容体拮抗薬"
  - "内服"
drug:
  genericName: "ロイコトリエン受容体拮抗薬"
  brandNames:
    - "オノン"
    - "キプレス"
    - "シングレア"
    - "プランルカスト"
    - "モンテルカスト"
  drugClass:
    - "LEUKOTRIENE_RECEPTOR_ANTAGONIST"
  route: "oral"
  dosageForms:
    - "tablet"
    - "capsule"
    - "chewable_tablet"
    - "fine_granules"
  drugSpecificTags:
    - "leukotriene_receptor_antagonist"
    - "allergy"
    - "oral"
  search:
    primaryDisplayName: "ロイコトリエン受容体拮抗薬"
    exactAliases:
      - "オノン"
      - "プランルカスト"
      - "キプレス"
      - "シングレア"
      - "モンテルカスト"
      - "ロイコトリエン受容体拮抗薬"
    prefixAliases:
      - "おのん"
      - "ぷらんるかすと"
      - "きぷれす"
      - "しんぐれあ"
      - "もんてるかすと"
      - "ろいことりえん"
      - "ろいことりえんじゅようたいきっこうやく"
    nameAliases:
      - "おのん"
      - "ぷらんるかすと"
      - "きぷれす"
      - "しんぐれあ"
      - "もんてるかすと"
      - "ろいことりえん"
      - "ろいことりえんじゅようたいきっこうやく"
    keywords:
      - "アレルギー性鼻炎"
      - "鼻水"
      - "咳"
      - "喘息"
      - "気管支喘息"
      - "花粉症"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true
  nameAliases:
    - "おのん"
    - "ぷらんるかすと"
    - "きぷれす"
    - "しんぐれあ"
    - "もんてるかすと"
    - "ろいことりえん"
    - "ろいことりえんじゅようたいきっこうやく"
  brandCatalog:
    オノン:
      displayName: "オノン"
      genericName: "プランルカスト"
      displayGenericName: "プランルカスト"
      aliases:
        - "おのん"
        - "ぷらんるかすと"
      normalizedAliases:
        - "おのん"
        - "ぷらんるかすと"
    キプレス:
      displayName: "キプレス"
      genericName: "モンテルカスト"
      displayGenericName: "モンテルカスト"
      aliases:
        - "きぷれす"
        - "もんてるかすと"
      normalizedAliases:
        - "きぷれす"
        - "もんてるかすと"
    シングレア:
      displayName: "シングレア"
      genericName: "モンテルカスト"
      displayGenericName: "モンテルカスト"
      aliases:
        - "しんぐれあ"
        - "もんてるかすと"
      normalizedAliases:
        - "しんぐれあ"
        - "もんてるかすと"
    プランルカスト:
      displayName: "プランルカスト"
      genericName: "プランルカスト"
      displayGenericName: "プランルカスト"
      aliases:
        - "ぷらんるかすと"
      normalizedAliases:
        - "ぷらんるかすと"
    モンテルカスト:
      displayName: "モンテルカスト"
      genericName: "モンテルカスト"
      displayGenericName: "モンテルカスト"
      aliases:
        - "もんてるかすと"
      normalizedAliases:
        - "もんてるかすと"
  aliasToBrand:
    "おのん": "オノン"
    "ぷらんるかすと": "プランルカスト"
    "きぷれす": "キプレス"
    "しんぐれあ": "シングレア"
    "もんてるかすと": "モンテルカスト"
    # 注: 薬効クラス名読み（ろいことりえん / ろいことりえんじゅようたいきっこうやく）はaliasToBrand対象外
template:
  templateId: "allergy_leukotriene_receptor_antagonist_oral_v1"
  templateVersion: "1.0.0"
  situationTags:
    - "general"
    - "seasonal"
  severityTags:
    - "mild"
    - "moderate"
    - "severe"
display:
  title: "ロイコトリエン受容体拮抗薬（内服）"
  subtitle: "アレルギー症状に対する内服治療"
  drugClassLabel: "ロイコトリエン受容体拮抗薬"
  drugGeneric: "ロイコトリエン受容体拮抗薬"
  nodeLabelShort: "抗ロイコトリエン内服"
  nodeLabelLong: "ロイコトリエン受容体拮抗薬（内服）"
  nodeKey: "leukotriene_receptor_antagonist_oral"
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
    - "JSON化時に、S / O / A / P / S_APPEND / A_APPEND / P_APPEND の薬剤名・薬効分類名は、主語・服用薬・対象薬・治療薬として使われている場合 {{drug_subject}} へ読み替える"
    - "S / S_APPEND では、初回・増量・減量・終了・副作用・頓用使用など、薬剤ごとの状態や変更理由を表す場合、薬剤名・薬効分類名を {{drug_subject}} へ読み替える"
    - "Oフィールドでは、薬剤名・薬効分類名を表す部分を {{drug_subject}} へ読み替え、処方・増量・減量・服用中・処方終了・処方変更・処方中止などの状態語は保持する"
    - "A / P / A_APPEND / P_APPEND では、薬剤名・薬効分類名が服用薬・対象薬・治療薬として使われている場合のみ {{drug_subject}} へ読み替える。薬効説明・作用機序・症状説明・服用方法説明・疾患説明などの一般説明文として使われている場合は置換しない"
    - "薬効説明・作用機序・症状説明など、薬剤主語ではない一般説明文は {{drug_subject}} へ置換しない"
    - "{{drug_subject}} への読み替えは、薬剤名・薬効分類名が主語・使用薬・対象薬・治療薬として明示されている本文にのみ適用する"
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
  outputRules:
    - "自然言語監査では、原稿の欠落・誤記・構造揺れ・参照不一致のみを扱う"
    - "JSON監査では、型・キー・参照・後方互換・canonical JSON一致のみを扱う"
    - "提案は現在要件と将来拡張を明確に分離して述べる"



=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial_nasal｜title=ロイコトリエン受容体拮抗薬 初回（鼻水）】
S
ロイコトリエン受容体拮抗薬は、鼻水が気になるため追加となった。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬は、アレルギー症状の改善を目的として追加となった。
ロイコトリエンの作用を抑え、鼻水や咳などの症状を改善する。
症状の改善と再燃予防を目的として服用する。
P
ロイコトリエン受容体拮抗薬は、アレルギー症状を改善する薬です。
眠気や倦怠感などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【ADDON｜type=lifestyle_guidance｜id=addon_driving_caution_guidance｜title=運転注意説明】
P_APPEND
服用後に眠気や集中力の低下が出ることがあります。
自動車の運転など危険を伴う作業には注意してください。
【SCENARIO｜type=treatment_start｜id=initial_cough｜title=ロイコトリエン受容体拮抗薬 初回（咳）】
S
ロイコトリエン受容体拮抗薬は、咳が気になるため追加となった。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬は、アレルギー症状の改善を目的として追加となった。
ロイコトリエンの作用を抑え、鼻水や咳などの症状を改善する。
症状の改善と再燃予防を目的として服用する。
P
ロイコトリエン受容体拮抗薬は、アレルギー症状を改善する薬です。
眠気や倦怠感などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_start｜id=restart_nasal｜title=ロイコトリエン受容体拮抗薬 再開（鼻水）】
S
ロイコトリエン受容体拮抗薬は、鼻水が気になるため再開となった。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬は、アレルギー症状の改善を目的として再開となった。
ロイコトリエンの作用を抑え、鼻水や咳などの症状を改善する。
症状の改善と再燃予防を目的として服用する。
P
ロイコトリエン受容体拮抗薬は、アレルギー症状を改善する薬です。
眠気や倦怠感などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_start｜id=restart_cough｜title=ロイコトリエン受容体拮抗薬 再開（咳）】
S
ロイコトリエン受容体拮抗薬は、咳が気になるため再開となった。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬は、アレルギー症状の改善を目的として再開となった。
ロイコトリエンの作用を抑え、鼻水や咳などの症状を改善する。
症状の改善と再燃予防を目的として服用する。
P
ロイコトリエン受容体拮抗薬は、アレルギー症状を改善する薬です。
眠気や倦怠感などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_start｜id=external_start_nasal｜title=ロイコトリエン受容体拮抗薬 他所開始（鼻水）】
S
ロイコトリエン受容体拮抗薬は、鼻水に対して他所で開始され継続使用中であった。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬は、アレルギー症状の改善を目的として継続使用中であった。
ロイコトリエンの作用を抑え、鼻水や咳などの症状を改善する。
症状の改善と再燃予防を目的として服用する。
P
ロイコトリエン受容体拮抗薬は、アレルギー症状を改善する薬です。
眠気や倦怠感などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_start｜id=external_start_cough｜title=ロイコトリエン受容体拮抗薬 他所開始（咳）】
S
ロイコトリエン受容体拮抗薬は、咳に対して他所で開始され継続使用中であった。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬は、アレルギー症状の改善を目的として継続使用中であった。
ロイコトリエンの作用を抑え、鼻水や咳などの症状を改善する。
症状の改善と再燃予防を目的として服用する。
P
ロイコトリエン受容体拮抗薬は、アレルギー症状を改善する薬です。
眠気や倦怠感などの副作用が出ることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=ロイコトリエン受容体拮抗薬 用量調整（増量・効果実感乏しい）】
S
ロイコトリエン受容体拮抗薬は、効果の実感が乏しいため増量となった。
O
ロイコトリエン受容体拮抗薬　増量
A
ロイコトリエン受容体拮抗薬は、効果不十分のため増量となった。増量後の眠気や倦怠感などの副作用に注意が必要である。
P
ロイコトリエン受容体拮抗薬は、増量により眠気や倦怠感が出やすくなることがあります。
眠気や倦怠感が強い場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=ロイコトリエン受容体拮抗薬 用量調整（増量・他剤との調整）】
S
ロイコトリエン受容体拮抗薬は、他剤との調整により増量となった。
O
ロイコトリエン受容体拮抗薬　増量
A
ロイコトリエン受容体拮抗薬は、併用薬との調整のため増量となった。増量後の眠気や倦怠感などの副作用に注意が必要である。
P
ロイコトリエン受容体拮抗薬は、増量により眠気や倦怠感が出やすくなることがあります。
眠気や倦怠感が強い場合はご相談ください。
P_ADDON
- addon_driving_caution_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=ロイコトリエン受容体拮抗薬 用量調整（減量・症状改善）】
S
ロイコトリエン受容体拮抗薬は、症状が改善したため服用量が調整となった。
O
ロイコトリエン受容体拮抗薬　減量
A
ロイコトリエン受容体拮抗薬は、症状改善を踏まえ減量となった。減量後に症状が再燃する可能性があるため、注意が必要である。
P
ロイコトリエン受容体拮抗薬は、減量により症状が再燃することがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=ロイコトリエン受容体拮抗薬 用量調整（減量・効果実感乏しい）】
S
ロイコトリエン受容体拮抗薬は、効果の実感が乏しく、服用継続に不安があるため用量調整となった。
O
ロイコトリエン受容体拮抗薬　減量
A
ロイコトリエン受容体拮抗薬は、効果実感の乏しさと服用継続への不安を踏まえ減量となった。減量後の症状変化について経過確認を要する。
P
ロイコトリエン受容体拮抗薬は、減量により症状が悪化する可能性があります。
症状の変化や体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=ロイコトリエン受容体拮抗薬 用量調整（減量・他剤との調整）】
S
ロイコトリエン受容体拮抗薬は、他剤との調整により減量となった。
O
ロイコトリエン受容体拮抗薬　減量
A
ロイコトリエン受容体拮抗薬は、併用薬との調整のため減量となった。減量後の症状悪化に注意が必要である。
P
ロイコトリエン受容体拮抗薬は、減量により症状が悪化する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_drowsiness_none｜title=ロイコトリエン受容体拮抗薬 副作用なし（眠気）】
S
ロイコトリエン受容体拮抗薬を服用して症状は落ち着いている。
眠気は認めない。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬による眠気は現時点で認められず、治療継続が可能である。
P
ロイコトリエン受容体拮抗薬の継続中に眠気が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_liver_symptom_none｜title=ロイコトリエン受容体拮抗薬 副作用なし（肝障害関連症状）】
S
ロイコトリエン受容体拮抗薬を服用して症状は落ち着いている。
強い倦怠感などの明らかな体調変化は認めない。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬による肝障害を疑う明らかな自覚症状は現時点で認められず、治療継続が可能である。
P
ロイコトリエン受容体拮抗薬の継続中に、強い倦怠感が出ることがあります。
気になる症状が続く場合はご相談ください。
P_ADDON
- addon_liver_warning_detail
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【ADDON｜type=side_effect_guidance｜id=addon_liver_warning_detail｜title=肝障害関連症状の補足】
P_APPEND
強いだるさが続く、食欲が落ちる、皮膚や白目が黄色く見えるなどの変化がある場合は、早めに医療機関へご相談ください。
【SCENARIO｜type=side_effect｜id=se_abdominal_discomfort_none｜title=ロイコトリエン受容体拮抗薬 副作用なし（腹部不快感）】
S
ロイコトリエン受容体拮抗薬を服用して症状は落ち着いている。
腹部不快感などの消化器症状は認めない。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬による消化器症状は現時点で認められず、治療継続が可能である。
P
ロイコトリエン受容体拮抗薬の継続中に、お腹の不快感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=adherence｜id=cp_good｜title=ロイコトリエン受容体拮抗薬 CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
ロイコトリエン受容体拮抗薬　服用中
A
コンプライアンスは良好である。治療継続に問題はない。
P
引き続き用法を守って服用することで、アレルギー症状改善が期待できます。
今後も継続して服用できるようにすることが大切です。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=ロイコトリエン受容体拮抗薬 CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
ロイコトリエン受容体拮抗薬　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することでアレルギー症状改善が期待されます。
服薬忘れが続くとアレルギー症状が悪化する可能性があります。
P_ADDON
- addon_adherence_reminder_alarm
- addon_adherence_reminder_app
- addon_adherence_visual_calendar_checklist
- addon_adherence_visual_note
- addon_adherence_prep_previous_night
- addon_adherence_prep_before_meal
- addon_adherence_support_family_reminder
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_alarm｜title=服薬忘れ対策（通知：アラーム）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、アラームを服薬時間に合わせて設定しておく方法があります。
【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_app｜title=服薬忘れ対策（通知：服薬アプリ）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、服薬を記録できるアプリを活用する方法があります。
【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_calendar_checklist｜title=服薬忘れ対策（見える化：お薬カレンダー・チェックリスト）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、お薬カレンダーや服用チェックリストで確認する方法があります。
【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=服薬忘れ対策（見える化：貼り紙）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、薬を飲む時間を目立つ場所に書いておく方法があります。
【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_previous_night｜title=服薬忘れ対策（準備：前夜）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、前夜のうちに翌朝の薬を目につく場所へ準備しておく習慣も役立ちます。
【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_before_meal｜title=服薬忘れ対策（準備：食前）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、食事の前に薬を目につく場所へ準備しておく習慣も役立ちます。
【ADDON｜type=adherence_guidance｜id=addon_adherence_support_family_reminder｜title=服薬忘れ対策（支援：家族などの声掛け）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、家族や身近な方に服薬したか声をかけてもらう方法があります。
【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=ロイコトリエン受容体拮抗薬 CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
ロイコトリエン受容体拮抗薬　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで治療効果が安定し、症状悪化の予防につながります。
自己判断での中止・調整により症状が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=ロイコトリエン受容体拮抗薬 CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した服用に不安がある。
O
ロイコトリエン受容体拮抗薬　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用が治療効果の維持と症状悪化の予防につながります。
治療が中断すると症状が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
【SCENARIO｜type=treatment_end｜id=end_improved｜title=ロイコトリエン受容体拮抗薬 終了（改善）】
S
ロイコトリエン受容体拮抗薬は、症状が改善したため中止となった。
O
ロイコトリエン受容体拮抗薬　処方終了
A
ロイコトリエン受容体拮抗薬は、症状改善により終了となった。
終了後に症状が悪化する可能性があるため、注意が必要である。
P
ロイコトリエン受容体拮抗薬終了後、症状悪化や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。
【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=ロイコトリエン受容体拮抗薬 終了（効果不十分）】
S
ロイコトリエン受容体拮抗薬は、効果不十分のため中止となった。
O
ロイコトリエン受容体拮抗薬　処方終了
A
ロイコトリエン受容体拮抗薬は、効果不十分のため終了となった。
終了後は、症状の変化について確認を要する。
P
ロイコトリエン受容体拮抗薬の終了後、症状の変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。
【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=ロイコトリエン受容体拮抗薬 終了（無効）】
S
ロイコトリエン受容体拮抗薬は、効果が認められなかったため中止となった。
O
ロイコトリエン受容体拮抗薬　処方終了
A
ロイコトリエン受容体拮抗薬は、効果が認められなかったため終了となった。
終了後は、症状の変化について確認を要する。
P
ロイコトリエン受容体拮抗薬の終了後、症状の変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。
【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=ロイコトリエン受容体拮抗薬 SE継続（軽症）】
S
ロイコトリエン受容体拮抗薬の服用により眠気があるが、日常生活は送れている。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬による眠気を軽度認めるが、治療継続が可能である。
P
ロイコトリエン受容体拮抗薬による眠気が軽い場合は、経過をみていただき、眠気が強くなる場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_moderate_consider_dr｜title=ロイコトリエン受容体拮抗薬 SE継続（中等度）】
S
ロイコトリエン受容体拮抗薬の服用により眠気が強く、辛いことがあるが、日常生活は送れている。
O
ロイコトリエン受容体拮抗薬　処方
A
ロイコトリエン受容体拮抗薬による眠気が強く、継続困難の可能性があるため対応を要する。
P
ロイコトリエン受容体拮抗薬による眠気の副作用が強い場合は、減量や薬の変更が必要になることがあります。
処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_change_due_to_drowsiness｜title=ロイコトリエン受容体拮抗薬 SE変更（眠気）】
S
ロイコトリエン受容体拮抗薬の服用により眠気が出現したため、他剤へ変更となった。
O
ロイコトリエン受容体拮抗薬　処方変更
A
ロイコトリエン受容体拮抗薬の服用による眠気を認め、他剤変更後の経過確認を要する。
P
ロイコトリエン受容体拮抗薬の変更後、症状の悪化や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_drowsiness｜title=ロイコトリエン受容体拮抗薬 SE減量（眠気）】
S
ロイコトリエン受容体拮抗薬の服用により眠気がひどいため、減量となった。
O
ロイコトリエン受容体拮抗薬　減量
A
ロイコトリエン受容体拮抗薬の服用による眠気を認め、減量後の経過確認を要する。
P
ロイコトリエン受容体拮抗薬の減量後も眠気が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
【SCENARIO｜type=side_effect｜id=se_stop_due_to_drowsiness｜title=ロイコトリエン受容体拮抗薬 SE中止（眠気）】
S
ロイコトリエン受容体拮抗薬の服用により眠気がひどいため、中止となった。
O
ロイコトリエン受容体拮抗薬　処方中止
A
ロイコトリエン受容体拮抗薬の服用による眠気を認め、中止後の経過確認を要する。
P
ロイコトリエン受容体拮抗薬の中止後、症状悪化や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。
=======SCENARIOS_END=======
