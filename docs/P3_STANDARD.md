# P3_STANDARD.md

SOAP Engine — P3 工程 設計標準

このドキュメントは、P3 工程を**設計した意図と判断根拠**を記録する。

**このドキュメントが答える問い:**
「なぜ P3 はこのような独立検証工程として設計されているのか」

**このドキュメントが答えない問い:**
「P3 をどう実行するか」→ `prompts/P3.md`
「なぜ bridge が SOT なのか」→ `docs/DESIGN_PRINCIPLES.md` DP-07
「preservation 対象の設計根拠」→ `docs/BOOTSTRAP_STANDARD.md` BS-04
「P2B への preservation 義務宣言の設計意図」→ `docs/P1_STANDARD.md` P1S-02
「non-creative build 原則の設計根拠」→ `docs/P1_STANDARD.md` P1S-03
「P1 → P2B → P3 の三工程設計意図」→ `docs/P1_STANDARD.md` P1S-07
「Preservation Firewall（mandatory diff）の設計意図」→ `docs/P2B_STANDARD.md` P2BS-03
「BUILD ステータス 4 段階分類の設計意図」→ `docs/P2B_STANDARD.md` P2BS-04
「P2B → P3 の Handoff 設計意図」→ `docs/P2B_STANDARD.md` P2BS-07
「P4 の設計意図」→ `docs/P4_STANDARD.md`（未作成）
「canonical JSON の書き方」→ `docs/JSON_STANDARD.md`

最終更新: 2026-06-20

---

## P3S-00: 目的と位置づけ

### 目的

P3 工程は、P2B が生成した canonical JSON を、P0-A / P0-B / P0-C / P1 / P2 の定義に照らして**独立した立場から構造検証し、P4 へ渡せる状態かを判定する**工程である。

P3 の出力（P3_SUMMARY + STRUCTURAL_VALIDATION_REPORT + ERROR_PENDING_CHECK + P4_HANDOFF 等）は P4 の runtime 確認と app 適合確認の入力となる。

### P3 の工程内位置

```
P0-A → P0-B → P0-C → (P0-D) → P1 → (P2A) → P2B → [P3] → P4 → P5
```

P3 は P2B の build 済 canonical JSON を受け取り、structural validation を実行する。P3 は構造検証のみを担い、runtime 確認・build 実行・UI 確認は P4 の責務である（P3S-08 / P3S-09 参照）。

### どのドキュメントが正本か

| 関心 | 正本 |
|---|---|
| P3 の実行仕様（入力・出力・検証手順）| `prompts/P3.md` |
| P3 の設計意図（なぜそうなっているか）| **このドキュメント**（P3_STANDARD.md）|
| bridge が SOT である根拠 | `docs/DESIGN_PRINCIPLES.md` DP-07 |
| preservation 対象の設計根拠 | `docs/BOOTSTRAP_STANDARD.md` BS-04 |
| preservation 義務宣言の設計意図 | `docs/P1_STANDARD.md` P1S-02 |
| non-creative build 原則の設計根拠 | `docs/P1_STANDARD.md` P1S-03 |
| P1 → P2B → P3 の三工程設計意図 | `docs/P1_STANDARD.md` P1S-07 |
| Preservation Firewall の設計意図 | `docs/P2B_STANDARD.md` P2BS-03 |
| BUILD ステータス分類の設計意図 | `docs/P2B_STANDARD.md` P2BS-04 |
| P2B → P3 の Handoff 設計意図 | `docs/P2B_STANDARD.md` P2BS-07 |
| P4 の設計意図 | `docs/P4_STANDARD.md`（未作成）|
| canonical JSON の書き方 | `docs/JSON_STANDARD.md` |

### 関連ドキュメント

- `prompts/PROJECT_CONTEXT.md` — 全工程の概観と起動手順
- `prompts/P2B.md` — P3 が受け取る build 結果と P3_HANDOFF を生成する工程
- `prompts/P3.md` — P3 の検証手順・STRUCTURAL_VALIDATION_SEQUENCE・STRUCTURE STATUS 定義

---

## P3S-01: P3 が「独立検証工程」として存在する設計意図

### 目的

P3 が P2B から独立した工程として存在する設計意図と、P3 が独立性を持つ設計が有効に機能する条件を記録する。

三工程（P1 → P2B → P3）の設計意図は `docs/P1_STANDARD.md` P1S-07 を参照する。P3S-01 はそこで確立された三工程設計を前提として、**P3 側から見た「独立していることの意義」**のみを記録する。

### なぜ必要か

