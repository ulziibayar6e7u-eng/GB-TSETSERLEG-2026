'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Menu = {
  id: string
  year: number
  week_num: number
  age_group: '2_3' | '4_5' | 'other' | 'all'
  monday_date: string | null
  notes: string | null
  file_url: string | null
  created_at: string
  employees?: { last_name: string; first_name: string } | null
}

type Feedback = { by_id?: string; by_name: string; by_role: string; rating: number; comment: string; at: string }
type Tasting = {
  id: string
  date: string
  meal_name: string
  meal_type: string | null
  age_group: '2_3' | '4_5' | 'other' | 'all'
  photo_url: string | null
  note: string | null
  feedbacks: Feedback[]
  created_at: string
  employees?: { last_name: string; first_name: string } | null
}

const AGE_LABEL = { '2_3': '👶 2-3 нас', '4_5': '🧒 4-5 нас', 'other': '🐰 Бусад', 'all': '🍽 Бүх нас' }
const MEAL_TYPES = [
  { key: 'breakfast', label: '🥣 Өглөө' },
  { key: 'lunch',     label: '🍲 Өдөр' },
  { key: 'snack',     label: '🥛 Оройн' },
  { key: 'dinner',    label: '🍚 Хоол' },
]

function currentWeek() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = (now.getTime() - start.getTime()) / 86400000
  return Math.ceil((diff + start.getDay() + 1) / 7)
}

