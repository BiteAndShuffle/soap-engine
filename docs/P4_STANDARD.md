# P4_STANDARD.md

SOAP Engine — P4 工程 設計標準

このドキュメントは、P4 工程を**設計した意図と判断根拠**を記録する。

**このドキュメントが答える問い:**
「なぜ P4 はこのような runtime / app compatibility 確認工程として設計されているのか」

**このドキュメントが答えない問い:**
「P4 をどう実行するか」→ `prompts/P4.md`
「なぜ bridge が SOT なのか」→ `docs/DESIGN_PRINCIPLES.md` DP-07
「preservation 対象の設計根拠」→ `docs/BOOTSTRAP_STANDARD.md` BS-04
「P2B への preservation 義務宣言の設計意図」→ `docs/P1_STANDARD.md` P1S-02
「non-creative build 原則の設計根拠」→ `docs/P1_STANDARD.md` P1S-03
「P1 → P2B → P3 の三工程設計意図」→ `docs/P1_STANDARD.md` P1S-07
「Preservation Firewall（mandatory diff）の設計意図」→ `docs/P2B_STANDARD.md` P2BS-03
「BUILD ステータス 4 段階分類の設計意図」→ `docs/P2B_STANDARD.md` P2BS-04
「P3 の独立検証設計意図」→ `docs/P3_STANDARD.md`
「STRUCTURE ステータス分類の設計意図」→ `docs/P3_STANDARD.md` P3S-04
「P3 → P4 の Handoff 設計意図（送り出し側）」→ `docs/P3_STANDARD.md` P3S-07
「P5 の設計意図」→ `docs/P5_STANDARD.md`（未作成）
「canonical JSON の書き方」→ `docs/JSON_STANDARD.md`

最終更新: 2026-06-20

---

## P4S-00: 目的と位置づけ

### 目的

P4 工程は、P3 で STRUCTURE_OK または STRUCTURE_OK_WITH_CHECK となった canonical JSON が、**実際の runtime / app 実装環境で受理・動作可能かを確認し、P5 へ渡せる状態かを判定する**工程である。

P4 の出力（P4_SUMMARY + RUNTIME_VALIDATION_REPORT + ERROR_PENDING_CHECK + P5_HANDOFF 等）は P5 の release 判定の入力となる。

### P4 の工程内位置

```
P0-A → P0-B → P0-C → (P0-D) → P1 → (P2A) → P2B → P3 → [P4] → P5
```

P4 は P3 の validated canonical JSON を受け取り、runtime / app compatibility validation を実行する。P4 は runtime 確認のみを担い、canonical JSON の修正・bridge 修正・release 判定は行わない（P4S-02 / P4S-08 / P4S-09 参照）。

### どのドキュメントが正本か

| 関心 | 正本 |
|---|---|
| P4 の実行仕様（入力・出力・検証手順）| `prompts/P4.md` |
| P4 の設計意図（なぜそうなっているか）| **このドキュメント**（P4_STANDARD.md）|
| bridge が SOT である根拠 | `docs/DESIGN_PRINCIPLES.md` DP-07 |
| preservation 対象の設計根拠 | `docs/BOOTSTRAP_STANDARD.md` BS-04 |
| preservation 義務宣言の設計意図 | `docs/P1_STANDARD.md` P1S-02 |
| non-creative build 原則の設計根拠 | `docs/P1_STANDARD.md` P1S-03 |
| P1 → P2B → P3 の三工程設計意図 | `docs/P1_STANDARD.md` P1S-07 |
| P3 の独立検証設計意図 | `docs/P3_STANDARD.md` |
| STRUCTURE ステータス分類の設計意図 | `docs/P3_STANDARD.md` P3S-04 |
| P3 → P4 の Handoff 設計意図（送り出し側）| `docs/P3_STANDARD.md` P3S-07 |
| P5 の設計意図 | `docs/P5_STANDARD.md`（未作成）|
| canonical JSON の書き方 | `docs/JSON_STANDARD.md` |

### 関連ドキュメント

- `prompts/PROJECT_CONTEXT.md` — 全工程の概観と起動手順
- `prompts/P3.md` — P4 が受け取る P3 の検証結果と P4_HANDOFF を生成する工程
- `prompts/P4.md` — P4 の検証手順・RUNTIME_VALIDATION_SEQUENCE・RUNTIME STATUS 定義

---

## P4S-01: P4 が「runtime / app compatibility 工程」として独立する設計意図

### 目的

P4 が P3 の後に独立した runtime 確認工程として存在する設計意図を記録する。

