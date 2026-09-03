import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const raw = fs.readFileSync('D:/2026-2027 Хөгжим Өлзий/СӨБ_БҮЛГИЙН_БАГШ/curriculum-data.js', 'utf8')
const cleaned = raw.replace(/^\uFEFF/, '').replace(/^window\.CURRICULUM\s*=\s*/, '').replace(/;?\s*$/, '')
const data = JSON.parse(cleaned)

console.log(`Найдвартай ${Object.keys(data).length} хэсэг олдлоо`)

// Clear old guides (only intro/general and month-based)
for (const code of ['beltgel','ahlah','dund','baga']) {
  await s.from('curriculum_guides').delete().eq('age_group', code)
}

const MONTH_NAMES = { 9:'9-р сар (IX)', 10:'10-р сар (X)', 11:'11-р сар (XI)', 12:'12-р сар (XII)', 1:'1-р сар (I)', 2:'2-р сар (II)', 3:'3-р сар (III)', 4:'4-р сар (IV)', 5:'5-р сар (V)' }
const MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5]

const rows = []
for (const [key, content] of Object.entries(data)) {
  const m = key.match(/^([a-z]+)_(\d+)$/)
  if (!m) continue
  const [, age_group, monthStr] = m
  const month = parseInt(monthStr)
  rows.push({
    age_group,
    month,
    section_title: MONTH_NAMES[month] || `${month}-р сар`,
    content,
    sort_order: MONTH_ORDER.indexOf(month),
  })
}

// Group by age_group for logging
for (const code of ['beltgel','ahlah','dund','baga']) {
  const groupRows = rows.filter((r) => r.age_group === code)
  if (groupRows.length === 0) continue
  const { error } = await s.from('curriculum_guides').insert(groupRows)
  if (error) console.log(`❌ ${code}:`, error.message)
  else console.log(`✅ ${code}: ${groupRows.length} сарын гарын авлага (${groupRows.map((r) => r.month).sort((a,b)=>MONTH_ORDER.indexOf(a)-MONTH_ORDER.indexOf(b)).join(', ')})`)
}
console.log('\n🎉 curriculum-data.js бүрэн импортлогдлоо!')
