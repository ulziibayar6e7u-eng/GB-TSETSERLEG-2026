import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))

const OLD_URL = 'https://dehxrmupnbilwlxsovpi.supabase.co'
const OLD_KEY = 'sb_publishable_VRNBeM9nqwFlrDhT2-wD3w_Gp3O85uy'
const old = createClient(OLD_URL, OLD_KEY)
const neu = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 1. Group mapping
const { data: groups } = await neu.from('groups').select('id, code')
const codeToId = Object.fromEntries(groups.map(g=>[g.code, g.id]))
const oldToNew = {
  baga: codeToId.baga,
  dund: codeToId.dund,
  ahlah: codeToId.ahlah,
  beltgel: codeToId.beltgel,
  duguilan: codeToId.hogjim,
}

// 2. Import children (skip existing by full name match)
const { data: oldKids } = await old.from('children').select('*')
const { data: existingKids } = await neu.from('children').select('id, last_name, first_name')
const existingByName = new Map(existingKids.map(c=>[`${c.last_name}.${c.first_name}`.toLowerCase().replace(/\s/g,''), c.id]))

const oldIdToNewId = new Map()
const toInsert = []
for (const k of oldKids) {
  const name = (k.name || '').trim()
  const parts = name.split('.').map(s=>s.trim())
  let last_name = 'Х'
  let first_name = name
  if (parts.length >= 2) {
    last_name = parts[0]
    first_name = parts.slice(1).join('.').trim()
  }
  const key = `${last_name}.${first_name}`.toLowerCase().replace(/\s/g,'')
  if (existingByName.has(key)) {
    oldIdToNewId.set(k.id, existingByName.get(key))
    continue
  }
  const birth_date = k.birth_year ? k.birth_year.replace(/\./g,'-') : null
  toInsert.push({
    _old_id: k.id,
    last_name,
    first_name,
    birth_date: /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null,
    group_id: k.group_id === 'duguilan' ? null : (oldToNew[k.group_id] || null),
  })
}
console.log(`Хуучин: ${oldKids.length} хүүхэд, шинээр нэмэх: ${toInsert.length}, аль хэдийн байгаа: ${oldKids.length - toInsert.length}`)

if (toInsert.length > 0) {
  const rows = toInsert.map(({_old_id, ...rest}) => rest)
  const { data: ins, error } = await neu.from('children').insert(rows).select('id, last_name, first_name')
  if (error) { console.log('CHILDREN insert ERR:', error); process.exit(1) }
  ins.forEach((newRow, i) => {
    oldIdToNewId.set(toInsert[i]._old_id, newRow.id)
  })
  console.log(`✅ ${ins.length} шинэ хүүхэд импортлогдлоо`)
}

// 3. Add all imported/existing children to Hogjmiin duguilan (club)
const { data: clubs } = await neu.from('clubs').select('id, name')
const hogjimClub = clubs.find(c => c.name === 'Хөгжмийн дугуйлан')
if (hogjimClub) {
  const allChildIds = Array.from(oldIdToNewId.values())
  const rows = allChildIds.map(cid => ({ child_id: cid, club_id: hogjimClub.id }))
  const { error } = await neu.from('child_clubs').upsert(rows, { onConflict: 'child_id,club_id', ignoreDuplicates: true })
  if (error) console.log('CLUB add ERR:', error.message)
  else console.log(`✅ ${allChildIds.length} хүүхэд Хөгжмийн дугуйланд нэмэгдсэн`)
}

// 4. Import music_criteria_checks
const { data: oldMCC } = await old.from('music_criteria_checks').select('*')
const { data: ulzii } = await neu.from('employees').select('id').eq('first_name','Өлзийбаяр').maybeSingle()
const mccRows = []
for (const m of oldMCC) {
  const newChildId = oldIdToNewId.get(m.child_id)
  if (!newChildId) continue
  mccRows.push({
    child_id: newChildId,
    level: m.level,
    category: m.category,
    criterion_num: m.criterion_num,
    status: m.status,
    note: m.note,
    checked_by: ulzii?.id || null,
  })
}
if (mccRows.length > 0) {
  const { error } = await neu.from('music_criteria_checks').upsert(mccRows, { onConflict: 'child_id,level,category,criterion_num' })
  if (error) console.log('MCC ERR:', error.message)
  else console.log(`✅ ${mccRows.length} хөгжмийн үнэлгээ импортлогдлоо`)
}

// 5. Import assessments as music_assessments
const { data: oldAss } = await old.from('assessments').select('*')
const assRows = []
for (const a of oldAss) {
  const newChildId = oldIdToNewId.get(a.child_id)
  if (!newChildId) continue
  assRows.push({
    child_id: newChildId,
    section: a.section,
    subsection: a.subsection,
    date: a.date,
    title: a.title,
    text: a.text,
    media: a.media || [],
    observer_id: ulzii?.id || null,
  })
}
if (assRows.length > 0) {
  const { error } = await neu.from('music_assessments').insert(assRows)
  if (error) console.log('ASS ERR:', error.message)
  else console.log(`✅ ${assRows.length} хөгжмийн ажиглалт импортлогдлоо`)
}

// 6. Import plans
const { data: oldPlans } = await old.from('plans').select('*')
const planRows = []
for (const p of oldPlans) {
  const newGroupId = p.group_id === 'duguilan' ? null : (oldToNew[p.group_id] || null)
  planRows.push({
    group_id: newGroupId,
    author_id: ulzii?.id || null,
    plan_type: 'weekly',
    period_start: new Date().toISOString().split('T')[0],
    title: p.title || '(гарчиггүй)',
    content: p.content || (p.text || ''),
    status: p.approved_at ? 'approved' : 'draft',
    approved_at: p.approved_at,
  })
}
if (planRows.length > 0) {
  const { error } = await neu.from('plans').insert(planRows)
  if (error) console.log('PLANS ERR:', error.message)
  else console.log(`✅ ${planRows.length} төлөвлөгөө импортлогдлоо`)
}

console.log('\n🎉 Импорт дуусав!')
