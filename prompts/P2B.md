SOAPエンジン P2B Canonical Build System v1.1

Canonical Build System
■ 役割
これは、P0-A / P0-B / P0-C / P1で定義された
Model JSON構造・JSON RULE・APP RULE・Bridge Preservation原則をもとに、
完成済みbridge原稿をcanonical JSONへ非創作・preservation優先で構築する工程である。
■ 本質
これは本文改善工程ではない。
これはJSON再設計工程ではない。
これはアプリ整合修正工程ではない。
これは医学的監査工程ではない。
これはcreative buildではない。
「bridge原稿をsingle source of truthとして扱い、
P0-A / P0-B / P0-C / P1の定義に従って、
canonical JSONをdeterministicかつnon-creativeに構築し、
mandatory preservation / mandatory diff / ERROR / PENDING / CHECK判定を行う作業」である。
■ 入力
1. P0-A出力
2. P0-B出力
3. P0-C出力
4. P1出力
5. 完成済みbridge原稿
6. 必要に応じてP2A Model JSON draft
7. 必要に応じてP2A DRAFT_IDENTITY_REPORT
8. 必要に応じてP2A UNRESOLVED_STRUCTURE
9. 必要に応じてP2A CHECK_ITEMS
※P2Aは任意工程とする。
※既存Model JSONをcanonical buildの器として利用できる場合、P2Aを省略してよい。
※P2A未実施のみを理由としてBUILD_STOPPED / PENDINGにしてはならない。
※P2A未実施時は、人間が添付または明示指定した latest_model_json_for_structure をbuild器として扱う。
10. 人間が添付または明示指定した latest_model_json_for_structure
11. 必要に応じて人間が添付または明示指定した既存canonical JSON
※P2Bではbridge本文を修正しない。
※P2Bでは医学的判断を行わない。
※P2Bではアプリコードを修正しない。
※P2Bではcreative buildを行わない。
※P2BではP3/P4/P5を先取りしない。
※既存canonical JSONは統合補助としてのみ使用する。
※既存canonical JSONに存在する値であっても、bridgeと矛盾する場合は維持しない。
※bridgeにない値を既存canonical JSONから補完しない。
※既存canonical JSONから継承した項目は inherited_from_existing として明示する。
■ STANDARD_REFERENCE_PATHS
ローカルリポジトリを参照できる場合、構造確認・登録状況確認・型確認・app受け口確認のため、以下の標準パスを確認してよい。
リポジトリroot:
- soap-engine/
module / 登録確認:
- data/modules/
- data/modules/index.ts
型・validator・runtime関連:
※P2Bでは以下ファイルを参照してよいが、
runtime動作確認・build確認・UI確認・検索挙動確認・SOAP生成実行は行わない。
参照目的は、格納先・型定義・validator受け口・構造名の確認に限定する。
実行確認が必要な項目は CHECK として P3/P4 に送る。
- lib/types.ts
- lib/moduleValidator.ts
- lib/scenarioValidator.ts
- lib/validationRunner.ts
- lib/search.ts
- lib/scenarioSelector.ts
- lib/buildSoap.ts
- lib/soapComposer.ts
- lib/createSoapFromInput.ts
- lib/addonFilter.ts
- lib/menuGroups.ts
- lib/personaGuard.ts
- lib/applyPersona.ts
package / build:
- package.json
- tsconfig.json
注意:
- この章は「参照してよい場所」を示すものであり、最新Model JSON / 既存canonical JSON をClaudeが自動選定してよいことを意味しない。
- 最新Model JSON / P2A Model JSON draft / 既存canonical JSON は、人間が添付または明示指定したものを優先する。
- 未指定の data/modules 内 JSON を、Claudeが勝手に「最新Model JSON」「既存canonical JSON」「対象moduleの参考正本」として選定してはならない。
- 参照したファイル名・パス・用途を必ず出力に記録する。
- ファイルが存在しない場合は推測せず、NOT_FOUND または NOT_CHECKED として扱う。
- 既存ファイルの値を対象moduleへ無断流用してはならない。
- P2Bではこれらのapp実装ファイルを参照してよいが、runtime判定・build判定・UI判定は行わない。
- app実装参照は、格納先・型・validator受け口の構造確認に限定する。
data/modules 内のJSONを参照できる場合でも、Claudeが自動で最新Model JSONを選定してはならない。
latest_model_json_for_structure は、人間が添付または明示指定したもののみを使用する。
■ 出力
[P2B_SUMMARY]
- status:
  - BUILD_OK
  - BUILD_OK_WITH_CHECK
  - BUILD_OK_WITH_PENDING
  - BUILD_STOPPED
