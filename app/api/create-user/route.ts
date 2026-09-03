import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY тохируулаагүй байна. .env.local файл дээр нэмнэ үү.' },
      { status: 500 }
    )
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Нэвтрээгүй' }, { status: 401 })

  const { data: me } = await supabase
    .from('employees')
    .select('is_admin, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!me?.is_admin && me?.role !== 'erhlegch') {
    return NextResponse.json({ error: 'Зөвхөн админ энэ үйлдлийг хийнэ' }, { status: 403 })
  }

  const body = await request.json()
  const { employee_id, email, password } = body as {
    employee_id: string
    email: string
    password: string
  }
  if (!employee_id || !email || !password) {
    return NextResponse.json({ error: 'Талбар дутуу' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

  const { error: linkErr } = await admin
    .from('employees')
    .update({ auth_user_id: created.user.id, email })
    .eq('id', employee_id)
  if (linkErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: linkErr.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user_id: created.user.id })
}
