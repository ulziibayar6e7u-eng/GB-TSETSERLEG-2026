'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

const WEEKLY_ITEMS = [
  'Ангийн дрөж хивс шал угаах',
  'Анги, унтлагын өрөө, ширээ сандал цэвэрлэх',
  'Хана, цонх, хаалга, паар цэвэрлэх',
  'Тоглоом, тоглоомын тавиур цэвэрлэгээ',
  'ОО, сойзны гэр, сам',
  'Шүдний өрөө',
  'Ариун цэврийн өрөө, суултуур',
]
const WEEK_DAYS = ['Даваа','Мягмар','Лхагва','Пүрэв','Баасан']

const DAILY_ITEMS = [
  'Агааржуулалт',
  'Өдөр бүрийн чийгтэй цэвэрлэгээний давтамж',
  'Ангийн хэрэглэгдэхүүний эмх цэгц цэвэрлэгээ',
  'Хивс, дрөжны цэвэрлэгээ',
  'Тоглоом угаасан эсэх',
  'Шалны цэвэрлэгээ ариун эсэх',
  'Хана хаалганы ариун цэвэр',
  'Цонхны тавцан, паарны цэвэрлэгээ',
  'Ширээ, тавцангуудын ариун цэвэр эмх цэгц',
  'Хүүхэд солих хэсгийн ариун цэвэр, эмх цэгц',
  'Хөнжил, дэвсгэрийн ариун цэвэр эмх цэгц',
  'ОО-н өрөө ариун цэвэр',
  'Угаалтуурын өрөөний ариун цэвэр эмх цэгц',
  'Өгсөн үүрэг даалгавар',
]

function mondayOf(d: Date) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x
}
function ymd(d: Date) { return d.toISOString().slice(0,10) }
function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate() }

type Row = {
  id: string
  kind: 'weekly'|'daily'
  period_start: string
  group_id: number|null
  items: Record<string, Record<string, boolean>>
  doctor_note: string|null
  status: string
  reviewed_at: string|null
}

export default function TuslahCleaningPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [kind, setKind] = useState<'weekly'|'daily'>('weekly')
  const today = new Date()
  const [weekStart, setWeekStart] = useState(ymd(mondayOf(today)))
  const [month, setMonth] = useState(today.toISOString().slice(0,7))
  const [groupId, setGroupId] = useState<number|null>(null)
  const [items, setItems] = useState<Record<string, Record<string, boolean>>>({})
  const [row, setRow] = useState<Row|null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (me && !groupId && me.groups[0]) setGroupId(me.groups[0].id) }, [me, groupId])

  const periodStart = kind === 'weekly' ? weekStart : `${month}-01`

  async function load() {
    if (!groupId) return
    const { data } = await supabase.from('cleaning_checklist').select('*').eq('kind', kind).eq('period_start', periodStart).eq('group_id', groupId).maybeSingle()
    if (data) { setRow(data as Row); setItems((data as Row).items || {}) }
    else { setRow(null); setItems({}) }
  }
  useEffect(() => { load() }, [kind, periodStart, groupId])

  const cols = kind === 'weekly' ? WEEK_DAYS : Array.from({length: daysInMonth(Number(month.slice(0,4)), Number(month.slice(5,7))-1)}, (_,i)=>String(i+1))
  const rows = kind === 'weekly' ? WEEKLY_ITEMS : DAILY_ITEMS

  function toggle(r: string, c: string) {
    const cur = items[r]?.[c] || false
    setItems({ ...items, [r]: { ...(items[r]||{}), [c]: !cur } })
  }

  async function save(submit: boolean) {
    if (!me || !groupId) return
    setSaving(true)
    const payload = {
      kind, period_start: periodStart, group_id: groupId, author_id: me.id,
      items, status: submit ? 'submitted' : 'draft', updated_at: new Date().toISOString()
    }
    const { error } = row
      ? await supabase.from('cleaning_checklist').update(payload).eq('id', row.id)
      : await supabase.from('cleaning_checklist').insert(payload)
    setSaving(false)
    if (error) { alert('Алдаа: '+error.message); return }
    load()
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🧹</div>
            <div>
              <h1 className="text-2xl font-bold">Цэвэрлэгээ хяналтын хуудас</h1>
              <p className="text-sm opacity-90 mt-1">Их цэвэрлэгээ (7 хоног) · Өдөр тутмын цэвэрлэгээ · Эмч хянадаг</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex gap-2 flex-wrap items-center">
          <button onClick={() => setKind('weekly')} className={`px-3 py-2 rounded-lg text-sm font-medium ${kind==='weekly'?'bg-teal-600 text-white':'bg-slate-100 text-slate-700'}`}>📅 Их цэвэрлэгээ (7 хоног)</button>
          <button onClick={() => setKind('daily')} className={`px-3 py-2 rounded-lg text-sm font-medium ${kind==='daily'?'bg-teal-600 text-white':'bg-slate-100 text-slate-700'}`}>🗓️ Өдөр тутмын цэвэрлэгээ</button>
          <div className="ml-auto flex gap-2">
            {kind==='weekly' ? (
              <input type="date" value={weekStart} onChange={(e)=>setWeekStart(ymd(mondayOf(new Date(e.target.value))))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
            ) : (
              <input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
            )}
            {me.groups.length > 0 && (
              <select value={groupId||''} onChange={(e)=>setGroupId(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                {me.groups.map(g=><option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {row?.status === 'approved' && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3 text-sm text-emerald-800">✅ Эмч баталсан{row.doctor_note ? ` · ${row.doctor_note}` : ''}</div>}
        {row?.status === 'returned' && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm text-red-800">↩️ Буцаагдсан: {row.doctor_note}</div>}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left font-medium text-slate-700 border-b border-slate-200 w-10">№</th>
                <th className="p-2 text-left font-medium text-slate-700 border-b border-slate-200">Хийгдэх ажил</th>
                {cols.map(c=><th key={c} className="p-2 text-center font-medium text-slate-700 border-b border-slate-200 min-w-[48px]">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r} className="hover:bg-slate-50">
                  <td className="p-2 border-b border-slate-100 text-slate-500">{i+1}</td>
                  <td className="p-2 border-b border-slate-100">{r}</td>
                  {cols.map(c=>(
                    <td key={c} className="p-1 border-b border-slate-100 text-center">
                      <button onClick={()=>toggle(r,c)} disabled={row?.status==='approved'} className={`w-8 h-8 rounded ${items[r]?.[c]?'bg-emerald-500 text-white':'bg-slate-100 hover:bg-slate-200'}`}>{items[r]?.[c]?'✓':''}</button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={()=>save(false)} disabled={saving||row?.status==='approved'} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium">💾 Хадгалах</button>
          <button onClick={()=>save(true)} disabled={saving||row?.status==='approved'} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">📤 Эмчээр хянуулах</button>
          {row && <span className="ml-auto text-xs text-slate-500 self-center">Төлөв: {row.status}</span>}
        </div>
      </div>
    </div>
  )
}
