# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# allergy_chemical_mediator_release_inhibitor_eye_drops
# =========================================
#
# ⚠️ STATUS: JSON_COMPLETE ⚠️
#
# [Current State・2026-09-27 Ophthalmic chassis cleanup Unit による実測] zero-base
# reconstruction の PN1〜PN8 は commit `05e47a1`（"refactor: rebuild chemical mediator
# eye-drop module"）で完了済み。canonical JSON
# （`data/modules/allergy_chemical_mediator_release_inhibitor_eye_drops.json`）は
# `data/modules/index.ts` に登録され ALL_MODULES に含まれる。PN7 FAIL なし・PN8相当の
# release verification（tsc / test suite / build / audit / test:multi-drug）は
# commit `05e47a1` 時点および以降（Rapid v2 exclusion 解除 commit `d852a3d` 含む）で
# 繰り返しPASS確認済み。
# STATUS 遷移（2026-09-27・Owner 承認）: `prompts/RULES.md` §24「JSON_COMPLETE は PN6
# （Assembly）で canonical JSON への Write が完了した時点、または PN8 で RELEASE_OK と
# 判定された時点でユーザーの指示に基づき設定する」に従い、上記実測（PN6 Write 完了・PN7
# FAIL なし・release verification 完了・Rapid v2 promotion 完了）を根拠に STATUS を
# `FROZEN_FOR_PN1` から `JSON_COMPLETE` へ遷移した。本遷移は STATUS 行と本コメントのみを
# 対象とし、SCENARIOS_START〜SCENARIOS_END 本文・Header 設計・canonical JSON は
# 変更していない（`docs/DEVELOPMENT_STANDARD.md` の「設計資産ライフサイクル」5状態とは
# 別軸であり、本遷移はあくまで bridge 個別の工程到達状態を表す）。
#
# SCENARIOS_START〜SCENARIOS_END（シナリオ本文・ADDON本文）は作成済み。
# 本Headerは、2026-09-17〜2026-09-20 に作成された旧Header（Owner Decision D-1〜D-11・
# O-1〜O-11・ZEP-1・PENDING-S2/D1/D3/D4 を含む）を全面的に置き換える
# **zero-base reconstruction**（2026-09-27）である。
#
# 旧Headerは会話ログの引き継ぎ要約が古い前提に基づいていたため、Owner指示により
# 旧Header・旧canonical・過去のD-1〜D-11等は今回 historical reference / regression
# comparison としてのみ使用し、値を無条件に継承しなかった。新Headerは
# `bridges/allergy_h1_antihistamine_eye_drops.md`（H1点眼・allergy family precedent）・
# `bridges/glaucoma_pg_analog_eye_drops.md`（PG点眼・Product Variant Separation
# Principle §4.2 gap category の実装 precedent）・`docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md`・
# `docs/DESIGN_PRINCIPLES.md`（DP-09/DP-18/DP-21）・`prompts/RULES.md`・
# `prompts/vNext/PN2-Drug-Header.md` を構造・責務分離・gating原則の reference として、
# 独立に再導出した。
#
# SCENARIOS本文（=======SCENARIOS_START=======〜=======SCENARIOS_END=======）は
# 本Unitで一切変更していない（Human-authored source。旧bridgeの本文とbyte単位で同一）。
#
# ─────────────────────────────────────────
# 値の出所ラベル:
#   [H] Owner-provided fact / Owner Decision（本Unitの会話で確定）
#   [D] 確定事項・固定規則からの決定論的導出（H1/PG構造 precedent・RULES・JSON_STANDARD等）
#   [P] PENDING（Owner未確定。本Headerには含めず末尾コメントでのみ管理）
#
# Owner Decision 一覧（本Unit・2026-09-27）:
#   OD-1: `ゼペリン点眼液` の `suspension` はcapability未確認のため付与しない
#         （非懸濁の断定ではなく、reachabilityを自動で開かない扱い）
#   OD-2: `ペミラストン点眼液` の先発/初期後発区分はfreeze blockerとしない
#         （brandCatalog構造に影響しないため。別管理事項）
#   OD-3: `brandNames` 順序は成分ペア順（ゼペリン→アレギサール/ペミラストン/ペミロラスト→
#         リザベン/トラニラスト/トラメラス→クロモグリク酸）を採用
#   OD-4: `keywords` はHuman body本文出現語 + categoryPath由来語のみ
#         （アレルギー/抗アレルギー点眼薬/かゆみ/充血/点眼）
#   OD-5: `display.subtitle`/`menuGroupLabels` をH1点眼と同一責務構造で明示する。
#         `display.adjustmentExpression` は今回のrebuildでは記載しない
#         （[Historical] 記載当時はRapid v1一時除外中のため導入を保留する判断だったが、
#         [Current State・2026-09-27] 一時除外は解除済み・本moduleはRapid v2 profile。
#         v2はadjustmentExpressionを参照しない設計のため機能的に不要でありabsent維持。
#         menuGroupLabelsの撤回ではない。責務分離は本文コメント参照）
#   OD-6: `matchPolicy.preferOwnNameMatchOverGenericMatch` /
#         `suppressRedundantGenericHeaderOnDirectMatch` をopt-in
#         （brand/generic pair構造がH1/PGと同型のため）
#   OD-7: `frequency_*` 系のungated主根拠は「Human-authored chassis上、別製品
#         variationの存在を前提としない回数変更scenarioであり、product capability
#         gateを要求しない」。H1点眼の同型実績は補助precedentとしてのみ扱う
#   OD-8: `トラメラス点眼液`/`クロモグリク酸点眼液` の `preservative_free`（SKU property tag）は
#         base brand entryへ自動付与しない（Product Variant Separation Principle
#         §4.2: トラメラスPF点眼液0.5%・クロモグリク酸Na・PF点眼液「日点」はいずれも
#         別JAPICコードの独立marketed SKUであり、current runtimeは交付されたvariantを
#         識別できない）。
#         [Historical・2026-09-27] 対応ADDON `addon_eye_drop_preservative_free_pf` は
#         requiredTags未宣言の全brand ungated manual candidateとしていた（PGの
#         タプロス/タプロスミニ precedentと同型）。
#         [Current State・2026-09-30 H1 generic-noun O + ophthalmic family-level variant
#         candidate Unit・Owner Decision] `preservative_free_variant_in_family`
#         （Level 2 family-level variant tag。Addon gate専用・scenario gateには使わない）を
#         `トラメラス点眼液`/`クロモグリク酸点眼液` のみへ付与し、`addon_eye_drop_preservative_free_pf`
#         のrequiredTagsを `["preservative_free_variant_in_family"]` へ変更した。
#         一般名entry `トラニラスト点眼液` へは付与しない（トラメラスPFの存在を
#         manufacturer-unspecified genericなトラニラスト全体へ横滑りさせないため）。
#         詳細: `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` §4.3〜§4.4
#   OD-9: `composition.nodeKey` / `display.nodeKey` は現行runtime識別子
#         `chemical_mediator_release_inhibitor_eye_drops` を維持する（再検討の結果、
#         `docs/JSON_STANDARD.md` JS-A-compositionが `{classKey}_{route}` を
#         「代表的な形式例であり必須の命名規則ではない」と明記しており、現行値は
#         `{classKey}_{formulationType}` として同条文に適合するため、識別子変更に
#         伴う移行コストを正当化する構造上の必要性がない）
#   OD-10: `concentration_variant` は全brand非付与・`strength_*`系をgate・
#         `reservedHandlingTags`で保持（Owner-provided fact: 濃度が増える製剤はなし）
#   OD-11: JS-A-composition必須フィールド `composition.nodeLabelShort` / `nodeLabelLong`
#         を追加（display の確定値と完全一致。PN6R MUST_STOP Rで発覚した欠落の是正）
#   OD-12: PN6R MUST_STOP Rで発覚したbridge記法ミス（`adjustmentExpression:`/
#         `menuGroupLabels:` キー行末インラインコメント）を別行コメントへ修正。
#         値は変更していない
#
# 製品保存条件（Owner-provided fact・2026-09-27）:
#   室温保管のみ: ゼペリン点眼液 / アレギサール点眼液 / ペミラストン点眼液 / ペミロラスト点眼液
#   遮光 + 室温保管 + 冷所保管禁止: リザベン点眼液 / トラニラスト点眼液 / トラメラス点眼液
#     （トラメラスのみPF variantあり。§4.2によりbase entryへpreservative_free付与せず）
#   遮光 + 室温保管: クロモグリク酸点眼液
#     （PF variantあり「日点」。§4.2によりbase entryへpreservative_free付与せず）
#
# 点眼共通シャーシ原則（H1/PG両bridgeと共通の前提）:
#   点眼薬 module は、現在の収載製品だけに最適化した scenario set ではなく、将来の製品
#   variation（濃度違い・持続型・懸濁性・冷所保存・PF・単回使用等）を含む共通シャーシ
#   として設計する。
#   - scenario / addon の存在 = 共通シャーシが持つ capability（現在該当製品がないことを
#     理由に削除しない）
#   - brandCatalog.handlingTags = 現在その製品で利用可能な capability
#   - scenarioRequiredTags / addonRequiredTags = 表示条件（reachability gate）
#   - template.reservedHandlingTags = 現在の収載製品では到達不能だが、将来製品用として
#     意図的に保持する capability（該当製品が存在しない場合のみ）
#   - PF/単回使用等、該当製品は存在するがcurrent runtimeが交付variantを識別できない
#     場合は reservedHandlingTags ではなく、対応ADDONをrequiredTags未宣言の
#     manual candidateとする（`docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` §4.2）
#
# 未確定事項（PENDING。Owner判断待ちだがfreeze blockerではない）:
#   P-4  ペミラストンの先発/初期後発区分の法的位置づけ（OD-2によりfreeze blockerではない）
#   P-7  display.subtitle等の文言はOD-5で確定済みだが、将来の文言調整余地は残る
#   その他、本Unit中に生じた個別確認事項は会話記録（Owner Review）側で管理する
#
# Rapid: [Historical] 本Header確定時点では、本moduleは `RAPID_V1_TEMPORARY_EXCLUSIONS`
#   （`lib/rapidV2.ts`）に残り、Rapid v2適用可否はHeader確定 → PN1〜PN8 →
#   final canonical/runtime確認の後、別Unitで判断する前提だった。
#   [Current State・2026-09-27 Rapid v2 temporary exclusion 解除Unit] zero-base rebuild
#   完了・read-only release readiness audit PASSを経てOwnerが一時除外の解除を承認し、
#   `RAPID_V1_TEMPORARY_EXCLUSIONS` は空集合となった。本moduleの `rapidProfileOf()` は
#   `'v2'`。legacy Rapid v1 realizationは削除せずrollback経路として維持する
#   （`docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1参照）。
#
# 点眼共通シャーシの capability 語彙（9種）・製品variation・alias等の詳細根拠は
# 上記Owner Decision一覧および本文コメントを参照。
#
moduleId: "allergy_chemical_mediator_release_inhibitor_eye_drops"
# [Current State・2026-09-27 Ophthalmic chassis cleanup Unit・Owner Decision] 眼科module の
# categoryPath は原則4階層・末端は「点眼」・「外用」は含めない（Avarept/PG と同型）。
# [Historical] 従来は5階層（末尾に「外用」/「点眼」の2階層）だったが、Owner承認済みの
# 4階層migrationにより「外用」を除去した。categoryPath は全modules共通のグローバル検索
# コーパスへ個別トークンとして展開されるため（`lib/search.ts`）、除去は
# `getDrugSuggestions("外用")` の到達性喪失を伴う意図的な behavior change である
# （Owner承認済み。reachability維持目的での keywords/alias への「外用」追加は行わない
# ＝ categoryPath taxonomy と search keyword の責務を混在させない）
categoryPath:
  - "アレルギー"
  - "抗アレルギー点眼薬"
  - "ケミカルメディエーター遊離抑制薬"
  - "点眼"

