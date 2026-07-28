# vNext 半自動実行モード（AUTORUN）

作成日: 2026-06-27
最終更新: 2026-07-26

このファイルは PN1〜PN8 個別プロンプトの上位に位置する「実行制御ルール」です。
各 PN プロンプトの詳細ルールはここに再掲しません。

---

## 目的

- PN1 / PN2 だけ人間承認を残し、PN3A〜PN8 を Claude が自動連続実行する
- Phase 間の承認往復コストを削減してトークン効率を最大化する
- 1 セッションで 2 モジュール完成を目指す

---

## 実行モードの切り替え

### 通常モード（旧来）

PN1 → 承認 → PN2 → 承認 → PN3A → 承認 → ... → PN8 → 承認

### 半自動実行モード（AUTORUN）

PN1 → 承認 → PN2 → 承認 → **PN3A〜PN8 自動連続実行** → RELEASE_OK / RELEASE_HOLD で停止

---

## 各 Phase の実行ルール

| Phase | モード | 完了後の動作 |
|---|---|---|
| PN1 | 手動（承認必須） | 完了報告を出力して停止。ユーザーの承認を待つ。 |
| PN2 | 手動（承認必須） | 完了報告を出力して停止。ユーザーの承認 + AUTORUN 開始指示を待つ。 |
| PN3A〜PN8 | 自動連続実行 | 1 行報告のみ出力して即座に次 Phase を開始する。 |

PN1 / PN2 を承認必須とする理由:
- PN1: 本文凍結の起点。漏れは全 Phase 再実行になる。
- PN2: classKey / nodeKey / risksTemplate は後段で変更不可。

---

## AUTORUN 開始コマンド

PN2 承認後、ユーザーが以下のメッセージを送ることで半自動実行を開始する:

```
PN2 完了を確認しました。承認します。
AUTORUN モードで PN3A〜PN8 を自動実行してください。
moduleId: {moduleId}
```

このメッセージを受け取った Claude は、**PN2 に PENDING が 0 件であることを確認してから** PN3A を開始する。

**PENDING 残存時の動作:**
- `phase2_drug_header.json` に `PENDING` の文字列が残っている場合、AUTORUN を開始しない
- PENDING 項目と確定に必要な情報をユーザーへ報告し、確定を待ってから AUTORUN を開始する

PENDING が 0 件であれば、PN3A から PN8 まで MUST_STOP 条件に該当しない限り停止せずに連続実行する。

---

## 各 Phase の 1 行報告フォーマット

AUTORUN 実行中は、各 Phase 完了後に以下の形式で 1 行のみ報告する:

```
PN3A完了: groupKey {N}件確定。MUST_STOP非該当。PN3Bを開始します。
PN3B完了: {N}シナリオ / {N}addon。PN4Aを開始します。
PN4A完了: {N}件xStructured生成。禁止role非該当。PN4Bを開始します。
PN4B完了: {N}件xStructured生成。禁止role非該当。PN5を開始します。
PN5完了: risks/searchConfig/expressModes/persona生成。PN6を開始します。
PN6完了: {N}行保存。{N}シナリオ全件xStructured注入確認。addon.text/group標準変換適用済み。PN7を開始します。
PN7完了: FAIL 0件 / CHECK 0件 / PENDING 0件 / verdict: PASS。PN8を開始します。
PN8完了: tsc PASS / build PASS。RELEASE_OK。
```

**PN7 に CHECK または PENDING が残る場合の報告フォーマット（PN8 を開始しない）:**
```
PN7完了: FAIL 0件 / CHECK {N}件（{該当項目と内容}）/ PENDING {N}件（{該当項目と内容}）。
人間確認が必要なため停止します。承認が得られ次第 PN8 を実行します。
```
この場合、1 行報告の後で PN8 を自動実行しない。CHECK・PENDING の内容を具体的に提示し、
ユーザーからの明示的な承認（「CHECK は追加漏れとして扱う」等）を得てから PN8 を実行する。

