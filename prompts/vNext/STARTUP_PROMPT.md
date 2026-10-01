# SOAP Engine — 読込経路の正本（新規チャット起動プロンプト）

version: 2.1
最終更新: 2026-10-01（現在状態の再構成手順を追加）
対象: SOAP Engine に対するすべての作業

## Purpose

このファイルは、**新規チャットセッションで何をどの順に読むかを決める唯一の正本**である。

読込経路を複数箇所で重複管理しない。`prompts/PROJECT_CONTEXT.md` は現在地、
`docs/DEVELOPMENT_STANDARD.md` §7 Documentation Map は文書地図であり、
いずれも読込順序の正本ではない。

**入口ファイル（`CLAUDE.md` / `README.md`）は本ファイルを指す 1 行の pointer のみを持つ。**
Repository を初めて開く AI・開発者がこのファイルへ到達するための経路であり、
Base / Overlay の内容を複製しない。したがって「何を読むか」の定義は本ファイルにのみ存在する。

## When to use

SOAP Engine に対する作業を新規チャットで開始するとき（作業種別を問わない）。

## 本ファイルの責務

| 本ファイルが持つもの | 本ファイルが持たないもの |
|---|---|
| Base の構成と読込順序 | 個別の設計規則（→ 各正本文書） |
| 工程段階 Overlay | 判断基準の本文（→ 各正本文書） |
| 対象概念 Overlay | 現在のフェーズ・進捗（→ `prompts/PROJECT_CONTEXT.md`） |
| Overlay の運用規則 | 文書の索引（→ `docs/DEVELOPMENT_STANDARD.md` §7） |
| vNext module 生成時に必要な起動情報 | 工程の実行手順（→ 各 PN ファイル） |
| 現在状態の再構成手順（何を実測し、どう判定するか） | 時点依存の値そのもの（branch・HEAD・module 状態・test/audit 結果。毎回実測する） |

**各正本文書の本文を本ファイルへ複製しない。** 本ファイルは「どこを読むか」だけを示す。

## 変更契機

（本節の要素・原則は `docs/DEVELOPMENT_STANDARD.md` §11 が定める）

**起点**: 次のいずれかを行ったとき、本ファイルは古くなる。

- Base の構成または読込順序を変更した
- 工程段階 Overlay を追加・削除・変更した
- 対象概念 Overlay を追加・削除・変更した
- Overlay のトリガー条件を変更した
- Overlay の運用規則（判定順序／複数該当時／途中判明時／未該当時）を変更した
- 「現在状態の再構成」の実測項目または判定規則を変更した

**更新対象**

- 本ファイルの該当節（Base ／ Overlay 表 ／ Overlay の運用規則）
- 新しい正本文書を Overlay へ追加した場合のみ、`docs/DEVELOPMENT_STANDARD.md` §7
  Documentation Map に当該文書が登録済みかを確認し、未登録なら同一作業内で登録する
- `prompts/PROJECT_CONTEXT.md` および `docs/DEVELOPMENT_STANDARD.md` §0 — 本ファイルの
  **パス・名称・「読込経路の正本」という責務**を変更した場合のみ、両文書の参照と責務説明を
  同一作業内で更新する。**Base / Overlay の構成やトリガー内容だけを変更した場合は更新しない**

**対象外**

- 各 Overlay が指す正本文書の本文（本ファイルは経路のみを決め、内容には関与しない）
- `prompts/vNext/PN1-Text-Extraction.md` 〜 `PN8-Build-Runtime-Release.md` ／
  `prompts/vNext/AUTORUN.md`（工程の実行手順であり、読込経路の変更では古くならない）

**検証**

- Base / Overlay 表が指すすべてのパスが実在すること
- 「何を読むか」を定義する記述が本ファイル以外に存在しないこと
- Overlay 表へ新規追加した正本が Documentation Map に登録されていること

**停止条件**