composition:
  classKey: "chemical_mediator_release_inhibitor"
  nodeKey: "chemical_mediator_release_inhibitor_eye_drops"  # OD-9
  domain: "allergy"
  clinicalDomain: "allergy"
  sMergeDomain: "allergy"
  priority: "chronic"
  # JS-A-composition必須フィールド。display.nodeLabelShort/nodeLabelLongと完全一致させる
  nodeLabelShort: "ケミ点眼"
  nodeLabelLong: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  # groupKeyRegistry は宣言しない（PN2/Phase6の責務。glaucoma_pg_analog_eye_dropsと同様）

drug:
  genericName: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  brandNames:
    - "ゼペリン点眼液"
    - "アレギサール点眼液"
    - "ペミラストン点眼液"
    - "ペミロラスト点眼液"
    - "リザベン点眼液"
    - "トラニラスト点眼液"
    - "トラメラス点眼液"
    - "クロモグリク酸点眼液"
  drugClass:
    - "CHEMICAL_MEDIATOR_RELEASE_INHIBITOR_EYE_DROPS"
  route: "ophthalmic"
  dosageForms:
    - "eye_drop"
  drugSpecificTags:
    - "chemical_mediator_release_inhibitor"
    - "antiallergic_eye_drop"
    - "antiallergic"
    - "eye_drops"
    - "ophthalmic"
    - "allergy"
    - "ocular_allergy"
    - "external_use"
    - "storage_instruction"
    - "formulation_instruction"
    - "contact_lens_caution"
  search:
    primaryDisplayName: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
    # exactAliases: 収載製品の正式表示名、剤形suffixなしの入力alias、薬効分類名、
    # および brand-level generic identity（DP-09 Generic Identity Search Principle）。
    exactAliases:
      - "ゼペリン点眼液"
      - "アレギサール点眼液"
      - "ペミラストン点眼液"
      - "ペミロラスト点眼液"
      - "リザベン点眼液"
      - "トラニラスト点眼液"
      - "トラメラス点眼液"
      - "クロモグリク酸点眼液"
      - "ゼペリン"
      - "アレギサール"
      - "ペミラストン"
      - "ペミロラスト"
      - "リザベン"
      - "トラニラスト"
      - "トラメラス"
      - "クロモグリク酸"
      - "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
      # DP-09: ゼペリンにGE無し（研究確認済み・わかもと製薬/興和のみが製造販売）でも
      # brand-level generic identity は発売有無と独立に検索到達性を保持する
      - "アシタザノラスト"
      - "アシタザノラスト点眼液"
    # nameAliases: brandNames順に各エントリのaliasesを連結したもの（H1/PG点眼と同一構成）。
    nameAliases:
      - "ぜぺりんてんがん"
      - "ぜぺりん"
      - "あれぎさーるてんがん"
      - "あれぎさーる"
      - "ぺみらすとんてんがん"
      - "ぺみらすとん"
      - "ぺみろらすとてんがん"
      - "ぺみろらすと"
      - "りざべんてんがん"
      - "りざべん"
      - "とらにらすとてんがん"
      - "とらにらすと"
      - "とらめらすてんがん"
      - "とらめらす"
      - "くろもぐりくさんてんがん"
      - "くろもぐりくさん"
      # brand-level generic identity の読み（DP-09）
      - "あしたざのらすと"
    # keywords: OD-4。本 module の SCENARIOS本文・categoryPath に現れる語のみ。
    keywords:
      - "アレルギー"
      - "抗アレルギー点眼薬"
      - "かゆみ"
      - "充血"
      - "点眼"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true
      # OD-6: brand/generic pair構造がH1/PGと同型のためopt-in
      preferOwnNameMatchOverGenericMatch: true
      suppressRedundantGenericHeaderOnDirectMatch: true
  # drug.nameAliases は drug.search.nameAliases と要素・順序まで完全一致させる（RULES.md §8）。
  nameAliases:
    - "ぜぺりんてんがん"
    - "ぜぺりん"
    - "あれぎさーるてんがん"
    - "あれぎさーる"
    - "ぺみらすとんてんがん"
    - "ぺみらすとん"
    - "ぺみろらすとてんがん"
    - "ぺみろらすと"
    - "りざべんてんがん"
    - "りざべん"
    - "とらにらすとてんがん"
    - "とらにらすと"
    - "とらめらすてんがん"
    - "とらめらす"
    - "くろもぐりくさんてんがん"
    - "くろもぐりくさん"
    - "あしたざのらすと"
  # ─────────────────────────────────────────
  # brandCatalog
  #   - genericKey は設定しない。同一成分のgroupingはdisplayGenericNameへのフォールバックで
  #     成立し、PFの差はvariant separation（OD-8）で扱うため、新しいgenericKeyを作らない
  #     （RULES.md §21 / DP-18）。
  #   - handlingTags は Owner-provided fact（本Unit・2026-09-27）を既存語彙で表現する。
  #     preservative_free は §4.2 gap category につき、いずれのbrandCatalogエントリにも
  #     付与しない（OD-8）。
  # ─────────────────────────────────────────
  brandCatalog:
    ゼペリン点眼液:
      displayName: "ゼペリン点眼液"
      genericName: "アシタザノラスト"
      displayGenericName: "アシタザノラスト点眼液"
      handlingTags: []  # OD-1: suspension等はcapability未確認のため非付与
      aliases:
        - "ぜぺりんてんがん"
        - "ぜぺりん"
      normalizedAliases:
        - "ぜぺりんてんがん"
        - "ぜぺりん"
    アレギサール点眼液:
      displayName: "アレギサール点眼液"
      genericName: "ペミロラスト"
      displayGenericName: "ペミロラスト点眼液"
      handlingTags: []  # Owner-provided fact: 室温保管のみ
      aliases:
        - "あれぎさーるてんがん"
        - "あれぎさーる"
      normalizedAliases:
        - "あれぎさーるてんがん"
        - "あれぎさーる"
    ペミラストン点眼液:
      displayName: "ペミラストン点眼液"
      genericName: "ペミロラスト"
      displayGenericName: "ペミロラスト点眼液"
      handlingTags: []  # Owner-provided fact: 室温保管のみ（OD-2: 先発/後発区分はfreeze blockerではない）
      aliases:
        - "ぺみらすとんてんがん"
        - "ぺみらすとん"
      normalizedAliases:
        - "ぺみらすとんてんがん"
        - "ぺみらすとん"
    ペミロラスト点眼液:
      displayName: "ペミロラスト点眼液"
      genericName: "ペミロラスト"
      displayGenericName: "ペミロラスト点眼液"
      handlingTags: []  # Owner-provided fact: 室温保管のみ
      aliases:
        - "ぺみろらすとてんがん"
        - "ぺみろらすと"
      normalizedAliases:
        - "ぺみろらすとてんがん"
        - "ぺみろらすと"
    リザベン点眼液:
      displayName: "リザベン点眼液"
      genericName: "トラニラスト"
      displayGenericName: "トラニラスト点眼液"
      handlingTags:  # Owner-provided fact
        - "light_protection"
        - "avoid_cold_storage"
      aliases:
        - "りざべんてんがん"
        - "りざべん"
      normalizedAliases:
        - "りざべんてんがん"
        - "りざべん"
    トラニラスト点眼液:
      displayName: "トラニラスト点眼液"
      genericName: "トラニラスト"
      displayGenericName: "トラニラスト点眼液"
      # Owner-provided fact（manufacturer-unspecified genericへの薬理一般化ではない）
      handlingTags:
        - "light_protection"
        - "avoid_cold_storage"
      aliases:
        - "とらにらすとてんがん"
        - "とらにらすと"
      normalizedAliases:
        - "とらにらすとてんがん"
        - "とらにらすと"
    トラメラス点眼液:
      displayName: "トラメラス点眼液"
      genericName: "トラニラスト"
      displayGenericName: "トラニラスト点眼液"
      # preservative_free（SKU property tag）は付与しない（OD-8: トラメラスPFは別JAPICコードの
      # 独立SKU）。preservative_free_variant_in_family（Level 2 family-level variant tag）は
      # 付与する（2026-09-30 Owner Decision。トラメラスPFがfamily内に実在するため）。
      handlingTags:
        - "light_protection"
        - "avoid_cold_storage"
        - "preservative_free_variant_in_family"
      aliases:
        - "とらめらすてんがん"
        - "とらめらす"
      normalizedAliases:
        - "とらめらすてんがん"
        - "とらめらす"
    クロモグリク酸点眼液:
      displayName: "クロモグリク酸点眼液"
      genericName: "クロモグリク酸"
      displayGenericName: "クロモグリク酸点眼液"
      # avoid_cold_storage・preservative_free（SKU property tag）は付与しない
      # （前者はOwner-provided factで対象外。後者はOD-8: 「日点」PFは別JAPICコードの独立SKU）。
      # preservative_free_variant_in_family（Level 2 family-level variant tag）は付与する
      # （2026-09-30 Owner Decision。PF「日点」がfamily内に実在するため）。
      handlingTags:
        - "light_protection"
        - "preservative_free_variant_in_family"
      aliases:
        - "くろもぐりくさんてんがん"
        - "くろもぐりくさん"
      normalizedAliases:
        - "くろもぐりくさんてんがん"
        - "くろもぐりくさん"
  # aliasToBrand は全エントリのnormalizedAliasesを過不足なく網羅する（RULES.md §10）。
  aliasToBrand:
    "ぜぺりんてんがん": "ゼペリン点眼液"
    "ぜぺりん": "ゼペリン点眼液"
    "あれぎさーるてんがん": "アレギサール点眼液"
    "あれぎさーる": "アレギサール点眼液"
    "ぺみらすとんてんがん": "ペミラストン点眼液"
    "ぺみらすとん": "ペミラストン点眼液"
    "ぺみろらすとてんがん": "ペミロラスト点眼液"
    "ぺみろらすと": "ペミロラスト点眼液"
    "りざべんてんがん": "リザベン点眼液"
    "りざべん": "リザベン点眼液"
    "とらにらすとてんがん": "トラニラスト点眼液"
    "とらにらすと": "トラニラスト点眼液"
    "とらめらすてんがん": "トラメラス点眼液"
    "とらめらす": "トラメラス点眼液"
    "くろもぐりくさんてんがん": "クロモグリク酸点眼液"
    "くろもぐりくさん": "クロモグリク酸点眼液"

