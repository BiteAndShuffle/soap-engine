# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# allergy_chemical_mediator_release_inhibitor_eye_drops
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# SCENARIOS_START〜SCENARIOS_END（シナリオ本文・ADDON本文）は作成済み。
# 本Headerは、その本文に対して後付けで作成した DRAFT である（2026-09-17 作成。同日 Owner Review 指摘による
# 再監査、および Owner Decision / Human Review 情報〔点眼共通シャーシ原則・製品保存条件・PF〕の反映。
# 2026-09-18 に追加 Owner Decision〔クロモグリク酸点眼液の保存条件・冷所保存非該当〕を反映）。
# Header作成・再監査・反映の時点で SCENARIOS本文は一切変更していない。
# Owner Final Review 完了・凍結宣言により FROZEN_FOR_PN1 へ遷移した（2026-09-18。prompts/RULES.md §24）。
# 凍結時点で freeze blocker 0 件。SCENARIOS本文・header 値は凍結時に変更していない（STATUS 行と本コメントのみ更新）。
#
# ─────────────────────────────────────────────────────────────
# Owner-approved amendment（2026-09-19）
# ─────────────────────────────────────────────────────────────
#   種別:   Owner-approved Header amendment（状態遷移ではない）。
#           STATUS は `FROZEN_FOR_PN1` のまま維持する。prompts/RULES.md §24 は STATUS 値を
#           4 種に固定しており "amendment" 状態を持たない。また §24 の header 変更制限は
#           「状態遷移を伴う変更」に対する制約であり、本 amendment は遷移を伴わない。
#           STATUS の変更は Owner が明示的に遷移を指示した場合のみ行う（§24）。
#   根拠:   Generic Identity Search Principle（docs/DESIGN_PRINCIPLES.md DP-09 へ追記）
#           に基づく Owner Decision（2026-09-19。ZEP-1 Design Review D-1〜D-6）。
#   変更範囲: **Header の alias 3 フィールドのみ**
#             drug.search.exactAliases（17→19）/ drug.search.nameAliases（16→17）/
#             drug.nameAliases（16→17）、および本コメントと末尾 ZEP-1 記述の更新。
#   非変更:   SCENARIOS_START〜SCENARIOS_END 本文（1 文字も変更しない）/ brandCatalog /
#             aliasToBrand / prefixAliases（当時存在。後述の経緯を参照）/ brandNames /
#             handlingTags / scenarioRequiredTags / addonRequiredTags / STATUS 行。
#   amendment 前の SCENARIOS 本文（`=======SCENARIOS_START=======` 〜
#   `=======SCENARIOS_END=======` を含む行範囲）:
#       SHA-256: a07693c36d6e46355b6361a2b587377befc19d216eb2a70f7960230951ac4785
#       byte   : 46567
#       行数   : 932
#       固定 commit: 5731724（refactor: rebuild chemical mediator module and remediate PN8）
#   amendment 後も上記 SHA-256 / byte 数が一致することを機械確認すること。
#
#   prefixAliases を変更しない理由（**2026-09-19 の amendment 実施時点の記録**）:
#   当時 `drug.search.prefixAliases` は Header に存在していたが、lib/types.ts で
#   `@deprecated` であり、lib/search.ts の buildSearchIndex からは参照されなかった
#   （検索到達性には寄与しない）。そのため本 amendment では変更対象外とし、amendment 後に
#   prefixAliases(16) と nameAliases(17) の件数が非対称になることを、current runtime
#   semantics と deprecated 状態に基づく**意図的な結果**（同期漏れではない）として扱った。
#
#   【その後の経緯（2026-09-20 追記）】
#   `drug.search.prefixAliases` は legacy search field cleanup により schema / 全 bridge /
#   全 canonical から撤去された。本 bridge の prefixAliases ブロックもこのとき削除されている。
#   したがって上記の「件数の非対称」は現存しない。**上記段落は amendment 実施時点の判断記録
#   として保持しており、撤去後の状態を述べたものではない。** 撤去は本 amendment とは別の
#   Unit であり、amendment の変更範囲（Header の alias 3 フィールド）を事後に変更するもの
#   ではない。
#
# 記載方針:
#   - 本Headerの構造データ（YAML部分）には、Repository 上の正本・現行標準・SCENARIOS本文・
#     Owner Decision から確定できる値のみを置く。未確定の値を "PENDING" 等の仮文字列・空配列・
#     空objectで構造データへ置かない（仮データを PN2 に読み込ませないため）。
#     ※ brandCatalog.*.handlingTags の [] は「確定した空」（Owner 確認済みの製品情報により、
#       現行語彙のいずれのタグも持たない）を意味する。
#   - 未確定事項・候補・旧値は、末尾「残る未確定事項（PENDING）」のコメントにのみ保持する。
#   - 構造の reference は bridges/allergy_h1_antihistamine_eye_drops.md の Header のみ。
#     H1 の値（brand / generic / alias 値 / handlingTags 割当 / keywords 等）は流用していない。
#   - 旧 canonical（data/modules/allergy_chemical_mediator_release_inhibitor_eye_drops.json）および
#     旧 bridge Header（tracked 版。最終変更 commit bd11f5e）は、移行差分の確認にのみ使用した。
#     医療・製品情報の旧値は構造データへ復元していない。例外として、識別子（nodeKey / classKey）は
#     既存 runtime 識別子の維持として扱う（下記 composition 参照）。
#
# 点眼共通シャーシ原則（Owner Decision・2026-09-17）:
#   点眼薬 module は、現在の収載製品だけに最適化した scenario set ではなく、将来の製品 variation
#   （持続型・濃度違い・1回使い切り・PF 等）を含む共通シャーシとして設計する。
#   - scenario / addon の存在 = 共通シャーシが持つ capability（現在該当製品がないことを理由に削除しない）
#   - brandCatalog.handlingTags = 現在その製品で利用可能な capability
#   - scenarioRequiredTags / addonRequiredTags = 表示条件
#   - template.reservedHandlingTags = 現在の収載製品では到達不能だが、将来製品用として意図的に保持する capability
#   製品 variation の差分は handlingTags / scenarioRequiredTags / addonRequiredTags のみで表現する
#   （docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md）。
#
moduleId: "allergy_chemical_mediator_release_inhibitor_eye_drops"
categoryPath:
  - "アレルギー"
  - "抗アレルギー点眼薬"
  - "ケミカルメディエーター遊離抑制薬"
  - "外用"
  - "点眼"
