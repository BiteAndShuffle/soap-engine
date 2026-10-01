# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# cataract_pirenoxine_eye_drops
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# 【STATUS 遷移の記録（RULES §24）】DRAFT → FROZEN_FOR_PN1。
#   作成日: 2026-10-01（Header Draft + Human-authored SCENARIOS 収載。DRAFT）
#   遷移日: 2026-10-01（Owner の明示指示による）
#   根拠: Owner が Header 最終差分・OD-8〜OD-11・Human source parity・reachability・PENDING を確認し、
#         新しい Owner Decision がないことを宣言したうえで、Header の Freeze を指示した。
#   凍結対象: SCENARIOS_START〜SCENARIOS_END 本文（更新後 `添付用.md` + Owner-authorized P_ADDON 参照 8 行。
#         SCENARIO 38 件・ADDON 25 件）と、承認済みの Header 設計（OD-1〜OD-11）。
#   本遷移の変更範囲: STATUS 行、本状態説明コメント、未確定事項 P-2 の記載、「Owner Decision 待ち」注記のみ。
#         SCENARIOS 本文・Header 設計（drug / brandCatalog / aliases / handlingTags / scenarioRequiredTags /
#         addonRequiredTags / composition / display 等）は変更していない。
#   凍結に含まれないもの: P-3（未収載製品・GE の全数確認）・P-4（現在の流通状況）・P-5（薬局で調製後に交付する
#         運用の実務確認）は未解決の Fact follow-up であり、Freeze 済み Fact へ昇格させていない。
#   [Historical] 記載当時、PN1 以降・canonical JSON 生成・registry 接続は未着手で、PN1 の開始は Owner の明示指示を待つ状態だった。
#
# 【Source parity（2026-10-01 更新）】SCENARIOS_START〜SCENARIOS_END の基準は、Owner が OD-4 反映のため
# 再添付した更新後の `添付用.md`（SCENARIO 38 件・ADDON 25 件。新規 ADDON
# `addon_eye_drop_after_reconstitution_expiry_3weeks` の定義を含む。sha256 先頭 16 桁 `06ff98ea477d9b11`）とする。
# 旧 `添付用.md`（ADDON 24 件）との byte 一致は要求しない。
# 本 bridge の本文と更新後 `添付用.md` の許容差分は次の 1 種類のみ:
#   Owner-authorized structural edit（OD-4）: `addon_eye_drop_after_opening_expiry` を P_ADDON に列挙している
#   8 scenario（initial / restart / external_start / cp_poor_missed_doses / cp_poor_self_adjust /
#   cp_poor_visit_delay / end_insufficient_effect / end_ineffective）の当該行の直後へ
#   `- addon_eye_drop_after_reconstitution_expiry_3weeks` を 1 行追加（計 8 行）。
#   新 ADDON の定義・本文は更新後 `添付用.md` のまま（Owner 確定 text。AI 側で変更・要約・補足していない）。
#   scenario id / ADDON id / 既存 P_ADDON の順序 / P_ADDON_INLINE 位置 / P_CLOSING / scenarioColor /
#   uiGroup / uiVariant はすべて原稿のまま。
# 原稿への疑義は本文を編集せず、下記「原稿レビュー事項」に記録した。
#
# 値の出所ラベル:
#   [H] Owner-provided（依頼文で明示された事実・指示）
#   [OI] OWNER INTENT（薬局実務上の Owner 判断。一次資料 Fact へ昇格させていない）
#   [F] FACT（PMDA 添付文書で再確認できた記載）
#   [P] Claude proposal（Repository precedent・一次資料に基づく提案。Owner 未承認）
#   [D] 確定規則・precedent からの決定論的導出
#
# 参照した precedent（構造・責務分離・gating の reference。値は無条件に継承していない）:
#   bridges/ocular_inflammation_azulene_eye_drops.md（最新世代。JSON_COMPLETE）
#   bridges/allergy_chemical_mediator_release_inhibitor_eye_drops.md / bridges/glaucoma_pg_analog_eye_drops.md /
#   bridges/dry_eye_trpv1_antagonist_eye_drops.md（Avarept）
#   docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md（§4.2〜§4.5 Level 1/2/3）
#   docs/DESIGN_PRINCIPLES.md（DP-09 / DP-18 / DP-21 / DP-22）
#   prompts/RULES.md §8 §9 §10 §16 §21 §23 §24 §26 §27 / prompts/vNext/PN2-Drug-Header.md
#   H1 点眼の旧世代 Header は丸ごとコピーしていない。
#
# ─────────────────────────────────────────
# PMDA 添付文書による一次資料確認（2026-10-01 実施。
# `https://www.info.pmda.go.jp/go/pack/{YJコード}_{版}_{枝}/{同}?view=body&lang=ja` の本文を直接取得）:
#
#   [F-1] カタリン点眼用0.005%（千寿製薬 製造販売元・武田薬品工業 販売・YJ 1319706Q2039・
#         承認番号 21900AMX01690・添付文書 `1319706Q2039_1_08`・2022年11月改訂 第2版）
#         剤形: 錠剤 + 溶解液（15mL）の用時溶解製剤。組成: 1錠中ピレノキシン0.75mg / 溶解後 1mL中0.05mg
#         貯法（製品）: 室温保存 / 有効期間 3年（= 溶解前の錠剤・溶解液セットの条件）
#         溶解後の性状: 黄色澄明の水性点眼剤（懸濁性でない）/ pH 5.5〜6.5 / 溶解液に
#           パラオキシ安息香酸メチル・プロピル（防腐剤あり）
#         用法・用量: 「錠剤を添付溶解液に用時溶解し、1回1～2滴を1日3～5回点眼する。」（増減の記載なし）
#         14.1 薬剤交付時の注意:
#           ・溶解方法（大キャップを外し錠剤を直接溶解液へ入れ、よく振って溶解）
#           ・冷所に保存した点眼液は薬液が連続して落ちる場合があるため、点眼前にしばらく容器を手で温める
#           ・容器の先端が直接目に触れないようにする
#           ・他の点眼剤を併用する場合は少なくとも 5 分以上あける
#           ・「溶解後は、冷所に遮光して保存し、3週間以内に使用すること。」
#         20. 取扱い上の注意: 金属イオンの混入で色調が変化する
#         11.2 副作用: 霧視・刺激感・そう痒感・眼脂・眼の異物感 等（頻度不明）
#         包装: PTP1錠・溶解液容器15mL ×10 / ×50
#         記載なし: 懸濁性・PF・単回使用（ミニ）・低温保存禁止・コンタクトレンズ注意・運転/機械操作注意・
#           増減の記載・他濃度・持続型
#   [F-2] ピレノキシン懸濁性点眼液0.005%「参天」（参天製薬・YJ 1319706Q3043・承認番号 30200AMX00560・
#         添付文書 `1319706Q3043_1_03`・2022年2月改訂 第1版・一般的名称「ピレノキシン点眼液」）
#         性状: 「振り混ぜるとき、だいだい色に懸濁。無菌水性懸濁点眼剤」/ pH 3.4〜4.0
#         貯法: 室温保存 / 有効期間 3年 / 添加剤にベンザルコニウム塩化物（防腐剤あり）
#         用法・用量: 「用時よく振り混ぜたのち、1回1～2滴を1日3～5回点眼する。」
#         14.1: 点眼前にキャップをしたまま点眼瓶をよく振る / ベンザルコニウムがソフトコンタクトレンズに
#           吸着されるため点眼前にレンズを外し点眼後少なくとも 5〜10 分あけて再装用 / 先端接触防止 /
#           他の点眼剤併用は 5 分以上あける
#         20. 取扱い上の注意: 「保管の仕方によっては振り混ぜても粒子が分散しにくくなる場合があるので、
#           上向きに保管すること。」（懸濁だからという理由ではなく添付文書の明示記載）
#         11.2 副作用: 霧視・刺激感・そう痒感・眼脂・眼の異物感 等（頻度不明）
#         包装: プラスチック点眼容器 5mL ×10 / ×50
#         記載なし: 遮光・冷所・低温保存禁止・PF・単回使用・運転/機械操作注意・増減の記載・他濃度・持続型
#   [F-3] カタリンK点眼用0.005%（千寿製薬・武田薬品工業 販売・YJ 1319706Q1075・添付文書 `1319706Q1075_1_08`・
#         2022年11月改訂 第2版）: 顆粒 + 溶解液の用時溶解製剤。貯法は室温保存（3年）、溶解後は
#         「冷所に遮光して保存し、3週間以内に使用」、冷所保存後は容器を手で温める記載あり（F-1 と同型）。
#         ※ Owner Decision OD-2 により今回は収載しない（future expansion 候補）
#   [F-0] 効能・効果（F-1/F-2/F-3 共通）=「初期老人性白内障」。Human-authored 原稿の「白内障」「白内障の進行抑制」は
#         添付文書効能の逐語表現ではない（R-1）。作用機序は添付文書 18.1 にキノイド学説に基づく水晶体透明性の維持・
#         白内障進行の抑制の記載あり
#   [F-4] 上記 3 製品はいずれも 0.005% のみ・単回使用/PF/持続型/低温保存禁止の記載なし。
#         他濃度・持続型・PF・ミニの製品は、確認した PMDA 添付文書 3 件の範囲では存在しない
#         （全数調査は未実施 → PENDING P-3）。
#   [F-5] 「カリーユニ点眼液0.005%」の名称は F-2 の主要文献 1) にのみ現れる（参天の懸濁製剤）。
#         ピレノキシン点眼用0.005%「ニットー」（YJ 1319706Q1083）は PMDA 添付文書本文を取得できなかった。
#         いずれも未確認のため収載しない（PENDING P-3）。
#
# ─────────────────────────────────────────
# カタリンの patient-facing state =「調製後製剤」（Owner Decision OD-5・確定 2026-10-01）:
#   理由: [OI] 本 module の運用は、薬局で錠剤を添付溶解液に溶解・調製し、使用可能な状態にしてから患者へ
#         交付することを前提とする。患者が自宅で扱う（保管・点眼・廃棄する）対象は調製後の点眼液であり、
#         未調製の錠剤・溶解液セットを患者が自宅保管する通常運用ではない。したがって patient-facing runtime の
#         property・Addon・scenario は「調製後の状態」を基準にする。
#   別 Fact として保持する 2 つの条件（混同しない）:
#   [F-A] 製品としての貯法（添付文書 貯法欄）= 室温保存・有効期間 3年（溶解前の錠剤・溶解液セットの条件）
#   [F-B] 調製後（溶解後）の保存 = 冷所・遮光・3週間以内に使用（14.1）
#   [OI] 溶解後は遮光袋に入れて冷所で保管する運用（遮光 / 冷所 Addon 本文は現状維持）
#   [D]  brandCatalog の property tag は調製後の状態を表す（cold_storage / light_protection /
#        expiry_after_reconstitution_3weeks）。F-A（室温保存）を current SKU property として付与していない。
#        cold_storage_before_opening（未開封 / 未調製時のみ冷所）は付与しない。未調製状態専用の保管 Addon も
#        患者向けに出さない（reservedHandlingTags）。
#   [PEND] 「薬局で調製後に交付される」運用そのものは添付文書から断定できない（添付文書は患者が
#        錠剤を溶解する運用を含む記載）。Owner intent のまま保持し Fact へ昇格させない（P-5）
#
# ─────────────────────────────────────────
# Owner Decision 確定事項（[H]・2026-10-01。Header / gate 設計と Owner-authorized な P_ADDON 参照追加のみへ反映）:
#   OD-1 [H] 承認。formal entry 名を内部識別（brandCatalog key）に使用し、通称は alias にする。
#        entry 1 =「カタリン点眼用」（正式販売名は「カタリン点眼用0.005%」。「カタリン点眼液」は通称・alias）
#        entry 2 =「ピレノキシン懸濁性点眼液」（正式販売名は「…0.005%「参天」」。製剤特性〔懸濁〕を保持する内部識別）
#        内部識別（key）と patient-facing な一般名表示を分離する（OD-10 で最終化。下記）。
#   OD-2 [H] 承認。今回の収載は 2 entry（カタリンK は収載しない。future expansion 候補。下記「Future expansion」）
#   OD-3 [H] 承認。回数変更 scenario（frequency_* 4 件 + se_frequency_reduced_due_to_irritation）は両 entry とも
#        ungated で到達可能
#   OD-4 [H] 修正して承認。更新後 `添付用.md` を Human source 基準とし、Owner 確定 text の新 ADDON
#        `addon_eye_drop_after_reconstitution_expiry_3weeks`（カタリン専用）を採用。
#        - 既存 `addon_eye_drop_after_opening_expiry`（ID・本文不変）と `lifestyle_guidance_after_opening_expiry`
#          （「開封後1ヶ月」）はカタリンで非到達、ピレノキシン懸濁性点眼液では「既存設計どおり」到達
#        - 新 ADDON はカタリンで到達、ピレノキシン懸濁性点眼液で非到達
#        - 新 ADDON の P_ADDON 参照: `addon_eye_drop_after_opening_expiry` を列挙する全 8 scenario の直後に追加
#          （Owner-authorized structural edit。新 ADDON を候補として到達させるために必要。8 scenario すべてが
#          既存 ADDON を列挙しており、追加不要と判断した scenario はない）
#        - 「溶解後3週間」の lifestyle scenario は今回新設しない（必要性は OD-9 として提示）
#        - 到達制御は handlingTags の AND gate のみで表現でき、NOT 条件の contract はないため、
#          製品別 property tag を 2 つ新設した（OD-11 で命名を確定）:
#          after_opening_1month_guidance_available（ピレノキシン懸濁性点眼液）/ expiry_after_reconstitution_3weeks（カタリン）
#   OD-5 [H] 承認。カタリンの cold_storage は患者へ交付される調製後状態の property。cold_storage_before_opening は付与しない
#   OD-6 [H] 承認。ピレノキシン懸濁性「参天」には light_protection_variant_in_family を付与しない
#   OD-7 [H] 承認。cataract_pirenoxine_eye_drops / pirenoxine / pirenoxine_ophthalmic / domain cataract
#
#   OD-8 [H] 承認（2026-10-01）。R-1〜R-5 は下記「原稿レビュー事項」のとおり確定（各項の Owner 指示を併記）
#   OD-9 [H] 確定。「溶解後3週間」の lifestyle scenario は今回新設しない。患者指導は
#        addon_eye_drop_after_reconstitution_expiry_3weeks で担保する。独立した scenario は future enhancement とし、
#        scenario 本文を追加していない
#   OD-10 [H] 確定。既存 contract を変更しない（lib/ / RULES / ModuleValidator / brand display contract は無変更）。
#        brandCatalog[key].displayName === key（RULES §21 / ModuleValidator check 13b）を維持する。
#          - 内部 brand key / brand-level display: 「ピレノキシン懸濁性点眼液」「カタリン点眼用」（formal / internal identity）
#          - displayGenericName: 両 entry とも「ピレノキシン点眼液」
#        検索候補・パンくず・SOAP 本文・{{drug_subject}} 等、既存 contract 上 displayGenericName が使われる
#        patient-facing 箇所では「ピレノキシン点眼液」が表示される。この要件のために displayName 分離の
#        contract 変更は行わない。カタリンも同じ原則（formal / internal identity と patient-facing generic display を分離）
#   OD-11 [H] 確定。製品別に使用期限指導を分離する gate の新設を承認。
#        - カタリン: expiry_after_reconstitution_3weeks（承認済み名称。添付文書 14.1「溶解後は…3週間以内に使用」= 製品 Fact に対応）
#        - 懸濁性「参天」: after_opening_1month_guidance_available
#            ・「guidance applicability」を示す命名。添付文書に「開封後1ヶ月」の明示はなく、製品 Fact ではない
#              （R-2: Human-authored の一般衛生指導の適用 gate）
#            ・命名 precedent: corpus の「能力・適用可否」系 tag の suffix パターン（`_available` / `_supported` / `_option`。
#              実測: frequency_titration_available〔PG〕/ dose_adjustment_supported / ckd_supported / reduced_frequency_option）。
#              `*_applicable` は corpus に precedent がないため、実在する `_available` パターンを優先した
#        - brand 未確定（generic denotation）では handlingTags の交差集合が空になり、両 expiry Addon と
#          `lifestyle_guidance_after_opening_expiry` は非表示（brand 確定後に表示）
#
# Owner Decision 待ち: なし（OD-1〜OD-11 すべて確定。2026-10-01 に Owner の指示で FROZEN_FOR_PN1 へ遷移した）
#
# 原稿レビュー事項 R-1〜R-5（OD-8 で承認・確定。SCENARIOS 本文は編集していない）:
#   R-1 [承認] Human-authored 原稿の「白内障」「白内障の進行抑制」はそのまま保持する。
#       [F] PMDA 上の効能は「初期老人性白内障」（F-1/F-2）。これは Header 上の Fact として別に保持し、
#       原稿表現を添付文書効能の逐語表現として扱わない
#   R-2 [承認] カタリンは Owner Decision どおり「溶解後3週間」専用 Addon（addon_eye_drop_after_reconstitution_expiry_3weeks）へ
#       分離。懸濁性「参天」の addon_eye_drop_after_opening_expiry（開封後1ヶ月）は、添付文書に 1ヶ月の明示がないため
#       PMDA 由来の製品 Fact とは扱わず、Human-authored の一般衛生指導として扱う
#       （lifestyle_guidance_after_opening_expiry も同様。カタリンでは非到達）
#   R-3 [承認] カタリンの「遮光袋」は Owner の薬局実務上の patient-facing guidance として保持する。
#       [F] 添付文書 Fact は「冷所に遮光して保存」（袋の指定はない）。「遮光袋」の指定は Owner 実務判断として区別する
#       （本文は現状維持）
#   R-4 [承認] addon_eye_drop_warm_container_after_cold_storage はカタリンのみ到達（cold_storage gate）。
#       本文はカタリン 14.1（冷所保存した点眼液は連続して落ちる場合があるため容器を手で温める）と意味が一致する
#   R-5 [承認] JSON 化時、薬効分類名を含む O は既存 contract に従い {{drug_subject}} 化する。
#       lifestyle_guidance_* の O「点眼薬　使用中」は generic noun exception（RULES §16）として逐語保持する
#       （本 Header の product-identity 値のいずれも「点眼薬　使用中」に部分文字列として含まれないことを確認済み）
#
# 未確定事項（Fact follow-up。Freeze 済み Fact ではない）:
#   P-1 [解決] Owner Decision OD-1〜OD-11 はすべて確定（2026-10-01）
#   P-2 [解決・2026-10-01] Owner による Freeze 指示（STATUS: DRAFT → FROZEN_FOR_PN1）
#   P-3 他製品（カタリンK / カリーユニ / ニットー / 他 GE）の全数確認。現 Header の reserved / 非付与は
#       「確認した PMDA 添付文書 3 件の範囲」に基づく暫定扱い
#   P-4 各製品の現在の販売・流通状況（添付文書からは確認できない。供給状況 DB は取得不能〔HTTP 403〕）
#   P-5 カタリンの「薬局調製後に交付」運用の実務確認（Owner intent。添付文書から断定できない）
#
# Future expansion（今回収載しない。OD-2）:
#   カタリンK点眼用0.005%（YJ 1319706Q1075・F-3）は、カタリンと同系統のピレノキシン用時溶解型点眼剤
#   （顆粒 + 溶解液。溶解後の保存条件は F-1 と同一）。今回の patient-facing runtime は調製後状態を中心に扱うため
#   収載対象に含めず、future expansion 候補に留める。追加する場合は別 entry + 別 Owner Decision とし、
#   本 Header の値を無条件に継承しない。
#   カリーユニ・ニットー（F-5）も同様に未収載（P-3）。
#
# 点眼共通シャーシ原則（azulene / H1 / PG / chemical mediator と共通）:
#   - scenario / addon の存在 = 共通シャーシが持つ capability（該当製品がないことを理由に削除しない）
#   - brandCatalog.handlingTags = その製品で確定している property、または family-level variant candidate
#   - scenarioRequiredTags / addonRequiredTags = 表示条件（reachability gate）
#   - template.reservedHandlingTags = 現行製品では到達不能だが、共通シャーシとして意図的に保持する
#     capability（RULES §27）
#
# Rapid: Rapid v2 profile（`lib/rapidV2.ts` の RAPID_V1_TEMPORARY_EXCLUSIONS は空集合）。display.adjustmentExpression
#   は記載しない（azulene / chemical mediator と同型）。rapidEvaluationSubject は原稿に「症状」以外の
#   評価 subject がないため使用しない。
#
moduleId: "cataract_pirenoxine_eye_drops"

