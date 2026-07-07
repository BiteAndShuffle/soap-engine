# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_glinide_alpha_glucosidase_inhibitor_combination_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成。
# 本ファイルはまだ PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: グリニド系経口血糖降下剤・α-グルコシダーゼ阻害薬配合剤（グルベス）の
# brandCatalog / alias / drugResolution.brandToTags 設計を、会話ログではなく
# リポジトリ上に固定するための作業ファイルです（2026-07-07 ヘッダー作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の追加（STATUS: HEADER_ONLY → DRAFT）。
# その後ユーザー確認・凍結宣言（DRAFT → FROZEN_FOR_PN1）を経て PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_glinide_oral.md（単剤・直近実績。ミチグリニド読み
#     「みちぐりにど」の出典）
#   - bridges/dm_alpha_glucosidase_inhibitor_oral.md（単剤・直近実績。
#     ボグリボース読み「ぼぐりぼーす」の出典）
#   - bridges/dm_thiazolidinedione_sulfonylurea_combination_oral.md（既存配合剤
#     実績・直近。単一ブランド配合剤のbrandCatalog/aliasToBrand設計・
#     genericKey命名の直接参考）
#   - bridges/dm_thiazolidinedione_biguanide_combination_oral.md（既存配合剤実績。
#     categoryPath「配合剤」taxonomy・単一ブランド配合剤設計の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離・配合剤専用キー）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_glinide_alpha_glucosidase_inhibitor_combination_oral"

# categoryPath は dm_thiazolidinedione_sulfonylurea_combination_oral.md /
# dm_thiazolidinedione_biguanide_combination_oral.md の配合剤taxonomyに倣う
# （異なる薬効クラス同士の固定用量配合剤 → 2階層目「配合剤」）
categoryPath:
  - "糖尿病"
  - "配合剤"
  - "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤"

drug:
  # genericName はクラス名（配合剤クラス表記）を採用。
  # 実際の成分名（2成分）は brandCatalog[brand].genericName 側に格納する
  # （既存配合剤4件と同型）
  genericName: "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤"

  brandNames:
    - "グルベス"

  # drugClass は既存配合剤の単一結合定数パターンに倣う
  drugClass:
    - "GLINIDE_ALPHA_GLUCOSIDASE_INHIBITOR_COMBINATION"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "glinide_alpha_glucosidase_inhibitor_combination_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-07）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（既存グリニド/αGIモジュールにある読みのみを流用。新規推測なし）:
  #   - みちぐりにど（ミチグリニド）は dm_glinide_oral.drug.search.nameAliases に
  #     確立済みの読みを流用
  #   - みちぐりにどかるしうむすいわぶつ（ミチグリニドカルシウム水和物・塩形表記）は
  #     既存モジュールに確立済みの読みが存在しないため、kataToHira による機械的な
  #     ひらがな変換のみで新規追加する（推測なし。dm_thiazolidinedione_pioglitazone_oral の
  #     「ぴおぐりたぞん」「ぴおぐりたぞんえんさんえん」= 塩非表記/塩表記の2形式併記
  #     パターンと同型）
  #   - ぼぐりぼーす（ボグリボース）は dm_alpha_glucosidase_inhibitor_oral.drug.search.nameAliases
  #     から同様に流用
  #   - 上記3件はいずれも module 単位の prefixAliases/nameAliases にのみ追加し、
  #     brandCatalog[brand].aliases への複製は行わない（単一ブランドのため
  #     aliasToBrand の曖昧化リスクはないが、既存配合剤4件と同型の判断で統一する）
  search:
    primaryDisplayName: "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤"

    exactAliases:
      - "グルベス"

    prefixAliases:
      - "ぐるべす"
      - "みちぐりにど"
      - "みちぐりにどかるしうむすいわぶつ"
      - "ぼぐりぼーす"

    nameAliases:
      - "ぐるべす"
      - "みちぐりにど"
      - "みちぐりにどかるしうむすいわぶつ"
      - "ぼぐりぼーす"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "ぐるべす"
    - "みちぐりにど"
    - "みちぐりにどかるしうむすいわぶつ"
    - "ぼぐりぼーす"

  # ─────────────────────────────────────────
  # brandCatalog: 1 ブランド（グルベスのみ、単一ブランドとして扱う）
  # ─────────────────────────────────────────
  # genericKey はユーザー指定値「mitiglinide_voglibose_combo」をそのまま採用する
  # （既存配合剤4件の "{成分A}_{成分B}_combo" 命名規則と一致）。
  brandCatalog:
    グルベス:
      displayName: "グルベス"
      genericName: "ミチグリニドカルシウム水和物・ボグリボース"
      displayGenericName: "ミチグリニドカルシウム水和物・ボグリボース"
      genericKey: "mitiglinide_voglibose_combo"
      handlingTags: []
      aliases:
        - "ぐるべす"
      normalizedAliases:
        - "ぐるべす"

  aliasToBrand:
    "ぐるべす": "グルベス"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。1件・1件で一致。
  # 成分名読み（みちぐりにど／みちぐりにどかるしうむすいわぶつ／ぼぐりぼーす）は
  # module 単位 nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（既存配合剤4件と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # ["glinide_alpha_glucosidase_inhibitor_combination", {genericKeyと同一の成分タグ}] の
  # 2件で統一（既存配合剤4件と同型）。

