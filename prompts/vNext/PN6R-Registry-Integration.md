# PN6R — Registry Integration（registry 接続・統合ステージング）

## 参照
→ prompts/RULES.md §2 PROHIBITED_UNIVERSAL
→ prompts/RULES.md §3 ERROR / PENDING / CHECK 共通定義
→ docs/IMPLEMENTATION_CHECKLIST.md「新規 canonical module を追加した場合の検証工程」

## 位置づけ

PN6（canonical assembly）の後、PN7（official cross-reference audit）の前に実行する。
目的は、新規 module を **Repository の official validation path（registry 経由の validator / audit / test）へ接続する**ことである。

- **本工程は release ではない。** registry へ登録した時点で module を「release 済み」「稼働済み」とはみなさない。
  release 判定は PN8 が行う
- 名称の `R` は Registry を表す。`A` / `B` の接尾辞（PN3A/3B・PN4A/4B）は同一工程の分割を表すため使用しない

**背景（2026-09 Avarept registry Unit で実証）:** PN6 は canonical を書き出すだけで registry へ登録しない。一方、
PN7 が委譲する official audit script（`scripts/audit-*.ts`）は `data/modules/index.ts` から対象 module を列挙するため、
未登録 module を検証できない。PN8 は未登録を RELEASE_HOLD にするが JSON / コードの修正を禁止しているため、
registry 登録を担当する工程が存在しなかった。本工程はこの責務の空白を埋める。

---

## 入力

- `data/modules/{moduleId}.json`（PN6 完成 JSON。JSON parse 可能であること）
- `data/modules/index.ts`（module registry）
- `package.json` の scripts（`generate:search-manifest` / `audit` / `test`）
- `bridges/{moduleId}.md`（STATUS 確認のみ）

**事前確認:** PN6 が MUST_STOP G（Write 失敗・parse 不可）に該当していないこと。

---

## 責務（実行してよいこと）

### 1. registry 登録

- `data/modules/index.ts` へ、既存 module と同じ pattern で import 1 行と `ALL_MODULES` エントリ 1 行を追加する
- 追加位置は `ALL_MODULES` の**末尾**とする（既存 module の順序と `ALL_MODULES[0]` を変えない）
- 既に登録済み（再生成時など）の場合は変更しない（no-op）

### 2. registry / file parity 確認

- `ALL_MODULES.length` と `data/modules/*.json` の件数が一致すること
- moduleId の重複が 0 件であること
- import 解決エラー・load エラーがないこと
- 機械的担保: `tests/moduleRegistry.test.ts`

### 3. deterministic generated artifact の再生成

- Repository-owned generator で再生成する（例: `npm run generate:search-manifest`。実際のコマンドは `package.json` を確認する）
- **手編集禁止**
- 再生成後、差分が「当該 module の追加分」と「生成 metadata（件数・source hash 等）」に限られることを確認する。
  **既存 module の entry に差分が出た場合は STOP**（unexpected cross-module change）

### 4. official validators を registry 経由で実行

- ModuleValidator / ScenarioValidator / CrossModuleValidator を `ALL_MODULES` 経由で実行する
- 当該 module の **hard error は 0 件**であること
- 当該 module の WARNING は、各件について説明可能であること
  （例: `*_REQUIRED_TAG_UNREACHABLE` は要求タグが `template.reservedHandlingTags` に宣言され、かつ現行 brand の `handlingTags` に存在しないこと）

### 5. `npm test` の FAIL 分類と baseline 更新

`npm test` を実行し、登録によって生じた FAIL を**下記「baseline 責務の 3 分類」のいずれかへ 1 件ずつ分類する**。
分類できない FAIL がある場合は STOP する。「baseline update」として一括りにしない。

---

## baseline 責務の 3 分類

| 分類 | 例 | 更新してよい条件 | Owner Decision |
|---|---|---|---|
| **A. Deterministic generated artifact** | `data/search-manifest.json` | Repository-owned generator で再生成したものに限る。手編集禁止 | 不要 |
| **B. Deterministic corpus expectation** | module 件数 / validator WARNING 件数 / 「〇〇を使う module は存在しない」のような旧 corpus 前提 | 変化理由が既存 contract（validator の定義・DP 等）から**機械的に説明できる**場合のみ。理由と内訳を test 側のコメントに記録し、最小差分で更新する。包括的な再生成・丸ごと置換はしない | 不要（ただし報告必須） |
| **C. Behavioral expectation** | search ranking / frozen search output / golden projection / UI-visible ordering / generic-name heading / 意味上の承認を要する allow-list（例: uiVariant の Amber 許可リスト） | **Owner review 後のみ**。テストを通すためだけに current actual へ更新することは禁止 | **必要**（STOP して提示する） |

- B と C の境界が判断できない場合は C として扱う
- C を提示する際は、変化前後の実測値（例: query ごとの候補列）と、関連する既存 Owner Decision・DP があればその参照を示す

---

## 実行してはならないこと（自動で行わない）

- canonical content の変更（`data/modules/{moduleId}.json`）
- bridge の変更
- runtime logic（`lib/**` / `app/**`）の変更
- search ranking logic の変更
- behavioral expectation（分類 C）の、Owner review を経ない更新
- Owner judgment を要する expected behavior の確定
- 当該 module の登録と無関係な cleanup

---

## STOP 条件

以下のいずれかに該当した場合は STOP し、内容を報告して Owner の指示を待つ（AUTORUN では MUST_STOP R）。

- 当該 module に新しい validator hard error が出た
- canonical content の defect が見つかった（→ 該当 Phase へ差し戻し）
- runtime code の変更が必要になった
- search ranking contract の変更が必要になった
- 説明できない baseline delta がある（分類できない FAIL・説明できない WARNING 増分を含む）
- 新しい医学的判断・新しい UI 上の意味判断が必要になった
- 分類 C の FAIL がある（Owner Decision が必要）
- 当該 module 以外への予期しない差分（unexpected cross-module change）

---

## 出力

Repository の変更は working tree に保持する（commit / push は本工程の責務ではない）。
チャットへ以下を報告する。

```
■ PN6R Registry Integration
module: {moduleId}
registry:            登録済み（追加 / no-op）／ module 数 {before} → {after}
registry parity:     PASS / FAIL
generated artifacts: {再生成したもの}（既存 entry の差分: 0 件 / {N} 件）
validators:          hard error {N} / WARNING {N}（当該 module {N}・説明不能 {N}）
npm test:            fail {N}（分類 A {N} / B {N} / C {N} / 分類不能 {N}）
baseline 更新:       {file: old → new / 理由 / 分類}
Owner review 待ち:   {分類 C の一覧 / なし}

判定: PN7 へ進む / STOP（理由）
```

---

## 次工程へのハンドオフ

- 分類 C が 0 件（または Owner review 済み）、かつ STOP 条件に該当しない場合: PN7 へ進む
- それ以外: STOP。PN7 は開始しない
