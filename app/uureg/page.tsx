'use client'

import { useState } from 'react'
import { useMe } from '@/lib/useMe'

export default function UuregPage() {
  const { me, loading } = useMe()
  const [fullscreen, setFullscreen] = useState(false)

  if (loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  const iframeUrl = `/sub/task-manager.html?teacher=${encodeURIComponent(me?.first_name || '')}&role=${me?.role || ''}`

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <span className="font-semibold">Үүрэг даалгавар</span>
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
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📌</div>
          <div>
            <h1 className="font-bold text-lg">Үүрэг даалгаврын систем</h1>
            <p className="text-xs opacity-90">Эрхлэгч/арга зүйч даалгавар өгнө → Ажилтан хүлээн авч биелүүлнэ → Хянаж батлана{me && ` · ${me.last_name}.${me.first_name}`}</p>
          </div>
        </div>
        <button onClick={() => setFullscreen(true)} title="Бүтэн дэлгэц" className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm">⛶</button>
      </div>
      <div className="flex-1 bg-slate-100 relative">
        <iframe src={iframeUrl} className="absolute inset-0 w-full h-full border-0" title="Үүрэг даалгавар" />
      </div>
    </div>
  )
}
