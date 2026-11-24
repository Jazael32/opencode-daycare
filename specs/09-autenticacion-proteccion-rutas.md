# SPEC 09 — Autenticación email/password y protección de rutas

> **Estado:** Completado
> **Depende de:** SPEC 03 — Login y Activar cuenta, SPEC 08 — Tabla `users`
> **Fecha:** 2026-11-23
> **Objetivo:** Implementar login real email/contraseña contra Supabase Auth, proteger todas las rutas excepto `/login` y `/activar-cuenta`, cerrar sesión real, y mostrar la identidad real (perfil `users` + `daycares`) en el sidebar y el saludo del feed.

## Scope

**In:**

- **Login real** en `/login`: el formulario pasa a ser funcional (client component `app/components/login-form.tsx`) usando el browser client (`utils/supabase/client.ts`) y `supabase.auth.signInWithPassword`. Estados: campo vacío → no envía; credenciales inválidas → mensaje de error visible; carga → CTA deshabilitado; éxito → `router.replace("/")` + `router.refresh()`. El panel coral y el layout de SPEC 03 no cambian.
- **Rutas públicas:** exactamente `/login` y `/activar-cuenta`. Todo lo demás (incluidas `/`, `/kids`, `/kids/[slug]` y rutas futuras) requiere sesión.
- **Protección en `utils/supabase/middleware.ts`** (`updateSession`): tras `await supabase.auth.getClaims()`, si no hay claims y la ruta no es pública → redirect a `/login`; si hay claims y la ruta es `/login` → redirect a `/`. Se devuelve siempre la respuesta que `setAll` construyó por última vez (regla de `@supabase/ssr`). `proxy.ts` no cambia.
- **Perfil real en el servidor:** helper `app/lib/auth.ts` con `getCurrentUserProfile()` — crea el server client, valida con `getClaims()`, y consulta `users` (fila propia vía RLS) con el nombre del `daycare` (join). Devuelve `{ fullName, role, daycareName }` o `null`.
- **Sidebar con identidad real** (`app/components/sidebar.tsx`): avatar con la inicial real de `full_name`, nombre real, etiqueta de rol (`staff` → "Maestra", `parent` → "Familia", `admin` → "Admin") y nombre del daycare en vez de "Sala Soles" hardcodeado. Las páginas le pasan el perfil como prop.
- **Logout real:** nuevo client component `app/components/logout-button.tsx` (`supabase.auth.signOut()` + redirect a `/login`) que reemplaza el `<Link href="/login">` del sidebar.
- **Saludo real en el feed** (`app/page.tsx`): "Buenas, {primer nombre real}" y "GUARDERÍA · {daycare real}" desde el perfil, en vez del mock `user` de `app/lib/mock-feed.ts`.
- **`/kids` y `/kids/[slug]`:** obtienen el perfil y lo pasan al Sidebar (misma fuente, sin datos extra).
- **`/activar-cuenta`:** queda pública y estática; su CTA "Activar mi cuenta" deja de navegar a `/` (pasa a botón sin acción real).
- Verificación con Playwright MCP (capturas en `.playwright-mcp/`), `npm run lint` y `npx tsc --noEmit`.

**Out of scope (para specs futuras):**

- Signup UI y flujo de invitaciones (tabla `invitations` no existe; el CTA de `/activar-cuenta` queda sin acción).
- Recuperación de contraseña ("¿Olvidaste tu contraseña?" sigue siendo texto no navegable).
- Generación de `database.types.ts` desde el MCP (los clients siguen sin tipar).
- Feed y niños con data real (tablas `posts`/`children` no existen; los mocks se mantienen).
- Protección por roles (staff vs parent): toda ruta protegida solo exige sesión, sin distinción.
- OAuth, magic links y MFA.

## Data model

Esta feature **no introduce estructuras nuevas en la base de datos**. Reusa el modelo de SPEC 07/08 (`public.daycares`, `public.users`, el trigger `on_auth_user_created` y el usuario demo `staff@demo.daycare` / `demo1234`).

Estructura derivada en la app (server-side, sin persistencia propia):

```ts
// app/lib/auth.ts
type UserProfile = {
  fullName: string; // users.full_name
  role: "staff" | "parent" | "admin"; // users.role
  daycareName: string; // daycares.name
};
// getCurrentUserProfile(): UserProfile | null
```

Etiquetas de rol para la UI: `staff` → "Maestra", `parent` → "Familia", `admin` → "Admin".

## Plan de implementación

