'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Schedule = {
  id: string
  date: string
  category: 'general' | 'deep' | 'kitchen' | 'disinfection' | 'sanitary' | 'other'
  location: string | null
  description: string | null
  status: 'planned' | 'done' | 'postponed'
  photo_url: string | null
  extra_links: string[]
  assignee_id: string | null
  completed_at: string | null
  reviewer_note: string | null
  employees?: { last_name: string; first_name: string } | null
  reviewer?: { last_name: string; first_name: string } | null
}

const CATS = {
  general:      { icon: '🧹', label: 'Ердийн цэвэрлэгээ' },
  deep:         { icon: '🧽', label: 'Их цэвэрлэгээ' },
  kitchen:      { icon: '🍳', label: 'Гал тогоо' },
  disinfection: { icon: '🧴', label: 'Ариутгал' },
  sanitary:     { icon: '🚻', label: 'Ариун цэвэр' },
  other:        { icon: '📋', label: 'Бусад' },
} as const

const STATUS = {
  planned:   { icon: '📋', label: 'Төлөвлөсөн',    color: 'bg-slate-100 text-slate-700' },
  done:      { icon: '✅', label: 'Хийсэн',        color: 'bg-emerald-100 text-emerald-700' },
  postponed: { icon: '⏳', label: 'Хойшлуулсан', color: 'bg-amber-100 text-amber-700' },
} as const

type Cat = keyof typeof CATS

export default function TsevrlgeePage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const canReview = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')

  const [items, setItems] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'planned' | 'done'>('planned')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'general' as Cat, location: '', description: '', file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cleaning_schedules')
      .select('*, employees:assignee_id(last_name, first_name), reviewer:reviewer_id(last_name, first_name)')
      .order('date', { ascending: false })
      .limit(200)
    setItems((data as unknown as Schedule[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ date: new Date().toISOString().split('T')[0], category: 'general', location: '', description: '', file: null, extraLinks: '' })
    setShowForm(true)
  }
  function openEdit(s: Schedule) {
    setEditing(s)
    setForm({ date: s.date, category: s.category, location: s.location || '', description: s.description || '', file: null, extraLinks: (s.extra_links || []).join('\n') })
    setShowForm(true)
  }
  async function save() {
    if (!me) return
    setSaving(true)
    let photo_url = editing?.photo_url || null
    if (form.file) {
      const path = `cleaning/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      photo_url = pub?.publicUrl || null
    }
    const payload = {
      date: form.date, category: form.category,
      location: form.location || null, description: form.description || null,
      photo_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      assignee_id: editing?.assignee_id || me.id,
    }
    const { error } = editing
      ? await supabase.from('cleaning_schedules').update({...payload, updated_at: new Date().toISOString()}).eq('id', editing.id)
      : await supabase.from('cleaning_schedules').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false); load()
  }
  async function markDone(s: Schedule) {
    await supabase.from('cleaning_schedules').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', s.id)
    load()
  }
  async function remove(s: Schedule) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('cleaning_schedules').delete().eq('id', s.id)
    load()
  }

  const filtered = tab === 'all' ? items : items.filter((i) => i.status === tab)
  const counts = { all: items.length, planned: items.filter((i) => i.status === 'planned').length, done: items.filter((i) => i.status === 'done').length }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🧹</div>
              <div>
                <h1 className="text-2xl font-bold">Их цэвэрлэгээний хуваарь</h1>
                <p className="text-sm opacity-90">Өдөр тутмын үйл ажиллагаа, цэвэрлэгээ, ариутгал</p>
              </div>
            </div>
            <button onClick={openAdd} className="bg-white text-teal-700 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">
              + Хуваарь нэмэх
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap">
          {(['planned','done','all'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-teal-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              {k === 'planned' ? '📋 Хийх' : k === 'done' ? '✅ Хийсэн' : '📚 Бүгд'} ({counts[k]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">🧹</div>
            <div>Хуваарь байхгүй</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const cat = CATS[s.category]
              const st = STATUS[s.status]
              return (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{cat.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-slate-500">🗓 {s.date}</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{cat.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.icon} {st.label}</span>
                      </div>
                      {s.location && <h3 className="font-semibold text-slate-800">📍 {s.location}</h3>}
                      {s.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{s.description}</div>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {s.photo_url && <a href={s.photo_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл</a>}
                        {(s.extra_links || []).map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>))}
                      </div>
                      {s.employees && <div className="text-xs text-slate-500 mt-2">— {s.employees.last_name}.{s.employees.first_name}{s.completed_at && ` · Гүйц: ${new Date(s.completed_at).toLocaleDateString('mn-MN')}`}</div>}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {s.status === 'planned' && (s.assignee_id === me?.id || canReview) && <button onClick={() => markDone(s)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 rounded font-medium">✅ Гүйц</button>}
                      {(s.assignee_id === me?.id || canReview) && <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">Засах</button>}
                      {(s.assignee_id === me?.id || canReview) && <button onClick={() => remove(s)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">{editing ? 'Засах' : 'Шинэ хуваарь'}</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Ангилал</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Cat })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {(Object.keys(CATS) as Cat[]).map((c) => (<option key={c} value={c}>{CATS[c].icon} {CATS[c].label}</option>))}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">📍 Байршил</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Хаана" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Юуг цэвэрлэсэн, ямар байдалтай" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📷 Зураг</label><input type="file" accept="image/*,video/*,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд</label><textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
