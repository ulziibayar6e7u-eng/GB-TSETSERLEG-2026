'use client'

import { useState } from 'react'
import { useMe } from '@/lib/useMe'

type Tab = { key: string; label: string; icon: string; url: string }

const TABS: Tab[] = [
  { key: 'plan',       label: 'Хөтөлбөр',       icon: '📋', url: '/hogjim/index.html?view=planGroups' },
  { key: 'yearly',     label: 'Жилийн матриц',    icon: '📆', url: '/hogjim/index.html?view=yearlyPlans' },
  { key: 'monthly',    label: 'Сарын тайлан',    icon: '📅', url: '/hogjim/index.html?view=monthlyReport' },
  { key: 'lessons',    label: 'Хичээлүүд',       icon: '📖', url: '/hogjim/index.html?view=elements' },
]

export default function HogjimPlanPage() {
  const { me, loading } = useMe()
  const [active, setActive] = useState<Tab>(TABS[0])
  const [fullscreen, setFullscreen] = useState(false)

  if (loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const iframeUrl = `${active.url}&teacher=${encodeURIComponent(me?.first_name || '')}`

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{active.icon}</span>
            <span className="font-semibold">Хөгжим · {active.label}</span>
          </div>
          <button onClick={() => setFullscreen(false)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm">
            ✕ Хаах
          </button>
        </div>
        <iframe src={iframeUrl} className="flex-1 w-full border-0" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎵</div>
            <div>
              <h1 className="font-bold text-lg">Хөгжмийн хөтөлбөр төлөвлөгөө</h1>
              <p className="text-xs opacity-90">{active.label}{me && ` · ${me.last_name}.${me.first_name}`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  active.key === t.key ? 'bg-white text-purple-700 shadow' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
            <button onClick={() => setFullscreen(true)} title="Бүтэн дэлгэц" className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm">⛶</button>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-slate-100 relative">
        <iframe key={active.key} src={iframeUrl} className="absolute inset-0 w-full h-full border-0" title={active.label} />
      </div>
    </div>
  )
}
