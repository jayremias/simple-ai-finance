import type { AccountMemberResponse } from '@moneylens/shared';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAccountMembers } from '@/hooks/useSharing';
import { Colors } from '@/theme/colors';
import { MemberItem } from './MemberItem';

interface AccountMembersSectionProps {
  accountId: string;
}

export function AccountMembersSection({ accountId }: AccountMembersSectionProps) {
  const { data: members, isLoading } = useAccountMembers(accountId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Members</Text>

      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="small" style={styles.loader} />
      ) : members && members.length > 0 ? (
        <View style={styles.membersList}>
          {members.map((member: AccountMemberResponse) => (
            <MemberItem key={member.userId} member={member} canRemove={false} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No members</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  membersList: {
    gap: 2,
  },
  loader: {
    paddingVertical: 16,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    paddingVertical: 12,
  },
});
