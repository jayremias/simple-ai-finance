import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';
import { usePayees } from '@/hooks/useTransactions';

export function PayeePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: suggestions = [] } = usePayees(value);
  const showSuggestions = value.trim().length > 0 && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Payee name"
        placeholderTextColor={Colors.textMuted}
        autoCorrect={false}
      />
      {showSuggestions && (
        <View style={styles.dropdown}>
          {suggestions.map((payee) => (
            <TouchableOpacity key={payee} style={styles.item} onPress={() => onChange(payee)}>
              <Text style={styles.itemText}>{payee}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 10 },
  input: {
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemText: { color: Colors.textPrimary, fontSize: 15 },
});
