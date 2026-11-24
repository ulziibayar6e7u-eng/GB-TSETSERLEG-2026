// Word татах API-уудад (ажиглалт, туслахын бүртгэл) хамтдаа хэрэглэх серверийн туслах функцүүд.
// Лог-д нэр, холбоос бичихгүй.
import sharp from 'sharp'
import { createClient } from '@/lib/supabase-server'

export type Sb = Awaited<ReturnType<typeof createClient>>

export const BUCKET = 'org-plans'
export const MAX_IMAGES = 60
export const MAX_FRAMES = 40
export const IMG_MAX_PX = 640

const VIDEO_EXT = /\.(mp4|mov|webm|m4v|3gp|avi|mkv)$/i
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)$/i
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const PERIOD_RE = /^(all|\d{4}-(0[1-9]|1[0-2]))$/

const pathOf = (u: string) => { try { return new URL(u).pathname } catch { return '' } }
export const isVideoUrl = (u: string) => VIDEO_EXT.test(pathOf(u))
export const isDocUrl = (u: string) => DOC_EXT.test(pathOf(u))
// Файлын нэрийг (цагийн угтваргүй) харуулахад
export function fileLabel(u: string): string {
  try {
    const last = decodeURIComponent(pathOf(u).split('/').pop() || 'файл')
    return last.replace(/^\d{10,}_/, '')
  } catch { return 'файл' }
}

// "2026-11" -> [эхлэх, дараагийн сарын эхлэл)
export function monthRange(period: string): { from: string; to: string } | null {
  if (period === 'all') return null
  const [y, m] = period.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { from: `${period}-01`, to: next }
}

// Зөвхөн өөрийн Supabase-ийн org-plans bucket-ийн холбоосоос зам гаргаж авна (SSRF-ээс сэргийлнэ)
export function storagePathFromUrl(raw: string): string | null {
  try {
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    const u = new URL(raw)
    if (u.origin !== base.origin) return null
    const prefix = `/storage/v1/object/public/${BUCKET}/`
    if (!u.pathname.startsWith(prefix)) return null
    const p = decodeURIComponent(u.pathname.slice(prefix.length))
    if (!p || p.includes('..')) return null
    return p
  } catch { return null }
}

export type Img = { data: Buffer; w: number; h: number }

export async function loadImage(sb: Sb, url: string): Promise<Img | null> {
  const path = storagePathFromUrl(url)
  if (!path) { console.warn('export: media skip=bad-url'); return null }
  let buf: Buffer | null = null
  let why = ''
  try {
    const { data, error } = await sb.storage.from(BUCKET).download(path)
    if (!error && data) buf = Buffer.from(await data.arrayBuffer())
    else why = 'download:' + (error?.message || 'empty').slice(0, 60)
  } catch { why = 'download:throw' }
  if (!buf) {
    try {
      const res = await fetch(url) // url нь дээр шалгагдсан өөрийн Supabase host
      if (res.ok) buf = Buffer.from(await res.arrayBuffer())
      else why += ` fetch:${res.status}`
    } catch { why += ' fetch:throw' }
  }
  if (!buf) { console.warn('export: media skip=' + why); return null }
  try {
    const out = await sharp(buf).rotate().resize(IMG_MAX_PX, IMG_MAX_PX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 }).toBuffer({ resolveWithObject: true })
    return { data: out.data, w: out.info.width, h: out.info.height }
  } catch (e) {
    console.warn('export: media skip=sharp:' + String((e as Error)?.message).slice(0, 80))
    return null
  }
}

// Браузероос ирсэн кадрууд: зөвхөн allowed жагсаалтад байгаа түлхүүрийг хүлээж авна
export async function decodeFrames(frames: Record<string, string> | undefined, allowed: Set<string>): Promise<Map<string, Img>> {
  const map = new Map<string, Img>()
  let bytes = 0
  for (const [u, dataUrl] of Object.entries(frames || {}).slice(0, MAX_FRAMES)) {
    if (!allowed.has(u) || typeof dataUrl !== 'string') continue
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
    if (!m) continue
    const raw = Buffer.from(m[1], 'base64')
    bytes += raw.length
    if (raw.length > 600_000 || bytes > 4_000_000) continue
    try {
      // sharp-аар дахин кодлох нь жинхэнэ зураг эсэхийг батална
      const out = await sharp(raw).resize(IMG_MAX_PX, IMG_MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 }).toBuffer({ resolveWithObject: true })
      map.set(u, { data: out.data, w: out.info.width, h: out.info.height })
    } catch { /* алгасна */ }
  }
  return map
}
