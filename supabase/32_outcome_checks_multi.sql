-- ==========================================
-- 32: outcome_checks — олон удаагийн ажиглалт зөвшөөрөх
-- ==========================================
alter table outcome_checks drop constraint if exists outcome_checks_child_id_outcome_id_key;
create index if not exists idx_outcome_checks_outcome_child on outcome_checks(outcome_id, child_id, checked_at desc);
