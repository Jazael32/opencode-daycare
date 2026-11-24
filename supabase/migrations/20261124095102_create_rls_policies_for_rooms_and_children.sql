create policy rooms_select_own_daycare on public.rooms
  for select to authenticated
  using (daycare_id = (select private.current_daycare_id()));

create policy children_select_daycare_staff on public.children
  for select to authenticated
  using (
    (select private.current_user_role()) in ('staff', 'admin')
    and exists (
      select 1 from public.rooms r
      where r.id = children.room_id
        and r.daycare_id = (select private.current_daycare_id())
    )
  );

create policy children_insert_daycare_staff on public.children
  for insert to authenticated
  with check (
    (select private.current_user_role()) in ('staff', 'admin')
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
        and r.daycare_id = (select private.current_daycare_id())
    )
  );

-- anon: sin acceso
revoke all on table public.rooms from anon;
revoke all on table public.children from anon;

-- rooms: solo lectura
grant select on table public.rooms to authenticated;
revoke insert, update, delete on table public.rooms from authenticated;

-- children: select + insert por columna (status y photo_consent por default)
grant select on table public.children to authenticated;
revoke insert, update, delete on table public.children from authenticated;
grant insert (room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags)
  on table public.children to authenticated;
