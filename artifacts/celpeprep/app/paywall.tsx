import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiPlan = {
  id: string;
  planKey: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  billingPeriod: string;
  paddlePriceId: string;
  paddleProductId: string;
  isPopular: boolean;
  trialDays: number;
  features: string[];
};

type PaywallCms = {
  headline: string;
  subheadline: string;
  monthlyPrice: string;
  monthlyLabel: string;
  yearlyPrice: string;
  yearlyLabel: string;
  yearlyBadge: string;
  ctaMonthly: string;
  ctaYearly: string;
  features: string[];
  footnote: string;
};

// ─── Hardcoded fallbacks ───────────────────────────────────────────────────────

const FALLBACK_CMS: PaywallCms = {
  headline: "Desbloqueie o CelpePrep Premium",
  subheadline: "Avaliações ilimitadas, plano adaptativo e muito mais para sua aprovação.",
  monthlyPrice: "R$ 44,99",
  monthlyLabel: "por mês",
  yearlyPrice: "R$ 479,88",
  yearlyLabel: "R$ 39,99/mês — economize 11%",
  yearlyBadge: "Mais popular",
  ctaMonthly: "Assinar Mensal",
  ctaYearly: "Assinar Anual",
  features: [
    "Avaliações de redação ilimitadas por IA",
    "Práticas geradas por IA ilimitadas",
    "Dashboard de fraquezas detalhado",
    "Flashcards SRS ilimitados",
    "Acesso prioritário a novas funcionalidades",
  ],
  footnote: "Cancele quando quiser. Sem fidelidade.",
};

const FALLBACK_PLANS: ApiPlan[] = [
  {
    id: "monthly",
    planKey: "monthly",
    title: "Mensal",
    subtitle: "Acesso completo",
    priceLabel: "R$ 44,99",
    billingPeriod: "monthly",
    paddlePriceId: "",
    paddleProductId: "",
    isPopular: false,
    trialDays: 0,
    features: [],
  },
  {
    id: "annual",
    planKey: "annual",
    title: "Anual",
    subtitle: "Melhor custo-benefício",
    priceLabel: "R$ 479,88",
    billingPeriod: "annual",
    paddlePriceId: "",
    paddleProductId: "",
    isPopular: true,
    trialDays: 0,
    features: [],
  },
];

