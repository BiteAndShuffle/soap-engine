# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_thiazolidinedione_pioglitazone_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー案（drug / composition / display 等）および SCENARIOS_START〜SCENARIOS_END の
# シナリオ本文・ADDON本文は、ユーザーによる凍結前レビュー（PASS確認済み）を経て
# 確定しました。
#
# 目的: チアゾリジン系糖尿病薬（ピオグリタゾン）の brandCatalog / alias /
# drugResolution.brandToTags 設計、およびシナリオ本文を、会話ログではなく
# リポジトリ上に固定するための作業ファイルです
# （2026-07-05 ヘッダー作成、同日シナリオ本文追加・凍結）。
#
# シナリオ本文追加時の対応: ユーザー提供文に addon_hyperkalemia_guidance の重複定義
# （initial直後・se_edema_none直後の2箇所、内容完全一致）があったため、initial直後の
# 定義を正本として残し、se_edema_none直後の重複ブロックのみ削除した
# （dm_biguanide_metformin_oral.md / dm_dpp4_biguanide_combination_oral.md での
# 同型の対応実績に倣う。S/O/A/P本文・P_ADDON参照・addon本文そのものは変更していない）。
#
# 次の作業: PN1 開始（prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤・直近実績。alias/brandCatalog設計の基本形）
#   - bridges/dm_biguanide_metformin_oral.md（単剤・直近実績。ブランド名＝GE代表名
#     パターン（メトホルミン）の直接参考。本モジュールのピオグリタゾンも同型）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_thiazolidinedione_pioglitazone_oral"

categoryPath:
  - "糖尿病"
  - "チアゾリジン系糖尿病薬"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_dpp4_oral / dm_biguanide_metformin_oral と同型。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "チアゾリジン系糖尿病薬"

  brandNames:
    - "アクトス"
    - "ピオグリタゾン"

  drugClass:
    - "THIAZOLIDINEDIONE"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "thiazolidinedione_pioglitazone_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-05）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  # 成分名（ピオグリタゾン塩酸塩）の読み「ぴおぐりたぞんえんさんえん」は module 単位の
  # prefixAliases/nameAliases にのみ追加し、brandCatalog[brand].aliases への複製は
  # 行わない（dm_biguanide_metformin_oral と同型。理由: 「ピオグリタゾン」という
  # ブランド名自体が存在するため、成分名読みを複数ブランドへ複製すると
  # aliasToBrand の解決先ブランドが曖昧になる）。
  search:
    primaryDisplayName: "チアゾリジン系糖尿病薬"

    exactAliases:
      - "アクトス"
      - "ピオグリタゾン"

    prefixAliases:
      - "あくとす"
      - "ぴおぐりたぞん"
      - "ぴおぐりたぞんえんさんえん"

    nameAliases:
      - "あくとす"
      - "ぴおぐりたぞん"
      - "ぴおぐりたぞんえんさんえん"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "あくとす"
    - "ぴおぐりたぞん"
    - "ぴおぐりたぞんえんさんえん"

  # ─────────────────────────────────────────
  # brandCatalog: 2 ブランド
  # ─────────────────────────────────────────
  # 2ブランドは同一成分（ピオグリタゾン塩酸塩）。「ピオグリタゾン」はGE代表名として
  # ブランド名自体に成分名を用いる構成であり、dm_biguanide_metformin_oral の
  # メトグルコ／メトホルミン(GE) と同型（genericKey は base + "_generic" 接尾辞で分離）。
  brandCatalog:
    アクトス:
      displayName: "アクトス"
      genericName: "ピオグリタゾン塩酸塩"
      displayGenericName: "ピオグリタゾン塩酸塩"
      genericKey: "pioglitazone_actos"
      handlingTags: []
      aliases:
        - "あくとす"
      normalizedAliases:
        - "あくとす"

    ピオグリタゾン:
      displayName: "ピオグリタゾン"
      genericName: "ピオグリタゾン塩酸塩"
      displayGenericName: "ピオグリタゾン塩酸塩"
      # ↑ アクトスと同一成分（GE代表名）
      genericKey: "pioglitazone_actos_generic"
      handlingTags: []
      aliases:
        - "ぴおぐりたぞん"
      normalizedAliases:
        - "ぴおぐりたぞん"

  aliasToBrand:
    "あくとす": "アクトス"
    "ぴおぐりたぞん": "ピオグリタゾン"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。2件・2件で一致。
  # 成分名読み（ぴおぐりたぞんえんさんえん）は module 単位 nameAliases 側のみに存在し
  # brandCatalog.aliases には複製していないため、aliasToBrand の対象外
  # （dm_biguanide_metformin_oral のメトホルミン塩酸塩読みと同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["thiazolidinedione_pioglitazone", {genericKeyと同一の成分タグ}] の
  # 2件で統一（dm_dpp4_oral / dm_biguanide_metformin_oral と同型）。

