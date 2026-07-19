SOAPエンジン P0-B

JSON RULE 定義
■ 役割
これは、P0-Aで定義されたModel JSON基準構造をもとに、
bridge原稿をcanonical JSONへ移植するためのJSON RULEを定義する工程である。
■ 本質
これはJSON移植工程ではない。
これはJSON修正工程ではない。
これは本文監査ではない。
これはアプリ整合監査ではない。
これはbridge ↔ canonical diff監査ではない。
「P2実行時に、bridge要素をcanonical JSONのどのJSONパスへ、どの型・形式で格納するかを定義する作業」である。
※P0-BはP2実行時の格納先・格納形式・preservation対象を定義する。
※P0-Bでは実bridgeを読まず、実移植・実比較・実判定は行わない。
※CHECK / ERROR / PENDINGは、P2での扱いとして定義する。
※P0-Aは構造基準、P0-Bは格納ルールを担当する。
※構造基準で矛盾する場合はP0-Aを優先し、格納先・格納形式の定義はP0-Bで明示する。
■ 入力
1. P0-A出力
2. latest_model_json_for_structure
※P0-Aで使用したModel JSON。
※構造・型・格納先・参照パスの確認補助としてのみ使用する。
※件数・scenario一覧・followup使用分布・alias数・expressModes件数などの実体値を固定値として扱わない。
3. 必要に応じて既存基準JSON
4. 必要に応じて前回差分メモ
※既存基準JSONは格納例の補助としてのみ使用する。
※既存基準JSONに存在するだけの値を固定値として扱ってはいけない。
※P0-Bでは実際のbridge原稿をJSON化しない。
※P0-Bでは実際のbridge ↔ canonical比較を行わない。
※P0-AとP0-Bが矛盾する場合は、P0-AのModel JSON構造基準を優先する。
■ 出力
[P0B_JSON_RULE]
1. JSON_RULE_SCOPE
- 本JSON RULEが対象とする移植範囲
- module
- scenarios_only
- addons_only
- scenario:id
- addon:id
- 対象外範囲
2. SOURCE_OF_TRUTH_RULE
P2実行時、bridge管理項目は bridge原稿を single source of truth とする。
bridge管理項目：
- scenario id / title
- scenarioType（bridge header typeに明示されたもの）
- S / O / A / P
- P_ADDON
- P_APPEND
- P_CLOSING
- addon key / id / title / text
- brand / alias / followup のうち bridgeに明示されたもの
Model JSON管理項目：
- module metadata
- runtime構造
- P0-Aで定義された格納先
- Model JSON上の既存構造
- bridgeに存在しないがModel JSON上で構造維持が必要な項目
原則：
- bridgeに存在する値を落とさない
- bridgeに存在しない値を推測追加しない
- bridge管理項目ではcanonical JSON側の既存値よりbridge一致を優先する
- Model JSON管理項目はP0-A構造基準を優先する
- 不明・不足・対応不能はP2でERROR / PENDINGとする

APP RULE境界

P0-BはJSON格納先・格納形式を定義する。

P0-Bは latest_model_json_for_structure を参照してよい。

ただし、latest Model JSON上の

- 件数
- ブランド数
- alias数
- followup使用件数
- expressModes件数
- scenario使用状況
- addonsRef使用状況

などの実体値を、

P0-C APP RULEへ固定値として持ち込んではならない。

これらはP3/P4確認対象とする。

P0-Bは構造・格納先・型・preservation対象のみを定義する。