# [P] OD-7。眼科 module の categoryPath は 4階層・末端「点眼」・「外用」を含めない（azulene / PG / chemical mediator / Avarept と同型）。
categoryPath:
  - "白内障"
  - "白内障治療点眼薬"
  - "ピレノキシン系"
  - "点眼"

composition:
  # [P] OD-7。薬効クラスは classKey、剤形・経路は nodeKey（{classKey}_{route}）
  classKey: "pirenoxine"
  nodeKey: "pirenoxine_ophthalmic"
  domain: "cataract"
  clinicalDomain: "cataract"
  sMergeDomain: "cataract"
  priority: "chronic"
  # JS-A-composition 必須。display.nodeLabelShort / nodeLabelLong と完全一致
  nodeLabelShort: "白内障点眼"
  nodeLabelLong: "白内障治療点眼薬"
  # groupKeyRegistry は宣言しない（PN2/Phase6 の責務）。sMergePolicy / JS-B 4 key は生成しない。

drug:
  # [H] ユーザー向け薬効表示（原稿本文の薬効分類名と同一）。本 module の収載対象はピレノキシン系に限定
  genericName: "白内障治療点眼薬"
  brandNames:
    - "カタリン点眼用"
    - "ピレノキシン懸濁性点眼液"
  drugClass:
    - "PIRENOXINE_EYE_DROPS"
  route: "ophthalmic"
  dosageForms:
    - "eye_drop"
  drugSpecificTags:
    - "pirenoxine"
    - "cataract_eye_drop"
    - "eye_drops"
    - "ophthalmic"
    - "cataract"
    - "external_use"
    - "storage_instruction"
    - "formulation_instruction"
    - "contact_lens_caution"
  search:
    # [D] = drug.genericName
    primaryDisplayName: "白内障治療点眼薬"
    exactAliases:
      # [F] 正式販売名の stem（濃度 0.005% は含めない。azulene OD-11 と同型）
      - "カタリン点眼用"
      - "ピレノキシン懸濁性点眼液"
      # [H] Owner 通称（正式名称ではない。検索 alias としてのみ保持。OD-1）
      - "カタリン点眼液"
      - "ピレノキシン点眼液"
      # [P] bare 名（点眼シャーシ実績）。ピレノキシンは成分名で、両 entry の generic identity
      - "カタリン"
      - "ピレノキシン"
      # [P] 薬効分類名（シャーシ実績）
      - "白内障治療点眼薬"
    # nameAliases: brandNames 順に各 entry の aliases を連結（RULES §8 / §23）。
    nameAliases:
      - "かたりんてんがん"
      - "かたりん"
      - "ぴれのきしんけんだくせいてんがん"
      - "ぴれのきしんけんだくせい"
    # [P] SCENARIOS 本文・categoryPath に現れる語のみ
    keywords:
      - "白内障"
      - "白内障治療点眼薬"
      - "進行抑制"
      - "点眼"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      # JS-A: 全 module true
      suppressCrossModuleSuggestionsOnExactHit: true
      # brand（カタリン）/ 成分（ピレノキシン）構造を持つため opt-in（azulene / PG / chemical mediator と同型）
      preferOwnNameMatchOverGenericMatch: true
      suppressRedundantGenericHeaderOnDirectMatch: true
  # drug.nameAliases は drug.search.nameAliases と要素・順序まで完全一致（RULES §8）。[D]
  nameAliases:
    - "かたりんてんがん"
    - "かたりん"
    - "ぴれのきしんけんだくせいてんがん"
    - "ぴれのきしんけんだくせい"
  # ─────────────────────────────────────────
  # brandCatalog
  #   - genericKey は設定しない（RULES §21 / DP-18。displayGenericName へのフォールバックで成立）。
  #   - genericName は DP-21（剤形非依存の有効成分 identity）に従い「ピレノキシン」。displayGenericName は
  #     PMDA 一般的名称（F-2）に合わせ「ピレノキシン点眼液」。両 entry で同値。[P]
  #   - カタリン点眼用: Level 1 property を「調製後の使用可能製剤」について付与する（OD-5 [OI] + [F-B] 14.1）。
  #       cold_storage・light_protection・light_protection_variant_in_family・expiry_after_reconstitution_3weeks
  #       light_protection_variant_in_family は property 保持 brand の併記（PRODUCT_VARIANT §4.4）
  #       expiry_after_reconstitution_3weeks は「溶解後 3週間以内に使用」（F-B）に対応
  #       調製前（[F-A] 室温保存）を property として付与しない。cold_storage_before_opening は付与しない
  #   - ピレノキシン懸濁性点眼液: Level 1 property suspension と、Owner 設計上の after_opening_1month_guidance_available
  #       （OD-4「既存設計どおり」到達。添付文書の Fact ではない）。
  #       遮光・冷所の記載なし（F-2）→ light_protection / cold_storage を付与しない。
  #       OD-6: light_protection_variant_in_family も付与しない。
  #       suspension_upright_storage は専用 tag を持たず、addon_eye_drop_storage_upright_suspension は
  #       suspension gate で到達する。根拠は添付文書 20. の明示記載（F-2）であり、懸濁だからという理由のみではない
  #   - preservative_free / single_use_container / concentration_variant / reduced_frequency_option /
  #     avoid_cold_storage / cold_storage_before_opening は該当製品が確認できないため、どの entry にも付与しない
  #     （推測付与しない。reservedHandlingTags で保持）。
  #   - *_variant_in_family（PF / single_use）は family 内に該当 variant の実在が確認できないため付与しない。
  # ─────────────────────────────────────────
  brandCatalog:
    カタリン点眼用:
      displayName: "カタリン点眼用"
      genericName: "ピレノキシン"
      displayGenericName: "ピレノキシン点眼液"
      handlingTags:
        - "cold_storage"
        - "light_protection"
        - "light_protection_variant_in_family"
        - "expiry_after_reconstitution_3weeks"
      aliases:
        - "かたりんてんがん"
        - "かたりん"
      normalizedAliases:
        - "かたりんてんがん"
        - "かたりん"
    ピレノキシン懸濁性点眼液:
      displayName: "ピレノキシン懸濁性点眼液"
      genericName: "ピレノキシン"
      displayGenericName: "ピレノキシン点眼液"
      handlingTags:
        - "suspension"
        - "after_opening_1month_guidance_available"
      aliases:
        - "ぴれのきしんけんだくせいてんがん"
        - "ぴれのきしんけんだくせい"
      normalizedAliases:
        - "ぴれのきしんけんだくせいてんがん"
        - "ぴれのきしんけんだくせい"
  # aliasToBrand は全 entry の normalizedAliases を過不足なく網羅する（RULES §10）。[D]
  aliasToBrand:
    "かたりんてんがん": "カタリン点眼用"
    "かたりん": "カタリン点眼用"
    "ぴれのきしんけんだくせいてんがん": "ピレノキシン懸濁性点眼液"
    "ぴれのきしんけんだくせい": "ピレノキシン懸濁性点眼液"