三工程（P1 → P2B → P3）の設計意図は `docs/P1_STANDARD.md` P1S-07 を参照する。P4S-01 はそこで確立された設計を前提として、**P3 と P4 がなぜ分離しているのか**のみを記録する。

### なぜ P3 の後に独立した工程が必要なのか

P3 は canonical JSON の「構造的妥当性」を確認する。しかし P3 は runtime を実行しない。

「構造が正しい canonical JSON が runtime で動く」は、「構造が正しい」とは独立した命題である。構造上正しい JSON であっても、実際の app 実装（loader / validator / types.ts / build / UI / search）との整合が実現していなければ runtime で受理されない。P3 が構造検証を完了した時点では、この整合はまだ確認されていない。

P4 が独立して存在する設計の根拠: P3 の構造確認が完了した canonical JSON を、実際の runtime 環境で受理・動作可能かを確認する責務は、P3 の構造確認とは異なる確認の軸を持つ。この確認を P3 に統合すると「P3 が runtime を先取りする」設計になり、P3 の structural validation という責務の境界が崩れる（P3S-09 参照）。

### P3 と P4 の確認命題の分離

| 確認命題 | P3 | P4 |
|---|---|---|
| この canonical JSON の構造は成立しているか | ○ | — |
| この canonical JSON は runtime で動くか | — | ○ |
| app 実装（loader / types / validator）と整合するか | — | ○ |
| build / typecheck が通るか | — | ○ |
| UI / search / compose が機能するか | — | ○ |

P3 が「成立」を確認し、P4 が「動作」を確認する。この分離により、「構造的には問題ないが runtime で問題がある」という状態が P4 で初めて顕在化する。

### 何を守るための仕組みか

P4 が独立工程として存在することは、**「構造検証と runtime 確認を同一工程で行う」ことによる責務の混濁を防ぐ**設計である。P3 の構造検証の独立性を守るためにも、runtime 確認は P4 が担う必要がある。

### どのドキュメントが正本か

- 三工程設計の意図 → `docs/P1_STANDARD.md` P1S-07
- P3 から見た P4 との境界 → `docs/P3_STANDARD.md` P3S-09
- P4 の実行開始条件（STRUCTURE ステータスによる分岐）→ `prompts/P4.md` §P3_OUTPUT_INTAKE_RULE

---

## P4S-02: Non-modification を「runtime 確認工程として体現する」設計意図

### 目的

P4 が canonical JSON / bridge 本文を修正しない設計意図を記録する。

non-creative build 原則の設計根拠は `docs/P1_STANDARD.md` P1S-03 を参照する。P2B が non-creative build を「build として体現する」意義は `docs/P2B_STANDARD.md` P2BS-02 を参照する。P3 が non-modification を「検証として体現する」意義は `docs/P3_STANDARD.md` P3S-02 を参照する。P4S-02 はそれらとは異なる問いを記録する: **P4 が「runtime 確認工程として修正しないこと」を体現する意義**。

### なぜ P4 も「修正しない」のか

P4 が canonical JSON を修正すると、P3 の validation が無効化される。

P3 は「P2B が build した canonical JSON」を対象として structural validation を実行し、その結果として STRUCTURE_OK / STRUCTURE_OK_WITH_CHECK を宣言した。P4 が canonical JSON を変えることは「P3 が検証した canonical JSON」から「P4 が変えた canonical JSON」への置き換えを意味する。P4 が変えた canonical JSON に対して P3 は一切の structural validation を行っていない。

この設計の核心: P3 の validation の対象と P4 の runtime 確認の対象は「同一の canonical JSON」でなければならない。P4 が修正することは、P3 と P4 が異なる対象を見ることを意味し、P3 → P4 という検証の連続性が断絶する。

### P3 の non-modification との理由の違い

P3 が修正しない理由（P3S-02）は「検証対象を自分が変えると検証の中立性が崩れる」という検証者の中立性保護である。

P4 が修正しない理由には同じ論理が適用されるが、追加の理由がある。P4 が canonical JSON を変えることは P3 が検証していない状態を生み出す。P3 は「P4 が変えた後の canonical JSON」を検証していないため、変更後の JSON は structural validation を受けていない状態で runtime 確認されることになる。

P4 の non-modification は「P4 自身の確認の中立性を守る」と「P3 の validation を有効な状態のまま保つ」という二重の意義を持つ。

### P4 が「診断のみ」という立場を体現する意義

P4 が修正しない設計は「P4 は診断工程であり、処方工程ではない」という立場を体現する。

P4 で問題が発見された場合、P4 は問題の内容・原因の帰属先（P2_RETURN / P3_RETURN / APP_HOLD）・必要な対応を記録する。しかし修正実行は P4 の権限外である。「原因を特定して帰属先を示す」ことが P4 の完結した責務であり、修正の実行は各帰属先の工程が担う。

