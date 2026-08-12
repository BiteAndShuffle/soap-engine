# IMPLEMENTATION_CHECKLIST.md

SOAP Engine — 実装後に毎回行う標準検証チェックリスト。

このドキュメントには「毎回必ず行う確認」だけを書く。
各チェックの詳細な監査ルールは以下を参照する:
- bridge⇔addonsRef監査の詳細 → `prompts/vNext/PN7-Cross-Reference-Audit.md`
- validatorの役割分担 → `docs/VALIDATOR_STANDARD.md`

---

## 標準チェックリスト

```
□ npx tsc --noEmit
□ npm test（0 fail であること。件数は実行時に再測定し、変更前後で減っていないことを確認する）
□ npm run build
□ npm run audit（addon chain / alias 同期 / 一般名読み到達性 / brand resolution safety の 4 監査。個別実行する場合は下記 4 行を参照）
□ ModuleValidator（対象モジュールが OK / 既存warning件数に変化がないか）
□ CrossModuleValidator
□ scripts/audit-addon-bridge-chain.ts（bridge⇔addonsRef⇔AddonPanel整合。`npm run audit` に含まれる）
□ scripts/audit-alias-bridge-chain.ts（alias系フィールドのbridge⇔JSON同期。`npm run audit` に含まれる）
□ scripts/audit-generic-name-reachability.ts（displayGenericName の読み到達性。`npm run audit` に含まれる）
□ scripts/audit-brand-resolution-safety.ts（BrandResolution の brand/generic 解決安全性。`npm run audit` に含まれる）
□ 検索・alias・drug構造を変更した場合は `npm run test:multi-drug`（buildNodeFields + mergeBlocksによる複数module合成の回帰テスト）を実施する
□ canonical JSON のうち search-manifest の生成対象フィールド（`lib/searchManifest.ts`）を変更した場合は `npm run generate:search-manifest` を実行し、`data/search-manifest.json` を再生成する（手編集禁止。再生成漏れは `npm test` の `tests/searchManifestParity.test.ts` が検出する）
□ 本文（S/O/A/P）のみの修正のはずが、addonsRefに意図しない差分が出ていないか確認する（RULES.md §22）
□ 既知の不整合・warning件数を変更前後で比較する（増減していないか）
□ 実機確認（変更内容に応じて: 検索候補の表示順序 / AddonPanel表示 / SOAP生成結果 等。変更範囲が
  1モジュール・1シナリオ程度の軽微な修正の場合はこの簡易確認で足りる。新規モジュールの
  領域完了時・検索ロジックや matchPolicy 変更時は下記「Runtime / 実機横断確認」を実施する）
□ push後、Vercel Preview のデプロイ成功を確認（GitHub Commit Status API）
```

## 新規 canonical module を追加した場合の検証工程

新規モジュールを 1 件追加したときは、次の順序で機械的に検証できる。

```
canonical JSON を data/modules/ へ追加
  ↓
data/modules/index.ts へ登録（登録漏れは npm test の tests/moduleRegistry.test.ts が検出）
  ↓
npm run audit
  ├ ADDON bridge→JSON→UI chain
  ├ Alias fields bridge⇔JSON
  ├ Generic name reachability          （Q-S1: module への到達性）
  └ Brand resolution safety            （Q-S2: brand/generic 解決の安全性）
        FAIL  → exit 1。module 追加不可。JSON を修正して再実行する
        CHECK → exit 0 だが人間レビューが必要（generic 選択時に gate 対象 ADDON / scenario が減る）
  ↓
npm test（golden projection・BrandResolution 系テストが回帰を検出）
  ↓
npm run build / ModuleValidator / CrossModuleValidator
  ↓
Runtime / 実機横断確認（下記）
```

`npm run audit` の Brand resolution safety が確認するのは、
`brandNames` / `brandCatalog` の構造整合・generic grouping の成立性・generic subject の決定性・
single-brand module の解決安全性・generic `handlingTags` 交差集合による gate タグ脱落の 5 点である。
各 code の意味と FAIL / CHECK の区別は `docs/VALIDATOR_STANDARD.md` §2-B を参照する。

