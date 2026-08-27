# PN8 — Build / Runtime / Release（ビルド・リリース判定フェーズ）

## 参照
→ prompts/RULES.md §2 PROHIBITED_UNIVERSAL
→ prompts/RULES.md §3 ERROR / PENDING / CHECK 共通定義

## 位置づけ
PN7 の全項目 PASS を確認した後に tsc / build を実行し、release 判定を行う。

---

## 入力

- `/tmp/soap-build/{moduleId}/audit_report.json`（PN7 が書き出した監査結果ファイル）
- `data/modules/{moduleId}.json`（PN6 完成 JSON）

**事前確認:** `audit_report.json` の `verdict` が `"PASS"` であることを確認してから開始する。
`verdict: "FAIL"` の場合はこのフェーズを開始しない。

---

## 責務

### 実行コマンド

#### tsc

```bash
npx tsc --noEmit 2>&1; echo "exit: $?"
```

- `exit: 0` → PASS
- `exit: 1` 以上 → FAIL（エラー内容を全文報告する）

#### npm run build

```bash
npm run build 2>&1 | tail -20
```

- `Compiled successfully` / `Route (app)` 等のビルド成功ログ → PASS
- エラーメッセージ → FAIL（エラー内容を全文報告する）

### module registry 登録確認

```bash
grep "{moduleId}" data/modules/index.ts
```

- 登録済み → PASS
- 未登録 → **RELEASE_HOLD**（`data/modules/index.ts` への登録後に tsc / build を再実行すること）

tsc / build が成功しても registry 未登録ではアプリ上にモジュールが表示されない。
必ず登録確認を tsc より前に実施すること。

### npm test（U-CR1・2026-08-27 追加）

```bash
npm test 2>&1 | tail -20
```

- `fail 0` → PASS
- `fail 1` 以上 → **RELEASE_HOLD**（失敗した test 名を全件報告する）
- `skip` / `todo` / `only` の件数が、直前の baseline（前回 RELEASE_OK 時点の値）から
  **予測外に増えていないこと**も確認する。予測外に増えている場合も RELEASE_HOLD とし、
  増加理由を報告する
- `docs/IMPLEMENTATION_CHECKLIST.md`（「実装後に毎回行う検証チェックリスト」）が
  `npm test（0 fail であること）` を既に無条件項目として定めている。本節はこれを
  PN8 の release gate へ反映するものであり、新しい policy を追加するものではない

**stale generated artifact の remediation**: 新規 module 追加後、`npm test` の RED が
`data/search-manifest.json` 等の生成物 stale 検出（例:
`tests/searchManifestParity.test.ts` の T-3 / `tests/searchCoverage.test.ts`）に
起因する場合がある。この場合の対応は以下の順で行う。PN8 自身が JSON / 生成物を
書き換える工程にはしない。

1. RELEASE_HOLD とし、原因が生成物 stale であることを報告に明記する
2. `docs/IMPLEMENTATION_CHECKLIST.md` の既存 remediation に従い、該当する生成工程
   （例: `npm run generate:search-manifest`）で生成物を再生成する
3. `npm test` を再実行し、PASS を確認する
4. PASS を確認できた時点で PN8 の判定を再開する

### npm run audit（U-CR1・2026-08-27 追加）

```bash
npm run audit 2>&1 | tail -10
```

- 4 系統（addon chain / alias 同期 / 一般名読み到達性 / brand resolution safety）
  すべて PASS → PASS
- いずれか 1 系統でも FAIL → **RELEASE_HOLD**（FAIL 内容を全文報告する）
- `docs/IMPLEMENTATION_CHECKLIST.md` が既に無条件項目として定めている。新規 policy ではない

### npm run test:multi-drug（条件付き・U-CR1・2026-08-27 追加）

無条件 gate にはしない。次のいずれかに該当する場合のみ実行する
（`prompts/PROJECT_CONTEXT.md` Module Expansion guardrail #4 /
`docs/IMPLEMENTATION_CHECKLIST.md`）。

