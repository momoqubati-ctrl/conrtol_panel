import React, { useEffect, useState } from 'react';
import { Activity, Clock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { MetricCard } from '../../components/financial-ops/MetricCard';
import { supabase } from '../../components/financial-ops/PermissionGuard';

interface OutboxEventItem {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  status: string;
  occurred_at: string;
}

export const OutboxMonitor: React.FC = () => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<OutboxEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchOutboxData = async () => {
      setLoading(true);
      try {
        const { count: pending } = await supabase
          .from('outbox_events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const { count: failed } = await supabase
          .from('outbox_events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed');

        const { data: events } = await supabase
          .from('outbox_events')
          .select('id, aggregate_type, aggregate_id, event_type, status, occurred_at')
          .order('occurred_at', { ascending: false })
          .limit(5);

        setPendingCount(pending ?? 0);
        setFailedCount(failed ?? 0);
        setRecentEvents((events as OutboxEventItem[]) ?? []);
      } catch (err) {
        console.error('Failed to fetch outbox data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOutboxData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Execution Mode" 
          value="Synchronous" 
          icon={<CheckCircle2 />} 
          colorClass="text-emerald-500" 
        />
        <MetricCard 
          title="Async Worker" 
          value="Inactive" 
          icon={<Clock />} 
          colorClass="text-slate-400" 
        />
        <MetricCard 
          title="Pending Events" 
          value={loading ? '...' : pendingCount} 
          icon={<Activity />} 
          colorClass={pendingCount > 0 ? "text-amber-500" : "text-slate-400"} 
        />
        <MetricCard 
          title="Failed Events" 
          value={loading ? '...' : failedCount} 
          icon={<AlertTriangle />} 
          colorClass={failedCount > 0 ? "text-red-500" : "text-emerald-500"} 
        />
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">Event Timeline</h2>
          <span className="text-xs text-slate-400">Live Outbox Queue</span>
        </div>
        <div className="p-6">
          {recentEvents.length > 0 ? (
            <ul className="space-y-4">
              {recentEvents.map((evt) => (
                <li key={evt.id} className="flex gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 h-fit">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-slate-200">{evt.event_type}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        evt.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        evt.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {evt.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">Aggregate: {evt.aggregate_type} ({evt.aggregate_id})</p>
                    <p className="text-xs text-slate-500 mt-2">Occurred: {new Date(evt.occurred_at).toLocaleTimeString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                <Info className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">Direct Synchronous Processing Active</h3>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                Financial events and ledger journals are committed atomically within PostgreSQL transaction boundaries. The asynchronous Outbox background worker is currently inactive by architectural policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
