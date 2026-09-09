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

const LEVELS = {
  achieved:    { icon: '⭐', label: 'Эзэмшсэн',       color: 'bg-emerald-500 text-white',  chip: 'bg-emerald-100 text-emerald-700' },
  in_progress: { icon: '🌱', label: 'Эзэмшиж буй',    color: 'bg-amber-500 text-white',    chip: 'bg-amber-100 text-amber-700' },
  not_yet:     { icon: '💤', label: 'Эзэмшээгүй',     color: 'bg-slate-400 text-white',    chip: 'bg-slate-100 text-slate-600' },
} as const
type Level = keyof typeof LEVELS

type Group = { id: number; code: string; name: string; icon: string; color: string }
type Child = { id: string; last_name: string; first_name: string; group_id: number; birthdate: string|null; gender: string|null; status: string }
type Assess = { id: string; child_id: string; date: string; category: Cat; level: Level; note: string|null }

function ageYears(bd: string|null) {
  if (!bd) return null
  const d = new Date(bd); const t = new Date()
  let y = t.getFullYear() - d.getFullYear()
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) y--
  return y
}

export default function HogjimHuuhedPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [groups, setGroups] = useState<Group[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [assess, setAssess] = useState<Assess[]>([])
  const [openGroup, setOpenGroup] = useState<number|'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [child, setChild] = useState<Child|null>(null)
  const [form, setForm] = useState({ category: 'new_song' as Cat, level: 'in_progress' as Level, note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: g } = await supabase.from('groups').select('id, code, name, icon, color').order('id')
      setGroups(((g as Group[])||[]).filter(x => x.code !== 'hogjim'))
      const { data: c } = await supabase.from('children').select('id, last_name, first_name, group_id, birthdate, gender, status').eq('status', 'active').order('first_name')
      setChildren((c as Child[]) || [])
      const { data: a } = await supabase.from('music_assessment').select('*').order('date', { ascending: false })
      setAssess((a as Assess[]) || [])
    })()
  }, [supabase])

  async function reloadAssess() {
    const { data: a } = await supabase.from('music_assessment').select('*').order('date', { ascending: false })
    setAssess((a as Assess[]) || [])
  }

  function openAssess(c: Child) {
    setChild(c); setForm({ category: 'new_song', level: 'in_progress', note: '' }); setShowForm(true)
  }
  async function save() {
    if (!child || !me) return
    setSaving(true)
    const { error } = await supabase.from('music_assessment').insert({
      child_id: child.id, date: new Date().toISOString().slice(0,10),
      category: form.category, level: form.level, note: form.note || null, author_id: me.id,
    })
    setSaving(false)
    if (error) { alert(error.message); return }
    setShowForm(false); reloadAssess()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const shownGroups = openGroup === 'all' ? groups : groups.filter(g => g.id === openGroup)
  const childCounts: Record<string, Record<Cat, Level|undefined>> = {}
  assess.forEach(a => {
    if (!childCounts[a.child_id]) childCounts[a.child_id] = { new_song: undefined, music_movement: undefined, listen_music: undefined, role_play: undefined, rhythm: undefined }
    if (!childCounts[a.child_id][a.category]) childCounts[a.child_id][a.category] = a.level
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🎵</div>
            <div>
              <h1 className="text-2xl font-bold">Хөгжмийн багшийн хүүхдүүд</h1>
              <p className="text-sm opacity-90 mt-1">Бүлгээр ангилсан · 5 чиглэлийн үнэлгээ</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap">
          <button onClick={()=>setOpenGroup('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${openGroup==='all'?'bg-pink-600 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>🏫 Бүгд ({children.length})</button>
          {groups.map(g => {
            const n = children.filter(c => c.group_id === g.id).length
            return <button key={g.id} onClick={()=>setOpenGroup(g.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${openGroup===g.id?'bg-pink-600 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>{g.icon} {g.name} ({n})</button>
          })}
        </div>

        <div className="space-y-4">
          {shownGroups.map(g => {
            const kids = children.filter(c => c.group_id === g.id)
            if (kids.length === 0) return null
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className={`p-4 text-white bg-gradient-to-r ${g.color || 'from-pink-500 to-rose-500'}`}>
                  <div className="text-lg font-bold">{g.icon} {g.name} <span className="text-sm opacity-90">({kids.length} хүүхэд)</span></div>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {kids.map(c => {
                    const levels = childCounts[c.id] || {}
                    const achievedCount = Object.values(levels).filter(v => v === 'achieved').length
                    const inProgressCount = Object.values(levels).filter(v => v === 'in_progress').length
                    return (
                      <div key={c.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition cursor-pointer" onClick={()=>openAssess(c)}>
                        <div className="text-sm font-semibold text-slate-800">{c.last_name?.[0]}.{c.first_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{c.gender === 'male' ? '👦' : c.gender === 'female' ? '👧' : '🧒'} {ageYears(c.birthdate) ?? '—'} нас</div>
                        <div className="mt-2 grid grid-cols-5 gap-0.5">
                          {(Object.keys(CATS) as Cat[]).map(cat => {
                            const l = levels[cat]
                            return (
                              <div key={cat} className={`aspect-square rounded flex items-center justify-center text-xs ${l ? LEVELS[l].color : 'bg-slate-200 text-slate-400'}`} title={`${CATS[cat].label}: ${l ? LEVELS[l].label : 'Үнэлгээгүй'}`}>
                                {CATS[cat].icon}
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-2 text-xs text-slate-600 flex gap-2">
                          <span>⭐ {achievedCount}</span>
                          <span>🌱 {inProgressCount}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {shownGroups.every(g => children.filter(c => c.group_id === g.id).length === 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">👶</div>Хүүхэд байхгүй
            </div>
          )}
        </div>
      </div>

      {showForm && child && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-lg font-semibold">🎵 {child.last_name}.{child.first_name} — Үнэлгээ өгөх</h2>
              <p className="text-xs text-slate-500 mt-0.5">{ageYears(child.birthdate) ?? '—'} нас</p>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Чиглэл</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATS) as Cat[]).map(c => (
                    <button key={c} onClick={()=>setForm({...form, category: c})} className={`p-2 rounded-lg border-2 text-sm ${form.category===c?'border-pink-500 bg-pink-50':'border-slate-200 hover:border-slate-300'}`}>
                      <div className="font-medium">{CATS[c].icon} {CATS[c].label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Түвшин</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(LEVELS) as Level[]).map(l => (
                    <button key={l} onClick={()=>setForm({...form, level: l})} className={`p-3 rounded-lg border-2 text-sm ${form.level===l?'border-pink-500 bg-pink-50':'border-slate-200'}`}>
                      <div className="text-2xl">{LEVELS[l].icon}</div>
                      <div className="text-xs mt-1">{LEVELS[l].label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тэмдэглэл</label>
                <textarea rows={3} value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Хүүхдийн онцлог, ахиц дэвшил..." />
              </div>
              {assess.filter(a => a.child_id === child.id).length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-600 mb-2">📜 Түүх</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {assess.filter(a => a.child_id === child.id).slice(0, 10).map(a => (
                      <div key={a.id} className="text-xs bg-slate-50 rounded p-2 flex justify-between">
                        <span>{CATS[a.category].icon} {CATS[a.category].label}</span>
                        <span className={`px-2 rounded ${LEVELS[a.level].chip}`}>{LEVELS[a.level].icon} {LEVELS[a.level].label}</span>
                        <span className="text-slate-400">{a.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
