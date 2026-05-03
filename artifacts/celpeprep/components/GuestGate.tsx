import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

interface GuestGateProps {
  children: React.ReactNode;
  feature?: string;
}

export function GuestGate({ children, feature }: GuestGateProps) {
  const { profile } = useApp();
  const colors = useColors();

  if (!profile.isGuest) return <>{children}</>;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="lock" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {feature ? `${feature} requer conta` : "Recurso exclusivo"}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Crie uma conta gratuita para desbloquear este recurso e sincronizar seu progresso.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(auth)/sign-up" as never)}
        >
          <Text style={styles.btnText}>Criar conta grátis</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </Pressable>
        <Pressable onPress={() => router.replace("/(auth)/sign-in" as never)}>
          <Text style={[styles.link, { color: colors.mutedForeground }]}>
            Já tem conta? <Text style={{ color: colors.primary }}>Entrar</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 12, width: "100%", maxWidth: 380 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, width: "100%", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
