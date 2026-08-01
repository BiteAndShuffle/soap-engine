# PERSONA_PROJECT_APPENDIX.md

Persona Project — 実測・詳細反証・再評価方法（Appendix）

作成: 2026-08-01 ／ 基準 commit: `21c9b6d`

---

## 本文書の位置づけ

本文書は **Appendix** である。`docs/PERSONA_PROJECT_PRINCIPLE.md`（**Core**）の判断を支える**実測値・詳細な反証・コード資産の評価・再評価時の測定方法**を記録する。

| 前提 | 内容 |
|---|---|
| **正本** | 判断規則・設計思想の正本は **Core** である。本書は正本ではない |
| **依存** | 本書は Core を前提として成立する。**Core は本書なしで成立する** |
| **本書が持たないもの** | 新しい結論・判断規則。本書は Core の結論の**根拠**のみを持つ |
| **本書が持たないもの（2）** | 作業手順・改訂順序・完了条件。これらは `docs/reviews/persona/PERSONA_DOC_ALIGNMENT_2026-08-01.md`（実行記録）が正本 |

### 節番号について

本書は Core から移動した節を**元の節番号のまま**収容している。Core 側には対応する欠番がある。番号は再採番しない（理由は Core「節番号の欠番について」）。

| 本書が収容する節 | 内容 |
|---|---|
| **§2.5**（§2.5.1〜§2.5.4） | 現在も有効な知見と再利用候補・保護機構の実測 |
| **§4.3 / §4.4 / §4.5** | runtime 参照 0 の意味・値の出典・コストの非対称性 |
| **第5章**（§5.1 / §5.2 / §5.3 / §5.4 / §5.5） | Validator が欠落を検査する理由。※ §5.4 は **ERROR 分類の意味のみ**。昇格手順は実行記録 |
| **第6章**（§6.1〜§6.5） | 個別の誤解に対する原因分析と実測による反証 |
| **§7.6** | 再評価時に必要な実測項目と基準時点の値 |

---

## 凡例（完全版）

| 記号 | 意味 | 扱い |
|---|---|---|
| 〔実測〕 | 本文書作成時（HEAD `21c9b6d`）に Repository から機械的に測定した事実 | **再測定手順は §7.6。** ファイル行番号を含む記述は、当該ファイルの変更により陳腐化しうる。判断に用いる前に §7.6 の手順で再測定すること |
| 〔Owner〕 | Owner から提供された背景・意思決定。Repository からは測定できない | Repository の grep では検証できない。Owner の発言が唯一の出所である |
| （無印） | 上記から導かれる整理・定義 | — |

**〔Owner〕と〔実測〕を混ぜて記述しない。Owner 提供の背景を実測値のように扱わないこと。**

〔実測〕の記述にファイルパスと行番号（例: `lib/applyPersona.ts:537`）を併記している箇所がある。**行番号は測定時点のものであり、当該ファイルへの行挿入で位置がずれる。** シンボル名での再検索を優先すること。

---

## 2.5 現在も有効な知見と、再利用可能性を評価する候補

> **Core §2.4 の根拠。** 方式が固定文章へ変わることで失われるものと、残るものを分ける。**ただし確度は 2 段階あり、混同しない。**

### 2.5.1 PP-VA — 現在も有効であることが確定している知見・資産

これらは方式選択に依存せず、既に価値が確定している。

| ID | 知見・資産 | なぜ確定しているか |
|---|---|---|
| **PP-VA-1** | **実物評価が必要であるという知見** | Core §2.2 の中核。この知見自体が今後の全判断の前提になる（PP-L-1） |
| **PP-VA-2** | **「AI が変換できること」と「求める品質へ到達すること」は別問題であるという知見** | 実行可能性の確認は品質の確認にならない（PP-L-2） |
| **PP-VA-3** | **過去の生成結果・評価の記録**〔Owner〕 | 何が不足していたかの具体形。第3段階で人格を設計する際の判断材料として、方式に依存せず価値を持つ |
| **PP-VA-4** | **無変換状態との比較という考え方** | 変換結果を評価するには無変換の基準線が要る、という検証設計上の考え方 |

