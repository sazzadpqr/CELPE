import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const practicePrompts = pgTable("practice_prompts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  taskType: text("task_type").notNull(),
  genre: text("genre").notNull().default(""),
  difficulty: text("difficulty").notNull().default("B1"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  instructions: text("instructions").notNull().default(""),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const grammarTopics = pgTable("grammar_topics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  category: text("category").notNull(),
  level: text("level").notNull().default("B1"),
  content: text("content").notNull().default(""),
  examples: jsonb("examples").$type<string[]>().notNull().default([]),
  exercises: jsonb("exercises").$type<{ question: string; answer: string }[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wotdEntries = pgTable("wotd_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  word: text("word").notNull(),
  pos: text("pos").notNull(),
  definition: text("definition").notNull(),
  example: text("example").notNull().default(""),
  etymology: text("etymology").notNull().default(""),
  synonyms: jsonb("synonyms").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  usedDate: text("used_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const diagnosticQuestions = pgTable("diagnostic_questions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  level: text("level").notNull(),
  category: text("category").notNull().default("gramatica"),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correct: integer("correct").notNull(),
  explanation: text("explanation").notNull().default(""),
  grammarRule: text("grammar_rule").notNull().default(""),
  timesAnswered: integer("times_answered").notNull().default(0),
  timesCorrect: integer("times_correct").notNull().default(0),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const diagnosticResults = pgTable("diagnostic_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceToken: text("device_token").notNull(),
  level: text("level").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  timeTakenSeconds: integer("time_taken_seconds").notNull().default(0),
  answers: jsonb("answers").$type<{ questionId: string; chosen: number; correct: boolean }[]>().notNull().default([]),
  categoryBreakdown: jsonb("category_breakdown").$type<Record<string, { correct: number; total: number }>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