- 新しい薬効領域を追加した場合
- 検索・alias・drug 構造を変更した場合

```bash
npm run test:multi-drug 2>&1 | tail -10
```

- 該当し、`FAIL` が 1 件でもある → **RELEASE_HOLD**
- 該当しない場合は **NOT_APPLICABLE** とする（PASS 扱いにも FAIL 扱いにもしない）

### 配信量の観測（F-1・観測項目）

```bash
npm run measure:payload
```

- 出力値（モジュール数 / ALL_MODULES gzip / 1モジュールあたり平均 / 最大モジュール）を報告に記録する
- **WARN が出ても RELEASE_HOLD にはしない。** 本項目は観測項目であり必須ゲートではない
- WARN のしきい値は**性能限界ではなく**、ロード方式（F-1）の再評価を Owner へ促す警告トリガーである
- 設計根拠: `docs/reviews/f1/F1_ARCHITECTURE_REVIEW_2026-07-30.md` ／
  `docs/reviews/f1/F1_STAGE123_DESIGN_2026-07-30.md` §1

`npm run build` の `First Load JS` は JS バンドルのみの数字であり、
全モジュール JSON（RSC ペイロード）の成長を検知できない。本項目がそれを補う。

### Runtime 確認

以下を確認する:
- 新しい JSON ファイルが `lib/types.ts` の `ModuleData` 型と互換性があること
- `lib/moduleValidator.ts`（存在する場合）が警告・エラーを出力しないこと

moduleValidator が存在しない場合は NOT_CHECKED とする。

### Release 判定

| 条件 | 判定 |
|---|---|
| registry 登録済み + tsc PASS + build PASS + npm test PASS + npm run audit PASS + （該当時）test:multi-drug PASS + PN7 全 PASS | RELEASE_OK |
| 上記 + PN7 NOT_CHECKED のみ残存 | RELEASE_OK_WITH_MONITOR |
| registry 未登録 | RELEASE_HOLD |
| tsc FAIL | RELEASE_HOLD |
| build FAIL | RELEASE_HOLD |
| npm test FAIL（U-CR1） | RELEASE_HOLD（生成物 stale が原因の場合は上記 remediation workflow に従う） |
| npm run audit FAIL（U-CR1） | RELEASE_HOLD |
| test:multi-drug FAIL（該当時のみ・U-CR1） | RELEASE_HOLD |
| PN7 FAIL 残存 | RELEASE_HOLD（PN8 を開始しないこと）|

---

## 出力

```
■ PN8 Build / Runtime / Release

registry登録確認:      PASS / RELEASE_HOLD
tsc:                  PASS / FAIL
build:                PASS / FAIL
npm test:             PASS / FAIL（fail 件数 / skip・todo・only の baseline からの増減）
npm run audit:        PASS / FAIL（4 系統の内訳）
test:multi-drug:      PASS / FAIL / NOT_APPLICABLE
runtime compatibility: PASS / FAIL / NOT_CHECKED
PN7 verdict:           PASS / NOT_CHECKED 残存 / FAIL

Release判定: RELEASE_OK / RELEASE_OK_WITH_MONITOR / RELEASE_HOLD

未コミット差分:
  data/modules/{moduleId}.json（新規 / 更新）
  data/modules/index.ts（registry 登録）

RELEASE_HOLD の場合は原因を明記する。
npm test の FAIL が生成物 stale に起因する場合は、再生成 → 再実行の remediation を
実施したかどうかも明記する。
```

---

## 禁止事項

- JSON / コードを修正しない（修正が必要な場合は原因特定後に該当 Phase に差し戻す）
- PN7 FAIL のまま PN8 を開始しない
- エラーを PENDING に格下げしない
- `--no-verify` など安全チェックをバイパスしない

---

## 次工程へのハンドオフ

PN8 は最終工程であるため、次工程へのハンドオフは存在しない。出力は release 判定および build/runtime 結果として完了する。
