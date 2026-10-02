# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# glaucoma_pg_analog_eye_drops
# =========================================
#
# ⚠️ STATUS: JSON_COMPLETE ⚠️
#
# 2026-09-26 に HEADER_ONLY として作成した Header へ、Human authored scenario draft
# （添付用.md）の SCENARIOS_START〜SCENARIOS_END を収載した（RULES §24 HEADER_ONLY → DRAFT）。
# 収載は逐語保持。添付用.md は投入時点で既に正式marker（P_ADDON_INLINE 等）・行区切りで
# 記述されていたため、構造上の追加正規化は発生していない。臨床文言・scenario/addon の id・
# 本文・P_ADDON・P_ADDON_INLINE・P_CLOSING・順序は一切変更していない。
# Owner 本文確認・凍結宣言により FROZEN_FOR_PN1 へ遷移した（2026-09-26。RULES §24）。
# 凍結時点で SCENARIOS 本文・Header 設計（drug / brandCatalog / aliases / handlingTags /
# scenarioRequiredTags / addonRequiredTags / composition / display 等）は変更していない
# （本遷移での変更対象は STATUS 行と本状態説明コメントのみ）。
#
# [H] Owner Decision（2026-09-26・凍結後の追加Header metadata）: se_*_none 系8scenario
# （se_eyelash_growth_none / se_periocular_pigmentation_none / se_irritation_none /
# se_foreign_body_sensation_none / se_pruritus_none / se_eye_redness_none /
# se_eye_discharge_none / se_blurred_vision_none）のSCENARIOヘッダーへ、inline metadata
# `｜rapidEvaluationSubject=眼圧` を追加した。`docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1
# OD-RAPID-READINESS-1 §1 の再開Trigger（clinical subject generalization。bridge authored
# 表現が「症状」以外の評価subjectを持つRapid-capable scenarioの初出）に該当したための
# pilot対応。2026-09-26 Owner Human Review PASS により正式採用（OD-RAPID-SUBJECT-PILOT-1）。
# `scenarioColor`と同型のinline専用metadataであり、S/O/A/P・P_ADDON・P_ADDON_INLINE・
# P_CLOSING・idなどPN1凍結対象の本文には一切触れていない。他34+1既存moduleへの
# retrofitは行わない。
#
# 目的: プロスタグランジン(PG)系緑内障治療点眼薬（キサラタン/ラタノプロスト、
# トラバタンズ/トラボプロスト、ルミガン/ビマトプロスト、タプロス/タフルプロスト、
# レスキュラ/イソプロピルウノプロストン、計5成分・brandCatalog10エントリ）の
# brandCatalog / handlingTags / scenarioRequiredTags / addonRequiredTags /
# composition / display 設計を、会話ログではなくリポジトリ上に固定する。
# Header 形状は既存点眼共通シャーシ（Family A: H1点眼 golden reference）に従う。
#
# 値の出所ラベル:
#   [H] Human / Owner 確定
#   [P] Claude proposal / Owner approved on 2026-09-26（提案由来・Owner 承認済み）
#   [D] 確定事項・固定規則からの決定論的導出
#
# [Historical] 記載当時の次の作業: PN1（prompts/vNext/HANDOFF.md「bridge作成から開始する」）。
# STATUS は FROZEN_FOR_PN1 へ遷移済み（2026-09-26）。PN1開始はOwnerの明示指示を待つ、としていた。
# [Current State・2026-09-27 Ophthalmic chassis cleanup Unit による実測] PN1〜PN8 は commit
# `de1065b`（"feat: register glaucoma_pg_analog_eye_drops module + Rapid dose transition
# applicability (Q-RAPID2)"）で完了済み。canonical JSON
# （`data/modules/glaucoma_pg_analog_eye_drops.json`）は `data/modules/index.ts` に登録され
# ALL_MODULES に含まれる。commit時点で tsc / test suite（3953 pass）/ build / audit /
# test:multi-drug の全検証PASS・Human Review完了が記録されている。
# STATUS 遷移（2026-09-27・Owner 承認）: `prompts/RULES.md` §24「JSON_COMPLETE は PN6
# （Assembly）で canonical JSON への Write が完了した時点...でユーザーの指示に基づき設定する」
# に従い、上記実測（PN6 Write 完了・PN7 FAIL なし・全検証PASS）を根拠に STATUS を
# `FROZEN_FOR_PN1` から `JSON_COMPLETE` へ遷移した。本遷移は STATUS 行と本コメントのみを
# 対象とし、SCENARIOS_START〜SCENARIOS_END 本文・Header 設計は変更していない
# （`docs/DEVELOPMENT_STANDARD.md` の「設計資産ライフサイクル」5状態〔Experimental等〕とは
# 別軸であり、本遷移はあくまで bridge 個別の工程到達状態を表す）。
#
# 参照:
#   - bridges/allergy_h1_antihistamine_eye_drops.md（点眼共通シャーシ・golden reference。
#     brandCatalog複数ペア・handlingTags/scenarioRequiredTags/addonRequiredTagsの
#     構造データ方式・「未宣言＝常時候補」semantics）
#   - bridges/dry_eye_trpv1_antagonist_eye_drops.md（Avarept。4階層categoryPath・
#     [H]/[P]/[D]ラベル運用・単一brand entry precedent）
#   - docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md §4.2（タプロス／タプロスミニの
#     variant gapに関する原則）
#   - prompts/vNext/PN2-Drug-Header.md / prompts/RULES.md §8 §10 §18 §21 §23 §24 §27
#   - docs/JSON_STANDARD.md（categoryPath最大4階層・JS-A）
#
# 薬事情報（貯法等）の出典:
#   [Historical] 会話履歴で確認した情報（KEGG医療用医薬品情報・PMDA・製造販売元サイト経由で
#   2026-09-26に確認。添付文書原本PDFの直接確認ではない）:
#     - キサラタン点眼液0.005%: 未開封2〜8℃・開封後は遮光袋で室温(1〜30℃)保存可（4週間以内）
#     - トラバタンズ点眼液0.004%: 1〜25℃（室温）・遮光の明記なし
#     - ルミガン点眼液0.03%: 室温保存・遮光の明記なし
#     - タプロス点眼液0.0015%（標準製剤）: 室温保存
#     - タプロスミニ点眼液0.0015%（PF・単回使用）: 2〜8℃保存（タプロス標準製剤とは貯法が異なる）
#     - レスキュラ点眼液0.12%: 室温保存・無色澄明（懸濁ではない）・外箱開封後は遮光
#
#   [Current State・2026-09-27 Ophthalmic chassis cleanup Unit・PMDA添付文書原本で一次資料確認
#   完了。RESOLVED（一次資料とcurrent canonical/handlingTagsは全6製品で一致。臨床データ変更なし）]:
#     - キサラタン点眼液0.005%（添付文書番号1319739Q1037_4_02・2024年7月改訂第3版）:
#       「貯法 2～8℃」「20.1 外箱開封後は遮光して保存すること」「20.2 開栓後4週間経過した場合は
#       残液を使用しないこと」。開封後の保存温度は明記されていない（遮光のみ規定）。
#       current handlingTags（light_protection, cold_storage_before_opening）と整合
#     - トラバタンズ点眼液0.004%（添付文書番号1319754Q1023_2_06・2021年7月改訂第1版）:
#       「貯法 1～25℃」。取扱い上の注意（20節）自体が存在せず、遮光の明記なし。
#       current handlingTags（pg_glaucoma のみ）と整合
#     - ルミガン点眼液0.03%（添付文書番号1319757Q1027_1_11・2023年2月改訂第1版）:
#       「貯法 室温保存」。取扱い上の注意（20節）自体が存在せず、遮光の明記なし。
#       current handlingTags（pg_glaucoma のみ）と整合
#     - タプロス点眼液0.0015%（標準製剤。添付文書番号1319756Q1022_1_18・2021年12月改訂第1版。
#       タプロスミニと同一添付文書を共有）: 「貯法 室温保存」。20節はミニ点眼液のみに関する規定で、
#       標準製剤への追加規定なし。current handlingTags（pg_glaucoma のみ）と整合
#     - タプロスミニ点眼液0.0015%（PF・単回使用。同上添付文書内）: 「貯法 2～8℃保存」。
#       20節: 「アルミピロー包装開封後は、添付の遮光用投薬袋に入れて2～8℃で保存し、1年以内に
#       使用すること。添付の遮光用投薬袋に入れて室温で保存した場合には、1ヵ月以内に使用すること」
#       （会話履歴の記述より詳細。室温保存も遮光投薬袋使用時のみ1ヵ月以内で許容される旨を追加確認）。
#       Product Variant Separation Principle（§4.2。タプロス標準／タプロスミニのvariant gap）により
#       brandCatalogへ独立entryを設けない現行設計は維持する（本Unitで再検討していない）
#     - レスキュラ点眼液0.12%（添付文書番号1319732Q1035_3_04・2023年4月改訂第2版）:
#       「貯法 室温保存」「20. 外箱開封後は、遮光して保存すること」「3.2 性状: 無色澄明の無菌水性
#       点眼剤」。current handlingTags（light_protection, frequency_titration_available）と整合
#
# =========================================

