import { Ionicons } from '@expo/vector-icons';
import type { AccountResponse, CategoryTreeResponse, TransactionResponse } from '@moneylens/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { DatePicker } from '../components/common/DatePicker';
import { TransactionItem } from '../components/common/TransactionItem';
import { BalanceCard } from '../components/home/BalanceCard';
import { FeedAISection } from '../components/home/FeedAISection';
import { HomeHeader } from '../components/home/HomeHeader';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '../hooks/useTransactions';
import { useUserProfile } from '../hooks/useUserProfile';
import type { RootStackParamList } from '../types';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;
type TxType = 'expense' | 'income' | 'transfer';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Transaction form sheet
// ---------------------------------------------------------------------------

type FormState = {
  type: TxType;
  amount: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  date: string;
  payee: string;
  notes: string;
};

const TYPE_LABELS: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const TYPE_COLOR: Record<TxType, string> = {
  expense: Colors.danger,
  income: Colors.success,
  transfer: Colors.brandBlue,
};

function AccountPicker({
  accounts,
  selected,
  exclude,
  onSelect,
}: {
  accounts: AccountResponse[];
  selected: string;
  exclude?: string;
  onSelect: (id: string) => void;
}) {
  const visible = accounts.filter((a) => a.teamId !== exclude);
  return (
    <View style={sheetStyles.chipRow}>
      {visible.map((a) => (
        <TouchableOpacity
          key={a.teamId}
          style={[sheetStyles.chip, selected === a.teamId && sheetStyles.chipActive]}
          onPress={() => onSelect(a.teamId)}
        >
          {a.color ? <View style={[sheetStyles.dot, { backgroundColor: a.color }]} /> : null}
          <Text style={[sheetStyles.chipText, selected === a.teamId && sheetStyles.chipTextActive]}>
            {a.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function CategoryPicker({
  categories,
  selected,
  onSelect,
}: {
  categories: CategoryTreeResponse[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [expandedParentId, setExpandedParentId] = useState<string>('');

  // Derive which parent is active from the selected id
  const selectedParent = categories.find(
    (c) => c.id === selected || c.children.some((ch) => ch.id === selected)
  );
  const expandedCat = categories.find((c) => c.id === expandedParentId);

  function handleParentPress(cat: CategoryTreeResponse) {
    if (expandedParentId === cat.id) {
      // Collapse and clear selection
      setExpandedParentId('');
      onSelect('');
    } else {
      setExpandedParentId(cat.id);
      onSelect(cat.id);
    }
  }

  function handleChildPress(childId: string) {
    onSelect(selected === childId ? expandedParentId : childId);
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={sheetStyles.chipRow}>
          {categories.map((cat) => {
            const isActive = selectedParent?.id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  sheetStyles.chip,
                  isActive && {
                    backgroundColor: cat.color ?? Colors.brandBlue,
                    borderColor: cat.color ?? Colors.brandBlue,
                  },
                ]}
                onPress={() => handleParentPress(cat)}
              >
                <Ionicons
                  name={(cat.icon ?? 'ellipse-outline') as IoniconsName}
                  size={14}
                  color={isActive ? Colors.textPrimary : Colors.textSecondary}
                />
                <Text style={[sheetStyles.chipText, isActive && sheetStyles.chipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {expandedCat && expandedCat.children.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sheetStyles.subRow}>
          <View style={sheetStyles.chipRow}>
            {expandedCat.children.map((child) => {
              const isActive = selected === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    sheetStyles.subChip,
                    isActive && {
                      backgroundColor: expandedCat.color ?? Colors.brandBlue,
                      borderColor: expandedCat.color ?? Colors.brandBlue,
                    },
                  ]}
                  onPress={() => handleChildPress(child.id)}
                >
                  <Ionicons
                    name={(child.icon ?? 'ellipse-outline') as IoniconsName}
                    size={12}
                    color={isActive ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text style={[sheetStyles.subChipText, isActive && sheetStyles.chipTextActive]}>
                    {child.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Transaction edit/delete sheet
// ---------------------------------------------------------------------------

type EditFormState = {
  amount: string;
  categoryId: string;
  date: string;
  payee: string;
  notes: string;
};

function TransactionEditSheet({
  transaction,
  onClose,
}: {
  transaction: TransactionResponse | null;
  onClose: () => void;
}) {
  const { data: categories = [] } = useCategories();
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTransaction, isPending: isDeleting } = useDeleteTransaction();

  const isPending = isUpdating || isDeleting;

  const [form, setForm] = useState<EditFormState>({
    amount: '',
    categoryId: '',
    date: '',
    payee: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!transaction) {
      setIsReady(false);
      return;
    }
    setForm({
      amount: String(Math.abs(transaction.amount) / 100),
      categoryId: transaction.categoryId ?? '',
      date: transaction.date,
      payee: transaction.payee ?? '',
      notes: transaction.notes ?? '',
    });
    setError(null);
    setIsReady(true);
  }, [transaction]);

  function handleClose() {
    setError(null);
    onClose();
  }

  function set<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const amountNum = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!transaction) return;
    setError(null);

    updateTransaction(
      {
        id: transaction.id,
        data: {
          amount: Math.round(amountNum * 100),
          categoryId: form.categoryId || null,
          date: form.date,
          payee: form.payee.trim() || null,
          notes: form.notes.trim() || null,
        },
      },
      {
        onSuccess: handleClose,
        onError: () => setError('Failed to save changes. Please try again.'),
      }
    );
  }

  function handleDelete() {
    if (!transaction) return;
    Alert.alert('Delete Transaction', 'Delete this transaction? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteTransaction(transaction.id, {
            onSuccess: handleClose,
            onError: () => setError('Failed to delete. Please try again.'),
          }),
      },
    ]);
  }

  const accentColor = transaction
    ? (TYPE_COLOR[transaction.type as TxType] ?? Colors.brandBlue)
    : Colors.brandBlue;
  const typeLabel = transaction
    ? (TYPE_LABELS.find((t) => t.value === transaction.type)?.label ?? transaction.type)
    : '';

  return (
    <Modal
      visible={transaction !== null}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={handleClose} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />

        {/* Header */}
        <View style={editSheetStyles.header}>
          <View style={[editSheetStyles.typeBadge, { backgroundColor: `${accentColor}22` }]}>
            <Text style={[editSheetStyles.typeBadgeText, { color: accentColor }]}>{typeLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={editSheetStyles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>

        {!isReady ? (
          <View style={editSheetStyles.skeleton}>
            <View style={editSheetStyles.skeletonAmount} />
            <View style={editSheetStyles.skeletonLabel} />
            <View style={editSheetStyles.skeletonField} />
            <View style={editSheetStyles.skeletonLabel} />
            <View style={editSheetStyles.skeletonField} />
            <View style={editSheetStyles.skeletonLabel} />
            <View style={editSheetStyles.skeletonField} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Amount */}
            <TextInput
              style={[sheetStyles.amountInput, { color: accentColor }]}
              value={form.amount}
              onChangeText={(v) => set('amount', v)}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            {/* Category (expense / income only) */}
            {transaction?.type !== 'transfer' && (
              <>
                <Text style={sheetStyles.label}>Category (optional)</Text>
                <CategoryPicker
                  categories={categories}
                  selected={form.categoryId}
                  onSelect={(id) => set('categoryId', id)}
                />
              </>
            )}

            {/* Date */}
            <Text style={sheetStyles.label}>Date</Text>
            <DatePicker value={form.date} onChange={(date) => set('date', date)} />

            {/* Payee */}
            <Text style={sheetStyles.label}>Payee (optional)</Text>
            <TextInput
              style={sheetStyles.input}
              value={form.payee}
              onChangeText={(v) => set('payee', v)}
              placeholder="e.g. Starbucks"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Notes */}
            <Text style={sheetStyles.label}>Notes (optional)</Text>
            <TextInput
              style={[sheetStyles.input, sheetStyles.notesInput]}
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              placeholder="Add a note…"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            {error ? <Text style={sheetStyles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                sheetStyles.submitBtn,
                { backgroundColor: accentColor },
                isPending && sheetStyles.submitBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isPending}
            >
              {isUpdating ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <Text style={sheetStyles.submitText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function TransactionFormSheet({
  visible,
  accounts,
  onClose,
}: {
  visible: boolean;
  accounts: AccountResponse[];
  onClose: () => void;
}) {
  const { data: categories = [] } = useCategories();
  const { mutate: createTransaction, isPending } = useCreateTransaction();

  const defaultForm = (): FormState => ({
    type: 'expense',
    amount: '',
    accountId: accounts[0]?.teamId ?? '',
    toAccountId: accounts[1]?.teamId ?? accounts[0]?.teamId ?? '',
    categoryId: '',
    date: todayISO(),
    payee: '',
    notes: '',
  });

  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setForm(defaultForm());
    setError(null);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    const amountNum = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!form.accountId) {
      setError('Select an account.');
      return;
    }
    if (form.type === 'transfer' && (!form.toAccountId || form.toAccountId === form.accountId)) {
      setError('Select a different destination account.');
      return;
    }
    setError(null);

    const amountCents = Math.round(amountNum * 100);

    createTransaction(
      {
        accountId: form.accountId,
        toAccountId: form.type === 'transfer' ? form.toAccountId : undefined,
        type: form.type,
        amount: amountCents,
        categoryId: form.categoryId || undefined,
        date: form.date,
        payee: form.payee.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: handleClose,
        onError: () => setError('Failed to save. Please try again.'),
      }
    );
  }

  const accentColor = TYPE_COLOR[form.type];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      onShow={handleOpen}
    >
      <Pressable style={sheetStyles.overlay} onPress={handleClose} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />

        {/* Type toggle */}
        <View style={sheetStyles.typeRow}>
          {TYPE_LABELS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                sheetStyles.typeBtn,
                form.type === value && { backgroundColor: TYPE_COLOR[value] },
              ]}
              onPress={() => set('type', value)}
            >
              <Text
                style={[
                  sheetStyles.typeBtnText,
                  form.type === value && sheetStyles.typeBtnTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Amount */}
          <TextInput
            style={[sheetStyles.amountInput, { color: accentColor }]}
            value={form.amount}
            onChangeText={(v) => set('amount', v)}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            autoFocus
          />

          {/* Account */}
          <Text style={sheetStyles.label}>
            {form.type === 'transfer' ? 'From Account' : 'Account'}
          </Text>
          <AccountPicker
            accounts={accounts}
            selected={form.accountId}
            exclude={form.type === 'transfer' ? form.toAccountId : undefined}
            onSelect={(id) => set('accountId', id)}
          />

          {/* To account (transfer only) */}
          {form.type === 'transfer' && (
            <>
              <Text style={sheetStyles.label}>To Account</Text>
              <AccountPicker
                accounts={accounts}
                selected={form.toAccountId}
                exclude={form.accountId}
                onSelect={(id) => set('toAccountId', id)}
              />
            </>
          )}

          {/* Category (expense / income only) */}
          {form.type !== 'transfer' && (
            <>
              <Text style={sheetStyles.label}>Category (optional)</Text>
              <CategoryPicker
                categories={categories}
                selected={form.categoryId}
                onSelect={(id) => set('categoryId', id)}
              />
            </>
          )}

          {/* Date */}
          <Text style={sheetStyles.label}>Date</Text>
          <DatePicker value={form.date} onChange={(date) => set('date', date)} />

          {/* Payee */}
          <Text style={sheetStyles.label}>Payee (optional)</Text>
          <TextInput
            style={sheetStyles.input}
            value={form.payee}
            onChangeText={(v) => set('payee', v)}
            placeholder="e.g. Starbucks"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Notes */}
          <Text style={sheetStyles.label}>Notes (optional)</Text>
          <TextInput
            style={[sheetStyles.input, sheetStyles.notesInput]}
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder="Add a note…"
            placeholderTextColor={Colors.textMuted}
            multiline
          />

          {error ? <Text style={sheetStyles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              sheetStyles.submitBtn,
              { backgroundColor: accentColor },
              isPending && sheetStyles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Text style={sheetStyles.submitText}>Save Transaction</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { data: profile, refetch: refetchProfile } = useUserProfile();
  const { data: accountsData, refetch: refetchAccounts } = useAccounts();
  const { data: transactionsData, refetch: refetchTransactions } = useTransactions({ limit: 10 });
  const [formVisible, setFormVisible] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransactionResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchAccounts(), refetchTransactions()]);
    setRefreshing(false);
  }

  const accounts = accountsData ?? [];
  const totalBalanceCents = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalBalance = totalBalanceCents / 100;
  const firstName = profile?.name?.split(' ')[0] ?? '';
  const transactions = transactionsData?.data ?? [];

  const handleScanReceipt = () => {
    navigation.navigate('ReceiptDetail', {
      receipt: {
        imageUri:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Grocery_store_receipt.jpg/800px-Grocery_store_receipt.jpg',
        category: 'Groceries',
        amount: 45.89,
        date: 'June 18, 2024',
        insight: {
          message: 'Groceries spend is up 15%. Detected overlap with whole foods.',
          type: 'info',
        },
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brandBlue}
          />
        }
      >
        <HomeHeader
          userName={firstName}
          onNotification={() => Alert.alert('Notifications', 'No new notifications')}
        />

        <BalanceCard balance={totalBalance} />

        <View style={styles.spacer} />

        <FeedAISection
          onScanReceipt={handleScanReceipt}
          onUploadFile={() => Alert.alert('Upload File', 'File upload coming soon')}
          onVoiceEntry={() => Alert.alert('Voice Entry', 'Voice input coming soon')}
          onManualEntry={() => {
            if (accounts.length === 0) {
              Alert.alert('No accounts', 'Create an account first before adding a transaction.');
              return;
            }
            setFormVisible(true);
          }}
        />

        <View style={styles.spacer} />

        <View style={styles.transactionsSection}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first transaction using the options above
              </Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onPress={() => setEditTransaction(tx)}
              />
            ))
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <TransactionFormSheet
        visible={formVisible}
        accounts={accounts}
        onClose={() => setFormVisible(false)}
      />

      <TransactionEditSheet
        transaction={editTransaction}
        onClose={() => setEditTransaction(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navyBg },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  spacer: { height: 16 },
  transactionsSection: { paddingHorizontal: 20 },
  bottomPad: { height: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 240 },
});

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  typeBtnTextActive: { color: Colors.textPrimary },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 20,
    letterSpacing: -1,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
  },
  chipActive: { backgroundColor: Colors.brandBlue, borderColor: Colors.brandBlue },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: Colors.textPrimary, fontWeight: '600' },
  subRow: { marginTop: 8 },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
  },
  subChipText: { color: Colors.textSecondary, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
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
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: Colors.danger, fontSize: 13, marginTop: 12 },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
});

const editSheetStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteLink: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  skeleton: {
    paddingTop: 8,
    gap: 12,
  },
  skeletonAmount: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.surfaceBg,
    marginBottom: 8,
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
});
