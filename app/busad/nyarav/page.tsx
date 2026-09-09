'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

const PURPOSES = {
  food:      { icon: '🥕', label: 'Хүнсний материал',       color: 'from-orange-500 to-red-500' },
  cleaning:  { icon: '🧴', label: 'Ариун цэврийн бодис',    color: 'from-blue-500 to-cyan-500' },
  staff_kit: { icon: '🧤', label: 'Ажилтны хамгаалалт',     color: 'from-emerald-500 to-teal-500' },
  office:    { icon: '📋', label: 'Албан хэрэгсэл',         color: 'from-violet-500 to-purple-500' },
} as const
type Purpose = keyof typeof PURPOSES

type Item = { id: string; name: string; category: string|null; unit: string; quantity: number; min_quantity: number; location: string|null; note: string|null; purpose: string|null }
type Movement = { id: string; item_id: string; movement_type: 'purchase'|'distribute'|'adjust'|'writeoff'; quantity: number; date: string; recipient: string|null; recipient_type: string|null; recipient_id: string|null; price: number|null; supplier: string|null; note: string|null; inventory_items?: { name: string; unit: string; purpose: string|null } }
type Supplier = { id: string; name: string; contact: string|null; phone: string|null; address: string|null }
type Emp = { id: string; last_name: string; first_name: string; positions?: { name: string }|null }
type Tab = 'dashboard' | 'items' | 'receive' | 'distribute' | 'movements' | 'suppliers'

