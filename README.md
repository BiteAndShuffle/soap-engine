# SOAP Engine

A clinical SOAP note generator built with Next.js and TypeScript.

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
