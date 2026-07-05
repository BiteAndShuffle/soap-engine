# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_thiazolidinedione_pioglitazone_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成。
# 本ファイルは PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: チアゾリジン系糖尿病薬（ピオグリタゾン）の brandCatalog / alias /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-05 作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の作成 → ユーザー確認・凍結宣言
# （STATUS: HEADER_ONLY → DRAFT → FROZEN_FOR_PN1）→ PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
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
# SCENARIOS_START〜SCENARIOS_END は未作成（STATUS: HEADER_ONLY）
# =========================================
