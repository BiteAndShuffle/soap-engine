# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# cardiorenal_sglt2_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー（drug / composition / display 等）および SCENARIOS_START〜
# SCENARIOS_END（シナリオ本文・ADDON本文、21シナリオ・13ADDON）作成済み。
# ブランド別適応制御（handlingTags / scenarioRequiredTags 付与予定）も確定済み。
#
# 目的: 心不全・腎疾患治療目的の SGLT2阻害薬（フォシーガ／ジャディアンス／
# カナグル）の brandCatalog / alias / drugResolution.brandToTags /
# composition / display 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-09 作成）。
#
# 用途分離方針（bridges/dm_sglt2_oral.md からの継続・ユーザー確定）:
#   SGLT2阻害薬は用途別にモジュールを分ける。
#   本モジュール（cardiorenal_sglt2_oral）は心不全・腎疾患治療目的専用。
#   糖尿病治療目的は別モジュール dm_sglt2_oral（既存・HEADER_ONLY）で扱う。
#   同一ブランド（フォシーガ／ジャディアンス／カナグル）が両モジュールに
#   存在するが、S/A/P の主眼（糖尿病 vs 心不全・腎疾患）が異なるため、
#   composition.classKey / nodeKey を用途別に分離し class-level S 統合を防止する
#   （docs/DESIGN_PRINCIPLES.md DP-02）。
#
#   dm_sglt2_oral 側:  classKey="sglt2_dm"          nodeKey="sglt2_dm_oral"
#   本モジュール:      classKey="sglt2_cardiorenal"  nodeKey="sglt2_cardiorenal_oral"
#
# ブランド収載方針（ユーザー確定・2026-07-09）:
#   収載: フォシーガ（ダパグリフロジン）／ジャディアンス（エンパグリフロジン）／
#         カナグル（カナグリフロジン）
#   非収載: スーグラ／ルセフィ／デベルザ
#     → 現時点で心不全・腎疾患用途として扱う対象外のため、誤選択防止のため
#       brandNames / brandCatalog / aliasToBrand / brandToTags いずれにも含めない
#       （bridge ヘッダーの時点で対象外ブランドの alias 到達性を作らない）。
#
# search.primaryDisplayName の分離方針（ユーザー確定・2026-07-09）:
#   dm_sglt2_oral 側の primaryDisplayName は "SGLT2阻害薬"（用途区分なし）。
#   本モジュールが "SGLT2阻害薬" を primaryDisplayName に重複させると、
#   汎用クエリ「SGLT2阻害薬」に対する完全一致スコア（lib/search.ts scoreEntry:
#   primaryDisplayNameNorm 完全一致 → score 6）が両モジュールで並び、
#   dm_sglt2_oral 側を標準候補にする既存方針（dm_sglt2_oral bridge 確定事項9）が
#   崩れる。本モジュールは primaryDisplayName に用途区分を含めた
#   "SGLT2阻害薬（心不全・腎疾患）" を用い、汎用クエリでは dm_sglt2_oral が
#   標準候補のまま残るようにする（誤選択防止の一環）。
#   drug.genericName（{{drug_subject}} フォールバック解決に使われる）は
#   dm_sglt2_oral と同様に用途区分なしの "SGLT2阻害薬" のまま据え置く
#   （SOAP文中への挿入で不自然にならないようにするため）。
#
# 状態: PN1〜PN8完了・canonical JSON生成済み・registry登録済み
# （commit ad6e8056b3a3590b5a4f675379e17efca016a0d4）。次の作業なし。
#
# 参照:
#   - bridges/dm_sglt2_oral.md（用途分離の兄弟モジュール。classKey/nodeKey
#     分離方針・primaryDisplayName 分離方針の直接参考元）
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の直近実績。各ブランドが
#     異なる成分を持つ場合の brandCatalog / genericKey 個別付与・成分名読みを
#     module 単位 nameAliases のみに留める設計の直接参考）
#   - docs/DESIGN_PRINCIPLES.md DP-02（classKey設計方針。用途分離によるS統合防止）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §8（drug.nameAliases と drug.search.nameAliases 完全一致）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "cardiorenal_sglt2_oral"

categoryPath:
  - "心不全・腎疾患"
  - "SGLT2阻害薬"
  - "内服"

