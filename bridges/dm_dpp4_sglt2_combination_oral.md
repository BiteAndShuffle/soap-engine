# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_dpp4_sglt2_combination_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー案（drug / composition / display 等）および SCENARIOS_START〜
# SCENARIOS_END（シナリオ本文・ADDON本文）は、ユーザーによる最終レビューを経て
# 2026-07-13 に凍結宣言されました。PN1 の入力として使用してよい状態です。
#
# 目的: DPP-4阻害薬・SGLT2阻害薬配合剤（カナリア／スージャヌ／トラディアンス）の
# brandCatalog / alias / drugResolution.brandToTags / composition / display 設計と
# SCENARIOS本文を、会話ログではなくリポジトリ上に固定するための作業ファイルです
# （2026-07-13 ヘッダー作成、同日SCENARIOS本文追加）。
#
# 用途方針:
#   本モジュールは2型糖尿病治療目的の内服配合剤として扱う。
#   心不全・腎疾患用途のシナリオ・keyword・検索語・表示情報は混入しない
#   （bridges/dm_sglt2_oral.md / bridges/cardiorenal_sglt2_oral.md の
#   用途分離方針を踏襲。ただし本モジュールは糖尿病治療目的のみを扱うため
#   cardiorenal 側の設計自体は参照しない）。
#
# genericKey 設計方針:
#   単剤側（dm_dpp4_oral / dm_sglt2_oral）の genericKey は流用しない。
#   各配合剤ブランドに専用の単一 combo キーを割り当てる（RULES.md §21）。
#   genericKeys: string[] のような複数成分配列構造は導入しない（Q-G1 未確定のため）。
#
# handlingTags 方針（確定・2026-07-13。SCENARIOS本文へ反映済み）:
#   増量・減量シナリオを表示するブランドはトラディアンスのみとする。
#   カナリア／スージャヌは handlingTags を空配列とし、トラゼンタ（dm_dpp4_oral）の
#   タグ不在運用と同様に、scenarioRequiredTagsが付与された増量・減量シナリオへ
#   到達できない設計とする（配合剤内での増量規格が存在しないため、減量シナリオも
#   含めて非表示とする）。
#   トラディアンスの増量・減量はAP／BP間の規格変更（増量: AP→BP、減量: BP→AP）を
#   想定する。採用する7シナリオ（下記「確定済み事項」15参照）にのみ
#   scenarioRequiredTags: ["dose_adjustment_supported"] をPN3A時点で付与する。
#
# 次の作業: PN1 開始（prompts/vNext/HANDOFF.md の
# 「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - bridges/dm_dpp4_oral.md（単剤DPP4・直近実績。テネリグリプチン／
#     シタグリプチン／リナグリプチンの読みの出典）
#   - bridges/dm_sglt2_oral.md（単剤SGLT2・直近実績。カナグリフロジン／
#     イプラグリフロジン／エンパグリフロジンの読みの出典。用途分離方針の直接参考）
#   - bridges/dm_dpp4_biguanide_combination_oral.md（既存配合剤実績・DPP4系配合剤。
#     categoryPath「配合剤」taxonomy・brandCatalog/aliasToBrand設計・
#     genericKey命名（"{DPP4成分}_{相手成分}_combo"）・drugResolution.brandToTags
#     2件構成の直接参考）
#   - bridges/dm_glinide_alpha_glucosidase_inhibitor_combination_oral.md（既存配合剤実績。
#     単一ブランド配合剤のhandlingTags空配列運用・成分名読みのmodule単位限定方針の参考）
#   - docs/DESIGN_PRINCIPLES.md DP-02（classKey設計方針。配合剤専用分離）
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §8（drug.nameAliases と drug.search.nameAliases 完全一致）
#   - prompts/RULES.md §10（aliasToBrand網羅）
#   - prompts/RULES.md §21（genericName/genericKey役割分離・配合剤専用キー）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_dpp4_sglt2_combination_oral"

# categoryPath は dm_dpp4_biguanide_combination_oral.md /
# dm_glinide_alpha_glucosidase_inhibitor_combination_oral.md の配合剤taxonomyに倣う
# （異なる薬効クラス同士の固定用量配合剤 → 2階層目「配合剤」）
categoryPath:
  - "糖尿病"
  - "配合剤"
  - "DPP-4阻害薬／SGLT2阻害薬配合剤"