template:
  templateId: "cataract_pirenoxine_eye_drops_v1"
  templateVersion: "1.0.0"
  situationTags:
    - "general"
    - "cataract"
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
    # 使用期限 Addon / scenario の製品別 gate（OD-4。NOT 条件の contract がないため製品別に property tag を分離）
    - "after_opening_1month_guidance_available"
    - "expiry_after_reconstitution_3weeks"
  reservedHandlingTags:
    # 現行 2 entry のいずれも保持しない chassis capability（RULES §27）。
    # 確認した PMDA 添付文書 3 件に該当製品が存在しないため reserved とする（P-3: 全数未確認）。
    # 該当製品が確認できた場合は本宣言から外し、対象 entry の handlingTags へ付与する。
    # （suspension / cold_storage / light_protection は entry が保持するため reserved に含めない）
    - "cold_storage_before_opening"
    - "avoid_cold_storage"
    - "single_use_container"
    - "preservative_free"
    - "concentration_variant"
    - "reduced_frequency_option"

display:
  title: "白内障治療点眼薬"
  # [P] 原稿本文（水晶体の混濁の進行を抑えることで白内障の進行抑制を目的として使用する）に基づく
  subtitle: "白内障の進行抑制を目的とした点眼治療"
  drugClassLabel: "白内障治療点眼薬"
  drugGeneric: "白内障治療点眼薬"
  nodeLabelShort: "白内障点眼"
  nodeLabelLong: "白内障治療点眼薬"
  # display.nodeKey は composition.nodeKey と一致させる（JSON_STANDARD JS-A-display）
  nodeKey: "pirenoxine_ophthalmic"
  # [P] Rapid v2 適合（azulene / chemical mediator と同型）。adjustmentExpression は記載しない
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
# 本 Header に正式な構造データ（id → tags のマップ）として定義する（azulene / PG / chemical mediator と同型）。
# 記載のない scenario / addon は常時表示（タグ条件なし）。Human-authored scenario を削除して
# reachability を調整していない（現行製品で到達できない scenario も本文は保持する）。
# ─────────────────────────────────────────
scenarioRequiredTags:
  # 懸濁性点眼液を前提とする手技・保管の指導（ピレノキシン懸濁性点眼液のみ到達。カタリンは溶解後澄明で非到達）
  lifestyle_guidance_suspension_shake: ["suspension"]
  lifestyle_guidance_storage_upright_suspension: ["suspension"]
  # 遮光保存を前提とする保管指導（SKU property。カタリン点眼用のみ到達。family-level tag は scenario gate に使わない）
  lifestyle_guidance_storage_light_protection: ["light_protection"]
  # 冷所保存を前提とする保管指導（SKU property。カタリン点眼用〔調製後〕のみ到達）
  lifestyle_guidance_storage_cold: ["cold_storage"]
  # 未開封時のみ冷所（該当製品なし → reserved。調製前状態の保管指導を患者向けに出さない）
  lifestyle_guidance_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 「開封後1ヶ月以上使用」指導（OD-4）: ピレノキシン懸濁性点眼液のみ到達。カタリンは非到達
  # （溶解後 3週間の scenario は今回新設しない。OD-9）
  lifestyle_guidance_after_opening_expiry: ["after_opening_1month_guidance_available"]
  # 持続型製剤への切替: 持続型相当製剤なし → 到達不能（reservedHandlingTags で保持）。本文は削除しない
  switch_to_sustained_formulation_reduced_frequency: ["reduced_frequency_option"]
  # 濃度増減（確認した 3 製品はいずれも 0.005% のみ → 到達不能・reserved）。本文は削除しない
  strength_increase_low_perceived_effect: ["concentration_variant"]
  strength_increase_due_to_other_med_adjustment: ["concentration_variant"]
  strength_decrease_improved: ["concentration_variant"]
  strength_decrease_due_to_other_med_adjustment: ["concentration_variant"]
  se_strength_decreased_due_to_irritation: ["concentration_variant"]
  # frequency_* 系（frequency_increase_* 2件 / frequency_decrease_* 2件）および
  # se_frequency_reduced_due_to_irritation: gate なし（全製品で到達可能）。[H] OD-3（承認・確定 2026-10-01。
  # azulene OD-2 / chemical mediator OD-7 と同型）。
