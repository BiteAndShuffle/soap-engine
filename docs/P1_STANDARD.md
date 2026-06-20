# P1_STANDARD.md

SOAP Engine — P1 工程 設計標準

このドキュメントは、P1 工程を**設計した意図と判断根拠**を記録する。

**このドキュメントが答える問い:**
「なぜ P1 は preservation / non-creative / stop 条件を、P2B の build 開始前に "宣言" するのか」

**このドキュメントが答えない問い:**
「P1 をどう実行するか」→ `prompts/P1.md`
「preservation 対象の具体的なフィールドリスト」→ `prompts/P1.md` §MANDATORY_PRESERVATION_TARGETS
「canonical JSON をどう書くか」→ `docs/JSON_STANDARD.md`
「なぜ bridge が SOT なのか」→ `docs/DESIGN_PRINCIPLES.md` DP-07
「Bootstrap が preservation_fields を定義する意図」→ `docs/BOOTSTRAP_STANDARD.md` BS-04

最終更新: 2026-06-20

---

## P1S-00: 目的と位置づけ

### 目的

P1 工程は、P2B（Canonical Build）が開始される前に、**P2B が守るべき原則を宣言する**工程である。

その出力（`P1_BUILD_PRINCIPLE`）は、P2B が参照する preservation 対象・non-creative 制約・stop 条件の構造的根拠となる。

### なぜ必要か

bridge → canonical JSON の変換（P2B）は、医療内容を含む大量のフィールドを処理する複雑な build 作業である。この作業の途中で「このフィールドを守るべきか」「このケースは止まるべきか」を判断すると:

- 処理中の文脈に判断が引きずられる（「ここまで build が進んだから止まりにくい」）
- stop 条件が曖昧なまま進み、後段で矛盾が顕在化する
- 判断の根拠が工程ごとに揺れ、再現性が失われる

P1 はこれらの判断を「build 開始前に確定済みの宣言」として出力することで、P2B を「判断する工程」ではなく「確定済みの原則に従って実行する工程」にする。

### P1 の工程内位置

P1 は以下の位置に存在する:

P0-A → P0-B → P0-C → (P0-D) → **P1** → (P2A) → P2B → P3 → P4 → P5

P0-A が構造基準を確立し、P0-B が格納ルールを定義し、P0-C がアプリ受け口を確定した後、P1 はそれらすべてを入力として「P2B がどう build すべきか」の原則を宣言する。

### P0-B との分離理由

P0-B と P1 は約 80% の関心（preservation 対象・禁止事項）が重複しているように見える。
統合の検討は行われたが、以下の理由で見送られた（`prompts/PROJECT_CONTEXT.md` §8 / `docs/BOOTSTRAP_STANDARD.md` BS-11 参照）:

| 工程 | 担う責務 | 問いの性格 |
|---|---|---|
| P0-B（格納ルール定義） | bridge の各要素を JSON の「どこに」「どの形式で」入れるか | WHERE / HOW |
| P1（Preservation 原則宣言） | P2B は build 中に「何を守り」「どこで止まるか」 | WHAT / WHEN |

P1 は P0-C の出力（APP RULE）を入力として受け取るため、P0-B と統合すると P0-B が P0-C より後段になる pipeline 変更が必要になる。また、格納ルールと保全原則を同一工程が担うことで役割が肥大化し、工程の可読性が低下する。

### どのドキュメントが正本か

| 関心 | 正本 |
|---|---|
| P1 の実行仕様（入力・出力・禁止ルール）| `prompts/P1.md` |
| P1 の設計意図（なぜそうなっているか）| **このドキュメント**（P1_STANDARD.md）|
| bridge が SOT である根拠 | `docs/DESIGN_PRINCIPLES.md` DP-07 |
| Bootstrap が preservation_fields を定義する意図 | `docs/BOOTSTRAP_STANDARD.md` BS-04 |
| P0-B / P1 統合を見送った経緯 | `docs/BOOTSTRAP_STANDARD.md` BS-11 |
| canonical JSON の書き方 | `docs/JSON_STANDARD.md` |
| P2B の設計意図 | `docs/P2B_STANDARD.md` |
| P3 の設計意図 | `docs/P3_STANDARD.md` |

