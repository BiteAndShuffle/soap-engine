# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# allergy_h1_antihistamine_eye_drops
# =========================================
#
# 本Headerは、当初SCENARIOS_START〜SCENARIOS_END本文に対して後付けで作成された
# ものであり、Header作成時点ではSCENARIOS本文を変更していない。
# その後、Owner明示指示によりSCENARIOS本文へも更新（ADDON追加・P_ADDON参照追加・
# scenarioColor付与・title調整等）が加えられている。現在はHeader + SCENARIOS本文を
# 合わせたbridge原稿全体を内容の正本として扱う。
#
# ファイルは allergy_h1_antihistamine_eye_drops.md へリネーム済み。
# moduleId・ファイル名・templateId（allergy_h1_antihistamine_eye_drops_v1）の
# 基幹命名は allergy_h1_antihistamine_eye_drops で整合している。
#
# ブランドごとの差異（懸濁性・遮光性・持続性製剤の有無等）は、
# SCENARIOS本文を個別に書き分けるのではなく、brandCatalog.handlingTags と
# 下記 scenarioRequiredTags / addonRequiredTags（正式な構造データ）のみで制御する。
#
moduleId: "allergy_h1_antihistamine_eye_drops"
categoryPath:
  - "アレルギー"
  - "抗アレルギー点眼薬"
  - "ヒスタミンH1受容体拮抗薬"
  - "外用"
  - "点眼"
