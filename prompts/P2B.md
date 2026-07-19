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
→ 参照可能パス一覧は RULES.md §1 を参照すること。
P2B での参照制約:
- 参照目的を「格納先・型定義・validator受け口・構造名の確認」に限定する
- runtime動作確認・build確認・UI確認・検索挙動確認は行わない（実行確認が必要な項目は CHECK として P3/P4 に送る）
- 最新 Model JSON / P2A Model JSON draft / 既存 canonical JSON は人間が添付または明示指定したものを使用する
- 未指定の data/modules 内 JSON を自動選定してはならない
- 参照したファイル名・パス・用途を必ず出力に記録する
- ファイル不存在は NOT_FOUND / NOT_CHECKED として扱う（推測しない）
- 既存ファイルの値を対象 module へ無断流用してはならない
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
- search token検証対象（詳細は P3_HANDOFF_RULE を参照）
■ ERROR / PENDING / CHECK 定義
→ 各定義・分類優先順位は RULES.md §3 に従う。
P2B 固有補足:
- NOT_CHECKED が残る場合は BUILD_OK にしない
- JSON として成立し preservation 違反もないが P3/P4 確認が必要な場合は CHECK（build は可能）
- 格納先・方針未確定で preservation 違反が未発生の場合は PENDING
- bridge preservation 違反 / mandatory diff FAIL は ERROR を優先する
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
→ P1 SOURCE_OF_TRUTH_PRINCIPLE（Rule 1）に従う。
P2B 固有補足:
- P0-B JSON RULE に従って格納する
- 既存 canonical JSON から継承した項目は inherited_from_existing として明示する
■ CROSS_MODULE_DERIVATION_CHECK
既存モジュールを参照・横展開して新規 bridge を作成した場合の必須確認項目。
本文中の旧モジュール固有文言残存チェック:
  確認対象: 全シナリオの S / O / A / P フィールド
  禁止状態:
    - 旧モジュール固有の薬効分類名が非置換のまま残存している状態
    - 旧モジュール固有の作用機序文が新規モジュールの A/P に混入している状態
    例: CMRI 点眼への H1 横展開時、「ヒスタミンがH1受容体へ作用するのを抑え」が残存 → ERROR
機序説明・作用機序の扱い:
  - 新規モジュールの機序説明は bridge 本文を正本とする
  - 旧モジュールの機序文を推測・自動置換で補完しない
  - constitution.editingRules「A / P では薬剤が使用薬として使われている場合のみ
    {{drug_subject}} へ読み替える」を遵守し、機序説明行は {{drug_subject}} に置換しない
横展開ソースの明示:
  - P2B 開始時に参照したソースモジュール ID を REFERENCE_USAGE_REPORT へ記録すること
  - 横展開元と新規モジュールの薬効分類が異なる場合は、全 A/P フィールドを対象に
    旧モジュール固有文言のリストと照合すること
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
  例：scenarios[].globalId を moduleId + "_" + scenarios[].id から生成する。
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
■ SCENARIO_DELIMITER_DETECTION_RULE
=======SCENARIOS_START======= の standalone delimiter 検出ルール。
有効な本文開始位置:
  行全体が =======SCENARIOS_START======= に完全一致する行のみを standalone delimiter と判定する。
  判定: line.strip() == "=======SCENARIOS_START=======" のみ許可
無効（本文開始として扱わない）:
  - scenarioEngine.scenarioSection.start: "=======SCENARIOS_START=======" （YAML プロパティ値行）
  - constitution や outputRules 内の参照文字列行
bridge ヘッダーと SCENARIOS 本文を結合する場合:
  - ヘッダーは scenarioEngine / constitution を含めて保持すること
  - constitution.outputRules の後に空行を置いてから standalone delimiter を配置すること
  - scenarioEngine.scenarioSection.start の値を delimiter 検出に使用しないこと
  - SCENARIOS_END も同ルールで判定すること
■ MODULE_BUILD_RULE
drugResolution build補足：
drugResolution.brandToTags は handlingTags の copy ではない。
brandToTags と handlingTags は別概念・別タグ空間である。
- brandToTags: runtime の一般名解決 / drug component 識別タグ（TAG_TO_GENERIC_NAME 経路）
- handlingTags: addonFilter 用の製品取扱タグ（別経路）
両者の値が一致しないことは ERROR ではない。

