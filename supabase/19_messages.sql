-- ==========================================
-- 19: MESSAGES (Эцэг эх, багшийн чат)
-- ==========================================

create table if not exists messages (
  id bigserial primary key,
  child_id uuid,
  from_role text not null,   -- 'teacher' | 'parent' | 'methodist'
  from_name text,
  text text,
  media jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_msg_child on messages(child_id);
create index if not exists idx_msg_created on messages(created_at desc);

alter table messages enable row level security;
drop policy if exists "public all messages" on messages;
create policy "public all messages" on messages for all using (true) with check (true);

-- Chat media bucket
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "chat media public read"   on storage.objects;
drop policy if exists "chat media public write"  on storage.objects;
drop policy if exists "chat media public delete" on storage.objects;

create policy "chat media public read"   on storage.objects for select using (bucket_id = 'media');
create policy "chat media public write"  on storage.objects for insert with check (bucket_id = 'media');
create policy "chat media public delete" on storage.objects for delete using (bucket_id = 'media');

-- Trigger: parent → teacher чат мэдэгдэл
create or replace function public.notify_on_message()
returns trigger language plpgsql as $$
begin
  if new.from_role = 'parent' then
    insert into notifications (recipient_role, category, title, message, link)
    values ('erhlegch',   null, 'observation', 'Эцэг эхийн зурвас', coalesce(new.from_name, 'Эцэг эх') || ': ' || left(coalesce(new.text,''), 60), '/zurvas'),
           ('arga_zuich', null, 'observation', 'Эцэг эхийн зурвас', coalesce(new.from_name, 'Эцэг эх') || ': ' || left(coalesce(new.text,''), 60), '/zurvas');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_message on messages;
create trigger trg_notify_message
after insert on messages
for each row execute function public.notify_on_message();
