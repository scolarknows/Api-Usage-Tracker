# API Uptime & Latency Monitor

A full-stack, production-ready web application where authenticated users register API or website URLs. A background scheduler checks each URL every 5 minutes, calculates HTTP status and latency, and a responsive frontend dashboard renders live statuses and historical analytics.

---

## Architecture Overview

```
                      +-----------------------------+
                      |         React 19 SPA        |
                      |     (Vite + Tailwind v4)     |
                      +--------------+--------------+
                                     |
                             REST API (JSON)
                      +--------------v--------------+
                      |      Express + Node.js      |
                      |      (TypeScript ESNext)    |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
     +---------v---------+ +---------v---------+ +---------v---------+
     |   MongoDB Atlas   | |  node-cron / HTTP  | |  SSRF Guard & DNS |
     | (Mongoose Models) | |  Internal Scheduler| |  Rebinding Engine |
     +-------------------+ +-------------------+ +-------------------+
```

- **Client (`/client`)**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Recharts, Sonner toasts, Lucide icons.
- **Server (`/server`)**: Node.js, Express, TypeScript, MongoDB (Mongoose), JWT authentication, Zod validation, Pino logger, Node-cron, Helmet, Rate Limiting, SSRF Protection.

---

## Features

- **Authentication & Security**:
  - Secure bcrypt password hashing (cost 12), JWT authentication (7-day bearer tokens).
  - Rate limiting on authentication routes (10 requests per 15 min per IP) and API endpoints.
  - NoSQL injection protection (`express-mongo-sanitize`), request body size capped at 10kb.
  - Strict Helmet security headers and CORS restricted to configured client origin.
- **SSRF Protection & DNS Rebinding Defense**:
  - Allows only `http` / `https` URLs and rejects embedded credentials (`user:pass@`).
  - Blocks local, private, reserved, loopback, CGNAT, and link-local address spaces (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped IPv6).
  - Re-validates at check time and connects directly to the resolved IP to mitigate DNS rebinding.
  - Re-validates redirect targets up to 3 redirects.
- **Monitoring Engine & Dual Scheduler**:
  - Checks URLs with bounded concurrency (10 parallel requests) and 10s timeouts.
  - Monotonic high-resolution clock (`performance.now()`) for latency calculation.
  - `HEAD` with fallback to `GET` on 405/501 status codes.
  - Dual scheduling: In-process `node-cron` every 5 minutes + protected `POST /api/internal/run-checks` endpoint for external schedulers (e.g. cron-job.org / UptimeRobot) to keep free-tier instances (like Render) awake.
  - Overlapping run lock prevents duplicate monitoring runs.
- **Data Retention & Capacity**:
  - Check history is automatically purged after 7 days using MongoDB TTL indexes (`expireAfterSeconds: 604800`).
  - Compound indexes on `{ urlId, timestamp }` and `{ userId, url }` ensure fast range and uniqueness queries.
  - Per-user cap of 5 URLs: ~1,440 checks per user every 5 days, staying well within the free MongoDB Atlas tier (512MB).
- **Dashboard & Analytics**:
  - Light mode (Cream `#F2DACE` & Wine `#7C0E44`) and Dark mode (Dark `#1E0A14` & Rose `#D49A9A`) with anti-flash script and WCAG AA contrast.
  - Responsive table layout collapsing to stacked cards on mobile screens (<768px).
  - Detailed analytics with Recharts: latency trend line, range selector (24h / 7d), uptime percentage, average latency, p95 latency, and incident error logs.
  - Gaps rendered for failed checks instead of misleading zero-latency plots.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Port for Express server | `4000` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/uptime` |
| `JWT_SECRET` | Secret key for JWT signing (min 16 chars) | `replace-with-a-long-random-string` |
| `CLIENT_ORIGIN`| Allowed CORS frontend origin | `http://localhost:5173` |
| `CRON_SECRET`  | Secret for `POST /api/internal/run-checks` (min 16 chars) | `replace-with-cron-secret` |
| `NODE_ENV`     | Runtime environment (`development`, `production`, `test`) | `development` |

### Client (`client/.env`)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for backend API | `http://localhost:4000/api` |

---

## Local Development & Setup

