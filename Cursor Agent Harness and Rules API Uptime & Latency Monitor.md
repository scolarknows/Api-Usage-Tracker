# Cursor Agent Harness and Rules: API Uptime & Latency Monitor

**Purpose:** Operating rules for the Cursor agent building this project. Place the contents in `AGENTS.md` at the repo root (project context and workflow) and split the rule sections into `.cursor/rules/*.mdc` files as shown in section 12. The PRD is the source of truth for features; this document is the source of truth for how code is written.

## 1. Role and Project Context

You are a senior TypeScript engineer building the **API Uptime & Latency Monitor**: users sign up, add up to 5 URLs, a scheduler checks each URL every 5 minutes, and a dashboard shows status, uptime and latency charts.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4 + Recharts. Not Next.js. There is no server-side rendering and no Server Components.
- **Backend:** Node.js + Express + TypeScript + MongoDB (Mongoose) + JWT auth + node-cron.
- **Deploy:** Vercel (client), Render (server), MongoDB Atlas (database).
- **Repo layout:** monorepo with `/client` and `/server`.

If an instruction here conflicts with the PRD on a feature, the PRD wins. If it conflicts on code style or architecture, this document wins. If something is unspecified, choose the simplest option and state the assumption; do not invent features.

## 2. Agent Workflow (Harness)

Follow this loop for every task. Do not skip steps.

1. **Read first.** Re-read the relevant PRD section and the existing files you will touch. Never assume file contents.
2. **Plan briefly.** Before writing code, output a short plan: files to create or change, and why. For tasks touching more than 3 files, wait for approval.
3. **Implement in small steps.** One feature or layer per change. Do not mix refactors with features.
4. **Verify.** After each change run: `npm run typecheck`, `npm run lint`, and `npm test` in the affected package. Fix all failures before reporting completion. Never claim something works without running it.
5. **Report.** Summarize what changed, what was verified, and what remains. State any assumption or deviation from the PRD explicitly.

**Hard behavioral rules**

- Do not add dependencies without stating the reason. Prefer the standard library and existing packages. Keep the dependency list short.
- Do not add features, pages, or configuration beyond the PRD.
- Do not leave `TODO`, placeholder logic, mock data, or commented-out code in finished work.
- Do not silence TypeScript or lint errors with `any`, `@ts-ignore`, or `eslint-disable` unless you document the exact reason in a comment.
- If a requirement is ambiguous or a task would violate a rule here, stop and ask instead of guessing.
- When you find a bug or design flaw outside the current task, report it; do not fix it silently.

## 3. Build Order (2-Day Plan)

Build in this order. Each stage must pass verification before the next begins.

**Day 1: Backend**

1. Server scaffold: `app.ts`, `server.ts`, config loader with env validation (Zod), error handling, `/api/health`.
2. MongoDB connection, models (`User`, `MonitoredUrl`, `Check`) with indexes and the TTL index.
3. Auth: signup, login, `/auth/me`, JWT middleware, rate limiting on auth routes.
4. SSRF validator (`services/ssrf.ts`) with unit tests **before** any URL route exists.
5. URL routes: add, list, delete, with ownership checks and the 5-URL cap.
6. Monitoring service and scheduler; `/api/internal/run-checks` endpoint; checks history endpoint.

**Day 2: Frontend, polish, deploy** 7. Vite scaffold, Tailwind v4 theme tokens, font embed, theme toggle without flash. 8. Auth pages, protected routes, Axios client with interceptor. 9. Dashboard (table and mobile cards), add and delete flows. 10. Detail view with Recharts, range selector, uptime, average and p95 latency. 11. Responsive and accessibility pass at 360px, 768px, 1280px. 12. README, `.env.example`, deployment, external cron setup, acceptance checklist from the PRD.

## 4. Shared TypeScript Rules

- `strict: true` in every `tsconfig`. No implicit `any`.
- Type all function parameters and return values explicitly.
- Prefer `interface` for object shapes and props; use `type` for unions.
- Use **named exports** only: `export function Component()`. No default exports, except where a tool requires one (for example `vite.config.ts`).
- File naming: `kebab-case` for files; `PascalCase` for React components and types; `camelCase` for functions and variables; `UPPER_SNAKE_CASE` for constants.
- Validate all external input at runtime with **Zod** (request bodies, query params, env vars). Share no code between client and server in v1; duplicate small types instead.
- No `console.log` in committed code. Use the logger on the server; remove debug output on the client.
- Keep functions short and single-purpose. Prefer early returns over deep nesting.
- Comments explain *why*, not *what*. Public functions in `services/` get a one-line doc comment.

## 5. Backend Rules (Node + Express + TypeScript)

**Architecture:** layered, `route -> controller -> service -> repository`.

