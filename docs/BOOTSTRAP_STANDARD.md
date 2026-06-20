# BOOTSTRAP_STANDARD.md

SOAP Engine — Bootstrap 設計標準

このドキュメントは、P0-A Bootstrap 工程を**設計した意図と判断根拠**を記録する。

**このドキュメントが答える問い:**
「なぜ Bootstrap はこのように設計されているのか」

**このドキュメントが答えない問い:**
「Bootstrap をどう実行するか」→ `prompts/P0-A.md`
「canonical JSON をどう書くか」→ `docs/JSON_STANDARD.md`
「なぜモジュールを剤形分離するのか」→ `docs/DESIGN_PRINCIPLES.md`

最終更新: 2026-06-20

---

## BS-00: 目的と位置づけ

### 目的
Bootstrap（P0-A 工程）は、新しいモジュールの canonical JSON を生成するために必要な
**shared foundation（共有基盤）** を定義する工程である。

その出力（`P0A_MODEL_STRUCTURE_RULE`）は、以後の P2B / P3 / P4 / P5 すべてが依拠する
構造的根拠となる。Bootstrap の品質が、後続工程全体の品質を決定する。

### なぜ必要か
canonical JSON を「bridge 原稿を読んで直接書く」アプローチには欠陥がある。
bridge 原稿は医療指導文書であり、構造の定義ではない。
bridge から直接 JSON を書こうとすると、以下の問題が発生する:

- 構造上の判断（どのキーが必須か、型は何か、参照先はどこか）を推測で行う
- 推測した構造を「正しい」として後続工程へ引き継ぐ
- 後続工程で矛盾が発見されても、根拠が曖昧なため修正が困難

Bootstrap は、この「推測の連鎖」を工程開始時点で断ち切るために存在する。
**構造の権威（latest_model_json）** と **内容の権威（target_bridge_source）** を分離し、
それぞれの役割を明確に定義することが、Bootstrap の根本的な目的である。

### 何を守るための仕組みか
1. **下流汚染の防止**: 基盤が間違えると、P2B〜P5 がすべて間違えた基盤の上で動作する。
   Bootstrap の厳格さは、この「下流汚染」を防ぐためのものである。

2. **医療記録の完全性**: target_bridge_source（bridge 原稿）に含まれる S/O/A/P は
   医師・薬剤師が選んだ医療指導の記録であり、一字も変えてはならない。
   Bootstrap はこの不変性を工程の出発点として確立する。

3. **可再現性**: Bootstrap の出力が deterministic であることで、
   異なる AI セッション・異なる実行者が同じ入力から同じ基盤を導出できる。

### どのドキュメントが正本か

| 関心 | 正本 |
|---|---|
| Bootstrap の実行仕様（入力・出力セクション・禁止ルール）| `prompts/P0-A.md` |
| Bootstrap の設計意図（なぜそうなっているか）| **このドキュメント**（BOOTSTRAP_STANDARD.md）|
| モジュール設計の思想（剤形分離・classKey・bridge SOT）| `docs/DESIGN_PRINCIPLES.md` |
| canonical JSON の書き方（フィールド・型・構造）| `docs/JSON_STANDARD.md` |
| Bootstrap pipeline 外の設計保留事項 | `docs/OPEN_DESIGN_QUESTIONS.md` |

### 関連ドキュメント
- `prompts/PROJECT_CONTEXT.md` — 全工程の概観と起動手順
- `prompts/P0-B.md` — Bootstrap 出力を受けた格納ルール定義工程
- `prompts/P1.md` — Bridge preservation 原則定義工程

---

## BS-01: 入力契約の思想

### 目的
Bootstrap への入力を厳格に定義することで、「何を根拠として構造を決定するか」を
工程開始前に確立する。

### なぜ必要か
Bootstrap の最大のリスクは、**権威の混同**である。

- 構造の権威（Model JSON）から本文を読み取ろうとする
- 内容の権威（bridge 原稿）から構造を推測しようとする
- 比較補助（existing_reference_json）を権威として扱う

