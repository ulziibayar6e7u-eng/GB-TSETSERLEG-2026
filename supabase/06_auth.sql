-- ==========================================
-- 06: AUTH ХОЛБООС
-- Supabase → SQL Editor → RUN
-- ==========================================

-- 1. employees хүснэгтэд auth_user_id талбар нэмэх
alter table employees add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- 2. Эрхийн шалгалтын туслах функц
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role::text from employees where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.get_my_employee_id()
returns uuid
language sql
security definer
stable
as $$
  select id from employees where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(is_admin, false) from employees where auth_user_id = auth.uid() limit 1
$$;
