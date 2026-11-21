# API Uptime & Latency Monitor

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

**Day 2: Frontend, polish, deploy**

7. Vite scaffold, Tailwind v4 theme tokens, font embed, theme toggle without flash.
8. Auth pages, protected routes, Axios client with interceptor.
9. Dashboard (table and mobile cards), add and delete flows.
10. Detail view with Recharts, range selector, uptime, average and p95 latency.
11. Responsive and accessibility pass at 360px, 768px, 1280px.
12. README, `.env.example`, deployment, external cron setup, acceptance checklist from the PRD.

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
