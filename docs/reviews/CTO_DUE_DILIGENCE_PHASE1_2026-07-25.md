# CTO技術デューデリジェンス Phase 1 監査記録

> **文書の性格**: 2026-07-25 実施の Phase 1 現状調査の監査記録（§1 のコミット時点の観測記録・
> 事実固定）。本文書は新しいルール・仕様を定義しない。目的は (1) 調査のやり直し防止、
> (2) 固定課題を次の実装担当（Sonnet 等の別 AI セッションを含む）が最小限の再確認だけで
> 着手できる状態にすること。
> 本文書の記載と現在の実装が食い違う場合は、まず §1 の対象コミットとの差分を確認すること
> （本文書の記述が古くなっているだけか、実装側が意図せず変わったのかを区別するため）。
> 意図された仕様そのものについては、各領域で Single Source of Truth として指定された正本
> （`docs/DEVELOPMENT_STANDARD.md` §6「Single Source of Truth」・`prompts/PROJECT_CONTEXT.md` §2
> 「開発思想」参照）を優先すること。本文書はその正本を代替しない。
>
> **表記規約**: 各記述は FACT（実装・実行・資料で確認した事実）/ INFERENCE（事実からの推論）/
> UNKNOWN（情報不足で判断不能）/ RECOMMENDATION（提案）/ RISK（確認された・合理的に想定されるリスク）を明示する。
> 行番号はすべて §1 のコミット時点の値であり、将来ずれる。**行番号だけを根拠に位置を特定せず、
> 併記した検索語（コード断片）で grep すること。**

---

### Phase 1 の位置付け

本監査記録は、2026-07-25時点の Phase 1（CTOレビュー）における観測結果および判断を記録したものである。

Phase 1の目的は、問題の発見・原因分析・優先順位付け・修正方針の固定であり、実装修正は対象外とする。

H-1については、本監査記録を基に別実装セッションで修正および検証を実施した。

そのため、本書は Phase 1 の監査記録として保持し、実装修正内容および検証結果については、本追記および対応する Git 履歴を参照すること。

---

## 1. 調査メタデータ

| 項目 | 値 |
|---|---|
| 調査日 | 2026-07-25 |
| 調査者 | Claude（CTO候補視点の技術デューデリジェンス、Phase 1） |
| 対象ブランチ | `feat/nlp-input-panel-and-new-schema` |
| 対象コミット | `1aafde6` — "fix(search): replace originalIndex tie-break with resolved display-name order" |
| main との差分 | FACT: `git log --oneline main..HEAD` = **521 コミット先行**（origin/main も同数） |
| リモート | `https://github.com/BiteAndShuffle/soap-engine.git` |
| 調査中の変更 | なし（コード・設定・データ・依存関係とも無変更。ビルド/テスト実行による生成物のみ） |

### 調査時点のワークツリー状態（FACT: `git status`）

```
 M .claude/settings.local.json          （Claude Code 自動更新。コミット対象外と HANDOFF に明記済み）
 M docs/DESIGN_PRINCIPLES.md            （DP-12「薬局実務に基づく評価基準原則」追加の作業中差分）
 M docs/IMPLEMENTATION_CHECKLIST.md     （多剤合成チェック項目に DP-12 参照を追記する作業中差分）
?? .claude/launch.json                  （dev サーバー起動定義。調査以前から存在）
?? bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak （既知の .bak 残置。HANDOFF に「不要なら手動削除可」と記載）
```

---

## 2. 実行した検証と結果（FACT）

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査 | `npx tsc --noEmit` | PASS（exit 0） |
| 単体テスト | `npm test` | **2620 件 pass / 0 fail**（suites 119） |
| 多剤合成回帰 | `npm run test:multi-drug` | **20 PASS / 0 FAIL** |
| 横断監査 | `npm run audit` | ADDON chain / Alias 同期とも **35 モジュール全 PASS** |
| 本番ビルド | `npm run build` | PASS（ModuleValidator / CrossModuleValidator 含む） |
| 実機確認 | `npm run dev`（localhost:3000、ブラウザ操作） | 下記フロー確認済み |

実機確認したユーザーフロー: 薬剤検索（ひらがな→正規化・サジェスト・剤形分離候補）／シナリオ選択／SOAP生成／
ADDON トグル／多剤合成（リベルサス＋ヒルドイドソフト軟膏の 2 剤統合、P closing dedupe）／
ペルソナ ON/OFF（簡潔の DENSITY 変換動作）／Rapid（S 先頭文トグルで S のみ変化・A/P 保持）。
BUILD バッジ表示 = `1aafde6`（配信コードと HEAD の一致を確認）。

注記（FACT）: 過去メモにあった「tests/soapMerge.test.ts の既知 1 件失敗」は現コミットでは存在しない（0 fail）。

---

## 3. 現状理解

### 3.1 プロダクトの現在の姿（FACT）

- 日本の調剤薬局向け SOAP 指導記録**草稿生成ツール**。Next.js 15 App Router + TypeScript + React 18。
- ランタイム依存は next / react / react-dom のみ。
- **外部通信ゼロ**: `fetch(` / `XMLHttpRequest` / `axios` / `WebSocket` / `sendBeacon` をコード全域 grep して 0 件。
- **保存機構なし**: 永続化はブラウザ localStorage のロック解除フラグ（key: `app_unlocked`、LockGate.tsx）のみ。
  生成 SOAP はページ状態のみでリロードで消える。出口はクリップバードコピーのみ。
- 検索・SOAP 合成・文体変換はすべて決定論的ローカルロジック。**LLM/AI 呼び出しは存在しない**。

### 3.2 機能の実装状態区分（FACT: 実機 + コードで確認）

| 状態 | 機能 |
|---|---|
| 稼働中（実機確認済） | 薬剤検索 / シナリオ選択 / SOAP 生成 / S・O・A・P 個別コピー + 全体コピー（UI・コード確認。クリックによる clipboard 書込み自体は未実行 → §12）/ 多剤合成 / Rapid（S 先頭文・フラグ）/ ADDON / ペルソナ変換 / Express / 外用部位入力 |
| 実装済み・UI 未接続 | NLP 生成（`showNlpButton = false`。`uiMode === 'nlp'` への到達経路なし。feature-glossary の記載と一致） |
| 構想段階（コード痕跡なし） | 粉砕可否・簡易懸濁・IF 参照・腎機能・在庫分析・経営分析（リポジトリ内に実装・設計文書とも存在しない） |

補足（FACT）: 「NLP生成」の実体は `lib/scenarioSelector.ts` の**キーワード辞書 + 3〜6 文字スライディングウィンドウのスコアリング**
（GROUP_RULES / calcTextScore / GROUP_MATCH_BONUS=10）。feature-glossary の「AI 生成」という表現は現実装と異なる（§5 乖離 D-3）。

