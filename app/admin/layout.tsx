import LayoutWrapper from '@/components/layout/LayoutWrapper'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWrapper role="admin" title="Panel Admin">
      {children}
    </LayoutWrapper>
  )
}
