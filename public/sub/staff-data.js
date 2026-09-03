// ═══════════════════════════════════════════════════════════════
// ЦЭЦЭРЛЭГИЙН МЭДЭЭЛЭЛ БОЛОН АЖИЛТНУУДЫН ЖАГСААЛТ
// Эрхлэгч засах устгах нэмэх горимоор ажиллана
// Supabase-т `staff` table-т хадгалагдана, LocalStorage-т backup хадгална
// ═══════════════════════════════════════════════════════════════

window.KINDERGARTEN = {
  name: "Гурванбулаг сумын Хүүхдийн цэцэрлэг",
  address: "Гурванбулаг сум",
  logo: "logo.png",   // Лого зурагыг logo.png нэрээр СӨБ_БҮЛГИЙН_БАГШ хавтаст хуулна
  director: { name: "Э.Цэрэнханд", phone: "", email: "" }
};

window.STAFF_DEPARTMENTS = {
  teaching: {
    id: "teaching", name: "Заах аргын нэгдэл", icon: "📚",
    color: "#7c3aed", gradient: "linear-gradient(135deg,#faf5ff,#e9d5ff)"
  },
  admin: {
    id: "admin", name: "Захиргаа, аж ахуй", icon: "🏢",
    color: "#0891b2", gradient: "linear-gradient(135deg,#ecfeff,#a5f3fc)"
  }
};

// Албан тушаалын жагсаалт (role-ууд)
window.STAFF_ROLES = {
  // ── Удирдлага ──
  director:         { name: "Эрхлэгч",                          dept: "teaching", icon: "👑", color: "#dc2626" },
  // ── Заах аргын нэгдэл ──
  methodist:        { name: "Арга зүйч",                       dept: "teaching", icon: "🎓", color: "#d97706" },
  music_teacher:    { name: "Хөгжмийн багш",                   dept: "teaching", icon: "🎵", color: "#7c3aed" },
  teacher_alt:      { name: "Хувилбарт сургалтын багш",         dept: "teaching", icon: "🎨", color: "#06b6d4" },
  teacher_baga:     { name: "Нархан (Бага) бүлгийн багш",      dept: "teaching", icon: "👶", color: "#ec4899" },
  teacher_dund:     { name: "Багачууд (Дунд) бүлгийн багш",    dept: "teaching", icon: "🧒", color: "#f59e0b" },
  teacher_ahlah:    { name: "Дэгдээхий (Ахлах) бүлгийн багш",  dept: "teaching", icon: "🐣", color: "#eab308" },
  teacher_beltgel:  { name: "Бүжинхэн (Бэлтгэл) бүлгийн багш", dept: "teaching", icon: "🐰", color: "#8b5cf6" },
  assistant_baga:   { name: "Нархан бүлгийн туслах",           dept: "teaching", icon: "👥", color: "#f9a8d4" },
  assistant_dund:   { name: "Багачууд бүлгийн туслах",         dept: "teaching", icon: "👥", color: "#fcd34d" },
  assistant_ahlah:  { name: "Дэгдээхий бүлгийн туслах",        dept: "teaching", icon: "👥", color: "#fde047" },
  assistant_beltgel:{ name: "Бүжинхэн бүлгийн туслах",         dept: "teaching", icon: "👥", color: "#c4b5fd" },
  // ── Захиргаа, аж ахуй ──
  accountant:       { name: "Нягтлан",             dept: "admin", icon: "💰", color: "#059669" },
  storekeeper:      { name: "Нярав",               dept: "admin", icon: "📦", color: "#0891b2" },
  doctor:           { name: "Эмч",                 dept: "admin", icon: "🩺", color: "#dc2626" },
  cook:             { name: "Тогооч",              dept: "admin", icon: "👨‍🍳", color: "#ea580c" },
  kitchen_assist:   { name: "Гал тогооны туслах",  dept: "admin", icon: "🥣", color: "#f97316" },
  cleaner:          { name: "Үйлчлэгч",            dept: "admin", icon: "🧹", color: "#0e7490" },
  security:         { name: "Харуул хамгаалалт",   dept: "admin", icon: "🛡️", color: "#1e40af" }
};

// ═══════════════════════════════════════════════════════════════
// АЖИЛТНУУДЫН АНХНЫ ЖАГСААЛТ (21 хүн)
// Эрхлэгч засварласны дараа Supabase-т хадгалагдана
// ═══════════════════════════════════════════════════════════════
window.STAFF_LIST_DEFAULT = [
  // ── Удирдлага ──
  { id: "director_1",         role: "director",         name: "Э.Цэрэнханд",       phone: "" },
  // ── Заах аргын нэгдэл ──
  { id: "methodist_1",        role: "methodist",        name: "С.Саранчимэг",      phone: "" },
  { id: "music_teacher_1",    role: "music_teacher",    name: "Г.Өлзийбаяр",       phone: "" },
  { id: "teacher_alt_1",      role: "teacher_alt",      name: "О.Билэгсайхан",     phone: "" },
  { id: "teacher_beltgel_1",  role: "teacher_beltgel",  name: "Б.Тунгалаг",        phone: "" },
  { id: "assistant_beltgel_1",role: "assistant_beltgel",name: "П.Сайнзаяа",        phone: "" },
  { id: "teacher_ahlah_1",    role: "teacher_ahlah",    name: "Л.Отгонзаяа",       phone: "" },
  { id: "assistant_ahlah_1",  role: "assistant_ahlah",  name: "Ө.Элбэгзаяа",       phone: "" },
  { id: "teacher_dund_1",     role: "teacher_dund",     name: "П.Эрдэнэцэцэг",     phone: "" },
  { id: "assistant_dund_1",   role: "assistant_dund",   name: "Д.Уранчимэг",       phone: "" },
  { id: "teacher_baga_1",     role: "teacher_baga",     name: "М.Баяржаргал",      phone: "" },
  { id: "assistant_baga_1",   role: "assistant_baga",   name: "Н.Амарбаясгалан",   phone: "" },
  // ── Захиргаа, аж ахуй ──
  { id: "accountant_1",       role: "accountant",       name: "Б.Дэлгэрдалай",     phone: "" },
  { id: "storekeeper_1",      role: "storekeeper",      name: "Б.Тэгшдэлгэр",      phone: "" },
  { id: "doctor_1",           role: "doctor",           name: "Б.Ганцэцэг",        phone: "" },
  { id: "cook_1",             role: "cook",             name: "Г.Бүжинлхам",       phone: "" },
  { id: "kitchen_assist_1",   role: "kitchen_assist",   name: "Б.Оюунчимэг",       phone: "" },
  { id: "cleaner_1",          role: "cleaner",          name: "У.Мөнхцэцэг",       phone: "" },
  { id: "security_1",         role: "security",         name: "Б.Мөнх-Эрдэнэ",     phone: "" },
  { id: "security_2",         role: "security",         name: "Б.Очбаяр",          phone: "" },
  { id: "security_3",         role: "security",         name: "Л.Энэбиш",          phone: "" }
];

