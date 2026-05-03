import { Feather } from "@expo/vector-icons";
import { useSignUp, useSSO } from "@clerk/expo";
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

export default function SignUpScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await signUp.password({ emailAddress: email, password });
    if (!error) {
      await signUp.verifications.sendEmailCode();
    }
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code: verifyCode });
    if (signUp.status === "complete") {
      await signUp.finalize({
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

  const emailError = errors?.fields?.emailAddress?.message;
  const passwordError = errors?.fields?.password?.message;
  const codeError = errors?.fields?.code?.message;
  const isFetching = fetchStatus === "fetching";

  const needsVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields?.includes("email_address") &&
    signUp.missingFields?.length === 0;

  if (needsVerification) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.card}>
          <View style={[styles.logoBox, { backgroundColor: "#1D9E75" }]}>
            <Feather name="mail" size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Verifique seu e-mail</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enviamos um código de 6 dígitos para{"\n"}
            <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
          </Text>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Código de verificação</Text>
            <TextInput
              style={[styles.codeInput, { backgroundColor: colors.card, borderColor: codeError ? "#D85A30" : colors.border, color: colors.text }]}
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="000000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
              textAlign="center"
            />
            {codeError && <Text style={styles.errorText}>{codeError}</Text>}
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (!verifyCode || isFetching) ? 0.6 : 1 }]}
            onPress={handleVerify}
            disabled={!verifyCode || isFetching}
          >
            {isFetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Confirmar</Text>
                <Feather name="check" size={16} color="#fff" />
              </>
            )}
          </Pressable>

          <Pressable onPress={() => signUp.verifications.sendEmailCode()}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Reenviar código</Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Voltar</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>Criar sua conta</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Comece sua preparação para o Celpe-Bras hoje.
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
                placeholder="Mínimo 8 caracteres"
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
            onPress={handleSubmit}
            disabled={!email || !password || isFetching}
          >
            {isFetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Criar conta</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </>
            )}
          </Pressable>

          <View nativeID="clerk-captcha" />

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Já tem conta? </Text>
            <Pressable onPress={() => router.push("/(auth)/sign-in" as never)}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Entrar</Text>
            </Pressable>
          </View>
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
  googleIconWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  googleIconText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#EA4335" },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldWrap: { gap: 6, width: "100%" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  codeInput: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 18, fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 8 },
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
