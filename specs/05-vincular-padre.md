# SPEC 05 — Vincular padre desde el perfil y activación en `/activar-cuenta`

> **Estado:** Aprobado
> **Depende on:** SPEC 02, SPEC 03, SPEC 04
> **Fecha:** 2026-11-18
> **Objetivo:** Implementar el modal de `references/pantallas/vincular-padre.dc.html` que abre el botón "Vincular otro padre" de `/kids/[slug]`, persistiendo la invitación (nombre, email, parentesco y código de 5 caracteres que vence en 7 días) en localStorage, y usar esas invitaciones como base de `/activar-cuenta` (caja dinámica, prefill de email y validación de código que marca al padre como activa).

## Scope

**In:**

- El botón "Vincular otro padre" de la caja PADRES VINCULADOS del perfil (hoy `<Link href="/">`) pasa a ser un botón que abre el **modal** del mockup como overlay, sin navegación (patrón de SPEC 04).
- Modal fiel al mockup: card `max-w-[480px]` fondo `#FBF4EC`, radio 24px, header con título Fredoka "Vincular padre", subtítulo "a {nombre del niño}" y botón X que cierra.
- Caja informativa azul `#E3ECFB`: "Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de {nombre del niño}." (el nombre del mockup, "Mateo", se vuelve dinámico).
- Campos con labels y placeholders exactos del mockup:
  - NOMBRE DEL PADRE/MADRE — placeholder `Ej. Diego Fernández` — **obligatorio**
  - EMAIL — placeholder `correo@ejemplo.com` — **obligatorio, formato email validado**
  - PARENTESCO — pills `Mamá` / `Papá` / `Tutor/a` con **Mamá preseleccionada** (estilo activo del mockup); un click cambia la selección.
- Caja CÓDIGO DE INVITACIÓN (fondo `#FBF1D6`, borde dashed `#E6D08A`): muestra un **código aleatorio de 5 caracteres** generado al abrir el modal y el texto "Vence en 7 días".
- Cierre sin guardar: botón X, tecla Esc y clic fuera del card.
- "Enviar invitación" valida inline (mismo estilo que SPEC 04): nombre vacío, email con formato inválido o email ya vinculado/pendiente para ese niño muestran error rojo bajo el campo y el modal no se cierra.
- Envío válido: persiste la invitación en la clave nueva `od-parent-links:v1`, cierra el modal y el padre aparece de inmediato en PADRES VINCULADOS con avatar de inicial, parentesco y pill **PENDIENTE** ("invitación enviada"), usando el modelo `Parent` existente.
- La vinculación funciona igual desde un perfil mock (ej. `/kids/mateo-fernandez`) que desde uno creado con Agregar niño.
- `/activar-cuenta` pasa a alimentarse de las invitaciones guardadas:
  - La caja de invitación **sigue al código tipeado**: al cambiar el campo CÓDIGO, si el valor coincide (insensible a mayúsculas, trimado) con una invitación pendiente, la caja muestra "Te invitaron a seguir a {niño} · Sala {sala}" y el campo EMAIL se precarga con el email de esa invitación.
  - Sin coincidencia o sin invitaciones guardadas, la caja muestra el texto estático de SPEC 03 ("Mateo · Sala Soles").
  - "Activar mi cuenta" valida código+email contra las invitaciones: si coinciden y el código no venció, la invitación pasa a `status: "active"` (código consumido, no reutilizable) y navega a `/`; si no coinciden o venció, muestra error inline bajo el formulario y no navega.
- Tras una activación exitosa, el perfil muestra al padre con la pill **ACTIVA** (verde).
- Adaptación móvil del modal (card a ancho completo con margen) siguiendo la convención de SPEC 01-04.

**Out of scope (para specs futuras):**

- Envío real de correo y backend: localStorage es la única persistencia.
- Gestión de padres: editar, desvincular, borrar o reenviar invitación.
- Autenticación y sesión reales: "Activar mi cuenta" sigue navegando a `/` sin login (SPEC 03 intacta en eso).
- Pantalla `familia-feed.dc.html` (el feed que "solo verá" el padre no existe).
- Regenerar códigos vencidos o notificar vencimientos en el perfil; una invitación vencida sigue mostrándose como pendiente y solo se rechaza al activar.
- Modo oscuro y paridad pixel en móvil.

## Data model

Nuevo `app/lib/parent-links.ts` (capa de persistencia, solo client, espejo de `app/lib/kid-storage.ts`):