drugResolution.brandToTags の生成ルール：
P2A実施時はP2A DRUG_RESOLUTION_RULEに従う。
P2A未実施時は以下のルールに従う。
- key は drug.brandCatalog のキーと一致すること
- value は string[] であること
- bridge に明示がある場合のみ値を設定する
- bridge に明示がない場合、既存 canonical JSON の値を保持するか PENDING とする
- handlingTags からのコピー生成・推測生成は禁止
addons.orderPresets build原則:
→ RULES.md §11 参照（object 必須・{} 許容・omit 禁止）
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
- drug.nameAliases の完全一致条件は P0-A drug.nameAliases完全一致ルール を参照する
- drug.nameAliases は drug.search.nameAliases が確定した後に完全複写として生成する
mandatory diff対象：
- brandCatalog
- aliases
- normalizedAliases
- aliasToBrand
- search aliases
- drug.nameAliases（完全一致確認は MANDATORY_DIFF_EXECUTION を参照）
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
- clinicalTags
- counselingTags
- workflowTags
- evidenceRefs
- tone
- addons.orderPresets（build規則はMODULE_BUILD_RULEを参照）
- addonsRef
- P_ADDON
build原則：
- addon本文を変更しない
- addon件数保持
- addon identity保持
- P_ADDON保持
- 参照先存在確認
- clinicalTags / counselingTags / workflowTags / evidenceRefs / intentTags は確定値がない場合でも `[]` で出力する（omit 禁止）
- tone は確定値がない場合でも `"standard"` または `null`（既存同カテゴリ module 準拠）で出力する（omit 禁止）
- 上記フィールドの欠落は tsc / build を通過しても構造 ERROR とする（型として optional でも世代差として禁止）
type → group / targetSection 変換:
→ P0-B の type→group 変換表に従う（→ RULES.md §5 も参照）。
⚠️ 特に side_effect_guidance → group: "sideEffects"（"counseling" ではない）
未定義 type: 推測生成せず CHECK として停止し、マッピングを確認してから再開する。
targetSection 欠落は ERROR（addon が UI に表示されない無声の失敗が起きる）。
mandatory diff対象：
- addon件数
- addon identity
- addon.text
- addonsRef
- P_ADDON
- 全 addon item の group / targetSection 存在確認
- 全 addon item の clinicalTags / counselingTags / workflowTags / evidenceRefs / intentTags / tone 存在確認
■ ADDON_ORDER_RULE
P_ADDON / addonsRef.P の並び順は重要度順とする。bridge 生成段階で順序を決定する。
末尾 append（後から追加した addon を機械的に末尾に追加すること）は禁止する。
優先順位（高い順）:
1. 薬剤固有で患者説明頻度が高い指導（例: GI 症状対策）
2. 重大・重要な副作用注意（例: 低血糖注意喚起）
3. 疾患・生活指導（例: 血糖指導 / カリウム / 血圧 / 脂質 / 尿酸）
4. 状況依存指導（例: シックデイ）
後から addon を追加する場合も、上記優先順位を維持して挿入位置を決定する。
■ CLINICAL_VALIDITY_RULE
シナリオは網羅性だけで作らない。薬剤特性・副作用機序と一致しないシナリオは生成しない。
注射薬モジュールの禁止シナリオ:
- 注射部位反応に対する「減量」シナリオ（注射部位反応は「量の問題」ではなく「手技・部位の問題」のため）
  適切な対応: 注射手技確認 / 部位ローテーション / 経過観察 / 変更 / 中止
薬剤特性と副作用機序の整合性確認:
- ある副作用への対応シナリオを生成する前に、その対応が当該薬剤の副作用機序と合致しているか確認する
- 合致しない場合はシナリオを作らない（bridge 原稿に明示がある場合でも要確認）
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
mergePolicy.S.groupKey build原則:
- scenarioGroup と mergePolicy.S.groupKey は別概念であり、自動転用してはならない。
  - scenarioGroup: UI分類・メニュー表示・シナリオグループ識別子
  - mergePolicy.S.groupKey: Sフィールドのマージ先を決定するキー（composition.groupKeyRegistry参照）
