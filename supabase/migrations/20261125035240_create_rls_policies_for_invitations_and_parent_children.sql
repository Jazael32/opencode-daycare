-- ============================================================
-- Helpers
-- ============================================================

-- Email of the caller, taken from the JWT claims.
create or replace function private.current_user_email()
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select nullif(coalesce(auth.jwt() ->> 'email', ''), '')
$$;

revoke execute on function private.current_user_email() from public;
grant execute on function private.current_user_email() to authenticated;

-- ============================================================
-- RPCs
-- ============================================================

-- Pre-signup lookup: given an invitation code + email, returns the context
-- needed by the signup trigger. Only matches one pending, unexpired
-- invitation; an expired one is lazily marked as such and returns nothing.
create or replace function public.signup_lookup(p_code text, p_email text)
returns table (
  daycare_id uuid,
  daycare_name text,
  room_name text,
  child_name text,
  full_name text,
  relationship public.relationship_type
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_inv public.invitations;
begin
  select *
  into v_inv
  from public.invitations i
  where upper(btrim(i.code)) = upper(btrim(coalesce(p_code, '')))
    and lower(btrim(i.email)) = lower(btrim(coalesce(p_email, '')))
    and i.status = 'pending'
  limit 1;

  if not found then
    return;
  end if;

  if v_inv.expires_at <= now() then
    update public.invitations
    set status = 'expired'
    where id = v_inv.id
      and status = 'pending';
    return;
  end if;

  return query
  select
    d.id,
    d.name,
    r.name,
    c.full_name,
    v_inv.full_name,
    v_inv.relationship
  from public.children c
  join public.rooms r on r.id = c.room_id
  join public.daycares d on d.id = r.daycare_id
  where c.id = v_inv.child_id;
end;
$$;

revoke execute on function public.signup_lookup(text, text) from public;
revoke execute on function public.signup_lookup(text, text) from anon;
revoke execute on function public.signup_lookup(text, text) from authenticated;
grant execute on function public.signup_lookup(text, text) to anon;
grant execute on function public.signup_lookup(text, text) to authenticated;

-- Whether an account already exists in auth.users for the given email.
-- Staff-only: used by the link-parent modal to reject already-registered emails.
create or replace function public.auth_email_exists(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if coalesce(private.current_user_role(), '') not in ('staff', 'admin') then
    raise exception 'auth_email_exists: only staff or admin can call this function';
  end if;

  return exists (
    select 1
    from auth.users u
    where lower(btrim(u.email)) = lower(btrim(coalesce(p_email, '')))
  );
end;
$$;

revoke execute on function public.auth_email_exists(text) from public;
revoke execute on function public.auth_email_exists(text) from anon;
revoke execute on function public.auth_email_exists(text) from authenticated;
grant execute on function public.auth_email_exists(text) to authenticated;

-- ============================================================
-- Policies (7, all to authenticated)
-- ============================================================

alter table public.invitations force row level security;

-- Staff/admin of the child's daycare can read its invitations.
create policy invitations_select_daycare_staff
  on public.invitations
  for select
  to authenticated
  using (
    (select private.current_user_role()) = any (array['staff'::user_role, 'admin'::user_role])
    and exists (
      select 1
      from public.children c
      join public.rooms r on r.id = c.room_id
      where c.id = invitations.child_id
        and r.daycare_id = (select private.current_daycare_id())
    )
  );

-- Staff/admin of the child's daycare can create invitations for it.
create policy invitations_insert_daycare_staff
  on public.invitations
  for insert
  to authenticated
  with check (
    invitations.invited_by = (select auth.uid())
    and (select private.current_user_role()) = any (array['staff'::user_role, 'admin'::user_role])
    and exists (
      select 1
      from public.children c
      join public.rooms r on r.id = c.room_id
      where c.id = invitations.child_id
        and r.daycare_id = (select private.current_daycare_id())
    )
  );

-- The invited email can read its own invitations.
create policy invitations_select_own_email
  on public.invitations
  for select
  to authenticated
  using (email = (select private.current_user_email()));

-- The invited email can only accept a pending, unexpired invitation,
-- and the update must land on accepted + accepted_at.
create policy invitations_update_accept_own_email
  on public.invitations
  for update
  to authenticated
  using (
    status = 'pending'
    and expires_at > now()
    and email = (select private.current_user_email())
  )
  with check (
    status = 'accepted'
    and accepted_at is not null
    and email = (select private.current_user_email())
  );

alter table public.invitations no force row level security;

alter table public.parent_children force row level security;

-- Staff/admin of the child's daycare can read the links of its children.
create policy parent_children_select_daycare_staff
  on public.parent_children
  for select
  to authenticated
  using (
    (select private.current_user_role()) = any (array['staff'::user_role, 'admin'::user_role])
    and exists (
      select 1
      from public.children c
      join public.rooms r on r.id = c.room_id
      where c.id = parent_children.child_id
        and r.daycare_id = (select private.current_daycare_id())
    )
  );

-- Parents can read their own links.
create policy parent_children_select_own
  on public.parent_children
  for select
  to authenticated
  using (parent_id = (select auth.uid()));

-- A parent can only link itself to a child whose invitation
-- it already accepted (matched by JWT email).
create policy parent_children_insert_own_accepted
  on public.parent_children
  for insert
  to authenticated
  with check (
    parent_children.parent_id = (select auth.uid())
    and exists (
      select 1
      from public.invitations i
      where i.child_id = parent_children.child_id
        and i.email = (select private.current_user_email())
        and i.status = 'accepted'
    )
  );

alter table public.parent_children no force row level security;

-- ============================================================
-- Grants: anon gets nothing on the tables; authenticated minimal.
-- ============================================================

revoke all privileges on public.invitations from anon;
revoke all privileges on public.parent_children from anon;

grant select on public.invitations to authenticated;
grant insert (child_id, invited_by, full_name, email, relationship, code, expires_at)
  on public.invitations to authenticated;
grant update (status, accepted_at) on public.invitations to authenticated;

grant select on public.parent_children to authenticated;
grant insert (parent_id, child_id, relationship) on public.parent_children to authenticated;
