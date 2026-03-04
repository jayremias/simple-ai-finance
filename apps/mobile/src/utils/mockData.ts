import type { Transaction, WeeklyData } from '../types';

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    name: 'Figma',
    date: '15 June, 2024',
    amount: -144,
    category: 'Software',
    paymentMethod: 'Visa Card',
    iconBg: '#FF4500',
  },
  {
    id: '2',
    name: 'Sketch',
    date: '12 June, 2024',
    amount: -138,
    category: 'Software',
    paymentMethod: 'Paypal',
    iconBg: '#FF9500',
  },
  {
    id: '3',
    name: 'Slack',
    date: '7 June, 2024',
    amount: -175,
    category: 'Communication',
    paymentMethod: 'Mastercard',
    iconBg: '#4A154B',
  },
  {
    id: '4',
    name: 'Adobe Creative Cloud',
    date: '5 June, 2024',
    amount: -52.99,
    category: 'Software',
    paymentMethod: 'Visa Card',
    iconBg: '#FF0000',
  },
];

export const mockWeeklyData: WeeklyData[] = [
  { day: 'Sat', amount: 1800 },
  { day: 'Sun', amount: 900 },
  { day: 'Mon', amount: 1400 },
  { day: 'Tue', amount: 3080, isActive: true },
  { day: 'Wed', amount: 1600 },
  { day: 'Thu', amount: 2200 },
  { day: 'Fri', amount: 700 },
];

export const mockBalance = 9483.0;
