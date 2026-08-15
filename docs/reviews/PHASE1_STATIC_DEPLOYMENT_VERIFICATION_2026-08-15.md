# Phase 1 — Static / Local First Deployment 検証記録

**実施日**: 2026-08-14 〜 2026-08-15
**対象 commit**: `59266c8` — `feat(static): relativize asset paths for file:// deployment`
**判定**: **local/static deployment 技術成立性 = PASS**／**end-to-end 業務利用経路 = PASS**／**個別 FAC 完全消化 = PARTIAL**

> **本書の性格**: 本書は **historical evidence（検証記録）** であり、正本ではない。
> 現在の再現可能な build・配布・起動手順の正本は `docs/STATIC_DEPLOYMENT.md`（living SSOT）である。
> 本書の内容と `docs/STATIC_DEPLOYMENT.md` の記述が食い違う場合、常に `docs/STATIC_DEPLOYMENT.md` を優先する。
> 未確認のまま残った FAC の追跡は `prompts/vNext/HANDOFF.md` §6 を正本とする。
> `docs/DEVELOPMENT_STANDARD.md` §7.1 の読み方の規律に従い、本書は「その時点で何を観測したか」の記録として読む。

---

## 1. 検証の目的

`docs/DEVELOPMENT_STANDARD.md` §12.2 が定める Phase 1 完了条件のうち、次を実機で確認すること:

> 「静的版が実際にビルドでき、開発者本人の実務環境で SOAP 生成・検索・多剤合成が動作する」

「開発者本人の実務環境」とは、Owner が実際に勤務する**会社管理 Windows PC**（セキュリティ制御が強い環境）を指す。当初の最大の不確実性は「SOAP Engine が、追加ソフトウェア・管理者権限・local server を必要とせず、この制約された環境で実際の業務利用経路まで成立するか」であった。

## 2. 実測環境（FACT・OWNER OBSERVATION）

| 項目 | 値 | 区分 |
|---|---|---|
| 開発環境 | Mac（`/Users/AdNauseumTendrils/Desktop/soap-engine`） | FACT |
| Windows PC | 会社管理端末。Windows 11 Pro 10.0.26100 | OWNER OBSERVATION |
| PowerShell | Windows PowerShell 5.1、LanguageMode = FullLanguage、ExecutionPolicy 全スコープ Undefined | OWNER OBSERVATION（Stage 2 Step 0 実測。**本検証では未使用**） |
| Node.js / Python | いずれも実体なし（Python は WindowsApps の App Execution Alias スタブのみ） | OWNER OBSERVATION |
| ブラウザ | Edge / Chrome | OWNER OBSERVATION |
| artifact 生成コマンド | `npm run build:static`（Mac 側） | FACT |
| artifact 対象 commit | `59266c8` | FACT |

## 3. 実測された end-to-end route（FACT・OWNER OBSERVATION）

```
Mac development
  → npm run build:static
  → production out/ artifact
  → Windows company PC （USB 等、社内で許可された手段で配置）
  → real file:// launch（out/index.html を Edge/Chrome でダブルクリック起動）
  → SOAP Engine 正常表示
  → 検索（brand / generic）
  → シナリオ選択
  → SOAP 生成
  → 多剤を含む SOAP 生成
  → Express 操作（先発 / GE）
  → Clipboard copy（navigator.clipboard.writeText）
  → Notepad への貼り付け
  → 実際の電子薬歴の入力欄への貼り付け
```

**この経路が実機上で成立したことが、本 Phase 1 Unit で確定した最も重要な事実である。**

### 3.1 意味を限定する（拡張しない）

最後の工程「実際の電子薬歴への貼り付け」が意味するのは、**Clipboard 経由でテキストを電子薬歴の入力欄へ貼り付けることに成功した**という事実のみである。次のいずれの意味へも拡張しない:

- 電子薬歴 API との連携が成立した、という意味ではない
- 電子薬歴への自動書き込みが成立した、という意味ではない
- 電子薬歴とのシステム統合が成立した、という意味ではない
- 全社の Windows PC で動作保証された、という意味ではない（検証したのは Owner の会社PC 1 台のみ）
- SaaS deployment が成立した、という意味ではない（`docs/DEVELOPMENT_STANDARD.md` §12.1 Phase 4 とは無関係）

