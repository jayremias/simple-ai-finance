import { Ionicons } from '@expo/vector-icons';
import type { TagResponse } from '@moneylens/shared';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';

interface TagPickerProps {
  allTags: TagResponse[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreateAndAdd: (name: string) => Promise<void>;
}

export function TagPicker({ allTags, selectedIds, onToggle, onCreateAndAdd }: TagPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const trimmed = query.trim();
  const filtered = trimmed
    ? allTags.filter((tag) => tag.name.toLowerCase().includes(trimmed.toLowerCase()))
    : [];
  const exactMatch = allTags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
  const selected = allTags.filter((tag) => selectedIds.includes(tag.id));

  function handleCreate() {
    if (!trimmed) return;
    onCreateAndAdd(trimmed);
    setQuery('');
  }

  return (
    <View>
      {selected.length > 0 && (
        <View style={styles.chipRow}>
          {selected.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={styles.selectedChip}
              onPress={() => onToggle(tag.id)}
            >
              <Text style={styles.selectedChipText}>{tag.name}</Text>
              <Ionicons name="close" size={12} color={Colors.textPrimary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <Ionicons
          name="pricetag-outline"
          size={14}
          color={Colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search or add tags…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!exactMatch && trimmed) handleCreate();
            else setQuery('');
          }}
        />
        {trimmed.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {trimmed.length > 0 && (
        <View style={styles.suggestions}>
          {filtered.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={[styles.suggestion, selectedIds.includes(tag.id) && styles.suggestionActive]}
              onPress={() => {
                onToggle(tag.id);
                setQuery('');
              }}
            >
              {selectedIds.includes(tag.id) && (
                <Ionicons name="checkmark" size={13} color={Colors.brandBlue} />
              )}
              <Text
                style={[
                  styles.suggestionText,
                  selectedIds.includes(tag.id) && styles.suggestionTextActive,
                ]}
              >
                {tag.name}
              </Text>
            </TouchableOpacity>
          ))}
          {!exactMatch && (
            <TouchableOpacity style={styles.createRow} onPress={handleCreate}>
              <Ionicons name="add-circle-outline" size={15} color={Colors.brandBlue} />
              <Text style={styles.createText}>Create "{trimmed}"</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: Colors.brandBlue,
  },
  selectedChipText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: { marginRight: 2 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 14, padding: 0 },
  suggestions: {
    marginTop: 4,
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionActive: { backgroundColor: `${Colors.brandBlue}14` },
  suggestionText: { color: Colors.textSecondary, fontSize: 14 },
  suggestionTextActive: { color: Colors.brandBlue, fontWeight: '500' },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  createText: { color: Colors.brandBlue, fontSize: 14 },
});
