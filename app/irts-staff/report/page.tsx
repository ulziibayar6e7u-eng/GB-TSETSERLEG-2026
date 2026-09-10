'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Emp = { id: string; last_name: string; first_name: string; positions?: { name: string }|null }
type Att = { employee_id: string; date: string; status: string }

const STATUS_META: Record<string, { label: string; short: string; color: string }> = {
  irsen:     { label: 'Ирсэн',    short: '✓', color: 'text-emerald-700' },
  hotsorson: { label: 'Хоцорсон', short: 'Х', color: 'text-amber-700' },
  chuluutei: { label: 'Чөлөө',    short: 'Ч', color: 'text-blue-700' },
  uvchtei:   { label: 'Өвчтэй',   short: 'Ө', color: 'text-purple-700' },
  tomilolt:  { label: 'Томилолт', short: 'Т', color: 'text-cyan-700' },
  tasalsan:  { label: 'Тасалсан', short: '✕', color: 'text-red-700' },
}

export default function IrtsStaffReportPage() {
  const supabase = useMemo(() => createClient(), [])
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [emps, setEmps] = useState<Emp[]>([])
  const [atts, setAtts] = useState<Att[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const start = `${month}-01`
    const end = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 1).toISOString().slice(0,10)
    const [e, a] = await Promise.all([
      supabase.from('employees').select('id, last_name, first_name, positions(name)').order('first_name'),
      supabase.from('staff_attendance').select('employee_id, date, status').gte('date', start).lt('date', end),
    ])
    setEmps((e.data as Emp[]) || [])
    setAtts((a.data as Att[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [month])

  const daysInMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()
  const days = Array.from({length: daysInMonth}, (_,i) => i+1)

  function attFor(empId: string, day: number): string|undefined {
    const dateStr = `${month}-${String(day).padStart(2,'0')}`
    return atts.find(a => a.employee_id === empId && a.date === dateStr)?.status
  }
  function summary(empId: string) {
    const rows = atts.filter(a => a.employee_id === empId)
    const s: Record<string, number> = { irsen:0, hotsorson:0, chuluutei:0, uvchtei:0, tomilolt:0, tasalsan:0 }
    rows.forEach(r => { if (s[r.status] !== undefined) s[r.status]++ })
    return s
  }

  function download() {
    const header = ['Ажилтан','Албан тушаал', ...days.map(d => `${d}-ны`), 'Ирсэн','Хоцорсон','Чөлөө','Өвчтэй','Томилолт','Тасалсан']
    const lines = [header.join(',')]
    emps.forEach(e => {
      const s = summary(e.id)
      const row = [`${e.last_name}.${e.first_name}`, e.positions?.name || '', ...days.map(d => STATUS_META[attFor(e.id, d) || '']?.short || ''), s.irsen, s.hotsorson, s.chuluutei, s.uvchtei, s.tomilolt, s.tasalsan]
      lines.push(row.map(v => `"${String(v).replace(/,/g,';')}"`).join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `ajiltnii-irts-${month}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8 print:p-2">
      <div className="max-w-full mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold">Ажилтны ирц — Сарын нэгтгэл</h1>
                <p className="text-sm opacity-90 mt-1">Матриц харагдац · CSV татах · Хэвлэх</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm" />
              <button onClick={download} className="bg-white text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold">⬇️ CSV</button>
              <button onClick={()=>window.print()} className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg text-sm">🖨️ Хэвлэх</button>
              <a href="/irts-staff" className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg text-sm">← Буцах</a>
            </div>
          </div>
        </div>

        {loading ? <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div> : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left border-b sticky left-0 bg-slate-50 min-w-[180px]">Ажилтан</th>
                  {days.map(d => <th key={d} className="p-1 text-center border-b w-8">{d}</th>)}
                  <th className="p-2 text-center border-b bg-emerald-50">И</th>
                  <th className="p-2 text-center border-b bg-amber-50">Х</th>
                  <th className="p-2 text-center border-b bg-blue-50">Ч</th>
                  <th className="p-2 text-center border-b bg-purple-50">Ө</th>
                  <th className="p-2 text-center border-b bg-cyan-50">Т</th>
                  <th className="p-2 text-center border-b bg-red-50">✕</th>
                </tr>
              </thead>
              <tbody>
                {emps.map(e => {
                  const s = summary(e.id)
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-2 border-b border-slate-100 sticky left-0 bg-white">
                        <div className="font-medium">{e.last_name}.{e.first_name}</div>
                        <div className="text-[10px] text-slate-500">{e.positions?.name || ''}</div>
                      </td>
                      {days.map(d => {
                        const st = attFor(e.id, d)
                        const meta = st ? STATUS_META[st] : null
                        return (
                          <td key={d} className={`p-0.5 text-center border-b border-slate-100 ${meta?.color || 'text-slate-300'}`}>
                            {meta?.short || '·'}
                          </td>
                        )
                      })}
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-emerald-700">{s.irsen}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-amber-700">{s.hotsorson}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-blue-700">{s.chuluutei}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-purple-700">{s.uvchtei}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-cyan-700">{s.tomilolt}</td>
                      <td className="p-2 text-center border-b border-slate-100 font-semibold text-red-700">{s.tasalsan}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-xs text-slate-500 flex gap-4 flex-wrap">
          {Object.entries(STATUS_META).map(([k, m]) => (<span key={k}><span className={`font-semibold ${m.color}`}>{m.short}</span> — {m.label}</span>))}
        </div>
      </div>
    </div>
  )
}