### 3.2 会社PC側で不要だったもの（FACT・OWNER OBSERVATION）

次のいずれも、実測された起動・利用経路において不要であった:

- PowerShell（Stage 2 Step 0 で LanguageMode 等を read-only 確認したのみで、本番 artifact の起動には未使用）
- local listener（HttpListener / TcpListener）
- localhost server
- listening port
- Node.js
- Python
- 管理者権限

実際に成立した手順は「`out/` 一式を配置し、`index.html` を Edge/Chrome で直接開く」のみである。詳細は `docs/STATIC_DEPLOYMENT.md` を参照。

## 4. Acceptance Criteria 最終結果

### 4.1 FAC（file:// deployment 専用）

| ID | 内容 | 判定 | 根拠区分 |
|---|---|---|---|
| FAC-1 | `npm run build:static` exit 0 | PASS | FACT（Repo実測） |
| FAC-2 | source 完全復元 | PASS | FACT（Repo実測。md5完全一致・diff 0） |
| FAC-3 | root absolute asset path が残らない | PASS | FACT（Repo実測。`src=`/`href=` 絶対パス 0件） |
| FAC-4 | file:// で直接開いて正常表示 | PASS | OWNER OBSERVATION（Windows company PC・production `out/`・real `file://`） |
| FAC-5 | JS/CSS chunk 正常ロード | PASS | OWNER OBSERVATION |
| FAC-6 | persona icon 正常表示 | PASS | OWNER OBSERVATION |
| FAC-7 | 検索・シナリオ・SOAP 生成 | PASS | OWNER OBSERVATION |
| FAC-8 | 多剤合成 | PASS | OWNER OBSERVATION |
| FAC-9 | Express 先発/GE | **PASS** | OWNER OBSERVATION（2026-08-15 追加実測） |
| FAC-10 | Rapid / ADDON | **NOT YET VERIFIED** | Owner 実測なし |
| FAC-11 | raw `{{drug_subject}}` 露出 0 | PASS（間接） | OWNER OBSERVATION（SOAP生成正常の報告）＋ FACT（Mac側代替検証で複数回0件確認） |
| FAC-12 | clipboard | PASS | OWNER OBSERVATION（`writeText()`利用可能・コピー成功） |
| FAC-13 | reload 後も正常 | **NOT YET VERIFIED** | Owner 実測なし |
| FAC-14 | console fatal error 0 | **NOT YET VERIFIED** | Owner 実測なし |
| FAC-15 | 外部ネットワーク通信 0（Windows real file:// 上） | **NOT YET VERIFIED** | Owner 実測なし（FACT側はコード静的解析で外部通信コード0件を別途確認済み） |
| FAC-16 | localhost 配信でも動作 | PASS | FACT（Repo実測。Mac localhost regression） |
| FAC-17 | normal dev/build/Vercel 経路に regression 0 | PASS | FACT（Repo実測） |

### 4.2 三層評価

| 層 | 判定 | 根拠 |
|---|---|---|
| 1. local/static deployment 技術成立性 | **COMPLETE** | §3 の end-to-end route が実機で成立 |
| 2. end-to-end 業務利用経路の成立性 | **COMPLETE** | 同上。電子薬歴貼り付けまで到達 |
| 3. 個別 FAC の完全消化 | **PARTIAL** | FAC-10 / 13 / 14 / 15 が NOT YET VERIFIED |

## 5. NOT YET VERIFIED 項目の扱い

FAC-10（Rapid/ADDON）・FAC-13（reload）・FAC-14（console）・FAC-15（Windows実機でのNetwork外部通信0）は、**推測でPASSへ変更していない**。追跡・再開条件は `prompts/vNext/HANDOFF.md` §6 を正本とする。

## 6. 本書が行っていないこと

- 新しい設計判断の追加
- `docs/DEVELOPMENT_STANDARD.md` §10.3 / `scripts/build-static.js` の Lifecycle 表記変更（別 Unit）
- Phase 1 → Phase 2 の遷移宣言（`docs/DEVELOPMENT_STANDARD.md` §12.2 の文書化 Norm を `docs/STATIC_DEPLOYMENT.md` が満たした後、改めて Owner へ提示する）
- production code の変更
