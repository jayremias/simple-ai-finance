import { Ionicons } from '@expo/vector-icons';
import type { RecurringRuleResponse } from '@moneylens/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { CategoryPicker } from '../components/common/CategoryPicker';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import {
  useCreateRecurringRule,
  useDeleteRecurringRule,
  usePauseRecurringRule,
  useRecurringRules,
  useResumeRecurringRule,
  useUpdateRecurringRule,
} from '../hooks/useRecurring';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RuleType = 'expense' | 'income';
type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const TYPE_COLOR: Record<RuleType, string> = {
  expense: Colors.danger,
  income: Colors.success,
};

type FormState = {
  name: string;
  type: RuleType;
  amount: string;
  accountId: string;
  categoryId: string;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  payee: string;
  notes: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatAmount(cents: number, type: RuleType) {
  const abs = Math.abs(cents) / 100;
  const sign = type === 'expense' ? '-' : '+';
  return `${sign}$${abs.toFixed(2)}`;
}

function frequencyLabel(f: Frequency) {
  return FREQUENCIES.find((fr) => fr.value === f)?.label ?? f;
}

// ---------------------------------------------------------------------------
// Rule form sheet (create + edit)
// ---------------------------------------------------------------------------

function RuleFormSheet({
  rule,
  visible,
  onClose,
}: {
  rule: RecurringRuleResponse | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { data: accountsData } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { mutate: createRule, isPending: isCreating } = useCreateRecurringRule();
  const { mutate: updateRule, isPending: isUpdating } = useUpdateRecurringRule();

  const accounts = accountsData ?? [];
  const isPending = isCreating || isUpdating;
  const isEdit = rule !== null;

  const defaultForm = (): FormState => ({
    name: '',
    type: 'expense',
    amount: '',
    accountId: accounts[0]?.teamId ?? '',
    categoryId: '',
    frequency: 'monthly',
    startDate: todayISO(),
    endDate: '',
    payee: '',
    notes: '',
  });

  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'startDate' | 'endDate' | null>(null);

  function toISO(date: Date) {
    return format(date, 'yyyy-MM-dd');
  }

  function handleDateChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setPickerTarget(null);
    if (!selected || !pickerTarget) return;
    set(pickerTarget, toISO(selected));
  }

  function dateLabel(iso: string, placeholder: string) {
    return iso ? format(new Date(`${iso}T12:00:00`), 'MMM d, yyyy') : placeholder;
  }

  useEffect(() => {
    if (!visible) return;
    if (rule) {
      setForm({
        name: rule.name,
        type: rule.type,
        amount: String(Math.abs(rule.amount) / 100),
        accountId: rule.accountId,
        categoryId: rule.categoryId ?? '',
        frequency: rule.frequency,
        startDate: rule.startDate,
        endDate: rule.endDate ?? '',
        payee: rule.payee ?? '',
        notes: rule.notes ?? '',
      });
    } else {
      setForm({
        name: '',
        type: 'expense',
        amount: '',
        accountId: accounts[0]?.teamId ?? '',
        categoryId: '',
        frequency: 'monthly',
        startDate: todayISO(),
        endDate: '',
        payee: '',
        notes: '',
      });
    }
    setError(null);
  }, [visible, rule, accounts]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    const amountNum = parseFloat(form.amount);
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!form.accountId) {
      setError('Select an account.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) {
      setError('Start date must be YYYY-MM-DD.');
      return;
    }
    if (form.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) {
      setError('End date must be YYYY-MM-DD.');
      return;
    }
    setError(null);

    const amountCents = Math.round(amountNum * 100);

    if (isEdit && rule) {
      updateRule(
        {
          id: rule.id,
          data: {
            name: form.name.trim(),
            amount: amountCents,
            categoryId: form.categoryId || null,
            frequency: form.frequency,
            endDate: form.endDate || null,
            payee: form.payee.trim() || null,
            notes: form.notes.trim() || null,
          },
        },
        { onSuccess: onClose, onError: () => setError('Failed to save. Please try again.') }
      );
    } else {
      createRule(
        {
          name: form.name.trim(),
          type: form.type,
          amount: amountCents,
          accountId: form.accountId,
          categoryId: form.categoryId || undefined,
          frequency: form.frequency,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          payee: form.payee.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
        { onSuccess: onClose, onError: () => setError('Failed to save. Please try again.') }
      );
    }
  }

  const accentColor = TYPE_COLOR[form.type];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.sheetTitle}>{isEdit ? 'Edit Rule' : 'New Recurring Rule'}</Text>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder="e.g. Netflix"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Type toggle (create only) */}
          {!isEdit && (
            <>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {(['expense', 'income'] as RuleType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, form.type === t && { backgroundColor: TYPE_COLOR[t] }]}
                    onPress={() => set('type', t)}
                  >
                    <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Amount */}
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={[styles.input, { color: accentColor, fontSize: 24, fontWeight: '700' }]}
            value={form.amount}
            onChangeText={(v) => set('amount', v)}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Account (create only) */}
          {!isEdit && (
            <>
              <Text style={styles.label}>Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {accounts.map((a) => (
                    <TouchableOpacity
                      key={a.teamId}
                      style={[styles.chip, form.accountId === a.teamId && styles.chipActive]}
                      onPress={() => set('accountId', a.teamId)}
                    >
                      {a.color ? <View style={[styles.dot, { backgroundColor: a.color }]} /> : null}
                      <Text
                        style={[
                          styles.chipText,
                          form.accountId === a.teamId && styles.chipTextActive,
                        ]}
                      >
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Category */}
          {categories.length > 0 && (
            <>
              <Text style={styles.label}>Category (optional)</Text>
              <CategoryPicker
                categories={categories}
                selected={form.categoryId}
                onSelect={(id) => set('categoryId', id)}
                showNone
              />
            </>
          )}

          {/* Frequency */}
          <Text style={styles.label}>Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {FREQUENCIES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, form.frequency === value && styles.chipActive]}
                  onPress={() => set('frequency', value)}
                >
                  <Text
                    style={[styles.chipText, form.frequency === value && styles.chipTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Start date (create only) */}
          {!isEdit && (
            <>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerTarget('startDate')}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
                <Text style={form.startDate ? styles.dateBtnText : styles.datePlaceholder}>
                  {dateLabel(form.startDate, 'Select start date')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* End date */}
          <Text style={styles.label}>End Date (optional)</Text>
          <View style={styles.dateBtnRow}>
            <TouchableOpacity
              style={[styles.dateBtn, { flex: 1 }]}
              onPress={() => setPickerTarget('endDate')}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
              <Text style={form.endDate ? styles.dateBtnText : styles.datePlaceholder}>
                {dateLabel(form.endDate, 'No end date')}
              </Text>
            </TouchableOpacity>
            {form.endDate ? (
              <TouchableOpacity
                onPress={() => set('endDate', '')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Date picker */}
          {pickerTarget !== null && (
            <>
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setPickerTarget(null)} style={styles.pickerDone}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
              <DateTimePicker
                value={
                  pickerTarget === 'startDate' && form.startDate
                    ? new Date(`${form.startDate}T12:00:00`)
                    : pickerTarget === 'endDate' && form.endDate
                      ? new Date(`${form.endDate}T12:00:00`)
                      : new Date()
                }
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleDateChange}
                minimumDate={
                  pickerTarget === 'endDate' && form.startDate
                    ? new Date(`${form.startDate}T12:00:00`)
                    : undefined
                }
              />
            </>
          )}

          {/* Payee */}
          <Text style={styles.label}>Payee (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.payee}
            onChangeText={(v) => set('payee', v)}
            placeholder="e.g. Netflix"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder="Add a note…"
            placeholderTextColor={Colors.textMuted}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: accentColor },
              isPending && styles.disabled,
            ]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Create Rule'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Rule card
// ---------------------------------------------------------------------------

function RuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: RecurringRuleResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { mutate: pause, isPending: isPausing } = usePauseRecurringRule();
  const { mutate: resume, isPending: isResuming } = useResumeRecurringRule();
  const toggling = isPausing || isResuming;

  function handleToggle() {
    if (rule.isActive) pause(rule.id);
    else resume(rule.id);
  }

  const color = TYPE_COLOR[rule.type];

  return (
    <TouchableOpacity style={cardStyles.card} activeOpacity={0.8} onPress={onEdit}>
      {/* Left accent bar */}
      <View style={[cardStyles.accent, { backgroundColor: color }]} />

      <View style={cardStyles.body}>
        <View style={cardStyles.row}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {rule.name}
          </Text>
          <Text style={[cardStyles.amount, { color }]}>{formatAmount(rule.amount, rule.type)}</Text>
        </View>

        <View style={cardStyles.row}>
          <Text style={cardStyles.meta}>
            {frequencyLabel(rule.frequency)} · Next {rule.nextDueDate}
          </Text>
          {rule.payee ? (
            <Text style={cardStyles.payee} numberOfLines={1}>
              {rule.payee}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={cardStyles.actions}>
        {toggling ? (
          <ActivityIndicator size="small" color={Colors.textMuted} />
        ) : (
          <Switch
            value={rule.isActive}
            onValueChange={handleToggle}
            thumbColor={rule.isActive ? Colors.brandBlue : Colors.textMuted}
            trackColor={{ false: Colors.border, true: `${Colors.brandBlue}55` }}
          />
        )}
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={cardStyles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function RecurringScreen() {
  const { data, isLoading, refetch } = useRecurringRules();
  const { mutate: deleteRule } = useDeleteRecurringRule();

  const [formVisible, setFormVisible] = useState(false);
  const [editRule, setEditRule] = useState<RecurringRuleResponse | null>(null);

  const rules = data?.data ?? [];

  function openCreate() {
    setEditRule(null);
    setFormVisible(true);
  }

  function openEdit(rule: RecurringRuleResponse) {
    setEditRule(rule);
    setFormVisible(true);
  }

  function handleDelete(rule: RecurringRuleResponse) {
    Alert.alert('Delete Rule', `Delete "${rule.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRule(rule.id),
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recurring</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brandBlue} size="large" />
        </View>
      ) : rules.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="repeat-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No recurring rules</Text>
          <Text style={styles.emptySubtitle}>
            Add rules for bills, subscriptions, and regular income
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
            <Text style={styles.emptyBtnText}>Create First Rule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RuleCard
              rule={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
        />
      )}

      <RuleFormSheet visible={formVisible} rule={editRule} onClose={() => setFormVisible(false)} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navyBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.brandBlue,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyBtnText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  // Sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
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
  typeRow: { flexDirection: 'row', gap: 8 },
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBtnText: { color: Colors.textPrimary, fontSize: 15, flex: 1 },
  datePlaceholder: { color: Colors.textMuted, fontSize: 15, flex: 1 },
  pickerDone: { alignItems: 'flex-end', marginTop: 8 },
  pickerDoneText: { color: Colors.brandBlue, fontSize: 15, fontWeight: '600' },
  error: { color: Colors.danger, fontSize: 13, marginTop: 12 },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabled: { opacity: 0.6 },
  submitText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  accent: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  amount: { fontSize: 15, fontWeight: '700' },
  meta: { color: Colors.textMuted, fontSize: 12, flex: 1 },
  payee: { color: Colors.textSecondary, fontSize: 12, maxWidth: 100 },
  actions: { paddingRight: 12, alignItems: 'center', gap: 8 },
  deleteBtn: { padding: 4 },
});
