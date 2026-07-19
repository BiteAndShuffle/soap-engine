SOAPエンジン P0-C

APP RULE 定義
■ 役割
これは、P0-A / P0-Bで定義されたModel JSON構造・JSON RULEをもとに、
canonical JSONを既存アプリがどのように受け取るかを定義する工程である。
■ 本質
これはアプリ実装修正ではない。
これはJSON修正ではない。
これはJSON移植ではない。
これは実装確認ではない。
これは本文監査ではない。
これはruntime確認結果を出す工程ではない。
これはOK / NG判定を行う工程ではない。
「canonical JSONが、
既存アプリの共通受け口において、
検索・表示・SOAP生成・複数剤合成・Express Mode・thirdPanel・persona構造として
どのように解釈されるべきかを定義する作業」である。
■ 入力
1. P0-A出力
2. P0-B出力
3. latest_model_json_for_app_structure

※P0-Aで使用したModel JSON。
※app受け口・型・参照パス・共通構造の確認補助としてのみ使用する。
※件数・scenario一覧・followup使用分布・addon key・brand名・alias数・expressModes件数などの実体値を固定値として扱わない。
※P0-Cでは実体値をAPP RULEへ持ち込まない。
※P0-Cでは構造・型・参照パス・受け口確認対象のみを扱う。

4. 既存型定義（lib/types.ts）

5. 既存loader / runtime受け口
   （lib/buildSoap.ts
    lib/moduleValidator.ts
    lib/soapComposer.ts）
6. 既存runtime確認補助
   （lib/validationRunner.ts）
7. 既存module registry
   （data/modules/index.ts）
※4〜7の固定受け口ファイルについては
【固定受け口ファイル運用】に従う。
8. 必要に応じて既存基準JSON
9. 必要に応じて前回差分メモ
※P0-Cではコード修正しない。
※P0-CではJSON修正しない。
※P0-Cでは実行確認しない。
※P0-Cではruntime確認結果を出さない。
※P0-CではOK / NG判定をしない。
※P0-Cでは薬剤個別ロジックを作らない。
※P0-Cでは4A / 4Cを先取りしない。
【固定受け口ファイル運用】
以下のファイルはSOAPエンジン共通受け口として扱う。
lib/types.ts
lib/buildSoap.ts
lib/moduleValidator.ts
lib/soapComposer.ts
lib/validationRunner.ts
data/modules/index.ts
内容変更がない限り再添付不要とする。
未添付のみを理由として
- P0-C停止
- CHECK化
- 受理保留
- 変更有無不明扱い
を行ってはならない。
これらのファイルは、
前回確認済みの共通受け口として扱う。
ただし以下の場合のみCHECK対象としてよい。
- 前回確認後に構造変更が報告された場合
- APP RULE定義に影響する変更が報告された場合
- P3/P4 HANDOFFに影響する変更が報告された場合
固定受け口ファイルについて、以下のみを理由としてCHECK化してはならない。
  未添付
  再添付なし
  変更有無不明
  差分未確認
  現時点で未確認
  のみを理由として
  CHECK化・受理保留・停止を行ってはならない
CHECK対象とできるのは、
構造変更・仕様変更・APP RULE影響・P3/P4 HANDOFF影響が
実際に報告された場合のみとする。
内容確認が必要な場合のみ再添付を要求してよい。
■ 出力
[P0C_APP_RULE]
1. APP_RULE_SCOPE
- 本APP RULEが対象とするアプリ受け口範囲
- 対象外範囲
- P3へ渡す確認対象
- P4へ渡す確認対象
- 本APP RULEはcanonical JSON → app受け口解釈を対象とする
- bridge → canonical変換責務はP2責務として扱う
- bridge → canonical変換結果のruntime妥当性確認はP4責務として扱う
- 本APP RULEではbridge → canonical変換を扱わない
- latest_model_json_for_app_structure 上の実体値はAPP RULE固定値として扱わない
- APP RULEは構造・型・参照パス・受け口解釈のみを対象とする
- 実体値確認はP3/P4確認対象とする

2. TYPE_INTEGRATION_RULE
- TypeScript型定義との対応
- 必須key
- 任意key
- 型許容
- null許容 / 非許容
- array / object / string / boolean / number
- 型定義上のCHECK対象
3. LOADER_RULE
- module読み込み前提
- moduleId参照
- categoryPath参照
- composition参照
- drug参照
- scenarios読み込み
- addons読み込み
- defaults読み込み
- expressModes読み込み
- persona読み込み
- loaderが期待する最低構造
4. INDEX_REGISTRATION_RULE
- index.ts登録前提
- import / export
- registry登録
- moduleId重複禁止
- 検索対象moduleとして成立する条件
5. SEARCH_RULE
- drug.search
- brandCatalog
- aliasToBrand
- drug.nameAliases
  （P0-A / latest_model_json_for_app_structure 上に正式pathとして存在する場合のみ検索対象）
  （存在しない場合はsearch.nameAliases等へ推測転記しない）