moduleId: "glaucoma_pg_analog_eye_drops"

# [H] Owner確定（4階層・「外用」は挟まない。Avarept ODN-1a/1c踏襲）
categoryPath:
  - "緑内障"
  - "緑内障治療点眼薬"
  - "プロスタグランジン(PG)系"
  - "点眼"

composition:
  # [H] Owner確定
  classKey: "pg_analog"
  # [D] {classKey}_{route}
  nodeKey: "pg_analog_ophthalmic"
  # [H] Owner確定（PN2フォールバック表に「緑内障」は存在しないため明示決定。Avarept "dry_eye" 同様）
  domain: "glaucoma"
  clinicalDomain: "glaucoma"
  sMergeDomain: "glaucoma"
  # [H] Owner確定（RULES §18: chronic = 慢性期維持管理薬。緑内障は長期継続治療が前提）
  priority: "chronic"
  # sMergePolicy は PN2 固定値（bridge では定義しない）。JS-B 4 key は新規 module では生成しない。

drug:
  # [P] bridge本文の文言をそのまま採用（薬効クラス名）
  genericName: "プロスタグランジン(PG)系緑内障治療点眼薬"
  brandNames:
    - "キサラタン点眼液"
    - "ラタノプロスト点眼液"
    - "トラバタンズ点眼液"
    - "トラボプロスト点眼液"
    - "ルミガン点眼液"
    - "ビマトプロスト点眼液"
    - "タプロス点眼液"
    - "タフルプロスト点眼液"
    - "レスキュラ点眼液"
    - "イソプロピルウノプロストン点眼液"
  drugClass:
    - "PROSTAGLANDIN_ANALOG_EYE_DROPS"
  route: "ophthalmic"
  dosageForms:
    - "eye_drop"
  drugSpecificTags:
    - "prostaglandin_analog"
    - "glaucoma"
    - "eye_drops"
    - "ophthalmic"
    - "external_use"
    - "storage_instruction"
    - "formulation_instruction"
    - "contact_lens_caution"
  search:
    primaryDisplayName: "プロスタグランジン(PG)系緑内障治療点眼薬"
    exactAliases:
      - "キサラタン点眼液"
      - "ラタノプロスト点眼液"
      - "トラバタンズ点眼液"
      - "トラボプロスト点眼液"
      - "ルミガン点眼液"
      - "ビマトプロスト点眼液"
      - "タプロス点眼液"
      - "タフルプロスト点眼液"
      - "レスキュラ点眼液"
      - "イソプロピルウノプロストン点眼液"
      # bare名（剤形suffixなし）も入力aliasとして許容する（点眼シャーシ実績）
      - "キサラタン"
      - "ラタノプロスト"
      - "トラバタンズ"
      - "トラボプロスト"
      - "ルミガン"
      - "ビマトプロスト"
      - "タプロス"
      - "タフルプロスト"
      - "レスキュラ"
      - "イソプロピルウノプロストン"
      - "プロスタグランジン(PG)系緑内障治療点眼薬"
    nameAliases:
      - "きさらたんてんがん"
      - "きさらたん"
      - "らたのぷろすとてんがん"
      - "らたのぷろすと"
      - "とらばたんずてんがん"
      - "とらばたんず"
      - "とらぼぷろすとてんがん"
      - "とらぼぷろすと"
      - "るみがんてんがん"
      - "るみがん"
      - "びまとぷろすとてんがん"
      - "びまとぷろすと"
      - "たぷろすてんがん"
      - "たぷろす"
      - "たふるぷろすとてんがん"
      - "たふるぷろすと"
      - "れすきゅらてんがん"
      - "れすきゅら"
      - "いそぷろぴるうのぷろすとんてんがん"
      - "いそぷろぴるうのぷろすとん"
    # [P] SCENARIOS 本文・categoryPath に現れる語のみ
    keywords:
      - "緑内障"
      - "眼圧"
      - "点眼"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      # JS-A: 全 module true
      suppressCrossModuleSuggestionsOnExactHit: true
      # brand/genericペア（10エントリ・5ペア）を持つため設定する（H1点眼と同型・同一意味論）
      preferOwnNameMatchOverGenericMatch: true
      suppressRedundantGenericHeaderOnDirectMatch: true
  # drug.nameAliases は drug.search.nameAliases と要素・順序まで完全一致（RULES §8）。[D]
  nameAliases:
    - "きさらたんてんがん"
    - "きさらたん"
    - "らたのぷろすとてんがん"
    - "らたのぷろすと"
    - "とらばたんずてんがん"
    - "とらばたんず"
    - "とらぼぷろすとてんがん"
    - "とらぼぷろすと"
    - "るみがんてんがん"
    - "るみがん"
    - "びまとぷろすとてんがん"
    - "びまとぷろすと"
    - "たぷろすてんがん"
    - "たぷろす"
    - "たふるぷろすとてんがん"
    - "たふるぷろすと"
    - "れすきゅらてんがん"
    - "れすきゅら"
    - "いそぷろぴるうのぷろすとんてんがん"
    - "いそぷろぴるうのぷろすとん"
  # ─────────────────────────────────────────
  # brandCatalog: 対象5成分（10エントリ）すべてを個別エントリとして定義する。
  # ブランド名エントリと一般名エントリは1:1で対をなす。
  # 【例外】キサラタン点眼液 / ラタノプロスト点眼液ペアのみ handlingTags を意図的に
  # 非対称化している（[H] Owner Decision・2026-09-26・本bridge固有）。
  #   - キサラタン点眼液（先発）: 添付文書上「未開封2〜8℃・開封後は遮光袋で室温保存可」が
  #     確定事実のため light_protection / cold_storage_before_opening を付与する。
  #   - ラタノプロスト点眼液（一般名・メーカー非特定）: メーカーにより貯法が室温/冷所で
  #     分かれ、本moduleはメーカー別GE分割を行わない方針のため、単一の代表値を機械的に
  #     決め打ちできない。docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md §4.2 の
  #     原則「不明なvariant-specific propertyを代表値・安全側の値・先発値で補完しない」に
  #     従い、cold/light系プロパティタグ（light_protection等）を付与しない。
  #   - brand/genericペアのhandlingTags同値は allergy_h1_antihistamine_eye_drops.md
  #     固有のローカル設計判断であり、Repository横断契約ではないことを確認済み
  #     （RULES.md / JSON_STANDARD.md / DESIGN_PRINCIPLES.md のいずれにも当該contractなし）。
  #
  # [Historical・2026-09-26] タプロス点眼液 / タフルプロスト点眼液ペアについても、タプロスミニ
  # variant（PF・単回使用・2〜8℃保存）由来の cold_storage_before_opening /
  # single_use_container / preservative_free は同じ§4.2の原則により自動付与せず、対応ADDONは
  # requiredTags未宣言のまま全brand ungated manual candidateとしていた（product variant
  # runtime selection gap）。
  #
  # [Current State・2026-09-30 H1 generic-noun O + ophthalmic family-level variant candidate
  # Unit・Owner Decision] docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md §4.2 を3段階
  # （Level 1: SKU property confirmed / Level 2: variant exists in family / Level 3:
  # familyまで絞れない）へ整理し、上記の「全brand ungated manual candidate」だった
  # Mini（single_use_container）/ PF（preservative_free）/ 遮光（light_protection）の
  # ADDON候補を、Level 2の family-level variant tag（`preservative_free_variant_in_family` /
  # `single_use_variant_in_family` / `light_protection_variant_in_family`）でproduct family
  # 単位まで絞った。family-level tagはSKU propertyそのものを主張しない
  # （例: ラタノプロスト点眼液へ`light_protection_variant_in_family`を付与することは、
  # 「ラタノプロスト点眼液というgeneric entry自体が遮光対象である」ことを意味しない。
  # 「市場に遮光対象製品が存在するため薬剤師が交付製品を確認して選択できる」ことのみを表す）。
  # family-level tagはAddon gate専用でありscenarioRequiredTagsには使用しない。
  # 詳細は docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md §4.2〜§4.4 を参照。
  # タプロスミニ固有の保存条件（2〜8℃・遮光投薬袋）は今回のUnitでは実装せず、
  # 同文書のFuture considerationとして記録した（タプロス／タフルプロストのstorage表示は
  # 通常タプロス側の扱いのまま。Mini家族へlight/cold系family tagは追加していない）。
  # ─────────────────────────────────────────
  brandCatalog:
    キサラタン点眼液:
      displayName: "キサラタン点眼液"
      genericName: "ラタノプロスト"
      displayGenericName: "ラタノプロスト点眼液"
      handlingTags:
        - "light_protection"
        - "cold_storage_before_opening"
        # [H] Owner Decision（2026-09-30）: キサラタン自身が遮光対象（property tag
        # light_protection を保持）のため、family = 自身を含むという意味で
        # light_protection_variant_in_family も併記する（family内にpropertyを持つ
        # SKUが存在する、という定義上、property保持brand自身がそれを満たすため自明に真）。
        - "light_protection_variant_in_family"
        - "pg_glaucoma"
      aliases:
        - "きさらたんてんがん"
        - "きさらたん"
      normalizedAliases:
        - "きさらたんてんがん"
        - "きさらたん"
    ラタノプロスト点眼液:
      displayName: "ラタノプロスト点眼液"
      genericName: "ラタノプロスト"
      displayGenericName: "ラタノプロスト点眼液"
      handlingTags:
        # [H] Owner Decision（2026-09-30・Level 2 family-level variant candidate）:
        # manufacturer-unspecified genericのため、遮光対象製品・PF製品いずれもメーカーにより
        # 市場に存在するが、本moduleはメーカー別GE分割を行わない方針のため単一の代表値を
        # 機械的に決め打ちできない（§4.2 Level 1は不成立）。family内に該当variantが存在する
        # ことは事実であり、Addon本文（遮光保管・PF容器の取り扱い説明）はそのvariantへ
        # そのまま適用可能なため、Level 2のfamily-level tagで候補化する。
        # SKU propertyそのもの（light_protection / preservative_free）は付与しない。
        - "light_protection_variant_in_family"
        - "preservative_free_variant_in_family"
        - "pg_glaucoma"
      aliases:
        - "らたのぷろすとてんがん"
        - "らたのぷろすと"
      normalizedAliases:
        - "らたのぷろすとてんがん"
        - "らたのぷろすと"
    トラバタンズ点眼液:
      displayName: "トラバタンズ点眼液"
      genericName: "トラボプロスト"
      displayGenericName: "トラボプロスト点眼液"
      handlingTags:
        - "pg_glaucoma"
      aliases:
        - "とらばたんずてんがん"
        - "とらばたんず"
      normalizedAliases:
        - "とらばたんずてんがん"
        - "とらばたんず"
    トラボプロスト点眼液:
      displayName: "トラボプロスト点眼液"
      genericName: "トラボプロスト"
      displayGenericName: "トラボプロスト点眼液"
      handlingTags:
        - "pg_glaucoma"
      aliases:
        - "とらぼぷろすとてんがん"
        - "とらぼぷろすと"
      normalizedAliases:
        - "とらぼぷろすとてんがん"
        - "とらぼぷろすと"
    ルミガン点眼液:
      displayName: "ルミガン点眼液"
      genericName: "ビマトプロスト"
      displayGenericName: "ビマトプロスト点眼液"
      handlingTags:
        - "pg_glaucoma"
      aliases:
        - "るみがんてんがん"
        - "るみがん"
      normalizedAliases:
        - "るみがんてんがん"
        - "るみがん"
    ビマトプロスト点眼液:
      displayName: "ビマトプロスト点眼液"
      genericName: "ビマトプロスト"
      displayGenericName: "ビマトプロスト点眼液"
      handlingTags:
        - "pg_glaucoma"
      aliases:
        - "びまとぷろすとてんがん"
        - "びまとぷろすと"
      normalizedAliases:
        - "びまとぷろすとてんがん"
        - "びまとぷろすと"
    タプロス点眼液:
      displayName: "タプロス点眼液"
      genericName: "タフルプロスト"
      displayGenericName: "タフルプロスト点眼液"
      handlingTags:
        # [H] Owner Decision（2026-09-30・Level 2 family-level variant candidate）:
        # タプロスミニ（1回使い切り容器）というvariantがfamily内に存在するため、
        # single_use_variant_in_family でMini Addonを候補化する。SKU propertyそのもの
        # （single_use_container）は付与しない（本製剤＝タプロス標準はsingle-useではない）。
        # タプロスミニ固有の保存条件（2〜8℃・遮光投薬袋）は今回対象外
        # （docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md Future consideration参照。
        # light/cold系family tagは付与しない）。
        #
        # [Current State・2026-10-02 PG Mini/PF rationale alignment Unit] preservative_free_variant_in_family は
        # 付与しない。これは current mapping の根拠の明文化であり、mapping 自体は変更していない。
        #   - Level 2 条件1: PASS。タプロスミニは marketed variant として実在し、保存剤を含有しない
        #     （BAK不含・1回使い捨てのディスポーザブル容器。PMDA 添付文書 1319756Q1022_1_18、
        #     医薬品インタビューフォーム 第16版〔2022年1月〕。2026-10-02 確認）。
        #   - Level 2 条件2: FAIL。addon_eye_drop_preservative_free_pf の本文「特殊な構造の容器が使用されて
        #     います」を、IF（10.(1)「外観が特殊な容器・包装に関する情報: 該当しない」／概要 I-3「製品の
        #     製剤学的特性: 特になし」）・添付文書・製造販売元公式FAQのいずれも裏付けない。本文を全文そのまま
        #     適用可能とは判断できない（PRODUCT_VARIANT_SEPARATION_PRINCIPLE §4.5 Level 3 に相当）。
        #   - よって PF ADDON をタプロス family へ流さない。Mini固有の取り扱い（最初の1〜2滴の廃棄・
        #     遮光用投薬袋での保存）は現行 ADDON では担保されておらず、別 Unit の検討事項（本 Unit では扱わない）。
        - "single_use_variant_in_family"
        - "pg_glaucoma"
      aliases:
        - "たぷろすてんがん"
        - "たぷろす"
      normalizedAliases:
        - "たぷろすてんがん"
        - "たぷろす"
    タフルプロスト点眼液:
      displayName: "タフルプロスト点眼液"
      genericName: "タフルプロスト"
      displayGenericName: "タフルプロスト点眼液"
      handlingTags:
        # [H] Owner Decision（2026-09-30）: タプロス点眼液と同一理由（上記コメント参照）。
        - "single_use_variant_in_family"
        - "pg_glaucoma"
      aliases:
        - "たふるぷろすとてんがん"
        - "たふるぷろすと"
      normalizedAliases:
        - "たふるぷろすとてんがん"
        - "たふるぷろすと"
    レスキュラ点眼液:
      displayName: "レスキュラ点眼液"
      genericName: "イソプロピルウノプロストン"
      displayGenericName: "イソプロピルウノプロストン点眼液"
      handlingTags:
        - "light_protection"
        # [H] Owner Decision（2026-09-30）: レスキュラ自身が遮光対象（property tag
        # light_protection を保持）のため、family = 自身を含むという意味で
        # light_protection_variant_in_family も併記する（キサラタンと同一理由）。
        - "light_protection_variant_in_family"
        # [H] Owner Decision（2026-09-26）: レスキュラの1日2回用法から自動導出した値ではない。
        # 「回数系(frequency_*)scenarioをレスキュラのみ到達可能とする」というOwnerの
        # 明示決定を表すcapability tagである。
        - "frequency_titration_available"
        - "pg_glaucoma"
      aliases:
        - "れすきゅらてんがん"
        - "れすきゅら"
      normalizedAliases:
        - "れすきゅらてんがん"
        - "れすきゅら"
    イソプロピルウノプロストン点眼液:
      displayName: "イソプロピルウノプロストン点眼液"
      genericName: "イソプロピルウノプロストン"
      displayGenericName: "イソプロピルウノプロストン点眼液"
      handlingTags:
        - "light_protection"
        # [H] Owner Decision（2026-09-30）: レスキュラ点眼液と同一理由（上記コメント参照）。
        - "light_protection_variant_in_family"
        - "frequency_titration_available"
        - "pg_glaucoma"
      aliases:
        - "いそぷろぴるうのぷろすとんてんがん"
        - "いそぷろぴるうのぷろすとん"
      normalizedAliases:
        - "いそぷろぴるうのぷろすとんてんがん"
        - "いそぷろぴるうのぷろすとん"
  aliasToBrand:
    "きさらたんてんがん": "キサラタン点眼液"
    "きさらたん": "キサラタン点眼液"
    "らたのぷろすとてんがん": "ラタノプロスト点眼液"
    "らたのぷろすと": "ラタノプロスト点眼液"
    "とらばたんずてんがん": "トラバタンズ点眼液"
    "とらばたんず": "トラバタンズ点眼液"
    "とらぼぷろすとてんがん": "トラボプロスト点眼液"
    "とらぼぷろすと": "トラボプロスト点眼液"
    "るみがんてんがん": "ルミガン点眼液"
    "るみがん": "ルミガン点眼液"
    "びまとぷろすとてんがん": "ビマトプロスト点眼液"
    "びまとぷろすと": "ビマトプロスト点眼液"
    "たぷろすてんがん": "タプロス点眼液"
    "たぷろす": "タプロス点眼液"
    "たふるぷろすとてんがん": "タフルプロスト点眼液"
    "たふるぷろすと": "タフルプロスト点眼液"
    "れすきゅらてんがん": "レスキュラ点眼液"
    "れすきゅら": "レスキュラ点眼液"
    "いそぷろぴるうのぷろすとんてんがん": "イソプロピルウノプロストン点眼液"
    "いそぷろぴるうのぷろすとん": "イソプロピルウノプロストン点眼液"

