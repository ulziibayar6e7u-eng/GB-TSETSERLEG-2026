'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Employee = { id: string; last_name: string; first_name: string; role: string; positions?: { name: string } }
type StaffStatus = 'irsen' | 'hotsorson' | 'chuluutei' | 'uvchtei' | 'tomilolt' | 'tasalsan'
type StaffAtt = { id: string; employee_id: string; date: string; status: StaffStatus; note: string | null }

const STATUS_META: Record<StaffStatus, { label: string; short: string; color: string; bg: string }> = {
  irsen:     { label: 'Ирсэн',      short: 'И', color: 'text-emerald-700', bg: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300' },
  hotsorson: { label: 'Хоцорсон',   short: 'Х', color: 'text-amber-700',   bg: 'bg-amber-100 hover:bg-amber-200 border-amber-300' },
  chuluutei: { label: 'Чөлөөтэй',   short: 'Ч', color: 'text-blue-700',    bg: 'bg-blue-100 hover:bg-blue-200 border-blue-300' },
  uvchtei:   { label: 'Өвчтэй',     short: 'Ө', color: 'text-purple-700',  bg: 'bg-purple-100 hover:bg-purple-200 border-purple-300' },
  tomilolt:  { label: 'Томилолт',   short: 'Т', color: 'text-cyan-700',    bg: 'bg-cyan-100 hover:bg-cyan-200 border-cyan-300' },
  tasalsan:  { label: 'Тасалсан',   short: 'Т', color: 'text-red-700',     bg: 'bg-red-100 hover:bg-red-200 border-red-300' },
}

function today() { return new Date().toISOString().split('T')[0] }

export default function IrtsStaffPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [isOnDuty, setIsOnDuty] = useState(false)
  const canMark = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich' || isOnDuty)
  const [date, setDate] = useState(today())
  const [emps, setEmps] = useState<Employee[]>([])
  const [attMap, setAttMap] = useState<Map<string, StaffAtt>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [e, a, duty] = await Promise.all([
        supabase.from('employees').select('id, last_name, first_name, role, positions(name)').order('first_name'),
        supabase.from('staff_attendance').select('*').eq('date', date),
        me ? supabase.from('duty_schedules').select('id').eq('date', date).eq('teacher_id', me.id).maybeSingle() : Promise.resolve({ data: null }),
      ])
      setIsOnDuty(!!(duty as { data: unknown }).data)
      setEmps((e.data as unknown as Employee[]) || [])
      const m = new Map<string, StaffAtt>()
      ;((a.data as StaffAtt[]) || []).forEach((r) => m.set(r.employee_id, r))
      setAttMap(m)
      setLoading(false)
    })()
  }, [date, supabase, me])

  async function mark(employee_id: string, status: StaffStatus) {
    if (!me || !canMark) return
    setSaving(employee_id)
    const existing = attMap.get(employee_id)
    if (existing) {
      const { data } = await supabase.from('staff_attendance').update({ status, marked_by: me.id, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single()
      if (data) attMap.set(employee_id, data as StaffAtt)
    } else {
      const { data } = await supabase.from('staff_attendance').insert({ employee_id, date, status, marked_by: me.id }).select().single()
      if (data) attMap.set(employee_id, data as StaffAtt)
    }
    setAttMap(new Map(attMap))
    setSaving(null)
  }

  const stats = useMemo(() => {
    const s: Record<StaffStatus | 'tulmen', number> = { irsen: 0, hotsorson: 0, chuluutei: 0, uvchtei: 0, tomilolt: 0, tasalsan: 0, tulmen: 0 }
    emps.forEach((e) => {
      const a = attMap.get(e.id)
      if (a) s[a.status]++
      else s.tulmen++
    })
    return s
  }, [emps, attMap])

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ажилтны ирц</h1>
            <p className="text-sm text-slate-500 mt-1">Өдөр тутмын ажилтны ирцийн бүртгэл · Дархад автоматаар хадгалагдана</p>
          </div>
          <button onClick={() => history.back()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">← Буцах</button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-1">Огноо</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center"><div className="text-xl font-bold text-slate-800">{emps.length}</div><div className="text-xs text-slate-500">Бүгд</div></div>
          {(Object.keys(STATUS_META) as StaffStatus[]).map((s) => (
            <div key={s} className={`rounded-xl border p-3 text-center ${STATUS_META[s].bg}`}>
              <div className={`text-xl font-bold ${STATUS_META[s].color}`}>{stats[s]}</div>
              <div className={`text-xs ${STATUS_META[s].color}`}>{STATUS_META[s].label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {emps.map((e, i) => {
                const att = attMap.get(e.id)
                return (
                  <div key={e.id} className="p-4 flex items-center gap-3 hover:bg-slate-50">
                    <div className="w-8 text-center text-sm text-slate-400">{i + 1}</div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-sm font-semibold flex-shrink-0">{e.first_name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{e.last_name}.{e.first_name}</div>
                      <div className="text-xs text-slate-500 truncate">{e.positions?.name || e.role}</div>
                      {att && <div className={`text-xs mt-0.5 ${STATUS_META[att.status].color}`}>{STATUS_META[att.status].label}{att.note && ` · ${att.note}`}</div>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                      {(Object.keys(STATUS_META) as StaffStatus[]).map((s) => (
                        <button key={s} onClick={() => mark(e.id, s)} disabled={!canMark || saving === e.id} title={STATUS_META[s].label}
                          className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition ${att?.status === s ? `${STATUS_META[s].bg} ${STATUS_META[s].color} ring-2 ring-offset-1 ring-slate-400` : 'border-slate-200 text-slate-400 hover:border-slate-300'} ${!canMark ? 'cursor-not-allowed opacity-60' : ''}`}>
                          {STATUS_META[s].short}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
