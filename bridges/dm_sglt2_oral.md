# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_sglt2_oral
# =========================================
#
# ⚠️ STATUS: HEADER_ONLY ⚠️
#
# ヘッダー案（drug / composition / display 等）のみ作成済み。
# SCENARIOS_START〜SCENARIOS_END は未作成（本ファイルでは扱わない）。
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
# 次の作業: SCENARIOS_START〜SCENARIOS_END の作成（本ファイルはヘッダーのみで
# 完結し、シナリオ本文追加後にユーザーが凍結宣言し STATUS を FROZEN_FOR_PN1 へ
# 更新する。prompts/vNext/HANDOFF.md の「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤・複数ブランド構成の直近実績。各ブランドが
#     異なる成分を持つ場合の brandCatalog / genericKey 個別付与・成分名読みを
#     module 単位 nameAliases のみに留める設計の直接参考）
#   - bridges/dm_sulfonylurea_oral.md（単剤・複数ブランド構成の直近実績。
#     handlingTags を今回のヘッダー段階では空配列とする判断の直接参考）
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
  # handlingTags は今回のヘッダー段階では全ブランド空配列とする
  # （ブランド間の腎機能・重篤度差分に基づく scenarioRequiredTags 制御が
  # 必要かどうかは、SCENARIOS作成時に臨床的な差分の有無を確認したうえで判断する。
  # dm_sulfonylurea_oral / dm_thiazolidinedione_pioglitazone_oral と同型の先送り）。
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

    スーグラ:
      displayName: "スーグラ"
      genericName: "イプラグリフロジン"
      displayGenericName: "イプラグリフロジン"
      genericKey: "ipragliflozin"
      handlingTags: []
      aliases:
        - "すーぐら"
      normalizedAliases:
        - "すーぐら"

    ルセフィ:
      displayName: "ルセフィ"
      genericName: "ルセオグリフロジン"
      displayGenericName: "ルセオグリフロジン"
      genericKey: "luseogliflozin"
      handlingTags: []
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
# 10. handlingTags → 6ブランドとも空配列で確定。ブランド間の腎機能・重篤度差分に
#     基づく scenarioRequiredTags 制御が必要かどうかは、SCENARIOS作成時に判断する
#     （dm_sulfonylurea_oral と同型の先送り）。
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
# - cardiorenal_sglt2_oral（心不全・腎疾患目的）の新規bridge作成
#   （classKey="sglt2_cardiorenal" / nodeKey="sglt2_cardiorenal_oral" 想定）
# - handlingTags（ブランド間の腎機能・重篤度差分等の制御用タグ）: SCENARIOS作成時に
#   臨床的な差分の有無を確認したうえで必要に応じて追加する
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
# - GEブランドの追加: 現時点ではユーザー指定の6ブランドのみを扱う
