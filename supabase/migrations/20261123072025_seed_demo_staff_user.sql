do $$
declare
  v_daycare_id uuid;
  v_user_id uuid := gen_random_uuid();
begin
  select id into v_daycare_id
  from public.daycares
  where name = 'Guardería Sala Soles';

  if v_daycare_id is null then
    raise exception 'Demo daycare "Guardería Sala Soles" not found';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'staff@demo.daycare',
    extensions.crypt('demo1234', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'staff',
      'full_name', 'Caro Giménez',
      'daycare_id', v_daycare_id
    ),
    now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'staff@demo.daycare'),
    'email',
    v_user_id::text,
    now(), now(), now()
  );
end;
$$;
