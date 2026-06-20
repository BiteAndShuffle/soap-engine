# P2B_STANDARD.md

SOAP Engine — P2B 工程 設計標準

このドキュメントは、P2B 工程を**設計した意図と判断根拠**を記録する。

**このドキュメントが答える問い:**
「なぜ P2B はこのような実行工程として設計されているのか」

**このドキュメントが答えない問い:**
「P2B をどう実行するか」→ `prompts/P2B.md`
「なぜ bridge が SOT なのか」→ `docs/DESIGN_PRINCIPLES.md` DP-07
「preservation 対象の設計根拠」→ `docs/BOOTSTRAP_STANDARD.md` BS-04
「P2B への preservation 義務宣言の設計意図」→ `docs/P1_STANDARD.md` P1S-02
「non-creative build 原則の設計根拠」→ `docs/P1_STANDARD.md` P1S-03
「P1 → P2B → P3 の三工程設計意図」→ `docs/P1_STANDARD.md` P1S-07
「P3 の設計意図」→ `docs/P3_STANDARD.md`
「canonical JSON の書き方」→ `docs/JSON_STANDARD.md`

最終更新: 2026-06-20

---

## P2BS-00: 目的と位置づけ

### 目的

P2B 工程は、P0-A / P0-B / P0-C / P1 が確立した構造基準・格納ルール・preservation 原則を受け取り、**完成済み bridge 原稿を canonical JSON として構築する**工程である。

その出力（canonical JSON + P2B_SUMMARY + MANDATORY_DIFF_REPORT + P3_HANDOFF）は、P3 が独立検証を行うための入力となる。

### なぜ必要か

P0-A から P1 までの準備工程は「どんな JSON を作るか」「どこに格納するか」「何を守るか」「いつ止まるか」を定義する。しかしこれらの定義だけでは canonical JSON は存在しない。定義を実際の bridge 原稿に適用し、canonical JSON を生成する作業が必要である。

P2B はこの「適用」を担う。定義工程（P0-A〜P1）と実行工程（P2B）を分離することで、それぞれが自分の責務に集中できる。

### P2B の工程内位置

```
P0-A → P0-B → P0-C → (P0-D) → P1 → (P2A) → [P2B] → P3 → P4 → P5
```

P2B は準備工程（P0-A〜P1）の成果物をすべて入力として受け取り、実際の bridge 原稿に適用して canonical JSON を生成する。P2A は任意工程であり、P2A の有無にかかわらず P2B は動作する（P2BS-01 参照）。

### どのドキュメントが正本か

| 関心 | 正本 |
|---|---|
| P2B の実行仕様（入力・出力・build 手順）| `prompts/P2B.md` |
| P2B の設計意図（なぜそうなっているか）| **このドキュメント**（P2B_STANDARD.md）|
| bridge が SOT である根拠 | `docs/DESIGN_PRINCIPLES.md` DP-07 |
| preservation 対象の設計根拠 | `docs/BOOTSTRAP_STANDARD.md` BS-04 |
| preservation 義務宣言の設計意図 | `docs/P1_STANDARD.md` P1S-02 |
| non-creative build 原則の設計根拠 | `docs/P1_STANDARD.md` P1S-03 |
| P1 → P2B → P3 の三工程設計意図 | `docs/P1_STANDARD.md` P1S-07 |
| P3 の設計意図 | `docs/P3_STANDARD.md` |
| canonical JSON の書き方 | `docs/JSON_STANDARD.md` |

### 関連ドキュメント

- `prompts/PROJECT_CONTEXT.md` — 全工程の概観と起動手順
- `prompts/P1.md` — P2B が受け取る preservation 原則・stop 条件を宣言する工程
- `prompts/P3.md` — P2B の build 結果を独立検証する工程

---

## P2BS-01: P2B が「実行工程」として独立する設計意図

### 目的

P2B が、準備工程（P0-A〜P1）とは独立した「実行工程」として存在する設計意図を記録する。

