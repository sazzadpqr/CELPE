import { Router } from "express";
import { db } from "@workspace/db";
import { monetizationPlans, paywallVariants, promoCampaigns } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { getStoredPasswordHash } from "../lib/adminStore.js";

const router = Router();

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const token = authHeader.slice(7);
  const storedHash = getStoredPasswordHash();
  const password = storedHash ?? (process.env["SESSION_SECRET"] ?? "admin");
  if (token !== Buffer.from(password).toString("base64")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

const PLANS_SEED = [
  {
    planKey: "free", title: "Gratuito", subtitle: "Para experimentar", priceLabel: "R$ 0",
    billingPeriod: "free", isPopular: false, isActive: true, trialDays: 0, order: 0,
    features: ["5 avaliações por IA por mês","2 práticas geradas por IA por dia","Flashcards ilimitados","Materiais gratuitos"],
  },
  {
    planKey: "monthly", title: "Mensal", subtitle: "Acesso completo", priceLabel: "R$ 44,99",
    billingPeriod: "monthly", isPopular: false, isActive: true, trialDays: 0, order: 1,
    features: ["Avaliações ilimitadas por IA","Práticas ilimitadas","Sem anúncios","Todos os materiais premium","Suporte prioritário"],
  },
  {
    planKey: "annual", title: "Anual", subtitle: "Melhor custo-benefício", priceLabel: "R$ 479,88",
    billingPeriod: "annual", isPopular: true, isActive: true, trialDays: 0, order: 2,
    features: ["Tudo do plano mensal","2 meses grátis","Plano de estudos avançado","Acesso a trilhas premium"],
  },
  {
    planKey: "exam_30_days", title: "30 Dias Intensivo", subtitle: "Para quem tem prova marcada", priceLabel: "R$ 59,90",
    billingPeriod: "one_time_30_days", isPopular: false, isActive: true, trialDays: 0, order: 3,
    features: ["Tudo do plano mensal por 30 dias","Simulados ilimitados","Revisão acelerada"],
  },
];

const PAYWALL_SEED = {
  variantKey: "default",
  title: "Desbloqueie tudo com CelpePrep Premium",
  subtitle: "Avaliações ilimitadas, plano adaptativo e muito mais para sua aprovação.",
  featureList: ["Avaliações de redação ilimitadas por IA","Práticas geradas por IA ilimitadas","Retakes ilimitados","Vocabulário inteligente sem limites","Cursos e materiais premium","Sem anúncios","Plano de estudos avançado"],
  ctaLabel: "Assinar agora",
  secondaryCtaLabel: "Continuar grátis",
  badgeText: "",
  isActive: true,
  audience: "all",
  order: 0,
};

async function seedPlans() {
  const existing = await db.select({ id: monetizationPlans.id }).from(monetizationPlans).limit(1);
  if (existing.length === 0) await db.insert(monetizationPlans).values(PLANS_SEED);
}

async function seedPaywall() {
  const existing = await db.select({ id: paywallVariants.id }).from(paywallVariants).limit(1);
  if (existing.length === 0) await db.insert(paywallVariants).values([PAYWALL_SEED]);
}

// ─── PLANS ────────────────────────────────────────────────────────────────────

router.get("/admin/monetization-plans", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    await seedPlans();
    const rows = await db.select().from(monetizationPlans).orderBy(asc(monetizationPlans.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/monetization-plans", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(monetizationPlans).values({
      planKey: b.planKey ?? `plan_${Date.now()}`,
      title: b.title ?? "Novo Plano", subtitle: b.subtitle ?? "",
      description: b.description ?? "", priceLabel: b.priceLabel ?? "",
      billingPeriod: b.billingPeriod ?? "monthly",
      paddleProductId: b.paddleProductId ?? "", paddlePriceId: b.paddlePriceId ?? "",
      isPopular: b.isPopular ?? false, isActive: b.isActive ?? true,
      trialDays: b.trialDays ?? 0, order: b.order ?? 0,
      features: b.features ?? [], limitsJson: b.limitsJson ?? {},
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/monetization-plans/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(monetizationPlans)
      .set({ title: b.title, subtitle: b.subtitle, description: b.description, priceLabel: b.priceLabel, billingPeriod: b.billingPeriod, paddleProductId: b.paddleProductId, paddlePriceId: b.paddlePriceId, isPopular: b.isPopular, isActive: b.isActive, trialDays: b.trialDays, order: b.order, features: b.features, limitsJson: b.limitsJson, updatedAt: new Date() })
      .where(eq(monetizationPlans.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/monetization-plans/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(monetizationPlans).where(eq(monetizationPlans.id, req.params.id!)).returning({ id: monetizationPlans.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── PAYWALL VARIANTS ─────────────────────────────────────────────────────────

router.get("/admin/paywall-variants", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    await seedPaywall();
    const rows = await db.select().from(paywallVariants).orderBy(asc(paywallVariants.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/paywall-variants", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(paywallVariants).values({
      variantKey: b.variantKey ?? `variant_${Date.now()}`,
      title: b.title ?? "Nova Variante", subtitle: b.subtitle ?? "",
      featureList: b.featureList ?? [], ctaLabel: b.ctaLabel ?? "Assinar agora",
      secondaryCtaLabel: b.secondaryCtaLabel ?? "Continuar grátis",
      badgeText: b.badgeText ?? "", isActive: b.isActive ?? false,
      audience: b.audience ?? "all", order: b.order ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/paywall-variants/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(paywallVariants)
      .set({ title: b.title, subtitle: b.subtitle, featureList: b.featureList, ctaLabel: b.ctaLabel, secondaryCtaLabel: b.secondaryCtaLabel, badgeText: b.badgeText, isActive: b.isActive, audience: b.audience, order: b.order, updatedAt: new Date() })
      .where(eq(paywallVariants.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/paywall-variants/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(paywallVariants).where(eq(paywallVariants.id, req.params.id!)).returning({ id: paywallVariants.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── PROMO CAMPAIGNS ──────────────────────────────────────────────────────────

router.get("/admin/promo-campaigns", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(promoCampaigns).orderBy(asc(promoCampaigns.createdAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/promo-campaigns", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(promoCampaigns).values({
      code: b.code ?? `PROMO${Date.now()}`,
      title: b.title ?? "Nova Promoção", description: b.description ?? "",
      discountLabel: b.discountLabel ?? "", paddleDiscountId: b.paddleDiscountId ?? "",
      startsAt: b.startsAt ? new Date(b.startsAt) : undefined,
      endsAt: b.endsAt ? new Date(b.endsAt) : undefined,
      maxRedemptions: b.maxRedemptions ?? null,
      isActive: b.isActive ?? false,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/promo-campaigns/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(promoCampaigns)
      .set({ title: b.title, description: b.description, discountLabel: b.discountLabel, paddleDiscountId: b.paddleDiscountId, startsAt: b.startsAt ? new Date(b.startsAt) : undefined, endsAt: b.endsAt ? new Date(b.endsAt) : undefined, maxRedemptions: b.maxRedemptions, isActive: b.isActive, updatedAt: new Date() })
      .where(eq(promoCampaigns.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/promo-campaigns/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(promoCampaigns).where(eq(promoCampaigns.id, req.params.id!)).returning({ id: promoCampaigns.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/monetization-plans", async (_req, res) => {
  try {
    await seedPlans();
    const rows = await db.select().from(monetizationPlans).where(eq(monetizationPlans.isActive, true)).orderBy(asc(monetizationPlans.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/paywall-variants", async (_req, res) => {
  try {
    await seedPaywall();
    const rows = await db.select().from(paywallVariants).where(eq(paywallVariants.isActive, true)).orderBy(asc(paywallVariants.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
