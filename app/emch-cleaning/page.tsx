'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

const WEEKLY_ITEMS = ['Ангийн дрөж хивс шал угаах','Анги, унтлагын өрөө, ширээ сандал цэвэрлэх','Хана, цонх, хаалга, паар цэвэрлэх','Тоглоом, тоглоомын тавиур цэвэрлэгээ','ОО, сойзны гэр, сам','Шүдний өрөө','Ариун цэврийн өрөө, суултуур']
const WEEK_DAYS = ['Даваа','Мягмар','Лхагва','Пүрэв','Баасан']
const DAILY_ITEMS = ['Агааржуулалт','Өдөр бүрийн чийгтэй цэвэрлэгээний давтамж','Ангийн хэрэглэгдэхүүний эмх цэгц цэвэрлэгээ','Хивс, дрөжны цэвэрлэгээ','Тоглоом угаасан эсэх','Шалны цэвэрлэгээ ариун эсэх','Хана хаалганы ариун цэвэр','Цонхны тавцан, паарны цэвэрлэгээ','Ширээ, тавцангуудын ариун цэвэр эмх цэгц','Хүүхэд солих хэсгийн ариун цэвэр, эмх цэгц','Хөнжил, дэвсгэрийн ариун цэвэр эмх цэгц','ОО-н өрөө ариун цэвэр','Угаалтуурын өрөөний ариун цэвэр эмх цэгц','Өгсөн үүрэг даалгавар']

type Row = {
  id: string; kind: 'weekly'|'daily'; period_start: string; group_id: number
  items: Record<string, Record<string, boolean>>; doctor_note: string|null; status: string
  employees?: { last_name: string; first_name: string }|null
  groups?: { name: string; icon: string }|null
}

function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate() }

export default function EmchCleaningPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [tab, setTab] = useState<'weekly'|'daily'>('weekly')
  const [rows, setRows] = useState<Row[]>([])
  const [note, setNote] = useState<Record<string,string>>({})
  const [openId, setOpenId] = useState<string|null>(null)

  async function load() {
    const { data } = await supabase.from('cleaning_checklist').select('*, employees:author_id(last_name, first_name), groups(name, icon)').eq('kind', tab).order('period_start', { ascending: false }).limit(60)
    setRows((data as unknown as Row[]) || [])
  }
  useEffect(() => { load() }, [tab])

  async function decide(r: Row, ok: boolean) {
    const n = note[r.id] || ''
    if (!ok && !n.trim()) { alert('Буцаах шалтгаан оруулна уу'); return }
    if (!me) return
    await supabase.from('cleaning_checklist').update({ status: ok?'approved':'returned', doctor_note: n||null, doctor_id: me.id, reviewed_at: new Date().toISOString() }).eq('id', r.id)
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const cols = (r: Row) => tab==='weekly' ? WEEK_DAYS : Array.from({length: daysInMonth(Number(r.period_start.slice(0,4)), Number(r.period_start.slice(5,7))-1)}, (_,i)=>String(i+1))
  const items = tab==='weekly' ? WEEKLY_ITEMS : DAILY_ITEMS

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🩺</div>
            <div>
              <h1 className="text-2xl font-bold">Цэвэрлэгээ хяналт (эмч)</h1>
              <p className="text-sm opacity-90 mt-1">Туслах багш нарын цэвэрлэгээний хяналтын хуудсыг батламжлах</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap">
          <button onClick={()=>setTab('weekly')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab==='weekly'?'bg-rose-600 text-white':'bg-slate-100 text-slate-700'}`}>📅 Их цэвэрлэгээ</button>
          <button onClick={()=>setTab('daily')} className={`px-3 py-2 rounded-lg text-sm font-medium ${tab==='daily'?'bg-rose-600 text-white':'bg-slate-100 text-slate-700'}`}>🗓️ Өдөр тутам</button>
        </div>

        <div className="space-y-3">
          {rows.length === 0 && <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">Бүртгэл байхгүй</div>}
          {rows.map(r => {
            const badge = r.status==='approved'?'bg-emerald-100 text-emerald-700':r.status==='returned'?'bg-red-100 text-red-700':r.status==='submitted'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-700'
            const open = openId === r.id
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200">
                <div className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>{r.status}</span>
                      <span className="text-sm font-semibold">{r.groups?.icon} {r.groups?.name}</span>
                      <span className="text-xs text-slate-500">· {r.period_start}</span>
                      {r.employees && <span className="text-xs text-slate-500">· {r.employees.last_name}.{r.employees.first_name}</span>}
                    </div>
                  </div>
                  <button onClick={()=>setOpenId(open?null:r.id)} className="text-sm text-blue-600 hover:text-blue-800">{open?'Хаах':'Дэлгэрэнгүй →'}</button>
                </div>
                {open && (
                  <div className="border-t border-slate-200 p-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="p-2 text-left border-b border-slate-200">Хийгдэх ажил</th>
                            {cols(r).map(c=><th key={c} className="p-2 text-center border-b border-slate-200 min-w-[36px]">{c}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(it=>(
                            <tr key={it}>
                              <td className="p-2 border-b border-slate-100">{it}</td>
                              {cols(r).map(c=>(
                                <td key={c} className="p-1 border-b border-slate-100 text-center">
                                  {r.items?.[it]?.[c] ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">·</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {r.status !== 'approved' && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <input value={note[r.id]||''} onChange={(e)=>setNote({...note, [r.id]: e.target.value})} placeholder="Тэмдэглэл / буцаах шалтгаан" className="flex-1 min-w-[240px] border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
                        <button onClick={()=>decide(r, true)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">✅ Батлах</button>
                        <button onClick={()=>decide(r, false)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">↩️ Буцаах</button>
                      </div>
                    )}
                    {r.doctor_note && <div className="mt-2 text-sm text-slate-600">📝 {r.doctor_note}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
