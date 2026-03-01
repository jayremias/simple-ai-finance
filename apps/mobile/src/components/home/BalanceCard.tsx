import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CHART_HEIGHT = 80;

// Generate a smooth sine-wave-like path for the balance chart
function buildLinePath(w: number, h: number) {
  const points = [
    [0, h * 0.75],
    [w * 0.15, h * 0.55],
    [w * 0.3, h * 0.65],
    [w * 0.45, h * 0.35],
    [w * 0.6, h * 0.45],
    [w * 0.72, h * 0.25],
    [w * 0.85, h * 0.35],
    [w, h * 0.1],
  ];

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cp1x = (points[i][0] + points[i + 1][0]) / 2;
    const cp1y = points[i][1];
    const cp2x = (points[i][0] + points[i + 1][0]) / 2;
    const cp2y = points[i + 1][1];
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${points[i + 1][0]} ${points[i + 1][1]}`;
  }
  return { d, points };
}

function buildAreaPath(linePath: string, w: number, h: number) {
  return `${linePath} L ${w} ${h} L 0 ${h} Z`;
}

interface BalanceCardProps {
  balance: number;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const { d: linePath } = buildLinePath(CARD_WIDTH, CHART_HEIGHT);
  const areaPath = buildAreaPath(linePath, CARD_WIDTH, CHART_HEIGHT);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.balance}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
      <View style={styles.chartContainer}>
        <Svg width={CARD_WIDTH} height={CHART_HEIGHT} style={styles.chart}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4FC3F7" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#4FC3F7" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#areaGrad)" />
          <Path d={linePath} fill="none" stroke="#4FC3F7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 0,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  balance: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  chartContainer: {
    marginHorizontal: -20,
  },
  chart: {
    alignSelf: 'flex-start',
  },
});
