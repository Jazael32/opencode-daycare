create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_daycare_id uuid := nullif(new.raw_user_meta_data->>'daycare_id', '')::uuid;
begin
  if v_daycare_id is null then
    raise exception 'raw_user_meta_data.daycare_id is required to create a user profile';
  end if;

  insert into public.users (id, daycare_id, role, status, full_name)
  values (
    new.id,
    v_daycare_id,
    coalesce((nullif(new.raw_user_meta_data->>'role', ''))::public.user_role, 'parent'),
    'active',
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1))
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
