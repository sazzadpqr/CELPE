import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const notificationCampaigns = pgTable("notification_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("general"),
  targetType: text("target_type").notNull().default("all"),
  targetLevel: text("target_level"),
  targetQuery: jsonb("target_query").$type<Record<string, unknown>>().notNull().default({}),
  deepLink: text("deep_link").notNull().default(""),
  externalUrl: text("external_url").notNull().default(""),
  sendInApp: boolean("send_in_app").notNull().default(true),
  sendPush: boolean("send_push").notNull().default(false),
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  targetedCount: integer("targeted_count").notNull().default(0),
  inAppCreatedCount: integer("in_app_created_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userNotifications = pgTable("user_notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceToken: text("device_token").notNull(),
  campaignId: text("campaign_id"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("general"),
  deepLink: text("deep_link").notNull().default(""),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
