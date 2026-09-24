'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { useMe } from '@/lib/useMe'

// Багшийн "📸 Хичээлийн бичлэг" (iframe /hogjim) тусдаа Supabase-ийн activities хүснэгтэд хадгалагддаг — public/hogjim/config.js
const HOGJIM_URL = process.env.NEXT_PUBLIC_HOGJIM_SUPABASE_URL || 'https://dehxrmupnbilwlxsovpi.supabase.co'
const HOGJIM_KEY = process.env.NEXT_PUBLIC_HOGJIM_SUPABASE_KEY || 'sb_publishable_VRNBeM9nqwFlrDhT2-wD3w_Gp3O85uy'

type Teacher = { id: string; last_name: string; first_name: string; role: string }
type Row = { month: number; observations: number; activities: number; clubActs: number }

const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12']

export default function UilAjilgaaPage() {
  const { me, loading } = useMe()
  const supabase = useMemo(() => createClient(), [])
  const hogjimDb = useMemo(() => (HOGJIM_URL && HOGJIM_KEY ? createPlainClient(HOGJIM_URL, HOGJIM_KEY, { auth: { persistSession: false } }) : null), [])
  const [fullscreen, setFullscreen] = useState(false)

  const isMusicTeacher = !!(me?.first_name === 'Өлзийбаяр' || me?.groups?.some((g: any) => g.code === 'hogjim'))
  const isLeader = !isMusicTeacher && (me?.is_admin || me?.role === 'erhlegch' || me?.role === 'arga_zuich')

  // Leader dashboard state
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [teacherId, setTeacherId] = useState<'all' | string>('all')
  const now = new Date()
  const [schoolYear, setSchoolYear] = useState<number>(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1)
  const [rows, setRows] = useState<Row[]>([])
  const [dashLoading, setDashLoading] = useState(false)
  const [recent, setRecent] = useState<any[]>([])
  const [recentTab, setRecentTab] = useState<'plan'|'lesson'|'obs'|'club'>('plan')

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
      const gtQ   = supabase.from('group_teachers').select('employee_id, groups(code, name, icon)')
      const lesQ  = !hogjimDb ? Promise.resolve({ data: [] as any[] }) : hogjimDb.from('activities').select('id, group_id, activity_date, title, note, media, files').gte('activity_date', start).lte('activity_date', end).order('activity_date', { ascending: false })
      const [o, a, c, gt, les] = await Promise.all([obsQ, actQ, cluQ, gtQ, lesQ])

      // Хичээлийн бичлэг нь багшаар биш бүлгээр (group_id = groups.code) хадгалагддаг → бүлгийн багш нарт хамааруулна
      const groupTeachers = new Map<string, string[]>()
      const groupMeta = new Map<string, { name: string; icon: string }>()
      ;((gt.data as any[]) || []).forEach((r) => {
        const code = r.groups?.code
        if (!code || code === 'hogjim') return
        groupTeachers.set(code, [...(groupTeachers.get(code) || []), r.employee_id])
        groupMeta.set(code, { name: r.groups.name, icon: r.groups.icon })
      })
      const lessons = ((les.data as any[]) || []).filter((r) => {
        const ids = groupTeachers.get(r.group_id)
        return !!ids && (teacherId === 'all' || ids.includes(teacherId))
      })
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
      lessons.forEach((r) => addRow(r.activity_date, null, 'activities'))
      setRows(monthOrder.map((m) => bucket.get(m)!))

      // Сүүлийн үйл ажиллагаа — plans + хичээлийн бичлэг + music_activity + club_activities + observations
      const [pl, ma, ob2, ca, tm] = await Promise.all([
        supabase.from('plans').select('id, period, title, description, file_url, author_id, employees:author_id(last_name, first_name)').gte('period', start).lte('period', end).order('period', { ascending: false }).limit(50),
        supabase.from('music_activity').select('id, date, category, title, note, file_url, author_id, groups(name, icon), employees:author_id(last_name, first_name)').gte('date', start).lte('date', end).order('date', { ascending: false }).limit(50),
        supabase.from('observations').select('id, date, activity, observation, photo_url, observer_id, employees:observer_id(last_name, first_name), children(last_name, first_name, groups(name, icon))').gte('date', start).lte('date', end).order('date', { ascending: false }).limit(50),
        supabase.from('club_activities').select('id, date, title, description, file_url, author_id, clubs(name, icon), employees:author_id(last_name, first_name)').gte('date', start).lte('date', end).order('date', { ascending: false }).limit(50),
        supabase.from('teacher_materials').select('id, created_at, category, title, description, file_url, author_id, groups(name, icon), employees:author_id(last_name, first_name)').gte('created_at', `${start}T00:00:00`).lte('created_at', `${end}T23:59:59`).order('created_at', { ascending: false }).limit(100),
      ])
      const list: any[] = []
      ;((pl.data as any[]) || []).forEach(r => list.push({ ...r, _kind: 'plan', _date: r.period }))
      ;((ma.data as any[]) || []).forEach(r => list.push({ ...r, _kind: 'music', _date: r.date }))
      ;((ob2.data as any[]) || []).forEach(r => list.push({ ...r, _kind: 'obs', _date: r.date }))
      ;((ca.data as any[]) || []).forEach(r => list.push({ ...r, groups: r.clubs, _kind: 'club', _date: r.date }))
      ;((tm.data as any[]) || []).forEach(r => list.push({ ...r, _kind: 'plan', _date: (r.created_at || '').slice(0,10) }))
      const filtered = teacherId === 'all' ? list : list.filter(r => (r.author_id || r.observer_id) === teacherId)
      // Хичээлийн бичлэг аль хэдийн багшаар шүүгдсэн
      lessons.forEach(r => filtered.push({
        ...r, _kind: 'lesson', _date: r.activity_date, groups: groupMeta.get(r.group_id),
        file_url: r.files?.[0]?.src || r.media?.[0]?.src,
      }))
      filtered.sort((a, b) => (b._date > a._date ? 1 : -1))
      setRecent(filtered)

      setDashLoading(false)
    })()
  }, [isLeader, schoolYear, teacherId, supabase, hogjimDb])

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

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-4 print:hidden">
          <div className="font-semibold text-slate-800 mb-3">📸 Багш нарын оруулсан үйл ажиллагаа</div>
          <div className="flex gap-2 flex-wrap mb-4">
            {RECENT_TABS.map((t) => {
              const count = recent.filter((r) => t.kinds.includes(r._kind)).length
              const active = recentTab === t.id
              return (
                <button key={t.id} onClick={() => setRecentTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${active ? t.active : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {t.label} <span className={`ml-1 text-xs px-1.5 rounded-full ${active ? 'bg-white/25' : 'bg-slate-100'}`}>{count}</span>
                </button>
              )
            })}
          </div>
          {(() => {
            const shown = recent.filter((r) => RECENT_TABS.find((t) => t.id === recentTab)!.kinds.includes(r._kind))
            return shown.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Бичлэг алга</div>
          ) : (
            <div className="space-y-2">
              {shown.map((r) => (
                <EntryCard key={`${r._kind}-${r.id}`} entry={r} me={me} supabase={supabase} />
              ))}
            </div>
          )
          })()}
        </div>
      </div>
    </div>
  )
}

