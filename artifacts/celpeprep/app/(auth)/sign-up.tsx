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

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Fraca", color: "#ef4444" };
  if (score <= 2) return { score: 2, label: "Razoável", color: "#f97316" };
  if (score <= 3) return { score: 3, label: "Boa", color: "#eab308" };
  if (score <= 4) return { score: 4, label: "Forte", color: "#22c55e" };
  return { score: 5, label: "Muito forte", color: "#10b981" };
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
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
  const canSubmit = !!email && !!password && !isFetching;

  const strength = getPasswordStrength(password);

  const needsVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields?.includes("email_address") &&
    signUp.missingFields?.length === 0;

  if (needsVerification) {
    return (
      <View style={[styles.verifyRoot, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.decorBlob, { backgroundColor: "#22c55e12" }]} />

        <View style={[styles.verifyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Icon */}
          <View style={[styles.verifyIconRing, { borderColor: "#22c55e30", backgroundColor: "#22c55e10" }]}>
            <Feather name="mail" size={28} color="#22c55e" />
          </View>

          <Text style={[styles.verifyTitle, { color: colors.text }]}>Verifique seu e-mail</Text>
          <Text style={[styles.verifySubtitle, { color: colors.mutedForeground }]}>
            Enviamos um código de 6 dígitos para
          </Text>
          <View style={[styles.emailChip, { backgroundColor: colors.muted }]}>
            <Feather name="mail" size={12} color={colors.mutedForeground} />
            <Text style={[styles.emailChipText, { color: colors.text }]}>{email}</Text>
          </View>

          <TextInput
            style={[styles.codeInput, {
              backgroundColor: colors.background,
              borderColor: codeError ? "#ef4444" : "#22c55e",
              color: colors.text,
            }]}
            value={verifyCode}
            onChangeText={setVerifyCode}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            maxLength={6}
            autoFocus
            textAlign="center"
          />
          {codeError ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={12} color="#ef4444" />
              <Text style={styles.errorText}>{codeError}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: canSubmit || verifyCode ? "#22c55e" : colors.muted, opacity: (!verifyCode || isFetching) ? 0.6 : 1 }]}
            onPress={handleVerify}
            disabled={!verifyCode || isFetching}
          >
            {isFetching ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.primaryBtnText}>Confirmar e-mail</Text>
                <Feather name="check" size={16} color="#fff" />
              </>
            )}
          </Pressable>

          <Pressable onPress={() => signUp.verifications.sendEmailCode()} style={styles.resendBtn}>
            <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
            <Text style={[styles.resendText, { color: colors.mutedForeground }]}>Reenviar código</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>Voltar ao cadastro</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.decorBlob, { backgroundColor: colors.primary + "10" }]} />
        <View style={[styles.decorBlobSm, { backgroundColor: "#22c55e0d" }]} />

        <View style={styles.card}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Feather name="book-open" size={22} color="#fff" />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>CelpePrep</Text>
          </View>

          <View style={styles.headingGroup}>
            <Text style={[styles.title, { color: colors.text }]}>Criar sua conta</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Comece sua preparação para o Celpe-Bras gratuitamente
            </Text>
          </View>

          {/* Benefit pills */}
          <View style={styles.benefitRow}>
            {["Questões comentadas", "IA avaliadora", "Progresso salvo"].map((b) => (
              <View key={b} style={[styles.benefitPill, { backgroundColor: colors.primary + "12" }]}>
                <Feather name="check" size={10} color={colors.primary} />
                <Text style={[styles.benefitText, { color: colors.primary }]}>{b}</Text>
              </View>
            ))}
          </View>

          {/* Google SSO */}
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

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>ou cadastre com e-mail</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>E-mail</Text>
            <View style={[
              styles.inputBox,
              { backgroundColor: colors.card, borderColor: emailError ? "#ef4444" : emailFocused ? colors.primary : colors.border },
            ]}>
              <View style={[styles.inputIconWrap, { backgroundColor: emailFocused ? colors.primary + "15" : colors.muted }]}>
                <Feather name="mail" size={15} color={emailFocused ? colors.primary : colors.mutedForeground} />
              </View>
              <TextInput
                style={[styles.inputInner, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
            {emailError ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha</Text>
            <View style={[
              styles.inputBox,
              { backgroundColor: colors.card, borderColor: passwordError ? "#ef4444" : passwordFocused ? colors.primary : colors.border },
            ]}>
              <View style={[styles.inputIconWrap, { backgroundColor: passwordFocused ? colors.primary + "15" : colors.muted }]}>
                <Feather name="lock" size={15} color={passwordFocused ? colors.primary : colors.mutedForeground} />
              </View>
              <TextInput
                style={[styles.inputInner, { color: colors.text, flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {passwordError ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}

            {/* Password strength */}
            {password.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: i <= strength.score ? strength.color : colors.muted },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          {/* Primary button */}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isFetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.primaryBtnText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                  Criar conta grátis
                </Text>
                <Feather name="arrow-right" size={16} color={canSubmit ? "#fff" : colors.mutedForeground} />
              </>
            )}
          </Pressable>

          <View nativeID="clerk-captcha" />

          {/* Switch to sign-in */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Já tem conta?</Text>
            <Pressable onPress={() => router.push("/(auth)/sign-in" as never)} hitSlop={8}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>Entrar</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Ao criar uma conta, você concorda com nossos{" "}
            <Text style={{ color: colors.primary }}>Termos de Uso</Text>
            {" "}e{" "}
            <Text style={{ color: colors.primary }}>Política de Privacidade</Text>
          </Text>
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
  root: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  card: { width: "100%", maxWidth: 420, gap: 14 },

  decorBlob: {
    position: "absolute", width: 340, height: 340, borderRadius: 170,
    top: -80, right: -100, zIndex: 0,
  },
  decorBlobSm: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    bottom: 40, left: -100, zIndex: 0,
  },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  logoMark: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },

  headingGroup: { gap: 4, marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  benefitRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  benefitPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  benefitText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, borderWidth: 1.5, paddingVertical: 15,
    paddingHorizontal: 20, width: "100%",
  },
  googleIconWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  googleIconText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#EA4335" },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%", marginVertical: 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  fieldWrap: { gap: 6, width: "100%" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },

  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    overflow: "hidden", height: 52,
  },
  inputIconWrap: { width: 48, height: "100%", alignItems: "center", justifyContent: "center" },
  inputInner: { flex: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular", height: "100%" },
  eyeBtn: { paddingHorizontal: 14 },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errorText: { color: "#ef4444", fontSize: 12, fontFamily: "Inter_400Regular" },

  strengthWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  strengthBars: { flex: 1, flexDirection: "row", gap: 4 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", minWidth: 60, textAlign: "right" },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 54, width: "100%", marginTop: 2,
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_700Bold" },

  footerText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16, marginTop: 4 },

  verifyRoot: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  verifyCard: { width: "100%", maxWidth: 400, borderRadius: 24, borderWidth: 1, padding: 32, gap: 12, alignItems: "center" },
  verifyIconRing: { width: 72, height: 72, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  verifyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  verifySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emailChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  emailChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  codeInput: {
    width: "100%", borderRadius: 16, borderWidth: 2,
    paddingVertical: 18, fontSize: 32, fontFamily: "Inter_700Bold",
    letterSpacing: 10, textAlign: "center", marginTop: 8,
  },
  resendBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  resendText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  backText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
