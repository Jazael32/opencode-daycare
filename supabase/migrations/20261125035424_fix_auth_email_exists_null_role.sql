-- Fix: coalescing a null user_role with '' raises
-- "invalid input value for enum user_role" for profile-less callers.
-- Capture the role in a variable and compare with IS DISTINCT FROM instead.
-- Type must be schema-qualified because search_path is empty.
create or replace function public.auth_email_exists(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_role public.user_role;
begin
  select private.current_user_role() into v_role;

  if v_role is distinct from 'staff' and v_role is distinct from 'admin' then
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
