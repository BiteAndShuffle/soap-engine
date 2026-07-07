# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_glinide_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成。
# 本ファイルはまだ PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: グリニド系経口血糖降下剤（スターシス／ファスティック／グルファスト／
# シュアポスト）の brandCatalog / alias / drugResolution.brandToTags 設計を、
# 会話ログではなくリポジトリ上に固定するための作業ファイルです
# （2026-07-07 ヘッダー作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の追加（STATUS: HEADER_ONLY → DRAFT）。
# その後ユーザー確認・凍結宣言（DRAFT → FROZEN_FOR_PN1）を経て PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の直近実績。各ブランドが
#     異なる成分を持つ場合の brandCatalog / genericKey 個別付与、同一成分ブランド間
#     genericKey共有（ジャヌビア／グラクティブ＝シタグリプチン）の直接参考）
#   - bridges/dm_sulfonylurea_oral.md（単剤・複数ブランド構成・直近実績。各ブランドが
#     異なる成分を持つ場合の genericKey個別付与・成分名読みを module 単位 nameAliases
#     のみに留める設計の直接参考）
#   - bridges/dm_biguanide_metformin_oral.md（単剤・直近実績。alias/brandCatalog
#     設計の基本形）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離・同一成分ブランドの
#     genericKey共有）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_glinide_oral"

categoryPath:
  - "糖尿病"
  - "グリニド系経口血糖降下剤"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_dpp4_oral / dm_sulfonylurea_oral と同型。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "グリニド系経口血糖降下剤"

  brandNames:
    - "スターシス"
    - "ファスティック"
    - "グルファスト"
    - "シュアポスト"

  drugClass:
    - "GLINIDE"

  route: "oral"

  dosageForms:
    - "tablet"
  # tablet で確定。OD錠等の詳細剤形は今回のヘッダーでは扱わない
  # （dm_dpp4_oral と同様、将来必要になった時点で別途拡張する）。

  drugSpecificTags:
    - "glinide_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-07）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  # 成分名読み（ナテグリニド／ミチグリニド／レパグリニド）も同様に
  # kataToHira による機械的変換のみ（推測なし）。
  #
  # 成分名読みの扱い（dm_dpp4_oral / dm_sulfonylurea_oral と同型の判断）:
  #   各ブランドの displayGenericName が resolveAllHighPrecisionBrands で
  #   解決されるため、成分名読みを brandCatalog[brand].aliases へ複製する必要はない。
  #   成分名読みは module 単位の prefixAliases/nameAliases にのみ追加する。
  search:
    primaryDisplayName: "グリニド系経口血糖降下剤"

    exactAliases:
      - "スターシス"
      - "ファスティック"
      - "グルファスト"
      - "シュアポスト"

    prefixAliases:
      - "すたーしす"
      - "ふぁすてぃっく"
      - "ぐるふぁすと"
      - "しゅあぽすと"
      - "なてぐりにど"
      - "みちぐりにど"
      - "れぱぐりにど"

    nameAliases:
      - "すたーしす"
      - "ふぁすてぃっく"
      - "ぐるふぁすと"
      - "しゅあぽすと"
      - "なてぐりにど"
      - "みちぐりにど"
      - "れぱぐりにど"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "すたーしす"
    - "ふぁすてぃっく"
    - "ぐるふぁすと"
    - "しゅあぽすと"
    - "なてぐりにど"
    - "みちぐりにど"
    - "れぱぐりにど"

  # ─────────────────────────────────────────
  # brandCatalog: 4 ブランド（成分は3種。スターシス／ファスティックは
  # 同一成分＝ナテグリニドのため genericKey を共有する）
  # ─────────────────────────────────────────
  # genericKey 命名規則: 成分名の英語スネークケース（PN2-Drug-Header.md 準拠、
  # dm_dpp4_oral のジャヌビア／グラクティブ＝sitagliptin 共有と同型の判断）。
  brandCatalog:
    スターシス:
      displayName: "スターシス"
      genericName: "ナテグリニド"
      displayGenericName: "ナテグリニド"
      genericKey: "nateglinide"
      handlingTags: []
      aliases:
        - "すたーしす"
      normalizedAliases:
        - "すたーしす"

    ファスティック:
      displayName: "ファスティック"
      genericName: "ナテグリニド"
      displayGenericName: "ナテグリニド"
      genericKey: "nateglinide"
      # ↑ スターシスと同一 genericKey（同一成分＝ナテグリニド）
      handlingTags: []
      aliases:
        - "ふぁすてぃっく"
      normalizedAliases:
        - "ふぁすてぃっく"

    グルファスト:
      displayName: "グルファスト"
      genericName: "ミチグリニド"
      displayGenericName: "ミチグリニド"
      genericKey: "mitiglinide"
      handlingTags: []
      aliases:
        - "ぐるふぁすと"
      normalizedAliases:
        - "ぐるふぁすと"

    シュアポスト:
      displayName: "シュアポスト"
      genericName: "レパグリニド"
      displayGenericName: "レパグリニド"
      genericKey: "repaglinide"
      handlingTags: []
      aliases:
        - "しゅあぽすと"
      normalizedAliases:
        - "しゅあぽすと"

  aliasToBrand:
    "すたーしす": "スターシス"
    "ふぁすてぃっく": "ファスティック"
    "ぐるふぁすと": "グルファスト"
    "しゅあぽすと": "シュアポスト"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。4件・4件で一致。
  # 成分名読み（なてぐりにど／みちぐりにど／れぱぐりにど）は module 単位
  # nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（dm_dpp4_oral と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["glinide_oral", {genericKeyと同一の成分タグ}] の2件で統一
  # （dm_dpp4_oral と同型。スターシス／ファスティックは同一成分のため
  # nateglinide タグを共有する）。

