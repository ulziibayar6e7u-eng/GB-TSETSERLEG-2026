'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Group = { id: number; name: string; nickname: string | null; icon: string; color: string }
type Child = {
  id: string
  registration_no: string | null
  last_name: string
  first_name: string
  birth_date: string | null
  gender: string | null
  group_id: number | null
  enrolled_date: string | null
  notes: string | null
  status: string
  groups?: Group
}

function HuuhedInner() {
  const searchParams = useSearchParams()
  const groupFromUrl = searchParams.get('group')

  const [children, setChildren] = useState<Child[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [groupFilter, setGroupFilter] = useState(groupFromUrl || '')
  const [search, setSearch] = useState('')

  const [mode, setMode] = useState<'single' | 'bulk' | null>(null)
  const [editing, setEditing] = useState<Child | null>(null)

  const [single, setSingle] = useState({
    last_name: '',
    first_name: '',
    birth_date: '',
    gender: '',
    group_id: '',
    registration_no: '',
    notes: '',
  })

  const [bulkText, setBulkText] = useState('')
  const [bulkGroupId, setBulkGroupId] = useState('')

  async function load() {
    setLoading(true)
    const [c, g] = await Promise.all([
      supabase.from('children').select('*, groups(*)').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('id'),
    ])
    setChildren((c.data as Child[]) || [])
    setGroups((g.data as Group[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openSingle(child: Child | null = null) {
    if (child) {
      setEditing(child)
      setSingle({
        last_name: child.last_name,
        first_name: child.first_name,
        birth_date: child.birth_date || '',
        gender: child.gender || '',
        group_id: child.group_id?.toString() || '',
        registration_no: child.registration_no || '',
        notes: child.notes || '',
      })
    } else {
      setEditing(null)
      setSingle({
        last_name: '',
        first_name: '',
        birth_date: '',
        gender: '',
        group_id: groupFromUrl || '',
        registration_no: '',
        notes: '',
      })
    }
    setMode('single')
  }

  async function saveSingle(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      last_name: single.last_name.trim(),
      first_name: single.first_name.trim(),
      birth_date: single.birth_date || null,
      gender: single.gender || null,
      group_id: single.group_id ? parseInt(single.group_id) : null,
      registration_no: single.registration_no || null,
      notes: single.notes || null,
    }
    if (editing) {
      await supabase.from('children').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('children').insert(payload)
    }
    setMode(null)
    load()
  }

  async function saveBulk() {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return
    const gid = bulkGroupId ? parseInt(bulkGroupId) : null
    const rows = lines.map((line) => {
      const parts = line.split(/[\t,;|]/).map((p) => p.trim())
      const [lastFirst, birth, gender] = parts
      const nameParts = lastFirst.split('.').map((s) => s.trim())
      let last_name = ''
      let first_name = lastFirst
      if (nameParts.length >= 2) {
        last_name = nameParts[0]
        first_name = nameParts.slice(1).join('.')
      }
      return {
        last_name,
        first_name,
        birth_date: birth || null,
        gender: gender || null,
        group_id: gid,
      }
    })
    const { error } = await supabase.from('children').insert(rows)
    if (error) {
      alert('Алдаа: ' + error.message)
    } else {
      alert(`${rows.length} хүүхэд нэмэгдлээ`)
      setMode(null)
      setBulkText('')
      load()
    }
  }

  async function remove(child: Child) {
    if (!confirm(`"${child.last_name}.${child.first_name}"-г устгах уу?`)) return
    await supabase.from('children').delete().eq('id', child.id)
    load()
  }

  const filtered = children.filter((c) => {
    const name = `${c.last_name}.${c.first_name}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchGroup = !groupFilter || c.group_id?.toString() === groupFilter
    return matchSearch && matchGroup
  })

  function age(birth: string | null) {
    if (!birth) return '-'
    const b = new Date(birth)
    const now = new Date()
    let a = now.getFullYear() - b.getFullYear()
    const m = now.getMonth() - b.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
    return `${a} нас`
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Хүүхдийн бүртгэл</h1>
              <p className="text-sm text-slate-500 mt-1">
                Нийт <span className="font-semibold text-blue-600">{children.length}</span> хүүхэд
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openSingle()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition"
              >
                + Хүүхэд нэмэх
              </button>
              <button
                onClick={() => {
                  setBulkGroupId(groupFromUrl || '')
                  setMode('bulk')
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition"
              >
                📋 Бөөнөөр нэмэх
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Хайх (нэрээр)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Бүх бүлэг</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Ачааллаж байна...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="text-5xl mb-3">👧</div>
              <div>Хүүхэд бүртгэгдээгүй байна</div>
              <button
                onClick={() => openSingle()}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Эхний хүүхдийг нэмэх →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="px-4 py-3">№</th>
                    <th className="px-4 py-3">Нэр</th>
                    <th className="px-4 py-3">Нас</th>
                    <th className="px-4 py-3">Хүйс</th>
                    <th className="px-4 py-3">Бүлэг</th>
                    <th className="px-4 py-3">Элссэн</th>
                    <th className="px-4 py-3 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c, i) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ background: c.groups?.color || '#3b82f6' }}
                          >
                            {c.first_name[0]}
                          </div>
                          <div className="font-medium text-slate-800">
                            {c.last_name}.{c.first_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{age(c.birth_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {c.gender === 'male' ? '♂ Хүү' : c.gender === 'female' ? '♀ Охин' : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {c.groups ? (
                          <span
                            className="text-xs px-2 py-1 rounded-full font-medium text-white"
                            style={{ background: c.groups.color }}
                          >
                            {c.groups.icon} {c.groups.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Хуваарилаагүй</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.enrolled_date || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openSingle(c)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                        >
                          Засах
                        </button>
                        <button
                          onClick={() => remove(c)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Устгах
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {mode === 'single' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">
                {editing ? 'Хүүхэд засах' : 'Шинэ хүүхэд нэмэх'}
              </h2>
            </div>
            <form onSubmit={saveSingle} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Эцгийн нэр
                  </label>
                  <input
                    required
                    maxLength={5}
                    value={single.last_name}
                    onChange={(e) => setSingle({ ...single, last_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Б"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Нэр</label>
                  <input
                    required
                    value={single.first_name}
                    onChange={(e) => setSingle({ ...single, first_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Бат"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Төрсөн огноо
                  </label>
                  <input
                    type="date"
                    value={single.birth_date}
                    onChange={(e) => setSingle({ ...single, birth_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Хүйс</label>
                  <select
                    value={single.gender}
                    onChange={(e) => setSingle({ ...single, gender: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Сонгох</option>
                    <option value="male">Хүү</option>
                    <option value="female">Охин</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Бүлэг</label>
                <select
                  value={single.group_id}
                  onChange={(e) => setSingle({ ...single, group_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Хуваарилаагүй</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Бүртгэлийн дугаар (регистр)
                </label>
                <input
                  value={single.registration_no}
                  onChange={(e) => setSingle({ ...single, registration_no: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="XX00000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тэмдэглэл</label>
                <textarea
                  rows={2}
                  value={single.notes}
                  onChange={(e) => setSingle({ ...single, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  {editing ? 'Хадгалах' : 'Нэмэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mode === 'bulk' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">Хүүхдүүдийг бөөнөөр нэмэх</h2>
              <p className="text-sm text-slate-500 mt-1">
                Excel-ээс хуулж эсвэл мөр тус бүрээр бичнэ. Формат: <code className="bg-slate-100 px-1.5 py-0.5 rounded">Овог.Нэр, Төрсөн огноо, Хүйс</code>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Аль бүлэгт нэмэх вэ?
                </label>
                <select
                  value={bulkGroupId}
                  onChange={(e) => setBulkGroupId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Хуваарилаагүй</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Хүүхдийн жагсаалт (мөр тутамд нэг хүүхэд)
                </label>
                <textarea
                  rows={12}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Б.Бат, 2020-03-15, male\nС.Сараа, 2020-05-20, female\nД.Дорж, 2019-11-08, male`}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <div className="text-xs text-slate-500 mt-1">
                  Огноо (YYYY-MM-DD) болон хүйс (male/female) заавал биш.
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMode(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Болих
                </button>
                <button
                  onClick={saveBulk}
                  disabled={!bulkText.trim()}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
                >
                  Бөөнөөр нэмэх
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HuuhedPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Ачааллаж байна...</div>}>
      <HuuhedInner />
    </Suspense>
  )
}