addonRequiredTags:
  # 使用期限（OD-4）: 開封後1ヶ月（ID・本文不変）はピレノキシン懸濁性点眼液のみ、
  # 溶解後3週間（Owner 確定 text・カタリン専用）はカタリン点眼用のみ到達
  addon_eye_drop_after_opening_expiry: ["after_opening_1month_guidance_available"]
  addon_eye_drop_after_reconstitution_expiry_3weeks: ["expiry_after_reconstitution_3weeks"]
  # 懸濁性点眼液の振り混ぜ・先端上向き保管（ピレノキシン懸濁性点眼液のみ。上向き保管は添付文書 20. に明示）
  addon_eye_drop_suspension_shake: ["suspension"]
  addon_eye_drop_storage_upright_suspension: ["suspension"]
  # 遮光保存（Level 2 tag。カタリン点眼用が property 保持 brand として併記。懸濁性には付与しない。OD-6）
  addon_eye_drop_storage_light_protection: ["light_protection_variant_in_family"]
  # 冷所保存・冷所から出した後の取り扱い（カタリン点眼用〔調製後〕のみ）
  addon_eye_drop_storage_cold: ["cold_storage"]
  addon_eye_drop_warm_container_after_cold_storage: ["cold_storage"]
  # 未開封時のみ冷所・低温保存を避ける製品（該当製品なし → reserved）
  addon_eye_drop_storage_cold_before_opening: ["cold_storage_before_opening"]
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
#   委ねる（azulene / PG / chemical mediator と同一理由。参考: 懸濁性の添付文書にはベンザルコニウムの
#   ソフトコンタクトレンズ吸着注意があるが、カタリンの添付文書にコンタクトレンズの記載はない）
# - addon_eye_drop_blurred_vision_driving_caution（P_ADDON_INLINE。PG precedent と同じ常時候補）。
#   [区別] 霧視は両製品の 11.2 副作用に記載あり〔F〕。しかし「霧視時の運転・機械操作に注意」は添付文書の
#   明示 Fact ではない（記載なし〔F〕）。本 Addon は Human-authored の実務指導として扱い、一次資料 Fact へ
#   昇格させない。
# - addon_eye_drop_tip_contamination / addon_eye_drop_interval_5min / addon_eye_drop_interval_10min:
#   全製品共通の常時候補
# - addon_adherence_* 系 7 件: 全製品共通の常時候補
# （addon_eye_drop_after_opening_expiry は上記 addonRequiredTags で gate 済み。常時候補ではない）
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


