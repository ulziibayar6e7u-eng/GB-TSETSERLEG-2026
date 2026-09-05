'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useMe } from '@/lib/useMe'
import NotifBell from './NotifBell'
import ImpersonatePicker from './ImpersonatePicker'

type MenuItem = { href: string; label: string; icon: string }
type MenuSection = { title?: string; items: MenuItem[] }

const ROLE_LABELS: Record<string, string> = {
  erhlegch: 'Эрхлэгч',
  arga_zuich: 'Арга зүйч',
  bagsh: 'Багш',
  bagsh_tuslah: 'Багшийн туслах',
  busad: 'Ажилтан',
  ecgeh: 'Эцэг эх',
}

type Me = {
  id: string
  last_name: string
  first_name: string
  role: string
  is_admin: boolean
  positions?: { name: string }
  groups: { id: number; code: string; name: string; icon: string }[]
  clubs: { id: number; name: string; icon: string }[]
}

// Багш бүрд харагдах цэс (өөрийн ажлын орон зай)
function bagshMenu(me: Me): MenuSection[] {
  const isMusicTeacher = me.groups.some((g) => g.code === 'hogjim') || me.first_name === 'Өлзийбаяр'
  const isTuslah = me.role === 'bagsh_tuslah'

  const workspaceItems = isTuslah
    ? [{ href: '/miny-tuslah', label: 'Миний ажлын хэсэг', icon: '🧑‍🤝‍🧑' }]
    : isMusicTeacher
    ? [{ href: '/hogjim', label: 'Хөгжмийн модуль', icon: '🎵' }]
    : []

  const sections: MenuSection[] = [
    { items: [{ href: '/', label: 'Нүүр', icon: '🏠' }] },
    ...(workspaceItems.length > 0 ? [{ title: 'Миний ажлын орон зай', items: workspaceItems }] : []),
    {
      title: 'Өдөр тутам',
      items: [
        { href: '/irts', label: 'Ирц', icon: '⏰' },
        { href: '/juuru', label: 'Жижүүр багш', icon: '🛎' },
        { href: '/uil-ajilgaa', label: 'Сургалт, үйл ажиллагаа', icon: '📸' },
        { href: '/dugilan', label: 'Дугуйлан', icon: '🎨' },
        { href: '/hutulbur', label: 'Хөтөлбөрийн хэрэгжилт', icon: '📚' },
        { href: '/bagts', label: 'Хөтөлбөрийн бэлэн багц', icon: '📦' },
        { href: '/heregleg', label: 'Хэрэглэгдэхүүн, хөтөлбөр', icon: '📎' },
      ],
    },
    {
      title: 'Ажил үүрэг',
      items: [
        { href: '/tulvluguu-bail', label: 'Байгууллагын төлөвлөгөө', icon: '📆' },
        { href: '/uureg', label: 'Үүрэг даалгавар', icon: '📌' },
        { href: '/sanaachlaga', label: 'Санаачилсан ажил', icon: '💡' },
        { href: '/chuluu', label: 'Чөлөө', icon: '📅' },
      ],
    },
    {
      title: 'Харилцаа',
      items: [
        { href: '/zurvas', label: 'Эцэг эхтэй чат', icon: '💬' },
        { href: '/zar', label: 'Зар мэдээ', icon: '📢' },
      ],
    },
  ]
  return sections
}

// Багшийн туслахын цэс
function tuslahMenu(me: Me): MenuSection[] {
  const primaryGroup = me.groups[0]
  return [
    { items: [{ href: '/', label: 'Нүүр', icon: '🏠' }] },
    {
      title: 'Миний ажлын хэсэг',
      items: [
        { href: `/tuslah/${me.id}?tab=dadal`,       label: 'Хүүхдийн дадал хэвшил',   icon: '🌱' },
        { href: `/tuslah/${me.id}?tab=ahits`,       label: 'Хүүхдийн ахиц, судалгаа', icon: '📈' },
        { href: `/tuslah/${me.id}?tab=sanaachlaga`, label: 'Санаачилсан ажил',         icon: '💡' },
      ],
    },
    {
      title: 'Цэвэрлэгээ, үйлчилгээ',
      items: [
        { href: '/busad/tsevrlgee', label: 'Цэвэрлэгээ, үйлчилгээ', icon: '🧹' },
      ],
    },
    {
      title: 'Ажил үүрэг',
      items: [
        { href: '/uureg', label: 'Үүрэг даалгавар', icon: '📌' },
      ],
    },
    {
      title: 'Харилцаа',
      items: [
        { href: '/zurvas', label: 'Зурвас', icon: '💬' },
        { href: '/zar', label: 'Зар мэдээ', icon: '📢' },
      ],
    },
  ]
}