これらの混同が発生すると、推測が構造基準として固定され、
以後の工程全体が「推測された構造」の上で動作してしまう。

### 入力の役割分離の設計意図

**latest_model_json（構造の権威）**
この入力は「どんな JSON を作るか」を決める。
型・キー・参照パス・必須/任意の判断はすべてここから行う。
本文・alias・brand・search token など、**モジュール固有の内容はここから読まない**。

**target_bridge_source（内容の権威）**
この入力は「何を JSON に入れるか」を決める。
scenario の本文・addon の本文・alias・brand・search token はすべてここから読む。
**JSON の構造・型・キーはここから決めない**。

この分離の意図は単純である:
- 構造決定に医療内容を混入させると、医療の意味から構造が歪む
- 内容抽出に構造判断を混入させると、構造都合で医療内容が変形する

**existing_reference_json（比較補助・昇格禁止）**
この入力は「既存 JSON との差分を確認する」ための参考に過ぎない。
`latest_model_json` が未提示のとき、この入力が Model JSON に「見えても」、
自動的に Model JSON として扱うことを禁止している。

その理由: 既存 JSON は過去のモジュール生成時の結果であり、
現在の Model JSON 標準とは乖離している可能性がある。
昇格を許可すると、過去の差分・バグ・暫定値が構造基準として固定されるリスクがある。

### 何を守るための仕組みか
入力契約は、**推測の出発点を封じる**ための仕組みである。
正しい入力が揃った時だけ Bootstrap が動作することで、
「不完全な情報から推測で進む」ことを構造的に防いでいる。

### どのドキュメントが正本か
実行時の入力定義（必須/任意、各入力の役割）→ `prompts/P0-A.md` §inputs / §execution_context

### 関連ドキュメント
- BS-05（STOP 条件の思想）— 入力不足時の停止設計

---

## BS-02: Bootstrap の本質

### 目的
Bootstrap が「何ではないか」を明確にすることで、工程の外延を守る。

### なぜ必要か
Bootstrap は高い自由度を持つ AI が実行するため、
境界を明示しないと「善意の逸脱」が発生しやすい。

- JSON を修正したくなる（構造上の問題を見つけたとき）
- bridge 本文を改善したくなる（不自然な日本語を見つけたとき）
- alias を補完したくなる（検索性の向上のため）

これらは医療安全の観点から禁止されている。
Bootstrap の責務は「基盤の定義」であり、「品質の改善」ではない。

### Bootstrap が「やること」
1. `latest_model_json` から構造基準を抽出・定義する
2. `target_bridge_source` から preservation 対象を特定・列挙する
3. P1 以降が迷わない shared foundation（`P0A_MODEL_STRUCTURE_RULE`）を出力する

### Bootstrap が「やらないこと」

| 禁止行為 | なぜ禁止か |
|---|---|
| JSON を修正する | Bootstrap は記述工程であり、修正工程ではない |
| bridge 本文を改善する | bridge は医療記録の正本であり、AI が改善してはならない |
| 医学的妥当性を評価する | 医学的判断は bridge 執筆者（医師・薬剤師）の責務 |
| alias を推定生成する | 患者が入力するキーワードを AI が推測することは、検索精度の誤保証につながる |
| 差分修正指示を作る | 差分の判断は P3 が行い、問題があれば P2 へ差し戻す（P3 は修正しない）|
| deterministic fix を作る | P2 以降の工程を先取りすると、foundation の純粋性が失われる |

### 何を守るための仕組みか
「やらないこと」の明示は、AI の「善意による逸脱」から下流工程を守るためのものである。
Bootstrap が純粋に「抽出と定義」だけを行うことで、
P2B の「build」工程が汚染されていない基盤から開始できる。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §essence / §prohibited_actions

### 関連ドキュメント
- BS-10（Prohibited Inference）— 禁止推測の設計意図

---

