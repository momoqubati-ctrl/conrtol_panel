import React, { useState } from 'react';

interface Props {
  batch: any;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (reason: string) => void;
  isPending: boolean;
}

export const SettlementApprovalModal: React.FC<Props> = ({ batch, isOpen, onClose, onApprove, isPending }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !batch) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Confirm Settlement Approval</h2>
        
        <div className="bg-gray-50 p-4 rounded mb-4">
          <p><span className="font-semibold">Batch:</span> #{batch.id.split('-')[0]}</p>
          <p><span className="font-semibold">Vendor:</span> {batch.vendor}</p>
          <p><span className="font-semibold">Amount:</span> {new Intl.NumberFormat('en-YE', { style: 'currency', currency: 'YER' }).format(batch.amount || 0)}</p>
          <p><span className="font-semibold">Transactions:</span> {batch.transaction_count}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Verified financial review"
            disabled={isPending}
          />
        </div>

        <div className="mb-6 flex items-center">
          <input type="checkbox" id="confirm" className="mr-2" required />
          <label htmlFor="confirm" className="text-sm font-medium text-gray-700">I confirm this settlement</label>
        </div>

        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={() => onApprove(reason)}
            disabled={isPending || reason.trim() === ''}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center"
          >
            {isPending ? 'Processing...' : 'Approve Settlement'}
          </button>
        </div>
      </div>
    </div>
  );
};
