# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_biguanide_metformin_oral
# =========================================
#
# ⚠️ STATUS: DRAFT ⚠️
#
# ヘッダー案（drug / composition / display 等）は確定済み（変更なし）。
# SCENARIOS_START〜SCENARIOS_END は、2026-07-12 にユーザー提示の最新版本文へ
# 全面更新した。更新後の再凍結前レビューはまだ実施していない。
# 本ファイルは以前 FROZEN_FOR_PN1 として PN1 着手可能な状態だったが、
# SCENARIOS 本文更新に伴い STATUS を DRAFT へ差し戻した（RULES.md §24）。
# PN1 は未再開（ユーザーの再凍結宣言を待つ）。
#
# 目的: ビグアナイド系糖尿病薬（メトホルミン塩酸塩）の brandCatalog / handlingTags /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-05 作成・同日シナリオ本文追加・凍結／2026-07-12
# SCENARIOS 本文更新）。
#
# 次の作業: ユーザーによる更新後 SCENARIOS_START〜SCENARIOS_END の再確認・再凍結宣言。
# 再凍結後に STATUS を FROZEN_FOR_PN1 へ更新し PN1 を開始する
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（同形式の直近実績・DPP4）
#   - data/modules/dm_dpp4_oral.json
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）/ §21（genericName/genericKey役割分離）
#   - data/modules/dm_insulin_regular.json（同一成分・複数ブランドの先行実績。
#     ノボリンR/ヒューマリンR がともに genericName="インスリンヒト" を共有する構造が
#     本モジュール（メトグルコ/メトホルミン/グリコラン が genericName="メトホルミン塩酸塩" を
#     共有する構造）の直接の参考になる）
#
# =========================================

moduleId: "dm_biguanide_metformin_oral"

