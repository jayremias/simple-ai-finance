import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MainTabParamList } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { Colors } from '../theme/colors';
import { AnalyticsPlaceholderScreen } from '../screens/AnalyticsPlaceholderScreen';
import { ScanPlaceholderScreen } from '../screens/ScanPlaceholderScreen';
import { ProfilePlaceholderScreen } from '../screens/ProfilePlaceholderScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '⌂',
    Analytics: '⬛',
    Scan: '⊡',
    Profile: '○',
    Settings: '⚙',
  };
  return (
    <Text style={{ fontSize: 20, color: focused ? Colors.textPrimary : Colors.textMuted }}>
      {icons[name]}
    </Text>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.cardBg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabBarIcon name="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsPlaceholderScreen}
        options={{ tabBarIcon: ({ focused }) => <TabBarIcon name="Analytics" focused={focused} /> }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanPlaceholderScreen}
        options={{ tabBarIcon: ({ focused }) => <TabBarIcon name="Scan" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePlaceholderScreen}
        options={{ tabBarIcon: ({ focused }) => <TabBarIcon name="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
