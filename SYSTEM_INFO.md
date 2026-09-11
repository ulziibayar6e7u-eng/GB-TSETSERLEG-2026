# 📚 ГУРВАНБУЛАГ ЦЭЦЭРЛЭГИЙН УДИРДЛАГЫН СИСТЕМ — ЛАВЛАХ

**Сүүлд шинэчилсэн:** 2026-09-11

---

## 🎯 1. СИСТЕМИЙН ТУХАЙ

- **Нэр:** Гурванбулаг сумын Хүүхдийн цэцэрлэгийн удирдлагын систем
- **Хичээлийн жил:** 2026-2027
- **Зорилго:** Цэцэрлэгийн өдөр тутмын үйл ажиллагаа, бичиг баримт, харилцааг нэг цахим платформд нэгтгэх
- **Технологи:** Next.js 16 · Supabase · TypeScript · Tailwind CSS · Vercel

---

## 🌐 2. ГОЛ ЛИНКҮҮД

### 🚀 Production сайт (бодит хэрэглээ)
- **URL:** https://gb-tsetserleg-2026.vercel.app
- **Ажилтан нэвтрэх:** дээрх URL → Нэвтрэх хуудсанд имэйл + нууц үг

### 🐙 GitHub (кодын сан)
- **Репо:** https://github.com/ulziibayar6e7u-eng/GB-TSETSERLEG-2026
- **Гол салбар:** `main`
- **Push хийхэд** — Vercel автомат deploy эхлүүлнэ

### ▲ Vercel (deploy удирдах)
- **Dashboard:** https://vercel.com/dashboard
- **Төслийн Overview:** https://vercel.com/ulziibayar/gb-tsetserleg-2026
- **Settings:** https://vercel.com/ulziibayar/gb-tsetserleg-2026/settings
- **Environment Variables:** https://vercel.com/ulziibayar/gb-tsetserleg-2026/settings/environments/production
- **Deployments (лог):** https://vercel.com/ulziibayar/gb-tsetserleg-2026/deployments

### 🗄️ Supabase (өгөгдлийн сан)
- **Project ID:** `hxcweimrtqaxdlyrkzbd`
- **Project URL:** `https://hxcweimrtqaxdlyrkzbd.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd
- **SQL Editor:** https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd/sql/new
- **Хүснэгтүүд:** https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd/editor
- **Authentication (нэвтрэх эрх):** https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd/auth/users
- **Storage (файл):** https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd/storage/buckets/org-plans
- **API/Ключ:** https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd/settings/api

### 🤖 Google AI Studio (AI туслах)
- **API keys:** https://aistudio.google.com/app/apikey
- **Vercel-ын `GOOGLE_API_KEY` env var** — AI туслах ажиллахад шаардлагатай

---

## 🔐 3. НЭВТРЭХ ЭРХҮҮД

### Админ эрх
- **Имэйл:** `ulziibayar6e7u@moes.edu.mn` (Г.Өлзийбаяр)
- **Үүрэг:** Хөгжмийн багш + Админ

### Бусад ажилтан (22 хүн)
- **Форматтай имэйл:** `bulag01@moes.mn` — `bulag22@moes.mn`
- **Нууц үг (бүгд адилхан):** `Bulag2026`
- **Э.Сайн-Өлзий (гал тогооны туслах):** `bulag22@moes.mn` / `Bulag2026`

### Нууц үг сэргээх / солих
- Supabase Dashboard → **Authentication** → **Users** → тухайн хэрэглэгчийн 3 цэгэн цэс
- Эсвэл SQL-ээр:
  ```sql
  update auth.users
  set encrypted_password = crypt('ШИНЭ_НУУЦ_ҮГ', gen_salt('bf'))
  where email = 'bulag05@moes.mn';
  ```

### Шинэ ажилтан нэмэх ерөнхий загвар
```sql
do $$
declare v_id uuid; v_uid uuid;
        v_email text := 'bulagXX@moes.mn';
        v_password text := 'Bulag2026';
        v_last text := 'ОВОГ'; v_first text := 'НЭР';
