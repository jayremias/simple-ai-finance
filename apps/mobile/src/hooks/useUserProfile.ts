import type { UserProfileResponse } from '@moneylens/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await api.get<UserProfileResponse>('/users/me');
      return res.data;
    },
  });
}
