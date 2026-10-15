import React from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'available' | 'sold' | 'reserved' | 'completed' | 'failed' | string;
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, customLabel }) => {
  let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = customLabel || status;

  switch (status) {
    case 'pending':
      badgeClass = 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      label = customLabel || 'قيد الانتظار';
      break;
    case 'completed':
      badgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      label = customLabel || 'ناجحة';
      break;
    case 'approved':
    case 'active':
    case 'available':
      badgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      label = customLabel || (status === 'available' ? 'متاح' : (status === 'active' ? 'نشط' : 'معتمد'));
      break;
    case 'rejected':
    case 'failed':
    case 'inactive':
      badgeClass = 'bg-rose-950/80 text-rose-300 border-rose-700/60';
      label = customLabel || 'مرفوض / غير نشط';
      break;
    case 'sold':
      badgeClass = 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      label = customLabel || 'تم البيع';
      break;
    case 'reserved':
      badgeClass = 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      label = customLabel || 'محجوز للبوابة';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${badgeClass}`}>
      {label}
    </span>
  );
};