drug:
  genericName: "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"
  # 2026-07-24 更新: 剤形・投与経路が異なる薬剤単位を示すため、正式表示名を
  # 「{ブランド名/一般名}点眼液」へ統一する（例: アレジオン錠と区別するため）。
  # bare名（例: "アレジオン"）は search.exactAliases 側の入力aliasとしてのみ残す。
  # 詳細: docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md
  brandNames:
    - "アレジオン点眼液"
    - "エピナスチン点眼液"
    - "ザジテン点眼液"
    - "ケトチフェン点眼液"
    - "パタノール点眼液"
    - "オロパタジン点眼液"
    - "リボスチン点眼液"
    - "レボカバスチン点眼液"
  drugClass:
    - "H1_ANTIHISTAMINE_EYE_DROPS"
  route: "ophthalmic"
  dosageForms:
    - "eye_drop"
  drugSpecificTags:
    - "h1_antihistamine"
    - "antihistamine_eye_drop"
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
    primaryDisplayName: "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"
    exactAliases:
      - "アレジオン点眼液"
      - "エピナスチン点眼液"
      - "ザジテン点眼液"
      - "ケトチフェン点眼液"
      - "パタノール点眼液"
      - "オロパタジン点眼液"
      - "リボスチン点眼液"
      - "レボカバスチン点眼液"
      # bare名（剤形suffixなし）も入力aliasとして許容する（正式表示名は上記の点眼液付き）
      - "アレジオン"
      - "エピナスチン"
      - "ザジテン"
      - "ケトチフェン"
      - "パタノール"
      - "オロパタジン"
      - "リボスチン"
      - "レボカバスチン"
      - "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"
    prefixAliases:
      - "あれじおんてんがん"
      - "あれじおん"
      - "えぴなすちんてんがん"
      - "えぴなすちん"
      - "ざじてんてんがん"
      - "ざじてん"
      - "けとちふぇんてんがん"
      - "けとちふぇん"
      - "ぱたのーるてんがん"
      - "ぱたのーる"
      - "おろぱたじんてんがん"
      - "おろぱたじん"
      - "りぼすちんてんがん"
      - "りぼすちん"
      - "れぼかばすちんてんがん"
      - "れぼかばすちん"
    nameAliases:
      - "あれじおんてんがん"
      - "あれじおん"
      - "えぴなすちんてんがん"
      - "えぴなすちん"
      - "ざじてんてんがん"
      - "ざじてん"
      - "けとちふぇんてんがん"
      - "けとちふぇん"
      - "ぱたのーるてんがん"
      - "ぱたのーる"
      - "おろぱたじんてんがん"
      - "おろぱたじん"
      - "りぼすちんてんがん"
      - "りぼすちん"
      - "れぼかばすちんてんがん"
      - "れぼかばすちん"
    keywords:
      - "花粉症"
      - "アレルギー性結膜炎"
      - "目のかゆみ"
      - "目の充血"
      - "涙目"
      - "点眼"
      - "目薬"
    priority: 5
    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true
      # direct候補内に同一成分のブランド候補（ブランド名エントリ／一般名エントリの
      # ペア）が既に存在する場合、冗長な一般名単独の generic header 候補を
      # 追加しない（dm_biguanide_metformin_oral 等と同一の既存flag・既存意味論）。
      suppressRedundantGenericHeaderOnDirectMatch: true
  nameAliases:
    - "あれじおんてんがん"
    - "あれじおん"
    - "えぴなすちんてんがん"
    - "えぴなすちん"
    - "ざじてんてんがん"
    - "ざじてん"
    - "けとちふぇんてんがん"
    - "けとちふぇん"
    - "ぱたのーるてんがん"
    - "ぱたのーる"
    - "おろぱたじんてんがん"
    - "おろぱたじん"
    - "りぼすちんてんがん"
    - "りぼすちん"
    - "れぼかばすちんてんがん"
    - "れぼかばすちん"
  # ─────────────────────────────────────────
  # brandCatalog: 対象製剤8件すべてを個別エントリとして定義する（代表ブランドへの集約なし）。
  # ブランド名エントリと一般名エントリは1:1で対をなし、同一実体（同じ点眼液）を指すため
  # handlingTags は各ペアで同一値にする（検索経路がブランド名/一般名のどちらでも
  # scenarioRequiredTags / addonRequiredTags の判定結果が一致するようにするため）。
  # ─────────────────────────────────────────
  brandCatalog:
    アレジオン点眼液:
      displayName: "アレジオン点眼液"
      genericName: "エピナスチン"
      displayGenericName: "エピナスチン点眼液"
      handlingTags:
        - "reduced_frequency_option"
      aliases:
        - "あれじおんてんがん"
        - "あれじおん"
        - "えぴなすちんてんがん"
        - "えぴなすちん"
      normalizedAliases:
        - "あれじおんてんがん"
        - "あれじおん"
        - "えぴなすちんてんがん"
        - "えぴなすちん"
    エピナスチン点眼液:
      displayName: "エピナスチン点眼液"
      genericName: "エピナスチン"
      displayGenericName: "エピナスチン点眼液"
      handlingTags:
        - "reduced_frequency_option"
      aliases:
        - "えぴなすちんてんがん"
        - "えぴなすちん"
      normalizedAliases:
        - "えぴなすちんてんがん"
        - "えぴなすちん"
    ザジテン点眼液:
      displayName: "ザジテン点眼液"
      genericName: "ケトチフェン"
      displayGenericName: "ケトチフェン点眼液"
      handlingTags: []
      aliases:
        - "ざじてんてんがん"
        - "ざじてん"
        - "けとちふぇんてんがん"
        - "けとちふぇん"
      normalizedAliases:
        - "ざじてんてんがん"
        - "ざじてん"
        - "けとちふぇんてんがん"
        - "けとちふぇん"
    ケトチフェン点眼液:
      displayName: "ケトチフェン点眼液"
      genericName: "ケトチフェン"
      displayGenericName: "ケトチフェン点眼液"
      handlingTags: []
      aliases:
        - "けとちふぇんてんがん"
        - "けとちふぇん"
      normalizedAliases:
        - "けとちふぇんてんがん"
        - "けとちふぇん"
    パタノール点眼液:
      displayName: "パタノール点眼液"
      genericName: "オロパタジン"
      displayGenericName: "オロパタジン点眼液"
      handlingTags:
        - "light_protection"
      aliases:
        - "ぱたのーるてんがん"
        - "ぱたのーる"
        - "おろぱたじんてんがん"
        - "おろぱたじん"
      normalizedAliases:
        - "ぱたのーるてんがん"
        - "ぱたのーる"
        - "おろぱたじんてんがん"
        - "おろぱたじん"
    オロパタジン点眼液:
      displayName: "オロパタジン点眼液"
      genericName: "オロパタジン"
      displayGenericName: "オロパタジン点眼液"
      handlingTags:
        - "light_protection"
      aliases:
        - "おろぱたじんてんがん"
        - "おろぱたじん"
      normalizedAliases:
        - "おろぱたじんてんがん"
        - "おろぱたじん"
    リボスチン点眼液:
      displayName: "リボスチン点眼液"
      genericName: "レボカバスチン"
      displayGenericName: "レボカバスチン点眼液"
      handlingTags:
        - "suspension"
      aliases:
        - "りぼすちんてんがん"
        - "りぼすちん"
        - "れぼかばすちんてんがん"
        - "れぼかばすちん"
      normalizedAliases:
        - "りぼすちんてんがん"
        - "りぼすちん"
        - "れぼかばすちんてんがん"
        - "れぼかばすちん"
    レボカバスチン点眼液:
      displayName: "レボカバスチン点眼液"
      genericName: "レボカバスチン"
      displayGenericName: "レボカバスチン点眼液"
      handlingTags:
        - "suspension"
      aliases:
        - "れぼかばすちんてんがん"
        - "れぼかばすちん"
      normalizedAliases:
        - "れぼかばすちんてんがん"
        - "れぼかばすちん"
  aliasToBrand:
    "あれじおんてんがん": "アレジオン点眼液"
    "あれじおん": "アレジオン点眼液"
    "えぴなすちんてんがん": "エピナスチン点眼液"
    "えぴなすちん": "エピナスチン点眼液"
    "ざじてんてんがん": "ザジテン点眼液"
    "ざじてん": "ザジテン点眼液"
    "けとちふぇんてんがん": "ケトチフェン点眼液"
    "けとちふぇん": "ケトチフェン点眼液"
    "ぱたのーるてんがん": "パタノール点眼液"
    "ぱたのーる": "パタノール点眼液"
    "おろぱたじんてんがん": "オロパタジン点眼液"
    "おろぱたじん": "オロパタジン点眼液"
    "りぼすちんてんがん": "リボスチン点眼液"
    "りぼすちん": "リボスチン点眼液"
    "れぼかばすちんてんがん": "レボカバスチン点眼液"
    "れぼかばすちん": "レボカバスチン点眼液"
