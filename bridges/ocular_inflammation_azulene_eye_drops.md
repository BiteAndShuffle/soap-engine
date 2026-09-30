# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# ocular_inflammation_azulene_eye_drops
# =========================================
#
# ⚠️ STATUS: JSON_COMPLETE ⚠️
#
# 【STATUS 遷移の記録（RULES §24）】DRAFT → FROZEN_FOR_PN1。
#   遷移日: 2026-09-30（Owner の明示指示による）
#   根拠: Owner が SCENARIOS_START〜SCENARIOS_END の Human-authored 本文を確認し、現在の本文を本 module の
#         PN1 入力として確定する旨を宣言した。あわせて、Header を OD-1〜OD-11 を含む現在案で承認した。
#   凍結対象: SCENARIOS_START〜SCENARIOS_END 本文（`添付用.md` と byte 単位で同一。sha256 先頭 16 桁
#         `3d8b802263a11ad6`・35,736 bytes・SCENARIO 41 件・ADDON 23 件）と、承認済みの Header 設計。
#   本遷移の変更範囲: STATUS 行、本状態説明コメント、未確定事項（PENDING）の P-2 記載のみ。
#         SCENARIOS 本文・Header 設計（drug / brandCatalog / aliases / handlingTags / scenarioRequiredTags /
#         addonRequiredTags / composition / display 等）は変更していない。
#   凍結に含まれないもの: P-3（他メーカー GE の全数確認）・P-4（各製品の販売・流通状況）は未解決の
#         Fact follow-up であり、Freeze 済み Fact へ昇格させていない（下記「未確定事項」参照）。
#   [Historical] 記載当時、PN1 以降・canonical JSON 生成・runtime 接続は未着手で、PN1 の開始は Owner の明示指示を待つ状態だった。
#
# 【STATUS 遷移の記録（RULES §24）】FROZEN_FOR_PN1 → JSON_COMPLETE。
#   遷移日: 2026-10-01（Owner の指示による）
#   根拠: PN1〜PN6 で canonical JSON（`data/modules/ocular_inflammation_azulene_eye_drops.json`）の Write が完了し、
#         PN6R で registry（`data/modules/index.ts`）へ接続、PN7 が FAIL 0 / 未解決 CHECK 0（CHECK Z は Owner Decision により
#         「cp_poor_missed_doses のみが addon_adherence_* を持つ差は意図した Human-authored 設計」として解決）、
#         PN8 が RELEASE_OK と判定した。
#   本遷移の変更範囲: STATUS 行と本状態説明コメントのみ。SCENARIOS_START〜SCENARIOS_END 本文・Header 設計・canonical JSON は変更していない。
#   未解決の Fact follow-up（Freeze 済み Fact ではなく、本遷移でも確定 Fact へ昇格させていない）: P-3（他メーカー GE の全数確認）・
#         P-4（各製品の販売・流通状況）。
#
# SCENARIOS_START〜SCENARIOS_END は `添付用.md` から byte 単位で保全して収載した
# （収載時の加工・正規化・補完なし）。scenario id / ADDON id / P_ADDON 参照順 / P_CLOSING /
# scenarioColor / uiGroup / uiVariant はすべて原稿のまま。原稿への疑義は本文を編集せず、
# 下記「原稿レビュー事項」に記録した。
#
# 値の出所ラベル:
#   [H] Owner-provided fact（本 Unit の依頼文で明示された値）
#   [P] Claude proposal（Repository 実測・一次資料・既存 precedent に基づく提案。2026-09-30 に Owner が Header 全体を承認済み）
#   [D] 確定規則・precedent からの決定論的導出
#
# 参照した precedent（構造・責務分離・gating の reference。値は無条件に継承していない）:
#   bridges/allergy_chemical_mediator_release_inhibitor_eye_drops.md（最新世代 Header。
#     Rapid v2 適合・4階層 categoryPath・composition.nodeLabel*・family-level tag 運用）
#   bridges/glaucoma_pg_analog_eye_drops.md / bridges/dry_eye_trpv1_antagonist_eye_drops.md
#   docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md（§4.2〜§4.5 Level 1/2/3）
#   docs/DESIGN_PRINCIPLES.md（DP-09 / DP-18 / DP-21）
#   prompts/RULES.md §8 §9 §10 §16 §21 §23 §24 §26 §27 / prompts/vNext/PN2-Drug-Header.md
#   H1 点眼の旧世代 Header は丸ごとコピーしていない。
#
# ─────────────────────────────────────────
# PMDA 添付文書による一次資料確認（2026-09-30 実施。PMDA 医薬品医療機器情報提供ホームページ
# `https://www.info.pmda.go.jp/go/pack/{YJコード}_{版}/?view=body` の本文を直接取得）:
#   - AZ点眼液0.02%（ゼリア新薬工業・YJ 1319703Q2124・承認番号 22000AMX02022000・
#     添付文書 `1319703Q2124_1_03`・2023年7月改訂 第1版）
#       貯法 室温保存 / 有効期間 3年 / 14.1「遮光して保存すること」/
#       20.「外箱開封後は遮光して保存すること」/ 性状 無臭・青紫色澄明の無菌水性点眼液（懸濁性でない）/
#       添加剤 ホウ酸・ホウ砂・パラオキシ安息香酸メチル/プロピル・塩化カリウム・塩化ナトリウム
#       （防腐剤あり）/ 用法・用量「1日3～5回、1回1～2滴を点眼する。」（増減の記載なし）/
#       包装 5mL×10・5mL×50（単回使用・ミニ規格の記載なし）/ 冷所保存・低温保存禁止の記載なし /
#       規格は 0.02% のみ
#   - アズレン点眼液0.02%「ニットー」（日東メディック・YJ 1319703Q2108・
#     添付文書 `1319703Q2108_1_05`・2023年11月改訂 第1版）
#       貯法 室温保存 / 14.1 遮光して保存 / 20.「外箱開封後は遮光して保存」/ 青色澄明の無菌水性点眼剤 /
#       防腐剤（パラベン）あり / 用法・用量「1日3～5回、1回1～2滴を点眼する。」/
#       包装 プラスチック点眼容器 5mL×10・5mL×50
#   - アズレン点眼液0.02%「わかもと」（わかもと製薬・YJ 1319703Q2116・
#     添付文書 `1319703Q2116_1_07`・2024年1月改訂 第1版）
#       貯法 室温保存 / 14.1 遮光して保存 / 20.「アルミ包装開封後は遮光して保存」/
#       青色澄明の水性点眼剤 / 防腐剤（パラベン）あり / 用法・用量「通常1日3～5回、1回1～2滴を
#       点眼する。症状および年齢に応じて適宜用量および回数を増減する。」/
#       包装 プラスチック点眼容器（脱酸素剤入り）5mL×20・5mL×50
#   - 上記 3 製品はいずれも 0.02% のみ・水性澄明（非懸濁）・防腐剤あり・室温保存・遮光保存。
#     冷所保存・低温保存禁止・PF・単回使用（ミニ）・持続型・濃度違いの製品は、確認した PMDA
#     添付文書 3 件の範囲では存在しない（他メーカー GE の全数調査は未実施 → PENDING P-3）。
#   - 「現在の販売・流通状況」は添付文書からは確認できない（薬価基準収載品目リスト・供給状況の
#     一次資料は未確認 → PENDING P-4）。
#
# ─────────────────────────────────────────
# Owner Decision 確定事項（2026-09-30・Header / gate 設計のみへ反映。SCENARIOS 本文は変更していない）:
#   OD-1 [H] 遮光 ADDON / scenario の本文「遮光袋に入れて保管」は現状維持する（実務上、遮光袋に入れて
#        患者へ交付するため）。原稿レビュー R-1 は解決済み
#   OD-2 [H] = OD-D（回数変更 scenario は全製品で到達可能・gate なし）
#   OD-3 [H] switch_to_sustained_formulation_reduced_frequency は、AZ / アズレン系に LX・持続型相当製剤が
#        ないため到達不能とする。既存の reduced_frequency_option gate + reservedHandlingTags の規律で表現し、
#        どの brandCatalog entry にも同 tag を付与しない。scenario 本文は削除しない
#   OD-4 [H] 副作用 scenario（刺激感・異物感・掻痒感・充血 等）は削除・除外しない。添付文書記載の有無ではなく、
#        点眼薬として実務上確認しやすい症状として残す（Human clinical / pharmacy workflow decision）。
#        原稿レビュー R-2 は解決済み
#   OD-5 [H・確定 2026-09-30] `アズレン点眼液` entry も遮光製剤として扱う。AZ点眼液・アズレン点眼液の
#        両 entry へ `light_protection` と `light_protection_variant_in_family` を付与する。
#        lifestyle_guidance_storage_light_protection（scenario）と addon_eye_drop_storage_light_protection
#        （addon）は AZ / アズレン両 entry で到達可能（gate 定義自体は変更なし）。
#        （OD-C の「一般名 entry へ SKU property を付与しない」提案は本 Decision で置き換え）
#   OD-6 [H・確定 2026-09-30] 一般名表示は「アズレン点眼液」で確定（displayGenericName。OD-B 解決）。
#        brandCatalog.genericName は DP-21（剤形非依存の有効成分 identity）に従い「アズレン」のまま
#        剤形語を含めない（他 module の genericName / displayGenericName の対応と同型）
#   OD-7 [H・確定 2026-09-30] ユーザー向け薬効表示は「抗炎症点眼薬」のまま。本 module の収載対象は
#        アズレン系に限定する。「非ステロイド性抗炎症点眼薬」「副腎皮質ステロイド性抗炎症点眼薬」は
#        別概念・別 module とし、本 module には含めない。内部 identifier（classKey「azulene」・
#        nodeKey「azulene_ophthalmic」・drugClass「AZULENE_EYE_DROPS」・drugSpecificTags「azulene」）も
#        アズレン系限定を維持する（OD-F 解決）
#
#   OD-8 [H・確定 2026-09-30] OD-A: 現 draft の命名を確定する（categoryPath[0]「眼炎症」・domain / clinicalDomain /
#        sMergeDomain「ocular_inflammation」・moduleId「ocular_inflammation_azulene_eye_drops」・
#        classKey「azulene」・nodeKey「azulene_ophthalmic」）。既存眼科 4 module の
#        4階層・末端「点眼」・`{domain}_{class}_eye_drops` / `{classKey}_ophthalmic` 形式と整合
#   OD-9 [H・確定 2026-09-30] OD-E: composition.priority は "chronic"（既存 38 module すべてが chronic）
#   OD-10 [H・確定 2026-09-30] OD-G: 「AZ」の検索 alias として「えーぜっと」を追加する（実務上の検索性を優先）。
#        brand の読みと読み＋「てんがん」を対で持つ corpus 慣行に従い「えーぜっとてんがん」も対で追加する。
#        長音「ー」は normalizeText で除去されずそのまま照合される（既存 alias「あれぎさーる」と同型）。
#        追加先: brandCatalog.AZ点眼液.aliases / normalizedAliases、drug.search.nameAliases、
#        drug.nameAliases、aliasToBrand（exactAliases には入れない）
#   OD-11 [H・確定 2026-09-30] OD-H: 濃度付き名称は不要。検索・exactAliases は「アズレン点眼液」までとし、
#        「AZ点眼液0.02%」「アズレン点眼液0.02%」は含めない（前方一致で到達可能。corpus では Avarept の
#        正式販売名 alias を除き濃度付き名称を持たない）。exactAliases から「AZ点眼液0.02%」を除去した
#
# Owner Decision 待ちの [P] 値: なし（OD-A〜OD-H はすべて確定済み）
#
# 原稿レビュー事項（SCENARIOS 本文は編集していない。R-1〜R-5 は Owner の本文確認・凍結宣言〔2026-09-30〕時点で
# 記録として確認済み。R-3〜R-5 は本文変更を要しない情報記録であり、Owner Decision 待ちではない）:
#   R-1 [解決・OD-1] 遮光 ADDON / scenario の「遮光袋」表記は Owner Decision により現状維持
#       （参考: AZ・ニットーの添付文書 20. は外箱開封後の遮光、わかもとはアルミ包装開封後の遮光）
#   R-2 [解決・OD-4] se_irritation_none / se_foreign_body_sensation_none / se_eye_redness_none は
#       Owner Decision により維持（参考: AZ点眼液の添付文書 11.2 の副作用は眼瞼の腫脹・発赤・そう痒感）
#   R-3 addon_eye_drop_after_opening_expiry の「開封後1ヶ月」は共通シャーシの汎用衛生指導であり、
#       アズレン点眼液の添付文書に開封後使用期限の記載はない（ungated 常時候補のため reachability は
#       影響しない）
#   R-4 cp_* / as_needed_* 等の O「抗炎症点眼薬　使用中」は薬効分類名の固定表記であり、JSON 化時に
#       editingRules に従い {{drug_subject}} へ読み替える。lifestyle_guidance_* の O「点眼薬　使用中」は
#       generic noun で、RULES §16 generic noun exception により逐語保持する（本 Header の product-identity
#       値のいずれも「点眼薬　使用中」に部分文字列として含まれない）
#   R-5 chemical mediator 原稿にあった se_eye_discharge_none（目やに）は本原稿にない（意図的な除外と解釈し、
#       追加していない）
#
# 未確定事項:
#   P-1 [解決] OD-A〜OD-H はすべて Owner Decision により確定（OD-1〜OD-11）
#   P-2 [解決・2026-09-30] Owner による SCENARIOS 本文の確認・凍結宣言（STATUS: DRAFT → FROZEN_FOR_PN1）
#   [未解決の Fact follow-up。Freeze 済み Fact ではない。Owner Decision 待ちの Header 項目ではない]
#   P-3 他メーカー GE の全数確認（PF・単回使用・冷所保存・濃度違い製品の不存在の確定）。
#       現 Header の reserved / 非付与は「確認した PMDA 添付文書 3 製品の範囲」に基づく暫定扱い
#   P-4 各製品の現在の販売・流通状況（添付文書からは確認できない。薬価基準収載リスト等は未確認）
#
# 点眼共通シャーシ原則（H1/PG/chemical mediator と共通）:
#   - scenario / addon の存在 = 共通シャーシが持つ capability（該当製品がないことを理由に削除しない）
#   - brandCatalog.handlingTags = その製品で確定している property、または family-level variant candidate
#   - scenarioRequiredTags / addonRequiredTags = 表示条件（reachability gate）
#   - template.reservedHandlingTags = 現行製品では到達不能だが、共通シャーシとして意図的に保持する
#     capability（RULES §27）
#
# Rapid: 本 module は Rapid v2 profile（`lib/rapidV2.ts` の RAPID_V1_TEMPORARY_EXCLUSIONS は空集合）。
#   v2 は display.adjustmentExpression を参照しないため記載しない（chemical mediator OD-5 と同型。
#   UI menu label の menuGroupLabels とは別責務）。rapidEvaluationSubject は原稿に「症状」以外の
#   評価 subject がないため使用しない。
#
moduleId: "ocular_inflammation_azulene_eye_drops"

