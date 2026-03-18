import { Ionicons } from '@expo/vector-icons';
import type { TransactionResponse } from '@moneylens/shared';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';

interface TransactionItemProps {
  transaction: TransactionResponse;
  onPress?: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_ICON: Record<string, IoniconsName> = {
  income: 'arrow-up-circle',
  expense: 'arrow-down-circle',
  transfer: 'swap-horizontal',
};

const TYPE_COLOR: Record<string, string> = {
  income: Colors.success,
  expense: Colors.danger,
  transfer: Colors.brandBlue,
};

/** Converts a signed cent amount to a display string: +$12.50 / -$12.50 */
function formatAmount(cents: number, currency = 'USD'): string {
  const abs = Math.abs(cents) / 100;
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === 'BRL' ? 'R$' : '$';
  return cents >= 0 ? `+${symbol}${formatted}` : `-${symbol}${formatted}`;
}

/** Formats YYYY-MM-DD to e.g. "Jan 15, 2024" */
function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const color = TYPE_COLOR[transaction.type] ?? Colors.brandBlue;
  const icon = TYPE_ICON[transaction.type] ?? 'ellipse-outline';
  const label = transaction.payee ?? transaction.type;

  const content = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>
      <Text style={[styles.amount, transaction.amount >= 0 ? styles.positive : styles.negative]}>
        {formatAmount(transaction.amount)}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.itemBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  date: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  positive: {
    color: Colors.success,
  },
  negative: {
    color: Colors.textPrimary,
  },
});
