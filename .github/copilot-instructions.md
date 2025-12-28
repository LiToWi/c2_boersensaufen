## Repo overview (big picture)

- This is a Next.js (App Router) + Convex project implementing a "bar stock exchange" (Boersensaufen) where tables, parties, orders and drinks are modelled in Convex.
- Frontend lives in `src/app/` (Next App Router). Components are split between server components (default) and client components that start with `"use client"` (see `src/app/page.tsx` and many `src/components/*`).
- Backend-like logic lives in Convex functions and the generated client under `convex/_generated/` (types and API bindings). Convex tables/schema is defined in `convex/schema.ts`.

## Key locations to read first

- `convex/schema.ts` — canonical data model: `tables`, `parties`, `orders`, `orderItems`, `drinks`, `categories`.
- `src/lib/auth.ts` — NextAuth credentials provider wired to Convex; shows required env vars and how auth uses Convex queries/mutations (`NEXT_PUBLIC_CONVEX_URL`, `NEXTAUTH_SECRET`).
- `src/contexts/PartyContext.tsx` — client-side context that holds party/table state used across UI.
- `src/app/` — routes and layouts (admin vs user dashboards live under `src/app/dashboard/admin` and `src/app/dashboard/user`).
- `convex/_generated/` — generated Convex API bindings; prefer using these to call server queries/mutations.

## Build / dev / debug workflow (project-specific)

- Start local dev: run both Next and Convex dev servers.

  npm run dev
  npx convex dev

  The README suggests opening http://localhost:3001 when both are running. Expect Next dev (Turbopack) and Convex dev to run together during local development.

- Environment variables the code expects (non-exhaustive):
  - `NEXT_PUBLIC_CONVEX_URL` — Convex HTTP endpoint used by the client (`src/lib/auth.ts`).
  - `NEXTAUTH_SECRET` — NextAuth secret used by `authOptions` in `src/lib/auth.ts`.

## Conventions & patterns specific to this repo

- Convex-first data access: server-side logic is implemented as Convex queries/mutations and consumed via `convex/_generated/api` (see `src/lib/auth.ts` for an example). Avoid hand-rolling raw DB calls; use the generated API.
- Table-centric auth: authentication uses a CredentialsProvider where a "table" (record in `tables`) is the "user". See `authorize` in `src/lib/auth.ts` for the exact flow (look up table by name, validate password via a Convex mutation, return a slim user object with id/name).
- App Router + client components: Files under `src/app` are server components by default. If a file uses React hooks or context it must begin with `"use client"` — e.g., `src/app/page.tsx`.
- UI primitives: project uses Tailwind + shadcn-style small UI files under `src/components/ui/*.tsx` — follow their props and composition when adding new controls.

## Example patterns (copy/paste-ready)

- Calling a Convex query from client/server using generated API:

  import { api } from '../../convex/_generated/api'
  // client: use ConvexHttpClient with NEXT_PUBLIC_CONVEX_URL (see src/lib/auth.ts)

- Auth provider pattern (see `src/lib/auth.ts`):

  1. Use Convex client to call `api.tables.getTableByName`.
  2. Call `api.tables.validateTablePassword` mutation.
  3. Return { id: String(table._id), name: table.name } as session user.

## External integrations / dependencies to be aware of

- Convex: serverless DB and function system. Generated bindings live in `convex/_generated/` — regenerate if you change schema.
- NextAuth: configured in `src/lib/auth.ts`; uses JWT session strategy here.
- Socket.io: present in `package.json` — search the repo for `socket.io` usage when working on real-time features.
- Recharts: used for charts (see `src/components/ui/chart.tsx`).

## Small gotchas & developer tips

- If you change `convex/schema.ts`, run Convex codegen so that `convex/_generated/` stays in sync.
- When adding logic that needs a client-side effect or hook, ensure the component file has `"use client"` or move the effect into an explicit client component.
- Use the generated `api` bindings (import from `convex/_generated/api`) rather than constructing queries by hand — the project depends on these types.

## Where to look for more context

- `README.md` — quick start and stack summary.
- `package.json` — scripts and deps; Next 15 + React 19 and Convex are core.
- `src/lib/auth.ts` and `convex/schema.ts` — essential for auth and data model understanding.

---

If any section is unclear or you want extra examples (e.g., how to add a new Convex mutation and use it in a page, or how to wire server components to client components), tell me which area and I will expand the instructions with concrete code edits. 
