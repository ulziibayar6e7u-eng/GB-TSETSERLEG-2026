-- ==========================================
-- 66: 🎵 Хөгжим судлагдахууныг Ажиглалтын жагсаалтад нэмэх
-- ==========================================
insert into development_areas (code, name, icon, color, sort_order)
values ('hogjim', 'Хөгжим', '🎵', '#a855f7', 100)
on conflict (code) do update set name = excluded.name, icon = excluded.icon;
