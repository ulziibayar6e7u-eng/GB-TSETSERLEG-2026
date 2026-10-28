'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Plan = {
  id: string; employee_id: string; school_year: number; category: string
  title: string; target_count: number|null; target_date: string|null
  period_type: string; period_month: number|null; auto_rule: string|null
  manual_done: boolean; note: string|null
  employees?: { last_name: string; first_name: string }|null
}

const CATEGORIES: Record<string, { icon: string; label: string }> = {
  observation: { icon: '🎯', label: 'Ажиглалт' },
  activity:    { icon: '📸', label: 'Сургалт үйл ажиллагаа' },
  music:       { icon: '🎵', label: 'Хөгжмийн үйл ажиллагаа' },
  club:        { icon: '🎨', label: 'Дугуйлан' },
  material:    { icon: '📎', label: 'Хэрэглэгдэхүүн, хөтөлбөр' },
  training:    { icon: '📚', label: 'Сургалт, мэргэжил дээшлүүлэх' },
  other:       { icon: '📝', label: 'Бусад ажил' },
}

const RULES = [
  { code: 'observations',      label: '🎯 Ажиглалт (observations)' },
  { code: 'music_activity',    label: '🎵 Хөгжмийн үйл ажиллагаа' },
  { code: 'plans',             label: '📅 Хичээлийн төлөвлөгөө (plans)' },
  { code: 'club_activities',   label: '🎨 Дугуйлангийн үйл ажиллагаа' },
  { code: 'teacher_materials', label: '📎 Хөтөлбөр, хэрэглэгдэхүүн' },
]

