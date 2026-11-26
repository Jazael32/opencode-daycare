# open-daycare

Aplicación para gestión de guarderías construida con **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4** y **Supabase** como backend (base de datos, autenticación y sesión vía `@supabase/ssr`).

## Requisitos

- Node.js 20+
- npm
- Cuenta de Supabase (para la base de datos)

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Configurar las variables de entorno. Crear un archivo `.env.local` en la raíz (no se commitea) con:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://aqvrzjfdyqwcfiotnagu.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-publishable-key>
   ```

   Ambos valores se obtienen del dashboard de Supabase: **Project Settings → API**. Nunca usar la `service_role` en el cliente.

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Scripts disponibles

| Comando           | Descripción                                                    |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con Turbopack                           |
| `npm run build`   | Build de producción (también hace typecheck)                   |
| `npm run start`   | Sirve el build de producción                                   |
| `npm run lint`    | ESLint 9 (flat config)                                         |

Verificación recomendada antes de commitear:

```bash
npm run lint
npx tsc --noEmit
```

## Supabase

El proyecto usa la instancia de Supabase `aqvrzjfdyqwcfiotnagu`. El acceso desde la app se hace siempre con los paquetes oficiales (`@supabase/supabase-js` + `@supabase/ssr`) y la publishable key; el cliente ya está configurado en:

- `utils/supabase/server.ts` → Server Components, Server Actions y Route Handlers
- `utils/supabase/client.ts` → Client Components (browser)
- `utils/supabase/middleware.ts` → refresco de sesión (invocado desde `proxy.ts`)

### Autenticación con el Supabase CLI

Para trabajar con el proyecto desde la terminal (migraciones, inspectores, etc.), cada persona del equipo debe autenticarse con el CLI:

1. **Login** — abre el navegador para autenticarte con tu cuenta de Supabase:

   ```bash
   npx supabase login
   ```

   El CLI genera una clave efímera, te redirige a `supabase.com/dashboard/cli/login` y, al autorizar, recibe y guarda de forma segura tu access token en el equipo. No necesitas copiar/pegar nada.

   - Alternativa no interactiva (CI/entornos sin navegador):

     ```bash
     npx supabase login --token <tu-personal-access-token>
     ```

     El token se genera en [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).

2. **Vincular el proyecto** (una vez por clon del repo):

   ```bash
   npx supabase link --project-ref aqvrzjfdyqwcfiotnagu
   ```

### MCP de Supabase (OpenCode)

El agente (OpenCode) usa el servidor MCP global de Supabase, apuntando al mismo proyecto. Para autenticarlo:

1. Ejecutar `/mcps` en OpenCode.
2. Seleccionar `supabase` y completar el OAuth en el navegador.
3. Si `opencode mcp list` muestra `needs authentication`, repetir el paso anterior.

El MCP es la única vía para DDL, seeds y verificación de la base de datos; toda manipulación de la DB se hace mediante migraciones (`apply_migration`), nunca con SQL directo de escritura.

### Esquema de referencia

Las tablas, columnas y relaciones de referencia están documentadas en el directorio hermano `../07-db-schema`. Actualmente solo `daycares` está aplicada; el resto aún no.

## Mockups

El diseño de referencia de las pantallas vive en `references/pantallas/*.dc.html` (con capturas renderizadas en `references/screenshots/`). Son la fuente de verdad para layout, copy y estilos (fuentes Fredoka / Nunito, paleta crema cálida).