### なぜ必要か

P1 が preservation 対象・non-creative 制約・stop 条件を宣言した後、P2B がそれを実行する、という「宣言してから実行する」設計は自明ではない。なぜ P1 と P2B を同一工程にしないのか。

**定義が実行文脈に引きずられることを防ぐ**: P1 が「宣言しながら build も行う」としたら、stop 条件の定義が「この bridge にとって都合のよい定義」に収束するリスクがある。「build が途中まで進んでいるから、この条件は今回は止まらなくてよい」という合理化が発生しやすくなる。P1 が宣言を完了した後に P2B が実行を開始することで、定義の純粋性が保たれる。

**実行の再現性**: P2B が動作を開始する時点で、stop 条件・preservation 原則・non-creative 制約はすべて確定済みである。P2B が bridge を読んで「この bridge では少し条件を調整しよう」と判断する余地がない。同じ bridge と同じ P1 宣言から、常に同じ build 結果が得られる。

**P3 の独立性の前提**: P3 が独立検証を行うためには、P2B の build が「既知の原則に従ったもの」である必要がある。「P2B が定義した原則に P2B が従った」では P3 が確認する基準を持てない。P1 が原則を宣言し P2B がそれに従うことで、P3 は「P1 の宣言に照らして P2B の build を確認する」という独立した立場を持てる。

### P2A との関係設計

P2A（Model JSON Draft 生成工程）は任意工程である。P2B が P2A の有無にかかわらず動作するよう設計されている。

**P2A の役割**: P2A は canonical build の「器（Model JSON の構造）」を先行して準備する補助工程である。P2A が提供するのは build の器であり、bridge の内容（preservation 対象）ではない。

**P2A が必須でない理由**: 既存の `latest_model_json` を器として利用できる場合、P2A は不要である。P2A の不在は「bridge の内容が不完全である」を意味しない。P2A の不在のみを理由として P2B を停止させることは「器がなければ内容も不要」という誤った帰結を導く。

**P2B の責務の純粋性**: P2B の責務は「bridge を canonical JSON へ非創作・preservation 優先で構築すること」であり、「器がどこから来たか」に依存しない。P2B が P2A の有無を気にしなくてよい設計が、P2B の責務を純粋に保つ。

### 何を守るための仕組みか

実行工程の独立は、**定義が実行結果に引きずられることを防ぐ**ための設計である。P1 が先に宣言を完了し、P2B がその宣言に従って実行することで、「後から都合のよいように定義を変える」という循環を断ち切る。

### どのドキュメントが正本か
→ `prompts/P2B.md` §役割 / §本質 / §入力 / §P2A_HANDOFF_EXECUTION

---

## P2BS-02: Non-creative build を「実行として体現する」設計意図

### 目的

P1 が宣言した non-creative build 原則を、P2B が「実行者として内面化する」設計意図を記録する。

non-creative build 原則の設計根拠（なぜ non-creative build が必要か）は `docs/P1_STANDARD.md` P1S-03 を参照する。P2BS-02 はそれとは異なる問いを記録する: **P2B が non-creative build を「外部からの禁止」ではなく「実行の自律的規律」として体現する意義**。

### なぜ必要か

P1 が non-creative build を「宣言した」だけでは、P2B がその原則を守る仕組みにはならない。

build を実行する P2B は「自然化したい」「補完したい」「より良くしたい」という内部圧力にさらされる。これは外部ルールへの違反という自覚なしに発生する。外部からの禁止（P1 の宣言）だけでは、build の各瞬間でこの内部圧力を制御できない。

P2B が non-creative build を「自分の build 品質の定義」として採用することで、内部圧力の発生源が変わる。「やりたいがやってはいけない」から「それは P2B の仕事ではない」へ。

### determinism が P2B の build 品質を定義する仕組み

P2B にとって non-creative build とは「品質を下げること」ではなく「build の determinism を保証すること」である。

