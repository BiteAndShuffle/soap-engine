# SOAP Engine Development Standard v1.0

SOAP Engine プロジェクト全体構造の最上位文書。

**この文書の性格**
本文書は、既存の正本文書を横断・要約する索引であると同時に、プロジェクト運営規則（工程完了条件・設計資産ライフサイクル等）を定義する文書です。「プロジェクト全体を一枚で理解できる入口」として機能します。個別の判断基準・型定義・工程実行手順の正本は、各節が参照する既存文書側にあります。本文書の記述と参照先文書の記述が食い違う場合、個別の判断基準については常に参照先（既存の正本文書）が優先します。

最終更新: 2026-08-13

---

## 0. この文書の位置づけ

本文書は「どの文書に何が書いてあるか」「全体がどうつながっているか」を示すための地図であり、
実行手順・禁止事項・型定義そのものは持ちません。

**新規セッションで何をどの順に読むかは、本文書では定めません。**
読込経路の正本は `prompts/vNext/STARTUP_PROMPT.md` です。

本文書が提供するのは、どの文書が存在し何を扱うかの索引（§7 Documentation Map）と、
プロジェクト運営規則（§8 Domain Completion / §9 Future Domain Expansion /
§10 設計資産ライフサイクル / §12 Product Phase Roadmap）です。

---

## 1. Mission

SOAP エンジンは、日本の調剤薬局・薬剤師向けの **SOAP 形式指導記録自動生成ツール** です。

薬剤師がアプリ上でシナリオと ADDON を選択するだけで、患者ごとの投薬状況（初回・継続・副作用・
アドヒアランス等）に応じた SOAP 指導記録の草稿を生成できることを目指します。複数の薬剤が処方
されている場合でも、SOAP 記録を破綻なく合成できること（semantic merge）も含みます。

**Vision**

現在は糖尿病領域のモジュール群が稼働中ですが、目標は単発領域の実装ではなく、**内服・外用・
点眼・点鼻・吸入・注射・漢方など 50〜300+ モジュールの量産に耐える基盤を作ること**です
（詳細: `prompts/PROJECT_CONTEXT.md` §1）。

**この Vision へ至る段階と、いま何段目にいるかは §12 Product Phase Roadmap が定めます。**

---

## 2. Core Philosophy

このプロジェクトで一貫して守られている思想です。各原則の名称・要約、および原則衝突時の
解決規則の正本は本節です。各原則の詳細な設計根拠・運用上のルールは、正本列が示す既存の
設計原則・ルール文書を参照してください。

| 原則 | 内容（要約） | 正本 |
|---|---|---|
| **bridge を医学的正本とする** | bridge 原稿が内容の正本。canonical JSON はその実装物にすぎない | DP-07（`docs/DESIGN_PRINCIPLES.md`） |
| **非創作（non-creative）** | 補完しない・改善しない・自然化しない・医学的推測をしない | `prompts/RULES.md` §2 PROHIBITED_UNIVERSAL |
| **deterministic（推測生成の禁止）** | わからない値は PENDING とし、推測で埋めない。停止条件を明示する | `prompts/RULES.md` §2〜3 / `prompts/vNext/AUTORUN.md` MUST_STOP 条件 |
| **責務分離（単一責務）** | 各工程・各フィールドは 1 つのことだけを担当する（PN1〜PN8 のフェーズ分離、剤形分離原則等） | `prompts/vNext/HANDOFF.md` §2「単一責務」/ DP-01・DP-02 |
| **最小差分での変更** | 本文（S/O/A/P）は凍結対象であり、意図しない範囲まで書き換えない。addon 等の変更範囲は必要最小限に留める | `prompts/vNext/PN1-Text-Extraction.md`「本文凍結宣言」/ `prompts/RULES.md` §22 |
| **強くてニューゲーム原則** | 会話履歴が失われても同じ判断を再現できるよう、設計判断・例外・保留理由・検証手段をすべてリポジトリへ永続化する | DP-00（`docs/DESIGN_PRINCIPLES.md`） |
| **Human Review を残す理由** | 医療記録としての適切性・日本語の自然さ・ドメイン知識に依存する判断は、機械的に正誤を決められないため人間判断に残す | `docs/VALIDATOR_STANDARD.md` §1・§5・§7 |

**原則衝突時の解決規則**