template:
  templateId: "allergy_h1_antihistamine_eye_drops_v1"
  templateVersion: "1.0.0"
  situationTags:
    - "general"
    - "seasonal"
    - "ocular_allergy"
  severityTags:
    - "mild"
    - "moderate"
    - "severe"
  storageTags:
    - "room_temperature_storage"
    - "light_protection_storage"
    - "cold_storage"
    - "storage_product_specific"
  formulationTags:
    - "solution_eye_drop"
    - "suspension_eye_drop"
  handlingTags:
    # scenarioRequiredTags / addonRequiredTags の判定に使用するタグの正式な語彙一覧（9種、最小集合）。
    # 現行8製剤のうち suspension / light_protection / reduced_frequency_option の3種のみ実際に付与済み。
    # cold_storage / cold_storage_before_opening / concentration_variant / single_use_container /
    # preservative_free / avoid_cold_storage は対応するSCENARIO/ADDONを非表示に保つために定義するが、
    # 現行製剤には付与しない。
    #
    # reduced_frequency_option についての運用メモ:
    #   「高濃度製剤そのもの」を表すタグではない。アレジオン／エピナスチン系に、
    #   点眼回数を減らすための持続型製剤への切替選択肢が存在することを示す運用タグである。
    #   LX等の製品バリエーションを独立した検索候補・SOAP主語（{{drug_subject}}）として
    #   持つことは意図していない。切替時のみ switch_to_sustained_formulation_reduced_frequency
    #   シナリオを表示し、切替後の継続・副作用・CP・終了等はベース薬剤
    #   （アレジオン／エピナスチン）の通常シナリオをそのまま使用する。
    #   製品バリエーションごとにcanonicalデータ（brandCatalogエントリ・SCENARIO・alias等）を
    #   複製しない設計方針（将来の他点眼薬にも適用予定）。
    #
    # avoid_cold_storage についての運用メモ（2026-09 追加）:
    #   「低温保存が必要」の否定ではなく、「低温保存を避けるべき」という独立した
    #   陽性の運用タグである（requiredTagsのAND判定は否定条件を表現できないため）。
    #   cold_storage と同時に真になることは想定しない。現行8製剤はいずれも
    #   低温保存関連の指示を要しないため、両タグとも付与しない。
    #
    # concentration_variant についての運用メモ（CHECK・未解決）:
    #   本来、通常の濃度増減4件（strength_increase/decrease系）と、
    #   刺激感を理由とする濃度減1件（se_strength_decreased_due_to_irritation）は
    #   実務上の意味が異なり、区別すべきである。
    #   ただし ScenarioItem/AddonItem には scenarioRequiredTags / requiredTags 以外の
    #   表示制御フィールドが存在せず（lib/types.ts確認済み）、
    #   タグ未定義=常時表示という既存仕様上、この5件を非表示のまま保持するには
    #   何らかのタグへの参照が必須。新規タグの発明は禁止されているため、
    #   両者を暫定的に同一タグ（concentration_variant）に留めている。
    #   se_strength_decreased_due_to_irritation の対象製剤が将来確定した時点で、
    #   専用のscenarioRequiredTagsエントリを追加し、このタグから分離すること。
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
    # 2026-07-24 追加。現行8製剤のどのbrandCatalogエントリも持たないが、
    # 将来の製品・製品バリエーション追加時に到達可能になる想定で意図的に保持しているタグ。
    # ModuleValidator は、このリストに宣言されたタグを参照する到達不能な
    # scenarioRequiredTags / addon.requiredTags を ERROR ではなく WARNING として扱う
    # （lib/moduleValidator.ts check 15/32/33/34）。
    # reduced_frequency_option / suspension / light_protection は現行ブランドで既に
    # 到達可能なため、このリストには含めない。
    # タグの誤記・設定漏れを免責する汎用的な逃げ道ではない。将来対応製品が確定した時点で
    # 該当タグをこのリストから外し、対象brandCatalogエントリへ正式に付与すること。
    # avoid_cold_storage は2026-09追加。現行8製剤はいずれも該当しないため保留のまま。
    - "concentration_variant"
    - "cold_storage"
    - "cold_storage_before_opening"
    - "single_use_container"
    - "preservative_free"
    - "avoid_cold_storage"