drug:
  # genericName はクラス名（配合剤クラス表記）を採用。
  # 実際の成分名（2成分）は brandCatalog[brand].genericName 側に格納する
  # （既存配合剤4件と同型）
  genericName: "DPP-4阻害薬／SGLT2阻害薬配合剤"

  brandNames:
    - "カナリア"
    - "スージャヌ"
    - "トラディアンス"

  # drugClass は既存配合剤の単一結合定数パターンに倣う
  drugClass:
    - "DPP4_SGLT2_COMBINATION"

  route: "oral"

  dosageForms:
    - "tablet"
  # tablet で確定。カナリアには通常錠およびOD錠が存在するが、今回の初期モジュールでは
  # 両者を "tablet" として一括して扱い、剤形別のbrandCatalog分離・検索候補分離・
  # シナリオ表示制御は行わない（OD錠への個別対応は将来拡張事項）。
  # トラディアンスAP/BPの規格差についても本フィールドでは扱わない
  # （brandCatalog上で分離しない方針。下記「確定済み事項」参照）。

  drugSpecificTags:
    - "dpp4_sglt2_combination_oral"

  # ─────────────────────────────────────────
  # search セクション（確定・2026-07-13）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし）。
  #
  # 成分名読みの扱い（既存配合剤4件と同型の判断）:
  #   - てねりぐりぷちん（テネリグリプチン）／したぐりぷちん（シタグリプチン）／
  #     りなぐりぷちん（リナグリプチン）は bridges/dm_dpp4_oral.md の
  #     drug.search.nameAliases に確立済みの読みを流用
  #   - かなぐりふろじん（カナグリフロジン）／いぷらぐりふろじん（イプラグリフロジン）／
  #     えんぱぐりふろじん（エンパグリフロジン）は bridges/dm_sglt2_oral.md の
  #     drug.search.nameAliases に確立済みの読みを流用
  #   - 上記6件はいずれも module 単位の prefixAliases/nameAliases にのみ追加し、
  #     brandCatalog[brand].aliases への複製は行わない（各ブランドの成分ペアは
  #     互いに重複しないが、既存配合剤4件と同型の判断で module 単位限定を統一する。
  #     dm_glinide_alpha_glucosidase_inhibitor_combination_oral.md「確定済み事項」7 と
  #     同型の理由）
  search:
    primaryDisplayName: "DPP-4阻害薬／SGLT2阻害薬配合剤"

    exactAliases:
      - "カナリア"
      - "スージャヌ"
      - "トラディアンス"

    prefixAliases:
      - "かなりあ"
      - "すーじゃぬ"
      - "とらでぃあんす"
      - "てねりぐりぷちん"
      - "かなぐりふろじん"
      - "したぐりぷちん"
      - "いぷらぐりふろじん"
      - "りなぐりぷちん"
      - "えんぱぐりふろじん"

    nameAliases:
      - "かなりあ"
      - "すーじゃぬ"
      - "とらでぃあんす"
      - "てねりぐりぷちん"
      - "かなぐりふろじん"
      - "したぐりぷちん"
      - "いぷらぐりふろじん"
      - "りなぐりぷちん"
      - "えんぱぐりふろじん"

    keywords: []
    # 心不全・腎疾患用途の keyword は追加しない（用途混入防止方針）。

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "かなりあ"
    - "すーじゃぬ"
    - "とらでぃあんす"
    - "てねりぐりぷちん"
    - "かなぐりふろじん"
    - "したぐりぷちん"
    - "いぷらぐりふろじん"
    - "りなぐりぷちん"
    - "えんぱぐりふろじん"
  # drug.search.nameAliases と完全一致（順序・表記・件数、RULES.md §8）。

  # ─────────────────────────────────────────
  # brandCatalog: 3 ブランド
  # ─────────────────────────────────────────
  # genericKey は RULES.md §21「配合剤は単剤のgenericKeyを流用せず専用の単一文字列
  # キーを割り当てる」に従い、"{DPP4成分}_{SGLT2成分}_combo" の形式で統一する
  # （moduleId の語順 dpp4_sglt2 に合わせる。dm_dpp4_biguanide_combination_oral の
  # "{DPP4成分}_{ビグアナイド成分}_combo" と同型の命名規則）。
  #
  # トラディアンス（配合錠AP／BP の規格差）は「トラディアンス」1ブランドとして
  # 扱う方針で確定（2026-07-13）。AP/BP固有のbrandCatalogエントリは作成せず、
  # AP/BPをaliasesとして追加せず、dosageFormsによる規格分離も行わない。
  # 初期実装では薬剤師が処方規格を確認したうえで該当する増量・減量シナリオを
  # 選択する運用とする。規格に応じた自動制御は将来拡張事項とする。
  #
  # handlingTags は増量・減量シナリオを表示するブランドを制御する
  # （確定・2026-07-13）。カナリア／スージャヌは配合剤内での増量規格が存在しないため
  # 空配列とし、増量・減量シナリオへ到達させない。トラディアンスのみ
  # "dose_adjustment_supported" を付与し、AP／BP間の規格変更
  # （増量: AP→BP、減量: BP→AP）を想定した増量・減量シナリオへ到達可能とする。
  brandCatalog:
    カナリア:
      displayName: "カナリア"
      genericName: "テネリグリプチン/カナグリフロジン"
      displayGenericName: "テネリグリプチン/カナグリフロジン"
      genericKey: "teneligliptin_canagliflozin_combo"
      handlingTags: []
      # 増量規格が存在しないため、増量・減量シナリオ（減量含む）を表示しない。
      aliases:
        - "かなりあ"
      normalizedAliases:
        - "かなりあ"

    スージャヌ:
      displayName: "スージャヌ"
      genericName: "シタグリプチン/イプラグリフロジン"
      displayGenericName: "シタグリプチン/イプラグリフロジン"
      genericKey: "sitagliptin_ipragliflozin_combo"
      handlingTags: []
      # 増量規格が存在しないため、増量・減量シナリオ（減量含む）を表示しない。
      aliases:
        - "すーじゃぬ"
      normalizedAliases:
        - "すーじゃぬ"

    トラディアンス:
      displayName: "トラディアンス"
      genericName: "リナグリプチン/エンパグリフロジン"
      displayGenericName: "リナグリプチン/エンパグリフロジン"
      genericKey: "linagliptin_empagliflozin_combo"
      handlingTags:
        - "dose_adjustment_supported"
      # AP/BP間の規格変更（増量: AP→BP、減量: BP→AP）を想定した増量・減量
      # シナリオのみ表示する。AP/BPはbrandCatalog上で分離しない（1ブランド運用）。
      aliases:
        - "とらでぃあんす"
      normalizedAliases:
        - "とらでぃあんす"

  aliasToBrand:
    "かなりあ": "カナリア"
    "すーじゃぬ": "スージャヌ"
    "とらでぃあんす": "トラディアンス"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。3件・3件で一致。
  # 成分名読み（てねりぐりぷちん 等6件）は module 単位 nameAliases 側のみに存在し
  # brandCatalog.aliases には複製していないため、aliasToBrand の対象外
  # （既存配合剤4件と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # 各 brand: ["dpp4_sglt2_combination", {genericKeyと同一の成分タグ}] の
  # 2件で統一（既存配合剤4件と同型）。DPP4単剤/SGLT2単剤側のタグ
  # （"dpp4_oral" / "sglt2_dm_oral"）は流用せず、配合剤専用の新規タグ
  # "dpp4_sglt2_combination" を割り当てる。

