'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Kind = 'activity' | 'support' | 'reading' | 'walk'

const TABS: { key: Kind; icon: string; label: string; desc: string; color: string }[] = [
  { key: 'activity', icon: '📋', label: 'Үйл ажиллагаа',                 desc: 'Удирдамж · Гарын авлага · Зөвлөмж',                color: 'from-blue-500 to-indigo-500' },
  { key: 'support',  icon: '👀', label: 'Сургалтын хяналт, дэмжлэг',      desc: 'Багшийн үйл ажиллагаанд суусан зөвлөмж',           color: 'from-emerald-500 to-teal-500' },
  { key: 'reading',  icon: '📖', label: 'Чанга уншлага',                  desc: 'Өдөр тутмын чанга уншлагын үйл ажиллагаа',         color: 'from-amber-500 to-orange-500' },
  { key: 'walk',     icon: '🚶', label: 'Зугаалгын цаг',                  desc: 'Өдөр тутмын зугаалгын үйл ажиллагаа',              color: 'from-pink-500 to-rose-500' },
]

const SUBJECTS: Record<string,string> = {
  hel_yaria: '💬 Хэл яриа', bno: '🌿 Байгаль нийгэм орчин', matematik: '🔢 Математик',
  urlag: '🎨 Урлаг', hodolgoon: '🏃 Хөдөлгөөн', niigem: '👥 Нийгэм', aa_uhaan: '🛡 Аюулгүй ухаан',
  hogjim: '🎵 Хөгжим',
}

const BEG_LINKS = [
  { title: 'Хичээл №1: Чанга уншлагын арга зүйн үндэс', url: 'https://www.facebook.com/watch/?v=1580154890033808' },
  { title: 'Хичээл №2: Чанга уншлагын арга зүйн үндэс 2', url: 'https://www.facebook.com/watch/?v=1535233497512842' },
  { title: 'Хичээл №3: (нэр авах)', url: 'https://www.facebook.com/beg.gov.mn' },
  { title: 'Хичээл №4: Чанга уншлагын арга зүйг хэрхэн үр дүнтэй хэрэгжүүлэх вэ', url: 'https://www.facebook.com/watch/?v=1054577899966954' },
  { title: 'Хичээл №5: Давтан унших арга', url: 'https://www.facebook.com/reel/3936086459870559' },
  { title: 'Хичээл №6: (нэр авах)', url: 'https://www.facebook.com/beg.gov.mn' },
]

type Row = {
  id: string; kind: Kind; date: string; title: string; note: string|null
  author_id: string|null; target_teacher_id: string|null; subject_code: string|null
  group_id: number|null; file_url: string|null; media_urls: string[]; extra_links: string[]
  is_pinned: boolean; created_at: string
  employees?: { last_name: string; first_name: string }|null
  target?: { last_name: string; first_name: string }|null
  groups?: { name: string; icon: string; color: string }|null
}

