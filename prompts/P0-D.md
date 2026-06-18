SOAPエンジン P0-D

Model JSON 差分整理
■ 役割
これは、Model JSON・JSON RULE・APP RULEの更新差分を整理し、
P2/P3/P4/P5へ影響伝播するための工程である。
■ 本質
これはJSON修正工程ではない。
これはJSON移植工程ではない。
これはアプリ実装修正工程ではない。
これは本文監査工程ではない。
これは修正指示生成工程ではない。
これはchange request生成工程ではない。
これは実装タスク生成工程ではない。
「Model JSON更新により、
どの構造・格納ルール・アプリ受け口・検証工程へ影響が出るかを整理し、
deterministicに反映できる候補、CHECK対象、HOLD対象、DEFER対象を分ける作業」である。
■ 入力
1. 旧Model JSON
2. 新Model JSON
3. P0-A出力
4. P0-B出力
5. P0-C出力
6. 必要に応じて既存基準JSON
7. 必要に応じて前回差分メモ
※P0-Dでは対象JSONを修正しない。
※P0-Dでは実装コードを修正しない。
※P0-Dではbridge本文を評価しない。
※P0-Dでは差分の影響整理のみ行う。
※P0-Dではdeterministic candidateを抽出するのみで、適用は行わない。
■ 出力
[P0D_MODEL_DIFF_REPORT]
1. DIFF_SCOPE
- 比較対象
- 旧Model JSON
- 新Model JSON
- 差分整理対象
- 対象外範囲
- root diff
- object diff
- field diff
- reference diff
- identity diff
2. STRUCTURAL_DIFF
Model JSON構造差分を整理する。
- 追加key
- 削除key
- 変更key
- 型変更
- 必須 / 任意変更
- null許容変更
- array / object / string / boolean / number変更
- enum変更
- default / fixed value変更
3. JSON_RULE_IMPACT
P0-B JSON RULEへの影響を整理する。
- 格納先変更
- 格納形式変更
- required / optional変更
- OUTPUT UNITへの影響
- bridge → canonical mappingへの影響
- preservation firewallへの影響
- mandatory diff項目への影響
4. APP_RULE_IMPACT
P0-C APP RULEへの影響を整理する。
- TypeScript型定義への影響
- loaderへの影響
- index登録への影響
- searchへの影響
- UI表示への影響
- SOAP生成への影響
- 複数剤合成への影響
- Express Modeへの影響
- thirdPanelへの影響
- persona受け口への影響
5. BRIDGE_PRESERVATION_IMPACT
P2 bridge preservationへの影響を整理する。
- brandCatalog
- aliases
- normalizedAliases
- aliasToBrand
- search aliases
- drug.nameAliases
- S/O/A/P
- P_APPEND
- P_CLOSING
- defaults.followup
- followupProfiles
- followupRef
- addon参照
- scenario identity
- addon identity
- baseline persona preservation
6. VALIDATION_IMPACT
P3 validationへの影響を整理する。
- root必須key
- 型整合
- 参照整合
- groupKeyRegistry
- tagCatalog
- scenario / addon identity
- Structured同期
- expressModes整合
- brandCatalog整合
- followup整合
7. RUNTIME_IMPACT
P4 runtime / app compatibilityへの影響を整理する。
- module load
- search
- UI
- scenario選択
- addon表示
- SOAP生成
- multi-drug merge
- Express Mode
- thirdPanel
- existing module impact
- build / typecheck確認対象
8. RELEASE_IMPACT
P5 release / monitorへの影響を整理する。
- deploy前確認対象
- build / typecheck
- index登録
- 差分混入確認
- post-deploy monitor対象
- rollback / fix判断対象
9. DETERMINISTIC_UPDATE_CANDIDATES

- deterministic candidate は「反映候補」であり、「反映許可」ではない
- P0-D単独では反映可否を確定しない
- CHECK / HOLD / DEFER と競合する場合は、CHECK / HOLD / DEFER を優先する

