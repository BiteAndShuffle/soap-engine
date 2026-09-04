# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_imeglimin_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー案（drug / composition / display 等）および SCENARIOS_START〜
# SCENARIOS_END のシナリオ本文・ADDON本文は、ユーザーによる凍結前レビュー
# （PASS確認済み）を経て確定しました。
#
# 目的: イメグリミン系経口血糖降下剤（ツイミーグ）の brandCatalog / alias /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-08 ヘッダー作成、同日シナリオ本文追加）。
#
# 次の作業: PN1 開始（prompts/vNext/HANDOFF.md の「bridge 作成から開始する」
# 手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の実績。ヘッダー構成の直接参考）
#   - bridges/dm_biguanide_metformin_oral.md（単剤・直近実績。alias/brandCatalog
#     設計の基本形）
#   - bridges/dm_glinide_oral.md（単剤・直近実績。genericKey個別付与・
#     drugResolution.brandToTags 2件構成パターンの直接参考）
#   - bridges/dm_alpha_glucosidase_inhibitor_oral.md（単剤・直近実績。
#     categoryPath「内服」taxonomy の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §8（drug.nameAliases完全一致ルール）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_imeglimin_oral"

categoryPath:
  - "糖尿病"
  - "イメグリミン系経口血糖降下剤"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_glinide_oral / dm_biguanide_metformin_oral と
  # 同型。実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "イメグリミン系経口血糖降下剤"

  brandNames:
    - "ツイミーグ"

  drugClass:
    - "IMEGLIMIN"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "imeglimin_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-08）
  # ─────────────────────────────────────────
  # ブランド名読み「ついみーぐ」・成分名読み「いめぐりみん」「いめぐりみんえんさんえん」
  # （塩非表記／塩表記の2形式併記）はいずれもユーザー指定値をそのまま採用する
  # （kataToHira による機械的なひらがな変換のみ。推測なし。
  # dm_thiazolidinedione_pioglitazone_oral の「ぴおぐりたぞん」「ぴおぐりたぞんえんさんえん」
  # 塩非表記/塩表記併記パターンと同型）。
  #
  # 成分名読みの扱い（既存単剤モジュールと同型の判断）:
  #   単一ブランド（ツイミーグ）のみのため、成分名読みを brandCatalog.aliases へ
  #   複製する必要はない。module 単位の prefixAliases/nameAliases にのみ追加する。
  search:
    primaryDisplayName: "イメグリミン系経口血糖降下剤"

    exactAliases:
      - "ツイミーグ"

    prefixAliases:
      - "ついみーぐ"
      - "いめぐりみん"
      - "いめぐりみんえんさんえん"

    nameAliases:
      - "ついみーぐ"
      - "いめぐりみん"
      - "いめぐりみんえんさんえん"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "ついみーぐ"
    - "いめぐりみん"
    - "いめぐりみんえんさんえん"

  # ─────────────────────────────────────────
  # brandCatalog: 1 ブランド（ツイミーグのみ）
  # ─────────────────────────────────────────
  # genericKey はユーザー指定値「imeglimin」をそのまま採用する
  # （classKey と同値。単一成分・単一ブランドのためクラス＝成分の関係が
  # 一致することによる。dm_glinide_alpha_glucosidase_inhibitor_combination_oral の
  # 単一ブランド配合剤設計と同型の判断）。
  brandCatalog:
    ツイミーグ:
      displayName: "ツイミーグ"
      genericName: "イメグリミン塩酸塩"
      displayGenericName: "イメグリミン"
      genericKey: "imeglimin"
      handlingTags: []
      aliases:
        - "ついみーぐ"
      normalizedAliases:
        - "ついみーぐ"

  aliasToBrand:
    "ついみーぐ": "ツイミーグ"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。1件・1件で一致。
  # 成分名読み（いめぐりみん／いめぐりみんえんさんえん）は module 単位 nameAliases
  # 側のみに存在し brandCatalog.aliases には複製していないため、aliasToBrand の
  # 対象外（既存単剤モジュールと同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # ["imeglimin_oral"（drugSpecificTags と同値）, "imeglimin"（genericKey と同値）]
  # の2件で統一（dm_glinide_oral と同型の2件構成パターン）。

drugResolution:
  brandToTags:
    ツイミーグ:
      - "imeglimin_oral"
      - "imeglimin"

