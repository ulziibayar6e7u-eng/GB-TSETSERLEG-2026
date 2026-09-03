'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'

type Notif = {
  id: string
  category: string
  title: string
  message: string | null
  link: string | null
  seen: boolean
  created_at: string
}

const ICONS: Record<string, string> = {
  observation: '🎯',
  plan: '📅',
  assessment: '📊',
  attendance: '⏰',
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s} сек`
  if (s < 3600) return `${Math.floor(s / 60)} мин`
  if (s < 86400) return `${Math.floor(s / 3600)} цаг`
  return `${Math.floor(s / 86400)} өдөр`
}

export default function NotifBell() {
  const supabase = useMemo(() => createClient(), [])
  const { me } = useMe()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)

  async function load() {
    if (!me) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`recipient_role.eq.${me.role},recipient_employee_id.eq.${me.id}`)
      .order('created_at', { ascending: false })
      .limit(30)
    const list = (data as Notif[]) || []
    setItems(list)
    setUnread(list.filter((n) => !n.seen).length)
  }

  useEffect(() => {
    if (!me) return
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [me])

  async function markAllSeen() {
    if (!me) return
    await supabase
      .from('notifications')
      .update({ seen: true, seen_at: new Date().toISOString() })
      .or(`recipient_role.eq.${me.role},recipient_employee_id.eq.${me.id}`)
      .eq('seen', false)
    load()
  }

  if (!me) return null

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllSeen() }}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        title="Мэдэгдэл"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <div className="font-semibold text-slate-800 text-sm">Мэдэгдэл</div>
              <span className="text-xs text-slate-500">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Мэдэгдэл байхгүй</div>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || '#'}
                    onClick={() => setOpen(false)}
                    className={`block px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 ${!n.seen ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-lg">{ICONS[n.category] || '🔔'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{n.title}</div>
                        {n.message && (
                          <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
