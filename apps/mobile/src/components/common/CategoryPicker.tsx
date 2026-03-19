import { Ionicons } from '@expo/vector-icons';
import type { CategoryTreeResponse } from '@moneylens/shared';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Hierarchical category chip picker.
 *
 * - Tapping a parent expands its children and selects the parent.
 * - Tapping the same parent again collapses and clears selection.
 * - Tapping a child selects that subcategory; tapping again reverts to parent.
 * - Pass `showNone` to render a "None" chip that clears selection.
 */
export function CategoryPicker({
  categories,
  selected,
  onSelect,
  showNone = false,
}: {
  categories: CategoryTreeResponse[];
  selected: string;
  onSelect: (id: string) => void;
  showNone?: boolean;
}) {
  const [expandedParentId, setExpandedParentId] = useState<string>('');

  const selectedParent = categories.find(
    (c) => c.id === selected || c.children.some((ch) => ch.id === selected)
  );
  const expandedCat = categories.find((c) => c.id === expandedParentId);

  function handleParentPress(cat: CategoryTreeResponse) {
    if (expandedParentId === cat.id) {
      setExpandedParentId('');
      onSelect('');
    } else {
      setExpandedParentId(cat.id);
      onSelect(cat.id);
    }
  }

  function handleChildPress(childId: string) {
    onSelect(selected === childId ? expandedParentId : childId);
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {showNone && (
            <TouchableOpacity
              style={[styles.chip, !selected && styles.chipActive]}
              onPress={() => {
                setExpandedParentId('');
                onSelect('');
              }}
            >
              <Text style={[styles.chipText, !selected && styles.chipTextActive]}>None</Text>
            </TouchableOpacity>
          )}

          {categories.map((cat) => {
            const isActive = selectedParent?.id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  isActive && {
                    backgroundColor: cat.color ?? Colors.brandBlue,
                    borderColor: cat.color ?? Colors.brandBlue,
                  },
                ]}
                onPress={() => handleParentPress(cat)}
              >
                <Ionicons
                  name={(cat.icon ?? 'ellipse-outline') as IoniconsName}
                  size={14}
                  color={isActive ? Colors.textPrimary : Colors.textSecondary}
                />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {expandedCat && expandedCat.children.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subRow}>
          <View style={styles.chipRow}>
            {expandedCat.children.map((child) => {
              const isActive = selected === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    styles.subChip,
                    isActive && {
                      backgroundColor: expandedCat.color ?? Colors.brandBlue,
                      borderColor: expandedCat.color ?? Colors.brandBlue,
                    },
                  ]}
                  onPress={() => handleChildPress(child.id)}
                >
                  <Ionicons
                    name={(child.icon ?? 'ellipse-outline') as IoniconsName}
                    size={12}
                    color={isActive ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text style={[styles.subChipText, isActive && styles.chipTextActive]}>
                    {child.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  subRow: { marginTop: 8 },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceBg,
  },
  subChipText: { color: Colors.textSecondary, fontSize: 12 },
});