P2B の自己確認には構造的な限界があり、P3 の独立確認がその限界を補完する——この命題は P1S-07 が三工程設計として確立している。P3S-01 はその前提を受け取り、「P3 の独立性が有効に機能するための設計条件」を P3 側から記録する。

P3 が独立工程として設計されているだけでは独立性は保証されない。独立性は以下の 3 条件が揃って初めて有効に機能する。

### 独立性が有効に機能するための条件

P3 の独立性は、以下の条件が揃ったときに有効に機能する。

**P3 が P2B の build に関与していないこと**: P3 は bridge を canonical JSON に変換する作業に参加しない。P3 が受け取るのは「完成した（または BUILD_STOPPED で止まった）P2B の成果物」のみである。P3 が build 途中に P2B の判断を誘導したり意見を述べる工程を持ってはならない。

**P3 が P1 の宣言を独立参照できること**: P3 は P2B から「P1 が定義した preservation 対象の解釈」を受け取るのではなく、P1 の宣言そのものを直接参照して確認基準とする。P2B の解釈を経由した確認基準は P2B からの独立性を持たない。

**P3 が修正しないこと**: P3 が canonical JSON を修正すると、P3 は「検証した対象を自分が変えた対象」に変えることになる（P3S-02 参照）。修正と検証を同一 actor が担う設計は独立検証として機能しない。

### P2 validation package が不在の場合でも P3 が実行できる設計意図

P3 は P2 validation package が不在の場合でも structural validation を実行できる。

この設計の根拠: P3 の本質は「P2B の build プロセスの監査」ではなく「canonical JSON の構造的妥当性の確認」である。build 済 canonical JSON と bridge 原稿 / 最新 Model JSON が揃っていれば、P3 は自らの責務範囲の検証を実行できる。P2 validation package はあれば優先参照するが、その不在のみを理由として P3 が STRUCTURE_HOLD とすることは P3 の本質的責務の回避になる。

### 何を守るための仕組みか

独立検証工程としての P3 の存在は、**「build した者が検証する」という利益相反を工程として断ち切る**設計である。P2B の mandatory diff が「P2B が自らの build に課す自律的確認」であるのに対し、P3 の structural validation は「P2B と利益を共有しない者が同じ対象を確認する」という性格を持つ。両者が異なる actor であることが、独立検証の設計意図を実現する。

### どのドキュメントが正本か

- 三工程設計の意図 → `docs/P1_STANDARD.md` P1S-07
- P2B からの handoff 設計意図 → `docs/P2B_STANDARD.md` P2BS-07
- P2 validation package の受け取り仕様 → `prompts/P3.md` §P2_OUTPUT_INTAKE_RULE

---

## P3S-02: Non-modification を「検証として体現する」設計意図

### 目的

P3 が canonical JSON を修正せず「差し戻し（P2_RETURN）」のみを行う設計意図を記録する。

non-creative build 原則の設計根拠は `docs/P1_STANDARD.md` P1S-03 を参照する。P2B が non-creative build を実行として体現する意義は `docs/P2B_STANDARD.md` P2BS-02 を参照する。P3S-02 はそれらとは異なる問いを記録する: **P3 が「検証者として修正しないこと」を体現する意義**。

### なぜ「修正しない」のか

P3 が canonical JSON を修正すると、検証の意義が構造的に崩壊する。

P3 が「preservation 違反を発見して修正する」とした場合、P3 が検証する対象は「P2B が build したもの」から「P3 が修正したもの」に変わる。P3 は「自分が修正した結果を自分が検証する」ことになり、P2B と同質の構造的利益相反が P3 内部に発生する。

「P3 が修正した後の canonical JSON」を正しいとして P4 へ渡すことは、P3 という独立検証工程を「P2B の修正支援工程」に変質させる。これは三工程設計（P1S-07 参照）の構造を崩壊させる。

### non-modification が non-creative build とは異なる禁止の性格を持つ理由

P2B の non-creative build（P1S-03 / P2BS-02）は「bridge にないものを追加しない」禁止であり、build の創造性を制限する設計である。

P3 の non-modification は「エラーを発見しても自ら修正しない」禁止であり、検証の中立性を守る設計である。

禁止の対象が異なる: P2B は「補完・改善・創作」を禁じる。P3 は「エラーへの介入」を禁じる。根本的な理由も異なる: P2B は deterministic build を保証するために創作を禁じる。P3 は独立検証の完全性を保つために修正介入を禁じる。

### 「発見して止まる」が P3 の正しい動作である理由