### 何を守るための仕組みか

P4 の non-modification は、**P3 の structural validation と P4 の runtime validation が「同一の canonical JSON を対象としている」という検証連続性を保つ**設計である。修正しないという制約が、「P3 が確認した」という保証が P4 での runtime 確認まで維持されることを保証する。

### どのドキュメントが正本か

- non-creative build 原則の設計根拠 → `docs/P1_STANDARD.md` P1S-03
- P2B が non-creative build を体現する意義 → `docs/P2B_STANDARD.md` P2BS-02
- P3 が non-modification を体現する意義 → `docs/P3_STANDARD.md` P3S-02
- P4 の修正禁止一覧 → `prompts/P4.md` §禁止 / §PROHIBITED_RUNTIME_ACTIONS

---

## P4S-03: Preservation runtime recheck の設計意図

### 目的

P4 が preservation を再度確認する（preservation runtime recheck）設計意図を記録する。

preservation 対象の設計根拠は `docs/BOOTSTRAP_STANDARD.md` BS-04 を参照する。P2B の mandatory diff（Preservation Firewall）の意義は `docs/P2B_STANDARD.md` P2BS-03 を参照する。P3 の preservation recheck の意義は `docs/P3_STANDARD.md` P3S-03 を参照する。P4S-03 はそれらを前提として、**「P3 が preservation recheck を実施したにもかかわらず、P4 がなぜ再確認するのか」**のみを記録する。

### P3 の preservation recheck と P4 の preservation runtime recheck の違い

P3 と P4 はともに preservation を確認するが、確認のレイヤーが異なる。

**P3 の preservation recheck（P3S-03）**: 構造レベルの確認。「bridge の内容が canonical JSON に正確に反映されているか」を JSON の構造・フィールド値の照合で確認する。bridge ↔ canonical JSON の対応が「静的な JSON 構造の上で成立しているか」の確認である。

**P4 の preservation runtime recheck**: runtime レベルの確認。「canonical JSON が loader / validator / compose / search 等の runtime 経路を経た後も、preservation されているはずの内容が破壊されていないか」を確認する。runtime で動作した結果として preservation が維持されるかの確認である。

### なぜ runtime レベルで再確認が必要なのか

P3 が構造上 preservation を確認済みであっても、runtime 経路での処理の中で preservation が破壊されるケースが存在する。

例: canonical JSON の構造上は alias が正しく配置されているが、search の runtime 処理で alias が欠落する場合。canonical JSON の構造上は scenario identity が正しく設定されているが、compose の runtime 処理で identity が変わる場合。これらは「JSON の構造として正しい」と「runtime で正しく動く」が別の命題であることを示す。

P3 の preservation recheck が「静的な JSON 構造の確認」に限定される設計だからこそ、「runtime 経路を経た後の preservation」は P4 が確認する責務となる。

### preservation runtime recheck の差し戻し設計

P4 の preservation runtime recheck で問題が検出された場合、P4 は P4 内で補正しない。

- bridge / alias / followup / addon 参照の破壊 → P2_RETURN（P2B へ差し戻し）
- JSON 構造由来の runtime failure → P3_RETURN（P3 へ差し戻し）
- app 実装側の原因 → APP_HOLD

この三分類の設計意図は P4S-05 に記録する。

### 何を守るための仕組みか

Preservation runtime recheck は、**P3 の構造確認では保証できない「runtime 経路での preservation の維持」を P4 が担うことで、preservation の確認を構造・runtime の二層で完成させる**設計である。P2B の mandatory diff（第 1 確認）、P3 の preservation recheck（第 2 確認・構造レベル）、P4 の preservation runtime recheck（第 3 確認・runtime レベル）が三段階の preservation 保護を形成する。

### どのドキュメントが正本か

- preservation 対象の設計根拠 → `docs/BOOTSTRAP_STANDARD.md` BS-04
- P2B の mandatory diff の設計意図 → `docs/P2B_STANDARD.md` P2BS-03
- P3 の preservation recheck の設計意図（構造レベル）→ `docs/P3_STANDARD.md` P3S-03
- preservation runtime recheck の実行仕様 → `prompts/P4.md` §PRESERVATION_RUNTIME_RECHECK_RULE

---

## P4S-04: RUNTIME ステータス 3 段階分類の設計意図

### 目的

RUNTIME_OK / RUNTIME_OK_WITH_CHECK / RUNTIME_HOLD という 3 段階の RUNTIME ステータス分類の設計意図を記録する。とりわけ、P2B の BUILD ステータス（4 段階）と段数が異なり、P3 の STRUCTURE ステータス（3 段階）と段数が同じである設計意図を記録する。

