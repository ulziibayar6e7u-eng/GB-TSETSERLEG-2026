import mammoth from 'mammoth'
const files = [
  ['beltgel', 'D:/СӨБ бүлгийн багш/бэлтгэл гарын авлага.docx'],
  ['ahlah',   'D:/СӨБ бүлгийн багш/ахлах гарын авлага.docx'],
  ['dund',    'D:/СӨБ бүлгийн багш/дунд гарын авлага.docx'],
  ['baga',    'D:/СӨБ бүлгийн багш/бага гарын авлага.docx'],
]
for (const [code, path] of files) {
  const r = await mammoth.extractRawText({ path })
  const text = r.value
  console.log(`\n=== ${code.toUpperCase()} — ${text.length} chars ===`)
  console.log(text.slice(0, 2000))
  console.log('...')
}