display:
  title: "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"
  subtitle: "アレルギー性結膜炎・目のかゆみに対する点眼治療"
  drugClassLabel: "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"
  drugGeneric: "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"
  nodeLabelShort: "H1点眼"
  nodeLabelLong: "ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"
  nodeKey: "h1_antihistamine_ophthalmic"
  menuGroupLabels:
    増量: "回数増"
    減量: "回数減"
  adjustmentExpression:
    increasePast: "点眼回数が増えた"
    decreasePast: "点眼回数が減った"
  # localInput: SCENARIOS本文の initial/restart/external_start が S に
  # {{applicationSite}} を含むため、旧chemical mediator点眼と同一構造で
  # 点眼部位入力UIを有効化する（値は旧chemical mediator点眼の稼働実績値を転用）。
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
# 本モジュールでは、これらのタグをSCENARIO/ADDONヘッダー行への個別インライン記載
# （｜scenarioRequiredTags=[...]｜。他モジュールでの例: dm_dpp4_oral）ではなく、
# 本Headerに正式な構造データ（id → tags のマップ）として定義し、canonical JSON生成時に
# 各scenario/addonのフィールドへ機械的に反映する正本とする。
# 記載のないscenario/addonは常時表示（タグ条件なし）とする。
# ─────────────────────────────────────────
scenarioRequiredTags:
  lifestyle_guidance_suspension_shake: ["suspension"]
  lifestyle_guidance_storage_upright_suspension: ["suspension"]
  lifestyle_guidance_storage_light_protection: ["light_protection"]
  lifestyle_guidance_storage_cold: ["cold_storage"]
  lifestyle_guidance_storage_cold_before_opening: ["cold_storage_before_opening"]
  # アレジオン／エピナスチン系に存在する、点眼回数を減らすための持続型製剤への
  # 切替選択肢を表すシナリオ（LX等の独立した検索候補・SOAP主語を示すものではない）。
  # reduced_frequency_optionを持つ製剤（アレジオン/エピナスチン）でのみ表示。
  # 切替時のみこのシナリオを使用し、切替後の継続・副作用・CP・終了等は
  # ベース薬剤（アレジオン／エピナスチン）の通常シナリオをそのまま使用する。
  switch_to_sustained_formulation_reduced_frequency: ["reduced_frequency_option"]
  # 通常の濃度増減4件。現行8製剤はいずれもconcentration_variantを持たないため非表示。
  strength_increase_low_perceived_effect: ["concentration_variant"]
  strength_increase_due_to_other_med_adjustment: ["concentration_variant"]
  strength_decrease_improved: ["concentration_variant"]
  strength_decrease_due_to_other_med_adjustment: ["concentration_variant"]
  # 刺激感等を理由とする濃度減。上記4件とは実務上の意味が異なるが、対象製剤未確定のため
  # 暫定的に同タグで非表示を維持（詳細はtemplate.handlingTagsのCHECKメモを参照）。
  se_strength_decreased_due_to_irritation: ["concentration_variant"]
