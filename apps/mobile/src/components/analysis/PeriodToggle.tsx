import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';

type Period = 'Day' | 'Week' | 'Month';

interface PeriodToggleProps {
  selected: Period;
  onChange: (p: Period) => void;
}

export function PeriodToggle({ selected, onChange }: PeriodToggleProps) {
  const periods: Period[] = ['Day', 'Week', 'Month'];
  return (
    <View style={styles.container}>
      {periods.map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.tab, selected === p && styles.activeTab]}
          onPress={() => onChange(p)}
        >
          <Text style={[styles.tabText, selected === p && styles.activeTabText]}>{p}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceBg,
    borderRadius: 24,
    padding: 4,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: Colors.surfaceLight,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});
