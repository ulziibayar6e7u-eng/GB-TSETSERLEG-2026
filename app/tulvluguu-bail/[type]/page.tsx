'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'
import { PLAN_TYPES, PHASES, type PhaseKey } from '@/lib/orgPlanTypes'
import dynamic from 'next/dynamic'
const PdfAnnotator = dynamic(() => import('@/components/PdfAnnotator'), { ssr: false })
type Stroke = { page: number; pts: [number, number][]; color: string; width: number }

type Employee = { id: string; last_name: string; first_name: string }
type Doc = {
  id: string
  plan_type: string
  phase: string
  period: string
  author_id: string
  title: string | null
  description: string | null
  file_url: string | null
  extra_links: string[]
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  reviewer_id: string | null
  reviewer_note: string | null
  annotations: Array<{ text?: string; at: string; by: string; color?: string; type?: string; page?: number; pts?: [number, number][]; width?: number }>
  reviewed_at: string | null
  created_at: string
  employees?: Employee
  reviewer?: Employee | null
}

const STATUS = {
  draft:     { label: '📝 Ноорог',     color: 'bg-slate-100 text-slate-700 border-slate-300' },
  submitted: { label: '🕐 Хянагдаж',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  approved:  { label: '✅ Батлагдсан', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  returned:  { label: '↩️ Буцаагдсан', color: 'bg-red-100 text-red-700 border-red-300' },
}

function currentPeriod() {
  const y = new Date().getFullYear()
  const m = new Date().getMonth() + 1
  const start = m >= 9 ? y : y - 1
  return `${start}-${start + 1}`
}

export default function PlanTypeDetailPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const meta = PLAN_TYPES[type]
  const [activePhase, setActivePhase] = useState<PhaseKey>('plan')
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Doc | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [form, setForm] = useState({ title: '', description: '', file: null as File | null, extraLinks: '' })
  const [saving, setSaving] = useState(false)
  const [reviewDoc, setReviewDoc] = useState<Doc | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [annotationText, setAnnotationText] = useState('')
  const [editingAnn, setEditingAnn] = useState<number | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [strokes, setStrokes] = useState<{ pts: [number, number][]; color: string; width: number }[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef<[number, number][]>([])

  const canApprove = me && (me.is_admin || me.role === 'erhlegch')

  async function load() {
    if (!meta) return
    setLoading(true)
    let q = supabase
      .from('org_plan_documents')
      .select('*, employees:author_id(id, last_name, first_name), reviewer:reviewer_id(id, last_name, first_name)')
      .eq('plan_type', type)
      .eq('phase', activePhase)
      .order('created_at', { ascending: false })
    // Хэрэв энгийн ажилтан (эрхлэгч/арга зүйч биш) бол зөвхөн өөрийнх нь харна
    if (me && !me.is_admin && me.role !== 'erhlegch' && me.role !== 'arga_zuich') {
      q = q.eq('author_id', me.id)
    }
    const { data } = await q
    setDocs((data as unknown as Doc[]) || [])
    setLoading(false)
  }

  useEffect(() => { if (me) load() }, [type, activePhase, me?.id])

  // Canvas init when doc opens — hooks always run in same order (before returns)
  useEffect(() => {
    if (!reviewDoc) return
    const strokesFromAnns = ((reviewDoc.annotations || []) as { type?: string; pts?: [number, number][]; color?: string; width?: number }[])
      .filter((a) => a.type === 'stroke' && Array.isArray(a.pts))
    const converted = strokesFromAnns.map((a) => ({ pts: a.pts!, color: a.color || '#dc2626', width: a.width || 3 }))
    setStrokes(converted)
    setTimeout(() => {
      const c = canvasRef.current
      const cont = containerRef.current
      if (c && cont) {
        c.width = cont.clientWidth
        c.height = cont.clientHeight
        redrawStrokes(converted)
      }
    }, 200)
  }, [reviewDoc?.id])

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!meta) return <div className="p-8 text-slate-500">Төлөвлөгөөний төрөл олдсонгүй</div>

  function openAdd() {
    setEditing(null)
    setForm({ title: '', description: '', file: null, extraLinks: '' })
    setShowForm(true)
  }

  function openEdit(d: Doc) {
    setEditing(d)
    setForm({
      title: d.title || '',
      description: d.description || '',
      file: null,
      extraLinks: (d.extra_links || []).join('\n'),
    })
    setPeriod(d.period)
    setShowForm(true)
  }

  async function save(submit: boolean) {
    if (!me) return
    setSaving(true)
    let file_url = editing?.file_url || null
    if (form.file) {
      const path = `${type}/${activePhase}/${Date.now()}_${form.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, form.file)
      if (upErr) { alert('Файл байршуулах алдаа: ' + upErr.message); setSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const extra_links = form.extraLinks.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
    const payload = {
      plan_type: type,
      phase: activePhase,
      period,
      title: form.title || null,
      description: form.description || null,
      file_url,
      extra_links,
      author_id: me.id,
      status: submit ? 'submitted' : (editing?.status || 'draft'),
    }
    if (editing) {
      await supabase.from('org_plan_documents').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('org_plan_documents').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function submitForReview(d: Doc) {
    await supabase.from('org_plan_documents').update({ status: 'submitted' }).eq('id', d.id)
    load()
  }

  async function remove(d: Doc) {
    if (!confirm('Устгах уу?')) return
    await supabase.from('org_plan_documents').delete().eq('id', d.id)
    load()
  }

  async function review(status: 'approved' | 'returned') {
    if (!me || !reviewDoc) return
    if (status === 'returned' && !reviewNote.trim()) { alert('Буцаах шалтгаанаа бичнэ үү'); return }
    await supabase.from('org_plan_documents').update({
      status,
      reviewer_id: me.id,
      reviewer_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', reviewDoc.id)
    setReviewDoc(null); setReviewNote('')
    load()
  }

  async function addAnnotation() {
    if (!me || !reviewDoc || !annotationText.trim()) return
    const anns = [...(reviewDoc.annotations || [])]
    if (editingAnn !== null) {
      anns[editingAnn] = { ...anns[editingAnn], text: annotationText, at: new Date().toISOString() }
    } else {
      anns.push({ text: annotationText, at: new Date().toISOString(), by: `${me.last_name}.${me.first_name}`, color: '#dc2626' })
    }
    await supabase.from('org_plan_documents').update({ annotations: anns }).eq('id', reviewDoc.id)
    setAnnotationText('')
    setEditingAnn(null)
    setReviewDoc({ ...reviewDoc, annotations: anns })
    load()
  }

  async function deleteAnnotation(idx: number) {
    if (!reviewDoc) return
    if (!confirm('Тэмдэглэлийг устгах уу?')) return
    const anns = [...(reviewDoc.annotations || [])]
    anns.splice(idx, 1)
    await supabase.from('org_plan_documents').update({ annotations: anns }).eq('id', reviewDoc.id)
    setReviewDoc({ ...reviewDoc, annotations: anns })
    load()
  }

  function startEditAnn(idx: number) {
    if (!reviewDoc) return
    setEditingAnn(idx)
    setAnnotationText(reviewDoc.annotations[idx].text || '')
  }

  // Canvas drawing helpers
  function redrawStrokes(list: typeof strokes) {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    for (const s of list) {
      if (s.pts.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(s.pts[0][0], s.pts[0][1])
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1])
      ctx.stroke()
    }
  }

  function onDrawStart(e: React.PointerEvent) {
    if (!drawMode) return
    const c = canvasRef.current
    if (!c) return
    drawingRef.current = true
    const rect = c.getBoundingClientRect()
    currentStrokeRef.current = [[e.clientX - rect.left, e.clientY - rect.top]]
  }
  function onDrawMove(e: React.PointerEvent) {
    if (!drawMode || !drawingRef.current) return
    const c = canvasRef.current
    if (!c) return
    const rect = c.getBoundingClientRect()
    currentStrokeRef.current.push([e.clientX - rect.left, e.clientY - rect.top])
    const ctx = c.getContext('2d')
    if (!ctx) return
    const pts = currentStrokeRef.current
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1])
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
    ctx.stroke()
  }
  async function onDrawEnd() {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (currentStrokeRef.current.length < 2) return
    const newStroke = { pts: [...currentStrokeRef.current], color: '#dc2626', width: 3 }
    const updated = [...strokes, newStroke]
    setStrokes(updated)
    currentStrokeRef.current = []
    if (reviewDoc) {
      const anns = [...(reviewDoc.annotations || []).filter((a) => !('stroke' in a)), { stroke: newStroke, at: new Date().toISOString(), by: `${me?.last_name}.${me?.first_name}` }]
      // Actually store strokes separately in annotations with type
      const drawingAnn = { type: 'stroke', pts: newStroke.pts, color: newStroke.color, width: newStroke.width, at: new Date().toISOString(), by: `${me?.last_name}.${me?.first_name}` }
      const allAnns = [...(reviewDoc.annotations || []), drawingAnn]
      await supabase.from('org_plan_documents').update({ annotations: allAnns }).eq('id', reviewDoc.id)
      setReviewDoc({ ...reviewDoc, annotations: allAnns })
    }
  }

  async function clearStrokes() {
    if (!reviewDoc) return
    if (!confirm('Бүх зурсан тэмдэглэлийг арилгах уу?')) return
    const anns = (reviewDoc.annotations || []).filter((a: { type?: string }) => a.type !== 'stroke' && a.type !== 'pdf_stroke')
    await supabase.from('org_plan_documents').update({ annotations: anns }).eq('id', reviewDoc.id)
    setStrokes([])
    const c = canvasRef.current
    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    setReviewDoc({ ...reviewDoc, annotations: anns })
  }


  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/tulvluguu-bail" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← Буцах</Link>

        <div className={`rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br ${meta.color}`}>
          <div className="flex items-center gap-4">
            <div className="text-5xl">{meta.icon}</div>
            <div>
              <h1 className="text-2xl font-bold">{meta.label}</h1>
              <p className="text-sm opacity-90 mt-1">{meta.desc}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-6 flex gap-2 flex-wrap">
          {PHASES.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePhase(p.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                activePhase === p.key ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
          <button
            onClick={openAdd}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            + Файл нэмэх
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : docs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📄</div>
            <div>Хараахан бүртгэгдээгүй</div>
            <button onClick={openAdd} className="mt-4 text-blue-600 hover:text-blue-800 font-medium">Эхнийхийг нэмэх →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => {
              const s = STATUS[d.status]
              const isOwner = me && d.author_id === me.id
              return (
                <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${s.color}`}>{s.label}</span>
                        <span className="text-xs text-slate-500">🗓 {d.period}</span>
                        {d.annotations && d.annotations.length > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            🖊 {d.annotations.length} тэмдэглэл
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800">{d.title || '(гарчиггүй)'}</h3>
                      {d.description && <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap line-clamp-3">{d.description}</div>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {d.file_url && (
                          <a href={d.file_url} target="_blank" rel="noopener" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                            📎 Файл татах
                          </a>
                        )}
                        {(d.extra_links || []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">
                            🔗 Линк {i + 1}
                          </a>
                        ))}
                      </div>
                      {d.employees && (
                        <div className="text-xs text-slate-500 mt-3">
                          {d.employees.last_name}.{d.employees.first_name}
                          {d.reviewer && ` · Хянасан: ${d.reviewer.last_name}.${d.reviewer.first_name}`}
                        </div>
                      )}
                      {d.reviewer_note && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-50 border-l-4 border-slate-300 text-sm">
                          <div className="text-xs font-semibold text-slate-500 mb-1">Эрхлэгчийн тэмдэглэл</div>
                          {d.reviewer_note}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {isOwner && (d.status === 'draft' || d.status === 'returned') && (
                        <>
                          <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1">Засах</button>
                          <button onClick={() => submitForReview(d)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">Хянуулах →</button>
                        </>
                      )}
                      {canApprove && (d.status === 'submitted' || d.status === 'approved') && (
                        <button onClick={() => { setReviewDoc(d); setReviewNote(d.reviewer_note || '') }} className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                          🖊 Хянах
                        </button>
                      )}
                      {(isOwner || me?.is_admin) && (
                        <button onClick={() => remove(d)} className="text-red-600 hover:text-red-800 text-xs px-3 py-1">Устгах</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editing ? 'Засах' : `Шинэ · ${PHASES.find(p=>p.key===activePhase)?.label}`}
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Хугацаа (жш: 2026-2027)</label>
                <input value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тайлбар (сонголт)</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">📎 Файл (Word, PDF, зураг)</label>
                <input type="file" accept=".doc,.docx,.pdf,image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none" />
                {editing?.file_url && !form.file && (
                  <div className="text-xs text-slate-500 mt-1">Одоо байгаа: <a href={editing.file_url} target="_blank" className="text-blue-600 hover:underline">файл харах</a></div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">🔗 Нэмэлт линкүүд (мөр бүрд нэг)</label>
                <textarea rows={2} value={form.extraLinks} onChange={(e) => setForm({ ...form, extraLinks: e.target.value })} placeholder="Google Drive, Facebook..." className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Болих</button>
                <button onClick={() => save(false)} disabled={saving} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium disabled:opacity-50">💾 Ноорог</button>
                <button onClick={() => save(true)} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">📤 Илгээх</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewDoc && (() => {
        const url = reviewDoc.file_url || ''
        const u = url.toLowerCase()
        const isImage = u.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)
        const isPdf = u.match(/\.pdf(\?|$)/)
        const isOffice = u.match(/\.(docx?|xlsx?|pptx?)(\?|$)/)
        const viewerUrl = isOffice ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}` : url
        return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex">
          <div className="bg-white flex flex-col w-full h-full">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setReviewDoc(null)} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm font-medium">
                  ← Буцах
                </button>
                <div>
                  <h2 className="font-semibold">🖊 Хянах: {reviewDoc.title || '(гарчиггүй)'}</h2>
                  <p className="text-xs opacity-90">{reviewDoc.period} · {reviewDoc.employees ? `${reviewDoc.employees.last_name}.${reviewDoc.employees.first_name}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDrawMode(!drawMode)}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${drawMode ? 'bg-white text-red-600 shadow' : 'bg-white/20 hover:bg-white/30'}`}
                >
                  🖊 {drawMode ? 'Зурах ИДЭВХТЭЙ' : 'Зурах горим'}
                </button>
                {strokes.length > 0 && (
                  <button onClick={clearStrokes} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm">
                    🗑 Зурсныг арилгах
                  </button>
                )}
                {url && <a href={url} target="_blank" className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm">📥 Татах</a>}
                <button onClick={() => setReviewDoc(null)} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm">✕ Хаах</button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left: file viewer */}
              <div ref={containerRef} className="flex-1 bg-slate-100 overflow-hidden relative">
                {!url ? (
                  <div className="h-full flex items-center justify-center text-slate-500">Файл хавсаргаагүй</div>
                ) : isPdf ? (
                  <PdfAnnotator
                    url={url}
                    drawMode={drawMode}
                    initialStrokes={((reviewDoc.annotations || []) as { type?: string; page?: number; pts?: [number,number][]; color?: string; width?: number }[])
                      .filter((a) => a.type === 'pdf_stroke' && Array.isArray(a.pts))
                      .map((a) => ({ page: a.page || 1, pts: a.pts!, color: a.color || '#dc2626', width: a.width || 3 }))}
                    onStrokesChange={async (newStrokes: Stroke[]) => {
                      if (!reviewDoc) return
                      const nonStrokes = (reviewDoc.annotations || []).filter((a: { type?: string }) => a.type !== 'pdf_stroke' && a.type !== 'stroke')
                      const strokeAnns = newStrokes.map((s) => ({ type: 'pdf_stroke', page: s.page, pts: s.pts, color: s.color, width: s.width, at: new Date().toISOString(), by: `${me?.last_name}.${me?.first_name}` }))
                      const allAnns = [...nonStrokes, ...strokeAnns]
                      await supabase.from('org_plan_documents').update({ annotations: allAnns }).eq('id', reviewDoc.id)
                      setReviewDoc({ ...reviewDoc, annotations: allAnns })
                    }}
                  />
                ) : isImage ? (
                  <div className="h-full overflow-auto flex items-start justify-center p-4">
                    <img src={url} className="max-w-full" />
                  </div>
                ) : (
                  <>
                    <iframe src={viewerUrl} className="w-full h-full border-0" title="Файл" style={{ pointerEvents: drawMode ? 'none' : 'auto' }} />
                    {drawMode && (
                      <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-md">
                        ⚠️ Word файлд бүрэн зурах горим ажиллахгүй. Файлаа PDF болгож дахин upload хийхийг зөвлөж байна.
                      </div>
                    )}
                  </>
                )}
                {/* Non-PDF: simple canvas overlay */}
                {isImage && (
                  <canvas
                    ref={canvasRef}
                    onPointerDown={onDrawStart}
                    onPointerMove={onDrawMove}
                    onPointerUp={onDrawEnd}
                    onPointerLeave={onDrawEnd}
                    className="absolute inset-0"
                    style={{
                      cursor: drawMode ? 'crosshair' : 'default',
                      pointerEvents: drawMode ? 'auto' : 'none',
                      touchAction: 'none',
                    }}
                  />
                )}
              </div>

              {/* Right: annotations + review */}
              <div className="w-96 border-l border-slate-200 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100 bg-red-50">
                  <div className="text-sm font-bold text-red-800 mb-1">🖊 Улаан харандаа</div>
                  <div className="text-xs text-red-700 mb-3">Заавал үг бичээд ✚ Нэмэх дар (эсвэл Ctrl+Enter)</div>
                  <textarea
                    value={annotationText}
                    onChange={(e) => setAnnotationText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        addAnnotation()
                      }
                    }}
                    placeholder="Тэмдэглэл, засах санал, зөвлөгөө..."
                    rows={3}
                    autoFocus
                    tabIndex={0}
                    className="w-full border-2 border-red-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-slate-800"
                  />
                  <div className="flex gap-2 mt-2">
                    {editingAnn !== null && (
                      <button onClick={() => { setEditingAnn(null); setAnnotationText('') }} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-sm">
                        Болих
                      </button>
                    )}
                    <button
                      onClick={addAnnotation}
                      disabled={!annotationText.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-3 py-2 rounded-lg font-bold text-sm"
                    >
                      {editingAnn !== null ? '💾 Хадгалах' : '✚ Тэмдэглэл нэмэх'}
                    </button>
                  </div>
                  <div className="text-xs text-slate-600 mt-3">Тэмдэглэл ({(reviewDoc.annotations || []).length})</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(reviewDoc.annotations || []).filter((a: any) => a.type !== 'stroke').length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-8">Тэмдэглэл байхгүй</div>
                  ) : (
                    (reviewDoc.annotations || []).map((a: any, i) => {
                      if (a.type === 'stroke') return null
                      return (
                        <div key={i} className={`text-sm p-3 rounded border-l-4 ${editingAnn === i ? 'bg-amber-50 border-amber-500' : 'bg-red-50 border-red-500'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-slate-500">{a.by} · {new Date(a.at).toLocaleString('mn-MN')}</div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => startEditAnn(i)} className="text-xs text-blue-600 hover:text-blue-800 px-1">Засах</button>
                              <button onClick={() => deleteAnnotation(i)} className="text-xs text-red-600 hover:text-red-800 px-1">Устгах</button>
                            </div>
                          </div>
                          <div className="text-red-800 mt-1 whitespace-pre-wrap">{a.text}</div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="p-4 border-t border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Зөвлөгөө / тайлбар</label>
                    <textarea rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => review('returned')} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm">↩️ Буцаах</button>
                    <button onClick={() => review('approved')} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm">✅ Батлах</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
