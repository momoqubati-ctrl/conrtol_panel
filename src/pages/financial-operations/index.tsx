import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PermissionGuard } from '../../components/financial-ops/PermissionGuard';
import { LiveMonitoring } from './LiveMonitoring';
import { LedgerAudit } from './LedgerAudit';
import { Reconciliation } from './Reconciliation';
import { OutboxMonitor } from './OutboxMonitor';
import { TransactionExplorer } from './TransactionExplorer';
import { SystemHealthReport } from './SystemHealthReport';

export const FinancialOperationsLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('live');

  const tabs = [
    { id: 'live', label: 'Live Monitoring' },
    { id: 'explorer', label: 'Transaction Explorer' },
    { id: 'ledger', label: 'Ledger Audit' },
    { id: 'reconciliation', label: 'Reconciliation' },
    { id: 'outbox', label: 'Outbox Monitor' },
    { id: 'health', label: 'System Health Report' },
  ];

  return (
    <PermissionGuard requiredPermission="view_financial_dashboard">
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="flex items-center justify-between border-b border-slate-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Enterprise Financial Operations Center</h1>
                <p className="text-slate-400 text-sm">Real-time monitoring and control plane</p>
              </div>
            </div>
          </header>

          <nav className="flex space-x-1 bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="mt-6">
            {activeTab === 'live' && <LiveMonitoring />}
            {activeTab === 'explorer' && <TransactionExplorer />}
            {activeTab === 'ledger' && <LedgerAudit />}
            {activeTab === 'reconciliation' && <Reconciliation />}
            {activeTab === 'outbox' && <OutboxMonitor />}
            {activeTab === 'health' && <SystemHealthReport />}
          </main>

        </div>
      </div>
    </PermissionGuard>
  );
};

