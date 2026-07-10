# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_sglt2_oral
# =========================================
#
# ⚠️ STATUS: DRAFT ⚠️
#
# ヘッダー案（drug / composition / display 等）に加え、
# SCENARIOS_START〜SCENARIOS_END（シナリオ・ADDON本文）を追加済み（2026-07-11）。
# ユーザーによる本文確認・凍結宣言はまだ行われていない
# （STATUS: DRAFT → FROZEN_FOR_PN1 は凍結宣言後に更新する。RULES.md §24）。
#
# 目的: 糖尿病治療目的の SGLT2阻害薬（フォシーガ／ジャディアンス／カナグル／
# スーグラ／ルセフィ／デベルザ）の brandCatalog / alias /
# drugResolution.brandToTags / composition / display 設計を、
# 会話ログではなくリポジトリ上に固定するための作業ファイルです（2026-07-09 作成）。
#
# 用途分離方針（ユーザー確定・2026-07-09）:
#   SGLT2阻害薬は用途別にモジュールを分ける。
#   本モジュール（dm_sglt2_oral）は糖尿病治療目的専用。
#   心不全・腎疾患治療目的は将来 別モジュール cardiorenal_sglt2_oral として作成する。
#   同一ブランド（例: フォシーガ）が将来両モジュールに存在し得るが、
#   S/A/P の主眼（糖尿病 vs 心不全・腎疾患）が異なるため、
#   composition.classKey / nodeKey を用途別に分離し class-level S 統合を防止する
#   （docs/DESIGN_PRINCIPLES.md DP-02 の「剤形分離優先（統合防止）」パターンを
#   用途分離に適用。heparinoid 系の剤形別 classKey 分離と同型の判断）。
#
#   本モジュール:        classKey="sglt2_dm"          nodeKey="sglt2_dm_oral"
#   将来 cardiorenal 側: classKey="sglt2_cardiorenal"  nodeKey="sglt2_cardiorenal_oral"
#   （cardiorenal 側の実際の値は、当該モジュール作成時に改めて確定する）
#
# 次の作業: ユーザーによる SCENARIOS_START〜SCENARIOS_END の本文確認・凍結宣言。
# 凍結宣言後に STATUS を FROZEN_FOR_PN1 へ更新し、PN1 を開始する
# （prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の直近実績。各ブランドが
#     異なる成分を持つ場合の brandCatalog / genericKey 個別付与・成分名読みを
#     module 単位 nameAliases のみに留める設計の直接参考）
#   - bridges/dm_sulfonylurea_oral.md（単剤・複数ブランド構成の直近実績）
#   - bridges/dm_dpp4_oral.md の handlingTags 設計（dpp4_standard_titration /
#     タグ不在パターン）を "dose_adjustment_supported" 付与判断の直接参考とした
#     （2026-07-09 追記）
#   - docs/DESIGN_PRINCIPLES.md DP-02（classKey設計方針。用途分離によるS統合防止）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §8（drug.nameAliases と drug.search.nameAliases 完全一致）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_sglt2_oral"

