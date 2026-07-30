# F-1 Architecture Review — 全モジュール配信・ロード構造

**実施日**: 2026-07-29
**Execution Baseline**: `feat/nlp-input-panel-and-new-schema` / HEAD `074cf68` / origin 0-0 / tsc PASS / test 2,633 PASS / build PASS
**Repository 変更**: なし（本レビューは読み取りと計測のみ）
**性格**: 配布形態ごとの Runtime Strategy と Module Data Architecture の設計レビュー。実装・commit は含まない。

---

## 0. 結論の要約

**実測により、当初の「P0 = 帯域が破綻する」という評価は誤りだった。真の制約は 3 つある。**

| 実測 | 値 |
|---|---|
| 初期 HTML（production・実測） | **3,949,946 bytes = 3.76 MB** |
| 同 gzip 転送時（実測） | **326 KB** |
| 現行検索インデックス | 3,363 KB（**全 JSON の 96.1%**） |
| S/O/A/P 本文を除く軽量 manifest（試算） | 308 KB raw / **24 KB gzip**（91.2% 削減） |
| Cache-Control | **`no-store` が `/_next/static/` を含む全経路に適用** |

帯域は gzip で 326 KB に収まる。**F-1 の本質は帯域ではなく、次の 3 点である。**

1. **キャッシュが全経路で無効化されている** — 326 KB が毎回のページロードで再転送され、コンテンツハッシュ付き静的チャンクすら再利用されない
2. **SaaS の商品設計と両立しない** — 全モジュールデータが全クライアントへ無条件で送られるため、モジュール別課金・プラン別提供が構造的に成立しない。**gzip で安価だからこそ「気づかないまま全部配ってしまう」**
3. **パース・メモリコストが線形に増える** — 300 モジュールで 29.3 MB の JSON をページロードごとに解凍・パースする

**そして「Static 版で全モジュールを同梱すること」は欠陥ではない。** オフライン・店舗運用では全同梱が正しい設計である。欠陥は**全形態で同一のロード方式を使っていること**である。

---

## 1. 現状のモジュールロード構造（実測に基づく）

### 1.1 データフロー

```
data/modules/*.json（35 ファイル・実ファイル 4.78 MB）
  ↓  静的 import ×35（data/modules/index.ts）
ALL_MODULES: ModuleData[]（as unknown as ModuleData キャスト ×35）
  ↓  import（app/page.tsx — Server Component / dynamic='force-dynamic'）
assertModuleValid ×35 → assertCrossModuleValid → reportInvalidScenarios
  ↓  <DashboardClient moduleData={...} allModules={ALL_MODULES} />
DashboardClient（'use client'）
  ↓  RSC flight payload としてシリアライズ
初期 HTML に self.__next_f.push() で全モジュールデータが埋め込まれる
```

### 1.2 client / server 境界

**`app/page.tsx` は Server Component（`'use client'` なし）**、**`app/components/DashboardClient.tsx` は Client Component（1 行目 `'use client'`）**。

Server → Client へ `allModules` を prop で渡すため、**全モジュールが RSC ペイロードへシリアライズされ、境界を越える**。

### 1.3 build 成果物への含まれ方（実測）

| 成果物 | サイズ | モジュールデータ |
|---|---|---|
| `.next/server/app/page.js` | **3.6 MB** | **含む** |
| `.next/server` 合計 | 4.7 MB | |
| `.next/static` 合計 | 920 KB | |
| 最大クライアントチャンク | 172 KB | **含まない**（全チャンク 200 KB 未満） |

**クライアント JS バンドルにはモジュールデータが入っていない。** データは server バンドル（3.6 MB）に入り、HTML の RSC ペイロード経由でクライアントへ届く。

### 1.4 初期ロードで実際に送信されるデータ（実測）

