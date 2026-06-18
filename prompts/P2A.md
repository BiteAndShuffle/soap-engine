SOAPエンジン P2A

Model JSON Draft Build System

■ 役割
これは、必要に応じて、完成済みbridge原稿をP2Bでcanonical JSON化する前に、
対象モジュール専用のModel JSON draftを作成する任意工程である。

■ 本質
これはP2Bではない。
これはcanonical JSON buildではない。
これはbridge本文のJSON移植ではない。
これは本文作成ではない。
これは医学的補完ではない。
これはcreative buildではない。

「完成済みbridge原稿に存在する構造identityと明示構造情報をもとに、
後続P2Bで使用するためのModel JSONの器を、
non-creative / non-preservation-breakingに作成する作業」である。

■ 入力
必要に応じて以下を使用する。
1. 完成済みbridge原稿
2. 人間が添付または明示指定した既存参考Model JSON
3. P0-A出力
4. P0-B出力
5. P0-C出力
6. P1出力
7. 必要に応じて人間が添付または明示指定した既存canonical JSON
8. 必要に応じて前回buildログ / validationログ

※P2Aではbridge本文を修正しない。
※P2Aではcanonical JSONを作成しない。
※P2Aでは医学的判断を行わない。
※P2Aではcreative buildを行わない。
※P2AではP2B/P3/P4/P5を先取りしない。
※既存canonical JSONは参考としてのみ使用する。

■ STANDARD_REFERENCE_PATHS
ローカルリポジトリを参照できる場合、構造確認用として以下の標準パスを確認してよい。

- data/modules/
- data/modules/index.ts
- lib/types.ts

ただし、この章は「参照してよい場所」を示すものであり、
最新Model JSON / 既存canonical JSON をClaudeが自動選定してよいことを意味しない。

最新Model JSON / 既存canonical JSON は、
人間が添付または明示指定したものを優先する。

未指定の data/modules 内 JSON を、
Claudeが勝手に「最新Model JSON」「既存canonical JSON」「対象moduleの参考正本」として選定してはならない。

■ 作成してよいもの
以下は
「bridge / P0-A / P0-B / P0-C / P1 から一意に決まる場合のみ」
構造枠として作成可能とする。

一意に決まらない場合は、
CHECK_ITEMS または UNRESOLVED_STRUCTURE へ送る。

- moduleId
- moduleVersion
- categoryPath
- composition
- drug
- brandCatalog
- aliasToBrand
- drug.search
- drugResolution
- searchConfig
- index
- display
- defaults（followup本文除く）
- ui
- persona（persona本文除く）
- tagCatalog
- expressModes（bridge / P0系定義 / 対象module定義に明示がある場合のみ）

scenario枠：
- scenario identity schema / container
- scenario reference container
- scenario本文は作成しない

保持可能なscenario identity例：
- scenario.id
- scenario.title（bridge headerに明示されている場合のみ）
- scenarioType（bridge headerに明示されている場合のみ）
- followupRef（bridgeに明示されている場合のみ）
- bridge上で明示されたscenario identity field

addon枠：
- addon identity schema / container
- addon reference container
- addon本文は作成しない

保持可能なaddon identity例：
- addon.key
- addon.id
- addon.title（bridge headerに明示されている場合のみ）
- bridge上で明示されたaddon identity field

followup枠：
- followup identity schema / containerのみ
- followup本文は作成しない

保持可能なfollowup identity例：
- followupRef
- followupProfiles key
- defaults.followup key
- bridge上で明示されたfollowup identity field

■ 禁止
- S/O/A/P本文を作成しない
- bridge本文をJSONへ移植しない
- P_APPEND本文を作成しない
- P_CLOSING本文を作成しない
- aliasを推定生成しない
- search aliasを補完しない
- followup文を生成しない
- persona本文を生成しない
- 医学的本文を補完しない
- 既存参考Model JSONをそのまま流用しない
- 他module由来の値を固定値として使わない
- creative draftを作成しない
- deterministic外補完を行わない

■ 原則
- bridgeに明示された構造identityのみ保持対象とする
- bridgeに明示されていない値は推測しない
- 不明点はCHECK_ITEMSへ送る
- Model JSONとしての器だけを作る
- 本文preservationはP2B責務として扱う
- deterministic draftのみ許可する
- draft completenessよりnon-creative原則を優先する

