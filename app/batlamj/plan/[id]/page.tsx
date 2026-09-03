'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Plan = {
  id: string
  group_id: string | null
  tab: string | null
  title: string | null
  period: string | null
  content: string | null
  element: string | null
  approved_at: string | null
  approved_by: string | null
  approval_note: string | null
  created_at: string
  author_id: string | null
  files?: { src: string; label?: string }[]
  media?: { src: string; type?: string; label?: string }[]
  employees?: { last_name: string; first_name: string } | null
}

const GROUP_LABEL: Record<string, string> = {
  baga: '👶 Бага', dund: '🧒 Дунд', ahlah: '🐣 Ахлах', beltgel: '🐰 Бэлтгэл', duguilan: '🎨 Дугуйлан', hogjim: '🎵 Хөгжим',
}

export default function BatlamjPlanReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const canApprove = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('plans')
      .select('*, employees:author_id(last_name, first_name)')
      .eq('id', id)
      .maybeSingle()
    setPlan(data as unknown as Plan)
    setNote((data as unknown as Plan)?.approval_note || '')
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function approve() {
    if (!me || !plan) return
    setSaving(true)
    await supabase.from('plans').update({
      approved_at: new Date().toISOString(),
      approved_by: `${me.last_name}.${me.first_name}`,
      approval_note: note || null,
    }).eq('id', plan.id)
    setSaving(false)
    router.push('/batlamj')
  }

  async function returnPlan() {
    if (!me || !plan) return
    if (!note.trim()) { alert('Буцаах шалтгаанаа бичнэ үү'); return }
    setSaving(true)
    // Хөгжим системд "returned" төлөвгүй тул зөвхөн note нэмэн, approved_at null үлдээнэ
    await supabase.from('plans').update({
      approval_note: '↩️ БУЦААГДСАН: ' + note,
      approved_at: null,
      approved_by: null,
    }).eq('id', plan.id)
    setSaving(false)
    router.push('/batlamj')
  }

  if (meLoading || loading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!plan) return <div className="p-8 text-slate-500">Төлөвлөгөө олдсонгүй</div>

  const isApproved = !!plan.approved_at
  const isReturned = plan.approval_note?.startsWith('↩️')

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/batlamj" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Батламжийн ширээ рүү буцах</Link>

        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl">🎵</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {isApproved && <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">✅ Батлагдсан</span>}
                {isReturned && !isApproved && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">↩️ Буцаагдсан</span>}
                {!isApproved && !isReturned && <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">🕐 Хянагдаж</span>}
                {plan.group_id && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{GROUP_LABEL[plan.group_id] || plan.group_id}</span>
                )}
                {plan.tab && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{plan.tab}</span>}
                {plan.period && <span className="text-xs opacity-90">📅 {plan.period}</span>}
              </div>
              <h1 className="text-2xl font-bold">{plan.title || '(гарчиггүй)'}</h1>
              {plan.employees && (
                <div className="text-sm opacity-90 mt-1">
                  {plan.employees.last_name}.{plan.employees.first_name}
                  {plan.approved_by && ` · Хянасан: ${plan.approved_by}`}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          {plan.content ? (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{plan.content}</div>
          ) : (
            <div className="text-sm text-slate-400 italic">Агуулга байхгүй</div>
          )}
          {plan.element && (
            <div className="mt-4 text-xs text-slate-500">🎯 Элемент: {plan.element}</div>
          )}
        </div>

        {(plan.files && plan.files.length > 0) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
            <div className="text-sm font-semibold text-slate-700 mb-2">📎 Файлууд ({plan.files.length})</div>
            <div className="flex flex-wrap gap-2">
              {plan.files.map((f, i) => (
                <a key={i} href={f.src} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                  📄 {f.label || 'Файл ' + (i+1)}
                </a>
              ))}
            </div>
          </div>
        )}

        {plan.approval_note && (
          <div className={`rounded-2xl p-4 mb-4 ${isReturned ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className={`text-xs font-semibold mb-1 ${isReturned ? 'text-red-700' : 'text-emerald-700'}`}>
              Арга зүйчийн тэмдэглэл
            </div>
            <div className={`text-sm whitespace-pre-wrap ${isReturned ? 'text-red-800' : 'text-emerald-800'}`}>
              {plan.approval_note.replace(/^↩️ БУЦААГДСАН: /, '')}
            </div>
          </div>
        )}

        {canApprove && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky bottom-4 shadow-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">Тэмдэглэл / зөвлөгөө</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Зөвлөгөө, засах шалтгаан..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={returnPlan} disabled={saving} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-medium">
                ↩️ Буцаах
              </button>
              <button onClick={approve} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium">
                ✅ Батлах
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
