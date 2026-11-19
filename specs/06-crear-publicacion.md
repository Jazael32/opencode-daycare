# SPEC 06 — Crear publicación: modal desde el sidebar y feed persistente

> **Estado:** Verificado
> **Depende on:** SPEC 01, SPEC 04
> **Fecha:** 2026-11-18
> **Objetivo:** Implementar el modal de `references/pantallas/crear-publicacion.dc.html` que abren el botón "Nueva publicación" del sidebar y la caja "Compartí un momento…" de `/`, con destinatario y tipo obligatorios, descripción validada inline y persistencia en localStorage (`od-posts:v1`), de modo que la publicación nueva aparezca arriba del feed como los posts existentes.

## Scope

**In:**

- El botón "Nueva publicación" del sidebar pasa de `<Link href="/">` a un botón que abre el **modal** del mockup como overlay, sin navegación (patrón de SPEC 04/05). Funciona en todas las páginas donde el sidebar es visible (`/`, `/kids`, `/kids/[slug]`).
- La caja "Compartí un momento…" de la home también abre el mismo modal (hoy navega a `/`); en móvil es el único disparador porque el sidebar está oculto.
- Modal fiel al mockup: card `max-w-[580px]` fondo `#FBF4EC`, borde `#ECE0D0`, radio 24px, header con "Cancelar" (`#94887B`) a la izquierda, título Fredoka "Nueva publicación" y "Publicar" (`#D9583C`, bold 800) a la derecha.
- Sección **PARA**: pills con avatar circular de 26px (inicial + colores del niño) para los 8 niños mock + los guardados en `od-kids:v1`, y un pill plano "Toda la sala" al final. **Sin preselección**; selección simple (un click reemplaza la anterior). Estilos del mockup: activo fondo `#3F362E` texto blanco, inactivo borde `#ECE0D0` fondo `#FFFDF9` texto `#6E6359`.
- Sección **TIPO**: las 7 pills del mockup con sus colores exactos (Comida `#9A7B1E`/blanco, Siesta `#E7DCF6`/`#7B5FC0`, Actividad `#2E89A6`/blanco, Logro `#CFEBD8`/`#3E9B6C`, Ánimo `#F9D2DE`/`#C56486`, Foto `#FBD8CC`/`#D9684A`, Anuncio `#CCD8F4`/`#4E72C8`). **Sin preselección**; la pill activa se distingue con anillo `ring-2 ring-ink ring-offset-2`.
- Sección **DESCRIPCIÓN**: textarea con placeholder `Contá cómo le fue hoy…`, min-height 120px, radio 14px, borde `#EADFD0`, fondo blanco (como el mockup, sin texto precargado).
- Sección **FOTOS**: decorativa — tile placeholder 96px y tile dashed "Agregar" reproducidos del mockup, sin acción.
- "Publicar" valida inline (estilo SPEC 04/05), con mensaje rojo bajo la sección correspondiente y sin cerrar el modal: falta de destinatario en PARA, falta de tipo en TIPO, descripción vacía en DESCRIPCIÓN.
- Publicación válida: guarda el post en la clave nueva `od-posts:v1`, cierra el modal y el post aparece **arriba** del feed (antes de los posts mock, dentro de "PUBLICADO HOY") con:
  - Destinatario niño: autor = primer nombre del niño, avatar con su inicial y sus `avatarColors`, línea "Para: familia de {nombre}".
  - "Toda la sala": autor "Anuncio general", avatar megáfono, "Para: toda la sala".
  - Pill de tipo con el label y colores correspondientes; hora local HH:MM (24h) al publicar; "publicado por vos"; 0 likes y 0 comentarios.
- El feed renderiza los posts guardados (más recientes primero) seguidos de los 3 mocks, sin recargar la página (evento `od-posts-updated`) y sobrevive recargas.
- `PostCard` pasa a decidir el avatar megáfono por `author === "Anuncio general"` (hoy lo decide `badge === "announcement"`, que rompería con un anuncio dirigido a un niño).
- Adaptación móvil del modal (card a ancho completo con margen) siguiendo la convención de SPEC 01-05.

**Out of scope (para specs futuras):**

