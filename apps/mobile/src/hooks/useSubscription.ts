import type { SubscriptionResponse } from '@moneylens/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('subscription').json<SubscriptionResponse>(),
  });
}