### 3.3 登録モジュール（FACT）

`data/modules/index.ts` の `ALL_MODULES` に **35 モジュール**登録（JSON 35 件 + index.ts、bridge は 36 md ファイル
= 35 本体 + .bak 1）。JSON 合計約 4.9MB / 約 147,000 行。初期アクティブモジュールは
`INITIAL_MODULE_ID = 'dm_glp1ra_semaglutide_oral'`（page.tsx）。

---

## 4. アーキテクチャ（確認済み範囲）

```
┌─ 開発・生成系（ビルド時）────────────────────────────────────────────┐
│  bridges/*.md (35+1bak)  ←― 医学的内容の正本（人間執筆・STATUS 状態機械管理）  │
│      │  vNext PN1〜PN8（AI 実行。PN1/PN2 人間承認、PN7 監査 26 項目 A〜AB）     │
│      ▼                                                                  │
│  data/modules/*.json (35) ── data/modules/index.ts に手動登録              │
│      │      （`as unknown as ModuleData` ×35 で型検査を迂回 → 所見 M-4）      │
│      ▼                                                                  │
│  next build 時: assertModuleValid（35 チェック）+ assertCrossModuleValid     │
│      ▼                                                                  │
│  Vercel デプロイ（.vercel/project.json 確認。CI なし → 所見 H-3）             │
└──────────────────────────────────────────────────────────────────┘
┌─ 実行系（ブラウザ内で完結・外部通信なし）──────────────────────────────────┐
│ middleware.ts（Basic 認証 / env 未設定時 fail-open）                        │
│   → app/page.tsx（Server Component: 全 35 モジュール import + 起動時検証、    │
│      force-dynamic + Cache-Control: no-store、全量を props でクライアントへ）  │
│   → DashboardClient.tsx（Client、2072 行、全 UI 状態を集中管理）              │
│      ├ Topbar: 薬剤検索（lib/search.ts）/ ペルソナトグル・設定                 │
│      ├ Sidebar + SecondaryPanel: グループ → シナリオ → ADDON                │
│      ├ ThirdPanel: Rapid（S 先頭文/フラグ）・薬剤追加（多剤）・Express・外用部位  │
│      ├ 合成: lib/buildSoap.ts（buildNodeFields / mergeBlocks）              │
│      │        → lib/applyPersona.ts + lib/personaGuard.ts（文体変換層）      │
│      └ SoapEditor: S/O/A/P 表示・編集・navigator.clipboard コピー            │
│      ※ NlpInputPanel / lib/createSoapFromInput.ts: 実装済み・UI 到達経路なし   │
│      ※ LockGate.tsx: NEXT_PUBLIC 変数によるクライアント側ロック（見た目のみ）    │
└──────────────────────────────────────────────────────────────────┘
[UNKNOWN（推測部分）] Vercel 環境変数（BASIC_AUTH_USER/PASS 等）の設定状態、
本番 URL の公開範囲 → 本調査では確認不能（§9 不足情報 E-1）
```

表示テキストの導出経路（FACT。H-1 の理解に必須）:

```
scenario（canonical JSON）
  → buildNodeFields(scenario, mod, addonIds, drugName)   … lib/buildSoap.ts
  → （primary の場合）rawPrimaryFieldsRef に「addonIds=[] の素テキスト」を保存
  → personaEnabled なら applyPersonaToFieldsWithGuard(...) を適用
  → setPrimaryBaseFields(表示ベース) / primaryBaseFieldsRef に同期
  → ADDON / Rapid 操作は primaryBaseFieldsRef.current への「テキスト加工」として実施
      （buildNodeFields を再呼び出ししない — feature-glossary の Rapid 制約）
  → computeDisplayFields(primaryBaseFields, ..., composeNodes, ...) → SoapEditor 表示
```

---

## 5. 資料と実装の対応関係および乖離

| ID | 資料 | 役割 | 正本/生成物 | 対応実装 | 一致状況 |
|---|---|---|---|---|---|
| — | `bridges/*.md` | 医学的内容の正本 | **正本** | `data/modules/*.json` | ✅ FACT: `npm run audit` 2 種（addon chain / alias parity）全 35 件 PASS |
| — | `data/modules/*.json` | 構造実装の正本 | bridge からの生成物 | index.ts / runtime | ✅ FACT: Validator・build・実機で整合 |
| — | `docs/DEVELOPMENT_STANDARD.md` | 最上位索引（2026-07-21） | 索引 | 全体 | ✅ PN7=26 項目の記載も実ファイルと一致 |
| D-1 | `prompts/vNext/HANDOFF.md` | vNext 引き継ぎ正本（2026-07-05） | 正本 | — | ❌ FACT: 「全 19 モジュール」（実際 35）、「PN7 は 15 項目 A〜O」（実 PN7 ファイルは A〜AB の 26 項目）、「bridge 未着手なし（全 19 件完了）」等が陳腐化 |
| D-2 | `prompts/PROJECT_CONTEXT.md` | セッション共通前提（2026-07-21） | 正本 | — | ⚠️ FACT: Current Focus が「次フェーズ候補は DPP4 実装」だが DPP4 系 JSON は実装・登録済み。旧体系 P0-A〜P5 の記述比重が大きい |
| D-3 | `docs/feature-glossary.md` | UI 用語正本 | 正本 | DashboardClient | ⚠️ Rapid/Express/NLP 未接続の記載は実装一致（FACT）。「NLP生成 = AI 生成」は実装（決定論的スコアリング）と不一致（FACT） |
| D-4 | `prompts/RULES.md` §24 | bridge STATUS 状態機械 | 正本 | `bridges/*.md` ヘッダー | ❌ FACT: JSON_COMPLETE は 1 件のみ（dm_glinide_oral）。FROZEN_FOR_PN1 のまま 13 件。**DRAFT のまま JSON 化・登録済み 1 件（dm_biguanide_metformin_oral）**。STATUS 記載なし 20 件（旧体系期のモジュール） |
| D-5 | `README.md` | 入口 | — | — | ⚠️ FACT: 用語集への導線は有効。Features 節は MVP 期の記述（「2 パターン選択」）のまま |
| — | `docs/VALIDATOR_STANDARD.md` | Validator 責務境界 | 正本 | lib/moduleValidator.ts 等 | ✅ 実行結果と整合（既知 WARNING 2 種も文書どおり） |
| — | `docs/DESIGN_PRINCIPLES.md` | 設計原則 DP-00〜DP-12 | 正本 | — | ✅（DP-12 追加が未コミット差分として作業中） |

---

## 6. 所見一覧（重大度別サマリ）

**Critical: 0 件**（該当なし。理由: 患者情報の保存・送信経路が存在せず、確認された最重度の欠陥 H-1 にも運用回避策があるため）

