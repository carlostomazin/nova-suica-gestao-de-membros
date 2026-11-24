import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Membros Nova Suíça',
  description: 'Cadastro seguro e organizado de membros da congregação Nova Suíça.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#f6f7f9',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="light">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        <Toaster theme="light" position="top-right" richColors closeButton />
        <Analytics />
      </body>
    </html>
  )
}
