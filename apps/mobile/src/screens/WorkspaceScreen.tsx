import { Ionicons } from '@expo/vector-icons';
import type { AccountMemberResponse } from '@moneylens/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InviteMemberSheet } from '@/components/workspace/InviteMemberSheet';
import {
  MemberManagementSheet,
  type PersonItem,
} from '@/components/workspace/MemberManagementSheet';
import { useAccounts } from '@/hooks/useAccounts';
import {
  useAccountMembers,
  useCancelInvitation,
  useChangeAccessLevel,
  useRemoveAccountMember,
  useRemoveWorkspaceMember,
  useUpdateAccountMemberRole,
  useUpdateWorkspaceMemberRole,
  useWorkspaceInvitations,
  useWorkspaceMembers,
} from '@/hooks/useSharing';
import { Colors } from '@/theme/colors';

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: Colors.brandPurple },
  editor: { label: 'Editor', color: Colors.brandBlue },
  viewer: { label: 'Reader', color: Colors.textMuted },
  member: { label: 'Reader', color: Colors.textMuted },
};

interface WorkspaceMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; image: string | null };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string | null;
  status: string;
  teamId: string | null;
}

// ---------------------------------------------------------------------------
// Person Row (clean, no inline actions)
// ---------------------------------------------------------------------------