- reason:
- output_unit:
- bridge_source:
- model_json_source:
- existing_canonical_usage:
- inherited_from_existing:
  - structure_reference_only
  - value_inherited
  - deterministic_derived
  - bridge_preserved
- reference_usage_report: あり / なし
- not_final: true / false
- pending_review_required: true / false
[OUTPUT_JSON]
- canonical JSON
■ FULL_OUTPUT_SUPPRESSION_RULE
※原則として、canonical JSON全文は出力しない。
※P2Bでは、作成・修正すべき内容を差分形式で提示する。
※人間が「全文出力」「全文保存」「canonical JSON全文を出して」と明示した場合のみ、OUTPUT UNIT範囲内で全文出力してよい。
※既にファイル保存済みの場合は、全文再生成ではなく、修正箇所・置換箇所・追記箇所のみを出力する。
※ERRORが存在する場合は、修正済みcanonical JSON全文を出力しない。
※PENDINGのみの場合は、人間確認後に続行できる状態として扱う。
※BUILD_OKの場合のみ、OUTPUT UNIT範囲内で正式出力する。
※BUILD_OK_WITH_CHECKの場合も、OUTPUT UNIT範囲内で正式出力してよい。
※BUILD_OK_WITH_PENDINGの場合は、OUTPUT UNIT範囲内で出力してよいが、not_final / pending_review_required を true として扱う。
※ただし NOT_FINAL / PENDING_REVIEW_REQUIRED は、canonical JSON本体ではなく、[P2B_SUMMARY] または [P3_HANDOFF] のメタ情報として必ず明示する。
※canonical JSON本体に、build状態管理用のメタキーを追加してはならない。
※OUTPUT_JSON内に "__UNRESOLVED__" / "__UNRESOLVED_SEE_CHECK__" / "__P2B__" / "__P2B_BRIDGE_MIGRATE__" 等のmarkerを残してはならない。
※未確定fieldを空array / 空object / placeholderで代替してはならない。
※ただし、構造的に空であることが確定している空array / 空objectは許可する。
※空array / 空objectを「未確定」の代替表現として使用してはならない。
※PENDING / 未確定 / PROPOSED / placeholder / marker を canonical JSON本体へ格納してはならない。
※未確定fieldは OUTPUT_JSON から omit し、[P2B_SUMMARY] / [ERROR_PENDING] / [P3_HANDOFF] のメタ情報にのみ記録する。
[MANDATORY_DIFF_REPORT]
各checkは以下の形式で出力する。
- check_name:
- status: PASS / FAIL / NOT_CHECKED
- bridge_count:
- json_count:
- bridge_value:
- json_value:
- issue:
- action:
対象：
- count_check
- identity_check
- brand_alias_check
- search_token_check
- drug_resolution_check
- text_check
- followup_check
- reference_check
- persona_check
[ERROR_PENDING]
ERROR:
- xxx
PENDING:
- xxx
[REFERENCE_USAGE_REPORT]
- referenced_file:
- referenced_path:
- reference_purpose:
- inherited_value: なし / あり
- note:
[P3_HANDOFF]
- build済canonical JSON
- mandatory diff結果
- preservation結果
- 本文変更なし確認
- ERROR / PENDING
- CHECK項目
- validation対象
- unresolved参照
- inherited_from_existing
- not_final
- pending_review_required
- search token検証対象
  - drug.search.commonSearchTokens
  - drug.search.formulationSearchTokens
  - drug.search.matchPolicy.allowMultiTokenAndMatch
  - drug.search.matchPolicy.allowFormulationTokenMatch
  - commonSearchTokens / formulationSearchTokens が alias系へ展開されていないこと
  - index.searchableText / index.normalizedTokens への反映要否
