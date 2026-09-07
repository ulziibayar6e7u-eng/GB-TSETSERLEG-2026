-- ==========================================
-- 47: Ажиглалтад суралцахуйн үр дүнг холбох
-- ==========================================
alter table observations add column if not exists outcome_id int references outcomes(id) on delete set null;
create index if not exists idx_obs_outcome on observations(outcome_id);
