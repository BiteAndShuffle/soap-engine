# Static / Local First Deployment

**本書は Static / Local First（Phase 1）の build・配布・起動手順の正本（living SSOT）である。**

過去の検証経緯・実測値・実施日は正本ではない。検証記録は `docs/reviews/PHASE1_STATIC_DEPLOYMENT_VERIFICATION_2026-08-15.md`（historical evidence）を参照する。本書は「現在、何をすれば動くか」だけを持つ。

Phase の定義・完了条件は `docs/DEVELOPMENT_STANDARD.md` §12 Product Phase Roadmap が正本。本書はその Phase 1 完了条件のうち「配布・起動手順が Repository から再現できる」を満たすための実行手順である。

---

## 1. 対象と目的

開発者本人（Owner）が、会社管理 Windows PC のような**追加ソフトウェアのインストール・管理者権限・セキュリティ設定の変更ができない環境**で、SOAP Engine を実務利用できる状態にする。

**成立している経路**: Mac で静的 build を生成し、成果物一式を対象端末へコピーし、`index.html` を `file://` で直接開く。

**成立していない、または対象外の経路**: PowerShell / local server / listener（HttpListener・TcpListener）/ Node.js / Python の導入 / 管理者権限。これらはいずれも**不要**であり、使用しない。

---

## 2. Build 手順（Mac 側）

```bash
npm run build:static
```

- 内部で `scripts/build-static.js` が `app/page.tsx` の route segment config を静的 export 互換値へ一時的に書き換え、`EXPORT_STATIC=1 next build` を実行し、成功・失敗にかかわらず元の内容へ復元する
- 成果物は `out/` に生成される（`.gitignore` 対象。commit しない）
- 既存の `out/` が残っている場合、内容が古い可能性があるため、build 前に削除してから実行することを推奨する

```bash
rm -rf out
npm run build:static
```

### 2.1 生成後の確認（推奨）

```bash
git status --porcelain -- app/page.tsx   # 空であること（source が完全復元されている）
```

## 3. 配布手順

`out/` フォルダ一式（`index.html` を含む全ファイル）を、対象端末へコピーする。コピー手段（USB・社内ファイル共有等）は、対象端末の所属組織で許可された方法を用いる。

**`out/` は folder ごとコピーする。** `index.html` 単体では動作しない（`_next/` 配下の JS・CSS・`persona-icon.webp` が同一階層に必要）。

## 4. 起動手順（対象端末側）

1. コピーした `out/` フォルダ内の `index.html` を、Edge または Chrome でダブルクリックして開く（`file://` で起動する）
2. これだけで SOAP Engine が動作する

**インストール・管理者権限・ネットワーク接続は不要。**

## 5. 会社PC側で不要なもの

次のいずれも、この deployment model では**必要ない**:

| 項目 | 要否 |
|---|---|
| PowerShell の実行 | 不要 |
| HttpListener / TcpListener | 不要 |
| localhost server / listening port | 不要 |
| Node.js | 不要 |
| Python | 不要 |
| 管理者権限 | 不要 |
| インターネット接続 | 不要（外部通信を行わない） |

この deployment model は「会社のセキュリティ境界を回避する」ものではなく、**会社PCに既に存在し通常ユーザーに許可されている「ブラウザでローカルファイルを開く」という標準操作のみ**で成立する。

## 6. 動作確認済みの機能

Owner による実機確認（`docs/reviews/PHASE1_STATIC_DEPLOYMENT_VERIFICATION_2026-08-15.md` に検証記録あり）:

- 画面の正常表示（CSS / JS ロード・persona icon 表示）
- BUILD バッジ表示（対象 commit と一致することを確認可能）
- brand / generic 検索
- シナリオ選択・SOAP 生成
- 多剤を含む SOAP 生成
- Express（先発 / GE）操作
- Clipboard コピー（Notepad・実際の電子薬歴の入力欄への貼り付け）

**現時点で未確認の項目**（NOT YET VERIFIED。追跡は `prompts/vNext/HANDOFF.md` §6）:

- Rapid / ADDON 操作
- reload 後の再表示
- console fatal error の有無
- 対象端末上での外部ネットワーク通信 0 の実機確認（コード上は外部通信処理自体が存在しないことを確認済み）

## 7. この deployment model の技術的前提

- 静的 export 時（`EXPORT_STATIC=1`）のみ、`next.config.js` が `assetPrefix: '.'` を設定し、`_next/static/**` への参照を HTML 自身のディレクトリからの相対パスにする
- `app/components/Topbar.tsx` の `persona-icon.webp` 参照も、同条件下でのみ相対パスに切り替わる（`NEXT_PUBLIC_EXPORT_STATIC` 環境変数で判定）
- 通常の `npm run dev` / `npm run build`（Vercel 向け）では、この分岐は発火しない。**normal dev / normal build / Vercel 経路への影響はない**
- 患者情報を含むデータの外部送信・永続化は行わない（コード上、`fetch` 等の外部通信手段・`localStorage` 等への保存処理を持たない）

## 8. この文書が対象としないもの

- 電子薬歴との API 連携・自動書き込み・システム統合（未実施・対象外）
- 複数端末・組織全体での動作保証（検証は Owner の会社PC 1 台のみ）
- SaaS / 認証 / 複数ユーザー対応（`docs/DEVELOPMENT_STANDARD.md` §12.1 Phase 3〜4 の対象）

---

## 変更契機

| 区分 | 内容 |
|---|---|
| 起点 | ① build・配布・起動手順が変更された ② `next.config.js` / `Topbar.tsx` の file:// 対応の仕組みが変更された ③ 新たに動作確認された機能、または NOT YET VERIFIED が解消された |
| 更新対象 | 該当する節（§2〜4 は手順変更時、§6 は動作確認状況変更時） |
| 対象外 | 検証の実施日・実施環境の詳細（正本は `docs/reviews/PHASE1_STATIC_DEPLOYMENT_VERIFICATION_2026-08-15.md`）。Lifecycle 状態（正本は `docs/DEVELOPMENT_STANDARD.md` §10.3） |
