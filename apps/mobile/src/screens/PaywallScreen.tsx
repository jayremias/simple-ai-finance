import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { PACKAGE_TYPE } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/revenuecat';
import { Colors } from '@/theme/colors';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const PREMIUM_FEATURES = [
  'Unlimited accounts',
  'Unlimited transactions',
  'Unlimited receipt scans',
  'Bank statement import',
  'Advanced analytics & reports',
  'Account sharing & collaboration',
];

export function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    getOfferings()
      .then((offerings) => {
        const currentOffering = offerings.current;
        if (currentOffering) {
          setOffering(currentOffering);
          // Default selection: annual if available, otherwise monthly
          const defaultPackage =
            currentOffering.annual ??
            currentOffering.monthly ??
            currentOffering.availablePackages[0] ??
            null;
          setSelectedPackage(defaultPackage);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to load subscription options. Please try again.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handlePurchase() {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      await purchasePackage(selectedPackage);
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      navigation.goBack();
    } catch (error: unknown) {
      const purchaseError = error as { userCancelled?: boolean };
      if (!purchaseError.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handleRestore() {
    setIsRestoring(true);
    try {
      await restorePurchases();
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      Alert.alert('Restored', 'Your purchases have been restored.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No purchases to restore.');
    } finally {
      setIsRestoring(false);
    }
  }

  const monthlyPackage = offering?.monthly ?? null;
  const annualPackage = offering?.annual ?? null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={Colors.textSecondary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.crownContainer}>
            <Ionicons name="star" size={32} color={Colors.brandPurple} />
          </View>
          <Text style={styles.title}>MoneyLens Premium</Text>
          <Text style={styles.subtitle}>Unlock the full power of your finances</Text>
        </View>

        <View style={styles.featuresCard}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.brandPurple} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.brandBlue} style={styles.loader} />
        ) : (
          <View style={styles.plansContainer}>
            {annualPackage && (
              <PlanCard
                label="Annual"
                badge="Best Value"
                priceString={annualPackage.product.priceString}
                perMonth={getMonthlyEquivalent(annualPackage)}
                isSelected={selectedPackage?.packageType === PACKAGE_TYPE.ANNUAL}
                onPress={() => setSelectedPackage(annualPackage)}
              />
            )}
            {monthlyPackage && (
              <PlanCard
                label="Monthly"
                priceString={monthlyPackage.product.priceString}
                isSelected={selectedPackage?.packageType === PACKAGE_TYPE.MONTHLY}
                onPress={() => setSelectedPackage(monthlyPackage)}
              />
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.ctaButton, (isPurchasing || !selectedPackage) && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing || !selectedPackage}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.textPrimary} />
          ) : (
            <Text style={styles.ctaText}>Start Premium</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          <Text style={styles.restoreText}>
            {isRestoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Subscription renews automatically. Cancel anytime in App Store / Google Play settings.
        </Text>
      </ScrollView>
    </View>
  );
}

type PlanCardProps = {
  label: string;
  badge?: string;
  priceString: string;
  perMonth?: string;
  isSelected: boolean;
  onPress: () => void;
};

function PlanCard({ label, badge, priceString, perMonth, isSelected, onPress }: PlanCardProps) {
  return (
    <TouchableOpacity
      style={[styles.planCard, isSelected && styles.planCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.planCardLeft}>
        <View style={styles.radioOuter}>{isSelected && <View style={styles.radioInner} />}</View>
        <View>
          <View style={styles.planLabelRow}>
            <Text style={styles.planLabel}>{label}</Text>
            {badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          {perMonth && <Text style={styles.perMonth}>{perMonth} / month</Text>}
        </View>
      </View>
      <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>{priceString}</Text>
    </TouchableOpacity>
  );
}

function getMonthlyEquivalent(annualPackage: PurchasesPackage): string {
  const annualPrice = annualPackage.product.price;
  const monthly = annualPrice / 12;
  const currencySymbol = annualPackage.product.priceString.replace(/[\d.,]/g, '').trim();
  return `${currencySymbol}${monthly.toFixed(2)}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    gap: 8,
  },
  crownContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.brandPurple}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  featuresCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  loader: {
    marginVertical: 32,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  planCardSelected: {
    borderColor: Colors.brandPurple,
    backgroundColor: `${Colors.brandPurple}10`,
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brandPurple,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: `${Colors.brandPurple}30`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.brandPurple,
    fontSize: 11,
    fontWeight: '700',
  },
  perMonth: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  planPrice: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  planPriceSelected: {
    color: Colors.textPrimary,
  },
  ctaButton: {
    backgroundColor: Colors.brandPurple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  legalText: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
