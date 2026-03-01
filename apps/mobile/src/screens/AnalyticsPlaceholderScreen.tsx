import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function AnalyticsPlaceholderScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Analytics</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('WeeklyAnalysis')}
      >
        <Text style={styles.buttonText}>View Weekly Analysis</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  button: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
