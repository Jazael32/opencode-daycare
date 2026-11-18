# SPEC 04 — Modal Agregar niño en `/kids`

> **Estado:** Implementado
> **Depende on:** SPEC 02
> **Fecha:** 2026-11-17
> **Objetivo:** Implementar el modal de `references/pantallas/agregar-nino.dc.html` que abre el botón "Agregar niño" de `/kids`, con Nombre completo, Fecha de nacimiento y Sala obligatorios (dropdown mock de Soles/Lunas/Estrellas), validación inline y persistencia en localStorage integrada al listado y al perfil.

## Scope

**In:**

- El botón "Agregar niño" del header de `/kids` (hoy `<Link href="/">`) pasa a ser un botón que abre el **modal** del mockup como overlay, sin navegación.
- Modal fiel al mockup: card `max-w-[520px]` fondo `#FBF4EC`, radio 24px, header con "Cancelar" (`#94887B`) a la izquierda, título Fredoka "Agregar niño" al centro y "Guardar" (`#D9583C`) a la derecha.
- Campos con labels y placeholders exactos del mockup:
  - NOMBRE COMPLETO — placeholder `Ej. Martina López` — **obligatorio**
  - FECHA DE NACIMIENTO — placeholder `dd/mm/aaaa` (input de texto) — **obligatorio, formato validado**
  - SALA — dropdown custom con chevron, placeholder `Seleccionar sala`, opciones `Soles`, `Lunas`, `Estrellas` — **obligatorio**
  - ALERGIAS (ETIQUETAS) — placeholder `Ej. Maní, Lactosa` — opcional
  - NOTAS MÉDICAS — textarea placeholder `Indicaciones, medicación, contactos…` — opcional
- Validación inline por campo al pulsar "Guardar" con datos incompletos: mensaje rojo bajo cada campo faltante; el modal no se cierra. Fecha exige formato `dd/mm/aaaa` con fecha real y no futura.
- Cierre sin guardar: "Cancelar", clic fuera del card y tecla Esc. Autofocus en NOMBRE COMPLETO al abrir.
- "Guardar" válido: crea un `Kid`, lo persiste en localStorage (`od-kids:v1`) y cierra el modal; el niño aparece de inmediato en la grilla.
- Listado `/kids` con **secciones dinámicas por sala**: separador "SALA {SALA} · n niños" generado en orden Soles → Lunas → Estrellas, mostrando solo salas con niños. Sin niños nuevos, la vista es idéntica a la actual (SALA SOLES · 8 niños).
- Grilla sobre la **lista mezclada** (mock + localStorage); el buscador filtra la lista completa (misma normalización de SPEC 02).
- Perfil `/kids/[slug]` con **búsqueda híbrida**: el server component busca en el mock como hoy; si no encuentra, renderiza un client component que busca en localStorage; si tampoco existe, redirige a `/kids`.
- Adaptación móvil del modal (card a ancho completo con margen) siguiendo la convención de SPEC 01-03.

**Out of scope (para specs futuras):**

- Autenticación, base de datos y backend: localStorage es la única persistencia.
- Pantalla "Editar niño" y su botón (sigue apuntando a `/`).
- Subida de foto/avatar real (el nuevo niño usa avatar con inicial).
- Vincular padres desde el modal o el listado (`parents: []` fijo → pill VINCULAR).
- Gestión/CRUD de salas: las 3 salas son una constante mock.
- Borrar o editar niños guardados.
- Modo oscuro y paridad pixel en móvil.

## Data model

Extensión de `app/lib/mock-kids.ts`:

```ts
export const ROOMS = ["Soles", "Lunas", "Estrellas"] as const;
export type Room = (typeof ROOMS)[number];

// Paleta extraída de los avatares existentes, para rotación en niños nuevos
export const AVATAR_PALETTE: { bg: string; fg: string }[];
```

Nuevo `app/lib/kid-storage.ts` (capa de persistencia, solo client):

