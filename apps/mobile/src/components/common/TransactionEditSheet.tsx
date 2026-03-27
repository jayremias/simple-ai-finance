import type { TransactionResponse } from '@moneylens/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTag, useTags } from '@/hooks/useTags';
import { useDeleteTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { Colors } from '@/theme/colors';
import { CategoryPicker } from './CategoryPicker';
import { PayeePicker } from './PayeePicker';
import { TagPicker } from './TagPicker';

type TxType = 'expense' | 'income' | 'transfer';

const TYPE_COLOR: Record<TxType, string> = {
  expense: Colors.danger,
  income: Colors.success,
  transfer: Colors.brandBlue,
};

const TYPE_LABELS: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

type EditFormState = {
  amount: string;
  categoryId: string;
  date: string;
  payee: string;
  notes: string;
  tagIds: string[];
};

interface TransactionEditSheetProps {
  transaction: TransactionResponse | null;
  onClose: () => void;
}

export function TransactionEditSheet({ transaction, onClose }: TransactionEditSheetProps) {
  const { data: categories = [] } = useCategories();
  const { data: allTags = [] } = useTags();
  const { mutateAsync: createTagMutation } = useCreateTag();
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTransaction, isPending: isDeleting } = useDeleteTransaction();

  const isPending = isUpdating || isDeleting;

  const [form, setForm] = useState<EditFormState>({
    amount: '',
    categoryId: '',
    date: '',
    payee: '',
    notes: '',
    tagIds: [],
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
      tagIds: transaction.tags.map((tag) => tag.id),
    });
    setError(null);
    setIsReady(true);
  }, [transaction]);

  function handleClose() {
    setError(null);
    onClose();
  }

  function set<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((formState) => ({ ...formState, [key]: value }));
  }

  function handleSave() {
    const amountNum = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('Date must be YYYY-MM-DD.');
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
          tagIds: form.tagIds,
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
    ? (TYPE_LABELS.find((label) => label.value === transaction.type)?.label ?? transaction.type)
    : '';

  return (
    <Modal
      visible={transaction !== null}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: `${accentColor}22` }]}>
            <Text style={[styles.typeBadgeText, { color: accentColor }]}>{typeLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>

        {!isReady ? (
          <View style={styles.skeleton}>
            <View style={styles.skeletonAmount} />
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonField} />
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonField} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              style={[styles.amountInput, { color: accentColor }]}
              value={form.amount}
              onChangeText={(value) => set('amount', value)}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            {transaction?.type !== 'transfer' && (
              <>
                <Text style={styles.label}>Category (optional)</Text>
                <CategoryPicker
                  categories={categories}
                  selected={form.categoryId}
                  onSelect={(id) => set('categoryId', id)}
                />
              </>
            )}

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(value) => set('date', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Payee (optional)</Text>
            <PayeePicker value={form.payee} onChange={(value) => set('payee', value)} />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={form.notes}
              onChangeText={(value) => set('notes', value)}
              placeholder="Add a note…"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <Text style={styles.label}>Tags (optional)</Text>
            <TagPicker
              allTags={allTags}
              selectedIds={form.tagIds}
              onToggle={(id) =>
                set(
                  'tagIds',
                  form.tagIds.includes(id)
                    ? form.tagIds.filter((tagId) => tagId !== id)
                    : [...form.tagIds, id]
                )
              }
              onCreateAndAdd={async (name) => {
                const tag = await createTagMutation(name);
                set('tagIds', [...form.tagIds, tag.id]);
              }}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: accentColor },
                isPending && styles.submitBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isPending}
            >
              {isUpdating ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <Text style={styles.submitText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  typeBadgeText: { fontSize: 13, fontWeight: '600' },
  deleteLink: { color: Colors.danger, fontSize: 14, fontWeight: '500' },
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
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  skeleton: { paddingTop: 8, gap: 12 },
  skeletonAmount: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.surfaceBg,
    marginBottom: 8,
  },
  skeletonLabel: { height: 12, width: 80, borderRadius: 6, backgroundColor: Colors.surfaceBg },
  skeletonField: { height: 44, borderRadius: 12, backgroundColor: Colors.surfaceBg },
});
