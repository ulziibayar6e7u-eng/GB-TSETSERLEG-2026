'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Duty = { id: string; date: string; teacher_id: string; note: string | null; employees?: { last_name: string; first_name: string } | null }
type Report = { id: string; date: string; teacher_id: string; category: string; title: string | null; description: string | null; file_url: string | null; extra_links: string[]; created_at: string; employees?: { last_name: string; first_name: string } | null }
type Emp = { id: string; last_name: string; first_name: string; role: string; is_duty_teacher?: boolean }

const CATS = {
  training:          { icon: '📚', label: 'Сургалт, үйл ажиллагаа' },
  regime:            { icon: '🕐', label: 'Өдрийн дэглэм' },
  child_protection:  { icon: '🛡', label: 'Хүүхэд хамгаалал' },
  other:             { icon: '📝', label: 'Бусад' },
} as const
type Cat = keyof typeof CATS

function today() { return new Date().toISOString().split('T')[0] }

export default function JuuruPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const isScheduler = me && (me.is_admin || me.role === 'arga_zuich' || me.role === 'erhlegch')
  const isViewer    = me && (me.is_admin || me.role === 'erhlegch')

  const [duties, setDuties] = useState<Duty[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [teachers, setTeachers] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'schedule' | 'reports'>('schedule')
  const [repCat, setRepCat] = useState<Cat>('training')

  const [schedForm, setSchedForm] = useState({ date: today(), teacher_id: '', note: '' })
  const [showRepForm, setShowRepForm] = useState(false)
  const [repForm, setRepForm] = useState({ date: today(), category: 'training' as Cat, title: '', description: '', file: null as File | null, extraLinks: '' })
  const [groups, setGroups] = useState<{ id: number; code: string; name: string; icon: string; color: string }[]>([])
  const [dgaRows, setDgaRows] = useState<Record<number, { present: number; absent: number; note: string; id?: string }>>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [d, r, t, g, dga] = await Promise.all([
      supabase.from('duty_schedules').select('*, employees:teacher_id(last_name, first_name)').order('date', { ascending: false }).limit(120),
      supabase.from('duty_reports').select('*, employees:teacher_id(last_name, first_name)').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(200),
      supabase.from('employees').select('id, last_name, first_name, role, is_duty_teacher').eq('is_duty_teacher', true).order('first_name'),
      supabase.from('groups').select('id, code, name, icon, color').order('id'),
      supabase.from('duty_group_attendance').select('*').eq('date', today()),
    ])
    setDuties((d.data as unknown as Duty[]) || [])
    setReports((r.data as unknown as Report[]) || [])
    setTeachers((t.data as Emp[]) || [])
    setGroups((g.data as { id: number; code: string; name: string; icon: string; color: string }[]) || [])
    const map: Record<number, { present: number; absent: number; note: string; id?: string }> = {}
    ;((dga.data as { id: string; group_id: number; present: number; absent: number | null; note: string | null }[]) || []).forEach((r) => {
      map[r.group_id] = { id: r.id, present: r.present || 0, absent: r.absent || 0, note: r.note || '' }
    })
    setDgaRows(map)
    setLoading(false)
  }
  async function saveDga(groupId: number) {
    if (!me) return
    const row = dgaRows[groupId] || { present: 0, absent: 0, note: '' }
    const payload = { date: today(), group_id: groupId, duty_teacher_id: me.id, present: row.present, absent: row.absent, note: row.note || null, updated_at: new Date().toISOString() }
    if (row.id) {
      await supabase.from('duty_group_attendance').update(payload).eq('id', row.id)
    } else {
      const { data } = await supabase.from('duty_group_attendance').upsert(payload, { onConflict: 'date,group_id' }).select().single()
      if (data) setDgaRows((prev) => ({ ...prev, [groupId]: { ...prev[groupId], id: (data as { id: string }).id } }))
    }
  }
  useEffect(() => { load() }, [])

  const myDutyDates = useMemo(() => new Set(duties.filter((d) => d.teacher_id === me?.id).map((d) => d.date)), [duties, me?.id])
  const iAmOnDutyToday = myDutyDates.has(today())
  const iAmDutyTeacher = myDutyDates.size > 0 || teachers.some((t) => t.id === me?.id)
  const myReports = reports.filter((r) => r.teacher_id === me?.id)

  async function addSchedule() {
    if (!schedForm.teacher_id || !schedForm.date) { alert('Долоо хоногийн эхлэлийн огноо, багш сонгоно уу'); return }
    setSaving(true)
    const start = new Date(schedForm.date)
    const dow = start.getDay()
    const offsetToMon = dow === 0 ? -6 : 1 - dow
    const monday = new Date(start); monday.setDate(start.getDate() + offsetToMon)
    const rows = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i)
      return { date: d.toISOString().split('T')[0], teacher_id: schedForm.teacher_id, assigned_by: me?.id, note: schedForm.note || null }
    })
    const { error } = await supabase.from('duty_schedules').upsert(rows, { onConflict: 'date,teacher_id' })
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setSchedForm({ date: today(), teacher_id: '', note: '' }); load()
  }
  async function removeSchedule(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('duty_schedules').delete().eq('id', id)
    load()
  }
  async function removeWeek(dates: string[]) {
    if (!confirm(`Долоо хоногийн хуваарийг устгах уу? (${dates.length} өдөр)`)) return
    await supabase.from('duty_schedules').delete().in('date', dates)
    load()
  }

  async function saveReport() {
    if (!me) return
    setSaving(true)
    let file_url: string | null = null
    if (repForm.file) {
      const path = `juuru/${Date.now()}_${repForm.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, repForm.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const { error } = await supabase.from('duty_reports').insert({
      date: repForm.date,
      teacher_id: me.id,
      category: repForm.category,
      title: repForm.title || null,
      description: repForm.description || null,
      file_url,
      extra_links: repForm.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
    })
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowRepForm(false)
    setRepForm({ date: today(), category: 'general', title: '', description: '', file: null, extraLinks: '' })
    load()
  }
  async function removeReport(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('duty_reports').delete().eq('id', id)
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🛎</div>
              <div>
                <h1 className="text-2xl font-bold">Жижүүр багш</h1>
                <p className="text-sm opacity-90">Хуваарь, ажилтны ирц, өдрийн тайлан</p>
              </div>
            </div>
            {iAmDutyTeacher && (
              <div className="flex gap-2 flex-wrap">
                {iAmOnDutyToday && <Link href="/irts-staff" className="bg-white text-rose-700 hover:bg-white/90 px-3 py-2 rounded-lg text-sm font-semibold">⏰ Ажилтны ирц бүртгэх</Link>}
                <button onClick={() => setShowRepForm(true)} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm font-semibold">+ Тайлан оруулах</button>
              </div>
            )}
          </div>
          {iAmOnDutyToday && <div className="mt-3 text-sm bg-white/15 rounded-lg px-3 py-2 backdrop-blur">📌 Та өнөөдөр жижүүр багш байна.</div>}
          {iAmDutyTeacher && !iAmOnDutyToday && myDutyDates.size > 0 && <div className="mt-3 text-sm bg-white/15 rounded-lg px-3 py-2 backdrop-blur">🗓 Таны жижүүрийн өдрүүд: {Array.from(myDutyDates).slice(0, 5).join(', ')}</div>}
        </div>

        {iAmOnDutyToday && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">🎯 Бүлгийн ирц (өнөөдөр {today()})</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {groups.filter((g) => !['hogjim', 'huvilbart'].includes(g.code)).map((g) => {
                const r = dgaRows[g.id] || { present: 0, absent: 0, note: '' }
                return (
                  <div key={g.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{g.icon}</span>
                      <span className="font-medium text-slate-800 flex-1">{g.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[11px] text-emerald-700">Ирсэн</label>
                        <input type="number" min="0" value={r.present || ''} onFocus={(e) => e.target.select()} onChange={(e) => setDgaRows({ ...dgaRows, [g.id]: { ...r, present: parseInt(e.target.value) || 0 } })} onBlur={() => saveDga(g.id)} className="w-full border border-emerald-300 bg-emerald-50 rounded px-2 py-1 text-sm font-semibold text-emerald-800" />
                      </div>
                      <div>
                        <label className="text-[11px] text-red-700">Ирээгүй</label>
                        <input type="number" min="0" value={r.absent || ''} onFocus={(e) => e.target.select()} onChange={(e) => setDgaRows({ ...dgaRows, [g.id]: { ...r, absent: parseInt(e.target.value) || 0 } })} onBlur={() => saveDga(g.id)} className="w-full border border-red-300 bg-red-50 rounded px-2 py-1 text-sm font-semibold text-red-800" />
                      </div>
                    </div>
                    <input value={r.note} onChange={(e) => setDgaRows({ ...dgaRows, [g.id]: { ...r, note: e.target.value } })} onBlur={() => saveDga(g.id)} placeholder="Тэмдэглэл" className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap">
          <button onClick={() => setTab('schedule')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'schedule' ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>🗓 Хуваарь ({duties.length})</button>
          {(isViewer || iAmDutyTeacher) && <button onClick={() => setTab('reports')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'reports' ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>📋 Тайлан ({isViewer ? reports.length : myReports.length})</button>}
        </div>

        {tab === 'schedule' && (
          <>
            {isScheduler && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">+ Долоо хоногийн жижүүр (Даваа–Баасан, 5 хоног)</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Долоо хоногийн огноо</label>
                    <input type="date" value={schedForm.date} onChange={(e) => setSchedForm({ ...schedForm, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Багш</label>
                    <select value={schedForm.teacher_id} onChange={(e) => setSchedForm({ ...schedForm, teacher_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                      <option value="">— Багш сонгох —</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.last_name}.{t.first_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Тэмдэглэл</label>
                    <input value={schedForm.note} onChange={(e) => setSchedForm({ ...schedForm, note: e.target.value })} placeholder="Заавал биш" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={addSchedule} disabled={saving} className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-lg px-3 py-2 font-medium">{saving ? '...' : '+ Хуваарь үүсгэх (5 хоног)'}</button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2">Долоо хоногийн аль ч өдрийг сонгосон Даваа–Баасан гараг руу автоматаар шилжинэ.</div>
              </div>
            )}
            {loading ? (
              <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
            ) : duties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">Хуваарь байхгүй</div>
            ) : (
              <MonthlyView duties={duties} isScheduler={!!isScheduler} onRemoveWeek={removeWeek} />
            )}
          </>
        )}

        {tab === 'reports' && (isViewer || iAmDutyTeacher) && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap">
              {(Object.keys(CATS) as Cat[]).map((c) => {
                const src = isViewer ? reports : myReports
                const n = src.filter((r) => r.category === c).length
                return (
                  <button key={c} onClick={() => setRepCat(c)} className={`px-3 py-2 rounded-lg text-sm font-medium ${repCat === c ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                    {CATS[c].icon} {CATS[c].label} ({n})
                  </button>
                )
              })}
            </div>
            {iAmDutyTeacher && (
              <div className="flex justify-end mb-3">
                <button onClick={() => { setRepForm({ ...repForm, category: repCat, date: today(), title: '', description: '', file: null, extraLinks: '' }); setShowRepForm(true) }} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ {CATS[repCat].icon} {CATS[repCat].label} нэмэх</button>
              </div>
            )}
            {(() => {
              const src = isViewer ? reports : myReports
              const filtered = src.filter((r) => r.category === repCat)
              if (loading) return <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
              if (filtered.length === 0) return <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500"><div className="text-5xl mb-3">{CATS[repCat].icon}</div><div>Тайлан байхгүй</div></div>
              return (
            <div className="space-y-3">
              {filtered.map((r) => {
                const cat = CATS[r.category as Cat] || CATS.other
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{cat.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-slate-500">🗓 {r.date}</span>
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{cat.label}</span>
                          {r.employees && <span className="text-xs text-slate-500">— {r.employees.last_name}.{r.employees.first_name}</span>}
                        </div>
                        {r.title && <h3 className="font-semibold text-slate-800">{r.title}</h3>}
                        {r.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{r.description}</div>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.file_url && <a href={r.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Нотлох баримт</a>}
                          {(r.extra_links || []).map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>))}
                        </div>
                      </div>
                      {(me.is_admin || me.role === 'erhlegch' || r.teacher_id === me.id) && (
                        <button onClick={() => removeReport(r.id)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
              )
            })()}
          </>
        )}
      </div>

      {showRepForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">Өдрийн тайлан</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={repForm.date} onChange={(e) => setRepForm({ ...repForm, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Ангилал</label>
                  <select value={repForm.category} onChange={(e) => setRepForm({ ...repForm, category: e.target.value as Cat })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {(Object.keys(CATS) as Cat[]).map((c) => (<option key={c} value={c}>{CATS[c].icon} {CATS[c].label}</option>))}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг</label><input value={repForm.title} onChange={(e) => setRepForm({ ...repForm, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={4} value={repForm.description} onChange={(e) => setRepForm({ ...repForm, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Нотлох баримт (зураг/бичлэг/файл)</label><input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setRepForm({ ...repForm, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд</label><textarea rows={2} value={repForm.extraLinks} onChange={(e) => setRepForm({ ...repForm, extraLinks: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowRepForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={saveReport} disabled={saving} className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар']
const DOW_MN = ['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба']

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  const off = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + off)
  return d.toISOString().split('T')[0]
}

function MonthlyView({ duties, isScheduler, onRemoveWeek }: { duties: Duty[]; isScheduler: boolean; onRemoveWeek: (dates: string[]) => void }) {
  const today = new Date().toISOString().split('T')[0]

  // Group: month -> weekStart -> {teacher, days[]}
  type Week = { weekStart: string; teacherName: string; teacherId: string; days: Duty[] }
  const months = new Map<string, Week[]>()

  const byWeek = new Map<string, Week>()
  duties.forEach((d) => {
    const wk = mondayOf(d.date)
    const key = wk + '|' + d.teacher_id
    let w = byWeek.get(key)
    if (!w) {
      w = { weekStart: wk, teacherId: d.teacher_id, teacherName: d.employees ? `${d.employees.last_name}.${d.employees.first_name}` : '—', days: [] }
      byWeek.set(key, w)
    }
    w.days.push(d)
  })
  Array.from(byWeek.values()).forEach((w) => {
    w.days.sort((a, b) => (a.date < b.date ? -1 : 1))
    const first = new Date(w.weekStart + 'T00:00:00')
    const monthKey = first.getFullYear() + '-' + String(first.getMonth() + 1).padStart(2, '0')
    if (!months.has(monthKey)) months.set(monthKey, [])
    months.get(monthKey)!.push(w)
  })
  const sortedMonths = Array.from(months.keys()).sort().reverse()
  sortedMonths.forEach((m) => months.get(m)!.sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1)))

  const teacherColors = ['from-rose-500 to-pink-500','from-indigo-500 to-purple-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-cyan-500 to-blue-500','from-fuchsia-500 to-purple-500']
  const colorFor = (id: string) => teacherColors[Math.abs(hash(id)) % teacherColors.length]

  return (
    <div className="space-y-6">
      {sortedMonths.map((mk) => {
        const [y, m] = mk.split('-').map(Number)
        const weeks = months.get(mk)!
        return (
          <div key={mk} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-3 flex items-center justify-between">
              <div className="font-bold text-lg">📅 {y} · {MONTHS_MN[m - 1]}</div>
              <div className="text-xs opacity-80">{weeks.length} долоо хоног</div>
            </div>
            <div className="divide-y divide-slate-100">
              {weeks.map((w) => {
                const start = w.days[0].date
                const end = w.days[w.days.length - 1].date
                const isCurrent = start <= today && today <= end
                const startDate = new Date(start + 'T00:00:00')
                const endDate = new Date(end + 'T00:00:00')
                return (
                  <div key={w.weekStart + w.teacherId} className={`p-4 ${isCurrent ? 'bg-rose-50' : ''}`}>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorFor(w.teacherId)} flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow`}>
                        {w.teacherName.split('.')[1]?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-lg">
                          {w.teacherName}
                          {isCurrent && <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-full ml-2 align-middle">Одоо жижүүр</span>}
                        </div>
                        <div className="text-sm text-slate-600 mt-0.5">
                          🗓 {startDate.getMonth() + 1}/{startDate.getDate()} — {endDate.getMonth() + 1}/{endDate.getDate()}
                          <span className="text-slate-400"> · {w.days.length} өдөр</span>
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {w.days.map((d) => {
                            const dd = new Date(d.date + 'T00:00:00')
                            const isToday = d.date === today
                            return (
                              <div key={d.id} className={`text-xs px-2 py-1 rounded-lg border ${isToday ? 'bg-rose-600 text-white border-rose-600 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                {DOW_MN[dd.getDay()]} · {dd.getMonth() + 1}/{dd.getDate()}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {isScheduler && (
                        <button onClick={() => onRemoveWeek(w.days.map((d) => d.date))} className="text-red-600 hover:text-red-800 text-xs px-2 py-1 flex-shrink-0">Устгах</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0
  return h
}
