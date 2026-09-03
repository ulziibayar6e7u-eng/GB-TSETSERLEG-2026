'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'
import WeeklyEditor, { type PlanData } from '@/components/WeeklyEditor'

type Group = { id: number; code: string; name: string; icon: string; color: string }
type Employee = { id: string; last_name: string; first_name: string }
type WeeklyPlan = {
  id: string
  group_id: number
  author_id: string
  year: number
  month: number
  week_num: number
  theme: string | null
  method: string | null
  new_words: string[]
  outcomes: { code: string; type: string; text: string }[]
  cells: Record<string, Record<string, string>>
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  approver_id: string | null
  approver_note: string | null
  approver_level: 'excellent' | 'good' | 'revise' | null
  reviewed_at: string | null
  groups?: Group
  employees?: Employee
  approver?: Employee | null
}

const STATUS = {
  draft:     { label: 'Ноорог',     color: 'bg-slate-100 text-slate-700 border-slate-300' },
  submitted: { label: 'Хянагдаж',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved:  { label: 'Батлагдсан', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  returned:  { label: 'Буцаагдсан', color: 'bg-red-100 text-red-700 border-red-300' },
}

const LEVELS = [
  { value: 'excellent', label: '🏆 Онц сайн', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { value: 'good',      label: '✅ Сайн',     color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  { value: 'revise',    label: '📋 Засварлах', color: 'bg-red-500 hover:bg-red-600 text-white' },
] as const

const MONTHS = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар']

export default function WeeklyPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const router = useRouter()

  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [data, setData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  async function load() {
    setLoading(true)
    const { data: p } = await supabase
      .from('weekly_plans')
      .select('*, groups(id, code, name, icon, color), employees:author_id(id, last_name, first_name), approver:approver_id(id, last_name, first_name)')
      .eq('id', id)
      .maybeSingle()
    setPlan(p as unknown as WeeklyPlan)
    if (p) {
      const pp = p as unknown as WeeklyPlan
      setData({
        theme: pp.theme || '',
        method: pp.method || '',
        new_words: pp.new_words || [],
        outcomes: pp.outcomes || [],
        cells: pp.cells || {},
      })
      setReviewNote(pp.approver_note || '')
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const canApprove = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')
  const isOwner = me && plan && plan.author_id === me.id
  const readOnly = !isOwner || plan?.status === 'submitted' || plan?.status === 'approved'

  async function saveChanges(submit: boolean) {
    if (!plan || !data) return
    setSaving(true)
    const { error } = await supabase.from('weekly_plans').update({
      theme: data.theme || null,
      method: data.method || null,
      new_words: data.new_words,
      outcomes: data.outcomes,
      cells: data.cells,
      status: submit ? 'submitted' : plan.status,
      updated_at: new Date().toISOString(),
    }).eq('id', plan.id)
    setSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    load()
  }

  async function approve(level: 'excellent' | 'good' | 'revise') {
    if (!me || !plan) return
    if (level === 'revise' && !reviewNote.trim()) {
      alert('Засах шаардлагатай учрыг тайлбарлана уу')
      return
    }
    setSaving(true)
    await supabase.from('weekly_plans').update({
      status: level === 'revise' ? 'returned' : 'approved',
      approver_id: me.id,
      approver_note: reviewNote || null,
      approver_level: level,
      reviewed_at: new Date().toISOString(),
    }).eq('id', plan.id)
    setSaving(false)
    load()
  }

  async function remove() {
    if (!plan) return
    if (!confirm('Устгах уу?')) return
    await supabase.from('weekly_plans').delete().eq('id', plan.id)
    router.push('/tulvluguu/weekly')
  }

  if (meLoading || loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!plan || !data) return <div className="p-8 text-slate-500">Төлөвлөгөө олдсонгүй</div>

  const s = STATUS[plan.status]

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/tulvluguu/weekly" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Буцах</Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${s.color}`}>{s.label}</span>
                {plan.groups && (
                  <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{background: plan.groups.color}}>
                    {plan.groups.icon} {plan.groups.name}
                  </span>
                )}
                {plan.approver_level === 'excellent' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">🏆 Онц сайн</span>}
                {plan.approver_level === 'good' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">✅ Сайн</span>}
                {plan.approver_level === 'revise' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">📋 Засварлах</span>}
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                {plan.year} · {MONTHS[plan.month - 1]} · {plan.week_num}-р долоо хоног
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {plan.employees && `${plan.employees.last_name}.${plan.employees.first_name}`}
                {plan.approver && ` · Хянасан: ${plan.approver.last_name}.${plan.approver.first_name}`}
                {plan.reviewed_at && ` · ${new Date(plan.reviewed_at).toLocaleDateString('mn-MN')}`}
              </p>
            </div>
            {(isOwner || me?.is_admin) && (
              <button onClick={remove} className="text-red-600 hover:text-red-800 text-sm font-medium">
                Устгах
              </button>
            )}
          </div>
          {plan.approver_note && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border-l-4 border-slate-300 text-sm">
              <div className="text-xs font-semibold text-slate-500 mb-1">Арга зүйчийн тэмдэглэл</div>
              {plan.approver_note}
            </div>
          )}
        </div>

        <WeeklyEditor value={data} onChange={setData} readOnly={readOnly} />

        {/* Actions */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4 sticky bottom-0 z-10">
          {isOwner && (plan.status === 'draft' || plan.status === 'returned') && (
            <div className="flex gap-2 justify-end">
              <button onClick={() => saveChanges(false)} disabled={saving} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium disabled:opacity-50">
                💾 Хадгалах
              </button>
              <button onClick={() => saveChanges(true)} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                📤 Батлуулахаар илгээх
              </button>
            </div>
          )}

          {canApprove && plan.status === 'submitted' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тэмдэглэл (зөвлөгөө, засах учир)</label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end flex-wrap">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => approve(l.value)}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${l.color}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {plan.status === 'approved' && (
            <div className="text-center text-sm text-emerald-700">
              ✅ Энэ төлөвлөгөө батлагдсан
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
