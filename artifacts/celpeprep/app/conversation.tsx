import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { GuestGate } from "@/components/GuestGate";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
};

type Scenario = {
  id: string;
  label: string;
  icon: string;
  color: string;
  systemPrompt: string;
};

const FALLBACK_SCENARIOS: Scenario[] = [
  { id: "entrevista", label: "Entrevista de Emprego", icon: "briefcase", color: "#185FA5", systemPrompt: "Você é um entrevistador formal de uma empresa brasileira. Conduza uma entrevista de emprego em português brasileiro. Faça perguntas naturais, corrija erros gentilmente e forneça feedback construtivo após cada resposta do candidato." },
  { id: "turismo", label: "Situação Turística", icon: "map-pin", color: "#1D9E75", systemPrompt: "Você é um guia turístico amigável em São Paulo. Ajude o turista com informações sobre a cidade em português. Corrija erros de forma natural e encorajadora." },
  { id: "medico", label: "Consulta Médica", icon: "activity", color: "#D85A30", systemPrompt: "Você é um médico brasileiro em uma consulta. Converse com o paciente sobre seus sintomas em português formal mas acessível. Corrija erros sutilmente repetindo a forma correta." },
  { id: "debate", label: "Debate de Opinião", icon: "message-square", color: "#6B21A8", systemPrompt: "Você é um debatedor brasileiro. Apresente argumentos contrários de forma construtiva ao ponto de vista do estudante, em português avançado. Isso treinará argumentação para o Celpe-Bras." },
  { id: "cotidiano", label: "Conversa Cotidiana", icon: "coffee", color: "#BA7517", systemPrompt: "Você é um colega de trabalho brasileiro amigável. Converse naturalmente sobre tópicos do dia a dia em português. Seja encorajador e ajude o estudante a praticar fluência." },
];

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const listRef = useRef<FlatList>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>(FALLBACK_SCENARIOS);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [phase, setPhase] = useState<"select" | "chat">("select");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(getApiUrl("/api/content/conversation/scenarios"))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.length > 0) setScenarios(data); })
      .catch(() => {})
      .finally(() => setLoadingScenarios(false));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const startChat = (s: Scenario) => {
    setScenario(s);
    const welcome: Message = {
      id: "0",
      role: "assistant",
      text: `Olá! Estou pronto para o cenário: **${s.label}**. Pode começar quando quiser! 🇧🇷`,
      ts: Date.now(),
    };
    setMessages([welcome]);
    setPhase("chat");
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !scenario) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input.trim(), ts: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const history = newMsgs.map((m) => ({ role: m.role, content: m.text }));
      const r = await fetch(getApiUrl("/api/ai/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: scenario.systemPrompt, messages: history }),
      });

      if (!r.ok) {
        setMessages([...newMsgs, { id: (Date.now() + 1).toString(), role: "assistant", text: "Desculpe, ocorreu um erro. Tente novamente em instantes.", ts: Date.now() }]);
        return;
      }

      const data = await r.json() as { reply: string };
      setMessages([...newMsgs, { id: (Date.now() + 1).toString(), role: "assistant", text: data.reply, ts: Date.now() }]);
    } catch {
      setMessages([...newMsgs, { id: (Date.now() + 1).toString(), role: "assistant", text: "Sem conexão. Verifique sua internet e tente novamente.", ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  if (profile.isGuest) return <GuestGate feature="Conversação com IA" />;

  if (phase === "select") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Conversação IA</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Escolha um cenário para praticar</Text>
          </View>
        </View>

        {loadingScenarios ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={scenarios}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => startChat(item)}
                style={({ pressed }) => [
                  styles.scenarioCard,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={[styles.scenarioIcon, { backgroundColor: item.color + "18" }]}>
                  <Feather name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.scenarioMeta}>
                  <Text style={[styles.scenarioTitle, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.scenarioHint, { color: colors.mutedForeground }]}>
                    Conversa com IA · Feedback em tempo real
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
            ListHeaderComponent={
              <View style={[styles.infoCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                <Feather name="zap" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  Converse com uma IA que responde em português brasileiro. Ideal para treinar fluência e vocabulário antes do Celpe-Bras.
                </Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => { setPhase("select"); setMessages([]); }} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={[styles.scenarioChip, { backgroundColor: scenario!.color + "18" }]}>
          <Feather name={scenario!.icon as any} size={14} color={scenario!.color} />
          <Text style={[styles.scenarioChipText, { color: scenario!.color }]}>{scenario!.label}</Text>
        </View>
        <Pressable onPress={() => { setMessages([]); startChat(scenario!); }} style={styles.resetBtn}>
          <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            item.role === "user"
              ? [styles.userBubble, { backgroundColor: scenario!.color }]
              : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}>
            <Text style={[styles.bubbleText, { color: item.role === "user" ? "#fff" : colors.text }]}>
              {item.text}
            </Text>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={[styles.assistantBubble, styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, width: 60 }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      />

      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={[styles.inputField, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Digite sua mensagem em português..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={600}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <Pressable
          onPress={sendMessage}
          disabled={loading || !input.trim()}
          style={[styles.sendBtn, { backgroundColor: loading || !input.trim() ? colors.muted : scenario!.color }]}
        >
          <Feather name="send" size={18} color={loading || !input.trim() ? colors.mutedForeground : "#fff"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scenarioChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flex: 1 },
  scenarioChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resetBtn: { padding: 4 },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 12 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  scenarioCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  scenarioIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  scenarioMeta: { flex: 1, gap: 3 },
  scenarioTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  scenarioHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  chatContent: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12, borderWidth: 1 },
  userBubble: { alignSelf: "flex-end", borderColor: "transparent" },
  assistantBubble: { alignSelf: "flex-start" },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  inputField: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
