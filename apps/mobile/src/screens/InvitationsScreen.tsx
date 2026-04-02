import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAcceptInvitation, useDeclineInvitation, useMyInvitations } from '@/hooks/useSharing';
import { Colors } from '@/theme/colors';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Reader',
  member: 'Member',
};

interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string | null;
  status: string;
  teamId: string | null;
  expiresAt: string;
  inviterId: string;
}

function InvitationCard({ invitation }: { invitation: Invitation }) {
  const { mutate: accept, isPending: isAccepting } = useAcceptInvitation();
  const { mutate: decline, isPending: isDeclining } = useDeclineInvitation();
  const isPending = isAccepting || isDeclining;

  const inviteType = invitation.teamId ? 'Account' : 'Workspace';
  const roleLabel = invitation.role ? (ROLE_LABELS[invitation.role] ?? invitation.role) : 'Member';

  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons
          name={invitation.teamId ? 'wallet-outline' : 'business-outline'}
          size={20}
          color={Colors.brandBlue}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{inviteType} Invitation</Text>
        <Text style={styles.cardSubtitle}>Role: {roleLabel}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => decline(invitation.id)}
          disabled={isPending}
        >
          {isDeclining ? (
            <ActivityIndicator color={Colors.textMuted} size="small" />
          ) : (
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => accept(invitation.id)}
          disabled={isPending}
        >
          {isAccepting ? (
            <ActivityIndicator color={Colors.textPrimary} size="small" />
          ) : (
            <Ionicons name="checkmark" size={18} color={Colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function InvitationsScreen() {
  const insets = useSafeAreaInsets();
  const { data: invitations, isLoading, refetch } = useMyInvitations();
  const [refreshing, setRefreshing] = useState(false);

  const pendingInvitations = invitations?.filter(
    (invitation: Invitation) => invitation.status === 'pending'
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invitations</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" style={styles.centered} />
      ) : (
        <FlatList
          data={pendingInvitations}
          keyExtractor={(item: Invitation) => item.id}
          renderItem={({ item }) => <InvitationCard invitation={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.brandBlue}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-open-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No pending invitations</Text>
              <Text style={styles.emptySubtitle}>
                When someone invites you to an account, it will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  centered: {
    flex: 1,
    marginTop: 60,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
