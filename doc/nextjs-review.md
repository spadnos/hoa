# Next.js 16 Compliance Review

Project is on **Next.js 16.2.4 + React 19.2.5** (see `package.json:21-23`) — the current release.
Overall the code uses App Router correctly, but there are several Next 16-specific patterns
that are either missed or applied inconsistently.

## What's done right

- `proxy.ts` at the root is the Next 16 convention (replaced `middleware.ts`).
- `await cookies()`, `await params` — correctly applied throughout.
- `serverExternalPackages: ['better-sqlite3']` in `next.config.ts:5` — correct.
- App Router conventions (server components by default, `'use client'` only where needed).
- Async `params` pattern in all dynamic routes: `{ params: Promise<{ id: string }> }` then `await params`.
- `next/font/google` used in `app/layout.tsx:4` instead of raw Google Fonts.
- Server Actions via `<form action={loginAction}>` and `<form action={logoutAction}>` in `app/components/Nav.tsx:119` and `app/components/LoginClient.tsx:39`.
- `next/link` used consistently; no `<a href>` for internal navigation.
- `useTransition` + `router.refresh()` used correctly after mutations in `app/documents/DocumentsClient.tsx:26-32`.

## Issues

### 1. Auth belongs in the proxy, not layouts (and Server Actions have no CSRF/authorization)

`proxy.ts:13-17` only checks that *some* cookie exists — it doesn't verify it or check permissions. Route-level auth is then re-done in each page/API handler. Two problems:

- The session cookie is unsigned (see database review), so a cookie of any shape passes the proxy gate.
- `loginAction(partyId)` in `src/auth/actions.ts:9` accepts any `partyId` from the client as a bound argument to a Server Action. Server Action arguments are authenticated as "this user sent this request" but not authorized — anyone can call `loginAction(1)` and log in as party 1. This is the single most critical issue. The login page should take an email+password/OTP or a signed magic link, not a party-id-as-input.

### 2. Caching is not explicit

Next 16 moved from "cache by default" to **"cache by consent"** via the `use cache` directive. The codebase never uses `'use cache'`, `cacheLife`, `cacheTag`, or `revalidateTag`. Two consequences:

- Every page that calls `getDb()` re-queries SQLite on every request with no memoization. For the dashboard (`app/page.tsx`), contacts/committees/announcements barely change — wrap `getContacts`, `getDeadlines`, and the announcements query with `'use cache'` and tag them, then call `revalidateTag('announcements')` from the announcement mutation routes.
- No `generateStaticParams` on any dynamic route, so every `/directory/[id]`, `/lots/[id]`, `/projects/[id]` is rendered fully dynamic. Some (like the directory) are good candidates for on-demand ISR.

### 3. Client-side `fetch('/api/...')` from Server Components' children instead of Server Actions or direct DB calls

The pattern throughout is: server page renders a client component, client component calls an API route, API route hits the DB. This is 3 network hops for what could be one:

- `app/components/PartyProfileClient.tsx`, `app/documents/DocumentsClient.tsx`, `app/admin/groups/GroupsClient.tsx`, `app/lots/[id]/LotAssociationsClient.tsx`, `app/components/ProjectContactsSection.tsx`, `app/components/ProjectDocumentsSection.tsx`, `app/components/NewProjectForm.tsx`, `app/components/NewPartyForm.tsx` — all do this.

For mutations, **use Server Actions** (as the login/logout already does). They're type-safe, work without JS, and automatically integrate with `revalidatePath`/`revalidateTag`. For reads triggered by user interaction, Server Actions or URL-state also work.

### 4. Missing `loading.tsx`, `error.tsx`, and `not-found.tsx`

The app has zero `loading.tsx`, `error.tsx`, or `not-found.tsx` files anywhere in `app/`. Without them:
- Slow SQLite queries make the entire route block with no streaming fallback.
- A thrown error in `listProjects`, `getContacts`, etc. will surface the Next.js default error overlay in dev and a generic 500 in prod.
- `app/global-error.tsx` is also missing — you have no root-level error boundary.

At minimum: add `app/error.tsx`, `app/global-error.tsx`, and a `loading.tsx` for heavy routes like `/chat`, `/directory`, `/lots`. Also add `not-found.tsx` so bad IDs don't 500.

### 5. No Suspense / streaming

