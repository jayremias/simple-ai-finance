import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface AIActionButtonProps {
  label: string;
  icon: string;
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
      <Text style={styles.actionIcon}>{icon}</Text>
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

export function FeedAISection({ onScanReceipt, onUploadFile, onVoiceEntry, onManualEntry }: FeedAISectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Feed your AI</Text>
      <View style={styles.grid}>
        <AIActionButton
          label="Scan Receipt"
          icon="📷"
          gradientColors={[Colors.brandBlue, '#1A5FCC']}
          onPress={onScanReceipt}
        />
        <AIActionButton
          label="Upload File"
          icon="📄"
          gradientColors={[Colors.brandPurple, '#5B1F8E']}
          onPress={onUploadFile}
        />
        <AIActionButton
          label="Voice Entry"
          icon="🎤"
          gradientColors={[Colors.brandTeal, Colors.brandTealDark]}
          onPress={onVoiceEntry}
        />
        <AIActionButton
          label="Manual Entry"
          icon="+"
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