### 2.5.2 PP-RC-A — コード資産としての再利用候補

固定文章方式では runtime 変換が起きないため、**runtime 保護としては不要になりうる**。ただし**生成物の検証**への転用可能性が残る。**いずれも確定ではない。**

| ID | コード資産 | 想定される転用方向（未確定） | 不要になりうる理由 |
|---|---|---|---|
| **PP-RC-A1** | `applyPreservePhrases()`（`lib/applyPersona.ts:537`） | 生成された人格別文章に保護語句が残存しているかの機械照合 | 固定文章では変換が起きないため runtime 保護は不要 |
| **PP-RC-A2** | `isMedicalRecord()`（`lib/applyPersona.ts:216`） | 生成物で申し送り行・指導記録行が改変されていないかの照合 | 同上。また非 export のため転用には切り出しが要る |
| **PP-RC-A3** | `buildPersonaGuard()` / importance 判定（`lib/personaGuard.ts`） | 生成対象シナリオの選別 | 固定文章方式では適用可否を生成時に人間が判断済みとする設計もありうる |
| **PP-RC-A4** | `plain`（全軸 0・無変換） | 将来方式との比較検証の基準線 | 比較の実施方法が変われば別手段に置き換わりうる |
| **PP-RC-A5** | 現行 UI 経路（`Topbar` トグル + 人格選択 + 状態保持） | 人格切替という操作の枠組み | UI 設計は店舗検証前に確定しない |
| **PP-RC-A6** | 現行変換エンジン（`lib/applyPersona.ts` 713 行） | 暫定機能・比較基準 | Core §2.4 のとおり Disposition 保留 |

### 2.5.3 PP-RC-B — コードを廃止しても残る設計知見

コードが不要になっても失われない。**データまたは考え方**として残る。ただし第3段階での採用は未確定。

| ID | 設計知見 | なぜコードに依存しないか |
|---|---|---|
| **PP-RC-B1** | **`PRESERVE_PHRASES` の 8 語句**〔実測〕<br>`受診してください` / `受診をお願いします` / `救急受診も検討` / `自己判断せず` / `処方医に相談` / `中止が妥当` / `減量が妥当` / `変更が必要` | 「絶対に変えてはならない」と判断された**具体的文言のリスト**。実体はコードではなくデータであり、`lib/` の実装を廃止しても失われない。第3段階で上位 AI への指示や人間レビューのチェック項目へ転用する余地があるが、**採否は未確定** |
| **PP-RC-B2** | **`isMedicalRecord()` の 3 パターンが定義する行型**〔実測〕<br>① `^次回[、,，]` かつ `確認[。.]$` ② `(?:ことを｜ことについて｜よう)説明[。.]$` ③ `(?:について｜よう)(?:指導｜助言)[。.]$` | 「申し送り行・指導記録行は文体変換の対象外」という**境界の型定義**。医療記録として形式そのものが意味を持つ行の識別基準であり、方式に依存しない |
| **PP-RC-B3** | **二層防御という設計思想** | 「語句レベル（内容）」と「行型レベル（形式）」の 2 軸で保護するという考え方 |
| **PP-RC-B4** | **事前スキップと事後差し戻しの併用** | 変換系一般に適用しうる防御設計パターン。実装ではなく設計上の型として残る |
| **PP-RC-B5** | **4 軸**（`formality` / `softness` / `density` / `directness`） | 人格差を記述する語彙。ただし第3段階で採用されない可能性がある（Core §1.3） |

> **PP-RC-A / PP-RC-B のいずれについても、「そのまま使える」「直接使う」と現時点で確定させないこと。** 再利用可能性の評価は Core §7.4 の判断時点で行う。

