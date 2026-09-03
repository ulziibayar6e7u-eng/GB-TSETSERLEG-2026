'use client'

import { useEffect, useMemo, useState, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Activity = {
  id: string
  employee_id: string
  category: 'negdel' | 'hicheel_suusan' | 'zuvluguu'
  date: string
  title: string | null
  description: string | null
  file_url: string | null
  extra_links: string[]
  created_at: string
}

const CATS = {
  negdel:          { icon: '🤝', label: 'Заах аргын нэгдлийн ажил', color: 'from-indigo-500 to-purple-500' },
  hicheel_suusan:  { icon: '👀', label: 'Хичээлд суусан байдал', color: 'from-emerald-500 to-teal-500' },
  zuvluguu:        { icon: '💬', label: 'Зөвлөгөө мэдээллээр ханган ажилласан', color: 'from-amber-500 to-orange-500' },
} as const
type Cat = keyof typeof CATS

export default function ArgaZuichPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const canEdit = me && (me.id === id || me.is_admin || me.role === 'erhlegch')

  const [emp, setEmp] = useState<{ last_name: string; first_name: string; positions?: { name: string } } | null>(null)
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Cat>('negdel')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'negdel' as Cat, title: '', description: '', file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [empRes, actRes] = await Promise.all([
      supabase.from('employees').select('last_name, first_name, positions(name)').eq('id', id).single(),
      supabase.from('argazuich_activities').select('*').eq('employee_id', id).order('date', { ascending: false }).limit(300),
    ])
    setEmp(empRes.data as unknown as { last_name: string; first_name: string; positions?: { name: string } })
    setItems((actRes.data as unknown as Activity[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  function openAdd(c: Cat) {
    setEditing(null)
    setForm({ date: new Date().toISOString().split('T')[0], category: c, title: '', description: '', file: null, extraLinks: '' })
    setShowForm(true)
  }
  function openEdit(a: Activity) {
    setEditing(a)
    setForm({ date: a.date, category: a.category, title: a.title || '', description: a.description || '', file: null, extraLinks: (a.extra_links || []).join('\n') })
    setShowForm(true)
  }
  async function save() {
    if (!me) return
    setSaving(true)
    let file_url = editing?.file_url || null
    if (form.file) {
      const path = `argazuich/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const payload = {
      employee_id: id,
      category: form.category,
      date: form.date,
      title: form.title || null,
      description: form.description || null,
      file_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
    }
    const { error } = editing
      ? await supabase.from('argazuich_activities').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('argazuich_activities').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false); load()
  }
  async function remove(a: Activity) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('argazuich_activities').delete().eq('id', a.id)
    load()
  }

  const filtered = items.filter((i) => i.category === tab)
  const counts = { negdel: 0, hicheel_suusan: 0, zuvluguu: 0 } as Record<Cat, number>
  items.forEach((i) => { counts[i.category]++ })

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className={`rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br ${CATS[tab].color}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎓</div>
              <div>
                <h1 className="text-2xl font-bold">{emp ? `${emp.last_name}.${emp.first_name}` : '...'}</h1>
                <p className="text-sm opacity-90">Арга зүйч · {emp?.positions?.name || ''}</p>
              </div>
            </div>
            <Link href="/bagsh" className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm">← Буцах</Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap">
          {(Object.keys(CATS) as Cat[]).map((c) => (
            <button key={c} onClick={() => setTab(c)} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === c ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              {CATS[c].icon} {CATS[c].label} ({counts[c]})
            </button>
          ))}
        </div>

        <div className="flex justify-end mb-3">
          {canEdit && <button onClick={() => openAdd(tab)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Нэмэх</button>}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">{CATS[tab].icon}</div>
            <div>Бичлэг байхгүй</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{CATS[a.category].icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-1">🗓 {a.date}</div>
                    {a.title && <h3 className="font-semibold text-slate-800">{a.title}</h3>}
                    {a.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{a.description}</div>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.file_url && <a href={a.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл/Зураг/Бичлэг</a>}
                      {(a.extra_links || []).map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>))}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">Засах</button>
                      <button onClick={() => remove(a)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">{editing ? 'Засах' : 'Шинэ бичлэг'}</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Ангилал</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Cat })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {(Object.keys(CATS) as Cat[]).map((c) => (<option key={c} value={c}>{CATS[c].icon} {CATS[c].label}</option>))}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📷 Зураг / 🎥 Бичлэг / 📎 Файл</label><input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд</label><textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