categoryPath:
  - "糖尿病"
  - "ビグアナイド系糖尿病薬"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_insulin_regular / dm_dpp4_oral と同型。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "ビグアナイド系糖尿病薬"

  brandNames:
    - "メトグルコ"
    - "メトホルミン"
    - "グリコラン"

  drugClass:
    - "BIGUANIDE"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "biguanide_metformin_oral"

  # ─────────────────────────────────────────
  # search セクション: 確定（2026-07-05）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  # 成分名（メトホルミン塩酸塩）の読み「めとほるみんえんさんえん」は module 単位の
  # prefixAliases/nameAliases に加え、brandCatalog.メトホルミン.aliases/normalizedAliases
  # にも追加する（2026-07 改訂）。
  #
  # 【2026-07-05 決定からの変更点】
  # 旧方針: 複数ブランドへの複製で aliasToBrand の解決先が曖昧になることを避けるため、
  #         brandCatalog[brand].aliases への複製を行わなかった。
  # 新方針: 「メトホルミン」1ブランドのみへ限定して追加する（メトグルコ／グリコランへは
  #         複製しない）。曖昧化の懸念は「複数ブランドへの複製」が原因であり、単一ブランド
  #         への追加はこの懸念に該当しない。この追加により、検索語「めとほるみんえんさんえん」
  #         が resolveAllHighPrecisionBrands の priority2（alias完全一致）で「メトホルミン」
  #         へ直接解決できるようになり、塩名（メトホルミン塩酸塩）を独立候補として
  #         表示することなく、検索結果を「メトホルミン」へ収束できる（ユーザー確定・2026-07）。
  search:
    primaryDisplayName: "ビグアナイド系糖尿病薬"

    exactAliases:
      - "メトグルコ"
      - "メトホルミン"
      - "グリコラン"

    prefixAliases:
      - "めとぐるこ"
      - "めとほるみん"
      - "ぐりこらん"
      - "めとほるみんえんさんえん"

    nameAliases:
      - "めとぐるこ"
      - "めとほるみん"
      - "ぐりこらん"
      - "めとほるみんえんさんえん"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true
      # 2026-07 追加（メトホルミン/ピオグリタゾン検索順位・塩名header共通修正）:
      # direct候補内でブランド自身の正式名/alias一致（tier1）をgenericName経由の
      # 一致（tier2）より優先する。未設定モジュールは従来どおり brandNames 宣言順を維持する。
      preferOwnNameMatchOverGenericMatch: true
      # direct候補内に同一成分のブランド候補が既に存在する場合、冗長な塩名
      # （メトホルミン塩酸塩）単独の generic header 候補を追加しない。
      suppressRedundantGenericHeaderOnDirectMatch: true

  nameAliases:
    - "めとぐるこ"
    - "めとほるみん"
    - "ぐりこらん"
    - "めとほるみんえんさんえん"

  # ─────────────────────────────────────────
  # brandCatalog: 3 ブランド
  # ─────────────────────────────────────────
  # 3ブランドはすべて同一成分（メトホルミン塩酸塩）だが、用量帯・剤形設計が異なるため
  # genericKey をユーザー指定どおり3種に分離する（意図的差分・確定済み）:
  #   - メトグルコ / メトホルミン（GE）: 高用量製剤系統（最大2250mg/日）
  #   - グリコラン: 旧来低用量製剤系統（最大750mg/日）
  # 将来、成分名検索で3ブランドを同一グループとして展開したい場合は
  # genericKey の統合を別途検討する（今回は現状維持）。
  #
  # handlingTags（ブランド系統の区分ラベルとして保持。今回の scenario availability
  # 制御には使用しない — 2026-07-05 ユーザー確定。理由: グリコランも通常500mgから
  # 開始し最大750mgまで増量可能であり、今回のSOAPシナリオは具体的なmg数を扱わないため、
  # 増量・減量シナリオは全ブランド共通としてよい。scenarioRequiredTagsは付与しない）:
  #   - "metformin_high_dose": 高用量まで増量可能な系統（メトグルコ/メトホルミン）
  #   - "metformin_legacy_low_dose": 旧来低用量上限系統（グリコラン）
  #   - "renal_dose_adjustment": 全ブランド共通
  #
  # drugResolution.brandToTags（成分識別タグ・handlingTagsとは別名前空間）:
  #   ユーザー指定の "biguanide_metformin" をクラス識別タグとして採用し、
  #   各ブランドの genericKey と対にして2件で統一する（DPP4 と同型）。
  brandCatalog:
    メトグルコ:
      displayName: "メトグルコ"
      genericName: "メトホルミン塩酸塩"
      displayGenericName: "メトホルミン塩酸塩"
      genericKey: "metformin_mt"
      handlingTags:
        - "metformin_high_dose"
        - "renal_dose_adjustment"
      aliases:
        - "めとぐるこ"
      normalizedAliases:
        - "めとぐるこ"

    メトホルミン:
      displayName: "メトホルミン"
      genericName: "メトホルミン塩酸塩"
      displayGenericName: "メトホルミン塩酸塩"
      genericKey: "metformin_mt_generic"
      handlingTags:
        - "metformin_high_dose"
        - "renal_dose_adjustment"
      aliases:
        - "めとほるみん"
        - "めとほるみんえんさんえん"
      normalizedAliases:
        - "めとほるみん"
        - "めとほるみんえんさんえん"

    グリコラン:
      displayName: "グリコラン"
      genericName: "メトホルミン塩酸塩"
      displayGenericName: "メトホルミン塩酸塩"
      genericKey: "metformin_legacy"
      handlingTags:
        - "metformin_legacy_low_dose"
        - "renal_dose_adjustment"
      aliases:
        - "ぐりこらん"
      normalizedAliases:
        - "ぐりこらん"

  aliasToBrand:
    "めとぐるこ": "メトグルコ"
    "めとほるみん": "メトホルミン"
    "ぐりこらん": "グリコラン"
    "めとほるみんえんさんえん": "メトホルミン"
  # aliasToBrand は brandCatalog[brand].normalizedAliases を過不足なく網羅する
  # （RULES.md §10）。4件・4件で一致（2026-07: メトホルミンへ塩名読み追加に伴い増加）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags: 確定（2026-07-05）
  # ─────────────────────────────────────────
  # 各 brand: ["biguanide_metformin", {genericKeyと同一の成分タグ}] の2件で統一。
  # handlingTags（scenario availability制御用）とは役割を分離する
  # （VALIDATOR_STANDARD.md: brandToTags＝成分識別タグ、handlingTags＝製品取り扱いタグ）。

drugResolution:
  brandToTags:
    メトグルコ:
      - "biguanide_metformin"
      - "metformin_mt"
    メトホルミン:
      - "biguanide_metformin"
      - "metformin_mt_generic"
    グリコラン:
      - "biguanide_metformin"
      - "metformin_legacy"