## BS-03: パス抽出戦略

### 目的
`latest_model_json` に存在するパスのみを構造基準として確立し、
推測・補完・存在確認前の固定化を防ぐ。

### なぜ必要か
JSON パスは「存在するもの」と「存在しそうなもの」が明確に区別されなければならない。

存在確認前に「あるはず」として固定した構造が後続工程に引き継がれると、
そのパスへの格納を前提として P2B が動作し始める。
実際には存在しないパスへの格納が試みられることで、エラーが後段で顕在化する。

### パス分類の設計意図

**core_paths（実在確認済み・構造基準化）**
`latest_model_json` 上に存在することが前提のパス群。
構造基準として固定する。

**candidate_paths（存在確認候補・固定化禁止）**
`latest_model_json` 上に存在するかどうかを確認する候補パス。
存在確認「前」は構造基準に加えない。存在確認「後」に初めて固定化する。

例: `$.addons.items` はモジュールによって存在しない場合がある。
存在が確認されて初めて `addon_paths_to_extract` が抽出対象になる。

**非存在確認済みパス（明示的記録）**
`latest_model_json` 上に存在しないと確認されたパスは、
CHECK_ITEMS（未解決扱い）に残さず、「非存在・構造基準化禁止」として明示的に記録する。

この設計の意図: 非存在を「不明扱い」にすると、以後の工程が「あるかもしれない」として
推測を続けるリスクがある。非存在を明示することで、この推測の連鎖を断ち切る。

### resolved_runtime_candidate_paths との違い
`P_APPEND` / `P_CLOSING` / `P_ADDON_REFERENCE` は、
runtime 合成上の既知パスとして別途定義される（BS-07 参照）。

これらは「runtime が参照するパス」として既知だが、
`latest_model_json` 上に実在する場合のみ構造基準として固定する。
実在しない場合でも、runtime 既知候補として記録し続ける（固定化はしない）。

### 何を守るための仕組みか
「存在確認なしに固定化しない」という規律が、
構造基準の信頼性を保証する。Bootstrap が出力する構造基準は
「latest_model_json 上に確認できたもの」だけで構成される。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §path_resolution_policy / §core_paths_to_extract / §candidate_paths_to_extract

---

## BS-04: Preservation 設計

### 目的
bridge 原稿に含まれる医療記録の完全性を、canonical JSON 生成後も保証する仕組みを定義する。

### なぜ必要か
bridge 原稿（`target_bridge_source`）は、医師・薬剤師が患者への指導内容を記録したものである。
その内容は、医療的判断の結果として選ばれた言葉・数値・表現で構成されている。

canonical JSON 化の過程でこれらが変化すると:
- 投薬量・用法の表現が変わる（医療安全リスク）
- 副作用説明の強度が変わる（患者への指導の齟齬）
- alias が増減する（検索ヒットの意図しない変化）

preservation_fields の定義は、「何を変えてはならないか」を工程開始時に明示することで、
P2B / P3 / P4 がその不変性を検証できる状態にする。

### Preservation の階層設計

**Count（件数の不変性）**
scenario 件数・addon 件数・brand 件数・alias 件数・followup 件数が
bridge と canonical JSON で一致することを必須とする。

件数が違う = 何かが落ちた、または何かが追加された。どちらも違反である。
この検査は「漏れなく移植されたか」の最小保証として機能する。

**Identity（同一性の不変性）**
scenario id / title / addon key / id / title は bridge の表記と完全一致させる。
これは単なる文字列の一致以上の意味を持つ:
id は後続工程（P2B の addonsRef 生成・expressModes の defaultScenarioId 参照）が
参照するキーとなる。identity が揺れると、参照整合が崩れる。

**Text（本文の不変性）**
S / O / A / P / P_APPEND / P_CLOSING は bridge の本文と完全一致させる。
「一字一句変えない」という制約は、医療安全と文体保全（baseline persona）の両方に由来する。
bridge 執筆者の文体は、その医療機関・医療者の counseling スタイルを反映している（DP-07 参照）。

