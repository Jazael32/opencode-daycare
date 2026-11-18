# SPEC 03 — Login y Activar cuenta (`/login`, `/activar-cuenta`)

> **Estado:** Implementado
> **Depende on:** SPEC 01
> **Fecha:** 2026-11-17
> **Objetivo:** Implementar las pantallas `references/pantallas/login.dc.html` (ruta `/login`, sin el selector de rol Personal/Familia) y `references/pantallas/activar-cuenta.dc.html` (ruta `/activar-cuenta`) con formularios vacíos y navegación entre ambas y hacia `/`, sin autenticación real.

## Scope

**In:**

- Ruta `/login` con el layout de dos columnas del mockup:
  - Panel coral izquierdo: gradiente `#F6A98E → #F2937A → #EC7E62` (155deg), dos círculos decorativos translúcidos, branding OpenDayCare (icono sol + wordmark Fredoka), título "El día de cada niño, compartido con su familia.", subtítulo "Publicá momentos, gestioná las salas y mantené a las familias cerca, desde un solo lugar." y footer "🌿 Guardería Sala Soles".
  - Formulario derecho: título "Iniciar sesión", subtítulo "Ingresá para ver el día de hoy.", labels EMAIL y CONTRASEÑA, campos **vacíos con placeholders**, enlace "¿Olvidaste tu contraseña?" y CTA "Iniciar sesión" → `/`.
  - **Sin** el bloque "INGRESO COMO" ni los botones Personal/Familia (eliminados por decisión del usuario).
  - Footer: "¿Te invitó la guardería? **Activá tu cuenta**" → `/activar-cuenta`.
- Ruta `/activar-cuenta` con la card centrada del mockup:
  - Logo en caja degradada, título "Bienvenida a OpenDayCare", subtítulo "Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar la cuenta."
  - Caja de invitación: avatar "M" (fondo `#A9D9E8`, texto `#1F7A93`), "Te invitaron a seguir a" / "Mateo · Sala Soles" (texto display estático del mockup).
  - Campos CÓDIGO DE INVITACIÓN, EMAIL y CREAR CONTRASEÑA **vacíos con placeholders**.
  - Checkbox de autorización sobre fondo `#FBF1D6`: inicia **desmarcado** y alterna al clic (única interactividad; requiere client component).
  - CTA "Activar mi cuenta" → `/` y footer "¿Ya tenés cuenta? **Iniciar sesión**" → `/login`.
- Actualización de `app/components/sidebar.tsx`: el botón "salir" pasa a apuntar a `/login` (única modificación fuera de las dos pantallas nuevas).
- Adaptación móvil de `/login`: el panel coral se oculta en `<lg` y el formulario queda centrado sobre fondo crema; `/activar-cuenta` ya es de una columna y solo ajusta el padding.
- Formularios como client components con el estado local mínimo (checkbox toggleable); sin validación ni envío real.

**Out of scope (para specs futuras):**

- Autenticación real: validación de credenciales, código de invitación, persistencia de sesión y base de datos.
- Pantalla "olvidé mi contraseña": el enlace queda como texto visible sin navegación.
- Selector de rol Personal/Familia y la pantalla `familia-feed.dc.html` (el CTA de activar apunta a `/`).
- Validación de campos (formato de email, longitud de código, fuerza de contraseña).
- Modo oscuro y paridad pixel en móvil (solo desktop exige identidad visual).

## Data model

Esta feature **no introduce estructuras de datos nuevas**. No hay mocks: los dos formularios viven vacíos y la caja "Mateo · Sala Soles" de `/activar-cuenta` es texto display estático copiado del mockup (se reutilizará `app/lib/mock-kids.ts` cuando exista lógica real de invitación, no ahora).

Placeholders definidos (los inputs no llevan `value`):

| Campo | Placeholder |
| --- | --- |
| EMAIL (login y activar) | `tu@email.com` |
| CONTRASEÑA / CREAR CONTRASEÑA | `••••••••` |
| CÓDIGO DE INVITACIÓN | `7K4P9` (muestra el formato esperado: 5 caracteres) |

## Plan de implementación