composition:
  classKey: "biguanide"
  nodeKey: "biguanide_oral"
  priority: "chronic"

display:
  nodeKey: "biguanide_oral"
  nodeLabelShort: "BG"
  nodeLabelLong: "ビグアナイド系糖尿病薬（内服）"

# =========================================
# scenario availability 設計（確定・2026-07-05）
# =========================================
#
# 全ブランド共通で表示するシナリオ（scenarioRequiredTagsなし。増減量シナリオを含む）:
#   - initial / restart / external_start
#   - dose_increase_low_perceived_effect
#   - dose_increase_no_lab_improvement
#   - dose_increase_due_to_other_med_adjustment
#   - dose_decrease_improved
#   - dose_decrease_low_perceived_effect
#   - dose_decrease_due_to_other_med_adjustment
#   - dose_decrease_renal_function
#   - side_effect系（全種。乳酸アシドーシスなし確認を含む）
#   - adherence系（全種）
#   - treatment_end系（全種）
#   - lifestyle_guidance系（全種）
#   - sickday
#
# 理由（ユーザー確定）: グリコランも通常500mgから開始し最大750mgまで増量可能であり、
# 本モジュールのSOAPシナリオは具体的なmg数を扱わないため、増量・減量シナリオは
# 全ブランド共通としてよい。metformin_legacy_low_dose 専用シナリオは作成しない。
#
# handlingTags（metformin_high_dose / metformin_legacy_low_dose / renal_dose_adjustment）は
# ブランド系統の区分ラベルとして brandCatalog に保持するが、scenarioRequiredTags には
# 使用しない（本モジュールでは全シナリオがタグなしで全ブランド共通表示となる）。
#
# 乳酸アシドーシス（本剤の代表的な重大リスク）の表現方針
# （ユーザー指定・2026-07-12 更新。旧方針「初回シナリオの ADDON としては配置しない」は
# 本更新により置き換え、以後は以下を正本とする）:
#   - initial / restart / external_start の P で、食事や水分が十分に摂れない
#     体調不良時の休薬・相談を案内する
#   - addon_metformin_initial_sickday_guidance で、脱水による乳酸アシドーシスリスク、
#     休薬、水分摂取、受診目安、再開時期の相談を案内する
#   - se_lactic_acidosis_none で、乳酸アシドーシスを疑う症状がないことを評価し、
#     疑わしい症状または水分摂取不能時の直ちの休薬・受診を案内する
#   - sickday で、脱水および乳酸アシドーシスリスク、休薬、受診判断、再開相談を案内する
#
# =========================================
# addon 設計（現時点の設計意図。本文は SCENARIOS 作成時に記載）
# =========================================
#
# 選択候補として想定する addon（ユーザー指定 addonPolicy.selectableAddons より）:
#   - addon_metformin_initial_sickday_guidance（旧 addon_initial_sickday_guidance を
#     2026-07-12 にメトホルミン専用IDへ変更。詳細は確定済み事項参照）
#   - addon_glycemic_guidance_initial
#   - addon_se_hypoglycemia_guidance（薬剤師判断で必要時選択・ユーザー指定）
#   - addon_hyperkalemia_guidance
#   - addon_glycemic_guidance_followup
#   - addon_hypertension_guidance
#   - addon_dyslipidemia_guidance
#   - addon_hyperuricemia_guidance
#
# 上記は DPP4 / GLP1 内服モジュールで既に確立している addon id 命名と同一だが、
# 本文（P_APPEND 等）は本モジュール独自に bridge へ記載する（モジュール間の
# JSON 参照共有は行わない。RULES.md §1 STANDARD_REFERENCE_PATHS 参照）。
#
# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / categoryPath / drug.route / dosageForms → ユーザー指定どおり確定
# 2. brandCatalog 3ブランド・genericKey 3分離設計 → ユーザー指定どおり確定
#    （高用量系統2ブランド + 旧来低用量系統1ブランド。理由は brandCatalog コメント参照）
# 3. brandCatalog.aliases / aliasToBrand（ブランド名読み3件）→ kataToHira機械変換で確定
# 4. drugResolution.brandToTags → ユーザー指定タグ（biguanide_metformin / 各genericKey）を
#    DPP4と同型の2件構成で確定
# 5. handlingTags → ユーザー指定タグ（metformin_high_dose / metformin_legacy_low_dose /
#    renal_dose_adjustment）を意味に応じて brandToTags と分離し確定
# 6. composition.classKey（"biguanide"）/ nodeKey（"biguanide_oral"）/ priority（"chronic"）
#    → DPP4 と同型の命名規則で確定
# 7. 乳酸アシドーシスの表現方針 → 2026-07-12 更新。旧方針（初回P・シックデイで表現、
#    初回ADDONには置かない）を、初回ADDON（addon_metformin_initial_sickday_guidance）
#    でも乳酸アシドーシスリスクを明示する新方針へ置き換えて確定（詳細は上記
#    scenario availability 設計の「乳酸アシドーシスの表現方針」参照。本項目は旧方針の
#    記録ではなく現行方針の確定記録として更新済み）。
# 8. 成分名「メトホルミン塩酸塩」の読み仮名（めとほるみんえんさんえん）の扱い →
#    brandCatalog[brand].aliases / normalizedAliases / aliasToBrand へは複製せず、
#    drug.search.prefixAliases / drug.search.nameAliases / drug.nameAliases の
#    module 単位のみに追加する（DPP4と同型）。理由: ブランド「メトホルミン」自体が
#    存在するため、成分名読みを複数ブランドへ複製すると aliasToBrand の解決先が
#    曖昧になる（ユーザー確定・2026-07-05）。
# 9. グリコランの増量・減量シナリオの扱い → 全ブランド共通（scenarioRequiredTagsなし）
#    として確定。理由: グリコランも通常500mgから開始し最大750mgまで増量可能であり、
#    本モジュールのSOAPシナリオは具体的なmg数を扱わないため。metformin_legacy_low_dose
#    専用シナリオは作成しない（ユーザー確定・2026-07-05）。
# 10. シナリオ本文・ADDON本文 → ユーザー提供のシナリオ本文をそのまま
#     SCENARIOS_START〜SCENARIOS_END として追加済み（2026-07-05）。全29シナリオ。
# 11. addon_hyperkalemia_guidance の重複定義解消 → ユーザー提供文では initial 後・
#     se_hypo_none 後の2箇所に同一ADDON定義が重複記載されていた（PN7 addon id重複で
#     停止する要因のため）。initial 後の定義を正本として残し、se_hypo_none 後の
#     重複ブロックを削除した。P_ADDON 参照・addon本文・S/O/A/P本文は変更していない
#     （ユーザー確定・2026-07-05）。ADDON定義は全15件、ユニーク。
# 12. SCENARIOS本文の全面更新 → 2026-07-12、ユーザー提示の最新版
#     SCENARIOS_START〜SCENARIOS_END へ完全置換した（29シナリオ・15addon、件数は
#     旧版から変更なし）。主な変更点:
#     - 初回シックデイADDON IDを addon_initial_sickday_guidance から
#       addon_metformin_initial_sickday_guidance へ変更（メトホルミン専用命名。
#       他のADDON IDは変更なし）
#     - initial / restart / external_start の P: 体調不良時の案内を
#       「ご相談ください」中心の表現から「いったん休薬し、処方医へご相談ください」
#       （休薬指導を明示）へ更新
#     - addon_metformin_initial_sickday_guidance: 想定リスクを「脱水や低血糖」から
#       「脱水による乳酸アシドーシス」へ明確化し、休薬指導・医師から水分制限を
#       指示されている場合への配慮（「指示されていない場合は」の条件分岐）・
#       受診目安症状の拡充・再開時期相談の案内を追加
#     - se_mild_continue / se_moderate_consider_dr（軽症・中等度消化器症状）:
#       水分摂取指導を「十分に摂取」から「少量ずつこまめに摂取」へ変更し、
#       症状が続き食事や水分が摂れない場合の休薬指導を明示
#     - se_lactic_acidosis_none（乳酸アシドーシスなし）: A の評価表現を
#       「乳酸アシドーシスは認められず」から「乳酸アシドーシスを疑う症状は
#       認められず」へ精緻化し、P の受診案内を「自己判断せず処方医へご相談」から
#       「直ちに休薬して医療機関を受診」へ強化
#     - sickday: A/P を全面更新。脱水・乳酸アシドーシスリスクの明示、休薬指導、
#       医師から水分制限を指示されている場合への配慮、受診目安症状の拡充、
#       再開時期相談の案内を追加（血糖測定の案内文は本更新で削除）
#     - 乳酸アシドーシスの表現方針変更に伴う詳細は上記「乳酸アシドーシスの表現方針」
#       および本項目7を参照
#     更新に伴い STATUS を FROZEN_FOR_PN1 から DRAFT へ差し戻した。再凍結および
#     PN1 開始は本更新の時点では未実施（ユーザーの再確認・再凍結宣言待ち）。
#     header設計（moduleId / categoryPath / drug / search / nameAliases /
#     brandCatalog / aliasToBrand / drugResolution / composition / display /
#     scenario availability のブランド制御方針・handlingTags方針・
#     scenarioRequiredTagsを使用しない方針）は変更していない。
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# 本文内容上のPENDINGはなし。
# ただし、今回のSCENARIOS更新後のユーザー再確認・再凍結待ち。
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - 配合剤・GE追加: DP-09 / RULES.md §21 の既存方針に従って対応する

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=ビグアナイド系糖尿病薬 初回】
S
ビグアナイド系糖尿病薬は、血糖値が高いため追加となった。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬は、血糖コントロール不十分のため追加となった。
肝臓での糖新生抑制や末梢組織での糖利用促進などにより、血糖改善を目的として服用する。
P
ビグアナイド系糖尿病薬は、血糖値を改善する薬です。
服用中は、下痢や吐き気など、お腹の調子が悪くなることがあります。
食事や水分が十分に摂れない体調不良時は、いったん休薬し、処方医へご相談ください。
P_ADDON
- addon_metformin_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=sickday_guidance｜id=addon_metformin_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水により乳酸アシドーシスのリスクが高まります。
このような体調不良時はビグアナイド系糖尿病薬を休薬してください。
医師から水分制限を指示されていない場合は、水分を少量ずつこまめに摂取してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感、吐き気、腹痛、息苦しさなどがある場合は受診してください。
服用の再開時期については、自己判断せず処方医へご相談ください。


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