- searchConfig
- search.exactAliases
- search.prefixAliases
- search.nameAliases
- exactAlias優先
- prefix検索
- alias衝突確認
- cross module suggestion抑制
6. UI_RULE
- display
- ui.panels
- panelOrder
- defaultPanelId
- scenario一覧表示
- addon一覧表示
- addon表示条件はapp受け口解釈として定義する
- addon filter実装・runtime動作確認はP4_HANDOFFへ送る
- brand表示
- generic表示
- 意図しないempty stateの発生をCHECK対象とする
- UI表示上のCHECK対象
7. SOAP_GENERATION_RULE
- scenarios[].S
- scenarios[].O
- scenarios[].A
- scenarios[].P
- addonsRef
- followupRef
- defaults.followup
- defaults.followupProfiles
- P_ADDON反映
- P_CLOSING反映
- Structured参照
- S/O/A/Pが空・undefined・nullにならない条件
- followup文をapp側で生成しない
- P_CLOSINGをapp側で補完しない
- addonsRef未解決時はP4確認対象とする
- addonsRef未解決時のruntime挙動はP4_HANDOFF確認対象とする
- resolveAddonText等のruntime結果をP0-Cで断定しない
- Structured構造はModel JSON管理項目として参照する
- Structured構造がModel JSON上に存在する場合のみ参照対象とする
- Structured非存在モジュールでは参照しない
- app側でStructured構造を生成・補完しない
- Structured不整合はP4補正ではなくP2/P3確認対象とする
8. MULTI_DRUG_MERGE_RULE
- composition.sMergePolicy
- composition.domainPolicy
- groupKeyRegistry
- mergePolicy
- groupKey
- mergeLevel
- sectionRole
- S merge挙動
- 複数剤合成時の上書き / 分離 / 統合条件
- merge挙動はapp受け口解釈として定義する
- runtime merge結果・normalize挙動確認はP4_HANDOFFへ送る
9. THIRD_PANEL_RULE
- thirdPanelSPlacement
- third panel表示条件
- S置換 / S保持ルール
- composition baseとの関係
- rapid / express的挙動との関係
- thirdPanel関連CHECK対象
10. EXPRESS_MODE_RULE
- expressModes[]
- enabled
- defaultBrandName
- defaultScenarioId
- expressCategory
- expressGroup
- expressSubGroup
- label
- sortOrder
- enabled=true時の必須参照
- enabled=false時の扱い
- Express対象外moduleの扱い
- brandCatalog全件確認との接続
11. PERSONA_APP_RULE
- persona
- availableStyles
- styleProfiles
- baseline persona
- persona切替余白
- S/A/P本文との分離
- 将来persona scaling時の受け口
一周目：
- persona構造はstandard / baselineで許容
- persona未実装のみをNGにしない
- persona本文を機械生成しない
二周目以降：
- styleProfiles確認
- availableStyles確認
- persona切替受け口確認
- persona scaling時の受け口確認
12. ADDON_APP_RULE
- addons.items
- addonsRef
- targetSection
- group
- requiredTags
- intentTags
- addonFilter
- handlingTags
- addon表示条件
- addon参照解決条件
13. BRAND / ALIAS APP_RULE
- brandCatalogをアプリがどう読むか
- aliasToBrandをアプリがどう読むか
- normalizedAliasesをアプリがどう読むか
- search aliasesをアプリがどう読むか
- brandCatalog全件が検索・Express・表示へ渡る条件
- alias推定生成禁止
- bridge外alias追加禁止
14. P3_HANDOFF
P3へ渡すJSON correctness / model validity確認対象を定義する。
- Model JSON型整合
- TypeScript型定義との対応確認はP4_HANDOFFへ送る
- Model JSON準拠
- root必須key
- composition構造
- drug構造
- scenarios構造
- addons構造
- defaults構造
- expressModes構造
- persona構造
- tagCatalog構造
- 参照整合
- groupKeyRegistry整合
- Structured構造準拠（Model JSON準拠）
- Structured構造が存在する場合のみStructured.textを同期対象とする
- Structured runtime挙動確認はP4_HANDOFFへ送る
- runtime再導出一致確認はP4_HANDOFFへ送る
- P3ではJSON構造・参照整合・Model JSON準拠を確認する
- TypeScript型定義・loader受理・UI表示・runtime挙動はP4_HANDOFFへ送る
- latest_model_json_for_app_structure 上の件数・分布・実体値は検証対象ではあるが固定値ではない
- latest_model_json_for_app_structure由来の
  scenario件数
  addon件数
  alias件数
  followup件数
  expressModes件数
については存在確認・構造確認対象であり、
latest_model_json_for_app_structure由来の特定件数を期待値として固定しない

