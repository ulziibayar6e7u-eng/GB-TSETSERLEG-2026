'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Material = {
  id: string
  author_id: string
  group_id: number | null
  category: 'weekly' | 'material' | 'program' | 'event' | 'other'
  title: string
  description: string | null
  file_url: string | null
  extra_links: string[]
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  reviewer_note: string | null
  approved_at: string | null
  reviewed_at: string | null
  created_at: string
  employees?: { last_name: string; first_name: string } | null
  reviewer?: { last_name: string; first_name: string } | null
  groups?: { name: string; icon: string; color: string } | null
}

const CATS = {
  weekly:   { icon: '🎁', label: '7 хоног ээлжит сургалтын төлөвлөгөө', color: 'from-emerald-500 to-teal-500' },
  material: { icon: '📎', label: 'Сургалтын хэрэглэгдэхүүн, баяжилт',    color: 'from-blue-500 to-cyan-500' },
  program:  { icon: '📘', label: 'Нэмэлт хөтөлбөр',                       color: 'from-violet-500 to-purple-500' },
  event:    { icon: '🎉', label: 'Арга хэмжээний төлөвлөгөө',              color: 'from-pink-500 to-rose-500' },
  other:    { icon: '📝', label: 'Бусад',                                   color: 'from-slate-500 to-slate-600' },
} as const
type Cat = keyof typeof CATS

const STATUS = {
  draft:     { icon: '📄', label: 'Ноорог',       color: 'bg-slate-100 text-slate-700' },
  submitted: { icon: '📬', label: 'Хянагдаж буй', color: 'bg-amber-100 text-amber-700' },
  approved:  { icon: '✅', label: 'Батлагдсан',   color: 'bg-emerald-100 text-emerald-700' },
  returned:  { icon: '↩️', label: 'Буцаагдсан',   color: 'bg-red-100 text-red-700' },
} as const

