'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/useMe'

type Employee = {
  id: string
  last_name: string
  first_name: string
  role: string
  positions?: { name: string }
}

type Club = {
  id: number
  name: string
  icon: string
  color: string
  teacher_id: string | null
  description: string | null
  status?: 'draft' | 'submitted' | 'approved' | 'returned' | null
  approver_note?: string | null
  employees?: Employee
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft:     { label: '📝 Ноорог',     color: 'bg-slate-100 text-slate-700 border-slate-300' },
  submitted: { label: '🕐 Хянагдаж',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved:  { label: '✅ Батлагдсан', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  returned:  { label: '↩️ Буцаагдсан', color: 'bg-red-100 text-red-700 border-red-300' },
}

const ICONS = ['🎨', '🎵', '⚽', '📚', '🎭', '💃', '🧩', '🌱', '🔬', '🎯', '🎪', '🏊', '🥋', '♟️', '🎬']
const COLORS = ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#8b5cf6']

export default function DugilanPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [counts, setCounts] = useState<Map<number, number>>(new Map())
  const [teachers, setTeachers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Club | null>(null)
  const [form, setForm] = useState({
    name: '',
    icon: '🎨',
    color: '#7c3aed',
    teacher_id: '',
    description: '',
  })

  const [activityCounts, setActivityCounts] = useState<Map<number, number>>(new Map())
  const [clubGroups, setClubGroups] = useState<Map<number, Set<number>>>(new Map())
  const [groups, setGroups] = useState<{ id: number; name: string; icon: string; color: string; code: string }[]>([])
  const [filterGroupId, setFilterGroupId] = useState<number | 'all'>('all')
  const [filterTeacherId, setFilterTeacherId] = useState<string | 'all'>('all')
  const { me } = useMe()
  const canSeeAll = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')
  const [recentActs, setRecentActs] = useState<{ id: string; club_id: number; date: string; title: string | null; description: string | null; file_url: string | null; employees?: { last_name: string; first_name: string } | null; clubs?: { name: string; icon: string; color: string } | null }[]>([])

  async function load() {
    setLoading(true)
    let clubsQuery = supabase.from('clubs').select('*, employees:teacher_id(id, last_name, first_name, role, positions(name))').order('created_at')
    // Багш нар зөвхөн өөрийнхөө дугуйланг харна
    if (me && !me.is_admin && me.role !== 'erhlegch' && me.role !== 'arga_zuich') {
      clubsQuery = clubsQuery.eq('teacher_id', me.id)
    }
    const [c, cc, e, act, g, ccg] = await Promise.all([
      clubsQuery,
      supabase.from('child_clubs').select('club_id').eq('status', 'active'),
      supabase
        .from('employees')
        .select('id, last_name, first_name, role, positions(name)')
        .in('role', ['bagsh', 'bagsh_tuslah', 'arga_zuich'])
        .order('first_name'),
      supabase.from('club_activities').select('club_id'),
      supabase.from('groups').select('id, code, name, icon, color').not('code', 'in', '(hogjim,huvilbart)').order('id'),
      supabase.from('child_clubs').select('club_id, children(group_id)').eq('status', 'active'),
    ])
    setClubs((c.data as Club[]) || [])
    setTeachers((e.data as unknown as Employee[]) || [])
    const m = new Map<number, number>()
    ;(cc.data || []).forEach((r: { club_id: number }) => {
      m.set(r.club_id, (m.get(r.club_id) || 0) + 1)
    })
    setCounts(m)
    const am = new Map<number, number>()
    ;((act.data as { club_id: number }[]) || []).forEach((r) => {
      am.set(r.club_id, (am.get(r.club_id) || 0) + 1)
    })
    setActivityCounts(am)
    setGroups((g.data as { id: number; code: string; name: string; icon: string; color: string }[]) || [])
    const cgMap = new Map<number, Set<number>>()
    ;((ccg.data as unknown as { club_id: number; children?: { group_id: number | null } }[]) || []).forEach((r) => {
      if (r.children?.group_id) {
        if (!cgMap.has(r.club_id)) cgMap.set(r.club_id, new Set())
        cgMap.get(r.club_id)!.add(r.children.group_id)
      }
    })
    setClubGroups(cgMap)
    // Сүүлийн үйл ажиллагаа (арга зүйч, эрхлэгчид)
    if (canSeeAll) {
      const { data } = await supabase
        .from('club_activities')
        .select('id, club_id, date, title, description, file_url, employees:author_id(last_name, first_name), clubs(name, icon, color)')
        .order('date', { ascending: false })
        .limit(30)
      setRecentActs((data as unknown as typeof recentActs) || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!me) return
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [me?.id])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', icon: '🎨', color: '#7c3aed', teacher_id: '', description: '' })
    setShowForm(true)
  }

  function openEdit(c: Club) {
    setEditing(c)
    setForm({
      name: c.name,
      icon: c.icon,
      color: c.color,
      teacher_id: c.teacher_id || '',
      description: c.description || '',
    })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      teacher_id: form.teacher_id || null,
      description: form.description || null,
    }
    const { error } = editing
      ? await supabase.from('clubs').update(payload).eq('id', editing.id)
      : await supabase.from('clubs').insert(payload)
    if (error) {
      alert('Алдаа: ' + error.message)
      return
    }
    setShowForm(false)
    load()
  }

  async function remove(c: Club) {
    if (!confirm(`"${c.name}" дугуйланг устгах уу?\n(Хүүхдийн бүртгэл ч устана)`)) return
    await supabase.from('clubs').delete().eq('id', c.id)
    load()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Дугуйлангууд</h1>
            <p className="text-sm text-slate-500 mt-1">
              Нийт <span className="font-semibold text-blue-600">{clubs.length}</span> дугуйлан
            </p>
          </div>
          <button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition"
          >
            + Дугуйлан нэмэх
          </button>
        </div>

        {canSeeAll && (
          <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex flex-wrap gap-2 items-center">
            <div className="text-xs font-semibold text-slate-500 mr-2">🔍 ШҮҮЛТ:</div>
            <select value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="all">🏫 Бүх бүлэг</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
            </select>
            <select value={filterTeacherId} onChange={(e) => setFilterTeacherId(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="all">👥 Бүх багш</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.last_name}.{t.first_name}</option>)}
            </select>
            {(filterGroupId !== 'all' || filterTeacherId !== 'all') && (
              <button onClick={() => { setFilterGroupId('all'); setFilterTeacherId('all') }} className="text-xs text-slate-500 hover:text-slate-700">✕ Арилгах</button>
            )}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : clubs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">🎨</div>
            <div>Хараахан дугуйлан үүсгээгүй байна</div>
            <button
              onClick={openAdd}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Эхний дугуйланг үүсгэх →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clubs.filter((c) => {
              if (filterGroupId !== 'all' && !(clubGroups.get(c.id)?.has(filterGroupId as number))) return false
              if (filterTeacherId !== 'all' && c.teacher_id !== filterTeacherId) return false
              return true
            }).map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition"
              >
                <div
                  className="p-5 text-white relative"
                  style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}dd)` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-3xl mb-2">{c.icon}</div>
                      <h3 className="text-lg font-bold">{c.name}</h3>
                      {c.description && (
                        <div className="text-xs opacity-80 mt-1">{c.description}</div>
                      )}
                      {c.status && STATUS_META[c.status] && (
                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_META[c.status].color}`}>
                          {STATUS_META[c.status].label}
                        </span>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <div>
                        <div className="text-2xl font-bold">{counts.get(c.id) || 0}</div>
                        <div className="text-xs opacity-80">хүүхэд</div>
                      </div>
                      <div className="text-xs bg-white/20 rounded px-2 py-0.5">
                        📸 {activityCounts.get(c.id) || 0} үйл ажиллагаа
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Хариуцсан багш
                    </div>
                    {c.employees ? (
                      <div className="text-sm bg-slate-50 rounded-lg px-3 py-1.5 text-slate-700">
                        {c.employees.last_name}.{c.employees.first_name}
                        {c.employees.positions && (
                          <span className="text-xs text-slate-500 ml-2">
                            · {c.employees.positions.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 italic">Хуваарилаагүй</div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => openEdit(c)}
                      className="flex-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg"
                    >
                      Засах
                    </button>
                    <Link
                      href={`/dugilan/${c.id}`}
                      className="flex-1 text-center text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 rounded-lg"
                    >
                      Хүүхдүүд
                    </Link>
                    <button
                      onClick={() => remove(c)}
                      className="text-sm bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-3 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {canSeeAll && recentActs.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">📸 Сүүлийн үйл ажиллагаа (бүх дугуйлан)</h2>
              <span className="text-xs text-slate-500">{recentActs.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {recentActs.map((a) => (
                <Link key={a.id} href={`/dugilan/${a.club_id}`} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0" style={{ background: a.clubs?.color || '#7c3aed' }}>
                    {a.clubs?.icon || '🎨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.clubs && <span className="text-xs text-slate-600 font-medium">{a.clubs.name}</span>}
                      <span className="text-xs text-slate-400">🗓 {a.date}</span>
                      {a.employees && <span className="text-xs text-slate-400">— {a.employees.last_name}.{a.employees.first_name}</span>}
                    </div>
                    {a.title && <div className="font-medium text-slate-800 text-sm">{a.title}</div>}
                    {a.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.description}</div>}
                    {a.file_url && <div className="text-xs text-blue-600 mt-1">📎 Файлтай</div>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">
                {editing ? 'Дугуйлан засах' : 'Шинэ дугуйлан'}
              </h2>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Нэр</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Урлагийн дугуйлан"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Дүрс</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm({ ...form, icon: ic })}
                      className={`w-10 h-10 rounded-lg text-xl border-2 transition ${
                        form.icon === ic ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Өнгө</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setForm({ ...form, color: col })}
                      className={`w-10 h-10 rounded-lg border-2 transition ${
                        form.color === col ? 'border-slate-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ background: col }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Хариуцсан багш</label>
                <select
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Сонгох --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.last_name}.{t.first_name} — {t.positions?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тайлбар</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Юуг зорьж, ямар үйл ажиллагаа явуулах вэ?"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  {editing ? 'Хадгалах' : 'Үүсгэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