### 2.5.4 保護機構の責務差〔実測〕

PP-RC-A1 / A2 / B1 / B2 の前提となる実測結果を記録する。

| 観点 | `preservePhrases` | `isMedicalRecord()` |
|---|---|---|
| 実体 | `lib/personaGuard.ts:153-162`（export 済み・8 語句） | `lib/applyPersona.ts:216-225`（非 export・3 パターン） |
| 守るもの | **語句**（内容ベース） | **行の型**（文末形式ベース） |
| タイミング | **事後**（変換してから、語句が消えていたら行を差し戻す） | **事前**（そもそも変換しない） |
| 消費箇所 | `lib/applyPersona.ts:537` `applyPreservePhrases()`（呼出は 701-702 の 1 経路） | `lib/applyPersona.ts:237` `transformLines()`（1 箇所） |
| PersonaGuard 経由 | **する** | **しない** |

`lib/personaGuard.ts:23-24` が責務分離を明文で宣言している〔実測〕。

> 情報欠損は禁止（preservePhrases による保護が主要な防衛線）
> medical record 行の変換は applyPersona 側の isMedicalRecord() が担う（PersonaGuard はフィールドレベル制御のみ）

**両者は二層防御を構成している。** 形式で守れない行を内容で守り、内容で守れない語を形式で守る関係である。

---

## 4.3 runtime 参照 0 が意味すること・意味しないこと

> **Core §4.2 / PP-NP-1 の根拠。**

〔実測〕`module.persona` を読むコードは `lib/moduleValidator.ts:421`（存在検査）のみ。`lib/applyPersona.ts` は本フィールドを参照せず、自身の `PERSONA_PROFILES` 定数のみを使用する。

| | 判定 |
|---|---|
| **意味すること** | Persona runtime connection が未接続である（Lifecycle State の事実） |
| **意味しないこと** | canonical 構造として不要であること／枠を保持する判断が誤りであること／将来も使われないこと |

`docs/DESIGN_PRINCIPLES.md` DP-13 は「Runtime で未使用だから不要と判断してはならない」を明文で禁じ、さらに「意図的に未接続である資産は判別可能な形で記録しなければならない」と定める。`lib/types.ts:810` の JSDoc がその記録にあたる〔実測〕。

## 4.4 値の出典

> **Core §4.1 の根拠。**

〔実測〕**35 bridge のいずれも persona の構造を定義していない**（`persona:` セクションを持つ bridge は 0 件）。

したがって `module.persona` は **bridge 正本の対象外＝ model_managed 項目**である（`prompts/RULES.md` §14 の `thirdPanelSPlacement` と同じ性格）。

| 項目 | 内容 |
|---|---|
| 値の出典 | `prompts/vNext/PN5-Non-Scenario.md`「persona セクション（必須）」の fallback 既定値 |
| bridge の役割 | 構造を定義しない。ただし 13 bridge が `nearFuturePriority: 人格切替・ペルソナモードは近未来の優先実装対象` / `futureExpansionPolicy: 将来の拡張枠は保持してよい` を記録している〔実測〕 |
| 他 module との一致 | **検算であり、値の出典ではない** |

### 欠落 2 module の発生原因〔実測〕

| 事象 | 日時 |
|---|---|
| `dm_insulin_regular.json` 生成 | 2026-06-26 22:07 |
| `dm_insulin_intermediate.json` 生成 | 2026-06-27 18:34 |
| **PN5 に persona 節が成立**（commit `e650858`） | **2026-06-29 06:22** |

**両 module は PN5 の persona 規則成立より前に生成された。** 生成時の工程逸脱ではなく、**規則導入境界による欠落**である。

## 4.5 コストの非対称性

> **Core §4.1 の根拠。** 論点は「不要かどうか」ではなく「**いつ払うか**」である。

〔Owner〕枠を保持している理由は runtime のためではなく、**二周目で型・Validator・canonical・UI を全部作り直さないため**である。