優先順位：① 品質維持（preservation・medical correctness）→ ② Claude 読込トークン削減 → ③ 人間工数削減 → ④ 工程数削減

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
| `prompts/PROJECT_CONTEXT.md` | 現在のフェーズ・進捗・プロジェクト概要を確認するとき |
| `prompts/RULES.md` | 横断ルール辞書。禁止事項・ERROR/PENDING/CHECK定義・型変換表・matchPolicy変更ルール等 |
| `docs/DESIGN_PRINCIPLES.md` | 「なぜそう設計したか」の根拠（DP-00〜DP-19。DP-06 / DP-14 は欠番） |
| `docs/JSON_STANDARD.md` | canonical JSONの「どう書くか」。**Canonical Requirement Class（JS-A〜JS-E）の正本**。Lifecycle State との直交性は JS-00 |
| `docs/OPEN_DESIGN_QUESTIONS.md` | まだ決めていないこと（保留事項と判断タイミング） |
| `docs/VALIDATOR_STANDARD.md` | Validatorが何を保証し、何を保証しないか。errorCode一覧 |
| `docs/PERSONA_PROJECT_PRINCIPLE.md`（**Core**） | Persona Project の設計思想・三段階の開発順序・判断規則の正本。`module.persona` の位置づけを判断するとき（**毎回読む**） |
| `docs/PERSONA_PROJECT_APPENDIX.md`（**Appendix**） | Core の判断を支える実測値・詳細な反証・再測定手順（**判断の根拠を確認したいときのみ**） |
| `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` | 検索単位・SOAP主語・製品バリエーション分離原則（DP-14候補）。持続型製剤・BF・容量違い等の派生製剤をどう扱うか |
| `docs/IMPLEMENTATION_CHECKLIST.md` | 実装後に毎回行う検証チェックリスト・Runtime/実機横断確認 |
| `docs/TEAM_CHARTER.md` | Human / ChatGPT / Claude の役割分担 |
| `docs/BOOTSTRAP_STANDARD.md` / `docs/P1_STANDARD.md` 〜 `docs/P5_STANDARD.md` | 旧体系（P0-A〜P5）各工程の設計意図（「なぜこの工程はこう設計されているか」） |
| `docs/feature-glossary.md` | Rapid / Express / NLP等、UI機能用語の定義。**Persona という語が指す 3 概念の区別**もここ |
| `prompts/vNext/HANDOFF.md` | vNext体系の新規チャット引き継ぎ文書。設計思想・技術的負債 |
| `prompts/vNext/STARTUP_PROMPT.md` | **読込経路の正本**。全作業共通の Base、工程段階 Overlay、対象概念 Overlay、Overlay の運用規則（コピペ用） |
| `prompts/vNext/AUTORUN.md` | PN3A〜PN8自動連続実行の制御ルール・MUST_STOP条件 |
| `prompts/vNext/PN1-Text-Extraction.md` 〜 `PN8-Build-Runtime-Release.md` | 各工程の実行プロンプト正本 |
| `prompts/P0-A.md` 〜 `prompts/P5.md` | 旧体系の実行プロンプト正本 |
| `CLAUDE.md` / `README.md` | Repository の入口。**STARTUP_PROMPT を指すだけの経路案内**であり、設計・ルール・現在地は持たない |
| **`docs/reviews/`（Historical Evidence / Review Layer）** | **過去の調査・設計判断の根拠・検証記録を確認するとき。**〔下記 7.1〕 |

### 7.1 Historical Evidence / Review Layer（`docs/reviews/`）

**この層は正本ではない。** Current State / Norm / Requirement を決定する authority は、上表の
living SSOT（`docs/` 直下の各標準文書・`prompts/` 配下の各正本）にのみ存在する。

| この層が保持するもの | この層が保持しないもの |
|---|---|
| **historical evidence** — ある時点で何を観測したかの事実固定（実測値・commit・再現手順） | 現在の仕様・現在の値・現在地 |
| **decision rationale** — 確定済み Owner Decision に至った検討経緯と不採用案の理由 | 新しい設計判断（各記録が §0 で自ら禁止している） |
| **verification record** — 実機検証・監査の実施記録 | 正本の代替。記録の失効は正本の有効性に影響しない |

**読み方の規律**

- 記録の内容と現在の実装が食い違う場合、**常に living SSOT と実装が優先する**。記録側は
  「その時点ではそうだった」という事実として読む（記録を根拠に現在の仕様を主張しない）
- 各記録は冒頭 §0 に自身の性格（対象 commit・正本ではない旨・失効条件）を宣言している。
  **まず §0 を読むこと**
- **historical review の本文を後から書き換えない。** 誤りが判明した場合は、当該記録へ
  訂正追記節を設けるか、living SSOT 側を更新して pointer を張る
- この層の記録は原則として `npm run audit` / `npm test` の対象ではない（実装ではないため）

**主な記録の所在**

| ディレクトリ / 記録 | 内容 |
|---|---|
| `docs/reviews/CTO_DUE_DILIGENCE_PHASE1_2026-07-25.md` | 2026-07-25 時点の全体技術監査。所見 H/M/L 群・未回答事項 E-1〜E-7 の初出（**E 群の現在の状態は `docs/OPEN_DESIGN_QUESTIONS.md` Q-E が正本**） |
| `docs/reviews/f1/` | F-1（module 配信・ロード構造）の設計・実装・検証。**配布形態別アーキテクチャと SaaS 設計の検討経緯**を含む |
| `docs/reviews/BRAND_RESOLUTION_*` | Q-S2（brand resolution safety）の調査記録と設計根拠 |
| `docs/reviews/persona/` | Persona 文書整合の実行記録 |
| `docs/reviews/P1_S2B_*` / `P1_S2_CHECK1_*` / `P1_W2_*` | Lifecycle・工程整備の設計と実行記録 |
| `docs/reviews/STARTUP_PATH_ALIGNMENT_*` / `INFORMATION_ARCHITECTURE_*` | 読込経路・情報アーキテクチャの Owner Decision（OD-R 群 / Decision 1〜3）の実行記録 |
| `docs/reviews/PHASE2_STAGE1_*` | Phase 2 Stage 1 の実機検証記録と CTO レビュー |

