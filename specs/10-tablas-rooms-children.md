# SPEC 10 — Tablas `rooms` y `children`, RLS y `/kids` conectado a la base

> **Estado:** Completado
> **Depende de:** SPEC 07 — Tabla `daycares`, SPEC 08 — Tabla `users`, SPEC 09 — Autenticación y protección de rutas
> **Fecha:** 2026-11-24
> **Objetivo:** Crear las tablas `public.rooms` y `public.children` (con el enum `child_status`, policies de RLS y seed demo) en el proyecto `aqvrzjfdyqwcfiotnagu`, y conectar la pantalla `/kids` a la base real: listado y secciones por sala leídos de la DB, y el modal "Agregar niño" insertando en `children` vía Server Action, con perfil en `/kids/[id]`.

## Contexto

- Las specs 07/08 dejaron aplicadas `public.daycares` y `public.users` (más los helpers `private.current_daycare_id()` / `private.current_user_role()` y el trigger de perfil). El schema `public` contiene solo esas dos tablas.
- La referencia del esquema vive en `../07-db-schema/opendaycare-database-schema.md`; esta spec aplica las secciones **3. `rooms`** y **4. `children`**, más el enum `child_status`.
- Hoy `/kids` funciona con mocks: `app/lib/mock-kids.ts` (8 niños) mezclado con `app/lib/kid-storage.ts` (localStorage, SPEC 04). El modal "Agregar niño" guarda en `od-kids:v1`.
- El usuario demo es `staff@demo.daycare` / `demo1234` (Caro Giménez, staff de `Guardería Sala Soles`), único usuario autenticado existente.
- `mock-kids.ts` y `kid-storage.ts` tienen otros consumidores (feed, vincular padre, `/activar-cuenta`) que **no** cambian en esta spec.

## Scope

**In:**

- **Migración DDL `create_child_status_rooms_and_children`** vía `tools.supabase.apply_migration`:
  - Enum `public.child_status` (`active`, `archived`).
  - Tabla `public.rooms`: `id`, `daycare_id` (FK → `daycares`, NOT NULL), `name`, `created_at`. Índice `rooms_daycare_id_idx`. RLS habilitado.
  - Tabla `public.children`: `id`, `room_id` (FK → `rooms`, NOT NULL), `full_name`, `birth_date` (`date`), `enrolled_at` (`date`), `medical_notes` (nullable), `allergy_tags` (`text[]`), `photo_consent` (default `true`), `status` (`child_status`, default `active`), `created_at` / `updated_at`. Índice `children_room_id_idx`. Trigger `children_set_updated_at` reutilizando `public.set_updated_at()` (SPEC 08). RLS habilitado.
- **Migración DDL `create_rls_policies_for_rooms_and_children`**:
  - Policy `rooms_select_own_daycare`: `select` para `authenticated` del mismo daycare.
  - Policies `children_select_daycare_staff` y `children_insert_daycare_staff`: `select`/`insert` solo para `staff`/`admin` cuyo daycare (vía `room_id` → `rooms.daycare_id`) coincida con el del usuario.
  - Grants: `anon` sin privilegios en ambas; `authenticated` con `select` en `rooms`, `select` + `insert` por columna en `children` (`room_id`, `full_name`, `birth_date`, `enrolled_at`, `medical_notes`, `allergy_tags` — `status` y `photo_consent` quedan fijadas por defaults).