### Prerequisites
- Node.js (v20+)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Installation
This is an npm workspaces monorepo. One command installs all dependencies:
```bash
npm install
```

### 2. Configuration
Create `.env` in `server/` and `client/`:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Verification & Tests
Run typecheck, lint, and test suites across all packages:
```bash
# Typecheck (both packages)
npm run typecheck

# Linting (both packages)
npm run lint

# Run all test suites (both packages)
npm run test
```

**Test coverage breakdown**:
| Package | Test Files | Tests |
|:---|:---|:---|
| `server` | 5 (SSRF, Auth, URL routes, Monitor, Stats) | 77 |
| `client` | 2 (StatusBadge, ThemeContext) | 4 |
| **Total** | **7** | **81** |

> **Note**: Server tests require network access (MongoMemoryServer). Run from a terminal with internet access, not inside a restricted sandbox.

### 4. Running Locally
Run server and client concurrently:
```bash
npm run dev
```
- Client runs on: `http://localhost:5173`
- Server runs on: `http://localhost:4000`

---

## Project Structure

```
api-uptime-monitor/
├── client/                      # React 19 SPA (Vite)
│   ├── src/
│   │   ├── api/                 # Axios client with JWT interceptor
│   │   ├── components/          # Header, Modals, Charts, Badges
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── hooks/               # useUrls, useChecks (with auto-refresh)
│   │   ├── pages/               # Login, Signup, Dashboard, Detail
│   │   ├── types/               # Shared TypeScript interfaces
│   │   └── lib/                 # Utilities (cn, date formatting)
│   ├── .env.example
│   └── vite.config.ts
└── server/                      # Express API
    ├── src/
    │   ├── config/              # Env validation (Zod), constants
    │   ├── db/                  # Mongoose connection
    │   ├── jobs/                # node-cron scheduler
    │   ├── middleware/          # Auth, rate-limit, validate, error-handler
    │   ├── models/              # User, MonitoredUrl, Check (Mongoose)
    │   ├── repositories/        # DB access layer
    │   ├── routes/              # Auth, URL, Health, Internal routes
    │   └── services/            # Auth, Monitor, SSRF, Stats, Token, URLs
    ├── .env.example
    └── vitest.config.ts
```

---

## Production Deployment Guide

### 1. Database (MongoDB Atlas)
1. Create a free M0 cluster on MongoDB Atlas.
2. Under Network Access, allow IP access (or `0.0.0.0/0` with user/pass authentication).
3. Copy the connection URI into `MONGODB_URI`.

### 2. Backend (Render)
1. Create a **Web Service** pointing to the repository.
2. Root Directory: `server`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Set environment variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `CRON_SECRET`, `NODE_ENV=production`).

### 3. External Cron (cron-job.org or UptimeRobot)
Render free services spin down after 15 minutes of inactivity. To keep checks firing every 5 minutes and keep the instance alive:
1. Create a free recurring job on [cron-job.org](https://cron-job.org).
2. URL: `https://your-render-backend.onrender.com/api/internal/run-checks`
3. Method: `POST`
4. Schedule: Every 5 minutes (`*/5 * * * *`)
5. Request Header: `x-cron-secret: <YOUR_CRON_SECRET>`

> **Tip**: Generate a strong secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Set the same value as `CRON_SECRET` in Render and as the header value in cron-job.org.

### 4. Frontend (Vercel)
1. Import repository on Vercel.
2. Root Directory: `client`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Set Environment Variable: `VITE_API_URL=https://your-render-backend.onrender.com/api`
7. After Vercel deploys, go back to Render and update `CLIENT_ORIGIN` to your Vercel URL (e.g. `https://your-app.vercel.app`). This is required for CORS to allow frontend requests.

---

## Acceptance Criteria Checklist

- [x] A new user can sign up, add a URL, and see results.
- [x] Adding a 6th URL is rejected with status 400.
- [x] Adding `http://169.254.169.254` or `http://localhost:3000` is rejected by SSRF guard.
- [x] Deliberately unreachable URL shows Offline with error reason and gap in chart.
- [x] Old checks are automatically purged after 7 days by TTL index.
- [x] Theme toggle persists across reloads without theme flash.
- [x] Mobile-responsive layout collapses table to cards at 360px and 768px.
- [x] Continuous monitoring supported in production via external cron trigger.
