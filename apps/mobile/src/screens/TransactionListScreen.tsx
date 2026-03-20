import { Ionicons } from '@expo/vector-icons';
import type { TransactionResponse } from '@moneylens/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionEditSheet } from '@/components/common/TransactionEditSheet';
import { TransactionItem } from '@/components/common/TransactionItem';
import { useAccounts } from '@/hooks/useAccounts';
import { useInfiniteTransactions } from '@/hooks/useTransactions';
import { Colors } from '@/theme/colors';
import type { RootStackParamList } from '@/types';

type TxType = 'income' | 'expense' | 'transfer';
type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'TransactionList'>;

const TYPE_FILTERS: { value: TxType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfers' },
];

const TYPE_COLOR: Record<TxType, string> = {
  expense: Colors.danger,
  income: Colors.success,
  transfer: Colors.brandBlue,
};

function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function displayDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type DatePickerTarget = 'from' | 'to' | null;

export function TransactionListScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const { data: accountsData } = useAccounts();
  const accounts = accountsData ?? [];

  const [selectedType, setSelectedType] = useState<TxType | ''>(route.params?.type ?? '');
  const [selectedAccountId, setSelectedAccountId] = useState(route.params?.accountId ?? '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pickerTarget, setPickerTarget] = useState<DatePickerTarget>(null);
  const [editTransaction, setEditTransaction] = useState<TransactionResponse | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteTransactions({
      type: selectedType || undefined,
      accountId: selectedAccountId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });

  const transactions = data?.pages.flatMap((p) => p.data) ?? [];

  function handleLoadMore() {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }

  function handleDateChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setPickerTarget(null);
    if (!selected || !pickerTarget) return;
    const iso = toISO(selected);
    if (pickerTarget === 'from') setDateFrom(iso);
    else setDateTo(iso);
  }

  const pickerValue = (() => {
    if (pickerTarget === 'from' && dateFrom) {
      const [y, m, d] = dateFrom.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (pickerTarget === 'to' && dateTo) {
      const [y, m, d] = dateTo.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  })();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {/* Type filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {TYPE_FILTERS.map((f) => {
            const isActive = selectedType === f.value;
            const accentColor = f.value ? TYPE_COLOR[f.value] : Colors.brandBlue;
            return (
              <TouchableOpacity
                key={f.value}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
                onPress={() => setSelectedType(isActive ? '' : f.value)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Account filter */}
        {accounts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedAccountId === '' && styles.filterChipAccountActive,
              ]}
              onPress={() => setSelectedAccountId('')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedAccountId === '' && styles.filterChipTextActive,
                ]}
              >
                All accounts
              </Text>
            </TouchableOpacity>
            {accounts.map((a) => {
              const isActive = selectedAccountId === a.teamId;
              return (
                <TouchableOpacity
                  key={a.teamId}
                  style={[
                    styles.filterChip,
                    isActive && {
                      backgroundColor: a.color ?? Colors.brandBlue,
                      borderColor: a.color ?? Colors.brandBlue,
                    },
                  ]}
                  onPress={() => setSelectedAccountId(isActive ? '' : a.teamId)}
                >
                  {a.color && <View style={[styles.dot, { backgroundColor: a.color }]} />}
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Date range */}
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.datePicker, dateFrom ? styles.datePickerActive : null]}
            onPress={() => setPickerTarget(pickerTarget === 'from' ? null : 'from')}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={dateFrom ? Colors.brandBlue : Colors.textMuted}
            />
            <Text style={[styles.datePickerText, dateFrom && styles.datePickerTextActive]}>
              {dateFrom ? displayDate(dateFrom) : 'From'}
            </Text>
          </TouchableOpacity>

          <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />

          <TouchableOpacity
            style={[styles.datePicker, dateTo ? styles.datePickerActive : null]}
            onPress={() => setPickerTarget(pickerTarget === 'to' ? null : 'to')}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={dateTo ? Colors.brandBlue : Colors.textMuted}
            />
            <Text style={[styles.datePickerText, dateTo && styles.datePickerTextActive]}>
              {dateTo ? displayDate(dateTo) : 'To'}
            </Text>
          </TouchableOpacity>

          {(dateFrom || dateTo) && (
            <TouchableOpacity
              onPress={() => {
                setDateFrom('');
                setDateTo('');
                setPickerTarget(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Native date picker — inline on iOS, dialog on Android */}
        {pickerTarget !== null && (
          <View style={Platform.OS === 'ios' ? styles.iosPickerWrap : undefined}>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDateChange}
              maximumDate={
                pickerTarget === 'from' && dateTo
                  ? (() => {
                      const [y, m, d] = dateTo.split('-').map(Number);
                      return new Date(y, m - 1, d);
                    })()
                  : undefined
              }
              minimumDate={
                pickerTarget === 'to' && dateFrom
                  ? (() => {
                      const [y, m, d] = dateFrom.split('-').map(Number);
                      return new Date(y, m - 1, d);
                    })()
                  : undefined
              }
              accentColor={Colors.brandBlue}
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.iosDone} onPress={() => setPickerTarget(null)}>
                <Text style={styles.iosDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        renderItem={({ item }) => (
          <TransactionItem transaction={item} onPress={() => setEditTransaction(item)} />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.brandBlue} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptySubtitle}>Try adjusting the filters above</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={Colors.brandBlue} size="small" />
            </View>
          ) : null
        }
      />

      <TransactionEditSheet
        transaction={editTransaction}
        onClose={() => setEditTransaction(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navyBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  headerRight: { width: 24 },
  filters: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
    gap: 10,
  },
  filterRow: { paddingHorizontal: 20, flexDirection: 'row', gap: 8 },
  filterChip: {
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
  filterChipAccountActive: {
    backgroundColor: Colors.brandBlue,
    borderColor: Colors.brandBlue,
  },
  filterChipText: { color: Colors.textSecondary, fontSize: 13 },
  filterChipTextActive: { color: Colors.textPrimary, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  datePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
  },
  datePickerActive: {
    borderColor: Colors.brandBlue,
    backgroundColor: `${Colors.brandBlue}18`,
  },
  datePickerText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  datePickerTextActive: { color: Colors.brandBlue, fontWeight: '500' },
  iosPickerWrap: {
    marginHorizontal: 20,
    backgroundColor: Colors.surfaceBg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iosDone: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  iosDoneText: { color: Colors.brandBlue, fontSize: 15, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  footer: { paddingVertical: 16, alignItems: 'center' },
});
