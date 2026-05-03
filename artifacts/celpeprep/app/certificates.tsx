import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView,
  Share, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function getApiUrl(path: string) {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}${path}` : path;
}

type Certificate = {
  id: string; deviceToken: string; title: string;
  description: string; pathId: string | null; issuedAt: string;
};

export default function CertificatesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile.deviceToken) return;
    const load = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/content/certificates/${encodeURIComponent(profile.deviceToken)}`));
        if (res.ok) setCerts(await res.json() as Certificate[]);
      } catch {}
      setLoading(false);
    };
    load();
  }, [profile.deviceToken]);

  const handleShare = async (cert: Certificate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Conquistei o certificado "${cert.title}" no CelpePrep! 🎓 #CelpeBras`,
      });
    } catch {}
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Certificados</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : certs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum certificado ainda</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Complete trilhas de aprendizado ou atividades especiais para ganhar certificados de conquista.
          </Text>
          <Pressable
            style={[styles.pathsBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
            onPress={() => router.push("/learning-paths" as any)}
          >
            <Feather name="map" size={16} color={colors.primary} />
            <Text style={[styles.pathsBtnText, { color: colors.primary }]}>Ver Trilhas de Aprendizado</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 40 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {certs.length} certificado{certs.length !== 1 ? "s" : ""}
          </Text>
          {certs.map((cert, i) => {
            const colors_cert = [
              { bg: "#185FA520", border: "#185FA540", accent: "#185FA5", icon: "🏆" },
              { bg: "#1D9E7520", border: "#1D9E7540", accent: "#1D9E75", icon: "🌟" },
              { bg: "#6B21A820", border: "#6B21A840", accent: "#6B21A8", icon: "🎓" },
              { bg: "#BA751720", border: "#BA751740", accent: "#BA7517", icon: "🥇" },
              { bg: "#D85A3020", border: "#D85A3040", accent: "#D85A30", icon: "🎯" },
            ];
            const c = colors_cert[i % colors_cert.length]!;
            return (
              <View
                key={cert.id}
                style={[styles.certCard, { borderColor: c.border }]}
              >
                <View style={[styles.certBanner, { backgroundColor: c.bg }]}>
                  <Text style={styles.certEmoji}>{c.icon}</Text>
                  <View style={styles.certBannerMeta}>
                    <Text style={[styles.certOrg, { color: c.accent }]}>CelpePrep</Text>
                    <Text style={[styles.certLabel, { color: c.accent }]}>CERTIFICADO DE CONCLUSÃO</Text>
                  </View>
                </View>
                <View style={styles.certBody}>
                  <Text style={[styles.certTitle, { color: colors.text }]}>{cert.title}</Text>
                  {cert.description ? (
                    <Text style={[styles.certDesc, { color: colors.mutedForeground }]}>{cert.description}</Text>
                  ) : null}
                  <View style={[styles.certFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.certDateRow}>
                      <Feather name="calendar" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.certDate, { color: colors.mutedForeground }]}>
                        Emitido em {formatDate(cert.issuedAt)}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleShare(cert)} style={[styles.shareBtn, { backgroundColor: c.accent + "15" }]}>
                      <Feather name="share-2" size={13} color={c.accent} />
                      <Text style={[styles.shareBtnText, { color: c.accent }]}>Compartilhar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 280 },
  pathsBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 8,
  },
  pathsBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular" },
  certCard: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  certBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 20, paddingVertical: 18,
  },
  certEmoji: { fontSize: 32 },
  certBannerMeta: { gap: 2 },
  certOrg: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  certLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, opacity: 0.8 },
  certBody: { padding: 20, gap: 8 },
  certTitle: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  certDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  certFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 12, marginTop: 4, borderTopWidth: 1,
  },
  certDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  certDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  shareBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
