import { NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType,
} from 'docx'
import { createClient } from '@/lib/supabase-server'
import {
  UUID_RE, PERIOD_RE, MAX_IMAGES, MAX_FRAMES, isVideoUrl, isDocUrl, fileLabel,
  monthRange, loadImage, decodeFrames,
} from '@/lib/export-helpers'

// Багшийн туслахын бүртгэлүүдийг (дадал хэвшил, судалгаа, санаачилсан ажил) зурагтай нь Word болгоно.
// АНХААР: middleware нь /api замыг шалгадаггүй тул нэвтрэлт, эрхийг ЭНД өөрөө шалгана.
// Хүүхдийн нэр, текстийг лог-д бичихгүй. Гаднын сервис рүү өгөгдөл явуулахгүй.

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_REC = 500
const CAT_LABEL: Record<string, string> = {
  dadal: 'Дадал хэвшил олгож буй байдал',
  ahits: 'Хүүхдийн дадал хэвшлийн судалгаа',
  sanaachlaga: 'Санаачилсан ажил, арга хэмжээ',
}
const MASTERY_LABEL: Record<string, string> = {
  not_yet: 'Хараахан эзэмшээгүй', in_progress: 'Эзэмшиж байгаа', achieved: 'Эзэмшсэн',
}

type Rec = {
  id: string; category: string; title: string | null; description: string | null
  child_id: string | null; date: string; mastery_level: string | null
  file_url: string | null; extra_links: unknown; reviewer_note: string | null
  children: { last_name: string; first_name: string } | null
  reviewer: { last_name: string; first_name: string } | null
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail(401, 'Нэвтрээгүй байна')

  const body = await request.json().catch(() => null) as {
    employeeId?: string; category?: string; period?: string
    listVideos?: boolean; frames?: Record<string, string>
  } | null
  const employeeId = body?.employeeId
  const category = body?.category || 'all'
  const period = body?.period || 'all'
  if (!employeeId || !UUID_RE.test(employeeId) || !PERIOD_RE.test(period) ||
      !['all', 'dadal', 'ahits', 'sanaachlaga'].includes(category)) return fail(400, 'Буруу хүсэлт')

  // --- Эрхийн шалгалт (сервер талд, хэрэглэгчийн өөрийн session-ээр) ---
  const { data: me } = await supabase
    .from('employees').select('id, role, is_admin').eq('auth_user_id', user.id).maybeSingle()
  if (!me) return fail(403, 'Эрх олдсонгүй')

  const { data: target } = await supabase
    .from('employees').select('id, last_name, first_name, positions(name)').eq('id', employeeId).maybeSingle()
  if (!target) return fail(404, 'Ажилтан олдсонгүй')

  const isLeader = !!me.is_admin || me.role === 'erhlegch' || me.role === 'arga_zuich'
  const isOwner = me.id === employeeId
  let allowed = isLeader || isOwner
  if (!allowed && me.role === 'bagsh') {
    // Өөрийн бүлгийн туслахын бүртгэлийг бүлгийн багш татна
    const [mine, theirs] = await Promise.all([
      supabase.from('group_teachers').select('group_id').eq('employee_id', me.id),
      supabase.from('group_teachers').select('group_id').eq('employee_id', employeeId),
    ])
    const mg = new Set(((mine.data || []) as { group_id: number }[]).map((r) => r.group_id))
    allowed = ((theirs.data || []) as { group_id: number }[]).some((r) => mg.has(r.group_id))
  }
  if (!allowed) return fail(403, 'Энэ бүртгэлийг татах эрхгүй байна')

  // --- Өгөгдөл унших (зөвхөн унших) ---
  let q = supabase
    .from('tuslah_records')
    .select('id, category, title, description, child_id, date, mastery_level, file_url, extra_links, reviewer_note, children(last_name, first_name), reviewer:reviewer_id(last_name, first_name)')
    .eq('employee_id', employeeId)
    .order('date', { ascending: true })
    .limit(MAX_REC)
  if (category !== 'all') q = q.eq('category', category)
  const range = monthRange(period)
  if (range) q = q.gte('date', range.from).lt('date', range.to)
  const { data: rows, error } = await q
  if (error) { console.error('tuslah-export: унших алдаа'); return fail(500, 'Өгөгдөл уншиж чадсангүй') }
  const recs = (rows || []) as unknown as Rec[]

  // 1-р алхам: бичлэгийн жагсаалт (браузер кадр авна)
  const videoUrls = Array.from(new Set(recs.map((r) => r.file_url).filter((u): u is string => !!u && isVideoUrl(u))))
  if (body?.listVideos) {
    return NextResponse.json({ videos: videoUrls.slice(0, MAX_FRAMES) }, { headers: { 'Cache-Control': 'private, no-store' } })
  }
  const frames = await decodeFrames(body?.frames, new Set(videoUrls))

  // --- Word файл бүтээх ---
  const font = 'Times New Roman'
  const t = (text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) =>
    new TextRun({ text, font, size: o.size ?? 22, bold: o.bold, color: o.color, italics: o.italics })
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' }
  const borders = { top: border, bottom: border, left: border, right: border }
  const cell = (text: string, w: number, head = false) => new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE }, borders,
    shading: head ? { type: ShadingType.CLEAR, fill: 'EEF2F7', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [t(text || '—', { bold: head })] })],
  })

  const out: (Paragraph | Table)[] = []
  const periodText = period === 'all' ? 'Бүх хугацаа' : period
  const pos = (target.positions as unknown as { name: string } | null)?.name || ''
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [t('БАГШИЙН ТУСЛАХЫН БҮРТГЭЛ', { bold: true, size: 30 })] }))
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [t(`${target.last_name}.${target.first_name}${pos ? ' · ' + pos : ''}`, { bold: true, size: 26 })] }))
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [t(`${category === 'all' ? 'Бүх ангилал' : CAT_LABEL[category]}  |  Хугацаа: ${periodText}  |  Нийт: ${recs.length} бүртгэл`, { color: '555555' })] }))

  if (recs.length === 0) {
    out.push(new Paragraph({ children: [t('Энэ хугацаанд бүртгэл байхгүй байна.', { italics: true })] }))
  }

  // Хүүхэд бүрээр хийсэн энгийн үнэлгээ (тайлбар, файлгүй) → нэг хүснэгтэд нэгтгэнэ
  const isSurvey = (r: Rec) => !!r.child_id && !r.description && !r.file_url
  const surveyRows = recs.filter(isSurvey)
  const fullRecs = recs.filter((r) => !isSurvey(r))

  let imgCount = 0
  let skipped = 0
  for (let i = 0; i < fullRecs.length; i++) {
    const r = fullRecs[i]
    out.push(new Paragraph({ spacing: { before: 160, after: 80 },
      children: [t(`${r.date}  ·  ${r.title || '(гарчиггүй)'}`, { bold: true, size: 24 })] }))
    const info: [string, string][] = [
      ['Ангилал', CAT_LABEL[r.category] || r.category],
      ['Хүүхэд', r.children ? `${r.children.last_name}.${r.children.first_name}` : ''],
      ['Эзэмшилтийн түвшин', r.mastery_level ? (MASTERY_LABEL[r.mastery_level] || r.mastery_level) : ''],
    ].filter(([, v]) => v) as [string, string][]
    if (info.length) out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
      rows: info.map(([k, v]) => new TableRow({ children: [cell(k, 30, true), cell(v, 70)] })) }))
    if (r.description) {
      for (const line of r.description.split('\n')) out.push(new Paragraph({ spacing: { after: 40 }, children: [t(line)] }))
    }
    const links = Array.isArray(r.extra_links) ? (r.extra_links as unknown[]).filter((x): x is string => typeof x === 'string') : []
    if (links.length) {
      out.push(new Paragraph({ spacing: { before: 60 }, children: [t('Холбоос: ', { bold: true }), t(links.join(', '), { size: 20 })] }))
    }

    const f = r.file_url
    if (f) {
      if (isDocUrl(f)) {
        out.push(new Paragraph({ spacing: { before: 60 }, children: [t(`Хавсаргасан файл: ${fileLabel(f)} (Word-д оруулаагүй, системээс татна уу)`, { italics: true, color: '555555', size: 20 })] }))
      } else if (imgCount >= MAX_IMAGES) {
        skipped++
      } else {
        const vid = isVideoUrl(f)
        const img = vid ? (frames.get(f) ?? null) : await loadImage(supabase, f)
        if (!img) skipped++
        else {
          imgCount++
          out.push(new Paragraph({ spacing: { before: 100, after: 100 },
            children: [new ImageRun({ type: 'jpg', data: img.data, transformation: { width: img.w, height: img.h } })] }))
          if (vid) out.push(new Paragraph({ children: [t('(Бичлэгээс авсан кадр)', { size: 18, italics: true, color: '777777' })] }))
        }
      }
    }
    if (r.reviewer_note) {
      const who = r.reviewer ? ` (${r.reviewer.last_name}.${r.reviewer.first_name})` : ''
      out.push(new Paragraph({ spacing: { before: 60 }, children: [t('Үнэлгээ, санал' + who + ': ', { bold: true }), t(r.reviewer_note)] }))
    }
    if (i < fullRecs.length - 1) {
      out.push(new Paragraph({ spacing: { before: 160, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 } }, children: [] }))
    }
  }

  if (surveyRows.length > 0) {
    out.push(new Paragraph({ spacing: { before: 280, after: 100 }, children: [t('Хүүхэд бүрийн дадал хэвшлийн үнэлгээ', { bold: true, size: 24 })] }))
    out.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell('Огноо', 18, true), cell('Хүүхэд', 32, true), cell('Дадал', 25, true), cell('Түвшин', 25, true)] }),
        ...surveyRows.map((r) => new TableRow({ children: [
          cell(r.date, 18),
          cell(r.children ? `${r.children.last_name}.${r.children.first_name}` : '', 32),
          cell(r.title || '', 25),
          cell(r.mastery_level ? (MASTERY_LABEL[r.mastery_level] || r.mastery_level) : '', 25),
        ] })),
      ],
    }))
  }

  if (skipped > 0) {
    out.push(new Paragraph({ spacing: { before: 200 }, children: [t(`Тэмдэглэл: ${skipped} файл (кадр авч чадаагүй бичлэг, уншигдаагүй зураг, эсвэл ${MAX_IMAGES}-аас олон зураг) файлд оруулаагүй.`, { italics: true, color: '555555' })] }))
  }
  out.push(new Paragraph({ spacing: { before: 240 },
    children: [t(`Татсан огноо: ${new Date().toISOString().slice(0, 10)}. Хүүхдийн хувийн мэдээлэл агуулсан тул хамгаалж хадгална уу.`, { size: 18, color: '777777', italics: true })] }))

  const doc = new Document({
    creator: 'Цэцэрлэгийн удирдлагын систем',
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: out }],
  })
  const buf = await Packer.toBuffer(doc)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="tuslah.docx"',
      'Cache-Control': 'private, no-store',
    },
  })
}