template:
  templateId: "allergy_chemical_mediator_release_inhibitor_eye_drops_v1"
  templateVersion: "1.0.0"
  situationTags:
    - "general"
    - "seasonal"
    - "ocular_allergy"
  severityTags:
    - "mild"
    - "moderate"
    - "severe"
  handlingTags:
    # 点眼共通シャーシの capability 語彙（10種）。scenarioRequiredTags / addonRequiredTags が参照する。
    - "suspension"
    - "light_protection"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "reduced_frequency_option"
    - "concentration_variant"
    - "single_use_container"
    - "preservative_free"
    - "avoid_cold_storage"
    # [Current State・2026-09-30 Owner Decision] Level 2 family-level variant tag
    # （Addon gate専用。scenarioRequiredTagsには使用しない。詳細は本ファイルOD-8参照）。
    - "preservative_free_variant_in_family"
  reservedHandlingTags:
    # 現行8製品ではいずれのbrandも保持しないchassis capability（RULES.md §27）。
    # concentration_variant: OD-10（Owner-provided fact: 濃度が増える製剤はなし）
    # preservative_free はここに置かない（§4.2 gap category。「該当製品が存在しない」
    # のではなく「該当製品(PF SKU)は存在するがruntime判別不能」。OD-8参照）
    - "concentration_variant"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "suspension"
    - "single_use_container"
    - "reduced_frequency_option"