**PN3B の thirdPanelSPlacement 報告ルール:**
- injection module（drug.route = "injection"）の場合: 末尾に `/ thirdPanelSPlacement {N}件確定` を追加する
- injection 以外の module（経口薬・点眼薬等）の場合: thirdPanelSPlacement の記載は省略する。`0件確定` とは書かない。

1 行報告の後、**次 Phase の詳細説明・確認・質問は出力しない**。即座に次 Phase を実行する。

---

## MUST_STOP 条件

以下のいずれかに該当した場合、**即座に実行を停止**し、原因と差し戻し先 Phase を報告する。
自動修正は行わない。

| 条件 | STOP 理由 | Return Phase |
|---|---|---|
| A | PN3B のシナリオ件数が phase1 と不一致 | PN3B |
| B | PN4A/4B で禁止 role 語彙を使用 | 該当 PN4A または PN4B |
| C | xStructured[].text が phase1 テキストに存在しない文字列を含む | 該当 PN4A または PN4B |
| D | PN6 アセンブリ後シナリオ件数が phase3b_meta と不一致 | PN6 |
| E | PN7 で FAIL 項目が 1 件以上 | PN7 が指定する Phase |
| F | tsc FAIL または build FAIL | PN8（ユーザー判断） |
| G | PN6 Write 失敗 / JSON parse 不可 / 件数確認前の異常 | PN6（ユーザー判断） |
| H | phase4a_structured.json が未生成（phase3b_meta を直接更新した） | PN4A |
| I | phase4b_structured.json が未生成（phase3b_meta を直接更新した） | PN4B |
| J | xStructured に `content` フィールドが混入 | 該当 PN4A または PN4B |
| K | persona が phase5_non_scenario.json に欠落 | PN5 |
| L | composition.sMergePolicy が phase2_drug_header.json に欠落 | PN5 |
| M | PN6 が PN5 成果物に存在しない標準構造を独自補完しようとした | PN5 |
| N | PN6 addon.group が標準変換表に従っていない（lifestyle_guidance 等が未変換） | PN6 |
| P | PN7 に CHECK 項目が 1 件でも残る（Z の Addon責務一貫性等） | PN7（ユーザー承認待ち） |
| Q | PN7 監査中、または data/modules/{moduleId}.json 内に未確定の `"PENDING"` 文字列が残存している | 該当 PENDING が発生した元 Phase |

**条件 P の詳細:**
CHECK は ERROR ではなく build 可能な状態だが、AUTORUN は CHECK を FAIL と同様に **PN8 進行のブロッカー**として扱う。

**なぜ AUTORUN でのみ格上げするか**: 通常モードでは各フェーズ完了時に人間が結果を確認するため、CHECK を
「後続工程で確認する」として通しても、その確認が実際に行われる。一方 AUTORUN は PN3A〜PN8 を自動連続実行
するため、CHECK を通すと**誰も確認しないまま RELEASE_OK に到達する**。CHECK は「不確定の公告」であり
（`docs/DESIGN_PRINCIPLES.md` DP-15）、公告を受け取る人間が経路上にいない状態で先へ進めてはならない。
- CHECK の内容（対象 scenario/addon・具体的な差分）をユーザーへ提示する
- ユーザーが「CHECK は問題ない」「追加漏れとして扱う」等、明示的に承認した場合のみ PN8 へ進む
- 承認内容が JSON/bridge の修正を伴う場合（`dm_dpp4_oral` の `se_bullous_pemphigoid_none` 追加漏れ対応が実例）は、
  該当 Phase（多くの場合 PN1 の bridge 追記 + PN6 再アセンブリ、または PN7 直接修正が禁止のため人間指示による最小反映）で
  対応してから PN7 を再実行し、CHECK が解消したことを確認してから PN8 を実行する

