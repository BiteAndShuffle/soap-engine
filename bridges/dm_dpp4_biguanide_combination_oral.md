# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_dpp4_biguanide_combination_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END のシナリオ本文・ADDON本文は未作成。
# 本ファイルは PN1 の入力として使用できない（RULES.md §24 参照）。
#
# 目的: DPP-4阻害薬・ビグアナイド配合剤（メトアナ／エクメット／イニシンク／メホビル）の
# brandCatalog / alias / drugResolution.brandToTags 設計を、会話ログではなく
# リポジトリ上に固定するための作業ファイルです（2026-07-05 作成）。
#
# 次の作業: SCENARIOS_START〜SCENARIOS_END の作成 → ユーザー確認・凍結宣言
# （STATUS: HEADER_ONLY → DRAFT → FROZEN_FOR_PN1）→ PN1 開始
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤DPP4・直近実績。alias/brandCatalog設計の基本形）
#   - bridges/dm_biguanide_metformin_oral.md（単剤ビグアナイド・直近実績。
#     同一成分複数ブランドの genericKey 分離設計の基本形）
#   - data/modules/dm_insulin_glp1_combination.json（唯一の既存配合剤実績。
#     categoryPath「配合剤」taxonomy・drugClass単一結合定数・
#     brandごとの2成分generic name表記の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離・配合剤専用キー）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_dpp4_biguanide_combination_oral"

# categoryPath は dm_insulin_glp1_combination.json の配合剤taxonomyに倣う
# （2階層目 "配合剤" は異なる薬効クラス同士の固定用量配合剤に用いる区分。
#   同一クラス内の混合製剤＝インスリン混合型は別taxonomy「混合型」を使うため、
#   本モジュール（DPP4阻害薬×ビグアナイド、異なる薬効クラスの配合）には
#   「配合剤」区分が正しい ← 確認済み: dm_insulin_mixed_* 系は
#   ["糖尿病","インスリン製剤","混合型",...] であり「配合剤」は使っていない）
categoryPath:
  - "糖尿病"
  - "配合剤"
  - "DPP-4阻害薬／ビグアナイド配合剤"