non-creative build = deterministic build: 同じ bridge と同じ P1 宣言から、常に同じ canonical JSON が得られる。これが P2B の build 品質の定義である。creative build（何らかの補完・改善を加えた build）は、加えた内容がセッションごとに変わりうる。determinism が失われると、P2B の build 結果は「この AI セッションが生成したもの」になり、再現可能な工程の成果ではなくなる。

### P3 の検証可能性との関係

P2B が non-creative build を体現することは、P3 の独立検証を「可能にする前提」でもある。

P2B が何らかの創作を加えた場合、P3 は「P2B が変えたものと P2B が変えていないもの」を区別しなければならない。この区別は P2B の実行ログなしには不可能であり、P3 の独立検証が「P2B の意図の解読」に変質してしまう。

P2B が non-creative build を徹底することで、P3 は「bridge に書かれていたものが canonical JSON に正確に入っているか」だけを確認すればよい。これが「P3 が迷わない canonical build」の設計意図である（`prompts/P2B.md` 最重要指示参照）。

### 何を守るための仕組みか

non-creative build の内面化は、**P2B の build 結果を P3 が検証可能な状態に保つ**ための設計である。P2B が「変えない」という選択を一貫して行うことで、P3 は「変わっていないか」という照合に専念できる。

### どのドキュメントが正本か

- non-creative build 原則の設計根拠 → `docs/P1_STANDARD.md` P1S-03
- 実行禁止事項の一覧 → `prompts/P2B.md` §禁止 / §PROHIBITED_BUILD_ACTIONS

---

## P2BS-03: Preservation Firewall の設計意図

### 目的

mandatory diff が「build 完了後の post-hoc check」ではなく「build に内在する工程（build integral）」として設計されている意図を記録する。

preservation 対象の設計根拠は `docs/BOOTSTRAP_STANDARD.md` BS-04 を参照する。P2B への preservation 義務宣言の設計意図は `docs/P1_STANDARD.md` P1S-02 を参照する。P2BS-03 はそれらを前提として「なぜ mandatory diff が build integral なのか」のみを記録する。

### なぜ必要か

preservation の確認を「build が終わった後に行う」アプローチには根本的な欠陥がある。

**修正が新たな推測を生む**: build 完了後に preservation 違反を発見すると、違反した箇所を特定して部分的に再 build する必要がある。partial re-build は「どの段階の build 判断が原因だったか」の遡及を必要とし、その過程で新たな推測が発生する。

**累積違反の不可視化**: post-hoc diff では「最終的な状態」しか確認できない。build の途中で複数の preservation 違反が発生し、一部が偶然に補い合った場合、最終状態だけを見ると違反が見えなくなる可能性がある。

**責任の曖昧化**: build と確認が同じ AI の単一チェーンで行われる場合、確認工程が「自分の build を自分で正当化する」操作に変質するリスクがある。これは P3 の独立検証設計と根本的に矛盾する。

mandatory diff を build integral として設計することで、これらの問題を構造的に排除する。

### build integral の意味

P2B.md の BUILD_SEQUENCE では、mandatory diff は全 build phase の後段（Phase 8）に位置する。これは「build が完了してから diff する」のではなく、**「全 build phase の累積結果に対して diff する」**という設計である。

この配置が保証すること:
- **全体一致の確認**: 各 build phase（brand/alias、followup、addon、scenario 等）が完了した状態で一括して diff を行うため、phase 間の相互作用による preservation 違反を検出できる。addon と scenario が相互参照するように、各要素は独立していない
- **partial build の P3 流入防止**: mandatory diff を通過せずに P3 へ渡すことを禁止しており、「確認未完了の canonical JSON」が P3 に到達することを防ぐ
- **stop の確実性**: FAIL が発生した場合、P2B は例外なく build を停止する。「差分が小さいから続けよう」という判断の余地がない

### Preservation Firewall が「Firewall」と呼ばれる理由

preservation 確認は通常の「チェック」ではなく「Firewall」として設計されている。Firewall の性質:

