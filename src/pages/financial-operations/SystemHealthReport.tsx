import React, { useEffect, useState } from 'react';
import { Download, FileText, Activity, ShieldCheck, Printer } from 'lucide-react';
import { supabase } from '../../components/financial-ops/PermissionGuard';
import { MetricCard } from '../../components/financial-ops/MetricCard';

export const SystemHealthReport: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [mode, setMode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: metrics } = await supabase.rpc('get_operational_dashboard_metrics');
      const { data: status } = await supabase.rpc('get_dual_write_status');
      if (metrics) setData(metrics);
      if (status) setMode(status);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const exportCSV = () => {
    if (!data || !mode) return;
    
    const rows = [
      ['Metric', 'Value', 'Timestamp'],
      ['Report Generated', new Date().toISOString(), ''],
      ['Current Mode', mode.mode.toUpperCase(), mode.changed_at],
      ['Reconciliation Differences', data.discrepancies_count || 0, ''],
      ['Outbox Failed Events', data.outbox_errors_count || 0, ''],
      ['Failed Reservations', data.failed_reservations || 0, ''],
      ['Transactions Last 24h', data.v2_total_attempts || 0, ''],
      ['V2 Success Rate (%)', data.v2_success_rate_percent || 0, ''],
      ['Average Latency (ms)', data.avg_execution_ms || 0, '']
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_health_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Generating report...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-green-500 w-6 h-6" />
            Executive System Health Report
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Generated on: {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard 
          title="Current System Mode" 
          value={(mode?.mode || 'OFF').toUpperCase()}
          subtitle={`Changed by: ${mode?.changed_by?.substring(0,8)}...`}
          icon={<Activity />}
          colorClass={mode?.mode === 'enforced' ? 'text-green-500' : 'text-amber-500'}
        />
        <MetricCard 
          title="Reconciliation Differences" 
          value={data?.discrepancies_count || 0}
          subtitle="Between V1 and V2"
          icon={<FileText />}
          colorClass={(data?.discrepancies_count || 0) === 0 ? 'text-green-500' : 'text-red-500'}
        />
        <MetricCard 
          title="Critical Outbox Failures" 
          value={data?.outbox_errors_count || 0}
          subtitle="Events unable to publish"
          icon={<ShieldCheck />}
          colorClass={(data?.outbox_errors_count || 0) === 0 ? 'text-green-500' : 'text-red-500'}
        />
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 print:bg-white print:border-gray-200">
        <h3 className="text-lg font-bold mb-4 print:text-black">Detailed Metrics</h3>
        <table className="w-full text-left border-collapse">
          <tbody className="divide-y divide-slate-700 print:divide-gray-200">
            <tr className="print:text-black">
              <td className="py-4 font-medium text-slate-300 print:text-gray-700">Daily Transaction Volume (24h)</td>
              <td className="py-4 font-bold text-right">{data?.v2_total_attempts || 0}</td>
            </tr>
            <tr className="print:text-black">
              <td className="py-4 font-medium text-slate-300 print:text-gray-700">Financial Kernel Success Rate</td>
              <td className="py-4 font-bold text-right">{Number(data?.v2_success_rate_percent || 0).toFixed(2)}%</td>
            </tr>
            <tr className="print:text-black">
              <td className="py-4 font-medium text-slate-300 print:text-gray-700">Average Execution Latency</td>
              <td className="py-4 font-bold text-right">{Number(data?.avg_execution_ms || 0).toFixed(0)} ms</td>
            </tr>
            <tr className="print:text-black">
              <td className="py-4 font-medium text-slate-300 print:text-gray-700">Stuck or Failed Reservations</td>
              <td className="py-4 font-bold text-right text-green-500">{data?.failed_reservations || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