drug:
  # genericName はクラス名（配合剤クラス表記）を採用。
  # 実際の成分名（2成分）は brandCatalog[brand].genericName 側に格納する
  # （dm_biguanide_metformin_oral / dm_insulin_glp1_combination と同型）
  genericName: "DPP-4阻害薬／ビグアナイド配合剤"

  brandNames:
    - "メトアナ"
    - "エクメット"
    - "イニシンク"
    - "メホビル"

  # drugClass は dm_insulin_glp1_combination の単一結合定数パターンに倣う
  # （["INSULIN_GLP1_COMBINATION"] と同型で ["DPP4_BIGUANIDE_COMBINATION"] を採用）
  drugClass:
    - "DPP4_BIGUANIDE_COMBINATION"

  route: "oral"

  dosageForms:
    - "tablet"

  drugSpecificTags:
    - "dpp4_biguanide_combination_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-05）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（dm_dpp4_oral / dm_biguanide_metformin_oral と同型の判断）:
  #   - あなぐりぷちん（アナグリプチン）/ びるだぐりぷちん（ビルダグリプチン）/
  #     あろぐりぷちん（アログリプチン）は dm_dpp4_oral.drug.search.nameAliases に
  #     確立済みの読みを流用（PN2-Drug-Header.md「既に確立済みの読みが同系統モジュールに
  #     存在する場合はそれを流用する」に従う。新規推測ではない）
  #   - めとほるみん / めとほるみんえんさんえん（メトホルミン／メトホルミン塩酸塩）は
  #     dm_biguanide_metformin_oral.drug.search.nameAliases から同様に流用
  #   - 上記5件はいずれも module 単位の prefixAliases/nameAliases にのみ追加し、
  #     brandCatalog[brand].aliases への複製・aliasToBrand への追加は行わない。
  #     理由: びるだぐりぷちん はエクメット/メホビルの2ブランドに、
  #     めとほるみん は全4ブランドに共通する成分読みであり、単一ブランドへの
  #     解決先を機械的に一意に決められない（dm_dpp4_oral の
  #     ジャヌビア／グラクティブ共有シタグリプチン読み「したぐりぷちん」を
  #     module単位のみに留めた判断と同型）
  search:
    primaryDisplayName: "DPP-4阻害薬／ビグアナイド配合剤"

    exactAliases:
      - "メトアナ"
      - "エクメット"
      - "イニシンク"
      - "メホビル"

    prefixAliases:
      - "めとあな"
      - "えくめっと"
      - "いにしんく"
      - "めほびる"
      - "あなぐりぷちん"
      - "びるだぐりぷちん"
      - "あろぐりぷちん"
      - "めとほるみん"
      - "めとほるみんえんさんえん"

    nameAliases:
      - "めとあな"
      - "えくめっと"
      - "いにしんく"
      - "めほびる"
      - "あなぐりぷちん"
      - "びるだぐりぷちん"
      - "あろぐりぷちん"
      - "めとほるみん"
      - "めとほるみんえんさんえん"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "めとあな"
    - "えくめっと"
    - "いにしんく"
    - "めほびる"
    - "あなぐりぷちん"
    - "びるだぐりぷちん"
    - "あろぐりぷちん"
    - "めとほるみん"
    - "めとほるみんえんさんえん"

  # ─────────────────────────────────────────
  # brandCatalog: 4 ブランド（先発3・GE1、区分して整理）
  # ─────────────────────────────────────────
  # genericKey は RULES.md §21「配合剤は単剤のgenericKeyを流用せず専用の単一文字列
  # キーを割り当てる」の例示命名（"insulin_degludec_aspart_combo"）に倣い、
  # "{DPP4成分}_{ビグアナイド成分}_combo" の形式で統一する。
  # GE（メホビル）は先発（エクメット）と同一成分のため、末尾に "_generic" を付与して
  # 区別する（dm_biguanide_metformin_oral のメトホルミン(GE)="metformin_mt_generic" と同型）。
  brandCatalog:
    # ───────── 先発ブランド ─────────
    メトアナ:
      displayName: "メトアナ"
      genericName: "アナグリプチン/メトホルミン塩酸塩"
      displayGenericName: "アナグリプチン/メトホルミン塩酸塩"
      genericKey: "anagliptin_metformin_combo"
      handlingTags:
        - "renal_dose_adjustment"
      aliases:
        - "めとあな"
      normalizedAliases:
        - "めとあな"

    エクメット:
      displayName: "エクメット"
      genericName: "ビルダグリプチン/メトホルミン塩酸塩"
      displayGenericName: "ビルダグリプチン/メトホルミン塩酸塩"
      genericKey: "vildagliptin_metformin_combo"
      handlingTags:
        - "renal_dose_adjustment"
      aliases:
        - "えくめっと"
      normalizedAliases:
        - "えくめっと"

    イニシンク:
      displayName: "イニシンク"
      genericName: "アログリプチン/メトホルミン塩酸塩"
      displayGenericName: "アログリプチン/メトホルミン塩酸塩"
      genericKey: "alogliptin_metformin_combo"
      handlingTags:
        - "renal_dose_adjustment"
      aliases:
        - "いにしんく"
      normalizedAliases:
        - "いにしんく"

    # ───────── GEブランド ─────────
    メホビル:
      displayName: "メホビル"
      genericName: "ビルダグリプチン/メトホルミン塩酸塩"
      displayGenericName: "ビルダグリプチン/メトホルミン塩酸塩"
      # ↑ エクメットと同一成分（GE）
      genericKey: "vildagliptin_metformin_combo_generic"
      handlingTags:
        - "renal_dose_adjustment"
        - "generic_equivalent"
      aliases:
        - "めほびる"
      normalizedAliases:
        - "めほびる"

  aliasToBrand:
    "めとあな": "メトアナ"
    "えくめっと": "エクメット"
    "いにしんく": "イニシンク"
    "めほびる": "メホビル"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。4件・4件で一致。
  # 成分名読み（あなぐりぷちん 等5件）は module 単位 nameAliases 側のみに存在し
  # brandCatalog.aliases には複製していないため、aliasToBrand の対象外
  # （dm_dpp4_oral のジャヌビア／グラクティブ・したぐりぷちん と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["dpp4_biguanide_combination", {genericKeyと同一の成分タグ}] の
  # 2件で統一（dm_dpp4_oral / dm_biguanide_metformin_oral と同型）。
  # handlingTags（renal_dose_adjustment / generic_equivalent）とは役割を分離する。

