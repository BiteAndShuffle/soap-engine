# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_epalrestat_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー案（drug / composition / display 等）および SCENARIOS_START〜
# SCENARIOS_END のシナリオ本文・ADDON本文は、ユーザーによる凍結前レビュー
# （PASS確認済み）を経て確定しました。
#
# 目的: アルドース還元酵素阻害薬（キネダック）の brandCatalog / alias /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-09 ヘッダー作成、同日シナリオ本文追加）。
#
# 次の作業: PN1 開始（prompts/vNext/HANDOFF.md「bridge 作成から開始する」
# 手順に従う）。
#
# 参照:
#   - bridges/dm_imeglimin_oral.md（単剤・単一ブランド・直近実績。
#     classKey=genericKey（クラス＝成分が一致する単剤）の設計パターンの直接参考）
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の実績。ヘッダー構成の直接参考）
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

moduleId: "dm_epalrestat_oral"

categoryPath:
  - "糖尿病"
  - "アルドース還元酵素阻害薬"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_imeglimin_oral / dm_glinide_oral と同型。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "アルドース還元酵素阻害薬"

  brandNames:
    - "キネダック"

  drugClass:
    - "ALDOSE_REDUCTASE_INHIBITOR"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "epalrestat_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-09）
  # ─────────────────────────────────────────
  # ブランド名読み「きねだっく」・成分名読み「えぱるれすたっと」はいずれも
  # kataToHira による機械的なひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（既存単剤モジュールと同型の判断）:
  #   単一ブランド（キネダック）のみのため、成分名読みを brandCatalog.aliases へ
  #   複製する必要はない。module 単位の prefixAliases/nameAliases にのみ追加する。
  search:
    primaryDisplayName: "アルドース還元酵素阻害薬"

    exactAliases:
      - "キネダック"

    prefixAliases:
      - "きねだっく"
      - "えぱるれすたっと"

    nameAliases:
      - "きねだっく"
      - "えぱるれすたっと"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "きねだっく"
    - "えぱるれすたっと"

  # ─────────────────────────────────────────
  # brandCatalog: 1 ブランド（キネダックのみ）
  # ─────────────────────────────────────────
  # genericKey は成分名（"epalrestat"）をそのまま採用する
  # （classKey と同値。単一成分・単一ブランドのためクラス＝成分の関係が
  # 一致することによる。dm_imeglimin_oral の単剤設計と同型の判断）。
  brandCatalog:
    キネダック:
      displayName: "キネダック"
      genericName: "エパルレスタット"
      displayGenericName: "エパルレスタット"
      genericKey: "epalrestat"
      handlingTags: []
      aliases:
        - "きねだっく"
      normalizedAliases:
        - "きねだっく"

  aliasToBrand:
    "きねだっく": "キネダック"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。1件・1件で一致。
  # 成分名読み（えぱるれすたっと）は module 単位 nameAliases 側のみに存在し
  # brandCatalog.aliases には複製していないため、aliasToBrand の対象外
  # （既存単剤モジュールと同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # ["epalrestat_oral"（drugSpecificTags と同値）, "epalrestat"（genericKey と同値）]
  # の2件で統一（dm_imeglimin_oral / dm_glinide_oral と同型の2件構成パターン）。

drugResolution:
  brandToTags:
    キネダック:
      - "epalrestat_oral"
      - "epalrestat"

composition:
  classKey: "epalrestat"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "epalrestat_oral"
  priority: "chronic"

display:
  nodeKey: "epalrestat_oral"
  nodeLabelShort: "エパルレスタット"
  nodeLabelLong: "アルドース還元酵素阻害薬（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（キネダック、単一ブランド） → bridgeファイル名・
