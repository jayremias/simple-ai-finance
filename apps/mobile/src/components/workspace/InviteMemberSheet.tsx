import type { AccountResponse } from '@moneylens/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useInviteToAccount, useInviteToWorkspace } from '@/hooks/useSharing';
import { Colors } from '@/theme/colors';

const ROLES = [
  { value: 'viewer', label: 'Reader' },
  { value: 'editor', label: 'Editor' },
] as const;

interface InviteMemberSheetProps {
  visible: boolean;
  accounts: AccountResponse[];
  preselectedAccountId?: string;
  onClose: () => void;
}

export function InviteMemberSheet({
  visible,
  accounts,
  preselectedAccountId,
  onClose,
}: InviteMemberSheetProps) {
  const { mutate: inviteToWorkspace, isPending: isInvitingWorkspace } = useInviteToWorkspace();
  const { mutate: inviteToAccount, isPending: isInvitingAccount } = useInviteToAccount();
  const isPending = isInvitingWorkspace || isInvitingAccount;

  const [scope, setScope] = useState<string>(preselectedAccountId ?? 'workspace');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('viewer');
  const [error, setError] = useState<string | null>(null);

  const isWorkspaceScope = scope === 'workspace';

  function handleClose() {
    setScope(preselectedAccountId ?? 'workspace');
    setEmail('');
    setRole('viewer');
    setError(null);
    onClose();
  }

  function handleScopeChange(newScope: string) {
    setScope(newScope);
  }

  function handleInvite() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    const callbacks = {
      onSuccess: handleClose,
      onError: (error: unknown) => {
        const axiosError = error as { response?: { data?: { message?: string } } };
        const message =
          axiosError?.response?.data?.message ?? 'Failed to send invitation. Please try again.';
        setError(message);
      },
    };

    if (isWorkspaceScope) {
      inviteToWorkspace({ email: trimmedEmail, role }, callbacks);
    } else {
      const account = accounts.find((accountItem) => accountItem.id === scope);
      if (!account) return;
      inviteToAccount({ email: trimmedEmail, role, teamId: account.teamId }, callbacks);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Invite Member</Text>

        <Text style={styles.label}>Scope</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scopeScroll}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, isWorkspaceScope && styles.chipActive]}
              onPress={() => handleScopeChange('workspace')}
            >
              <Text style={[styles.chipText, isWorkspaceScope && styles.chipTextActive]}>
                Entire Workspace
              </Text>
            </TouchableOpacity>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[styles.chip, scope === account.id && styles.chipActive]}
                onPress={() => handleScopeChange(account.id)}
              >
                <View
                  style={[
                    styles.accountDot,
                    { backgroundColor: account.color ?? Colors.brandBlue },
                  ]}
                />
                <Text style={[styles.chipText, scope === account.id && styles.chipTextActive]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {isWorkspaceScope && (
          <Text style={styles.scopeHint}>This person will have access to all accounts.</Text>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="user@example.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.chipRow}>
          {ROLES.map((roleOption) => (
            <TouchableOpacity
              key={roleOption.value}
              style={[styles.chip, role === roleOption.value && styles.chipActive]}
              onPress={() => setRole(roleOption.value)}
            >
              <Text style={[styles.chipText, role === roleOption.value && styles.chipTextActive]}>
                {roleOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
          onPress={handleInvite}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.textPrimary} size="small" />
          ) : (
            <Text style={styles.submitText}>Send Invitation</Text>
          )}
        </TouchableOpacity>
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
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  scopeScroll: {
    flexGrow: 0,
  },
  scopeHint: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
    gap: 6,
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
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
