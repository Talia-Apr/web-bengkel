// app/page.tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import { SectionWhy, SectionProcess } from '@/components/Sections'
import { SectionGalery, SectionContact, Footer } from '@/components/BottomSections'

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SectionWhy />
        <SectionProcess />
        <SectionGalery />
        <SectionContact />
      </main>
      <Footer />
    </>
  )
}
