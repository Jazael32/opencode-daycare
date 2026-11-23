<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

## MCPs

- Playwright Screenshots y cualquier cosa relacionada a Playwright tiene que estar en la carpeta .playwright-mcp.
- Context 7 usaremos este mcp para traer la documentacion actualizada del framework.
- Supabase: MCP global para el proyecto `aqvrzjfdyqwcfiotnagu`. Se usa desde Code Mode como `tools.supabase.*`.

## Supabase

- **Conexión**: el servidor `supabase` está configurado en `~/.config/opencode/opencode.json` (global) y apunta al proyecto `aqvrzjfdyqwcfiotnagu`. Si `opencode mcp list` muestra `needs authentication`, ejecutar `/mcps` en OpenCode, seleccionar `supabase` y completar el OAuth en el navegador.
- **Tools principales** (`tools.supabase.*`):
  - Inspección: `list_tables`, `list_extensions`, `list_migrations`, `search_docs`.
  - SQL: `execute_sql` **solo** para consultas y verificación (SELECT); `apply_migration` para toda escritura o DDL (migraciones).
  - Diagnóstico: `query_logs` (logs unificados) y `get_advisors` (seguridad, performance y health).
  - Integración: `get_project_url`, `get_publishable_keys`, `generate_typescript_types`.
  - Edge Functions: `list_edge_functions`, `get_edge_function`, `deploy_edge_function`.
- **Skills instaladas** (nivel proyecto, en `.agents/skills/`, registradas en `skills-lock.json`):
  - `supabase`: cargarla para cualquier tarea de Supabase (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues, `supabase-js`, `@supabase/ssr`, CLI, RLS, migraciones y debugging).
  - `supabase-postgres-best-practices`: cargarla **antes** de escribir o modificar cualquier cosa en Postgres (tablas, columnas y tipos, schema, migraciones, RLS, índices, triggers, funciones, `pg_cron`, `pgmq`, `pgvector`, imports/restores) y al diagnosticar queries lentas, locks, bloat, timeouts o filas visibles por el tenant equivocado.
- **Schema de referencia**: `../07-db-schema` (referencia de tablas, columnas y relaciones). Solo `daycares` está aplicada (spec 07); el resto todavía no.
- **Regla obligatoria — migraciones siempre:** toda manipulación de la base de datos (DDL o datos: crear/alterar/eliminar tablas, columnas, enums, índices, policies, triggers, funciones, seeds, updates o deletes) se hace **siempre** mediante una migración con `tools.supabase.apply_migration`. `execute_sql` **no** se usa para cambios persistentes: queda reservado para lecturas y verificación.
- **Reglas de trabajo**:
  - Inspeccionar las tablas existentes antes de cambiar el schema.
  - Antes de modificar la DB remota, revisar logs y advisories del proyecto.
  - Separar DDL y datos en migraciones distintas, con nombre snake_case descriptivo (ej. `create_daycares_table`, `seed_demo_daycare`).
  - No hardcodear IDs ni timestamps generados en migraciones de datos; referenciar filas por columnas de negocio (ej. `name`).
  - No editar una migración ya aplicada: cualquier corrección va en una migración nueva.
  - Los cambios destructivos (`drop table`, etc.) van en su propia migración y requieren confirmación explícita.
  - Toda migración aplicada se materializa en `supabase/migrations/<version>_<nombre>.sql` con el SQL exacto registrado en `supabase_migrations.schema_migrations`, y se commitea al repo.
  - Verificar después de migrar con `list_migrations`, `list_tables` (verbose), la consulta del seed y `get_advisors` (security y performance).
  - **Flujo actual:** no hay stack local inicializado; las migraciones se aplican directo al proyecto remoto vía MCP. Si más adelante se inicializa el CLI, probar en local antes de promover a remoto.
  - El SQL corre en el servidor: nunca leer archivos del servidor ni ejecutar comandos del SO vía SQL (`COPY ... FROM '/path'`, `COPY ... FROM PROGRAM`, `pg_read_file`, `pg_ls_dir`, `lo_import`).

## Spec Driven Development

- /spec Usaremos esta Skill para crear las especificaciones.
- /spec-impl Usaremos esta skill para hacer las implementaciones.
- **spec-verifier (subagente)**: después de implementar un spec, lánzalo para verificar y cerrar el ciclo. Verifica, corrige y marca los checks de "Criterios de aceptación" de `specs/*.md`:
  - Usa **Context7** para validar el código contra la documentación actual de Next.js.
  - Usa **Playwright** para validar las pantallas contra los mockups de `references/pantallas/` (las capturas van en `.playwright-mcp/`).
  - Corrige lo que falle y marca los checks `[ ]` → `[x]` en el spec correspondiente solo cuando el criterio se cumpla de verdad.

## Project overview

- **open-daycare**: daycare app UI (Next.js 16.4.6 App Router, React 19, Tailwind v4, TypeScript). The app code is still the create-next-app scaffold — `README.md` is boilerplate.
- **The real spec is not in code yet**: static HTML mockups live in `references/pantallas/*.dc.html` (Spanish screen names: `feed`, `login`, `ninos`, `perfil-nino`, `avisos`, `resumen-dia`, `agregar-nino`, `vincular-padre`, …; `index.dc.html` lists them all) plus rendered screenshots in `references/screenshots/*.png`. When building pages, match these mockups — they are the source of truth for layout, copy, and styling (fonts: Fredoka / Nunito, warm cream palette).

## Toolchain quirks

- Tailwind v4 is wired through a **Turbopack loader in `next.config.ts`** (`turbopack.rules`), not PostCSS. `globals.css` uses `@import "tailwindcss"` + `@theme`. Do not create `tailwind.config.js` or `postcss.config.mjs`.
- `next.config.ts` enables **`cacheComponents: true`** and **`partialPrefetching: true`** (non-default). Data fetching/caching follows the cacheComponents conventions (`use cache`, `cacheLife`, etc.) — check `node_modules/next/dist/docs/`.
- Path alias: `@/*` → repo root.
- ESLint 9 flat config (`eslint.config.mjs`); the `lint` script is bare `eslint`, which lints the repo root.

## Commands & verification

- `npm run dev` (Turbopack), `npm run lint`, `npm run build`.
- No test runner is configured. Verify with `npm run lint` and `npx tsc --noEmit` (or `npm run build`, which typechecks); `.next` must exist first for tsconfig to pick up `.next/types`.
- The `<!-- BEGIN:nextjs-agent-rules -->` / `<!-- BEGIN:nextjs-agent-feedback -->` blocks in this file are generated by `next dev` — keep them and commit this file with your work.

## Reglas de codigo

- Usar codigo limpio, nombres, funciones variables, etc en ingles.