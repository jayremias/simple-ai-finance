import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import { authService } from '@/services/auth';
import { storage } from '@/services/storage';
import { useAuthStore } from '@/stores/auth';
import { Colors } from '@/theme/colors';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading, error } = useUserProfile();
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