| ID | 重大度 | 表題 | 区分 |
|---|---|---|---|
| H-1 | High | ペルソナトグルが ADDON・Rapid 変更を無音で消失させ、UI 状態と本文が乖離する（確認済みランタイムバグ） | 現在すぐ |
| H-2 | High | ペルソナ層（約 970 行）に自動テストがゼロ | 現在すぐ |
| H-3 | High | 単一長期ブランチに 521 コミット集中・main 事実上死亡・CI なし | 現在すぐ（導入は小工数） |
| H-4 | High | 引き継ぎ正本 HANDOFF.md の可算事実が陳腐化し、DP-00（強くてニューゲーム原則）を自壊させている | 現在すぐ |
| M-1 | Medium | bridge STATUS 状態機械が実データで維持されていない | 現在すぐ〜量産再開前 |
| M-2 | Medium | 認証境界が「見た目のロック」（LockGate）+ fail-open Basic 認証 | 現在: env 確認のみ / SaaS 化前: 全面置換 |
| M-3 | Medium | 全 35 モジュール約 4.9MB を毎ロード全クライアントへ送る設計（no-store でキャッシュ不可） | 利用規模・モジュール数が増えてから（閾値決定は量産再開前） |
| M-4 | Medium | `as unknown as ModuleData` ×35 によるデータ境界の型迂回 | 量産再開前 |
| M-5 | Medium | DashboardClient.tsx（2072 行）への状態集中と state/ref 二重管理の脆さ（H-1 の温床） | H-1 修正後に計画 |
| L-1 | Low | ADDON グループ見出しが英語のまま表示（`lifestyle_guidance` 等。既知負債を実機で確認） | 任意 |
| L-2 | Low | README Features 節・LockGate「GLP-1」バッジが現状と乖離 | 任意 |
| L-3 | Low | ペルソナ UI の「無変換」概念が二重（personaEnabled=false と persona='plain'） | 任意 |
| L-4 | Low | .bak 残置 / out/ の古い静的 export（gitignore 済・実害なし） | 任意 |

**積極的評価（FACT）**: bridge→JSON→runtime の 3 層責務分離と横断監査、非創作・凍結・PENDING 停止の運用規律、
Validator 3 層戦略、外部送信ゼロ・保存ゼロの信頼境界は、現段階の設計として適切。過剰設計はほぼ見られない。

---

## 7. 各課題の根拠・再現手順・影響範囲

> H-1 は §8 に専用の実装引き継ぎ仕様がある。本節は H-1 以外を扱う。

### H-2: ペルソナ層に自動テストがゼロ

- **根拠（FACT)**: `tests/` の全 9 ファイル（drugSubject / genericIntegration / menuDisplay / mergeBlocks /
  moduleValidator / multiDrugCompose / search / soapMerge / stateTransitions）に `persona` への言及なし
  （`grep -rln "persona" tests/` = 0 件）。対象コード: `lib/applyPersona.ts`（713 行、検索語: `applyPersonaToFieldsWithGuard`）、
  `lib/personaGuard.ts`（257 行、検索語: `derivePersonaGuard`）。
- **影響範囲**: 「情報欠損・医学的意味の変化・文意の逆転の禁止」というプロジェクト最強の制約を負う層が
  無検証。H-1 がテストをすり抜けた直接の原因（INFERENCE）。
- **再現**: 該当なし（欠如の指摘）。

### H-3: ブランチ戦略・CI 不在

- **根拠（FACT)**: `git log --oneline main..HEAD | wc -l` = 521。`.github/` ディレクトリなし。タグなし。
  検証工程は `docs/IMPLEMENTATION_CHECKLIST.md` による人間のチェックリスト運用のみ。
- **影響範囲**: リリース単位の追跡・巻き戻し・工程スキップの機械的防止が不能。AI 駆動開発（担当 AI が
  セッションごとに入れ替わる前提）では検証の強制力が特に重要（RISK）。
- **参考（FACT)**: 全検証（tsc + test + multi-drug + audit + build）はローカルで数分以内に完走することを確認済み。
  CI 化の技術的障壁は低い（INFERENCE）。

### H-4: HANDOFF.md の陳腐化

- **根拠（FACT)**: §5 D-1 参照。`prompts/vNext/HANDOFF.md` の「全 19 モジュール」「PN7 15 項目 A〜O」
  vs 実態（index.ts 35 件、`prompts/vNext/PN7-Cross-Reference-Audit.md` に §A〜§AB の 26 項目）。
- **影響範囲**: 開発モデルが「新規 AI セッションが HANDOFF だけを読んで再開する」（DP-00）ことに全面依存
  しているため、正本の誤りは新セッションの誤判断に直結（RISK）。
- **RECOMMENDATION**: モジュール数など可算事実は手書きせず `data/modules/index.ts` から導出する構造に変える。

### M-1: bridge STATUS 状態機械の不整合

- **根拠（FACT)**: 全 bridge の先頭 STATUS を集計（検索語: `grep -m1 "STATUS:" bridges/*.md`）。
  結果: JSON_COMPLETE 1 / FROZEN_FOR_PN1 13 / **DRAFT 1（`bridges/dm_biguanide_metformin_oral.md` —
  対応 JSON は生成・登録済み）** / STATUS 記載なし 20。
- **影響範囲**: RULES.md §24 は「ファイル上の STATUS を会話ログより優先し、矛盾時は停止」と定めるため、
  次の AI セッションが誤停止・誤判断する現実的な引き金（RISK）。
- **再現**: 上記 grep をそのまま実行。

### M-2: 認証境界

- **根拠（FACT)**:
  - `app/components/LockGate.tsx`: `process.env.NEXT_PUBLIC_APP_LOCK_PASSWORD` とクライアント側比較
    （検索語: `NEXT_PUBLIC_APP_LOCK_PASSWORD`）。`NEXT_PUBLIC_*` はビルド時に JS バンドルへ平文埋め込みされる。
    解除状態は `localStorage.setItem('app_unlocked', '1')`。
  - `middleware.ts`: Basic 認証。`if (!user || !pass) return NextResponse.next()` — **fail-open**
    （コメントで意図明記。検索語: `fail-open`）。
  - ローカル `.env.local` は改行 1 バイトのみ（環境変数未設定）→ ローカルでは両ロックとも無効（実機確認済み）。
- **影響範囲**: 現在は患者情報を扱わないため露出は指導文テンプレート＝知財に限定（INFERENCE）。
  Vercel 側の環境変数設定状況は UNKNOWN（§9 E-1）。SaaS 化前に LockGate 廃止 + 本格認証への置換が必須
  （RECOMMENDATION）。現時点での本格認証基盤の作り込みは過剰設計であり不要。

### M-3: 全モジュール全量配信

