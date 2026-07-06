# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_sulfonylurea_oral
# =========================================
#
# ⚠️ STATUS: DRAFT ⚠️
#
# ヘッダー案（drug / composition / display 等）および SCENARIOS_START〜SCENARIOS_END の
# シナリオ本文・ADDON本文が追加済み。ユーザーによる確認・凍結宣言は未了。
# 本ファイルはまだ PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: スルホニルウレア系経口血糖降下剤（アマリール／オイグルコン／グリミクロン）の
# brandCatalog / alias / drugResolution.brandToTags 設計、およびシナリオ本文を、
# 会話ログではなくリポジトリ上に固定するための作業ファイルです
# （2026-07-07 ヘッダー作成、同日シナリオ本文追加）。
#
# シナリオ本文追加時の対応: ユーザー提供文に addon_hyperkalemia_guidance の重複定義
# （initial直後・se_hypo_none直後の2箇所、内容完全一致）があったため、initial直後の
# 定義を正本として残し、se_hypo_none直後の重複ブロックのみ削除した
# （既存単剤bridgeでの同型の対応実績に倣う。S/O/A/P本文・P_ADDON参照・
# addon本文そのものは変更していない）。
#
# 次の作業: ユーザー確認・凍結宣言（STATUS: DRAFT → FROZEN_FOR_PN1）→ PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の直近実績。各ブランドが
#     異なる成分を持つ場合の brandCatalog / genericKey 個別付与・成分名読みを
#     module 単位 nameAliases のみに留める設計の直接参考）
#   - bridges/dm_biguanide_metformin_oral.md（単剤・直近実績。alias/brandCatalog
#     設計の基本形）
#   - bridges/dm_thiazolidinedione_pioglitazone_oral.md（単剤・直近実績。
#     handlingTags を今回のヘッダー段階では空配列とする判断の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_sulfonylurea_oral"

categoryPath:
  - "糖尿病"
  - "スルホニルウレア系経口血糖降下剤"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_dpp4_oral / dm_biguanide_metformin_oral と同型。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "スルホニルウレア系経口血糖降下剤"

  brandNames:
    - "アマリール"
    - "オイグルコン"
    - "グリミクロン"

  drugClass:
    - "SULFONYLUREA"

  route: "oral"

  dosageForms:
    - "tablet"
  # tablet で確定。OD錠等の詳細剤形は今回のヘッダーでは扱わない
  # （dm_dpp4_oral と同様、将来必要になった時点で別途拡張する）。

  drugSpecificTags:
    - "sulfonylurea_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-07）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  # 成分名読み（グリメピリド／グリベンクラミド／グリクラジド）も同様に
  # kataToHira による機械的変換のみ（推測なし）。
  #
  # 成分名読みの扱い（dm_dpp4_oral と同型の判断）:
  #   各ブランドは互いに異なる成分（グリメピリド／グリベンクラミド／グリクラジド）
  #   を持つ単剤3ブランドであり、displayGenericName が resolveAllHighPrecisionBrands
  #   で解決されるため、成分名読みを brandCatalog[brand].aliases へ複製する必要はない
  #   （dm_dpp4_oral のトラゼンタ〜グラクティブと同型の判断）。
  #   成分名読みは module 単位の prefixAliases/nameAliases にのみ追加する。
  search:
    primaryDisplayName: "スルホニルウレア系経口血糖降下剤"

    exactAliases:
      - "アマリール"
      - "オイグルコン"
      - "グリミクロン"

    prefixAliases:
      - "あまりーる"
      - "おいぐるこん"
      - "ぐりみくろん"
      - "ぐりめぴりど"
      - "ぐりべんくらみど"
      - "ぐりくらじど"

    nameAliases:
      - "あまりーる"
      - "おいぐるこん"
      - "ぐりみくろん"
      - "ぐりめぴりど"
      - "ぐりべんくらみど"
      - "ぐりくらじど"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "あまりーる"
    - "おいぐるこん"
    - "ぐりみくろん"
    - "ぐりめぴりど"
    - "ぐりべんくらみど"
    - "ぐりくらじど"

  # ─────────────────────────────────────────
  # brandCatalog: 3 ブランド（それぞれ異なる成分の単剤）
  # ─────────────────────────────────────────
  # genericKey 命名規則: 成分名の英語スネークケース（PN2-Drug-Header.md 準拠、
  # dm_dpp4_oral の linagliptin / omarigliptin 等と同型）。
  brandCatalog:
    アマリール:
      displayName: "アマリール"
      genericName: "グリメピリド"
      displayGenericName: "グリメピリド"
      genericKey: "glimepiride"
      handlingTags: []
      aliases:
        - "あまりーる"
      normalizedAliases:
        - "あまりーる"

    オイグルコン:
      displayName: "オイグルコン"
      genericName: "グリベンクラミド"
      displayGenericName: "グリベンクラミド"
      genericKey: "glibenclamide"
      handlingTags: []
      aliases:
        - "おいぐるこん"
      normalizedAliases:
        - "おいぐるこん"

    グリミクロン:
      displayName: "グリミクロン"
      genericName: "グリクラジド"
      displayGenericName: "グリクラジド"
      genericKey: "gliclazide"
      handlingTags: []
      aliases:
        - "ぐりみくろん"
      normalizedAliases:
        - "ぐりみくろん"

  aliasToBrand:
    "あまりーる": "アマリール"
    "おいぐるこん": "オイグルコン"
    "ぐりみくろん": "グリミクロン"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。3件・3件で一致。
  # 成分名読み（ぐりめぴりど／ぐりべんくらみど／ぐりくらじど）は module 単位
  # nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（dm_dpp4_oral と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["sulfonylurea_oral", {genericKeyと同一の成分タグ}] の2件で統一
  # （dm_dpp4_oral と同型）。

