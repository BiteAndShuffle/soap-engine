import type { Metadata } from 'next'
import './globals.css'
import LockGate from './components/LockGate'

export const metadata: Metadata = {
  title: 'SOAP Engine',
  description: 'Clinical SOAP note generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LockGate>{children}</LockGate>
      </body>
    </html>
  )
}