export default function ZaahArgynNegdelPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [tab, setTab] = useState<Kind>('activity')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<{ id: string; last_name: string; first_name: string }[]>([])
  const [groups, setGroups] = useState<{ id: number; name: string; icon: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Row|null>(null)
  const [form, setForm] = useState({
    title: '', note: '', date: new Date().toISOString().slice(0,10),
    target_teacher_id: '', subject_code: '', group_id: '',
    file: null as File|null, mediaFiles: [] as File[], extraLinks: ''
  })
  const [saving, setSaving] = useState(false)

  const isReviewer = me && (me.is_admin || me.role === 'arga_zuich' || me.role === 'erhlegch')
  const canPost = (k: Kind) => {
    if (!me) return false
    if (k === 'activity') return isReviewer
    if (k === 'support')  return isReviewer
    if (k === 'reading' || k === 'walk') return me.role === 'bagsh' || isReviewer
    return false
  }

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('teach_method')
      .select('*, author:author_id(last_name, first_name, role, is_admin), employees:author_id(last_name, first_name), target:target_teacher_id(last_name, first_name), groups(name, icon, color)')
      .eq('kind', tab).order('is_pinned', { ascending: false }).order('date', { ascending: false }).limit(100)
    let list = (data as any[]) || []
    if (tab === 'support' && me && me.role === 'arga_zuich' && !me.is_admin) {
      list = list.filter((r: any) => !(r.author?.is_admin || r.author?.role === 'erhlegch') || r.author_id === me.id)
    }
    setRows(list as unknown as Row[])
    setLoading(false)
  }
  useEffect(() => { load() }, [tab])

  useEffect(() => {
    (async () => {
      const { data: t, error: te } = await supabase.from('employees').select('id, last_name, first_name, role').in('role', ['bagsh']).order('first_name')
      if (te) console.error('teachers load error', te)
      setTeachers((t as any) || [])
      const { data: g } = await supabase.from('groups').select('id, name, icon').order('id')
      setGroups((g as any) || [])
    })()
  }, [supabase])

  function openAdd() {
    setEditing(null)
    setForm({ title: '', note: '', date: new Date().toISOString().slice(0,10), target_teacher_id: '', subject_code: '',
      group_id: me?.groups[0]?.id?.toString() || '', file: null, mediaFiles: [], extraLinks: '' })
    setShowForm(true)
  }
  function openEdit(r: Row) {
    setEditing(r)
    setForm({ title: r.title, note: r.note||'', date: r.date, target_teacher_id: r.target_teacher_id||'',
      subject_code: r.subject_code||'', group_id: r.group_id?.toString()||'',
      file: null, mediaFiles: [], extraLinks: (r.extra_links||[]).join('\n') })
    setShowForm(true)
  }

  async function uploadOne(f: File) {
    const path = `zaah-argyn-negdel/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const { error } = await supabase.storage.from('org-plans').upload(path, f)
    if (error) throw error
    const { data } = supabase.storage.from('org-plans').getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    if (!me) return
    if (!form.title.trim()) { alert('Гарчиг оруулна уу'); return }
    setSaving(true)
    try {
      let file_url = editing?.file_url || null
      if (form.file) file_url = await uploadOne(form.file)
      const media_urls: string[] = [...(editing?.media_urls||[])]
      for (const mf of form.mediaFiles) media_urls.push(await uploadOne(mf))
      const payload: any = {
        kind: tab, date: form.date, title: form.title.trim(), note: form.note || null,
        author_id: me.id,
        target_teacher_id: tab==='support' ? (form.target_teacher_id||null) : null,
        subject_code: tab==='support' ? (form.subject_code||null) : null,
        group_id: (tab==='reading'||tab==='walk') ? (form.group_id?parseInt(form.group_id):null) : null,
        file_url, media_urls,
        extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      }
      const { error } = editing
        ? await supabase.from('teach_method').update(payload).eq('id', editing.id)
        : await supabase.from('teach_method').insert(payload)
      if (error) throw error
      setShowForm(false); load()
    } catch (e: any) { alert('Алдаа: '+e.message) }
    setSaving(false)
  }

  async function remove(r: Row) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('teach_method').delete().eq('id', r.id)
    load()
  }

  async function togglePin(r: Row) {
    await supabase.from('teach_method').update({ is_pinned: !r.is_pinned }).eq('id', r.id)
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const current = TABS.find(t => t.key === tab)!

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className={`rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br ${current.color}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{current.icon}</div>
              <div>
                <h1 className="text-2xl font-bold">Заах аргын нэгдлийн ажил</h1>
                <p className="text-sm opacity-90 mt-1">{current.label} · {current.desc}</p>
              </div>
            </div>
            {canPost(tab) && (
              <button onClick={openAdd} className="bg-white text-slate-800 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">+ Шинэ бичлэг</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`p-3 rounded-lg text-left transition ${tab===t.key ? `bg-gradient-to-br ${t.color} text-white` : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="font-semibold text-sm">{t.label}</div>
              <div className={`text-xs mt-0.5 ${tab===t.key ? 'opacity-90' : 'text-slate-500'}`}>{t.desc}</div>
            </button>
          ))}
        </div>

        {tab === 'reading' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="font-semibold text-amber-900 mb-2">📺 БЕГ-ын цуврал хичээлүүд</div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {BEG_LINKS.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener" className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 hover:bg-amber-100">🎬 {l.title}</a>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">{current.icon}</div>
            <div>Бичлэг байхгүй байна</div>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(r => {
              const mine = r.author_id === me.id
              return (
                <div key={r.id} className={`bg-white rounded-xl border ${r.is_pinned ? 'border-amber-300' : 'border-slate-200'} overflow-hidden`}>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white text-xl flex-shrink-0`}>{current.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {r.is_pinned && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">📌 Тогтмол</span>}
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{r.date}</span>
                          {r.groups && <span className="text-xs text-slate-500">{r.groups.icon} {r.groups.name}</span>}
                          {r.target && <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">👤 {r.target.last_name}.{r.target.first_name}</span>}
                          {r.subject_code && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{SUBJECTS[r.subject_code] || r.subject_code}</span>}
                        </div>
                        <h3 className="font-semibold text-slate-800">{r.title}</h3>
                        {r.note && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{r.note}</div>}
                        {r.media_urls && r.media_urls.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {r.media_urls.map((u, i) => {
                              const isVideo = /\.(mp4|webm|mov)$/i.test(u)
                              return isVideo
                                ? <video key={i} controls src={u} className="rounded-lg w-full h-32 object-cover bg-slate-100" />
                                : <a key={i} href={u} target="_blank" rel="noopener"><img src={u} alt="" className="rounded-lg w-full h-32 object-cover" /></a>
                            })}
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.file_url && <a href={r.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл</a>}
                          {(r.extra_links||[]).map((u, i) => <a key={i} href={u} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i+1}</a>)}
                        </div>
                        {r.employees && <div className="text-xs text-slate-500 mt-2">✍️ {r.employees.last_name}.{r.employees.first_name}</div>}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      {isReviewer && <button onClick={() => togglePin(r)} className="text-amber-600 hover:text-amber-800 text-xs px-3 py-1.5">{r.is_pinned ? '📌 Тогтмолоос салгах' : '📌 Тогтмол болгох'}</button>}
                      {(mine || isReviewer) && <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 text-xs px-3 py-1.5">Засах</button>}
                      {(mine || isReviewer) && <button onClick={() => remove(r)} className="text-red-600 hover:text-red-800 text-xs px-3 py-1.5">Устгах</button>}
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
            <div className="p-5 border-b border-slate-200 flex-shrink-0"><h2 className="text-lg font-semibold text-slate-800">{editing ? 'Засах' : `Шинэ бичлэг · ${current.label}`}</h2></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                {tab==='support' && (
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Багш</label>
                    <select value={form.target_teacher_id} onChange={(e)=>setForm({...form, target_teacher_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                      <option value="">— Сонгох —</option>
                      {teachers.map(t=><option key={t.id} value={t.id}>{t.last_name}.{t.first_name}</option>)}
                    </select>
                  </div>
                )}
                {tab==='support' && (
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-700 mb-1">Судлагдахуун</label>
                    <select value={form.subject_code} onChange={(e)=>setForm({...form, subject_code: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                      <option value="">— Сонгох —</option>
                      {Object.entries(SUBJECTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                )}
                {(tab==='reading' || tab==='walk') && (
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Бүлэг</label>
                    <select value={form.group_id} onChange={(e)=>setForm({...form, group_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                      <option value="">— Сонгох —</option>
                      {groups.map(g=><option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг *</label><input value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Ж: 9-р сарын 5, Чанга уншлагын үйл ажиллагаа" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тэмдэглэл / Зөвлөмж</label><textarea rows={5} value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📷 Зураг / 🎥 Бичлэг (олон сонгож болно)</label><input type="file" multiple accept="image/*,video/*" onChange={(e)=>setForm({...form, mediaFiles: Array.from(e.target.files||[])})} className="w-full border border-slate-300 rounded-lg px-3 py-2" />{form.mediaFiles.length>0 && <div className="text-xs text-slate-500 mt-1">{form.mediaFiles.length} файл сонгосон</div>}</div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Файл (PDF/DOCX)</label><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e)=>setForm({...form, file: e.target.files?.[0]||null})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд (нэг мөрөнд нэг)</label><textarea rows={2} value={form.extraLinks} onChange={(e)=>setForm({...form, extraLinks: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-2 flex-shrink-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
              <button onClick={save} disabled={saving} className={`flex-1 px-4 py-2 bg-gradient-to-br ${current.color} disabled:opacity-50 text-white rounded-lg font-medium`}>💾 Хадгалах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