- **根拠（FACT)**: `app/page.tsx` が `<DashboardClient moduleData={moduleData} allModules={ALL_MODULES} />` で
  全 35 モジュールを渡す（検索語: `allModules={ALL_MODULES}`）。`du -sh data/modules` = 4.9MB。
  `next.config.js` で `Cache-Control: no-store` を全パスに強制。
- **影響範囲（INFERENCE)**: 現状（35 件・店舗内利用）では顕在化しにくい。300 モジュール構想では単純比例で
  40MB 超/ロードとなり破綻。実ペイロードサイズは未計測（§12）。
- **RECOMMENDATION**: 量産再開前に「遅延ロード / 検索インデックス分離へ切り替える閾値」を決める（Phase 2 計測）。

### M-4: 型迂回

- **根拠（FACT)**: `data/modules/index.ts` の `ALL_MODULES` 全 35 エントリが `as unknown as ModuleData`
  （検索語: `as unknown as ModuleData`）。JSON の型適合は tsc の保証外で、実行時 ModuleValidator が実質の防衛線。
- **影響範囲**: 型と Validator の二重管理は schemaGeneration（保留中）等のスキーマ進化時に乖離リスク（RISK）。

### M-5: DashboardClient の状態集中

- **根拠（FACT)**: `app/components/DashboardClient.tsx` 2072 行。state と ref の二重管理が多数
  （`composeNodesRef` / `personaEnabledRef` / `selectedPersonaRef` / `selectedAddonIdsRef` /
  `rawPrimaryFieldsRef` / `primaryBaseFieldsRef` / `rapidBaseFieldsRef` / `uiModeRef` ほか。
  検索語: `useRef<` を同ファイル内で列挙）。UI 未接続の NLP 経路の状態管理が同居。
- **影響範囲**: 「どの ref が正本か」が操作ごとに異なる構造で、H-1 はこの必然的帰結（INFERENCE）。
- **RECOMMENDATION**: 全面リファクタは不要。H-1 修正を機に表示テキスト導出の単方向化を検討（§8 構造改善案）。

### L 群（根拠のみ）

- **L-1（FACT)**: 実機でヘパリノイド系選択時、ADDON 見出しが `lifestyle_guidance` と英語表示。
  原因は `app/components/AddonPanel.tsx` の `GROUP_LABELS[group] ?? group` フォールバック
  （HANDOFF「技術的負債」記載と一致。ラベル案も同所に記載あり: 生活指導 / 使用方法 / アドヒアランス）。
- **L-2（FACT)**: README Features 節が MVP 期記述。LockGate バッジ文字列 `GLP-1`（検索語: `s.badge`）。
- **L-3（FACT)**: `lib/applyPersona.ts` の `PersonaId = 'polite' | 'concise' | 'gentle' | 'plain'`。
  `plain`（ラベル「JSONそのまま」）と `personaEnabled=false` が二重の「無変換」を表現。
- **L-4（FACT)**: §1 のワークツリー状態参照。

---

## 8. H-1 実装引き継ぎ仕様（Sonnet 向け・調査再実行不要）

### 8.1 課題概要

| 項目 | 内容 |
|---|---|
| 課題 ID | **H-1** |
| 重大度 | **High** |
| 現象 | ペルソナ ON/OFF トグルで、1 剤目に適用済みの ADDON 文（および Rapid による S 変更）が本文から**無音で消失**する。ペルソナを OFF に戻しても復元しない。**ADDON ボタンは ON（ハイライト）表示のまま**で、UI 状態と本文が乖離する |
| 影響の質 | 医療記録草稿ツールにおける「無音の情報欠損」。薬剤師が指導内容を記録済みと認識したまま欠落した P 欄をコピーしうる（RISK）。ペルソナ設計の絶対制約「情報欠損禁止」（PROJECT_CONTEXT / applyPersona ヘッダコメント）に実装自身が違反 |
| 運用回避策 | ADDON / Rapid 操作後にペルソナトグルを触らない。消失した場合はシナリオを選び直して ADDON を再トグル（FACT: シナリオ再選択で復元可能） |

### 8.2 再現条件と再現手順（FACT: 2026-07-25 実機で 2 回再現）

**再現条件**: 1 剤目のシナリオ確定後、ADDON を 1 つ以上 ON にした状態（または Rapid で S を変更した状態）で、
Topbar のペルソナトグルを操作する。単剤・多剤どちらでも発生（多剤時は 1 剤目の ADDON が消える）。

**再現手順（単剤・最小）**:

1. `npm run dev` → `http://localhost:3000`（ローカルは LockGate / Basic 認証とも無効 = 素通し）
2. トップバー検索窓に「りべるさす」→ 候補「リベルサス（セマグルチド）」を選択
3. 左サイドバー「初回」→ シナリオ「初回」を選択 → S/O/A/P が生成される
4. 左パネル ADDON「生活指導（血糖指導）」を ON
   → **確認**: P 欄に「高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。」以下
   計 5 行が closing（「次回、引き続き〜」）の前に挿入される
5. トップバーの「ペルソナ」トグルを ON（初期選択ペルソナは `concise`＝簡潔）
   → **実際の動作**: DENSITY 変換は適用される（例:「出ることがあります。」→「出ることあり。」）が、
   **手順 4 の ADDON 5 行が P 欄から消失する**
6. ペルソナトグルを OFF
   → **実際の動作**: 文体は無変換に戻るが **ADDON 5 行は戻らない**。ADDON ボタンは ON 表示のまま
   （FACT: `document.querySelectorAll('textarea')[3].value` に ADDON 文が含まれず、ボタンはハイライト継続）

### 8.3 期待動作 / 実際の動作

| | 期待動作 | 実際の動作 |
|---|---|---|
| ペルソナ ON | 現在表示中の本文（ADDON・Rapid 反映済み）に対して文体変換のみ適用。情報欠損なし | ADDON・Rapid 反映**前**のシナリオ素テキストから再計算され、ADDON/Rapid 分が消失 |
| ペルソナ OFF | 変換前の（ADDON・Rapid 反映済み）本文へ復元 | シナリオ素テキストへ戻る（ADDON/Rapid 分は消失したまま） |
| UI 状態 | ボタン表示と本文が常に一致 | `selectedAddonIds` は ON のままなのでボタンはハイライト、本文には無い |

### 8.4 根本原因（FACT: コードリーディングで特定）

対象ファイル: `app/components/DashboardClient.tsx`（すべて 1aafde6 時点の行番号。**必ず検索語で再特定すること**）

1. **シナリオ確定時**、effect 内で素テキストを保存する:
   - L818: `const { fields: rawFields } = buildNodeFields(primaryScenario, activeModuleData, [], primaryDrugName)`
     — 第 3 引数 `addonIds` が **`[]` 固定**（検索語: `buildNodeFields(primaryScenario, activeModuleData, [], primaryDrugName)`）
   - L820: `rawPrimaryFieldsRef.current = rawFields` — **ADDON を含まない**素テキストが「persona 再計算の基点」として保存される
