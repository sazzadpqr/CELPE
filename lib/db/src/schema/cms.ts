import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const studyCategories = pgTable("study_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("book"),
  color: text("color").notNull().default("#185FA5"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studyMaterials = pgTable("study_materials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoryId: text("category_id").references(() => studyCategories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  content: text("content").notNull().default(""),
  level: text("level").notNull().default("B1"),
  materialType: text("material_type").notNull().default("article"),
  externalUrl: text("external_url").notNull().default(""),
  audioUrl: text("audio_url").notNull().default(""),
  videoUrl: text("video_url").notNull().default(""),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  isPremium: boolean("is_premium").notNull().default(false),
  status: text("status").notNull().default("draft"),
  order: integer("order").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(10),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const featureFlags = pgTable("feature_flags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flagKey: text("flag_key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  category: text("category").notNull().default("general"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appBanners = pgTable("app_banners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  type: text("type").notNull().default("info"),
  ctaLabel: text("cta_label").notNull().default(""),
  ctaUrl: text("cta_url").notNull().default(""),
  audience: text("audience").notNull().default("all"),
  active: boolean("active").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const learningPaths = pgTable("learning_paths", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  level: text("level").notNull().default("B1"),
  targetLevel: text("target_level").notNull().default("B2"),
  durationWeeks: integer("duration_weeks").notNull().default(8),
  isPremium: boolean("is_premium").notNull().default(false),
  status: text("status").notNull().default("draft"),
  order: integer("order").notNull().default(0),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const learningPathSteps = pgTable("learning_path_steps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pathId: text("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  stepType: text("step_type").notNull().default("material"),
  linkedId: text("linked_id"),
  externalUrl: text("external_url").notNull().default(""),
  order: integer("order").notNull().default(0),
  isOptional: boolean("is_optional").notNull().default(false),
  estimatedMinutes: integer("estimated_minutes").notNull().default(20),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceToken: text("device_token").notNull(),
  authorName: text("author_name").notNull().default("Anônimo"),
  authorEmoji: text("author_emoji").notNull().default("🎓"),
  content: text("content").notNull(),
  topic: text("topic").notNull().default("geral"),
  likesCount: integer("likes_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  isHidden: boolean("is_hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communityPostLikes = pgTable("community_post_likes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id").notNull(),
  deviceToken: text("device_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userCertificates = pgTable("user_certificates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceToken: text("device_token").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  pathId: text("path_id"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teacherFeedbackRequests = pgTable("teacher_feedback_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceToken: text("device_token").notNull(),
  studentName: text("student_name").notNull().default(""),
  content: text("content").notNull(),
  requestType: text("request_type").notNull().default("escrita"),
  teacherResponse: text("teacher_response").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export const liveEvents = pgTable("live_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  host: text("host").notNull().default(""),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  meetingUrl: text("meeting_url").notNull().default(""),
  topic: text("topic").notNull().default("geral"),
  maxParticipants: integer("max_participants").notNull().default(0),
  isPremiumOnly: boolean("is_premium_only").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
