import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Parse weekly-plans-data.js by wrapping window and eval
const raw = fs.readFileSync('D:/2026-2027 Хөгжим Өлзий/СӨБ_БҮЛГИЙН_БАГШ/weekly-plans-data.js', 'utf8')
const window = {}
eval(raw)
const plans = window.WEEKLY_PLANS || {}
console.log('Түлхүүр тоо:', Object.keys(plans).length)

const rows = []
for (const [key, value] of Object.entries(plans)) {
  const m = key.match(/^([a-z]+)_(\d+)_(\d+)$/)
  if (!m) { console.log('SKIP', key); continue }
  const [, group_code, month, week_num] = m
  rows.push({
    group_code,
    month: parseInt(month),
    week_num: parseInt(week_num),
    theme: value.theme || null,
    method: value.method || null,
    new_words: value.newWords || [],
    outcomes: value.outcomes || [],
    cells: value.cells || {},
  })
}
const { error } = await s.from('weekly_plan_templates').upsert(rows, { onConflict: 'group_code,month,week_num' })
if (error) console.log('ERR:', error.message)
else console.log(`✅ ${rows.length} template импортлогдлоо`)