display:
  title: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  subtitle: "アレルギー性結膜炎・目のかゆみに対する点眼治療"  # OD-5
  drugClassLabel: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  drugGeneric: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  nodeLabelShort: "ケミ点眼"
  nodeLabelLong: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  # display.nodeKey は composition.nodeKey と一致させる（JSON_STANDARD JS-A-display。OD-9）。
  nodeKey: "chemical_mediator_release_inhibitor_eye_drops"
  # OD-5
  menuGroupLabels:
    増量: "回数増"
    減量: "回数減"
  # adjustmentExpression は今回のrebuildでは記載しない（Owner Decision・2026-09-27）。
  # [Historical] 記載当時、chemical mediatorはRAPID_V1_TEMPORARY_EXCLUSIONSに残るOwner
  # Decision下にあり、Rapid v2再評価はHeader→PN1〜PN8完了後の別Unitで行う前提だった。
  # [Current State・2026-09-27 Rapid v2 exclusion解除Unit] RAPID_V1_TEMPORARY_EXCLUSIONSは
  # 空集合となり、本moduleの rapidProfileOf() は 'v2' である。v2 realization は
  # adjustmentExpressionを一切参照しない（`lib/deriveNodeFields.ts` withRapidFirstSentence。
  # v2は「増量/減量」へ抽象化されたtransition表現を使う設計のOwner Decisionのため）。
  # よってadjustmentExpressionは機能的に不要であり、absentのまま維持する
  # （bridgeに根拠のない値を追加しない。PN2契約）。UI menu label（menuGroupLabels）と
  # Rapid文生成用expression（adjustmentExpression）は責務が別であり、本撤回は
  # menuGroupLabelsの撤回ではない。
  # localInput: SCENARIOS本文の initial / restart / external_start の S に
  # {{applicationSite}} が含まれるため、点眼部位入力UIを有効化する。
  localInput:
    enabled: true
    label: "点眼部位（任意）"
    placeholder: "左・右・両 など"
    targetField: "S"
    insertMode: "placeholder"
    siteButtonType: "eye"
    applyScenarioIds:
      - "initial"
      - "restart"
      - "external_start"
    emptyBehavior: "keep_original"
scenarioEngine:
  mode: "bridge"
  sourceType: "natural_language_scenarios"
  scenarioSection:
    start: "=======SCENARIOS_START======="
    end: "=======SCENARIOS_END======="
    sectionStrictMode: true
  addonSupported: true
  closingSupported: true
  headerFormat:
    delimiter: "｜"
    scenarioHeader:
      prefix: "SCENARIO"
      requiredFields:
        - "type"
        - "id"
        - "title"
    addonHeader:
      prefix: "ADDON"
      requiredFields:
        - "type"
        - "id"
        - "title"
  expectedScenarioFormat:
    - "header"
    - "S"
    - "O"
    - "A"
    - "P"
    - "P_ADDON(optional)"
    - "P_CLOSING(optional)"
  expectedAddonFormat:
    - "header"
    - "S_APPEND(optional)"
    - "A_APPEND(optional)"
    - "P_APPEND(optional)"