【SCENARIO｜type=treatment_start｜id=initial｜title=白内障治療点眼薬 初回】
S
白内障治療点眼薬は、{{applicationSite}}眼の白内障に対して追加となった。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬は、白内障の進行抑制を目的として追加となった。
水晶体の混濁の進行を抑えることで、白内障の進行抑制を目的として使用する。
P
白内障治療点眼薬は、白内障の進行を抑えるために使用する薬です。
白内障の進行を抑えるため、継続して使用することが大切です。
P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
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




【ADDON｜type=lifestyle_guidance｜id=addon_eye_drop_after_reconstitution_expiry_3weeks｜title=使用期限（溶解後3週間）】
P_APPEND
溶解後の点眼薬は、衛生面を考慮し、3週間後を目安に処分してください。




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




【SCENARIO｜type=treatment_start｜id=restart｜title=白内障治療点眼薬 再開】
S
白内障治療点眼薬は、{{applicationSite}}眼の白内障に対して再開となった。


O
白内障治療点眼薬　処方


A
白内障治療点眼薬は、白内障の進行抑制を目的として再開となった。
水晶体の混濁の進行を抑えることで、白内障の進行抑制を目的として使用する。


P
白内障治療点眼薬は、白内障の進行を抑えるために使用する薬です。
白内障の進行を抑えるため、継続して使用することが大切です。


