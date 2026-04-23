import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';

const extra = Constants.expoConfig?.extra as {
  revenueCatApiKeyIos?: string;
  revenueCatApiKeyAndroid?: string;
};

const apiKeyIos = extra?.revenueCatApiKeyIos ?? '';
const apiKeyAndroid = extra?.revenueCatApiKeyAndroid ?? '';

export function initializeRevenueCat(): void {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  }

  const apiKey = Platform.OS === 'ios' ? apiKeyIos : apiKeyAndroid;
  Purchases.configure({ apiKey });
}

export async function identifyRevenueCatUser(userId: string): Promise<void> {
  await Purchases.logIn(userId);
}

export async function resetRevenueCatUser(): Promise<void> {
  await Purchases.logOut();
}

export async function getOfferings() {
  return Purchases.getOfferings();
}

export async function purchasePackage(purchasesPackage: PurchasesPackage) {
  return Purchases.purchasePackage(purchasesPackage);
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}
