import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ConvertIQ — AI Conversion Audit',
  description: 'Audit any website like a senior CRO expert.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Geist', -apple-system, sans-serif", background: '#F7F7F5', color: '#0C0C0A' }}>
        {children}
      </body>
    </html>
  )
}
