# SPEC 08 — Tabla `users`, enums de usuario, RLS y staff demo

> **Estado:** Implementado
> **Depende de:** SPEC 07 — Tabla `daycares`
> **Fecha:** 2026-11-23
> **Objetivo:** Crear los enums `user_role` / `user_status` y la tabla `public.users` (perfil de dominio vinculado a Supabase Auth) en el proyecto `aqvrzjfdyqwcfiotnagu`, con el trigger que crea el perfil al registrarse, policies de RLS para `users` y `daycares`, y un usuario `staff` demo para probar.

## Contexto

- La SPEC 07 dejó aplicadas la tabla `public.daycares` y la guardería demo `Guardería Sala Soles`. El schema `public` solo contiene esa tabla.
- La referencia del esquema vive en `../07-db-schema/opendaycare-database-schema.md`; esta spec aplica únicamente la sección **2. `users`**, los enums `user_role` / `user_status` y las policies de RLS de `users` y `daycares`.
- Regla del modelo: **un usuario pertenece a un solo daycare** (`users.daycare_id`), **un daycare tiene muchos usuarios** (relación 1─<). Padres y staff comparten la tabla y se diferencian por `role`.
- La autenticación (email, contraseña, confirmación) vive en `auth.users`, gestionada por Supabase Auth. `public.users` guarda solo datos de dominio y usa el **mismo UUID** que `auth.users`.
- Convención del esquema: todo lo persistido va en inglés (enums, valores); las etiquetas visibles se traducen en la UI.

## Scope

**In:**

- Migración DDL `create_user_enums_and_users_table` vía `tools.supabase.apply_migration`:
  - Enums `public.user_role` (`staff`, `parent`, `admin`) y `public.user_status` (`pending`, `active`).
  - Tabla `public.users` con las columnas de la referencia: `id`, `daycare_id`, `role`, `status`, `full_name`, `avatar_url`, `notify_on_post`, `daily_summary_enabled`, `created_at`, `updated_at`.
  - FK `id → auth.users(id) on delete cascade` y FK `daycare_id → public.daycares(id) not null`.
  - Índice `users_daycare_id_idx` sobre `daycare_id` (las consultas por daycare serán la norma).
  - Función `public.set_updated_at()` + trigger `before update` para mantener `updated_at`.
- Migración DDL `create_auth_user_profile_trigger`:
  - Función `SECURITY DEFINER public.handle_new_user()` + trigger `after insert on auth.users` que crea la fila en `public.users` leyendo `daycare_id`, `role` y `full_name` de `raw_user_meta_data`.
- Migración DDL `create_rls_policies_for_users_and_daycares`:
  - Helpers `private.current_daycare_id()` y `private.current_user_role()` (`SECURITY DEFINER`, `STABLE`, `search_path` fijo) para leer el perfil del usuario autenticado sin recursión de RLS, con `execute` restringido a `authenticated`.
  - Policies de `select` en `users` (perfil propio, staff/admin del mismo daycare, staff del daycare visible para padres) y de `update` del perfil propio.
  - Policy de `select` en `daycares` (solo el daycare propio).
  - `revoke`/`grant` de privilegios: `authenticated` solo puede hacer `update` de `full_name`, `avatar_url`, `notify_on_post` y `daily_summary_enabled`; `anon` queda sin privilegios en ambas tablas.
- Migración data-only `seed_demo_staff_user`:
  - Usuario de prueba `staff@demo.daycare` / `demo1234`, `full_name = 'Caro Giménez'` (staff de los mockups), `role = 'staff'`, `status = 'active'`.
  - La fila en `public.users` la crea el trigger del punto anterior.
- Verificación con las tools MCP: `list_migrations`, `list_tables` (verbose), consulta del staff con join a `daycares`, `pg_policies` / grants por catálogo, pruebas de `select` simulando JWT (`staff` y `anon`), y `get_advisors` (security y performance).
- Materializar el SQL exacto de cada migración en `supabase/migrations/<version>_<nombre>.sql` y commitear.

**Out of scope (para specs futuras):**