#
# ─────────────────────────────────────────
# scenarioRequiredTags / addonRequiredTags（共通シャーシの表示条件）:
# 本モジュールでは、これらのタグをSCENARIO/ADDONヘッダー行へのインライン記載ではなく、
# 本Headerに正式な構造データ（id → tags のマップ）として定義する（H1/PGと同型）。
# 記載のないscenario/addonは常時表示（タグ条件なし）とする。
# ─────────────────────────────────────────
scenarioRequiredTags:
  # 懸濁性点眼液を前提とする手技・保管の指導シナリオ（現行8製品はいずれも該当なし → reserved）
  lifestyle_guidance_suspension_shake: ["suspension"]
  lifestyle_guidance_storage_upright_suspension: ["suspension"]
  # 遮光保存を前提とする保管指導シナリオ
  lifestyle_guidance_storage_light_protection: ["light_protection"]
  # 冷所保存を前提とする保管指導シナリオ（現行8製品はいずれも該当なし → reserved）
  lifestyle_guidance_storage_cold: ["cold_storage"]
  # 未開封時のみ冷所保存を前提とする保管指導シナリオ（現行8製品はいずれも該当なし → reserved）
  lifestyle_guidance_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 点眼回数を減らすための持続型製剤への切替選択肢（現行8製品はいずれも該当なし → reserved）
  switch_to_sustained_formulation_reduced_frequency: ["reduced_frequency_option"]
  # 濃度の異なる製剤が存在することを前提とする濃度増減シナリオ
  # （OD-10: Owner-provided fact。現行8製品はいずれも該当なし → reserved）
  strength_increase_low_perceived_effect: ["concentration_variant"]
  strength_increase_due_to_other_med_adjustment: ["concentration_variant"]
  strength_decrease_improved: ["concentration_variant"]
  strength_decrease_low_perceived_effect: ["concentration_variant"]
  strength_decrease_due_to_other_med_adjustment: ["concentration_variant"]
  # 刺激感を理由とする濃度減。濃度違いの製剤が存在することを前提とする点で上記5件と同じ
  # capabilityに属するため、同じconcentration_variantを表示条件とする（専用タグは設けない）
  se_strength_decreased_due_to_irritation: ["concentration_variant"]
  # frequency_* 系5件（回数増減）: gateなし（常時表示）。
  # OD-7 主根拠: Human-authored chassis上、別製品variationの存在を前提としない
  # 回数変更scenarioであり、product capability gateを要求しない。
  # （補助precedent: allergy_h1_antihistamine_eye_drops でも回数変更自体をcapability
  #  tagでgateしていない）
addonRequiredTags:
  # 懸濁性点眼液の振り混ぜ・先端上向き保管
  addon_eye_drop_suspension_shake: ["suspension"]
  addon_eye_drop_storage_upright_suspension: ["suspension"]
  # 遮光保存（遮光袋での保管）
  addon_eye_drop_storage_light_protection: ["light_protection"]
  # 冷所保存、および冷所から出した後の取り扱い
  addon_eye_drop_storage_cold: ["cold_storage"]
  addon_eye_drop_warm_container_after_cold_storage: ["cold_storage"]
  # 未開封時のみ冷所保存
  addon_eye_drop_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 低温保存を避けるべき製品（冷蔵庫に入れない。「冷所保存が必要」の否定ではなく独立した陽性タグ）
  addon_eye_drop_avoid_cold_storage: ["avoid_cold_storage"]
  # 1回使い切り容器（現行8製品・両PF SKUのいずれにも実在せず → 真にreserved）
  addon_eye_drop_single_dose_mini: ["single_use_container"]
  # PF・防腐剤フリー容器の取り扱い説明
  # [Historical・2026-09-27] requiredTags未宣言の全brand ungated manual candidateとしていた
  # （OD-8§4.2 gap。トラメラスPF・クロモグリク酸PF「日点」はいずれも別JAPICコードの独立SKUで
  # あり、current runtimeは交付されたvariantを識別できないため）。
  # [Current State・2026-09-30 Owner Decision] Level 2 family-level variant tag
  # （preservative_free_variant_in_family）でproduct family単位まで絞った
  # （トラメラス点眼液・クロモグリク酸点眼液のみがこのtagを保持。詳細は本ファイルOD-8参照）。
  addon_eye_drop_preservative_free_pf: ["preservative_free_variant_in_family"]
