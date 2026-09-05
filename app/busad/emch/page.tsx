'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Child = { id: string; last_name: string; first_name: string; birth_date: string | null; groups?: { name: string; icon: string; color: string } }
type Employee = { id: string; last_name: string; first_name: string; positions?: { name: string } }
type Record = {
  id: string
  subject_type: 'child' | 'staff'
  child_id: string | null
  staff_id: string | null
  date: string
  record_type: 'checkup' | 'illness' | 'vaccine' | 'injury' | 'note'
  height_cm: number | null
  weight_kg: number | null
  temperature: number | null
  diagnosis: string | null
  treatment: string | null
  vaccine_name: string | null
  next_date: string | null
  note: string | null
  blood_pressure: string | null
  complaint: string | null
  action_taken: string | null
  service_provided: string | null
  file_url: string | null
  created_at: string
  children?: Child | null
  employees?: Employee | null
}
type Inspection = {
  id: string
  date: string
  category: 'kitchen' | 'cleaning' | 'food_quality' | 'disinfection' | 'serving' | 'other'
  target: string | null
  status: 'ok' | 'warning' | 'critical'
  description: string | null
  recommendations: string | null
  photo_url: string | null
  reviewer_note: string | null
  reviewed_at: string | null
  employees?: { last_name: string; first_name: string } | null
  reviewer?: { last_name: string; first_name: string } | null
}

const TYPES = {
  checkup: { icon: '🩺', label: 'Үзлэг',   color: 'bg-blue-100 text-blue-700' },
  illness: { icon: '🤒', label: 'Өвчлөл',  color: 'bg-red-100 text-red-700' },
  vaccine: { icon: '💉', label: 'Вакцин',  color: 'bg-emerald-100 text-emerald-700' },
  injury:  { icon: '🩹', label: 'Гэмтэл',  color: 'bg-amber-100 text-amber-700' },
  note:    { icon: '📝', label: 'Тэмдэглэл', color: 'bg-slate-100 text-slate-700' },
} as const
type RType = keyof typeof TYPES

const INSP_CAT = {
  daily_clean:  { icon: '🧹', label: 'Өдөр тутмын цэвэрлэгээ' },
  deep_clean:   { icon: '🧽', label: 'Их цэвэрлэгээ' },
  disinfection: { icon: '🧴', label: 'Ариутгал, халдваргүйтгэл' },
  ventilation:  { icon: '💨', label: 'Агааржуулалт' },
  kitchen:      { icon: '🍳', label: 'Гал тогоо' },
  food_prod:    { icon: '🍲', label: 'Хоол үйлдвэрлэл' },
  food_quality: { icon: '🍽', label: 'Хоолны чанар, амталгаа' },
  serving:      { icon: '👔', label: 'Үйлчилгээ' },
  toilet_room:  { icon: '🚻', label: 'Ариун цэврийн өрөө' },
  other:        { icon: '📋', label: 'Бусад' },
} as const
type ICat = keyof typeof INSP_CAT

const INSP_STATUS = {
  ok:       { icon: '✅', label: 'Хэвийн',    color: 'bg-emerald-100 text-emerald-700' },
  warning:  { icon: '⚠️', label: 'Анхаарах', color: 'bg-amber-100 text-amber-700' },
  critical: { icon: '🔴', label: 'Онцгой',    color: 'bg-red-100 text-red-700' },
} as const

