-- ==========================================
-- 38: Зөвлөмжийн мөрөөр ажилласан байдал (нотлох баримт)
-- ==========================================
alter table approval_comments add column if not exists evidence_url text;
alter table approval_comments add column if not exists evidence_note text;
alter table approval_comments add column if not exists resolved boolean default false;
alter table approval_comments add column if not exists resolved_by uuid references employees(id) on delete set null;
alter table approval_comments add column if not exists resolved_at timestamptz;