# [H] OD-8（確定）。眼科 module の categoryPath は 4階層・末端「点眼」・「外用」を含めない
# （chemical mediator / PG / Avarept と同型）。
categoryPath:
  - "眼炎症"
  - "抗炎症点眼薬"
  - "アズレン系"
  - "点眼"

composition:
  # [H] OD-8（確定）。OD-7: 内部 identifier はアズレン系限定を維持する（ユーザー向け表示は「抗炎症点眼薬」）
  classKey: "azulene"
  # [D] {classKey}_{route}（PG / Avarept と同型）。display.nodeKey と一致させる
  nodeKey: "azulene_ophthalmic"
  # [H] OD-8（確定）。PN2 フォールバック表に該当領域がないため明示
  domain: "ocular_inflammation"
  clinicalDomain: "ocular_inflammation"
  sMergeDomain: "ocular_inflammation"
  # [H] OD-9（確定）
  priority: "chronic"
  # JS-A-composition 必須。display.nodeLabelShort / nodeLabelLong と完全一致
  nodeLabelShort: "抗炎症点眼"
  nodeLabelLong: "抗炎症点眼薬"
  # groupKeyRegistry は宣言しない（PN2/Phase6 の責務）。sMergePolicy / JS-B 4 key は生成しない。

drug:
  # [H] ユーザー向け薬効表示（原稿本文の薬剤名・薬効分類名と同一）。OD-7: 収載対象はアズレン系限定で、
  # 非ステロイド性 / 副腎皮質ステロイド性の抗炎症点眼薬は別概念・別 module（本 module に含めない）
  genericName: "抗炎症点眼薬"
  brandNames:
    - "AZ点眼液"
    - "アズレン点眼液"
  drugClass:
    # [P] UPPER_SNAKE（点眼シャーシの {CLASS}_EYE_DROPS 形式）
    - "AZULENE_EYE_DROPS"
  route: "ophthalmic"
  dosageForms:
    - "eye_drop"
  # [P] 検索 token にもなる。値は既存点眼 module の語彙に倣い、本 module の性質に限定
  drugSpecificTags:
    - "azulene"
    - "anti_inflammatory_eye_drop"
    - "eye_drops"
    - "ophthalmic"
    - "ocular_inflammation"
    - "external_use"
    - "storage_instruction"
    - "formulation_instruction"
    - "contact_lens_caution"
  search:
    # [D] = drug.genericName
    primaryDisplayName: "抗炎症点眼薬"
    exactAliases:
      # [H] 表示名
      - "AZ点眼液"
      - "アズレン点眼液"
      # OD-11: 濃度付き名称（AZ点眼液0.02% / アズレン点眼液0.02%）は含めない
      # [P] bare 名（剤形 suffix なしの入力 alias。点眼シャーシ実績）
      - "AZ"
      - "アズレン"
      # [P] 薬効分類名（シャーシ実績）
      - "抗炎症点眼薬"
    # nameAliases: brandNames 順に各 entry の aliases を連結（RULES §8 / §23）。
    # OD-10: 「AZ」の平仮名読み「えーぜっと」を対で追加（Latin は小文字化して保持する既存 precedent）
    nameAliases:
      - "azてんがん"
      - "az"
      - "えーぜっとてんがん"
      - "えーぜっと"
      - "あずれんてんがん"
      - "あずれん"
    # [P] SCENARIOS 本文・categoryPath に現れる語のみ
    keywords:
      - "眼炎症"
      - "抗炎症点眼薬"
      - "炎症"
      - "点眼"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      # JS-A: 全 module true
      suppressCrossModuleSuggestionsOnExactHit: true
      # brand（AZ）/ generic（アズレン）ペア構造を持つため opt-in（H1 / PG / chemical mediator と同型）
      preferOwnNameMatchOverGenericMatch: true
      suppressRedundantGenericHeaderOnDirectMatch: true
  # drug.nameAliases は drug.search.nameAliases と要素・順序まで完全一致（RULES §8）。[D]
  nameAliases:
    - "azてんがん"
    - "az"
    - "えーぜっとてんがん"
    - "えーぜっと"
    - "あずれんてんがん"
    - "あずれん"
  # ─────────────────────────────────────────
  # brandCatalog
  #   - genericKey は設定しない（RULES §21 / DP-18。displayGenericName へのフォールバックで成立）。
  #   - AZ点眼液・アズレン点眼液（両 entry）: 遮光保存製剤として扱う（OD-5・Owner Decision）。
  #     property tag light_protection と family-level tag light_protection_variant_in_family を
  #     両 entry へ付与する（PRODUCT_VARIANT_SEPARATION_PRINCIPLE §4.3〜§4.4）。
  #     一次資料: PMDA 添付文書でAZ点眼液（ゼリア新薬）・GE 2 製品（ニットー・わかもと）のいずれも
  #     14.1「遮光して保存」・20. 開封後の遮光を確認済み（GE 全数調査は未実施 → P-3）。
  #   - suspension / cold_storage / cold_storage_before_opening / avoid_cold_storage /
  #     single_use_container / preservative_free / concentration_variant / reduced_frequency_option は
  #     確認した添付文書に該当する製品が存在しないため、どの entry にも付与しない
  #     （推測付与しない。到達不能のまま reservedHandlingTags で保持）。
  #   - *_variant_in_family は family 内に該当 variant の実在が確認できる場合のみ付与する
  #     （preservative_free / single_use の variant は未確認のため付与しない）。
  # ─────────────────────────────────────────
  brandCatalog:
    AZ点眼液:
      displayName: "AZ点眼液"
      # OD-6: genericName は剤形語を含めない有効成分 identity（DP-21）。一般名表示は displayGenericName
      genericName: "アズレン"
      displayGenericName: "アズレン点眼液"
      handlingTags:
        - "light_protection"
        - "light_protection_variant_in_family"
      aliases:
        - "azてんがん"
        - "az"
        - "えーぜっとてんがん"
        - "えーぜっと"
      normalizedAliases:
        - "azてんがん"
        - "az"
        - "えーぜっとてんがん"
        - "えーぜっと"
    アズレン点眼液:
      displayName: "アズレン点眼液"
      genericName: "アズレン"
      displayGenericName: "アズレン点眼液"
      # OD-5: 遮光製剤として扱い、SKU property と family-level tag の両方を付与する
      handlingTags:
        - "light_protection"
        - "light_protection_variant_in_family"
      aliases:
        - "あずれんてんがん"
        - "あずれん"
      normalizedAliases:
        - "あずれんてんがん"
        - "あずれん"
  # aliasToBrand は全 entry の normalizedAliases を過不足なく網羅する（RULES §10）。[D]
  aliasToBrand:
    "azてんがん": "AZ点眼液"
    "az": "AZ点眼液"
    "えーぜっとてんがん": "AZ点眼液"
    "えーぜっと": "AZ点眼液"
    "あずれんてんがん": "アズレン点眼液"
    "あずれん": "アズレン点眼液"

