import { Ionicons } from '@expo/vector-icons';
import type { AccountResponse } from '@moneylens/shared';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/theme/colors';

const PERMISSION_OPTIONS = [
  { value: 'viewer', label: 'Reader' },
  { value: 'editor', label: 'Editor' },
] as const;

export type PersonItem =
  | {
      kind: 'member';
      id: string;
      userId: string;
      name: string;
      email: string;
      role: string;
      accessLevel: string;
      accountId?: string;
      teamId?: string;
    }
  | {
      kind: 'invitation';
      id: string;
      email: string;
      role: string | null;
      accessLevel: string;
      teamId: string | null;
    };

interface MemberManagementSheetProps {
  visible: boolean;
  person: PersonItem | null;
  accounts: AccountResponse[];
  onClose: () => void;
  onChangePermission: (newRole: string) => void;
  onChangeAccess: (newAccessLevel: 'workspace' | string, accountId?: string) => void;
  onRemove: () => void;
  onCancelInvitation: () => void;
}

export function MemberManagementSheet({
  visible,
  person,
  accounts,
  onClose,
  onChangePermission,
  onChangeAccess,
  onRemove,
  onCancelInvitation,
}: MemberManagementSheetProps) {
  if (!person) return null;

  const isMember = person.kind === 'member';
  const isOwner = isMember && person.role === 'owner';
  const isWorkspaceMember = isMember && person.accessLevel === 'Workspace';
  const canChangePermission = isMember && !isOwner;
  const name = isMember ? person.name : person.email;
  const email = isMember ? person.email : '';
  const currentRole = person.role ?? 'viewer';
  const currentAccessLevel = person.accessLevel;

  function handleRemove() {
    const label = isMember ? name : person.email;
    Alert.alert('Remove Access', `Remove ${label}? They will lose access.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (isMember) {
            onRemove();
          } else {
            onCancelInvitation();
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.personHeader}>
          <View style={styles.avatar}>
            {isMember ? (
              <Text style={styles.avatarText}>
                {name
                  .split(' ')
                  .map((part: string) => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            ) : (
              <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
            )}
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{name}</Text>
            {email ? <Text style={styles.personEmail}>{email}</Text> : null}
          </View>
          {!isMember && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>

        {isOwner ? (
          <View style={styles.ownerNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.brandPurple} />
            <Text style={styles.ownerNoticeText}>Owner -- cannot be modified</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Access Level */}
            <Text style={styles.sectionLabel}>Access</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.accessScroll}
            >
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, currentAccessLevel === 'Workspace' && styles.chipActive]}
                  onPress={() => {
                    if (currentAccessLevel !== 'Workspace') {
                      onChangeAccess('workspace');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      currentAccessLevel === 'Workspace' && styles.chipTextActive,
                    ]}
                  >
                    Workspace
                  </Text>
                </TouchableOpacity>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.chip, currentAccessLevel === account.name && styles.chipActive]}
                    onPress={() => {
                      if (currentAccessLevel !== account.name) {
                        onChangeAccess(account.id, account.id);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.accountDot,
                        { backgroundColor: account.color ?? Colors.brandBlue },
                      ]}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        currentAccessLevel === account.name && styles.chipTextActive,
                      ]}
                    >
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Permission */}
            <Text style={styles.sectionLabel}>Permission</Text>
            <View style={styles.chipRow}>
              {PERMISSION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.permissionChip,
                    currentRole === option.value && styles.chipActive,
                    !canChangePermission && styles.chipDisabled,
                  ]}
                  disabled={!canChangePermission}
                  onPress={() => {
                    if (currentRole !== option.value) {
                      onChangePermission(option.value);
                    }
                  }}
                >
                  <Text
                    style={[styles.chipText, currentRole === option.value && styles.chipTextActive]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Remove */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.dangerButton} onPress={handleRemove}>
                <Ionicons
                  name={isMember ? 'person-remove-outline' : 'close-circle-outline'}
                  size={18}
                  color={Colors.danger}
                />
                <Text style={styles.dangerButtonText}>
                  {isMember ? 'Remove Access' : 'Cancel Invitation'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  personName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  personEmail: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  pendingBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingText: {
    color: Colors.darkBg,
    fontSize: 11,
    fontWeight: '700',
  },
  ownerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
  },
  ownerNoticeText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 10,
  },
  accessScroll: {
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
    gap: 6,
  },
  permissionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.brandBlue,
    borderColor: Colors.brandBlue,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    marginTop: 28,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  dangerButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
