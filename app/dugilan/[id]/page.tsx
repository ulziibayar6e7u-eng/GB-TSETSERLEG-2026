'use client'

import { useEffect, useState, use, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Employee = { id: string; last_name: string; first_name: string; positions?: { name: string } }
type Club = {
  id: number
  name: string
  icon: string
  color: string
  description: string | null
  teacher_id: string | null
  status: 'draft' | 'submitted' | 'approved' | 'returned' | null
  approver_id: string | null
  approver_note: string | null
  reviewed_at: string | null
  employees?: Employee
  approver?: Employee | null
}
type Group = { id: number; name: string; icon: string; color: string }
type Child = { id: string; last_name: string; first_name: string; group_id: number | null; groups?: Group }
type ChildClub = { id: number; child_id: string; children: Child }
type Activity = {
  id: string
  club_id: number
  author_id: string | null
  date: string
  title: string | null
  description: string | null
  file_url: string | null
  extra_links: string[]
  participants_count: number | null
  created_at: string
  employees?: Employee | null
}

const STATUS = {
  draft:     { label: '📝 Ноорог',     color: 'bg-slate-100 text-slate-700 border-slate-300' },
  submitted: { label: '🕐 Хянагдаж',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved:  { label: '✅ Батлагдсан', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  returned:  { label: '↩️ Буцаагдсан', color: 'bg-red-100 text-red-700 border-red-300' },
}

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const clubId = parseInt(id)
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()

  const [tab, setTab] = useState<'members' | 'activities'>('members')
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ChildClub[]>([])
  const [allChildren, setAllChildren] = useState<Child[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [groups, setGroups] = useState<Group[]>([])

  // Activity form
  const [showAddAct, setShowAddAct] = useState(false)
  const [editingAct, setEditingAct] = useState<Activity | null>(null)
  const [actForm, setActForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', description: '', participants_count: '', file: null as File | null, extraLinks: '' })
  const [savingAct, setSavingAct] = useState(false)

  // Approval note
  const [reviewNote, setReviewNote] = useState('')
  const [savingReview, setSavingReview] = useState(false)

  const canApprove = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')
  const isTeacher = me && club && club.teacher_id === me.id

  async function load() {
    setLoading(true)
    const [c, m, ac, g, act] = await Promise.all([
      supabase.from('clubs').select('*, employees:teacher_id(id, last_name, first_name, positions(name)), approver:approver_id(id, last_name, first_name)').eq('id', clubId).maybeSingle(),
      supabase.from('child_clubs').select('id, child_id, children(id, last_name, first_name, group_id, groups(id, name, icon, color))').eq('club_id', clubId).eq('status', 'active'),
      supabase.from('children').select('*, groups(id, name, icon, color)').order('last_name'),
      supabase.from('groups').select('*').order('id'),
      supabase.from('club_activities').select('*, employees:author_id(id, last_name, first_name)').eq('club_id', clubId).order('date', { ascending: false }),
    ])
    setClub(c.data as unknown as Club)
    setMembers((m.data as unknown as ChildClub[]) || [])
    setAllChildren((ac.data as Child[]) || [])
    setGroups((g.data as Group[]) || [])
    setActivities((act.data as unknown as Activity[]) || [])
    setReviewNote((c.data as unknown as Club)?.approver_note || '')
    setLoading(false)
  }
  useEffect(() => { load() }, [clubId])

  const memberIds = new Set(members.map((m) => m.child_id))
  const nonMembers = allChildren.filter((c) => !memberIds.has(c.id))
  const filteredNonMembers = nonMembers.filter((c) => {
    const matchSearch = !search || `${c.last_name}.${c.first_name}`.toLowerCase().includes(search.toLowerCase())
    const matchGroup = !groupFilter || c.group_id?.toString() === groupFilter
    return matchSearch && matchGroup
  })

  function toggleSelect(id: string) {
    const s = new Set(selectedIds)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSelectedIds(s)
  }
  function selectAllFiltered() {
    const s = new Set(selectedIds)
    filteredNonMembers.forEach((c) => s.add(c.id))
    setSelectedIds(s)
  }

  async function addMembers() {
    const rows = Array.from(selectedIds).map((child_id) => ({ child_id, club_id: clubId }))
    if (rows.length === 0) return
    await supabase.from('child_clubs').insert(rows)
    setSelectedIds(new Set())
    setShowAddMember(false)
    load()
  }
  async function removeMember(m: ChildClub) {
    if (!confirm(`${m.children.last_name}.${m.children.first_name}-г хасах уу?`)) return
    await supabase.from('child_clubs').delete().eq('id', m.id)
    load()
  }

  async function submitForApproval() {
    if (!club) return
    await supabase.from('clubs').update({ status: 'submitted' }).eq('id', club.id)
    load()
  }
  async function review(status: 'approved' | 'returned') {
    if (!me || !club) return
    if (status === 'returned' && !reviewNote.trim()) { alert('Буцаах шалтгаанаа бичнэ үү'); return }
    setSavingReview(true)
    await supabase.from('clubs').update({
      status,
      approver_id: me.id,
      approver_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', club.id)
    setSavingReview(false)
    load()
  }

  function openActAdd() {
    setEditingAct(null)
    setActForm({ date: new Date().toISOString().split('T')[0], title: '', description: '', participants_count: String(members.length), file: null, extraLinks: '' })
    setShowAddAct(true)
  }
  function openActEdit(a: Activity) {
    setEditingAct(a)
    setActForm({
      date: a.date,
      title: a.title || '',
      description: a.description || '',
      participants_count: a.participants_count?.toString() || '',
      file: null,
      extraLinks: (a.extra_links || []).join('\n'),
    })
    setShowAddAct(true)
  }
  async function saveAct() {
    if (!me) return
    setSavingAct(true)
    let file_url = editingAct?.file_url || null
    if (actForm.file) {
      const path = `clubs/${clubId}/${Date.now()}_${actForm.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, actForm.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSavingAct(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const payload = {
      club_id: clubId,
      author_id: me.id,
      date: actForm.date,
      title: actForm.title || null,
      description: actForm.description || null,
      participants_count: actForm.participants_count ? parseInt(actForm.participants_count) : null,
      file_url,
      extra_links: actForm.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
    }
    if (editingAct) await supabase.from('club_activities').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingAct.id)
    else await supabase.from('club_activities').insert(payload)
    setSavingAct(false)
    setShowAddAct(false)
    load()
  }
  async function removeAct(a: Activity) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('club_activities').delete().eq('id', a.id)
    load()
  }

  if (loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!club) return <div className="p-8 text-slate-500">Дугуйлан олдсонгүй</div>

  const s = club.status ? STATUS[club.status] : null

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dugilan" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Дугуйлан руу буцах</Link>

        <div className="rounded-2xl p-6 text-white mb-6" style={{ background: `linear-gradient(135deg, ${club.color}, ${club.color}dd)` }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{club.icon}</div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {s && <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${s.color}`}>{s.label}</span>}
                </div>
                <h1 className="text-2xl font-bold">{club.name}</h1>
                {club.employees && <div className="text-sm opacity-90 mt-1">Багш: {club.employees.last_name}.{club.employees.first_name}</div>}
                {club.description && <div className="text-sm opacity-80 mt-1">{club.description}</div>}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{members.length}</div>
                <div className="text-xs opacity-80">хүүхэд</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{activities.length}</div>
                <div className="text-xs opacity-80">үйл ажиллагаа</div>
              </div>
            </div>
          </div>
          {club.approver_note && (
            <div className="mt-4 p-3 rounded-lg bg-white/20 backdrop-blur text-sm">
              <div className="text-xs font-semibold opacity-80 mb-1">
                {club.approver ? `${club.approver.last_name}.${club.approver.first_name}` : 'Арга зүйч'}-ийн тэмдэглэл
              </div>
              {club.approver_note}
            </div>
          )}
          <div className="mt-4 flex gap-2 flex-wrap">
            {(isTeacher || me?.is_admin) && (club.status === 'draft' || club.status === 'returned' || !club.status) && (
              <button onClick={submitForApproval} className="bg-white text-slate-800 px-4 py-2 rounded-lg font-medium text-sm hover:bg-white/90">
                📤 Батлуулахаар илгээх
              </button>
            )}
            {canApprove && club.status === 'submitted' && (
              <>
                <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Тэмдэглэл..." className="flex-1 min-w-40 border border-white/30 bg-white/20 text-white placeholder-white/60 rounded-lg px-3 py-2 text-sm" />
                <button onClick={() => review('approved')} disabled={savingReview} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm">✅ Батлах</button>
                <button onClick={() => review('returned')} disabled={savingReview} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm">↩️ Буцаах</button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-4 flex gap-1">
          <button onClick={() => setTab('members')} className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm ${tab === 'members' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
            👧 Гишүүд ({members.length})
          </button>
          <button onClick={() => setTab('activities')} className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm ${tab === 'activities' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
            📸 Үйл ажиллагаа ({activities.length})
          </button>
        </div>

        {tab === 'members' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-end">
              <button onClick={() => setShowAddMember(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
                + Хүүхэд нэмэх
              </button>
            </div>
            {members.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="text-5xl mb-3">👧</div>
                <div>Хараахан хүүхэд нэмээгүй</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((m, i) => (
                  <div key={m.id} className="p-3 flex items-center gap-3 hover:bg-slate-50">
                    <div className="w-8 text-center text-sm text-slate-400">{i + 1}</div>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: m.children.groups?.color || '#3b82f6' }}>
                      {m.children.first_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{m.children.last_name}.{m.children.first_name}</div>
                      {m.children.groups && <div className="text-xs text-slate-500">{m.children.groups.icon} {m.children.groups.name}</div>}
                    </div>
                    <button onClick={() => removeMember(m)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Хасах</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'activities' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={openActAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
                + Үйл ажиллагаа нэмэх
              </button>
            </div>
            {activities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <div className="text-5xl mb-3">📸</div>
                <div>Хараахан үйл ажиллагаа бүртгээгүй</div>
              </div>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📸</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-slate-500">🗓 {a.date}</span>
                        {a.participants_count != null && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">👧 {a.participants_count}</span>}
                        {a.employees && <span className="text-xs text-slate-500">— {a.employees.last_name}.{a.employees.first_name}</span>}
                      </div>
                      {a.title && <h3 className="font-semibold text-slate-800">{a.title}</h3>}
                      {a.description && <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.description}</div>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.file_url && (
                          <a href={a.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                            📎 Файл харах
                          </a>
                        )}
                        {(a.extra_links || []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">🔗 Линк {i + 1}</a>
                        ))}
                      </div>
                    </div>
                    {(a.author_id === me?.id || me?.is_admin) && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => openActEdit(a)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">Засах</button>
                        <button onClick={() => removeAct(a)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{club.name} — Хүүхэд нэмэх</h2>
              <div className="mt-3 flex gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Хайх..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Бүх бүлэг</option>
                  {groups.map((g) => (<option key={g.id} value={g.id}>{g.icon} {g.name}</option>))}
                </select>
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <button onClick={selectAllFiltered} className="text-blue-600 hover:text-blue-800">Бүгдийг сонгох ({filteredNonMembers.length})</button>
                <span className="text-slate-500">Сонгосон: {selectedIds.size}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredNonMembers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">{nonMembers.length === 0 ? 'Бүх хүүхэд нэмэгдсэн' : 'Олдсонгүй'}</div>
              ) : (
                filteredNonMembers.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4" />
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: c.groups?.color || '#3b82f6' }}>{c.first_name[0]}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{c.last_name}.{c.first_name}</div>
                      {c.groups && <div className="text-xs text-slate-500">{c.groups.icon} {c.groups.name}</div>}
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button onClick={() => { setShowAddMember(false); setSelectedIds(new Set()) }} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Болих</button>
              <button onClick={addMembers} disabled={selectedIds.size === 0} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium">
                {selectedIds.size > 0 ? `${selectedIds.size} нэмэх` : 'Нэмэх'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddAct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{editingAct ? 'Үйл ажиллагаа засах' : 'Шинэ үйл ажиллагаа'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Огноо</label>
                  <input type="date" value={actForm.date} onChange={(e) => setActForm({ ...actForm, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Оролцогч хүүхэд</label>
                  <input type="number" value={actForm.participants_count} onChange={(e) => setActForm({ ...actForm, participants_count: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг</label>
                <input value={actForm.title} onChange={(e) => setActForm({ ...actForm, title: e.target.value })} placeholder="Жш: Уралдаан бэлтгэл" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тайлбар (юу хийсэн, үр дүн)</label>
                <textarea rows={4} value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">📎 Файл (зураг, бичлэг, PDF)</label>
                <input type="file" accept="image/*,video/*,.pdf" onChange={(e) => setActForm({ ...actForm, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">🔗 Нэмэлт линкүүд (мөр бүрд нэг)</label>
                <textarea rows={2} value={actForm.extraLinks} onChange={(e) => setActForm({ ...actForm, extraLinks: e.target.value })} placeholder="Facebook, YouTube, Drive..." className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddAct(false)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Болих</button>
                <button onClick={saveAct} disabled={savingAct} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium">
                  {savingAct ? 'Хадгалж байна...' : '💾 Хадгалах'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
