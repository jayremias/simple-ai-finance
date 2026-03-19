import { Ionicons } from '@expo/vector-icons';
import type { TransactionResponse } from '@moneylens/shared';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

export function TransactionListScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const { data: accountsData } = useAccounts();
  const accounts = accountsData ?? [];

  const [selectedType, setSelectedType] = useState<TxType | ''>(route.params?.type ?? '');
  const [selectedAccountId, setSelectedAccountId] = useState(route.params?.accountId ?? '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <TextInput
              style={styles.dateInput}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.dateSeparator} />
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <TextInput
              style={styles.dateInput}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          {(dateFrom || dateTo) && (
            <TouchableOpacity
              onPress={() => {
                setDateFrom('');
                setDateTo('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearDate}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
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
  dateField: { flex: 1 },
  dateLabel: { color: Colors.textMuted, fontSize: 11, marginBottom: 4 },
  dateInput: {
    backgroundColor: Colors.surfaceBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateSeparator: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginTop: 16,
  },
  clearDate: { marginTop: 16 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptySubtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  footer: { paddingVertical: 16, alignItems: 'center' },
});
