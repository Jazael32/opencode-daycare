# SPEC 02 — Listado y perfil de Niños (`/kids`)

> **Estado:** Implementado
> **Depende on:** SPEC 01
> **Fecha:** 2026-11-17
> **Objetivo:** Implementar las pantallas `references/pantallas/ninos.dc.html` (ruta `/kids`) y `references/pantallas/perfil-nino.dc.html` (ruta `/kids/[slug]`) con datos mock para los 8 niños, navegación desde el sidebar/barra inferior y buscador funcional.

## Scope

**In:**

- Ruta `/kids` renderizando el listado del mockup: header "GESTIÓN / Niños" con botón "Agregar niño", buscador "Buscar niño…", separador "SALA SOLES · 8 niños" (contador derivado del mock data) y grilla de 2 columnas (desktop) con las 8 tarjetas de niño.
- Ruta `/kids/[slug]` renderizando el perfil del mockup: enlace "Volver a Niños", cabecera con avatar/nombre/edad/sala y botón "Editar", caja de "Alergias y notas" (solo si el niño tiene alergia), tarjeta de datos (Fecha de nacimiento, Sala, Ingreso), botón "Resumen del día" y tarjeta "PADRES VINCULADOS" con enlace "Vincular otro padre".
- Refactor de `app/components/sidebar.tsx` y `app/components/bottom-nav.tsx` para recibir una prop `active` (`"feed" | "kids" | "avisos" | "cuenta"`); el ítem Niños pasa a apuntar a `/kids` y se destaca en estas pantallas; Feed sigue activo en `/`.
- Buscador funcional en `/kids`: filtro client-side por nombre, case-insensitive e insensible a acentos, con estado vacío "Sin resultados" cuando ningún nombre coincide.
- Datos mock tipados en `app/lib/mock-kids.ts` para los 8 niños del mockup, con datos de perfil plausibles y completos para todos.
- Edad calculada dinámicamente desde la fecha de nacimiento (ISO); fechas del mock data ajustadas para que la edad mostrada hoy coincida con el mockup ("3 años" / "2 años").
- Slug inválido en `/kids/[slug]`: redirección a `/kids` (nunca 404).
- Adaptación móvil con el patrón de SPEC 01: sidebar oculto en `<lg`, barra inferior con Niños activo, tarjetas apiladas en 1 columna.

**Out of scope (para specs futuras):**

- Autenticación y base de datos (decisión explícita del usuario).
- Pantallas Agregar niño, Editar, Resumen del día, Vincular padre y Nueva publicación — sus enlaces apuntan a `/` (convención de SPEC 01).
- Interactividad de vincular/desvincular padres, editar niño y crear niño.
- Fotos reales (avatares circulares con inicial, como en el mockup).
- Paridad pixel en móvil: la paridad exacta aplica solo a desktop; móvil es adaptación.

## Data model

Nuevo archivo `app/lib/mock-kids.ts`:

```ts
export type ParentStatus = "active" | "pending";

export interface Parent {
  name: string;          // "Lucía Fernández"
  initial: string;       // "L" — avatar circular con letra
  relation: string;      // "Mamá" | "Papá"
  status: ParentStatus;  // "activa" | "invitación enviada"
  avatarColors: { bg: string; fg: string }; // p.ej. #C9B6E8 / #fff
}

export interface Kid {
  slug: string;          // "mateo-fernandez" — kebab-case del nombre
  name: string;          // "Mateo Fernández"
  initial: string;       // "M"
  birthDate: string;     // ISO "2023-03-12" — edad calculada, no guardada
  room: string;          // "Soles"
  enrolled: string;      // "feb 2025" — string de display
  allergy?: { label: string; notes: string }; // { label: "MANÍ", notes: "Alergia al maní. Evitar frutos secos…" }
  avatarColors: { bg: string; fg: string }; // p.ej. #A9D9E8 / #1F7A93
  parents: Parent[];
}

export const kids: Kid[] = [ /* 8 niños del mockup, ver abajo */ ];
export function getKidBySlug(slug: string): Kid | undefined;
```