categoryPath:
  - "糖尿病"
  - "SGLT2阻害薬"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_dpp4_oral / dm_sulfonylurea_oral と同型。
  # {{drug_subject}} のフォールバック解決先にも使われるため、
  # 用途区分「（糖尿病）」等の修飾は付けない（drugSubject.ts 参照）。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "SGLT2阻害薬"

  brandNames:
    - "フォシーガ"
    - "ジャディアンス"
    - "カナグル"
    - "スーグラ"
    - "ルセフィ"
    - "デベルザ"

  drugClass:
    - "SGLT2_INHIBITOR"

  route: "oral"

  dosageForms:
    - "tablet"
  # tablet で確定。OD錠等の詳細剤形は今回のヘッダーでは扱わない
  # （dm_dpp4_oral / dm_sulfonylurea_oral と同様、将来必要になった時点で
  # 別途拡張する）。

  drugSpecificTags:
    - "sglt2_dm_oral"
  # 用途分離方針に合わせ "sglt2_oral" ではなく "sglt2_dm_oral" とする
  # （drugResolution.brandToTags の共通タグとしても使用）。

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-09）
  # ─────────────────────────────────────────
  # ブランド名読み・成分名読みはいずれも kataToHira による機械的な
  # ひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（dm_dpp4_oral / dm_sulfonylurea_oral と同型の判断）:
  #   6ブランドはいずれも互いに異なる成分（ダパグリフロジン／エンパグリフロジン／
  #   カナグリフロジン／イプラグリフロジン／ルセオグリフロジン／トホグリフロジン）
  #   を持つ単剤構成であり、displayGenericName が resolveAllHighPrecisionBrands で
  #   解決されるため（DP-09）、成分名読みを brandCatalog[brand].aliases へ
  #   複製する必要はない。成分名読みは module 単位の prefixAliases/nameAliases
  #   にのみ追加する。
  #
  # primaryDisplayName はクラス名（"SGLT2阻害薬"）のみとし、用途区分（糖尿病）は
  # 付けない。現時点で SGLT2 module は本モジュールのみのため、汎用クエリ
  # （「SGLT2阻害薬」等）に対する標準候補として自然に到達する。
  # 用途区分の明示は display セクション（nodeLabelLong）側で行う
  # （cardiorenal_sglt2_oral 作成時に primaryDisplayName 側の区別要否を再検討する）。
  search:
    primaryDisplayName: "SGLT2阻害薬"

    exactAliases:
      - "フォシーガ"
      - "ジャディアンス"
      - "カナグル"
      - "スーグラ"
      - "ルセフィ"
      - "デベルザ"

    prefixAliases:
      - "ふぉしーが"
      - "じゃでぃあんす"
      - "かなぐる"
      - "すーぐら"
      - "るせふぃ"
      - "でべるざ"
      - "だぱぐりふろじん"
      - "えんぱぐりふろじん"
      - "かなぐりふろじん"
      - "いぷらぐりふろじん"
      - "るせおぐりふろじん"
      - "とほぐりふろじん"

    nameAliases:
      - "ふぉしーが"
      - "じゃでぃあんす"
      - "かなぐる"
      - "すーぐら"
      - "るせふぃ"
      - "でべるざ"
      - "だぱぐりふろじん"
      - "えんぱぐりふろじん"
      - "かなぐりふろじん"
      - "いぷらぐりふろじん"
      - "るせおぐりふろじん"
      - "とほぐりふろじん"

    keywords: []
    # 心不全・腎疾患用途の keyword は追加しない（用途混入防止方針）。

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "ふぉしーが"
    - "じゃでぃあんす"
    - "かなぐる"
    - "すーぐら"
    - "るせふぃ"
    - "でべるざ"
    - "だぱぐりふろじん"
    - "えんぱぐりふろじん"
    - "かなぐりふろじん"
    - "いぷらぐりふろじん"
    - "るせおぐりふろじん"
    - "とほぐりふろじん"
  # drug.search.nameAliases と完全一致（順序・表記・件数、RULES.md §8）。

  # ─────────────────────────────────────────
  # brandCatalog: 6 ブランド（それぞれ異なる成分の単剤）
  # ─────────────────────────────────────────
  # genericKey 命名規則: 成分名の英語スネークケース（PN2-Drug-Header.md 準拠、
  # dm_dpp4_oral の linagliptin / omarigliptin 等と同型）。
  #
  # handlingTags: 増量・減量シナリオの表示可否制御タグ（ユーザー確定・2026-07-09）。
  #   "dose_adjustment_supported": 増量・減量シナリオを表示するブランド
  #     （フォシーガ／ジャディアンス／スーグラ／ルセフィ）
  #   タグ不在（カナグル／デベルザ）: 増量・減量シナリオは自動的に非表示になる
  #     （RULES.md §21、dm_dpp4_oral のトラゼンタと同型のタグ不在パターン）。
  #   このタグは糖尿病用途の増減量制御専用であり、心不全・腎疾患用途の情報は
  #   混入しない。
  #   将来のシナリオ作成時、増量・減量シナリオ（dose_increase_* / dose_decrease_*）
  #   には scenarioRequiredTags: ["dose_adjustment_supported"] を付与する前提とする
  #   （dm_dpp4_oral の dpp4_standard_titration と同型の運用）。
  brandCatalog:
    フォシーガ:
      displayName: "フォシーガ"
      genericName: "ダパグリフロジン"
      displayGenericName: "ダパグリフロジン"
      genericKey: "dapagliflozin"
      handlingTags:
        - "dose_adjustment_supported"
      aliases:
        - "ふぉしーが"
      normalizedAliases:
        - "ふぉしーが"

    ジャディアンス:
      displayName: "ジャディアンス"
      genericName: "エンパグリフロジン"
      displayGenericName: "エンパグリフロジン"
      genericKey: "empagliflozin"
      handlingTags:
        - "dose_adjustment_supported"
      aliases:
        - "じゃでぃあんす"
      normalizedAliases:
        - "じゃでぃあんす"

    カナグル:
      displayName: "カナグル"
      genericName: "カナグリフロジン"
      displayGenericName: "カナグリフロジン"
      genericKey: "canagliflozin"
      handlingTags: []
      aliases:
        - "かなぐる"
      normalizedAliases:
        - "かなぐる"

    スーグラ:
      displayName: "スーグラ"
      genericName: "イプラグリフロジン"
      displayGenericName: "イプラグリフロジン"
      genericKey: "ipragliflozin"
      handlingTags:
        - "dose_adjustment_supported"
      aliases:
        - "すーぐら"
      normalizedAliases:
        - "すーぐら"

    ルセフィ:
      displayName: "ルセフィ"
      genericName: "ルセオグリフロジン"
      displayGenericName: "ルセオグリフロジン"
      genericKey: "luseogliflozin"
      handlingTags:
        - "dose_adjustment_supported"
      aliases:
        - "るせふぃ"
      normalizedAliases:
        - "るせふぃ"

    デベルザ:
      displayName: "デベルザ"
      genericName: "トホグリフロジン"
      displayGenericName: "トホグリフロジン"
      genericKey: "tofogliflozin"
      handlingTags: []
      aliases:
        - "でべるざ"
      normalizedAliases:
        - "でべるざ"

  aliasToBrand:
    "ふぉしーが": "フォシーガ"
    "じゃでぃあんす": "ジャディアンス"
    "かなぐる": "カナグル"
    "すーぐら": "スーグラ"
    "るせふぃ": "ルセフィ"
    "でべるざ": "デベルザ"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。6件・6件で一致。
  # 成分名読み（だぱぐりふろじん 等）は module 単位 nameAliases 側のみに存在し
  # brandCatalog.aliases には複製していないため、aliasToBrand の対象外
  # （dm_dpp4_oral / dm_sulfonylurea_oral と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["sglt2_dm_oral", {genericKeyと同一の成分タグ}] の2件で統一
  # （dm_dpp4_oral / dm_sulfonylurea_oral と同型）。