P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
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




【SCENARIO｜type=treatment_start｜id=external_start｜title=白内障治療点眼薬 他所開始】
S
白内障治療点眼薬は、{{applicationSite}}眼の白内障に対して他院で開始され継続使用中であった。


O
白内障治療点眼薬　処方


A
白内障治療点眼薬は、白内障の進行抑制を目的として継続使用中であった。
水晶体の混濁の進行を抑えることで、白内障の進行抑制を目的として使用する。


P
白内障治療点眼薬は、白内障の進行を抑えるために使用する薬です。
白内障の進行を抑えるため、継続して使用することが大切です。


P_ADDON
- addon_eye_drop_tip_contamination
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
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




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_treatment_adjustment｜title=白内障治療点眼薬 回数増（治療調整）｜scenarioColor=blue】
S
白内障治療点眼薬は、治療内容の調整により点眼回数が増えた。


O
白内障治療点眼薬　点眼回数増


A
白内障治療点眼薬は、治療内容の調整に伴い点眼回数が増えた。
点眼回数変更後の使用状況や目の状態について確認を要する。


P
白内障治療点眼薬は、変更された用法に従って使用してください。
使用中に気になる症状がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_low_perceived_effect｜title=白内障治療点眼薬 濃度増（効果実感乏しい）｜scenarioColor=green】
S
白内障治療点眼薬は、効果の実感が乏しいため、より効果が高いものへ変更となった。
O
白内障治療点眼薬　高濃度製剤へ変更
A
白内障治療点眼薬は、効果不十分のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_due_to_other_med_adjustment｜title=白内障治療点眼薬 回数増（他剤との調整）｜scenarioColor=blue】
S
白内障治療点眼薬は、他剤との調整により点眼回数が増えた。
O
白内障治療点眼薬　点眼回数増
A
白内障治療点眼薬は、併用薬との調整のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_due_to_other_med_adjustment｜title=白内障治療点眼薬 濃度増（他剤との調整）｜scenarioColor=green】
S
白内障治療点眼薬は、他剤との調整により、より効果が高いものへ変更となった。
O
白内障治療点眼薬　高濃度製剤へ変更
A
白内障治療点眼薬は、併用薬との調整のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_treatment_adjustment｜title=白内障治療点眼薬 回数減（治療調整）｜scenarioColor=blue】
S
白内障治療点眼薬は、治療内容の調整により点眼回数が減った。