一覧・件数は保持しない（`ls docs/reviews/` を正本とする）。

---

## 8. Domain Completion Definition

**本節は Domain Complete の成立条件（Norm）の正本である。** 個別領域が Domain Complete である
という**判定結果・その時点の証拠・Owner 承認は本節が持たない**。これらは実行記録が記録する。

**Domain Complete** とは、ある薬効・診療領域（例: 糖尿病、点眼）について、以下をすべて
満たした状態を指します。

**前提: 対象領域の範囲**

対象領域に属するモジュール集合は、canonical JSON の `categoryPath[0]`（適応領域）から導出します。
`categoryPath[0]` を適応領域として扱うことは `docs/DESIGN_PRINCIPLES.md` DP-11 および
`lib/types.ts`（`crossModuleIndicationLabel` の定義）に従います。**判定時点のモジュール集合と、
Owner による例外的な追加・除外は実行記録へ記録します。**

```
対象領域の全モジュールについて（モジュール単位の条件）:
  PN7: FAIL 0件（CHECKが残る場合はユーザー承認取得済み）
    ↓
  PN8: RELEASE_OK（tsc PASS / build PASS / registry登録済み）
    ↓
領域単位の条件:
  Runtime / 実機横断確認: 全必須チェック実施済み
    （検索・シナリオ・SOAP生成・横断機能 — 詳細は `docs/IMPLEMENTATION_CHECKLIST.md`）
    ↓
  Owner による完了宣言
    ↓
  Domain Complete
```

PN7 / PN8 は単一モジュールを対象とする工程であるため、モジュール単位の条件に属します。
Runtime / 実機横断確認は領域を通じた挙動を対象とするため、領域単位の条件に属します。

Domain Complete は「個々のモジュールがbuildを通る」ことではなく、「その領域を通じて実機で
確認された挙動が期待どおりである」ことまでを含みます。**モジュール単位の条件の充足は必要条件
であり、十分条件ではありません。**

**Owner による完了宣言を条件に含める理由**: 領域単位の条件は再実行によって過去の実施を復元
できず、記録と承認以外に証拠を持ちえません。宣言を条件に含めることで、「条件を満たしたと誰が
判断したか」が Repository から追跡可能になります。

**bridge STATUS の扱い**: bridge の STATUS（`prompts/RULES.md` §24）は個別 bridge の工程到達
状態を表すものであり、Domain Complete の先行証拠としては用いません。

> **糖尿病領域について（事実の記録）**
>
> 糖尿病領域は過去に Domain Complete と判定されており、**本節の改定はこの判定を取り消しません。**
> 一方、当時の PN7・Runtime / 実機横断確認・Owner 承認の**実施記録は Repository 内に存在しません。**
>
> **この記載は、糖尿病領域が未完了であること・過去の完了判定を撤回すること・現在 PENDING で
> あることのいずれも意味しません。** 証拠記録の要件が成立する以前に行われた作業について、
> 記録の不在を事実として公告するものです。

次の点眼領域からは、本節の条件と記録方法に従って完了を判定します。

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
| Future Expansion | 実装予定・設計意図あり。意図的に未接続 | 枠の維持のみ | 設計確定時に更新可 | 参照可 | FAIL 条件にしてはならない（適用範囲は下記注記） | Runtime 接続→Current Standard / 破棄決定→Archived |
| Legacy | 新規作業では使用しない。監査・履歴確認では参照可 | 使用しない | 原則凍結（誤記修正のみ可） | 参照可 | 対象外 | 参照必要性の消滅→Archived |
| Archived | 履歴保存のみ。正本でも参照標準でもない | 使用しない | 更新しない | 履歴目的のみ | 対象外 | 終端 |

状態は必ずファイル内またはスキーマ定義に明示する。状態が未表示の資産は、次のセッションから
Current Standard と区別できない。

**ファイル内の状態表示と正規台帳の関係**

ファイル内の状態表示は必須だが、**それ単独では Lifecycle State を確定しない。**
**正式な Lifecycle State は、§10.2 / §10.3 の正規台帳へ登録されることによって確定する。**

- 個別ファイルが自己表示している状態と、正規台帳の登録状況が食い違う場合、**正規台帳が優先する**
- 正規台帳へ未登録の資産は、自己表示にかかわらず当該 Lifecycle State として確定していない。
  分類または成立条件の確認が未完了である場合は §10.5 で公告する
- 自己表示は、確定した状態を各ファイルから判別可能にするための表示であり、状態を決定する手段ではない

**「Validator・必須ゲートの対象か」列の適用範囲（明確化）**

本列は、**設計資産が Lifecycle 上どの段階にあるかを理由として Validator / 監査工程を FAIL させて
よいか**を定める。**canonical field が必須かどうかを定める列ではない。**

- Future Expansion 行の「FAIL 条件にしてはならない」は、**runtime へ未接続であること自体を
  FAIL の根拠にしてはならない**という意味である
- **canonical field の必須性は Canonical Requirement（`docs/JSON_STANDARD.md` JS-A〜JS-E）が
  決定する。** JS-A（全 module 必須）の field が欠落している場合、それは Canonical Requirement の
  未充足であり、**本列を根拠に FAIL 対象から除外してはならない**
- Lifecycle State と Canonical Requirement は**直交する別軸**であり、一方が他方を決定しない
  （`docs/JSON_STANDARD.md` JS-00）

