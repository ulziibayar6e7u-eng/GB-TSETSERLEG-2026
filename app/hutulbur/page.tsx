'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Group = { id: number; code: string; name: string; icon: string; color: string; age_group: string | null }
type Area = { code: string; name: string; icon: string; color: string; sort_order: number }
type Outcome = { id: number; age_group: string; area_code: string; code: string; text: string; sort_order: number; active: boolean }
type Child = { id: string; last_name: string; first_name: string; group_id: number | null }
type Check = { id: string; child_id: string; outcome_id: number; status: 'not_checked'|'in_progress'|'achieved'|'need_support'; note: string | null; file_url: string | null; checked_at: string }

const STATUS_META = {
  achieved:     { icon: '✅', label: 'Эзэмшсэн',       color: 'bg-emerald-500', text: 'text-emerald-700' },
  in_progress:  { icon: '🔄', label: 'Явцтай',         color: 'bg-blue-500',    text: 'text-blue-700' },
  need_support: { icon: '🤝', label: 'Дэмжлэг хэрэгтэй', color: 'bg-amber-500',   text: 'text-amber-700' },
  not_checked:  { icon: '⚪', label: 'Тэмдэглээгүй',    color: 'bg-slate-300',   text: 'text-slate-600' },
} as const
type Status = keyof typeof STATUS_META