- mergePolicy.S.groupKey は、対象module の composition.groupKeyRegistry に存在する値のみ使用する。
- reference copy 時も、copy元の groupKey 値をそのまま採用せず、
  target module の composition.groupKeyRegistry に照合してから採用すること。
- 照合の結果、一意に決定できない場合は PENDING とする。
- groupKeyRegistry が未定義または空配列の場合は NOT_CHECKED とする。
scenarioGroup → mergePolicy.S.groupKey 参照表（転用禁止・照合用）:
- side_effect → side_effect_monitoring  ← 名称が異なる代表例
- side_effect_monitoring → side_effect_monitoring
- adherence / adherence_good / adherence_poor → adherence
- treatment_end / end_improved / end_insufficient_effect / end_ineffective → treatment_end
- digestive / hypoglycemia / pancreatitis / injection_site → side_effect_monitoring
- treatment_start → treatment_start（または domain固有の groupKeyRegistry 値）
- treatment_adjustment → treatment_adjustment
- as_needed → as_needed
- lifestyle_guidance → lifestyle_guidance
- 上記以外の scenarioGroup: groupKeyRegistry に存在するエントリから一意に照合できる場合のみ採用。
  一意に決定できない場合は PENDING とする。
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
- clinicalTags / counselingTags / workflowTags は確定値がない場合でも `[]` で出力する（omit 禁止）
- 上記フィールドの欠落は tsc / build を通過しても構造 ERROR とする（型として optional でも世代差として禁止）
treatment_end 系 scenarioGroup 個別値ルール（必須）:
→ RULES.md §12 参照（end_improved / end_insufficient_effect / end_ineffective の個別値を使用。"treatment_end" を scenarioGroup に設定しない）
sickday シナリオの situationFilter ルール（必須）:
→ RULES.md §13 参照（["sickday"] のみ。"general" を含めてはならない）
O フィールド薬剤名ルール（全シナリオ必須）:
→ RULES.md §16 参照。必ず {{drug_subject}} を使用する。P2 後に全シナリオの O フィールドを grep 確認する。
CROSS_MODULE_DERIVATION_CHECK の旧モジュール固有文言チェックと組み合わせて実施する。
mandatory diff対象：
- scenario件数
- scenario identity
- S/O/A/P
sideEffectPresence / sComposition build原則:
→ 有効値・禁止値・禁止キー・intent 有効値は RULES.md §17 に従う。
- sideEffectPresence が有効 7 値以外 → ERROR
- sComposition に禁止 template / 禁止キー（adjustmentCodes 等）/ 禁止 intent → ERROR
■ STRUCTURED_BUILD_RULE
以下を扱う: SStructured / OStructured / AStructured / PStructured / Structured.text
build原則:
- P0-B 格納規則のみ使用
- 本文から推測生成しない
- 医学的意味補完禁止
- Structured のために本文変更しない
- 同期不能は ERROR / PENDING
Structured.role 有効値・禁止語彙: → RULES.md §17 参照。
P2B 確認必須事項:
- SStructured.role に禁止語彙 → ERROR（禁止語彙: treatment_adjustment_reason / adherence_observation / side_effect_observation / symptom_observation）
- AStructured.role に禁止語彙 → ERROR（禁止語彙: drug_mechanism / lifestyle_assessment）
- PStructured.role に禁止語彙 → ERROR（treatment_start_reason / followup_monitoring）
- Structured.role に推測生成新規語彙（ユーザー未確認）→ ERROR
- usage / as_needed 系・lifestyle_guidance 系の S 行: adherence_status を使用
- AStructured の lifestyle_guidance / usage 系 A 行: treatment_assessment を使用
- side_effect 系 S 行の区別: sideEffectPresence=absent_or_not_observed → side_effect_status / present_* → side_effect_presence（混同禁止）
- treatment_start 系 intent 細分: initial/new_addition系 → new_addition / restart系 → restart / external_start系 → external_continuation（一律 new_addition 禁止）
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
注射薬モジュール（composition.nodeKey に `_injection` を含む）での thirdPanelSPlacement 必須追加:
→ RULES.md §14 参照（固定値・対象 3 シナリオ id）。bridge 未記載でも model_managed 項目として必須追加する。
欠落は構造 ERROR。
■ BASELINE_PERSONA_PRESERVATION_EXECUTION
→ P1 BASELINE_PERSONA_PRESERVATION（Rule 3）に従う。
mandatory diff 対象:
- bridge tone
- 説明密度
- 距離感
- counseling weight
■ MANDATORY_DIFF_EXECUTION
→ P1 MANDATORY_PRESERVATION_TARGETS（Rule 4）の全件について PASS / FAIL / NOT_CHECKED を付ける。
対象項目の定義は P1 Rule 4 を参照すること。
各 check は status: PASS / FAIL / NOT_CHECKED を必ず付ける。
特記: drug.nameAliases === drug.search.nameAliases（順序・表記・エントリ数の完全一致を確認）

