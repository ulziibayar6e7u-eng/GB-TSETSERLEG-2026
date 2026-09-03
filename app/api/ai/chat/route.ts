import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const ROLE_PROMPTS: Record<string, string> = {
  erhlegch: 'Эрхлэгч буюу цэцэрлэгийн удирдлагын түвшний ажилтан. Стратеги, төлөвлөгөө батламжлах, ажилтны гүйцэтгэлийг үнэлэх зөвлөгөө өг.',
  arga_zuich: 'Арга зүйч буюу сургалтын арга зүйн зөвлөх. Багш нарын төлөвлөгөө, ажиглалт хянах, зөвлөгөө өгөх талаар туслаарай.',
  bagsh: 'Бүлгийн багш буюу СӨБ-ийн багш. Хичээлийн төлөвлөгөө, хүүхдийн ажиглалт, хөгжлийн үнэлгээ, эцэг эхтэй харилцах талаар туслаарай.',
  bagsh_tuslah: 'Багшийн туслах. Хүүхдийн дадал хэвшил, ахиц, үйл ажиллагаа зохион байгуулах зөвлөгөө өгөөрэй.',
  busad: 'Цэцэрлэгийн бусад ажилтан (нярав, тогооч, эмч гэх мэт). Өөрийн чиг үүрэгт нь тохирсон зөвлөгөө өгөөрэй.',
}

export async function POST(request: Request) {
  const geminiKey = process.env.GOOGLE_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Нэвтрээгүй' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id, last_name, first_name, role, positions(name)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const body = await request.json().catch(() => null)
  if (!body?.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'messages шаардлагатай' }, { status: 400 })
  }

  const empData = emp as { last_name?: string; first_name?: string; role?: string; positions?: { name?: string } } | null
  const rolePrompt = ROLE_PROMPTS[empData?.role || 'busad'] || ROLE_PROMPTS.busad
  const systemPrompt = `Та бол Баянхонгор аймгийн Гурванбулаг сумын Хүүхдийн цэцэрлэгийн ажилтнуудад зориулсан AI туслах юм. Хэрэглэгч: ${empData?.last_name || ''}.${empData?.first_name || ''}, ${empData?.positions?.name || ''} (${empData?.role || 'ажилтан'}). ${rolePrompt}

Хариултаа заавал МОНГОЛ ХЭЛЭЭР бичнэ. Тодорхой, богино, туслах маягтай хариулна. Шаардлагагүй урт бичихээс зайлсхий.`

  // Gemini (үнэгүй) эхэлж туршина, хэрэв байхгүй бол Anthropic
  if (geminiKey) {
    const contents = body.messages
      .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }
    // Fallback дараалал: flash → flash-lite → 2.5-flash
    const models = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash']
    let lastError = ''
    for (const model of models) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        )
        const data = await r.json()
        if (r.ok) {
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Хариулт олдсонгүй'
          return NextResponse.json({ reply })
        }
        lastError = data.error?.message || `${model} алдаа (${r.status})`
        // Overload/503 бол дараагийн model руу шилжинэ. Бусад алдаа — шууд буцаана.
        if (r.status !== 503 && r.status !== 429) {
          return NextResponse.json({ error: lastError }, { status: 500 })
        }
      } catch (e) {
        lastError = (e as Error).message
      }
    }
    return NextResponse.json({ error: 'Gemini ачаалалтай байна, дараа туршаад үзнэ үү. (' + lastError + ')' }, { status: 503 })
  }

  if (anthropicKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: body.messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })
      const data = await r.json()
      if (!r.ok) return NextResponse.json({ error: data.error?.message || 'AI алдаа' }, { status: 500 })
      const reply = data.content?.[0]?.text || 'Хариулт олдсонгүй'
      return NextResponse.json({ reply })
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  }

  return NextResponse.json({
    reply: `🤖 AI үйлчилгээ идэвхжүүлэгдээгүй.\n\nАдмин: .env.local файлд GOOGLE_API_KEY (үнэгүй, https://aistudio.google.com/app/apikey) эсвэл ANTHROPIC_API_KEY нэмнэ үү.`,
  })
}
