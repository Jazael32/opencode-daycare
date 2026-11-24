insert into public.rooms (daycare_id, name, created_at)
select d.id, v.name, clock_timestamp()
from public.daycares d
cross join (values (1, 'Soles'), (2, 'Lunas'), (3, 'Estrellas')) as v(ord, name)
where d.name = 'Guardería Sala Soles'
order by v.ord;

insert into public.children (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, created_at)
select
  r.id,
  v.full_name,
  v.birth_date::date,
  v.enrolled_at::date,
  v.medical_notes,
  v.allergy_tags::text[],
  clock_timestamp()
from public.rooms r
cross join (values
  (1, 'Mateo Fernández',  '2023-03-12', '2025-02-01', 'Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.', '{maní}'),
  (2, 'Sofía Méndez',     '2024-04-18', '2025-03-01', null, '{}'),
  (3, 'Benjamín Ruiz',    '2023-07-08', '2024-08-01', null, '{}'),
  (4, 'Valentina Soto',   '2024-08-02', '2025-09-01', null, '{}'),
  (5, 'Tomás Díaz',       '2023-01-25', '2024-02-01', 'Intolerante a la lactosa. Le servimos derivados sin lactosa y su mamá envía la leche de reemplazo.', '{lactosa}'),
  (6, 'Emma Castro',      '2024-02-14', '2025-07-01', null, '{}'),
  (7, 'Lucas Romero',     '2023-09-30', '2025-01-01', null, '{}'),
  (8, 'Olivia Vega',      '2024-06-21', '2025-04-01', null, '{}')
) as v(ord, full_name, birth_date, enrolled_at, medical_notes, allergy_tags)
where r.name = 'Soles'
  and r.daycare_id = (select id from public.daycares where name = 'Guardería Sala Soles')
order by v.ord;
