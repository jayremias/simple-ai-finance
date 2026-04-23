import type { NotificationItem } from '@moneylens/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const QUERY_KEY = 'notifications';

export function useNotifications() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => api.get('notifications').json<{ data: NotificationItem[] }>(),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(`notifications/${notificationId}/read`).json<{ success: boolean }>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
