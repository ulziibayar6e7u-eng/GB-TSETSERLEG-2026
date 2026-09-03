'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Work = {
  id: string
  author_id: string | null
  date: string
  title: string
  description: string | null
  impact: string | null
  photo_url: string | null
  extra_links: string[]
  reviewer_id: string | null
  reviewer_note: string | null
  rating: number | null
  reviewed_at: string | null
  employees?: { last_name: string; first_name: string; positions?: { name: string } } | null
  reviewer?: { last_name: string; first_name: string } | null
}

export default function SanaachlagaPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const canReview = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')

  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Work | null>(null)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', description: '', impact: '', file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewForm, setReviewForm] = useState({ note: '', rating: 80 })

  async function load() {
    setLoading(true)
    let q = supabase.from('initiative_works')
      .select('*, employees:author_id(last_name, first_name, positions(name)), reviewer:reviewer_id(last_name, first_name)')
      .order('date', { ascending: false }).limit(200)
    // Ажилтан зөвхөн өөрийнхөө
    if (me && !canReview) q = q.eq('author_id', me.id)
    const { data } = await q
    setWorks((data as unknown as Work[]) || [])
    setLoading(false)
  }
  useEffect(() => { if (me) load() }, [me?.id])

  function openAdd() {
    setEditing(null)
    setForm({ date: new Date().toISOString().split('T')[0], title: '', description: '', impact: '', file: null, extraLinks: '' })
    setShowForm(true)
  }
  function openEdit(w: Work) {
    setEditing(w)
    setForm({
      date: w.date, title: w.title,
      description: w.description || '', impact: w.impact || '',
      file: null,
      extraLinks: (w.extra_links || []).join('\n'),
    })
    setShowForm(true)
  }
  async function save() {
    if (!me) return
    setSaving(true)
    let photo_url = editing?.photo_url || null
    if (form.file) {
      const path = `initiatives/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      photo_url = pub?.publicUrl || null
    }
    const payload = {
      author_id: me.id, date: form.date,
      title: form.title.trim(),
      description: form.description || null,
      impact: form.impact || null,
      photo_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
    }
    const { error } = editing
      ? await supabase.from('initiative_works').update({...payload, updated_at: new Date().toISOString()}).eq('id', editing.id)
      : await supabase.from('initiative_works').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false); load()
  }
  async function remove(w: Work) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('initiative_works').delete().eq('id', w.id)
    load()
  }
  async function submitReview(w: Work) {
    if (!me) return
    await supabase.from('initiative_works').update({
      reviewer_id: me.id,
      reviewer_note: reviewForm.note || null,
      rating: reviewForm.rating,
      reviewed_at: new Date().toISOString(),
    }).eq('id', w.id)
    setReviewingId(null); load()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">💡</div>
              <div>
                <h1 className="text-2xl font-bold">Санаачилсан ажил</h1>
                <p className="text-sm opacity-90">Ажлын хэсэгт нэмэлт хийсэн, санаачилсан ажлууд</p>
              </div>
            </div>
            <button onClick={openAdd} className="bg-white text-amber-700 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">
              + Шинэ санаачилга
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : works.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">💡</div>
            <div>Хараахан санаачилсан ажил бүртгээгүй</div>
            <button onClick={openAdd} className="mt-3 text-amber-600 hover:text-amber-800 font-medium">Эхний ажил нэмэх →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {works.map((w) => (
              <div key={w.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-slate-500">🗓 {w.date}</span>
                      {w.employees && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">👤 {w.employees.last_name}.{w.employees.first_name}{w.employees.positions && ' · ' + w.employees.positions.name}</span>}
                      {w.rating != null && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">⭐ {w.rating}%</span>}
                    </div>
                    <h3 className="font-semibold text-slate-800 text-lg">{w.title}</h3>
                    {w.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{w.description}</div>}
                    {w.impact && <div className="text-sm text-emerald-800 bg-emerald-50 border-l-4 border-emerald-400 p-2 rounded mt-2"><b>Үр дүн:</b> {w.impact}</div>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {w.photo_url && <a href={w.photo_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл/зураг</a>}
                      {(w.extra_links || []).map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>))}
                    </div>
                    {w.reviewer_note && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border-l-4 border-amber-400 text-sm">
                        <div className="text-xs font-semibold text-amber-700 mb-1">
                          {w.reviewer ? `${w.reviewer.last_name}.${w.reviewer.first_name}` : 'Хянагч'}-ийн зөвлөгөө
                        </div>
                        {w.reviewer_note}
                      </div>
                    )}
                    {reviewingId === w.id && (
                      <div className="mt-3 space-y-2 bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-700">Үнэлгээ:</label>
                          <input type="range" min="0" max="100" step="10" value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })} className="flex-1" />
                          <span className="font-bold text-blue-700 w-12 text-right">{reviewForm.rating}%</span>
                        </div>
                        <textarea rows={3} value={reviewForm.note} onChange={(e) => setReviewForm({ ...reviewForm, note: e.target.value })} placeholder="Зөвлөгөө..." className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setReviewingId(null)} className="px-3 py-1.5 text-sm text-slate-600">Болих</button>
                          <button onClick={() => submitReview(w)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">💾 Хадгалах</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {canReview && reviewingId !== w.id && <button onClick={() => { setReviewingId(w.id); setReviewForm({ note: w.reviewer_note || '', rating: w.rating ?? 80 }) }} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">💬 Үнэлэх</button>}
                    {(w.author_id === me?.id || me?.is_admin) && <button onClick={() => openEdit(w)} className="text-slate-600 hover:text-slate-800 text-xs px-2 py-1">Засах</button>}
                    {(w.author_id === me?.id || me?.is_admin) && <button onClick={() => remove(w)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">{editing ? 'Засах' : 'Шинэ санаачилга'}</h2></div>
            <div className="p-5 space-y-3">
              <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Юу хийсэн бэ?" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Үр дүн, нөлөө</label><textarea rows={2} value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} placeholder="Юуг сайжруулсан, ямар үр дүн гарсан" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Файл/зураг</label><input type="file" accept="image/*,video/*,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд</label><textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} placeholder="Мөр бүрд нэг" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={save} disabled={saving || !form.title.trim()} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