### 関連ドキュメント

- `prompts/PROJECT_CONTEXT.md` — 全工程の概観と起動手順
- `prompts/P0-B.md` — P1 が宣言する preservation 対象の「格納先」を定義する工程
- `prompts/P2B.md` — P1 の宣言を受けて canonical JSON を build する工程

---

## P1S-01: 宣言先行の設計意図

### 目的

P2B の build 開始「前」に preservation 原則・non-creative 制約・stop 条件を宣言しておくことで、P2B が build 中に個別判断を行うことなく、原則に基づいて deterministic に動作できる状態を作る。

### なぜ必要か

「preservation を build しながら判断する」アプローチには根本的な欠陥がある。

bridge → canonical JSON の変換は大量のフィールドを処理する複雑な作業である。この作業の途中で「このフィールドは守るべきか」「このケースは止まるべきか」を判断しようとすると:

1. **判断が文脈に引きずられる**: 「ここまで build が進んだから、このフィールドの差異は小さい方に合わせよう」という合理化が生じやすくなる
2. **stop 条件が曖昧なまま進む**: 「ここで止まるべきかもしれないが、明確な定義がないので続けよう」という先送りが発生する
3. **判断が非再現的になる**: 同じ bridge から始めても、build の進行状況によって判断が変わりうる

P1 がこれらの判断を「build 開始前に確定済みの宣言」として提供することで、P2B はこれらの問いを自分で解決する必要がなくなる。

### 「P2B が迷わず止まれる」設計の意図

P1.md の最重要指示は「P2 が迷わず止まれる stop 条件を作れ」である。

この指示が示す設計思想:
- P2B は「止まるかどうか」を自分で考えてはならない
- P2B は「P1 が定義した stop 条件に該当するかどうか」だけを判定する
- 条件に該当すれば必ず止まる。判断の余地はない

これを実現するには、stop 条件が build 開始「前」に完全に定義されていなければならない。P1 はその事前確定を担う。「P2B が迷わず止まれる stop 条件」は、P2B が自分で作るものではなく、P1 が作るものである。

### 宣言→実行→独立検証 という三層設計

P1 の宣言先行設計は、三工程の分業を成立させるための必要条件である:

- **P1（宣言）**: 何を守るか・何が起きたら止まるかを確定する
- **P2B（実行）**: P1 の宣言に基づいて build し、守れているかを確認し、守れなければ止まる
- **P3（独立検証）**: P2B が build した結果を、P1 の宣言に照らして独立確認する

P1 の宣言がなければ、P2B と P3 は何を「違反」とみなすかの共通基準を持てない。宣言先行は、三工程全体の動作の前提である。

### 何を守るための仕組みか

宣言先行設計は、**P2B の「即興判断」を構造的に排除する**ための仕組みである。P1 の宣言が存在することで、P2B は「P1 が定義した原則に従っているかどうか」という単純な照合に専念できる。「どう判断するか」ではなく「P1 の原則に照らしてどちらか」という問いに変換することで、build の再現性と determinism が保たれる。

### どのドキュメントが正本か
→ `prompts/P1.md` §役割 / §本質 / §最重要指示

---

## P1S-02: preservation 対象の設計意図

### 目的

P2B が「何を完全保持しなければならないか」を、bridge → canonical JSON 変換の開始前に確定する。

### なぜ必要か

bridge 原稿から canonical JSON を生成する過程では、すべての要素が変形・脱落・追加のリスクにさらされる。変形・脱落・追加はいずれも preservation 違反だが、何が preservation 対象かが事前に定義されていなければ、P2B はそれを「違反」として検出できない。