drugResolution:
  brandToTags:
    アクトス:
      - "thiazolidinedione_pioglitazone"
      - "pioglitazone_actos"
    ピオグリタゾン:
      - "thiazolidinedione_pioglitazone"
      - "pioglitazone_actos_generic"

composition:
  classKey: "tzd"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "tzd_oral"
  priority: "chronic"

display:
  nodeKey: "tzd_oral"
  nodeLabelShort: "TZD"
  nodeLabelLong: "チアゾリジン系糖尿病薬（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（アクトス・ピオグリタゾン） → ユーザー指定どおり確定
# 2. brandCatalog 2ブランド・genericKey分離（base + "_generic"） →
#    dm_biguanide_metformin_oral のメトグルコ／メトホルミン(GE) と同型で確定
# 3. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ） → dm_biguanide_metformin_oral と同型の理由
#    （「ピオグリタゾン」ブランド名自体が存在するため、成分名読みの複数ブランド複製は
#    aliasToBrand の解決先を曖昧にする）で確定
# 4. drugResolution.brandToTags → dm_dpp4_oral / dm_biguanide_metformin_oral と同型の
#    2件構成（["thiazolidinedione_pioglitazone", {genericKey}]）で確定
# 5. composition.classKey（"tzd"）/ nodeKey（"tzd_oral"）/ priority（"chronic"） →
#    既存命名規則（薬効クラス英略・スネークケース）で確定
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-05 時点、本 bridge のヘッダー設計に関する未確定事項はなし）
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - handlingTags（増量・減量等のブランド差分制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する。今回のヘッダー段階では
#   2ブランドとも同一成分・同一用量帯のため handlingTags は空配列とした
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
#
# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: FROZEN_FOR_PN1）
# =========================================

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=チアゾリジン系糖尿病薬 初回】
S
チアゾリジン系糖尿病薬は、血糖値が高いため追加となった。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬は、血糖コントロール不十分のため追加となった。
インスリン抵抗性を改善し、筋肉や脂肪組織などで糖を利用しやすくすることで、血糖改善を目的として服用する。
P
チアゾリジン系糖尿病薬は、血糖値を改善する薬です。
むくみが出ることがあります。
むくみが続く場合や気になる症状がある場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=side_effect_guidance｜id=addon_se_hypoglycemia_guidance｜title=副作用注意喚起（低血糖）】
P_APPEND
他の糖尿病薬と併用している場合は、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。




【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_initial｜title=生活指導（血糖指導）】
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。




【ADDON｜type=sickday_guidance｜id=addon_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
体調不良時は水分を少量ずつこまめに摂取してください。
治療継続の可否は体調や摂取状況によって異なるため、自己判断せず処方医へご相談ください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。


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






