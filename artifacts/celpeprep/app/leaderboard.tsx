import { Feather } from "@expo/vector-icons";
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

type Entry = {
  rank: number; username: string; displayName: string;
  avatarEmoji: string; level: string; xpTotal: number; streakDays: number;
};

const LEVEL_COLORS: Record<string, string> = {
  A2: "#1D9E75", B1: "#185FA5", B2: "#6B21A8", C1: "#BA7517",
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<"xp" | "streak">("xp");
  const TAB_ICON = { xp: "zap" as const, streak: "activity" as const };
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (sort: "xp" | "streak") => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/content/leaderboard?sort=${sort}`));
      if (res.ok) setEntries(await res.json() as Entry[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const myEntry = entries.find((e) => e.username === profile.username);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ranking</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["xp", "streak"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Feather
              name={TAB_ICON[t]}
              size={14}
              color={tab === t ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "xp" ? "Pontos XP" : "Sequência"}
            </Text>
          </Pressable>
        ))}
      </View>

      {myEntry && (
        <View style={[styles.myRank, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Text style={[styles.myRankLabel, { color: colors.primary }]}>Sua posição</Text>
          <Text style={[styles.myRankValue, { color: colors.primary }]}>#{myEntry.rank}</Text>
          <View style={[styles.myRankStat, { backgroundColor: colors.primary + "20" }]}>
            <Feather name={TAB_ICON[tab]} size={12} color={colors.primary} />
            <Text style={[styles.myRankStatText, { color: colors.primary }]}>
              {tab === "xp" ? `${myEntry.xpTotal} XP` : `${myEntry.streakDays} dias`}
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 40 : 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry) => {
            const isMe = entry.username === profile.username;
            const levelColor = LEVEL_COLORS[entry.level] ?? "#185FA5";
            return (
              <View
                key={entry.rank}
                style={[
                  styles.row,
                  { backgroundColor: isMe ? colors.primary + "12" : colors.card, borderColor: isMe ? colors.primary : colors.border },
                ]}
              >
                <View style={styles.rankWrap}>
                  {entry.rank <= 3 ? (
                    <Text style={styles.rankIcon}>{RANK_ICONS[entry.rank - 1]}</Text>
                  ) : (
                    <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>#{entry.rank}</Text>
                  )}
                </View>
                <View style={[styles.avatar, { backgroundColor: levelColor + "20" }]}>
                  <Text style={styles.avatarEmoji}>{entry.avatarEmoji}</Text>
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {entry.displayName}
                    </Text>
                    {isMe && (
                      <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.youBadgeText}>Você</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: levelColor + "18" }]}>
                    <Text style={[styles.levelText, { color: levelColor }]}>{entry.level}</Text>
                  </View>
                </View>
                <View style={styles.score}>
                  <Feather name={TAB_ICON[tab]} size={13} color={tab === "xp" ? "#BA7517" : "#D85A30"} />
                  <Text style={[styles.scoreNum, { color: colors.text }]}>
                    {tab === "xp" ? entry.xpTotal.toLocaleString("pt-BR") : entry.streakDays}
                  </Text>
                  <Text style={[styles.scoreUnit, { color: colors.mutedForeground }]}>
                    {tab === "xp" ? "XP" : "dias"}
                  </Text>
                </View>
              </View>
            );
          })}

          {entries.length === 0 && (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="award" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Sem dados de ranking ainda. Complete práticas para aparecer aqui!
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
  tabRow: {
    flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 20,
  },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  myRank: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginTop: 14, borderRadius: 12, borderWidth: 1, padding: 12,
  },
  myRankLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  myRankValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  myRankStat: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  myRankStatText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 14, gap: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  rankWrap: { width: 32, alignItems: "center" },
  rankIcon: { fontSize: 20 },
  rankNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 20 },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  youBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  youBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  levelBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  score: { alignItems: "flex-end", gap: 2 },
  scoreNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scoreUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  empty: {
    padding: 32, borderRadius: 16, borderWidth: 1,
    alignItems: "center", gap: 10, marginTop: 20,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
