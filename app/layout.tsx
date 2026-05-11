import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ConvertIQ — AI Conversion Audit',
  description: 'Audit any website like a senior CRO expert.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
