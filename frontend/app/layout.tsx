import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClawHQ Platform - The command center for your OpenClaw ecosystem',
  description: 'Unified dashboard for OpenClaw agents with real-time monitoring, cost intelligence, and security management.',
  keywords: ['OpenClaw', 'AI agents', 'dashboard', 'monitoring', 'cost tracking', 'security'],
  authors: [{ name: 'Modology Studios' }],
  creator: 'Modology Studios',
  publisher: 'Modology Studios',
  robots: 'index, follow',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3B82F6',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://clawhqplatform.com',
    title: 'ClawHQ Platform',
    description: 'The command center for your OpenClaw ecosystem',
    siteName: 'ClawHQ Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClawHQ Platform',
    description: 'The command center for your OpenClaw ecosystem',
    creator: '@modologystudios',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}