```
GET / → 200
Content: 3,949,946 bytes（raw）／ 334,156 bytes（gzip）
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

HTML 内のモジュールデータ出現回数（実測）: `moduleId` 35 回 ／ `SStructured` 1,060 回 ／ `addonsRef` 401 回。**全 35 モジュールの全シナリオが含まれている。**

**静的チャンクも `no-store`**（実測: `/_next/static/chunks/webpack-*.js` に同ヘッダ）。`next.config.js` の `headers()` が `source: '/(.*)'` で全経路に適用しているため。

### 1.5 `allModules` の runtime 用途（全 20 箇所を分類）

| 用途 | 箇所 | 全モジュールを要するか |
|---|---|---|
| **検索インデックス構築** | L166 `allModules.flatMap(buildSearchIndex)` | **要**（全件） |
| **Express 候補構築** | L590 `for (const m of allModules)` | **要**（全件） |
| moduleId による個別解決 | L363 / 466 / 884 / 1009 / 1047 / 1118 / 1268 / 1542（8 箇所） | **不要**（必要時のみ） |

**全件走査は 2 箇所のみ**で、残り 8 箇所は `find(m => m.moduleId === X)` の遅延解決である。**この構造は遅延ロードと原理的に両立する。**

Express 候補が各モジュールから必要とするのは `expressModes` / `scenarios`（id・globalId・title のみ）/ `drug.brandCatalog`（displayName・displayGenericName）であり、**S/O/A/P 本文は不要**である。

---

## 2. 現在の規模と成長特性（実測）

| 項目 | 35 モジュール（実測） | 300 モジュール（線形換算） |
|---|---|---|
| モジュール数 | 35 | 300 |
| JSON 実ファイル | 4.78 MB | 41 MB |
| JSON minified | 3.42 MB | 29.3 MB |
| 初期 HTML raw | **3.76 MB** | **32 MB** |
| 初期 HTML gzip | **326 KB** | **約 2.73 MB** |
| `.next/server/app/page.js` | 3.6 MB | 約 31 MB |
| クライアント JS 最大チャンク | 172 KB | 変化しない見込み |
| 検索インデックス | 1,060 entries / 3,363 KB | 約 9,100 entries / 28.8 MB |
| 1 モジュール平均 | 137 KB minified | — |

**成長特性**: 帯域・パース時間・メモリのすべてがモジュール数に**厳密に線形**。gzip 圧縮率は約 11.8 倍で、フィールド名と日本語表現の反復性が高いため、モジュールが増えても圧縮率はおおむね維持されると見込まれる（むしろ改善する可能性がある）。

**ブラウザメモリ**: `DashboardClient` が `allModules` を prop で保持し、`useMemo` で検索インデックス（3,363 KB 相当のオブジェクトグラフ）を構築するため、**JSON パース後のオブジェクトとインデックスの二重保持**になる。実測はしていないが、JS オブジェクトはシリアライズ表現の 2〜5 倍のヒープを占めるのが一般的であり、300 モジュールでは数百 MB 規模になりうる。

**注意**: `npm run build` の出力は `First Load JS 138 kB` と表示する。これは JS バンドルのみの数字で **RSC ペイロード（データ）を含まない**。標準検証工程ではこの成長を検知できない。

---

## 3. F-1 の問題定義（5 つの関心事の分離）

ご指示に従い、混同しやすい 5 点を分離する。

| # | 関心事 | 現状 | 問題か | 判断 |
|---|---|---|---|---|
| **P-1** | Repository 内に全 JSON が存在する | 35 ファイル・4.78 MB | **問題ではない** | canonical JSON は正本であり、全件が repo にあるのは正しい |
| **P-2** | build 成果物に全 JSON が含まれる | `page.js` 3.6 MB | **形態依存** | Static/Offline では**必要**。SaaS では不要 |
| **P-3** | 初期ロードで全データが転送される | HTML 3.76 MB / gzip 326 KB | **形態依存** | Offline では初回のみで許容。SaaS では毎回転送＋秘匿性の問題 |
| **P-4** | runtime で全データをメモリ保持する | `allModules` + 検索 index | **共通の問題** | 全形態でパース・メモリが線形増加。300 モジュールで顕在化 |
| **P-5** | 静的版と SaaS 版で同じロード方式を使う | 完全に同一 | **これが F-1 の核心** | 要件が正反対の形態に単一戦略を適用している |

### 「全モジュール同梱」と「初期一括ロード」の区別

この 2 つは独立である。

- **全モジュール同梱（P-2）**: build 成果物にデータが入っていること。Offline 運用の前提条件
- **初期一括ロード（P-3）**: 起動時に全件をパース・メモリ展開すること。**同梱していても遅延ロードは可能**

現状は同梱と一括ロードが不可分に結合している（`import` 文が静的だから）。**この結合を解くことが F-1 の技術的中核**であり、同梱をやめることではない。

---

## 4. 配布形態別の要件

| 観点 | Static / Offline（店舗） | SaaS（一般） | Enterprise（将来） |
|---|---|---|---|
| **必要な可用性** | ネットワーク断でも完全動作 | オンライン前提・高可用 | 社内網・可用性は顧客SLA依存 |
| **ネットワーク依存** | **ゼロ**（初回配布後） | 常時 | 社内網のみ／プロキシ経由 |
| **初期表示速度** | ローカル読み込みのみ・最速 | **最重要**（離脱率に直結） | 中（業務利用のため許容度高） |
| **更新方法** | 再配布（手動・パッケージ差し替え） | デプロイで即時全ユーザー反映 | IT 部門の承認を経た計画的更新 |
| **キャッシュ戦略** | 不要（ローカル） | **必須**（現状 no-store で無効） | 社内プロキシ・CDN の考慮 |
| **データ秘匿性** | 端末内に全データ・**ライセンス管理が課題** | **未契約モジュールを送らない必要** | 企業専用モジュールの他社への非露出 |
| **運用複雑性** | 低（配布のみ）だが更新が重い | 中（デプロイ・監視） | **高**（権限・監査・構成管理） |
| **障害時の挙動** | 影響なし | 全停止 → フォールバック設計要 | 社内網障害時の縮退運用要 |

### 形態ごとの示唆

- **Static/Offline**: 全同梱が**正しい**。P-2 は要件そのもの。`middleware.ts` による Basic 認証は `output: 'export'` では無効化される（Next.js 仕様）ため、**ライセンス／アクセス制御を別手段で設計する必要がある**（実測: `next.config.js` の `output:'export'` 分岐と `middleware.ts` の共存）
- **SaaS**: P-3 / P-4 / 秘匿性のすべてが問題化。**manifest 分割が必要**
- **Enterprise**: モジュール構成が顧客ごとに異なりうるため、**build 時にモジュール集合を選択できる仕組み**が前提になる

---

## 5. アーキテクチャ候補の比較

| | A. 現状維持 | B. 形態別 build | C. モジュール単位 dynamic import | D. manifest + chunk 分割 | E. API 経由 | **F. B+D 併用（推奨）** |
|---|---|---|---|---|---|---|
| 内容 | 全静的 import・全形態共通 | Static=全同梱／SaaS=分割 | moduleId から必要分のみ動的 import | 軽量 manifest 初期 + 本文は選択時 | サーバから取得。Static は別経路 | loader 抽象 + 形態別実装 |
| **Static export 対応** | ○ | ○ | △（chunk 分割は動作するが要検証） | ○ | **×**（Static は別経路必須） | ○ |
| **Offline 対応** | ○ | ○ | ○（同梱前提なら） | ○（同梱前提なら） | **×** | ○ |
| **Next.js / Turbopack 整合** | ○ | ○ | △（`import()` は可・`require.context` は webpack 依存で非推奨） | ○ | ○ | ○ |
| **TypeScript 型安全性** | △（`as unknown as` で構造検査を回避） | △ | △（同） | ○（manifest 型を明示定義できる） | ○ | ○ |
| **F-6 registry 整合テストへの影響** | なし | **要改修**（形態別に集合が変わる） | **要改修**（`ALL_MODULES` が静的配列でなくなる） | **要改修**（manifest との突合へ変更） | **要改修** | **要改修** |
| **検索機能への影響** | なし | なし | **大**（全件 index を作れない） | **大**（S/O/A/P 全文検索を失う — §6） | 中 | **大**（同・要 Owner 判断） |
| **多剤合成への影響** | なし | なし | 中（合成対象を動的取得＝await 化） | 中（同） | 中 | 中 |
| **build / deploy 複雑性** | 最低 | 中（2 系統） | 中 | 中 | **高** | 中〜高 |
| **数百モジュール対応** | **×** | △（SaaS 側のみ解決） | ○ | ○ | ○ | ○ |
| **migration コスト** | 0 | 小 | 中 | 中 | 大 | 中（段階化可能） |
| **rollback 容易性** | — | 高 | 中 | **高**（loader 差し替えのみ） | 低 | **高** |
| **SaaS 秘匿性（未契約データ）** | **×**（全件送信） | ○ | ○ | ○ | ○ | ○ |

### 各案の評価

- **A（現状維持）**: 35 モジュールでは実用上の問題はない（gzip 326 KB）。だが SaaS の商品設計と両立せず、300 モジュールで破綻する
- **B（形態別 build）単独**: Static を守れるが、SaaS 側のロード方式を別途決める必要があり、B だけでは解決しない
- **C（dynamic import）単独**: 検索が全件 index を必要とするため、**C だけでは成立しない**。検索が動く前に全件ロードが発生する
- **D（manifest 分割）**: 技術的には最も筋が良い。**ただし §6 の実測により前提条件がある**
- **E（API 経由）**: Static/Offline を原理的に満たせない。SaaS 専用の追加レイヤとしてなら後から載せられる
- **F（B+D 併用）= 推奨**: loader interface を挟み、Static は「全同梱 loader」、SaaS は「manifest + 遅延 loader」を注入する。**canonical JSON・型・Validator・UI を共通に保てる**

---

## 6. 検索データの分離可能性（実装追跡の結果）

### 6.1 検索が実際に参照するフィールド（`lib/search.ts` `buildSearchIndex` L135〜 を追跡）

```
moduleData.moduleId
moduleData.categoryPath
moduleData.display          → title / subtitle
moduleData.drug             → brandNames / nameAliases / drugClass / drugSpecificTags / brandCatalog
moduleData.drug.search      → exactAliases / primaryDisplayName / nameAliases / keywords
                              formulationSearchTokens / matchPolicy / priority
