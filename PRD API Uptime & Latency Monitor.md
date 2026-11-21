# PRD: API Uptime & Latency Monitor

**Version:** 1.0  |  **Build window:** 2 days  |  **Audience:** AI coding tool / developer

## 1. Overview

Build a full-stack web application where authenticated users register website or API URLs. A backend scheduler checks each URL every 5 minutes, records HTTP status and response latency, and the frontend presents current status and historical uptime and latency graphs.

**Stack (fixed):** React (Vite) + Tailwind CSS + Recharts; Node.js + Express; MongoDB (Mongoose); JWT authentication.

**Deployment:** Frontend on Vercel, backend on Render, database on MongoDB Atlas (free tier).

## 2. Goals and Non-Goals

**Goals**

- Reliable background monitoring that survives restarts and does not double-fire.
- Secure by default: authentication, input validation, SSRF protection, rate limiting.
- Clean, mobile-responsive dashboard with light and dark modes.
- Code that is small, readable, and well structured.

**Non-Goals (v1)**

- Email, SMS or webhook alerts.
- Teams, roles, billing, public status pages.
- Multi-region probing.

## 3. Users and Core Flow

A user signs up, logs in, adds up to 5 URLs, and sees each URL's status badge, uptime percentage, last latency, and a latency chart. Each user sees only their own data.

## 4. Functional Requirements

### 4.1 Authentication

- Email and password signup and login.
- Passwords hashed with bcrypt (cost 12). Never store or log plaintext.
- JWT access token, 7-day expiry, sent as `Authorization: Bearer <token>`. Secret from environment variable.
- Email validated and normalized to lowercase; unique index on email.
- Password minimum 8 characters.
- Frontend stores the token and attaches it via an Axios interceptor; on a 401 response it clears the token and redirects to login.

### 4.2 URL Management

- Each user may have a maximum of **5** monitored URLs. Return `400` with a clear message when exceeded.
- Accepted URLs: `http` or `https` only. Normalize before saving (trim, strip fragment). Reject duplicates per user.
- Optional friendly name per URL (max 60 characters).
- A user can delete a URL; this also deletes its check history.

### 4.3 Monitoring Engine

- A scheduler runs every **5 minutes** and checks all active URLs.
- Use bounded concurrency (for example, 10 simultaneous requests) so one slow site does not delay others.
- Per request: **10 second timeout**, maximum 3 redirects, `HEAD` first with fallback to `GET` if the server returns 405 or 501. Set a `User-Agent` such as `UptimeMonitorBot/1.0`.
- Record for each check: `urlId`, `timestamp`, `statusCode` (null on network failure), `latencyMs`, `isUp`, `error` (short string, for example `TIMEOUT`, `DNS_FAILURE`, `CONNECTION_REFUSED`).
- A check is **up** if the status code is 200-399 (the response was received within the timeout).
- Measure latency with a monotonic clock (`performance.now()`), not `Date.now()`.
- Update the parent URL document with `lastStatus`, `lastLatencyMs`, `lastCheckedAt`.
- Prevent overlapping runs: if the previous run is still in progress, skip the new tick.
- On server startup, run one check immediately so the dashboard is not empty.
- Failures in one check must never crash the process; catch and log per URL.

### 4.4 Scheduler Hosting (important)

Render free web services spin down after about 15 minutes without inbound traffic, which stops an in-process `node-cron` job. Implement **both**:

1. `node-cron` in-process for local development and always-on hosts.
2. A protected endpoint `POST /api/internal/run-checks` requiring header `x-cron-secret` matching an environment variable. Document that an external free scheduler (cron-job.org or UptimeRobot) should call it every 5 minutes in production; this also keeps the Render instance awake.

- Add a `GET /api/health` endpoint (no auth) returning `{status: "ok"}`.

### 4.5 Data Retention

- Check history is kept for **7 days**. Implement with a MongoDB TTL index on the check timestamp (`expireAfterSeconds: 604800`).
- Index checks on `{urlId, timestamp}` for fast range queries.

