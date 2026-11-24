create schema if not exists private;

create function private.current_daycare_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select daycare_id
  from public.users
  where id = (select auth.uid())
$$;

create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.users
  where id = (select auth.uid())
$$;

revoke execute on function private.current_daycare_id() from public;
revoke execute on function private.current_user_role() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_daycare_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;

create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_select_daycare_staff on public.users
  for select to authenticated
  using (
    (select private.current_user_role()) in ('staff', 'admin')
    and daycare_id = (select private.current_daycare_id())
  );

create policy users_select_daycare_team on public.users
  for select to authenticated
  using (
    (select private.current_user_role()) = 'parent'
    and daycare_id = (select private.current_daycare_id())
    and role in ('staff', 'admin')
  );

create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy daycares_select_own on public.daycares
  for select to authenticated
  using (id = (select private.current_daycare_id()));

revoke update on table public.users from authenticated;
grant update (full_name, avatar_url, notify_on_post, daily_summary_enabled)
  on table public.users to authenticated;

revoke insert, delete on table public.users from authenticated;
revoke all on table public.users from anon;

revoke insert, update, delete on table public.daycares from authenticated;
revoke all on table public.daycares from anon;