# 次のADDONは requiredTags を設定せず、常時候補とする:
# - addon_eye_drop_interval_after_suspension_5min / addon_eye_drop_interval_after_suspension_10min
#   （併用する他の懸濁性点眼薬との点眼間隔を扱う内容であり、本moduleの製剤性質を前提としない）
# - addon_eye_drop_contact_lens_remove_before_use
#   （実際に交付される製品・レンズ種別・添付文書によって可否が異なり、薬局の採用品・在庫にも
#    依存するため、runtimeの自動判定として設計せず薬剤師のHuman judgmentに委ねる。H1/PGと同一理由）
# - addon_eye_drop_tip_contamination / addon_eye_drop_after_opening_expiry /
#   addon_eye_drop_interval_5min / addon_eye_drop_interval_10min: 全製品共通の常時候補
#
constitution:
  purpose: "このテンプレートは自然言語シナリオ原稿をJSONへ橋渡しするための軽量構造定義である。"
  canonicalSource: "bridge原稿を single source of truth（内容の正本）として扱う。文言・構造の調整は bridge原稿を起点とし、確認後に canonical JSON へ反映する。canonical JSON は bridge原稿を実装へ反映したアウトプットとする。"
  editingRules:
    - "既存本文は勝手に書き換えない"
    - "構造監査と整合性確認を優先する"
    - "不足しているブロック、欠落、参照不一致のみを指摘する"
    - "未依頼の新フィールド、新機能、新分類を追加しない"
    - "将来拡張のための枠やコメントを削除・変更しない"
    - "type、id、P_ADDON参照、P_CLOSING の整合性を最優先で確認する"
    - "bridge原稿では薬剤名・薬効分類名を固定文言で記載してよい"
    - "文言修正はまず bridge原稿で確認し、その後 JSON へ反映する"
    - "JSON化時に、S / O / A / P / S_APPEND / A_APPEND / P_APPEND の薬剤名・薬効分類名は、主語・使用薬・対象薬・治療薬として使われている場合 {{drug_subject}} へ読み替える"
    - "S / S_APPEND では、初回・回数増・回数減・終了・副作用・使用状況確認など、薬剤ごとの状態や変更理由を表す場合、薬剤名・薬効分類名を {{drug_subject}} へ読み替える"
    - "Oフィールドでは、薬剤名・薬効分類名を表す部分を {{drug_subject}} へ読み替え、処方・回数増・回数減・使用中・処方終了・処方変更・処方中止などの状態語は保持する"
    - "A / P / A_APPEND / P_APPEND では、薬剤名・薬効分類名が使用薬・対象薬・治療薬として使われている場合のみ {{drug_subject}} へ読み替える。薬効説明・作用機序・症状説明・点眼手技説明・保管方法説明・疾患説明などの一般説明文として使われている場合は置換しない"
    - "薬効説明・作用機序・症状説明・点眼手技説明など、薬剤主語ではない一般説明文は {{drug_subject}} へ置換しない"
    - "{{drug_subject}} への読み替えは、薬剤名・薬効分類名が主語・使用薬・対象薬・治療薬として明示されている本文にのみ適用する"
    - "全体状態評価シナリオ（例：CP良好、CP不良など）では、Sフィールドの主語省略を許容する"
    - "主語省略を許容するシナリオでは、JSON化時に S フィールドへ {{drug_subject}} を補わない"
    - "本文監査では意味一致だけでなく、文型・接続・主語構造の維持を重視する"
    - "displayGenericName を使用する場合は、displayGenericName ?? genericName の優先順で扱う"
    - "expressModes は Model JSON管理項目として扱い、bridge原稿では定義しない"
    - "expressModes の defaultBrandName および defaultScenarioId は、bridge上の brandCatalog および scenario id が確定した後に Model JSON 側で参照整合を確認する"
    - "JSON化時、drug.nameAliases は drug.search.nameAliases と完全一致で生成する"
    - "drug.nameAliases を drug.search.nameAliases と独立生成しない"
    - "JSON化時、addons.orderPresets は全moduleで object として生成する"
    - "未使用moduleでは addons.orderPresets: {} を許容する"
    - "addons.orderPresets の preset key は bridge に明示がある場合のみ生成する"
    - "bridge未明示の preset key を推測生成しない"
    - "ADDONは S_APPEND / A_APPEND / P_APPEND を使用できる"
    - "ADDONには S_APPEND / A_APPEND / P_APPEND のいずれか1つ以上を含める"
    - "S_APPEND付きADDONは、薬剤師が実際に該当内容を確認・説明した場合のみ選択する"
    - "本モジュールの scenarioRequiredTags / addonRequiredTags は、Header内の同名ブロックを正本としてJSON生成時に適用する。bridge本文（SCENARIOS本文）には直接埋め込まない"
  outputRules:
    - "自然言語監査では、原稿の欠落・誤記・構造揺れ・参照不一致のみを扱う"
    - "JSON監査では、型・キー・参照・後方互換・canonical JSON一致のみを扱う"
    - "提案は現在要件と将来拡張を明確に分離して述べる"
#


=======SCENARIOS_START=======


【SCENARIO｜type=treatment_start｜id=initial｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 初回】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、{{applicationSite}}眼のかゆみが気になるため追加となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、アレルギー症状の改善を目的として追加となった。
アレルギー反応に関与するケミカルメディエーターの遊離を抑えることで、充血・かゆみなどのアレルギー症状の改善を目的として使用する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、アレルギー症状を改善する薬です。
症状の改善のため、継続して使用することが大切です。
P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_interval_5min
- addon_eye_drop_interval_after_suspension_5min
- addon_eye_drop_interval_10min
- addon_eye_drop_interval_after_suspension_10min
- addon_eye_drop_suspension_shake
- addon_eye_drop_storage_upright_suspension
- addon_eye_drop_storage_light_protection
- addon_eye_drop_storage_cold
- addon_eye_drop_warm_container_after_cold_storage
- addon_eye_drop_storage_cold_before_opening
- addon_eye_drop_avoid_cold_storage
- addon_eye_drop_single_dose_mini
- addon_eye_drop_preservative_free_pf
- addon_eye_drop_contact_lens_remove_before_use
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_tip_contamination｜title=点眼方法（容器先端の接触防止）】
P_APPEND
点眼薬の先端が、目や瞼などに触れると汚染されることがあります。
先端部分に触れないように使用してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_after_opening_expiry｜title=使用期限（開封後1ヶ月）】
P_APPEND
開封後の点眼薬は、衛生面を考慮し、1ヶ月を目安に処分してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_5min｜title=点眼間隔（5分以上）】
P_APPEND
複数の点眼薬を使用する場合は、5分以上あけて使用してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_after_suspension_5min｜title=点眼間隔（懸濁・5分以上）】
P_APPEND
複数の点眼薬を使用する場合は、懸濁性点眼薬を後に使用し、点眼の間隔を5分以上あけてください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_10min｜title=点眼間隔（10分以上）】
P_APPEND
複数の点眼薬を使用する場合は、10分以上あけて使用してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_interval_after_suspension_10min｜title=点眼間隔（懸濁・10分以上）】
P_APPEND
複数の点眼薬を使用する場合は、懸濁性点眼薬を後に使用し、点眼の間隔を10分以上あけてください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_suspension_shake｜title=点眼方法（懸濁性・振り混ぜ）】
P_APPEND
点眼薬の成分が沈殿して、効果が十分に出ない可能性があります。
使用する前に、よく振り混ぜてから使用してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_upright_suspension｜title=保管方法（懸濁性・先端上向き）】
P_APPEND
保管するときは、目詰まりを防ぐために、先端部分を上にして保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_light_protection｜title=保管方法（遮光）】
P_APPEND
光の影響により、効果が十分に出ない可能性があります。
使用していない間は、遮光袋に入れて保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_cold｜title=保管方法（冷所保存）】
P_APPEND
温度の影響により、効果が十分に出ない可能性があります。
使用していない間は、冷所で保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_warm_container_after_cold_storage｜title=点眼方法（冷所保存後・手で温める）】
P_APPEND
冷所から取り出した後すぐに点眼すると、薬液が連続して落ちる可能性があります。
キャップを閉めたまま容器を手で温めてから点眼してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_storage_cold_before_opening｜title=保管方法（未開封時のみ冷所）】
P_APPEND
温度の影響により、効果が十分に出ない可能性があります。
開封するまでは冷所で保管してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_avoid_cold_storage｜title=保管方法（低温保存を避ける）】
P_APPEND
低温で保管すると、薬液の状態が変化することがあります。
冷蔵庫には入れず、指示された保管方法に従って保管してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_single_dose_mini｜title=点眼方法（ミニ・1回使い切り）】
P_APPEND
1回使い切りの点眼薬です。
開封後は速やかに使用し、薬液が残っていても処分してください。




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_preservative_free_pf｜title=点眼方法（PF・防腐剤フリー）】
P_APPEND
防腐剤を使用していないため、特殊な構造の容器が使用されています。
通常の点眼薬と容器の扱い方が異なるため、使用方法を確認して使用してください。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_contact_lens_remove_before_use｜title=コンタクトレンズ（外して点眼）】
P_APPEND
コンタクトレンズを装用している場合は、点眼前に外してください。




