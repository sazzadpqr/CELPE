import { Feather } from "@expo/vector-icons";
import AdBanner from "@/components/ads/AdBanner";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { GuestBanner } from "@/components/GuestBanner";

const HEARTS_KEY = "celpeprep_hearts_v1";
const MAX_HEARTS = 5;

async function loadHearts(): Promise<{ hearts: number; date: string }> {
  try {
    const raw = await AsyncStorage.getItem(HEARTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { hearts: number; date: string };
      if (parsed.date === new Date().toDateString()) return parsed;
    }
  } catch {}
  return { hearts: MAX_HEARTS, date: new Date().toDateString() };
}

function HeartsBar() {
  const colors = useColors();
  const [hearts, setHearts] = useState(MAX_HEARTS);

  useEffect(() => {
    loadHearts().then((h) => setHearts(h.hearts));
  }, []);

  return (
    <View style={[styles.heartsCard, { backgroundColor: "#EF444418", borderColor: "#EF444430" }]}>
      <View style={styles.heartsLeft}>
        <Feather name="heart" size={15} color="#EF4444" />
        <Text style={[styles.heartsLabel, { color: "#EF4444" }]}>Vidas</Text>
      </View>
      <View style={styles.heartsRow}>
        {Array.from({ length: MAX_HEARTS }).map((_, i) => (
          <Text key={i} style={[styles.heartIcon, { opacity: i < hearts ? 1 : 0.25 }]}>❤️</Text>
        ))}
      </View>
      <Text style={[styles.heartsCount, { color: "#EF4444" }]}>{hearts}/{MAX_HEARTS}</Text>
    </View>
  );
}

function FeatureCard({
  icon, label, sublabel, color, onPress,
}: { icon: string; label: string; sublabel: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featureCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.featureIcon, { backgroundColor: color + "18" }]}>
        <Text style={styles.featureEmoji}>{icon}</Text>
      </View>
      <View style={styles.featureMeta}>
        <Text style={[styles.featureLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.featureSub, { color: colors.mutedForeground }]}>{sublabel}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

const LEVEL_LABELS: Record<string, string> = {
  A2: "A2 — Básico",
  B1: "B1 — Intermediário",
  B2: "B2 — Intermediário Superior",
  C1: "C1 — Avançado",
};

const QUICK_ACTIONS = [
  { label: "Praticar", icon: "edit-3" as const, route: "/practice", color: "#185FA5" },
  { label: "Vocabulário", icon: "book-open" as const, route: "/vocab", color: "#1D9E75" },
  { label: "Cursos", icon: "play-circle" as const, route: "/courses", color: "#D85A30" },
  { label: "Gramática", icon: "git-branch" as const, route: "/grammar", color: "#6B21A8" },
  { label: "Oral", icon: "mic" as const, route: "/oral", color: "#D85A30" },
  { label: "Pronúncia", icon: "volume-2" as const, route: "/pronunciation", color: "#BA7517" },
  { label: "Conversação", icon: "message-circle" as const, route: "/conversation", color: "#6B21A8" },
  { label: "Progresso", icon: "bar-chart-2" as const, route: "/progress", color: "#BA7517" },
  { label: "Biblioteca", icon: "layers" as const, route: "/library", color: "#185FA5" },
  { label: "Plano", icon: "calendar" as const, route: "/study", color: "#1D9E75" },
];

interface WotdWord { word: string; pos: string; topic?: string; definition: string; example: string; }

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

// ─── Word of the Day ──────────────────────────────────────────────────────────