---

## 補足

- 既存の不整合（例: 対応保留中のモジュール）が今回の変更で新たに増えていないかを、変更前後の件数比較で必ず確認する
- worktree で作業した場合、mainブランチ・PRに触れる前に、取り込み先ブランチ（例: `feat/nlp-input-panel-and-new-schema`）へのcherry-pick後も本チェックリストを再実行する

---

## Runtime / 実機横断確認（PN8 完了後の正式工程）

**位置づけ**

```
PN8 完了（RELEASE_OK）
  ↓
Runtime / 実機横断確認
  ↓
Domain Complete
```

PN7（Cross Reference Audit）は JSON 構造の静的整合性を、PN8 は tsc / build を検証するが、
いずれも「実際にアプリを操作した場合の挙動」は検証しない。本工程は PN8 完了後に実施する
正式工程であり、対象領域（ドメイン）の全モジュールが本工程を通過した時点をもって
「Domain Complete」（当該領域の完了）とする。

**実施タイミング**: 新規モジュールの領域完了時、または検索ロジック・matchPolicy を変更した場合
（軽微な1モジュール・1シナリオ修正では上記「標準チェックリスト」内の簡易実機確認で足りる）。

**現在の想定利用環境ではスマートフォン表示・レスポンシブ確認は主要要件ではないため、
本工程の必須チェックには含めない**（別途要件化された場合に追加を検討する）。

### 必須チェック

**検索**
```
□ ブランド名検索（対象モジュールの全ブランド）
□ 一般名検索（対象モジュールの全一般名）
□ かな表記検索
□ 主要な表記揺れ検索（前方一致・部分一致等の想定パターン）
□ 候補件数が期待どおりであること
□ 候補順序が期待どおりであること
□ ブランド名⇔一般名の相互到達性（一方の型で検索した際、対応する他方の型の候補が消えていないか）
□ 適応ラベルの表示（crossModuleIndicationLabel 等、適応ラベルを持つモジュールが対象の場合）
□ 単一モジュール薬（他モジュールと成分・ブランドを共有しない薬剤）への回帰がないこと
```

**シナリオ**
```
□ bridge で意図したシナリオ表示順と、実機のシナリオ一覧表示順が一致すること
□ brand 制御（特定ブランド選択時のみ表示 / 非表示になるべきシナリオ）が意図どおり機能すること
□ handlingTags 制御（scenarioRequiredTags による表示可否）が意図どおり機能すること
```

**SOAP 生成**
```
□ S/O/A/P の生成内容が想定どおりであること
□ {{drug_subject}} が選択薬剤名へ正しく置換されていること
□ PStructured の内容が生成結果へ正しく反映されていること
□ ADDON の表示順（AddonPanel）が bridge の P_ADDON 記載順と一致すること
□ ADDON 選択後、SOAP 本文中の挿入位置が想定どおりであること
□ followup closing（P_CLOSING）が正しく付与されること
□ P 本文と followup closing の文言が重複していないこと
□ persona 切替後の文体変換が正しく機能し、医学的内容が変化していないこと
□ 日本語として不自然な表現がないこと（validator では検出できない領域。人間レビューの対象）
```

**横断機能**
```
□ 多剤合成（対象領域で複数モジュール併用が想定される場合。`npm run test:multi-drug` の実施を含む。
  評価の優先順位は `docs/DESIGN_PRINCIPLES.md` DP-12 を参照 — 継続薬＋新規/変更薬の組み合わせを
  優先し、同一シナリオを複数薬剤へ適用するケースの逐語的重複は主要ユースケースの評価より優先しない）
□ Rapid Mode の動作
□ 既存モジュールへの回帰（今回の変更が意図しない他モジュールへ波及していないか）
```

各チェックの詳細な監査ロジック（構造整合性）は `prompts/vNext/PN7-Cross-Reference-Audit.md` を、
検索候補生成ロジックの設計根拠は `docs/DESIGN_PRINCIPLES.md`（DP-09 / DP-11）を参照する。
matchPolicy の変更に伴う本チェックの実施義務は `prompts/RULES.md` §26 にも定める。