drugResolution:
  brandToTags:
    メトアナ:
      - "dpp4_biguanide_combination"
      - "anagliptin_metformin_combo"
    エクメット:
      - "dpp4_biguanide_combination"
      - "vildagliptin_metformin_combo"
    イニシンク:
      - "dpp4_biguanide_combination"
      - "alogliptin_metformin_combo"
    メホビル:
      - "dpp4_biguanide_combination"
      - "vildagliptin_metformin_combo_generic"

composition:
  classKey: "dpp4_biguanide_combination"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "dpp4_biguanide_combination_oral"
  priority: "chronic"

display:
  nodeKey: "dpp4_biguanide_combination_oral"
  nodeLabelShort: "DPP4/BG配合剤"
  nodeLabelLong: "DPP-4阻害薬／ビグアナイド配合剤（内服）"

# =========================================
# scenario availability 設計（確定・2026-07-05）
# SCENARIOS_START 作成時は本セクションの方針に従う
# =========================================
#
# 全ブランド共通で表示予定のシナリオカテゴリ（scenarioRequiredTagsなし）:
#   - initial / restart / external_start
#   - 増量・減量系（用量調整は主にビグアナイド成分側の用量帯に対応するため、
#     dm_biguanide_metformin_oral の「全ブランド共通」判断を踏襲する想定）
#   - adherence系（全種）
#   - treatment_end系（全種）
#   - lifestyle_guidance系（全種）
#   - sickday
#
# 副作用シナリオ（配合剤として必要な差分）:
#   本モジュールは DPP4阻害薬由来の副作用（低血糖・膵炎・類天疱瘡等）と
#   ビグアナイド由来の副作用（消化器症状・食欲不振・乳酸アシドーシス）の
#   両方をカバーする必要がある（dm_dpp4_oral + dm_biguanide_metformin_oral の
#   side_effect系シナリオを合算した設計になる見込み）。
#   乳酸アシドーシスの表現方針は dm_biguanide_metformin_oral の確定方針
#   （初回シナリオのP文中で表現し、初回ADDONには配置しない）を踏襲する想定。
#
# handlingTags（ブランド系統区分ラベルとして保持。scenarioRequiredTagsには使用しない）:
#   - "renal_dose_adjustment": 全4ブランド共通で保持する（ユーザー確定・2026-07-05）。
#     ただし scenarioRequiredTags には使用しない。DPP4成分（アナグリプチン／
#     ビルダグリプチン／アログリプチン）ごとの腎機能調整可否の細分化は行わず、
#     dose_decrease_renal_function は全ブランド共通シナリオ（scenarioRequiredTagsなし）
#     として扱う。dm_dpp4_oral のような dpp4_standard_titration /
#     dpp4_renal_dose_adjustment によるブランド差分制御は本配合剤では採用しない。
#   - "generic_equivalent": メホビルのみ（GE製品マーカー。区別整理用途のみで
#     scenario availability制御には使用しない）
#
# 配合剤の用法回数・服薬タイミング（ユーザー確定・2026-07-05）:
#   本配合剤4ブランドは週1回製剤ではないため、dm_dpp4_oral の
#   addon_weekly_dpp4_admin に相当する服薬タイミング専用ADDONは作成しない。
#   服薬タイミングに関する説明が必要な場合は、ADDON化せず initial / restart /
#   external_start の各シナリオ本文（S/O/A/P）内で扱う。

