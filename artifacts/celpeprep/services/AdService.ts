import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  interstitialToday: "celpeprep_ad_interstitial_today",
  interstitialDate: "celpeprep_ad_interstitial_date",
  appOpenLastShown: "celpeprep_ad_app_open_last",
};

const TEST_UNIT_IDS = {
  appOpen: {
    android: "ca-app-pub-3940256099942544/9257395921",
    ios: "ca-app-pub-3940256099942544/5575463023",
  },
  banner: {
    android: "ca-app-pub-3940256099942544/9214589741",
    ios: "ca-app-pub-3940256099942544/2934735716",
  },
  interstitial: {
    android: "ca-app-pub-3940256099942544/1033173712",
    ios: "ca-app-pub-3940256099942544/4411468910",
  },
  rewarded: {
    android: "ca-app-pub-3940256099942544/5224354917",
    ios: "ca-app-pub-3940256099942544/1712485313",
  },
  rewardedInterstitial: {
    android: "ca-app-pub-3940256099942544/5354046379",
    ios: "ca-app-pub-3940256099942544/6978759866",
  },
  native: {
    android: "ca-app-pub-3940256099942544/2247696110",
    ios: "ca-app-pub-3940256099942544/3986624511",
  },
};

export type AdsConfig = {
  adsEnabled: boolean;
  admobEnabled: boolean;
  hideAdsForPremium: boolean;
  rewardedAdsEnabled: boolean;
  bannerEnabled: boolean;
  appOpenEnabled: boolean;
  interstitialEnabled: boolean;
  rewardedInterstitialEnabled: boolean;
  nativeEnabled: boolean;
  admobBannerAndroid: string;
  admobBannerIos: string;
  admobRewardedAndroid: string;
  admobRewardedIos: string;
  admobAppOpenAndroid: string;
  admobAppOpenIos: string;
  admobInterstitialAndroid: string;
  admobInterstitialIos: string;
  admobRewardedInterstitialAndroid: string;
  admobRewardedInterstitialIos: string;
  admobNativeAndroid: string;
  admobNativeIos: string;
  rewardedAdCreditAmount: number;
  rewardedAdMaxPerDay: number;
  interstitialFrequencyCapPerDay: number;
  appOpenFrequencyCapHours: number;
};

class AdServiceClass {
  private config: AdsConfig | null = null;
  private isPremium = false;

  configure(config: AdsConfig, isPremium: boolean) {
    this.config = config;
    this.isPremium = isPremium;
  }

  private get isActive(): boolean {
    if (!this.config) return false;
    if (!this.config.adsEnabled || !this.config.admobEnabled) return false;
    if (this.isPremium && this.config.hideAdsForPremium) return false;
    if (Platform.OS === "web") return false;
    return true;
  }

  private resolve(
    androidId: string,
    iosId: string,
    testAndroid: string,
    testIos: string
  ): string {
    const isAndroid = Platform.OS === "android";
    const configured = isAndroid ? androidId : iosId;
    const test = isAndroid ? testAndroid : testIos;
    return configured || test;
  }

  getBannerUnitId(): string | null {
    if (!this.isActive || !this.config?.bannerEnabled) return null;
    return this.resolve(
      this.config.admobBannerAndroid,
      this.config.admobBannerIos,
      TEST_UNIT_IDS.banner.android,
      TEST_UNIT_IDS.banner.ios
    );
  }

  getNativeUnitId(): string | null {
    if (!this.isActive || !this.config?.nativeEnabled) return null;
    return this.resolve(
      this.config.admobNativeAndroid,
      this.config.admobNativeIos,
      TEST_UNIT_IDS.native.android,
      TEST_UNIT_IDS.native.ios
    );
  }

  getRewardedUnitId(): string | null {
    if (!this.isActive || !this.config?.rewardedAdsEnabled) return null;
    return this.resolve(
      this.config.admobRewardedAndroid,
      this.config.admobRewardedIos,
      TEST_UNIT_IDS.rewarded.android,
      TEST_UNIT_IDS.rewarded.ios
    );
  }

  async canShowAppOpen(): Promise<boolean> {
    if (!this.isActive || !this.config?.appOpenEnabled) return false;
    try {
      const lastShown = await AsyncStorage.getItem(STORAGE_KEYS.appOpenLastShown);
      if (!lastShown) return true;
      const hours = this.config.appOpenFrequencyCapHours ?? 4;
      const elapsed = (Date.now() - Number(lastShown)) / (1000 * 60 * 60);
      return elapsed >= hours;
    } catch {
      return true;
    }
  }

  async recordAppOpenShown() {
    await AsyncStorage.setItem(STORAGE_KEYS.appOpenLastShown, String(Date.now()));
  }

  async canShowInterstitial(): Promise<boolean> {
    if (!this.isActive || !this.config?.interstitialEnabled) return false;
    try {
      const today = new Date().toDateString();
      const [date, countStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.interstitialDate),
        AsyncStorage.getItem(STORAGE_KEYS.interstitialToday),
      ]);
      if (date !== today) return true;
      const count = Number(countStr ?? "0");
      return count < (this.config.interstitialFrequencyCapPerDay ?? 2);
    } catch {
      return true;
    }
  }

  async recordInterstitialShown() {
    try {
      const today = new Date().toDateString();
      const date = await AsyncStorage.getItem(STORAGE_KEYS.interstitialDate);
      const current = date === today
        ? Number((await AsyncStorage.getItem(STORAGE_KEYS.interstitialToday)) ?? "0")
        : 0;
      await AsyncStorage.setItem(STORAGE_KEYS.interstitialDate, today);
      await AsyncStorage.setItem(STORAGE_KEYS.interstitialToday, String(current + 1));
    } catch {}
  }

  getAppOpenUnitId(): string | null {
    if (!this.isActive || !this.config?.appOpenEnabled) return null;
    return this.resolve(
      this.config.admobAppOpenAndroid,
      this.config.admobAppOpenIos,
      TEST_UNIT_IDS.appOpen.android,
      TEST_UNIT_IDS.appOpen.ios
    );
  }

  getInterstitialUnitId(): string | null {
    if (!this.isActive || !this.config?.interstitialEnabled) return null;
    return this.resolve(
      this.config.admobInterstitialAndroid,
      this.config.admobInterstitialIos,
      TEST_UNIT_IDS.interstitial.android,
      TEST_UNIT_IDS.interstitial.ios
    );
  }

  getRewardedInterstitialUnitId(): string | null {
    if (!this.isActive || !this.config?.rewardedInterstitialEnabled) return null;
    return this.resolve(
      this.config.admobRewardedInterstitialAndroid,
      this.config.admobRewardedInterstitialIos,
      TEST_UNIT_IDS.rewardedInterstitial.android,
      TEST_UNIT_IDS.rewardedInterstitial.ios
    );
  }

  get creditAmount(): number {
    return this.config?.rewardedAdCreditAmount ?? 1;
  }

  get maxRewardedPerDay(): number {
    return this.config?.rewardedAdMaxPerDay ?? 3;
  }
}

export const AdService = new AdServiceClass();
