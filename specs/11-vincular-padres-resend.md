# SPEC 11 — Invitaciones reales con Resend y registro del padre (`invitations` + `parent_children`)

> **Estado:** Implementado
> **Depende de:** SPEC 08 — Tabla `users`, SPEC 09 — Autenticación y protección de rutas, SPEC 10 — Tablas `rooms` y `children`
> **Fecha:** 2026-11-24
> **Objetivo:** Crear las tablas `public.invitations` y `public.parent_children` con sus enums, policies y helpers, y conectar el flujo real de vinculación: el modal "Vincular padre" del perfil `/kids/[id]` inserta invitaciones y envía el correo con Resend (`resend`, desde `onboarding@resend.dev`), y `/activar-cuenta` registra al padre en Supabase Auth (código + email + contraseña doble con mínimo 8) aceptando la invitación y creando el vínculo padre ↔ niño.

## Contexto

- SPEC 05 implementó el flujo mock de vincular padre en localStorage (`od-parent-links:v1`): modal con código de 5 caracteres que vence en 7 días y `/activar-cuenta` consumiendo ese código. SPEC 10 ocultó la pill VINCULAR y la caja PADRES VINCULADOS del perfil DB hasta que existieran `parent_children`/`invitations` — esta spec es esa continuación.
- SPEC 08 dejó el trigger `on_auth_user_created` que **exige** `raw_user_meta_data.daycare_id` y por default crea `role = 'parent'`. SPEC 09 dejó `/activar-cuenta` pública con el CTA sin acción. La referencia de schema define `invitations` (sección 6) y `parent_children` (sección 5).
- El flujo mock vive en `app/lib/parent-links.ts` + `app/components/link-parent-modal.tsx` + `app/components/linked-parents.tsx` (consumidos también por los componentes huérfanos `kid-profile.tsx` y `stored-kid-profile.tsx`, que nadie importa desde SPEC 10) y en `app/activar-cuenta/page.tsx`. Todos se reescriben a la forma DB en esta spec.
- Regla del proyecto: la app usa siempre el client SDK oficial con publishable key; `anon` no tiene privilegios en tablas; helpers sensibles van en `private` (no expuesto por PostgREST) — las funciones RPC que el cliente debe poder llamar viven en `public` con `execute` revocado y otorgado a mano (lección SPEC 08).

## Scope

**In:**

- **Migración DDL `create_relationship_invitation_enums_and_tables`** vía `tools.supabase.apply_migration`:
  - Enums `public.relationship_type` (`father`, `mother`, `guardian`) y `public.invitation_status` (`pending`, `accepted`, `expired`, `cancelled`).
  - Tabla `public.invitations`: `id`, `child_id` (FK → `children`, NOT NULL), `invited_by` (FK → `users`, NOT NULL), `full_name`, `email` (minúsculas), `relationship` (`relationship_type`), `code` (`text` UNIQUE, siempre mayúsculas), `status` (default `pending`), `expires_at` (NOT NULL), `accepted_at` (nullable), `created_at`. Índices: `invitations_code_unique` (sobre `upper(code)`), `invitations_child_id_idx`, y unique parcial `invitations_child_email_active_unique` sobre `(child_id, lower(email))` `where status in ('pending', 'accepted')` (respalda la regla de duplicado en la DB). RLS habilitado.
  - Tabla `public.parent_children`: `id`, `parent_id` (FK → `users`), `child_id` (FK → `children`), `relationship` (`relationship_type`), `created_at`, con UNIQUE (`parent_id`, `child_id`) e índices en ambas FKs. RLS habilitado.