3. OUTPUT_UNIT_RULE
- module
- scenarios_only
- addons_only
- scenario:id=xxx
- addon:id=xxx
- 各OUTPUT UNITで出力してよい範囲
- 各OUTPUT UNITで出力してはいけない範囲
4. BRIDGE_TO_JSON_MAPPING
P2実行時のbridge要素ごとに以下を定義する。
- bridge要素名
- canonical JSON格納先JSONパス
- 型
- 必須 / 任意
- 複数値の扱い
- 空値許容
- preserve対象か
- count監査対象か
- identity監査対象か
- P2でのCHECK / ERROR / PENDING条件
※CHECK / ERROR / PENDING条件はP2へ渡す扱いの定義であり、P0-Bでは実判定しない。
5. MODULE_METADATA_MAPPING
- moduleId
- moduleVersion
- categoryPath
- composition
- drug
- template
- risks
- searchConfig
- display
- defaults
- ui
- persona
- tagCatalog
- expressModes
※bridgeに明示されていないmodule metadataを推測生成しない。
※既存JSONの別モジュール値を固定値として流用しない。
※Model JSON上で固定値として明示されているもののみ固定値として扱う。
※Model JSONに格納先がないbridge要素は、新規key提案ではなくP2でのCHECK扱いとして定義する。
6. BRAND_ALIAS_MAPPING
以下の格納先と型を明示する。
- drug.brandCatalog
- drug.aliasToBrand
- drug.nameAliases
- drug.search
- aliases
- normalizedAliases
- searchConfig
- search.exactAliases
- search.prefixAliases
- search.nameAliases
※aliases / normalizedAliases が drug配下・search配下・root配下などに存在する場合は、
Model JSON準拠の正確なJSONパスを明示する。
※aliases / normalizedAliases / search aliases は、
Model JSON上の正式な格納先を確認し、
root / drug / drug.search / searchConfig などの候補を混同しない。
※search.exactAliases / search.prefixAliases / search.nameAliases が
searchConfig配下・drug.search配下・root search配下などに存在する場合は、
Model JSON準拠の正確なJSONパスを明示する。
必須ルール：
- brandCatalogはP2でbridge全件移植対象とする
- aliasesはP2でbridge全件移植対象とする
- normalizedAliasesはP2でbridge全件移植対象とする
- aliasToBrandはP2でbridge全件移植対象とする
- search aliasesはP2でbridgeに存在するもののみ移植対象とする
- drug.nameAliasesはdrug.search.nameAliases確定後に複写生成する（bridgeから独立生成しない）
- aliasの読みを推定生成しない
- 検索性向上目的でaliasを補完しない
- bridgeにないbrand / aliasを追加しない
P2停止条件定義：
- brandCatalog件数不一致
- aliases件数不一致
- normalizedAliases件数不一致
- aliasToBrand未解決
- search alias欠落
- bridge外alias追加
- alias推定生成
drug.nameAliases格納ルール：
- 格納先: $.drug.nameAliases
- drug.search.nameAliasesが確定した後に複写生成する
- 順序・表記・エントリ数をdrug.search.nameAliasesと完全一致させる
- bridgeから独立生成しない
- drug.search.nameAliasesを経由せずに直接推測・補完しない
P2 ERROR条件（drug.nameAliases）：
- drug.nameAliasesとdrug.search.nameAliasesの件数不一致
- drug.nameAliasesとdrug.search.nameAliasesの順序不一致
- drug.nameAliasesとdrug.search.nameAliasesの表記不一致