- Overlay の分割単位（工程段階／対象概念の 2 層）を変更する必要が生じた
- Base の収録基準を満たさない文書を Base へ入れる必要が生じた
- `prompts/RULES.md` と `docs/JSON_STANDARD.md` の境界（OD-R2）が確定し、
  Base における `prompts/RULES.md` の読込範囲（§1〜§3）を再判断する段階に到達した
  → 自己判断で変更せず、Owner 判断を得る

**採用理由**

読込経路の一本化以前、「何を読むか」が本ファイル・`prompts/PROJECT_CONTEXT.md`・
`docs/DEVELOPMENT_STANDARD.md` §0 の 3 文書で異なる形に定義されていた。一本化後も、
Overlay 追加時に Documentation Map への登録漏れが起きると、正本が存在するのに
到達経路のない状態が再発する。

## Design Principles

- **Base + Overlay**（全作業共通の前提のみを Base に置き、条件付きで必要な正本を Overlay で読む）
- **phase loading**（該当する分だけを、必要になった時点で読む）
- **token efficiency**

`{moduleId}` は対象 bridge の moduleId に置換してから使用する。

---

## テンプレート本文（ここから下を新規チャットに貼り付ける）

SOAPエンジン開発を継続します。

まず会話履歴は参照せず、必ずリポジトリ内のファイルを正本として読み込んでください。

■ Base（すべての作業で読む。順序厳守）

```
1. docs/DEVELOPMENT_STANDARD.md   — 全文（§10.2〜§10.5 を除く）
2. prompts/PROJECT_CONTEXT.md     — 全文
3. prompts/RULES.md               — §1〜§3 のみ
```

`prompts/RULES.md` の §4 以降は横断ルール辞書である。通読せず、必要になった節のみ随時参照する。

順序には意味がある。

- 1 → 2 : 地図と正本関係を先に把握しないと、`PROJECT_CONTEXT` の記述を正本と誤認する
- 2 → 3 : `RULES` §3 の ERROR / PENDING / CHECK は、いまどの工程にいるかで適用が変わる
- 1 → 3 : `RULES` §1 の参照許可パスは Documentation Map と整合する

■ 工程段階 Overlay（着手する段階が決まった時点で、該当分のみ読む）

一括で読み込まない。

| 段階 | 読み込む文書 |
|---|---|
| vNext module 生成に着手するとき（`bridges/{moduleId}.md` を起点に canonical JSON を生成・改修する） | prompts/vNext/HANDOFF.md（**PN1 より前に読む**） |
| PN1開始 | prompts/vNext/PN1-Text-Extraction.md |
| PN2開始 | prompts/vNext/PN2-Drug-Header.md |
| PN3開始 | prompts/vNext/PN3A-Scenario-Classification.md → prompts/vNext/PN3B-Scenario-Metadata-Apply.md |
| PN4開始 | prompts/vNext/PN4A-Structured-GroupA.md → prompts/vNext/PN4B-Structured-GroupB.md |
| PN5開始 | prompts/vNext/PN5-Non-Scenario.md |
| PN6開始 | prompts/vNext/PN6-Assembly.md |
| PN6R開始 | prompts/vNext/PN6R-Registry-Integration.md |
| PN7開始 | prompts/vNext/PN7-Cross-Reference-Audit.md |
| PN8開始 | prompts/vNext/PN8-Build-Runtime-Release.md |
| AUTORUN モードで進める場合（PN3A を開始する時点） | prompts/vNext/AUTORUN.md |

PN1 / PN2 は常にそれぞれ個別に手動実行する（各フェーズ完了後にユーザー報告・承認を待つ）。
PN3A〜PN8 は AUTORUN モード（自動連続実行）の対象である。

■ 対象概念 Overlay（該当する概念に「触れる」とき、該当分をすべて読む）

**「触れる」とは、対象を変更・追加・削除・引用・判断根拠として使用することをいう。**
読むだけ・パスを列挙するだけは該当しない。

条件は観察可能な行為で書かれている。状態や意図で判定しない。

