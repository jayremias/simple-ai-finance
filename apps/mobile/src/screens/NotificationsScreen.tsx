import { Ionicons } from '@expo/vector-icons';
import type { NotificationItem } from '@moneylens/shared';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';
import { useAcceptInvitation } from '@/hooks/useSharing';
import { Colors } from '@/theme/colors';

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  account_invitation: 'people-outline',
};

function NotificationRow({
  item,
  onAccept,
  onMarkRead,
}: {
  item: NotificationItem;
  onAccept: (invitationId: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = item.status === 'unread';
  const isInvitation = item.type === 'account_invitation';
  const invitationId = item.data?.invitationId as string | null | undefined;
  const accountName = item.data?.accountName as string | undefined;
  const role = item.data?.role as string | undefined;

  const iconName = TYPE_ICONS[item.type] ?? 'notifications-outline';

  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  return (
    <TouchableOpacity
      style={[styles.row, isUnread && styles.rowUnread]}
      onPress={() => isUnread && onMarkRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, isUnread && styles.iconWrapUnread]}>
        <Ionicons
          name={iconName}
          size={20}
          color={isUnread ? Colors.brandBlue : Colors.textMuted}
        />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, isUnread && styles.rowTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>

        {isInvitation && accountName && role ? (
          <Text style={styles.rowMessage} numberOfLines={2}>
            You were invited to <Text style={styles.bold}>{accountName}</Text> as{' '}
            <Text style={styles.bold}>{role}</Text>
          </Text>
        ) : item.message ? (
          <Text style={styles.rowMessage} numberOfLines={2}>
            {item.message}
          </Text>
        ) : null}

        <Text style={styles.rowTime}>{timeAgo}</Text>

        {isInvitation && invitationId && item.status === 'unread' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept(invitationId)}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonText}>Accept Invitation</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const { data, isLoading, error, refetch } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: acceptInvitation, isPending: isAccepting } = useAcceptInvitation();

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  function handleAccept(invitationId: string) {
    acceptInvitation(invitationId, {
      onSuccess: () => {
        Alert.alert('Accepted', 'You now have access to the account.');
      },
      onError: () => {
        Alert.alert('Error', 'Failed to accept invitation. It may have expired.');
      },
    });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" style={styles.centered} />
      ) : error ? (
        <Text style={[styles.centered, styles.errorText]}>Failed to load notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onAccept={handleAccept} onMarkRead={markRead} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.brandBlue} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up</Text>
            </View>
          }
        />
      )}

      {isAccepting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.brandBlue} size="large" />
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowUnread: {
    backgroundColor: Colors.surfaceBg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapUnread: {
    backgroundColor: Colors.navyBg,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  rowTitleUnread: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brandBlue,
    flexShrink: 0,
  },
  rowMessage: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bold: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  rowTime: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  acceptButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.brandBlue,
  },
  acceptButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    textAlign: 'center',
    marginTop: 60,
  },
  errorText: {
    color: Colors.danger,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
