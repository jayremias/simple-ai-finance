import type { AccountResponse } from '@moneylens/shared';
import { ACCOUNT_TYPES, CURRENCIES } from '@moneylens/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountMembersSection } from '@/components/account/AccountMembersSection';
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/hooks/useAccounts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Colors } from '@/theme/colors';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
};

const ACCOUNT_COLORS = [
  '#2B7EFF',
  '#7B2FBE',
  '#00C896',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

function formatBalance(cents: number, currency: string) {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// ---------------------------------------------------------------------------
// Account card
// ---------------------------------------------------------------------------

function AccountCard({ account, onPress }: { account: AccountResponse; onPress: () => void }) {
  const dot = account.color ?? Colors.brandBlue;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.accountDot, { backgroundColor: dot }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{account.name}</Text>
        <Text style={styles.cardType}>{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardBalance}>{formatBalance(account.balance, account.currency)}</Text>
        <Text style={styles.cardCurrency}>{account.currency}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Shared form sheet — create when account=null, edit when account is provided
// ---------------------------------------------------------------------------

type FormState = {
  name: string;
  type: string;
  currency: string;
  initialBalance: string;
  color: string;
};

function AccountFormSheet({
  visible,
  account,
  onClose,
}: {
  visible: boolean;
  account: AccountResponse | null;
  onClose: () => void;
}) {
  const isEdit = account !== null;

  const { data: profile } = useUserProfile();
  const { mutate: createAccount, isPending: isCreating } = useCreateAccount();
  const { mutate: updateAccount, isPending: isUpdating } = useUpdateAccount();
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  const isPending = isCreating || isUpdating || isDeleting;

  const [form, setForm] = useState<FormState>({
    name: '',
    type: 'checking',
    currency: 'USD',
    initialBalance: '',
    color: ACCOUNT_COLORS[0] ?? '#2B7EFF',
  });
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsReady(false);
      return;
    }
    setForm({
      name: account?.name ?? '',
      type: account?.type ?? 'checking',
      currency: account?.currency ?? profile?.defaultCurrency ?? 'USD',
      initialBalance: account ? String(account.initialBalance / 100) : '',
      color: account?.color ?? ACCOUNT_COLORS[0] ?? '#2B7EFF',
    });
    setError(null);
    setIsReady(true);
  }, [visible, account, profile?.defaultCurrency]);

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError('Account name is required.');
      return;
    }
    setError(null);

    if (isEdit) {
      updateAccount(
        {
          id: account.id,
          data: {
            name: form.name.trim(),
            type: form.type as (typeof ACCOUNT_TYPES)[number],
            currency: form.currency as (typeof CURRENCIES)[number],
            color: form.color,
          },
        },
        {
          onSuccess: handleClose,
          onError: () => setError('Failed to save changes. Please try again.'),
        }
      );
    } else {
      const balanceCents = form.initialBalance
        ? Math.round(parseFloat(form.initialBalance) * 100)
        : 0;

      if (form.initialBalance && Number.isNaN(balanceCents)) {
        setError('Initial balance must be a valid number.');
        return;
      }

      createAccount(
        {
          name: form.name.trim(),
          type: form.type as (typeof ACCOUNT_TYPES)[number],
          currency: form.currency as (typeof CURRENCIES)[number],
          initial_balance: balanceCents,
          color: form.color,
        },
        {
          onSuccess: handleClose,
          onError: () => setError('Failed to create account. Please try again.'),
        }
      );
    }
  }

  function handleDelete() {
    if (!account) return;
    Alert.alert('Delete Account', `Delete "${account.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteAccount(account.id, {
            onSuccess: handleClose,
            onError: () => setError('Failed to delete account. Please try again.'),
          }),
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{isEdit ? 'Edit Account' : 'New Account'}</Text>
          {isEdit && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteLink}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isReady ? (
          <View style={styles.skeleton}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonField} />
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonChipRow}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonChip} />
              ))}
            </View>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonChipRow}>
              {[1, 2].map((i) => (
                <View key={i} style={styles.skeletonChip} />
              ))}
            </View>
            <View style={styles.skeletonButton} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Main Checking"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.chipRow}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, form.type === t && styles.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}
                >
                  <Text style={[styles.chipText, form.type === t && styles.chipTextActive]}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Currency</Text>
            <View style={styles.chipRow}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, form.currency === c && styles.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, currency: c }))}
                >
                  <Text style={[styles.chipText, form.currency === c && styles.chipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!isEdit && (
              <>
                <Text style={styles.label}>Initial Balance (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={form.initialBalance}
                  onChangeText={(v) => setForm((f) => ({ ...f, initialBalance: v }))}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </>
            )}

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {ACCOUNT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    form.color === c && styles.colorDotActive,
                  ]}
                  onPress={() => setForm((f) => ({ ...f, color: c }))}
                />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending && !isDeleting ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            {isEdit && account && <AccountMembersSection accountId={account.id} />}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const { data: accounts, isLoading, error, refetch } = useAccounts();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountResponse | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function openCreate() {
    setSelectedAccount(null);
    setSheetVisible(true);
  }

  function openEdit(account: AccountResponse) {
    setSelectedAccount(account);
    setSheetVisible(true);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accounts</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" style={styles.centered} />
      ) : error ? (
        <Text style={[styles.centered, styles.errorText]}>Failed to load accounts</Text>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AccountCard account={item} onPress={() => openEdit(item)} />}
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
              <Text style={styles.emptyTitle}>No accounts yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first account</Text>
            </View>
          }
        />
      )}

      <AccountFormSheet
        visible={sheetVisible}
        account={selectedAccount}
        onClose={() => setSheetVisible(false)}
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 26,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  centered: {
    flex: 1,
    textAlign: 'center',
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
  accountDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  cardType: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  cardBalance: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  cardCurrency: {
    color: Colors.textMuted,
    fontSize: 11,
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
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  deleteLink: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
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
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
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
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
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
  skeleton: {
    gap: 12,
    paddingTop: 4,
  },
  skeletonLabel: {
    height: 12,
    width: 80,
    borderRadius: 6,
    backgroundColor: Colors.surfaceBg,
  },
  skeletonField: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceBg,
  },
  skeletonChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonChip: {
    height: 34,
    width: 80,
    borderRadius: 20,
    backgroundColor: Colors.surfaceBg,
  },
  skeletonButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surfaceBg,
    marginTop: 12,
  },
});