drugResolution:
  brandToTags:
    フォシーガ:
      - "sglt2_dm_oral"
      - "dapagliflozin"
    ジャディアンス:
      - "sglt2_dm_oral"
      - "empagliflozin"
    カナグル:
      - "sglt2_dm_oral"
      - "canagliflozin"
    スーグラ:
      - "sglt2_dm_oral"
      - "ipragliflozin"
    ルセフィ:
      - "sglt2_dm_oral"
      - "luseogliflozin"
    デベルザ:
      - "sglt2_dm_oral"
      - "tofogliflozin"

composition:
  classKey: "sglt2_dm"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  # 用途分離方針（ユーザー確定・2026-07-09）により "sglt2_oral" ではなく
  # "sglt2_dm_oral" とする。将来の cardiorenal_sglt2_oral は
  # classKey="sglt2_cardiorenal" / nodeKey="sglt2_cardiorenal_oral" とする想定。
  nodeKey: "sglt2_dm_oral"
  priority: "chronic"

display:
  nodeKey: "sglt2_dm_oral"
  nodeLabelShort: "SGLT2"
  nodeLabelLong: "SGLT2阻害薬（糖尿病）"
  # nodeLabelLong に用途区分「（糖尿病）」を明示する（ユーザー確定・2026-07-09）。
  # 将来の cardiorenal_sglt2_oral 作成時は nodeLabelLong を
  # 「SGLT2阻害薬（心不全・腎疾患）」等、用途区分が識別できる値にする想定。

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId（dm_sglt2_oral）/ brandNames（フォシーガ・ジャディアンス・カナグル・
#    スーグラ・ルセフィ・デベルザ） → ユーザー指定どおり確定（2026-07-09）
# 2. SGLT2阻害薬は用途別にモジュールを分離する方針 → ユーザー確定（2026-07-09）。
#    本モジュールは糖尿病治療目的専用。心不全・腎疾患治療目的は将来
#    cardiorenal_sglt2_oral として別途作成する。
# 3. composition.classKey（"sglt2_dm"）/ nodeKey（"sglt2_dm_oral"）
#    → ユーザー確定（2026-07-09）。用途分離により class-level S 統合を防止する
#    （DP-02）。将来 cardiorenal_sglt2_oral 側は classKey="sglt2_cardiorenal" /
#    nodeKey="sglt2_cardiorenal_oral" とする想定（当該モジュール作成時に再確定）。
# 4. categoryPath「内服」taxonomy → dm_dpp4_oral / dm_sulfonylurea_oral の
#    既存単剤モジュールと同型で確定
# 5. drugClass 単一結合定数「SGLT2_INHIBITOR」 → DPP4_INHIBITOR / SULFONYLUREA と
#    同型の命名規則で確定
# 6. brandCatalog 6ブランド・各ブランド固有genericKey構成 → dm_dpp4_oral /
#    dm_sulfonylurea_oral（各ブランドが異なる成分を持つ単剤構成）と同型で確定
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ） → DP-09 に基づき dm_dpp4_oral / dm_sulfonylurea_oral
#    と同型の理由で確定
# 8. drugResolution.brandToTags → dm_dpp4_oral / dm_sulfonylurea_oral と同型の
#    2件構成（["sglt2_dm_oral", {genericKey}]）で確定
# 9. display.nodeLabelLong に用途区分「（糖尿病）」を明示 → ユーザー確定
#    （2026-07-09）。primaryDisplayName / genericName には用途区分を付けない
#    （{{drug_subject}} フォールバック解決・検索候補到達性への影響を避けるため）。
# 10. handlingTags → ユーザー確定（2026-07-09）。増量・減量シナリオの表示可否を
#     "dose_adjustment_supported" タグで制御する。
#     付与（増減あり）: フォシーガ／ジャディアンス／スーグラ／ルセフィ
#     タグ不在（増減なし）: カナグル／デベルザ
#     将来のシナリオ作成時、増量・減量シナリオ（dose_increase_* / dose_decrease_*）
#     に scenarioRequiredTags: ["dose_adjustment_supported"] を付与する前提とする
#     （dm_dpp4_oral の dpp4_standard_titration と同型の運用）。
#     心不全・腎疾患用途の情報は本タグに混入しない。
# 11. addon_hyperkalemia_guidance の重複定義解消 → ユーザー確定（2026-07-11）。
#     ユーザー提供の SCENARIOS 本文に、initial 直後・se_hypo_none 直後の2箇所で
#     内容完全一致の重複定義があったため、initial 直後の定義を正本として残し、
#     se_hypo_none 直後の重複ブロックのみ削除した（dm_sulfonylurea_oral bridge
#     作成時の同型対応を踏襲）。se_hypo_none の P_ADDON 参照（addon_hyperkalemia_guidance
#     を含む）・ADDON本文そのものは変更していない。S/O/A(下記12を除く)/P 本文も
#     変更していない。
# 12. se_hypo_none の A 文言修正 → ユーザー確定（2026-07-11）。
#     変更前: "SGLT2阻害薬（糖尿病）による低血糖症状は現時点で認められず、治療継続が可能である。"
#     変更後: "SGLT2阻害薬（糖尿病）を含む糖尿病治療中の低血糖症状は現時点で認められず、治療継続が可能である。"
#     理由: SGLT2阻害薬単剤では低血糖が起こりにくいが、他の糖尿病治療薬併用時は
#     低血糖が起こりうる旨を A 記録として明確化するため（P文言の「単剤では
#     低血糖は起こりにくい薬ですが、他の糖尿病薬と併用中は低血糖が起こることが
#     あります」という既存記述と整合させる）。
# 13. 増量・減量に関係する7シナリオへの scenarioRequiredTags 付与方針 →
#     ユーザー確定（2026-07-11）。対象シナリオ:
#     dose_increase_low_perceived_effect / dose_increase_no_lab_improvement /
#     dose_increase_due_to_other_med_adjustment / dose_decrease_improved /
#     dose_decrease_low_perceived_effect / dose_decrease_due_to_other_med_adjustment /
#     se_dose_decrease_due_to_urinary_frequency
#     上記7件は、PN3A（Scenario Classification）着手時に
#     scenarioRequiredTags: ["dose_adjustment_supported"] を付与する。
#     brandCatalog.handlingTags（上記10）により、フォシーガ／ジャディアンス／
#     スーグラ／ルセフィのみ表示され、カナグル／デベルザでは非表示になる設計。
#     本 bridge 段階ではシナリオ本文にタグを追加しない（PN3A の責務。
#     bridge SCENARIOS 本文への scenarioRequiredTags 付与は dm_dpp4_oral の
#     dose_increase_* 系シナリオヘッダー記載例と同型で、PN1後のいずれかの
#     段階で反映する）。
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-11 時点、本 bridge の SCENARIOS 本文追加に関する未確定事項はなし）
#
# =========================================
# 将来拡張事項（今回の DRAFT 化では扱わない・スコープ外）
# =========================================
#
# - cardiorenal_sglt2_oral（心不全・腎疾患目的）の新規bridge作成
#   （classKey="sglt2_cardiorenal" / nodeKey="sglt2_cardiorenal_oral" 想定）
# - handlingTags への追加タグ（腎機能に応じた減量制御等）: 臨床的な差分の
#   有無を確認したうえで必要に応じて追加する
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定の6ブランドのみを扱う

# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: DRAFT）
# =========================================

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=SGLT2阻害薬（糖尿病） 初回】
S
SGLT2阻害薬（糖尿病）は、血糖値が高いため追加となった。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）は、血糖コントロール不十分のため追加となった。
尿中への糖排泄を促進することで、血糖コントロールの改善が期待される。
P
SGLT2阻害薬（糖尿病）は、尿から糖を排出しやすくすることで血糖値を改善する薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=side_effect_guidance｜id=addon_se_genitourinary_guidance｜title=副作用注意喚起（尿路・性器感染症）】
P_APPEND
SGLT2阻害薬（糖尿病）の継続中に、陰部のかゆみ、排尿時の痛み、残尿感、発熱などが現れることがあります。
このような症状があれば、お早めにご相談ください。


【ADDON｜type=sickday_guidance｜id=addon_sglt2_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水やケトアシドーシスのリスクが高まります。
このような体調不良時はSGLT2阻害薬（糖尿病）を休薬してください。
医師から水分制限を指示されていない場合は、水分を少量ずつこまめに摂取してください。
嘔吐が続く、水分が摂れない、尿量が減る、吐き気・腹痛・強い倦怠感・息苦しさなどがある場合は受診してください。
服用の再開時期については、自己判断せず処方医へご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_initial｜title=生活指導（血糖指導）】
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。


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






