SOAPエンジン P0-A 仕様書

Model JSON 基準構造定義
{
  "id": "SOAP_ENGINE_P0_A",
  "name": "Model JSON 基準構造定義",
  "phase": "P0-A",
  "role": "latest_model_jsonを基準として構造・型・参照パスを定義し、target_bridge_sourceを基準としてpreservation対象を抽出する工程",
  "execution_context": {
  "usage": "以下のJSONは、SOAPエンジン P0-A の実行仕様である。この仕様に従い、別途入力される latest_model_json と target_bridge_source を読み取り、[P0A_MODEL_STRUCTURE_RULE] を出力する。",
  "latest_model_json_definition": "latest_model_json は、構造・型・参照パス・必須/任意/禁止keyを定義するためのModel JSON本体である。",
  "target_bridge_source_definition": "target_bridge_source は、今回生成するmoduleのpreservation正本である。scenario数、addon数、本文、P_APPEND、P_CLOSING、alias、brand、search token、参照関係を抽出するために使用する。",
  "existing_reference_json_definition": "existing_reference_json は、既存canonical JSONまたは既存基準JSONを比較補助として参照する任意入力である。Model JSONに存在しない構造を固定値化するためには使用しない。",
  "previous_diff_memo_definition": "previous_diff_memo は、過去差分の確認補助としてのみ使用する。反映可否はP0-Aでは確定しない。"
},
  "missing_input_policy": [
  "latest_model_json が提示されていない場合は、reason: latest_model_json_missing として停止する",
  "target_bridge_source が提示されていない場合は、reason: target_bridge_source_missing として停止する",
  "latest_model_json または target_bridge_source のいずれかが欠落している場合は、P0-Aを実行しない",
  "existing_reference_json のみが提示されている場合は停止する",
  "existing_reference_json を latest_model_json として自動昇格してはいけない",
  "existing_reference_json を target_bridge_source として自動昇格してはいけない",
  "latest_model_json と target_bridge_source の識別が曖昧な場合は、reason: input_identity_unclear として停止する"
],
  "essence": {
  "is_not": [
    "JSON修正",
    "本文改善",
    "医学的監査",
    "アプリ整合監査",
    "差分修正工程",
    "deterministic fix生成工程"
  ],
  "is": "latest_model_jsonから構造基準を抽出し、target_bridge_sourceからpreservation対象を抽出して、P1以降で参照するshared foundationを定義する作業"
},
  "inputs": [
  {
    "name": "latest_model_json",
    "required": true,
    "usage": "構造・型・参照パスの基準"
  },
  {
    "name": "target_bridge_source",
    "required": true,
    "usage": "今回生成するmoduleのpreservation正本"
  },
  {
    "name": "existing_reference_json",
    "required": false,
    "usage": "比較補助のみ。latest_model_jsonやtarget_bridge_sourceの代替にしない"
  },
  {
    "name": "previous_diff_memo",
    "required": false,
    "usage": "反映要否の確認補助のみ"
  }
],
  "output_block": "P0A_MODEL_STRUCTURE_RULE",
  "output_sections": [
  "ROOT_REQUIRED_KEYS",
  "ROOT_OPTIONAL_KEYS",
  "REQUIRED_OPTIONAL_PROHIBITED_CHECK_CLASSIFICATION",
  "TYPE_RULES",
  "CORE_OBJECT_RULES",
  "SCENARIO_REQUIRED_RULES",
  "ADDON_REQUIRED_RULES",
  "REFERENCE_RULES",
  "FOLLOWUP_RULES",
  "PERSONA_EXTENSION_SPACE",
  "THIRD_PANEL_EXPRESS_RULES",
  "RESOLVED_RUNTIME_CANDIDATE_PATHS",
  "CANDIDATE_PATHS_AND_EXTRACTION_PATHS",
  "PRESERVATION_RELEVANT_FIELDS",
  "STRUCTURAL_VALIDATION_HANDOFF",
  "OUTPUT_REQUIREMENTS",
  "PROHIBITED_INFERENCE",
  "CHECK_ITEMS",
  "MODEL_JSON_ONLY_RULE"
],
  "core_paths_to_extract": [
    "$.composition",
    "$.drug",
    "$.drug.brandCatalog",
    "$.drug.aliasToBrand",
    "$.drug.search",
    "$.template",
    "$.risks",
    "$.searchConfig",
    "$.index",
    "$.display",
    "$.defaults",
    "$.ui",
    "$.persona",
    "$.tagCatalog",
    "$.addons",
    "$.scenarios",
    "$.expressModes"
  ],
  "candidate_paths_to_extract": [
  "$.addons.items",
  "$.scenarios[].SStructured",
  "$.scenarios[].OStructured",
  "$.scenarios[].AStructured",
  "$.scenarios[].PStructured"
],
  "resolved_runtime_candidate_paths": {
    "P_APPEND": "$.addons.items[key].text",
    "P_CLOSING": "$.defaults.followupProfiles[key].P",
    "P_ADDON_REFERENCE": "$.scenarios[].addonsRef.P[]"
  },
  "scenario_paths_to_extract": [
    "$.scenarios[].id",
    "$.scenarios[].globalId",
    "$.scenarios[].title",
    "$.scenarios[].scenarioType",
    "$.scenarios[].scenarioGroup",
    "$.scenarios[].scenarioTags",
    "$.scenarios[].S",
    "$.scenarios[].O",
    "$.scenarios[].A",
    "$.scenarios[].P",
    "$.scenarios[].followupRef",
    "$.scenarios[].addonsRef",
    "$.scenarios[].mergePolicy",
    "$.scenarios[].intentTags",
    "$.scenarios[].clinicalTags",
    "$.scenarios[].counselingTags",
    "$.scenarios[].workflowTags"
  ],
  "addon_paths_to_extract": [
    "$.addons.items[key].key",
    "$.addons.items[key].id",
    "$.addons.items[key].title",
    "$.addons.items[key].group",
    "$.addons.items[key].targetSection",
    "$.addons.items[key].text",
    "$.addons.items[key].intentTags",
    "$.addons.items[key].requiredTags",
    "$.addons.orderPresets"
  ],
  "path_resolution_policy": [
  "$.addons.items をaddon構造の正式候補として確認する",
  "$.addons.items が latest_model_json 上に存在する場合は、addon本文・identity・参照元を保持できる正式構造として扱う",
  "$.addons.items が latest_model_json 上に存在しない場合は、推測追加せず、非存在確認済み候補として扱い、固定構造としては出力しない。存在有無が判断不能な場合のみCHECK_ITEMSへ送る",
  "P_APPEND / P_CLOSING / P_ADDON参照は、runtime合成上の既知候補パスとして resolved_runtime_candidate_paths に記録する",
  "ただし、P0-Aで構造基準として固定できるのは、latest_model_json 上に実在確認できたパスのみとする",
  "latest_model_json 上に該当パスが存在しない場合は、正式構造として固定せず、CANDIDATE_PATHS_AND_EXTRACTION_PATHS に「非存在・固定構造化禁止」として記録する",
  "存在有無が判断不能な場合のみ CHECK_ITEMS へ送る",
  "SStructured / OStructured / AStructured / PStructured は candidate_paths_to_extract として存在確認のみ行い、latest_model_json 上に存在する場合のみ SCENARIO_REQUIRED_RULES / CORE_OBJECT_RULES に反映する",
  "SStructured / OStructured / AStructured / PStructured が Model JSON 上に存在しない場合は推測追加しない",
  "candidate_paths_to_extract は正式パスではなく、Model JSON上で存在確認する候補パスとして扱う。addon_paths_to_extract は $.addons.items が存在確認された場合に抽出対象とするaddon構造パスとして扱う"
],
  "preservation_relevant_fields": {
  "count": [
    "scenario_count",
    "addon_count",
    "brandCatalog_count",
    "alias_count",
    "followup_count"
  ],
  "scenario_identity_paths": [
    "$.scenarios[].id",
    "$.scenarios[].title",
    "$.scenarios[].globalId"
  ],
  "addon_identity_paths": [
    "$.addons.items[key].key",
    "$.addons.items[key].id",
    "$.addons.items[key].title"
  ],
  "brand_alias": [
    "$.drug.brandCatalog",
    "$.drug.brandCatalog[brand].aliases",
    "$.drug.brandCatalog[brand].normalizedAliases",
    "$.drug.aliasToBrand",
    "$.drug.search.exactAliases",
    "$.drug.search.prefixAliases",
    "$.drug.search.nameAliases",
    "$.drug.nameAliases"
  ],
  "search_token": [
    "$.drug.search.commonSearchTokens",
    "$.drug.search.formulationSearchTokens",
    "$.drug.search.matchPolicy.allowMultiTokenAndMatch",
    "$.drug.search.matchPolicy.allowFormulationTokenMatch"
  ],
  "nameAliases_sync_rule": "$.drug.nameAliases は $.drug.search.nameAliases と順序・表記・エントリ数で完全一致させる。$.drug.search.nameAliases 確定後に複写生成する。独立生成・alias補完・推測生成は禁止",
  "search_token_alias_prohibition": "commonSearchTokens / formulationSearchTokens は alias ではない。aliases / normalizedAliases / aliasToBrand / search alias系fieldへ展開してはならない。brand identity / alias identity として扱わない",
  "text": [
    "$.scenarios[].S",
    "$.scenarios[].O",
    "$.scenarios[].A",
    "$.scenarios[].P",
    "$.addons.items[key].text"
  ],
  "followup": [
    "$.defaults.followup",
    "$.defaults.followupProfiles",
    "$.defaults.followupProfiles[key].P",
    "$.scenarios[].followupRef"
  ],
  "reference": [
    "$.scenarios[].addonsRef",
    "$.scenarios[].addonsRef.P[]"
  ]
},
  "structural_validation_handoff": [
    "root_required_keys",
    "type_integrity",
    "reference_integrity",
    "groupKeyRegistry_integrity",
    "tagCatalog_integrity",
    "scenario_identity",
    "addon_identity",
    "followupRef_integrity",
    "expressModes_full_field_reference_integrity",
    "brandCatalog_reference_integrity",
    "Structured_sync_targets",
    "addons_orderPresets_type_integrity",
    "drug_nameAliases_sync_integrity",
    "search_token_alias_expansion_check"
  ],
  "prohibited_inference": [
    "Model JSONに存在しないkeyを推測追加しない",
    "既存JSONから固定値を推測しない",
    "target_bridge_sourceから構造基準・型定義・未明示keyを生成しない。ただし、本文・P_APPEND・P_CLOSING・alias・brand・search token・参照関係などのpreservation対象はtarget_bridge_sourceから抽出する",
    "医学的意味からtag/groupKeyを生成しない",
    "薬剤名からaliasを推定生成しない",
    "検索性向上目的でsearch aliasを補完しない",
    "persona用の文体を推測生成しない",
    "Express Mode用の参照を推測生成しない",
    "P_APPEND / P_CLOSING / P_ADDON参照は、resolved_runtime_candidate_paths に記録された既知候補パス以外を推測生成しない。構造基準として固定できるのは latest_model_json 上で実在確認できたパスのみとする",
    "addons構造は latest_model_json 上の実在パスを優先し、存在しない構造を推測追加しない",
    "commonSearchTokens / formulationSearchTokens を aliases / normalizedAliases / aliasToBrand / search alias系fieldへ展開しない",
    "commonSearchTokens / formulationSearchTokens を brand identity / alias identity として扱わない",
    "bridge未明示のsearch tokenを推測生成しない",
    "addons.orderPresets の preset key を bridge に明示なく推測生成しない"
  ],
  "check_item_policy": [
  "一意決定できない項目はCHECK_ITEMSへ送る",
  "設計判断が必要な項目はCHECK_ITEMSへ送る",
  "型が一意に決まらない項目はCHECK_ITEMSへ送る",
  "参照元または参照先が一意に決まらない項目はCHECK_ITEMSへ送る",
  "latest_model_json 上では判断できず、app実装側の受け口確認が必要と思われる項目は、P0-Aの構造基準として固定せずCHECK_ITEMSへ送る",
  "existing_reference_jsonとの差分として存在するがModel JSON基準へ反映すべきか判断できない項目はCHECK_ITEMSへ送る",
  "SStructured / OStructured / AStructured / PStructured が latest_model_json 上に存在する場合のみStructured対象として扱う。存在しない場合は推測追加せず、非存在確認済み候補として扱い、固定構造としては出力しない。存在有無が判断不能な場合のみCHECK_ITEMSへ送る"
],
  "model_json_only_rule": [
  "P0-Aでは、構造基準・型定義・参照パス・必須/任意/禁止keyは latest_model_json に明示された構造のみを基準化する",
  "PRESERVATION_RELEVANT_FIELDS は target_bridge_source から抽出する",
  "latest_model_json と target_bridge_source の役割を混同してはならない",
  "target_bridge_source は構造基準の生成には使用しない",
  "latest_model_json は本文・alias・brand・search token等のpreservation正本として使用しない",
  "existing_reference_jsonはlatest_model_jsonまたはtarget_bridge_sourceの代替として扱わない",
  "existing_reference_json にModel JSONらしい構造が含まれていても、latest_model_json として自動昇格しない",
  "Model JSONに存在しない構造は、推測追加せず、必要に応じて非存在確認済み候補として記録する。存在有無が判断不能な場合のみCHECK_ITEMSへ送る"
],
  "prohibited_actions": [
    "対象JSONを修正する",
    "bridge本文を改善・医学監査・自然化する",
    "医学的妥当性を評価する",
    "アプリ実装を推測する",
    "新規keyを提案する",
    "既存値を固定値として誤流用する",
    "aliasを推定生成する",
    "search aliasを補完する",
    "persona本文を作成する",
    "Express Mode参照を推測生成する",
    "P_APPEND / P_CLOSING / P_ADDON参照について、resolved_runtime_candidate_paths に記録された既知候補パス以外を推測生成する",
    "latest_model_json 上に存在しないaddon構造を推測追加する",
    "差分修正指示を作る",
    "deterministic fixを作る",
    "P2/P3の監査を先取りする"
  ],
  "final_instruction": "latest_model_json と target_bridge_source を読む。latest_model_json が提示されていない場合は、reason: latest_model_json_missing として停止する。target_bridge_source が提示されていない場合は、reason: target_bridge_source_missing として停止する。latest_model_json と target_bridge_source の識別が曖昧な場合は、reason: input_identity_unclear として停止する。existing_reference_json にModel JSONらしい構造が含まれていても、latest_model_json として代替処理してはならない。existing_reference_json を target_bridge_source として代替処理してはならない。入力ラベルが逆転している可能性があっても、自動補正・自動昇格・推測処理を行ってはならない。latest_model_json から構造基準を定義し、target_bridge_source から preservation 対象を抽出する。JSON修正・本文改善・医学監査・補完・推測を行ってはならない。必須 / 任意 / 禁止 / CHECK を分けろ。型定義と参照整合を明示しろ。可能な限りJSONパスで出力しろ。P_APPEND / P_CLOSING / P_ADDON参照は、resolved_runtime_candidate_paths に記録された runtime合成上の既知候補パスとして扱う。ただし、P0-Aで構造基準として固定できるのは latest_model_json 上に実在確認できたパスのみとする。candidate_paths_to_extract は正式パスではなく存在確認候補として扱え。addon_paths_to_extract は $.addons.items が存在確認された場合の抽出対象パスとして扱え。Model JSONに存在しない構造は推測追加せず、非存在確認済み候補として扱い、存在有無が判断不能な場合のみCHECK_ITEMSへ送れ。P1以降が迷わない shared foundation を作れ。"
}   入力  1. 最新Model JSON
    → 構造・型・参照パスの基準
