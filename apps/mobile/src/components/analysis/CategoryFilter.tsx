import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface CategoryFilterProps {
  selected: string;
  onPress: () => void;
}

export function CategoryFilter({ selected, onPress }: CategoryFilterProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.label}>{selected}</Text>
      <Text style={styles.chevron}>⌄</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 18,
  },
});