### 4.6 Dashboard

- Table (cards on mobile) listing each URL: name, URL, status badge (green Online / red Offline / grey Pending), last latency in ms, 24h uptime %, last checked time (relative).
- Add-URL form with inline validation and error messages.
- Delete with a confirmation dialog.
- Detail view per URL: Recharts line chart of latency over a selectable range (24h, 7d), uptime percentage for the range, average and p95 latency, and a list of the most recent failures with error reasons.
- Chart must show gaps or red markers for failed checks rather than plotting zero latency.
- Auto-refresh data every 60 seconds; show a loading skeleton and empty state ("No URLs yet. Add your first one.").

## 5. API Specification

All routes prefixed `/api`. All responses JSON. Errors use `{ "error": "message" }` with correct status codes.

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | /auth/signup | No | Create account, return token |
| POST | /auth/login | No | Return token |
| GET | /auth/me | Yes | Current user |
| POST | /urls | Yes | Add URL (SSRF validated) |
| GET | /urls | Yes | List user's URLs with latest status and 24h uptime |
| GET | /urls/:id/checks?range=24h\|7d | Yes | Check history for charts |
| DELETE | /urls/:id | Yes | Delete URL and its checks |
| POST | /internal/run-checks | Secret header | Trigger a monitoring run |
| GET | /health | No | Health check |

Every `:id` route must verify the resource belongs to the authenticated user (return 404, not 403, otherwise).

## 6. Data Models

**User:** `email` (unique), `passwordHash`, `createdAt`.

**MonitoredUrl:** `userId` (indexed), `url`, `name`, `isActive`, `lastStatus` (`up` | `down` | `pending`), `lastLatencyMs`, `lastCheckedAt`, `createdAt`. Unique compound index on `{userId, url}`.

**Check:** `urlId`, `timestamp`, `statusCode`, `latencyMs`, `isUp`, `error`. TTL index on `timestamp` (7 days).

## 7. Security Requirements (mandatory)

1. **SSRF protection** (critical). The server fetches user-supplied URLs, so it must block internal targets:
   - Allow only `http` and `https` schemes; reject credentials in the URL (`user:pass@`).
   - Resolve the hostname via DNS and reject if any resolved IP is private, loopback, link-local or reserved: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (cloud metadata), `0.0.0.0/8`, `100.64.0.0/10`, `::1`, `fc00::/7`, `fe80::/10`, and IPv4-mapped IPv6.
   - Re-validate at **check time**, not only at add time, and connect to the validated IP to defend against DNS rebinding.
   - Re-validate every redirect target; do not follow redirects blindly.
   - Reject `localhost` and common internal hostnames.
2. **Rate limiting** with `express-rate-limit`: strict on `/auth/*` (for example, 10 requests per 15 minutes per IP), moderate on all other routes.
3. `helmet` for security headers; CORS restricted to the configured frontend origin only.
4. Input validation and sanitization on all bodies (Zod or express-validator). Limit JSON body size to 10kb. Protect against NoSQL injection (`express-mongo-sanitize` or strict schema validation).
5. Secrets only in environment variables; provide `.env.example`; never commit `.env`.
6. Generic error messages on login failure (do not reveal whether the email exists). Do not leak stack traces in production.
7. Run `npm audit` and keep dependencies minimal.

## 8. Reliability and Scalability

- Centralized error-handling middleware and a global `unhandledRejection` handler that logs without leaving the process in a bad state.
- Graceful shutdown on `SIGTERM` (stop scheduler, close the Mongo connection).
- Mongoose connection with retry logic; connection pooling defaults.
- Structured logging (`pino` or `morgan` in production format). Never log passwords or tokens.
- Stateless API so it can scale horizontally. Note in the README that running multiple instances requires a single scheduler (leader election or the external cron trigger) to avoid duplicate checks.
- Pagination or hard limits on all list queries; chart endpoints downsample to at most about 300 points.
- Design choice documented in README: with a 5 URL cap and a 5 minute interval, volume is about 1,440 checks per user per 5 days at most, well inside the Atlas free tier (512 MB).