保持対象identity：
- scenario identity
- addon identity
- brand identity
- alias identity
- followup identity
- express identity（bridge / Model JSON / P0系定義 / 対象module定義に明示がある場合のみ）
- thirdPanel identity（bridge / Model JSON / P0系定義 / 対象module定義に明示がある場合のみ）

※本文保持・preservation buildはP2Bで扱う。

■ STRUCTURE_DERIVATION_RULE
- bridgeから一意に取得できるものはbridgeを優先する
- P0-A / P0-B / P0-C / P1で定義済みの共通構造はその定義を優先する
- 既存参考Model JSONは構造パターン確認にのみ使用する
- 既存参考Model JSONの値・ラベル・分類・表示文言・検索語を対象moduleへ流用しない
- 対象module固有値として一意に決まらないものはCHECK_ITEMSへ送る
- draft completenessよりnon-creative原則を優先する

■ MODULE_SPECIFIC_FIELD_RULE
既存参考Model JSONに存在するfieldであっても、
対象moduleのbridge / P0-A / P0-B / P0-C / P1 / 対象module定義から
構造的に必要性が確認できないfieldは強制継承しない。

特に以下は、参考Model JSON固有fieldとして扱う。

- contactLensCaution
- contactLensCautionLevel
- bakStatus
- expressModes
- thirdPanelSPlacement
- display.localInput

これらは、
bridge / P0-A / P0-B / P0-C / P1 / 対象module定義に明示がある場合のみ作成する。

対象module定義上、適用対象外候補と分類できる場合は、
MODEL_JSON_DRAFT内にplaceholderとして残さず、
CHECK_ITEMSに以下の形式で記録する。

- decision_candidate: NOT_APPLICABLE
- reason:
- confirm_required:

■ DRUG_RESOLUTION_RULE

drugResolution.brandToTags は、
bridgeに明示がない場合でも、
同一MODEL_JSON_DRAFT内の
drug.brandCatalog[brand].handlingTags から
機械的に一意生成できる場合のみ作成してよい。

これはbridge外補完ではなく、
同一module内の既存確定値からの deterministic mapping として扱う。

作成形式：

drugResolution:
  brandToTags:
    "{brandName}":
      - brandCatalog[brandName].handlingTags の全要素

禁止：
- handlingTagsに存在しないtagを追加しない
- brand固有判断を推測しない
- 検索性向上目的でtagを増やさない
- 空arrayで逃がさない。ただしhandlingTags自体が空であることが確定している場合のみ空array可

■ PLACEHOLDER_RULE
- 本文fieldに仮本文・空文字・TODO文を入れない
- "TBD" / "TODO" / "仮" / "後で入力" 等のplaceholder文字列は禁止する

本文fieldの扱い：
- P2AのMODEL_JSON_DRAFT内には
  S / O / A / P /
  addon.text /
  followupProfiles[key].P
  を格納しない
- これらの本文fieldは
  P2Bでbridgeから移植する対象として扱う
- Model JSON draft上で本文fieldが必要な場合は
  UNRESOLVED_STRUCTUREへ送る
- P0-A上で必須fieldであっても、
  P2Aでは空文字・仮文・placeholderを入れない

- "__UNRESOLVED__" / "__UNRESOLVED_SEE_CHECK__" / "__P2B__" / "__P2B_BRIDGE_MIGRATE__" 等のmarkerをMODEL_JSON_DRAFT内に残さない
- 未確定値をplaceholder文字列として JSON value / array element / object key に格納しない
- 未確定fieldは、fieldごと削除し、UNRESOLVED_STRUCTURE または CHECK_ITEMS へ送る
- 空array [] は「構造的に空であることが確定している場合」のみ許可する
- 空object {} は「構造枠だけが確定している場合」のみ許可する
- 未確定であることを表すために [] / {} を使用しない

■ 既存canonical利用原則
- 既存canonical JSONは参考のみ
- draft決定根拠の主軸にはしない
- bridge / P0-A / P0-B / P0-C / P1を優先する
- bridgeと矛盾する値は保持しない
- bridgeにない値を既存canonicalから補完しない
- reference_used_from_existing は
  構造パターン参照のみを記録する
- 値継承・内容継承を意味しない

■ REFERENCE_FILE_SELECTION_RULE
P2Aで使用する既存参考Model JSON / 既存canonical JSON は、
人間が添付または明示指定したものを優先する。