**Brand / Alias（検索可能性の不変性）**
alias / normalizedAliases / search aliases は bridge に明示されたもののみを移植する。
推測で追加したり、検索性向上目的で補完したりすることを禁止する。

この禁止の理由: 患者が検索する語は、医療機関が認識しているブランド名・よみがなに限定されるべきである。
不明な alias が混入すると、誤った薬剤が検索候補として浮上するリスクがある。

**search token の非 alias 化（重要ルール）**
`commonSearchTokens` / `formulationSearchTokens` は alias ではない。
これらは検索エンジンの AND match 機能のためのトークンであり、
alias 系フィールド（aliases / normalizedAliases / aliasToBrand 等）へ展開してはならない。

この分離は `docs/DESIGN_PRINCIPLES.md` DP-05 で設計根拠が定義されている。
Bootstrap では、その設計を「preservation firewall の検査対象」として取り込んでいる。

**drug.nameAliases の完全一致ルール**
`drug.nameAliases` は `drug.search.nameAliases` の複写として生成する。
`drug.search.nameAliases` が確定した後に複写する順序を守ることで、
2 箇所に独立した alias リストが存在することによる乖離を防ぐ。

### 何を守るための仕組みか
preservation_fields は P2 の「mandatory diff」の検査項目リストとして機能する。
Bootstrap がこれを定義することで、P2B が「何と何を比較しなければならないか」を
明確に把握した状態で build を実行できる。

### どのドキュメントが正本か
- preservation_fields の定義リスト → `prompts/P0-A.md` §preservation_relevant_fields
- 格納ルールと P2 停止条件 → `prompts/P0-B.md` §PRESERVATION_FIREWALL
- 「bridge が SOT である」理由 → `docs/DESIGN_PRINCIPLES.md` DP-07

---

## BS-05: STOP 条件の思想

### 目的
不完全な入力での Bootstrap 実行を禁止し、下流工程への汚染を防ぐ。

### なぜ必要か
Bootstrap の出力（`P0A_MODEL_STRUCTURE_RULE`）は、P2B〜P5 すべての基盤となる。
この基盤が誤った入力から生成されると、その誤りは後続工程全体に伝播する。

停止のコスト: 1 ターンのやり直し（入力を正しく揃えて再実行）
続行のコスト: P2B〜P5 全工程が誤った基盤で動作し、深いレイヤーで矛盾が発覚する

STOP 条件は、**コスト非対称性**に基づく設計判断である。

### 3 種の STOP 条件とその設計意図

**`latest_model_json_missing`**
構造の権威が存在しない状態では、Bootstrap の根本的な責務（構造基準の抽出）が果たせない。
この状態で実行すると、構造基準を「推測」または「既存 JSON から転用」することになる。
どちらも禁止であるため、実行自体を停止する。

**`target_bridge_source_missing`**
preservation 対象を抽出する根拠がない状態では、
「何を保全すべきか」を定義できない。
preservation_fields が空の状態で続行すると、P2B が無保証で build を行うことになる。

**`input_identity_unclear`**
2 つの入力の「どちらが何か」が曖昧な場合、自動補正・自動昇格を行わない。

この設計の意図は特に重要である:
- 入力ラベルが逆転していることを AI が「推測」して補正すると、
  その推測が正しくても誤りでも、構造基準が不透明な根拠から生成される
- 入力の同定は人間が行うべき判断であり、AI が代行してはならない

### `existing_reference_json` の昇格禁止について
`existing_reference_json` が `latest_model_json` らしく見えても、昇格を禁止する理由は明確である。

既存 canonical JSON は「過去の Bootstrap 出力の結果」に過ぎない。
その JSON が現在の Model JSON 標準と一致している保証はない。
昇格を許可すると、**古い設計が新しい設計基準として誤用される**リスクがある。