drugResolution:
  brandToTags:
    アマリール:
      - "sulfonylurea_oral"
      - "glimepiride"
    オイグルコン:
      - "sulfonylurea_oral"
      - "glibenclamide"
    グリミクロン:
      - "sulfonylurea_oral"
      - "gliclazide"

composition:
  classKey: "sulfonylurea"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "sulfonylurea_oral"
  priority: "chronic"

display:
  nodeKey: "sulfonylurea_oral"
  nodeLabelShort: "SU"
  nodeLabelLong: "スルホニルウレア系経口血糖降下剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（アマリール・オイグルコン・グリミクロン） → ユーザー指定どおり確定
# 2. categoryPath「内服」taxonomy → dm_dpp4_oral / dm_biguanide_metformin_oral の
#    既存単剤モジュールと同型で確定
# 3. drugClass 単一結合定数「SULFONYLUREA」 → BIGUANIDE / THIAZOLIDINEDIONE と
#    同型の命名規則で確定
# 4. brandCatalog 3ブランド・各ブランド固有genericKey構成 → dm_dpp4_oral の
#    トラゼンタ〜グラクティブ（各ブランドが異なる成分を持つ単剤構成）と同型で確定
# 5. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ） → dm_dpp4_oral と同型の理由
#    （displayGenericName が resolveAllHighPrecisionBrands で解決されるため、
#    単剤ブランドの成分名読みを brandCatalog.aliases へ複製する必要がない）で確定
# 6. drugResolution.brandToTags → dm_dpp4_oral と同型の2件構成
#    （["sulfonylurea_oral", {genericKey}]）で確定
# 7. composition.classKey（"sulfonylurea"）/ nodeKey（"sulfonylurea_oral"）/
#    priority（"chronic"） → 既存命名規則で確定
# 8. handlingTags → 3ブランドとも空配列で確定。ブランド間の用量帯・重篤度差分
#    （例: グリベンクラミドの低血糖リスクがグリメピリド/グリクラジドと異なる可能性）
#    に基づく scenarioRequiredTags 制御が必要かどうかは、SCENARIOS作成時に
#    臨床的な差分の有無を確認したうえで判断する（今回のヘッダー段階では判断しない。
#    dm_thiazolidinedione_pioglitazone_oral と同型の先送り）
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-07 時点、本 bridge のヘッダー設計に関する未確定事項はなし）
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - handlingTags（ブランド間の重篤度・腎機能差分等の制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定の3ブランドのみを扱う

# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: DRAFT）
# =========================================

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=スルホニルウレア系経口血糖降下剤 初回】
S
スルホニルウレア系経口血糖降下剤は、血糖値が高いため追加となった。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤は、血糖コントロール不十分のため追加となった。
膵臓からのインスリン分泌を促すことで、血糖改善を目的として服用する。
P
スルホニルウレア系経口血糖降下剤は、血糖値を改善する薬です。
ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
P_ADDON
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




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






