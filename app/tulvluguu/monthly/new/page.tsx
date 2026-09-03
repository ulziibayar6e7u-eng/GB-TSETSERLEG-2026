'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'
import MonthlyEditor, { type MonthlyData, EMPTY_MONTHLY } from '@/components/MonthlyEditor'

type Group = { id: number; code: string; name: string; icon: string; color: string }

export default function NewMonthlyPlanPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState<number | null>(null)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [plan, setPlan] = useState<MonthlyData>(EMPTY_MONTHLY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: g } = await supabase.from('groups').select('*').order('id')
      setGroups((g as Group[]) || [])
      if (me?.groups[0]) setGroupId(me.groups[0].id)
    })()
  }, [me, supabase])

  async function save(submit: boolean) {
    if (!me || !groupId) return
    setSaving(true)
    const { data, error } = await supabase.from('monthly_plans').insert({
      group_id: groupId,
      author_id: me.id,
      year, month,
      theme: plan.theme || null,
      method: plan.method || null,
      goals: plan.goals || null,
      week_themes: plan.week_themes,
      outcomes: plan.outcomes,
      activities: plan.activities,
      content: plan.content || null,
      status: submit ? 'submitted' : 'draft',
    }).select('id').single()
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    router.push(`/tulvluguu/monthly/${data.id}`)
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/tulvluguu/monthly" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Буцах</Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h1 className="text-xl font-bold text-slate-800 mb-4">Шинэ сарын төлөвлөгөө</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Бүлэг</label>
              <select
                value={groupId ?? ''}
                onChange={(e) => setGroupId(parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {groups.map((g) => (<option key={g.id} value={g.id}>{g.icon} {g.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Он</label>
              <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Сар</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                {Array.from({length:12},(_,i)=>i+1).map((m)=>(<option key={m} value={m}>{m}-р сар</option>))}
              </select>
            </div>
          </div>
        </div>

        <MonthlyEditor value={plan} onChange={setPlan} readOnly={false} />

        <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4 flex gap-2 justify-end sticky bottom-0">
          <Link href="/tulvluguu/monthly" className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
            Болих
          </Link>
          <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium disabled:opacity-50">
            💾 Ноорог хадгалах
          </button>
          <button onClick={() => save(true)} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
            📤 Батлуулахаар илгээх
          </button>
        </div>
      </div>
    </div>
  )
}