export default function EmchPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const [tab, setTab] = useState<'children' | 'staff' | 'inspection' | 'cleaning_review'>('children')
  const [cleaningRows, setCleaningRows] = useState<{
    id: string; date: string; category: string; location: string | null; description: string | null;
    status: string; photo_url: string | null; extra_links: string[];
    doctor_status: 'ok' | 'warning' | 'critical' | null; doctor_note: string | null; doctor_reviewed_at: string | null;
    employees?: { last_name: string; first_name: string } | null;
    doctor_reviewer?: { last_name: string; first_name: string } | null;
  }[]>([])
  const [crReview, setCrReview] = useState<{ id: string; status: 'ok'|'warning'|'critical'; note: string } | null>(null)
  const [records, setRecords] = useState<Record[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [staff, setStaff] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Record | null>(null)
  const [form, setForm] = useState({
    subject_type: 'child' as 'child' | 'staff',
    subject_id: '',
    date: new Date().toISOString().split('T')[0],
    record_type: 'checkup' as RType,
    height_cm: '', weight_kg: '', temperature: '',
    diagnosis: '', treatment: '', vaccine_name: '', next_date: '', note: '',
    blood_pressure: '', complaint: '', action_taken: '', service_provided: '',
    file: null as File | null,
  })
  const [saving, setSaving] = useState(false)

  // Inspection form
  const [showInsp, setShowInsp] = useState(false)
  const [editInsp, setEditInsp] = useState<Inspection | null>(null)
  const [inspForm, setInspForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'kitchen' as ICat, target: '', status: 'ok' as Inspection['status'], description: '', recommendations: '', file: null as File | null })
  const [savingInsp, setSavingInsp] = useState(false)

  async function load() {
    setLoading(true)
    const [r, c, s, ins, cln] = await Promise.all([
      supabase.from('health_records').select('*, children(id, last_name, first_name, birth_date, groups(name, icon, color)), employees:staff_id(id, last_name, first_name, positions(name))').order('date', { ascending: false }).limit(200),
      supabase.from('children').select('id, last_name, first_name, birth_date, groups(name, icon, color)').eq('status', 'active').order('last_name'),
      supabase.from('employees').select('id, last_name, first_name, positions(name)').order('first_name'),
      supabase.from('doctor_inspections').select('*, employees:inspector_id(last_name, first_name), reviewer:reviewer_id(last_name, first_name)').order('date', { ascending: false }).limit(200),
      supabase.from('cleaning_schedules').select('id, date, category, location, description, status, photo_url, extra_links, doctor_status, doctor_note, doctor_reviewed_at, employees:assignee_id(last_name, first_name), doctor_reviewer:doctor_reviewer_id(last_name, first_name)').order('date', { ascending: false }).limit(200),
    ])
    setRecords((r.data as unknown as Record[]) || [])
    setChildren((c.data as unknown as Child[]) || [])
    setStaff((s.data as unknown as Employee[]) || [])
    setInspections((ins.data as unknown as Inspection[]) || [])
    setCleaningRows((cln.data as unknown as typeof cleaningRows) || [])
    setLoading(false)
  }
  async function saveCrReview() {
    if (!crReview || !me) return
    await supabase.from('cleaning_schedules').update({
      doctor_status: crReview.status,
      doctor_note: crReview.note || null,
      doctor_reviewer_id: me.id,
      doctor_reviewed_at: new Date().toISOString(),
    }).eq('id', crReview.id)
    setCrReview(null); load()
  }
  useEffect(() => { load() }, [])

  function openAdd(subjectType: 'child' | 'staff') {
    setEditing(null)
    setForm({ subject_type: subjectType, subject_id: '', date: new Date().toISOString().split('T')[0], record_type: 'checkup', height_cm: '', weight_kg: '', temperature: '', diagnosis: '', treatment: '', vaccine_name: '', next_date: '', note: '', blood_pressure: '', complaint: '', action_taken: '', service_provided: '', file: null })
    setShowForm(true)
  }
  function openEdit(r: Record) {
    setEditing(r)
    setForm({
      subject_type: r.subject_type,
      subject_id: r.subject_type === 'child' ? (r.child_id || '') : (r.staff_id || ''),
      date: r.date, record_type: r.record_type,
      height_cm: r.height_cm?.toString() || '',
      weight_kg: r.weight_kg?.toString() || '',
      temperature: r.temperature?.toString() || '',
      diagnosis: r.diagnosis || '', treatment: r.treatment || '',
      vaccine_name: r.vaccine_name || '', next_date: r.next_date || '',
      note: r.note || '',
      blood_pressure: (r as unknown as { blood_pressure?: string }).blood_pressure || '',
      complaint: (r as unknown as { complaint?: string }).complaint || '',
      action_taken: (r as unknown as { action_taken?: string }).action_taken || '',
      service_provided: (r as unknown as { service_provided?: string }).service_provided || '',
      file: null,
    })
    setShowForm(true)
  }
  async function save() {
    if (!me) return
    setSaving(true)
    let file_url = editing?.file_url || null
    if (form.file) {
      const path = `health/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const payload = {
      subject_type: form.subject_type,
      child_id: form.subject_type === 'child' ? form.subject_id : null,
      staff_id: form.subject_type === 'staff' ? form.subject_id : null,
      date: form.date, record_type: form.record_type,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      temperature: form.temperature ? parseFloat(form.temperature) : null,
      diagnosis: form.diagnosis || null, treatment: form.treatment || null,
      vaccine_name: form.vaccine_name || null, next_date: form.next_date || null,
      note: form.note || null, file_url, created_by: me.id,
      blood_pressure: form.blood_pressure || null,
      complaint: form.complaint || null,
      action_taken: form.action_taken || null,
      service_provided: form.service_provided || null,
    }
    const { error } = editing
      ? await supabase.from('health_records').update(payload).eq('id', editing.id)
      : await supabase.from('health_records').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false)
    load()
  }
  async function remove(r: Record) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('health_records').delete().eq('id', r.id)
    load()
  }

  // Inspection funcs
  function openInsp(i?: Inspection) {
    if (i) {
      setEditInsp(i)
      setInspForm({ date: i.date, category: i.category, target: i.target || '', status: i.status, description: i.description || '', recommendations: i.recommendations || '', file: null })
    } else {
      setEditInsp(null)
      setInspForm({ date: new Date().toISOString().split('T')[0], category: 'kitchen', target: '', status: 'ok', description: '', recommendations: '', file: null })
    }
    setShowInsp(true)
  }
  async function saveInsp() {
    if (!me) return
    setSavingInsp(true)
    let photo_url = editInsp?.photo_url || null
    if (inspForm.file) {
      const path = `inspections/${Date.now()}_${inspForm.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, inspForm.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSavingInsp(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      photo_url = pub?.publicUrl || null
    }
    const payload = {
      date: inspForm.date, category: inspForm.category,
      target: inspForm.target || null, status: inspForm.status,
      description: inspForm.description || null,
      recommendations: inspForm.recommendations || null,
      photo_url, inspector_id: me.id,
    }
    const { error } = editInsp
      ? await supabase.from('doctor_inspections').update({...payload, updated_at: new Date().toISOString()}).eq('id', editInsp.id)
      : await supabase.from('doctor_inspections').insert(payload)
    setSavingInsp(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowInsp(false)
    load()
  }
  async function removeInsp(i: Inspection) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('doctor_inspections').delete().eq('id', i.id)
    load()
  }

  const childRecords = records.filter((r) => r.subject_type === 'child')
  const staffRecords = records.filter((r) => r.subject_type === 'staff')
  const stats = {
    child: childRecords.length,
    staff: staffRecords.length,
    insp: inspections.length,
    warnings: inspections.filter((i) => i.status === 'warning' || i.status === 'critical').length,
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-red-500 via-rose-500 to-pink-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🩺</div>
              <div>
                <h1 className="text-2xl font-bold">Эмчийн хэсэг</h1>
                <p className="text-sm opacity-90">Хүүхэд, ажилтны эрүүл мэнд + Эмчийн хяналт</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div><div className="text-2xl font-bold">{stats.child}</div><div className="text-xs opacity-80">Хүүхдийн</div></div>
              <div><div className="text-2xl font-bold">{stats.staff}</div><div className="text-xs opacity-80">Ажилтны</div></div>
              <div><div className="text-2xl font-bold">{stats.insp}</div><div className="text-xs opacity-80">Хяналт</div></div>
              <div><div className="text-2xl font-bold">{stats.warnings}</div><div className="text-xs opacity-80">Анхаарал</div></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap items-center">
          <button onClick={() => setTab('children')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'children' ? 'bg-red-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>👧 Хүүхэд ({stats.child})</button>
          <button onClick={() => setTab('staff')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'staff' ? 'bg-red-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>👨‍🏫 Багш ажилтан ({stats.staff})</button>
          <button onClick={() => setTab('inspection')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'inspection' ? 'bg-red-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>🔍 Эмчийн хяналт ({stats.insp}){stats.warnings > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.warnings}</span>}</button>
          <button onClick={() => setTab('cleaning_review')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'cleaning_review' ? 'bg-red-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>🧹 Туслах цэвэрлэгээ хянах ({cleaningRows.length}){cleaningRows.filter((c) => !c.doctor_status).length > 0 && <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{cleaningRows.filter((c) => !c.doctor_status).length}</span>}</button>
          <div className="ml-auto">
            {tab === 'children' && <button onClick={() => openAdd('child')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Хүүхдийн бүртгэл</button>}
            {tab === 'staff' && <button onClick={() => openAdd('staff')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Ажилтны бүртгэл</button>}
            {tab === 'inspection' && <button onClick={() => openInsp()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Хяналт бүртгэх</button>}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : tab === 'inspection' ? (
          inspections.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">🔍</div>
              <div>Хяналтын бүртгэл байхгүй</div>
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map((i) => {
                const cat = INSP_CAT[i.category]
                const st = INSP_STATUS[i.status]
                return (
                  <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{cat.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-slate-500">🗓 {i.date}</span>
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{cat.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.icon} {st.label}</span>
                        </div>
                        {i.target && <h3 className="font-semibold text-slate-800">{i.target}</h3>}
                        {i.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{i.description}</div>}
                        {i.recommendations && <div className="text-sm text-amber-800 bg-amber-50 border-l-4 border-amber-400 p-2 rounded mt-2"><b>Санал:</b> {i.recommendations}</div>}
                        {i.photo_url && <a href={i.photo_url} target="_blank" rel="noopener" className="inline-block mt-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📷 Зураг</a>}
                        {i.reviewer_note && (
                          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border-l-4 border-emerald-400 text-sm">
                            <div className="text-xs font-semibold text-emerald-700 mb-1">Эрхлэгчийн хариу{i.reviewer ? ` — ${i.reviewer.last_name}.${i.reviewer.first_name}` : ''}</div>
                            {i.reviewer_note}
                          </div>
                        )}
                        {i.employees && <div className="text-xs text-slate-400 mt-2">— {i.employees.last_name}.{i.employees.first_name}</div>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => openInsp(i)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">Засах</button>
                        <button onClick={() => removeInsp(i)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : tab === 'cleaning_review' ? (
          cleaningRows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">🧹</div>
              <div>Багшийн туслах нар цэвэрлэгээ оруулаагүй байна</div>
            </div>
          ) : (
            <div className="space-y-3">
              {cleaningRows.map((c) => {
                const isRev = crReview?.id === c.id
                const emchSt = c.doctor_status ? INSP_STATUS[c.doctor_status] : null
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🧹</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-slate-500">🗓 {c.date}</span>
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{c.category}</span>
                          {c.location && <span className="text-xs text-slate-500">📍 {c.location}</span>}
                          {emchSt ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emchSt.color}`}>{emchSt.icon} Эмчийн үнэлгээ: {emchSt.label}</span>
                          ) : (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⏳ Хянаагүй</span>
                          )}
                        </div>
                        {c.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.description}</div>}
                        {c.photo_url && <a href={c.photo_url} target="_blank" rel="noopener" className="inline-block mt-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📷 Зураг</a>}
                        {c.employees && <div className="text-xs text-slate-400 mt-2">— {c.employees.last_name}.{c.employees.first_name}</div>}
                        {c.doctor_note && (
                          <div className="mt-3 p-3 rounded-lg bg-red-50 border-l-4 border-red-400 text-sm">
                            <div className="text-xs font-semibold text-red-700 mb-1">🩺 Эмчийн тэмдэглэл{c.doctor_reviewer ? ` — ${c.doctor_reviewer.last_name}.${c.doctor_reviewer.first_name}` : ''}</div>
                            {c.doctor_note}
                          </div>
                        )}
                        {isRev && (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <div className="text-xs font-semibold text-slate-600 mb-2">🩺 ЭМЧИЙН ҮНЭЛГЭЭ</div>
                            <div className="flex gap-2 mb-2">
                              {(['ok','warning','critical'] as const).map((s) => (
                                <button key={s} onClick={() => setCrReview({ ...crReview!, status: s })} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${crReview!.status === s ? INSP_STATUS[s].color : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                  {INSP_STATUS[s].icon} {INSP_STATUS[s].label}
                                </button>
                              ))}
                            </div>
                            <textarea rows={2} value={crReview!.note} onChange={(e) => setCrReview({ ...crReview!, note: e.target.value })} placeholder="Тэмдэглэл, зөвлөгөө..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2" />
                            <div className="flex gap-2">
                              <button onClick={() => setCrReview(null)} className="px-3 py-1.5 text-sm text-slate-600">Болих</button>
                              <button onClick={saveCrReview} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">💾 Үнэлгээ хадгалах</button>
                            </div>
                          </div>
                        )}
                      </div>
                      {!isRev && (
                        <button onClick={() => setCrReview({ id: c.id, status: c.doctor_status || 'ok', note: c.doctor_note || '' })} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                          {c.doctor_status ? '🔄 Дахин' : '🩺 Үнэлэх'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          (() => {
            const list = tab === 'children' ? childRecords : staffRecords
            if (list.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <div className="text-5xl mb-3">🏥</div>
                  <div>Бүртгэл байхгүй</div>
                </div>
              )
            }
            return (
              <div className="space-y-3">
                {list.map((r) => {
                  const t = TYPES[r.record_type]
                  const name = r.subject_type === 'child'
                    ? (r.children ? `${r.children.last_name}.${r.children.first_name}` : '?')
                    : (r.employees ? `${r.employees.last_name}.${r.employees.first_name}` : '?')
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{t.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.color}`}>{t.label}</span>
                            <span className="text-xs text-slate-500">🗓 {r.date}</span>
                            {r.next_date && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔔 Дараагийн: {r.next_date}</span>}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {name}
                            {r.subject_type === 'child' && r.children?.groups && <span className="text-xs text-slate-500 ml-2 font-normal">{r.children.groups.icon} {r.children.groups.name}</span>}
                            {r.subject_type === 'staff' && r.employees?.positions && <span className="text-xs text-slate-500 ml-2 font-normal">· {r.employees.positions.name}</span>}
                          </div>
                          {(r.height_cm || r.weight_kg || r.temperature) && (
                            <div className="text-sm text-slate-600 mt-1 flex gap-3">
                              {r.height_cm && <span>📏 {r.height_cm} см</span>}
                              {r.weight_kg && <span>⚖️ {r.weight_kg} кг</span>}
                              {r.temperature && <span>🌡 {r.temperature}°C</span>}
                            </div>
                          )}
                          {r.vaccine_name && <div className="text-sm text-slate-700 mt-1">💉 {r.vaccine_name}</div>}
                          {r.diagnosis && <div className="text-sm text-slate-700 mt-1"><b>Оношилгоо:</b> {r.diagnosis}</div>}
                          {r.treatment && <div className="text-sm text-slate-700 mt-1"><b>Эмчилгээ:</b> {r.treatment}</div>}
                          {r.note && <div className="text-sm text-slate-600 mt-1">{r.note}</div>}
                          {r.file_url && <a href={r.file_url} target="_blank" rel="noopener" className="inline-block mt-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл</a>}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">Засах</button>
                          <button onClick={() => remove(r)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">
                {editing ? 'Засах' : form.subject_type === 'child' ? 'Хүүхдийн эрүүл мэнд' : 'Ажилтны эрүүл мэнд'}
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Төрөл</label>
                  <select value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value as RType })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {(Object.keys(TYPES) as RType[]).map((t) => (<option key={t} value={t}>{TYPES[t].icon} {TYPES[t].label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">{form.subject_type === 'child' ? 'Хүүхэд (бүлгээр)' : 'Ажилтан'}</label>
                <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="">— Сонгох —</option>
                  {form.subject_type === 'child' ? (() => {
                    const grouped: Record<string, Child[]> = {}
                    children.forEach((c) => {
                      const key = c.groups ? `${c.groups.icon} ${c.groups.name}` : '📋 Бусад'
                      if (!grouped[key]) grouped[key] = []
                      grouped[key].push(c)
                    })
                    return Object.keys(grouped).sort().map((gname) => (
                      <optgroup key={gname} label={gname}>
                        {grouped[gname].map((c) => (<option key={c.id} value={c.id}>{c.last_name}.{c.first_name}</option>))}
                      </optgroup>
                    ))
                  })() : staff.map((s) => (<option key={s.id} value={s.id}>{s.last_name}.{s.first_name}{s.positions ? ` · ${s.positions.name}` : ''}</option>))}
                </select>
              </div>
              {form.record_type === 'checkup' && form.subject_type === 'child' && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm text-slate-700 mb-1">📏 Өндөр</label><input type="number" step="0.1" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                  <div><label className="block text-sm text-slate-700 mb-1">⚖️ Жин</label><input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                  <div><label className="block text-sm text-slate-700 mb-1">🌡 Халуун</label><input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                </div>
              )}
              {form.subject_type === 'staff' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm text-slate-700 mb-1">💗 Даралт (мм.муб)</label><input value={form.blood_pressure} onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })} placeholder="ж.нь: 120/80" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                    <div><label className="block text-sm text-slate-700 mb-1">🌡 Халуун</label><input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                  </div>
                  <div><label className="block text-sm text-slate-700 mb-1">🩹 Зовиур</label><textarea rows={2} value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} placeholder="Ямар шинж тэмдэгтэй, юу нь зовоож байгаа" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                  <div><label className="block text-sm text-slate-700 mb-1">💊 Хийгдсэн тусламж, үйлчилгээ</label><textarea rows={2} value={form.service_provided} onChange={(e) => setForm({ ...form, service_provided: e.target.value })} placeholder="Юу хийсэн, ямар эм өгсөн" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                  <div><label className="block text-sm text-slate-700 mb-1">📋 Авах арга хэмжээ</label><textarea rows={2} value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} placeholder="Дараагийн үе шат, зөвлөгөө" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                </>
              )}
              {form.record_type === 'illness' && (
                <>
                  <div><label className="block text-sm text-slate-700 mb-1">Оношилгоо</label><input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                  <div><label className="block text-sm text-slate-700 mb-1">Эмчилгээ</label><textarea rows={2} value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                </>
              )}
              {form.record_type === 'vaccine' && (
                <>
                  <div><label className="block text-sm text-slate-700 mb-1">💉 Вакцины нэр</label><input value={form.vaccine_name} onChange={(e) => setForm({ ...form, vaccine_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                  <div><label className="block text-sm text-slate-700 mb-1">🔔 Дараагийн</label><input type="date" value={form.next_date} onChange={(e) => setForm({ ...form, next_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                </>
              )}
              <div><label className="block text-sm text-slate-700 mb-1">Тэмдэглэл</label><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Файл</label><input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={save} disabled={saving || !form.subject_id} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInsp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">{editInsp ? 'Хяналт засах' : 'Эмчийн шинэ хяналт'}</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={inspForm.date} onChange={(e) => setInspForm({ ...inspForm, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Ангилал</label>
                  <select value={inspForm.category} onChange={(e) => setInspForm({ ...inspForm, category: e.target.value as ICat })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {(Object.keys(INSP_CAT) as ICat[]).map((c) => (<option key={c} value={c}>{INSP_CAT[c].icon} {INSP_CAT[c].label}</option>))}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Хаана / Юуг шалгасан</label><input value={inspForm.target} onChange={(e) => setInspForm({ ...inspForm, target: e.target.value })} placeholder="Жш: Гал тогоо, Бэлтгэл бүлгийн ариун цэвэр" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Байдал</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(INSP_STATUS) as Inspection['status'][]).map((s) => (
                    <button key={s} onClick={() => setInspForm({ ...inspForm, status: s })} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 ${inspForm.status === s ? 'border-current ' + INSP_STATUS[s].color : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                      {INSP_STATUS[s].icon} {INSP_STATUS[s].label}
                    </button>
                  ))}
                </div>
                {inspForm.status !== 'ok' && <div className="text-xs text-amber-700 mt-1">⚠️ Хадгалахад эрхлэгчид автомат мэдэгдэл очно</div>}
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Тодорхойлолт</label><textarea rows={3} value={inspForm.description} onChange={(e) => setInspForm({ ...inspForm, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Санал зөвлөмж</label><textarea rows={2} value={inspForm.recommendations} onChange={(e) => setInspForm({ ...inspForm, recommendations: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📷 Зураг</label><input type="file" accept="image/*,.pdf" onChange={(e) => setInspForm({ ...inspForm, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowInsp(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={saveInsp} disabled={savingInsp} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{savingInsp ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