2. **ADDON トグル（primary ブランチ）** は `primaryBaseFieldsRef.current` へのテキスト strip/append 加工のみで、
   `rawPrimaryFieldsRef` を更新しない:
   - L1246〜: `handleAddonToggle`。primary ブランチ（L1281〜）はコメントどおり
     「primaryBaseFieldsRef.current をベースに全 ADDON テキストを一旦剥がし、選択中の ADDON だけ再付加。
     buildNodeFields は呼ばない（S 先頭文/フラグ変更が消えるのを防ぐ）」
     （検索語: `全 ADDON テキストを一旦剥がし`）
   - Rapid 系 `handleSToggle`（L1401 付近）/ `handleFlagChange`（L1499 付近）も同様に表示ベース側のみ加工
3. **ペルソナトグル時**、`reapplyPersonaToAllBlocks`（L1802〜）が
   `rawPrimaryFieldsRef.current`（= ADDON 無し素テキスト）から再計算して `setPrimaryBaseFields(fields)` で
   表示ベースを**上書き**する（検索語: `reapplyPersonaToAllBlocks`）:
   ```ts
   const rawPrimary = rawPrimaryFieldsRef.current
   const primaryGuard = primaryGuardRef.current
   if (primaryGuard) {
     const fields = nextEnabled
       ? applyPersonaToFieldsWithGuard(rawPrimary, true, nextPersona, primaryGuard)
       : rawPrimary
     setPrimaryBaseFields(fields)
   }
   ```
4. トグルの入口は Topbar props（L1863〜）:
   `onPersonaToggle={() => { const nextEnabled = !personaEnabled; setPersonaEnabled(nextEnabled); reapplyPersonaToAllBlocks(nextEnabled, selectedPersona) }}`
   （検索語: `onPersonaToggle`）
5. `selectedAddonIds`（L245）はこの経路で**リセットされない**ため、ボタン表示だけが ON のまま残る → 状態乖離。

**根本原因の一文要約**: ADDON / Rapid の変更が「表示ベース（primaryBaseFieldsRef）」にしか反映されない一方、
ペルソナ再計算は「素テキスト（rawPrimaryFieldsRef）」を基点に表示ベースを上書きするため、
2 つのベースの内容が乖離した時点でペルソナトグルが ADDON / Rapid 分を破壊する。

### 8.5 関連ファイル・関数・state/ref・導出経路

| 種別 | 識別子 | 場所（1aafde6 時点） |
|---|---|---|
| ファイル | `app/components/DashboardClient.tsx` | 主戦場（2072 行） |
| ファイル | `lib/applyPersona.ts` / `lib/personaGuard.ts` | 変換層（バグ無しを確認済み — 変換自体は正常動作） |
| ファイル | `lib/buildSoap.ts` | `buildNodeFields`（scenario+followup+addon 合成の共通ロジック） |
| ファイル | `app/components/Topbar.tsx` | ペルソナトグル / 設定ボタンの UI |
| ファイル | `tests/stateTransitions.test.ts` | 回帰テスト追加先の既存候補 |
| 関数 | `reapplyPersonaToAllBlocks(nextEnabled, nextPersona)` | L1802。**修正の中心** |
| 関数 | `handleAddonToggle(addonKey, _text)` | L1246（node ブランチ L1249〜 / primary ブランチ L1281〜） |
| 関数 | `handleSToggle` / `handleFlagChange` | L1401 / L1499 付近（Rapid。表示ベースのみ加工） |
| 関数 | `buildNodeFields(scenario, mod, addonIds, drugName)` | lib/buildSoap.ts L71 |
| 関数 | `applyPersonaToFieldsWithGuard` / `derivePersonaGuard` | lib/applyPersona.ts L672 / lib/personaGuard.ts |
| 関数 | `computeDisplayFields(...)` | DashboardClient L109 付近（最終表示の合成） |
| state | `personaEnabled`（L215, 初期 false）/ `selectedPersona`（L216, 初期 `'concise'`） | |
| state | `primaryBaseFields`（L227）= 表示ベース（**persona 適用済みの場合あり**） | |
| state | `selectedAddonIds`（L245, Set<string>）/ `primaryAddonIds`（L230） | ボタンハイライトの根拠 |
| ref | `rawPrimaryFieldsRef`（L271）= シナリオ素テキスト（**ADDON/Rapid 未反映**）。persona 再計算の基点 | |
| ref | `primaryBaseFieldsRef`（L263）= 表示ベースのミラー。ADDON/Rapid 加工の基点 | |
| ref | `primaryGuardRef`（L272）/ `selectedAddonIdsRef`（L265）/ `rapidBaseFieldsRef`（L283 付近, NLP 用・通常 null） | |
| 導出経路 | §4 末尾の「表示テキストの導出経路」参照 | |

### 8.6 影響する機能 / 影響しないと確認できた機能

**影響する（FACT: 実機再現）**:
- ペルソナ ON / OFF / （INFERENCE: ペルソナ種別変更も同一関数経由のため同様）時の
  1 剤目 ADDON 文・Rapid S 先頭文/フラグ変更の保持

**影響しないと確認できた（FACT: 実機）**:
- ペルソナ変換そのもの（簡潔の DENSITY 規則適用は正常。personaGuard の医療記録行保護も P closing で確認）
- ADDON トグル自体（ペルソナ非使用時は ON/OFF・再構成とも正常）
- Rapid S 先頭文トグル自体（S のみ変化・A/P 保持を確認）
- 多剤合成の本文統合・P closing dedupe
- 検索・シナリオ選択・Express・コピー UI
- シナリオ再選択による復元（ADDON 再トグルで元に戻せる）

**影響が推定されるが実機未確認（INFERENCE / §8.11 未確定事項）**:
- 2 剤目以降ノード: `handleAddonToggle` の node ブランチは `buildNodeFields(sc, mod, newAddonIds, ...)` の結果を
  `block.rawFields` に**ADDON 込みで**保存するため（L1262〜L1271、検索語: `block: { ...n.block, fields, rawFields, guard`）、
  `reapplyPersonaToAllBlocks` の node 側再計算（`node.block.rawFields` 基点）では ADDON は**保持される**とコードから読める。
  ただし実機未検証。

### 8.7 修正時に維持すべき既存挙動（FACT: 文書化された制約）

1. **Rapid 操作中に `buildNodeFields` を呼ばない**（`docs/feature-glossary.md`「重要な制約」。
   S 先頭文・フラグ変更がシナリオ再構築で消えるのを防ぐための制約）
