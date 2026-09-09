'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Task = {
  id: string; title: string; description: string; priority: string; due_date: string
  status: string; assigned_by_id: string; assigned_by_name: string; recipients: string[]
  responses: any[]; created_at: string
}

export default function UuregReportPage() {
  const supabase = useMemo(() => createClient(), [])
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const { data: emp } = await supabase.from('employees').select('id, last_name, first_name')
    const smap: Record<string,string> = {}
    ;(emp||[]).forEach((e: any) => smap[e.id] = `${e.last_name}.${e.first_name}`)
    setStaff(smap)

    const { data } = await supabase.from('methodist_notes').select('*').limit(1000)
    const all: Task[] = []
    ;(data||[]).forEach((row: any) => {
      try {
        const p = typeof row.text === 'string' ? JSON.parse(row.text) : row.text
        if (p && p.title && p.recipients) all.push({ id: row.id, ...p })
      } catch {}
    })
    const start = `${month}-01`
    const end = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 1).toISOString().slice(0,10)
    const filtered = all.filter(t => {
      const d = (t.created_at || '').slice(0,10) || (t.due_date || '').slice(0,10)
      return d >= start && d < end
    })
    setTasks(filtered)
    setLoading(false)
  }
  useEffect(() => { load() }, [month])

  const byStatus = { pending: 0, inprogress: 0, done: 0 }
  const byPriority = { high: 0, normal: 0, low: 0 }
  let overdue = 0, onTime = 0, late = 0, avgRating = 0, ratedCount = 0
  const byPerson: Record<string, { total: number; done: number; avg: number; ratings: number[] }> = {}

  tasks.forEach(t => {
    byStatus[(t.status as 'pending'|'inprogress'|'done')] = (byStatus[(t.status as 'pending'|'inprogress'|'done')] || 0) + 1
    byPriority[(t.priority as 'high'|'normal'|'low')] = (byPriority[(t.priority as 'high'|'normal'|'low')] || 0) + 1
    const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    if (isOverdue) overdue++

    ;(t.recipients||[]).forEach(rid => {
      if (!byPerson[rid]) byPerson[rid] = { total: 0, done: 0, avg: 0, ratings: [] }
      byPerson[rid].total++
      if (t.status === 'done') byPerson[rid].done++
    })
    ;(t.responses||[]).forEach((r: any) => {
      if (t.due_date && r.at) {
        if (new Date(r.at) <= new Date(t.due_date + 'T23:59:59')) onTime++
        else late++
      }
      if (r.review?.rating !== undefined) {
        avgRating += r.review.rating; ratedCount++
        const rid = (t.recipients||[])[0]
        if (rid && byPerson[rid]) byPerson[rid].ratings.push(r.review.rating)
      }
    })
  })
  const avg = ratedCount ? Math.round(avgRating / ratedCount) : 0
  Object.values(byPerson).forEach(p => p.avg = p.ratings.length ? Math.round(p.ratings.reduce((a,b)=>a+b,0) / p.ratings.length) : 0)

  const maxBy = (o: Record<string,number>) => Math.max(1, ...Object.values(o))
  const maxP = maxBy({...byStatus, ...byPriority})

  function download() {
    const header = ['Гарчиг','Дуусах','Төлөв','Ач холбогдол','Хүлээн авагч','Хариу','Дундаж %']
    const lines = [header.join(',')]
    tasks.forEach(t => {
      const recs = (t.recipients||[]).map(rid => staff[rid] || rid).join(';')
      const ratings = (t.responses||[]).map((r: any) => r.review?.rating).filter((x: any)=>x!==undefined)
      const avgR = ratings.length ? Math.round(ratings.reduce((a: number,b: number)=>a+b,0)/ratings.length) : ''
      lines.push([t.title, t.due_date||'', t.status, t.priority, recs, (t.responses||[]).length, avgR].map(v=>`"${String(v).replace(/,/g,';').replace(/\n/g,' ')}"`).join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `uureg-${month}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold">Үүрэг даалгаврын сарын нэгтгэл</h1>
                <p className="text-sm opacity-90 mt-1">Гүйцэтгэл · Хугацаа · Ажилтнаар</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm" />
              <button onClick={download} className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-sm font-semibold">⬇️ CSV</button>
              <button onClick={()=>window.print()} className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg text-sm">🖨️ Хэвлэх</button>
            </div>
          </div>
        </div>

        {loading ? <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-slate-800">{tasks.length}</div><div className="text-xs text-slate-500 mt-1">Нийт үүрэг</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-emerald-600">{byStatus.done}</div><div className="text-xs text-slate-500 mt-1">✅ Гүйцэтгэсэн</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-amber-600">{byStatus.inprogress}</div><div className="text-xs text-slate-500 mt-1">🔄 Хийж буй</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-red-600">{overdue}</div><div className="text-xs text-slate-500 mt-1">⏰ Хугацаа хэтэрсэн</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-blue-600">{avg}%</div><div className="text-xs text-slate-500 mt-1">Дундаж үнэлгээ</div></div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="font-semibold text-slate-800 mb-4">📊 Төлөвөөр</div>
                {Object.entries(byStatus).map(([k,v]) => (
                  <div key={k} className="mb-2">
                    <div className="flex justify-between text-sm mb-1"><span>{{pending:'⏳ Хүлээж буй',inprogress:'🔄 Хийж буй',done:'✅ Гүйцэтгэсэн'}[k]}</span><span className="font-semibold">{v}</span></div>
                    <div className="h-3 bg-slate-100 rounded overflow-hidden">
                      <div style={{width: `${(v/maxP)*100}%`}} className={`h-full ${k==='done'?'bg-emerald-500':k==='inprogress'?'bg-amber-500':'bg-slate-400'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="font-semibold text-slate-800 mb-4">🎯 Ач холбогдлоор</div>
                {Object.entries(byPriority).map(([k,v]) => (
                  <div key={k} className="mb-2">
                    <div className="flex justify-between text-sm mb-1"><span>{{high:'🔴 Яаралтай',normal:'🔵 Энгийн',low:'⚪ Бага'}[k]}</span><span className="font-semibold">{v}</span></div>
                    <div className="h-3 bg-slate-100 rounded overflow-hidden">
                      <div style={{width: `${(v/maxP)*100}%`}} className={`h-full ${k==='high'?'bg-red-500':k==='normal'?'bg-blue-500':'bg-slate-400'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <div className="font-semibold text-slate-800 mb-4">⏰ Хугацаанд илгээлт</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Хугацаандаа</div>
                  <div className="text-2xl font-bold text-emerald-600">{onTime}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">Хугацаа хожимдсон</div>
                  <div className="text-2xl font-bold text-red-600">{late}</div>
                </div>
              </div>
              <div className="mt-3 h-4 bg-slate-100 rounded overflow-hidden flex">
                <div style={{width: `${onTime/Math.max(1,onTime+late)*100}%`}} className="bg-emerald-500"></div>
                <div style={{width: `${late/Math.max(1,onTime+late)*100}%`}} className="bg-red-500"></div>
              </div>
            </div>

            {Object.keys(byPerson).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
                <div className="font-semibold text-slate-800 mb-4">👥 Ажилтнаар</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50"><tr>
                      <th className="p-2 text-left border-b border-slate-200">Ажилтан</th>
                      <th className="p-2 text-center border-b border-slate-200">Нийт</th>
                      <th className="p-2 text-center border-b border-slate-200">Гүйц.</th>
                      <th className="p-2 text-center border-b border-slate-200">Гүйц. %</th>
                      <th className="p-2 text-center border-b border-slate-200">Дундаж %</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(byPerson).sort((a,b)=>b[1].total-a[1].total).map(([rid, p]) => (
                        <tr key={rid} className="hover:bg-slate-50">
                          <td className="p-2 border-b border-slate-100">{staff[rid] || rid}</td>
                          <td className="p-2 border-b border-slate-100 text-center">{p.total}</td>
                          <td className="p-2 border-b border-slate-100 text-center">{p.done}</td>
                          <td className="p-2 border-b border-slate-100 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${p.total>0 && p.done/p.total>=0.8 ? 'bg-emerald-100 text-emerald-700' : p.done/p.total>=0.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {p.total ? Math.round(p.done/p.total*100) : 0}%
                            </span>
                          </td>
                          <td className="p-2 border-b border-slate-100 text-center font-semibold">{p.avg || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
