import { Stack } from "expo-router";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
