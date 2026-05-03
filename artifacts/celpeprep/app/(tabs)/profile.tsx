import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@clerk/expo";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const LEVELS = ["A2", "B1", "B2", "C1"] as const;
const AD_DURATION = 5;
const DAILY_KEY = "celpeprep_rewarded_ads_daily";

const AVATAR_EMOJIS = [
  "🎓","📚","✏️","🧠","🌟","🔥","💪","🦁",
  "🐯","🦊","🐺","🦅","🌊","⚡","🎯","🏆",
  "🌈","🍀","🌸","🦋","🐉","🦄","🎭","🎪",
  "🚀","🌙","⭐","💎","🔮","🎵","🎸","🎺",
];

function getApiUrl(path: string) {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}${path}` : path;
}

interface AdsConfig {
  rewardedAdsEnabled: boolean;
  rewardedAdCreditAmount: number;
  rewardedAdMaxPerDay: number;
}

interface DailyRecord {
  date: string;
  count: number;
}

async function getDailyRecord(): Promise<DailyRecord> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyRecord;
      const today = new Date().toDateString();
      if (parsed.date === today) return parsed;
    }
  } catch (_) {}
  return { date: new Date().toDateString(), count: 0 };
}

async function incrementDailyRecord(current: DailyRecord): Promise<DailyRecord> {
  const next = { date: new Date().toDateString(), count: current.count + 1 };
  await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(next));
  return next;
}

function EmojiPickerModal({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancelar</Text></Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Escolher avatar</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.emojiGrid}>
          <Text style={[styles.emojiGridLabel, { color: colors.mutedForeground }]}>Selecione um emoji para o seu perfil</Text>
          <View style={styles.emojiRow}>
            {AVATAR_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(emoji); onClose(); }}
                style={[
                  styles.emojiCell,
                  { backgroundColor: emoji === current ? colors.primary + "22" : colors.muted },
                  emoji === current && { borderWidth: 2, borderColor: colors.primary },
                ]}
              >
                <Text style={styles.emojiCellText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { profile, syncProfileToServer } = useApp();
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || "");
  const [level, setLevel] = useState(profile.level);
  const [examDate, setExamDate] = useState(profile.examDate || "");
  const [dailyGoal, setDailyGoal] = useState(String(profile.dailyGoalMinutes));
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    if (visible) {
      setName(profile.name);
      setUsername(profile.username || "");
      setLevel(profile.level);
      setExamDate(profile.examDate || "");
      setDailyGoal(String(profile.dailyGoalMinutes));
      setUsernameError("");
    }
  }, [visible]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Nome obrigatório"); return; }
    setSaving(true);
    const result = await syncProfileToServer({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      level,
      examDate: examDate || null,
      dailyGoalMinutes: Number(dailyGoal) || 30,
    });
    setSaving(false);
    if (!result.ok && result.error === "username_taken") {
      setUsernameError("Este nome de usuário já está em uso.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancelar</Text></Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Editar perfil</Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text style={[styles.modalSave, { color: saving ? colors.mutedForeground : colors.primary }]}>
              {saving ? "..." : "Salvar"}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={[styles.label, { color: colors.text }]}>Nome de exibição</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={name} onChangeText={setName} placeholder="Seu nome"
            placeholderTextColor={colors.mutedForeground} autoFocus
          />

          <Text style={[styles.label, { color: colors.text }]}>Nome de usuário</Text>
          <View style={[styles.usernameWrap, { backgroundColor: colors.input, borderColor: usernameError ? colors.destructive : colors.border }]}>
            <Text style={[styles.usernameAt, { color: colors.mutedForeground }]}>@</Text>
            <TextInput
              style={[styles.usernameInput, { color: colors.text }]}
              value={username}
              onChangeText={(t) => { setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, "")); setUsernameError(""); }}
              placeholder="seu_usuario"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {usernameError ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{usernameError}</Text> : null}
          <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Apenas letras minúsculas, números e _</Text>

          <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
          <View style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, justifyContent: "center" }]}>
            <Text style={[{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" }]}>
              {profile.email || "Não definido — não pode ser alterado"}
            </Text>
          </View>
          <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>O e-mail é fixo e não pode ser alterado</Text>

          <Text style={[styles.label, { color: colors.text }]}>Nível atual</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((l) => (
              <Pressable key={l} onPress={() => setLevel(l)} style={[styles.levelPill, { backgroundColor: level === l ? colors.primary : colors.muted }]}>
                <Text style={[styles.levelText, { color: level === l ? "#fff" : colors.mutedForeground }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Data da prova (AAAA-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={examDate} onChangeText={setExamDate} placeholder="Ex: 2025-11-01"
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.label, { color: colors.text }]}>Meta diária (minutos)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={dailyGoal} onChangeText={setDailyGoal} keyboardType="numeric" placeholder="30"
            placeholderTextColor={colors.mutedForeground}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function RewardedAdModal({
  visible,
  creditAmount,
  onComplete,
  onDismiss,
}: {
  visible: boolean;
  creditAmount: number;
  onComplete: () => void;
  onDismiss: () => void;
}) {
  const colors = useColors();
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [adFinished, setAdFinished] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCountdown(AD_DURATION);
    setAdFinished(false);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AD_DURATION * 1000,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setAdFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.adOverlay}>
        <View style={[styles.adModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.adHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.adBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.adBadgeText, { color: colors.mutedForeground }]}>ANÚNCIO</Text>
            </View>
            {adFinished ? (
              <Pressable onPress={onDismiss} style={[styles.adCloseBtn, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : (
              <View style={[styles.adCountdown, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.adCountdownText, { color: colors.primary }]}>{countdown}s</Text>
              </View>
            )}
          </View>
          <View style={[styles.adPlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="monitor" size={40} color={colors.mutedForeground} />
            <Text style={[styles.adPlaceholderText, { color: colors.mutedForeground }]}>Anúncio em exibição...</Text>
            <Text style={[styles.adPlaceholderSub, { color: colors.mutedForeground }]}>Aguarde para ganhar seus créditos</Text>
          </View>
          <View style={styles.adProgressWrap}>
            <View style={[styles.adProgressBg, { backgroundColor: colors.muted }]}>
              <Animated.View
                style={[styles.adProgressBar, {
                  backgroundColor: colors.primary,
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                }]}
              />
            </View>
          </View>
          {adFinished && (
            <Pressable style={[styles.adClaimBtn, { backgroundColor: colors.primary }]} onPress={onComplete}>
              <Feather name="gift" size={16} color="#fff" />
              <Text style={styles.adClaimText}>Resgatar +{creditAmount} crédito{creditAmount !== 1 ? "s" : ""}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { profile, attempts, vocabWords, updateProfile, syncProfileToServer, featureFlags } = useApp();
  const [editVisible, setEditVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyRecord>({ date: "", count: 0 });
  const [claiming, setClaiming] = useState(false);
  const [aboutUrl, setAboutUrl] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const avgScore = attempts.length > 0
    ? (attempts.reduce((s, a) => s + a.overallScore, 0) / attempts.length).toFixed(1)
    : "—";
  const mastered = vocabWords.filter((w) => w.status === "mastered").length;
  const remaining = Math.max(0, profile.aiCreditsTotal - profile.aiCreditsUsed);

  useEffect(() => {
    fetchAdsConfig();
    fetchAppInfo();
    getDailyRecord().then(setDailyRecord);
  }, []);

  const fetchAdsConfig = async () => {
    try {
      const res = await fetch(getApiUrl("/api/content/ads-config"));
      if (!res.ok) return;
      const data = await res.json() as Partial<AdsConfig>;
      setAdsConfig({
        rewardedAdsEnabled: data.rewardedAdsEnabled ?? false,
        rewardedAdCreditAmount: data.rewardedAdCreditAmount ?? 1,
        rewardedAdMaxPerDay: data.rewardedAdMaxPerDay ?? 3,
      });
    } catch (_) {}
  };

  const fetchAppInfo = async () => {
    try {
      const res = await fetch(getApiUrl("/api/content/app-info"));
      if (!res.ok) return;
      const data = await res.json() as { aboutUrl?: string };
      setAboutUrl(data.aboutUrl ?? "");
    } catch (_) {}
  };

  const handleEmojiSelect = useCallback(async (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncProfileToServer({ avatarEmoji: emoji });
  }, [syncProfileToServer]);

  const handleWatchAd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAdVisible(true);
  }, []);

  const handleAdComplete = useCallback(async () => {
    if (claiming || !adsConfig || !profile.deviceToken) return;
    setClaiming(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/profile/${profile.deviceToken}/rewarded-ad`),
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const creditAmount = adsConfig.rewardedAdCreditAmount;
      if (res.ok) {
        await updateProfile({ aiCreditsTotal: profile.aiCreditsTotal + creditAmount });
      } else {
        await updateProfile({ aiCreditsTotal: profile.aiCreditsTotal + creditAmount });
      }
      const nextRecord = await incrementDailyRecord(dailyRecord);
      setDailyRecord(nextRecord);
      setAdVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Créditos adicionados!", `+${creditAmount} crédito${creditAmount !== 1 ? "s" : ""} de IA adicionado${creditAmount !== 1 ? "s" : ""} à sua conta.`);
    } catch (_) {
      const creditAmount = adsConfig.rewardedAdCreditAmount;
      await updateProfile({ aiCreditsTotal: profile.aiCreditsTotal + creditAmount });
      const nextRecord = await incrementDailyRecord(dailyRecord);
      setDailyRecord(nextRecord);
      setAdVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Créditos adicionados!", `+${creditAmount} crédito${creditAmount !== 1 ? "s" : ""} adicionado${creditAmount !== 1 ? "s" : ""}.`);
    } finally {
      setClaiming(false);
    }
  }, [claiming, adsConfig, profile, dailyRecord, updateProfile]);

  const handleReset = () => {
    Alert.alert("Reiniciar app", "Isso vai apagar todos os dados locais. Continuar?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Reiniciar", style: "destructive", onPress: () => { router.replace("/onboarding"); } },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const handleAbout = () => {
    if (aboutUrl) {
      Linking.openURL(aboutUrl);
    } else {
      Alert.alert("Sobre o CelpePrep", "CelpePrep v1.0\nPreparação completa para o exame Celpe-Bras.");
    }
  };

  const showRewardedAd = adsConfig?.rewardedAdsEnabled && !profile.isPremium;
  const adsWatchedToday = dailyRecord.date === new Date().toDateString() ? dailyRecord.count : 0;
  const adsRemainingToday = Math.max(0, (adsConfig?.rewardedAdMaxPerDay ?? 3) - adsWatchedToday);
  const canWatchAd = showRewardedAd && adsRemainingToday > 0;

  const displayEmoji = profile.avatarEmoji || "🎓";
  const displayName = profile.name || "Estudante";
  const displayHandle = profile.username ? `@${profile.username}` : null;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Hero Card ── */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroBg, { backgroundColor: colors.primary + "14" }]} />

        <View style={styles.heroContent}>
          {/* Avatar */}
          <Pressable onPress={() => setEmojiPickerVisible(true)} style={styles.avatarWrap}>
            <View style={[styles.avatarOuter, { borderColor: colors.primary + "60" }]}>
              <View style={[styles.avatarInner, { backgroundColor: colors.primary + "18" }]}>
                <Text style={styles.avatarEmoji}>{displayEmoji}</Text>
              </View>
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={10} color="#fff" />
            </View>
          </Pressable>

          {/* Name / handle / level */}
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, { color: colors.text }]}>{displayName}</Text>
            {displayHandle && (
              <Text style={[styles.heroHandle, { color: colors.primary }]}>{displayHandle}</Text>
            )}
            <View style={styles.heroMeta}>
              <View style={[styles.levelBadge, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.levelBadgeText, { color: colors.primary }]}>Celpe-Bras {profile.level}</Text>
              </View>
              {profile.isPremium && (
                <View style={[styles.premiumBadgeSmall, { backgroundColor: "#7c3aed22" }]}>
                  <Feather name="star" size={10} color="#7c3aed" />
                  <Text style={[styles.premiumBadgeSmallText, { color: "#7c3aed" }]}>Premium</Text>
                </View>
              )}
            </View>
            {profile.examDate && (
              <Text style={[styles.heroExam, { color: colors.mutedForeground }]}>
                Prova: {new Date(profile.examDate).toLocaleDateString("pt-BR")}
              </Text>
            )}
          </View>

          <Pressable onPress={() => setEditVisible(true)} style={[styles.editBtn, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="edit-2" size={15} color={colors.primary} />
          </Pressable>
        </View>

        {/* Email row */}
        {profile.email ? (
          <View style={[styles.emailRow, { borderTopColor: colors.border }]}>
            <Feather name="mail" size={13} color={colors.mutedForeground} />
            <Text style={[styles.emailText, { color: colors.mutedForeground }]}>{profile.email}</Text>
            <View style={[styles.emailLock, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={10} color={colors.mutedForeground} />
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Stats Grid ── */}
      <View style={[styles.statsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { value: String(profile.streakDays), label: "Sequência", icon: "🔥", color: colors.warning },
          { value: String(attempts.length), label: "Práticas", icon: "📝", color: colors.accent },
          { value: String(avgScore), label: "Média", icon: "⭐", color: colors.primary },
          { value: String(mastered), label: "Palavras", icon: "🧠", color: "#7c3aed" },
        ].map((stat, i, arr) => (
          <React.Fragment key={stat.label}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>{stat.icon}</Text>
              <Text style={[styles.statNum, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── AI Credits ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Créditos IA</Text>
      <View style={[styles.creditsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.creditsRow}>
          <View style={[styles.creditsIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="cpu" size={18} color={colors.primary} />
          </View>
          <View style={styles.creditsMeta}>
            <Text style={[styles.creditsTitle, { color: colors.text }]}>Avaliações com IA</Text>
            <Text style={[styles.creditsDesc, { color: colors.mutedForeground }]}>
              {remaining} restante{remaining !== 1 ? "s" : ""} de {profile.aiCreditsTotal}
            </Text>
          </View>
          <View style={[styles.creditsPill, { backgroundColor: remaining === 0 ? colors.destructive + "18" : colors.primary + "18" }]}>
            <Text style={[styles.creditsPillText, { color: remaining === 0 ? colors.destructive : colors.primary }]}>
              {remaining}/{profile.aiCreditsTotal}
            </Text>
          </View>
        </View>

        {/* Credits bar */}
        <View style={[styles.creditsBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.creditsBarFill, {
            backgroundColor: remaining === 0 ? colors.destructive : colors.primary,
            width: `${Math.min(100, (remaining / Math.max(1, profile.aiCreditsTotal)) * 100)}%` as any,
          }]} />
        </View>

        {showRewardedAd && (
          <View style={[styles.rewardedAdCard, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "30" }]}>
            <View style={styles.rewardedAdHeader}>
              <Feather name="tv" size={16} color={colors.accent} />
              <Text style={[styles.rewardedAdTitle, { color: colors.accent }]}>Ganhar créditos com anúncios</Text>
              <View style={[styles.rewardedAdBadge, { backgroundColor: colors.accent + "20" }]}>
                <Text style={[styles.rewardedAdBadgeText, { color: colors.accent }]}>
                  {adsWatchedToday}/{adsConfig?.rewardedAdMaxPerDay ?? 3} hoje
                </Text>
              </View>
            </View>
            <Text style={[styles.rewardedAdDesc, { color: colors.mutedForeground }]}>
              Assista a um anúncio curto e ganhe{" "}
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>
                +{adsConfig?.rewardedAdCreditAmount ?? 1} crédito{(adsConfig?.rewardedAdCreditAmount ?? 1) !== 1 ? "s" : ""}
              </Text>
              {" "}de IA instantaneamente.
            </Text>
            {canWatchAd ? (
              <Pressable style={[styles.rewardedAdBtn, { backgroundColor: colors.accent }]} onPress={handleWatchAd}>
                <Feather name="play-circle" size={15} color="#fff" />
                <Text style={styles.rewardedAdBtnText}>
                  Assistir anúncio — +{adsConfig?.rewardedAdCreditAmount ?? 1} crédito{(adsConfig?.rewardedAdCreditAmount ?? 1) !== 1 ? "s" : ""}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.rewardedAdBtn, { backgroundColor: colors.muted }]}>
                <Feather name="check-circle" size={15} color={colors.mutedForeground} />
                <Text style={[styles.rewardedAdBtnText, { color: colors.mutedForeground }]}>Limite diário atingido — volte amanhã</Text>
              </View>
            )}
          </View>
        )}

        {!profile.isPremium && (
          <View style={[styles.upgradeCard, { backgroundColor: "#7c3aed12", borderColor: "#7c3aed30" }]}>
            <View style={styles.upgradeHeader}>
              <Feather name="zap" size={16} color="#7c3aed" />
              <Text style={[styles.upgradeTitle, { color: "#7c3aed" }]}>Premium — avaliações ilimitadas</Text>
            </View>
            <Text style={[styles.upgradeDesc, { color: colors.mutedForeground }]}>
              Sem limites de avaliação, vocabulário e práticas geradas por IA.
            </Text>
            <Pressable style={[styles.upgradeBtn, { backgroundColor: "#7c3aed" }]} onPress={() => router.push("/paywall")}>
              <Text style={styles.upgradeBtnText}>Ver planos</Text>
              <Feather name="arrow-right" size={14} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Feature-flag sections ── */}
      {(featureFlags["certificates_enabled"] || featureFlags["teacher_marketplace_enabled"]) && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recursos</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {featureFlags["certificates_enabled"] && (
              <Pressable
                style={[styles.settingsRow, { borderBottomColor: colors.border, borderBottomWidth: featureFlags["teacher_marketplace_enabled"] ? 1 : 0 }]}
                onPress={() => router.push("/certificates" as any)}
              >
                <View style={[styles.settingsIcon, { backgroundColor: "#BA751718" }]}>
                  <Feather name="award" size={16} color="#BA7517" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Certificados</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                    Conquistas e certificados de conclusão
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
            {featureFlags["teacher_marketplace_enabled"] && (
              <Pressable
                style={[styles.settingsRow, { borderBottomWidth: 0 }]}
                onPress={() => router.push("/teacher-connect" as any)}
              >
                <View style={[styles.settingsIcon, { backgroundColor: "#6B21A818" }]}>
                  <Feather name="user-check" size={16} color="#6B21A8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Conectar Professor</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                    Receba feedback personalizado de um professor
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </>
      )}

      {/* ── Settings ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Configurações</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={() => setEditVisible(true)}>
          <View style={[styles.settingsIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="user" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Editar perfil</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={() => router.push("/exams")}>
          <View style={[styles.settingsIcon, { backgroundColor: "#7c3aed18" }]}>
            <Feather name="archive" size={16} color="#7c3aed" />
          </View>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Provas anteriores</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={handleAbout}>
          <View style={[styles.settingsIcon, { backgroundColor: colors.accent + "18" }]}>
            <Feather name="info" size={16} color={colors.accent} />
          </View>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Sobre o app</Text>
          <Feather name="external-link" size={14} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={handleReset}>
          <View style={[styles.settingsIcon, { backgroundColor: colors.destructive + "18" }]}>
            <Feather name="refresh-cw" size={16} color={colors.destructive} />
          </View>
          <Text style={[styles.settingsLabel, { color: colors.destructive }]}>Reiniciar dados</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={[styles.settingsRow, { borderBottomWidth: 0 }]} onPress={handleSignOut}>
          <View style={[styles.settingsIcon, { backgroundColor: "#D85A3018" }]}>
            <Feather name="log-out" size={16} color="#D85A30" />
          </View>
          <Text style={[styles.settingsLabel, { color: "#D85A30" }]}>Sair da conta</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>CelpePrep v1.0 — Preparação Celpe-Bras</Text>

      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />
      <EmojiPickerModal
        visible={emojiPickerVisible}
        current={displayEmoji}
        onSelect={handleEmojiSelect}
        onClose={() => setEmojiPickerVisible(false)}
      />
      <RewardedAdModal
        visible={adVisible}
        creditAmount={adsConfig?.rewardedAdCreditAmount ?? 1}
        onComplete={handleAdComplete}
        onDismiss={() => setAdVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 14 },

  heroCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  heroBg: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  heroContent: { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 14 },
  avatarWrap: { position: "relative" },
  avatarOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  avatarInner: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 34 },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  heroInfo: { flex: 1, gap: 4, paddingTop: 4 },
  heroName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  heroHandle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  heroMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  levelBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  premiumBadgeSmall: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  premiumBadgeSmallText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  heroExam: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  editBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  emailText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  emailLock: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },

  statsGrid: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statEmoji: { fontSize: 18 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 40 },

  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },

  creditsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  creditsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  creditsIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  creditsMeta: { flex: 1 },
  creditsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  creditsDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  creditsPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  creditsPillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  creditsBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  creditsBarFill: { height: 6, borderRadius: 3 },

  rewardedAdCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 10 },
  rewardedAdHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardedAdTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rewardedAdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  rewardedAdBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rewardedAdDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  rewardedAdBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  rewardedAdBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },

  upgradeCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  upgradeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  upgradeTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  upgradeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  upgradeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  settingsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },

  version: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },

  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular", width: 60 },
  modalSave: { fontSize: 15, fontFamily: "Inter_600SemiBold", width: 60, textAlign: "right" },
  modalBody: { padding: 20, gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  usernameWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  usernameAt: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginRight: 4 },
  usernameInput: { flex: 1, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  fieldError: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  levelRow: { flexDirection: "row", gap: 8 },
  levelPill: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  levelText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  emojiGrid: { padding: 20 },
  emojiGridLabel: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 20 },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  emojiCell: { width: 60, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emojiCellText: { fontSize: 30 },

  adOverlay: { flex: 1, backgroundColor: "#000a", alignItems: "center", justifyContent: "center", padding: 24 },
  adModal: { width: "100%", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  adHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  adBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  adBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  adCountdown: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  adCountdownText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  adCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  adPlaceholder: { height: 160, alignItems: "center", justifyContent: "center", gap: 8 },
  adPlaceholderText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  adPlaceholderSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  adProgressWrap: { padding: 12 },
  adProgressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  adProgressBar: { height: 6, borderRadius: 3 },
  adClaimBtn: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, padding: 14, borderRadius: 12, justifyContent: "center" },
  adClaimText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
