'use client'

import { useMemo } from 'react'
import { useMe } from '@/lib/useMe'

type Pack = {
  code: string
  name: string
  subtitle: string
  icon: string
  color: string
  groupCode?: string
  roleFilter?: (role: string) => boolean
}

const PACKS: Pack[] = [
  { code: 'baga',    name: 'Бага бүлэг · Бэлэн багц',    subtitle: '2-3 нас · 7 хоног, сарын, жилийн, ээлжит хичээл',       icon: '👶', color: 'from-pink-500 to-rose-500',       groupCode: 'baga' },
  { code: 'dund',    name: 'Дунд бүлэг · Бэлэн багц',    subtitle: '3-4 нас · 7 хоног, сарын, жилийн, ээлжит сургалт',      icon: '🧒', color: 'from-amber-500 to-orange-500',    groupCode: 'dund' },
  { code: 'ahlah',   name: 'Ахлах бүлэг · Бэлэн багц',   subtitle: '4-5 нас · 7 хоног, сарын, жилийн, ээлжит сургалт',      icon: '🐣', color: 'from-yellow-500 to-amber-500',    groupCode: 'ahlah' },
  { code: 'beltgel', name: 'Бэлтгэл бүлэг · Бэлэн багц', subtitle: '5-6 нас · 7 хоног, сарын, жилийн, ээлжит сургалт',      icon: '🐰', color: 'from-violet-500 to-purple-500',   groupCode: 'beltgel' },
  { code: 'music',   name: 'СӨБ PRO САН · Хөгжим',       subtitle: 'Хөгжмийн багшийн иж бүрэн сан',                          icon: '🎵', color: 'from-fuchsia-500 to-pink-500' },
]

export default function BagtsPage() {
  const { me, loading: meLoading } = useMe()

  const visiblePacks = useMemo(() => {
    if (!me) return []
    const isLeader = me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich'
    if (isLeader) return PACKS
    const myCodes = new Set(me.groups.map((g) => g.code))
    const isMusicTeacher = me.groups.some((g) => g.code === 'hogjim') || me.first_name === 'Өлзийбаяр'
    return PACKS.filter((p) => {
      if (p.code === 'music') return isMusicTeacher
      return p.groupCode ? myCodes.has(p.groupCode) : true
    })
  }, [me])

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📦</div>
            <div>
              <h1 className="text-2xl font-bold">Хөтөлбөрийн бэлэн багц</h1>
              <p className="text-sm opacity-90 mt-1">Бүлэг тус бүрийн 2026-2027 оны хичээлийн жилийн иж бүрэн хөтөлбөр, төлөвлөлт</p>
            </div>
          </div>
        </div>

        {visiblePacks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">🔒</div>
            <div>Танд харуулах багц алга</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visiblePacks.map((p) => (
              <div key={p.code} className={`rounded-2xl p-5 text-white bg-gradient-to-br ${p.color} shadow-lg`}>
                <a href={`/bagts/${p.code}/index.html`} target="_blank" rel="noopener" className="flex items-center gap-4 hover:opacity-90">
                  <div className="text-5xl">{p.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold">{p.name}</div>
                    <div className="text-sm opacity-90 mt-1">{p.subtitle}</div>
                    <div className="text-[11px] opacity-75 mt-1">↗ Шинэ таб-т нээгдэнэ</div>
                  </div>
                  <div className="text-2xl opacity-80">↗</div>
                </a>
                <div className="mt-3 pt-3 border-t border-white/20 flex gap-2 flex-wrap">
                  <a href={`/heregleg?prefill=1&category=weekly&title=${encodeURIComponent(p.name)}&link=${encodeURIComponent(location.origin + `/bagts/${p.code}/index.html`)}`} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg font-medium">📤 Арга зүйч рүү илгээх</a>
                  <a href={`/bagts/${p.code}/`} target="_blank" rel="noopener" className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg">📁 Файлын жагсаалт</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
