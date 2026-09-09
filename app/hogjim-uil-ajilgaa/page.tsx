'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

const CATS = {
  new_song:       { icon: '🎵', label: 'Шинэ дуу',            color: 'from-pink-500 to-rose-500' },
  music_movement: { icon: '💃', label: 'Хөгжимт хөдөлгөөн',   color: 'from-fuchsia-500 to-purple-500' },
  listen_music:   { icon: '🎧', label: 'Сонсох хөгжим',       color: 'from-blue-500 to-cyan-500' },
  role_play:      { icon: '🎭', label: 'Дүрд тоглох',         color: 'from-amber-500 to-orange-500' },
  rhythm:         { icon: '🥁', label: 'Хэмнэл',              color: 'from-emerald-500 to-teal-500' },
} as const
type Cat = keyof typeof CATS

type Row = {
  id: string; date: string; group_id: number|null; category: Cat; title: string; note: string|null
  file_url: string|null; media_urls: string[]; extra_links: string[]; created_at: string
  groups?: { name: string; icon: string }|null
  employees?: { last_name: string; first_name: string }|null
}
type Group = { id: number; code: string; name: string; icon: string }

export default function HogjimActivityPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [groups, setGroups] = useState<Group[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filterGroup, setFilterGroup] = useState<number|'all'>('all')
  const [filterCat, setFilterCat] = useState<Cat|'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Row|null>(null)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), group_id: '', category: 'new_song' as Cat, title: '', note: '', file: null as File|null, extraLinks: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    let q = supabase.from('music_activity').select('*, groups(name, icon), employees:author_id(last_name, first_name)').order('date', { ascending: false }).limit(200)
    if (filterGroup !== 'all') q = q.eq('group_id', filterGroup)
    if (filterCat !== 'all') q = q.eq('category', filterCat)
    const { data } = await q
    setRows((data as any) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [filterGroup, filterCat])
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('groups').select('id, code, name, icon').neq('code', 'hogjim').order('id')
      setGroups((data as Group[]) || [])
    })()
  }, [supabase])

  function openAdd() {
    setEditing(null)
    setForm({ date: new Date().toISOString().slice(0,10), group_id: '', category: 'new_song', title: '', note: '', file: null, extraLinks: '' })
    setShowForm(true)
  }
  function openEdit(r: Row) {
    setEditing(r)
    setForm({ date: r.date, group_id: r.group_id?.toString() || '', category: r.category, title: r.title, note: r.note || '', file: null, extraLinks: (r.extra_links||[]).join('\n') })
    setShowForm(true)
  }

  async function save() {
    if (!me) return
    if (!form.group_id) { alert('Бүлэг сонгоно уу'); return }
    if (!form.title.trim()) { alert('Гарчиг бөглөнө үү'); return }
    setSaving(true)
    let file_url = editing?.file_url || null
    if (form.file) {
      const path = `music-activity/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: '+upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const payload = {
      date: form.date, group_id: Number(form.group_id), category: form.category,
      title: form.title.trim(), note: form.note || null,
      author_id: me.id, file_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    }
    const { error } = editing
      ? await supabase.from('music_activity').update(payload).eq('id', editing.id)
      : await supabase.from('music_activity').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: '+error.message); return }
    setShowForm(false); load()
  }

  async function remove(r: Row) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('music_activity').delete().eq('id', r.id)
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎵</div>
              <div>
                <h1 className="text-2xl font-bold">Хөгжмийн сургалт, үйл ажиллагаа</h1>
                <p className="text-sm opacity-90 mt-1">Бүлэг · Чиглэл · Тэмдэглэл, зураг, бичлэг</p>
              </div>
            </div>
            <button onClick={openAdd} className="bg-white text-pink-700 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">+ Шинэ бичлэг</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap items-center">
          <select value={filterGroup} onChange={(e)=>setFilterGroup(e.target.value==='all'?'all':Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="all">🏫 Бүх бүлэг</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
          </select>
          <select value={filterCat} onChange={(e)=>setFilterCat(e.target.value as any)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="all">🎵 Бүх чиглэл</option>
            {(Object.keys(CATS) as Cat[]).map(c => <option key={c} value={c}>{CATS[c].icon} {CATS[c].label}</option>)}
          </select>
        </div>

        {loading ? <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
         : rows.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500"><div className="text-5xl mb-3">🎵</div>Бичлэг байхгүй</div>
         : (
          <div className="space-y-3">
            {rows.map(r => {
              const cat = CATS[r.category]
              const mine = r.employees && me.id
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white text-xl flex-shrink-0`}>{cat.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{cat.label}</span>
                        {r.groups && <span className="text-xs text-slate-500">{r.groups.icon} {r.groups.name}</span>}
                        <span className="text-xs text-slate-500">📅 {r.date}</span>
                      </div>
                      <h3 className="font-semibold text-slate-800">{r.title}</h3>
                      {r.note && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{r.note}</div>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.file_url && <a href={r.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл</a>}
                        {(r.extra_links||[]).map((url, i) => <a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 {i+1}</a>)}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={()=>openEdit(r)} className="text-xs text-blue-600 hover:text-blue-800">Засах</button>
                      {mine && <button onClick={()=>remove(r)} className="text-xs text-red-600 hover:text-red-800">Устгах</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex-shrink-0"><h2 className="text-lg font-semibold">{editing?'Засах':'Шинэ бичлэг'}</h2></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Бүлэг *</label>
                <select value={form.group_id} onChange={(e)=>setForm({...form, group_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="">— Сонго —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Чиглэл *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATS) as Cat[]).map(c => (
                    <button key={c} onClick={()=>setForm({...form, category: c})} className={`p-2 rounded-lg border-2 text-sm ${form.category===c?'border-pink-500 bg-pink-50':'border-slate-200 hover:border-slate-300'}`}>
                      <div className="font-medium">{CATS[c].icon} {CATS[c].label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг *</label><input value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Жишээ: Намрын дуу" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тэмдэглэл</label><textarea rows={4} value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Файл (PDF/зураг/бичлэг)</label><input type="file" accept=".pdf,image/*,video/*,audio/*" onChange={(e)=>setForm({...form, file: e.target.files?.[0]||null})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд</label><textarea rows={2} value={form.extraLinks} onChange={(e)=>setForm({...form, extraLinks: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="YouTube, Google Drive гэх мэт" /></div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-2 flex-shrink-0">
              <button onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white rounded-lg font-medium">💾 Хадгалах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
