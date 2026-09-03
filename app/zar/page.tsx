'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Employee = { id: string; last_name: string; first_name: string; positions?: { name: string } }
type Announcement = {
  id: string
  author_id: string | null
  title: string
  content: string | null
  category: string
  file_url: string | null
  extra_links: string[]
  pinned: boolean
  audience: string
  created_at: string
  employees?: Employee | null
}

const CATEGORIES = [
  { value: 'general', label: '📢 Ерөнхий', color: 'bg-slate-100 text-slate-700' },
  { value: 'meeting', label: '👥 Хурал', color: 'bg-blue-100 text-blue-700' },
  { value: 'event',   label: '🎉 Арга хэмжээ', color: 'bg-pink-100 text-pink-700' },
  { value: 'notice',  label: '⚠️ Мэдэгдэл', color: 'bg-amber-100 text-amber-700' },
]

const AUDIENCES = [
  { value: 'staff', label: 'Ажилтан', icon: '👥' },
  { value: 'parents', label: 'Эцэг эх + ажилтан', icon: '👨‍👩‍👧' },
]

export default function ZarPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState({ title: '', content: '', category: 'general', audience: 'staff', pinned: false, file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)
  const [catFilter, setCatFilter] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*, employees:author_id(id, last_name, first_name, positions(name))')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    setItems((data as unknown as Announcement[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ title: '', content: '', category: 'general', audience: 'staff', pinned: false, file: null, extraLinks: '' })
    setShowForm(true)
  }

  function openEdit(a: Announcement) {
    setEditing(a)
    setForm({
      title: a.title,
      content: a.content || '',
      category: a.category,
      audience: a.audience,
      pinned: a.pinned,
      file: null,
      extraLinks: (a.extra_links || []).join('\n'),
    })
    setShowForm(true)
  }

  async function save() {
    if (!me) return
    setSaving(true)
    let file_url = editing?.file_url || null
    if (form.file) {
      const path = `announcements/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const payload = {
      title: form.title.trim(),
      content: form.content || null,
      category: form.category,
      audience: form.audience,
      pinned: form.pinned,
      file_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      author_id: me.id,
    }
    if (editing) await supabase.from('announcements').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    else await supabase.from('announcements').insert(payload)
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function remove(a: Announcement) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('announcements').delete().eq('id', a.id)
    load()
  }

  async function togglePin(a: Announcement) {
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id)
    load()
  }

  const filtered = items.filter((a) => !catFilter || a.category === catFilter)

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">📢 Зар мэдээ · Дотоод</h1>
            <p className="text-sm text-slate-500 mt-1">
              🔒 Зөвхөн байгууллагын албан хаагчдад харагдана. Эцэг эхэд хүргэх зарыг <a href="/uil-ajilgaa" className="text-blue-600 hover:underline">📸 Сургалт үйл ажиллагаа</a> хэсгээс оруулна уу.
            </p>
          </div>
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium">
            + Зар нэмэх
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setCatFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!catFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            Бүгд
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${catFilter === c.value ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📢</div>
            <div>Зар мэдээ байхгүй</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const cat = CATEGORIES.find((c) => c.value === a.category) || CATEGORIES[0]
              const aud = AUDIENCES.find((x) => x.value === a.audience)
              const isMine = me && a.author_id === me.id
              return (
                <div key={a.id} className={`bg-white rounded-xl border p-5 hover:shadow-sm transition ${a.pinned ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.pinned && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">📌 Тогтмол</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                        {aud && <span className="text-xs text-slate-500">{aud.icon} {aud.label}</span>}
                        <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString('mn-MN')}</span>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-lg">{a.title}</h3>
                      {a.content && <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{a.content}</div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {a.file_url && (
                          <a href={a.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                            📎 Файл
                          </a>
                        )}
                        {(a.extra_links || []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">
                            🔗 Линк {i + 1}
                          </a>
                        ))}
                      </div>
                      {a.employees && (
                        <div className="text-xs text-slate-500 mt-3">
                          — {a.employees.last_name}.{a.employees.first_name}{a.employees.positions && ` · ${a.employees.positions.name}`}
                        </div>
                      )}
                    </div>
                    {(isMine || me?.is_admin || me?.role === 'erhlegch') && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => togglePin(a)} className="text-amber-600 hover:text-amber-800 text-xs px-2 py-1">
                          {a.pinned ? '📌 Гаргах' : '📌 Тогтмол'}
                        </button>
                        <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">Засах</button>
                        <button onClick={() => remove(a)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{editing ? 'Зар засах' : 'Шинэ зар'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Агуулга</label>
                <textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ангилал</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">📎 Файл (зураг, бичлэг, PDF, Word)</label>
                <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">🔗 Нэмэлт линкүүд (мөр бүрд нэг)</label>
                <textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} placeholder="Facebook, Google Drive, YouTube..." className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">📌 Тогтмол дээр бэхлэх</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Болих</button>
                <button onClick={save} disabled={saving || !form.title.trim()} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {saving ? 'Хадгалж байна...' : '💾 Хадгалах'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
