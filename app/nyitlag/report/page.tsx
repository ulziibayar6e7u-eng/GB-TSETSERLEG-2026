'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Event = { id: string; title: string; event_date: string; event_time: string|null; location: string|null }
type Att = { event_id: string; employee_id: string; status: string }
type Emp = { id: string; last_name: string; first_name: string; positions?: { name: string }|null }

const STATUS = {
  present:  { label: 'Ирсэн',        icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-500' },
  onduty:   { label: 'Ангид үлдсэн', icon: '👶', color: 'text-amber-700',   bg: 'bg-amber-500' },
  leave:    { label: 'Чөлөөтэй',     icon: '📄', color: 'text-blue-700',    bg: 'bg-blue-500' },
  skipped:  { label: 'Тасалсан',     icon: '❌', color: 'text-red-700',     bg: 'bg-red-500' },
} as const

export default function NyitlagReportPage() {
  const supabase = useMemo(() => createClient(), [])
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [events, setEvents] = useState<Event[]>([])
  const [atts, setAtts] = useState<Att[]>([])
  const [emps, setEmps] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const start = `${month}-01`
    const end = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 1).toISOString().slice(0,10)
    const [e, a, emp] = await Promise.all([
      supabase.from('public_events').select('id, title, event_date, event_time, location').gte('event_date', start).lt('event_date', end).order('event_date'),
      supabase.from('public_event_attendance').select('event_id, employee_id, status'),
      supabase.from('employees').select('id, last_name, first_name, positions(name)').order('first_name'),
    ])
    const eventList = (e.data as Event[]) || []
    setEvents(eventList)
    const eventIds = new Set(eventList.map(x => x.id))
    setAtts(((a.data as Att[]) || []).filter(x => eventIds.has(x.event_id)))
    setEmps((emp.data as Emp[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [month])

  const total = { present: 0, onduty: 0, leave: 0, skipped: 0 }
  atts.forEach(a => { if (total[a.status as keyof typeof total] !== undefined) total[a.status as keyof typeof total]++ })

  const byPerson: Record<string, { present: number; onduty: number; leave: number; skipped: number }> = {}
  emps.forEach(e => { byPerson[e.id] = { present: 0, onduty: 0, leave: 0, skipped: 0 } })
  atts.forEach(a => { if (byPerson[a.employee_id]) byPerson[a.employee_id][a.status as keyof typeof total] = (byPerson[a.employee_id][a.status as keyof typeof total] || 0) + 1 })

  const byEvent = events.map(e => {
    const at = atts.filter(a => a.event_id === e.id)
    return {
      ...e,
      present: at.filter(a => a.status === 'present').length,
      onduty: at.filter(a => a.status === 'onduty').length,
      leave: at.filter(a => a.status === 'leave').length,
      skipped: at.filter(a => a.status === 'skipped').length,
    }
  })

  function download() {
    const header = ['Ажилтан','Албан тушаал','Ирсэн','Ангид үлдсэн','Чөлөө','Тасалсан']
    const lines = [header.join(',')]
    emps.forEach(e => {
      const p = byPerson[e.id] || { present:0, onduty:0, leave:0, skipped:0 }
      lines.push([`${e.last_name}.${e.first_name}`, e.positions?.name || '', p.present, p.onduty, p.leave, p.skipped].map(v => `"${String(v).replace(/,/g,';')}"`).join(','))
    })
    lines.push([''])
    lines.push(['Үйл ажиллагаа','Огноо','Ирсэн','Ангид үлдсэн','Чөлөө','Тасалсан'].join(','))
    byEvent.forEach(e => lines.push([e.title, e.event_date, e.present, e.onduty, e.leave, e.skipped].map(v => `"${String(v).replace(/,/g,';')}"`).join(',')))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `olon-niitiin-uil-ajilгaa-${month}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const totalAll = Math.max(1, total.present + total.onduty + total.leave + total.skipped)

  return (
    <div className="p-6 lg:p-8 print:p-2">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎪</div>
              <div>
                <h1 className="text-2xl font-bold">Олон нийтийн үйл ажиллагаа — Сарын нэгтгэл</h1>
                <p className="text-sm opacity-90 mt-1">Ирц · График · CSV татах</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm" />
              <button onClick={download} className="bg-white text-purple-700 px-3 py-1.5 rounded-lg text-sm font-semibold">⬇️ CSV</button>
              <button onClick={()=>window.print()} className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg text-sm">🖨️</button>
              <a href="/nyitlag" className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg text-sm">← Буцах</a>
            </div>
          </div>
        </div>

        {loading ? <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-slate-800">{events.length}</div><div className="text-xs text-slate-500 mt-1">🎪 Нийт үйл ажиллагаа</div></div>
              {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map(k => (
                <div key={k} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className={`text-3xl font-bold ${STATUS[k].color}`}>{total[k]}</div>
                  <div className="text-xs text-slate-500 mt-1">{STATUS[k].icon} {STATUS[k].label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <div className="font-semibold text-slate-800 mb-3">📊 Төлөвийн харьцаа</div>
              <div className="h-4 bg-slate-100 rounded overflow-hidden flex mb-2">
                {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map(k => (
                  <div key={k} style={{width: `${(total[k]/totalAll)*100}%`}} className={STATUS[k].bg} title={`${STATUS[k].label}: ${total[k]}`}></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map(k => (
                  <span key={k} className="flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded ${STATUS[k].bg}`}></span>{STATUS[k].label}: <b>{total[k]}</b></span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 overflow-x-auto">
              <div className="font-semibold text-slate-800 mb-3">👥 Ажилтнаар</div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b">Ажилтан</th>
                  <th className="p-2 text-center border-b bg-emerald-50">✅</th>
                  <th className="p-2 text-center border-b bg-amber-50">👶</th>
                  <th className="p-2 text-center border-b bg-blue-50">📄</th>
                  <th className="p-2 text-center border-b bg-red-50">❌</th>
                </tr></thead>
                <tbody>
                  {emps.map(e => {
                    const p = byPerson[e.id] || { present:0, onduty:0, leave:0, skipped:0 }
                    return (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="p-2 border-b border-slate-100">
                          <div className="font-medium">{e.last_name}.{e.first_name}</div>
                          <div className="text-xs text-slate-500">{e.positions?.name || ''}</div>
                        </td>
                        <td className="p-2 text-center border-b border-slate-100 font-semibold text-emerald-700">{p.present||''}</td>
                        <td className="p-2 text-center border-b border-slate-100 font-semibold text-amber-700">{p.onduty||''}</td>
                        <td className="p-2 text-center border-b border-slate-100 font-semibold text-blue-700">{p.leave||''}</td>
                        <td className="p-2 text-center border-b border-slate-100 font-semibold text-red-700">{p.skipped||''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
              <div className="font-semibold text-slate-800 mb-3">🎪 Үйл ажиллагаанууд</div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b">Огноо</th>
                  <th className="p-2 text-left border-b">Гарчиг</th>
                  <th className="p-2 text-center border-b bg-emerald-50">✅</th>
                  <th className="p-2 text-center border-b bg-amber-50">👶</th>
                  <th className="p-2 text-center border-b bg-blue-50">📄</th>
                  <th className="p-2 text-center border-b bg-red-50">❌</th>
                </tr></thead>
                <tbody>
                  {byEvent.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-2 border-b border-slate-100">{e.event_date}</td>
                      <td className="p-2 border-b border-slate-100 font-medium">{e.title}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-emerald-700">{e.present}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-amber-700">{e.onduty}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-blue-700">{e.leave}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-red-700">{e.skipped}</td>
                    </tr>
                  ))}
                  {byEvent.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Тухайн сард үйл ажиллагаа алга</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
