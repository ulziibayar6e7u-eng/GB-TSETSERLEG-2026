'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Tab = 'portion'|'sample'|'taste'|'count'|'sanitation'|'report'
type Group = { id: number; code: string; name: string; icon: string }
type Emp = { id: string; last_name: string; first_name: string }

const MEALS = ['1-р хоол','2-р хоол','3-р хоол','4-р цайны цаг']

function ymd(d: Date) { return d.toISOString().slice(0,10) }

export default function TogoochPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [tab, setTab] = useState<Tab>('portion')
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<Emp[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [date, setDate] = useState(ymd(new Date()))

  // Portion
  const [portion, setPortion] = useState<any[]>([])
  const [pForm, setPForm] = useState({ group_id:'', meal_slot: MEALS[0], portion_g:0, extra_g:0, note:'' })

  // Sample
  const [samples, setSamples] = useState<any[]>([])
  const [sForm, setSForm] = useState({ meal_name:'', sample_taken_time:'', sample_size:'', keep_temp:'', fridge_status:'', taken_out_time:'', disposal_note:'' })

  // Taste
  const [tastes, setTastes] = useState<any[]>([])
  const [tForm, setTForm] = useState({ group_id:'', child_name:'', child_age:'', taster_id:'', comment:'', photo: null as File|null })

  // Count
  const [counts, setCounts] = useState<any[]>([])

  // Sanitation
  const [sanit, setSanit] = useState<any[]>([])
  const [saForm, setSaForm] = useState({ group_id:'', time_slot:'', note:'' })

  useEffect(() => {
    (async () => {
      const { data: g } = await supabase.from('groups').select('id, code, name, icon').order('id')
      setGroups((g as Group[])?.filter(x => x.code !== 'hogjim') || [])
      const { data: t } = await supabase.from('employees').select('id, last_name, first_name').in('role', ['bagsh','arga_zuich','erhlegch']).order('first_name')
      setTeachers((t as Emp[]) || [])
    })()
  }, [supabase])

  async function loadAll() {
    const start = `${month}-01`
    const end = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 1).toISOString().slice(0,10)
    const [p, s, t, c, sa] = await Promise.all([
      supabase.from('cook_portion').select('*, groups(name, icon)').gte('date', start).lt('date', end).order('date'),
      supabase.from('cook_sample').select('*').gte('date', start).lt('date', end).order('date', { ascending: false }),
      supabase.from('cook_taste').select('*, groups(name, icon), taster:taster_id(last_name, first_name)').gte('date', start).lt('date', end).order('date', { ascending: false }),
      supabase.from('cook_child_count').select('*, groups(name, icon)').gte('date', start).lt('date', end).order('date'),
      supabase.from('cook_sanitation').select('*, groups(name, icon)').gte('date', start).lt('date', end).order('date', { ascending: false }),
    ])
    setPortion((p.data as any) || [])
    setSamples((s.data as any) || [])
    setTastes((t.data as any) || [])
    setCounts((c.data as any) || [])
    setSanit((sa.data as any) || [])
  }
  useEffect(() => { loadAll() }, [month])

  async function saveP() {
    if (!pForm.group_id) { alert('Бүлэг сонго'); return }
    await supabase.from('cook_portion').insert({ date, group_id: Number(pForm.group_id), meal_slot: pForm.meal_slot, portion_g: Number(pForm.portion_g), extra_g: Number(pForm.extra_g), note: pForm.note || null, author_id: me?.id || null })
    setPForm({ group_id:'', meal_slot: MEALS[0], portion_g:0, extra_g:0, note:'' })
    loadAll()
  }
  async function saveS() {
    if (!sForm.meal_name.trim()) { alert('Хоолны нэр бөглө'); return }
    await supabase.from('cook_sample').insert({ ...sForm, date, author_id: me?.id || null })
    setSForm({ meal_name:'', sample_taken_time:'', sample_size:'', keep_temp:'', fridge_status:'', taken_out_time:'', disposal_note:'' })
    loadAll()
  }
  async function saveT() {
    if (!tForm.comment.trim()) { alert('Санал бичнэ үү'); return }
    let photo_url: string | null = null
    if (tForm.photo) {
      const path = `taste/${Date.now()}_${tForm.photo.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, tForm.photo)
      if (upErr) { alert('Зураг алдаа: '+upErr.message); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      photo_url = pub?.publicUrl || null
    }
    const { photo, ...rest } = tForm
    await supabase.from('cook_taste').insert({ ...rest, group_id: tForm.group_id ? Number(tForm.group_id) : null, taster_id: tForm.taster_id || null, date, photo_url, author_id: me?.id || null })
    setTForm({ group_id:'', child_name:'', child_age:'', taster_id:'', comment:'', photo: null })
    loadAll()
  }
  async function saveCount(groupId: number, cnt: number) {
    await supabase.from('cook_child_count').upsert({ date, group_id: groupId, count: cnt, author_id: me?.id || null }, { onConflict: 'date,group_id' })
    loadAll()
  }
  async function saveSa() {
    if (!saForm.group_id || !saForm.time_slot) { alert('Бүлэг + цаг сонго'); return }
    await supabase.from('cook_sanitation').insert({ date, group_id: Number(saForm.group_id), time_slot: saForm.time_slot, note: saForm.note || null, author_id: me?.id || null })
    setSaForm({ group_id:'', time_slot:'', note:'' })
    loadAll()
  }

  function download(kind: string, rows: any[], header: string[], mapRow: (r: any) => (string|number)[]) {
    const lines = [header.join(',')]
    rows.forEach(r => lines.push(mapRow(r).map(v => `"${String(v).replace(/,/g,';').replace(/\n/g,' ')}"`).join(',')))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${kind}-${month}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const TabBtn = ({ k, icon, label }: { k: Tab; icon: string; label: string }) => (
    <button onClick={()=>setTab(k)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab===k?'bg-orange-600 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>{icon} {label}</button>
  )

  const daysInMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()
  const dayHeaders = Array.from({length: daysInMonth}, (_,i) => i+1)

  return (
    <div className="p-6 lg:p-8 print:p-2">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">👨‍🍳</div>
              <div>
                <h1 className="text-2xl font-bold">Тогоочийн бүртгэлийн журнал</h1>
                <p className="text-sm opacity-90 mt-1">5 бүртгэл · Сарын нэгтгэл · Архив хэвлэлт</p>
              </div>
            </div>
            <input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap overflow-x-auto print:hidden">
          <TabBtn k="portion"    icon="🍚" label="Хоолны хэмжээ" />
          <TabBtn k="sample"     icon="🧪" label="Дээж" />
          <TabBtn k="taste"      icon="👅" label="Амтлуулсан" />
          <TabBtn k="count"      icon="👶" label="Хүүхдийн тоо" />
          <TabBtn k="sanitation" icon="🧼" label="Аяга ариутгал" />
          <TabBtn k="report"     icon="📊" label="Сарын нэгтгэл" />
        </div>

        {tab === 'portion' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 print:hidden">
              <h3 className="font-semibold mb-3">➕ Хоолны хэмжээ бүртгэх</h3>
              <div className="grid md:grid-cols-5 gap-2">
                <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <select value={pForm.group_id} onChange={(e)=>setPForm({...pForm, group_id: e.target.value})} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Бүлэг</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                </select>
                <select value={pForm.meal_slot} onChange={(e)=>setPForm({...pForm, meal_slot: e.target.value})} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="number" value={pForm.portion_g} onChange={(e)=>setPForm({...pForm, portion_g: Number(e.target.value)})} placeholder="Хэмжээ (г)" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <button onClick={saveP} className="bg-orange-600 hover:bg-orange-700 text-white text-sm rounded px-3 py-1.5">💾 Бүртгэх</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold">Хоолны хэмжээний бүртгэл — {month}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>download('portion', portion, ['Огноо','Бүлэг','Хоол','Хэмжээ (г)','Нэмэлт','Тэмдэглэл'], r=>[r.date, r.groups?.name||'', r.meal_slot||'', r.portion_g||0, r.extra_g||0, r.note||''])} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded">⬇️ CSV</button>
                  <button onClick={()=>window.print()} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded">🖨️ Хэвлэх</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b">Огноо</th>
                  <th className="p-2 text-left border-b">Бүлэг</th>
                  <th className="p-2 text-left border-b">Хоол</th>
                  <th className="p-2 text-center border-b">Хэмжээ</th>
                  <th className="p-2 text-center border-b">Нэмэлт</th>
                  <th className="p-2 text-left border-b">Тэмдэглэл</th>
                </tr></thead>
                <tbody>
                  {portion.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 border-b border-slate-100">{r.date}</td>
                      <td className="p-2 border-b border-slate-100">{r.groups?.icon} {r.groups?.name}</td>
                      <td className="p-2 border-b border-slate-100">{r.meal_slot}</td>
                      <td className="p-2 border-b border-slate-100 text-center font-semibold">+{r.portion_g}г</td>
                      <td className="p-2 border-b border-slate-100 text-center">{r.extra_g? `+${r.extra_g}г`:''}</td>
                      <td className="p-2 border-b border-slate-100 text-xs">{r.note || ''}</td>
                    </tr>
                  ))}
                  {portion.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Бүртгэл алга</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'sample' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 print:hidden">
              <h3 className="font-semibold mb-3">➕ Дээж бүртгэх</h3>
              <div className="grid md:grid-cols-4 gap-2">
                <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <input value={sForm.meal_name} onChange={(e)=>setSForm({...sForm, meal_name: e.target.value})} placeholder="Хоолны нэр *" className="border border-slate-300 rounded px-2 py-1.5 text-sm md:col-span-2" />
                <input value={sForm.sample_size} onChange={(e)=>setSForm({...sForm, sample_size: e.target.value})} placeholder="Хэмжээ (г/таваг)" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <input value={sForm.sample_taken_time} onChange={(e)=>setSForm({...sForm, sample_taken_time: e.target.value})} placeholder="Авах цаг" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <input value={sForm.keep_temp} onChange={(e)=>setSForm({...sForm, keep_temp: e.target.value})} placeholder="Хадгалах хэм" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <input value={sForm.fridge_status} onChange={(e)=>setSForm({...sForm, fridge_status: e.target.value})} placeholder="Хөргөгчийн шинж" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <input value={sForm.taken_out_time} onChange={(e)=>setSForm({...sForm, taken_out_time: e.target.value})} placeholder="Гаргах цаг" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <input value={sForm.disposal_note} onChange={(e)=>setSForm({...sForm, disposal_note: e.target.value})} placeholder="Тэмдэглэл" className="border border-slate-300 rounded px-2 py-1.5 text-sm md:col-span-2" />
                <button onClick={saveS} className="bg-orange-600 hover:bg-orange-700 text-white text-sm rounded px-3 py-1.5 md:col-span-2">💾 Бүртгэх</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold">Дээжийн бүртгэл — {month}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>download('sample', samples, ['Огноо','Хоол','Хэмжээ','Авах цаг','Хадгалах хэм','Гаргах цаг','Тэмдэглэл'], r=>[r.date,r.meal_name||'',r.sample_size||'',r.sample_taken_time||'',r.keep_temp||'',r.taken_out_time||'',r.disposal_note||''])} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded">⬇️ CSV</button>
                  <button onClick={()=>window.print()} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded">🖨️ Хэвлэх</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b">Огноо</th>
                  <th className="p-2 text-left border-b">Хоол</th>
                  <th className="p-2 text-center border-b">Хэмжээ</th>
                  <th className="p-2 text-center border-b">Авах цаг</th>
                  <th className="p-2 text-center border-b">Хадгалах хэм</th>
                  <th className="p-2 text-center border-b">Гаргах цаг</th>
                  <th className="p-2 text-left border-b">Тэмдэглэл</th>
                </tr></thead>
                <tbody>
                  {samples.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 border-b border-slate-100">{r.date}</td>
                      <td className="p-2 border-b border-slate-100 font-medium">{r.meal_name}</td>
                      <td className="p-2 border-b border-slate-100 text-center">{r.sample_size}</td>
                      <td className="p-2 border-b border-slate-100 text-center">{r.sample_taken_time}</td>
                      <td className="p-2 border-b border-slate-100 text-center">{r.keep_temp}</td>
                      <td className="p-2 border-b border-slate-100 text-center">{r.taken_out_time}</td>
                      <td className="p-2 border-b border-slate-100 text-xs">{r.disposal_note}</td>
                    </tr>
                  ))}
                  {samples.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Бүртгэл алга</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'taste' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 print:hidden">
              <h3 className="font-semibold mb-3">➕ Хоол амтлуулсан бүртгэл</h3>
              <div className="grid md:grid-cols-3 gap-2">
                <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <select value={tForm.group_id} onChange={(e)=>setTForm({...tForm, group_id: e.target.value})} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Бүлэг</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                </select>
                <select value={tForm.taster_id} onChange={(e)=>setTForm({...tForm, taster_id: e.target.value})} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Амтлуулсан хүн</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.last_name}.{t.first_name}</option>)}
                </select>
                <input value={tForm.child_name} onChange={(e)=>setTForm({...tForm, child_name: e.target.value})} placeholder="Хүүхдийн нэр" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <input value={tForm.child_age} onChange={(e)=>setTForm({...tForm, child_age: e.target.value})} placeholder="Он сар өдөр" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <textarea value={tForm.comment} onChange={(e)=>setTForm({...tForm, comment: e.target.value})} placeholder="Санал хүсэлт *" className="border border-slate-300 rounded px-2 py-1.5 text-sm md:col-span-3" rows={2} />
                <label className="md:col-span-3 flex items-center gap-2 text-sm">
                  <span className="text-slate-600">📷 Зураг:</span>
                  <input type="file" accept="image/*" capture="environment" onChange={(e)=>setTForm({...tForm, photo: e.target.files?.[0] || null})} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm" />
                  {tForm.photo && <span className="text-xs text-emerald-600">✓ {tForm.photo.name}</span>}
                </label>
                <button onClick={saveT} className="bg-orange-600 hover:bg-orange-700 text-white text-sm rounded px-3 py-1.5 md:col-span-3">💾 Бүртгэх</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold">Амтлуулсан бүртгэл — {month}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>download('taste', tastes, ['Огноо','Бүлэг','Хүүхэд','ОСӨ','Санал','Амтлуулсан'], r=>[r.date, r.groups?.name||'', r.child_name||'', r.child_age||'', r.comment||'', r.taster?`${r.taster.last_name}.${r.taster.first_name}`:''])} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded">⬇️ CSV</button>
                  <button onClick={()=>window.print()} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded">🖨️ Хэвлэх</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b">Огноо</th>
                  <th className="p-2 text-left border-b">Бүлэг</th>
                  <th className="p-2 text-left border-b">Хүүхэд</th>
                  <th className="p-2 text-center border-b">ОСӨ</th>
                  <th className="p-2 text-left border-b">Санал</th>
                  <th className="p-2 text-center border-b">Зураг</th>
                  <th className="p-2 text-left border-b">Амтлуулсан</th>
                </tr></thead>
                <tbody>
                  {tastes.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 border-b border-slate-100">{r.date}</td>
                      <td className="p-2 border-b border-slate-100">{r.groups?.icon} {r.groups?.name}</td>
                      <td className="p-2 border-b border-slate-100">{r.child_name}</td>
                      <td className="p-2 border-b border-slate-100 text-center text-xs">{r.child_age}</td>
                      <td className="p-2 border-b border-slate-100 text-xs">{r.comment}</td>
                      <td className="p-2 border-b border-slate-100 text-center">{r.photo_url ? <a href={r.photo_url} target="_blank" rel="noopener"><img src={r.photo_url} alt="" className="w-12 h-12 object-cover rounded inline-block" /></a> : '—'}</td>
                      <td className="p-2 border-b border-slate-100 text-xs">{r.taster?`${r.taster.last_name}.${r.taster.first_name}`:''}</td>
                    </tr>
                  ))}
                  {tastes.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Бүртгэл алга</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'count' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 print:hidden">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">👶 Өдөр тутмын хүүхдийн тоо</h3>
                <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                {groups.map(g => {
                  const found = counts.find(c => c.date === date && c.group_id === g.id)
                  return (
                    <div key={g.id} className="flex items-center gap-2 bg-slate-50 rounded p-2">
                      <span className="text-sm font-medium flex-1">{g.icon} {g.name}</span>
                      <input type="number" min="0" defaultValue={found?.count || 0} onBlur={(e)=>saveCount(g.id, Number(e.target.value))} className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-center" />
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold">Хүүхдийн тоо — {month}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>download('count', counts, ['Огноо','Бүлэг','Тоо'], r=>[r.date, r.groups?.name||'', r.count])} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded">⬇️ CSV</button>
                  <button onClick={()=>window.print()} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded">🖨️ Хэвлэх</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b">Бүлэг</th>
                  {dayHeaders.map(d => <th key={d} className="p-1 text-center border-b w-8 text-xs">{d}</th>)}
                  <th className="p-2 text-center border-b">Нийт</th>
                </tr></thead>
                <tbody>
                  {groups.map(g => {
                    const gc = counts.filter(c => c.group_id === g.id)
                    const total = gc.reduce((s,c) => s + (c.count || 0), 0)
                    return (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="p-2 border-b border-slate-100 font-medium">{g.icon} {g.name}</td>
                        {dayHeaders.map(d => {
                          const rec = gc.find(c => Number(c.date.slice(8,10)) === d)
                          return <td key={d} className="p-1 text-center border-b border-slate-100 text-xs">{rec?.count ?? '·'}</td>
                        })}
                        <td className="p-2 text-center border-b border-slate-100 font-semibold">{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'sanitation' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 print:hidden">
              <h3 className="font-semibold mb-3">➕ Аяга таваг ариутгал</h3>
              <div className="grid md:grid-cols-4 gap-2">
                <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <select value={saForm.group_id} onChange={(e)=>setSaForm({...saForm, group_id: e.target.value})} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
                  <option value="">Бүлэг</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                </select>
                <input value={saForm.time_slot} onChange={(e)=>setSaForm({...saForm, time_slot: e.target.value})} placeholder="Цаг (5:11, өглөө...)" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
                <button onClick={saveSa} className="bg-orange-600 hover:bg-orange-700 text-white text-sm rounded px-3 py-1.5">💾 Бүртгэх</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold">Ариутгалын график — {month}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>download('sanitation', sanit, ['Огноо','Бүлэг','Цаг','Тэмдэглэл'], r=>[r.date, r.groups?.name||'', r.time_slot, r.note||''])} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded">⬇️ CSV</button>
                  <button onClick={()=>window.print()} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded">🖨️ Хэвлэх</button>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b">Огноо</th>
                  <th className="p-2 text-left border-b">Бүлэг</th>
                  <th className="p-2 text-center border-b">Цаг</th>
                  <th className="p-2 text-center border-b">Төлөв</th>
                  <th className="p-2 text-left border-b">Тэмдэглэл</th>
                </tr></thead>
                <tbody>
                  {sanit.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2 border-b border-slate-100">{r.date}</td>
                      <td className="p-2 border-b border-slate-100">{r.groups?.icon} {r.groups?.name}</td>
                      <td className="p-2 border-b border-slate-100 text-center font-medium">{r.time_slot}</td>
                      <td className="p-2 border-b border-slate-100 text-center"><span className="text-emerald-600">✓</span></td>
                      <td className="p-2 border-b border-slate-100 text-xs">{r.note}</td>
                    </tr>
                  ))}
                  {sanit.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Бүртгэл алга</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'report' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-4xl mb-2">🍚</div>
              <div className="text-3xl font-bold text-orange-600">{portion.length}</div>
              <div className="text-sm text-slate-500 mt-1">Хоолны хэмжээ бичлэг</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-4xl mb-2">🧪</div>
              <div className="text-3xl font-bold text-blue-600">{samples.length}</div>
              <div className="text-sm text-slate-500 mt-1">Дээж бүртгэл</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-4xl mb-2">👅</div>
              <div className="text-3xl font-bold text-pink-600">{tastes.length}</div>
              <div className="text-sm text-slate-500 mt-1">Амтлуулсан бүртгэл</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-4xl mb-2">👶</div>
              <div className="text-3xl font-bold text-emerald-600">{counts.reduce((s,c)=>s+(c.count||0),0)}</div>
              <div className="text-sm text-slate-500 mt-1">Хүүхэд-өдөр (нийт)</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-4xl mb-2">🧼</div>
              <div className="text-3xl font-bold text-teal-600">{sanit.length}</div>
              <div className="text-sm text-slate-500 mt-1">Ариутгалын бүртгэл</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white">
              <div className="text-4xl mb-2">📁</div>
              <div className="font-semibold mb-2">Архивт хадгалах</div>
              <div className="text-xs opacity-90 mb-3">Бүх бүртгэлийг CSV татаж, хэвлэн архивт өгнө.</div>
              <button onClick={()=>window.print()} className="bg-white text-orange-700 rounded-lg px-3 py-2 text-sm font-semibold w-full">🖨️ Бүгдийг хэвлэх</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
