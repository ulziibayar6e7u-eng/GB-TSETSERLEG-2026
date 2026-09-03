import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// НЭГ УДААГИЙН ADMIN BOOTSTRAP
// Ажилтныг илгээсэн имэйл/нууц үгээр auth-т үүсгэн эсвэл нууц үгийг сэргээнэ,
// employee-тэй холбоно. Хамгаалалт: зөвхөн одоогоор auth_user_id-гүй эсвэл is_admin=true эсвэл role='erhlegch'
// employee-т ашиглана.

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY тохируулаагүй' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'JSON body хэрэгтэй' }, { status: 400 })
  const { first_name, email, password } = body as { first_name?: string; email?: string; password?: string }
  if (!first_name || !email || !password) {
    return NextResponse.json({ error: 'first_name, email, password шаардлагатай' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password хамгийн багадаа 6 тэмдэгт' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Ажилтныг ол
  const { data: emp, error: empErr } = await admin
    .from('employees')
    .select('id, first_name, last_name, role, is_admin, auth_user_id, email')
    .eq('first_name', first_name)
    .maybeSingle()
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })
  if (!emp) return NextResponse.json({ error: `"${first_name}" нэртэй ажилтан олдсонгүй` }, { status: 404 })

  // Хамгаалалт: зөвхөн admin эсвэл эрхлэгч эсвэл шинэ (auth_user_id-гүй)
  const isAllowed = !emp.auth_user_id || emp.is_admin || emp.role === 'erhlegch'
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Энэ ажилтанд нэвтрэх эрх аль хэдийн үүссэн, /api/create-user эсвэл дахин суулгах шаардлагатай' },
      { status: 403 }
    )
  }

  // Auth дотор энэ имэйлтэй user байгаа эсэхийг шалгах
  const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
  const existing = usersList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  let userId: string
  let action: string

  if (existing) {
    // Password шинэчилж, employee-тэй холбож эсвэл шалгах
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })
    userId = existing.id
    action = 'password_updated'
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })
    userId = created.user.id
    action = 'user_created'
  }

  // Employee-тэй холбох
  const { error: linkErr } = await admin
    .from('employees')
    .update({ auth_user_id: userId, email })
    .eq('id', emp.id)
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    action,
    employee: `${emp.last_name}.${emp.first_name}`,
    email,
    user_id: userId,
  })
}
