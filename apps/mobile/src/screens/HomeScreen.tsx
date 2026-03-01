import React from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { mockBalance, mockTransactions } from '../utils/mockData';
import { RootStackParamList } from '../types';
import { HomeHeader } from '../components/home/HomeHeader';
import { BalanceCard } from '../components/home/BalanceCard';
import { FeedAISection } from '../components/home/FeedAISection';
import { TransactionItem } from '../components/common/TransactionItem';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();

  const handleScanReceipt = () => {
    // Navigate to receipt detail with mock data to demo the flow
    navigation.navigate('ReceiptDetail', {
      receipt: {
        imageUri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Grocery_store_receipt.jpg/800px-Grocery_store_receipt.jpg',
        category: 'Groceries',
        amount: 45.89,
        date: 'June 18, 2024',
        insight: {
          message: 'Groceries spend is up 15%. Detected overlap with whole foods.',
          type: 'info',
        },
      },
    });
  };

  const handleUploadFile = () => Alert.alert('Upload File', 'File upload coming soon');
  const handleVoiceEntry = () => Alert.alert('Voice Entry', 'Voice input coming soon');
  const handleManualEntry = () => Alert.alert('Manual Entry', 'Manual entry coming soon');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          userName="Smith"
          onNotification={() => Alert.alert('Notifications', 'No new notifications')}
        />

        <BalanceCard balance={mockBalance} />

        <View style={styles.spacer} />

        <FeedAISection
          onScanReceipt={handleScanReceipt}
          onUploadFile={handleUploadFile}
          onVoiceEntry={handleVoiceEntry}
          onManualEntry={handleManualEntry}
        />

        <View style={styles.spacer} />

        <View style={styles.transactionsSection}>
          {mockTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navyBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  spacer: {
    height: 16,
  },
  transactionsSection: {
    paddingHorizontal: 20,
  },
  bottomPad: {
    height: 24,
  },
});
