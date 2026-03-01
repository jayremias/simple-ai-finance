import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { RootStackParamList } from '../types';
import { AppHeader } from '../components/common/AppHeader';
import { AIInsightCard } from '../components/receipt/AIInsightCard';
import { ReceiptPreview } from '../components/receipt/ReceiptPreview';

type ReceiptDetailRoute = RouteProp<RootStackParamList, 'ReceiptDetail'>;

export function ReceiptDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<ReceiptDetailRoute>();
  const insets = useSafeAreaInsets();
  const { receipt } = route.params;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Details" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ReceiptPreview uri={receipt.imageUri} />

        <View style={styles.detailsSection}>
          <DetailRow label="Category" value={`${receipt.category} (parsed from photo)`} />
          <DetailRow label="Amount" value={`$${receipt.amount.toFixed(2)}`} />
          <DetailRow label="Date" value={receipt.date} />
        </View>

        <View style={styles.insightSection}>
          <AIInsightCard message={receipt.insight.message} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => {
              Alert.alert('Entry Confirmed', 'Transaction has been saved!');
              navigation.goBack();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>Confirm Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Alert.alert('Edit Details', 'Edit form coming soon')}
            activeOpacity={0.85}
          >
            <Text style={styles.editText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={{ height: insets.bottom || 16 }} />
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.label}>{label}: </Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '400',
    flexShrink: 1,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navyBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  detailsSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  insightSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  confirmButton: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: Colors.brandPurple,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  editText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
