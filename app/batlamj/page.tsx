'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Kind = 'weekly' | 'monthly' | 'hogjim' | 'club' | 'org' | 'material' | 'weekly_material'
type Status = 'submitted' | 'approved' | 'returned' | 'draft'

type Item = {
  key: string
  kind: Kind
  planId: string
  icon: string
  color: string
  title: string
  subtitle: string
  date: string
  link: string
  status: Status
  reviewerNote?: string | null
  approvedAt?: string | null
  approverName?: string | null
  description?: string | null
  fileUrl?: string | null
  extraLinks?: string[]
}

type Comment = { id: string; plan_kind: string; plan_id: string; author_id: string; text: string; created_at: string; evidence_url: string | null; evidence_note: string | null; resolved: boolean; resolved_at: string | null; employees?: { last_name: string; first_name: string } | null }

const KIND_META: Record<Kind, { icon: string; label: string; color: string }> = {
  weekly:  { icon: '🎁', label: '7 хоногийн', color: 'from-emerald-500 to-teal-500' },
  monthly: { icon: '📅', label: 'Сарын',       color: 'from-cyan-500 to-blue-500' },
  hogjim:  { icon: '🎵', label: 'Хөгжмийн',    color: 'from-violet-500 to-purple-500' },
  club:    { icon: '🎨', label: 'Дугуйлан',    color: 'from-pink-500 to-rose-500' },
  org:     { icon: '📆', label: 'Байгууллага', color: 'from-orange-500 to-red-500' },
  material:{ icon: '📎', label: 'Хэрэглэгдэхүүн', color: 'from-blue-500 to-cyan-500' },
  weekly_material: { icon: '🎁', label: '7 хоног', color: 'from-emerald-500 to-teal-500' },
}

const STAMP_STYLES = [
  { color: '#dc2626', text: 'БАТЛАВ ✓', font: 'font-bold' },
  { color: '#059669', text: '★ APPROVED ★', font: 'font-bold' },
  { color: '#7c3aed', text: '✿ ЗӨВШӨӨРСӨН ✿', font: 'font-bold' },
]

