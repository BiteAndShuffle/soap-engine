# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_imeglimin_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ確定済み。
# SCENARIOS_START〜SCENARIOS_END は未作成（本ファイルには含まれない）。
#
# 目的: イメグリミン系経口血糖降下剤（ツイミーグ）の brandCatalog / alias /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-08 ヘッダー作成）。
#
# 次の作業: シナリオ本文・ADDON本文の追加（SCENARIOS_START〜SCENARIOS_END）。
# 本文確定・ユーザー凍結宣言後に STATUS を DRAFT → FROZEN_FOR_PN1 へ遷移させ、
# PN1 を開始する（prompts/vNext/HANDOFF.md「bridge 作成から開始する」手順に従う）。
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
      displayGenericName: "イメグリミン塩酸塩"
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
# SCENARIOS_START〜SCENARIOS_END: 未作成（STATUS: HEADER_ONLY）
# =========================================