【SCENARIO｜type=treatment_start｜id=restart｜title=ビグアナイド系糖尿病薬 再開】
S
ビグアナイド系糖尿病薬は、血糖値が高いため再開となった。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬は、血糖コントロール不十分のため再開となった。
肝臓での糖新生抑制や末梢組織での糖利用促進などにより、血糖改善を目的として服用する。
P
ビグアナイド系糖尿病薬は、血糖値を改善する薬です。
服用中は、下痢や吐き気など、お腹の調子が悪くなることがあります。
食事や水分が十分に摂れない体調不良時は、いったん休薬し、処方医へご相談ください。
P_ADDON
- addon_metformin_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=ビグアナイド系糖尿病薬 他所開始】
S
ビグアナイド系糖尿病薬は、他院で開始され継続使用中であった。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬は、血糖コントロール改善を目的として使用中であった。
肝臓での糖新生抑制や末梢組織での糖利用促進などにより、血糖改善を目的として服用する。
P
ビグアナイド系糖尿病薬は、血糖値を改善する薬です。
服用中は、下痢や吐き気など、お腹の調子が悪くなることがあります。
食事や水分が十分に摂れない体調不良時は、いったん休薬し、処方医へご相談ください。
P_ADDON
- addon_metformin_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=ビグアナイド系糖尿病薬 増量（効果実感乏しい）】
S
ビグアナイド系糖尿病薬は、効果の実感が乏しいため増量となった。
O
ビグアナイド系糖尿病薬　増量
A
ビグアナイド系糖尿病薬は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
ビグアナイド系糖尿病薬は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=ビグアナイド系糖尿病薬 増量（検査値改善なし）】
S
ビグアナイド系糖尿病薬は、検査値が改善しないため増量となった。
O
ビグアナイド系糖尿病薬　増量
A
ビグアナイド系糖尿病薬は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
ビグアナイド系糖尿病薬は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=ビグアナイド系糖尿病薬 増量（他剤との調整）】
S
ビグアナイド系糖尿病薬は、他剤変更に伴う調整により増量となった。
O
ビグアナイド系糖尿病薬　増量
A
ビグアナイド系糖尿病薬は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
ビグアナイド系糖尿病薬は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_renal_function｜title=ビグアナイド系糖尿病薬 減量（腎機能低下）】
S
ビグアナイド系糖尿病薬は、腎機能を考慮して減量となった。
O
ビグアナイド系糖尿病薬　減量
A
ビグアナイド系糖尿病薬は、腎機能低下に伴い用量調整となった。減量後の血糖推移に注意が必要である。
P
ビグアナイド系糖尿病薬は、腎機能に応じて用量調整が必要になることがあります。
減量後は血糖値が変動する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、血糖推移および体調変化の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=ビグアナイド系糖尿病薬 減量（検査値改善）】
S
ビグアナイド系糖尿病薬は、検査値が改善したため減量となった。
O
ビグアナイド系糖尿病薬　減量
A
ビグアナイド系糖尿病薬は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
ビグアナイド系糖尿病薬は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=ビグアナイド系糖尿病薬 減量（効果実感乏しい）】
S
ビグアナイド系糖尿病薬は、効果の実感が乏しいため減量を希望された。
O
ビグアナイド系糖尿病薬　減量
A
ビグアナイド系糖尿病薬は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
ビグアナイド系糖尿病薬は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=ビグアナイド系糖尿病薬 減量（他剤との調整）】
S
ビグアナイド系糖尿病薬は、他剤変更に伴う調整のため減量となった。
O
ビグアナイド系糖尿病薬　減量
A
ビグアナイド系糖尿病薬は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
ビグアナイド系糖尿病薬は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=ビグアナイド系糖尿病薬 副作用なし（低血糖）】
S
ビグアナイド系糖尿病薬を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬による低血糖は現時点で認められず、治療継続が可能である。
P
ビグアナイド系糖尿病薬の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
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






