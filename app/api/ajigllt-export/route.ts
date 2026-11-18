import { NextResponse } from 'next/server'
import sharp from 'sharp'
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak,
} from 'docx'
import { createClient } from '@/lib/supabase-server'

// Нэг хүүхдийн ажиглалтыг зурагтай нь Word (.docx) файл болгож өгнө.
// АНХААР: middleware нь /api замыг шалгадаггүй тул нэвтрэлт, эрхийг ЭНД өөрөө шалгана.
// Хүүхдийн нэр, ажиглалтын текстийг лог-д бичихгүй. Гаднын сервис рүү өгөгдөл явуулахгүй
// (зөвхөн өөрийн Supabase storage-аас зураг уншина).

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = 'org-plans'
const MAX_OBS = 500
const MAX_IMAGES = 60
const IMG_MAX_PX = 640

const LEVEL_LABEL: Record<string, string> = {
  demjleg: 'Дэмжлэг шаардлагатай',
  hogjij: 'Хөгжиж байгаа',
  nasandaa: 'Насандаа тохирсон',
  ahisan: 'Ахисан түвшин',
}
const MUSIC_AREA: Record<string, string> = {
  music_new_song: 'Шинэ дуу', music_listen: 'Сонсох хөгжим', music_rhythm: 'Хэмнэл',
  music_role: 'Дүрд тоглох', music_movement: 'Хөгжимт хөдөлгөөн',
}
const MAX_FRAMES = 40
const VIDEO_EXT = /\.(mp4|mov|webm|m4v|3gp|avi|mkv)$/i
function isVideoUrl(u: string) {
  try { return VIDEO_EXT.test(new URL(u).pathname) } catch { return false }
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PERIOD_RE = /^(all|\d{4}-(0[1-9]|1[0-2]))$/

type Sb = Awaited<ReturnType<typeof createClient>>

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// Зөвхөн өөрийн Supabase-ийн org-plans bucket-ийн холбоосоос зам гаргаж авна (SSRF-ээс сэргийлнэ)
function storagePathFromUrl(raw: string): string | null {
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

async function loadImage(sb: Sb, url: string): Promise<{ data: Buffer; w: number; h: number } | null> {
  // Лог-д зөвхөн шалтгааны код бичнэ (нэр, холбоос бичихгүй)
  const path = storagePathFromUrl(url)
  if (!path) { console.warn('ajigllt-export: media skip=bad-url'); return null }
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
  if (!buf) { console.warn('ajigllt-export: media skip=' + why); return null }
  try {
    // Зураг биш файл (видео гэх мэт) энд алдаа өгч алгасагдана
    const out = await sharp(buf).rotate().resize(IMG_MAX_PX, IMG_MAX_PX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 }).toBuffer({ resolveWithObject: true })
    return { data: out.data, w: out.info.width, h: out.info.height }
  } catch (e) {
    console.warn('ajigllt-export: media skip=sharp:' + String((e as Error)?.message).slice(0, 80) + ' bytes=' + buf.length)
    return null
  }
}

type Obs = {
  id: string; date: string; activity: string | null; observation: string
  area_code: string | null; level: string | null; observer_id: string | null
  photo_url: string | null; media_urls: unknown
  development_areas: { name: string } | null
  employees: { last_name: string; first_name: string } | null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail(401, 'Нэвтрээгүй байна')

  const body = await request.json().catch(() => null) as {
    childId?: string; period?: string
    listVideos?: boolean                 // 1-р алхам: бичлэгийн жагсаалт авах
    frames?: Record<string, string>      // 2-р алхам: бичлэг бүрийн кадр (data:image/jpeg;base64,...)
  } | null
  const childId = body?.childId
  const period = body?.period || 'all'
  if (!childId || !UUID_RE.test(childId) || !PERIOD_RE.test(period)) return fail(400, 'Буруу хүсэлт')

  // --- Эрхийн шалгалт (сервер талд, хэрэглэгчийн өөрийн session-ээр) ---
  const { data: me } = await supabase
    .from('employees').select('id, role, is_admin').eq('auth_user_id', user.id).maybeSingle()
  if (!me) return fail(403, 'Эрх олдсонгүй')

  const { data: child } = await supabase
    .from('children').select('id, last_name, first_name, group_id, groups(name)').eq('id', childId).maybeSingle()
  if (!child) return fail(404, 'Хүүхэд олдсонгүй')

  const isLeader = !!me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich'
  const { data: gt } = await supabase
    .from('group_teachers').select('group_id, groups(code)').eq('employee_id', me.id)
  const myGroups = (gt || []) as unknown as { group_id: number; groups: { code: string } | null }[]
  // Одоогийн /ajigllt хуудасны дүрэм: хөгжмийн бүлгийн багш бүх хүүхдийг хардаг
  const isMusic = myGroups.some((g) => g.groups?.code === 'hogjim')
  const canSeeAll = isLeader || isMusic

  if (!canSeeAll) {
    const inMyGroup = child.group_id != null && myGroups.some((g) => g.group_id === child.group_id)
    if (!inMyGroup) return fail(403, 'Энэ хүүхдийн ажиглалтыг татах эрхгүй байна')
  }

  // --- Өгөгдөл унших (зөвхөн унших) ---
  let q = supabase
    .from('observations')
    .select('id, date, activity, observation, area_code, level, observer_id, photo_url, media_urls, development_areas(name), employees:observer_id(last_name, first_name)')
    .eq('child_id', childId)
    .order('date', { ascending: true })
    .limit(MAX_OBS)
  if (period !== 'all') {
    const [y, m] = period.split('-').map(Number)
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    q = q.gte('date', `${period}-01`).lt('date', next)
  }
  // /ajigllt хуудастай адил: бүгдийг харах эрхгүй бол зөвхөн өөрийн бичсэн ажиглалт
  if (!canSeeAll) q = q.eq('observer_id', me.id)
  const { data: rows, error } = await q
  if (error) { console.error('ajigllt-export: унших алдаа'); return fail(500, 'Өгөгдөл уншиж чадсангүй') }
  const obs = (rows || []) as unknown as Obs[]

  const mediaOf = (o: Obs): string[] => {
    const urls: string[] = Array.isArray(o.media_urls) ? (o.media_urls as unknown[]).filter((x): x is string => typeof x === 'string') : []
    if (urls.length === 0 && o.photo_url) urls.push(o.photo_url)
    return Array.from(new Set(urls))
  }

  // 1-р алхам: энэ хүүхдийн бичлэгийн холбоосуудыг буцаана (эрх дээр шалгагдсан). Браузер кадр авна.
  if (body?.listVideos) {
    const vids = Array.from(new Set(obs.flatMap(mediaOf).filter(isVideoUrl))).slice(0, MAX_FRAMES)
    return NextResponse.json({ videos: vids }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  // Браузероос ирсэн кадрууд: зөвхөн ЭНЭ хүүхдийн ажиглалтын бичлэгт хамаарах түлхүүрийг хүлээж авна
  const allowedVideos = new Set(obs.flatMap(mediaOf).filter(isVideoUrl))
  const frameBufs = new Map<string, { data: Buffer; w: number; h: number }>()
  let frameBytes = 0
  for (const [u, dataUrl] of Object.entries(body?.frames || {}).slice(0, MAX_FRAMES)) {
    if (!allowedVideos.has(u) || typeof dataUrl !== 'string') continue
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
    if (!m) continue
    const raw = Buffer.from(m[1], 'base64')
    frameBytes += raw.length
    if (raw.length > 600_000 || frameBytes > 4_000_000) continue
    try {
      // sharp-аар дахин кодлох нь жинхэнэ зураг эсэхийг батална
      const out = await sharp(raw).resize(IMG_MAX_PX, IMG_MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 }).toBuffer({ resolveWithObject: true })
      frameBufs.set(u, { data: out.data, w: out.info.width, h: out.info.height })
    } catch { /* алгасна */ }
  }

  // --- Word файл бүтээх ---
  const font = 'Times New Roman'
  const t = (text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) =>
    new TextRun({ text, font, size: o.size ?? 22, bold: o.bold, color: o.color, italics: o.italics })

  const children: (Paragraph | Table)[] = []
  const groupName = (child.groups as unknown as { name: string } | null)?.name || ''
  const periodText = period === 'all' ? 'Бүх хугацаа' : period

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [t('ХҮҮХДИЙН ӨДӨР ТУТМЫН АЖИГЛАЛТ', { bold: true, size: 30 })],
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [t(`Хүүхэд: ${child.last_name}.${child.first_name}`, { bold: true, size: 26 })],
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [t(`${groupName ? 'Бүлэг: ' + groupName + '  |  ' : ''}Хугацаа: ${periodText}  |  Нийт: ${obs.length} тэмдэглэл`, { color: '555555' })],
  }))

  if (obs.length === 0) {
    children.push(new Paragraph({ children: [t('Энэ хугацаанд ажиглалт бүртгээгүй байна.', { italics: true })] }))
  }

  let imgCount = 0
  let skippedMedia = 0
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' }
  const borders = { top: border, bottom: border, left: border, right: border }

  for (let i = 0; i < obs.length; i++) {
    const o = obs[i]
    const areaName = o.development_areas?.name || (o.area_code ? MUSIC_AREA[o.area_code] : '') || ''
    const observer = o.employees ? `${o.employees.last_name}.${o.employees.first_name}` : ''
    const level = o.level ? (LEVEL_LABEL[o.level] || o.level) : ''

    const infoRows: [string, string][] = [
      ['Огноо', o.date],
      ['Үйл ажиллагаа', o.activity || ''],
      ['Судлагдахуун', areaName],
      ['Хөгжлийн түвшин', level],
      ['Ажигласан багш', observer],
    ]
    const cell = (text: string, w: number, head = false) => new TableCell({
      width: { size: w, type: WidthType.PERCENTAGE }, borders,
      shading: head ? { type: ShadingType.CLEAR, fill: 'EEF2F7', color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [t(text || '—', { bold: head })] })],
    })
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows.map(([k, v]) => new TableRow({ children: [cell(k, 30, true), cell(v, 70)] })),
    }))
    children.push(new Paragraph({ spacing: { before: 120, after: 80 }, children: [t('Ажиглалт:', { bold: true })] }))
    for (const line of (o.observation || '').split('\n')) {
      children.push(new Paragraph({ spacing: { after: 40 }, children: [t(line)] }))
    }

    // Зураг: media_urls (олон), байхгүй бол photo_url
    for (const url of mediaOf(o)) {
      if (imgCount >= MAX_IMAGES) { skippedMedia++; continue }
      const isVid = isVideoUrl(url)
      // Бичлэг бол браузероос ирсэн кадрыг, зураг бол Storage-аас авна
      const img = isVid ? (frameBufs.get(url) ?? null) : await loadImage(supabase, url)
      if (!img) { skippedMedia++; continue } // кадр авч чадаагүй бичлэг эсвэл уншигдаагүй зураг
      imgCount++
      children.push(new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new ImageRun({ type: 'jpg', data: img.data, transformation: { width: img.w, height: img.h } })],
      }))
      if (isVid) children.push(new Paragraph({ children: [t('(Бичлэгээс авсан кадр)', { size: 18, italics: true, color: '777777' })] }))
    }
    if (i < obs.length - 1) {
      children.push(new Paragraph({ spacing: { before: 200, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 } }, children: [] }))
    }
  }

  if (skippedMedia > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(new Paragraph({ children: [t(`Тэмдэглэл: ${skippedMedia} файл (кадр авч чадаагүй бичлэг, уншигдаагүй зураг, эсвэл ${MAX_IMAGES}-аас олон зураг) файлд оруулаагүй.`, { italics: true, color: '555555' })] }))
  }
  children.push(new Paragraph({
    spacing: { before: 240 },
    children: [t(`Татсан огноо: ${new Date().toISOString().slice(0, 10)}. Хүүхдийн хувийн мэдээлэл агуулсан тул хамгаалж хадгална уу.`, { size: 18, color: '777777', italics: true })],
  }))

  const doc = new Document({
    creator: 'Цэцэрлэгийн удирдлагын систем',
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children }],
  })
  const buf = await Packer.toBuffer(doc)

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="ajiglalt.docx"',
      'Cache-Control': 'private, no-store',
    },
  })
}
