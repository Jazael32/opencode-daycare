# SPEC 12 — Organización de componentes en carpetas por área y cursor pointer global

> **Estado:** Implementado
> **Depende de:** Ninguno (refactor transversal sobre los componentes que produjeron SPEC 01–06 y 09–11)
> **Fecha:** 2026-11-24
> **Objetivo:** Reorganizar los 15 componentes planos de `app/components/` en 4 subcarpetas por área (`kids/`, `login/`, `navigation/`, `posts/`) actualizando todos los imports, y agregar una regla CSS global en `globals.css` para que todo botón interactivo muestre el cursor pointer al hacer hover.

## Contexto

- Los 15 componentes viven planos en `app/components/*.tsx`; ningún importador usa subcarpetas (verificado con grep: 5 páginas + 6 componentes internos importan con `@/app/components/<nombre>`).
- Solo 3 elementos de toda la app tienen `cursor-pointer` explícito (label del checkbox en `activation-form.tsx`, "¿Olvidaste tu contraseña?" en `login-form.tsx`, upload de foto en `new-post-modal.tsx`); los botones principales ("Vincular padre", "Nueva publicación", CTA del textbox "Compartí un momento", logout, CTAs de modales) muestran la flecha default.
- Tailwind v4 va por loader Turbopack en `next.config.ts` (sin `tailwind.config.js`); `app/globals.css` usa `@import "tailwindcss"` + `@theme`. La regla global va en `@layer base` para no competir con utilities.

## Scope

**In:**

- **Carpetas y movimientos** (contenido de archivos intacto, solo cambia ubicación):

| Carpeta | Componentes |
| --- | --- |
| `app/components/kids/` | `add-kid-button.tsx`, `add-kid-modal.tsx`, `kids-grid.tsx`, `kid-profile-view.tsx`, `link-parent-modal.tsx`, `linked-parents.tsx` |
| `app/components/login/` | `activation-form.tsx`, `login-form.tsx` |
| `app/components/navigation/` | `bottom-nav.tsx`, `logout-button.tsx`, `sidebar.tsx` |
| `app/components/posts/` | `feed-list.tsx`, `new-post-button.tsx`, `new-post-modal.tsx`, `post-card.tsx` |

- **Actualización de imports** en: `app/page.tsx`, `app/activar-cuenta/page.tsx`, `app/kids/page.tsx`, `app/kids/[id]/page.tsx`, `app/login/page.tsx`, y entre componentes: `add-kid-button` → `add-kid-modal`, `feed-list` → `post-card`, `linked-parents` → `link-parent-modal`, `new-post-button` → `new-post-modal`, `sidebar` → `logout-button` + `new-post-button`.
- **Regla global de cursor** en `app/globals.css` dentro de `@layer base`: `button:not(:disabled), [role="button"] { cursor: pointer; }`. Los 3 `cursor-pointer` explícitos existentes se conservan (las utilities ganan sobre base; no hay conflicto).

**Out of scope (para specs futuros):**

- Renombrar componentes, cambiar su contenido, API (props) o estilos.
- Efectos visuales de hover (sombra, escala, cambio de color) en botones.
- Mover `app/lib/`, `actions.ts` o crear una capa `components/` en la raíz del repo.
- Categorías nuevas (auth, modales compartidos, etc.).

## Data model

Ninguna estructura nueva: la app no cambia de comportamiento, solo de organización de archivos y una regla CSS.

## Implementation plan

1. Crear `app/components/{kids,login,navigation,posts}/` y mover los 15 archivos según la tabla del Scope (preservar contenido byte a byte).
2. Actualizar los imports de los 10 archivos importadores listados en el Scope a las rutas `@/app/components/<área>/<nombre>`.
3. Agregar la regla de cursor en `globals.css` (`@layer base`).
4. Verificación: `npm run lint`, `npx tsc --noEmit`, `npm run build`; en el navegador (dev server) confirmar el cursor pointer sobre "Vincular padre" (perfil de niño), "Nueva publicación" (sidebar y bottom nav), CTA del textbox "Compartí un momento" (feed), "Cerrar sesión", y botones de los modales — sin ningún otro cambio visual.

## Acceptance criteria

- [x] `app/components/` no tiene `.tsx` sueltos; existen exactamente las 4 subcarpetas con 6 / 2 / 3 / 4 archivos.
- [x] Ningún import apunta a `@/app/components/<archivo>.tsx` sin subcarpeta (grep en 0 resultados).
- [x] `npx tsc --noEmit` y `npm run build` pasan.
- [x] `npm run lint` pasa.
- [x] Todo `<button>` habilitado y `[role="button"]` muestra `cursor: pointer` (incluidos "Vincular padre", "Nueva publicación", "Compartí un momento", "Cerrar sesión").
- [x] No hay diffs visuales distintos del cursor (comparando capturas de las pantallas contra `references/screenshots/`).

## Decisions taken and discarded

- **Subcarpetas dentro de `app/components/`** (elegido) vs `components/` en la raíz: cambio mínimo, solo imports; si más adelante hay componentes compartidos entre áreas, se evalúa la raíz en otra spec.
- **`logout-button` → `navigation/` y `activation-form` → `login/`** (elegido): el logout es un control de navegación; la activación es parte del flujo de autenticación. Descartada una carpeta `auth/` separada: con 2 archivos no la justifica el usuario.
- **Regla global CSS** (elegida) vs `cursor-pointer` clase por clase: una línea cubre botones actuales y futuros; el costo es que aplica a todo botón, que es exactamente el pedido.
- **Un solo spec** (elegido) vs dos separados: ambos cambios se verifican con el mismo build y son pequeños.
- **Solo cursor, sin hover visual** (elegido): sin cambios de diseño fuera de lo pedido.

## Identified risks

- **R1 — Regla `@layer base` en Tailwind v4:** si la regla no se colocara en base, las utilities type-safe podrían no ganar; se usa `@layer base` explícito. Riesgo bajo, verificado en el paso 4.
- **R2 — Imports no detectados por grep:** Next Turbopack falla el build ante cualquier import roto; `tsc` + build del paso 4 lo descartan.
- **R3 — Convención de `app/`:** solo `page/layout/loading/route` etc. son especiales; mover componentes a subcarpetas de `app/components/` no afecta el routing.