begin
  insert into employees (last_name, first_name, role)
  values (v_last, v_first, 'busad')
  returning id into v_id;

  v_uid := gen_random_uuid();
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_uid, '00000000-0000-0000-0000-000000000000', v_email, crypt(v_password, gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

  insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, 'email', v_email, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true, 'phone_verified', false), now(), now(), now());

  update employees set auth_user_id = v_uid where id = v_id;
end $$;
```

---

## 💻 4. КОД ЗАСАХ, DEPLOY ХИЙХ

### Локал орчин
- **Хавтас:** `D:\kindergarten-system`
- **PowerShell/Bash нээх** → тэр хавтаст очиж ажиллана

### Deploy урсгал (өөрчлөлт хийсний дараа)
```bash
cd D:\kindergarten-system
git add -A
git commit -m "тайлбар"
git push
```
`git push` хийсний дараа Vercel **автоматаар** 1-2 минутын дотор шинэ хувилбар гаргана.

### Deploy статус шалгах
- https://vercel.com/ulziibayar/gb-tsetserleg-2026/deployments
- **Ready** = амжилттай
- **Building** = дуусаагүй байгаа
- **Error** = алдаа гарсан (лог харах)

---

## 🗃️ 5. SUPABASE SQL АЖИЛЛУУЛАХ

Аль ч шинэчлэлт SQL шаардвал:

1. https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd/sql/new нээх
2. Кодыг хуулж paste
3. Дээд баруун буланд **Run** товч (эсвэл Ctrl+Enter)
4. **Success** гарвал ажилласан

### Одоогийн SQL файлууд (заавал ажиллуулах)
Хавтас: `D:\kindergarten-system\supabase\`

| Дугаар | Файл | Юу оруулдаг |
|---|---|---|
| 52 | cleaning_checklist.sql | Цэвэрлэгээ хяналтын хуудас |
| 53 | teach_method.sql | Заах аргын нэгдэл |
| 54 | public_events.sql | Олон нийтийн үйл ажиллагаа |
| 55-56 | public_att_status | Ирц төлөв (present/leave/skip/onduty) |
| 57 | music_activity.sql | Хөгжмийн үйл ажиллагаа |
| 58 | nyarav_extra.sql | Няравын нөөц + нийлүүлэгч |
| 59 | cook_journals.sql | Тогоочийн 5 журнал |
| 60 | cook_taste_photo.sql | Амтлуулсан зураг |
| 61 | music_assessment.sql | Хөгжмийн үнэлгээ |
| 62 | reading_resources.sql | Чанга уншлагын линк |
| 63 | multi_media.sql | Олон зураг/бичлэг |
| 64 | doctor_reviews.sql | Эмчийн хяналт |
| 65 | file_notes.sql | Файлын зөвлөмж |

---

## 🌍 6. ENVIRONMENT VARIABLES (Vercel)

**Хамгийн чухал env vars** (Vercel дээр Production/Preview/Development гурвуулаад тавьсан байх ёстой):

| Нэр | Утга | Үүрэг |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hxcweimrtqaxdlyrkzbd.supabase.co` | Supabase холбогдох URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase → Settings → API-с хуулна) | Public anon key |
| `GOOGLE_API_KEY` | `AIzaSy...` (AI Studio-с) | AI туслах |

**Env var нэмэх:** https://vercel.com/ulziibayar/gb-tsetserleg-2026/settings/environments/production
1. **Add** товч
2. Key + Value бөглөх
3. **Production, Preview, Development** гурвуулаа сонгох
4. **Save**
5. **Deployments** таб → сүүлийн deploy-ын **⋯** → **Redeploy**

---

## ⚠️ 7. ТҮГЭЭМЭЛ АСУУДЛУУД

### "docs.google.com refused to connect" — файл харагдахгүй
- Одоо Microsoft Office Online viewer ашиглана
- Хэрэв тэр ч ажиллахгүй бол Supabase Storage файлын public URL байх ёстой (`org-plans` bucket public тохируулагдсан)

### RLS алдаа "row-level security"
- Хүснэгтэд public policy байхгүй бол:
  ```sql
  alter table <хүснэгтийн_нэр> enable row level security;
  create policy "public all <нэр>" on <нэр> for all using (true) with check (true);
  ```