15. P4_HANDOFF
P4へ渡すruntime / app compatibility確認対象を定義する。
- P4では実装受理・runtime挙動・typecheck・build・UI表示・compose/merge挙動を確認する
- P4ではbridge本文・alias・followup・persona本文を補完しない
- preservation runtime recheckはP4責務として扱う
- runtime再導出・runtime補助確認をP4で扱う
- typecheck
- build
- module load
- search
- UI表示
- scenario選択
- addon表示
- SOAP生成
- 複数剤合成
- Express Mode
- thirdPanel
- 既存module影響
- loader受理
- validator受理
- runtime crash有無
- compose / merge挙動
- Structured runtime参照
- Structured構造が存在する場合のみ表示・SOAP参照整合を確認対象とする
- Structured非存在モジュールでは本確認を適用しない
- Structuredが存在する場合でもruntimeで補完・再生成しないこと
16. BRIDGE_PRESERVATION_APP_BOUNDARY
- bridge preservation違反をapp側で吸収しない
- bridge preservation違反をP4 / P5で補正しない
- bridge preservation違反を検出した場合はP2へ差し戻す前提として定義する
- app側でfollowup文を補完しない
- app側でaliasを補完しない
- app側でpersona本文を生成しない
17. PROHIBITED_APP_LOGIC
- 薬剤個別ロジックをアプリ側へ追加しない
- 特定module専用分岐を作らない
- 特定薬剤名でのハードコード禁止
- alias補完ロジックを勝手に追加しない
- followup文をアプリ側で生成しない
- persona本文をアプリ側で生成しない
- bridge preservation違反をP4/P5で補正しない
18. CHECK_ITEMS
- 型定義とModel JSONの対応が不明な項目
- loaderが読むか不明な項目
- UI表示方針が不明な項目
- Express Modeの使用有無が不明な項目
- thirdPanel挙動が不明な項目
- persona将来拡張に関わる項目
- app実装側の受け口確認が必要な項目
- JSON側問題かapp側問題か判定不能な項目
- 固定受け口ファイルについて構造変更が報告された場合のみCHECK対象
- APP RULEへ影響する変更が報告された場合のみCHECK対象
- P3/P4 HANDOFFへ影響する変更が報告された場合のみCHECK対象
19. OUTPUT_REQUIREMENTS
P0-C出力では以下を守る。
- 可能な限りJSONパス / 実装参照箇所で記載する
- JSON側責務とapp側責務を分ける
- P3へ渡す構造確認項目を明示する
- P4へ渡すruntime確認項目を明示する
- CHECK対象を明示する
- 薬剤個別ロジックが必要に見える箇所はCHECKへ送る
- 判断不能なものを推測でOKにしない
■ 判定方針
- P0-AのModel JSON構造基準に従う
- P0-BのJSON RULEに従う
- 既存アプリは共通受け口として扱う
- 薬剤個別実装を前提にしない
- JSON追加のみで動くことを基本方針とする
- Model JSONで確定した共通構造を既存アプリが読めない場合は、app受け口不足としてCHECK対象にする
- JSON側問題とapp側問題を混同しない
- bridge preservation違反はapp側で吸収せず、P2差し戻し前提とする
- 判断できない項目はCHECKとする
■ 禁止
- アプリコードを修正する
- JSONを修正する
- bridge本文を修正する
- 医学的妥当性を評価する
- runtime確認結果を出す
- OK / NG判定を行う
- 実行確認済みと断定する
- 薬剤個別ロジックを提案する
- ハードコードを提案する
- aliasを推定生成する
- followup文を生成する
- persona本文を生成する
- P2 preservation violationをP4/P5で補正する
- P3/P4の監査を先取りする
- build / typecheckを実行したことにする
- 固定受け口ファイル未添付のみを理由としてP0-Cを停止しない
- 固定受け口ファイル未添付のみを理由としてCHECK化しない
- ただし、固定受け口ファイルについて
  構造変更が報告された場合、
  またはP0-C出力・P3/P4 HANDOFFに影響する変更が報告された場合のみ
  CHECK対象とする
- 固定受け口ファイルは、前回確認済みの共通受け口として扱う。
- 未添付・再添付なし・変更有無不明・差分未確認・現時点で未確認のみを理由として、
  P0-C停止・CHECK化・受理保留を行ってはならない。
- ただし、固定受け口ファイルについて構造変更・仕様変更・APP RULE影響・P3/P4 HANDOFF影響が報告された場合のみCHECK対象とする。
■ 最重要指示
P0-Aを読む。
P0-Bを読む。

latest_model_json_for_app_structure は、
app受け口・型・参照パス・共通構造の確認補助としてのみ扱う。

latest_model_json_for_app_structure 上の

- 件数
- scenario一覧
- followup使用分布
- addon key
- brand名
- alias数
- expressModes件数
- scenario使用状況
- addonsRef使用状況

などの実体値を、
今回moduleのAPP RULE固定値として扱ってはならない。

P0-Cでは、
構造・型・参照パス・app受け口・runtime確認対象のみを定義する。

既存アプリの共通受け口は、固定受け口ファイル運用に従い、前回確認済みの共通受け口として扱う。

ただし、構造変更・仕様変更・APP RULE影響・P3/P4 HANDOFF影響が報告されている場合のみ、必要に応じて再確認対象とする。
canonical JSONをアプリがどう受け取るべきかだけを定義する。
コードを直すな。
JSONを直すな。
本文を直すな。
薬剤個別ロジックを作るな。
runtime確認をするな。
OK / NG判定をするな。
判断不能はCHECKにせよ。
P3/P4が迷わない APP RULE を作れ。
実確認ではなく、P3/P4へ渡すapp受け口・runtime確認対象だけを定義せよ。