composition:
  classKey: "imeglimin"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "imeglimin_oral"
  priority: "chronic"

display:
  nodeKey: "imeglimin_oral"
  nodeLabelShort: "イメグリミン"
  nodeLabelLong: "イメグリミン系経口血糖降下剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（ツイミーグ、単一ブランド） → ユーザー指定どおり確定
# 2. categoryPath「内服」taxonomy → 既存単剤モジュール（dm_glinide_oral 等）の
#    実績と同型で確定
# 3. drugClass 単一結合定数「IMEGLIMIN」 → 既存単剤モジュールの命名規則と同型で確定
# 4. brandCatalog.genericName（「イメグリミン塩酸塩」）→ ユーザー指定成分どおり確定
# 5. genericKey（"imeglimin"）→ ユーザー指定値をそのまま採用して確定
#    （classKey と同値。単一成分クラスのため）
# 6. 成分名読みの扱い（いめぐりみん／いめぐりみんえんさんえん）→ ユーザー指定値を
#    そのまま採用。塩非表記/塩表記の2形式併記は既存モジュール
#    （dm_thiazolidinedione_pioglitazone_oral）と同型の判断
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ 既存単剤モジュールと同型の理由で確定
# 8. drugResolution.brandToTags → dm_glinide_oral と同型の
#    2件構成（["imeglimin_oral", "imeglimin"]）で確定
# 9. composition.classKey（"imeglimin"）/ nodeKey（"imeglimin_oral"）/
#    priority（"chronic"）→ 既存命名規則で確定
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-08 時点、本 bridge のヘッダー設計に関する未確定事項はなし）
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - handlingTags（増量・減量等のブランド差分制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する。今回のヘッダー段階では
#   単一ブランドのみのため handlingTags は空配列とした
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定のツイミーグ1ブランドのみを扱う
#
# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: FROZEN_FOR_PN1）
# =========================================
#
# シナリオ本文追加時の対応: ユーザー提供文に addon_hyperkalemia_guidance の重複定義
# （initial直後・se_hypo_none直後の2箇所、内容完全一致）があったため、initial直後の
# 定義を正本として残し、se_hypo_none直後の重複ブロックのみ削除した
# （既存単剤・配合剤bridgeでの同型の対応実績に倣う。S/O/A/P本文・P_ADDON参照・
# addon本文そのものは変更していない）。
#

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=イメグリミン 初回】
S
イメグリミンは、血糖値が高いため追加となった。
O
イメグリミン　処方
A
イメグリミンは、血糖コントロール不十分のため追加となった。
複数の作用により血糖値を改善し、血糖コントロールの改善を目的として服用する。
P
イメグリミンは、血糖値を改善する薬です。
服用中は、下痢や便秘、吐き気など、お腹の調子が悪くなることがあります。
食事や水分が十分に摂れない体調不良時は、いったん休薬し、処方医へご相談ください。
P_ADDON
- addon_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=sickday_guidance｜id=addon_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水により副作用のリスクが高まります。
医師から水分制限を指示されていない場合は、水分を少量ずつこまめに摂取してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は、医療機関を受診してください。




【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_initial｜title=生活指導（血糖指導）】
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。




【ADDON｜type=side_effect_guidance｜id=addon_se_hypoglycemia_guidance｜title=副作用注意喚起（低血糖）】
P_APPEND
他の糖尿病薬と併用している場合は、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。




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






