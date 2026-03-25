# AGENTS.md

## Cursor Cloud specific instructions

### Architecture Overview

Vet Cares (VetVault) is a multi-tenant SaaS veterinary clinic management system. It is an npm workspaces monorepo with:

- **`client/`** — React 18 + Vite 6 frontend (port 5173)
- **`server/`** — Express.js 4 backend (port 3001)
- **MongoDB** — Required database (no auth needed for local dev on `mongodb://localhost:27017`, DB name: `vet-cares`)

### Starting Services

1. **MongoDB**: `mongod --dbpath /data/db --fork --logpath /tmp/mongod.log --bind_ip 127.0.0.1`
2. **Backend + Frontend together**: `npm run dev` (uses `concurrently`)
   - Or separately: `npm run dev:server` / `npm run dev:client`
3. The server `.env` must exist at `server/.env` with at least `MONGODB_URI=mongodb://localhost:27017` and `NODE_ENV=development`.

### Key Gotchas

- **Elasticsearch is optional.** The server prints `Elasticsearch initialization failed` on startup and then says `Continuing without Elasticsearch - using fallback suggestions`. This is expected and not an error.
- **Login flow:** Navigate to `/staff-login` for staff authentication. The app has a known routing quirk where non-subdomain access routes through a `Pages` component that wraps its own Router; this can conflict with `App.jsx`'s Router on some routes.
- **Seed data for testing:** To test interactively, you need to create a tenant and staff user via API (see `POST /api/tenants` and `POST /api/staff`), then log in at `/staff-login`.
- **Lint**: `npm run lint` runs ESLint on the client only. Pre-existing lint errors exist in the codebase (unused vars, etc.) — these are not regressions.
- **Tests**: `npm test` is a no-op (`echo "No tests specified"`). There are no automated test suites.
- **Build**: `npm run build` builds the Vite client to `client/dist/`.

### Optional Services (not required for core functionality)

- **Elasticsearch** (SOAP autocomplete) — server has built-in fallback
- **AWS S3** — file uploads; needs `AWS_S3_ACCESS_KEY_ID` and `AWS_S3_SECRET_ACCESS_KEY` env vars
- **WhatsApp/MyOperator API** — OTP login and invoice delivery
- **Daily.co API** — video consultations
- **Nginx** — subdomain-based multi-tenant routing (only if testing multi-tenant subdomains)