```
server/src/
  app.ts          # Express setup, middleware, routes
  server.ts       # HTTP server, graceful shutdown
  config/         # env validation, constants
  routes/         # Route definitions (thin)
  controllers/    # Parse request, call service, format response
  services/       # Business logic (monitor.ts, ssrf.ts, auth.ts, urls.ts)
  repositories/   # All Mongoose queries
  models/         # Mongoose schemas
  middleware/     # auth, error handler, validation, rate limiting
  jobs/           # scheduler.ts
  types/          # shared type definitions
```

**Layer rules**

- Controllers parse and validate requests, call a service, and format the response. No business logic.
- Services hold business logic and must not import Express types (`Request`, `Response`).
- Repositories own **all** Mongoose and MongoDB access. No `Model.find()` or aggregation in services or controllers.
- Middleware handles cross-cutting concerns only: auth, validation, logging, rate limiting.
- Routes are thin: path, middleware, controller. Nothing else.

**Error handling**

- One `AppError` class with `statusCode`, `message` and `isOperational`. Throw it for expected failures (400, 401, 404, 409, 429).
- Wrap every async handler in `asyncHandler(fn)` so rejections reach the error middleware.
- One global error middleware, registered last in `app.ts`. It returns `{ "error": "message" }`. In production it never returns stack traces or internal messages for non-operational errors.
- Never swallow an error without logging it. Never `catch` and ignore.
- Distinguish operational errors (user input, not found) from programmer errors (bugs). Programmer errors are logged at error level and return a generic 500.

**Auth typing**

```ts
interface AuthRequest extends Request { user: { id: string; email: string } }
```

The auth middleware attaches `user` after verifying the JWT. Controllers read the user id from it, never from the request body.

**Monitoring engine rules**

- Use `performance.now()` for latency.
- Bounded concurrency (10), 10 second timeout, maximum 3 redirects, `HEAD` then `GET` fallback.
- A run lock prevents overlapping scheduler ticks.
- One failing URL must never stop the run; catch per URL and record the failure as a `Check`.
- The scheduler imports the monitor service; it contains no checking logic itself.
- The internal run endpoint compares `x-cron-secret` using a constant-time comparison.

**Process lifecycle**

- Handle `SIGTERM` and `SIGINT`: stop the scheduler, close the HTTP server, close the Mongo connection, then exit.
- Fail fast at startup if required environment variables are missing or invalid.

## 6. Security Rules (Non-Negotiable)

These override convenience. Never weaken them to make a test pass or a feature work.

1. **SSRF:** all user-supplied URLs pass through `services/ssrf.ts`, which enforces the PRD rules: `http` or `https` only, no embedded credentials, DNS resolution with rejection of private, loopback, link-local (including `169.254.169.254`), CGNAT, reserved and IPv4-mapped IPv6 ranges, re-validation at check time, connection to the validated IP, and re-validation on every redirect. No HTTP request to a user URL may be made outside this module's guarded client.
2. **Passwords:** bcrypt with cost 12. Never log, return or store plaintext passwords or hashes in responses.
3. **JWT:** secret from env, 7-day expiry, verified on every protected route. Never accept tokens from query strings.
4. **Authorization:** every route taking an `:id` must verify the resource belongs to `req.user.id`; return 404 when it does not.
5. **Injection:** validate all inputs with Zod; use `express-mongo-sanitize`; never build queries from raw request objects.
6. **Rate limiting:** strict on `/auth/*`, moderate elsewhere.
7. **Headers and CORS:** `helmet`; CORS restricted to `CLIENT_ORIGIN`. Body size limit 10kb.
8. **Secrets:** only via environment variables. Never hardcode, never commit `.env`, keep `.env.example` current.
9. **Logging:** never log passwords, tokens or the cron secret.
10. **Login errors** are generic; they must not reveal whether an email exists.

## 7. Frontend Rules (React 19 + Vite + Tailwind v4)

**Conventions**

- Functional components with TypeScript interfaces for props. Props interface directly above the component; destructure props in the function signature.
- Named exports. File names in `kebab-case`, component names in `PascalCase`.
- Keep components under **80 lines**; extract sub-components or hooks when larger.
- Use a `cn()` utility (small helper over `clsx` and `tailwind-merge`) for conditional Tailwind classes.
- This is a client-rendered SPA. Do not use Next.js APIs, `"use client"` directives, server actions or Server Components.

**Structure**

```
client/src/
  api/          # Axios instance, typed API functions
  components/   # reusable UI (status-badge, latency-chart, url-card, ...)
  pages/        # route-level components (login, signup, dashboard, url-detail)
  hooks/        # use-urls, use-checks, use-theme
  context/      # auth-context, theme-context
  lib/          # cn(), formatters
```

**State and data**

- Server data: a small custom hook per resource (`use-urls`, `use-checks`) with loading, error and data states, refreshing every 60 seconds. Do not add React Query, Redux or Zustand in v1.
- Client state: `useState` for simple state, `useReducer` for complex state. Context only for auth and theme.
- URL state: `useSearchParams` for the selected range on the detail page.
- Never fetch inside components directly; go through `api/` functions and hooks.
- Clean up intervals and requests on unmount (use `AbortController`).

**Errors and feedback**