P1 が preservation 対象を明示することで:
- P2B は「この項目は必ず bridge と一致させる」という照合リストを持って build に入れる
- 「守るべきか判断しながら build する」という即興判断設計が排除される
- P3 は「P2B が保全したと主張する項目」が本当に保全されているかを独立に再確認できる

### Bootstrap の preservation 設計との関係

BOOTSTRAP_STANDARD.md BS-04 は、Bootstrap（P0-A）が preservation_fields を「P2B が守るべき対象として定義する」設計意図を記述している。

P1S-02 が記述するのはそれとは異なる:
- BS-04 は「Bootstrap が preservation 対象を定義する意図」（P0-A 工程の責務として）
- P1S-02 は「P1 がその preservation 対象を P2B に向けて宣言する意図」（P2B に命令を下す工程として）

Bootstrap が「この対象は守るべきである」と定義し、P1 が「P2B よ、この build ではこれらを守れ」と宣言する。両者は同じ preservation 対象を扱うが、役割が異なる。

### preservation 対象の各層がなぜ宣言対象になるのか

P1 が宣言する preservation 対象の構成（Count / Identity / Text / Brand+Alias / SearchToken / Followup / Reference / Persona）は、Bootstrap（P0-A）が定義した preservation_fields をそのまま引き継ぐ。各層が「なぜ守るべきか」の設計根拠は `docs/BOOTSTRAP_STANDARD.md` BS-04 を正本とする。

P1S-02 が記録するのはそれとは異なる問いである:
**なぜ P1 が、Bootstrap の定義を「改めて宣言する」必要があるのか。**

Bootstrap は「このプロジェクトにおいて保護すべき対象が何かを確定する」（P0-A 工程の責務）。P1 は「P2B はこの build においてそれらを守る義務を負う」と命令する（P1 工程の責務）。

同じ preservation 対象が、工程によって異なる意味を持つ:

| 工程 | preservation 対象の位置づけ |
|---|---|
| Bootstrap（P0-A）| プロジェクトとして保護すべき対象の「定義」 |
| P1 | この build において P2B が責任を持つ「義務」の帰属宣言 |

Bootstrap の定義がそのまま P2B の義務になるわけではない。P1 が「この build に対して」「P2B へ向けて」宣言することで、preservation_fields は抽象的な定義から実行上の義務へと変換される。P1 の宣言が存在して初めて、P2B は「違反」を「違反として検出する責務」を持つ。

### 何を守るための仕組みか

preservation 対象の事前宣言は、**P2B の mandatory diff の検査リスト**として機能する。P2B は「P1 が宣言した項目」を bridge と照合し、不一致があれば stop する。P3 はその照合結果を独立に再確認する。「何を守るか」の定義・「守れたかの確認」・「確認の独立検証」が三工程に分散される。

### どのドキュメントが正本か

- preservation 対象の具体的なフィールドリスト → `prompts/P1.md` §MANDATORY_PRESERVATION_TARGETS
- preservation 各層の根拠詳細 → `docs/BOOTSTRAP_STANDARD.md` BS-04
- bridge が SOT である根拠 → `docs/DESIGN_PRINCIPLES.md` DP-07
- search token 非 alias 化の根拠 → `docs/DESIGN_PRINCIPLES.md` DP-05

---

## P1S-03: non-creative build 原則の設計意図

### 目的

P2B が行う build を「deterministic かつ非創作」に限定する原則を、build 開始前に宣言する。

### なぜ必要か

bridge → canonical JSON の変換は、AI が大量の自然言語を構造化データへ変換する作業である。この過程では「善意による逸脱」が発生しやすい。

善意による逸脱の典型:
- bridge の日本語表現が不自然に見えると「自然化したくなる」
- alias が少ないと「検索性向上のために補完したくなる」
- JSON として整合性を高めたくて「本文を少し変えたくなる」
- 医療的に正確にしたくて「補足説明を足したくなる」