drug:
  # genericName はクラス名を採用（dm_sglt2_oral と同型。
  # {{drug_subject}} のフォールバック解決先にも使われるため、
  # 用途区分「（心不全・腎疾患）」等の修飾は付けない（drugSubject.ts 参照）。
  # 実際の成分名は brandCatalog[brand].genericName 側に格納する）
  genericName: "SGLT2阻害薬"

  brandNames:
    - "フォシーガ"
    - "ジャディアンス"
    - "カナグル"
  # スーグラ／ルセフィ／デベルザは非収載（誤選択防止方針。上記ヘッダー冒頭参照）。

  drugClass:
    - "SGLT2_INHIBITOR"

  route: "oral"

  dosageForms:
    - "tablet"
  # tablet で確定。OD錠等の詳細剤形は今回のヘッダーでは扱わない
  # （dm_sglt2_oral と同様、将来必要になった時点で別途拡張する）。

  drugSpecificTags:
    - "sglt2_cardiorenal_oral"
  # 用途分離方針に合わせ "sglt2_oral" ではなく "sglt2_cardiorenal_oral" とする
  # （drugResolution.brandToTags の共通タグとしても使用。dm_sglt2_oral 側の
  # "sglt2_dm_oral" とは別値）。

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-09）
  # ─────────────────────────────────────────
  # ブランド名読み・成分名読みはいずれも kataToHira による機械的な
  # ひらがな変換のみ（推測なし）。dm_sglt2_oral のフォシーガ／ジャディアンス／
  # カナグルと同一の読みを使用する（ブランド名・成分名自体は用途に依存しないため）。
  #
  # 成分名読みの扱い（dm_sglt2_oral と同型の判断）:
  #   3ブランドはいずれも互いに異なる成分を持つ単剤構成であり、
  #   displayGenericName が resolveAllHighPrecisionBrands で解決されるため
  #   （DP-09）、成分名読みを brandCatalog[brand].aliases へ複製する必要はない。
  #   成分名読みは module 単位の prefixAliases/nameAliases にのみ追加する。
  #
  # primaryDisplayName は用途区分を含めた "SGLT2阻害薬（心不全・腎疾患）" とする
  # （上記ヘッダー冒頭「primaryDisplayName の分離方針」参照。dm_sglt2_oral 側の
  # 標準候補としての優先度を維持するための意図的な差別化）。
  search:
    primaryDisplayName: "SGLT2阻害薬（心不全・腎疾患）"

    exactAliases:
      - "フォシーガ"
      - "ジャディアンス"
      - "カナグル"

    prefixAliases:
      - "ふぉしーが"
      - "じゃでぃあんす"
      - "かなぐる"
      - "だぱぐりふろじん"
      - "えんぱぐりふろじん"
      - "かなぐりふろじん"

    nameAliases:
      - "ふぉしーが"
      - "じゃでぃあんす"
      - "かなぐる"
      - "だぱぐりふろじん"
      - "えんぱぐりふろじん"
      - "かなぐりふろじん"

    keywords: []
    # 糖尿病用途の keyword は追加しない（用途混入防止方針）。

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "ふぉしーが"
    - "じゃでぃあんす"
    - "かなぐる"
    - "だぱぐりふろじん"
    - "えんぱぐりふろじん"
    - "かなぐりふろじん"
  # drug.search.nameAliases と完全一致（順序・表記・件数、RULES.md §8）。

  # ─────────────────────────────────────────
  # brandCatalog: 3 ブランド（それぞれ異なる成分の単剤）
  # ─────────────────────────────────────────
  # genericKey 命名規則: 成分名の英語スネークケース（PN2-Drug-Header.md 準拠、
  # dm_sglt2_oral / dm_dpp4_oral と同型）。
  #
  # handlingTags: 適応範囲制御タグを付与（ユーザー確定・2026-07-14。
  #   2026-07-09時点の空配列決定を更新）。
  #   増量・減量シナリオは引き続き基本作成しない前提のため、dm_sglt2_oral 側の
  #   "dose_adjustment_supported" タグは付与しない（糖尿病用増減量制御タグの
  #   混入防止方針は変更なし）。心不全・腎疾患シナリオの表示制御に用いる
  #   "heart_failure_supported" / "ckd_supported" を付与する。
  #   詳細は下記「適応範囲の設計意図」「scenarioRequiredTags 付与予定」および
  #   確定済み事項11・12を参照。
  brandCatalog:
    フォシーガ:
      displayName: "フォシーガ"
      genericName: "ダパグリフロジン"
      displayGenericName: "ダパグリフロジン"
      genericKey: "dapagliflozin"
      handlingTags:
        - "heart_failure_supported"
        - "ckd_supported"
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
        - "heart_failure_supported"
        - "ckd_supported"
      aliases:
        - "じゃでぃあんす"
      normalizedAliases:
        - "じゃでぃあんす"

    カナグル:
      displayName: "カナグル"
      genericName: "カナグリフロジン"
      displayGenericName: "カナグリフロジン"
      genericKey: "canagliflozin"
      handlingTags:
        - "ckd_supported"
      aliases:
        - "かなぐる"
      normalizedAliases:
        - "かなぐる"

  # ─────────────────────────────────────────
  # 適応範囲の設計意図（ユーザー確定・2026-07-14）
  # ─────────────────────────────────────────
  # - フォシーガは慢性心不全・慢性腎臓病の両シナリオに対応する。
  # - ジャディアンスは慢性心不全・慢性腎臓病の両シナリオに対応する。
  # - カナグルは心不全シナリオには対応しない。
  # - カナグルの ckd_supported は「2型糖尿病を伴う慢性腎臓病」に限る。
  # - カナグルの ckd_supported は、非糖尿病CKDを含む一般的な慢性腎臓病適応を
  #   意味しない。
  # - 初期実装では薬剤師が患者背景と処方目的を判断してCKDシナリオを選択する。
  # - カナグル専用CKDシナリオの分離は現時点では行わない。
  #
  # ─────────────────────────────────────────
  # scenarioRequiredTags 付与予定（PN3A、ユーザー確定・2026-07-14）
  # ─────────────────────────────────────────
  # 本 bridge 段階では SCENARIOS 本文のシナリオヘッダーに
  # scenarioRequiredTags を追記しない（PN3A の責務）。付与予定は以下の通り。
  #   scenarioRequiredTags: ["heart_failure_supported"] を付与する3件:
  #     initial_heart_failure / restart_heart_failure /
  #     external_start_heart_failure
  #   scenarioRequiredTags: ["ckd_supported"] を付与する3件:
  #     initial_ckd / restart_ckd / external_start_ckd
  #   それ以外の15シナリオには scenarioRequiredTags を付与しない
  #   （3ブランド共通表示のまま）。

  aliasToBrand:
    "ふぉしーが": "フォシーガ"
    "じゃでぃあんす": "ジャディアンス"
    "かなぐる": "カナグル"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。3件・3件で一致。
  # 成分名読み（だぱぐりふろじん 等）は module 単位 nameAliases 側のみに存在し
  # brandCatalog.aliases には複製していないため、aliasToBrand の対象外
  # （dm_sglt2_oral と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["sglt2_cardiorenal_oral", {genericKeyと同一の成分タグ}] の
  # 2件で統一（dm_sglt2_oral と同型）。

