import { Colors } from '@/theme/colors';
import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');

interface ReceiptPreviewProps {
  uri: string;
}

export function ReceiptPreview({ uri }: ReceiptPreviewProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    height: 260,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
