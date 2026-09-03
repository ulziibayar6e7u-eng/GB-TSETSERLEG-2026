'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Rec = {
  id: string
  date: string
  category: string
  subcategory: string | null
  amount: number
  description: string | null
  file_url: string | null
  employees?: { last_name: string; first_name: string } | null
}

const CATS = {
  income:  { icon: '💵', label: 'Орлого', color: 'bg-emerald-100 text-emerald-700' },
  expense: { icon: '💸', label: 'Зарлага', color: 'bg-red-100 text-red-700' },
  salary:  { icon: '💰', label: 'Цалин',   color: 'bg-blue-100 text-blue-700' },
  budget:  { icon: '📊', label: 'Төсөв',   color: 'bg-amber-100 text-amber-700' },
} as const

type Cat = keyof typeof CATS

export default function NyagtlanPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const [records, setRecords] = useState<Rec[]>([])
  const [tab, setTab] = useState<'all' | Cat>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'expense' as Cat, subcategory: '', amount: '', description: '', file: null as File | null })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('financial_records').select('*, employees:author_id(last_name, first_name)').order('date', { ascending: false }).limit(200)
    setRecords((data as unknown as Rec[]) || [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!me) return
    setSaving(true)
    let file_url: string | null = null
    if (form.file) {
      const path = `fin/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const { error } = await supabase.from('financial_records').insert({
      date: form.date, category: form.category,
      subcategory: form.subcategory || null,
      amount: parseFloat(form.amount) || 0,
      description: form.description || null,
      file_url, author_id: me.id,
    })
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], category: 'expense', subcategory: '', amount: '', description: '', file: null })
    load()
  }
  async function remove(r: Rec) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('financial_records').delete().eq('id', r.id)
    load()
  }

  const filtered = tab === 'all' ? records : records.filter((r) => r.category === tab)
  const totals: Record<Cat, number> = { income: 0, expense: 0, salary: 0, budget: 0 }
  records.forEach((r) => { if (r.category in totals) totals[r.category as Cat] += Number(r.amount) })

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">💰</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Нягтлангийн хэсэг</h1>
              <p className="text-sm opacity-90">Санхүү, орлого, зарлага, цалин</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><div className="text-xl font-bold">{totals.income.toLocaleString()}₮</div><div className="text-xs opacity-80">Орлого</div></div>
              <div><div className="text-xl font-bold">{totals.expense.toLocaleString()}₮</div><div className="text-xs opacity-80">Зарлага</div></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap items-center">
          <button onClick={() => setTab('all')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Бүгд ({records.length})</button>
          {(Object.keys(CATS) as Cat[]).map((c) => (
            <button key={c} onClick={() => setTab(c)} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === c ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              {CATS[c].icon} {CATS[c].label}
            </button>
          ))}
          <button onClick={() => setShowForm(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Бүртгэл</button>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">💵</div>
            <div>Бүртгэл байхгүй</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-600 uppercase">
                  <th className="px-4 py-3">Огноо</th>
                  <th className="px-4 py-3">Төрөл</th>
                  <th className="px-4 py-3">Тайлбар</th>
                  <th className="px-4 py-3 text-right">Дүн</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const c = CATS[r.category as Cat] || { icon: '📄', label: r.category, color: 'bg-slate-100' }
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.date}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.color}`}>{c.icon} {c.label}</span>{r.subcategory && <span className="text-xs text-slate-500 ml-1">· {r.subcategory}</span>}</td>
                      <td className="px-4 py-3 text-slate-700">{r.description || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{Number(r.amount).toLocaleString()}₮</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r.file_url && <a href={r.file_url} target="_blank" rel="noopener" className="text-xs text-blue-600 mr-2">📎</a>}
                        <button onClick={() => remove(r)} className="text-xs text-red-600 hover:text-red-800">Устгах</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">Шинэ санхүүгийн бүртгэл</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Төрөл</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Cat })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {(Object.keys(CATS) as Cat[]).map((c) => (<option key={c} value={c}>{CATS[c].icon} {CATS[c].label}</option>))}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Дэд ангилал</label><input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="Жш: Хүнс, канц" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Дүн (₮)</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Баримт</label><input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={save} disabled={saving || !form.amount} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
