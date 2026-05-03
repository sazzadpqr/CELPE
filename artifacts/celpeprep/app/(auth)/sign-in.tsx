import { Feather } from "@expo/vector-icons";
import { useSignIn, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { enterGuestMode } = useApp();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          router.replace(url as never);
        },
      });
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code: verifyCode });
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl("/") as never);
        },
      });
    }
  };

  const handleGoogle = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            router.replace(decorateUrl("/") as never);
          },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow]);

  const emailError = errors?.fields?.identifier?.message || errors?.fields?.emailAddress?.message;
  const passwordError = errors?.fields?.password?.message;
  const codeError = errors?.fields?.code?.message;
  const isFetching = fetchStatus === "fetching";

  if (signIn.status === "needs_client_trust") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.card}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Feather name="shield" size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Verificação</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enviamos um código para o seu e-mail
          </Text>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Código de verificação</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: codeError ? "#D85A30" : colors.border, color: colors.text }]}
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="000000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              autoFocus
            />
            {codeError && <Text style={styles.errorText}>{codeError}</Text>}
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: isFetching ? 0.7 : 1 }]}
            onPress={handleVerify}
            disabled={isFetching}
          >
            {isFetching ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verificar</Text>}
          </Pressable>

          <Pressable onPress={() => signIn.mfa.sendEmailCode()}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Reenviar código</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Feather name="book-open" size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Entrar no CelpePrep</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Bem-vindo de volta! Continue sua preparação.
          </Text>

          <Pressable
            style={[styles.googleBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: googleLoading ? 0.7 : 1 }]}
            onPress={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={[styles.googleBtnText, { color: colors.text }]}>Continuar com Google</Text>
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>E-mail</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: emailError ? "#D85A30" : colors.border, color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Senha</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: passwordError ? "#D85A30" : colors.border }]}>
              <TextInput
                style={[styles.inputInner, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Sua senha"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (!email || !password || isFetching) ? 0.6 : 1 }]}
            onPress={handleEmailSignIn}
            disabled={!email || !password || isFetching}
          >
            {isFetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Entrar</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Não tem conta? </Text>
            <Pressable onPress={() => router.push("/(auth)/sign-up" as never)}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Cadastrar</Text>
            </Pressable>
          </View>

          <View style={[styles.dividerRow, { marginTop: 8 }]}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            style={[styles.guestBtn, { borderColor: colors.border }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await enterGuestMode();
              router.replace("/");
            }}
          >
            <Feather name="user" size={16} color={colors.mutedForeground} />
            <Text style={[styles.guestBtnText, { color: colors.mutedForeground }]}>Continuar como convidado</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIconWrap}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  card: { width: "100%", maxWidth: 420, gap: 16, alignItems: "center" },
  logoBox: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginTop: -8 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, borderWidth: 1.5, padding: 14, width: "100%", marginTop: 8 },
  guestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 20, width: "100%" },
  guestBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  googleIconWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  googleIconText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#EA4335" },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldWrap: { gap: 6, width: "100%" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16 },
  inputInner: { flex: 1, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, width: "100%", marginTop: 4 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorText: { color: "#D85A30", fontSize: 12, fontFamily: "Inter_400Regular" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  linkText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