本注記は誤読防止のための適用範囲の明確化であり、本表の運営規則そのものを変更するものではない。
Canonical Requirement Class を本節へ再定義しない（正本は `docs/JSON_STANDARD.md`）。

### 10.2 Legacy 完了条件（L1〜L7・全充足が要件）

**変更契機**

| 区分 | 内容 |
|---|---|
| 起点 | ① L1〜L7 の条件そのものを追加・削除・変更した<br>② Lifecycle State を判断する作業で L1〜L7 の充足を確認したとき（＝ Legacy に該当すると判断したとき）<br>③【追随起点】「現在の Legacy 資産」表の既存エントリ（L1〜L7 列）を変更したとき<br>④ 登録済み Legacy 資産が Archived へ遷移したとき |
| 更新対象 | ①の場合 — 台帳の既存エントリ全件が新条件を満たすか再確認し、満たさないエントリがあれば同一作業内で追随する<br>②の場合 — 「現在の Legacy 資産」表へ当該資産を追加登録する<br>③の場合 — 当該資産のファイル内状態表示、および変更した L1〜L7 の根拠となる実装・移管先・Documentation Map・Owner承認記録が、変更後の台帳内容と整合していることを確認する（変更した列に対応する根拠のみを確認すればよい）<br>④の場合 — 本表から当該行を除去し、当該資産のファイル内状態表示を Archived へ更新する（Archived 用の正規台帳は存在しないため、台帳登録ではなくファイル内表示の更新） |
| 対象外 | 個別資産を Legacy 化すべきか否かという Owner 判断そのもの（L7 の実体）は対象外 |

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

**本表は Legacy 状態に属する資産の正規台帳である。** Legacy と確定した資産は漏れなく本表へ登録する。
**本表に存在しない資産は Legacy ではない。** Lifecycle State が未確定、または L1〜L7 の確認が
未完了の資産は本表へ登録せず、§10.5 Lifecycle Classification Pending で公告する。

登録単位は**機能 / 経路 / 実装資産**であり、canonical field 単体は本表の登録対象ではない
（canonical field の必須性は `docs/JSON_STANDARD.md` JS-A〜JS-E が決定する → §10.1 の注記）。

| 資産 | L1 必須参照 | L2 設計意図の移管先 | L7 承認 |
|---|---|---|---|
| `app/components/LockGate.tsx` | ゼロ（`app/` / `lib/` から import 元 0 件） | `middleware.ts`（HTTPリクエストレベルの Basic 認証ゲート。commit 1517800 で本ファイルの `app/layout.tsx` からの接続除去と同時に導入） | Owner 承認済み |

L3〜L6 の詳細は `app/components/LockGate.tsx` 冒頭コメントを参照。

### 10.3 Future Expansion 成立条件

**変更契機**

| 区分 | 内容 |
|---|---|
| 起点 | ① F1〜F5 または Q1 の条件そのものを追加・削除・変更した<br>② Lifecycle State を判断する作業で F1〜F5 の充足を確認したとき（＝ Future Expansion に該当すると判断したとき）（Q1 は品質条件であり成立要件ではないため起点判定には含めない）<br>③【追随起点】「現在の Future Expansion 資産」表の既存エントリ（F1 列・F3 列）を変更したとき<br>④ 登録済み Future Expansion 資産が Runtime 接続により Current Standard へ昇格、または破棄決定により Archived へ遷移したとき |
| 更新対象 | ①の場合 — 台帳の既存エントリ全件が新条件を満たすか再確認する<br>②の場合 — 「現在の Future Expansion 資産」表へ当該資産を追加登録する<br>③の場合 — 当該資産のファイル内状態表示、および F1・F3 根拠記述（当該資産の JSDoc 等）が台帳の登録内容と整合しているかを確認する<br>④の場合 — 本表から当該行を除去し、当該資産のファイル内状態表示を昇格後／Archived 後の状態へ更新する |
| 対象外 | F5 注記が指す Canonical Requirement（JS-A〜JS-E）の内容自体は `docs/JSON_STANDARD.md` が正本であり対象外。§10.5 経由で Future Expansion へ確定する場合の Owner 承認要否は §10.5 自身の遷移規則が扱うため、本節の起点には含めない |

**必須条件（F1〜F5・全充足が成立要件）**

| ID | 条件 |
|---|---|
| F1 | 将来の目的・用途がリポジトリ内に記録されている |
| F2 | 現在 Runtime 未接続であることが明記されている |
| F3 | 実装予定 Phase または再判断時期が明記されている |
| F4 | 現行 Runtime の必須条件になっていない |
| F5 | Validator / 監査工程の FAIL 条件になっていない（適用範囲は下記注記） |

**F5 の適用範囲（明確化）**

F5 は、**当該資産が Future Expansion であること（＝ runtime へ未接続であること）自体を理由として
Validator / 監査工程を FAIL させていないこと**を求める条件である。**canonical field の必須性を
免除する条件ではない。**

- **canonical field の必須性は Canonical Requirement（`docs/JSON_STANDARD.md` JS-A〜JS-E）が
  決定する。** JS-A（全 module 必須）の field が欠落している場合、それは Canonical Requirement の
  未充足であり、**F5 を根拠に FAIL 対象から除外してはならない**
