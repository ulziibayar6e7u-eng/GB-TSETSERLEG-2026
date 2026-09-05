'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'
import { detectRole, ROLE_META } from '@/lib/staffRoles'

type ChecklistItem = { label: string; ok: boolean }
type Log = {
  id: string
  author_id: string | null
  date: string
  shift: string | null
  title: string | null
  description: string | null
  category: string | null
  checklist: ChecklistItem[]
  file_url: string | null
  extra_links: string[]
  reviewer_id: string | null
  reviewer_note: string | null
  created_at: string
  employees?: { last_name: string; first_name: string; positions?: { name: string } } | null
}

const CATS_BY_ROLE: Record<string, { key: string; icon: string; label: string; checklist?: string[] }[]> = {
  haruul: [
    { key: 'entry_log',  icon: '🚪', label: 'Гарц-орцны бүртгэл' },
    { key: 'safety',     icon: '🛡', label: 'Аюулгүй байдал шалгах', checklist: ['Гадаа хаалга', 'Цонх', 'Гэрэлтүүлэг', 'Галын хамгаалалт', 'Ус, дулаан', 'Бусад'] },
    { key: 'incident',   icon: '⚠️', label: 'Онцгой тохиолдол' },
    { key: 'shift_end',  icon: '📋', label: 'Ээлж хүлээлцэх' },
    { key: 'general',    icon: '📝', label: 'Ерөнхий тэмдэглэл' },
  ],
  uilchleg: [
    { key: 'clean_report', icon: '🧹', label: 'Цэвэрлэгээний тайлан' },
    { key: 'service',      icon: '🔧', label: 'Засвар үйлчилгээ' },
    { key: 'incident',     icon: '⚠️', label: 'Онцгой тохиолдол' },
    { key: 'general',      icon: '📝', label: 'Ерөнхий тэмдэглэл' },
  ],
  other: [
    { key: 'general',      icon: '📝', label: 'Ерөнхий тайлан' },
    { key: 'service',      icon: '🔧', label: 'Засвар үйлчилгээ' },
    { key: 'transport',    icon: '🚗', label: 'Тээвэрлэлт' },
    { key: 'purchase',     icon: '🛒', label: 'Худалдан авалт' },
    { key: 'incident',     icon: '⚠️', label: 'Онцгой тохиолдол' },
  ],
}

const SHIFTS = [
  { key: 'morning', label: '🌅 Өглөө' },
  { key: 'day',     label: '☀️ Өдөр' },
  { key: 'evening', label: '🌆 Орой' },
  { key: 'night',   label: '🌙 Шөнө' },
]

