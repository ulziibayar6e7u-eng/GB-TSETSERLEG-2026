-- ==========================================
-- 15: STORAGE BUCKET (Үүрэг даалгаврын файл)
-- ==========================================

-- Storage bucket үүсгэх (public)
insert into storage.buckets (id, name, public)
values ('task-uploads', 'task-uploads', true)
on conflict (id) do update set public = true;

-- Бүх хэрэглэгч байршуулах, унших боломжтой (түр)
drop policy if exists "task uploads public read"   on storage.objects;
drop policy if exists "task uploads public write"  on storage.objects;
drop policy if exists "task uploads public update" on storage.objects;
drop policy if exists "task uploads public delete" on storage.objects;

create policy "task uploads public read"
  on storage.objects for select
  using (bucket_id = 'task-uploads');

create policy "task uploads public write"
  on storage.objects for insert
  with check (bucket_id = 'task-uploads');

create policy "task uploads public update"
  on storage.objects for update
  using (bucket_id = 'task-uploads');

create policy "task uploads public delete"
  on storage.objects for delete
  using (bucket_id = 'task-uploads');