```ts
const STORAGE_KEY = "od-kids:v1"; // versión para migrar sin romper

export interface NewKidDraft {
  name: string;         // "Martina López" — trimado, no vacío
  birthDate: string;    // ISO "2023-03-12" — parseado de dd/mm/aaaa
  room: Room;           // una de ROOMS
  allergies: string;    // "Maní, Lactosa" — crudo del input, "" si vacío
  medicalNotes: string; // crudo del textarea, "" si vacío
}

export function getStoredKids(): Kid[];                 // [] si no hay clave o en SSR
export function getStoredKidBySlug(slug: string): Kid | undefined;
export function saveNewKid(draft: NewKidDraft): Kid;    // valida, persiste y devuelve el Kid completo
```

Reglas de derivación de `saveNewKid` (no las pide el modal):

- `slug`: kebab-case del nombre; si colisiona con el mock o con los guardados, sufijo `-2`, `-3`…
- `initial`: primera letra del nombre en mayúscula.
- `avatarColors`: `AVATAR_PALETTE[storedCount % AVATAR_PALETTE.length]` (rotación).
- `enrolled`: mes actual formateado como el mock ("nov 2026" vía `Intl`).
- `parents: []` → la tarjeta muestra el pill `VINCULAR`.
- `allergy`: si `allergies` no está vacío → `allergy: { label: "MANÍ, LACTOSA" (tags en mayúscula), notes: medicalNotes }`; si está vacío → `undefined` (la caja del perfil es condicional, como hoy).

## Plan de implementación

1. Extender `app/lib/mock-kids.ts`: exportar `ROOMS`, `Room` y `AVATAR_PALETTE` (colores ya usados por los 8 niños). Verificar: `npx tsc --noEmit` pasa y nada de lo existente cambia.
2. Crear `app/lib/kid-storage.ts` con `NewKidDraft`, la clave `od-kids:v1`, parseo `dd/mm/aaaa` → ISO (con rechazo de fechas inválidas/futuras), generación de slug con sufijo anti-colisión, derivación de defaults y las tres funciones. Verificar: `npx tsc --noEmit`.
3. Crear `app/components/add-kid-modal.tsx` (client): overlay + card del mockup, 5 campos con placeholders, dropdown de sala custom (placeholder "Seleccionar sala"), validación inline por campo y cierre por Cancelar/Esc/clic fuera. Verificar en `/kids` tras el paso 4.
4. Cablear `app/kids/page.tsx`: el `<Link>` "Agregar niño" pasa a ser botón dentro de un wrapper client que renderiza el modal; al guardar, notifica a la grilla con la lista actualizada. Verificar: el modal abre desde el botón y Guardar cierra y refresca la grilla.
5. Refactor de `app/components/kids-grid.tsx`: recibe la lista mezclada (mock + `getStoredKids()`, arrancando solo con mock para cuadrar con el server y actualizando tras el mount) y renderiza el separador "SALA X · n niños" por sala en orden `ROOMS`, omitiendo salas vacías; el buscador filtra la lista completa. Verificar: sin niños guardados la vista es idéntica a hoy.
6. Perfil híbrido: extraer la presentación del perfil a `app/components/kid-profile.tsx`; `app/kids/[slug]/page.tsx` la usa si `getKidBySlug` (mock) acierta; si no, renderiza `app/components/stored-kid-profile.tsx` (client) que busca en localStorage y redirige a `/kids` si tampoco existe. Verificar: `/kids/mateo-fernandez` idéntico a hoy; un niño nuevo navega a su perfil; un slug desconocido redirige.
7. Verificación con Playwright MCP: capturas desktop (1440px) y móvil (390px) de `/kids` con modal cerrado/abierto, con errores de validación y con un niño guardado (Soles y Lunas), en `.playwright-mcp/`, comparadas contra `references/pantallas/agregar-nino.dc.html` y `ninos.dc.html`. Confirmar `npm run lint` y `npx tsc --noEmit` sin errores.

## Criterios de aceptación