drugResolution:
  brandToTags:
    カナリア:
      - "dpp4_sglt2_combination"
      - "teneligliptin_canagliflozin_combo"
    スージャヌ:
      - "dpp4_sglt2_combination"
      - "sitagliptin_ipragliflozin_combo"
    トラディアンス:
      - "dpp4_sglt2_combination"
      - "linagliptin_empagliflozin_combo"

composition:
  classKey: "dpp4_sglt2_combination"
  # 単剤DPP4（classKey="dpp4"）・単剤SGLT2糖尿病用（classKey="sglt2_dm"）・
  # 単剤SGLT2心腎用（classKey="sglt2_cardiorenal"）のいずれとも異なる専用値とし、
  # class-level S 統合が発生しないようにする（DP-02。既存配合剤4件と同型の判断）。
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）
  nodeKey: "dpp4_sglt2_combination_oral"
  priority: "chronic"

display:
  nodeKey: "dpp4_sglt2_combination_oral"
  nodeLabelShort: "DPP4/SGLT2配合剤"
  nodeLabelLong: "DPP-4阻害薬／SGLT2阻害薬配合剤（内服）"
  # display.title / display.subtitle は本ヘッダーに明記しない（既存配合剤4件と
  # 同型。ブランド列挙・他モジュール模倣による生成は禁止のため）。
  # 未記載の場合、PN2標準fallback（PN2-Drug-Header.md「display.subtitleの確定
  # ルール」）により、PN2実行時に以下の値が使用される想定:
  #   display.subtitle = "{drug.genericName}（{routeLabel}）"
  #                     = "DPP-4阻害薬／SGLT2阻害薬配合剤（内服）"

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. moduleId（dm_dpp4_sglt2_combination_oral）/ brandNames（カナリア・スージャヌ・
#    トラディアンスの3件） → ユーザー指定どおり確定（2026-07-13）
# 2. categoryPath「配合剤」taxonomy → 既存配合剤4件の実績と同型で確定
# 3. drugClass 単一結合定数「DPP4_SGLT2_COMBINATION」 → 既存配合剤の命名規則と
#    同型で確定
# 4. brandCatalog.genericName（各ブランドの成分ペア）→ ユーザー指定成分どおり確定
#    （カナリア: テネリグリプチン/カナグリフロジン、スージャヌ: シタグリプチン/
#    イプラグリフロジン、トラディアンス: リナグリプチン/エンパグリフロジン）。
#    区切り文字 "/"（半角）は dm_dpp4_biguanide_combination_oral.md（同じDPP4系配合剤・
#    最も直接的な参考先）の表記に倣う。
# 5. genericKey（"{DPP4成分}_{SGLT2成分}_combo"形式）→ moduleId語順（dpp4_sglt2）と
#    dm_dpp4_biguanide_combination_oral.md の命名規則を踏襲して確定
# 6. 成分名読みの流用範囲（てねりぐりぷちん／かなぐりふろじん／したぐりぷちん／
#    いぷらぐりふろじん／りなぐりぷちん／えんぱぐりふろじん）→ bridges/dm_dpp4_oral.md /
#    bridges/dm_sglt2_oral.md に確立済みの読みをそのまま流用して確定（新規推測なし）
# 7. brandCatalog.aliases / aliasToBrand の対象範囲（ブランド名読みのみ、成分名読みは
#    module単位nameAliasesのみ）→ 既存配合剤4件と同型の理由で確定
# 8. drugResolution.brandToTags → 既存配合剤4件と同型の2件構成
#    （["dpp4_sglt2_combination", {genericKey}]）で確定。DPP4単剤/SGLT2単剤側の
#    module tag は流用しない。
# 9. composition.classKey（"dpp4_sglt2_combination"）/ nodeKey
#    （"dpp4_sglt2_combination_oral"）/ priority（"chronic"）→ 既存命名規則で確定。
#    単剤DPP4・単剤SGLT2（糖尿病用・心腎用）いずれの classKey/nodeKey とも
#    衝突しない専用値とした（DP-02）。
# 10. 用途方針（2型糖尿病治療目的の内服配合剤専用）→ ユーザー確定（2026-07-13）。
#     心不全・腎疾患用途のシナリオ・keyword・検索語・表示情報は混入しない。
# 11. handlingTags → ユーザー確定（2026-07-13）。増量・減量シナリオを表示する
#     ブランドはトラディアンスのみとする。
#     - カナリア／スージャヌ: handlingTags = []（配合剤内での増量規格が
#       存在しないため、増量シナリオだけでなく減量シナリオも表示しない。
#       dm_dpp4_oral のトラゼンタと同型のタグ不在運用）
#     - トラディアンス: handlingTags = ["dose_adjustment_supported"]
#     単剤SGLT2側の増量・減量シナリオはそのまま流用しない。
# 12. トラディアンスの増量・減量の想定 → ユーザー確定（2026-07-13）。
#     AP／BP間の規格変更を想定する（増量: AP→BP、減量: BP→AP）。
#     実際に採用する増量・減量シナリオの種類・本文・scenarioRequiredTagsの
#     付与対象シナリオIDは、確定済み事項15のとおり確定した。
#     カナリア／スージャヌ専用の増量・減量シナリオは作成しない。
# 13. トラディアンスAP／BPをbrandCatalog上で分離しない方針 → ユーザー確定
#     （2026-07-13）。「トラディアンス」1ブランドとして扱う。AP/BP固有の
#     brandCatalogエントリ・alias追加・dosageFormsによる規格分離のいずれも
#     行わない。初期実装では薬剤師が処方規格を確認したうえで該当する
#     増量・減量シナリオを選択する運用とする。規格に応じた自動制御は
#     将来拡張事項とする（下記参照）。
# 14. display.title / display.subtitle は本ヘッダーに明記しない → 既存配合剤4件と
#     同型で確定。PN2標準fallbackの結果は上記 display セクション内コメント参照。
# 15. SCENARIOS本文（35シナリオ・17ADDON）をユーザー提示原稿どおり追加済み
#     （2026-07-13）。トラディアンスの増量・減量シナリオは以下7件で確定し、
#     PN3A時点で scenarioRequiredTags: ["dose_adjustment_supported"] を付与する
#     対象とする（上記「確定済み事項」11・12の実装）:
#     dose_increase_low_perceived_effect / dose_increase_no_lab_improvement /
#     dose_increase_due_to_other_med_adjustment / dose_decrease_improved /
#     dose_decrease_low_perceived_effect / dose_decrease_due_to_other_med_adjustment /
#     se_dose_decrease_due_to_urinary_frequency
#     カナリア／スージャヌ専用の増量・減量シナリオは作成していない（確定済み事項12
#     どおり）。
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# なし（2026-07-13時点、SCENARIOS本文追加によりPENDING 1「トラディアンスに
# 採用する増量・減量シナリオの具体的な種類・本文・scenarioRequiredTagsの
# 付与対象」は上記「確定済み事項」15のとおり解消済み）。
#
# =========================================
# 将来拡張事項（今回のDRAFT化では扱わない・スコープ外）
# =========================================
#
# - トラディアンスの処方規格（AP/BP）に応じた増量・減量シナリオの自動判別・
#   自動制御機能（初期実装は薬剤師が処方規格を確認したうえで選択する運用とする）
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱う
#   （カナリアの通常錠／OD錠を含む）
# - GEブランドの追加: 現時点ではユーザー指定の3ブランドのみを扱う
# - 単剤成分名検索から配合剤への横断到達設計（genericKeys: string[] 等）:
#   Q-G1 が確定するまで導入しない