template:
  templateId: "ocular_inflammation_azulene_eye_drops_v1"
  templateVersion: "1.0.0"
  situationTags:
    - "general"
    - "ocular_inflammation"
  severityTags:
    - "mild"
    - "moderate"
    - "severe"
  handlingTags:
    # 点眼共通シャーシの capability 語彙。scenarioRequiredTags / addonRequiredTags が参照する。
    - "suspension"
    - "light_protection"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "reduced_frequency_option"
    - "concentration_variant"
    - "single_use_container"
    - "preservative_free"
    - "avoid_cold_storage"
    # Level 2 family-level variant tag（Addon gate 専用。scenarioRequiredTags には使用しない）
    - "light_protection_variant_in_family"
  reservedHandlingTags:
    # 現行 2 entry のいずれも保持しない chassis capability（RULES §27）。
    # 確認した PMDA 添付文書 3 製品に該当製品が存在しないため reserved とする（P-3: 全数未確認）。
    # 該当製品が確認できた場合は本宣言から外し、対象 entry の handlingTags へ付与する。
    - "suspension"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "avoid_cold_storage"
    - "single_use_container"
    - "preservative_free"
    - "concentration_variant"
    - "reduced_frequency_option"

display:
  title: "抗炎症点眼薬"
  # [P] 原稿本文（眼の炎症症状を改善する薬）に基づく
  subtitle: "眼の炎症症状に対する点眼治療"
  drugClassLabel: "抗炎症点眼薬"
  drugGeneric: "抗炎症点眼薬"
  nodeLabelShort: "抗炎症点眼"
  nodeLabelLong: "抗炎症点眼薬"
  # display.nodeKey は composition.nodeKey と一致させる（JSON_STANDARD JS-A-display）
  nodeKey: "azulene_ophthalmic"
  # [P] Rapid v2 適合（chemical mediator と同型）。adjustmentExpression は記載しない
  menuGroupLabels:
    増量: "回数増"
    減量: "回数減"
  # localInput: SCENARIOS本文の initial / restart / external_start の S に
  # {{applicationSite}} が含まれるため、点眼部位入力 UI を有効化する（点眼シャーシ共通値）。
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
# 本 Header に正式な構造データ（id → tags のマップ）として定義する（H1/PG/chemical mediator と同型）。
# 記載のない scenario / addon は常時表示（タグ条件なし）。Human-authored scenario を削除して
# reachability を調整していない（現行製品で到達できない scenario も本文は保持する）。
# ─────────────────────────────────────────
scenarioRequiredTags:
  # 懸濁性点眼液を前提とする手技・保管の指導（確認した 3 製品はいずれも澄明水性 → reserved）
  lifestyle_guidance_suspension_shake: ["suspension"]
  lifestyle_guidance_storage_upright_suspension: ["suspension"]
  # 遮光保存を前提とする保管指導（SKU property。AZ点眼液・アズレン点眼液の両方で到達可能。OD-5。
  # family-level tag は scenario gate に使わない）
  lifestyle_guidance_storage_light_protection: ["light_protection"]
  # 冷所保存を前提とする保管指導（該当製品なし → reserved）
  lifestyle_guidance_storage_cold: ["cold_storage"]
  lifestyle_guidance_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 持続型製剤への切替: AZ / アズレン系に LX・持続型相当製剤がないため到達不能（OD-3・Owner Decision）。
  # reduced_frequency_option をどの entry にも付与せず、reservedHandlingTags で保持する。本文は削除しない
  switch_to_sustained_formulation_reduced_frequency: ["reduced_frequency_option"]
  # 濃度増減（確認した 3 製品はいずれも 0.02% のみ → reserved）
  strength_increase_low_perceived_effect: ["concentration_variant"]
  strength_increase_due_to_other_med_adjustment: ["concentration_variant"]
  strength_decrease_improved: ["concentration_variant"]
  strength_decrease_low_perceived_effect: ["concentration_variant"]
  strength_decrease_due_to_other_med_adjustment: ["concentration_variant"]
  se_strength_decreased_due_to_irritation: ["concentration_variant"]
  # frequency_* 系（frequency_increase_* 2件 / frequency_decrease_* 3件（計5件））および
  # se_frequency_reduced_due_to_irritation: gate なし（全製品で到達可能）。OD-D / OD-2（Owner Decision 確定）。
  # 根拠は Human-authored chassis 上、別製品 variation の存在を前提としない回数変更 scenario で
  # あり product capability gate を要求しないこと（chemical mediator OD-7 と同型）。
  # 添付文書の用法が複数回数（1日3～5回）で記載されていること、わかもと GE のみ「適宜増減」と
  # 記載されていることは回数変更 capability の根拠にしていない（capability tag を付与していない）。
