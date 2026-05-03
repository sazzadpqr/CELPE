import { Feather } from "@expo/vector-icons";
import { useSignIn, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

function FocusInput({
  icon,
  error,
  children,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  error?: string;
  children: (focused: boolean) => React.ReactNode;
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = error
    ? "#ef4444"
    : anim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] });

  return (
    <View style={styles.fieldWrap}>
      <Animated.View style={[styles.inputBox, { borderColor, backgroundColor: colors.card }]}>
        <View style={[styles.inputIconWrap, { backgroundColor: focused ? colors.primary + "15" : colors.muted }]}>
          <Feather name={icon} size={15} color={focused ? colors.primary : colors.mutedForeground} />
        </View>
        <View
          style={styles.inputInnerWrap}
          // @ts-ignore
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {children(focused)}
        </View>
      </Animated.View>
      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={12} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
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
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleEmailSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl("/") as never);
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
  const canSubmit = !!email && !!password && !isFetching;

  if (signIn.status === "needs_client_trust") {
    return (
      <View style={[styles.verifyRoot, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.decorBlob, { backgroundColor: colors.primary + "12" }]} />
        <View style={[styles.verifyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.verifyIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="shield" size={26} color={colors.primary} />
          </View>
          <Text style={[styles.verifyTitle, { color: colors.text }]}>Verificação necessária</Text>
          <Text style={[styles.verifySubtitle, { color: colors.mutedForeground }]}>
            Enviamos um código de 6 dígitos para o seu e-mail.{"\n"}Insira-o abaixo para continuar.
          </Text>

          <TextInput
            style={[styles.codeInput, { backgroundColor: colors.background, borderColor: codeError ? "#ef4444" : colors.primary, color: colors.text }]}
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
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (!verifyCode || isFetching) ? 0.5 : 1 }]}
            onPress={handleVerify}
            disabled={!verifyCode || isFetching}
          >
            {isFetching ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.primaryBtnText}>Verificar</Text>
                <Feather name="check" size={16} color="#fff" />
              </>
            )}
          </Pressable>

          <Pressable onPress={() => signIn.mfa.sendEmailCode()} style={styles.resendBtn}>
            <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
            <Text style={[styles.resendText, { color: colors.mutedForeground }]}>Reenviar código</Text>
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
        {/* Background decoration */}
        <View style={[styles.decorBlob, { backgroundColor: colors.primary + "12" }]} />
        <View style={[styles.decorBlobSm, { backgroundColor: colors.accent + "10" }]} />

        <View style={styles.card}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Feather name="book-open" size={22} color="#fff" />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>CelpePrep</Text>
          </View>

          <View style={styles.headingGroup}>
            <Text style={[styles.title, { color: colors.text }]}>Bem-vindo de volta</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Entre na sua conta para continuar sua preparação
            </Text>
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
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>ou entre com e-mail</Text>
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
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha</Text>
              <Pressable hitSlop={8}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>Esqueceu?</Text>
              </Pressable>
            </View>
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
                placeholder="Sua senha"
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
          </View>

          {/* Primary button */}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
            onPress={handleEmailSignIn}
            disabled={!canSubmit}
          >
            {isFetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.primaryBtnText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                  Entrar
                </Text>
                <Feather name="arrow-right" size={16} color={canSubmit ? "#fff" : colors.mutedForeground} />
              </>
            )}
          </Pressable>

          {/* Switch to sign-up */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Não tem conta?</Text>
            <Pressable onPress={() => router.push("/(auth)/sign-up" as never)} hitSlop={8}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>Criar conta</Text>
            </Pressable>
          </View>

          {/* Divider + guest */}
          <View style={[styles.dividerRow, { marginTop: 4 }]}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>acesso rápido</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            style={[styles.guestBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await enterGuestMode();
              router.replace("/");
            }}
          >
            <View style={[styles.guestIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.guestBtnText, { color: colors.mutedForeground }]}>Continuar como convidado</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </Pressable>

          {/* Footer */}
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Ao entrar, você concorda com nossos{" "}
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
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    bottom: 60, left: -80, zIndex: 0,
  },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  logoMark: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },

  headingGroup: { gap: 4, marginBottom: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

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
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  forgotText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    overflow: "hidden", height: 52,
  },
  inputIconWrap: { width: 48, height: "100%", alignItems: "center", justifyContent: "center" },
  inputInnerWrap: { flex: 1 },
  inputInner: { flex: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular", height: "100%" },
  eyeBtn: { paddingHorizontal: 14 },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errorText: { color: "#ef4444", fontSize: 12, fontFamily: "Inter_400Regular" },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 54, width: "100%", marginTop: 2,
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_700Bold" },

  guestBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 16,
    width: "100%",
  },
  guestIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  guestBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },

  footerText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16, marginTop: 4 },

  verifyRoot: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  verifyCard: { width: "100%", maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 28, gap: 14, alignItems: "center" },
  verifyIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  verifyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  verifySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, color: "#888" },
  codeInput: {
    width: "100%", borderRadius: 14, borderWidth: 2,
    paddingVertical: 18, fontSize: 32, fontFamily: "Inter_700Bold",
    letterSpacing: 10, textAlign: "center",
  },
  resendBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  resendText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
