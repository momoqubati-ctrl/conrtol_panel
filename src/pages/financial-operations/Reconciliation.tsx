import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Database, RefreshCw } from 'lucide-react';
import { supabase } from '../../components/financial-ops/PermissionGuard';

export const Reconciliation: React.FC = () => {
  const [v1Count, setV1Count] = useState<number | null>(null);
  const [v2Count, setV2Count] = useState<number | null>(null);
  const [diffCount, setDiffCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReconciliationData = async () => {
    setLoading(true);
    try {
      // 1. Fetch V1 Transactions count
      const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch V2 Financial Journals count
      const { count: journalCount } = await supabase
        .from('fin_journals')
        .select('*', { count: 'exact', head: true });

      // 3. Fetch Unresolved Reconciliation Differences
      let discrepancies = 0;
      try {
        const { data: metrics } = await supabase.rpc('get_operational_dashboard_metrics');
        if (metrics && typeof metrics.discrepancies_count === 'number') {
          discrepancies = metrics.discrepancies_count;
        }
      } catch {
        const { count: diffs } = await supabase
          .from('fin_reconciliation_differences')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'unresolved');
        discrepancies = diffs ?? 0;
      }

      setV1Count(txCount ?? 0);
      setV2Count(journalCount ?? 0);
      setDiffCount(discrepancies);
    } catch (err) {
      console.error('Failed to load reconciliation counts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div>
          <h2 className="text-lg font-bold text-slate-200">Reconciliation & Integrity Engine</h2>
          <p className="text-xs text-slate-400">Continuous reconciliation between transactional ledgers and financial journals</p>
        </div>
        <button 
          onClick={fetchReconciliationData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-blue-400" />
            <h3 className="text-slate-200 font-semibold">V1 Transaction Core</h3>
          </div>
          <p className="text-3xl font-bold">{loading ? '...' : (v1Count?.toLocaleString() ?? '0')}</p>
          <p className="text-sm text-slate-500 mt-2">Recorded Transactions</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-purple-400" />
            <h3 className="text-slate-200 font-semibold">V2 Financial Kernel</h3>
          </div>
          <p className="text-3xl font-bold">{loading ? '...' : (v2Count?.toLocaleString() ?? '0')}</p>
          <p className="text-sm text-slate-500 mt-2">Financial Journals</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center">
          {(diffCount ?? 0) === 0 ? (
            <>
              <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2" />
              <p className="text-2xl font-bold text-emerald-400">0</p>
              <p className="text-sm font-medium text-emerald-500">Zero Differences Detected</p>
            </>
          ) : (
            <>
              <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
              <p className="text-2xl font-bold text-red-400">{diffCount}</p>
              <p className="text-sm font-medium text-red-400">Differences Detected</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
        {(diffCount ?? 0) === 0 ? (
          <>
            <div className="mx-auto w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Reconciliation Invariant Verified</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              All financial transactions and double-entry journals are fully reconciled. No discrepancies detected between legacy transactions and posted journals.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Reconciliation Differences Require Review</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {diffCount} reconciliation difference(s) detected. Please investigate unresolved discrepancies in the audit log.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
