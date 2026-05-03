import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const LEVELS = ["A2", "B1", "B2", "C1"] as const;
const AD_DURATION = 5;
const DAILY_KEY = "celpeprep_rewarded_ads_daily";

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

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { profile, updateProfile } = useApp();
  const [name, setName] = useState(profile.name);
  const [level, setLevel] = useState(profile.level);
  const [examDate, setExamDate] = useState(profile.examDate || "");
  const [dailyGoal, setDailyGoal] = useState(String(profile.dailyGoalMinutes));

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Nome obrigatório"); return; }
    await updateProfile({ name: name.trim(), level, examDate: examDate || null, dailyGoalMinutes: Number(dailyGoal) || 30 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancelar</Text></Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Editar perfil</Text>
          <Pressable onPress={handleSave}><Text style={[styles.modalSave, { color: colors.primary }]}>Salvar</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={colors.mutedForeground} autoFocus />
          <Text style={[styles.label, { color: colors.text }]}>Nível atual</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((l) => (
              <Pressable key={l} onPress={() => setLevel(l)} style={[styles.levelPill, { backgroundColor: level === l ? colors.primary : colors.muted }]}>
                <Text style={[styles.levelText, { color: level === l ? "#fff" : colors.mutedForeground }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.text }]}>Data da prova (AAAA-MM-DD)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={examDate} onChangeText={setExamDate} placeholder="Ex: 2025-11-01" placeholderTextColor={colors.mutedForeground} />
          <Text style={[styles.label, { color: colors.text }]}>Meta diária (minutos)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={dailyGoal} onChangeText={setDailyGoal} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.mutedForeground} />
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
            <Text style={[styles.adPlaceholderText, { color: colors.mutedForeground }]}>
              Anúncio em exibição...
            </Text>
            <Text style={[styles.adPlaceholderSub, { color: colors.mutedForeground }]}>
              Aguarde para ganhar seus créditos
            </Text>
          </View>

          <View style={styles.adProgressWrap}>
            <View style={[styles.adProgressBg, { backgroundColor: colors.muted }]}>
              <Animated.View
                style={[
                  styles.adProgressBar,
                  {
                    backgroundColor: colors.primary,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {adFinished && (
            <Pressable
              style={[styles.adClaimBtn, { backgroundColor: colors.primary }]}
              onPress={onComplete}
            >
              <Feather name="gift" size={16} color="#fff" />
              <Text style={styles.adClaimText}>
                Resgatar +{creditAmount} crédito{creditAmount !== 1 ? "s" : ""}
              </Text>
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
  const { profile, attempts, vocabWords, updateProfile } = useApp();
  const [editVisible, setEditVisible] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyRecord>({ date: "", count: 0 });
  const [claiming, setClaiming] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const avgScore = attempts.length > 0
    ? (attempts.reduce((s, a) => s + a.overallScore, 0) / attempts.length).toFixed(1)
    : "—";
  const mastered = vocabWords.filter((w) => w.status === "mastered").length;
  const remaining = Math.max(0, profile.aiCreditsTotal - profile.aiCreditsUsed);

  useEffect(() => {
    fetchAdsConfig();
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
      Alert.alert(
        "Créditos adicionados!",
        `+${creditAmount} crédito${creditAmount !== 1 ? "s" : ""} de IA adicionado${creditAmount !== 1 ? "s" : ""} à sua conta.`
      );
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
      { text: "Reiniciar", style: "destructive", onPress: () => {
        router.replace("/onboarding");
      }},
    ]);
  };

  const showRewardedAd = adsConfig?.rewardedAdsEnabled && !profile.isPremium;
  const adsWatchedToday = dailyRecord.date === new Date().toDateString() ? dailyRecord.count : 0;
  const adsRemainingToday = Math.max(0, (adsConfig?.rewardedAdMaxPerDay ?? 3) - adsWatchedToday);
  const canWatchAd = showRewardedAd && adsRemainingToday > 0;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{(profile.name || "E")[0].toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>{profile.name || "Estudante"}</Text>
          <Text style={[styles.profileLevel, { color: colors.primary }]}>Celpe-Bras {profile.level}</Text>
          {profile.examDate && (
            <Text style={[styles.profileExam, { color: colors.mutedForeground }]}>
              Prova: {new Date(profile.examDate).toLocaleDateString("pt-BR")}
            </Text>
          )}
        </View>
        <Pressable onPress={() => setEditVisible(true)} style={[styles.editBtn, { backgroundColor: colors.muted }]}>
          <Feather name="edit-2" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {profile.isPremium && (
        <View style={[styles.premiumBadge, { backgroundColor: colors.purple + "18", borderColor: colors.purple }]}>
          <Feather name="star" size={14} color={colors.purple} />
          <Text style={[styles.premiumText, { color: colors.purple }]}>Premium ativo — avaliações ilimitadas</Text>
        </View>
      )}

      <View style={[styles.statsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{profile.streakDays}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sequência</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.accent }]}>{attempts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Práticas</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{avgScore}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Média</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.purple }]}>{mastered}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Palavras</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Créditos IA</Text>
      <View style={[styles.creditsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.creditsRow}>
          <Feather name="cpu" size={18} color={colors.primary} />
          <View style={styles.creditsMeta}>
            <Text style={[styles.creditsTitle, { color: colors.text }]}>Avaliações com IA</Text>
            <Text style={[styles.creditsDesc, { color: colors.mutedForeground }]}>
              {remaining} restante{remaining !== 1 ? "s" : ""} de {profile.aiCreditsTotal}
            </Text>
          </View>
          <Text style={[styles.creditsCount, { color: remaining === 0 ? colors.destructive : colors.primary }]}>
            {remaining}/{profile.aiCreditsTotal}
          </Text>
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
              <Pressable
                style={[styles.rewardedAdBtn, { backgroundColor: colors.accent }]}
                onPress={handleWatchAd}
              >
                <Feather name="play-circle" size={15} color="#fff" />
                <Text style={styles.rewardedAdBtnText}>
                  Assistir anúncio — +{adsConfig?.rewardedAdCreditAmount ?? 1} crédito{(adsConfig?.rewardedAdCreditAmount ?? 1) !== 1 ? "s" : ""}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.rewardedAdBtn, { backgroundColor: colors.muted }]}>
                <Feather name="check-circle" size={15} color={colors.mutedForeground} />
                <Text style={[styles.rewardedAdBtnText, { color: colors.mutedForeground }]}>
                  Limite diário atingido — volte amanhã
                </Text>
              </View>
            )}
          </View>
        )}

        {!profile.isPremium && (
          <View style={[styles.upgradeCard, { backgroundColor: colors.purple + "12", borderColor: colors.purple + "30" }]}>
            <Text style={[styles.upgradeTitle, { color: colors.purple }]}>Premium — avaliações ilimitadas</Text>
            <Text style={[styles.upgradeDesc, { color: colors.mutedForeground }]}>
              Sem limites de avaliação, vocabulário e práticas geradas por IA.
            </Text>
            <Pressable style={[styles.upgradeBtn, { backgroundColor: colors.purple }]}>
              <Text style={styles.upgradeBtnText}>Ver planos</Text>
              <Feather name="arrow-right" size={14} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Configurações</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={() => setEditVisible(true)}>
          <Feather name="user" size={18} color={colors.primary} />
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Editar perfil</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={() => router.push("/exams")}>
          <Feather name="archive" size={18} color={colors.purple} />
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Provas anteriores</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={[styles.settingsRow, { borderBottomWidth: 0 }]} onPress={handleReset}>
          <Feather name="refresh-cw" size={18} color={colors.destructive} />
          <Text style={[styles.settingsLabel, { color: colors.destructive }]}>Reiniciar dados</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>CelpePrep v1.0 — Preparação Celpe-Bras</Text>

      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />
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
  content: { paddingHorizontal: 20, gap: 14 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileLevel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  profileExam: { fontSize: 12, fontFamily: "Inter_400Regular" },
  editBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  premiumBadge: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  premiumText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 36 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  creditsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  creditsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  creditsMeta: { flex: 1 },
  creditsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  creditsDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  creditsCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rewardedAdCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 10 },
  rewardedAdHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardedAdTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rewardedAdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  rewardedAdBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rewardedAdDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  rewardedAdBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  rewardedAdBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  upgradeCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  upgradeTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  upgradeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  upgradeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  settingsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  settingsLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  version: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalCancel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalSave: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 20, gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  levelRow: { flexDirection: "row", gap: 8 },
  levelPill: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  levelText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  adOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 24 },
  adModal: { width: "100%", maxWidth: 380, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  adHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1 },
  adBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  adBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  adCountdown: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  adCountdownText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  adCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  adPlaceholder: { height: 180, alignItems: "center", justifyContent: "center", gap: 10, margin: 14, borderRadius: 10 },
  adPlaceholderText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  adPlaceholderSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  adProgressWrap: { paddingHorizontal: 14, paddingBottom: 14 },
  adProgressBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  adProgressBar: { height: 4, borderRadius: 2 },
  adClaimBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 14, marginTop: 0, paddingVertical: 13, borderRadius: 10 },
  adClaimText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
