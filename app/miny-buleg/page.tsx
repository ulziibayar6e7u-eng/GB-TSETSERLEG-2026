'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Group = { id: number; code: string; name: string; nickname: string | null; age_group: string | null; icon: string; color: string }
type Stats = { children: number; topics: number; pendingTasks: number; pendingPlans: number }

type Card = {
  key: string
  title: string
  subtitle: string
  icon: string
  bg: string
  href: string
  badge?: { text: string; color: string }
}

export default function MinyBulegPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [group, setGroup] = useState<Group | null>(null)
  const [stats, setStats] = useState<Stats>({ children: 0, topics: 7, pendingTasks: 0, pendingPlans: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!me) return
    const primary = me.groups[0]
    if (!primary) { setLoading(false); return }
    ;(async () => {
      const { data: g } = await supabase.from('groups').select('*').eq('id', primary.id).maybeSingle()
      setGroup(g as Group)
      const [kids, plans] = await Promise.all([
        supabase.from('children').select('id', {count:'exact', head:true}).eq('group_id', primary.id).eq('status', 'active'),
        supabase.from('plans').select('id', {count:'exact', head:true}).eq('author_id', me.id).eq('status', 'submitted'),
      ])
      setStats((s) => ({ ...s, children: kids.count || 0, pendingPlans: plans.count || 0 }))
      setLoading(false)
    })()
  }, [me, supabase])

  if (meLoading || loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!group) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-3">🏫</div>
          <div className="text-slate-500">Танд бүлэг хуваарилагдаагүй байна</div>
          <Link href="/buleg" className="text-blue-600 hover:text-blue-800 text-sm mt-3 inline-block">Бүх бүлэг үзэх →</Link>
        </div>
      </div>
    )
  }

  const cards: Card[] = [
    { key: 'profile',     title: 'Багшийн танилцуулга',       subtitle: '📋 Портфолио, ажлын түүх, ур чадвар',                          icon: '👤',  bg: 'from-pink-100 to-pink-200',      href: '/miny-buleg/profile' },
    { key: 'program',     title: 'Хөтөлбөр төлөвлөгөө',       subtitle: '📅 Жилийн, сарын, ээлжит төлөвлөгөө',                          icon: '📋',  bg: 'from-violet-100 to-purple-200',  href: '/tulvluguu', badge: { text: 'Автомат', color: 'bg-emerald-500' } },
    { key: 'weekly',      title: '7 хоногийн автомат төлөвлөгөө', subtitle: 'Гарын авлагаас 1 товшилтоор бөглөнө · СУД автомат · Word татах · Арга зүйч батлах', icon: '🎁',  bg: 'from-emerald-100 to-teal-200',   href: '/tulvluguu', badge: { text: 'ШИНЭ', color: 'bg-emerald-500' } },
    { key: 'assessment',  title: 'Хүүхдийн хөгжлийн үнэлгээ', subtitle: '🎯 🏆 Гараа, явц, үр дүн, шалгуур',                            icon: '📊',  bg: 'from-cyan-100 to-blue-200',      href: '/hugjil' },
    { key: 'activities',  title: 'Сургалт, үйл ажиллагаа',    subtitle: '📷 Хичээлийн зураг, бичлэг, тэмдэглэл',                        icon: '📸',  bg: 'from-orange-100 to-amber-200',   href: '/ajigllt' },
    { key: 'news',        title: 'Зар мэдээ, үйл ажиллагаа',  subtitle: '☀️ Бүх эцэг эхэд харагдана',                                    icon: '📣',  bg: 'from-cyan-100 to-sky-200',       href: '/zar' },
    { key: 'feedback',    title: 'Арга зүйч, эрхлэгч',        subtitle: '📌 Хяналт, зөвлөгөө, заавар',                                  icon: '📤',  bg: 'from-pink-100 to-rose-200',      href: '/uureg' },
    { key: 'approval',    title: 'Батламжийн ширээ',          subtitle: 'Багшийн илгээсэн төлөвлөгөөг 🏆 Онц сайн · ✅ Сайн · 📋 Засварлах түвшнээр батлах', icon: '🏆',  bg: 'from-amber-100 to-yellow-200',   href: '/tulvluguu', badge: { text: 'Арга зүйч', color: 'bg-orange-500' } },
    { key: 'tasks',       title: 'Үүрэг даалгаврын систем',   subtitle: 'Эрхлэгч/арга зүйч даалгавар өгнө · Ажилтан хүлээн авч гүйцэтгэнэ',                   icon: '📌',  bg: 'from-red-100 to-pink-200',       href: '/uureg', badge: { text: 'Даалгавар', color: 'bg-red-500' } },
    { key: 'notes',       title: 'Өдрийн тэмдэглэл',          subtitle: '🔒 Зөвхөн өөрөө хардаг. Сонголтоор хуваалцаж болно',            icon: '📔',  bg: 'from-pink-100 to-rose-100',      href: '/miny-tempdegljl' },
    { key: 'library',     title: 'Хөтөлбөрийн сан',           subtitle: 'Хэл яриа, Математик, БНО, Нийгэмшихүй, Урлаг, Хөдөлгөөн, ААУ',  icon: '📚',  bg: 'from-amber-100 to-orange-200',   href: '/barimt', badge: { text: 'СУД + Хэрэглэгдэхүүн', color: 'bg-slate-600' } },
    { key: 'stories',     title: 'Үлгэр зохиолын сан',        subtitle: 'Үлгэр, шүлэг, дуу, ардын үлгэр — YouTube, PDF, аудио',         icon: '📖',  bg: 'from-pink-100 to-rose-200',      href: '/barimt', badge: { text: 'Багш өөрөө нэмнэ', color: 'bg-slate-500' } },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="bg-white/80 backdrop-blur border-b border-emerald-200/50 px-6 py-3 flex items-center gap-2 sticky top-0 z-20">
        <span className="text-2xl">{group.icon}📚</span>
        <span className="font-bold text-lg bg-gradient-to-r from-emerald-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
          {group.name.toUpperCase()}{me ? ` · ${me.last_name}.${me.first_name}` : ''}
        </span>
        <span className="text-lg">🌱</span>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="bg-gradient-to-r from-emerald-100 via-cyan-100 to-blue-100 rounded-2xl p-4 mb-6 flex items-center justify-center gap-8 relative">
          <span className="absolute left-4 text-2xl">🎨</span>
          <div className="text-center"><div className="text-2xl font-bold text-emerald-600">{stats.children}</div><div className="text-xs text-slate-600">👧👦 Хүүхэд</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-cyan-600">{stats.topics}</div><div className="text-xs text-slate-600">📚 Сэдэв</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-blue-600 flex items-center gap-1">{group.icon} 1</div><div className="text-xs text-slate-600">Бүлэг</div></div>
          <span className="absolute right-4 text-2xl">⭐</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.key} href={c.href} className={`relative rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer bg-gradient-to-br ${c.bg} min-h-[180px] flex flex-col`}>
              {c.badge && (
                <div className={`absolute top-3 right-3 px-2 py-0.5 ${c.badge.color} text-white text-[10px] font-bold rounded shadow`}>
                  {c.badge.text}
                </div>
              )}
              <div className="text-3xl mb-3">{c.icon}</div>
              <div className="font-semibold text-slate-800 text-sm leading-snug mb-1">{c.title}</div>
              <div className="text-xs text-slate-600 leading-relaxed">{c.subtitle}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
