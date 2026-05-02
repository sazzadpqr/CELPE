import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  deepLink: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  general: "bell",
  study_reminder: "clock",
  update: "refresh-cw",
  premium: "star",
  warning: "alert-triangle",
  exam: "file-text",
  vocab: "type",
  course: "book",
  practice: "edit-3",
};

const TYPE_COLORS: Record<string, string> = {
  general: "#185FA5",
  study_reminder: "#7C3AED",
  update: "#059669",
  premium: "#D97706",
  warning: "#DC2626",
  exam: "#0891B2",
  vocab: "#4F46E5",
  course: "#0D9488",
  practice: "#DB2777",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { profile } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/notifications"), {
        headers: { "x-device-token": profile.deviceToken ?? "" },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data as Notification[]);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile.deviceToken]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, read: true } : notif));
    try {
      await fetch(getApiUrl(`/api/notifications/${id}/read`), {
        method: "PUT",
        headers: { "x-device-token": profile.deviceToken ?? "" },
      });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications(n => n.map(notif => ({ ...notif, read: true })));
    try {
      await fetch(getApiUrl("/api/notifications/read-all"), {
        method: "PUT",
        headers: { "x-device-token": profile.deviceToken ?? "" },
      });
    } catch {}
  };

  const handlePress = (notif: Notification) => {
    if (!notif.read) markRead(notif.id);
    if (notif.deepLink) {
      try {
        router.push(notif.deepLink as never);
      } catch {}
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + 16,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18, fontFamily: "Inter_700Bold",
      color: colors.text,
    },
    markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + "20" },
    markAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.surface,
      alignItems: "center", justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center", marginBottom: 8 },
    emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center" },
    notifItem: {
      flexDirection: "row",
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    notifUnread: { backgroundColor: colors.primary + "08" },
    iconWrap: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: "center", justifyContent: "center",
      marginRight: 12, marginTop: 2, flexShrink: 0,
    },
    notifContent: { flex: 1 },
    notifRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
    notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.text, flex: 1 },
    notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 1, flexShrink: 0 },
    notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
    unreadDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: colors.primary,
      position: "absolute", top: 18, right: 20,
    },
    listContent: { paddingBottom: insets.bottom + 16 },
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    sectionHeader: {
      paddingHorizontal: 20, paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    sectionText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          Notificações{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Text>
        {unreadCount > 0 ? (
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Feather name="bell-off" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Sem notificações</Text>
          <Text style={styles.emptyBody}>Quando você receber notificações elas aparecerão aqui.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const icon = TYPE_ICONS[item.type] ?? "bell";
            const color = TYPE_COLORS[item.type] ?? "#185FA5";
            return (
              <Pressable
                style={[styles.notifItem, !item.read && styles.notifUnread]}
                onPress={() => handlePress(item)}
              >
                <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
                  <Feather name={icon} size={20} color={color} />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifRow}>
                    <Text style={styles.notifTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.notifBody} numberOfLines={3}>{item.body}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
