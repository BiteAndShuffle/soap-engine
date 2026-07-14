# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_dpp4_biguanide_combination_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー案（drug / composition / display 等）および SCENARIOS_START〜SCENARIOS_END の
# シナリオ本文・ADDON本文は、ユーザーによる凍結前レビュー（PASS確認済み）を経て
# 確定しました。
#
# 目的: DPP-4阻害薬・ビグアナイド配合剤（メトアナ／エクメット／イニシンク／メホビル）の
# brandCatalog / alias / drugResolution.brandToTags 設計、およびシナリオ本文を、
# 会話ログではなくリポジトリ上に固定するための作業ファイルです
# （2026-07-05 ヘッダー作成、同日シナリオ本文追加・凍結）。
#
# シナリオ本文追加時の対応: ユーザー提供文に addon_hyperkalemia_guidance の重複定義
# （initial直後・se_hypo_none直後の2箇所、内容完全一致）があったため、initial直後の
# 定義を正本として残し、se_hypo_none直後の重複ブロックのみ削除した
# （dm_biguanide_metformin_oral.md での同型の対応実績に倣う。S/O/A/P本文・
# P_ADDON参照・addon本文そのものは変更していない）。
#
# 次の作業: PN1 開始（prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
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
#   - addon_metformin_initial_sickday_guidance
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
# SCENARIOS_START〜SCENARIOS_END（STATUS: FROZEN_FOR_PN1）
# =========================================

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=DPP-4阻害薬・メトホルミン配合剤 初回】
S
DPP-4阻害薬・メトホルミン配合剤は、血糖値が高いため追加となった。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤は、血糖コントロール不十分のため追加となった。
メトホルミンによる肝臓での糖新生抑制や末梢組織での糖利用促進に加え、DPP-4阻害薬によるインクレチン作用の増強により、血糖改善を目的として服用する。
P
DPP-4阻害薬・メトホルミン配合剤は、血糖値を改善する薬です。
下痢や吐き気など、お腹の調子が悪くなることがあります。
脱水や体調不良時は副作用が出やすくなることがあるため、食事や水分が摂れない時はご相談ください。
P_ADDON
- addon_metformin_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_pancreatitis_guidance
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=sickday_guidance｜id=addon_metformin_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
体調不良時は水分を少量ずつこまめに摂取してください。
治療継続の可否は体調や摂取状況によって異なるため、自己判断せず処方医へご相談ください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。




【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_initial｜title=生活指導（血糖指導）】
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。




【ADDON｜type=side_effect_guidance｜id=addon_se_pancreatitis_guidance｜title=副作用注意喚起（膵炎）】
P_APPEND
DPP-4阻害薬・ビグアナイド配合剤の継続中に、強い腹痛や背中に響く痛みが出ることがあります。
こうした症状が続く場合は膵炎の可能性があります。
強い腹痛や背中に響く痛み、嘔吐などが続く場合は、速やかに医療機関を受診してください。




【ADDON｜type=side_effect_guidance｜id=addon_se_hypoglycemia_guidance｜title=副作用注意喚起（低血糖）】
P_APPEND
他の糖尿病薬と併用している場合は、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。




【ADDON｜type=lifestyle_guidance｜id=addon_hyperkalemia_guidance｜title=生活指導（カリウム）】
S_APPEND
カリウムの値が高いと言われた。
A_APPEND
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P_APPEND
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。