template:
  templateId: "glaucoma_pg_analog_eye_drops_v1"
  templateVersion: "1.0.0"
  # 以下 situationTags/severityTags は ModuleTemplate 型に存在する任意フィールド。
  # storageTags/formulationTags/handlingTags は lib/types.ts の ModuleTemplate 型には
  # 存在しない（H1点眼bridgeが採用した bridge-only の人間可読ボキャブラリー注記の慣行を
  # 踏襲。canonical JSON生成時にそのまま転記されるフィールドではない）。
  situationTags:
    - "general"
  severityTags:
    - "mild"
    - "moderate"
  # handlingTags（ボキャブラリー注記・bridge-only）:
  # scenarioRequiredTags / addonRequiredTags の判定に使用するタグの語彙一覧（14種）。
  # 現行10エントリのうち実際に付与済みなのは light_protection / cold_storage_before_opening /
  # light_protection_variant_in_family / preservative_free_variant_in_family /
  # single_use_variant_in_family / frequency_titration_available / pg_glaucoma の7種。
  # 残り7種（cold_storage / suspension / single_use_container / preservative_free /
  # avoid_cold_storage / concentration_variant / reduced_frequency_option）は
  # 対応するSCENARIO/ADDONを非表示に保つために定義するが、現行10エントリには付与しない。
  #
  # [Historical・2026-09-26] single_use_container / preservative_free についての運用メモ:
  #   タプロスミニ（PF・単回使用・2〜8℃保存）というvariantは実在するが、
  #   docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md §4.2 の原則により、
  #   current runtimeが実際に交付されたvariant（タプロス標準 or タプロスミニ）を
  #   判別できないため、本タグを「タプロス点眼液」entryへ自動付与しない。
  #   対応する addon_eye_drop_single_dose_mini / addon_eye_drop_preservative_free_pf は
  #   requiredTags を宣言せず、常時候補（manual candidate）として保持していた。
  #
  # [Current State・2026-09-30 H1 generic-noun O + ophthalmic family-level variant candidate
  # Unit・Owner Decision] 上記2 ADDONの全brand ungated manual candidateという扱いを、
  # family-level variant tag（下記）によるproduct family単位のcandidate絞り込みへ移行した。
  # single_use_container / preservative_free / light_protection の3タグは引き続き
  # 「SKUそのもののpropertyが確定している場合のみ付与する」property tagとして温存し、
  # 語彙一覧・reservedHandlingTagsからも変更していない（既存挙動を壊さない）。
  #
  # family-level variant tag 3種（2026-09-30 新規導入。Addon gate専用。
  # docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md §4.3 Level 2）:
  #   - light_protection_variant_in_family
  #   - preservative_free_variant_in_family
  #   - single_use_variant_in_family
  # 意味: 「そのbrandCatalog entryが表すproduct family内に、該当propertyを持つ
  # marketed SKU / variantが存在する」ことを表す。SKU propertyそのもの（light_protection /
  # preservative_free / single_use_container）を含意しない。**scenarioRequiredTagsには
  # 使用しない**（Addon candidate reachability専用）。
  #
  # frequency_titration_available についての運用メモ（2026-09-26）:
  #   「レスキュラの用法(1日2回)から自動導出した値」ではない。「回数系(frequency_*)
  #   scenarioをレスキュラのみ到達可能とする」というOwnerの明示決定(2026-09)を表す
  #   capability tagである。
  #
  # reduced_frequency_option についての運用メモ:
  #   H1点眼の「持続型製剤への切替で点眼回数を減らす」概念の転用。現行5成分に
  #   該当製剤はなく、frequency_titration_available（レスキュラの回数調整）とは
  #   別概念として扱う。
  handlingTags:
    - "light_protection"
    - "cold_storage_before_opening"
    - "cold_storage"
    - "suspension"
    - "single_use_container"
    - "preservative_free"
    - "avoid_cold_storage"
    - "concentration_variant"
    - "frequency_titration_available"
    - "reduced_frequency_option"
    - "light_protection_variant_in_family"
    - "preservative_free_variant_in_family"
    - "single_use_variant_in_family"
    - "pg_glaucoma"
  # reservedHandlingTags（実型フィールド・RULES §27）:
  # 現行brandCatalogのどのエントリも保持しないが、requiredTags付きscenario/addonを
  # 意図的に到達不能のまま保持するためのタグのみを宣言する。
  # single_use_container / preservative_free（property tag）は、ここには含めない。
  # 現行の scenario / addon のどの requiredTags もこの 2 tag を参照していない
  # （addon_eye_drop_single_dose_mini は single_use_variant_in_family、
  # addon_eye_drop_preservative_free_pf は preservative_free_variant_in_family で gate している。
  # 上記 [Current State・2026-09-30] 参照）。reservedHandlingTags は、requiredTags が参照するが
  # 現行 brand が保持しない tag を宣言するものであり、本 2 tag は該当しない。
  reservedHandlingTags:
    - "cold_storage"
    - "suspension"
    - "avoid_cold_storage"
    - "concentration_variant"
    - "reduced_frequency_option"

