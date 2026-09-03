'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Section = { id: number; age_group: string; month: number | null; section_title: string; content: string }

const AGE_LABEL: Record<string, string> = {
  baga: 'Бага', dund: 'Дунд', ahlah: 'Ахлах', beltgel: 'Бэлтгэл',
}

export default function GuideViewer({
  ageGroup,
  month,
  onClose,
}: {
  ageGroup: string
  month?: number
  onClose: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [sections, setSections] = useState<Section[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('curriculum_guides')
        .select('*')
        .eq('age_group', ageGroup)
        .order('sort_order')
      const list = (data as Section[]) || []
      setSections(list)
      if (list.length > 0) {
        const target = month ? list.find((s) => s.month === month) : list[0]
        setActiveId(target?.id || list[0].id)
      }
      setLoading(false)
    })()
  }, [ageGroup, month, supabase])

  const active = sections.find((s) => s.id === activeId)
  const filteredContent = search && active ? active.content.split('\n').filter((line) => line.toLowerCase().includes(search.toLowerCase())).join('\n') : active?.content

  function copy(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-stretch justify-end z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">📖 Гарын авлага</h2>
            <p className="text-xs text-slate-500 mt-0.5">{AGE_LABEL[ageGroup] || ageGroup} бүлэг</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">Ачааллаж байна...</div>
        ) : sections.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 p-6 text-center text-sm">
            Гарын авлага импортлогдоогүй байна.<br/>
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">node import_guides.mjs</code> ажиллуулна уу.
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-slate-100 flex gap-2 overflow-x-auto">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                    activeId === s.id ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {s.month ? `${s.month}-р сар` : 'Ерөнхий'}
                </button>
              ))}
            </div>
            <div className="p-3 border-b border-slate-100">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Хайх (мөрөөр)..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {active && (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">{active.section_title}</h3>
                  <button onClick={() => copy(active.content)} className="text-xs text-blue-600 hover:text-blue-800">
                    📋 Хуулах
                  </button>
                </div>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {filteredContent}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