2. `personaGuard` による医療記録行（closing / 指導記録行）の無変換保護
3. ペルソナ OFF 時は無変換テキストを表示する（persona は後段変換レイヤーであり canonical を汚染しない）
4. ADDON OFF 時の「全 ADDON strip → 選択分のみ再付加」仕様（handleAddonToggle primary ブランチ）
5. ADDON は P closing の**前**に挿入され、closing は最後に 1 回のみ（PROJECT_CONTEXT §5）
6. NLP 経路（`rapidBaseFieldsRef` が非 null の場合）の分岐を壊さない（UI 未接続だがコードは存置方針）

### 8.8 最小修正案（案 A）— Phase 1 で確認済みの事実から導出

**方針**: 「ADDON・Rapid 反映済みかつ persona 未適用」のベースを常に持ち、persona 再計算の基点をそれに変える。

- `rawPrimaryFieldsRef` の意味を「シナリオ素」から「**無変換・オーバーレイ込みベース**」へ拡張する。
  具体的には ADDON / Rapid の各ハンドラ（`handleAddonToggle` primary ブランチ / `handleSToggle` /
  `handleFlagChange`）が表示ベース（`primaryBaseFieldsRef`）に対して行っているテキスト加工を、
  **同じロジックで raw ベースにも並行適用**する（persona ON 中は表示ベース=変換済み、raw ベース=無変換で、
  同一のオーバーレイ操作を両方に記録する）。
- `reapplyPersonaToAllBlocks` は現行どおり raw 基点で再計算すればよい（基点の内容が正しくなるため）。
- 影響局所性: DashboardClient.tsx 内で完結。lib/ 層・JSON・型定義の変更不要。
- 留意（RISK）: persona ON 中の ADDON トグルは「変換済み表示ベースへ未変換 ADDON 文を追記」する現行挙動が
  そもそも曖昧（§8.11-1）。案 A ではトグル時に raw を更新した上で
  `reapplyPersonaToAllBlocks(personaEnabled, selectedPersona)` を呼び直して表示を再導出するのが一貫する。

### 8.9 構造改善案（案 B）— 同じく確認済み事実の範囲内

**方針**: テキストを状態として二重管理するのをやめ、**意味状態から表示を毎回導出する単方向パイプライン**にする。

- 正本状態を「`selectedScenarioId` + `selectedAddonIds` + `sRelation`/`sCondition` + フラグ + `personaEnabled`/`selectedPersona`」
  に限定し、表示テキストは
  `buildNodeFields(scenario, mod, addonIds) → applyRapidOverlay(sRelation, condition, flags) → applyPersona`
  の純関数合成で導出する。
- 根拠: Rapid の S 先頭文・フラグは `handleSToggle` / `handleFlagChange` がボタン定義（`SRelation` / `SCondition`、
  ThirdPanel の `SectionDef`）から決定論的にテキストを組んでおり、状態からの再導出が可能（FACT: コード確認）。
- feature-glossary の「Rapid 中に buildNodeFields を呼ばない」制約は「呼ぶと**現行実装では**変更が消えるから」
  という理由に基づくため、導出一元化後は制約自体の再定義（文書更新）が必要（RECOMMENDATION）。
- ユーザー手動編集（SoapEditor 直接編集、`editedSOAP` / `confirmDiscard` 経路）との整合設計が必要。

### 8.10 両案の違い

| 観点 | 案 A（最小修正） | 案 B（構造改善） |
|---|---|---|
| 変更範囲 | DashboardClient 内・ハンドラ 3〜4 箇所 + reapply 呼び直し | 状態設計の再編（M-5 と同時解決） |
| リグレッションリスク | 低（既存経路を温存） | 中〜高（Rapid/NLP/編集経路すべて再検証） |
| 恒久性 | 二重管理は残る（将来も並行更新の整合負担） | 二重管理を解消。テスト容易性が大きく向上 |
| 文書影響 | なし | feature-glossary の Rapid 制約の書き換えが必要 |
| 推奨 | **まず案 A で H-1 を止血し、案 B は M-5 の Phase 2 計画として別途判断**（RECOMMENDATION） | |

### 8.11 未確定事項（実装前にユーザーまたは Phase 2 で確定すべきこと）

1. **persona ON 中に ADDON をトグルした場合の期待仕様**: ADDON 文も変換して表示すべきか、無変換で追記すべきか。
   現行実装は「変換済み本文に無変換 ADDON 文が混在」する構造（コードから読める挙動。実機未検証 → UNKNOWN）。
2. 2 剤目以降ノードの ADDON がペルソナトグルで保持されるか（コード上は保持と読める。実機未検証 → INFERENCE）。
3. ペルソナ**種別変更**（モーダルのラジオ切替）時の再現有無（同一関数 `reapplyPersonaToAllBlocks` を通ると
   INFERENCE されるが、モーダル側ハンドラは未精読 → UNKNOWN）。
4. NLP モード（`rapidBaseFieldsRef` 非 null）との相互作用（UI 未接続のため実機到達不能 → UNKNOWN）。
5. `selectedPersonaRef` の初期値が `'polite'`（L275）で state 初期値 `'concise'`（L216）と異なる点の意図
   （毎レンダー同期されるため実害は未確認 → UNKNOWN。※本項は監査記録作成時のコード再読で確認した既読コードの再整理であり、新規調査ではない）。

上記 1〜5 は Phase 1 時点（2026-07-25 調査時点）の記録として変更しない。
実装セッションでの追加確認・仕様確定は次項（8.11 追記）を参照。

### 8.11 追記: H-1 実装時の追加確認・仕様確定（2026-07-25 実装セッション）

本節は Phase 1 調査後、同日中に行った H-1 実装セッションでの追加確認結果を記録する。
上記 8.11 の 1〜5 は Phase 1 調査時点の記録として原文のまま残し、本節でどの項目が
何に更新されたかを個別に紐づける。実装セッションの対象コミットは Phase 1 調査対象の
`1aafde6` ではなく、その後 `app/components/DashboardClient.tsx` に加えた変更（本文書 §1
のコミットより後の未コミット差分）である。行番号・関数名は実装セッション時点のものであり、
Phase 1 本文中の行番号（`1aafde6` 時点）とは一致しない場合がある。

**8.11-1（persona ON 中の ADDON トグル仕様）→ 仕様確定・実装反映**
Phase 1 時点は UNKNOWN（「ADDON 文も変換すべきか、無変換で追記すべきか」未確定）だった。
実装セッションでユーザーから「ペルソナ ON 中に ADDON / Rapid が変更された場合も、現在の
ペルソナを適用した結果が常に表示されるようにする」との明示指示を受け、**ADDON を含む
現在の SOAP 全体（raw ベース）へ、その時点で選択中の persona を再適用して表示する**仕様
として確定した。`handleAddonToggle`（primary ブランチ）は ADDON トグル後に
`rawPrimaryFieldsRef.current` を更新し、`derivePrimaryDisplayFields()` で表示を再導出する
実装とした（FACT: 実装・実機確認済み。実機では ADDON ON 直後に persona ON 状態のまま
変換済みテキストが即時表示されることを確認した）。

