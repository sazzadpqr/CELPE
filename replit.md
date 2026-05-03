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
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **AI**: OpenAI via Replit AI Integrations (env vars: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY)
- **Build**: esbuild

## Teacher Management System

- **DB tables**: `teachers`, `teacher_invite_codes`, `teacher_students`, `teacher_classes`
- **Admin routes**: `GET/POST/PUT/DELETE /api/admin/teachers`, `POST /api/admin/teacher-codes`, `DELETE /api/admin/teacher-codes/:id`, `DELETE /api/admin/teacher-students/:id`
- **Teacher auth**: `POST /api/teacher/register`, `POST /api/teacher/login` → returns session token (30-day UUID stored in DB)
- **Teacher portal API**: `GET /api/teacher/me`, `GET /api/teacher/dashboard`, `GET/POST/DELETE /api/teacher/codes`, `GET/PUT/DELETE /api/teacher/students`, `GET/POST/PUT/DELETE /api/teacher/classes` (requires `Authorization: Bearer {token}`)
- **Student connect**: `POST /api/student/connect-teacher` (code + deviceToken + studentName), `GET /api/student/my-teachers?deviceToken=...`, `DELETE /api/student/disconnect-teacher`
- **Admin UI**: `/admin/teachers` — full teacher CRUD, view students/codes/classes per teacher
- **Teacher login**: `/admin/teacher-login` — dedicated teacher login (email + password)
- **Teacher portal**: `/admin/teacher-portal` — teacher self-service dashboard (manage codes, students, classes)
- **Mobile screen**: `artifacts/celpeprep/app/teacher-connect.tsx` — enter invite code to connect to teacher, view upcoming classes

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema Files

- `lib/db/src/schema/admin.ts` — adminVaultConfig, adminAdsConfig, adminPaywallConfig, adminLimitsConfig, adminAiConfig, auditLogs
- `lib/db/src/schema/content.ts` — practicePrompts, grammarTopics, wotdEntries, diagnosticQuestions
- `lib/db/src/schema/users.ts` — profiles, attempts, practiceSessions, subscriptions
- `lib/db/src/schema/learning.ts` — vocabularyEntries, flashcardReviews, studyPlans, studyPlanItems, courses, lessons, lessonProgress
- `lib/db/src/schema/conversations.ts` — conversations
- `lib/db/src/schema/messages.ts` — messages
- `lib/db/src/schema/exams.ts` — examEditions, examTasks, examAttempts
- `lib/db/src/schema/quiz.ts` — quizCategories, quizQuestions
- `lib/db/src/schema/cms.ts` — studyCategories, studyMaterials, featureFlags, appBanners, learningPaths, learningPathSteps
- `lib/db/src/schema/notifications.ts` — notificationCampaigns, userNotifications
- `lib/db/src/schema/monetization.ts` — monetizationPlans, paywallVariants, promoCampaigns

## API Route Files

- `artifacts/api-server/src/routes/admin.ts` — core admin routes (stats, logs, security)
- `artifacts/api-server/src/routes/adminExtra.ts` — vault, ads, paywall, diagnostic, limits configs
- `artifacts/api-server/src/routes/adminCms.ts` — study-categories, study-materials, feature-flags, banners, learning-paths (+ content/ read endpoints)
- `artifacts/api-server/src/routes/adminCourses.ts` — courses + lessons CRUD (+ content/courses)
- `artifacts/api-server/src/routes/adminUsers.ts` — users list, toggle-premium, credits, stats/overview
- `artifacts/api-server/src/routes/adminNotifications.ts` — notification-campaigns CRUD + send, /notifications user endpoints
- `artifacts/api-server/src/routes/adminMonetization.ts` — monetization-plans, paywall-variants, promo-campaigns
- `artifacts/api-server/src/routes/ai.ts` — AI feedback, prompt generation, chat, word-of-day
- `artifacts/api-server/src/routes/content.ts` — public content endpoints
- `artifacts/api-server/src/routes/sessions.ts` — server-side timer sessions
- `artifacts/api-server/src/routes/payments.ts` — Paddle checkout, webhooks, status

## Admin Pages

