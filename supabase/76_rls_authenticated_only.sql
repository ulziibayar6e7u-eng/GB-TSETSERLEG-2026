-- 76_rls_authenticated_only.sql
-- Зорилго: нэвтрээгүй (anon) хэрэглэгч хүснэгтийн өгөгдөлд хандахыг хаах.
--
-- Өмнө: "public all ..." бодлогууд `for all using (true)` гэж бүх хэрэглэгчид
--       (нэвтрээгүй хүн ч) нээлттэй байсан.
-- Одоо: тэдгээр бодлогыг зөвхөн `authenticated` (нэвтэрсэн) хэрэглэгчид хамаатай болгоно.
--       Ажилтан бүр нэвтэрсэн хэвээр өмнөх шигээ ажиллана. Энэ бол 1-р шат.
--       Дараагийн шат: хүснэгт бүр дээр бүлэг, үүргээр хязгаарлах.
--
-- АНХААР:
--  1. Ажиллуулахаас өмнө Supabase дээр backup хийнэ (Database -> Backups).
--  2. Эхлээд туршилтын төсөл дээр ажиллуул.
--  3. Ажиллуулсны дараа нэвтэрсэн ажилтнаар сайтыг шалгана (самбар, хүүхдийн жагсаалт, ирц).
--  4. Нэвтрэх хуудас (/login) ажиллах ёстой, учир нь auth нь тусдаа схемд.

-- 1) `public` (бүх хэрэглэгч) эрхтэй, нөхцөлгүй (true) бодлогуудыг authenticated руу шилжүүлнэ
do $$
declare
  r record;
  clause text;
begin
  for r in
    select schemaname, tablename, policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and roles::text = '{public}'
      and coalesce(qual, 'true') = 'true'
      and coalesce(with_check, 'true') = 'true'
  loop
    clause := case r.cmd
      when 'SELECT' then 'using (true)'
      when 'DELETE' then 'using (true)'
      when 'INSERT' then 'with check (true)'
      else 'using (true) with check (true)'   -- ALL, UPDATE
    end;

    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    execute format(
      'create policy %I on %I.%I for %s to authenticated %s',
      r.policyname, r.schemaname, r.tablename, lower(r.cmd), clause
    );
  end loop;
end $$;

-- 2) RLS идэвхгүй хүснэгтүүдэд RLS-ийг идэвхжүүлж, зөвхөн нэвтэрсэн хэрэглэгчид нээнэ
--    (RLS идэвхгүй хүснэгтийг anon түлхүүрээр шууд унших, бичих боломжтой)
do $$
declare
  r record;
begin
  for r in
    select c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'authenticated all ' || r.tablename, r.tablename
    );
  end loop;
end $$;

-- 3) Шалгалт: доорх хүсэлт ҮР ДҮНГҮЙ (0 мөр) гарах ёстой
--    select schemaname, tablename, policyname, roles
--    from pg_policies
--    where schemaname = 'public' and roles::text = '{public}';
--
--    Мөн RLS идэвхгүй хүснэгт үлдсэн эсэх:
--    select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 4) Storage (файл): `org-plans` bucket нь public тул файлын холбоосыг мэддэг хүн нээж чадна.
--    Хүүхдийн зураг, эрүүл мэндийн файл хадгалдаг бол bucket-ыг private болгож,
--    signed URL ашиглах шаардлагатай. Энэ нь тусдаа шат.
