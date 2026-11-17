# SPEC 01 — Home Feed con paridad visual del mockup

> **Estado:** Implementado
> **Depende on:** ninguno
> **Fecha:** 2026-11-16
> **Objetivo:** Implementar la pantalla `references/pantallas/feed.dc.html` como home (`/`) con datos mock, sin autenticación ni base de datos, con estilo idéntico al mockup y navegación móvil propia.

## Scope

**In:**

- Ruta `/` renderizando el feed del mockup: header "Buenas, Caro", botón "Compartí un momento…", separador "PUBLICADO HOY" y las 3 publicaciones (LOGRO, ACTIVIDAD, ANUNCIO).
- Sidebar de escritorio completo: logo OpenDayCare · Sala Soles, botón "Nueva publicación", nav (Feed activo, Niños, Avisos, Mi cuenta), tarjeta de usuario (Caro Giménez · Maestra · Soles) y botón salir.
- Adaptación móvil: sidebar oculto en `<lg`, barra inferior fija de pestañas (Feed, Niños, Avisos, Mi cuenta).
- Fuentes Fredoka y Nunito autoalojadas vía `next/font/google`; tema claro fijo con la paleta del mockup.
- Paleta del mockup como tokens `@theme` en `app/globals.css` (Tailwind v4).
- Datos mock tipados en `app/lib/mock-feed.ts`.

**Out of scope (para specs futuras):**

- Autenticación y base de datos (decisión explícita del usuario).
- Pantallas y rutas reales de Niños, Avisos, Mi cuenta, Nueva publicación, Detalle y Foto — todos los enlaces apuntan a `/`.
- Interactividad de "me gusta", comentarios y "Editar" (contadores estáticos del mock).
- Fotos reales (se mantiene el placeholder punteado del mockup).
- Modo oscuro (se elimina del scaffold).
- Paridad pixel en móvil: la paridad exacta aplica solo a desktop; móvil es una adaptación libre.

## Data model

Nuevo archivo `app/lib/mock-feed.ts`:

```ts
export type Badge = "achievement" | "activity" | "announcement";

// Spanish labels for display; the UI renders these, never the raw value.
export const badgeLabels: Record<Badge, string> = {
  achievement: "LOGRO",
  activity: "ACTIVIDAD",
  announcement: "ANUNCIO",
};

export interface FeedPost {
  id: string;
  author: string;        // "Mateo" | "Anuncio general"
  initial: string;       // "M" — avatar circular con letra
  time: string;          // "14:20" | "09:40" | "07:50"
  publishedBy: string;   // "publicado por vos"
  badge: Badge;
  audience: string;      // "Para: familia de Mateo" | "Para: toda la sala"
  body: string;
  photoCaption?: string; // "Foto · pintando con témperas" (solo activity)
  likes: number;         // 3 | 5 | 8
  comments: number;      // 1 | 2 | 0
}

export const user = {
  name: "Caro Giménez",
  initial: "C",
  role: "Maestra · Soles",
};

export const feedPosts: FeedPost[] = [ /* 3 posts del mockup */ ];
```

Colores por badge (tomados del mockup): achievement `#CFEBD8`/`#3E9B6C`, activity `#C7E7F1`/`#2E89A6`, announcement `#CCD8F4`/`#4E72C8`. El texto visible del badge sale de `badgeLabels` (LOGRO / ACTIVIDAD / ANUNCIO), manteniendo la paridad visual con el mockup.

## Plan de implementación