**経路ごとに状態が異なるため、分解して記録する。**

| 経路 | 現在の状態 | 第3段階で新規設計が必要か |
|---|---|---|
| **canonical 収載経路** | 33/35 module に存在〔実測〕。F-4b 完了後に全 module へ統一 | **不要**（先払い済み） |
| **Validator 経路** | `MISSING_PERSONA` が既に存在 | **不要**（先払い済み） |
| **runtime 適用経路** | **未接続**（`module.persona` を読むコードは存在しない） | **必要**（第3段階で再設計） |
| **最終固定文章の格納・取得経路** | **未設計** | **必要**（第3段階で決定） |

> **現在先払いできている構造（canonical 収載経路・Validator 経路）と、将来どのみち新規設計が必要な構造（runtime 適用経路・最終格納/取得経路）を混同しないこと。**

先払い済みの 2 経路について、いま払う場合と第3段階で払う場合を比較する。

| | 現在枠を保持する | 第3段階で新規に作る |
|---|---|---|
| canonical JSON | 済（33/35。残 2 module） | 35 module 全件へ追加 |
| 型定義 | 済（`lib/types.ts` `PersonaConfig`） | 型追加 |
| テスト fixture | 済 | `as unknown as ModuleData` 105 箇所〔実測〕の改修要否判定 |
| Validator | 済（`MISSING_PERSONA`） | check 追加 + 全 module 遡及検査 |

---

## 5. Validator が欠落を検査する理由

> **Core §4.2 の根拠。** 本章は Validator の**意味と根拠**のみを扱う。昇格の実行手順・開始条件は実行記録が正本である。

### 5.1 `MISSING_PERSONA` が検査しないもの

| # | 検査しないもの | 担当 |
|---|---|---|
| 1 | **runtime 接続**（Persona runtime connection が動作すること） | — |
| 2 | **最終人格仕様**（人格数・軸・切り分け） | 第3段階 |
| 3 | **最終データ構造**（人格別固定文章の格納形式） | 第3段階 |
| 4 | **文章品質**（persona 変換品質・人格として適切か） | P4 / 人間レビュー |
| 5 | **`persona` の内部構造**（軸の値域・profile の妥当性） | 第3段階 / 人間レビュー |

〔実測〕判定は top-level キー `persona` の存在のみである（`lib/moduleValidator.ts:421`）。

### 5.2 `MISSING_PERSONA` が検査するもの

#### Validator は Repository の仕様を決定しない

Validator の責務は、**既に正本で定義された仕様を、機械的・再現可能に検査すること**である。

| 責務 | 担当 |
|---|---|
| **仕様の宣言**（何が必須か） | `docs/JSON_STANDARD.md` の **Canonical Requirement**（JS-A〜JS-E） |
| **仕様の機械的担保**（宣言どおりか） | `lib/moduleValidator.ts` |

`module.persona` の必須性は **`docs/JSON_STANDARD.md` JS-A が定める**。
`lib/moduleValidator.ts` の `MISSING_PERSONA` は**その宣言を機械的に担保する実装であり、新しい必須規則を追加するものではない**。

したがって「Validator が persona を必須にしている」という理解は誤りである。必須にしているのは JS-A であり、Validator はそれを検査しているにすぎない。**Validator の変更によって Repository の仕様が変わることはない。**

#### 検査対象

> **`docs/JSON_STANDARD.md` JS-A（全 module 必須）の canonical 完成条件として、Persona 接続枠が全 module に存在すること。**

この 1 点のみである。

#### Lifecycle State との関係

**Validator の FAIL 可否を Lifecycle State は決定しない。** 決定するのは Canonical Requirement である。

| 軸 | `module.persona` の値 | FAIL 可否への影響 |
|---|---|---|
| Canonical Requirement（正本: JS-A） | 必須 | **あり** |
| Lifecycle State | canonical field は台帳の登録対象外 | **なし** |