【SCENARIO｜type=treatment_start｜id=restart｜title=SGLT2阻害薬（糖尿病） 再開】
S
SGLT2阻害薬（糖尿病）は、血糖値が高いため再開となった。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）は、血糖コントロール不十分のため再開となった。
尿中への糖排泄を促進することで、血糖コントロールの改善が期待される。
P
SGLT2阻害薬（糖尿病）は、尿から糖を排出しやすくすることで血糖値を改善する薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=SGLT2阻害薬（糖尿病） 他所開始】
S
SGLT2阻害薬（糖尿病）は、他院で開始され継続使用中であった。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）は、血糖コントロール改善を目的として使用中であった。
尿中への糖排泄を促進することで、血糖コントロールの改善が期待される。
P
SGLT2阻害薬（糖尿病）は、尿から糖を排出しやすくすることで血糖値を改善する薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=SGLT2阻害薬（糖尿病） 増量（効果実感乏しい）】
S
SGLT2阻害薬（糖尿病）は、効果の実感が乏しいため増量となった。
O
SGLT2阻害薬（糖尿病）　増量
A
SGLT2阻害薬（糖尿病）は、効果不十分のため増量となった。増量後の効果および副作用の経過確認が必要である。
P
SGLT2阻害薬（糖尿病）の増量後は尿量が増えたり、のどが渇きやすくなることがあります。
尿量の増加や強い口の渇きが続く場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=SGLT2阻害薬（糖尿病） 増量（検査値改善なし）】
S
SGLT2阻害薬（糖尿病）は、検査値が改善しないため増量となった。
O
SGLT2阻害薬（糖尿病）　増量
A
SGLT2阻害薬（糖尿病）は、検査値の改善が不十分なため増量となった。増量後の効果および副作用の経過確認が必要である。
P
SGLT2阻害薬（糖尿病）の増量後は尿量が増えたり、のどが渇きやすくなることがあります。
尿量の増加や強い口の渇きが続く場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=SGLT2阻害薬（糖尿病） 増量（他剤との調整）】
S
SGLT2阻害薬（糖尿病）は、他剤変更に伴う調整により増量となった。
O
SGLT2阻害薬（糖尿病）　増量
A
SGLT2阻害薬（糖尿病）は、他剤変更に伴う調整のため増量となった。増量後の効果および副作用の経過確認が必要である。
P
SGLT2阻害薬（糖尿病）の増量後は尿量が増えたり、のどが渇きやすくなることがあります。
尿量の増加や強い口の渇きが続く場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=SGLT2阻害薬（糖尿病） 減量（検査値改善）】
S
SGLT2阻害薬（糖尿病）は、検査値が改善したため減量となった。
O
SGLT2阻害薬（糖尿病）　減量
A
SGLT2阻害薬（糖尿病）は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
SGLT2阻害薬（糖尿病）は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=SGLT2阻害薬（糖尿病） 減量（効果実感乏しい）】
S
SGLT2阻害薬（糖尿病）は、効果の実感が乏しいため減量を希望された。
O
SGLT2阻害薬（糖尿病）　減量
A
SGLT2阻害薬（糖尿病）は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
SGLT2阻害薬（糖尿病）は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=SGLT2阻害薬（糖尿病） 減量（他剤との調整）】
S
SGLT2阻害薬（糖尿病）は、他剤変更に伴う調整のため減量となった。
O
SGLT2阻害薬（糖尿病）　減量
A
SGLT2阻害薬（糖尿病）は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
SGLT2阻害薬（糖尿病）は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=SGLT2阻害薬（糖尿病） 副作用なし（低血糖）】
S
SGLT2阻害薬（糖尿病）を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）を含む糖尿病治療中の低血糖症状は現時点で認められず、治療継続が可能である。
P
SGLT2阻害薬（糖尿病）の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
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






