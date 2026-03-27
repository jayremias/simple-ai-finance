import { Ionicons } from '@expo/vector-icons';
import type { AccountResponse, ParsedTransactionItem } from '@moneylens/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { Colors } from '@/theme/colors';
import { CategoryPicker } from '../components/common/CategoryPicker';
import type { RootStackParamList } from '../types';

type ReceiptReviewRoute = RouteProp<RootStackParamList, 'ReceiptReview'>;
type ReceiptReviewNavigation = NativeStackNavigationProp<RootStackParamList>;

type TransactionType = 'income' | 'expense';

interface ReviewForm {
  type: TransactionType;
  amount: string;
  date: string;
  payee: string;
  notes: string;
  accountId: string;
  categoryId: string;
}

function formFromItem(item: ParsedTransactionItem, defaultAccountId: string): ReviewForm {
  return {
    type: item.type === 'income' ? 'income' : 'expense',
    amount: (item.amount / 100).toFixed(2),
    date: item.date,
    payee: item.payee ?? '',
    notes: item.notes ?? '',
    accountId: defaultAccountId,
    categoryId: '',
  };
}

function AccountPicker({
  accounts,
  selected,
  onSelect,
}: {
  accounts: AccountResponse[];
  selected: string;
  onSelect: (teamId: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {accounts.map((account) => (
        <TouchableOpacity
          key={account.teamId}
          style={[styles.chip, selected === account.teamId && styles.chipActive]}
          onPress={() => onSelect(account.teamId)}
        >
          {account.color ? (
            <View style={[styles.chipDot, { backgroundColor: account.color }]} />
          ) : null}
          <Text style={[styles.chipText, selected === account.teamId && styles.chipTextActive]}>
            {account.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ReceiptReviewScreen() {
  const navigation = useNavigation<ReceiptReviewNavigation>();
  const route = useRoute<ReceiptReviewRoute>();
  const insets = useSafeAreaInsets();

  const { items, sourceConfidence } = route.params;
  const primaryItem = items[0];

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { mutate: createTransaction, isPending } = useCreateTransaction();

  const [form, setForm] = useState<ReviewForm>(() =>
    formFromItem(primaryItem, accounts[0]?.teamId ?? '')
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<Key extends keyof ReviewForm>(key: Key, value: ReviewForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const amountNumber = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!form.accountId) {
      setError('Select an account.');
      return;
    }
    setError(null);

    const amountCents = Math.round(amountNumber * 100);

    createTransaction(
      {
        accountId: form.accountId,
        type: form.type,
        amount: amountCents,
        date: form.date,
        payee: form.payee.trim() || undefined,
        notes: form.notes.trim() || undefined,
        categoryId: form.categoryId || undefined,
      },
      {
        onSuccess: () => navigation.navigate('MainTabs'),
        onError: () => setError('Failed to save. Please try again.'),
      }
    );
  }

  const parsedDate = new Date(`${form.date}T00:00:00`);
  const lowConfidence = sourceConfidence < 0.7;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Receipt</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Low confidence warning */}
        {lowConfidence && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={18} color={Colors.warning} />
            <Text style={styles.warningText}>
              Low confidence scan — please review all fields carefully.
            </Text>
          </View>
        )}

        {/* Type toggle */}
        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {(['expense', 'income'] as TransactionType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  form.type === type && {
                    backgroundColor: type === 'expense' ? Colors.danger : Colors.success,
                    borderColor: type === 'expense' ? Colors.danger : Colors.success,
                  },
                ]}
                onPress={() => set('type', type)}
              >
                <Text style={[styles.chipText, form.type === type && styles.chipTextActive]}>
                  {type === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={form.amount}
              onChangeText={(text) => set('amount', text)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              selectTextOnFocus
            />
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.inputButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.inputButtonText}>{form.date}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={parsedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, selected) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selected) {
                  set('date', selected.toISOString().slice(0, 10));
                }
              }}
            />
          )}
        </View>

        {/* Payee */}
        <View style={styles.section}>
          <Text style={styles.label}>Payee</Text>
          <TextInput
            style={styles.textInput}
            value={form.payee}
            onChangeText={(text) => set('payee', text)}
            placeholder="e.g. Starbucks"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Account */}
        {accounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Account</Text>
            <AccountPicker
              accounts={accounts}
              selected={form.accountId || accounts[0]?.teamId}
              onSelect={(teamId) => set('accountId', teamId)}
            />
          </View>
        )}

        {/* Category */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <CategoryPicker
              categories={categories}
              selected={form.categoryId}
              onSelect={(id) => set('categoryId', id)}
              showNone
            />
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={form.notes}
            onChangeText={(text) => set('notes', text)}
            placeholder="Optional notes"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Multiple items hint */}
        {items.length > 1 && (
          <View style={styles.multipleItemsHint}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.multipleItemsText}>
              {items.length} items detected — saving the primary transaction.
            </Text>
          </View>
        )}

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>{isPending ? 'Saving…' : 'Save Transaction'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navyBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 12,
  },
  warningText: {
    flex: 1,
    color: Colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 8,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
  },
  chipActive: {
    borderColor: Colors.brandBlue,
    backgroundColor: 'rgba(43, 126, 255, 0.15)',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  chipTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    color: Colors.textSecondary,
    fontSize: 20,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 14,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  textInput: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  multipleItemsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  multipleItemsText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