| 概念 | 読む条件（いずれかに該当） | 読み込む文書 |
|---|---|---|
| **Validator** | ・`lib/moduleValidator.ts` / `lib/crossModuleValidator.ts` / `scripts/audit-*.ts` に触れる<br>・errorCode の追加・変更、severity の変更を行う<br>・Validator の warning / error 件数を判断材料にする<br>・PN7 または PN8 を実行する | docs/VALIDATOR_STANDARD.md |
| **Persona** | ・Persona Project に関する判断を行う<br>・runtime persona に関する判断を行う<br>・`module.persona` に関する判断を行う<br>・人格別固定文章、または人格別文体変換に関する判断を行う | docs/PERSONA_PROJECT_PRINCIPLE.md（Core） |
| **Persona Appendix** | **Persona Overlay が該当して Core を読む場合に限り、さらに次のいずれかに該当するとき Appendix も追加で読む**<br>・Core の判断根拠を確認する<br>・Repository 実測値・詳細反証・再測定手順を確認する<br>・Core の結論を再評価する | docs/PERSONA_PROJECT_APPENDIX.md（Appendix） |
| **Lifecycle** | ・ある資産を Legacy / Future Expansion / Experimental / Current Standard / Archived のいずれかとして判断・記録・引用しようとする<br>・`docs/DEVELOPMENT_STANDARD.md` §10.x に触れる | docs/DEVELOPMENT_STANDARD.md §10.2〜§10.5 |

**Persona Overlay の適用外**: bridge 本文・指導文の通常の文章表現や日本語校正は、
Persona Project との関係を判断する作業でない限り本 Overlay の対象ではない。
「文体」という語が現れたことだけを理由に本 Overlay を発火させない。

■ Overlay の運用規則

**判定順序**

```
Base 3 文書を読む
  ↓
① 工程段階 Overlay を判定（着手する段階が決まっているか）
  ↓
② 対象概念 Overlay を判定（触れる概念があるか）
     ※ ① が該当しても ② の判定を省略しない
  ↓
③ 該当がゼロなら「Overlay 未該当時の既定動作」へ
```

**複数該当時**

- 該当したものは**すべて読む**。優先順位はつけない（Overlay は排他ではない）
- 同じ文書が複数のトリガーから指された場合、読むのは 1 回でよい
- Overlay 間に読込順序はない
- Overlay 同士の記述が矛盾した場合、Overlay 間では解決しない。各 Overlay は正本を指すだけであり、
  正本間の矛盾は Owner 判断とする

**作業途中で該当が判明した場合**

- 着手時点だけでなく、**該当が判明した時点で追加読込する**
- 既に進めた作業がある場合、**その Overlay を読む前に行った判断を、その Overlay の観点で再確認する**
- 再確認の結果として判断を変更する場合は、変更した旨と理由を成果物へ明記する

**Overlay 未該当時の既定動作**

```
Overlay 表に該当なし
  ↓
【第1段】docs/DEVELOPMENT_STANDARD.md §7 Documentation Map を対象語で検索する
  ├─ 関連する正本が見つかった
  │     → それを読んで続行し、Overlay 追加候補として報告する
  └─ 見つからない
        ↓
【第2段】停止条件 S1〜S3 を判定する
  ├─ 該当 → 停止して報告する
  └─ 非該当 → Base のみで続行し、「Overlay 未該当で続行した」旨を成果物へ明記する
```

| ID | 停止条件 |
|---|---|
| S1 | 正本が存在するか否かを判定できない（Map に該当語がなく、存在しないのか到達できないのか不明） |
| S2 | 既存の Owner Decision を変更・再解釈する必要がある |
| S3 | 複数の正本が矛盾しており、どちらに従うか決められない |

**停止するのは「判断できない」ときだけであり、「知らない」ときではない。**

■ 現在状態の再構成（すべての作業・Base 読込後、作業開始前）

時点依存の情報（branch・HEAD・作業ツリー・module 状態・test/audit 結果）は、文書に書かれた値を
採用せず、毎回 Repository で実測する。観測できない項目は「未観測」と報告し、推測で埋めない。