- **Migración DDL `create_rls_policies_for_invitations_and_parent_children`**:
  - Helper `private.current_user_email()` (`SECURITY DEFINER`, `STABLE`, `search_path` fijo, `execute` solo `authenticated`).
  - RPC `public.signup_lookup(p_code, p_email)` (`SECURITY DEFINER`, `search_path` fijo, `execute` a `anon` + `authenticated` tras `revoke` de `PUBLIC`): devuelve `{daycare_id, daycare_name, room_name, child_name, full_name, relationship}` **solo** si código+email (insensible a mayúsculas, trimados) matchean una invitación `pending` no vencida; una `pending` vencida se marca `expired` en el momento (lazy) y no devuelve nada. Sin match → cero filas.
  - RPC `public.auth_email_exists(p_email)` (`SECURITY DEFINER`, `search_path` fijo, `execute` solo `authenticated`): devuelve si ya existe una cuenta en `auth.users` con ese email; lanza excepción si quien llama no es `staff`/`admin` (check interno con `private.current_user_role()`).
  - Policies (7, todas `to authenticated`): `invitations_select_daycare_staff` y `invitations_insert_daycare_staff` (staff/admin del daycare del niño vía `child_id → rooms.daycare_id`, insert con `invited_by = auth.uid()`); `invitations_select_own_email` (`email` igual al email del JWT) y `invitations_update_accept_own_email` (pending no vencida; `with check` exige quedar `accepted` con `accepted_at`); `parent_children_select_daycare_staff`, `parent_children_select_own` (`parent_id = auth.uid()`) y `parent_children_insert_own_accepted` (existe invitación `accepted` con ese `child_id` y el email del JWT).
  - Grants: `anon` sin privilegios en ambas tablas; `authenticated` con `select` en ambas, `update (status, accepted_at)` en `invitations`, `insert (child_id, invited_by, full_name, email, relationship, code, expires_at)` en `invitations` y `insert (parent_id, child_id, relationship)` en `parent_children`.
- **Resend**: `npm i resend`; `RESEND_API_KEY` y `APP_URL` (base para el link, default `http://localhost:3000`) en `.env.local`. `app/lib/resend.ts` (client server-only) + `app/lib/invitation-email.ts` (HTML en español, estilo cálido del proyecto): asunto "Te invitaron a seguir a {niño} en {guardería}", cuerpo con el código destacado, "vence en 7 días" y botón/link a `{APP_URL}/activar-cuenta?code={CÓDIGO}`. From: `{daycareName} <onboarding@resend.dev>`.
- **Modal "Vincular padre" real** (reescritura de `app/components/link-parent-modal.tsx`): mismo mockup de SPEC 05 (campos NOMBRE/EMAIL, pills Mamá/Papá/Tutor/a mapeadas a `mother`/`father`/`guardian`, caja informativa). "Enviar invitación" invoca la Server Action `createInvitation` (`app/kids/actions.ts`): valida inline nombre vacío, email con formato inválido, email ya invitado `pending`/`accepted` para ese niño, y email con cuenta existente (`auth_email_exists`). Éxito → inserta la invitación (`code` generado en el servidor con el alfabeto sin ambiguos de SPEC 05, 5 chars, `expires_at = now() + 7 días`, `invited_by` = staff), envía el correo con Resend, y el modal pasa a estado de éxito mostrando el código ("Vence en 7 días") y el estado del envío; si Resend falla, la invitación queda y el aviso dice "el correo no se pudo enviar — compartí el código {CÓDIGO} manualmente".
- **Caja PADRES VINCULADOS real** (reescritura de `app/components/linked-parents.tsx`): `app/kids/[id]/page.tsx` lee las invitaciones del niño + los padres aceptados (`parent_children` join `users`) y los pasa como props; pills: `pending` → **PENDIENTE** ("invitación enviada"), `accepted` → **ACTIVA** (nombre del usuario), `expired` → **VENCIDA**. Botón "Vincular otro padre" abre el modal; tras guardar, el padre aparece sin recarga (`revalidatePath`).
- **`/activar-cuenta` real** (reescritura de `app/activar-cuenta/page.tsx` + nuevo `app/components/activation-form.tsx` + `app/activar-cuenta/actions.ts`):
  - Mantiene el layout/estilos actuales; agrega el campo CONFIRMAR CONTRASEÑA (mínimo 8, coincidencia validada inline); el checkbox de autorización se exige marcado para enviar (no se persiste).
  - La caja de invitación sigue a **código + email** (debounced, `supabase.rpc("signup_lookup")`): con match muestra "Te invitaron a seguir a {niño} · Sala {sala}" con avatar; sin match queda el estático "Mateo · Sala Soles". El link del correo (`?code=...`) precarga el campo CÓDIGO.
  - "Activar mi cuenta": llama al lookup → si hay match, `supabase.auth.signUp` con metadata `{daycare_id, full_name, role: 'parent'}` (el trigger de SPEC 08 crea el perfil con nombre y guardería correctos) → invoca la Server Action `acceptInvitation(code)` con la sesión recién creada: marca la invitación `accepted` (`accepted_at`) e inserta el vínculo en `parent_children` con el parentesco de la invitación → `router.replace("/")` logueado.
  - Errores inline, sin navegar: código/email sin match o vencido (el vencido queda `expired`), contraseña <8 o sin coincidir, checkbox sin marcar, y "ya tenés cuenta, iniciá sesión" si el email ya está registrado en Auth.