### Ажилтан нэвтэрч чадахгүй
- Supabase → Authentication → Users жагсаалтад тухайн хэрэглэгч байгаа эсэх
- `auth.identities.provider_id = имэйл` байх ёстой (id биш)
- `email_confirmed_at` NULL биш байх

### Deploy алдаа
- **Deployments** → тухайн deploy → **View Function Logs** — тодорхой алдааг харна
- Env var буруу эсвэл SQL migration ажиллуулаагүй байх магадлалтай

---

## 📁 8. STORAGE (Файл, зураг)

- **Bucket:** `org-plans` (public)
- **Байршил:** https://supabase.com/dashboard/project/hxcweimrtqaxdlyrkzbd/storage/buckets/org-plans
- **Ашиглах хавтас:**
  - `heregleg/` — Хэрэглэгдэхүүн, хөтөлбөр
  - `logs/` — Өдрийн тайлан
  - `obs/` — Ажиглалт
  - `music-activity/` — Хөгжмийн үйл ажиллагаа
  - `taste/` — Тогоочийн амтлуулсан
  - гэх мэт

---

## 🆘 9. ТУСЛАМЖ

- **Клод AI (Claude Code):** Дараа нь асуудал гарвал энэ туслах AI-д нэг л асуулт хэлээд системийн лавлахыг харуулна
- **Vercel тусламж:** https://vercel.com/help
- **Supabase тусламж:** https://supabase.com/docs

---

## 🎨 10. ЦЭСНИЙ БҮТЭЦ (2026-09 байдлаар)

### Эрхлэгч
- Батламжийн ширээ · Ажилтан бүрээр · Гүйцэтгэлийн анализ · Сургалт, үйл ажиллагаа · Хүүхэд хамгаалал · Хөтөлбөрийн хэрэгжилт · Хэрэглэгдэхүүн, хөтөлбөр · Ажилтны ирц · Жижүүр багшийн тайлан · Байгууллагын төлөвлөгөө · Ажилтны удирдлага · Дугуйлан · Хүүхдийн бүртгэл · Бусад ажилтан · Үүрэг даалгавар · Санаачилсан ажил · Чөлөө · Олон нийтийн үйл ажиллагаа · Зар мэдээ · Систем тохиргоо

### Арга зүйч
- Батламжийн ширээ · Багш нар · Заах аргын нэгдэл · Хяналтын цэсүүд · Ажил үүрэг

### Багш
- Ирц · Жижүүр багш · Сургалт үйл ажиллагаа · Дугуйлан · Хөтөлбөрийн хэрэгжилт · Хэрэглэгдэхүүн, хөтөлбөр · Заах аргын нэгдэл · Ажил үүрэг · Олон нийтийн үйл ажиллагаа · Зар мэдээ

### Багшийн туслах
- Дадал хэвшил · Дадал хэвшлийн судалгаа · Ариун цэврийн журнал · Цэвэрлэгээ хяналт · Санаачилсан ажил · Цэвэрлэгээ, үйлчилгээ · Үүрэг даалгавар · Олон нийтийн үйл ажиллагаа · Зар мэдээ

### Эмч
- Эрүүл мэндийн хэсэг · Цэвэрлэгээ хяналт · Тогооч хянах · Үйлчлэгч тайлан хянах

### Нярав
- Хяналтын самбар · Материалын жагсаалт · Хүлээн авалт · Тараалт · Хөдөлгөөний түүх · Нийлүүлэгчид

### Тогооч
- Хоолны хэмжээ · Дээж · Амтлуулсан · Хүүхдийн тоо · Аяга ариутгал · Сарын нэгтгэл

### Үйлчлэгч, харуул, бусад
- Өдрийн тайлан · Их цэвэрлэгээний хуваарь

---

**АНХААРУУЛГА:** Энэ файлыг гуравдагч этгээдэд бүү илгээ. Нууц үг + admin эрхийн мэдээлэл агуулж байгаа тул зөвхөн өөртөө хадгална уу.
