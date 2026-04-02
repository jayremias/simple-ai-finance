import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { Colors } from '@/theme/colors';
import type { RootStackParamList } from '@/types';

const TYPE_ICONS: Record<string, { name: string; color: string }> = {
  invitation_received: { name: 'mail-outline', color: Colors.brandBlue },
  invitation_accepted: { name: 'checkmark-circle-outline', color: Colors.success },
  system: { name: 'information-circle-outline', color: Colors.textSecondary },
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  navigateTo: string | null;
  metadata: string | null;
  createdAt: string;
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const iconConfig = TYPE_ICONS[notification.type] ?? TYPE_ICONS.system;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <TouchableOpacity
      style={[styles.card, !notification.isRead && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!notification.isRead && <View style={styles.unreadDot} />}
      <View style={styles.cardIcon}>
        <Ionicons
          name={iconConfig.name as keyof typeof Ionicons.glyphMap}
          size={20}
          color={iconConfig.color}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{notification.title}</Text>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.cardTime}>{timeAgo}</Text>
      </View>
      {notification.navigateTo && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();
  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = notifications?.some((notification: Notification) => !notification.isRead);

  function handleNotificationPress(notificationItem: Notification) {
    if (!notificationItem.isRead) {
      markAsRead(notificationItem.id);
    }

    if (notificationItem.navigateTo) {
      const screenName = notificationItem.navigateTo as keyof RootStackParamList;
      navigation.navigate(screenName as never);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread && (
          <TouchableOpacity onPress={() => markAllAsRead()} disabled={isMarkingAll}>
            {isMarkingAll ? (
              <ActivityIndicator color={Colors.brandBlue} size="small" />
            ) : (
              <Text style={styles.markAllText}>Mark all read</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" style={styles.centered} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: Notification) => item.id}
          renderItem={({ item }) => (
            <NotificationItem notification={item} onPress={() => handleNotificationPress(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.brandBlue}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                You will be notified when something important happens
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  markAllText: {
    color: Colors.brandBlue,
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 8,
  },
  centered: {
    flex: 1,
    marginTop: 60,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardUnread: {
    backgroundColor: Colors.surfaceBg,
    borderColor: Colors.brandBlue,
    borderLeftWidth: 3,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brandBlue,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  cardMessage: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  cardTime: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