function EntryCard({ entry: r, me, supabase }: any) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<any[]>([])
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const isLeader = !!(me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich'))
  const km: any = r._kind === 'plan' ? { icon: '📅', label: 'Төлөвлөгөө', color: 'bg-blue-50 text-blue-700' }
    : r._kind === 'lesson' ? { icon: '📸', label: 'Хичээлийн бичлэг', color: 'bg-indigo-50 text-indigo-700' }
    : r._kind === 'music' ? { icon: '🎵', label: 'Хөгжим', color: 'bg-pink-50 text-pink-700' }
    : r._kind === 'club' ? { icon: '🎨', label: 'Дугуйлан', color: 'bg-pink-50 text-pink-700' }
    : { icon: '🎯', label: 'Ажиглалт', color: 'bg-emerald-50 text-emerald-700' }
  const author = r.employees ? `${r.employees.last_name}.${r.employees.first_name}` : ''
  const title = r.title || r.activity || r.category || 'Гарчиггүй'
  const desc = r.description || r.note || r.observation || ''
  const targetId = r.author_id || r.observer_id || null

  async function load() {
    const { data } = await supabase.from('entry_feedback').select('*, employees:author_id(last_name, first_name)').eq('entry_kind', r._kind).eq('entry_id', String(r.id)).order('created_at', { ascending: false })
    setNotes((data as any) || [])
  }
  useEffect(() => { if (open) load() }, [open])

  async function save() {
    if (!text.trim() || !me) return
    setSaving(true)
    await supabase.from('entry_feedback').insert({
      entry_kind: r._kind, entry_id: String(r.id),
      target_employee_id: targetId, author_id: me.id, note: text.trim(),
    })
    setText(''); setSaving(false); load()
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className={`text-xs px-2 py-0.5 rounded ${km.color} font-medium`}>{km.icon} {km.label}</span>
        <span className="text-xs text-slate-500">🗓 {r._date}</span>
        {author && <span className="text-xs text-slate-500">✍️ {author}</span>}
        {r.groups && <span className="text-xs text-slate-500">{r.groups.icon} {r.groups.name}</span>}
        {r.children && <span className="text-xs text-slate-500">👧 {r.children.last_name}.{r.children.first_name}</span>}
      </div>
      <div className="text-sm font-medium text-slate-800">{title}</div>
      {desc && <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap line-clamp-3">{desc}</div>}
      <div className="mt-2 flex flex-wrap gap-2 items-center">
        {(r.file_url || r.photo_url) && (
          <a href={r.file_url || r.photo_url} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:text-blue-800">📎 Файл харах</a>
        )}
        <button onClick={() => setOpen(!open)} className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-1 rounded-lg font-medium">
          💬 Зөвлөгөө {open ? '▲' : '▼'}
        </button>
      </div>
      {open && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          {notes.length === 0 && <div className="text-xs text-slate-400 italic mb-2">Зөвлөгөө алга</div>}
          <div className="space-y-1 mb-2">
            {notes.map((n) => (
              <div key={n.id} className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
                <div className="text-amber-700 font-medium">✍️ {n.employees ? `${n.employees.last_name}.${n.employees.first_name}` : 'Тодорхойгүй'} <span className="text-amber-500 font-normal">· {new Date(n.created_at).toLocaleDateString('mn-MN')}</span></div>
                <div className="text-slate-800 mt-0.5 whitespace-pre-wrap">{n.note}</div>
              </div>
            ))}
          </div>
          {isLeader && (
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Зөвлөгөө, тэмдэглэл бичих..." className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs" onKeyDown={(e) => e.key === 'Enter' && save()} />
              <button onClick={save} disabled={saving || !text.trim()} className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs px-3 py-1.5 rounded-lg font-medium">💾</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const RECENT_TABS: { id: 'plan' | 'lesson' | 'obs' | 'club'; label: string; kinds: string[]; active: string }[] = [
  { id: 'plan',   label: '📅 Батлуулсан төлөвлөгөө', kinds: ['plan'], active: 'bg-blue-600 text-white border-blue-600' },
  { id: 'lesson', label: '📸 Хичээлийн бичлэг', kinds: ['lesson', 'music'], active: 'bg-indigo-600 text-white border-indigo-600' },
  { id: 'obs',    label: '🎯 Ажиглалт', kinds: ['obs'], active: 'bg-emerald-600 text-white border-emerald-600' },
  { id: 'club',   label: '🎨 Дугуйлан', kinds: ['club'], active: 'bg-pink-600 text-white border-pink-600' },
]

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 text-white bg-gradient-to-br ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs opacity-90 mt-1">{label}</div>
    </div>
  )
}
