'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

interface LayoutWrapperProps {
  role: 'admin' | 'mekanik' | 'pelanggan' | 'pemilik'
  title: string
  children: React.ReactNode
}

export default function LayoutWrapper({ role, title, children }: LayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()

  const userName = session?.user?.name ?? '...'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-stone-600 hover:text-stone-900"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-stone-900">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-3 border-l border-stone-200">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {userInitial}
              </div>
              <span className="text-sm font-medium text-stone-700 hidden sm:block">{userName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