【SCENARIO｜type=treatment_start｜id=restart｜title=DPP-4阻害薬・メトホルミン配合剤 再開】
S
DPP-4阻害薬・メトホルミン配合剤は、血糖値が高いため再開となった。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤は、血糖コントロール不十分のため再開となった。
メトホルミンによる肝臓での糖新生抑制や末梢組織での糖利用促進に加え、DPP-4阻害薬によるインクレチン作用の増強により、血糖改善を目的として服用する。
P
DPP-4阻害薬・メトホルミン配合剤は、血糖値を改善する薬です。
下痢や吐き気など、お腹の調子が悪くなることがあります。
脱水や体調不良時は副作用が出やすくなることがあるため、食事や水分が摂れない時はご相談ください。
P_ADDON
- addon_metformin_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_pancreatitis_guidance
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=DPP-4阻害薬・メトホルミン配合剤 他所開始】
S
DPP-4阻害薬・メトホルミン配合剤は、他院で開始され継続使用中であった。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤は、血糖コントロール改善を目的として使用中であった。
メトホルミンによる肝臓での糖新生抑制や末梢組織での糖利用促進に加え、DPP-4阻害薬によるインクレチン作用の増強により、血糖改善を目的として服用する。
P
DPP-4阻害薬・メトホルミン配合剤は、血糖値を改善する薬です。
下痢や吐き気など、お腹の調子が悪くなることがあります。
脱水や体調不良時は副作用が出やすくなることがあるため、食事や水分が摂れない時はご相談ください。
P_ADDON
- addon_metformin_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_pancreatitis_guidance
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=DPP-4阻害薬・メトホルミン配合剤 増量（効果実感乏しい）】
S
DPP-4阻害薬・メトホルミン配合剤は、効果の実感が乏しいため増量となった。
O
DPP-4阻害薬・メトホルミン配合剤　増量
A
DPP-4阻害薬・メトホルミン配合剤は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=DPP-4阻害薬・メトホルミン配合剤 増量（検査値改善なし）】
S
DPP-4阻害薬・メトホルミン配合剤は、検査値が改善しないため増量となった。
O
DPP-4阻害薬・メトホルミン配合剤　増量
A
DPP-4阻害薬・メトホルミン配合剤は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=DPP-4阻害薬・メトホルミン配合剤 増量（他剤との調整）】
S
DPP-4阻害薬・メトホルミン配合剤は、他剤変更に伴う調整により増量となった。
O
DPP-4阻害薬・メトホルミン配合剤　増量
A
DPP-4阻害薬・メトホルミン配合剤は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_renal_function｜title=DPP-4阻害薬・メトホルミン配合剤 減量（腎機能低下）】
S
DPP-4阻害薬・メトホルミン配合剤は、腎機能を考慮して減量となった。
O
DPP-4阻害薬・メトホルミン配合剤　減量
A
DPP-4阻害薬・メトホルミン配合剤は、腎機能低下に伴い用量調整となった。減量後の血糖推移に注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤は、腎機能に応じて用量調整が必要になることがあります。
減量後は血糖値が変動する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、血糖推移および体調変化の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=DPP-4阻害薬・メトホルミン配合剤 減量（検査値改善）】
S
DPP-4阻害薬・メトホルミン配合剤は、検査値が改善したため減量となった。
O
DPP-4阻害薬・メトホルミン配合剤　減量
A
DPP-4阻害薬・メトホルミン配合剤は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=DPP-4阻害薬・メトホルミン配合剤 減量（効果実感乏しい）】
S
DPP-4阻害薬・メトホルミン配合剤は、効果の実感が乏しいため減量を希望された。
O
DPP-4阻害薬・メトホルミン配合剤　減量
A
DPP-4阻害薬・メトホルミン配合剤は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=DPP-4阻害薬・メトホルミン配合剤 減量（他剤との調整）】
S
DPP-4阻害薬・メトホルミン配合剤は、他剤変更に伴う調整のため減量となった。
O
DPP-4阻害薬・メトホルミン配合剤　減量
A
DPP-4阻害薬・メトホルミン配合剤は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=DPP-4阻害薬・メトホルミン配合剤 副作用なし（低血糖）】
S
DPP-4阻害薬・メトホルミン配合剤を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による低血糖は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
単剤では低血糖は起こりにくい薬ですが、他の糖尿病薬と併用中は低血糖が起こることがあります。
症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
改善しない場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_followup｜title=生活指導（血糖指導）】
A_APPEND
血糖コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_hypertension_guidance｜title=生活指導（血圧）】
S_APPEND
血圧が高いと言われた。
A_APPEND
血圧コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P_APPEND
血圧が高い状態が続くと、心臓や血管へ負担がかかることがあります。
食事療法や運動療法は、血圧のコントロールにおいて重要です。
塩分の摂りすぎに注意しましょう。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_dyslipidemia_guidance｜title=生活指導（脂質）】
S_APPEND
脂質が高いと言われた。
A_APPEND
脂質コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P_APPEND
脂質が高い状態が続くと、動脈硬化のリスクが高まることがあります。
食事療法や運動療法は、脂質のコントロールにおいて重要です。
食生活の見直しを継続していきましょう。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_hyperuricemia_guidance｜title=生活指導（尿酸）】
S_APPEND
尿酸が高いと言われた。
A_APPEND
尿酸コントロールが不十分であり、食事療法および生活習慣の見直しが必要である。
P_APPEND
尿酸が高い状態が続くと、痛風発作などにつながることがあります。
食事療法は、尿酸のコントロールにおいて重要です。
食生活の見直しを継続していきましょう。
気になることがあればご相談ください。






