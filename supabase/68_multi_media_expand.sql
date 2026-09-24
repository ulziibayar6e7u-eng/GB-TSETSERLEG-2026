-- ==========================================
-- 68: Олон зураг/бичлэг дэмжлэг (music_activity, teacher_materials)
-- ==========================================
do $$
begin
  if to_regclass('public.music_activity') is not null then
    alter table music_activity add column if not exists media_urls jsonb default '[]'::jsonb;
  end if;
  if to_regclass('public.teacher_materials') is not null then
    alter table teacher_materials add column if not exists media_urls jsonb default '[]'::jsonb;
  end if;
end $$;