■ ERROR / PENDING / CHECK 定義
ERROR：
- bridge preservation違反
- bridge外追加
- 件数不一致
- 本文不一致
- alias推定生成
- followup不一致
- addon参照欠落
- mandatory diff未解決
- baseline persona drift
- deterministic外補完が発生した状態
PENDING：
- 格納先がP0-Bから一意に決まらない
- 人間判断が必要
- 対応表不足
- Model JSON / JSON RULE / APP RULE間の前提不一致
- 既存canonical JSONとの統合方針確認が必要
- Express / thirdPanel参照方針が不明
- persona構造の扱いが未確定
CHECK：
- commonSearchTokens / formulationSearchTokens の検索runtime確認が必要
- multi-token AND検索 / formulation token検索のapp受け口確認が必要
CHECK項目例：
- module registry登録確認
- app型定義確認
- validator受け口確認
- loader受け口確認
- search runtime確認
- search token反映仕様確認
- Express Mode確認
- thirdPanel確認
- UI表示確認
- merge確認
- compose確認
- typecheck対象
- build対象
- その他P3/P4確認対象
CHECKの性質：
- buildは可能
- preservation違反ではない
- JSONとしては成立する
- ただしP3/P4で確認が必要
- app受け口確認が必要
- runtime確認が必要
- 型定義・loader・UI・検索・合成挙動の確認が必要
分類優先順位：
1. bridge preservation違反を含む場合はERRORを優先する
2. mandatory diffがFAILの場合はERRORを優先する
3. 格納先・方針未確定で、preservation違反が未発生の場合はPENDINGとする
4. JSONとして成立し、preservation違反もないが後続確認が必要な場合はCHECKとする
5. NOT_CHECKEDが残る場合はBUILD_OKにしない
■ BUILD_SCOPE
- build対象
- module
- scenarios_only
- addons_only
- scenario:id
- addon:id
- OUTPUT UNIT
- build対象外範囲
■ SOURCE_OF_TRUTH_EXECUTION
P1原則に従い、bridge原稿をsingle source of truthとして扱う。
実行原則：
- bridgeにある値を落とさない
- bridgeにない値を足さない
- canonical既存値よりbridge一致を優先する
- P0-B JSON RULEに従って格納する
- 不明点は推測せずERROR / PENDINGとする
- 既存canonical JSONから継承した項目は inherited_from_existing として明示する
■ VALUE_ORIGIN_CLASSIFICATION
P2Bは各値の由来を以下の4分類で扱う。
bridge_managed:
- bridge原稿をsingle source of truthとする項目
- S/O/A/P
- P_APPEND
- P_CLOSING
- alias
- followup文
- addon本文
model_managed:
- Model JSON
- JSON RULE
- APP RULE
により管理される項目
例:
- composition
- ui
- persona
- expressModes
deterministic_derived:
- 同一canonical JSON内の
  確定済み値から機械的に導出される項目
例:
- globalId
- drugResolution.brandToTags
reference_pattern:
- 値継承ではなく
  構造パターンのみ参照した項目
例:
- expressModes構造
- mergePolicy構造
- ui.panels構造
出力時は
REFERENCE_USAGE_REPORTに分類を明示する。
■ P2A_CHECK_CLASSIFICATION_EXECUTION
※本セクションはP2Aを実施した場合のみ適用する。
※P2A未実施の場合、本セクションを理由としてPENDING / ERROR / BUILD_STOPPEDにしてはならない。
P2Bは、P2A CHECK_ITEMS に付与された classification_hint を確認し、
以下の分類で処理する。
- RESOLVE_RECOMMENDED
  同一canonical build内の確定済みfieldから deterministic に解消可能な場合、
  P2Bで解消してよい。
  例：drugResolution.brandToTags を drug.brandCatalog[brand].handlingTags から機械的に作成する。
