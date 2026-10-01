# Cold-Start Recovery Drill 検証記録

**実施日**: 2026-10-01
**判定**: **Drill 1 = PARTIAL / REPOSITORY CURRENT STATE UNOBSERVED**／**Drill 2 = PASS**

---

## 0. 本記録の性格

本記録は**時点付きの verification record** である。

| 項目 | 内容 |
|---|---|
| **時点** | 2026-10-01 時点の historical verification record。current contract ではない |
| **正本ではない** | Repository・current contract・Owner Decision より上位の正本ではない。食い違う場合は常に Repository の現状と living SSOT が優先する（`docs/DEVELOPMENT_STANDARD.md` §7.1 の読み方の規律に従う） |
| **権限を生まない** | 新しい設計ルールや実行権限を導出しない |
| **複製しない** | Current Focus そのものを正本として複製しない |
| **時点依存の値** | 本記録に現れる時点依存の値は、2026-10-01 時点の historical observation としてのみ扱う |
| **current state の扱い** | current state は、将来の cold-start 時に Repository から再実測する |

---

## 1. 目的・検証対象

2026-10-01 に整備した continuity / BCP contract について、次を実地確認した記録である。

> 旧チャットを失った新規 ChatGPT が、Repository だけから安全に現在位置を復元できるか

基準となった remote Repository:

| 項目 | 値 |
|---|---|
| Repository | `BiteAndShuffle/soap-engine` |
| branch | `feat/nlp-input-panel-and-new-schema` |
| Drill 2 時点の remote HEAD | `54ce9532a40a09042487e459ce6c7b2215aab990` |

---

## 2. Drill 1 — PARTIAL

**条件**: 旧チャットの内容を前提にせず、新規 ChatGPT で recovery を実施した。**Repository への direct access は明示しなかった。**

**観測した事実**

- Project Files 上の historical 資料は参照できた
- remote Repository の current state は直接観測できなかった

**新規 ChatGPT の挙動**

- historical record を Current Fact へ昇格しなかった
- branch / HEAD / Current Focus / module / STATUS 等を「未観測」とした
- 実装、PN、commit 等へ進まず STOP した

**conclusion**: `PARTIAL / REPOSITORY CURRENT STATE UNOBSERVED`

**この drill で機能した安全機構**

- 推測禁止
- historical / current 分離
- 未観測の明示
- STOP 境界

---

## 3. Drill 2 — PASS

**条件**: 新規 ChatGPT に、GitHub remote Repository を直接参照するよう明示して再試験した。

**読込経路**: `CLAUDE.md` → `prompts/vNext/STARTUP_PROMPT.md` → STARTUP_PROMPT 指定の Base documents

**2026-10-01 時点の historical observation**（Drill 2 で復元された内容。current state ではない）

| 項目 | 復元結果（2026-10-01 時点） |
|---|---|
| Current Phase | Phase 1 — Static / Local First |
| Current Focus | Module Expansion — 点眼領域 |
| canonical 未作成 bridge の候補 | `cataract_pirenoxine_eye_drops` |
| 当該 bridge の STATUS | `FROZEN_FOR_PN1` |
| Owner Decision 待ち | なし |
| Fact follow-up | P-3 / P-4 / P-5 |
| canonical | なし |
| registry | 未登録 |
| 次工程の候補 | PN1 |

**remote 環境から観測不能として保持したもの**

- local working tree
- staged / unstaged
- untracked
- local HEAD
- tracking HEAD
- local ahead / behind
- 未 push の commit
- 未 commit の変更
- `/tmp/soap-build`
- local の test / audit / build 結果

**PN1 は自動開始せず STOP した。**

**conclusion**: Cold-start recovery drill PASS

> 旧チャットなし + GitHub remote Repository + continuity 文書

だけで、新規 ChatGPT が現在位置を安全に復元し、PN1 を自動開始せず STOP できたことを確認した。

---

## 4. 本記録から導出しないもの

- bridge 件数・canonical 件数などを、将来の Current Fact として固定しない
- `cataract_pirenoxine_eye_drops` を、将来も current module とみなさない
- PN1 を自動開始する権限を与えない
- GitHub access が常に存在すると仮定しない
- current contract の変更を、本記録自体から自動導出しない

---

## 5. Follow-up

今回の drill から判明した改善候補については、別途 Opus による read-only BCP audit で評価する。本記録では改善策を確定しない。
