'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Employee = { id: string; last_name: string; first_name: string; positions?: { name: string } }
type Child = { id: string; last_name: string; first_name: string }
type Record = {
  id: string
  employee_id: string
  category: 'dadal' | 'ahits' | 'sanaachlaga'
  title: string | null
  description: string | null
  child_id: string | null
  date: string
  file_url: string | null
  extra_links: string[]
  reviewer_id: string | null
  reviewer_note: string | null
  status: string
  created_at: string
  children?: Child | null
  reviewer?: Employee | null
}

const CATS = {
  dadal:       { icon: '🌱', label: 'Дадал хэвшил олгож буй байдал', color: 'from-emerald-500 to-teal-600' },
  ahits:       { icon: '📊', label: 'Хүүхдийн дадал хэвшлийн судалгаа', color: 'from-blue-500 to-cyan-600' },
  sanaachlaga: { icon: '💡', label: 'Санаачилсан ажил, арга хэмжээ', color: 'from-amber-500 to-orange-600' },
} as const

type CatKey = keyof typeof CATS

const DADAL_HABITS = [
  { icon: '🧼', label: 'Гар угаах' },
  { icon: '💧', label: 'Ам зайлах' },
  { icon: '🦷', label: 'Шүд угаах' },
  { icon: '💦', label: 'Царай угаах' },
  { icon: '💇', label: 'Үс самнах' },
  { icon: '👕', label: 'Хувцас эвхэх' },
  { icon: '🎽', label: 'Бие даан хувцаслах' },
  { icon: '🧦', label: 'Оймс өмсөх' },
  { icon: '👟', label: 'Гутал засах, солих' },
  { icon: '🧣', label: 'Ороолт зөв ороох' },
  { icon: '🚽', label: 'Ариун цэвэрийн өрөө ашиглах' },
  { icon: '🤧', label: 'Алчуур хэрэглэх' },
  { icon: '🍽', label: 'Ширээ бэлдэх, цэвэрлэх' },
  { icon: '🥄', label: 'Хоолны хэрэгсэл зөв барих' },
  { icon: '🍚', label: 'Бие даан хооллох' },
  { icon: '💺', label: 'Сандал засах' },
  { icon: '🛏', label: 'Ор дэвсэх, хураах' },
  { icon: '🧸', label: 'Тоглоомоо хураах' },
  { icon: '🎒', label: 'Хувийн зүйлээ хариуцах' },
  { icon: '🚰', label: 'Ус тогтмол ууж дадах' },
  { icon: '🤝', label: 'Мэндлэх, эмтэн эмтэн' },
  { icon: '🙏', label: 'Талархах, уучлал гуйх' },
  { icon: '🤲', label: 'Бусадтай хуваалцах' },
  { icon: '🚶', label: 'Дараалалдаа зогсох' },
  { icon: '🌱', label: 'Ургамал усалж арчлах' },
  { icon: '🧹', label: 'Бүлгээ цэвэрлэх' },
] as const