- DEFER_CANDIDATE
  対象moduleの成立・canonical JSON build・preservationを妨げないが、
  方針未確定の項目として CHECK に分類し、
  P3/P4/P5へ明示的に引き継ぐ。
  ※DEFERは独立ステータスではなく、CHECK内の判断理由として扱う。
  ※P2Bではrelease可否を判定しない。
  ※必要に応じて defer_rationale_candidate を記録し、P5で最終判断する。
- NOT_APPLICABLE_CANDIDATE
  対象moduleに非該当と判断できる場合、
  canonical JSONへfieldを作成しない。
  非該当理由を ERROR_PENDING または CHECK_ITEMS に記録する。
  非該当と判断されたfield欠落は、mandatory diff FAILとして扱わない。
- APP_CONFIRM_REQUIRED
  JSONとして成立し、preservation違反がない場合はCHECKとする。
  app / runtime / loader / UI確認対象としてP3/P4へ送る。
■ P2A_HANDOFF_EXECUTION
P2Aを実施した場合、P2BはP2A Model JSON draftをcanonical buildの器として扱う。
P2A未実施のみを理由として、
- PENDING
- ERROR
- BUILD_STOPPED
- NOT_CHECKED
を発生させてはならない。
P2A実施時のみ、以下を適用する。
- P2AでMODEL_JSON_DRAFTから削除された未確定fieldは、P2A UNRESOLVED_STRUCTURE / CHECK_ITEMS に記録された範囲でのみ扱う
- P2Aで削除されたplaceholderを復元しない
- "__UNRESOLVED__" / "__UNRESOLVED_SEE_CHECK__" / "__P2B__" / "__P2B_BRIDGE_MIGRATE__" 等のmarkerをcanonical JSONへ入れない
- 未確定fieldを空array / 空objectで代替しない
- 本文意味からintentTags / sComposition / mergePolicy.S.domainを推測生成しない
- P2A CHECK_ITEMSに残る項目のうち、P2B前解決推奨とされたものが未解決の場合はPENDINGとする
P2A未実施の場合、P2A Model JSON draft / DRAFT_IDENTITY_REPORT / UNRESOLVED_STRUCTURE / CHECK_ITEMS の不存在を理由として、PENDING / ERROR / BUILD_STOPPED / NOT_CHECKED を発生させてはならない。
ただし、P2A未実施の場合でも、未確定fieldをcanonical JSON本体へ仮置きしてはならない。
PENDING field は OUTPUT_JSON から omit し、PENDINGとしてメタ情報にのみ記録する。
■ BUILD_SEQUENCE
canonical build順序を定義する。
Phase 1
- module metadata build
Phase 2
- brand / alias build
  ※ drug.nameAliases は Phase 2 内で drug.search.nameAliases が確定した後に生成する。
     drug.search.nameAliases より先に drug.nameAliases を生成してはならない。