- Subida real de fotos: input file, base64 en localStorage, render de imágenes. La sección FOTOS es decorativa y `photoCaption` no se setea en posts nuevos.
- Pantallas `foto.dc.html` y `detalle-publicacion.dc.html`.
- Editar o eliminar publicaciones (el link "Editar" del PostCard sigue decorativo).
- Likes y comentarios interactivos.
- Feed del padre (`familia-feed.dc.html`).
- Header dinámico: "12 niños · martes 17 jun" sigue estático (no cuenta posts ni usa la fecha real).
- Backend, autenticación y modo oscuro.

## Data model

Nuevo `app/lib/post-storage.ts` (capa de persistencia, solo client, espejo de `app/lib/kid-storage.ts`):

```ts
const STORAGE_KEY = "od-posts:v1"; // versión para migrar sin romper
export const POSTS_UPDATED_EVENT = "od-posts-updated";

export interface StoredPost {
  id: string;        // "post-1731920000000" — Date.now()
  recipient: string; // "mateo-fernandez" (kidSlug) | "room" (toda la sala)
  badge: Badge;      // uno de Badge (mock-feed.ts)
  body: string;      // trimado, no vacío
  createdAt: string; // ISO — ordena el feed
}

export interface NewPostDraft {
  recipient: string;      // "" cuando no hay selección
  badge: Badge | null;    // null cuando no hay selección
  body: string;           // sin trimar aún
}
```

Funciones:

```ts
export function getStoredPosts(): StoredPost[];       // [] si no hay clave o en SSR
export function saveNewPost(draft: NewPostDraft): StoredPost; // valida, persiste, notifica
export function toFeedPost(post: StoredPost): FeedPost | null; // resuelve autor/avatar/audiencia
export function subscribeToPosts(callback: () => void): () => void; // POSTS_UPDATED_EVENT + storage
export function notifyPostsUpdated(): void;
```

Reglas:

- **Validación en `saveNewPost`:** lanza si `recipient` está vacío, si `badge` es null o si `body` trimado está vacío; el modal ya muestra los errores inline antes de llamar.
- **Mapeo a `FeedPost`:** `recipient === "room"` → autor "Anuncio general", audiencia "Para: toda la sala", sin `avatarColors` (PostCard dibuja el megáfono). Kid → autor primer nombre, `initial`, `avatarColors` del niño (buscado en mocks + `od-kids:v1`), audiencia `Para: familia de {primer nombre}`. Si el slug no resuelve, `toFeedPost` devuelve null y el post no se renderiza.
- **Hora:** HH:MM local de 24 dígitos calculada al publicar; `likes` y `comments` nacen en 0; `publishedBy` "publicado por vos".
- Snapshot cacheado + suscripción `useSyncExternalStore` estilo `kid-storage.ts`, para que el feed se refresque sin recargar y también reaccione a cambios en otra pestaña.

Extensión de `app/lib/mock-feed.ts`:

```ts
export type Badge =
  | "achievement" | "activity" | "announcement" // existentes
  | "comida" | "siesta" | "animo" | "foto";      // nuevas

// labels: COMIDA, SIESTA, ÁNIMO, FOTO
// badgeColors nuevos: siesta #E7DCF6/#7B5FC0, animo #F9D2DE/#C56486,
// foto #FBD8CC/#D9684A (pares pastel del propio mockup) y
// comida #F7E7A6/#9A7B1E (par ya usado por la pill PENDIENTE de SPEC 05)

export interface FeedPost {
  // …campos existentes sin cambio…
  avatarColors?: { bg: string; fg: string }; // nuevo: avatar del niño; sin él, bg-avatar-sky
}
```

Mapeo de pills TIPO → `Badge`: Comida→`comida`, Siesta→`siesta`, Actividad→`activity`, Logro→`achievement`, Ánimo→`animo`, Foto→`foto`, Anuncio→`announcement`.

Componentes nuevos:

- `app/components/new-post-modal.tsx` (client): overlay + card del mockup, estado `recipient`/`badge`/`body`, errores inline por sección, cierre por Cancelar/Esc/clic fuera.
- `app/components/new-post-button.tsx` (client): botón con dos variantes — `sidebar` (estilo actual del Link "Nueva publicación") y `composer` (la caja "Compartí un momento…") — que renderizan `NewPostModal` y persisten con `saveNewPost`.