P3 が preservation 違反または構造エラーを発見したとき、P3 の正しい動作は「発見したことを報告し、P2 へ差し戻す」（P2_RETURN）である。

修正の責務は「build を行った工程（P2B）」に帰属する。P3 は「問題がある」という判定のみを下す権限を持ち、修正の実行はその権限の外にある。P3 が「どう修正するか」まで判断することは、P3 が P2B の work に事後的に関与することを意味する。

「発見して止まる」設計は P3 の権限を判定に限定することで、P3 が P2B の build に責任を持たないことを構造的に保証する。

### 何を守るための仕組みか

non-modification の体現は、**P3 の検証対象が「P2B が生成したもの」から変わらないことを保証する**設計である。P3 が何かを変えた時点で、P3 の検証は「自分が変えた結果の確認」になる。修正しないという制約が、P3 の検証対象の純粋性を維持する。

### どのドキュメントが正本か

- non-creative build 原則の設計根拠 → `docs/P1_STANDARD.md` P1S-03
- P2B が non-creative build を体現する意義 → `docs/P2B_STANDARD.md` P2BS-02
- P3 の修正禁止一覧 → `prompts/P3.md` §禁止 / §PROHIBITED_VALIDATION_ACTIONS

---

## P3S-03: preservation recheck の設計意図

### 目的

P3 が、P2B が mandatory diff で確認済みの対象を再度確認する（preservation recheck）設計意図を記録する。

preservation 対象の設計根拠は `docs/BOOTSTRAP_STANDARD.md` BS-04 を参照する。P2B の Preservation Firewall（mandatory diff が build integral である意義）は `docs/P2B_STANDARD.md` P2BS-03 を参照する。P3S-03 はそれらを前提として、**「P2B が確認した後に P3 がなぜ再確認するのか」**のみを記録する。

### なぜ P2B が確認した後に P3 が再確認するのか

P2B が mandatory diff を実行し PASS を記録した、という事実は「P2B の確認作業が完了した」ことを意味するが、「preservation が保たれている」という独立した保証にはならない。

確認を行った actor がその確認の精度の限界を持つのは不可避である。P2B の mandatory diff は P2B が自らの build 判断の枠組みの中で実行した確認である。P2B が「この差分は preservation 違反ではない」と判断した場合、その判断の妥当性を P2B が自己評価することには限界がある。

P3 が同じ preservation 対象を独立した立場から再確認することで、P2B の確認とは異なる「起点からの確認」を提供できる。P3 は P2B の build 判断に関与していないため、P2B が PASS と判断した理由に引きずられることなく確認できる。

### 「同じ対象を異なる actor が確認すること」の設計的意義

preservation recheck の意義は確認の「内容」の重複にあるのではなく、確認の「起点」の独立にある。

P2B が PASS と判断した対象を P3 が確認したとき、P3 も PASS とする場合は「独立した 2 者の確認が一致した」ことを意味し、PASS の信頼性が高まる。P3 が FAIL を検出する場合は「P2B の見逃し・解釈のブレが発見された」ことを意味し、P2B 単独の確認では顕在化しなかった問題が発見される。

この「独立した 2 者の確認」という設計は、P2B の mandatory diff を「不十分」と評価するためではなく、「P2B が利益相反を持つ actor であることに由来する構造的限界を補完する」ための設計である。

### P2 validation package が不在の場合の preservation recheck

P2 validation package（MANDATORY_DIFF_REPORT を含む）が不在でも、P3 は bridge 原稿 / 最新 Model JSON / build 済 canonical JSON から preservation recheck を実行できる。

preservation recheck が「P2B の mandatory diff 結果を照合する」作業であれば、P2 validation package 不在で実行不能になる。しかし P3 の preservation recheck は「bridge の内容が canonical JSON に正確に反映されているか」を P3 が独立して確認する作業であり、P2B の確認結果の参照なしに実行できる。P2 validation package は確認の効率を高めるが、P3 の recheck 能力の前提ではない。

### 何を守るための仕組みか

preservation recheck は、**P2B の mandatory diff が「自己確認の限界」を持つことへの構造的補完**として設計されている。P3 が独立した立場から同じ対象を再確認することで、preservation に関する「2 者独立確認」の設計が実現する。P2B が PASS と判断したとしても、P3 の recheck が完了するまで preservation の独立検証は完了していない。

### どのドキュメントが正本か