- 通過条件が厳密に定義されている（PASS / FAIL / NOT_CHECKED のみ）
- NOT_CHECKED が残る場合は通過を許可しない（確認が完了したとは見なさない）
- FAIL が存在する場合は例外なく build を停止する
- P2B が「今回は通過させてよい」と自己判断することを禁止している

このルールの厳格さは、preservation 確認が「努力目標」ではなく「build の通過条件」であることを意味する。

### 何を守るための仕組みか

Preservation Firewall は、**preservation 違反を「build 完了の扱い」に含めさせない**ための設計である。mandatory diff を通過しない限り、P2B の build は完了とみなされない。

### どのドキュメントが正本か

- preservation 対象の設計根拠 → `docs/BOOTSTRAP_STANDARD.md` BS-04
- P2B への preservation 義務宣言の設計意図 → `docs/P1_STANDARD.md` P1S-02
- mandatory diff の実行仕様 → `prompts/P2B.md` §MANDATORY_DIFF_EXECUTION / §P3_HANDOFF_RULE

---

## P2BS-04: BUILD ステータス 4 段階分類の設計意図

### 目的

BUILD_OK / BUILD_OK_WITH_CHECK / BUILD_OK_WITH_PENDING / BUILD_STOPPED という 4 段階の BUILD ステータス分類の設計意図を記録する。

### なぜ必要か

canonical build の結果を「成功か失敗か」の二値で表現することには限界がある。

現実の build では、以下の異なる性格の状態が発生する:
1. preservation も構造整合も確認済みの状態（BUILD_OK）
2. JSON としては成立しているが、app 受け口・runtime の実行確認が必要な状態（BUILD_OK_WITH_CHECK）
3. build は部分的に完了したが、格納先・方針の人間確認が必要な状態（BUILD_OK_WITH_PENDING）
4. preservation 違反または build 不能により P3 へ渡せない状態（BUILD_STOPPED）

状態 2 と状態 3 を「成功」に分類してしまうと、P3 が「何を確認しなければならないか」を知る手段が失われる。4 段階分類は、後続工程に「どの種類の未解決状態が残っているか」を明示するための設計である。

### CHECK と PENDING を分離する設計意図

CHECK と PENDING はいずれも「完全には完了していない」状態だが、未完了の性格が根本的に異なる。

**CHECK**: JSON としては成立しており preservation 違反もないが、runtime / app 受け口の実行確認が必要な項目。P2B は「JSON は正しく作れた。動くかどうかは P3/P4 で確認する」という確信を持って BUILD_OK_WITH_CHECK を発行できる。P2B の build の確信度は高い。

**PENDING**: 格納先・方針が未確定であり、P2B が deterministic な判断を下せない項目。JSON として成立しているかどうか自体が不確かな状態。P2B は「この項目については判断できないため、人間確認を要求する」として NOT_FINAL フラグを立てる。

この分離が意味すること: CHECK は「P2B が正しいと判断した上で P3/P4 に確認を委ねる」、PENDING は「P2B が判断できないため人間に委ねる」という責任の所在の違いである。CHECK を PENDING に混入させると、「P2B が確信している項目」と「P2B が判断できない項目」の区別が失われる。

### BUILD_STOPPED が BUILD_OK_WITH_PENDING と別ステータスである理由

BUILD_OK_WITH_PENDING は「人間確認後に続行できる可能性がある状態」。BUILD_STOPPED は「preservation 違反または build 不能により続行そのものが許可されない状態」。

2 つのステータスは「未完」である点では共通するが、未完の性格が根本的に異なる。BUILD_STOPPED の canonical JSON を「とりあえず P3 へ渡す」ことを禁止するための分離設計である。

### NOT_CHECKED が残る場合に BUILD_OK を禁止する設計意図

P2BS-03 で設計した Preservation Firewall は、各確認に PASS / FAIL / NOT_CHECKED の区別を付ける。このうち NOT_CHECKED は「確認できなかった」ではなく「確認した結果が存在しない」状態である。