Phase 3
- followup build
Phase 4
- addon build
Phase 5
- scenario build
Phase 6
- Structured build
Phase 7
- Express / thirdPanel build
Phase 8
- mandatory preservation diff
Phase 9
- ERROR / PENDING / CHECK判定
Phase 10
- P3 handoff
■ MODULE_BUILD_RULE
drugResolution build補足：
drugResolution.brandToTags は、
P2A実施時はP2A DRUG_RESOLUTION_RULEに従う。
P2A未実施時は、最新Model JSON / P0-A / P0-Bで許可された構造に従い、
drug.brandCatalog[brand].handlingTags から一意に生成できる場合のみ、
P2Bでdeterministic mappingとして作成してよい。
- これはbridge外補完ではなく、同一canonical JSON内の確定済み値からの構造写像として扱う。
- handlingTagsに存在しないtagを追加してはならない。
addons.orderPresets build原則：
- addons.orderPresets は全 module で object として生成する
- addons.items が存在する場合、addons.orderPresets も必ず存在させる
- 未使用 module では {} （空 object）を生成する
- キー自体を omit してはならない
- 目的：構造の標準化および将来の runtime 安全性確保
- orderPresets の値（preset key → addon key[] の対応）は bridge に明示がある場合のみ生成する
- bridge 未明示の preset key を推測生成してはならない
以下をP0-B格納規則に従ってbuildする。
- moduleId
- moduleVersion
- categoryPath
- composition
- drug
- drugResolution
- template
- risks
- searchConfig
- index
- display
- defaults
- ui
- persona
- tagCatalog
- expressModes
原則：
- bridge管理項目について、
格納先が一意に決定できない場合は
CHECKではなくPENDINGとする。
Model JSON管理項目について、
JSONとして成立しており、
runtime確認のみ必要な場合は
CHECKとする。
- 新規keyを作らない
- 他module固定値を流用しない
- deterministicでない場合は停止する
- 既存canonical JSONから継承した項目は inherited_from_existing として明示する
■ BRAND_ALIAS_BUILD_RULE
以下をbuildする。
- brandCatalog
- aliases
- normalizedAliases
- aliasToBrand
- drug.nameAliases
- search aliases
build原則：
- bridge全件保持
- 推定生成禁止
- alias補完禁止
- bridge外alias禁止
- alias identity保持
- commonSearchTokens / formulationSearchTokens の扱いはSEARCH_TOKEN_BUILD_RULEを参照
- drug.nameAliases は drug.search.nameAliases が確定した後に完全複写として生成する
- drug.nameAliases と drug.search.nameAliases は順序・表記・エントリ数を完全一致させる
- drug.nameAliases を drug.search.nameAliases と独立して生成してはならない
- alias 推測生成・alias 補完によって drug.nameAliases を生成してはならない
mandatory diff対象：
- brandCatalog
- aliases
- normalizedAliases
- aliasToBrand
- search aliases
- drug.nameAliases
- drug.nameAliases === drug.search.nameAliases（順序・表記・エントリ数の完全一致）
■ SEARCH_TOKEN_BUILD_RULE
以下を build 対象に含める。
- drug.search.commonSearchTokens
- drug.search.formulationSearchTokens
- drug.search.matchPolicy.allowMultiTokenAndMatch
- drug.search.matchPolicy.allowFormulationTokenMatch
build原則：
- commonSearchTokens / formulationSearchTokens は alias ではない。
- prefixAliases / nameAliases / brandCatalog.aliases / normalizedAliases / aliasToBrand へ展開してはならない。
- bridgeに明示された場合のみ canonical JSON へ格納する。
- bridgeにない search token を推測生成してはならない。
- 剤形違い検索のための補助tokenとして扱い、brand identity / alias identity とは分離する。
- index.searchableText / index.normalizedTokens への反映は、P0-B / APP RULE / loader仕様に明示がある場合のみ行う。
- loader仕様が未確定の場合、index反映はCHECKとする。
mandatory diff対象：
- commonSearchTokens
- formulationSearchTokens
- matchPolicy.allowMultiTokenAndMatch
- matchPolicy.allowFormulationTokenMatch
■ FOLLOWUP_BUILD_RULE
P2A実施時、P2A CHECK_ITEMSにfollowupRef未確定scenarioが存在する場合、
P_CLOSING本文を既存followupProfileへ統合してはならない。
P2A未実施時は、P0-B / P1 / 最新Model JSON / bridge原稿から
followupRefとfollowupProfiles keyの対応が一意に決まる場合のみbuildする。
新規followupProfile keyの作成可否が未確定の場合はPENDINGとする。
以下をbuildする。
- defaults.followup
- defaults.followupProfiles
- scenarios[].followupRef
- P_CLOSING対応
build原則：
- P_CLOSING一字一句保持
- P本文へ直書き禁止
- followup統一禁止
- followup自然化禁止
- 対応不能はERROR / PENDING
mandatory diff対象：
- followup
- followupProfiles
- followupRef
- P_CLOSING
■ ADDON_BUILD_RULE
以下をbuildする。
- addons.items
- key
- id
- title
- group
- targetSection
- text
- intentTags
- requiredTags
- addons.orderPresets（build規則はMODULE_BUILD_RULEを参照）
- addonsRef
- P_ADDON
build原則：
- addon本文を変更しない
- addon件数保持
- addon identity保持
- P_ADDON保持
- 参照先存在確認
mandatory diff対象：
- addon件数
- addon identity
- addon.text
- addonsRef
- P_ADDON
■ SCENARIO_BUILD_RULE
intentTags / sComposition / mergePolicy.S.domain は、
P0-BまたはP2A CHECK_ITEMSで対応表・決定済み値がある場合のみbuildする。
本文意味から推測生成しない。
latest_model_json_for_structure を参照する場合、
scenarioType / scenarioGroup / scenarioTags / sideEffectPresence / sComposition / intentTags / mergePolicy は、
同一scenario idかつ同一fieldから一意に取得できる場合のみ reference copy として採用してよい。
本文意味からの推測・類推は禁止する。
対応scenario idが存在しない場合、または対応関係が一意でない場合は PENDING とする。
決定不能な場合はPENDINGとする。
以下をbuildする。
- scenario.id
- globalId
- title
- scenarioType
- scenarioGroup
- scenarioTags
- S
- O
- A
- P
- mergePolicy
- intentTags
- clinicalTags
- counselingTags
- workflowTags
build原則：
- S/O/A/P完全保持
- scenario identity保持
- 本文補足禁止
- 本文自然化禁止
- JSON都合移動禁止
- scenario統合禁止
mandatory diff対象：
- scenario件数
- scenario identity
- S/O/A/P
■ STRUCTURED_BUILD_RULE
以下を扱う。
- SStructured
- OStructured
- AStructured
- PStructured
- Structured.text
build原則：
- P0-B格納規則のみ使用
- 本文から推測生成しない
- 医学的意味補完禁止
- Structuredのために本文変更しない
- 同期不能はERROR / PENDING
■ EXPRESS_THIRD_PANEL_BUILD_RULE
以下をbuildする。
- thirdPanelSPlacement
- expressModes[] 各entryのフィールド定義は P0-A を参照する
  - 必須フィールド: enabled / expressCategory / expressGroup / expressSubGroup / label
  - 任意フィールド: disabled / disabledReason / defaultBrandName / defaultScenarioId / genericDisplayName / genericBrandName / scenarioCandidates / sortOrder