Claudeがローカルリポジトリを参照できる場合でも、
data/modules 内のJSONを自動で最新Model JSON候補として選定してはならない。

参照可能なのは以下に限る。

- 人間が添付したファイル
- 人間が明示指定したパス
- P0-A / P0-B / P0-C / P1で指定された参照ファイル
- STANDARD_REFERENCE_PATHSで許可された構造確認用パス

ただし、STANDARD_REFERENCE_PATHSで許可されたパスは、
構造確認・登録状況確認・型確認のための参照に限定する。

禁止：
- data/modules 内のファイルを勝手に「最新Model JSON」と判断する
- data/modules 内のファイルを勝手に「既存canonical JSON」と判断する
- 別領域モジュールを対象moduleのModel JSONとして扱う
- 既存参考Model JSONの値を対象moduleへ流用する
- 参照元不明の構造をdraftへ混入する

既存参考Model JSON / 既存canonical JSON を参照した場合は、
必ず以下を出力する。

- referenced_file:
- referenced_path:
- reference_purpose:
- inherited_value: なし / あり

■ DRAFT_STOP_CONDITION
以下はP2A停止条件である。

- bridge未完成
- draft生成に必要なminimum identity不足
- scenario identityがdraft上で一意に確定できない
- addon identityがdraft上で一意に確定できない
- Model JSON器として必須構造が一意に決まらない
- P0-A / P0-B / P0-C / P1との前提不一致
- bridgeおよびP0系定義から構造決定不能
- deterministicでないdraft生成が必要になる状態

不明点は推測せず、
CHECKまたはDRAFT_STOPPEDとする。

■ 出力
[P2A_SUMMARY]
- status:
  - DRAFT_OK
  - DRAFT_OK_WITH_CHECK
  - DRAFT_STOPPED
- reason:
- reference_used_from_existing:
  - 既存参考Model JSON / 既存canonical JSONを参照した場合のみ記録する
  - STANDARD_REFERENCE_PATHSによる構造確認のみの場合は「なし」とする
- structure_reference_used:
  - data/modules/
  - data/modules/index.ts
  - lib/types.ts
  ※参照した場合のみ記録する
- not_final:
- check_required:

DRAFT_OK条件：
- UNRESOLVED_STRUCTUREがP2B移植対象本文fieldのみに限定されている
- 本文field以外のModel JSON器が実行可能な状態である
- CHECK_ITEMSが存在しない

DRAFT_OK_WITH_CHECK条件：
- Model JSON draftは作成可能
- DRAFT_STOP_CONDITIONには該当しない
- ただしP2B前に確認すべき未確定構造またはCHECK_ITEMSが残る

[DRAFT_IDENTITY_REPORT]
bridge由来identity一覧

対象：
- scenario ids
- scenario titles
- scenarioTypes
- addon keys / ids
- addon titles
- brand identities
- alias identities
- followup identities
- express identities
- thirdPanel identities
- unresolved identities

[MODEL_JSON_DRAFT]
対象module用 Model JSON draft

※これはcanonical JSONではない。
※これはP2Bでcanonical JSONをbuildするための
Model JSON基準draftである。
※S/O/A/P / addon.text /
followupProfiles[key].P 等の本文格納は禁止する。
※draft内に空文字・TODO・仮本文・placeholder本文を入れない。
※未確定fieldをplaceholder文字列で格納しない。
※未確定fieldはfieldごと削除し、UNRESOLVED_STRUCTUREまたはCHECK_ITEMSへ送る。
※"__UNRESOLVED__" / "__UNRESOLVED_SEE_CHECK__" / "__P2B__" / "__P2B_BRIDGE_MIGRATE__" 等のmarkerはMODEL_JSON_DRAFT内に残さない。

[UNRESOLVED_STRUCTURE]
UNRESOLVED_STRUCTUREは、MODEL_JSON_DRAFT内にplaceholderとして残さず、
P2Bで確定・移植・構造化する対象を外部記録するための領域である。

- draft内部構造またはP2B移植対象の未確定
- 人間確認不要の構造未確定を扱う

対象例：
- unresolved scenario container
- unresolved addon container
- unresolved followup container
- unresolved expressModes container
- unresolved thirdPanel container
- unresolved persona container
- unresolved search / alias container
- unresolved display / ui container
- unresolved composition / merge container
- unresolved body field container
- P2B移植対象本文field