- [x] Click en "Agregar niño" en `/kids` abre el modal **sin navegar**; click en "Cancelar", fuera del card o Esc lo cierra sin guardar.
- [x] El modal reproduce el mockup: header Cancelar / "Agregar niño" / Guardar, card `#FBF4EC` radio 24px `max-w-[520px]`, y los 5 campos con los placeholders `Ej. Martina López`, `dd/mm/aaaa`, `Seleccionar sala`, `Ej. Maní, Lactosa`, `Indicaciones, medicación, contactos…`.
- [x] El dropdown SALA muestra exactamente Soles, Lunas y Estrellas e inicia en "Seleccionar sala".
- [x] "Guardar" con Nombre, Fecha o Sala vacíos muestra error inline en cada campo faltante y no cierra el modal.
- [x] "Guardar" con fecha en formato incorrecto o fecha futura muestra error inline y no cierra el modal.
- [x] "Guardar" válido persiste el niño en `od-kids:v1` y el modal se cierra; el niño aparece en `/kids` en la sección de su sala, con avatar de inicial, subtítulo "n años · sin padres vinculados" y pill VINCULAR.
- [x] Recargar la página conserva el niño guardado y la sección "SALA SOLES · 8 niños" se mantiene cuando no hay niños nuevos.
- [x] Un niño guardado en Lunas genera la sección "SALA LUNAS · 1 niño" (y ninguna sección para salas vacías).
- [x] El buscador filtra la lista mezclada (mock + guardados), insensible a acentos/mayúsculas.
- [x] La tarjeta de un niño nuevo navega a `/kids/[slug]` y su perfil muestra: edad calculada, Sala, ingreso del mes actual, caja "Alergias y notas" solo si cargó alergias (etiquetas en mayúscula + notas médicas).
- [x] Los 8 perfiles mock y el redirect de slug desconocido a `/kids` siguen funcionando sin cambios.
- [x] En móvil (390px) el modal ocupa el ancho y el listado mantiene barra inferior con Niños activo.
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** modal overlay sobre `/kids` en vez de ruta propia — decisión del usuario (SPEC 02 lo dejaba como enlace a `/`).
- **Sí:** persistencia en localStorage con clave versionada `od-kids:v1` — decisión del usuario; primera persistencia del proyecto, versionada para migrar esquemas sin romper.
- **Sí:** validación inline por campo — decisión del usuario sobre mensaje general o botón deshabilitado.
- **Sí:** salas mock `Soles, Lunas, Estrellas` y placeholder "Seleccionar sala" (no preseleccionada) — decisión del usuario; Soles es la sala existente del mockup.
- **Sí:** secciones dinámicas por sala en `/kids` — decisión del usuario sobre una grilla mezclada.
- **Sí:** input de fecha como texto con placeholder `dd/mm/aaaa` y validación de formato — decisión del usuario (respeta el mockup en vez de `type="date"` nativo); se rechazan fechas inválidas y futuras.
- **Sí:** defaults derivados (inicial del nombre, paleta rotativa, ingreso del mes actual, `parents: []`) — decisión del usuario.
- **Sí:** perfil híbrido server→client para que los niños de localStorage tengan perfil manteniendo el prerender del mock — decisión del usuario.
- **Sí:** etiquetas de alergia en mayúsculas + notas médicas como texto de la caja — decisión del usuario; sin alergias, la caja no se muestra.
- **Sí:** sufijo `-2`, `-3`… en el slug ante colisión de nombres (p. ej. otro "Mateo Fernández").
- **No:** IndexedDB o backend — sobredimensionado para mock data.
- **No:** editar/borrar niños guardados, CRUD de salas, subida de fotos y vincular padres — fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Hydration mismatch: la grilla server-render no conoce localStorage | El estado inicial de la grilla es solo el mock (idéntico al server); se mezclan los guardados en un `useEffect` tras el mount. |
| localStorage deshabilitado o corrupto | `getStoredKids()` devuelve `[]` ante cualquier fallo; la app degrada a la vista actual de SPEC 02 y el modal sigue funcionando (sin persistencia). |
| Paridad visual con `cacheComponents: true` + overlay client | El modal es client component puro; la página server no cambia su estrategia de cache. Verificar en `node_modules/next/dist/docs/` si surgen advertencias. |
| "Idéntico" es un juicio visual | Captura Playwright a 1440px comparada lado a lado contra `agregar-nino.dc.html`; no diff de píxeles. |

## Lo que **no** está en esta spec

- Autenticación y base de datos.
- Editar o borrar niños guardados.
- CRUD de salas y vinculación de padres.
- Subida de fotos reales.
- Modo oscuro y paridad pixel en móvil.

Cada una de esas piezas, si llega, va en su propia spec.
