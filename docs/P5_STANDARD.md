# P5_STANDARD.md

SOAP Engine — P5 工程 設計標準

このドキュメントは、P5 工程を**設計した意図と判断根拠**を記録する。

**このドキュメントが答える問い:**
「なぜ P5 はこのような閉鎖確認・release 判定工程として設計されているのか」

**このドキュメントが答えない問い:**
「P5 をどう実行するか」→ `prompts/P5.md`
「なぜ bridge が SOT なのか」→ `docs/DESIGN_PRINCIPLES.md` DP-07
「preservation 対象の設計根拠」→ `docs/BOOTSTRAP_STANDARD.md` BS-04
「P2B への preservation 義務宣言の設計意図」→ `docs/P1_STANDARD.md` P1S-02
「non-creative build 原則の設計根拠」→ `docs/P1_STANDARD.md` P1S-03
「P1 → P2B → P3 の三工程設計意図」→ `docs/P1_STANDARD.md` P1S-07
「Preservation Firewall（mandatory diff）の設計意図」→ `docs/P2B_STANDARD.md` P2BS-03
「BUILD ステータス 4 段階分類の設計意図」→ `docs/P2B_STANDARD.md` P2BS-04
「P3 の独立検証設計意図」→ `docs/P3_STANDARD.md`
「STRUCTURE ステータス分類の設計意図」→ `docs/P3_STANDARD.md` P3S-04
「P4 の設計意図」→ `docs/P4_STANDARD.md`
「RUNTIME ステータス分類の設計意図」→ `docs/P4_STANDARD.md` P4S-04
「P4 → P5 の Handoff 設計意図（送り出し側）」→ `docs/P4_STANDARD.md` P4S-08
「canonical JSON の書き方」→ `docs/JSON_STANDARD.md`

最終更新: 2026-06-20

---

## P5S-00: 目的と位置づけ

### 目的

P5 工程は、P4 で RUNTIME_OK または RUNTIME_OK_WITH_CHECK となった canonical JSON について、**P2/P3/P4 の結果を閉鎖確認し、評価済み成果物と deploy 対象ファイルの一致を確認し、deploy 前後の安全確認と post-deploy monitor を整理して、運用に投入してよい状態かを判定する**工程である。

P5 の出力（P5_SUMMARY + FILE_LOCATION_REPORT + FINAL_INTEGRATION_REPORT + ERROR_PENDING_CHECK + RELEASE_DECISION + POST_DEPLOY_MONITOR + POST_DEPLOY_RESULT 等）が pipeline の最終成果物となる。

### P5 の工程内位置

```
P0-A → P0-B → P0-C → (P0-D) → P1 → (P2A) → P2B → P3 → P4 → [P5]
```

P5 は pipeline の終端工程である。P5 の下流に続く工程はない。P5 は release 判定と post-deploy monitor の定義を担い、canonical JSON の修正・bridge 修正・app コードの修正・creative 補完は行わない（P5S-02 / P5S-09 参照）。

### どのドキュメントが正本か

| 関心 | 正本 |
|---|---|
| P5 の実行仕様（入力・出力・検証手順）| `prompts/P5.md` |
| P5 の設計意図（なぜそうなっているか）| **このドキュメント**（P5_STANDARD.md）|
| bridge が SOT である根拠 | `docs/DESIGN_PRINCIPLES.md` DP-07 |
| preservation 対象の設計根拠 | `docs/BOOTSTRAP_STANDARD.md` BS-04 |
| P1 → P2B → P3 の三工程設計意図 | `docs/P1_STANDARD.md` P1S-07 |
| P3 の独立検証設計意図 | `docs/P3_STANDARD.md` |
| STRUCTURE ステータス分類の設計意図 | `docs/P3_STANDARD.md` P3S-04 |
| P4 の設計意図 | `docs/P4_STANDARD.md` |
| RUNTIME ステータス分類の設計意図 | `docs/P4_STANDARD.md` P4S-04 |
| P4 → P5 の Handoff 設計意図（送り出し側）| `docs/P4_STANDARD.md` P4S-08 |
| canonical JSON の書き方 | `docs/JSON_STANDARD.md` |

### 関連ドキュメント

- `prompts/PROJECT_CONTEXT.md` — 全工程の概観と起動手順
- `prompts/P4.md` — P5 が受け取る P4 の runtime validation 結果と P5_HANDOFF を生成する工程
- `prompts/P5.md` — P5 の実行手順・RELEASE_SEQUENCE・RELEASE STATUS 定義

---