build原則：
- 明示参照のみ扱う
- 任意フィールドはbridge / Model JSONに明示がない場合はomitする
- bridge都合変更禁止
- Express都合変更禁止
- thirdPanel都合変更禁止
- 不明参照はERROR / PENDING
- 参照整合の実判定（defaultBrandName / defaultScenarioId / genericBrandName / scenarioCandidates の参照先確認）はP3へ渡す
■ BASELINE_PERSONA_PRESERVATION_EXECUTION
bridge本文はbaseline persona原本として扱う。
preservation対象：
- 温度感
- 説明密度
- 距離感
- counseling weight
- 文体重量
- 薬剤別指導文トーン
禁止：
- persona機械生成
- tone変更
- 軽量化
- 重量化
- baseline drift
mandatory diff対象：
- bridge tone
- 説明密度
- 距離感
- counseling weight
■ MANDATORY_DIFF_EXECUTION
P1 preservation対象についてmandatory diffを実行する。
各checkは status: PASS / FAIL / NOT_CHECKED を必ず付ける。
Count:
- scenario件数
- addon件数
- brandCatalog件数
- alias件数
- followup件数
Identity:
- scenario id
- scenario title
- addon key/id/title
- brand identity
Brand:
- alias
- normalizedAliases
- aliasToBrand
- search aliases
- drug.nameAliases
- drug.nameAliases === drug.search.nameAliases（順序・表記・エントリ数の完全一致）
SearchToken:
- drug.search.commonSearchTokens
- drug.search.formulationSearchTokens
- drug.search.matchPolicy.allowMultiTokenAndMatch
- drug.search.matchPolicy.allowFormulationTokenMatch
Text:
- S
- O
- A
- P
- P_APPEND
- P_CLOSING
Followup:
- followup
- followupProfiles
- followupRef
Reference:
- addon参照
- P_ADDON
- addonsRef
Structure:
- addons.orderPresets が object として存在すること（欠落は FAIL、{} は PASS）
Persona:
- baseline persona preservation
DrugResolution:
- drugResolution.brandToTags
- brandCatalog[brand].handlingTags からの deterministic mapping 一致
■ ERROR_PENDING_RULE
以下は推測補完せず停止する。
※ERROR / PENDING / CHECK の分類は、上記「ERROR / PENDING / CHECK 定義」に従う。
※同じ事象でも bridge preservation違反を含む場合はERRORを優先する。
※mandatory diffがFAILの場合はERRORを優先する。
※格納先・方針未確定で、preservation違反が未発生の場合はPENDINGとする。
※JSONとして成立し、preservation違反もないが後続確認が必要な場合はCHECKとする。
※NOT_CHECKEDが残る場合はBUILD_OKにしない。
ERROR条件：
- P2A実施時、P2A Model JSON draftにplaceholder markerが残存している
- bridge欠落
- build不能
- bridge外追加
- scenario件数不一致
- addon件数不一致
- brandCatalog件数不一致
- alias件数不一致
- followup件数不一致
- alias推定生成
- followup生成
- P_CLOSING不一致
- addon参照欠落
- followupRef不能
- Structured同期不能
- Express参照不能
- baseline persona drift
- mandatory diff未解決
- commonSearchTokens / formulationSearchTokens が aliases / normalizedAliases / aliasToBrand / search aliases へ展開された状態
- bridge未明示の search token が推測生成された状態
- bridgeに明示された commonSearchTokens / formulationSearchTokens / search token系matchPolicy が canonical JSON に反映されていない状態
- drugResolution.brandToTags が、brandCatalog[brand].handlingTags からの deterministic mapping と一致しない状態
- RESOLVE_RECOMMENDED項目を、deterministicに解消可能であるにもかかわらず未解決のままOUTPUT_JSONへ進めた状態
- drug.nameAliases が drug.search.nameAliases と一致しない状態
- addons.orderPresets キーが欠落している状態（addons.items が存在するにもかかわらず）
- addons.orderPresets が object 型以外（null / array / string）である状態
PENDING条件：
- P2A実施時、P2A CHECK_ITEMSのうち、P2B前解決推奨項目が未解決
- P2A実施時、P2A UNRESOLVED_STRUCTUREのうち、P2Bで確定不能な項目
- 格納先不明
- 型不明
- 人間判断が必要
- 対応表不足
- Model JSON / JSON RULE / APP RULE間の前提不一致
- 既存canonical JSONとの統合方針確認が必要
- Express / thirdPanel参照方針が不明
- persona構造の扱いが未確定
ただし、P2A実施時、P2A CHECK_ITEMSで NOT_APPLICABLE_CANDIDATE と分類され、
対象module非該当の理由が明示できる場合は、
PENDINGではなく CHECKまたは非該当記録として扱う。
ただし、P2A実施時、P2A CHECK_ITEMSで RESOLVE_RECOMMENDED と分類され、
同一canonical JSON内の確定済みfieldから deterministic に解消可能な場合は、
PENDINGにせずP2Bで解消してよい。
■ OUTPUT_UNIT_RULE
P0-B OUTPUT UNITに従う。
- module
- scenarios_only
- addons_only
- scenario:id
- addon:id
原則：
- UNIT外出力禁止
- cross-unit混入禁止
- OUTPUT UNIT外値生成禁止
■ P3_HANDOFF_RULE
P3へ渡すもの：
- build済canonical JSON
- mandatory diff結果
- preservation結果
- 本文変更なし確認
- ERROR / PENDING
- CHECK項目
- validation対象
- unresolved参照
- reference usage report
- inherited_from_existing
- not_final
- pending_review_required
- search token検証対象
  - drug.search.commonSearchTokens
  - drug.search.formulationSearchTokens
  - drug.search.matchPolicy.allowMultiTokenAndMatch
  - drug.search.matchPolicy.allowFormulationTokenMatch
  - commonSearchTokens / formulationSearchTokens が alias系へ展開されていないこと
  - index.searchableText / index.normalizedTokens への反映要否
