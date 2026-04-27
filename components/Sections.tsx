// app/components/Sections.tsx — Tailwind v3
import {
  Lightbulb, AlarmClock, Smartphone,
  Wrench, Cog,
  Check, Flag, Car,
} from 'lucide-react'

// ─────────────────────────── WHY ───────────────────────────
export function SectionWhy() {
  const cards = [
    { num: '01', Icon: Lightbulb, title: 'Diagnosa Transparan', text: 'Setiap masalah dijelaskan dengan jelas sebelum pekerjaan dimulai. Tidak ada biaya tersembunyi.', dark: true },
    { num: '02', Icon: AlarmClock, title: 'Tepat Waktu', text: 'Kami menghormati waktu Anda. Estimasi selesai selalu diberikan dan kami berupaya memenuhinya.', dark: false },
    { num: '03', Icon: Cog, title: 'Sparepart Original', text: 'Hanya menggunakan sparepart bergaransi dari distributor resmi.', dark: false },
    { num: '04', Icon: Smartphone, title: 'Tracking Online', text: 'Pantau status kendaraan Anda secara real-time. Notifikasi otomatis saat servis selesai.', dark: false },
  ]

  return (
    <section id="tentang kami" className="bg-cream px-5 py-16 md:px-8 md:py-20 lg:px-16 lg:py-24">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-12 lg:mb-16">
        <div>
          <div className="tag font-sans">Mengapa Kami</div>
          <h2 className="sec-title">Bengkel yang Bisa<br />Anda <em>Percaya</em></h2>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map(c => (
          <div key={c.num}
            className={`relative overflow-hidden rounded-2xl p-8 border transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl
              ${c.dark ? 'bg-dark border-dark-3' : 'bg-white border-stone-lite'}`}
          >
            {/* Corner accent */}
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-br-2xl rounded-tl-[80px]
              ${c.dark ? 'bg-orange/8' : 'bg-orange-pale'}`} />

            <div className="font-mono-dm text-[11px] text-orange font-medium mb-4 tracking-[0.1em]">{c.num} —</div>
            <c.Icon className="w-8 h-8 text-orange mb-4" />
            <div className={`text-[18px] font-black mb-2.5 tracking-tight ${c.dark ? 'text-white' : 'text-dark'}`}>{c.title}</div>
            <div className={`text-[13px] leading-[1.65] ${c.dark ? 'text-stone-mid' : 'text-[#57534e]'}`}>{c.text}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────── PROCESS ───────────────────────────
export function SectionProcess() {
  const steps = [
    { num: '01', Icon: Check, title: 'Booking Online', desc: 'Daftarkan kendaraan, ceritakan keluhan, dan pilih jadwal yang sesuai.', done: true, active: false },
    { num: '02', Icon: Check, title: 'Konfirmasi Admin', desc: 'Admin mengkonfirmasi jadwal dan meneruskan ke mekanik untuk dikerjakan.', done: true, active: false },
    { num: '03', Icon: Wrench, title: 'Pengerjaan Servis', desc: 'Mekanik melakukan diagnosa menyeluruh dan melaporkan temuan kepada Anda.', done: false, active: true  },
    { num: '04', Icon: Car, title: 'Test Drive', desc: 'Pengecekan dengan mencoba mengendarai kendaraan setelah servis selesai.', done: false, active: false },
    { num: '05', Icon: Flag, title: 'Serah Terima & Nota', desc: 'Kendaraan diserahkan dengan nota terperinci, garansi kerja 3 hari.', done: false, active: false },
  ]

  return (
    <section id="proses" className="bg-dark relative overflow-hidden px-5 py-16 md:px-8 md:py-20 lg:px-16 lg:py-24">
      {/* BG text */}
      <div className="absolute bottom-[-60px] left-[-20px] font-playfair font-black pointer-events-none select-none text-white/[0.02]"
        style={{ fontSize: 220, letterSpacing: -10, whiteSpace: 'nowrap' }}>PROSES SERVIS</div>

      <div className="mb-14">
        <div className="tag text-orange">Alur Servis</div>
        <h2 className="sec-title light">Proses <em>Sederhana,</em><br />Hasil Maksimal</h2>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-0 relative">
        {/* Desktop connector line */}
        <div className="hidden lg:block absolute top-7 left-[5%] right-[5%] h-px bg-white/7" />

        {steps.map((s, i) => (
          <div key={i} className="flex flex-col">
            {/* Dot + horizontal line */}
            <div className="flex items-center mb-5 relative z-10">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border
                ${s.done   ? 'bg-green-100 border-green-300'
                : s.active ? 'bg-orange border-orange shadow-[0_0_0_8px_rgba(234,88,12,0.12)]'
                :            'bg-white/4 border-stone-mid/30'}`}>
                <s.Icon className={`w-7 h-7
                  ${s.done ? 'text-green-600' : s.active ? 'text-white' : 'text-[#57534e]'}`} />
              </div>
              {/* Desktop horizontal connector */}
              {i < steps.length - 1 && (
                <div className={`hidden lg:block flex-1 h-px ${s.done ? 'bg-orange/25' : 'bg-white/20'}`} />
              )}
            </div>

            {/* Mobile vertical connector */}
            {i < steps.length - 1 && (
              <div className="lg:hidden w-px h-7 bg-white/8 ml-7 mb-0" />
            )}

            <div className="font-mono-dm text-[10px] text-stone-mid tracking-[0.1em] mb-1.5">LANGKAH {s.num}</div>
            <div className="text-[15px] font-black text-white mb-1.5">{s.title}</div>
            <div className="text-[12px] text-stone-mid leading-relaxed pr-4">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
