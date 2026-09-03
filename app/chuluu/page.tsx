'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Leave = {
  id: string
  employee_id: string
  leave_type: 'paid' | 'unpaid'
  reason: string | null
  start_date: string
  end_date: string
  days_count: number | null
  file_url: string | null
  extra_links: string[]
  status: 'submitted' | 'approved' | 'rejected' | 'cancelled'
  approver_note: string | null
  reviewed_at: string | null
  created_at: string
  employees?: { last_name: string; first_name: string; positions?: { name: string } } | null
  approver?: { last_name: string; first_name: string } | null
}

const STATUS = {
  submitted: { icon: '🕐', label: 'Хянагдаж',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved:  { icon: '✅', label: 'Батлагдсан', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  rejected:  { icon: '❌', label: 'Татгалзсан', color: 'bg-red-100 text-red-700 border-red-300' },
  cancelled: { icon: '🚫', label: 'Цуцалсан',   color: 'bg-slate-100 text-slate-700 border-slate-300' },
} as const

function daysBetween(a: string, b: string) {
  const d1 = new Date(a); const d2 = new Date(b)
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1
}

export default function ChuluuPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const canApprove = me && (me.is_admin || me.role === 'erhlegch')

  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type: 'paid' as 'paid' | 'unpaid', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], reason: '', file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  async function load() {
    setLoading(true)
    let q = supabase.from('leave_requests')
      .select('*, employees:employee_id(last_name, first_name, positions(name)), approver:approver_id(last_name, first_name)')
      .order('created_at', { ascending: false }).limit(200)
    if (me && !canApprove) q = q.eq('employee_id', me.id)
    const { data } = await q
    setLeaves((data as unknown as Leave[]) || [])
    setLoading(false)
  }
  useEffect(() => { if (me) load() }, [me?.id])

  async function submit() {
    if (!me) return
    if (form.leave_type === 'paid' && !form.reason.trim()) { alert('Цалинтай чөлөөнд шалтгаан заавал бичнэ'); return }
    setSaving(true)
    let file_url: string | null = null
    if (form.file) {
      const path = `leaves/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const { error } = await supabase.from('leave_requests').insert({
      employee_id: me.id,
      leave_type: form.leave_type,
      reason: form.reason || null,
      start_date: form.start_date,
      end_date: form.end_date,
      days_count: daysBetween(form.start_date, form.end_date),
      file_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      status: 'submitted',
    })
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false)
    setForm({ leave_type: 'paid', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], reason: '', file: null, extraLinks: '' })
    load()
  }

  async function review(l: Leave, status: 'approved' | 'rejected') {
    if (!me) return
    if (status === 'rejected' && !reviewNote.trim()) { alert('Татгалзах шалтгаанаа бичнэ үү'); return }
    await supabase.from('leave_requests').update({
      status, approver_id: me.id,
      approver_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', l.id)
    setReviewingId(null); setReviewNote(''); load()
  }
  async function cancel(l: Leave) {
    if (!confirm('Цуцлах уу?')) return
    await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', l.id)
    load()
  }

  const filtered = tab === 'all' ? leaves : leaves.filter((l) => l.status === tab)
  const counts = { all: leaves.length, submitted: leaves.filter((l) => l.status === 'submitted').length, approved: leaves.filter((l) => l.status === 'approved').length, rejected: leaves.filter((l) => l.status === 'rejected').length }

  // Тайлан нэгтгэл (эрхлэгч л харна)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const halfYearStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const approvedLeaves = leaves.filter((l) => l.status === 'approved')
  const summary = {
    monthDays: approvedLeaves.filter((l) => new Date(l.start_date) >= monthStart).reduce((s, l) => s + (l.days_count || 0), 0),
    halfDays: approvedLeaves.filter((l) => new Date(l.start_date) >= halfYearStart).reduce((s, l) => s + (l.days_count || 0), 0),
    yearDays: approvedLeaves.filter((l) => new Date(l.start_date) >= yearStart).reduce((s, l) => s + (l.days_count || 0), 0),
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📅</div>
              <div>
                <h1 className="text-2xl font-bold">Чөлөө авах хүсэлт</h1>
                <p className="text-sm opacity-90">Эрхлэгчээс зөвшөөрөл авах, гүйцэтгэлд тусгагдана</p>
              </div>
            </div>
            <button onClick={() => setShowForm(true)} className="bg-white text-purple-700 hover:bg-white/90 px-4 py-2.5 rounded-lg font-semibold text-sm">
              + Хүсэлт илгээх
            </button>
          </div>
          {canApprove && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{summary.monthDays}</div>
                <div className="text-xs opacity-90">Энэ сар (нийт хоног)</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{summary.halfDays}</div>
                <div className="text-xs opacity-90">Хагас жил</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{summary.yearDays}</div>
                <div className="text-xs opacity-90">Жил</div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap">
          {(['submitted','approved','rejected','all'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-purple-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              {k === 'all' ? 'Бүгд' : STATUS[k].label} ({counts[k]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📅</div>
            <div>Хүсэлт байхгүй</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((l) => {
              const st = STATUS[l.status]
              return (
                <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📅</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${st.color}`}>{st.icon} {st.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.leave_type === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {l.leave_type === 'paid' ? '💰 Цалинтай' : '⚪ Цалингүй'}
                        </span>
                        <span className="text-xs text-slate-500">📅 {l.start_date} — {l.end_date}</span>
                        {l.days_count != null && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{l.days_count} хоног</span>}
                      </div>
                      {l.employees && (
                        <div className="font-semibold text-slate-800">
                          {l.employees.last_name}.{l.employees.first_name}
                          {l.employees.positions && <span className="text-xs text-slate-500 ml-2 font-normal">· {l.employees.positions.name}</span>}
                        </div>
                      )}
                      {l.reason && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap"><b>Шалтгаан:</b> {l.reason}</div>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {l.file_url && <a href={l.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Файл</a>}
                        {(l.extra_links || []).map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>))}
                      </div>
                      {l.approver_note && (
                        <div className={`mt-3 p-3 rounded-lg text-sm border-l-4 ${l.status === 'approved' ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'}`}>
                          <div className="text-xs font-semibold mb-1">
                            {l.approver ? `${l.approver.last_name}.${l.approver.first_name}` : 'Эрхлэгч'}-ийн тэмдэглэл
                          </div>
                          {l.approver_note}
                        </div>
                      )}
                      {reviewingId === l.id && (
                        <div className="mt-3 space-y-2 bg-blue-50 rounded-lg p-3">
                          <textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Тэмдэглэл..." className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm" />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setReviewingId(null)} className="px-3 py-1.5 text-sm text-slate-600">Болих</button>
                            <button onClick={() => review(l, 'rejected')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">❌ Татгалзах</button>
                            <button onClick={() => review(l, 'approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">✅ Батлах</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {canApprove && l.status === 'submitted' && reviewingId !== l.id && <button onClick={() => { setReviewingId(l.id); setReviewNote('') }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">🔍 Хянах</button>}
                      {l.employee_id === me?.id && l.status === 'submitted' && <button onClick={() => cancel(l)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Цуцлах</button>}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">Чөлөө авах хүсэлт</h2></div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Чөлөөний төрөл</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({ ...form, leave_type: 'paid' })} className={`px-4 py-3 rounded-lg font-medium text-sm border-2 ${form.leave_type === 'paid' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                    💰 Цалинтай
                  </button>
                  <button onClick={() => setForm({ ...form, leave_type: 'unpaid' })} className={`px-4 py-3 rounded-lg font-medium text-sm border-2 ${form.leave_type === 'unpaid' ? 'border-slate-500 bg-slate-50 text-slate-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                    ⚪ Цалингүй
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Эхлэх</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Дуусах</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div className="text-xs text-slate-500 -mt-1">Хугацаа: <b>{daysBetween(form.start_date, form.end_date)} хоног</b></div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Шалтгаан{form.leave_type === 'paid' && <span className="text-red-500"> *</span>}</label>
                <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              {form.leave_type === 'paid' && (
                <>
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">📎 Файл (эмнэлэгийн бичиг, гэрчилгээ гэх мэт)</label>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">🔗 Линк</label>
                    <textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} placeholder="Мөр бүрд нэг URL" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : '📤 Илгээх'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