export default function HutulburPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()

  const [groups, setGroups] = useState<Group[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [groupId, setGroupId] = useState<number | null>(null)
  const [areaCode, setAreaCode] = useState<string>('')
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [checks, setChecks] = useState<Check[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const [dialog, setDialog] = useState<{ outcome: Outcome; child: Child; history: Check[] } | null>(null)
  const [summaryScope, setSummaryScope] = useState<'area' | 'group' | null>(null)
  const [dlgStatus, setDlgStatus] = useState<Status>('achieved')
  const [dlgNote, setDlgNote] = useState('')
  const [dlgFile, setDlgFile] = useState<File | null>(null)
  const [dlgSaving, setDlgSaving] = useState(false)

  const canEdit = me && (me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich' || me.role === 'bagsh')

  useEffect(() => {
    (async () => {
      const [g, a] = await Promise.all([
        supabase.from('groups').select('id, code, name, icon, color, age_group').order('id'),
        supabase.from('development_areas').select('*').order('sort_order'),
      ])
      const gs = (g.data as Group[]) || []
      setGroups(gs)
      setAreas((a.data as Area[]) || [])
      if (me) {
        const isMusic = me.first_name === 'Өлзийбаяр' || me.groups.some((g) => g.code === 'hogjim')
        const firstReal = gs.find((g) => !['hogjim'].includes(g.code))
        if (canSeeAllChildren(me.role, me.is_admin) || isMusic) setGroupId((prev) => prev ?? firstReal?.id ?? gs[0]?.id ?? null)
        else if (me.groups.length > 0) setGroupId((prev) => prev ?? me.groups[0].id)
      }
    })()
  }, [me, supabase])

  const currentGroup = groups.find((g) => g.id === groupId)

  useEffect(() => {
    if (!currentGroup) return
    (async () => {
      setLoading(true)
      // Хувилбарт сургалт = 3-4 насны холимог → dund + ahlah 2-уланг харна
      const ageCodes = currentGroup.code === 'huvilbart' ? ['dund', 'ahlah'] : [currentGroup.code]
      const [o, c] = await Promise.all([
        supabase.from('outcomes').select('*').in('age_group', ageCodes).eq('active', true).order('area_code').order('sort_order'),
        supabase.from('children').select('id, last_name, first_name, group_id').eq('group_id', currentGroup.id).eq('status', 'active').order('last_name'),
      ])
      const outs = (o.data as Outcome[]) || []
      const kids = (c.data as Child[]) || []
      setOutcomes(outs)
      setChildren(kids)
      if (kids.length > 0 && outs.length > 0) {
        const { data: ch } = await supabase.from('outcome_checks').select('*').in('child_id', kids.map((k) => k.id)).in('outcome_id', outs.map((o) => o.id))
        setChecks((ch as Check[]) || [])
      } else {
        setChecks([])
      }
      setLoading(false)
    })()
  }, [currentGroup, supabase])

  const isMusicTeacher = me && (me.first_name === 'Өлзийбаяр' || me.groups.some((g) => g.code === 'hogjim'))
  const availableGroups = !me
    ? []
    : isMusicTeacher
    ? groups.filter((g) => !['hogjim', 'huvilbart'].includes(g.code))
    : canSeeAllChildren(me.role, me.is_admin)
    ? groups.filter((g) => !['hogjim'].includes(g.code))
    : groups.filter((g) => me.groups.some((mg) => mg.id === g.id))

  const areasInGroup = useMemo(() => {
    const set = new Set(outcomes.map((o) => o.area_code))
    return areas.filter((a) => set.has(a.code) && a.code !== 'aa_uhaan' && (!isMusicTeacher || a.code === 'hogjim'))
  }, [outcomes, areas, isMusicTeacher])

  useEffect(() => {
    if (isMusicTeacher) { if (areaCode !== 'hogjim' && areasInGroup.some((a) => a.code === 'hogjim')) setAreaCode('hogjim'); return }
    if (!areaCode && areasInGroup.length > 0) setAreaCode(areasInGroup[0].code)
    if (areaCode === 'aa_uhaan') setAreaCode(areasInGroup[0]?.code || '')
  }, [areasInGroup, areaCode, isMusicTeacher])

  // Хүүхэд бүрийн хамгийн сүүлийн ажиглалт болон бүх түүх
  const checksByOutcome = useMemo(() => {
    const m = new Map<number, Map<string, Check[]>>()
    checks.forEach((c) => {
      let inner = m.get(c.outcome_id)
      if (!inner) { inner = new Map(); m.set(c.outcome_id, inner) }
      const arr = inner.get(c.child_id) || []
      arr.push(c)
      inner.set(c.child_id, arr)
    })
    m.forEach((inner) => inner.forEach((arr) => arr.sort((a, b) => (b.checked_at > a.checked_at ? 1 : -1))))
    return m
  }, [checks])

  const latestOf = (o: Outcome, childId: string): Check | undefined => checksByOutcome.get(o.id)?.get(childId)?.[0]

  function outcomeStats(o: Outcome) {
    const inner = checksByOutcome.get(o.id)
    const s = { achieved: 0, in_progress: 0, need_support: 0, not_checked: 0 }
    children.forEach((k) => { s[inner?.get(k.id)?.[0]?.status || 'not_checked']++ })
    return s
  }

  const shownOutcomes = areaCode ? outcomes.filter((o) => o.area_code === areaCode) : []

  const totalPct = useMemo(() => {
    if (children.length === 0 || shownOutcomes.length === 0) return 0
    const total = children.length * shownOutcomes.length
    let done = 0
    shownOutcomes.forEach((o) => {
      children.forEach((k) => {
        if (latestOf(o, k.id)?.status === 'achieved') done++
      })
    })
    return Math.round((done / total) * 100)
  }, [shownOutcomes, children, checksByOutcome])

  function openDialog(outcome: Outcome, child: Child) {
    if (!canEdit) return
    const history = checksByOutcome.get(outcome.id)?.get(child.id) || []
    setDialog({ outcome, child, history })
    setDlgStatus(history[0]?.status && history[0].status !== 'not_checked' ? history[0].status : 'achieved')
    setDlgNote('')
    setDlgFile(null)
  }
  async function saveDialog() {
    if (!dialog || !me) return
    setDlgSaving(true)
    let file_url: string | null = null
    if (dlgFile) {
      const path = `outcomes/${Date.now()}_${dlgFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error: upErr } = await supabase.storage.from('org-plans').upload(path, dlgFile)
      if (upErr) { alert('Файл алдаа: ' + upErr.message); setDlgSaving(false); return }
      const { data: pub } = supabase.storage.from('org-plans').getPublicUrl(path)
      file_url = pub?.publicUrl || null
    }
    const { data, error } = await supabase.from('outcome_checks').insert({
      outcome_id: dialog.outcome.id, child_id: dialog.child.id,
      status: dlgStatus, note: dlgNote || null, file_url,
      checked_by: me.id,
    }).select().single()
    setDlgSaving(false)
    if (error) { alert('Алдаа: ' + error.message); return }
    if (data) {
      const newCheck = data as Check
      setChecks((prev) => [...prev, newCheck])
      setDialog({ ...dialog, history: [newCheck, ...dialog.history] })
    }
    setDlgNote(''); setDlgFile(null)
  }
  function downloadSummary(scope: 'area' | 'group') {
    if (!currentGroup) return
    const targets = scope === 'area' ? shownOutcomes : outcomes
    const rows = [['Код','Судлагдахуун','Үр дүн','Эзэмшсэн','Явцтай','Дэмжлэг','Эзэмшээгүй','Эзэмшсэн %','Нийт хүүхэд']]
    targets.forEach((o) => {
      const s = outcomeStats(o)
      const areaName = areas.find((a) => a.code === o.area_code)?.name || o.area_code
      const pct = children.length > 0 ? Math.round((s.achieved / children.length) * 100) : 0
      rows.push([o.code, areaName, o.text, String(s.achieved), String(s.in_progress), String(s.need_support), String(s.not_checked), pct + '%', String(children.length)])
    })
    // Хүүхэд бүрийн задаргаа
    rows.push([])
    rows.push(['ХҮҮХЭД БҮРИЙН ЗАДАРГАА'])
    const header = ['Хүүхэд', ...targets.map((o) => o.code)]
    rows.push(header)
    children.forEach((k) => {
      const line: string[] = [`${k.last_name}.${k.first_name}`]
      targets.forEach((o) => {
        const st = latestOf(o, k.id)?.status
        line.push(st === 'achieved' ? 'Эзэмшсэн' : st === 'in_progress' ? 'Явцтай' : st === 'need_support' ? 'Дэмжлэг' : '')
      })
      rows.push(line)
    })
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const scopeName = scope === 'area' ? (areas.find((a) => a.code === areaCode)?.name || 'судлагдахуун') : 'бүх'
    a.download = `Хөтөлбөр_${currentGroup.name}_${scopeName}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function removeCheck(id: string) {
    if (!confirm('Энэ тэмдэглэлийг устгах уу?')) return
    await supabase.from('outcome_checks').delete().eq('id', id)
    setChecks((prev) => prev.filter((c) => c.id !== id))
    if (dialog) setDialog({ ...dialog, history: dialog.history.filter((h) => h.id !== id) })
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📚</div>
              <div>
                <h1 className="text-2xl font-bold">Сургалтын хөтөлбөрийн хэрэгжилт</h1>
                <p className="text-sm opacity-90">Бүлэг → Судлагдахуун → Үр дүн → Хүүхэд бүрээр баталгаажуулах</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{totalPct}%</div>
              <div className="text-xs opacity-90">{areaCode ? areas.find((a) => a.code === areaCode)?.name : 'Ерөнхий'} хэрэгжилт</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">1️⃣ БҮЛЭГ</div>
          <div className="flex gap-2 flex-wrap">
            {availableGroups.map((g) => (
              <button key={g.id} onClick={() => { setGroupId(g.id); setAreaCode('') }} className={`px-3 py-2 rounded-lg text-sm font-medium ${groupId === g.id ? 'text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} style={groupId === g.id ? { background: g.color } : {}}>
                {g.icon} {g.name}
              </button>
            ))}
          </div>
        </div>

        {currentGroup && outcomes.length > 0 && (() => {
          const totals = { achieved: 0, in_progress: 0, need_support: 0, not_checked: 0 }
          outcomes.forEach((o) => {
            const s = outcomeStats(o)
            totals.achieved += s.achieved; totals.in_progress += s.in_progress; totals.need_support += s.need_support; totals.not_checked += s.not_checked
          })
          const total = children.length * outcomes.length
          const p = total > 0 ? {
            achieved: Math.round((totals.achieved / total) * 100),
            in_progress: Math.round((totals.in_progress / total) * 100),
            need_support: Math.round((totals.need_support / total) * 100),
            not_checked: Math.round((totals.not_checked / total) * 100),
          } : { achieved: 0, in_progress: 0, need_support: 0, not_checked: 0 }
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-sm font-semibold text-slate-700">📊 {currentGroup.name} · Ерөнхий нэгтгэл</div>
                <div className="flex gap-2">
                  <button onClick={() => setSummaryScope('area')} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">📊 Судлагдахуун харах</button>
                  <button onClick={() => setSummaryScope('group')} className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 rounded-lg font-medium">📊 Бүх бүлэг харах</button>
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-2">Нийт: {children.length} хүүхэд × {outcomes.length} үр дүн = {total} тэмдэглэгээ</div>
              <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 mb-3">
                <div className="bg-emerald-500" style={{ width: `${p.achieved}%` }} />
                <div className="bg-blue-500" style={{ width: `${p.in_progress}%` }} />
                <div className="bg-amber-500" style={{ width: `${p.need_support}%` }} />
                <div className="bg-slate-300" style={{ width: `${p.not_checked}%` }} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{p.achieved}%</div>
                  <div className="text-xs text-emerald-600">✅ Эзэмшсэн ({totals.achieved})</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{p.in_progress}%</div>
                  <div className="text-xs text-blue-600">🔄 Явцтай ({totals.in_progress})</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{p.need_support}%</div>
                  <div className="text-xs text-amber-600">🤝 Дэмжлэг ({totals.need_support})</div>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-700">{p.not_checked}%</div>
                  <div className="text-xs text-slate-600">⚪ Эзэмшээгүй ({totals.not_checked})</div>
                </div>
              </div>
            </div>
          )
        })()}

        {currentGroup && (
          <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4">
            <div className="text-xs font-semibold text-slate-500 mb-2">2️⃣ СУДЛАГДАХУУН</div>
            <div className="flex gap-2 flex-wrap">
              {areasInGroup.map((a) => {
                const n = outcomes.filter((o) => o.area_code === a.code).length
                return (
                  <button key={a.code} onClick={() => setAreaCode(a.code)} className={`px-3 py-2 rounded-lg text-sm font-medium ${areaCode === a.code ? 'text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} style={areaCode === a.code ? { background: a.color || '#8b5cf6' } : {}}>
                    {a.icon} {a.name} ({n})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
        ) : !currentGroup ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">Бүлэг сонгоно уу</div>
        ) : !areaCode ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📚</div>
            <div>Судлагдахуун сонгоно уу</div>
          </div>
        ) : shownOutcomes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📚</div>
            <div>Суралцахуйн үр дүн олдсонгүй</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {shownOutcomes.map((o) => {
              const area = areas.find((a) => a.code === o.area_code)
              const st = outcomeStats(o)
              const marked = st.achieved + st.in_progress + st.need_support
              const pct = children.length > 0 ? Math.round((st.achieved / children.length) * 100) : 0
              const isOpen = expanded.has(o.id)
              return (
                <div key={o.id}>
                  <button onClick={() => setExpanded((prev) => { const s = new Set(prev); s.has(o.id) ? s.delete(o.id) : s.add(o.id); return s })} className="w-full p-4 text-left hover:bg-slate-50 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 text-slate-400">{isOpen ? '▼' : '▶'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {area && <span className="text-sm">{area.icon}</span>}
                        <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{o.code}</span>
                        <span className="text-xs font-semibold text-emerald-700">{pct}%</span>
                        <span className="text-xs text-slate-400">· {marked}/{children.length} тэмдэглэсэн</span>
                      </div>
                      <div className="text-sm text-slate-800 mt-1">{o.text}</div>
                      {children.length > 0 && (() => {
                        const p = {
                          achieved:     Math.round((st.achieved / children.length) * 100),
                          in_progress:  Math.round((st.in_progress / children.length) * 100),
                          need_support: Math.round((st.need_support / children.length) * 100),
                          not_checked:  Math.round((st.not_checked / children.length) * 100),
                        }
                        return (
                          <>
                            <div className="mt-2 flex h-3 rounded-full overflow-hidden bg-slate-100">
                              <div className="bg-emerald-500 transition-all" style={{ width: `${p.achieved}%` }} title={`Эзэмшсэн: ${p.achieved}%`} />
                              <div className="bg-blue-500 transition-all" style={{ width: `${p.in_progress}%` }} title={`Явцтай: ${p.in_progress}%`} />
                              <div className="bg-amber-500 transition-all" style={{ width: `${p.need_support}%` }} title={`Дэмжлэг: ${p.need_support}%`} />
                              <div className="bg-slate-300 transition-all" style={{ width: `${p.not_checked}%` }} title={`Тэмдэглээгүй: ${p.not_checked}%`} />
                            </div>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1.5">
                              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-emerald-700 font-medium">✅ Эзэмшсэн</span>
                                <span className="text-xs font-bold text-emerald-700">{p.achieved}% <span className="text-emerald-500 font-normal">({st.achieved})</span></span>
                              </div>
                              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-blue-700 font-medium">🔄 Явцтай</span>
                                <span className="text-xs font-bold text-blue-700">{p.in_progress}% <span className="text-blue-500 font-normal">({st.in_progress})</span></span>
                              </div>
                              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-amber-700 font-medium">🤝 Дэмжлэг</span>
                                <span className="text-xs font-bold text-amber-700">{p.need_support}% <span className="text-amber-500 font-normal">({st.need_support})</span></span>
                              </div>
                              <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-slate-600 font-medium">⚪ Эзэмшээгүй</span>
                                <span className="text-xs font-bold text-slate-600">{p.not_checked}% <span className="text-slate-500 font-normal">({st.not_checked})</span></span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
                      {children.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">Хүүхэд байхгүй</div>
                      ) : children.map((k) => {
                        const history = checksByOutcome.get(o.id)?.get(k.id) || []
                        const latest = history[0]
                        const status: Status = latest?.status || 'not_checked'
                        const meta = STATUS_META[status]
                        return (
                          <button key={k.id} onClick={() => openDialog(o, k)} disabled={!canEdit} className="w-full p-3 flex items-center gap-3 hover:bg-white text-left disabled:cursor-not-allowed">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ background: currentGroup.color }}>{k.first_name[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-800 truncate">{k.last_name}.{k.first_name}
                                {history.length > 0 && <span className="ml-2 text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">{history.length} ажиглалт</span>}
                              </div>
                              {latest?.note && <div className={`text-xs ${meta.text} truncate`}>{meta.icon} {latest.note}</div>}
                              {latest?.file_url && <div className="text-xs text-blue-600">📎 Нотлох баримттай</div>}
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg text-white text-xs font-medium ${meta.color}`}>{meta.icon} {meta.label}</div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {summaryScope && currentGroup && (() => {
        const targets = summaryScope === 'area' ? shownOutcomes : outcomes
        const scopeName = summaryScope === 'area' ? (areas.find((a) => a.code === areaCode)?.name || 'судлагдахуун') : 'Бүх судлагдахуун'
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs text-slate-500">📊 Нэгтгэл</div>
                  <div className="text-lg font-semibold text-slate-800">{currentGroup.name} · {scopeName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{children.length} хүүхэд · {targets.length} үр дүн</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => downloadSummary(summaryScope)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">📥 CSV татах</button>
                  <button onClick={() => setSummaryScope(null)} className="border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm">Хаах</button>
                </div>
              </div>
              <div className="overflow-auto flex-1 p-5">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="text-left p-2 border-b border-slate-200 font-semibold text-slate-600 text-xs">Код</th>
                      <th className="text-left p-2 border-b border-slate-200 font-semibold text-slate-600 text-xs">Судлагдахуун</th>
                      <th className="text-left p-2 border-b border-slate-200 font-semibold text-slate-600 text-xs min-w-[280px]">Үр дүн</th>
                      <th className="text-right p-2 border-b border-slate-200 font-semibold text-emerald-700 text-xs">✅ Эзэмшсэн</th>
                      <th className="text-right p-2 border-b border-slate-200 font-semibold text-blue-700 text-xs">🔄 Явцтай</th>
                      <th className="text-right p-2 border-b border-slate-200 font-semibold text-amber-700 text-xs">🤝 Дэмжлэг</th>
                      <th className="text-right p-2 border-b border-slate-200 font-semibold text-slate-600 text-xs">⚪ Эзэмш-үй</th>
                      <th className="text-left p-2 border-b border-slate-200 font-semibold text-slate-600 text-xs min-w-[180px]">Хувь</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((o) => {
                      const s = outcomeStats(o)
                      const areaName = areas.find((a) => a.code === o.area_code)?.name || o.area_code
                      const total = children.length
                      const p = total > 0 ? {
                        achieved: Math.round((s.achieved / total) * 100),
                        in_progress: Math.round((s.in_progress / total) * 100),
                        need_support: Math.round((s.need_support / total) * 100),
                        not_checked: Math.round((s.not_checked / total) * 100),
                      } : { achieved: 0, in_progress: 0, need_support: 0, not_checked: 0 }
                      return (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="p-2 border-b border-slate-100 font-mono text-xs text-slate-600 align-top">{o.code}</td>
                          <td className="p-2 border-b border-slate-100 text-xs text-slate-600 align-top">{areaName}</td>
                          <td className="p-2 border-b border-slate-100 text-slate-800 align-top">{o.text}</td>
                          <td className="p-2 border-b border-slate-100 text-right align-top"><span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">{p.achieved}%</span><div className="text-[10px] text-slate-500 mt-0.5">{s.achieved} хүүхэд</div></td>
                          <td className="p-2 border-b border-slate-100 text-right align-top"><span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">{p.in_progress}%</span><div className="text-[10px] text-slate-500 mt-0.5">{s.in_progress} хүүхэд</div></td>
                          <td className="p-2 border-b border-slate-100 text-right align-top"><span className="inline-block bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">{p.need_support}%</span><div className="text-[10px] text-slate-500 mt-0.5">{s.need_support} хүүхэд</div></td>
                          <td className="p-2 border-b border-slate-100 text-right align-top"><span className="inline-block bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">{p.not_checked}%</span><div className="text-[10px] text-slate-500 mt-0.5">{s.not_checked} хүүхэд</div></td>
                          <td className="p-2 border-b border-slate-100 align-top">
                            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                              <div className="bg-emerald-500" style={{ width: `${p.achieved}%` }} />
                              <div className="bg-blue-500" style={{ width: `${p.in_progress}%` }} />
                              <div className="bg-amber-500" style={{ width: `${p.need_support}%` }} />
                              <div className="bg-slate-300" style={{ width: `${p.not_checked}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {dialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="text-xs text-slate-500 mb-1">{dialog.outcome.code}</div>
              <div className="text-sm text-slate-800 mb-2">{dialog.outcome.text}</div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-800">👧 {dialog.child.last_name}.{dialog.child.first_name}</div>
                <button onClick={() => setDialog(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
              </div>
            </div>

            {dialog.history.length > 0 && (
              <div className="p-5 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-2">📜 АЖИГЛАЛТЫН ТҮҮХ ({dialog.history.length})</div>
                <div className="space-y-2">
                  {dialog.history.map((h, i) => {
                    const meta = STATUS_META[h.status]
                    return (
                      <div key={h.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs text-white font-medium ${meta.color}`}>{meta.icon} {meta.label}</span>
                          <span className="text-xs text-slate-500">🗓 {new Date(h.checked_at).toLocaleString('mn-MN')}</span>
                          {i === 0 && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">СҮҮЛИЙН</span>}
                          <button onClick={() => removeCheck(h.id)} className="ml-auto text-red-600 hover:text-red-800 text-xs">Устгах</button>
                        </div>
                        {h.note && <div className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">{h.note}</div>}
                        {h.file_url && <a href={h.file_url} target="_blank" rel="noopener" className="inline-block mt-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded">📎 Нотлох баримт</a>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="p-5 space-y-3">
              <div className="text-xs font-semibold text-slate-500 mb-1">➕ ШИНЭ АЖИГЛАЛТ</div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Үнэлгээ</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['achieved','in_progress','need_support'] as Status[]).map((s) => (
                    <button key={s} onClick={() => setDlgStatus(s)} className={`px-3 py-2 rounded-lg text-sm font-medium ${dlgStatus === s ? `${STATUS_META[s].color} text-white` : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                      {STATUS_META[s].icon} {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Тэмдэглэл</label>
                <textarea rows={3} value={dlgNote} onChange={(e) => setDlgNote(e.target.value)} placeholder="Ажиглалт, дэлгэрэнгүй тайлбар..." className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">📎 Зураг / 🎥 Бичлэг / Файл</label>
                <input type="file" accept="image/*,video/*,.pdf" onChange={(e) => setDlgFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setDialog(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">Хаах</button>
                <button onClick={saveDialog} disabled={dlgSaving} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white rounded-lg font-medium">{dlgSaving ? '...' : '+ Ажиглалт нэмэх'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
