# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_biguanide_metformin_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみを、ユーザー提供の
# 叩き台（dm_biguanide_metformin_oral.md ヘッダー案）をもとに vNext / DPP4 基準へ
# 整形したものです。SCENARIOS_START〜SCENARIOS_END は未作成です。
# PN1 を実行してはいけません（prompts/RULES.md §24 Bridge Status State Machine 参照）。
#
# 目的: ビグアナイド系糖尿病薬（メトホルミン塩酸塩）の brandCatalog / handlingTags /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-05 作成）。
#
# 次の作業: シナリオ本文の追加（bridge の SCENARIOS_START〜SCENARIOS_END）→
# ユーザー確認・凍結宣言（STATUS: FROZEN_FOR_PN1）→ PN1 開始
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
  # prefixAliases/nameAliases にのみ追加し、brandCatalog[brand].aliases への複製は
  # 行わない（DPP4 と同型。理由: 「メトホルミン」というブランド名自体が存在するため、
  # 成分名読みを複数ブランドへ複製すると aliasToBrand の解決先ブランドが曖昧になる。
  # ユーザー確定・2026-07-05）。
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
      normalizedAliases:
        - "めとほるみん"

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
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。3件・3件で一致。

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
# 乳酸アシドーシス（本剤の代表的な重大リスク）の表現方針（ユーザー指定・確定）:
#   - 初回シナリオの P、およびシックデイシナリオで表現する
#   - 初回シナリオの ADDON としては配置しない
#
# =========================================
# addon 設計（現時点の設計意図。本文は SCENARIOS 作成時に記載）
# =========================================
#
# 選択候補として想定する addon（ユーザー指定 addonPolicy.selectableAddons より）:
#   - addon_initial_sickday_guidance
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
# 7. 乳酸アシドーシスの表現方針（初回P・シックデイで表現、初回ADDONには置かない）
#    → ユーザー指定どおり確定
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
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# 1. 【PENDING】シナリオ本文・ADDON本文は未作成。次回作業でユーザー指導文をもとに
#    SCENARIOS_START〜SCENARIOS_END を追加する。
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - 配合剤・GE追加: DP-09 / RULES.md §21 の既存方針に従って対応する