#    ユーザー指定成分どおり確定
# 2. categoryPath「内服」taxonomy → 既存単剤モジュール（dm_imeglimin_oral 等）の
#    実績と同型で確定
# 3. drugClass 単一結合定数「ALDOSE_REDUCTASE_INHIBITOR」 → 既存単剤モジュールの
#    命名規則（クラス名英語表記）と同型で確定
# 4. brandCatalog.genericName（「エパルレスタット」）→ ユーザー指定成分どおり確定
# 5. genericKey（"epalrestat"）→ classKey と同値で確定
#    （単一成分クラスのため。dm_imeglimin_oral と同型の判断）
# 6. 成分名読みの扱い（えぱるれすたっと）→ kataToHira機械的変換のみで確定。
#    brandCatalog.aliases への複製は行わず module 単位 nameAliases のみに追加
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ 既存単剤モジュールと同型の理由で確定
# 8. drugResolution.brandToTags → dm_imeglimin_oral / dm_glinide_oral と同型の
#    2件構成（["epalrestat_oral", "epalrestat"]）で確定
# 9. composition.classKey（"epalrestat"）/ nodeKey（"epalrestat_oral"）/
#    priority（"chronic"）→ 既存命名規則で確定
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-09 時点、本 bridge のヘッダー設計に関する未確定事項はなし）
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - handlingTags（増量・減量等のブランド差分制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する。今回のヘッダー段階では
#   単一ブランドのみのため handlingTags は空配列とした
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではキネダック1ブランドのみを扱う
#
# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: FROZEN_FOR_PN1）
# =========================================
#
# シナリオ本文追加時の対応: ユーザー提供文に addon_hyperkalemia_guidance の重複定義
# （initial直後・se_liver_dysfunction_none直後の2箇所、内容完全一致）があったため、
# initial直後の定義を正本として残し、se_liver_dysfunction_none直後の重複ブロックのみ
# 削除した（既存単剤・配合剤bridgeでの同型の対応実績に倣う。S/O/A/P本文・P_ADDON参照・
# addon本文そのものは変更していない）。
#
# 設計方針変更（2026-07-09）: エパルレスタットは腎機能低下による定型的な減量
# シナリオを持たせない方針としたため、dose_decrease_renal_function シナリオを削除した。
# これに伴い、いったん承認された新規 followupRef `symptom_change_followup`
# （P_CLOSING = "次回、症状変化および体調変化の有無を確認。"）も本 bridge 内では
# 未使用となった（prompts/vNext/PN1-Text-Extraction.md の対応表からも削除済み）。
#

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=アルドース還元酵素阻害薬 初回】
S
アルドース還元酵素阻害薬は、しびれがひどいため追加となった。
O
アルドース還元酵素阻害薬　処方
A
アルドース還元酵素阻害薬は、糖尿病神経障害の改善を目的として開始となった。
糖尿病神経障害に伴う症状の改善が期待される。
P
アルドース還元酵素阻害薬は、糖尿病神経障害によるしびれや痛みなどの症状を改善する薬です。
効果が現れるまで時間がかかることがあります。
体調の変化や気になる症状があればご相談ください。
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






【SCENARIO｜type=treatment_start｜id=restart｜title=アルドース還元酵素阻害薬 再開】
S
アルドース還元酵素阻害薬は、しびれがひどいため再開となった。
O
アルドース還元酵素阻害薬　処方
A
アルドース還元酵素阻害薬は、糖尿病神経障害の改善を目的として再開となった。
糖尿病神経障害に伴う症状の改善が期待される。
P
アルドース還元酵素阻害薬は、糖尿病神経障害によるしびれや痛みなどの症状を改善する薬です。
効果が現れるまで時間がかかることがあります。
体調の変化や気になる症状があればご相談ください。
P_ADDON
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=アルドース還元酵素阻害薬 他所開始】
S
アルドース還元酵素阻害薬は、他院で開始され継続使用中であった。
O
アルドース還元酵素阻害薬　処方
A
アルドース還元酵素阻害薬は、糖尿病神経障害の改善を目的として使用中であった。
糖尿病神経障害に伴う症状の改善が期待される。
P
アルドース還元酵素阻害薬は、糖尿病神経障害によるしびれや痛みなどの症状を改善する薬です。
効果が現れるまで時間がかかることがあります。
体調の変化や気になる症状があればご相談ください。
P_ADDON
- addon_glycemic_guidance_initial
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=アルドース還元酵素阻害薬 増量（効果実感乏しい）】
S
アルドース還元酵素阻害薬は、効果の実感が乏しいため増量となった。
O
アルドース還元酵素阻害薬　増量
A
アルドース還元酵素阻害薬は、効果不十分のため増量となった。
増量後の効果および副作用の経過確認が必要である。
P
アルドース還元酵素阻害薬の増量後は体調の変化や副作用に注意してください。
気になる症状があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=アルドース還元酵素阻害薬 増量（他剤との調整）】
S
アルドース還元酵素阻害薬は、他剤変更に伴う調整により増量となった。
O
アルドース還元酵素阻害薬　増量
A
アルドース還元酵素阻害薬は、他剤変更に伴う調整のため増量となった。
増量後の効果および副作用の経過確認が必要である。
P
アルドース還元酵素阻害薬の増量後は体調の変化や副作用に注意してください。
気になる症状があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=アルドース還元酵素阻害薬 減量（効果実感乏しい）】
S
アルドース還元酵素阻害薬は、効果の実感が乏しいため減量を希望された。
O
アルドース還元酵素阻害薬　減量
A
アルドース還元酵素阻害薬は、患者希望を踏まえ減量となった。減量後の症状変化に注意が必要である。
P
アルドース還元酵素阻害薬は、減量後にしびれや痛みなどの症状が悪化する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=アルドース還元酵素阻害薬 減量（他剤との調整）】
S
アルドース還元酵素阻害薬は、他剤変更に伴う調整のため減量となった。
O
アルドース還元酵素阻害薬　減量
A
アルドース還元酵素阻害薬は、併用薬変更に伴う治療調整のため減量となった。減量後の症状変化に注意が必要である。
P
アルドース還元酵素阻害薬は、減量によりしびれや痛みなどの症状が再燃・悪化する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_liver_dysfunction_none｜title=アルドース還元酵素阻害薬 副作用なし（肝障害関連症状）】
S
アルドース還元酵素阻害薬を服用して症状は落ち着いている。
強い倦怠感などの明らかな体調変化は認めない。
O
アルドース還元酵素阻害薬　処方
A
アルドース還元酵素阻害薬による肝障害を疑う明らかな自覚症状は現時点で認められず、治療継続が可能である。
P
アルドース還元酵素阻害薬の継続中に、強い倦怠感が出ることがあります。
気になる症状が続く場合はご相談ください。
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






