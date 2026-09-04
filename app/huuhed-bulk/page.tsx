'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { useMe, canSeeAllChildren } from '@/lib/useMe'

type Group = { id: number; code: string; name: string; icon: string; color: string }

export default function HuuhedBulkPage() {
  const supabase = useMemo(() => createClient(), [])
  const { me, loading: meLoading } = useMe()
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: number; fail: number; errors: string[] }>({ ok: 0, fail: 0, errors: [] })

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('groups').select('id, code, name, icon, color').not('code', 'in', '(hogjim,huvilbart)').order('id')
      const gs = (data as Group[]) || []
      setGroups(gs)
      if (me) {
        if (canSeeAllChildren(me.role, me.is_admin)) setGroupId((prev) => prev ?? gs[0]?.id ?? null)
        else if (me.groups.length > 0) setGroupId((prev) => prev ?? me.groups[0].id)
      }
    })()
  }, [me, supabase])

  const availableGroups = me && !canSeeAllChildren(me.role, me.is_admin)
    ? groups.filter((g) => me.groups.some((mg) => mg.id === g.id))
    : groups

  async function submit() {
    if (!groupId) { alert('Бүлэг сонгоно уу'); return }
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) { alert('Хүүхдийн нэрсийг бичнэ үү'); return }
    setSaving(true)
    const rows: { last_name: string; first_name: string; birth_date?: string; gender?: string; group_id: number; status: string }[] = []
    const errors: string[] = []
    lines.forEach((line, i) => {
      const parts = line.split(/[,;\t]/).map((s) => s.trim())
      const nameFull = parts[0] || ''
      const birth = parts[1] || ''
      const genderRaw = (parts[2] || '').toLowerCase()
      const nameParts = nameFull.split(/[.\s]+/).filter(Boolean)
      let last_name = '', first_name = ''
      if (nameParts.length >= 2) { last_name = nameParts[0]; first_name = nameParts.slice(1).join(' ') }
      else if (nameParts.length === 1) { first_name = nameParts[0]; last_name = '' }
      else { errors.push(`Мөр ${i + 1}: нэр буруу`); return }
      const gender = ['эр','er','male','m','б','boy'].includes(genderRaw) ? 'male' : ['эм','em','female','f','г','girl'].includes(genderRaw) ? 'female' : null
      rows.push({
        last_name, first_name,
        birth_date: birth || undefined,
        gender: gender || undefined,
        group_id: groupId,
        status: 'active',
      })
    })
    if (rows.length === 0) {
      setSaving(false)
      setResult({ ok: 0, fail: lines.length, errors })
      return
    }
    const { data, error } = await supabase.from('children').insert(rows).select('id')
    setSaving(false)
    if (error) {
      setResult({ ok: 0, fail: rows.length, errors: [error.message, ...errors] })
      return
    }
    setResult({ ok: (data || []).length, fail: errors.length, errors })
    setText('')
  }

  if (meLoading) return <div className="p-8 text-slate-500">Ачааллаж байна...</div>
  if (!me) return null

  const currentGroup = groups.find((g) => g.id === groupId)

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">👧👦 Хүүхэд бөөнөөр нэмэх</h1>
            <p className="text-sm text-slate-500 mt-1">Нэг мөрөнд нэг хүүхэд · Формат: <code className="bg-slate-100 px-1.5 py-0.5 rounded">Овог.Нэр, төрсөн_огноо, хүйс</code></p>
          </div>
          <Link href="/miny-buleg" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">← Буцах</Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Бүлэг сонгох</label>
          <div className="flex gap-2 flex-wrap">
            {availableGroups.map((g) => (
              <button key={g.id} onClick={() => setGroupId(g.id)} className={`px-3 py-2 rounded-lg text-sm font-medium ${groupId === g.id ? 'text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} style={groupId === g.id ? { background: g.color } : {}}>
                {g.icon} {g.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <div className="text-sm font-medium text-slate-700 mb-2">📋 Хүүхдийн жагсаалт (нэг мөрөнд нэг хүүхэд)</div>
          <div className="text-xs text-slate-500 mb-2 bg-slate-50 rounded p-2">
            <div className="font-semibold mb-1">Формат жишээ:</div>
            <div><code>Ц.Батбаяр, 2020-05-12, эр</code></div>
            <div><code>Д.Оюунчимэг, 2020-08-20, эм</code></div>
            <div><code>Б.Мөнхөө, , эр</code> (огноо оруулахгүй бол хоосон үлдээ)</div>
            <div><code>Т.Азжаргал</code> (зөвхөн нэр)</div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={15}
            placeholder="Ц.Батбаяр, 2020-05-12, эр&#10;Д.Оюунчимэг, 2020-08-20, эм&#10;..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-slate-500">Мөрийн тоо: {text.split(/\r?\n/).filter((l) => l.trim()).length}</div>
            <button onClick={submit} disabled={saving || !groupId || !text.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg font-semibold">
              {saving ? '⏳ Хадгалж байна...' : `💾 ${currentGroup?.name || 'Бүлэг'}-т нэмэх`}
            </button>
          </div>
        </div>

        {(result.ok > 0 || result.fail > 0) && (
          <div className={`rounded-2xl border p-4 ${result.ok > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="font-semibold text-slate-800">
              {result.ok > 0 && <span className="text-emerald-700">✅ {result.ok} хүүхэд амжилттай нэмэгдлээ</span>}
              {result.fail > 0 && <span className="text-red-700 ml-3">❌ {result.fail} алдаа</span>}
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                {result.errors.map((e, i) => <li key={i}>⚠️ {e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