【SCENARIO｜type=treatment_start｜id=restart｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 再開】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、{{applicationSite}}眼のかゆみが気になるため再開となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、アレルギー症状の改善を目的として再開となった。
アレルギー反応に関与するケミカルメディエーターの遊離を抑えることで、充血・かゆみなどのアレルギー症状の改善を目的として使用する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、アレルギー症状を改善する薬です。
症状の改善のため、継続して使用することが大切です。
P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_interval_5min
- addon_eye_drop_interval_after_suspension_5min
- addon_eye_drop_interval_10min
- addon_eye_drop_interval_after_suspension_10min
- addon_eye_drop_suspension_shake
- addon_eye_drop_storage_upright_suspension
- addon_eye_drop_storage_light_protection
- addon_eye_drop_storage_cold
- addon_eye_drop_warm_container_after_cold_storage
- addon_eye_drop_storage_cold_before_opening
- addon_eye_drop_avoid_cold_storage
- addon_eye_drop_single_dose_mini
- addon_eye_drop_preservative_free_pf
- addon_eye_drop_contact_lens_remove_before_use
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_start｜id=external_start｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 他所開始】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、{{applicationSite}}眼のかゆみに対して他院で開始され継続使用中であった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、アレルギー症状の改善を目的として継続使用中であった。
アレルギー反応に関与するケミカルメディエーターの遊離を抑えることで、充血・かゆみなどのアレルギー症状の改善を目的として使用する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、アレルギー症状を改善する薬です。
症状の改善のため、継続して使用することが大切です。
P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_interval_5min
- addon_eye_drop_interval_after_suspension_5min
- addon_eye_drop_interval_10min
- addon_eye_drop_interval_after_suspension_10min
- addon_eye_drop_suspension_shake
- addon_eye_drop_storage_upright_suspension
- addon_eye_drop_storage_light_protection
- addon_eye_drop_storage_cold
- addon_eye_drop_warm_container_after_cold_storage
- addon_eye_drop_storage_cold_before_opening
- addon_eye_drop_avoid_cold_storage
- addon_eye_drop_single_dose_mini
- addon_eye_drop_preservative_free_pf
- addon_eye_drop_contact_lens_remove_before_use
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_low_perceived_effect｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 回数増（効果実感乏しい）｜scenarioColor=blue】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果の実感が乏しいため点眼回数が増えた。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　点眼回数増
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果不十分のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_low_perceived_effect｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 濃度増（効果実感乏しい）｜scenarioColor=green】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果の実感が乏しいため、より効果が高いものへ変更となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　高濃度製剤へ変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果不十分のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_due_to_other_med_adjustment｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 回数増（他剤との調整）｜scenarioColor=blue】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、他剤との調整により点眼回数が増えた。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　点眼回数増
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、併用薬との調整のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_due_to_other_med_adjustment｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 濃度増（他剤との調整）｜scenarioColor=green】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、他剤との調整により、より効果が高いものへ変更となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　高濃度製剤へ変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、併用薬との調整のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_improved｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 回数減（症状改善）｜scenarioColor=blue】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状が改善したため点眼回数が減った。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　点眼回数減
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状改善を踏まえ点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_improved｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 濃度減（症状改善）｜scenarioColor=green】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状が改善したため、より効果が穏やかなものへ変更となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　低濃度製剤へ変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状改善を踏まえ、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_low_perceived_effect｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 回数減（効果実感乏しい）｜scenarioColor=blue】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果の実感が乏しく使用継続に不安があるため、点眼回数を減らして継続することとなった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　点眼回数減
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果実感の乏しさと使用継続への不安を踏まえ、点眼回数を減らして治療継続となった。
点眼回数変更後は、症状や使用状況について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、変更された点眼回数で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_low_perceived_effect｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 濃度減（効果実感乏しい）｜scenarioColor=green】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果の実感が乏しく使用継続に不安があるため、より効果が穏やかなものへ変更して継続することとなった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　低濃度製剤へ変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果実感の乏しさと使用継続への不安を踏まえ、低濃度製剤へ変更して治療継続となった。
製剤変更後は、症状や使用状況について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、変更された製剤で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_due_to_other_med_adjustment｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 回数減（他剤との調整）｜scenarioColor=blue】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、他剤との調整により点眼回数が減った。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　点眼回数減
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、併用薬との調整のため点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_due_to_other_med_adjustment｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 濃度減（他剤との調整）｜scenarioColor=green】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、他剤との調整により、より効果が穏やかなものへ変更となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　低濃度製剤へ変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、併用薬との調整のため、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=switch_to_sustained_formulation_reduced_frequency｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 持続型製剤へ変更（点眼回数減）｜scenarioColor=orange】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、点眼回数を減らすために変更となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　持続型製剤へ変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、点眼回数を減らすため、持続型製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_irritation_none｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 副作用なし（刺激感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬を使用して症状は落ち着いている。
刺激感は認めない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による刺激感は現時点で認められず、治療継続が可能である。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の継続中に刺激感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_foreign_body_sensation_none｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 副作用なし（異物感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬を使用して症状は落ち着いている。
異物感は認めない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による異物感は現時点で認められず、治療継続が可能である。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の継続中に異物感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pruritus_none｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 副作用なし（掻痒感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬を使用して症状は落ち着いている。
掻痒感は認めない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による掻痒感は現時点で認められず、治療継続が可能である。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の継続中に掻痒感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_redness_none｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 副作用なし（充血）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬を使用して症状は落ち着いている。
充血は認めない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による充血は現時点で認められず、治療継続が可能である。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の継続中に充血が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_discharge_none｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 副作用なし（目やに）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬を使用して症状は落ち着いている。
目やには認めない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による目やには現時点で認められず、治療継続が可能である。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の継続中に目やにが出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_good｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 CP良好】
S
薬を使用して症状は落ち着いている。
使用忘れなく継続できている。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　使用中
A
コンプライアンスは良好で、治療継続に問題はない。
P
引き続き用法を守って使用することで、治療効果の維持が期待されます。
今後も継続して使用できるようにすることが大切です。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 CP不良（使用忘れ）】
S
使用を忘れることがある。
症状は大きく変わっていない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　使用中
A
コンプライアンスは不良で、使用忘れがみられる。
P
継続して使用することで、十分な治療効果が期待されます。
使用忘れが続くと、期待される治療効果が十分に得られない可能性があります。
P_ADDON
- addon_eye_drop_after_opening_expiry
- addon_adherence_notification_alarm
- addon_adherence_notification_app
- addon_adherence_visual_calendar_checklist
- addon_adherence_visual_note
- addon_adherence_prep_previous_night
- addon_adherence_habit_routine_link
- addon_adherence_family_support_reminder
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=adherence_guidance｜id=addon_adherence_notification_alarm｜title=アラーム｜uiGroup=通知｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、アラームを使用時間に合わせて設定しておく方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_notification_app｜title=記録アプリ｜uiGroup=通知｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用記録のできるアプリを活用する方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_calendar_checklist｜title=カレンダー・チェックリスト｜uiGroup=視覚化｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、カレンダーや使用チェックリストで確認する方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=貼り紙｜uiGroup=視覚化｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、使用するタイミングを目立つ場所に書いておく方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_previous_night｜title=前夜に準備｜uiGroup=事前準備｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、前夜のうちに翌日の薬を目につく場所へ準備しておく方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_habit_routine_link｜title=生活習慣と結びつける｜uiGroup=習慣化｜uiVariant=rightAccentBlue】
P_APPEND
使用忘れを防ぐ方法の一つとして、毎日の生活習慣と使用を結びつける方法があります。