Cambios en existentes:

- `app/components/sidebar.tsx`: reemplaza el `<Link>` "Nueva publicación" por `<NewPostButton variant="sidebar" />`; el resto del sidebar no cambia.
- `app/page.tsx`: la caja composer pasa a `<NewPostButton variant="composer" />`; la lista de posts pasa a `<FeedList />`.
- `app/components/feed-list.tsx` (client nuevo): `useSyncExternalStore(subscribeToPosts, getStoredPosts)` → `toFeedPost` sobre cada uno (descartando null) y renderiza `[...stored, ...feedPosts]`.
- `app/components/post-card.tsx`: avatar del niño usa `post.avatarColors` si existe (fallback `bg-avatar-sky`); megáfono cuando `post.author === "Anuncio general"`.

## Plan de implementación

1. Extender `app/lib/mock-feed.ts`: unión `Badge` con `comida`/`siesta`/`animo`/`foto`, sus `badgeLabels` y `badgeColors`, y `avatarColors?` en `FeedPost`. Ajustar `app/components/post-card.tsx`: avatar por `avatarColors` con fallback actual y megáfono por `author === "Anuncio general"`. Verificar: `npx tsc --noEmit` pasa y `/` se ve idéntico a hoy (los mocks no usan los campos nuevos).
2. Crear `app/lib/post-storage.ts`: clave `od-posts:v1`, snapshot cacheado, evento `od-posts-updated` + suscripción, `saveNewPost` con validación que lanza, `toFeedPost` con la regla de autor/audiencia/avatar y null-guard de slug. Verificar: `npx tsc --noEmit` pasa y nada de lo existente cambia.
3. Crear `app/components/new-post-modal.tsx` (client): overlay + card fiel al mockup (header Cancelar/Nueva publicación/Publicar, PARA con pills de mocks + guardados + "Toda la sala", TIPO con las 7 pills, textarea, FOTOS decorativo), estados sin preselección, validación inline por sección y cierre por Cancelar/Esc/clic fuera. Verificar tras el paso 4.
4. Crear `app/components/new-post-button.tsx` (client) con variantes `sidebar` y `composer`, y cablearlo: `app/components/sidebar.tsx` reemplaza el Link "Nueva publicación" y `app/page.tsx` reemplaza la caja composer. Verificar: el modal abre desde el sidebar en `/` y `/kids`, y desde la caja en `/`; sin guardar nada, el feed no cambia.
5. Crear `app/components/feed-list.tsx` (client) y usarlo en `app/page.tsx` para la sección de posts: posts guardados arriba (más recientes primero) + mocks. Verificar el flujo completo: publicar con destinatario niño y con "Toda la sala" (autor "Anuncio general" con megáfono), errores inline al publicar sin destinatario/tipo/descripción, persistencia tras recargar.
6. Verificación con Playwright MCP: capturas desktop (1440px) y móvil (390px) del feed, del modal abierto, de los errores de validación y del feed con un post nuevo publicado, en `.playwright-mcp/`, comparadas contra `references/pantallas/crear-publicacion.dc.html` y `feed.dc.html`. Confirmar `npm run lint` y `npx tsc --noEmit` sin errores.

## Criterios de aceptación

