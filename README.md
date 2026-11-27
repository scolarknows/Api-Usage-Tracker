# LaMon — API & URL Uptime & Latency Monitor

A full-stack web application for monitoring API and website uptime and latency. Users can sign up, add up to 5 URLs, and view live status badges, uptime percentages, and latency charts on a clean dashboard while a background scheduler checks each endpoint every 5 minutes.

## Live Demo

- **Frontend (Vercel):** https://api-usage-tracker-rose.vercel.app
- **Backend (Render):** https://api-usage-tracker-backend.onrender.com
- **Database:** MongoDB Atlas (free tier)

## Architecture

```
┌─────────────┐     HTTPS      ┌─────────────┐     MongoDB      ┌─────────────┐
│   Browser   │ ◄─────────────► │   Express   │ ◄──────────────► │   MongoDB   │
│   (React)   │                 │   (Node.js) │                  │   (Atlas)   │
└─────────────┘                 └─────────────┘                  └─────────────┘
       ▲                              ▲
       │         External Cron        │
       └──────────────────────────────┘
        cron-job.org / UptimeRobot
        calls POST /api/internal/run-checks
        every 5 minutes with x-cron-secret
```

### Monorepo Structure

```
/client   Vite + React 19 + TypeScript + Tailwind CSS v4 + Recharts
/server   Express + TypeScript + Mongoose + JWT + node-cron
```

## Quick Start (Local Development)

### Prerequisites

- Node.js ≥ 20
- MongoDB (local or Atlas connection string)

### Installation

```bash
# Install root dependencies (includes concurrently for dev)
npm install

# Install workspace dependencies
npm install --workspaces
```

### Environment Variables

> **Note:** The values below are for **local development only** (your machine). For production, set these in your hosting platform dashboards (Vercel/Render), not in the repo. The `.env` files are gitignored.

**Server** (`server/.env` for local dev):
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/uptime
JWT_SECRET=your-long-random-secret-at-least-16-chars
CLIENT_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
CRON_SECRET=your-different-long-random-secret
NODE_ENV=development
```

**Client** (`client/.env` for local dev):
```env
VITE_API_URL=http://localhost:4000/api
```

**Production values (set in platform dashboards):**

| Variable | Render (Backend) | Vercel (Frontend) |
|----------|------------------|-------------------|
| `PORT` | `10000` (Render assigns) | — |
| `MONGODB_URI` | Your Atlas connection string | — |
| `JWT_SECRET` | Long random string (≥16 chars) | — |
| `CLIENT_ORIGIN` | `https://your-frontend.vercel.app` | — |
| `CRON_SECRET` | Long random string (for external cron) | — |
| `NODE_ENV` | `production` | — |
| `VITE_API_URL` | — | `https://your-backend.onrender.com/api` |

Copy from `.env.example` files and fill in your local values. For production, configure in Vercel/Render project settings.

### Development

```bash
# Run both client and server concurrently
npm run dev

# Or run individually:
npm run dev --workspace=server   # http://localhost:4000
npm run dev --workspace=client   # http://localhost:5173
```

### Build & Typecheck

```bash
npm run build       # Builds both workspaces
npm run typecheck   # TypeScript check both workspaces
npm run lint        # ESLint both workspaces
npm run test        # Vitest both workspaces
```

## API Specification

All routes prefixed `/api`. All responses JSON. Errors: `{ "error": "message" }`.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/signup | No | Create account, return token |
| POST | /auth/login | No | Return token |
| GET | /auth/me | Yes | Current user |
| POST | /urls | Yes | Add URL (SSRF validated) |
| GET | /urls | Yes | List user's URLs with latest status & 24h uptime |
| GET | /urls/:id/checks?range=24h\|7d | Yes | Check history for charts |
| DELETE | /urls/:id | Yes | Delete URL and its checks |
| POST | /internal/run-checks | Secret header | Trigger a monitoring run |
| GET | /health | No | Health check |

**Ownership enforcement:** Every `:id` route verifies the resource belongs to the authenticated user (returns 404, not 403).

## Security

### SSRF Protection (Critical)

The server fetches user-supplied URLs, so it must block internal targets:

