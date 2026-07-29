# SOAP Engine Development Standard v1.0

SOAP Engine プロジェクト全体構造の最上位文書。

**この文書の性格**
本文書は、既存の正本文書を横断・要約する索引であると同時に、プロジェクト運営規則（工程完了条件・設計資産ライフサイクル等）を定義する文書です。「プロジェクト全体を一枚で理解できる入口」として機能します。個別の判断基準・型定義・工程実行手順の正本は、各節が参照する既存文書側にあります。本文書の記述と参照先文書の記述が食い違う場合、個別の判断基準については常に参照先（既存の正本文書）が優先します。

最終更新: 2026-07-26

---

## 0. この文書の位置づけ

```
DEVELOPMENT_STANDARD.md（本文書・最上位索引）
  ↓
PROJECT_CONTEXT.md（新規セッションが最初に読む前提・現在フェーズ）
  ↓
RULES.md / DESIGN_PRINCIPLES.md / VALIDATOR_STANDARD.md / JSON_STANDARD.md（横断正本群）
  ↓
prompts/vNext/HANDOFF.md → PN1〜PN8（実行工程プロンプト）
```

本文書は「どの文書に何が書いてあるか」「全体がどうつながっているか」を示すための地図であり、
実行手順・禁止事項・型定義そのものは持ちません。

---

## 1. Mission

SOAP エンジンは、日本の調剤薬局・薬剤師向けの **SOAP 形式指導記録自動生成ツール** です。

薬剤師がアプリ上でシナリオと ADDON を選択するだけで、患者ごとの投薬状況（初回・継続・副作用・
アドヒアランス等）に応じた SOAP 指導記録の草稿を生成できることを目指します。複数の薬剤が処方
されている場合でも、SOAP 記録を破綻なく合成できること（semantic merge）も含みます。

現在は糖尿病領域のモジュール群が稼働中ですが、目標は単発領域の実装ではなく、**内服・外用・
点眼・点鼻・吸入・注射・漢方など 50〜300+ モジュールの量産に耐える基盤を作ること**です
（詳細: `prompts/PROJECT_CONTEXT.md` §1）。

---

## 2. Core Philosophy

このプロジェクトで一貫して守られている思想です。各項目は既存の設計原則・ルール文書への
参照であり、本文書が新たに定義するものではありません。

| 原則 | 内容（要約） | 正本 |
|---|---|---|
| **bridge を医学的正本とする** | bridge 原稿が内容の正本。canonical JSON はその実装物にすぎない | DP-07（`docs/DESIGN_PRINCIPLES.md`）/ PROJECT_CONTEXT.md §2 |
| **非創作（non-creative）** | 補完しない・改善しない・自然化しない・医学的推測をしない | PROJECT_CONTEXT.md §2 / `prompts/RULES.md` §2 PROHIBITED_UNIVERSAL |
| **deterministic（推測生成の禁止）** | わからない値は PENDING とし、推測で埋めない。停止条件を明示する | `prompts/RULES.md` §2〜3 / `prompts/vNext/AUTORUN.md` MUST_STOP 条件 |
| **責務分離（単一責務）** | 各工程・各フィールドは 1 つのことだけを担当する（PN1〜PN8 のフェーズ分離、剤形分離原則等） | `prompts/vNext/HANDOFF.md` §2「単一責務」/ DP-01・DP-02 |
| **最小差分での変更** | 本文（S/O/A/P）は凍結対象であり、意図しない範囲まで書き換えない。addon 等の変更範囲は必要最小限に留める | `prompts/vNext/PN1-Text-Extraction.md`「本文凍結宣言」/ `prompts/RULES.md` §22 |
| **強くてニューゲーム原則** | 会話履歴が失われても同じ判断を再現できるよう、設計判断・例外・保留理由・検証手段をすべてリポジトリへ永続化する | DP-00（`docs/DESIGN_PRINCIPLES.md`） |
| **Human Review を残す理由** | 医療記録としての適切性・日本語の自然さ・ドメイン知識に依存する判断は、機械的に正誤を決められないため人間判断に残す | `docs/VALIDATOR_STANDARD.md` §1・§5・§7 |

---

## 3. Architecture

SOAP Engine は「ビルド時（データ生成）」と「実行時（アプリ動作）」の 2 系統から構成されます。

**ビルド時（bridge → canonical JSON）**