NOT_CHECKED が残る状態で BUILD_OK とすることは「確認していないものを確認済みとして扱う」ことを意味する。これは preservation の「抜け」を公式に許容することになるため、BUILD_OK を禁止する。

### 何を守るための仕組みか

4 段階分類は、**後続工程（P3 / P4 / 人間）が「何を確認しなければならないか」を状態として受け取れる**設計である。BUILD ステータスは単なる「結果」ではなく、後続工程への「引き継ぎ情報」として機能する。

### どのドキュメントが正本か
→ `prompts/P2B.md` §出力 / §判定方針 / §STATUS_METADATA_RULE

---

## P2BS-05: VALUE_ORIGIN_CLASSIFICATION の設計意図

### 目的

P2B が生成する canonical JSON の各値を `bridge_managed` / `model_managed` / `deterministic_derived` / `reference_pattern` の 4 分類で管理する設計意図を記録する。

### なぜ必要か

canonical JSON に含まれる値は、その出自が異なる。

- bridge 原稿から直接移植した値（医療記録として最も厳格に保護される）
- Model JSON / JSON RULE / APP RULE が定義する構造値（構造設計として管理される）
- 同一 canonical JSON 内の確定済み値から機械的に導出した値（derivation として追跡できる）
- 他の JSON から構造パターンのみを参照した値（値継承ではなく型参照）

これらを区別せずに「P2B が生成した値」として一括管理すると:

- P3 が「この値は bridge 由来か、P2B が構造定義から取得したか」を判断できない
- preservation 確認で「この値が bridge と異なることは preservation 違反か、それとも構造定義の差分か」を判断できない
- 既存 canonical JSON からの継承値が「どこから来たか」を後から追跡できない

VALUE_ORIGIN_CLASSIFICATION はこれらの問題を「値の出自を明示する」ことで解決する。

### `inherited_from_existing` の明示義務の設計意図

P2B が既存の canonical JSON から値を継承した場合、`inherited_from_existing` として明示することを義務づけている。

この義務の設計意図: 既存 canonical JSON は「bridge の過去の実装の結果」であり、現在の bridge と乖離している可能性がある。`inherited_from_existing` の明示がなければ、P3 は「この値が bridge と一致しているのは P2B が bridge から移植したからか、過去の canonical JSON から継承したからか」を区別できない。区別が不能な場合、P3 の preservation recheck が「bridge 由来でない値を bridge 由来として確認済みとする」リスクがある。

### 分類が P2B の build の透明性を保証する仕組み

P2B が何かを生成するとき、それが「bridge から来たのか」「JSON RULE から来たのか」「同一 JSON 内の計算から来たのか」を分類することで、P2B の build が再現可能なロジックに基づいていることを証明できる。

「分類できない値」が存在する場合、P2B はその値の格納を PENDING として扱う。分類できない = 出自が確定できない = deterministic build ではない、という論理的な帰結による。

### 何を守るための仕組みか

VALUE_ORIGIN_CLASSIFICATION は、**P3 が「bridge に由来する値」と「構造設計に由来する値」を区別できる状態を保証する**ための設計である。

### どのドキュメントが正本か
→ `prompts/P2B.md` §VALUE_ORIGIN_CLASSIFICATION / §REFERENCE_USAGE_REPORT

---

## P2BS-06: BUILD_SEQUENCE の設計意図

### 目的

canonical build に「順序」が必要な理由と、mandatory diff が全 build phase の後段に置かれる設計意図を記録する。

Phase 1〜10 の詳細は `prompts/P2B.md` §BUILD_SEQUENCE を正本とする。P2BS-06 は「なぜ順序があるのか」のみを記録する。

### なぜ必要か

canonical JSON の各フィールドは相互に依存関係を持つ。

代表的な依存関係: `drug.nameAliases` は `drug.search.nameAliases` の完全複写として生成しなければならない。つまり `drug.search.nameAliases` が確定した後でなければ `drug.nameAliases` を生成できない。この順序が逆になると「確定していない値の複写」が発生し、2 箇所の値が乖離する可能性が生じる。