- Enums restantes (`relationship_type`, `invitation_status`, `post_type`, `child_status`): se crean con la tabla que los usa.
- Tablas dependientes: `rooms`, `children`, `parent_children`, `invitations`, `posts`, `post_children`, `post_photos`, `reactions`, `comments`, `daily_summaries`, `devices`.
- Policies de `insert`/`delete` y gestión de usuarios por parte de staff/admin (crear, desactivar o editar otros perfiles).
- Modelo de invitaciones y estado `pending` (el doc lo modela en `invitations`, no en `users`).
- Usuario `parent` demo y vínculos con niños.
- Integración en la app Next.js: tipos generados, cliente `@supabase/supabase-js` / `@supabase/ssr`, pantallas de login/signup.
- Flujos de confirmación de email, recuperación de contraseña y OAuth.

## Data model

### Enums nuevos

| Enum          | Valores                    |
| ------------- | -------------------------- |
| `user_role`   | `staff`, `parent`, `admin` |
| `user_status` | `pending`, `active`        |

### Tabla nueva `public.users`

| Campo                   | Tipo          | Notas                                                                    |
| ----------------------- | ------------- | ------------------------------------------------------------------------ |
| `id`                    | `uuid` PK     | FK → `auth.users(id)` `ON DELETE CASCADE`. Mismo UUID que Supabase Auth. |
| `daycare_id`            | `uuid`        | FK → `public.daycares(id)`, `NOT NULL`. Un usuario, un daycare.          |
| `role`                  | `user_role`   | `NOT NULL`. `staff` / `parent` / `admin`.                                |
| `status`                | `user_status` | `NOT NULL`, default `active`.                                            |
| `full_name`             | `text`        | `NOT NULL`.                                                              |
| `avatar_url`            | `text`        | Nullable.                                                                |
| `notify_on_post`        | `boolean`     | `NOT NULL`, default `true`.                                              |
| `daily_summary_enabled` | `boolean`     | `NOT NULL`, default `true`.                                              |
| `created_at`            | `timestamptz` | `NOT NULL`, default `now()`.                                             |
| `updated_at`            | `timestamptz` | `NOT NULL`, default `now()`; trigger `before update`.                    |

### DDL de la migración `create_user_enums_and_users_table`

```sql
create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  daycare_id uuid not null references public.daycares(id),
  role public.user_role not null,
  status public.user_status not null default 'active',
  full_name text not null,
  avatar_url text,
  notify_on_post boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_daycare_id_idx on public.users (daycare_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
```

### DDL de la migración `create_auth_user_profile_trigger`

```sql
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
```

Defaults del trigger: `role = 'parent'` si no viene en el metadata, `full_name` cae al local-part del email, `status = 'active'` al crear el perfil.

### DDL de la migración `create_rls_policies_for_users_and_daycares`

Helpers en el schema **`private`** (no expuesto por PostgREST). Son `SECURITY DEFINER` y su owner es `postgres` (con `bypassrls`), por lo que leen `public.users` sin disparar sus policies y rompen la recursión:

```sql
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
```

Policies de `public.users`:

```sql
-- Cada usuario ve su propio perfil
create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));

-- Staff/admin ven todos los usuarios de su daycare
create policy users_select_daycare_staff on public.users
  for select to authenticated
  using (
    (select private.current_user_role()) in ('staff', 'admin')
    and daycare_id = (select private.current_daycare_id())
  );

-- Un padre ve a staff/admin de su daycare (autores del feed), no a otros padres
create policy users_select_daycare_team on public.users
  for select to authenticated
  using (
    (select private.current_user_role()) = 'parent'
    and daycare_id = (select private.current_daycare_id())
    and role in ('staff', 'admin')
  );

-- Cada usuario edita su propio perfil (columnas limitadas por grants)
create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

Policy de `public.daycares`:

```sql
-- Cada usuario ve solo su daycare
create policy daycares_select_own on public.daycares
  for select to authenticated
  using (id = (select private.current_daycare_id()));
