import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const quizCategories = pgTable("quiz_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  level: text("level").notNull().default("B1"),
  icon: text("icon").notNull().default("book"),
  color: text("color").notNull().default("#185FA5"),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoryId: text("category_id").notNull().references(() => quizCategories.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correct: integer("correct").notNull(),
  explanation: text("explanation").notNull().default(""),
  level: text("level").notNull().default("B1"),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