export default function HereglegPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()

  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('prefill') === '1' && me) {
      const cat = (p.get('category') || 'material') as Cat
      setEditing(null)
      setForm({
        category: (['weekly','material','program','event','other'].includes(cat) ? cat : 'material') as Cat,
        title: p.get('title') || '',
        description: p.get('description') || '',
        groupId: me.groups[0]?.id?.toString() || '',
        file: null,
        extraLinks: p.get('link') || '',
      })
      setShowForm(true)
      window.history.replaceState({}, '', '/heregleg')
    }
  }, [me])
  const [editing, setEditing] = useState<Material | null>(null)
  const [form, setForm] = useState({ category: 'material' as Cat, title: '', description: '', groupId: '', file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)

  const isReviewer = me && (me.is_admin || me.role === 'arga_zuich' || me.role === 'erhlegch')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('teacher_materials').select('*, employees:author_id(last_name, first_name), reviewer:reviewer_id(last_name, first_name), groups(name, icon, color)').order('updated_at', { ascending: false }).limit(200)
    setItems((data as unknown as Material[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ category: 'material', title: '', description: '', groupId: me?.groups[0]?.id?.toString() || '', file: null, extraLinks: '' })
    setShowForm(true)
  }
  function openEdit(m: Material) {
    setEditing(m)
    setForm({ category: m.category, title: m.title, description: m.description || '', groupId: m.group_id?.toString() || '', file: null, extraLinks: (m.extra_links || []).join('\n') })
    setShowForm(true)
  }
  async function save(submit: boolean) {
    if (!me) return
    if (!form.title.trim()) { alert('Гарчиг бөглөнө үү'); return }
    setSaving(true)
    let file_url = editing?.file_url || null
    if (form.file) {
      const path = `heregleg/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const payload = {
      author_id: me.id,
      group_id: form.groupId ? parseInt(form.groupId) : null,
      category: form.category,
      title: form.title.trim(),
      description: form.description || null,
      file_url,
      extra_links: form.extraLinks.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      status: submit ? 'submitted' : (editing?.status || 'draft'),
    }
    const { error } = editing
      ? await supabase.from('teacher_materials').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('teacher_materials').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false); load()
  }
  async function submitForApproval(m: Material) {
    if (!confirm('Арга зүйч рүү батлуулахаар илгээх үү?')) return
    await supabase.from('teacher_materials').update({ status: 'submitted', updated_at: new Date().toISOString() }).eq('id', m.id)
    load()
  }
  async function remove(m: Material) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('teacher_materials').delete().eq('id', m.id)
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const mine = items.filter((i) => i.author_id === me.id)
  const shown = tab === 'mine' ? mine : items
  const counts = { mine: mine.length, all: items.length }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📚</div>
              <div>
                <h1 className="text-2xl font-bold">Хэрэглэгдэхүүн, нэмэлт хөтөлбөр</h1>
                <p className="text-sm opacity-90 mt-1">Сургалтын хэрэглэгдэхүүн баяжилт · Нэмэлт хөтөлбөр · Арга хэмжээ</p>
              </div>
            </div>
            <button onClick={openAdd} className="bg-white text-blue-700 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">+ Шинэ материал</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setTab('mine')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'mine' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>👤 Миний ({counts.mine})</button>
          {isReviewer && <button onClick={() => setTab('all')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>📚 Бүх багш ({counts.all})</button>}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📚</div>
            <div>Материал байхгүй</div>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((m) => {
              const cat = CATS[m.category]
              const st = STATUS[m.status]
              const mine = m.author_id === me.id
              return (
                <div key={m.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white text-xl flex-shrink-0`}>{cat.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.icon} {st.label}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{cat.label}</span>
                          {m.groups && <span className="text-xs text-slate-500">{m.groups.icon} {m.groups.name}</span>}
                        </div>
                        <h3 className="font-semibold text-slate-800">{m.title}</h3>
                        {m.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{m.description}</div>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.file_url && <a href={m.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл</a>}
                          {(m.extra_links || []).map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>))}
                        </div>
                        {m.employees && <div className="text-xs text-slate-500 mt-2">✍️ {m.employees.last_name}.{m.employees.first_name}</div>}
                        {m.status === 'approved' && m.reviewer_note && (
                          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                            <div className="font-semibold mb-0.5">✅ Батлагдсан тэмдэглэл:</div>
                            {m.reviewer_note}
                          </div>
                        )}
                        {m.status === 'returned' && m.reviewer_note && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                            <div className="font-semibold mb-0.5">↩️ Буцаасан шалтгаан:</div>
                            {m.reviewer_note}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      {mine && (m.status === 'draft' || m.status === 'returned') && (
                        <button onClick={() => submitForApproval(m)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">📤 Батлуулахаар илгээх</button>
                      )}
                      {mine && <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-800 text-xs px-3 py-1.5">Засах</button>}
                      {mine && <button onClick={() => remove(m)} className="text-red-600 hover:text-red-800 text-xs px-3 py-1.5">Устгах</button>}
                      {isReviewer && m.status === 'submitted' && (
                        <a href="/batlamj" className="ml-auto text-orange-600 hover:text-orange-800 text-xs font-medium">Батламжийн ширээнд хянах →</a>
                      )}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">{editing ? 'Засах' : 'Шинэ материал/хөтөлбөр'}</h2></div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Ангилал</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATS) as Cat[]).map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, category: c })} className={`p-2 rounded-lg border-2 text-sm text-left ${form.category === c ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="font-medium">{CATS[c].icon} {CATS[c].label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              {me.groups.length > 0 && (
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Бүлэг</label>
                  <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    <option value="">— Ерөнхий —</option>
                    {me.groups.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                  </select>
                </div>
              )}
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Файл (PDF/DOCX/Зураг)</label><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*,video/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд (нэг мөрөнд нэг)</label><textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={() => save(false)} disabled={saving} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-800 rounded-lg font-medium">💾 Ноорог</button>
                <button onClick={() => save(true)} disabled={saving} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg font-medium">📤 Илгээх</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