1. Crear `app/login/page.tsx`: layout de dos columnas con panel coral (oculto `<lg`) y formulario con labels, inputs vacíos, "¿Olvidaste tu contraseña?" (texto no navegable), CTA "Iniciar sesión" → `/` y enlace "Activá tu cuenta" → `/activar-cuenta`. Verificar: `/login` renderiza sin el bloque "INGRESO COMO".
2. Crear `app/activar-cuenta/page.tsx` (client component por el checkbox): logo, títulos, caja de invitación estática, tres inputs vacíos, checkbox toggleable sobre `#FBF1D6`, CTA "Activar mi cuenta" → `/` y enlace "Iniciar sesión" → `/login`. Verificar: el checkbox alterna al clic.
3. Actualizar `app/components/sidebar.tsx`: botón "salir" → `/login`. Verificar: en `/` el botón salir navega a `/login` y el resto del sidebar no cambia.
4. Verificación visual con Playwright MCP: capturas desktop (1440px) y móvil (390px) de `/login` y `/activar-cuenta` en `.playwright-mcp/`, comparadas contra `references/pantallas/login.dc.html` y `activar-cuenta.dc.html` (y `references/screenshots/` si existen). Confirmar `npm run lint` y `npx tsc --noEmit` sin errores.

## Criterios de aceptación

- [x] `/login` abre sin errores de consola en desktop (1440px).
- [x] `/login` **no** contiene el bloque "INGRESO COMO" ni los botones Personal/Familia.
- [x] El panel coral muestra el gradiente `#F6A98E → #EC7E62`, branding OpenDayCare, la tagline y "🌿 Guardería Sala Soles" (verificado en herramientas de desarrollo).
- [x] Los inputs EMAIL y CONTRASEÑA de `/login` están vacíos y muestran los placeholders `tu@email.com` y `••••••••`.
- [x] "¿Olvidaste tu contraseña?" es visible y no navega a ningún lado.
- [x] El CTA "Iniciar sesión" navega a `/` (el feed de SPEC 01).
- [x] El enlace "Activá tu cuenta" navega a `/activar-cuenta`.
- [x] En móvil (390px) el panel coral está oculto y el formulario queda centrado sobre fondo `#FBF4EC`.
- [x] `/activar-cuenta` muestra la caja de invitación con avatar "M" y el texto "Mateo · Sala Soles".
- [x] Los inputs CÓDIGO DE INVITACIÓN, EMAIL y CREAR CONTRASEÑA están vacíos con los placeholders definidos.
- [x] El checkbox de autorización inicia desmarcado y alterna su estado al hacer clic.
- [x] El CTA "Activar mi cuenta" navega a `/` y el enlace "Iniciar sesión" navega a `/login`.
- [x] El botón "salir" del sidebar en `/` apunta a `/login`; el resto del sidebar y de la app no cambia.
- [x] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisiones

- **Sí:** rutas `/login` y `/activar-cuenta` con `/` como feed — mantiene intactas SPEC 01 y 02 (decisión del usuario).
- **Sí:** eliminar el selector de rol Personal/Familia del login — decisión explícita del usuario; también se elimina la lógica de `pickStaff`/`pickParent` del mockup.
- **Sí:** campos vacíos con placeholders — decisión del usuario sobre la alternativa de precargar los valores del mockup; rompe la paridad de capturas pero refleja un formulario real.
- **Sí:** checkbox de autorización inicia desmarcado y toggleable — coherente con formularios vacíos; es la única interactividad, por eso `/activar-cuenta` es client component.
- **Sí:** CTAs "Iniciar sesión" y "Activar mi cuenta" navegan a `/` — convención de SPEC 01/02 para pantallas inexistentes (no hay auth real).
- **Sí:** panel coral oculto en `<lg` y formulario centrado — decisión del usuario sobre apilarlo.
- **Sí:** botón "salir" del sidebar apunta a `/login` — decisión del usuario; única modificación a componentes existentes.
- **No:** pantalla de recuperación de contraseña — no existe; el enlace queda como texto no navegable en vez de apuntar a `/` (el feed no tendría sentido ahí).
- **No:** autenticación, validación de código de invitación y `familia-feed.dc.html`.

## Lo que **no** está en esta spec

- Autenticación y base de datos.
- Selector de rol Personal/Familia y pantalla familia-feed.
- Recuperación de contraseña.
- Validación de formularios y lógica de invitación real.
- Modo oscuro y paridad pixel en móvil.

Cada una de esas piezas, si llega, va en su propia spec.
