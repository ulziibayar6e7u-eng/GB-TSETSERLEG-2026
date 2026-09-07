'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Routine = 'rinse' | 'wash' | 'brush'
type Log = {
  id: string
  date: string
  routine: Routine
  group_id: number | null
  author_id: string | null
  children_count: number | null
  morning_time: string | null
  day_time: string | null
  evening_time: string | null
  monitor_name: string | null
  note: string | null
}
type Group = { id: number; code: string; name: string; icon: string; color: string }

const ROUTINES: Record<Routine, { icon: string; label: string; slots: ('morning' | 'day' | 'evening')[] }> = {
  rinse: { icon: '💧', label: 'Ам зайлсан тэмдэглэл',    slots: ['morning', 'evening'] },
  wash:  { icon: '🧼', label: 'Гар угаасан тэмдэглэл',    slots: ['morning', 'day', 'evening'] },
  brush: { icon: '🦷', label: 'Шүд угаасан тэмдэглэл',    slots: ['day'] },
}
const SLOT_LABEL = { morning: 'Өглөө', day: 'Өдөр', evening: 'Орой' }

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function HygienePage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const initial = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const [routine, setRoutine] = useState<Routine>((initial?.get('routine') as Routine) || 'rinse')
  const [month, setMonth] = useState(initial?.get('month') || currentMonth())
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState<number | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [row, setRow] = useState({ date: '', children_count: '', morning_time: '', day_time: '', evening_time: '', monitor_name: '' })

  useEffect(() => {
    (async () => {
      const { data: g } = await supabase.from('groups').select('id, code, name, icon, color').not('code', 'in', '(hogjim,huvilbart)').order('id')
      const gs = (g as Group[]) || []
      setGroups(gs)
      if (me) {
        if (canSeeAllChildren(me.role, me.is_admin)) setGroupId((prev) => prev ?? gs[0]?.id ?? null)
        else if (me.groups.length > 0) setGroupId((prev) => prev ?? me.groups[0].id)
      }
    })()
  }, [me, supabase])

  async function load() {
    if (!groupId) return
    setLoading(true)
    const start = month + '-01'
    const end = month + '-31'
    const { data } = await supabase.from('hygiene_log').select('*').eq('routine', routine).eq('group_id', groupId).gte('date', start).lte('date', end).order('date')
    setLogs((data as Log[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [routine, groupId, month])

  async function saveRow() {
    if (!me || !groupId || !row.date) return
    const payload = {
      date: row.date,
      routine,
      group_id: groupId,
      author_id: me.id,
      children_count: row.children_count ? parseInt(row.children_count) : null,
      morning_time: row.morning_time || null,
      day_time: row.day_time || null,
      evening_time: row.evening_time || null,
      monitor_name: row.monitor_name || null,
    }
    if (editingId) {
      await supabase.from('hygiene_log').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
    } else {
      await supabase.from('hygiene_log').upsert(payload, { onConflict: 'date,routine,group_id' })
    }
    setEditingId(null)
    setRow({ date: '', children_count: '', morning_time: '', day_time: '', evening_time: '', monitor_name: '' })
    load()
  }
  async function removeRow(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('hygiene_log').delete().eq('id', id)
    load()
  }
  function editRow(l: Log) {
    setEditingId(l.id)
    setRow({
      date: l.date,
      children_count: l.children_count?.toString() || '',
      morning_time: l.morning_time || '',
      day_time: l.day_time || '',
      evening_time: l.evening_time || '',
      monitor_name: l.monitor_name || '',
    })
  }

  function downloadCsv() {
    const r = ROUTINES[routine]
    const grp = groups.find((g) => g.id === groupId)
    const header = ['№', 'Огноо', 'Хүүхдийн тоо', ...r.slots.map((s) => SLOT_LABEL[s]), 'Хянасан хүн']
    const rows = [header]
    logs.forEach((l, i) => {
      const arr: string[] = [String(i + 1), l.date, l.children_count?.toString() || '']
      r.slots.forEach((s) => {
        const v = s === 'morning' ? l.morning_time : s === 'day' ? l.day_time : l.evening_time
        arr.push(v || '')
      })
      arr.push(l.monitor_name || '')
      rows.push(arr)
    })
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${grp?.name || ''}_${r.label}_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null
  const r = ROUTINES[routine]
  const grp = groups.find((g) => g.id === groupId)
  const availableGroups = canSeeAllChildren(me.role, me.is_admin) ? groups : groups.filter((g) => me.groups.some((mg) => mg.id === g.id))

  return (
    <div className="p-6 lg:p-8 print:p-2">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🧴 Хүүхдийн ариун цэврийн журнал</h1>
            <p className="text-sm text-slate-500 mt-1">Багшийн туслах өдөр тутам хөтлөх тэмдэглэл</p>
          </div>
          <Link href={me.id ? `/tuslah/${me.id}?tab=dadal` : '/'} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">← Буцах</Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap items-center print:hidden">
          {(Object.keys(ROUTINES) as Routine[]).map((k) => (
            <button key={k} onClick={() => setRoutine(k)} className={`px-3 py-2 rounded-lg text-sm font-medium ${routine === k ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              {ROUTINES[k].icon} {ROUTINES[k].label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-3 flex-wrap items-center print:hidden">
          <select value={groupId || ''} onChange={(e) => setGroupId(parseInt(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {availableGroups.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
          </select>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <div className="ml-auto flex gap-2">
            <button onClick={() => window.print()} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">🖨 Хэвлэх</button>
            <button onClick={downloadCsv} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-medium">📥 CSV татах</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="text-center py-3 border-b border-slate-200">
            <h2 className="font-bold text-slate-800">{grp?.name?.toUpperCase()} БҮЛГИЙН ХҮҮХДИЙН {r.label.split(' ').slice(1).join(' ').toUpperCase()}</h2>
            <div className="text-xs text-slate-500 mt-1">{month.split('-')[0]} оны {parseInt(month.split('-')[1])}-р сар</div>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 border border-slate-200 text-xs font-semibold text-slate-600 w-12">№</th>
                  <th className="p-2 border border-slate-200 text-xs font-semibold text-slate-600 w-28">Сар өдөр</th>
                  <th className="p-2 border border-slate-200 text-xs font-semibold text-slate-600 w-24">Хүүхдийн тоо</th>
                  {r.slots.map((s) => <th key={s} className="p-2 border border-slate-200 text-xs font-semibold text-slate-600">Хугацаа — {SLOT_LABEL[s]}</th>)}
                  <th className="p-2 border border-slate-200 text-xs font-semibold text-slate-600">Хянасан хүн</th>
                  <th className="p-2 border border-slate-200 print:hidden w-24"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 text-center text-slate-500">{i + 1}</td>
                    <td className="p-2 border border-slate-200 text-slate-800 whitespace-nowrap">{l.date.slice(5)}</td>
                    <td className="p-2 border border-slate-200 text-center font-medium">{l.children_count || ''}</td>
                    {r.slots.map((s) => {
                      const v = s === 'morning' ? l.morning_time : s === 'day' ? l.day_time : l.evening_time
                      return <td key={s} className="p-2 border border-slate-200 text-center text-xs">{v || ''}</td>
                    })}
                    <td className="p-2 border border-slate-200 text-xs">{l.monitor_name || ''}</td>
                    <td className="p-1 border border-slate-200 text-center print:hidden">
                      <button onClick={() => editRow(l)} className="text-blue-600 hover:text-blue-800 text-xs mr-2">✏️</button>
                      <button onClick={() => removeRow(l.id)} className="text-red-600 hover:text-red-800 text-xs">🗑</button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={r.slots.length + 5} className="p-8 text-center text-slate-400 text-sm">Тухайн сард бичлэг алга — доор нэмэх боломжтой</td></tr>
                )}
                {/* Мөр нэмэх/засах */}
                <tr className="bg-emerald-50 print:hidden">
                  <td className="p-2 border border-slate-200 text-center text-emerald-700 font-semibold">{editingId ? '✏️' : '+'}</td>
                  <td className="p-1 border border-slate-200"><input type="date" value={row.date} onChange={(e) => setRow({ ...row, date: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></td>
                  <td className="p-1 border border-slate-200"><input type="number" value={row.children_count} onChange={(e) => setRow({ ...row, children_count: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-center" placeholder="18" /></td>
                  {r.slots.map((s) => {
                    const val = s === 'morning' ? row.morning_time : s === 'day' ? row.day_time : row.evening_time
                    const setVal = (v: string) => setRow({ ...row, [s === 'morning' ? 'morning_time' : s === 'day' ? 'day_time' : 'evening_time']: v })
                    return <td key={s} className="p-1 border border-slate-200"><input value={val} onChange={(e) => setVal(e.target.value)} placeholder="9:30-9:40" className="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></td>
                  })}
                  <td className="p-1 border border-slate-200"><input value={row.monitor_name} onChange={(e) => setRow({ ...row, monitor_name: e.target.value })} placeholder="Гарын үсэг" className="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></td>
                  <td className="p-1 border border-slate-200 text-center">
                    <button onClick={saveRow} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 rounded">{editingId ? 'Хадгал' : '+'}</button>
                    {editingId && <button onClick={() => { setEditingId(null); setRow({ date: '', children_count: '', morning_time: '', day_time: '', evening_time: '', monitor_name: '' }) }} className="ml-1 text-xs text-slate-500">×</button>}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <div className="text-center py-3 border-t border-slate-200 text-xs text-slate-600">
            ТЭМДЭГЛЭЛ ХӨТӨЛСӨН: <b>БАГШИЙН ТУСЛАХ {me.last_name?.[0]}. {me.first_name}</b>
          </div>
        </div>
      </div>
    </div>
  )
}
