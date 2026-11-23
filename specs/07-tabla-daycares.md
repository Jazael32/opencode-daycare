# SPEC 07 — Tabla `daycares` y patrón de migraciones Supabase

> **Estado:** Implementado
> **Depende de:** ninguno
> **Fecha:** 2026-11-23
> **Objetivo:** Crear la primera tabla de dominio `daycares` (entidad raíz del esquema de `07-db-schema/opendaycare-database-schema.md`) en el proyecto Supabase `aqvrzjfdyqwcfiotnagu`, aplicando el patrón de migraciones vía MCP (`apply_migration`) con RLS deny-by-default y una guardería demo sembrada.

## Contexto

- El schema `public` del proyecto remoto estaba **vacío** al momento de escribir esta spec: solo existían las migraciones de prueba `create_test_table` y `drop_test_table` (ya revertida). `daycares` es la primera tabla real del modelo.
- La referencia del esquema vive en `../07-db-schema/opendaycare-database-schema.md` y no estaba aplicada en la base de datos; esta spec aplica únicamente la tabla `daycares`.
- Convención del esquema: PK `id` tipo `uuid` con default `gen_random_uuid()`, timestamps `timestamptz`, y todo lo persistido en inglés (las etiquetas visibles se traducen en la UI).

## Scope

**In:**

- Migración DDL `create_daycares_table` vía `tools.supabase.apply_migration` sobre el proyecto `aqvrzjfdyqwcfiotnagu`:
  - Tabla `public.daycares` con exactamente las 3 columnas de la referencia: `id` (uuid PK, default `gen_random_uuid()`), `name` (`text not null`) y `created_at` (`timestamptz not null default now()`).
  - `alter table public.daycares enable row level security` — **sin policies** (deny-by-default).
- Migración data-only `seed_demo_daycare`, separada de la DDL, que inserta la guardería demo `Guardería Sala Soles` **por nombre** (sin IDs hardcodeados).
- Verificación con las tools MCP: `list_tables` (verbose) para columnas/PK/defaults, consulta del seed y `get_advisors` (security y performance) tras el cambio.
- Documentar en esta spec el patrón de migraciones para que las próximas tablas (`users`, `rooms`, …) lo sigan.

**Out of scope (para specs futuras):**

- Tablas dependientes del esquema: `users`, `rooms`, `children`, `parent_children`, `invitations`, `posts`, `post_children`, `post_photos`, `reactions`, comentarios, `daily_summaries` y `devices`. Cada una va en su propia spec (o en una spec por grupo de tablas relacionadas).
- ENUMs del esquema (`user_role`, `user_status`, …): se crean cuando exista la tabla que los usa.
- Policies de RLS: dependen de Supabase Auth y de la tabla `users`; en esta spec la tabla queda bloqueada a propósito.
- Trigger de `updated_at` y columnas de auditoría: la referencia no define `updated_at` para `daycares`.
- Integración en la app Next.js: tipos generados (`database.types.ts`), cliente Supabase (`@supabase/supabase-js`, `@supabase/ssr`) y reemplazo de mocks.
- Seed de datos relacionados (salas, niños, posts demo).

## Data model

Tabla nueva `public.daycares`:

