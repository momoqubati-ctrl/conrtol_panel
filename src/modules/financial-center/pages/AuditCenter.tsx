import React, { useState } from 'react';
import { useAuditTimeline } from '../hooks/useAuditTimeline';
import { useQueryClient } from '@tanstack/react-query';
import { RequirePermission } from '../components/RequirePermission';
import { FinancialErrorBoundary } from '../components/FinancialErrorBoundary';
import { useFinancialContext } from '../providers/FinancialProvider';
import { AuditEventCard } from '../components/AuditEventCard';

const AuditCenterContent = () => {
  const { data, isLoading, isFetching } = useAuditTimeline();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Audit Center...</div>;

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['financial', 'audit', 'timeline'] });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Financial Audit Center</h1>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <span>Auto Refresh (30s)</span>
            <input 
              type="checkbox" 
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-indigo-600"
            />
          </label>
          
          <button 
            onClick={handleManualRefresh}
            disabled={isFetching}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium shadow-sm flex items-center"
          >
            {isFetching ? 'Refreshing...' : 'Refresh Timeline'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Operational Timeline</h2>
        
        <div className="pl-2">
          {data?.events?.map((event: any) => (
            <AuditEventCard key={event.id} event={event} />
          ))}
          
          {(!data?.events || data.events.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No audit events found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AuditCenter = () => {
  const { correlationId } = useFinancialContext();

  return (
    <RequirePermission 
      permission="audit.view" 
      fallback={<div className="p-8 text-red-600 font-bold">Unauthorized to view Audit Center</div>}
    >
      <FinancialErrorBoundary correlationId={correlationId}>
        <AuditCenterContent />
      </FinancialErrorBoundary>
    </RequirePermission>
  );
};