addonRequiredTags:
  # 懸濁性点眼液の振り混ぜ・先端上向き保管（reserved）
  addon_eye_drop_suspension_shake: ["suspension"]
  addon_eye_drop_storage_upright_suspension: ["suspension"]
  # 遮光保存（Level 2: family 内に遮光対象製品が実在。AZ点眼液・アズレン点眼液の両方で候補化）
  addon_eye_drop_storage_light_protection: ["light_protection_variant_in_family"]
  # 冷所保存・冷所から出した後の取り扱い・未開封時のみ冷所（該当製品なし → reserved）
  addon_eye_drop_storage_cold: ["cold_storage"]
  addon_eye_drop_warm_container_after_cold_storage: ["cold_storage"]
  addon_eye_drop_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 低温保存を避ける製品（該当製品を確認できない → reserved）
  addon_eye_drop_avoid_cold_storage: ["avoid_cold_storage"]
  # 1回使い切り容器・PF（確認した 3 製品に該当なし。family 内 variant の実在も未確認のため
  # Level 2 tag は使わず property tag のまま reserved）
  addon_eye_drop_single_dose_mini: ["single_use_container"]
  addon_eye_drop_preservative_free_pf: ["preservative_free"]
# 次の ADDON は requiredTags を設定せず、常時候補とする:
# - addon_eye_drop_interval_after_suspension_5min / addon_eye_drop_interval_after_suspension_10min
#   併用する「他の」懸濁性点眼薬との使用順・点眼間隔を扱う内容であり、条件は自剤ではなく併用薬の
#   性質にある。自剤の handlingTags（suspension）で gate すると本来表示すべき場面を誤って排除する
# - addon_eye_drop_contact_lens_remove_before_use
#   実際に交付される製品・レンズ種別・添付文書によって可否が異なり、薬剤師の Human judgment に
#   委ねる（H1/PG/chemical mediator と同一理由）
# - addon_eye_drop_tip_contamination / addon_eye_drop_after_opening_expiry /
#   addon_eye_drop_interval_5min / addon_eye_drop_interval_10min: 全製品共通の常時候補
# - addon_adherence_* 系 6 件: 全製品共通の常時候補
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