drugResolution:
  brandToTags:
    フォシーガ:
      - "sglt2_cardiorenal_oral"
      - "dapagliflozin"
    ジャディアンス:
      - "sglt2_cardiorenal_oral"
      - "empagliflozin"
    カナグル:
      - "sglt2_cardiorenal_oral"
      - "canagliflozin"

composition:
  classKey: "sglt2_cardiorenal"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  # 用途分離方針（bridges/dm_sglt2_oral.md からの継続）により
  # dm_sglt2_oral 側（classKey="sglt2_dm" / nodeKey="sglt2_dm_oral"）とは
  # 別の classKey / nodeKey とする。
  nodeKey: "sglt2_cardiorenal_oral"
  priority: "chronic"

display:
  nodeKey: "sglt2_cardiorenal_oral"
  nodeLabelShort: "SGLT2(心腎)"
  nodeLabelLong: "SGLT2阻害薬（心不全・腎疾患）"
  # nodeLabelLong に用途区分「（心不全・腎疾患）」を明示する（ユーザー確定・
  # 2026-07-09）。dm_sglt2_oral 側の nodeLabelLong「SGLT2阻害薬（糖尿病）」と
  # 対になる値。

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId（cardiorenal_sglt2_oral）/ brandNames（フォシーガ・ジャディアンス・
#    カナグルの3件のみ、スーグラ／ルセフィ／デベルザは非収載） →
#    ユーザー指定どおり確定（2026-07-09）
# 2. SGLT2阻害薬は用途別にモジュールを分離する方針 → bridges/dm_sglt2_oral.md
#    作成時にユーザー確定済み（2026-07-09）。本モジュールはその心不全・腎疾患
#    治療目的側の実装。
# 3. composition.classKey（"sglt2_cardiorenal"）/ nodeKey
#    （"sglt2_cardiorenal_oral"） → ユーザー確定（2026-07-09）。dm_sglt2_oral
#    側（"sglt2_dm"/"sglt2_dm_oral"）とは別値とし class-level S 統合を防止する
#    （DP-02）。
# 4. categoryPath 先頭「心不全・腎疾患」 → 既存モジュールに前例がないため新設。
#    第2階層「SGLT2阻害薬」／第3階層「内服」は dm_sglt2_oral と同型で確定
#    （2026-07-09、既存 categoryPath taxonomy に「心不全」「腎疾患」の前例が
#    ないための新規カテゴリ）。
# 5. drugClass 単一結合定数「SGLT2_INHIBITOR」 → dm_sglt2_oral と同一成分クラス
#    のため同値で確定
# 6. brandCatalog 3ブランド・各ブランド固有genericKey構成 → dm_sglt2_oral の
#    該当3ブランドと同一の genericName/displayGenericName/genericKey/読みを使用
#    （ブランド名・成分名自体は用途に依存しないため）
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ） → DP-09 に基づき dm_sglt2_oral と同型の理由で確定
# 8. drugResolution.brandToTags → dm_sglt2_oral と同型の2件構成
#    （["sglt2_cardiorenal_oral", {genericKey}]）で確定
# 9. search.primaryDisplayName を "SGLT2阻害薬（心不全・腎疾患）" とし、
#    dm_sglt2_oral 側の "SGLT2阻害薬"（用途区分なし）とは意図的に差別化 →
#    ユーザー確定（2026-07-09）。汎用クエリでの標準候補を dm_sglt2_oral 側に
#    維持するための誤選択防止措置（上記ヘッダー冒頭参照）。drug.genericName は
#    {{drug_subject}} 解決用のため用途区分なし「SGLT2阻害薬」のまま据え置く。
# 10. handlingTags → ユーザー確定（2026-07-14。2026-07-09時点の空配列決定を
#     更新）。フォシーガ／ジャディアンスは ["heart_failure_supported",
#     "ckd_supported"]、カナグルは ["ckd_supported"] のみを付与する。
#     増量・減量シナリオは引き続き基本作成しない前提のため、dm_sglt2_oral 側の
#     "dose_adjustment_supported" タグは付与しない（この点は変更なし）。
# 11. 適応範囲の設計意図 → ユーザー確定（2026-07-14）。フォシーガ／
#     ジャディアンスは慢性心不全・慢性腎臓病の両シナリオに対応する。カナグルは
#     心不全シナリオに対応せず、ckd_supported は「2型糖尿病を伴う慢性腎臓病」
#     に限定する（非糖尿病CKDを含む一般的な慢性腎臓病適応は意味しない）。
#     初期実装では薬剤師が患者背景と処方目的を判断してCKDシナリオを選択する
#     前提とし、カナグル専用CKDシナリオの分離は現時点では行わない。
# 12. scenarioRequiredTags 付与予定（PN3A） → ユーザー確定（2026-07-14）。
#     initial_heart_failure / restart_heart_failure /
#     external_start_heart_failure の3件に ["heart_failure_supported"]、
#     initial_ckd / restart_ckd / external_start_ckd の3件に
#     ["ckd_supported"] を付与する。それ以外の15シナリオには付与しない。
#     本 bridge 段階では SCENARIOS 本文へ直接追記せず、PN3A の責務として扱う。
# 13. P_CLOSING内訳 → ユーザー確定（2026-07-14）。sickdayシナリオの
#     P_CLOSINGは既存のdefault_followup定型文のまま確定し、本文は変更しない。
#     内訳: default_followup 14件 / end_followup 3件 / se_followup 4件 /
#     既知対応表外 0件（全21シナリオ）。
# 14. PN1〜PN8完了・canonical JSON生成済み → 2026-07-14。
#     data/modules/cardiorenal_sglt2_oral.json 生成・registry登録済み
#     （data/modules/index.ts）。canonical JSON commit:
#     ad6e8056b3a3590b5a4f675379e17efca016a0d4。
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-14 時点。PN1〜PN8完了・canonical JSON生成済みの現在も
# 本 bridge のヘッダー・シナリオ設計に関する未確定事項はなし）。
#
# =========================================
# 将来拡張事項（今回のヘッダーでは扱わない・スコープ外）
# =========================================
#
# - スーグラ／ルセフィ／デベルザの心不全・腎疾患用途での収載要否:
#   現時点では対象外。臨床的なエビデンス・適応追加等の状況変化があれば
#   ユーザー判断のもと改めて検討する
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定の3ブランドのみを扱う
# - カナグル専用CKDシナリオの分離: 初期実装では行わない
#   （確定済み事項11参照。将来、臨床的必要性が生じた場合に改めて検討する）

# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: FROZEN_FOR_PN1）
# =========================================

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial_heart_failure｜title=SGLT2阻害薬（心不全・腎疾患） 初回（心不全）】
S
SGLT2阻害薬（心不全・腎疾患）は、心不全の治療のため追加となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）は、心不全の悪化を抑え、心臓への負担を軽減する目的で追加となった。
尿中への糖およびナトリウムの排泄を促し、体液量を調整することで、心不全の治療効果が期待される。
P
SGLT2阻害薬（心不全・腎疾患）は、体内の余分な水分を調整し、心臓への負担を軽くする薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
息苦しさやむくみ、急な体重増加などがみられた場合は、お早めにご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=side_effect_guidance｜id=addon_se_genitourinary_guidance｜title=副作用注意喚起（尿路・性器感染症）】
P_APPEND
SGLT2阻害薬（心不全・腎疾患）の継続中に、陰部のかゆみ、排尿時の痛み、残尿感、発熱などが現れることがあります。
このような症状があれば、お早めにご相談ください。


【ADDON｜type=sickday_guidance｜id=addon_sglt2_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水やケトアシドーシスのリスクが高まります。
このような体調不良時はSGLT2阻害薬（心不全・腎疾患）を休薬してください。
医師から水分制限を指示されていない場合は、水分を少量ずつこまめに摂取してください。
嘔吐が続く、水分が摂れない、尿量が減る、吐き気・腹痛・強い倦怠感・息苦しさなどがある場合は受診してください。
服用の再開時期については、自己判断せず処方医へご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_cardiorenal_sodium_guidance｜title=生活指導（塩分）】
P_APPEND
塩分を摂りすぎると、体内に水分がたまりやすくなり、心臓や腎臓へ負担がかかることがあります。
食事療法は、心臓や腎臓への負担を減らすうえで重要です。
塩分の摂りすぎに注意しましょう。
気になることがあればご相談ください。


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