- preservation 対象の設計根拠 → `docs/BOOTSTRAP_STANDARD.md` BS-04
- P1 が宣言する preservation 義務の設計意図 → `docs/P1_STANDARD.md` P1S-02
- P2B の Preservation Firewall の設計意図 → `docs/P2B_STANDARD.md` P2BS-03
- preservation recheck の実行仕様 → `prompts/P3.md` §PRESERVATION_RECHECK_RULE

---

## P3S-04: STRUCTURE ステータス 3 段階分類の設計意図

### 目的

STRUCTURE_OK / STRUCTURE_OK_WITH_CHECK / STRUCTURE_HOLD という 3 段階の STRUCTURE ステータス分類の設計意図を記録する。とりわけ、P2B の BUILD ステータス（4 段階）と段数が異なる設計意図を記録する。

### なぜ 4 段階でなく 3 段階なのか

P2B が 4 段階の BUILD ステータスを使う設計意図は `docs/P2B_STANDARD.md` P2BS-04 を参照する。P3S-04 は「P3 がなぜ 3 段階を使うのか」を記録する。

P2B の BUILD ステータスが 4 段階である理由は、build という「生成行為」の中に「続行できる未完」（BUILD_OK_WITH_PENDING）と「続行できない停止」（BUILD_STOPPED）が明確に異なる性格を持って存在するためである。P2B は「続行するかどうか」を判断する責務を持つ生成工程である。

P3 はこの設計を引き継がず 3 段階にする。その理由は「P3 は生成を行わない」からである。

P3 は「この canonical JSON を P4 へ渡せるか否か」を判定する。「未解決の PENDING がある」も「preservation 違反がある」も、P3 から見ると「P4 へ渡せない」という同一の帰結を持つ。P3 にとって重要な区別は「P4 へ渡せる（STRUCTURE_OK）」「CHECK 項目が残るが渡せる（STRUCTURE_OK_WITH_CHECK）」「渡せない（STRUCTURE_HOLD）」の 3 状態である。

### STRUCTURE_HOLD が「渡せない」を一括して受け持つ設計意図

STRUCTURE_HOLD は以下のすべての「P4 へ渡せない」状態を受け持つ。

- ERROR（preservation 違反 / 構造不整合 / 参照欠落等）が存在する
- P2B から受け取った PENDING が P3 時点で解決できない（未解決 PENDING）
- mandatory diff FAIL が P3 の preservation recheck で再検出された

これらを一括して STRUCTURE_HOLD とする設計意図: P3 の立場からは「P4 へ渡さない」という結論は同じであり、渡せない理由の種類を STRUCTURE ステータスで区別する必要がない。渡せない理由の詳細は P3 の出力（P2_RETURN / ERROR_PENDING_CHECK）の内容によって示せる。

### BUILD_OK_WITH_PENDING の canonical JSON を P3 が検証できる設計意図

P2B が BUILD_OK_WITH_PENDING として渡した canonical JSON は、格納先・方針の人間確認が未完了の状態である。P3 はこの状態の canonical JSON を検証してよい。

この設計の理由: P3 の structural validation は「現時点での canonical JSON の構造が成立しているか」を確認する作業であり、「PENDING が将来どう解決されるか」には依存しない。PENDING が解決されるまで P3 が検証を拒否する設計では、PENDING が長期化した場合に canonical JSON が未検証のまま放置されるリスクがある。

ただし、PENDING の解決後に構造が変わる可能性があるため、P3 は STRUCTURE_OK を宣言できない。P3 は「現時点の構造を確認した上で、未解決 PENDING の存在を明示して STRUCTURE_HOLD とする」という処理を行う。

### STRUCTURE_OK_WITH_CHECK が「止まらない」設計意図

CHECK 項目が残る状態でも P3 は STRUCTURE_OK_WITH_CHECK として P4 へ渡す。

この設計意図: CHECK 項目は「構造は正しいが runtime 確認が必要」な項目である。P3 の責務は構造妥当性の確認であり、「runtime で動くかどうか」は P3 の責務外である（P3S-05 / P3S-09 参照）。P3 の責務外の未確認項目を理由として STRUCTURE_HOLD とすることは「P4 の仕事を P3 が止まることで代替する」ことになり、P3 / P4 の責務境界を崩す。

### NOT_CHECKED が残る場合に STRUCTURE_OK を禁止する設計意図

P2B の NOT_CHECKED 設計（P2BS-04 参照）と同じ論理を P3 が引き継ぐ: 「確認した結果が存在しない」状態で「確認完了」を宣言することは、確認の意味を破壊する。P3 が NOT_CHECKED を残したまま STRUCTURE_OK とすることは「P3 が確認していないものを確認済みとして P4 へ渡す」ことを意味する。

