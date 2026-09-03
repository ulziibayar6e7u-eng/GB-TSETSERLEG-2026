'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Group = { id: number; name: string; icon: string; color: string }
type Child = { id: string; last_name: string; first_name: string; group_id: number | null; groups?: Group }
type Area = { code: string; name: string; icon: string; color: string }
type Level = 'demjleg' | 'hogjij' | 'nasandaa' | 'ahisan'
type Observation = {
  id: string
  child_id: string
  observer_id: string | null
  date: string
  activity: string | null
  observation: string
  area_code: string | null
  level: Level | null
  created_at: string
  children?: Child
  employees?: { last_name: string; first_name: string }
  development_areas?: Area
}

const LEVELS: { value: Level; label: string; color: string }[] = [
  { value: 'demjleg',  label: 'Дэмжлэг шаардлагатай', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'hogjij',   label: 'Хөгжиж байгаа',        color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'nasandaa', label: 'Насандаа тохирсон',    color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'ahisan',   label: 'Ахисан түвшин',        color: 'bg-blue-100 text-blue-700 border-blue-300' },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function AjiglltPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()

  const [observations, setObservations] = useState<Observation[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Observation | null>(null)
  const [form, setForm] = useState({
    child_id: '',
    date: today(),
    activity: '',
    observation: '',
    area_code: '',
    level: '' as Level | '',
  })
  const [filterChild, setFilterChild] = useState('')
  const [filterArea, setFilterArea] = useState('')

  async function load() {
    setLoading(true)
    const [a, ar, c, music, ass] = await Promise.all([
      supabase
        .from('observations')
        .select('*, children(id, last_name, first_name, group_id, groups(id, name, icon, color)), employees(last_name, first_name), development_areas(code, name, icon, color)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('development_areas').select('*').order('sort_order'),
      supabase.from('children').select('*, groups(*)').eq('status', 'active').order('last_name'),
      supabase
        .from('music_assessments')
        .select('id, child_id, section, subsection, date, title, text, created_at, children(id, last_name, first_name, group_id, groups(id, name, icon, color)), employees:observer_id(last_name, first_name)')
        .order('date', { ascending: false })
        .limit(100),
      supabase
        .from('assessments')
        .select('id, child_id, section, subsection, date, title, text, created_at')
        .order('date', { ascending: false })
        .limit(100),
    ])
    const combined: Observation[] = []
    ;((a.data as unknown as Observation[]) || []).forEach((o) => combined.push(o))
    // music_assessments-ыг Observation формат руу хөрвүүлэх
    ;((music.data as unknown as { id: string; child_id: string; section: string; date: string; title: string | null; text: string | null; children?: Observation['children']; employees?: Observation['employees'] }[]) || []).forEach((m) => {
      combined.push({
        id: 'music-' + m.id,
        child_id: m.child_id,
        observer_id: null,
        date: m.date,
        activity: m.title ? `🎵 ${m.title}` : '🎵 Хөгжим',
        observation: m.text || '',
        area_code: 'music',
        level: null,
        created_at: (m as unknown as {created_at: string}).created_at,
        children: m.children,
        employees: m.employees || { last_name: 'Г', first_name: 'Өлзийбаяр' },
        development_areas: { code: 'music', name: 'Хөгжим', icon: '🎵', color: '#a855f7' },
      } as Observation)
    })
    ;((ass.data as unknown as { id: string; child_id: string; date: string; title: string | null; text: string | null; created_at: string }[]) || []).forEach((a) => {
      combined.push({
        id: 'ass-' + a.id,
        child_id: a.child_id,
        observer_id: null,
        date: a.date,
        activity: a.title ? `🎵 ${a.title}` : '🎵 Хөгжим',
        observation: a.text || '',
        area_code: 'music',
        level: null,
        created_at: a.created_at,
        employees: { last_name: 'Г', first_name: 'Өлзийбаяр' },
        development_areas: { code: 'music', name: 'Хөгжим', icon: '🎵', color: '#a855f7' },
      } as unknown as Observation)
    })
    combined.sort((x, y) => (y.date > x.date ? 1 : -1))
    setObservations(combined)
    setAreas((ar.data as Area[]) || [])
    setChildren((c.data as Child[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const availableChildren = useMemo(() => {
    if (!me) return []
    if (canSeeAllChildren(me.role, me.is_admin) || me.role === 'bagsh') {
      // Хөгжмийн багш болон бусад "бүх бүлэг"-ийн багш нар: бүх хүүхэд харна.
      // Насны бүлгийн багш: өөрийн бүлэг
      if (canSeeAllChildren(me.role, me.is_admin)) return children
      const myGroupIds = new Set(me.groups.map((g) => g.id))
      const isMusicOrHybrid = me.groups.some((g) => g.code === 'hogjim')
      if (isMusicOrHybrid) return children
      return children.filter((c) => c.group_id && myGroupIds.has(c.group_id))
    }
    return children
  }, [me, children])

  const filtered = observations.filter((o) => {
    if (filterChild && o.child_id !== filterChild) return false
    if (filterArea && o.area_code !== filterArea) return false
    return true
  })

  function openAdd(childId?: string) {
    setEditing(null)
    setForm({
      child_id: childId || '',
      date: today(),
      activity: '',
      observation: '',
      area_code: '',
      level: '',
    })
    setShowForm(true)
  }

  function openEdit(o: Observation) {
    setEditing(o)
    setForm({
      child_id: o.child_id,
      date: o.date,
      activity: o.activity || '',
      observation: o.observation,
      area_code: o.area_code || '',
      level: (o.level as Level) || '',
    })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!me) return
    const payload = {
      child_id: form.child_id,
      date: form.date,
      activity: form.activity || null,
      observation: form.observation.trim(),
      area_code: form.area_code || null,
      level: form.level || null,
      observer_id: me.id,
    }
    if (editing) {
      await supabase.from('observations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('observations').insert(payload)
    }
    setShowForm(false)
    load()
  }

  async function remove(o: Observation) {
    if (!confirm('Энэ ажиглалтыг устгах уу?')) return
    await supabase.from('observations').delete().eq('id', o.id)
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Өдөр тутмын ажиглалт</h1>
            <p className="text-sm text-slate-500 mt-1">Нийт {filtered.length} тэмдэглэл</p>
          </div>
          <button
            onClick={() => openAdd()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm"
          >
            + Ажиглалт нэмэх
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <select
            value={filterChild}
            onChange={(e) => setFilterChild(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Бүх хүүхэд</option>
            {availableChildren.map((c) => (
              <option key={c.id} value={c.id}>
                {c.last_name}.{c.first_name}
              </option>
            ))}
          </select>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Бүх чиглэл</option>
            {areas.map((a) => (
              <option key={a.code} value={a.code}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">🎯</div>
            <div>Хараахан ажиглалт бүртгээгүй</div>
            <button onClick={() => openAdd()} className="mt-4 text-blue-600 hover:text-blue-800 font-medium">
              Эхний ажиглалт нэмэх →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const level = LEVELS.find((l) => l.value === o.level)
              return (
                <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ background: o.children?.groups?.color || '#3b82f6' }}
                    >
                      {o.children?.first_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {o.children?.last_name}.{o.children?.first_name}
                        </span>
                        <span className="text-xs text-slate-500">{o.date}</span>
                        {o.development_areas && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${o.development_areas.color}20`, color: o.development_areas.color }}>
                            {o.development_areas.icon} {o.development_areas.name}
                          </span>
                        )}
                        {level && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${level.color}`}>
                            {level.label}
                          </span>
                        )}
                      </div>
                      {o.activity && (
                        <div className="text-xs text-slate-500 mt-1">Үйл ажиллагаа: {o.activity}</div>
                      )}
                      <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{o.observation}</div>
                      {o.employees && (
                        <div className="text-xs text-slate-400 mt-2">
                          — {o.employees.last_name}.{o.employees.first_name}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(o)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">
                        Засах
                      </button>
                      <button onClick={() => remove(o)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">
                        Устгах
                      </button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">
                {editing ? 'Ажиглалт засах' : 'Шинэ ажиглалт'}
              </h2>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Хүүхэд</label>
                <select
                  required
                  value={form.child_id}
                  onChange={(e) => setForm({ ...form, child_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Сонгох --</option>
                  {availableChildren.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.last_name}.{c.first_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Огноо</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Үйл ажиллагаа</label>
                  <input
                    value={form.activity}
                    onChange={(e) => setForm({ ...form, activity: e.target.value })}
                    placeholder="Хөгжим, урлаг..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ажиглалт</label>
                <textarea
                  required
                  rows={4}
                  value={form.observation}
                  onChange={(e) => setForm({ ...form, observation: e.target.value })}
                  placeholder="Хүүхдийн үйл ажиллагааны тухай тэмдэглэл..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Хөгжлийн чиглэл</label>
                <div className="grid grid-cols-2 gap-2">
                  {areas.map((a) => (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => setForm({ ...form, area_code: form.area_code === a.code ? '' : a.code })}
                      className={`px-3 py-2 rounded-lg text-sm border-2 transition text-left ${
                        form.area_code === a.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="mr-1">{a.icon}</span>
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Түвшин</label>
                <div className="space-y-2">
                  {LEVELS.map((l) => (
                    <label
                      key={l.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition ${
                        form.level === l.value ? `${l.color} border-current` : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="level"
                        checked={form.level === l.value}
                        onChange={() => setForm({ ...form, level: l.value })}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{l.label}</span>
                    </label>
                  ))}
                </div>
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
                  {editing ? 'Хадгалах' : 'Нэмэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