### 何を守るための仕組みか
STOP 条件は「進んではいけない状況」を確実に検出し、
不完全な基盤の上に後続工程が積み上げられることを防ぐ安全弁である。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §missing_input_policy

---

## BS-06: 出力契約の思想

### 目的
Bootstrap の出力（`P0A_MODEL_STRUCTURE_RULE`）が P2B / P3 にとって何を意味するかを定義する。

### なぜ必要か
Bootstrap が出力するのは「新しい canonical JSON を作るための設計図」である。
この設計図が不完全だと、P2B は判断できない箇所で推測を行い、
P3 は検証できない箇所を見逃す。

出力契約は「P1 以降が迷わないために何を保証するか」を定義する。

### 出力の 2 つの方向性

**P2B（Build 工程）への handoff**
`PRESERVATION_RELEVANT_FIELDS` に列挙された項目が、
P2B の mandatory diff の検査対象となる。
Bootstrap が preservation 対象を明示することで、P2B は
「どの項目を bridge と照合しなければならないか」を始めから知っている状態で動作できる。

**P3（Structural Validation 工程）への handoff**
`STRUCTURAL_VALIDATION_HANDOFF` に列挙された項目が、
P3 の構造整合確認の対象となる。
型整合・参照整合・identity 整合がここに集約される。

### COUNT CONFIRMED の意味
Bootstrap の出力では、件数（scenario 件数・addon 件数等）を
「宣言値」と「列挙数」の両方で確認し、一致した場合のみ `COUNT CONFIRMED` と記録する。

この設計の意図: 「5 件」と宣言して 4 件しか列挙しない出力は、
P2B に誤った期待値を植え付ける。COUNT CONFIRMED は「件数の正確性を証明した」という宣言であり、
P2B が件数確認を再実行しなくてよい根拠となる。

### 何を守るための仕組みか
出力契約の明確化は、**工程間の責任境界**を守るためのものである。
「Bootstrap が保証したこと」と「Bootstrap が保証しなかったこと（CHECK_ITEMS）」を
明示的に分けることで、後続工程が適切な責任を持って動作できる。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §output_sections / §OUTPUT_REQUIREMENTS

---

## BS-07: Runtime Candidate Paths

### 目的
runtime 合成で使用される既知パスを「候補」として記録し、
構造基準への誤固定を防ぎながら P2B / P3 への引き継ぎを行う。

### なぜ必要か
SOAP の P フィールドは、runtime で複数のソースから合成される:

- `P_APPEND`: `$.addons.items[key].text` から挿入
- `P_CLOSING`: `$.defaults.followupProfiles[key].P` から挿入
- `P_ADDON_REFERENCE`: `$.scenarios[].addonsRef.P[]` から参照

これらのパスは「runtime が参照することが既知」だが、
特定の `latest_model_json` 上に存在するとは限らない。

この状況に対して 2 つの誤った対応が考えられる:
1. 「既知だから必ず存在する」として構造基準に固定する → 存在しない module で破綻
2. 「不確かだから記録しない」とする → P2B / P3 が runtime 経路を知らないまま動作する

Bootstrap はどちらでもなく、**「runtime 上の既知候補として記録し、
`latest_model_json` 上の実在確認を経た場合のみ構造基準として固定する」** という設計を採用している。

### 「候補」と「確定」の区別の意図
`resolved_runtime_candidate_paths` という命名の「candidate」は意図的である。

runtime が参照することは既知でも、そのパスが特定の module JSON に存在するかどうかは
`latest_model_json` を見て初めて確認できる。
「候補」として記録することで、P2B は「このパスは runtime が使う可能性がある」と
認識しながら、存在確認後にのみ実際の格納を行う。

### 何を守るための仕組みか
runtime 経路の事前記録は、P2B が runtime 動作を意識しながら build できるようにするためのものである。
これがないと、P2B は「格納先として正しいか」だけを見て build し、
runtime での合成方法を把握しない状態で canonical JSON を生成してしまう。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §resolved_runtime_candidate_paths / §path_resolution_policy

