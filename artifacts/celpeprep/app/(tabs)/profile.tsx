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
  const [selected, setSelected] = React.useState(current);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (visible) { setSelected(current); setSaving(false); }
  }, [visible, current]);

  const handleSave = async () => {
    if (selected === current) { onClose(); return; }
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onSelect(selected);
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>...</View>
    </Modal>
  );
}

const DAILY_GOAL_OPTIONS = [10, 15, 20, 30, 45, 60];

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { profile, syncProfileToServer } = useApp();
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || "");
  const [level, setLevel] = useState(profile.level);
  const [examDate, setExamDate] = useState(profile.examDate || "");
  const [dailyGoal, setDailyGoal] = useState(profile.dailyGoalMinutes || 30);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameInfo, setUsernameInfo] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [localEmoji, setLocalEmoji] = useState(profile.avatarEmoji || "🎓");

  useEffect(() => {
    if (visible) {
      setName(profile.name);
      setUsername(profile.username || "");
      setLevel(profile.level);
      setExamDate(profile.examDate || "");
      setDailyGoal(profile.dailyGoalMinutes || 30);
      setLocalEmoji(profile.avatarEmoji || "🎓");
      setUsernameError("");
      setUsernameInfo(profile.usernameUpdatedAt ? `Próxima alteração disponível após ${new Date(profile.usernameUpdatedAt).toLocaleDateString("pt-BR")}` : "");
    }
  }, [visible, profile]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Nome obrigatório"); return; }
    setSaving(true);
    const result = await syncProfileToServer({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      level,
      examDate: examDate || null,
      dailyGoalMinutes: dailyGoal,
      avatarEmoji: localEmoji,
    });
    setSaving(false);
    if (!result.ok && result.error === "username_taken") {
      setUsernameError("Este nome de usuário já está em uso.");
      return;
    }
    if (!result.ok && result.error === "username_cooldown") {
      setUsernameError("Você só pode alterar o nome de usuário uma vez por mês.");
      return;
    }
    if (!result.ok && result.error === "validation_error") {
      setUsernameError("Use ao menos 3 caracteres: letras minúsculas, números e _");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const levelMeta: Record<string, { label: string; color: string }> = {
    A1: { label: "Iniciante", color: "#22c55e" },
    A2: { label: "Básico", color: "#84cc16" },
    B1: { label: "Intermediário", color: "#f59e0b" },
    B2: { label: "Avançado", color: "#f97316" },
    C1: { label: "Proficiente", color: "#ef4444" },
    C2: { label: "Fluente", color: "#7c3aed" },
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>...</View>
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

  }, [visible]);

  return null;
}

export default function ProfileScreen() {
  return null;
}
