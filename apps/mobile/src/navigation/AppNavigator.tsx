import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ReceiptDetailScreen } from '../screens/ReceiptDetailScreen';
import { WeeklyAnalysisScreen } from '../screens/WeeklyAnalysisScreen';
import type { RootStackParamList } from '../types';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
        <Stack.Screen name="WeeklyAnalysis" component={WeeklyAnalysisScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
