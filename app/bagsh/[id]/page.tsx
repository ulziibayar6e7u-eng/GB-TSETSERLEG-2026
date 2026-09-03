'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Employee = { id: string; last_name: string; first_name: string; role: string; is_admin: boolean; positions?: { name: string } }
type Observation = { id: string; date: string; activity: string | null; observation: string; children?: { last_name: string; first_name: string } }
type Plan = { id: string; title: string; status: string; period_start: string; content: string | null }

export default function BagshDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [emp, setEmp] = useState<Employee | null>(null)
  const [obs, setObs] = useState<Observation[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [workspace, setWorkspace] = useState<{ name: string; icon: string; color: string; kind: 'group' | 'club' } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!me) return
    if (!canSeeAllChildren(me.role, me.is_admin)) { setLoading(false); return }
    ;(async () => {
      const [e, o, p, gt, cl] = await Promise.all([
        supabase.from('employees').select('id, last_name, first_name, role, is_admin, positions(name)').eq('id', id).maybeSingle(),
        supabase.from('observations').select('id, date, activity, observation, children(last_name, first_name)').eq('observer_id', id).order('date', {ascending: false}).limit(50),
        supabase.from('plans').select('id, title, status, period_start, content').eq('author_id', id).order('period_start', {ascending: false}).limit(30),
        supabase.from('group_teachers').select('role_in_group, groups(name, icon, color)').eq('employee_id', id).eq('role_in_group', 'bagsh').limit(1).maybeSingle(),
        supabase.from('clubs').select('name, icon, color').eq('teacher_id', id).limit(1).maybeSingle(),
      ])
      setEmp(e.data as unknown as Employee)
      setObs((o.data as unknown as Observation[]) || [])
      setPlans((p.data as Plan[]) || [])
      const gtRow = gt.data as unknown as { groups?: { name: string; icon: string; color: string } } | null
      const clRow = cl.data as { name: string; icon: string; color: string } | null
      if (clRow) setWorkspace({ ...clRow, kind: 'club' })
      else if (gtRow?.groups) setWorkspace({ ...gtRow.groups, kind: 'group' })
      setLoading(false)
    })()
  }, [id, me, supabase])

  if (meLoading || loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me || !canSeeAllChildren(me.role, me.is_admin)) return <div className="p-8 text-slate-500">Эрх байхгүй</div>
  if (!emp) return <div className="p-8 text-slate-500">Багш олдсонгүй</div>

  const bg = workspace?.color || '#6366f1'

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/bagsh" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Багш нар руу буцах</Link>

        <div className="rounded-2xl p-6 text-white mb-6" style={{ background: `linear-gradient(135deg, ${bg}, ${bg}dd)` }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur">
              {emp.first_name[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{emp.last_name}.{emp.first_name}</h1>
              <p className="text-sm opacity-90">{emp.positions?.name}</p>
              {workspace && (
                <div className="text-sm opacity-80 mt-1">
                  {workspace.icon} {workspace.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">🎯 Ажиглалт ({obs.length})</h2>
              <Link href="/ajigllt" className="text-xs text-blue-600 hover:text-blue-800">Бүгд →</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {obs.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Ажиглалт байхгүй</div>
              ) : (
                obs.map((o) => (
                  <div key={o.id} className="p-3">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="font-medium text-sm text-slate-800">
                        {o.children ? `${o.children.last_name}.${o.children.first_name}` : 'Хүүхэд'}
                      </div>
                      <div className="text-xs text-slate-400 flex-shrink-0">{o.date}</div>
                    </div>
                    {o.activity && <div className="text-xs text-slate-500 mb-1">{o.activity}</div>}
                    <div className="text-sm text-slate-600 line-clamp-2">{o.observation}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">📅 Төлөвлөгөө ({plans.length})</h2>
              <Link href="/tulvluguu" className="text-xs text-blue-600 hover:text-blue-800">Бүгд →</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {plans.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Төлөвлөгөө байхгүй</div>
              ) : (
                plans.map((p) => {
                  const statusIcon = p.status === 'approved' ? '✅' : p.status === 'submitted' ? '🕐' : p.status === 'returned' ? '↩️' : '📝'
                  return (
                    <div key={p.id} className="p-3">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="font-medium text-sm text-slate-800">
                          <span className="mr-1">{statusIcon}</span>
                          {p.title}
                        </div>
                        <div className="text-xs text-slate-400 flex-shrink-0">{p.period_start}</div>
                      </div>
                      {p.content && <div className="text-sm text-slate-600 line-clamp-2">{p.content}</div>}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
