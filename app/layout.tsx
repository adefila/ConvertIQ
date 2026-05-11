import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ConvertIQ — AI Conversion Audit',
  description: 'Audit any website like a senior CRO expert. Section-by-section analysis of your real live page.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