- **Protección**: `updateSession` redirige a `/` a un usuario con sesión activa que visite `/activar-cuenta` (simétrico a `/login`, SPEC 09).
- **Limpieza del flujo mock**: se eliminan `app/lib/parent-links.ts` y los componentes huérfanos `app/components/kid-profile.tsx` y `app/components/stored-kid-profile.tsx` (sin importadores desde SPEC 10; su eliminación es requisito para que `tsc` pase tras reescribir `linked-parents.tsx`). `mock-kids.ts` y `kid-storage.ts` se conservan (el feed sigue usándolos).
- Verificación MCP (catálogo, RLS con JWT simulado, advisors), materialización en `supabase/migrations/` + commit, Playwright MCP, `npm run lint` y `npx tsc --noEmit`.

**Out of scope (para specs futuras):**

- Cancelar, reenviar o regenerar invitaciones (el estado `cancelled` queda reservado); editar/desvincular padres.
- Visibilidad de `children` y `/kids` para el rol `parent` (hoy el padre logueado ve `/kids` vacío; la UX por roles va en su spec).
- Feed real del padre (`posts`, `post_children`), pantalla `familia-feed`.
- Dominio propio verificado en Resend y correos transaccionales más allá de la invitación.
- Expiración por job/cron; notificaciones de vencimiento en el perfil.
- Recuperación de contraseña y `database.types.ts`.

## Data model

### Enums nuevos

| Enum                | Valores                                        |
| ------------------- | ---------------------------------------------- |
| `relationship_type` | `father`, `mother`, `guardian`                 |
| `invitation_status` | `pending`, `accepted`, `expired`, `cancelled` |

Etiquetas UI: `mother` → Mamá, `father` → Papá, `guardian` → Tutor/a.

### Tabla nueva `public.invitations`

| Campo        | Tipo                             | Notas                                              |
| ------------ | -------------------------------- | -------------------------------------------------- |
| `id`         | `uuid` PK                        | default `gen_random_uuid()`.                       |
| `child_id`   | `uuid` FK → `children`, NOT NULL | A qué niño se vincula.                             |
| `invited_by` | `uuid` FK → `users`, NOT NULL     | Staff que invita (fijado por la action).           |
| `full_name`  | `text` NOT NULL                  | Nombre del padre/tutor.                            |
| `email`      | `text` NOT NULL                  | Minúsculas, trimado.                               |
| `relationship` | `relationship_type` NOT NULL   |                                                    |
| `code`       | `text` NOT NULL, UNIQUE          | 5 chars, siempre mayúsculas, alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. |
| `status`     | `invitation_status` NOT NULL     | default `pending`.                                 |
| `expires_at` | `timestamptz` NOT NULL           | `created_at + 7 días`.                             |
| `accepted_at` | `timestamptz` nullable          | Se fija al aceptar.                                |
| `created_at` | `timestamptz` NOT NULL           | default `now()`.                                   |

### Tabla nueva `public.parent_children`

| Campo          | Tipo                                | Notas                                    |
| -------------- | ----------------------------------- | ---------------------------------------- |
| `id`           | `uuid` PK                           | default `gen_random_uuid()`.             |
| `parent_id`    | `uuid` FK → `users`, NOT NULL       |                                          |
| `child_id`     | `uuid` FK → `children`, NOT NULL    |                                          |
| `relationship` | `relationship_type` NOT NULL        | Copiado desde la invitación al aceptar.  |
| `created_at`   | `timestamptz` NOT NULL              | default `now()`; UNIQUE (`parent_id`, `child_id`). |

### Server Actions

