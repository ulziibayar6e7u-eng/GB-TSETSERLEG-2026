'use client'

import { useState } from 'react'
import { useMe } from '@/lib/useMe'

export default function HugjilPage() {
  const { me, loading } = useMe()
  const [fullscreen, setFullscreen] = useState(false)

  if (loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const isAllAccess = me?.is_admin || me?.role === 'erhlegch' || me?.role === 'arga_zuich' || me?.first_name === 'Өлзийбаяр' || me?.groups.some((g) => g.code === 'hogjim')
  const groupParam = isAllAccess ? '' : me?.groups[0]?.code || ''
  const iframeUrl = `/hogjim/index.html?view=assessGroups&teacher=${encodeURIComponent(me?.first_name || '')}${groupParam ? `&group=${groupParam}` : ''}`

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span className="font-semibold">Хүүхдийн хөгжлийн ахиц</span>
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
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📊</div>
          <div>
            <h1 className="font-bold text-lg">Хүүхдийн хөгжлийн ахиц</h1>
            <p className="text-xs opacity-90">Гараа · Явц · Үр дүн · Шалгуур{me && ` · ${me.last_name}.${me.first_name}`}</p>
          </div>
        </div>
        <button onClick={() => setFullscreen(true)} title="Бүтэн дэлгэц" className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm">⛶</button>
      </div>
      <div className="flex-1 bg-slate-100 relative">
        <iframe src={iframeUrl} className="absolute inset-0 w-full h-full border-0" title="Хүүхдийн хөгжлийн үнэлгээ" />
      </div>
    </div>
  )
}
