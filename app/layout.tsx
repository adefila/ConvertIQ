import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ConvertIQ — AI Website CRO Audit',
  description: 'Audit any website like a CRO expert. Section-by-section analysis with real copy rewrites.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
