import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function getApiUrl(path: string) {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}${path}` : path;
}

type LiveEvent = {
  id: string; title: string; description: string; host: string;
  scheduledAt: string; durationMinutes: number; meetingUrl: string;
  topic: string; maxParticipants: number; isPremiumOnly: boolean; active: boolean;
};

const TOPIC_COLORS: Record<string, string> = {
  geral: "#185FA5", gramatica: "#6B21A8", vocabulario: "#1D9E75",
  escrita: "#D85A30", pronuncia: "#BA7517", exame: "#0891B2",
};

const TOPIC_LABELS: Record<string, string> = {
  geral: "Geral", gramatica: "Gramática", vocabulario: "Vocabulário",
  escrita: "Escrita", pronuncia: "Pronúncia", exame: "Exame",
};

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

function isUpcoming(iso: string) {
  return new Date(iso).getTime() > Date.now();
}

export default function LiveEventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(getApiUrl("/api/content/live-events"));
        if (res.ok) setEvents(await res.json() as LiveEvent[]);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const upcoming = events.filter((e) => isUpcoming(e.scheduledAt));
  const past = events.filter((e) => !isUpcoming(e.scheduledAt));

  const handleJoin = async (event: LiveEvent) => {
    if (!event.meetingUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (event.isPremiumOnly && !profile.isPremium) {
      router.push("/paywall" as any); return;
    }
    try { await Linking.openURL(event.meetingUrl); } catch {}
  };

  const renderEvent = (event: LiveEvent, isPast: boolean) => {
    const tc = TOPIC_COLORS[event.topic] ?? "#185FA5";
    const tl = TOPIC_LABELS[event.topic] ?? event.topic;
    const upcoming = !isPast;
    return (
      <View
        key={event.id}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: upcoming ? colors.border : colors.muted,
            opacity: isPast ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.topicBadge, { backgroundColor: tc + "18" }]}>
            <Text style={[styles.topicText, { color: tc }]}>{tl}</Text>
          </View>
          {event.isPremiumOnly && (
            <View style={[styles.premBadge, { backgroundColor: "#BA751720" }]}>
              <Feather name="star" size={9} color="#BA7517" />
              <Text style={[styles.premText, { color: "#BA7517" }]}>Premium</Text>
            </View>
          )}
          {upcoming && (
            <View style={[styles.liveDot, { backgroundColor: "#1D9E7520" }]}>
              <View style={[styles.liveDotInner, { backgroundColor: "#1D9E75" }]} />
              <Text style={[styles.liveLabel, { color: "#1D9E75" }]}>Em breve</Text>
            </View>
          )}
        </View>

        <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
        {event.description ? (
          <Text style={[styles.eventDesc, { color: colors.mutedForeground }]}>{event.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="user" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{event.host || "CelpePrep"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{event.durationMinutes} min</Text>
          </View>
          {event.maxParticipants > 0 && (
            <View style={styles.metaItem}>
              <Feather name="users" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Máx. {event.maxParticipants}</Text>
            </View>
          )}
        </View>

        <View style={[styles.dateRow, { backgroundColor: colors.muted + "60", borderRadius: 8 }]}>
          <Feather name="calendar" size={13} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.primary }]}>{formatEventDate(event.scheduledAt)}</Text>
        </View>

        {upcoming && event.meetingUrl ? (
          <Pressable
            style={[
              styles.joinBtn,
              { backgroundColor: event.isPremiumOnly && !profile.isPremium ? colors.muted : colors.primary },
            ]}
            onPress={() => handleJoin(event)}
          >
            <Feather name="video" size={15} color="#fff" />
            <Text style={styles.joinBtnText}>
              {event.isPremiumOnly && !profile.isPremium ? "Requer Premium" : "Participar"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Aulas ao Vivo</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 40 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {upcoming.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Próximas aulas</Text>
              {upcoming.map((e) => renderEvent(e, false))}
            </>
          )}

          {past.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Aulas anteriores</Text>
              {past.map((e) => renderEvent(e, true))}
            </>
          )}

          {events.length === 0 && (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.emptyIcon}>📹</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma aula agendada</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Fique atento! As próximas aulas ao vivo aparecerão aqui quando forem agendadas.
              </Text>
            </View>
          )}
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
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4, marginBottom: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  topicBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  topicText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  premBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  premText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  liveDot: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveDotInner: { width: 6, height: 6, borderRadius: 3 },
  liveLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  eventTitle: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 22 },
  eventDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  metaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  dateText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  joinBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 13, borderRadius: 12,
  },
  joinBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10, marginTop: 20 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
