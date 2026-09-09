'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

const KIND_LABEL: Record<string,string> = {
  activity: '📋 Үйл ажиллагаа',
  support:  '👀 Хяналт, дэмжлэг',
  reading:  '📖 Чанга уншлага',
  walk:     '🚶 Зугаалгын цаг',
}
const KIND_COLOR: Record<string,string> = {
  activity: '#3b82f6', support: '#10b981', reading: '#f59e0b', walk: '#ec4899',
}

type Row = {
  id: string; kind: string; date: string; title: string; note: string|null
  employees?: { last_name: string; first_name: string }|null
  target?: { last_name: string; first_name: string }|null
  groups?: { name: string }|null
  subject_code: string|null
}

export default function ZaahReportPage() {
  const supabase = useMemo(() => createClient(), [])
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const start = `${month}-01`
    const end = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 1).toISOString().slice(0,10)
    const { data } = await supabase.from('teach_method')
      .select('id, kind, date, title, note, subject_code, employees:author_id(last_name, first_name), target:target_teacher_id(last_name, first_name), groups(name)')
      .gte('date', start).lt('date', end).order('date')
    setRows((data as unknown as Row[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [month])

  const counts = ['activity','support','reading','walk'].map(k => ({
    key: k, label: KIND_LABEL[k], color: KIND_COLOR[k], count: rows.filter(r => r.kind === k).length,
  }))
  const maxCount = Math.max(1, ...counts.map(c => c.count))
  const total = rows.length

  const byGroup: Record<string, number> = {}
  rows.filter(r => r.kind==='reading' || r.kind==='walk').forEach(r => {
    const name = r.groups?.name || 'Тодорхойгүй'
    byGroup[name] = (byGroup[name] || 0) + 1
  })

  const byTeacher: Record<string, number> = {}
  rows.filter(r => r.kind==='support' && r.target).forEach(r => {
    const name = `${r.target!.last_name}.${r.target!.first_name}`
    byTeacher[name] = (byTeacher[name] || 0) + 1
  })

  function download() {
    const header = ['Огноо','Төрөл','Гарчиг','Судлагдахуун','Бүлэг','Багш (хяналт)','Оруулсан','Тэмдэглэл']
    const lines = [header.join(',')]
    rows.forEach(r => {
      const row = [
        r.date,
        KIND_LABEL[r.kind]?.replace(/^[^\s]+\s/, '') || r.kind,
        (r.title||'').replace(/,/g,';'),
        r.subject_code || '',
        r.groups?.name || '',
        r.target ? `${r.target.last_name}.${r.target.first_name}` : '',
        r.employees ? `${r.employees.last_name}.${r.employees.first_name}` : '',
        (r.note||'').replace(/[\n,]/g,' '),
      ]
      lines.push(row.map(v => `"${v}"`).join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `zaah-argyn-negdel-${month}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-slate-700 to-slate-900 print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold">Заах аргын нэгдэл — сарын нэгтгэл</h1>
                <p className="text-sm opacity-90 mt-1">Диаграм · Багш/бүлгээр · CSV татах</p>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {counts.map(c => (
                <div key={c.key} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-3xl font-bold" style={{color: c.color}}>{c.count}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <div className="font-semibold text-slate-800 mb-4">📈 Төрөл тус бүрээр</div>
              <div className="space-y-3">
                {counts.map(c => (
                  <div key={c.key}>
                    <div className="flex justify-between text-sm mb-1"><span>{c.label}</span><span className="font-semibold">{c.count}</span></div>
                    <div className="h-3 bg-slate-100 rounded overflow-hidden">
                      <div style={{width: `${(c.count/maxCount)*100}%`, background: c.color}} className="h-full transition-all"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-sm text-slate-600">Нийт бичлэг: <b>{total}</b></div>
            </div>

            {Object.keys(byGroup).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
                <div className="font-semibold text-slate-800 mb-4">🏫 Бүлгээр (Чанга уншлага + Зугаалга)</div>
                <div className="space-y-2">
                  {Object.entries(byGroup).sort((a,b)=>b[1]-a[1]).map(([name, n]) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1"><span>{name}</span><span className="font-semibold">{n}</span></div>
                      <div className="h-2 bg-slate-100 rounded"><div style={{width: `${(n/Math.max(...Object.values(byGroup)))*100}%`}} className="h-full bg-amber-500 rounded"></div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(byTeacher).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
                <div className="font-semibold text-slate-800 mb-4">👩‍🏫 Багшаар (Хяналт, дэмжлэг)</div>
                <div className="space-y-2">
                  {Object.entries(byTeacher).sort((a,b)=>b[1]-a[1]).map(([name, n]) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1"><span>{name}</span><span className="font-semibold">{n}</span></div>
                      <div className="h-2 bg-slate-100 rounded"><div style={{width: `${(n/Math.max(...Object.values(byTeacher)))*100}%`}} className="h-full bg-emerald-500 rounded"></div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left border-b border-slate-200">Огноо</th>
                    <th className="p-2 text-left border-b border-slate-200">Төрөл</th>
                    <th className="p-2 text-left border-b border-slate-200">Гарчиг</th>
                    <th className="p-2 text-left border-b border-slate-200">Хамрах</th>
                    <th className="p-2 text-left border-b border-slate-200">Оруулсан</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 border-b border-slate-100">{r.date}</td>
                      <td className="p-2 border-b border-slate-100">{KIND_LABEL[r.kind]}</td>
                      <td className="p-2 border-b border-slate-100">{r.title}</td>
                      <td className="p-2 border-b border-slate-100 text-xs text-slate-600">{r.groups?.name || (r.target ? `${r.target.last_name}.${r.target.first_name}` : '—')}</td>
                      <td className="p-2 border-b border-slate-100 text-xs text-slate-600">{r.employees ? `${r.employees.last_name}.${r.employees.first_name}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