// STAFF_LIST-ыг LocalStorage-с уншиж, байхгүй бол default-с ачаална
try {
  const saved = localStorage.getItem('staff_list_v2');
  window.STAFF_LIST = saved ? JSON.parse(saved) : [...window.STAFF_LIST_DEFAULT];
} catch(e) { window.STAFF_LIST = [...window.STAFF_LIST_DEFAULT]; }

// STAFF_LIST хадгалах
window.saveStaffList = function() {
  try { localStorage.setItem('staff_list_v2', JSON.stringify(window.STAFF_LIST)); return true; }
  catch(e) { console.warn(e); return false; }
};

// ═══════════════════════════════════════════════════════════════
// АЖЛЫН ХЭСГҮҮД (WORK GROUPS)
// Ахлагч + гишүүд бүхий комисс, зөвлөл г.м
// Эрхлэгч засварлана
// ═══════════════════════════════════════════════════════════════
window.WORK_GROUPS_DEFAULT = [
  {
    id: "wg_child_rights",
    name: "Хүүхдийн эрх хамгаалах хэсэг",
    icon: "🛡️",
    description: "Хүүхдийн эрх, хамгаалалын асуудлыг хэлэлцэн шийдвэрлэнэ.",
    leader_id: "methodist_1",
    member_ids: ["teacher_beltgel_1", "teacher_ahlah_1", "doctor_1"]
  },
  {
    id: "wg_health",
    name: "Эрүүл ахуй, хамгаалалын хэсэг",
    icon: "🩺",
    description: "Хүүхэд болон ажилчдын эрүүл ахуй, эрүүл мэндийн хамгаалалт.",
    leader_id: "doctor_1",
    member_ids: ["cook_1", "kitchen_assist_1", "cleaner_1"]
  },
  {
    id: "wg_safety",
    name: "Аюулгүй байдлын хэсэг",
    icon: "⚠️",
    description: "Гамшгаас хамгаалах, галын аюулгүй байдал, хамгаалалтын арга хэмжээ.",
    leader_id: "security_1",
    member_ids: ["security_2", "security_3", "storekeeper_1"]
  },
  {
    id: "wg_food",
    name: "Хүнс тэжээлийн хэсэг",
    icon: "🍲",
    description: "Хүүхдийн хоол, хүнсний найдвартай байдал, чанарын хяналт.",
    leader_id: "cook_1",
    member_ids: ["kitchen_assist_1", "doctor_1", "storekeeper_1"]
  },
  {
    id: "wg_culture",
    name: "Соёл, урлагийн хэсэг",
    icon: "🎭",
    description: "Соёлын арга хэмжээ, урлагийн тоглолт зохион байгуулах.",
    leader_id: "music_teacher_1",
    member_ids: ["teacher_beltgel_1", "teacher_ahlah_1", "teacher_alt_1"]
  }
];

try {
  const savedWG = localStorage.getItem('work_groups_v2');
  window.WORK_GROUPS = savedWG ? JSON.parse(savedWG) : [...window.WORK_GROUPS_DEFAULT];
} catch(e) { window.WORK_GROUPS = [...window.WORK_GROUPS_DEFAULT]; }

window.saveWorkGroups = function() {
  try { localStorage.setItem('work_groups_v2', JSON.stringify(window.WORK_GROUPS)); return true; }
  catch(e) { console.warn(e); return false; }
};

// ═══════════════════════════════════════════════════════════════
// Нэмэлт функцууд
// ═══════════════════════════════════════════════════════════════
window.getStaffByDept = function(dept) {
  return window.STAFF_LIST.filter(s => (window.STAFF_ROLES[s.role] || {}).dept === dept);
};

window.getRoleInfo = function(roleId) {
  return window.STAFF_ROLES[roleId] || { name: roleId, icon: "❓", color: "#94a3b8" };
};

window.getStaffById = function(id) {
  return window.STAFF_LIST.find(s => s.id === id);
};

window.newStaffId = function(role) {
  let n = 1;
  while (window.STAFF_LIST.find(s => s.id === `${role}_${n}`)) n++;
  return `${role}_${n}`;
};

window.newWorkGroupId = function() {
  return 'wg_' + Date.now();
};