### 何を守るための仕組みか

STRUCTURE ステータス 3 段階分類は、**P3 が「P4 へ渡せる状態か」を検証工程の立場から正確に表現する**設計である。P3 が生成工程でないため、P2B の 4 段階が持つ「続行可能な未完」の概念が不要となり、P4 への渡し可否という P3 の判定責務に最適化された 3 段階になる。

### どのドキュメントが正本か

- BUILD ステータス 4 段階分類の設計意図 → `docs/P2B_STANDARD.md` P2BS-04
- STRUCTURE STATUS の定義と判定方針 → `prompts/P3.md` §STRUCTURE STATUS 定義 / §判定方針

---

## P3S-05: NOT_CHECKED / CHECK 区別と P2 validation package 不在の設計意図

### 目的

P3 における NOT_CHECKED（P3 責務内で確認できなかった）と CHECK（P3 責務外で P4 が確認すべき）の区別の設計意図を記録する。あわせて、P2 validation package 不在時の NOT_PROVIDED 扱いの設計意図を記録する。

### NOT_CHECKED と CHECK を区別する設計意図

P3 が「確認できなかった」には 2 種類の性格がある。

**NOT_CHECKED**: P3 の責務範囲内の確認項目であり、何らかの理由で P3 が実施できなかった状態。P3 は「実施すべきだったが実施できなかった」ことを明示する。NOT_CHECKED が残る場合は STRUCTURE_OK を宣言できない。

**CHECK**: P3 の責務範囲外の確認項目。runtime 確認 / build 実行 / typecheck / UI 確認 / search 動作確認 / SOAP 生成確認等は P4 の責務であり、P3 は実施しない。これらは「P3 が実施できなかった」のではなく「P3 が実施すべき確認ではない」状態である。

この区別の設計意図: CHECK を NOT_CHECKED として扱うと「P3 が本来確認すべきだったが見逃した」という誤った読み方が発生する。CHECK は「P3 が判定した、P4 が確認すべき項目」であり、P3 の判定結果の一部である。P4_HANDOFF への引き継ぎを通じて CHECK は P3 の明示的な出力として機能する。

### NOT_CHECKED / CHECK の区別が P3 の責務範囲を自己表明する仕組み

NOT_CHECKED と CHECK を区別する設計は、P3 の責務範囲を「P3 自身が判定の中で表明する」仕組みでもある。

「この項目は P3 責務内だが確認できなかった（NOT_CHECKED）」と「この項目は P3 責務外であり P4 へ引き継ぐ（CHECK）」を区別することで、P3 が「自分の責務範囲はここまで」を判定の内部で示せる。P3 の責務範囲は `prompts/P3.md` の静的な定義だけでなく、各 validation の判定結果の中で動的に表明される。

### P2 validation package 不在時の NOT_PROVIDED の設計意図

P2 validation package が存在しない場合、P3 は `p2_build_status: NOT_PROVIDED` として扱う。

NOT_PROVIDED は NOT_CHECKED でも CHECK でもない独立した状態である。この設計の意図: P2 validation package の不在は「P2B のプロセスに関する情報が欠けている」ことであり、「P3 が確認すべき canonical JSON の構造が欠けている」ことではない。両者を混同して NOT_PROVIDED を NOT_CHECKED として扱うことは「P2 のプロセス情報がないと P3 は構造を確認できない」という誤った設計を固定することになる。

P3 は build 済 canonical JSON / bridge 原稿 / 最新 Model JSON から自らの責務範囲の structural validation を実行できる（P3S-01 参照）。P2 validation package の不在は REFERENCE_USAGE_REPORT に記録することで、P4 へ「P2 プロセス情報が未提供であった」ことを引き継ぐ。

### 何を守るための仕組みか

NOT_CHECKED / CHECK / NOT_PROVIDED の区別は、**P3 が「自らの責務範囲内の判定」と「後続工程への引き継ぎ」を混同しない**設計である。P3 は自分の責務外の確認を「できなかった」と表現するのではなく、「P4 の仕事」として明示的に P4 へ渡す。この区別が、P3 / P4 の責務境界を判定結果の中で具体化する。

### どのドキュメントが正本か

→ `prompts/P3.md` §P2_OUTPUT_INTAKE_RULE / §判定方針 / §STRUCTURE STATUS 定義

---

## P3S-06: P2_RETURN の設計意図

### 目的

