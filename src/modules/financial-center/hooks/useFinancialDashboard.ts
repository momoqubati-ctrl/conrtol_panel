import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/financialClient';

export const useFinancialDashboard = () => {
  return useQuery({
    queryKey: ['financial-dashboard'],
    queryFn: dashboardApi.getOverview,
    staleTime: 60000, // 60 seconds as specified for Command Center
  });
};
