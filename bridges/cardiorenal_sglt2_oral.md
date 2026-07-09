# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# cardiorenal_sglt2_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成（本ファイルでは扱わない）。
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
# 次の作業: SCENARIOS_START〜SCENARIOS_END の作成（本ファイルはヘッダーのみで
# 完結し、シナリオ本文追加後にユーザーが凍結宣言し STATUS を FROZEN_FOR_PN1 へ
# 更新する。prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
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
  # handlingTags: 原則空配列（ユーザー確定・2026-07-09）。
  #   本モジュールは増量・減量シナリオを基本作成しない前提のため、
  #   dm_sglt2_oral 側の "dose_adjustment_supported" タグは付与しない
  #   （糖尿病用増減量制御タグの混入防止）。将来、心不全・腎疾患用途固有の
  #   制御タグが必要になった場合は SCENARIOS作成時に個別検討する。
  brandCatalog:
    フォシーガ:
      displayName: "フォシーガ"
      genericName: "ダパグリフロジン"
      displayGenericName: "ダパグリフロジン"
      genericKey: "dapagliflozin"
      handlingTags: []
      aliases:
        - "ふぉしーが"
      normalizedAliases:
        - "ふぉしーが"

    ジャディアンス:
      displayName: "ジャディアンス"
      genericName: "エンパグリフロジン"
      displayGenericName: "エンパグリフロジン"
      genericKey: "empagliflozin"
      handlingTags: []
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
# 10. handlingTags → 3ブランドとも空配列で確定（ユーザー確定・2026-07-09）。
#     増量・減量シナリオは基本作成しない前提のため、dm_sglt2_oral 側の
#     "dose_adjustment_supported" タグは付与しない。
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
# - SCENARIOS_START〜SCENARIOS_END の作成（本ファイルはヘッダーのみ）
# - スーグラ／ルセフィ／デベルザの心不全・腎疾患用途での収載要否:
#   現時点では対象外。臨床的なエビデンス・適応追加等の状況変化があれば
#   ユーザー判断のもと改めて検討する
# - handlingTags（心不全・腎疾患用途固有の制御タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定の3ブランドのみを扱う
