import { pgTable, text, boolean, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

export const vocabularyEntries = pgTable("vocabulary_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceToken: text("device_token").notNull(),
  word: text("word").notNull(),
  pos: text("pos").notNull().default(""),
  definition: text("definition").notNull().default(""),
  example: text("example").notNull().default(""),
  translation: text("translation").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  interval: integer("interval").notNull().default(1),
  repetition: integer("repetition").notNull().default(0),
  easeFactor: real("ease_factor").notNull().default(2.5),
  dueDate: text("due_date").notNull(),
  lastReviewed: text("last_reviewed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const flashcardReviews = pgTable("flashcard_reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vocabularyId: text("vocabulary_id").notNull().references(() => vocabularyEntries.id, { onDelete: "cascade" }),
  deviceToken: text("device_token").notNull(),
  grade: integer("grade").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studyPlans = pgTable("study_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceToken: text("device_token").notNull().unique(),
  targetDate: text("target_date").notNull(),
  currentLevel: text("current_level").notNull().default("B1"),
  targetLevel: text("target_level").notNull().default("B2"),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(30),
  weeklyGoalDays: integer("weekly_goal_days").notNull().default(5),
  focusAreas: jsonb("focus_areas").$type<string[]>().notNull().default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studyPlanItems = pgTable("study_plan_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  planId: text("plan_id").notNull().references(() => studyPlans.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  resourceId: text("resource_id"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  order: integer("order").notNull().default(0),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  description: text("description").notNull().default(""),
  level: text("level").notNull().default("B1"),
  category: text("category").notNull().default(""),
  thumbnailUrl: text("thumbnail_url"),
  totalLessons: integer("total_lessons").notNull().default(0),
  estimatedHours: real("estimated_hours").notNull().default(0),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  type: text("type").notNull().default("text"),
  mediaUrl: text("media_url"),
  durationMinutes: integer("duration_minutes").notNull().default(10),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  deviceToken: text("device_token").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
});