【SCENARIO｜type=side_effect｜id=se_diarrhea_abdominal_pain_none｜title=DPP-4阻害薬・メトホルミン配合剤 副作用なし（下痢・腹痛）】
S
DPP-4阻害薬・メトホルミン配合剤を服用して症状は落ち着いている。
下痢や腹痛は認めない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による消化器症状は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤の継続中に、お腹の調子が悪くなることがあります。
下痢や腹痛が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_appetite_loss_none｜title=DPP-4阻害薬・メトホルミン配合剤 副作用なし（食欲不振）】
S
DPP-4阻害薬・メトホルミン配合剤を服用して症状は落ち着いている。
食欲不振は認めない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による消化器症状は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤の継続中に、お腹の調子が悪くなることがあります。
食欲不振が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_lactic_acidosis_none｜title=DPP-4阻害薬・メトホルミン配合剤 副作用なし（乳酸アシドーシス）】
S
DPP-4阻害薬・メトホルミン配合剤を服用して症状は落ち着いている。
強いだるさ、吐き気、腹痛、息苦しさなどの症状は認めない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による乳酸アシドーシスは現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤の継続中に、強いだるさ、吐き気、腹痛、息苦しさなどが出ることがあります。
脱水や体調不良時には、重い副作用が起こりやすくなることがあります。
症状が強い場合や、水分が摂れない場合は、自己判断せず処方医へご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_abdominal_distension_none｜title=DPP-4阻害薬・メトホルミン配合剤 副作用なし（腹部膨満感）】
S
DPP-4阻害薬・メトホルミン配合剤を服用して症状は落ち着いている。
お腹が張った感じは認めない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による消化器症状は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤の継続中に、お腹の調子が悪くなることがあります。
お腹の張りが続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_pancreatitis_none｜title=DPP-4阻害薬・メトホルミン配合剤 副作用なし（膵炎）】
S
DPP-4阻害薬・メトホルミン配合剤を服用して症状は落ち着いている。
強い腹痛や背部痛などの症状は認めない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による膵炎は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤の継続中に、強い腹痛や背中に響く痛みが出ることがあります。
こうした症状が続く場合は膵炎の可能性があります。
強い腹痛や背中に響く痛み、嘔吐などが続く場合は、速やかに医療機関を受診してください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_bullous_pemphigoid_none｜title=DPP-4阻害薬・メトホルミン配合剤 副作用なし（類天疱瘡）】
S
DPP-4阻害薬・メトホルミン配合剤を服用して症状は落ち着いている。
かゆみや湿疹、水ぶくれなどの症状は認めない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による皮膚症状は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤の継続中に、かゆみを伴う水ぶくれや皮膚のただれなどが現れた場合は、続くのを待たず、お早めにご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=DPP-4阻害薬・メトホルミン配合剤 CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
DPP-4阻害薬・メトホルミン配合剤　服用中
A
コンプライアンスは良好である。治療継続に問題はない。
P
引き続き用法を守って服用することで、治療効果の維持が期待されます。
今後も継続して服用できるようにすることが大切です。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=DPP-4阻害薬・メトホルミン配合剤 CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
DPP-4阻害薬・メトホルミン配合剤　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することで、十分な治療効果が期待されます。
服薬忘れが続くと、期待される治療効果が十分に得られない可能性があります。
P_ADDON
- addon_adherence_reminder_alarm
- addon_adherence_reminder_app
- addon_adherence_visual_calendar_checklist
- addon_adherence_visual_note
- addon_adherence_prep_previous_night
- addon_adherence_prep_before_meal
- addon_adherence_support_family_reminder
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_alarm｜title=服薬忘れ対策（通知：アラーム）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、アラームを服薬時間に合わせて設定しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_app｜title=服薬忘れ対策（通知：服薬アプリ）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、服薬を記録できるアプリを活用する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_calendar_checklist｜title=服薬忘れ対策（見える化：お薬カレンダー・チェックリスト）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、お薬カレンダーや服用チェックリストで確認する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=服薬忘れ対策（見える化：貼り紙）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、薬を飲む時間を目立つ場所に書いておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_previous_night｜title=服薬忘れ対策（準備：前夜）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、前夜のうちに翌朝の薬を目につく場所へ準備しておく習慣も役立ちます。


【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_before_meal｜title=服薬忘れ対策（準備：食前）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、食事の前に薬を目につく場所へ準備しておく習慣も役立ちます。


