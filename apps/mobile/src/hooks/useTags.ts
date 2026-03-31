import type { TagResponse } from '@moneylens/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get('tags').json<TagResponse[]>(),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post('tags', { json: { name } }).json<TagResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
