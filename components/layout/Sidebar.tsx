'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import { Wrench, LayoutDashboard, Users, UserCog, Package, PhoneCall, Calendar, FileText, Receipt, LogOut, X, ChevronRight, BarChart3, Sparkles, CalendarDays } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface SidebarProps {
  role: 'admin' | 'mekanik' | 'pelanggan' | 'pemilik'
  isOpen?: boolean
  onClose?: () => void
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { href: '/admin',             label: 'Dashboard',          icon: LayoutDashboard },
    { href: '/admin/pelanggan',   label: 'Data Pelanggan',     icon: Users },
    { href: '/admin/mekanik',     label: 'Data Mekanik',       icon: UserCog },
    { href: '/admin/jasa-servis', label: 'Kelola Jasa Servis', icon: Wrench },
    { href: '/admin/sparepart',   label: 'Stok Sparepart',     icon: Package },
    { href: '/admin/booking',     label: 'Kelola Booking',     icon: Calendar },
    { href: '/admin/operasional', label: 'Kelola Hari Operasional', icon: CalendarDays },
    { href: '/admin/nota',        label: 'Kelola Nota',        icon: Receipt },
    { href: '/admin/follow-up',   label: 'Follow-Up Pelanggan',icon: PhoneCall },
    { href: '/admin/laporan',     label: 'Laporan Servis',     icon: FileText },
  ],
  mekanik: [
    { href: '/mekanik',         label: 'Dashboard',      icon: LayoutDashboard },
    { href: '/mekanik/tugas',   label: 'Daftar Tugas',   icon: Calendar },
  ],
  pelanggan: [
    { href: '/pelanggan',           label: 'Dashboard',       icon: LayoutDashboard },
    { href: '/pelanggan/booking',   label: 'Booking Servis',  icon: Calendar },
    { href: '/pelanggan/progress',  label: 'Progress Servis', icon: Wrench },
    { href: '/pelanggan/riwayat',   label: 'Riwayat Servis',  icon: FileText },
  ],
  pemilik: [
    { href: '/pemilik',            label: 'Dashboard Monitoring', icon: LayoutDashboard },
    { href: '/pemilik/laporan',    label: 'Data Laporan',         icon: BarChart3 },
    { href: '/pemilik/analytics',  label: 'Analytics AI',         icon: Sparkles },
  ],
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const navItems = navByRole[role] || []

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login', 
      redirect: true 
    });
  };
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-stone-900 z-50 flex flex-col
        transform transition-transform duration-300
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-stone-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <Image src="/logo-putih.png" alt="Logo" width={50} height={30} />
              </div>
              <div>
                <div className="font-display font-bold text-white text-sm leading-tight">Bengkel Nugraha Jaya</div>
                <div className="text-stone-400 text-xs">Bengkel Mobil</div>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-stone-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto sidebar-nav p-4 space-y-1 mt-2">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== `/${role}` && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-orange-600 text-white'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-70" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer - Logout */}
        <div className="p-4 border-t border-stone-700 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  )
}
