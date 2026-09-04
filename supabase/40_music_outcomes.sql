-- ==========================================
-- 40: Хөгжим судлагдахуун + СҮД
-- ==========================================

-- Development area: hogjim
insert into development_areas (code, name, icon, color, sort_order) values
  ('hogjim', 'Хөгжим', '🎵', '#a855f7', 20)
on conflict (code) do nothing;

-- I түвшин = baga
insert into outcomes (age_group, area_code, code, text, sort_order) values
  ('baga', 'hogjim', 'ХӨГ1.1а', 'Хүн, амьтны дуу авиаг ялган таньдаг болно.', 0),
  ('baga', 'hogjim', 'ХӨГ1.1б', 'Дууг анхааралтай сонсож, зарим үг, авиаг дуурайн хэлж, аялна.', 1),
  ('baga', 'hogjim', 'ХӨГ1.1в', 'Дуу, аялгууны хэмнэлд тохируулан хөдөлгөөн хийдэг болно.', 2)
on conflict (age_group, code) do nothing;

-- II түвшин = dund
insert into outcomes (age_group, area_code, code, text, sort_order) values
  ('dund', 'hogjim', 'ХӨГ2.1а', 'Байгаль, эд юмсын дуу чимээг таньж ялгана.', 0),
  ('dund', 'hogjim', 'ХӨГ2.1б', 'Дууны аялгууг дагаж, хамтдаа дуулна.', 1),
  ('dund', 'hogjim', 'ХӨГ2.1в', 'Жигд хэмнэлийг мэдэрч хамтран тоглоно.', 2),
  ('dund', 'hogjim', 'ХӨГ2.1г', 'Дуу, ая, аялгууны хэмнэл, хурдад тохируулан хөдөлгөөн хийнэ.', 3),
  ('dund', 'hogjim', 'ХӨГ2.1д', 'Үлгэр зохиол, дуу хөгжмийн танил дүрийг дуурайж, харилцан тоглоно.', 4)
on conflict (age_group, code) do nothing;

-- III түвшин = ahlah
insert into outcomes (age_group, area_code, code, text, sort_order) values
  ('ahlah', 'hogjim', 'ХӨГ3.1а', 'Хөгжмийн энгийн зэмсгийн дуу чимээг ялгана.', 0),
  ('ahlah', 'hogjim', 'ХӨГ3.1б', 'Богино үгтэй дууг аянд тохируулж бусадтай хамт дуулна.', 1),
  ('ahlah', 'hogjim', 'ХӨГ3.1в', 'Жигд ба жигд бус хэмнэлийг ялгана.', 2),
  ('ahlah', 'hogjim', 'ХӨГ3.1г', 'Аялгууны өөрчлөлтийг мэдэрч хөдөлгөөнөөр илэрхийлнэ.', 3),
  ('ahlah', 'hogjim', 'ХӨГ3.1д', 'Үлгэр зохиол, дуу, аялгууны дүрийн онцлогийг илэрхийлж тоглоно.', 4)
on conflict (age_group, code) do nothing;

-- IV түвшин = beltgel
insert into outcomes (age_group, area_code, code, text, sort_order) values
  ('beltgel', 'hogjim', 'ХӨГ4.1а', 'Байгаль, хүн, амьтан, эд юмсын дуу чимээг тодорхойлж ялгана.', 0),
  ('beltgel', 'hogjim', 'ХӨГ4.1б', 'Дуу, ая, аялгууг цэвэр аялгуулж, хамтран дуулна.', 1),
  ('beltgel', 'hogjim', 'ХӨГ4.1в', 'Аялгуу, хэмнэлийн дагуу хамтран хөгжимдөнө.', 2),
  ('beltgel', 'hogjim', 'ХӨГ4.1г', 'Хэмнэл, хурд, өнгө аяст тохируулан хөдөлгөөнөө илэрхийлнэ.', 3),
  ('beltgel', 'hogjim', 'ХӨГ4.1д', 'Дүрийн зан чанар, харилцааг илэрхийлж хамтран тоглоно.', 4)
on conflict (age_group, code) do nothing;
