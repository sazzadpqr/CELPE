import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const monetizationPlans = pgTable("monetization_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  planKey: text("plan_key").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  description: text("description").notNull().default(""),
  priceLabel: text("price_label").notNull().default(""),
  billingPeriod: text("billing_period").notNull().default("monthly"),
  paddleProductId: text("paddle_product_id").notNull().default(""),
  paddlePriceId: text("paddle_price_id").notNull().default(""),
  isPopular: boolean("is_popular").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  trialDays: integer("trial_days").notNull().default(0),
  order: integer("order").notNull().default(0),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  limitsJson: jsonb("limits_json").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const paywallVariants = pgTable("paywall_variants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  variantKey: text("variant_key").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  featureList: jsonb("feature_list").$type<string[]>().notNull().default([]),
  ctaLabel: text("cta_label").notNull().default("Assinar agora"),
  secondaryCtaLabel: text("secondary_cta_label").notNull().default("Continuar grátis"),
  badgeText: text("badge_text").notNull().default(""),
  isActive: boolean("is_active").notNull().default(false),
  audience: text("audience").notNull().default("all"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const promoCampaigns = pgTable("promo_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  discountLabel: text("discount_label").notNull().default(""),
  paddleDiscountId: text("paddle_discount_id").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  redemptionsCount: integer("redemptions_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
