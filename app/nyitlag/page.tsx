'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Event = {
  id: string; title: string; description: string|null
  event_date: string; event_time: string|null; location: string|null
  created_by: string|null; created_at: string
}
type Att = {
  id: string; event_id: string; employee_id: string
  status: string; checked_in_at: string; note: string|null
  employees?: { last_name: string; first_name: string; positions?: { name: string }|null }|null
}

export default function PublicEventsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [events, setEvents] = useState<Event[]>([])
  const [openId, setOpenId] = useState<string|null>(null)
  const [att, setAtt] = useState<Att[]>([])
  const [staff, setStaff] = useState<Array<{id: string; last_name: string; first_name: string; positions?: { name: string }|null}>>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', event_date: new Date().toISOString().slice(0,10), event_time:'', location:'' })
  const [saving, setSaving] = useState(false)

  const isMusic = !!(me && (me.first_name === 'Өлзийбаяр' || me.groups?.some((g: any) => g.code === 'hogjim')))
  const canManage = !!(me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich' || isMusic))

  async function loadEvents() {
    const { data } = await supabase.from('public_events').select('*').order('event_date', { ascending: false }).limit(100)
    setEvents((data as Event[]) || [])
  }
  async function loadAttendance(eventId: string) {
    const { data } = await supabase.from('public_event_attendance').select('*, employees(last_name, first_name, positions(name))').eq('event_id', eventId)
    setAtt((data as unknown as Att[]) || [])
  }
  async function loadStaff() {
    const { data } = await supabase.from('employees').select('id, last_name, first_name, positions(name)').order('first_name')
    setStaff((data as any) || [])
  }
  useEffect(() => { loadEvents(); loadStaff() }, [])
  useEffect(() => { if (!openId && events.length > 0) setOpenId(events[0].id) }, [events])
  useEffect(() => { if (openId) loadAttendance(openId) }, [openId])

  async function saveEvent() {
    if (!form.title.trim()) { alert('Гарчиг бөглөнө үү'); return }
    setSaving(true)
    const { data, error } = await supabase.from('public_events').insert({
      title: form.title.trim(), description: form.description || null,
      event_date: form.event_date, event_time: form.event_time || null,
      location: form.location || null, created_by: me?.id || null,
    }).select().single()
    setSaving(false)
    if (error) { alert('Алдаа: '+error.message); return }
    setShowForm(false); setForm({ title:'', description:'', event_date: new Date().toISOString().slice(0,10), event_time:'', location:'' })
    await loadEvents()
    if (data?.id) setOpenId(data.id)
  }
  async function deleteEvent(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('public_events').delete().eq('id', id)
    loadEvents(); if (openId === id) setOpenId(null)
  }

  async function mark(empId: string, eventId: string, status: 'present'|'leave'|'skipped'|'onduty') {
    if (!canManage) return
    const exists = att.find(a => a.employee_id === empId)
    const payload: any = { status }
    if (status === 'present') payload.checked_in_at = new Date().toISOString()
    if (exists) {
      await supabase.from('public_event_attendance').update(payload).eq('id', exists.id)
    } else {
      await supabase.from('public_event_attendance').insert({ event_id: eventId, employee_id: empId, ...payload })
    }
    loadAttendance(eventId)
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const attMap = new Map(att.map(a => [a.employee_id, a]))
  const presentCount = att.filter(a => a.status === 'present').length
  const leaveCount = att.filter(a => a.status === 'leave').length
  const skipCount = att.filter(a => a.status === 'skipped').length
  const dutyCount = att.filter(a => a.status === 'onduty').length

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎪</div>
              <div>
                <h1 className="text-2xl font-bold">Олон нийтийн үйл ажиллагаа</h1>
                <p className="text-sm opacity-90 mt-1">Хамт олон · Ирц бүртгэл · Автомат цаг</p>
              </div>
            </div>
            {canManage && <button onClick={()=>setShowForm(true)} className="bg-white text-purple-700 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">+ Шинэ үйл ажиллагаа</button>}
          </div>
        </div>

        <div className="space-y-3">
          {events.length === 0 && <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500"><div className="text-5xl mb-3">🎪</div>Үйл ажиллагаа байхгүй</div>}
          {events.map(e => {
            const open = openId === e.id
            return (
              <div key={e.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 flex items-start gap-3 flex-wrap">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-xl flex-shrink-0">🎪</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800">{e.title}</h3>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                      <span>📅 {e.event_date}</span>
                      {e.event_time && <span>🕐 {e.event_time}</span>}
                      {e.location && <span>📍 {e.location}</span>}
                    </div>
                    {e.description && <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{e.description}</div>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <button onClick={()=>setOpenId(open?null:e.id)} className={`text-sm px-4 py-2 rounded-lg font-semibold ${open?'bg-slate-200 hover:bg-slate-300 text-slate-700':'bg-purple-600 hover:bg-purple-700 text-white'}`}>{open?'✕ Хаах':'👥 Ирц бүртгэх'}</button>
                    {canManage && <button onClick={()=>deleteEvent(e.id)} className="text-red-600 hover:text-red-800 text-sm">Устгах</button>}
                  </div>
                </div>

                {open && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    <div className="flex gap-3 mb-3 text-sm">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">✅ Ирсэн: {presentCount}</span>
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">👶 Ангид үлдсэн: {dutyCount}</span>
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">📄 Чөлөөтэй: {leaveCount}</span>
                      <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">❌ Тасалсан: {skipCount}</span>
                      <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 font-medium">Нийт: {staff.length}</span>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-2 text-left border-b border-slate-200 w-8">№</th>
                            <th className="p-2 text-left border-b border-slate-200">Ажилтан</th>
                            <th className="p-2 text-left border-b border-slate-200">Албан тушаал</th>
                            <th className="p-2 text-center border-b border-slate-200 w-32">Төлөв</th>
                            <th className="p-2 text-center border-b border-slate-200 w-32">Ирсэн цаг</th>
                            {canManage && <th className="p-2 text-center border-b border-slate-200 w-40">Үйлдэл</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {staff.map((s, i) => {
                            const a = attMap.get(s.id)
                            const time = a?.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''
                            return (
                              <tr key={s.id} className="hover:bg-slate-50">
                                <td className="p-2 border-b border-slate-100 text-slate-500">{i+1}</td>
                                <td className="p-2 border-b border-slate-100 font-medium">{s.last_name}.{s.first_name}</td>
                                <td className="p-2 border-b border-slate-100 text-xs text-slate-600">{s.positions?.name || ''}</td>
                                <td className="p-2 border-b border-slate-100 text-center">
                                  {a?.status === 'present' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">✅ Ирсэн</span>}
                                  {a?.status === 'onduty' && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">👶 Ангид үлдсэн</span>}
                                  {a?.status === 'leave' && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">📄 Чөлөөтэй</span>}
                                  {a?.status === 'skipped' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">❌ Тасалсан</span>}
                                  {!a && <span className="text-slate-400 text-xs">—</span>}
                                </td>
                                <td className="p-2 border-b border-slate-100 text-center text-xs text-slate-600">{time}</td>
                                {canManage && (
                                  <td className="p-2 border-b border-slate-100 text-center">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={()=>mark(s.id, e.id, 'present')} title="Ирсэн" className={`px-2 py-1 rounded text-xs font-medium ${a?.status==='present'?'bg-emerald-600 text-white':'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}>✅</button>
                                      <button onClick={()=>mark(s.id, e.id, 'onduty')} title="Ангид үлдсэн" className={`px-2 py-1 rounded text-xs font-medium ${a?.status==='onduty'?'bg-amber-600 text-white':'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}>👶</button>
                                      <button onClick={()=>mark(s.id, e.id, 'leave')} title="Чөлөөтэй" className={`px-2 py-1 rounded text-xs font-medium ${a?.status==='leave'?'bg-blue-600 text-white':'bg-blue-100 hover:bg-blue-200 text-blue-700'}`}>📄</button>
                                      <button onClick={()=>mark(s.id, e.id, 'skipped')} title="Тасалсан" className={`px-2 py-1 rounded text-xs font-medium ${a?.status==='skipped'?'bg-red-600 text-white':'bg-red-100 hover:bg-red-200 text-red-700'}`}>❌</button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex-shrink-0"><h2 className="text-lg font-semibold">Шинэ үйл ажиллагаа</h2></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг *</label><input value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо *</label><input type="date" value={form.event_date} onChange={(e)=>setForm({...form, event_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Цаг</label><input type="time" value={form.event_time} onChange={(e)=>setForm({...form, event_time: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Байршил</label><input value={form.location} onChange={(e)=>setForm({...form, location: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Танхим, гадаа гэх мэт" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={4} value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-2 flex-shrink-0">
              <button onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
              <button onClick={saveEvent} disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg font-medium">💾 Хадгалах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