addonRequiredTags:
  addon_eye_drop_suspension_shake: ["suspension"]
  addon_eye_drop_storage_upright_suspension: ["suspension"]
  addon_eye_drop_storage_light_protection: ["light_protection"]
  addon_eye_drop_storage_cold: ["cold_storage"]
  # 低温保存製品向けの「冷所から出した後の取り扱い」guidance。cold_storageで
  # ゲートされた製品にのみ表示すれば足り、独立タグは設けない（2026-09 Owner決定）。
  addon_eye_drop_warm_container_after_cold_storage: ["cold_storage"]
  addon_eye_drop_storage_cold_before_opening: ["cold_storage_before_opening"]
  # 「低温保存が必要」の否定ではなく独立した陽性タグ。2026-09 Owner決定。
  addon_eye_drop_avoid_cold_storage: ["avoid_cold_storage"]
  addon_eye_drop_single_dose_mini: ["single_use_container"]
  addon_eye_drop_preservative_free_pf: ["preservative_free"]
# 次の2件のADDONのみ、
# handlingTags・addonRequiredTags は設定せず、
# 全点眼薬で常時表示する。
# 対象:
# - addon_eye_drop_interval_after_suspension_5min
# - addon_eye_drop_interval_after_suspension_10min
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


【SCENARIO｜type=treatment_start｜id=initial｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 初回】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、{{applicationSite}}眼のかゆみが気になるため追加となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、アレルギー症状の改善を目的として追加となった。
ヒスタミンがH1受容体へ作用するのを抑制することで、充血・かゆみなどのアレルギー症状の改善を目的として使用する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、アレルギー症状を改善する薬です。
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




【SCENARIO｜type=treatment_start｜id=restart｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 再開】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、{{applicationSite}}眼のかゆみが気になるため再開となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、アレルギー症状の改善を目的として再開となった。
ヒスタミンがH1受容体へ作用するのを抑制することで、充血・かゆみなどのアレルギー症状の改善を目的として使用する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、アレルギー症状を改善する薬です。
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




