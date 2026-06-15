# SOAP Engine

A clinical SOAP note generator built with Next.js and TypeScript.

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
- Two selectable patterns:
  - Dose reduction due to improvement
  - Dose reduction due to adverse effects
- Formatted SOAP output text
- Copy to clipboard functionality

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

1. Select a pattern (improvement or adverse effects)
2. Click "Generate SOAP Note"
3. Review the generated SOAP note
4. Click "Copy to Clipboard" to copy the note

## Build for Production

```bash
npm run build
npm start
```