**8.11-3（persona 種別変更時の再現有無）→ UNKNOWN から FACT へ更新**
Phase 1 時点は「モーダル側ハンドラは未精読 → UNKNOWN」だった。実装セッションでコードを
確認した結果、persona 種別変更（ペルソナ設定モーダルのラジオ選択）も
`setSelectedPersona(p); reapplyPersonaToAllBlocks(personaEnabled, p)` を通じて同一の
`reapplyPersonaToAllBlocks` を呼ぶことを確認した（FACT。検索語: `reapplyPersonaToAllBlocks(personaEnabled, p)`）。
すなわち persona 種別変更も ON/OFF トグルと同じ経路で H-1 の対象であり、今回の修正
（raw ベースの並行更新）は種別変更時にも同様に適用される。

**8.11-2（多剤ノード側 ADDON の persona トグル耐性）→ 一部 FACT 化・実機は依然 UNKNOWN**
Phase 1 時点は「コード上は保持と読める。実機未検証 → INFERENCE」だった。実装セッションで
node ブランチの回帰テスト（`tests/personaState.test.ts` ⑥）を追加し、node ブランチが
`buildNodeFields` の結果を `block.rawFields` に ADDON 込みで保存し、persona ON/OFF 双方で
ADDON 文を保持することをユニットテストで確認した（FACT: ユニットテストレベル）。
**ただし実機（ブラウザ操作による多剤合成シナリオでの node ADDON × persona トグル）は
今回も確認していない（UNKNOWN のまま）**。実装が正しく動作することの最終確認は Phase 2
または次回セッションでの実機確認が必要（RECOMMENDATION）。

**8.11-4（NLP モードとの相互作用）→ 変更なし・UNKNOWN のまま**
Phase 1 時点から変更なし。NLP 生成経路（`rapidBaseFieldsRef` 非 null）は UI 未接続のため
実機到達不能であり、今回の実装セッションでも実機確認していない（UNKNOWN）。修正コードは
`rapidBaseFieldsRef.current !== null` の場合に既存ロジックをそのまま温存する分岐を明示的に
追加しており（`handleSToggle` / `handleFlagChange`）、意図的な非変更である（FACT: コード上
の分岐として確認済み）。ただし到達不能コードであるため動作の実機的な保証はない。

**8.11-5** は実装セッションでの追加確認対象外。Phase 1 時点の記録（UNKNOWN）のまま変更しない。

**新規発見: state updater 二重実行によるべき等性の欠如（Phase 1 時点では未検出）**
Phase 1 調査時点では検出されていなかった、実装セッション中に新たに発見した問題。
`handleAddonToggle`（primary ブランチ）の修正第一版は、`setSelectedAddonIds(prev => {...})`
という React の関数型 state 更新コールバックの**内部で** `rawPrimaryFieldsRef.current` を
読み書きしていた。実機検証（ADDON を 1 回クリック）で ADDON 文が **2 回重複して挿入される**
ことを発見した（FACT: 実機再現）。原因分析: React の開発モードでは、`setState(prev => ...)`
形式の更新コールバックが副作用検出のため 2 回呼ばれることがあり、コールバック内で ref への
書き込みという副作用を行うと、1 回目の呼び出しでの書き込みが 2 回目の呼び出し内で
「既に ADDON が反映された raw」として読み込まれてしまい、2 回目の呼び出しが重ねて ADDON を
追記する（INFERENCE: 二重実行の発生機序についてはコードの構造から導いた推論であり、
React 内部の呼び出し回数そのものを計測して確認したものではない）。
**修正**: raw ベースのスナップショットを `setSelectedAddonIds` 呼び出しの**外側**で一度だけ
取得し（`rawBeforeToggle`）、コールバック内部ではそのスナップショットのみを参照する形に
変更した。これにより、コールバックが何回呼ばれても計算結果が変わらない（べき等）構造にした
（FACT: 修正後、実機で重複が発生しないことを確認済み）。
**RISK**: 同様のパターン（state 更新コールバック内での ref の読み書き）が本ファイルの他の
箇所にも存在する可能性があるが、今回は調査していない（H-1 のスコープ外）。

**H-1 修正後の検証結果（2026-07-25 実装セッション、FACT）**

| 検証 | 結果 |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm test` | 2633 件 pass / 0 fail（Phase 1 時点の 2620 件 + 新規回帰テスト 13 件） |
| `npm run test:multi-drug` | 20 PASS / 0 FAIL |
| `npm run audit` | ADDON chain / Alias 同期とも 35 モジュール全 PASS |
| `npm run build` | PASS |
| 実機（`npm run dev`） | シナリオ確定 → ADDON ON → persona ON → OFF の一連の操作で、
本文書 §8.2 の再現手順どおりに ADDON 文が全時点で保持されることを確認。
ADDON ボタンの ON 表示と本文中の ADDON 文の有無が一致することも確認した |

### 8.12 必須回帰テストと推奨テストマトリクス

**必須（このバグの直接回帰）**:
1. シナリオ確定 → ADDON ON → persona ON → OFF の全時点で、ADDON 文が本文に存在し続けること
2. 上記全時点で `selectedAddonIds` と本文の整合（ボタン ON ⇔ 本文に ADDON 文あり）
3. persona ON 時、ADDON 文も情報欠損なく出力されること（変換の有無は §8.11-1 の決定に従う）
4. Rapid S 先頭文変更 → persona ON/OFF で S 先頭文が維持されること
5. personaGuard 保護行（closing）が全ペルソナで無変換のままであること

**推奨マトリクス**（tests/stateTransitions.test.ts への追加を想定）:

```
{ADDON: なし/1件/複数} × {Rapid S変更: なし/あり} × {フラグ: なし/あり}
  × {persona: OFF→ON→OFF, ON中に種別変更}
  × {構成: 単剤 / 多剤(1剤目ADDON) / 多剤(ノードADDON)}