【SCENARIO｜type=treatment_start｜id=initial_ckd｜title=SGLT2阻害薬（心不全・腎疾患） 初回（腎疾患）】
S
SGLT2阻害薬（心不全・腎疾患）は、腎機能の悪化を抑えるため追加となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）は、慢性腎臓病の進行を抑える目的で追加となった。
腎臓にかかる負担を軽減することで、腎機能低下の進行抑制が期待される。
P
SGLT2阻害薬（心不全・腎疾患）は、腎臓への負担を軽くし、腎機能の低下を緩やかにするための薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
定期的に腎機能などを確認しながら治療を継続します。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=restart_heart_failure｜title=SGLT2阻害薬（心不全・腎疾患） 再開（心不全）】
S
SGLT2阻害薬（心不全・腎疾患）は、心不全の治療のため再開となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）は、心不全の悪化を抑え、心臓への負担を軽減する目的で再開となった。
尿中への糖およびナトリウムの排泄を促し、体液量を調整することで、心不全の治療効果が期待される。
P
SGLT2阻害薬（心不全・腎疾患）は、体内の余分な水分を調整し、心臓への負担を軽くする薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
息苦しさやむくみ、急な体重増加などがみられた場合は、お早めにご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=restart_ckd｜title=SGLT2阻害薬（心不全・腎疾患） 再開（腎疾患）】
S
SGLT2阻害薬（心不全・腎疾患）は、腎機能の悪化を抑えるため再開となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）は、慢性腎臓病の進行を抑える目的で再開となった。
腎臓にかかる負担を軽減することで、腎機能低下の進行抑制が期待される。
P
SGLT2阻害薬（心不全・腎疾患）は、腎臓への負担を軽くし、腎機能の低下を緩やかにするための薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
定期的に腎機能などを確認しながら治療を継続します。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=external_start_heart_failure｜title=SGLT2阻害薬（心不全・腎疾患） 他所開始（心不全）】
S
SGLT2阻害薬（心不全・腎疾患）は、他院で開始され継続使用中であった。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）は、心不全の悪化を抑え、心臓への負担を軽減する目的で使用中であった。
尿中への糖およびナトリウムの排泄を促し、体液量を調整することで、心不全の治療効果が期待される。
P
SGLT2阻害薬（心不全・腎疾患）は、体内の余分な水分を調整し、心臓への負担を軽くする薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
息苦しさやむくみ、急な体重増加などがみられた場合は、お早めにご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=external_start_ckd｜title=SGLT2阻害薬（心不全・腎疾患） 他所開始（腎疾患）】
S
SGLT2阻害薬（心不全・腎疾患）は、他院で開始され継続使用中であった。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）は、慢性腎臓病の進行を抑える目的で使用中であった。
腎臓にかかる負担を軽減することで、腎機能低下の進行抑制が期待される。
P
SGLT2阻害薬（心不全・腎疾患）は、腎臓への負担を軽くし、腎機能の低下を緩やかにするための薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
定期的に腎機能などを確認しながら治療を継続します。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_urinary_frequency_none｜title=SGLT2阻害薬（心不全・腎疾患） 副作用なし（頻尿）】
S
SGLT2阻害薬（心不全・腎疾患）を服用して症状は落ち着いている。
排尿回数の増加は気にならない。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）による頻尿は日常生活上問題となっておらず、治療継続が可能である。
P
SGLT2阻害薬（心不全・腎疾患）の継続中は、尿量が増えたり、トイレが近くなることがあります。
日常生活に支障がある場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_ADDON
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




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