2. 今回作るbridge原稿
    → scenario数、addon数、本文、alias、brand、search token の正本

SOAPエンジン P0-A

Model JSON 基準構造定義
■ 役割
これは、latest_model_jsonを基準として構造・型・参照パスを定義し、
target_bridge_sourceを基準としてpreservation対象を抽出する工程である。

以後のP1/P2/P3/P4/P5で参照する
shared foundationを作成する。

■ 本質
これはJSON修正ではない。
これは本文監査ではない。
これはアプリ整合監査ではない。
これは差分修正工程ではない。
これはdeterministic fix生成工程ではない。
「latest_model_jsonから構造基準を抽出し、
target_bridge_sourceからpreservation対象を抽出して、
P1以降で参照するshared foundationを定義する作業」である。
■ 入力
1. latest_model_json
※必須入力。
※構造基準 authoritative schema seed として扱う。
※構造・型・参照パス・必須/任意/禁止keyの基準である。
※本文・alias・brand・search token等のpreservation正本としては扱わない。

2. target_bridge_source
※必須入力。
※今回生成するmoduleのpreservation正本。
※scenario数、addon数、本文、P_APPEND、P_CLOSING、
alias、brand、search token、参照関係を抽出するために使用する。
※構造基準・型定義・未明示keyの生成には使用しない。