# composition:
#   nodeKey / classKey は既存の識別子を維持する（2026-09-17 再監査）。
#   - nodeKey "chemical_mediator_release_inhibitor_eye_drops" は現行 canonical の
#     composition.nodeKey / display.nodeKey の値であり、Repository 内の参照は canonical と
#     生成物 data/search-manifest.json のみ（tests / runtime / audit scripts / fixtures に参照なし）。
#     runtime での nodeKey / classKey の利用は lib/searchManifest.ts の projection のみで、
#     validator に nodeKey 形式の検査はない。現行 corpus には {classKey}_{route} 形式でない
#     nodeKey が本 module を含め 7 module 存在し、JSON_STANDARD JS-A-composition も
#     {classKey}_{route} または {classKey}_{formulationType} を併記している。
#     形式を変更する必然性が Repository 上で確認できないため、識別子を変更しない。
#   - nodeKey が {classKey}_{route} 形式でないため、PN2 の classKey 機械導出は適用できない。
#     そのため classKey を明示する（現行 canonical の classKey を維持）。
composition:
  classKey: "chemical_mediator_release_inhibitor"
  nodeKey: "chemical_mediator_release_inhibitor_eye_drops"
  # priority: JSON_STANDARD JS-A-composition の必須 field（chronic / acute / prn。整数値は ERROR）。
  # 現行 corpus 35 module のうち値を持つ 34 module はすべて "chronic" であり、同一 route・同一領域の
  # H1 点眼 module も "chronic"。慢性疾患薬としての標準値を採る（O-11）。
  priority: "chronic"