function WordOfTheDay() {
  const colors = useColors();
  const [wordData, setWordData] = useState<WotdWord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/content/wotd"))
      .then((r) => r.json())
      .then((data: Array<{ word: string; pos: string; topic?: string; definition: string; example: string }>) => {
        if (data.length > 0) {
          const idx = getDayOfYear() % data.length;
          const w = data[idx]!;
          setWordData({ word: w.word, pos: w.pos, topic: w.topic, definition: w.definition, example: w.example });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <View style={[styles.wotdCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", justifyContent: "center", minHeight: 80 }]}>
      <ActivityIndicator color={colors.primary} size="small" />
    </View>
  );
  if (!wordData) return null;

  return (
    <View style={[styles.wotdCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.wotdHeader}>
        <View style={styles.wotdHeaderLeft}>
          <Feather name="star" size={14} color="#BA7517" />
          <Text style={[styles.wotdLabel, { color: "#BA7517" }]}>Palavra do Dia</Text>
        </View>
        <Pressable onPress={() => router.push("/vocab")} style={styles.wotdLink}>
          <Text style={[styles.wotdLinkText, { color: colors.primary }]}>Ver vocabulário</Text>
        </Pressable>
      </View>
      <View style={styles.wotdBody}>
        <Text style={[styles.wotdWord, { color: colors.text }]}>{wordData.word}</Text>
        <View style={[styles.wotdPosBadge, { backgroundColor: "#BA751718" }]}>
          <Text style={[styles.wotdPos, { color: "#BA7517" }]}>{wordData.pos}</Text>
        </View>
      </View>
      {wordData.topic ? (
        <View style={[styles.wotdTopicRow]}>
          <Feather name="tag" size={11} color={colors.primary} />
          <Text style={[styles.wotdTopicText, { color: colors.primary }]}>{wordData.topic}</Text>
        </View>
      ) : null}
      <Text style={[styles.wotdDef, { color: colors.text }]}>{wordData.definition}</Text>
      <View style={[styles.wotdExampleWrap, { borderLeftColor: colors.primary, backgroundColor: colors.infoBg }]}>
        <Text style={[styles.wotdExample, { color: colors.mutedForeground }]}>
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>"</Text>
          {wordData.example}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>"</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── Daily Challenge ───────────────────────────────────────────────────────────

interface ChallengeQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  category: string;
  color: string;
}

const TODAY_KEY = `daily_challenge_${new Date().toISOString().slice(0, 10)}`;

function DailyChallenge() {
  const colors = useColors();
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      // Check if already done today
      const stored = await AsyncStorage.getItem(TODAY_KEY);
      if (stored) { setDone(true); setLoading(false); return; }

      // Fetch quiz categories
      try {
        const res = await fetch(getApiUrl("/api/content/quiz"));
        const cats = await res.json() as Array<{
          id: string; title: string; color: string;
          questions: Array<{ question: string; options: string[]; correct: number; explanation: string }>;
        }>;

        // Pick category and question of the day
        const allQs: ChallengeQuestion[] = [];
        for (const cat of cats) {
          for (const q of cat.questions ?? []) {
            allQs.push({ ...q, category: cat.title, color: cat.color ?? "#185FA5" });
          }
        }

        if (allQs.length > 0) {
          const dayIdx = getDayOfYear() % allQs.length;
          setQuestion(allQs[dayIdx]!);
        }
      } catch { /* no questions available */ }
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    };
    load();
  }, []);

  const handleSelect = async (idx: number) => {
    if (selected !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(idx);
    // Mark done after a short delay
    setTimeout(async () => {
      await AsyncStorage.setItem(TODAY_KEY, "done");
    }, 1500);
  };

  if (loading || (!question && !done)) return null;

  if (done && !question) {
    return (
      <View style={[styles.challengeCard, { backgroundColor: colors.successBg, borderColor: colors.success + "40" }]}>
        <View style={styles.challengeHeader}>
          <Feather name="zap" size={14} color={colors.success} />
          <Text style={[styles.challengeLabel, { color: colors.success }]}>Desafio do Dia</Text>
          <View style={[styles.doneBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.doneBadgeText}>✓ Concluído</Text>
          </View>
        </View>
        <Text style={[styles.challengeDoneText, { color: colors.success }]}>
          Você já completou o desafio de hoje! Volte amanhã para o próximo.
        </Text>
      </View>
    );
  }

  if (!question) return null;

  const isAnswered = selected !== null;
  const isCorrect = selected === question.correct;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={[styles.challengeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.challengeHeader}>
          <Feather name="zap" size={14} color="#BA7517" />
          <Text style={[styles.challengeLabel, { color: "#BA7517" }]}>Desafio do Dia</Text>
          <View style={[styles.challengeCatBadge, { backgroundColor: question.color + "18" }]}>
            <Text style={[styles.challengeCatText, { color: question.color }]}>{question.category}</Text>
          </View>
        </View>

        <Text style={[styles.challengeQuestion, { color: colors.text }]}>{question.question}</Text>

        <View style={styles.challengeOptions}>
          {question.options.map((opt, i) => {
            let bg = colors.muted + "60";
            let border = "transparent";
            let textColor = colors.text;
            if (isAnswered) {
              if (i === question.correct) { bg = colors.successBg; border = colors.success; textColor = colors.success; }
              else if (i === selected && !isCorrect) { bg = colors.errorBg; border = colors.destructive; textColor = colors.destructive; }
            } else if (selected === i) {
              bg = colors.primary + "20"; border = colors.primary;
            }
            return (
              <Pressable
                key={i}
                onPress={() => handleSelect(i)}
                style={[styles.challengeOption, { backgroundColor: bg, borderColor: border, borderWidth: border !== "transparent" ? 1.5 : 0 }]}
              >
                <Text style={[styles.challengeOptionLetter, { color: textColor + "80" }]}>{["A", "B", "C", "D"][i]}</Text>
                <Text style={[styles.challengeOptionText, { color: textColor }]}>{opt}</Text>
                {isAnswered && i === question.correct && <Feather name="check-circle" size={14} color={colors.success} />}
                {isAnswered && i === selected && !isCorrect && <Feather name="x-circle" size={14} color={colors.destructive} />}
              </Pressable>
            );
          })}
        </View>

        {isAnswered && (
          <View style={[styles.challengeExplanation, {
            backgroundColor: isCorrect ? colors.successBg : colors.errorBg,
            borderColor: isCorrect ? colors.success + "40" : colors.destructive + "40",
          }]}>
            <Text style={[styles.challengeExplTitle, { color: isCorrect ? colors.success : colors.destructive }]}>
              {isCorrect ? "✓ Correto!" : "✗ Incorreto"}
            </Text>
            <Text style={[styles.challengeExplText, { color: colors.text }]}>{question.explanation}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Supporting components ─────────────────────────────────────────────────────

function DaysUntilExam({ examDate }: { examDate: string | null }) {
  const colors = useColors();
  if (!examDate) return null;
  const diff = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  return (
    <View style={[styles.examBanner, { backgroundColor: colors.infoBg, borderColor: colors.primary }]}>
      <Feather name="clock" size={14} color={colors.primary} />
      <Text style={[styles.examBannerText, { color: colors.primary }]}>
        {diff === 0 ? "Prova hoje!" : `${diff} dias para a prova`}
      </Text>
    </View>
  );
}

function StreakCard({ streak, best }: { streak: number; best: number }) {
  const colors = useColors();
  return (
    <View style={[styles.streakCard, { backgroundColor: colors.primary }]}>
      <View style={styles.streakRow}>
        <View>
          <Text style={styles.streakLabel}>Sequência atual</Text>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakUnit}>dias</Text>
        </View>
        <View style={styles.streakDivider} />
        <View>
          <Text style={styles.streakLabel}>Melhor sequência</Text>
          <Text style={styles.streakNumber}>{best}</Text>
          <Text style={styles.streakUnit}>dias</Text>
        </View>
        <View style={styles.streakIcon}>
          <Feather name="zap" size={36} color="rgba(255,255,255,0.3)" />
        </View>
      </View>
    </View>
  );
}

function AICreditsBar({ used, total }: { used: number; total: number }) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const remaining = Math.max(0, total - used);
  return (
    <View style={[styles.creditsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.creditsHeader}>
        <View style={styles.creditsLeft}>
          <Feather name="cpu" size={14} color={colors.primary} />
          <Text style={[styles.creditsTitle, { color: colors.text }]}>Créditos IA</Text>
        </View>
        <Text style={[styles.creditsCount, { color: remaining === 0 ? colors.destructive : colors.primary }]}>
          {remaining}/{total}
        </Text>
      </View>
      <View style={[styles.creditsTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.creditsFill, { width: `${pct * 100}%` as any, backgroundColor: remaining === 0 ? colors.destructive : colors.primary }]} />
      </View>
      {remaining === 0 && (
        <Pressable onPress={() => router.push("/paywall" as any)} style={styles.upgradeBtn}>
          <Text style={[styles.upgradeText, { color: colors.primary }]}>Assinar Premium para ilimitado →</Text>
        </Pressable>
      )}
    </View>
  );
}

const OFFLINE_CACHE_KEY = "celpeprep_offline_cache_v1";

function OfflineModeCard() {
  const colors = useColors();
  const [cached, setCached] = useState(false);
  const [caching, setCaching] = useState(false);
  const [lastCached, setLastCached] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(OFFLINE_CACHE_KEY).then((v) => {
      if (v) { setCached(true); setLastCached(v); }
    });
  }, []);

  const handleCache = useCallback(async () => {
    setCaching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const [quiz, wotd] = await Promise.all([
        fetch(getApiUrl("/api/content/quiz")).then((r) => r.json()).catch(() => []),
        fetch(getApiUrl("/api/content/wotd")).then((r) => r.json()).catch(() => []),
      ]);
      await AsyncStorage.setItem("celpeprep_offline_quiz", JSON.stringify(quiz));
      await AsyncStorage.setItem("celpeprep_offline_wotd", JSON.stringify(wotd));
      const ts = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, ts);
      setCached(true);
      setLastCached(ts);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    setCaching(false);
  }, []);

  return (
    <View style={[styles.offlineCard, { backgroundColor: cached ? "#1D9E7510" : colors.card, borderColor: cached ? "#1D9E7530" : colors.border }]}>
      <View style={styles.offlineRow}>
        <View style={[styles.offlineIcon, { backgroundColor: (cached ? "#1D9E75" : colors.primary) + "20" }]}>
          <Feather name={cached ? "check-circle" : "wifi-off"} size={20} color={cached ? "#1D9E75" : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.offlineTitle, { color: colors.text }]}>Modo Offline</Text>
          <Text style={[styles.offlineSub, { color: colors.mutedForeground }]}>
            {cached ? `Atualizado: ${lastCached}` : "Pré-carregue o conteúdo para estudar sem internet"}
          </Text>
        </View>
        <Pressable
          style={[styles.offlineBtn, { backgroundColor: cached ? "#1D9E75" : colors.primary, opacity: caching ? 0.7 : 1 }]}
          onPress={handleCache}
          disabled={caching}
        >
          {caching
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.offlineBtnText}>{cached ? "Atualizar" : "Baixar"}</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

function MobileAppCard() {
  const colors = useColors();
  return (
    <View style={[styles.appCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
      <View style={styles.appCardRow}>
        <View style={[styles.appCardIcon, { backgroundColor: colors.primary + "20" }]}>
          <Text style={{ fontSize: 22 }}>📱</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appCardTitle, { color: colors.text }]}>Baixe o App CelpePrep</Text>
          <Text style={[styles.appCardSub, { color: colors.mutedForeground }]}>
            Estude em qualquer lugar, mesmo sem internet
          </Text>
        </View>
      </View>
      <View style={styles.appCardBtns}>
        <Pressable
          style={[styles.storePill, { backgroundColor: colors.text }]}
          onPress={() => Linking.openURL("https://apps.apple.com")}
        >
          <Feather name="smartphone" size={13} color={colors.background} />
          <Text style={[styles.storePillText, { color: colors.background }]}>App Store</Text>
        </Pressable>
        <Pressable
          style={[styles.storePill, { backgroundColor: colors.text }]}
          onPress={() => Linking.openURL("https://play.google.com")}
        >
          <Feather name="smartphone" size={13} color={colors.background} />
          <Text style={[styles.storePillText, { color: colors.background }]}>Google Play</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FutureFeatureCard({
  icon,
  label,
  sublabel,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  sublabel: string;
  color: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featureCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.featureIcon, { backgroundColor: color + "18" }]}>
        <Text style={styles.featureEmoji}>{icon}</Text>
      </View>
      <View style={styles.featureMeta}>
        <Text style={[styles.featureLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.featureSub, { color: colors.mutedForeground }]}>{sublabel}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function DiagnosticBanner() {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.diagBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}
      onPress={() => router.push("/diagnostic" as any)}
    >
      <View style={[styles.diagIcon, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="activity" size={20} color={colors.primary} />
      </View>
      <View style={styles.diagMeta}>
        <Text style={[styles.diagTitle, { color: colors.text }]}>Descubra seu nível</Text>
        <Text style={[styles.diagSub, { color: colors.mutedForeground }]}>
          Faça o teste diagnóstico e personalize seu plano
        </Text>
      </View>
      <Feather name="arrow-right" size={16} color={colors.primary} />
    </Pressable>
  );
}

// ─── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, attempts, refreshLimits, featureFlags } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    refreshLimits();
  }, []);

  // Poll for unread notifications
  useEffect(() => {
    const fetchUnread = async () => {
      if (!profile.deviceToken) return;
      try {
        const res = await fetch(getApiUrl("/api/notifications"), {
          headers: { "x-device-token": profile.deviceToken },
        });
        if (res.ok) {
          const data = await res.json() as Array<{ read: boolean }>;
          setUnreadCount(data.filter((n) => !n.read).length);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [profile.deviceToken]);

  const recentAttempts = useMemo(() => attempts.slice(0, 3), [attempts]);
  const avgScore = useMemo(() => {
    if (attempts.length === 0) return null;
    return (attempts.reduce((s, a) => s + a.overallScore, 0) / attempts.length).toFixed(1);
  }, [attempts]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Olá,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{profile.name || "Estudante"}</Text>
          <Text style={[styles.level, { color: colors.primary }]}>{LEVEL_LABELS[profile.level]}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/profile"); }}
            style={[styles.profileBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.avatarText}>{(profile.name || "E")[0]!.toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      <GuestBanner />
      <DaysUntilExam examDate={profile.examDate} />
      <StreakCard streak={profile.streakDays} best={profile.bestStreak} />
      {featureFlags["hearts_enabled"] && <HeartsBar />}
      <AICreditsBar used={profile.aiCreditsUsed} total={profile.aiCreditsTotal} />
      {!profile.diagnosticDone && <DiagnosticBanner />}

      {/* Daily Challenge */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Desafio do Dia</Text>
      <DailyChallenge />

      {/* Word of the Day */}
      <WordOfTheDay />

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Acesso rápido</Text>
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [
              styles.quickCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => router.push(a.route as any)}
          >
            <View style={[styles.quickIcon, { backgroundColor: a.color + "18" }]}>
              <Feather name={a.icon} size={22} color={a.color} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Social feature cards */}
      {(featureFlags["leaderboards_enabled"] || featureFlags["community_enabled"] || featureFlags["live_lessons_enabled"] || featureFlags["teacher_marketplace_enabled"]) && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Comunidade</Text>
          {featureFlags["leaderboards_enabled"] && (
            <FeatureCard icon="🏆" label="Ranking" sublabel="Veja os alunos mais dedicados" color="#BA7517"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/leaderboard" as any); }} />
          )}
          {featureFlags["community_enabled"] && (
            <FeatureCard icon="💬" label="Comunidade" sublabel="Tire dúvidas e compartilhe dicas" color="#1D9E75"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/community" as any); }} />
          )}
          {featureFlags["live_lessons_enabled"] && (
            <FeatureCard icon="📹" label="Aulas ao Vivo" sublabel="Sessões ao vivo com professores" color="#185FA5"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/live-events" as any); }} />
          )}
          {featureFlags["teacher_marketplace_enabled"] && (
            <FeatureCard icon="👩‍🏫" label="Conectar Professor" sublabel="Receba feedback de um professor" color="#6B21A8"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/teacher-connect" as any); }} />
          )}
        </>
      )}

      {/* Extra features section */}
      {(featureFlags["placement_test_v2_enabled"] || featureFlags["manual_teacher_feedback_enabled"]) && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ferramentas</Text>
          {featureFlags["placement_test_v2_enabled"] && (
            <FeatureCard icon="🎯" label="Refazer Nivelamento" sublabel="Descubra seu nível atual do Celpe-Bras" color="#185FA5"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/diagnostic" as any); }} />
          )}
          {featureFlags["manual_teacher_feedback_enabled"] && (
            <FeatureCard icon="✍️" label="Feedback de Professor" sublabel="Envie sua produção para revisão personalizada" color="#6B21A8"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/teacher-feedback" as any); }} />
          )}
        </>
      )}

      {(featureFlags["mobile_app_mode_enabled"]
        || featureFlags["offline_mode_enabled"]
        || featureFlags["content_import_enabled"]
        || featureFlags["certificates_enabled"]) && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recursos</Text>
          {featureFlags["mobile_app_mode_enabled"] && (
            <FutureFeatureCard
              icon="📱"
              label="Modo Mobile"
              sublabel="Acesso otimizado para uso no celular"
              color="#185FA5"
              onPress={() => router.push("/profile")}
            />
          )}
          {featureFlags["offline_mode_enabled"] && (
            <FutureFeatureCard
              icon="📴"
              label="Modo Offline"
              sublabel="Baixe conteúdo para estudar sem internet"
              color="#1D9E75"
              onPress={() => router.push("/library")}
            />
          )}
          {featureFlags["content_import_enabled"] && (
            <FutureFeatureCard
              icon="📦"
              label="Importar Conteúdo"
              sublabel="Ferramenta interna do admin, sem tela pública"
              color="#BA7517"
            />
          )}
          {featureFlags["certificates_enabled"] && (
            <FutureFeatureCard
              icon="🏅"
              label="Certificados"
              sublabel="Visualize conclusões e trilhas finalizadas"
              color="#6B21A8"
              onPress={() => router.push("/progress")}
            />
          )}
        </>
      )}

      {/* Offline mode card */}
      {featureFlags["offline_mode_enabled"] && <OfflineModeCard />}

      {/* Mobile app download card */}
      {featureFlags["mobile_app_mode_enabled"] && <MobileAppCard />}

      {/* Progress summary */}
      {avgScore && (
        <Pressable
          style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/progress")}
        >
          <View style={styles.statsTitleRow}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Seu progresso</Text>
            <View style={styles.statsChevron}>
              <Text style={[styles.statsViewAll, { color: colors.primary }]}>Ver análise</Text>
              <Feather name="chevron-right" size={14} color={colors.primary} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{attempts.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Práticas</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>{avgScore}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Média</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.purple }]}>{profile.streakDays}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sequência</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Recent attempts */}
      {recentAttempts.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Práticas recentes</Text>
          {recentAttempts.map((a) => (
            <View key={a.id} style={[styles.attemptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.attemptLeft}>
                <Text style={[styles.attemptTask, { color: colors.text }]}>{a.taskType}</Text>
                <Text style={[styles.attemptDate, { color: colors.mutedForeground }]}>
                  {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <View style={styles.attemptRubrics}>
                {[a.rubricTema, a.rubricGenero, a.rubricCoesao, a.rubricGramatica].map((r, i) => {
                  const rc = r >= 3.5 ? "#1D9E75" : r >= 2.5 ? "#BA7517" : "#D85A30";
                  return (
                    <View key={i} style={[styles.rubricDot, { backgroundColor: rc + "25" }]}>
                      <Text style={[styles.rubricDotText, { color: rc }]}>{r.toFixed(0)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={[styles.scorePill, {
                backgroundColor: a.overallScore >= 3 ? colors.successBg : a.overallScore >= 2 ? colors.warningBg : colors.errorBg
              }]}>
                <Text style={[styles.scoreText, {
                  color: a.overallScore >= 3 ? colors.success : a.overallScore >= 2 ? colors.warning : colors.destructive
                }]}>
                  {a.overallScore.toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {attempts.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="edit-3" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Comece a praticar</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Faça sua primeira prática e receba avaliação da IA
          </Text>
          <Pressable style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/practice")}>
            <Text style={styles.startBtnText}>Começar agora</Text>
          </Pressable>
        </View>
      )}
      <AdBanner size="adaptive" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  level: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  profileBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  examBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  examBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  streakCard: { borderRadius: 16, padding: 20 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  streakLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" },
  streakNumber: { color: "#fff", fontSize: 40, fontFamily: "Inter_700Bold", lineHeight: 44 },
  streakUnit: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  streakDivider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.2)" },
  streakIcon: { marginLeft: "auto" as any },
  creditsCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  creditsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  creditsLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  creditsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  creditsCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  creditsTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  creditsFill: { height: 6, borderRadius: 3 },
  upgradeBtn: { paddingTop: 4 },
  upgradeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  diagBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  diagIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  diagMeta: { flex: 1 },
  diagTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  diagSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  // Daily Challenge
  challengeCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  challengeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  challengeLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 },
  challengeCatBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  challengeCatText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  doneBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  challengeQuestion: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  challengeOptions: { gap: 8 },
  challengeOption: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, padding: 12 },
  challengeOptionLetter: { fontSize: 12, fontFamily: "Inter_700Bold", width: 16 },
  challengeOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 19 },
  challengeExplanation: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  challengeExplTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  challengeExplText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  challengeDoneText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  // WOTD
  wotdCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  wotdHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wotdHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  wotdLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  wotdLink: {},
  wotdLinkText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  wotdBody: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  wotdWord: { fontSize: 22, fontFamily: "Inter_700Bold" },
  wotdPosBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  wotdPos: { fontSize: 11, fontFamily: "Inter_500Medium" },
  wotdTopicRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  wotdTopicText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  wotdDef: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  wotdExampleWrap: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4 },
  wotdExample: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, fontStyle: "italic" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: { width: "30%", flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  statsTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsChevron: { flexDirection: "row", alignItems: "center", gap: 2 },
  statsViewAll: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNumber: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 36 },
  attemptCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
  attemptLeft: { flex: 1, gap: 2 },
  attemptTask: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  attemptDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  attemptRubrics: { flexDirection: "row", gap: 3 },
  rubricDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rubricDotText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  scorePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 10, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  startBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  startBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  offlineCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  offlineRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  offlineIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  offlineTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  offlineSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  offlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  offlineBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  appCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  appCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  appCardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  appCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  appCardBtns: { flexDirection: "row", gap: 10 },
  storePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, flex: 1, justifyContent: "center" },
  storePillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heartsCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  heartsLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  heartsLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  heartsRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "center" },
  heartIcon: { fontSize: 17 },
  heartsCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  featureCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureEmoji: { fontSize: 22 },
  featureMeta: { flex: 1, gap: 2 },
  featureLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