#### 型 optional との関係

〔実測〕`lib/types.ts` の `persona?: PersonaConfig` は optional である。これは Canonical Requirement（JS-A 必須）と矛盾しない。型は入力途中の状態も表現しうるのに対し、Validator は完成物を検査するためである。型を required 化するか否かは別 Disposition であり、本書では判断しない（Core §7.3 PP-NR-6）。

### 5.3 F-4b — 2 module 補完の性格

> **規則導入境界に対する、現行 PN5 規則の遡及適用。**

| 誤った理解 | 正しい理解 |
|---|---|
| 生成時に PN5 の責務違反があった | 当時 PN5 に persona 規則が存在しなかった（§4.4）。工程逸脱ではない |
| データの誤りを修正する | 現行規則を既存 module へ遡及適用する |

#### 補完値の根拠

| # | 根拠 |
|---|---|
| 1 | `prompts/vNext/PN5-Non-Scenario.md`「persona セクション（必須）」が bridge 未記載時の既定値を逐語で定義しており、**推測生成ではない**（`prompts/RULES.md` §2 に非抵触） |
| 2 | 対象 2 module の bridge に persona **構造**の記載がない〔実測〕。DP-07 に非抵触。**bridge 変更は不要** |
| 3 | 35 bridge すべてが persona 構造を定義していない〔実測〕。`module.persona` は model_managed 項目である |

**他 module との一致は検算であり、値の出典ではない。**

なお `dm_insulin_mixed_rapid_long` は PN5 fallback とも bridge とも異なる形状を持つ〔実測〕。**これは F-4b とは別の未説明 drift であり、別途起票して扱う（実行記録 PP-D-1）。本書では判断しない。**

### 5.4 ERROR 分類の意味

> 本節は **ERROR という分類が何を意味するか**のみを扱う。**昇格の実行手順・開始条件・完了条件は実行記録が正本である。**

**ERROR は、Repository が現在の完成条件を満たしていないことを示す分類である。**

**ERROR は、必ずしも build 停止を意味しない。** build を停止するか、ログのみ残して継続するかは、**Validator 自体ではなく Validator の呼び出し側が決定する**。

〔実測〕本 Repository では呼び出し側の方針が 2 系統に分かれている。

| 呼び出し側 | 対象 | ERROR 時の挙動 |
|---|---|---|
| `app/page.tsx:52-58` | **ModuleValidator**（`assertModuleValid`） | **try-catch で捕捉し継続。**「本番でも起動を止めず、エラーをログに残す（UI バッジで表示する）」と明記 |
| `app/page.tsx:63` | **CrossModuleValidator**（`assertCrossModuleValid`） | **握り潰さず throw。build / runtime を停止させる** |
| `lib/validationRunner.ts:35-38` | ModuleValidator | fatal errors を収集して返すのみ。**throw しない** |

この差は `docs/VALIDATOR_STANDARD.md` §4「品質ゲートの設計方針」が既に記述している。

> **`MISSING_PERSONA` の昇格は、build 停止を目的とするものではない。**
> **canonical 完成条件を満たさない状態を、warning ではなく defect として分類するための変更である。**

昇格によって変わるものと変わらないもの:

| 変わるもの | 変わらないもの |
|---|---|
| `console.warn` → `console.error` | `npm run build` の成否 |
| `warnings` → `fatals` 集合への算入 | runtime の起動可否 |
| UI バッジでの表示 | SOAP 生成の動作 |

### 5.5 Validator が保証しないこと

> **Validator は、現在の `module.persona` 構造が最終格納構造として妥当であることを保証しない。**

| 保証する | 保証しない |
|---|---|
| top-level キー `persona` が存在すること | その構造が最終仕様として適切であること |
| 全 module で一貫して存在すること | 値の内容が人格として妥当であること |
| canonical 完成条件を満たすこと | 第3段階で加算 / 移行 / 置換のどれになるか |

