import React from 'react';
import { SettlementStatusBadge } from './SettlementStatusBadge';
import { RequirePermission } from './RequirePermission';

interface Batch {
  id: string;
  vendor: string;
  status: string;
  amount: number;
  transaction_count: number;
  created_at: string;
  created_by: string;
}

interface Props {
  batch: Batch;
  onApproveClick?: (batch: Batch) => void;
  onExecuteClick?: (batch: Batch) => void;
}

export const SettlementBatchCard: React.FC<Props> = ({ batch, onApproveClick, onExecuteClick }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{batch.vendor || 'Unknown Vendor'}</h3>
          <p className="text-sm text-gray-500 font-mono">Batch #{batch.id.split('-')[0]}</p>
        </div>
        <SettlementStatusBadge status={batch.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Transactions</p>
          <p className="text-lg font-medium">{batch.transaction_count || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Net Payable</p>
          <p className="text-lg font-bold text-gray-900">
            {new Intl.NumberFormat('en-YE', { style: 'currency', currency: 'YER' }).format(batch.amount || 0)}
          </p>
        </div>
      </div>

      <div className="border-t pt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          <span className="font-medium">Created:</span> {new Date(batch.created_at).toLocaleDateString()}
        </div>
        
        <div className="flex space-x-2">
          {batch.status === 'REVIEW_REQUIRED' && onApproveClick && (
            <RequirePermission permission="settlement.approve">
              <button 
                onClick={() => onApproveClick(batch)}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-semibold"
              >
                Review Batch
              </button>
            </RequirePermission>
          )}

          {batch.status === 'APPROVED' && onExecuteClick && (
            <RequirePermission permission="settlement.execute">
              <button 
                onClick={() => onExecuteClick(batch)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
              >
                Execute Settlement
              </button>
            </RequirePermission>
          )}
        </div>
      </div>
    </div>
  );
};