**観測可能範囲の原則**: remote Repository へ永続化された内容は他環境から観測可能である。
未 commit・未 push の変更、local の ahead/behind、working tree、`/tmp/soap-build` は
他環境から観測不能である（**未 push は未共有**）。

A. shell を実行できる環境
  1. `git branch --show-current` / `git rev-parse HEAD @{u}` /
     `git ls-remote origin refs/heads/{branch}` / `git rev-list --left-right --count HEAD...@{u}` /
     `git status --short`
  2. canonical 未作成の bridge を列挙する（`bridges/{id}.md` に対応する `data/modules/{id}.json` がないもの）
  3. 対象 module を確定したら、その bridge Header の STATUS・Owner Decision・PENDING を読む
  4. `data/modules/index.ts` で registry 登録の有無を確認する

B. remote Repository の内容だけを読める環境（shell・local working tree を持たない環境）
  - 観測できるのは remote へ永続化された branch・commit・ファイルのみ。ahead/behind・未 push の commit・
    未 commit の変更・`/tmp/soap-build` は「未観測（他環境から見えない）」と報告する
  - A の 2〜4 を、remote 上のファイル一覧と内容で行う

判定規則
  - 現在地の候補は、canonical 未作成の bridge（および、観測できる場合は未 push・未 commit の差分）。
    **これは「候補」であり、それだけで Current Focus を確定しない**
  - 候補が複数ある、または `prompts/PROJECT_CONTEXT.md`・git history・bridge 状態から対象 module を
    一意に確定できない場合は、推測で選ばず、候補を列挙して STOP し、Owner の確認を待つ
  - bridge の STATUS は、Repository 全体の現在地（Current Focus）の検出には使わない
    （legacy bridge の STATUS は保守されていない）。STATUS は、対象 module を確定した後の
    pipeline stage 判定（`prompts/RULES.md` §24）にのみ使う
  - test / audit の結果は、文書に記載された過去値を現在値として扱わない。必要なときに再実行した結果だけを現在値とする
  - 復帰直後に Freeze・PN 開始・canonical 生成・commit・push・deploy へ自動で進まない
    （実行境界は `prompts/PROJECT_CONTEXT.md` §10）。再構成結果を起動完了報告で示し、Owner の明示指示を待つ

■ 起動完了報告（すべての作業）

読み込みが完了したら、作業を開始する前に以下を報告する。

- 読み込んだ Base
- 該当した Overlay と、読み込んだ文書
- Overlay 未該当の場合はその旨
- 現在状態の再構成結果: branch / local・tracking・remote HEAD / ahead・behind / 作業ツリー
  （B の環境では未観測の項目を明記）/ canonical 未作成の bridge / 対象 module の STATUS・PENDING / 次工程の候補
  （対象 module を一意に確定できない場合は候補の列挙）
- 報告後は、Owner の指示があるまで作業を開始しない

---

## 工程段階 Overlay「vNext module 生成」の起動情報

**本節は工程段階 Overlay「vNext module 生成」に属する。** module 生成以外の作業では使用しない。
Base および対象概念 Overlay の規則とは別系統である。

■ 対象bridge

```
bridges/{moduleId}.md
```

を読み込んでください。

確認項目

- STATUSが `FROZEN_FOR_PN1` であること
- moduleId
- header構造
- SCENARIO数
- ADDON数
- STATUS
- PENDING有無

■ 起動完了報告（vNext module 生成）

上記「起動完了報告（すべての作業）」に加えて、以下を報告する。

- 対象bridge
- STATUS
- PENDING有無

その上で「PN○開始準備完了」（○は実際に開始するフェーズ番号）まで報告し、
報告後に該当PNフェーズを開始する。

■重要事項（vNext module 生成）

- bridgeをSingle Source of Truthとする
- bridge本文は絶対に修正しない
- preservation優先
- 非創作
- 推測禁止
- canonical JSON側で補完しない
- エラーがあれば停止する