**`MISSING_PERSONA` が全 module で 0 件になっても、それは「最終構造が確定した」ことを意味しない。** 意味するのは「接続枠が全 module に通っている」ことだけである。

---

## 6. 誤解してはならない事項（詳細分析）

> **Core §0.2 の PP-NP-1〜PP-NP-5 の根拠。** 本章は各前提について**なぜその誤解が生じるか**と**反証となる実測値**を示す。判定そのものは Core §0.2 が正本である。

### 誤解の要約（旧 §4.7 を統合）

| 誤解 | 事実 | 詳細 |
|---|---|---|
| runtime で使っていないから不要 | Canonical Requirement は JS-A で必須 | §6.1 |
| Future Expansion だから検査しなくてよい | FAIL 可否を決めるのは Canonical Requirement | §6.2 |
| 現在の枠形状が最終仕様である | 予約枠であり最終格納構造ではない | Core §4.1 / §4.6 |
| 2 module の欠落は正常な途中状態 | 第1段階の完了条件に含まれる | §6.4 |

### 6.1 PP-NP-1 — 「runtime 参照が 0 件だから不要」

| | 内容 |
|---|---|
| **誤解の形** | `grep` で参照を数えると 1 件（Validator のみ）。よって使われていない。よって不要 |
| **なぜ生じるか** | 参照数は測定が容易であり、必要性の代理指標として使いたくなる。しかも実測値自体は正しい |
| **実測** | `module.persona` を読むコードは `lib/moduleValidator.ts:421` のみ |
| **反証** | `docs/DESIGN_PRINCIPLES.md` DP-13 が「Runtime で未使用だから不要と判断してはならない」を**明文で禁じている**。DP-13 はさらに「意図的に未接続である資産は判別可能な形で記録しなければならない」と定め、`lib/types.ts:810` の JSDoc がその記録にあたる |
| **結論** | **runtime 参照数は `module.persona` の必要性の指標ではない** |

### 6.2 PP-NP-2 — 「Future Expansion だから検査しなくてよい」

| | 内容 |
|---|---|
| **誤解の形** | `docs/feature-glossary.md` が persona フィールドを Future Expansion と記載 → `docs/DEVELOPMENT_STANDARD.md` §10.1 は Future Expansion を「Validator の FAIL 条件にしてはならない」と定める → よって検査すべきでない |
| **実測** | `prompts/vNext/PN7-Cross-Reference-Audit.md` item R: 「persona は Future Expansion であり §10 の F5 に該当する」「欠落 → FAIL としない（記録のみ）」 |
| **反証** | **Lifecycle State と Canonical Requirement は直交する別軸である。** FAIL 可否を決定するのは Canonical Requirement（正本: JS-A）であり、Lifecycle State ではない。**また、Lifecycle 台帳の登録単位は機能 / 経路 / 実装資産であり、canonical field は登録対象ではない**（Core §4.2） |

#### 誤解の原因

**原因は `Future Expansion` という語だけではない。** 少なくとも次が組み合わさった結果である。

| # | 要因 |
|---|---|
| 1 | **Lifecycle State と Canonical Requirement が未分離であったこと** |
| 2 | **起動時必読経路に Persona Project の設計思想が含まれていないこと**（実測内訳は下記） |
| 3 | **必読文書側に、現行機械変換方式を最終仕様のように見せる記述があること**（§6.3） |
| 4 | **MEMORY に過去時点の「persona 設計固定済み」が残っていること**（§6.5） |
| 5 | **`PN7` item R と `docs/DEVELOPMENT_STANDARD.md` §10.3 F5 が、persona 欠落を FAIL 対象外として制度化していること** |

**これは担当者個人の誤読ではない。Repository の情報構造が同じ推論を再生産していた。**

到達可能な情報だけを正しく読めば、5 要因はいずれも「今は不要」という結論を支持する。反証情報はすべて必読経路の外にある。

#### 要因2 の実測内訳