これらは「より良くしようとしている」という点で悪意がない。だからこそ制御が難しい。善意による逸脱は「ルールに違反している」という自覚なしに発生する。

P1 が non-creative build 原則を明示的に宣言することで、P2B はこれらの「善意の判断」を行うことができなくなる。「補完してよいか」「改善してよいか」という問い自体が発生しない状態を作る。

### 医療安全上の危険性

この禁止が医療安全に直結する理由を、具体的な逸脱シナリオで示す。

bridge 原稿に記された薬の用法・用量・副作用・注意事項は、医師・薬剤師が患者への指導内容として選択した文言である。AI による「改善」は以下のような変化を引き起こしうる:

- 「定期的に副作用の確認をしてください」→「副作用は一般的に軽微です」（強度の変化）
- 「妊娠中の方は必ず医師に相談してください」→「服用前に医師にご相談ください」（対象の希薄化）
- 「1日2回、朝夕食後に服用」→「1日2回食後に服用」（朝夕指定の脱落）

いずれも「より自然な日本語」や「より簡潔な記述」への書き換えとして表面上は無害に見えるが、患者指導の内容が変わる。

P1 の non-creative build 宣言は、**AI が「より良い医療記録」を作ろうとすることを禁止するための安全装置**である。

### BOOTSTRAP_STANDARD.md BS-02 との関係

BOOTSTRAP_STANDARD.md BS-02「Bootstrap の本質」は、Bootstrap（P0-A）自身が JSON 修正・bridge 改善・alias 補完を行わない理由を記述している。

P1S-03 が記述するのはそれとは異なる:

| 文書 | 主語 | 内容 |
|---|---|---|
| BS-02 | P0-A（Bootstrap 自身）| Bootstrap という工程が non-creative である理由 |
| P1S-03 | P1 が P2B に向けて | P2B の build が non-creative でなければならない理由の宣言 |

P1 は自分自身が non-creative なだけでなく、P2B に対して non-creative を義務づける宣言を行う工程である。「禁止の主体」が異なる。

### 何を守るための仕組みか

non-creative build 宣言は、**P2B が「判断の余地」を持たない状態を作る**ための設計である。P2B の責務は「bridge の内容をそのまま canonical JSON へ移植すること」のみである。移植の精度を上げるために内容を変えることは、移植精度の向上ではなく preservation 違反である。

### どのドキュメントが正本か
→ `prompts/P1.md` §NON_CREATIVE_BUILD_PRINCIPLE / §PROHIBITED_ACTIONS

---

## P1S-04: baseline persona preservation の設計意図

### 目的

bridge 本文の「温度感・説明密度・距離感・counseling weight」を preservation 対象に含める設計意図を記録する。

### なぜ必要か

S/O/A/P の本文を「一字一句保持する」だけでは不十分な理由がある。

canonical JSON の本文は、後段でいくつかの変換・合成を経て最終的な SOAP として出力される。persona 変換レイヤー（`applyPersona`）はその一例である。この過程で「一字一句同じ文字列が入っている」という条件は満たされていても、bridge 本文が持っていた「語り方の質感」が失われることがありうる。

baseline persona preservation は「変換・合成の前の起点」を守るための宣言である。bridge 本文の tone を起点として変換が行われることで、その医療機関・医療者が選んだスタイルが最終出力に残ることを保証する。

### bridge 本文が「医療者のスタイルの記録」である理由

bridge 原稿の文体は、その医療機関・医療者が患者とどのように対話するかを反映している。

- 説明密度: 詳細に説明するか、要点のみを伝えるか
- 距離感: 丁寧な敬語で語りかけるか、簡潔に情報を伝えるか
- counseling weight: 副作用説明にどの程度の重みと文量を置くか
- tone: 安心感を与えるか、注意を促すか