3. existing_reference_json
※任意入力。
※既存canonical JSONまたは既存基準JSONを比較補助として参照するためのもの。
※latest_model_json または target_bridge_source の代替として扱わない。

4. previous_diff_memo
※任意入力。
※過去差分の確認補助としてのみ使用する。
※反映可否はP0-Aでは確定しない。
※P0-Aでは差分修正指示を作成しない。

■ 入力不足時の停止条件
latest_model_json が提示されていない場合は、P0-Aを実行しない。
その場合は reason: latest_model_json_missing として停止する。

target_bridge_source が提示されていない場合は、P0-Aを実行しない。
その場合は reason: target_bridge_source_missing として停止する。

latest_model_json と target_bridge_source の区別が不明な場合は、
CHECK_ITEMSに送らず、reason: input_identity_unclear として停止する。

existing_reference_json のみが提示されている場合は、
reason: latest_model_json_missing として停止する。

existing_reference_json を latest_model_json または target_bridge_source として
自動昇格してはならない。

■ 出力
[P0A_MODEL_STRUCTURE_RULE]
1. ROOT_REQUIRED_KEYS
- 必須root key一覧
- 可能な限りJSONパスで記載する
2. ROOT_OPTIONAL_KEYS
- 任意root key一覧
- 可能な限りJSONパスで記載する
- latest_model_json 上に任意root keyが確認できない場合は「該当なし」と出力する
- ROOT_REQUIRED_KEYSに列挙したkeyをROOT_OPTIONAL_KEYSへ重複出力しない
- 必須/任意が判断不能なroot keyは、ROOT_OPTIONAL_KEYSではなくCHECK_ITEMSへ送る
※ root keyはすべて latest_model_json 上に実在する。
※ P0-Aでは、latest_model_json 上に実在するroot keyを基準root keyとして列挙する。
※ 他モジュールでの省略可否が判断不能なroot keyは、必要に応じてCHECK_ITEMSへ送る。
※ 任意root keyは、latest_model_json 上で明示的に確認できる場合のみ列挙する。
3. REQUIRED / OPTIONAL / PROHIBITED / CHECK_CLASSIFICATION
- 必須項目
- 任意項目
- 禁止項目
- CHECK対象項目
4. TYPE_RULES
- string
- number
- boolean
- array
- object
- null許容 / 非許容
- 空配列許容 / 非許容
- 空object許容 / 非許容
※同一JSONパスを複数の型に重複分類しない。
※型が揺れる場合は、推測で確定せずCHECK_ITEMSへ送る。
※Structured系フィールドが latest_model_json 上に存在する場合のみ、Structured[].id はModel JSON上の実在形式に従う。
※Structured系フィールドが存在しない場合は推測追加せず、非存在確認済み候補として扱う。
※$.addons.orderPresets の型は object。空 {} を許容。array / null / string は禁止。

