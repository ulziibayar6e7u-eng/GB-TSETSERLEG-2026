'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Group = { id: number; code: string; name: string; icon: string; color: string }
type Employee = { id: string; last_name: string; first_name: string }
type WeeklyPlan = {
  id: string
  group_id: number
  author_id: string
  year: number
  month: number
  week_num: number
  theme: string | null
  method: string | null
  new_words: string[]
  outcomes: { code: string; type: string; text: string }[]
  cells: Record<string, Record<string, string>>
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  approver_id: string | null
  approver_note: string | null
  approver_level: 'excellent' | 'good' | 'revise' | null
  groups?: Group
  employees?: Employee
  approver?: Employee | null
}

const STATUS = {
  draft:     { label: 'Ноорог',     color: 'bg-slate-100 text-slate-700 border-slate-300' },
  submitted: { label: 'Хянагдаж',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved:  { label: 'Батлагдсан', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  returned:  { label: 'Буцаагдсан', color: 'bg-red-100 text-red-700 border-red-300' },
}

const MONTHS = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар']

export default function WeeklyPlansPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [plans, setPlans] = useState<WeeklyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'returned'>('all')

  const canApprove = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')
  const isTeacher = me?.role === 'bagsh' || me?.role === 'bagsh_tuslah'

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('weekly_plans')
      .select('*, groups(id, code, name, icon, color), employees:author_id(id, last_name, first_name), approver:approver_id(id, last_name, first_name)')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('week_num', { ascending: false })
      .limit(100)
    setPlans((data as unknown as WeeklyPlan[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const visible = plans.filter((p) => {
    if (isTeacher && !canApprove && me && p.author_id !== me.id) return false
    if (filter !== 'all' && p.status !== filter) return false
    return true
  })

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🎁 7 хоногийн төлөвлөгөө</h1>
            <p className="text-sm text-slate-500 mt-1">
              Гарын авлагаас автомат бөглөнө · Арга зүйч батлана
            </p>
          </div>
          {isTeacher && (
            <Link href="/tulvluguu/weekly/new" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium">
              + Шинэ төлөвлөгөө
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex gap-2 flex-wrap">
          {(['all', 'draft', 'submitted', 'approved', 'returned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {f === 'all' ? 'Бүгд' : STATUS[f].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📅</div>
            <div>Төлөвлөгөө хараахан бүртгэгдээгүй</div>
            {isTeacher && (
              <Link href="/tulvluguu/weekly/new" className="mt-4 text-blue-600 hover:text-blue-800 font-medium inline-block">
                Эхний долоо хоногийн төлөвлөгөө үүсгэх →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((p) => {
              const s = STATUS[p.status]
              return (
                <Link
                  key={p.id}
                  href={`/tulvluguu/weekly/${p.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${s.color}`}>{s.label}</span>
                        {p.groups && (
                          <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{background: p.groups.color}}>
                            {p.groups.icon} {p.groups.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {p.year} · {MONTHS[p.month - 1]} · {p.week_num}-р долоо хоног
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-800">{p.theme || 'Сэдэвгүй'}</h3>
                      <div className="text-xs text-slate-500 mt-1">
                        {p.employees && `${p.employees.last_name}.${p.employees.first_name}`}
                        {p.approver && ` · Хянасан: ${p.approver.last_name}.${p.approver.first_name}`}
                      </div>
                    </div>
                    <div className="text-right">
                      {p.approver_level === 'excellent' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">🏆 Онц сайн</span>}
                      {p.approver_level === 'good' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">✅ Сайн</span>}
                      {p.approver_level === 'revise' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">📋 Засварлах</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