# =========================================
# SCENARIOS_START〜SCENARIOS_END（STATUS: FROZEN_FOR_PN1）
# =========================================

=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 初回】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖値が高いため追加となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖コントロール不十分のため追加となった。
尿中への糖排泄を促進するとともに、インクレチンの働きを高めてインスリン分泌を促進し、グルカゴン分泌を抑制することで血糖改善が期待される。
P
DPP-4阻害薬・SGLT2阻害薬配合剤は、尿から糖を排出しやすくするとともに、血糖値に応じてインスリンを出しやすくすることで血糖値を改善する薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
お腹の調子が悪くなることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_pancreatitis_guidance
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=side_effect_guidance｜id=addon_se_genitourinary_guidance｜title=副作用注意喚起（尿路・性器感染症）】
P_APPEND
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、陰部のかゆみ、排尿時の痛み、残尿感、発熱などが現れることがあります。
このような症状があれば、お早めにご相談ください。


【ADDON｜type=sickday_guidance｜id=addon_sglt2_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水やケトアシドーシスのリスクが高まります。
このような体調不良時はDPP-4阻害薬・SGLT2阻害薬配合剤を休薬してください。
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


【ADDON｜type=side_effect_guidance｜id=addon_se_pancreatitis_guidance｜title=副作用注意喚起（膵炎）】
P_APPEND
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、強い腹痛や背中に響く痛みが出ることがあります。
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






