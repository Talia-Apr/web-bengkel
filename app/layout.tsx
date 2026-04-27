import type { Metadata } from 'next'
import "./globals.css"
import Providers from '@/components/Providers'
import ClearCache from '@/components/ClearCache'

export const metadata: Metadata = {
  title: 'Bengkel Nugraha Jaya',
  description: 'Bengkel otomotif terpercaya di Sidoarjo. Booking servis online, mekanik berpengalaman, sparepart original.',
  icons: {
    icon: "/logo-putih.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          <ClearCache />
          {children}
        </Providers>
      </body>
    </html>
  )
}