5. CORE_OBJECT_RULES
- composition
- drug
- drug.brandCatalog
- drug.aliasToBrand
- drug.search
- template
- risks
- searchConfig
- index
- display
- defaults
- ui
- persona
- tagCatalog
- addons
- scenarios
- expressModes
※search系・alias系は、Model JSON上の正式なJSONパスを優先して記載する。
※aliases / normalizedAliases が
drug配下・brandCatalog配下・search配下・root配下などに存在する場合は、
Model JSON準拠の正確なJSONパスを明示する。
※search alias系が
searchConfig配下・drug.search配下・root search配下などに存在する場合は、
Model JSON準拠の正確なパスを明示する。
※Model JSONに存在しないalias系keyは推測追加しない。
※$.addons.orderPresets は addons.items が存在する場合は必須。型: object（空 {} 許容）。array / null / string 禁止。詳細は ADDON_REQUIRED_RULES を参照。
6. SCENARIO_REQUIRED_RULES
- scenario必須key
- scenario id規則
- globalId規則
- title規則
- scenarioType
- scenarioGroup
- scenarioTags
- S/O/A/P必須
- followupRef
- addonsRef
- mergePolicy
- Structured
- intentTags / clinicalTags / counselingTags / workflowTags
7. ADDON_REQUIRED_RULES
- addons.items必須key
- key / id / title / group / targetSection
- text
- intentTags
- requiredTags
- addon参照規則
addons.orderPresets:
- 格納先: $.addons.orderPresets
- addons.items が存在する場合、addons.orderPresets は必須
- 型: object（未使用時は {} を許容）
- array / null / string は禁止
- キーを omit してはならない
- preset key → addon key[] の対応は bridge に明示がある場合のみ生成
- bridge 未明示の preset key を推測生成しない
※addon構造は latest_model_json 上の実在パスを優先する。
※$.addons.items が存在する場合は、addon本文・identity・参照元を保持できる正式構造として扱う。
※$.addons.items が存在しない場合はCHECK_ITEMSへ送る。
※latest_model_json 上に存在しないaddon構造を推測追加しない。
8. REFERENCE_RULES
- scenario id参照
- globalId参照
- addon参照
- followupRef参照
- groupKey参照
- tagCatalog参照
- expressModes参照
- brandCatalog参照
- aliasToBrand参照
- search alias参照
※参照元 / 参照先を分けて記載する。
※参照先がModel JSONから一意に判断できない場合はCHECK_ITEMSへ送る。
9. FOLLOWUP_RULES
- defaults.followup
- defaults.followupProfiles
- scenarios[].followupRef
- P_CLOSING格納先
- P本文へのfollowup直書き禁止
- followup文がpreservation対象かどうか
- followup文の格納先JSONパス
- followup文の参照元 / 参照先
10. PERSONA_EXTENSION_SPACE
- persona関連keyの構造
- availableStylesの型
- styleProfilesの型
- persona標準値
- 将来persona scaling用の構造余白
※P0-Aではpersona本文を設計しない。
※P0-Aではpersona文体を生成しない。
※P0-Aではbaseline personaを変換しない。
※personaは構造余白としてのみ定義する。
11. THIRD_PANEL / EXPRESS_RULES
- thirdPanelSPlacement
- expressModes[]
必須フィールド:
- enabled
- expressCategory
- expressGroup
- expressSubGroup
- label
任意フィールド:
- defaultScenarioId
- defaultBrandName
- sortOrder
- disabled
- disabledReason
- genericDisplayName
- genericBrandName
- scenarioCandidates
参照制約:
- defaultBrandName は $.drug.brandCatalog[brand] に存在する場合のみ有効
- defaultScenarioId は $.scenarios[].id に存在する場合のみ有効
- scenarioCandidates[] の各値は $.scenarios[].id に存在する値のみ許容
- genericBrandName の参照先はCHECK_ITEMSへ送る
- expressCategory / expressGroup / expressSubGroup の具体値はモジュール固有値。P0-Aでは固定しない
12. RESOLVED_RUNTIME_PATHS
runtime合成上の既知パスを明示する。
- P_APPEND: $.addons.items[key].text
- P_CLOSING: $.defaults.followupProfiles[key].P
- P_ADDON_REFERENCE: $.scenarios[].addonsRef.P[]
※P_APPEND / P_CLOSING / P_ADDON参照は、resolved_runtime_paths に定義された runtime合成上の既知パスを基準として扱う。
※resolved_runtime_paths に定義された runtime合成上の既知パス以外を推測生成しない。
※ resolved_runtime_paths は、runtime合成上の既知パスとして扱う。
※ ただし、latest_model_json 上に該当パスが存在しない場合は、構造基準として固定せず、CANDIDATE_PATHS / EXTRACTION_PATHS または CHECK_ITEMS に記録する。
※ resolved_runtime_paths は、Model JSON外の新規構造を生成する根拠にしない。
13. CANDIDATE_PATHS_AND_EXTRACTION_PATHS
- candidate_paths_to_extract
- addon_paths_to_extract
- 存在確認候補パス
- 存在確認後の抽出対象パス
candidate_paths_to_extract は正式パスではなく、Model JSON上で存在確認する候補パスとして扱う。
候補例：
- $.addons.items
- $.scenarios[].OStructured
addon_paths_to_extract は、$.addons.items が存在確認された場合の抽出対象パスとして扱う。
※candidate_paths_to_extract は、存在確認用の候補であり、存在しない構造を推測追加する根拠にしない。
※addon_paths_to_extract は、$.addons.items が存在する場合のみ抽出対象として扱う。
※ candidate_paths_to_extract に存在確認結果として「存在しない」と出力したパスは、REQUIRED / OPTIONAL / TYPE_RULES / CORE_OBJECT_RULES / SCENARIO_REQUIRED_RULES の固定構造へ転記しない。
14. PRESERVATION_RELEVANT_FIELDS
P2 preservation firewall に影響する項目を定義する。
Count:
- scenario件数
- addon件数
- brandCatalog件数
- alias件数
- followup件数
Identity:
- scenario id
- scenario title
- addon key / id / title
Brand / Alias:
- brandCatalog
- aliases
- normalizedAliases
- aliasToBrand
- search.exactAliases
- search.prefixAliases
- search.nameAliases
- $.drug.nameAliases
- alias系pathは、Model JSON上に存在する正式pathのみを対象とする
drug.nameAliases 完全一致ルール:
- $.drug.nameAliases は $.drug.search.nameAliases と完全一致させる（順序・表記・エントリ数）
- $.drug.search.nameAliases 確定後に $.drug.nameAliases を生成する
- $.drug.nameAliases を独立生成してはならない
- alias補完・推測によって $.drug.nameAliases を生成してはならない
Search Token:
- $.drug.search.commonSearchTokens
- $.drug.search.formulationSearchTokens
- $.drug.search.matchPolicy.allowMultiTokenAndMatch
- $.drug.search.matchPolicy.allowFormulationTokenMatch
- commonSearchTokens / formulationSearchTokens は alias ではない
- aliases / normalizedAliases / aliasToBrand / search.exactAliases / search.prefixAliases / search.nameAliases へ展開してはならない
- brand identity / alias identity として扱ってはならない
- bridge未明示のsearch tokenを生成しない
- 検索性向上目的でsearch tokenを追加しない
Text:
- S
- O
- A
- P
- P_APPEND
- P_CLOSING（= $.defaults.followupProfiles[key].P）
Followup:
- defaults.followup
- defaults.followupProfiles
- followupRef
Reference:
- addon参照
- P_ADDON参照
- addonsRef
15. STRUCTURAL_VALIDATION_HANDOFF
P3 structural validation に渡す項目を定義する。
- root必須key
- 型整合
- 参照整合
- groupKeyRegistry整合
- tagCatalog整合
- scenario / addon identity
- followupRef整合
- expressModes参照整合（defaultBrandName / defaultScenarioId / scenarioCandidates 参照先存在確認を含む）
- brandCatalog参照整合
- Structured同期対象
- addons.orderPresets 型整合（object必須・array/null/string禁止）
- $.drug.nameAliases と $.drug.search.nameAliases の完全一致確認（順序・表記・エントリ数）
- commonSearchTokens / formulationSearchTokens のalias系未展開確認
16. OUTPUT_REQUIREMENTS
P0-A出力では以下を守る。
- 各項目は可能な限りJSONパスで記載する
- 必須 / 任意 / 禁止 / CHECK を明示する
- 型を明示する
- 参照元 / 参照先を明示する
- P2へ渡す項目とP3へ渡す項目を分ける
- 判断不能なものはCHECK_ITEMSへ送る
- Model JSONに存在する構造と、既存基準JSON由来の参考情報を混同しない
- 既存基準JSONに存在するだけの値を固定値として扱わない
- count系項目は、実体の列挙件数と一致していることを確認する
- scenario件数 / addon件数 / brandCatalog件数 / alias件数 / followup件数は、列挙内容と不一致がある場合CHECK_ITEMSへ送る
- 件数表記と列挙数が一致した場合は「COUNT CONFIRMED」と明示する
- 件数表記と列挙数が一致している項目を「COUNT CHECK」として残さない
- 「本JSON、5件」などの件数表記は、直後の列挙数と一致していることを必ず確認する
- 「latest_model_json上に存在する」ことと「全モジュール共通で必須である」ことを混同しない
- P0-Aの必須判定は、latest_model_jsonを基準とした必須構造として扱う
17. PROHIBITED_INFERENCE
- Model JSONに存在しないkeyを推測追加しない
- 既存JSONから固定値を推測しない
- target_bridge_sourceから構造基準・型定義・未明示keyを生成しない。
  ただし、scenario数、addon数、本文、P_APPEND、P_CLOSING、
  alias、brand、search token、参照関係などの
  preservation対象は target_bridge_source から抽出する。
