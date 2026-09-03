'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Group = { id: number; code: string; name: string; icon: string; color: string }
type Employee = { id: string; last_name: string; first_name: string }
type MonthlyPlan = {
  id: string
  group_id: number
  author_id: string
  year: number
  month: number
  theme: string | null
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  approver_level: 'excellent' | 'good' | 'revise' | null
  groups?: Group
  employees?: Employee
}

const STATUS = {
  draft:     { label: 'Ноорог',     color: 'bg-slate-100 text-slate-700 border-slate-300' },
  submitted: { label: 'Хянагдаж',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved:  { label: 'Батлагдсан', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  returned:  { label: 'Буцаагдсан', color: 'bg-red-100 text-red-700 border-red-300' },
}

const MONTHS = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар']

export default function MonthlyPlansPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [plans, setPlans] = useState<MonthlyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'returned'>('all')

  const canApprove = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')
  const isTeacher = me?.role === 'bagsh' || me?.role === 'bagsh_tuslah'

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('monthly_plans')
      .select('id, group_id, author_id, year, month, theme, status, approver_level, groups(id, code, name, icon, color), employees:author_id(id, last_name, first_name)')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(100)
    setPlans((data as unknown as MonthlyPlan[]) || [])
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
            <h1 className="text-2xl font-bold text-slate-800">📅 Сарын төлөвлөгөө</h1>
            <p className="text-sm text-slate-500 mt-1">Сарын сэдэв, зорилго, 4-5 долоо хоногийн товчлол</p>
          </div>
          {isTeacher && (
            <Link href="/tulvluguu/monthly/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium">
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
              <Link href="/tulvluguu/monthly/new" className="mt-4 text-blue-600 hover:text-blue-800 font-medium inline-block">
                Эхний сарын төлөвлөгөө үүсгэх →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map((p) => {
              const s = STATUS[p.status]
              return (
                <Link
                  key={p.id}
                  href={`/tulvluguu/monthly/${p.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm hover:border-blue-300 transition"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${s.color}`}>{s.label}</span>
                    {p.groups && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{background: p.groups.color}}>
                        {p.groups.icon} {p.groups.name}
                      </span>
                    )}
                    {p.approver_level === 'excellent' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">🏆</span>}
                    {p.approver_level === 'good' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">✅</span>}
                    {p.approver_level === 'revise' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">📋</span>}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {p.year} · {MONTHS[p.month - 1]}
                  </div>
                  {p.theme && <div className="text-sm text-slate-600 mt-1">{p.theme}</div>}
                  {p.employees && (
                    <div className="text-xs text-slate-500 mt-2">{p.employees.last_name}.{p.employees.first_name}</div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