【SCENARIO｜type=treatment_start｜id=external_start｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 他所開始】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、{{applicationSite}}眼のかゆみに対して他院で開始され継続使用中であった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、アレルギー症状の改善を目的として継続使用中であった。
ヒスタミンがH1受容体へ作用するのを抑制することで、充血・かゆみなどのアレルギー症状の改善を目的として使用する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、アレルギー症状を改善する薬です。
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




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_low_perceived_effect｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 回数増（効果実感乏しい）｜scenarioColor=blue】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果の実感が乏しいため点眼回数が増えた。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　点眼回数増
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果不十分のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_low_perceived_effect｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 濃度増（効果実感乏しい）｜scenarioColor=green】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果の実感が乏しいため、より効果が高いものへ変更となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　高濃度製剤へ変更
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果不十分のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_increase_due_to_other_med_adjustment｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 回数増（他剤との調整）｜scenarioColor=blue】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、他剤との調整により点眼回数が増えた。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　点眼回数増
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、併用薬との調整のため点眼回数が増えた。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_increase_due_to_other_med_adjustment｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 濃度増（他剤との調整）｜scenarioColor=green】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、他剤との調整により、より効果が高いものへ変更となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　高濃度製剤へ変更
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、併用薬との調整のため、高濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_improved｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 回数減（症状改善）｜scenarioColor=blue】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状が改善したため点眼回数が減った。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　点眼回数減
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状改善を踏まえ点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_improved｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 濃度減（症状改善）｜scenarioColor=green】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状が改善したため、より効果が穏やかなものへ変更となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　低濃度製剤へ変更
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状改善を踏まえ、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_low_perceived_effect｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 回数減（効果実感乏しい）｜scenarioColor=blue】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果の実感が乏しく使用継続に不安があるため、点眼回数を減らして継続することとなった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　点眼回数減
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果実感の乏しさと使用継続への不安を踏まえ、点眼回数を減らして治療継続となった。
点眼回数変更後は、症状や使用状況について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、変更された点眼回数で継続してください。
症状や使用感に変化がある場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=frequency_decrease_due_to_other_med_adjustment｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 回数減（他剤との調整）｜scenarioColor=blue】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、他剤との調整により点眼回数が減った。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　点眼回数減
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、併用薬との調整のため点眼回数が減った。
点眼回数の変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、点眼回数の変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=strength_decrease_due_to_other_med_adjustment｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 濃度減（他剤との調整）｜scenarioColor=green】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、他剤との調整により、より効果が穏やかなものへ変更となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　低濃度製剤へ変更
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、併用薬との調整のため、低濃度製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_adjustment｜id=switch_to_sustained_formulation_reduced_frequency｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 持続型製剤へ変更（点眼回数減）｜scenarioColor=orange】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、点眼回数を減らすために変更となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　持続型製剤へ変更
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、点眼回数を減らすため、持続型製剤へ変更となった。
製剤変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、製剤変更後、気になる症状や使用感の変化がありましたらご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_irritation_none｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 副作用なし（刺激感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬を使用して症状は落ち着いている。
刺激感は認めない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による刺激感は現時点で認められず、治療継続が可能である。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の継続中に刺激感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_foreign_body_sensation_none｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 副作用なし（異物感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬を使用して症状は落ち着いている。
異物感は認めない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による異物感は現時点で認められず、治療継続が可能である。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の継続中に異物感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_pruritus_none｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 副作用なし（掻痒感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬を使用して症状は落ち着いている。
掻痒感は認めない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による掻痒感は現時点で認められず、治療継続が可能である。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の継続中に掻痒感が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_redness_none｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 副作用なし（充血）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬を使用して症状は落ち着いている。
充血は認めない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による充血は現時点で認められず、治療継続が可能である。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の継続中に充血が出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_eye_discharge_none｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 副作用なし（目やに）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬を使用して症状は落ち着いている。
目やには認めない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による目やには現時点で認められず、治療継続が可能である。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の継続中に目やにが出ることがあります。
症状が続く場合はご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_good｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 CP良好】
S
薬を使用して症状は落ち着いている。
使用忘れなく継続できている。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　使用中
A
コンプライアンスは良好で、治療継続に問題はない。
P
引き続き用法を守って使用することで、治療効果の維持が期待されます。
今後も継続して使用できるようにすることが大切です。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 CP不良（使用忘れ）】
S
使用を忘れることがある。
症状は大きく変わっていない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　使用中
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




