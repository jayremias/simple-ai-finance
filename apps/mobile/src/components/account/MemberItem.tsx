import { Ionicons } from '@expo/vector-icons';
import type { AccountMemberResponse } from '@moneylens/shared';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: Colors.brandPurple },
  editor: { label: 'Editor', color: Colors.brandBlue },
  viewer: { label: 'Reader', color: Colors.textMuted },
};

interface MemberItemProps {
  member: AccountMemberResponse;
  canRemove: boolean;
  onRemove?: () => void;
}

export function MemberItem({ member, canRemove, onRemove }: MemberItemProps) {
  const roleInfo = ROLE_LABELS[member.role] ?? ROLE_LABELS.viewer;
  const initials = member.name
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function handleRemove() {
    Alert.alert('Remove Member', `Remove ${member.name} from this account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {member.email}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.roleBadge, { borderColor: roleInfo.color }]}>
          <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
        </View>
        {member.source === 'organization' && <Text style={styles.sourceLabel}>via workspace</Text>}
      </View>
      {canRemove && member.source === 'direct' && (
        <TouchableOpacity
          onPress={handleRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeButton}
        >
          <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
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
  info: {
    flex: 1,
    gap: 1,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  email: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
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
  sourceLabel: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  removeButton: {
    paddingLeft: 4,
  },
});
