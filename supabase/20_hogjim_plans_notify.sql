-- ==========================================
-- 20: Хөгжмийн модулаас plans-т орох бүх шинэ мөрөнд
--     Арга зүйч, Эрхлэгчид мэдэгдэл автомат
-- ==========================================

create or replace function public.notify_on_plan_created()
returns trigger language plpgsql as $$
declare
  actor_name text;
begin
  -- Батлагдаагүй, ноорог биш шинэ бүх plan-т мэдэгдэл
  if new.approved_at is null then
    select last_name || '.' || first_name into actor_name
    from employees where id = new.author_id;
    insert into notifications (recipient_role, actor_employee_id, category, title, message, link) values
      ('arga_zuich', new.author_id, 'plan',
        'Хөгжмийн шинэ төлөвлөгөө',
        coalesce(actor_name, 'Хөгжмийн багш') || ' · ' || coalesce(new.title, '(гарчиггүй)'),
        '/batlamj'),
      ('erhlegch', new.author_id, 'plan',
        'Хөгжмийн шинэ төлөвлөгөө',
        coalesce(actor_name, 'Хөгжмийн багш') || ' · ' || coalesce(new.title, '(гарчиггүй)'),
        '/batlamj');
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_plan_created on plans;
create trigger trg_notify_plan_created
after insert on plans
for each row execute function public.notify_on_plan_created();

-- Одоо байгаа 82 pending plan-ыг арга зүйч, эрхлэгчид нэг удаа мэдэгдэх (нэг л удаа)
insert into notifications (recipient_role, actor_employee_id, category, title, message, link)
select
  role_target,
  p.author_id,
  'plan',
  'Хөгжмийн төлөвлөгөө хянуулах',
  '48 хэрэглэсэн: ' || coalesce(e.last_name || '.' || e.first_name, 'Хөгжмийн багш') || ' · ' || coalesce(p.title, ''),
  '/batlamj'
from plans p
left join employees e on e.id = p.author_id
cross join (values ('arga_zuich'::text), ('erhlegch'::text)) as roles(role_target)
where p.approved_at is null
  and not exists (
    select 1 from notifications n
    where n.category = 'plan'
      and n.link = '/batlamj'
      and n.title = 'Хөгжмийн төлөвлөгөө хянуулах'
      and n.actor_employee_id = p.author_id
  )
limit 20; -- эхний 20-г л мэдэгдэнэ (spam-аас сэргийлэх)