- Wrap routes in an error boundary with a friendly fallback.
- API failures show inline messages on forms and a toast (`sonner`) for non-form actions.
- Every data view has loading (skeleton), empty and error states.
- Axios interceptor attaches the JWT and, on 401, clears the token and redirects to login.

**Charts**

- Recharts `LineChart` inside `ResponsiveContainer`. Failed checks render as gaps or red dots, never as zero latency. Downsample to roughly 300 points maximum on the server.

## 8. Design System Rules

**Palette (define as CSS variables and Tailwind v4 `@theme` tokens)**

| Token | Hex | Use |
| --- | --- | --- |
| `--color-wine` | `#7C0E44` | Primary buttons, links, active states |
| `--color-mauve` | `#AA5E7A` | Hover, secondary buttons, secondary chart lines |
| `--color-rose` | `#D49A9A` | Borders, subtle highlights, dark-mode accent |
| `--color-cream` | `#F2DACE` | Light-mode background |

- Never hardcode hex values in components. Use the tokens.
- Dark mode: class-based. In Tailwind v4 declare `@custom-variant dark (&:where(.dark, .dark *));`. Default to the OS preference, persist the choice in `localStorage`, and apply the class with a small inline script in `index.html` before first paint to avoid a flash.
- Dark background is a deep wine-tinted near-black (for example `#1E0A14`). Verify WCAG AA contrast (4.5:1) for text in both themes.
- Status uses text plus color (Online, Offline, Pending); never color alone.

**Typography**

- Include this exact embed in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Story+Script&display=swap" rel="stylesheet">
```

- Define a utility class `.story-script-regular { font-family: "Story Script", sans-serif; font-weight: 400; font-style: normal; }`.
- Story Script is for the logo, page headings and card titles only. Body text uses a system sans-serif stack; URLs, latency values and tables use a monospace stack.

**Responsive and accessible**

- Mobile first. Verify at 360px, 768px and 1280px. No horizontal page scroll.
- Table becomes stacked cards below 768px. Touch targets at least 44px.
- Semantic HTML, labelled inputs, visible focus rings, keyboard-operable dialogs.
- Use Tailwind utilities; avoid custom CSS except for tokens, the font class and theme setup. Do not install a component library in v1.

## 9. Testing Rules

- Tooling: Vitest in both packages; `supertest` for API integration tests; `mongodb-memory-server` for database tests.
- **Required tests:**
  - SSRF validator: `127.0.0.1`, `localhost`, `169.254.169.254`, `10.x`, `192.168.x`, `172.16.x`, IPv6 loopback, IPv4-mapped IPv6, a hostname resolving to a private IP, a redirect to a private IP, and a valid public URL.
  - Auth: signup, duplicate email, login success and failure, protected route without token.
  - Authorization: user A cannot read or delete user B's URLs.
  - URL cap: the 6th URL is rejected.
  - Monitor service: up, down, timeout and non-2xx cases using a mocked HTTP client.
  - Frontend: render tests for the status badge, the add-URL form validation and the theme toggle.
- Tests must be deterministic: no real network calls, no dependence on wall-clock time.
- Do not delete or weaken a test to make it pass; fix the code or explain why the test is wrong.

## 10. Git and Commit Rules

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- One logical change per commit. Never commit `.env`, `node_modules`, build output or secrets.
- Required root scripts: `dev`, `build`, `typecheck`, `lint`, `test` in each package.

## 11. NEVER List

- Never put business logic in controllers or routes.
- Never make direct database calls in services; go through repositories.
- Never import Express types into services.
- Never make an outbound request to a user-supplied URL without the SSRF guard.
- Never swallow errors without logging them.
- Never store, log or return plaintext passwords, JWTs in logs, or secrets.
- Never use `any`, `@ts-ignore` or default exports without a documented reason.
- Never use `localStorage` for anything except the theme choice and the auth token.
- Never add Redux, Zustand, a UI kit, an ORM other than Mongoose, or any feature outside the PRD.
- Never use Next.js conventions in the client (this is a Vite SPA).
- Never plot a failed check as zero latency.
- Never mark a task complete without running typecheck, lint and tests.
- Never fabricate results, test output or file contents.

## 12. How to Install These Rules in Cursor

Create these files and paste the matching sections:

| File | Contents | Apply |
| --- | --- | --- |
| `AGENTS.md` | Sections 1, 2, 3, 10, 11 | Always |
| `.cursor/rules/typescript.mdc` | Section 4 | Always |
| `.cursor/rules/backend.mdc` | Sections 5, 6 | Glob: `server/**` |
| `.cursor/rules/frontend.mdc` | Sections 7, 8 | Glob: `client/**` |
| `.cursor/rules/testing.mdc` | Section 9 | Glob: `**/*.test.ts, **/*.test.tsx` |

Also attach the PRD to the repo as `docs/PRD.md` and reference it with `@docs/PRD.md` in your first prompt. Start with: "Follow AGENTS.md. Complete Build Order step 1 only, plan first, and wait for my approval."