【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 CP不良（自己判断）】
S
自己判断で使用を調整することがある。
症状は大きく変わっていない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　使用中
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




【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 CP不良（受診遅延）】
S
受診が遅れ、使用を調整することがある。
症状は大きく変わっていない。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　使用中
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




【SCENARIO｜type=usage｜id=as_needed_refill_needed｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 頓用使用（処方あり）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状が出た時に使用している。
使用により残薬が少なくなったため、継続処方となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状出現時に使用されており、残薬状況を踏まえ継続処方となった。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状が出た時に、指示された用法に従って使用してください。
使用頻度が増えている場合や、症状が続く場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=usage｜id=as_needed_refill_not_needed｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 頓用使用（処方なし）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状が出た時に使用している。
残薬があるため、今回は処方なしとなった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　使用中
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状出現時に使用されており、残薬があるため今回は処方なしとなった。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状が出た時に、指示された用法に従って使用してください。
症状が続く場合や、使用頻度が増える場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_improved｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 終了（改善）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状が改善したため中止となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方終了
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、症状改善により終了となった。
終了後に症状が悪化する可能性があるため、注意が必要である。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 終了（効果不十分）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果不十分のため中止となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方終了
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果不十分のため終了となった。
終了後は、目の症状の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 終了（無効）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果が認められなかったため中止となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方終了
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬は、効果が認められなかったため終了となった。
終了後は、目の症状の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の終了後、目の症状の変化がある場合はご相談ください。
P_ADDON
- addon_eye_drop_after_opening_expiry
P_CLOSING
次回、治療経過および体調変化の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_mild_continue｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 SE継続（軽症 刺激感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用により刺激感があるが、日常生活は送れている。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による刺激感を軽度認めるが、治療継続が可能である。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による刺激感が軽い場合は、そのまま経過をみてください。
刺激感が続く場合や強くなる場合は、ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_ocular_irritation_moderate_consider_dr｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 SE継続（中等度 刺激感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用により刺激感が強く、辛いことがあるが、日常生活は送れている。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による刺激感が強く、継続困難の可能性があるため対応を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬による刺激感が続く場合や強くなる場合は、使用回数の調整や薬剤の変更が必要になることがあります。
症状が続く場合は、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_change_due_to_irritation｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 SE変更（刺激感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用により刺激感が出現したため、他剤へ変更となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方変更
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用による刺激感を認め、他剤変更後の経過確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の変更後、目の症状の悪化や変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_frequency_reduced_due_to_irritation｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 SE回数減（刺激感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用により刺激感が強いため、点眼回数が減った。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　点眼回数減
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用による刺激感を認め、点眼回数変更後の経過確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の点眼回数が減った後も刺激感が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_strength_decreased_due_to_irritation｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 SE濃度減（刺激感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用により刺激感が強かったため、効果が穏やかなものになった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　低濃度製剤へ変更
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用による刺激感を認め、低濃度製剤へ変更となった。
低濃度製剤へ変更後は、症状や使用感の変化について確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬を低濃度製剤へ変更後も、刺激感が続く場合や、気になる症状、使用感の変化がありましたらご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。




【SCENARIO｜type=side_effect｜id=se_stop_due_to_irritation｜title=ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬 SE中止（刺激感）】
S
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用により刺激感が強いため、中止となった。
O
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬　処方中止
A
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の使用による刺激感を認め、中止後の経過確認を要する。
P
ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬の中止後、目の症状の悪化や変化があればご相談ください。
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