## 9. UI/UX Requirements

### 9.1 Color Theme

| Token | Hex | Use |
| --- | --- | --- |
| Primary (Wine) | `#7C0E44` | Primary buttons, links, active states, key accents |
| Secondary (Mauve) | `#AA5E7A` | Hover states, secondary buttons, chart secondary lines |
| Accent (Rose) | `#D49A9A` | Borders, badges backgrounds, subtle highlights |
| Surface (Cream) | `#F2DACE` | Light-mode page background |

Define as CSS variables and Tailwind theme extensions. Status colors (green for up, red for down) are semantic and may sit outside the palette, but must remain legible against it.

### 9.2 Light and Dark Mode

- Toggle in the header; implemented with Tailwind `darkMode: 'class'`.
- Default to the OS preference (`prefers-color-scheme`), persist the user's choice in `localStorage`, and apply the class before first paint to avoid a flash.
- Light: cream `#F2DACE` background, wine text and accents. Dark: a deep wine-tinted near-black background (for example `#1E0A14`), cards slightly lighter, with `#D49A9A` and `#AA5E7A` as accents. Verify WCAG AA contrast (4.5:1) for all text in both modes.

### 9.3 Typography

Load this exact embed in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Story+Script&display=swap" rel="stylesheet">
```

```css
.story-script-regular {
  font-family: "Story Script", sans-serif;
  font-weight: 400;
  font-style: normal;
}
```

- Use Story Script for the logo, page headings and card titles.
- Use a system sans-serif stack for body text and a monospace stack (`ui-monospace, Menlo, monospace`) for URLs, latency values and tables. Story Script is decorative and reduces readability for dense numeric data.

### 9.4 Responsive Design

- Mobile first. Breakpoints: 360px, 768px, 1280px.
- Table collapses to stacked cards below 768px; no horizontal page scroll.
- Touch targets at least 44px. Charts resize with their container.

### 9.5 Accessibility

- Semantic HTML, labelled form fields, visible focus rings, keyboard-operable dialogs.
- Status is never conveyed by color alone: badges include text (Online / Offline).

## 10. Project Structure

```
/client   (Vite + React + Tailwind)
  src/components, src/pages, src/hooks, src/api, src/context (auth, theme)
/server   (Express)
  src/models, src/routes, src/controllers, src/middleware,
  src/services (monitor.js, ssrf.js), src/jobs (scheduler.js), src/config
```

## 11. Environment Variables

**Server:** `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `CRON_SECRET`, `NODE_ENV`. **Client:** `VITE_API_URL`.

## 12. Testing and Acceptance Criteria

- Unit tests (Jest or Vitest) for the SSRF validator covering at least: `127.0.0.1`, `localhost`, `169.254.169.254`, `10.x`, `192.168.x`, IPv6 loopback, a hostname resolving to a private IP, and a valid public URL.
- Integration test for the auth flow and for ownership enforcement (user A cannot read or delete user B's URLs).
- Acceptance checklist:
  1. A new user can sign up, add a URL, and see a first result within 1 minute.
  2. Adding the 6th URL is rejected.
  3. Adding `http://169.254.169.254` or `http://localhost:3000` is rejected.
  4. A deliberately unreachable URL shows Offline with an error reason, and the chart shows a gap.
  5. Old checks are removed by the TTL index after 7 days.
  6. Theme toggle persists across reloads and has no flash of wrong theme.
  7. Layout is usable at 360px width.
  8. The app keeps producing checks in production via the external cron trigger.

## 13. Deliverables

- Working client and server code in a single monorepo with a clear README: setup, environment variables, architecture diagram (text is fine), the SSRF design, and the scheduler-hosting note from section 4.4.
- Deployed live demo URL (Vercel, Render, Atlas) and a seeded demo account.
- Keep the code concise and readable; do not add features beyond this document.

## 14. Out of Scope for v1 (possible extensions)

Email or webhook alerts, public status pages, custom check intervals, response-body assertions, multi-region checks.