【ADDON｜type=adherence_guidance｜id=addon_adherence_family_support_reminder｜title=家族などの声掛け｜uiGroup=家族の支援｜uiVariant=rightAccentLavender】
P_APPEND
使用忘れを防ぐ方法の一つとして、家族や身近な方に使用したか声をかけてもらう方法があります。




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 CP不良（自己判断）】
S
自己判断で使用を調整することがある。
症状は大きく変わっていない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　使用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して使用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 CP不良（受診遅延）】
S
受診が遅れ、使用を調整することがある。
症状は大きく変わっていない。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　使用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な使用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=usage｜id=as_needed_refill_needed｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 頓用使用（処方あり）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状が出た時に使用している。
使用により残薬が少なくなったため、継続処方となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状出現時に使用されており、残薬状況を踏まえ継続処方となった。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状が出た時に、指示された用法に従って使用してください。
使用頻度が増えている場合や、症状が続く場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=usage｜id=as_needed_refill_not_needed｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 頓用使用（処方なし）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状が出た時に使用している。
残薬があるため、今回は処方なしとなった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　使用中
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状出現時に使用されており、残薬があるため今回は処方なしとなった。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状が出た時に、指示された用法に従って使用してください。
症状が続く場合や、使用頻度が増える場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_improved｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 終了（改善）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状が改善したため中止となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方終了
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、症状改善により終了となった。
終了後に症状が悪化する可能性があるため、注意が必要である。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 終了（効果不十分）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果不十分のため中止となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方終了
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果不十分のため終了となった。
終了後は、目の症状の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 終了（無効）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果が認められなかったため中止となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方終了
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬は、効果が認められなかったため終了となった。
終了後は、目の症状の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_mild_continue｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 SE継続（軽症 刺激感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用により刺激感があるが、日常生活は送れている。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による刺激感を軽度認めるが、治療継続が可能である。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による刺激感が軽い場合は、そのまま経過をみてください。
刺激感が続く場合や強くなる場合は、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_moderate_consider_dr｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 SE継続（中等度 刺激感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用により刺激感が強く、辛いことがあるが、日常生活は送れている。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による刺激感が強く、継続困難の可能性があるため対応を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬による刺激感が続く場合や強くなる場合は、使用回数の調整や薬剤の変更が必要になることがあります。
症状が続く場合は、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_irritation｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 SE変更（刺激感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用により刺激感が出現したため、他剤へ変更となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用による刺激感を認め、他剤変更後の経過確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の変更後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_irritation｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 SE回数減（刺激感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用により刺激感が強いため、点眼回数が減った。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　点眼回数減
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用による刺激感を認め、点眼回数変更後の経過確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の点眼回数が減った後も刺激感が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_irritation｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 SE濃度減（刺激感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用により刺激感が強かったため、効果が穏やかなものになった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　低濃度製剤へ変更
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用による刺激感を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬を低濃度製剤へ変更後も、刺激感が続く場合や、気になる症状、使用感の変化がありましたらご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_irritation｜title=ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬 SE中止（刺激感）】
S
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用により刺激感が強いため、中止となった。
O
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬　処方中止
A
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の使用による刺激感を認め、中止後の経過確認を要する。
P
ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬の中止後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_tip_contamination｜title=点眼方法説明（容器先端の接触）】
S
点眼薬の先端を、目や瞼などに触れて使用している。
O
点眼薬　使用中
A
点眼薬の使い方の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬の先端が、目や瞼などに触れると汚染されることがあります。
先端部分に触れないように使用してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_interval｜title=点眼方法説明（間隔不十分）】
S
複数の点眼薬を、十分な間隔をあけずに使用している。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬は、目に十分行き渡るまでに時間がかかります。
複数の点眼薬を使用する場合は、薬剤ごとに指示された間隔をあけて使用してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_after_opening_expiry｜title=点眼方法説明（開封後1ヶ月以上使用）】
S
点眼薬は、開封後1ヶ月以上経過しても使用を続けている。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬は、衛生面を考慮し、開封後1ヶ月を目安に使用を終了し、残っていても処分してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_suspension_shake｜title=点眼方法説明（懸濁不十分）】
S
点眼薬は、振らないまま使用を続けている。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、点眼方法の指導が必要である。
P
点眼薬の成分が沈殿して、効果が十分に出ない可能性があります。
使用する前に、よく振り混ぜてから使用してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_upright_suspension｜title=保管方法説明（懸濁性・先端上向き）】
S
点眼薬は、向きを気にせず保管していた。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、先端部分を上にして保管することで、目詰まりを防ぐことができます。
保管するときは向きに注意してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_light_protection｜title=保管方法説明（遮光不十分）】
S
点眼薬は、遮光せずに保管している。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、光の影響により、効果が十分に出ない可能性があります。
使用していない間は、遮光袋に入れて保管してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_cold｜title=保管方法説明（冷所保存不十分）】
S
点眼薬は、冷所に保管せず、常温で保管している。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、温度の影響により、効果が十分に出ない可能性があります。
使用していない間は、冷所で保管してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_storage_cold_before_opening｜title=保管方法説明（未開封時のみ冷所保存不十分）】
S
点眼薬は、未開封時に冷所へ保管せず、常温で保管していた。
O
点眼薬　使用中
A
点眼薬の薬剤特性の理解が不十分であり、保管方法の指導が必要である。
P
点眼薬は、温度の影響により、効果が十分に出ない可能性があります。
開封するまでは冷所で保管してください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


=======SCENARIOS_END=======



