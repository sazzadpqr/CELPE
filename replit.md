# CelpePrep Workspace

## Overview

pnpm workspace monorepo using TypeScript. CelpePrep is a Brazilian Portuguese learning and Celpe-Bras exam preparation app.

## Artifacts

- **`artifacts/celpeprep`** — Expo (React Native) mobile app, preview path `/celpeprep`
- **`artifacts/api-server`** — Express 5 API server, preview path `/api`, port 8080
- **`artifacts/admin`** — React/Vite admin dashboard, preview path `/admin`, port 23744

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + pino logging
- **Database**: PostgreSQL + Drizzle ORM (currently unused — admin content is JSON on disk)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **AI**: OpenAI via Replit AI Integrations (env vars: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY)
- **Build**: esbuild

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec (NOTE: after codegen, overwrite `lib/api-zod/src/index.ts` to only export from `./generated/api` to avoid duplicate export errors)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes

All routes mounted at `/api`:

### AI Routes (no auth)
- `POST /api/ai/feedback` — AI essay evaluation (Celpe-Bras rubric)
- `POST /api/ai/prompt` — AI practice prompt generation
- `GET /api/ai/word-of-day` — AI word of the day (cached daily)

### Session Routes (server-side timer)
- `POST /api/sessions` — Create timed session `{ taskType, durationSeconds }` → `{ sessionId, startTime }`
- `GET /api/sessions/:id` — Poll timer `{ elapsed, remaining, isExpired, submitted }`
- `POST /api/sessions/:id/submit` — Mark session submitted

### Payment Routes (Paddle)
- `POST /api/payments/checkout` — Create Paddle checkout `{ plan, deviceToken }` → `{ url }`
- `GET /api/payments/status?token=` — Check premium status `{ isPremium, plan }`
- `POST /api/webhooks/paddle` — Paddle webhook (subscription.activated, subscription.canceled)

### Admin Routes (Bearer token auth = base64 of SESSION_SECRET)
- `POST /api/admin/auth` — Login, returns token
- `GET /api/admin/stats` — Usage stats (in-memory)
- `GET /api/admin/logs` — Recent request log (in-memory, last 100)
- `GET/POST /api/admin/prompts` — Practice prompts CRUD (stored in `data/prompts.json`)
- `PUT/DELETE /api/admin/prompts/:id`
- `GET/POST /api/admin/grammar` — Grammar topics CRUD (stored in `data/grammar.json`)
- `PUT/DELETE /api/admin/grammar/:id`
- `GET/PUT /api/admin/config` — AI system prompts config (stored in `data/config.json`)

## Mobile Screens

- `app/(tabs)/index.tsx` — Home: streak, AI credits, diagnostic banner (if !diagnosticDone), WOTD
- `app/(tabs)/vocab.tsx` — Vocabulary list + "X to review" CTA → flashcards
- `app/vocab/flashcards.tsx` — SRS flashcard session (Hard/Good/Easy → SM2 intervals)
- `app/(tabs)/study.tsx` — Study plan + Weakness Dashboard (≥3 attempts → rubric analysis)
- `app/diagnostic.tsx` — 15-question grammar diagnostic, sets profile.level + diagnosticDone
- `app/paywall.tsx` — Premium paywall with Paddle checkout (monthly R$44.99 / yearly R$479.88)
- `app/practice/session.tsx` — 25-min timed writing session, syncs with /api/sessions

## Paddle Integration

Requires env vars: `PADDLE_API_KEY`, `PADDLE_MONTHLY_PRICE_ID`, `PADDLE_YEARLY_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_ENV` (sandbox | production). Without these, `/api/payments/checkout` returns 503. Subscriptions stored in `data/subscriptions.json` keyed by deviceToken (UUID auto-generated per device in AppContext).

## Admin Auth

Password = value of `SESSION_SECRET` env var. Token = `btoa(SESSION_SECRET)`. Stored in `localStorage` as `admin_token`.

## Data Storage

- Admin content (prompts, grammar, config): JSON files in `artifacts/api-server/data/`
- Request stats: in-memory (reset on server restart)
- Expo app state: AsyncStorage via `context/AppContext.tsx`

## Key Files

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all routes)
- `lib/api-zod/src/index.ts` — Zod schema barrel (only export from `./generated/api`)
- `artifacts/api-server/src/lib/adminStore.ts` — Admin data store + request tracking
- `artifacts/api-server/src/routes/admin.ts` — Admin API routes
- `artifacts/api-server/src/app.ts` — Express app with request tracking middleware
- `artifacts/celpeprep/context/AppContext.tsx` — Expo app state

## Celpe-Bras Rubric

Four criteria, each 0–5: `tema`, `genero`, `coesao`, `gramatica`. Overall = average.

## Design Tokens (CelpePrep)

- Primary: #185FA5
- Success: #1D9E75
- Warning: #BA7517
- Error: #D85A30
- Purple: #6B21A8
- Background dark: #141924
- Card dark: #1E2535