O
白内障治療点眼薬　点眼回数減


A
白内障治療点眼薬は、治療内容の調整に伴い点眼回数が減った。
点眼回数変更後の使用状況や目の状態について確認を要する。


P
白内障治療点眼薬は、変更された用法に従って使用してください。
使用中に気になる症状がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_improved｜title=白内障治療点眼薬 濃度減（症状改善）｜scenarioColor=green】
S
白内障治療点眼薬は、症状が改善したため、より効果が穏やかなものへ変更となった。
O
白内障治療点眼薬　低濃度製剤へ変更
A
白内障治療点眼薬は、症状改善を踏まえ、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_due_to_other_med_adjustment｜title=白内障治療点眼薬 回数減（他剤との調整）｜scenarioColor=blue】
S
白内障治療点眼薬は、他剤との調整により点眼回数が減った。
O
白内障治療点眼薬　点眼回数減
A
白内障治療点眼薬は、併用薬との調整のため点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_due_to_other_med_adjustment｜title=白内障治療点眼薬 濃度減（他剤との調整）｜scenarioColor=green】
S
白内障治療点眼薬は、他剤との調整により、より効果が穏やかなものへ変更となった。
O
白内障治療点眼薬　低濃度製剤へ変更
A
白内障治療点眼薬は、併用薬との調整のため、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=switch_to_sustained_formulation_reduced_frequency｜title=白内障治療点眼薬 持続型製剤へ変更（点眼回数減）｜scenarioColor=orange】
S
白内障治療点眼薬は、点眼回数を減らすために変更となった。
O
白内障治療点眼薬　持続型製剤へ変更
A
白内障治療点眼薬は、点眼回数を減らすため、持続型製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_irritation_none｜title=白内障治療点眼薬 副作用なし（刺激感）】
S
白内障治療点眼薬を使用して症状は落ち着いている。
刺激感は認めない。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による刺激感は現時点で認められず、治療継続が可能である。
P
白内障治療点眼薬の継続中に刺激感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_foreign_body_sensation_none｜title=白内障治療点眼薬 副作用なし（異物感）】
S
白内障治療点眼薬を使用して症状は落ち着いている。
異物感は認めない。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による異物感は現時点で認められず、治療継続が可能である。
P
白内障治療点眼薬の継続中に異物感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pruritus_none｜title=白内障治療点眼薬 副作用なし（掻痒感）】
S
白内障治療点眼薬を使用して症状は落ち着いている。
掻痒感は認めない。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による掻痒感は現時点で認められず、治療継続が可能である。
P
白内障治療点眼薬の継続中に掻痒感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_redness_none｜title=白内障治療点眼薬 副作用なし（充血）】
S
白内障治療点眼薬を使用して症状は落ち着いている。
充血は認めない。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による充血は現時点で認められず、治療継続が可能である。
P
白内障治療点眼薬の継続中に充血が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_discharge_none｜title=白内障治療点眼薬 副作用なし（目やに）】
S
白内障治療点眼薬を使用して症状は落ち着いている。
目やには認めない。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による目やには現時点で認められず、治療継続が可能である。
P
白内障治療点眼薬の継続中に目やにが出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_blurred_vision_none｜title=白内障治療点眼薬 副作用なし（霧視）】
S
白内障治療点眼薬を使用して症状は落ち着いている。
目のかすみは認めない。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による霧視は現時点で認められず、治療継続が可能である。
P
白内障治療点眼薬の継続中に目のかすみが出ることがあります。
P_ADDON_INLINE
- addon_eye_drop_blurred_vision_driving_caution
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_blurred_vision_driving_caution｜title=霧視時の運転・機械操作】
# DESIGN_PENDING_PLACEMENT: P_ADDON_INLINE
P_APPEND
目がかすんでいる間は、自動車の運転や機械の操作に注意してください。