display:
  title: "プロスタグランジン(PG)系緑内障治療点眼薬"
  # [P] bridge A欄の文言（房水流出促進による眼圧下降・緑内障進行抑制）に基づく
  subtitle: "眼圧を下げ、緑内障の進行を抑制する点眼治療"
  drugClassLabel: "プロスタグランジン(PG)系緑内障治療点眼薬"
  drugGeneric: "プロスタグランジン(PG)系緑内障治療点眼薬"
  nodeLabelShort: "PG点眼"
  nodeLabelLong: "プロスタグランジン(PG)系緑内障治療点眼薬"
  nodeKey: "pg_analog_ophthalmic"
  # [P] bridge O欄の文言（点眼回数増／点眼回数減）に基づく。
  # menuGroupLabelsはbridge側で明示しない（module-local決定・推測生成しない）。
  # 濃度軸（strength_*）とのUI表示整理はPN2工程が lib/menuGroups.ts のSSOTを参照して
  # 判断する後工程の責務であり、本bridgeの未決定事項ではない。
  adjustmentExpression:
    increasePast: "点眼回数が増えた"
    decreasePast: "点眼回数が減った"
  # localInput: SCENARIOS本文の initial/restart/external_start が S に
  # {{applicationSite}} を含むため、点眼シャーシ共通構造で点眼部位入力UIを有効化する
  # （値はH1点眼／Avarept稼働実績値を転用）。
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
# scenarioRequiredTags / addonRequiredTags:
# 本モジュールでは、これらのタグを本Headerに正式な構造データ（id → tags のマップ）として
# 定義し、canonical JSON生成時に各scenario/addonのフィールドへ機械的に反映する正本とする
# （H1点眼と同型）。ただし addon_glaucoma_pg_wash_periocular_after_instillation /
# addon_glaucoma_pg_wipe_periocular_after_instillation の2件は添付用.md内で既に
# ADDONヘッダーへ inline記載（｜requiredTags=[pg_glaucoma]｜）されており、本マップの
# 記載はその値をそのまま反映したものである（inline方式とHeader map方式の併存。
# RULES.md Unit A.1参照）。
#
# 記載のないscenario/addonは常時表示候補（タグ条件なし）とする。
# 削除してよいのは、その指導内容自体が本moduleの責務でなくなった場合に限る。
# 「現行製品では非表示だから」を理由にSCENARIO/ADDON本体を削除しない。
# ─────────────────────────────────────────
scenarioRequiredTags:
  lifestyle_guidance_suspension_shake: ["suspension"]
  lifestyle_guidance_storage_upright_suspension: ["suspension"]
  lifestyle_guidance_storage_light_protection: ["light_protection"]
  lifestyle_guidance_storage_cold: ["cold_storage"]
  lifestyle_guidance_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 濃度系5件+SE由来2件: 現行5成分いずれも該当製剤なし（reserved）
  strength_increase_low_perceived_effect: ["concentration_variant"]
  strength_increase_due_to_other_med_adjustment: ["concentration_variant"]
  strength_decrease_improved: ["concentration_variant"]
  strength_decrease_low_perceived_effect: ["concentration_variant"]
  strength_decrease_due_to_other_med_adjustment: ["concentration_variant"]
  se_strength_decreased_due_to_irritation: ["concentration_variant"]
  se_strength_decreased_due_to_periocular_pigmentation: ["concentration_variant"]
  # 回数系5件+SE由来2件: レスキュラのみ到達可能（[H] Owner Decision capability tag）
  frequency_increase_low_perceived_effect: ["frequency_titration_available"]
  frequency_increase_due_to_other_med_adjustment: ["frequency_titration_available"]
  frequency_decrease_improved: ["frequency_titration_available"]
  frequency_decrease_low_perceived_effect: ["frequency_titration_available"]
  frequency_decrease_due_to_other_med_adjustment: ["frequency_titration_available"]
  se_frequency_reduced_due_to_irritation: ["frequency_titration_available"]
  se_frequency_reduced_due_to_periocular_pigmentation: ["frequency_titration_available"]
  # 持続型製剤切替: 該当製剤なし（reserved）。frequency_titration_availableとは別概念
  switch_to_sustained_formulation_reduced_frequency: ["reduced_frequency_option"]