- Lifecycle State と Canonical Requirement は**直交する別軸**である（§10.1 の注記 /
  `docs/JSON_STANDARD.md` JS-00）
- 本節の登録単位は**機能 / 経路 / 実装資産**であり、**canonical field 単体は登録対象ではない**。
  ある canonical field の runtime 接続が将来機能である場合、登録するのは **その接続経路の側**である

本注記は誤読防止のための適用範囲の明確化であり、F5 の意味を変更するものではない。

**品質条件（Q1・未充足でも成立を妨げない）**

| ID | 条件 | 未充足時の扱い |
|---|---|---|
| Q1 | 既存データへの配置方針が一貫している | 不均一である旨と理由を記録する。段階的実装では途中段階で配置が不均一になることは正常であり、記録により判別可能性を維持する |

「Runtime で未使用だから Future Expansion」は成立しない。F1〜F5 のいずれかを欠く資産は
Future Expansion として扱わない。

#### 現在の Future Expansion 資産

**本表は Future Expansion 状態に属する資産の正規台帳である。** Future Expansion と確定した資産は
漏れなく本表へ登録する。**本表に存在しない資産は Future Expansion ではない。**
Lifecycle State が未確定、または F1〜F5 の確認が未完了の資産は本表へ登録せず、
§10.5 Lifecycle Classification Pending で公告する。

| 資産 | F1 目的・用途 | F3 再判断条件 |
|---|---|---|
| `scripts/build-static.js`（`npm run build:static` / `EXPORT_STATIC` 経路） | 静的 export による配布（SaaS 以外の配布形態向け） | 次のいずれかの発生時: ① 静的ビルドを配布方式として正式採用する ② 個人利用向け静的ビルドの公開・配布工程を実装する ③ SaaS 以外の配布形態を正式な運用対象にする ④ Next.js またはデプロイ構成の変更により EXPORT_STATIC 経路の再評価が必要になる |
| **`Persona runtime connection`** — 人格別固定文章を runtime で取得・切替・表示する経路。**canonical field `module.persona` そのものではない**（canonical field は登録対象外。上記 F5 注記参照） | Persona Project の最終到達形において、レビュー済みの人格別固定文章をアプリが表示するための runtime 経路。第3段階で設計・実装する（正本: `docs/PERSONA_PROJECT_PRINCIPLE.md`） | Persona Project 第3段階の着手条件が充足した時点（同 §7.1）。第2段階（Static 版の店舗実運用検証）の完了が前提 |

F2・F4・F5 の確認記録および詳細は、`scripts/build-static.js` については同ファイル冒頭 JSDoc、
`Persona runtime connection` については `docs/PERSONA_PROJECT_PRINCIPLE.md` を参照。

> **`Persona runtime connection` の F5 について**: canonical field `module.persona` の欠落を検出する
> `MISSING_PERSONA`（`lib/moduleValidator.ts`）は、**Canonical Requirement（JS-A）を検査するもので
> あり、本経路（runtime 接続）を FAIL 条件にしているのではない。** 両者は直交する別軸である
> （上記 F5 注記 / §10.1 の注記 / `docs/JSON_STANDARD.md` JS-00）。

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

### 10.5 Lifecycle Classification Pending（Lifecycle 分類保留台帳）

**変更契機**

| 区分 | 内容 |
|---|---|
| 起点 | ① 本節の位置づけの定義または遷移条件を変更した<br>② Lifecycle State の分類作業で「位置づけ」節の条件（未確定、または成立条件確認が未完了）に該当したとき<br>③【追随起点】「現在の Classification Pending 資産」表の既存エントリ（保留理由・解消条件）を変更したとき<br>④ 登録済み資産が Owner 承認により Legacy／Future Expansion／Archived のいずれかへ確定したとき（本遷移固有の Owner 承認要件は本節自身の「遷移」が定める規律であり、§10.3 自体の一般的な成立条件を変更するものではない） |
| 更新対象 | ①の場合 — 既存登録エントリが新しい定義・遷移条件と矛盾しないか再確認する<br>②の場合 — 「現在の Classification Pending 資産」表へ新規 ID を追加登録する（既存 ID：GG-1／GG-3 との重複がないことを確認）<br>③の場合 — 当該資産のファイル内状態表示、および保留理由・解消条件の根拠となる正本文書・実装状況が、変更後の台帳内容と整合していることを確認する<br>④の場合 — 本表から当該行を除去し、遷移先に応じて次を実施する：Legacy／Future Expansion へ確定 → §10.2／§10.3 の正規台帳へ新規登録する／Archived へ確定 → 正規台帳が存在しないため、当該資産のファイル内状態表示を Archived へ更新する |
| 対象外 | GG-1／GG-3 個別の確定判断そのものは Owner 判断であり対象外 |

**本節は Lifecycle State ではない。** 分類、または正式登録に必要な成立条件の確認が未完了であることを
管理する **governance 上の状態**である。

| 本節が何でないか |
|---|
| **第 6 の Lifecycle State ではない**（Lifecycle State は §10.1 の 5 状態のみである） |
| **Future Expansion の下位分類ではない** |
| **Legacy の下位分類ではない** |

#### 位置づけ