P3 が ERROR を検出した場合に P4 へ進まず P2 へ差し戻す（P2_RETURN）設計意図と、ERROR 存在時に P4_HANDOFF を作成しない設計意図を記録する。

### なぜ ERROR 時に P4 へ進まないのか

P3 が preservation 違反・構造不整合等の ERROR を検出した場合、P4 へ進まず P2_RETURN を発行する。

この設計の根本的な理由: ERROR が存在する canonical JSON は「構造的に問題がある状態」である。P4 が受け取る canonical JSON は「P3 が構造的に問題ないと判定したもの」でなければならない。ERROR を含む canonical JSON を P4 へ渡すことは「P4 が runtime 確認の前に構造問題を解決する責務を持つ」ことを意味するが、構造問題の修正は P2B の責務であり P4 の責務ではない。

問題の修正を「問題が生じた工程（P2B）へ戻す」設計は、各工程の修正責務の帰属を工程間ルーティングで表現するものである。

### P4_HANDOFF を作成しない設計意図

ERROR が存在する場合、P3 は P4_HANDOFF を作成しない。

P4_HANDOFF の作成は「この canonical JSON を P4 へ渡す」という P3 の判定行為を意味する。ERROR が存在する状態で P4_HANDOFF を作成することは「ERROR がある canonical JSON を渡してよい」という P3 の判定を含意してしまう。P4_HANDOFF 不作成は「P3 は P4 へ渡す判定を下していない」ことを構造的に示す。

STRUCTURE_HOLD と P4_HANDOFF 不作成の組み合わせが、後続工程に対して「この canonical JSON は P3 を通過していない」という明示的な信号となる。

### P2_RETURN が P3 の「発見して止まる」動作と一致する理由

P3S-02 で設計した non-modification の原則: P3 は問題を発見しても修正しない。P2_RETURN はこの原則の帰結である。

「修正しないが、何もしない」のではなく、「修正しないが、問題を正確に記録して修正すべき工程へ戻す」。P2_RETURN は P3 が「問題の検出と問題の帰属先への通知」という判定責務を果たした結果であり、P3 が修正に関与することなく問題を処理する設計である。

### 何を守るための仕組みか

P2_RETURN の設計は、**構造問題の修正責務が P2B に帰属することを、工程間のルーティングで表現する**設計である。P3 が ERROR を発見したとき「どこが問題か」を明示して P2B へ戻すことで、「修正する者が検証した者と同一でない」状態を保ちながら問題を処理できる。

### どのドキュメントが正本か

→ `prompts/P3.md` §P2_RETURN_CONDITION / §出力 [P2_RETURN] / §OUTPUT_REQUIREMENTS

---

## P3S-07: P4_HANDOFF の設計意図

### 目的

P3 が P4 へ引き渡す情報パッケージ（P4_HANDOFF）を設計した意図を記録する。

P4 の責務・P4 の実行手順は `docs/P4_STANDARD.md`（未作成）を参照する。P3S-07 は「P3 が P4 へ引き渡す設計意図」のみを記録し、P4 がそれをどう活用するかは語らない。

### P3 が P4 へ渡す情報をまとめる設計意図

P3 の判定結果を P4 が受け取るとき、渡す情報の形式が不定であれば P4 は何を確認すればよいか分からない。P3_HANDOFF（P2B から P3 への handoff、P2BS-07 参照）がそうであるように、P4_HANDOFF も「P3 が何を確認済みとし、何を P4 へ引き継ぐか」を明示した形式を持つ。

P4_HANDOFF に含まれる情報群の設計意図:

**structural validation 結果**: P3 が確認した結果を P4 が受け取ることで、P4 が構造確認を重複して行う非効率を避けられる。P3 が PASS とした項目は P4 が再度構造確認する必要がない。

**CHECK 継続項目（P2 由来 / P3 由来）**: P3 が「構造は問題なし、runtime 確認が必要」と判定した項目を明示することで、P4 は「何を確認すべきか」を P3 の判定結果として受け取れる。P4 が自分で探し出す必要がない。

**preservation recheck 結果**: P3 の preservation recheck の結果を P4 へ引き継ぐことで、P4 は preservation 確認の状態（P2B + P3 の 2 者確認済み、または P3 で再検出した問題）を把握した状態で runtime 確認を開始できる。

**PENDING 継続項目**: P3 時点で解決できなかった PENDING を明示することで、P4 または人間が何を判断しなければならないかを把握できる。

### P4_HANDOFF が P3_HANDOFF と対称に設計されている意図

P2B → P3 の P3_HANDOFF（P2BS-07 参照）は「P2B が確認済みとしたもの・確認未済のもの・引き継ぐべき項目」を明示した。

