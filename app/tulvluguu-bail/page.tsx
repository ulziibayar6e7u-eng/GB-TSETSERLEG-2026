'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { PLAN_TYPES, PHASES } from '@/lib/orgPlanTypes'

type Doc = { plan_type: string; phase: string; status: string }

export default function TulvBailPage() {
  const supabase = useMemo(() => createClient(), [])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [pending, setPending] = useState<Record<string, number>>({})

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('org_plan_documents').select('plan_type, phase, status')
      const c: Record<string, number> = {}
      const p: Record<string, number> = {}
      ;(data as Doc[] || []).forEach((d) => {
        c[d.plan_type] = (c[d.plan_type] || 0) + 1
        if (d.status === 'submitted') p[d.plan_type] = (p[d.plan_type] || 0) + 1
      })
      setCounts(c)
      setPending(p)
    })()
  }, [supabase])

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">📆 Байгууллагын төлөвлөгөө</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ажилтан төлөвлөгөө, биелэлт, тайлан → Эрхлэгч хянаж, зөвлөгөө өгч баталгаажуулна
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(PLAN_TYPES).map(([key, t]) => (
            <Link
              key={key}
              href={`/tulvluguu-bail/${key}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 transition group relative"
            >
              {pending[key] > 0 && (
                <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pending[key]} хянах
                </span>
              )}
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-xl text-white shadow-sm mb-3`}>{t.icon}</div>
              <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition">{t.label}</div>
              <div className="text-sm text-slate-500 mt-1">{t.desc}</div>
              <div className="text-xs text-slate-400 mt-3">
                Нийт {counts[key] || 0} баримт · {PHASES.length} горим
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
