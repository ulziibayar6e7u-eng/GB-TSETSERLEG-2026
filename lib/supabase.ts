import { createBrowserClient } from '@supabase/ssr'

// Нэвтэрсэн хэрэглэгчийн (cookie) session-ийг ашигладаг клиент.
// Өмнө нь энд энгийн createClient байсан тул хүсэлтүүд нэвтрээгүй (anon) хэрэглэгчээр явж,
// өгөгдлийн хамгаалалт (RLS) хаагдсан үед нэмэх/хасах үйлдэл чимээгүй бүтэлгүйтдэг байсан.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