Search Token格納ルール：
- 格納先: $.drug.search.commonSearchTokens / $.drug.search.formulationSearchTokens
- bridge明示分のみ格納する
- alias系フィールド（aliases / normalizedAliases / aliasToBrand / search.exactAliases / search.prefixAliases / search.nameAliases）へ展開しない
- bridge未明示のtokenを推測生成しない
7. SCENARIO_MAPPING
以下を定義する。
- SCENARIO header type
- SCENARIO header id
- SCENARIO header title
- scenario.id
- scenario.globalId
globalId格納ルール
格納先: $.scenarios[].globalId
生成規則: {$.moduleId}.{$.scenarios[].id}
P0-A上のglobalId規則: 明示済（{moduleId}.{scenario.id}）
→ P2でdeterministicに生成可
※globalIdはbridge管理項目ではない
※globalIdはpreserve対象ではない
※globalIdはidentity・structural検証対象とする
※globalIdをbridge本文・title・医学的意味・既存JSONの別規則から推測生成しない
- scenario.title
- scenarioType
- scenarioGroup
- scenarioTags
- S
- O
- A
- P
- P_ADDON
- P_CLOSING
- followupRef
- mergePolicy
- SStructured / OStructured / AStructured / PStructured
- intentTags
- clinicalTags
- counselingTags
- workflowTags
必須ルール：
- scenario件数一致をP2で監査対象とする
- scenario id完全一致をP2で監査対象とする
- scenario title完全一致をP2で監査対象とする
- S/O/A/P本文完全一致をP2で監査対象とする
- P本文へP_CLOSINGを直書きしない
- P本文へbridgeにないfollowup文を追加しない
- S/O/A/Pを要約しない
- S/O/A/Pを自然化しない
- S/O/A/Pを補足しない
8. ADDON_MAPPING
以下を定義する。
- ADDON header type
- ADDON header id / key
- ADDON header title
- addons.items[].key
- addons.items[].id
- addons.items[].title
- addons.items[].group
- addons.items[].targetSection
- addons.items[].text
- addons.items[].intentTags
- addons.items[].requiredTags
- P_APPEND
- addons.orderPresets
addons.orderPresets格納ルール：
- 格納先: $.addons.orderPresets（$.addons.items と同階層の兄弟キー）
- addons.items が存在する場合、addons.orderPresets は必須
- 未使用時は {} を格納（省略・null・array・string は禁止）
- preset key → addon key[] の対応はbridge明示がある場合のみ生成
- bridge未明示のpreset keyは推測生成しない
P2 ERROR条件（addons.orderPresets）：
- addons.items が存在するがaddons.orderPresetsが欠落している
- addons.orderPresetsがobject型以外（array / null / string）で格納されている
type → group / targetSection 変換表（ADDON_MAPPING 時に必ず参照する）：
- lifestyle_guidance   → group: "counseling",  targetSection: "P"
- side_effect_guidance → group: "sideEffects", targetSection: "P"
- glycemic_guidance    → group: "counseling",  targetSection: "P"
- sickday_guidance     → group: "sickday",     targetSection: "P"
- adherence_guidance   → group: "adherence",   targetSection: "P"
変換表に存在しない type が bridge に現れた場合は CHECK として停止し、マッピングを確認してから再開する。
必須ルール：
- addon件数一致をP2で監査対象とする
- addon key / id完全一致をP2で監査対象とする
- addon title完全一致をP2で監査対象とする
- P_APPEND本文完全一致をP2で監査対象とする
- addon本文を要約しない
- addon本文を補足しない
- bridgeにないaddonを追加しない
- bridgeにあるaddonを省略しない
- 全addon item に key / id / title / group / targetSection / text の6フィールドが存在することをP2で確認する
9. ADDON_REFERENCE_MAPPING
以下を定義する。
- P_ADDON参照IDの格納先
- addonsRefの格納先
- 複数参照の格納形式
- 参照IDの型
- 参照IDの順序保持
- 参照先存在確認の扱い
必須ルール：
- P_ADDON参照はP2でbridge記載を保持する
- addon参照先はP2で全件存在確認対象とする
- P_ADDON参照先欠落はP2でERROR / PENDING対象とする
- 参照IDを本文内容から推測しない
- 参照IDをtitleから推測しない
10. FOLLOWUP_MAPPING
以下を定義する。
- P_CLOSING
- defaults.followup
- defaults.followupProfiles
- scenarios[].followupRef
- followup文格納先
- followupRef命名・対応規則
- followup文とP_CLOSINGの対応方法
必須ルール：
- P_CLOSING文をP2 preservation対象として定義する
- defaults.followupをP2でbridge由来で保持する
- followupProfilesをP2でbridge由来で保持する
- scenarios[].followupRefをP2でbridge由来で対応する
- P本文へfollowup文を直書きしない
- followup文を統一目的で書き換えない
- followup文を自然化しない
P2停止条件定義：
- P_CLOSING不一致
- defaults.followup不一致
- followupProfiles不一致
- followupRef対応不能
- P本文へのfollowup直書き
- bridgeにないfollowup追加
11. STRUCTURED_MAPPING
以下を定義する。
- SStructured
- OStructured
- AStructured
- PStructured
- Structured.text
- Structuredの順序
- Structuredと本文断片の同期条件
必須ルール：
管理区分
- SStructured / OStructured / AStructured / PStructured は Model JSON管理
- bridge非管理
- preserve対象: NO
構造管理
- SStructured / OStructured / AStructured / PStructured は、latest_model_json_for_structure上に実在する場合のみModel JSON管理項目として扱う。
- latest_model_json_for_structure上に存在しない場合は、canonical JSONへ追加しない。
- Structured非存在の場合、Structured.text sync監査は行わない。
- Structured非存在をPENDING / ERRORにしない。
- bridgeにStructured関連フィールドが存在しても、構造定義としては使用しない
text sync監査
- Structured系フィールドが latest_model_json_for_structure 上に実在する場合のみ、Structured.textとbridge本文との同一性をsync監査する
  - SStructured.text ↔ bridge S本文
  - OStructured.text ↔ bridge O本文
  - AStructured.text ↔ bridge A本文
  - PStructured.text ↔ bridge P本文