addonRequiredTags:
  addon_eye_drop_suspension_shake: ["suspension"]
  addon_eye_drop_storage_upright_suspension: ["suspension"]
  # [Current State・2026-09-30] family-level variant tagへ変更（Addon gate専用。
  # scenarioRequiredTags側の lifestyle_guidance_storage_light_protection: ["light_protection"]
  # は変更していない＝SCENARIO gateは引き続きproperty tag保持brandのみに限定される）。
  addon_eye_drop_storage_light_protection: ["light_protection_variant_in_family"]
  addon_eye_drop_storage_cold: ["cold_storage"]
  addon_eye_drop_warm_container_after_cold_storage: ["cold_storage"]
  addon_eye_drop_storage_cold_before_opening: ["cold_storage_before_opening"]
  addon_eye_drop_avoid_cold_storage: ["avoid_cold_storage"]
  # [Current State・2026-09-30] §4.2 gap（タプロスミニ・product variant runtime selection
  # gap）による全brand ungated manual candidateから、family-level variant tagによる
  # product family単位のcandidate絞り込みへ移行した（下記 [Historical] 参照）。
  addon_eye_drop_single_dose_mini: ["single_use_variant_in_family"]
  addon_eye_drop_preservative_free_pf: ["preservative_free_variant_in_family"]
  addon_glaucoma_pg_wash_periocular_after_instillation: ["pg_glaucoma"]
  addon_glaucoma_pg_wipe_periocular_after_instillation: ["pg_glaucoma"]