- 医学的意味からtag/groupKeyを生成しない
- 薬剤名からaliasを推定生成しない
- 検索性向上目的でsearch aliasを補完しない
- persona用の文体を推測生成しない
- Express Mode用の参照を推測生成しない
- P_APPEND / P_CLOSING / P_ADDON参照は resolved_runtime_paths に定義された runtime合成上の既知パス以外を生成しない
- addons構造は latest_model_json 上の実在パスを優先し、存在しない構造を推測追加しない
- commonSearchTokens / formulationSearchTokens を aliases / normalizedAliases / aliasToBrand / search.exactAliases / search.prefixAliases / search.nameAliases へ展開しない
- commonSearchTokens / formulationSearchTokens を brand identity / alias identity として扱わない
- bridge未明示のsearch tokenを推測生成しない
- addons.orderPresets の preset key を bridge に明示なく推測生成しない
18. CHECK_ITEMS
- 一意決定できない項目
- 設計判断が必要な項目
- 将来拡張に関わる項目
- Model JSON上で任意か必須か判断できない項目
- 型が一意に決まらない項目
- 参照元 / 参照先が一意に決まらない項目
- app実装側の受け口確認が必要な項目
- 既存基準JSONとの差分として存在するが、Model JSON基準へ反映すべきか判断できない項目
- candidate_paths_to_extract として確認した結果、latest_model_json 上で存在有無が判断不能な場合
- candidate_paths_to_extract に含まれる候補パスを、存在確認前または非存在確認後に固定構造として出力してしまう可能性がある項目
- count値と実体列挙数が一致しない項目
- 実在key一覧と出力上の列挙内容が一致しない項目
- thirdPanelSPlacementなど、一部scenarioにのみ存在するkeyの対象範囲が列挙と一致しない項目
※ count値と実体列挙数が一致した場合は CHECK_ITEMS に未解決項目として残さない。
※ 一度不一致として検出したが再カウントで一致確認できた場合は、CHECK_ITEMS上で CLOSED と明示する。
※ CLOSED項目は、P1/P2/P3へ未解決CHECKとして引き継がない。
※ latest_model_json 上で「存在しない」と確認できた候補パスは、CHECK_ITEMSへ未解決項目として残さず、「非存在・固定構造化禁止」として CANDIDATE_PATHS / EXTRACTION_PATHS に記録する。
19. MODEL_JSON_ONLY_RULE
- P0-AではModel JSONに明示された構造のみを基準化する
- 既存基準JSONは比較補助としてのみ扱う
- target_bridge_source は構造値生成には使用しない。
- ただし、preservation対象である本文・P_APPEND・P_CLOSING・alias・brand・search token・参照関係は target_bridge_source から抽出する。
- app実装は、latest_model_json の正当性確認の背景情報としては扱ってよい
- ただし、P0-Aでは app実装から構造値・key・参照先を生成しない
- 構造基準化の根拠は latest_model_json 上に明示された構造に限定する
- Model JSONに存在しない構造は基準化しない
- candidate pathとして存在確認した結果、非存在が確定したものはCHECK_ITEMSへ未解決項目として残さず、CANDIDATE_PATHS / EXTRACTION_PATHS に「非存在・固定構造化禁止」として記録する
- 存在有無または必須/任意判断が一意に決まらないもののみCHECK_ITEMSへ送る
■ 判定方針
- Model JSONに明示されているものを基準とする
- 必須 / 任意 / 禁止 / CHECK を混同しない
- 型定義を必ず明示する
- 参照元 / 参照先を必ず明示する
- deterministicに決まるものだけ基準化する
- 判断が必要なものはCHECKにする
- P1以降で使うため、曖昧なまま基準化しない
- P2 preservation firewall に関わる項目は PRESERVATION_RELEVANT_FIELDS に明示する
- P3 structural validation に渡す項目は STRUCTURAL_VALIDATION_HANDOFF に明示する
- 既存基準JSONとの差分は、修正せずCHECKまたは差分メモ候補として扱う
■ 禁止
- 対象JSONを修正する
- target_bridge_source本文を改善・医学監査・自然化する
- 医学的妥当性を評価する
- アプリ実装を推測する
- 新規keyを提案する
- 既存値を固定値として誤流用する
- aliasを推定生成する
- search aliasを補完する
- persona本文を作成する
- Express Mode参照を推測生成する
- 差分修正指示を作る
- deterministic fixを作る
- P2/P3の監査を先取りする
- P_APPEND / P_CLOSING / P_ADDON参照について、resolved_runtime_paths に定義された runtime合成上の既知パス以外を推測生成する
- latest_model_json 上に存在しないaddon構造を推測追加する
- resolved_runtime_paths に定義された既知パスを、Model JSON外の新規構造として追加しない
■ 最重要指示
latest_model_json と target_bridge_source を読む。

latest_model_json から構造基準を定義する。
target_bridge_source から preservation対象を抽出する。

JSON修正・本文改善・医学監査・補完・推測を行うな。

必須 / 任意 / 禁止 / CHECK を分けろ。
型定義と参照整合を明示しろ。
可能な限りJSONパスで出力しろ。

P_APPEND / P_CLOSING / P_ADDON参照は
resolved_runtime_paths に定義された runtime合成上の既知パスを基準として扱え。

candidate_paths_to_extract は正式パスではなく存在確認候補として扱え。
addon_paths_to_extract は $.addons.items が存在確認された場合の抽出対象パスとして扱え。

P1以降が迷わない shared foundation を作れ。
