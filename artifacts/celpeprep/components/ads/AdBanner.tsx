import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { AdService } from "@/services/AdService";

type BannerSize = "adaptive" | "fixed";

interface AdBannerProps {
  size?: BannerSize;
}

export default function AdBanner({ size = "adaptive" }: AdBannerProps) {
  const unitId = AdService.getBannerUnitId();

  if (!unitId || Platform.OS === "web") return null;

  const height = size === "adaptive" ? 60 : 50;

  /**
   * In a native EAS build, replace this placeholder with the real BannerAd
   * component from react-native-google-mobile-ads:
   *
   * import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
   *
   * return (
   *   <BannerAd
   *     unitId={unitId}
   *     size={size === "adaptive" ? BannerAdSize.ANCHORED_ADAPTIVE_BANNER : BannerAdSize.BANNER}
   *     requestOptions={{ requestNonPersonalizedAdsOnly: true }}
   *   />
   * );
   */

  return (
    <View style={[styles.container, { height }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "transparent",
  },
});