【SCENARIO｜type=treatment_start｜id=initial｜title=抗炎症点眼薬 初回】
S
抗炎症点眼薬は、{{applicationSite}}眼の炎症症状に対して追加となった。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬は、炎症症状の改善を目的として追加となった。
炎症に関与する反応を抑えることで、炎症症状の改善を目的として使用する。
P
抗炎症点眼薬は、眼の炎症症状を改善する薬です。
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




【SCENARIO｜type=treatment_start｜id=restart｜title=抗炎症点眼薬 再開】
S
抗炎症点眼薬は、{{applicationSite}}眼の炎症症状に対して再開となった。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬は、炎症症状の改善を目的として再開となった。
炎症に関与する反応を抑えることで、炎症症状の改善を目的として使用する。
P
抗炎症点眼薬は、眼の炎症症状を改善する薬です。
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




【SCENARIO｜type=treatment_start｜id=external_start｜title=抗炎症点眼薬 他所開始】
S
抗炎症点眼薬は、{{applicationSite}}眼の炎症症状に対して他院で開始され継続使用中であった。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬は、炎症症状の改善を目的として継続使用中であった。
炎症に関与する反応を抑えることで、炎症症状の改善を目的として使用する。
P
抗炎症点眼薬は、眼の炎症症状を改善する薬です。
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




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_low_perceived_effect｜title=抗炎症点眼薬 回数増（効果実感乏しい）｜scenarioColor=blue】
S
抗炎症点眼薬は、効果の実感が乏しいため点眼回数が増えた。
O
抗炎症点眼薬　点眼回数増
A
抗炎症点眼薬は、効果不十分のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_low_perceived_effect｜title=抗炎症点眼薬 濃度増（効果実感乏しい）｜scenarioColor=green】
S
抗炎症点眼薬は、効果の実感が乏しいため、より効果が高いものへ変更となった。
O
抗炎症点眼薬　高濃度製剤へ変更
A
抗炎症点眼薬は、効果不十分のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_due_to_other_med_adjustment｜title=抗炎症点眼薬 回数増（他剤との調整）｜scenarioColor=blue】
S
抗炎症点眼薬は、他剤との調整により点眼回数が増えた。
O
抗炎症点眼薬　点眼回数増
A
抗炎症点眼薬は、併用薬との調整のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_due_to_other_med_adjustment｜title=抗炎症点眼薬 濃度増（他剤との調整）｜scenarioColor=green】
S
抗炎症点眼薬は、他剤との調整により、より効果が高いものへ変更となった。
O
抗炎症点眼薬　高濃度製剤へ変更
A
抗炎症点眼薬は、併用薬との調整のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_improved｜title=抗炎症点眼薬 回数減（症状改善）｜scenarioColor=blue】
S
抗炎症点眼薬は、症状が改善したため点眼回数が減った。
O
抗炎症点眼薬　点眼回数減
A
抗炎症点眼薬は、症状改善を踏まえ点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_improved｜title=抗炎症点眼薬 濃度減（症状改善）｜scenarioColor=green】
S
抗炎症点眼薬は、症状が改善したため、より効果が穏やかなものへ変更となった。
O
抗炎症点眼薬　低濃度製剤へ変更
A
抗炎症点眼薬は、症状改善を踏まえ、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_low_perceived_effect｜title=抗炎症点眼薬 回数減（効果実感乏しい）｜scenarioColor=blue】
S
抗炎症点眼薬は、効果の実感が乏しく使用継続に不安があるため、点眼回数を減らして継続することとなった。
O
抗炎症点眼薬　点眼回数減
A
抗炎症点眼薬は、効果実感の乏しさと使用継続への不安を踏まえ、点眼回数を減らして治療継続となった。
点眼回数変更後は、症状や使用状況について確認を要する。
P
抗炎症点眼薬は、変更された点眼回数で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_low_perceived_effect｜title=抗炎症点眼薬 濃度減（効果実感乏しい）｜scenarioColor=green】
S
抗炎症点眼薬は、効果の実感が乏しく使用継続に不安があるため、より効果が穏やかなものへ変更して継続することとなった。
O
抗炎症点眼薬　低濃度製剤へ変更
A
抗炎症点眼薬は、効果実感の乏しさと使用継続への不安を踏まえ、低濃度製剤へ変更して治療継続となった。
製剤変更後は、症状や使用状況について確認を要する。
P
抗炎症点眼薬は、変更された製剤で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_due_to_other_med_adjustment｜title=抗炎症点眼薬 回数減（他剤との調整）｜scenarioColor=blue】
S
抗炎症点眼薬は、他剤との調整により点眼回数が減った。
O
抗炎症点眼薬　点眼回数減
A
抗炎症点眼薬は、併用薬との調整のため点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_due_to_other_med_adjustment｜title=抗炎症点眼薬 濃度減（他剤との調整）｜scenarioColor=green】
S
抗炎症点眼薬は、他剤との調整により、より効果が穏やかなものへ変更となった。
O
抗炎症点眼薬　低濃度製剤へ変更
A
抗炎症点眼薬は、併用薬との調整のため、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=switch_to_sustained_formulation_reduced_frequency｜title=抗炎症点眼薬 持続型製剤へ変更（点眼回数減）｜scenarioColor=orange】
S
抗炎症点眼薬は、点眼回数を減らすために変更となった。
O
抗炎症点眼薬　持続型製剤へ変更
A
抗炎症点眼薬は、点眼回数を減らすため、持続型製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_irritation_none｜title=抗炎症点眼薬 副作用なし（刺激感）】
S
抗炎症点眼薬を使用して症状は落ち着いている。
刺激感は認めない。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬による刺激感は現時点で認められず、治療継続が可能である。
P
抗炎症点眼薬の継続中に刺激感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_foreign_body_sensation_none｜title=抗炎症点眼薬 副作用なし（異物感）】
S
抗炎症点眼薬を使用して症状は落ち着いている。
異物感は認めない。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬による異物感は現時点で認められず、治療継続が可能である。
P
抗炎症点眼薬の継続中に異物感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pruritus_none｜title=抗炎症点眼薬 副作用なし（掻痒感）】
S
抗炎症点眼薬を使用して症状は落ち着いている。
掻痒感は認めない。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬による掻痒感は現時点で認められず、治療継続が可能である。
P
抗炎症点眼薬の継続中に掻痒感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_redness_none｜title=抗炎症点眼薬 副作用なし（充血）】
S
抗炎症点眼薬を使用して症状は落ち着いている。
充血は認めない。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬による充血は現時点で認められず、治療継続が可能である。
P
抗炎症点眼薬の継続中に充血が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_good｜title=抗炎症点眼薬 CP良好】
S
薬を使用して症状は落ち着いている。
使用忘れなく継続できている。
O
抗炎症点眼薬　使用中
A
コンプライアンスは良好で、治療継続に問題はない。
P
引き続き用法を守って使用することで、治療効果の維持が期待されます。
今後も継続して使用できるようにすることが大切です。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=抗炎症点眼薬 CP不良（使用忘れ）】
S
使用を忘れることがある。
症状は大きく変わっていない。
O
抗炎症点眼薬　使用中
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




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=抗炎症点眼薬 CP不良（自己判断）】
S
自己判断で使用を調整することがある。
症状は大きく変わっていない。
O
抗炎症点眼薬　使用中
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




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=抗炎症点眼薬 CP不良（受診遅延）】
S
受診が遅れ、使用を調整することがある。
症状は大きく変わっていない。
O
抗炎症点眼薬　使用中
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




