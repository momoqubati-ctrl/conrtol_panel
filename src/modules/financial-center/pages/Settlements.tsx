import React, { useState } from 'react';
import { useSettlementBatches } from '../hooks/useSettlementBatches';
import { useApproveSettlement } from '../hooks/useApproveSettlement';
import { useExecuteSettlement } from '../hooks/useExecuteSettlement';
import { SettlementBatchCard } from '../components/SettlementBatchCard';
import { SettlementApprovalModal } from '../components/SettlementApprovalModal';
import { SettlementExecutionModal } from '../components/SettlementExecutionModal';
import { FinancialErrorBoundary } from '../components/FinancialErrorBoundary';
import { RequirePermission } from '../components/RequirePermission';
import { useFinancialContext } from '../providers/FinancialProvider';

const SettlementsContent = () => {
  const { data: batches, isLoading } = useSettlementBatches();
  const approveMutation = useApproveSettlement();
  const executeMutation = useExecuteSettlement();

  const [activeTab, setActiveTab] = useState('ALL');
  const [approvalModalBatch, setApprovalModalBatch] = useState<any>(null);
  const [executionModalBatch, setExecutionModalBatch] = useState<any>(null);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Settlements...</div>;

  const filteredBatches = batches?.filter(b => activeTab === 'ALL' ? true : 
    (activeTab === 'PREPARATION' && ['DRAFT', 'CALCULATING'].includes(b.status)) ||
    (activeTab === 'APPROVAL' && b.status === 'REVIEW_REQUIRED') ||
    (activeTab === 'EXECUTION' && b.status === 'APPROVED') ||
    (activeTab === 'HISTORY' && ['COMPLETED', 'FAILED'].includes(b.status))
  ) || [];

  const handleApproveSubmit = (reason: string) => {
    if (approvalModalBatch) {
      approveMutation.mutate({ batchId: approvalModalBatch.id, reason }, {
        onSuccess: () => setApprovalModalBatch(null)
      });
    }
  };

  const handleExecuteSubmit = (reason: string) => {
    if (executionModalBatch) {
      executeMutation.mutate({ batchId: executionModalBatch.id, reason }, {
        onSuccess: () => setExecutionModalBatch(null)
      });
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settlement Operations</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-6">
        {['ALL', 'PREPARATION', 'APPROVAL', 'EXECUTION', 'HISTORY'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBatches.map(batch => (
          <SettlementBatchCard 
            key={batch.id} 
            batch={batch}
            onApproveClick={(b) => setApprovalModalBatch(b)}
            onExecuteClick={(b) => setExecutionModalBatch(b)}
          />
        ))}
        {filteredBatches.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded border border-dashed border-gray-300">
            No settlement batches found in this queue.
          </div>
        )}
      </div>

      {/* Modals */}
      <SettlementApprovalModal 
        batch={approvalModalBatch}
        isOpen={!!approvalModalBatch}
        onClose={() => setApprovalModalBatch(null)}
        onApprove={handleApproveSubmit}
        isPending={approveMutation.isPending}
      />

      <SettlementExecutionModal 
        batch={executionModalBatch}
        isOpen={!!executionModalBatch}
        onClose={() => setExecutionModalBatch(null)}
        onExecute={handleExecuteSubmit}
        isPending={executeMutation.isPending}
      />
    </div>
  );
};

export const Settlements = () => {
  const { correlationId } = useFinancialContext();

  return (
    <RequirePermission 
      permission="settlement.view" 
      fallback={<div className="p-8 text-red-600 font-bold">Unauthorized to view Settlements</div>}
    >
      <FinancialErrorBoundary correlationId={correlationId}>
        <SettlementsContent />
      </FinancialErrorBoundary>
    </RequirePermission>
  );
};
