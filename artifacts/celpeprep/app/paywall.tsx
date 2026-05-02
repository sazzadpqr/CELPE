import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
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

const BENEFITS = [
  { icon: "cpu" as const, text: "Avaliações IA ilimitadas por mês" },
  { icon: "zap" as const, text: "Geração de prompts IA ilimitada" },
  { icon: "bar-chart-2" as const, text: "Dashboard de fraquezas detalhado" },
  { icon: "book-open" as const, text: "Flashcards SRS sem limite" },
  { icon: "star" as const, text: "Acesso prioritário a novas funcionalidades" },
];

interface Plan {
  id: "monthly" | "yearly";
  label: string;
  price: string;
  priceDetail: string;
  badge?: string;
  savings?: string;
}

const PLANS: Plan[] = [
  {
    id: "monthly",
    label: "Mensal",
    price: "R$ 44,99",
    priceDetail: "por mês",
  },
  {
    id: "yearly",
    label: "Anual",
    price: "R$ 39,99",
    priceDetail: "/mês — R$ 479,88/ano",
    badge: "Mais popular",
    savings: "Economize R$ 60/ano",
  },
];

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { profile, updateProfile } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/payments/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, deviceToken: profile.deviceToken }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        throw new Error(data.error ?? "Erro desconhecido");
      }
    } catch (e) {
      alert("Não foi possível iniciar o pagamento. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/payments/status?token=${profile.deviceToken}`)
      );
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
        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <Feather name="award" size={36} color="#fff" />
          <Text style={styles.heroTitle}>Prepare-se sem limites</Text>
          <Text style={styles.heroSub}>
            Avaliações IA ilimitadas e recursos avançados para você passar no Celpe-Bras.
          </Text>
        </View>

        <Text style={[styles.benefitsTitle, { color: colors.text }]}>
          O que está incluso
        </Text>
        {BENEFITS.map((b) => (
          <View key={b.text} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name={b.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.benefitText, { color: colors.text }]}>{b.text}</Text>
          </View>
        ))}

        <Text style={[styles.plansTitle, { color: colors.text }]}>Escolha seu plano</Text>
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
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
                setSelectedPlan(plan.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {plan.badge ? (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              ) : null}
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
                <Text style={[styles.planLabel, { color: colors.text }]}>{plan.label}</Text>
                {plan.savings ? (
                  <View style={[styles.savingsPill, { backgroundColor: "#D1FAE5" }]}>
                    <Text style={[styles.savingsText, { color: "#059669" }]}>{plan.savings}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: isSelected ? colors.primary : colors.text }]}>
                  {plan.price}
                </Text>
                <Text style={[styles.planDetail, { color: colors.mutedForeground }]}>
                  {plan.priceDetail}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
          A assinatura é renovada automaticamente. Cancele a qualquer momento.
        </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.subscribeBtn, { backgroundColor: loading ? colors.muted : colors.primary }]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.subscribeBtnText}>Assinar agora</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </Pressable>
        <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
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
  content: { paddingHorizontal: 20, gap: 16, paddingTop: 20 },
  heroCard: { borderRadius: 20, padding: 24, alignItems: "center", gap: 10 },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  benefitsTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  benefitText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  plansTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  planCard: { borderRadius: 16, padding: 16, gap: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  planTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  planLabel: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  savingsPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  savingsText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginLeft: 32 },
  planPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planDetail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  legalText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
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