```

**完了条件**:
- §8.2 の再現手順で消失が発生しない（手動確認）
- 上記必須テスト 1〜5 が自動テストとして追加され PASS
- 既存全テスト PASS（`npm test` 2620 件基準）・`npm run test:multi-drug` 20/20・`npx tsc --noEmit`・`npm run build` PASS
- §8.7 の維持すべき挙動 6 点に変化がないこと

---

## 9. 不足情報（Phase 2 前に必要 — 2026-07-25 時点で UNKNOWN）

| # | 必要なもの | 判断できないこと |
|---|---|---|
| E-1 | Vercel 環境変数の設定状況（BASIC_AUTH_USER/PASS、NEXT_PUBLIC_APP_LOCK*）と本番/Preview URL の公開範囲 | 現在の実効的な認証境界。本番 URL が無防備公開かどうか |
| E-2 | 利用実態（利用者数・端末・ブラウザ、電子薬歴側へのコピー運用） | クリップボード以降の情報の扱い・実務リスク面 |
| E-3 | main ブランチの位置づけと Vercel が追跡するデプロイブランチ | H-3 の是正方針 |
| E-4 | NLP 生成の将来方針（外部 LLM API 前提か、ローカル完結か） | **セキュリティ評価の最大の分岐点**。外部 LLM なら患者テキストが初めて信頼境界を越える |
| E-5 | 旧体系（P0-A〜P5・docs/P*_STANDARD）の保守方針（凍結アーカイブ化の可否） | 文書正本の一本化範囲（H-4 対策） |
| E-6 | bridge 原稿の知財・医学的責任の整理（執筆者・監修体制・改訂責任） | 10 年運用・他店舗展開時のコンテンツガバナンス |
| E-7 | 長期構想機能（粉砕可否・腎機能等）の優先順位と次の着手領域 | Phase 2 のアーキテクチャ評価軸 |

E-1 / E-4 が未回答のままでは Phase 2 のセキュリティ章は確定できない。

---

## 10. Phase 2 候補（優先順位順）

| 優先 | 項目 | 理由 | 規模 |
|---|---|---|---|
| 1 | H-1 修正（案 A）+ persona×addon×rapid の状態遷移テスト整備（H-2 の一部） | 確認済みの無音情報欠損。最優先 | 小〜中 |
| 2 | CI 導入（GitHub Actions: tsc/test/multi-drug/audit/build）+ ブランチ戦略確立（main 統合・タグ運用） | H-3。全検証が短時間で完走することを確認済みで費用対効果最大 | 小 |
| 3 | 正本ドキュメントの自動整合（HANDOFF の可算事実の導出化、bridge STATUS の audit スクリプト化） | H-4 / M-1 | 小 |
| 4 | セキュリティ方針の確定（E-1/E-4 回答後。現行= Basic 認証実効化 + LockGate 廃止判断、SaaS 前=要件定義のみ） | M-2 | 中 |
| 5 | スキーマ進化戦略（JSON Schema/zod による `as unknown` 排除、schemaGeneration 再評価、ペイロード実測と遅延ロード閾値決定） | M-3 / M-4。点眼領域量産再開前が適期 | 中 |
| 6 | 状態管理リファクタ計画（案 B の設計、DashboardClient 分割、NLP dead code の隔離/削除判断） | M-5。優先 1 の結果を踏まえ範囲決定 | 中〜大 |
| 7 | 長期構想機能向けプラットフォーム評価（「モジュール=薬剤」型 → ツール群ワークスペースへの拡張境界） | E-7 回答が前提 | 中 |

---

## 11. Sonnet へ渡せる固定課題一覧

### 11.1 即実装可能（追加の設計判断が不要、または本文書内で確定済み）

| 課題 ID | 内容 | 参照 | 規模 |
|---|---|---|---|
| **T-1** | H-1 の最小修正（案 A）: ADDON/Rapid ハンドラの加工を raw ベースへ並行適用し、persona 再計算の基点を修正。§8.7 の維持挙動を厳守 | §8 全体 | 小〜中 |
| **T-2** | H-1 必須回帰テスト 5 件 + 推奨マトリクスの実装（tests/stateTransitions.test.ts 拡張 or tests/personaState.test.ts 新設） | §8.12 | 小〜中 |
| **T-3** | persona 変換単体テストの新設: applyPersona / personaGuard の「情報欠損なし・保護行無変換・plain 恒等」プロパティ検証 | H-2 / §7 | 小 |
| **T-4** | bridge STATUS 監査スクリプト（scripts/audit-bridge-status.ts 等）: index.ts 登録済み ⇔ STATUS=JSON_COMPLETE の突合、`npm run audit` への組込み | M-1 / §7 | 小 |

※ T-1 実装時の注意: §8.11-1（persona ON 中の ADDON トグル仕様）だけはユーザーへ一度確認するのが望ましい。
確認できない場合は「raw 更新 + reapply 呼び直し」（§8.8 末尾）を暫定仕様として実装し、その旨をコミットメッセージに残す。

### 11.2 ユーザー判断・回答待ち（実装前に決定が必要）

| 課題 ID | 内容 | ブロッカー |
|---|---|---|
| T-5 | HANDOFF.md / PROJECT_CONTEXT.md の陳腐化修正（モジュール数・PN7 項目数・Current Focus） | 正本文書の編集となるため、記載方針（手書き修正か導出化か）のユーザー決定が必要（H-4） |
| T-6 | bridge STATUS の一括更新（FROZEN_FOR_PN1→JSON_COMPLETE 等） | bridge は「Claude が自主的に書き換え禁止」の対象。ヘッダー STATUS 行のみの更新可否をユーザーが明示する必要 |
| T-7 | CI 導入（.github/workflows） | 対象ブランチ・main 統合方針（E-3）の決定待ち |
| T-8 | AddonPanel GROUP_LABELS への日本語ラベル追加（生活指導/使用方法/アドヒアランス） | ラベル文言の最終承認（HANDOFF に案は記載済み） |
| T-9 | LockGate の扱い（廃止 or 存置）と Vercel 環境変数の整備 | E-1 回答待ち（M-2） |

---

## 12. 今回の調査で確認していない範囲

- Vercel 本番/Preview 環境の実挙動・環境変数（ローカルと GitHub リポジトリのみ調査。外部送信は行っていない）
- clipboard コピーボタンのクリック実行（UI・コードの存在確認まで。書込み動作は未実行）
- persona ON 状態での ADDON トグルの実機挙動（§8.11-1）
- 多剤ノード側 ADDON × persona トグルの実機挙動（§8.11-2）
- ペルソナ種別変更（モーダル）経由での H-1 再現（§8.11-3）
- NLP 経路（UI 未接続のため実機到達不能）
- RSC ペイロードの実サイズ計測（M-3 は JSON 総量 4.9MB からの INFERENCE）
- `prompts/P0-A.md`〜`P5.md`（旧体系プロンプト本文）の精読（見出し・役割の把握まで）
- 各モジュール JSON の医学的内容の妥当性（本調査の対象外。Human Review の責務領域）
- tests の個別ケースの網羅性評価（実行結果の確認まで）

---

*本文書は Phase 1 調査（会話セッション）の固定記録である。次セッションはまず本文書 → `docs/DEVELOPMENT_STANDARD.md` → `prompts/PROJECT_CONTEXT.md` の順で読むこと。*