## P5S-01: P5 が「閉鎖確認・release 判定工程」として独立する設計意図

### 目的

P5 が P4 の後に独立した工程として存在する設計意図を記録する。

P4 が「runtime / app compatibility 確認工程」として存在する設計意図は `docs/P4_STANDARD.md` P4S-01 を参照する。P5S-01 はそこで確立された設計を前提として、**「P4 と P5 がなぜ分離しているのか」**のみを記録する。

### なぜ P4 の後に独立した工程が必要なのか

P4 は canonical JSON の「runtime 動作可能性」を確認する。しかし P4 は「この canonical JSON を運用に投入してよいか」を判定しない。

「runtime で動く」と「運用に投入してよい」は独立した命題である。runtime で動作可能であっても、以下の確認が完了していなければ運用投入の判断はできない。

- **P2/P3/P4 の成果物が全て閉じているか**（未解決 ERROR/PENDING の不在）
- **評価済みの canonical JSON と実際に deploy する JSON が同一か**（artifact match）
- **deploy 後の問題に対して監視と対処の方針があるか**（post-deploy monitor の定義）
- **rollback 方針が確定しているか**

P5 が独立して存在する設計の根拠: これらの確認を P4 に統合すると「P4 が release 判定を先取りする」設計になり、P4 の runtime 確認工程という責務の境界が崩れる（P4S-08 / P4S-09 参照）。

### P4 と P5 の確認命題の分離

| 確認命題 | P4 | P5 |
|---|---|---|
| この canonical JSON は runtime で動くか | ○ | — |
| P2/P3/P4 の成果物が全て閉じているか | — | ○ |
| 評価済み成果物と deploy 対象が一致するか | — | ○ |
| 運用に投入してよいか | — | ○ |
| deploy 後に何を監視すべきか | — | ○ |

P4 が「動作」を確認し、P5 が「投入可否」を判定する。この分離により、「runtime で動くが投入条件を満たさない」という状態が P5 で初めて顕在化する。

### 何を守るための仕組みか

P5 が独立工程として存在することは、**「runtime 確認と release 判定を同一工程で行う」ことによる責務の混濁を防ぐ**設計である。P4 の runtime 確認の独立性を守るためにも、release 判定は P5 が担う必要がある。

### どのドキュメントが正本か

- P4 の設計意図 → `docs/P4_STANDARD.md`
- P4 から見た P5 との境界 → `docs/P4_STANDARD.md` P4S-09
- P5 の実行開始条件（RUNTIME ステータスによる分岐）→ `prompts/P5.md` §P4_OUTPUT_INTAKE_RULE

---

## P5S-02: Non-modification を「release 確認工程として体現する」設計意図

### 目的

P5 が canonical JSON / bridge 本文 / app コードを修正しない設計意図を記録する。

non-creative build 原則の設計根拠は `docs/P1_STANDARD.md` P1S-03 を参照する。P3 が non-modification を「検証として体現する」意義は `docs/P3_STANDARD.md` P3S-02 を参照する。P4 が non-modification を「runtime 確認工程として体現する」意義は `docs/P4_STANDARD.md` P4S-02 を参照する。P5S-02 はそれらとは異なる問いを記録する: **P5 が「release 確認工程として修正しないこと」を体現する意義**。

### なぜ P5 も「修正しない」のか

P5 が canonical JSON を修正すると、P3 / P4 の validation が無効化される。P3 は「P2B が build した canonical JSON」を検証し、P4 は「P3 が確認した canonical JSON」を runtime 確認した。P5 が canonical JSON を変えることは「P3 / P4 が確認した canonical JSON」から「P5 が変えた canonical JSON」への置き換えを意味する。

P5 固有の追加理由: P5 が canonical JSON を修正した場合、P5 は P4 の runtime validation が確認した成果物と異なるものを deploy 対象として持つことになる。これは artifact match の失敗を P5 自らが引き起こす矛盾である。P5 は artifact match を確認する工程であり、自らが artifact mismatch を作り出すことは P5 の存在意義と矛盾する。

### P4 の non-modification との理由の追加

P4 が修正しない理由（P4S-02）は「P4 自身の確認の中立性を守る」と「P3 の validation を有効な状態のまま保つ」という二重の意義を持つ。

P5 が修正しない理由には同じ論理が適用されるが、P5 固有の理由が加わる。P5 が canonical JSON を変えることは「P4 が runtime 確認した成果物」と「P5 が deploy しようとする成果物」が異なることを意味し、**artifact match の失敗を P5 自らが生み出す**。

