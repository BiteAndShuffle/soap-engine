# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_sulfonylurea_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成。
# 本ファイルはまだ PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: スルホニルウレア系経口血糖降下剤（アマリール／オイグルコン／グリミクロン）の
# brandCatalog / alias / drugResolution.brandToTags 設計を、会話ログではなく
# リポジトリ上に固定するための作業ファイルです（2026-07-07 ヘッダー作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の追加（STATUS: HEADER_ONLY → DRAFT）。
# その後ユーザー確認・凍結宣言（DRAFT → FROZEN_FOR_PN1）を経て PN1 開始
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
# SCENARIOS_START〜SCENARIOS_END（未作成・STATUS: HEADER_ONLY）
# =========================================