const BENEFIT_ICONS: Record<number, React.ComponentProps<typeof Feather>["name"]> = {
  0: "cpu",
  1: "zap",
  2: "bar-chart-2",
  3: "book-open",
  4: "star",
  5: "check-circle",
  6: "shield",
};

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { profile, updateProfile } = useApp();

  const [cms, setCms] = useState<PaywallCms>(FALLBACK_CMS);
  const [plans, setPlans] = useState<ApiPlan[]>(FALLBACK_PLANS);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ── Load plans + CMS from backend ──────────────────────────────────────────

  useEffect(() => {
    Promise.allSettled([
      fetch(getApiUrl("/api/content/monetization-plans")).then(r => r.ok ? r.json() as Promise<ApiPlan[]> : null),
      fetch(getApiUrl("/api/content/paywall-cms")).then(r => r.ok ? r.json() as Promise<PaywallCms> : null),
    ]).then(([plansResult, cmsResult]) => {
      if (plansResult.status === "fulfilled" && plansResult.value && plansResult.value.length > 0) {
        // Only show paid plans (exclude free tier on paywall screen)
        const paidPlans = plansResult.value.filter(p => p.billingPeriod !== "free");
        if (paidPlans.length > 0) setPlans(paidPlans);
      }
      if (cmsResult.status === "fulfilled" && cmsResult.value) {
        setCms({ ...FALLBACK_CMS, ...cmsResult.value });
      }
    }).finally(() => setLoadingData(false));
  }, []);

  // Auto-select the popular plan (or first plan) once loaded
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const popular = plans.find(p => p.isPopular) ?? plans[0];
      if (popular) setSelectedPlanId(popular.id);
    }
  }, [plans]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? plans[0];

  // ── Subscribe ────────────────────────────────────────────────────────────────

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/payments/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey: selectedPlan.planKey,
          priceId: selectedPlan.paddlePriceId || undefined,
          deviceToken: profile.deviceToken,
        }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        const msg = data.error ?? "Erro desconhecido";
        alert(msg === "Pagamentos não configurados."
          ? "Os pagamentos ainda não foram configurados pelo administrador. Tente novamente em breve."
          : `Não foi possível iniciar o pagamento: ${msg}`);
      }
    } catch {
      alert("Não foi possível iniciar o pagamento. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Restore ──────────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await fetch(getApiUrl(`/api/payments/status?token=${profile.deviceToken}`));
      const data = await res.json() as { isPremium: boolean };
      if (data.isPremium) {
        await updateProfile({ isPremium: true, aiCreditsTotal: 9999 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alert("Assinatura restaurada com sucesso!");
        router.back();
      } else {
        alert("Nenhuma assinatura ativa encontrada para este dispositivo.");
      }
    } catch {
      alert("Não foi possível verificar sua assinatura.");
    } finally {
      setRestoring(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const features = cms.features.length > 0 ? cms.features : FALLBACK_CMS.features;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>CelpePrep Premium</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 40 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <Feather name="award" size={36} color="#fff" />
          <Text style={styles.heroTitle}>{cms.headline}</Text>
          <Text style={styles.heroSub}>{cms.subheadline}</Text>
        </View>

        {/* Benefits */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>O que está incluso</Text>
        {features.map((feature, i) => (
          <View key={i} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name={BENEFIT_ICONS[i % 7] ?? "check"} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.benefitText, { color: colors.text }]}>{feature}</Text>
          </View>
        ))}

        {/* Plans */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Escolha seu plano</Text>

        {loadingData ? (
          <View style={[styles.loadingPlans, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Carregando planos...</Text>
          </View>
        ) : (
          plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isPopular = plan.isPopular;
            return (
              <Pressable
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  setSelectedPlanId(plan.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                {isPopular && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>
                      {plan.billingPeriod === "annual" ? cms.yearlyBadge || "Mais popular" : "Mais popular"}
                    </Text>
                  </View>
                )}
                <View style={styles.planTop}>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {isSelected && <Feather name="check" size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.planLabel, { color: colors.text }]}>{plan.title}</Text>
                  {plan.billingPeriod === "annual" && (
                    <View style={[styles.savingsPill, { backgroundColor: "#D1FAE5" }]}>
                      <Text style={[styles.savingsText, { color: "#059669" }]}>2 meses grátis</Text>
                    </View>
                  )}
                </View>
                <View style={styles.planPriceRow}>
                  <Text style={[styles.planPrice, { color: isSelected ? colors.primary : colors.text }]}>
                    {plan.priceLabel}
                  </Text>
                  <Text style={[styles.planDetail, { color: colors.mutedForeground }]}>
                    {plan.billingPeriod === "monthly"
                      ? cms.monthlyLabel
                      : plan.billingPeriod === "annual"
                      ? cms.yearlyLabel
                      : plan.subtitle}
                  </Text>
                </View>
                {plan.trialDays > 0 && (
                  <View style={[styles.trialBadge, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.trialText, { color: colors.primary }]}>
                      {plan.trialDays} dias grátis para experimentar
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}

        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
          {cms.footnote || "A assinatura é renovada automaticamente. Cancele a qualquer momento."}
        </Text>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          style={[
            styles.subscribeBtn,
            { backgroundColor: loading || loadingData ? colors.muted : colors.primary },
          ]}
          onPress={handleSubscribe}
          disabled={loading || loadingData || !selectedPlan}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.subscribeBtnText}>
                {selectedPlan?.billingPeriod === "annual"
                  ? cms.ctaYearly || "Assinar Anual"
                  : cms.ctaMonthly || "Assinar Mensal"}
              </Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </Pressable>
        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreBtn}
        >
          {restoring ? (
            <ActivityIndicator color={colors.mutedForeground} size="small" />
          ) : (
            <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
              Restaurar compra
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14, paddingTop: 20 },
  heroCard: { borderRadius: 20, padding: 24, alignItems: "center", gap: 10 },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  loadingPlans: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  planCard: { borderRadius: 16, padding: 16, gap: 8 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  planTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  planLabel: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  savingsPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  savingsText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginLeft: 32,
  },
  planPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planDetail: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, flexWrap: "wrap" },
  trialBadge: {
    marginLeft: 32,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trialText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  legalText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: Platform.OS === "web" ? 16 : 32,
    borderTopWidth: 1,
    gap: 10,
  },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
  subscribeBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  restoreBtn: { alignItems: "center", paddingVertical: 4 },
  restoreText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
