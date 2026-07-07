# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_alpha_glucosidase_inhibitor_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成。
# 本ファイルはまだ PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: α-グルコシダーゼ阻害薬（セイブル／ベイスン／グルコバイ）の
# brandCatalog / alias / drugResolution.brandToTags 設計を、会話ログではなく
# リポジトリ上に固定するための作業ファイルです（2026-07-07 ヘッダー作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の追加（STATUS: HEADER_ONLY → DRAFT）。
# その後ユーザー確認・凍結宣言（DRAFT → FROZEN_FOR_PN1）を経て PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_glinide_oral.md（単剤・複数ブランド構成の直近実績。各ブランドが
#     異なる成分を持つ場合の brandCatalog / genericKey 個別付与の直接参考）
#   - bridges/dm_sulfonylurea_oral.md（単剤・複数ブランド構成の直近実績。同上）
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の直近実績。genericKey
#     個別付与・成分名読みを module 単位 nameAliases のみに留める設計の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_alpha_glucosidase_inhibitor_oral"

categoryPath:
  - "糖尿病"
  - "α-グルコシダーゼ阻害薬"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_dpp4_oral / dm_glinide_oral と同型。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "α-グルコシダーゼ阻害薬"

  brandNames:
    - "セイブル"
    - "ベイスン"
    - "グルコバイ"

  drugClass:
    - "ALPHA_GLUCOSIDASE_INHIBITOR"

  route: "oral"

  dosageForms:
    - "tablet"
  # tablet で確定。OD錠等の詳細剤形は今回のヘッダーでは扱わない
  # （dm_dpp4_oral と同様、将来必要になった時点で別途拡張する）。

  drugSpecificTags:
    - "alpha_glucosidase_inhibitor_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-07）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  # 成分名読み（ミグリトール／ボグリボース／アカルボース）も同様に
  # kataToHira による機械的変換のみ（推測なし）。
  #
  # 成分名読みの扱い（dm_dpp4_oral / dm_glinide_oral と同型の判断）:
  #   各ブランドの displayGenericName が resolveAllHighPrecisionBrands で
  #   解決されるため、成分名読みを brandCatalog[brand].aliases へ複製する必要はない。
  #   成分名読みは module 単位の prefixAliases/nameAliases にのみ追加する。
  search:
    primaryDisplayName: "α-グルコシダーゼ阻害薬"

    exactAliases:
      - "セイブル"
      - "ベイスン"
      - "グルコバイ"

    prefixAliases:
      - "せいぶる"
      - "べいすん"
      - "ぐるこばい"
      - "みぐりとーる"
      - "ぼぐりぼーす"
      - "あかるぼーす"

    nameAliases:
      - "せいぶる"
      - "べいすん"
      - "ぐるこばい"
      - "みぐりとーる"
      - "ぼぐりぼーす"
      - "あかるぼーす"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "せいぶる"
    - "べいすん"
    - "ぐるこばい"
    - "みぐりとーる"
    - "ぼぐりぼーす"
    - "あかるぼーす"

  # ─────────────────────────────────────────
  # brandCatalog: 3 ブランド（それぞれ異なる成分の単剤）
  # ─────────────────────────────────────────
  # genericKey 命名規則: 成分名の英語スネークケース（PN2-Drug-Header.md 準拠、
  # dm_dpp4_oral / dm_sulfonylurea_oral の各ブランド固有genericKeyと同型）。
  brandCatalog:
    セイブル:
      displayName: "セイブル"
      genericName: "ミグリトール"
      displayGenericName: "ミグリトール"
      genericKey: "miglitol"
      handlingTags: []
      aliases:
        - "せいぶる"
      normalizedAliases:
        - "せいぶる"

    ベイスン:
      displayName: "ベイスン"
      genericName: "ボグリボース"
      displayGenericName: "ボグリボース"
      genericKey: "voglibose"
      handlingTags: []
      aliases:
        - "べいすん"
      normalizedAliases:
        - "べいすん"

    グルコバイ:
      displayName: "グルコバイ"
      genericName: "アカルボース"
      displayGenericName: "アカルボース"
      genericKey: "acarbose"
      handlingTags: []
      aliases:
        - "ぐるこばい"
      normalizedAliases:
        - "ぐるこばい"

  aliasToBrand:
    "せいぶる": "セイブル"
    "べいすん": "ベイスン"
    "ぐるこばい": "グルコバイ"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。3件・3件で一致。
  # 成分名読み（みぐりとーる／ぼぐりぼーす／あかるぼーす）は module 単位
  # nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（dm_dpp4_oral / dm_glinide_oral と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["alpha_glucosidase_inhibitor_oral", {genericKeyと同一の成分タグ}]
  # の2件で統一（dm_dpp4_oral / dm_glinide_oral と同型）。

drugResolution:
  brandToTags:
    セイブル:
      - "alpha_glucosidase_inhibitor_oral"
      - "miglitol"
    ベイスン:
      - "alpha_glucosidase_inhibitor_oral"
      - "voglibose"
    グルコバイ:
      - "alpha_glucosidase_inhibitor_oral"
      - "acarbose"

composition:
  classKey: "alpha_glucosidase_inhibitor"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "alpha_glucosidase_inhibitor_oral"
  priority: "chronic"

display:
  nodeKey: "alpha_glucosidase_inhibitor_oral"
  nodeLabelShort: "α-GI"
  nodeLabelLong: "α-グルコシダーゼ阻害薬（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（セイブル・ベイスン・グルコバイ） → ユーザー指定どおり確定
# 2. categoryPath「内服」taxonomy → dm_dpp4_oral / dm_glinide_oral の
#    既存単剤モジュールと同型で確定
# 3. drugClass 単一結合定数「ALPHA_GLUCOSIDASE_INHIBITOR」 → GLINIDE / SULFONYLUREA と
#    同型の命名規則で確定
# 4. brandCatalog 3ブランド・各ブランド固有genericKey構成（miglitol／voglibose／
#    acarbose、成分重複なし） → dm_dpp4_oral / dm_sulfonylurea_oral の
#    各ブランド固有genericKey構成と同型で確定
#    （ユーザー確認済み・2026-07-07: brandCatalog.genericKeyは成分別に設定する）
# 5. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ） → dm_dpp4_oral / dm_glinide_oral と同型の理由
#    （displayGenericName が resolveAllHighPrecisionBrands で解決されるため、
#    単剤ブランドの成分名読みを brandCatalog.aliases へ複製する必要がない）で確定
# 6. drugResolution.brandToTags → dm_dpp4_oral / dm_glinide_oral と同型の
#    2件構成（["alpha_glucosidase_inhibitor_oral", {genericKey}]）で確定
# 7. composition.classKey（"alpha_glucosidase_inhibitor"）/ nodeKey
#    （"alpha_glucosidase_inhibitor_oral"）/ priority（"chronic"） →
#    既存命名規則で確定
# 8. handlingTags → 3ブランドとも空配列で確定。ブランド間の用法・重篤度差分
#    （例: 各成分の消化器症状発現頻度の違い）に基づく scenarioRequiredTags 制御が
#    必要かどうかは、SCENARIOS作成時に臨床的な差分の有無を確認したうえで判断する
#    （今回のヘッダー段階では判断しない。dm_dpp4_oral と同型の先送り）
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
# - GEブランドの追加: 現時点ではユーザー指定の3ブランドのみを扱う

# =========================================
# SCENARIOS_START〜SCENARIOS_END（未作成・STATUS: HEADER_ONLY）
# =========================================
