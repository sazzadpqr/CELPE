import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const examEditions = pgTable("exam_editions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  year: integer("year").notNull(),
  edition: text("edition").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const examTasks = pgTable("exam_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  editionId: text("edition_id").notNull().references(() => examEditions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  genre: text("genre").notNull().default(""),
  description: text("description").notNull().default(""),
  linkUrl: text("link_url"),
  mediaUrl: text("media_url"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