**条件 Q の詳細:**
`display.subtitle` の PENDING、`composition.classKey` の PENDING、addon group の PENDING（例: `administration_guidance` の変換先未確定）等、
前工程で発生した PENDING が確定されないまま後工程まで残っている状態を指す。PENDING を検出した場合、
値を推測で埋めて先へ進めてはならない。

**条件記号の採番について（欠番注記）:**
MUST_STOP 条件の記号は **A〜N / P / Q** である。**条件 O は欠番**であり、記号は再採番せず欠番を許容する。
新規条件を追加する場合は、既存記号を再利用せず末尾（R 以降）へ追加すること。
（同種の欠番注記の前例: `docs/DESIGN_PRINCIPLES.md`「DP-06 について（欠番注記）」/ `prompts/RULES.md`「19 について（欠番注記）」）

**条件 G の詳細:**
以下のいずれかに該当した場合、即座に MUST_STOP とする。
- `data/modules/{moduleId}.json` の Write が途中で失敗した
- Write 完了後に JSON parse が通らない
- scenarios 件数 / addons 件数 / xStructured 注入数の確認前に異常が出た

**条件 G 発生時の禁止事項:** `rm data/modules/{moduleId}.json` の自動実行および PN6 の自動再実行は行わない。原因を報告してユーザー指示を待つ。

MUST_STOP 停止時の報告フォーマット:

```
AUTORUN 停止: 条件 {X} に該当
検出 Phase: PN{N}
原因: {具体的な内容}
差し戻し先: PN{N}
対応: ユーザーの指示を待ちます。
```

---

## AUTORUN 終了条件

以下のいずれかで AUTORUN を終了し、ユーザーの指示を待つ:

1. PN8 が `RELEASE_OK` を報告した（正常終了）→ **モジュール終了宣言を出力する（下記参照）**
2. PN8 が `RELEASE_HOLD` を報告した（保留終了 — 原因を明示する）
3. MUST_STOP 条件に該当した（異常停止）

### モジュール終了宣言（RELEASE_OK 時のみ）

PN8 で RELEASE_OK になった場合、Claude は以下の形式で終了宣言を出力して停止する。

```
■ モジュール終了宣言
moduleId:         {moduleId}
release:          RELEASE_OK
final JSON:       data/modules/{moduleId}.json
registry登録:     済み（data/modules/index.ts）
tsc:              PASS
build:            PASS
/tmp キャッシュ:  /tmp/soap-build/{moduleId}/ — 破棄可能（bridge から再生成可能なビルドキャッシュ）

次モジュールへ進む場合は PN1 から開始してください。
```

この宣言の後、ユーザーの指示があるまで次の作業を開始しない。

---

## 1 セッション 2 モジュール実行時の手順

1 モジュール目が RELEASE_OK になったら、続けて 2 モジュール目を開始できる。

```
モジュール A:
  PN1 → 承認 → PN2 → 承認 → AUTORUN（PN3A〜PN8）→ RELEASE_OK

  ★ モジュール A 終了宣言:
  「モジュール A の /tmp/soap-build/dm_module_a/ はビルドキャッシュです。
  モジュール B の PN1 を開始します。」

モジュール B:
  PN1 → 承認 → PN2 → 承認 → AUTORUN（PN3A〜PN8）→ RELEASE_OK
```

終了宣言を明示することで、前モジュールのコンテキストが混入するリスクを防ぐ。

---

## AUTORUN モードでの禁止事項

- MUST_STOP 条件に該当しているのに次 Phase を実行する
- 1 行報告以外の説明・確認・質問を Phase 間で出力する
- PN1 / PN2 をユーザー承認なしで自動実行する
- AUTORUN 開始指示なしに PN3A 以降を自動実行する
- bridge の内容を変更する
- 凍結テキスト（PN1 以降の S/O/A/P/addon text）を変更する
- PN7 に CHECK または PENDING が残っている状態で PN8 を自動実行する（条件 P / Q 参照）
- PN1 で対応表にない P_CLOSING に遭遇した際、followupRef を独自に命名して確定する
