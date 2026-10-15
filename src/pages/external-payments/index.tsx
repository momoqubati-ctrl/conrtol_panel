import React, { useState } from 'react';
import { Globe, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { PermissionGuard } from '../../components/financial-ops/PermissionGuard';
import { GatewayTransactions } from './GatewayTransactions';
import { PendingOperations } from './PendingOperations';
import { GatewayLogs } from './GatewayLogs';
import { PaymentReports } from './PaymentReports';

export const PaymentOperationsLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');

  const tabs = [
    { id: 'pending', label: 'Pending Operations' },
    { id: 'transactions', label: 'Gateway Transactions' },
    { id: 'logs', label: 'Gateway Logs' },
    { id: 'reports', label: 'Reports Dashboard' },
  ];

  return (
    <PermissionGuard requiredPermission="view_financial_dashboard">
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="flex items-center justify-between border-b border-slate-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Globe className="w-8 h-8 text-indigo-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">External Payment Operations Center</h1>
                <p className="text-slate-400 text-sm">Monitor and control external gateway transactions (e.g. BasGate)</p>
              </div>
            </div>
          </header>

          <nav className="flex space-x-1 bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {tab.id === 'pending' && <ShieldAlert className="w-4 h-4" />}
                {tab.id === 'transactions' && <ArrowLeftRight className="w-4 h-4" />}
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="mt-6">
            {activeTab === 'pending' && <PendingOperations />}
            {activeTab === 'transactions' && <GatewayTransactions />}
            {activeTab === 'logs' && <GatewayLogs />}
            {activeTab === 'reports' && <PaymentReports />}
          </main>

        </div>
      </div>
    </PermissionGuard>
  );
};
