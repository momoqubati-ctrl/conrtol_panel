import React from 'react';

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'bg-gray-100 text-gray-800',
  'CALCULATING': 'bg-blue-100 text-blue-800 animate-pulse',
  'REVIEW_REQUIRED': 'bg-yellow-100 text-yellow-800',
  'APPROVED': 'bg-green-100 text-green-800',
  'EXECUTED': 'bg-indigo-100 text-indigo-800',
  'COMPLETED': 'bg-gray-800 text-white',
  'FAILED': 'bg-red-100 text-red-800'
};

export const SettlementStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  
  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
