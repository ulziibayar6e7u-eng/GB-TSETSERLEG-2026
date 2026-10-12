-- ==========================================
-- 71: Материал оруулах огноо (нөхөж бүртгэх)
-- ==========================================
alter table teacher_materials add column if not exists material_date date;
update teacher_materials set material_date = created_at::date where material_date is null;
create index if not exists idx_tm_date on teacher_materials(material_date desc);