- **Migración data-only `seed_demo_rooms_and_children`**: 3 salas (`Soles`, `Lunas`, `Estrellas`) y los 8 niños del mockup en `Soles`, referenciando el daycare por `name` y las salas por `name` (sin UUIDs hardcodeados). `allergy_tags`/`medical_notes` desde los datos del mock; `enrolled_at` mapeado del string `enrolled` (ej. `feb 2025` → `2025-02-01`).
- **`/kids` real (server)**: la página obtiene `rooms` y `children` con el server client bajo RLS y se los pasa a la grilla. Secciones `SALA {SALA} · n niños` en el orden de `rooms`, solo salas con niños. El buscador filtra en el cliente igual que hoy. Se retira la mezcla mock + localStorage de esta pantalla.
- **Modal "Agregar niño" real**: el dropdown SALA lista las salas de la DB (recibidas como prop desde la página); "Guardar" invoca la Server Action `createChild` (`app/kids/actions.ts`, server client): valida campos (mismo formato `dd/mm/aaaa`, fecha real no futura), fija `enrolled_at = current_date` e inserta. Errores de validación → mensajes inline por campo (idénticos a hoy); error de DB → mensaje general visible sin cerrar el modal. Éxito → `revalidatePath("/kids")`, cierre del modal y el niño aparece en su sala.
- **Perfil `/kids/[id]` (uuid)**: la carpeta `app/kids/[slug]` se renombra a `app/kids/[id]` (Next.js no permite `[slug]` y `[id]` en el mismo nivel; nadie más enlaza a `/kids/<slug>`). Server component que busca el niño + su sala por id bajo RLS; id desconocido → redirect a `/kids`. `kid-profile-view.tsx` se refactoriza al shape DB. La pill `VINCULAR` y los padres vinculados **no se renderizan** en el perfil DB (la UI de vincular padres vuelve cuando exista `parent_children`/`invitations`). El botón "Editar niño" sigue sin acción.
- **Sin cambios**: `mock-kids.ts`, `kid-storage.ts`, `stored-kid-profile.tsx`, `parent-links.ts`, feed (`new-post-modal`, `post-storage`), `link-parent-modal` y `/activar-cuenta` siguen consumiendo mocks tal cual.
- Verificación MCP (catálogo, RLS con JWT simulado, advisors), materialización en `supabase/migrations/` + commit, Playwright MCP, `npm run lint` y `npx tsc --noEmit`.

**Out of scope (para specs futuras):**

- `parent_children`, `invitations` y la visibilidad de `children` para padres (hoy solo staff/admin ven niños).
- CRUD de salas desde la UI (crear/editar/borrar `rooms`) y la gestión de niños en salas Lunas/Estrellas más allá del seed.
- Editar y archivar niños (botón "Editar niño" y `status = archived` sin uso aún).
- Conectar el selector de niños de "Nueva publicación" y `/activar-cuenta` a `children`.
- `posts`, `post_children`, `daily_summaries`, `devices`, subida de fotos/avatar.
- Generación de `database.types.ts`.
- Borrar los archivos legacy del flujo mock (se conservan; se limpian cuando el feed pase a la DB).

## Data model

### Enum nuevo

| Enum           | Valores              |
| -------------- | -------------------- |
| `child_status` | `active`, `archived` |

### Tabla nueva `public.rooms`

| Campo        | Tipo                             | Notas                             |
| ------------ | -------------------------------- | --------------------------------- |
| `id`         | `uuid` PK                        | default `gen_random_uuid()`.      |
| `daycare_id` | `uuid` FK → `daycares`, NOT NULL | Una sala pertenece a un daycare.  |
| `name`       | `text` NOT NULL                  | Ej. "Soles".                      |
| `created_at` | `timestamptz`                    | NOT NULL, default `now()`.        |

### Tabla nueva `public.children`

| Campo                       | Tipo               | Notas                                                                                                |
| --------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `id`                        | `uuid` PK          | default `gen_random_uuid()`.                                                                         |
| `room_id`                   | `uuid` FK → `rooms`| NOT NULL. El daycare del niño se deriva vía sala.                                                    |
| `full_name`                 | `text`             | NOT NULL.                                                                                            |
| `birth_date`                | `date`             | NOT NULL.                                                                                            |
| `enrolled_at`               | `date`             | NOT NULL; lo fija la Server Action al día actual.                                                    |
| `medical_notes`             | `text`             | Nullable.                                                                                            |
| `allergy_tags`              | `text[]`           | NOT NULL, default `{}`; texto libre tal cual lo escribe el usuario, separado por comas (ver Decisiones). |
| `photo_consent`             | `boolean`          | NOT NULL, default `true` (no se pide en el modal).                                                   |
| `status`                    | `child_status`     | NOT NULL, default `active`.                                                                          |
| `created_at` / `updated_at` | `timestamptz`      | NOT NULL, default `now()`; trigger en `updated_at`.                                                  |

