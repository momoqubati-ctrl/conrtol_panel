import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { TimelineViewer, TimelineNode } from '../../components/financial-ops/TimelineViewer';
import { supabase } from '../../components/financial-ops/PermissionGuard';

export const TransactionExplorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineNode[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setTimeline(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_transaction_timeline', {
        p_search_id: query.trim()
      });

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error("Transaction not found");
      }

      const nodes: TimelineNode[] = [
        {
          title: 'Request Received',
          timestamp: data.request_received,
          status: 'success',
          icon: 'request'
        },
        {
          title: 'Lock Acquired',
          timestamp: data.lock_acquired,
          status: 'success',
          icon: 'lock'
        },
        {
          title: 'Inventory Reservation',
          subtitle: `Status: ${data.reservation_status}`,
          status: data.reservation_status === 'RESERVED' || data.reservation_status === 'PURCHASED' ? 'success' : 'failed',
          icon: 'reservation'
        },
        {
          title: 'Journal Created',
          timestamp: data.journal_created,
          status: 'success',
          icon: 'journal'
        },
        {
          title: 'Journal Posted',
          timestamp: data.journal_posted,
          status: 'success',
          icon: 'journal'
        },
        {
          title: 'Outbox Published',
          timestamp: data.outbox_published,
          subtitle: `Status: ${data.outbox_status || 'failed'}`,
          status: data.outbox_status === 'published' ? 'success' : 'failed',
          icon: 'outbox'
        }
      ];

      setTimeline(nodes);
    } catch (err: any) {
      setError(err.message || "Failed to search transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold mb-4">Transaction Explorer</h2>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Request ID, Journal ID, Master TX ID, or Card ID..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">
          {error}
        </div>
      )}

      {timeline && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-6">Transaction Lifecycle</h3>
          <TimelineViewer nodes={timeline} />
        </div>
      )}
    </div>
  );
};