【SCENARIO｜type=side_effect｜id=se_diarrhea_abdominal_pain_none｜title=ビグアナイド系糖尿病薬 副作用なし（下痢・腹痛）】
S
ビグアナイド系糖尿病薬を服用して症状は落ち着いている。
下痢や腹痛は認めない。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬による消化器症状は現時点で認められず、治療継続が可能である。
P
ビグアナイド系糖尿病薬の継続中に、お腹の調子が悪くなることがあります。
下痢や腹痛が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_appetite_loss_none｜title=ビグアナイド系糖尿病薬 副作用なし（食欲不振）】
S
ビグアナイド系糖尿病薬を服用して症状は落ち着いている。
食欲不振は認めない。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬による消化器症状は現時点で認められず、治療継続が可能である。
P
ビグアナイド系糖尿病薬の継続中に、お腹の調子が悪くなることがあります。
食欲不振が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_lactic_acidosis_none｜title=ビグアナイド系糖尿病薬 副作用なし（乳酸アシドーシス）】
S
ビグアナイド系糖尿病薬を服用して症状は落ち着いている。
強いだるさ、吐き気、腹痛、息苦しさなどの症状は認めない。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬による乳酸アシドーシスを疑う症状は現時点で認められず、治療継続が可能である。
P
ビグアナイド系糖尿病薬の継続中に、強いだるさ、吐き気、腹痛、息苦しさなどが出ることがあります。
脱水や体調不良時には、重い副作用が起こりやすくなることがあります。
このような症状がある場合や、水分が摂れない場合は、直ちに休薬して医療機関を受診してください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=ビグアナイド系糖尿病薬 CP良好】
S
薬を服用して症状は落ち着いている。
飲み忘れなく服用している。
O
ビグアナイド系糖尿病薬　服用中
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






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=ビグアナイド系糖尿病薬 CP不良（服薬忘れ）】
S
飲み忘れることがある。
症状は大きく変わっていない。
O
ビグアナイド系糖尿病薬　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することで、十分な治療効果が期待されます。
服薬忘れが続くと、期待される治療効果が十分に得られない可能性があります。
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






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=ビグアナイド系糖尿病薬 CP不良（自己判断）】
S
自己判断で服用を調整することがある。
症状は大きく変わっていない。
O
ビグアナイド系糖尿病薬　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=ビグアナイド系糖尿病薬 CP不良（受診遅延）】
S
受診が遅れ、服用を調整することがある。
症状は大きく変わっていない。
O
ビグアナイド系糖尿病薬　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=ビグアナイド系糖尿病薬 終了（改善）】
S
ビグアナイド系糖尿病薬は、血糖コントロールが改善したため中止となった。
O
ビグアナイド系糖尿病薬　処方終了
A
ビグアナイド系糖尿病薬は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
ビグアナイド系糖尿病薬終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=ビグアナイド系糖尿病薬 終了（効果不十分）】
S
ビグアナイド系糖尿病薬は、効果不十分のため中止となった。
O
ビグアナイド系糖尿病薬　処方終了
A
ビグアナイド系糖尿病薬は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
ビグアナイド系糖尿病薬終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=ビグアナイド系糖尿病薬 終了（無効）】
S
ビグアナイド系糖尿病薬は、効果が認められなかったため中止となった。
O
ビグアナイド系糖尿病薬　処方終了
A
ビグアナイド系糖尿病薬は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
ビグアナイド系糖尿病薬終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=ビグアナイド系糖尿病薬 SE継続（軽症 消化器症状）】
S
ビグアナイド系糖尿病薬の服用によりお腹の調子が悪いが、日常生活は送れている。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬による消化器症状を軽度認めるが、治療継続が可能である。
P
ビグアナイド系糖尿病薬によるお腹の不調が軽い場合は、水分を少量ずつこまめに摂取し、無理のない範囲で食事内容を見直して様子をみてください。
お腹の不調が強い、または続く場合は、薬の調整が必要になることがあります。
下痢や吐き気が続き、食事や水分が十分に摂れない場合は、休薬してご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_moderate_consider_dr｜title=ビグアナイド系糖尿病薬 SE継続（中等度 消化器症状）】
S
ビグアナイド系糖尿病薬の服用により下痢が強く、辛いことがあるが、日常生活は送れている。
O
ビグアナイド系糖尿病薬　処方
A
ビグアナイド系糖尿病薬による消化器症状が強く、継続困難の可能性があるため対応を要する。
P
ビグアナイド系糖尿病薬による下痢が強い場合は、水分を少量ずつこまめに摂取してください。
下痢が強く続く場合は、薬の調整や変更が必要になることがあります。
食事や水分が十分に摂れない場合は、休薬して処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_gi_symptoms｜title=ビグアナイド系糖尿病薬 SE変更（消化器症状）】
S
ビグアナイド系糖尿病薬の服用により下痢が出現したため、他剤へ変更となった。
O
ビグアナイド系糖尿病薬　処方変更
A
ビグアナイド系糖尿病薬の服用による消化器症状を認め、他剤変更後の経過確認を要する。
P
ビグアナイド系糖尿病薬の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_gi_symptoms｜title=ビグアナイド系糖尿病薬 SE減量（消化器症状）】
S
ビグアナイド系糖尿病薬の服用により下痢がひどいため、減量となった。
O
ビグアナイド系糖尿病薬　減量
A
ビグアナイド系糖尿病薬の服用による消化器症状を認め、減量後の経過確認を要する。
P
ビグアナイド系糖尿病薬の減量後も消化器症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_gi_symptoms｜title=ビグアナイド系糖尿病薬 SE中止（消化器症状）】
S
ビグアナイド系糖尿病薬の服用により下痢がひどいため、中止となった。
O
ビグアナイド系糖尿病薬　処方中止
A
ビグアナイド系糖尿病薬の服用による消化器症状を認め、中止後の経過確認を要する。
P
ビグアナイド系糖尿病薬の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=ビグアナイド系糖尿病薬 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
ビグアナイド系糖尿病薬　処方
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






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=ビグアナイド系糖尿病薬 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
ビグアナイド系糖尿病薬　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=sickday｜id=sickday｜title=ビグアナイド系糖尿病薬 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
ビグアナイド系糖尿病薬　服用中
A
食事および水分摂取の低下により脱水および乳酸アシドーシスのリスクが上昇している。シックデイ時の休薬および受診判断が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、ビグアナイド系糖尿病薬を休薬してください。
医師から水分制限を指示されていない場合は、脱水を防ぐため、水分を少量ずつこまめに摂取してください。
強い倦怠感、吐き気、腹痛、息苦しさなどがある場合は、乳酸アシドーシスの可能性があります。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感、吐き気、腹痛、息苦しさなどがある場合は受診してください。
服用の再開時期については、自己判断せず処方医へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======
