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

### Runtime 確認

以下を確認する:
- 新しい JSON ファイルが `lib/types.ts` の `ModuleData` 型と互換性があること
- `lib/moduleValidator.ts`（存在する場合）が警告・エラーを出力しないこと

moduleValidator が存在しない場合は NOT_CHECKED とする。

### Release 判定

| 条件 | 判定 |
|---|---|
| registry 登録済み + tsc PASS + build PASS + PN7 全 PASS | RELEASE_OK |
| registry 登録済み + tsc PASS + build PASS + PN7 NOT_CHECKED のみ残存 | RELEASE_OK_WITH_MONITOR |
| registry 未登録 | RELEASE_HOLD |
| tsc FAIL | RELEASE_HOLD |
| build FAIL | RELEASE_HOLD |
| PN7 FAIL 残存 | RELEASE_HOLD（PN8 を開始しないこと）|

---

## 出力

```
■ PN8 Build / Runtime / Release

registry登録確認:      PASS / RELEASE_HOLD
tsc:                  PASS / FAIL
build:                PASS / FAIL
runtime compatibility: PASS / FAIL / NOT_CHECKED

Release判定: RELEASE_OK / RELEASE_OK_WITH_MONITOR / RELEASE_HOLD

未コミット差分:
  data/modules/{moduleId}.json（新規 / 更新）
  data/modules/index.ts（registry 登録）

RELEASE_HOLD の場合は原因を明記する。
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