P2B 固有追加チェック（P1 MANDATORY_PRESERVATION_TARGETS 外）:
Structure:
- addons.orderPresets が object として存在すること（欠落は FAIL、{} は PASS）
MergePolicy:
- scenarios[].mergePolicy.S.groupKey が composition.groupKeyRegistry に存在すること
  （groupKeyRegistry が空または未定義の場合は NOT_CHECKED）
- check_name: mergePolicy_groupkey_check
- status: PASS / FAIL / NOT_CHECKED
DrugResolution:
- drugResolution.brandToTags
- key が drug.brandCatalog のキーと一致していること
- value が string[] であること
- （brandToTags と handlingTags の値一致は検査しない — 別概念）
■ POST_BUILD_MANDATORY_AUDIT
canonical JSON 生成後・P3 移行前に必ず実施する追加監査。
[A] ROLE_MAPPING_UNCLEAR 残存チェック
  SStructured / AStructured / PStructured の全 item を対象に、
  "notes" フィールドに "ROLE_MAPPING_UNCLEAR" を含む item が存在しないか確認する。
  存在する場合: ERROR（P3 移行禁止）
  対応: notes を持つ item の role を確立済み語彙へ置換し、notes フィールドを削除する
[B] 旧モジュール固有文言残存チェック
  CROSS_MODULE_DERIVATION_CHECK を参照。
  横展開元モジュール固有の薬効分類名・機序説明が残存していないか S/O/A/P を全件確認する。
[C] lifestyle_guidance / usage 系 Structured role チェック
  type=lifestyle_guidance または type=usage の SStructured.role が
  adherence_status 以外（特に lifestyle_assessment）になっていないか確認する。
  該当する場合: ERROR（道標: adherence_status へ置換）
[D] drugResolution.brandToTags 確認
  bridge に明示がない場合: {} のまま維持すること
  handlingTags からのコピー生成・推測生成は禁止（P2B では bridge 未明示なら {} のみ許可）
[E] ADDON.requiredTags と handlingTags の整合確認
  requiredTags が設定された ADDON を P_ADDON に持つシナリオの brandCatalog を確認し、
  当該 tag に到達できる brand が存在することを確認する
■ ERROR_PENDING_RULE
→ 共通 ERROR / PENDING 条件は RULES.md §3 に従う。推測補完せず停止する。
P2B 固有 ERROR 条件（RULES.md §3 に加えて）:
- P2A実施時、P2A Model JSON draft に placeholder marker が残存
- RESOLVE_RECOMMENDED 項目を deterministic に解消可能であるにもかかわらず未解決のまま OUTPUT_JSON へ進めた状態
- bridge 明示の commonSearchTokens / formulationSearchTokens / matchPolicy が canonical JSON に反映されていない状態
- Structured 同期不能 / Express 参照不能
P2B 固有 PENDING 条件（RULES.md §3 に加えて）:
- P2A実施時、P2A CHECK_ITEMS の P2B前解決推奨項目が未解決
- P2A実施時、P2A UNRESOLVED_STRUCTURE のうち P2B で確定不能な項目
P2A CHECK_ITEMS の例外処理:
- NOT_APPLICABLE_CANDIDATE と分類され対象 module 非該当の理由が明示できる場合: PENDING ではなく CHECK または非該当記録として扱う
- RESOLVE_RECOMMENDED と分類され同一 canonical JSON 内の確定済み field から deterministic に解消可能な場合: PENDING にせず P2B で解消してよい
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
→ RULES.md §2 PROHIBITED_UNIVERSAL が全て適用される。
P2B 固有の追加禁止事項:
- P3/P4/P5 先取り
- ERROR 存在時の修正済み canonical JSON 全文出力
- OUTPUT UNIT 外の値生成
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
