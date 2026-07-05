# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_dpp4_thiazolidinedione_combination_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成。
# 本ファイルは PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: DPP-4阻害薬／チアゾリジン系糖尿病薬配合剤（リオベル）の brandCatalog / alias /
# drugResolution.brandToTags 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-06 作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の作成 → ユーザー確認・凍結宣言
# （STATUS: HEADER_ONLY → DRAFT → FROZEN_FOR_PN1）→ PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤DPP4・直近実績。アログリプチン読み「あろぐりぷちん」の出典）
#   - bridges/dm_thiazolidinedione_pioglitazone_oral.md（単剤TZD・直近実績。
#     ピオグリタゾン読み「ぴおぐりたぞん」/ピオグリタゾン塩酸塩読み
#     「ぴおぐりたぞんえんさんえん」の出典）
#   - bridges/dm_dpp4_biguanide_combination_oral.md（既存配合剤実績・直近。
#     配合剤専用genericKey命名・categoryPath「配合剤」taxonomy・
#     drugResolution.brandToTags 2件構成の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離・配合剤専用キー）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_dpp4_thiazolidinedione_combination_oral"

# categoryPath は dm_dpp4_biguanide_combination_oral.md の配合剤taxonomyに倣う
# （異なる薬効クラス同士の固定用量配合剤 → 2階層目「配合剤」）
categoryPath:
  - "糖尿病"
  - "配合剤"
  - "DPP-4阻害薬／チアゾリジン系糖尿病薬配合剤"

drug:
  # genericName はクラス名（配合剤クラス表記）を採用。
  # 実際の成分名（2成分）は brandCatalog[brand].genericName 側に格納する
  # （dm_dpp4_biguanide_combination_oral と同型）
  genericName: "DPP-4阻害薬／チアゾリジン系糖尿病薬配合剤"

  brandNames:
    - "リオベル"

  # drugClass は dm_dpp4_biguanide_combination_oral の単一結合定数パターンに倣う
  drugClass:
    - "DPP4_THIAZOLIDINEDIONE_COMBINATION"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "dpp4_thiazolidinedione_combination_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-06）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（既存DPP4/TZDモジュールにある読みのみを流用。新規推測なし）:
  #   - あろぐりぷちん（アログリプチン）は dm_dpp4_oral.drug.search.nameAliases に
  #     確立済みの読みを流用
  #   - ぴおぐりたぞん（ピオグリタゾン）/ ぴおぐりたぞんえんさんえん
  #     （ピオグリタゾン塩酸塩）は dm_thiazolidinedione_pioglitazone_oral.drug.search.nameAliases
  #     から同様に流用
  #   - 「アログリプチン安息香酸塩」（brandCatalog.genericNameで使用する塩形表記）の
  #     読みは、既存DPP4/TZDモジュールのいずれにも確立済みの読みが存在しないため
  #     推測生成せず追加しない（PENDING扱いとはせず、単に module 単位 nameAliases への
  #     追加を見送る。塩非表記の「あろぐりぷちん」で検索到達性は確保されるため
  #     機能上の欠落ではない）
  #   - 上記3件はいずれも module 単位の prefixAliases/nameAliases にのみ追加し、
  #     brandCatalog[brand].aliases への複製は行わない（単一ブランドのため
  #     aliasToBrand の曖昧化リスクはないが、dm_dpp4_biguanide_combination_oral と
  #     同型の判断で統一する）
  search:
    primaryDisplayName: "DPP-4阻害薬／チアゾリジン系糖尿病薬配合剤"

    exactAliases:
      - "リオベル"

    prefixAliases:
      - "りおべる"
      - "あろぐりぷちん"
      - "ぴおぐりたぞん"
      - "ぴおぐりたぞんえんさんえん"

    nameAliases:
      - "りおべる"
      - "あろぐりぷちん"
      - "ぴおぐりたぞん"
      - "ぴおぐりたぞんえんさんえん"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "りおべる"
    - "あろぐりぷちん"
    - "ぴおぐりたぞん"
    - "ぴおぐりたぞんえんさんえん"

  # ─────────────────────────────────────────
  # brandCatalog: 1 ブランド（リオベルのみ、単一ブランドとして扱う）
  # ─────────────────────────────────────────
  # genericKey は RULES.md §21 の配合剤専用キー例示（"insulin_degludec_aspart_combo"）
  # および dm_dpp4_biguanide_combination_oral の
  # "{DPP4成分}_{ビグアナイド成分}_combo" 命名に倣い、
  # "{DPP4成分}_{TZD成分}_combo" 形式で統一する。
  brandCatalog:
    リオベル:
      displayName: "リオベル"
      genericName: "アログリプチン安息香酸塩／ピオグリタゾン塩酸塩"
      displayGenericName: "アログリプチン安息香酸塩／ピオグリタゾン塩酸塩"
      genericKey: "alogliptin_pioglitazone_combo"
      handlingTags: []
      aliases:
        - "りおべる"
      normalizedAliases:
        - "りおべる"

  aliasToBrand:
    "りおべる": "リオベル"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。1件・1件で一致。
  # 成分名読み（あろぐりぷちん／ぴおぐりたぞん／ぴおぐりたぞんえんさんえん）は
  # module 単位 nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（dm_dpp4_biguanide_combination_oral と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # ["dpp4_thiazolidinedione_combination", {genericKeyと同一の成分タグ}] の
  # 2件で統一（dm_dpp4_biguanide_combination_oral と同型）。