【SCENARIO｜type=treatment_start｜id=restart｜title=チアゾリジン系糖尿病薬 再開】
S
チアゾリジン系糖尿病薬は、血糖値が高いため再開となった。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬は、血糖コントロール不十分のため再開となった。
インスリン抵抗性を改善し、筋肉や脂肪組織などで糖を利用しやすくすることで、血糖改善を目的として服用する。
P
チアゾリジン系糖尿病薬は、血糖値を改善する薬です。
むくみが出ることがあります。
むくみが続く場合や気になる症状がある場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=チアゾリジン系糖尿病薬 他所開始】
S
チアゾリジン系糖尿病薬は、他院で開始され継続使用中であった。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬は、血糖コントロール改善を目的として使用中であった。
インスリン抵抗性を改善し、筋肉や脂肪組織などで糖を利用しやすくすることで、血糖改善を目的として服用する。
P
チアゾリジン系糖尿病薬は、血糖値を改善する薬です。
むくみが出ることがあります。
むくみが続く場合や気になる症状がある場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=チアゾリジン系糖尿病薬 増量（効果実感乏しい）】
S
チアゾリジン系糖尿病薬は、効果の実感が乏しいため増量となった。
O
チアゾリジン系糖尿病薬　増量
A
チアゾリジン系糖尿病薬は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
チアゾリジン系糖尿病薬は、増量によりむくみが出ることがあります。
むくみがひどい場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=チアゾリジン系糖尿病薬 増量（検査値改善なし）】
S
チアゾリジン系糖尿病薬は、検査値が改善しないため増量となった。
O
チアゾリジン系糖尿病薬　増量
A
チアゾリジン系糖尿病薬は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
チアゾリジン系糖尿病薬は、増量によりむくみが出ることがあります。
むくみがひどい場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=チアゾリジン系糖尿病薬 増量（他剤との調整）】
S
チアゾリジン系糖尿病薬は、他剤変更に伴う調整により増量となった。
O
チアゾリジン系糖尿病薬　増量
A
チアゾリジン系糖尿病薬は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
チアゾリジン系糖尿病薬は、増量によりむくみが出ることがあります。
むくみがひどい場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_renal_function｜title=チアゾリジン系糖尿病薬 減量（腎機能低下）】
S
チアゾリジン系糖尿病薬は、腎機能を考慮して減量となった。
O
チアゾリジン系糖尿病薬　減量
A
チアゾリジン系糖尿病薬は、腎機能や全身状態を考慮して減量となった。減量後の血糖推移に注意が必要である。
P
チアゾリジン系糖尿病薬は、腎機能や体調に応じて慎重に使用することがあります。
減量後は血糖値が変動する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、血糖推移および体調変化の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=チアゾリジン系糖尿病薬 減量（検査値改善）】
S
チアゾリジン系糖尿病薬は、検査値が改善したため減量となった。
O
チアゾリジン系糖尿病薬　減量
A
チアゾリジン系糖尿病薬は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
チアゾリジン系糖尿病薬は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=チアゾリジン系糖尿病薬 減量（効果実感乏しい）】
S
チアゾリジン系糖尿病薬は、効果の実感が乏しいため減量を希望された。
O
チアゾリジン系糖尿病薬　減量
A
チアゾリジン系糖尿病薬は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
チアゾリジン系糖尿病薬は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=チアゾリジン系糖尿病薬 減量（他剤との調整）】
S
チアゾリジン系糖尿病薬は、他剤変更に伴う調整のため減量となった。
O
チアゾリジン系糖尿病薬　減量
A
チアゾリジン系糖尿病薬は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
チアゾリジン系糖尿病薬は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_edema_none｜title=チアゾリジン系糖尿病薬 副作用なし（浮腫）】
S
チアゾリジン系糖尿病薬を服用して症状は落ち着いている。
むくみは認めない。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬による浮腫症状は現時点で認められず、治療継続が可能である。
P
チアゾリジン系糖尿病薬の継続中に、むくみがひどくなることがあります。
むくみが続く場合はご相談ください。
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






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=チアゾリジン系糖尿病薬 副作用なし（低血糖）】
S
チアゾリジン系糖尿病薬を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬による低血糖は現時点で認められず、治療継続が可能である。
P
チアゾリジン系糖尿病薬の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
単剤では低血糖は起こりにくい薬ですが、他の糖尿病薬と併用中は低血糖が起こることがあります。
症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
改善しない場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_heart_failure_none｜title=チアゾリジン系糖尿病薬 副作用なし（心不全）】
S
チアゾリジン系糖尿病薬を服用して症状は落ち着いている。
動悸や息切れは認めない。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬による心不全症状は現時点で認められず、治療継続が可能である。
P
チアゾリジン系糖尿病薬の継続中に、動悸や息切れが出ることがあります。
動悸や息切れが続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_appetite_loss_none｜title=チアゾリジン系糖尿病薬 副作用なし（食欲不振）】
S
チアゾリジン系糖尿病薬を服用して症状は落ち着いている。
食欲不振は認めない。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬による消化器症状は現時点で認められず、治療継続が可能である。
P
チアゾリジン系糖尿病薬の継続中に、お腹の調子が悪くなることがあります。
食欲不振が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=チアゾリジン系糖尿病薬 CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
チアゾリジン系糖尿病薬　服用中
A
コンプライアンスは良好である。治療継続に問題はない。
P
引き続き用法を守って服用することで、血糖コントロールの維持および合併症予防が期待できます。
今後も継続して服用できるようにすることが大切です。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=チアゾリジン系糖尿病薬 CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
チアゾリジン系糖尿病薬　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することで血糖コントロールの維持が期待されます。
服薬忘れが続くと血糖値が不安定となる可能性があります。
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






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=チアゾリジン系糖尿病薬 CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
チアゾリジン系糖尿病薬　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=チアゾリジン系糖尿病薬 CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した服用に不安がある。
O
チアゾリジン系糖尿病薬　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=チアゾリジン系糖尿病薬 終了（改善）】
S
チアゾリジン系糖尿病薬は、血糖コントロールが改善したため中止となった。
O
チアゾリジン系糖尿病薬　処方終了
A
チアゾリジン系糖尿病薬は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
チアゾリジン系糖尿病薬終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=チアゾリジン系糖尿病薬 終了（効果不十分）】
S
チアゾリジン系糖尿病薬は、効果不十分のため中止となった。
O
チアゾリジン系糖尿病薬　処方終了
A
チアゾリジン系糖尿病薬は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
チアゾリジン系糖尿病薬終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=チアゾリジン系糖尿病薬 終了（無効）】
S
チアゾリジン系糖尿病薬は、効果が認められなかったため中止となった。
O
チアゾリジン系糖尿病薬　処方終了
A
チアゾリジン系糖尿病薬は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
チアゾリジン系糖尿病薬終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=チアゾリジン系糖尿病薬 SE継続（軽症・浮腫）】
S
チアゾリジン系糖尿病薬の服用によりむくみや体重増加などがあるが、日常生活は送れている。
O
チアゾリジン系糖尿病薬　処方
A
チアゾリジン系糖尿病薬による浮腫症状を軽度認めるが、治療継続が可能である。
P
チアゾリジン系糖尿病薬によるむくみや体重増加が軽い場合は、体重変化やむくみの程度を確認しながら様子をみてください。
むくみが強くなる、急に体重が増える場合は、薬の調整が必要になることがあります。
ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_edema｜title=チアゾリジン系糖尿病薬 SE変更（浮腫）】
S
チアゾリジン系糖尿病薬の服用によりむくみや体重増加が出現したため、他剤へ変更となった。
O
チアゾリジン系糖尿病薬　処方変更
A
チアゾリジン系糖尿病薬の服用による浮腫症状を認め、他剤変更後の経過確認を要する。
P
チアゾリジン系糖尿病薬の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_edema｜title=チアゾリジン系糖尿病薬 SE減量（浮腫）】
S
チアゾリジン系糖尿病薬の服用によりむくみや体重増加がひどいため、減量となった。
O
チアゾリジン系糖尿病薬　減量
A
チアゾリジン系糖尿病薬の服用による浮腫症状を認め、減量後の経過確認を要する。
P
チアゾリジン系糖尿病薬の減量後も浮腫症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_edema｜title=チアゾリジン系糖尿病薬 SE中止（浮腫）】
S
チアゾリジン系糖尿病薬の服用によりむくみや体重増加がひどいため、中止となった。
O
チアゾリジン系糖尿病薬　処方中止
A
チアゾリジン系糖尿病薬の服用による浮腫症状を認め、中止後の経過確認を要する。
P
チアゾリジン系糖尿病薬の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=チアゾリジン系糖尿病薬 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
チアゾリジン系糖尿病薬　処方
A
血糖コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P
高血糖が続くと、眼・腎・神経障害などのリスクが高まります。
薬物療法に加え、食事・運動療法も血糖コントロールにおいて重要です。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖コントロールの改善に伴い、低血糖症状が出ることがあります。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=チアゾリジン系糖尿病薬 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
チアゾリジン系糖尿病薬　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=チアゾリジン系糖尿病薬 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
チアゾリジン系糖尿病薬　服用中
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


【ADDON｜type=sickday_guidance｜id=addon_sickday_hold_sglt2_metformin｜title=シックデイ時併用薬注意（SGLT2・メトホルミン）】
P_APPEND
併用中のSGLT2阻害薬やメトホルミンは、脱水時は休薬が必要な場合があります。
自己判断で中止せず、処方医へご相談ください。
=======SCENARIOS_END=======