P3_HANDOFFは
Structural Validation対象のみを引き継ぐ。
以下はP3対象ではない。
- JSON保存
- index.ts登録
- typecheck実行
- build実行
- runtime確認
- UI確認
- search動作確認
これらはP4対象として扱う。
■ PROHIBITED_BUILD_ACTIONS
- bridge本文修正
- S/O/A/P変更
- P_APPEND変更
- P_CLOSING変更
- alias生成
- followup生成
- persona生成
- creative build
- 医学補足
- JSON再設計
- app修正
- deterministic外補完
- P3/P4/P5先取り
- ERROR存在時の修正済みcanonical JSON全文出力
■ OUTPUT_REQUIREMENTS
P2B出力では以下を守る。
- 出力ブロックを分離する
- canonical build結果を明示する
- preservation結果を明示する
- mandatory diff結果を明示する
- mandatory diff各項目に PASS / FAIL / NOT_CHECKED を付ける
- ERROR / PENDINGを分離する
- CHECKを明示する
- unresolvedを明示する
- P3 handoffを明示する
- 本文変更なし確認を明示する
- inherited_from_existingを明示する
- reference usage reportを明示する
- BUILD_OK_WITH_PENDING時は NOT_FINAL / PENDING_REVIEW_REQUIRED を明示する
- CHECKが残る場合は BUILD_OK ではなく BUILD_OK_WITH_CHECK と明示する
- BUILD_OK_WITH_CHECK時は CHECK項目をP3/P4確認対象として明示する
- 推測でbuild成功扱いしない
- ERRORが存在する場合は修正済みcanonical JSON全文を出力しない
■ 判定方針
- bridgeをsingle source of truthとする
- bridge preservationを最優先する
- P0-A/B/CおよびP1に従う
- canonical整合よりpreservationを優先する
- deterministic buildのみ許可する
- 不明点は推測せず停止する
- P3/P4/P5でpreservation補正しない
- ERRORが存在する場合はBUILD_STOPPEDとする
- PENDINGのみの場合は
  BUILD_OK_WITH_PENDING候補とする
