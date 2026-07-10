# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_glinide_alpha_glucosidase_inhibitor_combination_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー案（drug / composition / display 等）および SCENARIOS_START〜SCENARIOS_END の
# シナリオ本文・ADDON本文は、ユーザーによる凍結前レビュー（PASS確認済み）を経て
# 確定しました。
#
# 目的: グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤（グルベス）の
# brandCatalog / alias / drugResolution.brandToTags 設計、およびシナリオ本文を、
# 会話ログではなくリポジトリ上に固定するための作業ファイルです
# （2026-07-07 ヘッダー作成、同日シナリオ本文追加）。
#
# シナリオ本文追加時の対応: ユーザー提供文に addon_hyperkalemia_guidance の重複定義
# （initial直後・se_hypo_none直後の2箇所、内容完全一致）があったため、initial直後の
# 定義を正本として残し、se_hypo_none直後の重複ブロックのみ削除した
# （既存配合剤・単剤bridgeでの同型の対応実績に倣う。S/O/A/P本文・P_ADDON参照・
# addon本文そのものは変更していない）。
#
# 次の作業: PN1 開始（prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_glinide_oral.md（単剤・直近実績。ミチグリニド読み
#     「みちぐりにど」の出典）
#   - bridges/dm_alpha_glucosidase_inhibitor_oral.md（単剤・直近実績。
#     ボグリボース読み「ぼぐりぼーす」の出典）
#   - bridges/dm_thiazolidinedione_sulfonylurea_combination_oral.md（既存配合剤
#     実績・直近。単一ブランド配合剤のbrandCatalog/aliasToBrand設計・
#     genericKey命名の直接参考）
#   - bridges/dm_thiazolidinedione_biguanide_combination_oral.md（既存配合剤実績。
#     categoryPath「配合剤」taxonomy・単一ブランド配合剤設計の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離・配合剤専用キー）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_glinide_alpha_glucosidase_inhibitor_combination_oral"

# categoryPath は dm_thiazolidinedione_sulfonylurea_combination_oral.md /
# dm_thiazolidinedione_biguanide_combination_oral.md の配合剤taxonomyに倣う
# （異なる薬効クラス同士の固定用量配合剤 → 2階層目「配合剤」）
categoryPath:
  - "糖尿病"
  - "配合剤"
  - "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤"