export default function TogoochPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const [tab, setTab] = useState<'menu' | 'tasting'>('menu')
  const [menus, setMenus] = useState<Menu[]>([])
  const [tastings, setTastings] = useState<Tasting[]>([])
  const [loading, setLoading] = useState(true)

  // Menu form
  const [showMenu, setShowMenu] = useState(false)
  const [menuForm, setMenuForm] = useState({ year: new Date().getFullYear(), week_num: currentWeek(), age_group: 'all' as Menu['age_group'], monday_date: '', notes: '', file: null as File | null })
  const [savingMenu, setSavingMenu] = useState(false)

  // Tasting form
  const [showTasting, setShowTasting] = useState(false)
  const [tastingForm, setTastingForm] = useState({ date: new Date().toISOString().split('T')[0], meal_name: '', meal_type: 'lunch', age_group: 'all' as Tasting['age_group'], note: '', file: null as File | null })
  const [savingTasting, setSavingTasting] = useState(false)

  // Feedback form
  const [feedbackFor, setFeedbackFor] = useState<Tasting | null>(null)
  const [fbForm, setFbForm] = useState({ rating: 5, comment: '' })

  async function load() {
    setLoading(true)
    const [m, t] = await Promise.all([
      supabase.from('weekly_menus').select('*, employees:author_id(last_name, first_name)').order('year', { ascending: false }).order('week_num', { ascending: false }).order('age_group').limit(60),
      supabase.from('food_tastings').select('*, employees:author_id(last_name, first_name)').order('date', { ascending: false }).limit(50),
    ])
    setMenus((m.data as unknown as Menu[]) || [])
    setTastings((t.data as unknown as Tasting[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveMenu() {
    if (!me || !menuForm.file) { alert('Файл заавал сонго'); return }
    setSavingMenu(true)
    const path = `menus/${Date.now()}_${menuForm.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const { error: upErr } = await supabase.storage.from('org-plans').upload(path, menuForm.file)
    if (upErr) { alert('Файл алдаа: ' + upErr.message); setSavingMenu(false); return }
    const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
    const { error } = await supabase.from('weekly_menus').upsert({
      year: menuForm.year, week_num: menuForm.week_num, age_group: menuForm.age_group,
      monday_date: menuForm.monday_date || null,
      notes: menuForm.notes || null,
      file_url: pub?.publicUrl || null,
      author_id: me.id,
    }, { onConflict: 'year,week_num,age_group' })
    setSavingMenu(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowMenu(false)
    setMenuForm({ year: new Date().getFullYear(), week_num: currentWeek(), age_group: 'all', monday_date: '', notes: '', file: null })
    load()
  }
  async function removeMenu(m: Menu) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('weekly_menus').delete().eq('id', m.id)
    load()
  }

  async function saveTasting() {
    if (!me) return
    setSavingTasting(true)
    let photo_url: string | null = null
    if (tastingForm.file) {
      const path = `tastings/${Date.now()}_${tastingForm.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, tastingForm.file)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setSavingTasting(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      photo_url = pub?.publicUrl || null
    }
    const { error } = await supabase.from('food_tastings').insert({
      date: tastingForm.date, meal_name: tastingForm.meal_name.trim(),
      meal_type: tastingForm.meal_type, age_group: tastingForm.age_group,
      photo_url, note: tastingForm.note || null,
      author_id: me.id,
    })
    setSavingTasting(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    setShowTasting(false)
    setTastingForm({ date: new Date().toISOString().split('T')[0], meal_name: '', meal_type: 'lunch', age_group: 'all', note: '', file: null })
    load()
  }
  async function removeTasting(t: Tasting) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('food_tastings').delete().eq('id', t.id)
    load()
  }

  async function submitFeedback() {
    if (!me || !feedbackFor || !fbForm.comment.trim()) return
    const roleLabel = me.positions?.name || me.role
    const newFb: Feedback = {
      by_id: me.id,
      by_name: `${me.last_name}.${me.first_name}`,
      by_role: roleLabel,
      rating: fbForm.rating,
      comment: fbForm.comment.trim(),
      at: new Date().toISOString(),
    }
    const updated = [...(feedbackFor.feedbacks || []), newFb]
    const { error } = await supabase.from('food_tastings').update({ feedbacks: updated }).eq('id', feedbackFor.id)
    if (error) { alert('Алдаа: ' + error.message); return }
    setFeedbackFor(null)
    setFbForm({ rating: 5, comment: '' })
    load()
  }

  function avgRating(fbs: Feedback[]) {
    if (!fbs || fbs.length === 0) return null
    const sum = fbs.reduce((a, b) => a + (b.rating || 0), 0)
    return (sum / fbs.length).toFixed(1)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">👨‍🍳</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Тогоочийн хэсэг</h1>
              <p className="text-sm opacity-90">Хоолны цэс, амталгаа, сэтгэгдэл</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 items-center flex-wrap">
          <button onClick={() => setTab('menu')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'menu' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            🍽 Хоолны цэс ({menus.length})
          </button>
          <button onClick={() => setTab('tasting')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'tasting' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            ⭐ Хоолны амталгаа ({tastings.length})
          </button>
          <div className="ml-auto">
            {tab === 'menu' && <button onClick={() => setShowMenu(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Цэс оруулах</button>}
            {tab === 'tasting' && <button onClick={() => setShowTasting(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Амталгаа</button>}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : tab === 'menu' ? (
          menus.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">🍽</div>
              <div>Хараахан хоолны цэс оруулаагүй</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menus.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-b border-orange-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-orange-700">{AGE_LABEL[m.age_group]}</div>
                      <button onClick={() => removeMenu(m)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                    </div>
                    <div className="font-bold text-slate-800">{m.year} · {m.week_num}-р 7 хоног</div>
                    {m.monday_date && <div className="text-xs text-slate-500 mt-1">Даваа: {m.monday_date}</div>}
                  </div>
                  <div className="p-4">
                    {m.file_url ? (
                      <a href={m.file_url} target="_blank" rel="noopener" className="block bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-lg text-center font-medium text-sm">
                        📎 Цэсний файл нээх
                      </a>
                    ) : (
                      <div className="text-sm text-slate-400 text-center py-3">Файл байхгүй</div>
                    )}
                    {m.notes && <div className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{m.notes}</div>}
                    {m.employees && <div className="text-xs text-slate-400 mt-2">— {m.employees.last_name}.{m.employees.first_name}</div>}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          tastings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">⭐</div>
              <div>Хоолны амталгаа хараахан бүртгээгүй</div>
            </div>
          ) : (
            <div className="space-y-3">
              {tastings.map((t) => {
                const avg = avgRating(t.feedbacks || [])
                return (
                  <div key={t.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {t.photo_url && (
                          <a href={t.photo_url} target="_blank" rel="noopener" className="block w-24 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                            <img src={t.photo_url} alt={t.meal_name} className="w-full h-full object-cover" />
                          </a>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-slate-500">🗓 {t.date}</span>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{AGE_LABEL[t.age_group]}</span>
                            <span className="text-xs text-slate-500">{MEAL_TYPES.find(m => m.key === t.meal_type)?.label}</span>
                            {avg && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">⭐ {avg} ({t.feedbacks.length})</span>}
                          </div>
                          <h3 className="font-semibold text-slate-800 text-lg">{t.meal_name}</h3>
                          {t.note && <div className="text-sm text-slate-600 mt-1">{t.note}</div>}
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <button onClick={() => { setFeedbackFor(t); setFbForm({ rating: 5, comment: '' }) }} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium">
                              + Сэтгэгдэл өгөх
                            </button>
                            <button onClick={() => removeTasting(t)} className="text-xs text-red-600 hover:text-red-800 px-2">Устгах</button>
                          </div>
                        </div>
                      </div>
                      {t.feedbacks && t.feedbacks.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                          {t.feedbacks.map((f, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm font-medium text-slate-800">
                                  {f.by_name}
                                  <span className="text-xs text-slate-500 font-normal ml-2">· {f.by_role}</span>
                                </div>
                                <div className="text-sm">{'⭐'.repeat(f.rating)}</div>
                              </div>
                              <div className="text-sm text-slate-700 whitespace-pre-wrap">{f.comment}</div>
                              <div className="text-xs text-slate-400 mt-1">{new Date(f.at).toLocaleString('mn-MN')}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Menu upload modal */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">Шинэ хоолны цэс</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-xs text-slate-700 mb-1">Он</label><input type="number" value={menuForm.year} onChange={(e) => setMenuForm({ ...menuForm, year: parseInt(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-xs text-slate-700 mb-1">7 хоног</label><input type="number" value={menuForm.week_num} onChange={(e) => setMenuForm({ ...menuForm, week_num: parseInt(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-xs text-slate-700 mb-1">Даваа</label><input type="date" value={menuForm.monday_date} onChange={(e) => setMenuForm({ ...menuForm, monday_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Насны төрөл</label>
                <select value={menuForm.age_group} onChange={(e) => setMenuForm({ ...menuForm, age_group: e.target.value as Menu['age_group'] })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="2_3">👶 2-3 нас</option>
                  <option value="4_5">🧒 4-5 нас</option>
                  <option value="other">🐰 Бусад</option>
                  <option value="all">🍽 Бүх нас</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">📎 Цэсний файл (заавал)</label>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.xlsx" onChange={(e) => setMenuForm({ ...menuForm, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                <div className="text-xs text-slate-500 mt-1">Word, Excel, PDF, зураг зэрэг</div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Тэмдэглэл</label><textarea rows={2} value={menuForm.notes} onChange={(e) => setMenuForm({ ...menuForm, notes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowMenu(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={saveMenu} disabled={savingMenu || !menuForm.file} className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{savingMenu ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasting create modal */}
      {showTasting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-800">Хоолны амталгаа нэмэх</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs text-slate-700 mb-1">Огноо</label><input type="date" value={tastingForm.date} onChange={(e) => setTastingForm({ ...tastingForm, date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
                <div><label className="block text-xs text-slate-700 mb-1">Хоолны төрөл</label>
                  <select value={tastingForm.meal_type} onChange={(e) => setTastingForm({ ...tastingForm, meal_type: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                    {MEAL_TYPES.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">Хоолны нэр</label><input value={tastingForm.meal_name} onChange={(e) => setTastingForm({ ...tastingForm, meal_name: e.target.value })} placeholder="Жш: Бууз, гурилтай шөл" className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Насны төрөл</label>
                <select value={tastingForm.age_group} onChange={(e) => setTastingForm({ ...tastingForm, age_group: e.target.value as Tasting['age_group'] })} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="2_3">👶 2-3 нас</option>
                  <option value="4_5">🧒 4-5 нас</option>
                  <option value="other">🐰 Бусад</option>
                  <option value="all">🍽 Бүх нас</option>
                </select>
              </div>
              <div><label className="block text-sm text-slate-700 mb-1">📷 Зураг</label><input type="file" accept="image/*" onChange={(e) => setTastingForm({ ...tastingForm, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm text-slate-700 mb-1">Тайлбар</label><textarea rows={2} value={tastingForm.note} onChange={(e) => setTastingForm({ ...tastingForm, note: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowTasting(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={saveTasting} disabled={savingTasting || !tastingForm.meal_name.trim()} className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{savingTasting ? '...' : 'Хадгалах'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {feedbackFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Сэтгэгдэл өгөх</h2>
              <p className="text-sm text-slate-500 mt-1">{feedbackFor.meal_name} · {feedbackFor.date}</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Үнэлгээ</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setFbForm({ ...fbForm, rating: n })} className={`text-3xl transition ${n <= fbForm.rating ? 'grayscale-0' : 'grayscale opacity-40'}`}>⭐</button>
                  ))}
                  <span className="ml-2 self-center text-sm font-semibold text-slate-700">{fbForm.rating}/5</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Сэтгэгдэл</label>
                <textarea rows={4} value={fbForm.comment} onChange={(e) => setFbForm({ ...fbForm, comment: e.target.value })} placeholder="Хоолны амт, чанар, сайжруулах санал..." className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="text-xs text-slate-500">
                Таны нэрээр — <b>{me?.last_name}.{me?.first_name}</b> ({me?.positions?.name || me?.role})
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setFeedbackFor(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Болих</button>
                <button onClick={submitFeedback} disabled={!fbForm.comment.trim()} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium">💾 Илгээх</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