P3 → P4 の P4_HANDOFF も同じ設計思想を持つ: 「P3 が確認済みとしたもの（structural validation 結果）・P3 の責務外として P4 へ引き継ぐもの（CHECK 項目）・未解決のもの（PENDING 継続項目）」を明示する。

この対称設計により、各工程は「前工程が何を完了し、何を引き継いだか」を明示した状態で開始できる。工程間の引き継ぎが「暗黙の了解」ではなく「明示的な引き継ぎ情報」として設計されることで、各工程が独立した入力を持てる。

### validated canonical JSON を原則全文出力しない設計意図

P3 は validated canonical JSON を原則全文出力しない。

structural validation の結果・差分・CHECK/PENDING 項目という「P4 が受け取るべき信号」が canonical JSON 全文の中に埋もれることを防ぐ。P2B の FULL_OUTPUT_SUPPRESSION_RULE（P2BS-08 参照）と同じ「信号の純化」という論理を P3 が検証工程として体現する。全文が必要な場合は人間が明示的に要求する。

### 何を守るための仕組みか

P4_HANDOFF は、**P3 の判定結果を P4 が「確認済み・引き継ぎ済み・要確認」として明確に受け取れる状態を作る**設計である。P4_HANDOFF が存在することで、「P3 を通過した canonical JSON」と「P3 を通過していない canonical JSON」の区別が明示的になる。

### どのドキュメントが正本か

- P2B → P3 の handoff 設計意図（対称参照）→ `docs/P2B_STANDARD.md` P2BS-07
- P4_HANDOFF の実行仕様 → `prompts/P3.md` §出力 [P4_HANDOFF] / §P4_HANDOFF_RULE

---

## P3S-08: P3 が「しないこと」の設計意図

### 目的

P3 が JSON 修正・bridge 修正・推測補完・alias 生成・runtime 確認・build/typecheck 実行・preservation violation 補正等を行わない設計意図を記録する。

本質的な理由（non-creative build 原則・三工程の独立性）は `docs/P1_STANDARD.md` P1S-03 / P1S-07 に記録されている。P3S-08 はそれを前提として「P3 固有の実行外延の意義」のみを記録する。

### P3 がしないことの外延

**JSON 修正**: P3 が JSON を修正する理由が「検証の結果エラーを直す」であっても「より良い構造に整える」であっても、P3 が修正した時点で P3 は検証者の立場を失う（P3S-02 参照）。

**bridge 本文の修正**: bridge 本文は P3 の検証対象ではなく検証の基準（SOT、DP-07 参照）である。SOT を修正することは「検証基準を変える」ことを意味し、P3 の検証そのものが成立しなくなる。

**推測・補完**: P3 が「おそらくこうであるべき」と推測して canonical JSON の内容を評価することは、「bridge に書かれていること」から「P3 が解釈したこと」への置き換えである。推測を含む検証は、P2B が build した結果の独立確認ではなく、P3 が再解釈した結果の確認になる。

**alias 生成・followup 生成・persona 生成**: これらは bridge に明示されているものを JSON に反映する P2B の build 責務である。P3 がこれらを生成することは P2B の build に後から介入することになり、「P3 が build に関与していない」という独立性の前提を崩す。

**runtime 確認 / build / typecheck の実行**: P3 の責務は構造検証であり、runtime で動くかどうかの確認は P4 の責務である。P3 が先取りすることは P4 の独立した確認の意義を失わせる（P3S-09 参照）。

**preservation violation の補正**: preservation 違反を P3 が補正することは「P3 が修正した canonical JSON を P3 が検証済みとする」ことになり、P3S-02 / P3S-06 の設計と矛盾する。

### 「しないこと」の設計が P3 の独立性を維持する仕組み

P3 がしないこと一覧は禁止事項の列挙ではなく、P3 の独立性の具体的な形である。

P3 が何かを行うたびに、P3 の「検証対象」が「P2B が build したもの」から離れていく。推測が入れば「P3 が解釈したもの」に、修正が入れば「P3 が変えたもの」に、補完が入れば「P3 が補ったもの」になる。P3 がしないこと一覧は、P3 の確認対象が「P2B が build したもの、そのまま」であり続けるための制約である。

### 何を守るための仕組みか

P3 が「しないこと」の設計は、**P3 の検証対象が常に「P2B が生成した canonical JSON」に限定されることを保証する**設計である。「しない」という制約が、P3 の検証対象の純粋性を保つ。

### どのドキュメントが正本か