【SCENARIO｜type=side_effect｜id=se_appetite_loss_none｜title=アルドース還元酵素阻害薬 副作用なし（食欲不振）】
S
アルドース還元酵素阻害薬を服用して症状は落ち着いている。
食欲不振は認めない。
O
アルドース還元酵素阻害薬　処方
A
アルドース還元酵素阻害薬による消化器症状は現時点で認められず、治療継続が可能である。
P
アルドース還元酵素阻害薬の継続中に、お腹の調子が悪くなることがあります。
食欲不振が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_anemia_none｜title=アルドース還元酵素阻害薬 副作用なし（貧血）】
S
アルドース還元酵素阻害薬を服用して症状は落ち着いている。
疲れやすさやだるさなどの症状は認めない。
O
アルドース還元酵素阻害薬　処方
A
アルドース還元酵素阻害薬による貧血は現時点で認められず、治療継続が可能である。
P
アルドース還元酵素阻害薬の継続中に、貧血が出ることがあります。
疲れやすさやだるさなどの症状が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=アルドース還元酵素阻害薬 CP良好】
S
薬を服用して症状は落ち着いている。
飲み忘れなく服用している。
O
アルドース還元酵素阻害薬　服用中
A
コンプライアンスは良好である。治療継続に問題はない。
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






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=アルドース還元酵素阻害薬 CP不良（服薬忘れ）】
S
飲み忘れることがある。
症状は大きく変わっていない。
O
アルドース還元酵素阻害薬　服用中
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






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=アルドース還元酵素阻害薬 CP不良（自己判断）】
S
自己判断で服用を調整することがある。
症状は大きく変わっていない。
O
アルドース還元酵素阻害薬　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=アルドース還元酵素阻害薬 CP不良（受診遅延）】
S
受診が遅れ、服用を調整することがある。
症状は大きく変わっていない。
O
アルドース還元酵素阻害薬　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=アルドース還元酵素阻害薬 終了（改善）】
S
アルドース還元酵素阻害薬は、しびれや痛みなどの症状が改善したため中止となった。
O
アルドース還元酵素阻害薬　処方終了
A
アルドース還元酵素阻害薬は、しびれや痛みなどの症状改善により終了となった。終了後に症状が再燃・変化する可能性があるため、注意が必要である。
P
アルドース還元酵素阻害薬終了後、しびれや痛みの変化、体調変化があればご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=アルドース還元酵素阻害薬 終了（効果不十分）】
S
アルドース還元酵素阻害薬は、効果不十分のため中止となった。
O
アルドース還元酵素阻害薬　処方終了
A
アルドース還元酵素阻害薬は、効果不十分のため終了となった。神経障害症状に対する治療方針の再評価が必要である。
P
アルドース還元酵素阻害薬終了後、しびれや痛みなどの症状が続く可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=アルドース還元酵素阻害薬 終了（無効）】
S
アルドース還元酵素阻害薬は、効果が認められなかったため中止となった。
O
アルドース還元酵素阻害薬　処方終了
A
アルドース還元酵素阻害薬は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
アルドース還元酵素阻害薬終了後、しびれや痛みなどの症状が続く可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=アルドース還元酵素阻害薬 SE継続（軽症 消化器症状）】
S
アルドース還元酵素阻害薬の服用によりお腹の調子が悪いが、日常生活は送れている。
O
アルドース還元酵素阻害薬　処方
A
アルドース還元酵素阻害薬による消化器症状を軽度認めるが、治療継続が可能である。
P
アルドース還元酵素阻害薬による胃腸症状が軽い場合は、経過を確認しながら継続してください。
症状が強い場合や、長く続く場合は、薬の調整が必要になることがありますので、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_liver_dysfunction｜title=アルドース還元酵素阻害薬 SE変更（肝機能障害）】
S
アルドース還元酵素阻害薬の服用により激しい倦怠感が出現したため、他剤へ変更となった。
O
アルドース還元酵素阻害薬　処方変更
A
アルドース還元酵素阻害薬の服用による肝機能障害を認め、他剤変更後の経過確認を要する。
P
アルドース還元酵素阻害薬の変更後、しびれや痛みの変化、体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_liver_dysfunction｜title=アルドース還元酵素阻害薬 SE中止（肝機能障害）】
S
アルドース還元酵素阻害薬の服用により激しい倦怠感がひどいため、中止となった。
O
アルドース還元酵素阻害薬　処方中止
A
アルドース還元酵素阻害薬の服用による肝機能障害を認め、中止後の経過確認を要する。
P
アルドース還元酵素阻害薬の中止後、しびれや痛みの変化、体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=アルドース還元酵素阻害薬 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
アルドース還元酵素阻害薬　処方
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






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=アルドース還元酵素阻害薬 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
アルドース還元酵素阻害薬　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=アルドース還元酵素阻害薬 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
アルドース還元酵素阻害薬　服用中
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