# 上記 addonRequiredTags に記載のないADDONは常時候補（全製品で表示・薬剤師が選択）。
# [Historical・2026-09-26] 次の2件は§4.2 gap（タプロスミニ・product variant runtime
# selection gap）により、記載当時は意図的にrequiredTagsを宣言していなかった
# （誤ったvariant propertyの自動帰属を避け、current runtimeで判別できない差分を
# Human judgmentへ委ねるため。「該当製品が存在しないreserved」とは意味が異なる）。
# [Current State・2026-09-30] 上記 addonRequiredTags マップに family-level variant tag
# （single_use_variant_in_family / preservative_free_variant_in_family）を宣言し、
# product family単位のcandidate絞り込みへ移行済み（H1 generic-noun O + ophthalmic
# family-level variant candidate Unit・Owner Decision）。
#
# 次の8件は tag と無関係に全製品で薬剤師が任意選択する、本来的に常時候補のもの
# （H1点眼の同名ADDONと同型・同一理由）。
#
# - addon_eye_drop_tip_contamination
# - addon_eye_drop_after_opening_expiry
# - addon_eye_drop_interval_5min
# - addon_eye_drop_interval_after_suspension_5min
#   本module自身が懸濁製剤である場合に限った指導ではない。併用する「他の」点眼薬が
#   懸濁性である場合の使用順・点眼間隔を扱う内容であり、条件は自剤ではなく併用薬の
#   性質にある（H1点眼と同一理由。自剤のhandlingTagsを根拠とするsuspension gateを
#   設定しない）。
# - addon_eye_drop_interval_10min
# - addon_eye_drop_interval_after_suspension_10min（同上）
# - addon_eye_drop_contact_lens_remove_before_use
#   実際に交付される製品・レンズ種別・添付文書によって可否が異なり、薬局の採用品・
#   在庫にも依存するため、runtimeの自動判定として設計せず薬剤師のHuman judgmentに
#   委ねる（H1点眼と同一理由）。
# - addon_eye_drop_blurred_vision_driving_caution
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

