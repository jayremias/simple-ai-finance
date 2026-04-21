import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';

const RC_API_KEY_IOS = 'test_RMtgpaShNuwvqCtTnrrlQtwqXss';
const RC_API_KEY_ANDROID = 'test_RMtgpaShNuwvqCtTnrrlQtwqXss';

export function initializeRevenueCat(): void {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  }

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
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