drug:
  # genericName: SCENARIOS本文の薬剤主語（薬効分類名）と同一。
  genericName: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  # ─────────────────────────────────────────
  # brandNames / brandCatalog（Owner 確認済みの収載製品・2026-09-17）
  #   ブランド名系: ゼペリン点眼液 / アレギサール点眼液 / ペミラストン点眼液 / リザベン点眼液 / トラメラス点眼液
  #   一般名系:     ペミロラスト点眼液 / トラニラスト点眼液 / クロモグリク酸点眼液
  # 並び順は Owner 提供情報の記載順（保存条件グループ順）に従う（O-6）。
  # PF は製品 variation として扱い、PF 製剤を独立エントリにしない（PRODUCT_VARIANT_SEPARATION_PRINCIPLE §5.3）。
  # ─────────────────────────────────────────
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
    # exactAliases: 収載製品の正式表示名、剤形 suffix なしの入力alias、薬効分類名、
    # および brand-level generic identity（DP-09 Generic Identity Search Principle）。
    # 製品 variation 名（PF 等）は含めない（PRODUCT_VARIANT_SEPARATION_PRINCIPLE §5.3）。
    #
    # 「アシタザノラスト」「アシタザノラスト点眼液」は Owner-approved amendment（2026-09-19）で
    # 追加した brand-level generic identity である（brandCatalog["ゼペリン点眼液"].genericName /
    # .displayGenericName）。ゼペリン点眼液は先発のみ収載で対応する一般名製品が存在しないが、
    # DP-09 により generic identity の検索到達性は一般名製品・GE 製品の発売有無と独立に保持する。
    # **これらは製品の収載を意味しない。** brandCatalog へ一般名製品エントリは作らず
    # （D-8 / 7-1 を維持）、current marketed product（ゼペリン点眼液）への解決は
    # lib/search.ts resolveAllHighPrecisionBrands() の tier2（displayGenericName 照合）が担う。
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
      # brand-level generic identity（DP-09・Owner-approved amendment 2026-09-19）
      - "アシタザノラスト"
      - "アシタザノラスト点眼液"
    # nameAliases: brandNames 順に各エントリの aliases を連結したもの（H1 点眼 bridge と同じ構成）。
    # （2026-09-19 の amendment 時点では同構成の prefixAliases も併存していたが、同フィールドは
    #   2026-09-20 の legacy search field cleanup で撤去された。Header 冒頭の amendment 記載を参照。）
    #
    # nameAliases には brand-level generic identity の読み「あしたざのらすと」を追加する。
    # 剤形修飾を含むかな読み「あしたざのらすとてんがん」は**追加しない**（DP-09）:
    # 対応する一般名製品エントリが brandCatalog に存在しないため、当該読みで到達しても
    # brand へ解決できず unresolved 候補（resolution.denotation='module' / subject=null）に
    # なる。剤形修飾かな読みは一般名製品エントリが存在する場合にのみ、その entry 自身の
    # aliases として登録する（H1 点眼の「えぴなすちんてんがん」等がその形）。
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
      # brand-level generic identity の読み（DP-09・Owner-approved amendment 2026-09-19）
      - "あしたざのらすと"
    # keywords: 本 module の SCENARIOS本文（眼のかゆみ・充血・アレルギー症状）と categoryPath に現れる語のみ。
    keywords:
      - "アレルギー"
      - "抗アレルギー点眼薬"
      - "目のかゆみ"
      - "充血"
      - "点眼"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true
      # preferOwnNameMatchOverGenericMatch / suppressRedundantGenericHeaderOnDirectMatch の要否は
      # 未確定のため記載しない（PENDING-S2）。
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
    # brand-level generic identity の読み（DP-09・Owner-approved amendment 2026-09-19）
    - "あしたざのらすと"
  # ─────────────────────────────────────────
  # brandCatalog
  #   - 一般名系エントリの displayGenericName は、Owner 提供の一般名表記（エントリ名）そのもの。
  #     genericName は DP-21 に従い、同表記から剤形 suffix「点眼液」を除いた基本成分名（O-5）。
  #   - ブランド名系エントリの genericName / displayGenericName は Owner-confirmed pairing（2026-09-18）に従う:
  #       ゼペリン点眼液 → アシタザノラスト（一般名系エントリなし。GE 販売中止のため）
  #       アレギサール点眼液 / ペミラストン点眼液 → ペミロラスト（一般名系エントリ: ペミロラスト点眼液）
  #       リザベン点眼液 / トラメラス点眼液 → トラニラスト（一般名系エントリ: トラニラスト点眼液）
  #     SOAP Engine 上の grouping は search / BrandResolution / subject resolution のための product model であり、
  #     商流上の厳密な併売関係を runtime model に要求しない（Owner Decision・2026-09-18）。
  #   - genericKey は設定しない。同一成分の grouping は displayGenericName へのフォールバックで成立し、
  #     PF の差は preservative_free（handlingTags）で表現できるため、新しい genericKey を作らない（RULES.md §21 / DP-18）。
  #   - aliases は DP-18 に従い各エントリ自身の名称の読みのみを持ち、ペアの一般名読みを借用しない。
  #     読みは表示名のカタカナをひらがなへ置換し、「点眼液」を「てんがん」とする形式（O-7）。
  #   - handlingTags は Owner 確認済みの製品情報（保存条件・PF）を既存語彙で表現する:
  #       室温保管のみ            → 該当タグなし（室温保管を表示条件とする SCENARIO/ADDON は存在せず、
  #                                 室温保管を表す新規 handlingTag も作成しない）
  #       遮光保存                → light_protection
  #       冷所回避                → avoid_cold_storage
  #       PF 製剤あり             → preservative_free
  # ─────────────────────────────────────────
  brandCatalog:
    ゼペリン点眼液:
      displayName: "ゼペリン点眼液"
      # 先発品のみ収載（GE は販売中止のため一般名系の独立エントリを設けない。Owner Decision・2026-09-18）。
      genericName: "アシタザノラスト"
      displayGenericName: "アシタザノラスト点眼液"
      handlingTags: []
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
      handlingTags: []
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
      handlingTags: []
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
      handlingTags: []
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
      handlingTags:
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
      # PF は製品 variation として preservative_free で表現する（別 genericKey を作らない）。
      handlingTags:
        - "light_protection"
        - "avoid_cold_storage"
        - "preservative_free"
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
      # 遮光 + 室温保管、PF 製剤あり。avoid_cold_storage は付与しない（Owner Decision・2026-09-18）。
      handlingTags:
        - "light_protection"
        - "preservative_free"
      # 読みは Owner-confirmed value「くろもぐりくさん」（2026-09-18）。剤形込みの読みは
      # 他エントリと同じ規則（「点眼液」→「てんがん」）で導出した。
      aliases:
        - "くろもぐりくさんてんがん"
        - "くろもぐりくさん"
      normalizedAliases:
        - "くろもぐりくさんてんがん"
        - "くろもぐりくさん"
  # aliasToBrand は全エントリの normalizedAliases を過不足なく網羅する（RULES.md §10）。
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
    # 点眼共通シャーシの capability 語彙（9種）。scenarioRequiredTags / addonRequiredTags が参照する。
    # 各タグは、対応する SCENARIO / ADDON の本文内容（懸濁性・遮光・冷所保存・1回使い切り・PF 等）が
    # 特定の製剤性質を前提とすることを根拠とする。どの製品で到達可能かは brandCatalog.handlingTags が決める。
    - "suspension"
    - "light_protection"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "reduced_frequency_option"
    - "concentration_variant"
    - "single_use_container"
    - "preservative_free"
    - "avoid_cold_storage"
  reservedHandlingTags:
    # 現在の収載製品では到達不能だが、共通シャーシ capability として意図的に保持するタグ（RULES.md §27）。
    # - concentration_variant: 現在の収載製品に濃度増減として扱う製剤差はない（Owner Decision・2026-09-17）。
    # - cold_storage / cold_storage_before_opening: Owner 確認済みの保存条件（収載8製品はいずれも
    #   室温保管。うち4製品は遮光、3製品は冷所回避）により、冷所保存を要する製品は存在しない
    #   （Owner Decision・2026-09-18）。
    # - suspension / single_use_container / reduced_frequency_option: Owner が全8エントリの handlingTags を
    #   確定した結果（2026-09-18）、これらを保持する収載製品は存在しない。
    # light_protection / avoid_cold_storage / preservative_free は現在の収載製品で到達可能なため含めない。
    - "concentration_variant"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "suspension"
    - "single_use_container"
    - "reduced_frequency_option"
