import { Colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface AIActionButtonProps {
  label: string;
  icon: IoniconsName;
  gradientColors: string[];
  onPress: () => void;
}

function AIActionButton({ label, icon, gradientColors, onPress }: AIActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: gradientColors[0] }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={22} color={Colors.textPrimary} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

interface FeedAISectionProps {
  onScanReceipt: () => void;
  onUploadFile: () => void;
  onVoiceEntry: () => void;
  onManualEntry: () => void;
}

export function FeedAISection({
  onScanReceipt,
  onUploadFile,
  onVoiceEntry,
  onManualEntry,
}: FeedAISectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Feed your AI</Text>
      <View style={styles.grid}>
        <AIActionButton
          label="Scan Receipt"
          icon="camera-outline"
          gradientColors={[Colors.brandBlue, '#1A5FCC']}
          onPress={onScanReceipt}
        />
        <AIActionButton
          label="Upload File"
          icon="document-outline"
          gradientColors={[Colors.brandPurple, '#5B1F8E']}
          onPress={onUploadFile}
        />
        <AIActionButton
          label="Voice Entry"
          icon="mic-outline"
          gradientColors={[Colors.brandTeal, Colors.brandTealDark]}
          onPress={onVoiceEntry}
        />
        <AIActionButton
          label="Manual Entry"
          icon="add-outline"
          gradientColors={[Colors.surfaceBg, Colors.surfaceLight]}
          onPress={onManualEntry}
        />
      </View>
      <Text style={styles.subtitle}>Feeding your financial knowledge...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    width: '47%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
