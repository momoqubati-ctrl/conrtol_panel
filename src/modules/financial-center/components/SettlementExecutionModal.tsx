import React, { useState } from 'react';

interface Props {
  batch: any;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (reason: string) => void;
  isPending: boolean;
}

export const SettlementExecutionModal: React.FC<Props> = ({ batch, isOpen, onClose, onExecute, isPending }) => {
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen || !batch) return null;

  const isFormValid = confirmation === 'EXECUTE' && reason.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border-t-4 border-indigo-600">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Execute Settlement Batch</h2>
        
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded mb-4">
          <p className="text-indigo-900 text-sm">
            You are about to execute a settlement. This will post immutable journals to the Financial Ledger and recognize Vendor Payables.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-mono font-bold">EXECUTE</span> to confirm
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 uppercase font-mono"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
            placeholder="EXECUTE"
            disabled={isPending}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Daily settlement run"
            disabled={isPending}
          />
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
            onClick={() => onExecute(reason)}
            disabled={isPending || !isFormValid}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isPending ? 'Executing...' : 'Execute Settlement'}
          </button>
        </div>
      </div>
    </div>
  );
};