- ERRORなし
  PENDINGなし
  CHECKあり
  の場合は
  BUILD_OK_WITH_CHECK候補とする
- ERRORなし
  PENDINGなし
  CHECKなし
  の場合のみ
  BUILD_OK候補とする
- CHECKはbuild成功可否ではなく、
  P3/P4確認対象として扱う
- CHECKが残る場合は
  BUILD_OKへ分類してはならない
- NOT_CHECKEDが残る場合はBUILD_OKにしない
■ STATUS_METADATA_RULE
BUILD_OK:
- not_final: false
- pending_review_required: false
BUILD_OK_WITH_CHECK:
- not_final: false
- pending_review_required: false
- CHECK項目はP3/P4確認対象として引き継ぐ
- CHECKのみを理由に未完成扱いしない
BUILD_OK_WITH_PENDING:
- not_final: true
- pending_review_required: true
- PENDING項目は人間確認または後続工程確認が必要な未確定事項として扱う
BUILD_STOPPED:
- not_final: true
- pending_review_required: true
- ERRORまたはbuild不能によりP3へ進めない
■ 禁止
- bridge本文を修正する
- JSON再設計する
- 医学判断する
- alias生成する
- followup生成する
- persona生成する
- creative buildする
- app修正する
- preservation violationを後工程補正する
- P3/P4/P5監査を先取りする
- ERROR存在時に修正済みcanonical JSON全文を出力する
■ 最重要指示
bridgeを正本として扱う。
P0-A/B/CとP1に従う。
non-creative buildを行う。
preservation violationは停止せよ。
推測するな。
補完するな。
deterministic buildのみ許可せよ。
ERRORが存在する場合はcanonical JSON全文を出すな。
PENDINGがある場合はNOT_FINALとして扱え。
NOT_CHECKEDが残る場合はBUILD_OKにするな。
P3が迷わないcanonical buildを作れ。
canonical JSON全文は、人間が明示要求した場合のみ出力せよ。
通常は差分・修正箇所・P3_HANDOFFのみを出力せよ。