§10.2 / §10.3 は、**それぞれの Lifecycle State に属する**資産の**正規台帳**である
（正規台帳化の対象は Legacy と Future Expansion の 2 状態である。他の状態の台帳化については
本節では定めない）。一方、次のいずれかに該当する資産は、どの正規台帳へも登録できない。

- Lifecycle State が**未確定**である（どの状態に属するかが決まっていない）
- 状態の候補はあるが、**正式登録に必要な成立条件の確認が未完了**である
  （Legacy なら L1〜L7、Future Expansion なら F1〜F5）

これらを未登録のまま放置すると、正規台帳の網羅性が損なわれ、かつ当該資産は
「状態が未表示であるため次のセッションから Current Standard と区別できない」状態（§10.1）に陥る。
**本節はこの中間状態を明示的に公告するための台帳である**
（`docs/DESIGN_PRINCIPLES.md` DP-15 明示的不確定性の原則）。

> **本節への登録は Lifecycle State を決定しない。** 記録するのは「未確定である」という事実のみである。

**canonical field の掲載について**

> **canonical field を本表へ掲載することは、当該 field を Lifecycle 資産として登録することを
> 意味しない。**

本節は Lifecycle 台帳ではなく、分類・成立条件確認が未完了であることを管理する governance 上の
保留領域である。Lifecycle 台帳（§10.2 / §10.3）の登録単位は**機能 / 経路 / 実装資産**であり、
**canonical field 単体は登録対象ではない**。この原則は、canonical field を本節へ掲載することに
よって変更されない。

掲載の目的は、**当該 field をめぐる位置づけが未確定であるという事実の公告に限られる。**
canonical field の必須性は Canonical Requirement（`docs/JSON_STANDARD.md` JS-A〜JS-E）が決定し、
本節はこれに関与しない。

#### 現在の Classification Pending 資産

| ID | 対象 | 保留理由 | 解消条件 |
|---|---|---|---|
| **GG-1** | NLP 経路（`lib/scenarioSelector.ts` / `lib/createSoapFromInput.ts` / `lib/soapComposer.ts` / `app/components/NlpInputPanel.tsx` — UI 未接続） | `docs/feature-glossary.md` の NLP生成 節が Future Expansion を自称しているが、F1〜F5 の確認・整理が未完了であり §10.3 へ登録できない | F1〜F5 の充足を確認して §10.3 へ登録する、または別状態を確定する |
| **GG-3** | `composition.sMergePolicy`（`prompts/vNext/PN7-Cross-Reference-Audit.md` item S） | 同 item S が「Owner Decision Required であり Future Expansion / Legacy いずれとも確定していない」として FAIL 対象外に置いている。位置づけが未確定であり、いずれの正規台帳へも登録できない | Owner が位置づけを決定する（canonical field としての扱いを含む） |

**本表への登録をもって、GG-1 / GG-3 の Lifecycle State を確定したものとして扱ってはならない。**

#### 遷移

```
Classification Pending → §10.2 Legacy / §10.3 Future Expansion / Archived
```

遷移には、各状態の成立条件（Legacy: L1〜L7 ／ Future Expansion: F1〜F5）の充足に加え、
状態遷移に対する **Owner 承認**を要する（§10.2 L7 と同じ規律）。**本台帳に登録したまま放置しない。**

---

## 11. 変更契機（Change Trigger）

**変更契機とは、「ある事象が起きたとき、この文書のこの箇所が古くなる」という条件と、
そのとき同時に更新すべき対象の記述である。**

本節は変更契機が満たすべき条件と、配置の規則を定める。**固定された書式・記入手順・特定文書用の
レイアウトは定めない。** 見出しレベル・表の有無・レイアウト・Markdown 記法は各文書が自由に選んでよい。

### 11.1 目的

| # | 目的 |
|---|---|
| 1 | 索引・台帳・実測値が実態から乖離することを防ぐ |
| 2 | 乖離した記述を読んだ担当者が、誤った現況認識で判断することを防ぐ |
| 3 | 「どこまで直せば作業が完了か」を、担当者の記憶ではなく文書で決める |

### 11.2 責務境界

| 変更契機が持つもの | 持たないもの |
|---|---|
| その節が古くなる**起点事象** | 規則の内容（→ 各文書の本文） |
| **同時更新対象** | 設計の根拠（→ `docs/DESIGN_PRINCIPLES.md`） |
| 任意要素（§11.4） | 工程の実行手順（→ `prompts/vNext/` 各 PN ファイル） |
| — | **読込経路**（→ `prompts/vNext/STARTUP_PROMPT.md`） |

**変更契機は Overlay のトリガーではない。** 変更契機は成果物を仕上げるための保守規律であり、
何を読むかを決める読込条件とは別系統である。両者を交差させない。

**配置規則**

| # | 規則 |
|---|---|
| 1 | **変更契機は変更元にのみ記載する。** 追随側の文書へ同じ内容を重複記載しない |
| 2 | **対象文書の冒頭付近に「変更契機」節を置く。** 本文の末尾や各章へ分散させない |

**本規則は変更契機という仕組みの配置に関する条件であり、記法・テンプレートではない。**
見出しレベル・表の有無・レイアウト・Markdown 記法は各文書が自由に選んでよい。

### 11.3 適用単位

**節単位を原則とする。** 同期関係が特定の規則 ID に閉じている場合のみ、規則 ID 単位を認める
（`prompts/RULES.md` §26 が実例）。

