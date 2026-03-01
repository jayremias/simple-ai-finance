import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@/theme/colors';
import { mockWeeklyData, mockTransactions } from '../utils/mockData';
import { WeeklyData } from '../types';
import { AppHeader } from '../components/common/AppHeader';
import { WeeklyBarChart } from '../components/charts/WeeklyBarChart';
import { TransactionItem } from '../components/common/TransactionItem';
import { PeriodToggle } from '../components/analysis/PeriodToggle';
import { CategoryFilter } from '../components/analysis/CategoryFilter';

type Period = 'Day' | 'Week' | 'Month';

export function WeeklyAnalysisScreen() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState<Period>('Week');
  const [chartData, setChartData] = useState(mockWeeklyData);

  const handleBarPress = (item: WeeklyData, index: number) => {
    setChartData((prev) =>
      prev.map((d, i) => ({ ...d, isActive: i === index }))
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <AppHeader
        title="Weekly Expense Analysis"
        onBack={() => navigation.goBack()}
        rightIcons={
          <View style={styles.headerIcons}>
            <TouchableOpacity>
              <Ionicons name="download-outline" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="calendar-outline" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chartSection}>
          <WeeklyBarChart data={chartData} onBarPress={handleBarPress} />
        </View>

        <View style={styles.filterRow}>
          <CategoryFilter selected="Expenses" onPress={() => {}} />
          <PeriodToggle selected={period} onChange={setPeriod} />
        </View>

        <View style={styles.transactionsSection}>
          <Text style={styles.monthLabel}>June</Text>
          {mockTransactions.map((t) => (
            <TransactionItem key={t.id} transaction={t} showPaymentMethod />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  transactionsSection: {
    paddingHorizontal: 20,
  },
  monthLabel: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
    width: 'auto',
  },
});
