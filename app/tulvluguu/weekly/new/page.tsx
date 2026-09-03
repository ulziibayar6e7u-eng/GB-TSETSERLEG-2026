'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'
import WeeklyEditor, { type PlanData, EMPTY_PLAN } from '@/components/WeeklyEditor'
import GuideViewer from '@/components/GuideViewer'

type Group = { id: number; code: string; name: string; icon: string; color: string }
type Template = {
  theme: string | null
  method: string | null
  new_words: string[]
  outcomes: { code: string; type: string; text: string }[]
  cells: Record<string, Record<string, string>>
}

export default function NewWeeklyPlanPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState<number | null>(null)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [weekNum, setWeekNum] = useState(1)
  const [plan, setPlan] = useState<PlanData>(EMPTY_PLAN)
  const [saving, setSaving] = useState(false)
  const [templateStatus, setTemplateStatus] = useState<'idle' | 'loaded' | 'not_found'>('idle')
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: g } = await supabase.from('groups').select('*').order('id')
      setGroups((g as Group[]) || [])
      if (me?.groups[0]) setGroupId(me.groups[0].id)
    })()
  }, [me, supabase])

  async function loadTemplate() {
    if (!groupId) return
    const g = groups.find((x) => x.id === groupId)
    if (!g) return
    const { data } = await supabase
      .from('weekly_plan_templates')
      .select('*')
      .eq('group_code', g.code)
      .eq('month', month)
      .eq('week_num', weekNum)
      .maybeSingle()
    if (!data) {
      setTemplateStatus('not_found')
      return
    }
    const t = data as Template
    setPlan({
      theme: t.theme || '',
      method: t.method || '',
      new_words: t.new_words || [],
      outcomes: t.outcomes || [],
      cells: t.cells || {},
    })
    setTemplateStatus('loaded')
  }

  async function save(submit: boolean) {
    if (!me || !groupId) return
    setSaving(true)
    const { data, error } = await supabase.from('weekly_plans').insert({
      group_id: groupId,
      author_id: me.id,
      year, month, week_num: weekNum,
      theme: plan.theme || null,
      method: plan.method || null,
      new_words: plan.new_words,
      outcomes: plan.outcomes,
      cells: plan.cells,
      status: submit ? 'submitted' : 'draft',
    }).select('id').single()
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    router.push(`/tulvluguu/weekly/${data.id}`)
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/tulvluguu/weekly" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Буцах</Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h1 className="text-xl font-bold text-slate-800 mb-4">Шинэ 7 хоногийн төлөвлөгөө</h1>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">7 хоног</label>
              <select value={weekNum} onChange={(e) => setWeekNum(parseInt(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                {[1,2,3,4,5].map((w)=>(<option key={w} value={w}>{w}-р долоо хоног</option>))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              disabled={!groupId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              📖 Гарын авлагаас харах
            </button>
            <button
              type="button"
              onClick={loadTemplate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
            >
              🎁 Загварыг ачаалах
            </button>
          </div>
          {templateStatus === 'loaded' && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700">
              ✅ Загвар ачаалагдлаа. Нүд бүрийг засварлаж хадгална уу.
            </div>
          )}
          {templateStatus === 'not_found' && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              ⚠️ Энэ бүлэг · сар · долоо хоногт загвар бэлдэгдээгүй байна. Гар аргаар нүд бүрийг бөглөнө үү. Хадгалахад загвар болно.
            </div>
          )}
        </div>

        <WeeklyEditor value={plan} onChange={setPlan} readOnly={false} />

        {showGuide && groupId && (
          <GuideViewer
            ageGroup={groups.find((g) => g.id === groupId)?.code || ''}
            month={month}
            onClose={() => setShowGuide(false)}
          />
        )}

        <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4 flex gap-2 justify-end sticky bottom-0">
          <Link href="/tulvluguu/weekly" className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
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
