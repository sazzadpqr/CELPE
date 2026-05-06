# CelpePrep

CelpePrep is a Brazilian Portuguese learning and Celpe-Bras exam preparation app that helps users improve their language skills and prepare for the official proficiency exam.

## Run & Operate

- **Run API Server**: `npm run start:api` (from `artifacts/api-server`)
- **Run Mobile App**: `npm run start` (from `artifacts/celpeprep`)
- **Run Admin Dashboard**: `npm run dev` (from `artifacts/admin`)
- **Typecheck**: `pnpm run typecheck`
- **Codegen**: `pnpm --filter @workspace/api-spec run codegen` (regenerates API hooks and Zod schemas from OpenAPI spec)
- **DB Push**: `pnpm --filter @workspace/db run push` (pushes DB schema changes; dev only)

**Required Environment Variables**:
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `PADDLE_API_KEY`
- `PADDLE_MONTHLY_PRICE_ID`
- `PADDLE_YEARLY_PRICE_ID`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_ENV` (sandbox | production)
- `SESSION_SECRET` (for admin authentication, default: "admin")
- `EXPO_PUBLIC_DOMAIN` (for production API URL in mobile app)

## Stack

- **Monorepo**: pnpm workspaces
- **Runtime**: Node.js 24
- **Language**: TypeScript 5.9
- **API**: Express 5 + Pino logging
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (v4), `drizzle-zod`
- **API Codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **AI**: OpenAI via Replit AI Integrations
- **Build**: esbuild
- **Mobile**: Expo (React Native)
- **Admin UI**: React/Vite

## Where things live

- **Mobile App**: `artifacts/celpeprep`
- **API Server**: `artifacts/api-server`
- **Admin Dashboard**: `artifacts/admin`
- **Database Schema**: `lib/db/src/schema/` (e.g., `admin.ts`, `content.ts`, `users.ts`)
- **OpenAPI Spec**: `lib/api-spec/openapi.yaml`
- **Admin Content Files**: `artifacts/api-server/data/` (JSON files for study tasks, tips, quick actions, quiz content, etc.)
- **Design Tokens**: Defined within the mobile and admin app stylesheets, following the listed color palette.

## Architecture decisions

- **Server-Driven Content**: Key mobile app content (study plans, tips, quick actions, feature flags, ad configurations) is fetched from the API, allowing dynamic updates without app store releases.
- **Monorepo Structure**: Uses pnpm workspaces to manage shared code (e.g., DB schema, API spec) and separate applications (mobile, API, admin).
- **Feature Flag System**: All major features are controlled by feature flags managed in the admin and stored in the DB, enabling granular rollout and A/B testing.
- **Service Layer for Ads**: AdMob integration is centralized in `services/AdService.ts` and configured via an admin-controlled API endpoint, abstracting ad logic from UI components.
- **Role-Based API Access**: Distinct API endpoints and authentication mechanisms are implemented for public, student, teacher, and admin users, ensuring secure and segregated access to resources.

## Product

- **Learning Platform**: Offers study plans, grammar topics, vocabulary, flashcards (SRS), quizzes, and diagnostic tests.
- **AI-Powered Practice**: Includes AI feedback on writing, prompt generation, AI conversation scenarios, and word-of-the-day features.
- **Social & Community**: Supports leaderboards, community forums, live lessons, and certificate tracking (all feature-flagged).
- **Teacher Management**: Allows teachers to register, manage students, create invite codes, and oversee classes through a dedicated portal.
- **Monetization**: Implements premium subscriptions with Paddle integration, feature gating, and an extensive AdMob integration across various formats.
- **Admin Control**: Comprehensive admin dashboard for content management (courses, quizzes, study materials), user management, configuration (ads, AI, paywall, limits), and feature flag toggling.

## User preferences

_Populate as you build_

## Gotchas

- **Ad Activation**: For real AdMob ads, `react-native-google-mobile-ads` must be installed, `app.json` configured, and stub comments in UI files (`AdBanner.tsx`, `NativeAdCard.tsx`, `feedback.tsx`, `_layout.tsx`) replaced.
- **Admin Authentication**: Admin password is the `SESSION_SECRET` environment variable. The token is `btoa(SESSION_SECRET)` and stored in `localStorage`.
- **Mobile API URL**: Mobile app uses `getApiUrl(path)` which prepends `https://${EXPO_PUBLIC_DOMAIN}` in production; ensure `EXPO_PUBLIC_DOMAIN` is correctly set.
- **Username Conflict**: `PUT /api/profile/:deviceToken` returns 409 on username conflict.

## Pointers

- **Drizzle ORM Docs**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Zod Docs**: [https://zod.dev/](https://zod.dev/)
- **Orval Docs**: [https://orval.dev/](https://orval.dev/)
- **Express Docs**: [https://expressjs.com/](https://expressjs.com/)
- **Expo Docs**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **React Native Google Mobile Ads**: [https://docs.page/invertase/react-native-google-mobile-ads](https://docs.page/invertase/react-native-google-mobile-ads)
- **Paddle Docs**: [https://developer.paddle.com/](https://developer.paddle.com/)