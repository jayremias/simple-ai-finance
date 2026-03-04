import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type React from 'react';
import { Colors } from '@/theme/colors';
import { AnalyticsPlaceholderScreen } from '../screens/AnalyticsPlaceholderScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfilePlaceholderScreen } from '../screens/ProfilePlaceholderScreen';
import { ScanPlaceholderScreen } from '../screens/ScanPlaceholderScreen';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabBarIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={name} size={24} color={focused ? Colors.textPrimary : Colors.textMuted} />;
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
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsPlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanPlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'scan' : 'scan-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