- `/dashboard` — Stats + request log
- `/users` — Paginated user list, toggle premium, adjust AI credits
- `/prompts` — Practice prompt management
- `/grammar` — Grammar topic management
- `/quiz` — Quiz management (categories + questions + lesson content per category; "Lesson Content" tab with full CRUD)
- `/exams` — Exam editions
- `/wotd` — Word-of-day bank
- `/diagnostic` — Diagnostic questions CRUD
- `/study-library` — Study categories + materials CRUD (tabs)
- `/courses` — Courses + lessons CRUD (expand per-course)
- `/learning-paths` — Learning paths + steps CRUD (expandable)
- `/banners` — App banners with scheduling + audience targeting
- `/notifications` — Notification campaigns CRUD + send in-app
- `/feature-flags` — Feature flag toggles grouped by category (14 flags seeded)
- `/monetization` — Plans, paywall variants, promo campaigns (3 tabs)
- `/paywall-cms` — Legacy paywall text/prices/feature list
- `/limits` — Freemium usage limits per feature
- `/ads` — Ads config (AdSense, AdMob, toggles)
- `/config` — AI system prompts config
- `/vault` — API key vault (Paddle, OpenAI, Resend, AdMob)

## Admin Content Store (adminStore.ts)

Quiz categories, questions, WOTD, exams, practice prompts, grammar topics, and quiz lesson content are stored as JSON files in `artifacts/api-server/data/`. Key types: `QuizCategory`, `QuizQuestion`, `QuizLesson` (rule + examples + mistake + tip), `WotdEntry`, `ExamEdition`.

Quiz lesson content is served embedded in `GET /api/content/quiz` (each category includes a `lesson` field). Admin manages lessons via `GET/PUT /api/admin/quiz/categories/:id/lesson`.

## Mobile Screens

- `app/(tabs)/index.tsx` — Home: streak, AI credits, diagnostic banner, WOTD, quick actions
- `app/(tabs)/vocab.tsx` — Vocabulary list + flashcard CTA
- `app/vocab/flashcards.tsx` — SRS flashcard session (SM2 algorithm)
- `app/(tabs)/study.tsx` — Study plan + weakness dashboard
- `app/(tabs)/profile.tsx` — Redesigned profile: emoji/avatar picker, unique @handle username, read-only email, stats, "Sobre o app" link
- `app/courses.tsx` — Course list with premium gating (lock icon + purple badge), plan banner, redirects free users to paywall
- `app/diagnostic.tsx` — 15-question grammar diagnostic
- `app/paywall.tsx` — Premium paywall with Paddle checkout
- `app/practice/session.tsx` — 25-min timed writing session
- `app/oral.tsx` — Oral simulator with task types
- `app/pronunciation.tsx` — Pronunciation practice (phonetic categories)
- `app/conversation.tsx` — AI Conversation scenarios
- `app/library.tsx` — Study resource library
- `app/listening.tsx` — Listening comprehension
- `app/notifications.tsx` — In-app notifications list with read/mark-all
- `app/grammar.tsx` — Grammar quiz with lesson phase; lesson content fetched from `/api/content/quiz` (`lesson` field per category)

## Premium Course Gating

- DB: `courses.is_premium` boolean column
- `GET /api/content/courses` returns `isPremium` field for each course
- Free users see locked courses with lock icon + purple "Premium" badge; tapping redirects to `/paywall`
- Admin `/courses` page shows ⭐ Premium badge in course list; form has "Exclusivo Premium" toggle switch

## User Profile (username + avatar)

- DB: `profiles.username` (unique text), `profiles.avatar_emoji` (text)
- `GET /api/profile/:deviceToken` — returns `username`, `avatarEmoji`, `email`, and all other profile fields
- `PUT /api/profile/:deviceToken` — upserts profile incl. username (409 on conflict) + avatarEmoji
- `GET /api/profile/check-username?username=&deviceToken=` — returns `{ available, handle, reason? }`
- `AppContext` carries `username`, `email`, `avatarEmoji`; `syncProfileToServer()` persists to API

## About App / About URL

- DB: `admin_vault_config.about_url` column (clearable, unlike other vault fields which skip empty)
- `GET /api/content/app-info` — public endpoint returning `{ aboutUrl }`
- Admin `/vault` — "App — Sobre / About" card with URL field
- Profile screen "Sobre o app" row opens URL via `expo-linking` if set, otherwise hidden

## Admin Auth

Password = value of `SESSION_SECRET` env var (default: "admin"). Token = `btoa(SESSION_SECRET)`. Stored in `localStorage` as `admin_token`. All new route files use the same `checkAuth()` pattern from `adminExtra.ts`.

## Design Tokens (CelpePrep)

- Primary: #185FA5
- Success: #1D9E75
- Warning: #BA7517
- Error: #D85A30
- Purple: #6B21A8
- Background dark: #141924
- Card dark: #1E2535

## Paddle Integration

Requires env vars: `PADDLE_API_KEY`, `PADDLE_MONTHLY_PRICE_ID`, `PADDLE_YEARLY_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_ENV` (sandbox | production).

## Mobile API Pattern

Mobile screens use `getApiUrl(path)` which prepends `https://${EXPO_PUBLIC_DOMAIN}` in production. Device token is stored in AppContext and passed as `x-device-token` header for user-specific endpoints.