function Inner({ id }: { id: string }) {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const params = useSearchParams()
  const initialTab = (params.get('tab') as CatKey) || 'dadal'
  const [tab, setTab] = useState<CatKey>(initialTab)
  const [emp, setEmp] = useState<Employee | null>(null)
  const [records, setRecords] = useState<Record[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Record | null>(null)
  const [form, setForm] = useState({ title: '', description: '', child_id: '', date: new Date().toISOString().split('T')[0], file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'monthly'>('list')

  const [tuslahGroups, setTuslahGroups] = useState<number[]>([])
  const [hygieneMonths, setHygieneMonths] = useState<{ month: string; rinse: number; wash: number; brush: number }[]>([])
  const isSameGroupBagsh = me && me.role === 'bagsh' && me.groups.some((g) => tuslahGroups.includes(g.id))
  const canReview = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich' || (isSameGroupBagsh && tab === 'dadal'))
  const isOwner = me && emp && me.id === emp.id

  async function load() {
    setLoading(true)
    const [e, r, c, gt] = await Promise.all([
      supabase.from('employees').select('id, last_name, first_name, positions(name)').eq('id', id).maybeSingle(),
      supabase.from('tuslah_records').select('*, children(id, last_name, first_name), reviewer:reviewer_id(id, last_name, first_name)').eq('employee_id', id).eq('category', tab).order('date', { ascending: false }),
      supabase.from('children').select('id, last_name, first_name').eq('status', 'active').order('last_name'),
      supabase.from('group_teachers').select('group_id').eq('employee_id', id),
    ])
    const groupIds = ((gt.data as { group_id: number }[]) || []).map((r) => r.group_id)
    setTuslahGroups(groupIds)
    // Ариун цэврийн журналын сарын нэгтгэл
    if (tab === 'dadal' && groupIds.length > 0) {
      const { data: hLogs } = await supabase.from('hygiene_log').select('date, routine').in('group_id', groupIds).order('date', { ascending: false })
      const map = new Map<string, { rinse: number; wash: number; brush: number }>()
      ;((hLogs as { date: string; routine: 'rinse' | 'wash' | 'brush' }[]) || []).forEach((h) => {
        const m = h.date.slice(0, 7)
        if (!map.has(m)) map.set(m, { rinse: 0, wash: 0, brush: 0 })
        map.get(m)![h.routine]++
      })
      setHygieneMonths(Array.from(map.entries()).map(([month, v]) => ({ month, ...v })).sort((a, b) => (a.month < b.month ? 1 : -1)))
    } else {
      setHygieneMonths([])
    }
    setEmp(e.data as unknown as Employee)
    setRecords((r.data as unknown as Record[]) || [])
    setChildren((c.data as Child[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id, tab])

  function openAdd() {
    setEditing(null)
    setForm({ title: '', description: '', child_id: '', date: new Date().toISOString().split('T')[0], file: null, extraLinks: '' })
    setShowForm(true)
  }
  function openEdit(r: Record) {
    setEditing(r)
    setForm({
      title: r.title || '',
      description: r.description || '',
      child_id: r.child_id || '',
      date: r.date,
      file: null,
      extraLinks: (r.extra_links || []).join('\n'),
    })
    setShowForm(true)
  }

  async function save() {
    if (!me) return
    setSaving(true)
    let file_url = editing?.file_url || null
    if (form.file) {
      const path = `tuslah/${id}/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const payload = {
      employee_id: id,
      category: tab,
      title: form.title || null,
      description: form.description || null,
      child_id: form.child_id || null,
      date: form.date,
      file_url,
      extra_links: form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
    }
    if (editing) await supabase.from('tuslah_records').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    else await supabase.from('tuslah_records').insert(payload)
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function remove(r: Record) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('tuslah_records').delete().eq('id', r.id)
    load()
  }

  async function submitReview(r: Record) {
    if (!me) return
    await supabase.from('tuslah_records').update({
      reviewer_id: me.id,
      reviewer_note: reviewNote,
      updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    setReviewingId(null)
    setReviewNote('')
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!emp) return <div className="p-8 text-slate-500">Ажилтан олдсонгүй</div>

  const cat = CATS[tab]

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/bagsh" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Багш нар руу буцах</Link>

        <div className={`rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br ${cat.color}`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur">
              {emp.first_name[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{emp.last_name}.{emp.first_name}</h1>
              <p className="text-sm opacity-90">{emp.positions?.name}</p>
              <p className="text-sm opacity-90 mt-1">{cat.icon} {cat.label}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap items-center">
          {(Object.keys(CATS) as CatKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                tab === k ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {CATS[k].icon} {CATS[k].label}
            </button>
          ))}
          {isOwner && (
            <button onClick={openAdd} className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
              + Бүртгэл нэмэх
            </button>
          )}
        </div>

        {records.length > 0 && (() => {
          const byMonth = new Map<string, number>()
          records.forEach((r) => {
            const m = r.date.slice(0, 7)
            byMonth.set(m, (byMonth.get(m) || 0) + 1)
          })
          const months = Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12)
          const max = Math.max(1, ...months.map(([, n]) => n))
          function downloadCsv() {
            const rows = [['Огноо','Гарчиг','Хүүхэд','Тайлбар','Файл']]
            records.forEach((r) => rows.push([r.date, r.title || '', r.children ? `${r.children.last_name}.${r.children.first_name}` : '', (r.description || '').replace(/\n/g, ' '), r.file_url || '']))
            const csv = '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${emp?.last_name}.${emp?.first_name}_${cat.label}_${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-700">📊 {cat.label} · Нэгтгэл</div>
                  <div className="text-xs text-slate-500">Нийт {records.length} бүртгэл · Сүүлийн 12 сар</div>
                </div>
                <div className="flex gap-2 print:hidden items-center">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button onClick={() => setViewMode('list')} className={`text-xs px-2.5 py-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-600'}`}>📋 Жагсаалт</button>
                    <button onClick={() => setViewMode('monthly')} className={`text-xs px-2.5 py-1.5 rounded ${viewMode === 'monthly' ? 'bg-white shadow text-slate-800' : 'text-slate-600'}`}>📅 Сараар</button>
                  </div>
                  <button onClick={() => window.print()} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">🖨 Хэвлэх</button>
                  <button onClick={downloadCsv} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-medium">📥 CSV татах</button>
                </div>
              </div>
              <div className="flex items-end gap-1 h-24 border-b border-slate-200 pt-2">
                {months.map(([m, n]) => (
                  <div key={m} className="flex-1 flex flex-col items-center">
                    <div className="text-[10px] text-slate-500 mb-0.5">{n}</div>
                    <div className="w-full bg-emerald-500 rounded-t" style={{ height: Math.max(4, Math.round((n / max) * 70)) }} />
                    <div className="text-[10px] text-slate-500 mt-1">{m.slice(5)}/{m.slice(2, 4)}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {tab === 'dadal' && hygieneMonths.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-700">🧴 Ариун цэврийн журнал · сараар</div>
                <div className="text-xs text-slate-500">Ам зайлсан, Гар угаасан, Шүд угаасан тэмдэглэлүүд сар сараар</div>
              </div>
              <Link href="/tuslah-hygiene" className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-medium">🧴 Журнал руу очих</Link>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 border border-slate-200 text-left text-xs font-semibold text-slate-600">Сар</th>
                  <th className="p-2 border border-slate-200 text-center text-xs font-semibold text-blue-700">💧 Ам зайлах</th>
                  <th className="p-2 border border-slate-200 text-center text-xs font-semibold text-emerald-700">🧼 Гар угаах</th>
                  <th className="p-2 border border-slate-200 text-center text-xs font-semibold text-cyan-700">🦷 Шүд угаах</th>
                  <th className="p-2 border border-slate-200 text-center text-xs font-semibold text-slate-600 print:hidden">Хэвлэх / Татах</th>
                </tr>
              </thead>
              <tbody>
                {hygieneMonths.map((h) => (
                  <tr key={h.month} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 font-medium text-slate-800">📅 {h.month}</td>
                    <td className="p-2 border border-slate-200 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${h.rinse > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{h.rinse} өдөр</span></td>
                    <td className="p-2 border border-slate-200 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${h.wash > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{h.wash} өдөр</span></td>
                    <td className="p-2 border border-slate-200 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${h.brush > 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-400'}`}>{h.brush} өдөр</span></td>
                    <td className="p-2 border border-slate-200 text-center print:hidden">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <Link href={`/tuslah-hygiene?routine=rinse&month=${h.month}`} className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded" title="Ам зайлах">💧</Link>
                        <Link href={`/tuslah-hygiene?routine=wash&month=${h.month}`} className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded" title="Гар угаах">🧼</Link>
                        <Link href={`/tuslah-hygiene?routine=brush&month=${h.month}`} className="text-[11px] bg-cyan-50 hover:bg-cyan-100 text-cyan-700 px-2 py-1 rounded" title="Шүд угаах">🦷</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'monthly' && records.length > 0 && (() => {
          // Хүүхэд бүрээр × сар бүрээр pivot
          const childIds = new Set(records.filter((r) => r.child_id).map((r) => r.child_id))
          const monthSet = new Set(records.map((r) => r.date.slice(0, 7)))
          const months = Array.from(monthSet).sort()
          const kids = children.filter((c) => childIds.has(c.id))
          const grid = new Map<string, Map<string, number>>()
          records.forEach((r) => {
            if (!r.child_id) return
            const m = r.date.slice(0, 7)
            if (!grid.has(r.child_id)) grid.set(r.child_id, new Map())
            grid.get(r.child_id)!.set(m, (grid.get(r.child_id)!.get(m) || 0) + 1)
          })
          function downloadMonthlyCsv() {
            const header = ['Хүүхэд', ...months, 'Нийт']
            const rows: string[][] = [header]
            kids.forEach((k) => {
              const row = [`${k.last_name}.${k.first_name}`]
              let sum = 0
              months.forEach((m) => {
                const n = grid.get(k.id)?.get(m) || 0
                row.push(String(n)); sum += n
              })
              row.push(String(sum))
              rows.push(row)
            })
            // Нийт мөр
            const totals = ['НИЙТ']; let grand = 0
            months.forEach((m) => { let s = 0; kids.forEach((k) => { s += grid.get(k.id)?.get(m) || 0 }); totals.push(String(s)); grand += s })
            totals.push(String(grand))
            rows.push(totals)
            const csv = '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${emp?.last_name}.${emp?.first_name}_${cat.label}_сараар_${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }
          if (kids.length === 0) return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">Хүүхэд бүрээр бүртгэсэн зүйл алга (record-т хүүхэд сонгоогүй)</div>
          )
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2 print:hidden">
                <div className="text-sm font-semibold text-slate-700">📅 Хүүхэд бүрээр × Сараар</div>
                <button onClick={downloadMonthlyCsv} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-medium">📥 Сарын нэгтгэл CSV</button>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2 border border-slate-200 font-semibold text-slate-600 sticky left-0 bg-slate-50">Хүүхэд</th>
                    {months.map((m) => <th key={m} className="p-2 border border-slate-200 font-semibold text-slate-600 text-xs whitespace-nowrap">{m.slice(5)}/{m.slice(2, 4)}</th>)}
                    <th className="p-2 border border-slate-200 font-semibold text-slate-800 text-xs">НИЙТ</th>
                  </tr>
                </thead>
                <tbody>
                  {kids.map((k) => {
                    const row = grid.get(k.id) || new Map()
                    let sum = 0
                    return (
                      <tr key={k.id} className="hover:bg-slate-50">
                        <td className="p-2 border border-slate-200 sticky left-0 bg-white font-medium text-slate-800">{k.last_name}.{k.first_name}</td>
                        {months.map((m) => {
                          const n = row.get(m) || 0
                          sum += n
                          return <td key={m} className={`p-2 border border-slate-200 text-center ${n > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-300'}`}>{n || ''}</td>
                        })}
                        <td className="p-2 border border-slate-200 text-center font-bold text-slate-800 bg-slate-50">{sum}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-slate-100 font-bold">
                    <td className="p-2 border border-slate-200 sticky left-0 bg-slate-100 text-slate-800">НИЙТ</td>
                    {months.map((m) => {
                      let s = 0; kids.forEach((k) => { s += grid.get(k.id)?.get(m) || 0 })
                      return <td key={m} className="p-2 border border-slate-200 text-center text-slate-800">{s}</td>
                    })}
                    <td className="p-2 border border-slate-200 text-center text-slate-900">{records.filter((r) => r.child_id).length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })()}

        {viewMode === 'list' && (loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">{cat.icon}</div>
            <div>Бүртгэл байхгүй</div>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{cat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-slate-500">🗓 {r.date}</span>
                      {r.children && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          👧 {r.children.last_name}.{r.children.first_name}
                        </span>
                      )}
                    </div>
                    {r.title && <h3 className="font-semibold text-slate-800">{r.title}</h3>}
                    {r.description && <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.description}</div>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                          📎 Файл
                        </a>
                      )}
                      {(r.extra_links || []).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">
                          🔗 Линк {i + 1}
                        </a>
                      ))}
                    </div>
                    {r.reviewer_note && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border-l-4 border-amber-400 text-sm">
                        <div className="text-xs font-semibold text-amber-700 mb-1">
                          {r.reviewer ? `${r.reviewer.last_name}.${r.reviewer.first_name}` : 'Хянагч'}-ын зөвлөгөө
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap">{r.reviewer_note}</div>
                      </div>
                    )}
                    {reviewingId === r.id && (
                      <div className="mt-3 space-y-2 bg-blue-50 rounded-lg p-3">
                        <textarea
                          rows={3}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Зөвлөгөө бичих..."
                          className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setReviewingId(null)} className="px-3 py-1.5 text-sm text-slate-600">Болих</button>
                          <button onClick={() => submitReview(r)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">💾 Зөвлөгөө хадгалах</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {canReview && reviewingId !== r.id && (
                      <button onClick={() => { setReviewingId(r.id); setReviewNote(r.reviewer_note || '') }} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1">💬 Зөвлөх</button>
                    )}
                    {isOwner && (
                      <>
                        <button onClick={() => openEdit(r)} className="text-slate-600 hover:text-slate-800 text-xs px-2 py-1">Засах</button>
                        <button onClick={() => remove(r)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1">Устгах</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{editing ? 'Засах' : 'Шинэ бүртгэл'}</h2>
              <p className="text-xs text-slate-500 mt-1">{cat.icon} {cat.label}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Огноо</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Хүүхэд (сонголт)</label>
                  <select value={form.child_id} onChange={(e) => setForm({ ...form, child_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Ерөнхий —</option>
                    {children.map((c) => (<option key={c.id} value={c.id}>{c.last_name}.{c.first_name}</option>))}
                  </select>
                </div>
              </div>
              {tab === 'dadal' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">🌱 Дадал сонгох (эсвэл гарчигт өөрөө бич)</label>
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    {DADAL_HABITS.map((h) => {
                      const active = form.title === h.label
                      return (
                        <button key={h.label} type="button" onClick={() => setForm({ ...form, title: h.label })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${active ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'}`}>
                          {h.icon} {h.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={tab === 'dadal' ? 'Дадлыг сонго эсвэл өөрөө бич' : ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тайлбар</label>
                <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">📎 Файл (зураг, бичлэг, PDF, Word)</label>
                <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">🔗 Нэмэлт линкүүд (мөр бүрд нэг)</label>
                <textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} placeholder="Facebook, Google Drive..." className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Болих</button>
                <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {saving ? 'Хадгалж байна...' : '💾 Хадгалах'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TuslahDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Ачааллаж байна...</div>}>
      <Inner id={id} />
    </Suspense>
  )
}