これらは医療機関・医療者が意図して選択したスタイルであり、AI が「標準的な記述スタイル」に合わせるために変更してはならない。

`docs/DESIGN_PRINCIPLES.md` DP-07（bridge SOT 原則）は「bridge は内容の正本である」と定める。P1 の baseline persona preservation 宣言は、DP-07 の「内容」の範囲が「文字列」だけでなく「その文字列が持つ語り方・質感」にも及ぶことを P2B に対して明示するものである。

### persona 変換レイヤーとの区別

SOAP Engine には、canonical JSON の本文に対して文体変換を行う persona 変換レイヤーが存在する（`polite` / `gentle` / `concise` 等）。baseline persona preservation はこれと混同されやすいが、役割が異なる。

| 概念 | 役割 | タイミング |
|---|---|---|
| baseline persona preservation | bridge の「語り方の起点」を canonical JSON に正確に移植する | P2B（build 時）|
| persona 変換（applyPersona）| canonical JSON の本文を指定スタイルへ変換して表示する | runtime（表示時）|

baseline が維持されることで、persona 変換は「正確に移植された bridge の文体」を起点として動作できる。baseline が揺れると、persona 変換は「文体が既に変化した状態の本文」に対して適用されることになり、bridge 執筆者のスタイルが失われる。

### 何を守るための仕組みか

baseline persona preservation は、**persona 変換レイヤーが bridge の文体を起点として動作できる状態を保証する**ための宣言である。「同じ文字が入っている」だけでなく「bridge が持っていた語り方の質感が再現されている」という条件を P2B に課す。

### どのドキュメントが正本か

- bridge が SOT である根拠 → `docs/DESIGN_PRINCIPLES.md` DP-07
- baseline persona の具体的な preservation 対象 → `prompts/P1.md` §BASELINE_PERSONA_PRESERVATION
- persona 変換レイヤーの設計 → `prompts/PROJECT_CONTEXT.md`（Persona 設計方針）

---

## P1S-05: stop 条件の設計意図

### 目的

「P1 が stop 条件を定義し、P2B が実判定する」という分業設計の意図を記録する。

### なぜ必要か

P2B は build を実行しながら「止まるべきかどうか」を判断する局面に直面する。このとき、stop 条件が曖昧または未定義であると、以下の問題が発生する:

- **先延ばし**: 「ここで止まるべきかもしれないが、build をある程度進めてから判断しよう」
- **解釈の余地**: 「P1 の趣旨では止まるべきだが、明示的に指示されていないので続けよう」
- **責任の空白**: P2B が「判断は P3 の責務だろう」と思い、P3 が「P2B が通した結果だから問題ない」と思う

P1 が stop 条件を build 前に確定することで、P2B は「P1 が定義した条件に該当するか」という事実判定だけを行えばよい。解釈の余地がない。

### ERROR / PENDING の分類定義を P1 が担う理由

stop 条件には性格の異なる 2 種類がある:

| 種類 | 意味 | P1 が分類する根拠 |
|---|---|---|
| ERROR | preservation 違反または構造的整合が保証できない状態 | P2B が自己判断なしに build を停止すべき条件。P1 が明示しないと P2B が「この程度なら続けよう」と解釈する余地が生じる |
| PENDING | 人間確認が必要だが、構造上は続行可能な状態 | P2B が続行の可否を自分で判断してはならない。「確認が必要な状態」として P1 が定義することで P2B の即興判断を排除する |

P1 がこの分類定義を行う理由:
- ERROR / PENDING の区別は「何が preservation 違反か」の判断に基づく
- preservation 対象の定義は P1 の責務（P1S-02）
- したがって「何が ERROR になるか」の定義も P1 が担う

P2B は P1 の分類定義を受け取り、「この事象は ERROR か PENDING か」を実判定するだけでよい。分類の基準を P2B が決める必要はない。

### 定義と実判定の分離が保つもの