P3S-04 は「P3 がなぜ 3 段階の STRUCTURE ステータスを使うのか」を記録している。P4S-04 は P3S-04 で確立した論理を前提として、**P4 でも同じ 3 段階設計になる理由**のみを記録する。

### P3 と同じ 3 段階になる理由

P3S-04 が示した 3 段階の論理: P3 は「P4 へ渡せるか否か」を判定する工程であり、build という「生成行為」が持つ「続行可能な未完」の概念が不要なため 3 段階になる。

P4 にも同じ論理が適用される。P4 は「P5 へ渡せるか否か」を判定する工程であり、「続行可能な未完」の概念が不要なため 3 段階になる。

P4 が「渡せない」理由（ERROR / PENDING 未解決 / build FAIL / typecheck FAIL / runtime FAIL / app compatibility FAIL）はいずれも「P5 へ渡せない」という同一の帰結を持つ。P4 がこれらを区別してステータスを追加する必要はない。渡せない理由の詳細は RUNTIME_VALIDATION_REPORT と ERROR_PENDING_CHECK の内容で示せる。

### RUNTIME_HOLD が「渡せない」を一括して受け持つ設計意図

P3 の STRUCTURE_HOLD と同一の設計意図が適用される（P3S-04 参照）。

P4 の RUNTIME_HOLD は以下のすべての「P5 へ渡せない」状態を受け持つ。

- ERROR が存在する（build FAIL / typecheck FAIL / runtime FAIL / UI 受理不能 / compose FAIL 等）
- PENDING が未解決（環境依存 / 人間確認が必要 / P3 由来 PENDING の継続等）
- app compatibility FAIL（loader FAIL / validator FAIL / search FAIL 等）

P4 がこれらを一括して RUNTIME_HOLD とすることで、P5 は「RUNTIME_HOLD = P4 が P5 へ渡せないと判定した」という単一の意味として受け取れる。

### NOT_CHECKED が残る場合に RUNTIME_OK を禁止する設計意図

P3S-04 の NOT_CHECKED 禁止と同一の論理が適用される。「確認した結果が存在しない」状態で「確認完了」を宣言することは確認の意味を破壊する。P4 で build / typecheck / runtime のいずれかが NOT_CHECKED の場合、RUNTIME_OK および RUNTIME_OK_WITH_CHECK を宣言してはならない。

### RUNTIME_OK_WITH_CHECK の設計意図

RUNTIME_OK_WITH_CHECK は「ERROR も PENDING も NOT_CHECKED もないが、CHECK 項目が残る」状態である。P5 確認対象ありとして P5 へ渡す。

P3 由来の CHECK を P4 が引き継いだ場合、P4 での runtime validation が全件 PASS であっても RUNTIME_OK ではなく RUNTIME_OK_WITH_CHECK とする。P3 が「構造は問題ないが runtime 確認が必要」と判定した項目を P4 が「確認した」として RUNTIME_OK に変換することは、P3 の CHECK 判定を P4 が上書きすることになる。P3 由来の CHECK は P5 が最終確認する（P4S-08 参照）。

### 何を守るための仕組みか

RUNTIME ステータス 3 段階分類は、**P4 が「P5 へ渡せる状態か」を runtime 確認工程の立場から正確に表現する**設計である。P4 が生成工程でないため P2B の 4 段階が持つ「続行可能な未完」の概念が不要となり、P5 への渡し可否という P4 の判定責務に最適化された 3 段階になる。P3 と同じ 3 段階設計を共有することで、「構造確認工程（P3）→ runtime 確認工程（P4）」という確認の連続性も表現される。

### どのドキュメントが正本か

- BUILD ステータス 4 段階分類の設計意図 → `docs/P2B_STANDARD.md` P2BS-04
- STRUCTURE ステータス 3 段階分類の設計意図（前提となる論理）→ `docs/P3_STANDARD.md` P3S-04
- RUNTIME STATUS の定義と判定方針 → `prompts/P4.md` §RUNTIME STATUS 定義 / §判定方針

---

## P4S-05: P2_RETURN / P3_RETURN / APP_HOLD 三分類の設計意図

### 目的

P4 が問題を検出したときに P2_RETURN / P3_RETURN / APP_HOLD の三分類で原因を帰属させる設計意図を記録する。とりわけ、P3 が P2_RETURN のみを持つのに対して P4 が三分類を持つ設計意図と、APP_HOLD という P4 固有の概念の設計意図を記録する。

### P3 が P2_RETURN のみで P4 が三分類を持つ理由

