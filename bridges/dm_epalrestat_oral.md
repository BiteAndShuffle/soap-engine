# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_epalrestat_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ確定済み。
# SCENARIOS_START〜SCENARIOS_END は未作成（本ファイルには含まれない）。
#
# 目的: アルドース還元酵素阻害薬（キネダック）の brandCatalog / alias /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-09 ヘッダー作成）。
#
# 次の作業: シナリオ本文・ADDON本文の追加（SCENARIOS_START〜SCENARIOS_END）。
# 本文確定・ユーザー凍結宣言後に STATUS を DRAFT → FROZEN_FOR_PN1 へ遷移させ、
# PN1 を開始する（prompts/vNext/HANDOFF.md「bridge 作成から開始する」手順に従う）。
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
# SCENARIOS_START〜SCENARIOS_END: 未作成（STATUS: HEADER_ONLY）
# =========================================
