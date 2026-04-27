import LayoutWrapper from '@/components/layout/LayoutWrapper'

export default function MekanikLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWrapper role="mekanik" title="Panel Mekanik">
      {children}
    </LayoutWrapper>
  )
}