### DDL de la migración `create_child_status_rooms_and_children`

```sql
create type public.child_status as enum ('active', 'archived');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id),
  name text not null,
  created_at timestamptz not null default now()
);

create index rooms_daycare_id_idx on public.rooms (daycare_id);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null,
  medical_notes text,
  allergy_tags text[] not null default '{}',
  photo_consent boolean not null default true,
  status public.child_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index children_room_id_idx on public.children (room_id);

create trigger children_set_updated_at
before update on public.children
for each row execute function public.set_updated_at();

alter table public.rooms enable row level security;
alter table public.children enable row level security;
```

### DDL de la migración `create_rls_policies_for_rooms_and_children`

```sql
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
```

Resultado: `anon` no accede a ninguna de las dos tablas; `authenticated` solo lee salas de su daycare, y solo `staff`/`admin` leen e insertan niños de salas de su daycare. Editar y archivar quedan cerrados hasta su spec.

### Server Action

```ts
// app/kids/actions.ts
"use server";

type CreateChildResult =
  | { ok: true; childId: string }
  | {
      ok: false;
      fieldErrors?: Partial<Record<"name" | "birthDate" | "roomId", string>>;
      error?: string;
    };

export async function createChild(input: {
  fullName: string;
  birthDate: string; // dd/mm/aaaa — se parsea a date en el servidor
  roomId: string;    // uuid de rooms
  allergies: string; // texto libre, se divide por comas → allergy_tags
  medicalNotes: string;
}): Promise<CreateChildResult>;
```

- Valida nombre no vacío, fecha `dd/mm/aaaa` real y no futura, `roomId` presente.
- Inserta con `enrolled_at = current_date` y `revalidatePath("/kids")` al éxito.
- La RLS limita la escritura a staff/admin del daycare; un error de permiso se devuelve como `error` general.

## Plan de implementación

1. Cargar las skills `supabase` y `supabase-postgres-best-practices`; línea base con `get_advisors` (security/performance/health) y `list_migrations` / `list_tables`.
2. Aplicar `create_child_status_rooms_and_children`. Verificar contra el catálogo: enum con valores exactos, 11 columnas en `children`, 4 en `rooms`, PKs/FKs, defaults, índices, trigger e RLS habilitado.
3. Aplicar `create_rls_policies_for_rooms_and_children`. Verificar `pg_policies` (3 policies con esos nombres exactos) y grants por catálogo (`information_schema.role_table_grants` / `role_column_grants`).
4. Probar RLS en transacciones con `rollback` y JWT simulado: staff → ve las salas de `Guardería Sala Soles` (aún vacías) y 0 niños, insert permitido; JWT sin perfil (no-staff) → 0 filas en `children` e insert rechazado; `anon` → `permission denied` en ambas tablas.
5. Aplicar `seed_demo_rooms_and_children`. Verificar: 3 salas en orden de creación Soles → Lunas → Estrellas; 8 niños en Soles con `birth_date`, `allergy_tags`/`medical_notes` de Mateo (maní) y Tomás (lactosa) y `enrolled_at` mapeado del mock; `select` del staff devuelve 3 + 8 vía RLS.
6. Correr `get_advisors` (security/performance): sin hallazgos nuevos en `rooms`/`children` (sin `rls_enabled_no_policy`, sin `function_search_path_mutable`).
7. App: crear `app/kids/actions.ts`; refactorizar `app/kids/page.tsx` (fetch rooms + children server-side, `AddKidButton` recibe salas), `kids-grid.tsx` (shape DB, secciones por sala, link por id, paleta de avatar por índice), `add-kid-modal.tsx` (salas como prop, submit a la action, errores inline) y renombrar `app/kids/[slug]` → `app/kids/[id]` con `kid-profile-view.tsx` al shape DB sin pill VINCULAR.
8. Verificación final: Playwright MCP (login staff → `/kids` con solo `SALA SOLES · 8 niños`; agregar niño en Lunas → aparece sin recarga; validaciones inline; perfil `/kids/[id]`; id desconocido redirige; capturas desktop/móvil en `.playwright-mcp/`), `npm run lint` y `npx tsc --noEmit`.
9. Materializar las 3 migraciones en `supabase/migrations/` (SQL exacto registrado en `supabase_migrations.schema_migrations`) y commitear. Marcar los criterios de aceptación.

