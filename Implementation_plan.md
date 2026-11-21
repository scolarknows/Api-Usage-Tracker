API Uptime & Latency Monitor

Empty workspace today: only the PRD and the harness markdown. Features come from the PRD; code style and architecture come from the harness. Where they differ, use TypeScript (not the PRD’s .js filenames), Vitest (not Jest), and a route → controller → service → repository split. Duplicate small types between client and server; do not share a package in v1.

Live deploy (Vercel, Render, Atlas) is the last step and needs your accounts and secrets. Everything before that runs locally.

flowchart LR
  subgraph client [client Vite SPA]
    Pages[Pages and hooks]
    Axios[Axios plus JWT interceptor]
  end
  subgraph server [server Express]
    Routes[Routes and controllers]
    Services[Auth URLs SSRF Monitor]
    Repos[Repositories]
    Jobs[node-cron plus run lock]
  end
  Atlas[(MongoDB)]
  Cron[External cron every 5 min]
  Pages --> Axios --> Routes --> Services --> Repos --> Atlas
  Jobs --> Services
  Cron -->|"POST /api/internal/run-checks"| Routes

Step 0 — Project rules and repo skeleton

Copy the source documents into the repo and install Cursor rules so later steps follow them.





docs/PRD.md — copy of the PRD.



AGENTS.md — harness sections 1, 2, 3, 10, 11.



.cursor/rules/typescript.mdc — section 4, always apply.