Los 8 niños del mockup (nombre · edad del mockup · padres · pill):

| Slug | Nombre | Edad | Padres | Pill derecha |
| --- | --- | --- | --- | --- |
| `mateo-fernandez` | Mateo Fernández | 3 años | 2 (1 activa, 1 pendiente) | MANÍ |
| `sofia-mendez` | Sofía Méndez | 2 años | 1 activa | chevron |
| `benjamin-ruiz` | Benjamín Ruiz | 3 años | 2 activas | chevron |
| `valentina-soto` | Valentina Soto | 2 años | 0 | VINCULAR |
| `tomas-diaz` | Tomás Díaz | 3 años | 1 activa | LACTOSA |
| `emma-castro` | Emma Castro | 2 años | 1 activa | chevron |
| `lucas-romero` | Lucas Romero | 3 años | 1 activa | chevron |
| `olivia-vega` | Olivia Vega | 2 años | 1 activa | chevron |

Reglas de derivación (no se guardan, se calculan):

- **Pill de tarjeta:** alergia si existe (`MANÍ`/`LACTOSA`, fondo `#FBD8CC` texto `#D9684A`); si no, `VINCULAR` (`#F9D2DE`/`#C56486`) cuando `parents.length === 0`; si no, chevron neutro.
- **Subtítulo de tarjeta:** `${edad} años · ${n} padres vinculados` con pluralización ("1 padre vinculado", "sin padres vinculados").
- **Edad:** helper que calcula años cumplidos desde `birthDate` al día de hoy. Las fechas de nacimiento se eligen para que la edad mostrada hoy coincida con el mockup: 3 años → nacidos entre nov 2022 y nov 2023 (Mateo: `2023-03-12`); 2 años → entre nov 2023 y nov 2024.
- **Formato de fecha:** "12 mar 2023" vía `Intl.DateTimeFormat("es", { day: "numeric", month: "short" })`.
- **Padres en perfil:** etiqueta `ACTIVA` (`#CFEBD8`/`#3E9B6C`) o `PENDIENTE` (`#F7E7A6`/`#9A7B1E`) según `status`.

## Plan de implementación

1. Crear `app/lib/mock-kids.ts` con los tipos, los 8 niños (datos de perfil completos y plausibles: fechas ajustadas, notas de alergia, padres, ingreso) y los helpers `getKidBySlug`, cálculo de edad y formato de fecha. Verificar: `npx tsc --noEmit` pasa.
2. Refactorizar `app/components/sidebar.tsx` y `app/components/bottom-nav.tsx`: prop `active` con valor por defecto `"feed"`; ítem Niños → `/kids`. Actualizar `app/page.tsx` sin cambios funcionales (usa el default). Verificar: `/` se ve exactamente igual que antes (Feed activo, resto a `/`).
3. Crear `app/components/kids-grid.tsx` (client component): recibe `kids`, maneja el estado del input de búsqueda y filtra por nombre (normalizando con `NFD` + `toLocaleLowerCase` y quitando diacríticos); renderiza la grilla responsiva (2 columnas `sm:`, 1 en móvil) y el estado vacío "Sin resultados".
4. Crear `app/kids/page.tsx`: layout con `<Sidebar active="kids" />` (oculto `<lg`), header con "Agregar niño" (→ `/`), separador con contador `kids.length`, `<KidsGrid kids={kids} />` y `<BottomNav active="kids" />`.
5. Crear `app/kids/[slug]/page.tsx`: `getKidBySlug` → si no existe, `redirect("/kids")`; si existe, renderizar perfil (caja de alergia condicional, tarjeta de datos, padres con etiquetas, botones "Resumen del día"/"Editar"/"Vincular otro padre"/"Volver a Niños" según rutas definidas). Verificar: `/kids/mateo-fernandez` y un slug inexistente.
6. Verificación visual con Playwright MCP: capturas desktop (1440px) y móvil (390px) de `/kids` y `/kids/mateo-fernandez` en `.playwright-mcp/`, comparadas contra `references/pantallas/ninos.dc.html` y `perfil-nino.dc.html` (y sus screenshots en `references/screenshots/` si existen).