drugResolution:
  brandToTags:
    スターシス:
      - "glinide_oral"
      - "nateglinide"
    ファスティック:
      - "glinide_oral"
      - "nateglinide"
    グルファスト:
      - "glinide_oral"
      - "mitiglinide"
    シュアポスト:
      - "glinide_oral"
      - "repaglinide"

composition:
  classKey: "glinide"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "glinide_oral"
  priority: "chronic"

display:
  nodeKey: "glinide_oral"
  nodeLabelShort: "グリニド"
  nodeLabelLong: "グリニド系経口血糖降下剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（スターシス・ファスティック・グルファスト・
#    シュアポスト） → ユーザー指定どおり確定
# 2. categoryPath「内服」taxonomy → dm_dpp4_oral / dm_sulfonylurea_oral の
#    既存単剤モジュールと同型で確定
# 3. drugClass 単一結合定数「GLINIDE」 → SULFONYLUREA / THIAZOLIDINEDIONE と
#    同型の命名規則で確定
# 4. brandCatalog 4ブランド・成分別genericKey構成（nateglinide ×2 ブランド共有／
#    mitiglinide／repaglinide） → dm_dpp4_oral のジャヌビア／グラクティブ
#    （同一成分＝シタグリプチンでgenericKey共有）と同型で確定
#    （ユーザー確認済み・2026-07-07: module/classKeyの"glinide"とは独立して、
#    brandCatalog.genericKeyは成分別に設定する）
# 5. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ） → dm_dpp4_oral と同型の理由
#    （displayGenericName が resolveAllHighPrecisionBrands で解決されるため、
#    単剤ブランドの成分名読みを brandCatalog.aliases へ複製する必要がない）で確定
# 6. drugResolution.brandToTags → dm_dpp4_oral と同型の2件構成
#    （["glinide_oral", {genericKey}]）で確定。スターシス／ファスティックは
#    同一成分のため nateglinide タグを共有する
# 7. composition.classKey（"glinide"）/ nodeKey（"glinide_oral"）/
#    priority（"chronic"） → 既存命名規則で確定
# 8. handlingTags → 4ブランドとも空配列で確定。ブランド間の用法・重篤度差分
#    （例: レパグリニドの用法がナテグリニド／ミチグリニドと異なる可能性）に基づく
#    scenarioRequiredTags 制御が必要かどうかは、SCENARIOS作成時に臨床的な差分の
#    有無を確認したうえで判断する（今回のヘッダー段階では判断しない。
#    dm_dpp4_oral と同型の先送り）
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
# - handlingTags（ブランド間の用法・重篤度差分等の制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定の4ブランドのみを扱う

# =========================================
# SCENARIOS_START〜SCENARIOS_END（未作成・STATUS: HEADER_ONLY）
# =========================================
