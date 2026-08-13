# SOAP Engine

A clinical SOAP note generator built with Next.js and TypeScript.

## 開発を始める前に（AI セッション / 開発者 共通）

| 目的 | 読むファイル |
|---|---|
| **何をどの順に読むか**（読込経路の正本） | **[prompts/vNext/STARTUP_PROMPT.md](prompts/vNext/STARTUP_PROMPT.md)** |
| プロジェクト全体の構造・正本関係・Documentation Map・Product Phase Roadmap | [docs/DEVELOPMENT_STANDARD.md](docs/DEVELOPMENT_STANDARD.md) |
| 現在のフェーズと Current Focus（いま何をしているか） | [prompts/PROJECT_CONTEXT.md](prompts/PROJECT_CONTEXT.md) |

**AI セッションはまず STARTUP_PROMPT から読むこと**（[CLAUDE.md](CLAUDE.md) も同じ入口を指す）。
本 README は入口の案内であり、設計・ルール・現在地の正本ではない。

## 機能用語定義（必読）

コードを調査・修正する前に **[docs/feature-glossary.md](docs/feature-glossary.md)** を読んでください。

Rapid / Express / ADDON / NLP生成 の定義はこのファイルを正本（single source of truth）とします。

| 用語 | 概要 | 状態 |
|------|------|------|
| **Rapid** | 右パネルの S先頭文/フラグ/ADDON ボタン操作 | 稼働中 |
| **ADDON** | Rapid の一部。生活指導などの追加文オーバーレイ | 稼働中 |
| **Express** | 中央パネルの薬剤追加フロー（領域→サブカテゴリ→確定） | 稼働中 |
| **NLP生成** | 患者テキストから SOAP を AI 生成する将来機能 | UI未接続 |

> **重要**: Rapid ≠ NLP生成。NLP生成は現在どの UI ボタンにも接続されていません。

## Features

- Single-page UI for SOAP note generation
- Drug search (brand / generic name) and scenario selection per drug module
- Multi-drug composition (semantic merge)
- ADDON overlays and Rapid operations on the generated note
- Formatted SOAP output text with copy-to-clipboard

登録済みモジュールの一覧・件数は `data/modules/index.ts` を正本とする（本 README は保持しない）。

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Search for a drug in the top bar and select a candidate
2. Choose a scenario group in the left sidebar, then a template
3. Adjust with ADDON / Rapid operations, or add another drug
4. Copy the generated S / O / A / P fields to the pharmacy record system

## Build for Production

```bash
npm run build
npm start
```