【SCENARIO｜type=treatment_start｜id=restart｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 再開】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖値が高いため再開となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖コントロール不十分のため再開となった。
尿中への糖排泄を促進するとともに、インクレチンの働きを高めてインスリン分泌を促進し、グルカゴン分泌を抑制することで血糖改善が期待される。
P
DPP-4阻害薬・SGLT2阻害薬配合剤は、尿から糖を排出しやすくするとともに、血糖値に応じてインスリンを出しやすくすることで血糖値を改善する薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
お腹の調子が悪くなることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_pancreatitis_guidance
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 他所開始】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、他院で開始され継続使用中であった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖コントロール改善を目的として使用中であった。
尿中への糖排泄を促進するとともに、インクレチンの働きを高めてインスリン分泌を促進し、グルカゴン分泌を抑制することで血糖改善が期待される。
P
DPP-4阻害薬・SGLT2阻害薬配合剤は、尿から糖を排出しやすくするとともに、血糖値に応じてインスリンを出しやすくすることで血糖値を改善する薬です。
尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
お腹の調子が悪くなることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_sglt2_initial_sickday_guidance
- addon_glycemic_guidance_initial
- addon_se_pancreatitis_guidance
- addon_se_hypoglycemia_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 増量（効果実感乏しい）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、効果の実感が乏しいため増量となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　増量
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、効果不十分のため増量となった。増量後の効果および副作用の経過確認が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の増量後は、尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
尿量の増加が気になる場合や、強い口の渇きが続く場合はご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 増量（検査値改善なし）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、検査値が改善しないため増量となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　増量
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、検査値の改善が不十分なため増量となった。増量後の効果および副作用の経過確認が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の増量後は、尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
尿量の増加が気になる場合や、強い口の渇きが続く場合はご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 増量（他剤との調整）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、他剤変更に伴う調整により増量となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　増量
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、他剤変更に伴う調整のため増量となった。増量後の効果および副作用の経過確認が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の増量後は、尿量が増えたり、のどが渇きやすくなることがあります。
脱水を防ぐため、こまめな水分補給を心がけてください。
尿量の増加が気になる場合や、強い口の渇きが続く場合はご相談ください。
P_ADDON
- addon_se_genitourinary_guidance
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 減量（検査値改善）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、検査値が改善したため減量となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　減量
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 減量（効果実感乏しい）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、効果の実感が乏しいため減量を希望された。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　減量
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 減量（他剤との調整）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、他剤変更に伴う調整のため減量となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　減量
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（低血糖）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による低血糖は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
この薬は単独では低血糖を起こしにくい薬ですが、他の糖尿病薬と併用中は低血糖が起こることがあります。
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






