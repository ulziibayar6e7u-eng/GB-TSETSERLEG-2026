'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Group = { id: number; code: string; name: string; icon: string; color: string }
type Child = { id: string; last_name: string; first_name: string; group_id: number | null; groups?: Group }
type AttStatus = 'irsen' | 'iree_gui' | 'chuluutei' | 'uvchtei'
type Attendance = { id: string; child_id: string; date: string; status: AttStatus; note: string | null }

const STATUS_META: Record<AttStatus, { label: string; color: string; bg: string; short: string }> = {
  irsen:     { label: 'Ирсэн',    short: 'И',  color: 'text-emerald-700', bg: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300' },
  iree_gui:  { label: 'Ирээгүй',  short: 'Х', color: 'text-red-700',     bg: 'bg-red-100 hover:bg-red-200 border-red-300' },
  chuluutei: { label: 'Чөлөөтэй', short: 'Ч',  color: 'text-amber-700',   bg: 'bg-amber-100 hover:bg-amber-200 border-amber-300' },
  uvchtei:   { label: 'Өвчтэй',   short: 'Ө',  color: 'text-purple-700',  bg: 'bg-purple-100 hover:bg-purple-200 border-purple-300' },
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function IrtsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [date, setDate] = useState(today())
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState<number | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [attMap, setAttMap] = useState<Map<string, Attendance>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: g } = await supabase.from('groups').select('*').order('id')
      const gs = (g as Group[]) || []
      setGroups(gs)

      if (!me) return
      const canAll = canSeeAllChildren(me.role, me.is_admin)
      if (canAll) {
        setGroupId((prev) => prev ?? gs[0]?.id ?? null)
      } else if (me.groups.length > 0) {
        setGroupId((prev) => prev ?? me.groups[0].id)
      }
    })()
  }, [me, supabase])

  useEffect(() => {
    if (!groupId) return
    ;(async () => {
      setLoading(true)
      const [c, a] = await Promise.all([
        supabase.from('children').select('*, groups(*)').eq('group_id', groupId).eq('status', 'active').order('last_name'),
        supabase.from('attendance').select('*').eq('date', date),
      ])
      setChildren((c.data as Child[]) || [])
      const m = new Map<string, Attendance>()
      ;(a.data as Attendance[] || []).forEach((row) => m.set(row.child_id, row))
      setAttMap(m)
      setLoading(false)
    })()
  }, [groupId, date, supabase])

  async function mark(child_id: string, status: AttStatus) {
    if (!me) return
    setSaving(child_id)
    const existing = attMap.get(child_id)
    if (existing) {
      const { data } = await supabase
        .from('attendance')
        .update({ status, marked_by: me.id, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) attMap.set(child_id, data as Attendance)
    } else {
      const { data } = await supabase
        .from('attendance')
        .insert({ child_id, date, status, marked_by: me.id })
        .select()
        .single()
      if (data) attMap.set(child_id, data as Attendance)
    }
    setAttMap(new Map(attMap))
    setSaving(null)
  }

  async function markAll(status: AttStatus) {
    if (!me || children.length === 0) return
    if (!confirm(`Бүх хүүхдийг "${STATUS_META[status].label}" гэж тэмдэглэх үү?`)) return
    setLoading(true)
    const rows = children.map((c) => ({
      child_id: c.id,
      date,
      status,
      marked_by: me.id,
    }))
    await supabase.from('attendance').upsert(rows, { onConflict: 'child_id,date' })
    const { data: a } = await supabase.from('attendance').select('*').eq('date', date)
    const m = new Map<string, Attendance>()
    ;(a as Attendance[] || []).forEach((row) => m.set(row.child_id, row))
    setAttMap(m)
    setLoading(false)
  }

  const stats = useMemo(() => {
    const s = { irsen: 0, iree_gui: 0, chuluutei: 0, uvchtei: 0, tulmen: 0 }
    children.forEach((c) => {
      const a = attMap.get(c.id)
      if (a) s[a.status]++
      else s.tulmen++
    })
    return s
  }, [children, attMap])

  const excludedCodes = new Set(['hogjim', 'huvilbart'])
  const currentGroup = groups.find((g) => g.id === groupId)
  const availableGroups = (me && !canSeeAllChildren(me.role, me.is_admin)
    ? groups.filter((g) => me.groups.some((mg) => mg.id === g.id))
    : groups
  ).filter((g) => !excludedCodes.has(g.code))

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Хүүхдийн ирц</h1>
            <p className="text-sm text-slate-500 mt-1">Өдөр тутмын ирцийн бүртгэл · Дархад автоматаар хадгалагдана</p>
          </div>
          <button onClick={() => history.back()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">← Буцах</button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Огноо</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Бүлэг</label>
              <select
                value={groupId ?? ''}
                onChange={(e) => setGroupId(parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{children.length}</div>
            <div className="text-xs text-slate-500 mt-1">Бүх хүүхэд</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{stats.irsen}</div>
            <div className="text-xs text-emerald-600 mt-1">Ирсэн</div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{stats.iree_gui}</div>
            <div className="text-xs text-red-600 mt-1">Ирээгүй</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{stats.chuluutei}</div>
            <div className="text-xs text-amber-600 mt-1">Чөлөөтэй</div>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.uvchtei}</div>
            <div className="text-xs text-purple-600 mt-1">Өвчтэй</div>
          </div>
        </div>

        {children.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Бүгд тэмдэглэх:</span>
            {(Object.keys(STATUS_META) as AttStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => markAll(s)}
                className={`px-3 py-1 rounded-lg border text-xs ${STATUS_META[s].bg} ${STATUS_META[s].color}`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
          ) : children.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              {currentGroup ? `"${currentGroup.name}"-т хүүхэд бүртгэгдээгүй` : 'Бүлэг сонгоно уу'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {children.map((c, i) => {
                const att = attMap.get(c.id)
                return (
                  <div key={c.id} className="p-4 flex items-center gap-3 hover:bg-slate-50">
                    <div className="w-8 text-center text-sm text-slate-400">{i + 1}</div>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ background: c.groups?.color || '#3b82f6' }}
                    >
                      {c.first_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {c.last_name}.{c.first_name}
                      </div>
                      {att && (
                        <div className={`text-xs ${STATUS_META[att.status].color}`}>
                          {STATUS_META[att.status].label}
                          {att.note && ` · ${att.note}`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {(Object.keys(STATUS_META) as AttStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => mark(c.id, s)}
                          disabled={saving === c.id}
                          title={STATUS_META[s].label}
                          className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition ${
                            att?.status === s
                              ? `${STATUS_META[s].bg} ${STATUS_META[s].color} ring-2 ring-offset-1 ring-slate-400`
                              : 'border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
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