P3 の差し戻し先が P2_RETURN のみである理由（P3S-06）: P3 は「構造的妥当性」を確認する工程であり、P3 で検出される問題は「P2B の build が作り出した構造問題」に帰属する。

P4 は runtime 確認工程であり、P4 で検出される問題は以下の 3 種類の性格を持つ。

**P2_RETURN（bridge / preservation 由来）**: bridge preservation violation / 本文不一致 / alias 破壊 / followup 不一致 / addon 参照破壊 / P_CLOSING 破壊 / search token preservation violation 等。これらは「canonical JSON の内容が bridge の正本と一致しない」問題であり、修正責務は P2B に帰属する。

**P3_RETURN（JSON 構造・参照整合由来）**: JSON 構造由来の runtime failure / 参照整合由来の runtime failure / Model JSON validity 由来の runtime failure / P3 で検出すべき構造問題の残存等。これらは「構造問題が runtime で顕在化した」問題であり、P3 への差し戻しにより structural validation の再実行が必要となる。

**APP_HOLD（app 実装側の原因）**: これが P4 固有の概念である。

### APP_HOLD という P4 固有の概念の設計意図

APP_HOLD は「canonical JSON は正しいが、app 実装側（loader / validator / lib/types.ts / search 実装 / UI 実装等）が canonical JSON を受理・動作させる状態にない」場合に発行する。

APP_HOLD の設計意図の核心: P4 で検出される問題のすべてが「canonical JSON の問題」ではない。app 実装が古い・types.ts が対応していない・validator が新しいフィールドに未対応という問題は、canonical JSON の修正では解決しない。これらの問題を P2_RETURN や P3_RETURN として扱うことは「canonical JSON または bridge に問題がある」という誤った帰属を生む。

APP_HOLD は「canonical JSON は正しく、app 実装側に対応が必要」という判定結果を正確に表現するための分類である。APP_HOLD が発行されても canonical JSON は修正されず、app 実装側の対応が完了した後に P4 runtime validation を再実行する。

### 三分類が「修正責務の帰属を正確に伝える」設計意図

P4 の三分類の共通設計意図: P4 は「診断のみ・修正なし」の工程であるため、問題を「どこが修正すべきか」に正確に分類することが P4 の修正に代わる責務となる。

| 分類 | 示す意味 | 修正責務の帰属先 |
|---|---|---|
| P2_RETURN | bridge 由来の内容問題 | P2B（build をやり直す） |
| P3_RETURN | 構造・参照整合の問題 | P3（structural validation をやり直す） |
| APP_HOLD | app 実装側の問題 | app 実装（人間が対応を判断する） |

P4 が問題を三分類することは「P4 がどこを直せばよいかを伝えた」という意味を持つ。修正の実行は P4 の外の責務であるが、「どこが問題か」を正確に伝えることは P4 の判定責務の完結形である。

### 何を守るための仕組みか

三分類の設計は、**P4 で発見された問題が「canonical JSON の問題」と「app 実装の問題」を混同されないことを保証する**設計である。APP_HOLD がなければ、app 実装側の問題が P2_RETURN または P3_RETURN として扱われ、「正しい canonical JSON を P2B / P3 がやり直す」という誤った工程ループが発生する。三分類により「何が原因か」が工程間のルーティングで表現される。

### どのドキュメントが正本か

- P3 の P2_RETURN 設計意図（対称参照）→ `docs/P3_STANDARD.md` P3S-06
- P2_RETURN / P3_RETURN / APP_HOLD の条件定義 → `prompts/P4.md` §RETURN / HOLD CONDITION / §APP_SIDE_FIX_POLICY

---

## P4S-06: File location confirmation の設計意図

### 目的

P4 が独自のファイル存在確認フェーズ（FILE_LOCATION_CONFIRMATION）を持つ設計意図を記録する。

P3 は canonical JSON の「構造的妥当性」を確認するため、canonical JSON と bridge 原稿 / 最新 Model JSON が揃っていれば確認を開始できる。P4 はこれに加えて「runtime で実際に確認する対象ファイルが明確かどうか」という前提確認を必要とする。P4S-06 はこの設計意図を記録する。

### なぜ P4 が独自のファイル確認フェーズを持つのか

P4 は runtime 確認工程であり、「実際に loader / validator / build / typecheck で確認する対象」が明確でないと runtime validation 自体が実行できない。

P3 の structural validation は canonical JSON の内容と bridge 原稿の照合を中心とするため、ファイルのパスが不明であっても canonical JSON の構造が揃っていれば開始できる。しかし P4 の runtime validation は「実際のファイルパスへの canonical JSON の配置」「index.ts への登録」「types.ts / validator との整合」を実際に確認する工程であるため、「どのファイルを確認するか」が明確でなければ runtime validation は NOT_CHECKED または PENDING の連鎖になる。