function CommentCard({ c, onChange, meId }: { c: Comment; onChange: () => void; meId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    let evidence_url: string | null = c.evidence_url
    if (file) {
      const path = `comments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      evidence_url = pub?.publicUrl || null
    }
    await supabase.from('approval_comments').update({
      evidence_url, evidence_note: note || null, resolved: true, resolved_by: meId, resolved_at: new Date().toISOString(),
    }).eq('id', c.id)
    setSaving(false)
    setShowForm(false); setNote(''); setFile(null)
    onChange()
  }

  return (
    <div className={`rounded-lg p-3 border ${c.resolved ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <span className="font-medium text-slate-700">{c.employees ? `${c.employees.last_name}.${c.employees.first_name}` : 'Хэрэглэгч'}</span>
        <span>· {new Date(c.created_at).toLocaleString('mn-MN')}</span>
        {c.resolved && <span className="ml-auto text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-semibold">✓ БИЕЛҮҮЛСЭН</span>}
      </div>
      <div className="text-sm text-slate-800 whitespace-pre-wrap">💬 {c.text}</div>
      {c.evidence_note && (
        <div className="mt-2 pl-3 border-l-2 border-emerald-400">
          <div className="text-[11px] text-emerald-700 font-semibold mb-0.5">📎 БИЕЛЭЛТ:</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{c.evidence_note}</div>
          {c.evidence_url && <a href={c.evidence_url} target="_blank" rel="noopener" className="inline-block mt-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded">📎 Нотлох баримт</a>}
        </div>
      )}
      {!c.resolved && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1 rounded font-medium">✓ Биелүүлсэн (нотлох баримт нэмэх)</button>
          ) : (
            <div className="space-y-2 mt-2">
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Юу хийсэн тухай тайлбар..." className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs" />
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(false); setNote(''); setFile(null) }} className="text-xs px-3 py-1 border border-slate-300 rounded">Болих</button>
                <button onClick={submit} disabled={saving} className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded font-medium">{saving ? '...' : 'Илгээх'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stamp({ note, name, date }: { note?: string; name?: string; date?: string }) {
  const style = STAMP_STYLES[0]
  return (
    <div className="inline-block relative">
      <div
        className="border-4 rounded-lg px-4 py-2 rotate-[-8deg] select-none"
        style={{ borderColor: style.color, color: style.color, background: style.color + '10' }}
      >
        <div className={`text-lg tracking-wider ${style.font}`}>{style.text}</div>
        {name && <div className="text-[10px] mt-0.5 opacity-80">{name}</div>}
        {date && <div className="text-[10px] opacity-70">{date}</div>}
      </div>
      {note && <div className="mt-2 text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded p-2 rotate-0">✍️ {note}</div>}
    </div>
  )
}

export default function BatlamjPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<'weekly' | 'other' | 'org'>('weekly')
  const [statusTab, setStatusTab] = useState<'submitted' | 'approved' | 'returned' | 'all'>('submitted')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isErhlegch = me?.role === 'erhlegch' || me?.is_admin
  const isReviewer = me?.role === 'arga_zuich' || isErhlegch

  async function load() {
    setLoading(true)
    const [weekly, monthly, hogjim, clubs, org, materials] = await Promise.all([
      supabase.from('weekly_plans').select('id, year, month, week_num, theme, status, reviewer_note, approved_at, author_id, employees:author_id(last_name, first_name), reviewer:reviewer_id(last_name, first_name), groups(name, icon, color)').order('updated_at', { ascending: false }),
      supabase.from('monthly_plans').select('id, year, month, theme, status, reviewer_note, approved_at, author_id, employees:author_id(last_name, first_name), reviewer:reviewer_id(last_name, first_name), groups(name, icon, color)').order('updated_at', { ascending: false }),
      supabase.from('plans').select('id, title, period, status, approved_at, author_id, tab, employees:author_id(last_name, first_name)').order('updated_at', { ascending: false }).limit(200),
      supabase.from('clubs').select('id, name, icon, color, status, created_at, approver_note, employees:teacher_id(last_name, first_name)').order('created_at', { ascending: false }),
      supabase.from('org_plan_documents').select('id, plan_type, phase, period, title, status, employees:author_id(last_name, first_name)').order('created_at', { ascending: false }),
      supabase.from('teacher_materials').select('id, title, category, description, file_url, extra_links, status, reviewer_note, approved_at, created_at, employees:author_id(last_name, first_name), reviewer:reviewer_id(last_name, first_name)').order('updated_at', { ascending: false }),
    ])

    const list: Item[] = []
    ;((weekly.data as unknown as { id: string; year: number; month: number; week_num: number; theme: string | null; status: Status; reviewer_note: string | null; approved_at: string | null; employees?: {last_name: string; first_name: string}; reviewer?: {last_name: string; first_name: string}; groups?: {name: string; icon: string; color: string} }[]) || []).forEach((p) => {
      list.push({
        key: 'w-' + p.id, kind: 'weekly', planId: p.id,
        icon: KIND_META.weekly.icon, color: '#10b981',
        title: p.theme || `${p.year}/${p.month} · ${p.week_num}-р 7 хоног`,
        subtitle: `${p.employees ? p.employees.last_name + '.' + p.employees.first_name : ''}${p.groups ? ' · ' + p.groups.icon + ' ' + p.groups.name : ''}`,
        date: `${p.year}-${String(p.month).padStart(2, '0')}`,
        link: `/tulvluguu/weekly/${p.id}`,
        status: p.status, reviewerNote: p.reviewer_note, approvedAt: p.approved_at,
        approverName: p.reviewer ? `${p.reviewer.last_name}.${p.reviewer.first_name}` : null,
      })
    })
    ;((monthly.data as unknown as { id: string; year: number; month: number; theme: string | null; status: Status; reviewer_note: string | null; approved_at: string | null; employees?: {last_name: string; first_name: string}; reviewer?: {last_name: string; first_name: string}; groups?: {name: string; icon: string; color: string} }[]) || []).forEach((p) => {
      list.push({
        key: 'm-' + p.id, kind: 'monthly', planId: p.id,
        icon: KIND_META.monthly.icon, color: '#06b6d4',
        title: p.theme || `${p.year} · ${p.month}-р сар`,
        subtitle: `${p.employees ? p.employees.last_name + '.' + p.employees.first_name : ''}${p.groups ? ' · ' + p.groups.icon + ' ' + p.groups.name : ''}`,
        date: `${p.year}-${String(p.month).padStart(2, '0')}`,
        link: `/tulvluguu/monthly/${p.id}`,
        status: p.status, reviewerNote: p.reviewer_note, approvedAt: p.approved_at,
        approverName: p.reviewer ? `${p.reviewer.last_name}.${p.reviewer.first_name}` : null,
      })
    })
    ;((hogjim.data as unknown as { id: string; title: string; period: string; status: Status; approved_at: string | null; tab: string; employees?: {last_name: string; first_name: string} }[]) || []).forEach((p) => {
      const st: Status = p.status || (p.approved_at ? 'approved' : 'submitted')
      list.push({
        key: 'h-' + p.id, kind: 'hogjim', planId: p.id,
        icon: KIND_META.hogjim.icon, color: '#8b5cf6',
        title: p.title || '(гарчиггүй)',
        subtitle: `Хөгжмийн · ${p.tab || 'plan'} · ${p.employees ? p.employees.last_name + '.' + p.employees.first_name : ''}`,
        date: p.period || '',
        link: `/batlamj/plan/${p.id}`,
        status: st, approvedAt: p.approved_at,
      })
    })
    ;((clubs.data as unknown as { id: number; name: string; icon: string; color: string; status: Status; created_at: string; approver_note: string | null; employees?: {last_name: string; first_name: string} }[]) || []).forEach((c) => {
      list.push({
        key: 'c-' + c.id, kind: 'club', planId: String(c.id),
        icon: c.icon || KIND_META.club.icon, color: c.color || '#ec4899',
        title: c.name,
        subtitle: `Дугуйлан · ${c.employees ? c.employees.last_name + '.' + c.employees.first_name : ''}`,
        date: (c.created_at || '').split('T')[0],
        link: `/dugilan/${c.id}`,
        status: c.status, reviewerNote: c.approver_note,
      })
    })
    ;((materials.data as unknown as { id: string; title: string; category: string; description: string | null; file_url: string | null; extra_links: string[]; status: Status; reviewer_note: string | null; approved_at: string | null; created_at: string; employees?: {last_name: string; first_name: string}; reviewer?: {last_name: string; first_name: string} }[]) || []).forEach((m) => {
      const catLbl = m.category === 'weekly' ? '🎁 7 хоног ээлжит' : m.category === 'material' ? '📎 Хэрэглэгдэхүүн' : m.category === 'program' ? '📘 Нэмэлт хөтөлбөр' : m.category === 'event' ? '🎉 Арга хэмжээ' : '📝 Бусад'
      const isWeeklyMaterial = m.category === 'weekly'
      list.push({
        key: 'mat-' + m.id, kind: isWeeklyMaterial ? 'weekly_material' : 'material', planId: m.id,
        icon: isWeeklyMaterial ? '🎁' : KIND_META.material.icon, color: isWeeklyMaterial ? '#10b981' : '#3b82f6',
        title: m.title,
        subtitle: `${catLbl} · ${m.employees ? m.employees.last_name + '.' + m.employees.first_name : ''}`,
        date: (m.created_at || '').split('T')[0],
        link: m.file_url || (m.extra_links && m.extra_links[0]) || '/heregleg',
        status: m.status, reviewerNote: m.reviewer_note, approvedAt: m.approved_at,
        approverName: m.reviewer ? `${m.reviewer.last_name}.${m.reviewer.first_name}` : null,
        description: m.description, fileUrl: m.file_url, extraLinks: m.extra_links || [],
      })
    })
    ;((org.data as unknown as { id: string; plan_type: string; phase: string; period: string; title: string; status: Status; employees?: {last_name: string; first_name: string} }[]) || []).forEach((p) => {
      list.push({
        key: 'o-' + p.id, kind: 'org', planId: p.id,
        icon: KIND_META.org.icon, color: '#f97316',
        title: p.title || '(гарчиггүй)',
        subtitle: `Байгууллага · ${p.employees ? p.employees.last_name + '.' + p.employees.first_name : ''}`,
        date: p.period || '',
        link: `/tulvluguu-bail/${p.plan_type}`,
        status: p.status,
      })
    })

    list.sort((a, b) => (b.date > a.date ? 1 : -1))
    setItems(list)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function loadComments(itemKey: string, kind: Kind, planId: string) {
    const { data } = await supabase.from('approval_comments').select('id, plan_kind, plan_id, author_id, text, created_at, evidence_url, evidence_note, resolved, resolved_at, employees:author_id(last_name, first_name)').eq('plan_kind', kind).eq('plan_id', planId).order('created_at')
    setComments((prev) => ({ ...prev, [itemKey]: (data as unknown as Comment[]) || [] }))
  }
  async function addComment(itemKey: string, kind: Kind, planId: string) {
    if (!newComment.trim() || !me) return
    setSaving(true)
    const { data } = await supabase.from('approval_comments').insert({ plan_kind: kind, plan_id: planId, author_id: me.id, text: newComment.trim() }).select('*, employees:author_id(last_name, first_name)').single()
    setSaving(false)
    if (data) setComments((prev) => ({ ...prev, [itemKey]: [...(prev[itemKey] || []), data as unknown as Comment] }))
    setNewComment('')
  }
  async function decide(item: Item, decision: 'approved' | 'returned') {
    if (!me) return
    const note = decisionNote.trim()
    if (decision === 'returned' && !note) { alert('Буцаах шалтгаанаа бичнэ үү'); return }
    const patch: Record<string, string | null> = {
      status: decision,
      reviewer_id: me.id,
      reviewer_note: note || null,
      reviewed_at: new Date().toISOString(),
    }
    if (decision === 'approved') patch.approved_at = new Date().toISOString()
    const table = item.kind === 'weekly' ? 'weekly_plans' : item.kind === 'monthly' ? 'monthly_plans' : item.kind === 'hogjim' ? 'plans' : item.kind === 'club' ? 'clubs' : (item.kind === 'material' || item.kind === 'weekly_material') ? 'teacher_materials' : 'org_plan_documents'
    if (item.kind === 'club') { patch.approver_id = me.id; patch.approver_note = note || null; delete patch.reviewer_id; delete patch.reviewer_note }
    const idVal = item.kind === 'club' ? parseInt(item.planId) : item.planId
    const { error } = await supabase.from(table).update(patch).eq('id', idVal)
    if (error) { alert('Алдаа: ' + error.message); return }
    setDecisionNote('')
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const inSection = (i: Item) => {
    if (section === 'weekly') return i.kind === 'weekly' || i.kind === 'weekly_material'
    if (section === 'org') return i.kind === 'org'
    return i.kind === 'monthly' || i.kind === 'hogjim' || i.kind === 'club' || i.kind === 'material'
  }
  const sectioned = items.filter(inSection)
  const filtered = statusTab === 'all' ? sectioned : sectioned.filter((i) => i.status === statusTab)

  const counts = {
    weekly: items.filter((i) => i.kind === 'weekly' || i.kind === 'weekly_material').length,
    other:  items.filter((i) => i.kind === 'monthly' || i.kind === 'hogjim' || i.kind === 'club' || i.kind === 'material').length,
    org:    items.filter((i) => i.kind === 'org').length,
  }
  const statusCounts = {
    submitted: sectioned.filter((i) => i.status === 'submitted').length,
    approved:  sectioned.filter((i) => i.status === 'approved').length,
    returned:  sectioned.filter((i) => i.status === 'returned').length,
    all:       sectioned.length,
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🏆</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Батламжийн ширээ</h1>
              <p className="text-sm opacity-90 mt-1">Багш нарын илгээсэн төлөвлөгөө, хөтөлбөрийг хянаж баталгаажуулах</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{statusCounts.submitted}</div>
              <div className="text-xs opacity-80">хүлээгдэж буй</div>
            </div>
          </div>
        </div>

        {/* Section тав */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={() => { setSection('weekly'); setStatusTab('submitted') }} className={`p-4 rounded-xl border-2 transition text-left ${section === 'weekly' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎁</div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">7 хоног ээлжит сургалтын төлөвлөгөө</div>
                <div className="text-xs text-slate-500 mt-0.5">Багш нарын долоо хоногийн ээлжит хөтөлбөр</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">{counts.weekly}</div>
              </div>
            </div>
          </button>
          <button onClick={() => { setSection('other'); setStatusTab('submitted') }} className={`p-4 rounded-xl border-2 transition text-left ${section === 'other' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-300'}`}>
            <div className="flex items-center gap-3">
              <div className="text-3xl">📚</div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">Хэрэглэгдэхүүн, бусад төлөвлөлт</div>
                <div className="text-xs text-slate-500 mt-0.5">Сургалтын хэрэглэгдэхүүн, дугуйлан, сарын, хөгжмийн</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-violet-600">{counts.other}</div>
              </div>
            </div>
          </button>
          {isErhlegch && (
            <button onClick={() => { setSection('org'); setStatusTab('submitted') }} className={`p-4 rounded-xl border-2 transition text-left md:col-span-2 ${section === 'org' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}>
              <div className="flex items-center gap-3">
                <div className="text-3xl">📆</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">Байгууллагын төлөвлөгөө <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full ml-1">Зөвхөн эрхлэгч</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">Байгууллагын түвшний төлөвлөгөө, тайлан</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">{counts.org}</div>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Status тав */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap">
          {([
            ['submitted', '📬 Хянах', statusCounts.submitted, 'bg-amber-500'],
            ['approved', '✅ Батлагдсан', statusCounts.approved, 'bg-emerald-500'],
            ['returned', '↩️ Буцаагдсан', statusCounts.returned, 'bg-red-500'],
            ['all', '📚 Бүгд', statusCounts.all, 'bg-slate-500'],
          ] as [typeof statusTab, string, number, string][]).map(([k, lbl, cnt, cls]) => (
            <button key={k} onClick={() => setStatusTab(k)} className={`px-3 py-2 rounded-lg text-sm font-medium ${statusTab === k ? `${cls} text-white shadow` : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              {lbl} <span className={`text-xs px-1.5 py-0.5 rounded-full ml-1 ${statusTab === k ? 'bg-white/20' : 'bg-slate-300 text-slate-700'}`}>{cnt}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">✨</div>
            <div>Хоосон</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((i) => {
              const isOpen = expanded === i.key
              const cs = comments[i.key] || []
              const statusColor = i.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : i.status === 'returned' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              const statusIcon = i.status === 'approved' ? '✅' : i.status === 'returned' ? '↩️' : '📬'
              return (
                <div key={i.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-5 hover:bg-slate-50 cursor-pointer" onClick={() => {
                    const willOpen = expanded !== i.key
                    setExpanded(willOpen ? i.key : null)
                    if (willOpen && !comments[i.key]) loadComments(i.key, i.kind, i.planId)
                  }}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0" style={{ background: `linear-gradient(135deg, ${i.color}, ${i.color}dd)` }}>{i.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusIcon} {i.status === 'approved' ? 'Батлагдсан' : i.status === 'returned' ? 'Буцаагдсан' : 'Хянах'}</span>
                          <span className="text-xs text-slate-500">🕐 {i.date}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{KIND_META[i.kind].label}</span>
                        </div>
                        <h3 className="font-semibold text-slate-800">{i.title}</h3>
                        <div className="text-sm text-slate-500 mt-1">{i.subtitle}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Link href={i.link} onClick={(e) => e.stopPropagation()} className="text-orange-600 hover:text-orange-800 text-sm font-medium">Нээх →</Link>
                        <div className="text-xs text-slate-400">{isOpen ? '▲' : '▼'}</div>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50 p-5">
                      {/* Агуулга / файл / линк */}
                      {(i.description || i.fileUrl || (i.extraLinks && i.extraLinks.length > 0)) && (
                        <div className="mb-4 bg-white rounded-lg border border-slate-200 p-4">
                          {i.description && <div className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{i.description}</div>}
                          <div className="flex flex-wrap gap-2">
                            {i.fileUrl && (
                              <>
                                <button onClick={() => setPreviewUrl(i.fileUrl!)} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium">👁 Файл харах</button>
                                <a href={i.fileUrl} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">📎 Татах</a>
                              </>
                            )}
                            {(i.extraLinks || []).map((url, idx) => (
                              <div key={idx} className="flex gap-1">
                                <button onClick={() => setPreviewUrl(url)} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium">👁 Линк {idx + 1}</button>
                                <a href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">↗</a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {i.status === 'approved' && (
                        <div className="mb-4 flex items-start justify-between">
                          <Stamp note={i.reviewerNote || undefined} name={i.approverName || undefined} date={i.approvedAt?.split('T')[0]} />
                        </div>
                      )}
                      {i.status === 'returned' && i.reviewerNote && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                          <div className="font-semibold mb-1">↩️ Буцаагдсан шалтгаан:</div>
                          {i.reviewerNote}
                        </div>
                      )}

                      {/* Comments */}
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-slate-600 mb-2">💬 ЗӨВЛӨМЖ, ТЭМДЭГЛЭЛ ({cs.length})</div>
                        {cs.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">Тэмдэглэл алга</div>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {cs.map((c) => (
                              <CommentCard key={c.id} c={c} onChange={() => loadComments(i.key, i.kind, i.planId)} meId={me.id} />
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2} placeholder="Зөвлөмж, тэмдэглэл бичих..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                          <button onClick={() => addComment(i.key, i.kind, i.planId)} disabled={saving || !newComment.trim()} className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium self-end">Илгээх</button>
                        </div>
                      </div>

                      {isReviewer && i.status !== 'approved' && (
                        <div className="pt-3 border-t border-slate-200">
                          <div className="mb-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">✍️ ШИЙДВЭРИЙН ТЭМДЭГЛЭЛ / ЗӨВЛӨГӨӨ</label>
                            <textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={3} placeholder="Батлах бол зөвлөгөө (заавал биш). Буцаах бол шалтгаан заавал бичнэ." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => decide(i, 'approved')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">✅ Батлах (тамга дарах)</button>
                            <button onClick={() => decide(i, 'returned')} disabled={!decisionNote.trim()} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg text-sm font-semibold">↩️ Буцаах</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
          <div className="bg-white px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">👁</span>
              <span className="text-sm text-slate-700 truncate">{previewUrl}</span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a href={previewUrl} target="_blank" rel="noopener" className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg">↗ Шинэ таб</a>
              <button onClick={() => setPreviewUrl(null)} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg">✕ Хаах</button>
            </div>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full border-0 bg-white" />
        </div>
      )}
    </div>
  )
}
