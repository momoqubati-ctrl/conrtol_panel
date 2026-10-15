import React, { useEffect, useState } from 'react';
import { supabase } from '../../components/financial-ops/PermissionGuard';
import { MetricCard } from '../../components/financial-ops/MetricCard';
import { StatusIndicator } from '../../components/financial-ops/StatusIndicator';
import { SecureActionButton } from '../../components/financial-ops/SecureActionButton';
import { AlertPanel } from '../../components/financial-ops/AlertPanel';
import { Activity, Clock, RefreshCcw, ServerCrash, BarChart3 } from 'lucide-react';

export const LiveMonitoring: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dualWriteMode, setDualWriteMode] = useState<string>('loading');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: metrics } = await supabase.rpc('get_operational_dashboard_metrics');
      const { data: status } = await supabase.rpc('get_dual_write_status');
      
      if (metrics) setData(metrics);
      if (status && status.mode) setDualWriteMode(status.mode);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleMode = async () => {
    const newMode = dualWriteMode === 'shadow' ? 'enforced' : 'shadow';
    const reason = prompt(`Reason for switching to ${newMode.toUpperCase()} mode:`);
    if (!reason) return;

    const { error } = await supabase.rpc('update_dual_write_mode', {
      p_mode: newMode,
      p_reason: reason
    });

    if (error) {
      alert(`Failed to switch mode: ${error.message}`);
    } else {
      setDualWriteMode(newMode);
      fetchData();
    }
  };

  if (loading && !data) return <div className="p-8 text-center text-slate-400">Loading metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="flex items-center gap-4">
          <StatusIndicator status={dualWriteMode as any} label={`${dualWriteMode} MODE`} size="lg" />
          <span className="text-slate-400 text-sm">Financial Core Gateway Status</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 text-slate-400 hover:text-white transition-colors">
            <RefreshCcw className="w-5 h-5" />
          </button>
          <SecureActionButton 
            requiredPermission="manage_dual_write"
            label={dualWriteMode === 'shadow' ? 'Switch to Enforced' : 'Switch to Shadow'}
            onClick={toggleMode}
            variant={dualWriteMode === 'shadow' ? 'primary' : 'outline'}
          />
        </div>
      </div>

      {data?.discrepancies_count > 0 && (
        <AlertPanel 
          type="error"
          title="Reconciliation Mismatch Detected"
          message={`${data.discrepancies_count} unresolved differences found between V1 and V2 journals.`}
        />
      )}

      {data?.outbox_errors_count > 0 && (
        <AlertPanel 
          type="warning"
          title="Outbox Delivery Failures"
          message={`${data.outbox_errors_count} events failed to publish and require attention.`}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Transactions (24h)" 
          value={data?.v2_total_attempts || 0}
          icon={<Activity />}
          colorClass="text-blue-500"
        />
        <MetricCard 
          title="V2 Success Rate" 
          value={`${Number(data?.v2_success_rate_percent || 0).toFixed(2)}%`}
          icon={<CheckCircle />}
          colorClass={data?.v2_success_rate_percent > 99 ? 'text-green-500' : 'text-amber-500'}
        />
        <MetricCard 
          title="Average Latency" 
          value={`${Number(data?.avg_execution_ms || 0).toFixed(0)} ms`}
          icon={<Clock />}
          colorClass="text-purple-500"
        />
        <MetricCard 
          title="System Exceptions" 
          value={(data?.sys_errors || 0) + (data?.idempotency_errors || 0)}
          icon={<ServerCrash />}
          colorClass={data?.sys_errors > 0 ? 'text-red-500' : 'text-slate-400'}
        />
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
          <BarChart3 className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">Time-Series Performance Telemetry</h3>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Interactive hourly time-series graphs require the telemetry metric collector service. Cumulative operational KPIs and dual-write core controls are actively monitored and reflected live in the indicators above.
        </p>
      </div>
    </div>
  );
};

const CheckCircle = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
