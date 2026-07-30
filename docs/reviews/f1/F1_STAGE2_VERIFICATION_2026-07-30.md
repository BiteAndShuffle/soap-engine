# F-1 Stage 2 検証記録

**実施日**: 2026-07-30
**Execution Baseline**: `e0fd3ea`（Stage 1 完了時点）
**実装 commit**: `079eba7` — `fix(config): limit no-store to html and cache static assets`
**判定**: **PASS**

本書は Stage 2 の実測結果の記録のみを目的とする。新たな設計・考察は含まない。

---

## 1. 目的

キャッシュヘッダの適用範囲を是正し、長期 immutable cache を `/_next/static/**` のみに限定する。

変更前は `next.config.js` の `headers()` が `source: '/(.*)'` で全経路に `no-store` を適用しており、コンテンツハッシュ付きで内容が不変な静的資産までブラウザキャッシュの対象外になっていた。

**確定済み Owner 判断**: D-F1-2（Stage 2 実施承認）／ D-S2-1（長期キャッシュ対象は `/_next/static/**` のみ・`public/` は含めない）。

---

## 2. 変更内容

変更ファイルは `next.config.js` のみ（1 file changed, 19 insertions(+), 2 deletions(-)）。

`headers()` を 2 ルールに分割した。

| # | source | Cache-Control |
|---|---|---|
| ① | `/_next/static/:path*` | `public, max-age=31536000, immutable` |
| ② | `/((?!_next/static).*)` | `no-store, no-cache, must-revalidate, proxy-revalidate`（＋ `Pragma: no-cache` / `Expires: 0`） |

②に negative lookahead を用いたのは、Next.js がマッチした全ルールのヘッダを適用するため、`'/(.*)'` を残すと①と競合して `Cache-Control` が二重付与されるためである。

`!isStaticExport` の条件分岐は変更していない（静的 export 時は `headers()` が機能しないため従来どおり無効）。

---

## 3. curl 結果

`npm run build` 成功後、`PORT=3111 npx next start` で production サーバーを起動し、`curl -D -` で各経路を個別に確認した（確認後にサーバー停止）。

### 3.1 HTML

```
$ curl -s -D - http://localhost:3111/ -o /dev/null

HTTP/1.1 200 OK
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

**期待どおり `no-store` を維持。**

### 3.2 `/_next/static/**`

```
$ curl -s -D - http://localhost:3111/_next/static/chunks/webpack-6c076a34ac53dfb8.js -o /dev/null

HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
```

```
$ curl -s -D - http://localhost:3111/_next/static/css/3e097291b7fd9fc3.css -o /dev/null

HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
```

**期待どおり長期 cache + immutable。** JS チャンクと CSS の両方で確認した。

### 3.3 `public/`

```
$ curl -s -D - http://localhost:3111/persona-icon.webp -o /dev/null

HTTP/1.1 200 OK
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

**期待どおり長期 immutable cache を付与していない**（D-S2-1）。

### 3.4 Cache-Control の二重付与確認

| 経路 | `Cache-Control` の出現回数 |
|---|---|
| HTML | 1 |
| `/_next/static/chunks/*.js` | 1 |
| `public/persona-icon.webp` | 1 |

**二重付与なし。**

---

## 4. その他の検証

| 検証 | 結果 |
|---|---|
| `npm run build` | 成功 |
| `npm test` | 2,633 tests / 127 suites 全 PASS（回帰なし） |
| `npx tsc --noEmit` | エラーなし |
| `git diff` | `next.config.js` のみ。許可済み既存差分 4 件に変化なし |

---

## 5. 判定

**PASS**

期待結果 4 項目すべてを満たした。

- `/_next/static/**`: 長期 cache + immutable ✅
- HTML: `no-store` を維持 ✅
- `public/`: 長期 immutable cache を付与しない ✅
- build / tests / typecheck: すべて PASS ✅

設計（`docs/reviews/f1/F1_STAGE123_DESIGN_2026-07-30.md` §2）との差異、Next.js の挙動差、既存設定との衝突はいずれも発生しなかった。

---

## 6. 変更していない範囲

`lib/` ／ `app/` ／ `data/` ／ runtime ／ module data ／ search ／ loader ／ manifest ／ `middleware.ts` ／ `public/` 配下のファイル ／ `EXPORT_STATIC` 分岐。Stage 3 以降には着手していない。

---

## 付録: 実測に基づく効果

| | 変更前 | 変更後 |
|---|---|---|
| 初回ロード | HTML 314 KB (gzip) + 静的資産 872 KB | 同じ |
| 2 回目以降 | HTML + 静的資産 872 KB を再取得 | HTML のみ（静的資産はブラウザキャッシュ） |

静的資産の総量は Stage 1 の計測（`npm run measure:payload`）で実測した `.next/static` 合計 892,885 B に基づく。