function PersonRow({ person, onPress }: { person: PersonItem; onPress: () => void }) {
  const isMember = person.kind === 'member';
  const name = isMember ? person.name : person.email;
  const roleInfo = ROLE_DISPLAY[person.role ?? 'viewer'] ?? ROLE_DISPLAY.viewer;

  const initials = isMember
    ? person.name
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <TouchableOpacity style={styles.personRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.avatar}>
        {isMember ? (
          <Text style={styles.avatarText}>{initials}</Text>
        ) : (
          <Ionicons name="mail-outline" size={16} color={Colors.textMuted} />
        )}
      </View>
      <View style={styles.personInfo}>
        <Text style={styles.personName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.personMeta} numberOfLines={1}>
          {person.accessLevel}
        </Text>
      </View>
      <View style={[styles.roleBadge, { borderColor: roleInfo.color }]}>
        <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
      </View>
      {!isMember && <View style={styles.pendingDot} />}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Hook to collect all account direct members
// ---------------------------------------------------------------------------

function useAllAccountMembers(accountIds: string[]) {
  // Call useAccountMembers for each account. Since hooks can't be called conditionally,
  // we limit to first 20 accounts to keep it predictable.
  const results = [
    useAccountMembers(accountIds[0]),
    useAccountMembers(accountIds[1]),
    useAccountMembers(accountIds[2]),
    useAccountMembers(accountIds[3]),
    useAccountMembers(accountIds[4]),
    useAccountMembers(accountIds[5]),
    useAccountMembers(accountIds[6]),
    useAccountMembers(accountIds[7]),
    useAccountMembers(accountIds[8]),
    useAccountMembers(accountIds[9]),
  ];

  const allDirectMembers: {
    accountId: string;
    accountName: string;
    member: AccountMemberResponse;
  }[] = [];

  for (let index = 0; index < accountIds.length && index < 10; index++) {
    const { data: members } = results[index]!;
    if (members) {
      for (const member of members) {
        if (member.source === 'direct') {
          allDirectMembers.push({
            accountId: accountIds[index]!,
            accountName: '', // filled by caller
            member,
          });
        }
      }
    }
  }

  return allDirectMembers;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function WorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useWorkspaceMembers();
  const { data: accounts } = useAccounts();
  const { data: invitations, refetch: refetchInvitations } = useWorkspaceInvitations();
  const { mutate: removeWorkspaceMember } = useRemoveWorkspaceMember();
  const { mutate: removeAccountMember } = useRemoveAccountMember();
  const { mutate: updateWorkspaceRole } = useUpdateWorkspaceMemberRole();
  const { mutate: updateAccountRole } = useUpdateAccountMemberRole();
  const { mutate: cancelInvitation } = useCancelInvitation();
  const { mutate: changeAccessLevel } = useChangeAccessLevel();
  const [refreshing, setRefreshing] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonItem | null>(null);

  const accountIds = useMemo(() => (accounts ?? []).map((account) => account.id), [accounts]);
  const accountDirectMembers = useAllAccountMembers(accountIds);

  // Build account name lookup
  const accountNameById = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const account of accounts ?? []) {
      lookup.set(account.id, account.name);
      lookup.set(account.teamId, account.name);
    }
    return lookup;
  }, [accounts]);

  // Build unified people list
  const people: PersonItem[] = useMemo(() => {
    const result: PersonItem[] = [];

    // Workspace members
    for (const member of (members ?? []) as WorkspaceMember[]) {
      result.push({
        kind: 'member',
        id: member.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        accessLevel: 'Workspace',
      });
    }

    // Account direct members (deduplicate against workspace members)
    const workspaceUserIds = new Set(
      result.map((person) => (person.kind === 'member' ? person.userId : ''))
    );
    for (const { accountId, member } of accountDirectMembers) {
      if (workspaceUserIds.has(member.userId)) continue;
      result.push({
        kind: 'member',
        id: `account-${accountId}-${member.userId}`,
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        accessLevel: accountNameById.get(accountId) ?? 'Account',
        accountId,
      });
    }

    // Pending invitations
    const pendingInvitations = ((invitations ?? []) as PendingInvitation[]).filter(
      (invitation) => invitation.status === 'pending'
    );
    for (const invitation of pendingInvitations) {
      result.push({
        kind: 'invitation',
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        accessLevel: invitation.teamId
          ? (accountNameById.get(invitation.teamId) ?? 'Account')
          : 'Workspace',
        teamId: invitation.teamId,
      });
    }

    return result;
  }, [members, accountDirectMembers, invitations, accountNameById]);

  const queryClient = useQueryClient();

  async function onRefresh() {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['account-members'] });
    await Promise.all([refetchMembers(), refetchInvitations()]);
    setRefreshing(false);
  }

  function getMutationCallbacks(successMessage?: string) {
    return {
      onSuccess: () => {
        setSelectedPerson(null);
        if (successMessage) {
          Alert.alert('Success', successMessage);
        }
      },
      onError: (error: unknown) => {
        const axiosError = error as { response?: { data?: { message?: string } } };
        const message =
          axiosError?.response?.data?.message ?? 'Something went wrong. Please try again.';
        console.error('[workspace mutation error]', message, error);
        Alert.alert('Error', message);
      },
    };
  }

  function handleChangePermission(newRole: string) {
    if (!selectedPerson || selectedPerson.kind !== 'member') return;

    if (selectedPerson.accessLevel === 'Workspace') {
      updateWorkspaceRole({ memberId: selectedPerson.id, role: newRole }, getMutationCallbacks());
    } else if (selectedPerson.accountId) {
      updateAccountRole(
        { accountId: selectedPerson.accountId, userId: selectedPerson.userId, role: newRole },
        getMutationCallbacks()
      );
    }
  }

  function handleChangeAccess(newAccessLevel: string, accountId?: string) {
    if (!selectedPerson || selectedPerson.kind !== 'member') return;

    const role = selectedPerson.role === 'owner' ? 'editor' : selectedPerson.role;
    const target = newAccessLevel === 'workspace' ? ('workspace' as const) : ('account' as const);

    // We need an accountId context for the API call — use the selected person's current
    // accountId (for account→workspace) or the first available account as context
    const contextAccountId = selectedPerson.accountId ?? accountIds[0];
    if (!contextAccountId) {
      Alert.alert('Error', 'No account available. Please try again.');
      return;
    }

    changeAccessLevel(
      {
        accountId: contextAccountId,
        userId: selectedPerson.userId,
        target,
        role,
        targetAccountId: target === 'account' ? accountId : undefined,
      },
      getMutationCallbacks()
    );
  }

  function handleRemove() {
    if (!selectedPerson) return;
    if (selectedPerson.kind === 'member') {
      if (selectedPerson.accessLevel === 'Workspace') {
        removeWorkspaceMember(selectedPerson.id, getMutationCallbacks('Member removed'));
      } else if (selectedPerson.accountId) {
        removeAccountMember(
          { accountId: selectedPerson.accountId, userId: selectedPerson.userId },
          getMutationCallbacks('Member removed')
        );
      }
    }
  }

  function handleCancelInvitation() {
    if (!selectedPerson || selectedPerson.kind !== 'invitation') return;
    cancelInvitation(selectedPerson.id, getMutationCallbacks('Invitation cancelled'));
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workspace</Text>
      </View>

      <TouchableOpacity style={styles.inviteButton} onPress={() => setInviteVisible(true)}>
        <Ionicons name="person-add-outline" size={18} color={Colors.textPrimary} />
        <Text style={styles.inviteButtonText}>Invite a Friend</Text>
      </TouchableOpacity>

      {membersLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" style={styles.centered} />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={({ item }) => (
            <PersonRow person={item} onPress={() => setSelectedPerson(item)} />
          )}
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
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No members yet</Text>
              <Text style={styles.emptySubtitle}>Invite someone to get started</Text>
            </View>
          }
        />
      )}

      <InviteMemberSheet
        visible={inviteVisible}
        accounts={accounts ?? []}
        onClose={() => setInviteVisible(false)}
      />

      <MemberManagementSheet
        visible={selectedPerson !== null}
        person={selectedPerson}
        accounts={accounts ?? []}
        onClose={() => setSelectedPerson(null)}
        onChangePermission={handleChangePermission}
        onChangeAccess={handleChangeAccess}
        onRemove={handleRemove}
        onCancelInvitation={handleCancelInvitation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.brandBlue,
  },
  inviteButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    marginTop: 60,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  personName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  personMeta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
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
  },
});