moduleData.scenarios        → title / scenarioGroup / S / O / A / P   ← 本文を含む
```

`brandCatalog` から使うのは `aliases` / `displayGenericName` / `genericKey` / `displayName` のみ。

**参照していないフィールド**: `composition` / `drugResolution` / `regulatory` / `topical` / `template` / `defaults` / `persona` / `addons` / `ui` / `risks` / `searchConfig` / `tagCatalog` / `expressModes` / `moduleVersion`。

### 6.2 決定的な実測 — 現行インデックスは軽量化されていない

```
現行検索インデックス: 1,060 entries / 3,443,202 bytes = 3,363 KB
全モジュール JSON（minified）:        3,584,368 bytes = 3,500 KB
比率: 96.1%
```

**理由**: `SearchEntry.corpusTokens` が `scenario.S / O / A / P` を正規化して保持している（L102-109）。実例:

```json
["glp1受容体作動薬内服初回", "startorchange",
 "{{drugsubject}}は、血糖値が高いため追加となった。",
 "{{drugsubject}}処方",
 "{{drugsubject}}は、血糖こんとろーる不十分のため追加となった。…"]
```

**したがって「検索インデックスだけを送る」案は成立しない。** インデックスは実データとほぼ同サイズである。

### 6.3 軽量 manifest の成立条件と試算

S/O/A/P 本文を manifest から除外した場合（`scenarios` は id / globalId / title / scenarioGroup のみ保持）:

| | raw | gzip |
|---|---|---|
| 軽量 manifest（35 モジュール） | 308 KB | **24 KB** |
| 全 JSON（35 モジュール） | 3,500 KB | 326 KB |
| **削減率** | **91.2%** | **92.6%** |
| 軽量 manifest（300 モジュール換算） | 2,640 KB | **207 KB** |
| 全 JSON（300 モジュール換算） | 29.3 MB | 2.73 MB |

### 6.4 失われる機能の正確な範囲

S/O/A/P を manifest から外すと、次の検索経路が失われる。

- `scoreEntry`（L362）の最終行 `if (entry.corpusTokens.some(t => t.includes(q))) return 1` — **スコア 1（最下位）のフォールバック一致**
- 経路: `getDrugSuggestions`（L679）→ `scoreEntryAND`（L712）→ `scoreEntry`（L458）→ 上記。**UI から到達可能な実機能である**

失われないもの: exactAlias 完全一致（6）／primaryDisplayName 完全一致（6）／alias 完全一致（5）／alias 前方一致（4）／label 前方一致（2）／alias 部分一致（2）／label 部分一致（1）。**主要スコア帯はすべて manifest 内のフィールドで賄える。**

また `filterTemplates`（L1196・`corpusTokens` を使用）は **`app/` `tests/` から一切参照されていない**（実測）。後方互換エクスポートのみであり、SOAP 本文検索の実質的な利用点は上記スコア 1 のみである。

**Owner 判断事項**: 「SOAP 本文の語で薬剤を検索できる」機能を維持するか。維持する場合、manifest とは別に本文インデックスをサーバ側検索（SaaS）または遅延ロード（Static）で提供する設計が必要になる。

---

## 7. Static 版と SaaS 版の共通化境界

| レイヤ | 共通化可否 | 根拠 |
|---|---|---|
| **canonical JSON** | **完全共通** | 正本は 1 つ（DP-07）。形態で内容を変えない |
| **TypeScript types** | **完全共通** | `ModuleData` は形態非依存 |
| **Validator** | **完全共通** | `moduleValidator` / `crossModuleValidator` は build 時実行。形態非依存 |
| **search manifest** | **完全共通**（生成物） | 同一の生成ロジックから両形態で生成 |
| **module registry** | **要抽象化** | 現状 `ALL_MODULES: ModuleData[]`（静的配列）。形態別に「全件」「manifest のみ」が変わるため、**registry の型を変える必要がある** |
| **loader interface** | **要新設・ここが境界** | `getModule(moduleId): Promise<ModuleData>` 相当の抽象。Static は同梱から同期解決、SaaS は fetch |
| **cache layer** | **形態別** | Static は不要、SaaS は必須 |
| **UI** | **完全共通**（loader が await 化すれば） | `DashboardClient` の 8 箇所の `find` を loader 呼び出しへ置換 |
| **build configuration** | **形態別** | `next.config.js` の `EXPORT_STATIC` 分岐を拡張 |

**境界は「loader interface」に置くのが最適である。** これより上（UI・型・Validator・canonical JSON・manifest 生成）を共通に保ち、これより下（実際の取得方法・キャッシュ・build 設定）を形態別にする。

---

## 8. セキュリティと商品設計への影響

> 認証・課金システムの実装設計には踏み込まない。F-1 が商品設計に与える構造的制約のみを整理する。

| 論点 | 現状の構造 | F-1 後に可能になること |
|---|---|---|
| **無料／有料モジュール制御** | **不可能**。全モジュールが全クライアントへ送られる | manifest に「契約範囲」を反映し、本文は契約者にのみ配信 |
| **契約プラン別の利用可能モジュール** | **不可能**（同上） | プラン別 manifest の生成／サーバ側フィルタ |
| **未契約データをクライアントへ送らない** | **達成できていない**。gzip 326 KB で全件が届く | manifest = メタデータのみ、本文 = 認可後に取得 |
| **オフライン店舗版のライセンス管理** | **未設計**。`output:'export'` では `middleware.ts` が無効化されるため Basic 認証も効かない | 別手段（ライセンスキー・期限付きパッケージ等）を要設計。**F-1 とは別課題として切り出すべき** |
| **将来の企業専用モジュール** | **不可能**。全社に全モジュールが届く | build 時にモジュール集合を選択（案 B）＋ manifest 分離 |

### 重要な指摘

**gzip で 326 KB に収まることは、この問題を見えにくくしている。** 帯域面では「全部送っても安い」ため、パフォーマンス指標だけを見ていると問題として浮上しない。しかし**商品設計上は、有料コンテンツを全ユーザーに配布している状態**である。

現在 35 モジュールすべてが同一の扱いであり、課金・プラン設計が始まっていないため実害は出ていない。**ただしサブスクリプション提供を前提とする以上、これは公開前に解消すべき制約である。**

なお、`middleware.ts` が静的 export で無効化される点は、Static 版のアクセス制御に関わる**独立した設計課題**である。F-1 のスコープに含めるかは Owner 判断とし、本レビューでは事実の記録にとどめる。

---

## 9. 推奨方針

### 9.1 今すぐ変更すべきこと（低コスト・高効果）

| # | 内容 | 理由 |
|---|---|---|
| **R-1** | **配信量の可視化を検証工程へ追加**（`.next/server/app/page.js` サイズと初期 HTML の raw / gzip サイズを PN8 または IMPLEMENTATION_CHECKLIST の確認項目にする） | 現状 `npm run build` の `First Load JS` はデータを含まないため成長を検知できない。**着手判断のタイミングを逃さないために最優先** |

**R-1 のみを「今すぐ」とする。** 構造変更は次段階以降で足りる。

### 9.2 初回公開前に必要なこと

| # | 内容 | 理由 |
|---|---|---|
| **R-2** | **キャッシュヘッダの見直し** — `no-store` の適用範囲を HTML に限定し、`/_next/static/**`（コンテンツハッシュ付き・不変）を長期キャッシュ対象にする | 現状は静的チャンクも毎回再取得。**設計意図（Vercel CDN が HTML をキャッシュしないよう強制）は HTML に限定して達成できる** |
| **R-3** | **loader interface の導入**（振る舞いは変えない） | 後続すべての前提。この段階では Static も SaaS も「全同梱 loader」を使い、外部挙動は不変 |

### 9.3 SaaS 化時に必要なこと

| # | 内容 |
|---|---|
| **R-4** | **manifest 生成の実装**（案 D）— build 時に軽量 manifest を生成。gzip 24 KB |
| **R-5** | **配布形態別 build**（案 B）— `EXPORT_STATIC` 分岐を拡張し、Static=全同梱 loader / SaaS=manifest + 遅延 loader |
| **R-6** | **未契約モジュールを送らない配信**（§8）— manifest の契約範囲反映 |

### 9.4 モジュール数が増加した時に必要なこと

| # | 内容 | 着手しきい値の目安 |
|---|---|---|
| **R-7** | manifest 自体の分割（診療領域別など） | manifest gzip が 200 KB を超えたとき（=約 300 モジュール） |
| **R-8** | 検索の narrowing 判断（S/O/A/P 全文検索の扱い） | §6.4 の Owner 判断が必要になった時点 |
| **R-9** | Express 候補の遅延化 | 現状 L590 で全件走査。manifest 内のフィールドで賄えるため R-4 でほぼ解決する見込み |

### 9.5 今は変更しないこと

| # | 内容 | 理由 |
|---|---|---|
| **N-1** | **案 C（dynamic import）を単独で入れる** | 検索が全件 index を要するため単独では成立しない |
| **N-2** | **案 E（API 経由）を先に入れる** | Static/Offline を原理的に満たせない。SaaS 専用の追加レイヤとして後から載せる |
| **N-3** | **Static 版の全同梱をやめる** | オフライン運用の要件そのもの。**変更しないことが正しい** |
| **N-4** | **`as unknown as ModuleData` キャストの解消** | F-4b（persona 補完）完了が前提条件 |
| **N-5** | **オフライン版ライセンス管理の設計** | F-1 とは独立した課題。別途扱う |
| **N-6** | **現在の警告 20 件** | F-1 とは無関係。混同しない |

---

## 10. 段階的 migration 案（推奨案 F の実行計画）

### Stage 1 — 計測の常設化（R-1）

| 項目 | 内容 |
|---|---|
| **変更対象** | `prompts/vNext/PN8-Build-Runtime-Release.md` または `docs/IMPLEMENTATION_CHECKLIST.md` に確認項目を 1〜2 行追加 |
| **compatibility** | 完全（文書のみ） |
| **テスト** | 不要（Q-3 相当。文書のみ） |
| **rollback** | 該当行の削除 |
| **完了条件** | build 後に `page.js` サイズと初期 HTML の raw / gzip が記録される運用になっている |

### Stage 2 — キャッシュヘッダの範囲限定（R-2）

| 項目 | 内容 |
|---|---|
| **変更対象** | `next.config.js` の `headers()` — `source: '/(.*)'` を HTML 向けに限定し、`/_next/static/:path*` へ `immutable` を付与 |
| **compatibility** | 外部挙動は HTML について不変。静的資産のみキャッシュされる |
| **テスト** | `npm run build` + 実機で HTML と静的チャンクのヘッダを個別確認 |
| **rollback** | `next.config.js` 1 ファイルの revert |
| **完了条件** | HTML は `no-store`、`/_next/static/**` は長期キャッシュ。実機で両方を確認 |

### Stage 3 — loader interface の導入（R-3・振る舞い不変）

| 項目 | 内容 |
|---|---|
| **変更対象** | 新規 `lib/moduleLoader.ts`（`getModule` / `listModules` / `getSearchManifest` の抽象）。`app/page.tsx` と `DashboardClient` の `find` 8 箇所を loader 経由へ置換 |
| **compatibility** | **この段階では全同梱 loader のみ実装**し、同期解決を維持する。UI・検索・多剤合成の挙動は完全不変 |
| **テスト** | `npm test`（2,633 件）全 PASS 維持 ／ `tsc` ／ `build` ／ 実機で検索・シナリオ選択・SOAP 生成・多剤合成 |
| **rollback** | loader を経由しない元の実装へ revert（差分が局所的なため容易） |
| **完了条件** | 全テスト PASS・実機回帰なし・`allModules` の直接参照が loader 経由に統一されている |

### Stage 4 — manifest 生成（R-4）

| 項目 | 内容 |
|---|---|
| **変更対象** | 新規 manifest 生成スクリプト ／ `lib/search.ts` の index 構築を manifest 入力へ対応 ／ 型定義追加 |
| **compatibility** | manifest から構築した index が現行 index と**同一の検索結果を返すこと**を回帰テストで担保。S/O/A/P スコア 1 の扱いは Owner 判断（§6.4）に従う |
| **テスト** | 既存 `tests/search.test.ts`（545 行）・`tests/genericIntegration.test.ts`（940 行）が PASS すること。**manifest 版と全件版の検索結果一致テストを新設** |
| **rollback** | loader を全同梱版へ戻すだけ（manifest 生成は残しても無害） |
| **完了条件** | 検索結果の同一性が機械的に検証されている |

### Stage 5 — 配布形態別 build（R-5）

| 項目 | 内容 |
|---|---|
| **変更対象** | `next.config.js` ／ `package.json` の script ／ loader の形態別実装 |
| **compatibility** | Static ビルドは現状と完全に同一の成果物を出すことを確認（**全同梱を維持**） |
| **テスト** | 両形態で `build` ＋ 実機確認。Static は `EXPORT_STATIC=1` 経路（現在 Future Expansion） |
| **rollback** | script と config の revert |
| **完了条件** | Static / SaaS 双方が独立にビルド・動作し、canonical JSON・型・Validator が共通のまま |

**Stage 1〜3 は挙動を変えない。** リスクは Stage 4 以降に集中する。Stage 3 まで進めておけば、SaaS 化のタイミングで Stage 4-5 を実施できる。

---

## 11. Repository 影響範囲（想定・本レビューでは変更しない）

### 変更が想定されるファイル

| ファイル | Stage | 内容 |
|---|---|---|
| `prompts/vNext/PN8-Build-Runtime-Release.md` または `docs/IMPLEMENTATION_CHECKLIST.md` | 1 | 配信量の確認項目追加 |
| `next.config.js` | 2, 5 | キャッシュヘッダ範囲、形態別 build 分岐 |
| `app/page.tsx` | 3 | `ALL_MODULES` 直接参照 → loader 経由 |
| `app/components/DashboardClient.tsx` | 3 | `allModules` の `find` 8 箇所 → loader 経由。`useMemo` 依存配列の見直し |
| `data/modules/index.ts` | 3 | registry 型の抽象化（`ALL_MODULES` の位置づけ変更） |
| `lib/search.ts` | 4 | manifest 入力対応 |
| `tests/moduleRegistry.test.ts` | 3 or 4 | **F-6 の整合テストは registry 型変更で改修が必要**（現在 `ALL_MODULES.length` と FS を突合） |
| `package.json` | 5 | 形態別 build script |
| `docs/DEVELOPMENT_STANDARD.md` §3 | 3〜5 | アーキテクチャ記述の更新（U5 で入口層・配信設定を追加済みの箇所） |

### 新規が想定されるファイル

| ファイル | Stage | 内容 |
|---|---|---|
| `lib/moduleLoader.ts` | 3 | loader interface と全同梱実装 |
| `lib/moduleManifest.ts`（型） | 4 | manifest の型定義 |
| `scripts/generate-manifest.ts` | 4 | build 時 manifest 生成 |
| `tests/moduleLoader.test.ts` | 3 | loader の契約テスト |
| `tests/searchManifestParity.test.ts` | 4 | manifest 版と全件版の検索結果一致 |

### 影響を受けない領域

`bridges/` ／ `data/modules/*.json`（canonical JSON 自体）／ `lib/moduleValidator.ts` ／ `lib/crossModuleValidator.ts` ／ `lib/buildSoap.ts` ／ `lib/applyPersona.ts` ／ 医学的内容。

---

## 12. Owner 判断が必要な事項

### D-F1-1【最重要】SOAP 本文検索の扱い

現在、SOAP 本文（S/O/A/P）の語で薬剤を検索できる（スコア 1・最下位フォールバック）。これが軽量 manifest の成立を妨げている唯一の要因である。

| 選択肢 | 内容 | 影響 |
|---|---|---|
| **(a)** | **本文検索を manifest から外す**（推奨候補） | manifest gzip 24 KB が成立。本文の語による薬剤検索を失う |
| (b) | 本文検索を維持し、別インデックスを遅延ロード | 機能維持。設計・実装コスト増 |
| (c) | 本文検索を SaaS ではサーバ側検索に移す | 機能維持・秘匿性も両立。Static では別実装が必要 |

### D-F1-2 キャッシュヘッダの変更可否

`no-store` は「Vercel Edge/CDN がレスポンスをキャッシュしないよう強制」する意図で導入されている（`next.config.js` コメント）。

| 選択肢 | 内容 |
|---|---|
| **(a)** | HTML のみ `no-store`、`/_next/static/**` は長期キャッシュ（推奨候補） |
| (b) | 現状維持（全経路 `no-store`） |
| (c) | 全面的にキャッシュ戦略を再設計 |

### D-F1-3 F-1 のスコープに含める範囲

| 選択肢 | 内容 |
|---|---|
| **(a)** | Stage 1〜3 のみを F-1 とし、Stage 4-5 は SaaS 化フェーズへ（推奨候補） |
| (b) | Stage 1〜5 を F-1 として一括 |
| (c) | Stage 1〜2 のみ（計測とキャッシュ）で F-1 を閉じ、loader は別工程 |

### D-F1-4 Static 版のアクセス制御

`output: 'export'` では `middleware.ts`（Basic 認証）が無効化される。

| 選択肢 | 内容 |
|---|---|
| **(a)** | F-1 のスコープ外とし、別課題として起票（推奨候補） |
| (b) | F-1 に含めて設計する |
| (c) | 現時点では扱わない（Static 版の公開まで保留） |

### D-F1-5 Enterprise 形態の設計を今扱うか

| 選択肢 | 内容 |
|---|---|
| **(a)** | 案 B（形態別 build）が Enterprise の前提条件を満たすことのみ確認し、詳細設計は将来へ（推奨候補） |
| (b) | 今回 Enterprise 要件も含めて設計する |

---

## 付録: 本レビューで実施した計測

| 計測 | 方法 |
|---|---|
| 初期 HTML サイズ | `next start`（port 3101）へ `curl` — raw / gzip 両方 |
| キャッシュヘッダ | `curl -D -` で HTML と `/_next/static/chunks/*.js` 個別に確認 |
| build 成果物 | `rm -rf .next && npm run build` 後に `du` で server / static 別に測定 |
| クライアントチャンクのデータ有無 | 全 `.next/static/**/*.js` に対し `SStructured` を grep |
| JSON サイズ | 全 35 ファイルを `JSON.parse` → `JSON.stringify` で minified 化して比較 |
| 検索インデックス | `buildSearchIndex` を全モジュールへ適用し `JSON.stringify` のバイト長を測定 |
| 軽量 manifest | S/O/A/P を除いた構造を生成し raw / gzip を測定 |
| 検索参照フィールド | `lib/search.ts` L135-340 を読み、`moduleData.*` 参照を全数抽出 |
| SOAP 本文検索の到達性 | `getDrugSuggestions` → `scoreEntryAND` → `scoreEntry` の呼び出し経路を追跡 |
| `allModules` 用途 | `DashboardClient.tsx` の全 20 箇所を分類 |

**Repository への変更・commit・push は行っていない。** 計測のため一時的に `.next` を再生成し、`next start` を起動・停止した（いずれも成果物ディレクトリと一時プロセスのみ）。