```
bridge 原稿（人間可読の指導文正本）
  ↓  PN1〜PN8（詳細は §4）
canonical JSON（data/modules/{moduleId}.json）
```

**ビルド・配信設定（next.config.js）**

Current Standard 経路（`npm run build` = `next build`）に対しては、ビルド時に BUILD_SHA を埋め込み、
実行時に Cache-Control ヘッダーを付与する。`EXPORT_STATIC` 分岐（静的 export 設定）は
Future Expansion（§10.3「現在の Future Expansion 資産」）であり、Current Standard の
ビルド・配信経路には含まれない。

**実行時（アプリ内でのSOAP生成）**

```
HTTPリクエスト
  ↓
入口層（middleware.ts — Basic認証によるアクセスゲート。/_next/* は素通し）
  ↓
app/page.tsx
  ↓
canonical JSON
  ↓
Search（lib/search.ts — ブランド名/一般名検索・候補生成）
  ↓
Scenario（シナリオ選択・ADDON選択・brand制御・handlingTags制御）
  ↓
SOAP生成（経路により異なる）
  ├─ 手動入力経路: buildSoap.ts（S/O/A/P組み立て）+ applyPersona.ts（persona適用）を
  │   app/components/DashboardClient.tsx が直接呼び出す
  └─ NLP経路: lib/createSoapFromInput.ts が lib/soapComposer.ts を呼び出す
  ↓
Runtime確認（実機での検索・シナリオ・SOAP生成・横断機能の確認 — §5・§8参照）
  ↓
Domain Complete（§8で正式定義）
```

各構造要素の詳細スキーマは `docs/JSON_STANDARD.md`、検索仕様の詳細は `docs/DESIGN_PRINCIPLES.md`
DP-09・DP-11、Validator の責務境界は `docs/VALIDATOR_STANDARD.md` を参照してください。

---

## 4. Development Workflow

現在の正式工程（vNext 体系。新規大規模モジュール追加時の標準ワークフロー）です。
各工程の詳細な入出力・禁止事項は `prompts/vNext/PN1-Text-Extraction.md` 〜
`prompts/vNext/PN8-Build-Runtime-Release.md` および `prompts/vNext/HANDOFF.md` を参照してください。

```
bridge作成（STATUS: HEADER_ONLY → DRAFT → FROZEN_FOR_PN1）
  ↓
PN1  — bridge本文をそのまま抽出・保存し、本文を凍結する
  ↓
PN2  — drug / display / composition 等のヘッダー構造を生成する
  ↓
PN3A — 各シナリオの分類（scenarioType等）を判断する（JSONは書かない）
  ↓
PN3B — PN3Aの決定をシナリオメタデータとして適用する
  ↓
PN4A — 治療系シナリオのxStructuredを生成する
PN4B — 副作用系・adherence系・sickday/followupのxStructuredを生成する
PN5  — ui/risks/searchConfig等の非シナリオ構造を生成する
  ↓
PN6  — PN1〜PN5を統合して最終JSONを生成する（新規生成はしない）
  ↓
PN7  — 完成JSONを26項目（A〜AB）で監査する（修正はしない）
  ↓
PN8  — registry登録確認・tsc・buildを実行してrelease判定する
  ↓
Runtime / 実機横断確認 — 検索・シナリオ・SOAP生成・横断機能を実機で確認する
  ↓
Domain Complete
```

PN1・PN2 は常に人間の承認が必須、PN3A〜PN8 は AUTORUN モード（自動連続実行）の対象です
（`prompts/vNext/AUTORUN.md`）。旧体系（P0-A〜P5）は vNext と並行して存在しますが、新規作業は
vNext を標準とします（両体系の使い分けは `prompts/PROJECT_CONTEXT.md` §3・§10 参照）。

---

## 5. Validation Strategy

品質保証は 3 層に分かれており、それぞれ保証する範囲が異なります（詳細: `docs/VALIDATOR_STANDARD.md`）。

