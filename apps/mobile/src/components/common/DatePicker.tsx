import { Ionicons } from '@expo/vector-icons';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const date = parseISO(value);
  const label = format(date, 'MMM d, yyyy');

  function handleChange(_event: unknown, selected?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (selected) {
      onChange(format(selected, 'yyyy-MM-dd'));
    }
  }

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={() => setOpen((prev) => !prev)}>
        <Ionicons
          name={'calendar-outline' as IoniconsName}
          size={16}
          color={Colors.textSecondary}
        />
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>

      {open && (
        <RNDateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          themeVariant="dark"
          style={styles.picker}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  picker: {
    marginTop: 8,
  },
});
