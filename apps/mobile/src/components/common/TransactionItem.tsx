import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction } from '../../types';
import { Colors } from '@/theme/colors';

interface TransactionItemProps {
  transaction: Transaction;
  showPaymentMethod?: boolean;
}

const APP_ICONS: Record<string, { symbol: string; color: string }> = {
  Figma: { symbol: '✦', color: '#FF7262' },
  Sketch: { symbol: '◆', color: '#FDB300' },
  Slack: { symbol: '#', color: '#E01E5A' },
  'Adobe Creative Cloud': { symbol: 'Cc', color: '#FF0000' },
};

export function TransactionItem({ transaction, showPaymentMethod = false }: TransactionItemProps) {
  const icon = APP_ICONS[transaction.name] ?? { symbol: '★', color: Colors.brandBlue };
  const amountStr =
    transaction.amount < 0
      ? `-$${Math.abs(transaction.amount).toFixed(0)}`
      : `+$${transaction.amount.toFixed(0)}`;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: transaction.iconBg || icon.color + '33' }]}>
        <Text style={[styles.iconText, { color: icon.color }]}>{icon.symbol}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{transaction.name}</Text>
        <Text style={styles.date}>{transaction.date}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, transaction.amount < 0 ? styles.negative : styles.positive]}>
          {amountStr}
        </Text>
        {showPaymentMethod && transaction.paymentMethod ? (
          <Text style={styles.paymentMethod}>{transaction.paymentMethod}</Text>
        ) : null}
      </View>
    </View>
  );
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
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
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
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  negative: {
    color: Colors.textPrimary,
  },
  positive: {
    color: Colors.success,
  },
  paymentMethod: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