【ADDON｜type=adherence_guidance｜id=addon_adherence_support_family_reminder｜title=服薬忘れ対策（支援：家族などの声掛け）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、家族や身近な方に服薬したか声をかけてもらう方法があります。






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=DPP-4阻害薬・メトホルミン配合剤 CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
DPP-4阻害薬・メトホルミン配合剤　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=DPP-4阻害薬・メトホルミン配合剤 CP不良（受診遅延）】
S
都合により受診遅延がみられる。
処方どおりの継続服用ができていない。
O
DPP-4阻害薬・メトホルミン配合剤　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=DPP-4阻害薬・メトホルミン配合剤 終了（改善）】
S
DPP-4阻害薬・メトホルミン配合剤は、血糖コントロールが改善したため中止となった。
O
DPP-4阻害薬・メトホルミン配合剤　処方終了
A
DPP-4阻害薬・メトホルミン配合剤は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
DPP-4阻害薬・メトホルミン配合剤終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=DPP-4阻害薬・メトホルミン配合剤 終了（効果不十分）】
S
DPP-4阻害薬・メトホルミン配合剤は、効果不十分のため中止となった。
O
DPP-4阻害薬・メトホルミン配合剤　処方終了
A
DPP-4阻害薬・メトホルミン配合剤は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
DPP-4阻害薬・メトホルミン配合剤終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=DPP-4阻害薬・メトホルミン配合剤 終了（無効）】
S
DPP-4阻害薬・メトホルミン配合剤は、効果が認められなかったため中止となった。
O
DPP-4阻害薬・メトホルミン配合剤　処方終了
A
DPP-4阻害薬・メトホルミン配合剤は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
DPP-4阻害薬・メトホルミン配合剤終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=DPP-4阻害薬・メトホルミン配合剤 SE継続（軽症 消化器症状）】
S
DPP-4阻害薬・メトホルミン配合剤の服用によりお腹の調子が悪いが、日常生活は送れている。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による消化器症状を軽度認めるが、治療継続が可能である。
P
DPP-4阻害薬・メトホルミン配合剤によるお腹の不調が軽い場合は、水分を十分に摂取し、無理のない範囲で食事内容を見直して様子をみてください。
お腹の不調が強く続く場合は、薬の調整が必要になることがあります。
ご相談ください。


P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_moderate_consider_dr｜title=DPP-4阻害薬・メトホルミン配合剤 SE継続（中等度 消化器症状）】
S
DPP-4阻害薬・メトホルミン配合剤の服用により下痢が強く、辛いことがあるが、日常生活は送れている。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
DPP-4阻害薬・メトホルミン配合剤による消化器症状が強く、継続困難の可能性があるため対応を要する。
P
DPP-4阻害薬・メトホルミン配合剤による下痢が強い場合や続く場合は、薬の調整や変更が必要になることがあります。
脱水につながる可能性があるため、自己判断で継続せず、処方医へご相談ください。
水分が摂れない、嘔吐が続く、尿量が減る、強い倦怠感などがある場合は、速やかに受診してください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_gi_symptoms｜title=DPP-4阻害薬・メトホルミン配合剤 SE変更（消化器症状）】
S
DPP-4阻害薬・メトホルミン配合剤の服用により下痢が出現したため、他剤へ変更となった。
O
DPP-4阻害薬・メトホルミン配合剤　処方変更
A
DPP-4阻害薬・メトホルミン配合剤の服用による消化器症状を認め、他剤変更後の経過確認を要する。
P
DPP-4阻害薬・メトホルミン配合剤の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_gi_symptoms｜title=DPP-4阻害薬・メトホルミン配合剤 SE減量（消化器症状）】
S
DPP-4阻害薬・メトホルミン配合剤の服用により下痢がひどいため、減量となった。
O
DPP-4阻害薬・メトホルミン配合剤　減量
A
DPP-4阻害薬・メトホルミン配合剤の服用による消化器症状を認め、減量後の経過確認を要する。
P
DPP-4阻害薬・メトホルミン配合剤の減量後も消化器症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_gi_symptoms｜title=DPP-4阻害薬・メトホルミン配合剤 SE中止（消化器症状）】
S
DPP-4阻害薬・メトホルミン配合剤の服用により下痢がひどいため、中止となった。
O
DPP-4阻害薬・メトホルミン配合剤　処方中止
A
DPP-4阻害薬・メトホルミン配合剤の服用による消化器症状を認め、中止後の経過確認を要する。
P
DPP-4阻害薬・メトホルミン配合剤の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=DPP-4阻害薬・メトホルミン配合剤 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
血糖コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P
高血糖が続くと、眼・腎・神経障害などのリスクが高まります。
薬物療法に加え、食事・運動療法も血糖コントロールにおいて重要です。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖コントロールの改善に伴い、低血糖症状が出ることがあります。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=DPP-4阻害薬・メトホルミン配合剤 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
DPP-4阻害薬・メトホルミン配合剤　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=DPP-4阻害薬・メトホルミン配合剤 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
DPP-4阻害薬・メトホルミン配合剤　服用中
A
食事摂取低下および消化器症状により脱水リスクが上昇している。併用薬によっては低血糖リスクもあり、シックデイ時の対応に注意が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
DPP-4阻害薬・メトホルミン配合剤は、脱水時に副作用のリスクが高まることがあるため、服用を続けてよいか自己判断せず、処方医へご相談ください。
血糖測定が可能であれば行ってください。
水分は少量ずつこまめに摂取してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======
