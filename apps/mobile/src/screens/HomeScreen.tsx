import { Ionicons } from '@expo/vector-icons';
import type { AccountResponse, TransactionResponse } from '@moneylens/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
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
import { CategoryPicker } from '../components/common/CategoryPicker';
import { DatePicker } from '../components/common/DatePicker';
import { TagPicker } from '../components/common/TagPicker';
import { TransactionEditSheet } from '../components/common/TransactionEditSheet';
import { TransactionItem } from '../components/common/TransactionItem';
import { BalanceCard } from '../components/home/BalanceCard';
import { FeedAISection } from '../components/home/FeedAISection';
import { HomeHeader } from '../components/home/HomeHeader';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useCreateTag, useTags } from '../hooks/useTags';
import { useCreateTransaction, useTransactions } from '../hooks/useTransactions';
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
  tagIds: string[];
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
  const { data: allTags = [] } = useTags();
  const { mutateAsync: createTagMutation } = useCreateTag();
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
    tagIds: [],
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
        tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
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
            placeholder="Payee name"
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

          {/* Tags */}
          <Text style={sheetStyles.label}>Tags (optional)</Text>
          <TagPicker
            allTags={allTags}
            selectedIds={form.tagIds}
            onToggle={(id) =>
              set(
                'tagIds',
                form.tagIds.includes(id)
                  ? form.tagIds.filter((t) => t !== id)
                  : [...form.tagIds, id]
              )
            }
            onCreateAndAdd={async (name) => {
              const tag = await createTagMutation(name);
              set('tagIds', [...form.tagIds, tag.id]);
            }}
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
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TransactionList', undefined)}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  seeAll: { color: Colors.brandBlue, fontSize: 13, fontWeight: '500' },
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