```ts
const STORAGE_KEY = "od-parent-links:v1"; // versión para migrar sin romper

export const RELATIONS = ["Mamá", "Papá", "Tutor/a"] as const;
export type Relation = (typeof RELATIONS)[number];

export interface ParentLink {
  kidSlug: string;    // "mateo-fernandez" — mock o guardado
  name: string;       // "Diego Fernández" — trimado, no vacío
  email: string;      // minúsculas, trimado
  relation: Relation; // una de RELATIONS
  code: string;       // "7K4P9" — 5 chars de un alfabeto sin ambiguos (sin 0/O/1/I)
  createdAt: string;  // ISO — vence a createdAt + 7 días
  status: "pending" | "active";
}
```

Funciones:

```ts
export function getParentLinks(kidSlug: string): ParentLink[];            // [] si no hay clave o en SSR
export function saveParentLink(kidSlug: string, draft): ParentLink;      // valida duplicado, genera código, persiste
export function findPendingByCode(code: string): ParentLink | undefined; // alimenta la caja de /activar-cuenta
export function activateParentLink(code: string, email: string): ParentLink | null; // valida y marca active
```

Reglas:

- **Generación de código:** 5 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `0/O/1/I`); se reintenta hasta no colisionar con otra invitación pendiente no vencida (la caja de `/activar-cuenta` sigue al código, así que los pendientes deben ser distinguibles).
- **Duplicado:** `saveParentLink` rechaza (lanza) si ya existe una invitación con el mismo email para el mismo `kidSlug`, sin importar su estado.
- **Vencimiento:** una invitación vence a `createdAt + 7 días`; `findPendingByCode` y `activateParentLink` ignoran invitaciones vencidas.
- **Activación:** `activateParentLink(code, email)` exige que código y email pertenezcan a la **misma** invitación pendiente no vencida; al validar, cambia `status` a `"active"`.
- **Avatar del padre nuevo:** inicial del nombre + colores de `AVATAR_PALETTE` por rotación (convención de SPEC 04).
- Evento `od-parent-links-updated` + suscripción estilo `subscribeToKids` para que el perfil se refresque tras guardar/activar sin recargar.

Extensión de `app/components/kid-profile-view.tsx`: la caja PADRES VINCULADOS se extrae a `app/components/linked-parents.tsx` (client) que mezcla `kid.parents` (mock) con `getParentLinks(kid.slug)` (guardados).

## Plan de implementación

1. Crear `app/lib/parent-links.ts`: tipos, clave `od-parent-links:v1`, alfabeto y generación de código con reintento anti-colisión, las cuatro funciones, evento de actualización y suscripción. Verificar: `npx tsc --noEmit` pasa y nada de lo existente cambia.
2. Crear `app/components/link-parent-modal.tsx` (client): overlay + card del mockup (header con subtítulo "a {kid.name}", caja informativa con nombre dinámico, dos inputs, tres pills con Mamá activa, caja de código con "Vence en 7 días"), validación inline por campo y cierre por X/Esc/clic fuera. El código se genera al abrir. Verificar en el perfil tras el paso 3.
3. Extraer la caja PADRES VINCULADOS de `app/components/kid-profile-view.tsx` a `app/components/linked-parents.tsx` (client): lista mezclada mock + guardados, pill según estado, botón "Vincular otro padre" que abre el modal; al guardar, muestra el padre nuevo como pendiente sin recargar. Verificar: `/kids/mateo-fernandez` idéntico a hoy con el modal cerrado.
4. Cablear `app/components/kid-profile-view.tsx` para renderizar `LinkedParents` en la columna derecha (tanto desde la página server como desde `stored-kid-profile`). Verificar: el botón abre el modal en un perfil mock y en uno de Agregar niño; guardar agrega "invitación enviada" y persiste tras recargar.
5. Actualizar `app/activar-cuenta/page.tsx`: estado local para código y email; la caja de invitación se actualiza al cambiar el campo CÓDIGO (`findPendingByCode`) con prefill del email; sin coincidencia muestra el estático de SPEC 03; "Activar mi cuenta" llama `activateParentLink` — error inline si código/email no coinciden o venció, navegación a `/` si valida. Verificar el flujo completo: vincular → activar → pill ACTIVA en el perfil.
6. Verificación con Playwright MCP: capturas desktop (1440px) y móvil (390px) del perfil con modal cerrado/abierto, con errores de validación, con padre pendiente y de `/activar-cuenta` con caja dinámica, en `.playwright-mcp/`, comparadas contra `references/pantallas/vincular-padre.dc.html` y `activar-cuenta.dc.html`. Confirmar `npm run lint` y `npx tsc --noEmit` sin errores.

## Criterios de aceptación

