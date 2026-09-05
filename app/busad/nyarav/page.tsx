'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Item = { id: string; name: string; category: string | null; unit: string; quantity: number; min_quantity: number; location: string | null; note: string | null; expiry_date: string | null; supplier: string | null }

const CATS = [
  { key: 'food',    label: '🍚 Хүнс' },
  { key: 'hygiene', label: '🧴 Ариун цэвэр' },
  { key: 'clean',   label: '🧹 Цэвэрлэгээ' },
  { key: 'equipment', label: '🔧 Тоног төхөөрөмж' },
  { key: 'office',  label: '📋 Оффис' },
  { key: 'toy',     label: '🧸 Тоглоом, хэрэгсэл' },
  { key: 'other',   label: '📦 Бусад' },
]
type Movement = {
  id: string
  item_id: string | null
  movement_type: 'purchase' | 'distribute' | 'adjust' | 'writeoff'
  quantity: number
  date: string
  recipient: string | null
  price: number | null
  supplier: string | null
  note: string | null
  file_url: string | null
  inventory_items?: { name: string } | null
  employees?: { last_name: string; first_name: string } | null
}

const MTYPES = {
  purchase:   { icon: '📥', label: 'Худалдан авалт', color: 'bg-emerald-100 text-emerald-700' },
  distribute: { icon: '📤', label: 'Хуваарилалт',     color: 'bg-blue-100 text-blue-700' },
  adjust:     { icon: '⚙️', label: 'Тохируулга',      color: 'bg-slate-100 text-slate-700' },
  writeoff:   { icon: '🗑', label: 'Хасалт',          color: 'bg-red-100 text-red-700' },
} as const

