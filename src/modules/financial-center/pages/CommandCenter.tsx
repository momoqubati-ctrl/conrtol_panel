import React from 'react';
import { useFinancialDashboard } from '../hooks/useFinancialDashboard';
import { useFinancialContext } from '../providers/FinancialProvider';
import { FinancialErrorBoundary } from '../components/FinancialErrorBoundary';
import { RequirePermission } from '../components/RequirePermission';

const BalanceCard: React.FC<{ title: string; amount: number; color?: string }> = ({ title, amount, color = 'blue' }) => (
  <div className={`p-4 rounded-lg shadow-sm border border-${color}-200 bg-${color}-50`}>
    <h3 className={`text-sm font-medium text-${color}-800`}>{title}</h3>
    <p className={`mt-2 text-2xl font-bold text-${color}-900`}>
      {new Intl.NumberFormat('en-YE', { style: 'currency', currency: 'YER' }).format(amount)}
    </p>
  </div>
);

const AlertWidget: React.FC<{ alerts: any[] }> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-300">
      <h3 className="text-lg font-bold text-red-800 flex items-center">
        <span className="mr-2">⚠️</span> Critical Alerts
      </h3>
      <ul className="mt-2 space-y-2">
        {alerts.map((alert, i) => (
          <li key={i} className="text-red-900 text-sm font-medium">
            {alert.provider} Exposure: {alert.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

const CommandCenterContent = () => {
  const { data, isLoading, isError } = useFinancialDashboard();

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Command Center...</div>;
  if (isError || !data) throw new Error('Failed to load dashboard data');

  const { assets, liabilities, revenue, alerts } = data;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Financial Operations Center</h1>
      
      <AlertWidget alerts={alerts} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Assets</h2>
          <BalanceCard title="Gateway Cash" amount={assets.gateway_cash} color="green" />
          <BalanceCard title="Bank Balance" amount={assets.bank_balance} color="green" />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Liabilities</h2>
          <BalanceCard title="Vendor Payables" amount={liabilities.vendor_payables} color="orange" />
          <BalanceCard title="Customer Funds Held" amount={liabilities.customer_hold} color="orange" />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Profitability (Today)</h2>
          <BalanceCard title="Commission Revenue" amount={revenue.commission} color="blue" />
          <BalanceCard title="Gateway Fees" amount={revenue.fees} color="gray" />
          <div className="p-4 rounded-lg shadow-sm border border-indigo-300 bg-indigo-100">
            <h3 className="text-sm font-medium text-indigo-800">Net Revenue</h3>
            <p className="mt-2 text-2xl font-bold text-indigo-900">
              {new Intl.NumberFormat('en-YE', { style: 'currency', currency: 'YER' }).format(revenue.commission - revenue.fees)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CommandCenter = () => {
  const { correlationId } = useFinancialContext();

  return (
    <RequirePermission 
      permission="dashboard.view" 
      fallback={<div className="p-8 text-red-600 font-bold">Unauthorized to view Financial Command Center</div>}
    >
      <FinancialErrorBoundary correlationId={correlationId}>
        <CommandCenterContent />
      </FinancialErrorBoundary>
    </RequirePermission>
  );
};