### 「人間が明示指定したパスのみを対象とする」設計意図

P4 は人間が明示指定した対象 canonical JSON のみを runtime 確認の対象とする。`data/modules/` 内の JSON を P4 が自動選定することは禁止されている。

この設計の意図: P4 が自動的に `data/modules/` から対象を選定すると「P4 が意図していない JSON を runtime 確認対象として選んだ」状況が発生しうる。runtime validation の結果が「どの canonical JSON を対象としたか」に依存するため、対象選定を人間の明示的指定に限定することで、「P4 が確認した対象」の信頼性を保護する。

### FILE_LOCATION_STATUS の設計意図

P4 は FILE_LOCATION_STATUS として CONFIRMED / NOT_SPECIFIED / NOT_FOUND / NOT_CHECKED の 4 状態を区別する。

この区別の設計意図: runtime validation の結果の信頼性は「確認対象が明確かどうか」に直接依存する。NOT_SPECIFIED（人間からの指定がない）や NOT_FOUND（指定されたファイルが存在しない）の状態では runtime validation を完了できない。これらを「確認できなかった」として NOT_CHECKED と同一視すると、「パスを指定されていない」という根本的な問題が隠れる。4 状態の明確な区別が、「なぜ runtime validation が完了しなかったか」を正確に伝える。

NOT_SPECIFIED の場合は原則 PENDING とし RUNTIME_OK にしない設計: runtime 確認の対象が不明なまま「runtime で問題なし」を宣言することは何も確認していないことと同義である。

### 何を守るための仕組みか

File location confirmation は、**P4 の runtime validation の対象と範囲が常に「人間が意図した canonical JSON」に限定されることを保証する**設計である。自動選定の禁止が、P4 の runtime validation 結果の意味を「人間が指定した対象を確認した結果」として確定させる。

### どのドキュメントが正本か

→ `prompts/P4.md` §FILE_LOCATION_CONFIRMATION_RULE / §FILE_LOCATION_STATUS_RULE

---

## P4S-07: P3 output intake の設計意図

### 目的

P4 が P3 の handoff（P4_HANDOFF）を受け取り、P3 の判定結果を引き継いで runtime validation を開始する設計意図を記録する。

P3S-07 は「P3 が P4 へ引き渡す P4_HANDOFF を設計した意図（送り出し側）」を記録している。P4S-07 は P3S-07 と対称に「P4 が P3 の handoff を受け取る設計意図（受け取り側）」を記録する。

### P4 が P3 の handoff を「そのまま引き継ぐ」設計意図

P4 は P3 の P4_HANDOFF を受け取ったとき、P3 の判定結果を自己判断で変更せず引き継ぐ。

この設計の意図: P3 は structural validation の結果を「P4 が確認すべき項目（CHECK）」「解決できていない項目（PENDING）」「構造上問題ない項目（PASS）」として分類して渡している（P3S-07）。P4 がこれらを自己判断で再分類すると「P3 の判定結果を P4 が変える」ことになり、P3 と P4 の判定責務の独立性が崩れる。P4 は「P3 が何を判定したか」を出発点として、P4 の runtime validation の中で新たな判定を追加する。

### STRUCTURE_HOLD の場合に P4 が続行しない設計意図

P3 が STRUCTURE_HOLD を宣言した canonical JSON を P4 は受け取らない。

P3S-07 が示した設計意図（P4_HANDOFF を ERROR 時に作成しない）の受け取り側の論理: P4_HANDOFF が存在しない = P3 は「この canonical JSON を P4 へ渡す判定を下していない」ことを意味する。P4 が P4_HANDOFF なしに runtime validation を開始することは「P3 の判定を迂回する」ことになる。P3 の structural validation が完了していない canonical JSON の runtime validation は、P3 → P4 という工程の順序設計を崩す。

### P3 由来 CHECK の引き継ぎ設計意図

P3 が CHECK として P4_HANDOFF に含めた項目を、P4 は P4 の runtime validation の確認対象として引き継ぐ。

この設計の意図: P3 の CHECK は「構造は問題ないが runtime 確認が必要」という P3 の明示的な判定結果である（P3S-05 参照）。P4 がこれを独自に「確認不要」として省くことは P3 の判定を無視することになる。P4 の runtime validation で P3 由来の CHECK 項目が PASS となっても、P4_SUMMARY を RUNTIME_OK にせず RUNTIME_OK_WITH_CHECK とする（P4S-04 参照）のは、P3 の CHECK 判定を P4 が「PASS に変換する」権限を持たないためである。P3 由来の CHECK は P5 が最終確認する（P4S-08 参照）。

