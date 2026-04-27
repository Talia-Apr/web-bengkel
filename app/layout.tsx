import { useEffect } from 'react'
import type { Metadata } from 'next'
import "./globals.css"
import Providers from '@/components/Providers'

useEffect(() => {
  // Membersihkan cache bfcache browser
  window.onpageshow = function(event) {
    if (event.persisted) {
      window.location.reload();
    }
  };
}, []);

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
          {children}
        </Providers>
      </body>
    </html>
  )
}