P5 の non-modification は「P5 自身の確認の中立性を守る」「P3 / P4 の validation を有効な状態のまま保つ」「artifact mismatch を自ら作り出さない」という三重の意義を持つ。

### P5 が「閉鎖確認のみ」という立場を体現する意義

P5 が修正しない設計は「P5 は閉鎖確認工程であり、修正工程ではない」という立場を体現する。

P5 で問題が発見された場合、P5 は問題の内容・原因の帰属先（P2_RETURN / P3_RETURN / APP_HOLD / RELEASE_HOLD）・必要な対応を記録する。しかし修正実行は P5 の権限外である。「原因を特定して帰属先を示す」ことが P5 の完結した責務であり、修正の実行は各帰属先の工程が担う。

### 何を守るための仕組みか

P5 の non-modification は、**P3 / P4 の validation 対象と P5 が release 判定する対象が「同一の canonical JSON」であることを保証する**設計である。P5 が何かを変えた時点で、「P3 / P4 が確認した」という保証は P5 が deploy しようとする成果物には適用されなくなる。

### どのドキュメントが正本か

- non-creative build 原則の設計根拠 → `docs/P1_STANDARD.md` P1S-03
- P3 が non-modification を体現する意義 → `docs/P3_STANDARD.md` P3S-02
- P4 が non-modification を体現する意義 → `docs/P4_STANDARD.md` P4S-02
- P5 の修正禁止一覧 → `prompts/P5.md` §PROHIBITED_RELEASE_ACTIONS / §本質

---

## P5S-03: Artifact match check の設計意図

### 目的

P5 が「評価済み成果物と deploy 対象ファイルの一致確認（artifact match check）」を行う設計意図を記録する。

P4 が FILE_LOCATION_CONFIRMATION を行う設計意図は `docs/P4_STANDARD.md` P4S-06 を参照する。P5S-03 は P4S-06 を前提として、**P4 の file location confirmation と P5 の artifact match check がなぜ異なるのか**を記録する。

### P4 の file location confirmation と P5 の artifact match check の違い

P4 の FILE_LOCATION_CONFIRMATION（P4S-06）は「runtime validation の対象が明確かどうか」の確認である。「どの canonical JSON を runtime 確認するか」を明確にすることが目的であり、「P4 が確認したもの」を確定させる。

P5 の artifact match check は「P4 が確認した canonical JSON と、実際に deploy する canonical JSON が同一かどうか」の確認である。P4 が file location を確定させた後に canonical JSON が変更・更新・別バージョンと混同されるリスクは P4 の確認完了後にも存在する。P5 が artifact match を確認することで「P4 が確認した成果物がそのまま deploy される」ことを保証できる。

| 確認の目的 | P4 の file location confirmation | P5 の artifact match check |
|---|---|---|
| 問い | どの canonical JSON を確認するか | P4 が確認したものが deploy 対象か |
| タイミング | P4 runtime validation の開始前 | P4 の確認完了後・deploy の直前 |
| 対象 | runtime 確認の対象ファイルの特定 | 評価済み成果物と deploy 対象の一致 |

### なぜ P5 が artifact match を独立して確認するのか

P4 の runtime validation は「ある時点の canonical JSON」について実行される。P4 の確認後に canonical JSON が修正・更新・別バージョンと混同されるリスクは P4 の確認完了後にも存在する。

P5 が artifact match を確認しなければ、「P4 が確認した JSON」と「実際に deploy される JSON」が異なる状態のまま運用投入されるリスクを検出する工程が存在しない。artifact match check は「P4 の確認の有効期限」を P5 が担保する設計である。

### ARTIFACT_MATCH_RULE の設計意図

以下のいずれかが一致しない場合、P5 は ERROR とする。

- 評価済み canonical JSON（P4 が runtime validation を実行した JSON）
- deploy 対象 JSON（実際に `data/modules/{moduleId}.json` として配置するファイル）
- index.ts への登録対象
- commit 対象ファイル

不一致の場合は RELEASE_HOLD とする。deploy 対象ファイルが明示指定されていない場合は NOT_SPECIFIED として PENDING とし、RELEASE_OK / RELEASE_OK_WITH_MONITOR にはしない。

### 何を守るための仕組みか

artifact match check は、**「P3 / P4 が確認した成果物」と「実際に deploy される成果物」が同一であることを保証する**設計である。この確認がなければ、P3 / P4 の全ての確認作業が「確認したものと異なるものが deploy される」リスクを防げない。

### どのドキュメントが正本か

