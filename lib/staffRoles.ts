export type BusadRole = 'emch' | 'togooch' | 'nyarav' | 'nyagtlan' | 'uilchleg' | 'haruul' | 'other'

export function detectRole(positionName?: string): BusadRole {
  const p = (positionName || '').toLowerCase()
  if (p.includes('эмч')) return 'emch'
  if (p.includes('тогооч') || p.includes('гал тогоо')) return 'togooch'
  if (p.includes('нярав')) return 'nyarav'
  if (p.includes('нягтлан')) return 'nyagtlan'
  if (p.includes('үйлчлэг')) return 'uilchleg'
  if (p.includes('харуул') || p.includes('хамгаал')) return 'haruul'
  return 'other'
}

export const ROLE_META: Record<BusadRole, { icon: string; label: string; path: string; color: string }> = {
  emch:      { icon: '🩺', label: 'Эмч',                path: '/busad/emch',       color: 'from-red-500 to-rose-600' },
  togooch:   { icon: '👨‍🍳', label: 'Тогооч',            path: '/busad/togooch',    color: 'from-orange-500 to-amber-600' },
  nyarav:    { icon: '📦', label: 'Нярав',              path: '/busad/nyarav',     color: 'from-cyan-500 to-blue-600' },
  nyagtlan:  { icon: '💰', label: 'Нягтлан',            path: '/busad/nyagtlan',   color: 'from-emerald-500 to-green-600' },
  uilchleg:  { icon: '🧹', label: 'Үйлчлэгч',           path: '/busad/log',        color: 'from-teal-500 to-cyan-600' },
  haruul:    { icon: '🛡', label: 'Харуул хамгаалалт', path: '/busad/log',        color: 'from-slate-600 to-slate-800' },
  other:     { icon: '👤', label: 'Бусад',              path: '/busad/log',        color: 'from-purple-500 to-fuchsia-600' },
}