> 出自: 旧 Core §6.6。Core には一般則のみを残し、Repository 固有の実測は本節が正本とする。

〔実測〕`prompts/vNext/STARTUP_PROMPT.md` が定める起動時必読 4 文書は次である。

```
1. prompts/vNext/HANDOFF.md
2. prompts/PROJECT_CONTEXT.md
3. prompts/RULES.md
4. docs/VALIDATOR_STANDARD.md
```

persona の設計思想を持つ記述は、**5 件すべてがこの経路の外にある**〔実測〕。

| 思想を持つ記述 | 必読経路 |
|---|---|
| `docs/DESIGN_PRINCIPLES.md` DP-13 | 外 |
| `docs/feature-glossary.md` §Persona ③ | 外 |
| `docs/JSON_STANDARD.md` JS-A | 外 |
| `bridges/*.md` の `nearFuturePriority` / `futureExpansionPolicy`（13 件） | 外 |
| `prompts/vNext/PN5-Non-Scenario.md` | PN5 着手時のみ |

一方、**必読経路と MEMORY には反対方向の情報が置かれている**（§6.3 / §6.5）。

> **担当者は文書に忠実である。到達可能な情報だけから導ける結論に到達している。**
> したがって正本の作成だけでは再発を防げない。**必読経路への接続と MEMORY の訂正が成立条件である。**

具体的な改訂対象・順序・完了条件は**実行記録**が正本である。

> **本項は文書側の未整合が原因であるため、関連文書の改訂完了までは本誤解が再発しうる。** 改訂の進行状況は実行記録を参照。

### 6.3 PP-NP-3 — 「`PERSONA_PROFILES` が最終仕様」

| | 内容 |
|---|---|
| **誤解の形** | persona 変換は動いており、人格も定義されている。よって persona は実装済みで、これが仕様である |
| **なぜ生じるか** | 実装が存在し稼働しているため。加えて `prompts/PROJECT_CONTEXT.md` §5 の用語表が「Persona ＝ 文体変換レイヤー（丁寧/やさしい/簡潔など）」と定義しており、これが起動時に最初に届く persona の定義になっている〔実測〕 |
| **実測** | `lib/applyPersona.ts` 713 行 / `lib/personaGuard.ts` 257 行が稼働。`PersonaId` 4 種。`Topbar` にトグル UI（初期値 OFF） |
| **反証** | 最終完成形としては採用しない方針が確定している（Core §2.2 / §2.3）。**ただし現行実装は稼働中であり、廃止判断は行っていない**（Core §2.4） |
| **結論** | 「最終仕様ではない」と「不要」「廃止対象」を混同しないこと |

### 6.4 PP-NP-4 — 「2 module の欠落は正常な途中状態」

| | 内容 |
|---|---|
| **誤解の形** | 段階的実装なので配置が不均一なのは正常。Phase 2 まで放置してよい |
| **なぜ生じるか** | **`docs/feature-glossary.md` L94-96 が明示的にそう書いている**〔実測〕。これは `docs/DEVELOPMENT_STANDARD.md` §10.3 の品質条件 Q1 未充足を記録する目的で書かれた |
| **実測** | 欠落 2 module。両 module は PN5 の persona 規則成立（2026-06-29）より前に生成された（06-26 / 06-27）。§4.4 参照 |
| **反証** | 欠落の**原因**は規則導入境界であり正常だが、**現状の維持**が正当化されるわけではない。第1段階の完了条件は canonical 完成条件の全 module 充足を含む（Core §3.2.3）。<br>さらに **Q1 は Future Expansion 資産に対する品質条件であり、canonical field には適用対象外である**。L94-96 は適用対象でない対象へ Q1 を適用していた |
| **結論** | L94-96 は撤回対象である（実行記録に登録）。**撤回前にこの記述を根拠として補完を見送らないこと** |

### 6.5 PP-NP-5 — 「persona は設計固定済み・実装完了」

