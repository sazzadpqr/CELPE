import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

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
    id: "monthly", planKey: "monthly", title: "Mensal",
    subtitle: "Acesso completo", priceLabel: "R$ 44,99",
    billingPeriod: "monthly", paddlePriceId: "", paddleProductId: "",
    isPopular: false, trialDays: 0, features: [],
  },
  {
    id: "annual", planKey: "annual", title: "Anual",
    subtitle: "Melhor custo-benefício", priceLabel: "R$ 479,88",
    billingPeriod: "annual", paddlePriceId: "", paddleProductId: "",
    isPopular: true, trialDays: 0, features: [],
  },
];

const BENEFIT_ICONS: Record<number, React.ComponentProps<typeof Feather>["name"]> = {
  0: "cpu", 1: "zap", 2: "bar-chart-2", 3: "book-open",
  4: "star", 5: "check-circle", 6: "shield",
};

type InterestState = "idle" | "submitting" | "done";

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

  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [interestEmail, setInterestEmail] = useState(profile.email ?? "");
  const [interestState, setInterestState] = useState<InterestState>("idle");

  useEffect(() => {
    Promise.allSettled([
      fetch(getApiUrl("/api/content/monetization-plans")).then(r => r.ok ? r.json() as Promise<ApiPlan[]> : null),
      fetch(getApiUrl("/api/content/paywall-cms")).then(r => r.ok ? r.json() as Promise<PaywallCms> : null),
      fetch(getApiUrl("/api/content/payment-config")).then(r => r.ok ? r.json() as Promise<{ paymentsEnabled: boolean }> : null),
    ]).then(([plansResult, cmsResult, configResult]) => {
      if (plansResult.status === "fulfilled" && plansResult.value && plansResult.value.length > 0) {
        const paidPlans = plansResult.value.filter(p => p.billingPeriod !== "free");
        if (paidPlans.length > 0) setPlans(paidPlans);
      }
      if (cmsResult.status === "fulfilled" && cmsResult.value) {
        setCms({ ...FALLBACK_CMS, ...cmsResult.value });
      }
      if (configResult.status === "fulfilled" && configResult.value !== null) {
        setPaymentsEnabled(configResult.value?.paymentsEnabled ?? false);
      } else {
        setPaymentsEnabled(false);
      }
    }).finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const popular = plans.find(p => p.isPopular) ?? plans[0];
      if (popular) setSelectedPlanId(popular.id);
    }
  }, [plans]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? plans[0];

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
        Alert.alert(
          "Pagamento indisponível",
          "Os pagamentos ainda não foram ativados. Use o botão abaixo para registrar seu interesse e ser avisado em primeira mão.",
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert("Erro de conexão", "Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await fetch(getApiUrl(`/api/payments/status?token=${profile.deviceToken}`));
      const data = await res.json() as { isPremium: boolean };
      if (data.isPremium) {
        await updateProfile({ isPremium: true, aiCreditsTotal: 9999 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Assinatura restaurada!", "Seu acesso premium foi ativado.");
        router.back();
      } else {
        Alert.alert("Sem assinatura ativa", "Nenhuma assinatura encontrada para este dispositivo.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível verificar sua assinatura.");
    } finally {
      setRestoring(false);
    }
  };

  const handleRegisterInterest = async () => {
    if (!profile.deviceToken) return;
    setInterestState("submitting");
    try {
      await fetch(getApiUrl("/api/payments/register-interest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceToken: profile.deviceToken,
          email: interestEmail.trim(),
          planKey: selectedPlan?.planKey ?? "unknown",
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInterestState("done");
    } catch {
      setInterestState("idle");
      Alert.alert("Erro", "Não foi possível registrar. Tente novamente.");
    }
  };

  const features = cms.features.length > 0 ? cms.features : FALLBACK_CMS.features;
  const isPaymentsReady = paymentsEnabled === true;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
          <Feather name="x" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>CelpePrep Premium</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 120 : 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroIconWrap}>
            <Feather name="award" size={30} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{cms.headline}</Text>
          <Text style={styles.heroSub}>{cms.subheadline}</Text>
        </View>

        {/* ── Benefits ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>O que está incluso</Text>
        <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {features.map((feature, i) => (
            <View key={i} style={[styles.benefitRow, i < features.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name={BENEFIT_ICONS[i % 7] ?? "check"} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>{feature}</Text>
              <Feather name="check" size={14} color={colors.primary} />
            </View>
          ))}
        </View>

        {/* ── Plans ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Escolha seu plano</Text>

        {loadingData ? (
          <View style={[styles.loadingPlans, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Carregando planos...</Text>
          </View>
        ) : (
          <View style={styles.plansGrid}>
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isSelected ? colors.primary + "0e" : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedPlanId(plan.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {plan.isPopular && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>{plan.billingPeriod === "annual" ? cms.yearlyBadge || "Mais popular" : "Mais popular"}</Text>
                    </View>
                  )}
                  <View style={styles.planTop}>
                    <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : "transparent" }]}>
                      {isSelected && <Feather name="check" size={11} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planLabel, { color: colors.text }]}>{plan.title}</Text>
                      <Text style={[styles.planSub, { color: colors.mutedForeground }]}>{plan.subtitle}</Text>
                    </View>
                    {plan.billingPeriod === "annual" && (
                      <View style={[styles.savingsPill, { backgroundColor: "#D1FAE5" }]}>
                        <Text style={[styles.savingsText, { color: "#059669" }]}>2 meses grátis</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.planPrice, { color: isSelected ? colors.primary : colors.text }]}>
                    {plan.priceLabel}
                    <Text style={[styles.planPriceSuffix, { color: colors.mutedForeground }]}>
                      {plan.billingPeriod === "monthly" ? " /mês" : plan.billingPeriod === "annual" ? " /ano" : ""}
                    </Text>
                  </Text>
                  {plan.billingPeriod === "annual" && (
                    <Text style={[styles.planSubprice, { color: colors.mutedForeground }]}>{cms.yearlyLabel}</Text>
                  )}
                  {plan.trialDays > 0 && (
                    <View style={[styles.trialBadge, { backgroundColor: colors.primary + "18" }]}>
                      <Feather name="gift" size={11} color={colors.primary} />
                      <Text style={[styles.trialText, { color: colors.primary }]}>{plan.trialDays} dias grátis para experimentar</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Interest form (when payments not configured) ── */}
        {!loadingData && !isPaymentsReady && (
          <View style={[styles.interestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {interestState === "done" ? (
              <View style={styles.interestDone}>
                <View style={[styles.interestDoneIcon, { backgroundColor: "#22c55e18" }]}>
                  <Feather name="check-circle" size={28} color="#22c55e" />
                </View>
                <Text style={[styles.interestDoneTitle, { color: colors.text }]}>Interesse registrado!</Text>
                <Text style={[styles.interestDoneSub, { color: colors.mutedForeground }]}>
                  Você será avisado assim que o Premium estiver disponível para compra.
                </Text>
                <Pressable
                  style={[styles.interestDoneBtn, { backgroundColor: colors.muted }]}
                  onPress={() => router.back()}
                >
                  <Text style={[styles.interestDoneBtnText, { color: colors.mutedForeground }]}>Voltar</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.interestHeader}>
                  <View style={[styles.interestIconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Feather name="bell" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.interestTitle, { color: colors.text }]}>Avise-me quando estiver disponível</Text>
                    <Text style={[styles.interestSub, { color: colors.mutedForeground }]}>
                      Pagamentos em breve. Registre seu e-mail e seja o primeiro a saber.
                    </Text>
                  </View>
                </View>
                <View style={[styles.interestInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="mail" size={15} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.interestInput, { color: colors.text }]}
                    value={interestEmail}
                    onChangeText={setInterestEmail}
                    placeholder="seu@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Pressable
                  style={[styles.interestBtn, { backgroundColor: interestState === "submitting" ? colors.mutedForeground : colors.primary }]}
                  onPress={handleRegisterInterest}
                  disabled={interestState === "submitting"}
                >
                  {interestState === "submitting" ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="bell" size={15} color="#fff" />
                      <Text style={styles.interestBtnText}>Quero ser avisado</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        )}

        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
          {cms.footnote || "A assinatura é renovada automaticamente. Cancele a qualquer momento."}
        </Text>
      </ScrollView>

      {/* ── Bottom bar ── */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {isPaymentsReady ? (
            <>
              <Pressable
                style={[styles.subscribeBtn, { backgroundColor: loading || loadingData ? colors.muted : colors.primary }]}
                onPress={handleSubscribe}
                disabled={loading || loadingData || !selectedPlan}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.subscribeBtnText}>
                      {selectedPlan?.billingPeriod === "annual" ? cms.ctaYearly || "Assinar Anual" : cms.ctaMonthly || "Assinar Mensal"}
                    </Text>
                    <Feather name="arrow-right" size={18} color="#fff" />
                  </>
                )}
              </Pressable>
              <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                {restoring ? (
                  <ActivityIndicator color={colors.mutedForeground} size="small" />
                ) : (
                  <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Restaurar compra</Text>
                )}
              </Pressable>
            </>
          ) : interestState === "done" ? null : (
            <View style={[styles.comingSoonBar, { backgroundColor: colors.muted, borderRadius: 14 }]}>
              <Feather name="clock" size={15} color={colors.mutedForeground} />
              <Text style={[styles.comingSoonText, { color: colors.mutedForeground }]}>
                Pagamentos em breve — registre seu interesse acima
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 14, paddingTop: 20 },

  heroCard: { borderRadius: 20, padding: 24, alignItems: "center", gap: 12 },
  heroIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 28 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },

  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },

  benefitsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  benefitIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  benefitText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },

  loadingPlans: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 24, borderRadius: 16, borderWidth: 1,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  plansGrid: { gap: 10 },
  planCard: { borderRadius: 16, padding: 16, gap: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  planTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  planLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  planSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  savingsPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  savingsText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 26, fontFamily: "Inter_700Bold", paddingLeft: 34 },
  planPriceSuffix: { fontSize: 14, fontFamily: "Inter_400Regular" },
  planSubprice: { fontSize: 12, fontFamily: "Inter_400Regular", paddingLeft: 34 },
  trialBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 34 },
  trialText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  interestCard: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 14 },
  interestHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  interestIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  interestTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  interestSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  interestInputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  interestInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  interestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, height: 50 },
  interestBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  interestDone: { alignItems: "center", gap: 12, paddingVertical: 8 },
  interestDoneIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  interestDoneTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  interestDoneSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  interestDoneBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  interestDoneBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  legalText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  bottomBar: { padding: 16, paddingBottom: Platform.OS === "web" ? 16 : 32, borderTopWidth: 1, gap: 10 },
  subscribeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  subscribeBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  restoreBtn: { alignItems: "center", paddingVertical: 4 },
  restoreText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  comingSoonBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  comingSoonText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