| レイヤー | 保証すること | 保証しないこと |
|---|---|---|
| **Validator**（ModuleValidator / CrossModuleValidator / audit スクリプト） | 参照整合性・構造の健全性（型・必須フィールド・一意性・同期）・モジュール境界の整合 | 医学的内容の適切性、設計解釈を要する判断、Runtime品質 |
| **Human Review** | 医療記録としての適切性、成分名・分類の正確性、日本語表現の自然さ、Addon責務の近似性判断 | 機械的に判定できる参照・構造の整合性（Validatorの担当） |
| **Runtime確認**（実機横断確認・PN7/PN4相当） | UX・検索候補の構成順序・シナリオ表示・SOAP生成結果・横断機能（多剤合成等）が実際に動作すること | 静的なJSON構造の整合性（Validatorの担当）、医学的内容そのもの（Human Reviewの担当） |

3 層は互いに代替できません。Validator が PASS しても Runtime 確認をしなければ検索候補の
順序崩れ等は発見できず、Runtime 確認だけでは参照切れ等の構造欠陥は発見できません
（`docs/VALIDATOR_STANDARD.md` §1・§7、`docs/IMPLEMENTATION_CHECKLIST.md` Runtime / 実機横断確認）。

---

## 6. Single Source of Truth

各レイヤーが「何の正本か」は以下のとおりです（DP-07 `docs/DESIGN_PRINCIPLES.md`）。

| レイヤー | 正本の対象 |
|---|---|
| **bridge** | 内容の正本。文言・シナリオ・人間可読の設計意図 |
| **canonical JSON** | 構造実装の正本。runtime / UI / search / validation が参照する実装構造 |
| **validator**（`lib/moduleValidator.ts` 等） | 「参照整合性」「構造健全性」の機械判定における正本。医学的内容・設計解釈の正本ではない |
| **Runtime**（実装コード・実機挙動） | 「実際にユーザーが体験する挙動」の正本。JSON上は正しく見えても、Runtime実装のバグにより異なる挙動になりうるため、疑義がある場合はRuntime側の実挙動を優先して調査する |

bridge から JSON への一方向フロー（JSON から bridge を逆生成しない）が原則です
（DP-07。個別フィールドの bridge/JSON 責務分担は `docs/JSON_STANDARD.md` JS-00 判断フローを参照）。

---

## 7. Documentation Map

「何を知りたいときにどの文書を読むか」の索引です。

| 文書 | 読むべき場面 |
|---|---|
| `prompts/PROJECT_CONTEXT.md` | 新規セッション開始時に最初に読む。現在のフェーズ・進捗・プロジェクト概要 |
| `prompts/RULES.md` | 横断ルール辞書。禁止事項・ERROR/PENDING/CHECK定義・型変換表・matchPolicy変更ルール等 |
| `docs/DESIGN_PRINCIPLES.md` | 「なぜそう設計したか」の根拠（DP-00〜DP-11） |
| `docs/JSON_STANDARD.md` | canonical JSONの「どう書くか」（フィールド定義・必須/任意/条件付き必須の分類） |
| `docs/OPEN_DESIGN_QUESTIONS.md` | まだ決めていないこと（保留事項と判断タイミング） |
| `docs/VALIDATOR_STANDARD.md` | Validatorが何を保証し、何を保証しないか。errorCode一覧 |
| `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` | 検索単位・SOAP主語・製品バリエーション分離原則（DP-14候補）。持続型製剤・BF・容量違い等の派生製剤をどう扱うか |
| `docs/IMPLEMENTATION_CHECKLIST.md` | 実装後に毎回行う検証チェックリスト・Runtime/実機横断確認 |
| `docs/TEAM_CHARTER.md` | Human / ChatGPT / Claude の役割分担 |
| `docs/BOOTSTRAP_STANDARD.md` / `docs/P1_STANDARD.md` 〜 `docs/P5_STANDARD.md` | 旧体系（P0-A〜P5）各工程の設計意図（「なぜこの工程はこう設計されているか」） |
| `docs/feature-glossary.md` | Rapid / Express / NLP等、UI機能用語の定義 |
| `prompts/vNext/HANDOFF.md` | vNext体系の新規チャット引き継ぎ文書。設計思想・完了済みモジュール一覧・技術的負債 |
| `prompts/vNext/STARTUP_PROMPT.md` | vNext新規チャット起動プロンプトの正本（コピペ用） |
| `prompts/vNext/AUTORUN.md` | PN3A〜PN8自動連続実行の制御ルール・MUST_STOP条件 |
| `prompts/vNext/PN1-Text-Extraction.md` 〜 `PN8-Build-Runtime-Release.md` | 各工程の実行プロンプト正本 |
| `prompts/P0-A.md` 〜 `prompts/P5.md` | 旧体系の実行プロンプト正本 |