- [ ] Click en "Vincular otro padre" en `/kids/[slug]` abre el modal **sin navegar**; X, Esc y clic fuera lo cierran sin guardar.
- [ ] El modal reproduce el mockup: header "Vincular padre" + "a {nombre}", caja informativa azul, campos con los placeholders `Ej. Diego Fernández` y `correo@ejemplo.com`, pills Mamá/Papá/Tutor/a con Mamá en estilo activo, caja de código con fondo `#FBF1D6` borde dashed y "Vence en 7 días".
- [ ] Cada vez que el modal se abre se genera un código nuevo de 5 caracteres (distinguible del anterior).
- [ ] "Enviar invitación" con nombre vacío muestra error inline y no cierra el modal.
- [ ] "Enviar invitación" con email de formato inválido muestra error inline y no cierra el modal.
- [ ] "Enviar invitación" con un email ya vinculado/pendiente para ese niño muestra error inline y no guarda nada.
- [ ] Un envío válido cierra el modal y el padre aparece en PADRES VINCULADOS con avatar de inicial, parentesco y pill PENDIENTE ("invitación enviada").
- [ ] El padre vinculado persiste tras recargar en `od-parent-links:v1`, tanto en un perfil mock como en uno creado con Agregar niño.
- [ ] Sin padres guardados, el perfil es idéntico al actual de SPEC 02/04.
- [ ] En `/activar-cuenta`, tipear un código pendiente actualiza la caja a "Te invitaron a seguir a {niño} · Sala {sala}" y precarga el email de esa invitación; vaciarlo o tipear un código desconocido vuelve a la caja estática "Mateo · Sala Soles".
- [ ] "Activar mi cuenta" con código+email de una invitación pendiente no vencida navega a `/`.
- [ ] "Activar mi cuenta" con código inexistente, email que no corresponde a esa invitación, o invitación vencida muestra error inline y no navega.
- [ ] Tras una activación exitosa, el mismo código no vuelve a validar (quedó consumido) y el perfil muestra al padre con pill ACTIVA.
- [ ] Sin invitaciones guardadas, `/activar-cuenta` se comporta exactamente como SPEC 03 (caja estática, checkbox, navegación).
- [ ] En móvil (390px) el modal ocupa el ancho y el perfil mantiene su layout.
- [ ] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** modal overlay sobre el perfil en vez de ruta propia — decisión del usuario; replica el patrón de SPEC 04.
- **Sí:** clave nueva `od-parent-links:v1` mapeada por `kidSlug` — decisión del usuario; funciona igual para los 8 niños mock (que viven en código) y para los guardados en `od-kids:v1`, sin duplicar niños.
- **Sí:** código aleatorio de 5 caracteres con alfabeto sin ambiguos, vencimiento a 7 días desde `createdAt` — decisión del usuario; el "Vence en 7 días" del mockup pasa de decorativo a real.
- **Sí:** Mamá preseleccionada en PARENTESCO, como muestra el mockup — decisión del usuario.
- **Sí:** validación inline por campo (mismo estilo que SPEC 04) — decisión del usuario sobre botón deshabilitado.
- **Sí:** email duplicado por niño bloqueado con error inline — decisión del usuario.
- **Sí:** la caja de `/activar-cuenta` sigue al código tipeado (insensible a mayúsculas) con prefill de email, y cae al texto estático de SPEC 03 sin coincidencia — decisión del usuario; así múltiples invitaciones son distinguibles.
- **Sí:** la activación consume el código (status `"active"`) y el perfil muestra la pill ACTIVA — decisión del usuario; cierra el ciclo vincular → activar.
- **Sí:** avatar del padre nuevo con inicial + `AVATAR_PALETTE` rotativa — convención tomada de SPEC 04.
- **Sí:** una invitación vencida sigue viéndose pendiente en el perfil; solo se rechaza al activar — simplificación explícita (la gestión de vencimientos queda fuera).
- **No:** envío real de email, backend y autenticación — sin base de datos, decisión del usuario.
- **No:** editar/desvincular padres, reenviar o regenerar códigos, `familia-feed.dc.html` — fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Hydration mismatch en `/activar-cuenta`: el server no conoce localStorage | La caja renderiza el estático de SPEC 03 en el primer paint; la búsqueda de invitaciones ocurre solo en handlers de cambio/submit (client). |
| Códigos que colisionan entre invitaciones pendientes | Regeneración con reintento contra los códigos pendientes no vencidos. |
| localStorage deshabilitado o corrupto | `getParentLinks()` devuelve `[]` ante cualquier fallo; el modal funciona pero no persiste y `/activar-cuenta` degrada a SPEC 03. |
| El texto "Solo verá el feed de {nombre}" promete una pantalla que no existe | Copiado tal cual del mockup; `familia-feed` queda registrado como fuera de alcance. |

## Lo que **no** está en esta spec

- Envío de correo real y backend.
- Autenticación y sesión reales.
- Editar, desvincular o reenviar invitaciones.
- Pantalla familia-feed.
- Gestión de vencimientos en el perfil.

Cada una de esas piezas, si llega, va en su propia spec.