drugResolution:
  brandToTags:
    グルベス:
      - "glinide_alpha_glucosidase_inhibitor_combination"
      - "mitiglinide_voglibose_combo"

composition:
  classKey: "glinide_alpha_glucosidase_inhibitor_combination"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "glinide_alpha_glucosidase_inhibitor_combination_oral"
  priority: "chronic"

display:
  nodeKey: "glinide_alpha_glucosidase_inhibitor_combination_oral"
  nodeLabelShort: "グリニド/α-GI配合剤"
  nodeLabelLong: "グリニド系経口血糖降下剤／α-グルコシダーゼ阻害薬配合剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（グルベス、単一ブランド） → ユーザー指定どおり確定
# 2. categoryPath「配合剤」taxonomy → 既存配合剤4件の実績と同型で確定
# 3. drugClass 単一結合定数「GLINIDE_ALPHA_GLUCOSIDASE_INHIBITOR_COMBINATION」 →
#    既存配合剤の命名規則と同型で確定
# 4. brandCatalog.genericName（「ミチグリニドカルシウム水和物・ボグリボース」）→
#    ユーザー指定成分（ミチグリニドカルシウム水和物・ボグリボース）どおり確定
# 5. genericKey（"mitiglinide_voglibose_combo"）→ ユーザー指定値をそのまま採用して確定
#    （既存配合剤の "_combo" 接尾辞命名規則と一致）
# 6. 成分名読みの流用範囲（みちぐりにど／ぼぐりぼーす）→ 既存グリニド/αGIモジュールに
#    確立済みの読みのみを流用して確定。「みちぐりにどかるしうむすいわぶつ」（塩表記）は
#    既存モジュールに確立済みの読みが存在しないため、kataToHira機械的変換のみで新規追加
#    （dm_thiazolidinedione_pioglitazone_oral の塩非表記/塩表記2形式併記と同型の判断）
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ 既存配合剤4件と同型の理由で確定
# 8. drugResolution.brandToTags → 既存配合剤4件と同型の
#    2件構成（["glinide_alpha_glucosidase_inhibitor_combination", {genericKey}]）で確定
# 9. composition.classKey（"glinide_alpha_glucosidase_inhibitor_combination"）/ nodeKey
#    （"glinide_alpha_glucosidase_inhibitor_combination_oral"）/ priority（"chronic"）→
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
# - GEブランドの追加: 現時点ではユーザー指定のグルベス1ブランドのみを扱う

# =========================================
# SCENARIOS_START〜SCENARIOS_END（未作成・STATUS: HEADER_ONLY）
# =========================================
