-- 77_remove_erdenetsetseg.sql
-- Зорилго: П.Эрдэнэцэцэг ажилтныг системээс бүр хасах.
-- АНХААР: Энэ нь БОДИТ ӨГӨГДӨЛ УСТГАНА, буцаах боломжгүй.
--   1. Эхлээд Supabase -> Database -> Backups дээр нөөц хуулбар хийнэ.
--   2. Доорх "1-Р АЛХАМ"-ыг ажиллуулж, юу устахыг харна. (Зөвхөн унших)
--   3. Зөв хүн гэдгийг баталгаажуулсны дараа л "2-Р АЛХАМ"-ыг ажиллуулна.
-- Supabase -> SQL Editor дээр ажиллуулна. Хэдэн хүн ижил нэртэй байж болохыг анхаар.

-- ============ 1-Р АЛХАМ: шалгах (юу ч өөрчлөхгүй) ============
select id, last_name, first_name, role, auth_user_id
from employees
where first_name = 'Эрдэнэцэцэг';
-- Яг 1 мөр гарах ёстой, эцэг нэр нь "П" байх ёстой. Эсвэл id-г тэмдэглэж ав.

-- Холбогдсон бүртгэлийн тоо (ON DELETE CASCADE-ээр устах нь):
select 'group_teachers' as table_name, count(*) from group_teachers
  where employee_id in (select id from employees where first_name = 'Эрдэнэцэцэг')
union all
select 'tuslah_records', count(*) from tuslah_records
  where employee_id in (select id from employees where first_name = 'Эрдэнэцэцэг')
union all
select 'observations (ажигласан)', count(*) from observations
  where observer_id in (select id from employees where first_name = 'Эрдэнэцэцэг');
-- Хэрэв ажиглалт, тусламжийн бүртгэл олон байвал устгахаас өмнө бодож үз:
-- тэдгээрийн түүх (тайлан) алдагдаж болно.

-- ============ 2-Р АЛХАМ: устгах (зөвхөн дээрхийг шалгасны дараа) ============
-- <ID> гэдгийг 1-р алхамд гарсан id-ээр солино:
-- delete from employees where id = '<ID>';

-- Нэвтрэх эрхийг мөн хаа: Supabase -> Authentication -> Users дээр
-- тухайн хүний имэйлийг олж "Delete user" эсвэл "Ban user" хийнэ.