display:
  title: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  # subtitle は未記載（PENDING-D1）。記載しない場合、PN2 は標準 fallback
  # 「{drug.genericName}（点眼）」を確定値とする（PN2-Drug-Header.md「display.subtitle の確定ルール」）。
  drugClassLabel: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  drugGeneric: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  # nodeLabelShort: 薬剤師が一覧上で薬効群を識別するための短縮表示名（Owner Decision・2026-09-18）。
  # 正式薬効名の機械的な短縮ではなく、「H1点眼」等と並べたときに識別しやすい命名体系を採る。
  nodeLabelShort: "ケミ点眼"
  nodeLabelLong: "ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"
  # display.nodeKey は composition.nodeKey と一致させる（JSON_STANDARD JS-A-display）。
  nodeKey: "chemical_mediator_release_inhibitor_eye_drops"
  # menuGroupLabels / adjustmentExpression は未確定のため記載しない（PENDING-D3・D4）。
  # localInput: SCENARIOS本文の initial / restart / external_start の S に
  # {{applicationSite}} が含まれるため、点眼部位入力UIを有効化する。
  # 各キーは lib/types.ts の display.localInput 型と、現行 H1 点眼 bridge の構造に従う。
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
# scenarioRequiredTags / addonRequiredTags（共通シャーシの表示条件。Owner Decision・2026-09-17）:
# 本モジュールでは、これらのタグを SCENARIO/ADDON ヘッダー行へのインライン記載ではなく、
# 本Headerに正式な構造データ（id → tags のマップ）として定義する（SCENARIOS本文にはインライン
# requiredTags が存在しないことを確認済み。map と inline の二重記載なし）。
# 記載のない scenario / addon は常時表示（タグ条件なし）とする。
# 各エントリの根拠は、本 module の SCENARIOS本文（当該 SCENARIO / ADDON の title・本文が特定の
# 製剤性質を前提としていること）と、点眼共通シャーシ原則である。
# ─────────────────────────────────────────
scenarioRequiredTags:
  # 懸濁性点眼液を前提とする手技・保管の指導シナリオ
  lifestyle_guidance_suspension_shake: ["suspension"]
  lifestyle_guidance_storage_upright_suspension: ["suspension"]
  # 遮光保存を前提とする保管指導シナリオ
  lifestyle_guidance_storage_light_protection: ["light_protection"]
  # 冷所保存を前提とする保管指導シナリオ
  lifestyle_guidance_storage_cold: ["cold_storage"]
  # 未開封時のみ冷所保存を前提とする保管指導シナリオ
  lifestyle_guidance_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 点眼回数を減らすための持続型製剤への切替選択肢が存在することを前提とするシナリオ（共通シャーシ capability）
  switch_to_sustained_formulation_reduced_frequency: ["reduced_frequency_option"]
  # 濃度の異なる製剤が存在することを前提とする濃度増減シナリオ（共通シャーシ capability。
  # Owner Decision により現在の収載製品では到達不能 → concentration_variant は reservedHandlingTags）
  strength_increase_low_perceived_effect: ["concentration_variant"]
  strength_increase_due_to_other_med_adjustment: ["concentration_variant"]
  strength_decrease_improved: ["concentration_variant"]
  strength_decrease_low_perceived_effect: ["concentration_variant"]
  strength_decrease_due_to_other_med_adjustment: ["concentration_variant"]
  # 刺激感を理由とする濃度減。濃度違いの製剤が存在することを前提とする点で上記5件と同じ capability に
  # 属するため、同じ concentration_variant を表示条件とする（専用タグは設けない）
  se_strength_decreased_due_to_irritation: ["concentration_variant"]
