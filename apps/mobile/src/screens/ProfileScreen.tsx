import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserProfile } from '@/hooks/useUserProfile';
import { authService } from '@/services/auth';
import { resetRevenueCatUser } from '@/services/revenuecat';
import { storage } from '@/services/storage';
import { useAuthStore } from '@/stores/auth';
import { Colors } from '@/theme/colors';
import type { RootStackParamList } from '@/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { data: profile, isLoading, error } = useUserProfile();
  const { data: subscription } = useSubscription();
  const { token, clearAuth } = useAuthStore();

  async function handleSignOut() {
    if (token) {
      try {
        await authService.signOut(token);
      } catch {
        // best-effort
      }
    }
    await storage.deleteToken();
    await resetRevenueCatUser().catch(() => undefined);
    clearAuth();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" />
      ) : error ? (
        <Text style={styles.errorText}>Failed to load profile</Text>
      ) : profile ? (
        <View style={styles.content}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>

          <View style={styles.card}>
            <Row label="Currency" value={profile.defaultCurrency} />
            <Row label="Locale" value={profile.locale} />
          </View>

          {subscription?.isActive ? (
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionLeft}>
                <Ionicons name="star" size={18} color={Colors.brandPurple} />
                <Text style={styles.subscriptionLabel}>Premium</Text>
              </View>
              <Text style={styles.subscriptionActive}>Active</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Ionicons name="star-outline" size={18} color={Colors.textPrimary} />
              <Text style={styles.upgradeText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  rowValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  subscriptionCard: {
    width: '100%',
    backgroundColor: `${Colors.brandPurple}15`,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.brandPurple}40`,
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  subscriptionActive: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '500',
  },
  upgradeButton: {
    width: '100%',
    backgroundColor: Colors.brandPurple,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  signOutText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.danger,
  },
});
