import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { WeeklyData } from '../../types';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 180;
const BAR_WIDTH = 36;

interface WeeklyBarChartProps {
  data: WeeklyData[];
  onBarPress?: (item: WeeklyData, index: number) => void;
}

export function WeeklyBarChart({ data, onBarPress }: WeeklyBarChartProps) {
  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <View style={styles.container}>
      {/* Active bar tooltip */}
      {data.map((item, index) =>
        item.isActive ? (
          <View
            key={`tooltip-${index}`}
            style={[
              styles.tooltip,
              {
                left: (index / data.length) * (width - 40) + (width - 40) / data.length / 2 - 36,
              },
            ]}
          >
            <Text style={styles.tooltipText}>${item.amount.toLocaleString()}</Text>
          </View>
        ) : null
      )}

      <View style={styles.barsRow}>
        {data.map((item, index) => {
          const barHeight = (item.amount / maxAmount) * CHART_HEIGHT;
          return (
            <TouchableOpacity
              key={index}
              style={styles.barWrapper}
              onPress={() => onBarPress?.(item, index)}
              activeOpacity={0.8}
            >
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.isActive ? Colors.chartBarActive : Colors.chartBarInactive,
                      opacity: item.isActive ? 1 : 0.7,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, item.isActive && styles.activeDayLabel]}>
                {item.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 44,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    backgroundColor: Colors.chartBarActive,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
  },
  tooltipText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 30,
    paddingHorizontal: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 10,
  },
  dayLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  activeDayLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
