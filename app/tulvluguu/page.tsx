'use client'

import Link from 'next/link'
import { useMe } from '@/lib/useMe'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CARDS = [
  { href: '/tulvluguu/weekly',  icon: '🎁', label: '7 хоногийн төлөвлөгөө', desc: 'Гарын авлагаас автомат бөглөнө · Арга зүйч батлана', color: 'from-emerald-500 to-teal-600' },
  { href: '/tulvluguu/monthly', icon: '📅', label: 'Сарын төлөвлөгөө',       desc: 'Сарын сэдэв, зорилго, 4-5 долоо хоногийн товч', color: 'from-blue-500 to-cyan-600' },
]

export default function PlansHub() {
  const { me, loading } = useMe()
  const router = useRouter()
  const isMusicTeacher = me?.first_name === 'Өлзийбаяр' || me?.groups.some((g) => g.code === 'hogjim')

  useEffect(() => {
    if (loading) return
    if (isMusicTeacher) router.replace('/hogjim-plan')
  }, [loading, isMusicTeacher, router])

  if (loading || isMusicTeacher) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">📋 Сургалтын хөтөлбөр төлөвлөгөө</h1>
          <p className="text-sm text-slate-500 mt-1">
            {me ? `${me.last_name}.${me.first_name}` : ''} · Өөрийн бүлгийн сургалтын хөтөлбөр, төлөвлөгөө
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href} className={`rounded-2xl p-6 text-white bg-gradient-to-br ${c.color} hover:shadow-xl hover:-translate-y-0.5 transition-all`}>
              <div className="text-4xl mb-3">{c.icon}</div>
              <div className="text-xl font-bold">{c.label}</div>
              <div className="text-sm opacity-90 mt-1">{c.desc}</div>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          <div className="font-medium text-slate-800 mb-1">💡 Санамж</div>
          Багшийн гүйцэтгэлийн төлөвлөгөө, ажлын хэсгийн, сургалт хөгжлийн зэрэг байгууллагын түвшний төлөвлөгөөг <Link href="/tulvluguu-bail" className="text-blue-600 hover:underline">📆 Байгууллагын төлөвлөгөө</Link> хэсгээс илгээж, эрхлэгчээр батлуулна.
        </div>
      </div>
    </div>
  )
}
