import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Resource = {
  id: string;
  title: string;
  source: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  type: "podcast" | "video" | "radio" | "exercise";
};

type Tip = { id: string; text: string };

const FALLBACK_RESOURCES: Resource[] = [
  { id: "r1", title: "Rádio MEC", source: "Rádio MEC", description: "Emissora pública com programação jornalística e cultural em PT-BR formal.", url: "https://radiomec.com.br", icon: "radio", color: "#185FA5", type: "radio" },
  { id: "r2", title: "CBN — Central Brasileira de Notícias", source: "CBN", description: "Radiojornalismo 24h. Ideal para treinar escuta em contexto formal.", url: "https://cbn.globoradio.globo.com", icon: "radio", color: "#1D9E75", type: "radio" },
  { id: "r3", title: "Café Brasil (Podcast)", source: "Rodrigo Vianna", description: "Episódios sobre cultura, filosofia e comportamento. Sotaque neutro.", url: "https://open.spotify.com/show/0JvAChNwIjkjLAfhUeEOaA", icon: "headphones", color: "#6B21A8", type: "podcast" },
  { id: "r4", title: "Nexo Jornal — Áudios", source: "Nexo", description: "Podcasts de análise jornalística com vocabulário avançado e formal.", url: "https://www.nexojornal.com.br/podcasts", icon: "headphones", color: "#D85A30", type: "podcast" },
  { id: "r5", title: "TV Cultura", source: "TV Cultura", description: "Programação educativa e cultural. Ótimo para escuta com suporte visual.", url: "https://tvcultura.com.br", icon: "tv", color: "#BA7517", type: "video" },
  { id: "r6", title: "Canal Futura", source: "Canal Futura", description: "Conteúdo educativo produzido no Brasil. Linguagem clara e formal.", url: "https://www.futura.org.br", icon: "tv", color: "#185FA5", type: "video" },
];

const FALLBACK_TIPS: Tip[] = [
  { id: "t1", text: "Ouça sem ver a transcrição primeiro — tente entender o contexto geral." },
  { id: "t2", text: "Ouça novamente anotando palavras desconhecidas." },
  { id: "t3", text: "Identifique o gênero discursivo: notícia, entrevista, debate, reportagem." },
  { id: "t4", text: "Preste atenção em marcadores discursivos: 'entretanto', 'por sua vez', 'diante disso'." },
  { id: "t5", text: "Pratique pelo menos 20 minutos por dia para desenvolver a escuta." },
];

const TYPE_LABELS: Record<string, string> = {
  podcast: "Podcast",
  video: "Vídeo",
  radio: "Rádio Online",
  exercise: "Exercício",
};

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

export default function ListeningScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [resources, setResources] = useState<Resource[]>(FALLBACK_RESOURCES);
  const [tips, setTips] = useState<Tip[]>(FALLBACK_TIPS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/content/listening"))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          if (data.resources?.length > 0) setResources(data.resources);
          if (data.tips?.length > 0) setTips(data.tips);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>Compreensão Auditiva</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Recursos selecionados para treinar escuta em português brasileiro formal.
      </Text>

      {loading ? (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <View style={styles.tipsHeader}>
              <Feather name="zap" size={14} color={colors.primary} />
              <Text style={[styles.tipsTitle, { color: colors.primary }]}>Dicas de Estudo</Text>
            </View>
            {tips.map((tip) => (
              <View key={tip.id} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.tipText, { color: colors.text }]}>{tip.text}</Text>
              </View>
            ))}
          </View>

          {/* Resources */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECURSOS EXTERNOS</Text>
          <View style={[styles.resourcesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {resources.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <Pressable
                  onPress={() => Linking.openURL(r.url)}
                  style={({ pressed }) => [styles.resourceItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.resourceIcon, { backgroundColor: r.color + "18" }]}>
                    <Feather name={r.icon as any} size={20} color={r.color} />
                  </View>
                  <View style={styles.resourceMeta}>
                    <View style={styles.resourceTitleRow}>
                      <Text style={[styles.resourceTitle, { color: colors.text }]}>{r.title}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: r.color + "20" }]}>
                        <Text style={[styles.typeBadgeText, { color: r.color }]}>{TYPE_LABELS[r.type] ?? r.type}</Text>
                      </View>
                    </View>
                    {r.source ? <Text style={[styles.resourceSource, { color: r.color }]}>{r.source}</Text> : null}
                    <Text style={[styles.resourceDesc, { color: colors.mutedForeground }]}>{r.description}</Text>
                  </View>
                  <Feather name="external-link" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Coming soon */}
          <View style={[styles.comingSoon, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <View style={styles.comingSoonMeta}>
              <Text style={[styles.comingSoonTitle, { color: colors.text }]}>Exercícios integrados em breve</Text>
              <Text style={[styles.comingSoonDesc, { color: colors.mutedForeground }]}>
                Áudios com questões de múltipla escolha e transcrição, no estilo do Celpe-Bras.
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: -6 },
  tipsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, paddingHorizontal: 4 },
  resourcesCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 16 },
  resourceItem: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 16 },
  resourceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resourceMeta: { flex: 1, gap: 2 },
  resourceTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  resourceTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  resourceSource: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  resourceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  comingSoon: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  comingSoonMeta: { flex: 1, gap: 3 },
  comingSoonTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  comingSoonDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
