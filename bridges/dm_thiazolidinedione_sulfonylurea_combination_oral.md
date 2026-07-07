# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_thiazolidinedione_sulfonylurea_combination_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成。
# 本ファイルはまだ PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: チアゾリジン系糖尿病薬・スルホニルウレア系経口血糖降下剤配合剤（ソニアス）の
# brandCatalog / alias / drugResolution.brandToTags 設計を、会話ログではなく
# リポジトリ上に固定するための作業ファイルです（2026-07-07 ヘッダー作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の追加（STATUS: HEADER_ONLY → DRAFT）。
# その後ユーザー確認・凍結宣言（DRAFT → FROZEN_FOR_PN1）を経て PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_thiazolidinedione_pioglitazone_oral.md（単剤TZD・直近実績。
#     ピオグリタゾン読み「ぴおぐりたぞん」/ピオグリタゾン塩酸塩読み
#     「ぴおぐりたぞんえんさんえん」の出典）
#   - bridges/dm_sulfonylurea_oral.md（単剤SU・直近実績。グリメピリド読み
#     「ぐりめぴりど」の出典。単剤ブランドの成分名読みを brandCatalog.aliases へ
#     複製しない判断の直接参考）
#   - bridges/dm_thiazolidinedione_biguanide_combination_oral.md（既存配合剤実績・
#     直近。配合剤専用genericKey命名・categoryPath「配合剤」taxonomy・単一ブランド
#     配合剤のbrandCatalog/aliasToBrand設計の直接参考）
#   - bridges/dm_dpp4_thiazolidinedione_combination_oral.md（既存配合剤実績。
#     drugResolution.brandToTags 2件構成の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離・配合剤専用キー）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_thiazolidinedione_sulfonylurea_combination_oral"

# categoryPath は dm_thiazolidinedione_biguanide_combination_oral.md /
# dm_dpp4_thiazolidinedione_combination_oral.md の配合剤taxonomyに倣う
# （異なる薬効クラス同士の固定用量配合剤 → 2階層目「配合剤」）
categoryPath:
  - "糖尿病"
  - "配合剤"
  - "チアゾリジン系糖尿病薬／スルホニルウレア系経口血糖降下剤配合剤"

drug:
  # genericName はクラス名（配合剤クラス表記）を採用。
  # 実際の成分名（2成分）は brandCatalog[brand].genericName 側に格納する
  # （既存配合剤3件と同型）
  genericName: "チアゾリジン系糖尿病薬／スルホニルウレア系経口血糖降下剤配合剤"

  brandNames:
    - "ソニアス"

  # drugClass は既存配合剤の単一結合定数パターンに倣う
  drugClass:
    - "THIAZOLIDINEDIONE_SULFONYLUREA_COMBINATION"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "thiazolidinedione_sulfonylurea_combination_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-07）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（既存TZD/SUモジュールにある読みのみを流用。新規推測なし）:
  #   - ぴおぐりたぞん（ピオグリタゾン）/ ぴおぐりたぞんえんさんえん
  #     （ピオグリタゾン塩酸塩）は dm_thiazolidinedione_pioglitazone_oral.drug.search.nameAliases
  #     に確立済みの読みを流用
  #   - ぐりめぴりど（グリメピリド）は dm_sulfonylurea_oral.drug.search.nameAliases
  #     から同様に流用
  #   - 上記3件はいずれも module 単位の prefixAliases/nameAliases にのみ追加し、
  #     brandCatalog[brand].aliases への複製は行わない（単一ブランドのため
  #     aliasToBrand の曖昧化リスクはないが、既存配合剤3件と同型の判断で統一する）
  search:
    primaryDisplayName: "チアゾリジン系糖尿病薬／スルホニルウレア系経口血糖降下剤配合剤"

    exactAliases:
      - "ソニアス"

    prefixAliases:
      - "そにあす"
      - "ぴおぐりたぞん"
      - "ぴおぐりたぞんえんさんえん"
      - "ぐりめぴりど"

    nameAliases:
      - "そにあす"
      - "ぴおぐりたぞん"
      - "ぴおぐりたぞんえんさんえん"
      - "ぐりめぴりど"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "そにあす"
    - "ぴおぐりたぞん"
    - "ぴおぐりたぞんえんさんえん"
    - "ぐりめぴりど"

  # ─────────────────────────────────────────
  # brandCatalog: 1 ブランド（ソニアスのみ、単一ブランドとして扱う）
  # ─────────────────────────────────────────
  # genericKey は既存配合剤3件の "{成分A}_{成分B}_combo" 命名規則に統一する。
  brandCatalog:
    ソニアス:
      displayName: "ソニアス"
      genericName: "ピオグリタゾン塩酸塩／グリメピリド"
      displayGenericName: "ピオグリタゾン塩酸塩／グリメピリド"
      genericKey: "pioglitazone_glimepiride_combo"
      handlingTags: []
      aliases:
        - "そにあす"
      normalizedAliases:
        - "そにあす"

  aliasToBrand:
    "そにあす": "ソニアス"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。1件・1件で一致。
  # 成分名読み（ぴおぐりたぞん／ぴおぐりたぞんえんさんえん／ぐりめぴりど）は
  # module 単位 nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（既存配合剤3件と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # ["thiazolidinedione_sulfonylurea_combination", {genericKeyと同一の成分タグ}] の
  # 2件で統一（既存配合剤3件と同型）。

drugResolution:
  brandToTags:
    ソニアス:
      - "thiazolidinedione_sulfonylurea_combination"
      - "pioglitazone_glimepiride_combo"

composition:
  classKey: "thiazolidinedione_sulfonylurea_combination"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "thiazolidinedione_sulfonylurea_combination_oral"
  priority: "chronic"

display:
  nodeKey: "thiazolidinedione_sulfonylurea_combination_oral"
  nodeLabelShort: "TZD/SU配合剤"
  nodeLabelLong: "チアゾリジン系糖尿病薬／スルホニルウレア系経口血糖降下剤配合剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（ソニアス、単一ブランド） → ユーザー指定どおり確定
# 2. categoryPath「配合剤」taxonomy → 既存配合剤3件の実績と同型で確定
# 3. drugClass 単一結合定数「THIAZOLIDINEDIONE_SULFONYLUREA_COMBINATION」 →
#    既存配合剤の命名規則と同型で確定
# 4. brandCatalog.genericName（「ピオグリタゾン塩酸塩／グリメピリド」）→
#    ユーザー指定成分（ピオグリタゾン塩酸塩・グリメピリド）どおり確定
# 5. genericKey（"pioglitazone_glimepiride_combo"）→ 既存配合剤3件の
#    "{成分A}_{成分B}_combo" 命名規則に統一して確定
# 6. 成分名読みの流用範囲（ぴおぐりたぞん／ぴおぐりたぞんえんさんえん／
#    ぐりめぴりど）→ 既存TZD/SUモジュールに確立済みの読みのみを流用して確定
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ 既存配合剤3件と同型の理由で確定
# 8. drugResolution.brandToTags → 既存配合剤3件と同型の
#    2件構成（["thiazolidinedione_sulfonylurea_combination", {genericKey}]）で確定
# 9. composition.classKey（"thiazolidinedione_sulfonylurea_combination"）/ nodeKey
#    （"thiazolidinedione_sulfonylurea_combination_oral"）/ priority（"chronic"）→
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
# - GEブランドの追加: 現時点ではユーザー指定のソニアス1ブランドのみを扱う

# =========================================
# SCENARIOS_START〜SCENARIOS_END（未作成・STATUS: HEADER_ONLY）
# =========================================
