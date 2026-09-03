# 🔬 Судалгааны системийг тохируулах заавар

## 📦 Файлын бүтэц

```
research/
├── research.sql                 ← Танай төв Supabase-т ажиллуулах
├── research.html                ← Судалгааны dashboard
└── README_СУДАЛГАА.md          ← Энэ файл

../research_sync.js              ← Багшийн систем бүрд байх ёстой
```

---

## 🚀 АЛХАМ 1: Судалгааны төв Supabase үүсгэх (5 мин)

1. `supabase.com` → шинэ project
2. Нэр: **`hugjim-research`**
3. Region: **Singapore** (Монгол руу ойрхон)
4. Password санаж авах
5. **Create new project** дар
6. 2 минут хүлээ

---

## 🚀 АЛХАМ 2: Schema үүсгэх (2 мин)

1. Шинэ project дотор → **SQL Editor** → **New query**
2. `research.sql` файлыг Notepad-аар нээ
3. `Ctrl+A → Ctrl+C`
4. Supabase-т `Ctrl+V` → **RUN**
5. "Success" гарна ✅

---

## 🚀 АЛХАМ 3: API түлхүүрүүд авах (1 мин)

1. Supabase project → **Settings** → **API Keys**
2. **Project URL** хуулах (жишээ: `https://xxxxx.supabase.co`)
3. **anon / publishable** key хуулах (эхэлж: `sb_publishable_...`)

---

## 🚀 АЛХАМ 4: research.html тохируулах (2 мин)

`research.html`-ыг Notepad-аар нээ, дараах 3 мөрийг өөрчлөх:

```javascript
const RESEARCH_URL = "https://ТАНАЙ-URL.supabase.co";
const RESEARCH_KEY = "sb_publishable_ТАНАЙ-KEY";
const RESEARCH_PW = "Ulziibayar2026"; // ← өөрийн нууц үг
```

Хадгалаад хөтөчөөр нээж туршина.

---

## 🚀 АЛХАМ 5: Багш нарын систем-т sync нэмэх (10 мин)

Багш бүрийн GitHub репод дараах хийнэ:

### А. research_sync.js тохируулах
`research_sync.js`-ын дээд талд:
```javascript
const RESEARCH_URL = "https://ТАНАЙ-URL.supabase.co";
const RESEARCH_KEY = "sb_publishable_ТАНАЙ-KEY";
```

### Б. Багшийн репод upload
- `research_sync.js` файлыг GitHub-т upload

### В. index.html дотор script нэмэх
`</body>` тагийн өмнө:
```html
<script src="research_sync.js"></script>
```

---

## 🚀 АЛХАМ 6: Багшийн зөвшөөрөл авах

Багшийн index.html-ийн тохиргоо хэсэгт нэмэх:

```html
<label style="display:block;margin:16px 0">
  <input type="checkbox" id="researchConsent"
         onchange="localStorage.setItem('research_consent', this.checked)">
  🔬 Судалгаанд оролцох (анонимжуулсан тоо мэдээ илгээнэ)
</label>
<script>
  document.getElementById('researchConsent').checked =
    localStorage.getItem('research_consent') === 'true';
</script>
```

**Багш checkbox дарж, зөвшөөрөл өгсөн үед л sync ажиллана.**

---

## 📊 Юу цуглуулах вэ?

**Цуглуулна:**
- ✅ Хүүхдийн нас, хүйс, түвшин
- ✅ Үнэлгээний оноо
- ✅ Хөгжмийн шалгуурын статус
- ✅ Ирцний статистик
- ✅ Дуу ашиглалт

**Цуглуулахгүй:**
- ❌ Хүүхдийн нэр
- ❌ Багшийн нэр (зөвхөн hash)
- ❌ Зураг, дуу, видео
- ❌ Эцэг эхийн мэдээлэл

---

## 🎓 Судалгаанд ашиглах

**SQL asuulga (жишээ):**

```sql
-- Хамгийн олон хүүхэдтэй бүсчлэлүүд
select region, sum(total_children) as total
from research_teachers
group by region
order by total desc;

-- Насны бүлгээр хөгжмийн ирц
select rc.age, avg(rms.criterion_num) as avg_score
from research_children rc
join research_music_scores rms on rc.child_hash = rms.child_hash
where rms.status = 'done'
group by rc.age;
```

---

## 🔒 Хууль ёсны асуудал

- ✅ Хувийн мэдээллийн хууль зөрчихгүй (нэр, хаяг байхгүй)
- ✅ Хэрэглэгч зөвшөөрөл өгсөн үед л явна
- ✅ Хэзээ ч татан авах эрхтэй (localStorage-с check-ыг арилгах)
- ⚠️ Судалгааны нийтлэлд Supabase-ийн Terms of Service-ыг зөрчихгүй эсэхийг шалгах
