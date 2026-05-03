import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { AdService } from "@/services/AdService";

export default function NativeAdCard() {
  const unitId = AdService.getNativeUnitId();

  if (!unitId || Platform.OS === "web") return null;

  /**
   * In a native EAS build, replace this placeholder with the real NativeAd
   * component from react-native-google-mobile-ads:
   *
   * import { NativeAd, NativeAdView, ... } from "react-native-google-mobile-ads";
   *
   * Render the native ad using the unitId above, styling it to match the
   * list item card design of the app.
   */

  return <View style={styles.placeholder} />;
}

const styles = StyleSheet.create({
  placeholder: {
    height: 0,
  },
});