export default function DailyLogPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const role = detectRole(me?.positions?.name)
  const meta = ROLE_META[role]
  const canSeeAll = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')

  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], shift: '', title: '', description: '', category: '', checklist: [] as ChecklistItem[], file: null as File | null, extraLinks: '' })
  const cats = CATS_BY_ROLE[role] || CATS_BY_ROLE.other
  const [saving, setSaving] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  async function load() {
    setLoading(true)
    let q = supabase.from('staff_daily_logs').select('*, employees:author_id(last_name, first_name, positions(name))').order('date', { ascending: false }).limit(200)
    if (me && !canSeeAll) q = q.eq('author_id', me.id)
    const { data } = await q
    setLogs((data as unknown as Log[]) || [])
    setLoading(false)
  }
  useEffect(() => { if (me) load() }, [me?.id])

  async function save() {
    if (!me) return
    setSaving(true)
    let file_url: string | null = null
    if (form.file) {
      const path = `logs/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const { error } = await supabase.from('staff_daily_logs').insert({
      author_id: me.id,
      date: form.date,
      shift: form.shift || null,
      title: form.title || null,
      description: form.description || null,
      category: form.category || null,
      checklist: form.checklist,
      file_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
    })
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], shift: '', title: '', description: '', category: '', checklist: [], file: null, extraLinks: '' })
    load()
  }
  async function remove(l: Log) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('staff_daily_logs').delete().eq('id', l.id)
    load()
  }
  async function submitReview(l: Log) {
    if (!me) return
    await supabase.from('staff_daily_logs').update({ reviewer_id: me.id, reviewer_note: reviewNote }).eq('id', l.id)
    setReviewingId(null); setReviewNote(''); load()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className={`rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br ${meta.color}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{meta.icon}</div>
              <div>
                <h1 className="text-2xl font-bold">{me?.positions?.name || meta.label}</h1>
                <p className="text-sm opacity-90">Өдрийн ажлын тайлан, тэмдэглэл</p>
                {me && <p className="text-xs opacity-80 mt-1">{me.last_name}.{me.first_name}</p>}
              </div>
            </div>
            <button onClick={() => setShowForm(true)} className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2.5 rounded-lg font-medium text-sm">
              + Шинэ тайлан
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📓</div>
            <div>Тайлан хараахан бүртгээгүй</div>
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 hover:text-blue-800 font-medium">Эхний тайлан нэмэх →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-slate-500">🗓 {l.date}</span>
                      {l.shift && <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{SHIFTS.find(s=>s.key===l.shift)?.label || l.shift}</span>}
                      {l.category && (() => {
                        const c = cats.find((x) => x.key === l.category)
                        return c ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c.icon} {c.label}</span> : null
                      })()}
                      {canSeeAll && l.employees && <span className="text-xs text-slate-500">— {l.employees.last_name}.{l.employees.first_name}{l.employees.positions && ` · ${l.employees.positions.name}`}</span>}
                    </div>
                    {l.title && <h3 className="font-semibold text-slate-800">{l.title}</h3>}
                    {l.description && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{l.description}</div>}
                    {l.checklist && l.checklist.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.checklist.map((it, i) => (
                          <span key={i} className={`text-xs px-2 py-1 rounded-full ${it.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {it.ok ? '✅' : '❌'} {it.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {l.file_url && <a href={l.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл</a>}
                      {(l.extra_links || []).map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>))}
                    </div>
                    {l.reviewer_note && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border-l-4 border-amber-400 text-sm">
                        <div className="text-xs font-semibold text-amber-700 mb-1">Хянагчийн зөвлөгөө</div>
                        {l.reviewer_note}
                      </div>
                    )}
                    {reviewingId === l.id && (
                      <div className="mt-3 space-y-2 bg-blue-50 rounded-lg p-3">
                        <textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Зөвлөгөө..." className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setReviewingId(null)} className="px-3 py-1.5 text-sm text-slate-600">Болих</button>
                          <button onClick={() => submitReview(l)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">💾 Хадгалах</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {canSeeAll && reviewingId !== l.id && <button onClick={() => { setReviewingId(l.id); setReviewNote(l.reviewer_note || '') }} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">💬 Зөвлөх</button>}
                    {(l.author_id === me?.id || me?.is_admin) && <button onClick={() => remove(l)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>}
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
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">Шинэ тайлан</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Ээлж</label>
                  <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    <option value="">—</option>
                    {SHIFTS.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-2">Тайлангийн төрөл</label>
                <div className="flex flex-wrap gap-2">
                  {cats.map((c) => {
                    const active = form.category === c.key
                    return (
                      <button key={c.key} type="button" onClick={() => setForm({ ...form, category: c.key, title: active ? form.title : c.label, checklist: c.checklist ? c.checklist.map((l) => ({ label: l, ok: false })) : [] })}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                        {c.icon} {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {form.checklist.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">✅ Шалгах жагсаалт</div>
                  <div className="space-y-1.5">
                    {form.checklist.map((it, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={it.ok} onChange={(e) => {
                          const copy = [...form.checklist]; copy[idx] = { ...it, ok: e.target.checked }; setForm({ ...form, checklist: copy })
                        }} className="w-4 h-4" />
                        <span className={it.ok ? 'text-emerald-700 line-through' : 'text-slate-700'}>{it.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div><label className="block text-sm text-slate-700 mb-1">Гарчиг</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Файл</label><input type="file" accept="image/*,video/*,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">🔗 Линкүүд</label><textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} placeholder="Мөр бүрд нэг URL" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