【SCENARIO｜type=treatment_start｜id=restart｜title=スルホニルウレア系経口血糖降下剤 再開】
S
スルホニルウレア系経口血糖降下剤は、血糖値が高いため再開となった。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤は、血糖コントロール不十分のため再開となった。
膵臓からのインスリン分泌を促すことで、血糖改善を目的として服用する。
P
スルホニルウレア系経口血糖降下剤は、血糖値を改善する薬です。
ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
P_ADDON
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=スルホニルウレア系経口血糖降下剤 他所開始】
S
スルホニルウレア系経口血糖降下剤は、他院で開始され継続使用中であった。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤は、血糖コントロール改善を目的として使用中であった。
膵臓からのインスリン分泌を促すことで、血糖改善を目的として服用する。
P
スルホニルウレア系経口血糖降下剤は、血糖値を改善する薬です。
ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
P_ADDON
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=スルホニルウレア系経口血糖降下剤 増量（効果実感乏しい）】
S
スルホニルウレア系経口血糖降下剤は、効果の実感が乏しいため増量となった。
O
スルホニルウレア系経口血糖降下剤　増量
A
スルホニルウレア系経口血糖降下剤は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
スルホニルウレア系経口血糖降下剤は、増量によりふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=スルホニルウレア系経口血糖降下剤 増量（検査値改善なし）】
S
スルホニルウレア系経口血糖降下剤は、検査値が改善しないため増量となった。
O
スルホニルウレア系経口血糖降下剤　増量
A
スルホニルウレア系経口血糖降下剤は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
スルホニルウレア系経口血糖降下剤は、増量によりふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=スルホニルウレア系経口血糖降下剤 増量（他剤との調整）】
S
スルホニルウレア系経口血糖降下剤は、他剤変更に伴う調整により増量となった。
O
スルホニルウレア系経口血糖降下剤　増量
A
スルホニルウレア系経口血糖降下剤は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
スルホニルウレア系経口血糖降下剤は、増量によりふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_renal_function｜title=スルホニルウレア系経口血糖降下剤 減量（腎機能低下）】
S
スルホニルウレア系経口血糖降下剤は、腎機能を考慮して減量となった。
O
スルホニルウレア系経口血糖降下剤　減量
A
スルホニルウレア系経口血糖降下剤は、腎機能低下に伴い用量調整となった。減量後の血糖推移に注意が必要である。
P
スルホニルウレア系経口血糖降下剤は、腎機能に応じて用量調整が必要になることがあります。
減量後は血糖値が変動する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、血糖推移および体調変化の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=スルホニルウレア系経口血糖降下剤 減量（症状改善）】
S
スルホニルウレア系経口血糖降下剤は、検査値が改善したため減量となった。
O
スルホニルウレア系経口血糖降下剤　減量
A
スルホニルウレア系経口血糖降下剤は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
スルホニルウレア系経口血糖降下剤は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=スルホニルウレア系経口血糖降下剤 減量（効果実感乏しい）】
S
スルホニルウレア系経口血糖降下剤は、効果の実感が乏しいため減量を希望された。
O
スルホニルウレア系経口血糖降下剤　減量
A
スルホニルウレア系経口血糖降下剤は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
スルホニルウレア系経口血糖降下剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=スルホニルウレア系経口血糖降下剤 減量（他剤との調整）】
S
スルホニルウレア系経口血糖降下剤は、他剤変更に伴う調整のため減量となった。
O
スルホニルウレア系経口血糖降下剤　減量
A
スルホニルウレア系経口血糖降下剤は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
スルホニルウレア系経口血糖降下剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=スルホニルウレア系経口血糖降下剤 副作用なし（低血糖）】
S
スルホニルウレア系経口血糖降下剤を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤による低血糖は現時点で認められず、治療継続が可能である。
P
スルホニルウレア系経口血糖降下剤の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
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






