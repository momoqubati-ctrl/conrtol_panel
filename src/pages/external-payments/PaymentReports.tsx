import React, { useEffect, useState } from 'react';
import { supabase } from '../../components/financial-ops/PermissionGuard';
import { MetricCard } from '../../components/financial-ops/MetricCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle, DollarSign } from 'lucide-react';

export const PaymentReports: React.FC = () => {
  const [stats, setStats] = useState<any>({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    manualReview: 0,
    volume: 0,
  });
  
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // In a real application, this would call a dedicated RPC for analytics
    // For now, we simulate fetching aggregated data
    const fetchStats = async () => {
      try {
        const { data } = await supabase.from('vw_admin_payment_operations').select('*');
        if (!data) return;

        let successful = 0;
        let failed = 0;
        let pending = 0;
        let manualReview = 0;
        let volume = 0;

        data.forEach(tx => {
          if (tx.system_status === 'LEDGER_POSTED' || tx.system_status === 'VERIFIED_SUCCESS') successful++;
          else if (tx.system_status === 'REJECTED' || tx.system_status === 'FAILED') failed++;
          else if (tx.verification_status === 'MANUAL_REVIEW_REQUIRED') manualReview++;
          else pending++;

          if (tx.system_status === 'LEDGER_POSTED') {
            volume += Number(tx.amount);
          }
        });

        setStats({
          total: data.length,
          successful,
          failed,
          pending,
          manualReview,
          volume,
        });

        // Mock chart data for UI purposes
        setChartData([
          { name: '00:00', success: 40, fail: 2, latency: 120 },
          { name: '04:00', success: 30, fail: 1, latency: 150 },
          { name: '08:00', success: 120, fail: 5, latency: 200 },
          { name: '12:00', success: 250, fail: 12, latency: 300 },
          { name: '16:00', success: 180, fail: 8, latency: 180 },
          { name: '20:00', success: 90, fail: 3, latency: 140 },
        ]);

      } catch (e) {
        console.error(e);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard 
          title="Total Transactions" 
          value={stats.total} 
          icon={<Activity />} 
          colorClass="text-blue-400" 
        />
        <MetricCard 
          title="Successful" 
          value={stats.successful} 
          icon={<CheckCircle />} 
          colorClass="text-green-500" 
        />
        <MetricCard 
          title="Failed" 
          value={stats.failed} 
          icon={<XCircle />} 
          colorClass="text-red-500" 
        />
        <MetricCard 
          title="Pending" 
          value={stats.pending} 
          icon={<Clock />} 
          colorClass="text-amber-500" 
        />
        <MetricCard 
          title="Manual Review" 
          value={stats.manualReview} 
          icon={<AlertTriangle />} 
          colorClass="text-purple-400" 
        />
        <MetricCard 
          title="Settled Volume" 
          value={`${stats.volume.toLocaleString()} YER`} 
          icon={<DollarSign />} 
          colorClass="text-emerald-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-6 text-slate-200">Transaction Success Rate</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="success" name="Successful" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fail" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-6 text-slate-200">Provider Average Latency (ms)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