1. Crear `app/lib/auth.ts` con `getCurrentUserProfile()`. Verificar: `npx tsc --noEmit` pasa; una llamada desde `/` devuelve el perfil del staff demo en sesión activa.
2. Actualizar `utils/supabase/middleware.ts`: listas de rutas públicas y lógica de redirect tras `getClaims()`. Verificar: sin sesión, `/` redirige a `/login`; con sesión, `/login` redirige a `/`.
3. Crear `app/components/login-form.tsx` (client) y refactorizar `app/login/page.tsx` para renderizarlo bajo el mismo panel coral. Verificar: login con `staff@demo.daycare` / `demo1234` navega a `/`; credenciales inválidas muestran error sin navegar.
4. Crear `app/components/logout-button.tsx` y actualizar `sidebar.tsx` para recibir `user: UserProfile` (avatar, nombre, rol, daycare) y usar el botón de logout. Verificar: `npx tsc --noEmit` pasa.
5. Actualizar `app/page.tsx`, `app/kids/page.tsx` y `app/kids/[slug]/page.tsx`: obtener el perfil y pasarlo al Sidebar; en `/` además usar `fullName`/`daycareName` en el saludo. Verificar: el sidebar muestra "Caro Giménez · Maestra · Guardería Sala Soles".
6. Ajustar `app/activar-cuenta/page.tsx`: el CTA deja de navegar (sin `Link`).
7. Verificación final con Playwright MCP: flujo completo (logout → `/login` → login → feed con identidad real), redirects de rutas protegidas con y sin sesión, y capturas desktop/móvil en `.playwright-mcp/`. Correr `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [x] Sin sesión, `/`, `/kids` y `/kids/[slug]` redirigen a `/login`.
- [x] Sin sesión, `/login` y `/activar-cuenta` renderizan normalmente (sin redirect).
- [x] Con sesión activa, visitar `/login` redirige a `/`.
- [x] El login con `staff@demo.daycare` / `demo1234` navega al feed y la sesión persiste al recargar.
- [x] Credenciales inválidas muestran un mensaje de error en `/login` y no navegan a ningún lado.
- [x] El CTA deshabilita durante el envío (no permite doble submit).
- [x] El saludo del feed muestra el primer nombre real (`Buenas, Caro`) y el nombre del daycare real en el header de la guardería.
- [x] El sidebar muestra avatar "C", "Caro Giménez", "Maestra · Guardería Sala Soles" (rol y daycare reales).
- [x] El botón "salir" cierra la sesión (`signOut`), limpia las cookies y redirige a `/login`.
- [x] Tras el logout, `/` redirige a `/login` (la sesión ya no existe).
- [x] El CTA "Activar mi cuenta" de `/activar-cuenta` no navega.
- [x] La protección corre en el proxy sin consultas a la DB (solo cookies/claims).
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** login como client component con el browser client y `signInWithPassword` — patrón oficial de Supabase para Next.js App Router; el server client queda para lectura de perfil.
- **Sí:** redirect optimista en `proxy.ts`/`updateSession` + verificación con `getClaims()` — patrón del guide de Next.js 16; el proxy corre en cada request (incl. prefetch), así que solo lee cookies/claims, nunca la DB.
- **Sí:** `getClaims()` (valida firma del JWT) y no `getSession()` — regla del proyecto; `getSession()` lee la cookie sin validarla.
- **Sí:** devolver siempre la respuesta que `setAll` construyó — evita desincronizar cookies y cerrar sesiones prematuramente (documentación `@supabase/ssr`).
- **Sí:** rutas públicas exactas `/login` y `/activar-cuenta`; todo lo demás protegido — decisión del usuario; rutas nuevas quedan protegidas por defecto.
- **Sí:** usuario autenticado en `/login` → redirect a `/` — decisión del usuario.
- **Sí:** logout real con `signOut()` — decisión del usuario.
- **Sí:** `/activar-cuenta` pública y estática, CTA sin acción — decisión del usuario; la lógica de invitación va en su propia spec.
- **Sí:** sidebar recibe el perfil como prop desde cada página — evita 3 fetches duplicados si el Sidebar fuera async por su cuenta.
- **Sí:** mapeo de rol a etiqueta en español (`staff`→"Maestra", `parent`→"Familia", `admin`→"Admin") — los datos persisten en inglés (SPEC 08), las etiquetas se traducen en la UI.
- **No:** generación de `database.types.ts` — decisión del usuario; se difiere.
- **No:** protección por roles, feed/niños reales, signup e invitaciones — fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `setAll` en Server Components no puede escribir cookies | `updateSession` (proxy) refresca la sesión en cada request; el helper de perfil solo lee. |
| Redirigir con una respuesta que no lleva las cookies refrescadas cierra la sesión | El redirect se construye sobre la respuesta que `setAll` devolvió por última vez; regla documentada de `@supabase/ssr`. |
| El proxy corre en cada request y en prefetches | Solo checks optimistas con cookies/claims, sin consultas a la DB. |
| `cacheComponents: true` interacciona con la lectura de cookies en páginas | Leer el perfil vía `await cookies()`/server client hace la página dinámica; se verifica que `npm run build` no falle. |
| RLS: el select del perfil depende de la policy `users_select_own` | Ya verificada en SPEC 08; el staff demo la cumple. |
| Feed/niños siguen con mocks tras el login | Aceptado por scope; solo la identidad (sidebar/saludo) es real. |

## Lo que **no** está en esta spec

- Signup, invitaciones y activación real de cuentas.
- Recuperación de contraseña.
- Tipos TypeScript generados desde la DB.
- Feed y niños con data real (posts/children).
- Protección por roles, OAuth, magic links y MFA.

Cada una de esas piezas, si llega, va en su propia spec.