- P4 の file location confirmation の設計意図 → `docs/P4_STANDARD.md` P4S-06
- artifact match check の実行仕様 → `prompts/P5.md` §ARTIFACT_MATCH_RULE / §FILE_LOCATION_CONFIRMATION_RULE

---

## P5S-04: RELEASE ステータス 3 段階分類の設計意図

### 目的

RELEASE_OK / RELEASE_OK_WITH_MONITOR / RELEASE_HOLD という 3 段階の RELEASE ステータス分類の設計意図を記録する。とりわけ、P4 の RUNTIME_OK_WITH_CHECK と P5 の RELEASE_OK_WITH_MONITOR が名称上類似しながら成立要件が異なる設計意図を記録する。

P3S-04 は「P3 がなぜ 3 段階の STRUCTURE ステータスを使うのか」を記録している。P4S-04 は「P4 でも同じ 3 段階になる理由」を記録している。P5S-04 は P3S-04 / P4S-04 で確立した論理を前提として、**P5 でも同じ 3 段階設計になる理由と、RELEASE_OK_WITH_MONITOR が RUNTIME_OK_WITH_CHECK と異なる点**のみを記録する。

### P4 と同じ 3 段階になる理由

P4S-04 が示した 3 段階の論理: P4 は「P5 へ渡せるか否か」を判定する工程であり、「続行可能な未完」の概念が不要なため 3 段階になる。

P5 にも同じ論理が適用される。P5 は「運用に投入できるか否か」を判定する工程であり、「続行可能な未完」の概念が不要なため 3 段階になる。P5 が「投入できない」理由（ERROR / PENDING 未解決 / artifact 不一致 / NOT_CHECKED 残存）はいずれも「RELEASE_HOLD」という同一の帰結を持つ。渡せない理由の詳細は ERROR_PENDING_CHECK と RELEASE_DECISION の内容で示せる。

### RELEASE_OK_WITH_MONITOR が RUNTIME_OK_WITH_CHECK と異なる設計意図

この 2 つのステータスは「CHECK のみが残る」という共通の条件を持つが、成立要件が異なる。

**RUNTIME_OK_WITH_CHECK（P4）**: 「ERROR も PENDING も NOT_CHECKED もないが、CHECK 項目が残る」状態。P5 へ渡せる。

**RELEASE_OK_WITH_MONITOR（P5）**: 「ERROR も PENDING も NOT_CHECKED もなく、CHECK のみ残存し、かつ post-deploy monitor の対象・条件・response action が定義済み」状態。運用投入できる。

RELEASE_OK_WITH_MONITOR の成立には「monitor の定義が完了していること」が追加要件として課される。「CHECK を監視しながら投入する」という判定は「何を監視するか」「何が異常か」「どう対処するか」が定義済みであって初めて成立する。monitor 条件が未定義のまま RELEASE_OK_WITH_MONITOR を宣言することは「監視なしで投入する」ことと同義になる。

### PENDING が残る場合に RELEASE_OK_WITH_MONITOR にできない設計意図

RELEASE_OK_WITH_MONITOR の「WITH_MONITOR」は「CHECK 項目を監視する」ことを意味する。

PENDING は「人間判断が必要な未解決事項」であり、監視では解決できない。PENDING が残る状態で投入することは「判断を保留したまま運用に投入する」ことを意味するため、deploy 後の監視でカバーできない。RUNTIME_OK_WITH_CHECK の場合でも P4 由来の PENDING が残っていれば、P5 は RELEASE_OK_WITH_MONITOR ではなく RELEASE_HOLD とする。

この設計は P4 の RUNTIME_OK_WITH_CHECK と P5 の RELEASE_OK_WITH_MONITOR の間に「PENDING の有無」という明確な境界を引く。

### NOT_CHECKED が残る場合に RELEASE_OK を禁止する設計意図

P3S-04 / P4S-04 の NOT_CHECKED 禁止と同一の論理が適用される。「確認した結果が存在しない」状態で「確認完了」を宣言することは確認の意味を破壊する。P5 で artifact match / build / typecheck / runtime / closure check のいずれかが NOT_CHECKED の場合、RELEASE_OK および RELEASE_OK_WITH_MONITOR を宣言してはならない。

### 何を守るための仕組みか

RELEASE ステータス 3 段階分類は、**P5 が「運用に投入できる状態か」を閉鎖確認工程の立場から正確に表現する**設計である。RELEASE_OK_WITH_MONITOR が「monitor の定義完了」を成立要件とすることで、「確認しながら投入する」という判定が「何を確認するかが明確な投入」として成立する。

### どのドキュメントが正本か