stop 条件の「定義（P1）」と「実判定（P2B）」の分離は、以下を保証する:

- **一貫性**: stop 条件が build 途中で変わらない（P1 が事前に確定している）
- **再現性**: 同じ bridge から同じ stop 判定が導かれる（P2B が即興判断しない）
- **説明可能性**: なぜ止まったかを P1 の定義で明示できる

BUILD_STOPPED が発生した場合、「なぜ止まったのか」の根拠は P1 の定義に存在する。P2B の判断に依存しない。

### 何を守るための仕組みか

stop 条件の事前定義は、**P2B が「止まるかどうか迷う場面をなくす」**ための設計である。P1 の宣言が存在する状態で P2B が動作することで、「この場合は止まるべきか」という判断が「P1 の条件に照らして該当するか」という照合に変換される。

### どのドキュメントが正本か
→ `prompts/P1.md` §STOP_CONDITION / §禁止

---

## P1S-06: P1 が「しないこと」の設計意図

### 目的

P1 が JSON 化・mandatory diff・実 bridge 判定・ERROR/PENDING 実判定を行わない設計意図を記録する。

### なぜ必要か

P1 が「原則を宣言する」工程として機能するためには、**P1 自身が実行工程に踏み込まないこと**が不可欠である。

P1 が実判定を行うと何が起きるか。仮に P1 が「実際の bridge を読んで、scenario が 3 件あることを確認したので、preservation 対象は 3 件」と記録するとする。この場合:

- P1 の出力が bridge 固有の具体値に依存する
- P1 の出力は「P2B が守るべき原則」ではなく「この bridge の実測値」になる
- P2B が「P1 の実測値との一致確認」を行うだけになる
- P3 が「P2B の実測値 = P1 の実測値」という循環確認を行う

P1 が宣言するのは「この種の値を保持しなければならない」という構造的義務であり、「この bridge の件数は N 件である」という実測値ではない。実測値は P2B が bridge から読み取り、自分の build 結果と照合する。

### 宣言的性格が P2B / P3 の独立性を確保する仕組み

P1 の宣言は「actual bridge から独立した原則」である。この独立性が三工程の分業を可能にする:

- P2B は「P1 の宣言」と「actual bridge」を独立に参照し、両者を照合する
- P3 は「P2B の build 結果」と「P1 の宣言」を独立に参照し、P2B の照合が正しかったかを確認する

P1 が actual bridge の実測値を含んでいると、この独立性が失われる:
- P2B が「P1 の実測値と自分の実測値の一致確認」だけになる（二重実測）
- P3 が「P1 実測値 = P2B 判定」という循環確認になる

**三工程の独立性は、P1 が bridge の実測値を持たないことで成立する。**

### P1 が行わないことの設計根拠

P1 が行わない作業はいずれも P2B または P3 の責務として明示的に後段へ委譲されている:

| P1 が行わないこと | 担当工程 | 根拠 |
|---|---|---|
| JSON 化（canonical JSON の生成）| P2B | P1 は宣言工程であり、生成工程ではない |
| mandatory diff の実行（照合）| P2B | P1 は対象を「定義」するが「照合」しない |
| 実 bridge の件数判定 | P2B | bridge の実測は build 実行者（P2B）の責務 |
| ERROR / PENDING の実判定 | P2B | 定義（P1）と実判定（P2B）の分離（P1S-05）|
| preservation 違反の補正委任 | 許容しない | 補正は P2B 差し戻しが原則。P3 は補正しない |

### 何を守るための仕組みか

P1 が「しないこと」の設計は、**P2B と P3 それぞれが「P1 の宣言を参照点として独立に動作できる」状態を保証する**ためのものである。P1 が実行に踏み込まないことで、P2B と P3 の独立性が構造的に担保される。

### どのドキュメントが正本か
→ `prompts/P1.md` §本質 / §禁止 / §最重要指示

---