- Structured系フィールドが存在しない場合、Structured.text sync監査は行わない
- Structured非存在をPENDING / ERRORにしない
- 不一致はP2でPENDING（text sync error）とする
- 一致時はModel JSON定義のまま格納する

禁止
- 本文をもとに新規Structuredを推測生成しない
- 医学的意味からStructured項目を補完しない
- OStructuredを推測追加しない
12. PERSONA_MAPPING
以下を定義する。
- persona
- availableStyles
- styleProfiles
- baseline persona格納余白
- persona scaling用構造余白
必須ルール：
- P0-Bではpersona本文を生成しない
- P0-Bではpersona文体変換をしない
- bridge本文はP2でbaseline persona preservation対象として扱う
- persona構造はModel JSONに存在する範囲でのみ定義する
- persona項目を本文から推測生成しない
※P0-Bではpersonaは格納ルール・保全ルールとしてのみ扱う。
※persona本文生成・文体変換は行わない。
13. THIRD_PANEL / EXPRESS_MAPPING
以下を定義する。
- thirdPanelSPlacement
- expressModes[]
- enabled
- disabled（任意：bridge / Model JSONに明示がある場合のみ）
- disabledReason（任意：bridgeに明示がある場合のみ）
- defaultBrandName
- defaultScenarioId
- expressCategory
- expressGroup
- expressSubGroup
- label
- genericDisplayName（任意：bridgeに明示がある場合のみ）
- genericBrandName（任意：bridgeに明示がある場合のみ）
- scenarioCandidates（任意：bridgeに明示がある場合のみ）
- sortOrder
必須ルール：
- Express Mode参照はbridgeまたはModel JSONに明示がある場合のみP2で移植対象とする
- defaultBrandNameはbrandCatalogに存在する場合のみ有効
- defaultScenarioIdはscenarios[].idに存在する場合のみ有効
- genericBrandNameはbrandCatalogに存在する場合のみ有効（defaultBrandNameと同じ参照制約）
- 5つの任意フィールド（disabled / disabledReason / genericDisplayName / genericBrandName / scenarioCandidates）はbridge / Model JSONに明示がない場合はomitする
- 参照整合の実判定（defaultBrandName / defaultScenarioId / genericBrandName / scenarioCandidates の参照先確認）はP3へ渡す
- Express Mode用参照を推測生成しない
14. PRESERVATION_FIREWALL
P2 mandatory diffで必ず検査する項目を定義する。
P0-Bでは実際の一致判定は行わない。
Count:
- scenario件数
- addon件数
- brandCatalog件数
- alias件数
- followup件数
Identity:
- scenario id
- scenario title
- scenarioType（bridge header typeと完全一致）
- scenario globalId（preserve対象外 / identity・structural検証対象 / {moduleId}.{scenario.id}規則で再導出し一致検証）
- addon key / id / title
Brand / Alias:
- brandCatalog
- aliases
- normalizedAliases
- aliasToBrand
- search.exactAliases
- search.prefixAliases
- search.nameAliases
- drug.nameAliases完全一致（drug.search.nameAliasesと順序・表記・エントリ数が一致すること。P0-A Section 14で正式パス確定済み）
- commonSearchTokens / formulationSearchTokens alias汚染確認（alias系フィールドへの展開がないこと）
Text:
- S
- O
- A
- P
- P_APPEND
- P_CLOSING
Followup:
- defaults.followup
- defaults.followupProfiles
- followupRef
Reference:
- addon参照
- P_ADDON参照
- addonsRef
Structure:
- addons.orderPresets型整合（addons.items存在時: objectであり、array / null / string / omitでないこと）
Persona:
- bridge tone
- 説明密度
- 距離感
- counseling weight
15. CHECK / ERROR / PENDING_RULES
以下はP2へ渡す扱いの定義である。
P0-Bでは実判定しない。
ERROR候補：
- bridge preservation違反
- bridge外追加
- 件数不一致
- 本文不一致
- scenarioType不一致
- globalId規則違反
- alias推定生成
- 参照先欠落
- P_CLOSING不一致
- P本文へのfollowup直書きが必要になる状態
- followup生成が必要になる状態
- addons.orderPresets欠落（addons.items存在時）
- addons.orderPresetsがobject型以外（array / null / string）
- drug.nameAliasesとdrug.search.nameAliasesの不一致（件数・順序・表記）
- commonSearchTokens / formulationSearchTokensがalias系フィールドへ展開されている
- bridge未明示search tokenの推測生成
PENDING候補：
- JSON RULE上の格納先が不明
- JSON RULE上の格納形式が不明
- bridge要素をcanonical JSONへ対応付けできない
- bridgeに存在する要素がJSONへ移植できない
- Model JSON上で一意に決まらない
- 人間判断が必要
- Structured同期不能
- Express Mode参照不能
- persona構造がModel JSONから判断不能
CHECK候補：
- JSON化は可能だがP3/P4確認が必要
- app受け口確認が必要
- runtime確認が必要
- 型定義 / loader / UI / search / compose確認が必要
16. PROHIBITED_INFERENCE
- bridgeにない値を追加しない
- bridge本文を要約しない
- bridge本文を自然化しない
- bridge本文を補足しない
- aliasを推定生成しない
- search aliasを補完しない
- brandを補完しない
- followup文を作らない
- P_CLOSINGを統一目的で変更しない
- addon本文を補完しない
- scenario id / addon idを推測しない
- globalIdをModel JSON規則なしに推測生成しない
- followupRefをP_CLOSINGの意味から推測生成しない
- Express Mode参照を推測生成しない
- persona本文を生成しない
- 既存JSON値を固定値として誤流用しない
- commonSearchTokens / formulationSearchTokensをalias系フィールドへ展開しない
- drug.nameAliasesをbridgeから独立生成しない（drug.search.nameAliasesの複写のみ許可）
- addons.orderPresetsのpreset keyをbridgeに明示なく推測生成しない
17. OUTPUT_REQUIREMENTS
P0-B出力では以下を守る。
- 可能な限りJSONパスで記載する
- bridge要素とcanonical JSON格納先を1対1で示す
- 型を明示する
- 必須 / 任意 / CHECK / ERROR / PENDING を明示する
- count監査対象を明示する
- identity監査対象を明示する
- preservation対象を明示する
- P2へ渡すmandatory diff項目を明示する
- P2へ渡す停止条件定義を明示する
- 判断不能なものはP2でのCHECK / ERROR / PENDING扱いとして定義する
- latest_model_json_for_structure上の実体件数・実体分布・実体値を、P0-C APP RULEへ固定値として引き継がないことを明示する。
- P0-Cへ渡すのは、構造・格納先・型・参照パス・app確認対象であり、Model JSON由来の実体値ではない。

