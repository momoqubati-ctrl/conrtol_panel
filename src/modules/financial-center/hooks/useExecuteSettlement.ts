import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementApi } from '../api/financialClient';

export const useExecuteSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, reason }: { batchId: string; reason: string }) => 
      settlementApi.executeBatch(batchId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial', 'settlements', 'pending'] });
    },
  });
};