addonRequiredTags:
  # 懸濁性点眼液の振り混ぜ・先端上向き保管
  addon_eye_drop_suspension_shake: ["suspension"]
  addon_eye_drop_storage_upright_suspension: ["suspension"]
  # 遮光保存（遮光袋での保管）
  addon_eye_drop_storage_light_protection: ["light_protection"]
  # 冷所保存、および冷所から出した後の取り扱い（冷所保存製品にのみ該当する内容）
  addon_eye_drop_storage_cold: ["cold_storage"]
  addon_eye_drop_warm_container_after_cold_storage: ["cold_storage"]
  # 未開封時のみ冷所保存
  addon_eye_drop_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 低温保存を避けるべき製品（冷蔵庫に入れない。「冷所保存が必要」の否定ではなく独立した陽性タグ）
  addon_eye_drop_avoid_cold_storage: ["avoid_cold_storage"]
  # 1回使い切り容器
  addon_eye_drop_single_dose_mini: ["single_use_container"]
  # 防腐剤無添加（PF）製剤の容器の扱い
  addon_eye_drop_preservative_free_pf: ["preservative_free"]
# 次のADDONは addonRequiredTags を設定せず、常時表示とする:
# - addon_eye_drop_interval_after_suspension_5min / addon_eye_drop_interval_after_suspension_10min
#   （併用する他の懸濁性点眼薬との点眼間隔を扱う内容であり、本 module の製剤性質を前提としない）
# - addon_eye_drop_contact_lens_remove_before_use
#   （Owner Decision・2026-09-18: 常時表示候補とする。点眼薬はコンタクトレンズ装用時の可否が製品・製剤で
#    異なり、交付される製品は薬局の採用品・在庫にも依存するため、handlingTags による自動判定の設計にしない。
#    薬剤師が実際の交付製品・レンズ種別・添付文書を確認して選択する。新規 handlingTag は作成しない）
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
# =========================================
# 確定済み事項（Owner Decision / Human Review・2026-09-17）
# =========================================
#
# D-1. 点眼共通シャーシ原則（本Header冒頭参照）。現在該当製品がないことを理由に scenario / addon を削除しない。
# D-2. 濃度違い: 現在の収載製品に濃度増減として扱う製剤差はない。strength_* 5件と
#      se_strength_decreased_due_to_irritation は concentration_variant を表示条件として保持し、
#      concentration_variant を reservedHandlingTags に置く。
# D-3. 収載製品（8件）: ゼペリン点眼液 / アレギサール点眼液 / ペミラストン点眼液 / リザベン点眼液 /
#      トラメラス点眼液（ブランド名系）、ペミロラスト点眼液 / トラニラスト点眼液 / クロモグリク酸点眼液（一般名系）。
# D-4. 保存条件（収載8製品すべて室温保管。Owner Decision・2026-09-17／2026-09-18）:
#      室温保管のみ: ゼペリン点眼液 / アレギサール点眼液 / ペミラストン点眼液 / ペミロラスト点眼液
#      遮光 + 室温保管 + 冷所回避: リザベン点眼液 / トラニラスト点眼液 / トラメラス点眼液
#      遮光 + 室温保管（冷所回避は付与しない）: クロモグリク酸点眼液
# D-5. PF 製剤あり: トラメラス点眼液 / クロモグリク酸点眼液（PF 製剤を独立エントリにしない。
#      PF だけを理由に別 module・別 genericKey とはしない）。
# D-7. 冷所保存を要する製品は存在しない（D-4 より）。cold_storage / cold_storage_before_opening は
#      共通シャーシ capability として保持し、reservedHandlingTags で管理する。
# D-8. brand / generic pairing（Owner Decision・2026-09-18。7-1〜7-4）:
#      ゼペリン点眼液 → アシタザノラスト（先発のみ収載。GE 販売中止のため一般名系エントリを設けない）
#      アレギサール点眼液 / ペミラストン点眼液 → ペミロラスト（一般名系: ペミロラスト点眼液）
#      リザベン点眼液 / トラメラス点眼液 → トラニラスト（一般名系: トラニラスト点眼液）
#      クロモグリク酸点眼液は一般名系エントリ。
# D-9. 全8エントリの handlingTags が確定したため、suspension / single_use_container /
#      reduced_frequency_option を保持する収載製品は存在しない → reservedHandlingTags で保持する。
# D-10. addon_eye_drop_contact_lens_remove_before_use は addonRequiredTags を設定せず常時表示候補とする
#      （自動判定しない。薬剤師判断）。
# D-11. genericKey は作成しない（PF は preservative_free で表現。grouping は displayGenericName で成立）。
# D-6. se_strength_decreased_due_to_irritation は通常の濃度増減と同じ concentration_variant を表示条件とする
#      （濃度違いの製剤が存在することを前提とする同一 capability。専用タグを新設しない）。
#
# =========================================
# Owner 確認事項の再分類（2026-09-18 時点）
# =========================================
#
# RESOLVED（Owner Decision により確定済み）
#   O-5  一般名系エントリの genericName（ペミロラスト / トラニラスト / クロモグリク酸）
#        → 7-2 / 7-3 / 7-4 の pairing で確定。
#   O-8  旧 module との差分（インタール非収載・トラメラスの表記・アシタザノラストの一般名系エントリ非設置）
#        → 3（収載構成）・7-1 で確定。
#   O-9  ゼペリン点眼液の genericName / displayGenericName
#        → 1（アシタザノラスト / アシタザノラスト点眼液）で確定。ただし検索可視性は下記 ZEP-1 を参照。
#   D2   display.nodeLabelShort = "ケミ点眼" → 2 で確定。
#   S1a  クロモグリク酸の読み「くろもぐりくさん」→ 3 で確定。
#
# STILL_PENDING（Owner が明示していない値。関連事項の確定を理由に自動承認しない）
#   O-1  composition.nodeKey / display.nodeKey / classKey（既存識別子の維持）
#        なぜ必要か: 識別子の維持自体は Repository Fact から導いたが、node 識別子の確定は Owner の承認事項。
#        freeze blocker: いいえ（現行値の維持であり、変更を伴わない）。
#   O-2  categoryPath（5階層）
#        なぜ必要か: 第3階層以外は既存点眼 module の階層構造に倣ったものであり、Owner 提供値ではない。
#        freeze blocker: いいえ。
#   O-3  drug.drugClass / drugSpecificTags / template.situationTags・severityTags
#        なぜ必要か: 語彙の選定であり Owner 提供値ではない（runtime 参照は drugSpecificTags のみ）。
#        freeze blocker: いいえ。
#   O-4  display.localInput の label / placeholder（UI 文言）
#        なぜ必要か: 画面に表示される文言であり、Owner 提供値ではない。
#        freeze blocker: いいえ。
#   O-6  brandNames の並び順
#        なぜ必要か: 検索候補の宣言順に影響する。Owner 提供情報の記載順を採用したが、順序自体の承認は未取得。
#        freeze blocker: いいえ。
#   O-7  aliases / normalizedAliases の読みの生成規則（カタカナ→ひらがな、「点眼液」→「てんがん」）と
#        search.exactAliases の構成
#        なぜ必要か: 読みの生成規則は H1 点眼 bridge の記法に倣ったものであり、規則自体の承認は未取得。
#        freeze blocker: いいえ（S1b の構造は本規則に依存するため、規則が変われば再生成が必要）。
#   O-10 search.keywords
#        なぜ必要か: 本 module の SCENARIOS本文・categoryPath に現れる語のみで構成したが、検索キーワードの
#        取捨は Owner 判断（医療内容の新規創作はしていない）。
#        freeze blocker: いいえ。
#   O-11 composition.priority = "chronic"
#        なぜ必要か: JS-A-composition 必須 field。corpus 全 34 module が "chronic" であることと H1 点眼の
#        実績から technical default として採ったが、本 module の臨床的な位置づけの承認は未取得。
#        freeze blocker: いいえ。
#
# =========================================
# 残る未確定事項（PENDING）
# =========================================
#
# 【Known behavior（Owner Decision により freeze blocker から除外・2026-09-18）】
# ZEP-1. ゼペリン点眼液を検索すると、一般名見出し候補「アシタザノラスト点眼液」が selectable candidate として
#   表示される（2026-09-18 実測）。
#   実測: 本 Header の構成（displayGenericName = "アシタザノラスト点眼液"、一般名系エントリなし、
#   あしたざのらすと系の alias なし）で getDrugSuggestions を実行すると、
#     q="ぜぺりん" → [ゼペリン点眼液（アシタザノラスト点眼液）] と [アシタザノラスト点眼液]（見出し候補）の2件
#   が返る。matchPolicy の suppressRedundantGenericHeaderOnDirectMatch を opt-in しても同じ
#   （strong single-ingredient クエリでは同フラグを参照しない実装のため。lib/search.ts の genericHeader 生成）。
#   一方 q="あしたざのらすと" / "アシタザノラスト点眼液" は候補 0 件で、一般名読みからの独立到達はしない。
#   本挙動は本 module 固有ではなく現行 corpus 共通である（例: リベルサス→[セマグルチド]、
#   ビクトーザ→[リラグルチド]。いずれも当該一般名の brandCatalog エントリを持たない）。
#
#   【2026-09-19 Owner-approved amendment による更新】
#   上記のうち**一般名読みからの到達性（reachability）のみ**が変更された。DP-09 Generic Identity
#   Search Principle に基づき brand-level generic identity を module-level alias へ登録したため、
#   amendment 後の実測は次のとおり:
#     q="あしたざのらすと" / "アシタザノラスト" / "アシタザノラスト点眼液"
#       → [アシタザノラスト点眼液]（見出し候補）と [ゼペリン点眼液（アシタザノラスト点眼液）] の2件
#     q="あしたざのらすとてんがん" → 0 件（剤形修飾かな読みは登録しないため。DP-09）
#     q="ぜぺりん" → amendment 前と同一（2件。変化なし）
#   これは corpus 先例（q="りなぐりぷちん" → [リナグリプチン] + [トラゼンタ（リナグリプチン）]）と
#   同一の挙動であり、brandCatalog へ一般名製品エントリを追加していない点も先例と同じである。
#   **generic header を selectable candidate として表示するかどうかという UI 側の論点は、
#   本 amendment では一切変更しておらず、下記のとおり別 Unit のまま残る。**
#
#   **Owner Decision（2026-09-18）**: 今回の rebuild では現行 corpus 共通の genericHeader 挙動を変更せず、
#   本挙動を bridge freeze の blocker としない。ただしこれは最終的な望ましい UX として承認するものではない。
#   displayGenericName と「実在する検索可能な一般名製品エントリ」を区別し、販売されていない一般名製品を
#   selectable candidate として表示しない設計は、chemical mediator 固有ではなく corpus-wide の
#   search UX / genericHeader contract の課題として**別 Unit** で扱う（lib/search.ts の genericHeader 生成条件・
#   BrandResolution・DP-18・既存 module への影響を横断的に設計レビューする）。
#   本 module では module 固有の分岐・新規 canonical field・新規 hidden flag 等を追加しない。
#   （2026-09-19 amendment 後も本 Owner Decision は有効。amendment は reachability のみを扱い、
#    genericHeader UI 問題は別 Unit として維持する。module 固有の分岐・新規 field・hidden flag は
#    amendment でも一切追加していない。)
#
# 【凍結前に判断が望ましいが、現行契約上は freeze blocker ではない事項】
# PENDING-S2. matchPolicy の preferOwnNameMatchOverGenericMatch / suppressRedundantGenericHeaderOnDirectMatch
#   （DP-18。任意フラグ）。2026-09-18 実測では、opt-in により一般名クエリでの並び順が変わる
#   （q="ぺみろらすと": opt-in なし = アレギサール→ペミラストン→ペミロラスト点眼液 /
#    opt-in あり = ペミロラスト点眼液→アレギサール→ペミラストン）。ZEP-1 の見出し表示には影響しない。
#   同一領域・同一 route の H1 点眼 module は両フラグを opt-in 済み。
# PENDING-D1. display.subtitle。記載しない場合は PN2 の標準 fallback「{drug.genericName}（点眼）」となる。
#   旧値（移行参照のみ）: アレルギー性結膜炎・目のかゆみに対する点眼治療
# PENDING-D3. display.menuGroupLabels（任意）。本 module は回数増減（frequency_*）と濃度増減（strength_*）の
#   両シナリオを持つ。旧値（移行参照のみ）: 増量: "回数増" / 減量: "回数減"
# PENDING-D4. display.adjustmentExpression（任意）。本 module は Rapid v2 global promotion の一時除外
#   （legacy Rapid v1）であり、v1 の S先頭文生成が本フィールドを参照する。記載しない場合、再生成後の
#   v1 の増量／減量の文は adjustmentExpression なしの標準形になる（一時除外の設定自体は変更しない）。
#   旧値（移行参照のみ）: increasePast: "点眼回数が増えた" / decreasePast: "点眼回数が減った"
#
# 【PN 工程で扱う事項（本 Header では記載しない。責務 drift なし）】
# - persona: PN2 は bridge に persona: がない場合 omit し、PN5 が既定値を必ず生成し（PN5-Non-Scenario.md
#   「persona セクション（必須）」）、PN6 が top-level へ配置する。JSON_STANDARD JS-A の必須要件は PN5 で満たされる。
# - drugResolution.brandToTags / sMergePolicy / groupKeyRegistry / regulatory / topical / defaults /
#   template.urgentFlag・urgentCriteria は PN2、ui / risks / searchConfig / tagCatalog / expressModes は PN5 の生成責務。
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



