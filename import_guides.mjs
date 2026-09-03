import { createClient } from '@supabase/supabase-js'
import mammoth from 'mammoth'
import fs from 'fs'

const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const files = [
  ['beltgel', 'D:/СӨБ бүлгийн багш/бэлтгэл гарын авлага.docx'],
  ['ahlah',   'D:/СӨБ бүлгийн багш/ахлах гарын авлага.docx'],
  ['dund',    'D:/СӨБ бүлгийн багш/дунд гарын авлага.docx'],
  ['baga',    'D:/СӨБ бүлгийн багш/бага гарын авлага.docx'],
]

// Roman → Arabic mapping for month headings
const ROMAN = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10, XI:11, XII:12 }

// Header regex — детект каждого месяца
const MONTH_HEADER_RE = /СУРГАЛТ,?\s*ҮЙЛ\s*АЖИЛЛАГААНЫ\s*ТӨЛӨВЛӨЛТ[- ]+\s*(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,2})\s*САР/gi

for (const [code, path] of files) {
  console.log(`\n>>> ${code}`)
  const r = await mammoth.extractRawText({ path })
  const text = r.value

  // Split by month headers
  const parts = []
  let lastIdx = 0
  let lastMonth = null
  let lastTitle = 'Ерөнхий'
  const matches = [...text.matchAll(MONTH_HEADER_RE)]
  for (const m of matches) {
    if (m.index > lastIdx) {
      parts.push({ month: lastMonth, title: lastTitle, content: text.slice(lastIdx, m.index).trim() })
    }
    lastIdx = m.index
    lastMonth = ROMAN[m[1].toUpperCase()] || null
    lastTitle = m[0].trim()
  }
  parts.push({ month: lastMonth, title: lastTitle, content: text.slice(lastIdx).trim() })

  const rows = parts
    .filter((p) => p.content.length > 100)
    .map((p, i) => ({
      age_group: code,
      month: p.month,
      section_title: p.title,
      content: p.content,
      sort_order: i,
    }))

  // Delete existing for this age group first
  await s.from('curriculum_guides').delete().eq('age_group', code)
  const { error } = await s.from('curriculum_guides').insert(rows)
  if (error) console.log('ERR:', error.message)
  else console.log(`✅ ${rows.length} sections импортлогдлоо (${rows.map(r => r.month || 'intro').join(', ')})`)
}
console.log('\n🎉 Гарын авлагууд бүрэн импортлогдлоо!')