■ 判定方針
- P0-Aの構造基準に従う
- P0-AとP0-Bが矛盾する場合はP0-Aを優先する
- P0-Aは構造基準、P0-Bは格納先・格納形式の定義を担当する
- Model JSONの格納先を優先する
- P2実行時には、bridge管理項目についてbridgeをsingle source of truthとする
- bridge管理項目では、canonical JSON整合よりbridge一致を優先する
- Model JSON管理項目では、P0-A構造基準を優先する
- 既存基準JSONは格納例としてのみ参照する
- 既存基準JSONの値を固定値として流用しない
- 判断できない項目は、P2でのCHECK / ERROR / PENDING扱いとして定義する
■ 禁止
- 実際にJSON移植する
- 実際のbridge ↔ canonical比較を行う
- CHECK / ERROR / PENDINGを実判定する
- 対象JSONを修正する
- bridge本文を修正する
- 医学的妥当性を評価する
- アプリ実装を推測する
- 新規keyを提案する
- aliasを推定生成する
- search aliasを補完する
- followup文を生成する
- P_CLOSINGを変更する
- addon本文を補完する
- persona本文を作成する
- Express Mode参照を推測生成する
- deterministic fixを作る
- P2/P3/P4の監査を先取りする
■ 最重要指示
P0-Aを読む。
Model JSONを読む。
bridge → canonical JSON の格納ルールだけを定義する。
実bridgeを処理するな。
実際にJSON化するな。
実際のdiff監査をするな。
修正するな。
補完するな。
推測するな。
P2実行時には、bridge管理項目についてbridgeをsingle source of truthとして扱う。
Model JSON管理項目については、P0-A構造基準を優先する。
P2が迷わない JSON RULE を作れ。
実判定ではなく、P2実行時の格納ルール・停止条件・preservation対象だけを定義せよ。
P0-Bでは、CHECK / ERROR / PENDINGを分類定義するだけで、実判定しない。
