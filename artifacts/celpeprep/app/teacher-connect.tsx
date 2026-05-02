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

type TeacherInfo = {
  id: string;
  name: string;
  bio: string;
  specialties: string[];
};

type Connection = {
  id: string;
  teacherId: string;
  studentName: string;
  inviteCode: string;
  connectedAt: string;
};

type TeacherEntry = {
  connection: Connection;
  teacher: TeacherInfo;
  upcomingClasses: Array<{
    id: string;
    title: string;
    type: string;
    scheduledAt: string | null;
    durationMinutes: number;
    meetingLink: string;
    status: string;
  }>;
};

export default function TeacherConnectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { profile } = useApp();

  const [code, setCode] = useState("");
  const [studentName, setStudentName] = useState(profile.name ?? "");
  const [connecting, setConnecting] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [myTeachers, setMyTeachers] = useState<TeacherEntry[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMyTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/student/my-teachers?deviceToken=${encodeURIComponent(profile.deviceToken ?? "")}`),
      );
      if (res.ok) {
        const data = (await res.json()) as TeacherEntry[];
        setMyTeachers(data);
      }
    } catch {
      /* ignore */
    }
    setLoadingTeachers(false);
  };

  useEffect(() => {
    loadMyTeachers();
  }, []);

  const handleConnect = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("Digite o código do professor"); return; }
    if (!studentName.trim()) { setError("Digite seu nome"); return; }
    if (!profile.deviceToken) { setError("Perfil não carregado. Tente novamente."); return; }

    setError("");
    setSuccess("");
    setConnecting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await fetch(getApiUrl("/api/student/connect-teacher"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmed,
          deviceToken: profile.deviceToken,
          studentName: studentName.trim(),
        }),
      });

      const data = (await res.json()) as {
        teacher?: TeacherInfo;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Erro ao conectar");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccess(`Conectado com ${data.teacher?.name ?? "professor"} com sucesso!`);
        setCode("");
        loadMyTeachers();
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    }
    setConnecting(false);
  };

  const handleDisconnect = async (connectionId: string, teacherName: string) => {
    if (!profile.deviceToken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(getApiUrl("/api/student/disconnect-teacher"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken: profile.deviceToken, connectionId }),
      });
      if (res.ok) {
        setMyTeachers((prev) => prev.filter((t) => t.connection.id !== connectionId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch { /* ignore */ }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Conectar Professor</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 40 : 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Connect card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardIconRow, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="user-plus" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Conectar com um professor</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Peça ao seu professor o código de convite e insira abaixo para conectar sua conta.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Seu nome</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={studentName}
            onChangeText={setStudentName}
            placeholder="Como o professor irá te ver"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Código do professor</Text>
          <TextInput
            style={[
              styles.codeInput,
              {
                backgroundColor: colors.background,
                borderColor: error ? "#EF4444" : code.length > 0 ? colors.primary : colors.border,
                color: colors.primary,
              },
            ]}
            value={code}
            onChangeText={(t) => { setCode(t.toUpperCase()); setError(""); setSuccess(""); }}
            placeholder="XXXXXXXX"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleConnect}
          />

          {error !== "" && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={13} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success !== "" && (
            <View style={styles.successRow}>
              <Feather name="check-circle" size={13} color="#10B981" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          <Pressable
            style={[styles.connectBtn, { backgroundColor: connecting ? colors.muted : colors.primary }]}
            onPress={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="link" size={16} color="#fff" />
                <Text style={styles.connectBtnText}>Conectar</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* My teachers */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Meus Professores</Text>

        {loadingTeachers ? (
          <View style={[styles.loadingWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Carregando...</Text>
          </View>
        ) : myTeachers.length === 0 ? (
          <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user-x" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Você não está conectado a nenhum professor ainda.
            </Text>
          </View>
        ) : (
          myTeachers.map((entry) => (
            <View
              key={entry.connection.id}
              style={[styles.teacherCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Teacher header */}
              <View style={styles.teacherHeader}>
                <View style={[styles.teacherAvatar, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.teacherInitials, { color: colors.primary }]}>
                    {entry.teacher.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.teacherName, { color: colors.text }]}>{entry.teacher.name}</Text>
                  {entry.teacher.bio ? (
                    <Text style={[styles.teacherBio, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {entry.teacher.bio}
                    </Text>
                  ) : null}
                  {entry.teacher.specialties?.length > 0 && (
                    <View style={styles.specialtiesRow}>
                      {entry.teacher.specialties.map((s) => (
                        <View key={s} style={[styles.specialtyChip, { backgroundColor: colors.primary + "12" }]}>
                          <Text style={[styles.specialtyText, { color: colors.primary }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={() => handleDisconnect(entry.connection.id, entry.teacher.name)}
                  style={styles.disconnectBtn}
                >
                  <Feather name="user-minus" size={16} color="#EF4444" />
                </Pressable>
              </View>

              {/* Connected via */}
              <View style={[styles.connectedRow, { borderTopColor: colors.border }]}>
                <Feather name="link" size={11} color={colors.mutedForeground} />
                <Text style={[styles.connectedText, { color: colors.mutedForeground }]}>
                  Conectado via {entry.connection.inviteCode} · {formatDate(entry.connection.connectedAt) ?? ""}
                </Text>
              </View>

              {/* Upcoming classes */}
              {entry.upcomingClasses.length > 0 && (
                <View style={[styles.classesSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.classesSectionTitle, { color: colors.text }]}>
                    Próximas aulas
                  </Text>
                  {entry.upcomingClasses.map((cls) => (
                    <View key={cls.id} style={[styles.classRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={[styles.classIconWrap, { backgroundColor: colors.primary + "12" }]}>
                        <Feather
                          name={cls.type === "group" ? "users" : "user"}
                          size={14}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.classTitle, { color: colors.text }]}>{cls.title}</Text>
                        <Text style={[styles.classDate, { color: colors.mutedForeground }]}>
                          {cls.scheduledAt ? formatDate(cls.scheduledAt) : "Sem data"} · {cls.durationMinutes}min
                        </Text>
                      </View>
                      {cls.meetingLink ? (
                        <Pressable
                          onPress={() => Linking.openURL(cls.meetingLink)}
                          style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                        >
                          <Feather name="video" size={12} color="#fff" />
                          <Text style={styles.joinBtnText}>Entrar</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 6 },
  cardIconRow: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  input: {
    height: 44, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, fontSize: 14, fontFamily: "Inter_400Regular",
  },
  codeInput: {
    height: 56, borderRadius: 12, borderWidth: 2,
    paddingHorizontal: 16, fontSize: 24, fontFamily: "Inter_700Bold",
    letterSpacing: 8, textAlign: "center",
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { color: "#EF4444", fontSize: 12, fontFamily: "Inter_400Regular" },
  successRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  successText: { color: "#10B981", fontSize: 12, fontFamily: "Inter_400Regular" },
  connectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 14, borderRadius: 12, marginTop: 8,
  },
  connectBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  loadingWrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 24, borderRadius: 16, borderWidth: 1,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyWrap: {
    alignItems: "center", gap: 10, padding: 32,
    borderRadius: 16, borderWidth: 1,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  teacherCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  teacherHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  teacherAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", shrink: 0 as any,
  },
  teacherInitials: { fontSize: 16, fontFamily: "Inter_700Bold" },
  teacherName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  teacherBio: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  specialtiesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  specialtyChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  specialtyText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  disconnectBtn: { padding: 8 },
  connectedRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1,
  },
  connectedText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  classesSection: { borderTopWidth: 1, padding: 12, gap: 8 },
  classesSectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 2 },
  classRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  classIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  classTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  classDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  joinBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  joinBtnText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