- [x] Click en "Nueva publicación" del sidebar abre el modal **sin navegar**, tanto en `/` como en `/kids`; click en la caja "Compartí un momento…" abre el mismo modal (en móvil es el disparador disponible).
- [x] "Cancelar", tecla Esc y clic fuera del card cierran el modal sin guardar nada.
- [x] PARA muestra los 8 niños mock + los guardados (con avatar de inicial y sus colores) + "Toda la sala", sin ninguno preseleccionado; la selección es simple (cambiar de pill reemplaza la elección).
- [x] TIPO muestra las 7 pills con los colores exactos del mockup y sin preselección; la activa se distingue con anillo.
- [x] "Publicar" sin destinatario muestra error inline bajo PARA y no cierra el modal.
- [x] "Publicar" sin tipo muestra error inline bajo TIPO y no cierra el modal.
- [x] "Publicar" con descripción vacía muestra error inline bajo DESCRIPCIÓN y no cierra el modal.
- [x] Una publicación válida cierra el modal y el post aparece arriba del feed con: pill de tipo correcta, hora HH:MM actual, "publicado por vos", 0 likes y 0 comentarios.
- [x] Un post dirigido a un niño tiene como autor su primer nombre, su avatar (inicial + colores) y "Para: familia de {nombre}".
- [x] Un post con "Toda la sala" tiene autor "Anuncio general", avatar megáfono y "Para: toda la sala".
- [x] El post publicado persiste tras recargar en `od-posts:v1` y sigue arriba de los posts mock.
- [x] Sin posts guardados, el feed es idéntico al actual de SPEC 01.
- [x] El modal se abre también desde `/kids` y `/kids/[slug]`, y al publicar desde ahí el post aparece en `/` al navegar.
- [x] En móvil (390px) el modal ocupa el ancho y el composer lo abre.
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** modal overlay sobre la página actual en vez de ruta propia — decisión del usuario; replica el patrón de SPEC 04/05 y evita una pantalla `crear-publicacion` separada.
- **Sí:** disparadores sidebar + caja "Compartí un momento…" — decisión del usuario; esta última cubre móvil, donde el sidebar está oculto.
- **Sí:** PARA single-select con lista completa (mocks + guardados + "Toda la sala") y **sin preselección obligatoria** — decisión del usuario.
- **Sí:** TIPO **sin preselección** y obligatorio al publicar (error inline) — decisión del usuario; corrige la lectura del mockup, donde "Comida" parecía activa.
- **Sí:** descripción obligatoria con error inline — decisión del usuario.
- **Sí:** autor según destinatario (niño → primer nombre; sala → "Anuncio general") — decisión del usuario; el PostCard pasa a decidir el megáfono por autor, no por badge, para que un anuncio dirigido a un niño no pierda su avatar.
- **Sí:** FOTOS decorativa, sin subir archivos — decisión del usuario; base64 llenaría localStorage y el feed aún no renderiza imágenes reales.
- **Sí:** clave nueva `od-posts:v1` + evento `od-posts-updated` — convención de SPEC 02/04/05.
- **Sí:** `badgeColors` nuevos toman los pares pastel del propio mockup para siesta/ánimo/foto; **comida usa `#F7E7A6`/`#9A7B1E`** (par ya existente en el sistema: pill PENDIENTE de SPEC 05) porque el feed usa pills pastel y el `#9A7B1E` sólido del modal quedaría fuera de esa convención — derivación documentada, vetable al revisar.
- **Sí:** pill TIPO activa marcada con anillo `ring-ink` — el mockup no muestra estado inactivo/activo para TIPO, había que definirlo.
- **Sí:** hora HH:MM local al publicar, `likes`/`comments` en 0 — deriva del formato de los posts mock.
- **No:** subir fotos reales, editar/borrar posts, likes/comentarios interactivos, `foto.dc.html`/`detalle-publicacion.dc.html` — fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Hydration mismatch: el server no conoce localStorage | `FeedList` usa `useSyncExternalStore` con snapshot server `[]`; el primer render coincide con el server y los posts guardados aparecen después, sin flash de contenido distinto. |
| localStorage deshabilitado o corrupto | `getStoredPosts()` devuelve `[]` ante cualquier fallo; el feed degrada a los posts mock y el modal funciona pero no persiste. |
| Slug de un niño guardado que ya no existe al renderizar | `toFeedPost` devuelve null y ese post no se renderiza (hoy no hay borrado de niños, pero el guard cuesta una línea). |
| Colores de pill Comida inventados respecto del modal | Documentado en Decisiones; se usa un par ya presente en el sistema de diseño en vez del sólido `#9A7B1E`. |

## Lo que **no** está en esta spec

- Subida real de fotos y pantallas `foto`/`detalle-publicacion`.
- Editar o eliminar publicaciones (el link "Editar" sigue decorativo).
- Likes y comentarios interactivos.
- Feed del padre (`familia-feed`).
- Header dinámico (fecha real / contador de niños).

Cada una de esas piezas, si llega, va en su propia spec.