同様に:
- followup の P_CLOSING が確定する前に scenario の P を build すると、P 本文と P_CLOSING の整合確認が取れない
- addon の addonsRef が確定する前に scenario の addonsRef を参照しても参照先が存在しない
- Brand/Alias build が完了する前に Structured build を行うと、参照先 identity が未確定のまま Structured が生成される

BUILD_SEQUENCE は「後のフェーズが前のフェーズの確定値に依存する」という依存関係の連鎖を順序として明示したものである。順序を守らない build は、確定していない値に依存した build を許可することになり、deterministic build の保証が失われる。

### mandatory diff が全 build phase の後段に置かれる設計意図

mandatory diff は全 build phase が完了した後の後段で実行される。

この配置の意義: preservation の確認は各フィールド単独の確認ではなく、「bridge 原稿に含まれるすべての要素が canonical JSON に正確に反映されているか」の全体的な照合である。addon と scenario が相互参照しているように、各要素は独立していない。全 phase が完了した後でなければ、「全体として bridge と一致しているか」を確認できない。

partial な mandatory diff の問題: 仮に Phase 2（Brand/Alias build）完了後に mandatory diff を行い FAIL があれば BUILD_STOPPED とすると、それ以降の Phase（followup、addon、scenario 等）は実行されない。partial build が P3 に届く状態を避けるため、mandatory diff は全 phase 完了後の後段に置かれている。

### 何を守るための仕組みか

BUILD_SEQUENCE は、**「確定していない値への依存」と「partial build の P3 流入」を構造的に禁止する**ための設計である。順序の逸脱は deterministic build の保証を破壊する。

### どのドキュメントが正本か
→ `prompts/P2B.md` §BUILD_SEQUENCE / §BRAND_ALIAS_BUILD_RULE

---

## P2BS-07: P3 Handoff の設計意図

### 目的

P2B が build 結果を P3 へ引き渡す（P3_HANDOFF）設計意図と、P2B が自己検証を行わない理由を記録する。

### なぜ必要か

P2B は canonical JSON を生成した「当事者」である。当事者が自分の成果物を自分で最終検証することは、構造的な利益相反を持つ。

P2B の mandatory diff は「自分が build したものが、自分が受け取った宣言（P1）に従っているかどうか」の照合である。これは必要な確認だが、「build を超えた外部視点からの検証」ではない。P2B の確認漏れ・解釈のブレ・見逃しを P2B 自身が検出することは構造的に困難である。

P3 が独立した立場から同じ canonical JSON を確認することで、この構造的限界を補完する。P3_HANDOFF は「P3 が独立検証を行えるための情報を、P2B が明示的に引き渡す」という P2B の最後の責務である。

### 「引き渡し」が単なる成果物の受け渡しでない理由

P2B が P3 に渡すのは canonical JSON だけではない。P3_HANDOFF には mandatory diff 結果・ERROR / PENDING 項目・CHECK 項目・値の出自分類（inherited_from_existing）・確認未完了フラグ等が含まれる。

これらを含める設計意図: P3 が「P2B がどのような確認を行い、どのような判断を下したか」を知ることで、P3 の確認が「P2B の作業の繰り返し」ではなく「独立した視点からの再確認」になる。P3 が canonical JSON だけを受け取り P2B の作業ログなしに確認しても、「P2B が何を確認済みとして扱ったか」が不明であり、独立検証として機能しない。

### CHECK 項目が残った状態で P3 へ渡す設計意図

BUILD_OK_WITH_CHECK の場合、CHECK 項目が残った状態で P3 へ渡す。

この設計の意図: CHECK 項目は「JSON として成立しており preservation 違反もないが、runtime 確認が必要」な項目。P2B は runtime 確認を実行しない（`prompts/P2B.md` §STANDARD_REFERENCE_PATHS の制限による）。runtime 確認は P3 / P4 の責務であるため、P2B は CHECK 項目を明示した上で引き渡す。