| Campo        | Tipo          | Notas                                            |
| ------------ | ------------- | ------------------------------------------------ |
| `id`         | `uuid` PK     | Default `gen_random_uuid()`.                     |
| `name`       | `text`        | `NOT NULL`. Ej. "Guardería Sala Soles".          |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()`.                     |

DDL de la migración `create_daycares_table`:

```sql
create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.daycares enable row level security;
```

Seed de la migración `seed_demo_daycare`:

```sql
insert into public.daycares (name)
values ('Guardería Sala Soles');
```

Sin `id` explícito (lo genera el default) y sin `created_at` explícito (lo genera `now()`), para no hardcodear valores generados en una migración de datos.

## Patrón de migraciones

1. **DDL y datos en migraciones separadas**, ambas con nombre snake_case descriptivo (`create_daycares_table`, `seed_demo_daycare`). Cada `apply_migration` queda registrado en `supabase_migrations.schema_migrations` del proyecto remoto.
2. **Sin IDs hardcodeados** en migraciones de datos: el seed referencia filas por columnas de negocio (`name`), nunca por UUID generado.
3. **Idempotencia razonable:** para la primera creación se usa `create table` sin `if not exists`; si una migración futura necesita re-ejecutarse, se resuelve con una migración correctiva nueva, no editando la anterior.
4. **Verificación post-migración con MCP:** `list_tables` verbose, consulta del seed y `get_advisors` antes de dar la migración por cerrada.
5. **Los cambios destructivos** (`drop table`, etc.) siempre van en su propia migración y requieren confirmación explícita.
6. **Copia local versionada:** cada migración aplicada se materializa en `supabase/migrations/<version>_<nombre>.sql` con el SQL exacto registrado en `supabase_migrations.schema_migrations`, para tener historial en git.

## Plan de implementación

1. Revisar `get_advisors` (security, performance y health) del proyecto **antes** de la migración, para tener una línea base sin hallazgos. Verificar: sin advisories previos en `public` (schema vacío).
2. Aplicar la migración `create_daycares_table` con el DDL del Data model. Verificar: `list_migrations` la lista y no hay error de ejecución.
3. Verificar el schema con `list_tables` (verbose): `daycares` existe con `id uuid` PK default `gen_random_uuid()`, `name text not null`, `created_at timestamptz not null default now()`, y RLS habilitado.
4. Aplicar la migración `seed_demo_daycare`. Verificar: existe exactamente una fila con `name = 'Guardería Sala Soles'` y un `id`/`created_at` generados.
5. Correr `get_advisors` (security y performance) después de las migraciones. Verificar: sin hallazgos nuevos; en particular, la tabla no aparece con "RLS disabled".
6. Actualizar el estado de esta spec a **Implementado** y marcar los criterios de aceptación.

## Verificación de implementación (2026-11-23)

Proyecto `aqvrzjfdyqwcfiotnagu`, migraciones aplicadas vía `tools.supabase.apply_migration`:

| Migración               | Version          | Resultado |
| ----------------------- | ---------------- | --------- |
| `create_daycares_table` | `20261123061847` | Aplicada. |
| `seed_demo_daycare`     | `20261123061851` | Aplicada. |

- **Línea base previa:** `public` sin tablas (`list_tables` verbose vacío). `get_advisors` performance y health sin hallazgos. Security ya mostraba 2 WARN preexistentes sobre `public.rls_auto_enable()` (función `SECURITY DEFINER` de la plataforma), ajenos a esta spec.
- **Schema verificado:** `daycares` tiene exactamente `id` (`uuid`, `NOT NULL`, PK, default `gen_random_uuid()`), `name` (`text`, `NOT NULL`) y `created_at` (`timestamptz`, `NOT NULL`, default `now()`). RLS habilitado y `0` policies.
- **Seed verificado:** exactamente 1 fila con `name = 'Guardería Sala Soles'`; `id` y `created_at` generados por los defaults de la tabla (ningún UUID escrito en el SQL de la migración).
- **Advisors posteriores:** performance y health sin hallazgos. Security no reporta RLS deshabilitado; el único hallazgo nuevo es el INFO `rls_enabled_no_policy` sobre `daycares`, esperado por el diseño deny-by-default. Los 2 WARN de `rls_auto_enable()` siguen siendo los preexistentes.
- **Materialización local:** el SQL exacto de ambas migraciones quedó versionado en `supabase/migrations/20261123061847_create_daycares_table.sql` y `supabase/migrations/20261123061851_seed_demo_daycare.sql`, como copia fiel de los statements registrados en `supabase_migrations.schema_migrations` (verificada por MD5; sin re-ejecutar nada en remoto).

## Criterios de aceptación

- [x] `public.daycares` existe con exactamente 3 columnas: `id`, `name`, `created_at` (sin columnas extra).
- [x] `id` es `uuid NOT NULL` con PK y default `gen_random_uuid()`.
- [x] `name` es `text NOT NULL`.
- [x] `created_at` es `timestamptz NOT NULL` con default `now()`.
- [x] La tabla tiene RLS **habilitado** y **cero policies** (deny-by-default).
- [x] Existe exactamente una fila sembrada: `name = 'Guardería Sala Soles'`, con `id` y `created_at` generados por los defaults.
- [x] `list_migrations` muestra `create_daycares_table` y `seed_demo_daycare` como migraciones aplicadas.
- [x] `get_advisors` (security) no reporta `daycares` con RLS deshabilitado. El único hallazgo nuevo es el INFO `rls_enabled_no_policy`, esperado por el diseño deny-by-default (sin policies hasta la spec de auth).
- [x] `get_advisors` (performance) no reporta hallazgos nuevos para `daycares`.
- [x] Ninguna migración hardcodea UUIDs generados.

## Decisiones

- **Sí:** RLS habilitado sin policies en la primera migración — deny-by-default; los advisors no reportan RLS deshabilitado (solo el INFO esperado `rls_enabled_no_policy`) y las policies reales llegan con la spec de auth, cuando exista `users` y el modelo de sesión.
- **Sí:** seed de la guardería demo en una migración data-only separada — las specs siguientes (`rooms` "Soles", usuarios demo) necesitan una guardería existente; separarlo mantiene la DDL pura y re-ejecutable por partes.
- **Sí:** seed por `name`, sin UUID hardcodeado — regla del proyecto para migraciones de datos.
- **Sí:** `apply_migration` vía MCP directo a remoto como mecanismo de aplicación — el proyecto no tenía stack local inicializado; para una tabla de 3 columnas, el costo de montar el CLI local no se justifica. Las migraciones quedan materializadas en `supabase/migrations/` para versionarlas en git, sin cambiar el mecanismo de aplicación. Queda como opción futura inicializar el CLI si el volumen de migraciones crece.
- **Sí:** solo `created_at` (sin `updated_at`) — fidelidad literal a la referencia, que no define `updated_at` para `daycares`.
- **Sí:** sin índices extra — el PK ya crea su índice; no hay consultas por `name` en el modelo actual.
- **No:** policies de RLS, integración con la app, ENUMs y tablas dependientes — fuera de alcance de esta primera migración.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Migrar directo a remoto sin entorno local, sin posibilidad de dry-run | Cambio mínimo (3 columnas + RLS) y verificación inmediata con `list_tables` y advisors; cualquier corrección se hace con una migración correctiva nueva, nunca editando la aplicada. |
| RLS sin policies bloquea la lectura desde la app cuando llegue el cliente Supabase | Es intencional hasta la spec de auth; el seed y la verificación se ejecutan por SQL (server-side), no con la anon key. |
| `gen_random_uuid()` no disponible | Está disponible por defecto en Supabase (PG 13+); si el `apply_migration` falla, se corrige con una migración que habilite `pgcrypto` antes de reintentar. |
| Seed duplicado si la migración se re-ejecuta manualmente | `apply_migration` corre cada migración una sola vez (registrada en `supabase_migrations`); si se necesita re-ejecutar, la migración correctiva usa `where not exists`. |

## Lo que **no** está en esta spec

- Tablas `users`, `rooms`, `children`, `parent_children`, `invitations`, `posts`, `post_children`, `post_photos`, `reactions`, `comments`, `daily_summaries` y `devices`.
- ENUMs del esquema y policies de RLS.
- Tipos TypeScript generados y cliente Supabase en la app.
- Seeds de datos relacionados más allá de la guardería demo.

Cada una de esas piezas, si llega, va en su propia spec.
