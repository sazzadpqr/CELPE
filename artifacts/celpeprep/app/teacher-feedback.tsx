import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

type FeedbackRequest = {
  id: string;
  content: string;
  requestType: string;
  teacherResponse: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  escrita: "Produção Escrita",
  oral: "Produção Oral",
  geral: "Dúvida Geral",
};

const TYPE_ICONS: Record<string, "edit-3" | "mic" | "help-circle"> = {
  escrita: "edit-3",
  oral: "mic",
  geral: "help-circle",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#BA7517",
  reviewed: "#1D9E75",
  closed: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  reviewed: "Respondido",
  closed: "Encerrado",
};

export default function TeacherFeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { profile } = useApp();

  const [tab, setTab] = useState<"list" | "new">("list");
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [requestType, setRequestType] = useState<"escrita" | "oral" | "geral">("escrita");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/student/feedback-requests?deviceToken=${encodeURIComponent(profile.deviceToken ?? "")}`),
      );
      if (res.ok) setRequests(await res.json() as FeedbackRequest[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!content.trim()) { setSubmitMsg("Escreva o conteúdo para revisão."); return; }
    if (!profile.deviceToken) { setSubmitMsg("Perfil não carregado."); return; }
    setSubmitting(true);
    setSubmitMsg("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(getApiUrl("/api/student/feedback-requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceToken: profile.deviceToken,
          studentName: profile.name ?? "Estudante",
          content: content.trim(),
          requestType,
        }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setContent("");
        setSubmitMsg("Enviado com sucesso! O professor responderá em breve.");
        setTab("list");
        load();
      } else {
        setSubmitMsg("Erro ao enviar. Tente novamente.");
      }
    } catch { setSubmitMsg("Erro de conexão."); }
    setSubmitting(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Feedback do Professor</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(["list", "new"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "list" ? "Minhas solicitações" : "Nova solicitação"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "list" ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 40 : 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : requests.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Text style={{ fontSize: 36 }}>📝</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma solicitação</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Envie uma produção para receber feedback personalizado de um professor.
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setTab("new")}
              >
                <Text style={styles.emptyBtnText}>Enviar agora</Text>
              </Pressable>
            </View>
          ) : (
            requests.map((req) => {
              const statusColor = STATUS_COLORS[req.status] ?? "#6B7280";
              const isOpen = expanded === req.id;
              return (
                <Pressable
                  key={req.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setExpanded(isOpen ? null : req.id)}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.typeIcon, { backgroundColor: colors.primary + "18" }]}>
                      <Feather name={TYPE_ICONS[req.requestType] ?? "file-text"} size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardType, { color: colors.text }]}>
                        {TYPE_LABELS[req.requestType] ?? req.requestType}
                      </Text>
                      <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                        {new Date(req.createdAt).toLocaleDateString("pt-BR", { dateStyle: "medium" })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {STATUS_LABELS[req.status] ?? req.status}
                      </Text>
                    </View>
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                  </View>
                  {isOpen && (
                    <View style={{ gap: 10, marginTop: 12 }}>
                      <View style={[styles.contentBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.boxLabel, { color: colors.mutedForeground }]}>Sua produção:</Text>
                        <Text style={[styles.boxText, { color: colors.text }]}>{req.content}</Text>
                      </View>
                      {req.teacherResponse ? (
                        <View style={[styles.responseBox, { backgroundColor: "#1D9E7510", borderColor: "#1D9E7540" }]}>
                          <View style={styles.responseHeader}>
                            <Feather name="message-square" size={13} color="#1D9E75" />
                            <Text style={[styles.boxLabel, { color: "#1D9E75" }]}>Resposta do professor:</Text>
                          </View>
                          <Text style={[styles.boxText, { color: colors.text }]}>{req.teacherResponse}</Text>
                        </View>
                      ) : (
                        <View style={[styles.pendingBox, { backgroundColor: "#BA751710", borderColor: "#BA751740" }]}>
                          <Feather name="clock" size={13} color="#BA7517" />
                          <Text style={[styles.pendingText, { color: "#BA7517" }]}>
                            Aguardando resposta do professor…
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.newContent, { paddingBottom: Platform.OS === "web" ? 40 : 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Envie uma produção escrita, áudio transcrito ou dúvida e um professor irá corrigi-la e responder.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Tipo de solicitação</Text>
          <View style={styles.typeRow}>
            {(["escrita", "oral", "geral"] as const).map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: requestType === t ? colors.primary : colors.card,
                    borderColor: requestType === t ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setRequestType(t)}
              >
                <Feather
                  name={TYPE_ICONS[t]}
                  size={13}
                  color={requestType === t ? "#fff" : colors.mutedForeground}
                />
                <Text style={[styles.typePillText, { color: requestType === t ? "#fff" : colors.mutedForeground }]}>
                  {TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Sua produção</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={content}
            onChangeText={setContent}
            placeholder={
              requestType === "escrita"
                ? "Cole ou escreva sua produção escrita aqui (redação, carta, e-mail)…"
                : requestType === "oral"
                ? "Transcreva sua fala ou descreva o contexto para feedback oral…"
                : "Escreva sua dúvida sobre gramática, vocabulário, estratégias de prova…"
            }
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{content.length} caracteres</Text>

          {submitMsg ? (
            <View style={[
              styles.msgBox,
              { backgroundColor: submitMsg.includes("sucesso") ? "#1D9E7512" : "#EF444412",
                borderColor: submitMsg.includes("sucesso") ? "#1D9E7540" : "#EF444440" }
            ]}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: submitMsg.includes("sucesso") ? "#1D9E75" : "#EF4444" }}>
                {submitMsg}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.submitBtn, { backgroundColor: submitting ? colors.muted : colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Enviar para revisão</Text>
                </>
            }
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  backBtn: { width: 24, alignItems: "flex-start" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  newContent: { padding: 16, gap: 14 },
  emptyState: { borderRadius: 16, borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 10, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardType: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  contentBox: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 4 },
  responseBox: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  responseHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  pendingBox: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, padding: 10 },
  pendingText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  boxLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 },
  boxText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  typeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typePillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 180, lineHeight: 21 },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -6 },
  msgBox: { borderRadius: 10, borderWidth: 1, padding: 10 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
