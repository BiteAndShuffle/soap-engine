import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '薬剤師SOAP自動生成 — GLP-1',
  description: '薬剤師向けSOAPノート自動生成ツール（GLP-1受容体作動薬対応）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