---

## BS-08: Validation Handoff

### 目的
Bootstrap が定義した構造基準を P3（Structural Validation）へ引き継ぐ境界を明確にする。

### なぜ必要か
Bootstrap は「構造を定義する」工程であり、「構造を検証する」工程ではない。
Bootstrap が検証まで行うと、以下の問題が発生する:

- 定義と検証が同じ工程で行われると、「自分が定義した構造を自分で正しいと言う」循環になる
- 検証は「実際の canonical JSON が存在した後」に行う必要があるが、Bootstrap 時点では JSON は存在しない

**検証は P3 の責務**であり、Bootstrap は「何を検証すべきか」のリストを P3 へ渡す。

### Handoff の対象選定基準
`structural_validation_handoff` に含まれる項目は、
「型・参照・整合が JSON 上で確認可能なもの」に限定される。

確認対象の例:
- tagCatalog のキーと groupKeyRegistry の値が一致するか
- `drug.nameAliases` と `drug.search.nameAliases` が完全一致するか
- expressModes の `defaultBrandName` 参照先が brandCatalog に存在するか

これらは「canonical JSON が完成した後」に確認できる整合性であり、
Bootstrap 時点では「これを確認すべき」という要件として記録するだけでよい。

### 何を守るための仕組みか
Validation Handoff は、**工程ごとの責任の純粋化**を守るためのものである。
Bootstrap が P3 の仕事を先取りせず、P3 が Bootstrap の仕事を再実行しない、
という分担の明確化が最終的な品質を支える。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §structural_validation_handoff / `prompts/P3.md`

---

## BS-09: CHECK_ITEMS の考え方

### 目的
一意に決定できない項目を「明示的な不確定」として記録し、
暗黙の推測が下流工程へ混入することを防ぐ。

### なぜ必要か
AI は「なんとかする」傾向がある。不確かな情報に直面したとき、
推測・補完・最良の推定で埋めようとする。

Bootstrap においてこれは有害である。
不確かな構造判断が確定済みとして基盤に組み込まれると、
P2B / P3 / P4 / P5 はその判断が「検証済み」と信じて動作する。
実際に問題が顕在化するのは、しばしば P3 または実機確認の段階になってからである。

**明示的な不確定は、暗黙の確定よりも常に安全である。**

### CHECK_ITEMS が担うもの
CHECK_ITEMS は「宿題リスト」ではなく「不確定の公告」である。

CHECK_ITEMS に項目が存在する場合、後続の P2B は:
- その項目について独自の推測で進まない
- その項目について人間の判断を待つ、またはスキップする
- その項目が解決されるまで関連する格納を PENDING として保持する

つまり CHECK_ITEMS は、**不確定性の可視化を通じて誤った確定を防ぐ**仕組みである。

### CLOSED の意味
COUNT CONFIRMED と同様に、一度 CHECK に入れた項目が
追加確認によって解決された場合は `CLOSED` と明示する。

`CLOSED` にしない場合は「未解決 CHECK を後続工程へ引き継ぐ」という意味になる。
この区別があることで、P2B は「どの不確定事項が残っているか」を正確に把握できる。

### 何を守るための仕組みか
CHECK_ITEMS は「曖昧さを押しつけない」設計である。
Bootstrap が「わからないこと」を明示することで、
P2B / P3 が「自分たちが判断しなければならない箇所」を知ることができる。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §check_item_policy / §CHECK_ITEMS / §OUTPUT_REQUIREMENTS

---

## BS-10: Prohibited Inference

### 目的
Bootstrap 工程内での推測生成を禁止することで、
医療記録の完全性と構造基準の信頼性を守る。

### なぜ必要か
Prohibited Inference（推測生成禁止）は、Bootstrap の設計で最も積極的に守られているルールである。
その理由は医療安全と再現性の両方に由来する。

### 医療安全の観点
alias の推定生成を例に取る。