drug:
  # genericName はクラス名（配合剤クラス表記）を採用。
  # 実際の成分名（2成分）は brandCatalog[brand].genericName 側に格納する
  # （既存配合剤4件と同型）
  genericName: "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤"

  brandNames:
    - "グルベス"

  # drugClass は既存配合剤の単一結合定数パターンに倣う
  drugClass:
    - "GLINIDE_ALPHA_GLUCOSIDASE_INHIBITOR_COMBINATION"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "glinide_alpha_glucosidase_inhibitor_combination_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-07）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（既存グリニド/αGIモジュールにある読みのみを流用。新規推測なし）:
  #   - みちぐりにど（ミチグリニド）は dm_glinide_oral.drug.search.nameAliases に
  #     確立済みの読みを流用
  #   - みちぐりにどかるしうむすいわぶつ（ミチグリニドカルシウム水和物・塩形表記）は
  #     既存モジュールに確立済みの読みが存在しないため、kataToHira による機械的な
  #     ひらがな変換のみで新規追加する（推測なし。dm_thiazolidinedione_pioglitazone_oral の
  #     「ぴおぐりたぞん」「ぴおぐりたぞんえんさんえん」= 塩非表記/塩表記の2形式併記
  #     パターンと同型）
  #   - ぼぐりぼーす（ボグリボース）は dm_alpha_glucosidase_inhibitor_oral.drug.search.nameAliases
  #     から同様に流用
  #   - 上記3件はいずれも module 単位の prefixAliases/nameAliases にのみ追加し、
  #     brandCatalog[brand].aliases への複製は行わない（単一ブランドのため
  #     aliasToBrand の曖昧化リスクはないが、既存配合剤4件と同型の判断で統一する）
  search:
    primaryDisplayName: "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤"

    exactAliases:
      - "グルベス"

    prefixAliases:
      - "ぐるべす"
      - "みちぐりにど"
      - "みちぐりにどかるしうむすいわぶつ"
      - "ぼぐりぼーす"

    nameAliases:
      - "ぐるべす"
      - "みちぐりにど"
      - "みちぐりにどかるしうむすいわぶつ"
      - "ぼぐりぼーす"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "ぐるべす"
    - "みちぐりにど"
    - "みちぐりにどかるしうむすいわぶつ"
    - "ぼぐりぼーす"

  # ─────────────────────────────────────────
  # brandCatalog: 1 ブランド（グルベスのみ、単一ブランドとして扱う）
  # ─────────────────────────────────────────
  # genericKey はユーザー指定値「mitiglinide_voglibose_combo」をそのまま採用する
  # （既存配合剤4件の "{成分A}_{成分B}_combo" 命名規則と一致）。
  brandCatalog:
    グルベス:
      displayName: "グルベス"
      genericName: "ミチグリニドカルシウム水和物・ボグリボース"
      displayGenericName: "ミチグリニドカルシウム水和物・ボグリボース"
      genericKey: "mitiglinide_voglibose_combo"
      handlingTags: []
      aliases:
        - "ぐるべす"
      normalizedAliases:
        - "ぐるべす"

  aliasToBrand:
    "ぐるべす": "グルベス"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。1件・1件で一致。
  # 成分名読み（みちぐりにど／みちぐりにどかるしうむすいわぶつ／ぼぐりぼーす）は
  # module 単位 nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（既存配合剤4件と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # ["glinide_alpha_glucosidase_inhibitor_combination", {genericKeyと同一の成分タグ}] の
  # 2件で統一（既存配合剤4件と同型）。

drugResolution:
  brandToTags:
    グルベス:
      - "glinide_alpha_glucosidase_inhibitor_combination"
      - "mitiglinide_voglibose_combo"

composition:
  classKey: "glinide_alpha_glucosidase_inhibitor_combination"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "glinide_alpha_glucosidase_inhibitor_combination_oral"
  priority: "chronic"

display:
  nodeKey: "glinide_alpha_glucosidase_inhibitor_combination_oral"
  nodeLabelShort: "グリニド/α-GI配合剤"
  nodeLabelLong: "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（グルベス、単一ブランド） → ユーザー指定どおり確定
# 2. categoryPath「配合剤」taxonomy → 既存配合剤4件の実績と同型で確定
# 3. drugClass 単一結合定数「GLINIDE_ALPHA_GLUCOSIDASE_INHIBITOR_COMBINATION」 →
#    既存配合剤の命名規則と同型で確定
# 4. brandCatalog.genericName（「ミチグリニドカルシウム水和物・ボグリボース」）→
#    ユーザー指定成分（ミチグリニドカルシウム水和物・ボグリボース）どおり確定
# 5. genericKey（"mitiglinide_voglibose_combo"）→ ユーザー指定値をそのまま採用して確定
#    （既存配合剤の "_combo" 接尾辞命名規則と一致）
# 6. 成分名読みの流用範囲（みちぐりにど／ぼぐりぼーす）→ 既存グリニド/αGIモジュールに
#    確立済みの読みのみを流用して確定。「みちぐりにどかるしうむすいわぶつ」（塩表記）は
#    既存モジュールに確立済みの読みが存在しないため、kataToHira機械的変換のみで新規追加
#    （dm_thiazolidinedione_pioglitazone_oral の塩非表記/塩表記2形式併記と同型の判断）
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ 既存配合剤4件と同型の理由で確定
# 8. drugResolution.brandToTags → 既存配合剤4件と同型の
#    2件構成（["glinide_alpha_glucosidase_inhibitor_combination", {genericKey}]）で確定
# 9. composition.classKey（"glinide_alpha_glucosidase_inhibitor_combination"）/ nodeKey
#    （"glinide_alpha_glucosidase_inhibitor_combination_oral"）/ priority（"chronic"）→
#    既存命名規則で確定
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
# - handlingTags（増量・減量等のブランド差分制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する。今回のヘッダー段階では
#   単一ブランドのみのため handlingTags は空配列とした
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定のグルベス1ブランドのみを扱う

# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: FROZEN_FOR_PN1）
# =========================================

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 初回】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖値が高いため追加となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖コントロール不十分のため追加となった。
速やかにインスリン分泌を促し、糖質の分解を遅らせることで、食後血糖の改善を目的として服用する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、インスリン分泌を促し、食後血糖の上昇を抑える薬です。
ふらつき・冷汗・動悸などの低血糖症状や、腹部膨満感・下痢などの消化器症状が出ることがあります。
低血糖症状が出た場合は、砂糖ではなくブドウ糖を摂取して対処してください。
食事量が少ない時や食事時間が遅れる時は、低血糖に注意してください。
症状が強い場合や続く場合はご相談ください。
P_ADDON
- addon_glinide_alpha_gi_before_meal_guidance
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=adherence_guidance｜id=addon_glinide_alpha_gi_before_meal_guidance｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 服用タイミング】
P_APPEND
食事の直前に服用する薬です。
食事を摂らない時は服用を控え、対応に迷う場合は処方医へご相談ください。
飲み忘れたことに気付いた時は、自己判断せずご相談ください。




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






【SCENARIO｜type=treatment_start｜id=restart｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 再開】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖値が高いため再開となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖コントロール不十分のため再開となった。
速やかにインスリン分泌を促し、糖質の分解を遅らせることで、食後血糖の改善を目的として服用する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、インスリン分泌を促し、食後血糖の上昇を抑える薬です。
ふらつき・冷汗・動悸などの低血糖症状や、腹部膨満感・下痢などの消化器症状が出ることがあります。
低血糖症状が出た場合は、砂糖ではなくブドウ糖を摂取して対処してください。
食事量が少ない時や食事時間が遅れる時は、低血糖に注意してください。
症状が強い場合や続く場合はご相談ください。
P_ADDON
- addon_glinide_alpha_gi_before_meal_guidance
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 他所開始】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、他院で開始され継続使用中であった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖コントロール改善を目的として使用中であった。
速やかにインスリン分泌を促し、糖質の分解を遅らせることで、食後血糖の改善を目的として服用する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、インスリン分泌を促し、食後血糖の上昇を抑える薬です。
ふらつき・冷汗・動悸などの低血糖症状や、腹部膨満感・下痢などの消化器症状が出ることがあります。
低血糖症状が出た場合は、砂糖ではなくブドウ糖を摂取して対処してください。
食事量が少ない時や食事時間が遅れる時は、低血糖に注意してください。
症状が強い場合や続く場合はご相談ください。
P_ADDON
- addon_glinide_alpha_gi_before_meal_guidance
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 増量（効果実感乏しい）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、効果の実感が乏しいため増量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　増量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、増量によりふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、砂糖ではなくブドウ糖を摂取して対処してください。
お腹が張ったり、お腹の調子が変わることがあります。
症状が強い場合や続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 増量（検査値改善なし）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、検査値が改善しないため増量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　増量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、増量によりふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、砂糖ではなくブドウ糖を摂取して対処してください。
お腹が張ったり、お腹の調子が変わることがあります。
症状が強い場合や続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 増量（他剤との調整）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、他剤変更に伴う調整により増量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　増量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、増量によりふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、砂糖ではなくブドウ糖を摂取して対処してください。
お腹が張ったり、お腹の調子が変わることがあります。
症状が強い場合や続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_renal_function｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 減量（腎機能低下）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、腎機能を考慮して減量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　減量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、腎機能低下に伴い用量調整となった。減量後の血糖推移に注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、腎機能に応じて用量調整が必要になることがあります。
減量後は血糖値が変動する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、血糖推移および体調変化の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 減量（検査値改善）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、検査値が改善したため減量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　減量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 減量（効果実感乏しい）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、効果の実感が乏しいため減量を希望された。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　減量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 減量（他剤との調整）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、他剤変更に伴う調整のため減量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　減量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 副作用なし（低血糖）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による低血糖は現時点で認められず、治療継続が可能である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、砂糖ではなくブドウ糖を摂取して対処してください。
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






