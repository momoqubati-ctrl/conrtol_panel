import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/financialClient';

export const useAuditTimeline = () => {
  return useQuery({
    queryKey: ['financial', 'audit', 'timeline'],
    queryFn: auditApi.getTimeline,
    staleTime: 30000, // 30 seconds as specified
    refetchInterval: 30000 // Auto refresh every 30 seconds
  });
};