---

## 8. Domain Completion Definition

**Domain Complete** とは、ある薬効・診療領域（例: 糖尿病、点眼）に属する全モジュールが、
以下の工程をすべて通過した状態を指します。

```
対象領域の全モジュールについて:
  bridge STATUS: JSON_COMPLETE
    ↓
  PN7: FAIL 0件（CHECKが残る場合はユーザー承認取得済み）
    ↓
  PN8: RELEASE_OK（tsc PASS / build PASS / registry登録済み）
    ↓
  Runtime / 実機横断確認: 全必須チェック実施済み
    （検索・シナリオ・SOAP生成・横断機能 — 詳細は `docs/IMPLEMENTATION_CHECKLIST.md`）
    ↓
  Domain Complete
```

Domain Complete は「個々のモジュールがbuildを通る」ことではなく、「その領域を通じて実機で
確認された挙動が期待どおりである」ことまでを含みます。糖尿病領域はこの一連の工程を経て
完了しており（`prompts/vNext/HANDOFF.md` 完了モジュール一覧）、次の点眼領域も同じ基準で
完了を判定します。

---

## 9. Future Domain Expansion

新しい領域（点眼・点鼻・吸入・漢方等）を追加する際の基本方針です。

```
糖尿病（完了）
  ↓
点眼（次領域）
  ↓
（以降、同じ方針で拡張）
```

**基本方針**
- 既存ルール（RULES.md / DESIGN_PRINCIPLES.md / JSON_STANDARD.md / VALIDATOR_STANDARD.md）を
  まず適用する。新領域固有の事情を理由に独自ルールを作らない
- 既存ルールで説明できない例外・新しい設計パターンが発生した場合は、その場しのぎの実装で
  終わらせず、`docs/DESIGN_PRINCIPLES.md` へ新規 DP として昇格させる（本整備での DP-11 が実例）
- 新しい `matchPolicy` 等のフィールドを追加する場合は、型定義・JSON_STANDARD・DESIGN_PRINCIPLES
  （新パターンの場合）・テスト・Runtime確認項目を同一作業内で更新する（`prompts/RULES.md` §26）
- 判断を保留する場合は `docs/OPEN_DESIGN_QUESTIONS.md` に「何が確定すれば判断できるか」を
  明記し、確定後は DESIGN_PRINCIPLES.md / JSON_STANDARD.md へ移管する
- 各領域の完了は §8 の Domain Completion Definition に従って判定する

この方針により、領域が増えるごとにルールが再発明されるのではなく、既存ルールの適用範囲が
広がり、真に新しい設計判断のみが DP として蓄積されていく構造を維持します。

---

## 10. 設計資産ライフサイクル

本節は設計資産の状態と遷移ゲートを定める運営規則である。根拠となる設計原則は
`docs/DESIGN_PRINCIPLES.md` DP-13（段階的実装原則）を参照。

本節の Future Expansion は設計資産のライフサイクル状態を指し、§9 Future Domain Expansion が
扱う診療領域・モジュール領域の拡張方針とは区別する。

### 10.1 設計資産ライフサイクル（5 状態）

| 状態 | 意味 | 新規作業で使用するか | 更新可能か | 参照可能か | Validator・必須ゲートの対象か | 次状態への移行条件 |
|---|---|---|---|---|---|---|
| Experimental | 試行中。正本ではない | 使用しない | 更新可 | 参照可（試行中と明示の上で） | 対象外 | 採用→Current Standard / 不採用→Archived |
| Current Standard | 現行正本。実装・運用の根拠 | 使用する | 更新可 | 参照可 | 対象 | 後継体系が Legacy 完了条件（10.2）を満たす→Legacy |
| Future Expansion | 実装予定・設計意図あり。意図的に未接続 | 枠の維持のみ | 設計確定時に更新可 | 参照可 | FAIL 条件にしてはならない | Runtime 接続→Current Standard / 破棄決定→Archived |
| Legacy | 新規作業では使用しない。監査・履歴確認では参照可 | 使用しない | 原則凍結（誤記修正のみ可） | 参照可 | 対象外 | 参照必要性の消滅→Archived |
| Archived | 履歴保存のみ。正本でも参照標準でもない | 使用しない | 更新しない | 履歴目的のみ | 対象外 | 終端 |