【SCENARIO｜type=side_effect｜id=se_liver_dysfunction_none｜title=スルホニルウレア系経口血糖降下剤 副作用なし（肝障害関連症状）】
S
スルホニルウレア系経口血糖降下剤を服用して症状は落ち着いている。
強い倦怠感などの明らかな体調変化は認めない。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤による肝障害を疑う明らかな自覚症状は現時点で認められず、治療継続が可能である。
P
スルホニルウレア系経口血糖降下剤の継続中に、肝臓値が悪化することがあります。
強い倦怠感が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_renal_impairment_none｜title=スルホニルウレア系経口血糖降下剤 副作用なし（腎障害）】
S
スルホニルウレア系経口血糖降下剤を服用して症状は落ち着いている。
むくみなどの明らかな体調変化は認めない。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤による腎障害を疑う明らかな自覚症状は現時点で認められず、治療継続が可能である。
P
スルホニルウレア系経口血糖降下剤の継続中に、腎臓値が悪化することがあります。
むくみの症状が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_anemia_none｜title=スルホニルウレア系経口血糖降下剤 副作用なし（貧血）】
S
スルホニルウレア系経口血糖降下剤を服用して症状は落ち着いている。
疲れやすさやだるさなどの症状は認めない。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤による貧血は現時点で認められず、治療継続が可能である。
P
スルホニルウレア系経口血糖降下剤の継続中に、貧血が出ることがあります。
疲れやすさやだるさなどの症状が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=スルホニルウレア系経口血糖降下剤 CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
スルホニルウレア系経口血糖降下剤　服用中
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






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=スルホニルウレア系経口血糖降下剤 CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
スルホニルウレア系経口血糖降下剤　服用中
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






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=スルホニルウレア系経口血糖降下剤 CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
スルホニルウレア系経口血糖降下剤　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=スルホニルウレア系経口血糖降下剤 CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した服用に不安がある。
O
スルホニルウレア系経口血糖降下剤　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=スルホニルウレア系経口血糖降下剤 終了（改善）】
S
スルホニルウレア系経口血糖降下剤は、血糖コントロールが改善したため中止となった。
O
スルホニルウレア系経口血糖降下剤　処方終了
A
スルホニルウレア系経口血糖降下剤は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
スルホニルウレア系経口血糖降下剤終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=スルホニルウレア系経口血糖降下剤 終了（効果不十分）】
S
スルホニルウレア系経口血糖降下剤は、効果不十分のため中止となった。
O
スルホニルウレア系経口血糖降下剤　処方終了
A
スルホニルウレア系経口血糖降下剤は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
スルホニルウレア系経口血糖降下剤終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=スルホニルウレア系経口血糖降下剤 終了（無効）】
S
スルホニルウレア系経口血糖降下剤は、効果が認められなかったため中止となった。
O
スルホニルウレア系経口血糖降下剤　処方終了
A
スルホニルウレア系経口血糖降下剤は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
スルホニルウレア系経口血糖降下剤終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=スルホニルウレア系経口血糖降下剤 SE継続（軽症 低血糖）】
S
スルホニルウレア系経口血糖降下剤の服用により軽い低血糖が出ることがあるが、日常生活は送れている。
O
スルホニルウレア系経口血糖降下剤　処方
A
スルホニルウレア系経口血糖降下剤による低血糖症状を軽度認めるが、治療継続が可能である。
P
スルホニルウレア系経口血糖降下剤による症状が軽い場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
低血糖症状が強く続く場合は、薬の調整が必要になることがあります。
ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_hypoglycemia｜title=スルホニルウレア系経口血糖降下剤 SE変更（低血糖）】
S
スルホニルウレア系経口血糖降下剤の服用により低血糖が出現したため、他剤へ変更となった。
O
スルホニルウレア系経口血糖降下剤　処方変更
A
スルホニルウレア系経口血糖降下剤の服用による低血糖症状を認め、他剤変更後の経過確認を要する。
P
スルホニルウレア系経口血糖降下剤の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_hypoglycemia｜title=スルホニルウレア系経口血糖降下剤 SE減量（低血糖）】
S
スルホニルウレア系経口血糖降下剤の服用により低血糖がひどいため、減量となった。
O
スルホニルウレア系経口血糖降下剤　減量
A
スルホニルウレア系経口血糖降下剤の服用による低血糖症状を認め、減量後の経過確認を要する。
P
スルホニルウレア系経口血糖降下剤の減量後も低血糖症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_hypoglycemia｜title=スルホニルウレア系経口血糖降下剤 SE中止（低血糖）】
S
スルホニルウレア系経口血糖降下剤の服用により低血糖がひどいため、中止となった。
O
スルホニルウレア系経口血糖降下剤　処方中止
A
スルホニルウレア系経口血糖降下剤の服用による低血糖症状を認め、中止後の経過確認を要する。
P
スルホニルウレア系経口血糖降下剤の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=スルホニルウレア系経口血糖降下剤 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
スルホニルウレア系経口血糖降下剤　処方
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






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=スルホニルウレア系経口血糖降下剤 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
スルホニルウレア系経口血糖降下剤　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=スルホニルウレア系経口血糖降下剤 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
スルホニルウレア系経口血糖降下剤　服用中
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
=======SCENARIOS_END=======