Next 16's stable `<Suspense>` boundaries let independent data queries stream in. `app/page.tsx:37-40` runs `getContacts` and `getDeadlines` in parallel with `Promise.all` — good — but the whole page still blocks on both. Wrapping each card in a `<Suspense fallback={...}>` with its own async component would let slower data stream without blocking the rest.

### 6. Metadata is minimal

Only `app/layout.tsx` exports metadata. No page exports `generateMetadata` or a per-route `metadata`. `/directory/[id]`, `/projects/[id]`, `/lots/[id]`, `/admin/*`, `/portal`, `/login` — none set titles, descriptions, or robots. Add at least `export const metadata = { title: 'Directory | East Meadows HOA' }` on top-level pages, and `generateMetadata` on dynamic pages (e.g. project ID as title).

### 7. Chat page uses XSS-vulnerable `dangerouslySetInnerHTML`

`app/chat/page.tsx:245` passes LLM output through a custom regex-based `parseMarkdown` then injects it. The LLM (or a poisoned tool result) can emit `<script>` or `<img onerror>` and it will execute. The repo already has `react-markdown` + `remark-gfm` installed — use those. Same pattern, but safe.

### 8. File uploads written with sync Node fs

`app/api/projects/[id]/documents/route.ts:66-73` uses `fs.mkdirSync` + `fs.writeFileSync` inside a request handler. Blocks the Node event loop. Use `fs/promises` (`await fs.mkdir(dir, { recursive: true })`, `await fs.writeFile(...)`). Same in the library documents upload.

### 9. Download route reads the whole file into memory

`app/api/documents/[id]/download/route.ts:48` does `fs.readFileSync` and then returns a Buffer. Stream it instead: `new NextResponse(fs.createReadStream(filePath))`. Important once you have files over a few MB.

### 10. Missing runtime declaration on DB-touching routes

Routes using `better-sqlite3` only work on the Node runtime. Next 16 can sometimes infer this, but being explicit avoids surprises:

```ts
export const runtime = 'nodejs';
```

Add to every `app/api/**/route.ts` that calls `getDb()` (or add it once via a shared route-segment export). Especially matters if you ever configure Vercel Edge.

### 11. `Promise.all`-style parallel code used inconsistently

`app/api/chat/route.ts:11-14` does `Promise.all([request.json(), getSession()])` — good. But most API routes that call `getDb()` and `await getSession()` do them sequentially. Since `getDb()` is sync, this is fine, but there's a recurring pattern `const [db, session] = [getDb(), await getSession()]` which is clever but confusing — the array literal looks parallel but isn't (one side is sync). Just write two lines.

### 12. Linting/tooling

`package.json` has no `"lint"` script and no ESLint config. Next 16 dropped the `next lint` wrapper in favor of the user installing ESLint directly — install `eslint` + `eslint-config-next` and add `"lint": "eslint ."`. Without it you'll miss things like accidental client imports of server-only code.

### 13. `better-sqlite3` + Next 16 serverless

Repeating from the DB review: `better-sqlite3` is a native module held in a module-level singleton (`src/db.ts:60-67`). It works with `next start` on a single Node process but not on Vercel serverless/Edge. `serverExternalPackages` only handles bundling, not the lifecycle issue. Plan for Postgres before deploying anywhere but a VPS.

### 14. `proxy.ts` matcher is too permissive

`proxy.ts:23` matches everything except static assets, including API routes. Since every API route already re-checks `getSession()`, the proxy's redirect-to-login behavior only helps pages. You probably want to exclude `/api` from the matcher so API calls get a 401 JSON response instead of a 307 to `/login` (which breaks client fetches).

## Priority order

1. Fix the `loginAction(partyId)` / unsigned cookie combo — the rest is moot if anyone can log in as anyone.
2. Add `app/error.tsx`, `app/global-error.tsx`, and a `not-found.tsx`.
3. Replace `parseMarkdown` + `dangerouslySetInnerHTML` with `react-markdown`.
4. Add `runtime = 'nodejs'` to DB-touching routes; exclude `/api` from the proxy matcher.
5. Convert client `fetch('/api/...')` mutations to Server Actions where feasible.
6. Adopt `'use cache'` + `revalidateTag` for the dashboard and directory queries.
7. Add metadata to top-level routes and `generateMetadata` to dynamic ones.
8. Swap sync `fs` calls for `fs/promises` and stream downloads.