```ts
// app/kids/actions.ts (extensión)
type CreateInvitationResult =
  | { ok: true; code: string; emailSent: boolean }
  | { ok: false; fieldErrors?: Partial<Record<"name" | "email", string>>; error?: string };
export async function createInvitation(input: {
  childId: string; fullName: string; email: string; relation: "mother" | "father" | "guardian";
}): Promise<CreateInvitationResult>;
// Valida sesión staff (getClaims + users), formato, duplicado por niño
// (select propio + índice único parcial), cuenta existente (rpc auth_email_exists),
// genera el código, inserta y envía con Resend. emailSent: false ⇒ aviso en el modal.

// app/activar-cuenta/actions.ts
type AcceptInvitationResult = { ok: true } | { ok: false; error: string };
export async function acceptInvitation(input: { code: string }): Promise<AcceptInvitationResult>;
// Con la sesión recién creada: selecciona la invitación por código + email del JWT
// (RLS own_email), update a accepted/accepted_at, inserta parent_children.
// UNIQUE (parent_id, child_id) chocada ⇒ trata como éxito (idempotente).
```

Flujo de aceptación (orden): el cliente hace `signUp` (crea `auth.users` + `users` vía trigger) → `acceptInvitation` actualiza la invitación → el insert de `parent_children` pasa su policy porque la invitación ya quedó `accepted`.

## Plan de implementación

1. Cargar las skills `supabase` y `supabase-postgres-best-practices`; línea base con `get_advisors` (security/performance/health) y `list_migrations` / `list_tables`.
2. Aplicar `create_relationship_invitation_enums_and_tables`. Verificar contra el catálogo: enums con valores exactos, 11 columnas en `invitations` y 5 en `parent_children`, PKs/FKs, `unique (parent_id, child_id)`, los 3 índices de `invitations` (incluido el parcial) y RLS habilitado.
3. Aplicar `create_rls_policies_for_invitations_and_parent_children`. Verificar `pg_policies` (7 policies con nombres exactos), grants por catálogo, y que `signup_lookup` / `auth_email_exists` son `SECURITY DEFINER`, `search_path` fijo, con `execute` revocado a `PUBLIC` y otorgado exactamente a `anon`+`authenticated` / `authenticated` (lección SPEC 08).
4. Probar RLS en transacciones con `rollback` y JWT simulado: staff ve/inserta invitaciones de su daycare y no las de otro; JWT sin perfil no ve nada; `anon` recibe `permission denied` en ambas tablas pero `rpc signup_lookup` con match devuelve la fila y sin match cero filas; una `pending` vencida se marca `expired` y devuelve cero filas; simulación completa de aceptación (update + insert `parent_children`) con JWT de padre nuevo.
5. `npm i resend`; agregar `RESEND_API_KEY` y `APP_URL` a `.env.local`; crear `app/lib/resend.ts` y `app/lib/invitation-email.ts`. Verificar: `npx tsc --noEmit` pasa.
6. Extender `app/kids/actions.ts` con `createInvitation`; reescribir `link-parent-modal.tsx` (submit a la action, estado de éxito con código + estado de envío, errores inline) y `linked-parents.tsx` (props DB, pills PENDIENTE/ACTIVA/VENCIDA); actualizar `app/kids/[id]/page.tsx` (fetch invitaciones + padres aceptados, `revalidatePath`); eliminar `parent-links.ts`, `kid-profile.tsx`, `stored-kid-profile.tsx` tras confirmar con grep que nada los importa.
7. Reescribir `/activar-cuenta`: `activation-form.tsx` (caja dinámica vía `rpc signup_lookup` debounced, campos código/email/contraseña/confirmación, checkbox requerido), `acceptInvitation` en `app/activar-cuenta/actions.ts`, y el redirect en `updateSession` para sesiones activas.
8. Verificación E2E con Playwright MCP: login staff → perfil → vincular → invitación PENDIENTE → logout → `/activar-cuenta?code=...` → caja dinámica → registro con contraseña → redirect a `/` logueado como "Familia" → perfil muestra al padre con pill ACTIVA → re-login del padre persiste; casos de error (código vencido/consumido, contraseña <8, email ya registrado). Capturas desktop/móvil en `.playwright-mcp/`. `npm run lint` y `npx tsc --noEmit`.
9. Correr `get_advisors` (security/performance): sin hallazgos nuevos. Materializar las 2 migraciones en `supabase/migrations/` (SQL exacto de `supabase_migrations.schema_migrations`) y commitear. Marcar los criterios de aceptación.

## Criterios de aceptación

