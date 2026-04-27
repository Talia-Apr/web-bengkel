'use client'

import { useEffect } from 'react'

export default function ClearCache() {
  useEffect(() => {
    // Membersihkan cache bfcache browser agar saat di-back otomatis reload
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null; // Komponen ini tidak merender apa-apa
}