### P3 由来 PENDING の引き継ぎ設計意図

P3 が PENDING として引き継いだ項目を P4 が解決できない場合、P4 は not_final / pending_review_required を true として P5 へ引き継ぐ。

PENDING の解決権限は P4 になく、その判断は人間が行う。P4 が PENDING を「だいたい問題ない」として省くことは許可されない。P4 は PENDING の内容を引き継いで P5 へ渡すことで「未解決の PENDING が存在する」ことを P5 へ明示する。

### 何を守るための仕組みか

P3 output intake の設計は、**P3 の判定結果が P4 を経由して P5 まで「変質なく引き継がれる」ことを保証する**設計である。P4 が P3 の判定を引き継ぐことにより、「P3 が確認した」「P3 が CHECK と判定した」「P3 が解決できなかった PENDING」という P3 の判定結果の信頼性が P4 の runtime validation の枠組みの中で維持される。

### どのドキュメントが正本か

- P3 → P4 の handoff 設計意図（送り出し側）→ `docs/P3_STANDARD.md` P3S-07
- P3 output intake の実行仕様 → `prompts/P4.md` §P3_OUTPUT_INTAKE_RULE

---

## P4S-08: P5 handoff の設計意図

### 目的

P4 が P5 へ渡す情報パッケージ（P5_HANDOFF）を設計した意図を記録する。とりわけ、P4 が P5 の release 判定を先取りしない設計意図を記録する。

P5 の責務・P5 の実行手順は `docs/P5_STANDARD.md`（未作成）を参照する。P4S-08 は「P4 が P5 へ引き渡す設計意図」のみを記録し、P5 がそれをどう活用するかは語らない。

### P4 が P5 へ渡す情報の設計意図

P4 が P5 へ渡す情報は「P4 が runtime validation を完了した結果」であり、「release してよいか」の判定ではない。

P5_HANDOFF に含まれる主な情報群の設計意図:

**runtime validation result**: P4 が実行した全 phase の確認結果（PASS / FAIL / NOT_CHECKED）。P5 が何を確認済みとして受け取るかを明示する。

**structural validation result（P3 から引き継ぎ）**: P3 の判定結果を P4 が変質させずに引き継いで渡す（P4S-07 参照）。P5 は P3 の structural validation 結果を P4 経由で受け取る。

**PENDING / CHECK 分類結果と継続項目**: P3 由来・P4 由来の CHECK / PENDING を分類して引き継ぐ。P5 が「何を最終確認すべきか」を明示した材料となる。

P4 が渡す情報が「runtime で何を確認し、何が PASS で、何が残っているか」という P4 の確認結果であるのに対し、P5 が判断するのは「その確認結果を踏まえて release できるか」である。P4 は P5 が判断できる材料を渡すだけであり、「release してよい」という判定を P4 が行うことは P4 の権限外である。

### ERROR 時に P5_HANDOFF を作成しない設計意図

ERROR が存在する場合、P4 は P5_HANDOFF を作成しない。

P3S-07 で P3 が ERROR 時に P4_HANDOFF を作成しない設計意図と同一の論理が適用される。P5_HANDOFF の作成は「この canonical JSON を P5 へ渡す」という P4 の判定行為を意味する。ERROR が存在する状態で P5_HANDOFF を作成することは「ERROR がある canonical JSON を渡してよい」という P4 の判定を含意してしまう。

RUNTIME_HOLD と P5_HANDOFF 不作成の組み合わせが「P4 はこの canonical JSON を P5 へ渡す判定を下していない」という明示的な信号となる。

### P4 が P5 の release 判定を先取りしない設計意図

P4 は「runtime で動くかどうか」を判定する。「release できるかどうか」の判定は P5 の責務である。

RUNTIME_OK_WITH_CHECK の場合、P4 は「runtime 動作可能だが CHECK 項目が残る」と判定して P5 へ渡す。P5 がその CHECK 項目を確認して release 可否を最終判定する。P4 が「CHECK 項目はおそらく問題ない」として RUNTIME_OK を宣言したり、「release 可能」と判断したりすることは許可されない。

### validated canonical JSON を原則全文出力しない設計意図

P3S-07 で P3 が示した設計意図と同一の論理が適用される。runtime validation の結果・差分・CHECK/PENDING 項目という「P5 が受け取るべき信号」が canonical JSON 全文の中に埋もれることを防ぐ。全文が必要な場合は人間が明示的に要求する。

### 何を守るための仕組みか