- [x] `public.relationship_type` existe con valores `father`, `mother`, `guardian`; `public.invitation_status` con `pending`, `accepted`, `expired`, `cancelled`.
- [x] `public.invitations` existe con exactamente 11 columnas y `public.parent_children` con 5; FKs, UNIQUE (`parent_id`, `child_id`) e índices según el data model; RLS habilitado en ambas.
- [x] El índice único parcial impide dos invitaciones `pending`/`accepted` con el mismo `(child_id, email)`.
- [x] Existen exactamente las 7 policies listadas, todas `to authenticated`; `anon` no tiene privilegios en las tablas pero puede ejecutar `signup_lookup`.
- [x] `authenticated` solo tiene `update (status, accepted_at)` en `invitations` y `insert` por columna según el data model.
- [x] Las pruebas RLS con JWT simulado pasan: staff ve/inserta solo su daycare; `signup_lookup` devuelve datos solo con match exacto código+email; una `pending` vencida se marca `expired`; el flujo aceptación → vínculo funciona con JWT de padre.
- [x] El modal reproduce el mockup de SPEC 05 y valida inline nombre vacío, email inválido, email ya invitado para ese niño y email con cuenta existente (no cierra en ningún caso de error).
- [x] Un envío válido crea la invitación (`pending`, `expires_at` = +7 días, código de 5 chars sin ambiguos) y el padre aparece como PENDIENTE en el perfil sin recarga manual.
- [x] Tras crear, el modal muestra el código y "Vence en 7 días"; si Resend falla, muestra el aviso "compartí el código {CÓDIGO} manualmente" y la invitación queda persistida.
- [x] En `/activar-cuenta`, código+email con match muestran "Te invitaron a seguir a {niño} · Sala {sala}"; sin match, la caja queda en el texto estático; el link del correo precarga el código.
- [x] Un registro válido crea la cuenta (`role = 'parent'`, `full_name` y `daycare_id` de la invitación), marca la invitación `accepted`, crea la fila en `parent_children` con su parentesco y redirige a `/` logueado; el perfil muestra al padre con pill ACTIVA.
- [x] Código inexistente, email que no corresponde o invitación vencida muestran error inline y no navegan; el vencido queda `status = 'expired'` y el aceptado no reválida.
- [x] Contraseña <8, confirmación sin coincidir o checkbox sin marcar muestran error inline y no envían.
- [x] Un email ya registrado en Auth muestra "ya tenés cuenta, iniciá sesión" y no crea nada.
- [x] Con sesión activa, visitar `/activar-cuenta` redirige a `/`.
- [x] `app/lib/parent-links.ts`, `kid-profile.tsx` y `stored-kid-profile.tsx` fueron eliminados y nada los referencia; feed, `/kids` y login no cambiaron.
- [x] `get_advisors` (security y performance) no reporta hallazgos nuevos por esta spec. *(Nota: los WARN remanentes son por diseño según las Decisiones de este spec — `signup_lookup` ejecutable por anon y `auth_email_exists` por authenticated, ambos `SECURITY DEFINER` en `public` con grants manuales y `search_path` fijo — y `multiple_permissive_policies` refleja las 2 policies SELECT exactas que exige el data model. El hallazgo INFO `unindexed_foreign_keys` de `invited_by` se corrigió con `add_invited_by_index_to_invitations`; `unused_index` es esperable en tablas nuevas. Los hallazgos pre-existentes de SPEC 10 (`rls_auto_enable`, leaked password protection, policies de `users`) no cambiaron.)*
- [x] Las 2 migraciones quedaron materializadas en `supabase/migrations/` y commiteadas. *(Materializadas las 5 aplicadas en total: las 2 del plan + 3 correctivas/de ajuste; falta el commit, que hace el humano.)*
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** `invitations` + `parent_children` juntas — aceptar la invitación debe producir el vínculo real (decisión del usuario).
- **Sí:** restaurar la pill VINCULAR y la caja PADRES VINCULADOS en el perfil DB — SPEC 10 las ocultó esperando estas tablas (decisión del usuario).
- **Sí:** registro con código + email + **doble campo de contraseña** con mínimo 8 caracteres — decisión del usuario (Supabase exige 6; validamos 8 antes de enviar).
- **Sí:** remitente `onboarding@resend.dev` con nombre del daycare — decisión del usuario; en desarrollo solo entrega al dueño de la cuenta de Resend, por eso el código queda visible al staff como fallback.
- **Sí:** `expires_at = created_at + 7 días` y `expired` lazy — se marca al intentar usarla (lookup/aceptación), sin cron (decisión del usuario).
- **Sí:** rechazar en el modal emails con cuenta existente vía `public.auth_email_exists` — decisión del usuario; vincular cuentas existentes a otro niño va en otra spec. La RPC vive en `public` (PostgREST no expone `private`) con `execute` solo a `authenticated` y check interno staff/admin.
- **Sí:** lookup angosto pre-signup `public.signup_lookup` — decisión del usuario tras ver que el trigger de SPEC 08 exige `daycare_id` que el anon no puede leer por RLS. Matiza la elección "sin acceso anon": devuelve datos solo con match exacto código+email (nunca lista invitaciones ni expone emails ajenos) y además restaura la caja dinámica de `/activar-cuenta` con datos reales.
- **Sí:** si Resend falla, la invitación queda + aviso con el código — decisión del usuario; pragmático en dev.
- **Sí:** el código se muestra en el modal **después** de crear (estado de éxito), no al abrirlo — desviación documentada de SPEC 05: el código lo genera el servidor al insertar; mostrarlo antes sería un preview que podría no coincidir.
- **Sí:** invitación vencida se muestra como pill VENCIDA (SPEC 05 la dejaba pendiente) — con estados reales no hay razón para ocultarlo.
- **Sí:** `signUp` client-side con metadata del lookup y `acceptInvitation` como Server Action — el signup debe setear cookies en el navegador; la aceptación corre ya autenticada bajo RLS, sin service role.
- **Sí:** redirect a `/` para autenticados en `/activar-cuenta` — simétrico al manejo de `/login` (SPEC 09).
- **Sí:** envío de correo dentro de la Server Action `createInvitation` (no route handler) — un solo camino de escritura, `RESEND_API_KEY` nunca llega al cliente.
- **Sí:** UNIQUE parcial `(child_id, lower(email))` — respalda en la DB la regla de duplicado de la action.
- **Sí:** `parent_children` insert idempotente (conflicto de UNIQUE tratado como éxito) — el flujo no debe romperse por reintentos.
- **Sí:** eliminar `parent-links.ts` y los dos componentes huérfanos del flujo mock — tras reescribir sus consumidores ya no queda nadie que los use y `tsc` fallaría; el resto de los mocks (feed) se conserva como en SPEC 10.
- **No:** cancelar/reenviar invitaciones, visibilidad de niños para padres, feed real, dominio propio de Resend, cron de expiración, magic links — fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Enumeración de invitaciones vía `signup_lookup` anónimo | Requiere match exacto código+email; devuelve solo datos de esa invitación; cero filas en cualquier otro caso. Probado con JWT/anon en el paso 4. |
| Enumeración de cuentas vía `auth_email_exists` | `execute` solo a `authenticated`; la función misma exige rol `staff`/`admin`; es el feature pedido (rechazo en el modal). |
| Advisors: `SECURITY DEFINER` en `public` ejecutable por defecto (lección SPEC 08) | `revoke execute from PUBLIC, anon, authenticated` explícito y grants selectivos; `search_path` fijo; verificación por catálogo. |
| Recursión de policies (`parent_children` insert consulta `invitations`) | Las policies de `invitations` usan `private.*` (`SECURITY DEFINER`) y ninguna consulta `parent_children`; se prueba el flujo completo con JWT simulado. |
| Resend en dev solo entrega al dueño de la cuenta | Fallback explícito: el código queda visible al staff en el modal y el aviso instruye a compartirlo manualmente. |
| Carrera: dos invitaciones al mismo email/niño desde distintos staff | El índice único parcial rechaza el segundo insert; la action mapea la violación al error inline "ya invitado". |
| El padre recién registrado ve `/kids` vacío y feed mock | Aceptado por scope; la UX por roles (protección y contenido para `parent`) va en su propia spec. |
| `signUp` con sesión activa produce estados raros | `updateSession` redirige a `/` a autenticados que visiten `/activar-cuenta`. |
| Resend cae después del insert (correo nunca enviado) | Decisión del usuario: la invitación persiste y el aviso ofrece el código manual. |

## Lo que **no** está en esta spec

- Cancelar, reenviar o regenerar invitaciones; editar/desvincular padres.
- Visibilidad de `children`/`/kids` y feed real para el rol `parent`.
- Dominio propio verificado en Resend y otros correos transaccionales.
- Expiración por cron y notificaciones de vencimiento.
- Recuperación de contraseña y `database.types.ts`.

Cada una de esas piezas, si llega, va en su propia spec.