【SCENARIO｜type=side_effect｜id=se_urinary_frequency_none｜title=SGLT2阻害薬（糖尿病） 副作用なし（頻尿）】
S
SGLT2阻害薬（糖尿病）を服用して症状は落ち着いている。
排尿回数の増加は気にならない。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）による頻尿は日常生活上問題となっておらず、治療継続が可能である。
P
SGLT2阻害薬（糖尿病）の継続中は、尿量が増えたり、トイレが近くなることがあります。
日常生活に支障がある場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dehydration_none｜title=SGLT2阻害薬（糖尿病） 副作用なし（脱水）】
S
SGLT2阻害薬（糖尿病）を服用して症状は落ち着いている。
強い口渇やふらつきは認めない。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）による脱水は現時点で認められず、治療継続が可能である。
P
SGLT2阻害薬（糖尿病）の継続中は、脱水を起こすことがあります。
こまめな水分補給を心がけてください。
強い口の渇きやふらつき、尿量の減少などが続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_genitourinary_infection_none｜title=SGLT2阻害薬（糖尿病） 副作用なし（尿路・性器感染症）】
S
SGLT2阻害薬（糖尿病）を服用して症状は落ち着いている。
陰部のかゆみや排尿時の痛み、残尿感は認めない。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）による尿路・性器感染症は現時点で認められず、治療継続が可能である。
P
SGLT2阻害薬（糖尿病）の継続中に、陰部のかゆみ、排尿時の痛み、残尿感、発熱などが現れることがあります。
このような症状があれば、お早めにご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=SGLT2阻害薬（糖尿病） CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
SGLT2阻害薬（糖尿病）　服用中
A
コンプライアンスは良好である。治療継続に問題はない。
P
引き続き用法を守って服用することで、血糖コントロールの維持および合併症予防が期待できます。
今後も継続して服用できるようにすることが大切です。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=SGLT2阻害薬（糖尿病） CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
SGLT2阻害薬（糖尿病）　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することで血糖コントロールの維持が期待されます。
服薬忘れが続くと血糖値が不安定となる可能性があります。
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






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=SGLT2阻害薬（糖尿病） CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
SGLT2阻害薬（糖尿病）　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=SGLT2阻害薬（糖尿病） CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した服用に不安がある。
O
SGLT2阻害薬（糖尿病）　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=SGLT2阻害薬（糖尿病） 終了（改善）】
S
SGLT2阻害薬（糖尿病）は、血糖コントロールが改善したため中止となった。
O
SGLT2阻害薬（糖尿病）　処方終了
A
SGLT2阻害薬（糖尿病）は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
SGLT2阻害薬（糖尿病）終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=SGLT2阻害薬（糖尿病） 終了（効果不十分）】
S
SGLT2阻害薬（糖尿病）は、効果不十分のため中止となった。
O
SGLT2阻害薬（糖尿病）　処方終了
A
SGLT2阻害薬（糖尿病）は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
SGLT2阻害薬（糖尿病）終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=SGLT2阻害薬（糖尿病） 終了（無効）】
S
SGLT2阻害薬（糖尿病）は、効果が認められなかったため中止となった。
O
SGLT2阻害薬（糖尿病）　処方終了
A
SGLT2阻害薬（糖尿病）は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
SGLT2阻害薬（糖尿病）終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=SGLT2阻害薬（糖尿病） SE継続（軽症 頻尿）】
S
SGLT2阻害薬（糖尿病）の服用によりトイレが近くなったが、日常生活は送れている。
O
SGLT2阻害薬（糖尿病）　処方
A
SGLT2阻害薬（糖尿病）による頻尿を軽度認めるが、治療継続が可能である。
P
SGLT2阻害薬（糖尿病）により尿量が増えたり、トイレが近くなることがあります。
頻尿が軽く、日常生活に支障がなければ、経過を確認しながら継続できます。
日常生活に支障がある場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_urinary_frequency｜title=SGLT2阻害薬（糖尿病） SE変更（頻尿）】
S
SGLT2阻害薬（糖尿病）の服用によりトイレが近くなったため、他剤へ変更となった。
O
SGLT2阻害薬（糖尿病）　処方変更
A
SGLT2阻害薬（糖尿病）の服用による頻尿を認め、他剤変更後の経過確認を要する。
P
SGLT2阻害薬（糖尿病）の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_urinary_frequency｜title=SGLT2阻害薬（糖尿病） SE減量（頻尿）】
S
SGLT2阻害薬（糖尿病）の服用によりトイレが近くなったため、減量となった。
O
SGLT2阻害薬（糖尿病）　減量
A
SGLT2阻害薬（糖尿病）の服用による頻尿を認め、減量後の経過確認を要する。
P
SGLT2阻害薬（糖尿病）の減量後も頻尿が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_urinary_frequency｜title=SGLT2阻害薬（糖尿病） SE中止（頻尿）】
S
SGLT2阻害薬（糖尿病）の服用によりトイレが近くなったため、中止となった。
O
SGLT2阻害薬（糖尿病）　処方中止
A
SGLT2阻害薬（糖尿病）の服用による頻尿を認め、中止後の経過確認を要する。
P
SGLT2阻害薬（糖尿病）の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=SGLT2阻害薬（糖尿病） 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
SGLT2阻害薬（糖尿病）　処方
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






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=SGLT2阻害薬（糖尿病） 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
SGLT2阻害薬（糖尿病）　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=SGLT2阻害薬（糖尿病） シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
SGLT2阻害薬（糖尿病）　服用中
A
食事および水分摂取の低下により、脱水やケトアシドーシスのリスクが上昇している。シックデイ時の休薬および受診判断が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、SGLT2阻害薬（糖尿病）を休薬してください。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
血糖値がそれほど高くなくても、強い倦怠感、吐き気、腹痛、息苦しさなどがある場合は、ケトアシドーシスの可能性があります。
嘔吐が続く、水分が摂れない、尿量が減る、吐き気・腹痛・強い倦怠感・息苦しさなどがある場合は受診してください。
再開時期については、自己判断せず処方医へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======