状態は必ずファイル内またはスキーマ定義に明示する。状態が未表示の資産は、次のセッションから
Current Standard と区別できない。

### 10.2 Legacy 完了条件（L1〜L7・全充足が要件）

| ID | 条件 | 検証者 |
|---|---|---|
| L1 | 現行体系（Current Standard）からの必須参照がゼロ | Tier2（grep） |
| L2 | 必要な設計意図が現行体系へ移管済み | Tier1 が判定、Tier2 が実施 |
| L3 | ファイル内に状態表示が存在する | Tier2 |
| L4 | 新規作業で使用しない旨が明示 | Tier2 |
| L5 | 更新禁止または更新条件が明示 | Tier2 |
| L6 | Documentation Map から Legacy 領域として到達可能 | Tier2 |
| L7 | Owner が Legacy 化を承認している | Owner |

- L7 は L1〜L6 の充足を提示した上で取得する。抽象的な事前承認ではなく、証拠に基づく承認とする
- 承認単位はファイル単位でなくバッチ単位でよい
- L7 を置く根拠: `prompts/RULES.md` §24（Bridge Status State Machine）は bridge の状態遷移について
  「Claude が自主的に降格させてはならない」と定めている。設計資産の状態遷移にも同じ規律を適用する
- ファイル先頭に状態表示を書くだけでは Legacy 化は完了しない

#### 現在の Legacy 資産

| 資産 | L1 必須参照 | L2 設計意図の移管先 | L7 承認 |
|---|---|---|---|
| `app/components/LockGate.tsx` | ゼロ（`app/` / `lib/` から import 元 0 件） | `middleware.ts`（HTTPリクエストレベルの Basic 認証ゲート。commit 1517800 で本ファイルの `app/layout.tsx` からの接続除去と同時に導入） | Owner 承認済み |

L3〜L6 の詳細は `app/components/LockGate.tsx` 冒頭コメントを参照。

### 10.3 Future Expansion 成立条件

**必須条件（F1〜F5・全充足が成立要件）**

| ID | 条件 |
|---|---|
| F1 | 将来の目的・用途がリポジトリ内に記録されている |
| F2 | 現在 Runtime 未接続であることが明記されている |
| F3 | 実装予定 Phase または再判断時期が明記されている |
| F4 | 現行 Runtime の必須条件になっていない |
| F5 | Validator / 監査工程の FAIL 条件になっていない |

**品質条件（Q1・未充足でも成立を妨げない）**

| ID | 条件 | 未充足時の扱い |
|---|---|---|
| Q1 | 既存データへの配置方針が一貫している | 不均一である旨と理由を記録する。段階的実装では途中段階で配置が不均一になることは正常であり、記録により判別可能性を維持する |

「Runtime で未使用だから Future Expansion」は成立しない。F1〜F5 のいずれかを欠く資産は
Future Expansion として扱わない。

#### 現在の Future Expansion 資産

| 資産 | F1 目的・用途 | F3 再判断条件 |
|---|---|---|
| `scripts/build-static.js`（`npm run build:static` / `EXPORT_STATIC` 経路） | 静的 export による配布（SaaS 以外の配布形態向け） | 次のいずれかの発生時: ① 静的ビルドを配布方式として正式採用する ② 個人利用向け静的ビルドの公開・配布工程を実装する ③ SaaS 以外の配布形態を正式な運用対象にする ④ Next.js またはデプロイ構成の変更により EXPORT_STATIC 経路の再評価が必要になる |

F2・F4・F5 の確認記録および詳細は `scripts/build-static.js` 冒頭 JSDoc を参照。

### 10.4 体系移行完了条件（M1〜M8）

| ID | 条件 |
|---|---|
| M1 | 新体系の正本宣言 |
| M2 | 旧体系への依存解消（新体系が旧体系ファイルを必須参照しない） |
| M3 | 設計意図の移管 |
| M4 | 旧体系の状態変更 |
| M5 | 参照パス更新 |
| M6 | 起動文書更新 |
| M7 | 検証（tsc / test / audit / build） |
| M8 | 移行完了記録 |

新体系を正本と宣言する（M1）だけでは移行完了とみなさない。M1〜M8 の全充足をもって移行完了とする。