drugResolution:
  brandToTags:
    リオベル:
      - "dpp4_thiazolidinedione_combination"
      - "alogliptin_pioglitazone_combo"

composition:
  classKey: "dpp4_thiazolidinedione_combination"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "dpp4_thiazolidinedione_combination_oral"
  priority: "chronic"

display:
  nodeKey: "dpp4_thiazolidinedione_combination_oral"
  nodeLabelShort: "DPP4/TZD配合剤"
  nodeLabelLong: "DPP-4阻害薬／チアゾリジン系糖尿病薬配合剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId / brandNames（リオベル、単一ブランド） → ユーザー指定どおり確定
# 2. categoryPath「配合剤」taxonomy → dm_dpp4_biguanide_combination_oral の実績と同型で確定
# 3. drugClass 単一結合定数「DPP4_THIAZOLIDINEDIONE_COMBINATION」 →
#    dm_dpp4_biguanide_combination_oral の「DPP4_BIGUANIDE_COMBINATION」と同型で確定
# 4. brandCatalog.genericName（「アログリプチン安息香酸塩／ピオグリタゾン塩酸塩」）→
#    ユーザー指定どおり確定
# 5. genericKey（"alogliptin_pioglitazone_combo"）→
#    RULES.md §21 の配合剤専用キー命名規則に準拠して確定
# 6. 成分名読みの流用範囲（あろぐりぷちん／ぴおぐりたぞん／ぴおぐりたぞんえんさんえん）→
#    既存DPP4/TZDモジュールに確立済みの読みのみを流用し、
#    「アログリプチン安息香酸塩」の塩形読みは新規推測せず追加しないことで確定
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ dm_dpp4_biguanide_combination_oral と同型の理由で確定
# 8. drugResolution.brandToTags → dm_dpp4_biguanide_combination_oral と同型の
#    2件構成（["dpp4_thiazolidinedione_combination", {genericKey}]）で確定
# 9. composition.classKey（"dpp4_thiazolidinedione_combination"）/ nodeKey
#    （"dpp4_thiazolidinedione_combination_oral"）/ priority（"chronic"）→
#    既存命名規則で確定
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-06 時点、本 bridge のヘッダー設計に関する未確定事項はなし）
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - handlingTags（増量・減量等のブランド差分制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する。今回のヘッダー段階では
#   単一ブランドのみのため handlingTags は空配列とした
# - 「アログリプチン安息香酸塩」の塩形読みの追加: 将来別モジュールで当該読みが
#   確立された場合は、本モジュールの module単位nameAliases へも追記を検討する
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定のリオベル1ブランドのみを扱う
#
# =========================================
# SCENARIOS_START〜SCENARIOS_END は未作成（STATUS: HEADER_ONLY）
# =========================================
