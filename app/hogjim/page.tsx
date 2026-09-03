'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Stats = { children: number; topics: number; groups: number; pendingTasks: number }

type Card = {
  key: string
  title: string
  subtitle: string
  icon: string
  bg: string
  href: string
  badge?: { text: string; color: string }
}

export default function HogjimHome() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [stats, setStats] = useState<Stats>({ children: 0, topics: 5, groups: 0, pendingTasks: 0 })

  useEffect(() => {
    if (!me) return
    ;(async () => {
      const [kids, groups, plans] = await Promise.all([
        supabase.from('children').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('groups').select('id', { count: 'exact', head: true }),
        supabase.from('plans').select('id', { count: 'exact', head: true }).eq('author_id', me.id).eq('status', 'submitted'),
      ])
      setStats((s) => ({
        ...s,
        children: kids.count || 0,
        groups: groups.count || 0,
        pendingTasks: plans.count || 0,
      }))
    })()
  }, [me, supabase])

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const cards: Card[] = [
    { key: 'profile',     title: 'Багшийн танилцуулга',         subtitle: '📋 Портфолио, ажлын түүх, ур чадвар',                           icon: '👤',  bg: 'from-pink-100 to-pink-200',        href: '/hogjim/profile' },
    { key: 'plans',       title: 'Хөтөлбөр төлөвлөгөө',         subtitle: '📅 Жилийн, сарын, ээлжит төлөвлөгөө',                           icon: '📋',  bg: 'from-violet-100 to-purple-200',    href: '/tulvluguu' },
    { key: 'assessment',  title: 'Хүүхдийн хөгжлийн үнэлгээ',   subtitle: '🎯 🏆 Гараа, явц, үр дүн, шалгуур',                             icon: '📊',  bg: 'from-emerald-100 to-teal-200',     href: '/hugjil' },
    { key: 'instruments', title: 'Хөгжмийн зэмсгийн каталог',   subtitle: '🎺 🥁 🎻 32 хөгжмийн зэмсэг',                                  icon: '🎷',  bg: 'from-amber-100 to-yellow-200',     href: '/hogjim/instruments' },
    { key: 'activities',  title: 'Сургалт, үйл ажиллагаа',       subtitle: '📷 Хичээлийн зураг, бичлэг, тэмдэглэл',                         icon: '📸',  bg: 'from-orange-100 to-red-100',       href: '/ajigllt' },
    { key: 'monthly',     title: 'Сарын тайлан',                subtitle: '📊 Автомат нэгтгэсэн тайлан PDF',                              icon: '📈',  bg: 'from-cyan-100 to-blue-200',        href: '/tailan' },
    { key: 'tasks',       title: 'Арга зүйч, эрхлэгчээс ирсэн үүрэг', subtitle: '📌 Хяналт, зөвлөгөө, заавар',                              icon: '📤',  bg: 'from-pink-100 to-rose-200',        href: '/uureg', badge: stats.pendingTasks > 0 ? { text: String(stats.pendingTasks), color: 'bg-purple-600' } : undefined },
    { key: 'notes',       title: 'Өдрийн тэмдэглэл',            subtitle: 'Багшийн ажлын дэвтэр',                                          icon: '📔',  bg: 'from-fuchsia-100 to-pink-200',     href: '/ajigllt' },
    { key: 'calendar',    title: 'Хуанли',                      subtitle: 'Хичээл, тоглолт, үүрэг нэг дор',                                icon: '📅',  bg: 'from-emerald-100 to-green-200',    href: '/tulvluguu' },
    { key: 'songs',       title: 'Дууны сан',                   subtitle: 'Дуу, хөгжимт хөдөлгөөн, сонсох хөгжим',                         icon: '🎬',  bg: 'from-orange-100 to-yellow-100',    href: '/hogjim/songs' },
    { key: 'certificate', title: 'Гэрчилгээ үүсгэгч',           subtitle: '🏆 Хүүхдийн шагналт гэрчилгээ · 9 загвар · PDF/Word татах',    icon: '🏆',  bg: 'from-amber-100 to-orange-200',     href: '/hogjim/certificate' },
    { key: 'research',    title: 'Судалгааны асуулт',           subtitle: '📚 Хөгжмийн боловсролын судалгаанд оролцох (нэр байхгүй)',      icon: '🔬',  bg: 'from-indigo-100 to-purple-200',    href: '/hogjim/research' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-cyan-50">
      <div className="bg-white/80 backdrop-blur border-b border-pink-200/50 px-6 py-3 flex items-center gap-2 sticky top-0 z-20">
        <span className="text-2xl">🎵🎨</span>
        <span className="font-bold text-lg bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          ХӨГЖИМ{me ? ` · ${me.last_name}.${me.first_name}` : ''}
        </span>
        <span className="text-lg">✨</span>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-cyan-100 rounded-2xl p-4 mb-6 flex items-center justify-center gap-8 relative">
          <span className="absolute left-4 text-2xl">🎨</span>
          <div className="text-center"><div className="text-2xl font-bold text-pink-600">{stats.children}</div><div className="text-xs text-slate-600">👧👦 Хүүхэд</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-purple-600">{stats.topics}</div><div className="text-xs text-slate-600">📚 Сэдэв</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-cyan-600">{stats.groups}</div><div className="text-xs text-slate-600">👥 Бүлэг</div></div>
          <span className="absolute right-4 text-2xl">⭐</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className={`relative rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer bg-gradient-to-br ${c.bg} min-h-[180px] flex flex-col`}
            >
              {c.badge && (
                <div className={`absolute top-3 right-3 min-w-6 h-6 px-1.5 ${c.badge.color} text-white text-xs font-bold rounded-full flex items-center justify-center shadow`}>
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