**文書単位の責務**（この文書は何の正本か）と、**節単位の追随関係**（この節は何が起きたら
古くなるか）を混同しない。前者は文書の位置づけであり、変更契機ではない。

### 11.4 変更契機が持つ要素

| 区分 | 要素 | 内容 |
|---|---|---|
| **必須** | **起点** | 何が起きたら、その文書または節が古くなるか。**観察可能な事象として記述する**（「重要な変更をしたとき」のように担当者の主観で判定させない） |
| **必須** | **更新対象** | 起点に該当したとき、同一作業内で更新する対象。**条件付きの対象は、独立分類を作らず対象の行内へ条件を記述する** |
| 任意 | 対象外 | 紛らわしいが追随不要なもの。理由を併記する |
| 任意 | 検証 | 更新できたことをどう確かめるか |
| 任意 | 停止条件 | 自己判断せず Owner へ回す境界 |
| 任意 | 採用理由 | その規則が生まれた事故・drift の実例 |

**「確認のみ」という区分は用いない。** 影響が及びうるが条件を書けないものは、条件を明示して
更新対象に含めるか、理由を付して対象外とする。条件を書かずに注意だけを促す記述は、
判定できない負荷を毎回発生させる。

**任意要素は、必要な文書だけが持つ。** 空欄や形式的な記述で埋めない。

### 11.5 複数該当時・途中判明時の原則

**複数の起点に該当した場合**

- 該当したすべての起点について、更新対象をすべて満たす
- 対象が重複する場合、更新は 1 回でよい
- 更新順序は規定しない（同時更新対象の間に依存を作らない設計とする）
- ある起点で更新対象、別の起点で対象外とされている場合は、**更新側を優先する**

**作業の途中で起点に該当したと判明した場合**

- 判明した時点で更新対象を確認する
- 既に完了扱いにした部分がある場合、更新対象の観点で再確認する
- 再確認により追加変更が生じた場合、変更した旨と理由を成果物へ明記する

### 11.6 変更契機節が存在しない文書の扱い

**変更契機節が存在しないことを理由に「追随不要」と判定してはならない。**

節が存在しない場合に言えるのは、**「その文書には宣言済みの変更契機が存在しない」という事実のみ**
である。その文書が次のどちらであるかは、この事実からは判定できない。

| 状態 | 意味 |
|---|---|
| **適用対象外** | 変更契機を持つ必要がないと判定された文書 |
| **未適用** | 適用対象だが、まだ変更契機節が書かれていない文書 |

両者の区別は、**変更契機の適用対象判定に従う**。適用対象の判定基準そのものは本節では定めない。

**判定できない場合は、追随不要と結論せず、停止して確認する。**

なお、変更契機節が存在し、かつどの起点にも該当しない場合は追随不要である。その場合は
「該当しないと判断した」旨を完了報告に 1 行記す。

### 11.7 本節の変更契機

**起点**: 次のいずれかを行ったとき、本節は古くなる。

- 変更契機の必須要素または任意要素を追加・削除・変更した
- 適用単位（節単位／規則 ID 単位）の原則を変更した
- 複数該当時・途中判明時の原則を変更した
- 変更契機節が存在しない文書の扱いを変更した

**更新対象**

- 本節（§11）の該当小節
- **必須要素**を追加・削除・変更した場合 — 変更契機節を持つ**全文書**を確認し、新しい必須要素を
  満たしていなければ同一作業内で補う
- **任意要素**を追加・削除・意味変更した場合 — **その任意要素を実際に採用している文書だけ**を
  確認する。**任意要素を追加しただけで、未採用文書へ空欄や形式的記述を追加してはならない**

**対象外**

- 各文書の変更契機節に書かれた「起点」「更新対象」の中身（本節は要素の条件を定めるだけであり、
  各文書が何を起点とするかには関与しない）
- `prompts/vNext/STARTUP_PROMPT.md` の Base / Overlay（読込経路であり、変更契機の標準とは別系統）

**停止条件**

- 変更契機を Validator の ERROR 条件にする必要が生じた
  → `docs/VALIDATOR_STANDARD.md` §2 / §5 の責務境界に抵触するため Owner 判断とする
- 固定された書式テンプレートが必要と判明した → 独立文書化の是非は Owner 判断とする

**採用理由**

〔実測〕本節の制定前、Repository で明示的な同時更新規則は `prompts/RULES.md` §26 と
`docs/DESIGN_PRINCIPLES.md` DP-11 の 2 箇所のみであり、内容は同一で二重管理されていた。
一方、索引・台帳・実測値の drift は複数箇所で観測されており、drift の発生箇所と変更契機が
未定義の箇所が一致していた。

---

## 12. Product Phase Roadmap

**本節は「プロダクトがどの段階を通って Vision（§1）へ至るか」と「いま何段目にいるか」の正本である。**

現在地（Current Focus）の記述は `prompts/PROJECT_CONTEXT.md` が持つ。本節は Phase の**定義・完了条件・
遷移 Trigger（Norm）**のみを持ち、現在地・進捗率・残課題の一覧は保持しない。

### 変更契機

