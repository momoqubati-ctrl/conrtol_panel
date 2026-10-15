import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementApi } from '../api/financialClient';

export const useApproveSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, reason }: { batchId: string; reason: string }) => 
      settlementApi.approveBatch(batchId, reason),
    onSuccess: () => {
      // Optimistically we could update cache, but invalidation is safer and requested by architecture
      queryClient.invalidateQueries({ queryKey: ['financial', 'settlements', 'pending'] });
    },
  });
};
