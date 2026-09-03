'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe, setImpersonation } from '@/lib/useMe'

type Emp = { id: string; last_name: string; first_name: string; role: string; positions?: { name: string } }

const ROLE_LABEL: Record<string, string> = {
  erhlegch: 'Эрхлэгч',
  arga_zuich: 'Арга зүйч',
  bagsh: 'Багш',
  bagsh_tuslah: 'Багшийн туслах',
  busad: 'Ажилтан',
  ecgeh: 'Эцэг эх',
}

export default function ImpersonatePicker() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const [open, setOpen] = useState(false)
  const [emps, setEmps] = useState<Emp[]>([])
  const [search, setSearch] = useState('')

  const isRealAdmin = me?.real_is_admin || (me?.is_admin && !me?.impersonating)

  useEffect(() => {
    if (!open || emps.length > 0) return
    ;(async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, last_name, first_name, role, positions(name)')
        .order('first_name')
      setEmps((data as unknown as Emp[]) || [])
    })()
  }, [open, emps.length, supabase])

  if (!me || !isRealAdmin) return null

  const filtered = emps.filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      (e.positions?.name || '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Хэн шиг харах"
        className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">👁 Хэн шиг харах</h2>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Нэрээр хайх..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {emps.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Ачааллаж байна...</div>
              ) : (
                filtered.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setImpersonation(e.id) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100"
                  >
                    <div className="font-medium text-slate-800 text-sm">{e.last_name}.{e.first_name}</div>
                    <div className="text-xs text-slate-500">{e.positions?.name || ROLE_LABEL[e.role]}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