| | 内容 |
|---|---|
| **誤解の形** | persona の設計は過去に確定し、実装も完了している。追加作業は不要 |
| **なぜ生じるか** | **毎セッション自動でコンテキストへ入る MEMORY の Persona 設計方針セクションが「persona 設計の固定（完了）」「polite / gentle / concise のみ実装（完了）」と記載している**〔実測〕。しかもここで「固定済み」とされているのは、最終形として採用しない方針の機械変換方式である |
| **実測** | MEMORY は「軸 4 固定、追加禁止」「最大 8 人格」と記述。一方 3 人格と記すが実装は 4 種（`plain` を含む）、`directness` を「未実装」と記すが `PERSONA_PROFILES` には値が入っている ＝ **記録自体にもドリフトがある** |
| **反証** | 完了しているのは「機械変換方式の実装」である。**「Persona Project」は未着手であり、両者は別物である** |

#### MEMORY の位置づけ

**MEMORY は、過去の設計状況や会話上の前提を伝える補助情報であり、Repository の設計正本ではない。**
**MEMORY と Repository 正本が矛盾する場合は、Repository 正本を優先する。**

ただし、新規セッションでは **MEMORY が先に到達する可能性がある**ため、正本と矛盾した古い記述を放置してよいわけではない。

したがって対応は次の 3 点をセットで行う必要がある。

| # | 対応 |
|---|---|
| 1 | **正本文書を作る**（Core） |
| 2 | **起動時必読経路から正本文書へ到達できるようにする**（`prompts/vNext/STARTUP_PROMPT.md`） |
| 3 | **MEMORY 内の矛盾記述を訂正し、正本へのポインタへ置き換える** |

**1 だけでは届かない。2 だけでは矛盾が残る。3 だけでは根拠がない。** 実施順序と完了条件は実行記録が正本である。

---

## 7.6 再評価時に必要な実測項目

再議論・再評価を行う場合、**次を実測してから議論を開始する**。実測なしの議論は Core §7.3 の再生産になる。

| ID | 実測項目 | 取得方法 |
|---|---|---|
| **PP-M-1** | `module.persona` 保持 / 欠落 module 数 | `data/modules/*.json` の top-level `persona` の有無を全件走査 |
| **PP-M-2** | persona 値の形状バリエーションと件数 | 同上。値を正規化して分類 |
| **PP-M-3** | `module.persona` の runtime 参照箇所 | `lib/` `app/` に対する `grep` |
| **PP-M-4** | `MISSING_PERSONA` の検出件数と severity | 全 module に `validateModule` を適用 |
| **PP-M-5** | Validator warning 総数と defect class 内訳 | 同上 |
| **PP-M-6** | bridge における persona 構造記載の有無 | `bridges/*.md` の全件走査 |
| **PP-M-7** | 現行 persona 実装の規模と到達性 | `lib/applyPersona.ts` / `lib/personaGuard.ts` の行数、`app/` からの呼出経路 |
| **PP-M-8** | `as unknown as ModuleData` キャストの分布 | 全ファイル `grep` |

**基準時点の実測値**〔HEAD `21c9b6d`〕:

| ID | 値 |
|---|---|
| PP-M-1 | 保持 33 / 欠落 2 |
| PP-M-2 | PN5 fallback 形 32 ／ 別形状 1 |
| PP-M-3 | 1 箇所（`lib/moduleValidator.ts:421`） |
| PP-M-4 | 2 件 / WARN |
| PP-M-5 | 20 件 / 6 class |
| PP-M-6 | 35 bridge 中 0 件 |
| PP-M-7 | 713 行 + 257 行。`Topbar` から到達可（初期値 OFF） |
| PP-M-8 | 105 箇所（`data/modules/index.ts` 35 / tests 68 / `lib/searchManifest.ts` 1 / worktree 1） |

**基準値は測定時点のものである。** 再評価時は必ず再測定し、差分を確認すること。