【SCENARIO｜type=side_effect｜id=se_urinary_frequency_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（頻尿）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
排尿回数の増加は気にならない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による頻尿は日常生活上問題となっておらず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中は、尿量が増えたり、トイレが近くなることがあります。
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






【SCENARIO｜type=side_effect｜id=se_dehydration_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（脱水）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
強い口渇やふらつきは認めない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による脱水は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中は、脱水を起こすことがあります。
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






【SCENARIO｜type=side_effect｜id=se_genitourinary_infection_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（尿路・性器感染症）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
陰部のかゆみや排尿時の痛み、残尿感は認めない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による尿路・性器感染症は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、陰部のかゆみ、排尿時の痛み、残尿感、発熱などが現れることがあります。
このような症状があれば、お早めにご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_constipation_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（便秘）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
便秘は認めない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による消化器症状は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、お腹の調子が悪くなることがあります。
便秘が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_abdominal_distension_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（腹部膨満感）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
お腹が張った感じは認めない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による消化器症状は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、お腹の調子が悪くなることがあります。
お腹の張りが続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_pancreatitis_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（膵炎）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
強い腹痛や背部痛などの症状は認めない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による膵炎は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、強い腹痛や背中に響く痛みが出ることがあります。
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






【SCENARIO｜type=side_effect｜id=se_bullous_pemphigoid_none｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 副作用なし（類天疱瘡）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤を服用して症状は落ち着いている。
かゆみや湿疹、水ぶくれなどの症状は認めない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による皮膚症状は現時点で認められず、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の継続中に、かゆみを伴う水ぶくれや皮膚のただれなどが現れた場合は、続くのを待たず、お早めにご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　服用中
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






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　服用中
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






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した服用に不安がある。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 終了（改善）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖コントロールが改善したため中止となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方終了
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 終了（効果不十分）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、効果不十分のため中止となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方終了
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 終了（無効）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤は、効果が認められなかったため中止となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方終了
A
DPP-4阻害薬・SGLT2阻害薬配合剤は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue_urinary_frequency｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE継続（軽症・頻尿）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用によりトイレが近くなったが、日常生活は送れている。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による頻尿を軽度認めるが、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤により尿量が増えたり、トイレが近くなることがあります。
頻尿が軽く、日常生活に支障がなければ、経過を確認しながら継続できます。
日常生活に支障がある場合はご相談ください。
脱水を防ぐため、こまめな水分補給を心がけてください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_mild_continue_gi_symptoms｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE継続（軽症・消化器症状）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用により便秘やお腹が張った感じなどがあるが、日常生活は送れている。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による消化器症状を軽度認めるが、治療継続が可能である。
P
DPP-4阻害薬・SGLT2阻害薬配合剤による症状が軽い場合は、水分摂取や食事内容を無理のない範囲で見直すことで改善することがあります。
便秘やお腹が張った感じなどの症状が強く続く場合は、薬の調整が必要になることがあります。
ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_moderate_consider_dr｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE継続（中等度・消化器症状）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用により便秘やお腹が張った感じが強く、辛いことがあるが、日常生活は送れている。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
DPP-4阻害薬・SGLT2阻害薬配合剤による消化器症状が強く、継続困難の可能性があるため対応を要する。
P
症状が強い場合や続く場合は、薬の調整や変更が必要になることがあります。
自己判断で継続せず、処方医へご相談ください。
強い腹痛や嘔吐、お腹の張りが強い、便やガスが出ないなどの症状がある場合は、速やかに受診してください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_urinary_frequency｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE変更（頻尿）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用によりトイレが近くなったため、他剤へ変更となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方変更
A
DPP-4阻害薬・SGLT2阻害薬配合剤の服用による頻尿を認め、他剤変更後の経過確認を要する。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_gi_symptoms｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE変更（消化器症状）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用により便秘やお腹が張った感じが出現したため、他剤へ変更となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方変更
A
DPP-4阻害薬・SGLT2阻害薬配合剤の服用による消化器症状を認め、他剤変更後の経過確認を要する。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_urinary_frequency｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE減量（頻尿）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用によりトイレが近くなったため、減量となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　減量
A
DPP-4阻害薬・SGLT2阻害薬配合剤の服用による頻尿を認め、減量後の経過確認を要する。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の減量後も頻尿が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_urinary_frequency｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE中止（頻尿）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用によりトイレが近くなったため、中止となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方中止
A
DPP-4阻害薬・SGLT2阻害薬配合剤の服用による頻尿を認め、中止後の経過確認を要する。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_gi_symptoms｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 SE中止（消化器症状）】
S
DPP-4阻害薬・SGLT2阻害薬配合剤の服用により便秘やお腹が張った感じがひどいため、中止となった。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方中止
A
DPP-4阻害薬・SGLT2阻害薬配合剤の服用による消化器症状を認め、中止後の経過確認を要する。
P
DPP-4阻害薬・SGLT2阻害薬配合剤の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
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






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=DPP-4阻害薬・SGLT2阻害薬配合剤 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
DPP-4阻害薬・SGLT2阻害薬配合剤　服用中
A
食事および水分摂取の低下により、脱水やケトアシドーシスのリスクが上昇している。シックデイ時の休薬および受診判断が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、DPP-4阻害薬・SGLT2阻害薬配合剤を休薬してください。
医師から水分制限を指示されていない場合は、脱水を防ぐため、こまめな水分補給を心がけてください。
血糖値がそれほど高くなくても、強い倦怠感、吐き気、腹痛、息苦しさなどがある場合は、ケトアシドーシスの可能性があります。
嘔吐が続く、水分が摂れない、尿量が減る、吐き気・腹痛・強い倦怠感・息苦しさなどがある場合は受診してください。
再開時期については、自己判断せず処方医へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======