P5_HANDOFF は、**P4 の runtime validation 結果を P5 が「確認済み・引き継ぎ済み・要確認」として明確に受け取れる状態を作る**設計である。P5_HANDOFF が存在することで「P4 を通過した canonical JSON」と「P4 を通過していない canonical JSON」の区別が明示的になる。

### どのドキュメントが正本か

- P3 → P4 の handoff 設計意図（対称参照）→ `docs/P3_STANDARD.md` P3S-07
- P5_HANDOFF の実行仕様 → `prompts/P4.md` §P5_HANDOFF_RULE / §OUTPUT_REQUIREMENTS

---

## P4S-09: P1 / P2B / P3 / P5 との責務境界

### 目的

P4 から見た P1（上流定義）・P2B（上流実行）・P3（上流検証）・P5（下流判定）との責務境界を維持する設計意図を記録する。

三工程（P1 → P2B → P3）の設計意図は `docs/P1_STANDARD.md` P1S-07 を参照する。P3 から見た P4 との境界は `docs/P3_STANDARD.md` P3S-09 を参照する。P4S-09 はそれらを前提として、**「P4 が境界を守ることの義務と意義」**のみを記録する。

### P1 との上流境界

P4 は P1 が宣言した preservation 対象・確認基準を変更できない。

P4 は P1 の宣言を「runtime で preservation が維持されているかを確認する基準」として受け取る。P4 が「この preservation 対象は runtime 確認では重要でない」と判断して P1 の定義を緩めることは許可されない。P1 の定義に疑義がある場合も、P4 は「P1 の定義に照らした runtime 確認」を行い、問題があれば適切な帰属先（P2_RETURN / P3_RETURN / APP_HOLD）に分類する。

### P2B との上流境界

P4 は P2B の build 判断を上書きしない。

P4 が runtime validation で「P2B の build が正しい」と確認できた場合も、P4 は P2B の確認結果を遡及的に変更しない。P4 の runtime validation は「P4 の確認結果」であり、「P2B の確認結果の訂正」ではない。

P4 が P2_RETURN を発行することは「この canonical JSON の内容に bridge 由来の問題がある」という P4 の判定であり、「P2B の build プロセスの特定の判断を変える」ことではない。P2B がどのように修正するかは P2B の責務である。

### P3 との上流境界

P4 は P3 の STRUCTURE ステータスを変更しない。

P3 が STRUCTURE_OK_WITH_CHECK を宣言した場合、P4 の runtime validation が全件 PASS であっても、P4 が独自に「構造上も問題ない」として STRUCTURE_OK に変換することはできない。P4 の権限は「runtime 確認結果（RUNTIME ステータス）」の判定であり、「構造検証結果（STRUCTURE ステータス）」の変更ではない。

P4 が P3_RETURN を発行することは「構造・参照整合由来の問題が runtime で顕在化した」という判定であり、P3 の structural validation そのものの評価ではない。

**BUILD_STOPPED の canonical JSON を受け取らない**: P3 が BUILD_STOPPED の canonical JSON を受け取らない（P3S-09 参照）設計と連続して、P4 もその canonical JSON を受け取ることがない。P4 が P3 を経由していない canonical JSON を独自に受け取ることは P3 → P4 という工程設計の迂回であり、許可されない。

### P5 との下流境界

P4 は P5 の release 判定を先取りしない。

P4 が RUNTIME_OK または RUNTIME_OK_WITH_CHECK を宣言することは「runtime で動作可能」という判定であり、「release してよい」という判定ではない。P5 は P4 の runtime validation result を入力として受け取り、P5 独自の release 判定を行う。

P4 が CHECK 項目について「おそらく release に影響しない」と判断して省くことは許可されない。CHECK 項目の最終確認権限は P5 にある。P4 は CHECK 項目の内容を P5_HANDOFF に明示して P5 へ渡す。

### 何を守るための仕組みか

P1 / P2B / P3 / P5 との責務境界の維持は、**P4 が「runtime 確認工程」として機能し続けるための構造的保護**である。P4 が上流の定義を変えたり、上流の確認結果を書き換えたり、下流の release 判定を先取りしたりすることは、いずれも P4 の確認を特定の方向に歪める。「P4 には定義権・修正権・構造検証権・release 判定権がない」という制約が P4 の runtime 確認工程としての立場を保証する。

### どのドキュメントが正本か

- 三工程設計の意図 → `docs/P1_STANDARD.md` P1S-07
- P3 から見た P4 との境界 → `docs/P3_STANDARD.md` P3S-09
- P5 の設計意図 → `docs/P5_STANDARD.md`（未作成）
- P4 の実行禁止事項 → `prompts/P4.md` §禁止 / §本質
