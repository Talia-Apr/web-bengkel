import LayoutWrapper from '@/components/layout/LayoutWrapper'

export default function PemilikLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWrapper role="pemilik" title="Panel Pemilik">
      {children}
    </LayoutWrapper>
  )
}