【SCENARIO｜type=side_effect｜id=se_dehydration_none｜title=SGLT2阻害薬（心不全・腎疾患） 副作用なし（脱水）】
S
SGLT2阻害薬（心不全・腎疾患）を服用して症状は落ち着いている。
強い口渇やふらつきは認めない。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）による脱水は現時点で認められず、治療継続が可能である。
P
SGLT2阻害薬（心不全・腎疾患）の継続中は、脱水を起こすことがあります。
こまめな水分補給を心がけてください。
強い口の渇きやふらつき、尿量の減少などが続く場合はご相談ください。
P_ADDON
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_genitourinary_infection_none｜title=SGLT2阻害薬（心不全・腎疾患） 副作用なし（尿路・性器感染症）】
S
SGLT2阻害薬（心不全・腎疾患）を服用して症状は落ち着いている。
陰部のかゆみや排尿時の痛み、残尿感は認めない。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）による尿路・性器感染症は現時点で認められず、治療継続が可能である。
P
SGLT2阻害薬（心不全・腎疾患）の継続中に、陰部のかゆみ、排尿時の痛み、残尿感、発熱などが現れることがあります。
このような症状があれば、お早めにご相談ください。
P_ADDON
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=SGLT2阻害薬（心不全・腎疾患） CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
SGLT2阻害薬（心不全・腎疾患）　服用中
A
コンプライアンスは良好である。治療継続に問題はない。
P
引き続き用法を守って服用することで、治療効果の維持が期待されます。
今後も継続して服用できるようにすることが大切です。
P_ADDON
- addon_cardiorenal_sodium_guidance
- addon_hyperkalemia_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=SGLT2阻害薬（心不全・腎疾患） CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
SGLT2阻害薬（心不全・腎疾患）　服用中
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




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=SGLT2阻害薬（心不全・腎疾患） CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
SGLT2阻害薬（心不全・腎疾患）　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=SGLT2阻害薬（心不全・腎疾患） CP不良（受診遅延）】
S
都合により受診遅延がみられる。
処方どおりの継続服用ができていない。
O
SGLT2阻害薬（心不全・腎疾患）　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_treatment_plan_change｜title=SGLT2阻害薬（心不全・腎疾患） 終了（治療方針変更）】
S
SGLT2阻害薬（心不全・腎疾患）は、治療方針の見直しにより中止となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方終了
A
SGLT2阻害薬（心不全・腎疾患）は、治療方針の見直しにより終了となった。終了後の治療経過を確認する必要がある。
P
終了後も体調変化や症状の変化がみられる場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=SGLT2阻害薬（心不全・腎疾患） 終了（効果不十分）】
S
SGLT2阻害薬（心不全・腎疾患）は、効果不十分のため中止となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方終了
A
SGLT2阻害薬（心不全・腎疾患）は、効果不十分のため終了となった。治療方針の再評価が必要である。
P
SGLT2阻害薬（心不全・腎疾患）終了後も治療経過を確認しながら、今後の治療方針について処方医とご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=SGLT2阻害薬（心不全・腎疾患） 終了（無効）】
S
SGLT2阻害薬（心不全・腎疾患）は、効果が認められなかったため中止となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方終了
A
SGLT2阻害薬（心不全・腎疾患）は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
SGLT2阻害薬（心不全・腎疾患）終了後も治療経過を確認しながら、代替治療について処方医とご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=SGLT2阻害薬（心不全・腎疾患） SE継続（軽症・頻尿）】
S
SGLT2阻害薬（心不全・腎疾患）の服用によりトイレが近くなったが、日常生活は送れている。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
SGLT2阻害薬（心不全・腎疾患）による頻尿を軽度認めるが、治療継続が可能である。
P
SGLT2阻害薬（心不全・腎疾患）により尿量が増えたり、トイレが近くなることがあります。
頻尿が軽く、日常生活に支障がなければ、経過を確認しながら継続できます。
日常生活に支障がある場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_urinary_frequency｜title=SGLT2阻害薬（心不全・腎疾患） SE変更（頻尿）】
S
SGLT2阻害薬（心不全・腎疾患）の服用によりトイレが近くなったため、他剤へ変更となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方変更
A
SGLT2阻害薬（心不全・腎疾患）の服用による頻尿を認め、他剤変更後の経過確認を要する。
P
SGLT2阻害薬（心不全・腎疾患）の変更後、体調変化や症状の変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_urinary_frequency｜title=SGLT2阻害薬（心不全・腎疾患） SE中止（頻尿）】
S
SGLT2阻害薬（心不全・腎疾患）の服用によりトイレが近くなったため、中止となった。
O
SGLT2阻害薬（心不全・腎疾患）　処方中止
A
SGLT2阻害薬（心不全・腎疾患）の服用による頻尿を認め、中止後の経過確認を要する。
P
SGLT2阻害薬（心不全・腎疾患）の中止後、体調変化や症状の変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=SGLT2阻害薬（心不全・腎疾患） 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
SGLT2阻害薬（心不全・腎疾患）　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=sickday｜id=sickday｜title=SGLT2阻害薬（心不全・腎疾患） シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
SGLT2阻害薬（心不全・腎疾患）　服用中
A
食事および水分摂取の低下により、脱水やケトアシドーシスのリスクが上昇している。シックデイ時の休薬および受診判断が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、SGLT2阻害薬（心不全・腎疾患）を休薬してください。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
血糖値がそれほど高くなくても、強い倦怠感、吐き気、腹痛、息苦しさなどがある場合は、ケトアシドーシスの可能性があります。
嘔吐が続く、水分が摂れない、尿量が減る、吐き気・腹痛・強い倦怠感・息苦しさなどがある場合は受診してください。
再開時期については、自己判断せず処方医へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。
=======SCENARIOS_END=======