## Criterios de aceptación

- [x] `public.child_status` existe con valores `active`, `archived`.
- [x] `public.rooms` existe con exactamente 4 columnas (`id`, `daycare_id`, `name`, `created_at`), FK a `daycares`, índice `rooms_daycare_id_idx` y RLS habilitado.
- [x] `public.children` existe con exactamente 11 columnas (`id`, `room_id`, `full_name`, `birth_date`, `enrolled_at`, `medical_notes`, `allergy_tags`, `photo_consent`, `status`, `created_at`, `updated_at`), FK a `rooms`, índice `children_room_id_idx` y RLS habilitado.
- [x] `allergy_tags` es `text[] NOT NULL DEFAULT '{}'`; `photo_consent` es `boolean NOT NULL DEFAULT true`; `status` es `child_status NOT NULL DEFAULT 'active'`.
- [x] El trigger `children_set_updated_at` avanza `updated_at` en cada update.
- [x] Existen exactamente las policies `rooms_select_own_daycare`, `children_select_daycare_staff` y `children_insert_daycare_staff`, todas `to authenticated`.
- [x] `anon` no tiene privilegios en `rooms` ni `children`; `authenticated` tiene `select` en ambas e `insert` por columna solo en las 6 columnas de la action.
- [x] JWT simulado de staff ve las salas y los niños de su daycare e inserta un niño de prueba (dentro de transacción con `rollback`); JWT sin perfil ve 0 salas/0 niños y su insert falla.
- [x] El seed creó `Soles`, `Lunas`, `Estrellas` y los 8 niños del mock en Soles (Mateo con `allergy_tags {maní}` + notas; Tomás con `{lactosa}` + notas), sin UUIDs hardcodeados.
- [x] `/kids` renderiza desde la DB: sección `SALA SOLES · 8 niños`, sin secciones vacías, buscador funcional, tarjetas enlazan a `/kids/<uuid>`.
- [x] El dropdown SALA del modal lista las salas de la DB con placeholder `Seleccionar sala`.
- [x] "Guardar" válido inserta en `children` con `enrolled_at` del día y el niño aparece en `/kids` sin recarga manual (`revalidate`); recargar lo conserva.
- [x] "Guardar" con Nombre/Fecha/Sala vacíos o fecha inválida/futura muestra los mismos errores inline de hoy y no cierra el modal.
- [x] `/kids/<uuid>` muestra el perfil DB (edad, sala, ingreso, caja de alergias si corresponde) **sin** pill VINCULAR ni padres vinculados; un id desconocido redirige a `/kids`.
- [x] Feed, "Nueva publicación", `/activar-cuenta` y vincular padre funcionan sin cambios (sus mocks intactos).
- [x] `get_advisors` (security y performance) no reporta hallazgos nuevos por esta spec.
- [x] Las 3 migraciones quedaron materializadas en `supabase/migrations/` y commiteadas.
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** listado + modal reales — si solo el modal escribiera, el niño nuevo nunca aparecería (decisión del usuario).
- **Sí:** seed de 3 salas + los 8 niños del mockup — la pantalla queda igual al mockup tras el cambio (decisión del usuario).
- **Sí:** visibilidad de `children` solo para staff/admin por ahora — `parent_children` no existe; la visibilidad por hijo del padre va en la spec que la cree (decisión del usuario).
- **Sí:** perfil por uuid en `/kids/[id]` — sin colisiones ni derivación de slugs (decisión del usuario). El renombrado de `[slug]` a `[id]` es forzado: Next.js no permite dos nombres de segmento dinámico en el mismo nivel, y nada más enlaza a `/kids/<slug>`.
- **Sí:** alergias como texto libre tal cual (se separa por comas y se guarda en español dentro de `allergy_tags`) — decisión explícita del usuario. **Desviación documentada de la referencia**, que sugiere tags en inglés traducidos por la UI; se retoma si aparece una spec de normalización.
- **Sí:** Server Action con server client para el insert — validación en servidor y un solo camino de escritura (decisión del usuario).
- **Sí:** `enrolled_at` derivado al día del guardado — el modal no pide fecha de ingreso y hoy muestra "ingresó {mes actual}" (decisión del usuario).
- **Sí:** ocultar la pill VINCULAR y los padres vinculados en el perfil DB — el flujo mock de vincular (spec 05) queda intacto para sus consumidores actuales (decisión del usuario).
- **Sí:** conservar `mock-kids.ts` / `kid-storage.ts` / `stored-kid-profile.tsx` — feed, vincular y `/activar-cuenta` los siguen usando; se limpian cuando el feed pase a la DB (decisión del usuario).
- **Sí:** grants por columna en el `insert` de `children` — `status` y `photo_consent` quedan fijadas por defaults del servidor.
- **Sí:** helpers `private.*` existentes de SPEC 08 para las policies — evita recursión de RLS.
- **No:** `parent_children`, invitations, CRUD de salas, editar/archivar niños, selector del feed y `database.types.ts` — fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Recursión de policies al derivar el daycare del niño vía `rooms` | Las policies usan los helpers `private.*` (`SECURITY DEFINER`, `bypassrls` del owner); `rooms` no tiene policies que consulten `children`. Se prueba con `select`/`insert` simulando JWT. |
| Next.js rechaza `[slug]` + `[id]` en el mismo nivel | Se renombra la carpeta en el mismo paso; se verifica que no queden enlaces a `/kids/<slug>` (solo `kids-grid` enlazaba y se refactoriza). |
| `cacheComponents: true` + fetch server-side con cookies | La página ya es dinámica (`instant = false` + perfil por cookies); el fetch de rooms/children no añade prerender. Verificar con `tsc`/build. |
| Fecha `dd/mm/aaaa` parseada distinto en cliente y servidor | El parseo y la validación viven solo en la Server Action; el cliente muestra lo que devuelve. |
| Niño insertado no visible si el `revalidate` no alcanza | `revalidatePath("/kids")` + el listado deja de depender de eventos de localStorage; se verifica en Playwright sin recarga manual. |
| Seed re-ejecutado duplica salas/niños | `apply_migration` corre una vez; una corrección futura usaría `on conflict` / `where not exists`. |
| Migrar directo a remoto sin stack local | DDL mínimo, verificación inmediata por catálogo + advisors; correcciones en migración nueva, nunca editando la aplicada. |

## Lo que **no** está en esta spec

- `parent_children`, `invitations` y visibilidad de niños para padres.
- CRUD de salas y edición/archivo de niños.
- Conexión del feed, "Nueva publicación" y `/activar-cuenta` a `children`.
- `posts`, `post_children`, `daily_summaries`, `devices` y subida de fotos.
- Tipos TypeScript generados desde la DB.
- Limpieza de los archivos legacy del flujo mock.

Cada una de esas piezas, si llega, va en su propia spec.