※未確定fieldをplaceholder文字列で格納しない。
※未確定fieldはfieldごと削除し、UNRESOLVED_STRUCTUREまたはCHECK_ITEMSへ送る。
※"__UNRESOLVED__" / "__UNRESOLVED_SEE_CHECK__" / "__P2B__" / "__P2B_BRIDGE_MIGRATE__" 等のmarkerはMODEL_JSON_DRAFT内に残さない。

[CHECK_ITEMS]
CHECK_ITEMSは、人間確認・P0/P1参照・app側方針確認が必要な項目を扱う。
* 人間確認またはP0/P1参照が必要な前提事項
* 構造未確定であっても確認依存のものを扱う
* CHECK_ITEMS対象のfieldは、MODEL_JSON_DRAFT内にplaceholderとして残さない

■ CHECK_CLASSIFICATION_HINT
CHECK_ITEMSには、後工程で判断しやすいように以下の分類候補を付ける。

- RESOLVE_RECOMMENDED
  deterministicに解消可能で、後工程のPENDING化を避けるべき項目

- DEFER_CANDIDATE
  方針未確定だが、現moduleの成立・runtime受理を妨げない項目

- NOT_APPLICABLE_CANDIDATE
  参考Model JSON由来だが、対象moduleには非該当と考えられる項目

- APP_CONFIRM_REQUIRED
  app実装・UI・runtime側の受け口確認が必要な項目

例：
- drugResolution.brandToTags:
  classification_hint: RESOLVE_RECOMMENDED
  reason: brandCatalog.handlingTagsからdeterministic mapping可能

- expressModes:
  classification_hint: DEFER_CANDIDATE
  reason: 対象moduleでのExpress Mode適用方針が未確定

- contactLensCaution / contactLensCautionLevel / bakStatus:
  classification_hint: NOT_APPLICABLE_CANDIDATE
  reason: 眼科用点眼薬固有fieldであり、対象moduleには非該当

[PROHIBITED_INFERENCE_REPORT]
推測生成を避けた項目一覧

[P2B_HANDOFF]
P2Bへ渡すもの：

- Model JSON draft
- DRAFT_IDENTITY_REPORT
- UNRESOLVED_STRUCTURE
- CHECK_ITEMS
- 本文未移植確認
- reference_used_from_existing
- structure_reference_used
- DRAFT_STOP_CONDITION該当有無
- P2Aステータス
- placeholder残存確認
- P2B前に解決推奨のCHECK
- P2B中に処理可能なCHECK
- P2A再実行要否

P2Aステータス表記：
- placeholder残存なしの場合：
  P2Aステータス: PATCH完了 / placeholder残存なし / P2A draftとして使用可能 / 一部CHECKあり

P2A LOCKED：
- このdraftに対するplaceholder除去・P2Aルール違反修正は完了済みとして扱う。
- ただしCHECK_ITEMSに残る項目は、P2B前提条件またはP2B中の確認対象として処理する。
- P2A再実行ではなく、P2B_HANDOFFとして扱う。


■ 判定方針
- bridgeを構造identityの正本として扱う
- P0-A / P0-B / P0-C / P1に従う
- Model JSON draftはP2B用の器としてのみ扱う
- deterministic draftのみ許可する
- 不明点は推測せずCHECKまたは停止する
- draft completenessよりnon-creative原則を優先する
- bridge preservation違反を誘発するdraftを作らない
- P2B/P3/P4/P5でP2A起因のcreative補正を行わせない

■ 禁止
- canonical JSONを作成する
- bridge本文を修正する
- JSON移植する
- 医学判断する
- alias生成する
- followup生成する
- persona生成する
- creative buildする
- app修正する
- deterministic外補完を行う
- P2B/P3/P4/P5監査を先取りする

■ 最重要指示
これはP2Bではない。
canonical JSONを作るな。
Model JSON draftをcanonical JSON完成物として出力するな。
bridge本文を移植するな。
本文を作るな。
補完するな。
推測するな。
本文fieldを埋めるために
空文字・仮文・TODOを入れるな。
deterministic draftのみ許可せよ。
P2Bが迷わないModel JSONの器だけを作れ。
※既存Model JSONをbuild器として利用できる場合、P2Aは省略可能である。
※P2A未実施のみを理由としてP2B停止条件にしてはならない。