- non-creative build 原則の設計根拠 → `docs/P1_STANDARD.md` P1S-03
- 三工程の独立性設計 → `docs/P1_STANDARD.md` P1S-07
- P3 の禁止事項一覧 → `prompts/P3.md` §禁止 / §PROHIBITED_VALIDATION_ACTIONS / §本質

---

## P3S-09: P1 / P2B / P4 との責務境界

### 目的

P3 から見た P1（上流定義）・P2B（上流実行）・P4（下流確認）との責務境界を維持する義務の設計意図を記録する。

三工程（P1 → P2B → P3）の設計意図は `docs/P1_STANDARD.md` P1S-07 を参照する。P2B から見た P3 との境界は `docs/P2B_STANDARD.md` P2BS-09 を参照する。P3S-09 はそれらを前提として、「P3 が境界を守ることの義務と意義」のみを記録する。

### P1 との上流境界

P3 は P1 が宣言した preservation 対象・ERROR 条件・stop 条件を検証の基準として受け取る。P3 はこれらの定義を変更できない。

**P1 の宣言が P3 の検証基準である設計の意義**: P3 が「この preservation 対象は今回は確認不要」「この ERROR 条件は厳しすぎる」と判断して P1 の定義を緩めることは許可されない。P3 が P1 の定義を変えることができれば「P3 が都合の良い基準で検証する」設計になり、独立検証の意義が失われる。

**P1 の定義に疑義がある場合の P3 の対応**: 仮に P3 が「この canonical JSON において P1 の preservation 定義が合わない」と判断する状況でも、P3 は STRUCTURE_HOLD として差し戻す。P3 の権限は「P1 の定義に照らした判定」であり、「P1 の定義の評価」ではない。

### P2B との上流境界

**BUILD_STOPPED の canonical JSON を受け取らない設計意図**: P2B が BUILD_STOPPED とした場合、P3 は structural validation を開始しない。P2BS-09 で P2B 側から説明されているが、P3 側の理由: P3 の検証対象は「P2B が build を完了した canonical JSON」であり、BUILD_STOPPED は「P2B が build を完了していない」状態を意味する。P3 は「未完の build 結果の構造を確認する」工程ではない。

**P3 は P2B の判断を上書きしない**: P3 が canonical JSON を確認した結果「P2B の判断は正しい」と分かった場合でも、P3 は P2B の確認結果を遡及的に修正・更新しない。P3 の判定は「P3 の確認結果」であり、「P2B の確認結果の訂正」ではない。

**P3 が P2_RETURN を発行することと P2B の判断の上書きは異なる**: P3 が preservation 違反を検出して P2_RETURN を発行することは「P2B の build が問題を持つ」という判定であり、「P2B の build プロセスの特定の判断を変える」ことではない。P3 は「問題がある」という判定結果を伝えるだけであり、どのように修正するかは P2B の責務である。

### P4 との下流境界

**P3 は P4 の runtime 確認を先取りしない**: runtime 確認 / build 実行 / typecheck / UI 確認 / search 確認 / SOAP 生成確認は P4 の責務である。P3 がこれらを先取りすることは P4 が独立した確認を行う前提を崩す。P3 が runtime 動作を「おそらく問題ない」と判断して PASS とすることは P4 の確認を省略することを意味し、許可されない。

**CHECK 項目の引き継ぎが P4 の独立性を保つ**: P3 が CHECK 項目を P4_HANDOFF に明示することは、P4 に「ここを確認せよ」という作業指示ではなく、「P3 は構造として問題ないと判断した、runtime 確認は P4 の責務である」という P3 の判定結果の引き渡しである。P4 は P3 の判定を受け取った上で、P4 の視点から独立して確認する。

### 何を守るための仕組みか

P1 / P2B / P4 との責務境界の維持は、**P3 が「独立検証者」として機能し続けるための構造的保護**である。P3 が上流の定義を変えたり、上流の build 成果物を修正したり、下流の確認を先取りしたりすることは、いずれも P3 の独立性を特定の方向で失わせる。「P3 には定義権・修正権・runtime 確認権がない」という制約が P3 の独立検証者としての立場を保証する。

### どのドキュメントが正本か

- 三工程設計の意図 → `docs/P1_STANDARD.md` P1S-07
- P2B から見た P3 との境界 → `docs/P2B_STANDARD.md` P2BS-09
- P4 の設計意図 → `docs/P4_STANDARD.md`（未作成）
- P3 の実行禁止事項 → `prompts/P3.md` §禁止 / §本質