- STRUCTURE ステータス 3 段階分類の設計意図 → `docs/P3_STANDARD.md` P3S-04
- RUNTIME ステータス 3 段階分類の設計意図（前提となる論理）→ `docs/P4_STANDARD.md` P4S-04
- RELEASE STATUS の定義と判定方針 → `prompts/P5.md` §RELEASE STATUS 定義 / §判定方針

---

## P5S-05: RELEASE_OK_WITH_MONITOR と post-deploy monitor の設計意図

### 目的

post-deploy monitor の定義が release 判定と一体化している設計意図を記録する。また、deploy 前判定における POST_DEPLOY_RESULT の扱いの設計意図を記録する。

### post-deploy monitor が release 判定と一体化している設計意図

P5 は release 判定（RELEASE_OK_WITH_MONITOR）と post-deploy monitor の定義を分離しない。

「CHECK を監視しながら投入する」という判定は、「何を監視するか」「正常動作の期待値は何か」「異常検知の条件は何か」「問題発生時の response action は何か」が揃って初めて成立する判定である。monitor の定義が未完のまま RELEASE_OK_WITH_MONITOR を宣言することは「監視計画のない投入」を意味し、deploy 後の異常に対する対処方針が存在しない状態になる。

post-deploy monitor を release 判定と一体化することで、「投入してよい」という判定が「何が起きたとき、どう対処するか」まで含む判断として成立する。

### post-deploy monitor が P5 固有の設計である理由

P4 には post-deploy monitor に対応する設計がない。P4 の責務は「runtime で動くか」の確認であり、deploy 後の監視は P4 の確認範囲を超える。P5 が pipeline 終端工程として post-deploy monitor を担うことで、「投入前の確認」から「投入後の監視方針の定義」までの設計が P5 内で完結する。

### deploy 前判定における POST_DEPLOY_RESULT の設計意図

P5 は deploy 前判定においても POST_DEPLOY_RESULT を出力ブロックとして含める。ただし deploy 前の時点では以下の値のみを記録する。

- `deployed: false`
- `deploy_log: NOT_STARTED`
- `monitor_result: NOT_STARTED`

この状態の POST_DEPLOY_RESULT は「deploy が未実施であること」の記録枠であり、RELEASE_HOLD の理由ではない。deploy 前判定において POST_DEPLOY_RESULT が未完了であることのみを理由として RELEASE_HOLD とすることは許可されない。

この設計の意図: POST_DEPLOY_RESULT は deploy 後に更新される情報であり、deploy 前に完了していないことは自明の状態である。deploy 後確認時に deploy_log / monitor_result が未確認の場合のみ NOT_CHECKED として扱う。

### 何を守るための仕組みか

post-deploy monitor の定義は、**「CHECK が残る状態での投入」が「監視条件・対処方針の明確な投入」として成立する**設計である。monitor 定義の完了が RELEASE_OK_WITH_MONITOR の条件となることで、「確認しながら投入する」という判定に実質的な意味が生まれる。

### どのドキュメントが正本か

- RELEASE_OK_WITH_MONITOR の条件定義 → `prompts/P5.md` §RELEASE STATUS 定義
- post-deploy monitor の実行仕様 → `prompts/P5.md` §POST_DEPLOY_MONITOR_RULE / §POST_DEPLOY_RESULT_RULE

---

## P5S-06: P2/P3/P4 closure check の設計意図

### 目的

P5 が P2/P3/P4 の成果物を一括して「閉じているか」確認する（closure check）設計意図を記録する。あわせて、P5 が独自に実行する final build/typecheck/runtime 確認の設計意図を記録する。

P4S-07 は「P4 が P3 の handoff を受け取る設計意図（受け取り側）」を記録した。P5S-06 は P4S-07 とは異なる問いを記録する: **P5 がなぜ P2/P3/P4 全工程の成果物を俯瞰して「閉じているか」を確認するのか**。

### P2/P3/P4 の各工程の handoff と P5 の closure check の違い

各工程は自工程の確認を行い、次の工程への handoff を作成する。

- P2B は BUILD ステータスを確定させて P3 へ渡す
- P3 は STRUCTURE ステータスを確定させて P4 へ渡す
- P4 は RUNTIME ステータスを確定させて P5 へ渡す

各工程は「自工程の確認が完了した」ことを handoff に明示するが、「全工程の確認が閉じているか」を保証するのは P5 の closure check が担う。「各工程がそれぞれ問題なしと言っているが、全体として未解決の ERROR / PENDING が残っていないか」を最終的に確認する設計が closure check である。