## Criterios de aceptación

- [x] `/kids` renderiza sin errores de consola las 8 tarjetas en el orden del mockup: Mateo Fernández, Sofía Méndez, Benjamín Ruiz, Valentina Soto, Tomás Díaz, Emma Castro, Lucas Romero, Olivia Vega.
- [x] Las tarjetas muestran las pills correctas: MANÍ (Mateo), LACTOSA (Tomás), VINCULAR (Valentina) y chevron en las demás.
- [x] Los subtítulos muestran: "3 años · 2 padres vinculados", "2 años · 1 padre vinculado", "2 años · sin padres vinculados", según cada niño.
- [x] La edad mostrada se calcula desde `birthDate` y hoy coincide con el mockup ("3 años" / "2 años").
- [x] El buscador filtra por nombre ignorando mayúsculas y acentos (escribir "sofia" encuentra a "Sofía Méndez"), y sin coincidencias muestra "Sin resultados".
- [x] Click en cualquier tarjeta navega a `/kids/[slug]` con el slug kebab-case del niño.
- [x] `/kids/mateo-fernandez` muestra: avatar 84px con "M", caja "Alergias y notas" con el texto del mockup, tarjeta de datos (fecha de nacimiento, Sala Soles, ingreso), y 2 padres vinculados (Lucía ACTIVA, Diego PENDIENTE).
- [x] Un slug inexistente (p.ej. `/kids/pepe`) redirige a `/kids`.
- [x] En `/kids` y `/kids/[slug]` el ítem Niños del sidebar y de la barra inferior está activo (fondo `#FBE3D8`, texto `#D9583C`); en `/` sigue activo Feed.
- [x] Los enlaces Agregar niño, Editar, Resumen del día, Vincular otro padre y Nueva publicación apuntan a `/`.
- [x] En móvil (390px): sidebar oculto, barra inferior con Niños activo, tarjetas en 1 columna.
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** refactor del sidebar/barra inferior con prop `active` — reutiliza los componentes de SPEC 01 en vez de duplicarlos.
- **Sí:** buscador funcional (filtro por nombre, insensible a acentos) — trivial con mock data y la UI ya existe en el mockup.
- **Sí:** datos completos para los 8 niños — cualquier tarjeta navega al perfil y este no puede quedar vacío.
- **Sí:** edad calculada dinámicamente desde `birthDate` ISO, con fechas ajustadas para que la edad mostrada hoy coincida con el mockup (decisión del usuario sobre strings de display).
- **Sí:** slug inválido redirige a `/kids` (decisión del usuario sobre 404).
- **Sí:** todos los enlaces a pantallas inexistentes apuntan a `/` — convención de SPEC 01 (decisión del usuario).
- **Sí:** estado vacío "Sin resultados" en el buscador — el mockup no lo define pero un grid vacío sin mensaje es un callejón sin salida.
- **No:** filtro por alergia o padres — fuera de alcance, solo nombre.
- **No:** autenticación, base de datos y páginas de Agregar/Editar/Resumen/Vincular.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La edad diverge del mockup con el paso del tiempo | Aceptado explícitamente por el usuario: la edad se calcula, no se congela. Hoy coincide con el mockup. |
| `redirect()` en una página con `cacheComponents: true` puede exigir envolver en try/catch o usar `notFound()` | Consultar `node_modules/next/dist/docs/` antes del paso 5; el redirect a `/kids` es el comportamiento requerido. |
| "Idéntico" es un juicio visual | La verificación es captura Playwright a 1440px comparada lado a lado contra el mockup — no un diff de píxeles automatizado. |

## Lo que **no** está en esta spec

- Autenticación y base de datos.
- Pantallas de Agregar niño, Editar niño, Resumen del día, Vincular padre y Nueva publicación (sus enlaces apuntan a `/`).
- Interactividad de vincular/desvincular/editar/crear.
- Fotos reales y subida de imágenes.
- Modo oscuro y paridad pixel en móvil.

Cada una de esas piezas, si llega, va en su propia spec.