【SCENARIO｜type=usage｜id=as_needed_refill_needed｜title=抗炎症点眼薬 頓用使用（処方あり）】
S
抗炎症点眼薬は、症状が出た時に使用している。
使用により残薬が少なくなったため、継続処方となった。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬は、症状出現時に使用されており、残薬状況を踏まえ継続処方となった。
P
抗炎症点眼薬は、症状が出た時に、指示された用法に従って使用してください。
使用頻度が増えている場合や、症状が続く場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=usage｜id=as_needed_refill_not_needed｜title=抗炎症点眼薬 頓用使用（処方なし）】
S
抗炎症点眼薬は、症状が出た時に使用している。
残薬があるため、今回は処方なしとなった。
O
抗炎症点眼薬　使用中
A
抗炎症点眼薬は、症状出現時に使用されており、残薬があるため今回は処方なしとなった。
P
抗炎症点眼薬は、症状が出た時に、指示された用法に従って使用してください。
症状が続く場合や、使用頻度が増える場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_improved｜title=抗炎症点眼薬 終了（改善）】
S
抗炎症点眼薬は、症状が改善したため中止となった。
O
抗炎症点眼薬　処方終了
A
抗炎症点眼薬は、症状改善により終了となった。
終了後に症状が悪化する可能性があるため、注意が必要である。
P
抗炎症点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=抗炎症点眼薬 終了（効果不十分）】
S
抗炎症点眼薬は、効果不十分のため中止となった。
O
抗炎症点眼薬　処方終了
A
抗炎症点眼薬は、効果不十分のため終了となった。
終了後は、目の症状の変化について確認を要する。
P
抗炎症点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=抗炎症点眼薬 終了（無効）】
S
抗炎症点眼薬は、効果が認められなかったため中止となった。
O
抗炎症点眼薬　処方終了
A
抗炎症点眼薬は、効果が認められなかったため終了となった。
終了後は、目の症状の変化について確認を要する。
P
抗炎症点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_mild_continue｜title=抗炎症点眼薬 SE継続（軽症 刺激感）】
S
抗炎症点眼薬の使用により刺激感があるが、日常生活は送れている。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬による刺激感を軽度認めるが、治療継続が可能である。
P
抗炎症点眼薬による刺激感が軽い場合は、そのまま経過をみてください。
刺激感が続く場合や強くなる場合は、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_moderate_consider_dr｜title=抗炎症点眼薬 SE継続（中等度 刺激感）】
S
抗炎症点眼薬の使用により刺激感が強く、辛いことがあるが、日常生活は送れている。
O
抗炎症点眼薬　処方
A
抗炎症点眼薬による刺激感が強く、継続困難の可能性があるため対応を要する。
P
抗炎症点眼薬による刺激感が続く場合や強くなる場合は、使用回数の調整や薬剤の変更が必要になることがあります。
症状が続く場合は、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_irritation｜title=抗炎症点眼薬 SE変更（刺激感）】
S
抗炎症点眼薬の使用により刺激感が出現したため、他剤へ変更となった。
O
抗炎症点眼薬　処方変更
A
抗炎症点眼薬の使用による刺激感を認め、他剤変更後の経過確認を要する。
P
抗炎症点眼薬の変更後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_irritation｜title=抗炎症点眼薬 SE回数減（刺激感）】
S
抗炎症点眼薬の使用により刺激感が強いため、点眼回数が減った。
O
抗炎症点眼薬　点眼回数減
A
抗炎症点眼薬の使用による刺激感を認め、点眼回数変更後の経過確認を要する。
P
抗炎症点眼薬の点眼回数が減った後も刺激感が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_irritation｜title=抗炎症点眼薬 SE濃度減（刺激感）】
S
抗炎症点眼薬の使用により刺激感が強かったため、効果が穏やかなものになった。
O
抗炎症点眼薬　低濃度製剤へ変更
A
抗炎症点眼薬の使用による刺激感を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
抗炎症点眼薬を低濃度製剤へ変更後も、刺激感が続く場合や、気になる症状、使用感の変化がありましたらご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_irritation｜title=抗炎症点眼薬 SE中止（刺激感）】
S
抗炎症点眼薬の使用により刺激感が強いため、中止となった。
O
抗炎症点眼薬　処方中止
A
抗炎症点眼薬の使用による刺激感を認め、中止後の経過確認を要する。
P
抗炎症点眼薬の中止後、目の症状の悪化や変化があればご相談ください。
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