「P2B が確認できないものを P3 へ明示的に渡す」設計が、P3 の確認を「偶発的な発見」から「意図した確認」に変換する。

### 何を守るための仕組みか

P3_HANDOFF は、**P2B の「確認済み」と「確認未済」を P3 が明確に区別できる状態を作る**ための設計である。P2B が作業ログを引き渡すことで、P3 の独立検証が「P2B の視点とは独立した確認」として機能できる。

### どのドキュメントが正本か
→ `prompts/P2B.md` §P3_HANDOFF_RULE / §OUTPUT_REQUIREMENTS / §FULL_OUTPUT_SUPPRESSION_RULE

---

## P2BS-08: P2B が「しないこと」の設計意図

### 目的

P2B が bridge 本文修正・医学判断・JSON 再設計・P3/P4/P5 先取り等を行わない設計意図、および canonical JSON 全文を原則出力しない設計意図（FULL_OUTPUT_SUPPRESSION_RULE）を記録する。

### なぜ必要か

P2B は bridge → canonical JSON の変換を行う工程であり、自由度の高い AI が実行する。自由度が高い分、「善意による逸脱」が発生しやすい。P2B が「しないこと」を設計として明示することで、実行工程の外延を守る。

本質的な理由は `docs/P1_STANDARD.md` P1S-03（non-creative build 原則の設計根拠）に記録されている。P2BS-08 はそれを前提として「P2B 固有の実行外延」の意義のみを記録する。

### P2B がしないことの外延

**bridge 本文の修正**: bridge 本文（S/O/A/P/P_APPEND/P_CLOSING）は medical record として生成されたものである。P2B の役割は「構造化」であり「改善」ではない。本文を修正することは、P2B が「医療記録の内容を変える」ことを意味し、P2B の責務を超える。

**医学的判断**: P2B は canonical JSON の構造的な正確さを確認するが、医学的な妥当性（この用量は正しいか、この注意事項は適切か）を評価しない。医学的判断は bridge 執筆者（医師・薬剤師）の責務であり、P2B が代行することは設計上禁止されている。

**JSON 再設計**: P2B は P0-A / P0-B が確立した JSON 構造を使って build する。build 途中で「この構造はこう変えた方がよい」という判断を行うことは P2B の責務外である。構造の変更は P0-A / P0-B から再設計する。

**P3/P4/P5 の先取り**: P3 が行う structural validation、P4 が行う typecheck / build 実行、P5 が行う release 判定を P2B が先取りすることを禁止している。先取りの問題は「P3/P4/P5 が確認するはずのものを P2B が確認済みとして扱う」ことで、後続工程の独立性が失われることにある。

### canonical JSON 全文を原則出力しない設計意図（FULL_OUTPUT_SUPPRESSION_RULE）

P2B は canonical JSON 全文を原則出力しない。差分・修正箇所・P3_HANDOFF のみを出力することが通常の動作である。

**信号の純化**: canonical JSON 全文を常に出力すると、P3 が受け取る情報量が膨大になり、preservation 違反・CHECK 項目・PENDING 項目という重要な「信号」が埋もれる。差分と P3_HANDOFF のみを出力することで、「何を確認すべきか」の信号が明確になる。

**ERROR 時の全文出力禁止の意図**: ERROR（preservation 違反）が存在する canonical JSON を全文出力することは、「不完全な canonical JSON をあたかも完成形として提示する」ことになる。ERROR が存在する場合は ERROR の内容と問題箇所のみを提示することで、「不完全な canonical JSON が正式な成果物として流通する」ことを防ぐ。

**人間の明示的な要求がある場合のみ全文出力**: 全文が必要な場合は人間が明示的に要求する。「全文出力が必要かどうかの判断を P2B に委ねない」という設計である。P2B が「今回は全文出力してよいだろう」と自己判断することを排除する。

### 何を守るための仕組みか