## P1S-07: P2B / P3 との責務境界

### 目的

「P1（宣言）→ P2B（実行）→ P3（独立検証）」という三工程の分業設計と、各工程が preservation をどのように扱うかを記録する。

### 三工程の本質的な性格

| 工程 | 性格 | 回答する問い |
|---|---|---|
| P1 | 宣言工程（Declarative） | 「何を守るべきか。何が起きたら止まるべきか」 |
| P2B | 実行工程（Execution） | 「P1 の宣言に従って build できたか。守れなければ止まる」 |
| P3 | 独立検証工程（Independent Verification）| 「P2B の build 結果は P1 の宣言を満たしているか」 |

この三工程の設計において、P1 の宣言が「共通の参照点」として機能することで全体が成立する。P1 がなければ P2B と P3 は何を「違反」とみなすかの共通基準を持てない。

### preservation の三層構造

preservation は三工程で役割を分担する:

**P1（定義層）**
「何を守るべきか」を宣言する。各 preservation 層（Count / Identity / Text / Brand+Alias / SearchToken / Followup / Reference / Persona）が保護対象であることを確定する。実際の bridge の値には触れない。

**P2B（一次確認層）**
build を実行しながら、P1 が宣言した preservation 対象について mandatory diff を実行する。bridge の実測値と canonical JSON の build 結果を照合し、PASS / FAIL を判定する。FAIL は P1 の stop 条件定義に従って BUILD_STOPPED とする。

**P3（二次確認層）**
P2B が build 完了と判定した canonical JSON を受け取り、P1 の宣言に照らして preservation recheck を実行する。P2B の確認が見逃した preservation 違反を独立した視点で検出する。

この三層設計は、build 完了時点での一次確認だけでは不十分という判断に基づく。P2B は「build しながら確認する生成者」であるため、自己確認には構造的な限界がある。P3 の独立確認がその限界を補完する。

### stop の三層分担

| 工程 | stop に関する役割 |
|---|---|
| P1 | stop 条件を「定義」する（実判定しない）|
| P2B | stop 条件を「実判定」し、該当すれば BUILD_STOPPED を発動する |
| P3 | 独立確認で違反を発見した場合、P2B へ差し戻す（修正は P3 が行わない）|

P3 が「P2B へ差し戻す」という設計は、preservation 違反の補正は常に P2B が担うという原則に基づく。P3 は修正しない。P3 の検出結果が差し戻しをトリガーする。

### P1_STANDARD が後続 STANDARD の前提になる理由

P2B_STANDARD.md が記述する「なぜ P2B が preservation firewall を実行するのか」は、「P1 が定義した preservation 対象を P2B が実行する」という分業設計なしには説明できない。

P3_STANDARD.md が記述する「なぜ P3 が preservation recheck を行うのか」は、「P2B の一次確認に対して P3 が独立二次確認を行う」という三層設計なしには説明できない。

P1_STANDARD.md は、P2B_STANDARD.md / P3_STANDARD.md が共有する「前提」である。P2B_STANDARD.md / P3_STANDARD.md の各節は「P1_STANDARD.md P1S-XX 参照」として P1 の設計意図を参照する形で記述でき、再定義の重複を避けられる。

### 何を守るための仕組みか

三工程の分業設計は、**「preservation の定義・実行・再確認」が単一工程に集中することを防ぐ**ための設計である。定義・実行・再確認を異なる工程が担うことで、各工程が他工程の結果を参照点として独立に動作できる。単一工程への集中は「作った人間が自分の作業を自分で検証する」という循環を生む。三工程への分散がその循環を構造的に断ち切る。

### どのドキュメントが正本か

- P2B の設計意図 → `docs/P2B_STANDARD.md`
- P3 の設計意図 → `docs/P3_STANDARD.md`
- P2B の実行手順 → `prompts/P2B.md`
- P3 の検証手順 → `prompts/P3.md`
