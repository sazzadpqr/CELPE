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