// Арга зүйчийн цэс
function argaZuichMenu(): MenuSection[] {
  return [
    { items: [{ href: '/', label: 'Нүүр', icon: '🏠' }] },
    {
      title: 'Батламжийн ширээ',
      items: [
        { href: '/batlamj', label: 'Батламжийн ширээ', icon: '🏆' },
      ],
    },
    {
      title: 'Хяналт',
      items: [
        { href: '/bagsh', label: 'Багш нар', icon: '👩‍🏫' },
        { href: '/uil-ajilgaa', label: 'Сургалт, үйл ажиллагаа', icon: '📸' },
        { href: '/hutulbur', label: 'Хөтөлбөрийн хэрэгжилт', icon: '📚' },
        { href: '/bagts', label: 'Хөтөлбөрийн бэлэн багц', icon: '📦' },
        { href: '/heregleg', label: 'Хэрэглэгдэхүүн, хөтөлбөр', icon: '📎' },
        { href: '/irts', label: 'Ирц', icon: '⏰' },
        { href: '/juuru', label: 'Жижүүр багшийн хуваарь', icon: '🛎' },
      ],
    },
    {
      title: 'Үйл ажиллагаа',
      items: [
        { href: '/dugilan', label: 'Дугуйлангийн үйл ажиллагаа', icon: '🎨' },
        { href: '/huuhed', label: 'Хүүхдүүд', icon: '👧' },
        { href: '/hamgaalal', label: 'Хүүхэд хамгаалал', icon: '🛡' },
      ],
    },
    {
      title: 'Ажил үүрэг',
      items: [
        { href: '/uureg', label: 'Үүрэг даалгавар', icon: '📌' },
        { href: '/sanaachlaga', label: 'Санаачилсан ажил', icon: '💡' },
        { href: '/chuluu', label: 'Чөлөө', icon: '📅' },
        { href: '/zar', label: 'Зар мэдээ', icon: '📢' },
      ],
    },
  ]
}

// Эрхлэгчийн цэс
function erhlegchMenu(): MenuSection[] {
  return [
    { items: [{ href: '/', label: 'Нүүр', icon: '🏠' }] },
    {
      title: 'Батламжийн ширээ',
      items: [
        { href: '/batlamj', label: 'Батламжийн ширээ', icon: '🏆' },
      ],
    },
    {
      title: 'Хяналт',
      items: [
        { href: '/bagsh', label: 'Ажилтан бүрээр', icon: '👩‍🏫' },
        { href: '/guyeetgel', label: 'Гүйцэтгэлийн анализ', icon: '📈' },
        { href: '/uil-ajilgaa', label: 'Сургалт, үйл ажиллагаа', icon: '📸' },
        { href: '/hamgaalal', label: 'Хүүхэд хамгаалал', icon: '🛡' },
        { href: '/hutulbur', label: 'Хөтөлбөрийн хэрэгжилт', icon: '📚' },
        { href: '/heregleg', label: 'Хэрэглэгдэхүүн, хөтөлбөр', icon: '📎' },
        { href: '/irts-staff', label: 'Ажилтны ирц', icon: '⏰' },
        { href: '/juuru', label: 'Жижүүр багшийн тайлан', icon: '🛎' },
      ],
    },
    {
      title: 'Байгууллагын төлөвлөлт',
      items: [
        { href: '/tulvluguu-bail', label: 'Байгууллагын төлөвлөгөө', icon: '📆' },
      ],
    },
    {
      title: 'Байгууллага',
      items: [
        { href: '/ajiltan', label: 'Ажилтны удирдлага', icon: '👥' },
        { href: '/dugilan', label: 'Дугуйлангийн үйл ажиллагаа', icon: '🎨' },
        { href: '/huuhed', label: 'Хүүхдийн бүртгэл', icon: '👧' },
        { href: '/busad', label: 'Бусад ажилтан', icon: '👤' },
      ],
    },
    {
      title: 'Мэдээлэл',
      items: [
        { href: '/uureg', label: 'Үүрэг даалгавар', icon: '📌' },
        { href: '/sanaachlaga', label: 'Санаачилсан ажил', icon: '💡' },
        { href: '/chuluu', label: 'Чөлөө', icon: '📅' },
        { href: '/zar', label: 'Зар мэдээ', icon: '📢' },
      ],
    },
    {
      title: 'Тохиргоо',
      items: [
        { href: '/togtsoo', label: 'Систем тохиргоо', icon: '⚙️' },
      ],
    },
  ]
}