患者が薬剤名を入力して検索した場合、
適切なモジュールが返ってくるかどうかは alias の精度に依存する。
AI が「このブランドなら、こう読むはずだ」と推測して alias を追加すると:
- 推測したよみがなが正しいブランドと一致しない場合、誤薬剤がヒットする可能性がある
- 推測したよみがなが医療機関の慣習と異なる場合、検索ミスが発生する

「bridge に書かれたもののみ」という制約は、執筆者の意図を守るための安全装置である。

### 再現性の観点
推測生成を許可すると、同じ入力から異なるセッションで異なる出力が生成される。

例えば「検索性向上のために追加した alias」は:
- セッション A では「あるべき」と判断されて追加される
- セッション B では「bridge にない」として除外される

この非決定性は、「同じ入力から同じ出力を保証する」という
Bootstrap の再現性要件と根本的に矛盾する。

### search token の特別な扱い
`commonSearchTokens` / `formulationSearchTokens` は alias ではない。
これらを alias 系フィールドへ展開することを明示的に禁止している。

詳細な設計根拠は `docs/DESIGN_PRINCIPLES.md` DP-05 を参照。
Bootstrap では、その設計を「bridge 由来の token を alias へ転用しない」という
prohibition として実装している。

### 何を守るための仕組みか
Prohibited Inference は、Bootstrap が「知っていることだけを記録する」という
原則を守るための規律一覧である。
「知っているように見える」ことと「確認できている」ことを厳密に区別する。

### どのドキュメントが正本か
→ `prompts/P0-A.md` §prohibited_inference / §model_json_only_rule

### 関連ドキュメント
- `docs/DESIGN_PRINCIPLES.md` DP-05（heparinoid 検索分離原則 — search token の設計根拠）
- `docs/DESIGN_PRINCIPLES.md` DP-08（addons.orderPresets 最小構成原則）

---

## BS-11: 工程境界（P0-A / P0-B / P1）

### 目的
Bootstrap（P0-A）/ 格納ルール定義（P0-B）/ Preservation 原則定義（P1）の
三工程の役割境界を明確にし、統合を行わない判断の根拠を記録する。

### 3 工程の役割分離

| 工程 | 問い | 責務 |
|---|---|---|
| **P0-A（Bootstrap）** | JSON は「どんな構造」を持つべきか | 構造基準・型・参照パスの定義 |
| **P0-B（格納ルール）** | bridge の各要素を JSON の「どこに」「どの形式で」入れるか | 格納先・格納形式・P2 停止条件の定義 |
| **P1（Preservation 原則）** | P2 は build 中に「何を守り」「どこで止まるか」 | 保全原則・非創作原則・停止条件の定義 |

### 統合しない理由
P0-B と P1 は約 80% の関心（preservation 対象・禁止事項）が重複しているように見える。
統合の検討は行われたが、以下の理由で見送られた:

**責務の差異:**
P0-B は「WHERE / HOW（格納先・格納形式）」を定義する。
P1 は「WHAT / WHEN（何を保全し、いつ止まるか）」を定義する。

**pipeline 上の位置:**
P1 は P0-A + P0-B + P0-C を入力として受け取る（P0-C より後段に位置する）。
P0-B と統合すると、P0-B が P0-C の出力を必要とする工程になり、
pipeline 設計の変更が必要になる。

**読込コスト:**
統合した場合、単一の巨大工程（推定 500 行超）を毎回全文読む必要が生じる。
現在の分離設計では、必要な工程のみを選択的に読める。

### P0-A が P0-B / P1 より先に実行される理由
P0-A が確立する構造基準（P0A_MODEL_STRUCTURE_RULE）は、
P0-B の格納ルール定義の前提となる。

「この field はどのパスに格納するか（P0-B）」を定義するには、
「このパスは存在するか（P0-A）」が先に確立されていなければならない。

P0-A → P0-B の順序は、構造の存在確認が格納ルール定義に先行するという
論理的な依存関係から来ている。