# =========================================
# addonPolicy（確定・2026-07-05。本文は SCENARIOS 作成時に記載）
# =========================================
#
# 選択候補として想定する addon（DPP4 / ビグアナイド両単剤bridgeで確立済みの
# addon id命名を踏襲する想定。本文は本モジュール独自に記載する。
# モジュール間のJSON参照共有は行わない — RULES.md §1 STANDARD_REFERENCE_PATHS）:
#   - addon_initial_sickday_guidance
#   - addon_glycemic_guidance_initial / addon_glycemic_guidance_followup
#   - addon_se_hypoglycemia_guidance
#   - addon_se_pancreatitis_guidance（DPP4由来）
#   - addon_hyperkalemia_guidance
#   - addon_hypertension_guidance
#   - addon_dyslipidemia_guidance
#   - addon_hyperuricemia_guidance
#
# addon_weekly_dpp4_admin 相当の要否（確定・2026-07-05）:
#   本配合剤4ブランドは週1回製剤ではないため作成しない。服薬タイミング専用ADDONも
#   今回は作成しない。必要な服薬説明は initial / restart / external_start の
#   シナリオ本文内で扱う（上記 scenario availability 設計と同一方針）。

# =========================================
# notes（確定済み事項・残る未確定事項・将来拡張事項）
# =========================================
#
# ■ 確定済み事項
# 1. moduleId / brandNames（メトアナ・エクメット・イニシンク・メホビル） → ユーザー指定どおり確定
# 2. categoryPath「配合剤」taxonomy → dm_insulin_glp1_combination.json の実績と
#    dm_insulin_mixed_*（「混合型」taxonomy・異なるtaxonomy）との対比により確定
# 3. drugClass 単一結合定数「DPP4_BIGUANIDE_COMBINATION」 → dm_insulin_glp1_combination の
#    「INSULIN_GLP1_COMBINATION」と同型で確定
# 4. brandCatalog 4ブランド・先発3/GE1の区分整理 → コメントブロックによる区分
#    （dm_biguanide_metformin_oral のメトグルコ/メトホルミン(GE)区分と同型。
#    新規スキーマフィールドは追加せず、既存パターンを踏襲）
# 5. genericKey 命名（"{DPP4成分}_{ビグアナイド成分}_combo" + GEは"_generic"付与）→
#    RULES.md §21 の配合剤専用キー例示（"insulin_degludec_aspart_combo"）に準拠して確定
# 6. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ dm_dpp4_oral のジャヌビア／グラクティブ
#    （共有シタグリプチン読み「したぐりぷちん」を module単位のみに留めた判断）と
#    同型の理由（複数ブランド共有の成分読みは一意のaliasToBrand解決先を持てない）で確定
# 7. drugResolution.brandToTags → dm_dpp4_oral / dm_biguanide_metformin_oral と同型の
#    2件構成（["dpp4_biguanide_combination", {genericKey}]）で確定
# 8. composition.classKey（"dpp4_biguanide_combination"）/ nodeKey
#    （"dpp4_biguanide_combination_oral"）/ priority（"chronic"）→ 既存命名規則で確定
# 9. DPP4成分別の腎機能調整可否の細分化 → 行わない。renal_dose_adjustment
#    handlingTag は全4ブランド共通で保持するが scenarioRequiredTags には使用せず、
#    dose_decrease_renal_function は全ブランド共通シナリオとして扱う（ユーザー確定・2026-07-05）
# 10. 配合剤の用法回数・服薬タイミングADDON → 週1回製剤ではないため
#     addon_weekly_dpp4_admin 相当のADDONは作成しない。服薬タイミング専用ADDONも
#     今回は作成せず、必要な服薬説明は initial / restart / external_start の
#     シナリオ本文内で扱う（ユーザー確定・2026-07-05）
#
# ■ 残る未確定事項（PENDING）
# なし（2026-07-05 時点、上記9・10の確定によりPENDING解消済み）
#
# ■ 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - 用量帯別（LD/HD等）のブランド分割: 今回はユーザー指定の4ブランド構成のみを扱い、
#   用量規格ごとの追加分割は行わない
# - 他の配合剤（SGLT2/ビグアナイド等）の追加: DP-09 / RULES.md §21 の既存方針に従って対応する
#
# =========================================
# SCENARIOS_START〜SCENARIOS_END は未作成（STATUS: HEADER_ONLY）
# =========================================
