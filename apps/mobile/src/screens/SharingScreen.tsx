import { Ionicons } from '@expo/vector-icons';
import type { AccountMemberResponse } from '@moneylens/shared';
import { SHARING_ROLES } from '@moneylens/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccountMembers, useInviteToAccount, useRevokeAccess } from '@/hooks/useSharing';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Colors } from '@/theme/colors';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Sharing'>;

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  owner: Colors.brandPurple,
  editor: Colors.brandBlue,
  viewer: Colors.textMuted,
};

function MemberRow({
  member,
  isCurrentUser,
  canRevoke,
  onRevoke,
}: {
  member: AccountMemberResponse;
  isCurrentUser: boolean;
  canRevoke: boolean;
  onRevoke: () => void;
}) {
  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{initials}</Text>
      </View>

      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.name}
          {isCurrentUser ? ' (you)' : ''}
        </Text>
        <Text style={styles.memberEmail} numberOfLines={1}>
          {member.email}
        </Text>
      </View>

      <View style={styles.memberRight}>
        <View style={[styles.roleChip, { backgroundColor: `${ROLE_COLORS[member.role]}22` }]}>
          <Text
            style={[styles.roleChipText, { color: ROLE_COLORS[member.role] ?? Colors.textMuted }]}
          >
            {ROLE_LABELS[member.role] ?? member.role}
          </Text>
        </View>
        {canRevoke && !isCurrentUser && (
          <TouchableOpacity onPress={onRevoke} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function SharingScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { accountId, accountName } = route.params;

  const { data: profile } = useUserProfile();
  const { data, isLoading, error, refetch } = useAccountMembers(accountId);
  const { mutate: inviteUser, isPending: isInviting } = useInviteToAccount();
  const { mutate: revokeAccess, isPending: isRevoking } = useRevokeAccess();

  const members = data?.data ?? [];
  const currentUserId = profile?.id;
  const currentUserMember = members.find((member) => member.userId === currentUserId);
  const isOwner = currentUserMember?.role === 'owner';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);

  function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setInviteError(null);

    inviteUser(
      { accountId, email, role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail('');
          Alert.alert('Invited', `Invitation sent to ${email}.`);
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error && err.message.includes('409')
              ? 'This user already has access.'
              : 'Failed to send invitation. Try again.';
          setInviteError(message);
        },
      }
    );
  }

  function handleRevoke(member: AccountMemberResponse) {
    Alert.alert('Remove Access', `Remove ${member.name}'s access to "${accountName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          revokeAccess(
            { accountId, userId: member.userId },
            {
              onError: () => Alert.alert('Error', 'Failed to remove access. Please try again.'),
            }
          ),
      },
    ]);
  }

  const isPending = isInviting || isRevoking;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Sharing</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {accountName}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" style={styles.centered} />
      ) : error ? (
        <Text style={[styles.centered, styles.errorText]}>Failed to load members</Text>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              isCurrentUser={item.userId === currentUserId}
              canRevoke={isOwner}
              onRevoke={() => handleRevoke(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.brandBlue} />
          }
          ListHeaderComponent={
            members.length > 0 ? (
              <Text style={styles.sectionLabel}>
                {members.length} {members.length === 1 ? 'person' : 'people'} with access
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No shared access</Text>
              <Text style={styles.emptySubtitle}>
                {isOwner ? 'Invite someone below' : 'Only you have access'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isOwner ? (
              <View style={styles.inviteSection}>
                <Text style={styles.sectionLabel}>Invite someone</Text>

                <TextInput
                  style={styles.input}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.fieldLabel}>Role</Text>
                <View style={styles.chipRow}>
                  {SHARING_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.chip, inviteRole === role && styles.chipActive]}
                      onPress={() => setInviteRole(role)}
                    >
                      <Text style={[styles.chipText, inviteRole === role && styles.chipTextActive]}>
                        {ROLE_LABELS[role]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.roleHint}>
                  {inviteRole === 'viewer'
                    ? 'Viewers can see transactions but cannot add or edit.'
                    : 'Editors can add and edit transactions.'}
                </Text>

                {inviteError ? <Text style={styles.errorText}>{inviteError}</Text> : null}

                <TouchableOpacity
                  style={[styles.inviteButton, isPending && styles.inviteButtonDisabled]}
                  onPress={handleInvite}
                  disabled={isPending}
                >
                  {isInviting ? (
                    <ActivityIndicator color={Colors.textPrimary} size="small" />
                  ) : (
                    <Text style={styles.inviteButtonText}>Send Invitation</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.ownerNote}>
                <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.ownerNoteText}>Only owners can manage access</Text>
              </View>
            )
          }
        />
      )}
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  headerSpacer: {
    width: 24,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 2,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  memberEmail: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  roleChip: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inviteSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
  },
  chipActive: {
    backgroundColor: Colors.brandBlue,
    borderColor: Colors.brandBlue,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  chipTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  roleHint: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  inviteButton: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  ownerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    justifyContent: 'center',
  },
  ownerNoteText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  centered: {
    flex: 1,
    textAlign: 'center',
    marginTop: 60,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