```

Privilegios de columna y cierre para `anon` (la RLS no limita columnas; se combina con `revoke`/`grant`):

```sql
-- El perfil propio solo se puede actualizar en estas 4 columnas
revoke update on table public.users from authenticated;
grant update (full_name, avatar_url, notify_on_post, daily_summary_enabled)
  on table public.users to authenticated;

-- Insert/delete solo ocurren server-side (trigger y service_role)
revoke insert, delete on table public.users from authenticated;
revoke all on table public.users from anon;

-- daycares es de solo lectura para clientes
revoke insert, update, delete on table public.daycares from authenticated;
revoke all on table public.daycares from anon;
```

Resultado: `anon` no accede a ninguna de las dos tablas, `authenticated` solo lee filas de su daycare (con la visibilidad por rol descrita) y solo puede actualizar las 4 columnas de perfil.

### Seed de la migración `seed_demo_staff_user`

```sql
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
```

- Sin UUIDs hardcodeados: el daycare se busca por `name` y los ids de usuario/identidad los genera `gen_random_uuid()`.
- El trigger `on_auth_user_created` crea automáticamente el perfil en `public.users` con `role = 'staff'`.
- La contraseña se guarda hasheada (`crypt`/`bf` de `pgcrypto`, expuesto en el schema `extensions` de Supabase). Nunca en texto plano.
- Antes de aplicar el seed se verifica con una consulta de solo lectura (`information_schema`) la forma actual de `auth.users` y `auth.identities`, porque ese schema puede variar entre versiones de Supabase.

## Plan de implementación

1. Cargar las skills `supabase` y `supabase-postgres-best-practices`; correr `get_advisors` (security, performance y health) y `query_logs` como línea base.
2. Inspeccionar el estado actual: `list_migrations`, `list_tables` (verbose) y consulta read-only a `information_schema.columns` para `auth.users` y `auth.identities`.
3. Aplicar `create_user_enums_and_users_table`. Verificar: enums con sus valores exactos, columnas, PK, FKs, defaults, índice, función/trigger de `updated_at` y RLS habilitado.
4. Aplicar `create_auth_user_profile_trigger`. Verificar en `pg_proc`/`pg_trigger` (read-only) que la función existe con `prosecdef = true` y `search_path` fijado, y que el trigger está en `auth.users`.
5. Aplicar `seed_demo_staff_user`. Verificar:
   - `auth.users` tiene `staff@demo.daycare` con `email_confirmed_at` no nulo y `encrypted_password` hasheado (prefijo `$2a$`/`$2b$`).
   - `public.users` tiene exactamente una fila con `role = 'staff'`, `status = 'active'`, `full_name = 'Caro Giménez'` y `daycare_id` de `Guardería Sala Soles`.
   - Se puede resolver el login con `signInWithPassword` desde el cliente/API de Supabase (verificación funcional opcional en esta spec).
6. Aplicar `create_rls_policies_for_users_and_daycares`. Verificar:
   - `pg_policies` lista las 5 policies esperadas (4 en `users`, 1 en `daycares`).
   - `private.current_daycare_id()` y `private.current_user_role()` son `SECURITY DEFINER`, `STABLE`, con `search_path` fijo y `execute` solo para `authenticated`.
   - `information_schema.role_column_grants` muestra `update` de `authenticated` solo en `full_name`, `avatar_url`, `notify_on_post`, `daily_summary_enabled`; `role`, `status`, `daycare_id`, `id` sin `update`.
7. Probar la RLS en transacciones de solo lectura (con `rollback`) simulando el JWT del staff y el rol `anon`:
   - `staff` (`sub` = id del staff): `select` de `users` devuelve su fila y `select` de `daycares` devuelve `Guardería Sala Soles`.
   - `anon`: `select` de `users` y `daycares` devuelve 0 filas o error de permisos.
8. Correr `get_advisors` (security y performance). Verificar: sin hallazgos nuevos; en particular ya no debe aparecer el INFO `rls_enabled_no_policy` en `users` ni `daycares`, y no debe aparecer `function_search_path_mutable`.
9. Materializar el SQL exacto de las 4 migraciones en `supabase/migrations/` (mismo texto registrado en `supabase_migrations.schema_migrations`) y commitear.
10. Actualizar el estado de esta spec a **Implementado** y marcar los criterios de aceptación.

## Criterios de aceptación

- [x] `public.user_role` existe con valores `staff`, `parent`, `admin` (en ese orden y sin extras).
- [x] `public.user_status` existe con valores `pending`, `active`.
- [x] `public.users` existe con exactamente 10 columnas: `id`, `daycare_id`, `role`, `status`, `full_name`, `avatar_url`, `notify_on_post`, `daily_summary_enabled`, `created_at`, `updated_at`.
- [x] `id` es `uuid NOT NULL` PK con FK a `auth.users(id)` `ON DELETE CASCADE`.
- [x] `daycare_id` es `uuid NOT NULL` con FK a `public.daycares(id)` y existe el índice `users_daycare_id_idx`.
- [x] `role` es `user_role NOT NULL`; `status` es `user_status NOT NULL DEFAULT 'active'`.
- [x] `full_name` es `text NOT NULL`; `avatar_url` es `text` nullable.
- [x] `notify_on_post` y `daily_summary_enabled` son `boolean NOT NULL DEFAULT true`.
- [x] `created_at` y `updated_at` son `timestamptz NOT NULL DEFAULT now()`, y el trigger `users_set_updated_at` actualiza `updated_at` en cada update.
- [x] `users` tiene RLS **habilitado**.
- [x] Existen las 4 policies de `users`: `users_select_own`, `users_select_daycare_staff`, `users_select_daycare_team` y `users_update_own`.
- [x] Existe la policy `daycares_select_own` (solo el daycare propio).
- [x] `private.current_daycare_id()` y `private.current_user_role()` existen, son `SECURITY DEFINER`, `STABLE`, `search_path` fijo, y solo `authenticated` tiene `execute` (más el owner).
- [x] `authenticated` solo tiene `update` de columna en `full_name`, `avatar_url`, `notify_on_post` y `daily_summary_enabled`; no en `role`, `status`, `daycare_id` ni `id`.
- [x] `anon` no tiene privilegios sobre `users` ni `daycares`.
- [x] Un `select` como `staff` (JWT simulado) devuelve su fila de `users` y su `daycares`; como `anon` no devuelve filas.
- [x] Existe el trigger `on_auth_user_created` (`AFTER INSERT` en `auth.users`) con función `SECURITY DEFINER` y `search_path` fijado.
- [x] Existe el usuario `staff@demo.daycare` en `auth.users` con email confirmado y contraseña hasheada.
- [x] Existe exactamente un perfil en `public.users` para ese usuario con `role = 'staff'`, `status = 'active'`, `full_name = 'Caro Giménez'` y el `daycare_id` de `Guardería Sala Soles`.
- [x] Ninguna migración hardcodea UUIDs generados (daycare por `name`, ids por `gen_random_uuid()`).
- [x] `list_migrations` lista las 4 migraciones del plan como aplicadas, más las 2 correctivas `revoke_execute_on_handle_new_user` y `revoke_execute_on_handle_new_user_from_client_roles` (ver Notas de implementación).
- [x] `get_advisors` (security) no reporta `users`/`daycares` con RLS deshabilitado ni `rls_enabled_no_policy`; no reporta `function_search_path_mutable`.
- [x] `get_advisors` (performance) reporta únicamente el WARN `multiple_permissive_policies` en `users`, aceptado por decisión explícita: la visibilidad por rol exige 3 policies permissive `SELECT` con semántica OR (ver Notas de implementación). Sin otros hallazgos nuevos.
- [x] Las 4 migraciones del plan (más las 2 correctivas) quedaron materializadas en `supabase/migrations/` y commiteadas.

## Notas de implementación (2026-11-23)

- Las 4 migraciones del plan se aplicaron en orden (`20261123071802`, `20261123072016`, `20261123072025`, `20261123072034`) y quedaron verificadas una a una contra el catálogo (`pg_enum`, `information_schema.columns`, `pg_constraint`, `pg_indexes`, `pg_trigger`, `pg_policies`, `information_schema.role_column_grants`).
- **Migraciones correctivas (2):** `get_advisors` marcó `public.handle_new_user()` como `SECURITY DEFINER` ejecutable por `anon`/`authenticated`. La primera corrección (`revoke ... from public`) resultó insuficiente porque Supabase otorga **default privileges** explícitos a `anon`, `authenticated` y `service_role` para funciones creadas en el schema `public`; la segunda (`revoke ... from public, anon, authenticated`) sí cerró el hallazgo. El trigger `on_auth_user_created` sigue disparándose (verificado con un insert de prueba en `auth.users` dentro de una transacción con `rollback`: el perfil se creó y el dato quedó intacto). Lección para specs futuras: toda función en `public` necesita revocar `execute` también a los roles de cliente, no solo a `PUBLIC`.
- **WARN aceptado:** `multiple_permissive_policies` en `users` (performance). La visibilidad por rol (`own` / `staff` / `team`) exige 3 policies permissive `SELECT` con semántica OR; fusionarlas contradeciría el criterio que exige los 4 nombres exactos. Aceptado por decisión del owner durante la implementación.
- **Pruebas de RLS (con `rollback`):** JWT simulado del staff devuelve su fila de `users` y `Guardería Sala Soles` en `daycares`; `anon` recibe `permission denied` en ambas tablas; `update` de `role`/`status`/`daycare_id`/`id` como `authenticated` falla con `permission denied`; `update` de `full_name` funciona y el trigger avanzó `updated_at`.
- **Advisors finales:** security reporta solo hallazgos preexistentes (`rls_auto_enable()` ejecutable y `auth_leaked_password_protection` deshabilitado), ninguno creado por esta spec; performance reporta solo el WARN aceptado; health sin hallazgos.
- Credenciales demo: `staff@demo.daycare` / `demo1234` (data de desarrollo, no apta para producción).

## Decisiones

- **Sí:** solo los enums de `users` (`user_role`, `user_status`) — los demás enums pertenecen a tablas que aún no existen.
- **Sí:** `daycare_id NOT NULL` — la referencia no lo marca nullable y en el dominio todo usuario pertenece a una guardería; los admins globales, si se necesitan, serán una decisión de una spec futura.
- **Sí:** policies de RLS en esta misma spec — a diferencia de lo planeado inicialmente, se incluyen ahora para dejar `users` y `daycares` utilizables por el cliente con aislamiento por daycare desde el primer momento.
- **Sí:** visibilidad de `users` por rol — un usuario ve su fila; staff/admin ven todo su daycare; un padre ve solo su fila y los perfiles `staff`/`admin` de su daycare (necesarios como autores del feed), sin exponer a otros padres.
- **Sí:** helpers en schema `private` con `SECURITY DEFINER` — evitan la recursión de policies al leer `public.users` (owner `postgres` con `bypassrls`), y al no estar en un schema expuesto por PostgREST no son invocables por la API.
- **Sí:** `revoke execute` de los helpers a `public` y `grant` solo a `authenticated` — principio de mínimo privilegio; `anon` no puede ni tocar el schema `private`.
- **Sí:** `revoke update` de la tabla y `grant update` por columna — RLS no limita columnas; así un usuario no puede cambiarse `role`, `status` ni `daycare_id`.
- **Sí:** `revoke all` a `anon` y `revoke insert/delete` a `authenticated` en `users`/`daycares` — los inserts los hace el trigger `SECURITY DEFINER` y las escrituras administrativas corren con `service_role`.
- **Sí:** trigger `AFTER INSERT` en `auth.users` — patrón indicado por la referencia; evita crear perfiles manualmente en cada signup y centraliza defaults (`role = 'parent'`, `status = 'active'`).
- **Sí:** `SECURITY DEFINER` con `search_path = ''` — el trigger corre en el schema `auth` y necesita escribir en `public` con permisos elevados sin quedar expuesto a search-path hijacking.
- **Sí:** error explícito si falta `daycare_id` en el metadata — con `daycare_id NOT NULL`, un registro sin ese dato haría fallar el signup con un error poco claro; la excepción lo documenta.
- **Sí:** índice `users_daycare_id_idx` — PostgreSQL no indexa FKs automáticamente y las policies por daycare usan esa columna.
- **Sí:** trigger de `updated_at` — la referencia incluye `updated_at` en `users`, a diferencia de `daycares`; un trigger evita depender del cliente para actualizarlo.
- **Sí:** seed del staff en `auth.users` + `auth.identities` con contraseña hasheada — permite iniciar sesión real con `signInWithPassword`; el perfil lo crea el trigger, demostrando el flujo completo.
- **Sí:** `staff@demo.daycare` / `demo1234` y `full_name = 'Caro Giménez'` — credenciales simples de desarrollo y nombre alineado a los mockups. Es data demo, no apta para producción.
- **No:** duplicar `email` o `password_hash` en `public.users` — Supabase Auth ya los gestiona en `auth.users`.
- **No:** policies de `insert`/`delete`, gestión de otros perfiles, invitaciones e integración en la app — fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Recursión infinita de policies (`42P17`) al consultar `user_role`/`daycare_id` sobre `public.users` | Los helpers viven en `private`, son `SECURITY DEFINER` y su owner (`postgres`) tiene `bypassrls`; se verifica el `select` real como `authenticated` en la fase de pruebas. |
| Escalada de privilegios vía funciones `SECURITY DEFINER` | `search_path = ''` con todas las referencias cualificadas (`public.users`, `auth.uid()`), `execute` revocado a `PUBLIC` y otorgado solo a `authenticated`. |
| Un usuario actualiza columnas sensibles (`role`, `status`, `daycare_id`) | La policy permite la fila propia, pero el `revoke update` + `grant` por columna impide cambiar esas columnas; verificado por catálogo. |
| El schema `auth` varía entre versiones de Supabase (columnas de `auth.users` / `auth.identities`) | Verificar `information_schema.columns` con una consulta read-only antes de aplicar el seed; si difiere, ajustar la migración de datos antes de aplicarla. |
| Un signup sin `daycare_id` en `raw_user_meta_data` hace fallar la creación del perfil y revierte el signup | Error explícito en el trigger; los flujos de alta (staff crea cuentas / invitaciones) siempre deben enviar el metadata. Documentarlo en la spec de auth. |
| `anon` conserva privilegios por default de Supabase en tablas nuevas | `revoke all` explícito en ambas tablas y policies únicamente `to authenticated`; se verifica con `information_schema.role_table_grants` y un `select` simulado como `anon`. |
| Migrar directo a remoto sin entorno local ni dry-run | DDL mínimo y verificación inmediata con `list_tables`, `pg_policies`, consultas y advisors; cualquier corrección va en una migración nueva, nunca editando la aplicada. |
| `pgcrypto` no disponible o no expuesto | Está disponible en Supabase bajo el schema `extensions`; el seed lo referencia cualificado (`extensions.crypt`, `extensions.gen_salt`). Si falla, migración correctiva que cree la extensión. |
| Credenciales demo versionadas en el repo | Es un usuario exclusivamente de desarrollo local/demo, sin datos reales; no debe promoverse a producción. |
| Seed duplicado si se re-ejecuta manualmente | `apply_migration` corre una sola vez; una corrección futura usa `where not exists` por email. |

## Lo que **no** está en esta spec

- Enums `relationship_type`, `invitation_status`, `post_type` y `child_status`.
- Tablas `rooms`, `children`, `parent_children`, `invitations`, `posts`, `post_children`, `post_photos`, `reactions`, `comments`, `daily_summaries` y `devices`.
- Policies de `insert`/`delete` y gestión de otros usuarios por parte de staff/admin.
- Usuario `parent` demo, invitaciones y vínculos padre ↔ niño.
- Tipos TypeScript generados, cliente Supabase y pantallas de auth en la app.

Cada una de esas piezas, si llega, va en su propia spec.