.cursor/rules/backend.mdc — sections 5 and 6, glob server/**.



.cursor/rules/frontend.mdc — sections 7 and 8, glob client/**.



.cursor/rules/testing.mdc — section 9, glob **/*.test.ts and **/*.test.tsx.



Root package.json with dev, build, typecheck, lint, test that delegate to client and server. Root .gitignore excluding .env, node_modules, and build output.

Day 1 — Backend

Work only in server/. After each step: npm run typecheck, npm run lint, npm test.

1. Scaffold. Express app in server/src/app.ts and process lifecycle in server/src/server.ts. Zod-validated env in server/src/config/env.ts (PORT, MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN, CRON_SECRET, NODE_ENV); fail fast if invalid. helmet, CORS locked to CLIENT_ORIGIN, JSON body limit 10kb, express-mongo-sanitize, pino logger, AppError plus asyncHandler, global error middleware returning { "error": "message" } (no stacks in production). GET /api/health returns { "status": "ok" }. Moderate rate limit on non-auth routes. unhandledRejection logged; SIGTERM and SIGINT stop the scheduler, close HTTP, close Mongo, then exit.

2. Data layer. Mongoose connection with retry. Models only; all queries live in repositories.





User: email (unique, lowercase), passwordHash, createdAt.



MonitoredUrl: userId (indexed), url, name, isActive, lastStatus (up | down | pending), lastLatencyMs, lastCheckedAt, createdAt. Unique { userId, url }.



Check: urlId, timestamp, statusCode, latencyMs, isUp, error. Compound index { urlId, timestamp }. TTL on timestamp with expireAfterSeconds: 604800.

3. Auth. Signup, login, GET /api/auth/me. bcrypt cost 12. JWT 7-day expiry from Authorization: Bearer only (never query string). Email normalized; password min 8. Duplicate email → 409. Login failures are one generic message. Auth routes rate-limited (10 per 15 minutes per IP). AuthRequest attaches { id, email }. Tests with mongodb-memory-server and supertest: signup, duplicate email, login success and failure, protected route without a token.

4. SSRF before any URL route. server/src/services/ssrf.ts is the only place that may request a user URL. Allow http/https only; reject embedded credentials, localhost, and common internal hostnames. Resolve DNS and reject private, loopback, link-local (169.254.0.0/16 including metadata), CGNAT 100.64.0.0/10, reserved, 0.0.0.0/8, ::1, fc00::/7, fe80::/10, and IPv4-mapped IPv6. Connect to the validated IP (DNS-rebinding defense) and re-validate every redirect (max 3). Unit tests, with DNS mocked: 127.0.0.1, localhost, 169.254.169.254, 10.x, 192.168.x, 172.16.x, IPv6 loopback, IPv4-mapped IPv6, hostname → private IP, redirect → private IP, and one valid public URL.

5. URL routes. POST /api/urls, GET /api/urls, DELETE /api/urls/:id. Zod on body. Normalize: trim, strip fragment, reject non-http(s) and per-user duplicates. Optional name, max 60 characters. Cap of 5 → 400. Delete removes the URL and its checks. Ownership: missing or another user’s id → 404. List includes latest status and 24h uptime. Tests: user A cannot read or delete user B’s URLs; the 6th URL is rejected; SSRF-blocked URLs are rejected.

6. Monitor, scheduler, history. server/src/services/monitor.ts checks all active URLs with concurrency 10, 10s timeout, HEAD then GET on 405/501, User-Agent: UptimeMonitorBot/1.0, latency via performance.now(). Up means status 200–399. Record Check (TIMEOUT, DNS_FAILURE, CONNECTION_REFUSED, or short error) and update lastStatus, lastLatencyMs, lastCheckedAt. One URL failure never aborts the run. In-process run lock skips overlapping ticks. node-cron every 5 minutes plus one run on startup. POST /api/internal/run-checks compares x-cron-secret in constant time. GET /api/urls/:id/checks?range=24h|7d returns downsampled history (about 300 points), uptime %, average and p95, and recent failures. Chart payload uses null latency for failed checks so the client never plots zero. Monitor tests use a mocked HTTP client: up, down, timeout, non-2xx.

Day 2 — Frontend, polish, docs

Work in client/. Same verification gate. React 19 + Vite + TypeScript + Tailwind v4 + React Router. No Next.js, no React Query, Redux, Zustand, or UI kit. Components stay under 80 lines. Named exports only (default export only where Vite requires it).

7. Shell and theme. Vite scaffold, @theme tokens (--color-wine #7C0E44, --color-mauve #AA5E7A, --color-rose #D49A9A, --color-cream #F2DACE), dark background #1E0A14, @custom-variant dark. Story Script embed exactly as in the PRD, used only for logo, headings, and card titles. Body is system sans; URLs, latency, and tables are monospace. Inline script in index.html applies dark from localStorage or prefers-color-scheme before paint. Theme toggle in the header. cn() via clsx and tailwind-merge. Error boundary. Render test for the theme toggle.

8. Auth UI. Login and signup pages with labelled fields and inline errors. Axios client reads VITE_API_URL, attaches the JWT from localStorage, and on 401 clears it and redirects to login. Auth context; protected routes. Token is the only auth use of localStorage.

9. Dashboard. Table at ≥768px, stacked cards below. Columns: name, URL, status badge (Online / Offline / Pending with text, not color alone), last latency, 24h uptime, relative last-checked. Add-URL form with inline validation. Delete confirmation dialog (keyboard operable, 44px targets). use-urls loads, errors, and refreshes every 60s with AbortController. Skeleton, empty state (“No URLs yet. Add your first one.”), and error state. Toasts via sonner for non-form actions. Render test for the status badge and add-URL validation.

10. Detail. Route with ?range=24h|7d via useSearchParams. Recharts LineChart in ResponsiveContainer: failed checks are gaps or red markers, never 0. Show range uptime, average latency, p95, and recent failures with error reasons. use-checks with the same 60s refresh.

11. Responsive and accessibility pass. Check 360px, 768px, and 1280px: no horizontal scroll, focus rings, contrast aimed at WCAG AA 4.5:1 in both themes. Exercise signup, add URL, delete, theme toggle, and the detail chart in the browser.

12. Docs and deploy. README.md: setup, env vars, text architecture diagram, SSRF design, scheduler note (in-process cron locally; external cron-job.org or UptimeRobot hitting POST /api/internal/run-checks every 5 minutes in production so Render free tier stays awake), single-scheduler warning for multiple instances, and the Atlas volume note (5 URLs × 5 minutes stays inside 512 MB). .env.example for server and client. Acceptance checklist from PRD section 12. Deploy only after you supply Atlas, Render, and Vercel credentials; seed one demo account and record the live URL.

Dependencies (added only as each step needs them)

Server: express, mongoose, zod, bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, express-mongo-sanitize, pino, node-cron. Dev: typescript, tsx, vitest, supertest, mongodb-memory-server, ESLint, types.

Client: react, react-dom, react-router-dom, axios, recharts, tailwindcss v4, clsx, tailwind-merge, sonner. Dev: Vite, Vitest, Testing Library, ESLint.

Out of scope

Alerts, teams, billing, public status pages, custom intervals, body assertions, multi-region checks, and any shared client/server package.