| 区分 | 内容 |
|---|---|
| 起点 | ① Phase の追加・削除・統合・名称変更を行った<br>② いずれかの Phase の目的・完了条件・遷移 Trigger を変更した<br>③ Phase 遷移が実際に発生した（Owner が次 Phase への移行を宣言した）<br>④ 本節が pointer として指す正本のパス・節番号を変更・移動した |
| 更新対象 | ①②の場合 — 当該 Phase 行、および §12.3 の責務分離表との整合<br>③の場合 — **本節は現在地を持たないため更新しない。** `prompts/PROJECT_CONTEXT.md` の Current Focus を更新する<br>④の場合 — pointer 先 |
| 対象外 | 個別 Finding・Deferred 項目の内容（正本は §12.4 の pointer 先）。**本節へ backlog を複製しない** |
| 検証 | 本節に件数・進捗・個別 Finding の一覧が存在しないこと。pointer 先がすべて実在すること |

### 12.1 Phase 定義

| Phase | 名称 | 目的 |
|---|---|---|
| **Phase 0** | Foundation / Architecture Baseline | bridge→JSON→runtime の 3 層 SSOT、検証体系、文書アーキテクチャを成立させる |
| **Phase 1** | **Static / Local First** | **開発者本人が実務で使用できる静的版を成立させる** |
| **Phase 2** | Module Expansion / Real-world Operation | canonical module を増やし、実際の薬局業務で継続使用する |
| **Phase 3** | Productization | 第三者へ提供できる製品として整える |
| **Phase 4** | SaaS | 外部ユーザー・複数店舗・ネットワーク利用を前提とする |
| **Phase 5** | Scale | module 数・ユーザー数・店舗数等が大きく増えた状態 |

### 12.2 完了条件と遷移 Trigger

| Phase | 主な完了条件 | 次 Phase へ進む Trigger |
|---|---|---|
| **0** | 3 層 SSOT が成立し、`npx tsc --noEmit` / `npm test` / `npm run audit` / `npm run build` が再現可能な検証体系として機能する。読込経路の正本と Documentation Map が存在し、Repository 単独で現在地を復元できる | 上記が成立し、Repository のみを入力とする新規セッションが現在地・次工程・Deferred を復元できることを確認した時点 |
| **1** | 静的版が実際にビルドでき、開発者本人の実務環境で SOAP 生成・検索・多剤合成が動作する。配布・起動手順が Repository から再現できる | **Owner が「静的版で実務を開始できる」と判断した時点。** あわせて `EXPORT_STATIC` 経路の Lifecycle を §10.3 F3 条件に照らして再判定する |
| **2** | 対象領域が Domain Complete（§8）に到達し、実務で継続使用されている。module 追加が検証体系の中で完結する | Owner が第三者提供を意思決定した時点 |
| **3** | 認証境界が実効化され、コンテンツの責任体制（執筆・監修・改訂）が定義されている。Owner 以外が保守・利用できる状態 | Owner が外部ユーザー提供（SaaS）を意思決定した時点 |
| **4** | 複数ユーザー・複数店舗での利用が成立し、entitlement / 課金 / 配信境界が動作する | 利用規模が単一構成で扱えなくなった時点 |
| **5** | — | — |

**Phase の遷移は自動ではない。** 前 Phase の完了条件を満たしたことを Owner が確認して初めて次へ進む。
**Phase は排他ではない。** 後続 Phase の設計検討を先行させてよいが、実装の優先順位は現在 Phase が持つ。

### 12.3 Persona Project の段階定義との責務分離

`docs/PERSONA_PROJECT_PRINCIPLE.md` §3 は Persona Project 固有の三段階（第1段階〜第3段階）を定める。
**これは Product Phase Roadmap とは別軸であり、混同してはならない。**

| 軸 | 正本 | 扱う対象 |
|---|---|---|
| **Product Phase**（Phase 0〜5） | **本節** | プロダクト全体がどの事業・運用段階にあるか |
| **Persona Project 段階**（第1〜第3段階） | `docs/PERSONA_PROJECT_PRINCIPLE.md` §3 | Persona Project という 1 機能プロジェクトの内部工程 |

**Persona Project の段階順序を、プロダクト全体の唯一の作業順序として扱ってはならない。**
同 §3.1 の「第1段階（base 指導文の一周完成）→ 第2段階（Static 版の店舗実運用検証）」という直列順序は
Persona Project 内部の依存関係であり、Product Phase の順序を定めるものではない。
Persona Project 各段階の着手条件は同 §7.1 が正本である。

### 12.4 Phase をまたぐ課題の所在（pointer のみ）

**本節は課題を列挙しない。** 各 Phase で扱う課題の正本は次のとおり。

| 種別 | 正本 |
|---|---|
| 設計保留事項（Q-xx）・Phase 1 監査由来の未回答事項（Q-E） | `docs/OPEN_DESIGN_QUESTIONS.md` |
| 技術的負債・Finding・その再開 Trigger | `prompts/vNext/HANDOFF.md` §6 |
| Lifecycle 未確定資産 | 本文書 §10.5 |
| Future Expansion 資産とその再判断条件 | 本文書 §10.3 |
| 領域完了（Domain Complete）の成立条件 | 本文書 §8 |
| 配布形態別アーキテクチャ・SaaS 設計の検討経緯 | `docs/reviews/f1/`（**historical evidence**。§7 参照） |
