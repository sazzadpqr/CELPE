import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export function GuestBanner() {
  const { profile } = useApp();
  const colors = useColors();

  if (!profile.isGuest) return null;

  return (
    <Pressable
      style={[styles.banner, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "30" }]}
      onPress={() => router.push("/(auth)/sign-up" as never)}
    >
      <Feather name="user-plus" size={15} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>
        Modo convidado · Crie uma conta para desbloquear tudo
      </Text>
      <Feather name="chevron-right" size={14} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginBottom: 12 },
  text: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
});