deterministicに反映可能な差分候補を整理する。
条件：
- 旧値と新値が一意に対応する
- Model JSON上で明示されている
- 既存値から機械的に導出できる
- 本文変更を伴わない
- 医学的判断を伴わない
- bridge preservationを壊さない
- 薬剤個別判断を伴わない
※適用判断は後続工程で扱う。
10. CHECK_ITEMS
人間確認が必要な差分を整理する。
- 意味判断が必要
- 医学的判断が必要
- bridge本文への影響がある
- persona設計に関わる
- Express Mode運用判断が必要
- thirdPanel挙動判断が必要
- app受け口設計判断が必要
- 既存moduleへの影響が不明
- deterministicに一意決定できない
11. HOLD_ITEMS
現時点で反映禁止、または前提未確定により凍結すべき差分を整理する。
- app受け口未確定
- persona設計未確定
- Express Mode方針未確定
- thirdPanel方針未確定
- Model JSON側の設計確定待ち
- P0-A / P0-B / P0-Cの再定義待ち
- 今反映するとbridge preservationを壊す可能性がある
- 今反映すると既存moduleへ影響する可能性がある
12. DEFER_ITEMS
今すぐ反映しなくてもよい差分を整理する。
- 将来persona scaling用
- 将来Express拡張用
- 将来UI改善用
- 現時点で未使用
- 現時点で運用影響がない
- 今回のJSON化に直接影響しない
13. PROHIBITED_DIFF_ACTIONS
- 対象JSONを直接修正しない
- bridge本文を変更しない
- S/O/A/P本文をfix対象にしない
- P_APPEND / P_CLOSING本文をfix対象にしない
- aliasを推定生成しない
- search aliasを補完しない
- followup文を生成しない
- persona本文を生成しない
- Express Mode参照を推測生成しない
- 薬剤個別ロジックを作らない
- app実装を修正しない
14. P0_HANDOFF
P0系への伝播先を整理する。
P0-Aへ：
- 基準構造更新が必要な項目
P0-Bへ：
- JSON RULE更新が必要な項目
P0-Cへ：
- APP RULE更新が必要な項目
15. RUNTIME_HANDOFF
実運用系への伝播先を整理する。
P2へ：
- bridge preservation / canonical buildへ影響する項目
P3へ：
- structural validationへ影響する項目
P4へ：
- runtime / app compatibilityへ影響する項目
P5へ：
- release / monitorへ影響する項目
16. OUTPUT_REQUIREMENTS
P0-D出力では以下を守る。
- 差分を1項目ずつ分ける
- 可能な限りJSONパスで記載する
- 旧値 / 新値を区別する
- 影響工程を明示する
- deterministic / CHECK / HOLD / DEFER を分ける
- 本文変更を伴うものはCHECKまたはHOLDへ送る
- 判断不能なものをdeterministicにしない
- 修正値ではなく差分整理として出力する
- 修正指示を出力しない
- change requestを生成しない
- 実装タスクを生成しない

■ 判定方針
- 旧Model JSONと新Model JSONの差分事実を整理対象の正本として扱う
- P0-A/B/Cとの矛盾がある場合は、影響整理としてCHECK / HOLDへ送る
- P2/P3/P4/P5への伝播を必ず確認する
- deterministicに一意決定できるものだけ反映候補にする
- 人間判断が必要なものはCHECKにする
- 前提未確定・反映禁止のものはHOLDにする
- 将来拡張でよいものはDEFERにする
- bridge preservationを壊す差分は自動反映しない
- 本文変更を伴う差分は自動反映しない
■ 禁止
- 対象JSONを修正する
- 実装コードを修正する
- bridge本文を修正する
- 医学的妥当性を評価する
- deterministic fixを適用する
- 修正後JSONを出力する
- 修正指示を生成する
- change requestを生成する
- 実装タスクを生成する
- app実装案を作る
- 薬剤個別ロジックを提案する
- aliasを推定生成する
- followup文を生成する
- persona本文を生成する
- P2/P3/P4/P5の監査を先取りする
■ 最重要指示
旧Model JSONと新Model JSONを比較する。
差分を整理する。
修正するな。
実装するな。
本文を変えるな。
修正指示を作るな。
deterministic / CHECK / HOLD / DEFER を分けろ。
P0-A/B/C/P2/P3/P4/P5への影響を明示しろ。
次工程が迷わない差分整理を作れ。