P2B が「しないこと」の設計は、**P2B の実行外延が「bridge → canonical JSON の非創作・preservation 優先の構築」のみに限定されることを保証する**ための設計である。外延の逸脱を防ぐことで、P3 / P4 / 後続工程がそれぞれの責務に専念できる。

### どのドキュメントが正本か
→ `prompts/P2B.md` §本質 / §禁止 / §PROHIBITED_BUILD_ACTIONS / §FULL_OUTPUT_SUPPRESSION_RULE / §最重要指示

---

## P2BS-09: P1 / P3 との責務境界

### 目的

P2B から見た P1（上流）との境界と P3（下流）との境界を維持する義務の設計意図を記録する。

三工程（P1 → P2B → P3）の設計意図は `docs/P1_STANDARD.md` P1S-07 を参照する。P2BS-09 はそこで確立された三工程設計を前提として、「P2B が境界を守ることの義務と意義」のみを記録する。

### P1 との上流境界

P2B が build を開始した後、P1 が宣言した preservation 対象・stop 条件・non-creative build 制約を変更できない。

**宣言の事後変更がもたらすリスク**: P2B が「この bridge ではこの preservation 対象は不要だ」「この stop 条件は厳しすぎる」と判断して P1 の定義を無効化した場合、P1 の宣言は意味を持たなくなる。P3 が「P1 の宣言に照らして P2B の build を確認する」設計が成立しなくなる。

**「難しい bridge」での境界維持**: P1 の定義を厳格に守ることが困難な bridge（preservation 対象が多い、stop 条件に次々と該当する等）において、P2B が「今回は例外として P1 の定義を緩める」という判断を行うことは許可されない。例外は P2B が判断するのではなく、BUILD_STOPPED として人間の判断を要求する。

**上流への遡及禁止の意義**: P2B が「P1 の定義が間違っていると思う」場合、P2B 内で修正するのではなく、BUILD_STOPPED として止まり P1 から再実行する。上流の工程の成果物を「後段の工程が修正する」設計は、工程間の責任を曖昧にする。

### P3 との下流境界

**独立性の確保**: P3 が独立した視点から確認するためには、P2B が「P3 が何を確認するか」を知っていても、その確認を P2B が「済んだこと」にしてはならない。P3 の確認が「P2B の確認の繰り返し」になると独立検証の意義が失われる。

**runtime 確認の禁止**: P2B は lib/ ファイルを「格納先・型・validator 受け口の確認」のみを目的として参照してよいが、runtime 動作確認・build 確認・UI 確認・search 動作確認は行わない。これらは P3 / P4 の確認範囲であり、P2B が先取りすることを構造的に禁止している（`prompts/P2B.md` §STANDARD_REFERENCE_PATHS）。

### BUILD_STOPPED 後に P3 へ渡さない設計の意義

BUILD_STOPPED の canonical JSON を P3 へ渡すことを禁止している。

この設計意図: P3 は preservation 違反を「修正しない」。P3 の責務は独立検証であり、修正は P2B が行う。BUILD_STOPPED の canonical JSON を P3 が受け取っても、P3 にできることがない。BUILD_STOPPED は「P2B が止まった」という信号であり、「P3 がなんとかする」ものではない。修正が必要な場合は P2B が修正して再 build する。

### 何を守るための仕組みか

P1 / P3 との責務境界の維持は、**「P1 が定義し、P2B が実行し、P3 が検証する」という三工程の独立性が形骸化しないようにする**ための設計である。P2B が P1 の定義を事後変更したり、P3 の仕事を先取りしたりすることは、三工程の独立性を P2B 単独の作業に収斂させることを意味する。

### どのドキュメントが正本か

- 三工程設計の意図 → `docs/P1_STANDARD.md` P1S-07
- P2B の実行禁止事項 → `prompts/P2B.md` §禁止 / §PROHIBITED_BUILD_ACTIONS
- P3 の設計意図 → `docs/P3_STANDARD.md`
