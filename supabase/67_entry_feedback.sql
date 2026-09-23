-- ==========================================
-- 67: Эрхлэгч/арга зүйчийн зөвлөгөө тэмдэглэл (Plan/Обs/Club/Music)
-- ==========================================
create table if not exists entry_feedback (
  id uuid primary key default gen_random_uuid(),
  entry_kind text not null check (entry_kind in ('plan','obs','club','music','lesson')),
  entry_id text not null,          -- uuid or free string (hogjim iframe id)
  target_employee_id uuid references employees(id) on delete set null,
  author_id uuid references employees(id) on delete set null,
  note text not null,
  created_at timestamptz default now()
);
create index if not exists idx_ef_entry on entry_feedback(entry_kind, entry_id);
create index if not exists idx_ef_target on entry_feedback(target_employee_id);
alter table entry_feedback enable row level security;
drop policy if exists "public all entry_feedback" on entry_feedback;
create policy "public all entry_feedback" on entry_feedback for all using (true) with check (true);

-- ── Trigger: зөвлөгөө бичихэд багшид мэдэгдэл ──
create or replace function public.notify_on_feedback()
returns trigger language plpgsql as $$
begin
  if new.target_employee_id is not null then
    insert into notifications (recipient_employee_id, actor_employee_id, category, title, message, link)
    values (
      new.target_employee_id,
      new.author_id,
      'feedback',
      '💬 Танд шинэ зөвлөгөө ирлээ',
      substr(new.note, 1, 200),
      '/uil-ajilgaa'
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_feedback on entry_feedback;
create trigger trg_notify_feedback after insert on entry_feedback
for each row execute function public.notify_on_feedback();
