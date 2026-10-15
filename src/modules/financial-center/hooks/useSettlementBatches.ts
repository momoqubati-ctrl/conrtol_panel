import { useQuery } from '@tanstack/react-query';
import { settlementApi } from '../api/financialClient';

export const useSettlementBatches = () => {
  return useQuery({
    queryKey: ['financial', 'settlements', 'pending'],
    queryFn: settlementApi.getPending,
    staleTime: 30000, // 30 seconds as specified
  });
};