P5 の closure check が検出できる問題例:

- P4 の P5_HANDOFF に P4 由来 ERROR が残っているが handoff の受け渡しで明示されなかった
- P3 由来 PENDING が P4 の引き継ぎ記録に存在しない
- P2B の BUILD_OK 宣言時に残存した PENDING が P3/P4 を経て P5 に到達した

これらは各工程の handoff では見えないが、全工程を俯瞰する P5 の closure check で検出できる。

### P5 が独自に final build/typecheck/runtime 確認を実行する設計意図

P5 の closure check は「P4 の確認が完了しているか」を確認する。これに加えて、P5 は deploy の直前に final build / typecheck / runtime 確認を独自に実行する。

P4 の runtime validation は「P4 が実行した時点の環境」について確認された。P4 の確認完了後から P5 の release 判定までの間に、依存ライブラリのアップデート・app コードの変更・build 環境の差異が生じる可能性がある。P5 が deploy 直前に final 確認を実行することで「P5 が release を判定する時点での環境」での動作を保証できる。

P5 の final 確認で FAIL が発生した場合は RELEASE_HOLD とする。P4 の RUNTIME ステータスを変更することではない（P5S-09 参照）。

### closure check の確認対象

P5 は以下の閉鎖状態を確認する。

**P2 closure check**: canonical build 完了 / mandatory diff 完了 / preservation violation なし / ERROR なし

**P3 closure check**: structural validation 完了 / Model JSON validity 確認済み / reference 整合確認済み / ERROR なし

**P4 closure check**: runtime validation 完了 / build/typecheck/runtime 確認済み / ERROR なし

PENDING が残存する場合は原則 RELEASE_HOLD とする。CHECK 残存は post-deploy monitor の対象へ送る。

### 何を守るための仕組みか

P5 の closure check は、**pipeline 全体の「閉じ方」を P5 が最終確認することで、各工程の handoff の間に隠れる未解決問題を検出する**設計である。P5 が closure check の最終 gate として機能することで、「各工程がそれぞれ問題なし」という事実だけでなく「全工程が正しく閉じている」という確認が release 判定の前提として成立する。

### どのドキュメントが正本か

- P4 output intake の設計意図（受け取り側、本ドキュメント P5S-07 参照）
- closure check の実行仕様 → `prompts/P5.md` §CLOSURE_CHECK_RULE
- final build/typecheck/runtime の実行仕様 → `prompts/P5.md` §FINAL_BUILD_TYPECHECK_RULE / §FINAL_RUNTIME_RULE

---

## P5S-07: P4 output intake の設計意図

### 目的

P5 が P4 の handoff（P5_HANDOFF）を受け取り、P4 の判定結果を引き継いで release 判定を開始する設計意図を記録する。

P4S-08 は「P4 が P5 へ引き渡す P5_HANDOFF を設計した意図（送り出し側）」を記録している。P5S-07 は P4S-08 と対称に「P5 が P4 の handoff を受け取る設計意図（受け取り側）」を記録する。

### RUNTIME_HOLD の場合に P5 が続行しない設計意図

P4 が RUNTIME_HOLD を宣言した canonical JSON を P5 は受け取らない。

P4S-08 が示した設計意図（P5_HANDOFF を ERROR 時に作成しない）の受け取り側の論理: P5_HANDOFF が存在しない = P4 は「この canonical JSON を P5 へ渡す判定を下していない」ことを意味する。P5 が P5_HANDOFF なしに release 判定を開始することは「P4 の判定を迂回する」ことになる。P4 の runtime validation が完了していない canonical JSON の release 判定は、P4 → P5 という工程の順序設計を崩す。

### P4 の判定結果を「そのまま引き継ぐ」設計意図

P5 は P5_HANDOFF を受け取ったとき、P4 の判定結果（RUNTIME ステータス / CHECK / PENDING / not_final / pending_review_required）を自己判断で変更せず引き継ぐ。

この設計の意図: P4 は runtime validation の結果を「P5 が確認すべき項目（CHECK）」「解決できていない項目（PENDING）」「確認完了項目（PASS）」として分類して渡している（P4S-08）。P5 がこれらを自己判断で再分類すると「P4 の判定結果を P5 が変える」ことになり、P4 と P5 の判定責務の独立性が崩れる。P5 は「P4 が何を判定したか」を出発点として、P5 の closure check と release 判定の中で P5 独自の判定を追加する。

### RUNTIME_OK_WITH_CHECK の継承設計意図