=======SCENARIOS_START=======


【SCENARIO｜type=treatment_start｜id=initial｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 初回】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、{{applicationSite}}眼の眼圧を下げるため追加となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧下降を目的として追加となった。
房水の流出を促進して眼圧を下げることで、緑内障の進行抑制を目的として使用する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧を下げる薬です。
緑内障の進行を抑えるため、継続して使用することが大切です。
使用により、まつ毛が伸びたり、目の周りの皮膚が黒っぽくなることがあります。
点眼後に目の周りへ薬液がついた場合は、清潔なティッシュなどでふき取ってください。
P_ADDON_INLINE
- addon_glaucoma_pg_wash_periocular_after_instillation
気になる変化がある場合はご相談ください。
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




【ADDON｜type=administration_guidance｜id=addon_glaucoma_pg_wash_periocular_after_instillation｜title=入浴・洗顔前の点眼｜requiredTags=[pg_glaucoma]｜uiGroup=薬剤固有介入｜uiVariant=rightAccentAmber】
# DESIGN_PENDING_PLACEMENT: P_ADDON_INLINE
P_APPEND
入浴前や洗顔前に点眼することで、目の周りについた薬液を洗い流しやすくなります。



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




【SCENARIO｜type=treatment_start｜id=restart｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 再開】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、{{applicationSite}}眼の眼圧を下げるため再開となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧下降を目的として再開となった。
房水の流出を促進して眼圧を下げることで、緑内障の進行抑制を目的として使用する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧を下げる薬です。
緑内障の進行を抑えるため、継続して使用することが大切です。
使用により、まつ毛が伸びたり、目の周りの皮膚が黒っぽくなることがあります。
点眼後に目の周りへ薬液がついた場合は、清潔なティッシュなどでふき取ってください。
P_ADDON_INLINE
- addon_glaucoma_pg_wash_periocular_after_instillation
気になる変化がある場合はご相談ください。
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




【SCENARIO｜type=treatment_start｜id=external_start｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 他所開始】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、{{applicationSite}}眼の眼圧を下げるため他院で開始され継続使用中であった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧下降を目的として継続使用中であった。
房水の流出を促進して眼圧を下げることで、緑内障の進行抑制を目的として使用する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧を下げる薬です。
緑内障の進行を抑えるため、継続して使用することが大切です。
使用により、まつ毛が伸びたり、目の周りの皮膚が黒っぽくなることがあります。
点眼後に目の周りへ薬液がついた場合は、清潔なティッシュなどでふき取ってください。
P_ADDON_INLINE
- addon_glaucoma_pg_wash_periocular_after_instillation
気になる変化がある場合はご相談ください。
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




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_low_perceived_effect｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 回数増（眼圧下降不十分）｜scenarioColor=blue】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧下降が不十分なため点眼回数が増えた。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　点眼回数増
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧下降が不十分なため点眼回数が増えた。
点眼回数の変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。



【SCENARIO｜type=treatment_adjustment｜id=strength_increase_low_perceived_effect｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 濃度増（眼圧下降不十分）｜scenarioColor=green】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧下降が不十分なため、より効果が高いものへ変更となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　高濃度製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧下降が不十分なため、高濃度製剤へ変更となった。
製剤変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。



【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_due_to_other_med_adjustment｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 回数増（他剤との調整）｜scenarioColor=blue】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、他剤との調整により点眼回数が増えた。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　点眼回数増
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、併用薬との調整のため点眼回数が増えた。
点眼回数の変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。



【SCENARIO｜type=treatment_adjustment｜id=strength_increase_due_to_other_med_adjustment｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 濃度増（他剤との調整）｜scenarioColor=green】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、他剤との調整により、より効果が高いものへ変更となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　高濃度製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、併用薬との調整のため、高濃度製剤へ変更となった。
製剤変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。



【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_improved｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 回数減（眼圧改善）｜scenarioColor=blue】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧が十分に下がったため点眼回数が減った。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　点眼回数減
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、十分な眼圧下降を踏まえ点眼回数が減った。
点眼回数の変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_improved｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 濃度減（眼圧改善）｜scenarioColor=green】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧が十分に下がったため、より効果が穏やかなものへ変更となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　低濃度製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、十分な眼圧下降を踏まえ、低濃度製剤へ変更となった。
製剤変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。



【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_low_perceived_effect｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 回数減（効果実感乏しい）｜scenarioColor=blue】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果の実感が乏しく使用継続に不安があるため、点眼回数を減らして継続することとなった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　点眼回数減
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果実感の乏しさと使用継続への不安を踏まえ、点眼回数を減らして治療継続となった。
点眼回数の変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、変更された回数で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_low_perceived_effect｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 濃度減（効果実感乏しい）｜scenarioColor=green】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果の実感が乏しく使用継続に不安があるため、より効果が穏やかなものへ変更して継続することとなった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　低濃度製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果実感の乏しさと使用継続への不安を踏まえ、低濃度製剤へ変更して治療継続となった。
製剤変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、変更された製剤で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。



【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_due_to_other_med_adjustment｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 回数減（他剤との調整）｜scenarioColor=blue】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、他剤との調整により点眼回数が減った。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　点眼回数減
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、併用薬との調整のため点眼回数が減った。
点眼回数の変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_due_to_other_med_adjustment｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 濃度減（他剤との調整）｜scenarioColor=green】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、他剤との調整により、より効果が穏やかなものへ変更となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　低濃度製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、併用薬との調整のため、低濃度製剤へ変更となった。
製剤変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=switch_to_sustained_formulation_reduced_frequency｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 持続型製剤へ変更（点眼回数減）｜scenarioColor=orange】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、点眼回数を減らすために変更となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　持続型製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、点眼回数を減らすため、持続型製剤へ変更となった。
製剤変更後は、眼圧の推移や使用状況について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eyelash_growth_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（眼瞼部多毛）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
まつ毛が伸びるなどの変化は認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による眼瞼部多毛は現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に、まつ毛が伸びることがあります。
P_ADDON_INLINE
- addon_glaucoma_pg_wipe_periocular_after_instillation
- addon_glaucoma_pg_wash_periocular_after_instillation
気になる変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=administration_guidance｜id=addon_glaucoma_pg_wipe_periocular_after_instillation｜title=点眼後の拭き取り｜requiredTags=[pg_glaucoma]｜uiGroup=薬剤固有介入｜uiVariant=rightAccentAmber】
# DESIGN_PENDING_PLACEMENT: P_ADDON_INLINE
P_APPEND
点眼後に目の周りへ薬液がついた場合は、清潔なティッシュなどでふき取ってください。