### 何を守るための仕組みか
工程境界の明確化は、各工程が「自分の責務の範囲内だけで最良の判断を行う」ことを
可能にするための設計である。
境界が曖昧だと、各工程が互いの判断を先取り・重複・矛盾させるリスクがある。

### どのドキュメントが正本か
→ `prompts/PROJECT_CONTEXT.md` §3（工程概要）/ §8（P0-B / P1 統合レビュー）

---

## BS-12: 保留事項

**スコープ注記:**
この節は **Bootstrap / P0 系に固有の保留事項** のみを扱う。
モジュール設計全体・JSON 標準全体に関する保留事項（classKey 設計・moduleVersion 採番・
localInput 条件定義等）は `docs/OPEN_DESIGN_QUESTIONS.md` に記録する。
ここに記載するのは P0-A / P0-B / P0-D / Structured runtime / schemaGeneration など、
Bootstrap pipeline に直接関係するものに限定する。

---

### P0-E（schemaGeneration 管理工程）の保留

**保留内容:** P0-E 新設（`schemaGeneration` 整数フィールドの実装・モジュール間の世代差分管理）

**保留理由:**
- `schemaGeneration` が `lib/types.ts` に未追加
- モジュール数がまだ少なく、世代差分管理の実需が発生していない
- P0-A の改版計画が具体化していない

**解除条件:** 上記 3 条件のいずれかが発生した場合

---

### Structured runtime 接続の保留

**保留内容:** `SStructured` / `OStructured` / `AStructured` / `PStructured` の runtime 接続

**Bootstrap への影響:**
Bootstrap は `latest_model_json` 上に Structured フィールドが存在する場合、
それを構造基準に含める（存在確認後・固定化）。
しかし runtime が Structured を参照しないため、これらのパスは
「構造上は存在するが、runtime candidate paths ではない」状態となる。

**現状:** `lib/types.ts` に型定義済み。`moduleValidator.ts` で text sync check のみ実施。
全既存モジュールに Structured フィールドが存在するが、runtime では未接続。

**解除条件:** Structured を runtime で使用する UI/API が実装されたとき

---

### schemaGeneration 必須化の保留

**保留内容:** `schemaGeneration` フィールドの `lib/types.ts` への追加・canonical JSON への必須化

**保留理由:** P0-E 保留に連動

---

### StructuredEntry 値バリデーションの保留

**保留内容:** `role` / `transform` / `safety` の値チェックを moduleValidator へ追加

**保留理由:** Structured runtime 接続保留に連動。
値バリデーションは接続設計が確定してから行う。

---

## 監査・設計時の参照ガイド

### 新規チャット開始時の読む順序

1. `prompts/PROJECT_CONTEXT.md` — 現在フェーズと全体感
2. このドキュメント（BOOTSTRAP_STANDARD.md）— Bootstrap 設計意図の把握
3. `prompts/P0-A.md` — Bootstrap を実行する場合の実行仕様
4. `docs/DESIGN_PRINCIPLES.md` — モジュール設計の判断基準
5. `docs/JSON_STANDARD.md` — canonical JSON の書き方

### Bootstrap の判断に迷ったときの問い

| 迷いの内容 | 参照先 |
|---|---|
| このパスは構造基準に固定してよいか | BS-03 / `prompts/P0-A.md` §path_resolution_policy |
| この入力は latest_model_json として扱ってよいか | BS-01 / BS-05 |
| この項目は preservation 対象か | BS-04 / `prompts/P0-A.md` §preservation_relevant_fields |
| これは CHECK_ITEMS か、推測して進んでよいか | BS-09（原則: 推測しない）|
| この alias を追加してよいか | BS-10（原則: bridge 明示分のみ）|
| これは P0-A の責務か、P0-B の責務か | BS-11 |
| この保留事項はどこに記録するか | BS-12 スコープ注記 / `docs/OPEN_DESIGN_QUESTIONS.md` |