【SCENARIO｜type=side_effect｜id=se_liver_dysfunction_none｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 副作用なし（肝障害関連症状）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤を服用して症状は落ち着いている。
強い倦怠感などの明らかな体調変化は認めない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による肝障害を疑う明らかな自覚症状は現時点で認められず、治療継続が可能である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の継続中に、肝機能が悪くなることがあります。
強い倦怠感が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_anemia_none｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 副作用なし（貧血）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤を服用して症状は落ち着いている。
疲れやすさやだるさなどの症状は認めない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による貧血は現時点で認められず、治療継続が可能である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の継続中に、貧血が出ることがあります。
疲れやすさやだるさなどの症状が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_diarrhea_none｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 副作用なし（下痢）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤を服用して症状は落ち着いている。
下痢は認めない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による消化器症状は現時点で認められず、治療継続が可能である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の継続中に、お腹の調子が悪くなることがあります。
下痢が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_abdominal_distension_none｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 副作用なし（腹部膨満感）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤を服用して症状は落ち着いている。
お腹が張った感じは認めない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による消化器症状は現時点で認められず、治療継続が可能である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の継続中に、お腹の調子が悪くなることがあります。
お腹の張りが続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　服用中
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






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することで血糖コントロールの維持が期待されます。
服薬忘れが続くと血糖値が不安定となる可能性があります。
P_ADDON
- addon_glinide_alpha_gi_before_meal_guidance
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






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した服用に不安がある。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 終了（改善）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖コントロールが改善したため中止となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方終了
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 終了（効果不十分）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、効果不十分のため中止となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方終了
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 終了（無効）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、効果が認められなかったため中止となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方終了
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE継続（軽症 低血糖）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用により軽い低血糖が出ることがあるが、日常生活は送れている。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による低血糖症状を軽度認めるが、治療継続が可能である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による低血糖症状が軽い場合は、まず砂糖ではなくブドウ糖を摂取して対処してください。
低血糖症状が強く続く場合は、薬の調整が必要になることがあります。
ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_mild_continue_abdominal_distension｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE継続（軽症 腹部膨満感）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用によりお腹が張った感じが出ることがあるが、日常生活は送れている。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤による消化器症状を軽度認めるが、治療継続が可能である。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤によるお腹の張りが軽い場合は、経過をみながら継続してください。
症状が強くなる、長引く場合は、薬の調整が必要になることがあります。
ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_hypoglycemia｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE変更（低血糖）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用により低血糖が出現したため、他剤へ変更となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方変更
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用による低血糖症状を認め、他剤変更後の経過確認を要する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_abdominal_distension｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE変更（腹部膨満感）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用によりお腹が張ったため、他剤へ変更となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方変更
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用による消化器症状を認め、他剤変更後の経過確認を要する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_hypoglycemia｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE減量（低血糖）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用により低血糖がひどいため、減量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　減量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用による低血糖症状を認め、減量後の経過確認を要する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の減量後も低血糖症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_abdominal_distension｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE減量（腹部膨満感）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用によりお腹の張りがひどいため、減量となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　減量
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用による消化器症状を認め、減量後の経過確認を要する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の減量後も消化器症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_hypoglycemia｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE中止（低血糖）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用により低血糖がひどいため、中止となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方中止
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用による低血糖症状を認め、中止後の経過確認を要する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_abdominal_distension｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 SE中止（腹部膨満感）】
S
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用によりお腹の張りがひどいため、中止となった。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方中止
A
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の服用による消化器症状を認め、中止後の経過確認を要する。
P
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
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






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤　服用中
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
