-- ==========================================
-- 33: Батламжийн ширээний зөвлөмж/тэмдэглэл
-- ==========================================
create table if not exists approval_comments (
  id uuid primary key default gen_random_uuid(),
  plan_kind text not null check (plan_kind in ('weekly','monthly','hogjim','club','org','material')),
  plan_id text not null,
  author_id uuid references employees(id) on delete set null,
  text text not null,
  created_at timestamptz default now()
);
create index if not exists idx_appc_target on approval_comments(plan_kind, plan_id, created_at desc);

alter table approval_comments enable row level security;
drop policy if exists "public all approval_comments" on approval_comments;
create policy "public all approval_comments" on approval_comments for all using (true) with check (true);
