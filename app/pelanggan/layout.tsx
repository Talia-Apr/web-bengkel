import LayoutWrapper from '@/components/layout/LayoutWrapper'

export default function PelangganLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWrapper role="pelanggan" title="Panel Pelanggan">
      {children}
    </LayoutWrapper>
  )
}
