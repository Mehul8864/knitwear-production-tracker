import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'StitchOps — Production Visibility Without the Chasing',
    template: '%s | StitchOps',
  },
  description:
    'StitchOps is a premium production order-tracking platform for knitwear exporters. Connect merchandisers, supervisors, and international buyers through one source of truth.',
  keywords: ['knitwear', 'production tracking', 'export', 'TNA', 'Tiruppur', 'apparel'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '14px',
            },
          }}
          richColors
        />
      </body>
    </html>
  )
}
