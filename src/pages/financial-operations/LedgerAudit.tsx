import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertOctagon, RefreshCw, AlertCircle } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';

interface AccountBalanceRow {
  account_id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  owner_type?: string;
  currency: string;
  balance_raw: number;
  balance_normalized: number;
}

export const LedgerAudit: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountBalanceRow[]>([]);
  const [totalDebits, setTotalDebits] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [difference, setDifference] = useState<number>(0);
  const [isBalanced, setIsBalanced] = useState<boolean>(false);

  const fetchLedgerBalances = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = (window as any).getAuthenticatedSupabase
        ? (window as any).getAuthenticatedSupabase()
        : getSupabase();

      const { data, error: queryError } = await supabase
        .from('vw_fin_account_balances')
        .select('*')
        .order('code', { ascending: true });

      if (queryError) {
        throw queryError;
      }

      const rows: AccountBalanceRow[] = (data || []).map((item: any) => ({
        account_id: item.account_id,
        code: item.code || '-',
        name: item.name || 'Unknown Account',
        type: item.type || '',
        normal_balance: item.normal_balance || '',
        owner_type: item.owner_type,
        currency: item.currency || 'YER',
        balance_raw: typeof item.balance_raw === 'number'
          ? item.balance_raw
          : parseFloat(item.balance_raw || '0'),
        balance_normalized: typeof item.balance_normalized === 'number'
          ? item.balance_normalized
          : parseFloat(item.balance_normalized || '0'),
      }));

      let sumDebits = 0;
      let sumCredits = 0;

      for (const row of rows) {
        if (row.balance_raw > 0) {
          sumDebits += row.balance_raw;
        } else if (row.balance_raw < 0) {
          sumCredits += Math.abs(row.balance_raw);
        }
      }

      const diff = Math.abs(sumDebits - sumCredits);
      const balanced = diff < 0.001;

      setAccounts(rows);
      setTotalDebits(sumDebits);
      setTotalCredits(sumCredits);
      setDifference(diff);
      setIsBalanced(balanced);
    } catch (err: any) {
      console.error('Failed to load ledger balances:', err);
      setError(err.message || 'Failed to fetch ledger account balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerBalances();
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">Auditing general ledger accounts and balances...</p>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-red-400">Failed to Load Ledger Audit Data</h3>
          <p className="text-sm text-slate-400 mt-1">{error}</p>
        </div>
        <button
          onClick={fetchLedgerBalances}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Retry Audit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls & Status Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">General Ledger Audit & Trial Balance</h2>
          <p className="text-xs text-slate-400">Source: vw_fin_account_balances</p>
        </div>
        <button
          onClick={fetchLedgerBalances}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Trial Balance KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-slate-400 mb-2 text-sm font-medium">Total Debits</h3>
          <p className="text-3xl font-bold text-red-400">
            {formatAmount(totalDebits)} YER
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-slate-400 mb-2 text-sm font-medium">Total Credits</h3>
          <p className="text-3xl font-bold text-green-400">
            {formatAmount(totalCredits)} YER
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-slate-400 mb-2 text-sm font-medium">Difference</h3>
            <p className="text-3xl font-bold text-white">
              {formatAmount(difference)} YER
            </p>
          </div>
          <div className="flex flex-col items-center">
            {isBalanced ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-1" />
                <span className="text-green-500 font-semibold uppercase tracking-wider text-xs">Balanced</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-10 h-10 text-red-500 mb-1" />
                <span className="text-red-500 font-semibold uppercase tracking-wider text-xs">Imbalanced</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Real Chart of Accounts Balances Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-base font-bold">Chart of Accounts Real Balances ({accounts.length})</h2>
          <span className="text-xs text-slate-400">All amounts in YER</span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No ledger accounts recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Code</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Normal Balance</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Raw Balance</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Normalized Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {accounts.map((acc) => {
                  const isNonZero = Math.abs(acc.balance_raw) > 0.001;
                  return (
                    <tr
                      key={acc.account_id || acc.code}
                      className={`hover:bg-slate-700/20 transition-colors ${
                        isNonZero ? 'bg-slate-800/40' : 'opacity-70'
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium font-mono text-blue-400">
                        {acc.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-200 font-medium">
                        {acc.name}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 font-mono">
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono uppercase text-slate-400">
                        {acc.normal_balance}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-bold text-right">
                        <span
                          className={
                            acc.balance_raw > 0
                              ? 'text-red-400'
                              : acc.balance_raw < 0
                              ? 'text-green-400'
                              : 'text-slate-500'
                          }
                        >
                          {formatAmount(acc.balance_raw)} {acc.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-slate-300">
                        {formatAmount(acc.balance_normalized)} {acc.currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

