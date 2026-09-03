create table if not exists lessons (id uuid primary key default gen_random_uuid(), group_id text not null, element_id text not null, title text not null, note text, materials jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists plans (id uuid primary key default gen_random_uuid(), group_id text not null, tab text not null, title text not null, period text, element text, goal text, method text, resources text, content text, result text, files jsonb default '[]'::jsonb, media jsonb default '[]'::jsonb, approved_at timestamptz, approved_by text, approval_note text, created_at timestamptz default now());
create table if not exists children (id uuid primary key default gen_random_uuid(), group_id text not null, name text not null, birth_year text, parent_code text unique not null, avatar text, created_at timestamptz default now());
create table if not exists assessments (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, section text not null, subsection text, date date, title text, text text, media jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists settings (key text primary key, value text not null);
create table if not exists criteria_checks (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, level int not null, criterion_num int not null, checked boolean default false, checked_at timestamptz, note text, unique(child_id, level, criterion_num));
create table if not exists events (id uuid primary key default gen_random_uuid(), title text not null, event_date date, description text, group_ids text[], songs text[], notes text, media jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists attendance (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, date date not null, status text not null, note text, unique(child_id, date));
create table if not exists messages (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, from_role text not null, text text, media jsonb default '[]'::jsonb, read_at timestamptz, created_at timestamptz default now());
create table if not exists instruments (id uuid primary key default gen_random_uuid(), num int, name_mn text not null, name_en text, image_url text, description text, category text);
create table if not exists music_criteria_checks (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, level int not null, category text not null, criterion_num int not null, status text, note text, updated_at timestamptz default now(), unique(child_id, level, category, criterion_num));
create table if not exists announcements (id uuid primary key default gen_random_uuid(), kind text not null, title text not null, text text, event_date date, media jsonb default '[]'::jsonb, files jsonb default '[]'::jsonb, pinned boolean default false, created_at timestamptz default now());
create table if not exists methodist_notes (id uuid primary key default gen_random_uuid(), from_name text not null, from_role text, title text not null, text text, files jsonb default '[]'::jsonb, media jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists tasks (id uuid primary key default gen_random_uuid(), title text not null, description text, category text, work_groups text[] default '{}', files jsonb default '[]'::jsonb, media jsonb default '[]'::jsonb, due_date date, completion_pct int default 0, approved_at timestamptz, approved_by text, approval_note text, created_at timestamptz default now());
create table if not exists diary (id uuid primary key default gen_random_uuid(), entry_date date not null, title text, text text, mood text, media jsonb default '[]'::jsonb, files jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists achievements (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, title text not null, description text, icon text default '🌟', earned_at date default current_date, media jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists calendar_events (id uuid primary key default gen_random_uuid(), title text not null, event_date date not null, event_time time, kind text default 'other', color text default '#3b82f6', description text, created_at timestamptz default now());
create table if not exists song_library (id uuid primary key default gen_random_uuid(), kind text not null, title text not null, author text, level int, url text, notes text, media jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists homework (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, group_id text, title text not null, description text, due_date date, media jsonb default '[]'::jsonb, files jsonb default '[]'::jsonb, status text default 'pending', parent_note text, parent_media jsonb default '[]'::jsonb, completed_at timestamptz, created_at timestamptz default now());
create table if not exists parent_feedback (id uuid primary key default gen_random_uuid(), child_id uuid references children(id) on delete cascade, kind text default 'suggestion', text text not null, media jsonb default '[]'::jsonb, teacher_reply text, replied_at timestamptz, created_at timestamptz default now());
create table if not exists teacher_profile (id uuid primary key default gen_random_uuid(), name text, position text, photo_url text, intro_video_url text, bio text, mission text, phone text, email text, education jsonb default '[]'::jsonb, experience jsonb default '[]'::jsonb, awards jsonb default '[]'::jsonb, trainings jsonb default '[]'::jsonb, publications jsonb default '[]'::jsonb, skills jsonb default '[]'::jsonb, timeline jsonb default '[]'::jsonb, gallery jsonb default '[]'::jsonb, testimonials jsonb default '[]'::jsonb, updated_at timestamptz default now());
create table if not exists activities (id uuid primary key default gen_random_uuid(), group_id text not null, activity_date date not null, title text, note text, media jsonb default '[]'::jsonb, files jsonb default '[]'::jsonb, created_at timestamptz default now());
create table if not exists plan_matrix (level int primary key, overrides jsonb default '[]'::jsonb, updated_at timestamptz default now());
create table if not exists monthly_matrix (level int not null, month int not null, data jsonb default '{}'::jsonb, updated_at timestamptz default now(), primary key(level, month));
alter table lessons enable row level security;
alter table plans enable row level security;
alter table children enable row level security;
alter table assessments enable row level security;
alter table settings enable row level security;
alter table criteria_checks enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table messages enable row level security;
alter table instruments enable row level security;
alter table music_criteria_checks enable row level security;
alter table announcements enable row level security;
alter table methodist_notes enable row level security;
alter table tasks enable row level security;
alter table diary enable row level security;
alter table achievements enable row level security;
alter table calendar_events enable row level security;
alter table song_library enable row level security;
alter table homework enable row level security;
alter table parent_feedback enable row level security;
alter table teacher_profile enable row level security;
alter table activities enable row level security;
alter table plan_matrix enable row level security;
alter table monthly_matrix enable row level security;
do $$ begin
  create policy "p_all_lessons" on lessons for all using (true) with check (true);
  create policy "p_all_plans" on plans for all using (true) with check (true);
  create policy "p_all_children" on children for all using (true) with check (true);
  create policy "p_all_assess" on assessments for all using (true) with check (true);
  create policy "p_all_settings" on settings for all using (true) with check (true);
  create policy "p_all_cc" on criteria_checks for all using (true) with check (true);
  create policy "p_all_ev" on events for all using (true) with check (true);
  create policy "p_all_at" on attendance for all using (true) with check (true);
  create policy "p_all_ms" on messages for all using (true) with check (true);
  create policy "p_all_in" on instruments for all using (true) with check (true);
  create policy "p_all_mcc" on music_criteria_checks for all using (true) with check (true);
  create policy "p_all_ann" on announcements for all using (true) with check (true);
  create policy "p_all_mn" on methodist_notes for all using (true) with check (true);
  create policy "p_all_tk" on tasks for all using (true) with check (true);
  create policy "p_all_dr" on diary for all using (true) with check (true);
  create policy "p_all_ach" on achievements for all using (true) with check (true);
  create policy "p_all_ce" on calendar_events for all using (true) with check (true);
  create policy "p_all_sl" on song_library for all using (true) with check (true);
  create policy "p_all_hw" on homework for all using (true) with check (true);
  create policy "p_all_pf" on parent_feedback for all using (true) with check (true);
  create policy "p_all_tp" on teacher_profile for all using (true) with check (true);
  create policy "p_all_act" on activities for all using (true) with check (true);
  create policy "p_all_pm" on plan_matrix for all using (true) with check (true);
  create policy "p_all_mm" on monthly_matrix for all using (true) with check (true);
exception when duplicate_object then null; end $$;
insert into settings (key, value) values ('teacher_password', 'Suwdaa1113'), ('methodist_password', 'ArgaZuich2026') on conflict (key) do nothing;
insert into instruments (num, name_mn, name_en) values
(1,'Нидрүүлэгтэй дуут мод','Tone block'),(2,'Инцдүүр','Castanets'),(3,'Хос дуут мод','Claves'),(4,'Кажон','Cajon'),(5,'Бөмбөр','Drum'),(6,'Бонго бөмбөр','Bongo'),(7,'Шигшрэг','Tambourine'),(8,'Хэц (шигшрэгтэй)','Tambourine with jingles'),(9,'Хэц (шигшрэггүй)','Wave drum'),(10,'Бариултай хонх','Sleigh bells'),(11,'Туузан хонх','Wrist bell'),(12,'Дэншиг хонх','Hand bell'),(13,'Цан','Cymbals'),(14,'Хүрий','Triangle'),(15,'Өндгөн шигшүүр','Egg shaker'),(16,'Шигшүүр','Maracas'),(17,'Төмөр царгил','Glockenspiel'),(18,'Модон царгил','Xylophone'),(19,'Эгшигт хонх (дарж)','Desk touch bell'),(20,'Эгшигт хонх (сэгсэрч)','Melody bell'),(21,'Даралтат дэвсгэр','Playmat Keyboard'),(22,'Цуурайт хонх','Resonator bell'),(23,'Хөгт хоолой','Boomwhackers'),(24,'Эрхий хурууны төгөлдөр хуур','Kalimba'),(25,'Даралтад үлээвэр','Pianica'),(26,'Тууз','Ribbon wand'),(27,'Цагариг','Hoop'),(28,'Өнгөт алчуур','Dancing scarf'),(29,'Уян татлага','Cooperative band'),(30,'Шүхэрт даавуу','Parachute cloth'),(31,'Үсэрдэг дэвсгэр','Jumping mat'),(32,'Бага тайз','Performance stage')
on conflict do nothing;
insert into song_library (kind, title, author, level, url) values
('song','Туулай','Үг Д.Тунгалаг, Ая У.Ариунзул',1,null),('song','Бие эрхтнээ нэрлэе','Орчуулгын дуу',1,null),('song','Болохгүй','Үг, Ая Д.Хоролсүрэн',1,null),('song','Хуруугаар тоглоё','Орчуулгын дуу',1,null),('song','Баавгай','Үг, Ая Ө.Ариунзул',1,null),('song','Өглөөний дасгал','Үг, Ая Д.Хоролсүрэн',1,null),('song','Унтаж байна уу','Орчуулгын дуу',1,null),('song','Үсрээрэй','Үг Г.Ганболд, Ая Б.Цэвээнсүрэн',1,null),('song','Аа гоёо гоёо','Үг О.Сэрээнэн, Ая П.Жүрмэд',1,null),
('song','Хос эрхтнээ нэрлэе','Үг, Ая Ц.Тэргүүнцэцэг',2,null),('song','Би','Үг Г.Ганболд, Ая Б.Цэвээнсүрэн',2,null),('song','Тугал','Үг Г.Ганболд, Ая Б.Цэвээнсүрэн',2,null),('song','Цагаан сар','Үг Г.Ганболд, Ая Б.Цэвээнсүрэн',2,null),('song','Алгаа ташаарай','Үг З.Юмчирсүрэн, Ая Х.Пунцагдорж',2,null),('song','Мөнгөн өвөл','Ая Нармандах',2,null),('song','Амин хүүдээ би','Үг Г.Ганболд, Ая Л.Галмандах',2,null),('song','Би угаадаг','Үг Я.Отгонжаргал, Ая Л.Алтангэрэл',2,null),('song','Шинэ жил','Үг Г.Ганболд, Ая Б.Цэвээнсүрэн',2,null),('song','Хөвчийн ойд гэртэй бүжин','Орчуулгын дуу',2,null),('song','Хонхтой бойтог','Үг, Ая Д.Хоролсүрэн',2,null),
('song','Ахин нэг тоглоё','Үг, Ая С.Ууганбаяр',3,null),('song','Наадан тоглоё','Үг, Ая С.Батболд',3,null),('song','Лууван','Үг Я.Отгонжаргал, Ая Л.Алтангэрэл',3,null),('song','Шүдээ угаацгаая','Үг Д.Амарсанаа, Ая Б.Өнөржаргал',3,null),('song','Цасан дор жимс ургана','Үг Ш.Бадарч, Ая С.Батболд',3,null),('song','Ирээрэй','Үг, Ая Б.Эрдэнэбат',3,null),('song','Цагаан сар (III)','Үг, Ая Ц.Сумьяабат',3,null),('song','Өвлийн өвгөн хүрээд ирлээ','Үг Г.Ганболд, Ая С.Батболд',3,null),('song','Бороо','Үг Г.Ганболд, Ая Б.Цэвээнсүрэн',3,null),('song','Ам бүл таван хуруу','Үг Г.Ганболд, Ая Б.Цэвээнсүрэн',3,null),('song','Дөрвөн бэрх','Үг Б.Дашгомбо, Ая Г.Жанцансамбуу',3,null),
('song','Зөв хүүхэд','Үг Б.Нацагдорж, Ая С.Батболд',4,null),('song','Нуугдаж тоглоё','Үг, Ая С.Ууганбаяр',4,null),('song','Найзуудаа зурлаа','Үг Ц.Болормаа, Ая Б.Амарбаяр',4,null),('song','Таньдаггүй гэнэ байх даа','Үг Г.Ганболд, Ая С.Батболд',4,null),('song','Өв соёлоо дээдэлье','Үг О.Сундуй, Ая С.Батболд',4,null),('song','Цагаан идээ','Үг, Ая С.Ууганбаяр',4,null),('song','Гоёо','Үг, Ая Б.Эрдэнэбат',4,null),('song','Шагайн наадгай','Үг П.Одсүрэн, Ая С.Батболд',4,null),('song','Хогоо бүү хаяарай','Үг Ч.Алтансүх, Ая Э.Дөлгөөн',4,null),('song','Оньсого','Үг, Ая Б.Эрдэнэбат',4,null),('song','Монгол ухаан','Үг, Ая С.Ууганбаяр',4,null),('song','Болчихно доо','Үг, Ая Б.Эрдэнэбат',4,null),('song','Мөрөөдлийн гацуур','Үг Д.Батзориг, Ая Ч.Алтансүх',4,null),('song','Миний бүтээл','Үг Э.Саранзаяа, Ая С.Ганчимэг',4,null),
('movement','Тоглоом','Д.Чимэддорж/Г.Бирваа',null,null),('movement','Алгаа таш','Орчуулгын дуу',null,null),('movement','Нуугдсан уу','З.Түмэнжаргал/С.Батболд',null,null),('movement','Амьтад болж тоглоё','Н.Энхжаргал/С.Батболд',null,null),('movement','Бүгдийг чадна би','М.Отгонбаяр/Л.Санжаа',null,null),('movement','Хэрэм','Г.Сэсмээ/П.Жүрмэд',null,null),('movement','Хос хосоороо эргэе','Орчуулгын дуу',null,null),('movement','Мангас Оди','С.Ууганбаяр',null,null),('movement','Цэцэг','Орчуулгын дуу',null,null),('movement','Би бол бяцхан цэцэг','С.Ууганбаяр',null,null),('movement','Муур хулганы дуу','Г.Ганболд/С.Батболд',null,null),('movement','Хүүхэлдэй','Д.Отгонсүрэн/С.Ганчимэг',null,null),('movement','Дуулан бүжиглэе','Ц.Амарсайхан',null,null),('movement','Хөгжилтэй алхаа','Ц.Амарсайхан',null,null),
('listening','Төрөл бүрийн дуу авиа',null,null,'https://youtu.be/CvkwVvB4_fM'),('listening','Хурдан удаан, жижиг том',null,null,'https://www.youtube.com/watch?v=LnKNuw83U-Y'),('listening','Хөгжмийн өнгө аяс',null,null,'https://youtu.be/aW9SjgzzGr8'),('listening','Полет шмеля','Римский Корсаков',null,'https://www.youtube.com/watch?v=X14kC-sEH0I'),('listening','The Syncopated Clock','Leroy Anderson',null,'https://youtu.be/CrpdQngwk2g'),('listening','Өглөө','Эдвард Григ',null,'https://youtu.be/5rRF8qK0OtM'),('listening','Улирал','П.И.Чайковский',null,'https://youtu.be/aW9SjgzzGr8'),('listening','Морин хуурын татлага',null,null,'https://youtu.be/vw3iGGfPzgA'),('listening','Монгол аялгуу','Н.Жанцанноров',null,'https://youtu.be/mKDUhrETXew'),('listening','Арслан','Сен-Санс',null,'https://youtu.be/rE4CATvZ188'),('listening','Тахиа','Сен-Санс',null,'https://youtu.be/lEd7Ovt4cWE'),('listening','Яст мэлхий','Сен-Санс',null,'https://youtu.be/wPHqJTpgo-U'),('listening','Заан','Сен-Санс',null,'https://youtu.be/f1nVDoCnsNk'),('listening','Загас','Сен-Санс',null,'https://youtu.be/-OAQ6rAs9DA'),('listening','Хөхөө','Сен-Санс',null,'https://youtu.be/NJpqN2oTgR8'),('listening','Хун','Сен-Санс',null,'https://youtu.be/cXEy_UfSgCU'),('listening','Жонон харын явдал',null,null,'https://youtu.be/XV4iZjESFEs'),('listening','Бүүвэйн дуу','И.Брамс',null,'https://youtu.be/t894eGoymio'),('listening','Хунт нуур балет','П.Чайковский',null,'https://youtu.be/Me0T73TKF2w'),('listening','Орос марш','И.Штраус',null,'https://youtu.be/DFy7buyU0rQ')
on conflict do nothing;