P4 が RUNTIME_OK_WITH_CHECK を宣言した場合、P5 は release 判定を実行してよい。ただし RELEASE_OK にはしない。

P4 由来の CHECK 項目を P5 が「確認済み」として省くことは、P4 の CHECK 判定を P5 が上書きすることを意味する。P4 由来の CHECK は POST_DEPLOY_MONITOR の対象として P5 が引き継ぎ、monitor 条件の定義に含める。

P4 由来の PENDING が残る場合は原則 RELEASE_HOLD とする（P5S-04 参照）。

### 何を守るための仕組みか

P4 output intake の設計は、**P4 の判定結果が P5 において「変質なく引き継がれる」ことを保証する**設計である。P5 が P4 の判定を引き継ぐことにより、「P4 が確認した」「P4 が CHECK と判定した」「P4 が解決できなかった PENDING」という P4 の判定結果の信頼性が P5 の release 判定の枠組みの中で維持される。

### どのドキュメントが正本か

- P4 → P5 の handoff 設計意図（送り出し側）→ `docs/P4_STANDARD.md` P4S-08
- P4 output intake の実行仕様 → `prompts/P5.md` §P4_OUTPUT_INTAKE_RULE

---

## P5S-08: P2_RETURN / P3_RETURN / APP_HOLD / RELEASE_HOLD 四分類の設計意図

### 目的

P5 が問題を検出したときに P2_RETURN / P3_RETURN / APP_HOLD / RELEASE_HOLD の四分類で原因を帰属させる設計意図を記録する。とりわけ、P4 の三分類（P2_RETURN / P3_RETURN / APP_HOLD）に RELEASE_HOLD が加わる設計意図を記録する。

### P4 の三分類を P5 が引き継ぐ設計意図

P4 の三分類設計（P4S-05）: P4 で検出される問題は「bridge 由来の内容問題（P2_RETURN）」「構造・参照整合の問題（P3_RETURN）」「app 実装側の問題（APP_HOLD）」に帰属する。

P5 でも同じ三分類が適用される。P5 が P5_HANDOFF から P4 由来の P2_RETURN / P3_RETURN / APP_HOLD を受け継いだ場合、P5 は P2_RETURN の原因を P2B へ・P3_RETURN の原因を P3 へ・APP_HOLD の原因を app 実装へと帰属させる。P5 が closure check または artifact match check の中で新たな問題を検出した場合も、同じ三分類を使って帰属を特定する。

### RELEASE_HOLD という P5 固有の分類の設計意図

P5 の四分類において RELEASE_HOLD は P4 の三分類には存在しない P5 固有の概念である。

RELEASE_HOLD は「canonical JSON は正しく、runtime も動作可能だが、release の前提条件が満たされていない」場合に発行する。

RELEASE_HOLD に帰属する問題例:
- deploy 対象と評価済み成果物の不一致（artifact mismatch）
- PENDING の未解決
- NOT_CHECKED 残存
- rollback 不能な重大リスクの存在
- deploy 対象ファイルの未指定

**APP_HOLD との違い**: APP_HOLD は「app 実装側に対応が必要」であり runtime での動作不能状態を意味する。RELEASE_HOLD は「runtime 動作は可能だが release の前提条件が満たされていない」状態を意味する。この区別が「修正すれば解決する問題（P2_RETURN / P3_RETURN / APP_HOLD）」と「判断・確認・確定が必要な問題（RELEASE_HOLD）」を分離する。

### 四分類が「問題の帰属を正確に伝える」設計意図

P5 の四分類の共通設計意図: P5 は「閉鎖確認・release 判定のみ・修正なし」の工程であるため、問題を「どこが対応すべきか」に正確に分類することが P5 の修正に代わる責務となる。

| 分類 | 示す意味 | 対応責務の帰属先 |
|---|---|---|
| P2_RETURN | bridge 由来の内容問題 | P2B（build をやり直す）|
| P3_RETURN | 構造・参照整合の問題 | P3（structural validation をやり直す）|
| APP_HOLD | app 実装側の問題 | app 実装（人間が対応を判断する）|
| RELEASE_HOLD | release 前提条件の未充足 | P5（または人間が release 条件を確定させる）|

※ P5 時点の required_action は修正指示ではない。required_action は「戻すべき工程」または「停止理由の分類」を示す。

### 何を守るための仕組みか

四分類の設計は、**P5 で発見された問題が「canonical JSON / app 実装の問題」と「release 前提条件の問題」を混同されないことを保証する**設計である。RELEASE_HOLD がなければ、artifact mismatch や PENDING 未解決が P2_RETURN または APP_HOLD として扱われ、「正しい canonical JSON を P2B / app 実装がやり直す」という誤った工程ループが発生する。四分類により「何が原因で投入できないか」が工程間のルーティングで表現される。