export default function NyaravPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const [tab, setTab] = useState<'items' | 'movements' | 'lowstock' | 'expiring'>('items')
  const [filterCat, setFilterCat] = useState<string>('')
  const [items, setItems] = useState<Item[]>([])
  const [movs, setMovs] = useState<Movement[]>([])
  const [showItem, setShowItem] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [itemForm, setItemForm] = useState({ name: '', category: '', unit: 'ш', quantity: '0', min_quantity: '0', location: '', note: '', expiry_date: '', supplier: '' })
  const [showMov, setShowMov] = useState(false)
  const [movForm, setMovForm] = useState({ item_id: '', movement_type: 'purchase' as Movement['movement_type'], quantity: '', date: new Date().toISOString().split('T')[0], recipient: '', price: '', supplier: '', note: '', file: null as File | null })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [i, m] = await Promise.all([
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('inventory_movements').select('*, inventory_items(name), employees:author_id(last_name, first_name)').order('date', { ascending: false }).limit(100),
    ])
    setItems((i.data as Item[]) || [])
    setMovs((m.data as unknown as Movement[]) || [])
  }
  useEffect(() => { load() }, [])

  async function saveItem() {
    const payload = {
      name: itemForm.name.trim(),
      category: itemForm.category || null,
      unit: itemForm.unit || 'ш',
      quantity: parseFloat(itemForm.quantity) || 0,
      min_quantity: parseFloat(itemForm.min_quantity) || 0,
      location: itemForm.location || null,
      note: itemForm.note || null,
      expiry_date: itemForm.expiry_date || null,
      supplier: itemForm.supplier || null,
    }
    const { error } = editingItem
      ? await supabase.from('inventory_items').update({...payload, updated_at: new Date().toISOString()}).eq('id', editingItem.id)
      : await supabase.from('inventory_items').insert(payload)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowItem(false); setEditingItem(null); load()
  }
  async function removeItem(i: Item) {
    if (!confirm(`"${i.name}"-г устгах уу?`)) return
    await supabase.from('inventory_items').delete().eq('id', i.id)
    load()
  }
  async function saveMov() {
    if (!me) return
    setSaving(true)
    let file_url: string | null = null
    if (movForm.file) {
      const path = `inv/${Date.now()}_${movForm.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, movForm.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const qty = parseFloat(movForm.quantity) || 0
    const { error } = await supabase.from('inventory_movements').insert({
      item_id: movForm.item_id,
      movement_type: movForm.movement_type,
      quantity: qty,
      date: movForm.date,
      recipient: movForm.recipient || null,
      price: movForm.price ? parseFloat(movForm.price) : null,
      supplier: movForm.supplier || null,
      note: movForm.note || null,
      file_url,
      author_id: me.id,
    })
    if (!error) {
      // Update stock
      const item = items.find((x) => x.id === movForm.item_id)
      if (item) {
        const delta = movForm.movement_type === 'purchase' || movForm.movement_type === 'adjust' ? qty : -qty
        await supabase.from('inventory_items').update({ quantity: item.quantity + delta }).eq('id', item.id)
      }
    }
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowMov(false)
    setMovForm({ item_id: '', movement_type: 'purchase', quantity: '', date: new Date().toISOString().split('T')[0], recipient: '', price: '', supplier: '', note: '', file: null })
    load()
  }

  const lowStock = items.filter((i) => i.quantity <= i.min_quantity && i.min_quantity > 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📦</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Няравын хэсэг</h1>
              <p className="text-sm opacity-90">Нөөц, худалдан авалт, хуваарилалт</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><div className="text-2xl font-bold">{items.length}</div><div className="text-xs opacity-80">Нэр төрөл</div></div>
              <div><div className="text-2xl font-bold">{lowStock.length}</div><div className="text-xs opacity-80">Дуусаж буй</div></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 items-center flex-wrap">
          <button onClick={() => setTab('items')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'items' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            📦 Нөөц ({items.length})
          </button>
          <button onClick={() => setTab('movements')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'movements' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            🔄 Хөдөлгөөн ({movs.length})
          </button>
          {(() => {
            const lo = items.filter((i) => i.min_quantity > 0 && i.quantity <= i.min_quantity).length
            const today = new Date().toISOString().split('T')[0]
            const soon = new Date(); soon.setDate(soon.getDate() + 30)
            const soonStr = soon.toISOString().split('T')[0]
            const exp = items.filter((i) => i.expiry_date && i.expiry_date <= soonStr && i.expiry_date >= today).length
            return (
              <>
                <button onClick={() => setTab('lowstock')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'lowstock' ? 'bg-red-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  ⚠️ Дуусаж буй ({lo})
                </button>
                <button onClick={() => setTab('expiring')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === 'expiring' ? 'bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  🗓 Хугацаа ({exp})
                </button>
              </>
            )
          })()}
          <div className="ml-auto flex gap-2">
            {tab === 'items' && <button onClick={() => { setEditingItem(null); setItemForm({ name: '', category: '', unit: 'ш', quantity: '0', min_quantity: '0', location: '', note: '', expiry_date: '', supplier: '' }); setShowItem(true) }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Нэр төрөл</button>}
            {tab === 'movements' && items.length > 0 && <button onClick={() => setShowMov(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Хөдөлгөөн бүртгэх</button>}
          </div>
        </div>

        {tab === 'items' && (
          items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">📦</div>
              <div>Хараахан нөөц оруулаагүй</div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold text-slate-600 uppercase">
                    <th className="px-4 py-3">Нэр</th>
                    <th className="px-4 py-3">Ангилал</th>
                    <th className="px-4 py-3">Нэгж</th>
                    <th className="px-4 py-3 text-right">Үлдэгдэл</th>
                    <th className="px-4 py-3">Байршил</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((i) => (
                    <tr key={i.id} className={i.quantity <= i.min_quantity && i.min_quantity > 0 ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 font-medium">{i.name}</td>
                      <td className="px-4 py-3 text-slate-600">{i.category || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{i.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {i.quantity}
                        {i.min_quantity > 0 && <span className="text-xs text-slate-400"> / мин {i.min_quantity}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{i.location || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => { setEditingItem(i); setItemForm({ name: i.name, category: i.category || '', unit: i.unit, quantity: String(i.quantity), min_quantity: String(i.min_quantity), location: i.location || '', note: i.note || '', expiry_date: i.expiry_date || '', supplier: i.supplier || '' }); setShowItem(true) }} className="text-blue-600 hover:text-blue-800 text-xs mr-3">Засах</button>
                        <button onClick={() => removeItem(i)} className="text-red-600 hover:text-red-800 text-xs">Устгах</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {(tab === 'lowstock' || tab === 'expiring') && (() => {
          const today = new Date().toISOString().split('T')[0]
          const soon = new Date(); soon.setDate(soon.getDate() + 30)
          const soonStr = soon.toISOString().split('T')[0]
          const list = tab === 'lowstock'
            ? items.filter((i) => i.min_quantity > 0 && i.quantity <= i.min_quantity)
            : items.filter((i) => i.expiry_date && i.expiry_date <= soonStr).sort((a, b) => (a.expiry_date! < b.expiry_date! ? -1 : 1))
          if (list.length === 0) return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">{tab === 'lowstock' ? '✅' : '🗓'}</div>
              <div>{tab === 'lowstock' ? 'Дуусаж буй нэр төрөл алга' : 'Хугацаа дуусах бүтээгдэхүүн алга'}</div>
            </div>
          )
          return (
            <div className="space-y-2">
              {list.map((i) => {
                const isExpired = i.expiry_date && i.expiry_date < today
                return (
                  <div key={i.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${isExpired ? 'border-red-300 bg-red-50' : tab === 'lowstock' ? 'border-red-200' : 'border-amber-200'}`}>
                    <div className="text-2xl">{tab === 'lowstock' ? '⚠️' : (isExpired ? '🚫' : '⏰')}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800">{i.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {i.category && <span className="mr-2">{CATS.find((c) => c.key === i.category)?.label || i.category}</span>}
                        {i.location && <span className="mr-2">📍 {i.location}</span>}
                        {i.supplier && <span className="mr-2">🏭 {i.supplier}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      {tab === 'lowstock' ? (
                        <>
                          <div className="text-lg font-bold text-red-700">{i.quantity} <span className="text-xs text-slate-400 font-normal">{i.unit}</span></div>
                          <div className="text-xs text-slate-500">Мин: {i.min_quantity}</div>
                        </>
                      ) : (
                        <>
                          <div className={`text-sm font-semibold ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>🗓 {i.expiry_date}</div>
                          <div className="text-xs text-slate-500">{isExpired ? 'Хугацаа хэтэрсэн' : 'Удахгүй дуусна'}</div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {tab === 'movements' && (
          movs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">🔄</div>
              <div>Хөдөлгөөн бүртгэгдээгүй</div>
            </div>
          ) : (
            <div className="space-y-2">
              {movs.map((m) => {
                const t = MTYPES[m.movement_type]
                return (
                  <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                    <div className="text-2xl">{t.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.color}`}>{t.label}</span>
                        <span className="text-xs text-slate-500">🗓 {m.date}</span>
                      </div>
                      <div className="font-medium text-slate-800">{m.inventory_items?.name || '?'} · {m.quantity}</div>
                      {m.recipient && <div className="text-xs text-slate-600 mt-0.5">Хүлээн авагч: {m.recipient}</div>}
                      {m.supplier && <div className="text-xs text-slate-600">Нийлүүлэгч: {m.supplier}</div>}
                      {m.price != null && <div className="text-xs text-slate-600">Үнэ: {m.price.toLocaleString()}₮</div>}
                      {m.note && <div className="text-xs text-slate-500 mt-1">{m.note}</div>}
                      {m.file_url && <a href={m.file_url} target="_blank" rel="noopener" className="inline-block mt-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded">📎 Баримт</a>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {showItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">{editingItem ? 'Засах' : 'Шинэ нэр төрөл'}</h2></div>
            <div className="p-5 space-y-3">
              <div><label className="block text-sm text-slate-700 mb-1">Нэр</label><input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Ангилал</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CATS.map((c) => (
                    <button key={c.key} type="button" onClick={() => setItemForm({ ...itemForm, category: c.key })}
                      className={`px-2 py-1 rounded-full text-xs ${itemForm.category === c.key ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Нэгж</label><input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Тоо</label><input type="number" step="0.01" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Мин үлдэгдэл</label><input type="number" step="0.01" value={itemForm.min_quantity} onChange={(e) => setItemForm({ ...itemForm, min_quantity: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Байршил</label><input value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">🗓 Хугацаа дуусах</label><input type="date" value={itemForm.expiry_date} onChange={(e) => setItemForm({ ...itemForm, expiry_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">🏭 Нийлүүлэгч</label><input value={itemForm.supplier} onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowItem(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={saveItem} disabled={!itemForm.name.trim()} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium">Хадгалах</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMov && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">Хөдөлгөөн бүртгэх</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Төрөл</label>
                  <select value={movForm.movement_type} onChange={(e) => setMovForm({ ...movForm, movement_type: e.target.value as Movement['movement_type'] })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {(Object.keys(MTYPES) as Movement['movement_type'][]).map((k) => (<option key={k} value={k}>{MTYPES[k].icon} {MTYPES[k].label}</option>))}
                  </select>
                </div>
                <div><label className="block text-sm text-slate-700 mb-1">Огноо</label><input type="date" value={movForm.date} onChange={(e) => setMovForm({ ...movForm, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Нэр төрөл</label>
                <select value={movForm.item_id} onChange={(e) => setMovForm({ ...movForm, item_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="">— Сонгох —</option>
                  {items.map((i) => (<option key={i.id} value={i.id}>{i.name} (үлд: {i.quantity} {i.unit})</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm text-slate-700 mb-1">Тоо</label><input type="number" step="0.01" value={movForm.quantity} onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm text-slate-700 mb-1">Үнэ (₮)</label><input type="number" value={movForm.price} onChange={(e) => setMovForm({ ...movForm, price: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              {movForm.movement_type === 'purchase' && <div><label className="block text-sm text-slate-700 mb-1">Нийлүүлэгч</label><input value={movForm.supplier} onChange={(e) => setMovForm({ ...movForm, supplier: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>}
              {movForm.movement_type === 'distribute' && <div><label className="block text-sm text-slate-700 mb-1">Хүлээн авагч</label><input value={movForm.recipient} onChange={(e) => setMovForm({ ...movForm, recipient: e.target.value })} placeholder="Бүлэг, багш..." className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>}
              <div><label className="block text-sm text-slate-700 mb-1">Тэмдэглэл</label><textarea rows={2} value={movForm.note} onChange={(e) => setMovForm({ ...movForm, note: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">📎 Баримт</label><input type="file" accept="image/*,.pdf" onChange={(e) => setMovForm({ ...movForm, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowMov(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={saveMov} disabled={saving || !movForm.item_id || !movForm.quantity} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{saving ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
