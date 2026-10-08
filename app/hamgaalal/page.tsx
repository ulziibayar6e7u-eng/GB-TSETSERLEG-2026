'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'
import { compressImages, checkVideoSize } from '@/lib/image-compress'

const CATS = {
  camera:       { icon: '📹', label: 'Камер ашиглах журам',             color: 'from-blue-500 to-cyan-500' },
  hand_to_hand: { icon: '🤝', label: 'Гараас гарт журам',               color: 'from-emerald-500 to-teal-500' },
  policy:       { icon: '📜', label: 'Хүүхэд хамгааллын бодлого',       color: 'from-violet-500 to-purple-500' },
  ethics:       { icon: '⚖️', label: 'Хүүхэд хамгааллын ёс зүйн дүрэм', color: 'from-amber-500 to-orange-500' },
} as const
type Cat = keyof typeof CATS
type Tab = Cat | 'activities'

type Doc = {
  id: string; category: Cat; title: string; description: string|null
  file_url: string|null; media_urls: string[]
  employees?: { last_name: string; first_name: string }|null
  created_at: string
}
type Activity = {
  id: string; date: string; title: string; description: string|null
  file_url: string|null; media_urls: string[]
  employees?: { last_name: string; first_name: string }|null
  created_at: string
}

export default function HamgaalalPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [tab, setTab] = useState<Tab>('camera')
  const [docs, setDocs] = useState<Doc[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date: new Date().toISOString().slice(0,10), files: [] as File[] })
  const [saving, setSaving] = useState(false)

  // Зөвхөн Ö.Өлзийбаяр оруулдаг
  const canUpload = !!(me && (me.is_admin || me.first_name?.includes('Өлзийбаяр') || me.role === 'erhlegch'))

  async function load() {
    const [d, a] = await Promise.all([
      supabase.from('safety_docs').select('*, employees:author_id(last_name, first_name)').order('created_at', { ascending: false }),
      supabase.from('safety_activities').select('*, employees:author_id(last_name, first_name)').order('date', { ascending: false }).limit(200),
    ])
    setDocs((d.data as any) || [])
    setActivities((a.data as any) || [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!me) return
    if (!form.title.trim()) { alert('Гарчиг бөглөнө үү'); return }
    const sz = checkVideoSize(form.files, 20)
    if (!sz.ok) { alert(sz.message); return }
    setSaving(true)
    const compressed = await compressImages(form.files)
    const media_urls: string[] = []
    for (const f of compressed) {
      const path = `safety/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error } = await supabase.storage.from('org-plans').upload(path, f)
      if (error) { alert('Файл алдаа: '+error.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      if (pub?.publicUrl) media_urls.push(pub.publicUrl)
    }
    const file_url = media_urls[0] || null
    if (tab === 'activities') {
      await supabase.from('safety_activities').insert({ date: form.date, title: form.title.trim(), description: form.description || null, file_url, media_urls, author_id: me.id })
    } else {
      await supabase.from('safety_docs').insert({ category: tab, title: form.title.trim(), description: form.description || null, file_url, media_urls, author_id: me.id })
    }
    setSaving(false); setShowForm(false)
    setForm({ title: '', description: '', date: new Date().toISOString().slice(0,10), files: [] })
    load()
  }

  async function remove(id: string, table: 'safety_docs'|'safety_activities') {
    if (!confirm('Устгах уу?')) return
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const items = tab === 'activities' ? activities : docs.filter(d => d.category === tab)
  const TAB_META: Record<Tab, { icon: string; label: string; color: string }> = {
    ...CATS,
    activities: { icon: '📅', label: 'Цаг үетэй холбоотой хийгдсэн ажлууд', color: 'from-pink-500 to-rose-500' },
  }
  const current = TAB_META[tab]

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className={`rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br ${current.color}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🛡</div>
              <div>
                <h1 className="text-2xl font-bold">Хүүхэд хамгаалал</h1>
                <p className="text-sm opacity-90 mt-1">{current.icon} {current.label}</p>
              </div>
            </div>
            {canUpload && (
              <button onClick={() => setShowForm(true)} className="bg-white text-slate-800 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">+ {tab === 'activities' ? 'Шинэ ажил' : 'Шинэ баримт'}</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap overflow-x-auto">
          {(Object.keys(CATS) as Cat[]).map((c) => (
            <button key={c} onClick={() => setTab(c)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === c ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              {CATS[c].icon} {CATS[c].label}
            </button>
          ))}
          <button onClick={() => setTab('activities')} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'activities' ? 'bg-pink-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>📅 Цаг үетэй холбоотой ажлууд</button>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">{current.icon}</div>
            <div>Баримт байхгүй</div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((r: any) => {
              const mediaList: string[] = (r.media_urls && r.media_urls.length > 0) ? r.media_urls : (r.file_url ? [r.file_url] : [])
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white text-xl flex-shrink-0`}>{current.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{r.title}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {r.date && <span>📅 {r.date} · </span>}
                        ✍️ {r.employees ? `${r.employees.last_name}.${r.employees.first_name}` : 'Тодорхойгүй'}
                      </div>
                      {r.description && <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{r.description}</div>}
                      {mediaList.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 md:grid-cols-4 gap-2">
                          {mediaList.map((url, i) => {
                            const isImg = /\.(png|jpe?g|gif|webp)$/i.test(url)
                            const isVid = /\.(mp4|webm|mov)$/i.test(url)
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener" className="block rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 aspect-square bg-slate-50">
                                {isImg ? <img src={url} alt="" className="w-full h-full object-cover" />
                                 : isVid ? <video src={url} className="w-full h-full object-cover" />
                                 : <div className="flex items-center justify-center h-full text-slate-400 text-xs">📎 Файл</div>}
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {canUpload && (
                      <button onClick={() => remove(r.id, tab === 'activities' ? 'safety_activities' : 'safety_docs')} className="text-xs text-red-600 hover:text-red-800">Устгах</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!canUpload && (
          <div className="mt-6 text-center text-xs text-slate-500">
            Файл оруулах эрх зөвхөн Г.Өлзийбаяр / эрхлэгчид бий. Та зөвхөн харах эрхтэй.
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-lg font-semibold">{current.icon} {tab === 'activities' ? 'Шинэ ажил' : current.label}</h2>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              {tab === 'activities' && (
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Огноо</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-700 mb-1">Гарчиг *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Тайлбар, тэмдэглэл</label>
                <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">📎 Файл / Зураг / Бичлэг (олон сонгож болно)</label>
                <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setForm({ ...form, files: Array.from(e.target.files || []) })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                {form.files.length > 0 && <div className="text-xs text-emerald-600 mt-1">✓ {form.files.length} файл сонгосон</div>}
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-2 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg font-medium">💾 Хадгалах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