function busadMenu(me?: Me): MenuSection[] {
  const positionName = me?.positions?.name || ''
  const p = positionName.toLowerCase()
  const isTogooch  = p.includes('тогооч') && !p.includes('туслах')
  const isKitchenAssist = p.includes('гал тогоо') && p.includes('туслах')
  const isUilchleg = p.includes('үйлчлэг')
  const isCleaner  = isKitchenAssist || isUilchleg

  const workspaceItems: MenuItem[] = []
  if (p.includes('эмч'))          workspaceItems.push({ href: '/busad/emch',     label: 'Эрүүл мэндийн хэсэг', icon: '🩺' })
  else if (isTogooch)             workspaceItems.push({ href: '/busad/togooch',  label: 'Хоолны цэс',         icon: '👨‍🍳' })
  else if (p.includes('нярав'))   workspaceItems.push({ href: '/busad/nyarav',   label: 'Нөөц удирдлага',     icon: '📦' })
  else if (p.includes('нягтлан')) workspaceItems.push({ href: '/busad/nyagtlan', label: 'Санхүүгийн бүртгэл', icon: '💰' })
  else                            workspaceItems.push({ href: '/busad/log',      label: 'Өдрийн тайлан',      icon: '📓' })

  if (isCleaner) {
    workspaceItems.push({ href: '/busad/tsevrlgee', label: 'Их цэвэрлэгээний хуваарь', icon: '🧹' })
  }

  const sections: MenuSection[] = [
    { items: [{ href: '/', label: 'Нүүр', icon: '🏠' }] },
    { title: 'Миний ажлын хэсэг', items: workspaceItems },
    {
      title: 'Ажил',
      items: [
        { href: '/tulvluguu-bail', label: 'Байгууллагын төлөвлөгөө', icon: '📆' },
        { href: '/uureg', label: 'Үүрэг даалгавар', icon: '📌' },
        { href: '/sanaachlaga', label: 'Санаачилсан ажил', icon: '💡' },
        { href: '/chuluu', label: 'Чөлөө', icon: '📅' },
      ],
    },
    {
      title: 'Харилцаа',
      items: isTogooch
        ? [{ href: '/zar', label: 'Зар мэдээ', icon: '📢' }]
        : [
            { href: '/zurvas', label: 'Зурвас', icon: '💬' },
            { href: '/zar', label: 'Зар мэдээ', icon: '📢' },
          ],
    },
  ]
  return sections
}

function ecgehMenu(): MenuSection[] {
  return [
    { items: [{ href: '/', label: 'Нүүр', icon: '🏠' }] },
    {
      title: 'Миний хүүхэд',
      items: [
        { href: '/miny-huuhed', label: 'Хүүхэд', icon: '👧' },
        { href: '/miny-huuhed/hugjil', label: 'Хөгжил', icon: '📊' },
        { href: '/miny-huuhed/uneljl', label: 'Өнөөдөр', icon: '📸' },
      ],
    },
    {
      title: 'Харилцаа',
      items: [
        { href: '/zurvas', label: 'Багштай чат', icon: '💬' },
        { href: '/zar', label: 'Зар мэдээ', icon: '📢' },
      ],
    },
  ]
}

function menuFor(me: Me | null): MenuSection[] {
  if (!me) return [{ items: [{ href: '/', label: 'Нүүр', icon: '🏠' }] }]
  // Хөгжмийн багш is_admin эсэх нь хамаагүй — хөгжмийн багшийн цэсээ л хардаг
  const isMusic = me.first_name === 'Өлзийбаяр' || me.groups?.some((g) => g.code === 'hogjim')
  if (isMusic && me.role === 'bagsh') return bagshMenu(me)
  if (me.is_admin) return erhlegchMenu()
  switch (me.role) {
    case 'erhlegch':   return erhlegchMenu()
    case 'arga_zuich': return argaZuichMenu()
    case 'bagsh':      return bagshMenu(me)
    case 'bagsh_tuslah': return tuslahMenu(me)
    case 'ecgeh':      return ecgehMenu()
    default:           return busadMenu(me)
  }
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { me: hookMe } = useMe()
  const me: Me | null = hookMe as unknown as Me | null

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const sections = menuFor(me)

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow-md border border-slate-200"
        aria-label="Цэс"
      >
        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
              Г
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 text-sm leading-tight truncate">
                Гурванбулаг Цэцэрлэг
              </h1>
              <p className="text-xs text-slate-500 truncate">Удирдлагын систем</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {sections.map((section, si) => (
            <div key={si} className={si > 0 ? 'mt-4' : ''}>
              {section.title && (
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg w-6 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          {me ? (
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {me.first_name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {me.last_name}.{me.first_name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {me.positions?.name || ROLE_LABELS[me.role]}
                  {me.is_admin && ' · Админ'}
                </div>
              </div>
              <NotifBell />
              <ImpersonatePicker />
              <button
                onClick={logout}
                title="Гарах"
                className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 px-2 py-2">Ачааллаж байна...</div>
          )}
        </div>
      </aside>
    </>
  )
}