【SCENARIO｜type=side_effect｜id=se_periocular_pigmentation_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（眼周囲色素沈着）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
目の周りの黒ずみは認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による眼周囲の色素沈着は現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に、目の周りの黒ずみが出ることがあります。
P_ADDON_INLINE
- addon_glaucoma_pg_wipe_periocular_after_instillation
- addon_glaucoma_pg_wash_periocular_after_instillation
気になる変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_irritation_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（刺激感）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
刺激感は認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による刺激感は現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に刺激感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_foreign_body_sensation_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（異物感）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
異物感は認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による異物感は現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に異物感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pruritus_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（掻痒感）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
掻痒感は認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による掻痒感は現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に掻痒感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_redness_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（充血）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
充血は認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による充血は現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に充血が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_discharge_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（目やに）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
目やには認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による目やには現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に目やにが出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_blurred_vision_none｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 副作用なし（霧視）｜rapidEvaluationSubject=眼圧】
S
プロスタグランジン(PG)系の緑内障治療点眼薬を使用して眼圧は落ち着いている。
目のかすみは認めない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による霧視は現時点で認められず、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の継続中に目のかすみが出ることがあります。
P_ADDON_INLINE
- addon_eye_drop_blurred_vision_driving_caution
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=administration_guidance｜id=addon_eye_drop_blurred_vision_driving_caution｜title=霧視時の運転・機械操作】
# DESIGN_PENDING_PLACEMENT: P_ADDON_INLINE
P_APPEND
目がかすんでいる間は、自動車の運転や機械の操作に注意してください。




【SCENARIO｜type=adherence｜id=cp_good｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 CP良好】
S
薬を使用して症状は落ち着いている。
使用忘れなく継続できている。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　使用中
A
コンプライアンスは良好で、治療継続に問題はない。
P
引き続き用法を守って使用することで、治療効果の維持が期待されます。
今後も継続して使用できるようにすることが大切です。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 CP不良（使用忘れ）】
S
使用を忘れることがある。
症状は大きく変わっていない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　使用中
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




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 CP不良（自己判断）】
S
自己判断で使用を調整することがある。
症状は大きく変わっていない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　使用中
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




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 CP不良（受診遅延）】
S
受診が遅れ、使用を調整することがある。
症状は大きく変わっていない。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　使用中
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




【SCENARIO｜type=treatment_end｜id=end_improved｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 終了（改善）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧が良くなったため中止となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方終了
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、眼圧の改善を踏まえ終了となった。
終了後に症状が悪化する可能性があるため、注意が必要である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 終了（効果不十分）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果不十分のため中止となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方終了
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果不十分のため終了となった。
終了後は、目の症状の変化について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 終了（無効）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果が認められなかったため中止となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方終了
A
プロスタグランジン(PG)系の緑内障治療点眼薬は、効果が認められなかったため終了となった。
終了後は、目の症状の変化について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_mild_continue｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE継続（軽症 刺激感）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により刺激感があるが、日常生活は送れている。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による刺激感を軽度認めるが、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬による刺激感が軽い場合は、そのまま経過をみてください。
刺激感が続く場合や強くなる場合は、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_periocular_pigmentation_mild_continue｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE継続（軽症 眼周囲色素沈着）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により目の周りに軽い黒ずみがあるが、使用は継続できている。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による眼周囲の色素沈着を軽度認めるが、治療継続が可能である。
P
プロスタグランジン(PG)系の緑内障治療点眼薬による目の周りの黒ずみが軽い場合は、そのまま経過をみてください。
P_ADDON_INLINE
- addon_glaucoma_pg_wipe_periocular_after_instillation
- addon_glaucoma_pg_wash_periocular_after_instillation
黒ずみが目立ってくる場合や気になる場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_moderate_consider_dr｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE継続（中等度 刺激感）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により刺激感が強く、辛いことがあるが、日常生活は送れている。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方
A
プロスタグランジン(PG)系の緑内障治療点眼薬による刺激感が強く、継続困難の可能性があるため対応を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬による刺激感が続く場合や強くなる場合は、使用方法の見直しや薬剤の変更が必要になることがあります。
症状が続く場合は、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_irritation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE変更（刺激感）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により刺激感が出現したため、他剤へ変更となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による刺激感を認め、他剤変更後の経過確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の変更後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_periocular_pigmentation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE変更（眼周囲色素沈着）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により目の周りの黒ずみが出現したため、他剤へ変更となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による眼周囲の色素沈着を認め、他剤変更後の経過確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の変更後、目の周りの黒ずみや気になる変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_irritation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE回数減（刺激感）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により刺激感が強いため、点眼回数が減った。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　点眼回数減
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による刺激感を認め、点眼回数変更後の経過確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の点眼回数が減った後も刺激感が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_periocular_pigmentation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE回数減（眼周囲色素沈着）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により目の周りの黒ずみがみられたため、点眼回数が減った。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　点眼回数減
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による眼周囲の色素沈着を認め、点眼回数変更後の経過確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の点眼回数が減った後も、目の周りの黒ずみが気になる場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。



【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_irritation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE濃度減（刺激感）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により刺激感が強かったため、効果が穏やかなものになった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　低濃度製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による刺激感を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬を低濃度製剤へ変更後も、刺激感が続く場合や、気になる症状、使用感の変化がありましたらご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_periocular_pigmentation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE濃度減（眼周囲色素沈着）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により目の周りの黒ずみがみられたため、効果が穏やかなものになった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　低濃度製剤へ変更
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による眼周囲の色素沈着を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬を低濃度製剤へ変更後も、目の周りの黒ずみや気になる変化がありましたらご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_irritation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE中止（刺激感）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により刺激感が強いため、中止となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方中止
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による刺激感を認め、中止後の経過確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の中止後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_periocular_pigmentation｜title=プロスタグランジン(PG)系の緑内障治療点眼薬 SE中止（眼周囲色素沈着）】
S
プロスタグランジン(PG)系の緑内障治療点眼薬の使用により目の周りの黒ずみが強くなったため、中止となった。
O
プロスタグランジン(PG)系の緑内障治療点眼薬　処方中止
A
プロスタグランジン(PG)系の緑内障治療点眼薬の使用による眼周囲の色素沈着を認め、中止後の経過確認を要する。
P
プロスタグランジン(PG)系の緑内障治療点眼薬の中止後、目の周りの黒ずみや気になる変化があればご相談ください。
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
