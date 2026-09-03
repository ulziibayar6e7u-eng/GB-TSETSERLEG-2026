-- ==========================================
-- 37: Шинэ зар мэдээ нэмэгдэхэд бүх ажилтанд мэдэгдэл
-- ==========================================
create or replace function public.notify_on_announcement_insert()
returns trigger language plpgsql as $$
declare actor_name text; rec record;
begin
  select last_name || '.' || first_name into actor_name from employees where id = new.author_id;
  for rec in select id from employees loop
    insert into notifications (recipient_employee_id, actor_employee_id, category, title, message, link)
    values (rec.id, new.author_id, 'plan',
      '📢 Шинэ зар: ' || new.title,
      coalesce(actor_name, 'Хэрэглэгч') || (case when new.content is not null then ' · ' || left(new.content, 100) else '' end),
      '/zar');
  end loop;
  return new;
end; $$;

drop trigger if exists trg_notify_announcement on announcements;
create trigger trg_notify_announcement
after insert on announcements
for each row execute function public.notify_on_announcement_insert();
