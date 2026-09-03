'use client'

import { useMe, setImpersonation } from '@/lib/useMe'

const ROLE_LABEL: Record<string, string> = {
  erhlegch: 'Эрхлэгч',
  arga_zuich: 'Арга зүйч',
  bagsh: 'Багш',
  bagsh_tuslah: 'Багшийн туслах',
  busad: 'Ажилтан',
  ecgeh: 'Эцэг эх',
}

function handleExit(e: React.MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  try {
    localStorage.removeItem('impersonate_employee_id')
  } catch {}
  setImpersonation(null)
  // Fallback: nav to root
  setTimeout(() => {
    if (typeof window !== 'undefined') window.location.href = '/'
  }, 100)
}

export default function ImpersonateBar() {
  const { me, loading } = useMe()
  if (loading || !me?.impersonating) return null
  return (
    <div
      className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between sticky top-0 z-[100] relative"
      style={{ pointerEvents: 'auto' }}
    >
      <div>
        👁 Түр харагдац: <b>{me.last_name}.{me.first_name}</b>
        {' · '}
        {me.positions?.name || ROLE_LABEL[me.role]}
      </div>
      <button
        type="button"
        onMouseDown={handleExit}
        onClick={handleExit}
        className="bg-white hover:bg-white/90 text-amber-700 px-4 py-1.5 rounded font-semibold text-xs shadow relative z-[101]"
        style={{ pointerEvents: 'auto' }}
      >
        ✕ Өөрийн эрхэд буцах
      </button>
    </div>
  )
}
