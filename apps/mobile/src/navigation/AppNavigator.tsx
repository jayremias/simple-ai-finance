import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { ReceiptReviewScreen } from '../screens/ReceiptReviewScreen';
import { TransactionListScreen } from '../screens/TransactionListScreen';
import { WeeklyAnalysisScreen } from '../screens/WeeklyAnalysisScreen';
import { storage } from '../services/storage';
import { useAuthStore } from '../stores/auth';
import { Colors } from '../theme/colors';
import type { RootStackParamList } from '../types';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, setAuth } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    storage.getToken().then((storedToken) => {
      if (storedToken) {
        // Token exists — optimistically mark as authenticated.
        // The first API call will 401 and trigger sign-out if it's invalid.
        setAuth(storedToken, { id: '', name: '', email: '' });
      }
      setBootstrapping(false);
    });
  }, [setAuth]);

  if (bootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.darkBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={Colors.brandBlue} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="ReceiptReview" component={ReceiptReviewScreen} />
        <Stack.Screen name="WeeklyAnalysis" component={WeeklyAnalysisScreen} />
        <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
