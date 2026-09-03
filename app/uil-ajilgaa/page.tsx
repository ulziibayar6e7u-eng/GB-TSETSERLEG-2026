'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Teacher = { id: string; last_name: string; first_name: string; role: string }
type Row = { month: number; observations: number; activities: number; clubActs: number }

const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12']

export default function UilAjilgaaPage() {
  const { me, loading } = useMe()
  const supabase = useMemo(() => createClient(), [])
  const [fullscreen, setFullscreen] = useState(false)

  const isLeader = me?.is_admin || me?.role === 'erhlegch' || me?.role === 'arga_zuich'

  // Leader dashboard state
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [teacherId, setTeacherId] = useState<'all' | string>('all')
  const now = new Date()
  const [schoolYear, setSchoolYear] = useState<number>(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1)
  const [rows, setRows] = useState<Row[]>([])
  const [dashLoading, setDashLoading] = useState(false)

  useEffect(() => {
    if (!isLeader) return
    (async () => {
      const { data } = await supabase.from('employees').select('id, last_name, first_name, role').in('role', ['bagsh', 'bagsh_tuslah']).order('first_name')
      setTeachers((data as Teacher[]) || [])
    })()
  }, [isLeader, supabase])

  useEffect(() => {
    if (!isLeader) return
    (async () => {
      setDashLoading(true)
      const start = `${schoolYear}-09-01`
      const end   = `${schoolYear + 1}-06-30`
      const obsQ  = supabase.from('observations').select('date, observer_id').gte('date', start).lte('date', end)
      const actQ  = supabase.from('plans').select('period, author_id').gte('period', start).lte('period', end)
      const cluQ  = supabase.from('club_activities').select('date, author_id').gte('date', start).lte('date', end)
      const [o, a, c] = await Promise.all([obsQ, actQ, cluQ])
      const bucket = new Map<number, Row>()
      const monthOrder = [9,10,11,12,1,2,3,4,5,6]
      monthOrder.forEach((m) => bucket.set(m, { month: m, observations: 0, activities: 0, clubActs: 0 }))

      const addRow = (dateStr: string, actorId: string | null, kind: keyof Omit<Row,'month'>) => {
        if (teacherId !== 'all' && actorId !== teacherId) return
        const d = new Date(dateStr)
        const m = d.getMonth() + 1
        const r = bucket.get(m)
        if (r) r[kind]++
      }
      ;((o.data as { date: string; observer_id: string | null }[]) || []).forEach((r) => addRow(r.date, r.observer_id, 'observations'))
      ;((a.data as { period: string; author_id: string | null }[]) || []).forEach((r) => addRow(r.period, r.author_id, 'activities'))
      ;((c.data as { date: string; author_id: string | null }[]) || []).forEach((r) => addRow(r.date, r.author_id, 'clubActs'))
      setRows(monthOrder.map((m) => bucket.get(m)!))
      setDashLoading(false)
    })()
  }, [isLeader, schoolYear, teacherId, supabase])

  if (loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  // ─────────── БАГШ: iframe ───────────
  if (!isLeader) {
    const groupParam = me?.groups[0]?.code || ''
    const iframeUrl = `/hogjim/index.html?view=activityGroups&teacher=${encodeURIComponent(me?.first_name || '')}${groupParam ? `&group=${groupParam}` : ''}`

    if (fullscreen) {
      return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="text-lg">📸</span><span className="font-semibold">Сургалт, үйл ажиллагаа · {me?.groups[0]?.name || ''}</span></div>
            <button onClick={() => setFullscreen(false)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm">✕ Хаах</button>
          </div>
          <iframe src={iframeUrl} className="flex-1 w-full border-0" />
        </div>
      )
    }
    return (
      <div className="flex flex-col h-screen">
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📸</div>
            <div>
              <h1 className="font-bold text-lg">Сургалт, үйл ажиллагаа</h1>
              <p className="text-xs opacity-90">{me?.groups[0]?.name ? `${me.groups[0].icon} ${me.groups[0].name}` : ''} · {me?.last_name}.{me?.first_name}</p>
            </div>
          </div>
          <button onClick={() => setFullscreen(true)} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm">⛶</button>
        </div>
        <div className="flex-1 bg-slate-100 relative">
          <iframe src={iframeUrl} className="absolute inset-0 w-full h-full border-0" />
        </div>
      </div>
    )
  }

  // ─────────── АРГА ЗҮЙЧ / ЭРХЛЭГЧ: dashboard ───────────
  const totals = rows.reduce((s, r) => ({ obs: s.obs + r.observations, act: s.act + r.activities, clu: s.clu + r.clubActs }), { obs: 0, act: 0, clu: 0 })
  const maxVal = Math.max(1, ...rows.map((r) => r.observations + r.activities + r.clubActs))
  const currentTeacher = teachers.find((t) => t.id === teacherId)

  function downloadCsv() {
    const lines = [['Сар','Ажиглалт','Үйл ажиллагаа','Дугуйлан','Нийт']]
    rows.forEach((r) => lines.push([MONTHS[r.month - 1] + '-р сар', String(r.observations), String(r.activities), String(r.clubActs), String(r.observations + r.activities + r.clubActs)]))
    lines.push(['НИЙТ', String(totals.obs), String(totals.act), String(totals.clu), String(totals.obs + totals.act + totals.clu)])
    const csv = '﻿' + lines.map((r) => r.map((c) => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Сургалт_үйл_ажиллагаа_${currentTeacher ? currentTeacher.last_name + '.' + currentTeacher.first_name : 'бүгд'}_${schoolYear}-${schoolYear+1}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8 print:p-2">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 print:bg-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📸</div>
              <div>
                <h1 className="text-2xl font-bold">Сургалт, үйл ажиллагааны нэгтгэл</h1>
                <p className="text-sm opacity-90 mt-1">Хичээлийн жилээр · Багш нэг бүрээр · Ажиглалт + Хичээл + Дугуйлан</p>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm">🖨 Хэвлэх</button>
              <button onClick={downloadCsv} className="bg-white text-orange-700 hover:bg-white/90 px-3 py-2 rounded-lg text-sm font-semibold">📥 CSV татах</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center print:hidden">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Хичээлийн жил</label>
            <select value={schoolYear} onChange={(e) => setSchoolYear(parseInt(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map((y) => (
                <option key={y} value={y}>{y}-{y + 1} оны хичээлийн жил</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Багш</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="all">👥 Бүх багш нэгтгэсэн</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.last_name}.{t.first_name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="🎯 Ажиглалт" value={totals.obs} color="from-emerald-500 to-teal-500" />
          <StatCard label="📅 Хичээл, төлөвлөгөө" value={totals.act} color="from-blue-500 to-indigo-500" />
          <StatCard label="🎨 Дугуйлангийн үйл ажиллагаа" value={totals.clu} color="from-pink-500 to-rose-500" />
          <StatCard label="Σ Нийт" value={totals.obs + totals.act + totals.clu} color="from-orange-500 to-red-500" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">📊 Сараар харах (баганан диаграм)</h3>
            <div className="text-xs text-slate-500 flex gap-3">
              <span><span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm align-middle mr-1"></span>Ажиглалт</span>
              <span><span className="inline-block w-3 h-3 bg-blue-500 rounded-sm align-middle mr-1"></span>Хичээл</span>
              <span><span className="inline-block w-3 h-3 bg-pink-500 rounded-sm align-middle mr-1"></span>Дугуйлан</span>
            </div>
          </div>
          {dashLoading ? (
            <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
          ) : (
            <div className="flex items-end gap-2 h-64 border-b-2 border-slate-200 pt-4">
              {rows.map((r) => {
                const total = r.observations + r.activities + r.clubActs
                const h = Math.max(4, Math.round((total / maxVal) * 220))
                const obsH = total > 0 ? Math.round((r.observations / total) * h) : 0
                const actH = total > 0 ? Math.round((r.activities / total) * h) : 0
                const cluH = h - obsH - actH
                return (
                  <div key={r.month} className="flex-1 flex flex-col items-center">
                    <div className="text-[10px] text-slate-500 mb-1">{total || ''}</div>
                    <div className="w-full flex flex-col justify-end rounded-t overflow-hidden" style={{ height: h }}>
                      <div className="bg-pink-500" style={{ height: cluH }} title={`Дугуйлан: ${r.clubActs}`} />
                      <div className="bg-blue-500" style={{ height: actH }} title={`Хичээл: ${r.activities}`} />
                      <div className="bg-emerald-500" style={{ height: obsH }} title={`Ажиглалт: ${r.observations}`} />
                    </div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">{r.month}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-600">Сар</th>
                <th className="text-right p-3 font-semibold text-emerald-700">🎯 Ажиглалт</th>
                <th className="text-right p-3 font-semibold text-blue-700">📅 Хичээл</th>
                <th className="text-right p-3 font-semibold text-pink-700">🎨 Дугуйлан</th>
                <th className="text-right p-3 font-semibold text-slate-800">Σ Нийт</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.month} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{r.month}-р сар</td>
                  <td className="p-3 text-right text-emerald-700 font-semibold">{r.observations}</td>
                  <td className="p-3 text-right text-blue-700 font-semibold">{r.activities}</td>
                  <td className="p-3 text-right text-pink-700 font-semibold">{r.clubActs}</td>
                  <td className="p-3 text-right font-bold text-slate-800">{r.observations + r.activities + r.clubActs}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="p-3 text-slate-800">Хичээлийн жилийн эцсийн НИЙТ</td>
                <td className="p-3 text-right text-emerald-700">{totals.obs}</td>
                <td className="p-3 text-right text-blue-700">{totals.act}</td>
                <td className="p-3 text-right text-pink-700">{totals.clu}</td>
                <td className="p-3 text-right text-slate-900">{totals.obs + totals.act + totals.clu}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 text-white bg-gradient-to-br ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs opacity-90 mt-1">{label}</div>
    </div>
  )
}