【SCENARIO｜type=treatment_start｜id=restart｜title=イメグリミン 再開】
S
イメグリミンは、血糖値が高いため再開となった。
O
イメグリミン　処方
A
イメグリミンは、血糖コントロール不十分のため再開となった。
複数の作用により血糖値を改善し、血糖コントロールの改善を目的として服用する。
P
イメグリミンは、血糖値を改善する薬です。
服用中は、下痢や便秘、吐き気など、お腹の調子が悪くなることがあります。
食事や水分が十分に摂れない体調不良時は、いったん休薬し、処方医へご相談ください。
P_ADDON
- addon_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=イメグリミン 他所開始】
S
イメグリミンは、他院で開始され継続使用中であった。
O
イメグリミン　処方
A
イメグリミンは、血糖コントロール改善を目的として使用中であった。
複数の作用により血糖値を改善し、血糖コントロールの改善を目的として服用する。
P
イメグリミンは、血糖値を改善する薬です。
服用中は、下痢や便秘、吐き気など、お腹の調子が悪くなることがあります。
食事や水分が十分に摂れない体調不良時は、いったん休薬し、処方医へご相談ください。
P_ADDON
- addon_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=イメグリミン 増量（効果実感乏しい）】
S
イメグリミンは、効果の実感が乏しいため増量となった。
O
イメグリミン　増量
A
イメグリミンは、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
イメグリミンは、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=イメグリミン 増量（検査値改善なし）】
S
イメグリミンは、検査値が改善しないため増量となった。
O
イメグリミン　増量
A
イメグリミンは、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
イメグリミンは、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=イメグリミン 増量（他剤との調整）】
S
イメグリミンは、他剤変更に伴う調整により増量となった。
O
イメグリミン　増量
A
イメグリミンは、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
イメグリミンは、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_renal_function｜title=イメグリミン 減量（腎機能低下）】
S
イメグリミンは、腎機能を考慮して減量となった。
O
イメグリミン　減量
A
イメグリミンは、腎機能低下に伴い用量調整となった。減量後の血糖推移に注意が必要である。
P
イメグリミンは、腎機能に応じて用量調整が必要になることがあります。
減量後は血糖値が変動する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、血糖推移および体調変化の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=イメグリミン 減量（検査値改善）】
S
イメグリミンは、検査値が改善したため減量となった。
O
イメグリミン　減量
A
イメグリミンは、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
イメグリミンは、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=イメグリミン 減量（効果実感乏しい）】
S
イメグリミンは、効果の実感が乏しいため減量を希望された。
O
イメグリミン　減量
A
イメグリミンは、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
イメグリミンは、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=イメグリミン 減量（他剤との調整）】
S
イメグリミンは、他剤変更に伴う調整のため減量となった。
O
イメグリミン　減量
A
イメグリミンは、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
イメグリミンは、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
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






【SCENARIO｜type=side_effect｜id=se_diarrhea_none｜title=イメグリミン 副作用なし（下痢）】
S
イメグリミンを服用して症状は落ち着いている。
下痢は認めない。
O
イメグリミン　処方
A
イメグリミンによる消化器症状は現時点で認められず、治療継続が可能である。
P
イメグリミンの継続中に、お腹の調子が悪くなることがあります。
下痢が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_constipation_none｜title=イメグリミン 副作用なし（便秘）】
S
イメグリミンを服用して症状は落ち着いている。
便秘は認めない。
O
イメグリミン　処方
A
イメグリミンによる消化器症状は現時点で認められず、治療継続が可能である。
P
イメグリミンの継続中に、お腹の調子が悪くなることがあります。
便秘が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_appetite_loss_none｜title=イメグリミン 副作用なし（食欲不振）】
S
イメグリミンを服用して症状は落ち着いている。
食欲不振は認めない。
O
イメグリミン　処方
A
イメグリミンによる消化器症状は現時点で認められず、治療継続が可能である。
P
イメグリミンの継続中に、お腹の調子が悪くなることがあります。
食欲不振が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=イメグリミン 副作用なし（低血糖）】
S
イメグリミンを服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
イメグリミン　処方
A
イメグリミンによる低血糖は現時点で認められず、治療継続が可能である。
P
イメグリミンの継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
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