export default function NyaravPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [items, setItems] = useState<Item[]>([])
  const [moves, setMoves] = useState<Movement[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [staff, setStaff] = useState<Emp[]>([])
  const [showItemForm, setShowItemForm] = useState(false)
  const [editItem, setEditItem] = useState<Item|null>(null)
  const [itemForm, setItemForm] = useState({ name:'', category:'', unit:'ш', min_quantity:0, location:'', purpose:'food' as Purpose, note:'' })
  const [receiveForm, setReceiveForm] = useState({ item_id:'', quantity:0, supplier:'', supplier_id:'', price:0, date: new Date().toISOString().slice(0,10), note:'' })
  const [distForm, setDistForm] = useState({ item_id:'', quantity:0, recipient_type:'cook', recipient_id:'', recipient:'', date: new Date().toISOString().slice(0,10), note:'' })
  const [showSupForm, setShowSupForm] = useState(false)
  const [supForm, setSupForm] = useState({ name:'', contact:'', phone:'', address:'', note:'' })
  const [filterPurpose, setFilterPurpose] = useState<Purpose|'all'>('all')

  async function loadAll() {
    const [i, m, s, e] = await Promise.all([
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('inventory_movements').select('*, inventory_items(name, unit, purpose)').order('date', { ascending: false }).limit(200),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('employees').select('id, last_name, first_name, positions(name)').order('first_name'),
    ])
    setItems((i.data as any) || [])
    setMoves((m.data as any) || [])
    setSuppliers((s.data as any) || [])
    setStaff((e.data as any) || [])
  }
  useEffect(() => { loadAll() }, [])

  async function saveItem() {
    if (!itemForm.name.trim()) { alert('Нэр бөглөнө үү'); return }
    const payload = { ...itemForm, min_quantity: Number(itemForm.min_quantity) || 0, updated_at: new Date().toISOString() }
    const { error } = editItem
      ? await supabase.from('inventory_items').update(payload).eq('id', editItem.id)
      : await supabase.from('inventory_items').insert(payload)
    if (error) { alert(error.message); return }
    setShowItemForm(false); setEditItem(null)
    setItemForm({ name:'', category:'', unit:'ш', min_quantity:0, location:'', purpose:'food', note:'' })
    loadAll()
  }
  async function removeItem(id: string) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('inventory_items').delete().eq('id', id)
    loadAll()
  }
  async function saveReceive() {
    if (!receiveForm.item_id || !receiveForm.quantity) { alert('Материал болон тоо ширхэг сонгоно уу'); return }
    const it = items.find(x => x.id === receiveForm.item_id)!
    const { error: e1 } = await supabase.from('inventory_movements').insert({
      item_id: receiveForm.item_id, movement_type: 'purchase', quantity: Number(receiveForm.quantity), date: receiveForm.date,
      supplier: suppliers.find(s => s.id === receiveForm.supplier_id)?.name || receiveForm.supplier || null,
      price: Number(receiveForm.price) || null, note: receiveForm.note || null, author_id: me?.id || null,
    })
    if (e1) { alert(e1.message); return }
    await supabase.from('inventory_items').update({ quantity: Number(it.quantity) + Number(receiveForm.quantity), updated_at: new Date().toISOString() }).eq('id', receiveForm.item_id)
    setReceiveForm({ item_id:'', quantity:0, supplier:'', supplier_id:'', price:0, date: new Date().toISOString().slice(0,10), note:'' })
    loadAll(); alert('✅ Хүлээн авалт бүртгэгдлээ')
  }
  async function saveDist() {
    if (!distForm.item_id || !distForm.quantity) { alert('Материал болон тоо ширхэг сонгоно уу'); return }
    const it = items.find(x => x.id === distForm.item_id)!
    if (Number(distForm.quantity) > Number(it.quantity)) { alert('Үлдэгдэл хүрэлцэхгүй байна'); return }
    const staffMatch = staff.find(s => s.id === distForm.recipient_id)
    const recipientName = distForm.recipient_type === 'cook' ? 'Тогооч'
      : distForm.recipient_type === 'staff' ? (staffMatch ? `${staffMatch.last_name}.${staffMatch.first_name}` : distForm.recipient) : distForm.recipient
    const { error: e1 } = await supabase.from('inventory_movements').insert({
      item_id: distForm.item_id, movement_type: 'distribute', quantity: Number(distForm.quantity), date: distForm.date,
      recipient: recipientName || null, recipient_type: distForm.recipient_type,
      recipient_id: distForm.recipient_type === 'staff' ? (distForm.recipient_id || null) : null,
      note: distForm.note || null, author_id: me?.id || null,
    })
    if (e1) { alert(e1.message); return }
    await supabase.from('inventory_items').update({ quantity: Number(it.quantity) - Number(distForm.quantity), updated_at: new Date().toISOString() }).eq('id', distForm.item_id)
    setDistForm({ item_id:'', quantity:0, recipient_type:'cook', recipient_id:'', recipient:'', date: new Date().toISOString().slice(0,10), note:'' })
    loadAll(); alert('✅ Тараалт бүртгэгдлээ')
  }
  async function saveSupplier() {
    if (!supForm.name.trim()) { alert('Нэр бөглөнө үү'); return }
    const { error } = await supabase.from('suppliers').insert(supForm)
    if (error) { alert(error.message); return }
    setShowSupForm(false); setSupForm({ name:'', contact:'', phone:'', address:'', note:'' })
    loadAll()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const lowStock = items.filter(i => Number(i.quantity) <= Number(i.min_quantity || 0))
  const byPurpose = (Object.keys(PURPOSES) as Purpose[]).map(p => ({ purpose: p, items: items.filter(i => i.purpose === p) }))
  const totalValue = moves.filter(m => m.movement_type === 'purchase' && m.price).reduce((s,m) => s + Number(m.price || 0), 0)
  const shownItems = filterPurpose === 'all' ? items : items.filter(i => i.purpose === filterPurpose)

  const TabBtn = ({ k, icon, label }: { k: Tab; icon: string; label: string }) => (
    <button onClick={()=>setTab(k)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab===k?'bg-amber-600 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>{icon} {label}</button>
  )

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📦</div>
            <div>
              <h1 className="text-2xl font-bold">Няравын нөөц удирдлага</h1>
              <p className="text-sm opacity-90 mt-1">Хүлээн авалт · Тараалт · Үлдэгдэл · Нийлүүлэгч</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap overflow-x-auto">
          <TabBtn k="dashboard"  icon="📊" label="Хяналтын самбар" />
          <TabBtn k="items"      icon="📦" label="Материалын жагсаалт" />
          <TabBtn k="receive"    icon="⬇️" label="Хүлээн авалт" />
          <TabBtn k="distribute" icon="⬆️" label="Тараалт" />
          <TabBtn k="movements"  icon="🔄" label="Хөдөлгөөний түүх" />
          <TabBtn k="suppliers"  icon="🏭" label="Нийлүүлэгчид" />
        </div>

        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-slate-800">{items.length}</div><div className="text-xs text-slate-500 mt-1">📦 Материалын төрөл</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-red-600">{lowStock.length}</div><div className="text-xs text-slate-500 mt-1">⚠️ Үлдэгдэл багасаж буй</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-emerald-600">{moves.filter(m=>m.movement_type==='purchase').length}</div><div className="text-xs text-slate-500 mt-1">⬇️ Нийт хүлээн авалт</div></div>
              <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-3xl font-bold text-amber-600">{totalValue.toLocaleString('mn-MN')}₮</div><div className="text-xs text-slate-500 mt-1">💰 Худалдан авалтын дүн</div></div>
            </div>

            {lowStock.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-4">
                <div className="font-semibold text-red-800 mb-3">⚠️ Үлдэгдэл багасаж буй материалууд ({lowStock.length})</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {lowStock.map(it => (
                    <div key={it.id} className="bg-white rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-slate-800">{it.name}</div>
                        <div className="text-xs text-slate-500">Байгаа: {it.quantity} {it.unit} · Хамгийн бага: {it.min_quantity} {it.unit}</div>
                      </div>
                      <button onClick={()=>{setTab('receive'); setReceiveForm(f => ({...f, item_id: it.id}))}} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-medium">⬇️ Авах</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {byPurpose.filter(p => p.items.length > 0).map(({ purpose, items: pItems }) => {
                const cat = PURPOSES[purpose as Purpose]
                return (
                  <div key={purpose} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className={`inline-block px-3 py-1 rounded-full text-white text-xs font-semibold bg-gradient-to-r ${cat.color} mb-3`}>{cat.icon} {cat.label}</div>
                    <div className="space-y-1">
                      {pItems.slice(0, 8).map(it => (
                        <div key={it.id} className="flex justify-between text-sm py-1">
                          <span className="text-slate-700">{it.name}</span>
                          <span className={`font-semibold ${Number(it.quantity) <= Number(it.min_quantity)?'text-red-600':'text-slate-600'}`}>{it.quantity} {it.unit}</span>
                        </div>
                      ))}
                      {pItems.length > 8 && <div className="text-xs text-slate-400 mt-2">... бас {pItems.length - 8}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'items' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-3 flex gap-2 flex-wrap">
              <select value={filterPurpose} onChange={(e)=>setFilterPurpose(e.target.value as any)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="all">Бүх зориулалт</option>
                {(Object.keys(PURPOSES) as Purpose[]).map(p => <option key={p} value={p}>{PURPOSES[p].icon} {PURPOSES[p].label}</option>)}
              </select>
              <button onClick={()=>{setEditItem(null); setItemForm({ name:'', category:'', unit:'ш', min_quantity:0, location:'', purpose:'food', note:'' }); setShowItemForm(true)}} className="ml-auto bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-1.5 rounded-lg">+ Шинэ материал</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50"><tr>
                  <th className="p-2 text-left border-b border-slate-200">Нэр</th>
                  <th className="p-2 text-left border-b border-slate-200">Зориулалт</th>
                  <th className="p-2 text-center border-b border-slate-200">Үлдэгдэл</th>
                  <th className="p-2 text-center border-b border-slate-200">Хамг. бага</th>
                  <th className="p-2 text-left border-b border-slate-200">Байршил</th>
                  <th className="p-2 text-center border-b border-slate-200 w-32">Үйлдэл</th>
                </tr></thead>
                <tbody>
                  {shownItems.map(it => {
                    const low = Number(it.quantity) <= Number(it.min_quantity || 0)
                    const p = PURPOSES[it.purpose as Purpose]
                    return (
                      <tr key={it.id} className={`hover:bg-slate-50 ${low?'bg-red-50':''}`}>
                        <td className="p-2 border-b border-slate-100 font-medium">{it.name}</td>
                        <td className="p-2 border-b border-slate-100">{p ? <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{p.icon} {p.label}</span> : '—'}</td>
                        <td className="p-2 border-b border-slate-100 text-center"><span className={`font-semibold ${low?'text-red-600':'text-slate-700'}`}>{it.quantity} {it.unit}</span></td>
                        <td className="p-2 border-b border-slate-100 text-center text-xs text-slate-500">{it.min_quantity} {it.unit}</td>
                        <td className="p-2 border-b border-slate-100 text-xs text-slate-600">{it.location || ''}</td>
                        <td className="p-2 border-b border-slate-100 text-center">
                          <button onClick={()=>{setEditItem(it); setItemForm({ name:it.name, category:it.category||'', unit:it.unit, min_quantity:it.min_quantity, location:it.location||'', purpose:(it.purpose||'food') as Purpose, note:it.note||'' }); setShowItemForm(true)}} className="text-xs text-blue-600 hover:text-blue-800 mr-2">Засах</button>
                          <button onClick={()=>removeItem(it.id)} className="text-xs text-red-600 hover:text-red-800">Устгах</button>
                        </td>
                      </tr>
                    )
                  })}
                  {shownItems.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Материал алга</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'receive' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">⬇️ Нийлүүлэгчээс хүлээн авах</h2>
            <div className="space-y-3">
              <div><label className="block text-sm mb-1">Материал *</label>
                <select value={receiveForm.item_id} onChange={(e)=>setReceiveForm({...receiveForm, item_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="">— Сонго —</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Тоо ширхэг *</label><input type="number" min="0" step="0.01" value={receiveForm.quantity} onChange={(e)=>setReceiveForm({...receiveForm, quantity: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm mb-1">Огноо</label><input type="date" value={receiveForm.date} onChange={(e)=>setReceiveForm({...receiveForm, date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm mb-1">Нийлүүлэгч</label>
                <select value={receiveForm.supplier_id} onChange={(e)=>setReceiveForm({...receiveForm, supplier_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-2">
                  <option value="">— Бүртгэлээс сонго —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input value={receiveForm.supplier} onChange={(e)=>setReceiveForm({...receiveForm, supplier: e.target.value})} placeholder="эсвэл гараар бичих" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div><label className="block text-sm mb-1">Үнэ (₮)</label><input type="number" min="0" value={receiveForm.price} onChange={(e)=>setReceiveForm({...receiveForm, price: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm mb-1">Тэмдэглэл</label><textarea rows={2} value={receiveForm.note} onChange={(e)=>setReceiveForm({...receiveForm, note: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <button onClick={saveReceive} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 font-semibold">⬇️ Хүлээн авах</button>
            </div>
          </div>
        )}

        {tab === 'distribute' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">⬆️ Тараах</h2>
            <div className="space-y-3">
              <div><label className="block text-sm mb-1">Материал *</label>
                <select value={distForm.item_id} onChange={(e)=>setDistForm({...distForm, item_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="">— Сонго —</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} · Үлдэгдэл {i.quantity} {i.unit}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Тоо ширхэг *</label><input type="number" min="0" step="0.01" value={distForm.quantity} onChange={(e)=>setDistForm({...distForm, quantity: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm mb-1">Огноо</label><input type="date" value={distForm.date} onChange={(e)=>setDistForm({...distForm, date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div>
                <label className="block text-sm mb-1">Хэнд *</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button onClick={()=>setDistForm({...distForm, recipient_type:'cook', recipient_id:''})} className={`p-2 rounded-lg border-2 text-sm ${distForm.recipient_type==='cook'?'border-orange-500 bg-orange-50':'border-slate-200'}`}>👨‍🍳 Тогооч</button>
                  <button onClick={()=>setDistForm({...distForm, recipient_type:'staff'})} className={`p-2 rounded-lg border-2 text-sm ${distForm.recipient_type==='staff'?'border-emerald-500 bg-emerald-50':'border-slate-200'}`}>👤 Ажилтан</button>
                  <button onClick={()=>setDistForm({...distForm, recipient_type:'other', recipient_id:''})} className={`p-2 rounded-lg border-2 text-sm ${distForm.recipient_type==='other'?'border-slate-500 bg-slate-50':'border-slate-200'}`}>📝 Бусад</button>
                </div>
                {distForm.recipient_type === 'staff' && (
                  <select value={distForm.recipient_id} onChange={(e)=>setDistForm({...distForm, recipient_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    <option value="">— Ажилтан сонго —</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.last_name}.{s.first_name} {s.positions?.name?`(${s.positions.name})`:''}</option>)}
                  </select>
                )}
                {distForm.recipient_type === 'other' && (
                  <input value={distForm.recipient} onChange={(e)=>setDistForm({...distForm, recipient: e.target.value})} placeholder="Хүлээн авагчийн нэр" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                )}
              </div>
              <div><label className="block text-sm mb-1">Тэмдэглэл</label><textarea rows={2} value={distForm.note} onChange={(e)=>setDistForm({...distForm, note: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <button onClick={saveDist} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-semibold">⬆️ Тараах</button>
            </div>
          </div>
        )}

        {tab === 'movements' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="p-2 text-left border-b border-slate-200">Огноо</th>
                <th className="p-2 text-left border-b border-slate-200">Төрөл</th>
                <th className="p-2 text-left border-b border-slate-200">Материал</th>
                <th className="p-2 text-center border-b border-slate-200">Тоо</th>
                <th className="p-2 text-left border-b border-slate-200">Хэн/Хаана</th>
                <th className="p-2 text-left border-b border-slate-200">Тэмдэглэл</th>
              </tr></thead>
              <tbody>
                {moves.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-2 border-b border-slate-100 text-xs">{m.date}</td>
                    <td className="p-2 border-b border-slate-100">
                      {m.movement_type === 'purchase' && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">⬇️ Хүлээн авалт</span>}
                      {m.movement_type === 'distribute' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">⬆️ Тараалт</span>}
                      {m.movement_type === 'writeoff' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">🗑 Хасалт</span>}
                    </td>
                    <td className="p-2 border-b border-slate-100">{m.inventory_items?.name || '—'}</td>
                    <td className="p-2 border-b border-slate-100 text-center font-semibold">{m.quantity} {m.inventory_items?.unit || ''}</td>
                    <td className="p-2 border-b border-slate-100 text-xs">{m.movement_type === 'purchase' ? (m.supplier || '') : (m.recipient || '')}</td>
                    <td className="p-2 border-b border-slate-100 text-xs text-slate-600">{m.note || ''}</td>
                  </tr>
                ))}
                {moves.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Хөдөлгөөн байхгүй</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'suppliers' && (
          <>
            <div className="mb-3 flex justify-end">
              <button onClick={()=>setShowSupForm(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-1.5 rounded-lg">+ Шинэ нийлүүлэгч</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {suppliers.map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-lg font-semibold text-slate-800">🏭 {s.name}</div>
                  {s.contact && <div className="text-sm text-slate-600 mt-1">👤 {s.contact}</div>}
                  {s.phone && <div className="text-sm text-slate-600">📞 {s.phone}</div>}
                  {s.address && <div className="text-sm text-slate-600">📍 {s.address}</div>}
                </div>
              ))}
              {suppliers.length === 0 && <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 md:col-span-2">Нийлүүлэгч бүртгэгдээгүй</div>}
            </div>
          </>
        )}
      </div>

      {showItemForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold">{editItem?'Материал засах':'Шинэ материал'}</h2></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div><label className="block text-sm mb-1">Нэр *</label><input value={itemForm.name} onChange={(e)=>setItemForm({...itemForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm mb-1">Зориулалт</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PURPOSES) as Purpose[]).map(p => (
                    <button key={p} onClick={()=>setItemForm({...itemForm, purpose: p})} className={`p-2 rounded-lg border-2 text-sm ${itemForm.purpose===p?'border-amber-500 bg-amber-50':'border-slate-200'}`}>{PURPOSES[p].icon} {PURPOSES[p].label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Нэгж</label><input value={itemForm.unit} onChange={(e)=>setItemForm({...itemForm, unit: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="ш, кг, л..." /></div>
                <div><label className="block text-sm mb-1">Хамг. бага үлдэгдэл</label><input type="number" min="0" value={itemForm.min_quantity} onChange={(e)=>setItemForm({...itemForm, min_quantity: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm mb-1">Байршил</label><input value={itemForm.location} onChange={(e)=>setItemForm({...itemForm, location: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Агуулах 1, тавиур 3..." /></div>
              <div><label className="block text-sm mb-1">Тэмдэглэл</label><textarea rows={2} value={itemForm.note} onChange={(e)=>setItemForm({...itemForm, note: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-2">
              <button onClick={()=>setShowItemForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
              <button onClick={saveItem} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium">Хадгалах</button>
            </div>
          </div>
        </div>
      )}

      {showSupForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold">Шинэ нийлүүлэгч</h2></div>
            <div className="p-5 space-y-3">
              <div><label className="block text-sm mb-1">Нэр *</label><input value={supForm.name} onChange={(e)=>setSupForm({...supForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Аж ахуйн нэгжийн нэр" /></div>
              <div><label className="block text-sm mb-1">Холбогдох хүн</label><input value={supForm.contact} onChange={(e)=>setSupForm({...supForm, contact: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm mb-1">Утас</label><input value={supForm.phone} onChange={(e)=>setSupForm({...supForm, phone: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm mb-1">Хаяг</label><input value={supForm.address} onChange={(e)=>setSupForm({...supForm, address: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-2">
              <button onClick={()=>setShowSupForm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
              <button onClick={saveSupplier} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium">Хадгалах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