### どのドキュメントが正本か

- P4 の三分類の設計意図（前提となる論理）→ `docs/P4_STANDARD.md` P4S-05
- P2_RETURN / P3_RETURN / APP_HOLD / RELEASE_HOLD の条件定義 → `prompts/P5.md` §RETURN / HOLD CONDITION

---

## P5S-09: P1 / P2B / P3 / P4 との責務境界

### 目的

P5 から見た P1（上流定義）・P2B（上流実行）・P3（上流構造検証）・P4（上流 runtime 確認）との責務境界を維持する設計意図を記録する。

三工程（P1 → P2B → P3）の設計意図は `docs/P1_STANDARD.md` P1S-07 を参照する。P4 から見た P5 との境界は `docs/P4_STANDARD.md` P4S-09 を参照する。P5S-09 はそれらを前提として、**「P5 が境界を守ることの義務と意義」**のみを記録する。

### P1 との上流境界

P5 は P1 が宣言した preservation 対象・確認基準を変更できない。

P5 は P1 の宣言を「release 判定の前提となる preservation の最終確認基準」として受け取る。P5 が「この preservation 対象は release 判定では重要でない」と判断して P1 の定義を緩めることは許可されない。P1 の定義に疑義がある場合も、P5 は「P1 の定義に照らした closure check」を行い、問題があれば適切な帰属先（P2_RETURN / P3_RETURN / APP_HOLD / RELEASE_HOLD）に分類する。

### P2B との上流境界

P5 は P2B の build 判断を上書きしない。

P5 が closure check で「P2B の build が正しい」と確認できた場合も、P5 は P2B の確認結果を遡及的に変更しない。P5 が P2_RETURN を発行することは「この canonical JSON の内容に bridge 由来の問題がある」という P5 の判定であり、「P2B の build プロセスの特定の判断を変える」ことではない。

### P3 との上流境界

P5 は P3 の STRUCTURE ステータスを変更しない。

P3 が STRUCTURE_OK_WITH_CHECK を宣言した場合、P5 の closure check が全件 PASS であっても、P5 が独自に「構造上も問題ない」として STRUCTURE_OK に変換することはできない。P5 の権限は「release 判定（RELEASE ステータス）」の判定であり、「構造検証結果（STRUCTURE ステータス）」の変更ではない。

### P4 との上流境界

P5 は P4 の RUNTIME ステータスを変更しない。

P4 が RUNTIME_OK_WITH_CHECK を宣言した場合、P5 の closure check や final 確認が全件 PASS であっても、P5 が独自に「runtime も問題ない」として RUNTIME_OK に変換することはできない。P5 の権限は「release 判定（RELEASE ステータス）」の判定であり、「runtime 確認結果（RUNTIME ステータス）」の変更ではない。

P5 の final build/typecheck/runtime 確認（P5S-06 参照）で FAIL が発生した場合、P5 は RELEASE_HOLD とする。これは「P5 の final 確認での FAIL を RELEASE ステータスに反映する」行為であり、「P4 の RUNTIME ステータスを変更する」行為ではない。

### P5 に下流境界がない設計意図

P5 は pipeline 終端工程であり、P5 の下流に続く工程はない。

P5 の post-deploy monitor は「deploy 後の監視条件・異常検知・response action の定義」を行うが、deploy 後の監視の実行は人間が担う。P5 は定義する工程であり、deploy を実行する工程ではない。P5 が post-deploy result を記録するのは「何が起きたか」の事実記録であり、再度の release 判定工程を起動することではない。

### 何を守るための仕組みか

P1 / P2B / P3 / P4 との責務境界の維持は、**P5 が「閉鎖確認・release 判定工程」として機能し続けるための構造的保護**である。P5 が上流の定義を変えたり、上流の確認結果を書き換えたりすることは、いずれも P5 の release 判定を特定の方向に歪める。「P5 には定義権・修正権・構造検証権・runtime 確認権がない」という制約が P5 の release 確認工程としての立場を保証する。

### どのドキュメントが正本か

- 三工程設計の意図 → `docs/P1_STANDARD.md` P1S-07
- P4 から見た P5 との境界 → `docs/P4_STANDARD.md` P4S-09
- P5 の実行禁止事項 → `prompts/P5.md` §禁止 / §PROHIBITED_RELEASE_ACTIONS / §本質
