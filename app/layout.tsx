import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FitTrack — Alan',
  description: 'Personal fitness tracker',
  themeColor: '#0a0e1a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