【SCENARIO｜type=adherence｜id=cp_good｜title=白内障治療点眼薬 CP良好】
S
薬を使用して症状は落ち着いている。
使用忘れなく継続できている。
O
白内障治療点眼薬　使用中
A
コンプライアンスは良好で、治療継続に問題はない。
P
引き続き用法を守って使用することで、治療効果の維持が期待されます。
今後も継続して使用できるようにすることが大切です。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=白内障治療点眼薬 CP不良（使用忘れ）】
S
使用を忘れることがある。
症状は大きく変わっていない。
O
白内障治療点眼薬　使用中
A
コンプライアンスは不良で、使用忘れがみられる。
P
継続して使用することで、十分な治療効果が期待されます。
使用忘れが続くと、期待される治療効果が十分に得られない可能性があります。
P_ADDON
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
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




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=白内障治療点眼薬 CP不良（自己判断）】
S
自己判断で使用を調整することがある。
症状は大きく変わっていない。
O
白内障治療点眼薬　使用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して使用することで、十分な治療効果が期待されます。
自己判断で中止・調整すると、期待される治療効果が十分に得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=白内障治療点眼薬 CP不良（受診遅延）】
S
受診が遅れ、使用を調整することがある。
症状は大きく変わっていない。
O
白内障治療点眼薬　使用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な使用により、十分な治療効果が期待されます。
治療が中断すると、期待される治療効果が十分に得られない可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=白内障治療点眼薬 終了（効果不十分）】
S
白内障治療点眼薬は、効果不十分のため中止となった。
O
白内障治療点眼薬　処方終了
A
白内障治療点眼薬は、効果不十分のため終了となった。
終了後は、目の症状の変化について確認を要する。
P
白内障治療点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=白内障治療点眼薬 終了（無効）】
S
白内障治療点眼薬は、効果が認められなかったため中止となった。
O
白内障治療点眼薬　処方終了
A
白内障治療点眼薬は、効果が認められなかったため終了となった。
終了後は、目の症状の変化について確認を要する。
P
白内障治療点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
- addon_eye_drop_after_reconstitution_expiry_3weeks
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_mild_continue｜title=白内障治療点眼薬 SE継続（軽症 刺激感）】
S
白内障治療点眼薬の使用により刺激感があるが、日常生活は送れている。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による刺激感を軽度認めるが、治療継続が可能である。
P
白内障治療点眼薬による刺激感が軽い場合は、そのまま経過をみてください。
刺激感が続く場合や強くなる場合は、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_moderate_consider_dr｜title=白内障治療点眼薬 SE継続（中等度 刺激感）】
S
白内障治療点眼薬の使用により刺激感が強く、辛いことがあるが、日常生活は送れている。
O
白内障治療点眼薬　処方
A
白内障治療点眼薬による刺激感が強く、継続困難の可能性があるため対応を要する。
P
白内障治療点眼薬による刺激感が続く場合や強くなる場合は、使用回数の調整や薬剤の変更が必要になることがあります。
症状が続く場合は、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_irritation｜title=白内障治療点眼薬 SE変更（刺激感）】
S
白内障治療点眼薬の使用により刺激感が出現したため、他剤へ変更となった。
O
白内障治療点眼薬　処方変更
A
白内障治療点眼薬の使用による刺激感を認め、他剤変更後の経過確認を要する。
P
白内障治療点眼薬の変更後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_irritation｜title=白内障治療点眼薬 SE回数減（刺激感）】
S
白内障治療点眼薬の使用により刺激感が強いため、点眼回数が減った。
O
白内障治療点眼薬　点眼回数減
A
白内障治療点眼薬の使用による刺激感を認め、点眼回数変更後の経過確認を要する。
P
白内障治療点眼薬の点眼回数が減った後も刺激感が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_irritation｜title=白内障治療点眼薬 SE濃度減（刺激感）】
S
白内障治療点眼薬の使用により刺激感が強かったため、効果が穏やかなものになった。
O
白内障治療点眼薬　低濃度製剤へ変更
A
白内障治療点眼薬の使用による刺激感を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
白内障治療点眼薬を低濃度製剤へ変更後も、刺激感が続く場合や、気になる症状、使用感の変化がありましたらご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_irritation｜title=白内障治療点眼薬 SE中止（刺激感）】
S
白内障治療点眼薬の使用により刺激感が強いため、中止となった。
O
白内障治療点眼薬　処方中止
A
白内障治療点眼薬の使用による刺激感を認め、中止後の経過確認を要する。
P
白内障治療点眼薬の中止後、目の症状の悪化や変化があればご相談ください。
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