【SCENARIO｜type=adherence｜id=cp_good｜title=イメグリミン CP良好】
S
薬を服用して症状は落ち着いている。
飲み忘れなく服用している。
O
イメグリミン　服用中
A
コンプライアンスは良好で、治療継続に問題はない。
P
引き続き用法を守って服用することで、治療効果の維持が期待されます。
今後も継続して服用できるようにすることが大切です。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=イメグリミン CP不良（服薬忘れ）】
S
飲み忘れることがある。
症状は大きく変わっていない。
O
イメグリミン　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することで、十分な治療効果が期待されます。
服薬忘れが続くと、期待される治療効果が十分に得られない可能性があります。
P_ADDON
- addon_adherence_notification_alarm
- addon_adherence_notification_app
- addon_adherence_visual_calendar_checklist
- addon_adherence_visual_note
- addon_adherence_prep_previous_night
- addon_adherence_prep_before_meal
- addon_adherence_family_support_reminder
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=adherence_guidance｜id=addon_adherence_notification_alarm｜title=アラーム｜uiGroup=通知｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、アラームを服薬時間に合わせて設定しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_notification_app｜title=服薬アプリ｜uiGroup=通知｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、服薬を記録できるアプリを活用する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_calendar_checklist｜title=お薬カレンダー・チェックリスト｜uiGroup=視覚化｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、お薬カレンダーや服用チェックリストで確認する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=貼り紙｜uiGroup=視覚化｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、薬を飲む時間を目立つ場所に書いておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_previous_night｜title=前夜に準備｜uiGroup=事前準備｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、前夜のうちに翌朝の薬を目につく場所へ準備しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_before_meal｜title=食前に準備｜uiGroup=事前準備｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、食事の前に薬を目につく場所へ準備しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_family_support_reminder｜title=家族などの声掛け｜uiGroup=家族の支援｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、家族や身近な方に服薬したか声をかけてもらう方法があります。






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=イメグリミン CP不良（自己判断）】
S
自己判断で服用を調整することがある。
症状は大きく変わっていない。
O
イメグリミン　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=イメグリミン CP不良（受診遅延）】
S
受診が遅れ、服用を調整することがある。
症状は大きく変わっていない。
O
イメグリミン　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=イメグリミン 終了（改善）】
S
イメグリミンは、血糖コントロールが改善したため中止となった。
O
イメグリミン　処方終了
A
イメグリミンは、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
イメグリミン終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=イメグリミン 終了（効果不十分）】
S
イメグリミンは、効果不十分のため中止となった。
O
イメグリミン　処方終了
A
イメグリミンは、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
イメグリミン終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=イメグリミン 終了（無効）】
S
イメグリミンは、効果が認められなかったため中止となった。
O
イメグリミン　処方終了
A
イメグリミンは、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
イメグリミン終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=イメグリミン SE継続（軽症 消化器症状）】
S
イメグリミンの服用によりお腹の調子が悪いが、日常生活は送れている。
O
イメグリミン　処方
A
イメグリミンによる消化器症状を軽度認めるが、治療継続が可能である。
P
イメグリミンによるお腹の不調が軽い場合は、水分を十分に摂取し、無理のない範囲で食事内容を見直して様子をみてください。
お腹の不調が強い、または続く場合は、薬の調整が必要になることがありますので、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_moderate_consider_dr｜title=イメグリミン SE継続（中等度 消化器症状）】
S
イメグリミンの服用により下痢が強く、辛いことがあるが、日常生活は送れている。
O
イメグリミン　処方
A
イメグリミンによる消化器症状が強く、継続困難の可能性があるため対応を要する。
P
イメグリミンによる下痢がみられる場合は、水分を少量ずつこまめに摂取してください。
症状が改善しない場合や悪化する場合は、薬の調整や変更が必要になることがあります。
食事や水分が十分に摂れない場合は、休薬して処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_gi_symptoms｜title=イメグリミン SE変更（消化器症状）】
S
イメグリミンの服用により下痢が出現したため、他剤へ変更となった。
O
イメグリミン　処方変更
A
イメグリミンの服用による消化器症状を認め、他剤変更後の経過確認を要する。
P
イメグリミンの変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_gi_symptoms｜title=イメグリミン SE減量（消化器症状）】
S
イメグリミンの服用により下痢がひどいため、減量となった。
O
イメグリミン　減量
A
イメグリミンの服用による消化器症状を認め、減量後の経過確認を要する。
P
イメグリミンの減量後も消化器症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_gi_symptoms｜title=イメグリミン SE中止（消化器症状）】
S
イメグリミンの服用により下痢がひどいため、中止となった。
O
イメグリミン　処方中止
A
イメグリミンの服用による消化器症状を認め、中止後の経過確認を要する。
P
イメグリミンの中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=イメグリミン 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
イメグリミン　処方
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






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=イメグリミン 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
イメグリミン　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=イメグリミン シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
イメグリミン　服用中
A
食事摂取低下および消化器症状により脱水リスクが上昇している。併用薬によっては低血糖リスクもあり、シックデイ時の対応に注意が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水により副作用のリスクが高まります。
食事や水分が十分に摂れない場合は、イメグリミンを休薬してください。
血糖測定が可能であれば行ってください。
水分は少量ずつこまめに摂取してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は医療機関を受診してください。
服用の再開時期については、自己判断せず処方医へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======
