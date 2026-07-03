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
□ npm run build
□ ModuleValidator（対象モジュールが OK / 既存warning件数に変化がないか）
□ CrossModuleValidator
□ scripts/audit-addon-bridge-chain.ts（bridge⇔addonsRef⇔AddonPanel整合）
□ 本文（S/O/A/P）のみの修正のはずが、addonsRefに意図しない差分が出ていないか確認する（RULES.md §22）
□ 既知の不整合・warning件数を変更前後で比較する（増減していないか）
□ 実機確認（変更内容に応じて: 検索候補の表示順序 / AddonPanel表示 / SOAP生成結果 等）
□ push後、Vercel Preview のデプロイ成功を確認（GitHub Commit Status API）
```

## 補足

- 既存の不整合（例: 対応保留中のモジュール）が今回の変更で新たに増えていないかを、変更前後の件数比較で必ず確認する
- worktree で作業した場合、mainブランチ・PRに触れる前に、取り込み先ブランチ（例: `feat/nlp-input-panel-and-new-schema`）へのcherry-pick後も本チェックリストを再実行する