export default function PerformancePlanPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const now = new Date()
  const [schoolYear, setSchoolYear] = useState(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1)
  const [teachers, setTeachers] = useState<any[]>([])
  const [targetEmpId, setTargetEmpId] = useState<string>('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [actual, setActual] = useState<Record<string, number>>({})
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Plan|null>(null)
  const [form, setForm] = useState({ category: 'observation', title: '', target_count: 10, target_date: '', auto_rule: 'observations' as string|null, note: '' })
  const [saving, setSaving] = useState(false)

  const isLeader = !!(me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich'))

  useEffect(() => {
    if (!me) return
    (async () => {
      if (isLeader) {
        const { data } = await supabase.from('employees').select('id, last_name, first_name, role, positions(name)').in('role', ['bagsh', 'bagsh_tuslah']).order('first_name')
        setTeachers((data as any) || [])
      }
      if (!targetEmpId) setTargetEmpId(me.id)
    })()
  }, [me, isLeader])

  async function load() {
    if (!targetEmpId) return
    const { data } = await supabase.from('performance_plan').select('*, employees:employee_id(last_name, first_name)').eq('employee_id', targetEmpId).eq('school_year', schoolYear).order('category').order('target_date', { nullsFirst: false })
    setPlans((data as any) || [])
    // Автомат биелэлт тоолох
    const start = `${schoolYear}-09-01`
    const end = `${schoolYear + 1}-06-30`
    const [obs, mus, pl, cl, tm] = await Promise.all([
      supabase.from('observations').select('id, date', { count: 'exact' }).eq('observer_id', targetEmpId).gte('date', start).lte('date', end),
      supabase.from('music_activity').select('id, date', { count: 'exact' }).eq('author_id', targetEmpId).gte('date', start).lte('date', end),
      supabase.from('plans').select('id, period', { count: 'exact' }).eq('author_id', targetEmpId).gte('period', start).lte('period', end),
      supabase.from('club_activities').select('id, date', { count: 'exact' }).eq('author_id', targetEmpId).gte('date', start).lte('date', end),
      supabase.from('teacher_materials').select('id, created_at', { count: 'exact' }).eq('author_id', targetEmpId).gte('created_at', `${start}T00:00:00`).lte('created_at', `${end}T23:59:59`),
    ])
    setActual({
      observations: obs.count || 0,
      music_activity: mus.count || 0,
      plans: pl.count || 0,
      club_activities: cl.count || 0,
      teacher_materials: tm.count || 0,
    })
  }
  useEffect(() => { if (targetEmpId) load() }, [targetEmpId, schoolYear])

  function openAdd() {
    setEditing(null)
    setForm({ category: 'observation', title: '', target_count: 10, target_date: '', auto_rule: 'observations', note: '' })
    setShowForm(true)
  }
  function openEdit(p: Plan) {
    setEditing(p)
    setForm({ category: p.category, title: p.title, target_count: p.target_count || 0, target_date: p.target_date || '', auto_rule: p.auto_rule, note: p.note || '' })
    setShowForm(true)
  }
  async function save() {
    if (!form.title.trim()) { alert('Гарчиг бөглөнө үү'); return }
    setSaving(true)
    const payload = {
      employee_id: targetEmpId, school_year: schoolYear,
      category: form.category, title: form.title.trim(),
      target_count: form.target_count || null,
      target_date: form.target_date || null,
      auto_rule: form.auto_rule || null,
      note: form.note || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = editing
      ? await supabase.from('performance_plan').update(payload).eq('id', editing.id)
      : await supabase.from('performance_plan').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: '+error.message); return }
    setShowForm(false); load()
  }
  async function remove(p: Plan) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('performance_plan').delete().eq('id', p.id)
    load()
  }
  async function toggleManual(p: Plan) {
    await supabase.from('performance_plan').update({ manual_done: !p.manual_done }).eq('id', p.id)
    load()
  }

  // Биелэлт тооцоолох
  function getProgress(p: Plan): { done: number; pct: number; status: 'done'|'in_progress'|'overdue'|'not_started' } {
    const done = p.auto_rule ? (actual[p.auto_rule] || 0) : (p.manual_done ? (p.target_count || 1) : 0)
    const target = p.target_count || 1
    const pct = Math.min(100, Math.round((done / target) * 100))
    let status: 'done'|'in_progress'|'overdue'|'not_started' = 'not_started'
    if (done >= target) status = 'done'
    else if (p.target_date && new Date(p.target_date) < new Date() && done < target) status = 'overdue'
    else if (done > 0) status = 'in_progress'
    return { done, pct, status }
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const grouped: Record<string, Plan[]> = {}
  plans.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p) })

  const total = plans.length
  const totals = { done: 0, in_progress: 0, overdue: 0, not_started: 0 }
  plans.forEach(p => { totals[getProgress(p).status]++ })
  const overallPct = total > 0 ? Math.round((totals.done / total) * 100) : 0

  const canEdit = isLeader || targetEmpId === me.id

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold">Гүйцэтгэлийн төлөвлөгөө</h1>
                <p className="text-sm opacity-90 mt-1">Автомат биелэлт шалгалт · Хугацаа хэтэрсэн ажил</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={schoolYear} onChange={(e) => setSchoolYear(Number(e.target.value))} className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm">
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}-{y + 1} хичээлийн жил</option>
                ))}
              </select>
              {isLeader && (
                <select value={targetEmpId} onChange={(e) => setTargetEmpId(e.target.value)} className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm">
                  <option value={me.id} className="text-slate-800">— Миний —</option>
                  {teachers.map((t: any) => <option key={t.id} value={t.id} className="text-slate-800">{t.last_name}.{t.first_name}</option>)}
                </select>
              )}
              {canEdit && <button onClick={openAdd} className="bg-white text-indigo-700 hover:bg-white/90 px-3 py-1.5 rounded-lg text-sm font-semibold">+ Шинэ зорилт</button>}
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-slate-800">{overallPct}%</div><div className="text-xs text-slate-500 mt-1">📊 Нийт биелэлт</div></div>
            <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-emerald-600">{totals.done}</div><div className="text-xs text-slate-500 mt-1">✅ Биелсэн</div></div>
            <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-amber-600">{totals.in_progress}</div><div className="text-xs text-slate-500 mt-1">🔄 Хийгдэж буй</div></div>
            <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-red-600">{totals.overdue}</div><div className="text-xs text-slate-500 mt-1">⚠️ Хугацаа хэтэрсэн</div></div>
            <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-slate-400">{totals.not_started}</div><div className="text-xs text-slate-500 mt-1">⏳ Эхлээгүй</div></div>
          </div>
        )}

        {total === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📊</div>
            <div className="mb-3">Хичээлийн жилийн эхэнд ажлаа төлөвлөгөөлөөрэй</div>
            {canEdit && <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Эхний зорилт нэмэх</button>}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(grouped).map(cat => {
              const meta = CATEGORIES[cat] || CATEGORIES.other
              return (
                <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 font-semibold text-slate-800">{meta.icon} {meta.label} ({grouped[cat].length})</div>
                  <div className="divide-y divide-slate-100">
                    {grouped[cat].map(p => {
                      const pg = getProgress(p)
                      const statusBadge = {
                        done:        { color: 'bg-emerald-100 text-emerald-700', icon: '✅', text: 'Биелсэн' },
                        in_progress: { color: 'bg-amber-100 text-amber-700',     icon: '🔄', text: 'Хийгдэж буй' },
                        overdue:     { color: 'bg-red-100 text-red-700',         icon: '⚠️', text: 'Хугацаа хэтэрсэн' },
                        not_started: { color: 'bg-slate-100 text-slate-600',     icon: '⏳', text: 'Эхлээгүй' },
                      }[pg.status]
                      return (
                        <div key={p.id} className="p-4">
                          <div className="flex items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.color}`}>{statusBadge.icon} {statusBadge.text}</span>
                                {p.target_date && <span className="text-xs text-slate-500">📅 {p.target_date}</span>}
                                {p.auto_rule && <span className="text-xs text-slate-500">🤖 автомат</span>}
                              </div>
                              <div className="text-sm font-medium text-slate-800">{p.title}</div>
                              {p.note && <div className="text-xs text-slate-600 mt-1">{p.note}</div>}
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div style={{width: `${pg.pct}%`}} className={`h-full ${pg.status === 'done' ? 'bg-emerald-500' : pg.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                </div>
                                <div className="text-sm font-semibold text-slate-700 min-w-[80px] text-right">
                                  {pg.done} / {p.target_count || '-'} ({pg.pct}%)
                                </div>
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex gap-1">
                                {!p.auto_rule && (
                                  <button onClick={() => toggleManual(p)} className={`text-xs px-2 py-1 rounded ${p.manual_done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{p.manual_done ? '✓' : '○'}</button>
                                )}
                                <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">Засах</button>
                                <button onClick={() => remove(p)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex-shrink-0"><h2 className="text-lg font-semibold">{editing ? 'Зорилт засах' : 'Шинэ зорилт'}</h2></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Ангилал</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Зорилт / Ажлын нэр *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Жишээ: Жилд 100 ажиглалт хийх" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Тоо</label>
                  <input type="number" min="1" value={form.target_count} onChange={(e) => setForm({ ...form, target_count: Number(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Эцсийн огноо</label>
                  <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">🤖 Автомат тоолох эх үүсвэр</label>
                <select value={form.auto_rule || ''} onChange={(e) => setForm({ ...form, auto_rule: e.target.value || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="">— Гараар тэмдэглэх —</option>
                  {RULES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
                <div className="text-xs text-slate-500 mt-1">Автомат сонговол систем бодит ажлыг тооллоно. Гараар сонговол "Хийсэн" гэж өөрөө тэмдэглэнэ.</div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Тэмдэглэл</label>
                <textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-2 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-medium">💾 Хадгалах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
