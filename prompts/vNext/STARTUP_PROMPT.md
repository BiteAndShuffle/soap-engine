# SOAP Engine — Claude新規チャット用 引き継ぎプロンプト（vNext正式版）

version: 1.1
最終更新: 2026-07-21
対象: vNext PN1〜PN8ワークフローを使用するすべてのbridge作業

## Purpose

このファイルは、SOAPエンジンのvNextワークフローで新規チャットセッションを開始する際に
そのままコピー＆ペーストして使う起動プロンプトの正本（Single Source of Truth）である。
スタートアップ手順を複数箇所で重複管理しない。

## When to use

vNext PN1〜PN8ワークフローでbridge作業（新規モジュールの追加、または既存bridgeの
続き作業）を新規チャットで開始するとき。

## Design Principles

- bridge = Single Source of Truth
- preservation first
- non-creative
- phase loading（PNファイルは着手するフェーズが決まった時点で該当分のみ読み込む）
- token efficiency

`{moduleId}` は対象bridgeのmoduleIdに置換してから使用する。

## 事前確認（本テンプレートを使う前に）

このセッションで `docs/DEVELOPMENT_STANDARD.md`（プロジェクト全体構造の索引文書）を
まだ読んでいない場合は、本テンプレートを使用する前に先に読むことを推奨する。
`docs/DEVELOPMENT_STANDARD.md` → `prompts/PROJECT_CONTEXT.md` の順で全体像を把握した上で、
本テンプレート（下記「テンプレート本文」）を使って vNext 個別フェーズの作業へ進む。

本テンプレート自体の「■最初に読み込むファイル（順序厳守）」の内容・順序はこの事前確認によって
変更されない。

---

## テンプレート本文（ここから下を新規チャットに貼り付ける）

SOAPエンジン開発を継続します。

まず会話履歴は参照せず、必ずリポジトリ内のファイルを正本として読み込んでください。

■最初に読み込むファイル（順序厳守）

1. prompts/vNext/HANDOFF.md
2. prompts/PROJECT_CONTEXT.md
3. prompts/RULES.md
4. docs/VALIDATOR_STANDARD.md

■ PNプロンプトの読み込み方針

PN1〜PN8のプロンプトファイルは一括で読み込まない。
着手するフェーズが決まった時点で、該当するファイルのみを読み込む。

| 開始するフェーズ | 読み込むファイル |
|---|---|
| PN1開始 | prompts/vNext/PN1-Text-Extraction.md |
| PN2開始 | prompts/vNext/PN2-Drug-Header.md |
| PN3開始 | prompts/vNext/PN3A-Scenario-Classification.md → prompts/vNext/PN3B-Scenario-Metadata-Apply.md |
| PN4開始 | prompts/vNext/PN4A-Structured-GroupA.md → prompts/vNext/PN4B-Structured-GroupB.md |
| PN5開始 | prompts/vNext/PN5-Non-Scenario.md |
| PN6開始 | prompts/vNext/PN6-Assembly.md |
| PN7開始 | prompts/vNext/PN7-Cross-Reference-Audit.md |
| PN8開始 | prompts/vNext/PN8-Build-Runtime-Release.md |

■ PNフェーズの実行モード（AUTORUN）

- PN1 / PN2 は常にそれぞれ個別に手動実行する（各フェーズ完了後にユーザー報告・承認を待つ）。
- PN3A〜PN8 は AUTORUN モード（自動連続実行）の対象である。
- AUTORUN モードで進める場合は、PN3A を開始する時点で `prompts/vNext/AUTORUN.md` を追加で読み込む。

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

■ 起動完了報告

読み込みが完了したら、作業を開始する前に以下を報告する。

- 読み込んだファイル一覧
- 対象bridge
- STATUS
- PENDING有無

その上で「PN○開始準備完了」（○は実際に開始するフェーズ番号）まで報告し、
報告後に該当PNフェーズを開始する。

■重要事項

- bridgeをSingle Source of Truthとする
- bridge本文は絶対に修正しない
- preservation優先
- 非創作
- 推測禁止
- canonical JSON側で補完しない
- エラーがあれば停止する
