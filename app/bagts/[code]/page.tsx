'use client'

import Link from 'next/link'
import { use, useState } from 'react'

const PACK_META: Record<string, { name: string; icon: string; color: string }> = {
  baga:    { name: 'Бага бүлэг',     icon: '👶', color: 'from-pink-500 to-rose-500' },
  dund:    { name: 'Дунд бүлэг',     icon: '🧒', color: 'from-amber-500 to-orange-500' },
  ahlah:   { name: 'Ахлах бүлэг',    icon: '🐣', color: 'from-yellow-500 to-amber-500' },
  beltgel: { name: 'Бэлтгэл бүлэг',  icon: '🐰', color: 'from-violet-500 to-purple-500' },
  music:   { name: 'СӨБ PRO САН · Хөгжим', icon: '🎵', color: 'from-fuchsia-500 to-pink-500' },
}

export default function BagtsViewer({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const meta = PACK_META[code]
  const [fullscreen, setFullscreen] = useState(false)

  if (!meta) return <div className="p-8 text-slate-500">Багц олдсонгүй</div>

  const src = `/bagts/${code}/index.html`

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className={`bg-gradient-to-r ${meta.color} text-white px-4 py-2 flex items-center justify-between`}>
          <div className="flex items-center gap-2"><span>{meta.icon}</span><span className="font-semibold">{meta.name} · Бэлэн багц</span></div>
          <button onClick={() => setFullscreen(false)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm">✕ Хаах</button>
        </div>
        <iframe src={src} className="flex-1 w-full border-0" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className={`bg-gradient-to-r ${meta.color} text-white px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">{meta.icon}</div>
          <div>
            <h1 className="font-bold text-lg">{meta.name} · Бэлэн багц</h1>
            <p className="text-xs opacity-90">2026-2027 оны хичээлийн жил</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/bagts" className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm">← Буцах</Link>
          <button onClick={() => setFullscreen(true)} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm">⛶ Дэлгэц</button>
        </div>
      </div>
      <div className="flex-1 bg-slate-100 relative">
        <iframe src={src} className="absolute inset-0 w-full h-full border-0" />
      </div>
    </div>
  )
}