1. Crear `app/lib/mock-feed.ts` con los tipos, `user` y los 3 posts. Verificar: `npx tsc --noEmit` pasa.
2. Reescribir `app/globals.css`: reemplazar los tokens Geist por la paleta del mockup (`--color-bg: #F6ECDF`, `--color-surface: #FFFDF9`, `--color-border: #ECE0D0`, `--color-ink: #3F362E`, `--color-muted: #A89A8B`, `--color-brand: #D9583C`, colores de badges) y eliminar los bloques `prefers-color-scheme: dark`.
3. Actualizar `app/layout.tsx`: cargar Fredoka y Nunito con `next/font/google`, exponerlas como `--font-fredoka`/`--font-nunito`, usarlas en `@theme`, y quitar las clases `dark:` y Geist. Verificar: `npm run dev` renderiza `/` con fondo `#F6ECDF` y tipografías nuevas.
4. Crear `app/components/sidebar.tsx`: brand, botón "Nueva publicación" (gradiente `#F4977E→#EE8164`), nav con Feed activo (fondo `#FBE3D8`, texto `#D9583C`), tarjeta de usuario y botón salir. Todos los enlaces sin página apuntan a `/`.
5. Crear `app/components/post-card.tsx`: avatar, autor, hora, badge pill, audiencia, cuerpo, placeholder de foto punteado (opcional), y footer con me gusta / comentarios / "Editar".
6. Crear `app/components/bottom-nav.tsx`: barra inferior fija (Feed activo), visible solo en `<lg`.
7. Reescribir `app/page.tsx`: layout con `<Sidebar />` (oculto `<lg`), contenido `max-w-[760px]` con header, botón composer, separador y los 3 `<PostCard />` desde `feedPosts`, más `<BottomNav />`. Verificar: `npm run lint` y `npx tsc --noEmit` pasan.
8. Verificación visual con Playwright MCP: capturas desktop (1440px) y móvil (390px) guardadas en `.playwright-mcp/`, comparadas lado a lado contra `references/screenshots/feed.png` y `feed2.png`.

## Criterios de aceptación

- [x] `npm run dev` abre `/` sin errores en la consola del navegador.
- [x] En viewport desktop (1440px), la captura de `/` coincide visualmente con `references/screenshots/feed.png`: header "Buenas, Caro", botón "Compartí un momento…", y las 3 tarjetas en orden LOGRO, ACTIVIDAD, ANUNCIO.
- [x] Fondo de página `#F6ECDF`, tarjetas `#FFFDF9` con borde `#ECE0D0`, texto principal `#3F362E` (verificado en las herramientas de desarrollo).
- [x] Los badges usan los colores exactos: LOGRO `#CFEBD8`/`#3E9B6C`, ACTIVIDAD `#C7E7F1`/`#2E89A6`, ANUNCIO `#CCD8F4`/`#4E72C8`.
- [x] Contadores visibles: 3 me gusta / 1 comentario, 5 / 2, 8 / 0, en ese orden.
- [x] El HTML renderizado no contiene ningún `<link>` a `fonts.googleapis.com` (fuentes autoalojadas vía `next/font`).
- [x] En viewport móvil (390px) el sidebar está oculto y la barra inferior muestra las 4 pestañas sin romper el layout.
- [x] Todos los enlaces del sidebar y de las tarjetas apuntan a `/` y navegan sin 404.
- [x] Con `prefers-color-scheme: dark` activado, la página se ve exactamente igual que en claro.
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** datos mock en `app/lib/mock-feed.ts` tipado — reemplazable por la BD real en una spec futura sin reescribir la página.
- **Sí:** sidebar completo con tarjeta de usuario — el home debe verse idéntico al mockup.
- **Sí:** móvil con barra inferior de pestañas; sidebar oculto en `<lg` — el mockup no define móvil y era el patrón recomendado.
- **Sí:** Fredoka + Nunito vía `next/font/google` autoalojadas — sin dependencia de red en runtime, más rápido que el `<link>` del mockup.
- **Sí:** tema claro fijo — se eliminan las clases `dark:` y Geist del scaffold; la paleta vive como tokens `@theme` en `globals.css` (siguiendo el setup Turbopack + Tailwind v4 del repo).
- **Sí:** todos los enlaces sin página apuntan a `/` (elección del usuario sobre la alternativa recomendada de rutas futuras reales tipo `/ninos`).
- **No:** autenticación y base de datos — explícitamente fuera por decisión del usuario.
- **No:** rutas 404 futuras — consecuencia de elegir todo a `/`.
- **No:** paridad pixel en móvil — solo desktop exige identidad visual.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `next/font/google` necesita descargar las fuentes en el primer build y puede fallar detrás de un proxy | Verificar el paso 3 con `npm run dev` antes de continuar; el cache de `next/font` evita reintentos |
| "Idéntico" es un juicio visual | La verificación es captura Playwright a 1440px comparada lado a lado contra `references/screenshots/feed.png` — no un diff de píxeles automatizado |

## Lo que **no** está en esta spec

- Autenticación y base de datos.
- Pantallas de Niños, Avisos, Mi cuenta, Nueva publicación, Detalle y Foto (sus enlaces apuntan a `/`).
- Interactividad de me gusta / comentarios / Editar.
- Fotos reales y subida de imágenes.
- Modo oscuro y paridad pixel en móvil.

Cada una de esas piezas, si llega, va en su propia spec.