1. **Scheme validation** — Only `http` and `https` allowed; credentials (`user:pass@`) rejected.
2. **Hostname blocklist** — `localhost`, `*.local`, `*.internal`, `metadata.google.internal`, `metadata.internal`.
3. **DNS resolution & IP blocklist** — Resolves hostname and rejects if any IP falls in private/reserved ranges:
   - IPv4: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (cloud metadata), `0.0.0.0/8`, `100.64.0.0/10`, `192.0.0.0/24`, `192.0.2.0/24`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`, `240.0.0.0/4`
   - IPv6: `::1`, `fc00::/7` (ULA), `fe80::/10` (link-local), `ff00::/8` (multicast), IPv4-mapped IPv6 (`::ffff:x.x.x.x`)
4. **Re-validation at check time** — DNS is resolved fresh on every check; connection uses the validated IP to prevent DNS rebinding.
5. **Redirect validation** — Each redirect target is re-validated before following; max 3 redirects.

Implementation: `server/src/services/ssrf.ts` with 30 unit tests covering all blocked ranges and valid public URLs.

### Other Security Measures

- **Rate limiting:** `express-rate-limit` — 10 req/15min per IP on `/api/auth/*`, 300 req/15min on other routes.
- **Helmet** for security headers; **CORS** restricted to `CLIENT_ORIGIN` only.
- **Input validation:** Zod schemas on all bodies; JSON body limit 10kb.
- **NoSQL injection protection:** `express-mongo-sanitize` middleware.
- **Secrets** only in environment variables; `.env.example` provided; `.env` gitignored.
- **Generic auth errors** — Login failure doesn't reveal if email exists.
- **No stack traces** in production error responses.
- **Structured logging** (pino) — never logs passwords or tokens.

## Monitoring Engine

- **Scheduler:** `node-cron` runs every 5 minutes (`*/5 * * * *`).
- **Concurrency:** Bounded to 10 simultaneous requests (`CHECK_CONCURRENCY`).
- **Per-request:** 10 second timeout, max 3 redirects, `HEAD` first with fallback to `GET` on 405/501.
- **User-Agent:** `UptimeMonitorBot/1.0`.
- **Latency measurement:** Monotonic clock (`performance.now()`), not `Date.now()`.
- **Check result:** `urlId`, `timestamp`, `statusCode` (null on network failure), `latencyMs`, `isUp` (200-399 = up), `error` (e.g., `TIMEOUT`, `DNS_FAILURE`, `CONNECTION_REFUSED`).
- **Parent URL update:** `lastStatus`, `lastLatencyMs`, `lastCheckedAt`.
- **Overlap prevention:** If a run is in progress, the next tick is skipped.
- **Startup run:** One check runs immediately on server start so dashboard isn't empty.
- **Error isolation:** Failures in one check never crash the process; caught and logged per URL.

## Data Retention

- **Check history:** 7 days via MongoDB TTL index on `timestamp` (`expireAfterSeconds: 604800`).
- **Indexes:** `{urlId, timestamp}` for fast range queries.
- **Volume estimate:** 5 URLs × 288 checks/day = 1,440 checks/day (~10,080 checks over 7 days) — well within Atlas free tier (512 MB).

## Scheduler Hosting (Important for Render)

Render free web services spin down after ~15 minutes without inbound traffic, stopping in-process `node-cron`. This project implements **both**:

1. **In-process `node-cron`** — Works for local development and always-on hosts.
2. **External cron endpoint:** `POST /api/internal/run-checks` requiring header `x-cron-secret` matching `CRON_SECRET` env var.

**Production setup:** Configure an external free scheduler (cron-job.org, UptimeRobot, or GitHub Actions) to call:
```
POST https://your-backend.onrender.com/api/internal/run-checks
Header: x-cron-secret: YOUR_CRON_SECRET
Schedule: Every 5 minutes
```

This keeps the Render instance awake and ensures checks run reliably.

## Frontend Features

- **Auth:** Email/password signup & login with live password strength feedback (8–72 chars, uppercase, lowercase, number, special character) and show/hide password toggle.
- **Dashboard:** Table (desktop) / cards (mobile <768px) with name, URL, status badge (Online/Offline/Pending), last latency, 24h uptime %, last checked (relative time).
- **Add URL:** Modal with inline validation, 5-URL cap enforced.
- **Delete URL:** Confirmation modal.
- **Detail view:** Recharts line chart (24h/7d range), uptime %, average latency, p95 latency, recent failures table.
- **Chart behavior:** Failed checks show as gaps (not zero latency) via `connectNulls={false}`.
- **Auto-refresh:** Every 60 seconds on both dashboard and detail pages.
- **Theme:** Light/dark mode with OS preference default, persisted in localStorage, no flash (class applied before paint).
- **Typography:** Story Script for headings/logo; system sans-serif for body; monospace for URLs/latency.
- **Accessibility:** Semantic HTML, labelled forms, visible focus rings, keyboard-operable dialogs, status conveyed by text + color.

## Deployment

### Backend (Render)

1. Create new **Web Service** from GitHub repo.
2. Root directory: `server`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Environment variables: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `CRON_SECRET`, `NODE_ENV=production`
6. Add external cron (cron-job.org) calling `POST /api/internal/run-checks` every 5 minutes

### Frontend (Vercel)

1. Import GitHub repo.
2. Root directory: `client`
3. Framework: Vite (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`

### Database (MongoDB Atlas)

1. Create free M0 cluster.
2. Add database user and network access (0.0.0.0/0 for Render).
3. Connection string → `MONGODB_URI`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, React Router v7 |
| Backend | Node.js, Express, TypeScript, Mongoose, JWT (jsonwebtoken), bcrypt, node-cron |
| Security | helmet, cors, express-rate-limit, express-mongo-sanitize, zod |
| Logging | pino |
| Testing | Vitest, mongodb-memory-server, supertest, @testing-library/react |
| Dev Tools | ESLint (typescript-eslint), concurrently, tsx |

## License

MIT